import { devLog } from "@/lib/logger";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ProfessionalCallLogTable from "@/components/calls/ProfessionalCallLogTable";
import { useLanguage } from "@/contexts/LanguageContext";

type CallLog = {
  id: number;
  created_at: string;
  call_duration_seconds: string | null;
  score: string | null;
  call_cost: string | null;
  call_summary: string | null;
  call_recording: string | null;
  call_transcript: string | null;
  call_intent: string | null;
  phone_id: string | null;
};

const RegistreTrucades = () => {
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchCallLogs = useCallback(async () => {
    try {
      setLoading(true);
      devLog('🔄 Fetching ALL call logs from database...');

      // Get ALL records - no limit to ensure we have everything
      const { data, error } = await (supabase as unknown)
        .from('call_logs_tecnics_bcn_sat')
        .select('*')
        .order('id', { ascending: false });

      devLog('📊 Database response:', { recordCount: data?.length, error });

      if (error) {
        console.error('❌ Database error:', error);
        toast({
          title: t('common.error'),
          description: t('calls.loadError'),
          variant: "destructive",
        });
        return;
      }

      setCallLogs(data || []);
      devLog('✅ Loaded', data?.length || 0, 'total records');
    } catch (error: unknown) {
      console.error('❌ Fetch error:', error);
      toast({
        title: t('common.error'),
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate('/');
      } else {
        setIsAuthenticated(true);
        fetchCallLogs();
      }
    });

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate('/');
      } else {
        setIsAuthenticated(true);
        fetchCallLogs();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, fetchCallLogs]);


  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
          {t('calls.title')}
        </h1>
        <p className="text-muted-foreground text-lg">
          {t('calls.description')}
        </p>
      </div>

      <ProfessionalCallLogTable data={callLogs} loading={loading} />
    </div>
  );
};

export default RegistreTrucades;