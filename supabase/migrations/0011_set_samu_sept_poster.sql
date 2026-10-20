-- Sets the real poster image for the original SAMU event, uploaded to the
-- event-posters bucket (extracted from the site's original embedded
-- fallback image, which was this exact poster).
update events set image_url = 'https://ulrgrlpkawudxuqwaksf.supabase.co/storage/v1/object/public/event-posters/all-white-garden-champagne.jpg'
  where id = 'all-white-garden-champagne';
