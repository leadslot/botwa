-- Consumo mensual por negocio
alter table businesses add column if not exists monthly_responses_used int not null default 0;
alter table businesses add column if not exists monthly_emails_used int not null default 0;
alter table businesses add column if not exists extra_responses int not null default 0;
alter table businesses add column if not exists extra_emails int not null default 0;
alter table businesses add column if not exists cycle_start_date date not null default current_date;

-- Solicitudes de packs adicionales
create table if not exists addon_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  addon_type text not null,
  addon_label text not null,
  responses_added int not null default 0,
  emails_added int not null default 0,
  price int not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'activo', 'rechazado')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table addon_requests enable row level security;

create policy "users_own_addon_requests" on addon_requests for all using (
  business_id in (select id from businesses where user_id = auth.uid())
);

create index if not exists idx_addon_requests_business on addon_requests (business_id, status);
