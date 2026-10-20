-- Optional extra contact link per event (e.g. a WhatsApp booking/RSVP link),
-- shown alongside the normal ticket purchase flow, not instead of it.
alter table events add column if not exists contact_link text;
alter table events add column if not exists contact_label text;

update events
set contact_link = 'https://wa.me/qr/AUF7URJGBFDCE1',
    contact_label = 'RSVP via WhatsApp (Miss Flexgear)'
where id = 'flexgear-pilates-party';
