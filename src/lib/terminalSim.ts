/**
 * Simulador de comandos do Laboratório Cyberpunk.
 * Retorna a saída "real" esperada por cada comando, além de metadados
 * usados pela gamificação e pelo tutor de IA.
 */

export type AreaComando = "shell" | "docker" | "kubernetes" | "powershell" | "git" | "sistema";

export type ResultadoComando = {
  ok: boolean;
  output: string;
  /** Conceito pedagógico envolvido — enviado ao tutor de IA. */
  conceito: string;
  area: AreaComando;
  /** Dificuldade relativa (1 a 3) usada para calcular XP. */
  peso: 1 | 2 | 3;
};

const erro = (
  output: string,
  conceito: string,
  area: AreaComando,
  peso: 1 | 2 | 3 = 1,
): ResultadoComando => ({ ok: false, output, conceito, area, peso });

const ok = (
  output: string,
  conceito: string,
  area: AreaComando,
  peso: 1 | 2 | 3 = 1,
): ResultadoComando => ({ ok: true, output, conceito, area, peso });

export const AJUDA = [
  "COMANDOS SUPORTADOS NESTE LABORATÓRIO",
  "",
  "shell       ls, ls -l, pwd, cd, cat, echo, whoami, ps, df -h, grep, mkdir, touch, rm",
  "docker      docker ps, docker images, docker run, docker build, docker logs, docker exec, docker stop, docker rm",
  "kubernetes  kubectl get pods|svc|deploy|nodes, kubectl describe, kubectl logs, kubectl apply -f, kubectl scale",
  "powershell  Get-Process, Get-Service, Get-ChildItem, Get-Content, Set-Location",
  "git         git status, git log, git branch",
  "sistema     help, missoes, clear",
  "",
  "Dica: erre à vontade. O tutor explica cada falha e também cada acerto.",
].join("\n");

const FS_RAIZ = ["Dockerfile", "docker-compose.yml", "package.json", "src", "k8s", ".env"];

function saidaLs(detalhado: boolean, oculto: boolean): string {
  if (!detalhado) {
    const itens = oculto ? [".", "..", ".env", ".git", ...FS_RAIZ] : FS_RAIZ;
    return itens.join("  ");
  }
  return [
    "total 28",
    "drwxr-xr-x 2 devops devops 4096 ago 23 13:00 .",
    "drwxr-xr-x 4 devops devops 4096 ago 23 13:00 ..",
    "-rw-r--r-- 1 devops devops  245 ago 23 13:00 Dockerfile",
    "-rw-r--r-- 1 devops devops  512 ago 23 13:00 docker-compose.yml",
    "-rw-r--r-- 1 devops devops  812 ago 23 13:00 package.json",
    "drwxr-xr-x 6 devops devops 4096 ago 23 13:00 src",
    "drwxr-xr-x 3 devops devops 4096 ago 23 13:00 k8s",
  ].join("\n");
}

const ARQUIVOS: Record<string, string> = {
  Dockerfile: [
    "FROM node:20-alpine",
    "WORKDIR /app",
    "COPY package.json .",
    "RUN npm install",
    "COPY . .",
    "EXPOSE 3000",
    'CMD ["node", "server.js"]',
  ].join("\n"),
  "package.json": '{\n  "name": "devops-trainer",\n  "version": "1.0.0"\n}',
  ".env": "APP_ENV=production\nPORT=3000",
};

function comandoShell(tokens: string[]): ResultadoComando | null {
  const base = tokens[0] ?? "";
  const flags = tokens.slice(1).filter((t) => t.startsWith("-"));
  const args = tokens.slice(1).filter((t) => !t.startsWith("-"));

  if (base === "ls") {
    const invalidas = flags.filter((f) => !/^-{1,2}[laht]+$|^--all$|^--human-readable$/.test(f));
    if (invalidas[0]) {
      return erro(
        `ls: opção inválida -- '${invalidas[0].replace(/^-+/, "")}'\nTente 'ls --help' para mais informações.`,
        "flags do comando ls",
        "shell",
      );
    }
    const juntas = flags.join("");
    return ok(saidaLs(juntas.includes("l"), juntas.includes("a")), "listagem de diretórios", "shell");
  }

  if (base === "pwd") return ok("/home/devops/app", "caminho absoluto do diretório atual", "shell");
  if (base === "whoami") return ok("devops", "identidade do usuário no shell", "shell");

  if (base === "cd") {
    const alvo = args[0] ?? "~";
    if (["~", "/", "src", "k8s", "..", "/app"].includes(alvo)) {
      return ok(`(diretório alterado para ${alvo})`, "navegação no sistema de arquivos", "shell");
    }
    return erro(`bash: cd: ${alvo}: Arquivo ou diretório inexistente`, "navegação no sistema de arquivos", "shell");
  }

  if (base === "cat") {
    const alvo = args[0];
    if (!alvo) return erro("cat: faltando operando de arquivo", "leitura de arquivos", "shell");
    const conteudo = ARQUIVOS[alvo];
    if (!conteudo) return erro(`cat: ${alvo}: Arquivo ou diretório inexistente`, "leitura de arquivos", "shell");
    return ok(conteudo, "leitura de arquivos", "shell");
  }

  if (base === "echo") return ok(args.join(" ").replace(/^["']|["']$/g, ""), "saída padrão", "shell");

  if (base === "ps") {
    return ok(
      [
        "  PID TTY          TIME CMD",
        "    1 ?        00:00:01 tini",
        "   14 ?        00:00:09 node",
        "   42 pts/0    00:00:00 bash",
      ].join("\n"),
      "processos em execução",
      "shell",
    );
  }

  if (base === "df") {
    if (!flags.includes("-h")) {
      return ok(
        "Sist. Arq.     1K-blocos    Usado Disponível Uso% Montado em\noverlay         61255492 18244096   39859012  32% /",
        "uso de disco",
        "shell",
      );
    }
    return ok(
      "Sist. Arq.      Tam. Usado Disp. Uso% Montado em\noverlay          59G   18G   38G  32% /",
      "uso de disco em formato legível",
      "shell",
    );
  }

  if (base === "grep") {
    if (args.length < 2) {
      return erro("Uso: grep [OPÇÃO]... PADRÕES [ARQUIVO]...", "busca de texto com grep", "shell", 2);
    }
    const [padrao, arquivo] = args;
    const conteudo = ARQUIVOS[arquivo ?? ""] ?? "";
    if (!conteudo) return erro(`grep: ${arquivo}: Arquivo ou diretório inexistente`, "busca de texto com grep", "shell", 2);
    const linhas = conteudo.split("\n").filter((l) => l.toLowerCase().includes((padrao ?? "").toLowerCase()));
    return linhas.length
      ? ok(linhas.join("\n"), "busca de texto com grep", "shell", 2)
      : erro("(nenhuma linha correspondente — status 1)", "busca de texto com grep", "shell", 2);
  }

  if (base === "mkdir") {
    if (!args[0]) return erro("mkdir: faltando operando", "criação de diretórios", "shell");
    return ok(`(diretório '${args[0]}' criado)`, "criação de diretórios", "shell");
  }

  if (base === "touch") {
    if (!args[0]) return erro("touch: faltando operando de arquivo", "criação de arquivos", "shell");
    return ok(`(arquivo '${args[0]}' criado)`, "criação de arquivos", "shell");
  }

  if (base === "rm") {
    if (!args[0]) return erro("rm: faltando operando", "remoção de arquivos", "shell", 2);
    if (args[0] === "/" || (flags.join("").includes("rf") && args[0] === "/")) {
      return erro("rm: é perigoso operar recursivamente em '/'", "remoção de arquivos", "shell", 3);
    }
    return ok(`(removido '${args[0]}')`, "remoção de arquivos", "shell", 2);
  }

  return null;
}

function comandoDocker(tokens: string[]): ResultadoComando {
  const sub = tokens[1];
  const resto = tokens.slice(2);
  const flags = resto.filter((t) => t.startsWith("-"));
  const args = resto.filter((t) => !t.startsWith("-"));

  if (!sub) {
    return erro(
      "Uso:  docker [OPÇÕES] COMANDO\nExecute 'docker --help' para ver a lista de comandos.",
      "estrutura do CLI do Docker",
      "docker",
    );
  }

  if (sub === "ps") {
    return ok(
      [
        "CONTAINER ID   IMAGE          COMMAND                  STATUS         PORTS",
        'e9b2a1c4f8d2   nginx:alpine   "/docker-entrypoint…"    Up 2 hours     0.0.0.0:80->80/tcp',
        'a71c33ffb001   postgres:16    "docker-entrypoint.s…"   Up 2 hours     5432/tcp',
      ].join("\n"),
      "listagem de containers em execução",
      "docker",
    );
  }

  if (sub === "images") {
    return ok(
      [
        "REPOSITORY   TAG       IMAGE ID       CREATED        SIZE",
        "nginx        alpine    a1f2c3d4e5f6   2 weeks ago    43.2MB",
        "postgres     16        b7e8d9c0a1b2   3 weeks ago    431MB",
      ].join("\n"),
      "imagens locais do Docker",
      "docker",
    );
  }

  if (sub === "run") {
    const imagem = args[args.length - 1];
    if (!imagem) {
      return erro(
        'docker: "docker run" requer pelo menos 1 argumento.\nUso: docker run [OPÇÕES] IMAGEM [COMANDO]',
        "argumentos obrigatórios do docker run",
        "docker",
        2,
      );
    }
    if (/alpin$|latests$|ngix|nginix/.test(imagem)) {
      return erro(
        `Unable to find image '${imagem}' locally\nError response from daemon: manifest for ${imagem} not found: manifest unknown`,
        "nome e tag de imagem no Docker",
        "docker",
        2,
      );
    }
    const publicacao = flags.some((f) => f === "-p" || f === "--publish") || resto.some((t) => /^\d+:\d+$/.test(t));
    const detach = flags.some((f) => f === "-d" || f === "--detach" || /^-[a-z]*d[a-z]*$/.test(f));
    return ok(
      detach
        ? "a1b2c3d4e5f6a7b8c9d0e1f2\n(container iniciado em segundo plano)" +
            (publicacao ? "\n(porta publicada no host)" : "")
        : "(container em primeiro plano — Ctrl+C para encerrar)",
      "execução de containers com docker run",
      "docker",
      2,
    );
  }

  if (sub === "build") {
    if (!args.includes(".") && !flags.includes("-f")) {
      return erro(
        '"docker build" requer exatamente 1 argumento (o contexto de build).\nUso: docker build [OPÇÕES] CAMINHO',
        "contexto de build de imagens",
        "docker",
        2,
      );
    }
    return ok(
      "[+] Building 12.4s (9/9) FINISHED\n => exporting to image\n => => naming to docker.io/library/app:latest",
      "construção de imagens com Dockerfile",
      "docker",
      2,
    );
  }

  if (sub === "logs") {
    if (!args[0]) return erro('"docker logs" requer exatamente 1 argumento.', "leitura de logs de container", "docker", 2);
    return ok(
      "2026/08/23 13:00:02 [notice] 1#1: start worker processes\n2026/08/23 13:04:11 200 GET /health",
      "leitura de logs de container",
      "docker",
      2,
    );
  }

  if (sub === "exec") {
    const interativo = flags.some((f) => f.includes("i")) && flags.some((f) => f.includes("t"));
    if (!interativo) {
      return erro(
        "the input device is not a TTY — use 'docker exec -it <container> <comando>'",
        "sessão interativa em containers",
        "docker",
        3,
      );
    }
    if (!args[0]) return erro('"docker exec" requer no mínimo 2 argumentos.', "sessão interativa em containers", "docker", 3);
    return ok("(sessão aberta dentro do container)", "sessão interativa em containers", "docker", 3);
  }

  if (sub === "stop" || sub === "rm") {
    if (!args[0]) return erro(`"docker ${sub}" requer pelo menos 1 argumento.`, "ciclo de vida de containers", "docker", 2);
    return ok(args[0], "ciclo de vida de containers", "docker", 2);
  }

  return erro(
    `docker: '${sub}' não é um comando docker.\nExecute 'docker --help' para ver a lista de comandos.`,
    "subcomandos válidos do Docker",
    "docker",
  );
}

function comandoKubectl(tokens: string[]): ResultadoComando {
  const sub = tokens[1];
  const resto = tokens.slice(2);
  const args = resto.filter((t) => !t.startsWith("-"));

  if (!sub) {
    return erro("kubectl controla o cluster Kubernetes.\nUse 'kubectl --help' para ver os comandos.", "estrutura do kubectl", "kubernetes");
  }

  if (sub === "get") {
    const recurso = args[0];
    if (!recurso) return erro("Você deve informar o tipo de recurso.", "tipos de recurso do Kubernetes", "kubernetes", 2);
    if (["pods", "pod", "po"].includes(recurso)) {
      return ok(
        [
          "NAME                        READY   STATUS    RESTARTS   AGE",
          "frontend-6d8f5c7b9-x82kq    1/1     Running   0          2h",
          "backend-4a2b7f6c1-k91zt     1/1     Running   1          2h",
          "redis-0                     0/1     Pending   0          4m",
        ].join("\n"),
        "consulta de pods",
        "kubernetes",
        2,
      );
    }
    if (["svc", "service", "services"].includes(recurso)) {
      return ok(
        "NAME       TYPE           CLUSTER-IP     PORT(S)\nfrontend   LoadBalancer   10.96.14.22    80:31380/TCP\nbackend    ClusterIP      10.96.201.7    8080/TCP",
        "serviços e exposição de rede",
        "kubernetes",
        2,
      );
    }
    if (["deploy", "deployments", "deployment"].includes(recurso)) {
      return ok(
        "NAME       READY   UP-TO-DATE   AVAILABLE   AGE\nfrontend   2/2     2            2           5d\nbackend    1/1     1            1           5d",
        "deployments e réplicas",
        "kubernetes",
        2,
      );
    }
    if (["nodes", "node", "no"].includes(recurso)) {
      return ok(
        "NAME            STATUS   ROLES           AGE   VERSION\nnode-control    Ready    control-plane   12d   v1.30.2\nnode-worker-1   Ready    <none>          12d   v1.30.2",
        "nós do cluster",
        "kubernetes",
        2,
      );
    }
    return erro(
      `error: the server doesn't have a resource type "${recurso}"`,
      "tipos de recurso do Kubernetes",
      "kubernetes",
      2,
    );
  }

  if (sub === "describe") {
    if (!args[1]) return erro("error: you must specify a resource type and a name", "inspeção detalhada de recursos", "kubernetes", 3);
    return ok(
      `Name:         ${args[1]}\nNamespace:    default\nStatus:       Running\nEvents:       <none>`,
      "inspeção detalhada de recursos",
      "kubernetes",
      3,
    );
  }

  if (sub === "logs") {
    if (!args[0]) return erro("error: expected 'logs (POD | TYPE/NAME) [CONTAINER_NAME]'", "logs de pods", "kubernetes", 2);
    return ok("listening on :8080\nGET /healthz 200", "logs de pods", "kubernetes", 2);
  }

  if (sub === "apply") {
    if (!resto.includes("-f")) {
      return erro("error: must specify one of -f and -k", "aplicação declarativa de manifests", "kubernetes", 3);
    }
    return ok("deployment.apps/frontend configured", "aplicação declarativa de manifests", "kubernetes", 3);
  }

  if (sub === "scale") {
    if (!resto.some((t) => t.startsWith("--replicas"))) {
      return erro("error: must specify --replicas", "escalonamento de deployments", "kubernetes", 3);
    }
    return ok("deployment.apps/frontend scaled", "escalonamento de deployments", "kubernetes", 3);
  }

  return erro(`error: unknown command "${sub}" for "kubectl"`, "subcomandos do kubectl", "kubernetes", 2);
}

function comandoPowerShell(tokens: string[]): ResultadoComando | null {
  const base = (tokens[0] ?? "").toLowerCase();

  if (base === "get-process") {
    return ok(
      "Handles  CPU(s)  Id  ProcessName\n-------  ------  --  -----------\n    412    3,20  14  node\n    198    0,45  42  pwsh",
      "cmdlets de processos no PowerShell",
      "powershell",
      2,
    );
  }
  if (base === "get-service") {
    return ok(
      "Status   Name        DisplayName\n------   ----        -----------\nRunning  Docker      Docker Desktop Service\nStopped  W3SVC       World Wide Web Publishing",
      "cmdlets de serviços no PowerShell",
      "powershell",
      2,
    );
  }
  if (base === "get-childitem" || base === "gci" || base === "dir") {
    return ok("Mode  LastWriteTime      Name\n----  -------------      ----\nd---- 23/08/2026 13:00  src\n-a--- 23/08/2026 13:00  Dockerfile", "listagem com Get-ChildItem", "powershell", 2);
  }
  if (base === "get-content") {
    const alvo = tokens[1];
    const conteudo = ARQUIVOS[alvo ?? ""];
    if (!conteudo) return erro(`Get-Content: Não é possível localizar o caminho '${alvo ?? ""}'.`, "leitura de arquivos no PowerShell", "powershell", 2);
    return ok(conteudo, "leitura de arquivos no PowerShell", "powershell", 2);
  }
  if (base === "set-location") {
    return ok("(local alterado)", "navegação no PowerShell", "powershell", 2);
  }
  return null;
}

function comandoGit(tokens: string[]): ResultadoComando {
  const sub = tokens[1];
  if (sub === "status") {
    return ok("On branch main\nnothing to commit, working tree clean", "estado do repositório", "git", 2);
  }
  if (sub === "log") {
    return ok("commit 9f2c1a (HEAD -> main)\nAuthor: devops\n\n    ci: pipeline de deploy", "histórico de commits", "git", 2);
  }
  if (sub === "branch") {
    return ok("* main\n  feature/pipeline", "branches locais", "git", 2);
  }
  return erro(`git: '${sub ?? ""}' is not a git command. See 'git --help'.`, "subcomandos do git", "git", 2);
}

export function executarComandoSimulado(comandoBruto: string): ResultadoComando {
  const comando = comandoBruto.trim();
  const tokens = comando.split(/\s+/).filter(Boolean);
  const base = tokens[0] ?? "";

  if (!base) return ok("", "entrada vazia", "sistema");
  if (base === "clear" || base === "cls") return ok("__CLEAR__", "limpeza do terminal", "sistema");
  if (base === "help" || base === "--help" || base === "ajuda") return ok(AJUDA, "ajuda do laboratório", "sistema");
  if (base === "missoes" || base === "missões") return ok("__MISSOES__", "missões do laboratório", "sistema");

  if (base === "docker") return comandoDocker(tokens);
  if (base === "kubectl" || base === "k") return comandoKubectl(tokens);
  if (base === "git") return comandoGit(tokens);

  const ps = comandoPowerShell(tokens);
  if (ps) return ps;

  const sh = comandoShell(tokens);
  if (sh) return sh;

  return erro(`bash: ${base}: comando não encontrado`, "comandos existentes no sistema", "shell");
}
