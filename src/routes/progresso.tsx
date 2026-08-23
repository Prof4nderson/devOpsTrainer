import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Trophy, Target, Flame, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { AppShell } from "@/components/AppShell";
import { DESAFIOS_POR_NIVEL, LINGUAGENS, NIVEL_LABEL, isNivel } from "@/lib/challenges";

export const Route = createFileRoute("/progresso")({
  head: () => ({
    meta: [
      { title: "Minha evolução — DevOps Trainer" },
      {
        name: "description",
        content:
          "Acompanhe XP, aproveitamento por nível e o histórico completo de desafios respondidos no DevOps Trainer.",
      },
      { property: "og:title", content: "Minha evolução — DevOps Trainer" },
      {
        property: "og:description",
        content: "XP, aproveitamento por linguagem e histórico de tentativas do aluno.",
      },
    ],
  }),
  component: Progresso,
});

type Prog = {
  language: string;
  level: string;
  melhor_pontuacao: number;
  tentativas_nivel: number;
  concluido: boolean;
};
type Tentativa = {
  id: string;
  language: string;
  level: string;
  challenge_id: string;
  acertou: boolean;
  tentativas: number;
  created_at: string;
};

function Progresso() {
  const navigate = useNavigate();
  const { user, perfil, isProfessor, loading, sair } = useAuth();
  const [prog, setProg] = useState<Prog[]>([]);
  const [hist, setHist] = useState<Tentativa[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: h }] = await Promise.all([
        supabase
          .from("level_progress")
          .select("language, level, melhor_pontuacao, tentativas_nivel, concluido")
          .eq("user_id", user.id),
        supabase
          .from("challenge_attempts")
          .select("id, language, level, challenge_id, acertou, tentativas, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      setProg((p ?? []) as Prog[]);
      setHist((h ?? []) as Tentativa[]);
      setCarregando(false);
    })();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 neon animate-spin" />
      </div>
    );
  }

  const acertos = hist.filter((h) => h.acertou).length;
  const niveisDominados = prog.filter((p) => p.concluido).length;

  return (
    <AppShell
      titulo="Minha evolução"
      nome={perfil?.nome ?? "Aluno"}
      xp={perfil?.xp ?? 0}
      isProfessor={isProfessor}
      onSair={async () => {
        await sair();
        navigate({ to: "/" });
      }}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card">
            <Flame className="w-6 h-6 neon-amber mb-2" />
            <p className="text-3xl font-bold neon-amber">{perfil?.xp ?? 0}</p>
            <p className="text-xs txt-dim mt-1">XP acumulado</p>
          </div>
          <div className="card">
            <Trophy className="w-6 h-6 neon mb-2" />
            <p className="text-3xl font-bold neon">{niveisDominados}</p>
            <p className="text-xs txt-dim mt-1">Níveis dominados (80%+)</p>
          </div>
          <div className="card">
            <Target className="w-6 h-6 neon-violet mb-2" />
            <p className="text-3xl font-bold neon-violet">{acertos}</p>
            <p className="text-xs txt-dim mt-1">Acertos nos últimos 30 desafios</p>
          </div>
        </div>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider txt-dim mb-3">
            Aproveitamento por nível
          </h2>
          {carregando ? (
            <Loader2 className="w-5 h-5 neon animate-spin" />
          ) : prog.length === 0 ? (
            <p className="txt-dim text-sm">Nenhum treino concluído ainda. Bora começar!</p>
          ) : (
            <div className="space-y-3">
              {prog.map((p) => {
                const nome = LINGUAGENS.find((l) => l.id === p.language)?.nome ?? p.language;
                const pct = Math.round((p.melhor_pontuacao / DESAFIOS_POR_NIVEL) * 100);
                return (
                  <div key={`${p.language}-${p.level}`} className="card">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">
                        {nome} ·{" "}
                        <span className="txt-dim">
                          {isNivel(p.level) ? NIVEL_LABEL[p.level] : p.level}
                        </span>
                      </p>
                      <span className="neon-amber text-sm font-semibold">{pct}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs txt-faint mt-2">
                      {p.tentativas_nivel} tentativa(s) de nível ·{" "}
                      {p.concluido ? "nível dominado" : "ainda não liberou o próximo"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider txt-dim mb-3">
            Histórico recente
          </h2>
          {hist.length === 0 ? (
            <p className="txt-dim text-sm">Sem tentativas registradas.</p>
          ) : (
            <div className="card divide-y" style={{ padding: 0 }}>
              {hist.map((h) => (
                <div key={h.id} className="flex items-center gap-3 p-3 divider">
                  {h.acertou ? (
                    <CheckCircle2 className="w-4 h-4 neon shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 neon-red shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">
                      {LINGUAGENS.find((l) => l.id === h.language)?.nome ?? h.language} ·{" "}
                      {isNivel(h.level) ? NIVEL_LABEL[h.level] : h.level} · {h.challenge_id}
                    </p>
                    <p className="text-xs txt-faint">
                      {new Date(h.created_at).toLocaleString("pt-BR")} · {h.tentativas} tentativa(s)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
