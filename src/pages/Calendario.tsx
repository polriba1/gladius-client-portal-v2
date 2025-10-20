import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as UICalendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es'; // Import Spanish locale
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Calendario.css';
import { Calendar as CalendarIcon, MapPin, Clock, FileText, User, RefreshCw, ChevronLeft, ChevronRight, MessageSquare, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Configure moment to use Spanish locale with 24-hour format
moment.locale('es');

const localizer = momentLocalizer(moment);

interface StelEventType {
  path: string;
  deleted: boolean;
  color: string;
  name: string;
  id: number;
  'utc-last-modification-date': string;
}

interface StelEvent {
  id: number;
  "event-type-id": number;
  "incident-path": string | null;
  subject: string;
  description: string | null;
  "start-date": string;
  "end-date": string;
  "utc-last-modification-date": string;
  "asset-path": string | null;
  "incident-id": number | null;
  "account-path": string;
  path: string;
  "calendar-id": number;
  "calendar-path": string;
  "asset-id": number | null;
  "event-state": "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  "creator-path": string;
  "account-id": number;
  "document-path": string | null;
  "creator-id": number;
  "event-type-path": string;
  deleted: boolean;
  location: string | null;
  "all-day": boolean;
  "document-id": number | null;
}

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource?: StelEvent;
  technician?: string; // Added to track technician
}

interface TechnicianSchedule {
  name: string;
  events: CalendarEvent[];
  color: string;
}

const Calendario = () => {
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [technicianSchedules, setTechnicianSchedules] = useState<TechnicianSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  // Start with today's date
  const [currentDate, setCurrentDate] = useState(new Date());
  const [copiedTech, setCopiedTech] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<Map<number, StelEventType>>(new Map());
  const navigate = useNavigate();
  const { toast } = useToast();

  // Helper function to get color for technician
  const getColorForCalendar = (technicianName: string): string => {
    const colors = [
      'hsl(210 85% 45%)',   // Blue
      'hsl(142 76% 36%)',   // Green
      'hsl(38 92% 50%)',    // Orange
      'hsl(271 91% 65%)',   // Purple
      'hsl(0 84% 60%)',     // Red
      'hsl(173 80% 40%)',   // Teal
      'hsl(340 82% 52%)',   // Pink
      'hsl(45 93% 47%)',    // Yellow/Gold
      'hsl(199 89% 48%)',   // Cyan
      'hsl(162 63% 41%)',   // Teal-Green
    ];
    
    if (technicianName === 'Sin Asignar') {
      return 'hsl(210 12% 47%)';
    }
    
    // Extract number from TEC080, TEC090, etc. and use modulo for color
    const match = technicianName.match(/TEC(\d+)/i);
    if (match) {
      const num = parseInt(match[1]);
      return colors[num % colors.length];
    }
    
    return colors[0];
  };

  // Colors for different technicians (for backward compatibility)
  const technicianColors: { [key: string]: string } = {
    'T1': 'hsl(210 85% 45%)',   // Blue
    'T2': 'hsl(142 76% 36%)',   // Green
    'T3': 'hsl(38 92% 50%)',    // Orange
    'T4': 'hsl(271 91% 65%)',   // Purple
    'T5': 'hsl(0 84% 60%)',     // Red
    'T6': 'hsl(173 80% 40%)',   // Teal
    'T7': 'hsl(340 82% 52%)',   // Pink
    'T8': 'hsl(45 93% 47%)',    // Yellow/Gold
    'Sin Asignar': 'hsl(210 12% 47%)', // Gray
  };

  // Helper function to get event state color
  const getEventStateColor = (state: string) => {
    switch (state) {
      case 'PENDING':
        return 'hsl(38 92% 50%)'; // warning color
      case 'CONFIRMED':
        return 'hsl(210 85% 45%)'; // primary color
      case 'COMPLETED':
        return 'hsl(142 76% 36%)'; // success color
      case 'CANCELLED':
        return 'hsl(0 84% 60%)'; // destructive color
      default:
        return 'hsl(210 85% 45%)';
    }
  };

  // Helper function to get event state badge variant
  const getEventStateBadge = (state: string) => {
    switch (state) {
      case 'PENDING':
        return 'outline';
      case 'CONFIRMED':
        return 'default';
      case 'COMPLETED':
        return 'secondary';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // Helper function to translate event states to Spanish
  const translateEventState = (state: string) => {
    switch (state) {
      case 'PENDING':
        return 'Pendiente';
      case 'CONFIRMED':
        return 'Confirmado';
      case 'COMPLETED':
        return 'Completado';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return state;
    }
  };

  // Generate WhatsApp formatted text for technician's day
  const generateWhatsAppText = (technicianName: string, events: CalendarEvent[], date: Date) => {
    const dateStr = moment(date).format('dddd, D [de] MMMM [de] YYYY');
    const totalHours = events.reduce((acc, event) => {
      return acc + moment.duration(moment(event.end).diff(moment(event.start))).asHours();
    }, 0);

    let text = `📋 *Agenda para ${technicianName}*\n`;
    text += `📅 ${dateStr}\n`;
    text += `⏱️ Total: ${events.length} servicios (${totalHours.toFixed(1)}h)\n`;
    text += `\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    events.forEach((event, index) => {
      const startTime = moment(event.start).format('HH:mm');
      const endTime = moment(event.end).format('HH:mm');
      const duration = moment.duration(moment(event.end).diff(moment(event.start))).asHours();
      
      text += `*${index + 1}. Servicio ${startTime} - ${endTime}* (${duration.toFixed(1)}h)\n`;
      
      if (event.resource?.location) {
        text += `📍 *Ubicación:* ${event.resource.location}\n`;
      }
      
      if (event.resource?.description) {
        text += `📝 *Detalles:* ${event.resource.description}\n`;
      }
      
      if (event.resource?.['account-path']) {
        text += `👤 *Cliente:* ${event.resource['account-path'].split('/').pop()}\n`;
      }
      
      const state = translateEventState(event.resource?.['event-state'] || 'PENDING');
      text += `🔔 *Estado:* ${state}\n`;
      
      text += `\n`;
    });

    if (events.length > 1) {
      const firstStart = moment(events[0].start).format('HH:mm');
      const lastEnd = moment(events[events.length - 1].end).format('HH:mm');
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      text += `⏰ *Jornada:* ${firstStart} - ${lastEnd}\n`;
    }

    text += `\n_Mensaje generado desde el Portal GLADIUS_`;

    return text;
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string, techName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTech(techName);
      toast({
        title: '✅ Copiado',
        description: `Agenda de ${techName} copiada al portapapeles`,
      });
      setTimeout(() => setCopiedTech(null), 2000);
    } catch (err) {
      toast({
        title: '❌ Error',
        description: 'No se pudo copiar al portapapeles',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate('/');
      } else {
        setIsAuthenticated(true);
      }
    });

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate('/');
      } else {
        setIsAuthenticated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchEvents = async () => {
    console.log('🚀 fetchEvents called!');
    setLoading(true);
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const applyEvents = (stelEvents: StelEvent[]) => {
        console.log('📅 Processing Events:', {
          totalEvents: stelEvents.length
        });

        // Filter out deleted events and map to calendar format
        const validEvents = stelEvents.filter((event) => !event.deleted);

        console.log('📅 Filtered Events:', {
          total: stelEvents.length,
          valid: validEvents.length,
          dateRange: {
            earliest: validEvents.length > 0 ? validEvents.reduce((min, e) => e['start-date'] < min ? e['start-date'] : min, validEvents[0]['start-date']) : null,
            latest: validEvents.length > 0 ? validEvents.reduce((max, e) => e['start-date'] > max ? e['start-date'] : max, validEvents[0]['start-date']) : null
          },
          sample: validEvents.slice(0, 5).map(e => ({
            id: e.id,
            'event-type-id': e['event-type-id'],
            subject: e.subject,
            'start-date': e['start-date'],
            'end-date': e['end-date']
          }))
        });

        const calendarEvents: CalendarEvent[] = validEvents.map((event) => {
          // Las fechas vienen con formato "2025-10-01T10:00:00+0000"
          // Pero en realidad representan la hora local (10:00 es 10:00 local, no UTC)
          // Por lo tanto, ignoramos el +0000 y tratamos la fecha como hora local
          const startStr = event['start-date'].replace('+0000', ''); // "2025-10-01T10:00:00"
          const endStr = event['end-date'].replace('+0000', '');
          
          const startDate = new Date(startStr);
          const endDate = new Date(endStr);
          
          // Extract technician from subject using regex pattern
          // Subjects like: "1616 TEC090 ANOMALIA 42", "1697 TEC 095 LLAMAR ANTES", etc.
          const techMatch = event.subject?.match(/TEC\s*(\d+)/i);
          const technicianId = techMatch ? `TEC${techMatch[1]}` : 'Sin Asignar';

          return {
            id: event.id,
            title: event.subject || 'Sin título',
            start: startDate,
            end: endDate,
            resource: event,
            technician: technicianId,
          };
        });

        // Group events by technician (extracted from subject)
        const technicianMap = new Map<string, CalendarEvent[]>();
        
        // First, collect all unique technicians from the events
        const allTechnicians = new Set<string>();
        validEvents.forEach(event => {
          const techMatch = event.subject?.match(/TEC\s*(\d+)/i);
          if (techMatch) {
            allTechnicians.add(`TEC${techMatch[1]}`);
          }
        });
        
        console.log('🔧 Detected Technicians in subjects:', {
          totalTechnicians: allTechnicians.size,
          technicians: Array.from(allTechnicians).sort()
        });
        
        // Initialize all technicians (even if they have no events today)
        allTechnicians.forEach(techId => {
          technicianMap.set(techId, []);
        });
        
        // Add a "Sin Asignar" category for events without technician
        technicianMap.set('Sin Asignar', []);
        
        // Add events to their respective technicians
        calendarEvents.forEach(event => {
          const tech = event.technician || 'Sin Asignar';
          if (technicianMap.has(tech)) {
            technicianMap.get(tech)!.push(event);
          } else {
            technicianMap.set(tech, [event]);
          }
        });

        // Create technician schedules with colors
        const schedules: TechnicianSchedule[] = Array.from(technicianMap.entries())
          .map(([name, events]) => ({
            name,
            events,
            color: getColorForCalendar(name)
          }))
          .sort((a, b) => {
            // Sort "Sin Asignar" last
            if (a.name === 'Sin Asignar') return 1;
            if (b.name === 'Sin Asignar') return -1;
            // Sort technicians numerically (TEC080, TEC087, TEC090, etc.)
            const aNum = parseInt(a.name.replace('TEC', '')) || 0;
            const bNum = parseInt(b.name.replace('TEC', '')) || 0;
            return aNum - bNum;
          })
        
        // Find the earliest event date to help user navigate
        if (calendarEvents.length > 0) {
          const earliestEvent = calendarEvents.reduce((min, event) => 
            event.start < min.start ? event : min
          );
          console.log('📅 Earliest Event Date:', moment(earliestEvent.start).format('YYYY-MM-DD'));
        }

        setEvents(calendarEvents);
        setTechnicianSchedules(schedules);

        console.log('✅ Final Schedules:', {
          totalSchedules: schedules.length,
          schedules: schedules.map(s => ({
            name: s.name,
            totalEvents: s.events.length,
            color: s.color
          }))
        });

        // Show date range of loaded events
        if (calendarEvents.length > 0) {
          const dates = calendarEvents.map(e => moment(e.start).format('YYYY-MM-DD')).sort();
          const earliestDate = dates[0];
          const latestDate = dates[dates.length - 1];
          
          console.log('📅 Events Date Range:', {
            earliest: earliestDate,
            latest: latestDate,
            total: calendarEvents.length
          });
          
          toast({
            title: 'Eventos Cargados',
            description: `${calendarEvents.length} eventos de ${schedules.length} técnicos (${earliestDate} a ${latestDate})`,
          });
        } else {
          toast({
            title: 'Sin Eventos',
            description: 'No se encontraron eventos en la respuesta de la API',
            variant: 'destructive',
          });
        }
      };

      if (import.meta.env.DEV) {
        console.log('✅ Running in DEV mode, using Vite proxy');
        try {
          // Fetch events from last month with single request (limit=500)
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          const utcLastModificationDate = oneMonthAgo.toISOString().replace(/\.\d{3}Z$/, '+0000');
          
          console.log(`📅 Filtering events modified after: ${utcLastModificationDate}`);
          
          const limit = 500; // Maximum supported
          const proxyUrl = `/api/stel/app/events?limit=${limit}&utc-last-modification-date=${encodeURIComponent(utcLastModificationDate)}`;
          
          console.log(`📡 Fetching events with limit=${limit}...`);
          
          const response = await fetch(proxyUrl, {
            headers: {
              APIKEY: import.meta.env.VITE_STEL_API_KEY,
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const allEvents = (await response.json()) as StelEvent[];
          console.log(`✅ Total events fetched: ${allEvents.length}`);
          
          // NO filtering - show ALL events from ALL calendars and ALL technicians
          const validEvents = allEvents.filter(e => !e.deleted);
          
          console.log(`✅ Valid events (not deleted): ${validEvents.length}`);
          
          // Get date range
          if (validEvents.length > 0) {
            const dates = validEvents
              .map(e => e['start-date'])
              .filter(d => d)
              .sort();
            console.log(`📅 Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
          }

          applyEvents(validEvents);
          return;
        } catch (viteError) {
          console.warn('❌ Vite proxy request failed, attempting Supabase Edge Function', viteError);
        }
      }

      console.log('⚠️ Not in DEV mode or Vite proxy failed, using Supabase Edge Function');
      
      // Fetch the latest 500 events (no date filter)
      // The API returns events ordered by most recent first
      const limit = 500;
      
      try {
        console.log(`🔧 Supabase Edge Function Request: limit=${limit}`);

        const { data, error } = await supabase.functions.invoke('stel-events', {
          body: {
            limit: limit.toString(),
          },
        });

        if (error) {
          throw error;
        }

        const allEvents = (data ?? []) as StelEvent[];
        console.log(`✅ Total events fetched: ${allEvents.length}`);
        
        // Filter out deleted events
        const validEvents = allEvents.filter(e => !e.deleted);
        
        console.log(`✅ Valid events (not deleted): ${validEvents.length}`);
        
        // Get date range
        if (validEvents.length > 0) {
          const dates = validEvents
            .map(e => e['start-date'])
            .filter(d => d)
            .sort();
          console.log(`📅 Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
        }

        applyEvents(validEvents);
      } catch (edgeFunctionError) {
        console.error('❌ Edge Function request failed:', edgeFunctionError);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los eventos',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Error',
        description: message.includes('STEL API key') ? t('calendar.apiKeyError') : t('calendar.loadError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      console.log('🏁 fetchEvents completed');
    }
  };



  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6 p-6 max-w-[1800px] mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
            <CalendarIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
              Calendario
            </h1>
            <p className="text-muted-foreground">
              Gestión de citas y eventos de STEL Order
            </p>
          </div>
        </div>

        <Button
          onClick={fetchEvents}
          disabled={loading}
          className="bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg transition-all duration-300 gap-2"
          size="lg"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Cargando...' : 'Cargar Eventos'}
        </Button>
      </div>

      {/* Date Navigation */}
      <Card className="shadow-sm border-border/50 bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {moment(currentDate).format('dddd, D [de] MMMM [de] YYYY')}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Previous Day Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setDate(newDate.getDate() - 1);
                  setCurrentDate(newDate);
                }}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal gap-2",
                      !currentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    Seleccionar Fecha
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <UICalendar
                    mode="single"
                    selected={currentDate}
                    onSelect={(date) => date && setCurrentDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Today Button */}
              <Button
                variant="default"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="gap-1"
              >
                Hoy
              </Button>

              {/* Next Day Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setDate(newDate.getDate() + 1);
                  setCurrentDate(newDate);
                }}
                className="gap-1"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card - Date Range Available */}
      {events.length > 0 && (
        <Card className="shadow-sm border-blue-200 bg-blue-50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">
                Eventos disponibles: {moment(events.map(e => e.start).sort()[0]).format('DD/MM/YYYY')} 
                {' → '}
                {moment(events.map(e => e.start).sort()[events.length - 1]).format('DD/MM/YYYY')}
                {' '}({events.length} eventos cargados)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multiple Technician Calendars - Horizontal Scroll View */}
      {technicianSchedules.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Vista por Técnico</h2>
            <Badge variant="secondary">{technicianSchedules.length} Técnicos</Badge>
          </div>
          
          {/* Horizontal scrollable container */}
          <div className="relative">
            {(() => {
              const schedulesWithEvents = technicianSchedules
                .map((schedule) => {
                  const todayEvents = schedule.events.filter(event => {
                    const eventDate = moment(event.start).format('YYYY-MM-DD');
                    const selectedDate = moment(currentDate).format('YYYY-MM-DD');
                    return eventDate === selectedDate;
                  });
                  return {
                    ...schedule,
                    todayEventsCount: todayEvents.length,
                    todayEvents: todayEvents
                  };
                })
                .filter(schedule => schedule.todayEventsCount > 0);

              if (schedulesWithEvents.length === 0) {
                return (
                  <Card className="shadow-elegant border-orange-200 bg-orange-50">
                    <CardContent className="py-8">
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                          <CalendarIcon className="h-8 w-8 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-orange-900">Sin eventos para esta fecha</h3>
                          <p className="text-orange-700 mt-1">
                            No hay eventos programados para {moment(currentDate).format('DD/MM/YYYY')}
                          </p>
                          <p className="text-sm text-orange-600 mt-2">
                            Usa los botones de navegación para explorar otras fechas
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              return (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
                {schedulesWithEvents.map((schedule) => {
                  
                  if (schedule.events.length > 0) {
                    console.log('🗓️ Technician Calendar:', {
                      name: schedule.name,
                      totalEvents: schedule.events.length,
                      todayEventsCount: schedule.todayEventsCount,
                      selectedDate: moment(currentDate).format('YYYY-MM-DD'),
                      todayEvents: schedule.todayEvents.map(e => ({
                        start: moment(e.start).format('YYYY-MM-DD HH:mm'),
                        end: moment(e.end).format('YYYY-MM-DD HH:mm'),
                        title: e.title,
                        isToday: moment(e.start).format('YYYY-MM-DD') === moment(currentDate).format('YYYY-MM-DD')
                      }))
                    });
                  }
                  
                  return (
                    <Card 
                      key={schedule.name} 
                      className="shadow-elegant border-border/50 flex-shrink-0"
                      style={{ width: '320px' }} // Fixed width for each column
                    >
                      <CardHeader className="pb-3 sticky top-0 bg-background z-10" style={{ borderBottom: `3px solid ${schedule.color}` }}>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: schedule.color }}
                            />
                            <span className="text-lg font-bold">{schedule.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">{schedule.todayEventsCount}</Badge>
                            
                            {/* WhatsApp Button */}
                            {schedule.todayEventsCount > 0 && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 p-0"
                                    title="Enviar por WhatsApp"
                                  >
                                    <MessageSquare className="h-4 w-4" style={{ color: schedule.color }} />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <MessageSquare className="h-5 w-5" style={{ color: schedule.color }} />
                                      Agenda para {schedule.name}
                                    </DialogTitle>
                                    <DialogDescription>
                                      Copia este texto para enviarlo por WhatsApp
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="space-y-4">
                                    {/* Preview of formatted text */}
                                    <div className="bg-muted p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
                                      {generateWhatsAppText(
                                        schedule.name, 
                                        schedule.todayEvents,
                                        currentDate
                                      )}
                                    </div>
                                    
                                    {/* Copy button */}
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => copyToClipboard(
                                          generateWhatsAppText(
                                            schedule.name, 
                                            schedule.todayEvents,
                                            currentDate
                                          ), 
                                          schedule.name
                                        )}
                                        className="flex-1"
                                        style={{ backgroundColor: schedule.color }}
                                      >
                                        {copiedTech === schedule.name ? (
                                          <>
                                            <Check className="h-4 w-4 mr-2" />
                                            ¡Copiado!
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copiar al Portapapeles
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="h-[600px]">
                          <Calendar
                            localizer={localizer}
                            events={schedule.todayEvents}
                            startAccessor="start"
                            endAccessor="end"
                            date={currentDate}
                            onNavigate={setCurrentDate}
                            view="day"
                            views={['day']}
                            step={30}
                            timeslots={2}
                            min={new Date(2025, 0, 1, 6, 0, 0)}
                            max={new Date(2025, 0, 1, 22, 0, 0)}
                            showMultiDayTimes
                            toolbar={false}
                            className="h-full"
                            formats={{
                              timeGutterFormat: 'HH:mm',
                              eventTimeRangeFormat: ({ start, end }) => {
                                return `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`;
                              },
                            }}
                            components={{
                              event: ({ event }: { event: CalendarEvent }) => (
                                <div className="text-xs p-1.5 font-medium overflow-hidden h-full">
                                  <div className="font-bold text-[12px] mb-0.5">
                                    {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
                                  </div>
                                  <div className="font-semibold text-[11px]">{event.title}</div>
                                  <div className="text-[10px] opacity-90 mt-0.5">{event.resource?.location || 'Sin ubicación'}</div>
                                </div>
                              ),
                            }}
                            eventPropGetter={() => ({
                              style: {
                                backgroundColor: schedule.color,
                                borderRadius: '6px',
                                opacity: 1,
                                color: 'white',
                                border: `2px solid ${schedule.color}`,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                padding: '4px 6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                minHeight: '60px',
                              }
                            })}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Scroll hint */}
              {schedulesWithEvents.length > 4 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="bg-gradient-to-l from-background to-transparent h-full w-12 flex items-center justify-end pr-2">
                    <ChevronRight className="h-6 w-6 text-muted-foreground animate-pulse" />
                  </div>
                </div>
              )}
            </div>
            );
            })()}
          </div>
        </div>
      )}

      {/* Events Summary - Compact version */}
      {technicianSchedules.length > 0 && (
        <Card className="shadow-elegant border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Resumen de Horas - {moment(currentDate).format('D [de] MMMM [de] YYYY')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {technicianSchedules.map((schedule) => {
                // Filter events for current date
                const todayEvents = schedule.events.filter(event => {
                  const eventDate = moment(event.start).format('YYYY-MM-DD');
                  const selectedDate = moment(currentDate).format('YYYY-MM-DD');
                  return eventDate === selectedDate;
                });
                
                if (todayEvents.length === 0) return null; // Don't show technicians without events today
                
                const totalHours = todayEvents.reduce((acc, event) => {
                  return acc + moment.duration(moment(event.end).diff(moment(event.start))).asHours();
                }, 0);
                
                const firstEvent = todayEvents.length > 0 ? moment(todayEvents[0].start).format('HH:mm') : '-';
                const lastEvent = todayEvents.length > 0 ? moment(todayEvents[todayEvents.length - 1].end).format('HH:mm') : '-';
                
                return (
                  <div 
                    key={schedule.name} 
                    className="p-4 rounded-lg border-l-4 bg-muted/30"
                    style={{ borderLeftColor: schedule.color }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: schedule.color }}
                        />
                        <span className="font-bold text-lg">{schedule.name}</span>
                      </div>
                      
                      <div className="text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Eventos:</span>
                          <span className="font-semibold">{todayEvents.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Horas:</span>
                          <span className="font-semibold">{totalHours.toFixed(1)}h</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Horario:</span>
                          <span className="font-semibold text-xs">{firstEvent} - {lastEvent}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && events.length === 0 && (
        <Card className="shadow-elegant border-border/50">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <CalendarIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No hay eventos</h3>
                <p className="text-muted-foreground">
                  Haz clic en "Cargar Eventos" para obtener los eventos de STEL Order
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Calendario;
