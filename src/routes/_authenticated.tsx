import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3, CreditCard, FolderOpen, Home, Image as ImageIcon, LogOut, Menu, Settings, Shield, Sparkles, Star, Zap, History,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AppLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/criar", label: "Criar anúncio", icon: Sparkles },
  { to: "/capa", label: "Criar capa", icon: ImageIcon },
  { to: "/anuncios", label: "Meus anúncios", icon: FolderOpen },
  { to: "/favoritos", label: "Favoritos", icon: Star },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { to: "/planos", label: "Planos", icon: CreditCard },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);
  useEffect(() => setOpen(false), [path]);

  if (loading || !session)
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarBody />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <SidebarBody />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarBody() {
  const { data: p } = useProfile();
  const planName = (p as any)?.plans?.name ?? "Free";
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5"><Logo /></div>
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            activeProps={{ className: "!bg-sidebar-accent !text-foreground" }}
          >
            <n.icon className="size-4" /> {n.label}
          </Link>
        ))}
        {p?.isAdmin && (
          <Link to="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground" activeProps={{ className: "!bg-sidebar-accent !text-foreground" }}>
            <Shield className="size-4" /> Administração
          </Link>
        )}
      </nav>
      <div className="m-3 rounded-xl border border-sidebar-border bg-surface/60 p-3">
        <div className="flex items-center gap-3">
          <Avatar name={p?.name} url={p?.avatar_url} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{p?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Plano {planName}</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-muted-foreground hover:text-foreground" aria-label="Sair">
            <LogOut className="size-4" />
          </button>
        </div>
        {p?.plan_id !== "pro" && (
          <Button asChild variant="hero" size="sm" className="mt-3 w-full">
            <Link to="/planos"><Zap /> Fazer upgrade</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function Avatar({ name, url, className }: { name?: string | null; url?: string | null; className?: string }) {
  if (url) return <img src={url} alt="" className={cn("size-8 rounded-full object-cover", className)} />;
  return (
    <div className={cn("grid size-8 place-items-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground", className)}>
      {(name ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { data: p } = useProfile();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-8">
      <button onClick={onMenu} className="lg:hidden" aria-label="Menu"><Menu className="size-5" /></button>
      <div className="lg:hidden"><Logo compact /></div>
      <div className="ml-auto flex items-center gap-2">
        <Link to="/planos" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-surface-2">
          <Zap className="size-3.5 text-warning" />
          <span className="font-medium tabular-nums">{p?.credits ?? "…"}</span>
          <span className="text-muted-foreground">créditos</span>
        </Link>
        <Button asChild variant="hero" size="sm" className="hidden sm:inline-flex">
          <Link to="/criar"><Sparkles /> Novo anúncio</Link>
        </Button>
      </div>
    </header>
  );
}
