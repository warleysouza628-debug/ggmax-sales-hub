import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, FileText, History, Image as ImageIcon, LayoutGrid, Sparkles, Type, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import demoCover from "@/assets/demo-cover.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GGMax AdMaker — Crie anúncios profissionais em segundos" },
      { name: "description", content: "Transforme informações simples do seu produto em títulos, descrições e capas prontas para publicar na GGMax." },
      { property: "og:title", content: "GGMax AdMaker — Crie anúncios profissionais em segundos" },
      { property: "og:description", content: "Títulos, descrições e capas com IA para vendedores da GGMax." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Type, t: "IA para títulos", d: "Gere títulos mais profissionais e claros, dentro do limite de 80 caracteres." },
  { icon: FileText, t: "IA para descrições", d: "Transforme informações do produto em uma descrição completa e organizada." },
  { icon: ImageIcon, t: "Gerador de capas", d: "Crie capas 16:9 profissionais para seus anúncios em diversos estilos." },
  { icon: LayoutGrid, t: "Modelos por categoria", d: "Adapte o anúncio ao tipo de produto: contas, itens, moedas e serviços." },
  { icon: Copy, t: "Copiar com 1 clique", d: "Copie título, descrição ou o anúncio inteiro instantaneamente." },
  { icon: History, t: "Histórico", d: "Todos os seus anúncios salvos automaticamente e prontos para reutilizar." },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-hero" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[700px] grid-bg" />

      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
          <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
          <Link to="/planos" className="hover:text-foreground transition-colors">Planos</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/login">Entrar</Link></Button>
          <Button asChild size="sm"><Link to="/cadastro">Começar grátis</Link></Button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="size-3.5 text-primary" /> Feito para vendedores da GGMax
        </div>
        <h1 className="animate-fade-up mx-auto mt-6 max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-gradient md:text-7xl [animation-delay:60ms]">
          Crie anúncios que parecem profissionais em segundos.
        </h1>
        <p className="animate-fade-up mx-auto mt-6 max-w-xl text-pretty text-lg text-muted-foreground [animation-delay:120ms]">
          Transforme informações simples do seu produto em títulos, descrições e capas prontas para publicar na GGMax.
        </p>
        <div className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-3 [animation-delay:180ms]">
          <Button asChild variant="hero" size="lg">
            <Link to="/cadastro">Criar meu anúncio <ArrowRight /></Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#como-funciona">Ver como funciona</a>
          </Button>
        </div>

        <HeroMockup />
      </section>

      <section id="recursos" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Recursos</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Tudo que você precisa para criar seu anúncio</h2>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.t} className="group bg-background p-7 transition-colors hover:bg-surface">
              <div className="grid size-10 place-items-center rounded-lg border border-border bg-surface-2 text-primary transition-transform group-hover:-translate-y-0.5">
                <f.icon className="size-[18px]" />
              </div>
              <h3 className="mt-5 font-medium">{f.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Como funciona</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Do produto ao anúncio publicado em 4 passos</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {[
            ["01", "Preencha o produto", "Categoria, nome, preço, entrega e detalhes."],
            ["02", "Gere título e descrição", "A IA escreve com base nas suas informações."],
            ["03", "Crie a capa", "Escolha o estilo e gere uma capa 16:9."],
            ["04", "Copie e publique", "Copie tudo com um clique e publique na GGMax."],
          ].map(([n, t, d]) => (
            <div key={n} className="glass rounded-2xl p-6">
              <span className="font-mono text-xs text-muted-foreground">{n}</span>
              <h3 className="mt-6 font-medium">{t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="glass relative overflow-hidden rounded-3xl px-8 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 bg-hero opacity-80" />
          <h2 className="relative text-balance text-3xl font-semibold tracking-tight md:text-5xl">Venda mais rápido com anúncios melhores.</h2>
          <p className="relative mx-auto mt-4 max-w-md text-muted-foreground">Comece grátis com 42 créditos. Sem cartão de crédito.</p>
          <div className="relative mt-8 flex justify-center">
            <Button asChild variant="hero" size="lg"><Link to="/cadastro">Criar meu anúncio <ArrowRight /></Link></Button>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <Logo />
          <p>Ferramenta independente para vendedores. © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="animate-fade-up relative mx-auto mt-16 max-w-5xl [animation-delay:260ms]">
      <div className="absolute -inset-x-10 -top-10 bottom-0 bg-gradient-primary opacity-20 blur-3xl" />
      <div className="glass relative overflow-hidden rounded-2xl text-left">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
          <span className="size-2.5 rounded-full bg-muted" /><span className="size-2.5 rounded-full bg-muted" /><span className="size-2.5 rounded-full bg-muted" />
          <span className="ml-3 font-mono text-[11px] text-muted-foreground">admaker / criar-anuncio</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[11px]"><Zap className="size-3 text-warning" /> 42 créditos</span>
        </div>
        <div className="grid gap-0 md:grid-cols-[1fr_1.15fr]">
          <div className="space-y-4 border-b border-border p-6 md:border-b-0 md:border-r">
            <Field label="Categoria" value="Blox Fruits" />
            <Field label="Produto" value="Conta Level Máximo + Fruta Dragon" />
            <div className="grid grid-cols-2 gap-3"><Field label="Preço" value="R$ 89,90" /><Field label="Entrega" value="Imediata" /></div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Título gerado</p>
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
                Conta Blox Fruits Level Máximo com Fruta Dragon e Raça V4
                <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                  <span>56 / 80 caracteres</span><span className="inline-flex items-center gap-1 text-success"><Check className="size-3" />Copiado</span>
                </div>
              </div>
            </div>
            <Button variant="hero" className="w-full"><Sparkles /> Gerar descrição com IA</Button>
          </div>
          <div className="p-6">
            <img src={demoCover} alt="Capa gerada de exemplo" width={1536} height={864} className="aspect-video w-full rounded-xl object-cover" />
            <h3 className="mt-4 font-medium">Conta Blox Fruits Level Máximo com Fruta Dragon e Raça V4</h3>
            <p className="mt-1 text-xl font-semibold text-gradient-primary">R$ 89,90</p>
            <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <p>🔥 Conta no nível máximo, pronta para jogar.</p>
              <p>📦 Fruta Dragon permanente + Raça V4 completa.</p>
              <p>⚡ Entrega imediata após a confirmação.</p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline"><Copy /> Copiar título</Button>
              <Button size="sm" variant="outline"><Copy /> Copiar descrição</Button>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Shield className="size-3.5" /> Sem dados pessoais nas capas</span>
        <span className="inline-flex items-center gap-1.5"><Zap className="size-3.5" /> Resultados em segundos</span>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">{value}</div>
    </div>
  );
}
