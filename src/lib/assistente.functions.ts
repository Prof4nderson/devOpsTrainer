import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  linguagem: z.string().min(1),
  nivel: z.string().min(1),
  desafioId: z.string().min(1),
  pergunta: z.string().min(1),
  respostaAluno: z.string().default(""),
  acertou: z.boolean(),
  tentativasRestantes: z.number().int().min(0),
  explicacao: z.string().default(""),
  dica: z.string().default(""),
});

export type FeedbackAssistente = {
  mensagem: string;
  origem: "ia" | "fallback";
};

export const pedirFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<FeedbackAssistente> => {
    const { supabase } = context;

    // ---- RAG: material que o professor cadastrou para esta linguagem/nível ----
    const { data: docs } = await supabase
      .from("rag_documents")
      .select("titulo, conteudo, level")
      .eq("language", data.linguagem)
      .eq("ativo", true)
      .limit(20);

    const relevantes = (docs ?? [])
      .filter((d) => !d.level || d.level === data.nivel)
      .slice(0, 6)
      .map((d) => `### ${d.titulo}\n${d.conteudo}`)
      .join("\n\n");

    const fallback = data.acertou
      ? "Boa! Resposta correta. Continue nesse ritmo."
      : data.tentativasRestantes > 0
        ? `Ainda não é isso. Dica do professor: ${data.dica}`
        : `Acabaram as tentativas. Estude este ponto: ${data.explicacao}`;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { mensagem: fallback, origem: "fallback" };

    const sistema = [
      "Você é o Tutor do DevOps Trainer, um assistente de treinamento para alunos DevOps.",
      "REGRAS ABSOLUTAS E INEGOCIÁVEIS:",
      "1. NUNCA revele, escreva, complete ou insinue literalmente a resposta correta do desafio.",
      "2. Você só pode: confirmar se o aluno acertou ou errou e oferecer UMA dica curta que estimule o raciocínio.",
      "3. Se o aluno pedir a resposta, recuse com gentileza e ofereça outra dica.",
      "4. Quando as tentativas acabarem (tentativasRestantes = 0), você pode explicar o CONCEITO do desafio usando a explicação do professor, mas de forma didática.",
      "5. Responda em português do Brasil, no máximo 2 frases curtas, tom motivador e gamificado.",
      "6. Baseie-se apenas no MATERIAL DO PROFESSOR abaixo. Se ele não cobrir o tema, use a dica oficial do desafio.",
      "",
      "MATERIAL DO PROFESSOR (RAG):",
      relevantes || "(nenhum material cadastrado para esta linguagem)",
    ].join("\n");

    const usuario = [
      `Linguagem: ${data.linguagem} | Nível: ${data.nivel}`,
      `Desafio: ${data.pergunta}`,
      `Resposta do aluno: ${data.respostaAluno || "(em branco)"}`,
      `O aluno acertou? ${data.acertou ? "sim" : "não"}`,
      `Tentativas restantes: ${data.tentativasRestantes}`,
      `Dica oficial (pode usar, nunca a resposta): ${data.dica}`,
      data.tentativasRestantes === 0 ? `Explicação liberada: ${data.explicacao}` : "",
    ].join("\n");

    try {
      const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
      const { streamText } = await import("ai");

      const gateway = createOpenAICompatible({
        name: "lovable",
        baseURL: "https://ai.gateway.lovable.dev/v1",
        headers: {
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        },
      });

      const result = streamText({
        model: gateway("google/gemini-3.7-flash"),
        instructions: sistema,
        messages: [{ role: "user", content: usuario }],
      });

      const texto = (await result.text).trim();
      return { mensagem: texto || fallback, origem: texto ? "ia" : "fallback" };
    } catch (error) {
      console.error("Falha no assistente:", error);
      return { mensagem: fallback, origem: "fallback" };
    }
  });
