CREATE TABLE IF NOT EXISTS public.session_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_tracks TO authenticated;
GRANT ALL ON public.session_tracks TO service_role;
ALTER TABLE public.session_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracks_read" ON public.session_tracks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tracks_write" ON public.session_tracks FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.session_tracks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  track_id uuid REFERENCES public.session_tracks(id) ON DELETE SET NULL,
  title_ar text,
  title_en text,
  session_type text NOT NULL DEFAULT 'panel_session',
  session_date date NOT NULL,
  start_time time,
  end_time time,
  duration_minutes integer,
  description text,
  topic text,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  partner_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_read" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sessions_write" ON public.sessions FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS sessions_date_idx ON public.sessions (session_date, start_time);

CREATE TABLE IF NOT EXISTS public.session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  speaker_id uuid REFERENCES public.speakers(id) ON DELETE SET NULL,
  display_name text,
  role text NOT NULL DEFAULT 'speaker',
  match_status text NOT NULL DEFAULT 'matched',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_participants TO authenticated;
GRANT ALL ON public.session_participants TO service_role;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_read" ON public.session_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "sp_write" ON public.session_participants FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.session_participants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS sp_session_idx ON public.session_participants (session_id);
CREATE INDEX IF NOT EXISTS sp_speaker_idx ON public.session_participants (speaker_id);

INSERT INTO public.session_tracks (code, name_ar, name_en, sort_order)
VALUES ('dialogue_platform', 'منصة الحوار', 'Dialogue Platform', 1),
       ('security_history_stage', 'مسرح الأمن والتاريخ', 'Security & History Stage', 2)
ON CONFLICT (code) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_tracks;