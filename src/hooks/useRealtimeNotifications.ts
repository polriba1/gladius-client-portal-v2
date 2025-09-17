import { useState, useEffect } from 'react';
import { devLog } from "@/lib/log";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeNotification {
  id: string;
  type: 'new_call' | 'new_ticket' | 'ticket_update' | 'urgent_ticket';
  title: string;
  message: string;
  data?: unknown;
  timestamp: Date;
}

export const useRealtimeNotifications = () => {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const { profile } = useUserProfile();

  useEffect(() => {
    if (!profile?.client_id && !profile?.active_client_id) return;

    const clientName = profile.client_name?.toLowerCase();
    let channels: RealtimeChannel[] = [];

    const setupNotificationChannels = async () => {
      try {
        devLog('🔔 Setting up notification channels');

        // Subscribe to relevant tables based on client
        if (clientName?.includes('salutdental')) {
          // Salutdental notifications with unique channel names
          const callsChannel = supabase
            .channel(`salutdental_calls_notifications_${Date.now()}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'call_logs_salutdental'
              },
              (payload) => {
                devLog('🔔 New Salutdental call notification');
                const notification: RealtimeNotification = {
                  id: `call_${payload.new.id}_${Date.now()}`,
                  type: 'new_call',
                  title: 'Nova trucada rebuda',
                  message: `Trucada de ${payload.new.phone_id || 'número desconegut'}`,
                  data: payload.new,
                  timestamp: new Date()
                };

                setNotifications(prev => [notification, ...prev.slice(0, 9)]);
                
                toast({
                  title: notification.title,
                  description: notification.message,
                  className: 'border-l-4 border-l-blue-500',
                });
              }
            )
            .subscribe((status) => {
              devLog('📡 Salutdental calls notifications subscription:', status);
            });

          const ticketsChannel = supabase
            .channel(`salutdental_tickets_notifications_${Date.now()}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'tickets_salutdental'
              },
              (payload) => {
                devLog('🔔 New Salutdental ticket notification');
                const isUrgent = payload.new.ticket_type?.toLowerCase().includes('urgent') ||
                               payload.new.ticket_status?.toLowerCase().includes('urgent');

                const notification: RealtimeNotification = {
                  id: `ticket_${payload.new.id}_${Date.now()}`,
                  type: isUrgent ? 'urgent_ticket' : 'new_ticket',
                  title: isUrgent ? '🚨 Ticket urgent creat!' : 'Nou ticket creat',
                  message: `${payload.new.ticket_type || 'Ticket'} de ${payload.new.user_name || 'client desconegut'}`,
                  data: payload.new,
                  timestamp: new Date()
                };

                setNotifications(prev => [notification, ...prev.slice(0, 9)]);
                
                toast({
                  title: notification.title,
                  description: notification.message,
                  className: isUrgent ? 'border-l-4 border-l-red-500 bg-red-50' : 'border-l-4 border-l-green-500',
                });
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'tickets_salutdental'
              },
              (payload) => {
                if (payload.old.ticket_status !== payload.new.ticket_status) {
                  devLog('🔔 Salutdental ticket status update');
                  const notification: RealtimeNotification = {
                    id: `update_${payload.new.id}_${Date.now()}`,
                    type: 'ticket_update',
                    title: 'Estat de ticket actualitzat',
                    message: `Ticket ${payload.new.id}: ${payload.old.ticket_status} → ${payload.new.ticket_status}`,
                    data: { old: payload.old, new: payload.new },
                    timestamp: new Date()
                  };

                  setNotifications(prev => [notification, ...prev.slice(0, 9)]);
                }
              }
            )
            .subscribe((status) => {
              devLog('📡 Salutdental tickets notifications subscription:', status);
            });

          channels = [callsChannel, ticketsChannel];

        } else if (clientName?.includes('tecnics') || clientName?.includes('bcn')) {
          // Tecnics BCN notifications with unique channel names
          const callsChannel = supabase
            .channel(`tecnics_calls_notifications_${Date.now()}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'call_logs_tecnics_bcn_sat'
              },
              (payload) => {
                devLog('🔔 New Tecnics BCN call notification');
                const notification: RealtimeNotification = {
                  id: `call_${payload.new.id}_${Date.now()}`,
                  type: 'new_call',
                  title: 'Nova trucada rebuda',
                  message: `Trucada de ${payload.new.phone_id || 'número desconegut'}`,
                  data: payload.new,
                  timestamp: new Date()
                };

                setNotifications(prev => [notification, ...prev.slice(0, 9)]);
                
                toast({
                  title: notification.title,
                  description: notification.message,
                  className: 'border-l-4 border-l-blue-500',
                });
              }
            )
            .subscribe((status) => {
              devLog('📡 Tecnics BCN calls notifications subscription:', status);
            });

          const ticketsChannel = supabase
            .channel(`tecnics_tickets_notifications_${Date.now()}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'tickets_tecnics_bcn_sat'
              },
              (payload) => {
                devLog('🔔 New Tecnics BCN ticket notification');
                const isUrgent = payload.new.ticket_type?.toLowerCase().includes('urgent') ||
                               payload.new.ticket_status?.toLowerCase().includes('urgent');

                const notification: RealtimeNotification = {
                  id: `ticket_${payload.new.id}_${Date.now()}`,
                  type: isUrgent ? 'urgent_ticket' : 'new_ticket',
                  title: isUrgent ? '🚨 Ticket urgent creat!' : 'Nou ticket creat',
                  message: `${payload.new.ticket_type || 'Ticket'} de ${payload.new.user_name || 'client desconegut'}`,
                  data: payload.new,
                  timestamp: new Date()
                };

                setNotifications(prev => [notification, ...prev.slice(0, 9)]);
                
                toast({
                  title: notification.title,
                  description: notification.message,
                  className: isUrgent ? 'border-l-4 border-l-red-500 bg-red-50' : 'border-l-4 border-l-green-500',
                });
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'tickets_tecnics_bcn_sat'
              },
              (payload) => {
                if (payload.old.ticket_status !== payload.new.ticket_status) {
                  devLog('🔔 Tecnics BCN ticket status update');
                  const notification: RealtimeNotification = {
                    id: `update_${payload.new.id}_${Date.now()}`,
                    type: 'ticket_update',
                    title: 'Estat de ticket actualitzat',
                    message: `Ticket ${payload.new.id}: ${payload.old.ticket_status} → ${payload.new.ticket_status}`,
                    data: { old: payload.old, new: payload.new },
                    timestamp: new Date()
                  };

                  setNotifications(prev => [notification, ...prev.slice(0, 9)]);
                }
              }
            )
            .subscribe((status) => {
              devLog('📡 Tecnics BCN tickets notifications subscription:', status);
            });

          channels = [callsChannel, ticketsChannel];
        }

        // Set connection status
        setIsConnected(true);
        devLog('✅ Notification channels setup completed');

      } catch (error) {
        console.error('❌ Error setting up notification channels:', error);
        setIsConnected(false);
      }
    };

    setupNotificationChannels();

    // Cleanup function
    return () => {
      devLog('🧹 Cleaning up notification channels');
      channels.forEach(channel => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
      setIsConnected(false);
    };
  }, [profile, toast]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    isConnected,
    clearNotifications,
    removeNotification
  };
};