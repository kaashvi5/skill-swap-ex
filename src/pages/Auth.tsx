import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { signupSchema, loginSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Check, X, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";

const passwordChecks = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "Uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "Number", test: (v: string) => /[0-9]/.test(v) },
  { label: "Special character", test: (v: string) => /[!@#$%^&*(),.?":{}|<>_\-+=\\[\]/~`';]/.test(v) },
];

const Auth = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse({ fullName, email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const redirectUrl = `${window.location.origin}/app`;
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { full_name: parsed.data.fullName },
          },
        });
        if (error) {
          if (error.message.toLowerCase().includes("registered")) {
            toast.error("This email is already registered. Please sign in.");
          } else toast.error(error.message);
          return;
        }
        toast.success("Account created! Let's set up your profile.");
        navigate("/app/profile?onboarding=1", { replace: true });
      } else {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          toast.error(error.message.includes("Invalid") ? "Invalid email or password." : error.message);
          return;
        }
        toast.success("Welcome back!");
        navigate("/app", { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen gradient-soft flex flex-col">
      <header className="container flex h-20 items-center">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="SkillSwap" className="h-10 w-10" width={40} height={40} />
          <span className="font-display text-2xl font-bold">Skill<span className="text-gradient">Swap</span></span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-3xl border shadow-card p-8 animate-fade-in">
            <h1 className="font-display text-3xl font-bold mb-2">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-muted-foreground mb-7">
              {mode === "signup" ? "Join the global skill exchange." : "Sign in to continue swapping."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required maxLength={80} />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required maxLength={255} autoComplete="email" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required maxLength={72} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && password.length > 0 && (
                <div className="rounded-xl bg-secondary p-3 space-y-1.5">
                  {passwordChecks.map((c) => {
                    const ok = c.test(password);
                    return (
                      <div key={c.label} className={`flex items-center gap-2 text-xs ${ok ? "text-success" : "text-muted-foreground"}`}>
                        {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        {c.label}
                      </div>
                    );
                  })}
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full h-12 rounded-full gradient-primary text-primary-foreground border-0 shadow-soft text-base font-semibold">
                {submitting ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Already have an account? " : "New here? "}
              <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="font-semibold text-primary hover:underline">
                {mode === "signup" ? "Sign in" : "Create one"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
