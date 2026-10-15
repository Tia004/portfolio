# Logo e invii multipli — 15 ottobre 2026

## Correzione

Il compositore Gmail, il template condiviso e i trasporti usano sempre l'URL pubblico invariato `https://tiadesigns.it/TiaDesignsLogo-white.png`. Le bozze con `cid:TiaDesignsLogo-white.png` sono normalizzate anche sul server. Nessuna dipendenza dall'allegato in `public/`, escluso dal filesystem delle funzioni Vercel. Restano consentiti loghi personalizzati e altri allegati CID. Le email già ricevute non vengono modificate. Un client può comunque bloccare immagini remote.

HTML e alternativa testuale UTF-8 vengono preparati insieme; paragrafi, interruzioni ed emoji conservati. Accettazione SMTP, copia IMAP e posizione in inbox sono esiti separati; la copia in Posta inviata conserva il Message-ID SMTP. Timeout SMTP/IMAP limitati; un errore IMAP non rende fallito un invio già accettato.

## Invii multipli Aruba

- Prenotazione persistente in transazione libSQL prima di SMTP; indipendente da tab, processo e nuova richiesta.
- Storico precedente consultato nella stessa transazione. Database non disponibile: nessun invio.
- Contatti ordinari già accettati, in corso o incerti bloccati; gli indirizzi di prova già esenti mantengono operazioni distinte con UUID e gli stessi limiti di cadenza/quota; timeout, perdita di risposta e ricevuta non salvata non vengono ritentati automaticamente.
- Solo un rifiuto SMTP esplicito permette un nuovo tentativo manuale; resta nel conteggio giornaliero. Nessun cambio automatico di provider nel flusso CSV.
- Cadenza globale minima del sito 30 secondi; limite applicativo prudenziale 150 tentativi nelle ultime 24 ore. Queste soglie non sono una garanzia di consegna o un'autorizzazione del provider.
- Lo sblocco esplicito conserva il conteggio giornaliero e non sblocca stati incerti/in corso.
- UI: un solo ciclo, interruzione conserva la richiesta in corso, pausa, arresto su errori di servizio, stato "Da verificare" escluso da retry/CSV dei rimanenti. Retry automatico solo per un 429 con intervallo esplicito che conferma nessun dispatch.
- L'elaborazione della lista richiede la scheda aperta; non è un worker in background. Le prenotazioni e le ricevute restano nel database.

La policy Aruba, sezione5, limita i messaggi analoghi indirizzati a oltre150persone e vieta aggiramenti. Una campagna da centinaia di destinatari non è pertanto certificata per questa modalità SMTP e viene fermata nel pannello. Verificare con Aruba o scegliere un servizio per campagne e contatti ammissibili, senza frammentare liste per eludere il limite.
Fonte ufficiale: https://hosting.aruba.it/documents/tc-files/it/7_policyutilizzoserviziaruba.pdf

## Prove riproducibili

- `node scripts/verify-email-builder.mjs`: template, campi modificabili, URL invariato e bozze CID.
- `node scripts/verify-email-mime.mjs`: 9 verifiche, preparazione effettiva del trasporto + MIME Nodemailer compilato/riletto; UTF-8, logo remoto, accettazione parziale e errore IMAP. SMTP/IMAP simulati, zero invii reali.
- `node scripts/verify-outreach-dispatch.mjs`: 16 verifiche con SQLite reale temporaneo, 500 richieste simulate/150 accettazioni sintetiche, connessioni indipendenti, concorrenza, duplicati, cadenza, limiti, rifiuti, timeout, ricevuta DB persa, sblocco e contabilità. Zero email reali.
- `node scripts/verify-newsletter.mjs`: regressioni newsletter/opt-out.
- `EMAIL_TEST_BASE_URL=http://localhost:PORT node scripts/verify-email-composer.mjs`: browser headless su copia isolata, caricamento logo e payload catturato; tutte le API intercettate.
- `EMAIL_TEST_BASE_URL=http://localhost:PORT node scripts/verify-outreach-ui.mjs`: lista sintetica500 fermata prima dell'API, esito incerto arresta il ciclo, nessun retry automatico, interruzione con richiesta in corso.
- TypeScript completo; lint pulito sui moduli nuovi, route auto-send e template. File legacy aruba-mail/branded-email/altri route contengono regole lint preesistenti (`any`/ts-ignore); non dichiarato lint globale pulito.
- Build Next16.2.6 webpack in copia isolata, schema su database locale temporaneo, sole credenziali fittizie. Non eseguito `npm run build` contro configurazioni reali: il relativo hook sincronizza il database.

## Limiti della verifica

Una risposta SMTP positiva non prova consegna finale o inbox. La sola email Aruba fornita dal proprietario mostra SPF/DMARC pass e DKIM pass di aruba.it, non una firma DKIM allineata al dominio del sito. I test non certificano reputazione, assenza di spam, bounce reali, quota contrattuale o consegna di campagne. Per confermarli servono messaggi controllati su caselle autorizzate e ricevute/intestazioni reali, poi monitoraggio dei rimbalzi. Nessuna campagna avviata durante questa correzione.

## Ripristino

Backup sorgenti iniziali in cache locale privata `email-fix-backup/before-email-fix.tar`; nessuna configurazione privata copiata. Ripristino codice tramite revert del commit. Le tabelle additive `OutreachDispatch` e `OutreachThrottle`, inizializzate solo da richieste autenticate, preservano prenotazioni e ricevute; non cancellarle per risolvere un esito incerto. Nessun segreto o screenshot della sessione personale nel commit.
