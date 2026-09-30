import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Ad = {
  id: string;
  user_id: string;
  category: string | null;
  product_name: string;
  price: number | null;
  stock: number | null;
  delivery: string | null;
  details: string | null;
  title: string | null;
  description: string | null;
  description_style: string | null;
  cover_url: string | null;
  status: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*, plans(name)").eq("id", user!.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      return { ...profile!, isAdmin: !!roles?.some((r) => r.role === "admin") };
    },
  });
}

export function useAds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ad[];
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort");
      return data ?? [];
    },
  });
}

export const DELIVERY = ["Automática", "Manual", "Imediata", "Até 24 horas"];
export const DESC_STYLES = ["Profissional", "Direto", "Completo", "Persuasivo"];
export const COVER_STYLES = [
  "Gamer profissional",
  "Premium",
  "Oferta / Promoção",
  "Dark",
  "Vermelho intenso",
  "Azul neon",
  "Roxo neon",
  "Verde",
  "Dourado",
  "Anime",
  "Roblox",
  "Futurista",
  "Competitivo",
  "Marketplace",
  "Minimalista",
  "Cyberpunk",
  "Cartoon",
  "E-sports",
];

export const brl = (v: number | string | null | undefined) =>
  v == null || v === "" ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function fullAdText(ad: Pick<Ad, "title" | "description" | "price" | "delivery">) {
  return [ad.title, "", ad.description, "", ad.price ? `Preço: ${brl(ad.price)}` : "", ad.delivery ? `Entrega: ${ad.delivery}` : ""]
    .filter((l) => l !== undefined)
    .join("\n")
    .trim();
}
