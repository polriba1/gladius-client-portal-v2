import { devLog } from "@/lib/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, Clock, User, Filter, Eye, AlertTriangle, CheckCircle, Timer, Settings } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export type LatestTicket = {
  id: string;
  time: string;
  category: string;
  status: string;
  assignedTo: string;
};

interface EnhancedLatestTicketsTableProps {
  data: LatestTicket[];
  loading: boolean;
  onViewAll: () => void;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" {
  const lower = status.toLowerCase();
  if (lower.includes('resolt') || lower.includes('tancat') || lower.includes('cerrado') || lower.includes('resuelto')) {
    return "default"; // Green for resolved
  }
  if (lower.includes('pendent') || lower.includes('pendiente') || lower.includes('en curs') || lower.includes('en curso')) {
    return "secondary"; // Yellow for pending
  }
  return "destructive"; // Red for open/urgent
}

function getStatusColor(status: string): string {
  const lower = status.toLowerCase();
  if (lower.includes('resolt') || lower.includes('tancat') || lower.includes('cerrado') || lower.includes('resuelto')) {
    return "text-success";
  }
  if (lower.includes('pendent') || lower.includes('pendiente') || lower.includes('en curs') || lower.includes('en curso')) {
    return "text-warning";
  }
  return "text-destructive";
}

function getCategoryIcon(category: string) {
  const lower = category.toLowerCase();
  if (lower.includes('urgent') || lower.includes('críti') || lower.includes('emerg')) {
    return AlertTriangle;
  }
  if (lower.includes('manteniment') || lower.includes('maintenance') || lower.includes('config')) {
    return Settings;
  }
  return Ticket;
}

function getCategoryColor(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('urgent') || lower.includes('críti') || lower.includes('emerg')) {
    return "text-destructive";
  }
  if (lower.includes('manteniment') || lower.includes('maintenance')) {
    return "text-warning";
  }
  return "text-primary";
}

export default function EnhancedLatestTicketsTable({ data, loading, onViewAll }: EnhancedLatestTicketsTableProps) {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredData = data.filter(ticket => {
    if (statusFilter === "all") return true;
    const status = ticket.status.toLowerCase();
    if (statusFilter === "open") return !status.includes('resolt') && !status.includes('tancat') && !status.includes('cerrado') && !status.includes('resuelto');
    if (statusFilter === "pending") return status.includes('pendent') || status.includes('pendiente') || status.includes('en curs') || status.includes('en curso');
    if (statusFilter === "resolved") return status.includes('resolt') || status.includes('tancat') || status.includes('cerrado') || status.includes('resuelto');
    return true;
  });

  const stats = {
    open: data.filter(t => !t.status.toLowerCase().includes('resolt') && !t.status.toLowerCase().includes('tancat')).length,
    resolved: data.filter(t => t.status.toLowerCase().includes('resolt') || t.status.toLowerCase().includes('tancat')).length
  };

  const handleTicketClick = (ticket: LatestTicket) => {
    // Navigate to ticket detail or open ticket modal
    devLog('View ticket:', ticket.id);
  };

  return (
    <Card className="group hover:shadow-success transition-all duration-500 bg-gradient-card border-success/20 hover:border-success/40">
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-success" />
            <CardTitle className="text-lg font-semibold">{t('dashboard.latestTickets')}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {stats.resolved > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="default" className="bg-success text-success-foreground">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {stats.resolved} {t('dashboard.resolved')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('dashboard.resolvedTicketsToday')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {stats.open > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="destructive">
                      <Timer className="w-3 h-3 mr-1" />
                      {stats.open} {t('dashboard.open')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('dashboard.pendingTickets')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <CardDescription>{t('dashboard.mostRecentIncidents')}</CardDescription>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.all')}</SelectItem>
                <SelectItem value="open">{t('dashboard.open')}</SelectItem>
                <SelectItem value="pending">{t('dashboard.pending')}</SelectItem>
                <SelectItem value="resolved">{t('dashboard.resolved')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-success mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">{t('dashboard.loadingTickets')}</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Ticket className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">
              {data.length === 0 ? t('dashboard.noTicketsToday') : t('dashboard.noTicketsFilter')}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50">
                  <TableHead className="text-xs font-medium text-muted-foreground w-20">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t('dashboard.time')}
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Ticket className="w-3 h-3" />
                      {t('dashboard.category')}
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    {t('dashboard.status')}
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {t('dashboard.assigned')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((ticket, index) => {
                  const CategoryIcon = getCategoryIcon(ticket.category);
                  return (
                    <TableRow 
                      key={ticket.id} 
                      className="hover:bg-muted/30 transition-colors cursor-pointer group/row"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => handleTicketClick(ticket)}
                    >
                      <TableCell className="font-medium text-sm py-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-success/60 rounded-full group-hover/row:bg-success transition-colors"></div>
                                {ticket.time}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('dashboard.ticketCreatedAt')} {ticket.time}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-sm py-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-2">
                                <CategoryIcon className={`w-4 h-4 ${getCategoryColor(ticket.category)}`} />
                                <span className="truncate max-w-32">{ticket.category}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('dashboard.category')}: {ticket.category}</p>
                              <p className="text-xs text-muted-foreground">{t('dashboard.clickForDetails')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-sm py-3">
                        <Badge 
                          variant={getStatusVariant(ticket.status)}
                          className={`${getStatusVariant(ticket.status) === 'default' ? 'bg-success text-success-foreground' : ''}`}
                        >
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm py-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                                  <User className="w-3 h-3 text-muted-foreground" />
                                </div>
                                <span className="truncate max-w-20 text-xs">
                                  {ticket.assignedTo || t('dashboard.unassigned')}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('dashboard.assignedTo')}: {ticket.assignedTo || t('dashboard.unassigned')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="p-4 border-t border-border/50 bg-muted/20">
              <Button 
                onClick={onViewAll} 
                variant="outline" 
                size="sm" 
                className="w-full hover:bg-success hover:text-success-foreground transition-all duration-300"
              >
                <Eye className="w-4 h-4 mr-2" />
                {t('dashboard.viewAllTicketsToday')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}