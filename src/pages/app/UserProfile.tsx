import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Star, FileCheck, Send } from "lucide-react";
import ProfileActivity from "@/components/ProfileActivity";
import { SwapRequestDialog, SwapTarget } from "@/components/SwapRequestDialog";

interface P {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  trust_score: number;
  ratings_count: number;
}

const UserProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState<P | null>(null);
  const [teach, setTeach] = useState<{ skill: string; level: string; proof_url: string | null; description: string | null }[]>([]);
  const [learn, setLearn] = useState<{ skill: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<SwapTarget | null>(null);
  const [myTeach, setMyTeach] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const [{ data: prof }, { data: t }, { data: l }] = await Promise.all([
        supabase.from("profiles").select("user_id,full_name,avatar_url,bio,city,country,trust_score,ratings_count").eq("user_id", userId).maybeSingle(),
        supabase.from("skills_teach").select("skill,level,proof_url,description").eq("user_id", userId),
        supabase.from("skills_learn").select("skill").eq("user_id", userId),
      ]);
      setP(prof ? ({ ...prof, trust_score: Number(prof.trust_score) } as P) : null);
      setTeach(t || []);
      setLearn(l || []);
      setLoading(false);
    })();
  }, [userId]);

  useEffect(() => {
    if (!user) return;
    supabase.from("skills_teach").select("skill").eq("user_id", user.id).then(({ data }) => setMyTeach((data || []).map((x) => x.skill)));
  }, [user]);

  if (loading) return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  if (!p) return <div className="text-center py-20 text-muted-foreground">This member doesn't exist.</div>;

  const isMe = user?.id === p.user_id;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/app/discover" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Discover
      </Link>

      <section className="rounded-3xl border bg-card p-6 md:p-8 shadow-soft">
        <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt={`${p.full_name}'s profile photo`} className="h-24 w-24 rounded-3xl object-cover" loading="lazy" />
          ) : (
            <div className="h-24 w-24 rounded-3xl gradient-primary text-primary-foreground flex items-center justify-center font-display text-3xl font-bold">
              {p.full_name[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl font-bold tracking-tight">{p.full_name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
              {(p.city || p.country) && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{[p.city, p.country].filter(Boolean).join(", ")}</span>
              )}
              <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 text-accent" />{p.trust_score} · {p.ratings_count} ratings</span>
            </div>
            {p.bio && <p className="text-sm mt-3 text-muted-foreground">{p.bio}</p>}
          </div>
          {!isMe && (
            <Button
              className="rounded-full gradient-primary text-primary-foreground border-0 shrink-0"
              onClick={() => setTarget({ user_id: p.user_id, full_name: p.full_name, teach: teach.map((t) => ({ skill: t.skill })) } as SwapTarget)}
            >
              <Send className="h-4 w-4 mr-1" />Request a swap
            </Button>
          )}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-3xl border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-bold mb-3">Teaches</h2>
          {teach.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing listed yet.</p>
          ) : (
            <ul className="space-y-3">
              {teach.map((t, i) => (
                <li key={i} className="rounded-2xl bg-secondary p-3">
                  <div className="flex items-center gap-2 font-semibold">
                    {t.skill}
                    <span className="text-xs font-normal text-muted-foreground capitalize">· {t.level}</span>
                    {t.proof_url && <FileCheck className="h-4 w-4 text-success" aria-label="Proof uploaded" />}
                  </div>
                  {t.description && <div className="text-xs text-muted-foreground mt-1">{t.description}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-bold mb-3">Wants to learn</h2>
          {learn.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing listed yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {learn.map((l, i) => (
                <span key={i} className="rounded-full bg-accent/10 text-accent px-3 py-1 text-sm font-semibold">{l.skill}</span>
              ))}
            </div>
          )}
        </section>
      </div>

      <ProfileActivity userId={p.user_id} title={isMe ? "Your activity" : `${p.full_name.split(" ")[0]}'s activity`} />

      <SwapRequestDialog target={target} onClose={() => setTarget(null)} currentUserId={user?.id} myTeachSkills={myTeach} />
    </div>
  );
};

export default UserProfile;
