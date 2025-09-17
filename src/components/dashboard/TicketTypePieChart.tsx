import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export type TicketTypeSlice = { type: string; value: number };

const chartColors = [
  "hsl(210, 85%, 45%)", // Brand primary blue
  "hsl(0, 75%, 50%)",   // Brand accent red  
  "hsl(210, 85%, 35%)", // Darker blue
  "hsl(0, 75%, 40%)",   // Darker red
  "hsl(210, 85%, 55%)", // Lighter blue
  "hsl(0, 75%, 60%)",   // Lighter red
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default function TicketTypePieChart({ data, loading }: { data: TicketTypeSlice[]; loading: boolean }) {
  const chartData = data.map((d, i) => ({ 
    key: slug(d.type || 'altres'), 
    label: d.type || 'Altres', 
    value: d.value, 
    color: chartColors[i % chartColors.length] 
  }));

  const CustomTooltip = ({ active, payload }: unknown) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = chartData.reduce((sum, item) => sum + item.value, 0);
      const percentage = total > 0 ? String(Math.round((data.value / total) * 100)) : '0';
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-card-foreground">{data.label}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} tickets ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card border-primary/20 hover:shadow-glow transition-all duration-500">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-primary rounded-full"></div>
          <div>
            <CardTitle className="text-foreground">Distribució per tipus de ticket</CardTitle>
            <CardDescription>Percentatge d'urgències, averies, etc.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Carregant gràfic...</div>
        ) : data.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No hi ha tickets avui</div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={chartData} 
                  dataKey="value" 
                  nameKey="label" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={110} 
                  innerRadius={50} 
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '20px',
                    fontSize: '14px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
