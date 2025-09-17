import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface AnimatedKpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'success' | 'warning' | 'destructive';
  animate?: boolean;
}

export function AnimatedKpiCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  color = 'default',
  animate = true,
}: AnimatedKpiCardProps) {
  const [displayValue, setDisplayValue] = useState<string | number>(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }

    const numericValue = typeof value === 'string' ? 
      parseFloat(value.replace(/[^\d.-]/g, '')) : value;
    
    if (isNaN(numericValue)) {
      setDisplayValue(value);
      return;
    }

    const currentValue = typeof displayValue === 'string' ? 
      parseFloat(displayValue.toString().replace(/[^\d.-]/g, '')) : displayValue;

    if (currentValue === numericValue) return;

    setIsAnimating(true);
    
    const duration = 1000; // 1 second animation
    const steps = 30;
    const stepValue = (numericValue - currentValue) / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const newValue = currentValue + (stepValue * currentStep);
      
      if (currentStep >= steps) {
        setDisplayValue(typeof value === 'string' ? 
          value.replace(/[\d.-]+/, numericValue.toString()) : numericValue);
        setIsAnimating(false);
        clearInterval(interval);
      } else {
        const formattedValue = typeof value === 'string' ?
          value.replace(/[\d.-]+/, newValue.toFixed(0)) : Math.round(newValue);
        setDisplayValue(formattedValue);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [value, animate, displayValue]);

  const getColorClasses = () => {
    switch (color) {
      case 'success':
        return 'border-l-green-500 bg-green-50/50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50/50';
      case 'destructive':
        return 'border-l-red-500 bg-red-50/50';
      default:
        return 'border-l-blue-500 bg-blue-50/50';
    }
  };

  const getTrendClasses = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className={`border-l-4 transition-all duration-300 hover:shadow-md ${getColorClasses()}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold transition-all duration-300 ${
          isAnimating ? 'scale-105' : 'scale-100'
        }`}>
          {displayValue}
        </div>
        {description && (
          <p className={`text-xs ${getTrendClasses()} mt-1`}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}