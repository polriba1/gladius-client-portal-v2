import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  Phone, 
  Search, 
  CalendarIcon, 
  Play, 
  ChevronUp, 
  ChevronDown,
  AlertTriangle,
  Info,
  Wrench,
  Clock,
  Star,
  X,
  PhoneOff,
  User,
  Volume2,
  Hash,
  MessageSquare,
  ExternalLink,
  Download,
  Euro
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

type CallLog = {
  id: number;
  created_at: string;
  call_duration_seconds: string | null;
  score: string | null;
  call_cost: string | null;
  call_summary: string | null;
  call_recording: string | null;
  call_transcript: string | null;
  call_intent: string | null;
  phone_id: string | null;
};

interface ProfessionalCallLogTableProps {
  data: CallLog[];
  loading: boolean;
  hideCost?: boolean;
}

type SortColumn = "created_at" | "call_duration_seconds" | "score";

function getScoreColor(score: string): string {
  const numScore = parseFloat(score);
  if (numScore >= 8) return "text-success bg-success/10 border-success/30";
  if (numScore >= 6) return "text-primary bg-primary/10 border-primary/30";
  return "text-destructive bg-destructive/10 border-destructive/30";
}

function getScoreVariant(score: string): "default" | "secondary" | "destructive" {
  const numScore = parseFloat(score);
  if (numScore >= 8) return "default";
  if (numScore >= 6) return "secondary";
  return "destructive";
}

function getCallTypeIcon(motiu: string) {
  const lower = motiu.toLowerCase();
  if (lower.includes('urgent') || lower.includes('emerg') || lower.includes('críti') || lower.includes('anular_cita')) {
    return { icon: AlertTriangle, label: "urgent", color: "text-destructive" };
  }
  if (lower.includes('avari') || lower.includes('error') || lower.includes('problema')) {
    return { icon: Wrench, label: "breakdown", color: "text-warning" };
  }
  if (lower.includes('consult') || lower.includes('inform') || lower.includes('pregunt')) {
    return { icon: Info, label: "consultation", color: "text-primary" };
  }
  return { icon: Phone, label: "general", color: "text-muted-foreground" };
}

function formatDuration(timeStr: string | null, secondsStr?: string | null): string {
  // Try to use the seconds field first for more accurate duration
  if (secondsStr) {
    const seconds = parseInt(secondsStr);
    if (!isNaN(seconds)) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }
  
  // Fallback to time string
  if (!timeStr) return "00:00";
  
  // Handle formats like "1 min  4 s" (Salutdental format)
  if (timeStr.includes('min') && timeStr.includes('s')) {
    const minMatch = timeStr.match(/(\d+)\s*min/);
    const secMatch = timeStr.match(/(\d+)\s*s/);
    const mins = minMatch ? parseInt(minMatch[1]) : 0;
    const secs = secMatch ? parseInt(secMatch[1]) : 0;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Handle formats like "2:34"
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      const mins = parseInt(parts[0]) || 0;
      const secs = parseInt(parts[1]) || 0;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }
  
  return "00:00";
}

// Enhanced fuzzy search function
function fuzzySearch(searchTerm: string, targets: (string | null)[]): boolean {
  if (!searchTerm) return true;
  
  const search = searchTerm.toLowerCase().trim();
  const searchWords = search.split(' ').filter(word => word.length > 0);
  
  return targets.some(target => {
    if (!target) return false;
    const targetLower = target.toLowerCase();
    
    // Exact match
    if (targetLower.includes(search)) return true;
    
    // Word-based fuzzy matching
    return searchWords.every(word => targetLower.includes(word));
  });
}

export default function ProfessionalCallLogTable({ data, loading, hideCost = false }: ProfessionalCallLogTableProps) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const openCallDetail = (call: CallLog) => {
    setSelectedCall(call);
    setDetailPanelOpen(true);
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

      // Enhanced fuzzy search filter
      if (searchTerm) {
        filtered = filtered.filter(call => 
          fuzzySearch(searchTerm, [
            call.phone_id,
            call.call_summary // Include summary in search
          ])
        );
      }

    // Date range filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(call => {
        if (!call.created_at) return false;
        const callDate = new Date(call.created_at);
        if (dateRange.from && callDate < dateRange.from) return false;
        if (dateRange.to && callDate > dateRange.to) return false;
        return true;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue = a[sortColumn] as string | number | undefined;
      let bValue = b[sortColumn] as string | number | undefined;

      if (sortColumn === "created_at") {
        aValue = new Date(a.created_at || 0).getTime();
        bValue = new Date(b.created_at || 0).getTime();
      } else if (sortColumn === "call_duration_seconds") {
        aValue = parseInt(a.call_duration_seconds || "0");
        bValue = parseInt(b.call_duration_seconds || "0");
      } else if (sortColumn === "score") {
        aValue = parseFloat(a.score || "0");
        bValue = parseFloat(b.score || "0");
      }

      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [data, searchTerm, sortColumn, sortDirection, dateRange]);

  // Pagination logic
  const totalItems = filteredAndSortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const SortableHeader = ({ column, children, tooltip }: { 
    column: SortColumn; 
    children: React.ReactNode;
    tooltip: string;
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <TableHead 
            className="cursor-pointer hover:bg-muted/50 select-none font-semibold text-foreground"
            onClick={() => handleSort(column)}
          >
            <div className="flex items-center gap-2">
              {children}
              {sortColumn === column && (
                sortDirection === "asc" ? 
                <ChevronUp className="w-4 h-4 text-primary" /> : 
                <ChevronDown className="w-4 h-4 text-primary" />
              )}
            </div>
          </TableHead>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">{t('calls.loading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Simplified Filters Section */}
      <Card className="bg-gradient-card border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Unified Search Bar */}
            <div className="flex-1 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('calls.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/60 border-border/60 focus:border-primary/60"
                />
              </div>
            </div>

            {/* Dual Date Range Picker */}
            <div className="flex gap-2">
              {/* Start Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal bg-background/60 min-w-[140px]",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : t('calls.startDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {/* End Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal bg-background/60 min-w-[140px]",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : t('calls.endDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setDateRange({});
                }}
                disabled={!searchTerm && !dateRange.from && !dateRange.to}
              >
                <X className="w-4 h-4 mr-2" />
                {t('calls.clearFilters')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Data Table */}
      <Card className="bg-gradient-card border-primary/20 shadow-elegant">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Phone className="w-6 h-6 text-primary" />
                {t('calls.title')}
              </CardTitle>
              <CardDescription>
                {t('calls.showingCalls', { 
                  start: startIndex + 1,
                  end: Math.min(endIndex, totalItems),
                  filtered: totalItems,
                  total: data.length
                })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">{t('calls.files', { count: 25 })}</SelectItem>
                  <SelectItem value="50">{t('calls.files', { count: 50 })}</SelectItem>
                  <SelectItem value="100">{t('calls.files', { count: 100 })}</SelectItem>
                  <SelectItem value="1000">{t('calls.files', { count: 1000 })}</SelectItem>
                  <SelectItem value={data.length.toString()}>{t('calls.showAll')}</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="text-sm font-medium">
                {t('calls.total')}: {data.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {totalItems === 0 ? (
            <div className="p-12 text-center">
              <Phone className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('calls.noCallsRegistered')}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {searchTerm || dateRange.from || dateRange.to
                  ? t('calls.noCallsMatchingFilters')
                  : t('calls.noCallsYet')
                }
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                    <SortableHeader column="created_at" tooltip={t('calls.sortByDate')}>
                      <Clock className="w-4 h-4 mr-1" />
                      {t('calls.date')}
                    </SortableHeader>
                    <TableHead className="font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {t('calls.phone')}
                      </div>
                    </TableHead>
                    <SortableHeader column="call_duration_seconds" tooltip={t('calls.sortByDuration')}>
                      <Clock className="w-4 h-4 mr-1" />
                      {t('calls.duration')}
                    </SortableHeader>
                    <SortableHeader column="score" tooltip={t('calls.sortByScore')}>
                      <Star className="w-4 h-4 mr-1" />
                      {t('calls.score')}
                    </SortableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((call, index) => {
                      const callTypeInfo = getCallTypeIcon(call["Motivo Llamada"] || "");
                      return (
                        <TableRow 
                          key={call.id} 
                          className="hover:bg-muted/30 transition-colors border-b border-border/40 cursor-pointer"
                          onClick={() => openCallDetail(call)}
                        >
                          <TableCell className="py-4">
                            <div className="space-y-1">
                              <div className="font-medium text-foreground">
                                {format(new Date(call.created_at), "dd/MM/yyyy")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(call.created_at), "HH:mm")}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span className="font-mono text-sm text-foreground">
                                {call.phone_id || "—"}
                              </span>
                            </div>
                          </TableCell>
                          
                          
                          <TableCell className="py-4">
                            <div className="text-sm font-mono text-foreground">
                              {formatDuration(null, call.call_duration_seconds)}
                            </div>
                          </TableCell>
                          
                          <TableCell className="py-4">
                            {call.score ? (
                              <Badge 
                                variant={getScoreVariant(call.score)}
                                className={cn("font-medium", getScoreColor(call.score))}
                              >
                                {call.score}/10
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">{t('calls.notRated')}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Responsive Mobile Cards */}
              <div className="block md:hidden space-y-4 p-4">
                {paginatedData.map((call) => {
                  const callTypeInfo = getCallTypeIcon(call.call_intent || "");
                  return (
                    <Card 
                      key={call.id} 
                      className="bg-gradient-card border-primary/20 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => openCallDetail(call)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span className="font-mono text-sm font-medium">
                                {call.phone_id || "—"}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(call.created_at), "dd/MM/yyyy")}
                            </div>
                          </div>
                          
                          {/* Duration Row */}
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground font-mono">
                              {formatDuration(null, call.call_duration_seconds)}
                            </div>
                          </div>
                          
                          {/* Bottom Row */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/30">
                            <div>
                              {call.score ? (
                                <Badge 
                                  variant={getScoreVariant(call.score)}
                                  className={cn("text-xs", getScoreColor(call.score))}
                                >
                                  {call.score}/10
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">{t('calls.notRated')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center py-6 border-t border-border/30">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Call Detail Panel */}
      <Sheet open={detailPanelOpen} onOpenChange={setDetailPanelOpen}>
        <SheetContent className="w-full sm:max-w-3xl">
          <div className="h-full flex flex-col">
            <SheetHeader className="space-y-4 pb-6 border-b border-border/40 flex-shrink-0">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-xl font-semibold text-foreground">
                  {t('calls.callDetails')}
                </SheetTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailPanelOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {selectedCall && (
                <SheetDescription className="text-base text-muted-foreground">
                  {t('calls.callFrom')} {format(new Date(selectedCall.created_at), "dd/MM/yyyy 'a les' HH:mm")}
                </SheetDescription>
              )}
            </SheetHeader>

            {selectedCall && (
              <div className="flex-1 overflow-y-auto py-6 space-y-8">
                {/* Call Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('calls.phone')}</p>
                        <p className="font-mono text-base font-medium text-foreground">
                          {selectedCall.phone_id || t('calls.notAvailable')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('calls.duration')}</p>
                        <p className="font-mono text-base font-medium text-foreground">
                          {formatDuration(null, selectedCall.call_duration_seconds)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Star className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('calls.score')}</p>
                        <p className="text-2xl font-bold text-foreground">
                          {selectedCall.score || 0}<span className="text-lg text-muted-foreground">/10</span>
                        </p>
                      </div>
                    </div>

                    {!hideCost && selectedCall.call_cost && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Euro className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('calls.cost')}</p>
                          <p className="text-lg font-semibold text-foreground">
                            {selectedCall.call_cost}€
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Audio Player Section */}
                {selectedCall.call_recording && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">{t('calls.callAudio')}</h3>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                      <audio 
                        controls 
                        className="w-full"
                        preload="metadata"
                      >
                        <source src={selectedCall.call_recording} type="audio/mpeg" />
                        <source src={selectedCall.call_recording} type="audio/wav" />
                        <source src={selectedCall.call_recording} type="audio/ogg" />
                        {t('calls.audioNotSupported')}
                      </audio>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {t('calls.duration')}: {formatDuration(null, selectedCall.call_duration_seconds)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a 
                            href={selectedCall.call_recording} 
                            download={`trucada-${selectedCall.phone_id}-${format(new Date(selectedCall.created_at), "dd-MM-yyyy")}.mp3`}
                            className="flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            {t('calls.download')}
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}


                {/* Summary */}
                {selectedCall.call_summary && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">{t('calls.summary')}</h3>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-foreground leading-relaxed">
                        {selectedCall.call_summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Full Transcript - Expanded View */}
                {selectedCall.call_transcript && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Hash className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">{t('calls.fullTranscript')}</h3>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-6">
                      <div className="prose prose-sm max-w-none text-foreground">
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap text-base">
                          {selectedCall.call_transcript}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}