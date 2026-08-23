import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  analiseFallback,
  extrairJson,
  materialDoProfessor,
  promptSistema,
  promptUsuario,
  type AnaliseTerminal,
} from "@/lib/tutorTerminal.server";

const Input = z.object({
  comando: z.string().min(1).max(400),
  saida: z.string().max(4000).default(""),
  acertou: z.boolean(),
  conceito: z.string().default(""),
  area: z.string().default("shell"),
  combo: z.number().int().min(0).default(0),
});

export type { AnaliseTerminal };

export const analisarComandoTerminal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<AnaliseTerminal> => {
    const fallback = analiseFallback(data);

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return fallback;

    try {
      const material = await materialDoProfessor(context.supabase, data.area);
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
        instructions: promptSistema(material),
        messages: [{ role: "user", content: promptUsuario(data) }],
      });

      const texto = (await result.text).trim();
      const json = extrairJson(texto);
      if (!json) return fallback;

      return {
        titulo: json.titulo || fallback.titulo,
        resumo: json.resumo || fallback.resumo,
        detalhe: json.detalhe || fallback.detalhe,
        trechoDestaque: json.trechoDestaque ?? "",
        sugestao: json.sugestao || fallback.sugestao,
        proximoPasso: json.proximoPasso || fallback.proximoPasso,
        origem: "ia",
      };
    } catch (error) {
      console.error("Falha no tutor do terminal:", error);
      return fallback;
    }
  });
