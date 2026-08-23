import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Terminal, LogIn, UserPlus, Rocket, Shield, Trophy, Loader2, Cpu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DevOps Trainer — Treino gamificado de Bash, PowerShell e Docker" },
      {
        name: "description",
        content:
          "Plataforma gamificada para alunos DevOps treinarem scripting Bash, MS PowerShell, Docker e Kubernetes com desafios sorteados, níveis e acompanhamento de evolução.",
      },
      { property: "og:title", content: "DevOps Trainer — Treino gamificado para alunos DevOps" },
      {
        property: "og:description",
        content:
          "Desafios de múltipla escolha e sintaxe em Bash, PowerShell, Docker e Kubernetes, com níveis progressivos e tutor que só dá dicas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Entrada,
});

function Entrada() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<"aluno" | "professor">("aluno");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel" });
    });
  }, [navigate]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);
    try {
      if (modo === "cadastro") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: `${window.location.origin}/painel`,
            data: { nome, papel },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setAviso("Conta criada! Confirme o e-mail enviado para entrar.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      }
      navigate({ to: "/painel" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível continuar.";
      setErro(
        msg.includes("Invalid login")
          ? "E-mail ou senha inválidos."
          : msg.includes("already registered")
            ? "Este e-mail já tem cadastro. Faça login."
            : msg,
      );
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen relative z-10 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
        <section className="hidden lg:block">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass mb-6">
            <Terminal className="w-8 h-8 neon pulse-neon" />
          </div>
          <h1 className="text-4xl font-bold title-glow leading-tight">
            Qual o seu nível de conhecimento na cultura <span className="neon">DevOps?</span>
          </h1>
          <p className="txt-dim mt-4 max-w-md">
            Teste seus conhecimentos em bash shell, power shell, docker e kubernetes em nosso simulador.
          </p>
          <ul className="mt-8 space-y-4">
            <li className="flex gap-3 items-start">
              <Rocket className="w-5 h-5 neon shrink-0 mt-0.5" />
              <span className="text-sm txt-dim">
                <strong className="text-[color:var(--txt)]">10 desafios por nível</strong>, sorteados
                do banco de questões da linguagem escolhida.
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <Shield className="w-5 h-5 neon-violet shrink-0 mt-0.5" />
              <span className="text-sm txt-dim">
                <strong className="text-[color:var(--txt)]">Agente de IA parceiro.</strong> — só diz se acertou e dá dicas controladas pelo professor.
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <Trophy className="w-5 h-5 neon-amber shrink-0 mt-0.5" />
              <span className="text-sm txt-dim">
                <strong className="text-[color:var(--txt)]">Nível de experiência, conquistas e histórico</strong> de toda a sua evolução.
              </span>
            </li>
          </ul>

          {/* Destaque do Terminal Ciberpunk */}
          <div className="mt-8 p-5 bg-gray-950/80 border border-cyan-500/40 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/30 rounded-lg">
                <Terminal className="w-6 h-6 text-cyan-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-cyan-300 font-mono flex items-center gap-2">
                  Terminal Ciberpunk // Phi-3.5
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Treine comandos Shell/Docker com tutor visual.
                </p>
              </div>
            </div>

            <Link
              to="/terminal"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs rounded-lg transition-all duration-200 shadow-[0_0_10px_rgba(6,182,212,0.4)] whitespace-nowrap flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5" />
              Acessar
            </Link>
          </div>
        </section>

        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass mb-4">
              <Terminal className="w-8 h-8 neon" />
            </div>
            <h1 className="text-3xl font-bold title-glow">Visual Labs - DevOps Trainer</h1>
            <p className="txt-dim mt-2 text-sm">Avaliação para alunos DevOps</p>
          </div>

          <form onSubmit={enviar} className="card space-y-5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModo("login")}
                className={`flex-1 ${modo === "login" ? "btn-primary" : "btn-secondary"}`}
              >
                <LogIn className="w-4 h-4" /> Entrar
              </button>
              <button
                type="button"
                onClick={() => setModo("cadastro")}
                className={`flex-1 ${modo === "cadastro" ? "btn-primary" : "btn-secondary"}`}
              >
                <UserPlus className="w-4 h-4" /> Cadastrar
              </button>
            </div>

            {modo === "cadastro" && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider txt-dim mb-2">
                    Nome do aluno
                  </label>
                  <input
                    className="input-field"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider txt-dim mb-2">
                    Perfil
                  </label>
                  <select
                    className="input-field"
                    value={papel}
                    onChange={(e) => setPapel(e.target.value as "aluno" | "professor")}
                  >
                    <option value="aluno">Aluno</option>
                    <option value="professor">Professor</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider txt-dim mb-2">
                E-mail
              </label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider txt-dim mb-2">
                Senha
              </label>
              <input
                type="password"
                className="input-field"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                minLength={6}
                required
              />
            </div>

            {erro && <p className="text-sm neon-red">{erro}</p>}
            {aviso && <p className="text-sm neon-amber">{aviso}</p>}

            <button type="submit" disabled={carregando} className="btn-primary w-full py-3">
              {carregando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : modo === "login" ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {carregando ? "Aguarde..." : modo === "login" ? "Entrar no treino" : "Criar conta"}
            </button>

            <p className="text-xs txt-faint text-center">
              Ao entrar você concorda em treinar de verdade. <Link to="/" className="neon">DevOps Trainer</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}