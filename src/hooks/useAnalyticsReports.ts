import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTecnicsBcnCalls } from "@/hooks/useTecnicsBcnCalls";
import { useSalutdentalCalls } from "@/hooks/useSalutdentalCalls";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DateRange } from "@/components/dashboard/DateRangeControls";
import {
  buildReportMetrics,
  buildTrendPoints,
  normalizeTicketStatuses,
  normalizeTicketTypes,
  deriveInsights,
  ReportMetric,
  TrendPoint,
  NormalizedTicketStatus,
  NormalizedTicketType,
  DashboardStats,
} from "@/lib/reporting/metrics";
import { reportingConfig } from "@/lib/reporting/config";
import { generateReportPdf, generateExecutiveSummaryPdf } from "@/lib/reporting/pdf";
import { generateReportWorkbook } from "@/lib/reporting/xlsx";
import html2canvas from "html2canvas";

export type ReportType = "executive" | "operational" | "quality";

type TrendDelta = {
  delta: number | null;
  trend: "up" | "down" | "flat";
};

type ResponseBucket = {
  label: string;
  count: number;
  percentage: number;
};

type ChannelSummary = {
  channel: string;
  calls: number;
  avgDuration: number;
};

type TicketAgentSummary = {
  agent: string;
  tickets: number;
  resolved: number;
  open: number;
};

export interface CallPerformanceSummary {
  total: number;
  answered: number;
  missed: number;
  answeredRate: number;
  answeredDelta: TrendDelta;
  missedDelta: TrendDelta;
  answeredWithinHours: number;
  answeredOutsideHours: number;
  withinHoursRate: number;
  outsideHoursRate: number;
  responseDistribution: ResponseBucket[];
  channels: ChannelSummary[];
}

export interface TicketStatusSummary {
  status: "open" | "in_progress" | "closed";
  label: string;
  count: number;
  percentage: number;
  delta: TrendDelta;
}

export interface TicketServiceSummary {
  service: string;
  count: number;
  percentage: number;
  closedCount: number;
  openCount: number;
  inProgressCount: number;
  closedPercentage: number;
  pendingPercentage: number;
}

export interface EconomicSummary {
  missedCalls: number;
  missedCallCost: number;
  automationSavings: number;
  humanSavings: number;
  recoveredRevenue: number;
  netImpact: number;
  roi: number | null;
}

export interface AnalyticsReportState {
  metrics: ReportMetric[];
  trend: TrendPoint[];
  statuses: NormalizedTicketStatus[];
  ticketTypes: NormalizedTicketType[];
  insights: string[];
  loading: boolean;
  error: string | null;
  reportType: ReportType;
  setReportType: (type: ReportType) => void;
  exportReport: () => Promise<void>;
  exportExecutiveSummary: () => Promise<void>;
  exportExcel: () => Promise<void>;
  exportLoading: boolean;
  clientLabel: string;
  includeScore: boolean;
  comparisonStats: DashboardStats | null;
  comparisonRange: DateRange;
  heatmap: HeatmapCell[];
  callPerformance: CallPerformanceSummary | null;
  ticketPerformance: {
    statuses: TicketStatusSummary[];
    services: TicketServiceSummary[];
    agents: TicketAgentSummary[];
  };
  availableFilters: {
    channels: string[];
    services: string[];
    agents: string[];
  };
  economicSummary: EconomicSummary | null;
  benchmarks: BenchmarkSummary[];
  priorities: PriorityItem[];
}

export interface HeatmapCell {
  day: string;
  hour: number;
  calls: number;
  avgDuration: number;
}

export interface BenchmarkSummary {
  metric: string;
  percentile: number;
  cohort: "top" | "average" | "bottom";
  message: string;
}

export interface PriorityItem {
  id: string;
  impact: "high" | "medium" | "low";
  title: string;
  description: string;
  referenceMetric?: string;
}

interface UseAnalyticsOptions {
  comparisonRange?: DateRange | null;
}

interface RawCallRecord {
  id?: number | string;
  created_at: string;
  call_duration_seconds?: number | string | null;
  call_cost?: number | string | null;
  score?: number | string | null;
  phone_id?: string | null;
}

interface RawTicketRecord {
  id?: number | string;
  created_at: string;
  ticket_type?: string | null;
  ticket_status?: string | null;
  user_name?: string | null;
}

const RESPONSE_BUCKETS = [
  { label: "<30s", maxSeconds: 30 },
  { label: "30-60s", maxSeconds: 60 },
  { label: ">60s", maxSeconds: Infinity },
] as const;

const SERVICE_CATEGORIES = [
  { label: "Averías", keywords: ["aver", "averia", "break", "fault", "fail", "no funciona", "no va", "estropeado", "dañado"] },
  { label: "Anular Cita", keywords: ["anular", "cancel", "cita", "appointment", "cancelar"] },
  { label: "Consultas", keywords: ["consulta", "informacion", "info", "pregunta", "duda", "ayuda"] },
  { label: "Reparaciones", keywords: ["repar", "repair", "fix", "arregl", "solucion"] },
  { label: "Instalaciones", keywords: ["instal", "install", "montaje", "colocacion"] },
  { label: "Mantenimiento", keywords: ["maint", "manten", "service", "revision", "check"] },
  { label: "Otros", keywords: ["complaint", "queja", "reclam", "denuncia", "insatisfecho", "general", "otro", "misc"] },
  { label: "Urgentes", keywords: ["urgent", "emergenc", "emergencia", "prioritario", "critico"] },
  { label: "Presupuestos", keywords: ["presupuest", "budget", "cotizacion", "precio", "coste"] },
  { label: "Garantías", keywords: ["garant", "warranty", "devolucion", "return"] },
];

const dayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const orderedDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const sanitizeRange = (range?: DateRange): DateRange => {
  if (!range?.from || !range?.to) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: today };
  }

  return {
    from: new Date(range.from),
    to: new Date(range.to),
  };
};

const previousRangeFor = (range: DateRange): DateRange => {
  const duration = range.to.getTime() - range.from.getTime();
  const previousTo = new Date(range.from.getTime() - 1);
  previousTo.setHours(23, 59, 59, 999);
  const previousFrom = new Date(previousTo.getTime() - duration);
  previousFrom.setHours(0, 0, 0, 0);
  return { from: previousFrom, to: previousTo };
};

const buildClientLabel = (
  profile: ReturnType<typeof useUserProfile>["profile"]
) => profile?.active_client_name || profile?.client_name || "Cliente";

const isSalutdentalClient = (
  profile: ReturnType<typeof useUserProfile>["profile"]
) => {
  const name = `${profile?.active_client_name || ""} ${profile?.client_name || ""}`.toLowerCase();
  return name.includes("salutdental");
};

const parseNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const sanitized = value.replace(/,/g, ".");
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const sanitizeLabel = (value: string | null | undefined, fallback: string) => {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const shouldExcludeType = (label: string | null | undefined) => {
  const s = (label || "").toLowerCase();
  return [
    "llamada colgada",
    "llamada no final",
    "sin finalizar",
    "trucada no final",
    "trucada penjada",
    "no final",
  ].some((kw) => s.includes(kw));
};

const calculateDelta = (current: number, previous?: number | null): TrendDelta => {
  if (previous === undefined || previous === null || previous === 0) {
    return { delta: null, trend: "flat" };
  }
  const rawChange = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(rawChange)) {
    return { delta: null, trend: "flat" };
  }
  const rounded = Number(rawChange.toFixed(1));
  if (Math.abs(rounded) < 0.1) {
    return { delta: 0, trend: "flat" };
  }
  return {
    delta: rounded,
    trend: rounded > 0 ? "up" : "down",
  };
};

const summarizeStats = (
  calls: RawCallRecord[],
  tickets: RawTicketRecord[]
): DashboardStats => {
  const totalCalls = calls.length;
  let totalCallTimeSeconds = 0;
  let validCallDurations = 0;
  let totalCost = 0;

  calls.forEach((call) => {
    const duration = parseNumber(call.call_duration_seconds);
    if (duration > 0) {
      totalCallTimeSeconds += duration;
      validCallDurations += 1;
    }
    const cost = parseNumber(call.call_cost);
    if (cost > 0) {
      totalCost += cost;
    }
  });

  const sanitizedTickets = tickets.filter((ticket) => !shouldExcludeType(ticket.ticket_type));

  const totalTickets = sanitizedTickets.length;
  let resolvedTickets = 0;
  let openTickets = 0;

  sanitizedTickets.forEach((ticket) => {
    const status = (ticket.ticket_status || "").toLowerCase();
    if (status.includes("cerr") || status.includes("resolt") || status.includes("resuelto")) {
      resolvedTickets += 1;
    } else {
      openTickets += 1;
    }
  });

  const avgCallDuration = validCallDurations > 0
    ? Math.round(totalCallTimeSeconds / validCallDurations)
    : 0;

  return {
    totalCalls,
    avgCallDuration,
    totalCallTime: Math.round(totalCallTimeSeconds),
    totalCost: Number(totalCost.toFixed(2)),
    totalTickets,
    openTickets,
    resolvedTickets,
  };
};

const analyzeCalls = (calls: RawCallRecord[]) => {
  let answered = 0;
  let missed = 0;
  let answeredWithinHours = 0;
  let answeredOutsideHours = 0;
  const buckets = RESPONSE_BUCKETS.map((bucket) => ({ label: bucket.label, count: 0 }));
  const channelMap = new Map<string, { calls: number; duration: number }>();

  const isWithinBusinessHours = (date: Date): boolean => {
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hour = date.getHours();
    return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
  };

  calls.forEach((call) => {
    const duration = parseNumber(call.call_duration_seconds);
    const callTime = new Date(call.created_at);
    const withinHours = isWithinBusinessHours(callTime);

    if (duration > 0) {
      answered += 1;
      if (withinHours) {
        answeredWithinHours += 1;
      } else {
        answeredOutsideHours += 1;
      }
    } else {
      missed += 1;
    }

    const bucket = RESPONSE_BUCKETS.find((entry) => duration <= entry.maxSeconds) ?? RESPONSE_BUCKETS[RESPONSE_BUCKETS.length - 1];
    const bucketIndex = RESPONSE_BUCKETS.indexOf(bucket);
    buckets[bucketIndex].count += 1;

    const channelLabel = sanitizeLabel(call.phone_id, "Otro canal");
    const channelEntry = channelMap.get(channelLabel) ?? { calls: 0, duration: 0 };
    channelEntry.calls += 1;
    channelEntry.duration += duration;
    channelMap.set(channelLabel, channelEntry);
  });

  const total = answered + missed;
  const answeredRate = total === 0 ? 0 : answered / total;
  const withinHoursRate = answered === 0 ? 0 : answeredWithinHours / answered;
  const outsideHoursRate = answered === 0 ? 0 : answeredOutsideHours / answered;

  const distribution: ResponseBucket[] = buckets.map((bucket) => ({
    label: bucket.label,
    count: bucket.count,
    percentage: total === 0 ? 0 : Number(((bucket.count / total) * 100).toFixed(1)),
  }));

  const channels: ChannelSummary[] = Array.from(channelMap.entries())
    .map(([channel, value]) => ({
      channel,
      calls: value.calls,
      avgDuration: value.calls > 0 ? Math.round(value.duration / value.calls) : 0,
    }))
    .sort((a, b) => b.calls - a.calls);

  return {
    total,
    answered,
    missed,
    answeredRate,
    answeredWithinHours,
    answeredOutsideHours,
    withinHoursRate,
    outsideHoursRate,
    distribution,
    channels,
  };
};

const mapServiceCategory = (ticketType: string | null | undefined): string => {
  if (!ticketType || ticketType.trim() === '') {
    return "Sin Categoría";
  }

  const normalized = ticketType.toLowerCase().trim();

  // First try exact matches for common types
  const exactMatches: Record<string, string> = {
    'averias': 'Averías',
    'averia': 'Averías',
    'anular_cita': 'Anular Cita',
    'anular cita': 'Anular Cita',
    'cancelar_cita': 'Anular Cita',
    'cancelar cita': 'Anular Cita',
    'consulta': 'Consultas',
    'informacion': 'Consultas',
    'información': 'Consultas',
    'reparacion': 'Reparaciones',
    'reparación': 'Reparaciones',
    'instalacion': 'Instalaciones',
    'instalación': 'Instalaciones',
    'mantenimiento': 'Mantenimiento',
    'queja': 'Otros',
    'reclamacion': 'Otros',
    'reclamación': 'Otros',
    'urgente': 'Urgentes',
    'emergencia': 'Urgentes',
    'presupuesto': 'Presupuestos',
    'garantia': 'Garantías',
    'garantía': 'Garantías'
  };

  if (exactMatches[normalized]) {
    return exactMatches[normalized];
  }

  // Then try keyword matching
  const match = SERVICE_CATEGORIES.find((category) =>
    category.keywords.some((keyword) => normalized.includes(keyword))
  );

  // If no match found, return the original type (but clean it up)
  return match?.label ?? ticketType.trim();
};

const analyzeTickets = (
  tickets: RawTicketRecord[],
  previousTickets: RawTicketRecord[]
) => {
  const currentFiltered = tickets.filter((ticket) => !shouldExcludeType(ticket.ticket_type));
  const previousFiltered = previousTickets.filter((ticket) => !shouldExcludeType(ticket.ticket_type));

  const statusCounters = new Map<string, number>();
  const prevStatusCounters = new Map<string, number>();
  const serviceCounters = new Map<string, number>();
  const serviceStatusCounters = new Map<string, Map<string, number>>();
  const agentCounters = new Map<string, { tickets: number; resolved: number; open: number }>();

  const incrementStatus = (target: Map<string, number>, status: string) => {
    target.set(status, (target.get(status) ?? 0) + 1);
  };

  const incrementServiceStatus = (service: string, status: string) => {
    if (!serviceStatusCounters.has(service)) {
      serviceStatusCounters.set(service, new Map());
    }
    const serviceMap = serviceStatusCounters.get(service)!;
    serviceMap.set(status, (serviceMap.get(status) ?? 0) + 1);
  };

  const normalizeStatus = (value: string | null | undefined): "open" | "in_progress" | "closed" => {
    const status = (value || "").toLowerCase();
    if (status.includes("cerr") || status.includes("resolt") || status.includes("resuelto")) {
      return "closed";
    }
    if (status.includes("progres") || status.includes("proces") || status.includes("in progress")) {
      return "in_progress";
    }
    return "open";
  };

  currentFiltered.forEach((ticket) => {
    const status = normalizeStatus(ticket.ticket_status);
    incrementStatus(statusCounters, status);

    const service = mapServiceCategory(ticket.ticket_type);
    serviceCounters.set(service, (serviceCounters.get(service) ?? 0) + 1);
    incrementServiceStatus(service, status);

    const agentName = sanitizeLabel(ticket.user_name, "Sin asignar");
    const agentEntry = agentCounters.get(agentName) ?? { tickets: 0, resolved: 0, open: 0 };
    agentEntry.tickets += 1;
    if (status === "closed") {
      agentEntry.resolved += 1;
    } else {
      agentEntry.open += 1;
    }
    agentCounters.set(agentName, agentEntry);
  });

  previousFiltered.forEach((ticket) => {
    const status = normalizeStatus(ticket.ticket_status);
    incrementStatus(prevStatusCounters, status);
  });

  const totalTickets = currentFiltered.length || 1;

  const statuses: TicketStatusSummary[] = ["open", "in_progress", "closed"].map((status) => {
    const currentValue = statusCounters.get(status) ?? 0;
    const previousValue = prevStatusCounters.get(status) ?? 0;
    const delta = calculateDelta(currentValue, previousValue);
    const percentage = Number(((currentValue / totalTickets) * 100).toFixed(1));

    const labels: Record<string, string> = {
      open: "Abiertos",
      in_progress: "En progreso",
      closed: "Cerrados",
    };

    return {
      status: status as TicketStatusSummary["status"],
      label: labels[status],
      count: currentValue,
      percentage,
      delta,
    };
  });

  const services: TicketServiceSummary[] = Array.from(serviceCounters.entries())
    .map(([service, count]) => {
      const serviceStatusMap = serviceStatusCounters.get(service);
      const closedCount = serviceStatusMap?.get('closed') ?? 0;
      const openCount = serviceStatusMap?.get('open') ?? 0;
      const inProgressCount = serviceStatusMap?.get('in_progress') ?? 0;

      return {
        service,
        count,
        percentage: Number(((count / totalTickets) * 100).toFixed(1)),
        closedCount,
        openCount,
        inProgressCount,
        closedPercentage: count > 0 ? Number(((closedCount / count) * 100).toFixed(1)) : 0,
        pendingPercentage: count > 0 ? Number((((openCount + inProgressCount) / count) * 100).toFixed(1)) : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  const agents: TicketAgentSummary[] = Array.from(agentCounters.entries())
    .map(([agent, value]) => ({
      agent,
      tickets: value.tickets,
      resolved: value.resolved,
      open: value.open,
    }))
    .sort((a, b) => b.tickets - a.tickets);

  return { statuses, services, agents };
};

const buildHeatmap = (calls: RawCallRecord[]): HeatmapCell[] => {
  const map = new Map<string, { calls: number; duration: number }>();

  calls.forEach((call) => {
    const created = new Date(call.created_at);
    const dayIndex = created.getDay();
    const hour = created.getHours();
    const key = `${dayLabels[dayIndex]}-${hour}`;
    const entry = map.get(key) ?? { calls: 0, duration: 0 };
    entry.calls += 1;
    entry.duration += parseNumber(call.call_duration_seconds);
    map.set(key, entry);
  });

  const result: HeatmapCell[] = [];
  map.forEach((value, key) => {
    const [dayLabel, hourStr] = key.split("-");
    const calls = value.calls;
    const avgDuration = calls > 0 ? Math.round(value.duration / calls) : 0;
    result.push({
      day: dayLabel,
      hour: Number(hourStr),
      calls,
      avgDuration,
    });
  });

  return result.sort((a, b) => {
    if (a.day === b.day) return a.hour - b.hour;
    return orderedDays.indexOf(a.day) - orderedDays.indexOf(b.day);
  });
};

const computeEconomicSummary = (
  stats: DashboardStats,
  previousCallStats: ReturnType<typeof analyzeCalls> | null,
  currentCallStats: ReturnType<typeof analyzeCalls>,
  config = reportingConfig.economics
): EconomicSummary => {
  const missedCalls = currentCallStats.missed;
  const missedCallCost = Math.round(missedCalls * config.missedCallCost);
  const automationSavings = Math.round(
    currentCallStats.total * config.automationCoverage * config.automationSavingsPerCall
  );

  const hoursSaved =
    currentCallStats.total *
    config.automationCoverage *
    (stats.avgCallDuration / 3600);
  const humanSavings = Math.round(hoursSaved * config.hourlyRate);

  const previousMissed = previousCallStats?.missed ?? missedCalls;
  const missedRecovered = Math.max(previousMissed - missedCalls, 0);
  const recoveredRevenue = Math.round(
    missedRecovered * config.conversionRate * config.avgTicketValue
  );

  const netImpact = automationSavings + humanSavings + recoveredRevenue - missedCallCost;
  const roi = missedCallCost > 0 ? Number((netImpact / missedCallCost).toFixed(2)) : null;

  return {
    missedCalls,
    missedCallCost,
    automationSavings,
    humanSavings,
    recoveredRevenue,
    netImpact,
    roi,
  };
};

const computeBenchmarks = (stats: DashboardStats): BenchmarkSummary[] => {
  const resolutionRate = stats.totalTickets > 0 ? stats.resolvedTickets / stats.totalTickets : 0;
  const ticketsPerCall = stats.totalCalls > 0 ? stats.totalTickets / stats.totalCalls : 0;
  const { benchmarks } = reportingConfig;

  const classify = (value: number, slices: { top: number; average: number; bottom: number }) => {
    if (value >= slices.top) return "top" as const;
    if (value >= slices.average) return "average" as const;
    return "bottom" as const;
  };

  const results: BenchmarkSummary[] = [];

  const resolutionCohort = classify(resolutionRate, benchmarks.resolutionRate);
  results.push({
    metric: "Resoluci�n de tickets",
    percentile: Math.round(resolutionRate * 100),
    cohort: resolutionCohort,
    message:
      resolutionCohort === "top"
        ? "Por encima del percentil 75 del sector"
        : resolutionCohort === "average"
        ? "En la media del sector"
        : "Por debajo del percentil 25: oportunidad de mejora",
  });

  const ahtCohort = classify(stats.avgCallDuration, benchmarks.avgHandleTimeSeconds);
  results.push({
    metric: "Tiempo medio de llamada",
    percentile: stats.avgCallDuration,
    cohort: ahtCohort,
    message:
      ahtCohort === "top"
        ? "Gesti�n �gil vs. benchmark"
        : ahtCohort === "average"
        ? "En l�nea con la media"
        : "Duraciones elevadas: revisar capacitaci�n y scripts",
  });

  const ticketsPerCallCohort = classify(ticketsPerCall, benchmarks.ticketsPerCall);
  results.push({
    metric: "Tickets por llamada",
    percentile: Math.round(ticketsPerCall * 100),
    cohort: ticketsPerCallCohort,
    message:
      ticketsPerCallCohort === "top"
        ? "Gran capacidad de upselling/service"
        : ticketsPerCallCohort === "average"
        ? "Ratio equilibrado"
        : "Baja conversi�n: evaluar cross-selling y scripts",
  });

  return results;
};

const buildPriorities = (
  stats: DashboardStats,
  ticketPerformance: {
    statuses: TicketStatusSummary[];
    services: TicketServiceSummary[];
    agents: TicketAgentSummary[];
  },
  economic: EconomicSummary
): PriorityItem[] => {
  const priorities: PriorityItem[] = [];

  if (economic.missedCalls > 0) {
    priorities.push({
      id: "recover-missed-calls",
      impact: "high",
      title: "Recuperar llamadas perdidas",
      description: `Existen ${economic.missedCalls} llamadas sin seguimiento con un coste estimado de ${economic.missedCallCost.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}. Refuerza cobertura en las franjas pico.`,
      referenceMetric: "missedCalls",
    });
  }

  const openStatus = ticketPerformance.statuses.find((status) => status.status === "open");
  if (openStatus && openStatus.percentage > 30) {
    priorities.push({
      id: "close-open-tickets",
      impact: "high",
      title: "Reducir backlog de tickets",
      description: `${openStatus.count} tickets abiertos (${openStatus.percentage}%) ralentizan la experiencia. Prioriza cierres y automatiza seguimientos.`,
      referenceMetric: "openTickets",
    });
  }

  const topService = ticketPerformance.services[0];
  if (topService) {
    priorities.push({
      id: "service-automation",
      impact: "medium",
      title: `Automatizar ${topService.service.toLowerCase()}`,
      description: `${topService.service} representa ${topService.percentage}% de las incidencias. Revisa flujos espec�ficos y FAQs para reducir contacto humano.`,
      referenceMetric: topService.service,
    });
  }

  if (economic.netImpact < 0) {
    priorities.push({
      id: "roi-recovery",
      impact: "medium",
      title: "Optimizar ROI",
      description: "El impacto neto es negativo. Revisa horarios pico e incrementa automatizaci�n para invertir la tendencia.",
      referenceMetric: "roi",
    });
  }

  const overloadedAgent = ticketPerformance.agents.find((agent) => agent.open > 5);
  if (overloadedAgent) {
    priorities.push({
      id: "agent-support",
      impact: "low",
      title: `Refuerzo para ${overloadedAgent.agent}`,
      description: `${overloadedAgent.agent} mantiene ${overloadedAgent.open} tickets abiertos. Revisa asignaciones o ap�yalo con entrenamiento.`,
      referenceMetric: overloadedAgent.agent,
    });
  }

  return priorities;
};

const computeActionableInsights = (
  metrics: ReportMetric[],
  ticketPerformance: {
    services: TicketServiceSummary[];
    agents: TicketAgentSummary[];
  },
  economic: EconomicSummary
): string[] => {
  const insights: string[] = [];

  const netImpactMetric = metrics.find((metric) => metric.id === "netImpact");
  if (netImpactMetric) {
    insights.push(
      `Impacto neto del periodo: ${netImpactMetric.value}. Refuerza los flujos que generan mayor ahorro.`
    );
  }

  if (ticketPerformance.services.length > 0) {
    const topService = ticketPerformance.services[0];
    insights.push(
      `${topService.service} concentra ${topService.percentage}% de las solicitudes. Crea guías o automatizaciones específicas para reducir tiempos.`
    );
  }

  if (ticketPerformance.agents.length > 0) {
    const topAgent = ticketPerformance.agents[0];
    insights.push(
      `${topAgent.agent} gestiona ${topAgent.tickets} tickets. Revisa disponibilidad o reasigna casos para equilibrar carga.`
    );
  }

  if (economic.recoveredRevenue > 0) {
    insights.push(
      `Se han recuperado ${economic.recoveredRevenue.toLocaleString("es-ES", { style: "currency", currency: "EUR" })} en ingresos estimados al reducir llamadas perdidas.`
    );
  }

  const missedCost = metrics.find((metric) => metric.id === "missedCallCost");
  if (missedCost) {
    insights.push(
      `Coste potencial de llamadas perdidas: ${missedCost.value}. Refuerza atención en horarios críticos.`
    );
  }

  return insights.slice(0, 6);
};

const withMovingAverage = (
  points: TrendPoint[],
  window = reportingConfig.movingAverageWindow
): TrendPoint[] => {
  if (window <= 1 || points.length === 0) {
    return points;
  }

  const clone = points.map((point) => ({ ...point }));
  for (let i = 0; i < clone.length; i += 1) {
    const start = Math.max(0, i - window + 1);
    const subset = clone.slice(start, i + 1);
    const average = subset.reduce((sum, current) => sum + current.calls, 0) / subset.length;
    clone[i].movingAverage = Number(average.toFixed(2));
  }
  return clone;
};

const fetchAllRecords = async <T extends { created_at: string }>(table: string, columns: string, range: DateRange): Promise<T[]> => {
  const pageSize = 1000;
  let from = 0;
  let results: T[] = [];

  while (true) {
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(table as any)
      .select(columns)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    const batch = (data as unknown as T[]) ?? [];
    results = results.concat(batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  // Filter by date range in code to avoid timezone issues
  return results.filter((record) => {
    const recordDate = new Date(record.created_at);
    return recordDate >= range.from && recordDate <= range.to;
  });
};

export const useAnalyticsReports = (
  range: DateRange,
  options: UseAnalyticsOptions = {}
): AnalyticsReportState => {
  const { profile, loading: profileLoading } = useUserProfile();
  const { t } = useLanguage();
  const [reportType, setReportType] = useState<ReportType>("executive");
  const [exportLoading, setExportLoading] = useState(false);

  const dateRange = useMemo(() => sanitizeRange(range), [range]);
  const comparisonRange = useMemo(
    () =>
      options.comparisonRange
        ? sanitizeRange(options.comparisonRange)
        : previousRangeFor(dateRange),
    [options.comparisonRange, dateRange]
  );

  const isSalutdental = useMemo(() => isSalutdentalClient(profile), [profile]);
  const clientLabel = useMemo(() => buildClientLabel(profile), [profile]);

  const tecnicsData = useTecnicsBcnCalls(dateRange, {
    enabled: Boolean(profile) && !isSalutdental,
  });
  const salutData = useSalutdentalCalls(dateRange, {
    enabled: Boolean(profile) && isSalutdental,
  });

  const activeData = isSalutdental ? salutData : tecnicsData;
  const includeScore = isSalutdental;
  const includeCost = !isSalutdental;

  const salutViewMode = salutData.viewMode;
  const salutHandleViewModeChange = salutData.handleViewModeChange;
  const tecnicsViewMode = tecnicsData.viewMode;
  const tecnicsHandleViewModeChange = tecnicsData.handleViewModeChange;

  const [comparisonStats, setComparisonStats] = useState<DashboardStats | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [callPerformance, setCallPerformance] = useState<CallPerformanceSummary | null>(null);
  const [ticketPerformance, setTicketPerformance] = useState<{
    statuses: TicketStatusSummary[];
    services: TicketServiceSummary[];
    agents: TicketAgentSummary[];
  }>({ statuses: [], services: [], agents: [] });
  const [availableFilters, setAvailableFilters] = useState({
    channels: [] as string[],
    services: [] as string[],
    agents: [] as string[],
  });
  const [economicSummary, setEconomicSummary] = useState<EconomicSummary | null>(null);
  const [benchmarks, setBenchmarks] = useState<BenchmarkSummary[]>([]);
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
  const [actionableInsights, setActionableInsights] = useState<string[]>([]);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [advancedLoading, setAdvancedLoading] = useState(false);

  useEffect(() => {
    if (!profile) {
      return;
    }

    if (isSalutdental) {
      if (salutViewMode !== "daily") {
        salutHandleViewModeChange?.("daily");
      }
    } else if (tecnicsViewMode !== "daily") {
      tecnicsHandleViewModeChange?.("daily");
    }
  }, [
    profile,
    isSalutdental,
    salutViewMode,
    salutHandleViewModeChange,
    tecnicsViewMode,
    tecnicsHandleViewModeChange,
  ]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    let cancelled = false;

    const loadAdvancedData = async () => {
      try {
        setAdvancedLoading(true);
        setAdvancedError(null);

        const tables = isSalutdental
          ? {
              calls: "call_logs_salutdental",
              tickets: "tickets_salutdental",
              callColumns: "id, created_at, call_duration_seconds, score, phone_id",
              ticketColumns: "id, created_at, ticket_type, ticket_status, user_name",
            }
          : {
              calls: "call_logs_tecnics_bcn_sat",
              tickets: "tickets_tecnics_bcn_sat",
              callColumns: "id, created_at, call_duration_seconds, call_cost, phone_id",
              ticketColumns: "id, created_at, ticket_type, ticket_status, user_name",
            };

        const [currentCalls, currentTickets, prevCalls, prevTickets] = await Promise.all([
          fetchAllRecords<RawCallRecord>(tables.calls, tables.callColumns, dateRange),
          fetchAllRecords<RawTicketRecord>(tables.tickets, tables.ticketColumns, dateRange),
          fetchAllRecords<RawCallRecord>(tables.calls, tables.callColumns, comparisonRange),
          fetchAllRecords<RawTicketRecord>(tables.tickets, tables.ticketColumns, comparisonRange),
        ]);

        if (cancelled) {
          return;
        }

        const currentStats = summarizeStats(currentCalls, currentTickets);
        const prevStats = summarizeStats(prevCalls, prevTickets);
        setComparisonStats(prevStats);

        const currentCallAnalytics = analyzeCalls(currentCalls);
        const prevCallAnalytics = analyzeCalls(prevCalls);

        const callPerformanceSummary: CallPerformanceSummary = {
          total: currentCallAnalytics.total,
          answered: currentCallAnalytics.answered,
          missed: currentCallAnalytics.missed,
          answeredRate: Number((currentCallAnalytics.answeredRate * 100).toFixed(1)),
          answeredDelta: calculateDelta(
            currentCallAnalytics.answeredRate,
            prevCallAnalytics.answeredRate
          ),
          missedDelta: calculateDelta(
            currentCallAnalytics.missed,
            prevCallAnalytics.missed
          ),
          answeredWithinHours: currentCallAnalytics.answeredWithinHours,
          answeredOutsideHours: currentCallAnalytics.answeredOutsideHours,
          withinHoursRate: Number((currentCallAnalytics.withinHoursRate * 100).toFixed(1)),
          outsideHoursRate: Number((currentCallAnalytics.outsideHoursRate * 100).toFixed(1)),
          responseDistribution: currentCallAnalytics.distribution,
          channels: currentCallAnalytics.channels,
        };
        setCallPerformance(callPerformanceSummary);

        const ticketAnalytics = analyzeTickets(currentTickets, prevTickets);
        setTicketPerformance(ticketAnalytics);

        setAvailableFilters({
          channels: callPerformanceSummary.channels.map((channel) => channel.channel),
          services: ticketAnalytics.services.map((service) => service.service),
          agents: ticketAnalytics.agents.map((agent) => agent.agent),
        });

        setHeatmap(buildHeatmap(currentCalls));

        const economic = computeEconomicSummary(
          currentStats,
          prevCallAnalytics,
          currentCallAnalytics
        );
        setEconomicSummary(economic);

        const benchmarkResults = computeBenchmarks(currentStats);
        setBenchmarks(benchmarkResults);

        const prioritiesList = buildPriorities(currentStats, ticketAnalytics, economic);
        setPriorities(prioritiesList);

        const baseMetrics = buildReportMetrics(currentStats, {
          includeCost,
          includeScore,
          previous: prevStats,
          callPerformance: {
            answeredWithinHours: currentCallAnalytics.answeredWithinHours,
            answeredOutsideHours: currentCallAnalytics.answeredOutsideHours,
            withinHoursRate: Number((currentCallAnalytics.withinHoursRate * 100).toFixed(1)),
            outsideHoursRate: Number((currentCallAnalytics.outsideHoursRate * 100).toFixed(1)),
          },
          economicImpact: economic,
          t,
        });
        setActionableInsights(
          computeActionableInsights(baseMetrics, ticketAnalytics, economic)
        );
      } catch (error) {
        console.error("Failed to load analytics advanced data", error);
        setAdvancedError(error instanceof Error ? error.message : "Error desconocido");
      } finally {
        if (!cancelled) {
          setAdvancedLoading(false);
        }
      }
    };

    loadAdvancedData();

    return () => {
      cancelled = true;
    };
  }, [
    profile,
    isSalutdental,
    dateRange,
    comparisonRange,
    includeCost,
    includeScore,
    t,
  ]);

  const metrics = useMemo(
    () =>
      buildReportMetrics(activeData.stats, {
        includeCost,
        includeScore,
        previous: comparisonStats ?? undefined,
        callPerformance: callPerformance ? {
          answeredWithinHours: callPerformance.answeredWithinHours,
          answeredOutsideHours: callPerformance.answeredOutsideHours,
          withinHoursRate: callPerformance.withinHoursRate,
          outsideHoursRate: callPerformance.outsideHoursRate,
        } : undefined,
        economicImpact: economicSummary ?? undefined,
        t,
      }),
    [activeData.stats, includeCost, includeScore, comparisonStats, callPerformance, economicSummary, t]
  );

  const trend = useMemo(() => {
    const points =
      activeData.hourlyVolume?.map((point) => ({
        label: point.hour,
        calls: point.calls,
        type: point.type,
      })) ?? [];

    const baseTrend = buildTrendPoints(points);
    return withMovingAverage(baseTrend);
  }, [activeData.hourlyVolume]);

  const statuses = useMemo(
    () => normalizeTicketStatuses(activeData.ticketStatuses ?? []),
    [activeData.ticketStatuses]
  );

  const ticketTypes = useMemo(
    () => normalizeTicketTypes(activeData.ticketTypes ?? []),
    [activeData.ticketTypes]
  );

  const combinedInsights = useMemo(
    () =>
      deriveInsights({
        metrics,
        trend,
        statuses,
        includeScore,
      }).concat(actionableInsights).slice(0, 6),
    [metrics, trend, statuses, includeScore, actionableInsights]
  );

  const exportReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      return;
    }

    try {
      setExportLoading(true);

      // Capture screenshots of dashboard charts
      const screenshots: {
        trendChart?: string;
        ticketStatusChart?: string;
        ticketTypesChart?: string;
        heatmapChart?: string;
      } = {};

      try {
        // Capture trend chart
        const trendChartElement = document.querySelector('[data-chart="trend"]') as HTMLElement;
        if (trendChartElement) {
          const canvas = await html2canvas(trendChartElement, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
          });
          screenshots.trendChart = canvas.toDataURL('image/png');
        }

        // Capture ticket status chart
        const ticketStatusElement = document.querySelector('[data-chart="ticket-status"]') as HTMLElement;
        if (ticketStatusElement) {
          const canvas = await html2canvas(ticketStatusElement, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
          });
          screenshots.ticketStatusChart = canvas.toDataURL('image/png');
        }

        // Capture ticket types chart
        const ticketTypesElement = document.querySelector('[data-chart="ticket-types"]') as HTMLElement;
        if (ticketTypesElement) {
          const canvas = await html2canvas(ticketTypesElement, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
          });
          screenshots.ticketTypesChart = canvas.toDataURL('image/png');
        }

        // Capture heatmap chart
        const heatmapElement = document.querySelector('[data-chart="heatmap"]') as HTMLElement;
        if (heatmapElement) {
          const canvas = await html2canvas(heatmapElement, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
          });
          screenshots.heatmapChart = canvas.toDataURL('image/png');
        }
      } catch (screenshotError) {
        console.warn('Failed to capture some chart screenshots:', screenshotError);
        // Continue with PDF generation even if screenshots fail
      }

      await generateReportPdf({
        clientName: clientLabel,
        reportType,
        dateRange,
        metrics,
        trend,
        statuses,
        types: ticketTypes,
        insights: combinedInsights,
        ticketPerformance,
        heatmap,
        callPerformance,
        screenshots,
      });
    } finally {
      setExportLoading(false);
    }
  };

  const exportExecutiveSummary = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      return;
    }

    await generateExecutiveSummaryPdf({
      clientName: clientLabel,
      dateRange,
      metrics,
      trend,
      statuses,
      ticketTypes,
      ticketServices: ticketPerformance.services,
      insights: combinedInsights,
      callPerformance: callPerformance ?? undefined,
      economicImpact: economicSummary ?? undefined,
      priorities,
      benchmarks,
    });
  };

  const exportExcel = async () => {
    await generateReportWorkbook({
      clientName: clientLabel,
      dateRange,
      metrics,
      statuses,
      ticketTypes,
      heatmap,
      segmentation: {
        channels: callPerformance?.channels ?? [],
        services: ticketPerformance.services.map((service) => ({
          service: service.service,
          tickets: service.count,
          resolved: service.closedCount,
          open: service.openCount + service.inProgressCount,
        })),
        agents: ticketPerformance.agents,
      },
      ticketPerformance,
      economicImpact: economicSummary ?? undefined,
      benchmarks,
    });
  };

  const loading = profileLoading || activeData.loading || advancedLoading;
  const error = activeData.error || advancedError;

  return {
    metrics,
    trend,
    statuses,
    ticketTypes,
    insights: combinedInsights,
    loading,
    error,
    reportType,
    setReportType,
    exportReport,
    exportExecutiveSummary,
    exportExcel,
    exportLoading,
    clientLabel,
    includeScore,
    comparisonStats,
    comparisonRange,
    heatmap,
    callPerformance,
    ticketPerformance,
    availableFilters,
    economicSummary,
    benchmarks,
    priorities,
  };
};
