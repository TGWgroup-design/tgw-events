-- Sets each event's real poster image, uploaded to the event-posters bucket,
-- replacing the shared fallback placeholder used until now.
update events set image_url = 'https://ulrgrlpkawudxuqwaksf.supabase.co/storage/v1/object/public/event-posters/flexgear-pilates-party.png'
  where id = 'flexgear-pilates-party';

update events set image_url = 'https://ulrgrlpkawudxuqwaksf.supabase.co/storage/v1/object/public/event-posters/the-art-of-dining-at-samu.jpg'
  where id = 'the-art-of-dining-at-samu';

update events set image_url = 'https://ulrgrlpkawudxuqwaksf.supabase.co/storage/v1/object/public/event-posters/queening-and-winning-sunset-soiree.jpg'
  where id = 'queening-and-winning-sunset-soiree';
