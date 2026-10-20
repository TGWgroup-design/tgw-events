-- One-off cleanup: removes the test order placed to verify the
-- WhatsApp proof-of-payment link for Queening & Winning.
delete from orders
where attendee_email = 'test@example.com' and event_id = 'queening-and-winning-sunset-soiree';
