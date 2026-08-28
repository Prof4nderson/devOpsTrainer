CREATE TYPE public.app_role AS ENUM ('aluno','professor');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN COALESCE(NEW.raw_user_meta_data->>'papel','aluno') = 'professor'
                       THEN 'professor'::public.app_role ELSE 'aluno'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  language TEXT NOT NULL,
  level TEXT NOT NULL,
  challenge_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_index INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sessions TO authenticated;
GRANT ALL ON public.training_sessions TO service_role;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_own" ON public.training_sessions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.challenge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.training_sessions ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  language TEXT NOT NULL,
  level TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  tentativas INTEGER NOT NULL DEFAULT 0,
  acertou BOOLEAN NOT NULL DEFAULT false,
  ultima_resposta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_attempts TO authenticated;
GRANT ALL ON public.challenge_attempts TO service_role;
ALTER TABLE public.challenge_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_own" ON public.challenge_attempts FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.level_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  language TEXT NOT NULL,
  level TEXT NOT NULL,
  melhor_pontuacao INTEGER NOT NULL DEFAULT 0,
  tentativas_nivel INTEGER NOT NULL DEFAULT 0,
  concluido BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, language, level)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.level_progress TO authenticated;
GRANT ALL ON public.level_progress TO service_role;
ALTER TABLE public.level_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_own" ON public.level_progress FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  language TEXT NOT NULL,
  level TEXT,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rag_documents TO authenticated;
GRANT ALL ON public.rag_documents TO service_role;
ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rag_read_authenticated" ON public.rag_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "rag_insert_professor" ON public.rag_documents FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'professor') AND autor_id = auth.uid());
CREATE POLICY "rag_update_professor" ON public.rag_documents FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'professor')) WITH CHECK (public.has_role(auth.uid(),'professor'));
CREATE POLICY "rag_delete_professor" ON public.rag_documents FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'professor'));

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE TABLE public.terminal_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  comandos_ok INTEGER NOT NULL DEFAULT 0,
  comandos_erro INTEGER NOT NULL DEFAULT 0,
  melhor_combo INTEGER NOT NULL DEFAULT 0,
  streak_dias INTEGER NOT NULL DEFAULT 0,
  ultima_pratica DATE,
  badges TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terminal_stats TO authenticated;
GRANT ALL ON public.terminal_stats TO service_role;
ALTER TABLE public.terminal_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "terminal_stats_own" ON public.terminal_stats FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.terminal_ranking()
RETURNS TABLE (nome text, xp integer, melhor_combo integer, badges text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(p.nome, ''), 'operador'), t.xp, t.melhor_combo, t.badges
  FROM public.terminal_stats t
  JOIN public.profiles p ON p.id = t.user_id
  WHERE t.xp > 0
  ORDER BY t.xp DESC, t.melhor_combo DESC
  LIMIT 20
$$;
REVOKE ALL ON FUNCTION public.terminal_ranking() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.terminal_ranking() TO authenticated;

-- Sala ao vivo: presenca
CREATE TABLE public.training_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'operador',
  atividade TEXT NOT NULL DEFAULT 'explorando',
  language TEXT,
  level TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_presence TO authenticated;
GRANT ALL ON public.training_presence TO service_role;
ALTER TABLE public.training_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presence_read_authenticated" ON public.training_presence FOR SELECT TO authenticated USING (true);
CREATE POLICY "presence_write_own" ON public.training_presence FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "presence_update_own" ON public.training_presence FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "presence_delete_own" ON public.training_presence FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX training_presence_last_seen_idx ON public.training_presence (last_seen DESC);

-- Sala ao vivo: chat
CREATE TABLE public.lounge_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'operador',
  corpo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.lounge_messages TO authenticated;
GRANT ALL ON public.lounge_messages TO service_role;
ALTER TABLE public.lounge_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lounge_read_authenticated" ON public.lounge_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "lounge_insert_own" ON public.lounge_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND char_length(corpo) BETWEEN 1 AND 500);
CREATE POLICY "lounge_delete_own" ON public.lounge_messages FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX lounge_messages_created_idx ON public.lounge_messages (created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.training_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lounge_messages;