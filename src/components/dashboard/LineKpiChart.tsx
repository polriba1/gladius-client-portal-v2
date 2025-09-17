import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

export type DailyKpiPoint = {
  date: string; // YYYY-MM-DD
  calls: number;
  openTickets: number;
  ahtMin: number; // average minutes per call
  totalMin: number; // total minutes per day
  cost: number; // euros per day
};

const chartConfig = {
  calls: { label: "Trucades", color: "hsl(var(--primary))" },
  openTickets: { label: "Tickets oberts", color: "hsl(var(--secondary))" },
  ahtMin: { label: "AHT (min)", color: "hsl(var(--accent))" },
  totalMin: { label: "Temps total (min)", color: "hsl(var(--muted-foreground))" },
  cost: { label: "Cost (€)", color: "hsl(var(--destructive))" },
} satisfies Record<string, { label: string; color: string }>;

export default function LineKpiChart({ data, loading }: { data: DailyKpiPoint[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolució KPIs (30 dies)</CardTitle>
        <CardDescription>Trucades, tickets oberts, AHT, temps total i cost</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Carregant gràfic...</div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ left: 12, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="calls" stroke="var(--color-calls)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="openTickets" stroke="var(--color-openTickets)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="ahtMin" stroke="var(--color-ahtMin)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="totalMin" stroke="var(--color-totalMin)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="cost" stroke="var(--color-cost)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
