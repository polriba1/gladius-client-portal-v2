import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye } from "lucide-react";

export type LatestTicket = {
  id: number;
  time: string;
  category: string;
  status: string;
  assignedTo: string;
};

interface LatestTicketsTableProps {
  data: LatestTicket[];
  loading: boolean;
  onViewAll: () => void;
}

const getStatusVariant = (status: string) => {
  const lower = status.toLowerCase();
  if (lower.includes('resolt') || lower.includes('tancat') || lower.includes('cerrado') || lower.includes('resuelto')) {
    return 'default';
  }
  if (lower.includes('urgent') || lower.includes('crític')) {
    return 'destructive';
  }
  return 'secondary';
};

const getCategoryColor = (category: string) => {
  const lower = category.toLowerCase();
  if (lower.includes('urgent')) return 'text-destructive';
  if (lower.includes('averia') || lower.includes('avería')) return 'text-orange-600';
  if (lower.includes('trucada perduda') || lower.includes('missed')) return 'text-muted-foreground';
  return 'text-primary';
};

export default function LatestTicketsTable({ data, loading, onViewAll }: LatestTicketsTableProps) {
  return (
    <Card className="bg-gradient-card border-primary/20 hover:shadow-glow transition-all duration-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-primary rounded-full"></div>
            <div>
              <CardTitle className="text-foreground">Últims Tickets d'Avui</CardTitle>
              <CardDescription>5 tickets més recents creats avui</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Carregant tickets...</div>
        ) : data.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Cap ticket avui</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Estat</TableHead>
                  <TableHead>Assignat a</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-sm">
                      {ticket.time}
                    </TableCell>
                    <TableCell>
                      <span className={getCategoryColor(ticket.category)}>
                        {ticket.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ticket.assignedTo || 'No assignat'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-center">
              <Button 
                variant="outline" 
                onClick={onViewAll} 
                className="flex items-center gap-2 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
              >
                <Eye className="w-4 h-4 text-primary" />
                Veure tots els tickets d'avui
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}