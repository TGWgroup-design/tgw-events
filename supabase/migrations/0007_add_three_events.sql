-- Adds three new events sourced from organiser-supplied posters/details:
-- Flexgear Pilates Party (24 Oct 2026), Queening & Winning Sunset Soiree
-- (7 Nov 2026), and The Art of Dining at SAMU (19 Dec 2026).

insert into events (
  id, title, organiser, presents, date_display, event_date, event_end_at, time,
  venue_name, venue_address, age_restriction, dress_code, description, includes,
  bank_account_holder, bank_name, bank_account_number, bank_account_type, bank_branch_code
) values
(
  'flexgear-pilates-party',
  'Flexgear Pilates Party — Celebrating 4 Years',
  'Flexgear',
  'Flexgear presents',
  'Saturday, 24 October 2026',
  '2026-10-24',
  null,
  '10:00',
  '11 Plein Street, Polokwane',
  '11 Plein Street, Polokwane',
  null,
  'Pink with a touch of white',
  'The ultimate celebration of strength and wellness, celebrating 4 years of Flexgear. Expect women''s empowerment and leadership, mental wellness and personal growth, networking and collaboration, and a women-owned business showcase. For bookings or questions, contact Miss Flexgear on WhatsApp: +27 71 498 2609.',
  '["Food", "Goodie bags", "Refreshments", "Women-owned business showcase"]'::jsonb,
  null, null, null, null, null
),
(
  'queening-and-winning-sunset-soiree',
  'Queening & Winning: Sunset Soirée',
  'Queening & Winning',
  'Hosted by Linda Maphiri',
  'Saturday, 7 November 2026',
  '2026-11-07',
  null,
  '11:00',
  'Mekete Gardens',
  'Plot 44, 618 Kareebosch, N1 Louis Trichardt, Polokwane, 0700',
  null,
  'Sunset Soirée theme',
  'Queening & Winning returns for its 4th annual edition. An afternoon of real talk, growth, and sisterhood — powerful conversations on property, purpose, and relationships, set against a golden sunset backdrop. Featuring Tebogo Seleka, Pastor Mantsha, Lesiba Maboea, and guest artist Claud''s SA, hosted by Linda Maphiri, MC''d by Mmatema Mrs G.',
  '["Afternoon of talks on property, purpose & relationships", "Guest speakers: Tebogo Seleka, Pastor Mantsha, Lesiba Maboea", "Live guest performance by Claud''s SA", "Golden sunset garden setting"]'::jsonb,
  'Queening & Winning',
  'FNB',
  '63047407209',
  null,
  '250655'
),
(
  'the-art-of-dining-at-samu',
  'The Art of Dining at SAMU',
  'SAMU Restaurant',
  'SAMU Restaurant presents',
  'Saturday, 19 December 2026',
  '2026-12-19',
  '2026-12-19T18:00:00Z',
  '11:00 - 20:00',
  'Mac Country Venue',
  'Stampblokfontein, Magoebaskloof A37.3, Haenertsburg, Limpopo',
  '18+',
  null,
  'A five-course dining experience paired with drinks, featuring MUSA, Chef Patrick, and live saxophone. Includes a welcome drink, curated food and drink pairing, and an exclusive take-home gift.',
  '["Welcome drink", "Five-course dining experience with drink pairing", "Live performance: MUSA, Chef Patrick & saxophone", "Exclusive take-home gift"]'::jsonb,
  'Faithhill Trading t/a SAMU Restaurant',
  'Capitec Business',
  '1053672896',
  'Business',
  ''
);

insert into ticket_types (event_id, slug, name, price_cents, description) values
(
  'flexgear-pilates-party',
  'standard',
  'Standard entry',
  80000,
  'Includes food, a goodie bag, and refreshments.'
),
(
  'queening-and-winning-sunset-soiree',
  'standard',
  'Sunset Soirée entry',
  75000,
  'Entry to the full afternoon programme — talks, sisterhood, and a sunset reception.'
),
(
  'the-art-of-dining-at-samu',
  'standard',
  'Dining experience',
  200000,
  'Includes a welcome drink, five-course dining experience with drink pairing, and an exclusive take-home gift.'
);
