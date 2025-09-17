import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type DateRange = { from: Date; to: Date };

interface DateRangeControlsProps {
  value: DateRange | null;
  onChange: (range: DateRange) => void;
}

export default function DateRangeControls({ value, onChange }: DateRangeControlsProps) {
  const label = value ? `${format(value.from, 'dd/MM/yyyy')} - ${format(value.to, 'dd/MM/yyyy')}` : 'Últims 30 dies';

  const setQuick = (days: number) => {
    const to = new Date();
    to.setHours(23,59,59,999);
    const from = new Date(to);
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0,0,0,0);
    onChange({ from, to });
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("justify-start gap-2 w-[260px]", !value && "text-muted-foreground")}> 
            <CalendarIcon className="h-4 w-4" />
            <span>{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <div className="flex flex-col gap-3">
            <Calendar
              mode="range"
              selected={value ? { from: value.from, to: value.to } : undefined}
              onSelect={(r: unknown) => {
                if (r?.from && r?.to) onChange({ from: new Date(r.from), to: new Date(r.to) });
              }}
              numberOfMonths={2}
              initialFocus
            />
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" onClick={() => setQuick(7)}>7 dies</Button>
              <Button variant="secondary" onClick={() => setQuick(30)}>30 dies</Button>
              <Button variant="secondary" onClick={() => setQuick(90)}>90 dies</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
