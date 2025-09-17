import { useState } from 'react';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock,
  AlertTriangle,
  Play,
  Download,
  Tag,
  Wrench,
  DollarSign,
  FileText,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MappedTicket, STATUS_LABELS, PRIORITY_LABELS, TicketStatus } from '@/types/existingTickets';
import { cn } from '@/lib/utils';

interface TicketDetailSlideOverProps {
  ticket: MappedTicket | null;
  open: boolean;
  onClose: () => void;
  onStatusChange?: (ticketId: string, status: TicketStatus) => void;
}

const getStatusColor = (status: TicketStatus) => {
  const colors: Record<TicketStatus, string> = {
    created: 'bg-blue-100 text-blue-800 border-blue-200',
    triaged: 'bg-purple-100 text-purple-800 border-purple-200',
    scheduled: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    assigned: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    en_route: 'bg-orange-100 text-orange-800 border-orange-200',
    on_site: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
    parts_needed: 'bg-red-100 text-red-800 border-red-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    invoiced: 'bg-teal-100 text-teal-800 border-teal-200',
    closed: 'bg-gray-100 text-gray-800 border-gray-200',
    cancelled: 'bg-slate-100 text-slate-800 border-slate-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getPriorityColor = (priority: string) => {
  const colors = {
    emergency: 'text-red-600 bg-red-50 border-red-200',
    same_day: 'text-orange-600 bg-orange-50 border-orange-200',
    standard: 'text-green-600 bg-green-50 border-green-200',
  };
  return colors[priority as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200';
};

export function TicketDetailSlideOver({ 
  ticket, 
  open, 
  onClose, 
  onStatusChange 
}: TicketDetailSlideOverProps) {
  const [audioPlaying, setAudioPlaying] = useState(false);

  if (!ticket) return null;

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ca });
  };

  const isOverdue = () => {
    if (!ticket.sla_response_due) return false;
    return new Date(ticket.sla_response_due) < new Date() && 
           !['completed', 'closed', 'cancelled'].includes(ticket.status);
  };

  const handlePlayAudio = () => {
    if (!ticket.call_recording_url) return;
    
    const audio = new Audio(ticket.call_recording_url);
    setAudioPlaying(true);
    
    audio.play().catch((error) => {
      console.error('Error playing audio:', error);
      setAudioPlaying(false);
    });
    
    audio.addEventListener('ended', () => {
      setAudioPlaying(false);
    });
    
    audio.addEventListener('error', () => {
      setAudioPlaying(false);
    });
  };

  const quickActions = [
    { label: 'Programar', status: 'scheduled' as TicketStatus },
    { label: 'Assignar', status: 'assigned' as TicketStatus },
    { label: 'En progrés', status: 'in_progress' as TicketStatus },
    { label: 'Completar', status: 'completed' as TicketStatus },
  ];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-lg font-semibold">
                    #{ticket.ticket_number}
                  </SheetTitle>
                  <Badge className={cn("text-xs", getStatusColor(ticket.status))}>
                    {STATUS_LABELS[ticket.status]}
                  </Badge>
                  <Badge className={cn("text-xs", getPriorityColor(ticket.priority))}>
                    {PRIORITY_LABELS[ticket.priority]}
                  </Badge>
                  {isOverdue() && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Endarrerit
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{ticket.subject}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Accions ràpides
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {quickActions.map((action) => (
                      <Button
                        key={action.status}
                        variant="outline"
                        size="sm"
                        onClick={() => onStatusChange?.(ticket.id, action.status)}
                        disabled={ticket.status === action.status}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Informació del client
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{ticket.requester_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{ticket.requester_phone}</span>
                  </div>
                  {ticket.requester_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{ticket.requester_email}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span>{ticket.site_address}</span>
                  </div>
                  {ticket.access_instructions && (
                    <div className="bg-muted/50 p-3 rounded-md">
                      <p className="text-sm font-medium mb-1">Instruccions d'accés:</p>
                      <p className="text-sm text-muted-foreground">{ticket.access_instructions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Call Information */}
              {(ticket.call_recording_url || ticket.call_transcript) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Informació de la trucada
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {ticket.call_recording_url && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePlayAudio}
                          disabled={audioPlaying}
                          className="flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          {audioPlaying ? 'Reproduint...' : 'Reproduir gravació'}
                        </Button>
                        <a
                          href={ticket.call_recording_url}
                          download
                          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <Download className="w-4 h-4" />
                          Descarregar
                        </a>
                        <audio controls className="flex-1 h-8">
                          <source src={ticket.call_recording_url} type="audio/mpeg" />
                          <source src={ticket.call_recording_url} type="audio/wav" />
                          <source src={ticket.call_recording_url} type="audio/ogg" />
                          El teu navegador no suporta l'element d'àudio.
                        </audio>
                      </div>
                    )}
                    
                    {ticket.call_transcript && (
                      <div>
                        <p className="text-sm font-medium mb-2">Transcripció completa:</p>
                        <div className="bg-muted/50 p-4 rounded-md max-h-64 overflow-y-auto">
                          <p className="text-sm whitespace-pre-wrap">{ticket.call_transcript}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Problem Description */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Descripció del problema
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Descripció:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {ticket.description}
                    </p>
                  </div>
                  {ticket.symptoms && (
                    <div>
                      <p className="text-sm font-medium mb-1">Símptomes:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {ticket.symptoms}
                      </p>
                    </div>
                  )}
                  {ticket.tags && ticket.tags.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Etiquetes:</p>
                      <div className="flex flex-wrap gap-1">
                        {ticket.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Equipment Information */}
              {ticket.equipment_description && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      Informació de l'equip
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      {ticket.equipment_description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* SLA Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    SLA i temps
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Resposta requerida:</p>
                      <p className="text-muted-foreground">
                        {ticket.sla_response_due 
                          ? formatDateTime(ticket.sla_response_due)
                          : `${ticket.sla_response_hours}h des de la creació`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Resolució requerida:</p>
                      <p className="text-muted-foreground">
                        {ticket.sla_resolution_due 
                          ? formatDateTime(ticket.sla_resolution_due)
                          : `${ticket.sla_resolution_hours}h des de la creació`
                        }
                      </p>
                    </div>
                  </div>
                  {ticket.scheduled_start && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Programat:</span>
                      <span className="text-muted-foreground">
                        {formatDateTime(ticket.scheduled_start)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financial Information */}
              {(ticket.estimated_cost || ticket.actual_cost) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Informació financera
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {ticket.estimated_cost && (
                      <div className="flex justify-between text-sm">
                        <span>Cost estimat:</span>
                        <span className="font-medium">{ticket.estimated_cost}€</span>
                      </div>
                    )}
                    {ticket.actual_cost && (
                      <div className="flex justify-between text-sm">
                        <span>Cost real:</span>
                        <span className="font-medium">{ticket.actual_cost}€</span>
                      </div>
                    )}
                    {ticket.labor_hours > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Hores de treball:</span>
                        <span className="font-medium">{ticket.labor_hours}h</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {(ticket.internal_notes || ticket.public_notes) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    {ticket.public_notes && (
                      <div>
                        <p className="text-sm font-medium mb-1">Notes públiques:</p>
                        <div className="bg-muted/50 p-3 rounded-md">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {ticket.public_notes}
                          </p>
                        </div>
                      </div>
                    )}
                    {ticket.internal_notes && (
                      <div>
                        <p className="text-sm font-medium mb-1">Notes internes:</p>
                        <div className="bg-muted/50 p-3 rounded-md">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {ticket.internal_notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Cronologia
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">Creat:</span>
                      <span className="text-muted-foreground">
                        {formatDateTime(ticket.created_at)}
                      </span>
                    </div>
                    {ticket.assigned_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="font-medium">Assignat:</span>
                        <span className="text-muted-foreground">
                          {formatDateTime(ticket.assigned_at)}
                        </span>
                      </div>
                    )}
                    {ticket.scheduled_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <span className="font-medium">Programat:</span>
                        <span className="text-muted-foreground">
                          {formatDateTime(ticket.scheduled_at)}
                        </span>
                      </div>
                    )}
                    {ticket.on_site_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="font-medium">Al lloc:</span>
                        <span className="text-muted-foreground">
                          {formatDateTime(ticket.on_site_at)}
                        </span>
                      </div>
                    )}
                    {ticket.completed_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">Completat:</span>
                        <span className="text-muted-foreground">
                          {formatDateTime(ticket.completed_at)}
                        </span>
                      </div>
                    )}
                    {ticket.closed_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        <span className="font-medium">Tancat:</span>
                        <span className="text-muted-foreground">
                          {formatDateTime(ticket.closed_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}