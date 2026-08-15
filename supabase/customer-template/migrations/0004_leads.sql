-- =============================================================================
-- CUSTOMER TEMPLATE MIGRATION 0004
-- leads
--
-- This phase only creates the table. The existing discovery-request flow
-- (app/api/forms/discovery-request/route.ts) still just console.logs —
-- it is NOT wired to insert into this table yet (per Phase 5 scope: "Bu
-- fazda yalnızca tabloyu oluştur. Mevcut console.log davranışını henüz
-- değiştirme."). RLS below has no anon/authenticated INSERT policy at
-- all, so wiring a public form directly to an anon insert would not work
-- as-is anyway — a future phase would insert via a server route using
-- the service-role client (never anon), same pattern as
-- lib/auth/audit-log.ts.
-- =============================================================================

-- Deliberately a separate, small enum from content_status — a lead isn't
-- editorial content with a draft/published/archived lifecycle, it's a
-- business record with its own (adjustable) pipeline states.
create type public.lead_status as enum ('new', 'contacted', 'closed');

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  message text,
  source text,
  status public.lead_status not null default 'new',
  created_at timestamptz not null default now()
);

comment on table public.leads is
  'Discovery request / contact submissions for this customer. No anon/authenticated read or write policy (see 0005_customer_rls.sql) — leads are business data, service_role only.';

create index leads_status_idx on public.leads (status);
create index leads_created_at_idx on public.leads (created_at desc);
