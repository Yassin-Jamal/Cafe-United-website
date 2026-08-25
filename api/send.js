/* ------------------------------------------------------------------
   POST /api/send — takes a form submission and mails it to the café.

   Runs as a Vercel serverless function. Nothing secret lives in this
   file: the API key comes from the RESEND_API_KEY environment variable,
   which is set in the Vercel dashboard and never committed.
   ------------------------------------------------------------------ */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const TO      = process.env.MAIL_TO   || 'cafeunitedrotterdam@gmail.com';
// Sends from the verified mail.permaflare.com subdomain. Replies do not come
// back here — reply_to points at the visitor, see below.
const FROM    = process.env.MAIL_FROM || 'Café United <forms@mail.permaflare.com>';

const MAX_FIELDS = 40;
const MAX_LEN    = 2000;

/* Best-effort throttle. Serverless instances come and go, so this stops the
   obvious hammering rather than acting as a real rate limiter. */
const seen = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;

function throttled(ip) {
  const now = Date.now();
  const hits = (seen.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 500) seen.clear();          // crude ceiling on memory
  return hits.length > MAX_PER_WINDOW;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function clean(v) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);
}

const isEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Mail is niet geconfigureerd.' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (throttled(ip)) {
    return res.status(429).json({ error: 'Te veel aanvragen. Probeer het zo nog eens.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Ongeldige aanvraag.' });
  }

  // Honeypot: a real visitor never sees this field, so anything in it is a bot.
  // Answer 200 so the bot has no signal that it was caught.
  if (clean(body.website)) return res.status(200).json({ ok: true });

  const title  = clean(body.title) || 'Aanvraag via de website';
  const fields = Array.isArray(body.fields) ? body.fields.slice(0, MAX_FIELDS) : [];

  const rows = fields
    .map((f) => ({ label: clean(f && f.label), value: clean(f && f.value) }))
    .filter((f) => f.label && f.value);

  if (!rows.length) {
    return res.status(400).json({ error: 'Er is niets ingevuld om te versturen.' });
  }

  /* Replying to the notification should land in the visitor's inbox, so the
     café can just hit reply. The form states which address that is; if it
     didn't, fall back to the first address among the answers. */
  const stated = clean(body.replyTo);
  const replyTo = isEmail(stated)
    ? stated
    : rows.map((r) => r.value).filter(isEmail)[0];

  const text = [title, '', ...rows.map((r) => `${r.label}: ${r.value}`)].join('\n');

  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#26301D">
  <h2 style="color:#3E6B22;margin:0 0 16px">${esc(title)}</h2>
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    ${rows.map((r) => `<tr>
      <td style="padding:6px 18px 6px 0;color:#5A6650;vertical-align:top;white-space:nowrap">${esc(r.label)}</td>
      <td style="padding:6px 0"><strong>${esc(r.value)}</strong></td>
    </tr>`).join('')}
  </table>
  <p style="margin:22px 0 0;font-size:13px;color:#5A6650">
    Verstuurd via het formulier op cafe-united.com</p>
</div>`;

  try {
    const r = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        subject: `${title} — Café United`,
        text,
        html,
        ...(replyTo ? { reply_to: replyTo } : {})
      })
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('Resend rejected the message:', r.status, detail);
      return res.status(502).json({ error: 'De mail kon niet worden verstuurd.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Could not reach Resend:', err);
    return res.status(502).json({ error: 'De mail kon niet worden verstuurd.' });
  }
};

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}
