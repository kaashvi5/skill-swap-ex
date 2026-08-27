import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Repeat, ArrowRight, CheckCircle2, Clock, XCircle, Check, X, MessageCircle } from "lucide-react";

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

type Tab = "pending" | "accepted" | "completed";

const Exchanges = () => {
  const { user } = useAuth();
  const [mine, setMine] = useState<Swap[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("swap_requests").select("*").or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).order("updated_at", { ascending: false });
    const ids = Array.from(new Set((data || []).map((s: any) => s.requester_id === user.id ? s.recipient_id : s.requester_id)));
    const { data: profs } = ids.length ? await supabase.from("profiles").select("user_id,full_name,avatar_url").in("user_id", ids) : { data: [] as any[] };
    setMine((data || []).map((s: any) => {
      const otherId = s.requester_id === user.id ? s.recipient_id : s.requester_id;
      const other = (profs || []).find((p: any) => p.user_id === otherId) || { full_name: "User", avatar_url: null };
      return { ...s, other };
    }));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const respond = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("swap_requests").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "accepted" ? "Swap accepted — say hi in Chats!" : "Request declined");
    load();
  };

  const counts = {
    pending: mine.filter((s) => s.status === "pending").length,
    accepted: mine.filter((s) => s.status === "accepted").length,
    completed: mine.filter((s) => s.status === "completed").length,
  };
  const list = mine.filter((s) => s.status === tab);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Skill Exchanges</h1>
        <p className="text-muted-foreground">Track every swap from request to certificate.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={Clock} label="Pending" value={counts.pending} onClick={() => setTab("pending")} active={tab === "pending"} />
        <Stat icon={Repeat} label="Active" value={counts.accepted} onClick={() => setTab("accepted")} active={tab === "accepted"} />
        <Stat icon={CheckCircle2} label="Completed" value={counts.completed} onClick={() => setTab("completed")} active={tab === "completed"} />
      </div>

      <section>
        <h2 className="font-display text-2xl font-bold mb-4 capitalize">{tab === "accepted" ? "Active" : tab} exchanges</h2>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : list.length === 0 ? (
          <div className="rounded-3xl border bg-card p-10 text-center">
            <p className="text-muted-foreground mb-4">Nothing here yet.</p>
            <Button asChild className="rounded-full gradient-primary text-primary-foreground border-0">
              <Link to="/app/matches">Find a match <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((s) => (
              <div key={s.id} className="rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex items-center gap-4 flex-wrap">
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
                  {s.status === "pending" && s.recipient_id === user?.id ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => respond(s.id, "rejected")}><X className="h-4 w-4 mr-1" />Decline</Button>
                      <Button size="sm" className="rounded-full gradient-primary text-primary-foreground border-0" onClick={() => respond(s.id, "accepted")}><Check className="h-4 w-4 mr-1" />Accept</Button>
                    </div>
                  ) : (
                    <Button asChild size="sm" variant="outline" className="rounded-full">
                      <Link to="/app/chats"><MessageCircle className="h-4 w-4 mr-1" />Open chat</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, onClick, active }: any) => (
  <button onClick={onClick} className={`text-left rounded-3xl border p-6 shadow-soft transition-smooth ${active ? "bg-primary/5 border-primary/30" : "bg-card hover:shadow-card"}`}>
    <Icon className="h-6 w-6 mb-3 text-primary" />
    <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
    <div className="font-display text-3xl font-bold mt-1">{value}</div>
  </button>
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
