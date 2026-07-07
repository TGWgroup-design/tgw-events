import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient, requireStaff } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const staffId = await requireStaff(req);
  if (!staffId) return jsonResponse({ error: "unauthorized" }, 401);

  try {
    const admin = getAdminClient();

    const { data: orders, error: ordersErr } = await admin
      .from("orders")
      .select("id, order_ref, event_id, attendee_first_name, attendee_last_name, attendee_email, pay_method, total_cents, created_at, events(title)")
      .eq("status", "pending_payment")
      .order("created_at", { ascending: true });

    if (ordersErr || !orders) {
      return jsonResponse({ error: "orders_lookup_failed" }, 500);
    }

    const orderIds = orders.map((o) => o.id);
    const { data: items, error: itemsErr } = await admin
      .from("order_items")
      .select("order_id, quantity, ticket_types(name)")
      .in("order_id", orderIds.length > 0 ? orderIds : ["00000000-0000-0000-0000-000000000000"]);

    if (itemsErr) {
      return jsonResponse({ error: "order_items_lookup_failed" }, 500);
    }

    const shaped = orders.map((o) => ({
      id: o.id,
      orderRef: o.order_ref,
      eventTitle: (o as any).events?.title ?? o.event_id,
      attendeeName: `${o.attendee_first_name} ${o.attendee_last_name}`,
      attendeeEmail: o.attendee_email,
      payMethod: o.pay_method,
      totalCents: o.total_cents,
      createdAt: o.created_at,
      lineItems: (items ?? [])
        .filter((it: any) => it.order_id === o.id)
        .map((it: any) => ({ name: it.ticket_types?.name ?? "Ticket", quantity: it.quantity })),
    }));

    return jsonResponse({ orders: shaped });
  } catch (_err) {
    return jsonResponse({ error: "unexpected_error" }, 500);
  }
});
