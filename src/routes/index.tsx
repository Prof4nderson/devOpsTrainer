import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Terminal, LogIn, UserPlus, Loader2, Cpu } from "lucide-react";
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
          <div className="flex items-center gap-3 mb-4">
            <span className="display text-7xl">
              LABS<span className="neon">.</span>
            </span>
            <span className="kicker-dim">Dev · AI · DevOps</span>
          </div>

          <p className="kicker mb-4">01 / Learning Labs</p>
          <h1 className="display text-4xl xl:text-4xl">
            Quem é ninja na TI?
            <br />
            <span className="neon">Prove em 108 </span>  desafios.
          </h1>
          <p className="txt-dim mt-5 max-w-md x5:text-sm leading-relaxed">
            Os devOps são os caras que estão sempre apagando incêndio, que resolvem os BOs, que conectam o mundo da infra aos devs e usuários. 
          </p>

          <ul className="mt-9 space-y-3">
            {[
              { n: "01", t: "Melhore seu desempenho", d: "Enriqueça seus conhecimentos de maneira divertida.", c: "neon" },
              { n: "02", t: "Amplie seus conhecimentos em shell linux e windows", d: "Boas oportunidades aparecem mais fácil pra quem está preparado.", c: "neon-violet" },
              { n: "03", t: "Chame os colegas pra um rally", d: "Aprender se divertindo é uma boa maneira de usar o tempo livre.", c: "neon-amber" },
            ].map((f) => (
              <li key={f.n} className="index-item flex items-start gap-4">
                <span className={f.c}>{f.n}</span>
                <span className="flex-1 normal-case tracking-normal">
                  <strong className="text-[color:var(--txt)] font-semibold">{f.t}</strong>
                  <span className="block txt-faint 2x:text-xs mt-0.5">{f.d}</span>
                </span>
              </li>
            ))}
          </ul>

          
        </section>

        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8 lg:hidden">
            <p className="display text-4xl">
              LABS<span className="neon">.</span>
            </p>
            <p className="kicker-dim mt-2">DevOps Trainer</p>
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