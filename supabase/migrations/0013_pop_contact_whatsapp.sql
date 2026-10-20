-- Proof-of-payment now goes directly to the organiser's own WhatsApp
-- instead of a shared TGW Events inbox.
alter table events add column if not exists pop_contact_link text;
alter table events add column if not exists pop_contact_label text;

update events
set pop_contact_link = 'https://wa.me/27724283252',
    pop_contact_label = 'Sharon (SAMU)'
where id in ('all-white-garden-champagne', 'the-art-of-dining-at-samu');

update events
set pop_contact_link = 'https://wa.me/27834551222',
    pop_contact_label = 'Iris Mokgapa (Queening & Winning)'
where id = 'queening-and-winning-sunset-soiree';
