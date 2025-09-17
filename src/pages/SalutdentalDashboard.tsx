import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EnhancedKpiCards from '@/components/dashboard/EnhancedKpiCards';
import EnhancedLatestCallsTable from '@/components/dashboard/EnhancedLatestCallsTable';
import EnhancedTicketChart from '@/components/dashboard/EnhancedTicketChart';
import HourlyCallVolumeChart from '@/components/dashboard/HourlyCallVolumeChart';
import DateRangeControls from '@/components/dashboard/DateRangeControls';
import { useSalutdentalCalls } from '@/hooks/useSalutdentalCalls';
import { useLanguage } from "@/contexts/LanguageContext";

// Helper function to get locale string from language
const getLocale = (language: string): string => {
  switch (language) {
    case 'ca': return 'ca-ES';
    case 'es': return 'es-ES';
    default: return 'es-ES';
  }
};

const SalutdentalDashboard = () => {
  const { t, language } = useLanguage();
  const locale = getLocale(language);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [urgentAlert, setUrgentAlert] = useState<{id: number, message: string, timestamp: Date} | null>(null);
  const [sparklineData, setSparklineData] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    // Set to start of day for 'from' and end of day for 'to' for inclusive range
    oneMonthAgo.setHours(0, 0, 0, 0);
    today.setHours(23, 59, 59, 999);
    
    return { from: oneMonthAgo, to: today };
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Use the Salutdental calls hook for real data
  const hookResult = useSalutdentalCalls(dateRange);
  
  // Destructure with safe defaults to prevent undefined errors
  const {
    calls = [],
    tickets = [],
    stats = {
      totalCalls: 0,
      avgCallDuration: 0,
      totalCallTime: 0,
      totalCost: 0,
      avgScore: 0,
      totalTickets: 0,
      openTickets: 0,
      resolvedTickets: 0,
    },
    hourlyVolume = [],
    ticketTypes = [],
    ticketStatuses = [],
    loading = true,
    error = null,
    handleViewModeChange,
    viewMode
  } = hookResult || {};

  useEffect(() => {
    // For Salutdental, we use authenticated users and display real data
    setIsAuthenticated(true);
  }, [navigate]);

  useEffect(() => {
    // Display error if data loading failed
    if (error) {
      toast({
        title: t('common.error'),
        description: `Error loading Salutdental data: ${error}`,
        variant: "destructive"
      });
    }
  }, [error, toast, t]);

  // Generate sparkline data from hourly volume
  useEffect(() => {
    if (hourlyVolume.length > 0) {
      const sparkline = hourlyVolume.map(h => h.calls);
      setSparklineData(sparkline);
    }
  }, [hourlyVolume]);

  const dismissUrgentAlert = () => {
    setUrgentAlert(null);
  };

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-gradient-hero"></div>;
  }

  // Local date helpers to avoid UTC shifts in inputs
  const toInputDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const fromInputDate = (v: string, endOfDay = false) => {
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      urgentAlert ? 'bg-red-50' : 'bg-gradient-hero'
    }`}>
      
      {/* URGENT FULL SCREEN OVERLAY */}
      {urgentAlert && (
        <div className="fixed inset-0 bg-red-600 z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl mx-6 text-center border-8 border-red-700">
            <div className="mb-8">
              <AlertTriangle className="w-24 h-24 text-red-600 mx-auto mb-6 animate-bounce" />
              <h1 className="text-4xl font-bold text-red-600 mb-4">
                🚨 {t('dashboard.criticalUrgency')}
              </h1>
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
                <p className="text-xl font-semibold text-red-800 mb-2">
                  {urgentAlert.message}
                </p>
                <p className="text-red-600">
                  {t('dashboard.detectedAt')} {urgentAlert.timestamp.toLocaleTimeString(locale)}
                </p>
              </div>
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-8">
                <p className="text-yellow-800 font-semibold">
                  ⚠️ {t('dashboard.immediateAttentionRequired')}
                </p>
                <p className="text-yellow-700 text-sm mt-1">
                  {t('dashboard.systemDetectedIncident')}
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={dismissUrgentAlert}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 text-lg"
              >
                {t('dashboard.confirmAndResolve')}
              </Button>
              <Button 
                onClick={() => {/* Pots afegir lògica per escalar */}}
                variant="outline"
                size="lg"
                className="border-red-600 text-red-600 hover:bg-red-50 font-bold px-8 py-4 text-lg"
              >
                {t('dashboard.escalateUrgency')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Simplified Dashboard Header */}
      <div className={`bg-white border-b sticky top-0 z-20 shadow-sm transition-all duration-500 ${
        urgentAlert ? 'opacity-30 pointer-events-none' : ''
      }`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section - Dashboard Title and Date */}
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-800">
                {t('dashboard.title')} - Salutdental
              </h1>
              <p className="text-slate-500">
                {dateRange.from.toLocaleDateString(locale)} - {dateRange.to.toLocaleDateString(locale)}
              </p>
            </div>
            
            {/* Right Section - Date Range Selector */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
                  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
                  setDateRange({ from, to });
                }}
                className="text-sm"
              >
                {t('dashboard.today')}
              </Button>
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-slate-300 transition-all duration-200">
                <Calendar className="w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={toInputDate(dateRange.from)}
                  onChange={(e) => {
                    const dateValue = e.target.value;
                    if (dateValue) {
                      const newDate = fromInputDate(dateValue, false);
                      setDateRange(prev => ({ ...prev, from: newDate }));
                    }
                  }}
                  className="bg-transparent border-none text-sm focus:outline-none font-medium w-32 text-slate-700"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={toInputDate(dateRange.to)}
                  onChange={(e) => {
                    const dateValue = e.target.value;
                    if (dateValue) {
                      const newDate = fromInputDate(dateValue, true);
                      setDateRange(prev => ({ ...prev, to: newDate }));
                    }
                  }}
                  className="bg-transparent border-none text-sm focus:outline-none font-medium w-32 text-slate-700"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`container mx-auto px-6 py-8 space-y-8 transition-all duration-500 ${
        urgentAlert ? 'opacity-30 pointer-events-none' : ''
      }`}>
        {/* Enhanced KPI Section with Real Salutdental Data */}
        <section className="animate-fade-in">
          <EnhancedKpiCards 
            loading={loading}
            totalCalls={stats.totalCalls}
            openTickets={stats.openTickets}
            ahtSeconds={stats.avgCallDuration}
            totalSeconds={stats.totalCallTime}
            costEuros={stats.totalCost}
            ticketsResolved={stats.resolvedTickets}
            sparklineData={sparklineData}
            hideCost
            dateRange={dateRange}
          />
        </section>

        {/* Enhanced Charts and Data Visualization */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-primary rounded-full"></div>
            <h2 className="text-2xl font-bold text-foreground">{t('dashboard.dataAnalysis')}</h2>
            <Badge variant="outline" className="border-primary/30 text-primary">
              {t('dashboard.todayView')}
            </Badge>
          </div>

          {/* Enhanced Ticket Analytics */}
          <div className="animate-fade-in" style={{animationDelay: '0.1s'}}>
            <EnhancedTicketChart 
              typeData={ticketTypes} 
              statusData={ticketStatuses}
              loading={loading} 
            />
          </div>
          
          {/* Enhanced Call Duration Chart */}
          <div className="animate-fade-in" style={{animationDelay: '0.2s'}}>
              <HourlyCallVolumeChart 
                data={hourlyVolume} 
                loading={loading}
                dateRange={dateRange}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
              />
          </div>
        </section>
        
      </div>
    </div>
  );
};

export default SalutdentalDashboard;
