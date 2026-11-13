-- M.S.I. Inter College — admission portal schema (applied to Supabase project
-- "msi-inter-college"). All access goes through the `api` Edge Function
-- (service role), which verifies Firebase ID tokens and staff roles.
-- RLS is enabled with NO policies, so the publishable key cannot read or
-- write any table directly.

create table public.settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.app_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table public.staff (
  email text primary key,
  name text,
  role text not null default 'staff' check (role in ('admin','staff')),
  created_at timestamptz not null default now()
);

create table public.profiles (
  uid text primary key,
  email text,
  name text,
  photo_url text,
  phone text,
  created_at timestamptz not null default now(),
  last_login timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  reg_id text not null unique,
  uid text references public.profiles(uid) on delete set null,
  session text not null,
  status text not null default 'submitted' check (status in ('submitted','review','approved','rejected')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','office','paid','failed')),
  fee_total integer not null default 0,
  fee_breakup jsonb not null default '{}'::jsonb,
  student_name text not null,
  father_name text,
  phone text not null,
  email text,
  apply_class text not null,
  stream text,
  data jsonb not null default '{}'::jsonb,
  files jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  payment_method text,
  payment_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index applications_uid_idx on public.applications(uid);
create index applications_phone_idx on public.applications(phone);
create index applications_created_idx on public.applications(created_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  txnid text not null unique,
  reg_id text not null references public.applications(reg_id) on delete cascade,
  amount numeric(10,2) not null,
  gateway text not null default 'payu',
  status text not null default 'initiated' check (status in ('initiated','success','failure','pending','cash')),
  gateway_ref text,
  mode text,
  return_url text,
  raw jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_reg_idx on public.payments(reg_id);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  category text not null default 'general' check (category in ('general','admission','exam','result','holiday','event')),
  link_url text,
  file_url text,
  is_new boolean not null default true,
  active boolean not null default true,
  published_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.gallery (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  category text not null default 'campus' check (category in ('campus','labs','sports','events')),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.toppers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  exam text not null,
  stream text,
  percent numeric(5,2),
  rank_text text,
  year text,
  photo_url text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.leaders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  message text,
  photo_url text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new','resolved')),
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['settings','app_secrets','staff','profiles','applications','payments','notices','gallery','toppers','leaders','enquiries']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('applicant-docs', 'applicant-docs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('site-media', 'site-media', true, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;
