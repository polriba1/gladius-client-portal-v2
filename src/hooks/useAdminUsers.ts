import { devLog } from "@/lib/logger";
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminUser {
  id: string;
  email: string;
  client_name: string;
  admin_role: 'super_admin' | 'client_admin' | 'user';
  can_switch_clients: boolean;
  active_client_id?: string;
  active_client_name?: string;
  client_id: string;
}

interface ApiResponse {
  success?: boolean;
  users?: AdminUser[];
  error?: string;
}

type CreateUserInput = {
  email: string;
  adminRole: 'super_admin' | 'client_admin' | 'user';
  clientId: string;                 // client base assignat
  canSwitchClients?: boolean;
  activeClientId?: string | null;   // opcional: deixar null o = clientId
}

type CreateUserWithPasswordInput = {
  email: string;
  password: string;
  clientId: string;
  adminRole: 'user' | 'client_admin' | 'super_admin';
  canSwitchClients?: boolean; // default false
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      devLog('🔍 Fetching users via edge function...');
      
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('No access token');
      const resp = await fetch('/api/admin-users-list', {
        headers: { Authorization: `Bearer ${token}` }
      });
        const contentType = resp.headers.get('content-type') || '';
        const json = contentType.includes('application/json')
          ? await resp.json().catch(() => ({}))
          : {};

        if (!resp.ok) throw new Error((json as ApiResponse).error || 'Failed to fetch users');

        // If we received a proper JSON array of users, use it
        if (Array.isArray((json as ApiResponse).users)) {
          const arr = (json as ApiResponse).users as AdminUser[];
          devLog(`✅ Fetched ${arr.length} users`);
          setUsers(arr);
          return;
        }

        // Development fallback: if /api returned HTML (Vite dev server) or empty object, call the Supabase function directly
        if (import.meta.env.DEV) {
          try {
            devLog('ℹ️ /api returned no users or non-JSON; trying direct Supabase function fallback');
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
            if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL not configured');
            const direct = await fetch(`${supabaseUrl}/functions/v1/get-users-with-emails`, {
              method: 'GET',
              headers: { Authorization: `Bearer ${token}` },
            });
            const directCT = direct.headers.get('content-type') || '';
            const directJson = directCT.includes('application/json')
              ? await direct.json().catch(() => ({}))
              : {};
            if (!direct.ok) throw new Error((directJson as ApiResponse).error || 'Failed (direct) to fetch users');
            if (Array.isArray((directJson as ApiResponse).users)) {
              const arr = (directJson as ApiResponse).users as AdminUser[];
              devLog(`✅ Fetched ${arr.length} users (direct)`);
              setUsers(arr);
              return;
            }
            devLog('⚠️ Direct Supabase function returned no users');
          } catch (fallbackErr) {
            console.error('Direct function fallback failed:', fallbackErr);
          }
      }

        // If we reach here, we got no users
        devLog('⚠️ No users data received');
        setUsers([]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const updateUserPermissions = async (
    userId: string,
    adminRole: 'super_admin' | 'client_admin' | 'user',
    canSwitchClients: boolean,
    clientId?: string
  ) => {
    try {
      setUpdating(userId);
      devLog('🔄 Updating user permissions');

      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('No access token');
      const resp = await fetch('/api/admin-user-permissions-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, adminRole, canSwitchClients, clientId })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json?.error) throw new Error(json.error || 'Failed to update user');

      devLog('✅ User permissions updated successfully');
      toast.success('User permissions updated successfully');
      
      // Refresh the users list
      await fetchUsers();
      
      return true;
    } catch (error) {
      console.error('Error updating user permissions:', error);
      toast.error('Failed to update user permissions');
      return false;
    } finally {
      setUpdating(null);
    }
  };

  const createUser = async (input: CreateUserInput) => {
    try {
      setLoading(true);
      devLog('🔄 Creating user');
      
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) {
        throw new Error('No access token available');
      }

      const resp = await fetch('/api/admin-user-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.session.access_token}` },
        body: JSON.stringify({
          email: input.email,
            adminRole: input.adminRole,
            clientId: input.clientId,
            canSwitchClients: input.canSwitchClients || false,
            activeClientId: input.activeClientId || input.clientId
        })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success) {
        throw new Error(data?.message || data?.error || 'Failed to create user');
      }

      devLog('✅ User created successfully');
      toast.success('User invited and permissions saved');
      await fetchUsers();
      return data;
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error(`Failed to create user: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createUserWithPassword = async (input: CreateUserWithPasswordInput) => {
    try {
      setLoading(true);
      devLog('🔄 Creating user with password');
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('No access token');
      const resp = await fetch('/api/admin-create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(input),
      });
      const data = await resp.json().catch(() => ({} as Record<string, unknown>));
      if (!resp.ok || !data?.ok) {
        const message = (data && (data.error || data.message)) || 'Failed to create user';
        throw new Error(message);
      }

      devLog('✅ User created successfully');
      toast.success('User created');
      await fetchUsers(); // refresh list
      return data;
    } catch (err: unknown) {
      console.error('Error creating user:', err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    updating,
    fetchUsers,
    updateUserPermissions,
    createUser,
    createUserWithPassword
  };
};
