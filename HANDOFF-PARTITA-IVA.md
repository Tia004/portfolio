# Dopo aver fatto partita IVA, leggi questo

> **Handoff operativo per l'agente (o per Tia)** — da leggere SOLO dopo che la Partita IVA
> è attiva e sono state configurate le credenziali Stripe. Fino ad allora il checkout è
> volutamente NON implementato: incassare servizi professionali in Italia senza P.IVA
> espone a sanzioni e problemi di fatturazione.

---

## 1. Contesto: cosa è stato fatto e cosa è rimandato

**Implementato ora (non richiede P.IVA — nessun incasso):**

- ✅ 5 nuovi servizi per siti esistenti nella sezione "Servizi": **Audit Gratuito, Performance & Velocità, Siti Multilingua, Chatbot & AI, Migrazione & Hosting** (riga `GROWTH_SERVICES` in `src/app/components/HomeShell.tsx`, con card BorderGlow che scrollano al form contatti con il servizio preselezionato).
- ✅ Opzioni aggiunte al dropdown `ServiceSelect` (stessa riga, costante `SERVICE_GROUPS` + chiavi `servizi.option_*` in `src/lib/translations.ts`).
- ✅ Badge **"Solo 2 slot liberi a {mese}"** nella sezione prezzi (chiave `prezzi.slots_note`, mese via `Intl.DateTimeFormat`).
- ✅ Sezione **"Perché scegliere un freelance"** (4 chips) in #chisono (chiavi `chisono.why_*`).
- ✅ **Programma referral** nel footer: "porta un cliente e ricevi il 10% di sconto sul prossimo progetto" (chiave `footer.referral`). È solo una promessa: lo sconto verrà applicato in fase di preventivo/fattura, non incassa nulla.

**Rimandato (richiede P.IVA + Stripe):**

- ❌ **"Compra subito" (Stripe Payment Links / Checkout)** sui prodotti a prezzo fisso.
- ❌ **Stripe Billing + Customer Portal** per i pacchetti mensili.
- ❌ Qualsiasi altra forma di incasso online diretto.

---

## 2. Perché Stripe è rimandato

1. **Fatturazione**: in Italia un servizio professionale va fatturato (fattura elettronica) con
   la propria P.IVA. Incassare senza P.IVA non consente di emettere fattura valida.
2. **Stripe richiede dati business**: al momento dell'onboarding chiede ragione sociale,
   partita IVA e coordinate bancarie; registrarsi come persona fisica senza P.IVA è possibile
   ma inadeguato per un'attività di servizi (e blocca strumenti come Stripe Tax/Billing a pieno regime).
3. **Recesso e termini**: le vendite B2C online sono soggette al **diritto di recesso UE di 14
   giorni**; senza termini di consegna/revisioni scritti si rischiano dispute e chargeback.
   Con la P.IVA attiva si definiscono anche questi (vedi §6).

---

## 3. Piano di collegamento Stripe (quando la P.IVA è attiva)

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

## 4. Regole di business da rispettare nel codice

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

## 5. Checklist di verifica finale (dopo l'implementazione)

- [ ] `npx tsc --noEmit` e `npm run build` verdi (build lancia anche l'audit traduzioni).
- [ ] Flusso di TEST end-to-end in modalità Stripe test: prodotto fisso → checkout → email di
      conferma al cliente → notifica a info@tiadesigns.it.
- [ ] Abbonamento mensile → `invoice.paid` → nessuna email duplicata al rinnovo.
- [ ] Il pulsante "Compra subito" NON appare sui prodotti custom.
- [ ] La pagina con checkout non peggiora LCP: verificare che lo script Stripe sia lazy.
- [ ] Audit Lighthouse mobile: confrontare LCP/CLS/TBT con la baseline (TBT ~170ms, CLS 0.001).

---

## 6. Note legali rapide (per Tia, non vincolanti)

- Aprire la P.IVA (Agenzia delle Entrate), scegliendo **regime forfettario** (se sotto la soglia
  di ~€85.000/anno) — niente IVA in fattura, tassazione agevolata.
- Per incassare online serve anche un **IBAN** dedicato o Stripe con payouts su conto corrente.
- Fattura elettronica tramite **SDI** (o intermediario come Stripe Tax/Fatture in Cloud).
- Il sito mostra già "P.IVA: in fase di configurazione" in qualche punto? Aggiornarlo con il
  numero reale appena disponibile (chiave `contatti.vat_invoice`).

---

*Scritto da Codebuff il 2026-08-27. File pensato per essere letto da un agente: le coordinate
dei file sono riferite al codice attuale (branch `main`).*
