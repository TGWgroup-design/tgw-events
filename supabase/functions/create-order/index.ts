import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";

function generateOrderRef(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TGW-${stamp}-${rand}`;
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = await req.json();
    const { eventId, attendee, payMethod, items } = body ?? {};

    if (
      typeof eventId !== "string" ||
      !attendee || typeof attendee.firstName !== "string" || !attendee.firstName.trim() ||
      typeof attendee.lastName !== "string" || !attendee.lastName.trim() ||
      typeof attendee.email !== "string" || !attendee.email.trim() ||
      typeof attendee.phone !== "string" || !attendee.phone.trim() ||
      (payMethod !== "snapscan" && payMethod !== "eft") ||
      !Array.isArray(items) || items.length === 0
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const admin = getAdminClient();

    const { data: event, error: eventErr } = await admin
      .from("events")
      .select("*")
      .eq("id", eventId)
      .eq("is_active", true)
      .maybeSingle();

    if (eventErr || !event) {
      return jsonResponse({ error: "event_not_found" }, 404);
    }

    const { data: ticketTypes, error: ttErr } = await admin
      .from("ticket_types")
      .select("*")
      .eq("event_id", eventId)
      .eq("is_active", true);

    if (ttErr || !ticketTypes) {
      return jsonResponse({ error: "ticket_types_lookup_failed" }, 500);
    }

    const ttBySlug = new Map(ticketTypes.map((tt) => [tt.slug, tt]));

    const lineItems: {
      ticketTypeId: string;
      slug: string;
      name: string;
      unitPriceCents: number;
      quantity: number;
    }[] = [];

    for (const item of items) {
      const slug = item?.ticketTypeSlug;
      const quantity = Number(item?.quantity);
      if (typeof slug !== "string" || !Number.isInteger(quantity) || quantity <= 0) {
        return jsonResponse({ error: "invalid_line_item" }, 400);
      }
      const tt = ttBySlug.get(slug);
      if (!tt) {
        return jsonResponse({ error: "unknown_ticket_type", ticketTypeSlug: slug }, 400);
      }
      lineItems.push({
        ticketTypeId: tt.id,
        slug: tt.slug,
        name: tt.name,
        unitPriceCents: tt.price_cents,
        quantity,
      });
    }

    const totalCents = lineItems.reduce((sum, li) => sum + li.unitPriceCents * li.quantity, 0);
    const orderRef = generateOrderRef();

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        order_ref: orderRef,
        event_id: eventId,
        attendee_first_name: attendee.firstName.trim(),
        attendee_last_name: attendee.lastName.trim(),
        attendee_email: attendee.email.trim(),
        attendee_phone: attendee.phone.trim(),
        pay_method: payMethod,
        status: "pending_payment",
        total_cents: totalCents,
      })
      .select()
      .single();

    if (orderErr || !order) {
      return jsonResponse({ error: "order_creation_failed" }, 500);
    }

    const { error: itemsErr } = await admin.from("order_items").insert(
      lineItems.map((li) => ({
        order_id: order.id,
        ticket_type_id: li.ticketTypeId,
        quantity: li.quantity,
        unit_price_cents: li.unitPriceCents,
      })),
    );

    if (itemsErr) {
      // Roll back the order so we don't leave an order with no items behind.
      await admin.from("orders").delete().eq("id", order.id);
      return jsonResponse({ error: "order_items_creation_failed" }, 500);
    }

    return jsonResponse({
      orderId: order.id,
      orderRef,
      totalCents,
      event: {
        id: event.id,
        title: event.title,
        organiser: event.organiser,
        bankDetails: {
          accountHolder: event.bank_account_holder,
          bankName: event.bank_name,
          accountNumber: event.bank_account_number,
          accountType: event.bank_account_type,
          branchCode: event.bank_branch_code,
        },
      },
      lineItems: lineItems.map((li) => ({
        name: li.name,
        quantity: li.quantity,
        unitPriceCents: li.unitPriceCents,
      })),
    });
  } catch (_err) {
    return jsonResponse({ error: "unexpected_error" }, 500);
  }
});
