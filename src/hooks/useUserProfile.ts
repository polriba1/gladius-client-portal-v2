import { useState, useEffect } from 'react';
import { devLog } from "@/lib/log";
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  client_id: string;
  client_name?: string;
  admin_role?: 'super_admin' | 'client_admin' | 'user';
  can_switch_clients?: boolean;
  active_client_id?: string;
  active_client_name?: string;
}

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setProfile(null);
          setLoading(false);
          setIsInitialized(true);
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
          console.error('Error fetching profile:', profileError);
          setProfile(null);
        } else {
          // CRITICAL: For admins, use active_client_id if available, otherwise use base client_id
          const effectiveClientId = profileData.active_client_id || profileData.client_id;
          const effectiveClientName = profileData.active_client?.nom || profileData.clients?.nom;
          
          devLog('🔍 Admin profile loaded', {
            adminRole: profileData.admin_role
          });
          
          setProfile({
            id: profileData.id,
            client_id: effectiveClientId,
            client_name: effectiveClientName,
            admin_role: profileData.admin_role,
            can_switch_clients: profileData.can_switch_clients,
            active_client_id: profileData.active_client_id,
            active_client_name: profileData.active_client?.nom
          });
        }
      } catch (error) {
        console.error('Error in fetchProfile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    fetchProfile();
  }, []);

  return { profile, loading, isInitialized };
};