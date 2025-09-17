import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ 
  data, 
  width = 100, 
  height = 30, 
  color = 'currentColor',
  strokeWidth = 2 
}) => {
  if (!data || data.length === 0) {
    return <div className="opacity-50 text-xs">No data</div>;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1; // Avoid division by zero

  // Generate SVG path
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - strokeWidth * 2) + strokeWidth;
    const y = ((max - value) / range) * (height - strokeWidth * 2) + strokeWidth;
    return `${x},${y}`;
  }).join(' ');

  const pathData = `M ${points.replace(/,/g, ' L ').replace(/L$/, '')}`;

  return (
    <div className="flex items-center">
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-sm"
        />
        {/* Add dots for each point */}
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * (width - strokeWidth * 2) + strokeWidth;
          const y = ((max - value) / range) * (height - strokeWidth * 2) + strokeWidth;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={strokeWidth / 2}
              fill={color}
              className="opacity-60"
            />
          );
        })}
      </svg>
    </div>
  );
};

export default Sparkline;