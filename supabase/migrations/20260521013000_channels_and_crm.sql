create table if not exists channel_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  channel text not null check (channel in ('whatsapp', 'webchat', 'telegram', 'instagram', 'facebook')),
  status text not null default 'disconnected',
  display_name text,
  external_id text not null default 'default',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists channel_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  channel text not null check (channel in ('whatsapp', 'webchat', 'telegram', 'instagram', 'facebook')),
  external_conversation_id text not null,
  contact_name text,
  contact_handle text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, channel, external_conversation_id)
);

create table if not exists channel_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  conversation_id uuid references channel_conversations(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'webchat', 'telegram', 'instagram', 'facebook')),
  external_message_id text,
  direction text not null check (direction in ('inbound', 'outbound')),
  message text not null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists crm_contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text,
  phone text,
  email text,
  source_channel text,
  stage text not null default 'nuevo',
  tags text[] not null default '{}'::text[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table businesses add column if not exists enabled_channels text[] not null default array['whatsapp']::text[];
alter table businesses add column if not exists plan_tier text not null default 'whatsapp';

create index if not exists idx_channel_messages_business_created on channel_messages (business_id, created_at desc);
create index if not exists idx_channel_conversations_business_updated on channel_conversations (business_id, updated_at desc);
create index if not exists idx_crm_contacts_business on crm_contacts (business_id, updated_at desc);
create unique index if not exists idx_channel_connections_unique on channel_connections (business_id, channel, external_id);

alter table channel_connections enable row level security;
alter table channel_conversations enable row level security;
alter table channel_messages enable row level security;
alter table crm_contacts enable row level security;

drop policy if exists "users_own_channel_connections" on channel_connections;
create policy "users_own_channel_connections" on channel_connections for all using (
  business_id in (select id from businesses where user_id = auth.uid())
);

drop policy if exists "users_own_channel_conversations" on channel_conversations;
create policy "users_own_channel_conversations" on channel_conversations for all using (
  business_id in (select id from businesses where user_id = auth.uid())
);

drop policy if exists "users_own_channel_messages" on channel_messages;
create policy "users_own_channel_messages" on channel_messages for all using (
  business_id in (select id from businesses where user_id = auth.uid())
);

drop policy if exists "users_own_crm_contacts" on crm_contacts;
create policy "users_own_crm_contacts" on crm_contacts for all using (
  business_id in (select id from businesses where user_id = auth.uid())
);
