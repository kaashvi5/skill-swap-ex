import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Star, Coins, Award, Medal } from "lucide-react";
import { DEMO_USERS } from "@/lib/demoData";

interface Row {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  country: string | null;
  trust_score: number;
  ratings_count: number;
  credits: number;
  certs: number;
  isMe?: boolean;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<"trust" | "credits" | "certs">("trust");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id,full_name,avatar_url,country,trust_score,ratings_count,credits");
      const { data: certs } = await supabase.from("certificates").select("learner_id");
      const certCount = (id: string) => (certs || []).filter((c: any) => c.learner_id === id).length;

      const real: Row[] = (profiles || []).map((p: any) => ({
        user_id: p.user_id, full_name: p.full_name, avatar_url: p.avatar_url, country: p.country,
        trust_score: Number(p.trust_score), ratings_count: p.ratings_count, credits: p.credits,
        certs: certCount(p.user_id), isMe: p.user_id === user?.id,
      }));

      const demo: Row[] = DEMO_USERS.map((u, i) => ({
        user_id: u.user_id, full_name: u.full_name, avatar_url: u.avatar_url, country: u.country,
        trust_score: u.trust_score, ratings_count: u.ratings_count,
        credits: 8 + ((i * 7) % 25), certs: 1 + (i % 6),
      }));

      setRows([...real, ...demo]);
      setLoading(false);
    })();
  }, [user]);

  const sorted = [...rows].sort((a, b) => {
    if (tab === "trust") return b.trust_score - a.trust_score || b.ratings_count - a.ratings_count;
    if (tab === "credits") return b.credits - a.credits;
    return b.certs - a.certs;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent mb-2">
          <Trophy className="h-3.5 w-3.5" /> Global rankings
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Leaderboard</h1>
        <p className="text-muted-foreground">The most trusted swappers across the world.</p>
      </div>

      <div className="flex gap-2 p-1 rounded-full bg-secondary w-fit">
        <TabBtn active={tab === "trust"} onClick={() => setTab("trust")} icon={Star} label="Trust score" />
        <TabBtn active={tab === "credits"} onClick={() => setTab("credits")} icon={Coins} label="Credits" />
        <TabBtn active={tab === "certs"} onClick={() => setTab("certs")} icon={Award} label="Certificates" />
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            {sorted.slice(0, 3).map((r, i) => <PodiumCard key={r.user_id} row={r} place={i + 1} tab={tab} />)}
          </div>
          <div className="rounded-3xl border bg-card shadow-soft overflow-hidden">
            {sorted.slice(3, 25).map((r, i) => (
              <div key={r.user_id} className={`flex items-center gap-4 p-4 border-b last:border-0 ${r.isMe ? "bg-primary/5" : ""}`}>
                <span className="font-display font-bold text-muted-foreground w-8 text-center">{i + 4}</span>
                <img src={r.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.user_id}`} alt="" className="h-10 w-10 rounded-full bg-secondary object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate flex items-center gap-2">
                    {r.full_name}
                    {r.isMe && <span className="text-[10px] px-2 py-0.5 rounded-full gradient-primary text-primary-foreground">YOU</span>}
                  </div>
                  {r.country && <div className="text-xs text-muted-foreground">{r.country}</div>}
                </div>
                <div className="font-display font-bold text-lg">
                  {tab === "trust" && <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-accent text-accent" />{r.trust_score.toFixed(1)}</span>}
                  {tab === "credits" && <span className="flex items-center gap-1 text-accent"><Coins className="h-4 w-4" />{r.credits}</span>}
                  {tab === "certs" && <span className="flex items-center gap-1 text-primary"><Award className="h-4 w-4" />{r.certs}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const TabBtn = ({ active, onClick, icon: Icon, label }: any) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-smooth ${active ? "bg-background shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
    <Icon className="h-4 w-4" />{label}
  </button>
);

const PodiumCard = ({ row, place, tab }: { row: Row; place: number; tab: string }) => {
  const colors = ["from-amber-400 to-yellow-500", "from-slate-300 to-slate-400", "from-orange-400 to-amber-600"];
  const value = tab === "trust" ? row.trust_score.toFixed(1) : tab === "credits" ? row.credits : row.certs;
  return (
    <div className={`rounded-3xl p-5 text-primary-foreground shadow-card bg-gradient-to-br ${colors[place - 1]}`}>
      <div className="flex items-center gap-2 mb-3">
        <Medal className="h-5 w-5" />
        <span className="font-display font-bold">#{place}</span>
      </div>
      <img src={row.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.user_id}`} alt="" className="h-16 w-16 rounded-full bg-background/20 mb-3 object-cover" />
      <div className="font-display font-bold truncate">{row.full_name}</div>
      <div className="text-xs opacity-90 truncate">{row.country}</div>
      <div className="font-display text-3xl font-bold mt-2">{value}</div>
    </div>
  );
};

export default Leaderboard;
