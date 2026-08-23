import { HfInference } from "@huggingface/inference";

const hf = new HfInference(import.meta.env.VITE_HUGGINGFACE_API_KEY || "");

export async function analisarErroTerminal(comando: string, erroOriginal: string) {
  const prompt = `<|system|>Você é um assistente DevOps Ciberpunk de elite.
Analise o comando e o erro retornado. Responda APENAS em formato JSON válido, sem explicações adicionais, markdown ou marcações de código.
Estrutura do JSON:
{
  "trechoIncorreto": "string",
  "explicacaoHumor": "string",
  "sugestaoCorreta": "string",
  "acaoVisual": "IMAGE_NOT_FOUND" | "PORT_CONFLICT" | "SYNTAX_ERROR" | "VOLUME_MISSING"
}<|end|>
<|user|>
Comando: "${comando}"
Erro: "${erroOriginal}"<|end|>
<|assistant|>`;

  try {
    const res = await hf.textGeneration({
      model: "microsoft/Phi-3.5-mini-instruct",
      inputs: prompt,
      parameters: { max_new_tokens: 200, temperature: 0.1, return_full_text: false },
    });

    const jsonLimpo = res.generated_text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonLimpo);
  } catch {
    return {
      trechoIncorreto: comando.split(" ")[1] || comando,
      explicacaoHumor: "Anomalia detectada na sintaxe do comando de entrada.",
      sugestaoCorreta: comando,
      acaoVisual: "SYNTAX_ERROR",
    };
  }
}