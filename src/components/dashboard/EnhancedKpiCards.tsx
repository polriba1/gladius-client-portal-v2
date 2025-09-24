import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Phone, Clock, Euro, TrendingUp, Users, Info } from "lucide-react";
import Sparkline from "./Sparkline";
import { useLanguage } from "@/contexts/LanguageContext";

interface EnhancedKpiCardsProps {
  loading: boolean;
  totalCalls: number;
  openTickets: number;
  ahtSeconds: number;
  totalSeconds: number;
  costEuros: number;
  ticketsResolved: number;
  sparklineData?: number[];
  hideCost?: boolean;
  dateRange?: { from: Date; to: Date };
}

function formatMMSS(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}m ${s}s`;
}

function formatHoursMinutes(totalSeconds: number) {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

export default function EnhancedKpiCards({ 
  loading, 
  totalCalls, 
  openTickets, 
  ahtSeconds, 
  totalSeconds, 
  costEuros, 
  ticketsResolved,
  sparklineData = [],
  hideCost = false,
  dateRange
}: EnhancedKpiCardsProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      {/* Hero KPI - Total Calls with Prominence */}
      <Card className="relative overflow-hidden bg-gradient-primary border-0 shadow-glow hover:shadow-[0_0_60px_hsl(var(--primary)_/_0.3)] transition-all duration-500">
        <div className="absolute inset-0 bg-primary/5"></div>
        <CardContent className="relative p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Phone className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white/90">{t('dashboard.totalCalls')}</h2>
                  {dateRange && dateRange.from && dateRange.to && (
                    <p className="text-white/70">
                      {dateRange.from.toLocaleDateString('ca-ES')} - {dateRange.to.toLocaleDateString('ca-ES')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-6xl font-black text-white tracking-tight">
                  {loading ? '...' : totalCalls.toLocaleString()}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {t('dashboard.mainKpi')}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('dashboard.totalCallsTooltip')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secondary KPIs Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${hideCost ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-6`}>
        {/* Average Call Duration */}
        <Card className="group hover:shadow-glow transition-all duration-300 bg-gradient-card border-primary/20 hover:border-primary/40">
          <CardHeader className="space-y-1 pb-3">
            <div className="flex items-center justify-between">
              <Clock className="w-5 h-5 text-primary" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                  </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('dashboard.ahtTooltip')}</p>
                    </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.avgCallDuration')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-primary">
                {loading ? '...' : formatMMSS(ahtSeconds)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Call Time */}
        <Card className="group hover:shadow-glow transition-all duration-300 bg-gradient-card border-primary/20 hover:border-primary/40">
          <CardHeader className="space-y-1 pb-3">
            <div className="flex items-center justify-between">
              <TrendingUp className="w-5 h-5 text-primary" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                  </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('dashboard.totalTimeTooltip')}</p>
                    </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.totalTime')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary mb-1">
              {loading ? '...' : formatHoursMinutes(totalSeconds)}
            </div>
          </CardContent>
        </Card>

        {/* Cost */}
        {!hideCost && (
        <Card className="group hover:shadow-warning transition-all duration-300 bg-gradient-card border-warning/20 hover:border-warning/40">
          <CardHeader className="space-y-1 pb-3">
            <div className="flex items-center justify-between">
              <Euro className="w-5 h-5 text-warning" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-warning transition-colors" />
                  </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('dashboard.costTooltip')}</p>
                    </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.cost')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning mb-1">
              {loading ? '...' : new Intl.NumberFormat(t('common.locale'), { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(costEuros)}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Open Tickets */}
        <Card className="group hover:shadow-glow transition-all duration-300 bg-gradient-card border-primary/20 hover:border-primary/40">
          <CardHeader className="space-y-1 pb-3">
            <div className="flex items-center justify-between">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.activeTickets')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary mb-1">
              {loading ? '...' : openTickets}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}