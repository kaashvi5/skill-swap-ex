import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, MapPin, Star } from "lucide-react";
import { DEMO_USERS, DemoUser } from "@/lib/demoData";

interface Match extends DemoUser { matchScore: number; reasons: string[]; }

const Matches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: myT }, { data: myL }, { data: profiles }, { data: teach }, { data: learn }] = await Promise.all([
        supabase.from("skills_teach").select("skill").eq("user_id", user.id),
        supabase.from("skills_learn").select("skill").eq("user_id", user.id),
        supabase.from("profiles").select("user_id,full_name,avatar_url,bio,country,city,trust_score,ratings_count").neq("user_id", user.id),
        supabase.from("skills_teach").select("user_id,skill,level,proof_url"),
        supabase.from("skills_learn").select("user_id,skill"),
      ]);
      const myTeach = (myT || []).map((x: any) => x.skill.toLowerCase());
      const myLearn = (myL || []).map((x: any) => x.skill.toLowerCase());

      const realCards: Match[] = (profiles || []).map((p: any) => {
        const t = (teach || []).filter((x: any) => x.user_id === p.user_id).map((x: any) => ({ skill: x.skill, level: x.level, proof_url: x.proof_url }));
        const l = (learn || []).filter((x: any) => x.user_id === p.user_id).map((x: any) => ({ skill: x.skill }));
        return { ...p, teach: t, learn: l, matchScore: 0, reasons: [] };
      });

      const all: Match[] = [...realCards, ...DEMO_USERS.map((u) => ({ ...u, matchScore: 0, reasons: [] as string[] }))];

      all.forEach((u) => {
        const reasons: string[] = [];
        let score = 0;
        u.teach.forEach((t) => {
          if (myLearn.includes(t.skill.toLowerCase())) { score += 3; reasons.push(`Teaches ${t.skill} (you want to learn)`); }
        });
        u.learn.forEach((l) => {
          if (myTeach.includes(l.skill.toLowerCase())) { score += 2; reasons.push(`Wants ${l.skill} (you teach)`); }
        });
        // Bonus for high trust
        if (u.trust_score >= 4.7) score += 1;
        u.matchScore = score;
        u.reasons = reasons;
      });

      all.sort((a, b) => b.matchScore - a.matchScore || b.trust_score - a.trust_score);
      setMatches(all.slice(0, 24));
      setLoading(false);
    })();
  }, [user]);

  const top = matches.filter((m) => m.matchScore >= 3);
  const others = matches.filter((m) => m.matchScore < 3);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent mb-2">
          <Sparkles className="h-3.5 w-3.5" /> AI-powered
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Find matches</h1>
        <p className="text-muted-foreground">People whose teaching skills overlap with what you want to learn — and vice versa.</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Finding your perfect matches...</div>
      ) : (
        <>
          {top.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-bold mb-4">🔥 Top matches for you</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {top.slice(0, 6).map((m) => <MatchCard key={m.user_id} m={m} highlight />)}
              </div>
            </section>
          )}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">More people you might like</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(others.length ? others : matches).slice(0, 12).map((m) => <MatchCard key={m.user_id} m={m} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const MatchCard = ({ m, highlight }: { m: Match; highlight?: boolean }) => (
  <div className={`rounded-3xl border p-5 shadow-soft hover:shadow-card transition-smooth ${highlight ? "bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20" : "bg-card"}`}>
    <div className="flex items-start gap-4 mb-3">
      <img src={m.avatar_url} alt={m.full_name} className="h-14 w-14 rounded-full bg-secondary object-cover" />
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-lg truncate">{m.full_name}</div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {(m.city || m.country) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[m.city, m.country].filter(Boolean).join(", ")}</span>}
          <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-accent text-accent" />{m.trust_score}</span>
        </div>
      </div>
      {m.matchScore > 0 && (
        <span className="text-xs px-2 py-1 rounded-full gradient-accent text-accent-foreground font-bold flex items-center gap-1">
          <Sparkles className="h-3 w-3" />{m.matchScore}
        </span>
      )}
    </div>
    {m.reasons.length > 0 && (
      <ul className="text-xs space-y-1 mb-3">
        {m.reasons.slice(0, 2).map((r, i) => <li key={i} className="text-muted-foreground">• {r}</li>)}
      </ul>
    )}
    <div className="flex flex-wrap gap-1.5 mb-4">
      {m.teach.slice(0, 3).map((t, i) => (
        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t.skill}</span>
      ))}
    </div>
    <Button asChild className="w-full rounded-full gradient-primary text-primary-foreground border-0">
      <Link to="/app/discover">Send swap request <ArrowRight className="ml-1 h-4 w-4" /></Link>
    </Button>
  </div>
);

export default Matches;
