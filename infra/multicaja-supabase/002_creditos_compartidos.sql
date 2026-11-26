-- NAVARRO 360 V30.1: libro compartido de clientes y créditos.
-- PREPARADO, NO EJECUTADO. Requiere 001_esquema_seguro.sql y Supabase Auth.
begin;
create table if not exists public.nv360_credit_customers (
 id uuid primary key,
 name text not null check (char_length(btrim(name)) between 2 and 100),
 phone text not null default '' check (char_length(phone)<=30 and phone ~ '^[0-9+(). -]*$'),
 created_by uuid not null references public.nv360_staff(user_id),
 created_box text not null check (created_box in ('COMPUTADORA','PABLO','DIANA','GOLI')),
 created_at timestamptz not null default now()
);
create table if not exists public.nv360_credit_events (
 id text primary key check (id ~ '^[A-Za-z0-9-]{8,80}$'),
 customer_id uuid not null references public.nv360_credit_customers(id),
 actor_id uuid not null references public.nv360_staff(user_id),
 register_id uuid not null references public.nv360_registers(id),
 box_code text not null check (box_code in ('COMPUTADORA','PABLO','DIANA','GOLI')),
 kind text not null check (kind in ('sale','payment')),
 cents bigint not null check (cents between 1 and 10000000000),
 method text not null check ((kind='sale' and method='credit') or (kind='payment' and method in ('cash','card','transfer'))),
 source_ticket text check (source_ticket is null or source_ticket ~ '^[A-Za-z0-9-]{8,80}$'),
 occurred_at timestamptz not null,
 received_at timestamptz not null default now(),
 legacy boolean not null default false,
 check ((kind='sale' and source_ticket is not null) or (kind='payment' and source_ticket is null))
);
create unique index if not exists nv360_credit_source_ticket_once on public.nv360_credit_events(source_ticket) where kind='sale';
create index if not exists nv360_credit_customer_events on public.nv360_credit_events(customer_id,received_at);
create index if not exists nv360_credit_box_events on public.nv360_credit_events(box_code,occurred_at);
alter table public.nv360_credit_customers enable row level security;
alter table public.nv360_credit_events enable row level security;
revoke all on public.nv360_credit_customers,public.nv360_credit_events from public,anon,authenticated;
-- Compartir SOLAMENTE expedientes y sus movimientos entre cajas autorizadas.
create or replace function nav360_private.credit_can_read()
returns boolean language sql stable security definer set search_path=''
as $$
 select exists (
  select 1 from public.nv360_staff s
  where s.user_id=(select auth.uid()) and s.active and
  (s.role='admin' or exists (
    select 1 from public.nv360_assignments a join public.nv360_registers r on r.id=a.register_id
    where a.seller_id=s.user_id and r.active and r.code in ('COMPUTADORA','PABLO','DIANA','GOLI')
  ))
 );
$$;
revoke all on function nav360_private.credit_can_read() from public,anon;
grant execute on function nav360_private.credit_can_read() to authenticated;
grant select on public.nv360_credit_customers,public.nv360_credit_events to authenticated;
drop policy if exists nv360_credit_customers_read on public.nv360_credit_customers;
create policy nv360_credit_customers_read on public.nv360_credit_customers for select to authenticated using ((select nav360_private.credit_can_read()));
drop policy if exists nv360_credit_events_read on public.nv360_credit_events;
create policy nv360_credit_events_read on public.nv360_credit_events for select to authenticated using ((select nav360_private.credit_can_read()));
-- Ninguna escritura directa desde REST. RPC obtiene actor/caja del servidor.
create or replace function public.nv360_credit_customer_create(p_id uuid,p_name text,p_phone text default '')
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid(); v_box text; v_old public.nv360_credit_customers%rowtype; v_name text:=btrim(p_name); v_phone text:=btrim(coalesce(p_phone,''));
begin
 select r.code into v_box from public.nv360_staff s join public.nv360_assignments a on a.seller_id=s.user_id
 join public.nv360_registers r on r.id=a.register_id where s.user_id=v_actor and s.active and r.active and r.code in ('COMPUTADORA','PABLO','DIANA','GOLI');
 if v_box is null then raise exception 'Caja sin autorización' using errcode='42501'; end if;
 if p_id is null or v_name is null or char_length(v_name) not between 2 and 100 or char_length(v_phone)>30 or v_phone !~ '^[0-9+(). -]*$' then raise exception 'Datos de cliente inválidos'; end if;
 -- Serializar altas; un mismo UUID no puede ser usado para otro expediente.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('nv360-credit-customer-create',0));
 select * into v_old from public.nv360_credit_customers where id=p_id;
 if found then
  if v_old.name=v_name and v_old.phone=v_phone and v_old.created_box=v_box then return p_id; end if;
  raise exception 'Conflicto de identidad del cliente';
 end if;
 -- No unir homónimos ni cuentas anteriores sin autorización expresa.
 insert into public.nv360_credit_customers(id,name,phone,created_by,created_box) values(p_id,v_name,v_phone,v_actor,v_box);
 return p_id;
end;
$$;
revoke all on function public.nv360_credit_customer_create(uuid,text,text) from public,anon;
grant execute on function public.nv360_credit_customer_create(uuid,text,text) to authenticated;
create or replace function public.nv360_credit_append(
 p_id text,p_customer uuid,p_kind text,p_cents bigint,p_method text,p_ticket text default null,p_legacy_at timestamptz default null
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid(); v_box text; v_register uuid; v_balance bigint; v_existing public.nv360_credit_events%rowtype; v_at timestamptz:=coalesce(p_legacy_at,now());
begin
 select r.id,r.code into v_register,v_box from public.nv360_staff s join public.nv360_assignments a on a.seller_id=s.user_id
 join public.nv360_registers r on r.id=a.register_id where s.user_id=v_actor and s.active and r.active and r.code in ('COMPUTADORA','PABLO','DIANA','GOLI');
 if v_box is null then raise exception 'Caja sin autorización' using errcode='42501'; end if;
 if p_id is null or p_id !~ '^[A-Za-z0-9-]{8,80}$' or p_customer is null or p_cents is null or p_cents not between 1 and 10000000000 or p_kind is null or p_method is null
 or not ((p_kind='sale' and p_method='credit' and p_ticket is not null and p_ticket ~ '^[A-Za-z0-9-]{8,80}$')
 or (p_kind='payment' and p_method in ('cash','card','transfer') and p_ticket is null))
 or v_at<timestamp with time zone '2020-01-01 00:00:00+00' or v_at>now()+interval '5 minutes' then raise exception 'Movimiento inválido'; end if;
 -- Bloquear el expediente hasta confirmar el saldo. Dos cajas no pueden gastar el mismo saldo.
 perform 1 from public.nv360_credit_customers where id=p_customer for update;
 if not found then raise exception 'Cliente inexistente'; end if;
 select * into v_existing from public.nv360_credit_events where id=p_id;
 if found then
  if v_existing.customer_id<>p_customer or v_existing.box_code<>v_box or v_existing.kind<>p_kind or v_existing.cents<>p_cents or v_existing.method<>p_method or v_existing.source_ticket is distinct from p_ticket then raise exception 'Folio en conflicto'; end if;
  select coalesce(sum(case when kind='sale' then cents else -cents end),0) into v_balance from public.nv360_credit_events where customer_id=p_customer;
  return jsonb_build_object('ok',true,'duplicate',true,'balance',v_balance,'box',v_box);
 end if;
 select coalesce(sum(case when kind='sale' then cents else -cents end),0) into v_balance from public.nv360_credit_events where customer_id=p_customer;
 if p_kind='payment' and p_cents>v_balance then raise exception 'El abono supera el saldo actual'; end if;
 insert into public.nv360_credit_events(id,customer_id,actor_id,register_id,box_code,kind,cents,method,source_ticket,occurred_at,legacy)
 values(p_id,p_customer,v_actor,v_register,v_box,p_kind,p_cents,p_method,p_ticket,v_at,p_legacy_at is not null);
 return jsonb_build_object('ok',true,'duplicate',false,'balance',v_balance+case when p_kind='sale' then p_cents else -p_cents end,'box',v_box);
end;
$$;
revoke all on function public.nv360_credit_append(text,uuid,text,bigint,text,text,timestamptz) from public,anon;
grant execute on function public.nv360_credit_append(text,uuid,text,bigint,text,text,timestamptz) to authenticated;
commit;
