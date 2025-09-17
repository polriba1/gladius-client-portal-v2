import { useState } from 'react';
import { Search, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { TicketStatus, STATUS_LABELS } from '@/types/existingTickets';

export interface GlobalFilters {
  search: string;
  startDate?: Date;
  endDate?: Date;
  slaFilter?: 'all' | 'breached' | 'at_risk'; // Keep but won't display
  statusFilter?: 'all' | 'open' | 'in_progress' | 'closed';
  assignedFilter?: string; // 'all' | 'unassigned' | assignee_id
}

interface GlobalTicketControlsProps {
  filters: GlobalFilters;
  onFiltersChange: (filters: GlobalFilters) => void;
  pagination: { page: number; limit: number };
  onPaginationChange: (pagination: { page: number; limit: number }) => void;
  totalCount: number;
  tickets: unknown[]; // Add tickets to get available assignees
  className?: string;
}

export function GlobalTicketControls({ 
  filters, 
  onFiltersChange,
  pagination,
  onPaginationChange,
  totalCount,
  tickets,
  className 
}: GlobalTicketControlsProps) {
  const { t } = useLanguage();
  
  // Get unique assignees from tickets for filter dropdown
  const uniqueAssignees = Array.from(new Set(
    tickets
      .map(ticket => ticket.assigned_to)
      .filter(assignee => 
        assignee && 
        assignee.trim() !== '' && 
        assignee.toLowerCase() !== 'no asignado' &&
        assignee.toLowerCase() !== 'no assignat' &&
        assignee.toLowerCase() !== 'unassigned'
      )
  )).sort();

  const hasActiveFilters = 
    filters.startDate || 
    filters.endDate || 
    (filters.statusFilter && filters.statusFilter !== 'all') ||
    (filters.assignedFilter && filters.assignedFilter !== 'all');

  const clearFilters = () => {
    onFiltersChange({
      search: filters.search, // Keep search when clearing other filters
      statusFilter: 'all',
      assignedFilter: 'all',
      startDate: undefined,
      endDate: undefined
    });
  };

  const setTodayFilter = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    
    // Reset pagination when setting today filter
    onPaginationChange({ ...pagination, page: 1 });
    onFiltersChange({
      ...filters,
      startDate: today,
      endDate: today // Use same date, logic will handle making it end of day
    });
  };

  const showAllTickets = () => {
    // Reset pagination and clear all filters except search
    onPaginationChange({ ...pagination, page: 1 });
    onFiltersChange({
      search: filters.search, // Keep search when showing all
      statusFilter: 'all',
      assignedFilter: 'all',
      startDate: undefined,
      endDate: undefined
    });
  };

  const totalPages = Math.ceil(totalCount / pagination.limit);
  
  return (
    <div className="space-y-4">
      {/* Top Row: Search + Filters + Today Button */}
      <div className={cn("flex items-center gap-4", className)}>
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('tickets.filters.search')}
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        
        {/* Today Button */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={setTodayFilter}
          className="whitespace-nowrap"
        >
          {t('dashboard.todayView')}
        </Button>
        
        {/* Show All Button */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={showAllTickets}
          className="whitespace-nowrap"
        >
          {t('common.all')}
        </Button>
        
        {/* Filters Button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className={cn(hasActiveFilters && "border-primary bg-primary/5")}
          >
            <Filter className="h-4 w-4 mr-2" />
            {t('common.filter')}
            {hasActiveFilters && <span className="ml-1 text-xs">•</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-4" align="end">
          {/* Date Range Filters */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('tickets.filters.startDate')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? (
                      format(filters.startDate, "dd/MM/yyyy", { locale: ca })
                    ) : (
                      t('tickets.filters.startDate')
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => {
                      // Reset to page 1 when date changes
                      onPaginationChange({ ...pagination, page: 1 });
                      onFiltersChange({ ...filters, startDate: date });
                    }}
                    className="pointer-events-auto"
                  />
                  {filters.startDate && (
                    <div className="p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onPaginationChange({ ...pagination, page: 1 });
                          onFiltersChange({ ...filters, startDate: undefined });
                        }}
                        className="w-full"
                      >
                        {t('tickets.filters.clearStartDate')}
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('tickets.filters.endDate')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? (
                      format(filters.endDate, "dd/MM/yyyy", { locale: ca })
                    ) : (
                      t('tickets.filters.endDate')
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => {
                      // Reset to page 1 when date changes
                      onPaginationChange({ ...pagination, page: 1 });
                      onFiltersChange({ ...filters, endDate: date });
                    }}
                    disabled={(date) => {
                      // Disable dates before start date if start date is set
                      if (filters.startDate) {
                        return date < filters.startDate;
                      }
                      return false;
                    }}
                    className="pointer-events-auto"
                  />
                  {filters.endDate && (
                    <div className="p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onPaginationChange({ ...pagination, page: 1 });
                          onFiltersChange({ ...filters, endDate: undefined });
                        }}
                        className="w-full"
                      >
                        {t('tickets.filters.clearEndDate')}
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Status Filter - Simplified to 3 states */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('tickets.filters.status')}</label>
            <Select 
              value={filters.statusFilter || 'all'} 
              onValueChange={(value: 'all' | 'open' | 'in_progress' | 'closed') => 
                onFiltersChange({ ...filters, statusFilter: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="open">{t('tickets.filters.statusOpen')}</SelectItem>
                <SelectItem value="in_progress">{t('tickets.filters.statusInProgress')}</SelectItem>
                <SelectItem value="closed">{t('tickets.filters.statusClosed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Assigned Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('tickets.filters.assignedTo')}</label>
            <Select 
              value={filters.assignedFilter || 'all'} 
              onValueChange={(value: string) => 
                onFiltersChange({ ...filters, assignedFilter: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="unassigned">{t('tickets.filters.unassigned')}</SelectItem>
                {uniqueAssignees.map(assignee => (
                  <SelectItem key={assignee} value={assignee}>
                    {assignee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              className="w-full"
            >
              {t('tickets.filters.clearFilters')}
            </Button>
          )}
        </PopoverContent>
      </Popover>
      </div>
      
      {/* Bottom Row: Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('tickets.pagination.rowsPerPage')}:</span>
          <Select
            value={pagination.limit.toString()}
            onValueChange={(value) => onPaginationChange({ page: 1, limit: parseInt(value) })}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t('tickets.pagination.pageInfo', { 
              page: pagination.page, 
              totalPages: Math.max(1, totalPages), 
              total: totalCount 
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPaginationChange({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPaginationChange({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}