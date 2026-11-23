-- Auth.js autentica en el servidor y Drizzle conecta como propietario.
-- Las claves de Supabase del navegador no deben leer datos de alumnos o sesiones.
DO $$
DECLARE
  table_name text;
  api_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'accounts', 'attendance', 'autopay', 'callups', 'categories', 'charges',
    'coach_teams', 'discounts', 'enrollments', 'expenses', 'guardian_invitations',
    'guardianships', 'league_charges', 'league_match_stats', 'league_matches',
    'league_teams', 'match_events', 'match_player_stats', 'matches', 'memberships',
    'notifications', 'plans', 'roster_players', 'schools', 'season_teams',
    'seasons', 'sessions', 'staff_invitations', 'student_discounts', 'students',
    'teams', 'tournament_standings', 'tournaments', 'training_sessions', 'users',
    'verification_tokens'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, api_role);
      END IF;
    END LOOP;
  END LOOP;
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
    END IF;
  END LOOP;
END $$;
