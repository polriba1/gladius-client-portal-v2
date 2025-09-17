import React from 'react';
import { useRealtimeIndicator } from '@/hooks/useRealtimeIndicator';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RealtimeIndicator() {
  const { isConnected, lastUpdate, connectionQuality, activeChannels } = useRealtimeIndicator();

  const getStatusColor = () => {
    switch (connectionQuality) {
      case 'good':
        return 'bg-green-500';
      case 'poor':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionQuality) {
      case 'good':
        return 'Temps real actiu';
      case 'poor':
        return 'Connexió lenta';
      case 'disconnected':
        return 'Desconnectat';
      default:
        return 'Connecting...';
    }
  };

  const getIcon = () => {
    switch (connectionQuality) {
      case 'good':
        return <Wifi className="h-3 w-3" />;
      case 'poor':
        return <AlertCircle className="h-3 w-3" />;
      case 'disconnected':
        return <WifiOff className="h-3 w-3" />;
      default:
        return <Wifi className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={cn(
          'flex items-center gap-1.5 text-xs transition-all duration-200',
          connectionQuality === 'good' && 'border-green-200 text-green-700 bg-green-50',
          connectionQuality === 'poor' && 'border-yellow-200 text-yellow-700 bg-yellow-50',
          connectionQuality === 'disconnected' && 'border-red-200 text-red-700 bg-red-50'
        )}
      >
        <div className={cn('h-2 w-2 rounded-full animate-pulse', getStatusColor())} />
        {getIcon()}
        <span>{getStatusText()}</span>
      </Badge>
      
      {lastUpdate && connectionQuality === 'good' && (
        <span className="text-xs text-muted-foreground">
          Actualitzat {lastUpdate.toLocaleTimeString('ca-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </span>
      )}
    </div>
  );
}