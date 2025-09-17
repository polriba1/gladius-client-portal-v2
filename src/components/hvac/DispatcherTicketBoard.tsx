import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { 
  Search, 
  Filter, 
  Eye, 
  MoreHorizontal,
  User,
  Phone,
  MapPin,
  Calendar,
  Play,
  AlertTriangle,
  Settings2,
  Wrench
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MappedTicket, TicketStatus, TicketPriority, STATUS_LABELS, PRIORITY_LABELS } from '@/types/existingTickets';
import { cn } from '@/lib/utils';

interface DispatcherTicketBoardProps {
  tickets: MappedTicket[];
  onTicketClick: (ticket: MappedTicket) => void;
  onPlayAudio?: (audioUrl: string) => void;
  loading?: boolean;
}

interface GlobalFilters {
  search: string;
  startDate?: Date;
  endDate?: Date;
  assignmentFilter: 'all' | 'assigned' | 'unassigned';
  slaFilter: 'all' | 'breached' | 'at_risk';
}

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

const categorizeTicket = (ticket: MappedTicket): 'urgent' | 'breakdowns' | 'others' => {
  // Check if urgent by priority
  if (ticket.priority === 'emergency') return 'urgent';
  
  // Check if breakdown by incident type or keywords
  const symptoms = ticket.symptoms?.toLowerCase() || '';
  const description = ticket.description?.toLowerCase() || '';
  const subject = ticket.subject?.toLowerCase() || '';
  
  const breakdownKeywords = ['avaria', 'avería', 'breakdown', 'failure', 'fault', 'fallo', 'reparació', 'reparacion'];
  const isBreakdown = breakdownKeywords.some(keyword => 
    symptoms.includes(keyword) || description.includes(keyword) || subject.includes(keyword)
  );
  
  if (isBreakdown) return 'breakdowns';
  
  return 'others';
};

const TicketCard = ({ 
  ticket, 
  onTicketClick, 
  onPlayAudio 
}: { 
  ticket: MappedTicket; 
  onTicketClick: (ticket: MappedTicket) => void; 
  onPlayAudio?: (audioUrl: string) => void;
}) => {
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM HH:mm', { locale: ca });
  };

  const isOverdue = () => {
    if (!ticket.sla_response_due) return false;
    return new Date(ticket.sla_response_due) < new Date() && 
           !['completed', 'closed', 'cancelled'].includes(ticket.status);
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] mb-3",
        isOverdue() && "border-destructive bg-destructive/5"
      )}
      onClick={() => onTicketClick(ticket)}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">
              #{ticket.ticket_number}
            </span>
            <Badge className={cn("text-xs", getStatusColor(ticket.status))}>
              {STATUS_LABELS[ticket.status]}
            </Badge>
          </div>
          
          {/* Subject */}
          <h4 className="font-medium text-sm leading-tight line-clamp-2">
            {ticket.subject || 'Sense assumpte'}
          </h4>
          
          {/* Client info */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{ticket.requester_name}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span>{ticket.requester_phone}</span>
            </div>
          </div>
          
          {/* Address */}
          {ticket.site_address !== 'Dirección no especificada' && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{ticket.site_address}</span>
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{formatTime(ticket.created_at)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Assignment badge */}
              {ticket.assigned_to ? (
                <Badge variant="secondary" className="text-xs">
                  <Avatar className="w-3 h-3 mr-1">
                    <AvatarFallback className="text-xs">{ticket.assigned_to.charAt(0)}</AvatarFallback>
                  </Avatar>
                  Assignat
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  No assignat
                </Badge>
              )}
              
              {/* Actions */}
              <div className="flex items-center">
                {ticket.call_recording_url && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayAudio?.(ticket.call_recording_url!);
                        }}
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reproduir gravació</TooltipContent>
                  </Tooltip>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onTicketClick(ticket)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Veure detalls
                    </DropdownMenuItem>
                    {ticket.call_recording_url && (
                      <DropdownMenuItem onClick={() => onPlayAudio?.(ticket.call_recording_url!)}>
                        <Play className="w-4 h-4 mr-2" />
                        Reproduir gravació
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function DispatcherTicketBoard({ 
  tickets, 
  onTicketClick, 
  onPlayAudio, 
  loading 
}: DispatcherTicketBoardProps) {
  const [filters, setFilters] = useState<GlobalFilters>({
    search: '',
    assignmentFilter: 'all',
    slaFilter: 'all'
  });

  const filteredAndCategorizedTickets = useMemo(() => {
    // Apply filters
    const filtered = tickets.filter(ticket => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          ticket.requester_name.toLowerCase().includes(searchLower) ||
          ticket.requester_phone.includes(searchLower) ||
          ticket.subject.toLowerCase().includes(searchLower) ||
          ticket.ticket_number.toLowerCase().includes(searchLower) ||
          ticket.site_address.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Date filters
      if (filters.startDate) {
        if (new Date(ticket.created_at) < filters.startDate) return false;
      }
      if (filters.endDate) {
        if (new Date(ticket.created_at) > filters.endDate) return false;
      }

      // Assignment filter
      if (filters.assignmentFilter === 'assigned' && !ticket.assigned_to) return false;
      if (filters.assignmentFilter === 'unassigned' && ticket.assigned_to) return false;

      // SLA filter
      if (filters.slaFilter === 'breached' && !ticket.sla_breached) return false;
      if (filters.slaFilter === 'at_risk') {
        const isAtRisk = ticket.sla_response_due && 
          new Date(ticket.sla_response_due) < new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
        if (!isAtRisk) return false;
      }

      return true;
    });

    // Categorize tickets
    const categorized = {
      urgent: filtered.filter(ticket => categorizeTicket(ticket) === 'urgent'),
      breakdowns: filtered.filter(ticket => categorizeTicket(ticket) === 'breakdowns'),
      others: filtered.filter(ticket => categorizeTicket(ticket) === 'others')
    };

    return categorized;
  }, [tickets, filters]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-20 bg-muted rounded" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cercar per nom, telèfon, adreça, assumpte o número de ticket..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtres
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data inici</label>
                <CalendarComponent
                  mode="single"
                  selected={filters.startDate}
                  onSelect={(date) => setFilters({ ...filters, startDate: date })}
                  className="pointer-events-auto"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Data fi</label>
                <CalendarComponent
                  mode="single"
                  selected={filters.endDate}
                  onSelect={(date) => setFilters({ ...filters, endDate: date })}
                  className="pointer-events-auto"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Assignació</label>
                <Select 
                  value={filters.assignmentFilter} 
                  onValueChange={(value: unknown) => setFilters({ ...filters, assignmentFilter: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tots</SelectItem>
                    <SelectItem value="assigned">Assignats</SelectItem>
                    <SelectItem value="unassigned">No assignats</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Estat SLA</label>
                <Select 
                  value={filters.slaFilter} 
                  onValueChange={(value: unknown) => setFilters({ ...filters, slaFilter: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tots</SelectItem>
                    <SelectItem value="breached">Incomplerts</SelectItem>
                    <SelectItem value="at_risk">En risc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFilters({
                  search: '',
                  assignmentFilter: 'all',
                  slaFilter: 'all'
                })}
                className="w-full"
              >
                Netejar filtres
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-3 gap-4 h-[calc(100vh-16rem)]">
          {/* Urgent Column */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Urgent
                <Badge variant="destructive" className="text-xs">
                  {filteredAndCategorizedTickets.urgent.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto px-3">
              {filteredAndCategorizedTickets.urgent.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <AlertTriangle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  Cap ticket urgent
                </div>
              ) : (
                filteredAndCategorizedTickets.urgent.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onTicketClick={onTicketClick}
                    onPlayAudio={onPlayAudio}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Breakdowns Column */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="h-5 w-5 text-orange-500" />
                Avaries
                <Badge variant="secondary" className="text-xs">
                  {filteredAndCategorizedTickets.breakdowns.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto px-3">
              {filteredAndCategorizedTickets.breakdowns.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <Wrench className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  Cap avaria
                </div>
              ) : (
                filteredAndCategorizedTickets.breakdowns.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onTicketClick={onTicketClick}
                    onPlayAudio={onPlayAudio}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Others Column */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="h-5 w-5 text-blue-500" />
                Altres
                <Badge variant="outline" className="text-xs">
                  {filteredAndCategorizedTickets.others.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto px-3">
              {filteredAndCategorizedTickets.others.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <Settings2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  Cap altre ticket
                </div>
              ) : (
                filteredAndCategorizedTickets.others.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onTicketClick={onTicketClick}
                    onPlayAudio={onPlayAudio}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
