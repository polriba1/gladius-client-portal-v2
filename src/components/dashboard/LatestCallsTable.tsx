import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Phone } from "lucide-react";

export type LatestCall = {
  id: number;
  time: string;
  phone: string;
  duration: string;
  cost: string;
  score: string;
};

interface LatestCallsTableProps {
  data: LatestCall[];
  loading: boolean;
  onViewAll: () => void;
}

const getScoreVariant = (score: string) => {
  const scoreNum = parseFloat(score);
  if (scoreNum >= 8) return 'default'; // green
  if (scoreNum >= 6) return 'secondary'; // yellow
  return 'destructive'; // red
};

const getScoreColor = (score: string) => {
  const scoreNum = parseFloat(score);
  if (scoreNum >= 8) return 'text-green-600';
  if (scoreNum >= 6) return 'text-yellow-600';
  return 'text-red-600';
};

export default function LatestCallsTable({ data, loading, onViewAll }: LatestCallsTableProps) {
  return (
    <Card className="bg-gradient-card border-accent/20 hover:shadow-accent transition-all duration-500">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-accent rounded-full"></div>
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Phone className="w-5 h-5 text-accent" />
              Últimes Trucades d'Avui
            </CardTitle>
            <CardDescription>5 trucades més recents d'avui</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Carregant trucades...</div>
        ) : data.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Cap trucada avui</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Telèfon</TableHead>
                  <TableHead>Durada</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell className="font-mono text-sm">
                      {call.time}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {call.phone}
                    </TableCell>
                    <TableCell className="text-sm">
                      {call.duration}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {call.cost}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getScoreVariant(call.score)}>
                        {call.score}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-center">
              <Button 
                variant="outline" 
                onClick={onViewAll} 
                className="flex items-center gap-2 bg-card/50 backdrop-blur-sm border-accent/20 hover:border-accent/40 hover:bg-accent/5 transition-all duration-300"
              >
                <Eye className="w-4 h-4 text-accent" />
                Veure totes les trucades d'avui
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}