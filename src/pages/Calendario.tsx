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

// 🚨 VERSION CHECK - This file should ONLY work with INCIDENTS, NOT EVENTS
console.log('🚨🚨🚨 CALENDARIO VERSION: 2.0 - INCIDENTS ONLY (NOT EVENTS) 🚨🚨🚨');
console.log('📅 File loaded at:', new Date().toISOString());

interface StelIncidentType {
  path: string;
  deleted: boolean;
  color: string;
  name: string;
  id: number;
  'utc-last-modification-date': string;
}

interface StelIncident {
  id: number;
  reference: string;
  "full-reference": string;
  description: string | null;
  date: string; // Date of the incident (when it's scheduled)
  "utc-last-modification-date": string;
  "account-path": string;
  "account-id": number;
  "assignee-path": string | null; // The technician assigned
  "assignee-id": number | null;
  "creator-path": string;
  "creator-id": number;
  "address-path": string | null;
  "address-id": number | null;
  "incident-type-path": string | null;
  "incident-type-id": number | null;
  "incident-state-path": string;
  "incident-state-id": number;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  "creation-date": string;
  "assigned-date": string | null;
  "closing-date": string | null;
  deleted: boolean;
  phone: string | null;
  resolution: string | null;
  assets: unknown[];
  length: number;
}

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource?: StelIncident; // Changed from StelEvent to StelIncident
  technician?: string; // Added to track technician
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
  const [incidentTypes, setIncidentTypes] = useState<Map<number, StelIncidentType>>(new Map());

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
        // PROD: use Supabase Edge Function
        // stel-client already handles fallback to potentialClients internally
        console.log(`📡 [PROD] Invoking stel-client Edge Function for client ${clientId}`);
        const { data, error } = await supabase.functions.invoke('stel-client', {
          body: { clientId },
        });
        
        if (error) {
          console.error(`❌ Edge function error:`, error);
          throw error;
        }
        
        console.log(`✅ Client data received from Edge Function:`, data);
        
        // Check if Edge Function returned an error response (e.g., { error: "...", clientId: "..." })
        if (data && data.error) {
          console.error(`❌ Edge function returned error:`, data.error);
          throw new Error(data.error);
        }
        
        const client = Array.isArray(data) ? data[0] : data;
        
        if (!client || !client.id) {
          throw new Error(`Client ${clientId} not found or invalid response`);
        }
        
        console.log(`✅ Found client: ${client.name || client['legal-name']} (ID: ${client.id})`);
        return client;
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

  // Generate WhatsApp formatted text for technician's day
  const generateWhatsAppText = async (technicianName: string, events: CalendarEvent[], date: Date) => {
    const dateStr = moment(date).format('dddd, D [de] MMMM [de] YYYY');
    const totalHours = events.reduce((acc, event) => {
      return acc + moment.duration(moment(event.end).diff(moment(event.start))).asHours();
    }, 0);

    let text = `📋 *Agenda para ${technicianName}*\n`;
    text += `📅 ${dateStr}\n`;
    text += `⏱️ Total: ${events.length} servicios (${totalHours.toFixed(1)}h)\n`;
    text += `\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Fetch all client info, address info, and employee info in parallel
    console.log(`📡 Fetching data for ${events.length} events...`);
    
    // Extract all IDs first to maintain consistency
    const clientIds = events.map((event) => {
      let clientId = event.resource?.['account-path']?.split('/').pop();
      if (!clientId || clientId === '' || clientId === 'undefined') {
        clientId = event.resource?.['account-id']?.toString();
      }
      return clientId;
    });
    
    const clientPromises = events.map(async (event, index) => {
      const clientId = clientIds[index];
      
      console.log(`📋 Event ${index + 1}/${events.length}: Client ID:`, clientId, '| account-path:', event.resource?.['account-path'], '| account-id:', event.resource?.['account-id']);
      
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
    
    const addressIds = events.map((event) => {
      let addressId = event.resource?.['address-path']?.split('/').pop();
      if (!addressId || addressId === '' || addressId === 'undefined') {
        addressId = event.resource?.['address-id']?.toString();
      }
      return addressId;
    });
    
    const employeeIds = events.map((event) => {
      let employeeId = event.resource?.['creator-path']?.split('/').pop();
      if (!employeeId || employeeId === '' || employeeId === 'undefined') {
        employeeId = event.resource?.['creator-id']?.toString();
      }
      return employeeId;
    });
    
    const addressPromises = events.map(async (event, index) => {
      const addressId = addressIds[index];
      
      if (!addressId) {
        console.warn(`⚠️ Event ${event.id} has no address-path or address-id`);
        return null;
      }
      try {
        return await fetchAddressInfo(addressId);
      } catch (error) {
        console.error(`❌ Failed to fetch address ${addressId}:`, error);
        return null;
      }
    });
    
    const employeePromises = events.map(async (event, index) => {
      const employeeId = employeeIds[index];
      
      if (!employeeId) {
        console.warn(`⚠️ Event ${event.id} has no creator-path or creator-id`);
        return null;
      }
      try {
        return await fetchEmployeeInfo(employeeId);
      } catch (error) {
        console.error(`❌ Failed to fetch employee ${employeeId}:`, error);
        return null;
      }
    });
    
    const [clientsInfo, addressesInfo, employeesInfo] = await Promise.all([
      Promise.all(clientPromises),
      Promise.all(addressPromises),
      Promise.all(employeePromises)
    ]);
    
    console.log(`✅ Fetched ${clientsInfo.filter(c => c).length} clients, ${addressesInfo.filter(a => a).length} addresses, and ${employeesInfo.filter(e => e).length} employees`);

    events.forEach((event, index) => {
      const clientInfo = clientsInfo[index];
      const addressInfo = addressesInfo[index];
      const employeeInfo = employeesInfo[index];
      const clientId = clientIds[index];
      const addressId = addressIds[index];
      const employeeId = employeeIds[index];
      
      // 1. Codi / Títol de l'avís o incidència
      // Format: "Referencia: [full-reference] - [description]"
      const incidentRef = event.resource?.['full-reference'] || event.resource?.reference || 'N/A';
      text += `*Incidencia: ${incidentRef}*\n\n`;
      
      // 2. Descripció del problema o incidència
      if (event.resource?.description) {
        text += `${event.resource.description}\n\n`;
      }
      
      // 3. Quan (franja horària de la cita)
      // Format: "DD/MM/YYYY HH:mm - HH:mm"
      const startDateTime = moment(event.start).format('DD/MM/YYYY HH:mm');
      const endTime = moment(event.end).format('HH:mm');
      text += `*Cuándo:* ${startDateTime} - ${endTime}\n\n`;
      
      // 4. Tipo de incidencia
      const incidentTypeId = event.resource?.['incident-type-id'];
      const incidentTypeName = incidentTypeId ? incidentTypes.get(incidentTypeId)?.name : null;
      text += `*Tipo:* ${incidentTypeName || 'N/A'}\n\n`;
      
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
      
      // 6. Direcció (DIRECTE de l'API d'adreces - més robust!)
      if (addressInfo) {
        const addressParts = [
          addressInfo['address-data'],
          addressInfo['city-town'],
          addressInfo['postal-code'],
          addressInfo['province']
        ].filter(Boolean);
        
        const fullAddress = addressParts.join(', ');
        text += `*Dirección:* ${fullAddress}\n\n`;
      } else {
        if (addressId) {
          text += `*Dirección:* ⚠️ Error obteniendo dirección #${addressId}\n\n`;
        } else {
          text += `*Dirección:* ⚠️ Sin dirección asignada\n\n`;
        }
      }
      
      // 7. Persona que ha registrat la cita (SEMPRE amb nom real de l'empleat)
      if (employeeInfo) {
        const employeeName = [employeeInfo.name, employeeInfo.surname]
          .filter(Boolean)
          .map(n => n.trim())
          .join(' ')
          .trim();
        text += `*Invitado por:* ${employeeName || 'Sin nombre'}\n`;
      } else {
        if (employeeId) {
          text += `*Invitado por:* ⚠️ Error obteniendo datos del empleado #${employeeId}\n`;
        } else {
          text += `*Invitado por:* ⚠️ Sin empleado asignado\n`;
        }
      }
      
      // Separator between events
      if (index < events.length - 1) {
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

  const fetchIncidents = async () => {
    console.log('🚀 fetchIncidents called - LOADING INCIDENTS (NOT EVENTS)!');
    setLoading(true);
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const applyIncidents = async (stelIncidents: StelIncident[]) => {
        console.log('📅 Processing Incidents:', {
          totalIncidents: stelIncidents.length
        });

        // Filter out deleted incidents and I-PRT incidents
        const validIncidents = stelIncidents.filter((incident) => {
          // Exclude deleted incidents
          if (incident.deleted) return false;
          
          // Exclude I-PRT incidents (reference starts with "I-PRT")
          if (incident.reference && incident.reference.startsWith('I-PRT')) {
            console.log(`🚫 Excluding I-PRT incident: ${incident.reference}`);
            return false;
          }
          
          return true;
        });

        console.log('📅 Filtered Incidents:', {
          total: stelIncidents.length,
          valid: validIncidents.length,
          dateRange: {
            earliest: validIncidents.length > 0 ? validIncidents.reduce((min, i) => i.date < min ? i.date : min, validIncidents[0].date) : null,
            latest: validIncidents.length > 0 ? validIncidents.reduce((max, i) => i.date > max ? i.date : max, validIncidents[0].date) : null
          },
          sample: validIncidents.slice(0, 5).map(i => ({
            id: i.id,
            reference: i.reference,
            description: i.description,
            date: i.date,
            assigneeId: i['assignee-id']
          }))
        });

        // Fetch all unique assignees (employees) to get their TEC codes
        const uniqueAssigneeIds = [...new Set(
          validIncidents
            .map(i => i['assignee-id'])
            .filter(id => id)
        )];

        console.log(`🔍 Fetching ${uniqueAssigneeIds.length} unique assignees...`);

        // Fetch employee data for all assignees
        const assigneeMap = new Map<number, string>(); // employeeId -> TEC code
        
        for (const employeeId of uniqueAssigneeIds) {
          try {
            let employee = null;
            
            if (import.meta.env.DEV) {
              // DEV: use Vite proxy
              const employeeUrl = `/api/stel/app/employees/${employeeId}`;
              const response = await fetch(employeeUrl, {
                headers: {
                  APIKEY: import.meta.env.VITE_STEL_API_KEY,
                },
              });
              
              if (response.ok) {
                const employeeData = await response.json();
                employee = Array.isArray(employeeData) ? employeeData[0] : employeeData;
              } else if (response.status === 404) {
                console.warn(`⚠️ Employee ${employeeId} not found (404)`);
                continue;
              }
            } else {
              // PROD: use Supabase Edge Function
              const { data, error } = await supabase.functions.invoke('stel-employee', {
                body: { employeeId: employeeId.toString() },
              });
              
              if (error) {
                console.warn(`⚠️ Error fetching employee ${employeeId}:`, error);
                continue;
              }
              
              employee = Array.isArray(data) ? data[0] : data;
            }
            
            if (employee) {
              console.log(`👤 Employee ${employeeId}:`, employee);
              
              // Employee.name contains "TEC095 " or similar
              const techMatch = employee?.name?.match(/TEC\s*(\d+)/i);
              if (techMatch) {
                const normalizedTech = `TEC${String(techMatch[1]).padStart(3, '0')}`;
                assigneeMap.set(employeeId, normalizedTech);
                console.log(`✅ Mapped employee ${employeeId} to ${normalizedTech}`);
              } else {
                console.warn(`⚠️ Employee ${employeeId} has no TEC in name: "${employee?.name}"`);
              }
            }
          } catch (error) {
            console.warn(`⚠️ Exception fetching employee ${employeeId}:`, error);
          }
        }

        console.log(`✅ Fetched ${assigneeMap.size} assignees with TEC codes`);

        // Map incidents to calendar events with real TEC codes
        const calendarEvents: CalendarEvent[] = validIncidents.map((incident, index) => {
          // Incidents have a single 'date' field: "2024-09-30T09:00:00+0000"
          // The API already sends dates in CET, so we parse them as-is without timezone conversion
          const startMoment = moment(incident.date);
          const startDate = startMoment.toDate();
          
          // incident.length is in MINUTES (e.g., length: 60 = 1 hour)
          // Default to 120 minutes (2 hours) if not specified
          const durationMinutes = incident.length || 120;
          const endDate = startMoment.clone().add(durationMinutes, 'minutes').toDate();
          
          // Get TEC code from assignee map
          const technicianId = incident['assignee-id'] 
            ? (assigneeMap.get(incident['assignee-id']) || 'Sin Asignar')
            : 'Sin Asignar';

          const calendarEvent = {
            id: incident.id,
            title: incident.description || `INC ${incident.reference}`,
            start: startDate,
            end: endDate,
            resource: incident,
            technician: technicianId,
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
            title: 'Incidencias Cargadas',
            description: `${calendarEvents.length} incidencias de ${schedules.length} técnicos (${earliestDate} a ${latestDate})`,
          });
        } else {
          toast({
            title: 'Sin Incidencias',
            description: 'No se encontraron incidencias en la respuesta de la API',
            variant: 'destructive',
          });
        }
      };

      if (import.meta.env.DEV) {
        console.log('✅ Running in DEV mode, using Vite proxy');
        try {
          // Fetch incidents from 1 month before AND 1 month ahead (2 months total)
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          const utcLastModificationDate = oneMonthAgo.toISOString().replace(/\.\d{3}Z$/, '+0000');
          
          console.log(`📅 Filtering incidents modified after: ${utcLastModificationDate}`);
          
          const limit = 500; // Maximum supported
          const proxyUrl = `/api/stel/app/incidents?limit=${limit}&utc-last-modification-date=${encodeURIComponent(utcLastModificationDate)}`;
          
          console.log(`📡 Fetching incidents with limit=${limit}...`);
          
          const response = await fetch(proxyUrl, {
            headers: {
              APIKEY: import.meta.env.VITE_STEL_API_KEY,
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const allIncidents = (await response.json()) as StelIncident[];
          console.log(`✅ Total incidents fetched: ${allIncidents.length}`);
          
          // Filter: not deleted AND incident date between 1 month ago and 1 month ahead
          const oneMonthAgoDate = new Date();
          oneMonthAgoDate.setMonth(oneMonthAgoDate.getMonth() - 1);
          const oneMonthAheadDate = new Date();
          oneMonthAheadDate.setMonth(oneMonthAheadDate.getMonth() + 1);
          
          const validIncidents = allIncidents.filter((incident) => {
            // Exclude deleted incidents
            if (incident.deleted) return false;
            
            // Exclude incidents without date
            if (!incident.date) return false;
            
            // Exclude I-PRT incidents (reference starts with "I-PRT")
            if (incident.reference && incident.reference.startsWith('I-PRT')) {
              console.log(`🚫 Excluding I-PRT incident: ${incident.reference}`);
              return false;
            }
            
            // Filter by date range
            const incidentDate = new Date(incident.date);
            return incidentDate >= oneMonthAgoDate && incidentDate <= oneMonthAheadDate;
          });
          
          console.log(`✅ Valid incidents (not deleted, -1 month to +1 month): ${validIncidents.length}`);
          console.log(`📅 Date range filter: ${moment(oneMonthAgoDate).format('YYYY-MM-DD')} to ${moment(oneMonthAheadDate).format('YYYY-MM-DD')}`);
          
          // Get date range
          if (validIncidents.length > 0) {
            const dates = validIncidents
              .map(i => i.date)
              .filter(d => d)
              .sort();
            console.log(`📅 Actual incidents date range: ${dates[0]} to ${dates[dates.length - 1]}`);
          }

          await applyIncidents(validIncidents);
          return;
        } catch (viteError) {
          console.warn('❌ Vite proxy request failed, attempting Supabase Edge Function', viteError);
        }
      }

      console.log('⚠️ Not in DEV mode or Vite proxy failed, using Supabase Edge Function');
      
      // Fetch incidents from 1 month before and 1 month ahead (2 months total)
      const daysBack = 30;
      const daysAhead = 30;
      const limit = 500;
      
      console.log(`📅 Fetching incidents from last ${daysBack} days and next ${daysAhead} days`);
      
      try {
        console.log(`🔧 Supabase Edge Function Request: limit=${limit}, daysBack=${daysBack}`);

        const { data, error } = await supabase.functions.invoke('stel-incidents', {
          body: {
            limit: limit.toString(),
            daysBack: daysBack,
          },
        });

        if (error) {
          throw error;
        }

        const allIncidents = (data ?? []) as StelIncident[];
        console.log(`✅ Total incidents fetched: ${allIncidents.length}`);
        
        // Filter: not deleted AND incident date between 1 month ago and 1 month ahead
        const oneMonthAgoDate = new Date();
        oneMonthAgoDate.setMonth(oneMonthAgoDate.getMonth() - 1);
        const oneMonthAheadDate = new Date();
        oneMonthAheadDate.setMonth(oneMonthAheadDate.getMonth() + 1);
        
        const validIncidents = allIncidents.filter((incident) => {
          if (incident.deleted) return false;
          if (!incident.date) return false;
          const incidentDate = new Date(incident.date);
          return incidentDate >= oneMonthAgoDate && incidentDate <= oneMonthAheadDate;
        });
        
        console.log(`✅ Valid incidents (not deleted, -1 month to +1 month): ${validIncidents.length}`);
        console.log(`📅 Date range filter: ${moment(oneMonthAgoDate).format('YYYY-MM-DD')} to ${moment(oneMonthAheadDate).format('YYYY-MM-DD')}`);
        
        // Get date range
        if (validIncidents.length > 0) {
          const dates = validIncidents
            .map(i => i.date)
            .filter(d => d)
            .sort();
          console.log(`📅 Actual incidents date range: ${dates[0]} to ${dates[dates.length - 1]}`);
        }

        await applyIncidents(validIncidents);
      } catch (edgeFunctionError) {
        console.error('❌ Edge Function request failed:', edgeFunctionError);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las incidencias',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Error',
        description: message.includes('STEL API key') ? t('calendar.apiKeyError') : t('calendar.loadError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      console.log('🏁 fetchIncidents completed');
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
              Calendario de Incidencias
            </h1>
            <p className="text-muted-foreground">
              Gestión de incidencias de STEL Order
            </p>
          </div>
        </div>

        <Button
          onClick={fetchIncidents}
          disabled={loading}
          className="bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg transition-all duration-300 gap-2"
          size="lg"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Cargando...' : '🔧 Cargar Incidencias (v2.0)'}
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
                Incidencias disponibles: {moment(events.map(e => e.start).sort()[0]).format('DD/MM/YYYY')} 
                {' → '}
                {moment(events.map(e => e.start).sort()[events.length - 1]).format('DD/MM/YYYY')}
                {' '}({events.length} incidencias cargadas)
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
                          <h3 className="text-lg font-semibold text-orange-900">Sin incidencias para esta fecha</h3>
                          <p className="text-orange-700 mt-1">
                            No hay incidencias programadas para {moment(currentDate).format('DD/MM/YYYY')}
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
                <h3 className="text-lg font-semibold">No hay incidencias</h3>
                <p className="text-muted-foreground">
                  Haz clic en "Cargar Incidencias" para obtener las incidencias de STEL Order
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
