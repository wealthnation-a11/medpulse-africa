import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { computeTrendInsights, type BiomarkerReading } from "./trendAnalysis";

export interface PdfPatient {
  identifier: string;
  name: string;
  age: number;
  sex: string;
}

export interface PdfScreening {
  id: string;
  screening_type: string;
  status: string;
  imaging_findings?: string;
  clinical_notes?: string;
  created_at: string;
}

export interface PdfRisk {
  screening_id: string;
  disease_name: string;
  risk_percentage: number;
  confidence: number;
  time_horizon: string;
  recommended_actions: string[];
}

export interface PdfValidation {
  screening_id: string;
  validation_status: string;
  corrected_risk_level: string | null;
  doctor_notes: string;
  signed_off_at: string | null;
}

export interface PdfReportInput {
  patient: PdfPatient;
  screenings: PdfScreening[];
  risks: PdfRisk[];
  biomarkers: BiomarkerReading[];
  validations: PdfValidation[];
  generatedBy?: string;
}

const PRIMARY: [number, number, number] = [13, 78, 73];
const ACCENT: [number, number, number] = [217, 119, 6];
const HIGH: [number, number, number] = [185, 28, 28];
const MED: [number, number, number] = [202, 138, 4];
const LOW: [number, number, number] = [22, 101, 52];
const MUTED: [number, number, number] = [100, 116, 139];

function riskColor(p: number): [number, number, number] {
  if (p >= 60) return HIGH;
  if (p >= 30) return MED;
  return LOW;
}

export async function generatePatientPdfReport(input: PdfReportInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 0;

  // ===== Header band =====
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("MedPulse Africa", 40, 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Early Disease Detection Report", 40, 52);
  doc.setFontSize(8);
  doc.text(`Generated ${format(new Date(), "PPpp")}`, 40, 66);
  if (input.generatedBy) {
    doc.text(`Clinician: ${input.generatedBy}`, W - 40, 66, { align: "right" });
  }

  y = 110;
  doc.setTextColor(20, 20, 20);

  // ===== Patient block =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(input.patient.name || input.patient.identifier || "Anonymous patient", 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const meta = [
    input.patient.identifier && `MRN: ${input.patient.identifier}`,
    `${input.patient.age} yrs`,
    input.patient.sex,
    `${input.screenings.length} screenings on file`,
  ].filter(Boolean).join("  •  ");
  doc.text(meta, 40, y);
  y += 22;
  doc.setTextColor(20, 20, 20);

  // ===== Executive summary =====
  const topRisk = [...input.risks].sort((a, b) => b.risk_percentage - a.risk_percentage)[0];
  const insights = computeTrendInsights(input.biomarkers);
  const actionable = insights.filter((i) => i.severity === "critical" || i.severity === "concerning");

  doc.setFillColor(245, 247, 246);
  doc.roundedRect(40, y, W - 80, 70, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Executive Summary", 52, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let sy = y + 34;
  if (topRisk) {
    const c = riskColor(topRisk.risk_percentage);
    doc.setTextColor(...c);
    doc.setFont("helvetica", "bold");
    doc.text(`Highest predicted risk: ${topRisk.disease_name} — ${Math.round(topRisk.risk_percentage)}%`, 52, sy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    sy += 12;
  }
  doc.text(`Trend insights detected: ${insights.length} biomarker trajectories (${actionable.length} actionable).`, 52, sy);
  sy += 12;
  const signedCount = input.validations.filter((v) => v.signed_off_at).length;
  doc.text(`Doctor sign-offs: ${signedCount}/${input.screenings.length} screenings reviewed.`, 52, sy);
  y += 86;

  // ===== Disease risks table =====
  if (input.risks.length > 0) {
    addSectionHeader(doc, "Disease Risk Assessments", y);
    y += 24;
    autoTable(doc, {
      startY: y,
      head: [["Disease", "Risk %", "Confidence", "Time horizon", "Top recommendation"]],
      body: input.risks
        .sort((a, b) => b.risk_percentage - a.risk_percentage)
        .map((r) => [
          r.disease_name,
          `${Math.round(r.risk_percentage)}%`,
          `${Math.round(r.confidence * 100)}%`,
          r.time_horizon || "—",
          r.recommended_actions?.[0] || "—",
        ]),
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const pct = parseInt(String(data.cell.raw).replace("%", ""));
          data.cell.styles.textColor = riskColor(pct);
          data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 24;
  }

  // ===== Trend insights =====
  if (insights.length > 0) {
    if (y > H - 200) { doc.addPage(); y = 60; }
    addSectionHeader(doc, "Trend-Based Early Signals", y);
    y += 24;
    autoTable(doc, {
      startY: y,
      head: [["Biomarker", "Current", "12-mo projection", "Velocity / yr", "Severity", "Note"]],
      body: insights.map((i) => [
        i.label,
        `${i.currentValue} ${i.unit}`,
        `${i.projected12Mo.toFixed(1)} ${i.unit}`,
        `${i.slopePerYear >= 0 ? "+" : ""}${i.slopePerYear.toFixed(2)}`,
        i.severity.toUpperCase(),
        i.suggestedDisease || "—",
      ]),
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const sev = String(data.cell.raw).toLowerCase();
          if (sev === "critical") data.cell.styles.textColor = HIGH;
          else if (sev === "concerning") data.cell.styles.textColor = MED;
          else if (sev === "improving") data.cell.styles.textColor = LOW;
          data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 24;
  }

  // ===== Screenings list =====
  if (input.screenings.length > 0) {
    if (y > H - 160) { doc.addPage(); y = 60; }
    addSectionHeader(doc, "Screening History", y);
    y += 24;
    autoTable(doc, {
      startY: y,
      head: [["Date", "Type", "Status", "Imaging findings"]],
      body: input.screenings
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .map((s) => [
          format(new Date(s.created_at), "MMM dd, yyyy"),
          s.screening_type.replace("_", " "),
          s.status,
          (s.imaging_findings || "").slice(0, 80) + ((s.imaging_findings || "").length > 80 ? "…" : ""),
        ]),
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 24;
  }

  // ===== Doctor sign-offs =====
  if (input.validations.length > 0) {
    if (y > H - 160) { doc.addPage(); y = 60; }
    addSectionHeader(doc, "Clinical Sign-Offs", y);
    y += 24;
    autoTable(doc, {
      startY: y,
      head: [["Status", "Risk override", "Notes", "Signed"]],
      body: input.validations.map((v) => [
        v.validation_status,
        v.corrected_risk_level || "—",
        (v.doctor_notes || "").slice(0, 100) + ((v.doctor_notes || "").length > 100 ? "…" : ""),
        v.signed_off_at ? format(new Date(v.signed_off_at), "MMM dd, yyyy") : "Pending",
      ]),
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 24;
  }

  // ===== Footer disclaimer on every page =====
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(
      "AI-assisted analysis — not a clinical diagnosis. Confirm all findings with appropriate diagnostic workup.",
      40,
      H - 30,
    );
    doc.text(`Page ${p} of ${pageCount}`, W - 40, H - 30, { align: "right" });
  }

  return doc.output("blob");
}

function addSectionHeader(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(...PRIMARY);
  doc.rect(40, y, 4, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(title, 52, y + 11);
}

export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}