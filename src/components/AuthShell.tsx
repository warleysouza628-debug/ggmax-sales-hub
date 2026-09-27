import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-hero" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] grid-bg" />
      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="glass rounded-2xl p-7">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function GoogleButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/login" });
        if (r.error) toast.error("Não foi possível entrar com Google");
        else if (!r.redirected) window.location.href = "/dashboard";
      }}
      className="flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-surface text-sm font-medium transition-colors hover:bg-surface-2"
    >
      <svg viewBox="0 0 24 24" className="size-4"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/></svg>
      Continuar com Google
    </button>
  );
}

export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
      <span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" />
    </div>
  );
}
