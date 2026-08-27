# Dopo aver fatto partita IVA, leggi questo

> **Handoff operativo per l'agente (o per Tia)** — da leggere SOLO dopo che la Partita IVA
> è attiva e sono state configurate le credenziali Stripe. Fino ad allora il checkout è
> volutamente NON implementato: incassare servizi professionali in Italia senza P.IVA
> espone a sanzioni e problemi di fatturazione.
> Nota: la parte **Cal.com** (call conoscitiva + badge slot) NON richiede P.IVA — è già
> implementata o pianificata al §2 e va fatta appena l'account Cal.com esiste.

---

## 1. Contesto: cosa è stato fatto e cosa è rimandato

**Implementato ora (non richiede P.IVA — nessun incasso):**

- ✅ 5 nuovi servizi per siti esistenti nella sezione "Servizi": **Audit Gratuito, Performance & Velocità, Siti Multilingua, Chatbot & AI, Migrazione & Hosting** (riga `GROWTH_SERVICES` in `src/app/components/HomeShell.tsx`, con card BorderGlow che scrollano al form contatti con il servizio preselezionato).
- ✅ Opzioni aggiunte al dropdown `ServiceSelect` (stessa riga, costante `SERVICE_GROUPS` + chiavi `servizi.option_*` in `src/lib/translations.ts`).
- ✅ Badge **"Solo 2 slot liberi a {mese}"** nella sezione prezzi (chiave `prezzi.slots_note`, mese via `Intl.DateTimeFormat`) — **hardcoded oggi**, da collegare all'API Cal.com (vedi §2).
- ✅ **Embed Cal.com "Prenota una call conoscitiva gratuita"** nella sezione contatti: costante `CAL_COM_BASE_URL` + iframe lazy in `src/app/components/HomeShell.tsx`, testi `contatti.call_*` in `src/lib/translations.ts` (IT/EN/ES). L'URL è un placeholder finché l'account Cal.com non esiste.
- ✅ Sezione **"Perché scegliere un freelance"** (4 chips) in #chisono (chiavi `chisono.why_*`).
- ✅ **Programma referral** nel footer: "porta un cliente e ricevi il 10% di sconto sul prossimo progetto" (chiave `footer.referral`). È solo una promessa: lo sconto verrà applicato in fase di preventivo/fattura, non incassa nulla.

**Rimandato (richiede P.IVA + Stripe):**

- ❌ **"Compra subito" (Stripe Payment Links / Checkout)** sui prodotti a prezzo fisso.
- ❌ **Stripe Billing + Customer Portal** per i pacchetti mensili.
- ❌ Qualsiasi altra forma di incasso online diretto.

---

## 2. Il funnel completo: badge slot → call conoscitiva → preventivo → acquisto

Il sito ha già il **primo 60% di questo funnel implementato** (nessun incasso → nessuna
P.IVA necessaria). Manca solo il collegamento dei due estremi: il badge slot reale
(Cal.com) e l'acquisto (Stripe, dopo P.IVA).

```
badge "X slot liberi" (API Cal.com) → call conoscitiva (embed Cal.com) → preventivo (chatbot / form) → acquisto (Stripe)
```

### Già implementato (oggi, senza P.IVA)

1. **Call conoscitiva — embed Cal.com** nella sezione contatti.
   - Costante **`CAL_COM_BASE_URL`** in `src/app/components/HomeShell.tsx` (~riga 180): oggi
     placeholder `https://cal.com/tiadesigns/consulenza`. Quando l'account Cal.com esisterà,
     sostituire con l'URL reale dell'evento (nessun account ancora creato).
   - Card full-width in stile BorderGlow sotto la griglia form+info (HomeShell ~riga 3590):
     iframe con `?embed=true&theme=dark&cal-lang=<lang>`, `loading="lazy"` — si carica solo
     quando la sezione contatti entra nel viewport, mai sul critical path.
   - Testi localizzati IT/EN/ES: `contatti.call_label`, `contatti.call_title`,
     `contatti.call_subtitle` in `src/lib/translations.ts`.
2. **Preventivo** — già funzionante a pieno regime: chatbot (chat → riepilogo → email Aruba
   SMTP via `src/app/api/contact/route.ts`) e form contatti con `ServiceSelect`.

### Badge slot reale — implementato (basta l'account Cal.com per attivarlo)

3. **Badge slot** — ora fa un fetch a `GET /api/availability/slots` e mostra il numero
   reale ("Solo {count} slot liberi a {month}", singolare/plurale localizzati). Se Cal.com
   non è configurato o è irraggiungibile, la route risponde `{ count: null, fallback: true }`
   e il badge mostra il testo statico di sempre ("Solo 2 slot liberi a {month}").
   - **Route API**: `src/app/api/availability/slots/route.ts` → `src/lib/cal-slots.ts`.
     Conta gli slot del mese corrente dall'evento consulenza via **API v2** (la v1 è stata
     spenta l'8/4/2026):
     `GET https://api.cal.com/v2/slots?eventTypeId=<id>&start=YYYY-MM-01&end=YYYY-MM-DD&timeZone=Europe/Rome`
     con header `Authorization: Bearer <token>` e `cal-api-version: 2024-09-04`. La risposta
     è una mappa `data[data] = [{ start }, ...]`: il conteggio è la somma degli slot di tutte
     le date. Identifica l'evento con `CAL_COM_EVENT_TYPE_ID` oppure con
     `CAL_COM_EVENT_SLUG` + `CAL_COM_USERNAME` (es. `consulenza` / `tiadesigns`).
   - **Cache**: in-memory con TTL 5 minuti in `cal-slots.ts` (stesso pattern del fallback
     "last known" di `/api/availability`). Il client rifetcha ogni 5 minuti.
   - **Webhook di invalidazione**: `POST /api/cal/webhook` → `invalidateSlotsCache()`.
     Configura in Cal.com (Settings → Developer → Webhooks): subscriber URL
     `https://tiadesigns.it/api/cal/webhook`, trigger **Booking Created/Cancelled/
     Rescheduled/Requested/Rejected**, e imposta lo **stesso** secret di
     `CAL_COM_WEBHOOK_SECRET` (la firma `X-Cal-Signature-256` è HMAC-SHA256 del body grezzo;
     la route la verifica con `timingSafeEqual`). Quando l'account esisterà, il numero
     scende da solo dopo ogni prenotazione.
   - **Env (solo server, mai esposta al client)**: `CAL_COM_API_KEY`, `CAL_COM_EVENT_TYPE_ID`
     (o `CAL_COM_EVENT_SLUG` + `CAL_COM_USERNAME`), `CAL_COM_WEBHOOK_SECRET` — già aggiunte
     al `.env` locale con placeholder, da replicare su Vercel.

### Collegamento con Stripe (dopo P.IVA — vedi §4)

4. **Acquisto** — per i prodotti a prezzo fisso il flusso diventa: call conoscitiva →
   preventivo (chatbot) → **"Compra subito"** (Stripe Payment Link, §4) → webhook
   `checkout.session.completed` → email di conferma (riusa SMTP Aruba). Per i pack mensili:
   Stripe Billing + Customer Portal.

Il punto di contatto nel codice per tutto il funnel è **`HomeShell.tsx`**: `PriceCard`
(bottone "Compra subito" accanto al CTA preventivo, §4), `CAL_COM_BASE_URL` (call) e la riga
che formatta `slots_note` (badge). Le tre card esistono già — nessun nuovo layout necessario.

---

## 3. Perché Stripe è rimandato

1. **Fatturazione**: in Italia un servizio professionale va fatturato (fattura elettronica) con
   la propria P.IVA. Incassare senza P.IVA non consente di emettere fattura valida.
2. **Stripe richiede dati business**: al momento dell'onboarding chiede ragione sociale,
   partita IVA e coordinate bancarie; registrarsi come persona fisica senza P.IVA è possibile
   ma inadeguato per un'attività di servizi (e blocca strumenti come Stripe Tax/Billing a pieno regime).
3. **Recesso e termini**: le vendite B2C online sono soggette al **diritto di recesso UE di 14
   giorni**; senza termini di consegna/revisioni scritti si rischiano dispute e chargeback.
   Con la P.IVA attiva si definiscono anche questi (vedi §7).

---

## 4. Piano di collegamento Stripe (quando la P.IVA è attiva)

### Architettura consigliata (la più semplice possibile)

| Caso | Strumento | Perché |
|---|---|---|
| Prodotti fissi una tantum (post, pack social, mini-sito vetrina) | **Stripe Payment Links** (o Checkout Session via API) | Zero backend: basta un redirect all'URL del Payment Link |
| Pacchetti mensili (collaborazioni) | **Stripe Billing** (Checkout Session con `mode: 'subscription'`) | Ricorrenza gestita da Stripe |
| Gestione abbonamento del cliente | **Customer Portal** (`billing_portal.session.create`) | Il cliente cambia carta/annulla da solo |
| Ricevute/conferma ordine | **Webhook** `checkout.session.completed` → invio email (riusa il sistema SMTP Aruba già in uso in `src/app/api/contact/route.ts`) | Automazione post-pagamento |
| Klarna (paga in 3 rate) | Attivare **Klarna** nel Dashboard Stripe (Italia supportata) | Metodo richiesto dall'utente |

### Punti di integrazione nel codice (già mappati)

1. **Dove va il bottone "Compra subito"**: in `src/app/components/HomeShell.tsx` dentro il
   componente `PriceCard` — accanto al bottone CTA "Richiedi preventivo" (chiave `prezzi.cta`).
   Solo per i prodotti contrassegnati come acquistabili: aggiungere un campo
   `instantBuy?: boolean` ai tier nei dati prezzi.
2. **Dati prezzi**: `PRICING_ONETIME_BY_LANG` e `PRICING_MONTHLY_BY_LANG` in
   `src/lib/translations.ts` (oggi un prezzo è una stringa tipo `'1.200'`; il `PriceCard` fa
   `parseInt(price.replace(/[.,]/g, ''), 10)`). Per il checkout servono i **prezzi esatti in
   centesimi** lato server — non derivare l'importo dal client.
3. **Route API da creare**:
   - `src/app/api/stripe/checkout/route.ts` → riceve `{ priceId, customerEmail }`, crea la
     Checkout Session (o restituisce il Payment Link), risponde con `{ url }`; il frontend fa
     `window.location.href = url`.
   - `src/app/api/stripe/webhook/route.ts` → verifica la firma con `STRIPE_WEBHOOK_SECRET`,
     gestisce `checkout.session.completed` e `invoice.paid` (rinnovi mensili) → invia l'email
     di conferma al cliente e una notifica a info@tiadesigns.it.
   - Eventualmente `src/app/api/stripe/portal/route.ts` → `billing_portal.session.create`
     per il link "Gestisci abbonamento".
4. **Caricamento dello script Stripe.js**: NON importarlo a livello globale. Solo la pagina
   con checkout deve caricare `https://js.stripe.com/v3/` (dynamic import o Payment Links
   senza JS Stripe — i Payment Links non richiedono affatto lo script, è il motivo per cui
   sono la scelta migliore).

### Variabili d'ambiente (da mettere su Vercel)

```
STRIPE_SECRET_KEY=sk_test_...            # prima in test, poi sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

- Per testare i webhook in locale: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
  (o usare `stripe trigger checkout.session.completed`).
- MAI esporre `sk_live_...` nel codice client o nel .env committato.

---

## 5. Regole di business da rispettare nel codice

1. **Solo prodotti a scope inequivocabile** hanno il pulsante "Compra subito". I servizi
   custom (sito web/app/software su misura) mantengono SOLO il flusso preventivo — una
   vendita istantanea senza raccolta requisiti genera dispute.
2. **Termini chiari sulla card**: "consegna in X giorni lavorativi, 2 revisioni incluse,
   file in formato Y" — visibili prima del pagamento.
3. **Recesso 14 giorni** per i consumatori B2C: la policy va esposta (es. nella modale
   Termini e Condizioni esistente) e, se applicabile, gestita come rimborso.
4. **IVA**: se regime **forfettario** → nessuna IVA in fattura, ma il prezzo esposto è
   comprensivo di tutto; se regime **ordinario** → applicare IVA 22% al momento del pagamento
   (Stripe Tax può calcolarla automaticamente). Allineare il testo della nota IVA attuale
   (`prezzi.vat_note`) al regime effettivo.
5. **Referral**: il 10% di sconto NON va applicato lato Stripe (i prezzi sono già netti);
   va emesso come nota di credito o applicato nel preventivo prima della fattura.

---

## 6. Checklist di verifica finale (dopo l'implementazione)

- [ ] `npx tsc --noEmit` e `npm run build` verdi (build lancia anche l'audit traduzioni).
- [ ] Flusso di TEST end-to-end in modalità Stripe test: prodotto fisso → checkout → email di
      conferma al cliente → notifica a info@tiadesigns.it.
- [ ] Abbonamento mensile → `invoice.paid` → nessuna email duplicata al rinnovo.
- [ ] Il pulsante "Compra subito" NON appare sui prodotti custom.
- [ ] La pagina con checkout non peggiora LCP: verificare che lo script Stripe sia lazy.
- [ ] Audit Lighthouse mobile: confrontare LCP/CLS/TBT con la baseline (TBT ~170ms, CLS 0.001).
- [ ] Account Cal.com creato e `CAL_COM_BASE_URL` aggiornato con l'URL reale (oggi placeholder).
- [ ] Badge slot collegato all'API Cal.com con fallback statico e webhook `BOOKING_CREATED` funzionante (il numero scende dopo una prenotazione).
- [ ] Test end-to-end funnel: badge slot → prenotazione call → email a info@tiadesigns.it → badge decrementato.

---

## 8. Modulo Fatturazione Elettronica & Ricevute di Acconto (Automatica da Preventivo Accettato)

> **Richiede Partita IVA attiva:** In Italia l'emissione di fatture elettroniche (tramite SDI) o ricevute fiscali aziendali richiede obbligatoriamente il numero di Partita IVA e l'iscrizione al regime fiscale (es. Forfettario). Senza P.IVA è possibile emettere solo ricevute per prestazione occasionale con ritenuta d'acconto.

### Flusso di Automazione Preventivo → Fattura:

Quando nella dashboard `/loginmaster/dashboard` un preventivo passa allo stato **`accepted`** (o quando il cliente accetta e firma online):

```
Preventivo (Stato: Accettato) 
  ↳ 1. Calcolo Acconto (es. 50% = quota avvio lavori)
  ↳ 2. Chiamata API Fatturazione (Fatture in Cloud / Aruba / Stripe Invoicing)
  ↳ 3. Generazione automatica Fattura Elettronica SDI + PDF di cortesia
  ↳ 4. Invio email automatico al cliente con link di pagamento / IBAN e PDF allegato
  ↳ 5. Notifica di conferma a info@tiadesigns.it
```

### Servizi Consigliati per il Collegamento API:

| Provider | Perché | Tipo Integrazione |
|---|---|---|
| **Fatture in Cloud API v2** (Consigliato per Italia) | Gestisce SDI, fatture elettroniche, regime forfettario, marca da bollo virtuale 2€ in automatico | REST API via webhook (`POST /api/master/invoices/create`) |
| **Stripe Invoicing** | Integrato nativamente se si usa Stripe per pagamenti con carta/Klarna | Stripe SDK (`stripe.invoices.create`) |
| **Aruba Fatturazione Elettronica API** | Economico e diffuso in Italia | REST API |

### Endpoint e Variabili da Aggiungere:

```env
# Fatturazione Elettronica (da attivare dopo apertura P.IVA)
FATTURE_IN_CLOUD_API_KEY="fic_api_..."
FATTURE_IN_CLOUD_COMPANY_ID="123456"
# oppure
STRIPE_AUTO_INVOICING="true"
```

### Route API da creare nel progetto:
- `src/app/api/master/invoices/create/route.ts` → Prende l'ID del preventivo accettato (`quoteId`), estrae i dati anagrafici e le voci, calcola l'acconto (es. 50%) e genera la fattura tramite API.
- Aggiorna il modello `Quote` con i campi `invoiceId`, `invoiceNumber`, `invoicePdfUrl`.

---

## 9. Note legali rapide (per Tia, non vincolanti)

- Aprire la P.IVA (Agenzia delle Entrate), scegliendo **regime forfettario** (se sotto la soglia di ~€85.000/anno) — niente IVA in fattura, tassazione agevolata (5% per i primi 5 anni).
- Per incassare online serve anche un **IBAN** dedicato o Stripe con payouts su conto corrente.
- Fattura elettronica tramite **SDI** (o intermediario come Fatture in Cloud).
- In regime forfettario, per importi superiori a €77,47 si applica la **marca da bollo da €2,00** (gestibile in automatico con assolvimento virtuale del bollo).
- Il sito mostra già "P.IVA: in fase di configurazione" in qualche punto? Aggiornarlo con il numero reale appena disponibile (chiave `contatti.vat_invoice`).

---

*Aggiornato il 2026-08-27 con le specifiche per Preventivi, Firme Digitali e Fatturazione Automatica.*
