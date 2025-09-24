import { useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import {
  Clock,
  MapPin,
  Phone,
  User,
  AlertTriangle,
  Calendar,
  Play,
  Eye,
  MoreHorizontal,
  Wrench,
  PhoneCall,
  List as ListIcon
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MappedTicket, TicketStatus, TicketPriority, STATUS_LABELS, PRIORITY_LABELS } from '@/types/existingTickets';
import { cn } from '@/lib/utils';


const getStatusColor = (status: TicketStatus) => {
  const colors: Record<TicketStatus, string> = {
    created: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    triaged: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    scheduled: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',
    assigned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    en_route: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    on_site: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300',
    in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
    parts_needed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    invoiced: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-300',
    closed: 'bg-muted text-muted-foreground',
    cancelled: 'bg-muted text-muted-foreground',
  };
  return colors[status] || 'bg-muted text-muted-foreground';
};

const getPriorityColor = (priority: TicketPriority) => {
  const colors: Record<TicketPriority, string> = {
    emergency: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800',
    same_day: 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800',
    standard: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800',
  };
  return colors[priority] || 'text-muted-foreground bg-muted border-muted';
};

const categorizeTicket = (ticket: MappedTicket): 'urgent' | 'breakdowns' | 'others' | 'unfinished_calls' => {
  // RULE: Only "averia/avería" go to Avaries. Do this check first so nothing overrides it.
  const subject = ticket.subject?.toLowerCase() || '';
  const symptoms = ticket.symptoms?.toLowerCase() || '';
  const originalSymptoms = ticket.symptoms || '';
  
  if (subject.includes('averia') || subject.includes('avería') || symptoms.includes('averia') || symptoms.includes('avería')) {
    return 'breakdowns';
  }

  // Urgent by exact ticket types from Supabase
  if (originalSymptoms === 'anular_cita' || originalSymptoms === 'urgente') {
    return 'urgent';
  }

  // Urgent by subject/symptoms (urgente, urgent, anular, cancelar, etc.)
  if (subject.includes('urgente') || subject.includes('urgent') || 
      subject.includes('anular_cita') || subject.includes('cancelar') ||
      symptoms.includes('urgente') || symptoms.includes('urgent') ||
      symptoms.includes('anular_cita') || symptoms.includes('cancelar')) {
    return 'urgent';
  }

  // Unfinished calls next (but NOT if it's an averia or urgente, handled above)
  if (ticket.call_recording_url && !['completed', 'closed', 'cancelled'].includes(ticket.status)) {
    return 'unfinished_calls';
  }

  // Explicit unfinished call subjects
  const description = ticket.description?.toLowerCase() || '';
  if (subject.includes('llamada') && (subject.includes('colgada') || subject.includes('sin finalizar') || subject.includes('no finalizada'))) {
    return 'unfinished_calls';
  }

  // Urgent (only if not averia/unfinished)
  if (ticket.priority === 'emergency') {
    return 'urgent';
  }

  return 'others';
};

const getSimpleStatus = (status: TicketStatus): 'open' | 'in_progress' | 'closed' => {
  if (['completed', 'closed', 'cancelled', 'invoiced'].includes(status)) return 'closed';
  if (['in_progress', 'on_site', 'en_route'].includes(status)) return 'in_progress';
  return 'open';
};

const getStatusDotColor = (status: TicketStatus): string => {
  const simpleStatus = getSimpleStatus(status);
  switch (simpleStatus) {
    case 'open': return 'bg-blue-500';
    case 'in_progress': return 'bg-amber-500';
    case 'closed': return 'bg-green-500';
  }
};

const getAssigneeInitials = (assignedTo?: string): string => {
  if (!assignedTo) return '';
  return assignedTo
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

interface TicketRowProps {
  ticket: MappedTicket;
  onTicketClick: (ticket: MappedTicket) => void;
  onPlayAudio?: (audioUrl: string) => void;
  onStatusChange?: (ticketId: string, status: TicketStatus) => void;
}

const TicketRow = ({ 
  ticket, 
  onTicketClick, 
  onPlayAudio,
  onStatusChange 
}: TicketRowProps) => {
  const { t } = useLanguage();
  const formatDateTime = (dateString: string) => {
    // Using timestamp data (now in created_at field from mapping)
    return format(new Date(dateString), 'dd/MM HH:mm', { locale: ca });
  };

  const handleStatusChange = (newStatus: TicketStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    onStatusChange?.(ticket.id, newStatus);
  };

  const isUrgent = ticket.priority === 'emergency';
  const isOpen = getSimpleStatus(ticket.status) === 'open';
  const isUrgentAndOpen = isUrgent && isOpen;
  
  return (
    <div 
      className={cn(
        "flex items-center gap-4 p-4 border-b border-muted/40 hover:bg-muted/30 cursor-pointer transition-colors",
        // Only urgent + open tickets get full red row highlighting
        isUrgentAndOpen && "bg-red-100 border-red-300 dark:bg-red-950/30 dark:border-red-700 ring-2 ring-red-200 dark:ring-red-800/50"
      )}
      onClick={() => onTicketClick(ticket)}
    >
      {/* Ticket ID */}
      <div className="w-20 text-center text-sm font-mono text-muted-foreground">
        #{ticket.id}
      </div>
      
      {/* Created Date */}
      <div className="w-32 text-center text-xs text-muted-foreground">
        {formatDateTime(ticket.created_at)}
      </div>
      
      {/* Client Name/Phone */}
      <div className="flex-1 px-3 min-w-0">
        <div className="text-sm font-medium truncate">{ticket.requester_name}</div>
        <div className="text-xs text-muted-foreground truncate">{ticket.requester_phone}</div>
      </div>
      
      {/* Subject + Urgent Badge */}
      <div className="flex-1 px-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getStatusDotColor(ticket.status))} />
          <span className="text-sm font-medium truncate">
            {ticket.subject}
          </span>
          {isUrgent && (
            <Badge variant="destructive" className="text-xs px-1 py-0 flex-shrink-0">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {t('tickets.urgent')}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Status Dropdown */}
      <div className="w-32 flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-7 px-2 text-xs font-medium border min-w-0 w-full",
                getSimpleStatus(ticket.status) === 'open' && "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800",
                getSimpleStatus(ticket.status) === 'closed' && "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800",
                getSimpleStatus(ticket.status) === 'in_progress' && "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="truncate">
                {getSimpleStatus(ticket.status) === 'open' && t('ticketStatus.open')}
                {getSimpleStatus(ticket.status) === 'in_progress' && t('ticketStatus.inProgress')}
                {getSimpleStatus(ticket.status) === 'closed' && t('ticketStatus.closed')}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={(e) => handleStatusChange('created', e)}>
              {t('ticketStatus.open')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleStatusChange('in_progress', e)}>
              {t('ticketStatus.inProgress')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleStatusChange('completed', e)}>
              {t('ticketStatus.closed')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Assigned Person */}
      <div className="w-32 flex items-center justify-center gap-2">
        {ticket.assigned_to ? (
          <div className="flex items-center gap-1 min-w-0">
            <Avatar className="w-5 h-5 flex-shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getAssigneeInitials(ticket.assigned_to)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs truncate">{ticket.assigned_to.split(' ')[0]}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{t('tickets.unassigned')}</span>
        )}
      </div>
    </div>
  );
};

interface TicketListProps {
  tickets: MappedTicket[];
  onTicketClick: (ticket: MappedTicket) => void;
  onPlayAudio?: (audioUrl: string) => void;
  onStatusChange?: (ticketId: string, status: TicketStatus) => void;
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyMessage: string;
}

const TicketList = ({ 
  tickets, 
  onTicketClick, 
  onPlayAudio,
  onStatusChange, 
  emptyIcon: EmptyIcon, 
  emptyMessage 
}: TicketListProps) => {
  const { t } = useLanguage();
  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <EmptyIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">{emptyMessage}</h3>
        <p className="text-sm text-muted-foreground">
          {t('tickets.filters.noTicketsMatch')}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-muted rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 border-b border-muted font-medium text-sm text-muted-foreground">
        <div className="w-20 text-center">ID</div>
        <div className="w-32 text-center">{t('tickets.filters.date')}</div>
        <div className="flex-1 px-3">{t('tickets.client')}</div>
        <div className="flex-1 px-3">{t('tickets.subject')}</div>
        <div className="w-32 text-center">{t('tickets.status')}</div>
        <div className="w-32 text-center">{t('tickets.assignedTo')}</div>
      </div>
      
      {/* Rows */}
      <div>
        {tickets.map((ticket) => (
          <TicketRow
            key={ticket.id}
            ticket={ticket}
            onTicketClick={onTicketClick}
            onPlayAudio={onPlayAudio}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  );
};

interface TabbedListViewProps {
  tickets: MappedTicket[];
  onTicketClick: (ticket: MappedTicket) => void;
  onPlayAudio?: (audioUrl: string) => void;
  onStatusChange?: (ticketId: string, status: TicketStatus) => void;
  loading?: boolean;
  pagination: { page: number; limit: number };
  onPaginationChange: (pagination: { page: number; limit: number }) => void;
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  onCurrentTotalChange: (total: number) => void;
}

export function TabbedListView({ 
  tickets, 
  onTicketClick, 
  onPlayAudio,
  onStatusChange, 
  loading = false,
  pagination,
  onPaginationChange,
  activeTab,
  onActiveTabChange,
  onCurrentTotalChange
}: TabbedListViewProps) {
  const { t } = useLanguage();

  // Categorize tickets WITHOUT pagination (pagination is handled by parent)
  const categorizedTickets = useMemo(() => {
    const categories = {
      all: [] as MappedTicket[],
      urgent: [] as MappedTicket[],
      breakdowns: [] as MappedTicket[],
      others: [] as MappedTicket[],
      unfinished_calls: [] as MappedTicket[],
    };

    tickets.forEach(ticket => {
      const category = categorizeTicket(ticket);
      categories.all.push(ticket);
      categories[category].push(ticket);
    });

    // Count only Open urgent tickets for the red badge
    const openUrgentCount = categories.urgent.filter(ticket => 
      getSimpleStatus(ticket.status) !== 'closed'
    ).length;

    return {
      all: {
        tickets: categories.all,
        total: categories.all.length
      },
      urgent: {
        tickets: categories.urgent,
        total: categories.urgent.length,
        openCount: openUrgentCount
      },
      breakdowns: {
        tickets: categories.breakdowns,
        total: categories.breakdowns.length
      },
      others: {
        tickets: categories.others,
        total: categories.others.length
      },
      unfinished_calls: {
        tickets: categories.unfinished_calls,
        total: categories.unfinished_calls.length
      }
    };
  }, [tickets]);

  // Apply pagination to the current active tab's tickets
  const paginatedTickets = useMemo(() => {
    const categoryData = categorizedTickets[activeTab];
    if (!categoryData) return { tickets: [], total: 0 };

    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    
    return {
      tickets: categoryData.tickets.slice(startIndex, endIndex),
      total: categoryData.total
    };
  }, [categorizedTickets, activeTab, pagination]);

  // Notify parent of active tab and current total changes
  useEffect(() => {
    onCurrentTotalChange(categorizedTickets[activeTab]?.total || 0);
  }, [activeTab, categorizedTickets, onCurrentTotalChange]);

  // Get the open urgent count from the categorized data
  const openUrgentCount = categorizedTickets.urgent?.openCount || 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-muted rounded animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-8 w-20 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={onActiveTabChange} className="space-y-4">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="all" className="flex items-center gap-2">
          <ListIcon className="h-4 w-4" />
          {t('kanban.all')}
        </TabsTrigger>
        <TabsTrigger value="urgent" className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {t('kanban.urgent')}
          {openUrgentCount > 0 && (
            <Badge variant="destructive" className="text-xs min-w-[1.5rem] h-5 rounded-full bg-red-500 text-white">
              {openUrgentCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="breakdowns" className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          {t('kanban.breakdowns')}
        </TabsTrigger>
        <TabsTrigger value="others" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {t('kanban.others')}
        </TabsTrigger>
        <TabsTrigger value="unfinished_calls" className="flex items-center gap-2">
          <PhoneCall className="h-4 w-4" />
          {t('kanban.unfinishedCalls')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="space-y-0">
        <TicketList
          tickets={paginatedTickets.tickets}
          onTicketClick={onTicketClick}
          onPlayAudio={onPlayAudio}
          onStatusChange={onStatusChange}
          emptyIcon={ListIcon}
          emptyMessage={t('tickets.filters.noTicketsFound')}
        />
      </TabsContent>

      <TabsContent value="urgent" className="space-y-0">
        <TicketList
          tickets={paginatedTickets.tickets}
          onTicketClick={onTicketClick}
          onPlayAudio={onPlayAudio}
          onStatusChange={onStatusChange}
          emptyIcon={AlertTriangle}
          emptyMessage={t('tickets.filters.noUrgentTickets')}
        />
      </TabsContent>

      <TabsContent value="breakdowns" className="space-y-0">
        <TicketList
          tickets={paginatedTickets.tickets}
          onTicketClick={onTicketClick}
          onPlayAudio={onPlayAudio}
          onStatusChange={onStatusChange}
          emptyIcon={Wrench}
          emptyMessage={t('tickets.filters.noBreakdowns')}
        />
      </TabsContent>

      <TabsContent value="others" className="space-y-0">
        <TicketList
          tickets={paginatedTickets.tickets}
          onTicketClick={onTicketClick}
          onPlayAudio={onPlayAudio}
          onStatusChange={onStatusChange}
          emptyIcon={Clock}
          emptyMessage={t('tickets.filters.noOtherTickets')}
        />
      </TabsContent>

      <TabsContent value="unfinished_calls" className="space-y-0">
        <TicketList
          tickets={paginatedTickets.tickets}
          onTicketClick={onTicketClick}
          onPlayAudio={onPlayAudio}
          onStatusChange={onStatusChange}
          emptyIcon={PhoneCall}
          emptyMessage={t('tickets.filters.noPendingCalls')}
        />
      </TabsContent>
    </Tabs>
  );
}
