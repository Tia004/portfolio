/**
 * Dictionary & Humanizer for tracked click elements in Analytics
 */

export interface ClickElementInfo {
  title: string;
  category: string;
  icon: string;
  description: string;
  color?: string;
}

export const CLICK_ELEMENTS_MAP: Record<string, ClickElementInfo> = {
  // Hero section CTAs
  hero_cta_work: {
    title: 'Pulsante "Vedi Progetti"',
    category: 'Hero / Inizio',
    icon: '💼',
    description: 'Scroll rapido alla galleria dei progetti realizzati',
    color: '#2dd4bf', // Teal
  },
  hero_cta_prices: {
    title: 'Pulsante "Piani & Tariffe"',
    category: 'Hero / Inizio',
    icon: '💰',
    description: 'Scroll rapido al listino prezzi e pacchetti sviluppo/video',
    color: '#38bdf8', // Sky
  },
  hero_cta_quote: {
    title: 'Pulsante "Richiedi Preventivo"',
    category: 'Hero / Inizio',
    icon: '✉️',
    description: 'Scroll rapido al modulo contatti per richiesta preventivo',
    color: '#a78bfa', // Purple
  },
  hero_cta_booking: {
    title: 'Pulsante "Prenota Consulenza"',
    category: 'Booking',
    icon: '📅',
    description: 'Apertura popup di prenotazione chiamata su Cal.com',
    color: '#34d399', // Emerald
  },

  // Cal.com / Booking
  cal_booking_open: {
    title: 'Apertura Modal Prenotazione',
    category: 'Booking',
    icon: '📅',
    description: 'Apertura del calendario prenotazioni Cal.com',
    color: '#34d399',
  },
  cal_booking_confirmed: {
    title: 'Consulenza Confermata',
    category: 'Booking',
    icon: '✅',
    description: 'Prenotazione consulenza completata con successo',
    color: '#22c55e',
  },

  // Contact Form & Leads
  contact_submit: {
    title: 'Invio Modulo Contatti',
    category: 'Lead / Form',
    icon: '🚀',
    description: 'Invio completato del form preventivo/messaggio dal sito',
    color: '#fbbf24', // Amber
  },
  contact_form_submit: {
    title: 'Invio Modulo Contatti',
    category: 'Lead / Form',
    icon: '🚀',
    description: 'Invio completato del form preventivo/messaggio dal sito',
    color: '#fbbf24',
  },

  // Chatbot & Telegram
  chatbot_open: {
    title: 'Apertura Chatbot AI',
    category: 'Chatbot',
    icon: '🤖',
    description: 'Click sul pulsante floating per avviare la chat con l\'AI',
    color: '#818cf8', // Indigo
  },
  chatbot_message_sent: {
    title: 'Messaggio Inviato all\'AI',
    category: 'Chatbot',
    icon: '💬',
    description: 'Interazione e domanda posta all\'assistente virtuale',
    color: '#818cf8',
  },
  telegram_chat_open: {
    title: 'Apertura Chat Telegram Live',
    category: 'Supporto',
    icon: '✈️',
    description: 'Apertura della chat diretta Telegram con Tia',
    color: '#0284c7',
  },

  // Navigation Menu
  nav_progetti: {
    title: 'Voce Menu "Progetti"',
    category: 'Navigazione',
    icon: '🧭',
    description: 'Navigazione rapida alla sezione Portfolio',
    color: '#94a3b8',
  },
  nav_prezzi: {
    title: 'Voce Menu "Tariffe"',
    category: 'Navigazione',
    icon: '🧭',
    description: 'Navigazione rapida alla sezione Listino Prezzi',
    color: '#94a3b8',
  },
  nav_servizi: {
    title: 'Voce Menu "Servizi"',
    category: 'Navigazione',
    icon: '🧭',
    description: 'Navigazione rapida ai servizi offerti',
    color: '#94a3b8',
  },
  nav_chi_sono: {
    title: 'Voce Menu "Chi Sono"',
    category: 'Navigazione',
    icon: '🧭',
    description: 'Navigazione alla sezione biografia / competenze',
    color: '#94a3b8',
  },
  nav_contatti: {
    title: 'Voce Menu "Contatti"',
    category: 'Navigazione',
    icon: '🧭',
    description: 'Navigazione al form contatti e recapiti',
    color: '#94a3b8',
  },

  // Pricing & Packages
  pricing_switch_onetime: {
    title: 'Tab "Una Tantum"',
    category: 'Prezzi',
    icon: '📦',
    description: 'Visualizzazione prezzi a progetto singolo',
    color: '#38bdf8',
  },
  pricing_switch_monthly: {
    title: 'Tab "Abbonamento Mensile"',
    category: 'Prezzi',
    icon: '🔄',
    description: 'Visualizzazione piani di manutenzione ricorrente',
    color: '#38bdf8',
  },
  pricing_select_tier: {
    title: 'Selezione Pacchetto Tariffario',
    category: 'Prezzi',
    icon: '🏷️',
    description: 'Click per selezionare un piano o pacchetto specifico',
    color: '#38bdf8',
  },

  // Portfolio
  project_card_open: {
    title: 'Apertura Scheda Progetto',
    category: 'Portfolio',
    icon: '📁',
    description: 'Apertura della finestra con dettagli e galleria del progetto',
    color: '#2dd4bf',
  },
  project_external_link: {
    title: 'Visita Sito Cliente Esterno',
    category: 'Portfolio',
    icon: '🔗',
    description: 'Click sul link per visitare il sito live del cliente',
    color: '#2dd4bf',
  },

  // Cookie & Privacy
  cookie_accept_all: {
    title: 'Consenso Cookie: "Accetta Tutti"',
    category: 'Privacy',
    icon: '🍪',
    description: 'L\'utente ha accettato tutti i cookie inclusi analytics',
    color: '#22c55e',
  },
  cookie_accept_tech: {
    title: 'Consenso Cookie: "Solo Tecnici"',
    category: 'Privacy',
    icon: '🍪',
    description: 'L\'utente ha limitato il consenso ai soli cookie tecnici',
    color: '#f59e0b',
  },
  cookie_reject: {
    title: 'Consenso Cookie: "Rifiuta Tutti"',
    category: 'Privacy',
    icon: '🍪',
    description: 'L\'utente ha rifiutato i cookie facoltativi',
    color: '#ef4444',
  },

  // Languages
  lang_switch_it: {
    title: 'Cambio Lingua -> Italiano',
    category: 'Internazionalizzazione',
    icon: '🇮🇹',
    description: 'Selezione lingua italiana dal selettore',
    color: '#f43f5e',
  },
  lang_switch_en: {
    title: 'Cambio Lingua -> English',
    category: 'Internazionalizzazione',
    icon: '🇬🇧',
    description: 'Selezione lingua inglese dal selettore',
    color: '#f43f5e',
  },
  lang_switch_es: {
    title: 'Cambio Lingua -> Español',
    category: 'Internazionalizzazione',
    icon: '🇪🇸',
    description: 'Selezione lingua spagnola dal selettore',
    color: '#f43f5e',
  },

  // Footer & Social
  footer_github: {
    title: 'Link GitHub',
    category: 'Social',
    icon: '💻',
    description: 'Click per visitare il profilo GitHub',
    color: '#e2e8f0',
  },
  footer_linkedin: {
    title: 'Link LinkedIn',
    category: 'Social',
    icon: '💼',
    description: 'Click per visitare il profilo LinkedIn',
    color: '#0284c7',
  },
  footer_instagram: {
    title: 'Link Instagram',
    category: 'Social',
    icon: '📸',
    description: 'Click per visitare il profilo Instagram',
    color: '#ec4899',
  },
};

/**
 * Converts any raw tracking element key into a clear, understandable representation
 */
export function formatClickElement(rawKey: string): ClickElementInfo {
  if (!rawKey) {
    return {
      title: 'Elemento generico',
      category: 'Generale',
      icon: '🖱️',
      description: 'Click su elemento non specificato',
      color: '#94a3b8',
    };
  }

  const cleanKey = rawKey.trim().toLowerCase();

  if (CLICK_ELEMENTS_MAP[cleanKey]) {
    return CLICK_ELEMENTS_MAP[cleanKey];
  }

  // Smart heuristic parser for dynamic/custom keys
  let category = 'Generale';
  let icon = '🖱️';
  let color = '#94a3b8';

  if (cleanKey.includes('hero') || cleanKey.includes('cta')) {
    category = 'Hero / CTA';
    icon = '🎯';
    color = '#2dd4bf';
  } else if (cleanKey.includes('project') || cleanKey.includes('progett')) {
    category = 'Portfolio';
    icon = '📁';
    color = '#38bdf8';
  } else if (cleanKey.includes('price') || cleanKey.includes('prezz')) {
    category = 'Prezzi';
    icon = '💰';
    color = '#a78bfa';
  } else if (cleanKey.includes('contact') || cleanKey.includes('contatt') || cleanKey.includes('quote')) {
    category = 'Contatti';
    icon = '✉️';
    color = '#fbbf24';
  } else if (cleanKey.includes('cookie')) {
    category = 'Privacy';
    icon = '🍪';
    color = '#f59e0b';
  } else if (cleanKey.includes('nav') || cleanKey.includes('menu')) {
    category = 'Menu';
    icon = '🧭';
    color = '#cbd5e1';
  } else if (cleanKey.includes('chat')) {
    category = 'Chatbot';
    icon = '🤖';
    color = '#818cf8';
  }

  // Convert snake_case or kebab-case to Title Case words
  const words = cleanKey
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    title: words,
    category,
    icon,
    description: `Identificatore tecnico: ${rawKey}`,
    color,
  };
}
