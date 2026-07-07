import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient, requireStaff } from "../_shared/supabaseAdmin.ts";
import { verifyQrToken } from "../_shared/qrToken.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const staffId = await requireStaff(req);
  if (!staffId) return jsonResponse({ error: "unauthorized" }, 401);

  try {
    const { qrToken } = await req.json();
    if (typeof qrToken !== "string" || !qrToken) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const secret = Deno.env.get("QR_HMAC_SECRET")!;
    const verification = await verifyQrToken(qrToken, secret);
    if (!verification.valid) {
      return jsonResponse({ valid: false, error: "invalid_signature" });
    }

    const admin = getAdminClient();
    const { data: ticket, error: ticketErr } = await admin
      .from("tickets")
      .select("id, holder_name, status, used_at, ticket_types(name), orders(event_id, events(title))")
      .eq("id", verification.ticketId)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return jsonResponse({ valid: false, error: "unknown_ticket" });
    }

    const ticketTypeName = (ticket as any).ticket_types?.name ?? "Ticket";
    const eventTitle = (ticket as any).orders?.events?.title ?? "";

    if (ticket.status === "used") {
      return jsonResponse({
        valid: true,
        alreadyUsed: true,
        usedAt: ticket.used_at,
        holderName: ticket.holder_name,
        ticketType: ticketTypeName,
        eventTitle,
      });
    }

    if (ticket.status === "void") {
      return jsonResponse({ valid: false, error: "ticket_void" });
    }

    const { error: updateErr } = await admin
      .from("tickets")
      .update({ status: "used", used_at: new Date().toISOString(), checked_in_by: staffId })
      .eq("id", ticket.id)
      .eq("status", "valid");

    if (updateErr) {
      return jsonResponse({ valid: false, error: "check_in_failed" }, 500);
    }

    return jsonResponse({
      valid: true,
      alreadyUsed: false,
      holderName: ticket.holder_name,
      ticketType: ticketTypeName,
      eventTitle,
    });
  } catch (_err) {
    return jsonResponse({ valid: false, error: "unexpected_error" }, 500);
  }
});
