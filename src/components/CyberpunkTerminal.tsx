import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Cpu,
  Flame,
  Zap,
  Target,
  Trophy,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Share2,
  Sparkles,
  Award,
  Medal,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { executarComandoSimulado, type ResultadoComando } from "@/lib/terminalSim";
import {
  AREA_LABEL,
  BADGES,
  MISSOES,
  badgePorId,
  patenteDe,
  progressoPatente,
  proximaPatente,
  xpDoComando,
} from "@/lib/terminalGame";
import { analisarComandoTerminal, type AnaliseTerminal } from "@/lib/tutorTerminal.functions";

type Linha = { tipo: "prompt" | "saida" | "erro" | "sistema"; texto: string };

type Estado = {
  xp: number;
  comandosOk: number;
  comandosErro: number;
  melhorCombo: number;
  streakDias: number;
  ultimaPratica: string | null;
  badges: string[];
};

const ESTADO_INICIAL: Estado = {
  xp: 0,
  comandosOk: 0,
  comandosErro: 0,
  melhorCombo: 0,
  streakDias: 0,
  ultimaPratica: null,
  badges: [],
};

const BOAS_VINDAS: Linha[] = [
  { tipo: "sistema", texto: "CYBER-LAB v5.0 — ambiente de treino DevOps conectado." },
  { tipo: "sistema", texto: "Cada comando vale XP. Erros valem explicação. Digite 'help' ou 'missoes'." },
];

const hoje = () => new Date().toISOString().slice(0, 10);

function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function CyberpunkTerminal({ user }: { user: User }) {
  const [linhas, setLinhas] = useState<Linha[]>(BOAS_VINDAS);
  const [entrada, setEntrada] = useState("");
  const [historico, setHistorico] = useState<string[]>([]);
  const [posHistorico, setPosHistorico] = useState<number | null>(null);

  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL);
  const [combo, setCombo] = useState(0);
  const [xpSessao, setXpSessao] = useState(0);
  const [missoesFeitas, setMissoesFeitas] = useState<string[]>([]);
  const [areasDominadas, setAreasDominadas] = useState<string[]>([]);
  const [contagemArea, setContagemArea] = useState<Record<string, number>>({});

  const [analise, setAnalise] = useState<AnaliseTerminal | null>(null);
  const [comandoAnalisado, setComandoAnalisado] = useState("");
  const [analisando, setAnalisando] = useState(false);
  const [ultimoAcerto, setUltimoAcerto] = useState<boolean | null>(null);
  const [conquistaNova, setConquistaNova] = useState<string | null>(null);
  const [ganhoFlash, setGanhoFlash] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [ranking, setRanking] = useState<
    Array<{ nome: string; xp: number; melhor_combo: number; badges: string[] }>
  >([]);

  const fimDoLog = useRef<HTMLDivElement | null>(null);
  const campo = useRef<HTMLInputElement | null>(null);
  const errouAntes = useRef(false);

  // ---- carregamento do progresso do aluno ----
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const { data } = await supabase
        .from("terminal_stats")
        .select("xp, comandos_ok, comandos_erro, melhor_combo, streak_dias, ultima_pratica, badges")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelado || !data) return;
      setEstado({
        xp: data.xp,
        comandosOk: data.comandos_ok,
        comandosErro: data.comandos_erro,
        melhorCombo: data.melhor_combo,
        streakDias: data.streak_dias,
        ultimaPratica: data.ultima_pratica,
        badges: data.badges ?? [],
      });
    })();
    return () => {
      cancelado = true;
    };
  }, [user.id]);

  const carregarRanking = useCallback(async () => {
    const { data } = await supabase.rpc("terminal_ranking");
    setRanking((data ?? []) as typeof ranking);
  }, []);

  useEffect(() => {
    void carregarRanking();
  }, [carregarRanking]);

  useEffect(() => {
    fimDoLog.current?.scrollIntoView({ behavior: "smooth" });
  }, [linhas]);

  const patente = patenteDe(estado.xp);
  const proxima = proximaPatente(estado.xp);
  const progresso = Math.round(progressoPatente(estado.xp) * 100);

  const persistir = useCallback(
    async (novo: Estado) => {
      await supabase.from("terminal_stats").upsert(
        {
          user_id: user.id,
          xp: novo.xp,
          comandos_ok: novo.comandosOk,
          comandos_erro: novo.comandosErro,
          melhor_combo: novo.melhorCombo,
          streak_dias: novo.streakDias,
          ultima_pratica: novo.ultimaPratica,
          badges: novo.badges,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    },
    [user.id],
  );

  const escrever = (novas: Linha[]) => setLinhas((atual) => [...atual, ...novas]);

  const executar = async (comandoBruto: string) => {
    const comando = comandoBruto.trim();
    if (!comando) return;

    setHistorico((h) => [...h, comando]);
    setPosHistorico(null);

    const resultado: ResultadoComando = executarComandoSimulado(comando);

    if (resultado.output === "__CLEAR__") {
      setLinhas([]);
      return;
    }

    escrever([{ tipo: "prompt", texto: comando }]);

    if (resultado.output === "__MISSOES__") {
      const pendentes = MISSOES.filter((m) => !missoesFeitas.includes(m.id));
      escrever([
        {
          tipo: "sistema",
          texto: pendentes.length
            ? pendentes.map((m) => `[ ] ${m.titulo} — ${m.descricao} (+${m.xp} XP)`).join("\n")
            : "Todas as missões concluídas. Você domina este laboratório.",
        },
      ]);
      return;
    }

    if (resultado.area === "sistema") {
      escrever([{ tipo: "sistema", texto: resultado.output }]);
      return;
    }

    escrever([{ tipo: resultado.ok ? "saida" : "erro", texto: resultado.output }]);

    // ---- gamificação ----
    const comboAtual = resultado.ok ? combo + 1 : 0;
    setCombo(comboAtual);

    let ganho = xpDoComando(resultado, combo);
    const novasBadges: string[] = [];
    const novasMissoes: string[] = [];

    if (resultado.ok) {
      for (const missao of MISSOES) {
        if (!missoesFeitas.includes(missao.id) && missao.combina(comando, resultado)) {
          novasMissoes.push(missao.id);
          ganho += missao.xp;
        }
      }
    }

    const contagem = { ...contagemArea };
    if (resultado.ok) contagem[resultado.area] = (contagem[resultado.area] ?? 0) + 1;
    setContagemArea(contagem);

    const areas = Object.keys(contagem).filter((a) => (contagem[a] ?? 0) > 0);
    setAreasDominadas(areas);

    const jaTem = (id: string) => estado.badges.includes(id) || novasBadges.includes(id);
    if (resultado.ok && !jaTem("primeiro-acerto")) novasBadges.push("primeiro-acerto");
    if (comboAtual >= 5 && !jaTem("combo-5")) novasBadges.push("combo-5");
    if (comboAtual >= 10 && !jaTem("combo-10")) novasBadges.push("combo-10");
    if (resultado.ok && errouAntes.current && !jaTem("sobrevivente")) novasBadges.push("sobrevivente");
    if ((contagem["docker"] ?? 0) >= 5 && !jaTem("capitao-docker")) novasBadges.push("capitao-docker");
    if ((contagem["kubernetes"] ?? 0) >= 5 && !jaTem("timoneiro-k8s")) novasBadges.push("timoneiro-k8s");
    if (missoesFeitas.length + novasMissoes.length >= 5 && !jaTem("cacador-missoes"))
      novasBadges.push("cacador-missoes");
    if (areas.length >= 4 && !jaTem("poliglota")) novasBadges.push("poliglota");

    errouAntes.current = !resultado.ok;

    const dia = hoje();
    let streak = estado.streakDias;
    if (estado.ultimaPratica !== dia) {
      const distancia = estado.ultimaPratica ? diasEntre(estado.ultimaPratica, dia) : 999;
      streak = distancia === 1 ? estado.streakDias + 1 : 1;
    }
    if (streak === 0) streak = 1;

    const novoEstado: Estado = {
      xp: estado.xp + ganho,
      comandosOk: estado.comandosOk + (resultado.ok ? 1 : 0),
      comandosErro: estado.comandosErro + (resultado.ok ? 0 : 1),
      melhorCombo: Math.max(estado.melhorCombo, comboAtual),
      streakDias: streak,
      ultimaPratica: dia,
      badges: [...estado.badges, ...novasBadges],
    };

    setEstado(novoEstado);
    if (novasMissoes.length) setMissoesFeitas((m) => [...m, ...novasMissoes]);
    if (ganho > 0) {
      setXpSessao((x) => x + ganho);
      setGanhoFlash(ganho);
      window.setTimeout(() => setGanhoFlash(null), 1600);
      escrever([{ tipo: "sistema", texto: `+${ganho} XP${comboAtual > 1 ? ` · combo x${comboAtual}` : ""}` }]);
    }
    if (novasMissoes.length) {
      const titulos = novasMissoes.map((id) => MISSOES.find((m) => m.id === id)?.titulo).filter(Boolean);
      escrever([{ tipo: "sistema", texto: `MISSÃO CONCLUÍDA: ${titulos.join(", ")}` }]);
    }
    if (novasBadges[0]) setConquistaNova(novasBadges[0]);

    void persistir(novoEstado);

    // ---- tutor de IA: explica erro E acerto ----
    setAnalisando(true);
    setAnalise(null);
    setComandoAnalisado(comando);
    setUltimoAcerto(resultado.ok);
    try {
      const r = await analisarComandoTerminal({
        data: {
          comando,
          saida: resultado.output,
          acertou: resultado.ok,
          conceito: resultado.conceito,
          area: resultado.area,
          combo: comboAtual,
        },
      });
      setAnalise(r);
    } catch {
      setAnalise(null);
    } finally {
      setAnalisando(false);
    }
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = entrada;
    setEntrada("");
    void executar(cmd);
  };

  const navegarHistorico = (direcao: -1 | 1) => {
    if (!historico.length) return;
    const atual = posHistorico ?? historico.length;
    const novo = Math.min(Math.max(atual + direcao, 0), historico.length);
    setPosHistorico(novo);
    setEntrada(novo === historico.length ? "" : (historico[novo] ?? ""));
  };

  const compartilhar = async () => {
    const texto = `Sou ${patente.nome} no DevOps Trainer: ${estado.xp} XP no terminal, combo máximo x${estado.melhorCombo} e ${estado.badges.length} conquistas. Consegue me superar?`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "DevOps Trainer", text: texto, url: window.location.origin });
      } else {
        await navigator.clipboard.writeText(`${texto} ${window.location.origin}`);
      }
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2200);
    } catch {
      /* usuário cancelou */
    }
  };

  const destaque = useMemo(() => {
    const trecho = analise?.trechoDestaque?.trim();
    if (!trecho || !comandoAnalisado.includes(trecho)) return null;
    const idx = comandoAnalisado.indexOf(trecho);
    return {
      antes: comandoAnalisado.slice(0, idx),
      meio: trecho,
      depois: comandoAnalisado.slice(idx + trecho.length),
    };
  }, [analise, comandoAnalisado]);

  const missaoAtiva = MISSOES.find((m) => !missoesFeitas.includes(m.id));

  return (
    <div className="space-y-6">
      {/* HUD */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card !p-4">
          <div className="flex items-center gap-2 text-xs txt-dim mb-1">
            <Award className="w-4 h-4 neon" /> Patente
          </div>
          <p className={`font-bold ${patente.cor}`}>{patente.nome}</p>
          <div className="progress-track mt-3">
            <div className="progress-fill" style={{ width: `${progresso}%` }} />
          </div>
          <p className="text-[11px] txt-faint mt-1.5">
            {proxima ? `${proxima.xpMinimo - estado.xp} XP para ${proxima.nome}` : "Patente máxima alcançada"}
          </p>
        </div>

        <div className="card !p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 text-xs txt-dim mb-1">
            <Zap className="w-4 h-4 neon-amber" /> XP total
          </div>
          <p className="text-2xl font-bold neon-amber">{estado.xp}</p>
          <p className="text-[11px] txt-faint mt-1">+{xpSessao} nesta sessão</p>
          {ganhoFlash !== null && (
            <span className="absolute right-3 top-3 badge-neon pulse-neon">+{ganhoFlash} XP</span>
          )}
        </div>

        <div className="card !p-4">
          <div className="flex items-center gap-2 text-xs txt-dim mb-1">
            <Flame className="w-4 h-4 neon" /> Combo
          </div>
          <p className="text-2xl font-bold neon">x{combo}</p>
          <p className="text-[11px] txt-faint mt-1">recorde x{estado.melhorCombo}</p>
        </div>

        <div className="card !p-4">
          <div className="flex items-center gap-2 text-xs txt-dim mb-1">
            <Target className="w-4 h-4 neon-violet" /> Precisão
          </div>
          <p className="text-2xl font-bold neon-violet">
            {estado.comandosOk + estado.comandosErro > 0
              ? Math.round((estado.comandosOk / (estado.comandosOk + estado.comandosErro)) * 100)
              : 0}
            %
          </p>
          <p className="text-[11px] txt-faint mt-1">
            {estado.comandosOk} acertos · {estado.comandosErro} falhas · {estado.streakDias}d de ofensiva
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Terminal */}
        <div className="xl:col-span-2 card !p-0 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b divider glass-bar">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--neon-4)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--neon-2)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--neon)]" />
              <span className="ml-2 text-xs font-semibold tracking-wide txt-dim">
                devops@cyber-lab: ~/app
              </span>
            </div>
            {missaoAtiva && (
              <span className="badge-violet hidden sm:inline-flex">
                <Target className="w-3 h-3" /> {missaoAtiva.titulo}
              </span>
            )}
          </div>

          <div
            className="flex-1 min-h-[420px] max-h-[520px] overflow-y-auto p-4 space-y-1.5 font-mono text-[12.5px] leading-relaxed cursor-text"
            onClick={() => campo.current?.focus()}
          >
            {linhas.map((linha, i) => (
              <div
                key={i}
                className={
                  linha.tipo === "prompt"
                    ? "neon-amber font-semibold"
                    : linha.tipo === "erro"
                      ? "neon-red whitespace-pre-wrap"
                      : linha.tipo === "sistema"
                        ? "neon-violet whitespace-pre-wrap"
                        : "txt-dim whitespace-pre-wrap"
                }
              >
                {linha.tipo === "prompt" ? `devops@cyber-lab:~$ ${linha.texto}` : linha.texto}
              </div>
            ))}
            <div ref={fimDoLog} />
          </div>

          <form onSubmit={enviar} className="flex items-center gap-2 px-4 py-3 border-t divider">
            <span className="font-mono text-sm neon">$</span>
            <input
              ref={campo}
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  navegarHistorico(-1);
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  navegarHistorico(1);
                }
              }}
              placeholder="docker run -d -p 80:80 nginx:alpine"
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-transparent outline-none font-mono text-[13px] text-[var(--neon-2)] placeholder:text-[var(--txt-faint)]"
            />
            <button type="submit" className="btn-primary !py-1.5 !px-3 !text-xs">
              Executar <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Tutor */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Cpu className="w-4 h-4 neon pulse-neon" />
              <span className="title-glow">Tutor DevOps</span>
            </div>
            {analise && (
              <span className={analise.origem === "ia" ? "badge-neon" : "badge-muted"}>
                {analise.origem === "ia" ? "IA" : "offline"}
              </span>
            )}
          </div>

          {analisando && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 txt-dim text-sm">
              <Loader2 className="w-5 h-5 neon animate-spin" />
              <span>Analisando seu comando…</span>
            </div>
          )}

          {!analisando && !analise && (
            <div className="text-sm txt-faint text-center py-16 space-y-2">
              <Sparkles className="w-6 h-6 mx-auto neon-violet" />
              <p className="txt-dim">O tutor comenta cada comando.</p>
              <p>Acertou, ele explica o porquê. Errou, ele mostra a correção.</p>
            </div>
          )}

          {!analisando && analise && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                {ultimoAcerto ? (
                  <CheckCircle2 className="w-4 h-4 neon" />
                ) : (
                  <ShieldAlert className="w-4 h-4 neon-red" />
                )}
                <span className={`font-semibold ${ultimoAcerto ? "neon" : "neon-red"}`}>{analise.titulo}</span>
              </div>

              {destaque && (
                <div className="glass rounded-xl p-3">
                  <p className="text-[11px] txt-faint mb-1.5">Comando analisado</p>
                  <p className="font-mono text-[12px] txt-dim break-all">
                    {destaque.antes}
                    <span
                      className={`px-1 py-0.5 rounded font-bold ${
                        ultimoAcerto
                          ? "text-[var(--neon)] bg-[rgba(255,122,26,0.16)]"
                          : "text-[var(--neon-4)] bg-[rgba(255,77,77,0.16)]"
                      }`}
                    >
                      {destaque.meio}
                    </span>
                    {destaque.depois}
                  </p>
                </div>
              )}

              <p className="txt-dim leading-relaxed">{analise.resumo}</p>
              <p className="leading-relaxed">{analise.detalhe}</p>

              <div>
                <p className="text-[11px] txt-faint mb-1.5">
                  {ultimoAcerto ? "Evolua o comando" : "Como corrigir"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEntrada(analise.sugestao);
                    campo.current?.focus();
                  }}
                  className="code-area block text-left !min-h-0 w-full hover:border-[rgba(255,176,32,0.6)]"
                >
                  {analise.sugestao}
                </button>
              </div>

              <p className="text-xs neon-violet leading-relaxed">{analise.proximoPasso}</p>
            </div>
          )}
        </div>
      </div>

      {/* Missões, conquistas e ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 neon-violet" />
            <h2 className="font-semibold title-glow text-sm">Missões do laboratório</h2>
            <span className="badge-muted ml-auto">
              {missoesFeitas.length}/{MISSOES.length}
            </span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {MISSOES.map((m) => {
              const feita = missoesFeitas.includes(m.id);
              return (
                <div
                  key={m.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    feita
                      ? "border-[rgba(255,122,26,0.4)] bg-[rgba(255,122,26,0.08)]"
                      : "border-[var(--glass-border)] bg-white/[0.025]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium ${feita ? "neon" : ""}`}>{m.titulo}</span>
                    <span className={feita ? "badge-neon" : "badge-muted"}>+{m.xp} XP</span>
                  </div>
                  <p className="text-xs txt-faint mt-1">{m.descricao}</p>
                  <span className="badge-muted mt-2">{AREA_LABEL[m.area]}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Medal className="w-4 h-4 neon-amber" />
            <h2 className="font-semibold title-glow text-sm">Conquistas</h2>
            <span className="badge-muted ml-auto">
              {estado.badges.length}/{BADGES.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {BADGES.map((b) => {
              const tem = estado.badges.includes(b.id);
              return (
                <div
                  key={b.id}
                  title={b.descricao}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    tem
                      ? "border-[rgba(255,176,32,0.45)] bg-[rgba(255,176,32,0.08)]"
                      : "border-[var(--glass-border)] opacity-40"
                  }`}
                >
                  <div className="text-xl">{b.emoji}</div>
                  <p className={`text-[11px] mt-1 font-medium ${tem ? "neon-amber" : "txt-faint"}`}>{b.nome}</p>
                </div>
              );
            })}
          </div>
          <button onClick={compartilhar} className="btn-secondary w-full mt-4">
            <Share2 className="w-4 h-4" />
            {copiado ? "Copiado! Cole no seu grupo" : "Desafiar a galera"}
          </button>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 neon" />
            <h2 className="font-semibold title-glow text-sm">Ranking do terminal</h2>
          </div>
          {ranking.length === 0 ? (
            <p className="text-sm txt-faint py-8 text-center">
              Ninguém pontuou ainda. Execute comandos e seja o primeiro do quadro.
            </p>
          ) : (
            <ol className="space-y-2">
              {ranking.slice(0, 10).map((r, i) => (
                <li
                  key={`${r.nome}-${i}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-white/[0.025] px-3 py-2"
                >
                  <span className={`text-sm font-bold w-6 ${i === 0 ? "neon-amber" : "txt-faint"}`}>
                    {i + 1}º
                  </span>
                  <span className="text-sm flex-1 truncate">{r.nome}</span>
                  <span className="text-xs neon-amber font-semibold">{r.xp} XP</span>
                </li>
              ))}
            </ol>
          )}
          <button onClick={() => void carregarRanking()} className="btn-ghost w-full mt-3 justify-center">
            Atualizar quadro
          </button>
        </div>
      </div>

      {/* Conquista desbloqueada */}
      {conquistaNova && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="card max-w-sm w-full text-center">
            <div className="text-5xl mb-3">{badgePorId(conquistaNova)?.emoji}</div>
            <p className="badge-neon mx-auto mb-3">Conquista desbloqueada</p>
            <h3 className="text-xl font-bold title-glow mb-1">{badgePorId(conquistaNova)?.nome}</h3>
            <p className="text-sm txt-dim mb-5">{badgePorId(conquistaNova)?.descricao}</p>
            <div className="flex gap-2">
              <button onClick={compartilhar} className="btn-secondary flex-1">
                <Share2 className="w-4 h-4" /> Compartilhar
              </button>
              <button onClick={() => setConquistaNova(null)} className="btn-primary flex-1">
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {areasDominadas.length > 0 && (
        <p className="text-xs txt-faint text-center">
          Áreas praticadas nesta sessão: {areasDominadas.map((a) => AREA_LABEL[a as keyof typeof AREA_LABEL]).join(" · ")}
        </p>
      )}
    </div>
  );
}
