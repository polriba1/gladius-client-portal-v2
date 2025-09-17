import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { 
  AlertTriangle,
  Wrench,
  Clock,
  PhoneCall,
  User,
  Phone,
  MapPin,
  Calendar,
  Play,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MappedTicket, TicketStatus, STATUS_LABELS } from '@/types/existingTickets';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface EnhancedKanbanViewProps {
  tickets: MappedTicket[];
  onTicketClick: (ticket: MappedTicket) => void;
  onPlayAudio?: (audioUrl: string) => void;
  onCategoryChange?: (ticketId: string, newCategory: 'urgent' | 'breakdowns' | 'others' | 'unfinished_calls') => void;
  loading?: boolean;
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

const categorizeTicket = (ticket: MappedTicket): 'urgent' | 'breakdowns' | 'others' | 'unfinished_calls' => {
  // Check if urgent by priority
  if (ticket.priority === 'emergency') return 'urgent';
  
  // Check if it's an unfinished call (has call_recording_url but no resolution)
  if (ticket.call_recording_url && !['completed', 'closed', 'cancelled'].includes(ticket.status)) {
    return 'unfinished_calls';
  }
  
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

interface DraggableTicketCardProps {
  ticket: MappedTicket;
  onTicketClick: (ticket: MappedTicket) => void;
  onPlayAudio?: (audioUrl: string) => void;
}

function DraggableTicketCard({ ticket, onTicketClick, onPlayAudio }: DraggableTicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab transition-all duration-200 hover:shadow-md mb-3",
        isDragging && "opacity-50 rotate-2 shadow-lg cursor-grabbing",
        isOverdue() && "border-destructive bg-destructive/5"
      )}
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
              
              {/* Actions - stop drag propagation */}
              <div className="flex items-center" onPointerDown={(e) => e.stopPropagation()}>
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
}

interface DroppableColumnProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tickets: MappedTicket[];
  onTicketClick: (ticket: MappedTicket) => void;
  onPlayAudio?: (audioUrl: string) => void;
  badgeVariant?: 'default' | 'destructive' | 'secondary' | 'outline';
}

function DroppableColumn({ 
  id, 
  title, 
  icon: Icon, 
  tickets, 
  onTicketClick, 
  onPlayAudio,
  badgeVariant = 'secondary'
}: DroppableColumnProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className={cn(
            "h-5 w-5",
            id === 'urgent' && "text-red-500",
            id === 'breakdowns' && "text-orange-500",
            id === 'others' && "text-blue-500",
            id === 'unfinished_calls' && "text-purple-500"
          )} />
          {title}
          <Badge variant={badgeVariant} className="text-xs">
            {tickets.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-3">
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Icon className="mx-auto h-8 w-8 mb-2 opacity-50" />
              Cap ticket en aquesta categoria
            </div>
          ) : (
            tickets.map((ticket) => (
              <DraggableTicketCard
                key={ticket.id}
                ticket={ticket}
                onTicketClick={onTicketClick}
                onPlayAudio={onPlayAudio}
              />
            ))
          )}
        </SortableContext>
      </CardContent>
    </Card>
  );
}

export function EnhancedKanbanView({ 
  tickets, 
  onTicketClick, 
  onPlayAudio, 
  onCategoryChange,
  loading 
}: EnhancedKanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ticketCategories, setTicketCategories] = useState<Record<string, 'urgent' | 'breakdowns' | 'others' | 'unfinished_calls'>>({});
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get current category for a ticket (either from state override or default categorization)
  const getTicketCategory = useCallback(
    (ticket: MappedTicket) => ticketCategories[ticket.id] || categorizeTicket(ticket),
    [ticketCategories]
  );

  const categorizedTickets = useMemo(() => {
    const categories = {
      urgent: tickets.filter(ticket => getTicketCategory(ticket) === 'urgent'),
      breakdowns: tickets.filter(ticket => getTicketCategory(ticket) === 'breakdowns'),
      others: tickets.filter(ticket => getTicketCategory(ticket) === 'others'),
      unfinished_calls: tickets.filter(ticket => getTicketCategory(ticket) === 'unfinished_calls'),
    };
    return categories;
  }, [tickets, getTicketCategory]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const ticketId = active.id as string;
    const newCategory = over.id as 'urgent' | 'breakdowns' | 'others' | 'unfinished_calls';
    
    // Update local state
    setTicketCategories(prev => ({
      ...prev,
      [ticketId]: newCategory
    }));

    // Call the optional callback
    onCategoryChange?.(ticketId, newCategory);
    
    setActiveId(null);
  };

  const activeTicket = activeId ? tickets.find(ticket => ticket.id === activeId) : null;

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-16rem)]">
        {Array.from({ length: 4 }).map((_, i) => (
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
    );
  }

  return (
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* 4-Column Kanban Layout */}
        <div className="grid grid-cols-4 gap-4 h-[calc(100vh-16rem)]">
          <DroppableColumn
            id="urgent"
            title="Urgent"
            icon={AlertTriangle}
            tickets={categorizedTickets.urgent}
            onTicketClick={onTicketClick}
            onPlayAudio={onPlayAudio}
            badgeVariant="destructive"
          />
          
          <DroppableColumn
            id="breakdowns"
            title="Avaries"
            icon={Wrench}
            tickets={categorizedTickets.breakdowns}
            onTicketClick={onTicketClick}
            onPlayAudio={onPlayAudio}
            badgeVariant="secondary"
          />
          
          <DroppableColumn
            id="others"
            title="Altres"
            icon={Clock}
            tickets={categorizedTickets.others}
            onTicketClick={onTicketClick}
            onPlayAudio={onPlayAudio}
            badgeVariant="secondary"
          />
          
          <DroppableColumn
            id="unfinished_calls"
            title="Trucades pendents"
            icon={PhoneCall}
            tickets={categorizedTickets.unfinished_calls}
            onTicketClick={onTicketClick}
            onPlayAudio={onPlayAudio}
            badgeVariant="outline"
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTicket ? (
            <DraggableTicketCard
              ticket={activeTicket}
              onTicketClick={onTicketClick}
              onPlayAudio={onPlayAudio}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}