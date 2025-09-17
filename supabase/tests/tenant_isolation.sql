BEGIN;
SELECT plan(5);

-- RLS must be enabled on call_logs_tecnics_bcn_sat
SELECT has_rls('public', 'call_logs_tecnics_bcn_sat');

-- Debug policy should be absent
SELECT isnt(
  (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='call_logs_tecnics_bcn_sat' AND policyname='Authenticated users can view call logs'),
  1,
  'No wide-open call log policy'
);

-- RLS must be enabled on tickets_tecnics_bcn_sat
SELECT has_rls('public', 'tickets_tecnics_bcn_sat');

-- Debug policy should be absent
SELECT isnt(
  (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tickets_tecnics_bcn_sat' AND policyname='Temporary debug access to tickets'),
  1,
  'No debug ticket policy'
);

-- Standard call log policy exists
SELECT has_policy('public', 'call_logs_tecnics_bcn_sat', 'Tecnics users can view their call logs');

SELECT finish();
ROLLBACK;
