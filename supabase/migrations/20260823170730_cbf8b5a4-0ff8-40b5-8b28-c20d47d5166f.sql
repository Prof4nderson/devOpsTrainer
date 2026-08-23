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