import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Radio, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Presenca = {
  user_id: string;
  nome: string;
  atividade: string;
  language: string | null;
  level: string | null;
  xp: number;
  last_seen: string;
};

type Mensagem = {
  id: string;
  user_id: string;
  nome: string;
  corpo: string;
  created_at: string;
};

const JANELA_ONLINE_MS = 2 * 60 * 1000;

/**
 * Card "Quem está treinando agora?" — presença ao vivo + chat da sala.
 * Mantém o heartbeat da presença enquanto montado.
 */
export function LiveLounge({
  userId,
  nome,
  xp,
  atividade,
  language,
  level,
  compacto = false,
}: {
  userId: string | undefined;
  nome: string;
  xp: number;
  atividade: string;
  language?: string | null;
  level?: string | null;
  compacto?: boolean;
}) {
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement | null>(null);

  // heartbeat de presença
  useEffect(() => {
    if (!userId) return;
    let vivo = true;
    const bater = async () => {
      if (!vivo) return;
      await supabase.from("training_presence").upsert(
        {
          user_id: userId,
          nome,
          xp,
          atividade,
          language: language ?? null,
          level: level ?? null,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    };
    void bater();
    const t = setInterval(bater, 30_000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [userId, nome, xp, atividade, language, level]);

  const carregarPresencas = async () => {
    const desde = new Date(Date.now() - JANELA_ONLINE_MS).toISOString();
    const { data } = await supabase
      .from("training_presence")
      .select("user_id, nome, atividade, language, level, xp, last_seen")
      .gte("last_seen", desde)
      .order("last_seen", { ascending: false })
      .limit(30);
    setPresencas((data ?? []) as Presenca[]);
  };

  useEffect(() => {
    void carregarPresencas();
    const t = setInterval(() => void carregarPresencas(), 20_000);
    return () => clearInterval(t);
  }, []);

  // mensagens + realtime
  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase
        .from("lounge_messages")
        .select("id, user_id, nome, corpo, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!ativo) return;
      setMensagens(((data ?? []) as Mensagem[]).reverse());
    })();

    const canal = supabase
      .channel("lounge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lounge_messages" },
        (payload) => {
          setMensagens((atual) => [...atual, payload.new as Mensagem].slice(-80));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "training_presence" },
        () => void carregarPresencas(),
      )
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, []);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens.length]);

  const online = useMemo(
    () => presencas.filter((p) => p.user_id !== userId),
    [presencas, userId],
  );

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const corpo = texto.trim();
    if (!corpo || !userId) return;
    setEnviando(true);
    setTexto("");
    await supabase.from("lounge_messages").insert({ user_id: userId, nome, corpo });
    setEnviando(false);
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b divider">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="kicker">Quem está treinando agora?</span>
        </div>
        <span className="badge-neon">
          <Users className="w-3 h-3" />
          {presencas.length}
        </span>
      </div>

      <div className="px-5 py-4 space-y-2 max-h-44 overflow-y-auto">
        {presencas.length === 0 && (
          <p className="text-xs txt-faint">Ninguém online agora. Seja o primeiro a treinar.</p>
        )}
        {presencas.map((p) => (
          <div key={p.user_id} className="flex items-center gap-3">
            <span
              className="w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold"
              style={{
                background: p.user_id === userId ? "var(--neon)" : "rgba(139,92,255,.25)",
                color: p.user_id === userId ? "#0d0a02" : "var(--txt)",
              }}
            >
              {p.nome.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">
                {p.nome}
                {p.user_id === userId && <span className="txt-faint"> (você)</span>}
              </p>
              <p className="text-[11px] txt-faint truncate">
                {p.atividade}
                {p.language ? ` · ${p.language}` : ""}
                {p.level ? ` / ${p.level}` : ""}
              </p>
            </div>
            <span className="text-[11px] neon font-semibold">{p.xp} XP</span>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-t divider flex items-center gap-2">
        <Radio className="w-3.5 h-3.5 neon-amber" />
        <span className="kicker-dim">Sala aberta · {online.length} colegas</span>
      </div>

      <div
        className="px-5 py-4 space-y-2 overflow-y-auto"
        style={{ maxHeight: compacto ? "12rem" : "16rem" }}
      >
        {mensagens.length === 0 && (
          <p className="text-xs txt-faint">Manda um "salve" pra galera da sala.</p>
        )}
        {mensagens.map((m) => (
          <div
            key={m.id}
            className={`chat-bubble ${m.user_id === userId ? "chat-bubble-own" : ""}`}
          >
            <p className="text-[10px] uppercase tracking-widest txt-faint mb-0.5">{m.nome}</p>
            <p className="break-words">{m.corpo}</p>
          </div>
        ))}
        <div ref={fim} />
      </div>

      <form onSubmit={enviar} className="flex gap-2 px-5 pb-5">
        <input
          className="input-field"
          value={texto}
          maxLength={280}
          placeholder={userId ? "Escreva para a sala..." : "Entre para conversar"}
          disabled={!userId}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button className="btn-primary" disabled={!userId || enviando || !texto.trim()}>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
