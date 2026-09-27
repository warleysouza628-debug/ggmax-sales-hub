import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/data";
import { PageHeader } from "@/components/AdActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "../_authenticated";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — GGMax AdMaker" }] }),
  component: Settings,
});

function Settings() {
  const { data: p } = useProfile();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [pw, setPw] = useState("");
  const [notif, setNotif] = useState(true);

  useEffect(() => { if (p) { setName(p.name ?? ""); setAvatar(p.avatar_url ?? ""); } }, [p]);

  async function saveProfile() {
    const { error } = await supabase.rpc("update_my_profile", { _name: name, _avatar: avatar });
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }
  async function changePw() {
    if (pw.length < 6) return toast.error("Mínimo de 6 caracteres");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    setPw(""); toast.success("Senha alterada");
  }

  return (
    <div className="animate-fade-up max-w-2xl space-y-6">
      <PageHeader title="Configurações" subtitle="Gerencie seu perfil, conta e plano." />
      <Section title="Perfil">
        <div className="flex items-center gap-4"><Avatar name={name} url={avatar} className="size-14 text-lg" /><div className="flex-1 space-y-1.5"><Label>URL da foto</Label><Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." /></div></div>
        <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>E-mail</Label><Input value={p?.email ?? ""} disabled /></div>
        <Button variant="hero" onClick={saveProfile}>Salvar perfil</Button>
      </Section>
      <Section title="Conta">
        <div className="flex gap-2"><Input type="password" placeholder="Nova senha" value={pw} onChange={(e) => setPw(e.target.value)} /><Button variant="outline" onClick={changePw}>Alterar senha</Button></div>
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div><p className="text-sm font-medium">Excluir conta</p><p className="text-xs text-muted-foreground">Remove permanentemente seus dados.</p></div>
          <Button variant="destructive" size="sm" onClick={() => toast.info("Para excluir sua conta, entre em contato com o suporte.")}>Excluir</Button>
        </div>
      </Section>
      <Section title="Preferências">
        <Row l="Tema" d="Escuro (padrão)"><span className="text-sm text-muted-foreground">Escuro</span></Row>
        <Row l="Notificações" d="Novidades e dicas por e-mail"><Switch checked={notif} onCheckedChange={setNotif} /></Row>
      </Section>
      <Section title="Plano">
        <Row l={`Plano ${(p as any)?.plans?.name ?? "Free"}`} d={`${p?.credits ?? 0} créditos disponíveis`}>
          <Button asChild variant="hero" size="sm"><Link to="/planos"><Zap /> Upgrade</Link></Button>
        </Row>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="glass space-y-4 rounded-2xl p-6"><h2 className="font-medium">{title}</h2>{children}</section>;
}
function Row({ l, d, children }: { l: string; d: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">{l}</p><p className="text-xs text-muted-foreground">{d}</p></div>{children}</div>;
}
