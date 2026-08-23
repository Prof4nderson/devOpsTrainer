import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Lock, Play, Loader2, Terminal, SquareTerminal, Container, Boxes, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { AppShell } from "@/components/AppShell";
import {
  LINGUAGENS,
  NIVEIS,
  NIVEL_LABEL,
  APROVEITAMENTO_MINIMO,
  DESAFIOS_POR_NIVEL,
  nivelAnterior,
  type Nivel,
} from "@/lib/challenges";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel de treino — DevOps Trainer" },
      {
        name: "description",
        content:
          "Escolha a linguagem e o nível de dificuldade para iniciar seus 10 desafios sorteados no DevOps Trainer.",
      },
      { property: "og:title", content: "Painel de treino — DevOps Trainer" },
      {
        property: "og:description",
        content: "Escolha linguagem e nível e comece a treinar Bash, PowerShell, Docker ou Kubernetes.",
      },
    ],
  }),
  component: Painel,
});

const ICONES: Record<string, typeof Terminal> = {
  Terminal,
  SquareTerminal,
  Container,
  Boxes,
};

type Progresso = { language: string; level: string; melhor_pontuacao: number };

function Painel() {
  const navigate = useNavigate();
  const { user, perfil, isProfessor, loading, sair } = useAuth();
  const [progresso, setProgresso] = useState<Progresso[]>([]);
  const [linguagemAtiva, setLinguagemAtiva] = useState(LINGUAGENS[0]!.id);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("level_progress")
      .select("language, level, melhor_pontuacao")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setProgresso((data ?? []) as Progresso[]);
        setCarregando(false);
      });
  }, [user]);

  const melhor = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of progresso) map[`${p.language}:${p.level}`] = p.melhor_pontuacao;
    return map;
  }, [progresso]);

  const liberado = (linguagem: string, nivel: Nivel) => {
    const anterior = nivelAnterior(nivel);
    if (!anterior) return true;
    const pontos = melhor[`${linguagem}:${anterior}`] ?? 0;
    return pontos / DESAFIOS_POR_NIVEL >= APROVEITAMENTO_MINIMO;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 neon animate-spin" />
      </div>
    );
  }

  const linguagem = LINGUAGENS.find((l) => l.id === linguagemAtiva)!;

  return (
    <AppShell
      titulo="Escolha seu treino"
      nome={perfil?.nome ?? "Aluno"}
      xp={perfil?.xp ?? 0}
      isProfessor={isProfessor}
      onSair={async () => {
        await sair();
        navigate({ to: "/" });
      }}
    >
      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider txt-dim mb-3">
            1. Linguagem a treinar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LINGUAGENS.map((l) => {
              const Icon = ICONES[l.icone] ?? Terminal;
              const ativa = l.id === linguagemAtiva;
              return (
                <button
                  key={l.id}
                  onClick={() => setLinguagemAtiva(l.id)}
                  className={`card text-left ${ativa ? "border-[color:var(--neon)]" : ""}`}
                  style={ativa ? { borderColor: "var(--neon)" } : undefined}
                >
                  <Icon className={`w-8 h-8 mb-3 ${ativa ? "neon" : "txt-dim"}`} />
                  <p className="font-semibold">{l.nome}</p>
                  <p className="text-xs txt-dim mt-1 leading-relaxed">{l.descricao}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider txt-dim mb-3">
            2. Nível de dificuldade — {linguagem.nome}
          </h2>
          {carregando ? (
            <Loader2 className="w-5 h-5 neon animate-spin" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {NIVEIS.map((nivel) => {
                const ok = liberado(linguagem.id, nivel);
                const pontos = melhor[`${linguagem.id}:${nivel}`] ?? 0;
                const pct = Math.round((pontos / DESAFIOS_POR_NIVEL) * 100);
                const anterior = nivelAnterior(nivel);
                return (
                  <div key={nivel} className="card flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className={ok ? "badge-neon" : "badge-muted"}>{NIVEL_LABEL[nivel]}</span>
                      {pct >= APROVEITAMENTO_MINIMO * 100 && (
                        <span className="badge-violet">
                          <Star className="w-3 h-3" /> dominado
                        </span>
                      )}
                    </div>
                    <p className="text-sm txt-dim mb-4">
                      {DESAFIOS_POR_NIVEL} desafios sorteados · 3 chances cada
                    </p>
                    <div className="mb-2 flex items-center justify-between text-xs txt-faint">
                      <span>Melhor resultado</span>
                      <span className="neon-amber font-semibold">{pct}%</span>
                    </div>
                    <div className="progress-track mb-4">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    {ok ? (
                      <Link
                        to="/treinar/$lang/$nivel"
                        params={{ lang: linguagem.id, nivel }}
                        className="btn-primary w-full mt-auto"
                      >
                        <Play className="w-4 h-4" /> Iniciar treino
                      </Link>
                    ) : (
                      <button disabled className="btn-secondary w-full mt-auto">
                        <Lock className="w-4 h-4" />
                        Faça 80% no {anterior ? NIVEL_LABEL[anterior] : ""}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
