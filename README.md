# Café United — website

Statische site (HTML/CSS/JS, geen build) met één serverless functie voor het
versturen van formulieren.

## Lokaal bekijken

```
powershell -NoProfile -ExecutionPolicy Bypass -File devserver.ps1
```

Of, met Node geïnstalleerd: `node devserver.js`. Beide serveren op
http://localhost:4173.

Let op: deze servers serveren alleen bestanden. `/api/send` werkt er niet —
formulieren vallen lokaal terug op de WhatsApp/e-mail-knoppen. Wil je de mail
lokaal testen, gebruik dan `vercel dev` (vereist Node en de Vercel CLI).

## Formulieren

De drie formulieren (contact, reserveren, vacatures) posten naar
`/api/send`. Die functie stuurt de inhoud via Resend door naar de mailbox
van het café. Lukt dat niet, dan krijgt de bezoeker alsnog knoppen om het
bericht via WhatsApp of e-mail te sturen.

## Instellen in Vercel

Zet deze environment variables in **Settings → Environment Variables**:

| Naam             | Waarde                                    | Verplicht |
| ---------------- | ----------------------------------------- | --------- |
| `RESEND_API_KEY` | API-sleutel uit resend.com                | ja        |
| `MAIL_TO`        | `cafeunitedrotterdam@gmail.com` (default) | nee       |
| `MAIL_FROM`      | `Café United <forms@mail.permyron.com>` (default) | nee |

De afzender is `forms@mail.permyron.com`. Dat subdomein moet in Resend
geverifieerd zijn (SPF/DKIM), anders weigert Resend de mail.

`reply_to` wordt gezet op het e-mailadres dat de bezoeker invulde, dus
"beantwoorden" in Gmail gaat rechtstreeks naar de gast.

Zet de sleutel nooit in de code — hij hoort alleen in Vercel te staan.

## Kerstdiner-reservering

Zwevende knop rechtsonder op elke pagina, met een paneel dat van rechts
inschuift. Bestaat uit drie bestanden:

- `assets/js/kerst-reservering.js` — alle instellingen staan bovenaan in
  het object `KERST`: datums, menu's, prijzen, openingstijden,
  reserveringstijden, landnummers en de privacylink.
- `assets/css/kerst-reservering.css` — de opmaak.
- `api/reserve.js` — endpoint dat twee mails stuurt via Resend (naar de
  zaak en een bevestiging naar de gast). Gebruikt dezelfde
  `RESEND_API_KEY`, `MAIL_TO` en `MAIL_FROM` als `/api/send`.

Er hoort **één menu per datum**. Staan er twee menu's op dezelfde dag, dan
meldt de console dat en wordt alleen het eerste gebruikt.

De knop verdwijnt vanzelf na de datum in `KERST.toonTot`. Het hele
onderdeel weghalen: de twee regels per pagina verwijderen plus de drie
bestanden hierboven.
