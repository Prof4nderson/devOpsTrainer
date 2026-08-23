import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Perfil = {
  id: string;
  nome: string;
  email: string | null;
  xp: number;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [isProfessor, setIsProfessor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s) {
        setPerfil(null);
        setIsProfessor(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelado = false;
    (async () => {
      const [{ data: p }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, nome, email, xp").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (cancelado) return;
      if (p) setPerfil(p as Perfil);
      setIsProfessor((roles ?? []).some((r) => r.role === "professor"));
    })();
    return () => {
      cancelado = true;
    };
  }, [user]);

  const recarregarPerfil = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, nome, email, xp")
      .eq("id", user.id)
      .maybeSingle();
    if (data) setPerfil(data as Perfil);
  };

  const sair = async () => {
    await supabase.auth.signOut();
    setPerfil(null);
    setIsProfessor(false);
  };

  return { session, user, perfil, isProfessor, loading, sair, recarregarPerfil };
}
