import { TecnicsBcnDashboardStats, TicketStatusData as TecnicsTicketStatus, TicketTypeSlice as TecnicsTicketType } from "@/hooks/useTecnicsBcnCalls";
import { SalutdentalDashboardStats, TicketStatusData as SalutdentalTicketStatus, TicketTypeSlice as SalutdentalTicketType } from "@/hooks/useSalutdentalCalls";

export type DashboardStats = TecnicsBcnDashboardStats | SalutdentalDashboardStats;
export type GenericTicketStatus = TecnicsTicketStatus | SalutdentalTicketStatus;
export type GenericTicketType = TecnicsTicketType | SalutdentalTicketType;

export interface ReportMetric {
  id: string;
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  trend?: "up" | "down" | "flat";
  hint?: string;
}

export interface TrendPoint {
  label: string;
  calls: number;
  movingAverage?: number;
}

export interface NormalizedTicketStatus {
  label: string;
  count: number;
  percentage: number;
  color?: string;
}

export interface NormalizedTicketType {
  label: string;
  value: number;
  percentage: number;
}

const numberFormatter = new Intl.NumberFormat("es-ES");
const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const percentFormatter = new Intl.NumberFormat("es-ES", {
  style: "percent",
  maximumFractionDigits: 1,
});

const safeDivide = (numerator: number, denominator: number): number => {
  if (!denominator) {
    return 0;
  }
  return numerator / denominator;
};

const computeDelta = (current: number, previous?: number | null) => {
  if (previous === undefined || previous === null || previous === 0) {
    return { delta: null, trend: "flat" as const };
  }

  const rawChange = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(rawChange)) {
    return { delta: null, trend: "flat" as const };
  }

  const rounded = Number(rawChange.toFixed(1));
  if (Math.abs(rounded) < 0.1) {
    return { delta: 0, trend: "flat" as const };
  }

  return {
    delta: rounded,
    trend: rounded > 0 ? ("up" as const) : ("down" as const),
  };
};

export const formatDuration = (seconds: number): string => {
  if (!seconds) {
    return "0 min 0s";
  }
  const totalMinutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  return `${totalMinutes} min ${remainingSeconds}s`;
};

export const buildReportMetrics = (
  current: DashboardStats,
  options: {
    previous?: DashboardStats;
    includeCost?: boolean;
    includeScore?: boolean;
    callPerformance?: {
      answeredWithinHours: number;
      answeredOutsideHours: number;
      withinHoursRate: number;
      outsideHoursRate: number;
    };
    economicImpact?: {
      missedCalls: number;
      missedCallCost: number;
      automationSavings: number;
      humanSavings: number;
      recoveredRevenue: number;
      netImpact: number;
      roi: number | null;
    };
    t?: (key: string) => string;
  } = {}
): ReportMetric[] => {
  const { previous, includeCost = true, includeScore = false, callPerformance, economicImpact, t } = options;

  const metrics: ReportMetric[] = [];

  const totalCallsMetric = computeDelta(current.totalCalls, previous?.totalCalls);
  metrics.push({
    id: "totalCalls",
    label: t ? t("dashboard.totalCalls") : "Volumen de llamadas",
    value: numberFormatter.format(current.totalCalls),
    delta: totalCallsMetric.delta,
    deltaLabel:
      totalCallsMetric.delta !== null ? `${totalCallsMetric.delta}%` : undefined,
    trend: totalCallsMetric.trend,
  });

  const totalTicketsMetric = computeDelta(current.totalTickets, previous?.totalTickets);
  metrics.push({
    id: "totalTickets",
    label: t ? t("dashboard.totalTickets") : "Tickets creados",
    value: numberFormatter.format(current.totalTickets),
    delta: totalTicketsMetric.delta,
    deltaLabel:
      totalTicketsMetric.delta !== null ? `${totalTicketsMetric.delta}%` : undefined,
    trend: totalTicketsMetric.trend,
  });

  const ahtMetric = computeDelta(current.avgCallDuration, previous?.avgCallDuration);
  metrics.push({
    id: "avgHandleTime",
    label: t ? t("dashboard.avgCallDuration") : "Tiempo medio de gestión",
    value: formatDuration(current.avgCallDuration),
    delta: ahtMetric.delta,
    deltaLabel: ahtMetric.delta !== null ? `${ahtMetric.delta}%` : undefined,
    trend:
      ahtMetric.trend === "up"
        ? "down"
        : ahtMetric.trend === "down"
        ? "up"
        : "flat",
    hint: "",
  });

  // Total time KPI
  const totalTimeMetric = computeDelta(current.totalCallTime, previous?.totalCallTime);
  metrics.push({
    id: "totalCallTime",
    label: t ? t("dashboard.totalCallTime") : "Temps total",
    value: formatDuration(current.totalCallTime),
    delta: totalTimeMetric.delta,
    deltaLabel: totalTimeMetric.delta !== null ? `${totalTimeMetric.delta}%` : undefined,
    trend: totalTimeMetric.trend,
  });

  if (callPerformance) {
    // Within hours answered %
    metrics.push({
      id: "answeredWithinHoursRate",
      label: t ? t("dashboard.answeredWithinHours") : "% Trucades Ateses dins horari",
      value: percentFormatter.format(callPerformance.withinHoursRate / 100),
      trend: callPerformance.withinHoursRate >= 50 ? "up" : "down", // Assuming 50% is good
    });

    // Outside hours answered %
    metrics.push({
      id: "answeredOutsideHoursRate",
      label: t ? t("dashboard.answeredOutsideHours") : "% Trucades Ateses fora d'horari",
      value: percentFormatter.format(callPerformance.outsideHoursRate / 100),
      trend: callPerformance.outsideHoursRate >= 20 ? "up" : "down", // Assuming 20% is good for outside hours
    });
  }

  const resolutionRate = safeDivide(current.resolvedTickets, current.totalTickets);
  const previousResolutionRate = previous
    ? safeDivide(previous.resolvedTickets, previous.totalTickets)
    : undefined;
  const resolutionMetric = computeDelta(resolutionRate, previousResolutionRate);
  metrics.push({
    id: "resolutionRate",
    label: "Resoluci\u00F3n de tickets",
    value: percentFormatter.format(resolutionRate || 0),
    delta: resolutionMetric.delta,
    deltaLabel:
      resolutionMetric.delta !== null ? `${resolutionMetric.delta}%` : undefined,
    trend: resolutionMetric.trend,
    hint: "Tickets resueltos / total tickets",
  });

  const backlogMetric = computeDelta(current.openTickets, previous?.openTickets);
  metrics.push({
    id: "openTickets",
    label: "Tickets abiertos",
    value: numberFormatter.format(current.openTickets),
    delta: backlogMetric.delta,
    deltaLabel:
      backlogMetric.delta !== null ? `${backlogMetric.delta}%` : undefined,
    trend:
      backlogMetric.trend === "up"
        ? "down"
        : backlogMetric.trend === "down"
        ? "up"
        : "flat",
    hint: "Menor es mejor",
  });

  if (includeCost && "totalCost" in current) {
    const costMetric = computeDelta(current.totalCost ?? 0, previous?.totalCost ?? null);
    metrics.push({
      id: "totalCost",
      label: "Coste total",
      value: currencyFormatter.format(current.totalCost ?? 0),
      delta: costMetric.delta,
      deltaLabel:
        costMetric.delta !== null ? `${costMetric.delta}%` : undefined,
      trend:
        costMetric.trend === "up"
          ? "down"
          : costMetric.trend === "down"
          ? "up"
          : "flat",
      hint: "Coste estimado asociado al tiempo de llamada",
    });
  }

  if (includeScore && "avgScore" in current) {
    const previousScore =
      previous && "avgScore" in previous ? previous.avgScore ?? 0 : null;
    const scoreMetric = computeDelta(current.avgScore ?? 0, previousScore);
    metrics.push({
      id: "avgScore",
      label: "Satisfacci\u00F3n promedio",
      value: (current.avgScore ?? 0).toFixed(2),
      delta: scoreMetric.delta,
      deltaLabel:
        scoreMetric.delta !== null ? `${scoreMetric.delta}%` : undefined,
      trend: scoreMetric.trend,
      hint: "\u00CDndice de calidad percibida",
    });
  }

  if (economicImpact) {
    metrics.push({
      id: "missedCallCost",
      label: "Coste llamadas perdidas",
      value: currencyFormatter.format(economicImpact.missedCallCost),
      hint: `${economicImpact.missedCalls} incidencias abiertas pendientes de resolver`,
      trend: economicImpact.missedCallCost > 0 ? "down" : "flat",
    });
    metrics.push({
      id: "automationSavings",
      label: "Ahorro por automatizaci\u00F3n",
      value: currencyFormatter.format(economicImpact.automationSavings),
      hint: "Estimaci\u00F3n de ahorro generado por el agente virtual",
      trend: "up",
    });
    metrics.push({
      id: "humanSavings",
      label: "Ahorro humano estimado",
      value: currencyFormatter.format(economicImpact.humanSavings),
      hint: "Horas ahorradas x coste horario",
      trend: "up",
    });
    metrics.push({
      id: "recoveredRevenue",
      label: "Ingresos recuperados",
      value: currencyFormatter.format(economicImpact.recoveredRevenue),
      hint: "Estimaci\u00F3n por llamadas recuperadas",
      trend: "up",
    });
    metrics.push({
      id: "netImpact",
      label: "Impacto neto",
      value: currencyFormatter.format(economicImpact.netImpact),
      hint: "Ahorro - coste por llamadas sin atender",
      trend: economicImpact.netImpact >= 0 ? "up" : "down",
    });
  }

  const productivity = safeDivide(current.totalTickets, current.totalCalls);
  const previousProductivity = previous
    ? safeDivide(previous.totalTickets, previous.totalCalls)
    : undefined;
  const productivityMetric = computeDelta(productivity, previousProductivity);
  metrics.push({
    id: "ticketsPerCall",
    label: "Tickets por llamada",
    value: productivity ? productivity.toFixed(2) : "0.00",
    delta: productivityMetric.delta,
    deltaLabel:
      productivityMetric.delta !== null
        ? `${productivityMetric.delta}%`
        : undefined,
    trend: productivityMetric.trend,
    hint: "Ratio de tickets generados por llamada atendida",
  });

  return metrics;
};

export const buildTrendPoints = (
  volume: { label: string; calls: number; type?: "hourly" | "daily" }[]
): TrendPoint[] => {
  const accumulator = new Map<string, number>();

  volume.forEach(({ label, calls }) => {
    const key = label.trim();
    accumulator.set(key, (accumulator.get(key) ?? 0) + calls);
  });

  return Array.from(accumulator.entries()).map(([label, calls]) => ({ label, calls }));
};

export const normalizeTicketStatuses = (
  statuses: GenericTicketStatus[]
): NormalizedTicketStatus[] => {
  const total = statuses.reduce((sum, status) => sum + status.count, 0) || 1;

  return statuses.map((status) => ({
    label: status.status,
    count: status.count,
    percentage: Number(((status.count / total) * 100).toFixed(1)), // Convert to percentage
    color: (status as { color?: string }).color,
  }));
};

export const normalizeTicketTypes = (
  types: GenericTicketType[]
): NormalizedTicketType[] => {
  const total = types.reduce((sum, type) => sum + type.value, 0) || 1;

  return types.map((type) => ({
    label: type.type,
    value: type.value,
    percentage: Number(((type.value / total) * 100).toFixed(1)), // Convert to percentage
  }));
};

export const deriveInsights = (params: {
  metrics: ReportMetric[];
  trend: TrendPoint[];
  statuses: NormalizedTicketStatus[];
  includeScore?: boolean;
}): string[] => {
  const { metrics, trend, statuses } = params;
  const insights: string[] = [];

  const resolution = metrics.find((metric) => metric.id === "resolutionRate");
  if (resolution?.delta !== null && resolution.delta !== undefined) {
    if ((resolution.trend ?? "flat") === "up") {
      insights.push(
        `La resoluci\u00F3n de tickets mejora ${resolution.delta}% respecto al periodo anterior.`
      );
    } else if ((resolution.trend ?? "flat") === "down") {
      insights.push(
        `Atenci\u00F3n: la resoluci\u00F3n de tickets cae ${Math.abs(resolution.delta ?? 0)}%. Revisa flujos y SLA.`
      );
    }
  }

  const backlog = metrics.find((metric) => metric.id === "openTickets");
  if (backlog && parseInt(backlog.value.replace(/\./g, ""), 10) > 0) {
    insights.push(
      `Existen ${backlog.value} tickets abiertos. Prioriza los estados con mayor volumen para aliviar el backlog.`
    );
  }

  if (params.includeScore) {
    const score = metrics.find((metric) => metric.id === "avgScore");
    if (score) {
      insights.push(
        `La satisfacci\u00F3n promedio se sit\u00FAa en ${score.value}. Refuerza las franjas con mejor valoraci\u00F3n.`
      );
    }
  }

  if (trend.length > 0) {
    const peak = trend.reduce(
      (prev, current) => (current.calls > prev.calls ? current : prev),
      trend[0]
    );
    insights.push(
      `El pico de actividad se concentra en "${peak.label}" con ${peak.calls} llamadas. Considera reforzar el equipo en esa franja.`
    );
  }

  if (statuses.length > 0) {
    const highestStatus = statuses.reduce(
      (prev, current) => (current.percentage > prev.percentage ? current : prev),
      statuses[0]
    );
    insights.push(
      `El estado predominante es "${highestStatus.label}" (${highestStatus.percentage.toFixed(1)}%). Ajusta recursos para equilibrar el flujo.`
    );
  }

  return insights;
};
