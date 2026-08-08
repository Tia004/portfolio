// ─── GDPR-compliant legal documents for Tia Designs ────────────────

export interface LegalDoc {
  title: string;
  lastUpdated: string;
  sections: { heading: string; body: string }[];
}

import type { Lang } from './translations';

// ═══════════════════════════════════════════════════════════════
//  ITALIANO (default)
// ═══════════════════════════════════════════════════════════════

export const PRIVACY_POLICY: LegalDoc = {
  title: 'Privacy Policy',
  lastUpdated: '24 Luglio 2026',
  sections: [
    {
      heading: '1. Titolare del Trattamento',
      body: 'Il titolare del trattamento dei dati personali è Tia Chinaglia, con sede operativa in Mantova, Italia, contattabile all\'indirizzo email info@tiadesigns.it. Il titolare determina le finalità e i mezzi del trattamento dei dati personali raccolti attraverso il sito web tiadesigns.it.',
    },
    {
      heading: '2. Dati Personali Raccolti',
      body: 'Raccogliamo le seguenti categorie di dati personali:\n\n• Dati di contatto: nome, indirizzo email, numero di telefono, forniti volontariamente tramite il form di contatto o la chat.\n• Dati di navigazione: indirizzo IP, tipo di browser, sistema operativo, pagine visitate, orari di accesso, raccolti automaticamente durante la navigazione.\n• Dati di comunicazione: contenuto dei messaggi inviati tramite il form contatti, la chat Telegram integrata, o il chatbot AI.\n\nNessun dato sensibile (ai sensi dell\'art. 9 GDPR) viene raccolto attivamente. I dati vengono forniti volontariamente dall\'utente.',
    },
    {
      heading: '3. Finalità del Trattamento e Base Giuridica',
      body: 'I dati personali sono trattati per le seguenti finalità:\n\n• Rispondere a richieste di contatto e preventivo — base giuridica: esecuzione di misure precontrattuali (art. 6(1)(b) GDPR).\n• Fornire i servizi richiesti (sviluppo software, design, produzione video) — base giuridica: esecuzione del contratto (art. 6(1)(b) GDPR).\n• Migliorare l\'esperienza di navigazione tramite analisi anonime — base giuridica: legittimo interesse (art. 6(1)(f) GDPR).\n• Adempiere a obblighi legali (fatturazione, conservazione documenti fiscali) — base giuridica: obbligo legale (art. 6(1)(c) GDPR).\n\nNon utilizziamo i dati per finalità di marketing diretto senza consenso esplicito.',
    },
    {
      heading: '4. Periodo di Conservazione',
      body: 'I dati personali sono conservati per il tempo strettamente necessario alle finalità per cui sono stati raccolti:\n\n• Dati di contatto e richieste: 24 mesi dall\'ultima interazione.\n• Dati contrattuali e fatture: 10 anni come richiesto dalla normativa fiscale italiana.\n• Dati di navigazione (log del server): 30 giorni.\n• Messaggi della chat: conservati per 12 mesi per garantire continuità del servizio.\n\nTrascorsi tali periodi, i dati vengono cancellati o anonimizzati in modo irreversibile.',
    },
    {
      heading: '5. Destinatari e Trasferimento Dati',
      body: 'I dati personali non vengono venduti, ceduti o condivisi con terze parti per finalità commerciali. Possono essere trattati da:\n\n• Fornitori di servizi tecnici: Vercel (hosting del sito), Turso (database), Telegram (servizio di messaggistica), Groq e Google (servizi AI per il chatbot).\n• Questi fornitori operano in qualità di responsabili del trattamento ai sensi dell\'art. 28 GDPR e sono vincolati da accordi contrattuali.\n\nAlcuni dati potrebbero essere trasferiti verso paesi extra-UE (es. Stati Uniti). In tal caso, ci assicuriamo che il trasferimento avvenga in presenza di garanzie adeguate (clausole contrattuali standard, certificazioni) come previsto dagli artt. 44-49 GDPR.',
    },
    {
      heading: '6. Diritti dell\'Interessato',
      body: 'Ai sensi degli artt. 15-22 GDPR, l\'utente ha il diritto di:\n\n• Accesso: ottenere conferma che sia in corso un trattamento dei propri dati e accedervi.\n• Rettifica: ottenere la correzione di dati inesatti o incompleti.\n• Cancellazione (diritto all\'oblio): ottenere la cancellazione dei propri dati.\n• Limitazione: limitare il trattamento in determinate circostanze.\n• Portabilità: ricevere i propri dati in formato strutturato.\n• Opposizione: opporsi al trattamento basato sul legittimo interesse.\n• Reclamo: proporre reclamo all\'autorità di controllo (Garante per la Protezione dei Dati Personali).\n\nPer esercitare questi diritti, scrivere a info@tiadesigns.it. Risponderemo entro 30 giorni.',
    },
    {
      heading: '7. Sicurezza dei Dati',
      body: 'Adottiamo misure tecniche e organizzative adeguate per proteggere i dati personali da accessi non autorizzati, perdita, distruzione o divulgazione, incluse:\n\n• Comunicazioni crittografate tramite HTTPS (TLS 1.3).\n• Database con accesso autenticato e cifratura a riposo.\n• API protette da chiavi e token.\n• Aggiornamenti regolari delle dipendenze software.\n\nTuttavia, nessun sistema di trasmissione o archiviazione dati è sicuro al 100%. In caso di violazione (data breach), notificheremo l\'utente e l\'autorità competente entro 72 ore come previsto dall\'art. 33 GDPR.',
    },
    {
      heading: '8. Modifiche alla Privacy Policy',
      body: 'La presente Privacy Policy può essere aggiornata periodicamente. La data dell\'ultimo aggiornamento è indicata in cima al documento. In caso di modifiche sostanziali, informeremo gli utenti tramite un avviso sul sito o via email. Si consiglia di consultare questa pagina regolarmente.',
    },
  ],
};

export const COOKIE_POLICY: LegalDoc = {
  title: 'Cookie Policy',
  lastUpdated: '24 Luglio 2026',
  sections: [
    {
      heading: '1. Cosa Sono i Cookie',
      body: 'I cookie sono piccoli file di testo che i siti web salvano sul dispositivo dell\'utente durante la navigazione. Servono a ricordare preferenze, migliorare l\'esperienza di navigazione e fornire funzionalità essenziali. I cookie possono essere "di sessione" (cancellati alla chiusura del browser) o "persistenti" (rimangono per un periodo definito).',
    },
    {
      heading: '2. Cookie Utilizzati da Questo Sito',
      body: 'Questo sito utilizza cookie tecnici essenziali e, previo consenso, cookie analitici di prima parte.\n\nCookie tecnici (sempre attivi):\n• Cookie di sessione Next.js: necessari per il funzionamento del framework. Scadono alla chiusura del browser.\n• Cookie di autenticazione (Master Portal): utilizzati solo nell\'area riservata per mantenere la sessione di login. Durata: sessione.\n• localStorage per preferenze lingua: salva la preferenza di lingua scelta (IT/EN/ES).\n• localStorage per consenso cookie: salva la scelta dell\'utente (accetta tutti/solo tecnici).\n\nCookie analitici di prima parte (solo previo consenso):\n• Tracciamento pageview: registra le pagine visitate in forma anonima.\n• Tracciamento click: registra i clic sugli elementi interattivi (CTA, link, pulsanti).\n• Tracciamento scroll: registra la profondità di scroll (25%, 50%, 75%, 100%).\n\nQuesti dati vengono inviati a un endpoint interno (/api/analytics/log) ospitato sullo stesso dominio. Non vengono condivisi con terze parti. Non utilizziamo Google Analytics, Facebook Pixel o qualsiasi altro strumento di tracciamento di terze parti. I dati analitici sono anonimizzati e aggregati.\n\nPuoi revocare il consenso in qualsiasi momento cancellando i cookie dal browser o utilizzando il pulsante "Preferenze cookie" nel footer del sito.',
    },
    {
      heading: '3. Base Giuridica',
      body: 'I cookie tecnici essenziali sono utilizzati in base al legittimo interesse del titolare (art. 6(1)(f) GDPR) e non richiedono consenso secondo la normativa italiana (Provvedimento Garante Privacy n. 229/2014). La preferenza lingua salvata in localStorage è un\'impostazione tecnica richiesta dall\'utente, trattata ai sensi dell\'art. 6(1)(b) GDPR.',
    },
    {
      heading: '4. Come Disabilitare i Cookie',
      body: 'La maggior parte dei browser permette di gestire le preferenze sui cookie. È possibile bloccare tutti i cookie o eliminare quelli esistenti dalle impostazioni del browser. Tuttavia, disabilitare i cookie tecnici potrebbe compromettere il funzionamento del sito. Di seguito i link alle guide dei browser più comuni:\n\n• Google Chrome: Impostazioni → Privacy e sicurezza → Cookie\n• Mozilla Firefox: Opzioni → Privacy e sicurezza → Cookie\n• Apple Safari: Preferenze → Privacy → Cookie\n• Microsoft Edge: Impostazioni → Cookie e autorizzazioni sito',
    },
    {
      heading: '5. Servizi di Terze Parti',
      body: 'Il sito integra i seguenti servizi che potrebbero utilizzare cookie propri:\n\n• Vercel (hosting): può utilizzare cookie tecnici per il bilanciamento del carico e la sicurezza. Informativa: vercel.com/legal/privacy-policy.\n• Telegram (chat): il widget di chat Telegram utilizza cookie propri secondo la propria privacy policy: telegram.org/privacy.\n\nQueste terze parti operano come titolari autonomi del trattamento per i cookie da loro impostati.',
    },
    {
      heading: '6. Modifiche alla Cookie Policy',
      body: 'La presente Cookie Policy può essere aggiornata. La data di ultimo aggiornamento è indicata all\'inizio del documento. Eventuali modifiche sostanziali saranno comunicate tramite un banner sul sito.',
    },
  ],
};

export const TERMS_CONDITIONS: LegalDoc = {
  title: 'Termini e Condizioni',
  lastUpdated: '24 Luglio 2026',
  sections: [
    {
      heading: '1. Oggetto e Ambito di Applicazione',
      body: 'I presenti Termini e Condizioni disciplinano l\'utilizzo del sito web tiadesigns.it e la fruizione dei servizi professionali offerti da Tia Chinaglia ("il Professionista" o "Tia Designs"). Navigando il sito o richiedendo un servizio, l\'utente accetta integralmente questi termini. Se non si accettano questi termini, si prega di non utilizzare il sito né richiedere i servizi.',
    },
    {
      heading: '2. Servizi Offerti',
      body: 'Tia Designs offre servizi professionali di:\n\n• Design grafico e brand identity (logo, palette, tipografia, materiali marketing).\n• Sviluppo web e software (siti web, applicazioni mobile, SaaS, dashboard).\n• Produzione video (montaggio, motion graphics, color grading, riprese).\n• Consulenza tecnica e automazione (AI, LLM, workflow automation).\n\nOgni servizio è regolato da un preventivo scritto e accettato dal cliente prima dell\'inizio dei lavori. I preventivi hanno validità di 15 giorni dalla data di emissione.',
    },
    {
      heading: '3. Proprietà Intellettuale',
      body: 'Salvo diverso accordo scritto:\n\n• Il Professionista conserva la proprietà intellettuale del codice sorgente, dei file di progetto e degli asset creati fino al pagamento completo del corrispettivo pattuito.\n• Al saldo integrale, il cliente acquisisce la piena proprietà e licenza d\'uso perpetua del prodotto finale (sito web, logo, video, ecc.), inclusi i file sorgente se espressamente inclusi nel preventivo.\n• Il Professionista ha il diritto di esporre i lavori realizzati nel proprio portfolio, salvo richiesta scritta di riservatezza da parte del cliente.\n• Le librerie, i framework e i componenti open-source utilizzati restano soggetti alle rispettive licenze.',
    },
    {
      heading: '4. Corrispettivi e Pagamenti',
      body: 'I corrispettivi sono indicati nel preventivo. Le modalità di pagamento standard sono:\n\n• 30% all\'accettazione del preventivo (acconto).\n• 30% a metà lavorazione (stato avanzamento).\n• 40% al saldo, prima della consegna finale.\n\nPer progetti di importo inferiore a €500, il pagamento può essere richiesto in un\'unica soluzione. I pagamenti si effettuano tramite bonifico bancario o altri metodi concordati. Eventuali ritardi nei pagamenti superiori a 15 giorni comportano la sospensione dei lavori e l\'applicazione di interessi di mora al tasso legale.',
    },
    {
      heading: '5. Tempistiche e Consegna',
      body: 'Le tempistiche di consegna sono indicate nel preventivo e decorrono dalla data di ricezione dell\'acconto e di tutto il materiale necessario dal cliente. Eventuali ritardi causati da:\n\n• Mancata comunicazione di informazioni o materiali da parte del cliente.\n• Modifiche in corso d\'opera richieste dal cliente non previste nel preventivo originale.\n• Cause di forza maggiore (eventi naturali, pandemie, interruzioni di servizi essenziali).\n\n...comportano uno slittamento proporzionale della deadline, senza alcuna penalità per il Professionista.',
    },
    {
      heading: '6. Modifiche e Revisioni',
      body: 'Il preventivo include un numero definito di revisioni (tipicamente 2-3). Ogni revisione aggiuntiva oltre quelle previste sarà quotata separatamente. Le modifiche che alterano sostanzialmente la natura o lo scopo del progetto originale (change request) comportano un nuovo preventivo o un supplemento. Il Professionista si riserva il diritto di rifiutare modifiche che ritiene tecnicamente inadatte o in contrasto con le best practice professionali.',
    },
    {
      heading: '7. Garanzia e Manutenzione',
      body: 'Tutti i prodotti consegnati sono coperti da una garanzia di 30 giorni dalla consegna per difetti o bug imputabili al Professionista. La garanzia non copre:\n\n• Problemi causati da modifiche apportate dal cliente o da terzi.\n• Incompatibilità con browser, dispositivi o software non specificati nel preventivo.\n• Obsolescenza dovuta ad aggiornamenti di piattaforme esterne (es. API, WordPress).\n\nServizi di manutenzione continuativa sono disponibili tramite i pacchetti mensili indicati nella sezione Prezzi del sito.',
    },
    {
      heading: '8. Limitazione di Responsabilità',
      body: 'Nei limiti consentiti dalla legge applicabile:\n\n• Il Professionista non sarà responsabile per danni indiretti, consequenziali, perdita di profitto o interruzione di attività derivanti dall\'uso dei prodotti consegnati.\n• La responsabilità massima del Professionista per qualsiasi rivendicazione è limitata al corrispettivo effettivamente percepito per lo specifico progetto.\n• Il Professionista non garantisce risultati economici, posizionamento SEO, o metriche di performance dei contenuti prodotti.\n\nNulla in questi termini esclude o limita la responsabilità per dolo o colpa grave.',
    },
    {
      heading: '9. Riservatezza',
      body: 'Il Professionista si impegna a mantenere riservate tutte le informazioni, i dati, i materiali e i segreti commerciali forniti dal cliente nell\'ambito del rapporto professionale. Tale obbligo permane anche dopo la conclusione del rapporto. Il cliente si impegna a non divulgare a terzi i dettagli tecnici, economici e metodologici dei servizi ricevuti, salvo autorizzazione scritta.',
    },
    {
      heading: '10. Recesso e Risoluzione',
      body: 'Il cliente può recedere dal contratto in qualsiasi momento con comunicazione scritta. In caso di recesso:\n\n• L\'acconto versato non viene rimborsato (copre il lavoro già svolto e le risorse allocate).\n• Il cliente riceve il materiale prodotto fino a quel momento.\n• Eventuali costi vivi già sostenuti dal Professionista (licenze, stock, server) vengono fatturati al cliente.\n\nIl Professionista può risolvere il contratto per giusta causa in caso di: mancato pagamento, violazione della riservatezza, comportamento offensivo o non collaborativo, o richieste illegali o contrarie all\'etica professionale.',
    },
    {
      heading: '11. Legge Applicabile e Foro Competente',
      body: 'I presenti Termini e Condizioni sono regolati dalla legge italiana. Per qualsiasi controversia derivante da questi termini o dai servizi forniti, sarà competente in via esclusiva il foro di Mantova, salvo il foro del consumatore se applicabile ai sensi del Codice del Consumo (D.Lgs. 206/2005).',
    },
    {
      heading: '12. Contatti',
      body: 'Per qualsiasi domanda relativa a questi Termini e Condizioni, è possibile contattare:\n\nTia Chinaglia\nEmail: info@tiadesigns.it\nSede: Mantova, Italia\nPartita IVA: disponibile su richiesta',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════
//  ENGLISH
// ═══════════════════════════════════════════════════════════════

export const PRIVACY_POLICY_EN: LegalDoc = {
  title: 'Privacy Policy',
  lastUpdated: '24 July 2026',
  sections: [
    {
      heading: '1. Data Controller',
      body: 'The data controller of personal data is Tia Chinaglia, with registered office in Mantua, Italy, reachable at info@tiadesigns.it. The controller determines the purposes and means of processing personal data collected through the tiadesigns.it website.',
    },
    {
      heading: '2. Personal Data Collected',
      body: 'We collect the following categories of personal data:\n\n• Contact data: name, email address, phone number, voluntarily provided via the contact form or chat.\n• Browsing data: IP address, browser type, operating system, pages visited, access times, automatically collected during navigation.\n• Communication data: content of messages sent via the contact form, the integrated Telegram chat, or the AI chatbot.\n\nNo sensitive data (as defined by Art. 9 GDPR) is actively collected. Data is voluntarily provided by the user.',
    },
    {
      heading: '3. Purpose of Processing and Legal Basis',
      body: 'Personal data is processed for the following purposes:\n\n• Responding to contact and quote requests — legal basis: performance of pre-contractual measures (Art. 6(1)(b) GDPR).\n• Providing requested services (software development, design, video production) — legal basis: performance of a contract (Art. 6(1)(b) GDPR).\n• Improving the browsing experience through anonymous analytics — legal basis: legitimate interest (Art. 6(1)(f) GDPR).\n• Complying with legal obligations (invoicing, tax record retention) — legal basis: legal obligation (Art. 6(1)(c) GDPR).\n\nWe do not use data for direct marketing purposes without explicit consent.',
    },
    {
      heading: '4. Retention Period',
      body: 'Personal data is retained for the time strictly necessary for the purposes for which it was collected:\n\n• Contact data and inquiries: 24 months from the last interaction.\n• Contractual data and invoices: 10 years as required by Italian tax law.\n• Browsing data (server logs): 30 days.\n• Chat messages: retained for 12 months to ensure service continuity.\n\nAfter these periods, data is deleted or irreversibly anonymized.',
    },
    {
      heading: '5. Recipients and Data Transfer',
      body: 'Personal data is not sold, transferred, or shared with third parties for commercial purposes. It may be processed by:\n\n• Technical service providers: Vercel (website hosting), Turso (database), Telegram (messaging service), Groq and Google (AI services for the chatbot).\n• These providers act as data processors under Art. 28 GDPR and are bound by contractual agreements.\n\nSome data may be transferred to countries outside the EU (e.g., the United States). In such cases, we ensure adequate safeguards (standard contractual clauses, certifications) as required by Arts. 44-49 GDPR.',
    },
    {
      heading: '6. Your Rights',
      body: 'Under Articles 15-22 GDPR, you have the right to:\n\n• Access: confirmation of whether your data is being processed and access to it.\n• Rectification: correction of inaccurate or incomplete data.\n• Erasure (right to be forgotten): deletion of your data.\n• Restriction: restriction of processing under certain circumstances.\n• Portability: receipt of your data in a structured format.\n• Objection: objection to processing based on legitimate interest.\n• Complaint: lodge a complaint with the supervisory authority (Italian Data Protection Authority).\n\nTo exercise these rights, write to info@tiadesigns.it. We will respond within 30 days.',
    },
    {
      heading: '7. Data Security',
      body: 'We adopt adequate technical and organizational measures to protect personal data from unauthorized access, loss, destruction, or disclosure, including:\n\n• Encrypted communications via HTTPS (TLS 1.3).\n• Databases with authenticated access and encryption at rest.\n• APIs protected by keys and tokens.\n• Regular updates of software dependencies.\n\nHowever, no data transmission or storage system is 100% secure. In the event of a data breach, we will notify you and the competent authority within 72 hours as required by Art. 33 GDPR.',
    },
    {
      heading: '8. Changes to This Privacy Policy',
      body: 'This Privacy Policy may be updated periodically. The date of the last update is shown at the top of the document. In case of material changes, we will inform users via a notice on the website or by email. We recommend reviewing this page regularly.',
    },
  ],
};

export const COOKIE_POLICY_EN: LegalDoc = {
  title: 'Cookie Policy',
  lastUpdated: '24 July 2026',
  sections: [
    {
      heading: '1. What Are Cookies',
      body: 'Cookies are small text files that websites save on the user\'s device during browsing. They help remember preferences, improve the browsing experience, and provide essential functionality. Cookies can be "session" (deleted when the browser is closed) or "persistent" (remain for a defined period).',
    },
    {
      heading: '2. Cookies Used on This Site',
      body: 'This site uses essential technical cookies and, with your consent, first-party analytical cookies.\n\nTechnical cookies (always active):\n• Next.js session cookies: necessary for the framework to function. Expire when the browser is closed.\n• Authentication cookies (Master Portal): used only in the restricted area to maintain the login session. Duration: session.\n• localStorage for language preference: saves the chosen language (IT/EN/ES).\n• localStorage for cookie consent: saves the user\'s choice (accept all / technical only).\n\nFirst-party analytical cookies (consent required):\n• Pageview tracking: records visited pages anonymously.\n• Click tracking: records clicks on interactive elements (CTAs, links, buttons).\n• Scroll tracking: records scroll depth (25%, 50%, 75%, 100%).\n\nThis data is sent to an internal endpoint (/api/analytics/log) hosted on the same domain. It is not shared with third parties. We do not use Google Analytics, Facebook Pixel, or any other third-party tracking tools. Analytical data is anonymized and aggregated.\n\nYou can withdraw your consent at any time by clearing cookies in your browser or clicking the "Cookie Preferences" button in the site footer.',
    },
    {
      heading: '3. Legal Basis',
      body: 'Essential technical cookies are used based on the legitimate interest of the controller (Art. 6(1)(f) GDPR) and do not require consent under Italian law (Garante Privacy Provision No. 229/2014). The language preference saved in localStorage is a technical setting requested by the user, processed under Art. 6(1)(b) GDPR.',
    },
    {
      heading: '4. How to Disable Cookies',
      body: 'Most browsers allow you to manage cookie preferences. You can block all cookies or delete existing ones from the browser settings. However, disabling technical cookies may impair site functionality. Below are links to guides for common browsers:\n\n• Google Chrome: Settings → Privacy and Security → Cookies\n• Mozilla Firefox: Options → Privacy & Security → Cookies\n• Apple Safari: Preferences → Privacy → Cookies\n• Microsoft Edge: Settings → Cookies and site permissions',
    },
    {
      heading: '5. Third-Party Services',
      body: 'The site integrates the following services that may use their own cookies:\n\n• Vercel (hosting): may use technical cookies for load balancing and security. Policy: vercel.com/legal/privacy-policy.\n• Telegram (chat): the Telegram chat widget uses its own cookies per its privacy policy: telegram.org/privacy.\n\nThese third parties act as independent data controllers for the cookies they set.',
    },
    {
      heading: '6. Changes to This Cookie Policy',
      body: 'This Cookie Policy may be updated. The date of the last update is shown at the top of the document. Material changes will be communicated via a banner on the site.',
    },
  ],
};

export const TERMS_CONDITIONS_EN: LegalDoc = {
  title: 'Terms and Conditions',
  lastUpdated: '24 July 2026',
  sections: [
    {
      heading: '1. Subject Matter and Scope',
      body: 'These Terms and Conditions govern the use of the tiadesigns.it website and the professional services offered by Tia Chinaglia ("the Professional" or "Tia Designs"). By browsing the site or requesting a service, the user fully accepts these terms. If you do not agree with these terms, please do not use the site or request services.',
    },
    {
      heading: '2. Services Offered',
      body: 'Tia Designs offers professional services in:\n\n• Graphic design and brand identity (logo, palette, typography, marketing materials).\n• Web and software development (websites, mobile apps, SaaS, dashboards).\n• Video production (editing, motion graphics, color grading, filming).\n• Technical consulting and automation (AI, LLM, workflow automation).\n\nEach service is governed by a written quote accepted by the client before work commences. Quotes are valid for 15 days from the date of issue.',
    },
    {
      heading: '3. Intellectual Property',
      body: 'Unless otherwise agreed in writing:\n\n• The Professional retains intellectual property of source code, project files, and created assets until full payment of the agreed fee.\n• Upon full payment, the client acquires full ownership and a perpetual license to use the final product (website, logo, video, etc.), including source files if expressly included in the quote.\n• The Professional has the right to display completed work in their portfolio, unless the client makes a written confidentiality request.\n• Open-source libraries, frameworks, and components remain subject to their respective licenses.',
    },
    {
      heading: '4. Fees and Payments',
      body: 'Fees are stated in the quote. Standard payment terms are:\n\n• 30% upon quote acceptance (deposit).\n• 30% at mid-production (progress milestone).\n• 40% upon balance, before final delivery.\n\nFor projects under €500, payment may be requested in a single installment. Payments are made via bank transfer or other agreed methods. Payment delays exceeding 15 days result in work suspension and application of late-payment interest at the statutory rate.',
    },
    {
      heading: '5. Timeline and Delivery',
      body: 'Delivery timelines are stated in the quote and run from the date of receipt of the deposit and all necessary materials from the client. Delays caused by:\n\n• Failure of the client to communicate information or materials.\n• Changes requested by the client during production not covered by the original quote.\n• Force majeure events (natural disasters, pandemics, essential service interruptions).\n\n...result in a proportional shift of the deadline, with no penalty to the Professional.',
    },
    {
      heading: '6. Changes and Revisions',
      body: 'The quote includes a defined number of revisions (typically 2-3). Each additional revision beyond those included will be quoted separately. Changes that substantially alter the nature or scope of the original project (change requests) require a new quote or a supplement. The Professional reserves the right to refuse modifications deemed technically unsuitable or contrary to professional best practices.',
    },
    {
      heading: '7. Warranty and Maintenance',
      body: 'All delivered products are covered by a 30-day warranty from delivery for defects or bugs attributable to the Professional. The warranty does not cover:\n\n• Problems caused by modifications made by the client or third parties.\n• Incompatibility with browsers, devices, or software not specified in the quote.\n• Obsolescence due to updates of external platforms (e.g., APIs, WordPress).\n\nOngoing maintenance services are available through the monthly packages listed in the Prices section of the site.',
    },
    {
      heading: '8. Limitation of Liability',
      body: 'To the extent permitted by applicable law:\n\n• The Professional shall not be liable for indirect, consequential damages, loss of profit, or business interruption arising from the use of delivered products.\n• The Professional\'s maximum liability for any claim is limited to the fee actually received for the specific project.\n• The Professional does not guarantee financial results, SEO rankings, or performance metrics of produced content.\n\nNothing in these terms excludes or limits liability for fraud or gross negligence.',
    },
    {
      heading: '9. Confidentiality',
      body: 'The Professional undertakes to keep confidential all information, data, materials, and trade secrets provided by the client in the course of the professional relationship. This obligation remains in effect even after the conclusion of the relationship. The client agrees not to disclose to third parties the technical, financial, and methodological details of the services received, unless expressly authorized in writing.',
    },
    {
      heading: '10. Withdrawal and Termination',
      body: 'The client may withdraw from the contract at any time by written notice. In case of withdrawal:\n\n• The paid deposit is not refunded (it covers work already performed and allocated resources).\n• The client receives the material produced up to that point.\n• Any out-of-pocket costs incurred by the Professional (licenses, stock, servers) are charged to the client.\n\nThe Professional may terminate the contract for cause in case of: non-payment, breach of confidentiality, offensive or uncooperative behavior, or illegal or unethical requests.',
    },
    {
      heading: '11. Governing Law and Jurisdiction',
      body: 'These Terms and Conditions are governed by Italian law. Any dispute arising from these terms or the services provided shall be subject to the exclusive jurisdiction of the Court of Mantua, except for consumer jurisdiction where applicable under the Italian Consumer Code (Legislative Decree 206/2005).',
    },
    {
      heading: '12. Contact',
      body: 'For any questions regarding these Terms and Conditions, please contact:\n\nTia Chinaglia\nEmail: info@tiadesigns.it\nLocation: Mantua, Italy\nVAT: available upon request',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════
//  ESPAÑOL
// ═══════════════════════════════════════════════════════════════

export const PRIVACY_POLICY_ES: LegalDoc = {
  title: 'Política de Privacidad',
  lastUpdated: '24 de Julio de 2026',
  sections: [
    {
      heading: '1. Responsable del Tratamiento',
      body: 'El responsable del tratamiento de datos personales es Tia Chinaglia, con sede operativa en Mantua, Italia, contactable en info@tiadesigns.it. El responsable determina los fines y medios del tratamiento de los datos personales recogidos a través del sitio web tiadesigns.it.',
    },
    {
      heading: '2. Datos Personales Recogidos',
      body: 'Recogemos las siguientes categorías de datos personales:\n\n• Datos de contacto: nombre, dirección de correo electrónico, número de teléfono, proporcionados voluntariamente a través del formulario de contacto o del chat.\n• Datos de navegación: dirección IP, tipo de navegador, sistema operativo, páginas visitadas, horas de acceso, recogidos automáticamente durante la navegación.\n• Datos de comunicación: contenido de los mensajes enviados a través del formulario de contacto, el chat de Telegram integrado o el chatbot de IA.\n\nNo se recogen activamente datos sensibles (según el Art. 9 GDPR). Los datos son proporcionados voluntariamente por el usuario.',
    },
    {
      heading: '3. Finalidad del Tratamiento y Base Jurídica',
      body: 'Los datos personales se tratan para los siguientes fines:\n\n• Responder a solicitudes de contacto y presupuesto — base jurídica: ejecución de medidas precontractuales (Art. 6(1)(b) GDPR).\n• Prestar los servicios solicitados (desarrollo de software, diseño, producción de vídeo) — base jurídica: ejecución del contrato (Art. 6(1)(b) GDPR).\n• Mejorar la experiencia de navegación mediante análisis anónimos — base jurídica: interés legítimo (Art. 6(1)(f) GDPR).\n• Cumplir obligaciones legales (facturación, conservación de documentos fiscales) — base jurídica: obligación legal (Art. 6(1)(c) GDPR).\n\nNo utilizamos los datos para fines de marketing directo sin consentimiento explícito.',
    },
    {
      heading: '4. Período de Conservación',
      body: 'Los datos personales se conservan durante el tiempo estrictamente necesario para los fines para los que fueron recogidos:\n\n• Datos de contacto y solicitudes: 24 meses desde la última interacción.\n• Datos contractuales y facturas: 10 años según lo exigido por la normativa fiscal italiana.\n• Datos de navegación (registros del servidor): 30 días.\n• Mensajes del chat: conservados durante 12 meses para garantizar la continuidad del servicio.\n\nTranscurridos estos períodos, los datos se eliminan o anonimizan de forma irreversible.',
    },
    {
      heading: '5. Destinatarios y Transferencia de Datos',
      body: 'Los datos personales no se venden, ceden ni comparten con terceros con fines comerciales. Pueden ser tratados por:\n\n• Proveedores de servicios técnicos: Vercel (alojamiento del sitio), Turso (base de datos), Telegram (servicio de mensajería), Groq y Google (servicios de IA para el chatbot).\n• Estos proveedores actúan como encargados del tratamiento según el Art. 28 GDPR y están vinculados por acuerdos contractuales.\n\nAlgunos datos pueden transferirse a países fuera de la UE (por ejemplo, Estados Unidos). En tal caso, garantizamos salvaguardias adecuadas (cláusulas contractuales tipo, certificaciones) según lo dispuesto en los Arts. 44-49 GDPR.',
    },
    {
      heading: '6. Derechos del Interesado',
      body: 'Según los Arts. 15-22 GDPR, el usuario tiene derecho a:\n\n• Acceso: obtener confirmación de si se están tratando sus datos y acceder a ellos.\n• Rectificación: obtener la corrección de datos inexactos o incompletos.\n• Supresión (derecho al olvido): obtener la eliminación de sus datos.\n• Limitación: limitar el tratamiento en determinadas circunstancias.\n• Portabilidad: recibir sus datos en un formato estructurado.\n• Oposición: oponerse al tratamiento basado en el interés legítimo.\n• Reclamación: presentar una reclamación ante la autoridad de control (Agencia Española de Protección de Datos o autoridad italiana equivalente).\n\nPara ejercer estos derechos, escriba a info@tiadesigns.it. Responderemos en un plazo de 30 días.',
    },
    {
      heading: '7. Seguridad de los Datos',
      body: 'Adoptamos medidas técnicas y organizativas adecuadas para proteger los datos personales contra accesos no autorizados, pérdida, destrucción o divulgación, incluyendo:\n\n• Comunicaciones cifradas mediante HTTPS (TLS 1.3).\n• Bases de datos con acceso autenticado y cifrado en reposo.\n• API protegidas por claves y tokens.\n• Actualizaciones periódicas de las dependencias de software.\n\nSin embargo, ningún sistema de transmisión o almacenamiento de datos es 100% seguro. En caso de violación de datos (data breach), notificaremos al usuario y a la autoridad competente en un plazo de 72 horas según lo dispuesto en el Art. 33 GDPR.',
    },
    {
      heading: '8. Cambios en esta Política de Privacidad',
      body: 'Esta Política de Privacidad puede actualizarse periódicamente. La fecha de la última actualización se indica al principio del documento. En caso de cambios sustanciales, informaremos a los usuarios mediante un aviso en el sitio web o por correo electrónico. Se recomienda consultar esta página con regularidad.',
    },
  ],
};

export const COOKIE_POLICY_ES: LegalDoc = {
  title: 'Política de Cookies',
  lastUpdated: '24 de Julio de 2026',
  sections: [
    {
      heading: '1. Qué Son las Cookies',
      body: 'Las cookies son pequeños archivos de texto que los sitios web guardan en el dispositivo del usuario durante la navegación. Sirven para recordar preferencias, mejorar la experiencia de navegación y proporcionar funciones esenciales. Las cookies pueden ser "de sesión" (se eliminan al cerrar el navegador) o "persistentes" (permanecen durante un período definido).',
    },
    {
      heading: '2. Cookies Utilizadas en Este Sitio',
      body: 'Este sitio utiliza cookies técnicas esenciales y, previo consentimiento, cookies analíticas de primera parte.\n\nCookies técnicas (siempre activas):\n• Cookies de sesión de Next.js: necesarias para el funcionamiento del framework. Caducan al cerrar el navegador.\n• Cookies de autenticación (Master Portal): utilizadas solo en el área restringida para mantener la sesión de inicio de sesión. Duración: sesión.\n• localStorage para preferencia de idioma: guarda el idioma seleccionado (IT/EN/ES).\n• localStorage para consentimiento de cookies: guarda la elección del usuario (aceptar todas / solo técnicas).\n\nCookies analíticas de primera parte (solo con consentimiento):\n• Seguimiento de pageview: registra las páginas visitadas de forma anónima.\n• Seguimiento de clics: registra los clics en elementos interactivos (CTA, enlaces, botones).\n• Seguimiento de scroll: registra la profundidad de desplazamiento (25%, 50%, 75%, 100%).\n\nEstos datos se envían a un endpoint interno (/api/analytics/log) alojado en el mismo dominio. No se comparten con terceros. No utilizamos Google Analytics, Facebook Pixel ni ninguna otra herramienta de seguimiento de terceros. Los datos analíticos están anonimizados y agregados.\n\nPuede revocar su consentimiento en cualquier momento eliminando las cookies del navegador o utilizando el botón "Preferencias de cookies" en el pie de página del sitio.',
    },
    {
      heading: '3. Base Jurídica',
      body: 'Las cookies técnicas esenciales se utilizan basándose en el interés legítimo del responsable (Art. 6(1)(f) GDPR) y no requieren consentimiento según la normativa italiana (Providencia del Garante de Privacidad n. 229/2014). La preferencia de idioma guardada en localStorage es un ajuste técnico solicitado por el usuario, tratado según el Art. 6(1)(b) GDPR.',
    },
    {
      heading: '4. Cómo Deshabilitar las Cookies',
      body: 'La mayoría de los navegadores permiten gestionar las preferencias de cookies. Puede bloquear todas las cookies o eliminar las existentes desde la configuración del navegador. Sin embargo, deshabilitar las cookies técnicas podría comprometer el funcionamiento del sitio. A continuación, los enlaces a las guías de los navegadores más comunes:\n\n• Google Chrome: Configuración → Privacidad y seguridad → Cookies\n• Mozilla Firefox: Opciones → Privacidad y seguridad → Cookies\n• Apple Safari: Preferencias → Privacidad → Cookies\n• Microsoft Edge: Configuración → Cookies y permisos del sitio',
    },
    {
      heading: '5. Servicios de Terceros',
      body: 'El sitio integra los siguientes servicios que podrían utilizar cookies propias:\n\n• Vercel (alojamiento): puede utilizar cookies técnicas para el equilibrio de carga y la seguridad. Política: vercel.com/legal/privacy-policy.\n• Telegram (chat): el widget de chat de Telegram utiliza cookies propias según su política de privacidad: telegram.org/privacy.\n\nEstos terceros actúan como responsables autónomos del tratamiento de las cookies que establecen.',
    },
    {
      heading: '6. Cambios en esta Política de Cookies',
      body: 'Esta Política de Cookies puede actualizarse. La fecha de la última actualización se indica al principio del documento. Los cambios sustanciales se comunicarán mediante un banner en el sitio.',
    },
  ],
};

export const TERMS_CONDITIONS_ES: LegalDoc = {
  title: 'Términos y Condiciones',
  lastUpdated: '24 de Julio de 2026',
  sections: [
    {
      heading: '1. Objeto y Ámbito de Aplicación',
      body: 'Estos Términos y Condiciones regulan el uso del sitio web tiadesigns.it y la prestación de servicios profesionales ofrecidos por Tia Chinaglia ("el Profesional" o "Tia Designs"). Al navegar por el sitio o solicitar un servicio, el usuario acepta íntegramente estos términos. Si no acepta estos términos, no utilice el sitio ni solicite los servicios.',
    },
    {
      heading: '2. Servicios Ofrecidos',
      body: 'Tia Designs ofrece servicios profesionales de:\n\n• Diseño gráfico e identidad de marca (logotipo, paleta, tipografía, materiales de marketing).\n• Desarrollo web y de software (sitios web, aplicaciones móviles, SaaS, paneles de control).\n• Producción de vídeo (edición, motion graphics, corrección de color, grabación).\n• Consultoría técnica y automatización (IA, LLM, automatización de flujos de trabajo).\n\nCada servicio se rige por un presupuesto escrito aceptado por el cliente antes del inicio de los trabajos. Los presupuestos tienen una validez de 15 días desde su fecha de emisión.',
    },
    {
      heading: '3. Propiedad Intelectual',
      body: 'Salvo acuerdo escrito en contrario:\n\n• El Profesional conserva la propiedad intelectual del código fuente, los archivos del proyecto y los activos creados hasta el pago completo de la contraprestación acordada.\n• Tras el pago íntegro, el cliente adquiere la plena propiedad y una licencia de uso perpetua del producto final (sitio web, logotipo, vídeo, etc.), incluidos los archivos fuente si se incluyen expresamente en el presupuesto.\n• El Profesional tiene derecho a exhibir los trabajos realizados en su portafolio, salvo solicitud escrita de confidencialidad por parte del cliente.\n• Las bibliotecas, frameworks y componentes de código abierto utilizados siguen sujetos a sus respectivas licencias.',
    },
    {
      heading: '4. Honorarios y Pagos',
      body: 'Los honorarios se indican en el presupuesto. Las condiciones de pago estándar son:\n\n• 30% al aceptar el presupuesto (anticipo).\n• 30% a mitad de la producción (hito de progreso).\n• 40% al saldo, antes de la entrega final.\n\nPara proyectos inferiores a 500 €, el pago puede solicitarse en un solo plazo. Los pagos se realizan mediante transferencia bancaria u otros métodos acordados. Los retrasos en los pagos superiores a 15 días conllevan la suspensión de los trabajos y la aplicación de intereses de demora al tipo legal.',
    },
    {
      heading: '5. Plazos y Entrega',
      body: 'Los plazos de entrega se indican en el presupuesto y comienzan a partir de la fecha de recepción del anticipo y de todos los materiales necesarios por parte del cliente. Los retrasos causados por:\n\n• Falta de comunicación de información o materiales por parte del cliente.\n• Cambios solicitados por el cliente durante la producción no previstos en el presupuesto original.\n• Causas de fuerza mayor (desastres naturales, pandemias, interrupciones de servicios esenciales).\n\n...conllevan un desplazamiento proporcional del plazo, sin penalización para el Profesional.',
    },
    {
      heading: '6. Cambios y Revisiones',
      body: 'El presupuesto incluye un número definido de revisiones (normalmente 2-3). Cada revisión adicional más allá de las incluidas se presupuestará por separado. Los cambios que alteren sustancialmente la naturaleza o el alcance del proyecto original (change request) requieren un nuevo presupuesto o un suplemento. El Profesional se reserva el derecho de rechazar modificaciones que considere técnicamente inadecuadas o contrarias a las mejores prácticas profesionales.',
    },
    {
      heading: '7. Garantía y Mantenimiento',
      body: 'Todos los productos entregados están cubiertos por una garantía de 30 días desde la entrega para defectos o errores atribuibles al Profesional. La garantía no cubre:\n\n• Problemas causados por modificaciones realizadas por el cliente o terceros.\n• Incompatibilidad con navegadores, dispositivos o software no especificados en el presupuesto.\n• Obsolescencia debida a actualizaciones de plataformas externas (por ejemplo, API, WordPress).\n\nLos servicios de mantenimiento continuo están disponibles a través de los paquetes mensuales indicados en la sección de Precios del sitio.',
    },
    {
      heading: '8. Limitación de Responsabilidad',
      body: 'En la medida permitida por la ley aplicable:\n\n• El Profesional no será responsable de daños indirectos, consecuenciales, pérdida de beneficios o interrupción del negocio derivados del uso de los productos entregados.\n• La responsabilidad máxima del Profesional por cualquier reclamación se limita al honorario efectivamente percibido por el proyecto específico.\n• El Profesional no garantiza resultados económicos, posicionamiento SEO ni métricas de rendimiento de los contenidos producidos.\n\nNada en estos términos excluye o limita la responsabilidad por dolo o negligencia grave.',
    },
    {
      heading: '9. Confidencialidad',
      body: 'El Profesional se compromete a mantener la confidencialidad de toda la información, datos, materiales y secretos comerciales proporcionados por el cliente en el marco de la relación profesional. Esta obligación permanece incluso después de la conclusión de la relación. El cliente se compromete a no divulgar a terceros los detalles técnicos, económicos y metodológicos de los servicios recibidos, salvo autorización escrita.',
    },
    {
      heading: '10. Desistimiento y Resolución',
      body: 'El cliente puede desistir del contrato en cualquier momento mediante comunicación escrita. En caso de desistimiento:\n\n• El anticipo pagado no se reembolsa (cubre el trabajo ya realizado y los recursos asignados).\n• El cliente recibe el material producido hasta ese momento.\n• Los gastos directos ya incurridos por el Profesional (licencias, stock, servidores) se facturan al cliente.\n\nEl Profesional puede resolver el contrato por causa justificada en caso de: impago, violación de la confidencialidad, comportamiento ofensivo o no colaborador, o solicitudes ilegales o contrarias a la ética profesional.',
    },
    {
      heading: '11. Legislación Aplicable y Jurisdicción',
      body: 'Estos Términos y Condiciones se rigen por la legislación italiana. Cualquier controversia derivada de estos términos o de los servicios prestados será competencia exclusiva del tribunal de Mantua, salvo la jurisdicción del consumidor cuando sea aplicable según el Código de Consumo italiano (Decreto Legislativo 206/2005).',
    },
    {
      heading: '12. Contacto',
      body: 'Para cualquier pregunta sobre estos Términos y Condiciones, puede contactar:\n\nTia Chinaglia\nEmail: info@tiadesigns.it\nSede: Mantua, Italia\nIVA: disponible bajo solicitud',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════
//  Language-aware accessor
// ═══════════════════════════════════════════════════════════════

export const LEGAL_DOCS_BY_LANG: Record<Lang, Record<string, LegalDoc>> = {
  it: {
    privacy: PRIVACY_POLICY,
    cookies: COOKIE_POLICY,
    terms: TERMS_CONDITIONS,
  },
  en: {
    privacy: PRIVACY_POLICY_EN,
    cookies: COOKIE_POLICY_EN,
    terms: TERMS_CONDITIONS_EN,
  },
  es: {
    privacy: PRIVACY_POLICY_ES,
    cookies: COOKIE_POLICY_ES,
    terms: TERMS_CONDITIONS_ES,
  },
};

/** Returns the legal document for the given language and key.
 *  Falls back to Italian if the language or key is not found. */
export function getLegalDoc(lang: Lang, docKey: string): LegalDoc | undefined {
  const langDocs = LEGAL_DOCS_BY_LANG[lang] ?? LEGAL_DOCS_BY_LANG.it;
  return langDocs[docKey] ?? (LEGAL_DOCS_BY_LANG.it[docKey] ?? undefined);
}

/** Backward-compatible default record (Italian). */
export const LEGAL_DOCS: Record<string, LegalDoc> = LEGAL_DOCS_BY_LANG.it;
