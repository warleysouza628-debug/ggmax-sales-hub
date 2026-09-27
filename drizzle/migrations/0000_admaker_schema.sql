create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.plans (
  id text primary key,
  name text not null,
  price_cents int not null default 0,
  monthly_credits int not null default 30,
  features text[] not null default '{}',
  highlighted boolean not null default false,
  sort int not null default 0
);
grant select on public.plans to anon, authenticated;
grant insert, update, delete on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy "plans public" on public.plans for select using (true);
create policy "plans admin ins" on public.plans for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "plans admin upd" on public.plans for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "plans admin del" on public.plans for delete to authenticated using (public.has_role(auth.uid(),'admin'));

insert into public.plans (id,name,price_cents,monthly_credits,features,highlighted,sort) values
('free','Free',0,30,array['30 créditos por mês','Geração de títulos e descrições','Até 5 capas por mês','Histórico dos últimos 20 anúncios'],false,1),
('pro','Pro',2990,500,array['500 créditos por mês','Todas as gerações com IA','Todos os estilos de capa','Histórico completo','Prioridade na geração','Suporte prioritário'],true,2);

create table public.profiles (
  id uuid primary key,
  name text,
  email text,
  avatar_url text,
  plan_id text not null default 'free' references public.plans(id),
  credits int not null default 42,
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin update profiles" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.update_my_profile(_name text, _avatar text)
returns void language sql security definer set search_path = public
as $$ update public.profiles set name=_name, avatar_url=_avatar where id=auth.uid() $$;
grant execute on function public.update_my_profile(text,text) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email, new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if (select count(*) from public.profiles) = 1 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort int not null default 0
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "cat read" on public.categories for select using (true);
create policy "cat admin ins" on public.categories for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "cat admin upd" on public.categories for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "cat admin del" on public.categories for delete to authenticated using (public.has_role(auth.uid(),'admin'));
insert into public.categories (name, sort) values
('Blox Fruits',1),('Roblox',2),('Roube um Brainrot',3),('Pet Simulator 99',4),('Car Parking Multiplayer',5),('Contas',6),('Itens',7),('Moedas',8),('Serviços',9),('Outros',10);

create table public.ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text,
  product_name text not null default '',
  price numeric(10,2),
  stock int,
  delivery text,
  details text,
  title text,
  description text,
  description_style text default 'Profissional',
  cover_url text,
  status text not null default 'rascunho',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.ads to authenticated;
grant all on public.ads to service_role;
alter table public.ads enable row level security;
create policy "own ads" on public.ads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin read ads" on public.ads for select to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.covers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ad_id uuid references public.ads(id) on delete set null,
  prompt text,
  style text,
  image_url text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.covers to authenticated;
grant all on public.covers to service_role;
alter table public.covers enable row level security;
create policy "own covers" on public.covers for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin read covers" on public.covers for select to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount int not null,
  reason text not null,
  created_at timestamptz not null default now()
);
grant select on public.credit_transactions to authenticated;
grant all on public.credit_transactions to service_role;
alter table public.credit_transactions enable row level security;
create policy "own tx" on public.credit_transactions for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.admin_settings (
  key text primary key,
  value jsonb not null
);
grant select, insert, update on public.admin_settings to authenticated;
grant all on public.admin_settings to service_role;
alter table public.admin_settings enable row level security;
create policy "settings read" on public.admin_settings for select to authenticated using (true);
create policy "settings admin ins" on public.admin_settings for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "settings admin upd" on public.admin_settings for update to authenticated using (public.has_role(auth.uid(),'admin'));
insert into public.admin_settings (key, value) values
('credit_costs', '{"title":1,"description":2,"cover":5}'),
('prompt_title', '"Você é um especialista em anúncios da GGMax, marketplace brasileiro de itens de jogos. Gere 3 títulos profissionais, claros e atrativos em português do Brasil. Cada título deve ter no máximo 80 caracteres e NÃO pode conter emojis."'),
('prompt_description', '"Você é um redator especialista em anúncios da GGMax. Escreva uma descrição profissional, organizada e persuasiva sem parecer spam, em português do Brasil. Use seções com estes marcadores quando fizer sentido: 🔥 Destaque do produto, 📦 O que você recebe, ⚡ Entrega, ✅ Informações importantes, 🛡️ Segurança, 📩 Suporte. Adapte ao produto. Não invente informações que não foram fornecidas."'),
('prompt_cover', '"Capa horizontal 16:9 para anúncio de marketplace de jogos. Sem bordas pretas, sem marca d''água, sem informações pessoais, sem e-mail, sem senhas, sem dados de conta."');

create or replace function public.spend_credits(_amount int, _reason text)
returns int language plpgsql security definer set search_path = public
as $$
declare remaining int;
begin
  update public.profiles set credits = credits - _amount
   where id = auth.uid() and credits >= _amount and not suspended
   returning credits into remaining;
  if remaining is null then raise exception 'Créditos insuficientes'; end if;
  insert into public.credit_transactions (user_id, amount, reason) values (auth.uid(), -_amount, _reason);
  return remaining;
end $$;
grant execute on function public.spend_credits(int,text) to authenticated;

create or replace function public.admin_add_credits(_user uuid, _amount int)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  update public.profiles set credits = credits + _amount where id = _user;
  insert into public.credit_transactions (user_id, amount, reason) values (_user, _amount, 'Admin');
end $$;
grant execute on function public.admin_add_credits(uuid,int) to authenticated;

create policy "covers own read" on storage.objects for select to authenticated using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers own upload" on storage.objects for insert to authenticated with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
