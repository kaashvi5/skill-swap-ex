import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, Download, Eye, Share2, BadgeCheck, ShieldCheck, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CertificateData, certificateBlob, downloadCertificate } from "@/lib/certificate";

const Certificates = () => {
  const { user } = useAuth();
  const [certs, setCerts] = useState<CertificateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<CertificateData | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("certificates")
        .select("*")
        .eq("learner_id", user.id)
        .order("issued_at", { ascending: false });
      const teacherIds = Array.from(new Set((data || []).map((c) => c.teacher_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,full_name")
        .in("user_id", [...teacherIds, user.id]);
      const me = profs?.find((p) => p.user_id === user.id);
      setCerts(
        (data || []).map((c) => ({
          id: c.id,
          skill: c.skill,
          issued_at: c.issued_at,
          teacherName: profs?.find((p) => p.user_id === c.teacher_id)?.full_name || "Teacher",
          learnerName: me?.full_name || "Learner",
          verifyCode: c.verify_code,
          certHash: c.cert_hash,
        }))
      );
      setLoading(false);
    })();
  }, [user]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "Code copied", description: "Anyone can check it on the verification page." });
    } catch {
      toast({ title: code, description: "Copy this code to verify the certificate." });
    }
  };

  const share = async (c: CertificateData) => {
    try {
      const file = new File([certificateBlob(c)], `SkillSwap-${c.skill}.pdf`, { type: "application/pdf" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `My SkillSwap certificate in ${c.skill}` });
        return;
      }
      downloadCertificate(c);
      toast({ title: "Certificate saved", description: "Sharing isn't supported here, so we downloaded it instead." });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Your Certificates</h1>
        <p className="text-muted-foreground">
          Issued automatically when both people confirm a completed swap. Each one carries a tamper-proof code anyone can{" "}
          <Link to="/verify" target="_blank" className="text-primary font-semibold hover:underline">check here</Link>.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : certs.length === 0 ? (
        <div className="rounded-3xl border bg-card p-12 text-center">
          <Award className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No certificates yet — complete a swap to earn your first one.</p>
          <Button asChild className="rounded-full gradient-primary text-primary-foreground border-0">
            <Link to="/app/exchanges">View my swaps</Link>
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {certs.map((c) => (
            <div key={c.id} className="rounded-3xl border bg-card overflow-hidden shadow-soft hover:shadow-card transition-smooth">
              <CertificatePreview c={c} compact />
              {c.verifyCode && (
                <div className="px-5 pt-4 flex items-center justify-between gap-2 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 font-mono font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" />{c.verifyCode}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => copyCode(c.verifyCode!)} className="text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                      <Copy className="h-3.5 w-3.5" />Copy code
                    </button>
                    <Link to={`/verify?code=${c.verifyCode}`} target="_blank" className="text-primary font-semibold hover:underline">
                      Verify page
                    </Link>
                  </div>
                </div>
              )}
              <div className="p-5 flex flex-wrap gap-2">
                <Button onClick={() => downloadCertificate(c)} className="rounded-full gradient-primary text-primary-foreground border-0">
                  <Download className="h-4 w-4 mr-1" />Download PDF
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => setPreview(c)}>
                  <Eye className="h-4 w-4 mr-1" />Preview
                </Button>
                <Button variant="ghost" className="rounded-full" onClick={() => share(c)}>
                  <Share2 className="h-4 w-4 mr-1" />Share
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Certificate preview</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <CertificatePreview c={preview} />
              <Button
                onClick={() => downloadCertificate(preview)}
                className="rounded-full w-full gradient-primary text-primary-foreground border-0"
              >
                <Download className="h-4 w-4 mr-1" />Download PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CertificatePreview = ({ c, compact }: { c: CertificateData; compact?: boolean }) => (
  <div className="relative bg-[hsl(210_40%_99%)] dark:bg-[hsl(222_47%_13%)] border-y">
    <div className="h-1.5 gradient-hero" />
    <div className={`m-3 rounded-2xl border-2 border-primary/40 ${compact ? "p-5" : "p-8"} text-center relative`}>
      <div className="absolute inset-1.5 rounded-xl border border-accent/40 pointer-events-none" />
      <div className="text-[10px] tracking-[0.35em] font-bold text-accent mb-2">SKILLSWAP</div>
      <div className={`font-display font-bold text-foreground ${compact ? "text-xl" : "text-3xl"}`}>
        Certificate of Completion
      </div>
      <div className="text-xs text-muted-foreground mt-3">This certificate is proudly presented to</div>
      <div className={`font-display font-bold text-foreground mt-1 ${compact ? "text-2xl" : "text-4xl"}`}>
        {c.learnerName}
      </div>
      <div className="mx-auto mt-2 h-px w-40 bg-primary/50" />
      <div className="text-xs text-muted-foreground mt-3">for successfully learning the skill of</div>
      <div className={`font-bold text-primary tracking-wide ${compact ? "text-lg" : "text-2xl"}`}>
        {c.skill.toUpperCase()}
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <BadgeCheck className="h-4 w-4 text-accent" />
        Taught by <span className="font-semibold text-foreground">{c.teacherName}</span> ·{" "}
        {new Date(c.issued_at).toLocaleDateString()}
      </div>
    </div>
  </div>
);

export default Certificates;
