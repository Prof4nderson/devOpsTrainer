import React, { useState } from "react";
import { Terminal, ShieldAlert, Cpu, CheckCircle2, RefreshCw } from "lucide-react";
import { analisarErroTerminal } from "@/lib/assistenteTerminal";

interface AnaliseIA {
  trechoIncorreto: string;
  explicacaoHumor: string;
  sugestaoCorreta: string;
}

export const CyberpunkTerminal: React.FC = () => {
  const [inputCommand, setInputCommand] = useState("");
  const [logs, setLogs] = useState<string[]>([
    "CYBER-OS v4.02 — Ambiente de Treino DevOps Ativo",
    "Digite comandos do Linux, Docker ou Kubernetes. 'help' para dicas.",
  ]);
  const [analise, setAnalise] = useState<AnaliseIA | null>(null);
  const [loading, setLoading] = useState(false);
  const [ultimoComando, setUltimoComando] = useState("");

  // Base de simulação para comandos válidos (saída pedagógica real)
  // Evaluator sintático simples e robusto para o simulador
const avaliarSintaxeComando = (cmd: string): { ok: boolean; output: string } => {
  const tokens = cmd.trim().split(/\s+/);
  const base = tokens[0];
  const flags = tokens.filter((t) => t.startsWith("-"));
  const args = tokens.filter((t) => !t.startsWith("-") && t !== base);

  if (base === "clear") return { ok: true, output: "__CLEAR__" };

  // 1. Comandos Shell Básicos (ls, pwd, ps, echo, cd)
  if (base === "ls") {
    const flagsInvalidas = flags.filter((f) => !["-l", "-a", "-la", "-al", "-lh", "--long"].includes(f));
    if (flagsInvalidas.length > 0) {
      return { ok: false, output: `ls: invalid option -- '${flagsInvalidas[0].replace(/-/g, "")}'` };
    }
    if (flags.some((f) => f.includes("l"))) {
      return {
        ok: true,
        output: "drwxr-xr-x 2 root root 4096 Aug 23 13:00 .\ndrwxr-xr-x 4 root root 4096 Aug 23 13:00 ..\n-rw-r--r-- 1 root root  245 Aug 23 13:00 Dockerfile\n-rw-r--r-- 1 root root  812 Aug 23 13:00 package.json",
      };
    }
    return { ok: true, output: "Dockerfile  docker-compose.yml  package.json  src/  .env" };
  }

  if (base === "pwd") return { ok: true, output: "/app/devops-trainer" };

  if (base === "echo") return { ok: true, output: args.join(" ") };

  // 2. Comandos Docker
  if (base === "docker") {
    const sub = tokens[1];
    if (!sub) return { ok: false, output: "Usage: docker [OPTIONS] COMMAND" };

    if (sub === "ps") {
      return {
        ok: true,
        output: "CONTAINER ID   IMAGE          COMMAND                  CREATED        STATUS        PORTS\ne9b2a1c4f8d2   nginx:alpine   \"/docker-entrypoint.…\"   2 hours ago    Up 2 hours    0.0.0.0:80->80/tcp",
      };
    }

    if (sub === "run") {
      const imagem = tokens[tokens.length - 1];
      if (!imagem || imagem.startsWith("-")) {
        return { ok: false, output: "docker run requires at least 1 argument." };
      }
      if (imagem.includes("alpin") && !imagem.includes("alpine")) {
        return { ok: false, output: `Error response from daemon: manifest for ${imagem} not found: manifest unknown` };
      }
      return { ok: true, output: "a1b2c3d4e5f6a7b8c9d0 (Container iniciado em background)" };
    }

    return { ok: false, output: `docker: '${sub}' is not a docker command. See 'docker --help'` };
  }

  // 3. Comandos Kubernetes
  if (base === "kubectl") {
    const sub = tokens[1];
    if (sub === "get") {
      const recurso = tokens[2];
      if (["pods", "pod", "po"].includes(recurso)) {
        return { ok: true, output: "NAME fontend-6d8f-x82 1/1 Running 0 2h\nNAME backend-4a2b-k91 1/1 Running 0 2h" };
      }
      return { ok: false, output: `error: the server doesn't have a resource type "${recurso}"` };
    }
    return { ok: false, output: `kubectl: command '${sub}' not recognized` };
  }

  // Comando desconhecido
  return { ok: false, output: `bash: ${base}: command not found` };
};

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCommand.trim()) return;

    const cmd = inputCommand.trim();
    setInputCommand("");
    setUltimoComando(cmd);

    const resultado = executarComandoSimulado(cmd);

    if (resultado.output === "__CLEAR__") {
      setLogs([]);
      setAnalise(null);
      return;
    }

    setLogs((prev) => [...prev, `$ ${cmd}`]);

    if (resultado.ok) {
      // Comando correto: exibe no terminal e limpa o painel de erro
      setLogs((prev) => [...prev, resultado.output]);
      setAnalise(null);
    } else {
      // Comando falhou: exibe o erro real do Linux e aciona a IA
      setLogs((prev) => [...prev, `[ERRO] ${resultado.output}`]);
      setLoading(true);
      setAnalise(null);

      try {
        const dadosIA = await analisarErroTerminal(cmd, resultado.output);
        setAnalise(dadosIA);
      } catch {
        setAnalise({
          trechoIncorreto: cmd.split(" ")[1] || cmd,
          explicacaoHumor: "Erro de sintaxe detectado. O parâmetro informado não pertence ao comando.",
          sugestaoCorreta: "Verifique a documentação oficial do comando.",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 bg-gray-950 text-cyan-400 font-mono rounded-xl border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyan-400 animate-pulse" />
          <span className="font-bold tracking-wider text-sm uppercase text-cyan-300">
            CyberTerminal // Tutor DevOps AI
          </span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
          SISTEMA OPERACIONAL
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lado Esquerdo: Terminal Real */}
        <div className="lg:col-span-2 bg-black/90 rounded-lg p-4 border border-cyan-900/50 flex flex-col h-[400px]">
          <div className="flex-1 overflow-y-auto space-y-1.5 text-xs font-mono mb-2">
            {logs.map((log, i) => (
              <div
                key={i}
                className={
                  log.startsWith("[ERRO]")
                    ? "text-red-400 font-semibold"
                    : log.startsWith("$")
                    ? "text-yellow-300 font-bold"
                    : "text-cyan-300/80 whitespace-pre-wrap"
                }
              >
                {log}
              </div>
            ))}
          </div>

          <form onSubmit={handleExecute} className="flex gap-2 border-t border-cyan-900/50 pt-2">
            <span className="text-cyan-400 font-bold">$</span>
            <input
              type="text"
              value={inputCommand}
              onChange={(e) => setInputCommand(e.target.value)}
              placeholder="Digite um comando (ex: ls, docker ps, docker run -d nginx:alpin)..."
              className="flex-1 bg-transparent outline-none text-xs text-cyan-200 placeholder-cyan-800"
            />
          </form>
        </div>

        {/* Lado Direito: Diagnóstico da IA (SÓ APARECE QUANDO DÁ ERRO) */}
        <div className="bg-black/90 rounded-lg p-4 border border-cyan-900/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider mb-3">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Tutor Didático
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center gap-2 text-yellow-400 text-xs py-12 animate-pulse">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Analisando o erro com o Phi-3.5...</span>
              </div>
            )}

            {!loading && !analise && (
              <div className="text-xs text-gray-500 text-center py-16">
                <p>Nenhum erro no momento.</p>
                <p className="mt-2 text-cyan-900">Execute os comandos no terminal. Se falhar, o tutor analisará a falha para você.</p>
              </div>
            )}

            {!loading && analise && (
              <div className="space-y-3 text-xs">
                {/* Destaque visual da palavra incorreta */}
                <div className="bg-black/60 p-2.5 rounded border border-cyan-500/30">
                  <span className="text-gray-400 block mb-1">Comando digitado:</span>
                  <div className="text-cyan-200 font-mono">
                    {ultimoComando.split(analise.trechoIncorreto)[0]}
                    <span className="bg-red-950 text-red-400 border border-red-500 px-1 py-0.5 rounded font-bold animate-pulse">
                      {analise.trechoIncorreto}
                    </span>
                    {ultimoComando.split(analise.trechoIncorreto)[1]}
                  </div>
                </div>

                {/* Explicacao do erro */}
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded">
                  <div className="flex items-center gap-1.5 text-red-400 font-bold mb-1">
                    <ShieldAlert className="w-4 h-4" /> Por que falhou?
                  </div>
                  <p className="text-red-200/90 leading-relaxed">{analise.explicacaoHumor}</p>
                </div>

                {/* Solução sugerida */}
                <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" /> Como Corrigir
                  </div>
                  <code className="text-yellow-300 block bg-black/80 p-2 rounded mt-1 font-mono text-[11px] overflow-x-auto">
                    {analise.sugestaoCorreta}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};