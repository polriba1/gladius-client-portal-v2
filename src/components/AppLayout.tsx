import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { UrgentTicketNotification } from "@/components/UrgentTicketNotification";
import { AdminClientSwitcher } from "@/components/AdminClientSwitcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RealtimeIndicator } from "@/components/RealtimeIndicator";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useMemo } from "react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, loading: profileLoading, isInitialized } = useUserProfile();
  const { canSwitchClients, isAdmin } = useAdminProfile();
  const { notifications } = useRealtimeNotifications();
  const navigate = useNavigate();

  const handleBackToAdmin = () => {
    navigate('/admin');
  };
  
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <div className="w-60 flex-shrink-0"></div> {/* Spacer for fixed sidebar */}
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <UrgentTicketNotification />
          <AppLayoutHeader 
            clientName={profile?.client_name} 
            showAdminSwitcher={canSwitchClients}
            isAdmin={isAdmin}
            onBackToAdmin={handleBackToAdmin}
            loading={profileLoading}
            isInitialized={isInitialized}
          />

          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

interface AppLayoutHeaderProps {
  clientName?: string;
  showAdminSwitcher?: boolean;
  isAdmin?: boolean;
  onBackToAdmin?: () => void;
  loading?: boolean;
  isInitialized?: boolean;
}

function AppLayoutHeader({ clientName, showAdminSwitcher, isAdmin, onBackToAdmin, loading, isInitialized }: AppLayoutHeaderProps) {
  const headerTitle = useMemo(() => {
    if (!isInitialized || loading) {
      return null; // Show skeleton while loading
    }
    if (clientName?.toLowerCase().includes('salutdental')) {
      return 'Salutdental';
    }
    return 'TecnicsBCN SAT';
  }, [clientName, loading, isInitialized]);

  return (
    <header className="h-16 flex items-center justify-between border-b bg-background px-6 shadow-sm">
      <div className="flex items-center gap-4">
        {headerTitle ? (
          <h1 className="text-xl font-bold text-slate-800 animate-fade-in">{headerTitle}</h1>
        ) : (
          <Skeleton className="h-7 w-64 animate-pulse" />
        )}
      </div>
      <div className="flex items-center gap-4">
        <RealtimeIndicator />
        {isAdmin && onBackToAdmin && (
          <Button variant="outline" size="sm" onClick={onBackToAdmin} className="gap-2">
            <Crown className="h-4 w-4" />
            Back to Admin
          </Button>
        )}
        {showAdminSwitcher && <AdminClientSwitcher />}
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span>Sistema operatiu</span>
        </div>
      </div>
    </header>
  );
}