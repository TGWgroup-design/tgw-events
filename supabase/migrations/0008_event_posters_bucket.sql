-- Public bucket for event poster images, referenced by image_url on the
-- events table and served directly to guests on the homepage/event pages.
insert into storage.buckets (id, name, public)
values ('event-posters', 'event-posters', true)
on conflict (id) do nothing;
