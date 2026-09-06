import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Coins, Star, Sparkles, ArrowRight, Users, MessageCircle, Trophy, Repeat, Award, Flame, Globe2 } from "lucide-react";
import LearnFree from "@/components/LearnFree";

interface Profile {
  full_name: string;
  avatar_url: string | null;
  credits: number;
  trust_score: number;
  ratings_count: number;
}

interface ActivityItem { who: string; action: string; target: string; skill: string; time: string }

const TIPS = [
  { emoji: "🎯", title: "Pick one skill to master", body: "Focused weekly swaps beat scattered ones." },
  { emoji: "📸", title: "Upload proof", body: "Skills with proof get more requests." },
  { emoji: "🌍", title: "Try cross-cultural swaps", body: "Learn a language while teaching design." },
];

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const Home = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ teach: 0, learn: 0, pendingIn: 0, accepted: 0, certs: 0, community: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("full_name,avatar_url,trust_score,ratings_count").eq("user_id", user.id).maybeSingle();
      const { data: c } = await supabase.from("user_credits").select("credits").eq("user_id", user.id).maybeSingle();
      setProfile(p ? ({ ...p, credits: c?.credits ?? 0 } as Profile) : null);

      const [t, l, pi, ac, ce, comm] = await Promise.all([
        supabase.from("skills_teach").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("skills_learn").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("swap_requests").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("status", "pending"),
        supabase.from("swap_requests").select("id", { count: "exact", head: true }).or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).eq("status", "accepted"),
        supabase.from("certificates").select("id", { count: "exact", head: true }).eq("learner_id", user.id),
        supabase.from("profiles").select("user_id", { count: "exact", head: true }),
      ]);
      setStats({
        teach: t.count || 0, learn: l.count || 0, pendingIn: pi.count || 0,
        accepted: ac.count || 0, certs: ce.count || 0, community: comm.count || 0,
      });

      // Real activity: my swaps + my certificates
      const { data: swaps } = await supabase
        .from("swap_requests").select("*")
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("updated_at", { ascending: false }).limit(6);
      const { data: certs } = await supabase
        .from("certificates").select("*").eq("learner_id", user.id)
        .order("issued_at", { ascending: false }).limit(3);

      const ids = new Set<string>();
      (swaps || []).forEach((s: any) => ids.add(s.requester_id === user.id ? s.recipient_id : s.requester_id));
      (certs || []).forEach((c: any) => ids.add(c.teacher_id));
      const { data: profs } = ids.size
        ? await supabase.from("profiles").select("user_id,full_name").in("user_id", [...ids])
        : { data: [] as any[] };
      const nameOf = (id: string) => (profs || []).find((x: any) => x.user_id === id)?.full_name || "A swapper";

      const items: (ActivityItem & { at: string })[] = [];
      (swaps || []).forEach((s: any) => {
        const otherId = s.requester_id === user.id ? s.recipient_id : s.requester_id;
        const action =
          s.status === "pending" ? (s.requester_id === user.id ? "you sent a request to" : "sent you a request —")
          : s.status === "accepted" ? "active swap with"
          : s.status === "completed" ? "completed a swap with"
          : `${s.status} swap with`;
        items.push({ who: "SkillSwap", action, target: nameOf(otherId), skill: `${s.request_skill} ↔ ${s.offer_skill}`, time: timeAgo(s.updated_at), at: s.updated_at });
      });
      (certs || []).forEach((c: any) => {
        items.push({ who: nameOf(c.teacher_id), action: "issued a certificate to", target: "you", skill: c.skill, time: timeAgo(c.issued_at), at: c.issued_at });
      });
      items.sort((a, b) => +new Date(b.at) - +new Date(a.at));
      setActivity(items.slice(0, 6));
    })();
  }, [user, refreshKey]);

  const needsSetup = profile !== null && (!profile.avatar_url || stats.teach === 0 || stats.learn === 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Welcome back,</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            {profile?.full_name?.split(" ")[0] || "Friend"} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe2 className="h-4 w-4" /> {stats.community.toLocaleString()} swappers on SkillSwap
        </div>
      </div>

      {needsSetup && (
        <div className="rounded-3xl gradient-hero p-6 md:p-8 text-primary-foreground shadow-glow flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-bold mb-1">Complete your profile</h2>
            <p className="opacity-90 text-sm">
              {!profile?.avatar_url && "Add a photo. "}
              {stats.teach === 0 && "Add at least one skill you teach. "}
              {stats.learn === 0 && "Add one skill you want to learn."}
            </p>
          </div>
          <Button asChild className="rounded-full bg-background text-foreground hover:bg-background/90 shrink-0">
            <Link to="/app/profile">Set up now <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Coins} label="Skill Credits" value={profile?.credits ?? 0} accent />
        <StatCard icon={Star} label="Trust Score" value={profile ? `${profile.trust_score} / 5` : "—"} sub={`${profile?.ratings_count ?? 0} ratings`} />
        <StatCard icon={Sparkles} label="Active Swaps" value={stats.accepted} />
        <StatCard icon={Award} label="Certificates" value={stats.certs} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard to="/app/matches" icon={Sparkles} title="Find matches" desc="Partners who fit your skills." />
        <ActionCard to="/app/discover" icon={Users} title="Discover" desc="Browse the community." />
        <ActionCard to="/app/exchanges" icon={Repeat} title="My swaps" desc="Track every exchange." />
        <ActionCard to="/app/chats" icon={MessageCircle} title={stats.pendingIn ? `${stats.pendingIn} new` : "Chats"} desc={stats.pendingIn ? "Requests waiting." : "Your conversations."} badge={stats.pendingIn > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-3xl border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-bold flex items-center gap-2"><Flame className="h-5 w-5 text-accent" />Your activity</h2>
            <Link to="/app/exchanges" className="text-xs font-semibold text-primary hover:underline">View all →</Link>
          </div>
          {activity.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Nothing yet — <Link to="/app/matches" className="text-primary font-semibold hover:underline">find a match</Link> to start your first swap.
            </div>
          ) : (
            <ul className="space-y-4">
              {activity.map((a, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <div className="h-9 w-9 rounded-full gradient-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">{a.target[0]?.toUpperCase() || "S"}</div>
                  <div className="flex-1 min-w-0">
                    <div><span className="text-muted-foreground">{a.action}</span> <span className="font-semibold">{a.target}</span></div>
                    {a.skill && <div className="text-xs text-primary mt-0.5">{a.skill}</div>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl gradient-accent text-accent-foreground p-6 shadow-glow">
          <Trophy className="h-8 w-8 mb-3" />
          <h2 className="font-display text-xl font-bold mb-2">Climb the ranks</h2>
          <p className="text-sm opacity-90 mb-4">Top swappers earn featured badges & priority matching.</p>
          <Button asChild variant="secondary" className="rounded-full">
            <Link to="/app/leaderboard">View leaderboard <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </section>
      </div>

      {(stats.learn === 0 || stats.teach === 0) && (
        <LearnFree onAdded={() => setRefreshKey((k) => k + 1)} />
      )}

      <section>
        <h2 className="font-display text-xl font-bold mb-4">Tips for great swaps</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {TIPS.map((t, i) => (
            <div key={i} className="rounded-3xl border bg-card p-5 shadow-soft">
              <div className="text-3xl mb-2">{t.emoji}</div>
              <div className="font-display font-bold mb-1">{t.title}</div>
              <div className="text-sm text-muted-foreground">{t.body}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, accent }: any) => (
  <div className={`rounded-3xl border p-6 shadow-soft ${accent ? "gradient-accent text-accent-foreground border-0" : "bg-card"}`}>
    <Icon className="h-6 w-6 mb-3 opacity-80" />
    <div className={`text-xs uppercase tracking-wider font-semibold ${accent ? "opacity-80" : "text-muted-foreground"}`}>{label}</div>
    <div className="font-display text-3xl font-bold mt-1">{value}</div>
    {sub && <div className={`text-xs mt-1 ${accent ? "opacity-80" : "text-muted-foreground"}`}>{sub}</div>}
  </div>
);

const ActionCard = ({ to, icon: Icon, title, desc, badge }: any) => (
  <Link to={to} className="rounded-3xl border bg-card p-5 shadow-soft hover:shadow-card transition-smooth flex flex-col gap-3 group">
    <div className="h-11 w-11 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center relative">
      <Icon className="h-5 w-5" />
      {badge && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent ring-2 ring-card animate-pulse" />}
    </div>
    <div>
      <div className="font-display font-bold">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </div>
    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-smooth mt-auto self-end" />
  </Link>
);

export default Home;
