import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BadgeCheck, ShieldX, Link2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Result {
  valid: boolean;
  skill: string;
  learner_name: string | null;
  teacher_name: string | null;
  issued_at: string;
  cert_hash: string;
  prev_hash: string;
  chain_index: number;
}

const VerifyCertificate = () => {
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState(params.get("code") || "");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result | null | "none">(null);

  const check = async (value: string) => {
    if (!value.trim()) return;
    setChecking(true);
    const { data } = await supabase.rpc("verify_certificate", { _code: value.trim() });
    const row = (data as Result[] | null)?.[0];
    setResult(row ?? "none");
    setChecking(false);
  };

  useEffect(() => {
    const c = params.get("code");
    if (c) check(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="w-full max-w-xl">
          <div className="bg-card rounded-3xl border shadow-card p-8">
            <h1 className="font-display text-3xl font-bold mb-2">Verify a certificate</h1>
            <p className="text-muted-foreground mb-6">
              Every SkillSwap certificate is written into a linked, tamper-evident ledger. Enter the code printed on the
              certificate to check it is genuine.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setParams({ code: code.trim() });
                check(code);
              }}
              className="flex flex-col sm:flex-row gap-3 items-end"
            >
              <div className="flex-1 w-full space-y-2">
                <Label htmlFor="code">Verification code</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SS-1A2B-3C4D-5E6F" maxLength={80} />
              </div>
              <Button type="submit" disabled={checking} className="rounded-full h-11 px-6 gradient-primary text-primary-foreground border-0">
                {checking ? "Checking…" : "Verify"}
              </Button>
            </form>

            {result === "none" && (
              <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-5 flex gap-3">
                <ShieldX className="h-6 w-6 text-destructive shrink-0" />
                <div>
                  <div className="font-semibold">No certificate found</div>
                  <div className="text-sm text-muted-foreground">Check the code and try again — it looks like SS-1A2B-3C4D-5E6F.</div>
                </div>
              </div>
            )}

            {result && result !== "none" && (
              <div className="mt-6 rounded-2xl border border-success/40 bg-success/5 p-5 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-success">
                  <BadgeCheck className="h-5 w-5" /> Genuine certificate
                </div>
                <dl className="text-sm grid sm:grid-cols-2 gap-x-6 gap-y-2">
                  <div><dt className="text-muted-foreground">Skill</dt><dd className="font-semibold">{result.skill}</dd></div>
                  <div><dt className="text-muted-foreground">Issued to</dt><dd className="font-semibold">{result.learner_name || "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Taught by</dt><dd className="font-semibold">{result.teacher_name || "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Date</dt><dd className="font-semibold">{new Date(result.issued_at).toLocaleDateString()}</dd></div>
                </dl>
                <div className="pt-2 border-t text-xs text-muted-foreground space-y-1 break-all">
                  <div className="flex items-center gap-1 font-semibold text-foreground"><Link2 className="h-3.5 w-3.5" />Ledger record #{result.chain_index}</div>
                  <div>hash: <span className="font-mono">{result.cert_hash}</span></div>
                  <div>previous: <span className="font-mono">{result.prev_hash}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyCertificate;
