import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Copy, Eye, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Ad } from "@/lib/data";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function useAdMutations() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["ads"] });
  return {
    async duplicate(ad: Ad) {
      const { id, created_at, updated_at, ...rest } = ad;
      const { error } = await supabase.from("ads").insert({ ...rest, product_name: rest.product_name + " (cópia)", status: "rascunho", is_favorite: false });
      if (error) return toast.error(error.message);
      toast.success("Anúncio duplicado");
      refresh();
    },
    async remove(ad: Ad) {
      if (!confirm("Excluir este anúncio?")) return;
      const { error } = await supabase.from("ads").delete().eq("id", ad.id);
      if (error) return toast.error(error.message);
      toast.success("Anúncio excluído");
      refresh();
    },
    async favorite(ad: Ad) {
      await supabase.from("ads").update({ is_favorite: !ad.is_favorite }).eq("id", ad.id);
      toast.success(ad.is_favorite ? "Removido dos favoritos" : "Adicionado aos favoritos");
      refresh();
    },
  };
}

export function AdMenu({ ad }: { ad: Ad }) {
  const nav = useNavigate();
  const m = useAdMutations();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => nav({ to: "/criar", search: { id: ad.id } })}><Eye className="size-4" /> Visualizar</DropdownMenuItem>
        <DropdownMenuItem onClick={() => nav({ to: "/criar", search: { id: ad.id } })}><Pencil className="size-4" /> Editar</DropdownMenuItem>
        <DropdownMenuItem onClick={() => m.duplicate(ad)}><Copy className="size-4" /> Duplicar</DropdownMenuItem>
        <DropdownMenuItem onClick={() => m.favorite(ad)}><Star className="size-4" /> {ad.is_favorite ? "Desfavoritar" : "Favoritar"}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => m.remove(ad)} className="text-destructive focus:text-destructive"><Trash2 className="size-4" /> Excluir</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const pub = status === "publicado";
  return (
    <span className={pub ? "inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success" : "inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"}>
      <span className={pub ? "size-1.5 rounded-full bg-success" : "size-1.5 rounded-full bg-muted-foreground"} />
      {pub ? "Publicado" : "Rascunho"}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: any; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="glass flex flex-col items-center rounded-2xl px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-xl border border-border bg-surface-2 text-muted-foreground"><Icon className="size-5" /></div>
      <h3 className="mt-4 font-medium">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
