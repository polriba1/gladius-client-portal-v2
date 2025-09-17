import { useState } from 'react';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { TicketFilters } from '@/hooks/useExistingTickets';
import { STATUS_LABELS, PRIORITY_LABELS, TicketStatus, TicketPriority } from '@/types/existingTickets';

interface TicketFiltersProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
  onClearFilters: () => void;
}

export function TicketFiltersComponent({ filters, onFiltersChange, onClearFilters }: TicketFiltersProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    filters.start_date ? new Date(filters.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    filters.end_date ? new Date(filters.end_date) : undefined
  );

  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search: search || undefined });
  };

  const handleStatusToggle = (status: TicketStatus, checked: boolean) => {
    const currentStatuses = filters.status || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status);
    
    onFiltersChange({ 
      ...filters, 
      status: newStatuses.length > 0 ? newStatuses : undefined 
    });
  };

  const handlePriorityToggle = (priority: TicketPriority, checked: boolean) => {
    const currentPriorities = filters.priority || [];
    const newPriorities = checked
      ? [...currentPriorities, priority]
      : currentPriorities.filter(p => p !== priority);
    
    onFiltersChange({ 
      ...filters, 
      priority: newPriorities.length > 0 ? newPriorities : undefined 
    });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    onFiltersChange({
      ...filters,
      start_date: date ? date.toISOString() : undefined
    });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    onFiltersChange({
      ...filters,
      end_date: date ? date.toISOString() : undefined
    });
  };

  const activeFiltersCount = [
    filters.search,
    filters.status?.length,
    filters.priority?.length,
    filters.assigned_to,
    filters.start_date,
    filters.end_date,
    filters.tags?.length
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search and Clear Filters */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Cercar per nom, telèfon, adreça, assumpte o número de ticket..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
              {activeFiltersCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filtres</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClearFilters}
                  className="h-8 px-2 lg:px-3"
                >
                  Netejar tot
                </Button>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Estat</Label>
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                  {Object.entries(STATUS_LABELS).map(([status, label]) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status}`}
                        checked={filters.status?.includes(status as TicketStatus) || false}
                        onCheckedChange={(checked) => 
                          handleStatusToggle(status as TicketStatus, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`status-${status}`}
                        className="text-sm font-normal"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Prioritat</Label>
                <div className="space-y-2">
                  {Object.entries(PRIORITY_LABELS).map(([priority, label]) => (
                    <div key={priority} className="flex items-center space-x-2">
                      <Checkbox
                        id={`priority-${priority}`}
                        checked={filters.priority?.includes(priority as TicketPriority) || false}
                        onCheckedChange={(checked) => 
                          handlePriorityToggle(priority as TicketPriority, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`priority-${priority}`}
                        className="text-sm font-normal"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Rang de dates</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Des de</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "dd/MM/yyyy", { locale: ca }) : "Seleccionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={handleStartDateChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fins a</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "dd/MM/yyyy", { locale: ca }) : "Seleccionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={handleEndDateChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Cerca: {filters.search}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleSearchChange('')}
              />
            </Badge>
          )}
          {filters.status?.map(status => (
            <Badge key={status} variant="secondary" className="flex items-center gap-1">
              {STATUS_LABELS[status]}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleStatusToggle(status, false)}
              />
            </Badge>
          ))}
          {filters.priority?.map(priority => (
            <Badge key={priority} variant="secondary" className="flex items-center gap-1">
              {PRIORITY_LABELS[priority]}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handlePriorityToggle(priority, false)}
              />
            </Badge>
          ))}
          {startDate && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Des de: {format(startDate, "dd/MM/yyyy", { locale: ca })}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleStartDateChange(undefined)}
              />
            </Badge>
          )}
          {endDate && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Fins: {format(endDate, "dd/MM/yyyy", { locale: ca })}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleEndDateChange(undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}