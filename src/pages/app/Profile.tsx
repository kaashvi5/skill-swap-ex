import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { Camera, Plus, Trash2, FileCheck, Upload, Star, Coins } from "lucide-react";

type Level = "beginner" | "intermediate" | "expert";
interface SkillTeach { id: string; skill: string; level: Level; description: string | null; proof_url: string | null; }
interface SkillLearn { id: string; skill: string; level: Level; }

const Profile = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const isOnboarding = params.get("onboarding") === "1";

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [trust, setTrust] = useState(0);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [teach, setTeach] = useState<SkillTeach[]>([]);
  const [learn, setLearn] = useState<SkillLearn[]>([]);
  const [newTeach, setNewTeach] = useState({ skill: "", level: "beginner" as Level, description: "" });
  const [newLearn, setNewLearn] = useState({ skill: "", level: "beginner" as Level });
  const proofInput = useRef<HTMLInputElement>(null);
  const [pendingProof, setPendingProof] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (p) {
        setFullName(p.full_name || "");
        setBio(p.bio || "");
        setCountry(p.country || "");
        setCity(p.city || "");
        setAvatarUrl(p.avatar_url);
        setCredits(p.credits);
        setTrust(Number(p.trust_score));
      }
      const { data: t } = await supabase.from("skills_teach").select("*").eq("user_id", user.id).order("created_at");
      const { data: l } = await supabase.from("skills_learn").select("*").eq("user_id", user.id).order("created_at");
      setTeach((t as SkillTeach[]) || []);
      setLearn((l as SkillLearn[]) || []);
    })();
  }, [user]);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    setAvatarUrl(publicUrl);
    setUploading(false);
    toast.success("Photo updated");
  };

  const saveProfile = async () => {
    if (!user) return;
    if (fullName.trim().length < 2) { toast.error("Name is required"); return; }
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName.trim(),
      bio: bio.trim() || null,
      country: country.trim() || null,
      city: city.trim() || null,
    }).eq("user_id", user.id);
    setSavingProfile(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  const addTeach = async () => {
    if (!user) return;
    if (!newTeach.skill.trim()) { toast.error("Enter a skill"); return; }
    let proofUrl: string | null = null;
    if (pendingProof) {
      const ext = pendingProof.name.split(".").pop();
      const path = `${user.id}/proof-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("skill-proofs").upload(path, pendingProof);
      if (error) { toast.error(error.message); return; }
      const { data: { publicUrl } } = supabase.storage.from("skill-proofs").getPublicUrl(path);
      proofUrl = publicUrl;
    }
    const { data, error } = await supabase.from("skills_teach").insert({
      user_id: user.id,
      skill: newTeach.skill.trim(),
      level: newTeach.level,
      description: newTeach.description.trim() || null,
      proof_url: proofUrl,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setTeach([...teach, data as SkillTeach]);
    setNewTeach({ skill: "", level: "beginner", description: "" });
    setPendingProof(null);
    if (proofInput.current) proofInput.current.value = "";
    toast.success("Skill added");
  };

  const removeTeach = async (id: string) => {
    await supabase.from("skills_teach").delete().eq("id", id);
    setTeach(teach.filter((s) => s.id !== id));
  };

  const addLearn = async () => {
    if (!user) return;
    if (!newLearn.skill.trim()) { toast.error("Enter a skill"); return; }
    const { data, error } = await supabase.from("skills_learn").insert({
      user_id: user.id, skill: newLearn.skill.trim(), level: newLearn.level,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setLearn([...learn, data as SkillLearn]);
    setNewLearn({ skill: "", level: "beginner" });
    toast.success("Added to learning list");
  };

  const removeLearn = async (id: string) => {
    await supabase.from("skills_learn").delete().eq("id", id);
    setLearn(learn.filter((s) => s.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {isOnboarding && (
        <div className="rounded-2xl gradient-hero p-5 text-primary-foreground shadow-glow">
          <h2 className="font-display text-lg font-bold">Welcome! Let's set up your profile.</h2>
          <p className="text-sm opacity-90">Add a photo and at least one skill to start swapping.</p>
        </div>
      )}

      <section className="rounded-3xl border bg-card p-6 md:p-8 shadow-soft">
        <h2 className="font-display text-2xl font-bold mb-6">Your profile</h2>
        <div className="flex items-start gap-6 mb-6 flex-wrap">
          <div className="relative">
            <div className="h-28 w-28 rounded-full overflow-hidden bg-secondary border-4 border-card shadow-card flex items-center justify-center">
              {avatarUrl ? <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" /> : <Camera className="h-8 w-8 text-muted-foreground" />}
            </div>
            <button onClick={() => fileInput.current?.click()} disabled={uploading} className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-glow hover:scale-105 transition-smooth">
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileInput} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Coins className="h-3.5 w-3.5" /> Credits</div>
              <div className="font-display text-2xl font-bold">{credits}</div>
            </div>
            <div className="rounded-2xl border px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Star className="h-3.5 w-3.5" /> Trust</div>
              <div className="font-display text-2xl font-bold">{trust}</div>
            </div>
          </div>
        </div>
        {!avatarUrl && <p className="text-sm text-destructive mb-4">⚠️ Profile photo is required to swap skills.</p>}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2"><Label>Full name *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder="Tell others about you..." rows={3} /></div>
          <div className="space-y-2"><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} placeholder="India" /></div>
          <div className="space-y-2"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} placeholder="Mumbai" /></div>
        </div>
        <Button onClick={saveProfile} disabled={savingProfile} className="mt-6 rounded-full gradient-primary text-primary-foreground border-0">
          {savingProfile ? "Saving..." : "Save profile"}
        </Button>
      </section>

      <section className="rounded-3xl border bg-card p-6 md:p-8 shadow-soft">
        <h2 className="font-display text-2xl font-bold mb-1">Skills I can teach</h2>
        <p className="text-sm text-muted-foreground mb-5">Upload proof so learners can trust your expertise.</p>
        <div className="space-y-3 mb-6">
          {teach.map((s) => (
            <div key={s.id} className="rounded-2xl border p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold">{s.skill}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{s.level}</span>
                  {s.proof_url && <a href={s.proof_url} target="_blank" rel="noreferrer" className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success flex items-center gap-1"><FileCheck className="h-3 w-3" />Verified proof</a>}
                </div>
                {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeTeach(s.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {teach.length === 0 && <p className="text-sm text-muted-foreground">No teaching skills yet.</p>}
        </div>
        <div className="rounded-2xl bg-secondary p-4 space-y-3">
          <div className="grid sm:grid-cols-[1fr_auto] gap-3">
            <Input placeholder="Skill (e.g. Guitar, Python)" value={newTeach.skill} onChange={(e) => setNewTeach({ ...newTeach, skill: e.target.value })} maxLength={60} />
            <Select value={newTeach.level} onValueChange={(v) => setNewTeach({ ...newTeach, level: v as Level })}>
              <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea placeholder="What can learners expect? (optional)" value={newTeach.description} onChange={(e) => setNewTeach({ ...newTeach, description: e.target.value })} maxLength={300} rows={2} />
          <div className="flex flex-wrap items-center gap-3">
            <input ref={proofInput} type="file" accept="image/*,.pdf" onChange={(e) => setPendingProof(e.target.files?.[0] || null)} className="hidden" />
            <Button type="button" variant="outline" size="sm" onClick={() => proofInput.current?.click()} className="rounded-full">
              <Upload className="h-4 w-4 mr-1" />{pendingProof ? pendingProof.name.slice(0, 24) : "Add proof (image/PDF)"}
            </Button>
            <Button onClick={addTeach} className="rounded-full gradient-primary text-primary-foreground border-0 ml-auto">
              <Plus className="h-4 w-4 mr-1" />Add skill
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6 md:p-8 shadow-soft">
        <h2 className="font-display text-2xl font-bold mb-5">Skills I want to learn</h2>
        <div className="space-y-3 mb-6">
          {learn.map((s) => (
            <div key={s.id} className="rounded-2xl border p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold">{s.skill}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent capitalize">{s.level}</span>
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeLearn(s.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {learn.length === 0 && <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
        </div>
        <div className="rounded-2xl bg-secondary p-4 grid sm:grid-cols-[1fr_auto_auto] gap-3">
          <Input placeholder="Skill you want to learn" value={newLearn.skill} onChange={(e) => setNewLearn({ ...newLearn, skill: e.target.value })} maxLength={60} />
          <Select value={newLearn.level} onValueChange={(v) => setNewLearn({ ...newLearn, level: v as Level })}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addLearn} className="rounded-full gradient-accent text-accent-foreground border-0">
            <Plus className="h-4 w-4 mr-1" />Add
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Profile;
