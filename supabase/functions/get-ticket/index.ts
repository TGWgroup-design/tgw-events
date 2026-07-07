import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";
import { verifyQrToken } from "../_shared/qrToken.ts";

// Public, read-only lookup by QR token -- powers the guest-facing
// #/ticket/:token fallback page (in case a phone's email client won't render
// the inline QR image). Requires a validly signed token, so it can't be used
// to browse arbitrary tickets.
Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const url = new URL(req.url);
    const qrToken = req.method === "GET"
      ? url.searchParams.get("token")
      : (await req.json())?.token;

    if (typeof qrToken !== "string" || !qrToken) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const secret = Deno.env.get("QR_HMAC_SECRET")!;
    const verification = await verifyQrToken(qrToken, secret);
    if (!verification.valid) {
      return jsonResponse({ error: "invalid_signature" }, 404);
    }

    const admin = getAdminClient();
    const { data: ticket, error: ticketErr } = await admin
      .from("tickets")
      .select(`
        id, holder_name, status, qr_image_url,
        ticket_types(name),
        orders(event_id, events(title, date_display, time, venue_name, venue_address, dress_code))
      `)
      .eq("id", verification.ticketId)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return jsonResponse({ error: "not_found" }, 404);
    }

    const order = (ticket as any).orders;
    const event = order?.events;

    return jsonResponse({
      holderName: ticket.holder_name,
      ticketType: (ticket as any).ticket_types?.name ?? "Ticket",
      status: ticket.status,
      qrImageUrl: ticket.qr_image_url,
      event: event
        ? {
          title: event.title,
          dateDisplay: event.date_display,
          time: event.time,
          venueName: event.venue_name,
          venueAddress: event.venue_address,
          dressCode: event.dress_code,
        }
        : null,
    });
  } catch (_err) {
    return jsonResponse({ error: "unexpected_error" }, 500);
  }
});
