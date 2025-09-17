import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useExistingTickets } from "@/hooks/useExistingTickets";
import { MappedTicket, TicketStatus } from "@/types/existingTickets";
import { TabbedListView } from "@/components/hvac/TabbedListView";
import { SimplifiedTicketDetail } from "@/components/hvac/SimplifiedTicketDetail";
import { GlobalTicketControls, GlobalFilters } from "@/components/hvac/GlobalTicketControls";

// Helper function to get simple status from detailed status
const getSimpleStatus = (status: TicketStatus): 'open' | 'in_progress' | 'closed' => {
  if (['completed', 'closed', 'cancelled', 'invoiced'].includes(status)) return 'closed';
  if (['in_progress', 'on_site', 'en_route'].includes(status)) return 'in_progress';
  return 'open';
};

// Component for the new HVAC Ticketing System

const Tickets = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MappedTicket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 25 });
  
  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>({
    search: '',
    slaFilter: 'all',
    statusFilter: 'all',
    assignedFilter: 'all'
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const { 
    tickets,
    loading,
    error,
    fetchTickets,
    updateTicketStatus,
    updateTicketAssignee,
    updateTicketNotes
  } = useExistingTickets();

  // Filter tickets first, then let TabbedListView handle its own categorization and pagination
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Search filter
      if (globalFilters.search) {
        const searchLower = globalFilters.search.toLowerCase();
        const matchesSearch = 
          ticket.requester_name.toLowerCase().includes(searchLower) ||
          ticket.requester_phone.includes(searchLower) ||
          ticket.subject.toLowerCase().includes(searchLower) ||
          ticket.ticket_number.toLowerCase().includes(searchLower) ||
          ticket.site_address.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Date filters - using timestamp field for accurate filtering
      if (globalFilters.startDate) {
        // Use timestamp field instead of created_at
        const ticketTimestamp = ticket.created_at; // This now contains timestamp data from mapping
        const ticketDate = new Date(ticketTimestamp);
        const startDate = new Date(globalFilters.startDate);
        startDate.setHours(0, 0, 0, 0);
        
        // Convert to same timezone for comparison
        const ticketDateOnly = new Date(ticketDate.getFullYear(), ticketDate.getMonth(), ticketDate.getDate());
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        
        if (ticketDateOnly < startDateOnly) return false;
      }
      
      if (globalFilters.endDate) {
        // Use timestamp field instead of created_at  
        const ticketTimestamp = ticket.created_at; // This now contains timestamp data from mapping
        const ticketDate = new Date(ticketTimestamp);
        const endDate = new Date(globalFilters.endDate);
        
        // Set end date to end of day (23:59:59.999)
        endDate.setHours(23, 59, 59, 999);
        
        // Convert to same timezone for comparison
        const ticketDateOnly = new Date(ticketDate.getFullYear(), ticketDate.getMonth(), ticketDate.getDate(), ticketDate.getHours(), ticketDate.getMinutes(), ticketDate.getSeconds(), ticketDate.getMilliseconds());
        const endDateTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
        
        if (ticketDateOnly > endDateTime) return false;
      }

      // Status filter - Map to simplified statuses
      if (globalFilters.statusFilter && globalFilters.statusFilter !== 'all') {
        const ticketSimpleStatus = getSimpleStatus(ticket.status);
        if (globalFilters.statusFilter !== ticketSimpleStatus) return false;
      }

      // Assigned filter
      if (globalFilters.assignedFilter && globalFilters.assignedFilter !== 'all') {
        if (globalFilters.assignedFilter === 'unassigned') {
          if (ticket.assigned_to && ticket.assigned_to.trim() !== '') return false;
        } else {
          if (ticket.assigned_to !== globalFilters.assignedFilter) return false;
        }
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
      // Fetch all tickets - we'll handle pagination client-side for now since we have filters
      fetchTickets({}, { page: 1, limit: 1000 });
    }
  }, [isAuthenticated, fetchTickets]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [globalFilters, pagination.page]); // Reset page when unknown filter changes

  const handleTicketClick = useCallback((ticket: MappedTicket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
  }, []);

  const handleStatusChange = useCallback(async (ticketId: string, status: TicketStatus) => {
    try {
      await updateTicketStatus(ticketId, status);
      // Update the selected ticket if it matches
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  }, [updateTicketStatus, selectedTicket]);

  const handleAssigneeChange = useCallback(async (ticketId: string, assignee: string | null) => {
    try {
      await updateTicketAssignee(ticketId, assignee);
      // Update the selected ticket if it matches
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, assigned_to: assignee || undefined });
      }
    } catch (error) {
      console.error('Error updating ticket assignee:', error);
    }
  }, [updateTicketAssignee, selectedTicket]);

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

  const handlePlayAudio = useCallback((audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch((error) => {
      console.error('Error playing audio:', error);
      toast({
        title: t('common.error'),
        description: t('tickets.audioPlayError'),
        variant: "destructive",
      });
    });
  }, [toast, t]);

  

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('tickets.title')}</h1>
          <p className="text-muted-foreground">
            {t('tickets.subtitle')}
          </p>
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
        <TabbedListView
          tickets={filteredTickets}
          onTicketClick={handleTicketClick}
          onPlayAudio={handlePlayAudio}
          onStatusChange={handleStatusChange}
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
        onAssigneeChange={handleAssigneeChange}
        onNotesChange={handleNotesChange}
      />
    </div>
  );
};

export default Tickets;