import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { TooltipProps } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { PieChart as PieIcon, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface TicketTypeSlice {
  type: string;
  value: number;
}

export interface TicketStatusData {
  status: string;
  count: number;
  color: string;
}

type LegendEntry = { color?: string; payload?: { value?: number } };

interface EnhancedTicketChartProps {
  typeData: TicketTypeSlice[];
  statusData: TicketStatusData[];
  loading: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// High-contrast, theme-independent palette to avoid low-visibility slices on light backgrounds.
const DONUT_COLORS = [
  '#2563eb', // blue-600
  '#16a34a', // green-600
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#10b981', // emerald-500
  '#a855f7', // purple-500
  '#22c55e', // green-500
];

function shouldExcludeType(label: string) {
  const s = (label || '').toLowerCase();
  return [
    'llamada colgada',
    'llamada no finalizada',
    'sin finalizar',
    'trucada no finalitzada',
    'trucada penjada',
    'no finalitzada',
  ].some((kw) => s.includes(kw));
}

export default function EnhancedTicketChart({ typeData, statusData, loading, dateRange }: EnhancedTicketChartProps) {
  const { t } = useLanguage();
  // Normalized pretty label to avoid diacritics/encoding mismatches
  const prettyType2 = (raw: string) => {
    const s = (raw || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
    const map: Record<string, string> = {
      instalacion: t('ticketTypes.instalacion'),
      mantenimiento: t('ticketTypes.mantenimiento'),
      manteniment: t('ticketTypes.mantenimiento'),
      anomalia: t('ticketTypes.anomalia'),
      averia: t('ticketTypes.averia'),
      otros: t('ticketTypes.otros'),
      altres: t('ticketTypes.otros'),
      reparacion: t('ticketTypes.otros'),
      consulta: 'Consulta',
    };
    if (map[s]) return map[s];
    const cleaned = s.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  };
  // Pretty-print raw type labels into friendly UI labels
  const prettyType = (raw: string) => {
    const s = (raw || '').trim().toLowerCase();
    const map: Record<string, string> = {
      'instalacion': t('ticketTypes.instalacion'),
      'instal·lacio': t('ticketTypes.instalacion'),
      'instal·lació': t('ticketTypes.instalacion'),
      'mantenimiento': t('ticketTypes.mantenimiento'),
      'manteniment': t('ticketTypes.mantenimiento'),
      'anomalia': t('ticketTypes.anomalia'),
      'anomalía': t('ticketTypes.anomalia'),
      'averia': t('ticketTypes.averia'),
      'avería': t('ticketTypes.averia'),
      'otros': t('ticketTypes.otros'),
      'altres': t('ticketTypes.otros'),
      'reparacion': 'Reparación',
      'reparació': 'Reparació',
      'consulta': 'Consulta',
    };
    if (map[s]) return map[s];
    // Title Case fallback and replace separators
    const cleaned = s.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  };
  // Filter out non-finalized/hung-up tickets and sort by value desc for readability
  const filteredTypeData = typeData
    .filter((item) => !shouldExcludeType(item.type))
    .sort((a, b) => b.value - a.value);
  // Build chart data with pretty labels
  const chartTypeData = filteredTypeData.map((d) => ({ label: prettyType2(d.type), value: d.value }));
  const total = chartTypeData.reduce((sum, item) => sum + item.value, 0);
  const statusTotal = statusData.reduce((sum, item) => sum + item.count, 0);

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const currentValue = payload[0].value;
      const total = chartTypeData.reduce((sum: number, item: { value: number }) => sum + item.value, 0);
      const percentage = total > 0 ? ((currentValue / total) * 100).toFixed(1) : '0';
      
      return (
        <div className="bg-card/95 backdrop-blur-sm border rounded-lg p-3 shadow-elegant">
          <p className="font-medium">{payload[0].payload.label}</p>
          <p className="text-sm text-muted-foreground">
            {currentValue} tickets ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border rounded-lg p-3 shadow-elegant">
          <p className="font-medium">{label}</p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            {payload[0].value} tickets
          </p>
        </div>
      );
    }
    return null;
  };

  const getDateRangeDescription = () => {
    if (!dateRange) return t('dashboard.categoryDistribution');
    
    const isSameDay = dateRange.from.toDateString() === dateRange.to.toDateString();
    
    if (isSameDay) {
      return t('dashboard.distributionOfDate', { date: dateRange.from.toLocaleDateString() });
    } else {
      return t('dashboard.distributionOfRange', { 
        from: dateRange.from.toLocaleDateString(), 
        to: dateRange.to.toLocaleDateString() 
      });
    }
  };

  const getStatusDateRangeDescription = () => {
    if (!dateRange) return t('dashboard.resolutionProgress');
    
    const isSameDay = dateRange.from.toDateString() === dateRange.to.toDateString();
    
    if (isSameDay) {
      return t('dashboard.progressOfDate', { date: dateRange.from.toLocaleDateString() });
    } else {
      return t('dashboard.progressOfRange', { 
        from: dateRange.from.toLocaleDateString(), 
        to: dateRange.to.toLocaleDateString() 
      });
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Donut Chart for Ticket Types */}
      <Card data-chart="ticket-types" className="group hover:shadow-glow transition-all duration-500 bg-gradient-card border-primary/20 hover:border-primary/40">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-semibold">{t('dashboard.ticketTypes')}</CardTitle>
          </div>
          <CardDescription>{getDateRangeDescription()}</CardDescription>
          {total > 0 && (
            <Badge variant="secondary" className="w-fit">
              Total: {total} tickets
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : typeData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <p>{t('dashboard.noDataToday')}</p>
            </div>
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={chartTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={108}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="label"
                  >
                    {chartTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={40}
                    formatter={(value, entry: LegendEntry) => {
                      const count = entry.payload?.value ?? 0;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <span style={{ color: entry.color }} className="text-sm">
                          {value} {t('dashboard.legendFormat', { percentage: pct, count })}
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bar Chart for Ticket Status */}
      <Card data-chart="ticket-status" className="group hover:shadow-success transition-all duration-500 bg-gradient-card border-success/20 hover:border-success/40">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-success" />
            <CardTitle className="text-lg font-semibold">{t('dashboard.ticketStatus')}</CardTitle>
          </div>
          <CardDescription>{getStatusDateRangeDescription()}</CardDescription>
          {statusTotal > 0 && (
            <Badge variant="outline" className="w-fit border-success/40 text-success">
              Total: {statusTotal} tickets
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-success"></div>
            </div>
          ) : statusData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <p>{t('dashboard.noDataToday')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="status" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]}
                  fill="hsl(var(--success))"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
