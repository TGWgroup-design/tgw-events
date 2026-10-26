-- Event-services enquiries submitted via the "For Event Organisers" page.
create table enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  service_required text not null,
  event_type text not null,
  event_date date,
  estimated_guests text,
  estimated_budget text,
  venue_location text,
  event_details text,
  contact_name text not null,
  organisation text,
  email text not null,
  phone text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed'))
);

alter table enquiries enable row level security;

-- No anon read/write policies: submission goes through the submit-enquiry
-- Edge Function (service-role key), staff viewing goes through
-- list-enquiries using their authenticated session.
create policy enquiries_staff_read on enquiries
  for select using (is_staff());
