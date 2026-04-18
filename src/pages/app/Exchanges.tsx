import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Repeat, ArrowRight, CheckCircle2, Clock, XCircle, Sparkles } from "lucide-react";

interface Swap {
  id: string;
  status: "pending" | "accepted" | "completed" | "rejected" | "cancelled";
  offer_skill: string;
  request_skill: string;
  requester_id: string;
  recipient_id: string;
  updated_at: string;
  other: { full_name: string; avatar_url: string | null };
}

const DEMO_PUBLIC = [
  { id: "p1", a: "Aiko Tanaka", b: "Noah Cohen", a_skill: "Digital Illustration", b_skill: "Python", status: "completed" as const },
  { id: "p2", a: "Marcus Müller", b: "Lucas Oliveira", a_skill: "React", b_skill: "Guitar", status: "accepted" as const },
  { id: "p3", a: "Priya Sharma", b: "Élodie Laurent", a_skill: "Hindi", b_skill: "French", status: "completed" as const },
  { id: "p4", a: "Sofía Reyes", b: "Chen Wei", a_skill: "Spanish", b_skill: "Mandarin", status: "accepted" as const },
  { id: "p5", a: "Liam O'Connor", b: "Amara Okafor", a_skill: "Yoga", b_skill: "Photography", status: "completed" as const },
  { id: "p6", a: "Henrik Larsson", b: "Zara Ahmed", a_skill: "Woodworking", b_skill: "Creative Writing", status: "accepted" as const },
];

const Exchanges = () => {
  const { user } = useAuth();
  const [mine, setMine] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("swap_requests").select("*").or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).order("updated_at", { ascending: false });
      const ids = Array.from(new Set((data || []).map((s: any) => s.requester_id === user.id ? s.recipient_id : s.requester_id)));
      const { data: profs } = ids.length ? await supabase.from("profiles").select("user_id,full_name,avatar_url").in("user_id", ids) : { data: [] };
      const rows: Swap[] = (data || []).map((s: any) => {
        const otherId = s.requester_id === user.id ? s.recipient_id : s.requester_id;
        const other = (profs || []).find((p: any) => p.user_id === otherId) || { full_name: "User", avatar_url: null };
        return { ...s, other };
      });
      setMine(rows);
      setLoading(false);
    })();
  }, [user]);

  const counts = {
    pending: mine.filter((s) => s.status === "pending").length,
    active: mine.filter((s) => s.status === "accepted").length,
    completed: mine.filter((s) => s.status === "completed").length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Skill Exchanges</h1>
        <p className="text-muted-foreground">Track every swap — yours and what's happening across the community.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={Clock} label="Pending" value={counts.pending} color="accent" />
        <Stat icon={Repeat} label="Active" value={counts.active} color="primary" />
        <Stat icon={CheckCircle2} label="Completed" value={counts.completed} color="success" />
      </div>

      <section>
        <h2 className="font-display text-2xl font-bold mb-4">Your exchanges</h2>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : mine.length === 0 ? (
          <div className="rounded-3xl border bg-card p-10 text-center">
            <p className="text-muted-foreground mb-4">You haven't started any exchanges yet.</p>
            <Button asChild className="rounded-full gradient-primary text-primary-foreground border-0">
              <Link to="/app/matches">Find your first match <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {mine.map((s) => (
              <Link key={s.id} to="/app/chats" className="block rounded-2xl border bg-card p-5 shadow-soft hover:shadow-card transition-smooth">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-secondary shrink-0">
                    {s.other.avatar_url ? <img src={s.other.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-bold">{s.other.full_name[0]}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold truncate">{s.other.full_name}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      <span className="text-primary font-semibold">{s.requester_id === user?.id ? s.request_skill : s.offer_skill}</span>
                      {" ↔ "}
                      <span className="text-accent font-semibold">{s.requester_id === user?.id ? s.offer_skill : s.request_skill}</span>
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold mb-1 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />Live community exchanges
        </h2>
        <p className="text-sm text-muted-foreground mb-4">See what others are swapping right now.</p>
        <div className="grid md:grid-cols-2 gap-3">
          {DEMO_PUBLIC.map((p) => (
            <div key={p.id} className="rounded-2xl border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{p.a} ↔ {p.b}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    <span className="text-primary">{p.a_skill}</span> for <span className="text-accent">{p.b_skill}</span>
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, color }: any) => (
  <div className={`rounded-3xl border bg-card p-6 shadow-soft`}>
    <Icon className={`h-6 w-6 mb-3 text-${color}`} />
    <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
    <div className="font-display text-3xl font-bold mt-1">{value}</div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { cls: string; icon: any }> = {
    pending: { cls: "bg-accent/10 text-accent", icon: Clock },
    accepted: { cls: "bg-primary/10 text-primary", icon: Repeat },
    completed: { cls: "bg-success/10 text-success", icon: CheckCircle2 },
    rejected: { cls: "bg-muted text-muted-foreground", icon: XCircle },
    cancelled: { cls: "bg-muted text-muted-foreground", icon: XCircle },
  };
  const v = map[status] || map.pending;
  const Icon = v.icon;
  return <span className={`text-xs px-3 py-1 rounded-full capitalize shrink-0 flex items-center gap-1 ${v.cls}`}><Icon className="h-3 w-3" />{status}</span>;
};

export default Exchanges;
