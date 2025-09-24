import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, TooltipProps } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";

export interface HourlyCallVolume {
  hour: string;
  calls: number;
  isPeak: boolean;
  type?: 'hourly' | 'daily';
}

interface HourlyCallVolumeChartProps {
  data: HourlyCallVolume[];
  loading: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  onViewModeChange?: (mode: 'daily' | 'hourly') => void;
  viewMode: 'daily' | 'hourly';
}

export default function HourlyCallVolumeChart({ data, loading, dateRange, onViewModeChange, viewMode }: HourlyCallVolumeChartProps) {
  const { t } = useLanguage();
  const totalCalls = data.reduce((sum, item) => sum + item.calls, 0);
  
  const handleViewModeChange = (mode: 'daily' | 'hourly') => {
    onViewModeChange?.(mode);
  };
  
  const getDateRangeDescription = () => {
    if (!dateRange || !dateRange.from || !dateRange.to) return t('dashboard.hourlyDistribution');
    
    const isToday = dateRange.from.toDateString() === new Date().toDateString() &&
                   dateRange.to.toDateString() === new Date().toDateString();
    
    const isSingleDay = dateRange.from.toDateString() === dateRange.to.toDateString();
    const isHourly = viewMode === 'hourly';
    
    if (isToday && isHourly) {
      return t('dashboard.todayHourlyDistribution');
    } else if (isSingleDay && isHourly) {
      return t('dashboard.singleDayHourlyDistribution', { 
        date: dateRange.from.toLocaleDateString(t('common.locale')) 
      });
    } else if (!isHourly) {
      const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      return t('dashboard.dailyDistributionRange', {
        days: daysDiff,
        from: dateRange.from.toLocaleDateString(t('common.locale')),
        to: dateRange.to.toLocaleDateString(t('common.locale'))
      });
    } else {
      const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      return t('dashboard.completeHourlyVolume', {
        days: daysDiff,
        from: dateRange.from.toLocaleDateString(t('common.locale')),
        to: dateRange.to.toLocaleDateString(t('common.locale'))
      });
    }
  };
  
  const getPeakHour = () => {
    const peakData = data.reduce((max, current) => 
      current.calls > max.calls ? current : max, 
      { hour: '', calls: 0 }
    );
    return peakData.calls > 0 ? peakData.hour : null;
  };
  
  const peakHour = getPeakHour();

  const CustomTooltipWithTranslation = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card/95 backdrop-blur-sm border rounded-lg p-3 shadow-elegant">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            {data.calls} {t('dashboard.calls')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card data-chart="trend" className="group hover:shadow-glow transition-all duration-500 bg-gradient-card border-primary/20 hover:border-primary/40">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-semibold">{t('dashboard.hourlyCallVolume')}</CardTitle>
          </div>
          
          {/* View Mode Toggle Buttons */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'daily' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('daily')}
              className="h-7 px-3 text-xs"
            >
              <Calendar className="w-3 h-3 mr-1" />
              {t('dashboard.days')}
            </Button>
            <Button
              variant={viewMode === 'hourly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('hourly')}
              className="h-7 px-3 text-xs"
            >
              <Clock className="w-3 h-3 mr-1" />
              {t('dashboard.hours')}
            </Button>
          </div>
        </div>
        
        <CardDescription>{getDateRangeDescription()}</CardDescription>
        <div className="flex gap-2 flex-wrap">
          {totalCalls > 0 && (
            <Badge variant="secondary" className="w-fit">
              {totalCalls} {t('dashboard.calls')}
            </Badge>
          )}
          {peakHour && (
            <Badge variant="outline" className="w-fit border-primary/40 text-primary">
              {t('dashboard.peak')}: {peakHour}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>{t('dashboard.noDataToday')}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="hour" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltipWithTranslation />} />
              <Bar 
                dataKey="calls" 
                fill="hsl(var(--primary))"
                stroke="none"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}