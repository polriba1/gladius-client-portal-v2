// Types for the existing tickets_tecnics_bcn_sat table (updated structure)
export interface ExistingTicket {
  id: number;
  created_at: string;
  ticket_type: string | null;
  user_name: string | null;
  phone_id: string | null;
  notes: string | null;
  agent_status: string | null;
  ticket_status: string | null;
  ai_notes: string | null;
}

// Mapped ticket interface for the new UI
export interface MappedTicket {
  id: string;
  ticket_number: string;
  client_id?: string;
  
  // Customer info
  requester_name: string;
  requester_phone: string;
  requester_email?: string;
  
  // Location info (will be empty for existing tickets)
  site_address: string;
  site_lat?: number;
  site_lng?: number;
  access_instructions?: string;
  
  // Equipment info
  equipment_id?: string;
  equipment_description?: string;
  
  // Ticket details
  priority: 'emergency' | 'same_day' | 'standard';
  status: 'created' | 'triaged' | 'scheduled' | 'assigned' | 'en_route' | 'on_site' | 'in_progress' | 'parts_needed' | 'completed' | 'invoiced' | 'closed' | 'cancelled';
  subject: string;
  description: string;
  symptoms?: string;
  tags?: string[];
  
  // Linked call data
  linked_call_id?: number;
  call_recording_url?: string;
  call_transcript?: string;
  
  // Assignment
  assigned_to?: string;
  dispatcher_id?: string;
  
  // SLA targets
  sla_response_hours: number;
  sla_resolution_hours: number;
  sla_response_due?: string;
  sla_resolution_due?: string;
  sla_breached: boolean;
  
  // Scheduling
  scheduled_start?: string;
  scheduled_end?: string;
  estimated_duration?: number;
  
  // Labor tracking
  actual_start?: string;
  actual_end?: string;
  labor_hours: number;
  labor_rate?: number;
  
  // Financial
  estimated_cost?: number;
  actual_cost?: number;
  quote_id?: string;
  invoice_id?: string;
  
  // Notes
  internal_notes?: string;
  public_notes?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  triaged_at?: string;
  scheduled_at?: string;
  assigned_at?: string;
  en_route_at?: string;
  on_site_at?: string;
  completed_at?: string;
  invoiced_at?: string;
  closed_at?: string;
  
  created_by?: string;
}

export type TicketStatus = MappedTicket['status'];
export type TicketPriority = MappedTicket['priority'];

// Mapping functions
export const mapExistingTicketToUI = (ticket: ExistingTicket): MappedTicket => {
  // Map status from Spanish to our system
  const mapStatus = (status: string | null): TicketStatus => {
    if (!status) return 'created';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('abierto') || statusLower.includes('obert')) return 'created';
    if (statusLower.includes('proceso') || statusLower.includes('procés')) return 'in_progress';
    if (statusLower.includes('cerrado') || statusLower.includes('tancat')) return 'completed';
    if (statusLower.includes('resuelto') || statusLower.includes('resolt')) return 'completed';
    if (statusLower.includes('asignad')) return 'assigned';
    return 'created';
  };

  // Map priority based on ticket type
  const mapPriority = (tipo: string | null): TicketPriority => {
    if (!tipo) return 'standard';
    const tipoLower = tipo.toLowerCase();
    if (tipoLower.includes('urgent') || tipoLower.includes('emergenc') || tipoLower.includes('anular_cita')) return 'emergency';
    if (tipoLower.includes('rapido') || tipoLower.includes('mismo dia')) return 'same_day';
    return 'standard';
  };

  return {
    id: ticket.id.toString(),
    ticket_number: `T-${ticket.id}`,
    
    // Customer info - using new field names
    requester_name: ticket.user_name || 'Cliente desconocido',
    requester_phone: ticket.phone_id || '',
    requester_email: undefined,
    
    // Location info (default values since not in existing schema)
    site_address: 'Dirección no especificada',
    
    // Ticket details - using new field names
    priority: mapPriority(ticket.ticket_type),
    status: mapStatus(ticket.ticket_status),
    subject: ticket.ticket_type || 'Sin asunto',
    description: ticket.ai_notes || ticket.notes || 'Sin descripción',
    symptoms: ticket.ticket_type ?? undefined,
    
    // Linked call data
    linked_call_id: ticket.id,
    call_recording_url: undefined, // Not available in current structure
    call_transcript: undefined, // Not available in current structure
    
    // Assignment - using new field names
    assigned_to: ticket.agent_status || undefined,
    
    // SLA defaults
    sla_response_hours: 24,
    sla_resolution_hours: 72,
    sla_breached: false,
    
    // Labor defaults
    labor_hours: 0,
    
    // Financial
    actual_cost: undefined, // Not available in current structure
    
    // Notes - using new field names
    internal_notes: ticket.ai_notes ?? undefined,
    public_notes: ticket.notes ?? undefined,
    
    // Timestamps
    created_at: ticket.created_at,
    updated_at: ticket.created_at,
  };
};

// Status display mappings for existing tickets
export const STATUS_LABELS: Record<TicketStatus, string> = {
  created: 'Nou',
  triaged: 'Classificat',
  scheduled: 'Programat',
  assigned: 'Assignat',
  en_route: 'En camí',
  on_site: 'Al lloc',
  in_progress: 'En progrés',
  parts_needed: 'Peces necessàries',
  completed: 'Completat',
  invoiced: 'Facturat',
  closed: 'Tancat',
  cancelled: 'Cancel·lat',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  emergency: 'Emergència',
  same_day: 'Mateix dia',
  standard: 'Estàndard',
};