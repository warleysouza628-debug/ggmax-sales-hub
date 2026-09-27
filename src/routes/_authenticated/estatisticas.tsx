import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAds } from "@/lib/data";
import { PageHeader } from "@/components/AdActions";

export const Route = createFileRoute("/_authenticated/estatisticas")({
  head: () => ({ meta: [{ title: "Estatísticas — GGMax AdMaker" }] }),
  component: Stats,
});

function Stats() {
  const { user } = useAuth();
  const { data: ads } = useAds();
  const { data: tx } = useQuery({
    queryKey: ["tx", user?.id],
    queryFn: async () => (await supabase.from("credit_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const byCat: Record<string, number> = {};
  ads?.forEach((a) => (byCat[a.category ?? "Outros"] = (byCat[a.category ?? "Outros"] ?? 0) + 1));
  const max = Math.max(1, ...Object.values(byCat));
  const used = tx?.filter((t: any) => t.amount < 0).reduce((s: number, t: any) => s - t.amount, 0) ?? 0;

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader title="Estatísticas" subtitle="Seu uso do AdMaker." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat l="Anúncios" v={ads?.length ?? 0} />
        <Stat l="Publicados" v={ads?.filter((a) => a.status === "publicado").length ?? 0} />
        <Stat l="Créditos usados" v={used} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h2 className="mb-5 font-medium">Anúncios por categoria</h2>
          {Object.keys(byCat).length === 0 ? <p className="text-sm text-muted-foreground">Sem dados ainda.</p> : (
            <div className="space-y-3">
              {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-sm"><span>{k}</span><span className="text-muted-foreground">{v}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-gradient-primary" style={{ width: `${(v / max) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="mb-5 font-medium">Uso de créditos</h2>
          {!tx?.length ? <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p> : (
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {tx.map((t: any) => (
                <div key={t.id} className="flex justify-between border-b border-border py-2 text-sm last:border-0">
                  <span>{t.reason}<span className="ml-2 text-xs text-muted-foreground">{format(new Date(t.created_at), "dd/MM HH:mm")}</span></span>
                  <span className={t.amount < 0 ? "text-muted-foreground" : "text-success"}>{t.amount > 0 ? "+" : ""}{t.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ l, v }: { l: string; v: number }) {
  return <div className="glass rounded-2xl p-5"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-3 text-3xl font-semibold tabular-nums">{v}</p></div>;
}
