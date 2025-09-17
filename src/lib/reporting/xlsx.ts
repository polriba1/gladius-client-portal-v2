import { utils, writeFileXLSX } from "xlsx";
import type {
  ReportMetric,
  NormalizedTicketStatus,
  NormalizedTicketType,
} from "@/lib/reporting/metrics";

interface WorkbookPayload {
  clientName?: string;
  dateRange: { from: Date; to: Date };
  metrics: ReportMetric[];
  statuses: NormalizedTicketStatus[];
  ticketTypes: NormalizedTicketType[];
  heatmap: {
    day: string;
    hour: number;
    calls: number;
    avgDuration: number;
  }[];
  segmentation: {
    channels: { channel: string; calls: number; avgDuration: number }[];
    services: { service: string; tickets: number; resolved: number; open: number }[];
    agents: { agent: string; tickets: number; resolved: number; open: number }[];
  };
  ticketPerformance?: {
    statuses: { status: string; label: string; count: number; percentage: number }[];
    services: {
      service: string;
      count: number;
      percentage: number;
      closedCount: number;
      openCount: number;
      inProgressCount: number;
      closedPercentage: number;
      pendingPercentage: number;
    }[];
  };
  economicImpact?: {
    missedCalls: number;
    missedCallCost: number;
    automationSavings: number;
    netImpact: number;
  };
  benchmarks: { metric: string; percentile: number; cohort: string; message: string }[];
}

const toLocaleDate = (date: Date) =>
  date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const generateReportWorkbook = async (payload: WorkbookPayload) => {
  const {
    clientName,
    dateRange,
    metrics,
    statuses,
    ticketTypes,
    heatmap,
    segmentation,
    ticketPerformance,
    economicImpact,
    benchmarks,
  } = payload;

  const workbook = utils.book_new();
  const metaSheet = utils.aoa_to_sheet([
    ["Cliente", clientName ?? "N/A"],
    ["Periodo", `${toLocaleDate(dateRange.from)} - ${toLocaleDate(dateRange.to)}`],
  ]);
  utils.book_append_sheet(workbook, metaSheet, "Resumen");

  const kpiSheet = utils.json_to_sheet(
    metrics.map((metric) => ({
      KPI: metric.label,
      Valor: metric.value,
      Variacion: metric.deltaLabel ?? "--",
      Tendencia: metric.trend ?? "--",
      Comentario: metric.hint ?? "",
    }))
  );
  utils.book_append_sheet(workbook, kpiSheet, "KPIs");

  const statusSheet = utils.json_to_sheet(
    statuses.map((status) => ({
      Estado: status.label,
      Tickets: status.count,
      Porcentaje: status.percentage,
    }))
  );
  utils.book_append_sheet(workbook, statusSheet, "Estados tickets");

  // Add detailed ticket performance breakdown
  if (ticketPerformance) {
    const processedServicesSheet = utils.json_to_sheet(
      ticketPerformance.services
        .filter(service => service.closedCount > 0)
        .map((service) => ({
          Servicio: service.service,
          Total: service.count,
          Procesados: service.closedCount,
          "Porcentaje Procesado": service.closedPercentage,
        }))
    );
    utils.book_append_sheet(workbook, processedServicesSheet, "Tickets Procesados");

    const pendingServicesSheet = utils.json_to_sheet(
      ticketPerformance.services
        .filter(service => (service.openCount + service.inProgressCount) > 0)
        .map((service) => ({
          Servicio: service.service,
          Total: service.count,
          Pendientes: service.openCount + service.inProgressCount,
          Abiertos: service.openCount,
          "En Progreso": service.inProgressCount,
          "Porcentaje Pendiente": service.pendingPercentage,
        }))
    );
    utils.book_append_sheet(workbook, pendingServicesSheet, "Tickets Pendientes");
  }

  const typesSheet = utils.json_to_sheet(
    ticketTypes.map((type) => ({
      Tipo: type.label,
      Tickets: type.value,
      Porcentaje: type.percentage,
    }))
  );
  utils.book_append_sheet(workbook, typesSheet, "Tipos tickets");

  const heatmapSheet = utils.json_to_sheet(
    heatmap.map((cell) => ({
      Dia: cell.day,
      Hora: cell.hour,
      Llamadas: cell.calls,
      "Duracion media (s)": cell.avgDuration,
    }))
  );
  utils.book_append_sheet(workbook, heatmapSheet, "Heatmap");

  const channelsSheet = utils.json_to_sheet(
    segmentation.channels.map((channel) => ({
      Canal: channel.channel,
      Llamadas: channel.calls,
      "Duracion media (s)": channel.avgDuration,
    }))
  );
  utils.book_append_sheet(workbook, channelsSheet, "Canales");

  const servicesSheet = utils.json_to_sheet(
    segmentation.services.map((service) => ({
      Servicio: service.service,
      Tickets: service.tickets,
      Resueltos: service.resolved,
      Abiertos: service.open,
    }))
  );
  utils.book_append_sheet(workbook, servicesSheet, "Servicios");

  const agentsSheet = utils.json_to_sheet(
    segmentation.agents.map((agent) => ({
      Agente: agent.agent,
      Tickets: agent.tickets,
      Resueltos: agent.resolved,
      Abiertos: agent.open,
    }))
  );
  utils.book_append_sheet(workbook, agentsSheet, "Agentes");

  if (economicImpact) {
    const economicsSheet = utils.aoa_to_sheet([
      ["Coste llamadas perdidas", economicImpact.missedCallCost],
      ["Ahorro automatizacion", economicImpact.automationSavings],
      ["Impacto neto", economicImpact.netImpact],
      ["Llamadas perdidas", economicImpact.missedCalls],
    ]);
    utils.book_append_sheet(workbook, economicsSheet, "Economia");
  }

  if (benchmarks.length > 0) {
    const benchmarkSheet = utils.json_to_sheet(
      benchmarks.map((item) => ({
        Metrica: item.metric,
        Percentil: item.percentile,
        Cohorte: item.cohort,
        Comentario: item.message,
      }))
    );
    utils.book_append_sheet(workbook, benchmarkSheet, "Benchmark");
  }

  const fileName = `informe-analitico-${toLocaleDate(dateRange.to)}.xlsx`;
  writeFileXLSX(workbook, fileName);
};
