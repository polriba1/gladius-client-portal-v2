import { devLog } from "@/lib/logger";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SalutdentalTicketRaw {
  id: number;
  created_at: string;
  phone_id: string | null;
  user_name: string | null;
  ticket_type: string | null;
  ai_notes: string | null;
  ticket_status: string | null;
  nota_assistant: string | null;
  user_status: string | null;
}

export interface SalutdentalTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'standard' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  requester_name: string;
  requester_phone: string;
  requester_email: string;
  site_address: string;
  assigned_to?: string;
  public_notes: string;
  internal_notes: string;
  sla_breached: boolean;
  sla_response_due: string | null;
  call_recording_url?: string;
  call_transcript?: string;
  user_status: string | null; // Client status information
}

export interface SalutdentalTicketFilters {
  status?: string[];
  search?: string;
  start_date?: string;
  end_date?: string;
  assigned_to?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

// Map Salutdental raw data to the UI expected format  
const mapSalutdentalTicketToUI = (rawTicket: SalutdentalTicketRaw): SalutdentalTicket => {
  // Map Salutdental status to simplified status
  const mapStatus = (ticket_status: string | null): 'open' | 'in_progress' | 'closed' => {
    if (!ticket_status) return 'open';
    const lower = ticket_status.toLowerCase();
    if (lower.includes('tancat') || lower.includes('resolt') || lower.includes('finalitzat') || lower.includes('closed')) return 'closed';
    if (lower.includes('en curs') || lower.includes('assignat') || lower.includes('treballant') || lower.includes('progress')) return 'in_progress';
    return 'open';
  };

  // Map type to priority
  const mapPriority = (ticket_type: string | null): 'low' | 'standard' | 'high' | 'urgent' => {
    if (!ticket_type) return 'standard';
    const lower = ticket_type.toLowerCase();
    if (lower.includes('urgent') || lower.includes('emergència') || lower.includes('emergency')) return 'urgent';
    if (lower.includes('alta') || lower.includes('prioritari') || lower.includes('high')) return 'high';
    if (lower.includes('baixa') || lower.includes('low')) return 'low';
    return 'standard';
  };

  return {
    id: rawTicket.id.toString(),
    ticket_number: `SALU-${rawTicket.id.toString().padStart(6, '0')}`,
    subject: rawTicket.ticket_type || 'Sense tipus',
    description: rawTicket.ai_notes || 'Sense descripció',
    status: mapStatus(rawTicket.ticket_status),
    priority: mapPriority(rawTicket.ticket_type),
    created_at: rawTicket.created_at,
    updated_at: rawTicket.created_at,
    requester_name: rawTicket.user_name || 'Client desconegut',
    requester_phone: rawTicket.phone_id || '',
    requester_email: '', // Not available in current schema
    site_address: '', // Not available in current schema
    public_notes: rawTicket.ai_notes || '',
    internal_notes: rawTicket.nota_assistant || '',
    sla_breached: false,
    sla_response_due: null,
    user_status: rawTicket.user_status,
  };
};

export const useSalutdentalTickets = () => {
  const [tickets, setTickets] = useState<SalutdentalTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchTickets = useCallback(async (
    filters: SalutdentalTicketFilters = {},
    pagination: PaginationParams = { page: 1, limit: 25 }
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Use raw SQL-style query to avoid type issues
      const { data, error: fetchError, count } = await supabase
        .from('tickets_salutdental')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Salutdental tickets fetch error:', fetchError);
        throw fetchError;
      }

      // Client-side filtering for now
      let filteredData = data || [];

      // Apply search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter((ticket: SalutdentalTicketRaw) => 
          (ticket.user_name && ticket.user_name.toLowerCase().includes(searchLower)) ||
          (ticket.phone_id && ticket.phone_id.includes(searchLower)) ||
          (ticket.ticket_type && ticket.ticket_type.toLowerCase().includes(searchLower)) ||
          (ticket.ai_notes && ticket.ai_notes.toLowerCase().includes(searchLower))
        );
      }

      // Apply date filters
      if (filters.start_date) {
        filteredData = filteredData.filter((ticket: SalutdentalTicketRaw) => 
          new Date(ticket.created_at) >= new Date(filters.start_date!)
        );
      }

      if (filters.end_date) {
        filteredData = filteredData.filter((ticket: SalutdentalTicketRaw) => 
          new Date(ticket.created_at) <= new Date(filters.end_date!)
        );
      }

      // Apply status filter
      if (filters.status && filters.status.length > 0) {
        filteredData = filteredData.filter((ticket: unknown) => {
          const mappedStatus = mapSalutdentalTicketToUI(ticket as SalutdentalTicketRaw).status;
          return filters.status!.includes(mappedStatus);
        });
      }

      // Apply pagination
      const offset = (pagination.page - 1) * pagination.limit;
      const paginatedData = filteredData.slice(offset, offset + pagination.limit);

      // Map to UI format
      const mappedTickets = paginatedData.map((ticket: unknown) => 
        mapSalutdentalTicketToUI(ticket as SalutdentalTicketRaw)
      );
      
      setTickets(mappedTickets);
      setTotalCount(filteredData.length);
      
      devLog('✅ Loaded', mappedTickets.length, 'Salutdental tickets (filtered:', filteredData.length, 'total:', data?.length || 0, ')');
    } catch (error: unknown) {
      console.error('❌ Error fetching Salutdental tickets:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: 'Error loading Salutdental tickets',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateTicketStatus = useCallback(async (ticketId: string, status: 'open' | 'in_progress' | 'closed') => {
    try {
      // Map UI status to Salutdental status
      const salutdentalStatus = status === 'open' ? 'Obert' : 
                                status === 'in_progress' ? 'En curs' : 'Tancat';
      
      const { error } = await supabase
        .from('tickets_salutdental')
        .update({ ticket_status: salutdentalStatus } as unknown)
        .eq('id', parseInt(ticketId));

      if (error) throw error;

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status } : ticket
      ));

      toast({
        title: 'Èxit',
        description: 'Estat del ticket actualitzat',
      });
    } catch (error: unknown) {
      console.error('Error updating ticket status:', error);
      toast({
        title: 'Error',
        description: 'Error actualitzant l\'estat del ticket',
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  const updateTicketNotes = useCallback(async (ticketId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('tickets_salutdental')
        .update({ ai_notes: notes } as unknown)
        .eq('id', parseInt(ticketId));

      if (error) throw error;

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId ? { ...ticket, public_notes: notes } : ticket
      ));

      toast({
        title: 'Èxit',
        description: 'Notes del ticket actualitzades',
      });
    } catch (error: unknown) {
      console.error('Error updating ticket notes:', error);
      toast({
        title: 'Error', 
        description: 'Error actualitzant les notes del ticket',
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  const updateTicketAssignee = useCallback(async (ticketId: string, assignee: string | null) => {
    // Not implemented for Salutdental tickets as they don't have assignee field
    devLog('Assignment not available for Salutdental tickets');
  }, []);

  // Real-time subscription for tickets
  useEffect(() => {
    const channel = supabase
      .channel('salutdental_tickets_subscription')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets_salutdental'
        },
        (payload) => {
          devLog('🔄 Salutdental ticket realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newTicket = mapSalutdentalTicketToUI(payload.new as SalutdentalTicketRaw);
            setTickets(prev => [newTicket, ...prev]);
            setTotalCount(prev => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            const updatedTicket = mapSalutdentalTicketToUI(payload.new as SalutdentalTicketRaw);
            setTickets(prev => prev.map(ticket => 
              ticket.id === updatedTicket.id ? updatedTicket : ticket
            ));
          } else if (payload.eventType === 'DELETE') {
            setTickets(prev => prev.filter(ticket => ticket.id !== payload.old.id.toString()));
            setTotalCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    tickets,
    loading,
    error,
    totalCount,
    fetchTickets,
    updateTicketStatus,
    updateTicketNotes,
    updateTicketAssignee,
  };
};