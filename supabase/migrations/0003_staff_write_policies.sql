-- Staff (via admin.html, using their own authenticated Supabase session) are
-- allowed to create/edit events and ticket types directly -- unlike
-- orders/order_items/tickets, which stay Edge-Function-only because those
-- involve price computation and ticket/QR issuance that must not be
-- client-trusted.
create policy events_staff_write on events
  for insert with check (is_staff());

create policy events_staff_update on events
  for update using (is_staff()) with check (is_staff());

create policy ticket_types_staff_write on ticket_types
  for insert with check (is_staff());

create policy ticket_types_staff_update on ticket_types
  for update using (is_staff()) with check (is_staff());
