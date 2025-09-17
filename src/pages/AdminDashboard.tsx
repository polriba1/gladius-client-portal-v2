import { devLog } from "@/lib/log";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminProfile } from '@/hooks/useAdminProfile';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Crown, LogOut, Monitor, UserPlus, Building2, BarChart3 } from "lucide-react";
import AdminUserManagement from "../components/AdminUserManagement";

interface ClientStats {
  id: string;
  nom: string;
  logo_url?: string;
  color_principal?: string;
  user_count: number;
  ticket_count: number;
  call_count: number;
}

export default function AdminDashboard() {
  const { profile, isAdmin, loading, switchToClient } = useAdminProfile();
  const [clientStats, setClientStats] = useState<ClientStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/dashboard');
      return;
    }

    if (isAdmin) {
      fetchClientStats();
    }
  }, [loading, isAdmin, navigate]);

  const fetchClientStats = async () => {
    try {
      // Fetch all clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, nom, logo_url, color_principal')
        .order('nom');

      if (!clients) return;

      // Fetch stats for each client
      const statsPromises = clients.map(async (client) => {
        const nameLc = client.nom.toLowerCase();
        const isTecnics = nameLc.includes('tecnics') || nameLc.includes('bcn');
        const isSalutdental = nameLc.includes('salutdental');

        const callsQuery = isTecnics
          ? supabase.from('call_logs_tecnics_bcn_sat').select('id', { count: 'exact' })
          : supabase.from('call_logs_salutdental').select('id', { count: 'exact' });

        // Build tickets query and exclude "Llamadas No Finalizadas" (and equivalents) from counts
        const excludePatterns = [
          '%llamada colgada%',
          '%llamada no finalizada%',
          '%sin finalizar%',
          '%trucada no finalitzada%',
          '%trucada penjada%',
          '%no finalitzada%'
        ];

        let ticketsQuery = isTecnics
          ? supabase.from('tickets_tecnics_bcn_sat').select('id', { count: 'exact' })
          : isSalutdental
          ? supabase.from('tickets_salutdental').select('id', { count: 'exact' })
          : supabase.from('hvac_tickets').select('id', { count: 'exact' }).eq('client_id', client.id);

        if (isTecnics || isSalutdental) {
          // Apply NOT ILIKE filters to ticket_type
          excludePatterns.forEach((pattern) => {
            ticketsQuery = ticketsQuery.not('ticket_type', 'ilike', pattern);
          });
        }

        const [profilesResult, ticketsResult, callsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('client_id', client.id),
          ticketsQuery,
          callsQuery
        ]);

        return {
          ...client,
          user_count: profilesResult.count || 0,
          ticket_count: ticketsResult.count || 0,
          call_count: callsResult.count || 0
        };
      });

      const stats = await Promise.all(statsPromises);
      setClientStats(stats);
    } catch (error) {
      console.error('Error fetching client stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleClientDashboard = async (client: ClientStats) => {
    if (profile?.id) {
      devLog('🔄 Switching to client');
      
      const success = await switchToClient(client.id);
      
      if (success) {
        toast.success(`Switched to ${client.nom}`, {
          description: 'Refreshing to load client dashboard...'
        });
        // The useAdminProfile hook will handle the page refresh automatically
      } else {
        toast.error('Failed to switch client', {
          description: 'Please try again'
        });
      }
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out');
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Enhanced Header */}
      <header className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                  <Crown className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
                  <p className="text-sm text-muted-foreground">
                    Manage and monitor all client dashboards
                  </p>
                </div>
              </div>
            </div>
            
            {/* Logout Button */}
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-destructive hover:text-destructive-foreground hover:bg-destructive"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">

        {/* Enhanced Admin Info Card */}

        {/* Tabs for different admin functions */}
        <Tabs defaultValue="dashboards" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboards" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Client Dashboards
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              User Management
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboards" className="space-y-6">
            {/* Client Cards Grid */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Monitor className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Client Dashboards</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loadingStats ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader className="space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="h-3 bg-muted rounded"></div>
                          <div className="h-3 bg-muted rounded w-5/6"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  clientStats.map((client) => (
                  <Card key={client.id} className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-border/50 hover:border-primary/50 bg-gradient-to-br from-background to-muted/20">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center group-hover:from-primary/20 group-hover:to-secondary/20 transition-colors">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {client.nom}
                            </CardTitle>
                            <CardDescription className="text-sm">Client Dashboard</CardDescription>
                          </div>
                        </div>
                        <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                      {/* Enhanced Stats */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <div className="text-2xl font-bold text-foreground mb-1">{client.user_count}</div>
                          <div className="text-xs text-muted-foreground font-medium">Users</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-secondary/5 border border-secondary/10">
                          <div className="text-2xl font-bold text-foreground mb-1">{client.ticket_count}</div>
                          <div className="text-xs text-muted-foreground font-medium">Tickets</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-accent/5 border border-accent/10">
                          <div className="text-2xl font-bold text-foreground mb-1">{client.call_count}</div>
                          <div className="text-xs text-muted-foreground font-medium">Calls</div>
                        </div>
                      </div>

                      {/* Enhanced Action Button */}
                      <Button 
                        onClick={() => handleClientDashboard(client)}
                        className="w-full h-12 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg transition-all duration-300 font-medium"
                        variant="outline"
                      >
                        <BarChart3 className="h-5 w-5 mr-2" />
                        Access Dashboard
                      </Button>
                    </CardContent>
                  </Card>
                ))
                )}

                {clientStats.length === 0 && !loadingStats && (
                  <Card className="border-dashed border-2 border-muted-foreground/20 col-span-full">
                    <CardContent className="text-center py-16">
                      <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Building2 className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-3">No Clients Found</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        No client dashboards are available for your admin account. Contact your system administrator to get access to client dashboards.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="users" className="space-y-6">
            <AdminUserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
