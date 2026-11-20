-- NAVARRO 360 — Multi-caja segura · esquema inicial (NO activado)
-- Ejecutar UNA VEZ en un proyecto Supabase creado por el propietario,
-- mediante el SQL Editor con permisos de administrador.
-- Requiere Supabase Auth; NO habilita ninguna escritura desde GitHub Pages.
-- Aislamiento RLS: vendedor lee/escribe únicamente su propia caja asignada;
-- administrador ACTIVO puede leer todos los registros, pero ningún cliente
-- puede otorgar roles, editar tickets ni eliminar registros.
--
-- IMPORTANTÍSIMO: los registros de tickets representan aceptación por la
-- cola de Windows, NO comprueban pago bancario, impresión física ni SIFO.
begin;

create schema if not exists nav360_private;
revoke all on schema nav360_private from public;
revoke all on schema nav360_private from anon;
grant usage on schema nav360_private to authenticated;

-- ADMINISTRACIÓN: solo un operador del proyecto puede crear/actualizar
-- estas tres tablas desde el entorno seguro del servidor / SQL Editor.
create table if not exists public.nv360_staff (
  user_id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (char_length(display_name) between 1 and 100),
  role text not null check (role in ('admin','seller')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.nv360_registers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,30}$'),
  name text not null check (char_length(name) between 1 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Un vendedor tiene una caja y una caja tiene un vendedor. Jamás se
-- comparte una cuenta Auth entre vendedores; si cambia la asignación
-- histórica, los tickets conservan seller_id y register_id.
create table if not exists public.nv360_assignments (
  seller_id uuid primary key references public.nv360_staff(user_id) on delete restrict,
  register_id uuid not null unique references public.nv360_registers(id) on delete restrict,
  assigned_at timestamptz not null default now()
);

-- Función de autorización con búsqueda restringida. El dueño de la función
-- debe ser el operador privilegiado que instaló la migración; SECURITY
-- DEFINER se necesita para evitar recursión de RLS sobre nv360_staff.
create or replace function nav360_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.nv360_staff s
    where s.user_id = (select auth.uid())
      and s.role = 'admin'
      and s.active = true
  );
$$;
revoke all on function nav360_private.is_admin() from public;
revoke all on function nav360_private.is_admin() from anon;
grant execute on function nav360_private.is_admin() to authenticated;

-- Registro mínimo de tickets en cola. NO se envían domicilios, teléfonos,
-- nombres de clientes, imágenes ni tokens de impresora a esta tabla.
create table if not exists public.nv360_sales (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.nv360_staff(user_id) on delete restrict,
  register_id uuid not null references public.nv360_registers(id) on delete restrict,
  source_job_id text not null check (source_job_id ~ '^[A-Za-z0-9-]{8,80}$'),
  ticket_created_at timestamptz not null,
  received_at timestamptz not null default now(),
  subtotal_cents bigint not null check (subtotal_cents between 1 and 10000000000),
  freight_cents bigint not null default 0 check (freight_cents in (0,5000)),
  total_cents bigint generated always as (subtotal_cents + freight_cents) stored,
  row_count smallint not null check (row_count between 1 and 100),
  status text not null check (status in ('pagado','cobrar','none')),
  payment_method text not null check (payment_method in ('cash','card','transfer','credit','unknown')),
  source_state text not null default 'windows_queued'
    check (source_state = 'windows_queued'),
  constraint nv360_sales_payment_consistency check (
    (status = 'pagado' and payment_method in ('cash','card','transfer','unknown'))
    or (status = 'cobrar' and payment_method = 'credit')
    or (status = 'none' and payment_method = 'unknown')
  ),
  constraint nv360_sales_unique_source unique (seller_id,source_job_id)
);

create index if not exists nv360_sales_register_received_idx
  on public.nv360_sales (register_id, received_at desc);
create index if not exists nv360_sales_seller_received_idx
  on public.nv360_sales (seller_id, received_at desc);

-- Libro de movimientos inmutable: aperturas, conteos, entradas, gastos y
-- retiros. Las correcciones se anotan como un nuevo evento; no DELETE.
-- La fecha local se expresa como fecha de negocio del comercio.
create table if not exists public.nv360_cash_events (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.nv360_staff(user_id) on delete restrict,
  register_id uuid not null references public.nv360_registers(id) on delete restrict,
  source_event_id text not null check (char_length(source_event_id) between 8 and 120),
  business_date date not null,
  kind text not null check (
    kind in ('opening','counted','in','expense','withdrawal','other_out')
  ),
  amount_cents bigint not null check (amount_cents between 0 and 10000000000),
  reason text not null default '' check (char_length(reason) <= 100),
  received_at timestamptz not null default now(),
  constraint nv360_cash_events_nonzero_moves check (
    kind in ('opening','counted') or amount_cents > 0
  ),
  constraint nv360_cash_events_unique_source unique (seller_id,source_event_id)
);
create index if not exists nv360_cash_events_register_date_idx
  on public.nv360_cash_events (register_id,business_date,received_at desc);
create index if not exists nv360_cash_events_seller_date_idx
  on public.nv360_cash_events (seller_id,business_date);

-- RLS SIEMPRE ACTIVA. Ninguna tabla permite acceso anónimo.
alter table public.nv360_staff enable row level security;
alter table public.nv360_registers enable row level security;
alter table public.nv360_assignments enable row level security;
alter table public.nv360_sales enable row level security;
alter table public.nv360_cash_events enable row level security;

-- Permisos mínimos. Los clientes no pueden cambiar vendedores, roles,
-- asignaciones o cajas. No hay GRANT UPDATE/DELETE de ventas o eventos.
revoke all on table
  public.nv360_staff, public.nv360_registers,
  public.nv360_assignments, public.nv360_sales,
  public.nv360_cash_events from public, anon, authenticated;

grant select on table
  public.nv360_staff, public.nv360_registers,
  public.nv360_assignments, public.nv360_sales,
  public.nv360_cash_events to authenticated;

grant insert (
  seller_id,register_id,source_job_id,ticket_created_at,
  subtotal_cents,freight_cents,row_count,status,payment_method
) on public.nv360_sales to authenticated;

grant insert (
  seller_id,register_id,source_event_id,business_date,
  kind,amount_cents,reason
) on public.nv360_cash_events to authenticated;

-- Los nombres de las políticas son exclusivos del proyecto.
drop policy if exists nv360_staff_select on public.nv360_staff;
create policy nv360_staff_select on public.nv360_staff
  for select to authenticated
  using (user_id = (select auth.uid()) or (select nav360_private.is_admin()));

drop policy if exists nv360_registers_select on public.nv360_registers;
create policy nv360_registers_select on public.nv360_registers
  for select to authenticated
  using (
    (select nav360_private.is_admin())
    or id in (
      select a.register_id from public.nv360_assignments a
      where a.seller_id = (select auth.uid())
    )
  );

drop policy if exists nv360_assignments_select on public.nv360_assignments;
create policy nv360_assignments_select on public.nv360_assignments
  for select to authenticated
  using (
    seller_id = (select auth.uid())
    or (select nav360_private.is_admin())
  );

drop policy if exists nv360_sales_select on public.nv360_sales;
create policy nv360_sales_select on public.nv360_sales
  for select to authenticated
  using (
    seller_id = (select auth.uid())
    or (select nav360_private.is_admin())
  );

drop policy if exists nv360_sales_insert on public.nv360_sales;
create policy nv360_sales_insert on public.nv360_sales
  for insert to authenticated
  with check (
    seller_id = (select auth.uid())
    and exists (
      select 1
      from public.nv360_assignments a
      join public.nv360_staff s on s.user_id = a.seller_id
      join public.nv360_registers r on r.id = a.register_id
      where a.seller_id = (select auth.uid())
        and a.register_id = nv360_sales.register_id
        and s.active = true
        and r.active = true
    )
  );

drop policy if exists nv360_cash_events_select on public.nv360_cash_events;
create policy nv360_cash_events_select on public.nv360_cash_events
  for select to authenticated
  using (
    seller_id = (select auth.uid())
    or (select nav360_private.is_admin())
  );

drop policy if exists nv360_cash_events_insert on public.nv360_cash_events;
create policy nv360_cash_events_insert on public.nv360_cash_events
  for insert to authenticated
  with check (
    seller_id = (select auth.uid())
    and exists (
      select 1
      from public.nv360_assignments a
      join public.nv360_staff s on s.user_id = a.seller_id
      join public.nv360_registers r on r.id = a.register_id
      where a.seller_id = (select auth.uid())
        and a.register_id = nv360_cash_events.register_id
        and s.active = true
        and r.active = true
    )
  );

commit;

-- Configuración de propietario y empleados: ver README_SEGURIDAD.md.
-- NO EJECUTAR con IDs ficticios ni secretos escritos en el repositorio.
