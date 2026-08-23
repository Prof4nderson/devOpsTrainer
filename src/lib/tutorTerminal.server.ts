import type { SupabaseClient } from "@supabase/supabase-js";

export type AnaliseTerminal = {
  titulo: string;
  resumo: string;
  detalhe: string;
  trechoDestaque: string;
  sugestao: string;
  proximoPasso: string;
  origem: "ia" | "fallback";
};

export type EntradaTutor = {
  comando: string;
  saida: string;
  acertou: boolean;
  conceito: string;
  area: string;
  combo: number;
};

/** Busca o material que o professor cadastrou para a área do comando. */
export async function materialDoProfessor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  area: string,
): Promise<string> {
  const alvo = area === "shell" ? "bash" : area;
  const { data } = await supabase
    .from("rag_documents")
    .select("titulo, conteudo, language")
    .eq("ativo", true)
    .limit(40);

  const docs = (data ?? []) as Array<{ titulo: string; conteudo: string; language: string }>;
  const preferidos = docs.filter((d) => d.language === alvo);
  const usados = (preferidos.length ? preferidos : docs).slice(0, 6);
  return usados.map((d) => `### ${d.titulo}\n${d.conteudo}`).join("\n\n");
}

export function promptSistema(material: string): string {
  return [
    "Você é o TUTOR do Laboratório Cyberpunk do DevOps Trainer.",
    "Fale português do Brasil, tom direto, técnico e motivador, com leve estética cyberpunk (sem exagero).",
    "",
    "REGRAS:",
    "1. Sempre explique o PORQUÊ, nunca apenas 'está certo' ou 'está errado'.",
    "2. Quando o aluno ACERTAR: confirme, explique o que o comando fez de fato, o que cada flag significa e proponha uma evolução do comando.",
    "3. Quando o aluno ERRAR: aponte exatamente o trecho problemático, explique a causa real do erro e mostre o comando corrigido.",
    "4. Nunca invente saídas ou flags que não existem nas ferramentas reais.",
    "5. Seja conciso: cada campo com no máximo 2 frases.",
    "6. Use o MATERIAL DO PROFESSOR quando ele cobrir o tema.",
    "",
    "Responda APENAS com JSON válido, sem markdown e sem cercas de código, no formato:",
    '{"titulo":"...","resumo":"...","detalhe":"...","trechoDestaque":"...","sugestao":"...","proximoPasso":"..."}',
    "",
    "titulo: rótulo curto (máx. 5 palavras).",
    "resumo: uma frase sobre o que aconteceu.",
    "detalhe: a explicação conceitual.",
    "trechoDestaque: o pedaço EXATO do comando digitado que merece destaque (o erro, ou a flag mais importante quando acertou). String vazia se não houver.",
    "sugestao: um comando pronto para o aluno digitar em seguida.",
    "proximoPasso: um convite curto para o próximo experimento.",
    "",
    "MATERIAL DO PROFESSOR:",
    material || "(nenhum material cadastrado — use seu conhecimento técnico padrão)",
  ].join("\n");
}

export function promptUsuario(e: EntradaTutor): string {
  return [
    `Área: ${e.area} | Conceito envolvido: ${e.conceito}`,
    `Comando digitado: ${e.comando}`,
    `Resultado: ${e.acertou ? "SUCESSO" : "FALHA"}`,
    `Saída do terminal: ${e.saida}`,
    `Combo atual de acertos seguidos: ${e.combo}`,
  ].join("\n");
}

export function analiseFallback(e: EntradaTutor): AnaliseTerminal {
  const primeiroToken = e.comando.trim().split(/\s+/)[0] ?? e.comando;
  return e.acertou
    ? {
        titulo: "Comando executado",
        resumo: `O comando rodou e produziu a saída esperada para ${e.conceito}.`,
        detalhe: "O tutor de IA está indisponível agora, mas a execução foi válida no simulador.",
        trechoDestaque: primeiroToken,
        sugestao: `${primeiroToken} --help`,
        proximoPasso: "Tente uma variação com outra flag para comparar as saídas.",
        origem: "fallback",
      }
    : {
        titulo: "Falha na execução",
        resumo: `O terminal recusou o comando: ${e.saida.split("\n")[0] ?? ""}`,
        detalhe: `Revise a sintaxe relacionada a ${e.conceito}.`,
        trechoDestaque: e.comando.trim().split(/\s+/)[1] ?? primeiroToken,
        sugestao: `${primeiroToken} --help`,
        proximoPasso: "Consulte a ajuda do comando e tente novamente.",
        origem: "fallback",
      };
}

export function extrairJson(texto: string): Partial<AnaliseTerminal> | null {
  const limpo = texto.replace(/```json|```/g, "").trim();
  const inicio = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (inicio === -1 || fim === -1) return null;
  try {
    return JSON.parse(limpo.slice(inicio, fim + 1)) as Partial<AnaliseTerminal>;
  } catch {
    return null;
  }
}
