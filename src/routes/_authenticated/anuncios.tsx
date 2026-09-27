import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AdsList } from "@/components/AdsList";
import { PageHeader } from "@/components/AdActions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/anuncios")({
  head: () => ({ meta: [{ title: "Meus anúncios — GGMax AdMaker" }] }),
  component: () => (
    <div className="animate-fade-up">
      <PageHeader title="Meus anúncios" subtitle="Todos os anúncios que você criou." action={<Button asChild variant="hero"><Link to="/criar"><Plus /> Novo anúncio</Link></Button>} />
      <AdsList />
    </div>
  ),
});
