import { z } from 'zod';

// Enums matching database types
export const UserRole = z.enum(['admin', 'dispatcher', 'technician', 'viewer']);
export const TicketPriority = z.enum(['emergency', 'same_day', 'standard']);
export const TicketStatus = z.enum([
  'created', 'triaged', 'scheduled', 'assigned', 'en_route', 
  'on_site', 'in_progress', 'parts_needed', 'completed', 
  'invoiced', 'closed', 'cancelled'
]);
export const EquipmentType = z.enum([
  'air_conditioner', 'heat_pump', 'furnace', 'boiler', 'water_heater', 
  'ventilation_system', 'thermostat', 'air_filter', 'ductwork', 'other'
]);

// Schema definitions
export const HVACTicketSchema = z.object({
  id: z.string().uuid(),
  ticket_number: z.string(),
  client_id: z.string().uuid(),
  
  // Customer info
  requester_name: z.string().min(1, 'Requester name is required'),
  requester_phone: z.string().min(1, 'Phone number is required'),
  requester_email: z.string().email().optional().nullable(),
  
  // Location info
  site_address: z.string().min(1, 'Site address is required'),
  site_lat: z.number().optional().nullable(),
  site_lng: z.number().optional().nullable(),
  access_instructions: z.string().optional().nullable(),
  
  // Equipment info
  equipment_id: z.string().uuid().optional().nullable(),
  equipment_description: z.string().optional().nullable(),
  
  // Ticket details
  priority: TicketPriority,
  status: TicketStatus,
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().min(1, 'Description is required'),
  symptoms: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  
  // Linked call data
  linked_call_id: z.number().optional().nullable(),
  call_recording_url: z.string().url().optional().nullable(),
  call_transcript: z.string().optional().nullable(),
  
  // Assignment
  assigned_to: z.string().uuid().optional().nullable(),
  dispatcher_id: z.string().uuid().optional().nullable(),
  
  // SLA targets
  sla_response_hours: z.number().int().positive().default(24),
  sla_resolution_hours: z.number().int().positive().default(72),
  sla_response_due: z.string().datetime().optional().nullable(),
  sla_resolution_due: z.string().datetime().optional().nullable(),
  sla_breached: z.boolean().default(false),
  
  // Scheduling
  scheduled_start: z.string().datetime().optional().nullable(),
  scheduled_end: z.string().datetime().optional().nullable(),
  estimated_duration: z.number().int().positive().optional().nullable(),
  
  // Labor tracking
  actual_start: z.string().datetime().optional().nullable(),
  actual_end: z.string().datetime().optional().nullable(),
  labor_hours: z.number().nonnegative().default(0),
  labor_rate: z.number().nonnegative().optional().nullable(),
  
  // Financial
  estimated_cost: z.number().nonnegative().optional().nullable(),
  actual_cost: z.number().nonnegative().optional().nullable(),
  quote_id: z.string().optional().nullable(),
  invoice_id: z.string().optional().nullable(),
  
  // Notes
  internal_notes: z.string().optional().nullable(),
  public_notes: z.string().optional().nullable(),
  
  // Timestamps
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  triaged_at: z.string().datetime().optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
  assigned_at: z.string().datetime().optional().nullable(),
  en_route_at: z.string().datetime().optional().nullable(),
  on_site_at: z.string().datetime().optional().nullable(),
  completed_at: z.string().datetime().optional().nullable(),
  invoiced_at: z.string().datetime().optional().nullable(),
  closed_at: z.string().datetime().optional().nullable(),
  
  created_by: z.string().uuid(),
});

export const EquipmentSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  equipment_type: EquipmentType,
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  installation_date: z.string().optional().nullable(),
  warranty_expires: z.string().optional().nullable(),
  contract_number: z.string().optional().nullable(),
  location_description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const PartSchema = z.object({
  id: z.string().uuid(),
  part_number: z.string().min(1, 'Part number is required'),
  name: z.string().min(1, 'Part name is required'),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  unit_price: z.number().nonnegative().optional().nullable(),
  in_stock: z.number().int().nonnegative().default(0),
  min_stock: z.number().int().nonnegative().default(0),
  supplier: z.string().optional().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const TicketActivitySchema = z.object({
  id: z.string().uuid(),
  ticket_id: z.string().uuid(),
  user_id: z.string().uuid().optional().nullable(),
  action: z.string(),
  description: z.string().optional().nullable(),
  old_values: z.record(z.string(), z.unknown()).optional().nullable(),
  new_values: z.record(z.string(), z.unknown()).optional().nullable(),
  created_at: z.string().datetime(),
});

// Form schemas for creating/updating
export const CreateHVACTicketSchema = HVACTicketSchema.omit({
  id: true,
  ticket_number: true,
  created_at: true,
  updated_at: true,
  sla_response_due: true,
  sla_resolution_due: true,
  created_by: true,
}).partial({
  status: true,
  priority: true,
  sla_response_hours: true,
  sla_resolution_hours: true,
  sla_breached: true,
  labor_hours: true,
});

export const UpdateHVACTicketSchema = HVACTicketSchema.partial().omit({
  id: true,
  ticket_number: true,
  created_at: true,
  created_by: true,
});

// TypeScript types
export type UserRole = z.infer<typeof UserRole>;
export type TicketPriority = z.infer<typeof TicketPriority>;
export type TicketStatus = z.infer<typeof TicketStatus>;
export type EquipmentType = z.infer<typeof EquipmentType>;
export type HVACTicket = z.infer<typeof HVACTicketSchema>;
export type Equipment = z.infer<typeof EquipmentSchema>;
export type Part = z.infer<typeof PartSchema>;
export type TicketActivity = z.infer<typeof TicketActivitySchema>;
export type CreateHVACTicket = z.infer<typeof CreateHVACTicketSchema>;
export type UpdateHVACTicket = z.infer<typeof UpdateHVACTicketSchema>;

// Status display mappings
export const STATUS_LABELS: Record<TicketStatus, string> = {
  created: 'Creat',
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

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  air_conditioner: 'Aire condicionat',
  heat_pump: 'Bomba de calor',
  furnace: 'Forn',
  boiler: 'Caldera',
  water_heater: 'Escalfador d\'aigua',
  ventilation_system: 'Sistema de ventilació',
  thermostat: 'Termòstat',
  air_filter: 'Filtre d\'aire',
  ductwork: 'Conductes',
  other: 'Altres',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  dispatcher: 'Coordinador', 
  technician: 'Tècnic',
  viewer: 'Visualitzador',
};