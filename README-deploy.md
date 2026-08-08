# 🚀 Deploy su Vercel — Guida Completa

## Panoramica

Il portfolio ha **due canali di comunicazione** che funzionano indipendentemente:

| Canale | Dove | Backend |
|---|---|---|
| **🤖 AI Chatbot** | Sezione `#chatbot` (standalone nella pagina) | `POST /api/chat/ai` → Groq |
| **💬 Telegram Chat** | Widget fluttuante (basso destra) | `POST /api/chat` → Telegram Bot + SSE stream |

---

## Passo 1: Deploy su Vercel

### 1.1 Collega il repository

1. Vai su [vercel.com/new](https://vercel.com/new)
2. Importa il repository GitHub
3. Framework: **Next.js** (rilevato automaticamente)
4. **Non serve modificare** il `build command` — è già `prisma generate && next build`

### 1.2 Imposta le variabili d'ambiente

Su Vercel, vai in **Settings → Environment Variables** e aggiungi:

| Variabile | Valore | Obbligatoria per |
|---|---|---|
| `GROQ_API_KEY` | `gsk_...` | 🤖 AI Chatbot |
| `TELEGRAM_BOT_TOKEN` | ve lo dice @BotFather | 💬 Telegram Chat |
| `TELEGRAM_CHAT_ID` | `123456789` (il tuo ID) | 💬 Telegram Chat |
| `TELEGRAM_ADMIN_USER_ID` | ID numerico del tuo account Telegram | Comandi `/online`, `/offline`, `/status` in gruppi Telegram |
| `TELEGRAM_WEBHOOK_SECRET` | stringa casuale di almeno 32 caratteri | Autenticazione webhook Telegram |
| `CHAT_SESSION_SECRET` | stringa casuale di almeno 32 caratteri | Sessioni chat firmate |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | site key Cloudflare Turnstile | CAPTCHA invisibile client |
| `TURNSTILE_SECRET_KEY` | secret key Cloudflare Turnstile | Verifica CAPTCHA server |
| `UPSTASH_REDIS_REST_URL` | URL REST Upstash (raccomandato su Vercel) | Rate limit distribuito |
| `UPSTASH_REDIS_REST_TOKEN` | token REST Upstash | Rate limit distribuito |
| `CHAT_EDGE_PROVIDER` | `vercel` oppure `cloudflare` (se non viene rilevato automaticamente) | IP per rate limiting |
| `TURNSTILE_EXPECTED_HOSTNAME` | hostname del sito, opzionale ma raccomandato | Verifica CAPTCHA |
| `TURNSTILE_EXPECTED_ACTION` | `chat`, opzionale | Verifica CAPTCHA |

> In produzione configura sempre `TELEGRAM_WEBHOOK_SECRET`, `CHAT_SESSION_SECRET`, entrambe le chiavi Turnstile e, su Vercel/serverless, le variabili Upstash. Imposta `CHAT_EDGE_PROVIDER=vercel` o `cloudflare` quando il provider non viene rilevato automaticamente. Senza Turnstile le API chat e contatti rifiutano le richieste in produzione. In sviluppo il CAPTCHA può restare non configurato.
>
> `TELEGRAM_ADMIN_USER_ID` è obbligatoria quando `TELEGRAM_CHAT_ID` è un gruppo: solo quell'account può usare `/online`, `/offline` e `/status`. In una chat privata il `TELEGRAM_CHAT_ID` identifica già il destinatario autorizzato.
>
> La disponibilità usa la tabella Prisma `AvailabilitySetting`. Dopo il deploy applica la migration `prisma/migrations/20260801090000_add_availability/migration.sql` al database runtime tramite la pipeline di deploy (non basta eseguire `prisma generate`).
>
> **Come ottenere i token:**
> - **Groq**: [console.groq.com/keys](https://console.groq.com/keys)
> - **Telegram Bot Token**: parla con [@BotFather](https://t.me/BotFather) su Telegram, crea un bot e ottieni il token
> - **Telegram Chat ID**: dopo aver inviato almeno un messaggio al bot, visita:
>   ```
>   https://api.telegram.org/bot<TOKEN>/getUpdates
>   ```
>   e cerca `"chat":{"id":123456789,...}` nel JSON

### 1.3 Deploya

Dopo il deploy, otterrai un URL tipo:
```
https://tua-app.vercel.app
```

---

## Passo 2: Attivare il webhook di Telegram

Il webhook permette a Telegram di inoltrare le tue risposte al sito quando rispondi ai messaggi dei visitatori.

### 2.1 Esegui il setup (UNA SOLA VOLTA)

```bash
VERCEL_URL="https://tua-app.vercel.app" \
TELEGRAM_BOT_TOKEN="<il_tuo_token_da_BotFather>" \
TELEGRAM_WEBHOOK_SECRET="<la_stessa_stringa configurata su Vercel>" \
npm run deploy:setup-webhook
```

Sostituisci `https://tua-app.vercel.app` con il tuo dominio Vercel.

### 2.2 Verifica che il webhook sia attivo

```bash
TELEGRAM_BOT_TOKEN="<il_tuo_token_da_BotFather>" \
npm run deploy:check-webhook
```

Risposta attesa:
```json
{
  "ok": true,
  "result": {
    "url": "https://tua-app.vercel.app/api/chat/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

> **🔄 Dopo ogni nuovo deploy**, se l'URL cambia (es. preview branch), riesegui il comando `setup-webhook` con il nuovo URL.

---

## Passo 3: Flusso di lavoro

### 💬 Chat Telegram (widget fluttuante)

```
1. Visitatore scrive messaggio
                   ↓
2. POST /api/chat → TELEGRAM sendMessage
                   ↓
3. TU ricevi su Telegram il messaggio con:
     💬 Nuovo messaggio dalla chat
     📍 Milano, Italia
     🆔 sess_abc123
     📝 Testo del messaggio
                   ↓
4. RISPONDI al bot con "Reply" (cita il messaggio)
                   ↓
5. Telegram → webhook → chatStore → SSE stream
                   ↓
6. Widget chat mostra la tua risposta in tempo reale
```

### 🤖 AI Chatbot (sezione #chatbot)

```
Visitatore scrive → POST /api/chat/ai → verifica disponibilità → Groq → streaming token
```

Il chatbot AI è indipendente da Telegram, ma in produzione richiede anche sessioni firmate, Turnstile e rate limiting distribuito come indicato nelle variabili d'ambiente sopra. Quando lo stato è offline, l'endpoint non chiama alcun provider AI e restituisce solo un messaggio locale; il canale Telegram conserva invece i messaggi senza inoltrarli.


## Troubleshooting

### "La chat Telegram non invia messaggi"

1. Verifica che le variabili d'ambiente siano impostate **su Vercel** (non solo nel `.env` locale)
2. Verifica il webhook:
   ```bash
   TELEGRAM_BOT_TOKEN="..." npm run deploy:check-webhook
   ```
3. Prova a inviare un messaggio manualmente:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
     -H "Content-Type: application/json" \
     -d '{"chat_id":"<il_tuo_chat_id>","text":"Test da curl"}'
   ```

### "Il chatbot AI non risponde"

1. Verifica che `GROQ_API_KEY` sia impostata su Vercel
2. La chiave deve iniziare con `gsk_`
3. Prova l'endpoint direttamente:
   ```bash
   # In produzione usa una sessione/captcha emessi dal browser; questo è solo uno schema.
   curl -X POST "https://tua-app.vercel.app/api/chat/ai" \
     -H "Content-Type: application/json" \
     -H "Origin: https://tua-app.vercel.app" \
     -d '{"messages":[{"role":"user","content":"Ciao"}],"sessionId":"<sessione emessa dal browser>","captchaToken":"<token Turnstile>"}'
   ```

---

## Test in locale con ngrok

Prima di fare il deploy su Vercel, puoi testare il webhook Telegram **in locale** con un tunnel HTTPS pubblico.

### Prerequisiti

- **ngrok** installato globalmente (`brew install ngrok` oppure `npm install -g ngrok`)
- Il server Next.js in esecuzione su `localhost:3000`

### Esegui

```bash
npm run dev          # terminale 1: avvia Next.js
npm run webhook-local # terminale 2: avvia ngrok + setup webhook
```

Lo script:
1. Avvia un tunnel ngrok verso `localhost:3000`
2. Ottiene l'URL pubblico (es. `https://abc123.ngrok-free.app`)
3. Imposta il webhook di Telegram su quell'URL
4. Mostra lo stato del webhook
5. **Premi Ctrl+C** per fermare ngrok e rimuovere il webhook

### Cosa testare

1. Apri il sito sul telefono o un altro browser (usa l'URL ngrok)
2. Invia un messaggio dalla chat fluttuante
3. Verifica che arrivi su Telegram
4. Rispondi su Telegram con "Reply" al messaggio del bot
5. Controlla che la risposta appaia nella chat del sito (via SSE stream)

> **Nota:** Lo script rimuove automaticamente il webhook quando premi Ctrl+C, così il webhook di produzione (su Vercel) non viene sovrascritto.

---

## Riferimenti

- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Groq API](https://console.groq.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)
