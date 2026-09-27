import { createFileRoute } from "@tanstack/react-router";
import { AdsList } from "@/components/AdsList";
import { PageHeader } from "@/components/AdActions";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — GGMax AdMaker" }] }),
  component: () => (
    <div className="animate-fade-up">
      <PageHeader title="Histórico" subtitle="Todos os anúncios salvos automaticamente. Recupere qualquer um." />
      <AdsList mode="history" />
    </div>
  ),
});
