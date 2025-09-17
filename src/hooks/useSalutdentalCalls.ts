import { devLog } from "@/lib/logger";
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LatestCall } from '@/components/dashboard/EnhancedLatestCallsTable';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SalutdentalCallRaw {
  id: number;
  created_at: string;
  phone_id: string | null;
  call_duration_seconds: number | null;
  score: string | null;
  summary: string | null;
  audio_call: string | null;
  call_transcript: string | null;
}

export interface SalutdentalTicketRaw {
  id: number;
  created_at: string; // ISO timestamp
  phone_id: string | null;
  user_name: string | null;
  ticket_type: string | null;
  ticket_status: string | null;
  ai_notes: string | null;
  nota_assistant: string | null;
  user_status: string | null;
}

export interface SalutdentalDashboardStats {
  totalCalls: number;
  avgCallDuration: number;
  totalCallTime: number;
  totalCost: number;
  avgScore: number;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
}

export interface SalutdentalTicket {
  id: string;
  time: string;
  category: string;
  status: string;
  client: string;
  phone: string;
}

export interface TicketTypeSlice {
  type: string;
  value: number;
}

export interface TicketStatusData {
  status: string;
  count: number;
  color: string;
}

export interface HourlyCallVolume {
  hour: string; // Will be hour (e.g., "13:00") or date (e.g., "1/9/2025")
  calls: number;
  duration: number;
  isPeak: boolean;
  type?: 'hourly' | 'daily'; // Add type to distinguish
}

const INITIAL_STATS: SalutdentalDashboardStats = {
  totalCalls: 0,
  avgCallDuration: 0,
  totalCallTime: 0,
  totalCost: 0,
  avgScore: 0,
  totalTickets: 0,
  openTickets: 0,
  resolvedTickets: 0,
};

interface UseSalutdentalCallsOptions {
  enabled?: boolean;
}
export const useSalutdentalCalls = (dateRange: { from: Date; to: Date }, options: UseSalutdentalCallsOptions = {}) => {
  const { enabled = true } = options;
  const [calls, setCalls] = useState<LatestCall[]>([]);
  const [tickets, setTickets] = useState<SalutdentalTicket[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeSlice[]>([]);
  const [ticketStatuses, setTicketStatuses] = useState<TicketStatusData[]>([]);
  const [stats, setStats] = useState<SalutdentalDashboardStats>(INITIAL_STATS);
  const [hourlyVolume, setHourlyVolume] = useState<HourlyCallVolume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'hourly'>('daily');
  const [rawCalls, setRawCalls] = useState<SalutdentalCallRaw[]>([]);
  const [rawTickets, setRawTickets] = useState<SalutdentalTicketRaw[]>([]);

  const recalculateHourlyVolume = (rawCalls: SalutdentalCallRaw[]) => {
    const hourlyVolumeData = calculateHourlyVolume(rawCalls, dateRange, viewMode);
    setHourlyVolume(hourlyVolumeData);
  };

  const handleViewModeChange = (mode: 'daily' | 'hourly') => {
    setViewMode(mode);
  };

  const recalculateData = () => {
    if (rawCalls.length === 0 && rawTickets.length === 0) return;

    // Recalculate hourly volume
    const hourlyVolumeData = calculateHourlyVolume(rawCalls, dateRange, viewMode);
    setHourlyVolume(hourlyVolumeData);

    // Recalculate ticket distribution
    const { types, statuses } = calculateTicketDistribution(rawTickets);
    setTicketTypes(types);
    setTicketStatuses(statuses);
  };

  const parseCallDuration = (durationStr: string | null): number => {
    if (!durationStr) return 0;
    
    // Handle format like "1 min 4 s" or "2 min 30 s"
    const minSecMatch = durationStr.match(/(\d+)\s*min\s*(\d+)\s*s/);
    if (minSecMatch) {
      const minutes = parseInt(minSecMatch[1], 10);
      const seconds = parseInt(minSecMatch[2], 10);
      return minutes * 60 + seconds;
    }
    
    // Handle format like "2:30" (minutes:seconds)
    const colonMatch = durationStr.match(/(\d+):(\d+)/);
    if (colonMatch) {
      const minutes = parseInt(colonMatch[1], 10);
      const seconds = parseInt(colonMatch[2], 10);
      return minutes * 60 + seconds;
    }
    
    // Handle just seconds
    const numericMatch = durationStr.match(/(\d+)/);
    return numericMatch ? parseInt(numericMatch[0], 10) : 0;
  };

const transformCallData = (rawCalls: SalutdentalCallRaw[]): LatestCall[] => {
  return rawCalls.map(call => {
    const secs = typeof call.call_duration_seconds === 'number' ? call.call_duration_seconds : 0;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const durationLabel = `${m}:${s.toString().padStart(2, '0')}`;
    return {
      id: call.id.toString(),
      time: new Date(call.created_at).toLocaleTimeString('ca-ES', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      phone: call.phone_id || 'N/A',
      duration: durationLabel,
      cost: '0.00',
      score: call.score || 'N/A'
    };
  });
};

const calculateStats = (rawCalls: SalutdentalCallRaw[], rawTickets: SalutdentalTicketRaw[]): SalutdentalDashboardStats => {
  if (rawCalls.length === 0 && rawTickets.length === 0) {
    return {
      totalCalls: 0,
      avgCallDuration: 0,
      totalCallTime: 0,
      totalCost: 0,
      avgScore: 0,
      totalTickets: 0,
      openTickets: 0,
      resolvedTickets: 0,
    };
  }

  // Call stats
  const totalCalls = rawCalls.length;
  let totalDurationSeconds = 0;
  let totalScore = 0;
  let validScores = 0;

  rawCalls.forEach(call => {
    totalDurationSeconds += call.call_duration_seconds ?? 0;
    const scoreStr = call.score?.replace(',', '.') || '';
    const score = parseFloat(scoreStr);
    if (!isNaN(score) && score > 0) {
      totalScore += score;
      validScores++;
    }
  });

  const avgCallDuration = totalCalls > 0 ? totalDurationSeconds / totalCalls : 0;
  const totalCallTime = totalDurationSeconds;
  const avgScore = validScores > 0 ? totalScore / validScores : 0;

  // Ticket stats (period totals) - exclude non-finalized/hung-up categories to match charts
  const filteredTickets = rawTickets.filter(t => !shouldExcludeType(t.ticket_type));
  const totalTickets = filteredTickets.length;
  const resolvedTickets = filteredTickets.filter(ticket => {
    const status = (ticket.ticket_status || '').toLowerCase();
    return status.includes('tancat') ||
           status.includes('resolt') ||
           status.includes('cerrado') ||
           status.includes('resuelto') ||
           status.includes('finalitzat') ||
           status.includes('completat') ||
           status === 'closed' ||
           status === 'resolved';
  }).length;
  const openTickets = totalTickets - resolvedTickets;

  devLog('📊 Salutdental ticket stats:', {
    totalTickets,
    resolvedTickets,
    openTickets: `${openTickets} (all tickets in period)`,
    statusValues: rawTickets.map(t => t.ticket_status),
    avgCallDuration: avgCallDuration,
    avgCallDurationFormatted: `${Math.floor(avgCallDuration / 60)}:${(avgCallDuration % 60).toString().padStart(2, '0')}`,
    avgScore: avgScore,
    totalDurationSeconds: totalCallTime
  });

  return {
    totalCalls,
    avgCallDuration,
    totalCallTime,
    totalCost: 0,
    avgScore,
    totalTickets,
    openTickets,
    resolvedTickets,
  };
};

  const calculateHourlyVolume = (rawCalls: SalutdentalCallRaw[], dateRange: { from: Date; to: Date }, forceMode?: 'daily' | 'hourly'): HourlyCallVolume[] => {
    // Calculate if we're dealing with multiple days (more than 1 day difference)
    const daysDifference = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const shouldUseDailyView = forceMode === 'daily' || (forceMode !== 'hourly' && daysDifference > 1);
    
    if (shouldUseDailyView) {
      // For multi-day ranges or when daily mode is forced, aggregate by date
      const dailyData: { [key: string]: { calls: number; totalDuration: number } } = {};

      rawCalls.forEach(call => {
        const callDate = new Date(call.created_at);
        const dateKey = callDate.toLocaleDateString('ca-ES'); // Format like "1/9/2025"
        
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { calls: 0, totalDuration: 0 };
        }
        
        dailyData[dateKey].calls += 1;
        dailyData[dateKey].totalDuration += call.call_duration_seconds ?? 0;
      });

      // Generate result for each day in the range
      const result: HourlyCallVolume[] = [];
      const currentDate = new Date(dateRange.from);
      
      while (currentDate <= dateRange.to) {
        const dateKey = currentDate.toLocaleDateString('ca-ES');
        result.push({
          hour: dateKey,
          calls: dailyData[dateKey]?.calls || 0,
          duration: dailyData[dateKey]?.totalDuration || 0,
          isPeak: false,
          type: 'daily'
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate peak days (top 25% of days with calls)
      const callsArray = result.map(r => r.calls).filter(c => c > 0);
      if (callsArray.length > 0) {
        const sorted = callsArray.slice().sort((a, b) => b - a);
        const peakThreshold = sorted[Math.floor(sorted.length * 0.25)] || 0;
        
        result.forEach(item => {
          if (item.calls >= peakThreshold && item.calls > 0) {
            item.isPeak = true;
          }
        });
      }

      return result;
    } else {
      // For hourly mode, show ALL hours within the date range
      const hourlyData: { [key: string]: { calls: number; totalDuration: number } } = {};

      rawCalls.forEach(call => {
        const callDate = new Date(call.created_at);
        // Create a unique key for each hour: "27/8/2025 13:00"
        const dateStr = callDate.toLocaleDateString('ca-ES');
        const hourStr = callDate.getHours().toString().padStart(2, '0') + ':00';
        const hourKey = `${dateStr} ${hourStr}`;
        
        if (!hourlyData[hourKey]) {
          hourlyData[hourKey] = { calls: 0, totalDuration: 0 };
        }
        
        hourlyData[hourKey].calls += 1;
        hourlyData[hourKey].totalDuration += call.call_duration_seconds ?? 0;
      });

      // Generate result for EVERY hour in the date range
      const result: HourlyCallVolume[] = [];
      const currentDate = new Date(dateRange.from);
      currentDate.setHours(0, 0, 0, 0); // Start at beginning of first day
      
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999); // End at end of last day
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toLocaleDateString('ca-ES');
        const hourStr = currentDate.getHours().toString().padStart(2, '0') + ':00';
        const hourKey = `${dateStr} ${hourStr}`;
        
        result.push({
          hour: hourKey,
          calls: hourlyData[hourKey]?.calls || 0,
          duration: hourlyData[hourKey]?.totalDuration || 0,
          isPeak: false,
          type: 'hourly'
        });
        
        // Move to next hour
        currentDate.setHours(currentDate.getHours() + 1);
      }

      // Calculate peak hours (top 25% of hours with calls)
      const callsArray = result.map(r => r.calls).filter(c => c > 0);
      if (callsArray.length > 0) {
        const sorted = callsArray.slice().sort((a, b) => b - a);
        const peakThreshold = sorted[Math.floor(sorted.length * 0.25)] || 0;
        
        result.forEach(item => {
          if (item.calls >= peakThreshold && item.calls > 0) {
            item.isPeak = true;
          }
        });
      }

      return result;
    }
  };

const transformTicketData = (rawTickets: SalutdentalTicketRaw[]): SalutdentalTicket[] => {
  return rawTickets.slice(0, 5).map(ticket => ({
    id: ticket.id.toString(),
    time: new Date(ticket.created_at).toLocaleTimeString('ca-ES', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    category: ticket.ticket_type || 'Sense categoria',
    status: ticket.ticket_status || 'Sense estat',
    client: ticket.user_name || 'Client desconegut',
    phone: ticket.phone_id || 'N/A'
  }));
};

const shouldExcludeType = (label: string | null | undefined) => {
  const s = (label || '').toLowerCase();
  return [
    'llamada colgada',
    'llamada no finalizada',
    'sin finalizar',
    'trucada no finalitzada',
    'trucada penjada',
    'no finalitzada',
  ].some((kw) => s.includes(kw));
};

const calculateTicketDistribution = (rawTickets: SalutdentalTicketRaw[]) => {
  // Type distribution
  const typeMap = new Map<string, number>();
  rawTickets.forEach(ticket => {
    if (!shouldExcludeType(ticket.ticket_type)) {
      const type = ticket.ticket_type || 'Altres';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    }
  });
  const types: TicketTypeSlice[] = Array.from(typeMap.entries())
    .map(([type, value]) => ({ type, value }))
    .sort((a, b) => b.value - a.value);

  // Status distribution
  const statusMap = new Map<string, number>();
  rawTickets
    .filter(t => !shouldExcludeType(t.ticket_type))
    .forEach(ticket => {
      const status = ticket.ticket_status || 'Sense estat';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
  
  const statuses: TicketStatusData[] = Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
    color: status.toLowerCase().includes('tancat') || 
           status.toLowerCase().includes('resolt') || 
           status.toLowerCase().includes('cerrado') || 
           status.toLowerCase().includes('resuelto') ||
           status.toLowerCase().includes('finalitzat') ||
           status.toLowerCase().includes('completat') ||
           status.toLowerCase() === 'closed' ||
           status.toLowerCase() === 'resolved'
      ? 'hsl(var(--success))' 
      : status.toLowerCase().includes('obert') ||
        status.toLowerCase().includes('pendent') ||
        status.toLowerCase().includes('open') ||
        status.toLowerCase().includes('pending')
      ? 'hsl(var(--warning))' 
      : 'hsl(var(--destructive))'
  }));

  return { types, statuses };
};

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      devLog('🔄 Fetching Salutdental data for date range:', dateRange);

// Fetch calls with error handling
let rawCalls: SalutdentalCallRaw[] = [];
try {
  const { data, error } = await supabase
    .from('call_logs_salutdental')
    .select('id, created_at, phone_id, call_duration_seconds, score, summary, audio_call, call_transcript')
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  rawCalls = data ?? [];
  devLog('✅ Calls response:', rawCalls.length, 'records');
} catch (callError) {
  console.error('❌ Calls fetch error:', callError);
}

// Fetch tickets with error handling (created_at based)
let rawTickets: SalutdentalTicketRaw[] = [];
try {
  const { data, error } = await supabase
    .from('tickets_salutdental')
    .select('id,created_at,phone_id,user_name,ticket_type,ticket_status,ai_notes,nota_assistant,user_status')
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  rawTickets = data ?? [];
  devLog('✅ Tickets response:', rawTickets.length, 'records');
} catch (ticketError) {
  console.error('❌ Tickets fetch error:', ticketError);
}

      // Process calls data
      const transformedCalls = transformCallData(rawCalls);

      // Process tickets data
      const transformedTickets = transformTicketData(rawTickets);
      
      // Calculate stats
      const calculatedStats = calculateStats(rawCalls, rawTickets);
      
      // Calculate hourly volume
      const hourlyVolumeData = calculateHourlyVolume(rawCalls, dateRange, viewMode);
      
      // Calculate ticket distribution
      const { types, statuses } = calculateTicketDistribution(rawTickets);
      
      setCalls(transformedCalls);
      setTickets(transformedTickets);
      setStats(calculatedStats);
      setHourlyVolume(hourlyVolumeData);
      setTicketTypes(types);
      setTicketStatuses(statuses);
      setRawCalls(rawCalls);
      setRawTickets(rawTickets);

  devLog('📊 Salutdental data processed:', {
    calls: transformedCalls.length,
    tickets: transformedTickets.length,
    stats: {
      ...calculatedStats,
      avgCallDurationFormatted: `${Math.floor(calculatedStats.avgCallDuration / 60)}:${(calculatedStats.avgCallDuration % 60).toString().padStart(2, '0')}`
    },
    ticketTypes: types.length,
    ticketStatuses: statuses.length
  });

    } catch (err) {
      console.error('❌ Critical error in Salutdental data hook:', err);
      setError(err instanceof Error ? err.message : String(err));
      
      // Set safe defaults on error
      setCalls([]);
      setTickets([]);
      setStats({
        totalCalls: 0,
        avgCallDuration: 0,
        totalCallTime: 0,
        totalCost: 0,
        avgScore: 0,
        totalTickets: 0,
        openTickets: 0,
        resolvedTickets: 0,
      });
      setHourlyVolume([]);
      setTicketTypes([]);
      setTicketStatuses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setCalls([]);
      setTickets([]);
      setTicketTypes([]);
      setTicketStatuses([]);
      setStats(INITIAL_STATS);
      setHourlyVolume([]);
      setError(null);
      setLoading(false);
      return;
    }

    fetchData();
  }, [dateRange, enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (rawCalls.length > 0 || rawTickets.length > 0) {
      // Re-calculate data with new view mode
      recalculateData();
    }
  }, [viewMode, enabled]);
  // useEffect(() => {
  //   if (!enabled) {
  //     return;
  //   }

  //   let callsChannel: RealtimeChannel | null = null;
  //   let ticketsChannel: RealtimeChannel | null = null;

  //   const setupRealtimeSubscriptions = async () => {
  //     try {
  //       devLog('?Y"" Setting up Salutdental realtime subscriptions...');
        
  //       // Calls subscription with unique channel name
  //       callsChannel = supabase
  //         .channel(`salutdental_calls_${Date.now()}`)
  //         .on(
  //           'postgres_changes',
  //           {
  //             event: 'INSERT',
  //             schema: 'public',
  //             table: 'call_logs_salutdental'
  //           },
  //           (payload) => {
  //             devLog('?Y"" New Salutdental call detected:', payload);
  //             fetchData();
  //           }
  //         )
  //         .subscribe((status) => {
  //           devLog('?Y"? Salutdental calls subscription status:', status);
  //         });

  //       // Tickets subscription with unique channel name
  //       ticketsChannel = supabase
  //         .channel(`salutdental_tickets_${Date.now()}`)
  //         .on(
  //           'postgres_changes',
  //           {
  //             event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
  //             schema: 'public',
  //             table: 'tickets_salutdental'
  //           },
  //           (payload) => {
  //             devLog('?Y"" Salutdental ticket change detected:', payload);
  //             fetchData();
  //           }
  //         )
  //         .subscribe((status) => {
  //           devLog('?Y"? Salutdental tickets subscription status:', status);
  //         });

  //     } catch (error) {
  //       console.error('??O Error setting up Salutdental realtime subscriptions:', error);
  //     }
  //   };

  //   setupRealtimeSubscriptions();

  //   return () => {
  //     devLog('?Y?? Cleaning up Salutdental realtime subscriptions');
  //     if (callsChannel) {
  //       supabase.removeChannel(callsChannel);
  //     }
  //     if (ticketsChannel) {
  //       supabase.removeChannel(ticketsChannel);
  //     }
  //   };
  // }, [enabled]); // Recreate subscriptions only when enabled

  return {
    calls,
    tickets,
    stats,
    hourlyVolume,
    ticketTypes,
    ticketStatuses,
    loading,
    error,
    refetch: fetchData,
    handleViewModeChange,
    viewMode
  };
};








