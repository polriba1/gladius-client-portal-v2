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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es'; // Import Spanish locale
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Calendario.css';
import { Calendar as CalendarIcon, MapPin, Clock, FileText, User, RefreshCw, ChevronLeft, ChevronRight, MessageSquare, Copy, Check, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Configure moment to use Spanish locale with 24-hour format
moment.locale('es');

const localizer = momentLocalizer(moment);

// 🚨 VERSION CHECK - This file works with EVENTS for calendar display and INCIDENTS for WhatsApp
console.log('🚨🚨🚨 CALENDARIO VERSION: 3.0 - EVENTS (Calendar) + INCIDENTS (WhatsApp) 🚨🚨🚨');
console.log('📅 File loaded at:', new Date().toISOString());

interface StelIncidentType {
  path: string;
  deleted: boolean;
  color: string;
  name: string;
  id: number;
  'utc-last-modification-date': string;
}

interface StelIncidentState {
  path: string;
  deleted: boolean;
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

interface StelEvent {
  id: number;
  subject: string | null;
  description: string | null;
  location: string | null;
  "start-date": string;
  "end-date": string;
  "all-day": boolean;
  "event-state": "PENDING" | "COMPLETED" | "REFUSED";
  "calendar-id": number | null;
  "calendar-path": string | null;
  "event-type-id": number | null;
  "event-type-path": string | null;
  "creator-id": number;
  "creator-path": string;
  "account-id": number | null;
  "account-path": string | null;
  "asset-id": number | null;
  "asset-path": string | null;
  "incident-id": number | null;
  "incident-path": string | null;
  "document-id": number | null;
  "document-path": string | null;
  "utc-last-modification-date": string;
  deleted: boolean;
  path: string;
}

interface StelEventType {
  id: number;
  name: string;
  path: string;
  deleted: boolean;
  "utc-last-modification-date": string;
}

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource?: StelIncident | StelEvent; // Can be either StelIncident or StelEvent
  technician?: string; // Added to track technician
}

interface TechnicianSchedule {
  name: string;
  events: CalendarEvent[];
  color: string;
  hasIncidentsForWhatsApp?: boolean; // Optional flag to indicate if incidents are available for WhatsApp
}

// Color Picker Dialog Component
interface ColorPickerDialogProps {
  technicianName: string;
  currentColor: string;
  onColorChange: (technicianName: string, newColor: string) => void;
}

const ColorPickerDialog = ({ technicianName, currentColor, onColorChange }: ColorPickerDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Extended color palette with 40 very distinct colors
  const EXTENDED_PALETTE = [
    // Reds and Pinks
    'hsl(0 90% 50%)',    // Bright Red
    'hsl(350 85% 55%)',  // Hot Pink
    'hsl(340 80% 60%)',  // Pink
    'hsl(330 75% 65%)',  // Light Pink

    // Oranges and Yellows
    'hsl(30 95% 55%)',   // Vibrant Orange
    'hsl(45 90% 50%)',   // Orange-Yellow
    'hsl(60 100% 45%)',  // Pure Yellow
    'hsl(75 85% 50%)',   // Yellow-Green

    // Greens
    'hsl(90 80% 40%)',   // Yellow-Green
    'hsl(120 100% 30%)', // Pure Green
    'hsl(135 85% 35%)',  // Green-Cyan
    'hsl(150 90% 35%)',  // Turquoise

    // Cyans and Blues
    'hsl(180 100% 35%)', // Cyan
    'hsl(195 90% 40%)',  // Sky Blue
    'hsl(210 100% 45%)', // Bright Blue
    'hsl(225 85% 50%)',  // Blue
    'hsl(240 80% 55%)',  // Blue-Violet
    'hsl(255 75% 60%)',  // Light Blue

    // Purples and Violets
    'hsl(270 85% 50%)',  // Purple
    'hsl(285 80% 55%)',  // Magenta-Purple
    'hsl(300 75% 60%)',  // Magenta
    'hsl(315 70% 65%)',  // Pink-Purple

    // Browns and Earth Tones
    'hsl(15 80% 45%)',   // Red-Orange
    'hsl(25 75% 40%)',   // Brown-Orange
    'hsl(35 70% 45%)',   // Brown
    'hsl(45 65% 40%)',   // Olive Brown

    // Grays and Neutrals
    'hsl(0 0% 30%)',     // Dark Gray
    'hsl(0 0% 45%)',     // Medium Gray
    'hsl(0 0% 60%)',     // Light Gray
    'hsl(0 0% 75%)',     // Very Light Gray

    // Additional Bright Colors
    'hsl(45 100% 50%)',  // Bright Yellow
    'hsl(90 100% 35%)',  // Bright Green
    'hsl(180 100% 40%)', // Bright Cyan
    'hsl(240 100% 50%)', // Bright Blue
    'hsl(300 100% 50%)', // Bright Magenta
    'hsl(330 100% 55%)', // Bright Pink

    // Pastels
    'hsl(30 70% 75%)',   // Peach
    'hsl(60 60% 80%)',   // Pale Yellow
    'hsl(120 50% 75%)',  // Mint
    'hsl(180 40% 80%)',  // Pale Cyan
    'hsl(240 50% 75%)',  // Lavender
    'hsl(300 40% 80%)',  // Pale Pink
  ];

  const handleColorSelect = (color: string) => {
    onColorChange(technicianName, color);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: currentColor }}
            />
            Cambiar color de {technicianName}
          </DialogTitle>
          <DialogDescription>
            Selecciona un nuevo color para este técnico. Los cambios se guardarán permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-8 gap-2 py-4">
          {EXTENDED_PALETTE.map((color, index) => (
            <button
              key={index}
              onClick={() => handleColorSelect(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                currentColor === color ? 'border-gray-800 shadow-lg' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              title={`Color ${index + 1}`}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// WhatsApp Dialog Component
interface WhatsAppDialogProps {
  schedule: TechnicianSchedule & { todayEvents: CalendarEvent[] };
  currentDate: Date;
  onGenerateText: (name: string, events: CalendarEvent[], date: Date) => Promise<{ all: string; accepted: string }>;
  onCopy: (text: string, name: string) => Promise<void>;
  copiedTech: string | null;
  loading: boolean;
  key: string; // Force re-render when date changes
}

const WhatsAppDialog = ({ schedule, currentDate, onGenerateText, onCopy, copiedTech, loading }: WhatsAppDialogProps) => {
  const [data, setData] = useState<{ all: string; accepted: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('accepted');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    
    if (open && !data && !isGenerating) {
      setIsGenerating(true);
      try {
        const generatedData = await onGenerateText(schedule.name, schedule.todayEvents, currentDate);
        setData(generatedData);
      } catch (error) {
        console.error('Error generating WhatsApp text:', error);
        setData({ 
          all: 'Error al generar el texto. Por favor, intenta de nuevo.', 
          accepted: 'Error al generar el texto. Por favor, intenta de nuevo.' 
        });
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleCopy = async () => {
    if (data) {
      const textToCopy = activeTab === 'accepted' ? data.accepted : data.all;
      await onCopy(textToCopy, schedule.name);
    }
  };

  const currentText = data ? (activeTab === 'accepted' ? data.accepted : data.all) : '';

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
        
        <Tabs defaultValue="accepted" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="accepted">Aceptadas</TabsTrigger>
            <TabsTrigger value="all">Todas (Incl. Rechazadas)</TabsTrigger>
          </TabsList>
          
          <div className="mt-4 space-y-4">
            {/* Preview of formatted text */}
            <div className="bg-muted p-4 rounded-lg font-mono text-sm whitespace-pre-wrap min-h-[200px]">
              {isGenerating ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Cargando información del cliente...</span>
                </div>
              ) : currentText || 'Sin datos'}
            </div>
            
            {/* Copy button */}
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                disabled={isGenerating || !currentText}
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
        </Tabs>
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
  const [whatsappTextCache, setWhatsappTextCache] = useState<Map<string, { all: string; accepted: string }>>(new Map());
  const [loadingWhatsapp, setLoadingWhatsapp] = useState<string | null>(null);
  const [incidentTypes, setIncidentTypes] = useState<Map<number, StelIncidentType>>(new Map());
  const [incidentStates, setIncidentStates] = useState<Map<number, StelIncidentState>>(new Map());
  const [allIncidents, setAllIncidents] = useState<StelIncident[]>([]); // Store incidents for WhatsApp
  const [assigneeToTecMap, setAssigneeToTecMap] = useState<Map<number, string>>(new Map()); // Map assignee-id to TEC code

  // Helper: fetch incident types (DEV via proxy, PROD via edge function) and populate state
  const fetchAndSetIncidentTypes = async () => {
    console.log('📡 fetchAndSetIncidentTypes called');
    const map = new Map<number, StelIncidentType>();
    try {
      if (import.meta.env.DEV) {
        const proxyUrl = `/api/stel/app/incidentTypes?limit=500`;
        const response = await fetch(proxyUrl, {
          headers: { APIKEY: import.meta.env.VITE_STEL_API_KEY },
        });
        if (response.ok) {
          const allIncidentTypes = (await response.json()) as StelIncidentType[];
          allIncidentTypes.forEach((t) => {
            if (t && typeof t.id === 'number') map.set(t.id, t);
          });
          setIncidentTypes(map);
          return map;
        } else {
          throw new Error(`Proxy fetch failed: ${response.status}`);
        }
      } else {
        const { data: incidentTypesData, error: incidentTypesError } = await supabase.functions.invoke('stel-incident-types-v2', {
          body: { limit: '500' },
        });
        if (incidentTypesError) throw incidentTypesError;
        if (Array.isArray(incidentTypesData)) {
          incidentTypesData.forEach((t: StelIncidentType) => {
            if (t && typeof t.id === 'number') map.set(t.id, t);
          });
          setIncidentTypes(map);
          return map;
        }
        throw new Error('Invalid incidentTypesData');
      }
    } catch (error) {
      console.warn('⚠️ fetchAndSetIncidentTypes error:', error);
      throw error;
    }
  };

  // Helper: fetch incident states (DEV via proxy, PROD via edge function) and populate state
  const fetchAndSetIncidentStates = async () => {
    console.log('📡 fetchAndSetIncidentStates called');
    const map = new Map<number, StelIncidentState>();
    try {
      if (import.meta.env.DEV) {
        const proxyUrl = `/api/stel/app/incidentStates?limit=500`;
        const response = await fetch(proxyUrl, {
          headers: { APIKEY: import.meta.env.VITE_STEL_API_KEY },
        });
        if (response.ok) {
          const allIncidentStates = (await response.json()) as StelIncidentState[];
          allIncidentStates.forEach((s) => {
            if (s && typeof s.id === 'number') map.set(s.id, s);
          });
          setIncidentStates(map);
          return map;
        } else {
          throw new Error(`Proxy fetch failed: ${response.status}`);
        }
      } else {
        const { data: incidentStatesData, error: incidentStatesError } = await supabase.functions.invoke('stel-incident-states-v2', {
          body: { limit: '500' },
        });
        if (incidentStatesError) throw incidentStatesError;
        if (Array.isArray(incidentStatesData)) {
          incidentStatesData.forEach((s: StelIncidentState) => {
            if (s && typeof s.id === 'number') map.set(s.id, s);
          });
          setIncidentStates(map);
          return map;
        }
        throw new Error('Invalid incidentStatesData');
      }
    } catch (error) {
      console.warn('⚠️ fetchAndSetIncidentStates error:', error);
      throw error;
    }
  };

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
        console.log('✅ DEV MODE: Using Vite proxy');
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
        console.log('🚀 PROD MODE: Using stel-client-v2 Edge Function');
        const { data, error } = await supabase.functions.invoke('stel-client-v2', {
          body: { clientId },
        });
        
        if (error) {
          console.error(`❌ Edge function error:`, error);
          throw error;
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
        console.log('✅ DEV MODE: Using Vite proxy');
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
        console.log('🚀 PROD MODE: Using stel-employee-v2 Edge Function');
        const { data, error } = await supabase.functions.invoke('stel-employee-v2', {
          body: { employeeId },
        });
        
        if (error) {
          console.error(`❌ Edge function error:`, error);
          throw error;
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
        console.log('✅ DEV MODE: Using Vite proxy');
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
        console.log('🚀 PROD MODE: Using stel-address-v2 Edge Function');
        const { data, error } = await supabase.functions.invoke('stel-address-v2', {
          body: { addressId },
        });
        
        if (error) {
          console.error(`❌ Edge function error:`, error);
          throw error;
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
  // IMPORTANT: Always use incidents (ruta antiga) to construct WhatsApp text, even if calendar shows events
  const generateWhatsAppText = async (technicianName: string, events: CalendarEvent[], date: Date) => {
    console.log(`📱 ========================================`);
    console.log(`📱 Generating WhatsApp text for ${technicianName}`);
    console.log(`📱 Date: ${moment(date).format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`📱 Total incidents loaded: ${allIncidents.length}`);
    console.log(`📱 AssigneeToTecMap size: ${assigneeToTecMap.size}`);
    console.log(`📱 AssigneeToTecMap entries:`, Array.from(assigneeToTecMap.entries()));

    // If incident types haven't been loaded yet, fetch them on-demand (robustness guard)
    if (incidentTypes.size === 0) {
      console.log('📡 incidentTypes Map empty — fetching incident types on-demand...');
      try {
        await fetchAndSetIncidentTypes();
        console.log(`📡 Fetched incident types on-demand: ${incidentTypes.size}`);
      } catch (e) {
        console.warn('⚠️ Failed to fetch incident types on-demand:', e);
      }
    }

    // If incident states haven't been loaded yet, fetch them on-demand
    if (incidentStates.size === 0) {
      console.log('📡 incidentStates Map empty — fetching incident states on-demand...');
      try {
        await fetchAndSetIncidentStates();
        console.log(`📡 Fetched incident states on-demand: ${incidentStates.size}`);
      } catch (e) {
        console.warn('⚠️ Failed to fetch incident states on-demand:', e);
      }
    }
    
    // Step 1: Filter incidents by date and technician (ruta antiga) - EXACT MATCH REQUIRED
    const targetDateStr = moment(date).format('YYYY-MM-DD');
    console.log(`📅 Target date (EXACT): ${targetDateStr}`);
    console.log(`👤 Target technician (EXACT): ${technicianName}`);
    
    // Get all incidents for this EXACT technician and EXACT date
    const incidentsForWhatsApp = allIncidents.filter((incident) => {
      // Step 1: Must have date
      if (!incident.date) {
        console.log(`❌ Incident ${incident.id}: No date`);
        return false;
      }
      
      // Step 2: Exclude I-PRT incidents
      if (incident.reference && incident.reference.startsWith('I-PRT')) {
        console.log(`🚫 Incident ${incident.id}: I-PRT excluded (${incident.reference})`);
        return false;
      }
      
      // Step 3: Check EXACT date match (parse without timezone conversion)
      // CRITICAL: incident.date is the SCHEDULED date (when service is planned)
      // NOT incident['creation-date'] (when incident was created)
      const scheduledDateStr = incident.date; // SCHEDULED date - e.g., "2024-09-30T09:00:00+0000"
      const creationDateStr = incident['creation-date']; // When it was created
      
      const [datePart] = scheduledDateStr.split('T');
      const incidentDateStr = datePart.trim(); // Direct date part, no timezone conversion
      
      // Log comparison for debugging
      if (incidentDateStr !== targetDateStr) {
        // Log if dates are different to help debug
        console.log(`📅 Incident ${incident.id} (${incident.reference}):`);
        console.log(`   SCHEDULED date (incident.date): ${incidentDateStr}`);
        console.log(`   CREATION date (incident['creation-date']): ${creationDateStr ? creationDateStr.split('T')[0] : 'N/A'}`);
        console.log(`   TARGET date: ${targetDateStr}`);
        console.log(`   ❌ Date mismatch - using SCHEDULED date, not creation date`);
        return false;
      }
      
      // Verify we're using scheduled date, not creation date
      if (creationDateStr && creationDateStr.split('T')[0] === targetDateStr && incidentDateStr !== targetDateStr) {
        console.warn(`⚠️ WARNING: Incident ${incident.id} creation date matches but scheduled date doesn't!`);
        console.warn(`   This means the incident was created on ${targetDateStr} but scheduled for ${incidentDateStr}`);
        console.warn(`   We are correctly using SCHEDULED date (${incidentDateStr}), not creation date`);
      }
      
      // Step 4: Must have assignee-id
      if (!incident['assignee-id']) {
        console.log(`⚠️ Incident ${incident.id}: No assignee-id`);
        return false;
      }
      
      // Step 5: Check EXACT technician match
      const incidentTecCode = assigneeToTecMap.get(incident['assignee-id']);
      if (!incidentTecCode) {
        console.log(`⚠️ Incident ${incident.id}: No TEC code found for assignee-id ${incident['assignee-id']}`);
        console.log(`   Available assignee-ids in map:`, Array.from(assigneeToTecMap.keys()));
        console.log(`   Map entries:`, Array.from(assigneeToTecMap.entries()));
        return false;
      }
      
      // EXACT match required - trim and compare
      const normalizedIncidentTec = incidentTecCode.trim();
      const normalizedTargetTec = technicianName.trim();
      
      if (normalizedIncidentTec !== normalizedTargetTec) {
        console.log(`👤 Incident ${incident.id}: Technician EXACT mismatch`);
        console.log(`   Incident TEC: "${normalizedIncidentTec}" (length: ${normalizedIncidentTec.length})`);
        console.log(`   Target TEC: "${normalizedTargetTec}" (length: ${normalizedTargetTec.length})`);
        console.log(`   Assignee-id: ${incident['assignee-id']}`);
        return false;
      }
      
      // EXACT MATCH FOUND!
      console.log(`✅✅✅ MATCH FOUND: Incident ${incident.id} (${incident.reference}) - date=${incidentDateStr}, tech=${incidentTecCode}`);
      return true;
    });
    
    console.log(`📱 ========================================`);
    console.log(`✅ FINAL RESULT: Found ${incidentsForWhatsApp.length} incidents for ${technicianName} on ${targetDateStr}`);
    console.log(`📱 Incidents found:`, incidentsForWhatsApp.map(i => ({
      id: i.id,
      reference: i.reference,
      date: i.date,
      assigneeId: i['assignee-id']
    })));
    console.log(`📱 ========================================`);
    
    if (incidentsForWhatsApp.length === 0) {
      const dateStr = moment(date).format('dddd, D [de] MMMM [de] YYYY');
      return `📋 *Agenda para ${technicianName}*\n📅 ${dateStr}\n⏱️ Total: 0 servicios (0.0h)\n\nNo hay incidencias disponibles para esta fecha.`;
    }
    
    // Step 2: Convert incidents to CalendarEvent format for WhatsApp
    // CRITICAL: Use incident.date (scheduled date) NOT incident['creation-date'] (when it was created)
    const validEventsForWhatsApp: CalendarEvent[] = incidentsForWhatsApp.map((incident) => {
      // IMPORTANT: incident.date is the SCHEDULED date (when the service is planned)
      // NOT incident['creation-date'] which is when the incident was created
      const scheduledDateStr = incident.date; // e.g., "2024-09-30T09:00:00+0000" - THIS IS THE SCHEDULED DATE
      
      console.log(`📅 Converting incident ${incident.id} (${incident.reference}):`);
      console.log(`   Scheduled date (incident.date): ${scheduledDateStr}`);
      console.log(`   Creation date (incident['creation-date']): ${incident['creation-date']}`);
      console.log(`   Using SCHEDULED date for WhatsApp!`);
      
      const [datePart, timePartWithTZ] = scheduledDateStr.split('T');
      const timePart = timePartWithTZ.split('+')[0].split('-')[0]; // Remove timezone
      
      const [year, month, day] = datePart.split('-').map(Number);
      const timeComponents = timePart.split(':');
      const hours = parseInt(timeComponents[0]);
      const minutes = parseInt(timeComponents[1]);
      const seconds = timeComponents[2] ? parseInt(timeComponents[2]) : 0;
      
      // Create a Date object with the LOCAL time values (no timezone conversion)
      // This represents when the service is SCHEDULED, not when the incident was created
      const startDate = new Date(year, month - 1, day, hours, minutes, seconds);
      
      // incident.length is in MINUTES (e.g., length: 60 = 1 hour)
      // Default to 120 minutes (2 hours) if not specified
      const durationMinutes = incident.length || 120;
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
      
      console.log(`   Start date for WhatsApp: ${moment(startDate).format('DD/MM/YYYY HH:mm')}`);
      console.log(`   End date for WhatsApp: ${moment(endDate).format('DD/MM/YYYY HH:mm')}`);
      
      return {
        id: incident.id,
        title: incident.description || `INC ${incident.reference}`,
        start: startDate, // SCHEDULED date/time
        end: endDate, // SCHEDULED date/time + duration
        resource: incident,
        technician: technicianName,
      };
    });
    
    // 🕐 SORT EVENTS BY TIME - From earliest to latest
    const sortedEvents = [...validEventsForWhatsApp].sort((a, b) => {
      const timeA = a.start.getTime();
      const timeB = b.start.getTime();
      console.log(`🕐 Sorting: Event ${a.resource?.reference} (${moment(a.start).format('HH:mm')}) vs Event ${b.resource?.reference} (${moment(b.start).format('HH:mm')})`);
      return timeA - timeB;
    });
    
    console.log(`🕐 SORTED ORDER:`);
    sortedEvents.forEach((e, idx) => {
      console.log(`   ${idx + 1}. ${e.resource?.reference} - ${moment(e.start).format('HH:mm')}`);
    });

    const dateStr = moment(date).format('dddd, D [de] MMMM [de] YYYY');
    const totalHours = sortedEvents.reduce((acc, event) => {
      return acc + moment.duration(moment(event.end).diff(moment(event.start))).asHours();
    }, 0);

    let text = `📋 *Agenda para ${technicianName}*\n`;
    text += `📅 ${dateStr}\n`;
    text += `⏱️ Total: ${sortedEvents.length} servicios (${totalHours.toFixed(1)}h)\n`;
    text += `\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Fetch all client info, address info in parallel
    console.log(`📡 Fetching data for ${sortedEvents.length} incidents...`);
    
    // Extract all IDs first to maintain consistency (from incidents now)
    const clientIds = sortedEvents.map((event) => {
      let clientId = event.resource?.['account-path']?.split('/').pop();
      if (!clientId || clientId === '' || clientId === 'undefined') {
        clientId = event.resource?.['account-id']?.toString();
      }
      return clientId;
    });
    
    const clientPromises = sortedEvents.map(async (event, index) => {
      const clientId = clientIds[index];
      
      console.log(`📋 Incident ${index + 1}/${sortedEvents.length}: Client ID:`, clientId, '| account-path:', event.resource?.['account-path'], '| account-id:', event.resource?.['account-id']);
      
      if (!clientId) {
        console.warn(`⚠️ Incident ${event.id} has no account-path or account-id`);
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
    
    const addressIds = sortedEvents.map((event) => {
      let addressId = event.resource?.['address-path']?.split('/').pop();
      if (!addressId || addressId === '' || addressId === 'undefined') {
        addressId = event.resource?.['address-id']?.toString();
      }
      return addressId;
    });
    
    const addressPromises = sortedEvents.map(async (event, index) => {
      const addressId = addressIds[index];
      
      if (!addressId) {
        console.warn(`⚠️ Incident ${event.id} has no address-path or address-id`);
        return null;
      }
      try {
        return await fetchAddressInfo(addressId);
      } catch (error) {
        console.error(`❌ Failed to fetch address ${addressId}:`, error);
        return null;
      }
    });
    
    const [clientsInfo, addressesInfo] = await Promise.all([
      Promise.all(clientPromises),
      Promise.all(addressPromises)
    ]);
    
    console.log(`✅ Fetched ${clientsInfo.filter(c => c).length} clients, ${addressesInfo.filter(a => a).length} addresses`);

    // IMPORTANT: Always use incidents for WhatsApp text construction (SORTED BY TIME)
    // NEW: Build enriched events list first
    const enrichedEvents = sortedEvents.map((event, index) => {
      const stelIncident = event.resource as StelIncident;
      
      // Determine status
      let status = 'Aceptada';
      let isRejected = false;
      const stateId = stelIncident['incident-state-id'];
      if (stateId) {
        const state = incidentStates.get(stateId);
        if (state) {
          const name = state.name.toLowerCase();
          if (name.includes('rechaz') || name.includes('refus') || name.includes('cancel') || name.includes('reject')) {
            status = 'Rechazada';
            isRejected = true;
          }
        }
      }
      
      return {
        event,
        client: clientsInfo[index],
        address: addressesInfo[index],
        clientId: clientIds[index],
        addressId: addressIds[index],
        status,
        isRejected
      };
    });

    // Helper to generate text from a list of enriched events
    const generateTextFromEvents = (items: typeof enrichedEvents) => {
        if (items.length === 0) {
            const dateStr = moment(date).format('dddd, D [de] MMMM [de] YYYY');
            return `📋 *Agenda para ${technicianName}*\n📅 ${dateStr}\n⏱️ Total: 0 servicios (0.0h)\n\nNo hay incidencias disponibles.`;
        }

        const dateStr = moment(date).format('dddd, D [de] MMMM [de] YYYY');
        const totalHours = items.reduce((acc, item) => {
            return acc + moment.duration(moment(item.event.end).diff(moment(item.event.start))).asHours();
        }, 0);

        let text = `📋 *Agenda para ${technicianName}*\n`;
        text += `📅 ${dateStr}\n`;
        text += `⏱️ Total: ${items.length} servicios (${totalHours.toFixed(1)}h)\n`;
        text += `\n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        items.forEach((item, index) => {
            const { event, client, address, clientId, addressId, status } = item;
            const stelIncident = event.resource as StelIncident;
            
            // 1. Codi / Títol de l'avís o incidència
            const incidentRef = stelIncident['full-reference'] || stelIncident.reference || 'N/A';
            text += `*Incidencia: ${incidentRef}*\n\n`;
            
            // 2. Descripció del problema o incidència
            if (stelIncident.description) {
                text += `${stelIncident.description}\n\n`;
            }
            
            // 3. Quan (franja horària de la cita)
            const startDateTime = moment(event.start).format('DD/MM/YYYY HH:mm');
            const endTime = moment(event.end).format('HH:mm');
            text += `*Cuándo:* ${startDateTime} - ${endTime}\n\n`;
            
            // 4. Tipo de incidencia
            let incidentTypeId = stelIncident['incident-type-id'] as number | null;
            let incidentTypeObj: StelIncidentType | undefined | null = undefined;

            if (!incidentTypeId && stelIncident['incident-type-path']) {
                const path = String(stelIncident['incident-type-path']);
                const m = path.match(/\/(\d+)\/?$/);
                if (m) {
                    const parsed = Number(m[1]);
                    if (!Number.isNaN(parsed)) incidentTypeId = parsed;
                }
            }

            if (typeof incidentTypeId === 'number') {
                incidentTypeObj = incidentTypes.get(incidentTypeId as number) ?? undefined;
            } else if (typeof incidentTypeId === 'string') {
                const n = Number(incidentTypeId);
                if (!Number.isNaN(n)) incidentTypeObj = incidentTypes.get(n) ?? undefined;
            }

            if (!incidentTypeObj && stelIncident['incident-type-path']) {
                const path = String(stelIncident['incident-type-path']);
                const byPath = Array.from(incidentTypes.values()).find(t => t.path === path);
                if (byPath) incidentTypeObj = byPath;
                else {
                    const tailMatch = path.match(/\/(\d+)\/?$/);
                    if (tailMatch) {
                        const tailId = Number(tailMatch[1]);
                        const byTail = incidentTypes.get(tailId);
                        if (byTail) incidentTypeObj = byTail;
                    }
                }
            }

            const incidentTypeName = incidentTypeObj?.name || null;
            text += `*Tipo:* ${incidentTypeName || 'N/A'}\n\n`;
            
            // 5. Estado
            text += `*Estado:* ${status}\n\n`;
            
            // 6. Client
            if (client) {
                const clientName = client['legal-name'] || client.name || 'Sin nombre';
                text += `*Cliente:* ${clientName}\n\n`;
            } else {
                if (clientId) {
                    text += `*Cliente:* ⚠️ Error obteniendo datos del cliente #${clientId}\n\n`;
                } else {
                    text += `*Cliente:* ⚠️ Sin cliente asignado\n\n`;
                }
            }
            
            // 7. Direcció
            if (address) {
                const addressParts = [
                    address['address-data'],
                    address['city-town'],
                    address['postal-code'],
                    address['province']
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
            
            // Separator
            if (index < items.length - 1) {
                text += `\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            }
        });
        
        return text;
    };

    const allText = generateTextFromEvents(enrichedEvents);
    const acceptedText = generateTextFromEvents(enrichedEvents.filter(e => !e.isRejected));

    return {
        all: allText,
        accepted: acceptedText
    };
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
    // IMPORTANT: Use the exact date passed, ensure it's normalized to start of day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    const cacheKey = `${technicianName}-${moment(normalizedDate).format('YYYY-MM-DD')}`;
    
    console.log(`🔑 WhatsApp Cache Key: ${cacheKey}`);
    console.log(`📅 Original date: ${moment(date).format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`📅 Normalized date: ${moment(normalizedDate).format('YYYY-MM-DD HH:mm:ss')}`);
    
    // Check cache first
    if (whatsappTextCache.has(cacheKey)) {
      console.log(`✅ Using cached WhatsApp text for ${cacheKey}`);
      console.log(`📊 Current cache size: ${whatsappTextCache.size}`);
      return whatsappTextCache.get(cacheKey)!;
    }

    console.log(`🔄 Generating NEW WhatsApp text for ${cacheKey} (not in cache)`);
    
    // Generate new text - use normalized date
    setLoadingWhatsapp(technicianName);
    try {
      const text = await generateWhatsAppText(technicianName, events, normalizedDate);
      
      // Cache the result
      console.log(`💾 Caching WhatsApp text for ${cacheKey}`);
      setWhatsappTextCache(prev => {
        const newCache = new Map(prev);
        newCache.set(cacheKey, text);
        console.log(`📊 Cache updated - new size: ${newCache.size}`);
        return newCache;
      });
      
      return text;
    } finally {
      setLoadingWhatsapp(null);
    }
  };

  // Clear WhatsApp cache when date changes to force regeneration - CRITICAL FOR SAFETY
  useEffect(() => {
    const dateStr = moment(currentDate).format('DD/MM/YYYY');
    console.log(`🚨 CRITICAL: Date changed to ${dateStr} - FORCE CLEARING WhatsApp cache for safety!`);
    setWhatsappTextCache(new Map());
    console.log(`🚨 Cache cleared successfully`);
  }, [currentDate]);

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

        // Store valid incidents into state so WhatsApp generation can use them
        try {
          setAllIncidents(validIncidents);
          console.log(`📥 setAllIncidents updated with ${validIncidents.length} incidents`);
        } catch (e) {
          console.warn('⚠️ Failed to setAllIncidents state:', e);
        }

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
        // Publish assignee -> TEC mapping to state for WhatsApp matching
        try {
          setAssigneeToTecMap(assigneeMap);
          console.log(`📥 setAssigneeToTecMap updated with ${assigneeMap.size} entries`);
        } catch (e) {
          console.warn('⚠️ Failed to setAssigneeToTecMap state:', e);
        }

        // Fetch all unique incident types to get their names
        const uniqueIncidentTypeIds = [...new Set(
          validIncidents
            .map(i => i['incident-type-id'])
            .filter(id => id !== null && id !== undefined)
        )];

        console.log(`🔍 Found ${uniqueIncidentTypeIds.length} unique incident types`);
        console.log(`📋 Incident Type IDs found in incidents:`, uniqueIncidentTypeIds);
        console.log(`📋 Sample incidents with type IDs:`, validIncidents.slice(0, 3).map(i => ({
          reference: i.reference,
          'incident-type-id': i['incident-type-id'],
          'incident-type-path': i['incident-type-path']
        })));

        // Fetch ALL incident types at once to get names
        const incidentTypeMap = new Map<number, StelIncidentType>(); // incidentTypeId -> StelIncidentType
        
        try {
          if (import.meta.env.DEV) {
            // DEV: Fetch all incident types via Vite proxy
            const proxyUrl = `/api/stel/app/incidentTypes?limit=500`;
            
            console.log(`📡 Fetching all incident types from proxy...`);
            
            const response = await fetch(proxyUrl, {
              headers: {
                APIKEY: import.meta.env.VITE_STEL_API_KEY,
              },
            });

            if (response.ok) {
              const allIncidentTypes = (await response.json()) as StelIncidentType[];
              console.log(`✅ Fetched ${allIncidentTypes.length} incident types from proxy`);
              
              // Map incident types by ID
              allIncidentTypes.forEach((incidentType) => {
                if (uniqueIncidentTypeIds.includes(incidentType.id) && incidentType.name) {
                  incidentTypeMap.set(incidentType.id, incidentType);
                  console.log(`✅ Mapped incident type ${incidentType.id} to "${incidentType.name}"`);
                }
              });
              
              console.log(`📋 Final incident type map:`, Array.from(incidentTypeMap.entries()).map(([id, type]) => ({ id, name: type.name })));
            } else {
              console.warn(`⚠️ Failed to fetch incident types from proxy: ${response.status}`);
            }
          } else {
            // PROD: Use Supabase Edge Function for incident types
            console.log('📡 Fetching incident types from Edge Function...');
            
            const { data: incidentTypesData, error: incidentTypesError } = await supabase.functions.invoke('stel-incident-types-v2', {
              body: {
                limit: '500',
              },
            });
            
            if (incidentTypesError) {
              console.warn(`⚠️ Edge function error fetching incident types:`, incidentTypesError);
            } else if (Array.isArray(incidentTypesData)) {
              console.log(`✅ Fetched ${incidentTypesData.length} incident types from Edge Function`);
              
              // Map incident types by ID
              incidentTypesData.forEach((incidentType: StelIncidentType) => {
                if (uniqueIncidentTypeIds.includes(incidentType.id) && incidentType.name) {
                  incidentTypeMap.set(incidentType.id, incidentType);
                  console.log(`✅ Mapped incident type ${incidentType.id} to "${incidentType.name}"`);
                }
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️ Exception fetching incident types:`, error);
        }

        console.log(`✅ Fetched ${incidentTypeMap.size} incident types`);
        
        // Update the incidentTypes state for use in WhatsApp text generation
        setIncidentTypes(incidentTypeMap);

        // Fetch incident states for WhatsApp status
        try {
          await fetchAndSetIncidentStates();
        } catch (e) {
          console.warn('⚠️ Failed to fetch incident states in fetchIncidents:', e);
        }

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
          console.warn('❌ Vite proxy request failed:', viteError);
          toast({
            title: 'Error',
            description: 'No se pudieron cargar las incidencias',
            variant: 'destructive',
          });
        }
      } else {
        // PROD: Use Supabase Edge Function
        console.log('🚀 PROD MODE: Using stel-incidents-v2 Edge Function');
        
        try {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          const utcLastModificationDate = oneMonthAgo.toISOString().replace(/\.\d{3}Z$/, '+0000');
          
          console.log(`📅 Fetching incidents modified after: ${utcLastModificationDate}`);
          
          const { data, error } = await supabase.functions.invoke('stel-incidents-v2', {
            body: {
              limit: '500',
              utcLastModificationDate: utcLastModificationDate,
            },
          });
          
          if (error) {
            console.error('❌ Edge function error (stel-incidents-v2):', error);
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
            if (incident.reference && incident.reference.startsWith('I-PRT')) {
              return false;
            }
            const incidentDate = new Date(incident.date);
            return incidentDate >= oneMonthAgoDate && incidentDate <= oneMonthAheadDate;
          });
          
          console.log(`✅ Valid incidents (not deleted, -1 month to +1 month): ${validIncidents.length}`);
          
          await applyIncidents(validIncidents);
          return;
        } catch (edgeFunctionError) {
          console.error('❌ Edge Function request failed:', edgeFunctionError);
          toast({
            title: 'Error',
            description: 'No se pudieron cargar las incidencias',
            variant: 'destructive',
          });
        }
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

  const fetchEvents = async () => {
    console.log('🚀 fetchEvents called - LOADING EVENTS FOR TIME SLOTS!');
    setLoading(true);
    try {
      const applyEvents = async (stelEvents: StelEvent[]) => {
        console.log('📅 Processing Events:', {
          totalEvents: stelEvents.length
        });

        // Filter out deleted events
        const validEvents = stelEvents.filter((event) => {
          if (event.deleted) return false;
          return true;
        });

        console.log('📅 Filtered Events:', {
          total: stelEvents.length,
          valid: validEvents.length
        });

        // Get all unique event-type-ids from events to fetch event types and extract TEC codes
        const uniqueEventTypeIds = [...new Set(
          validEvents
            .map(e => e['event-type-id'])
            .filter(id => id !== null && id !== undefined)
        )];

        console.log(`🔍 Found ${uniqueEventTypeIds.length} unique event types, fetching event types to get TEC codes...`);

        // Fetch ALL event types at once to get TEC codes from their names
        const eventTypeToTecMap = new Map<number, string>(); // eventTypeId -> TEC code
        
        try {
          if (import.meta.env.DEV) {
            // DEV: Fetch all event types via Vite proxy
            const proxyUrl = `/api/stel/app/eventTypes?limit=500`;
            
            console.log(`📡 Fetching all event types...`);
            
            const response = await fetch(proxyUrl, {
              headers: {
                APIKEY: import.meta.env.VITE_STEL_API_KEY,
              },
            });

            if (response.ok) {
              const allEventTypes = (await response.json()) as StelEventType[];
              console.log(`✅ Fetched ${allEventTypes.length} event types from API`);
              
              // Extract TEC codes from event type names and map by ID
              allEventTypes.forEach((eventType) => {
                if (uniqueEventTypeIds.includes(eventType.id) && eventType.name) {
                  // Event type name contains "TEC095" or similar
                  const techMatch = eventType.name.match(/TEC\s*(\d+)/i);
                  if (techMatch) {
                    const normalizedTech = `TEC${String(techMatch[1]).padStart(3, '0')}`;
                    eventTypeToTecMap.set(eventType.id, normalizedTech);
                    console.log(`✅ Mapped event type ${eventType.id} (${eventType.name}) to ${normalizedTech}`);
                  } else {
                    console.warn(`⚠️ Event type ${eventType.id} has no TEC in name: "${eventType.name}"`);
                  }
                }
              });
              
              console.log(`✅ Mapped ${eventTypeToTecMap.size} event types to TEC codes`);
            }
          } else {
            // PROD: Fetch all event types via Edge Function
            console.log('🚀 PROD MODE: Using stel-event-types-v2 Edge Function');
            
            const { data: eventTypesData, error: eventTypesError } = await supabase.functions.invoke('stel-event-types-v2', {
              body: { limit: '500' },
            });
            
            if (eventTypesError) {
              console.warn('⚠️ Could not fetch event types:', eventTypesError);
            } else if (eventTypesData && Array.isArray(eventTypesData)) {
              const allEventTypes = eventTypesData as StelEventType[];
              console.log(`✅ Fetched ${allEventTypes.length} event types from Edge Function`);
              
              // Extract TEC codes from event type names and map by ID
              allEventTypes.forEach((eventType) => {
                if (uniqueEventTypeIds.includes(eventType.id) && eventType.name) {
                  const techMatch = eventType.name.match(/TEC\s*(\d+)/i);
                  if (techMatch) {
                    const normalizedTech = `TEC${String(techMatch[1]).padStart(3, '0')}`;
                    eventTypeToTecMap.set(eventType.id, normalizedTech);
                    console.log(`✅ Mapped event type ${eventType.id} (${eventType.name}) to ${normalizedTech}`);
                  } else {
                    console.warn(`⚠️ Event type ${eventType.id} has no TEC in name: "${eventType.name}"`);
                  }
                }
              });
              
              console.log(`✅ Mapped ${eventTypeToTecMap.size} event types to TEC codes`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Exception fetching event types:`, error);
        }

        // Map events to calendar events with TEC codes from event types
        const calendarEvents: CalendarEvent[] = validEvents.map((event) => {
          // Events have start-date and end-date fields: "2024-09-30T09:00:00+0000"
          // ⚠️ CRITICAL: The STEL API sends dates with +0000 but they are ALREADY in local time (CET/CEST)
          // We need to extract the time values and use them AS-IS without timezone conversion
          // Example: "2024-09-30T09:00:00+0000" should display as 09:00, NOT 11:00
          
          // Parse start-date
          const startDateStr = event['start-date']; // e.g., "2024-09-30T09:00:00+0000"
          const [startDatePart, startTimePartWithTZ] = startDateStr.split('T');
          const startTimePart = startTimePartWithTZ.split('+')[0].split('-')[0]; // Remove timezone
          
          const [startYear, startMonth, startDay] = startDatePart.split('-').map(Number);
          const startTimeComponents = startTimePart.split(':');
          const startHours = parseInt(startTimeComponents[0]);
          const startMinutes = parseInt(startTimeComponents[1]);
          const startSeconds = startTimeComponents[2] ? parseInt(startTimeComponents[2]) : 0;
          
          // Create a Date object with the LOCAL time values (no timezone conversion)
          const startDate = new Date(startYear, startMonth - 1, startDay, startHours, startMinutes, startSeconds);
          
          // Parse end-date
          const endDateStr = event['end-date']; // e.g., "2024-09-30T11:00:00+0000"
          const [endDatePart, endTimePartWithTZ] = endDateStr.split('T');
          const endTimePart = endTimePartWithTZ.split('+')[0].split('-')[0]; // Remove timezone
          
          const [endYear, endMonth, endDay] = endDatePart.split('-').map(Number);
          const endTimeComponents = endTimePart.split(':');
          const endHours = parseInt(endTimeComponents[0]);
          const endMinutes = parseInt(endTimeComponents[1]);
          const endSeconds = endTimeComponents[2] ? parseInt(endTimeComponents[2]) : 0;
          
          // Create a Date object with the LOCAL time values (no timezone conversion)
          const endDate = new Date(endYear, endMonth - 1, endDay, endHours, endMinutes, endSeconds);
          
          // Get TEC code from event type
          let technicianId = 'Sin Asignar';
          
          if (event['event-type-id'] && eventTypeToTecMap.has(event['event-type-id'])) {
            technicianId = eventTypeToTecMap.get(event['event-type-id'])!;
            console.log(`✅ Event ${event.id} assigned to ${technicianId} via event type ${event['event-type-id']}`);
          } else {
            console.warn(`⚠️ Event ${event.id} has no TEC code (event-type-id: ${event['event-type-id']})`);
          }

          const calendarEvent = {
            id: event.id,
            title: event.subject || event.description || `Event ${event.id}`,
            start: startDate,
            end: endDate,
            resource: event,
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
          });
        
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

  // Handle color changes for technicians with persistent storage
  const handleTechnicianColorChange = (technicianName: string, newColor: string) => {
    console.log(`🎨 Changing color for ${technicianName} to ${newColor}`);

    // Load current color map
    const currentMap = loadColorMap();

    // Update the color for this technician
    currentMap[technicianName] = newColor;

    // Save to localStorage
    saveColorMap(currentMap);

    // Force re-render by updating state (this will trigger getColorForCalendar to use new colors)
    setTechnicianSchedules(prev => prev.map(schedule => ({
      ...schedule,
      color: getColorForCalendar(schedule.name)
    })));

    console.log(`✅ Color saved for ${technicianName}: ${newColor}`);
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
              Calendario Eventos
            </h1>
            <p className="text-muted-foreground">
              Gestión de eventos de STEL Order
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
          {loading ? 'Cargando...' : '📅 Cargar Eventos (Time Slots)'}
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
                  
                  // Check if there are incidents available for this technician and date (for WhatsApp)
                  const targetDateStr = moment(currentDate).format('YYYY-MM-DD');
                  const hasIncidentsForWhatsApp = allIncidents.some((incident) => {
                    if (!incident.date || !incident['assignee-id']) return false;
                    if (incident.reference && incident.reference.startsWith('I-PRT')) return false;
                    
                    const dateStr = incident.date;
                    const [datePart] = dateStr.split('T');
                    const incidentDateStr = datePart;
                    
                    if (incidentDateStr !== targetDateStr) return false;
                    
                    const incidentTecCode = assigneeToTecMap.get(incident['assignee-id']);
                    return incidentTecCode === schedule.name;
                  });
                  
                  return {
                    ...schedule,
                    todayEventsCount: todayEvents.length,
                    todayEvents: todayEvents,
                    hasIncidentsForWhatsApp: hasIncidentsForWhatsApp
                  };
                })
                .filter(schedule => schedule.todayEventsCount > 0 || schedule.hasIncidentsForWhatsApp);

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
                            <ColorPickerDialog
                              technicianName={schedule.name}
                              currentColor={schedule.color}
                              onColorChange={handleTechnicianColorChange}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">{schedule.todayEventsCount}</Badge>
                            
                            {/* WhatsApp Button - Show if there are events OR incidents for WhatsApp */}
                            {(schedule.todayEventsCount > 0 || schedule.hasIncidentsForWhatsApp) && (
                              <WhatsAppDialog
                                key={`${schedule.name}-${moment(currentDate).format('YYYY-MM-DD')}`}
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
                                    {(event.resource as Record<string, string | undefined>)?.['full-reference'] || (event.resource as Record<string, string | undefined>)?.reference || 'Sin referencia'}
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
