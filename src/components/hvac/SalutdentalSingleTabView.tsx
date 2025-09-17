import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Phone, 
  User, 
  MapPin, 
  AlertCircle,
  Play,
  ChevronRight
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SalutdentalTicket } from "@/hooks/useSalutdentalTickets";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ca, es } from "date-fns/locale";

interface SalutdentalSingleTabViewProps {
  tickets: SalutdentalTicket[];
  onTicketClick: (ticket: SalutdentalTicket) => void;
  onPlayAudio?: (audioUrl: string) => void;
  onStatusChange: (ticketId: string, status: 'open' | 'in_progress' | 'closed') => void;
  loading: boolean;
  pagination: { page: number; limit: number };
  onPaginationChange: (pagination: { page: number; limit: number }) => void;
}

export const SalutdentalSingleTabView = ({
  tickets,
  onTicketClick,
  onPlayAudio,
  onStatusChange,
  loading,
  pagination,
  onPaginationChange
}: SalutdentalSingleTabViewProps) => {
  const { t, language } = useLanguage();
  const locale = language === 'ca' ? ca : es;

  // Paginate tickets
  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = startIndex + pagination.limit;
  const paginatedTickets = tickets.slice(startIndex, endIndex);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'open': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'standard': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'closed': return 'Tancat';
      case 'in_progress': return 'En curs';
      case 'open': return 'Obert';
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return t('tickets.priority.urgent');
      case 'high': return t('tickets.priority.high');  
      case 'standard': return t('tickets.priority.standard');
      case 'low': return t('tickets.priority.low');
      default: return priority;
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-primary/20">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card className="bg-gradient-card border-primary/20 shadow-lg">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t('tickets.noTicketsFound')}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t('tickets.noTicketsDescription')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card border-primary/20 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Tickets
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} total
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              {tickets.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {paginatedTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 hover:bg-muted/20 transition-all duration-200 cursor-pointer group relative border-l-4 border-l-transparent hover:border-l-primary/50"
                onClick={() => onTicketClick(ticket)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header with ID, Number and Badges */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                            #{ticket.id}
                          </span>
                          <span className="font-mono text-sm text-foreground font-semibold">
                            {ticket.ticket_number}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={cn("text-xs font-medium px-2.5 py-1", getStatusColor(ticket.status))}>
                            {getStatusText(ticket.status)}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Subject */}
                    <h4 className="font-semibold text-foreground text-base mb-3 line-clamp-1">
                      {ticket.subject}
                    </h4>
                    
                    {/* Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{ticket.requester_name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">Client</p>
                            {ticket.user_status && (
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "text-xs px-2 py-0.5",
                                  ticket.user_status === 'true' || ticket.user_status.toLowerCase() === 'client' 
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                                )}
                              >
                                {ticket.user_status === 'true' || ticket.user_status.toLowerCase() === 'client' ? 'Client existent' : 'Client nou'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {ticket.requester_phone && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Phone className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-mono font-medium text-foreground truncate">{ticket.requester_phone}</p>
                            <p className="text-xs text-muted-foreground">Telèfon</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {format(parseISO(ticket.created_at), "dd/MM/yyyy", { locale })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(ticket.created_at), "HH:mm", { locale })}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Description */}
                    {ticket.description && (
                      <div className="bg-muted/30 rounded-lg p-3 mb-3">
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {ticket.description}
                        </p>
                      </div>
                    )}

                    {/* Audio Control */}
                    {ticket.call_recording_url && onPlayAudio && (
                      <div className="flex justify-start">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayAudio(ticket.call_recording_url!);
                          }}
                          className="text-primary hover:text-primary-foreground hover:bg-primary border-primary/30 h-8 px-3 text-xs"
                        >
                          <Play className="w-3 h-3 mr-1.5" />
                          {t('tickets.playRecording')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {tickets.length > pagination.limit && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t('tickets.showingTickets', {
              start: startIndex + 1,
              end: Math.min(endIndex, tickets.length),
              total: tickets.length
            })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPaginationChange({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
            >
              {t('common.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPaginationChange({ ...pagination, page: pagination.page + 1 })}
              disabled={endIndex >= tickets.length}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};