import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSalutdentalTickets, SalutdentalTicket } from "@/hooks/useSalutdentalTickets";
import { SalutdentalSingleTabView } from "@/components/hvac/SalutdentalSingleTabView";
import { SimplifiedTicketDetail } from "@/components/hvac/SimplifiedTicketDetail";
import { GlobalTicketControls, GlobalFilters } from "@/components/hvac/GlobalTicketControls";
import { TicketStatus } from "@/types/existingTickets";

// Helper function to map Salutdental simple status to full TicketStatus
const mapToFullStatus = (simpleStatus: 'open' | 'in_progress' | 'closed'): TicketStatus => {
  switch (simpleStatus) {
    case 'open': return 'created';
    case 'in_progress': return 'in_progress';
    case 'closed': return 'completed';
    default: return 'created';
  }
};

// Helper function to map full TicketStatus back to simple status
const mapToSimpleStatus = (fullStatus: TicketStatus): 'open' | 'in_progress' | 'closed' => {
  if (['completed', 'closed', 'cancelled', 'invoiced'].includes(fullStatus)) return 'closed';
  if (['in_progress', 'on_site', 'en_route', 'assigned'].includes(fullStatus)) return 'in_progress';
  return 'open';
};

// Helper function to map Salutdental ticket to the UI ticket format
const mapSalutdentalToUITicket = (ticket: SalutdentalTicket): unknown => ({
  ...ticket,
  status: mapToFullStatus(ticket.status), // Convert to full status
});

const SalutdentalTickets = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<unknown | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 25 });
  
  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>({
    search: '',
    slaFilter: 'all',
    statusFilter: 'all'
  });
  
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const { 
    tickets,
    loading,
    error,
    fetchTickets,
    updateTicketStatus,
    updateTicketNotes
  } = useSalutdentalTickets();

  // Filter tickets based on global filters
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Search filter
      if (globalFilters.search) {
        const searchLower = globalFilters.search.toLowerCase();
        const matchesSearch = 
          ticket.requester_name.toLowerCase().includes(searchLower) ||
          ticket.requester_phone.includes(searchLower) ||
          ticket.subject.toLowerCase().includes(searchLower) ||
          ticket.ticket_number.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Date filters
      if (globalFilters.startDate) {
        const ticketDate = new Date(ticket.created_at);
        const startDate = new Date(globalFilters.startDate);
        startDate.setHours(0, 0, 0, 0);
        
        const ticketDateOnly = new Date(ticketDate.getFullYear(), ticketDate.getMonth(), ticketDate.getDate());
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        
        if (ticketDateOnly < startDateOnly) return false;
      }
      
      if (globalFilters.endDate) {
        const ticketDate = new Date(ticket.created_at);
        const endDate = new Date(globalFilters.endDate);
        endDate.setHours(23, 59, 59, 999);
        
        const ticketDateOnly = new Date(ticketDate.getFullYear(), ticketDate.getMonth(), ticketDate.getDate(), ticketDate.getHours(), ticketDate.getMinutes(), ticketDate.getSeconds(), ticketDate.getMilliseconds());
        const endDateTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
        
        if (ticketDateOnly > endDateTime) return false;
      }

      // Status filter
      if (globalFilters.statusFilter && globalFilters.statusFilter !== 'all') {
        if (globalFilters.statusFilter !== ticket.status) return false;
      }

      return true;
    });
  }, [tickets, globalFilters]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setIsAuthenticated(true);
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      // Fetch all tickets
      fetchTickets({}, { page: 1, limit: 1000 });
    }
  }, [isAuthenticated, fetchTickets]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [globalFilters, pagination.page]);

  const handleTicketClick = useCallback((ticket: SalutdentalTicket) => {
    setSelectedTicket(mapSalutdentalToUITicket(ticket));
    setIsDetailOpen(true);
  }, []);

  const handleSalutdentalStatusChange = useCallback(async (ticketId: string, status: 'open' | 'in_progress' | 'closed') => {
    try {
      await updateTicketStatus(ticketId, status);
      // Update the selected ticket if it matches - convert to full status for UI
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: mapToFullStatus(status) });
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  }, [updateTicketStatus, selectedTicket]);

  const handleStatusChange = useCallback(async (ticketId: string, status: TicketStatus) => {
    try {
      // Convert full status back to simple status for Salutdental
      const simpleStatus = mapToSimpleStatus(status);
      await updateTicketStatus(ticketId, simpleStatus);
      // Update the selected ticket if it matches
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  }, [updateTicketStatus, selectedTicket]);

  const handleNotesChange = useCallback(async (ticketId: string, notes: string) => {
    try {
      await updateTicketNotes(ticketId, notes);
      // Update the selected ticket if it matches
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, public_notes: notes });
      }
    } catch (error) {
      console.error('Error updating ticket notes:', error);
    }
  }, [updateTicketNotes, selectedTicket]);

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
            {t('tickets.title')} - Salutdental
          </h1>
        </div>
      </div>

      {/* Global Controls */}
      <GlobalTicketControls
        filters={globalFilters}
        onFiltersChange={setGlobalFilters}
        pagination={pagination}
        onPaginationChange={setPagination}
        totalCount={filteredTickets.length}
        tickets={tickets}
      />

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {t('tickets.showingTickets', { 
            limit: pagination.limit, 
            filtered: filteredTickets.length, 
            total: tickets.length 
          })}
          {error && (
            <span className="text-destructive ml-2">
              • {t('common.error')}: {error}
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        <SalutdentalSingleTabView
          tickets={filteredTickets}
          onTicketClick={handleTicketClick}
          onStatusChange={handleSalutdentalStatusChange}
          loading={loading}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      </div>

      {/* Simplified Ticket Detail */}
      <SimplifiedTicketDetail
        ticket={selectedTicket}
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTicket(null);
        }}
        onStatusChange={handleStatusChange}
        onNotesChange={handleNotesChange}
      />
    </div>
  );
};

export default SalutdentalTickets;