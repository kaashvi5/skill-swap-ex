import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarPlus, CalendarClock, Check, X, Download, Share2, AlertTriangle } from "lucide-react";
import { buildIcs, downloadIcs, shareIcs } from "@/lib/ics";
import { formatInZone, localTimezone, timezoneList, zonedToUtc } from "@/lib/timezone";

export interface SwapSession {
  id: string;
  swap_id: string;
  proposed_by: string;
  starts_at: string;
  duration_minutes: number;
  timezone: string;
  note: string | null;
  status: "proposed" | "confirmed" | "declined" | "cancelled";
}

export const sessionIcs = (s: SwapSession, title: string, partner: string) =>
  buildIcs({
    uid: s.id,
    title,
    description: `SkillSwap session with ${partner}.${s.note ? ` Note: ${s.note}` : ""}`,
    location: "SkillSwap (online)",
    start: new Date(s.starts_at),
    durationMinutes: s.duration_minutes,
    reminderMinutes: 30,
  });

export const SessionCalendarButtons = ({
  session, title, partner, size = "sm",
}: { session: SwapSession; title: string; partner: string; size?: "sm" | "default" }) => {
  const ics = () => sessionIcs(session, title, partner);
  const file = `skillswap-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="flex gap-2">
      <Button size={size} variant="outline" className="rounded-full" onClick={() => { downloadIcs(file, ics()); toast.success("Calendar invite downloaded"); }}>
        <Download className="h-3.5 w-3.5 mr-1" />.ics
      </Button>
      <Button
        size={size}
        variant="outline"
        className="rounded-full"
        onClick={async () => {
          const res = await shareIcs(file, ics(), `${title} — ${formatInZone(session.starts_at, session.timezone)}`);
          toast.success(res === "shared" ? "Invite shared" : res === "copied" ? "Session details copied" : "Calendar invite downloaded");
        }}
      >
        <Share2 className="h-3.5 w-3.5 mr-1" />Share
      </Button>
    </div>
  );
};

interface Props {
  swapId: string;
  partnerName: string;
  skillTitle: string;
  canPropose: boolean;
}

export const SessionScheduler = ({ swapId, partnerName, skillTitle, canPropose }: Props) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SwapSession[]>([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState("60");
  const [tz, setTz] = useState(localTimezone());
  const [note, setNote] = useState("");
  const [conflict, setConflict] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const zones = useMemo(() => timezoneList(), []);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("swap_sessions").select("*").eq("swap_id", swapId).order("starts_at");
    setSessions((data as SwapSession[]) || []);
  }, [swapId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`sessions-${swapId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "swap_sessions", filter: `swap_id=eq.${swapId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [swapId, load]);

  const startsAt = date && time ? zonedToUtc(date, time, tz) : null;

  // live conflict check
  useEffect(() => {
    if (!open || !startsAt || Number.isNaN(+startsAt)) { setConflict(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("session_conflict_count", {
        _swap_id: swapId, _starts_at: startsAt.toISOString(), _duration: Number(duration),
      });
      if (!cancelled && !error) setConflict(Number(data) || 0);
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, date, time, tz, duration, swapId, startsAt?.getTime()]);

  const propose = async () => {
    if (!user || !startsAt || Number.isNaN(+startsAt)) { toast.error("Pick a date and time"); return; }
    if (startsAt.getTime() < Date.now()) { toast.error("Pick a time in the future"); return; }
    setSaving(true);
    const { error } = await supabase.from("swap_sessions").insert({
      swap_id: swapId, proposed_by: user.id, starts_at: startsAt.toISOString(),
      duration_minutes: Number(duration), timezone: tz, note: note.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Time proposed — waiting for ${partnerName} to confirm`);
    setOpen(false); setNote("");
    load();
  };

  const setStatus = async (s: SwapSession, status: SwapSession["status"]) => {
    if (status === "confirmed") {
      const { data } = await supabase.rpc("session_conflict_count", {
        _swap_id: swapId, _starts_at: s.starts_at, _duration: s.duration_minutes, _exclude: s.id,
      });
      if (Number(data) > 0 && !window.confirm("This overlaps another confirmed session. Confirm anyway?")) return;
    }
    const { error } = await supabase.from("swap_sessions").update({ status }).eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success(
      status === "confirmed" ? "Session confirmed 🎉" : status === "declined" ? "Time declined" : "Session cancelled"
    );
    load();
  };

  const upcoming = sessions.filter((s) => s.status !== "cancelled" && s.status !== "declined");

  return (
    <div className="rounded-2xl border bg-secondary/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-display font-bold text-sm">
          <CalendarClock className="h-4 w-4 text-primary" />Scheduled sessions
        </div>
        {canPropose && (
          <Button size="sm" onClick={() => setOpen(true)} className="rounded-full gradient-primary text-primary-foreground border-0">
            <CalendarPlus className="h-4 w-4 mr-1" />Schedule
          </Button>
        )}
      </div>

      {upcoming.length === 0 ? (
        <p className="text-xs text-muted-foreground">No session booked yet. Propose a time and {partnerName} confirms it.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((s) => {
            const mine = s.proposed_by === user?.id;
            return (
              <div key={s.id} className="rounded-xl bg-card border p-3 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold text-sm">{formatInZone(s.starts_at, localTimezone())}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.duration_minutes} min · proposed in {s.timezone} ({formatInZone(s.starts_at, s.timezone)})
                    </div>
                    {s.note && <div className="text-xs mt-1">"{s.note}"</div>}
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                    s.status === "confirmed" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"
                  }`}>{s.status}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.status === "proposed" && !mine && (
                    <>
                      <Button size="sm" className="rounded-full gradient-primary text-primary-foreground border-0" onClick={() => setStatus(s, "confirmed")}>
                        <Check className="h-3.5 w-3.5 mr-1" />Confirm
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setStatus(s, "declined")}>
                        <X className="h-3.5 w-3.5 mr-1" />Decline
                      </Button>
                    </>
                  )}
                  {s.status === "proposed" && mine && (
                    <span className="text-xs text-muted-foreground self-center">Waiting for {partnerName} to confirm</span>
                  )}
                  {s.status === "confirmed" && (
                    <>
                      <SessionCalendarButtons session={s} title={skillTitle} partner={partnerName} />
                      <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" onClick={() => setStatus(s, "cancelled")}>Cancel</Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule a session with {partnerName}</DialogTitle>
            <DialogDescription>Pick a time in your timezone — they'll see it converted to theirs and confirm.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date</label>
                <Input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Time</label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Duration</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["30", "45", "60", "90", "120"].map((d) => <SelectItem key={d} value={d}>{d} minutes</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Timezone</label>
                <Select value={tz} onValueChange={setTz}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={200} placeholder="Anything to prepare? (optional)" className="rounded-xl" />
            {startsAt && !Number.isNaN(+startsAt) && (
              <div className="rounded-xl bg-secondary p-3 text-xs space-y-1">
                <div>Your time: <span className="font-semibold">{formatInZone(startsAt, localTimezone())}</span></div>
                <div>UTC: <span className="font-semibold">{formatInZone(startsAt, "UTC")}</span></div>
              </div>
            )}
            {conflict !== null && conflict > 0 && (
              <div className="rounded-xl bg-destructive/10 text-destructive p-3 text-xs flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                This overlaps {conflict} confirmed session{conflict > 1 ? "s" : ""} for one of you. Pick another slot.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={propose} disabled={saving || !date} className="rounded-full gradient-primary text-primary-foreground border-0">
              {saving ? "Proposing..." : "Propose time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
