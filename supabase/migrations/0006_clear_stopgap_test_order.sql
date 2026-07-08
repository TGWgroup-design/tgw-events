-- One-off cleanup: removes the test order placed to verify the manual
-- ticket-link fallback in admin.html (attendee "Stopgap Test" /
-- realguest@example.com). Deleting the order cascades to order_items and
-- tickets.
delete from orders
where attendee_email = 'realguest@example.com';
