import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AuthShell, Divider, GoogleButton } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — GGMax AdMaker" },
      { name: "description", content: "Acesse sua conta do GGMax AdMaker." },
      { property: "og:title", content: "Entrar — GGMax AdMaker" },
      { property: "og:description", content: "Acesse sua conta do GGMax AdMaker." },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) nav({ to: "/dashboard" });
  }, [session, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
  }

  async function forgot() {
    if (!email) return toast.error("Digite seu e-mail primeiro");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` });
    if (error) toast.error(error.message);
    else toast.success("Enviamos um link para redefinir sua senha");
  }

  return (
    <AuthShell title="Bem-vindo de volta" subtitle="Entre para continuar criando seus anúncios.">
      <GoogleButton />
      <Divider />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <button type="button" onClick={forgot} className="text-xs text-muted-foreground hover:text-foreground">Esqueci minha senha</button>
          </div>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" variant="hero" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Entrar
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem conta? <Link to="/cadastro" className="text-foreground hover:underline">Criar conta</Link>
      </p>
    </AuthShell>
  );
}
