import type { AreaComando, ResultadoComando } from "@/lib/terminalSim";

export type Patente = {
  nome: string;
  xpMinimo: number;
  cor: "neon" | "neon-amber" | "neon-violet";
};

export const PATENTES: Patente[] = [
  { nome: "Estagiário de Plantão", xpMinimo: 0, cor: "neon-amber" },
  { nome: "Operador Júnior", xpMinimo: 60, cor: "neon-amber" },
  { nome: "Engenheiro de Turno", xpMinimo: 180, cor: "neon" },
  { nome: "SRE de Combate", xpMinimo: 400, cor: "neon" },
  { nome: "Arquiteto do Cluster", xpMinimo: 800, cor: "neon-violet" },
  { nome: "Lenda do Terminal", xpMinimo: 1500, cor: "neon-violet" },
];

export function patenteDe(xp: number): Patente {
  let atual = PATENTES[0]!;
  for (const p of PATENTES) if (xp >= p.xpMinimo) atual = p;
  return atual;
}

export function proximaPatente(xp: number): Patente | null {
  return PATENTES.find((p) => p.xpMinimo > xp) ?? null;
}

/** Progresso (0 a 1) dentro da patente atual. */
export function progressoPatente(xp: number): number {
  const atual = patenteDe(xp);
  const proxima = proximaPatente(xp);
  if (!proxima) return 1;
  return (xp - atual.xpMinimo) / (proxima.xpMinimo - atual.xpMinimo);
}

/** XP ganho por um comando, com bônus progressivo de combo. */
export function xpDoComando(resultado: ResultadoComando, comboAtual: number): number {
  if (!resultado.ok || resultado.area === "sistema") return 0;
  const base = resultado.peso * 5;
  const bonus = Math.min(comboAtual, 10) * 2;
  return base + bonus;
}

export type Missao = {
  id: string;
  titulo: string;
  descricao: string;
  xp: number;
  area: AreaComando;
  combina: (comando: string, resultado: ResultadoComando) => boolean;
};

const bate = (re: RegExp) => (comando: string, resultado: ResultadoComando) =>
  resultado.ok && re.test(comando.trim());

export const MISSOES: Missao[] = [
  {
    id: "listar-detalhado",
    titulo: "Raio-x do diretório",
    descricao: "Liste os arquivos mostrando permissões e tamanho.",
    xp: 20,
    area: "shell",
    combina: bate(/^ls\s+-{1,2}\S*l/),
  },
  {
    id: "ler-dockerfile",
    titulo: "Leia a receita",
    descricao: "Mostre o conteúdo do Dockerfile no terminal.",
    xp: 20,
    area: "shell",
    combina: bate(/^cat\s+Dockerfile$/),
  },
  {
    id: "containers-ativos",
    titulo: "Quem está de pé?",
    descricao: "Liste os containers em execução.",
    xp: 25,
    area: "docker",
    combina: bate(/^docker\s+ps\b/),
  },
  {
    id: "subir-nginx",
    titulo: "Serviço no ar",
    descricao: "Suba um container em segundo plano publicando uma porta.",
    xp: 40,
    area: "docker",
    combina: (c, r) => r.ok && /^docker\s+run\b/.test(c) && /-d\b|--detach/.test(c) && /-p\s|--publish/.test(c),
  },
  {
    id: "build-imagem",
    titulo: "Forjar a imagem",
    descricao: "Construa uma imagem a partir do Dockerfile do projeto.",
    xp: 40,
    area: "docker",
    combina: bate(/^docker\s+build\b.*\.$/),
  },
  {
    id: "entrar-container",
    titulo: "Dentro da máquina",
    descricao: "Abra uma sessão interativa dentro de um container.",
    xp: 45,
    area: "docker",
    combina: bate(/^docker\s+exec\b.*-[a-z]*i[a-z]*t|^docker\s+exec\b.*-it\b/),
  },
  {
    id: "listar-pods",
    titulo: "Censo do cluster",
    descricao: "Liste os pods do cluster Kubernetes.",
    xp: 30,
    area: "kubernetes",
    combina: bate(/^kubectl\s+get\s+(pods?|po)\b/),
  },
  {
    id: "escalar-deploy",
    titulo: "Aguentando o tranco",
    descricao: "Escale um deployment alterando o número de réplicas.",
    xp: 50,
    area: "kubernetes",
    combina: bate(/^kubectl\s+scale\b.*--replicas/),
  },
  {
    id: "aplicar-manifest",
    titulo: "Infra como código",
    descricao: "Aplique um manifest declarativo no cluster.",
    xp: 50,
    area: "kubernetes",
    combina: bate(/^kubectl\s+apply\s+-f\b/),
  },
  {
    id: "processos-powershell",
    titulo: "Windows também é DevOps",
    descricao: "Liste os processos usando um cmdlet do PowerShell.",
    xp: 30,
    area: "powershell",
    combina: bate(/^get-process\b/i),
  },
];

export type Badge = {
  id: string;
  nome: string;
  descricao: string;
  emoji: string;
};

export const BADGES: Badge[] = [
  { id: "primeiro-acerto", nome: "Boot concluído", descricao: "Executou o primeiro comando válido.", emoji: "⚡" },
  { id: "combo-5", nome: "Sequência limpa", descricao: "5 comandos corretos seguidos.", emoji: "🔥" },
  { id: "combo-10", nome: "Modo turbo", descricao: "10 comandos corretos seguidos.", emoji: "🚀" },
  { id: "sobrevivente", nome: "Anti-frágil", descricao: "Acertou logo após um erro.", emoji: "🛡️" },
  { id: "capitao-docker", nome: "Capitão Docker", descricao: "5 comandos Docker corretos.", emoji: "🐳" },
  { id: "timoneiro-k8s", nome: "Timoneiro K8s", descricao: "5 comandos Kubernetes corretos.", emoji: "☸️" },
  { id: "cacador-missoes", nome: "Caçador de missões", descricao: "Concluiu 5 missões do laboratório.", emoji: "🎯" },
  { id: "poliglota", nome: "Poliglota de terminal", descricao: "Acertou comandos em 4 áreas diferentes.", emoji: "🧬" },
];

export function badgePorId(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}

export const AREA_LABEL: Record<AreaComando, string> = {
  shell: "Shell",
  docker: "Docker",
  kubernetes: "Kubernetes",
  powershell: "PowerShell",
  git: "Git",
  sistema: "Sistema",
};
