-- =============================================================================
-- PLATFORM MIGRATION 0003
-- audit_logs
--
-- Append-only record of admin-panel actions ("Bilal → Petra → Telefon
-- bilgisini değiştirdi"). No updated_at — log rows are never edited, only
-- ever inserted. Writing to this table happens exclusively from trusted
-- server-side code using the service-role client (see migration 0004 —
-- there is deliberately no INSERT policy for anon/authenticated roles),
-- so a compromised browser session can't forge or erase log entries.
-- =============================================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only audit trail of admin-panel actions. Written only by trusted server-side code via the service-role client — no client-facing insert/update/delete policy exists for this table.';

create index audit_logs_customer_id_idx on public.audit_logs (customer_id);
create index audit_logs_user_id_idx on public.audit_logs (user_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
