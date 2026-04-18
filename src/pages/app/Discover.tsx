import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Star, MapPin, Sparkles, FileCheck, Send } from "lucide-react";
import { DEMO_USERS } from "@/lib/demoData";

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
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserCard[]>([]);
  const [mySkillsLearn, setMySkillsLearn] = useState<string[]>([]);
  const [mySkillsTeach, setMySkillsTeach] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [target, setTarget] = useState<UserCard | null>(null);
  const [offerSkill, setOfferSkill] = useState("");
  const [requestSkill, setRequestSkill] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: profiles }, { data: teach }, { data: learn }, { data: myT }, { data: myL }] = await Promise.all([
        supabase.from("profiles").select("user_id,full_name,avatar_url,bio,country,city,trust_score,ratings_count").neq("user_id", user.id).limit(60),
        supabase.from("skills_teach").select("user_id,skill,level,proof_url"),
        supabase.from("skills_learn").select("user_id,skill"),
        supabase.from("skills_teach").select("skill").eq("user_id", user.id),
        supabase.from("skills_learn").select("skill").eq("user_id", user.id),
      ]);
      const myLearnList = (myL || []).map((x: any) => x.skill.toLowerCase());
      const myTeachList = (myT || []).map((x: any) => x.skill.toLowerCase());
      setMySkillsLearn(myLearnList);
      setMySkillsTeach(myTeachList);

      const cards: UserCard[] = (profiles || []).map((p: any) => {
        const tList = (teach || []).filter((t: any) => t.user_id === p.user_id).map((t: any) => ({ skill: t.skill, level: t.level, proof_url: t.proof_url }));
        const lList = (learn || []).filter((l: any) => l.user_id === p.user_id).map((l: any) => ({ skill: l.skill }));
        // AI match: count overlap (their teach ∩ my learn) + (my teach ∩ their learn)
        let score = 0;
        tList.forEach((t) => { if (myLearnList.includes(t.skill.toLowerCase())) score += 2; });
        lList.forEach((l) => { if (myTeachList.includes(l.skill.toLowerCase())) score += 1; });
        return { ...p, teach: tList, learn: lList, matchScore: score };
      });
      // Mix in demo global users so the world feels populated
      const demoCards: UserCard[] = DEMO_USERS.map((u) => {
        let score = 0;
        u.teach.forEach((t) => { if (myLearnList.includes(t.skill.toLowerCase())) score += 2; });
        u.learn.forEach((l) => { if (myTeachList.includes(l.skill.toLowerCase())) score += 1; });
        return { ...u, matchScore: score };
      });
      const all = [...cards, ...demoCards];
      all.sort((a, b) => b.matchScore - a.matchScore || b.trust_score - a.trust_score);
      setUsers(all);
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.full_name.toLowerCase().includes(q) ||
      u.teach.some((t) => t.skill.toLowerCase().includes(q)) ||
      u.learn.some((l) => l.skill.toLowerCase().includes(q)) ||
      (u.country || "").toLowerCase().includes(q)
    );
  }, [query, users]);

  const openSwap = (u: UserCard) => {
    setTarget(u);
    // Pre-fill best match
    const bestRequest = u.teach.find((t) => mySkillsLearn.includes(t.skill.toLowerCase()))?.skill || u.teach[0]?.skill || "";
    const bestOffer = u.learn.find((l) => mySkillsTeach.includes(l.skill.toLowerCase()))?.skill || mySkillsTeach[0] || "";
    setRequestSkill(bestRequest);
    setOfferSkill(bestOffer);
    setMessage("");
  };

  const sendSwap = async () => {
    if (!user || !target) return;
    if (!offerSkill.trim() || !requestSkill.trim()) { toast.error("Pick what you offer and want"); return; }
    setSending(true);
    if (target.user_id.startsWith("demo-")) {
      toast.success(`Demo: swap request sent to ${target.full_name}!`);
      setTarget(null); setSending(false); return;
    }
    const { error } = await supabase.from("swap_requests").insert({
      requester_id: user.id,
      recipient_id: target.user_id,
      offer_skill: offerSkill.trim(),
      request_skill: requestSkill.trim(),
      message: message.trim() || null,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Swap request sent!");
    setTarget(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Discover</h1>
        <p className="text-muted-foreground">Smart-matched with people across the world.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, skill, or country" className="pl-11 h-12 rounded-full" />
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading matches...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No people match yet. Add more skills to your profile!</div>
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
                  <div className="flex items-center gap-1 text-xs mt-1"><Star className="h-3 w-3 fill-accent text-accent" /><span className="font-semibold">{u.trust_score}</span><span className="text-muted-foreground">({u.ratings_count})</span></div>
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
              <Button onClick={() => openSwap(u)} className="rounded-full gradient-primary text-primary-foreground border-0 mt-auto">
                <Send className="h-4 w-4 mr-1" />Send swap request
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Swap with {target?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">I want to learn from them</label>
              <Select value={requestSkill} onValueChange={setRequestSkill}>
                <SelectTrigger><SelectValue placeholder="Pick a skill they teach" /></SelectTrigger>
                <SelectContent>
                  {target?.teach.map((t, i) => <SelectItem key={i} value={t.skill}>{t.skill} ({t.level})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">In exchange I'll teach</label>
              <Input value={offerSkill} onChange={(e) => setOfferSkill(e.target.value)} placeholder="Pick from your skills" maxLength={60} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Message (optional)</label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} rows={3} placeholder="Hey! I'd love to swap..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={sendSwap} disabled={sending} className="rounded-full gradient-primary text-primary-foreground border-0">
              {sending ? "Sending..." : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Discover;
