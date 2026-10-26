-- Corrects crediting for The Art of Dining at SAMU: Chef Patrick prepares
-- the five-course meal (not part of the live performance), which is
-- saxophone and MUSA.
update events
set description = 'A five-course dining experience by Chef Patrick, paired with drinks, featuring a live performance by saxophone and MUSA. Includes a welcome drink, curated food and drink pairing, and an exclusive take-home gift.',
    includes = '["Welcome drink", "Five-course dining experience by Chef Patrick", "Live performance: saxophone and MUSA", "Exclusive take-home gift"]'::jsonb
where id = 'the-art-of-dining-at-samu';
