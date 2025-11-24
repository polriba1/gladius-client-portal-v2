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
      
      const { data, error } = await supabase.functions.invoke('get-users-with-emails');

      if (error) throw error;

      const json = data as ApiResponse;

      // If we received a proper JSON array of users, use it
      if (Array.isArray(json.users)) {
        const arr = json.users as AdminUser[];
        devLog(`✅ Fetched ${arr.length} users`);
        setUsers(arr);
        return;
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

      const { data, error } = await supabase.functions.invoke('update-user-permissions', {
        body: { userId, adminRole, canSwitchClients, clientId }
      });

      if (error) throw error;

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
      
      const { data, error } = await supabase.functions.invoke('create-user-with-permissions', {
        body: {
          email: input.email,
          adminRole: input.adminRole,
          clientId: input.clientId,
          canSwitchClients: input.canSwitchClients || false,
          activeClientId: input.activeClientId || input.clientId
        }
      });

      if (error) throw error;
      if (!data?.success) {
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
      
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: input
      });

      if (error) throw error;
      if (!data?.ok) {
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
