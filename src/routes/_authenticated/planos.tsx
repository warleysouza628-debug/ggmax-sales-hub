import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/data";
import { PageHeader } from "@/components/AdActions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planos")({
  head: () => ({ meta: [{ title: "Planos — GGMax AdMaker" }] }),
  component: Plans,
});

function Plans() {
  const { data: p } = useProfile();
  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: async () => (await supabase.from("plans").select("*").order("sort")).data ?? [] });
  return (
    <div className="animate-fade-up">
      <PageHeader title="Planos" subtitle="Escolha o plano ideal para o seu volume de vendas." />
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {plans?.map((pl: any) => {
          const current = p?.plan_id === pl.id;
          return (
            <div key={pl.id} className={cn("glass relative rounded-3xl p-8", pl.highlighted && "border-primary/50 shadow-glow")}>
              {pl.highlighted && <span className="absolute -top-3 left-8 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Mais popular</span>}
              <h2 className="text-lg font-semibold">{pl.name}</h2>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">{pl.price_cents ? (pl.price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0"}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Zap className="size-3.5 text-warning" /> {pl.monthly_credits} créditos por mês</p>
              <ul className="mt-6 space-y-3">
                {pl.features.map((f: string) => <li key={f} className="flex items-start gap-2.5 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{f}</li>)}
              </ul>
              <Button
                variant={pl.highlighted ? "hero" : "outline"}
                className="mt-8 w-full"
                disabled={current}
                onClick={() => toast.info("Pagamentos serão ativados em breve. Fale com o suporte para assinar o Pro.")}
              >
                {current ? "Plano atual" : pl.id === "free" ? "Começar grátis" : "Assinar Pro"}
              </Button>
            </div>
          );
        })}
      </div>
      <div className="mx-auto mt-10 max-w-4xl glass rounded-2xl p-6">
        <h3 className="font-medium">Como funcionam os créditos</h3>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-surface p-3">Gerar título <span className="float-right text-muted-foreground">1 crédito</span></div>
          <div className="rounded-lg bg-surface p-3">Gerar descrição <span className="float-right text-muted-foreground">2 créditos</span></div>
          <div className="rounded-lg bg-surface p-3">Gerar capa <span className="float-right text-muted-foreground">5 créditos</span></div>
        </div>
      </div>
    </div>
  );
}
