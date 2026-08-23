import bash from "@/data/challenges/bash.json";
import powershell from "@/data/challenges/powershell.json";
import docker from "@/data/challenges/docker.json";
import kubernetes from "@/data/challenges/kubernetes.json";

export type Nivel = "facil" | "intermediario" | "avancado";

export type Desafio = {
  id: string;
  tipo: "multipla" | "sintaxe";
  pergunta: string;
  opcoes?: string[];
  resposta: string;
  aceitas?: string[];
  dica: string;
  explicacao: string;
};

export type Linguagem = {
  id: string;
  nome: string;
  icone: string;
  descricao: string;
  niveis: Record<Nivel, Desafio[]>;
};

export const LINGUAGENS = [bash, powershell, docker, kubernetes] as unknown as Linguagem[];

export const NIVEIS: Nivel[] = ["facil", "intermediario", "avancado"];

export const NIVEL_LABEL: Record<Nivel, string> = {
  facil: "Fácil",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export const DESAFIOS_POR_NIVEL = 10;
export const CHANCES_POR_DESAFIO = 3;
export const APROVEITAMENTO_MINIMO = 0.8; // 80% para liberar o próximo nível

export function getLinguagem(id: string): Linguagem | undefined {
  return LINGUAGENS.find((l) => l.id === id);
}

export function isNivel(value: string): value is Nivel {
  return (NIVEIS as string[]).includes(value);
}

export function getDesafio(linguagem: string, nivel: Nivel, id: string): Desafio | undefined {
  return getLinguagem(linguagem)?.niveis[nivel]?.find((d) => d.id === id);
}

/** Sorteia N desafios distintos do banco daquele nível. */
export function sortearDesafios(linguagem: string, nivel: Nivel, quantidade = DESAFIOS_POR_NIVEL): string[] {
  const banco = getLinguagem(linguagem)?.niveis[nivel] ?? [];
  const pool = [...banco];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = a;
  }
  return pool.slice(0, Math.min(quantidade, pool.length)).map((d) => d.id);
}

function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/\s*;\s*$/, "")
    .replace(/^\$\s*/, "");
}

/** Compara a resposta do aluno com o gabarito (multipla escolha ou sintaxe). */
export function verificarResposta(desafio: Desafio, resposta: string): boolean {
  if (!resposta.trim()) return false;
  if (desafio.tipo === "multipla") {
    return normalizar(resposta) === normalizar(desafio.resposta);
  }
  const candidatos = [desafio.resposta, ...(desafio.aceitas ?? [])];
  const enviada = normalizar(resposta);
  return candidatos.some((c) => normalizar(c) === enviada);
}

export function nivelAnterior(nivel: Nivel): Nivel | null {
  const idx = NIVEIS.indexOf(nivel);
  return idx <= 0 ? null : NIVEIS[idx - 1]!;
}

export function xpDoNivel(nivel: Nivel): number {
  return nivel === "facil" ? 10 : nivel === "intermediario" ? 20 : 30;
}
