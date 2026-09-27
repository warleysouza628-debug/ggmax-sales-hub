import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Download, Image as ImageIcon, Loader2, RefreshCw, Save, Sparkles, Check, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl, DELIVERY, DESC_STYLES, fullAdText, useCategories, type Ad } from "@/lib/data";
import { generateDescription, generateTitles } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton } from "@/components/CopyButton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/criar")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => ({ meta: [{ title: "Criar anúncio — GGMax AdMaker" }] }),
  component: CreateAd,
});

type Form = {
  category: string; productName: string; price: string; stock: string; delivery: string; details: string;
  title: string; description: string; style: string; cover: string; status: string;
};
const empty: Form = { category: "", productName: "", price: "", stock: "", delivery: "", details: "", title: "", description: "", style: "Profissional", cover: "", status: "rascunho" };

function CreateAd() {
  const { id } = Route.useSearch();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: cats } = useCategories();
  const [f, setF] = useState<Form>(empty);
  const [adId, setAdId] = useState<string | undefined>(id);
  const [titles, setTitles] = useState<string[]>([]);
  const [loadingT, setLoadingT] = useState(false);
  const [loadingD, setLoadingD] = useState(false);
  const [saving, setSaving] = useState(false);
  const genTitles = useServerFn(generateTitles);
  const genDesc = useServerFn(generateDescription);

  useEffect(() => {
    setAdId(id);
    if (!id) return setF(empty);
    supabase.from("ads").select("*").eq("id", id).single().then(({ data }) => {
      const a = data as Ad | null;
      if (!a) return;
      setF({
        category: a.category ?? "", productName: a.product_name ?? "", price: a.price?.toString() ?? "", stock: a.stock?.toString() ?? "",
        delivery: a.delivery ?? "", details: a.details ?? "", title: a.title ?? "", description: a.description ?? "",
        style: a.description_style ?? "Profissional", cover: a.cover_url ?? "", status: a.status,
      });
    });
  }, [id]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const product = { category: f.category, productName: f.productName, price: f.price, stock: f.stock, delivery: f.delivery, details: f.details };
  const refreshCredits = () => qc.invalidateQueries({ queryKey: ["profile"] });

  async function runTitles() {
    if (!f.productName && !f.details) return toast.error("Preencha o nome ou os detalhes do produto");
    setLoadingT(true);
    try {
      const r = await genTitles({ data: product });
      setTitles(r.titles);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar títulos");
    } finally {
      setLoadingT(false);
      refreshCredits();
    }
  }

  async function runDesc() {
    if (!f.productName && !f.details) return toast.error("Preencha o nome ou os detalhes do produto");
    setLoadingD(true);
    try {
      const r = await genDesc({ data: { ...product, style: f.style, title: f.title } });
      set("description", r.description);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar descrição");
    } finally {
      setLoadingD(false);
      refreshCredits();
    }
  }

  async function save(silent = false) {
    setSaving(true);
    const row = {
      user_id: user!.id, category: f.category || null, product_name: f.productName, price: f.price ? Number(f.price.replace(",", ".")) : null,
      stock: f.stock ? parseInt(f.stock) : null, delivery: f.delivery || null, details: f.details, title: f.title, description: f.description,
      description_style: f.style, cover_url: f.cover || null, status: f.status, updated_at: new Date().toISOString(),
    };
    const res = adId ? await supabase.from("ads").update(row).eq("id", adId).select().single() : await supabase.from("ads").insert(row).select().single();
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return undefined; }
    const newId = res.data.id as string;
    if (!adId) { setAdId(newId); navigate({ to: "/criar", search: { id: newId }, replace: true }); }
    qc.invalidateQueries({ queryKey: ["ads"] });
    if (!silent) toast.success("Anúncio salvo com sucesso");
    return newId;
  }

  async function goCover() {
    const saved = await save(true);
    if (saved) navigate({ to: "/capa", search: { adId: saved } });
  }

  function download() {
    const blob = new Blob([fullAdText({ title: f.title, description: f.description, price: f.price ? Number(f.price.replace(",", ".")) : null, delivery: f.delivery })], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(f.title || "anuncio").slice(0, 40)}.txt`;
    a.click();
  }

  const priceNum = f.price ? Number(f.price.replace(",", ".")) : null;

  return (
    <div className="animate-fade-up">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{adId ? "Editar anúncio" : "Criar novo anúncio"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Preencha o produto, gere com IA e veja o resultado em tempo real.</p>
        </div>
        <div className="flex gap-2">
          <Select value={f.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="rascunho">Rascunho</SelectItem><SelectItem value="publicado">Publicado</SelectItem></SelectContent>
          </Select>
          <Button variant="hero" onClick={() => save()} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,440px)]">
        <div className="space-y-6">
          <Card title="Informações do produto" step="1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={f.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{cats?.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Nome do produto</Label><Input value={f.productName} onChange={(e) => set("productName", e.target.value)} placeholder="Ex: Conta Level Máximo" /></div>
              <div className="space-y-1.5"><Label>Preço (R$)</Label><Input inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="0,00" /></div>
              <div className="space-y-1.5"><Label>Quantidade / estoque</Label><Input inputMode="numeric" value={f.stock} onChange={(e) => set("stock", e.target.value)} placeholder="1" /></div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Entrega</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {DELIVERY.map((d) => (
                    <button key={d} type="button" onClick={() => set("delivery", d)} className={cn("rounded-lg border px-3 py-2 text-sm transition-colors", f.delivery === d ? "border-primary/60 bg-primary/10 text-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground")}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Detalhes do produto</Label>
                <Textarea rows={6} value={f.details} onChange={(e) => set("details", e.target.value)} placeholder="Digite todas as informações importantes do produto..." />
              </div>
            </div>
          </Card>

          <Card title="Título" step="2" action={
            <Button size="sm" variant={titles.length ? "outline" : "hero"} onClick={runTitles} disabled={loadingT}>
              {loadingT ? <Loader2 className="animate-spin" /> : titles.length ? <RefreshCw /> : <Sparkles />} {loadingT ? "Gerando..." : titles.length ? "Regenerar" : "Gerar título com IA"}
            </Button>
          }>
            {loadingT && <div className="mb-4 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>}
            {!loadingT && titles.length > 0 && (
              <div className="mb-4 space-y-2">
                {titles.map((t) => (
                  <div key={t} className="animate-fade-up flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                    <p className="flex-1 text-sm">{t}<span className="ml-2 font-mono text-[11px] text-muted-foreground">{t.length}/80</span></p>
                    <Button size="sm" variant={f.title === t ? "secondary" : "outline"} onClick={() => set("title", t)}>{f.title === t ? <><Check /> Em uso</> : "Usar este título"}</Button>
                  </div>
                ))}
              </div>
            )}
            <Input value={f.title} maxLength={80} onChange={(e) => set("title", e.target.value)} placeholder="Título do anúncio" />
            <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
              <span>1 crédito por geração · sem emojis</span>
              <span className={f.title.length > 72 ? "text-warning" : ""}>{f.title.length} / 80 caracteres</span>
            </div>
          </Card>

          <Card title="Descrição" step="3" action={
            <Button size="sm" variant={f.description ? "outline" : "hero"} onClick={runDesc} disabled={loadingD}>
              {loadingD ? <Loader2 className="animate-spin" /> : f.description ? <RefreshCw /> : <Sparkles />} {loadingD ? "Gerando..." : f.description ? "Regenerar" : "Gerar descrição com IA"}
            </Button>
          }>
            <div className="mb-4 flex flex-wrap gap-2">
              {DESC_STYLES.map((s) => (
                <button key={s} type="button" onClick={() => set("style", s)} className={cn("rounded-full border px-3 py-1 text-xs transition-colors", f.style === s ? "border-primary/60 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground")}>{s}</button>
              ))}
            </div>
            {loadingD ? <Skeleton className="h-56 w-full rounded-lg" /> : (
              <Textarea rows={12} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="A descrição gerada aparecerá aqui. Você pode editá-la livremente." />
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="font-mono text-[11px] text-muted-foreground">2 créditos por geração</span>
              <CopyButton text={f.description} label="Copiar descrição" />
            </div>
          </Card>

          <Card title="Capa" step="4" action={<Button size="sm" variant="hero" onClick={goCover}><ImageIcon /> {f.cover ? "Nova capa" : "Gerar capa"}</Button>}>
            {f.cover ? <img src={f.cover} alt="Capa" className="aspect-video w-full rounded-lg object-cover" /> : (
              <p className="text-sm text-muted-foreground">Crie uma capa 16:9 com IA no estúdio de capas. Ela será vinculada a este anúncio automaticamente.</p>
            )}
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Preview do anúncio</p>
          <div className="glass overflow-hidden rounded-2xl">
            <div className="aspect-video bg-surface-2">
              {f.cover ? <img src={f.cover} alt="" className="size-full object-cover" /> : (
                <div className="grid size-full place-items-center text-muted-foreground"><ImageIcon className="size-8 opacity-40" /></div>
              )}
            </div>
            <div className="p-5">
              {f.category && <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted-foreground">{f.category}</span>}
              <h2 className="mt-2 text-lg font-semibold leading-snug">{f.title || <span className="text-muted-foreground">Seu título aparecerá aqui</span>}</h2>
              <p className="mt-2 text-2xl font-semibold text-gradient-primary">{brl(priceNum)}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {f.delivery && <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1"><Zap className="size-3 text-warning" /> Entrega {f.delivery.toLowerCase()}</span>}
                {f.stock && <span className="rounded-md border border-border px-2 py-1">{f.stock} em estoque</span>}
              </div>
              <div className="mt-4 max-h-72 overflow-y-auto whitespace-pre-line border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                {f.description || "A descrição do anúncio aparecerá aqui."}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
              <CopyButton text={fullAdText({ title: f.title, description: f.description, price: priceNum, delivery: f.delivery })} label="Copiar anúncio" variant="hero" className="col-span-2" />
              <CopyButton text={f.title} label="Copiar título" />
              <CopyButton text={f.description} label="Copiar descrição" />
              <Button variant="outline" size="sm" className="col-span-2" onClick={download}><Download /> Baixar anúncio</Button>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">Pronto? Copie e publique na GGMax. <Link to="/anuncios" className="hover:text-foreground">Ver meus anúncios</Link></p>
        </div>
      </div>
    </div>
  );
}

function Card({ title, step, action, children }: { title: string; step: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-6 place-items-center rounded-md border border-border bg-surface-2 font-mono text-[11px] text-muted-foreground">{step}</span>
          <h2 className="font-medium">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
