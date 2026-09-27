import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AuthShell, Divider, GoogleButton } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta — GGMax AdMaker" },
      { name: "description", content: "Crie sua conta grátis e comece a gerar anúncios com IA." },
      { property: "og:title", content: "Criar conta — GGMax AdMaker" },
      { property: "og:description", content: "Crie sua conta grátis e comece a gerar anúncios com IA." },
    ],
  }),
  component: Signup,
});

function Signup() {
  const nav = useNavigate();
  const { session } = useAuth();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (session) nav({ to: "/dashboard" });
  }, [session, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.password.length < 6) return toast.error("A senha precisa ter ao menos 6 caracteres");
    if (f.password !== f.confirm) return toast.error("As senhas não coincidem");
    if (!terms) return toast.error("Aceite os termos de uso para continuar");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email,
      password: f.password,
      options: { data: { name: f.name }, emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!data.session) setSent(true);
  }

  if (sent)
    return (
      <AuthShell title="Confirme seu e-mail" subtitle={`Enviamos um link de confirmação para ${f.email}.`}>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><MailCheck /></div>
          <p className="text-sm text-muted-foreground">Clique no link do e-mail para ativar sua conta e acessar o dashboard.</p>
          <Link to="/login" className="text-sm hover:underline">Voltar para o login</Link>
        </div>
      </AuthShell>
    );

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <AuthShell title="Crie sua conta" subtitle="Comece grátis com 42 créditos.">
      <GoogleButton />
      <Divider />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label>Nome</Label><Input required value={f.name} onChange={set("name")} placeholder="Seu nome" /></div>
        <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" required value={f.email} onChange={set("email")} placeholder="voce@email.com" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Senha</Label><Input type="password" required value={f.password} onChange={set("password")} /></div>
          <div className="space-y-1.5"><Label>Confirmar</Label><Input type="password" required value={f.confirm} onChange={set("confirm")} /></div>
        </div>
        <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
          <Checkbox checked={terms} onCheckedChange={(v) => setTerms(!!v)} className="mt-0.5" />
          Li e aceito os termos de uso e a política de privacidade.
        </label>
        <Button type="submit" variant="hero" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Criar conta
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta? <Link to="/login" className="text-foreground hover:underline">Entrar</Link>
      </p>
    </AuthShell>
  );
}
