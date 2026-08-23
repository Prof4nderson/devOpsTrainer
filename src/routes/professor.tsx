import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, BookOpen, Plus, Trash2, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { AppShell } from "@/components/AppShell";
import { LINGUAGENS, NIVEIS, NIVEL_LABEL } from "@/lib/challenges";

export const Route = createFileRoute("/professor")({
  head: () => ({
    meta: [
      { title: "Base do professor (RAG) — DevOps Trainer" },
      {
        name: "description",
        content:
          "Cadastre o material que orienta as respostas do tutor: dicas, conceitos e limites por linguagem e nível.",
      },
      { property: "og:title", content: "Base do professor (RAG) — DevOps Trainer" },
      {
        property: "og:description",
        content: "Controle o conhecimento usado pelo assistente do DevOps Trainer.",
      },
    ],
  }),
  component: PainelProfessor,
});

type Doc = {
  id: string;
  titulo: string;
  conteudo: string;
  language: string;
  level: string | null;
  ativo: boolean;
};

function PainelProfessor() {
  const navigate = useNavigate();
  const { user, perfil, isProfessor, loading, sair } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [language, setLanguage] = useState(LINGUAGENS[0]!.id);
  const [level, setLevel] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  const carregar = async () => {
    const { data } = await supabase
      .from("rag_documents")
      .select("id, titulo, conteudo, language, level, ativo")
      .order("created_at", { ascending: false });
    setDocs((data ?? []) as Doc[]);
    setCarregando(false);
  };

  useEffect(() => {
    if (user) void carregar();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 neon animate-spin" />
      </div>
    );
  }

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return;
    setSalvando(true);
    await supabase.from("rag_documents").insert({
      autor_id: user.id,
      titulo,
      conteudo,
      language,
      level: level || null,
    });
    setTitulo("");
    setConteudo("");
    setSalvando(false);
    await carregar();
  };

  const alternar = async (doc: Doc) => {
    await supabase.from("rag_documents").update({ ativo: !doc.ativo }).eq("id", doc.id);
    await carregar();
  };

  const remover = async (doc: Doc) => {
    await supabase.from("rag_documents").delete().eq("id", doc.id);
    await carregar();
  };

  return (
    <AppShell
      titulo="Base de conhecimento do tutor (RAG)"
      nome={perfil?.nome ?? "Professor"}
      xp={perfil?.xp ?? 0}
      isProfessor={isProfessor}
      onSair={async () => {
        await sair();
        navigate({ to: "/" });
      }}
    >
      {!isProfessor ? (
        <div className="card">
          <p className="txt-dim text-sm">Esta área é exclusiva de professores.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <form onSubmit={criar} className="card space-y-4 h-fit">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 neon" />
              <h2 className="font-semibold">Novo material</h2>
            </div>
            <p className="text-xs txt-dim">
              O tutor só pode usar este material para dar dicas. Ele nunca entrega a resposta do
              desafio ao aluno.
            </p>
            <input
              className="input-field"
              placeholder="Título (ex.: Redirecionamentos no Bash)"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                className="input-field"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LINGUAGENS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
              <select
                className="input-field"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="">Todos os níveis</option>
                {NIVEIS.map((n) => (
                  <option key={n} value={n}>
                    {NIVEL_LABEL[n]}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              className="code-area min-h-40"
              placeholder="Conteúdo, conceitos e orientações de dica para o tutor..."
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              required
            />
            <button type="submit" disabled={salvando} className="btn-primary w-full">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar à base
            </button>
          </form>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider txt-dim">
              Materiais cadastrados
            </h2>
            {carregando ? (
              <Loader2 className="w-5 h-5 neon animate-spin" />
            ) : docs.length === 0 ? (
              <p className="txt-dim text-sm">Nenhum material ainda.</p>
            ) : (
              docs.map((d) => (
                <div key={d.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{d.titulo}</p>
                      <p className="text-xs txt-faint mt-1">
                        {LINGUAGENS.find((l) => l.id === d.language)?.nome ?? d.language} ·{" "}
                        {d.level ? NIVEL_LABEL[d.level as keyof typeof NIVEL_LABEL] : "todos os níveis"}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => alternar(d)} className="btn-ghost" title="Ativar/desativar">
                        <Power className={`w-4 h-4 ${d.ativo ? "neon" : "txt-faint"}`} />
                      </button>
                      <button onClick={() => remover(d)} className="btn-ghost" title="Remover">
                        <Trash2 className="w-4 h-4 neon-red" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm txt-dim mt-3 line-clamp-4 whitespace-pre-wrap">{d.conteudo}</p>
                </div>
              ))
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
