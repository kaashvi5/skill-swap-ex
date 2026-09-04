import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CalendarClock, X } from "lucide-react";
import { SessionCalendarButtons, SwapSession } from "@/components/SessionScheduler";
import { formatInZone, localTimezone } from "@/lib/timezone";

const dismissKey = (id: string) => `ss-session-dismissed-${id}`;

const countdown = (iso: string) => {
  const diff = +new Date(iso) - Date.now();
  if (diff <= 0) return "happening now";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs} h`;
  return `in ${Math.round(hrs / 24)} days`;
};

export const UpcomingSessionBanner = () => {
  const { user } = useAuth();
  const [session, setSession] = useState<(SwapSession & { partner: string; skill: string }) | null>(null);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!user) { setSession(null); return; }
    const { data: swaps } = await supabase
      .from("swap_requests").select("id,requester_id,recipient_id,offer_skill,request_skill")
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
    const ids = (swaps || []).map((s) => s.id);
    if (!ids.length) { setSession(null); return; }

    const { data: sessions } = await supabase
      .from("swap_sessions").select("*")
      .in("swap_id", ids)
      .eq("status", "confirmed")
      .gte("starts_at", new Date(Date.now() - 30 * 60_000).toISOString())
      .order("starts_at")
      .limit(5);

    const next = (sessions || []).find((s) => !localStorage.getItem(dismissKey(s.id)));
    if (!next) { setSession(null); return; }

    const swap = (swaps || []).find((s) => s.id === next.swap_id)!;
    const otherId = swap.requester_id === user.id ? swap.recipient_id : swap.requester_id;
    const { data: prof } = await supabase
      .from("profiles").select("full_name").eq("user_id", otherId).maybeSingle();

    setSession({
      ...(next as SwapSession),
      partner: prof?.full_name || "your partner",
      skill: swap.requester_id === user.id ? swap.request_skill : swap.offer_skill,
    });
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(() => { setTick((n) => n + 1); load(); }, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("upcoming-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "swap_sessions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  if (!session) return null;

  return (
    <div className="border-b bg-primary/5">
      <div className="container flex flex-wrap items-center gap-3 py-3">
        <CalendarClock className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-[220px] text-sm">
          <span className="font-semibold">{session.skill} session with {session.partner}</span>{" "}
          <span className="text-muted-foreground">
            {countdown(session.starts_at)} · {formatInZone(session.starts_at, localTimezone())}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="rounded-full gradient-primary text-primary-foreground border-0">
            <Link to="/app/chats">Open session</Link>
          </Button>
          <SessionCalendarButtons session={session} title={session.skill} partner={session.partner} />
          <Button
            size="icon" variant="ghost" aria-label="Dismiss reminder"
            onClick={() => { localStorage.setItem(dismissKey(session.id), "1"); setSession(null); }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
