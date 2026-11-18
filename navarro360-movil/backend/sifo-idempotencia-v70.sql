-- NAVARRO 360 / SIFO: esquema PREPARATORIO de deduplicación V70
-- NO ejecutar en producción sin revisar el bot y los permisos del servidor.
-- En esta tabla no se registra una venta SIFO; sólo el estado verificable de una solicitud.
-- El navegador público NO tiene permiso de lectura o escritura.
create extension if not exists pgcrypto;
create table if not exists public.navarro_pos_requests (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.navarro_stores(id) on delete restrict,
 request_id text not null check(length(request_id) between 12 and 96),
 payload_sha256 text not null check(payload_sha256 ~ '^[0-9a-f]{64}$'),
 status text not null default 'RECEIVED'
   check(status in ('RECEIVED','VALIDATED','SIFO_PENDING','SIFO_CONFIRMED','FAILED','REVIEW_REQUIRED')),
 estimated_cents bigint not null default 0 check(estimated_cents >= 0),
 confirmation_evidence text,
 confirmed_at timestamptz,
 last_error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint navarro_request_unique unique(store_id,request_id),
 constraint confirmed_requires_evidence check(
  status <> 'SIFO_CONFIRMED' or (
   confirmation_evidence is not null and length(confirmation_evidence)>=8 and confirmed_at is not null
  )
 )
);
create index if not exists navarro_pos_req_status on public.navarro_pos_requests(store_id,status,created_at desc);
alter table public.navarro_pos_requests enable row level security;
revoke all on public.navarro_pos_requests from public,anon,authenticated;
-- Sólo el servicio privado autorizado puede reservar y actualizar solicitudes.
-- Para reservar: INSERT ... ON CONFLICT(store_id,request_id) DO NOTHING;
-- Si ya existe el request_id, comparar payload_sha256 y no reejecutar SIFO.
-- Confirmar venta sólo tras respuesta real del POS; el modo SIN FOLIO no requiere folio.
