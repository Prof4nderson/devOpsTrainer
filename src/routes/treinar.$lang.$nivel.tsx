import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Heart,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Trophy,
  RotateCcw,
  ChevronLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { pedirFeedback } from "@/lib/assistente.functions";
import {
  CHANCES_POR_DESAFIO,
  DESAFIOS_POR_NIVEL,
  APROVEITAMENTO_MINIMO,
  NIVEL_LABEL,
  getDesafio,
  getLinguagem,
  isNivel,
  sortearDesafios,
  verificarResposta,
  xpDoNivel,
  type Desafio,
  type Nivel,
} from "@/lib/challenges";

export const Route = createFileRoute("/treinar/$lang/$nivel")({
  head: () => ({
    meta: [
      { title: "Treino em andamento — DevOps Trainer" },
      {
        name: "description",
        content:
          "Resolva 10 desafios sorteados com 3 chances cada e receba dicas do tutor sem nunca ver a resposta pronta.",
      },
      { property: "og:title", content: "Treino em andamento — DevOps Trainer" },
      {
        property: "og:description",
        content: "Desafios de sintaxe e múltipla escolha com feedback imediato do tutor DevOps.",
      },
    ],
  }),
  component: Treino,
});

type Estado = "carregando" | "jogando" | "fim";

function Treino() {
  const { lang, nivel: nivelParam } = Route.useParams();
  const navigate = useNavigate();
  const { user, perfil, loading, recarregarPerfil } = useAuth();

  const nivel = (isNivel(nivelParam) ? nivelParam : "facil") as Nivel;
  const linguagem = getLinguagem(lang);

  const [estado, setEstado] = useState<Estado>("carregando");
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [indice, setIndice] = useState(0);
  const [pontos, setPontos] = useState(0);
  const [tentativas, setTentativas] = useState(0);
  const [resposta, setResposta] = useState("");
  const [resolvido, setResolvido] = useState<null | "acertou" | "errou">(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pensando, setPensando] = useState(false);
  const iniciado = useRef(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || !linguagem || iniciado.current) return;
    iniciado.current = true;
    (async () => {
      const sorteados = sortearDesafios(lang, nivel, DESAFIOS_POR_NIVEL);
      const { data } = await supabase
        .from("training_sessions")
        .insert({
          user_id: user.id,
          language: lang,
          level: nivel,
          challenge_ids: sorteados,
          current_index: 0,
          score: 0,
          status: "em_andamento",

        })
        .select("id")
        .single();
      setSessaoId(data?.id ?? null);
      setIds(sorteados);
      setEstado("jogando");
    })();
  }, [user, linguagem, lang, nivel]);

  const desafio: Desafio | undefined = useMemo(
    () => (ids[indice] ? getDesafio(lang, nivel, ids[indice]!) : undefined),
    [ids, indice, lang, nivel],
  );

  if (!linguagem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center">
          <p className="mb-4">Linguagem não encontrada.</p>
          <Link to="/painel" className="btn-primary">
            Voltar ao painel
          </Link>
        </div>
      </div>
    );
  }

  if (estado === "carregando" || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 neon animate-spin" />
      </div>
    );
  }

  const responder = async () => {
    if (!desafio || resolvido || !resposta.trim() || pensando) return;
    const acertou = verificarResposta(desafio, resposta);
    const novasTentativas = tentativas + 1;
    const restantes = CHANCES_POR_DESAFIO - novasTentativas;
    const encerrou = acertou || restantes <= 0;

    if (!acertou) setTentativas(novasTentativas);
    setPensando(true);

    if (encerrou) {
      setResolvido(acertou ? "acertou" : "errou");
      if (acertou) setPontos((p) => p + 1);
    }

    if (encerrou && sessaoId) {
      await supabase.from("challenge_attempts").insert({
        user_id: user.id,
        session_id: sessaoId,
        language: lang,
        level: nivel,
        challenge_id: desafio.id,
        ultima_resposta: resposta,
        acertou,
        tentativas: novasTentativas,
      });
    }


    try {
      const r = await pedirFeedback({
        data: {
          linguagem: lang,
          nivel,
          desafioId: desafio.id,
          pergunta: desafio.pergunta,
          respostaAluno: resposta,
          acertou,
          tentativasRestantes: Math.max(restantes, 0),
          explicacao: desafio.explicacao,
          dica: desafio.dica,
        },
      });
      setFeedback(r.mensagem);
    } catch {
      setFeedback(
        acertou
          ? "Boa! Resposta correta."
          : restantes > 0
            ? `Ainda não. Dica: ${desafio.dica}`
            : `Sem tentativas. ${desafio.explicacao}`,
      );
    } finally {
      setPensando(false);
    }
  };

  const proximo = async () => {
    const ultimo = indice + 1 >= ids.length;
    if (!ultimo) {
      setIndice((i) => i + 1);
      setTentativas(0);
      setResposta("");
      setResolvido(null);
      setFeedback(null);
      if (sessaoId) {
        await supabase
          .from("training_sessions")
          .update({ current_index: indice + 1, score: pontos })
          .eq("id", sessaoId);
      }
      return;
    }
    await finalizar();
  };

  const finalizar = async () => {
    setEstado("fim");
    if (sessaoId) {
      await supabase
        .from("training_sessions")
        .update({
          current_index: ids.length,
          score: pontos,
          status: "concluida",
          finished_at: new Date().toISOString(),
        })
        .eq("id", sessaoId);
    }

    const { data: atual } = await supabase
      .from("level_progress")
      .select("melhor_pontuacao, tentativas_nivel")
      .eq("user_id", user.id)
      .eq("language", lang)
      .eq("level", nivel)
      .maybeSingle();

    const melhor = Math.max(atual?.melhor_pontuacao ?? 0, pontos);

    await supabase.from("level_progress").upsert(
      {
        user_id: user.id,
        language: lang,
        level: nivel,
        melhor_pontuacao: melhor,
        tentativas_nivel: (atual?.tentativas_nivel ?? 0) + 1,
        concluido: melhor / ids.length >= APROVEITAMENTO_MINIMO,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,language,level" },
    );


    const ganho = pontos * xpDoNivel(nivel);
    await supabase
      .from("profiles")
      .update({ xp: (perfil?.xp ?? 0) + ganho })
      .eq("id", user.id);
    await recarregarPerfil();
  };

  if (estado === "fim") {
    const pct = Math.round((pontos / ids.length) * 100);
    const passou = pct >= APROVEITAMENTO_MINIMO * 100;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="card max-w-md w-full text-center">
          <Trophy className={`w-14 h-14 mx-auto mb-4 ${passou ? "neon-amber" : "txt-dim"}`} />
          <h1 className="text-2xl font-bold title-glow mb-2">
            {passou ? "Nível dominado!" : "Quase lá!"}
          </h1>
          <p className="txt-dim text-sm mb-6">
            {linguagem.nome} · {NIVEL_LABEL[nivel]}
          </p>
          <div className="text-5xl font-bold neon mb-2">{pct}%</div>
          <p className="txt-dim text-sm mb-6">
            {pontos} de {ids.length} desafios corretos · +{pontos * xpDoNivel(nivel)} XP
          </p>
          <p className={`text-sm mb-6 ${passou ? "neon" : "neon-amber"}`}>
            {passou
              ? "Você atingiu 80% e liberou o próximo nível desta linguagem."
              : "É preciso 80% de aproveitamento para liberar o próximo nível. Bora de novo!"}
          </p>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="btn-secondary flex-1">
              <RotateCcw className="w-4 h-4" /> Repetir
            </button>
            <Link to="/painel" className="btn-primary flex-1">
              Painel <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!desafio) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 neon animate-spin" />
      </div>
    );
  }

  const vidas = CHANCES_POR_DESAFIO - tentativas;

  return (
    <div className="min-h-screen relative z-10 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link to="/painel" className="btn-ghost">
            <ChevronLeft className="w-4 h-4" /> Sair do treino
          </Link>
          <div className="flex items-center gap-1">
            {Array.from({ length: CHANCES_POR_DESAFIO }).map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 ${i < vidas ? "neon-red fill-current" : "txt-faint"}`}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs txt-dim mb-2">
            <span>
              {linguagem.nome} · {NIVEL_LABEL[nivel]} · desafio {indice + 1}/{ids.length}
            </span>
            <span className="neon-amber font-semibold">{pontos} ponto(s)</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(indice / ids.length) * 100}%` }} />
          </div>
        </div>

        <div className="card">
          <span className="badge-neon mb-4 inline-flex">
            {desafio.tipo === "multipla" ? "Múltipla escolha" : "Sintaxe correta"}
          </span>
          <h2 className="text-lg md:text-xl font-semibold mb-6 whitespace-pre-wrap">
            {desafio.pergunta}
          </h2>

          {desafio.tipo === "multipla" ? (
            <div className="space-y-2">
              {(desafio.opcoes ?? []).map((op) => {
                const escolhida = resposta === op;
                const correta = resolvido && op === desafio.resposta;
                const errada = resolvido === "errou" && escolhida && op !== desafio.resposta;
                return (
                  <button
                    key={op}
                    disabled={!!resolvido || pensando}
                    onClick={() => setResposta(op)}
                    className={`option-btn ${escolhida ? "option-selected" : ""} ${
                      correta ? "option-correct" : ""
                    } ${errada ? "option-wrong" : ""}`}

                  >
                    <code className="text-sm">{op}</code>
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              className="input-field font-mono text-sm min-h-24"
              value={resposta}
              disabled={!!resolvido || pensando}
              onChange={(e) => setResposta(e.target.value)}
              placeholder="Digite o comando / trecho de configuração correto"
            />
          )}

          {feedback && (
            <div
              className={`mt-5 p-4 rounded-xl glass flex gap-3 ${
                resolvido === "acertou" ? "option-correct" : resolvido === "errou" ? "option-wrong" : ""
              }`}
            >
              {resolvido === "acertou" ? (
                <CheckCircle2 className="w-5 h-5 neon shrink-0 mt-0.5" />
              ) : resolvido === "errou" ? (
                <XCircle className="w-5 h-5 neon-red shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-5 h-5 neon-amber shrink-0 mt-0.5" />
              )}
              <div className="text-sm">
                <p className="font-semibold mb-1">Tutor DevOps</p>
                <p className="txt-dim whitespace-pre-wrap">{feedback}</p>
                {resolvido === "errou" && (
                  <p className="txt-dim mt-2">
                    <strong className="text-[color:var(--txt)]">Para não errar de novo:</strong>{" "}
                    {desafio.explicacao}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            {!resolvido ? (
              <button onClick={responder} disabled={pensando || !resposta.trim()} className="btn-primary flex-1">
                {pensando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Responder ({vidas} chance{vidas === 1 ? "" : "s"})
              </button>
            ) : (
              <button onClick={proximo} disabled={pensando} className="btn-primary flex-1">
                {indice + 1 >= ids.length ? "Ver resultado" : "Próximo desafio"}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
