import { devLog } from "@/lib/log";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from '@supabase/supabase-js';

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
        // For Salutdental, check urgent tickets in their table
        query = supabase
          .from('tickets_salutdental')
          .select('*')
          .eq('ticket_type', 'Urgent')
          .not('ticket_status', 'in', '(Resolt,Tancat,Finalitzat)')
          .order('created_at', { ascending: false });
      } else if (profile.client_name.toLowerCase().includes('tecnics') || profile.client_name.toLowerCase().includes('bcn')) {
        // For Tecnics BCN SAT, check their urgent tickets
        query = supabase
          .from('tickets_tecnics_bcn_sat')
          .select('*')
          .in('ticket_type', ['Urgente', 'anular_cita'])
          .not('ticket_status', 'in', '(Resuelto,Cerrado,Finalizado)')
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

      // Filter based on client type
      let filteredData = [];
      
      if (profile.client_name === 'Salutdental') {
        filteredData = (data || []).filter(ticket => {
          const status = ticket.ticket_status;
          return status !== 'Resolt' && status !== 'Tancat' && status !== 'Finalitzat';
        });
      } else {
        filteredData = (data || []).filter(ticket => {
          const status = ticket.ticket_status;
          return status !== 'Resuelto' && status !== 'Cerrado' && status !== 'Finalizado';
        });
      }

      devLog('🚨 Urgent tickets fetch result', {
        raw: data?.length || 0,
        filtered: filteredData.length
      });
      
      setUrgentTickets(filteredData);
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