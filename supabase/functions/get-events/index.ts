import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const admin = getAdminClient();

    const { data: events, error: eventsErr } = await admin
      .from("events")
      .select("*")
      .eq("is_active", true)
      .order("event_date", { ascending: true });

    if (eventsErr || !events) {
      return jsonResponse({ error: "events_lookup_failed" }, 500);
    }

    const { data: ticketTypes, error: ttErr } = await admin
      .from("ticket_types")
      .select("*")
      .eq("is_active", true);

    if (ttErr || !ticketTypes) {
      return jsonResponse({ error: "ticket_types_lookup_failed" }, 500);
    }

    const shaped = events.map((ev) => ({
      id: ev.id,
      title: ev.title,
      organiser: ev.organiser,
      presents: ev.presents,
      dateDisplay: ev.date_display,
      time: ev.time,
      venueName: ev.venue_name,
      venueAddress: ev.venue_address,
      ageRestriction: ev.age_restriction,
      dressCode: ev.dress_code,
      description: ev.description,
      includes: ev.includes ?? [],
      image: ev.image_url,
      ticketTypes: ticketTypes
        .filter((tt) => tt.event_id === ev.id)
        .map((tt) => ({
          id: tt.slug,
          name: tt.name,
          price: tt.price_cents / 100,
          description: tt.description,
        })),
      bankDetails: {
        accountHolder: ev.bank_account_holder,
        bankName: ev.bank_name,
        accountNumber: ev.bank_account_number,
        accountType: ev.bank_account_type,
        branchCode: ev.bank_branch_code,
      },
    }));

    return jsonResponse({ events: shaped });
  } catch (_err) {
    return jsonResponse({ error: "unexpected_error" }, 500);
  }
});
