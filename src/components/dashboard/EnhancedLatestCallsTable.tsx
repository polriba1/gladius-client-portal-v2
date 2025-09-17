import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Clock, Euro, Star, Filter, Eye, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export type LatestCall = {
  id: string;
  time: string;
  phone: string;
  duration: string;
  cost: string;
  score: string;
};

interface EnhancedLatestCallsTableProps {
  data: LatestCall[];
  loading: boolean;
  onViewAll: () => void;
}

function getScoreVariant(score: string): "default" | "secondary" | "destructive" | "outline" {
  const numScore = parseFloat(score);
  if (numScore >= 8) return "default"; // Green for good scores
  if (numScore >= 6) return "secondary"; // Yellow for medium scores
  return "destructive"; // Red for poor scores
}

function getScoreColor(score: string): string {
  const numScore = parseFloat(score);
  if (numScore >= 8) return "text-success";
  if (numScore >= 6) return "text-warning";
  return "text-destructive";
}

export default function EnhancedLatestCallsTable({ data, loading, onViewAll }: EnhancedLatestCallsTableProps) {
  const { t } = useLanguage();
  const [scoreFilter, setScoreFilter] = useState<string>("all");

  const filteredData = data.filter(call => {
    if (scoreFilter === "all") return true;
    const numScore = parseFloat(call.score);
    if (scoreFilter === "high") return numScore >= 8;
    if (scoreFilter === "medium") return numScore >= 6 && numScore < 8;
    if (scoreFilter === "low") return numScore < 6;
    return true;
  });

  const averageScore = data.length > 0 
    ? (data.reduce((sum, call) => sum + parseFloat(call.score), 0) / data.length).toFixed(1)
    : "0";

  return (
    <Card className="group hover:shadow-glow transition-all duration-500 bg-gradient-card border-primary/20 hover:border-primary/40">
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-semibold">{t('dashboard.latestCalls')}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="border-success/30 text-success">
                    <Star className="w-3 h-3 mr-1" />
                    {t('dashboard.average')}: {averageScore}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('dashboard.avgQualityScore')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <CardDescription>{t('dashboard.mostRecentCalls')}</CardDescription>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.allCalls')}</SelectItem>
                <SelectItem value="high">{t('dashboard.excellent')} (8+)</SelectItem>
                <SelectItem value="medium">{t('dashboard.good')} (6-7)</SelectItem>
                <SelectItem value="low">{t('dashboard.needsImprovement')} (&lt;6)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">{t('dashboard.loadingCalls')}</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Phone className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">
              {data.length === 0 ? t('dashboard.noCallsToday') : t('dashboard.noCallsFilter')}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50">
                  <TableHead className="text-xs font-medium text-muted-foreground w-20">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t('dashboard.time')}
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {t('dashboard.phone')}
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-20">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {t('dashboard.duration')}
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-20">
                    <div className="flex items-center gap-1">
                      <Euro className="w-3 h-3" />
                      {t('dashboard.cost')}
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-20">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {t('dashboard.quality')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((call, index) => (
                  <TableRow 
                    key={call.id} 
                    className="hover:bg-muted/30 transition-colors cursor-pointer group/row"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell className="font-medium text-sm py-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-primary/60 rounded-full group-hover/row:bg-primary transition-colors"></div>
                              {call.time}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('dashboard.callRegisteredAt')} {call.time}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-sm py-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                              {call.phone}
                            </code>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('dashboard.clientPhoneNumber')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-sm py-3">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {call.duration}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm py-3">
                      <span className="font-medium text-warning">{call.cost}</span>
                    </TableCell>
                    <TableCell className="text-sm py-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge 
                              variant={getScoreVariant(call.score)}
                              className={`font-medium ${getScoreVariant(call.score) === 'default' ? 'bg-success text-success-foreground' : ''}`}
                            >
                              <Star className="w-3 h-3 mr-1" />
                              {call.score}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('dashboard.serviceQualityScore')}</p>
                            <p className="text-xs text-muted-foreground">
                              {parseFloat(call.score) >= 8 ? t('dashboard.excellentService')
                                : parseFloat(call.score) >= 6 ? t('dashboard.acceptableService')
                                : t('dashboard.needsImprovement')}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="p-4 border-t border-border/50 bg-muted/20">
              <Button 
                onClick={onViewAll} 
                variant="outline" 
                size="sm" 
                className="w-full hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                <Eye className="w-4 h-4 mr-2" />
                {t('dashboard.viewAllCallsToday')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}