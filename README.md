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

Zwevende knop rechtsonder op elke pagina, die een popup in dezelfde hoek
opent. Bestaat uit drie bestanden:

- `assets/js/kerst-reservering.js` — alle instellingen staan bovenaan in
  het object `KERST`: datums, tijdsloten, menu's, prijzen, landnummers,
  de privacylink en welke sfeer-onderdelen aan staan.
- `assets/css/kerst-reservering.css` — de opmaak.
- `api/reserve.js` — `POST` neemt een aanvraag aan en stuurt twee mails via
  Resend (naar de zaak en een bevestiging naar de gast). Gebruikt dezelfde
  `RESEND_API_KEY`, `MAIL_TO` en `MAIL_FROM` als `/api/send`.

Er hoort **één menu per datum**. Staan er twee menu's op dezelfde dag, dan
meldt de console dat en wordt alleen het eerste gebruikt.

### Aanvraag, geen directe boeking

De site houdt geen plaatsen bij en wijst niets af. Elke aanvraag gaat per mail
naar de zaak, die zelf antwoordt; onder de knop staat dat de reservering pas
officieel is zodra de zaak heeft geantwoord. Er is dus geen database nodig.

Drie tijdsloten van twee uur, ingesteld in `KERST.shifts` (frontend) en in
`SHIFTS` bovenaan `api/reserve.js` (server, die rekent zelf na). Houd die twee
gelijk — de server gebruikt altijd zijn eigen lijst.

### Kerstsfeer

Lint bovenaan, sneeuw, kerstlogo, badge in de hero, sneeuwrand op de footer en
het blok op de homepage. Staat in `KERST.sfeer`, per onderdeel uit te zetten.

Alles verdwijnt vanzelf na de datum in `KERST.toonTot`. **Het hele
kerstonderdeel weghalen:** de twee regels per pagina, de drie bestanden
hierboven en `assets/img/logo-kerst.png` plus `assets/img/kerstmenu.jpg`.
`styles.css`, `main.js` en de pagina-inhoud zijn voor kerst niet gewijzigd.
