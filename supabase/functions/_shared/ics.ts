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

// Same as toIcsDate but WITHOUT the trailing "Z". Per RFC5545, a DATE-TIME
// with no "Z" and no TZID is "floating" local time -- calendar apps display
// it literally, with no timezone conversion. That's what we want for
// DTSTART/DTEND: the numbers already represent the event's SA wall-clock
// time, so tagging them as UTC (as toIcsDate does) would make every
// compliant calendar client shift the displayed time by SA's UTC+2 offset.
// DTSTAMP is the one field that correctly stays true UTC (toIcsDate).
function toIcsDateFloating(d: Date): string {
  return toIcsDate(d).slice(0, -1);
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

  // event_date is a plain date (no timezone data available), so we build the
  // event's wall-clock numbers here and emit them as floating local time
  // (see toIcsDateFloating) rather than tagging them as UTC.
  const start = new Date(`${eventDate}T00:00:00Z`);
  start.setUTCHours(startHour, startMinute, 0, 0);

  // explicitEndAt, if provided, is a true UTC timestamptz -- convert it to
  // the same "wall-clock numbers, floating" representation by reading its
  // SAST (UTC+2) clock time, since SA has no daylight-saving offset to worry
  // about.
  const end = explicitEndAt
    ? new Date(new Date(explicitEndAt).getTime() + 2 * 60 * 60 * 1000)
    : new Date(start.getTime() + 6 * 60 * 60 * 1000);

  const now = toIcsDate(new Date());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TGW Events//Ticketing//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}@tgwevents`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsDateFloating(start)}`,
    `DTEND:${toIcsDateFloating(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(`${venueName}, ${venueAddress}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
