-- TGW Events ticketing platform schema.
-- Events/ticket types are the canonical price source; orders/order_items/tickets
-- store server-computed snapshots so nothing is ever trusted from the client.

create extension if not exists "pgcrypto";

-- ---------- events ----------
create table events (
  id text primary key,
  title text not null,
  organiser text not null,
  presents text,
  date_display text not null,
  event_date date not null,
  event_end_at timestamptz, -- explicit end, when known; null means "till late" (see confirm-order .ics logic)
  time text,
  venue_name text not null,
  venue_address text not null,
  age_restriction text,
  dress_code text,
  description text,
  includes jsonb not null default '[]'::jsonb,
  image_url text,
  bank_account_holder text,
  bank_name text,
  bank_account_number text,
  bank_account_type text,
  bank_branch_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- ticket_types ----------
create table ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references events(id) on delete cascade,
  slug text not null,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  description text,
  is_active boolean not null default true,
  unique (event_id, slug)
);

-- ---------- staff ----------
-- Allowlist of staff members (admin + door scanning). Row must exist for a
-- given auth.uid() for that user to pass the staff RLS policies below.
create table staff_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function is_staff()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from staff_users where user_id = auth.uid()
  );
$$;

-- ---------- orders ----------
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text not null unique,
  event_id text not null references events(id),
  attendee_first_name text not null,
  attendee_last_name text not null,
  attendee_email text not null,
  attendee_phone text not null,
  pay_method text not null check (pay_method in ('snapscan', 'eft')),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'confirmed', 'cancelled')),
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id)
);

-- ---------- order_items ----------
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  ticket_type_id uuid not null references ticket_types(id),
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);

-- ---------- tickets ----------
-- One row per physical ticket, so a 3-ticket order yields 3 independently
-- scannable QR codes.
create table tickets (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  ticket_type_id uuid not null references ticket_types(id),
  holder_name text not null,
  qr_token text not null unique,
  qr_image_url text,
  status text not null default 'valid' check (status in ('valid', 'used', 'void')),
  used_at timestamptz,
  checked_in_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index tickets_order_id_idx on tickets(order_id);
create index orders_status_idx on orders(status);

-- ---------- Row Level Security ----------
alter table events enable row level security;
alter table ticket_types enable row level security;
alter table staff_users enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table tickets enable row level security;

-- Public (anon) read access for the guest-facing site.
create policy events_public_read on events
  for select using (is_active = true);

create policy ticket_types_public_read on ticket_types
  for select using (is_active = true);

-- Staff can read everything they need for the admin/scan pages.
-- (Writes to orders/order_items/tickets happen only via Edge Functions using
-- the service-role key, which bypasses RLS entirely -- these staff policies
-- exist only in case a page ever queries Postgres directly instead of going
-- through a function.)
create policy orders_staff_read on orders
  for select using (is_staff());

create policy order_items_staff_read on order_items
  for select using (is_staff());

create policy tickets_staff_read on tickets
  for select using (is_staff());

create policy staff_users_self_read on staff_users
  for select using (auth.uid() = user_id);

-- No insert/update/delete policies are defined for orders/order_items/tickets
-- or for events/ticket_types -- every write goes through Edge Functions with
-- the service-role key, which bypasses RLS. This is intentional: it keeps all
-- pricing/ticket-issuance logic server-side.

-- ---------- Seed: existing SAMU event ----------
insert into events (
  id, title, organiser, presents, date_display, event_date, time,
  venue_name, venue_address, age_restriction, dress_code, description, includes,
  bank_account_holder, bank_name, bank_account_number, bank_account_type, bank_branch_code
) values (
  'all-white-garden-champagne',
  'All White Garden Champagne',
  'SAMU Restaurant',
  'SAMU Restaurant presents',
  'Saturday, 12 September 2026',
  '2026-09-12',
  '13:00 till late',
  'Mac Country Venue',
  'Stampblokfontein, Magoebaskloof A37.3, Haenertsburg, Limpopo',
  '18+',
  'All white',
  'An afternoon-into-night garden affair at Mac Country Venue: think champagne, cognac and signature cocktails poured freely, a three-course buffet, and live music carrying through the gardens as the sun goes down. Dress code is all white. Doors open at 13:00 and the celebration runs until late.',
  '["Three-course buffet", "Champagne, cognac & signature cocktails", "Live performances & music", "Garden setting at Mac Country Venue, Haenertsburg"]'::jsonb,
  'Faithhill Trading t/a SAMU Restaurant',
  'Capitec Business',
  '1053672896',
  'Business',
  ''
);

insert into ticket_types (event_id, slug, name, price_cents, description) values (
  'all-white-garden-champagne',
  'standard',
  'Standard entry',
  100000,
  'Includes a three-course buffet and entry to the full afternoon and evening programme.'
);
