import { devLog } from "@/lib/logger";
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HourlyCallVolume } from '@/components/dashboard/HourlyCallVolumeChart';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface TecnicsBcnDashboardStats {
  totalCalls: number;
  avgCallDuration: number;
  totalCallTime: number;
  totalCost: number;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
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

export interface LatestTicketRecord {
  id: string;
  time: string;
  category: string;
  status: string;
  assignedTo: string;
}

// Interfaces for raw Supabase records
export interface TecnicsBcnCallLog {
  id: number;
  created_at: string;
  call_duration_seconds?: string | number | null;
  call_cost?: string | number | null;
}

export interface TecnicsBcnTicket {
  id: number;
  created_at: string;
  ticket_type?: string | null;
  ticket_status?: string | null;
  user_name?: string | null;
}

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

const INITIAL_STATS: TecnicsBcnDashboardStats = {
  totalCalls: 0,
  avgCallDuration: 0,
  totalCallTime: 0,
  totalCost: 0,
  totalTickets: 0,
  openTickets: 0,
  resolvedTickets: 0,
};

interface UseTecnicsBcnCallsOptions {
  enabled?: boolean;
}

export const useTecnicsBcnCalls = (dateRange?: { from?: Date; to?: Date }, options: UseTecnicsBcnCallsOptions = {}) => {
  const { enabled = true } = options;

  const [stats, setStats] = useState<TecnicsBcnDashboardStats>(INITIAL_STATS);
  const [hourlyVolume, setHourlyVolume] = useState<HourlyCallVolume[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeSlice[]>([]);
  const [ticketStatuses, setTicketStatuses] = useState<TicketStatusData[]>([]);
  const [latestTickets, setLatestTickets] = useState<LatestTicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'hourly'>('hourly');

  const handleViewModeChange = (mode: 'daily' | 'hourly') => {
    devLog('🔄 useTecnicsBcnCalls: viewMode changing from', viewMode, 'to:', mode);
    setViewMode(mode);
  };

  const fetchData = async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      devLog('📅 useTecnicsBcnCalls: Fetching data for:', viewMode, 'mode, dateRange:', dateRange ? {
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString(),
        fromLocal: dateRange.from?.toLocaleDateString(),
        toLocal: dateRange.to?.toLocaleDateString()
      } : 'ALL TIME (no date filter)');

      // Fetch calls and tickets with pagination to avoid 1000-row cap
      const fetchAll = async (
        table: 'call_logs_tecnics_bcn_sat' | 'tickets_tecnics_bcn_sat'
      ): Promise<any[]> => {
        try {
          devLog(`🔍 Fetching ALL ${table} records...`);
          
          const pageSize = 1000;
          let from = 0;
          let allData: any[] = [];

          // Paginate through all records
          while (true) {
            let query = supabase
              .from(table)
              .select('*')
              .order('created_at', { ascending: false })
              .range(from, from + pageSize - 1);

            // Apply date filtering only if dateRange is provided
            if (dateRange?.from && dateRange?.to) {
              query = query
                .gte('created_at', dateRange.from.toISOString())
                .lte('created_at', dateRange.to.toISOString());
            }

            const { data, error } = await query;

            if (error) {
              console.error(
                `❌ Error fetching ${table} page ${Math.floor(from / pageSize) + 1}:`,
                error
              );
              throw error;
            }

            const pageData = data || [];
            allData = allData.concat(pageData);
            
            devLog(`📄 ${table} page ${Math.floor(from/pageSize) + 1}:`, {
              pageRecords: pageData.length,
              totalSoFar: allData.length,
              from,
              to: from + pageSize - 1
            });

            // If we got less than pageSize records, we've reached the end
            if (pageData.length < pageSize) {
              break;
            }

            from += pageSize;
          }
          
          devLog(`✅ ${table} complete fetch:`, {
            totalRecords: allData.length,
            dateRange: dateRange ? {
              from: dateRange.from?.toISOString(),
              to: dateRange.to?.toISOString()
            } : 'ALL TIME',
            firstRecord: allData[0]
              ? {
                  id: allData[0].id,
                  created_at: allData[0].created_at
                }
              : null,
            lastRecord: allData[allData.length - 1]
              ? {
                  id: allData[allData.length - 1].id,
                  created_at: allData[allData.length - 1].created_at
                }
              : null
          });

          return allData;
        } catch (err) {
          console.error(`❌ Failed to fetch ${table}:`, err);
          throw err; // Re-throw the error to propagate it up
        }
      };

      const [calls, tickets] = await Promise.all([
        fetchAll('call_logs_tecnics_bcn_sat'),
        fetchAll('tickets_tecnics_bcn_sat')
      ]);

      devLog('📊 useTecnicsBcnCalls: Fetched', calls.length, 'calls and', tickets.length, 'tickets');
      
      // Log sample data to debug structure
      if (calls.length > 0) {
        devLog('📋 Sample call data:', {
          id: calls[0].id,
          created_at: calls[0].created_at,
          call_duration_seconds: calls[0].call_duration_seconds,
          call_cost: calls[0].call_cost
        });
      }

      if (tickets.length > 0) {
        devLog('📋 Sample ticket data:', {
          id: tickets[0].id,
          created_at: tickets[0].created_at,
          ticket_type: tickets[0].ticket_type,
          ticket_status: tickets[0].ticket_status
        });
      }

      // Calculate stats
      const totalCalls = calls.length;
      const totalTickets = tickets.filter((t) => !shouldExcludeType(t.ticket_type)).length;

      const resolvedTickets = tickets.filter((t) => {
        const status = t.ticket_status?.toLowerCase() || '';
        return (
          !shouldExcludeType(t.ticket_type) &&
          (status.includes('resuelto') || status.includes('finalizado'))
        );
      }).length;

      // Calculate volume data based on view mode
      const volumeData: { [key: string]: number } = {};
      let chartData: HourlyCallVolume[] = [];
      
      if (viewMode === 'hourly') {
        devLog('📈 Processing hourly data...', dateRange ? 'with date range' : 'ALL TIME');
        
        if (dateRange?.from && dateRange?.to) {
          // Generate all hours in the date range
          const currentDateTime = new Date(dateRange.from);
          currentDateTime.setHours(0, 0, 0, 0);
          
          const endDateTime = new Date(dateRange.to);
          endDateTime.setHours(23, 59, 59, 999);
          
          devLog('🕐 Hourly range: from', currentDateTime, 'to', endDateTime);
          
          // Create hourly structure for the entire date range
          while (currentDateTime <= endDateTime) {
            const dateStr = currentDateTime.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' });
            const hourStr = currentDateTime.getHours().toString().padStart(2, '0') + ':00';
            const hourKey = `${dateStr} ${hourStr}`;
            
            chartData.push({
              hour: hourKey,
              calls: 0,
              isPeak: false,
              type: 'hourly'
            });
            
            // Move to next hour
            currentDateTime.setHours(currentDateTime.getHours() + 1);
          }
          
          devLog('🔢 Generated', chartData.length, 'hourly slots');
        } else {
          // For all-time view, group by date and hour from the actual data
          const hourMap = new Map<string, number>();
          
          calls.forEach((call) => {
            const callTime = new Date(call.created_at);
            const dateStr = callTime.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' });
            const hourStr = callTime.getHours().toString().padStart(2, '0') + ':00';
            const hourKey = `${dateStr} ${hourStr}`;
            
            hourMap.set(hourKey, (hourMap.get(hourKey) || 0) + 1);
          });
          
          // Convert to chart data format
          chartData = Array.from(hourMap.entries())
            .map(([hour, calls]) => ({
              hour,
              calls,
              isPeak: false,
              type: 'hourly' as const
            }))
            .sort((a, b) => a.hour.localeCompare(b.hour));
          
          devLog('🔢 Generated', chartData.length, 'hourly slots from all data');
        }
        
        // Now populate with actual call data (only if we have a date range)
        if (dateRange?.from && dateRange?.to) {
          calls.forEach((call, index) => {
            const callTime = new Date(call.created_at);
            const dateStr = callTime.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' });
            const hourStr = callTime.getHours().toString().padStart(2, '0') + ':00';
            const hourKey = `${dateStr} ${hourStr}`;
            
            // Find matching slot and increment
            const slot = chartData.find(d => d.hour === hourKey);
            if (slot) {
              slot.calls++;
            }
            if (index < 5) devLog('📞 Call', index, ':', callTime, '-> hourKey:', hourKey);
          });
        }
        
        devLog('📊 Hourly chart data generated:', chartData.length, 'points');
        devLog('📊 Sample hourly data:', chartData.slice(0, 5));
        devLog('📊 Total hourly calls:', chartData.reduce((sum, d) => sum + d.calls, 0));
        
      } else {
        devLog('📅 Processing daily data...', dateRange ? 'with date range' : 'ALL TIME');
        
        if (dateRange?.from && dateRange?.to) {
          // Daily view - calculate calls per day
          const daysBetween = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
          
          // Initialize all days in range
          for (let i = 0; i <= daysBetween; i++) {
            const day = new Date(dateRange.from);
            day.setDate(day.getDate() + i);
            const dayKey = day.toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            volumeData[dayKey] = 0;
          }
          
          calls.forEach((call) => {
            const callTime = new Date(call.created_at);
            const dayKey = callTime.toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            if (volumeData.hasOwnProperty(dayKey)) {
              volumeData[dayKey] = (volumeData[dayKey] || 0) + 1;
            }
          });

          // Create daily structure for the date range
          chartData = Array.from({ length: daysBetween + 1 }, (_, i) => {
            const day = new Date(dateRange.from);
            day.setDate(day.getDate() + i);
            const dayKey = day.toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            return {
              hour: dayKey,
              calls: volumeData[dayKey] || 0,
              isPeak: false,
              type: 'daily' as const
            };
          });
        } else {
          // For all-time view, group by day from the actual data
          const dayMap = new Map<string, number>();
          
          calls.forEach((call) => {
            const callTime = new Date(call.created_at);
            const dayKey = callTime.toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            
            dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
          });
          
          // Convert to chart data format
          chartData = Array.from(dayMap.entries())
            .map(([day, calls]) => ({
              hour: day,
              calls,
              isPeak: false,
              type: 'daily' as const
            }))
            .sort((a, b) => a.hour.localeCompare(b.hour));
          
          devLog('🔢 Generated', chartData.length, 'daily slots from all data');
        }
        
        devLog('📊 Daily chart data generated:', chartData.length, 'points');
        devLog('📊 Sample daily data:', chartData.slice(0, 3));
        devLog('📊 Total daily calls:', chartData.reduce((sum, d) => sum + d.calls, 0));
      }

      // Calculate ticket distribution
      const typeMap = new Map<string, number>();
      tickets.forEach((ticket) => {
        const type = ticket.ticket_type || 'Altres';
        if (!shouldExcludeType(type)) {
          typeMap.set(type, (typeMap.get(type) || 0) + 1);
        }
      });
      const types = Array.from(typeMap.entries())
        .map(([type, value]) => ({ type, value }))
        .sort((a, b) => b.value - a.value);

      // Calculate ticket status distribution with standardized states
      const statusMap = new Map<string, number>();
      const standardizedStatuses = {
        'Abierto': 0,
        'Cerrado': 0,  
        'En progreso': 0
      };
      
      tickets.forEach((ticket) => {
        const rawStatus = (ticket.ticket_status || '').toLowerCase().trim();
        if (!shouldExcludeType(ticket.ticket_type)) {
          // Map various status values to standardized 3 states
          let standardizedStatus = 'Abierto'; // Default
          
          if (rawStatus.includes('cerrado') || 
              rawStatus.includes('resuelto') || 
              rawStatus.includes('finalizado') ||
              rawStatus.includes('completado') ||
              rawStatus === 'closed' ||
              rawStatus === 'resolved') {
            standardizedStatus = 'Cerrado';
          } else if (rawStatus.includes('progreso') || 
                     rawStatus.includes('proceso') ||
                     rawStatus.includes('asignado') ||
                     rawStatus.includes('en curso') ||
                     rawStatus === 'in progress' ||
                     rawStatus === 'assigned') {
            standardizedStatus = 'En progreso';
          } else if (rawStatus.includes('abierto') || 
                     rawStatus.includes('pendiente') || 
                     rawStatus.includes('nuevo') ||
                     rawStatus === 'open' ||
                     rawStatus === 'pending' ||
                     rawStatus === 'new' ||
                     rawStatus === '') {
            standardizedStatus = 'Abierto';
          }
          
          standardizedStatuses[standardizedStatus as keyof typeof standardizedStatuses]++;
        }
      });
      
      // Convert to required format with proper colors
      const statuses: TicketStatusData[] = Object.entries(standardizedStatuses).map(([status, count]) => ({
        status,
        count,
        color: status === 'Cerrado' 
          ? 'hsl(var(--success))' 
          : status === 'En progreso'
          ? 'hsl(var(--warning))' 
          : 'hsl(var(--destructive))'  // Abierto
      }));

      // Create latest tickets data for table (last 10 tickets)
      const latestTicketsData: LatestTicketRecord[] = tickets
        .filter((ticket) => !shouldExcludeType(ticket.ticket_type))
        .slice(0, 10)
        .map((ticket) => ({
          id: ticket.id.toString(),
          time: new Date(ticket.created_at).toLocaleTimeString('ca-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          category: ticket.ticket_type || 'General',
          status: ticket.ticket_status || 'Abierto',
          assignedTo: ticket.user_name || 'Sin asignar'
        }));

      devLog('📊 Ticket distribution calculated:', {
        types: types.length,
        statuses: statuses.length,
        totalTypeTickets: types.reduce((sum, t) => sum + t.value, 0),
        totalStatusTickets: statuses.reduce((sum, s) => sum + s.count, 0)
      });

      // Calculate call metrics from filtered calls
      let totalCallTimeSeconds = 0;
      let totalCostEuros = 0;
      let validCallsWithDuration = 0;
      let validCallsWithCost = 0;

      devLog('💰 Processing', calls.length, 'calls for metrics calculation...');
      
      calls.forEach((call, index) => {
        // Parse call duration in seconds
        const durationVal = call.call_duration_seconds;
        let durationSeconds = 0;

        // Handle different formats: string numbers, decimals
        if (durationVal !== undefined && durationVal !== null) {
          const cleanDuration = durationVal.toString().replace(',', '.');
          const parsed = parseFloat(cleanDuration);
          if (!isNaN(parsed) && parsed > 0) {
            durationSeconds = parsed;
            totalCallTimeSeconds += durationSeconds;
            validCallsWithDuration++;
          }
        }

        // Parse call cost in euros - handle different formats
        const costVal = call.call_cost;
        let costEuros = 0;

        if (costVal !== undefined && costVal !== null) {
          const cleanCost = costVal.toString().replace(',', '.');
          const parsed = parseFloat(cleanCost);
          if (!isNaN(parsed) && parsed > 0) {
            costEuros = parsed;
            totalCostEuros += costEuros;
            validCallsWithCost++;
          }
        }

        // Debug first few calls
        if (index < 5) {
          devLog(`📞 Call ${index + 1}:`, {
            id: call.id,
            duration: durationVal,
            durationParsed: durationSeconds,
            cost: call.call_cost,
            costParsed: costEuros,
            created_at: call.created_at
          });
        }
      });

      const avgCallDurationSeconds = validCallsWithDuration > 0 ? Math.round(totalCallTimeSeconds / validCallsWithDuration) : 0;

      devLog('💰 useTecnicsBcnCalls: Final calculated metrics:', {
        totalCalls,
        totalCallTimeSeconds: Math.round(totalCallTimeSeconds),
        totalCostEuros: Number(totalCostEuros.toFixed(2)),
        avgCallDurationSeconds,
        validCallsWithDuration,
        validCallsWithCost,
        dateRange: dateRange?.from && dateRange?.to 
          ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
          : 'ALL TIME'
      });

      setStats({
        totalCalls,
        avgCallDuration: avgCallDurationSeconds,
        totalCallTime: Math.round(totalCallTimeSeconds),
        totalCost: Number(totalCostEuros.toFixed(2)),
        totalTickets,
        openTickets: totalTickets - resolvedTickets,
        resolvedTickets,
      });
      setHourlyVolume(chartData);
      setTicketTypes(types);
      setTicketStatuses(statuses);
      setLatestTickets(latestTicketsData);

      devLog('✅ useTecnicsBcnCalls: Data processed, final hourlyVolume length:', chartData.length);

    } catch (err) {
      console.error('❌ useTecnicsBcnCalls: Error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setStats(INITIAL_STATS);
      setHourlyVolume([]);
      setTicketTypes([]);
      setTicketStatuses([]);
      setLatestTickets([]);
      setError(null);
      setLoading(false);
      return;
    }

    fetchData();
  }, [dateRange, viewMode, enabled]);
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let callsChannel: RealtimeChannel | null = null;
    let ticketsChannel: RealtimeChannel | null = null;

    const setupRealtimeSubscriptions = async () => {
      try {
        devLog('?Y"" Setting up Tecnics BCN realtime subscriptions...');

        // Calls subscription with unique channel name
        callsChannel = supabase
          .channel(`tecnics_calls_${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'call_logs_tecnics_bcn_sat'
            },
            (payload) => {
              devLog('?Y"" New Tecnics BCN call detected:', payload);
              fetchData();
            }
          )
          .subscribe((status) => {
            devLog('?Y"? Tecnics BCN calls subscription status:', status);
          });

        // Tickets subscription with unique channel name
        ticketsChannel = supabase
          .channel(`tecnics_tickets_${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'tickets_tecnics_bcn_sat'
            },
            (payload) => {
              devLog('?Y"" Tecnics BCN ticket change detected:', payload);
              fetchData();
            }
          )
          .subscribe((status) => {
            devLog('?Y"? Tecnics BCN tickets subscription status:', status);
          });

      } catch (error) {
        console.error('??O Error setting up Tecnics BCN realtime subscriptions:', error);
      }
    };

    setupRealtimeSubscriptions();

    return () => {
      devLog('?Y?? Cleaning up Tecnics BCN realtime subscriptions');
      if (callsChannel) {
        supabase.removeChannel(callsChannel);
      }
      if (ticketsChannel) {
        supabase.removeChannel(ticketsChannel);
      }
    };
  }, [enabled]); // Recreate subscriptions only when enabled

  return {
    stats,
    hourlyVolume,
    ticketTypes,
    ticketStatuses,
    latestTickets,
    loading,
    error,
    handleViewModeChange,
    viewMode,
  };
};





