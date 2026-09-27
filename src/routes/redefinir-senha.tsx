import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — GGMax AdMaker" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
      { property: "og:title", content: "Redefinir senha — GGMax AdMaker" },
      { property: "og:description", content: "Defina uma nova senha para sua conta." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada");
    nav({ to: "/dashboard" });
  }
  return (
    <AuthShell title="Nova senha" subtitle="Escolha uma nova senha para sua conta.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label>Nova senha</Label><Input type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button type="submit" variant="hero" className="w-full">Salvar senha</Button>
      </form>
    </AuthShell>
  );
}
