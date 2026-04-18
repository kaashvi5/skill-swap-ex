import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Coins, Star, Sparkles, ArrowRight, Users, MessageCircle, Trophy, Repeat, Award, Flame, Globe2 } from "lucide-react";
import { DEMO_ACTIVITY } from "@/lib/demoData";

interface Profile {
  full_name: string;
  avatar_url: string | null;
  credits: number;
  trust_score: number;
  ratings_count: number;
}

const TIPS = [
  { emoji: "🎯", title: "Pick one skill to master", body: "Focused weekly swaps beat scattered ones." },
  { emoji: "📸", title: "Upload proof", body: "Skills with proof get 4× more requests." },
  { emoji: "🌍", title: "Try cross-cultural swaps", body: "Learn a language while teaching design." },
];

const Home = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ teach: 0, learn: 0, pendingIn: 0, accepted: 0, certs: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("full_name,avatar_url,credits,trust_score,ratings_count").eq("user_id", user.id).maybeSingle();
      setProfile(p as Profile | null);
      const [t, l, pi, ac, ce] = await Promise.all([
        supabase.from("skills_teach").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("skills_learn").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("swap_requests").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("status", "pending"),
        supabase.from("swap_requests").select("id", { count: "exact", head: true }).or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).eq("status", "accepted"),
        supabase.from("certificates").select("id", { count: "exact", head: true }).eq("learner_id", user.id),
      ]);
      setStats({ teach: t.count || 0, learn: l.count || 0, pendingIn: pi.count || 0, accepted: ac.count || 0, certs: ce.count || 0 });
    })();
  }, [user]);

  const needsSetup = profile && (!profile.avatar_url || stats.teach === 0);

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
          <Globe2 className="h-4 w-4" /> 12,847 swappers online worldwide
        </div>
      </div>

      {needsSetup && (
        <div className="rounded-3xl gradient-hero p-6 md:p-8 text-primary-foreground shadow-glow flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-bold mb-1">Complete your profile</h2>
            <p className="opacity-90 text-sm">Add a photo and at least one skill to start matching.</p>
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
        <ActionCard to="/app/matches" icon={Sparkles} title="Find matches" desc="AI-picked swap partners." />
        <ActionCard to="/app/discover" icon={Users} title="Discover" desc="Browse global community." />
        <ActionCard to="/app/exchanges" icon={Repeat} title="My swaps" desc="Track every exchange." />
        <ActionCard to="/app/chats" icon={MessageCircle} title={`${stats.pendingIn || 4} new`} desc="Messages waiting." badge />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-3xl border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-bold flex items-center gap-2"><Flame className="h-5 w-5 text-accent" />Live activity</h2>
            <Link to="/app/exchanges" className="text-xs font-semibold text-primary hover:underline">View all →</Link>
          </div>
          <ul className="space-y-4">
            {DEMO_ACTIVITY.map((a, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <div className="h-9 w-9 rounded-full gradient-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">{a.who[0]}</div>
                <div className="flex-1 min-w-0">
                  <div><span className="font-semibold">{a.who}</span> <span className="text-muted-foreground">{a.action}</span> <span className="font-semibold">{a.target}</span></div>
                  {a.skill && <div className="text-xs text-primary mt-0.5">{a.skill}</div>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
              </li>
            ))}
          </ul>
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
