| `MAIL_FROM`      | `Café United <forms@mail.permaflare.com>` (default) | nee |

De afzender staat vast op `forms@mail.permaflare.com`; dat subdomein moet in
Resend geverifieerd zijn, anders weigert Resend de mail. `reply_to` wijst naar
het e-mailadres dat de bezoeker invulde, dus antwoorden gaat met "beantwoorden"
rechtstreeks naar de gast.# Café United — website

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
| `MAIL_FROM`      | `Café United <forms@mail.permaflare.com>` (default) | nee |

De afzender is `forms@mail.permaflare.com`. Dat subdomein moet in Resend
geverifieerd zijn (SPF/DKIM), anders weigert Resend de mail.

`reply_to` wordt gezet op het e-mailadres dat de bezoeker invulde, dus
"beantwoorden" in Gmail gaat rechtstreeks naar de gast.

Zet de sleutel nooit in de code — hij hoort alleen in Vercel te staan.
