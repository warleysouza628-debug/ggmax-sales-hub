import { createFileRoute } from "@tanstack/react-router";
import { AdsList } from "@/components/AdsList";
import { PageHeader } from "@/components/AdActions";

export const Route = createFileRoute("/_authenticated/favoritos")({
  head: () => ({ meta: [{ title: "Favoritos — GGMax AdMaker" }] }),
  component: () => (
    <div className="animate-fade-up">
      <PageHeader title="Favoritos" subtitle="Seus anúncios marcados com estrela." />
      <AdsList onlyFav />
    </div>
  ),
});
