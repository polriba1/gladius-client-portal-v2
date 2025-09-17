import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CallVolumeHeatmap } from "@/components/dashboard/CallVolumeHeatmap";
import { useAnalyticsReports } from "@/hooks/useAnalyticsReports";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DateRange } from "@/components/dashboard/DateRangeControls";
import {
  ComposedChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  BarChart,
} from "recharts";
import {
  CalendarDays,
  CalendarRange,
  Loader2,
  Phone,
  Clock,
  Timer,
  Sun,
  Moon,
  Ticket,
  Euro,
} from "lucide-react";

const createInitialRange = (): DateRange => {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  return { from, to };
};

const quickRanges = [7, 30, 90];

const KPI_ORDER = [
  "totalCalls",
  "avgHandleTime",
  "totalCallTime",
  "answeredWithinHoursRate",
  "answeredOutsideHoursRate",
  "totalTickets",
  "totalCost",
] as const;

const CALL_METRIC_IDS = new Set([
  "totalCalls",
  "avgHandleTime",
  "totalCallTime",
  "answeredWithinHoursRate",
  "answeredOutsideHoursRate",
]);

const TICKET_METRIC_IDS = new Set(["totalTickets", "totalCost"]);

type ReportMode = "executive" | "operational" | "quality";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("es-ES").format(value);
const formatDateInput = (value: Date) => value.toISOString().slice(0, 10);
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    value,
  );

const getKPICardConfig = (metricId: string) => {
  const configs = {
    totalCalls: {
      icon: Phone,
    },
    avgHandleTime: {
      icon: Clock,
    },
    totalCallTime: {
      icon: Timer,
    },
    answeredWithinHoursRate: {
      icon: Sun,
    },
    answeredOutsideHoursRate: {
      icon: Moon,
    },
    totalTickets: {
      icon: Ticket,
    },
    totalCost: {
      icon: Euro,
    },
  } as const;

  return (
    configs[metricId as keyof typeof configs] ?? {
      icon: Phone,
    }
  );
};

const TICKET_TYPE_COLORS = [
  "#2563eb",
  "#f97316",
  "#16a34a",
  "#0ea5e9",
  "#a855f7",
  "#f43f5e",
  "#facc15",
  "#475569",
];

const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

const InformesEstadisticas = () => {
  const [dateRange, setDateRange] = useState<DateRange>(createInitialRange);
  const { t } = useLanguage();

  const {
    metrics,
    trend,
    statuses,
    ticketTypes,
    loading,
    error,
    heatmap,
    ticketPerformance,
  } = useAnalyticsReports(dateRange);
  const summaryKpis = useMemo(() => {
    const map = new Map(metrics.map((metric) => [metric.id, metric]));
    return KPI_ORDER.map((id) => map.get(id)).filter(Boolean) as typeof metrics;
  }, [metrics]);

  const { heroMetric, secondaryCallMetrics, ticketMetrics } = useMemo(() => {
    const callMetricsList = summaryKpis.filter((metric) =>
      CALL_METRIC_IDS.has(metric.id),
    );
    const hero =
      callMetricsList.find((metric) => metric.id === "totalCalls") ?? null;
    const secondary = callMetricsList.filter(
      (metric) => metric.id !== "totalCalls",
    );
    const ticket = summaryKpis.filter((metric) =>
      TICKET_METRIC_IDS.has(metric.id),
    );

    return {
      heroMetric: hero,
      secondaryCallMetrics: secondary,
      ticketMetrics: ticket,
    };
  }, [summaryKpis]);

  const renderHeroMetric = () => {
    if (!heroMetric) {
      return null;
    }

    const { icon: HeroIcon } = getKPICardConfig(heroMetric.id);

    return (
      <Card className="relative overflow-hidden border-0 bg-gradient-primary text-white shadow-glow">
        <CardContent className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <HeroIcon className="h-6 w-6" />
                </span>
                <p className="text-base font-semibold text-white/85">
                  {heroMetric.label}
                </p>
              </div>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-5xl font-black leading-none tracking-tight">
                  {heroMetric.value}
                </span>
              </div>
            </div>
            {heroMetric.hint && (
              <p className="max-w-xs text-sm leading-relaxed text-white/80">
                {heroMetric.hint}
              </p>
            )}
          </div>
          <div className="pointer-events-none absolute -right-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
        </CardContent>
      </Card>
    );
  };

  const chartData = useMemo(
    () =>
      trend.map((point) => ({
        label: point.label,
        llamadas: point.calls,
        tendencia: point.movingAverage ?? null,
      })),
    [trend],
  );

  const totalCalls = useMemo(
    () => trend.reduce((sum, point) => sum + point.calls, 0),
    [trend],
  );

  const handleDateChange = (field: "from" | "to", value: string) => {
    if (!value) return;
    const next = new Date(value);
    if (Number.isNaN(next.getTime())) return;

    setDateRange((prev) => {
      const updated: DateRange = {
        ...prev,
        [field]: new Date(
          next.getFullYear(),
          next.getMonth(),
          next.getDate(),
          field === "from" ? 0 : 23,
          field === "from" ? 0 : 59,
          field === "from" ? 0 : 59,
          field === "from" ? 0 : 999,
        ),
      };

      if (updated.from > updated.to) {
        if (field === "from") {
          updated.to = new Date(updated.from);
          updated.to.setHours(23, 59, 59, 999);
        } else {
          updated.from = new Date(updated.to);
          updated.from.setHours(0, 0, 0, 0);
        }
      }

      return updated;
    });
  };

  const handleQuickRange = (days: number) => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date(to);
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);
    setDateRange({ from, to });
  };
  return (
    <div className="space-y-6">
      {/* 1. Filters & Export */}
      <section className="space-y-4 border-b pb-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900">
            {t("reports.title")}
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            {t("reports.subtitle")}
          </p>
        </div>

        <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
          {/* Date Range Controls */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
              <CalendarRange className="h-4 w-4 text-primary" />
              <input
                type="date"
                value={formatDateInput(dateRange.from)}
                className="bg-transparent text-sm text-slate-700 focus:outline-none"
                onChange={(event) =>
                  handleDateChange("from", event.target.value)
                }
              />
              <span className="text-muted-foreground">a</span>
              <input
                type="date"
                value={formatDateInput(dateRange.to)}
                className="bg-transparent text-sm text-slate-700 focus:outline-none"
                onChange={(event) => handleDateChange("to", event.target.value)}
              />
            </div>

            <div className="flex gap-2">
              {quickRanges.map((days) => (
                <Button
                  key={days}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickRange(days)}
                  className="text-xs"
                >
                  {t(`reports.quickRanges.${days}days`)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>{t("common.error")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-80" />
          <div className="grid lg:grid-cols-2 gap-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 2. Key KPIs + Variation */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-slate-900">
                {t("reports.keyIndicators")}
              </h2>
            </div>
            <div className="space-y-4">
              {renderHeroMetric()}
              {secondaryCallMetrics.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {secondaryCallMetrics.map((metric) => {
                    const { icon: Icon } = getKPICardConfig(metric.id);

                    return (
                      <Card
                        key={metric.id}
                        className="relative overflow-hidden border border-primary/15 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                      >
                        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-primary" />
                        <CardHeader className="space-y-3 pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Icon className="h-5 w-5" />
                            </span>
                          </div>
                          <div>
                            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              {metric.label}
                            </CardDescription>
                            <CardTitle className="mt-1 text-3xl font-bold text-slate-900">
                              {metric.value}
                              {(metric.id === "answeredWithinHoursRate" ||
                                metric.id === "answeredOutsideHoursRate") && (
                                <span className="text-sm font-normal text-slate-600 ml-2">
                                  ({formatNumber(Math.round(totalCalls * (parseFloat(metric.value.replace("%", "").replace(",", ".")) / 100)))} {t("reports.calls.calls")})
                                </span>
                              )}
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          {metric.hint && (
                            <p className="text-xs leading-relaxed text-slate-600">
                              {metric.hint}
                            </p>
                          )}
                          {(metric.id === "answeredWithinHoursRate" ||
                            metric.id === "answeredOutsideHoursRate") && (
                            <div className="pt-1">
                              <div className="h-1.5 w-full rounded-full bg-slate-100">
                                <div
                                  className="h-1.5 rounded-full bg-gradient-primary transition-all duration-500"
                                  style={{
                                    width: `${parseFloat(metric.value.replace("%", ""))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              {ticketMetrics.length > 0 && (
                <div className="grid gap-4 grid-cols-2">
                  {ticketMetrics.map((metric) => {
                    const { icon: Icon } = getKPICardConfig(metric.id);

                    return (
                      <Card
                        key={metric.id}
                        className="border border-slate-200 bg-slate-50/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                      >
                        <CardHeader className="space-y-3 pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-inner">
                              <Icon className="h-5 w-5" />
                            </span>
                          </div>
                          <div>
                            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              {metric.label}
                            </CardDescription>
                            <CardTitle className="mt-1 text-3xl font-bold text-slate-900">
                              {metric.value}
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {metric.hint && (
                            <p className="text-xs leading-relaxed text-slate-600">
                              {metric.hint}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* 3. Calls */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">
                {t("reports.calls.title")}
              </h2>
              <span className="text-sm text-muted-foreground">
                {t("reports.calls.totalVolume")}: {formatNumber(totalCalls)}
              </span>
            </div>

            <div className="grid gap-4">
              {/* Tendency Line Chart */}
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t("reports.calls.trendLine")}
                  </CardTitle>
                  <CardDescription>
                    {trend.length > 0
                      ? t("reports.calls.trendDescription")
                      : t("reports.calls.noData")}
                  </CardDescription>
                </CardHeader>
                <CardContent data-chart="trend">
                  {chartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      {t("reports.calls.noData")}
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="label"
                            stroke="#64748b"
                            fontSize={12}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            allowDecimals={false}
                          />
                          <Tooltip
                            formatter={(value: number) => [
                              `${(value as number)?.toFixed?.(0)} ${t("reports.calls.calls")}`,
                              t("reports.calls.movingAverage"),
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="tendencia"
                            stroke="#f97316"
                            strokeWidth={3}
                            dot={{ fill: "#f97316", strokeWidth: 2, r: 4 }}
                            activeDot={{
                              r: 6,
                              stroke: "#f97316",
                              strokeWidth: 2,
                            }}
                            name={t("reports.calls.movingAverage")}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Histogram Chart */}
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {t("reports.calls.histogram")}
                      </CardTitle>
                      <CardDescription>
                        {trend.length > 0
                          ? t("reports.calls.histogramDescription")
                          : t("reports.calls.noData")}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {chartData.length === 0 ? (
                    <div className="h-72 flex items-center justify-center text-muted-foreground">
                      {t("reports.calls.noData")}
                    </div>
                  ) : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="label"
                            stroke="#64748b"
                            fontSize={12}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            allowDecimals={false}
                          />
                          <Tooltip
                            formatter={(value: number) => [
                              `${value} ${t("reports.calls.calls")}`,
                              t("reports.calls.calls"),
                            ]}
                          />
                          <Bar
                            dataKey="llamadas"
                            fill="#2563eb"
                            name={t("reports.calls.calls")}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("reports.calls.heatmap")}
                </CardTitle>
                <CardDescription>
                  {t("reports.calls.heatmapDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent data-chart="heatmap">
                {heatmap.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    {t("reports.calls.noData")}
                  </div>
                ) : (
                  <CallVolumeHeatmap data={heatmap} />
                )}
              </CardContent>
            </Card>
          </section>
          {/* 4. Tickets */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">
                {t("reports.tickets.title")}
              </h2>
              <span className="text-sm text-muted-foreground">
                {t("reports.tickets.total")}:{" "}
                {formatNumber(
                  ticketPerformance.statuses.reduce(
                    (sum, s) => sum + s.count,
                    0,
                  ),
                )}
              </span>
            </div>

            {/* Status Breakdown */}
            <div className="grid gap-4 md:grid-cols-3">
              {ticketPerformance.statuses.map((status) => (
                <Card
                  key={status.status}
                  className="border border-slate-200 shadow-sm"
                >
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">
                      {status.label}
                    </CardDescription>
                    <CardTitle className="text-2xl text-slate-900">
                      {formatNumber(status.count)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground flex items-center justify-between">
                    <span>
                      {status.percentage}% {t("reports.tickets.ofTotal")}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Status Chart for PDF capture */}
            <div
              style={{
                position: "absolute",
                left: "-9999px",
                top: "-9999px",
                width: "400px",
                height: "200px",
              }}
            >
              <div data-chart="ticket-status">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={ticketPerformance.statuses.map((s) => ({
                      label: s.label,
                      value: s.count,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `${value} ${t("reports.tickets.tickets")}`,
                        t("reports.tickets.count"),
                      ]}
                    />
                    <Bar dataKey="value" fill="#2563eb" name="Tickets" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Processed vs Unprocessed Tickets by Type */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-wide text-green-600 font-medium">
                    {t("reports.tickets.processedByType")}
                  </CardDescription>
                  <CardTitle className="text-2xl text-slate-900">
                    {formatNumber(
                      ticketPerformance.statuses.find(
                        (s) => s.status === "closed",
                      )?.count || 0,
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div className="space-y-1">
                    {(() => {
                      // Mostrar servicios con tickets cerrados
                      const servicesWithClosed = ticketPerformance.services
                        .filter((service) => service.closedCount > 0)
                        .sort((a, b) => b.closedCount - a.closedCount);

                      return servicesWithClosed.map((service) => {
                        const totalTickets = ticketPerformance.statuses.reduce(
                          (sum, s) => sum + s.count,
                          0,
                        );
                        const percentage =
                          totalTickets > 0
                            ? (service.closedCount / totalTickets) * 100
                            : 0;

                        return (
                          <div
                            key={service.service}
                            className="flex justify-between text-xs"
                          >
                            <span>{service.service}:</span>
                            <span className="font-medium">
                              {formatNumber(service.closedCount)} (
                              {percentage.toFixed(1)}%)
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-wide text-orange-600 font-medium">
                    {t("reports.tickets.pendingByType")}
                  </CardDescription>
                  <CardTitle className="text-2xl text-slate-900">
                    {formatNumber(
                      (ticketPerformance.statuses.find(
                        (s) => s.status === "open",
                      )?.count || 0) +
                        (ticketPerformance.statuses.find(
                          (s) => s.status === "in_progress",
                        )?.count || 0),
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div className="space-y-1">
                    {(() => {
                      // Mostrar servicios con tickets pendientes
                      const servicesWithPending = ticketPerformance.services
                        .filter(
                          (service) =>
                            service.openCount + service.inProgressCount > 0,
                        )
                        .sort(
                          (a, b) =>
                            b.openCount +
                            b.inProgressCount -
                            (a.openCount + a.inProgressCount),
                        );

                      return servicesWithPending.map((service) => {
                        const pendingCount =
                          service.openCount + service.inProgressCount;
                        const totalTickets = ticketPerformance.statuses.reduce(
                          (sum, s) => sum + s.count,
                          0,
                        );
                        const percentage =
                          totalTickets > 0
                            ? (pendingCount / totalTickets) * 100
                            : 0;

                        return (
                          <div
                            key={service.service}
                            className="flex justify-between text-xs"
                          >
                            <span>{service.service}:</span>
                            <span className="font-medium">
                              {formatNumber(pendingCount)} (
                              {percentage.toFixed(1)}%)
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ticket Types Pie Chart and List */}
            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="border border-slate-200 shadow-sm lg:col-span-3">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {t("reports.tickets.distributionByType")}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {t("reports.tickets.distributionDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0" data-chart="ticket-types">
                  {ticketTypes.length === 0 ? (
                    <div className="h-80 flex items-center justify-center text-muted-foreground">
                      {t("reports.tickets.noTypeData")}
                    </div>
                  ) : (
                    <div className="h-[420px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart
                          margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
                        >
                          <Pie
                            data={ticketTypes}
                            cx="50%"
                            cy="50%"
                            outerRadius={140}
                            innerRadius={75}
                            paddingAngle={2}
                            cornerRadius={6}
                            dataKey="value"
                            nameKey="label"
                            label={({ label, percentage }) =>
                              percentage >= 6
                                ? `${label} (${percentage.toFixed(1)}%)`
                                : ""
                            }
                            labelLine={false}
                          >
                            {ticketTypes.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  TICKET_TYPE_COLORS[
                                    index % TICKET_TYPE_COLORS.length
                                  ]
                                }
                                stroke="#ffffff"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [
                              `${formatNumber(value)} ${t("reports.tickets.open")}`,
                              name,
                            ]}
                            labelFormatter={(label: string) => label}
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              boxShadow:
                                "0 8px 24px -12px rgba(15, 23, 42, 0.45)",
                              fontSize: "12px",
                              padding: "10px 14px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {t("reports.tickets.byType")}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {t("reports.tickets.detail")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {ticketTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("reports.tickets.noData")}
                    </p>
                  ) : (
                    <>
                      <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-center">
                        <div className="text-lg font-semibold text-slate-900">
                          {formatNumber(
                            ticketTypes.reduce(
                              (sum, item) => sum + item.value,
                              0,
                            ),
                          )}
                        </div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {t("reports.tickets.open")}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {ticketTypes.map((type, index) => {
                          const color =
                            TICKET_TYPE_COLORS[
                              index % TICKET_TYPE_COLORS.length
                            ];
                          return (
                            <div
                              key={type.label}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/70 px-3 py-2 shadow-sm transition-colors hover:border-slate-300"
                            >
                              <div className="flex items-center gap-3 truncate">
                                <span
                                  className="inline-flex h-3.5 w-3.5 rounded-full"
                                  style={{
                                    backgroundColor: color,
                                    boxShadow: `0 0 0 4px ${color}20`,
                                  }}
                                />
                                <span className="text-sm font-medium text-slate-800 truncate">
                                  {type.label}
                                </span>
                              </div>
                              <div className="flex items-end gap-3 text-right">
                                <div className="min-w-[3.5rem]">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {formatNumber(type.value)}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {formatPercentage(type.percentage)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default InformesEstadisticas;
