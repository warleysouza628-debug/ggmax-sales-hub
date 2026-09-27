import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Bookmark, FolderOpen, Image as ImageIcon, Plus, Sparkles, Zap, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAds, useProfile } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdMenu, EmptyState, StatusBadge } from "@/components/AdActions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — GGMax AdMaker" }] }),
  component: Dashboard,
});

const DEMO = [
  { product_name: "Blox Fruits — Conta Level Máximo", category: "Blox Fruits", price: 89.9, delivery: "Imediata", title: "Conta Blox Fruits Level Máximo com Fruta Dragon e Raça V4", status: "publicado" },
  { product_name: "Pet Simulator 99 — Huge Exclusive", category: "Pet Simulator 99", price: 149.9, delivery: "Manual", title: "Huge Exclusive Pet Simulator 99 com Entrega Rápida e Segura", status: "rascunho" },
  { product_name: "Roube um Brainrot — Brainrot Raro", category: "Roube um Brainrot", price: 24.9, delivery: "Até 24 horas", title: "Brainrot Raro para Roube um Brainrot Entrega em Até 24h", status: "publicado" },
  { product_name: "Car Parking Multiplayer 2 — Carro Personalizado", category: "Car Parking Multiplayer", price: 39.9, delivery: "Manual", title: "Carro Personalizado Car Parking Multiplayer 2 Tunado Completo", status: "rascunho" },
];

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: p } = useProfile();
  const { data: ads, isLoading } = useAds();
  const { data: coverCount } = useQuery({
    queryKey: ["covers-count", user?.id],
    queryFn: async () => (await supabase.from("covers").select("id", { count: "exact", head: true }).eq("user_id", user!.id)).count ?? 0,
  });

  async function loadDemo() {
    const { error } = await supabase.from("ads").insert(DEMO.map((d) => ({ ...d, user_id: user!.id, description: "Anúncio de exemplo. Edite ou exclua quando quiser." })));
    if (error) return toast.error(error.message);
    toast.success("Exemplos adicionados");
    qc.invalidateQueries({ queryKey: ["ads"] });
  }

  const first = (p?.name ?? "").split(" ")[0];
  const stats = [
    { label: "Anúncios criados", value: ads?.length, icon: FileText },
    { label: "Capas geradas", value: coverCount, icon: ImageIcon },
    { label: "Anúncios salvos", value: ads?.filter((a) => a.is_favorite).length, icon: Bookmark },
    { label: "Plano atual", value: (p as any)?.plans?.name ?? "Free", icon: Zap },
  ];

  return (
    <div className="animate-fade-up space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Olá, {first || "vendedor"} 👋</h1>
          <p className="mt-1.5 text-muted-foreground">Pronto para criar seu próximo anúncio?</p>
        </div>
        <Button asChild variant="hero" size="lg"><Link to="/criar"><Plus /> Criar novo anúncio</Link></Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{s.label}</span>
              <s.icon className="size-4" />
            </div>
            {s.value === undefined ? <Skeleton className="mt-4 h-8 w-16" /> : <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{s.value}</p>}
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Ações rápidas</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { to: "/criar", icon: Sparkles, t: "Criar anúncio", d: "Título e descrição com IA" },
            { to: "/capa", icon: ImageIcon, t: "Criar capa", d: "Capas 16:9 em 8 estilos" },
            { to: "/anuncios", icon: FolderOpen, t: "Meus anúncios", d: "Gerencie seus anúncios" },
          ].map((a) => (
            <Link key={a.to} to={a.to} className="glass group flex items-center gap-4 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40">
              <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><a.icon className="size-5" /></div>
              <div className="flex-1">
                <p className="font-medium">{a.t}</p>
                <p className="text-sm text-muted-foreground">{a.d}</p>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Anúncios recentes</h2>
          <Link to="/anuncios" className="text-sm text-muted-foreground hover:text-foreground">Ver todos</Link>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : !ads?.length ? (
          <EmptyState
            icon={FileText}
            title="Nenhum anúncio ainda"
            text="Crie seu primeiro anúncio com IA ou carregue exemplos para explorar a interface."
            action={<div className="flex gap-2"><Button asChild variant="hero"><Link to="/criar"><Plus /> Criar anúncio</Link></Button><Button variant="outline" onClick={loadDemo}>Carregar exemplos</Button></div>}
          />
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            {ads.slice(0, 6).map((ad) => (
              <div key={ad.id} className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-0 hover:bg-surface/50">
                <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {ad.cover_url && <img src={ad.cover_url} alt="" className="size-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <Link to="/criar" search={{ id: ad.id }} className="block truncate text-sm font-medium hover:underline">{ad.title || ad.product_name || "Sem título"}</Link>
                  <p className="text-xs text-muted-foreground">{ad.category ?? "—"}</p>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:block">{format(new Date(ad.created_at), "dd/MM/yyyy")}</span>
                <StatusBadge status={ad.status} />
                <AdMenu ad={ad} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
