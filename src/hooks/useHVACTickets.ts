import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HVACTicket, CreateHVACTicket, UpdateHVACTicket, TicketStatus, TicketPriority } from '@/types/hvac';
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

export const useHVACTickets = () => {
  const [tickets, setTickets] = useState<HVACTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchTickets = useCallback(async (
    filters: TicketFilters = {},
    pagination: PaginationParams = { page: 1, limit: 25 }
  ) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('hvac_tickets')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }

      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      if (filters.search) {
        query = query.or(`requester_name.ilike.%${filters.search}%,requester_phone.ilike.%${filters.search}%,site_address.ilike.%${filters.search}%,subject.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%`);
      }

      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }

      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      // Apply pagination
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      setTickets(data || []);
      setTotalCount(count || 0);
    } catch (err) {
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

  const createTicket = useCallback(async (ticketData: CreateHVACTicket) => {
    try {
      setLoading(true);
      
      const { data: userData } = await supabase.auth.getUser();
      
      const payload: CreateHVACTicket & { created_by: string } = {
        ...ticketData,
        created_by: userData.user?.id || '',
      };
      
      const { data, error } = await supabase
        .from('hvac_tickets')
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: 'Èxit',
        description: 'Ticket creat correctament',
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creating ticket';
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

  const updateTicket = useCallback(async (id: string, updates: UpdateHVACTicket) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('hvac_tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === id ? { ...ticket, ...data } : ticket
      ));

      toast({
        title: 'Èxit',
        description: 'Ticket actualitzat correctament',
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating ticket';
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

  const deleteTicket = useCallback(async (id: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('hvac_tickets')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      setTickets(prev => prev.filter(ticket => ticket.id !== id));

      toast({
        title: 'Èxit',
        description: 'Ticket eliminat correctament',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting ticket';
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
        .from('hvac_tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data;
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

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('hvac_tickets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hvac_tickets'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTickets(prev => [payload.new as HVACTicket, ...prev]);
            setTotalCount(prev => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            setTickets(prev => prev.map(ticket => 
              ticket.id === payload.new.id ? payload.new as HVACTicket : ticket
            ));
          } else if (payload.eventType === 'DELETE') {
            setTickets(prev => prev.filter(ticket => ticket.id !== payload.old.id));
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
    createTicket,
    updateTicket,
    deleteTicket,
    getTicketById,
  };
};
