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
        `REGRAS OBRIGATÓRIAS PARA OS TÍTULOS:\n- Gere 3 opções diferentes, específicas e comerciais.\n- TODOS OS TÍTULOS DEVEM SER 100% EM LETRAS MAIÚSCULAS.\n- Limite absoluto de 80 caracteres por título.\n- Use somente características realmente presentes nos dados.\n- Priorize informações de alto valor comercial: produto, jogo, nível, item, vantagem real e entrega quando relevante.\n- Evite títulos genéricos como "CONTA INCRÍVEL", "PRODUTO TOP", "MELHOR CONTA" ou equivalentes.\n- Não use hashtags, explicações, aspas ou numeração.\n${s.prompt_title || ""}\nResponda SOMENTE com os 3 títulos, um por linha.`,
        productText(data),
      );
      const titles = out
        .split("\n")
        .map((l) => stripEmoji(l.replace(/^[\s\-\d.)*"]+/, "").replace(/"$/, "")))
        .map((t) => t.toUpperCase().replace(/\s+/g, " ").trim())
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
        Profissional: "Tom de vendedor experiente: profissional, humano, claro e confiável.",
        Direto: "Curta, objetiva e comercial, sem frases genéricas.",
        Completo: "Detalhada e completa, com estrutura comercial e todas as informações úteis.",
        Persuasivo: "Persuasiva e natural, destacando benefícios reais sem exageros, spam ou promessas inventadas.",
      };

      const descriptionRules = [
        "ESCREVA COMO UM VENDEDOR HUMANO EXPERIENTE DA GGMAX, NÃO COMO UMA IA.",
        "A descrição deve ser específica para o produto e baseada SOMENTE nos dados fornecidos.",
        "Nunca invente itens, benefícios, garantias, certificações, avaliações, preços, estoque ou condições.",
        "Estruture de forma natural e comercial, com seções claras quando fizer sentido.",
        "Inclua, quando os dados permitirem: o que está sendo vendido, principais características, como funciona a entrega, o que acontece após a compra e orientação de suporte.",
        "Inclua uma seção de compra segura/confiança, enfatizando transparência, suporte e segurança da negociação sem alegar certificações inexistentes.",
        "Evite clichês como 'produto incrível', 'imperdível', 'a melhor oferta' e textos que poderiam servir para qualquer produto.",
        "Não use markdown com asteriscos ou hashtags. Pode usar títulos de seção, linhas e emojis moderadamente.",
      ].join("\n");
      const description = await generateText(
        `${descriptionRules}\n${s.prompt_description || ""}\nEstilo: ${styleGuide[data.style] ?? data.style}\nResponda apenas com o texto final da descrição, sem explicar o processo.`,
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
        style: z.string().max(40),
        accentColor: z.string().max(30).optional().default("Vermelho"),
        layout: z.string().max(30).optional().default("Produto em destaque"),
        lighting: z.string().max(30).optional().default("Cinematográfica"),
        textPosition: z.string().max(30).optional().default("Centro / inferior"),
        subjectPosition: z.string().max(30).optional().default("Direita"),
        badge: z.string().max(40).optional().default(""),
        density: z.string().max(30).optional().default("Equilibrada"),
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
        "Gamer profissional": "DIREÇÃO DE ARTE DE THUMBNAIL GAMER PROFISSIONAL: composição de campanha comercial feita por designer gráfico humano, personagem ou produto recortado com precisão, fundo construído em camadas, tipografia editorial forte, profundidade e contraste controlado.",
        "Premium": "DIREÇÃO DE ARTE PREMIUM: estética de publicidade de alto padrão, composição minimalista e sofisticada, materiais realistas, iluminação de estúdio, tipografia elegante e muito espaço negativo.",
        "Oferta / Promoção": "DIREÇÃO DE ARTE DE CAMPANHA COMERCIAL: hierarquia visual imediata, produto dominante, preço/oferta somente se fornecido, selo discreto e acabamento de peça publicitária real.",
        "Dark": "DIREÇÃO DE ARTE DARK GAMING: fundo escuro sofisticado, luz lateral, recortes limpos, contraste cinematográfico e poucos elementos, como uma peça feita em Photoshop por designer.",
        "Vermelho intenso": "DIREÇÃO DE ARTE GAMER PRETO/VERMELHO/BRANCO: composição energética, grafismos geométricos, luz vermelha controlada e tipografia forte de campanha.",
        "Azul neon": "DIREÇÃO DE ARTE GAMER AZUL/CIANO: visual tecnológico premium, luzes neon controladas, profundidade e grafismos de interface discretos.",
        "Roxo neon": "DIREÇÃO DE ARTE GAMER ROXO/MAGENTA: atmosfera premium, profundidade, iluminação de recorte e composição equilibrada de thumbnail comercial.",
        "Verde": "DIREÇÃO DE ARTE COMPETITIVA VERDE/PRETO: energia esports, recortes limpos, luz verde controlada e composição forte sem poluição.",
        "Dourado": "DIREÇÃO DE ARTE LUXURY PRETO/DOURADO: aparência sofisticada, detalhes metálicos realistas, iluminação de estúdio e sensação de produto valioso.",
        "Anime": "DIREÇÃO DE ARTE ANIME PROFISSIONAL: composição inspirada em key art e pôster promocional de anime, personagem bem desenhado e integrado ao layout, fundo temático e tipografia comercial. Evitar estética genérica de imagem gerada por IA.",
        "Roblox": "DIREÇÃO DE ARTE ROBLOX COMERCIAL: estética de thumbnail profissional, personagens e objetos com aparência 3D limpa, composição dinâmica e tipografia de campanha.",
        "Futurista": "DIREÇÃO DE ARTE SCI-FI FUTURISTA: composição editorial, profundidade, interfaces e hologramas discretos, iluminação de estúdio e acabamento publicitário.",
        "Competitivo": "DIREÇÃO DE ARTE ESPORTS: composição dinâmica, personagem/produto em destaque, grafismos profissionais, alto contraste e sensação de campanha competitiva.",
        "Marketplace": "DIREÇÃO DE ARTE DE MARKETPLACE: produto em primeiro plano, fundo limpo, hierarquia comercial, tipografia extremamente legível e aparência de anúncio produzido profissionalmente.",
        "Minimalista": "DIREÇÃO DE ARTE MINIMALISTA: poucos elementos, alinhamento preciso, tipografia forte, produto dominante, espaço negativo e acabamento editorial.",
        "Cyberpunk": "DIREÇÃO DE ARTE CYBERPUNK COMERCIAL: ambiente futurista em camadas, neon controlado, personagem ou produto bem recortado e tipografia de pôster profissional.",
        "Cartoon": "DIREÇÃO DE ARTE CARTOON COMERCIAL: ilustração limpa, formas bem definidas, cores controladas e composição de campanha, sem aparência de arte automática genérica.",
        "E-sports": "DIREÇÃO DE ARTE ESPORTS DE ALTO NÍVEL: composição agressiva porém organizada, recortes precisos, grafismos profissionais, iluminação dramática e tipografia de torneio.",
      };

      const prompt = [
        s.prompt_cover,
        `DIREÇÃO DE ARTE: ${styleDirections[data.style] ?? data.style}.`,
        `PRODUTO: ${data.product}. CATEGORIA/JOGO: ${data.category || "não informado"}.`,
        `PALETA: cor principal ${data.accentColor}; composição ${data.layout}; posição do elemento principal ${data.subjectPosition}; posição da tipografia ${data.textPosition}; iluminação ${data.lighting}; densidade de elementos ${data.density}.`,
        data.badge ? `SELO/BADGE: "${data.badge}", curto, limpo e perfeitamente legível.` : "Sem selo adicional.",
        data.mainText ? `TEXTO PRINCIPAL: "${data.mainText}". Deve ser curto, grande, perfeitamente legível e integrado como tipografia publicitária profissional.` : "Não invente texto principal.",
        data.subText ? `TEXTO SECUNDÁRIO: "${data.subText}". Deve ser menor e perfeitamente legível.` : "Não invente texto secundário.",
        "FORMATO: 16:9 horizontal, aparência de arte criada por um designer gráfico profissional para vender um produto digital.",
        "DIREÇÃO GERAL: pense como um DIRETOR DE ARTE + DESIGNER GRÁFICO HUMANO trabalhando em Photoshop/Figma para uma campanha comercial. Construa a peça em camadas: fundo, atmosfera, elemento principal, grafismos, hierarquia tipográfica e acabamento.",
        "A composição deve parecer deliberadamente desenhada por uma pessoa: alinhamentos precisos, grid visual, escala coerente, contraste intencional, espaço negativo, recortes profissionais e tratamento de cor consistente.",
        "TIPOGRAFIA: se houver texto, trate-o como lettering publicitário integrado ao layout, grande e perfeitamente legível. Nunca invente palavras, letras ou números.",
        "QUALIDADE: acabamento de agência de design, nítido, profissional, comercial e pronto para thumbnail de marketplace.",
        "PROIBIDO VISUAL GENÉRICO DE IA: não produzir arte aleatória, excesso de partículas, brilho exagerado, lens flare gratuito, fundos abstratos sem função, composição caótica ou estética de prompt de IA.",
        "EVITAR: mãos/rostos deformados, anatomia estranha, objetos duplicados, texto ilegível, letras aleatórias, marcas d'água, logos inventados, erros ortográficos, elementos cortados e aparência de mockup automático.",
        "REGRA DE IDENTIDADE: a capa deve vender o PRODUTO, não demonstrar que foi feita por IA.",
        "FORMATO FINAL: 16:9 horizontal, proporção de thumbnail comercial, composição equilibrada nas bordas e área segura para texto."
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
