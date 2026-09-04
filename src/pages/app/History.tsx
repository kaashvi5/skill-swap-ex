import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Coins, History as HistoryIcon, Star, ArrowRight } from "lucide-react";
import { SessionCalendarButtons, SwapSession } from "@/components/SessionScheduler";
import { formatInZone, localTimezone } from "@/lib/timezone";

interface Row {
  id: string;
  date: string;
  partner: string;
  partnerId: string;
  taught: string;
  learned: string;
  creditDelta: number;
  certificate: boolean;
  myStars: number | null;
  sessions: SwapSession[];
}

const History = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [skill, setSkill] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: swaps } = await supabase
        .from("swap_requests")
        .select("*")
        .eq("status", "completed")
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      const list = swaps || [];
      const partnerIds = Array.from(
        new Set(list.map((s: any) => (s.requester_id === user.id ? s.recipient_id : s.requester_id)))
      );
      const swapIds = list.map((s: any) => s.id);

      const [{ data: profs }, { data: certs }, { data: ratings }, { data: sessions }] = await Promise.all([
        partnerIds.length
          ? supabase.from("profiles").select("user_id,full_name").in("user_id", partnerIds)
          : Promise.resolve({ data: [] as any[] }),
        swapIds.length
          ? supabase.from("certificates").select("swap_id,learner_id").in("swap_id", swapIds)
          : Promise.resolve({ data: [] as any[] }),
        swapIds.length
          ? supabase.from("ratings").select("swap_id,rater_id,stars").in("swap_id", swapIds)
          : Promise.resolve({ data: [] as any[] }),
        swapIds.length
          ? supabase.from("swap_sessions").select("*").in("swap_id", swapIds).eq("status", "confirmed").order("starts_at")
          : Promise.resolve({ data: [] as any[] }),
      ]);

      setRows(
        list.map((s: any) => {
          const isRequester = s.requester_id === user.id;
          const partnerId = isRequester ? s.recipient_id : s.requester_id;
          return {
            id: s.id,
            date: s.updated_at,
            partnerId,
            partner: (profs || []).find((p: any) => p.user_id === partnerId)?.full_name || "Member",
            taught: isRequester ? s.offer_skill : s.request_skill,
            learned: isRequester ? s.request_skill : s.offer_skill,
            // requester spends a credit to learn, recipient earns one for teaching
            creditDelta: isRequester ? -1 : 1,
            certificate: (certs || []).some((c: any) => c.swap_id === s.id && c.learner_id === user.id),
            myStars: (ratings || []).find((r: any) => r.swap_id === s.id && r.rater_id === user.id)?.stars ?? null,
            sessions: ((sessions || []) as any[]).filter((ss) => ss.swap_id === s.id) as SwapSession[],
          };
        })
      );
      setLoading(false);
    })();
  }, [user]);

  const skills = useMemo(
    () => Array.from(new Set(rows.flatMap((r) => [r.taught, r.learned]))).sort(),
    [rows]
  );

  const filtered = rows.filter((r) => {
    if (skill !== "all" && r.taught !== skill && r.learned !== skill) return false;
    const d = new Date(r.date);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(new Date(to).getTime() + 86_400_000 - 1)) return false;
    return true;
  });

  const earned = filtered.filter((r) => r.creditDelta > 0).length;
  const spent = filtered.filter((r) => r.creditDelta < 0).length;
  const certCount = filtered.filter((r) => r.certificate).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Swap history</h1>
        <p className="text-muted-foreground">Every completed session, the credits it moved and the certificates it issued.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Sessions", value: filtered.length, icon: HistoryIcon },
          { label: "Credits earned", value: `+${earned} / -${spent}`, icon: Coins },
          { label: "Certificates", value: certCount, icon: Award },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl border bg-card p-5 shadow-soft">
            <s.icon className="h-5 w-5 text-primary mb-2" />
            <div className="font-display text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border bg-card p-4 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Skill</label>
          <Select value={skill} onValueChange={setSkill}>
            <SelectTrigger className="rounded-full"><SelectValue placeholder="All skills" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All skills</SelectItem>
              {skills.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-full" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-full" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading your history...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border bg-card p-12 text-center">
          <HistoryIcon className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            {rows.length === 0 ? "No completed swaps yet." : "No sessions match these filters."}
          </p>
          <Button asChild className="rounded-full gradient-primary text-primary-foreground border-0">
            <Link to="/app/matches">Find a match <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-3xl border bg-card p-5 shadow-soft flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[220px]">
                <div className="font-display text-lg font-bold">{r.partner}</div>
                <div className="text-sm text-muted-foreground">
                  You taught <span className="font-semibold text-foreground">{r.taught}</span> · you learned{" "}
                  <span className="font-semibold text-foreground">{r.learned}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(r.date).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {r.myStars !== null && (
                  <span className="text-xs px-3 py-1 rounded-full bg-secondary flex items-center gap-1">
                    <Star className="h-3 w-3 fill-accent text-accent" />You rated {r.myStars}
                  </span>
                )}
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${r.creditDelta > 0 ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>
                  {r.creditDelta > 0 ? "+1 credit" : "-1 credit"}
                </span>
                {r.certificate && (
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link to="/app/certificates"><Award className="h-3.5 w-3.5 mr-1" />Certificate</Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
