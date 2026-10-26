import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient, requireStaff } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const staffId = await requireStaff(req);
  if (!staffId) return jsonResponse({ error: "unauthorized" }, 401);

  try {
    const admin = getAdminClient();

    const { data: enquiries, error } = await admin
      .from("enquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !enquiries) {
      return jsonResponse({ error: "enquiries_lookup_failed" }, 500);
    }

    return jsonResponse({
      enquiries: enquiries.map((e) => ({
        id: e.id,
        createdAt: e.created_at,
        serviceRequired: e.service_required,
        eventType: e.event_type,
        eventDate: e.event_date,
        estimatedGuests: e.estimated_guests,
        estimatedBudget: e.estimated_budget,
        venueLocation: e.venue_location,
        eventDetails: e.event_details,
        contactName: e.contact_name,
        organisation: e.organisation,
        email: e.email,
        phone: e.phone,
        status: e.status,
      })),
    });
  } catch (_err) {
    return jsonResponse({ error: "unexpected_error" }, 500);
  }
});
