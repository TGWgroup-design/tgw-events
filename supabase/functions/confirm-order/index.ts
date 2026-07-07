import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient, requireStaff } from "../_shared/supabaseAdmin.ts";
import { signTicketId } from "../_shared/qrToken.ts";
import { renderQrPng } from "../_shared/qrImage.ts";
import { buildIcsEvent } from "../_shared/ics.ts";
import { sendEmail } from "../_shared/resend.ts";

const QR_BUCKET = "ticket-qrcodes";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

// btoa() only accepts Latin-1 text and throws on characters like em dashes
// or curly quotes that organisers might type into an event description, so
// text content is UTF-8 encoded to bytes first.
function utf8ToBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}

function directionsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const staffId = await requireStaff(req);
  if (!staffId) return jsonResponse({ error: "unauthorized" }, 401);

  try {
    const { orderId } = await req.json();
    if (typeof orderId !== "string" || !orderId) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const admin = getAdminClient();

    // Atomically flip pending_payment -> confirmed as the double-confirm
    // guard; if this touches zero rows the order was already confirmed (or
    // doesn't exist), so we stop before creating a second set of tickets.
    const { data: updatedOrders, error: guardErr } = await admin
      .from("orders")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString(), confirmed_by: staffId })
      .eq("id", orderId)
      .eq("status", "pending_payment")
      .select()
      .limit(1);

    if (guardErr) {
      return jsonResponse({ success: false, stage: "guard", error: guardErr.message }, 500);
    }
    if (!updatedOrders || updatedOrders.length === 0) {
      return jsonResponse({ success: false, stage: "guard", error: "already_confirmed_or_not_found" }, 409);
    }
    const order = updatedOrders[0];

    const { data: event, error: eventErr } = await admin
      .from("events")
      .select("*")
      .eq("id", order.event_id)
      .maybeSingle();
    if (eventErr || !event) {
      return jsonResponse({ success: false, stage: "event_lookup", error: "event_not_found" }, 500);
    }

    const { data: orderItems, error: itemsErr } = await admin
      .from("order_items")
      .select("id, quantity, ticket_type_id, ticket_types(name)")
      .eq("order_id", orderId);
    if (itemsErr || !orderItems) {
      return jsonResponse({ success: false, stage: "order_items_lookup", error: "order_items_not_found" }, 500);
    }

    const holderName = `${order.attendee_first_name} ${order.attendee_last_name}`;
    const secret = Deno.env.get("QR_HMAC_SECRET")!;

    const createdTickets: {
      id: string;
      ticketTypeName: string;
      qrToken: string;
      qrBytes: Uint8Array;
      qrImageUrl: string | null;
    }[] = [];

    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        const { data: ticketRow, error: ticketErr } = await admin
          .from("tickets")
          .insert({
            order_item_id: item.id,
            order_id: orderId,
            ticket_type_id: item.ticket_type_id,
            holder_name: holderName,
            qr_token: crypto.randomUUID(), // placeholder, replaced below once we have the real ticket id
          })
          .select()
          .single();

        if (ticketErr || !ticketRow) {
          return jsonResponse({ success: false, stage: "ticket_creation", error: "ticket_insert_failed" }, 500);
        }

        const qrToken = await signTicketId(ticketRow.id, secret);
        const qrBytes = await renderQrPng(qrToken);

        const path = `${orderId}/${ticketRow.id}.png`;
        const { error: uploadErr } = await admin.storage
          .from(QR_BUCKET)
          .upload(path, qrBytes, { contentType: "image/png", upsert: true });

        let qrImageUrl: string | null = null;
        if (!uploadErr) {
          qrImageUrl = admin.storage.from(QR_BUCKET).getPublicUrl(path).data.publicUrl;
        }

        await admin
          .from("tickets")
          .update({ qr_token: qrToken, qr_image_url: qrImageUrl })
          .eq("id", ticketRow.id);

        createdTickets.push({
          id: ticketRow.id,
          ticketTypeName: (item as any).ticket_types?.name ?? "Ticket",
          qrToken,
          qrBytes,
          qrImageUrl,
        });
      }
    }

    const icsContent = buildIcsEvent({
      uid: order.id,
      title: event.title,
      description: event.description ?? "",
      eventDate: event.event_date,
      timeText: event.time,
      explicitEndAt: event.event_end_at,
      venueName: event.venue_name,
      venueAddress: event.venue_address,
    });

    // Reference the Storage-hosted PNG by its public HTTPS URL rather than a
    // cid: attachment -- far more consistently rendered across mail clients.
    // The same PNG is also attached to the email as a plain file for guests
    // who want an offline copy, and via the /#/ticket/:token fallback page.
    const ticketBlocksHtml = createdTickets
      .map(
        (t, idx) => `
          <div style="margin:16px 0;padding:16px;border:1px solid #ddd;border-radius:8px;">
            <p style="margin:0 0 8px;font-weight:600;">Ticket ${idx + 1} of ${createdTickets.length} &mdash; ${t.ticketTypeName}</p>
            ${
          t.qrImageUrl
            ? `<img src="${t.qrImageUrl}" alt="Ticket QR code" width="240" height="240" />`
            : `<p>QR code attached as ticket-${t.id}.png</p>`
        }
          </div>`,
      )
      .join("");

    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h1 style="font-size:20px;">${event.title}</h1>
        <p><strong>${event.date_display}</strong> &middot; ${event.time ?? ""}</p>
        <p>${event.venue_name}<br>${event.venue_address}</p>
        <p><a href="${directionsUrl(event.venue_address)}">Get directions</a></p>
        ${event.dress_code ? `<p><strong>Dress code:</strong> ${event.dress_code}</p>` : ""}
        <p>Order reference: ${order.order_ref}</p>
        ${ticketBlocksHtml}
        <p style="color:#666;font-size:13px;">Show a QR code at the entrance to check in. A calendar invite is attached. All ticket sales are final.</p>
      </div>`;

    const attachments = [
      { filename: "event.ics", content: utf8ToBase64(icsContent), contentType: "text/calendar" },
      ...createdTickets.map((t) => ({
        filename: `ticket-${t.id}.png`,
        content: bytesToBase64(t.qrBytes),
        contentType: "image/png",
      })),
    ];

    const emailResult = await sendEmail({
      to: order.attendee_email,
      subject: `Your tickets for ${event.title}`,
      html,
      attachments,
    });

    if (!emailResult.ok) {
      return jsonResponse({
        success: false,
        stage: "email",
        error: emailResult.error,
        ticketsCreated: createdTickets.length,
      }, 502);
    }

    return jsonResponse({ success: true, ticketsCreated: createdTickets.length, emailSent: true });
  } catch (_err) {
    return jsonResponse({ success: false, stage: "unexpected", error: String(_err) }, 500);
  }
});
