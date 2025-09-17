import React, { useState, useEffect } from 'react';
import { MappedTicket, TicketStatus } from '@/types/existingTickets';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Save,
  X,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SimplifiedTicketDetailProps {
  ticket: MappedTicket | null;
  open: boolean;
  onClose: () => void;
  onStatusChange?: (ticketId: string, status: TicketStatus) => void;
  onAssigneeChange?: (ticketId: string, assignee: string | null) => void;
  onNotesChange?: (ticketId: string, notes: string) => void;
}

// Status options will use dynamic translations

const assigneeOptions = [
  { value: 'Quim', label: 'Quim' },
  { value: 'Norma', label: 'Norma' },
  { value: 'Helena', label: 'Helena' }
];

export function SimplifiedTicketDetail({ 
  ticket, 
  open, 
  onClose, 
  onStatusChange,
  onAssigneeChange,
  onNotesChange
}: SimplifiedTicketDetailProps) {
  const { t } = useLanguage();
  const [currentSimpleStatus, setCurrentSimpleStatus] = useState<'open' | 'in_progress' | 'closed'>('open');
  const [currentAssignee, setCurrentAssignee] = useState<string>('unassigned');
  const [currentNotes, setCurrentNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when ticket changes
  useEffect(() => {
    if (ticket) {
      setCurrentSimpleStatus(getSimpleStatus(ticket.status));
      setCurrentNotes(ticket.public_notes || '');
      const normalized = ticket.assigned_to && ticket.assigned_to.toLowerCase() !== 'no asignado'
        ? ticket.assigned_to
        : 'unassigned';
      setCurrentAssignee(normalized);
    }
  }, [ticket]);

  if (!ticket) return null;

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ca });
  };

  const handleSave = async () => {
    if (!ticket) return;
    
    setIsSaving(true);
    
    try {
      // Check for status change and call the function with correct mapping
      const originalSimpleStatus = getSimpleStatus(ticket.status);
      
      if (currentSimpleStatus !== originalSimpleStatus) {
        let mappedStatus: TicketStatus;
        switch (currentSimpleStatus) {
          case 'open':
            mappedStatus = 'created';
            break;
          case 'in_progress':
            mappedStatus = 'in_progress';
            break;
          case 'closed':
            mappedStatus = 'completed';
            break;
          default:
            mappedStatus = 'created';
        }
        await onStatusChange?.(ticket.id, mappedStatus);
      }
      
      // Handle assignee change
      const originalAssignee = (!ticket.assigned_to || ticket.assigned_to.toLowerCase() === 'no asignado')
        ? 'unassigned'
        : ticket.assigned_to;
      if (currentAssignee !== originalAssignee && onAssigneeChange) {
        const assigneeValue = currentAssignee === 'unassigned' ? null : currentAssignee;
        await onAssigneeChange(ticket.id, assigneeValue);
      }
      
      // Handle notes change
      if (currentNotes !== (ticket.public_notes || '')) {
        await onNotesChange?.(ticket.id, currentNotes);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving ticket changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500 text-white';
      case 'in_progress':
        return 'bg-orange-500 text-white';
      case 'closed':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getSimpleStatus = (status: TicketStatus): 'open' | 'in_progress' | 'closed' => {
    if (['completed', 'closed', 'cancelled', 'invoiced'].includes(status)) return 'closed';
    if (['in_progress', 'on_site', 'en_route'].includes(status)) return 'in_progress';
    return 'open';
  };

  const getAssigneeInitials = (assignedTo?: string): string => {
    if (!assignedTo || assignedTo === 'unassigned') return '';
    return assignedTo
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleStatusSelectChange = (value: string) => {
    setCurrentSimpleStatus(value as 'open' | 'in_progress' | 'closed');
  };

  const handlePhoneClick = () => {
    if (ticket?.requester_phone) {
      window.open(`tel:${ticket.requester_phone}`, '_self');
    }
  };

  const handleAddressClick = () => {
    if (ticket?.site_address && ticket.site_address !== 'Dirección no especificada') {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(ticket.site_address)}`, '_blank');
    }
  };

  const isUrgent = ticket?.priority === 'emergency';
  const isOpen = getSimpleStatus(ticket.status) === 'open';
  const isUrgentAndOpen = isUrgent && isOpen;
  
  const hasChanges = 
    currentSimpleStatus !== getSimpleStatus(ticket.status) ||
    currentNotes !== (ticket.public_notes || '') ||
    (onAssigneeChange && currentAssignee !== (ticket.assigned_to || 'unassigned'));

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader className={cn(
          "pb-4 border-b",
          isUrgentAndOpen && "bg-red-100 border-red-300 dark:bg-red-950/30 dark:border-red-700 -mx-6 -mt-6 px-6 pt-6 mb-4"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SheetTitle className="text-lg font-semibold">
                #{ticket?.ticket_number || 'N/A'} • {ticket?.subject || t('tickets.noSubject')}
              </SheetTitle>
              <div className="flex items-center gap-2">
                <Badge className={cn("text-xs font-medium", getStatusBadgeColor(currentSimpleStatus))}>
                  {currentSimpleStatus === 'open' && t('ticketStatus.open')}
                  {currentSimpleStatus === 'in_progress' && t('ticketStatus.inProgress')}
                  {currentSimpleStatus === 'closed' && t('ticketStatus.closed')}
                </Badge>
                {isUrgent && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {t('tickets.urgent')}
                  </Badge>
                )}
              </div>
            </div>
            
            {onAssigneeChange && (
              <div className="flex items-center gap-2">
                {ticket?.assigned_to ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground font-medium">
                        {getAssigneeInitials(ticket.assigned_to)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{ticket.assigned_to}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">{t('tickets.unassigned')}</span>
                )}
              </div>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] pr-4">
          <div className="space-y-4">
            {/* Status & Assignment Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">{t('tickets.status')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('tickets.status')}</label>
                    <Select value={currentSimpleStatus} onValueChange={handleStatusSelectChange}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-md z-50">
                        <SelectItem value="open">{t('ticketStatus.open')}</SelectItem>
                        <SelectItem value="in_progress">{t('ticketStatus.inProgress')}</SelectItem>
                        <SelectItem value="closed">{t('ticketStatus.closed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Agent Assignment - Only show if onAssigneeChange is provided */}
                  {onAssigneeChange && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('tickets.assignedTo')}</label>
                      <Select 
                        value={currentAssignee} 
                        onValueChange={setCurrentAssignee}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={t('tickets.selectAgent')} />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-md z-50">
                          <SelectItem value="unassigned">No asignado</SelectItem>
                          {assigneeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('tickets.createdAt')}: {format(new Date(ticket?.created_at || new Date()), 'dd/MM/yyyy HH:mm', { locale: ca })}</span>
                  <span>{t('tickets.updatedAt')}: {format(new Date(ticket?.updated_at || ticket?.created_at || new Date()), 'dd/MM/yyyy HH:mm', { locale: ca })}</span>
                </div>
              </CardContent>
            </Card>

            {/* Client Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">{t('tickets.clientInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm">👤</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{ticket?.requester_name || t('tickets.nameNotAvailable')}</div>
                      <div className="text-xs text-muted-foreground">{t('tickets.client')}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
                         onClick={handlePhoneClick}>
                      <span className="text-sm">📞</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm cursor-pointer hover:text-primary transition-colors" onClick={handlePhoneClick}>
                        {ticket?.requester_phone || t('tickets.phoneNotAvailable')}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('tickets.clickToCall')}</div>
                    </div>
                  </div>
                  
                  {ticket?.site_address && ticket.site_address !== 'Dirección no especificada' && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                           onClick={handleAddressClick}>
                        <span className="text-sm">📍</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm cursor-pointer hover:text-primary transition-colors" onClick={handleAddressClick}>
                          {ticket.site_address}
                        </div>
                        <div className="text-xs text-muted-foreground">{t('tickets.clickToOpenMaps')}</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Assistant Notes */}
            {ticket?.internal_notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">{t('tickets.assistantNotes')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {ticket.internal_notes}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Internal Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t('tickets.internalNotes')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Textarea
                  value={currentNotes}
                  onChange={(e) => setCurrentNotes(e.target.value)}
                  placeholder={t('tickets.addInternalNotes')}
                  className="min-h-[120px] resize-y"
                />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex items-center gap-2"
            disabled={isSaving}
          >
            {t('common.close')}
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}