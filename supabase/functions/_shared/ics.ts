// Builds a minimal VCALENDAR/VEVENT .ics file. Events store a free-text
// "time" string (e.g. "13:00 till late") alongside a real event_date; we pull
// a leading HH:MM out of that string for the start time and, absent an
// explicit event_end_at, default the end to start + 6 hours.

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toIcsDate(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcsEvent(params: {
  uid: string;
  title: string;
  description: string;
  eventDate: string; // YYYY-MM-DD
  timeText: string | null; // e.g. "13:00 till late"
  explicitEndAt: string | null; // ISO timestamptz, if known
  venueName: string;
  venueAddress: string;
}): string {
  const { uid, title, description, eventDate, timeText, explicitEndAt, venueName, venueAddress } = params;

  const match = (timeText || "").match(/^(\d{1,2}):(\d{2})/);
  const startHour = match ? parseInt(match[1], 10) : 18;
  const startMinute = match ? parseInt(match[2], 10) : 0;

  // event_date is a plain date (no timezone data available), so we treat the
  // stated time as local wall-clock time and encode the ics as UTC using the
  // same numbers -- acceptable for a single-country events business where
  // guests and venue share a timezone; calendar apps will show the same
  // clock time rather than performing a timezone conversion.
  const start = new Date(`${eventDate}T00:00:00Z`);
  start.setUTCHours(startHour, startMinute, 0, 0);

  const end = explicitEndAt ? new Date(explicitEndAt) : new Date(start.getTime() + 6 * 60 * 60 * 1000);

  const now = toIcsDate(new Date());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TGW Events//Ticketing//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}@tgwevents`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(`${venueName}, ${venueAddress}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
