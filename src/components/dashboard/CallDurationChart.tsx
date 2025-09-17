import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export type CallDurationSlice = { 
  range: string; 
  value: number; 
  minutes: number;
};

interface CallDurationChartProps {
  data: CallDurationSlice[];
  loading: boolean;
}

const chartColors = [
  "hsl(210, 85%, 45%)", // Brand primary blue
  "hsl(0, 75%, 50%)",   // Brand accent red
  "hsl(210, 85%, 35%)", // Darker blue
  "hsl(0, 75%, 40%)",   // Darker red
  "hsl(210, 85%, 55%)", // Lighter blue
];

export default function CallDurationChart({ data, loading }: CallDurationChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    color: chartColors[index % chartColors.length]
  }));

  const totalCalls = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: unknown) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const percentage = totalCalls > 0 ? ((dataPoint.value / totalCalls) * 100).toFixed(1) : '0';
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-card-foreground">{dataPoint.range}</p>
          <p className="text-sm text-muted-foreground">
            {dataPoint.value} trucades ({percentage}%)
          </p>
          <p className="text-sm text-muted-foreground">
            Total: {Math.round(dataPoint.minutes)} minuts
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
          <div className="w-1 h-6 bg-gradient-accent rounded-full"></div>
          <div>
            <CardTitle className="text-foreground">Distribució per Durada de Trucada</CardTitle>
            <CardDescription>Volum de trucades per trams de durada</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Carregant gràfic...</div>
        ) : data.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No hi ha dades de trucades</div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={chartData} 
                  dataKey="value" 
                  nameKey="range" 
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