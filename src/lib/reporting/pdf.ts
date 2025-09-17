import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import type {
  ReportMetric,
  TrendPoint,
  NormalizedTicketStatus,
  NormalizedTicketType,
} from "@/lib/reporting/metrics";
import { reportingConfig } from "@/lib/reporting/config";
import { interRegularBase64, interSemiBoldBase64 } from "./fonts/inter";
import {
  montserratRegularBase64,
  montserratBoldBase64,
  robotoRegularBase64,
  robotoBoldBase64,
} from "./fonts/branding";

type PdfWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

type FontStyle = "normal" | "bold" | "italic" | "bolditalic";

type ScreenshotBundle = {
  trendChart?: string;
  ticketStatusChart?: string;
  ticketTypesChart?: string;
  heatmapChart?: string;
};

type TicketServiceSlice = {
  service: string;
  count: number;
  percentage: number;
  closedCount: number;
  openCount: number;
  inProgressCount: number;
  closedPercentage: number;
  pendingPercentage: number;
};

type TicketPerformanceSnapshot = {
  statuses: { status: string; label: string; count: number; percentage: number }[];
  services: TicketServiceSlice[];
};

type HeatmapCell = { day: string; hour: number; calls: number; avgDuration: number };

type CallPerformanceSnapshot = {
  total: number;
  answered: number;
  missed: number;
  answeredRate: number;
};

type EconomicSnapshot = {
  automationSavings?: number;
  humanSavings?: number;
  recoveredRevenue?: number;
  missedCallCost?: number;
  netImpact?: number;
  roi?: number | null;
};

interface GenerateReportPayload {
  clientName?: string;
  reportType: string;
  dateRange: { from: Date; to: Date };
  metrics: ReportMetric[];
  trend: TrendPoint[];
  statuses: NormalizedTicketStatus[];
  types: NormalizedTicketType[];
  insights: string[];
  ticketPerformance: TicketPerformanceSnapshot;
  heatmap: HeatmapCell[];
  callPerformance: CallPerformanceSnapshot | null;
  screenshots: ScreenshotBundle;
  economicImpact?: EconomicSnapshot;
}

interface ExecutiveSummaryPayload {
  clientName?: string;
  dateRange: { from: Date; to: Date };
  metrics: ReportMetric[];
  trend?: TrendPoint[];
  statuses?: NormalizedTicketStatus[];
  ticketTypes?: NormalizedTicketType[];
  ticketServices?: TicketServiceSlice[];
  insights?: string[];
  callPerformance?: CallPerformanceSnapshot | null;
  economicImpact?: EconomicSnapshot;
  priorities?: { title: string; impact: string; description: string }[];
  benchmarks?: { metric: string; percentile: number; cohort: string; message: string }[];
}

const COLORS = {
  pageBackground: [250, 250, 252] as [number, number, number],
  primaryText: [31, 41, 55] as [number, number, number],
  mutedText: [100, 116, 139] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  brandBlue: [37, 99, 235] as [number, number, number],
  brandOrange: [249, 115, 22] as [number, number, number],
  success: [16, 185, 129] as [number, number, number],
  warning: [245, 158, 11] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  neutral: [51, 65, 85] as [number, number, number],
};

const numberFormatter = new Intl.NumberFormat("ca-ES");
const percentFormatter = new Intl.NumberFormat("ca-ES", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const currencyFormatter = new Intl.NumberFormat("ca-ES", {
  style: "currency",
  currency: "EUR",
});
const dateFormatter = new Intl.DateTimeFormat("ca-ES");

const getAutoTableFinalY = (doc: jsPDF): number | undefined =>
  (doc as PdfWithAutoTable).lastAutoTable?.finalY;

const setFontSafe = (doc: jsPDF, name: string, style: FontStyle = "normal") => {
  const list = doc.getFontList() as Record<string, unknown>;
  if (list && Object.prototype.hasOwnProperty.call(list, name)) {
    try {
      doc.setFont(name, style);
      return;
    } catch {
      // fall back to default below
    }
  }
  doc.setFont("helvetica", style);
};

const ensureInterFonts = (doc: jsPDF) => {
  try {
    const list = doc.getFontList() as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(list, "Inter")) {
      if (interRegularBase64) {
        doc.addFileToVFS("Inter-Regular.ttf", interRegularBase64);
        doc.addFont("Inter-Regular.ttf", "Inter", "normal");
      }
      if (interSemiBoldBase64) {
        doc.addFileToVFS("Inter-SemiBold.ttf", interSemiBoldBase64);
        doc.addFont("Inter-SemiBold.ttf", "Inter", "bold");
      }
    }
  } catch {
    // ignore, fallback handled by setFontSafe
  }
  setFontSafe(doc, "Inter", "normal");
};

const ensureBrandFonts = (doc: jsPDF) => {
  try {
    const list = doc.getFontList() as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(list, "Roboto")) {
      if (robotoRegularBase64) {
        doc.addFileToVFS("Roboto-Regular.ttf", robotoRegularBase64);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      }
      if (robotoBoldBase64) {
        doc.addFileToVFS("Roboto-Bold.ttf", robotoBoldBase64);
        doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
      }
    }
    if (!Object.prototype.hasOwnProperty.call(list, "Montserrat")) {
      if (montserratRegularBase64) {
        doc.addFileToVFS("Montserrat-Regular.ttf", montserratRegularBase64);
        doc.addFont("Montserrat-Regular.ttf", "Montserrat", "normal");
      }
      if (montserratBoldBase64) {
        doc.addFileToVFS("Montserrat-Bold.ttf", montserratBoldBase64);
        doc.addFont("Montserrat-Bold.ttf", "Montserrat", "bold");
      }
    }
  } catch {
    // ignore
  }
};

const parseNumericValue = (value: string | number | null | undefined): number => {
  if (typeof value === "number") {
    return value;
  }
  if (!value) {
    return 0;
  }
  const normalized = value
    .toString()
    .trim()
    .replace(/[€%]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDurationToSeconds = (value: string | null | undefined): number => {
  if (!value) return 0;
  const trimmed = value.trim();
  if (/^\d+h/.test(trimmed)) {
    const hoursMatch = trimmed.match(/(\d+)h/);
    const minutesMatch = trimmed.match(/(\d+)m/);
    const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
    return hours * 3600 + minutes * 60;
  }
  const parts = trimmed.split(":");
  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    return minutes * 60 + seconds;
  }
  return parseNumericValue(trimmed);
};

const formatHours = (hours: number): string => {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "0 h";
  }
  return `${hours.toFixed(1)} h`;
};

const ensurePageSpace = (doc: jsPDF, currentY: number, needed: number): number => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + needed > pageHeight - 60) {
    doc.addPage();
    return 60;
  }
  return currentY;
};

const addScreenshotToPdf = async (
  doc: jsPDF,
  screenshotData: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  if (!screenshotData || !screenshotData.startsWith("data:image/")) {
    return false;
  }
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = screenshotData;
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 5000);
      img.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("error"));
      };
    });
    doc.addImage(img, "PNG", x, y, width, height);
    return true;
  } catch {
    return false;
  }
};

const drawKpiCard = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  value: string,
  accent: [number, number, number]
) => {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.8);
  doc.roundedRect(x, y, width, height, 6, 6, "FD");

  setFontSafe(doc, "Roboto", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.mutedText);
  doc.text(title, x + 12, y + 20);

  setFontSafe(doc, "Roboto", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...accent);
  doc.text(value, x + 12, y + height - 18);
};

const drawSmallKpiCard = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  title: string,
  value: string
) => {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, width, 64, 5, 5, "FD");

  setFontSafe(doc, "Roboto", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.mutedText);
  doc.text(title, x + 10, y + 18);

  setFontSafe(doc, "Roboto", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.neutral);
  doc.text(value, x + 10, y + 42);
};

const drawSimpleBarChart = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  data: { label: string; value: number }[],
  title: string
) => {
  if (data.length === 0) {
    setFontSafe(doc, "Roboto", "normal");
    doc.setFontSize(11);
    doc.text("No hi ha dades", x, y + 12);
    return;
  }

  const maxValue = Math.max(...data.map((item) => item.value));
  const barSpacing = width / data.length;
  const barWidth = barSpacing * 0.6;

  doc.setDrawColor(...COLORS.border);
  doc.rect(x, y, width, height);

  data.forEach((item, index) => {
    const barHeight = maxValue ? (item.value / maxValue) * (height - 20) : 0;
    const barX = x + index * barSpacing + (barSpacing - barWidth) / 2;
    const barY = y + height - barHeight - 20;

    doc.setFillColor(...COLORS.brandBlue);
    doc.rect(barX, barY, barWidth, barHeight, "F");

    setFontSafe(doc, "Roboto", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.mutedText);
    doc.text(item.label, barX + barWidth / 2, y + height - 6, { align: "center" });
  });

  setFontSafe(doc, "Roboto", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primaryText);
  doc.text(title, x + width / 2, y - 6, { align: "center" });
};

const drawComparisonBars = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  series: { label: string; value: number; color: [number, number, number] }[],
  title: string
) => {
  if (series.length === 0) {
    return;
  }
  const maxValue = Math.max(...series.map((item) => item.value));
  const barHeight = (height - (series.length - 1) * 10) / series.length;

  series.forEach((item, index) => {
    const barY = y + index * (barHeight + 10);
    const barWidth = maxValue ? (item.value / maxValue) * width : 0;

    doc.setFillColor(...item.color);
    doc.rect(x, barY, barWidth, barHeight, "F");

    setFontSafe(doc, "Roboto", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${item.label}: ${currencyFormatter.format(item.value)}`, x + 8, barY + barHeight / 2 + 3);
  });

  setFontSafe(doc, "Roboto", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primaryText);
  doc.text(title, x + width / 2, y - 8, { align: "center" });
};

const aggregateDailyCalls = (trend: TrendPoint[], heatmap: HeatmapCell[]) => {
  if (heatmap.length > 0) {
    const totals = new Map<string, number>();
    heatmap.forEach((cell) => {
      totals.set(cell.day, (totals.get(cell.day) ?? 0) + cell.calls);
    });
    return Array.from(totals.entries()).map(([label, value]) => ({ label, value }));
  }
  const totals = new Map<string, number>();
  trend.forEach((point) => {
    totals.set(point.label, (totals.get(point.label) ?? 0) + point.calls);
  });
  return Array.from(totals.entries()).map(([label, value]) => ({ label, value }));
};

const computeBusinessCoverage = (heatmap: HeatmapCell[]) => {
  const businessDays = new Set(["Lun", "Mar", "Mié", "Mie", "Mi", "Jue", "Vie", "Mon", "Tue", "Wed", "Thu", "Fri"]);
  let inHours = 0;
  let outHours = 0;
  heatmap.forEach((cell) => {
    const normalizedDay = cell.day.slice(0, 3);
    const isBusinessDay = businessDays.has(normalizedDay);
    const inBusinessHour = cell.hour >= 9 && cell.hour <= 18;
    if (isBusinessDay && inBusinessHour) {
      inHours += cell.calls;
    } else {
      outHours += cell.calls;
    }
  });
  const total = inHours + outHours;
  const inPercentage = total ? (inHours / total) * 100 : 0;
  const outPercentage = total ? (outHours / total) * 100 : 0;
  return {
    inHours,
    outHours,
    inPercentage,
    outPercentage,
  };
};

const getMetricValue = (metrics: ReportMetric[], id: string): string | undefined =>
  metrics.find((metric) => metric.id === id)?.value;

const getMetricDelta = (metrics: ReportMetric[], id: string): string | undefined =>
  metrics.find((metric) => metric.id === id)?.deltaLabel ?? undefined;

const calculateBillableTickets = (
  ticketPerformance: TicketPerformanceSnapshot,
  types: NormalizedTicketType[]
) => {
  const billableKeywords = ["instal", "anoma", "aver", "break", "cert", "gas"];
  const countFromServices = ticketPerformance.services.reduce((sum, service) => {
    const slug = service.service.toLowerCase();
    if (billableKeywords.some((keyword) => slug.includes(keyword))) {
      return sum + service.count;
    }
    return sum;
  }, 0);
  if (countFromServices > 0) {
    return countFromServices;
  }
  return types.reduce((sum, type) => {
    const slug = type.label.toLowerCase();
    if (billableKeywords.some((keyword) => slug.includes(keyword))) {
      return sum + type.value;
    }
    return sum;
  }, 0);
};

const createIntroPage = (
  doc: jsPDF,
  clientName: string | undefined,
  dateRange: { from: Date; to: Date }
) => {
  ensureInterFonts(doc);
  ensureBrandFonts(doc);

  doc.setFillColor(...COLORS.pageBackground);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");

  setFontSafe(doc, "Montserrat", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...COLORS.primaryText);
  doc.text("AI Voice Agent Performance Report", 60, 120);

  setFontSafe(doc, "Roboto", "normal");
  doc.setFontSize(12);
  doc.text(`Client: ${clientName ?? "N/A"}`, 60, 160);
  doc.text(
    `Període: ${dateFormatter.format(dateRange.from)} - ${dateFormatter.format(dateRange.to)}`,
    60,
    178
  );
  doc.text(`Data generació: ${dateFormatter.format(new Date())}`, 60, 196);
};

const addPageHeading = (doc: jsPDF, title: string) => {
  doc.addPage();
  setFontSafe(doc, "Montserrat", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.primaryText);
  doc.text(title, 60, 60);
  setFontSafe(doc, "Roboto", "normal");
  doc.setTextColor(...COLORS.primaryText);
};

export const generateReportPdf = async (
  payload: GenerateReportPayload
): Promise<void> => {
  const {
    clientName,
    dateRange,
    metrics,
    trend,
    statuses,
    types,
    insights,
    ticketPerformance,
    heatmap,
    screenshots,
  } = payload;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", putOnlyUsedFonts: true });
  ensureInterFonts(doc);
  ensureBrandFonts(doc);

  const totalCallsValue = parseNumericValue(getMetricValue(metrics, "totalCalls"));
  const totalTicketsValue = parseNumericValue(getMetricValue(metrics, "totalTickets"));
  const totalCostValue = parseNumericValue(getMetricValue(metrics, "totalCost"));
  const ahtSeconds = parseDurationToSeconds(getMetricValue(metrics, "avgHandleTime"));
  const hoursSaved = totalCallsValue * ahtSeconds / 3600;
  const hourlyRate = reportingConfig.economics.hourlyRate ?? 20;
  const businessCoverage = computeBusinessCoverage(heatmap);
  const dailyTotals = aggregateDailyCalls(trend, heatmap);
  const callDistributionValue = `In: ${businessCoverage.inPercentage.toFixed(1)} % / Out: ${businessCoverage.outPercentage.toFixed(1)} %`;

  const performance = ticketPerformance ?? { statuses: [], services: [] };

  createIntroPage(doc, clientName, dateRange);

  // PAGE 1 – Executive Summary
  addPageHeading(doc, "Executive Summary");
  const marginLeft = 60;
  const contentWidth = doc.internal.pageSize.getWidth() - marginLeft * 2;
  const cardWidth = (contentWidth - 20) / 2;

  drawKpiCard(
    doc,
    marginLeft,
    90,
    cardWidth,
    80,
    "Total Calls",
    numberFormatter.format(totalCallsValue),
    COLORS.brandBlue
  );
  drawKpiCard(
    doc,
    marginLeft + cardWidth + 20,
    90,
    cardWidth,
    80,
    "Average Handle Time",
    getMetricValue(metrics, "avgHandleTime") ?? "0:00",
    COLORS.brandOrange
  );

  const secondaryWidth = (contentWidth - 40) / 3;
  const secondaryY = 190;
  drawSmallKpiCard(
    doc,
    marginLeft,
    secondaryY,
    secondaryWidth,
    "Tickets Created",
    numberFormatter.format(totalTicketsValue)
  );
  drawSmallKpiCard(
    doc,
    marginLeft + secondaryWidth + 20,
    secondaryY,
    secondaryWidth,
    "Human Time Saved",
    formatHours(hoursSaved)
  );
  drawSmallKpiCard(
    doc,
    marginLeft + (secondaryWidth + 20) * 2,
    secondaryY,
    secondaryWidth,
    "Total Cost",
    currencyFormatter.format(totalCostValue)
  );
  drawSmallKpiCard(
    doc,
    marginLeft,
    secondaryY + 90,
    contentWidth,
    "Calls Distribution (In / Out)",
    callDistributionValue
  );

  setFontSafe(doc, "Roboto", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primaryText);
  const summaryParagraph = `L'agent ha gestionat ${numberFormatter.format(totalCallsValue)} trucades amb un temps mitja de ${getMetricValue(metrics, "avgHandleTime") ?? "0:00"}, generant ${numberFormatter.format(totalTicketsValue)} tickets.`;
  doc.text(doc.splitTextToSize(summaryParagraph, contentWidth), marginLeft, secondaryY + 150);

  let sectionTop = secondaryY + 170;
  sectionTop = ensurePageSpace(doc, sectionTop, 180);
  const trendRendered = await addScreenshotToPdf(doc, screenshots.trendChart, marginLeft, sectionTop, contentWidth, 160);
  if (trendRendered) {
    sectionTop += 180;
  } else {
        doc.text("Grafica de tendencia no disponible", marginLeft, sectionTop + 14);
    sectionTop += 34;
  }

  sectionTop = ensurePageSpace(doc, sectionTop, 180);
  drawSimpleBarChart(
    doc,
    marginLeft,
    sectionTop,
    contentWidth,
    150,
    dailyTotals,
    "Distribucio diaria de trucades"
  );
  sectionTop += 170;

  const dailyTableRows = dailyTotals
    .slice()
    .sort((a, b) => b.value - a.value)
    .map((item) => [item.label, numberFormatter.format(item.value)]);
  const dailyTableStart = ensurePageSpace(doc, sectionTop, 120);
  if (dailyTableRows.length > 0) {
    autoTable(doc, {
      startY: dailyTableStart,
      head: [["Dia", "Trucades"]],
      body: dailyTableRows,
      styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [236, 245, 255], textColor: [31, 41, 55] },
      margin: { left: marginLeft, right: marginLeft },
    });
    sectionTop = (getAutoTableFinalY(doc) ?? dailyTableStart) + 20;
  } else {
    sectionTop = dailyTableStart + 10;
  }

  sectionTop = ensurePageSpace(doc, sectionTop, 200);
  const heatmapRendered = await addScreenshotToPdf(doc, screenshots.heatmapChart, marginLeft, sectionTop, contentWidth, 160);
  if (!heatmapRendered) {
    doc.text("Heatmap no disponible", marginLeft, sectionTop + 14);
  }

  const coverageTableRows = [
    ["In business hours", numberFormatter.format(businessCoverage.inHours), `${businessCoverage.inPercentage.toFixed(1)} %`],
    ["Out of business hours", numberFormatter.format(businessCoverage.outHours), `${businessCoverage.outPercentage.toFixed(1)} %`],
  ];
  sectionTop = (getAutoTableFinalY(doc) ?? sectionTop) + 40;
  autoTable(doc, {
    startY: sectionTop,
    head: [["Segment", "Calls", "%"]],
    body: coverageTableRows,
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [236, 245, 255], textColor: [31, 41, 55] },
    margin: { left: marginLeft, right: marginLeft },
  });

  // PAGE 2 – Tickets Overview
  addPageHeading(doc, "Tickets Overview");
  let ticketsY = 100;
  const openCount = performance.statuses.find((item) => item.status === "open")?.count ?? 0;
  const inProgressCount = performance.statuses.find((item) => item.status === "in_progress")?.count ?? 0;
  const closedCount = performance.statuses.find((item) => item.status === "closed")?.count ?? 0;
  const overviewLines = [
    `Open tickets: ${numberFormatter.format(openCount)}` ,
    `In progress: ${numberFormatter.format(inProgressCount)}` ,
    `Closed: ${numberFormatter.format(closedCount)}` ,
  ];
  doc.text(overviewLines, marginLeft, ticketsY);
  ticketsY += overviewLines.length * 14 + 10;

  const statusTableRows = statuses.map((status) => [
    status.label,
    numberFormatter.format(status.count),
    `${status.percentage.toFixed(1)} %`,
  ]);
  if (statusTableRows.length > 0) {
    autoTable(doc, {
      startY: ticketsY,
      head: [["Estat", "Tickets", "%"]],
      body: statusTableRows,
      styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [236, 245, 255], textColor: [31, 41, 55] },
      margin: { left: marginLeft, right: marginLeft },
    });
    ticketsY = (getAutoTableFinalY(doc) ?? ticketsY) + 20;
  }

  const processedServices = performance.services
    .filter((service) => service.closedCount > 0)
    .sort((a, b) => b.closedCount - a.closedCount)
    .map((service) => [
      service.service,
      numberFormatter.format(service.closedCount),
      `${service.closedPercentage.toFixed(1)} %`,
    ]);
  if (processedServices.length > 0) {
    autoTable(doc, {
      startY: ticketsY,
      head: [["Servei", "Processats", "% tancats"]],
      body: processedServices,
      styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [240, 249, 255], textColor: [31, 41, 55] },
      margin: { left: marginLeft, right: marginLeft },
    });
    ticketsY = (getAutoTableFinalY(doc) ?? ticketsY) + 20;
  } else {
    doc.text("No hi ha tickets processats en el periode.", marginLeft, ticketsY + 12);
    ticketsY += 30;
  }

  const pendingServices = performance.services
    .filter((service) => service.openCount + service.inProgressCount > 0)
    .sort((a, b) => (b.openCount + b.inProgressCount) - (a.openCount + a.inProgressCount))
    .map((service) => [
      service.service,
      numberFormatter.format(service.openCount + service.inProgressCount),
      `${service.pendingPercentage.toFixed(1)} %`,
    ]);
  if (pendingServices.length > 0) {
    autoTable(doc, {
      startY: ticketsY,
      head: [["Servei", "Pendents", "% pendents"]],
      body: pendingServices,
      styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [255, 247, 237], textColor: [31, 41, 55] },
      margin: { left: marginLeft, right: marginLeft },
    });
    ticketsY = (getAutoTableFinalY(doc) ?? ticketsY) + 20;
  } else {
    doc.text("No hi ha backlog pendent.", marginLeft, ticketsY + 12);
  }

  // PAGE 3 – Tickets Distribution
  addPageHeading(doc, "Tickets Distribution");
  let distributionTop = 90;
  const donutWidth = 260;
  const donutX = marginLeft + (contentWidth - donutWidth) / 2;
  const donutRendered = await addScreenshotToPdf(doc, screenshots.ticketTypesChart, donutX, distributionTop, donutWidth, 260);
  if (!donutRendered) {
        doc.text("Grafica de distribucio no disponible", marginLeft, distributionTop + 14);
    distributionTop += 34;
  } else {
    distributionTop += 280;
  }

  const typesTableRows = types
    .slice()
    .sort((a, b) => b.percentage - a.percentage)
    .map((type) => [type.label, numberFormatter.format(type.value), `${type.percentage.toFixed(1)} %`]);
  if (typesTableRows.length > 0) {
    autoTable(doc, {
      startY: distributionTop,
      head: [["Categoria", "Tickets", "%"]],
      body: typesTableRows,
      styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [240, 249, 255], textColor: [31, 41, 55] },
      margin: { left: marginLeft, right: marginLeft },
    });
    distributionTop = (getAutoTableFinalY(doc) ?? distributionTop) + 20;
  }

  const highlightLines: string[] = [];
  const topTypeRow = typesTableRows[0];
  if (topTypeRow) {
    highlightLines.push(`Categoria principal: ${topTypeRow[0]} (${topTypeRow[2]} del total)`);
  }
  insights.slice(0, 3).forEach((item) => highlightLines.push(item));
  let highlightY = distributionTop + 10;
  highlightLines.forEach((line) => {
    highlightY = ensurePageSpace(doc, highlightY, 20);
    doc.circle(marginLeft - 8, highlightY - 3, 2, 'F');
    doc.text(line, marginLeft, highlightY);
    highlightY += 16;
  });

  const label = `voice-agent-report-${dateFormatter.format(dateRange.to)}`.toLowerCase().replace(/\s+/g, '-');
  doc.save(`${label}.pdf`);
};
export const generateExecutiveSummaryPdf = async (
  payload: ExecutiveSummaryPayload
): Promise<void> => {
  const {
    clientName,
    dateRange,
    metrics,
    trend = [],
    statuses = [],
    ticketTypes = [],
    ticketServices = [],
    insights = [],
    callPerformance = null,
    economicImpact,
    priorities = [],
    benchmarks = [],
  } = payload;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  ensureInterFonts(doc);
  ensureBrandFonts(doc);

  const marginLeft = 50;
  const marginRight = 50;
  const width = doc.internal.pageSize.getWidth() - marginLeft - marginRight;

  setFontSafe(doc, "Montserrat", "bold");
  doc.setFontSize(20);
  doc.text("Executive Summary", marginLeft, 60);

  setFontSafe(doc, "Roboto", "normal");
  doc.setFontSize(11);
  doc.text(`Client: ${clientName ?? "N/A"}`, marginLeft, 80);
  doc.text(
    `Període: ${dateFormatter.format(dateRange.from)} - ${dateFormatter.format(dateRange.to)}`,
    marginLeft,
    96
  );

  doc.setFontSize(12);
  doc.text("Key KPIs", marginLeft, 120);
  const metricRows = ["totalCalls", "totalTickets", "avgHandleTime", "totalCost"].map((id) => {
    const metric = metrics.find((item) => item.id === id);
    return metric ? [metric.label, metric.value, metric.deltaLabel ?? ""] : null;
  }).filter(Boolean) as string[][];
  autoTable(doc, {
    startY: 130,
    head: [["KPI", "Value", "Trend"]],
    body: metricRows,
    styles: { font: "helvetica", fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [236, 245, 255], textColor: [31, 41, 55] },
    margin: { left: marginLeft, right: marginRight },
  });

  if (callPerformance) {
    const y = (getAutoTableFinalY(doc) ?? 130) + 20;
    doc.text(
      [
        `Total calls: ${numberFormatter.format(callPerformance.total)}`,
        `Answered: ${numberFormatter.format(callPerformance.answered)} (${percentFormatter.format(callPerformance.answeredRate / 100)})`,
        `Missed: ${numberFormatter.format(callPerformance.missed)}`,
      ],
      marginLeft,
      y
    );
  }

  const statusRows = statuses.slice(0, 5).map((status) => [status.label, numberFormatter.format(status.count), `${status.percentage.toFixed(1)} %`]);
  if (statusRows.length > 0) {
    const startY = (getAutoTableFinalY(doc) ?? 220) + 30;
    doc.text("Ticket Status", marginLeft, startY);
    autoTable(doc, {
      startY: startY + 10,
      head: [["Status", "Tickets", "%"]],
      body: statusRows,
      styles: { font: "helvetica", fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [236, 245, 255], textColor: [31, 41, 55] },
      margin: { left: marginLeft, right: marginRight },
    });
  }

  const typeRows = ticketTypes.slice(0, 6).map((type) => [type.label, numberFormatter.format(type.value), `${type.percentage.toFixed(1)} %`]);
  if (typeRows.length > 0) {
    const startY = (getAutoTableFinalY(doc) ?? 260) + 20;
    doc.text("Top ticket types", marginLeft, startY);
    autoTable(doc, {
      startY: startY + 10,
      head: [["Type", "Tickets", "%"]],
      body: typeRows,
      styles: { font: "helvetica", fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [236, 245, 255], textColor: [31, 41, 55] },
      margin: { left: marginLeft, right: marginRight },
    });
  }

  const summaryBullets: string[] = [];
  insights.slice(0, 4).forEach((insight) => summaryBullets.push(insight));
  priorities?.slice(0, 3).forEach((priority) => {
    summaryBullets.push(`${priority.title} (${priority.impact}) - ${priority.description}`);
  });
  if (summaryBullets.length > 0) {
    const startY = (getAutoTableFinalY(doc) ?? 320) + 25;
    doc.text("Highlights", marginLeft, startY);
    summaryBullets.forEach((text, index) => {
      doc.circle(marginLeft - 6, startY + 12 + index * 14 - 3, 2, "F");
      doc.text(text, marginLeft, startY + 12 + index * 14);
    });
  }

  const summaryLabel = `executive-summary-${dateFormatter.format(dateRange.to)}`.toLowerCase().replace(/\s+/g, "-");
  doc.save(`${summaryLabel}.pdf`);
};
