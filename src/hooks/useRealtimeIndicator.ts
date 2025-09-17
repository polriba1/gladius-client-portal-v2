import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeStatus {
  isConnected: boolean;
  lastUpdate: Date | null;
  connectionQuality: 'good' | 'poor' | 'disconnected';
  activeChannels: number;
}

export const useRealtimeIndicator = () => {
  const [status, setStatus] = useState<RealtimeStatus>({
    isConnected: false,
    lastUpdate: null,
    connectionQuality: 'disconnected',
    activeChannels: 0
  });
  const { profile } = useUserProfile();

  useEffect(() => {
    if (!profile?.client_id && !profile?.active_client_id) return;

    const clientName = profile.client_name?.toLowerCase();
    let channels: RealtimeChannel[] = [];

    // Create status monitoring channels
    const setupChannels = () => {
      if (clientName?.includes('salutdental')) {
        const statusChannel = supabase
          .channel('salutdental_status')
          .on('presence', { event: 'sync' }, () => {
            setStatus(prev => ({
              ...prev,
              isConnected: true,
              lastUpdate: new Date(),
              connectionQuality: 'good'
            }));
          })
          .subscribe();

        channels = [statusChannel];
      } else if (clientName?.includes('tecnics') || clientName?.includes('bcn')) {
        const statusChannel = supabase
          .channel('tecnics_status')
          .on('presence', { event: 'sync' }, () => {
            setStatus(prev => ({
              ...prev,
              isConnected: true,
              lastUpdate: new Date(),
              connectionQuality: 'good'
            }));
          })
          .subscribe();

        channels = [statusChannel];
      }

      setStatus(prev => ({
        ...prev,
        activeChannels: channels.length
      }));
    };

    // Connection quality monitoring
    const checkConnection = () => {
      const now = new Date();
      setStatus(prev => {
        if (!prev.lastUpdate) {
          return { ...prev, connectionQuality: 'poor' };
        }
        
        const timeSinceUpdate = now.getTime() - prev.lastUpdate.getTime();
        
        if (timeSinceUpdate > 30000) { // 30 seconds
          return { ...prev, connectionQuality: 'poor' };
        } else if (timeSinceUpdate > 60000) { // 1 minute
          return { 
            ...prev, 
            connectionQuality: 'disconnected',
            isConnected: false
          };
        }
        
        return prev;
      });
    };

    setupChannels();
    
    // Check connection quality every 10 seconds
    const connectionCheckInterval = setInterval(checkConnection, 10000);

    // Initial connection status
    setStatus(prev => ({
      ...prev,
      isConnected: true,
      lastUpdate: new Date(),
      connectionQuality: 'good'
    }));

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      clearInterval(connectionCheckInterval);
      setStatus({
        isConnected: false,
        lastUpdate: null,
        connectionQuality: 'disconnected',
        activeChannels: 0
      });
    };
  }, [profile]);

  return status;
};