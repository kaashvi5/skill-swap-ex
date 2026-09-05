import jsPDF from "jspdf";

export interface CertificateData {
  id: string;
  skill: string;
  issued_at: string;
  learnerName: string;
  teacherName: string;
}

const NAVY: [number, number, number] = [17, 26, 51];
const BLUE: [number, number, number] = [33, 110, 235];
const ORANGE: [number, number, number] = [245, 130, 32];
const CREAM: [number, number, number] = [252, 251, 248];

const star = (doc: jsPDF, cx: number, cy: number, r: number) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r / 2.4;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  const rel = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]] as [number, number]);
  rel.push([pts[0][0] - pts[9][0], pts[0][1] - pts[9][1]]);
  doc.lines(rel, pts[0][0], pts[0][1], [1, 1], "F", true);
};

export const buildCertificatePdf = (c: CertificateData) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, w, h, "F");

  // Top and bottom accent bands
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, 14, "F");
  doc.rect(0, h - 14, w, 14, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(0, 14, w, 4, "F");
  doc.rect(0, h - 18, w, 4, "F");

  // Double frame
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(2.5);
  doc.rect(38, 42, w - 76, h - 84);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.8);
  doc.rect(48, 52, w - 96, h - 104);

  // Corner ornaments
  const corner = (x: number, y: number, sx: number, sy: number) => {
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(2);
    doc.line(x, y, x + 34 * sx, y);
    doc.line(x, y, x, y + 34 * sy);
  };
  corner(48, 52, 1, 1);
  corner(w - 48, 52, -1, 1);
  corner(48, h - 52, 1, -1);
  corner(w - 48, h - 52, -1, -1);

  // Brand
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...ORANGE);
  doc.text("S K I L L S W A P", w / 2, 92, { align: "center" });
  doc.setDrawColor(220, 226, 238);
  doc.setLineWidth(0.7);
  doc.line(w / 2 - 60, 102, w / 2 + 60, 102);

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(40);
  doc.setTextColor(...NAVY);
  doc.text("Certificate of Completion", w / 2, 146, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(120, 130, 150);
  doc.text("This certificate is proudly presented to", w / 2, 182, { align: "center" });

  // Learner name
  doc.setFont("times", "bolditalic");
  doc.setFontSize(38);
  doc.setTextColor(...NAVY);
  doc.text(c.learnerName, w / 2, 232, { align: "center" });
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(1.2);
  doc.line(w / 2 - 170, 246, w / 2 + 170, 246);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(120, 130, 150);
  doc.text("for successfully learning and demonstrating the skill of", w / 2, 276, { align: "center" });

  // Skill
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...BLUE);
  doc.text(c.skill.toUpperCase(), w / 2, 314, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(120, 130, 150);
  doc.text(
    "through a peer-to-peer skill exchange, verified by both members of the swap.",
    w / 2,
    340,
    { align: "center" }
  );

  // Seal
  const sx = w - 130;
  const sy = h - 150;
  doc.setFillColor(...ORANGE);
  doc.circle(sx, sy, 40, "F");
  doc.setFillColor(255, 196, 130);
  doc.circle(sx, sy, 32, "F");
  doc.setFillColor(...ORANGE);
  star(doc, sx, sy - 4, 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("VERIFIED", sx, sy + 22, { align: "center" });

  // Signature lines
  const date = new Date(c.issued_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const sig = (x: number, label: string, value: string) => {
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.8);
    doc.line(x - 90, h - 118, x + 90, h - 118);
    doc.setFont("times", "bolditalic");
    doc.setFontSize(16);
    doc.setTextColor(...NAVY);
    doc.text(value, x, h - 124, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(130, 140, 160);
    doc.text(label, x, h - 104, { align: "center" });
  };
  sig(160, "Mentor / Teacher", c.teacherName);
  sig(w / 2, "Date of issue", date);

  // Footer id
  doc.setFontSize(8.5);
  doc.setTextColor(160, 170, 190);
  doc.text(`Certificate ID: ${c.id}`, w / 2, h - 74, { align: "center" });
  doc.text("skillswap · trade skills, not money", w / 2, h - 62, { align: "center" });

  return doc;
};

export const downloadCertificate = (c: CertificateData) => {
  buildCertificatePdf(c).save(`SkillSwap-Certificate-${c.skill.replace(/\s+/g, "-")}.pdf`);
};

export const certificateBlob = (c: CertificateData) => buildCertificatePdf(c).output("blob");
