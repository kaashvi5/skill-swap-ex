import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { passwordSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setReady(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (password !== confirm) return toast.error("Passwords don't match.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated — you're signed in.");
    navigate("/app", { replace: true });
  };

  return (
    <div className="min-h-screen gradient-soft flex flex-col">
      <header className="container flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="SkillSwap" className="h-10 w-10" width={40} height={40} />
          <span className="font-display text-2xl font-bold">Skill<span className="text-gradient">Swap</span></span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md bg-card rounded-3xl border shadow-card p-8">
          <h1 className="font-display text-3xl font-bold mb-2">Set a new password</h1>
          {!ready ? (
            <p className="text-muted-foreground">
              Open this page from the reset link in your email, then you can choose a new password.
              <br />
              <Link to="/auth" className="text-primary font-semibold hover:underline">Back to sign in</Link>
            </p>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">Choose something you haven't used before.</p>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pw">New password</Label>
                  <div className="relative">
                    <Input id="pw" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={72} autoComplete="new-password" />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw2">Confirm password</Label>
                  <Input id="pw2" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required maxLength={72} autoComplete="new-password" />
                </div>
                <Button type="submit" disabled={saving} className="w-full h-12 rounded-full gradient-primary text-primary-foreground border-0 font-semibold">
                  {saving ? "Saving…" : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
