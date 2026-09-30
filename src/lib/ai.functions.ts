import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const productSchema = z.object({
  category: z.string().max(100).optional().default(""),
  productName: z.string().max(200).optional().default(""),
  price: z.string().max(30).optional().default(""),
  stock: z.string().max(30).optional().default(""),
  delivery: z.string().max(50).optional().default(""),
  details: z.string().max(4000).optional().default(""),
});

type Sb = any;

async function getSettings(sb: Sb) {
  const { data } = await sb.from("admin_settings").select("key,value");
  const map: Record<string, any> = {};
  (data ?? []).forEach((r: any) => (map[r.key] = r.value));
  return map;
}

async function spend(sb: Sb, amount: number, reason: string) {
  const { data, error } = await sb.rpc("spend_credits", { _amount: amount, _reason: reason });
  if (error) throw new Error(error.message.includes("insuficientes") ? "Créditos insuficientes. Faça upgrade para continuar." : error.message);
  return data as number;
}

async function refund(amount: number, userId: string, reason: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("profiles").select("credits").eq("id", userId).single();
  await supabaseAdmin.from("profiles").update({ credits: (data?.credits ?? 0) + amount }).eq("id", userId);
  await supabaseAdmin.from("credit_transactions").insert({ user_id: userId, amount, reason });
}

function productText(p: z.infer<typeof productSchema>) {
  return [
    `Categoria: ${p.category || "-"}`,
    `Produto: ${p.productName || "-"}`,
    `Preço: ${p.price ? "R$ " + p.price : "-"}`,
    `Estoque: ${p.stock || "-"}`,
    `Entrega: ${p.delivery || "-"}`,
    `Detalhes: ${p.details || "-"}`,
  ].join("\n");
}

function stripEmoji(s: string) {
  return s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim();
}

export const generateTitles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => productSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const s = await getSettings(sb);
    const cost = s.credit_costs?.title ?? 1;
    const remaining = await spend(sb, cost, "Gerar título");
    try {
      const { generateText } = await import("./ai.server");
      const out = await generateText(
        `${s.prompt_title}\nResponda SOMENTE com os 3 títulos, um por linha, sem numeração, sem aspas.`,
        productText(data),
      );
      const titles = out
        .split("\n")
        .map((l) => stripEmoji(l.replace(/^[\s\-\d.)*"]+/, "").replace(/"$/, "")))
        .filter(Boolean)
        .map((t) => (t.length > 80 ? t.slice(0, 80).trim() : t))
        .slice(0, 3);
      return { titles, credits: remaining };
    } catch (e) {
      await refund(cost, context.userId, "Estorno: título");
      throw e;
    }
  });

export const generateDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => productSchema.extend({ style: z.string().max(30), title: z.string().max(200).optional().default("") }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const s = await getSettings(sb);
    const cost = s.credit_costs?.description ?? 2;
    const remaining = await spend(sb, cost, "Gerar descrição");
    try {
      const { generateText } = await import("./ai.server");
      const styleGuide: Record<string, string> = {
        Profissional: "Tom profissional e confiável, tamanho médio.",
        Direto: "Curta e direta, apenas o essencial em tópicos.",
        Completo: "Detalhada e completa, cobrindo todas as seções.",
        Persuasivo: "Persuasiva, destacando benefícios, sem exageros ou spam.",
      };
      const description = await generateText(
        `${s.prompt_description}\nEstilo: ${styleGuide[data.style] ?? data.style}\nResponda apenas com o texto da descrição, em texto puro (sem markdown com asteriscos ou #).`,
        `${data.title ? "Título: " + data.title + "\n" : ""}${productText(data)}`,
      );
      return { description: description.replace(/\*\*/g, ""), credits: remaining };
    } catch (e) {
      await refund(cost, context.userId, "Estorno: descrição");
      throw e;
    }
  });

export const generateCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        product: z.string().max(200),
        category: z.string().max(100).optional().default(""),
        mainText: z.string().max(80).optional().default(""),
        subText: z.string().max(120).optional().default(""),
        style: z.string().max(30),
        adId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const s = await getSettings(sb);
    const cost = s.credit_costs?.cover ?? 5;
    const remaining = await spend(sb, cost, "Gerar capa");
    try {
      const { generateImage } = await import("./ai.server");
      const styleDirections: Record<string, string> = {
        "Gamer profissional": "thumbnail comercial gamer, composição agressiva e limpa, contraste forte, personagem ou elemento principal bem recortado, iluminação cinematográfica e acabamento de agência.",
        "Premium": "visual premium de e-commerce, sofisticado, poucos elementos, profundidade, brilho controlado e acabamento publicitário de alto padrão.",
        "Oferta / Promoção": "arte promocional de marketplace, foco imediato no produto e na oferta, hierarquia visual clara, selo de promoção e composição muito legível.",
        "Dark": "dark gaming elegante, fundo preto profundo, iluminação lateral e detalhes discretos, sem poluição visual.",
        "Vermelho intenso": "identidade preto, vermelho e branco, energia alta, bordas e luzes vermelhas, estilo de banner profissional de vendedor.",
        "Azul neon": "paleta azul/ciano neon, atmosfera tecnológica, brilho controlado e composição gamer profissional.",
        "Roxo neon": "paleta roxa/magenta neon, atmosfera gamer premium, profundidade e iluminação controlada.",
        "Verde": "paleta verde/preto, energia competitiva, iluminação neon verde e composição comercial.",
        "Dourado": "preto e dourado premium, sensação de raridade e valor, brilho metálico controlado.",
        "Anime": "estética anime comercial, personagem em destaque, fundo temático, composição de thumbnail profissional sem aparência genérica de IA.",
        "Roblox": "estética inspirada em thumbnails de Roblox, formas 3D limpas, personagem/elementos em destaque e composição comercial.",
        "Futurista": "design sci-fi futurista, profundidade, elementos holográficos discretos e acabamento de publicidade digital.",
        "Competitivo": "estética de esports, composição dinâmica, alto contraste, foco no produto e energia competitiva.",
        "Marketplace": "banner de marketplace profissional, produto em primeiro plano, fundo limpo e hierarquia de informação muito clara.",
      };

      const prompt = [
        s.prompt_cover,
        `DIREÇÃO DE ARTE: ${styleDirections[data.style] ?? data.style}.`,
        `PRODUTO: ${data.product}. CATEGORIA/JOGO: ${data.category || "não informado"}.`,
        data.mainText ? `TEXTO PRINCIPAL: "${data.mainText}". Deve ser curto, grande, perfeitamente legível e integrado como tipografia publicitária profissional.` : "Não invente texto principal.",
        data.subText ? `TEXTO SECUNDÁRIO: "${data.subText}". Deve ser menor e perfeitamente legível.` : "Não invente texto secundário.",
        "FORMATO: 16:9 horizontal, aparência de arte criada por um designer gráfico profissional para vender um produto digital.",
        "DIREÇÃO GERAL: composição publicitária com hierarquia visual clara, recortes limpos, tipografia forte, iluminação controlada, contraste alto, profundidade, elementos bem alinhados e espaço negativo suficiente.",
        "QUALIDADE: acabamento premium, nítido, profissional, comercial, pronto para anúncio.",
        "EVITAR: aparência de imagem genérica de IA, excesso de efeitos, fundo caótico, mãos ou rostos deformados, texto ilegível, letras aleatórias, marcas d'água, logos inventados, erros ortográficos e elementos cortados.",
      ].filter(Boolean).join(" ");
      const b64 = await generateImage(prompt);
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `${context.userId}/${crypto.randomUUID()}.png`;
      const up = await sb.storage.from("covers").upload(path, bytes, { contentType: "image/png" });
      if (up.error) throw new Error(up.error.message);
      const signed = await sb.storage.from("covers").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed.error) throw new Error(signed.error.message);
      const url = signed.data.signedUrl;
      const { data: cover } = await sb
        .from("covers")
        .insert({ user_id: context.userId, image_url: url, prompt, style: data.style, ad_id: data.adId ?? null })
        .select()
        .single();
      return { url, coverId: cover?.id as string, credits: remaining };
    } catch (e) {
      await refund(cost, context.userId, "Estorno: capa");
      throw e;
    }
  });
