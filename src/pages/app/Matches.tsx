import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, MapPin, Star, Send } from "lucide-react";
import { SwapRequestDialog, SwapTarget } from "@/components/SwapRequestDialog";

interface Match {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  country: string | null;
  city: string | null;
  trust_score: number;
  ratings_count: number;
  teach: { skill: string; level: string }[];
  learn: { skill: string }[];
  matchScore: number;
  reasons: string[];
  wantedSkill?: string;
}

const Matches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [myTeach, setMyTeach] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<(SwapTarget & { pref?: string }) | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: myT }, { data: myL }, { data: profiles }, { data: teach }, { data: learn }] = await Promise.all([
        supabase.from("skills_teach").select("skill").eq("user_id", user.id),
        supabase.from("skills_learn").select("skill").eq("user_id", user.id),
        supabase.from("profiles").select("user_id,full_name,avatar_url,country,city,trust_score,ratings_count").neq("user_id", user.id),
        supabase.from("skills_teach").select("user_id,skill,level"),
        supabase.from("skills_learn").select("user_id,skill"),
      ]);
      const myTeachList = (myT || []).map((x: any) => x.skill);
      setMyTeach(myTeachList);
      const myTeachLower = myTeachList.map((s) => s.toLowerCase());
      const myLearnLower = (myL || []).map((x: any) => x.skill.toLowerCase());

      const all: Match[] = (profiles || []).map((p: any) => {
        const t = (teach || []).filter((x: any) => x.user_id === p.user_id).map((x: any) => ({ skill: x.skill, level: x.level }));
        const l = (learn || []).filter((x: any) => x.user_id === p.user_id).map((x: any) => ({ skill: x.skill }));
        const reasons: string[] = [];
        let score = 0;
        let wanted: string | undefined;
        t.forEach((x) => {
          if (myLearnLower.includes(x.skill.toLowerCase())) {
            score += 3; wanted = wanted || x.skill;
            reasons.push(`They teach ${x.skill} → you want it`);
          }
        });
        l.forEach((x) => {
          if (myTeachLower.includes(x.skill.toLowerCase())) {
            score += 2;
            reasons.push(`You teach ${x.skill} → they want it`);
          }
        });
        return { ...p, trust_score: Number(p.trust_score), teach: t, learn: l, matchScore: score, reasons, wantedSkill: wanted };
      });

      setMatches(all.filter((m) => m.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore || b.trust_score - a.trust_score));
      setLoading(false);
    })();
  }, [user]);

  const mutual = matches.filter((m) => m.matchScore >= 5);
  const partial = matches.filter((m) => m.matchScore < 5);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent mb-2">
          <Sparkles className="h-3.5 w-3.5" /> Skill overlap
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Find matches</h1>
        <p className="text-muted-foreground">Only people whose skills genuinely overlap with yours.</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Finding your matches...</div>
      ) : matches.length === 0 ? (
        <div className="rounded-3xl border bg-card p-12 text-center">
          <p className="text-muted-foreground mb-4">No matches yet — add more skills you teach and want to learn, and we'll find overlaps.</p>
          <Button asChild className="rounded-full gradient-primary text-primary-foreground border-0">
            <Link to="/app/profile">Update my skills</Link>
          </Button>
        </div>
      ) : (
        <>
          {mutual.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-bold mb-4">🔥 Two-way matches</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {mutual.map((m) => <MatchCard key={m.user_id} m={m} highlight onSwap={setTarget} />)}
              </div>
            </section>
          )}
          {partial.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-bold mb-4">One-way matches</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partial.map((m) => <MatchCard key={m.user_id} m={m} onSwap={setTarget} />)}
              </div>
            </section>
          )}
        </>
      )}

      <SwapRequestDialog
        target={target}
        onClose={() => setTarget(null)}
        currentUserId={user?.id}
        myTeachSkills={myTeach}
        defaultRequestSkill={target?.pref}
      />
    </div>
  );
};

const MatchCard = ({ m, highlight, onSwap }: { m: Match; highlight?: boolean; onSwap: (t: SwapTarget & { pref?: string }) => void }) => (
  <div className={`rounded-3xl border p-5 shadow-soft hover:shadow-card transition-smooth ${highlight ? "bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20" : "bg-card"}`}>
    <div className="flex items-start gap-4 mb-3">
      <div className="h-14 w-14 rounded-full overflow-hidden bg-secondary shrink-0">
        {m.avatar_url ? <img src={m.avatar_url} alt={m.full_name} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-bold">{m.full_name[0]}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-lg truncate">{m.full_name}</div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {(m.city || m.country) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[m.city, m.country].filter(Boolean).join(", ")}</span>}
          <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-accent text-accent" />{m.trust_score.toFixed(1)}</span>
        </div>
      </div>
      <span className="text-xs px-2 py-1 rounded-full gradient-accent text-accent-foreground font-bold flex items-center gap-1">
        <Sparkles className="h-3 w-3" />{m.matchScore}
      </span>
    </div>
    <ul className="text-xs space-y-1 mb-4">
      {m.reasons.slice(0, 3).map((r, i) => <li key={i} className="text-muted-foreground">• {r}</li>)}
    </ul>
    <Button
      onClick={() => onSwap({ user_id: m.user_id, full_name: m.full_name, teach: m.teach, pref: m.wantedSkill })}
      className="w-full rounded-full gradient-primary text-primary-foreground border-0"
    >
      <Send className="h-4 w-4 mr-1" />Send swap request
    </Button>
  </div>
);

export default Matches;
