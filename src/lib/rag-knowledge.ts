/**
 * RAG (Retrieval-Augmented Generation) Knowledge Base for Tia Designs AI.
 * 
 * Provides semantic and keyword-based retrieval over Tia's projects, tech stack,
 * detailed pricing, services, and official FAQs to ground AI answers in verified facts.
 */

export interface KnowledgeItem {
  id: string;
  category: 'project' | 'pricing' | 'tech' | 'faq' | 'service';
  title: string;
  keywords: string[];
  content: {
    it: string;
    en: string;
    es: string;
  };
}

export const KNOWLEDGE_BASE: KnowledgeItem[] = [
  // ── Progetti ──
  {
    id: 'proj-gsa-hotels',
    category: 'project',
    title: 'GSA Hotels',
    keywords: ['gsa', 'hotels', 'hotel', 'albergo', 'lusso', 'luxury', 'prenotazioni', 'booking', 'ospitalità'],
    content: {
      it: 'Progetto "GSA Hotels": prototipo di sito luxury per struttura ricettiva di alto livello. Caratteristiche: design raffinato con palette scura ed elegante, animazioni fluide, sistema di prenotazione interattivo, galleria camere e servizi. Stack tecnologico: Next.js, Tailwind CSS, animazioni personalizzate. URL demo: https://gsa-hotels-demo.vercel.app/',
      en: 'Project "GSA Hotels": luxury hotel website prototype for a high-end accommodation. Features: refined design with dark and elegant palette, smooth animations, interactive booking system, rooms and amenities gallery. Tech stack: Next.js, Tailwind CSS, custom animations. Demo URL: https://gsa-hotels-demo.vercel.app/',
      es: 'Proyecto "GSA Hotels": prototipo de sitio web de lujo para alojamiento de alta gama. Características: diseño refinado con paleta oscura y elegante, animaciones fluidas, sistema de reservas interactivo, galería de habitaciones. Stack tecnológico: Next.js, Tailwind CSS, animaciones personalizadas. URL demo: https://gsa-hotels-demo.vercel.app/',
    },
  },
  {
    id: 'proj-vergilius-nectar',
    category: 'project',
    title: 'Vergilius Nectar',
    keywords: ['vergilius', 'nectar', 'bevande', 'brand', 'landing page', 'storytelling', 'visual identity', 'bottiglia'],
    content: {
      it: 'Progetto "Vergilius Nectar": landing page d\'impatto per un brand emergente di bevande naturali. Caratteristiche: visual identity curata, storytelling visivo della storia del brand, micro-interazioni grafiche ed elevate performance di caricamento. Stack: React, Branding, UI/UX Design. URL demo: https://vergiliusnectar-github-io.vercel.app/',
      en: 'Project "Vergilius Nectar": impactful landing page for an emerging natural beverage brand. Features: curated visual identity, visual storytelling of the brand history, micro-interactions and high loading performance. Stack: React, Branding, UI/UX Design. Demo URL: https://vergiliusnectar-github-io.vercel.app/',
      es: 'Proyecto "Vergilius Nectar": landing page impactante para marca emergente de bebidas naturales. Características: identidad visual cuidada, storytelling visual de la historia de marca, microinteracciones y alto rendimiento. Stack: React, Branding, UI/UX Design. URL demo: https://vergiliusnectar-github-io.vercel.app/',
    },
  },
  {
    id: 'proj-studio-moretti',
    category: 'project',
    title: 'Studio Ing. Moretti',
    keywords: ['moretti', 'ingegneria', 'studio', 'ingegnere', 'civile', 'strutturale', 'sito professionale', 'seo'],
    content: {
      it: 'Progetto "Studio Ing. Moretti": sito web professionale per studio di ingegneria civile e strutturale. Caratteristiche: design pulito e autorevole, presentazione progetti e consulenze tecniche, ottimizzazione SEO locale e performance al massimo dei punteggi Core Web Vitals. Sito online e operativo: https://www.studioingmoretti.it/',
      en: 'Project "Studio Ing. Moretti": professional website for a civil and structural engineering firm. Features: clean and authoritative design, project showcase and technical consulting, local SEO optimization and top Core Web Vitals performance. Live website: https://www.studioingmoretti.it/',
      es: 'Proyecto "Studio Ing. Moretti": sitio web profesional para estudio de ingeniería civil y estructural. Características: diseño limpio y autoritario, presentación de proyectos y consultoría técnica, SEO local optimizado y Core Web Vitals de primer nivel. Sitio online: https://www.studioingmoretti.it/',
    },
  },
  {
    id: 'proj-pcs-mantova',
    category: 'project',
    title: 'PCS Mantova',
    keywords: ['pcs', 'mantova', 'informatica', 'aziendale', 'istituzionale', 'hardware', 'assistenza'],
    content: {
      it: 'Progetto "PCS Mantova": sito istituzionale e catalogo servizi per azienda informatica di Mantova. Caratteristiche: navigazione intuitiva, presentazione servizi di assistenza, hardware e reti aziendali, immagine coordinata moderna. Stack: Next.js, Design, Sviluppo. URL demo: https://pcsmantova-github-io.vercel.app/',
      en: 'Project "PCS Mantova": corporate website and services catalogue for an IT company in Mantova. Features: intuitive navigation, presentation of IT support, hardware and corporate networking services, modern brand identity. Stack: Next.js, Design, Development. Demo URL: https://pcsmantova-github-io.vercel.app/',
      es: 'Proyecto "PCS Mantova": sitio institucional y catálogo de servicios para empresa informática de Mantova. Características: navegación intuitiva, presentación de servicios de soporte IT, hardware y redes, imagen coordinada moderna. Stack: Next.js, Design, Desarrollo. URL demo: https://pcsmantova-github-io.vercel.app/',
    },
  },
  {
    id: 'proj-canapa-store',
    category: 'project',
    title: 'Canapa Store',
    keywords: ['canapa', 'store', 'ecommerce', 'shop', 'negozio', 'vendita', 'carrello', 'prodotti'],
    content: {
      it: 'Progetto "Canapa Store": piattaforma e-commerce per negozio specializzato. Caratteristiche: catalogo prodotti con filtri dinamici, scheda prodotto dettagliata, carrello interattivo, integrazione pagamenti sicuri, conformità normativa e design moderno. Stack: Next.js, E-commerce, UI/UX.',
      en: 'Project "Canapa Store": e-commerce platform for a specialized retail store. Features: product catalogue with dynamic filters, detailed product pages, interactive shopping cart, secure payment integration, legal compliance and modern UI. Stack: Next.js, E-commerce, UI/UX.',
      es: 'Proyecto "Canapa Store": plataforma de comercio electrónico para tienda especializada. Características: catálogo de productos con filtros dinámicos, ficha detallada, carrito interactivo, pagos seguros y diseño moderno. Stack: Next.js, E-commerce, UI/UX.',
    },
  },

  // ── Prezzi & Clausole Contrattuali ──
  {
    id: 'pricing-web',
    category: 'pricing',
    title: 'Prezzi Sviluppo Web',
    keywords: ['costo', 'prezzo', 'tariffe', 'sito', 'web', 'vetrina', 'ecommerce', 'costa', 'preventivo'],
    content: {
      it: 'Prezzi Sviluppo Web (Una Tantum):\n• Sito Professionale: da €600 (sito vetrina 1-3 pagine, responsive, brand identity di base inclusa, SEO).\n• Piattaforma Web: da €1.750 (4-6 pagine, catalogo/e-commerce o area riservata, animazioni, performance top).\n• Enterprise Web: da €3.250 (portale completo, architettura custom, integrazioni API/database, multilingua).\nModalità di pagamento: 30% all\'avvio, 30% a metà lavori (dopo approvazione grafica/funzionale), 40% al saldo prima del lancio online. Rateizzabile da €1.000.',
      en: 'Web Development Pricing (One-time):\n• Professional Website: from €600 (1-3 page showcase site, responsive, base brand identity included, SEO).\n• Web Platform: from €1,750 (4-6 pages, catalogue/e-commerce or private area, animations, top performance).\n• Enterprise Web: from €3,250 (full portal, custom architecture, API/database integrations, multilingual).\nPayment terms: 30% upfront, 30% mid-project (after graphic/functional approval), 40% upon completion before launch. Installment plan available above €1,000.',
      es: 'Precios Desarrollo Web (Pago único):\n• Sitio Profesional: desde 600 € (sitio escaparate 1-3 páginas, responsive, identidad básica incluida, SEO).\n• Plataforma Web: desde 1.750 € (4-6 páginas, catálogo/e-commerce o área privada, animaciones, máximo rendimiento).\n• Enterprise Web: desde 3.250 € (portal completo, arquitectura a medida, integraciones API/BD, multilingüe).\nCondiciones de pago: 30% inicio, 30% a mitad del proyecto, 40% al finalizar antes del lanzamiento. Pagos a plazos a partir de 1.000 €.',
    },
  },
  {
    id: 'pricing-design',
    category: 'pricing',
    title: 'Prezzi UI/UX & Brand Design',
    keywords: ['design', 'logo', 'brand', 'identità', 'grafica', 'figma', 'ui', 'ux'],
    content: {
      it: 'Prezzi Design (Una Tantum):\n• Brand Identity: da €500 (logo vettoriale, palette colori, tipografia, linee guida base).\n• Social & Graphic Pack: da €900 (kit completo grafiche social, banner, template modificabili, stationery).\n• Brand Completo & UI Kit: da €2.800 (brand identity a 360°, design system Figma con componenti riutilizzabili, prototipi interattivi, manuale d\'uso completo).',
      en: 'Design Pricing (One-time):\n• Brand Identity: from €500 (vector logo, color palette, typography, basic brand guidelines).\n• Social & Graphic Pack: from €900 (full social graphics kit, banners, editable templates, stationery).\n• Complete Brand & UI Kit: from €2,800 (360° brand identity, full Figma design system with reusable components, interactive prototypes, full brand manual).',
      es: 'Precios Diseño (Pago único):\n• Identidad de Marca: desde 500 € (logo vectorial, paleta de colores, tipografía, guía básica).\n• Social & Graphic Pack: desde 900 € (kit de gráficos para redes, banners, plantillas editables, papelería).\n• Marca Completa & UI Kit: desde 2.800 € (identidad completa, design system en Figma con componentes reutilizables, prototipos interactivos, manual de marca).',
    },
  },
  {
    id: 'pricing-video',
    category: 'pricing',
    title: 'Prezzi Video Making',
    keywords: ['video', 'spot', 'drone', 'montaggio', 'editing', 'riprese', 'commercial'],
    content: {
      it: 'Prezzi Video Making (Una Tantum):\n• Video Essenziale: da €600 (video 30-60 secondi per social/web, montaggio dinamico, musica con licenza, color grading).\n• Produzione Completa: da €2.200 (riprese in loco 4K, b-roll, interviste, sound design, tagli verticali 9:16 per Reels/TikTok inclusi).\n• Spot Pubblicitario: da €4.500 (produzione cinematografica, storyboard, riprese con drone 4K autorizzato, voiceover professionale, post-produzione avanzata VFX).',
      en: 'Video Production Pricing (One-time):\n• Essential Video: from €600 (30-60 second video for social/web, dynamic editing, licensed music, color grading).\n• Complete Production: from €2,200 (on-site 4K filming, b-roll, interviews, sound design, vertical 9:16 cuts for Reels/TikTok included).\n• Commercial Spot: from €4,500 (cinematic production, storyboard, certified 4K drone footage, professional voiceover, advanced VFX post-production).',
      es: 'Precios Producción de Video (Pago único):\n• Video Esencial: desde 600 € (video de 30-60 segundos para redes/web, edición dinámica, música con licencia, color grading).\n• Producción Completa: desde 2.200 € (grabación 4K in situ, b-roll, entrevistas, diseño sonoro, cortes verticales 9:16 para Reels/TikTok incluidos).\n• Spot Publicitario: desde 4.500 € (producción cinematográfica, guion gráfico, tomas con dron 4K, locución profesional, postproducción avanzada VFX).',
    },
  },
  {
    id: 'pricing-monthly',
    category: 'pricing',
    title: 'Collaborazioni Mensili & Retainer',
    keywords: ['mensile', 'collaborazione', 'retainer', 'abbonamento', 'continuativo', 'gestione'],
    content: {
      it: 'Collaborazioni Mensili (Retainer):\nTariffe da €175/mese fino a €5.500/mese a seconda dell\'impegno orario e delle necessità:\n• Manutenzione & Hosting: backup, aggiornamenti di sicurezza, monitoraggio continuo e piccole modifiche.\n• Supporto Continuo & Sviluppo: ore mensili dedicate per nuove funzionalità, landing page e ottimizzazioni.\n• Gestione Completa Design & Video: pacchetti ricorrenti di contenuti grafici e video per social e marketing.',
      en: 'Monthly Retainer Collaborations:\nRates from €175/month up to €5,500/month depending on hours and requirements:\n• Maintenance & Hosting: backups, security updates, continuous monitoring and minor tweaks.\n• Ongoing Support & Dev: dedicated monthly hours for new features, landing pages and optimizations.\n• Complete Design & Video Management: recurring graphic and video content packages for social and marketing.',
      es: 'Colaboraciones Mensuales (Retainer):\nTarifas desde 175 €/mes hasta 5.500 €/mes según horas y necesidades:\n• Mantenimiento & Hosting: copias de seguridad, actualizaciones de seguridad, monitorización continua y cambios menores.\n• Soporte Continuo & Desarrollo: horas mensuales dedicadas para nuevas funciones, landing pages y optimizaciones.\n• Gestión Completa Diseño & Video: paquetes recurrentes de contenido gráfico y video para redes y marketing.',
    },
  },

  // ── Stack Tecnologico & Competenze ──
  {
    id: 'tech-stack',
    category: 'tech',
    title: 'Stack Tecnologico & Strumenti',
    keywords: ['tecnologie', 'stack', 'framework', 'nextjs', 'react', 'typescript', 'tailwind', 'database', 'programmazione', 'software'],
    content: {
      it: 'Stack Tecnologico adottato da Tia Designs:\n• Frontend & Web: Next.js 16 (App Router, Turbopack, Server Components), React 19, TypeScript, Tailwind CSS, WebGL shaders, Three.js per esperienze 3D, Lenis per smooth scrolling.\n• Backend & Database: Node.js, Prisma ORM, Turso (SQLite distribuito su edge/LibSQL), Cloudflare Turnstile anti-bot, Upstash Redis per rate limiting distribuito.\n• Video & Motion: Adobe Premiere Pro, DaVinci Resolve (color grading avanzato), Adobe After Effects (motion graphics e VFX).\n• Design: Figma (Design System, prototipazione interattiva), Adobe Illustrator (grafica vettoriale), Photoshop.\n• Automazioni & AI: integrazione API LLM (Groq, Gemini), agenti autonomi, webhook Telegram per notifiche istantanee in chat.',
      en: 'Tech Stack used by Tia Designs:\n• Frontend & Web: Next.js 16 (App Router, Turbopack, Server Components), React 19, TypeScript, Tailwind CSS, WebGL shaders, Three.js for 3D experiences, Lenis for smooth scrolling.\n• Backend & Database: Node.js, Prisma ORM, Turso (edge-distributed SQLite/LibSQL), Cloudflare Turnstile anti-bot, Upstash Redis for distributed rate limiting.\n• Video & Motion: Adobe Premiere Pro, DaVinci Resolve (advanced color grading), Adobe After Effects (motion graphics and VFX).\n• Design: Figma (Design Systems, interactive prototyping), Adobe Illustrator (vector graphics), Photoshop.\n• Automations & AI: LLM API integration (Groq, Gemini), autonomous agents, Telegram webhooks for instant live chat notifications.',
      es: 'Stack Tecnológico utilizado por Tia Designs:\n• Frontend & Web: Next.js 16 (App Router, Turbopack, Server Components), React 19, TypeScript, Tailwind CSS, shaders WebGL, Three.js para 3D, Lenis para scroll suave.\n• Backend & Base de Datos: Node.js, Prisma ORM, Turso (SQLite distribuido en edge/LibSQL), Cloudflare Turnstile anti-bot, Upstash Redis para rate limiting distribuido.\n• Video & Motion: Adobe Premiere Pro, DaVinci Resolve (color grading avanzado), Adobe After Effects (motion graphics y VFX).\n• Diseño: Figma (Design Systems, prototipado interactivo), Adobe Illustrator (gráficos vectoriales), Photoshop.\n• Automatizaciones e IA: integración de APIs LLM (Groq, Gemini), agentes autónomos, webhooks de Telegram para notificaciones instantáneas de chat.',
    },
  },

  // ── FAQ ──
  {
    id: 'faq-quote-free',
    category: 'faq',
    title: 'Preventivo Gratuito e Senza Impegno',
    keywords: ['gratuito', 'impegno', 'obbligo', 'consulenza', 'costo preventivo'],
    content: {
      it: 'FAQ: Il preventivo è gratuito? Sì, il preventivo e l\'analisi preliminare del progetto sono al 100% gratuiti e senza alcun impegno. Riceverai un documento chiaro con costi, tempistiche e deliverable definiti.',
      en: 'FAQ: Is the quote free? Yes, the quote and preliminary project analysis are 100% free and non-binding. You will receive a clear breakdown with costs, timelines, and deliverables.',
      es: 'FAQ: ¿El presupuesto es gratuito? Sí, el presupuesto y el análisis preliminar del proyecto son 100% gratuitos y sin compromiso. Recibirás un desglose claro con costes, plazos y entregables.',
    },
  },
  {
    id: 'faq-timelines',
    category: 'faq',
    title: 'Tempistiche di Consegna',
    keywords: ['tempi', 'tempistiche', 'quanto ci vuole', 'consegna', 'settimane', 'giorni'],
    content: {
      it: 'FAQ: Quali sono i tempi di consegna? Un sito vetrina professionale richiede in media 2-3 settimane. Una piattaforma o e-commerce 4-6 settimane. Un video o spot promozionale 3-7 giorni lavorativi dalle riprese.',
      en: 'FAQ: What are the delivery timelines? A professional showcase website typically takes 2-3 weeks. A platform or e-commerce takes 4-6 weeks. A video or commercial takes 3-7 business days after shooting.',
      es: 'FAQ: ¿Cuáles son los plazos de entrega? Un sitio web escaparate profesional suele tardar 2-3 semanas. Una plataforma o e-commerce 4-6 semanas. Un video o spot tarda 3-7 días laborables tras la grabación.',
    },
  },
  {
    id: 'faq-ai-automation',
    category: 'faq',
    title: 'Automazioni AI e Chatbot',
    keywords: ['automazioni', 'agenti', 'ai', 'chatbot', 'n8n', 'intelligenza artificiale'],
    content: {
      it: 'FAQ: Cosa sono le automazioni con AI? Sono sistemi software su misura che collegano i tuoi strumenti (email, CRM, sito web, WhatsApp/Telegram) con modelli di intelligenza artificiale per rispondere 24/7 ai clienti, estrarre dati da documenti e automatizzare i processi manuali.',
      en: 'FAQ: What are AI automations? They are custom software workflows connecting your tools (email, CRM, website, WhatsApp/Telegram) with AI models to answer customers 24/7, extract data from documents, and automate repetitive tasks.',
      es: 'FAQ: ¿Qué son las automatizaciones con IA? Son flujos de software a medida que conectan tus herramientas (email, CRM, web, WhatsApp/Telegram) con modelos de IA para atender clientes 24/7, extraer datos de documentos y automatizar tareas repetitivas.',
    },
  },
];

/**
 * Retrieve the most relevant knowledge base chunks for a user query.
 * Uses keyword frequency + category weighting to extract top relevant facts.
 */
export function retrieveRelevantKnowledge(
  query: string,
  category?: string,
  lang: 'it' | 'en' | 'es' = 'it',
  topK = 3,
): string {
  if (!query || typeof query !== 'string') return '';
  const normalizedQuery = query.toLowerCase().replace(/[^\w\s]/g, ' ');
  const tokens = normalizedQuery.split(/\s+/).filter((t) => t.length > 2);

  if (tokens.length === 0) return '';

  // Score each knowledge item
  const scored = KNOWLEDGE_BASE.map((item) => {
    let score = 0;

    // Keyword match
    for (const kw of item.keywords) {
      if (normalizedQuery.includes(kw.toLowerCase())) {
        score += 3;
      }
      for (const token of tokens) {
        if (kw.toLowerCase().includes(token)) {
          score += 1.5;
        }
      }
    }

    // Category match bonus
    if (category && item.category === category) {
      score += 2;
    }

    return { item, score };
  });

  // Filter items with positive score and sort descending
  const topMatches = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (topMatches.length === 0) return '';

  const chunks = topMatches.map((m) => `• [${m.item.title}]: ${m.item.content[lang]}`);
  return `\n\nKNOWLEDGE BASE RAG (ARCHIVIO UFFICIALE TIA DESIGNS - DATI VERIFICATI):\n${chunks.join('\n\n')}\n(Usa queste informazioni reali per rispondere con precisione millimetrica su progetti, prezzi, tecnologie e FAQ)`;
}
