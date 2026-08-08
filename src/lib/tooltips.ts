/**
 * Tooltip explanations for pricing tier features.
 *
 * BY_LANG pattern — same as FAQS_BY_LANG, LEGAL_DOCS_BY_LANG.
 * Import getTooltip(lang) and call it with the feature key and current language.
 *
 *   const tip = getTooltip(feature, lang);
 *
 * To add a new tooltip, add the key to all three language maps.
 */

import type { Lang } from './translations';

const IT: Record<string, string> = {
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

const EN: Record<string, string> = {
  // ─── Web Development ──────────────────────────────
  'SEO tecnico e performance': 'Search engine optimization: semantic structure, Core Web Vitals, loading speed and optimized meta tags.',
  'Sviluppo Next.js / React': 'React framework with hybrid rendering (SSR + SSG), advanced routing, optimized images and built-in APIs for native performance and SEO.',
  'UI/UX design personalizzato': 'Custom-tailored user interface for your brand, with wireframes, interactive prototypes and a coherent design system.',
  'Responsive e mobile-first': 'The site perfectly adapts to any device (mobile, tablet, desktop) starting from a mobile-first design approach.',
  'Consegna in 2-3 settimane': 'Clear and respected delivery times: from contract signing to go-live, with intermediate milestones and weekly updates.',
  'Architettura full-stack scalabile': 'Backend and frontend designed to grow with your business, with load balancing and layered caching.',
  'Backend e API integrate': 'REST/GraphQL APIs connecting frontend, mobile apps, external services and databases in a unified, cohesive architecture.',
  'Autenticazione e database': 'Secure login system (OAuth, 2FA, magic link) and relational database optimized for performance and reliability.',
  'Pannello admin e dashboard': 'Administration interface to manage content, users and data without touching code. Customizable to your needs.',
  'Deploy e CI/CD inclusi': 'Automatic cloud deployment (Vercel, AWS, Netlify) with continuous integration pipeline, automated tests and instant rollback.',
  'Architettura cloud scalabile': 'Cloud provider infrastructure (AWS, GCP, Azure) with auto-scaling, load balancing and multi-region replication for high availability.',
  'Multi-tenancy e ruoli avanzati': 'Multi-client architecture: each user or company gets their own isolated space with roles, permissions and separate customizations.',
  'Supporto e manutenzione 6 mesi': 'Post-launch support for 6 months: bug fixes, security updates, backups and priority technical assistance.',
  'Integrazioni API di terze parti': 'Connection with external services like Stripe, HubSpot, Salesforce, Google Analytics, social login and third-party APIs to extend project functionality.',

  // ─── Design ──────────────────────────────────────
  'Brand guidelines base': 'Document defining brand usage rules: logo, colors, fonts, tone of voice and correct applications to maintain visual consistency.',
  'Carte da visita digitali': 'Digital business cards (vCard, PDF, shareable link) ready for email, WhatsApp and social media, with integrated QR code.',
  'Formati ottimizzati per ogni piattaforma': 'Every graphic is exported at the correct dimensions and specs for Instagram, Facebook, LinkedIn, YouTube, TikTok and web — no more cropping or distortion.',
  'Materiali marketing coordinati': 'Complete set of promotional materials with the same visual identity: flyers, brochures, banners, signage, presentations and email templates.',
  'Grafiche per streamer': 'Complete live streaming branding: overlays, webcam borders, waiting scenes, follower/donation alerts, panels and custom emotes.',
  'Brand strategy e posizionamento': 'Brand strategy definition: mission, vision, values, target audience, tone of voice and competitor positioning.',
  'Visual identity completa (logo, colori, font, pattern)': 'Complete visual system including primary and secondary logo, extended palette, typography, decorative patterns and applications on all touchpoints.',
  'Graphic system per social e print': 'System of reusable graphic templates to maintain visual consistency across all social channels (posts, stories, covers) and print materials (cards, folders, posters).',
  'Linee guida e asset kit completi': 'Complete kit of all brand assets in vector and raster formats, accompanied by detailed guidelines for designers, suppliers and partners.',
  'Strategia editoriale visuale': 'Editorial calendar based on business objectives, with visual content planning, posting frequency and format mix to maximize engagement.',
  'Cover art e thumbnail YouTube': 'Custom YouTube video thumbnails optimized for CTR: composition, contrasting colors, readable text and brand consistency across the channel.',
  'Workshop creativi e report strategico': 'Collaborative brainstorming and co-design sessions to align vision and goals, followed by monthly reports with KPIs, insights and strategic recommendations.',

  // ─── Software & App ──────────────────────────────
  'Design system completo': 'Library of reusable UI components with consistent design rules, documented and ready to scale.',
  'PWA o app mobile (React Native)': 'Progressive Web App: a web app that installs on the device like a native app, with offline access and push notifications.',
  'API pubbliche e documentazione': 'REST/GraphQL interfaces documented with Swagger to allow external developers to integrate your services.',
  'GDPR, audit e compliance': 'Compliance with the General Data Protection Regulation (GDPR) and preparation for security audits and certifications.',
  'GDPR e compliance inclusi': 'GDPR compliance included in the project: data impact assessment, cookie policy, privacy policy and compliance documentation ready for certifications.',
  'SLA garantito e team dedicato': 'Service Level Agreement: contractual commitment on response times, service availability and penalties in case of downtime.',
  'DevOps, CI/CD e monitoraggio 24/7': 'Continuous Integration/Deployment pipeline for automated releases, automated tests and proactive 24/7 monitoring.',
  'Sprint bisettimanali': 'Bi-weekly agile development cycles: planning, development, demo and retrospective for continuous improvement.',
  'SRE e monitoraggio 24/7': 'Site Reliability Engineering: proactive infrastructure management with automation, alerting and incident response.',
  'Codebase proprietaria e IP tuo': 'All source code developed is your exclusive intellectual property, with no third-party constraints or licenses.',
  'Roadmap co-gestita trimestrale': 'Shared strategic planning every 3 months to align development and business objectives.',
  'Report strategico mensile': 'Monthly report with KPIs, analytics, project progress and data-driven strategic recommendations.',

  // ─── Content & Video ─────────────────────────────
  'Content strategy e copywriting': 'Complete editorial strategy: tone of voice, content calendar and persuasive copy optimized for your audience.',
  'Post-produzione broadcast': 'Editing and color grading meeting broadcast quality standards for television, cinema and professional streaming platforms.',
  'Footage library esclusiva': 'Private archive of video footage (stock, B-roll, original recordings) accessible exclusively to your brand.',
};

const ES: Record<string, string> = {
  // ─── Desarrollo Web ───────────────────────────────
  'SEO tecnico e performance': 'Optimización para motores de búsqueda: estructura semántica, Core Web Vitals, velocidad de carga y meta tags optimizados.',
  'Sviluppo Next.js / React': 'Framework React con renderizado híbrido (SSR + SSG), enrutamiento avanzado, imágenes optimizadas y API integradas para rendimiento y SEO nativos.',
  'UI/UX design personalizzato': 'Interfaz de usuario diseñada a medida para tu marca, con wireframes, prototipos interactivos y un sistema de diseño coherente.',
  'Responsive e mobile-first': 'El sitio se adapta perfectamente a cualquier dispositivo (móvil, tablet, escritorio) partiendo del diseño para pantallas pequeñas.',
  'Consegna in 2-3 settimane': 'Plazos de entrega claros y cumplidos: desde la firma del contrato hasta el lanzamiento, con hitos intermedios y actualizaciones semanales.',
  'Architettura full-stack scalabile': 'Backend y frontend diseñados para crecer con tu negocio, con balanceo de carga y caché estratificada.',
  'Backend e API integrate': 'APIs REST/GraphQL para conectar frontend, apps móviles, servicios externos y bases de datos en una arquitectura única y cohesionada.',
  'Autenticazione e database': 'Sistema de inicio de sesión seguro (OAuth, 2FA, magic link) y base de datos relacional optimizada para rendimiento y fiabilidad.',
  'Pannello admin e dashboard': 'Interfaz de administración para gestionar contenidos, usuarios y datos sin tocar código. Personalizable según tus necesidades.',
  'Deploy e CI/CD inclusi': 'Despliegue automático en la nube (Vercel, AWS, Netlify) con pipeline de integración continua, tests automáticos y retroceso inmediato.',
  'Architettura cloud scalabile': 'Infraestructura en cloud provider (AWS, GCP, Azure) con auto-escalado, balanceo de carga y réplica multi-región para alta disponibilidad.',
  'Multi-tenancy e ruoli avanzati': 'Arquitectura multi-cliente: cada usuario o empresa tiene su propio espacio aislado con roles, permisos y personalizaciones separadas.',
  'Supporto e manutenzione 6 mesi': 'Asistencia post-lanzamiento por 6 meses: corrección de errores, actualizaciones de seguridad, copias de seguridad y soporte técnico prioritario.',
  'Integrazioni API di terze parti': 'Conexión con servicios externos como Stripe, HubSpot, Salesforce, Google Analytics, inicio de sesión social y otras APIs de terceros para ampliar la funcionalidad del proyecto.',

  // ─── Diseño ──────────────────────────────────────
  'Brand guidelines base': 'Documento que define las reglas de uso de la marca: logotipo, colores, fuentes, tono de voz y aplicaciones correctas para mantener la coherencia visual.',
  'Carte da visita digitali': 'Tarjetas de visita en formato digital (vCard, PDF, enlace compartible) listas para email, WhatsApp y redes sociales, con código QR integrado.',
  'Formati ottimizzati per ogni piattaforma': 'Cada gráfico se exporta en las dimensiones y especificaciones correctas para Instagram, Facebook, LinkedIn, YouTube, TikTok y web — sin más recortes ni distorsiones.',
  'Materiali marketing coordinati': 'Conjunto completo de materiales promocionales con la misma identidad visual: flyers, folletos, banners, cartelería, presentaciones y plantillas de email.',
  'Grafiche per streamer': 'Branding completo para streaming en vivo: overlays, bordes de webcam, escenas de espera, alertas de seguidores/donaciones, paneles y emotes personalizados.',
  'Brand strategy e posizionamento': 'Definición de la estrategia de marca: misión, visión, valores, público objetivo, tono de voz y posicionamiento frente a los competidores.',
  'Visual identity completa (logo, colori, font, pattern)': 'Sistema visual completo que incluye logotipo primario y secundario, paleta extendida, tipografía, patrones decorativos y aplicaciones en todos los puntos de contacto.',
  'Graphic system per social e print': 'Sistema de plantillas gráficas reutilizables para mantener la coherencia visual en todos los canales sociales (posts, historias, portadas) y materiales impresos (tarjetas, carpetas, carteles).',
  'Linee guida e asset kit completi': 'Kit completo de todos los activos de la marca en formatos vectoriales y raster, acompañado de guías detalladas para diseñadores, proveedores y socios.',
  'Strategia editoriale visuale': 'Calendario editorial basado en objetivos de negocio, con planificación de contenidos visuales, frecuencia de publicación y mezcla de formatos para maximizar el engagement.',
  'Cover art e thumbnail YouTube': 'Miniaturas personalizadas para videos de YouTube optimizadas para CTR: composición, colores contrastantes, texto legible y coherencia de marca en todo el canal.',
  'Workshop creativi e report strategico': 'Sesiones colaborativas de brainstorming y co-diseño para alinear visión y objetivos, seguidas de informes mensuales con KPIs, insights y recomendaciones estratégicas.',

  // ─── Software & App ──────────────────────────────
  'Design system completo': 'Biblioteca de componentes UI reutilizables con reglas de diseño coherentes, documentados y listos para escalar.',
  'PWA o app mobile (React Native)': 'Progressive Web App: aplicación web que se instala en el dispositivo como una app nativa, con acceso offline y notificaciones push.',
  'API pubbliche e documentazione': 'Interfaces REST/GraphQL documentadas con Swagger para permitir a desarrolladores externos integrar tus servicios.',
  'GDPR, audit e compliance': 'Cumplimiento del Reglamento General de Protección de Datos (GDPR) y preparación para auditorías de seguridad y certificaciones.',
  'GDPR e compliance inclusi': 'Cumplimiento GDPR incluido en el proyecto: evaluación de impacto de datos, cookie policy, privacy policy y documentación de cumplimiento lista para certificaciones.',
  'SLA garantito e team dedicato': 'Service Level Agreement: compromiso contractual sobre tiempos de respuesta, disponibilidad del servicio y penalizaciones en caso de interrupción.',
  'DevOps, CI/CD e monitoraggio 24/7': 'Pipeline de Continuous Integration/Deployment para lanzamientos automatizados, pruebas automáticas y monitoreo proactivo 24/7.',
  'Sprint bisettimanali': 'Ciclos de desarrollo ágiles de 2 semanas: planificación, desarrollo, demo y retrospectiva para mejora continua.',
  'SRE e monitoraggio 24/7': 'Site Reliability Engineering: gestión proactiva de la infraestructura con automatización, alertas y respuesta a incidentes.',
  'Codebase proprietaria e IP tuo': 'Todo el código fuente desarrollado es de tu exclusiva propiedad intelectual, sin restricciones ni licencias de terceros.',
  'Roadmap co-gestita trimestrale': 'Planificación estratégica compartida cada 3 meses para alinear desarrollo y objetivos de negocio.',
  'Report strategico mensile': 'Informe mensual con KPIs, analytics, progreso del proyecto y recomendaciones estratégicas basadas en datos.',

  // ─── Contenido & Video ───────────────────────────
  'Content strategy e copywriting': 'Estrategia editorial completa: tono de voz, calendario de contenidos y textos persuasivos optimizados para tu audiencia.',
  'Post-produzione broadcast': 'Edición y color grading con estándares de calidad para televisión, cine y plataformas de streaming profesionales.',
  'Footage library esclusiva': 'Archivo privado de footage de video (stock, B-roll, grabaciones originales) accesible solo para tu marca.',
};

/** Maps each language to its localized tooltip map. Falls back to Italian. */
const TOOLTIP_MAP_BY_LANG: Record<Lang, Record<string, string>> = {
  it: IT,
  en: EN,
  es: ES,
};

/**
 * Returns the tooltip string for the given feature key in the specified language.
 * Falls back to Italian if the key is missing in the requested language.
 */
export function getTooltip(feature: string, lang: Lang): string | undefined {
  const map = TOOLTIP_MAP_BY_LANG[lang] ?? IT;
  return map[feature] ?? IT[feature];
}

/** Legacy export for backward compatibility — Italian only. */
export const TOOLTIP_MAP: Record<string, string> = IT;
