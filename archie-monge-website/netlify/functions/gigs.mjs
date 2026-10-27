/* =====================================================================
   Gigs from Google Calendar
   Netlify runs this at /api/gigs. It reads your "Gigs" calendar through
   its secret iCal address and returns upcoming gigs as JSON, which the
   website shows on the home and Gigs pages.

   Setup (see README → "Gigs from Google Calendar"):
     GIGS_ICAL_URL   your calendar's "Secret address in iCal format"
     GIGS_TIMEZONE   optional, e.g. "Europe/London". Defaults to the
                     calendar's own time zone.
   ===================================================================== */

export const config = { path: '/api/gigs' };

export default async function handler() {
  const url = process.env.GIGS_ICAL_URL;
  if (!url) return json({ configured: false, gigs: [] });
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Google Calendar replied ' + res.status);
    const gigs = icsToGigs(await res.text(), { timeZone: process.env.GIGS_TIMEZONE });
    return json({ configured: true, gigs }, true);
  } catch (err) {
    console.error('[gigs]', err);
    return json({ configured: true, error: true, gigs: [] });
  }
}

function json(body, cache) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (cache) {
    // Browsers re-check every 5 minutes; Netlify's CDN refreshes every 15.
    headers['Cache-Control'] = 'public, max-age=300';
    headers['Netlify-CDN-Cache-Control'] = 'public, durable, max-age=900, stale-while-revalidate=86400';
  }
  return new Response(JSON.stringify(body), { headers });
}

// ---------- iCal → gigs ----------

export function icsToGigs(text, opts = {}) {
  // Long iCal lines are "folded" onto the next line with a leading space.
  const lines = String(text).replace(/\r?\n[ \t]/g, '').split(/\r?\n/);

  const calendarTz = (lines.find((l) => l.startsWith('X-WR-TIMEZONE:')) || '').slice(14).trim();
  const tz = validTimeZone(opts.timeZone) || validTimeZone(calendarTz) || 'UTC';
  const today = dateInZone(opts.now || new Date(), tz).date;

  const events = [];
  let ev = null;
  let nested = 0; // skip VALARM etc. inside an event
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { ev = {}; nested = 0; continue; }
    if (line === 'END:VEVENT') { if (ev) events.push(ev); ev = null; continue; }
    if (!ev) continue;
    if (line.startsWith('BEGIN:')) { nested++; continue; }
    if (line.startsWith('END:')) { nested--; continue; }
    if (nested > 0) continue;
    const m = line.match(/^([A-Z-]+)((?:;[^:]*)?):(.*)$/);
    if (m && !(m[1] in ev)) ev[m[1]] = { params: m[2], value: m[3] };
  }

  const gigs = [];
  for (const e of events) {
    if (!e.DTSTART || /CANCELLED/i.test(e.STATUS?.value || '')) continue;
    const start = parseStart(e.DTSTART, tz);
    if (!start || start.date < today) continue;
    const details = readDescription(unescape(e.DESCRIPTION?.value || ''));
    gigs.push({
      date: start.date,
      time: start.time,
      venue: unescape(e.SUMMARY?.value || 'Gig').replace(/^\s*(gig|show)\s*[:\-–—]\s*/i, '').trim(),
      city: formatPlace(unescape(e.LOCATION?.value || '')),
      ticket_url: (e.URL && /^https?:/.test(e.URL.value) ? e.URL.value : '') || details.ticket_url,
      sold_out: details.sold_out,
      note: details.note
    });
  }
  return gigs.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 100);
}

function unescape(v) {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

function validTimeZone(tz) {
  if (!tz) return '';
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return tz; } catch { return ''; }
}

function dateInZone(d, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour, minute: +p.minute };
}

// All-day events have no time. Timed events in UTC ("Z") are shown in the calendar's time zone;
// events with their own time zone (TZID) are shown exactly as entered.
function parseStart(prop, tz) {
  const v = prop.value.trim();
  if (/^\d{8}$/.test(v)) return { date: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`, time: '' };
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})\d{2}(Z?)$/);
  if (!m) return null;
  if (m[6] === 'Z') {
    const local = dateInZone(new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5])), tz);
    return { date: local.date, time: formatTime(local.hour, local.minute) };
  }
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: formatTime(+m[4], +m[5]) };
}

function formatTime(h, min) {
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return h12 + (min ? ':' + String(min).padStart(2, '0') : '') + suffix;
}

// Only three things are read from the description, so private notes stay private:
// the first link (tickets), the words "sold out", and a line starting "Note:".
function readDescription(raw) {
  const html = raw.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n');
  const hrefs = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
  const plain = html.replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const links = hrefs.concat(plain.match(/https?:\/\/[^\s<>"]+/g) || [])
    .map((u) => u.replace(/&amp;/g, '&'))
    .filter((u) => !/(^|\.)google\.com\//.test(u.replace(/^https?:\/\//, '')));
  const note = (plain.match(/^\s*note\s*:\s*(.+)$/im) || [])[1];
  return {
    ticket_url: links[0] || '',
    sold_out: /\bsold[\s-]?out\b/i.test(plain),
    note: note ? note.trim().slice(0, 80) : ''
  };
}

// "Frog & Bucket, 102 Oldham St, Manchester M4 1LJ, UK" → "Manchester, UK"
// "Manchester, UK" → "Manchester, UK"
function formatPlace(raw) {
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(', ');
  const country = parts[parts.length - 1];
  const city = parts[parts.length - 2].split(/\s+/).filter((w) => !/\d/.test(w)).join(' ') || parts[parts.length - 3];
  return [city, country].filter(Boolean).join(', ');
}
