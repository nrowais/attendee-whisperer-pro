ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS time_precision text NOT NULL DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS exact_start_time time without time zone;

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_time_precision_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_time_precision_check
  CHECK (time_precision IN ('exact','within_slot'));

ALTER TABLE public.session_participants
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.session_participants ALTER COLUMN match_status SET DEFAULT 'needs_matching';

UPDATE public.session_participants SET match_status = 'needs_matching'
  WHERE match_status IS NULL OR match_status NOT IN ('matched','needs_matching','unconfirmed');

ALTER TABLE public.session_participants DROP CONSTRAINT IF EXISTS session_participants_match_status_check;
ALTER TABLE public.session_participants ADD CONSTRAINT session_participants_match_status_check
  CHECK (match_status IN ('matched','needs_matching','unconfirmed'));

ALTER TABLE public.session_participants DROP CONSTRAINT IF EXISTS session_participants_role_check;
ALTER TABLE public.session_participants ADD CONSTRAINT session_participants_role_check
  CHECK (role IN ('speaker','moderator','moderator_f','interviewer','interviewer_f','host','presenter','guest'));

CREATE INDEX IF NOT EXISTS idx_session_participants_match_status
  ON public.session_participants (match_status);