/* ------------------------------------------------------------------
   /api/reserve — kerstdiner

   GET  → hoeveel plaatsen er per dag en per tijdslot nog vrij zijn
   POST → een aanvraag vastleggen en twee mails sturen via Resend

   Mail gebruikt dezelfde omgevingsvariabelen als /api/send
   (RESEND_API_KEY, MAIL_TO, MAIL_FROM).

   Het tellen van bezette plaatsen heeft opslag nodig die een serverless
   functie overleeft. Dat loopt via de REST-API van Vercel KV / Upstash
   Redis; zie TELLER hieronder. Staan die variabelen er niet, dan kan de
   site niet tellen: er wordt dan geen beschikbaarheid getoond en geen
   aanvraag geweigerd (liever niets beloven dan iets onwaars beloven).
   ------------------------------------------------------------------ */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/* Tijdsloten en capaciteit. Moet gelijk zijn aan KERST.shifts in
   assets/js/kerst-reservering.js — de server rekent zelf na. */
const DATUMS = ['2026-12-23', '2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27'];
const SHIFTS = [
  { id: 'shift-1', label: '14:00 – 16:30', plaatsen: 30 },
  { id: 'shift-2', label: '17:00 – 19:30', plaatsen: 30 },
  { id: 'shift-3', label: '20:00 – 21:30', plaatsen: 30 }
];

/* Vercel KV zet KV_REST_API_*; een losse Upstash-database UPSTASH_REDIS_*.
   Allebei dezelfde REST-API, dus allebei goed. */
const KV_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL   || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const TELLER_AAN = !!(KV_URL && KV_TOKEN);

const sleutel = (datum, shiftId) => `kerst:${datum}:${shiftId}`;

async function kv(pad) {
  const r = await fetch(`${KV_URL.replace(/\/$/, '')}/${pad}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: 'no-store'
  });
  if (!r.ok) throw new Error('KV ' + r.status + ': ' + (await r.text()).slice(0, 200));
  const data = await r.json();
  return data.result;
}

/* Hoeveel plaatsen zijn er al vergeven, per tijdslot, voor één datum. */
async function bezet(datum) {
  const uit = {};
  await Promise.all(SHIFTS.map(async (s) => {
    const v = await kv(`get/${encodeURIComponent(sleutel(datum, s.id))}`);
    uit[s.id] = Number(v) || 0;
  }));
  return uit;
}

/* Eerst ophogen, dan pas kijken of het paste: twee gasten die tegelijk
   boeken zouden bij "eerst lezen, dan schrijven" allebei door een laatste
   plaats heen glippen. Past het niet, dan draaien we het terug. */
async function reserveer(datum, shiftId, aantal, max) {
  const k = encodeURIComponent(sleutel(datum, shiftId));
  const na = Number(await kv(`incrby/${k}/${aantal}`));
  if (na > max) {
    await kv(`decrby/${k}/${aantal}`);
    return { ok: false, vrij: Math.max(0, max - (na - aantal)) };
  }
  return { ok: true, vrij: max - na };
}

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
/* Het tijdslot komt als tekst binnen ("17:00 – 19:30 (Vroege avond)"); we
   eisen alleen dat er iets staat en knippen het af in clean(). */
const isShift = (v) => v.length > 0;

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
  /* ---------- GET: beschikbaarheid ---------- */
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    if (!TELLER_AAN) {
      /* Welke namen we zochten en wat er gevonden is — alleen namen, nooit
         waarden. Zonder dit is "teller uit" niet te onderscheiden van
         "teller kapot" en zoek je je blind in de instellingen. */
      const gevonden = ['KV_REST_API_URL', 'KV_REST_API_TOKEN',
                        'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
                        'KV_URL', 'REDIS_URL']
        .filter((n) => !!process.env[n]);
      return res.status(200).json({
        tellerAan: false, shifts: SHIFTS, vrij: null,
        reden: 'geen REST-variabelen gevonden',
        gevondenNamen: gevonden
      });
    }
    try {
      const vrij = {};
      await Promise.all(DATUMS.map(async (d) => {
        const b = await bezet(d);
        vrij[d] = {};
        SHIFTS.forEach((s) => { vrij[d][s.id] = Math.max(0, s.plaatsen - b[s.id]); });
      }));
      return res.status(200).json({ tellerAan: true, shifts: SHIFTS, vrij });
    } catch (err) {
      console.error('Beschikbaarheid ophalen mislukt:', err.message);
      return res.status(200).json({
        tellerAan: false, shifts: SHIFTS, vrij: null,
        reden: 'verbinding met de teller mislukt',
        /* Geen token in de melding: alleen de status of het type fout. */
        fout: String(err.message).replace(/https?:\/\/[^\s]+/g, '[url]').slice(0, 120)
      });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
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
  const shift    = clean(body.shiftTekst);
  const menuNaam = clean(body.menuNaam);
  const personen = Number(body.personen);
  const kinderen = body.kinderen == null ? 0 : Number(body.kinderen);
  const prijsPP  = body.prijsPP == null ? null : Number(body.prijsPP);
  const prijsKind= body.prijsKind == null ? null : Number(body.prijsKind);

  const fouten = [];
  if (!naam) fouten.push('naam');
  if (!isEmail(email)) fouten.push('e-mailadres');
  if (telefoon.replace(/\D/g, '').length < 6) fouten.push('telefoonnummer');
  if (!Number.isFinite(personen) || personen < 1 || personen > 20) fouten.push('aantal personen');
  if (!Number.isFinite(kinderen) || kinderen < 0 || kinderen > personen) fouten.push('aantal kinderen');
  if (!isDatum(datum)) fouten.push('datum');
  if (!isShift(shift)) fouten.push('tijdslot');
  if (prijsPP !== null && (!Number.isFinite(prijsPP) || prijsPP < 0)) fouten.push('prijs');

  if (fouten.length) {
    return res.status(400).json({ error: 'Controleer: ' + fouten.join(', ') + '.' });
  }

  /* ---------- plaatsen vastleggen ---------- */
  /* Het tijdslot uit de browser mag niet bepalen hoeveel er past; we zoeken
     het slot op in onze eigen lijst en gebruiken díé capaciteit. */
  const shiftId = clean(body.shiftId);
  const slot = SHIFTS.filter((s) => s.id === shiftId)[0];
  if (!slot) return res.status(400).json({ error: 'Onbekend tijdslot.' });
  if (DATUMS.indexOf(datum) === -1) {
    return res.status(400).json({ error: 'Deze datum valt buiten het kerstdiner.' });
  }

  let geboekt = false;
  if (TELLER_AAN) {
    try {
      const uitslag = await reserveer(datum, slot.id, personen, slot.plaatsen);
      if (!uitslag.ok) {
        return res.status(409).json({
          error: uitslag.vrij === 0
            ? 'Dit tijdslot is helaas vol.'
            : 'Er zijn nog maar ' + uitslag.vrij + ' plaatsen vrij in dit tijdslot.',
          vrij: uitslag.vrij
        });
      }
      geboekt = true;
    } catch (err) {
      /* Teller onbereikbaar: de aanvraag toch doorlaten en mailen, want een
         gast weigeren om een storing aan onze kant is erger dan een telling
         die even niet klopt. Het team ziet de waarschuwing in de mail. */
      console.error('Plaatsen vastleggen mislukt:', err.message);
    }
  }

  const datumNet = clean(body.datumTekst) || datum;

  /* Zelf narekenen in plaats van het meegestuurde totaal vertrouwen: dat
     komt uit de browser en is daar aan te passen. */
  const kindTarief = prijsKind != null ? prijsKind : prijsPP;
  const totaal = prijsPP === null
    ? null : (personen - kinderen) * prijsPP + kinderen * kindTarief;
  const prijsTxt  = prijsPP === null ? 'nog niet bekend' : euro(prijsPP);
  const totaalTxt = totaal === null ? 'nog niet bekend' : euro(totaal);

  const wie = kinderen > 0
    ? `${personen} (${personen - kinderen} volw. + ${kinderen} kind${kinderen === 1 ? '' : 'eren'})`
    : String(personen);

  const rijen = [
    ['Naam', naam],
    ['E-mail', email],
    ['Telefoon', telefoon],
    ['Aantal personen', wie],
    ['Datum', datumNet],
    ['Tijdslot', shift],
    ['Menu', menuNaam || 'nog niet ingesteld'],
    ['Prijs p.p.', prijsTxt]
  ];
  if (kinderen > 0 && prijsKind != null) rijen.push(['Per kind', euro(prijsKind)]);
  rijen.push(['Totaal', totaalTxt]);
  if (opmerking) rijen.push(['Opmerking', opmerking]);
  /* Capaciteit meesturen zodat het team zelf kan tellen — de site houdt
     niet bij hoeveel plaatsen er al vergeven zijn. */
  rijen.push(['Plaatsen in dit slot', String(slot.plaatsen)]);
  if (!TELLER_AAN) {
    rijen.push(['LET OP', 'de site telt niet mee — capaciteit niet bewaakt']);
  } else if (!geboekt) {
    rijen.push(['LET OP', 'teller was onbereikbaar — deze plaatsen zijn niet afgeboekt']);
  }

  const naarZaakText = ['Nieuwe kerstdiner-aanvraag via de website', '']
    .concat(rijen.map((r) => r[0] + ': ' + r[1])).join('\n');

  const naarZaakHtml = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#26301D">
  <h2 style="color:#A4161A;margin:0 0 4px">Nieuwe kerstdiner-aanvraag</h2>
  <p style="margin:0 0 18px;color:#5A6650">${esc(datumNet)} · ${esc(shift)} · ${esc(wie)}</p>
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
    'Tijdslot: ' + shift,
    'Aantal personen: ' + wie,
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
    ['Tijdslot', shift],
    ['Aantal personen', wie],
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
    /* De plaatsen weer vrijgeven: de zaak heeft de aanvraag niet gekregen,
       dus die stoelen zijn niet echt bezet. Zonder dit lopen de tijdsloten
       vol met reserveringen die niemand ooit gezien heeft. */
    if (geboekt) {
      try {
        await kv(`decrby/${encodeURIComponent(sleutel(datum, slot.id))}/${personen}`);
      } catch (e2) {
        console.error('Plaatsen teruggeven mislukt — telling staat ' + personen +
                      ' te hoog op ' + datum + ' ' + slot.id + ':', e2.message);
      }
    }
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
