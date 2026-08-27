export type Lang = 'it' | 'en' | 'es';

import { getDesignWorks } from './design-works';

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'it', label: 'IT' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
];

export const DEFAULT_LANG: Lang = 'it';

/** Map country codes to default languages */
export const COUNTRY_LANG: Record<string, Lang> = {
  IT: 'it', VA: 'it', SM: 'it',  // Italy + microstates
  ES: 'es', AD: 'es',            // Spain + Andorra
  GB: 'en', US: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en', // English countries
};

export function countryToLang(countryCode: string): Lang {
  return COUNTRY_LANG[countryCode?.toUpperCase()] || 'en';
}

// ─── Translation dictionary ─────────────────────────────────────

type Dict = Record<string, string>;

const it: Dict = {
  // Navbar
  'nav.servizi': 'Servizi',
  'nav.prezzi': 'Prezzi',
  'nav.processo': 'Processo',
  'nav.progetti': 'Progetti',
  'nav.chisono': 'Chi sono',
  'nav.recensioni': 'Recensioni',
  'nav.faq': 'FAQ',
  'nav.contattami': 'Contattami',
  'nav.raccontami': 'Raccontami la tua idea',
  'nav.brand_graphic': 'Brand & Graphic',
  'nav.sviluppo_web': 'Sviluppo Web',
  'nav.software_app': 'Software & App',
  'nav.video_making': 'Video Making',
  'nav.design': 'Design',
  'nav.software': 'Software',

  // Hero
  'hero.tag': 'Designer • Sviluppatore • Videomaker',
  'hero.line1': 'Il perfetto equilibrio',
  'hero.line2a': 'tra',
  'hero.line2b': 'estetica',
  'hero.line2c': 'e',
  'hero.line2d': 'ingegneria',
  'hero.line2e': '.',
  'hero.subtitle': 'Progetto e sviluppo app, software, siti web e produzioni video. Design, codice e immagine in un unico professionista.',
  'hero.cta_quote': 'Richiedi preventivo',
  'hero.cta_prices': 'Vedi i prezzi',
  'hero.cta_work': 'Vedi i lavori',
  'hero.stat_clients': 'Clienti soddisfatti',
  'hero.stat_response': 'Tempo di risposta',
  'hero.stat_payment': 'Metodo di pagamento',

  // Servizi
  'servizi.title': 'Servizi',
  'servizi.subtitle': 'Sei aree, un unico approccio: design, web, software, video, hardware e social media. Per ogni esigenza digitale, con soluzioni su misura.',
  'servizi.slider_label': 'Servizi — scorri orizzontalmente',
  'servizi.label': 'Cosa offro',
  'servizi.brand': 'Brand & Logo',
  'servizi.brand_desc': 'Marchi, logotipi, palette, tipografia e identità visiva completa.',
  'servizi.graphic': 'Grafica & Social',
  'servizi.graphic_desc': 'Post social, thumbnail YouTube, grafiche streamer, locandine, flyer, poster e materiali marketing.',
  'servizi.uiux': 'UI/UX Design',
  'servizi.uiux_desc': 'Interfacce web e app, wireframe interattivi, prototipazione avanzata e design system scalabili.',
  'servizi.webdev': 'Sviluppo Web',
  'servizi.webdev_desc': 'Siti web, dashboard, e-commerce e applicazioni frontend/backend con Next.js, React e Vue.js. Mobile-first e responsive su ogni dispositivo.',
  'servizi.software': 'Software & App',
  'servizi.software_desc': 'App mobile, software su misura, API, database, architetture cloud e automazioni.',
  'servizi.video_content': 'Contenuti Video',
  'servizi.video_content_desc': 'Reel, short, contenuti social e riprese leggere ottimizzati per ogni piattaforma.',
  'servizi.video_post': 'Post-Produzione',
  'servizi.video_post_desc': 'Montaggio avanzato, color grading, motion graphics e VFX per produzioni professionali.',
  'servizi.hardware': 'Informatica Hardware',
  'servizi.hardware_desc': 'Diagnosi, riparazione e upgrade PC, configurazioni, manutenzione e consulenza IT su misura.',
  'servizi.social': 'Social Media',
  'servizi.social_desc': 'Post, carousel, stories, thumbnail e contenuti social creati in base alla tua identità e ai tuoi obiettivi.',
  'servizi.audit': 'Audit Gratuito',
  'servizi.audit_desc': 'Analisi gratuita di velocità, SEO e mobile del tuo sito attuale, con un report concreto dei miglioramenti possibili.',
  'servizi.perf': 'Performance & Velocità',
  'servizi.perf_desc': 'Sito lento? Ottimizzo caricamento e Core Web Vitals (LCP, CLS, TBT) con risultati garantiti e misurabili.',
  'servizi.multilingua': 'Siti Multilingua',
  'servizi.multilingua_desc': 'Traduco e adatto il tuo sito in più lingue con hreflang, URL dedicate e SEO per-lingua, come su questo sito.',
  'servizi.chatbot': 'Chatbot & AI',
  'servizi.chatbot_desc': 'Un assistente AI sul tuo sito che risponde 24/7 ai clienti e raccoglie lead e preventivi in automatico.',
  'servizi.migrazione': 'Migrazione & Hosting',
  'servizi.migrazione_desc': 'Sposto il tuo sito da hosting lenti e obsoleti a infrastrutture moderne: CDN, immagini ottimizzate e tempi di risposta inferiori.',
  'servizi.growth_cat': 'Sviluppo & Performance',
  'servizi.existing_label': 'Per il tuo sito esistente',
  'servizi.existing_title': 'Servizi per chi ha già un sito',
  'servizi.existing_subtitle': 'Non serve rifare tutto da zero: miglioro quello che hai già con interventi mirati e risultati misurabili.',
  'servizi.ask': 'Richiedi',
  'servizi.hardware_cat': 'Hardware',
  'servizi.social_cat': 'Social',
  'servizi.design_cat': 'Design',
  'servizi.webdev_cat': 'Web Dev',
  'servizi.software_cat': 'Software',
  'servizi.video_cat': 'Video',
  'servizi.other_cat': 'Altro',

  // Processo
  'processo.label': 'Come lavoro',
  'processo.title': 'Il mio processo',
  'processo.subtitle': 'Sei fasi chiare per trasformare la tua idea in un prodotto finito, senza sorprese.',
  'processo.step1_title': 'Consulenza',
  'processo.step1_desc': 'Prenotiamo una call gratuita. Parliamo della tua idea, dei tuoi obiettivi e del risultato che vuoi ottenere.',
  'processo.step2_title': 'Analisi & Preventivo',
  'processo.step2_desc': 'Valuto la fattibilità, gli strumenti migliori e i tempi. Ti invio un preventivo chiaro, senza costi nascosti.',
  'processo.step3_title': 'Progettazione',
  'processo.step3_desc': 'Definisco la direzione creativa: bozze, moodboard, struttura o storyboard. Raffiniamo insieme ogni dettaglio.',
  'processo.step4_title': 'Realizzazione',
  'processo.step4_desc': 'Eseguo il lavoro: che sia codice, grafiche, riprese o montaggio. Ti tengo aggiornato a ogni milestone.',
  'processo.step5_title': 'Revisione',
  'processo.step5_desc': 'Controllo ogni dettaglio, ottimizzo il risultato e raccolgo il tuo feedback per le rifiniture finali.',
  'processo.step6_title': 'Consegna',
  'processo.step6_desc': 'Ti consegno tutto: file sorgente, documentazione e assistenza post-consegna. Il progetto è tuo al 100%.',

  // Prezzi
  'prezzi.title': 'Prezzi',
  'prezzi.subtitle': 'Ogni progetto ha un preventivo dedicato. Qui trovi una stima indicativa per orientarti.',
  'prezzi.slider_label': 'Pacchetti — scorri orizzontalmente',
  'prezzi.label': 'Tariffe trasparenti',
  'prezzi.onetime': 'Una tantum',
  'prezzi.monthly': 'Collaborazione',
  'prezzi.cta': 'Richiedi preventivo',
  'prezzi.popular': 'Più scelto',
  'prezzi.from': 'da',
  'prezzi.rapid': 'Consegna rapida',
  'prezzi.custom': 'Su misura per te',
  'prezzi.slots_note': 'Solo 2 slot liberi a {month}',
  'prezzi.slots_one': 'Solo 1 slot libero a {month}',
  'prezzi.slots_other': 'Solo {count} slot liberi a {month}',
  'prezzi.vat_note': 'I prezzi sono indicativi e si intendono al netto di IVA e oneri di legge. Ogni progetto ha un preventivo dedicato e gratuito.',
  'prezzi.flex_note': 'Piani flessibili: termini chiari concordati in fase di contratto. Puoi interrompere la collaborazione quando vuoi.',

  // Chi sono
  'chisono.title': 'Tia Chinaglia',
  'chisono.label': 'Chi sono',
  'chisono.bio': 'Libero professionista con sede a Mantova, opero in tutta Italia e all\'estero. Nessun template, nessun compromesso: ogni progetto è costruito su misura, dal design allo sviluppo, con le tecnologie più adatte al caso specifico. Credo nella trasparenza totale e nella comunicazione diretta — per questo garantisco risposte rapide, preventivi chiari e aggiornamenti costanti in ogni fase del lavoro. Unisco competenze tecniche avanzate a una forte sensibilità estetica, portando ogni progetto dal concept iniziale fino alla pubblicazione.',
  'chisono.why_title': 'Perché scegliere un freelance',
  'chisono.why_1': 'Comunicazione diretta — parli sempre con chi fa il lavoro',
  'chisono.why_2': 'Costi più bassi di un\'agenzia — niente margini di intermediazione',
  'chisono.why_3': 'Personalizzazione totale — nessun template, ogni progetto è unico',
  'chisono.why_4': 'Risposte rapide in meno di 24 ore — niente ticket né livelli di supporto',

  // Skills section titles
  'chisono.skills_design': 'Design',
  'chisono.skills_webdev': 'Sviluppo Web',
  'chisono.skills_backend': 'Linguaggi & Backend',
  'chisono.skills_ai': 'AI & Automazione',
  'chisono.skills_visual': 'Produzione Visiva',
  'chisono.skills_it': 'IT & Hardware',

  // Progetti
  'progetti.title': 'Progetti recenti',
  'progetti.label': 'Portfolio',
  'progetti.subtitle': 'Una selezione dei miei lavori più recenti.',
  'progetti.slider_label': 'Progetti — scorri orizzontalmente',
  'progetti.visit': 'Visita progetto',
  'progetti.watch': 'Guarda il video',
  'progetti.quote': 'Preventivo',
  'progetti.filter_all': 'Tutti',

  // Recensioni
  'recensioni.title': 'Cosa dicono i clienti',
  'recensioni.label': 'Testimonianze',
  'recensioni.view_project': 'Guarda il progetto',

  // FAQ
  'faq.title': 'Domande frequenti',
  'faq.label': 'Dubbi?',
  'faq.subtitle': 'Hai dei dubbi? Qui trovi le risposte alle domande più comuni. Se non trovi ciò che cerchi, scrivimi.',

  // ServiceSelect options
  'servizi.option_brand_logo': 'Brand & Logo',
  'servizi.option_graphic_social': 'Grafica & Social',
  'servizi.option_uiux': 'UI/UX Design',
  'servizi.option_website': 'Sito Web',
  'servizi.option_software_app': 'Software & App',
  'servizi.option_video_content': 'Contenuti Video',
  'servizi.option_post_prod': 'Post-Produzione',
  'servizi.option_hardware': 'Informatica Hardware',
  'servizi.option_social': 'Social Media',
  'servizi.option_audit': 'Audit Gratuito',
  'servizi.option_perf': 'Performance & Velocità',
  'servizi.option_multilingua': 'Siti Multilingua',
  'servizi.option_chatbot': 'Chatbot & AI',
  'servizi.option_migrazione': 'Migrazione & Hosting',
  'servizi.option_other': 'Altro',

  // Contatti
  'contatti.title': 'Contatti',
  'contatti.label': 'Parliamone',
  'contatti.subtitle': 'Raccontami il tuo progetto. Ti risponderò entro 24 ore.',
  'contatti.name': 'Nome *',
  'contatti.email': 'Email *',
  'contatti.service': 'Servizio',
  'contatti.message': 'Messaggio *',
  'contatti.select': 'Seleziona un servizio',
  'contatti.send': 'Invia messaggio',
  'contatti.sending': 'Invio...',
  'contatti.sent': 'Inviato!',
  'contatti.error': 'Errore — Riprova',
  'contatti.placeholder_name': 'Il tuo nome',
  'contatti.placeholder_email': 'tua@email.com',
  'contatti.placeholder_message': 'Descrivi il tuo progetto...',
  'contatti.email_label': 'Email',
  'contatti.phone_label': 'Telefono',
  'contatti.whatsapp_label': 'Messaggio veloce',
  'contatti.location': 'Mantova, Italia',
  'contatti.response_time': 'Risposta entro 24h',
  'contatti.vat_invoice': 'P.IVA · Fattura elettronica',
  'contatti.call_label': 'Call conoscitiva',
  'contatti.call_title': 'Prenota una call conoscitiva gratuita',
  'contatti.call_subtitle': 'Parliamo del tuo progetto senza impegno: capisco cosa ti serve, ti do un\'idea dei costi e dei tempi, e decidiamo insieme come procedere.',
  'contatti.call_button': 'Prenota una call gratuita',
  'contatti.call_button_sub': '30 minuti, senza impegno',
  'contatti.call_close': 'Chiudi',
  'contatti.call_newtab': 'Apri in nuova scheda',

  // Footer
  'footer.desc': 'Designer, sviluppatore app e software, videomaker. Trasformo idee in prodotti digitali completi.',
  'footer.servizi': 'Servizi',
  'footer.links': 'Link',
  'footer.contatti': 'Contatti',
  'footer.uxui': 'UX/UI Design',
  'footer.sviluppo_app': 'Sviluppo App',
  'footer.sviluppo_software': 'Sviluppo Software',
  'footer.video_making': 'Video Making',
  'footer.consulenza': 'Consulenza',
  'footer.progetti': 'Progetti',
  'footer.chisono': 'Chi sono',
  'footer.processo': 'Processo',
  'footer.prezzi': 'Prezzi',
  'footer.recensioni': 'Recensioni',
  'footer.faq_link': 'FAQ',
  'footer.privacy': 'Privacy e sicurezza',
  'footer.cookie': 'Cookie policy',
  'footer.termini': 'Termini e condizioni', 'footer.cookie_prefs': 'Preferenze cookie',
  'legal.updated': 'Ultimo aggiornamento',
  'legal.close': 'Chiudi',
  'legal.toc': 'Indice dei contenuti',
  'legal.understood': 'Ho capito',


  'footer.master_portal': 'Master Portal',
  'footer.copyright': '© 2026 Tia Designs. Tutti i diritti riservati.',
  'footer.location': 'Mantova, Italia',
  'footer.timezone': 'GMT+2',
  'footer.referral': 'Programma referral: porta un cliente e ricevi il 10% di sconto sul prossimo progetto',

  // Chat
  'chat.open': 'Apri chat',
  'chat.title': 'Chatta con me in tempo reale',
  'chat.ai_title': 'Chatta con la AI di Tia Designs',
  'chat.placeholder': 'Scrivi un messaggio...',
  'chat.auto_reply': 'Grazie per avermi scritto! Ti risponderò a breve.',
  'chat.welcome': 'Ciao! Questa è una chat diretta con me, Tia Chinaglia. Raccontami cosa hai in mente e ti risponderò personalmente.',
  'chat.offline_reply': 'In questo momento non sono disponibile. Ho ricevuto il tuo messaggio e ti risponderò appena possibile.',
  'chat.send_error': 'Messaggio non consegnato: riprova tra qualche secondo.',
  'chat.send': 'Invia messaggio',
  'chat.fullscreen_title': 'Scrivi il messaggio',
  'chat.fullscreen_hint': 'Puoi scrivere liberamente: più dettagli dai, più preciso sarà il preventivo.',
  'chat.fullscreen_tip': 'Tocca l\'icona per aprire la barra a schermo intero e scrivere comodamente.',
  'chat.fullscreen_close': 'Annulla',
  'chat.bot_placeholder': 'Descrivi il tuo progetto…',
  'chat.bot_empty': 'Raccontami cosa hai in mente. Scegli una specializzazione e scrivimi di un sito, un\'app, un brand, un video, il tuo PC o i tuoi contenuti social. Ti darò un\'idea dei costi e dei tempi prima di preparare il preventivo.',
  'bot.welcome_category': 'Ciao! Sono l\'**AI di Tia Designs**, l\'assistente di Tia. Scegli una specializzazione tra le bolle del messaggio di benvenuto, oppure scrivimi direttamente cosa hai in mente. Ricorda: **cambiando specializzazione avvierai una nuova chat** e questa conversazione verrà eliminata.',
  'bot.budget_ask': 'Prima di tutto, puoi indicarmi quanto budget hai in mente?',
  'bot.offtopic_block': 'Hai esaurito il tempo per scrivere cose serie: la chat è in pausa per 30 minuti. Torna più tardi e sarò qui per aiutarti con i servizi di Tia.',
  'bot.offtopic_blocked_hint': 'Chat in pausa — riprova tra 30 minuti',
  'chat.empty_heading': 'Come posso aiutarti oggi?',
  'chat.welcome_short': 'Posso aiutarti a farti un preventivo perfetto per il tuo progetto. Scegli una specializzazione qui sotto oppure descrivimi direttamente la tua idea.',
  'chat.new_chat': 'Nuova chat',
  'chat.new_chat_tip': 'Crea una nuova chat: elimina quella attuale e potrai scegliere una specializzazione tra le bolle di benvenuto.',
  'chat.empty_intro': 'Sono Tia Chinaglia. Raccontami cosa hai in mente.',
  'chat.service_start': 'Vorrei un preventivo per {service}',
  'chat.category_label': 'Specializzazione',
  'chat.category_single': 'Una categoria alla volta',
  'chat.category_software_web': 'Software e Web',
  'chat.category_design': 'Design',
  'chat.category_video': 'Video',
  'chat.category_hardware': 'Hardware',
  'chat.category_social': 'Social',
  'chat.category_other': 'Altro',
  'chat.category_general': 'Generale',
  'chat.example_general': 'Hai un progetto che non rientra nelle categorie? Parti da qui e ci capiamo subito.',
  'chat.placeholder_general': 'Descrivi il tuo progetto…',
  'chat.example_software_web': 'Esempio: “Ho bisogno di un e-commerce con catalogo, pagamenti e area admin.”',
  'chat.example_design': 'Esempio: “Vorrei un’identità visiva completa per il mio nuovo brand.”',
  'chat.example_video': 'Esempio: “Mi servono tre reel verticali per il lancio di un prodotto.”',
  'chat.example_hardware': 'Esempio: “Il mio PC è lento: puoi aiutarmi con diagnosi, upgrade o riparazione?”',
  'chat.example_social': 'Esempio: “Vorrei un piano di post e carousel coerenti con il mio brand.”',
  'chat.example_other': 'Esempio: “Ho un progetto particolare: ti spiego cosa mi serve.”',
  'chat.placeholder_software_web': 'Descrivi il tuo sito, software o app…',
  'chat.placeholder_design': 'Descrivi il tuo progetto di design…',
  'chat.placeholder_video': 'Descrivi il video o i contenuti che immagini…',
  'chat.placeholder_hardware': 'Descrivi il problema o la configurazione hardware…',
  'chat.placeholder_social': 'Descrivi i tuoi obiettivi social…',
  'chat.placeholder_other': 'Raccontami il tuo progetto…',
  'chatbot.title': 'Calcola il tuo preventivo',
  'chatbot.subtitle': 'Descrivi il tuo progetto e riceverai un preventivo personalizzato via email in poche ore.',

  // Language popup
  'lang.popup_title': 'Sembra che tu sia in',
  'lang.popup_question': 'Vuoi cambiare lingua?',
  'lang.popup_keep': 'Resta in ',
  'lang.popup_switch': 'Passa a ',
  'lang.banner_text': 'Sembra che tu sia in {country}. Scegli la lingua del sito per una migliore esperienza:',
  'lang.banner_continue': 'Continua',
  'lang.banner_close': 'Chiudi',

  // Tooltips
  'tooltip.enterprise_deadline': 'La deadline definitiva viene concordata insieme dopo aver analizzato il progetto. Ogni progetto enterprise ha tempistiche personalizzate.',
  'tooltip.rapid_delivery': 'Questo servizio ha tempi di consegna ridotti, perfetto per esigenze urgenti.',

  // Bot errors
  'bot.error_server': 'C’è stato un piccolo problema mentre preparavo la risposta. Riprova tra poco.',
  'bot.error_no_response': 'Non ho ricevuto una risposta questa volta. Riprova tra poco e continuiamo insieme.',
  'bot.error_connection': 'La risposta si è interrotta. Riprova tra poco.',
  'bot.tooltip_raccontami': 'Parlami del tuo progetto — l\'AI di Tia ti guida al preventivo perfetto',
  'bot.preventivo_ready': 'Ho quasi tutto pronto per il preventivo.',
  'bot.invalid_name': 'Inserisci un nome valido, senza numeri o caratteri speciali.',
  'bot.invalid_email': 'Inserisci un indirizzo email valido.',
  'bot.invalid_service': 'Seleziona un servizio per continuare.',
  'bot.details_saved': 'Perfetto, ora completo il preventivo personalizzato.',
  'bot.complete_details': 'Mi servono ancora questi dati per preparare il preventivo:',
  'bot.continue_quote': 'Continua la chat',
  'bot.identity_submitted': 'Mi chiamo {name} e la mia email è {email}.',
  'bot.name_submitted': 'Mi chiamo {name}.',
  'bot.email_submitted': 'La mia email è {email}.',
  'bot.budget_submitted': 'Ho indicato un budget di circa €{value}.',
  'bot.inappropriate': 'Posso aiutarti con un progetto o un servizio di Tia. Per favore riformula la richiesta in modo rispettoso e raccontami cosa vuoi realizzare.',
  'bot.message_required': 'Descrivi almeno qualche dettaglio del progetto prima di inviare il messaggio.',
  'bot.quote_not_ready': 'Per preparare un preventivo accurato mi servono ancora alcuni dettagli sul progetto. Continuiamo qui: cosa deve includere e qual è il risultato che vuoi ottenere?',
  'bot.quote_review': 'Ho preparato un riepilogo del tuo progetto. Se ti va bene, lo mando a Tia che ti preparerà un preventivo personalizzato via email.',
  'bot.approve_quote': 'Sì, manda il riepilogo a Tia',
  'bot.sending_quote': 'Invio in corso…',
  'bot.revise_quote': 'No, voglio modificarlo',
  'bot.quote_sent': 'Perfetto! Ho mandato il riepilogo a Tia. Ti preparerà il preventivo e te lo invierà all\'email che mi hai dato.',
  'bot.quote_revision_started': 'Va bene, continuiamo a perfezionare il progetto insieme.',
  'bot.revision_waiting': 'Va bene! Dimmi pure cosa vuoi modificare o aggiungere al preventivo (servizio, funzionalità, budget, contenuti): sistemo tutto in base a quello che mi scrivi.',
  'bot.revise_prompt': 'Vorrei modificare o integrare il preventivo: aiutami a rivedere la bozza in base a quello che ti scrivo ora.',
  'bot.quote_invalid': 'Non posso inviare questo preventivo perché il nome, l’email o il contenuto non supera i controlli. Correggiamo i dati e riproviamo.',
  'bot.quote_send_error': 'Non sono riuscito a inviare il preventivo. I dati restano nella chat: riprova tra poco.',

  // Navbar
  'nav.menu': 'Menu',

  // Cookie banner
  'cookie.title': 'Preferenze cookie',
  'cookie.desc': "Utilizziamo cookie tecnici essenziali e, con il tuo consenso, cookie analitici per capire come navighi il sito e migliorare la tua esperienza",
  'cookie.learn_more': 'Saperne di più',
  'cookie.accept_all': 'Accetta tutti',
  'cookie.necessary': 'Solo necessari',
  'cookie.reject': 'Rifiuta',
  'cookie.saved': 'La tua scelta sarà salvata per 12 mesi',
};

const en: Dict = {
  'nav.servizi': 'Services',
  'nav.prezzi': 'Pricing',
  'nav.processo': 'Process',
  'nav.progetti': 'Projects',
  'nav.chisono': 'About',
  'nav.recensioni': 'Reviews',
  'nav.faq': 'FAQ',
  'nav.contattami': 'Contact',
  'nav.raccontami': 'Tell me about your idea',
  'nav.brand_graphic': 'Brand & Graphic',
  'nav.sviluppo_web': 'Web Development',
  'nav.software_app': 'Software & Apps',
  'nav.video_making': 'Video Making',
  'nav.design': 'Design',
  'nav.software': 'Software',

  'hero.tag': 'Designer • Developer • Videomaker',
  'hero.line1': 'The perfect balance',
  'hero.line2a': 'between',
  'hero.line2b': 'aesthetics',
  'hero.line2c': 'and',
  'hero.line2d': 'engineering',
  'hero.line2e': '.',
  'hero.subtitle': 'I design and develop apps, software, websites, and video productions. Design, code, and imagery in a single professional.',
  'hero.cta_quote': 'Request a quote',
  'hero.cta_prices': 'See pricing',
  'hero.cta_work': 'See my work',
  'hero.stat_clients': 'Happy clients',
  'hero.stat_response': 'Response time',
  'hero.stat_payment': 'Payment method',

  'servizi.title': 'Services',
  'servizi.subtitle': 'Six areas, one approach: design, web, software, video, hardware, and social media. Tailored solutions for every digital need.',
  'servizi.slider_label': 'Services — scroll horizontally',
  'servizi.label': 'What I offer',
  'servizi.brand': 'Brand & Logo',
  'servizi.brand_desc': 'Logos, color palettes, typography, and complete visual identity.',
  'servizi.graphic': 'Graphic & Social',
  'servizi.graphic_desc': 'Social posts, YouTube thumbnails, streamer graphics, flyers, posters, and marketing materials.',
  'servizi.uiux': 'UI/UX Design',
  'servizi.uiux_desc': 'Web and app interfaces, interactive wireframes, advanced prototyping, and scalable design systems.',
  'servizi.webdev': 'Web Development',
  'servizi.webdev_desc': 'Websites, dashboards, e-commerce, and frontend/backend applications with Next.js, React, and Vue.js. Mobile-first and responsive on every device.',
  'servizi.software': 'Software & Apps',
  'servizi.software_desc': 'Mobile apps, custom software, APIs, databases, cloud architectures, and automations.',
  'servizi.video_content': 'Video Content',
  'servizi.video_content_desc': 'Reels, shorts, social content, and lightweight shooting optimized for every platform.',
  'servizi.video_post': 'Post-Production',
  'servizi.video_post_desc': 'Advanced editing, color grading, motion graphics, and VFX for professional productions.',
  'servizi.hardware': 'Computer Hardware & IT',
  'servizi.hardware_desc': 'PC diagnosis, repairs, upgrades, configurations, maintenance, and tailored IT consulting.',
  'servizi.social': 'Social Media',
  'servizi.social_desc': 'Posts, carousels, stories, thumbnails, and social content shaped around your identity and goals.',
  'servizi.audit': 'Free Audit',
  'servizi.audit_desc': 'Free analysis of speed, SEO, and mobile experience of your current site, with a concrete report of possible improvements.',
  'servizi.perf': 'Performance & Speed',
  'servizi.perf_desc': 'Slow site? I optimize loading and Core Web Vitals (LCP, CLS, TBT) with guaranteed, measurable results.',
  'servizi.multilingua': 'Multilingual Websites',
  'servizi.multilingua_desc': 'I translate and adapt your site into multiple languages with hreflang, dedicated URLs, and per-language SEO — just like this site.',
  'servizi.chatbot': 'Chatbot & AI',
  'servizi.chatbot_desc': 'An AI assistant on your site that answers clients 24/7 and collects leads and quotes automatically.',
  'servizi.migrazione': 'Migration & Hosting',
  'servizi.migrazione_desc': 'I move your site from slow, outdated hosting to modern infrastructure: CDN, optimized images, and faster response times.',
  'servizi.growth_cat': 'Growth & Performance',
  'servizi.existing_label': 'For your existing site',
  'servizi.existing_title': 'Services for businesses that already have a site',
  'servizi.existing_subtitle': 'No need to rebuild from scratch: I improve what you already have with targeted, measurable interventions.',
  'servizi.ask': 'Request',
  'servizi.hardware_cat': 'Hardware',
  'servizi.social_cat': 'Social',
  'servizi.design_cat': 'Design',
  'servizi.webdev_cat': 'Web Dev',
  'servizi.software_cat': 'Software',
  'servizi.video_cat': 'Video',
  'servizi.other_cat': 'Other',

  'processo.label': 'How I work',
  'processo.title': 'My process',
  'processo.subtitle': 'Six clear steps to turn your idea into a finished product, with no surprises.',
  'processo.step1_title': 'Consultation',
  'processo.step1_desc': 'We book a free call. We talk about your idea, your goals and the result you want to achieve.',
  'processo.step2_title': 'Analysis & Quote',
  'processo.step2_desc': 'I evaluate feasibility, the best tools and timelines. I send you a clear quote with no hidden costs.',
  'processo.step3_title': 'Design & Planning',
  'processo.step3_desc': 'I define the creative direction: drafts, moodboards, structure or storyboard. We refine every detail together.',
  'processo.step4_title': 'Production',
  'processo.step4_desc': 'I execute the work: whether it is code, graphics, filming or editing. I keep you posted at every milestone.',
  'processo.step5_title': 'Review',
  'processo.step5_desc': 'I check every detail, optimise the result and collect your feedback for the final touches.',
  'processo.step6_title': 'Delivery',
  'processo.step6_desc': 'I deliver everything: source files, documentation and post-delivery support. The project is 100% yours.',

  'prezzi.title': 'Pricing',
  'prezzi.subtitle': 'Every project gets a custom quote. Here is an indicative estimate to guide you.',
  'prezzi.slider_label': 'Packages — scroll horizontally',
  'prezzi.label': 'Transparent pricing',
  'prezzi.onetime': 'One-time',
  'prezzi.monthly': 'Retainer',
  'prezzi.cta': 'Request a quote',
  'prezzi.popular': 'Most popular',
  'prezzi.from': 'from',
  'prezzi.rapid': 'Fast delivery',
  'prezzi.custom': 'Tailored for you',
  'prezzi.slots_note': 'Only 2 slots left in {month}',
  'prezzi.slots_one': 'Only 1 slot left in {month}',
  'prezzi.slots_other': 'Only {count} slots left in {month}',
  'prezzi.vat_note': 'Prices are indicative and exclusive of VAT and applicable charges. Every project gets a dedicated, free quote.',
  'prezzi.flex_note': 'Flexible plans: clear terms agreed at contract time. You can cancel the collaboration whenever you want.',

  'chisono.title': 'Tia Chinaglia',
  'chisono.label': 'About',
  'chisono.bio': 'Independent professional based in Mantova, Italy, working with clients across Europe. No templates, no compromises: every project is custom-built, from design to development, using the technology stack that best fits the specific case. I believe in total transparency and direct communication — that means fast responses, clear quotes, and constant updates at every stage. I combine advanced technical skills with a strong aesthetic sense, taking every project from initial concept to final launch.',
  'chisono.why_title': 'Why choose a freelancer',
  'chisono.why_1': 'Direct communication — you always talk to the person doing the work',
  'chisono.why_2': 'Lower costs than an agency — no middleman margins',
  'chisono.why_3': 'Total customization — no templates, every project is unique',
  'chisono.why_4': 'Fast answers in under 24 hours — no tickets or support tiers',

  'chisono.skills_design': 'Design',
  'chisono.skills_webdev': 'Web Development',
  'chisono.skills_backend': 'Languages & Backend',
  'chisono.skills_ai': 'AI & Automation',
  'chisono.skills_visual': 'Visual Production',
  'chisono.skills_it': 'IT & Hardware',

  'progetti.title': 'Recent projects',
  'progetti.label': 'Portfolio',
  'progetti.subtitle': 'A selection of my most recent work.',
  'progetti.slider_label': 'Projects — scroll horizontally',
  'progetti.visit': 'Visit project',
  'progetti.watch': 'Watch video',
  'progetti.quote': 'Quote',
  'progetti.filter_all': 'All',

  'recensioni.title': 'What clients say',
  'recensioni.label': 'Testimonials',
  'recensioni.view_project': 'View project',

  'faq.title': 'Frequently asked questions',
  'faq.label': 'Questions?',
  'faq.subtitle': 'Have doubts? Here are answers to the most common questions. If you don\'t find what you\'re looking for, write me.',

  // ServiceSelect options
  'servizi.option_brand_logo': 'Brand & Logo',
  'servizi.option_graphic_social': 'Graphic & Social',
  'servizi.option_uiux': 'UI/UX Design',
  'servizi.option_website': 'Website',
  'servizi.option_software_app': 'Software & App',
  'servizi.option_video_content': 'Video Content',
  'servizi.option_post_prod': 'Post-Production',
  'servizi.option_hardware': 'Computer Hardware & IT',
  'servizi.option_social': 'Social Media',
  'servizi.option_audit': 'Free Audit',
  'servizi.option_perf': 'Performance & Speed',
  'servizi.option_multilingua': 'Multilingual Websites',
  'servizi.option_chatbot': 'Chatbot & AI',
  'servizi.option_migrazione': 'Migration & Hosting',
  'servizi.option_other': 'Other',

  'contatti.title': 'Contact',
  'contatti.label': 'Let\'s talk',
  'contatti.subtitle': 'Tell me about your project. I\'ll respond within 24 hours.',
  'contatti.name': 'Name *',
  'contatti.email': 'Email *',
  'contatti.service': 'Service',
  'contatti.message': 'Message *',
  'contatti.select': 'Select a service',
  'contatti.send': 'Send message',
  'contatti.sending': 'Sending...',
  'contatti.sent': 'Sent!',
  'contatti.error': 'Error — Retry',
  'contatti.placeholder_name': 'Your name',
  'contatti.placeholder_email': 'your@email.com',
  'contatti.placeholder_message': 'Describe your project...',
  'contatti.email_label': 'Email',
  'contatti.phone_label': 'Phone',
  'contatti.whatsapp_label': 'Quick message',
  'contatti.location': 'Mantua, Italy',
  'contatti.response_time': 'Response within 24h',
  'contatti.vat_invoice': 'VAT · Electronic invoice',
  'contatti.call_label': 'Intro call',
  'contatti.call_title': 'Book a free intro call',
  'contatti.call_subtitle': 'Let\'s talk about your project with no commitment: I\'ll understand what you need, give you an idea of costs and timelines, and we\'ll decide together how to proceed.',
  'contatti.call_button': 'Book a free call',
  'contatti.call_button_sub': '30 minutes, no commitment',
  'contatti.call_close': 'Close',
  'contatti.call_newtab': 'Open in new tab',

  'footer.desc': 'Designer, app & software developer, videomaker. I turn ideas into complete digital products.',
  'footer.servizi': 'Services',
  'footer.links': 'Links',
  'footer.contatti': 'Contact',
  'footer.uxui': 'UX/UI Design',
  'footer.sviluppo_app': 'App Development',
  'footer.sviluppo_software': 'Software Development',
  'footer.video_making': 'Video Making',
  'footer.consulenza': 'Consulting',
  'footer.progetti': 'Projects',
  'footer.chisono': 'About Me',
  'footer.processo': 'Process',
  'footer.prezzi': 'Pricing',
  'footer.recensioni': 'Reviews',
  'footer.faq_link': 'FAQ',
  'footer.privacy': 'Privacy & Security',
  'footer.cookie': 'Cookie Policy',
  'footer.termini': 'Terms & Conditions', 'footer.cookie_prefs': 'Cookie preferences',
  'legal.updated': 'Last updated',
  'legal.close': 'Close',
  'legal.toc': 'Table of contents',
  'legal.understood': 'Understood',

  'footer.master_portal': 'Master Portal',
  'footer.copyright': '© 2026 Tia Designs. All rights reserved.',
  'footer.location': 'Mantua, Italy',
  'footer.timezone': 'GMT+2',
  'footer.referral': 'Referral program: bring a client and get 10% off your next project',

  'chat.open': 'Open chat',
  'chat.title': 'Chat with me in real time',
  'chat.ai_title': 'Chat with Tia\'s AI',
  'chat.placeholder': 'Write a message...',
  'chat.auto_reply': 'Thanks for writing! I\'ll get back to you soon.',
  'chat.welcome': 'Hey! This is a direct chat with me, Tia Chinaglia. Tell me what you have in mind and I\'ll reply personally.',
  'chat.offline_reply': 'I\'m currently unavailable. I received your message and will get back to you as soon as possible.',
  'chat.send_error': 'Message not delivered — please try again in a few seconds.',
  'chat.send': 'Send message',
  'chat.fullscreen_title': 'Write your message',
  'chat.fullscreen_hint': 'Write freely: the more details you give, the more accurate the quote will be.',
  'chat.fullscreen_tip': 'Tap the icon to open the text bar fullscreen and write comfortably.',
  'chat.fullscreen_close': 'Cancel',
  'chat.bot_placeholder': 'Describe your project…',
  'chat.bot_empty': 'Tell me what you have in mind. Choose a specialization and ask about a website, app, brand, video, PC, or social content. I\'ll outline costs and timing before preparing your quote.',
  'bot.welcome_category': 'Hi! I\'m the **Tia Designs AI**, Tia\'s assistant. Pick a specialization from the bubbles in the welcome message, or just type what you have in mind. Remember: **switching specialization starts a new chat** and this conversation will be deleted.',
  'bot.budget_ask': 'First, can you tell me the budget you have in mind?',
  'bot.offtopic_block': 'You\'ve run out of time to write serious things: the chat is paused for 30 minutes. Come back later and I\'ll be here to help with Tia\'s services.',
  'bot.offtopic_blocked_hint': 'Chat paused — try again in 30 minutes',
  'chat.empty_heading': 'How can I help you today?',
  'chat.welcome_short': 'I can help you get the perfect quote for your project. Pick a specialization below or just describe your idea directly.',
  'chat.new_chat': 'New chat',
  'chat.new_chat_tip': 'Start a new chat: it deletes the current one and lets you pick a specialization from the welcome bubbles.',
  'chat.empty_intro': 'I\'m Tia Chinaglia. Tell me what you have in mind.',
  'chat.service_start': 'I\'d like a quote for {service}',
  'chat.category_label': 'Specialization',
  'chat.category_single': 'One category at a time',
  'chat.category_software_web': 'Software & Web',
  'chat.category_design': 'Design',
  'chat.category_video': 'Video',
  'chat.category_hardware': 'Hardware',
  'chat.category_social': 'Social',
  'chat.category_other': 'Other',
  'chat.category_general': 'General',
  'chat.example_general': 'Have a project that does not fit the categories? Start here and we\'ll figure it out.',
  'chat.placeholder_general': 'Describe your project…',
  'chat.example_software_web': 'Example: “I need an e-commerce site with a catalog, payments, and an admin area.”',
  'chat.example_design': 'Example: “I need a complete visual identity for my new brand.”',
  'chat.example_video': 'Example: “I need three vertical reels to launch a product.”',
  'chat.example_hardware': 'Example: “My PC is slow: can you help with diagnosis, upgrades, or repairs?”',
  'chat.example_social': 'Example: “I need posts and carousels that match my brand.”',
  'chat.example_other': 'Example: “I have a specific project — let me explain what I need.”',
  'chat.placeholder_software_web': 'Describe your website, software, or app…',
  'chat.placeholder_design': 'Describe your design project…',
  'chat.placeholder_video': 'Describe the video or content you have in mind…',
  'chat.placeholder_hardware': 'Describe the hardware issue or setup…',
  'chat.placeholder_social': 'Describe your social media goals…',
  'chat.placeholder_other': 'Tell me about your project…',
  'chatbot.title': 'Get your quote',
  'chatbot.subtitle': 'Describe your project and receive a personalised quote by email within a few hours.',

  'lang.popup_title': 'It looks like you\'re in',
  'lang.popup_question': 'Would you like to switch languages?',
  'lang.popup_keep': 'Stay in ',
  'lang.popup_switch': 'Switch to ',
  'lang.banner_text': 'It looks like you\'re in {country}. Choose the site language for a better experience:',
  'lang.banner_continue': 'Continue',
  'lang.banner_close': 'Close',

  'tooltip.enterprise_deadline': 'The final deadline is agreed upon together after analyzing the project. Every enterprise project has customized timelines.',
  'tooltip.rapid_delivery': 'This service has reduced delivery times, perfect for urgent needs.',

  'bot.error_server': 'There was a small problem preparing the reply. Please try again in a moment.',
  'bot.error_no_response': 'I didn\'t receive a response this time. Please try again in a moment and we can continue here.',
  'bot.error_connection': 'The reply was interrupted. Please try again in a moment.',
  'bot.tooltip_raccontami': "Tell me about your project — Tia's AI will guide you to the perfect quote",
  'bot.preventivo_ready': 'I have almost everything ready for the quote.',
  'bot.invalid_name': 'Enter a valid name without numbers or special characters.',
  'bot.invalid_email': 'Enter a valid email address.',
  'bot.invalid_service': 'Select a service to continue.',
  'bot.details_saved': 'Perfect, I will now complete your personalised quote.',
  'bot.complete_details': 'I still need these details to prepare your quote:',
  'bot.continue_quote': 'Continue the chat',
  'bot.identity_submitted': 'My name is {name} and my email is {email}.',
  'bot.name_submitted': 'My name is {name}.',
  'bot.email_submitted': 'My email is {email}.',
  'bot.budget_submitted': 'I set my budget at around €{value}.',
  'bot.inappropriate': 'I can help with a Tia project or service. Please rephrase your request respectfully and tell me what you would like to create.',
  'bot.message_required': 'Please describe the project briefly before sending the message.',
  'bot.quote_not_ready': 'I still need a few project details to prepare an accurate quote. Let’s continue here: what should it include, and what result do you want to achieve?',
  'bot.quote_review': 'I prepared a summary of your project. If it looks good, I will send it to Tia who will prepare a personalized quote via email.',
  'bot.approve_quote': 'Yes, send the summary to Tia',
  'bot.sending_quote': 'Sending…',
  'bot.revise_quote': 'No, I want to revise it',
  'bot.quote_sent': 'Perfect! I sent the summary to Tia. He will prepare the quote and send it to the email you gave me.',
  'bot.quote_revision_started': 'Of course, let’s keep refining the project together.',
  'bot.revision_waiting': 'Sure! Tell me what you want to change or add to the quote (service, features, budget, content): I will adjust everything based on what you write.',
  'bot.revise_prompt': 'I want to revise or add to the quote: help me update the draft based on what I write next.',
  'bot.quote_invalid': 'I can’t send this quote because the name, email, or content did not pass validation. Let’s correct the details and try again.',
  'bot.quote_send_error': 'I couldn’t send the quote. The details remain in the chat — please try again shortly.',

  'nav.menu': 'Menu',

  // Cookie banner
  'cookie.title': 'Cookie preferences',
  'cookie.desc': 'We use essential technical cookies and, with your consent, analytics cookies to understand how you browse the site and improve your experience',
  'cookie.learn_more': 'Learn more',
  'cookie.accept_all': 'Accept all',
  'cookie.necessary': 'Necessary only',
  'cookie.reject': 'Reject',
  'cookie.saved': 'Your choice will be saved for 12 months',
};

const es: Dict = {
  'nav.servizi': 'Servicios',
  'nav.prezzi': 'Precios',
  'nav.processo': 'Proceso',
  'nav.progetti': 'Proyectos',
  'nav.chisono': 'Sobre mí',
  'nav.recensioni': 'Reseñas',
  'nav.faq': 'FAQ',
  'nav.contattami': 'Contacto',
  'nav.raccontami': 'Cuéntame tu idea',
  'nav.brand_graphic': 'Marca & Gráfico',
  'nav.sviluppo_web': 'Desarrollo Web',
  'nav.software_app': 'Software & Apps',
  'nav.video_making': 'Producción Video',
  'nav.design': 'Diseño',
  'nav.software': 'Software',

  'hero.tag': 'Diseñador • Desarrollador • Videomaker',
  'hero.line1': 'El equilibrio perfecto',
  'hero.line2a': 'entre',
  'hero.line2b': 'estética',
  'hero.line2c': 'e',
  'hero.line2d': 'ingeniería',
  'hero.line2e': '.',
  'hero.subtitle': 'Diseño y desarrollo apps, software, sitios web y producciones de video. Diseño, código e imagen en un solo profesional.',
  'hero.cta_quote': 'Solicitar presupuesto',
  'hero.cta_prices': 'Ver precios',
  'hero.cta_work': 'Ver trabajos',
  'hero.stat_clients': 'Clientes satisfechos',
  'hero.stat_response': 'Tiempo de respuesta',
  'hero.stat_payment': 'Método de pago',

  'servizi.title': 'Servicios',
  'servizi.subtitle': 'Seis áreas, un mismo enfoque: diseño, web, software, video, hardware y redes sociales. Soluciones a medida para cada necesidad digital.',
  'servizi.slider_label': 'Servicios — desplázate horizontalmente',
  'servizi.label': 'Qué ofrezco',
  'servizi.brand': 'Marca & Logo',
  'servizi.brand_desc': 'Logotipos, paletas de color, tipografía e identidad visual completa.',
  'servizi.graphic': 'Gráfico & Social',
  'servizi.graphic_desc': 'Posts sociales, miniaturas YouTube, gráficos para streamers, volantes, carteles y materiales de marketing.',
  'servizi.uiux': 'Diseño UI/UX',
  'servizi.uiux_desc': 'Interfaces web y app, wireframes interactivos, prototipado avanzado y sistemas de diseño escalables.',
  'servizi.webdev': 'Desarrollo Web',
  'servizi.webdev_desc': 'Sitios web, dashboards, e-commerce y aplicaciones frontend/backend con Next.js, React y Vue.js. Mobile-first y responsive en todos los dispositivos.',
  'servizi.software': 'Software & Apps',
  'servizi.software_desc': 'Apps móviles, software a medida, APIs, bases de datos, arquitecturas cloud y automatizaciones.',
  'servizi.video_content': 'Contenido Video',
  'servizi.video_content_desc': 'Reels, shorts, contenido social y grabaciones ligeras optimizadas para cada plataforma.',
  'servizi.video_post': 'Post-Producción',
  'servizi.video_post_desc': 'Edición avanzada, color grading, motion graphics y VFX para producciones profesionales.',
  'servizi.hardware': 'Informática y Hardware',
  'servizi.hardware_desc': 'Diagnóstico, reparación y upgrades de PC, configuraciones, mantenimiento y consultoría IT a medida.',
  'servizi.social': 'Redes Sociales',
  'servizi.social_desc': 'Posts, carruseles, stories, miniaturas y contenido social adaptado a tu identidad y objetivos.',
  'servizi.audit': 'Auditoría Gratuita',
  'servizi.audit_desc': 'Análisis gratuito de velocidad, SEO y versión móvil de tu sitio actual, con un informe concreto de mejoras posibles.',
  'servizi.perf': 'Rendimiento y Velocidad',
  'servizi.perf_desc': '¿Sitio lento? Optimizo carga y Core Web Vitals (LCP, CLS, TBT) con resultados garantizados y medibles.',
  'servizi.multilingua': 'Sitios Multilingües',
  'servizi.multilingua_desc': 'Traduzco y adapto tu sitio a varios idiomas con hreflang, URLs dedicadas y SEO por idioma, como en este sitio.',
  'servizi.chatbot': 'Chatbot & IA',
  'servizi.chatbot_desc': 'Un asistente de IA en tu sitio que responde a los clientes 24/7 y recoge leads y presupuestos automáticamente.',
  'servizi.migrazione': 'Migración y Hosting',
  'servizi.migrazione_desc': 'Muevo tu sitio de hostings lentos y obsoletos a infraestructuras modernas: CDN, imágenes optimizadas y tiempos de respuesta más rápidos.',
  'servizi.growth_cat': 'Crecimiento y Rendimiento',
  'servizi.existing_label': 'Para tu sitio existente',
  'servizi.existing_title': 'Servicios para quien ya tiene un sitio',
  'servizi.existing_subtitle': 'No hace falta rehacerlo todo: mejoro lo que ya tienes con intervenciones puntuales y resultados medibles.',
  'servizi.ask': 'Solicitar',
  'servizi.hardware_cat': 'Hardware',
  'servizi.social_cat': 'Social',
  'servizi.design_cat': 'Diseño',
  'servizi.webdev_cat': 'Web Dev',
  'servizi.software_cat': 'Software',
  'servizi.video_cat': 'Video',
  'servizi.other_cat': 'Otro',

  'processo.label': 'Cómo trabajo',
  'processo.title': 'Mi proceso',
  'processo.subtitle': 'Seis fases claras para transformar tu idea en un producto terminado, sin sorpresas.',
  'processo.step1_title': 'Consultoría',
  'processo.step1_desc': 'Agendamos una llamada gratuita. Hablamos de tu idea, tus objetivos y el resultado que quieres conseguir.',
  'processo.step2_title': 'Análisis y Presupuesto',
  'processo.step2_desc': 'Evalúo la viabilidad, las mejores herramientas y los plazos. Te envío un presupuesto claro, sin costes ocultos.',
  'processo.step3_title': 'Diseño y Planificación',
  'processo.step3_desc': 'Defino la dirección creativa: bocetos, moodboards, estructura o storyboard. Refinamos juntos cada detalle.',
  'processo.step4_title': 'Producción',
  'processo.step4_desc': 'Ejecuto el trabajo: ya sea código, gráficos, grabación o edición. Te mantengo al día en cada hito.',
  'processo.step5_title': 'Revisión',
  'processo.step5_desc': 'Reviso cada detalle, optimizo el resultado y recojo tus comentarios para los toques finales.',
  'processo.step6_title': 'Entrega',
  'processo.step6_desc': 'Te entrego todo: archivos fuente, documentación y soporte post-entrega. El proyecto es 100% tuyo.',

  'prezzi.title': 'Precios',
  'prezzi.subtitle': 'Cada proyecto tiene un presupuesto personalizado. Aquí encuentras una estimación orientativa.',
  'prezzi.slider_label': 'Paquetes — desplázate horizontalmente',
  'prezzi.label': 'Tarifas transparentes',
  'prezzi.onetime': 'Pago único',
  'prezzi.monthly': 'Colaboración',
  'prezzi.cta': 'Solicitar presupuesto',
  'prezzi.popular': 'Más elegido',
  'prezzi.from': 'desde',
  'prezzi.rapid': 'Entrega rápida',
  'prezzi.custom': 'A tu medida',
  'prezzi.slots_note': 'Solo quedan 2 huecos en {month}',
  'prezzi.slots_one': 'Solo queda 1 hueco en {month}',
  'prezzi.slots_other': 'Solo quedan {count} huecos en {month}',
  'prezzi.vat_note': 'Los precios son orientativos y no incluyen IVA ni cargos aplicables. Cada proyecto recibe un presupuesto dedicado y gratuito.',
  'prezzi.flex_note': 'Planes flexibles: términos claros acordados al firmar el contrato. Puedes cancelar la colaboración cuando quieras.',

  'chisono.title': 'Tia Chinaglia',
  'chisono.label': 'Sobre mí',
  'chisono.bio': 'Profesional independiente con base en Mantua, Italia, colaborando con clientes en toda Europa. Sin plantillas, sin compromisos: cada proyecto se construye a medida, desde el diseño hasta el desarrollo, con las tecnologías más adecuadas para cada caso. Creo en la transparencia total y la comunicación directa — por eso garantizo respuestas rápidas, presupuestos claros y actualizaciones constantes en cada fase. Combino habilidades técnicas avanzadas con una fuerte sensibilidad estética, llevando cada proyecto desde el concepto inicial hasta su lanzamiento.',
  'chisono.why_title': 'Por qué elegir un freelance',
  'chisono.why_1': 'Comunicación directa — siempre hablas con quien hace el trabajo',
  'chisono.why_2': 'Costes más bajos que una agencia — sin márgenes de intermediación',
  'chisono.why_3': 'Personalización total — sin plantillas, cada proyecto es único',
  'chisono.why_4': 'Respuestas rápidas en menos de 24 horas — sin tickets ni niveles de soporte',

  'chisono.skills_design': 'Diseño',
  'chisono.skills_webdev': 'Desarrollo Web',
  'chisono.skills_backend': 'Lenguajes & Backend',
  'chisono.skills_ai': 'IA & Automatización',
  'chisono.skills_visual': 'Producción Visual',
  'chisono.skills_it': 'IT & Hardware',

  'progetti.title': 'Proyectos recientes',
  'progetti.label': 'Portafolio',
  'progetti.subtitle': 'Una selección de mis trabajos más recientes.',
  'progetti.slider_label': 'Proyectos — desplázate horizontalmente',
  'progetti.visit': 'Visitar proyecto',
  'progetti.watch': 'Ver video',
  'progetti.quote': 'Presupuesto',
  'progetti.filter_all': 'Todos',

  'recensioni.title': 'Qué dicen los clientes',
  'recensioni.label': 'Testimonios',
  'recensioni.view_project': 'Ver proyecto',

  'faq.title': 'Preguntas frecuentes',
  'faq.label': '¿Dudas?',
  'faq.subtitle': '¿Tienes dudas? Aquí encuentras respuestas a las preguntas más comunes. Si no encuentras lo que buscas, escríbeme.',

  // ServiceSelect options
  'servizi.option_brand_logo': 'Marca & Logo',
  'servizi.option_graphic_social': 'Gráfico & Social',
  'servizi.option_uiux': 'Diseño UI/UX',
  'servizi.option_website': 'Sitio Web',
  'servizi.option_software_app': 'Software & Apps',
  'servizi.option_video_content': 'Contenido Video',
  'servizi.option_post_prod': 'Post-Producción',
  'servizi.option_hardware': 'Informática y Hardware',
  'servizi.option_social': 'Redes Sociales',
  'servizi.option_audit': 'Auditoría Gratuita',
  'servizi.option_perf': 'Rendimiento y Velocidad',
  'servizi.option_multilingua': 'Sitios Multilingües',
  'servizi.option_chatbot': 'Chatbot & IA',
  'servizi.option_migrazione': 'Migración y Hosting',
  'servizi.option_other': 'Otro',

  'contatti.title': 'Contacto',
  'contatti.label': 'Hablemos',
  'contatti.subtitle': 'Cuéntame tu proyecto. Te responderé en 24 horas.',
  'contatti.name': 'Nombre *',
  'contatti.email': 'Email *',
  'contatti.service': 'Servicio',
  'contatti.message': 'Mensaje *',
  'contatti.select': 'Selecciona un servicio',
  'contatti.send': 'Enviar mensaje',
  'contatti.sending': 'Enviando...',
  'contatti.sent': '¡Enviado!',
  'contatti.error': 'Error — Reintentar',
  'contatti.placeholder_name': 'Tu nombre',
  'contatti.placeholder_email': 'tu@email.com',
  'contatti.placeholder_message': 'Describe tu proyecto...',
  'contatti.email_label': 'Email',
  'contatti.phone_label': 'Teléfono',
  'contatti.whatsapp_label': 'Mensaje rápido',
  'contatti.location': 'Mantua, Italia',
  'contatti.response_time': 'Respuesta en 24h',
  'contatti.vat_invoice': 'IVA · Factura electrónica',
  'contatti.call_label': 'Llamada de consulta',
  'contatti.call_title': 'Reserva una llamada de consulta gratuita',
  'contatti.call_subtitle': 'Hablemos de tu proyecto sin compromiso: entiendo qué necesitas, te doy una idea de costes y plazos, y decidimos juntos cómo proceder.',
  'contatti.call_button': 'Reserva una llamada gratis',
  'contatti.call_button_sub': '30 minutos, sin compromiso',
  'contatti.call_close': 'Cerrar',
  'contatti.call_newtab': 'Abrir en nueva pestaña',

  'footer.desc': 'Diseñador, desarrollador de apps y software, videomaker. Transformo ideas en productos digitales completos.',
  'footer.servizi': 'Servicios',
  'footer.links': 'Enlaces',
  'footer.contatti': 'Contacto',
  'footer.uxui': 'Diseño UX/UI',
  'footer.sviluppo_app': 'Desarrollo App',
  'footer.sviluppo_software': 'Desarrollo Software',
  'footer.video_making': 'Producción Video',
  'footer.consulenza': 'Consultoría',
  'footer.progetti': 'Proyectos',
  'footer.chisono': 'Quién Soy',
  'footer.processo': 'Proceso',
  'footer.prezzi': 'Precios',
  'footer.recensioni': 'Reseñas',
  'footer.faq_link': 'FAQ',
  'footer.privacy': 'Privacidad y seguridad',
  'footer.cookie': 'Política de cookies',
  'footer.termini': 'Términos y condiciones', 'footer.cookie_prefs': 'Preferencias de cookies',
  'legal.updated': 'Última actualización',
  'legal.close': 'Cerrar',
  'legal.toc': 'Índice de contenidos',
  'legal.understood': 'Entendido',

  'footer.master_portal': 'Portal Master',
  'footer.copyright': '© 2026 Tia Designs. Todos los derechos reservados.',
  'footer.location': 'Mantua, Italia',
  'footer.timezone': 'GMT+2',
  'footer.referral': 'Programa de referidos: trae un cliente y obtén un 10% de descuento en tu próximo proyecto',

  'chat.open': 'Abrir chat',
  'chat.title': 'Chatea conmigo en tiempo real',
  'chat.ai_title': 'Chatea con la IA de Tia Designs',
  'chat.placeholder': 'Escribe un mensaje...',
  'chat.auto_reply': '¡Gracias por escribirme! Te responderé pronto.',
  'chat.welcome': '¡Hola! Este es un chat directo conmigo, Tia Chinaglia. Cuéntame qué tienes en mente y te responderé personalmente.',
  'chat.offline_reply': 'Ahora mismo no estoy disponible. He recibido tu mensaje y te responderé lo antes posible.',
  'chat.send_error': 'Mensaje no entregado — inténtalo de nuevo en unos segundos.',
  'chat.send': 'Enviar mensaje',
  'chat.fullscreen_title': 'Escribe tu mensaje',
  'chat.fullscreen_hint': 'Escribe libremente: cuantos más detalles des, más preciso será el presupuesto.',
  'chat.fullscreen_tip': 'Toca el icono para abrir la barra de texto a pantalla completa y escribir cómodamente.',
  'chat.fullscreen_close': 'Cancelar',
  'chat.bot_placeholder': 'Describe tu proyecto…',
  'chat.bot_empty': 'Cuéntame qué tienes en mente. Elige una especialización y pregúntame por un sitio, una app, una marca, un video, tu PC o contenido para redes. Te orientaré sobre costes y tiempos antes de preparar el presupuesto.',
  'bot.welcome_category': '¡Hola! Soy la **IA de Tia Designs**, el asistente de Tia. Elige una especialización con las burbujas del mensaje de bienvenida, o escríbeme directamente qué tienes en mente. Recuerda: **cambiar de especialización inicia un nuevo chat** y esta conversación se eliminará.',
  'bot.budget_ask': 'Primero, ¿puedes indicarme cuánto presupuesto tienes en mente?',
  'bot.offtopic_block': 'Has agotado el tiempo para escribir cosas serias: el chat se pausa durante 30 minutos. Vuelve más tarde y estaré aquí para ayudarte con los servicios de Tia.',
  'bot.offtopic_blocked_hint': 'Chat en pausa — inténtalo de nuevo en 30 minutos',
  'chat.empty_heading': '¿Cómo puedo ayudarte hoy?',
  'chat.welcome_short': 'Puedo ayudarte a conseguir el presupuesto perfecto para tu proyecto. Elige una especialización abajo o descríbeme directamente tu idea.',
  'chat.new_chat': 'Nueva chat',
  'chat.new_chat_tip': 'Inicia un nuevo chat: elimina el actual y podrás elegir una especialización entre las burbujas de bienvenida.',
  'chat.empty_intro': 'Soy Tia Chinaglia. Cuéntame qué tienes en mente.',
  'chat.service_start': 'Quiero un presupuesto para {service}',
  'chat.category_label': 'Especialización',
  'chat.category_single': 'Una categoría a la vez',
  'chat.category_software_web': 'Software y Web',
  'chat.category_design': 'Diseño',
  'chat.category_video': 'Video',
  'chat.category_hardware': 'Hardware',
  'chat.category_social': 'Redes',
  'chat.category_other': 'Otro',
  'chat.category_general': 'General',
  'chat.example_general': '¿Tienes un proyecto que no encaja en las categorías? Empieza aquí y lo aclaramos.',
  'chat.placeholder_general': 'Describe tu proyecto…',
  'chat.example_software_web': 'Ejemplo: “Necesito un e-commerce con catálogo, pagos y un área de administración.”',
  'chat.example_design': 'Ejemplo: “Quiero una identidad visual completa para mi nueva marca.”',
  'chat.example_video': 'Ejemplo: “Necesito tres reels verticales para lanzar un producto.”',
  'chat.example_hardware': 'Ejemplo: “Mi PC va lento: ¿puedes ayudarme con diagnóstico, upgrades o reparación?”',
  'chat.example_social': 'Ejemplo: “Quiero posts y carruseles coherentes con mi marca.”',
  'chat.example_other': 'Ejemplo: “Tengo un proyecto particular: te explico qué necesito.”',
  'chat.placeholder_software_web': 'Describe tu sitio, software o app…',
  'chat.placeholder_design': 'Describe tu proyecto de diseño…',
  'chat.placeholder_video': 'Describe el video o contenido que imaginas…',
  'chat.placeholder_hardware': 'Describe el problema o configuración de hardware…',
  'chat.placeholder_social': 'Describe tus objetivos en redes…',
  'chat.placeholder_other': 'Cuéntame tu proyecto…',
  'chatbot.title': 'Calcula tu presupuesto',
  'chatbot.subtitle': 'Describe tu proyecto y recibe un presupuesto personalizado por correo electrónico en pocas horas.',

  'lang.popup_title': 'Parece que estás en',
  'lang.popup_question': '¿Quieres cambiar de idioma?',
  'lang.popup_keep': 'Quedarse en ',
  'lang.popup_switch': 'Cambiar a ',
  'lang.banner_text': 'Parece que estás en {country}. Elige el idioma del sitio para una mejor experiencia:',
  'lang.banner_continue': 'Continuar',
  'lang.banner_close': 'Cerrar',

  'tooltip.enterprise_deadline': 'La fecha límite definitiva se acuerda después de analizar el proyecto. Cada proyecto enterprise tiene plazos personalizados.',
  'tooltip.rapid_delivery': 'Este servicio tiene plazos de entrega reducidos, perfecto para necesidades urgentes.',

  'bot.error_server': 'Hubo un pequeño problema al preparar la respuesta. Inténtalo de nuevo en un momento.',
  'bot.error_no_response': 'Esta vez no recibí respuesta. Inténtalo de nuevo en un momento y continuamos juntos.',
  'bot.error_connection': 'La respuesta se interrumpió. Inténtalo de nuevo en un momento.',
  'bot.tooltip_raccontami': 'Cuéntame sobre tu proyecto — la IA de Tia te guiará al presupuesto perfecto',
  'bot.preventivo_ready': 'Ya tengo casi todo listo para el presupuesto.',
  'bot.invalid_name': 'Introduce un nombre válido, sin números ni caracteres especiales.',
  'bot.invalid_email': 'Introduce una dirección de email válida.',
  'bot.invalid_service': 'Selecciona un servicio para continuar.',
  'bot.details_saved': 'Perfecto, ahora completaré tu presupuesto personalizado.',
  'bot.complete_details': 'Todavía necesito estos datos para preparar tu presupuesto:',
  'bot.continue_quote': 'Continuar el chat',
  'bot.identity_submitted': 'Me llamo {name} y mi email es {email}.',
  'bot.name_submitted': 'Me llamo {name}.',
  'bot.email_submitted': 'Mi email es {email}.',
  'bot.budget_submitted': 'He indicado un presupuesto de unos {value} €.',
  'bot.inappropriate': 'Puedo ayudarte con un proyecto o servicio de Tia. Reformula la solicitud de forma respetuosa y cuéntame qué quieres crear.',
  'bot.message_required': 'Describe brevemente el proyecto antes de enviar el mensaje.',
  'bot.quote_not_ready': 'Todavía necesito algunos detalles del proyecto para preparar un presupuesto preciso. Continuemos aquí: ¿qué debe incluir y qué resultado quieres conseguir?',
  'bot.quote_review': 'He preparado un resumen de tu proyecto. Si te parece bien, se lo mando a Tia para que te prepare un presupuesto personalizado por email.',
  'bot.approve_quote': 'Sí, manda el resumen a Tia',
  'bot.sending_quote': 'Enviando…',
  'bot.revise_quote': 'No, quiero modificarlo',
  'bot.quote_sent': '¡Perfecto! Le mandé el resumen a Tia. Te preparará el presupuesto y te lo enviará al email que me diste.',
  'bot.quote_revision_started': 'De acuerdo, sigamos perfeccionando el proyecto juntos.',
  'bot.revision_waiting': '¡De acuerdo! Dime qué quieres cambiar o añadir al presupuesto (servicio, funcionalidades, presupuesto, contenidos): lo ajusto todo según lo que me escribas.',
  'bot.revise_prompt': 'Quiero modificar o completar el presupuesto: ayúdame a revisar el borrador según lo que escriba ahora.',
  'bot.quote_invalid': 'No puedo enviar este presupuesto porque el nombre, el email o el contenido no superan las validaciones. Corrijamos los datos y volvamos a intentarlo.',
  'bot.quote_send_error': 'No he podido enviar el presupuesto. Los datos permanecen en el chat: inténtalo de nuevo en un momento.',

  'nav.menu': 'Menú',

  // Cookie banner
  'cookie.title': 'Preferencias de cookies',
  'cookie.desc': 'Utilizamos cookies técnicas esenciales y, con tu consentimiento, cookies analíticas para entender cómo navegas el sitio y mejorar tu experiencia',
  'cookie.learn_more': 'Más información',
  'cookie.accept_all': 'Aceptar todas',
  'cookie.necessary': 'Solo necesarias',
  'cookie.reject': 'Rechazar',
  'cookie.saved': 'Tu elección se guardará durante 12 meses',
};

const DICTS: Record<Lang, Dict> = { it, en, es };

export function t(key: string, lang: Lang): string {
  return DICTS[lang]?.[key] || DICTS.it[key] || key;
}

// ── FAQ data (array of q/a objects) per language ────────────

type FaqEntry = { q: string; a: string };

const FAQS_BY_LANG: Record<Lang, FaqEntry[]> = {
  it: [
    { q: 'Il preventivo è gratuito?', a: 'Sì, il preventivo è completamente gratuito e senza impegno. Basta descrivere il progetto nel chatbot o nel form di contatto: riceverai un\'analisi dettagliata con costi e tempistiche, senza alcun obbligo.' },
    { q: 'Ci sono costi ricorrenti nascosti?', a: 'No, nessun costo nascosto. Per siti e app i costi ricorrenti si limitano a dominio e hosting, che ti spiego in anticipo e che puoi gestire tu o affidare a me. Qualsiasi altra voce è sempre concordata prima di iniziare.' },
    { q: 'Quali sono le tempistiche?', a: 'Dipende dal progetto: un sito vetrina richiede 2-3 settimane, una piattaforma web 4-6, un\'app mobile 4-8. Dopo il briefing iniziale ricevi sempre una timeline precisa, con milestone chiare a ogni fase.' },
    { q: 'Come funziona il processo di lavoro, dall\'idea alla consegna?', a: 'Il processo si divide in 6 fasi: consulenza gratuita, analisi e preventivo, design e prototipo, sviluppo, test e revisioni, consegna e lancio. Massima trasparenza in ogni step.' },
    { q: 'Chi detiene la proprietà del progetto e ricevo i file sorgente?', a: 'A saldo avvenuto la proprietà è tua: ricevi tutti i file sorgente (codice, progetti Figma, asset) e puoi portare il progetto dove preferisci, senza vincoli.' },
    { q: 'Firmi un accordo di riservatezza (NDA)?', a: 'Sì, firmo NDA senza problemi. La tua idea e i tuoi dati restano riservati e posso lavorare sia da remoto che di persona.' },
    { q: 'Offri supporto post-lancio e manutenzione?', a: 'Sì. Ogni progetto include una garanzia post-consegna e propongo pacchetti di manutenzione mensile per tenere sito, app o software aggiornato, sicuro e performante nel tempo.' },
    { q: 'Quante revisioni sono incluse?', a: 'Il numero di revisioni viene stabilito in fase di preventivo in base al progetto. Per i video le revisioni sono illimitate fino all\'ok finale; per design e sviluppo si concordano round di revisione chiari.' },
    { q: 'Usi template preimpostati o tutto su misura?', a: 'Nessun template e nessun compromesso. Ogni progetto è disegnato e sviluppato da zero con tecnologie moderne, con approccio mobile-first: perfetto su smartphone, tablet e desktop.' },
    { q: 'Ti occupi di SEO e velocità (Core Web Vitals)?', a: 'Sì, ogni sito è ottimizzato per i motori di ricerca: struttura semantica, Core Web Vitals, meta tag, performance e best practice SEO on-page.' },
    { q: 'Posso gestire i contenuti del sito in autonomia?', a: 'Sì, posso integrare un CMS o un pannello admin personalizzato per aggiornare testi, immagini e prodotti in totale autonomia, senza toccare il codice.' },
    { q: 'Posso affidarti anche dominio e hosting?', a: 'Certo. Mi occupo di acquisto del dominio, configurazione dell\'hosting e messa online del progetto, oppure ti guido passo passo se preferisci gestirli tu.' },
    { q: 'Posso richiedere solo il design senza lo sviluppo web?', a: 'Assolutamente sì. Posso occuparmi solo di UI/UX, brand identity e prototipazione (ad esempio su Figma), e poi passare i file al team che preferisci.' },
    { q: 'Che tipo di video realizzi?', a: 'Video aziendali, spot pubblicitari, reel e short per i social, showreel e cortometraggi. Curo l\'intera produzione o solo la post-produzione: montaggio, color grading, motion graphics, sound design e VFX.' },
    { q: 'Gestisci anche i miei social media?', a: 'Sì, creo post, carousel, stories e thumbnail in linea con la tua identità e i tuoi obiettivi, con piani editoriali personalizzati e pacchetti mensili.' },
    { q: 'Cosa sono le automazioni con AI (n8n, chatbot, agenti)?', a: 'Sono sistemi che automatizzano i processi ripetitivi della tua azienda: chatbot che rispondono ai clienti, integrazioni tra app e agenti AI che gestiscono dati e report. Meno lavoro manuale, più efficienza.' },
    { q: 'Cosa ti serve da me per iniziare il progetto?', a: 'Un briefing: l\'idea generale, i contenuti o i materiali che hai (testi, immagini, logo), eventuali riferimenti che ti piacciono e gli obiettivi che vuoi raggiungere. Se non hai nulla di pronto, ti aiuto io a definire tutto.' },
    { q: 'Il preventivo è a prezzo fisso? E se lo scope cambia a metà?', a: 'Sì, il preventivo è a prezzo fisso per lo scope concordato. Se i requisiti cambiano a metà progetto, ne parliamo subito e ti propongo un aggiornamento trasparente prima di procedere.' },
    { q: 'Quanto dura la garanzia post-consegna e cosa copre?', a: 'Ogni progetto include un periodo di garanzia post-consegna che copre bug e correzioni dello scope consegnato. La durata esatta è indicata nel preventivo; per il supporto continuativo ci sono i pacchetti mensili.' },
    { q: 'Offri un pacchetto "tutto incluso"?', a: 'Sì, creo pacchetti completi che uniscono brand identity, sito web, video e gestione social con un unico referente. Chiedi un preventivo personalizzato dal form di contatto o dal chatbot.' },
  ],
  en: [
    { q: 'Is the quote free?', a: 'Yes, the quote is completely free and non-binding. Just describe your project in the chatbot or the contact form: you will get a detailed analysis with costs and timelines, with no obligation.' },
    { q: 'Are there hidden recurring costs?', a: 'No, no hidden costs. For websites and apps the recurring costs are limited to domain and hosting, which I explain in advance and which you can manage yourself or hand over to me. Anything else is always agreed before we start.' },
    { q: 'What are the timelines?', a: 'It depends on the project: a showcase site takes 2-3 weeks, a web platform 4-6, a mobile app 4-8. After the initial briefing you always get a precise timeline with clear milestones at every stage.' },
    { q: 'How does the work process work, from idea to delivery?', a: 'The process is split into 6 phases: free consultation, analysis and quote, design and prototype, development, testing and revisions, delivery and launch. Full transparency at every step.' },
    { q: 'Who owns the project and do I get the source files?', a: 'Once the final payment is made, the project is yours: you receive all the source files (code, Figma projects, assets) and can take the project anywhere you want, with no lock-in.' },
    { q: 'Do you sign a non-disclosure agreement (NDA)?', a: 'Yes, I sign NDAs without any problem. Your idea and your data stay confidential, and I can work both remotely and in person.' },
    { q: 'Do you offer post-launch support and maintenance?', a: 'Yes. Every project includes a post-delivery warranty, and I offer monthly maintenance packages to keep your site, app, or software updated, secure, and performing well over time.' },
    { q: 'How many revisions are included?', a: 'The number of revisions is set in the quote depending on the project. For videos, revisions are unlimited until final approval; for design and development, clear revision rounds are agreed.' },
    { q: 'Do you use preset templates or is everything custom?', a: 'No templates, no compromises. Every project is designed and developed from scratch with modern technologies, mobile-first: perfect on smartphones, tablets, and desktop.' },
    { q: 'Do you also handle SEO and speed (Core Web Vitals)?', a: 'Yes, every site is optimized for search engines: semantic structure, Core Web Vitals, meta tags, performance, and on-page SEO best practices.' },
    { q: 'Can I manage the site content myself?', a: 'Yes, I can integrate a CMS or a custom admin panel so you can update texts, images, and products by yourself, without touching the code.' },
    { q: 'Can I also entrust you with domain and hosting?', a: 'Of course. I take care of buying the domain, setting up hosting, and launching the project, or I guide you step by step if you prefer to manage them yourself.' },
    { q: 'Can I request only the design without the web development?', a: 'Absolutely. I can handle just the UI/UX, brand identity, and prototyping (for example in Figma), and then hand the files over to the team you prefer.' },
    { q: 'What type of videos do you make?', a: 'Corporate videos, commercials, reels and shorts for social media, showreels, and short films. I handle the full production or just post-production: editing, color grading, motion graphics, sound design, and VFX.' },
    { q: 'Do you also manage my social media?', a: 'Yes, I create posts, carousels, stories, and thumbnails in line with your identity and goals, with custom editorial plans and monthly packages.' },
    { q: 'What are AI automations (n8n, chatbots, agents)?', a: 'They are systems that automate your company\'s repetitive processes: chatbots that answer customers, app integrations, and AI agents that manage data and reports. Less manual work, more efficiency.' },
    { q: 'What do you need from me to start the project?', a: 'A briefing: the general idea, the content or materials you have (texts, images, logo), any references you like, and the goals you want to reach. If you have nothing ready, I help you define everything.' },
    { q: 'Is the quote fixed-price? What if the scope changes midway?', a: 'Yes, the quote is fixed-price for the agreed scope. If requirements change mid-project, we talk right away and I propose a transparent update before proceeding.' },
    { q: 'How long is the post-delivery warranty and what does it cover?', a: 'Every project includes a post-delivery warranty covering bugs and fixes for the delivered scope. The exact duration is stated in the quote; for ongoing support there are monthly packages.' },
    { q: 'Do you offer an "all-inclusive" package?', a: 'Yes, I create complete packages that combine brand identity, website, video, and social media management with a single point of contact. Request a custom quote from the contact form or the chatbot.' },
  ],
  es: [
    { q: '¿El presupuesto es gratuito?', a: 'Sí, el presupuesto es completamente gratuito y sin compromiso. Solo tienes que describir tu proyecto en el chatbot o en el formulario de contacto: recibirás un análisis detallado con costes y plazos, sin ninguna obligación.' },
    { q: '¿Hay costes recurrentes ocultos?', a: 'No, ningún coste oculto. Para sitios y apps los costes recurrentes se limitan al dominio y al hosting, que te explico de antemano y que puedes gestionar tú o confiarme a mí. Cualquier otra partida se acuerda siempre antes de empezar.' },
    { q: '¿Cuáles son los plazos?', a: 'Depende del proyecto: un sitio vitrina requiere 2-3 semanas, una plataforma web 4-6, una app móvil 4-8. Tras el briefing inicial siempre recibes un cronograma preciso, con hitos claros en cada fase.' },
    { q: '¿Cómo funciona el proceso de trabajo, de la idea a la entrega?', a: 'El proceso se divide en 6 fases: consultoría gratuita, análisis y presupuesto, diseño y prototipo, desarrollo, pruebas y revisiones, entrega y lanzamiento. Máxima transparencia en cada paso.' },
    { q: '¿Quién es el propietario del proyecto y recibo los archivos fuente?', a: 'Una vez pagado el saldo, la propiedad es tuya: recibes todos los archivos fuente (código, proyectos Figma, assets) y puedes llevar el proyecto donde quieras, sin ataduras.' },
    { q: '¿Firmas un acuerdo de confidencialidad (NDA)?', a: 'Sí, firmo NDA sin problema. Tu idea y tus datos permanecen confidenciales y puedo trabajar tanto en remoto como en persona.' },
    { q: '¿Ofreces soporte post-lanzamiento y mantenimiento?', a: 'Sí. Cada proyecto incluye una garantía post-entrega y ofrezco paquetes mensuales de mantenimiento para mantener tu sitio, app o software actualizado, seguro y con buen rendimiento.' },
    { q: '¿Cuántas revisiones están incluidas?', a: 'El número de revisiones se fija en el presupuesto según el proyecto. Para los videos las revisiones son ilimitadas hasta el visto bueno final; para diseño y desarrollo se acuerdan rondas de revisión claras.' },
    { q: '¿Usas plantillas o todo es a medida?', a: 'Sin plantillas ni compromisos. Cada proyecto se diseña y desarrolla desde cero con tecnologías modernas, con enfoque mobile-first: perfecto en smartphones, tablets y escritorio.' },
    { q: '¿También te ocupas del SEO y la velocidad (Core Web Vitals)?', a: 'Sí, cada sitio está optimizado para buscadores: estructura semántica, Core Web Vitals, meta tags, rendimiento y buenas prácticas de SEO on-page.' },
    { q: '¿Puedo gestionar los contenidos del sitio yo mismo?', a: 'Sí, puedo integrar un CMS o un panel de administración personalizado para que actualices textos, imágenes y productos de forma autónoma, sin tocar el código.' },
    { q: '¿Puedo confiarte también el dominio y el hosting?', a: 'Claro. Me encargo de comprar el dominio, configurar el hosting y poner el proyecto en línea, o te guío paso a paso si prefieres gestionarlos tú.' },
    { q: '¿Puedo pedir solo el diseño sin el desarrollo web?', a: 'Por supuesto. Puedo encargarme solo del UI/UX, la identidad de marca y el prototipado (por ejemplo en Figma), y luego pasar los archivos al equipo que prefieras.' },
    { q: '¿Qué tipo de videos haces?', a: 'Videos corporativos, anuncios, reels y shorts para redes, showreels y cortometrajes. Me ocupo de la producción completa o solo de la post-producción: edición, color grading, motion graphics, diseño de sonido y VFX.' },
    { q: '¿También gestionas mis redes sociales?', a: 'Sí, creo posts, carruseles, stories y miniaturas en línea con tu identidad y tus objetivos, con planes editoriales personalizados y paquetes mensuales.' },
    { q: '¿Qué son las automatizaciones con IA (n8n, chatbots, agentes)?', a: 'Son sistemas que automatizan los procesos repetitivos de tu empresa: chatbots que responden a los clientes, integraciones entre apps y agentes de IA que gestionan datos e informes. Menos trabajo manual, más eficiencia.' },
    { q: '¿Qué necesitas de mí para empezar el proyecto?', a: 'Un briefing: la idea general, los contenidos o materiales que tengas (textos, imágenes, logo), referencias que te gusten y los objetivos que quieras alcanzar. Si no tienes nada listo, te ayudo a definirlo todo.' },
    { q: '¿El presupuesto es a precio fijo? ¿Y si el alcance cambia a mitad?', a: 'Sí, el presupuesto es a precio fijo para el alcance acordado. Si los requisitos cambian a mitad de proyecto, lo hablamos de inmediato y te propongo una actualización transparente antes de continuar.' },
    { q: '¿Cuánto dura la garantía post-entrega y qué cubre?', a: 'Cada proyecto incluye un período de garantía post-entrega que cubre errores y correcciones del alcance entregado. La duración exacta se indica en el presupuesto; para soporte continuo hay paquetes mensuales.' },
    { q: '¿Ofreces un paquete "todo incluido"?', a: 'Sí, creo paquetes completos que combinan identidad de marca, sitio web, video y gestión de redes con un único interlocutor. Solicita un presupuesto personalizado desde el formulario de contacto o el chatbot.' },
  ],
};

export function getFaqs(lang: Lang): FaqEntry[] {
  return FAQS_BY_LANG[lang] || FAQS_BY_LANG.it;
}

// ── Structured content — BY_LANG arrays for data-driven sections ────

export type Review = { name: string; role: string; text: string; stars: number; /** id of a related portfolio project, if any — makes the review clickable */ projectId?: string };
export type ProjectData = {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  category: string;
  tags: string[];
  isVideo?: boolean;
  /** Optional local gallery used by image-first portfolio projects. */
  gallery?: string[];
  /** Optional supporting documents, such as a PDF portfolio. */
  documents?: string[];
};
export type PricingTier = {
  title: string;
  price?: string;
  priceLabel?: string;
  period: string;
  popular?: boolean;
  premium?: boolean;
  description: string;
  delivery: string;
  hours?: string;
  features: string[];
};
export type PricingCategory = { label: string; subtitle: string; tiers: PricingTier[] };

const REVIEWS_BY_LANG: Record<Lang, Review[]> = {
  it: [
    { name: 'Laura Bertoni', role: 'PCS Mantova', text: 'Il nuovo sito di PCS Mantova è moderno, veloce e semplicissimo da navigare. Tia ha curato ogni dettaglio e ha valorizzato al meglio la nostra immagine. Collaborazione impeccabile.', stars: 5, projectId: 'pcs' },
    { name: 'DestTime', role: 'Content Creator', text: 'Tia ha trasformato la nostra pagina Instagram con post sempre curati e coerenti con il brand. La qualità grafica si vede, e i risultati pure. Super consigliato.', stars: 5, projectId: 'desttime-shaman-king' },
    { name: 'Gianluca Rigodanza', role: 'iPalBoyTV — YouTuber', text: 'Le copertine che Tia ha realizzato per il mio canale (Design Editoriale Vol. 2B) sono di un livello altissimo. Ha capito esattamente cosa volevo comunicare e lo ha trasformato in un\'immagine che mi rappresenta. Un vero professionista.', stars: 5, projectId: 'design-editoriale-2b' },
    { name: 'Ous', role: 'Artista musicale', text: 'La copertina del mio pezzo ha superato ogni aspettativa. Tia ha colto l\'essenza della musica e l\'ha resa immagine, potente e memorabile. Lavoro straordinario.', stars: 5, projectId: 'flussi-di-coscienza' },
    { name: 'Stefano Golisano', role: 'GSA Hotels', text: 'Il sito di GSA Hotels è elegante e di grande impatto, proprio come volevamo per la nostra struttura. Animazioni fluide e un\'attenzione maniacale ai dettagli. Esperienza impeccabile.', stars: 5, projectId: 'gsa-hotels' },
    { name: 'Vergilius Nectar', role: 'Brand', text: 'Sito e grafiche coordinati alla perfezione: Tia ha costruito un\'identità visiva completa e coerente che ci rappresenta davvero. Comunicazione chiara e risultati oltre le aspettative.', stars: 5, projectId: 'vergilius' },
    { name: 'Fiera Millenaria di Gonzaga', role: 'Evento & Comunicazione', text: 'Post e grafiche curatissimi che hanno dato grande visibilità alla Fiera. Tia unisce creatività e puntualità, con uno stile sempre in linea con la tradizione dell\'evento. Ottimo lavoro.', stars: 5 },
    { name: 'Davide Moretti', role: 'Ingegnere', text: 'Il mio sito da ingegnere è pulito, professionale e perfettamente ottimizzato per i motori di ricerca. Tia ha saputo tradurre il mio lavoro in un progetto raffinato e funzionale. Non potrei essere più soddisfatto.', stars: 5, projectId: 'moretti' },
  ],
  en: [
    { name: 'Laura Bertoni', role: 'PCS Mantova', text: 'PCS Mantova\'s new website is modern, fast and incredibly easy to navigate. Tia took care of every detail and made the most of our image. Flawless collaboration.', stars: 5, projectId: 'pcs' },
    { name: 'DestTime', role: 'Content Creator', text: 'Tia transformed our Instagram page with posts that are always polished and on-brand. The design quality shows, and so do the results. Highly recommended.', stars: 5, projectId: 'desttime-shaman-king' },
    { name: 'Gianluca Rigodanza', role: 'iPalBoyTV — YouTuber', text: 'The covers Tia made for my channel (Editorial Design Vol. 2B) are on another level. He understood exactly what I wanted to convey and turned it into an image that truly represents me. A real professional.', stars: 5, projectId: 'design-editoriale-2b' },
    { name: 'Ous', role: 'Music Artist', text: 'The cover for my track exceeded every expectation. Tia captured the essence of the music and turned it into a powerful, memorable image. Outstanding work.', stars: 5, projectId: 'flussi-di-coscienza' },
    { name: 'Stefano Golisano', role: 'GSA Hotels', text: 'The GSA Hotels website is elegant and impactful, exactly what we wanted for our property. Smooth animations and obsessive attention to detail. A flawless experience.', stars: 5, projectId: 'gsa-hotels' },
    { name: 'Vergilius Nectar', role: 'Brand', text: 'Website and graphics perfectly coordinated: Tia built a complete, consistent visual identity that truly represents us. Clear communication and results beyond expectations.', stars: 5, projectId: 'vergilius' },
    { name: 'Fiera Millenaria di Gonzaga', role: 'Event & Communication', text: 'Beautifully crafted posts and graphics that gave the Fair great visibility. Tia combines creativity with punctuality, always in line with the event\'s tradition. Great work.', stars: 5 },
    { name: 'Davide Moretti', role: 'Engineer', text: 'My engineering website is clean, professional and perfectly optimized for search engines. Tia turned my work into a refined, functional project. I couldn\'t be happier.', stars: 5, projectId: 'moretti' },
  ],
  es: [
    { name: 'Laura Bertoni', role: 'PCS Mantova', text: 'La nueva web de PCS Mantova es moderna, rápida y facilísima de navegar. Tia cuidó cada detalle y puso en valor nuestra imagen. Colaboración impecable.', stars: 5, projectId: 'pcs' },
    { name: 'DestTime', role: 'Content Creator', text: 'Tia transformó nuestra página de Instagram con publicaciones siempre cuidadas y coherentes con la marca. La calidad gráfica se nota, y los resultados también. Muy recomendado.', stars: 5, projectId: 'desttime-shaman-king' },
    { name: 'Gianluca Rigodanza', role: 'iPalBoyTV — Youtuber', text: 'Las portadas que Tia hizo para mi canal (Diseño Editorial Vol. 2B) son de otro nivel. Entendió exactamente lo que quería comunicar y lo convirtió en una imagen que me representa. Un verdadero profesional.', stars: 5, projectId: 'design-editoriale-2b' },
    { name: 'Ous', role: 'Artista musical', text: 'La portada de mi tema superó todas las expectativas. Tia captó la esencia de la música y la convirtió en una imagen potente y memorable. Un trabajo extraordinario.', stars: 5, projectId: 'flussi-di-coscienza' },
    { name: 'Stefano Golisano', role: 'GSA Hotels', text: 'La web de GSA Hotels es elegante y de gran impacto, justo lo que queríamos para nuestro establecimiento. Animaciones fluidas y una atención obsesiva al detalle. Una experiencia impecable.', stars: 5, projectId: 'gsa-hotels' },
    { name: 'Vergilius Nectar', role: 'Marca', text: 'Web y gráficos perfectamente coordinados: Tia construyó una identidad visual completa y coherente que nos representa de verdad. Comunicación clara y resultados más allá de lo esperado.', stars: 5, projectId: 'vergilius' },
    { name: 'Fiera Millenaria di Gonzaga', role: 'Evento & Comunicación', text: 'Publicaciones y gráficos muy cuidados que dieron gran visibilidad a la Feria. Tia une creatividad y puntualidad, con un estilo siempre fiel a la tradición del evento. Gran trabajo.', stars: 5 },
    { name: 'Davide Moretti', role: 'Ingeniero', text: 'Mi web de ingeniero es limpia, profesional y perfectamente optimizada para buscadores. Tia supo convertir mi trabajo en un proyecto refinado y funcional. No podría estar más satisfecho.', stars: 5, projectId: 'moretti' },
  ],
};

const PROJECTS_BY_LANG: Record<Lang, ProjectData[]> = {
  it: [
    { id: 'gsa-hotels', title: 'GSA Hotels', description: 'Prototipo di sito luxury per struttura ricettiva di alto livello. Design raffinato, animazioni fluide e sistema di prenotazione interattivo.', url: 'https://gsa-hotels-demo.vercel.app/', thumbnail: '/uploads/gsahotels.png', category: 'Sviluppo', tags: ['Next.js', 'Tailwind', 'Animazioni'] },
    { id: 'vergilius', title: 'Vergilius Nectar', description: 'Landing page per brand emergente. Visual identity curata, storytelling visivo d\'impatto e performance ottimizzate.', url: 'https://vergiliusnectar-github-io.vercel.app/', thumbnail: '/uploads/vergiliusnectar.png', category: 'Sviluppo', tags: ['React', 'Branding', 'UI Design'] },
    { id: 'moretti', title: 'Studio Ing. Moretti', description: 'Sito professionale per studio di ingegneria. Design pulito, ottimizzato SEO e performance al top. Online e operativo.', url: 'https://www.studioingmoretti.it/', thumbnail: '/uploads/studioingmoretti.png', category: 'Sviluppo', tags: ['Next.js', 'SEO', 'Sito Professionale'] },
    { id: 'pcs', title: 'PCS Mantova', description: 'Sito istituzionale per azienda del territorio mantovano. Struttura moderna, navigazione intuitiva e immagine coordinata.', url: 'https://pcsmantova-github-io.vercel.app/', thumbnail: '/uploads/pcsmantova.png', category: 'Sviluppo', tags: ['Next.js', 'Design', 'Sviluppo'] },
    { id: 'canapa', title: 'Canapa Store', description: 'Concept store per prodotti naturali. Esperienza d\'acquisto fluida con design minimal, palette terrosa e attenzione al dettaglio.', url: 'https://canapa-store.vercel.app/', thumbnail: '/uploads/canapastore.png', category: 'Sviluppo', tags: ['Next.js', 'E-commerce', 'UI Design'] },
    { id: 'showreel', title: 'Pigg', description: 'Cortometraggio realizzato per l\'Accademia di Belle Arti: la storia di un ragazzo bullizzato che si rimette in piedi da solo dopo che gli è stato affibbiato un nome che non gli appartiene.', url: 'https://youtu.be/rc6GzCBa2LY', thumbnail: '/uploads/pigg-cover.png', isVideo: true, category: 'Video', tags: ['Cortometraggio', 'Montaggio', 'Color Grading'] },
  ],
  en: [
    { id: 'gsa-hotels', title: 'GSA Hotels', description: 'Luxury hotel website prototype. Elegant design, smooth animations, and interactive booking system.', url: 'https://gsa-hotels-demo.vercel.app/', thumbnail: '/uploads/gsahotels.png', category: 'Sviluppo', tags: ['Next.js', 'Tailwind', 'Animations'] },
    { id: 'vergilius', title: 'Vergilius Nectar', description: 'Landing page for an emerging brand. Polished visual identity, impactful visual storytelling, and optimized performance.', url: 'https://vergiliusnectar-github-io.vercel.app/', thumbnail: '/uploads/vergiliusnectar.png', category: 'Sviluppo', tags: ['React', 'Branding', 'UI Design'] },
    { id: 'moretti', title: 'Studio Ing. Moretti', description: 'Professional website for an engineering firm. Clean design, SEO-optimized, top performance. Live and operational.', url: 'https://www.studioingmoretti.it/', thumbnail: '/uploads/studioingmoretti.png', category: 'Sviluppo', tags: ['Next.js', 'SEO', 'Professional Site'] },
    { id: 'pcs', title: 'PCS Mantova', description: 'Institutional website for a Mantua-based company. Modern structure, intuitive navigation, and coordinated branding.', url: 'https://pcsmantova-github-io.vercel.app/', thumbnail: '/uploads/pcsmantova.png', category: 'Sviluppo', tags: ['Next.js', 'Design', 'Development'] },
    { id: 'canapa', title: 'Canapa Store', description: 'Concept store for natural products. Smooth shopping experience with minimal design, earthy palette, and attention to detail.', url: 'https://canapa-store.vercel.app/', thumbnail: '/uploads/canapastore.png', category: 'Sviluppo', tags: ['Next.js', 'E-commerce', 'UI Design'] },
    { id: 'showreel', title: 'Pigg', description: 'Short film made for the Academy of Fine Arts: the story of a bullied boy who stands back up on his own after being given a name that doesn\'t belong to him.', url: 'https://youtu.be/rc6GzCBa2LY', thumbnail: '/uploads/pigg-cover.png', isVideo: true, category: 'Video', tags: ['Short Film', 'Editing', 'Color Grading'] },
  ],
  es: [
    { id: 'gsa-hotels', title: 'GSA Hotels', description: 'Prototipo de sitio web de lujo para hotel de alto nivel. Diseño elegante, animaciones fluidas y sistema de reservas interactivo.', url: 'https://gsa-hotels-demo.vercel.app/', thumbnail: '/uploads/gsahotels.png', category: 'Sviluppo', tags: ['Next.js', 'Tailwind', 'Animaciones'] },
    { id: 'vergilius', title: 'Vergilius Nectar', description: 'Landing page para marca emergente. Identidad visual cuidada, storytelling visual impactante y rendimiento optimizado.', url: 'https://vergiliusnectar-github-io.vercel.app/', thumbnail: '/uploads/vergiliusnectar.png', category: 'Sviluppo', tags: ['React', 'Branding', 'UI Design'] },
    { id: 'moretti', title: 'Studio Ing. Moretti', description: 'Sitio profesional para estudio de ingeniería. Diseño limpio, optimizado SEO y máximo rendimiento. Online y operativo.', url: 'https://www.studioingmoretti.it/', thumbnail: '/uploads/studioingmoretti.png', category: 'Sviluppo', tags: ['Next.js', 'SEO', 'Sitio Profesional'] },
    { id: 'pcs', title: 'PCS Mantova', description: 'Sitio institucional para empresa de la región de Mantua. Estructura moderna, navegación intuitiva e imagen coordinada.', url: 'https://pcsmantova-github-io.vercel.app/', thumbnail: '/uploads/pcsmantova.png', category: 'Sviluppo', tags: ['Next.js', 'Diseño', 'Desarrollo'] },
    { id: 'canapa', title: 'Canapa Store', description: 'Concept store para productos naturales. Experiencia de compra fluida con diseño minimal, paleta terrosa y atención al detalle.', url: 'https://canapa-store.vercel.app/', thumbnail: '/uploads/canapastore.png', category: 'Sviluppo', tags: ['Next.js', 'E-commerce', 'UI Design'] },
    { id: 'showreel', title: 'Pigg', description: 'Cortometraje realizado para la Academia de Bellas Artes: la historia de un chico acosado que se levanta por sí solo después de que le hayan puesto un nombre que no le pertenece.', url: 'https://youtu.be/rc6GzCBa2LY', thumbnail: '/uploads/pigg-cover.png', isVideo: true, category: 'Video', tags: ['Cortometraje', 'Edición', 'Color Grading'] },
  ],
};

const PRICING_ONETIME_BY_LANG: Record<Lang, PricingCategory[]> = {
  it: [
    {
      label: 'Sviluppo Web', subtitle: 'Siti web, dashboard, e-commerce e applicazioni web su misura.', tiers: [
        { title: 'Sito Web Professionale', price: '1.200', period: '', description: 'Sito vetrina o landing page responsive', delivery: 'Consegna in 2-3 settimane', features: ['UI/UX design personalizzato', 'Sviluppo Next.js / React', 'Responsive e mobile-first', 'SEO tecnico e performance'] },
        { title: 'Piattaforma Web', price: '3.500', period: '', popular: true, description: 'SaaS, marketplace, e-commerce o dashboard', delivery: 'Consegna in 4-6 settimane', features: ['Architettura full-stack scalabile', 'Backend e API integrate', 'Autenticazione e database', 'Pannello admin e dashboard', 'Deploy e CI/CD inclusi'] },
        { title: 'Soluzione Web Enterprise', price: '6500', priceLabel: 'Da €6.500', period: '', premium: true, description: 'Sistemi web complessi, multi-tenant, alta affidabilità', delivery: 'Su misura per te', features: ['Architettura cloud scalabile', 'Multi-tenancy e ruoli avanzati', 'Integrazioni API di terze parti', 'GDPR e compliance inclusi', 'Supporto e manutenzione 6 mesi'] },
      ]
    },
    {
      label: 'Design', subtitle: 'Brand identity, grafica social, UI/UX e comunicazione visiva a 360°.', tiers: [
        { title: 'Brand Identity', price: '500', period: '', description: 'Logo, palette, tipografia e linee guida base', delivery: 'Consegna in 5-7 giorni', features: ['Logo e identità visiva', 'Palette colori e tipografia', 'Brand guidelines base', 'Carte da visita digitali'] },
        { title: 'Social & Graphic Pack', price: '900', period: '', popular: true, description: 'Post social, thumbnail, flyer, locandine e grafiche marketing', delivery: 'Consegna in 7-10 giorni', features: ['10 post social o thumbnail', 'Flyer / locandine / poster', 'Grafiche per streamer', 'Materiali marketing coordinati', 'Formati ottimizzati per ogni piattaforma'] },
        { title: 'Ecosistema Brand Completo', price: '2.800', period: '', premium: true, description: 'Identità visiva totale + UI/UX + comunicazione', delivery: 'Su misura per te', features: ['Brand strategy e posizionamento', 'Visual identity completa (logo, colori, font, pattern)', 'UI/UX design (sito o app)', 'Graphic system per social e print', 'Linee guida e asset kit completi'] },
      ]
    },
    {
      label: 'Software & App', subtitle: 'Applicazioni mobile, software su misura e sistemi backend.', tiers: [
        { title: 'MVP o App Mobile', price: '3.800', period: '', description: 'Per startup, PMI o tool interni', delivery: 'Consegna in 4-8 settimane', features: ['Analisi requisiti e architettura', 'Backend e API dedicate', 'Autenticazione e database', 'App mobile'] },
        { title: 'Piattaforma Scalabile', price: '8000', priceLabel: 'Da €8.000', period: '', popular: true, description: 'Soluzioni enterprise, SaaS, sistemi complessi', delivery: 'Su misura per te', features: ['Architettura modulare e scalabile', 'Ruoli, permessi e multi-tenancy', 'Integrazioni API di terze parti', 'Automazioni e reportistica', 'Supporto e manutenzione inclusi'] },
        { title: 'Soluzione Enterprise', price: '15000', priceLabel: 'Da €15.000', period: '', premium: true, description: 'Progetti mission-critical, alta disponibilità', delivery: 'Su misura per te', features: ['Infrastruttura cloud multi-region', 'DevOps, CI/CD e monitoraggio 24/7', 'API pubbliche e documentazione', 'GDPR, audit e compliance', 'SLA garantito e team dedicato'] },
      ]
    },
    {
      label: 'Video Making', subtitle: 'Produzione, montaggio e motion graphics.', tiers: [
        { title: 'Video Essenziale', price: '600', period: '', description: 'Montaggio base, clip per social e reel', delivery: 'Consegna in 3-5 giorni', features: ['Montaggio professionale', 'Color correction base', 'Audio mixing essenziale', 'Export ottimizzato per social', '2 revisioni incluse'] },
        { title: 'Produzione Completa', price: '2.200', period: '', popular: true, description: 'Video aziendali, spot, contenuti brand', delivery: 'Consegna in 1-2 settimane', features: ['Riprese in studio o in location', 'Motion graphics e VFX', 'Color grading avanzato', 'Sound design e colonna sonora', 'Revisioni illimitate fino a ok finale'] },
        { title: 'Spot Pubblicitario', price: '4.500', period: '', premium: true, description: 'Campagne adv, TV, cinema e digitale', delivery: 'Su misura per te', features: ['Concept creativo e script', 'Location scouting e casting', 'Riprese multi-camera 4K/6K', 'Post-produzione broadcast', 'Adattamento multi-formato (TV, social, DOOH)'] },
      ]
    },
  ],
  en: [
    {
      label: 'Web Development', subtitle: 'Custom websites, dashboards, e-commerce and web applications.', tiers: [
        { title: 'Professional Website', price: '1.200', period: '', description: 'Showcase site or responsive landing page', delivery: 'Delivery in 2-3 weeks', features: ['Custom UI/UX design', 'Next.js / React development', 'Responsive and mobile-first', 'Technical SEO and performance'] },
        { title: 'Web Platform', price: '3.500', period: '', popular: true, description: 'SaaS, marketplace, e-commerce or dashboard', delivery: 'Delivery in 4-6 weeks', features: ['Scalable full-stack architecture', 'Integrated backend and APIs', 'Authentication and database', 'Admin panel and dashboard', 'Deploy and CI/CD included'] },
        { title: 'Enterprise Web Solution', price: '6500', priceLabel: 'From €6,500', period: '', premium: true, description: 'Complex web systems, multi-tenant, high reliability', delivery: 'Tailored for you', features: ['Scalable cloud architecture', 'Multi-tenancy and advanced roles', 'Third-party API integrations', 'GDPR and compliance included', '6 months support and maintenance'] },
      ]
    },
    {
      label: 'Design', subtitle: 'Brand identity, social graphics, UI/UX and visual communication at 360°.', tiers: [
        { title: 'Brand Identity', price: '500', period: '', description: 'Logo, color palette, typography and basic guidelines', delivery: 'Delivery in 5-7 days', features: ['Logo and visual identity', 'Color palette and typography', 'Basic brand guidelines', 'Digital business cards'] },
        { title: 'Social & Graphic Pack', price: '900', period: '', popular: true, description: 'Social posts, thumbnails, flyers, posters and marketing graphics', delivery: 'Delivery in 7-10 days', features: ['10 social posts or thumbnails', 'Flyers / posters', 'Streamer graphics', 'Coordinated marketing materials', 'Multi-platform optimized formats'] },
        { title: 'Complete Brand Ecosystem', price: '2.800', period: '', premium: true, description: 'Total visual identity + UI/UX + communication', delivery: 'Tailored for you', features: ['Brand strategy and positioning', 'Complete visual identity (logo, colors, fonts, patterns)', 'UI/UX design (website or app)', 'Graphic system for social and print', 'Guidelines and complete asset kit'] },
      ]
    },
    {
      label: 'Software & Apps', subtitle: 'Mobile applications, custom software and backend systems.', tiers: [
        { title: 'MVP or Mobile App', price: '3.800', period: '', description: 'For startups, SMEs or internal tools', delivery: 'Delivery in 4-8 weeks', features: ['Requirements analysis and architecture', 'Dedicated backend and APIs', 'Authentication and database', 'Mobile app'] },
        { title: 'Scalable Platform', price: '8000', priceLabel: 'From €8,000', period: '', popular: true, description: 'Enterprise solutions, SaaS, complex systems', delivery: 'Tailored for you', features: ['Modular and scalable architecture', 'Roles, permissions and multi-tenancy', 'Third-party API integrations', 'Automations and reporting', 'Support and maintenance included'] },
        { title: 'Enterprise Solution', price: '15000', priceLabel: 'From €15,000', period: '', premium: true, description: 'Mission-critical projects, high availability', delivery: 'Tailored for you', features: ['Multi-region cloud infrastructure', 'DevOps, CI/CD and 24/7 monitoring', 'Public APIs and documentation', 'GDPR, audit and compliance', 'Guaranteed SLA and dedicated team'] },
      ]
    },
    {
      label: 'Video Making', subtitle: 'Production, editing and motion graphics.', tiers: [
        { title: 'Essential Video', price: '600', period: '', description: 'Basic editing, social clips and reels', delivery: 'Delivery in 3-5 days', features: ['Professional editing', 'Basic color correction', 'Essential audio mixing', 'Social-optimized export', '2 revisions included'] },
        { title: 'Complete Production', price: '2.200', period: '', popular: true, description: 'Corporate videos, commercials, brand content', delivery: 'Delivery in 1-2 weeks', features: ['Studio or on-location shooting', 'Motion graphics and VFX', 'Advanced color grading', 'Sound design and soundtrack', 'Unlimited revisions until final approval'] },
        { title: 'TV Commercial', price: '4.500', period: '', premium: true, description: 'Ad campaigns, TV, cinema and digital', delivery: 'Tailored for you', features: ['Creative concept and script', 'Location scouting and casting', 'Multi-camera 4K/6K shooting', 'Broadcast post-production', 'Multi-format adaptation (TV, social, DOOH)'] },
      ]
    },
  ],
  es: [
    {
      label: 'Desarrollo Web', subtitle: 'Sitios web, paneles, e-commerce y aplicaciones web a medida.', tiers: [
        { title: 'Sitio Web Profesional', price: '1.200', period: '', description: 'Sitio vitrina o landing page responsive', delivery: 'Entrega en 2-3 semanas', features: ['Diseño UI/UX personalizado', 'Desarrollo Next.js / React', 'Responsive y mobile-first', 'SEO técnico y rendimiento'] },
        { title: 'Plataforma Web', price: '3.500', period: '', popular: true, description: 'SaaS, marketplace, e-commerce o panel', delivery: 'Entrega en 4-6 semanas', features: ['Arquitectura full-stack escalable', 'Backend y APIs integradas', 'Autenticación y base de datos', 'Panel de administración', 'Deploy y CI/CD incluidos'] },
        { title: 'Solución Web Enterprise', price: '6500', priceLabel: 'Desde 6.500 €', period: '', premium: true, description: 'Sistemas web complejos, multi-tenant, alta fiabilidad', delivery: 'A tu medida', features: ['Arquitectura cloud escalable', 'Multi-tenancy y roles avanzados', 'Integraciones API de terceros', 'GDPR y compliance incluidos', '6 meses de soporte y mantenimiento'] },
      ]
    },
    {
      label: 'Diseño', subtitle: 'Identidad de marca, gráfica social, UI/UX y comunicación visual 360°.', tiers: [
        { title: 'Identidad de Marca', price: '500', period: '', description: 'Logo, paleta de colores, tipografía y guías básicas', delivery: 'Entrega en 5-7 días', features: ['Logo e identidad visual', 'Paleta de colores y tipografía', 'Guías de marca básicas', 'Tarjetas de visita digitales'] },
        { title: 'Pack Social & Gráfico', price: '900', period: '', popular: true, description: 'Posts sociales, miniaturas, flyers, carteles y gráficos de marketing', delivery: 'Entrega en 7-10 días', features: ['10 posts sociales o miniaturas', 'Flyers / carteles', 'Gráficos para streamers', 'Materiales de marketing coordinados', 'Formatos multi-plataforma optimizados'] },
        { title: 'Ecosistema de Marca Completo', price: '2.800', period: '', premium: true, description: 'Identidad visual total + UI/UX + comunicación', delivery: 'A tu medida', features: ['Estrategia y posicionamiento de marca', 'Identidad visual completa (logo, colores, fuentes, patrones)', 'Diseño UI/UX (web o app)', 'Sistema gráfico para social e impresión', 'Guías y kit de assets completo'] },
      ]
    },
    {
      label: 'Software y Apps', subtitle: 'Aplicaciones móviles, software a medida y sistemas backend.', tiers: [
        { title: 'MVP o App Móvil', price: '3.800', period: '', description: 'Para startups, PYMEs o herramientas internas', delivery: 'Entrega en 4-8 semanas', features: ['Análisis de requisitos y arquitectura', 'Backend y APIs dedicadas', 'Autenticación y base de datos', 'App móvil'] },
        { title: 'Plataforma Escalable', price: '8000', priceLabel: 'Desde 8.000 €', period: '', popular: true, description: 'Soluciones enterprise, SaaS, sistemas complejos', delivery: 'A tu medida', features: ['Arquitectura modular y escalable', 'Roles, permisos y multi-tenancy', 'Integraciones API de terceros', 'Automatizaciones y reporting', 'Soporte y mantenimiento incluidos'] },
        { title: 'Solución Enterprise', price: '15000', priceLabel: 'Desde 15.000 €', period: '', premium: true, description: 'Proyectos de misión crítica, alta disponibilidad', delivery: 'A tu medida', features: ['Infraestructura cloud multi-región', 'DevOps, CI/CD y monitorización 24/7', 'APIs públicas y documentación', 'GDPR, auditoría y compliance', 'SLA garantizado y equipo dedicado'] },
      ]
    },
    {
      label: 'Producción de Video', subtitle: 'Producción, edición y motion graphics.', tiers: [
        { title: 'Video Esencial', price: '600', period: '', description: 'Edición básica, clips sociales y reels', delivery: 'Entrega en 3-5 días', features: ['Edición profesional', 'Corrección de color básica', 'Mezcla de audio esencial', 'Exportación optimizada para redes', '2 revisiones incluidas'] },
        { title: 'Producción Completa', price: '2.200', period: '', popular: true, description: 'Videos corporativos, spots, contenido de marca', delivery: 'Entrega en 1-2 semanas', features: ['Grabación en estudio o locación', 'Motion graphics y VFX', 'Color grading avanzado', 'Diseño de sonido y banda sonora', 'Revisiones ilimitadas hasta aprobación final'] },
        { title: 'Spot Publicitario', price: '4.500', period: '', premium: true, description: 'Campañas publicitarias, TV, cine y digital', delivery: 'A tu medida', features: ['Concepto creativo y guión', 'Búsqueda de locaciones y casting', 'Grabación multi-cámara 4K/6K', 'Post-producción broadcast', 'Adaptación multi-formato (TV, social, DOOH)'] },
      ]
    },
  ],
};

const PRICING_MONTHLY_BY_LANG: Record<Lang, PricingCategory[]> = {
  it: [
    {
      label: 'Sviluppo Web', subtitle: 'Manutenzione e crescita della tua presenza web.', tiers: [
        { title: 'Website Care', price: '350', period: '/mese', description: 'Manutenzione e aggiornamenti continui', delivery: 'Attivazione immediata', features: ['Aggiornamenti contenuti illimitati', 'Ottimizzazione performance mensile', 'Backup e sicurezza', '1 revisione design al mese', 'Report mensile'] },
        { title: 'Web Growth', price: '1.500', period: '/mese', popular: true, description: 'Sviluppo iterativo e miglioramento continuo', delivery: 'Attivazione immediata', features: ['Nuove feature ogni sprint', 'A/B testing e analytics', 'SEO continuativo', 'Iterazioni settimanali', 'Priority support'] },
        { title: 'Web Partnership', price: '3.000', period: '/mese', premium: true, description: 'Partner web embedded nel team', delivery: 'Inizio immediato', hours: 'Fino a 40h/settimana, flessibili', features: ['Architettura e code review continui', 'Codebase proprietaria e IP tuo', 'CI/CD e monitoraggio proattivo', 'Roadmap co-gestita trimestrale'] },
      ]
    },
    {
      label: 'Design', subtitle: 'Brand identity, grafica social, UI/UX e comunicazione continuativa.', tiers: [
        { title: 'Social Care', price: '350', period: '/mese', description: 'Contenuti social e grafiche ricorrenti', delivery: 'Attivazione immediata', features: ['8 post social o thumbnail al mese', 'Grafiche per social e marketing', 'Revisioni illimitate fino a ok', 'Formati multi-piattaforma', 'Report engagement mensile'] },
        { title: 'Brand Growth', price: '750', period: '/mese', popular: true, description: 'Gestione continuativa brand e comunicazione visiva', delivery: 'Attivazione immediata', features: ['15 asset grafici al mese (post, flyer, locandine)', 'Strategia editoriale visuale', 'Cover art e thumbnail YouTube', 'Materiali marketing e print', 'Priority support e iterazioni rapide'] },
        { title: 'Design Partnership', price: '1.200', period: '/mese', premium: true, description: 'Partner creativo embedded nel brand', delivery: 'Inizio immediato', hours: 'Fino a 25h/settimana, flessibili', features: ['Brand strategy continuativa', 'Grafiche per social, print, video e web', 'UI/UX design e prototipazione', 'Workshop creativi e report strategico'] },
      ]
    },
    {
      label: 'Software & App', subtitle: 'Team esterno dedicato, mese per mese.', tiers: [
        { title: 'Dev Part-Time', price: '1.500', period: '/mese', description: 'Sviluppo dedicato su base mensile', delivery: 'Attivazione in 24-48h', hours: 'Fino a 10h/settimana, flessibili', features: ['Code review e documentazione', 'Deploy e CI/CD gestiti', 'Canale Slack dedicato', 'Sprint bisettimanali'] },
        { title: 'Dev Full-Time', price: '3.500', period: '/mese', popular: true, description: 'Risorse scalabili per progetti complessi', delivery: 'Attivazione in 24-48h', hours: 'Fino a 25h/settimana, flessibili', features: ['Tech lead e architettura inclusi', 'Gestione progetto Agile', 'On-call per emergenze', 'Reportistica avanzata'] },
        { title: 'Tech Partnership', price: '5.500', period: '/mese', premium: true, description: 'Sviluppatore senior embedded nel tuo team', delivery: 'Inizio immediato', hours: 'Fino a 40h/settimana, flessibili', features: ['Architettura e code review continui', 'Codebase proprietaria e IP tuo', 'CI/CD e monitoraggio proattivo', 'Roadmap co-gestita trimestrale'] },
      ]
    },
    {
      label: 'Video Making', subtitle: 'Contenuti video costanti per social e brand.', tiers: [
        { title: 'Social Pack', price: '450', period: '/mese', description: 'Pacchetto mensile reel e short', delivery: 'Attivazione immediata', features: ['4 reel/short al mese', 'Motion graphics inclusa', 'Strategia editoriale', 'Adattamento multi-piattaforma', '2 revisioni a video'] },
        { title: 'Content Studio', price: '1.500', period: '/mese', popular: true, description: 'Produzione video continuativa', delivery: 'Attivazione immediata', features: ['4 video professionali al mese', 'Riprese in sede o remote', 'Post-produzione completa', 'Stock footage illimitato', 'Brand kit video dedicato'] },
        { title: 'Brand Studio', price: '2.500', period: '/mese', premium: true, description: 'Partner video embedded nel tuo brand', delivery: 'Inizio immediato', features: ['6 video professionali al mese', 'Motion graphics e VFX inclusi', 'Strategia editoriale mensile', 'Report analytics performance', 'Accesso a footage library esclusiva'] },
      ]
    },
  ],
  en: [
    {
      label: 'Web Development', subtitle: 'Maintenance and growth of your web presence.', tiers: [
        { title: 'Website Care', price: '350', period: '/month', description: 'Ongoing maintenance and updates', delivery: 'Immediate activation', features: ['Unlimited content updates', 'Monthly performance optimization', 'Backup and security', '1 design revision per month', 'Monthly report'] },
        { title: 'Web Growth', price: '1.500', period: '/month', popular: true, description: 'Iterative development and continuous improvement', delivery: 'Immediate activation', features: ['New features every sprint', 'A/B testing and analytics', 'Ongoing SEO', 'Weekly iterations', 'Priority support'] },
        { title: 'Web Partnership', price: '3.000', period: '/month', premium: true, description: 'Web partner embedded in your team', delivery: 'Immediate start', hours: 'Up to 40h/week, flexible', features: ['Continuous architecture and code reviews', 'Proprietary codebase — your IP', 'CI/CD and proactive monitoring', 'Co-managed quarterly roadmap'] },
      ]
    },
    {
      label: 'Design', subtitle: 'Brand identity, social graphics, UI/UX and ongoing visual communication.', tiers: [
        { title: 'Social Care', price: '350', period: '/month', description: 'Recurring social content and graphics', delivery: 'Immediate activation', features: ['8 social posts or thumbnails per month', 'Social and marketing graphics', 'Unlimited revisions until OK', 'Multi-platform formats', 'Monthly engagement report'] },
        { title: 'Brand Growth', price: '750', period: '/month', popular: true, description: 'Ongoing brand management and visual communication', delivery: 'Immediate activation', features: ['15 graphic assets per month (posts, flyers, posters)', 'Visual editorial strategy', 'YouTube cover art and thumbnails', 'Marketing and print materials', 'Priority support and fast iterations'] },
        { title: 'Design Partnership', price: '1.200', period: '/month', premium: true, description: 'Creative partner embedded in your brand', delivery: 'Immediate start', hours: 'Up to 25h/week, flexible', features: ['Ongoing brand strategy', 'Graphics for social, print, video and web', 'UI/UX design and prototyping', 'Creative workshops and strategic reporting'] },
      ]
    },
    {
      label: 'Software & Apps', subtitle: 'Dedicated external team, month by month.', tiers: [
        { title: 'Dev Part-Time', price: '1.500', period: '/month', description: 'Dedicated monthly development', delivery: 'Activation in 24-48h', hours: 'Up to 10h/week, flexible', features: ['Code review and documentation', 'Managed deploy and CI/CD', 'Dedicated Slack channel', 'Bi-weekly sprints'] },
        { title: 'Dev Full-Time', price: '3.500', period: '/month', popular: true, description: 'Scalable resources for complex projects', delivery: 'Activation in 24-48h', hours: 'Up to 25h/week, flexible', features: ['Tech lead and architecture included', 'Agile project management', 'On-call for emergencies', 'Advanced reporting'] },
        { title: 'Tech Partnership', price: '5.500', period: '/month', premium: true, description: 'Senior developer embedded in your team', delivery: 'Immediate start', hours: 'Up to 40h/week, flexible', features: ['Continuous architecture and code reviews', 'Proprietary codebase — your IP', 'CI/CD and proactive monitoring', 'Co-managed quarterly roadmap'] },
      ]
    },
    {
      label: 'Video Making', subtitle: 'Consistent video content for social and brand.', tiers: [
        { title: 'Social Pack', price: '450', period: '/month', description: 'Monthly reel and short package', delivery: 'Immediate activation', features: ['4 reels/shorts per month', 'Motion graphics included', 'Editorial strategy', 'Multi-platform adaptation', '2 revisions per video'] },
        { title: 'Content Studio', price: '1.500', period: '/month', popular: true, description: 'Ongoing video production', delivery: 'Immediate activation', features: ['4 professional videos per month', 'On-site or remote shooting', 'Full post-production', 'Unlimited stock footage', 'Dedicated video brand kit'] },
        { title: 'Brand Studio', price: '2.500', period: '/month', premium: true, description: 'Video partner embedded in your brand', delivery: 'Immediate start', features: ['6 professional videos per month', 'Motion graphics and VFX included', 'Monthly editorial strategy', 'Performance analytics report', 'Access to exclusive footage library'] },
      ]
    },
  ],
  es: [
    {
      label: 'Desarrollo Web', subtitle: 'Mantenimiento y crecimiento de tu presencia web.', tiers: [
        { title: 'Website Care', price: '350', period: '/mes', description: 'Mantenimiento y actualizaciones continuas', delivery: 'Activación inmediata', features: ['Actualizaciones de contenido ilimitadas', 'Optimización mensual de rendimiento', 'Backup y seguridad', '1 revisión de diseño al mes', 'Informe mensual'] },
        { title: 'Web Growth', price: '1.500', period: '/mes', popular: true, description: 'Desarrollo iterativo y mejora continua', delivery: 'Activación inmediata', features: ['Nuevas funcionalidades cada sprint', 'A/B testing y analytics', 'SEO continuo', 'Iteraciones semanales', 'Soporte prioritario'] },
        { title: 'Web Partnership', price: '3.000', period: '/mes', premium: true, description: 'Socio web integrado en tu equipo', delivery: 'Inicio inmediato', hours: 'Hasta 40h/semana, flexible', features: ['Arquitectura y revisiones de código continuas', 'Código propietario — tu IP', 'CI/CD y monitorización proactiva', 'Roadmap co-gestionado trimestral'] },
      ]
    },
    {
      label: 'Diseño', subtitle: 'Identidad de marca, gráfica social, UI/UX y comunicación visual continua.', tiers: [
        { title: 'Social Care', price: '350', period: '/mes', description: 'Contenido social recurrente y gráficos', delivery: 'Activación inmediata', features: ['8 posts sociales o miniaturas al mes', 'Gráficos para redes y marketing', 'Revisiones ilimitadas hasta OK', 'Formatos multi-plataforma', 'Informe mensual de engagement'] },
        { title: 'Brand Growth', price: '750', period: '/mes', popular: true, description: 'Gestión continua de marca y comunicación visual', delivery: 'Activación inmediata', features: ['15 assets gráficos al mes (posts, flyers, carteles)', 'Estrategia editorial visual', 'Portadas y miniaturas YouTube', 'Materiales de marketing e impresión', 'Soporte prioritario e iteraciones rápidas'] },
        { title: 'Design Partnership', price: '1.200', period: '/mes', premium: true, description: 'Socio creativo integrado en tu marca', delivery: 'Inicio inmediato', hours: 'Hasta 25h/semana, flexible', features: ['Estrategia de marca continua', 'Gráficos para social, impresión, video y web', 'Diseño UI/UX y prototipado', 'Talleres creativos e informe estratégico'] },
      ]
    },
    {
      label: 'Software y Apps', subtitle: 'Equipo externo dedicado, mes a mes.', tiers: [
        { title: 'Dev Part-Time', price: '1.500', period: '/mes', description: 'Desarrollo dedicado mensual', delivery: 'Activación en 24-48h', hours: 'Hasta 10h/semana, flexible', features: ['Code review y documentación', 'Deploy y CI/CD gestionados', 'Canal Slack dedicado', 'Sprints bisemanales'] },
        { title: 'Dev Full-Time', price: '3.500', period: '/mes', popular: true, description: 'Recursos escalables para proyectos complejos', delivery: 'Activación en 24-48h', hours: 'Hasta 25h/semana, flexible', features: ['Tech lead y arquitectura incluidos', 'Gestión de proyecto Agile', 'Guardia para emergencias', 'Informes avanzados'] },
        { title: 'Tech Partnership', price: '5.500', period: '/mes', premium: true, description: 'Desarrollador senior integrado en tu equipo', delivery: 'Inicio inmediato', hours: 'Hasta 40h/semana, flexible', features: ['Arquitectura y revisiones de código continuas', 'Código propietario — tu IP', 'CI/CD y monitorización proactiva', 'Roadmap co-gestionado trimestral'] },
      ]
    },
    {
      label: 'Producción de Video', subtitle: 'Contenido de video constante para redes y marca.', tiers: [
        { title: 'Social Pack', price: '450', period: '/mes', description: 'Paquete mensual de reels y shorts', delivery: 'Activación inmediata', features: ['4 reels/shorts al mes', 'Motion graphics incluida', 'Estrategia editorial', 'Adaptación multi-plataforma', '2 revisiones por video'] },
        { title: 'Content Studio', price: '1.500', period: '/mes', popular: true, description: 'Producción de video continua', delivery: 'Activación inmediata', features: ['4 videos profesionales al mes', 'Grabación en sede o remota', 'Post-producción completa', 'Stock footage ilimitado', 'Kit de marca de video dedicado'] },
        { title: 'Brand Studio', price: '2.500', period: '/mes', premium: true, description: 'Socio de video integrado en tu marca', delivery: 'Inicio inmediato', features: ['6 videos profesionales al mes', 'Motion graphics y VFX incluidos', 'Estrategia editorial mensual', 'Informe de analytics de rendimiento', 'Acceso a biblioteca de footage exclusiva'] },
      ]
    },
  ],
};

export function getReviews(lang: Lang): Review[] {
  return REVIEWS_BY_LANG[lang] || REVIEWS_BY_LANG.it;
}

export function getProjects(lang: Lang): ProjectData[] {
  const baseProjects = PROJECTS_BY_LANG[lang] || PROJECTS_BY_LANG.it;
  return [...baseProjects, ...getDesignWorks(lang)];
}

export function getPricingOnetime(lang: Lang): PricingCategory[] {
  return PRICING_ONETIME_BY_LANG[lang] || PRICING_ONETIME_BY_LANG.it;
}

export function getPricingMonthly(lang: Lang): PricingCategory[] {
  return PRICING_MONTHLY_BY_LANG[lang] || PRICING_MONTHLY_BY_LANG.it;
}
