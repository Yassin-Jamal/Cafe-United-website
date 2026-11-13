/* ------------------------------------------------------------------
   POST /api/reserve — kerstdiner-aanvraag

   Stuurt twee mails via Resend: één naar de zaak met alle gegevens, en
   een bevestiging naar de gast. Gebruikt dezelfde omgevingsvariabelen
   als /api/send (RESEND_API_KEY, MAIL_TO, MAIL_FROM), zodat er maar één
   plek is waar de mailinstellingen staan.
   ------------------------------------------------------------------ */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const TO   = process.env.MAIL_TO   || 'cafeunitedrotterdam@gmail.com';
const FROM = process.env.MAIL_FROM || 'Café United <forms@mail.permyron.com>';

const ZAAK = {
  naam:    'Café United',
  adres:   'Bergweg 199A, 3037 EJ Rotterdam',
  telefoon:'06 16 05 01 92',
  site:    'cafe-united.com'
};

const MAX_LEN = 2000;

/* Best-effort beveiliging. Serverless instanties komen en gaan, dus dit
   houdt het grove werk tegen, geen vastberaden aanvaller. */
const seen = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;

function throttled(ip) {
  const now = Date.now();
  const hits = (seen.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 500) seen.clear();
  return hits.length > MAX_PER_WINDOW;
}

/* Dubbele inzendingen: dezelfde aanvraagId binnen het kwartier is een
   herhaling (dubbelklik, herstelde verbinding) en wordt niet nog eens
   gemaild. De gast krijgt wel gewoon "gelukt" terug. */
const recent = new Map();
const DUP_MS = 15 * 60 * 1000;

function duplicaat(id) {
  if (!id) return false;
  const now = Date.now();
  for (const [k, t] of recent) if (now - t > DUP_MS) recent.delete(k);
  if (recent.has(id)) return true;
  recent.set(id, now);
  if (recent.size > 500) recent.clear();
  return false;
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
const isDatum = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTijd  = (v) => /^\d{2}:\d{2}$/.test(v);

function euro(bedrag) {
  return '€ ' + Number(bedrag).toFixed(2).replace('.', ',');
}

function regelsHtml(rijen) {
  return rijen.map((r) => `<tr>
    <td style="padding:6px 18px 6px 0;color:#5A6650;vertical-align:top;white-space:nowrap">${esc(r[0])}</td>
    <td style="padding:6px 0"><strong>${esc(r[1])}</strong></td>
  </tr>`).join('');
}

async function stuur(payload) {
  const r = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error('Resend ' + r.status + ': ' + detail.slice(0, 300));
  }
  return r.json().catch(() => ({}));
}

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

  // Honeypot: alleen bots vullen dit. 200 terug, zodat ze niets leren.
  if (clean(body.website)) return res.status(200).json({ ok: true });

  if (duplicaat(clean(body.aanvraagId))) {
    return res.status(200).json({ ok: true, duplicaat: true });
  }

  /* Alles opnieuw controleren: wat de browser stuurt is niet te vertrouwen. */
  const naam     = clean(body.naam);
  const email    = clean(body.email);
  const telefoon = clean(body.telefoon);
  const opmerking= clean(body.opmerking);
  const datum    = clean(body.datum);
  const tijd     = clean(body.tijd);
  const menuNaam = clean(body.menuNaam);
  const personen = Number(body.personen);
  const prijsPP  = body.prijsPP == null ? null : Number(body.prijsPP);

  const fouten = [];
  if (!naam) fouten.push('naam');
  if (!isEmail(email)) fouten.push('e-mailadres');
  if (telefoon.replace(/\D/g, '').length < 6) fouten.push('telefoonnummer');
  if (!Number.isFinite(personen) || personen < 1 || personen > 20) fouten.push('aantal personen');
  if (!isDatum(datum)) fouten.push('datum');
  if (!isTijd(tijd)) fouten.push('tijd');
  if (prijsPP !== null && (!Number.isFinite(prijsPP) || prijsPP < 0)) fouten.push('prijs');

  if (fouten.length) {
    return res.status(400).json({ error: 'Controleer: ' + fouten.join(', ') + '.' });
  }

  const datumNet = clean(body.datumTekst) || datum;
  const tijdNet  = tijd + (body.naMiddernacht ? ' (na middernacht)' : '');
  const totaal   = prijsPP === null ? null : prijsPP * personen;
  const prijsTxt = prijsPP === null ? 'nog niet bekend' : euro(prijsPP);
  const totaalTxt= totaal === null ? 'nog niet bekend' : euro(totaal);

  const rijen = [
    ['Naam', naam],
    ['E-mail', email],
    ['Telefoon', telefoon],
    ['Aantal personen', String(personen)],
    ['Datum', datumNet],
    ['Tijd', tijdNet],
    ['Menu', menuNaam || 'nog niet ingesteld'],
    ['Prijs p.p.', prijsTxt],
    ['Totaal', totaalTxt]
  ];
  if (opmerking) rijen.push(['Opmerking', opmerking]);

  const naarZaakText = ['Nieuwe kerstdiner-aanvraag via de website', '']
    .concat(rijen.map((r) => r[0] + ': ' + r[1])).join('\n');

  const naarZaakHtml = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#26301D">
  <h2 style="color:#A4161A;margin:0 0 4px">Nieuwe kerstdiner-aanvraag</h2>
  <p style="margin:0 0 18px;color:#5A6650">${esc(datumNet)} om ${esc(tijdNet)} · ${esc(String(personen))} personen</p>
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse">${regelsHtml(rijen)}</table>
  <p style="margin:22px 0 0;font-size:13px;color:#5A6650">
    Beantwoorden gaat rechtstreeks naar ${esc(email)}.</p>
</div>`;

  const naarGastText = [
    'Beste ' + naam + ',',
    '',
    'Bedankt voor je aanvraag voor het kerstdiner bij ' + ZAAK.naam + '.',
    'Dit is nog geen bevestigde reservering: we nemen hem door en laten zo snel',
    'mogelijk weten of het rondkomt.',
    '',
    'Datum: ' + datumNet,
    'Tijd: ' + tijdNet,
    'Aantal personen: ' + personen,
    'Menu: ' + (menuNaam || 'nog niet ingesteld'),
    'Totaal: ' + totaalTxt,
    '',
    ZAAK.naam,
    ZAAK.adres,
    ZAAK.telefoon,
    ZAAK.site
  ].join('\n');

  const naarGastHtml = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#26301D">
  <h2 style="color:#A4161A;margin:0 0 14px">Bedankt, ${esc(naam.split(' ')[0])}!</h2>
  <p style="margin:0 0 16px">We hebben je aanvraag voor het kerstdiner ontvangen.
    <strong>Dit is nog geen bevestigde reservering</strong> — we nemen hem door en laten zo snel
    mogelijk weten of het rondkomt.</p>
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse">${regelsHtml([
    ['Datum', datumNet],
    ['Tijd', tijdNet],
    ['Aantal personen', String(personen)],
    ['Menu', menuNaam || 'nog niet ingesteld'],
    ['Totaal', totaalTxt]
  ])}</table>
  <p style="margin:22px 0 0;font-size:14px;color:#5A6650">
    ${esc(ZAAK.naam)}<br>${esc(ZAAK.adres)}<br>${esc(ZAAK.telefoon)}<br>${esc(ZAAK.site)}</p>
</div>`;

  /* De mail naar de zaak is de belangrijkste: lukt die niet, dan is de
     aanvraag niet aangekomen en moet de gast dat weten. De bevestiging
     naar de gast is prettig maar niet kritiek, dus die mag stilletjes
     mislukken zonder de hele aanvraag af te keuren. */
  try {
    await stuur({
      from: FROM,
      to: [TO],
      subject: `Nieuwe kerstdiner-reservering – ${naam}`,
      text: naarZaakText,
      html: naarZaakHtml,
      reply_to: email
    });
  } catch (err) {
    console.error('Mail naar de zaak mislukt:', err.message);
    return res.status(502).json({ error: 'De aanvraag kon niet worden verstuurd.' });
  }

  let bevestigd = true;
  try {
    await stuur({
      from: FROM,
      to: [email],
      subject: `Je aanvraag voor het kerstdiner – ${ZAAK.naam}`,
      text: naarGastText,
      html: naarGastHtml
    });
  } catch (err) {
    bevestigd = false;
    console.error('Bevestiging naar de gast mislukt:', err.message);
  }

  return res.status(200).json({ ok: true, bevestigingVerstuurd: bevestigd });
};

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}
