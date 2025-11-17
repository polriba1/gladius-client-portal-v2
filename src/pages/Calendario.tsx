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

// 🚨 VERSION CHECK - This file works with EVENTS (AGENDA), NOT INCIDENTS
console.log('🚨🚨🚨 CALENDARIO VERSION: 3.0 - EVENTS (AGENDA) 🚨🚨🚨');
console.log('📅 File loaded at:', new Date().toISOString());

// EventType representa un tècnic de camp
interface StelEventType {
  path: string;
  deleted: boolean;
  color: string;
  name: string;
  id: number;
  'utc-last-modification-date': string;
}

// Event representa una cita/event al calendari
interface StelEvent {
  id: number;
  subject: string; // Títol de l'event
  description: string | null;
  location: string | null;
  "start-date": string; // Data d'inici
  "end-date": string; // Data de finalització
  "all-day": boolean;
  "event-state": "PENDING" | "COMPLETED" | "REFUSED";
  "event-type-id": number | null; // ID del tipus d'event (tècnic)
  "event-type-path": string | null;
  "calendar-id": number;
  "calendar-path": string;
  "creator-id": number;
  "creator-path": string;
  "account-id": number | null;
  "account-path": string | null;
  "incident-id": number | null;
  "incident-path": string | null;
  "asset-id": number | null;
  "asset-path": string | null;
  "document-id": number | null;
  "document-path": string | null;
  "utc-last-modification-date": string;
  path: string;
  deleted: boolean;
}

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource?: StelEvent; // Resource ara és StelEvent
  technician?: string; // Nom del tècnic
  technicianId?: number; // ID del event-type (tècnic)
}

interface TechnicianSchedule {
  name: string;
  events: CalendarEvent[];
  color: string;
}

// WhatsApp Dialog Component
interface WhatsAppDialogProps {
  schedule: TechnicianSchedule & { todayEvents: CalendarEvent[] };
  currentDate: Date;
  onGenerateText: (name: string, events: CalendarEvent[], date: Date) => Promise<string>;
  onCopy: (text: string, name: string) => Promise<void>;
  copiedTech: string | null;
  loading: boolean;
}

const WhatsAppDialog = ({ schedule, currentDate, onGenerateText, onCopy, copiedTech, loading }: WhatsAppDialogProps) => {
  const [text, setText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    
    if (open && !text && !isGenerating) {
      setIsGenerating(true);
      try {
        const generatedText = await onGenerateText(schedule.name, schedule.todayEvents, currentDate);
        setText(generatedText);
      } catch (error) {
        console.error('Error generating WhatsApp text:', error);
        setText('Error al generar el texto. Por favor, intenta de nuevo.');
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleCopy = async () => {
    if (text) {
      await onCopy(text, schedule.name);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
            {isGenerating ? 'Generando texto...' : 'Copia este texto para enviarlo por WhatsApp'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview of formatted text */}
          <div className="bg-muted p-4 rounded-lg font-mono text-sm whitespace-pre-wrap min-h-[200px]">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Cargando información del cliente...</span>
              </div>
            ) : text || 'Sin datos'}
          </div>
          
          {/* Copy button */}
          <div className="flex gap-2">
            <Button
              onClick={handleCopy}
              disabled={isGenerating || !text}
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
  );
};

const Calendario = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [technicianSchedules, setTechnicianSchedules] = useState<TechnicianSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [copiedTech, setCopiedTech] = useState<string | null>(null);
  const [whatsappTextCache, setWhatsappTextCache] = useState<Map<string, string>>(new Map());
  const [loadingWhatsapp, setLoadingWhatsapp] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<Map<number, StelEventType>>(new Map()); // EventTypes = Tècnics

  // Helper function to get color for technician
  // Persistent color mapping stored in localStorage so each technician keeps the same color
  const COLOR_STORAGE_KEY = 'gladius_tech_colors_v4'; // Changed key to force re-assignment with NEW palette

  // ULTRA-DIVERSE palette with 30 VERY DIFFERENT colors - NO DUPLICATES ALLOWED
  // Each color is carefully chosen to be visually distinct from all others
  // TEC070=color[0], TEC071=color[1], ..., TEC099=color[29]
  const PALETTE = [
    'hsl(0 90% 50%)',     // 0 - Bright Red - TEC070
    'hsl(30 95% 55%)',    // 1 - Vibrant Orange - TEC071
    'hsl(60 100% 45%)',   // 2 - Pure Yellow - TEC072
    'hsl(90 80% 40%)',    // 3 - Yellow-Green - TEC073
    'hsl(120 100% 30%)',  // 4 - Pure Green - TEC074
    'hsl(150 90% 35%)',   // 5 - Turquoise - TEC075
    'hsl(180 100% 35%)',  // 6 - Cyan - TEC076
    'hsl(210 100% 50%)',  // 7 - Sky Blue - TEC077
    'hsl(240 100% 60%)',  // 8 - Pure Blue - TEC078
    'hsl(270 100% 50%)',  // 9 - Purple - TEC079
    'hsl(300 100% 50%)',  // 10 - Magenta - TEC080
    'hsl(330 100% 50%)',  // 11 - Pink - TEC081
    'hsl(15 100% 45%)',   // 12 - Red-Orange - TEC082
    'hsl(45 100% 50%)',   // 13 - Gold - TEC083
    'hsl(75 90% 40%)',    // 14 - Lime - TEC084
    'hsl(105 85% 35%)',   // 15 - Forest Green - TEC085
    'hsl(135 95% 30%)',   // 16 - Emerald - TEC086
    'hsl(165 100% 40%)',  // 17 - Mint - TEC087
    'hsl(195 100% 45%)',  // 18 - Light Blue - TEC088
    'hsl(225 90% 55%)',   // 19 - Periwinkle - TEC089
    'hsl(255 100% 55%)',  // 20 - Indigo - TEC090
    'hsl(285 100% 45%)',  // 21 - Violet - TEC091
    'hsl(315 100% 45%)',  // 22 - Hot Pink - TEC092
    'hsl(345 95% 50%)',   // 23 - Crimson - TEC093
    'hsl(22 100% 50%)',   // 24 - Coral - TEC094
    'hsl(52 100% 48%)',   // 25 - Bright Yellow - TEC095
    'hsl(82 85% 38%)',    // 26 - Chartreuse - TEC096
    'hsl(112 90% 32%)',   // 27 - Dark Green - TEC097
    'hsl(142 100% 32%)',  // 28 - Sea Green - TEC098
    'hsl(172 100% 38%)',  // 29 - Aquamarine - TEC099
  ];

  const loadColorMap = (): Record<string, string> => {
    try {
      if (typeof window === 'undefined') return {};
      
      // Clear ALL old color mappings to force complete re-assignment with new ultra-diverse palette
      const oldKeys = ['gladius_tech_colors_v2', 'gladius_tech_colors_v3'];
      oldKeys.forEach(oldKey => {
        if (localStorage.getItem(oldKey)) {
          console.log(`🔄 Clearing old color mapping: ${oldKey}`);
          localStorage.removeItem(oldKey);
        }
      });
      
      const raw = localStorage.getItem(COLOR_STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (_e) {
      return {};
    }
  };

  const saveColorMap = (map: Record<string, string>) => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(map));
    } catch (_e) {
      // ignore
    }
  };

  const hashString = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  };

  const getColorForCalendar = (technicianName: string): string => {
    if (!technicianName) return 'hsl(210 12% 47%)';

    if (technicianName === 'Sin Asignar') return 'hsl(210 12% 47%)';

    const map = loadColorMap();
    
    // If already mapped, return the saved color
    if (map[technicianName]) {
      return map[technicianName];
    }

    // Extract TEC number and map to unique palette index
    const match = technicianName.match(/TEC\s*(\d+)/i);
    let color: string;
    
    if (match) {
      const tecNum = parseInt(match[1]);
      const baseNum = 70; // TEC070 is the first technician
      const paletteIndex = tecNum - baseNum;
      
      // CRITICAL: Each TEC gets a UNIQUE color based on its number
      // TEC070 -> PALETTE[0], TEC071 -> PALETTE[1], ..., TEC099 -> PALETTE[29]
      if (paletteIndex >= 0 && paletteIndex < PALETTE.length) {
        color = PALETTE[paletteIndex];
        console.log(`🎨 Assigning unique color to ${technicianName}: ${color} (index ${paletteIndex})`);
      } else if (tecNum >= 100) {
        // For TEC100+, use a different range to avoid collisions
        // TEC100 -> offset 30, TEC101 -> offset 31, etc.
        const extendedIndex = (tecNum - 100) % PALETTE.length;
        color = PALETTE[extendedIndex];
        console.warn(`⚠️ TEC${tecNum} is out of primary range (070-099), using extended mapping at index ${extendedIndex}`);
      } else {
        // For TEC numbers below 070, use a deterministic hash
        const h = (tecNum * 37) % 360; // Deterministic but unique
        color = `hsl(${h} 70% 50%)`;
        console.warn(`⚠️ TEC${tecNum} is below TEC070, using hash-based color`);
      }
    } else {
      // No TEC pattern found - try to find first unused color from palette
      const usedColors = new Set(Object.values(map));
      const availableColor = PALETTE.find(c => !usedColors.has(c));
      
      if (availableColor) {
        color = availableColor;
      } else {
        // All palette colors used, generate deterministic hash-based color
        const h = hashString(technicianName) % 360;
        color = `hsl(${h} 70% 50%)`;
        console.warn(`⚠️ All palette colors exhausted for "${technicianName}", using hash-based color`);
      }
    }

    // CRITICAL: Verify no duplicate colors exist before saving
    const existingColors = Object.values(map);
    if (existingColors.includes(color)) {
      console.error(`❌ DUPLICATE COLOR DETECTED! ${color} is already used by another technician!`);
      console.error(`Current mapping:`, map);
      console.error(`Trying to assign to:`, technicianName);
      // Force a unique color by adding variation
      const variation = Object.keys(map).length;
      color = `hsl(${(hashString(technicianName) + variation * 13) % 360} 85% 50%)`;
      console.log(`🔧 Generated unique variation: ${color}`);
    }

    // Save the mapping
    map[technicianName] = color;
    saveColorMap(map);
    
    console.log(`✅ Color assigned: ${technicianName} -> ${color}`);
    return color;
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

  // Fetch client info from STEL API
  const fetchClientInfo = async (clientId: string) => {
    try {
      console.log(`🔍 Fetching client info for ID: ${clientId}`);
      
      if (import.meta.env.DEV) {
        // DEV: use Vite proxy
        // Try 1: Regular clients endpoint - GET /app/clients/{ID}
        let clientUrl = `/api/stel/app/clients/${clientId}`;
        console.log(`📡 [1/2] Trying clients endpoint: ${clientUrl}`);
        
        let response = await fetch(clientUrl, {
          headers: {
            'APIKEY': import.meta.env.VITE_STEL_API_KEY,
          },
        });
        
        let clientData = null;
        let client = null;
        
        // If clients endpoint succeeds, parse the response
        if (response.ok) {
          clientData = await response.json();
          console.log(`✅ Clients endpoint SUCCESS (${response.status}):`, {
            isArray: Array.isArray(clientData),
            dataType: typeof clientData,
            hasId: clientData?.id,
            data: clientData
          });
          
          // Handle both array and object responses
          client = Array.isArray(clientData) ? clientData[0] : clientData;
          
          // Validate that we got a real client object with an ID
          if (client && client.id) {
            console.log(`✅ Found client in /clients: ${client.name || client['legal-name']} (ID: ${client.id})`);
            return client;
          }
        } else {
          console.warn(`⚠️ Clients endpoint FAILED with status ${response.status}`);
        }
        
        // Try 2: Potential clients endpoint - GET /app/potentialClients/{ID}
        console.log(`📡 [2/2] Client not found in /clients, trying /potentialClients...`);
        
        clientUrl = `/api/stel/app/potentialClients/${clientId}`;
        console.log(`📡 Trying potentialClients endpoint: ${clientUrl}`);
        
        response = await fetch(clientUrl, {
          headers: {
            'APIKEY': import.meta.env.VITE_STEL_API_KEY,
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ PotentialClients endpoint FAILED (${response.status}):`, errorText);
          throw new Error(`Client ${clientId} not found: /clients returned ${response.status}, /potentialClients returned ${response.status}`);
        }
        
        clientData = await response.json();
        console.log(`✅ PotentialClients endpoint SUCCESS (${response.status}):`, {
          isArray: Array.isArray(clientData),
          dataType: typeof clientData,
          hasId: clientData?.id,
          data: clientData
        });
        
        // Handle both array and object responses
        client = Array.isArray(clientData) ? clientData[0] : clientData;
        
        if (!client || !client.id) {
          throw new Error(`Client ${clientId} not found or has invalid response from potentialClients`);
        }
        
        console.log(`✅ Found client in /potentialClients: ${client.name || client['legal-name']} (ID: ${client.id})`);
        return client;
      } else {
        // PROD: use Supabase Edge Functions with explicit fallback handling
        const parseClient = (payload: unknown) => {
          const candidate = Array.isArray(payload) ? payload[0] : payload;
          if (!candidate || typeof candidate !== 'object') return null;
          const clientObj = candidate as Record<string, unknown>;
          const hasId = Boolean(clientObj.id);
          const hasName = Boolean(clientObj['legal-name'] || clientObj['name']);
          return hasId || hasName ? clientObj : null;
        };

        const invokeEdgeFunction = async (functionName: string) => {
          console.log(`📡 [PROD] Invoking ${functionName} Edge Function for client ${clientId}`);
          const { data, error } = await supabase.functions.invoke(functionName, {
            body: { clientId },
          });

          if (error) {
            console.error(`❌ ${functionName} Edge Function error:`, error);
            throw new Error(error.message || `Edge function ${functionName} failed`);
          }

          const potentialError = (data as Record<string, unknown>)?.error;
          if (potentialError) {
            console.error(`❌ ${functionName} Edge Function returned error:`, potentialError);
            throw new Error(typeof potentialError === 'string' ? potentialError : 'Unknown edge function error');
          }

          return data;
        };

        try {
          const primaryData = await invokeEdgeFunction('stel-client');
          const client = parseClient(primaryData);

          if (client) {
            console.log(`✅ Found client via stel-client: ${client.name || client['legal-name']} (ID: ${client.id ?? 'N/A'})`);
            return client;
          }

          console.warn(`⚠️ stel-client did not return a valid client payload. Falling back to stel-potential-client...`);
        } catch (primaryError) {
          console.warn(`⚠️ stel-client invocation failed (${primaryError instanceof Error ? primaryError.message : primaryError}). Trying stel-potential-client...`);
        }

        const fallbackData = await invokeEdgeFunction('stel-potential-client');
        const fallbackClient = parseClient(fallbackData);

        if (!fallbackClient) {
          throw new Error(`Client ${clientId} not found in potential clients response`);
        }

        console.log(`✅ Found client via stel-potential-client: ${fallbackClient.name || fallbackClient['legal-name']} (ID: ${fallbackClient.id ?? 'N/A'})`);
        return fallbackClient;
      }
    } catch (error) {
      console.error(`❌ Error fetching client ${clientId}:`, error);
      throw error; // Re-throw to propagate the error
    }
  };

  // Fetch employee info from STEL API
  const fetchEmployeeInfo = async (employeeId: string) => {
    try {
      console.log(`🔍 Fetching employee info for ID: ${employeeId}`);
      
      if (import.meta.env.DEV) {
        // DEV: use Vite proxy
        const response = await fetch(`/api/stel/app/employees/${employeeId}`, {
          headers: {
            'APIKEY': import.meta.env.VITE_STEL_API_KEY,
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Employee API error ${response.status}:`, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const employeeData = await response.json();
        console.log(`✅ Employee data received:`, employeeData);
        // API returns an array with one employee
        const employee = Array.isArray(employeeData) ? employeeData[0] : employeeData;
        
        if (!employee) {
          throw new Error(`Employee ${employeeId} not found in response`);
        }
        
        return employee;
      } else {
        // PROD: use Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('stel-employee', {
          body: { employeeId },
        });
        
        if (error) {
          console.error(`❌ Edge function error:`, error);
          throw error;
        }
        
        console.log(`✅ Employee data received from Edge Function:`, data);
        
        // Check if Edge Function returned an error response
        if (data && data.error) {
          console.error(`❌ Edge function returned error:`, data.error);
          throw new Error(data.error);
        }
        
        const employee = Array.isArray(data) ? data[0] : data;
        
        if (!employee || !employee.id) {
          throw new Error(`Employee ${employeeId} not found or invalid response`);
        }
        
        console.log(`✅ Found employee: ${employee.name} ${employee.surname} (ID: ${employee.id})`);
        return employee;
      }
    } catch (error) {
      console.error(`❌ Error fetching employee ${employeeId}:`, error);
      throw error; // Re-throw to propagate the error
    }
  };

  // Fetch address info from STEL API
  const fetchAddressInfo = async (addressId: string) => {
    try {
      console.log(`🏠 Fetching address info for ID: ${addressId}`);
      
      if (import.meta.env.DEV) {
        // DEV: use Vite proxy
        const response = await fetch(`/api/stel/app/addresses/${addressId}`, {
          headers: {
            'APIKEY': import.meta.env.VITE_STEL_API_KEY,
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Address API error ${response.status}:`, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const addressData = await response.json();
        console.log(`✅ Address data received:`, addressData);
        // API might return an array with one address
        const address = Array.isArray(addressData) ? addressData[0] : addressData;
        
        if (!address) {
          throw new Error(`Address ${addressId} not found in response`);
        }
        
        return address;
      } else {
        // PROD: use Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('stel-address', {
          body: { addressId },
        });
        
        if (error) {
          console.error(`❌ Edge function error:`, error);
          throw error;
        }
        
        console.log(`✅ Address data received from Edge Function:`, data);
        
        // Check if Edge Function returned an error response
        if (data && data.error) {
          console.error(`❌ Edge function returned error:`, data.error);
          throw new Error(data.error);
        }
        
        const address = Array.isArray(data) ? data[0] : data;
        
        if (!address || !address.id) {
          throw new Error(`Address ${addressId} not found or invalid response`);
        }
        
        console.log(`✅ Found address: ${address['address-data']} (ID: ${address.id})`);
        return address;
      }
    } catch (error) {
      console.error(`❌ Error fetching address ${addressId}:`, error);
      throw error;
    }
  };

  // Fetch incident by ID from STEL API (to get address-id)
  const fetchIncidentById = async (incidentId: number): Promise<Record<string, unknown> | null> => {
    try {
      console.log(`📋 Fetching incident info for ID: ${incidentId}`);
      
      if (import.meta.env.DEV) {
        const response = await fetch(`/api/stel/app/incidents/${incidentId}`, {
          headers: {
            'APIKEY': import.meta.env.VITE_STEL_API_KEY,
          },
        });
        
        if (!response.ok) {
          console.warn(`⚠️ Incident ${incidentId} not found (${response.status})`);
          return null;
        }
        
        const incidentData = await response.json();
        console.log(`✅ Incident data received:`, incidentData);
        return Array.isArray(incidentData) ? incidentData[0] : incidentData;
      } else {
        // TODO: Create edge function if needed
        // For now, return null in PROD
        console.warn('⚠️ fetchIncidentById not implemented in PROD yet');
        return null;
      }
    } catch (error) {
      console.error(`❌ Failed to fetch incident ${incidentId}:`, error);
      return null;
    }
  };

  // Generate WhatsApp formatted text for technician's day
  const generateWhatsAppText = async (technicianName: string, events: CalendarEvent[], date: Date) => {
    console.log(`📱 Generating WhatsApp text for ${technicianName} with ${events.length} events`);

    const filteredEvents = events; // No need to filter for I-PRT with events

    // If no events left after filtering, return empty message
    if (filteredEvents.length === 0) {
      const dateStr = moment(date).format('dddd, D [de] MMMM [de] YYYY');
      return `📋 *Agenda para ${technicianName}*\n📅 ${dateStr}\n⏱️ Total: 0 servicios (0.0h)\n\nNo hay servicios programados para esta fecha.`;
    }

    const dateStr = moment(date).format('dddd, D [de] MMMM [de] YYYY');
    const totalHours = filteredEvents.reduce((acc, event) => {
      return acc + moment.duration(moment(event.end).diff(moment(event.start))).asHours();
    }, 0);

    let text = `📋 *Agenda para ${technicianName}*\n`;
    text += `📅 ${dateStr}\n`;
    text += `⏱️ Total: ${filteredEvents.length} servicios (${totalHours.toFixed(1)}h)\n`;
    text += `\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Fetch all client info, address info, and employee info in parallel
    console.log(`📡 Fetching data for ${filteredEvents.length} events...`);
    
    // Extract all IDs first to maintain consistency
    const clientIds = filteredEvents.map((event) => {
      let clientId = event.resource?.['account-path']?.split('/').pop();
      if (!clientId || clientId === '' || clientId === 'undefined') {
        clientId = event.resource?.['account-id']?.toString();
      }
      return clientId;
    });
    
    const clientPromises = filteredEvents.map(async (event, index) => {
      const clientId = clientIds[index];
      
      console.log(`📋 Event ${index + 1}/${filteredEvents.length}: Client ID:`, clientId, '| account-path:', event.resource?.['account-path'], '| account-id:', event.resource?.['account-id']);
      
      if (!clientId) {
        console.warn(`⚠️ Event ${event.id} has no account-path or account-id`);
        return null;
      }
      
      try {
        const client = await fetchClientInfo(clientId);
        console.log(`✅ Successfully fetched client ${clientId}:`, client?.name || client?.['legal-name']);
        return client;
      } catch (error) {
        console.error(`❌ Failed to fetch client ${clientId}:`, error);
        return null;
      }
    });
    
    // Events NO tenen address-id directament, cal buscar-lo a través de la incidència vinculada
    const addressPromises = filteredEvents.map(async (event, index) => {
      try {
        // Primer: intentar obtenir address-id directament (per si de cas)
        let addressId = event.resource?.['address-path']?.split('/').pop();
        if (!addressId || addressId === '' || addressId === 'undefined') {
          addressId = event.resource?.['address-id']?.toString();
        }
        
        // Si no tenim address-id però tenim incident-id, buscar la incidència
        if ((!addressId || addressId === 'undefined') && event.resource?.['incident-id']) {
          console.log(`📋 Event ${event.id}: No address-id, fetching from incident ${event.resource['incident-id']}`);
          
          const incident = await fetchIncidentById(event.resource['incident-id']);
          if (incident) {
            addressId = incident['address-path']?.split('/').pop() || incident['address-id']?.toString();
            console.log(`✅ Found address-id from incident: ${addressId}`);
          }
        }
        
        if (!addressId || addressId === 'undefined') {
          console.warn(`⚠️ Event ${event.id} has no address-id (tried direct and incident)`);
          return null;
        }
        
        return await fetchAddressInfo(addressId);
      } catch (error) {
        console.error(`❌ Failed to fetch address for event ${event.id}:`, error);
        return null;
      }
    });
    
    const [clientsInfo, addressesInfo] = await Promise.all([
      Promise.all(clientPromises),
      Promise.all(addressPromises)
    ]);
    
    console.log(`✅ Fetched ${clientsInfo.filter(c => c).length} clients and ${addressesInfo.filter(a => a).length} addresses`);

    filteredEvents.forEach((event, index) => {
      const clientInfo = clientsInfo[index];
      const addressInfo = addressesInfo[index];
      const clientId = clientIds[index];
      
      // 1. Títol/Subject de l'event (amb incident-id si està vinculat)
      const eventSubject = event.resource?.subject || event.title || 'Sin título';
      const incidentId = event.resource?.['incident-id'];
      
      if (incidentId) {
        text += `*Evento: ${eventSubject}* (Vinculado a incidencia #${incidentId})\n\n`;
      } else {
        text += `*Evento: ${eventSubject}*\n\n`;
      }
      
      // 2. Descripció de l'event
      if (event.resource?.description) {
        text += `${event.resource.description}\n\n`;
      }
      
      // 3. Quan (franja horària de la cita)
      // Format: "DD/MM/YYYY HH:mm - HH:mm"
      const startDateTime = moment(event.start).format('DD/MM/YYYY HH:mm');
      const endTime = moment(event.end).format('HH:mm');
      text += `*Cuándo:* ${startDateTime} - ${endTime}\n\n`;
      
      // 4. Ubicación (si hi ha location)
      if (event.resource?.location) {
        text += `*Ubicación especificada:* ${event.resource.location}\n\n`;
      }
      
      // 5. Client (SEMPRE amb nom real de l'API)
      if (clientInfo) {
        const clientName = clientInfo['legal-name'] || clientInfo.name || 'Sin nombre';
        text += `*Cliente:* ${clientName}\n\n`;
      } else {
        if (clientId) {
          text += `*Cliente:* ⚠️ Error obteniendo datos del cliente #${clientId}\n\n`;
        } else {
          text += `*Cliente:* ⚠️ Sin cliente asignado\n\n`;
        }
      }
      
      // 6. Direcció (obtinguda de la incidència vinculada o directament)
      if (addressInfo) {
        const addressParts = [
          addressInfo['address-data'],
          addressInfo['city-town'],
          addressInfo['postal-code'],
          addressInfo['province']
        ].filter(Boolean);
        
        const fullAddress = addressParts.join(', ');
        text += `*Dirección:* ${fullAddress}\n`;
      } else {
        // Si no hi ha addressInfo, potser hi ha location
        if (event.resource?.location) {
          text += `*Dirección:* ${event.resource.location}\n`;
        } else {
          text += `*Dirección:* ⚠️ Sin dirección asignada\n`;
        }
      }
      
      // Separator between events
      if (index < filteredEvents.length - 1) {
        text += `\n━━━━━━━━━━━━━━━━━━━━\n\n`;
      }
    });

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

  // Generate WhatsApp text and handle async loading
  const handleGenerateWhatsAppText = async (technicianName: string, events: CalendarEvent[], date: Date) => {
    const cacheKey = `${technicianName}-${moment(date).format('YYYY-MM-DD')}`;
    
    // Check cache first
    if (whatsappTextCache.has(cacheKey)) {
      return whatsappTextCache.get(cacheKey)!;
    }
    
    // Generate new text
    setLoadingWhatsapp(technicianName);
    try {
      const text = await generateWhatsAppText(technicianName, events, date);
      
      // Cache the result
      setWhatsappTextCache(prev => new Map(prev).set(cacheKey, text));
      
      return text;
    } finally {
      setLoadingWhatsapp(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (!session?.user) {
            navigate('/');
          } else {
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        if (mounted) {
          navigate('/');
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        if (!session?.user) {
          navigate('/');
        } else {
          setIsAuthenticated(true);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchEvents = async () => {
    console.log('🚀 fetchEvents called - LOADING EVENTS (AGENDA)!');
    setLoading(true);
    
    // 🔄 Clear WhatsApp text cache when fetching new events
    console.log('🗑️ Clearing WhatsApp text cache...');
    setWhatsappTextCache(new Map());
    
    try {
      // STEP 1: Fetch EventTypes (Tècnics de camp)
      console.log('📋 Step 1: Fetching EventTypes (Technicians)...');
      
      const fetchEventTypes = async (): Promise<Map<number, StelEventType>> => {
        const eventTypesMap = new Map<number, StelEventType>();
        
        if (import.meta.env.DEV) {
          // DEV: use Vite proxy
          const eventTypesUrl = '/api/stel/app/eventTypes?limit=500';
          const response = await fetch(eventTypesUrl, {
            headers: {
              APIKEY: import.meta.env.VITE_STEL_API_KEY,
            },
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch EventTypes: ${response.status}`);
          }
          
          const eventTypesData = await response.json() as StelEventType[];
          console.log(`✅ Fetched ${eventTypesData.length} EventTypes`);
          
          eventTypesData.forEach(et => {
            if (!et.deleted) {
              eventTypesMap.set(et.id, et);
            }
          });
        } else {
          // PROD: Supabase Edge Function (crearem una nova si cal)
          // TODO: Crear edge function 'stel-event-types'
          const { data, error } = await supabase.functions.invoke('stel-event-types', {
            body: { limit: 500 },
          });
          
          if (error) throw error;
          
          const eventTypesData = (data ?? []) as StelEventType[];
          eventTypesData.forEach(et => {
            if (!et.deleted) {
              eventTypesMap.set(et.id, et);
            }
          });
        }
        
        console.log(`✅ EventTypes Map created with ${eventTypesMap.size} technicians`);
        return eventTypesMap;
      };
      
      const eventTypesMap = await fetchEventTypes();
      setEventTypes(eventTypesMap);
      
      // STEP 2: Process Events
      const applyEvents = async (stelEvents: StelEvent[]) => {
        console.log('📅 Processing Events:', {
          totalEvents: stelEvents.length
        });

        // Filter out deleted events
        const validEvents = stelEvents.filter((event) => {
          // Exclude deleted events
          if (event.deleted) return false;
          
          return true;
        });

        console.log('📅 Filtered Events:', {
          total: stelEvents.length,
          valid: validEvents.length,
          dateRange: {
            earliest: validEvents.length > 0 ? validEvents.reduce((min, i) => i['start-date'] < min ? i['start-date'] : min, validEvents[0]['start-date']) : null,
            latest: validEvents.length > 0 ? validEvents.reduce((max, i) => i['start-date'] > max ? i['start-date'] : max, validEvents[0]['start-date']) : null
          },
          sample: validEvents.slice(0, 5).map(e => ({
            id: e.id,
            subject: e.subject,
            description: e.description,
            startDate: e['start-date'],
            endDate: e['end-date'],
            eventTypeId: e['event-type-id']
          }))
        });

        // Map events to calendar events
        const calendarEvents: CalendarEvent[] = validEvents.map((event) => {
          // Events have 'start-date' and 'end-date' fields: "2024-09-30T09:00:00+0000"
          // ⚠️ CRITICAL: The STEL API sends dates with +0000 but they are ALREADY in local time (CET/CEST)
          // We need to extract the time values and use them AS-IS without timezone conversion
          
          // Helper function to parse date string without timezone conversion
          const parseLocalDate = (dateStr: string): Date => {
            const [datePart, timePartWithTZ] = dateStr.split('T');
            const timePart = timePartWithTZ.split('+')[0].split('-')[0]; // Remove timezone
            
            const [year, month, day] = datePart.split('-').map(Number);
            const timeComponents = timePart.split(':');
            const hours = parseInt(timeComponents[0]);
            const minutes = parseInt(timeComponents[1]);
            const seconds = timeComponents[2] ? parseInt(timeComponents[2]) : 0;
            
            // Create a Date object with the LOCAL time values (no timezone conversion)
            return new Date(year, month - 1, day, hours, minutes, seconds);
          };
          
          const startDate = parseLocalDate(event['start-date']);
          const endDate = parseLocalDate(event['end-date']);
          
          // Get technician name from EventType
          const eventType = event['event-type-id'] ? eventTypesMap.get(event['event-type-id']) : null;
          const technicianName = eventType?.name || 'Sin Asignar';

          const calendarEvent: CalendarEvent = {
            id: event.id,
            title: event.subject || event.description || `Event ${event.id}`,
            start: startDate,
            end: endDate,
            resource: event,
            technician: technicianName,
            technicianId: event['event-type-id'] || undefined,
          };
          
          return calendarEvent;
        });
        
        // Create a map to group events by technician
        const technicianMap = new Map<string, CalendarEvent[]>();
        
        // Collect all unique technicians
        const allTechnicians = new Set<string>();
        calendarEvents.forEach(event => {
          if (event.technician) {
            allTechnicians.add(event.technician);
          }
        });
        
        console.log('🔧 Detected Technicians:', {
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

        // Create technician schedules with colors from EventTypes
        const usedColors = new Set<string>();
        
        const schedules: TechnicianSchedule[] = Array.from(technicianMap.entries())
          .map(([name, events]) => {
            let color: string;
            
            // Try to find the EventType for this technician
            const eventType = Array.from(eventTypesMap.values()).find(et => et.name === name);
            
            if (eventType && eventType.color) {
              // Use color from API
              color = eventType.color;
              
              // Check if color is already used (duplicate)
              if (usedColors.has(color)) {
                console.warn(`⚠️ Duplicate color detected for ${name}: ${color}`);
                // Generate a unique color based on name hash
                const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const hue = (hash * 137.508) % 360; // Golden angle for good distribution
                color = `hsl(${Math.round(hue)}, 70%, 50%)`;
                console.log(`✅ Generated unique color for ${name}: ${color}`);
              }
            } else {
              // Fallback: use existing logic for "Sin Asignar" or unknown technicians
              color = getColorForCalendar(name);
            }
            
            usedColors.add(color);
            
            return {
              name,
              events,
              color
            };
          })
          .sort((a, b) => {
            // Sort "Sin Asignar" last
            if (a.name === 'Sin Asignar') return 1;
            if (b.name === 'Sin Asignar') return -1;
            // Sort technicians alphabetically
            return a.name.localeCompare(b.name);
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
          // Fetch events from 1 month before AND 1 month ahead (2 months total)
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          const startDateFilter = oneMonthAgo.toISOString().replace(/\.\d{3}Z$/, '+0000');
          
          const oneMonthAhead = new Date();
          oneMonthAhead.setMonth(oneMonthAhead.getMonth() + 1);
          const endDateFilter = oneMonthAhead.toISOString().replace(/\.\d{3}Z$/, '+0000');
          
          console.log(`📅 Filtering events from ${startDateFilter} to ${endDateFilter}`);
          
          const limit = 500; // Maximum supported
          const proxyUrl = `/api/stel/app/events?limit=${limit}&start-date=${encodeURIComponent(startDateFilter)}&end-date=${encodeURIComponent(endDateFilter)}`;
          
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
          
          // Filter: not deleted
          const validEvents = allEvents.filter((event) => {
            // Exclude deleted events
            if (event.deleted) return false;
            
            // Exclude events without start-date
            if (!event['start-date']) return false;
            
            return true;
          });
          
          console.log(`✅ Valid events (not deleted): ${validEvents.length}`);
          console.log(`📅 Date range filter: ${moment(oneMonthAgo).format('YYYY-MM-DD')} to ${moment(oneMonthAhead).format('YYYY-MM-DD')}`);
          
          // Get date range
          if (validEvents.length > 0) {
            const dates = validEvents
              .map(e => e['start-date'])
              .filter(d => d)
              .sort();
            console.log(`📅 Actual events date range: ${dates[0]} to ${dates[dates.length - 1]}`);
          }

          await applyEvents(validEvents);
          return;
        } catch (viteError) {
          console.warn('❌ Vite proxy request failed, attempting Supabase Edge Function', viteError);
        }
      }

      console.log('⚠️ Not in DEV mode or Vite proxy failed, using Supabase Edge Function');
      
      // Fetch events from 1 month before and 1 month ahead (2 months total)
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const startDate = oneMonthAgo.toISOString().replace(/\.\d{3}Z$/, '+0000');
      
      const oneMonthAhead = new Date();
      oneMonthAhead.setMonth(oneMonthAhead.getMonth() + 1);
      const endDate = oneMonthAhead.toISOString().replace(/\.\d{3}Z$/, '+0000');
      
      const limit = 500;
      
      console.log(`📅 Fetching events from ${startDate} to ${endDate}`);
      
      try {
        console.log(`🔧 Supabase Edge Function Request: limit=${limit}`);

        // TODO: Crear edge function 'stel-events'
        const { data, error } = await supabase.functions.invoke('stel-events', {
          body: {
            limit: limit.toString(),
            startDate,
            endDate,
          },
        });

        if (error) {
          throw error;
        }

        const allEvents = (data ?? []) as StelEvent[];
        console.log(`✅ Total events fetched: ${allEvents.length}`);
        
        // Filter: not deleted
        const validEvents = allEvents.filter((event) => {
          if (event.deleted) return false;
          if (!event['start-date']) return false;
          
          return true;
        });
        
        console.log(`✅ Valid events (not deleted): ${validEvents.length}`);
        console.log(`📅 Date range filter: ${moment(oneMonthAgo).format('YYYY-MM-DD')} to ${moment(oneMonthAhead).format('YYYY-MM-DD')}`);
        
        // Get date range
        if (validEvents.length > 0) {
          const dates = validEvents
            .map(e => e['start-date'])
            .filter(d => d)
            .sort();
          console.log(`📅 Actual events date range: ${dates[0]} to ${dates[dates.length - 1]}`);
        }

        await applyEvents(validEvents);
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
              Calendario de Eventos (Agenda)
            </h1>
            <p className="text-muted-foreground">
              Gestión de eventos y citas de STEL Order
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
          {loading ? 'Cargando...' : '📅 Cargar Eventos (v3.0)'}
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
                              <WhatsAppDialog 
                                schedule={schedule}
                                currentDate={currentDate}
                                onGenerateText={handleGenerateWhatsAppText}
                                onCopy={copyToClipboard}
                                copiedTech={copiedTech}
                                loading={loadingWhatsapp === schedule.name}
                              />
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
                            defaultView="day"
                            views={['day']}
                            step={30}
                            timeslots={2}
                            min={new Date(2025, 0, 1, 8, 0, 0)}
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
                                  <div className="text-[10px] opacity-90 mt-0.5">
                                    {event.resource?.['full-reference'] || event.resource?.reference || 'Sin referencia'}
                                  </div>
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
                          <span className="text-muted-foreground">Incidencias:</span>
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
