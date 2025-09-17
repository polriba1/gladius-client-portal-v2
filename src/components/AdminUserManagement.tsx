import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Shield, Users, Plus } from 'lucide-react';
import { useAdminUsers, type AdminUser } from '@/hooks/useAdminUsers';
import { supabase } from '@/integrations/supabase/client';

type Client = { id: string; nom: string };


function AdminUserManagement() {
  const { users, loading, createUserWithPassword } = useAdminUsers();

  // --- estat del modal ---
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'user' | 'client_admin' | 'super_admin'>('user');
  const [clientId, setClientId] = useState<string>('');
  const [canSwitch, setCanSwitch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Clients per al selector
  const [clients, setClients] = useState<Client[]>([]);
  useEffect(() => {
    supabase.from('clients').select('id, nom').then(({ data }) => setClients(data ?? []));
  }, []);

  const onSubmit = async () => {
    if (!email || !password || !clientId) return;
    
    if (password.length < 8) {
      return; // validation handled in UI
    }
    
    if (password !== confirmPassword) {
      return; // validation handled in UI
    }
    
    setSubmitting(true);
    try {
      await createUserWithPassword({
        email,
        password,
        clientId,
        adminRole: role,
        canSwitchClients: canSwitch,
      });
      // reset i tancar
      setEmail(''); setPassword(''); setConfirmPassword(''); 
      setRole('user'); setClientId(''); setCanSwitch(false);
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'client_admin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const formatRoleName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'client_admin':
        return 'Client Admin';
      default:
        return 'User';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'client_admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">User Management</CardTitle>
            <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create new user</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {password && password.length < 8 && (
                    <p className="text-sm text-red-500">Password must be at least 8 characters</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-sm text-red-500">Passwords do not match</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Base client</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v: string) => setRole(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="client_admin">Client Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Multi-client access</Label>
                  <Switch checked={canSwitch} onCheckedChange={setCanSwitch} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button 
                  onClick={onSubmit} 
                  disabled={
                    submitting || 
                    !email || 
                    !password || 
                    !confirmPassword || 
                    !clientId || 
                    password.length < 8 || 
                    password !== confirmPassword
                  }
                >
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Create User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-3">
                      {getRoleIcon(user.admin_role)}
                      <p className="font-medium">{user.email}</p>
                      <Badge variant={getRoleBadgeVariant(user.admin_role)}>
                        {formatRoleName(user.admin_role)}
                      </Badge>
                      {user.can_switch_clients && (
                        <Badge variant="outline" className="text-xs">
                          Multi-Client Access
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium">Base Client:</span> {user.client_name}
                      </p>
                      {user.active_client_name && user.active_client_name !== user.client_name && (
                        <p>
                          <span className="font-medium">Active Client:</span> {user.active_client_name}
                        </p>
                      )}
                      <p className="text-xs opacity-75">ID: {user.id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
    </div>
  );
}

export default AdminUserManagement;