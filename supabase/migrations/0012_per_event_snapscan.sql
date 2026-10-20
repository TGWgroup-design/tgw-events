-- Lets an event opt out of SnapScan (previously offered platform-wide,
-- unconditionally, on every event). Queening & Winning takes EFT only;
-- Flexgear takes neither and is RSVP-only via its contact_link instead.
alter table events add column if not exists accepts_snapscan boolean not null default true;

update events set accepts_snapscan = false
where id in ('queening-and-winning-sunset-soiree', 'flexgear-pilates-party');
