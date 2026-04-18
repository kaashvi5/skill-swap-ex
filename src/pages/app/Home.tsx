import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Coins, Star, Sparkles, ArrowRight, Users, MessageCircle } from "lucide-react";

interface Profile {
  full_name: string;
  avatar_url: string | null;
  credits: number;
  trust_score: number;
  ratings_count: number;
}

const Home = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ teach: 0, learn: 0, pendingIn: 0, accepted: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("full_name,avatar_url,credits,trust_score,ratings_count").eq("user_id", user.id).maybeSingle();
      setProfile(p as Profile | null);
      const [t, l, pi, ac] = await Promise.all([
        supabase.from("skills_teach").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("skills_learn").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("swap_requests").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("status", "pending"),
        supabase.from("swap_requests").select("id", { count: "exact", head: true }).or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).eq("status", "accepted"),
      ]);
      setStats({ teach: t.count || 0, learn: l.count || 0, pendingIn: pi.count || 0, accepted: ac.count || 0 });
    })();
  }, [user]);

  const needsSetup = profile && (!profile.avatar_url || stats.teach === 0);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <p className="text-muted-foreground text-sm">Welcome back,</p>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
          {profile?.full_name?.split(" ")[0] || "Friend"} 👋
        </h1>
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

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={Coins} label="Skill Credits" value={profile?.credits ?? 0} accent />
        <StatCard icon={Star} label="Trust Score" value={profile ? `${profile.trust_score} / 5` : "—"} sub={`${profile?.ratings_count ?? 0} ratings`} />
        <StatCard icon={Sparkles} label="Active Swaps" value={stats.accepted} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ActionCard to="/app/discover" icon={Users} title="Find your match" desc="Browse people teaching what you want to learn." />
        <ActionCard to="/app/chats" icon={MessageCircle} title={`${stats.pendingIn} new requests`} desc="Review swap requests waiting on you." badge={stats.pendingIn > 0} />
      </div>
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
  <Link to={to} className="rounded-3xl border bg-card p-6 shadow-soft hover:shadow-card transition-smooth flex items-center gap-4 group">
    <div className="h-12 w-12 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center shrink-0 relative">
      <Icon className="h-6 w-6" />
      {badge && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent ring-2 ring-card animate-pulse" />}
    </div>
    <div className="flex-1">
      <div className="font-display font-bold text-lg">{title}</div>
      <div className="text-sm text-muted-foreground">{desc}</div>
    </div>
    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-smooth" />
  </Link>
);

export default Home;
