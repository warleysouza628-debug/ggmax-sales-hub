import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  Check,
  Download,
  Image as ImageIcon,
  Layers,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { COVER_STYLES, useCategories } from "@/lib/data";
import { generateCover } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/AdActions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/capa")({
  validateSearch: z.object({ adId: z.string().optional() }),
  head: () => ({ meta: [{ title: "Criar capa — GGMax AdMaker" }] }),
  component: CoverPage,
});

const FONTS = [
  { v: "Geist", l: "Geist" },
  { v: "Bebas Neue", l: "Bebas Neue" },
  { v: "Montserrat", l: "Montserrat" },
];

const PALETTES = ["Vermelho", "Azul", "Roxo", "Verde", "Dourado", "Preto / Branco"];
const LAYOUTS = ["Produto em destaque", "Personagem + produto", "Texto dominante", "Oferta comercial"];
const LIGHTING = ["Cinematográfica", "Neon", "Contraste alto", "Suave / premium"];
const POSITIONS = ["Esquerda", "Centro", "Direita"];
const TEXT_POSITIONS = ["Topo", "Centro", "Centro / inferior", "Inferior"];
const DENSITIES = ["Limpa", "Equilibrada", "Impactante"];

type Editor = {
  text: string;
  sub: string;
  font: string;
  size: number;
  x: number;
  y: number;
  color: string;
  overlay: number;
  badge: string;
  logo: HTMLImageElement | null;
};

function CoverPage() {
  const { adId } = Route.useSearch();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: cats } = useCategories();
  const gen = useServerFn(generateCover);

  const [form, setForm] = useState({
    product: "",
    category: "",
    mainText: "",
    subText: "",
    style: "Gamer profissional",
    accentColor: "Vermelho",
    layout: "Produto em destaque",
    lighting: "Cinematográfica",
    textPosition: "Centro / inferior",
    subjectPosition: "Direita",
    badge: "",
    density: "Equilibrada",
  });
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ed, setEd] = useState<Editor>({
    text: "",
    sub: "",
    font: "Bebas Neue",
    size: 96,
    x: 50,
    y: 78,
    color: "#ffffff",
    overlay: 35,
    badge: "",
    logo: null,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const { data: recent } = useQuery({
    queryKey: ["covers", user?.id],
    queryFn: async () =>
      (await supabase.from("covers").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(8)).data ?? [],
  });

  useEffect(() => {
    if (!adId) return;
    supabase.from("ads").select("product_name,category,title").eq("id", adId).single().then(({ data }) => {
      if (data) {
        setForm((f) => ({
          ...f,
          product: data.product_name ?? "",
          category: data.category ?? "",
          mainText: data.title ?? "",
        }));
      }
    });
  }, [adId]);

  async function run() {
    if (!form.product.trim()) {
      toast.error("Informe o produto antes de gerar");
      setStep(1);
      return;
    }
    setBusy(true);
    setEditing(false);
    try {
      const r = await gen({ data: { ...form, adId } });
      setUrl(r.url);
      qc.invalidateQueries({ queryKey: ["covers"] });
      toast.success("Capa profissional gerada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar capa");
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
    }
  }

  useEffect(() => {
    if (!editing || !url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = url;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, url]);

  useEffect(() => { if (editing) draw(); });

  function draw() {
    const c = canvasRef.current, img = imgRef.current;
    if (!c || !img) return;
    const W = 1600, H = 900;
    c.width = W; c.height = H;
    const ctx = c.getContext("2d")!;
    const s = Math.max(W / img.width, H / img.height);
    ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
    if (ed.overlay) {
      const g = ctx.createLinearGradient(0, H * 0.35, 0, H);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${ed.overlay / 100})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    const x = (ed.x / 100) * W, y = (ed.y / 100) * H;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 24;
    if (ed.text) {
      ctx.font = `800 ${ed.size}px "${ed.font}"`;
      ctx.fillStyle = ed.color;
      ctx.fillText(ed.text, x, y);
    }
    if (ed.sub) {
      ctx.font = `600 ${Math.round(ed.size * 0.38)}px "${ed.font === "Bebas Neue" ? "Geist" : ed.font}"`;
      ctx.fillStyle = ed.color;
      ctx.fillText(ed.sub, x, y + ed.size * 0.75);
    }
    ctx.shadowBlur = 0;
    if (ed.badge) {
      ctx.font = "700 34px Geist";
      const w = ctx.measureText(ed.badge).width + 48;
      ctx.fillStyle = "#38bdf8";
      roundRect(ctx, 48, 48, w, 64, 32); ctx.fill();
      ctx.fillStyle = "#0b1220"; ctx.textAlign = "center";
      ctx.fillText(ed.badge, 48 + w / 2, 81);
    }
    if (ed.logo) {
      const lw = 180, lh = (ed.logo.height / ed.logo.width) * lw;
      ctx.drawImage(ed.logo, W - lw - 48, 48, lw, lh);
    }
  }

  function download() {
    if (editing && canvasRef.current) {
      const a = document.createElement("a");
      a.href = canvasRef.current.toDataURL("image/png");
      a.download = "ggmax-admaker-capa.png";
      a.click();
    } else if (url) {
      fetch(url).then((r) => r.blob()).then((b) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = "ggmax-admaker-capa.png";
        a.click();
      });
    }
  }

  async function saveEdited() {
    const c = canvasRef.current; if (!c) return;
    setSaving(true);
    try {
      const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
      const path = `${user!.id}/${crypto.randomUUID()}.png`;
      const up = await supabase.storage.from("covers").upload(path, blob, { contentType: "image/png" });
      if (up.error) throw up.error;
      const s = await supabase.storage.from("covers").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (s.error) throw s.error;
      await supabase.from("covers").insert({ user_id: user!.id, image_url: s.data.signedUrl, style: form.style + " (editada)", ad_id: adId ?? null });
      setUrl(s.data.signedUrl); setEditing(false);
      qc.invalidateQueries({ queryKey: ["covers"] });
      toast.success("Capa salva");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar");
    } finally { setSaving(false); }
  }

  async function useInAd() {
    if (!url) return;
    if (!adId) return toast.error("Abra a capa a partir de um anúncio para vinculá-la");
    await supabase.from("ads").update({ cover_url: url }).eq("id", adId);
    qc.invalidateQueries({ queryKey: ["ads"] });
    toast.success("Capa adicionada ao anúncio");
    navigate({ to: "/criar", search: { id: adId } });
  }

  const progress = Math.round((step / 4) * 100);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Criar capa profissional"
        subtitle="Monte a direção de arte antes da IA gerar · formato 16:9 · 5 créditos por geração"
      />

      <div className="mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-surface to-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary"><WandSparkles className="size-5" /></div>
            <div>
              <p className="font-semibold">Gerador de capas de vendedor</p>
              <p className="text-xs text-muted-foreground">Escolha a direção visual. A IA cuida da arte.</p>
            </div>
          </div>
          <div className="min-w-[180px]">
            <div className="mb-1 flex justify-between text-[11px] text-muted-foreground"><span>Configuração</span><span>{progress}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
        <div className="glass rounded-2xl p-5">
          {!editing ? (
            <>
              <div className="mb-5 grid grid-cols-4 gap-1 rounded-xl bg-surface p-1">
                {[1, 2, 3, 4].map((n) => (
                  <button key={n} onClick={() => setStep(n)} className={cn("rounded-lg px-2 py-2 text-xs font-medium transition", step === n ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                    {n}. {["Produto", "Estilo", "Composição", "Texto"][n - 1]}
                  </button>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold">1. O que você está vendendo?</p>
                    <p className="mt-1 text-xs text-muted-foreground">Quanto mais claro o produto, melhor a direção da arte.</p>
                  </div>
                  <div className="space-y-1.5"><Label>Produto</Label><Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="Ex: Conta Blox Fruits Level Máximo" /></div>
                  <div className="space-y-1.5">
                    <Label>Categoria / jogo</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o jogo ou categoria" /></SelectTrigger>
                      <SelectContent>{cats?.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-xl border border-border bg-surface/70 p-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Dica:</span> use o nome real do produto. Evite colocar informações longas no título da capa.
                  </div>
                  <Button className="w-full" onClick={() => setStep(2)} disabled={!form.product.trim()}>Continuar <Check /></Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold">2. Escolha o estilo visual</p>
                    <p className="mt-1 text-xs text-muted-foreground">A referência é uma arte comercial, não uma imagem genérica de IA.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {COVER_STYLES.map((s) => (
                      <button key={s} onClick={() => setForm({ ...form, style: s })} className={cn("group rounded-xl border p-3 text-left transition", form.style === s ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-primary/40")}>
                        <div className={cn("mb-2 h-10 rounded-lg", s.includes("Vermelho") ? "bg-gradient-to-r from-red-950 via-red-600 to-black" : s.includes("Azul") ? "bg-gradient-to-r from-blue-950 via-cyan-600 to-black" : s.includes("Roxo") || s === "Anime" ? "bg-gradient-to-r from-purple-950 via-fuchsia-600 to-black" : s === "Verde" ? "bg-gradient-to-r from-green-950 via-green-500 to-black" : s === "Dourado" || s === "Premium" ? "bg-gradient-to-r from-yellow-950 via-yellow-600 to-black" : "bg-gradient-to-r from-zinc-900 via-zinc-700 to-black")} />
                        <span className="text-xs font-medium">{s}</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <OptionSelect label="Paleta" value={form.accentColor} options={PALETTES} onChange={(v) => setForm({ ...form, accentColor: v })} />
                    <OptionSelect label="Iluminação" value={form.lighting} options={LIGHTING} onChange={(v) => setForm({ ...form, lighting: v })} />
                  </div>
                  <Button className="w-full" onClick={() => setStep(3)}>Continuar <Check /></Button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold">3. Monte a composição</p>
                    <p className="mt-1 text-xs text-muted-foreground">Essas escolhas orientam a IA para criar uma capa equilibrada.</p>
                  </div>
                  <OptionSelect label="Composição" value={form.layout} options={LAYOUTS} onChange={(v) => setForm({ ...form, layout: v })} />
                  <div className="grid grid-cols-2 gap-3">
                    <OptionSelect label="Elemento principal" value={form.subjectPosition} options={POSITIONS} onChange={(v) => setForm({ ...form, subjectPosition: v })} />
                    <OptionSelect label="Densidade" value={form.density} options={DENSITIES} onChange={(v) => setForm({ ...form, density: v })} />
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-medium"><Layers className="size-4 text-primary" /> Como ficará a hierarquia</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md bg-primary/15 px-2 py-1 text-primary">Produto</span><span>→</span><span className="rounded-md bg-surface-2 px-2 py-1">Texto</span><span>→</span><span className="rounded-md bg-surface-2 px-2 py-1">Detalhes</span>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => setStep(4)}>Continuar <Check /></Button>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold">4. Texto e chamada comercial</p>
                    <p className="mt-1 text-xs text-muted-foreground">Pouco texto, grande impacto e leitura rápida.</p>
                  </div>
                  <div className="space-y-1.5"><Label>Texto principal</Label><Input maxLength={40} value={form.mainText} onChange={(e) => setForm({ ...form, mainText: e.target.value })} placeholder="Ex: CONTAS ROBLOX" /></div>
                  <div className="space-y-1.5"><Label>Texto secundário</Label><Input maxLength={60} value={form.subText} onChange={(e) => setForm({ ...form, subText: e.target.value })} placeholder="Ex: ENTREGA IMEDIATA" /></div>
                  <div className="space-y-1.5"><Label>Selo / badge</Label><Input maxLength={40} value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Ex: 100% SEGURO" /></div>
                  <OptionSelect label="Posição do texto" value={form.textPosition} options={TEXT_POSITIONS} onChange={(v) => setForm({ ...form, textPosition: v })} />
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Regra do AdMaker:</span> a IA deve priorizar legibilidade, hierarquia e aparência de design gráfico profissional.
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => setStep(3)}>Voltar</Button>
                    <Button variant="hero" onClick={run} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? "Gerando..." : "Gerar capa"}</Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Editor de capa</p>
              <div className="mt-4 space-y-4">
                <div className="space-y-1.5"><Label>Texto</Label><Input value={ed.text} onChange={(e) => setEd({ ...ed, text: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Texto secundário</Label><Input value={ed.sub} onChange={(e) => setEd({ ...ed, sub: e.target.value })} /></div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Select value={ed.font} onValueChange={(v) => setEd({ ...ed, font: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FONTS.map((f) => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}</SelectContent>
                  </Select>
                  <input type="color" value={ed.color} onChange={(e) => setEd({ ...ed, color: e.target.value })} className="h-9 w-12 cursor-pointer rounded-md border border-border bg-transparent" />
                </div>
                <Range label="Tamanho" v={ed.size} min={32} max={180} on={(v) => setEd({ ...ed, size: v })} />
                <Range label="Posição horizontal" v={ed.x} min={10} max={90} on={(v) => setEd({ ...ed, x: v })} />
                <Range label="Posição vertical" v={ed.y} min={10} max={90} on={(v) => setEd({ ...ed, y: v })} />
                <Range label="Escurecer fundo" v={ed.overlay} min={0} max={90} on={(v) => setEd({ ...ed, overlay: v })} />
                <div className="space-y-1.5"><Label>Selo</Label><Input value={ed.badge} onChange={(e) => setEd({ ...ed, badge: e.target.value })} placeholder="Ex: ENTREGA IMEDIATA" /></div>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:text-foreground">
                  <Upload className="size-4" /> Adicionar logo/imagem
                  <input type="file" accept="image/*" hidden onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const im = new Image(); im.onload = () => setEd((p) => ({ ...p, logo: im })); im.src = URL.createObjectURL(file);
                  }} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                  <Button variant="hero" onClick={saveEdited} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar</Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="glass relative overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-border bg-surface/60 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><ImageIcon className="size-4" /> Pré-visualização 16:9</div>
              <span className="rounded-full border border-border bg-surface px-2 py-1 text-[10px] text-muted-foreground">GGMax AdMaker</span>
            </div>
            <div className="aspect-video w-full bg-surface-2">
              {busy ? (
                <div className="relative size-full overflow-hidden">
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface via-surface-2 to-surface" />
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                      <WandSparkles className="size-7 animate-pulse text-primary" />
                      <span>Criando uma arte com direção de designer...</span>
                      <span className="text-xs">Aplicando composição, tipografia e iluminação</span>
                    </div>
                  </div>
                </div>
              ) : editing ? (
                <canvas ref={canvasRef} className="size-full" />
              ) : url ? (
                <img src={url} alt="Capa gerada profissionalmente" className="animate-fade-up size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-center text-muted-foreground">
                  <div>
                    <ImageIcon className="mx-auto size-10 opacity-40" />
                    <p className="mt-3 text-sm">Sua capa aparecerá aqui</p>
                    <p className="mt-1 text-xs">Configure os 4 passos ao lado</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {url && !busy && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={download}><Download /> Baixar imagem</Button>
              <Button variant="outline" onClick={run}><RefreshCw /> Regenerar</Button>
              {!editing && <Button variant="outline" onClick={() => { setEd((p) => ({ ...p, text: form.mainText, sub: form.subText, badge: form.badge })); setEditing(true); }}><Pencil /> Editar</Button>}
              {adId && <Button variant="hero" onClick={useInAd}><Check /> Usar no anúncio</Button>}
            </div>
          )}

          {!!recent?.length && (
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Capas recentes</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {recent.map((c: any) => (
                  <button key={c.id} onClick={() => { setUrl(c.image_url); setEditing(false); }} className={cn("overflow-hidden rounded-lg border transition-all hover:border-primary/60", url === c.image_url ? "border-primary" : "border-border")}>
                    <img src={c.image_url} alt="" className="aspect-video w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function Range({ label, v, min, max, on }: { label: string; v: number; min: number; max: number; on: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground"><span>{label}</span><span className="font-mono">{v}</span></div>
      <Slider value={[v]} min={min} max={max} step={1} onValueChange={([x]) => on(x ?? v)} />
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
