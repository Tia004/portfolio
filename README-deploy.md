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
Visitatore scrive → POST /api/chat/ai → Groq → streaming token
```

Il chatbot AI è indipendente — funziona senza Telegram e non richiede configurazioni extra oltre alla `GROQ_API_KEY`.


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
   curl -X POST "https://tua-app.vercel.app/api/chat/ai" \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Ciao"}]}'
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
