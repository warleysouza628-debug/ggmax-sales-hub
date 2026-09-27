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
      const prompt = [
        s.prompt_cover,
        `Estilo visual: ${data.style}.`,
        `Produto: ${data.product}. Categoria/jogo: ${data.category}.`,
        data.mainText ? `Texto principal grande e legível na imagem: "${data.mainText}".` : "Sem texto na imagem.",
        data.subText ? `Texto secundário menor: "${data.subText}".` : "",
        "Composição de alta qualidade, cores vibrantes, iluminação cinematográfica, preenchendo todo o quadro.",
      ].join(" ");
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
