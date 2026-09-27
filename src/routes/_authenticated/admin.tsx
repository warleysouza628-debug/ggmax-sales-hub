import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/data";
import { PageHeader } from "@/components/AdActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração — GGMax AdMaker" }] }),
  component: Admin,
});

function Admin() {
  const { data: p, isLoading } = useProfile();
  if (isLoading) return null;
  if (!p?.isAdmin) return <Navigate to="/dashboard" />;
  return (
    <div className="animate-fade-up">
      <PageHeader title="Administração" subtitle="Gerencie usuários, categorias, planos e a IA." />
      <Overview />
      <Tabs defaultValue="users" className="mt-8">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="cats">Categorias</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="ai">IA e créditos</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><Users /></TabsContent>
        <TabsContent value="cats"><Cats /></TabsContent>
        <TabsContent value="plans"><PlansAdmin /></TabsContent>
        <TabsContent value="ai"><AiSettings /></TabsContent>
      </Tabs>
    </div>
  );
}

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const c = async (t: "profiles" | "ads" | "covers") => (await supabase.from(t).select("id", { count: "exact", head: true })).count ?? 0;
      const [users, ads, covers, tx, pro] = await Promise.all([
        c("profiles"), c("ads"), c("covers"),
        supabase.from("credit_transactions").select("amount").lt("amount", 0),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("plan_id", "pro"),
      ]);
      return { users, ads, covers, used: (tx.data ?? []).reduce((s, t) => s - t.amount, 0), pro: pro.count ?? 0 };
    },
  });
  const items = [["Usuários", data?.users], ["Assinantes Pro", data?.pro], ["Anúncios criados", data?.ads], ["Capas geradas", data?.covers], ["Créditos utilizados", data?.used], ["Receita", "R$ 0 · pagamentos não ativados"]];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {items.map(([l, v]) => <div key={l as string} className="glass rounded-2xl p-5"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-3 text-2xl font-semibold tabular-nums">{v ?? "…"}</p></div>)}
    </div>
  );
}

function Users() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-users"], queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [] });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["profile"] }); };
  return (
    <div className="glass mt-4 overflow-x-auto rounded-2xl">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground"><tr className="border-b border-border">{["Usuário", "Plano", "Créditos", "Status", "Ações"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {data?.map((u: any) => (
            <tr key={u.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3"><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></td>
              <td className="px-4 py-3">
                <Select value={u.plan_id} onValueChange={async (v) => { await supabase.from("profiles").update({ plan_id: v }).eq("id", u.id); toast.success("Plano alterado"); refresh(); }}>
                  <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="free">Free</SelectItem><SelectItem value="pro">Pro</SelectItem></SelectContent>
                </Select>
              </td>
              <td className="px-4 py-3 tabular-nums">{u.credits}</td>
              <td className="px-4 py-3">{u.suspended ? <span className="text-destructive">Suspenso</span> : <span className="text-success">Ativo</span>}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={async () => {
                    const n = parseInt(prompt("Quantos créditos adicionar?", "50") ?? "");
                    if (!n) return;
                    const { error } = await supabase.rpc("admin_add_credits", { _user: u.id, _amount: n });
                    if (error) toast.error(error.message); else { toast.success("Créditos adicionados"); refresh(); }
                  }}>+ Créditos</Button>
                  <Button size="sm" variant="outline" onClick={async () => { await supabase.from("profiles").update({ suspended: !u.suspended }).eq("id", u.id); refresh(); }}>{u.suspended ? "Reativar" : "Suspender"}</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cats() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data } = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*").order("sort")).data ?? [] });
  const refresh = () => qc.invalidateQueries({ queryKey: ["categories"] });
  return (
    <div className="glass mt-4 max-w-xl space-y-3 rounded-2xl p-6">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova categoria" />
        <Button variant="hero" onClick={async () => { if (!name) return; const { error } = await supabase.from("categories").insert({ name, sort: (data?.length ?? 0) + 1 }); if (error) return toast.error(error.message); setName(""); refresh(); }}><Plus /> Criar</Button>
      </div>
      {data?.map((c: any) => (
        <div key={c.id} className="flex items-center gap-2">
          <Input defaultValue={c.name} onBlur={async (e) => { if (e.target.value !== c.name) { await supabase.from("categories").update({ name: e.target.value }).eq("id", c.id); toast.success("Categoria atualizada"); refresh(); } }} />
          <Button size="icon" variant="ghost" onClick={async () => { await supabase.from("categories").delete().eq("id", c.id); refresh(); }}><Trash2 /></Button>
        </div>
      ))}
    </div>
  );
}

function PlansAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["plans"], queryFn: async () => (await supabase.from("plans").select("*").order("sort")).data ?? [] });
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {data?.map((pl: any) => <PlanEditor key={pl.id} pl={pl} onSaved={() => qc.invalidateQueries({ queryKey: ["plans"] })} />)}
    </div>
  );
}

function PlanEditor({ pl, onSaved }: { pl: any; onSaved: () => void }) {
  const [f, setF] = useState({ name: pl.name, price: (pl.price_cents / 100).toString(), credits: pl.monthly_credits.toString(), features: pl.features.join("\n") });
  return (
    <div className="glass space-y-3 rounded-2xl p-6">
      <div className="space-y-1.5"><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Preço (R$)</Label><Input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Créditos/mês</Label><Input value={f.credits} onChange={(e) => setF({ ...f, credits: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><Label>Recursos (um por linha)</Label><Textarea rows={5} value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} /></div>
      <Button variant="hero" onClick={async () => {
        const { error } = await supabase.from("plans").update({ name: f.name, price_cents: Math.round(Number(f.price.replace(",", ".")) * 100), monthly_credits: parseInt(f.credits) || 0, features: f.features.split("\n").filter(Boolean) }).eq("id", pl.id);
        if (error) toast.error(error.message); else { toast.success("Plano salvo"); onSaved(); }
      }}>Salvar</Button>
    </div>
  );
}

function AiSettings() {
  const [s, setS] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    supabase.from("admin_settings").select("*").then(({ data }) => {
      const m: Record<string, any> = {}; data?.forEach((r) => (m[r.key] = r.value)); setS(m);
    });
  }, []);
  if (!s) return null;
  const costs = s.credit_costs ?? {};
  async function save() {
    const rows = Object.entries(s!).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from("admin_settings").upsert(rows);
    if (error) toast.error(error.message); else toast.success("Configurações salvas");
  }
  return (
    <div className="glass mt-4 max-w-3xl space-y-5 rounded-2xl p-6">
      <div className="grid grid-cols-3 gap-3">
        {(["title", "description", "cover"] as const).map((k) => (
          <div key={k} className="space-y-1.5">
            <Label>Custo: {k === "title" ? "título" : k === "description" ? "descrição" : "capa"}</Label>
            <Input type="number" value={costs[k] ?? 0} onChange={(e) => setS({ ...s, credit_costs: { ...costs, [k]: parseInt(e.target.value) || 0 } })} />
          </div>
        ))}
      </div>
      {([["prompt_title", "Prompt do título"], ["prompt_description", "Prompt da descrição"], ["prompt_cover", "Configurações da capa"]] as const).map(([k, l]) => (
        <div key={k} className="space-y-1.5"><Label>{l}</Label><Textarea rows={4} value={s[k] ?? ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>
      ))}
      <Button variant="hero" onClick={save}>Salvar configurações</Button>
    </div>
  );
}
