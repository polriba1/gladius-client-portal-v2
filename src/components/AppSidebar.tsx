import { Home, Phone, Ticket, Languages, LogOut, Shield, AlertTriangle, CheckCircle, BarChart3 } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { useUrgentTickets } from "@/hooks/useUrgentTickets";
import { useUserProfile } from "@/hooks/useUserProfile";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { profile } = useUserProfile();
  
  // Check if user is admin but also if they're in a client context
  const isAdmin = profile?.admin_role === 'super_admin' || profile?.admin_role === 'client_admin';
  const isInClientContext = !!profile?.active_client_id; // Admin has switched to a client
  
  // Only use urgent tickets for TecnicsBCN, not for Salutdental
  const isSalutdental = profile?.client_name?.toLowerCase().includes('salutdental') ||
                       profile?.active_client_name?.toLowerCase().includes('salutdental');
  const { urgentTicketCount } = useUrgentTickets();
  const effectiveUrgentCount = isSalutdental ? 0 : urgentTicketCount;

  // Show regular user interface when admin is in client context
  const showAdminSidebar = isAdmin && !isInClientContext;

  // Different navigation items based on client and admin status
  const reportsNavItem = {
    title: t('sidebar.reports'),
    url: "/informes-estadisticas",
    icon: BarChart3,
    description: t('sidebar.reportsDescription')
  };

  const mainItems = showAdminSidebar 
    ? [{ title: "Admin Dashboard", url: "/admin-dashboard", icon: Shield, description: "Control Panel" }]
    : isSalutdental 
    ? [
        { title: t('header.dashboard'), url: "/salutdental-dashboard", icon: Home, description: t('dashboard.title') },
        reportsNavItem
      ]
    : [
        { title: t('header.dashboard'), url: "/dashboard", icon: Home, description: t('dashboard.title') },
        reportsNavItem
      ];

  const managementItems = showAdminSidebar 
    ? [] // Admin users don't need management items in sidebar, they have admin dashboard
    : isSalutdental
    ? [
        { title: t('header.calls'), url: "/salutdental-calls", icon: Phone, description: t('header.calls') },
        { title: t('header.tickets'), url: "/salutdental-tickets", icon: Ticket, description: t('tickets.title') },
      ]
    : [
        { title: t('header.calls'), url: "/registre-trucades", icon: Phone, description: t('header.calls') },
        { title: t('header.tickets'), url: "/tickets", icon: Ticket, description: t('tickets.title') },
      ];

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };

    getCurrentUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUrgentClick = () => {
    if (isSalutdental) return; // No urgent tickets for Salutdental
    
    navigate('/tickets');
    setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('priority', 'emergency');
      window.history.replaceState(null, '', `${window.location.pathname}?${urlParams.toString()}`);
    }, 100);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: t('common.success'),
        description: t('header.logout')
      });
      navigate('/');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      toast({
        title: t('common.error'),
        description: message,
        variant: "destructive"
      });
    }
  };

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar
      className="border-r border-border bg-white w-60 h-screen flex flex-col fixed left-0 top-0 z-40"
      collapsible="none"
    >
      {/* Header Logo Section */}
      <SidebarHeader className="p-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-bold text-lg">G</span>
          </div>
           <div className="flex flex-col min-w-0">
             <h1 className="text-lg font-bold text-slate-800 truncate">
               GladiusAI
             </h1>
              <p className="text-xs text-slate-600 truncate">
                {showAdminSidebar ? 'Super Admin Panel' : 'Sistema de gestión'}
              </p>
           </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 bg-white flex-1 overflow-y-auto flex flex-col">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 px-2">
            {t('sidebar.main')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11 rounded-lg transition-all duration-200">
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 w-full ${
                          isActive 
                            ? "bg-slate-800 text-white font-medium" 
                            : "text-slate-800 hover:bg-slate-100"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 shrink-0 text-slate-700" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate text-slate-800">{item.title}</span>
                        <span className="text-xs truncate text-slate-600">{item.description}</span>
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4 bg-slate-300" />

        {/* Management Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 px-2 flex items-center gap-2">
            <Shield className="h-3 w-3 text-slate-600" />
            {t('sidebar.management')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11 rounded-lg transition-all duration-200">
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 w-full ${
                          isActive 
                            ? "bg-slate-800 text-white font-medium" 
                            : "text-slate-800 hover:bg-slate-100"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 shrink-0 text-slate-700" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate text-slate-800">{item.title}</span>
                        <span className="text-xs truncate text-slate-600">{item.description}</span>
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


      </SidebarContent>

      {/* Footer Section */}
      <SidebarFooter className="p-3 border-t border-slate-300 bg-white flex-shrink-0">
        <SidebarMenu className="space-y-2">
          {/* Language Selector */}
          <SidebarMenuItem>
            <div className="w-full">
              <Select value={language} onValueChange={(value: 'ca' | 'es') => setLanguage(value)}>
                <SelectTrigger className="w-full h-11 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <Languages className="h-5 w-5 shrink-0 text-slate-700" />
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-sm font-medium text-slate-800 truncate">{t('sidebar.language')}</span>
                      <span className="text-xs text-slate-600 truncate">
                        <SelectValue />
                      </span>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-lg border-slate-200">
                  <SelectItem value="ca" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <span>🇪🇸</span>
                      <span>Català</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="es" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <span>🇪🇸</span>
                      <span>Español</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SidebarMenuItem>
          
          {/* User Profile Section */}
          <SidebarMenuItem>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-100 border border-slate-300">
              <Avatar className="h-8 w-8 border border-slate-400 flex-shrink-0">
                <AvatarFallback className="bg-slate-300 text-slate-800 text-sm font-semibold">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
               <div className="flex flex-col flex-1 min-w-0">
                 <span className="text-sm font-medium truncate text-slate-800">
                   {userEmail || t('sidebar.user')}
                 </span>
                  <span className="text-xs text-slate-600 truncate">
                    {showAdminSidebar && profile?.admin_role === 'super_admin' ? 'Super Administrator' : 
                     showAdminSidebar && profile?.admin_role === 'client_admin' ? 'Client Administrator' : 
                     t('sidebar.systemActive')}
                  </span>
               </div>
            </div>
          </SidebarMenuItem>
          
          {/* Logout Button */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-11 rounded-lg bg-red-50 hover:bg-red-500 hover:text-white transition-all duration-200 border border-red-300 hover:border-red-500">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start gap-3 h-11 px-3 text-red-700 hover:text-white"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                 <div className="flex flex-col items-start min-w-0">
                   <span className="font-medium text-sm truncate text-red-700">{t('sidebar.logout')}</span>
                   <span className="text-xs truncate text-red-600">{t('sidebar.closeSession')}</span>
                 </div>
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}


