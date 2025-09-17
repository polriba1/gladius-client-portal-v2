import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUrgentTickets } from '@/hooks/useUrgentTickets';
import { useUserProfile } from '@/hooks/useUserProfile';

export const UrgentTicketNotification = () => {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { urgentTicketCount } = useUrgentTickets();

  if (urgentTicketCount === 0) return null;

  const handleClick = () => {
    // Navigate to appropriate tickets page based on client
    if (profile?.client_name === 'Salutdental') {
      navigate('/salutdental-tickets');
    } else if (profile?.client_name?.toLowerCase().includes('tecnics') || profile?.client_name?.toLowerCase().includes('bcn')) {
      navigate('/tickets');
      // Set URL params to show urgent tickets
      setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('priority', 'emergency');
        window.history.replaceState(null, '', `${window.location.pathname}?${urlParams.toString()}`);
      }, 100);
    }
  };

  return (
    <div className="bg-red-50 border-b border-red-200 px-6 py-3 cursor-pointer hover:bg-red-100 transition-colors" onClick={handleClick}>
      <div className="flex items-center gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse flex-shrink-0" />
          <span className="font-semibold text-red-800">
            {urgentTicketCount} ticket{urgentTicketCount !== 1 ? 's' : ''} urgent{urgentTicketCount !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="text-sm text-red-700 hidden sm:block">
          Feu clic per veure tots els tickets urgents
        </span>
        <div className="ml-auto">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};