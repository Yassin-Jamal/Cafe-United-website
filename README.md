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
| `MAIL_FROM`      | `Café United <post@jouwdomein.nl>`        | aanbevolen |

`MAIL_FROM` moet een adres zijn op een domein dat in Resend geverifieerd is.
Zonder geverifieerd domein valt de functie terug op `onboarding@resend.dev`,
en dat adres levert alleen af op het e-mailadres van de Resend-account zelf.

Zet de sleutel nooit in de code — hij hoort alleen in Vercel te staan.
