/**
 * Tooltip explanations for pricing tier features.
 *
 * Organized by category. Import in components that render PriceCard:
 *   import { TOOLTIP_MAP } from '@/lib/tooltips';
 *
 * To add a new tooltip, add a key matching the feature string exactly.
 */

export const TOOLTIP_MAP: Record<string, string> = {
  // ─── Sviluppo Web ─────────────────────────────────
  'SEO tecnico e performance': 'Ottimizzazione per motori di ricerca: struttura semantica, Core Web Vitals, velocità di caricamento e meta tag ottimizzati.',
  'Sviluppo Next.js / React': 'Framework React con rendering ibrido (SSR + SSG), routing avanzato, immagini ottimizzate e API built-in per performance e SEO nativi.',
  'UI/UX design personalizzato': 'Interfaccia utente progettata su misura per il tuo brand, con wireframe, prototipi interattivi e design system coerente.',
  'Responsive e mobile-first': 'Il sito si adatta perfettamente a qualsiasi dispositivo (mobile, tablet, desktop) partendo dal design per schermi piccoli.',
  'Consegna in 2-3 settimane': 'Tempi di consegna chiari e rispettati: dalla firma del contratto al go-live, con milestone intermedie e aggiornamenti settimanali.',
  'Architettura full-stack scalabile': 'Backend e frontend progettati per crescere con il tuo business, con bilanciamento del carico e caching stratificato.',
  'Backend e API integrate': 'API REST/GraphQL per connettere frontend, app mobili, servizi esterni e database in un\'unica architettura coesa.',
  'Autenticazione e database': 'Sistema di login sicuro (OAuth, 2FA, magic link) e database relazionale ottimizzato per performance e affidabilità.',
  'Pannello admin e dashboard': 'Interfaccia di amministrazione per gestire contenuti, utenti e dati senza toccare codice. Personalizzabile alle tue esigenze.',
  'Deploy e CI/CD inclusi': 'Rilascio automatico su cloud (Vercel, AWS, Netlify) con pipeline di integrazione continua, test automatici e rollback immediato.',
  'Architettura cloud scalabile': 'Infrastruttura su cloud provider (AWS, GCP, Azure) con auto-scaling, load balancing e replica multi-region per alta disponibilità.',
  'Multi-tenancy e ruoli avanzati': 'Architettura multi-cliente: ogni utente o azienda ha il proprio spazio isolato con ruoli, permessi e personalizzazioni separate.',
  'Supporto e manutenzione 6 mesi': 'Assistenza post-lancio per 6 mesi: bug fix, aggiornamenti di sicurezza, backup e supporto tecnico prioritario.',
  'Integrazioni API di terze parti': 'Connessione con servizi esterni come Stripe, HubSpot, Salesforce, Google Analytics, social login e altre API di terze parti per estendere le funzionalità del progetto.',

  // ─── Design ──────────────────────────────────────
  'Brand guidelines base': 'Documento che definisce regole di utilizzo del brand: logo, colori, font, tono di voce e applicazioni corrette per mantenere coerenza visiva.',
  'Carte da visita digitali': 'Biglietti da visita in formato digitale (vCard, PDF, link condivisibile) pronti per email, WhatsApp e social, con QR code integrato.',
  'Formati ottimizzati per ogni piattaforma': 'Ogni grafica viene esportata nelle dimensioni e specifiche corrette per Instagram, Facebook, LinkedIn, YouTube, TikTok e web: niente più ritagli o distorsioni.',
  'Materiali marketing coordinati': 'Set completo di materiali promozionali con stessa identità visiva: flyer, brochure, banner, cartellonistica, presentazioni e template email.',
  'Grafiche per streamer': 'Branding completo per live streaming: overlay, webcam border, scene di attesa, alert per follower/donazioni, pannelli e emotes personalizzati.',
  'Brand strategy e posizionamento': 'Definizione della strategia di marca: mission, vision, valori, target audience, tone of voice e posizionamento rispetto ai competitor.',
  'Visual identity completa (logo, colori, font, pattern)': 'Sistema visivo completo che include logo primario e secondario, palette estesa, tipografia, pattern decorativi e applicazioni su tutti i touchpoint.',
  'Graphic system per social e print': 'Sistema di template grafici riutilizzabili per mantenere coerenza visiva su tutti i canali social (post, storie, cover) e materiali stampa (biglietti, folder, locandine).',
  'Linee guida e asset kit completi': 'Kit completo di tutti gli asset del brand in formati vettoriali e raster, accompagnato da linee guida dettagliate per designer, fornitori e partner.',
  'Strategia editoriale visuale': 'Calendario editoriale basato su obiettivi di business, con pianificazione dei contenuti visivi, frequenza di pubblicazione e mix di formati per massimizzare l\'engagement.',
  'Cover art e thumbnail YouTube': 'Miniature personalizzate per video YouTube ottimizzate per CTR: composizione, colori contrastanti, testo leggibile e brand consistency su tutto il canale.',
  'Workshop creativi e report strategico': 'Sessioni collaborative di brainstorming e co-design per allineare visione e obiettivi, seguite da report mensile con KPI, insight e raccomandazioni strategiche.',

  // ─── Software & App ──────────────────────────────
  'Design system completo': 'Libreria di componenti UI riutilizzabili con regole di design coerenti, documentate e pronte per scalare.',
  'PWA o app mobile (React Native)': 'Progressive Web App: applicazione web che si installa sul dispositivo come un\'app nativa, con accesso offline e notifiche push.',
  'API pubbliche e documentazione': 'Interfacce REST/GraphQL documentate con Swagger per permettere a sviluppatori esterni di integrare i tuoi servizi.',
  'GDPR, audit e compliance': 'Conformità al Regolamento Generale sulla Protezione dei Dati (GDPR) e preparazione per audit di sicurezza e certificazioni.',
  'GDPR e compliance inclusi': 'Conformità GDPR inclusa nel progetto: valutazione impatto dati, cookie policy, privacy policy e documentazione compliance pronta per certificazioni.',
  'SLA garantito e team dedicato': 'Service Level Agreement: impegno contrattuale su tempi di risposta, disponibilità del servizio e penali in caso di disservizio.',
  'DevOps, CI/CD e monitoraggio 24/7': 'Pipeline di Continuous Integration/Deployment per rilasci automatizzati, test automatici e monitoraggio proattivo h24.',
  'Sprint bisettimanali': 'Cicli di sviluppo agili di 2 settimane: pianificazione, sviluppo, demo e retrospettiva per miglioramento continuo.',
  'SRE e monitoraggio 24/7': 'Site Reliability Engineering: gestione proattiva dell\'infrastruttura con automazione, alerting e risposta agli incidenti.',
  'Codebase proprietaria e IP tuo': 'Tutto il codice sorgente sviluppato è di tua esclusiva proprietà intellettuale, senza vincoli o licenze di terze parti.',
  'Roadmap co-gestita trimestrale': 'Pianificazione strategica condivisa ogni 3 mesi per allineare sviluppo e obiettivi di business.',
  'Report strategico mensile': 'Report mensile con KPI, analytics, andamento progetto e raccomandazioni strategiche basate sui dati.',

  // ─── Content & Video ─────────────────────────────
  'Content strategy e copywriting': 'Strategia editoriale completa: tone of voice, calendario contenuti e testi persuasivi ottimizzati per il tuo pubblico.',
  'Post-produzione broadcast': 'Montaggio e color grading con standard qualitativi per televisione, cinema e piattaforme streaming professionali.',
  'Footage library esclusiva': 'Archivio privato di footage video (stock, B-roll, riprese originali) accessibile solo al tuo brand.',
};
