import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";
import { sendEmail } from "../_shared/resend.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = await req.json();
    const {
      serviceRequired, eventType, eventDate, estimatedGuests, estimatedBudget,
      venueLocation, eventDetails, contactName, organisation, email, phone,
    } = body ?? {};

    if (
      typeof serviceRequired !== "string" || !serviceRequired.trim() ||
      typeof eventType !== "string" || !eventType.trim() ||
      typeof contactName !== "string" || !contactName.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof phone !== "string" || !phone.trim()
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const admin = getAdminClient();

    const { data: enquiry, error: insertErr } = await admin
      .from("enquiries")
      .insert({
        service_required: serviceRequired.trim(),
        event_type: eventType.trim(),
        event_date: eventDate || null,
        estimated_guests: estimatedGuests || null,
        estimated_budget: estimatedBudget || null,
        venue_location: (venueLocation || "").trim() || null,
        event_details: (eventDetails || "").trim() || null,
        contact_name: contactName.trim(),
        organisation: (organisation || "").trim() || null,
        email: email.trim(),
        phone: phone.trim(),
      })
      .select()
      .single();

    if (insertErr || !enquiry) {
      return jsonResponse({ error: "enquiry_creation_failed" }, 500);
    }

    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h1 style="font-size:20px;">New event services enquiry</h1>
        <p><strong>Service required:</strong> ${enquiry.service_required}</p>
        <p><strong>Event type:</strong> ${enquiry.event_type}</p>
        ${enquiry.event_date ? `<p><strong>Event date:</strong> ${enquiry.event_date}</p>` : ""}
        ${enquiry.estimated_guests ? `<p><strong>Estimated guests:</strong> ${enquiry.estimated_guests}</p>` : ""}
        ${enquiry.estimated_budget ? `<p><strong>Estimated budget:</strong> ${enquiry.estimated_budget}</p>` : ""}
        ${enquiry.venue_location ? `<p><strong>Venue/location:</strong> ${enquiry.venue_location}</p>` : ""}
        ${enquiry.event_details ? `<p><strong>Details:</strong> ${enquiry.event_details}</p>` : ""}
        <hr>
        <p><strong>Contact:</strong> ${enquiry.contact_name}${enquiry.organisation ? ` (${enquiry.organisation})` : ""}</p>
        <p><strong>Email:</strong> ${enquiry.email}</p>
        <p><strong>Phone:</strong> ${enquiry.phone}</p>
      </div>`;

    const emailResult = await sendEmail({
      to: Deno.env.get("ENQUIRY_NOTIFY_ADDRESS") || "info@tgwgroup.co.za",
      subject: `New enquiry: ${enquiry.service_required} — ${enquiry.contact_name}`,
      html,
    });

    return jsonResponse({ success: true, emailSent: emailResult.ok });
  } catch (_err) {
    return jsonResponse({ error: "unexpected_error" }, 500);
  }
});
