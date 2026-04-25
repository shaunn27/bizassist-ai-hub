-- Supabase schema v2 (full app model)
-- Safe to re-run: uses IF NOT EXISTS and idempotent policies/triggers.
-- Includes legacy compatibility table `chat_threads` used by current app code.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type public.member_role as enum ('owner', 'admin', 'agent', 'viewer');
  end if;

  if not exists (select 1 from pg_type where typname = 'thread_status') then
    create type public.thread_status as enum ('open', 'resolved', 'snoozed');
  end if;

  if not exists (select 1 from pg_type where typname = 'priority_level') then
    create type public.priority_level as enum ('low', 'normal', 'high', 'critical');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_direction') then
    create type public.message_direction as enum ('inbound', 'outbound', 'internal_note');
  end if;

  if not exists (select 1 from pg_type where typname = 'sender_kind') then
    create type public.sender_kind as enum ('customer', 'agent', 'system', 'ai');
  end if;

  if not exists (select 1 from pg_type where typname = 'content_kind') then
    create type public.content_kind as enum ('text', 'image', 'voice', 'file');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum ('draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'meeting_status') then
    create type public.meeting_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_severity') then
    create type public.notification_severity as enum ('info', 'success', 'warning', 'critical');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Core multi-tenant model

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'Asia/Kuala_Lumpur',
  currency text not null default 'MYR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  full_name text not null,
  email text unique,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  role public.member_role not null default 'agent',
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null,
  name text not null,
  status text not null default 'active',
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  display_name text not null,
  phone_e164 text,
  email text,
  avatar_color text,
  initials text,
  status text not null default 'active',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_customers_org_phone
  on public.customers (organization_id, phone_e164)
  where phone_e164 is not null;

create table if not exists public.customer_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.customer_tag_links (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  tag_id uuid not null references public.customer_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, tag_id)
);

create table if not exists public.conversation_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete set null,
  external_thread_ref text,
  status public.thread_status not null default 'open',
  priority public.priority_level not null default 'normal',
  unread_count integer not null default 0,
  waiting_minutes integer not null default 0,
  last_message_preview text not null default '',
  last_message_at timestamptz,
  assigned_to_user_id uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_threads_org_updated_at
  on public.conversation_threads (organization_id, updated_at desc);

create index if not exists idx_threads_org_status_assignee
  on public.conversation_threads (organization_id, status, assigned_to_user_id);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.conversation_threads(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  direction public.message_direction not null,
  sender_type public.sender_kind not null,
  sender_user_id uuid references public.app_users(id) on delete set null,
  content_text text,
  content_type public.content_kind not null default 'text',
  sent_at timestamptz not null default now(),
  imported_at timestamptz,
  external_message_ref text,
  raw_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_thread_sent_at
  on public.conversation_messages (thread_id, sent_at);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.conversation_messages(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  duration_seconds integer,
  width integer,
  height integer,
  checksum text,
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by_user_id uuid references public.app_users(id) on delete set null,
  source_filename text,
  customer_name_override text,
  agent_names_csv text,
  parsed_count integer not null default 0,
  status text not null default 'queued',
  error_text text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.whatsapp_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references public.whatsapp_import_jobs(id) on delete cascade,
  row_index integer not null,
  parsed_ok boolean not null default true,
  parsed_date timestamptz,
  sender_name text,
  body text,
  error_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  thread_id uuid not null references public.conversation_threads(id) on delete cascade,
  message_id_anchor uuid references public.conversation_messages(id) on delete set null,
  model text not null,
  prompt_version text,
  detected_language text,
  confidence_score numeric(5,2),
  request_type text,
  order_summary_json jsonb not null default '{}'::jsonb,
  flags_json jsonb not null default '[]'::jsonb,
  suggested_reply text,
  checklist_json jsonb not null default '[]'::jsonb,
  behavior_note text,
  created_by_user_id uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_analyses_thread_created_at
  on public.ai_analyses (thread_id, created_at desc);

create table if not exists public.ai_assistant_turns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  thread_id uuid not null references public.conversation_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  model text,
  token_usage_json jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sku text,
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  stock_qty integer,
  is_active boolean not null default true,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  thread_id uuid references public.conversation_threads(id) on delete set null,
  order_no text not null,
  status public.order_status not null default 'draft',
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  delivery_address text,
  deadline_at timestamptz,
  notes text,
  created_by_user_id uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, order_no)
);

create index if not exists idx_orders_org_status_created
  on public.orders (organization_id, status, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  item_name_snapshot text not null,
  qty integer not null check (qty > 0),
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  thread_id uuid references public.conversation_threads(id) on delete set null,
  assigned_to_user_id uuid references public.app_users(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  purpose text,
  status public.meeting_status not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete cascade,
  severity public.notification_severity not null default 'info',
  type text,
  title text not null,
  body text,
  link_thread_id uuid references public.conversation_threads(id) on delete set null,
  link_order_id uuid references public.orders(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.app_users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

-- Legacy compatibility table used by current app code (kept intentionally).

create table if not exists public.chat_threads (
  id bigint generated by default as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  customer_id text not null,
  customer_name text,
  customer_phone text,
  customer_avatar_color text,
  customer_initials text,
  source text default 'supabase',
  flagged text,
  unread integer not null default 0,
  status text not null default 'open',
  waiting_minutes integer not null default 0,
  last_message_preview text not null default '',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id)
);

alter table public.chat_threads add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.chat_threads add column if not exists customer_name text;
alter table public.chat_threads add column if not exists customer_phone text;
alter table public.chat_threads add column if not exists customer_avatar_color text;
alter table public.chat_threads add column if not exists customer_initials text;
alter table public.chat_threads add column if not exists source text default 'supabase';
alter table public.chat_threads add column if not exists flagged text;
alter table public.chat_threads add column if not exists unread integer not null default 0;
alter table public.chat_threads add column if not exists status text not null default 'open';
alter table public.chat_threads add column if not exists waiting_minutes integer not null default 0;
alter table public.chat_threads add column if not exists last_message_preview text not null default '';
alter table public.chat_threads add column if not exists messages jsonb not null default '[]'::jsonb;
alter table public.chat_threads add column if not exists created_at timestamptz not null default now();
alter table public.chat_threads add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_chat_threads_updated_at on public.chat_threads (updated_at desc);

-- updated_at triggers

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at before update on public.organizations
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at before update on public.app_users
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_channels_updated_at on public.channels;
create trigger trg_channels_updated_at before update on public.channels
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at before update on public.customers
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_threads_updated_at on public.conversation_threads;
create trigger trg_threads_updated_at before update on public.conversation_threads
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_meetings_updated_at on public.meetings;
create trigger trg_meetings_updated_at before update on public.meetings
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_chat_threads_updated_at on public.chat_threads;
create trigger trg_chat_threads_updated_at before update on public.chat_threads
for each row execute procedure public.set_updated_at();

-- RLS (demo mode): permissive access for rapid prototyping.
-- Tighten these policies before production rollout.

alter table public.organizations enable row level security;
alter table public.app_users enable row level security;
alter table public.organization_members enable row level security;
alter table public.channels enable row level security;
alter table public.customers enable row level security;
alter table public.customer_tags enable row level security;
alter table public.customer_tag_links enable row level security;
alter table public.conversation_threads enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.whatsapp_import_jobs enable row level security;
alter table public.whatsapp_import_rows enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.ai_assistant_turns enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.meetings enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.chat_threads enable row level security;

drop policy if exists "organizations_demo_all" on public.organizations;
create policy "organizations_demo_all" on public.organizations for all using (true) with check (true);

drop policy if exists "app_users_demo_all" on public.app_users;
create policy "app_users_demo_all" on public.app_users for all using (true) with check (true);

drop policy if exists "organization_members_demo_all" on public.organization_members;
create policy "organization_members_demo_all" on public.organization_members for all using (true) with check (true);

drop policy if exists "channels_demo_all" on public.channels;
create policy "channels_demo_all" on public.channels for all using (true) with check (true);

drop policy if exists "customers_demo_all" on public.customers;
create policy "customers_demo_all" on public.customers for all using (true) with check (true);

drop policy if exists "customer_tags_demo_all" on public.customer_tags;
create policy "customer_tags_demo_all" on public.customer_tags for all using (true) with check (true);

drop policy if exists "customer_tag_links_demo_all" on public.customer_tag_links;
create policy "customer_tag_links_demo_all" on public.customer_tag_links for all using (true) with check (true);

drop policy if exists "conversation_threads_demo_all" on public.conversation_threads;
create policy "conversation_threads_demo_all" on public.conversation_threads for all using (true) with check (true);

drop policy if exists "conversation_messages_demo_all" on public.conversation_messages;
create policy "conversation_messages_demo_all" on public.conversation_messages for all using (true) with check (true);

drop policy if exists "message_attachments_demo_all" on public.message_attachments;
create policy "message_attachments_demo_all" on public.message_attachments for all using (true) with check (true);

drop policy if exists "whatsapp_import_jobs_demo_all" on public.whatsapp_import_jobs;
create policy "whatsapp_import_jobs_demo_all" on public.whatsapp_import_jobs for all using (true) with check (true);

drop policy if exists "whatsapp_import_rows_demo_all" on public.whatsapp_import_rows;
create policy "whatsapp_import_rows_demo_all" on public.whatsapp_import_rows for all using (true) with check (true);

drop policy if exists "ai_analyses_demo_all" on public.ai_analyses;
create policy "ai_analyses_demo_all" on public.ai_analyses for all using (true) with check (true);

drop policy if exists "ai_assistant_turns_demo_all" on public.ai_assistant_turns;
create policy "ai_assistant_turns_demo_all" on public.ai_assistant_turns for all using (true) with check (true);

drop policy if exists "products_demo_all" on public.products;
create policy "products_demo_all" on public.products for all using (true) with check (true);

drop policy if exists "orders_demo_all" on public.orders;
create policy "orders_demo_all" on public.orders for all using (true) with check (true);

drop policy if exists "order_items_demo_all" on public.order_items;
create policy "order_items_demo_all" on public.order_items for all using (true) with check (true);

drop policy if exists "meetings_demo_all" on public.meetings;
create policy "meetings_demo_all" on public.meetings for all using (true) with check (true);

drop policy if exists "notifications_demo_all" on public.notifications;
create policy "notifications_demo_all" on public.notifications for all using (true) with check (true);

drop policy if exists "activity_logs_demo_all" on public.activity_logs;
create policy "activity_logs_demo_all" on public.activity_logs for all using (true) with check (true);

drop policy if exists "chat_threads_demo_all" on public.chat_threads;
create policy "chat_threads_demo_all" on public.chat_threads for all using (true) with check (true);
