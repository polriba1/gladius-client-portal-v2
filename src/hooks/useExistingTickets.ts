import { devLog } from "@/lib/logger";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExistingTicket, MappedTicket, mapExistingTicketToUI, TicketStatus, TicketPriority } from '@/types/existingTickets';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  assigned_to?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  tags?: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export const useExistingTickets = () => {
  const [tickets, setTickets] = useState<MappedTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchTickets = useCallback(async (
    filters: TicketFilters = {},
    pagination: PaginationParams = { page: 1, limit: 25 }
  ) => {
    try {
      devLog('🔄 Fetching tickets from database...', { filters, pagination });
      setLoading(true);
      setError(null);

      let query = supabase
        .from('tickets_tecnics_bcn_sat')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (filters.search) {
        query = query.or(`user_name.ilike.%${filters.search}%,phone_id.ilike.%${filters.search}%,ticket_type.ilike.%${filters.search}%,ai_notes.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      // Apply date filters
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }

      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      // Apply pagination
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      devLog('📊 Tickets database response:', { recordCount: data?.length, error, totalCount: count });

      if (error) {
        throw error;
      }

      // Map existing tickets to new UI format
      const mappedTickets = (data as ExistingTicket[] || []).map(mapExistingTicketToUI);
      
      devLog('🎯 Mapped tickets sample:', mappedTickets.slice(0, 2));
      
      // Apply client-side filters for mapped fields
      let filteredTickets = mappedTickets;
      
      if (filters.status && filters.status.length > 0) {
        filteredTickets = filteredTickets.filter(ticket => 
          filters.status!.includes(ticket.status)
        );
      }

      if (filters.priority && filters.priority.length > 0) {
        filteredTickets = filteredTickets.filter(ticket => 
          filters.priority!.includes(ticket.priority)
        );
      }

      if (filters.assigned_to) {
        if (filters.assigned_to === 'unassigned') {
          filteredTickets = filteredTickets.filter(ticket => 
            !ticket.assigned_to || ticket.assigned_to.trim() === ''
          );
        } else {
          filteredTickets = filteredTickets.filter(ticket => 
            ticket.assigned_to === filters.assigned_to
          );
        }
      }

      setTickets(filteredTickets);
      setTotalCount(count || 0);
      devLog('✅ Loaded', filteredTickets.length, 'filtered tickets, total:', count);
    } catch (err) {
      console.error('❌ Tickets fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error loading tickets';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateTicketStatus = useCallback(async (id: string, status: TicketStatus) => {
    try {
      setLoading(true);
      
      // Map UI status back to database status
      let dbStatus = '';
      switch (status) {
        case 'created':
          dbStatus = 'Abierto';
          break;
        case 'in_progress':
          dbStatus = 'En proceso';
          break;
        case 'completed':
          dbStatus = 'Cerrado';
          break;
        case 'assigned':
          dbStatus = 'Abierto';
          break;
        default:
          dbStatus = 'Abierto';
      }

      const { error } = await supabase
        .from('tickets_tecnics_bcn_sat')
        .update({ ticket_status: dbStatus })
        .eq('id', parseInt(id));

      if (error) {
        throw error;
      }

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === id ? { ...ticket, status } : ticket
      ));

      toast({
        title: 'Èxit',
        description: 'Estat del ticket actualitzat correctament',
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating ticket status';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateTicketAssignee = useCallback(async (id: string, assignee: string | null) => {
    try {
      setLoading(true);
      
      // Optimistic update
      setTickets(prev => prev.map(ticket => 
        ticket.id === id ? { ...ticket, assigned_to: assignee || undefined } : ticket
      ));

      const { error } = await supabase
        .from('tickets_tecnics_bcn_sat')
        .update({ agent_status: assignee === 'unassigned' || !assignee ? null : assignee })
        .eq('id', parseInt(id));

      if (error) {
        // Revert optimistic update on error
        setTickets(prev => prev.map(ticket => 
          ticket.id === id ? { ...ticket, assigned_to: ticket.assigned_to } : ticket
        ));
        throw error;
      }

      toast({
        title: 'Èxit',
        description: 'Assignació actualitzada correctament',
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating ticket assignee';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateTicketNotes = useCallback(async (id: string, notes: string) => {
    try {
      setLoading(true);
      
      // Optimistic update
      setTickets(prev => prev.map(ticket => 
        ticket.id === id ? { ...ticket, public_notes: notes } : ticket
      ));

      const { data, error } = await supabase
        .from('tickets_tecnics_bcn_sat')
        .update({ notes })
        .eq('id', parseInt(id))
        .select()
        .single();

      if (error) {
        // Revert optimistic update on error
        setTickets(prev => prev.map(ticket => 
          ticket.id === id ? { ...ticket, public_notes: ticket.public_notes } : ticket
        ));
        throw error;
      }

      toast({
        title: 'Èxit',
        description: 'Notes actualitzades correctament',
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating ticket notes';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getTicketById = useCallback(async (id: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('tickets_tecnics_bcn_sat')
        .select('*')
        .eq('id', parseInt(id))
        .single();

      if (error) {
        throw error;
      }

      return mapExistingTicketToUI(data as ExistingTicket);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading ticket';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Real-time subscription for existing tickets
  useEffect(() => {
    const channel = supabase
      .channel('tickets_tecnics_bcn_sat_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets_tecnics_bcn_sat'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const mappedTicket = mapExistingTicketToUI(payload.new as ExistingTicket);
            setTickets(prev => [mappedTicket, ...prev]);
            setTotalCount(prev => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            const mappedTicket = mapExistingTicketToUI(payload.new as ExistingTicket);
            setTickets(prev => prev.map(ticket => 
              ticket.id === mappedTicket.id ? mappedTicket : ticket
            ));
          } else if (payload.eventType === 'DELETE') {
            setTickets(prev => prev.filter(ticket => ticket.id !== payload.old.id.toString()));
            setTotalCount(prev => prev - 1);
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
    updateTicketAssignee,
    updateTicketNotes,
    getTicketById,
  };
};