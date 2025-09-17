import { useState } from 'react';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  Settings,
  Play,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MappedTicket, TicketStatus, TicketPriority, STATUS_LABELS, PRIORITY_LABELS } from '@/types/existingTickets';
import { cn } from '@/lib/utils';

interface TicketListViewProps {
  tickets: MappedTicket[];
  onTicketClick: (ticket: MappedTicket) => void;
  onPlayAudio?: (audioUrl: string) => void;
  loading?: boolean;
}

const getStatusColor = (status: TicketStatus) => {
  const colors: Record<TicketStatus, string> = {
    created: 'bg-blue-100 text-blue-800',
    triaged: 'bg-purple-100 text-purple-800',
    scheduled: 'bg-indigo-100 text-indigo-800',
    assigned: 'bg-yellow-100 text-yellow-800',
    en_route: 'bg-orange-100 text-orange-800',
    on_site: 'bg-cyan-100 text-cyan-800',
    in_progress: 'bg-amber-100 text-amber-800',
    parts_needed: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800',
    invoiced: 'bg-teal-100 text-teal-800',
    closed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-slate-100 text-slate-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getPriorityColor = (priority: TicketPriority) => {
  const colors: Record<TicketPriority, string> = {
    emergency: 'text-red-600 bg-red-50 border-red-200',
    same_day: 'text-orange-600 bg-orange-50 border-orange-200',
    standard: 'text-green-600 bg-green-50 border-green-200',
  };
  return colors[priority] || 'text-gray-600 bg-gray-50 border-gray-200';
};

const getPriorityIcon = (priority: TicketPriority) => {
  if (priority === 'emergency') return AlertTriangle;
  if (priority === 'same_day') return Clock;
  return CheckCircle;
};

export function TicketListView({ tickets, onTicketClick, onPlayAudio, loading }: TicketListViewProps) {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const handlePlayAudio = (audioUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayingAudio(audioUrl);
    onPlayAudio?.(audioUrl);
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: ca });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ca });
  };

  const isOverdue = (ticket: MappedTicket) => {
    if (!ticket.sla_response_due) return false;
    return new Date(ticket.sla_response_due) < new Date() && 
           !['completed', 'closed', 'cancelled'].includes(ticket.status);
  };

  if (loading) {
    return (
      <div className="space-y-4">
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

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">Cap ticket trobat</h3>
        <p className="text-sm text-muted-foreground">
          No hi ha tickets que coincideixin amb els filtres aplicats.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {tickets.map((ticket) => {
          const PriorityIcon = getPriorityIcon(ticket.priority);
          const overdue = isOverdue(ticket);
          
          return (
            <Card 
              key={ticket.id} 
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md",
                overdue && "border-red-200 bg-red-50/50"
              )}
              onClick={() => onTicketClick(ticket)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left section - Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono text-muted-foreground">
                        #{ticket.ticket_number}
                      </span>
                      <Badge className={cn("text-xs", getPriorityColor(ticket.priority))}>
                        <PriorityIcon className="w-3 h-3 mr-1" />
                        {PRIORITY_LABELS[ticket.priority]}
                      </Badge>
                      {overdue && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Endarrerit
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-medium text-foreground mb-1 truncate">
                      {ticket.subject}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="truncate">{ticket.requester_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{ticket.requester_phone}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{ticket.site_address}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(ticket.created_at)}</span>
                        <span>{formatTime(ticket.created_at)}</span>
                      </div>
                      {ticket.assigned_to && (
                        <div className="flex items-center gap-1">
                          <Avatar className="w-4 h-4">
                            <AvatarFallback className="text-xs">T</AvatarFallback>
                          </Avatar>
                          <span>Assignat</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right section - Status and actions */}
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={cn("text-xs whitespace-nowrap", getStatusColor(ticket.status))}>
                      {STATUS_LABELS[ticket.status]}
                    </Badge>
                    
                    <div className="flex items-center gap-1">
                      {ticket.call_recording_url && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => handlePlayAudio(ticket.call_recording_url!, e)}
                            >
                              <Play className={cn(
                                "w-3 h-3",
                                playingAudio === ticket.call_recording_url && "text-primary"
                              )} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reproduir gravació</TooltipContent>
                        </Tooltip>
                      )}
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTicketClick(ticket);
                            }}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Veure detalls</TooltipContent>
                      </Tooltip>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}