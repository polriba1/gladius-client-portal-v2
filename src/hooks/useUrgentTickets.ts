import { devLog } from "@/lib/log";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from '@supabase/supabase-js';
import { mapExistingTicketToUI, type ExistingTicket, type MappedTicket } from '@/types/existingTickets';

export const useUrgentTickets = () => {
  const { profile } = useUserProfile();
  const [urgentTickets, setUrgentTickets] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUrgentTickets = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!profile?.client_name) {
        setUrgentTickets([]);
        return;
      }

      let query;
      
      // Query appropriate table based on client
      if (profile.client_name === 'Salutdental') {
        // For Salutdental, get all tickets and we'll filter for open + urgent ones
        query = supabase
          .from('tickets_salutdental')
          .select('*')
          .order('created_at', { ascending: false });
      } else if (profile.client_name.toLowerCase().includes('tecnics') || profile.client_name.toLowerCase().includes('bcn')) {
        // For Tecnics BCN SAT, get all tickets and we'll filter for open + urgent ones
        query = supabase
          .from('tickets_tecnics_bcn_sat')
          .select('*')
          .order('created_at', { ascending: false });
      } else {
        // Unknown client, return no urgent tickets
        setUrgentTickets([]);
        return;
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Filter for urgent tickets using the same logic as categorizeTicket from TabbedListView.tsx
      let urgentFilteredData: unknown[] = [];
      
      if (profile.client_name === 'Salutdental') {
        urgentFilteredData = (data || []).filter(ticket => {
          const ticketType = ticket.ticket_type || '';
          const notes = ticket.notes?.toLowerCase() || '';
          const aiNotes = ticket.ai_notes?.toLowerCase() || '';
          
          // Check if it's urgent based on the same criteria as categorizeTicket
          const isUrgentType = ticketType === 'Urgent';
          const hasUrgentKeywords = notes.includes('urgente') || notes.includes('urgent') || 
                                   aiNotes.includes('urgente') || aiNotes.includes('urgent');
          
          // Check if it's open (not closed) - expanded list based on mapping logic
          const status = ticket.ticket_status || '';
          const statusLower = status.toLowerCase();
          const isClosed = statusLower.includes('resuelto') || statusLower.includes('resolt') ||
                          statusLower.includes('cerrado') || statusLower.includes('tancat') ||
                          statusLower.includes('finalizado') || statusLower.includes('finalitzat') ||
                          statusLower.includes('cancelado') || statusLower.includes('cancel·lat') ||
                          statusLower.includes('cancelado') || statusLower.includes('cancel·lat') ||
                          statusLower.includes('facturado') || statusLower.includes('tancat') ||
                          status === 'Resolt' || status === 'Tancat' || status === 'Finalitzat';
          
          return (isUrgentType || hasUrgentKeywords) && !isClosed;
        });
      } else {
        // For Tecnics BCN, use the same categorizeTicket logic from TabbedListView.tsx
        const mappedTickets = ((data || []) as ExistingTicket[]).map(mapExistingTicketToUI);
        
        devLog('Mapped tickets for urgent filtering:', mappedTickets.slice(0, 5).map(t => ({
          id: t.id,
          subject: t.subject,
          symptoms: t.symptoms,
          priority: t.priority,
          status: t.status
        })));
        
        urgentFilteredData = mappedTickets.filter(ticket => {
          // RULE: Only "averia/avería" go to Avaries. Do this check first so nothing overrides it.
          const subject = ticket.subject?.toLowerCase() || '';
          const symptoms = ticket.symptoms?.toLowerCase() || '';
          const originalSymptoms = ticket.symptoms || '';
          
          devLog(`Checking ticket ${ticket.id}:`, {
            subject,
            symptoms,
            originalSymptoms,
            priority: ticket.priority,
            status: ticket.status
          });
          
          // Skip if it's an averia/averia
          if (subject.includes('averia') || subject.includes('avería') || symptoms.includes('averia') || symptoms.includes('avería')) {
            devLog(`Ticket ${ticket.id} skipped - is averia`);
            return false;
          }

          // Urgent by exact ticket types from Supabase
          if (originalSymptoms === 'anular_cita' || originalSymptoms === 'urgente') {
            // For urgent tickets, only count open ones for notification
            const closedStatuses = new Set<MappedTicket['status']>(['completed', 'closed', 'cancelled', 'invoiced']);
            const isClosed = closedStatuses.has(ticket.status);
            devLog(`Ticket ${ticket.id} urgent by exact symptoms: ${originalSymptoms}, closed: ${isClosed}`);
            return !isClosed;
          }

          // Urgent by subject/symptoms (urgente, urgent, anular, cancelar, etc.)
          if (subject.includes('urgente') || subject.includes('urgent') || 
              subject.includes('anular_cita') || subject.includes('cancelar') ||
              symptoms.includes('urgente') || symptoms.includes('urgent') ||
              symptoms.includes('anular_cita') || symptoms.includes('cancelar')) {
            // For urgent tickets, only count open ones for notification
            const closedStatuses = new Set<MappedTicket['status']>(['completed', 'closed', 'cancelled', 'invoiced']);
            const isClosed = closedStatuses.has(ticket.status);
            devLog(`Ticket ${ticket.id} urgent by keywords, closed: ${isClosed}`);
            return !isClosed;
          }

          // Urgent by priority (only if not averia/unfinished)
          if (ticket.priority === 'emergency') {
            // For urgent tickets, only count open ones for notification
            const closedStatuses = new Set<MappedTicket['status']>(['completed', 'closed', 'cancelled', 'invoiced']);
            const isClosed = closedStatuses.has(ticket.status);
            devLog(`Ticket ${ticket.id} urgent by priority, closed: ${isClosed}`);
            return !isClosed;
          }

          devLog(`Ticket ${ticket.id} not urgent`);
          return false;
        });
      }

      devLog('Urgent tickets fetch result', {
        raw: data?.length || 0,
        urgentFiltered: urgentFilteredData.length,
        profile: profile?.client_name,
        sampleRaw: data?.slice(0, 3).map(t => ({
          id: t.id,
          ticket_type: t.ticket_type,
          ticket_status: t.ticket_status,
          user_name: t.user_name,
          notes: t.notes?.substring(0, 50)
        })),
        sampleUrgent: (urgentFilteredData.slice(0, 3) as MappedTicket[]).map(t => ({
          id: t.id,
          subject: t.subject,
          symptoms: t.symptoms,
          priority: t.priority,
          status: t.status
        }))
      });
      
      setUrgentTickets(urgentFilteredData);
    } catch (err) {
      console.error('Error fetching urgent tickets:', err);
      setUrgentTickets([]);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Real-time subscription for urgent tickets
  useEffect(() => {
    if (!profile?.client_name) return;
    
    fetchUrgentTickets();

    // Subscribe to the appropriate table based on client
    let tableName = '';
    
    if (profile.client_name === 'Salutdental') {
      tableName = 'tickets_salutdental';
    } else if (profile.client_name.toLowerCase().includes('tecnics') || profile.client_name.toLowerCase().includes('bcn')) {
      tableName = 'tickets_tecnics_bcn_sat';
    } else {
      return; // Unknown client, no subscription
    }

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName
        },
        (payload) => {
          devLog(`Real-time ${tableName} change detected:`, payload.eventType);
          
          // Always refetch to ensure consistency
          fetchUrgentTickets();
        }
      )
      .subscribe((status) => {
        devLog('Realtime subscription status:', status);
      });

    return () => {
      devLog('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchUrgentTickets, profile]);

  return {
    urgentTickets,
    loading,
    urgentTicketCount: urgentTickets.length,
    fetchUrgentTickets,
  };
};





