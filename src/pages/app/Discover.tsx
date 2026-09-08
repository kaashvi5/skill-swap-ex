import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, MapPin, Sparkles, FileCheck, Send } from "lucide-react";
import { SwapRequestDialog, SwapTarget } from "@/components/SwapRequestDialog";
import { filterDemo, useDemoMode } from "@/lib/demoMode";

interface UserCard {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  trust_score: number;
  ratings_count: number;
  teach: { skill: string; level: string; proof_url: string | null }[];
  learn: { skill: string }[];
  matchScore: number;
}

const Discover = () => {
  const { user } = useAuth();
  const demoOn = useDemoMode();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"all" | "teaches" | "wants">("all");
  const [sort, setSort] = useState<"match" | "rating" | "name">("match");
  const [users, setUsers] = useState<UserCard[]>([]);
  const [mySkillsLearn, setMySkillsLearn] = useState<string[]>([]);
  const [mySkillsTeach, setMySkillsTeach] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<(SwapTarget & { pref?: string }) | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: profiles }, { data: teach }, { data: learn }, { data: myT }, { data: myL }] = await Promise.all([
        supabase.from("profiles").select("user_id,full_name,avatar_url,bio,country,city,trust_score,ratings_count,is_demo").neq("user_id", user.id).limit(100),
        supabase.from("skills_teach").select("user_id,skill,level,proof_url"),
        supabase.from("skills_learn").select("user_id,skill"),
        supabase.from("skills_teach").select("skill").eq("user_id", user.id),
        supabase.from("skills_learn").select("skill").eq("user_id", user.id),
      ]);
      const myLearnList = (myL || []).map((x: any) => x.skill.toLowerCase());
      const myTeachList = (myT || []).map((x: any) => x.skill);
      setMySkillsLearn(myLearnList);
      setMySkillsTeach(myTeachList);
      const myTeachLower = myTeachList.map((s) => s.toLowerCase());

      const cards: UserCard[] = filterDemo(profiles || [], demoOn).map((p: any) => {
        const tList = (teach || []).filter((t: any) => t.user_id === p.user_id).map((t: any) => ({ skill: t.skill, level: t.level, proof_url: t.proof_url }));
        const lList = (learn || []).filter((l: any) => l.user_id === p.user_id).map((l: any) => ({ skill: l.skill }));
        let score = 0;
        tList.forEach((t) => { if (myLearnList.includes(t.skill.toLowerCase())) score += 2; });
        lList.forEach((l) => { if (myTeachLower.includes(l.skill.toLowerCase())) score += 1; });
        return { ...p, trust_score: Number(p.trust_score), teach: tList, learn: lList, matchScore: score };
      });
      setUsers(cards);
      setLoading(false);
    })();
  }, [user, demoOn]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = users.filter((u) => {
      if (!q) return true;
      if (mode === "teaches") return u.teach.some((t) => t.skill.toLowerCase().includes(q));
      if (mode === "wants") return u.learn.some((l) => l.skill.toLowerCase().includes(q));
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.teach.some((t) => t.skill.toLowerCase().includes(q)) ||
        u.learn.some((l) => l.skill.toLowerCase().includes(q)) ||
        (u.country || "").toLowerCase().includes(q) ||
        (u.city || "").toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      if (sort === "rating") return b.trust_score - a.trust_score || b.ratings_count - a.ratings_count;
      if (sort === "name") return a.full_name.localeCompare(b.full_name);
      return b.matchScore - a.matchScore || b.trust_score - a.trust_score;
    });
    return list;
  }, [query, users, mode, sort]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Discover</h1>
        <p className="text-muted-foreground">Everyone on SkillSwap, matched against your skills.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={mode} onValueChange={(v) => setMode(v as any)}>
          <SelectTrigger className="w-48 rounded-full h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Search everything</SelectItem>
            <SelectItem value="teaches">Teaches this skill</SelectItem>
            <SelectItem value="wants">Wants this skill</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger className="w-44 rounded-full h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="match">Best match</SelectItem>
            <SelectItem value="rating">Highest rated</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, skill, or country" className="pl-11 h-12 rounded-full" />
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading community...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border bg-card p-12 text-center">
          <p className="text-muted-foreground mb-4">
            {users.length === 0 ? "No other members yet — invite a friend to swap with!" : "Nobody matches that search."}
          </p>
          <Button asChild variant="outline" className="rounded-full"><Link to="/app/profile">Add more skills</Link></Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((u) => (
            <div key={u.user_id} className="rounded-3xl border bg-card p-6 shadow-soft hover:shadow-card transition-smooth flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-secondary shrink-0">
                  {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-display font-bold text-xl text-muted-foreground">{u.full_name[0]}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-lg truncate">{u.full_name}</div>
                  {(u.city || u.country) && <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{[u.city, u.country].filter(Boolean).join(", ")}</div>}
                  <div className="flex items-center gap-1 text-xs mt-1"><Star className="h-3 w-3 fill-accent text-accent" /><span className="font-semibold">{u.trust_score.toFixed(1)}</span><span className="text-muted-foreground">({u.ratings_count})</span></div>
                </div>
                {u.matchScore > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full gradient-accent text-accent-foreground flex items-center gap-1 shrink-0"><Sparkles className="h-3 w-3" />{u.matchScore}</span>
                )}
              </div>
              {u.bio && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{u.bio}</p>}
              <div className="space-y-2 mb-4 text-sm">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Teaches</div>
                  <div className="flex flex-wrap gap-1.5">
                    {u.teach.slice(0, 4).map((t, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                        {t.skill}{t.proof_url && <FileCheck className="h-3 w-3" />}
                      </span>
                    ))}
                    {u.teach.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Wants</div>
                  <div className="flex flex-wrap gap-1.5">
                    {u.learn.slice(0, 4).map((l, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">{l.skill}</span>
                    ))}
                    {u.learn.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setTarget({ user_id: u.user_id, full_name: u.full_name, teach: u.teach, pref: u.teach.find((t) => mySkillsLearn.includes(t.skill.toLowerCase()))?.skill })}
                disabled={u.teach.length === 0}
                className="rounded-full gradient-primary text-primary-foreground border-0 mt-auto"
              >
                <Send className="h-4 w-4 mr-1" />Send swap request
              </Button>
            </div>
          ))}
        </div>
      )}

      <SwapRequestDialog
        target={target}
        onClose={() => setTarget(null)}
        currentUserId={user?.id}
        myTeachSkills={mySkillsTeach}
        defaultRequestSkill={target?.pref}
      />
    </div>
  );
};

export default Discover;
