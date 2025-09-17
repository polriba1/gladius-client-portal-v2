import { useMemo } from "react";
import type { HeatmapCell } from "@/hooks/useAnalyticsReports";

const hourFormatter = (hour: number) => `${hour.toString().padStart(2, "0")}:00`;
const orderDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface CallVolumeHeatmapProps {
  data: HeatmapCell[];
}

export const CallVolumeHeatmap = ({ data }: CallVolumeHeatmapProps) => {
  const { days, hours, matrix, maxCalls } = useMemo(() => {
    const uniqueDays = Array.from(new Set(data.map((cell) => cell.day)));
    uniqueDays.sort((a, b) => orderDays.indexOf(a) - orderDays.indexOf(b));

    const uniqueHours = Array.from(new Set(data.map((cell) => cell.hour))).sort(
      (a, b) => a - b
    );

    const map = new Map<string, HeatmapCell>();
    data.forEach((cell) => map.set(`${cell.day}-${cell.hour}`, cell));

    let max = 0;
    const grid = uniqueDays.map((day) =>
      uniqueHours.map((hour) => {
        const entry = map.get(`${day}-${hour}`);
        if (entry && entry.calls > max) {
          max = entry.calls;
        }
        return entry;
      })
    );

    return { days: uniqueDays, hours: uniqueHours, matrix: grid, maxCalls: max };
  }, [data]);

  const getCellColor = (calls: number) => {
    if (maxCalls === 0) return "#f8fafc";
    const intensity = calls / maxCalls;

    // Improved color scheme with better contrast
    if (intensity === 0) return "#f8fafc";
    if (intensity < 0.2) return "#dbeafe"; // Very light blue
    if (intensity < 0.4) return "#bfdbfe"; // Light blue
    if (intensity < 0.6) return "#93c5fd"; // Medium blue
    if (intensity < 0.8) return "#60a5fa"; // Strong blue
    return "#3b82f6"; // Dark blue for high values
  };

  const getTextColor = (calls: number) => {
    if (maxCalls === 0) return "text-slate-500";
    const intensity = calls / maxCalls;
    return intensity > 0.6 ? "text-white" : "text-slate-700";
  };

  return (
    <div data-chart="heatmap" className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="p-3 text-left text-sm font-semibold text-slate-700 border-r border-slate-200">
              Día/Hora
            </th>
            {hours.map((hour) => (
              <th key={hour} className="p-3 text-center text-sm font-semibold text-slate-700 min-w-[60px]">
                {hourFormatter(hour)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, rowIndex) => (
            <tr key={days[rowIndex] ?? rowIndex} className="border-b border-slate-100 hover:bg-slate-50/50">
              <td className="p-3 text-sm font-medium text-slate-800 border-r border-slate-200 bg-slate-50">
                {days[rowIndex]}
              </td>
              {row.map((cell, columnIndex) => (
                <td
                  key={`${rowIndex}-${columnIndex}`}
                  className={`h-12 w-16 text-center text-sm font-medium border-r border-slate-100 transition-all duration-200 hover:scale-105 hover:shadow-sm ${
                    cell ? getTextColor(cell.calls) : "text-slate-400"
                  } ${cell ? "cursor-pointer" : ""}`}
                  style={{
                    backgroundColor: cell ? getCellColor(cell.calls) : "#f8fafc",
                    borderBottom: "1px solid #e2e8f0"
                  }}
                  title={cell ? `${cell.calls} llamadas · ${cell.avgDuration}s promedio` : "Sin datos"}
                >
                  {cell ? cell.calls : "0"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
