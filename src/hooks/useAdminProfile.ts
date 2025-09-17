import { devLog } from "@/lib/logger";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface AdminProfile {
  id: string;
  client_id: string;
  admin_role: 'super_admin' | 'client_admin' | 'user';
  can_switch_clients: boolean;
  active_client_id?: string;
  client_name?: string;
  active_client_name?: string;
}

interface Client {
  id: string;
  nom: string;
  logo_url?: string;
  color_principal?: string;
}

export const useAdminProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setProfile(null);
          setLoading(false);
          return;
        }

        // Fetch user profile with admin info and active client
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            client_id,
            admin_role,
            can_switch_clients,
            active_client_id,
            clients!profiles_client_id_fkey (nom),
            active_client:clients!profiles_active_client_id_fkey (nom)
          `)
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching admin profile:', profileError);
          setProfile(null);
        } else {
          setProfile({
            id: profileData.id,
            client_id: profileData.client_id,
            admin_role: profileData.admin_role,
            can_switch_clients: profileData.can_switch_clients,
            active_client_id: profileData.active_client_id,
            client_name: profileData.clients?.nom,
            active_client_name: profileData.active_client?.nom
          });

          // Fetch available clients for admin
          if (profileData.admin_role === 'super_admin') {
            const { data: clientsData } = await supabase
              .from('clients')
              .select('id, nom, logo_url, color_principal')
              .order('nom');
            
            setAvailableClients(clientsData || []);
          } else if (profileData.admin_role === 'client_admin') {
            const { data: accessibleClients } = await supabase
              .rpc('get_admin_accessible_clients', { _user_id: user.id });
            
            setAvailableClients(accessibleClients || []);
          }
        }
      } catch (error) {
        console.error('Error in fetchAdminProfile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminProfile();
  }, []);

  const switchToClient = async (clientId: string) => {
    if (!profile?.id) return false;

    setSwitching(true);
    devLog('🔄 Admin switching to client');
    
    try {
      const { data, error } = await supabase
        .rpc('switch_admin_client_context', {
          _user_id: profile.id,
          _client_id: clientId
        });

      devLog('✅ Switch response received', { success: !!data, hasError: !!error });

      if (error) {
        console.error('❌ Switch error:', error);
        return false;
      }

      if (data) {
        // Update profile state immediately for UI feedback
        const selectedClient = availableClients.find(c => c.id === clientId);
        devLog('📱 Updating local state for client');
        
        setProfile(prev => prev ? {
          ...prev,
          active_client_id: clientId,
          active_client_name: selectedClient?.nom
        } : null);
        
        // Verify the switch worked and redirect to appropriate dashboard
        setTimeout(async () => {
          try {
            const { data: verifyData } = await supabase
              .from('profiles')
              .select(`
                active_client_id,
                active_client:clients!profiles_active_client_id_fkey (nom)
              `)
              .eq('id', profile.id)
              .single();
            
            devLog('🔍 Verification - Active client completed');
            
            if (verifyData?.active_client_id === clientId) {
              devLog('✅ Switch confirmed, redirecting to appropriate dashboard');
              
              const clientName = verifyData.active_client?.nom?.toLowerCase();
              if (clientName?.includes('salutdental')) {
                devLog('🦷 Redirecting to Salutdental Dashboard');
                navigate('/salutdental-dashboard');
              } else {
                devLog('🔧 Redirecting to Regular Dashboard');
                navigate('/dashboard');
              }
            }
          } catch (verifyError) {
            console.error('❌ Verification error:', verifyError);
          }
        }, 800);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Switch exception:', error);
      return false;
    } finally {
      setSwitching(false);
    }
  };

  const isAdmin = profile?.admin_role === 'super_admin' || profile?.admin_role === 'client_admin';
  const canSwitchClients = profile?.can_switch_clients && isAdmin;

  return {
    profile,
    availableClients,
    loading,
    switching,
    isAdmin,
    canSwitchClients,
    switchToClient
  };
};