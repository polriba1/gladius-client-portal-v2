import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface KpiCardsProps {
  loading: boolean;
  totalCalls: number;
  openTickets: number;
  ahtSeconds: number; // average seconds per call
  totalSeconds: number; // total seconds of calls
  costEuros: number;
}

function formatMMSS(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}m ${s}s`;
}

function formatHoursMinutes(totalSeconds: number) {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

export default function KpiCards({ loading, totalCalls, openTickets, ahtSeconds, totalSeconds, costEuros }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <Card>
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-sm font-medium">Nº trucades capturades</CardTitle>
          <CardDescription>Nombre total de trucades registrades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '...' : totalCalls.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-sm font-medium">Tickets oberts</CardTitle>
          <CardDescription>Tickets amb estat obert/pendent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '...' : openTickets.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-sm font-medium">AHT per trucada</CardTitle>
          <CardDescription>Temps mitjà de gestió per trucada</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '...' : formatMMSS(ahtSeconds)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-sm font-medium">Temps total</CardTitle>
          <CardDescription>Total acumulat de trucades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '...' : formatHoursMinutes(totalSeconds)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-sm font-medium">Cost</CardTitle>
          <CardDescription>0,13 €/min sobre temps total</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '...' : new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(costEuros)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
