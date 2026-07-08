-- One-off cleanup: removes only the specific test orders placed while
-- verifying the checkout -> confirm -> email -> check-in pipeline
-- end-to-end (attendee "Test Guest" / test@example.com, and the
-- info@tgwgroup.co.za confirmation test). Deleting orders cascades to
-- order_items and tickets.
delete from orders
where attendee_email in ('test@example.com', 'info@tgwgroup.co.za');
