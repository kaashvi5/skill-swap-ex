import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Award, Download } from "lucide-react";
import jsPDF from "jspdf";
import { DEMO_CERTS } from "@/lib/demoData";

interface Cert {
  id: string;
  skill: string;
  issued_at: string;
  teacher: { full_name: string };
  learner: { full_name: string };
}

const Certificates = () => {
  const { user } = useAuth();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("certificates")
        .select("*")
        .eq("learner_id", user.id)
        .order("issued_at", { ascending: false });
      const teacherIds = Array.from(new Set((data || []).map((c: any) => c.teacher_id)));
      const { data: profs } = await supabase.from("profiles").select("user_id,full_name").in("user_id", [...teacherIds, user.id]);
      const me = profs?.find((p: any) => p.user_id === user.id);
      const mapped: Cert[] = (data || []).map((c: any) => ({
        id: c.id,
        skill: c.skill,
        issued_at: c.issued_at,
        teacher: { full_name: profs?.find((p: any) => p.user_id === c.teacher_id)?.full_name || "Teacher" },
        learner: { full_name: me?.full_name || "Learner" },
      }));
      const learnerName = me?.full_name || "Learner";
      const demoMapped: Cert[] = DEMO_CERTS.map((d) => ({
        id: d.id, skill: d.skill, issued_at: d.issued_at,
        teacher: { full_name: d.teacher }, learner: { full_name: learnerName },
      }));
      setCerts([...mapped, ...demoMapped]);
      setLoading(false);
    })();
  }, [user]);

  const download = (c: Cert) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    // Background
    doc.setFillColor(248, 250, 255);
    doc.rect(0, 0, w, h, "F");
    // Border
    doc.setDrawColor(33, 110, 235);
    doc.setLineWidth(6);
    doc.rect(24, 24, w - 48, h - 48);
    doc.setLineWidth(1);
    doc.setDrawColor(245, 130, 32);
    doc.rect(36, 36, w - 72, h - 72);
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(245, 130, 32);
    doc.text("SKILLSWAP", w / 2, 90, { align: "center" });
    doc.setFontSize(36);
    doc.setTextColor(20, 30, 60);
    doc.text("Certificate of Completion", w / 2, 140, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(110, 120, 140);
    doc.text("This certificate is proudly presented to", w / 2, 180, { align: "center" });
    // Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(34);
    doc.setTextColor(20, 30, 60);
    doc.text(c.learner.full_name, w / 2, 230, { align: "center" });
    // Skill
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(110, 120, 140);
    doc.text("for successfully learning the skill of", w / 2, 270, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(33, 110, 235);
    doc.text(c.skill, w / 2, 315, { align: "center" });
    // Teacher
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(110, 120, 140);
    doc.text(`Taught by ${c.teacher.full_name}`, w / 2, 350, { align: "center" });
    // Footer
    const date = new Date(c.issued_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    doc.setFontSize(11);
    doc.text(`Issued on ${date}`, w / 2, h - 90, { align: "center" });
    doc.setFontSize(9);
    doc.setTextColor(160, 170, 190);
    doc.text(`Certificate ID: ${c.id}`, w / 2, h - 70, { align: "center" });
    doc.save(`SkillSwap-${c.skill.replace(/\s+/g, "-")}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Your Certificates</h1>
        <p className="text-muted-foreground">Proof of every skill you've learned through SkillSwap.</p>
      </div>
      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {certs.map((c) => (
            <div key={c.id} className="rounded-3xl border bg-card p-6 shadow-soft hover:shadow-card transition-smooth">
              <div className="h-12 w-12 rounded-2xl gradient-accent text-accent-foreground flex items-center justify-center mb-4">
                <Award className="h-6 w-6" />
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Skill mastered</div>
              <div className="font-display text-2xl font-bold mb-1">{c.skill}</div>
              <div className="text-sm text-muted-foreground mb-4">Taught by <span className="font-semibold text-foreground">{c.teacher.full_name}</span> · {new Date(c.issued_at).toLocaleDateString()}</div>
              <Button onClick={() => download(c)} className="rounded-full gradient-primary text-primary-foreground border-0">
                <Download className="h-4 w-4 mr-1" />Download PDF
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Certificates;
