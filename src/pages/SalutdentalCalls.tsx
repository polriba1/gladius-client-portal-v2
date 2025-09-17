import { devLog } from "@/lib/logger";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ProfessionalCallLogTable from "@/components/calls/ProfessionalCallLogTable";
import { useLanguage } from "@/contexts/LanguageContext";

type SalutdentalCallRaw = {
  id: number;
  created_at: string;
  phone_id: string | null;
  call_duration_seconds: number | null;
  score: string | null;
  summary: string | null;
  audio_call: string | null;
  call_transcript: string | null;
};

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

const SalutdentalCalls = () => {
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const fetchSalutdentalCallLogs = useCallback(async () => {
    try {
      setLoading(true);
      devLog('🔄 Fetching Salutdental call logs from database...');

      const { data, error } = await supabase
        .from('call_logs_salutdental')
        .select('id, created_at, phone_id, call_duration_seconds, score, summary, audio_call, call_transcript')
        .order('created_at', { ascending: false });

      devLog('📊 Salutdental calls response:', { recordCount: data?.length, error });

      if (error) {
        console.error('❌ Database error:', error);
        toast({
          title: t('common.error'),
          description: 'Error loading Salutdental calls',
          variant: "destructive",
        });
        return;
      }

      const transformedCalls: CallLog[] = (data || []).map((call: SalutdentalCallRaw) => {
        const formatDuration = (seconds: number | null): string | null => {
          if (!seconds || seconds === 0) return "0:00";
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        const formatDate = (dateStr: string): string => {
          try {
            return new Date(dateStr).toLocaleDateString('ca-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
          } catch {
            return dateStr;
          }
        };

        devLog('Processing call:', call.id, 'with phone:', call.phone_id);

        return {
          id: call.id,
          created_at: call.created_at,
          call_duration_seconds: call.call_duration_seconds?.toString() || "0",
          score: call.score || null,
          call_cost: null,
          call_summary: call.summary || null,
          call_recording: call.audio_call || null,
          call_transcript: call.call_transcript || null,
          call_intent: "Consulta Salutdental",
          phone_id: call.phone_id || null,
        };
      });

      setCallLogs(transformedCalls);
      devLog('✅ Loaded', transformedCalls.length, 'transformed records');
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
        fetchSalutdentalCallLogs();
      }
    });

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate('/');
      } else {
        setIsAuthenticated(true);
        fetchSalutdentalCallLogs();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, fetchSalutdentalCallLogs]);


  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
          {t('calls.title')} - Salutdental
        </h1>
        <p className="text-muted-foreground">
          Registre de trucades del sistema Salutdental
        </p>
      </div>

      <ProfessionalCallLogTable data={callLogs} loading={loading} hideCost={true} />
    </div>
  );
};

export default SalutdentalCalls;