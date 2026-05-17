import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Application, ApplicationStatus } from "@/types";

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  REJECTED: "Rejected",
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  ACCEPTED: "Accepted",
};

const STATUS_COLORS: Record<ApplicationStatus, [number, number, number]> = {
  REJECTED: [239, 68, 68],
  WISHLIST: [156, 163, 175],
  APPLIED: [59, 130, 246],
  SCREENING: [234, 179, 8],
  INTERVIEW: [20, 184, 166],
  OFFER: [34, 197, 94],
  ACCEPTED: [168, 85, 247],
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Med",
  HIGH: "High",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSalary(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${min}-${max}`;
  if (min !== null) return `${min}+`;
  if (max !== null) return `≤${max}`;
  return "—";
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trim() + "…";
}

function todayFilename(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface PdfOptions {
  userName: string;
  applications: Application[];
}

export function generateApplicationsPdf({
  userName,
  applications,
}: PdfOptions): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  const today = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(17, 24, 39);
  doc.text("JobTracker Report", margin, 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`${userName} · Generated ${today}`, margin, 78);

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, 90, pageWidth - margin, 90);

  // ── Summary boxes ────────────────────────────────────────────────────────
  const total = applications.length;
  const active = applications.filter(
    (a) => !["REJECTED", "ACCEPTED", "WISHLIST"].includes(a.status)
  ).length;
  const interviews = applications.filter((a) => a.status === "INTERVIEW").length;
  const offers = applications.filter(
    (a) => a.status === "OFFER" || a.status === "ACCEPTED"
  ).length;
  const appliedOrBeyond = applications.filter(
    (a) => !["WISHLIST", "REJECTED"].includes(a.status)
  ).length;
  const movedPastApplied = applications.filter(
    (a) => !["WISHLIST", "REJECTED", "APPLIED"].includes(a.status)
  ).length;
  const responseRate =
    appliedOrBeyond > 0
      ? Math.round((movedPastApplied / appliedOrBeyond) * 100)
      : 0;

  const summaryBoxes = [
    { label: "TOTAL", value: String(total) },
    { label: "ACTIVE", value: String(active) },
    { label: "INTERVIEWS", value: String(interviews) },
    { label: "OFFERS", value: String(offers) },
    { label: "RESPONSE RATE", value: `${responseRate}%` },
  ];

  const boxWidth = (pageWidth - margin * 2) / 5;
  const boxY = 110;
  const boxHeight = 50;

  summaryBoxes.forEach((box, i) => {
    const x = margin + boxWidth * i;

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.rect(x, boxY, boxWidth - 4, boxHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text(box.value, x + 8, boxY + 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(box.label, x + 8, boxY + 38);
  });

  // ── Empty state ──────────────────────────────────────────────────────────
  if (applications.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text("No applications to display.", margin, 200);
    doc.save(`jobtracker-report-${todayFilename()}.pdf`);
    return;
  }

  // ── Table ────────────────────────────────────────────────────────────────
  const sorted = [...applications].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
  );

  const tableRows = sorted.map((app) => [
    app.company,
    app.role,
    STATUS_LABELS[app.status],
    formatSalary(app.salaryMin, app.salaryMax),
    new Date(app.appliedAt).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    }),
    PRIORITY_LABELS[app.priority] ?? app.priority,
    truncate(app.notes ?? "", 60),
  ]);

  autoTable(doc, {
    startY: 194,
    head: [["Company", "Role", "Status", "Salary (LPA)", "Applied", "Pri.", "Notes"]],
    body: tableRows,
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 6,
      textColor: [55, 65, 81] as [number, number, number],
      lineColor: [229, 231, 235] as [number, number, number],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [243, 244, 246] as [number, number, number],
      textColor: [55, 65, 81] as [number, number, number],
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250] as [number, number, number],
    },
    columnStyles: {
      0: { cellWidth: 75 },
      1: { cellWidth: 75 },
      2: { cellWidth: 55 },
      3: { cellWidth: 60 },
      4: { cellWidth: 50 },
      5: { cellWidth: 30 },
      6: { cellWidth: "auto" },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 2) {
        const app = sorted[hookData.row.index];
        const color = STATUS_COLORS[app.status];
        if (color) {
          hookData.cell.styles.fillColor = color;
          hookData.cell.styles.textColor = [255, 255, 255];
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
    didDrawPage: (hookData) => {
      const pageCount = doc.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Page ${hookData.pageNumber} of ${pageCount}`,
        pageWidth - margin,
        pageHeight - 20,
        { align: "right" }
      );
      doc.text("JobTracker", margin, pageHeight - 20);
    },
    margin: { top: 40, left: margin, right: margin, bottom: 40 },
  });

  doc.save(`jobtracker-report-${todayFilename()}.pdf`);
}
