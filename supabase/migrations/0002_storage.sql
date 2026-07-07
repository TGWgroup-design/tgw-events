-- Public bucket for ticket QR code PNGs, referenced by public HTTPS URL from
-- confirmation emails and the guest-facing #/ticket/:token page. Uploads only
-- ever happen from confirm-order using the service-role key (bypasses RLS),
-- so no insert/update policies are needed here.
insert into storage.buckets (id, name, public)
values ('ticket-qrcodes', 'ticket-qrcodes', true)
on conflict (id) do nothing;
