const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const TEXT_MODEL = "openai/gpt-6-astra";
const IMAGE_MODEL = "openai/gpt-image-2.5-sunburst";

export class AiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function key() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new AiError("IA não configurada no servidor.", 500);
  return k;
}

function friendly(status: number, body: string) {
  if (status === 429) return "Muitas solicitações agora. Tente novamente em instantes.";
  if (status === 402) return "Os créditos de IA do projeto acabaram.";
  try {
    const j = JSON.parse(body);
    return j?.error?.message || j?.message || `Erro na IA (${status})`;
  } catch {
    return `Erro na IA (${status})`;
  }
}

/** Streams a Responses call and returns the final text. */
export async function generateText(instructions: string, input: string): Promise<string> {
  const res = await fetch(`${GATEWAY}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key(),
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      instructions,
      input,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
    }),
  });
  if (!res.ok || !res.body) throw new AiError(friendly(res.status, await res.text()), res.status);

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
        if (ev.type === "error" || ev.type === "response.failed")
          throw new AiError(ev.error?.message || ev.response?.error?.message || "Falha na geração", 500);
      } catch (e) {
        if (e instanceof AiError) throw e;
      }
    }
  }
  if (!text.trim()) throw new AiError("A IA não retornou conteúdo. Tente novamente.", 500);
  return text.trim();
}

export async function generateImage(prompt: string): Promise<string> {
  const res = await fetch(`${GATEWAY}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key(),
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size: "1536x1024" }),
  });
  const body = await res.text();
  if (!res.ok) throw new AiError(friendly(res.status, body), res.status);
  const j = JSON.parse(body);
  const b64 = j?.data?.[0]?.b64_json;
  if (!b64) throw new AiError("A IA não retornou imagem.", 500);
  return b64;
}
