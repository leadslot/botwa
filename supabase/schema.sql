create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  category text,
  description text,
  ai_prompt text,
  ai_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade unique,
  status text default 'disconnected',
  qr_code text,
  updated_at timestamptz default now()
);

create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  from_number text not null,
  message text not null,
  direction text not null,
  created_at timestamptz default now()
);

alter table businesses enable row level security;
alter table whatsapp_sessions enable row level security;
alter table whatsapp_messages enable row level security;

create policy "users_own_business" on businesses for all using (auth.uid() = user_id);
create policy "users_own_sessions" on whatsapp_sessions for all using (
  business_id in (select id from businesses where user_id = auth.uid())
);
create policy "users_own_messages" on whatsapp_messages for all using (
  business_id in (select id from businesses where user_id = auth.uid())
);
