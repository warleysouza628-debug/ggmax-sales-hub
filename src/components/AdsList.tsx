import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { FileText, Image as ImageIcon, Plus, Search, Star } from "lucide-react";
import { brl, useAds, type Ad } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdMenu, EmptyState, StatusBadge, useAdMutations } from "@/components/AdActions";
import { cn } from "@/lib/utils";

const FILTERS = [
  { k: "all", l: "Todos" },
  { k: "rascunho", l: "Rascunhos" },
  { k: "publicado", l: "Publicados" },
  { k: "fav", l: "Favoritos" },
];

export function AdsList({ onlyFav = false, mode = "grid" }: { onlyFav?: boolean; mode?: "grid" | "history" }) {
  const { data: ads, isLoading } = useAds();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(onlyFav ? "fav" : "all");
  const m = useAdMutations();

  const list = useMemo(() => {
    let l = ads ?? [];
    if (filter === "fav") l = l.filter((a) => a.is_favorite);
    else if (filter !== "all") l = l.filter((a) => a.status === filter);
    if (q) l = l.filter((a) => `${a.title} ${a.product_name} ${a.category}`.toLowerCase().includes(q.toLowerCase()));
    return l;
  }, [ads, q, filter]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar anúncios..." className="pl-9" />
        </div>
        {!onlyFav && mode === "grid" && (
          <div className="flex rounded-lg border border-border bg-surface p-0.5">
            {FILTERS.map((f) => (
              <button key={f.k} onClick={() => setFilter(f.k)} className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", filter === f.k ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground")}>{f.l}</button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      ) : !list.length ? (
        <EmptyState
          icon={onlyFav ? Star : FileText}
          title={onlyFav ? "Nenhum favorito" : "Nenhum anúncio encontrado"}
          text={onlyFav ? "Marque anúncios com a estrela para vê-los aqui." : "Crie um anúncio para começar."}
          action={<Button asChild variant="hero"><Link to="/criar"><Plus /> Criar anúncio</Link></Button>}
        />
      ) : mode === "history" ? (
        <div className="glass overflow-hidden rounded-2xl">
          {list.map((ad) => (
            <div key={ad.id} className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-0">
              <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">{format(new Date(ad.created_at), "dd/MM/yy HH:mm")}</span>
              <div className="size-10 shrink-0 overflow-hidden rounded-md bg-surface-2">{ad.cover_url && <img src={ad.cover_url} alt="" className="size-full object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ad.title || "Sem título"}</p>
                <p className="truncate text-xs text-muted-foreground">{ad.product_name} · {ad.category ?? "—"}</p>
              </div>
              <Button asChild size="sm" variant="outline"><Link to="/criar" search={{ id: ad.id }}>Recuperar</Link></Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((ad) => <AdCard key={ad.id} ad={ad} onFav={() => m.favorite(ad)} />)}
        </div>
      )}
    </div>
  );
}

function AdCard({ ad, onFav }: { ad: Ad; onFav: () => void }) {
  return (
    <div className="glass group overflow-hidden rounded-2xl transition-all hover:-translate-y-0.5 hover:border-foreground/15">
      <Link to="/criar" search={{ id: ad.id }} className="block aspect-video bg-surface-2">
        {ad.cover_url ? <img src={ad.cover_url} alt="" className="size-full object-cover" loading="lazy" /> : <div className="grid size-full place-items-center text-muted-foreground"><ImageIcon className="size-6 opacity-40" /></div>}
      </Link>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{ad.category ?? "—"}</span>
          <div className="flex items-center">
            <button onClick={onFav} className="grid size-8 place-items-center rounded-md hover:bg-accent" aria-label="Favoritar">
              <Star className={cn("size-4", ad.is_favorite ? "fill-warning text-warning" : "text-muted-foreground")} />
            </button>
            <AdMenu ad={ad} />
          </div>
        </div>
        <Link to="/criar" search={{ id: ad.id }} className="mt-1 line-clamp-2 block min-h-10 text-sm font-medium leading-snug hover:underline">{ad.title || ad.product_name || "Sem título"}</Link>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-semibold">{brl(ad.price)}</span>
          <StatusBadge status={ad.status} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{format(new Date(ad.created_at), "dd/MM/yyyy")}</p>
      </div>
    </div>
  );
}
