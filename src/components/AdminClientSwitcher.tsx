import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Building2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminProfile } from '@/hooks/useAdminProfile';
import { toast } from 'sonner';

export function AdminClientSwitcher() {
  const { profile, availableClients, canSwitchClients, switching, switchToClient } = useAdminProfile();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  if (!canSwitchClients) return null;

  const handleClientSwitch = async (clientId: string, clientName: string) => {
    setIsOpen(false);
    
    const success = await switchToClient(clientId);
    
    if (success) {
      toast.success(`Switched to ${clientName}`, {
        description: 'You are now viewing this client\'s dashboard',
      });
      
      // Navigate to appropriate dashboard based on client
      if (clientName.toLowerCase().includes('salutdental')) {
        navigate('/salutdental-dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      toast.error('Failed to switch client', {
        description: 'Please try again or contact support',
      });
    }
  };

  const currentClientName = profile?.active_client_name || profile?.client_name || 'Select Client';

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="min-w-[200px] justify-between bg-background border-border hover:bg-accent hover:text-accent-foreground"
          disabled={switching}
        >
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="font-medium">{currentClientName}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Switch Client Dashboard
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {availableClients.map((client) => (
          <DropdownMenuItem
            key={client.id}
            onClick={() => handleClientSwitch(client.id, client.nom)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{client.nom}</span>
            {(profile?.active_client_id === client.id || 
              (!profile?.active_client_id && profile?.client_id === client.id)) && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        
        {availableClients.length === 0 && (
          <DropdownMenuItem disabled>
            No clients available
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}