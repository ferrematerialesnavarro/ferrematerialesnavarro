-- NAVARRO 360 | Ventas pendientes compartidas | Esquema inicial
-- Ejecutar en proyecto Supabase privado. No ejecutar en SIFO.
-- PREREQUISITO: crear cuenta Auth para administrador y anotar su UUID.
-- No almacenar llaves secretas en GitHub ni en el navegador.
create extension if not exists pgcrypto;
create table if not exists public.navarro_stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  created_at timestamptz not null default now()
);
create table if not exists public.navarro_staff (
  store_id uuid not null references public.navarro_stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','seller')),
  active boolean not null default true,
  primary key (store_id,user_id)
);
create table if not exists public.navarro_drafts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.navarro_stores(id),
  label text not null default '',
  items jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','archived')),
  version integer not null default 1 check (version >= 1),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_items_array check (jsonb_typeof(items)='array'),
  constraint max_items_payload check (octet_length(items::text)<=200000)
);
create index if not exists idx_navarro_drafts_store_updated on public.navarro_drafts(store_id,updated_at desc);
alter table public.navarro_stores enable row level security;
alter table public.navarro_staff enable row level security;
alter table public.navarro_drafts enable row level security;
-- Los usuarios sólo pueden ver tiendas y empleados de su tienda.
create policy "store_select_members" on public.navarro_stores for select to authenticated
  using (exists(select 1 from public.navarro_staff s where s.store_id=id and s.user_id=(select auth.uid()) and s.active));
create policy "staff_select_self" on public.navarro_staff for select to authenticated
  using (user_id=(select auth.uid()));
-- NO se exponen INSERT/UPDATE/DELETE de tiendas o personal al navegador:
-- el administrador provisiona usuarios mediante acciones seguras del servidor.
create policy "drafts_select_members" on public.navarro_drafts for select to authenticated
  using (exists(select 1 from public.navarro_staff s where s.store_id=navarro_drafts.store_id and s.user_id=(select auth.uid()) and s.active));
create policy "drafts_insert_members" on public.navarro_drafts for insert to authenticated
  with check (created_by=(select auth.uid()) and updated_by=(select auth.uid()) and status='pending' and version=1 and exists(select 1 from public.navarro_staff s where s.store_id=navarro_drafts.store_id and s.user_id=(select auth.uid()) and s.active));
create policy "drafts_update_members" on public.navarro_drafts for update to authenticated
  using (status='pending' and exists(select 1 from public.navarro_staff s where s.store_id=navarro_drafts.store_id and s.user_id=(select auth.uid()) and s.active))
  with check (exists(select 1 from public.navarro_staff s where s.store_id=navarro_drafts.store_id and s.user_id=(select auth.uid()) and s.active));
-- No permitir borrado directo: archivar un borrador de forma reversible.
-- IMPORTANTE: Para producción, usar RPC con control de versión y validación
-- de items, evitando escritura de columnas sensibles desde el navegador.
revoke all on public.navarro_stores from anon,authenticated;
revoke all on public.navarro_staff from anon,authenticated;
revoke all on public.navarro_drafts from anon,authenticated;
grant select on public.navarro_stores to authenticated;
grant select on public.navarro_staff to authenticated;
grant select,insert on public.navarro_drafts to authenticated;
-- No conceder UPDATE hasta instalar la RPC transaccional de versiones.
-- Ejecutar manualmente, desde SQL editor autenticado como propietario:
-- insert into public.navarro_stores(name) values ('Ferremateriales Navarro') returning id;
-- insert into public.navarro_staff(store_id,user_id,role) values ('<STORE_UUID>','<AUTH_ADMIN_UUID>','admin');
