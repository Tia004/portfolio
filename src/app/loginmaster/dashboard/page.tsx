'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { startRegistration } from '@simplewebauthn/browser';
import BorderGlow from '@/app/components/BorderGlow';
import TiaIcon from '@/app/components/TiaIcon';
import { formatClickElement } from '@/lib/click-elements-dictionary';
import {
  CodeFolderIcon,
  Mail01Icon,
  BubbleChatIcon,
  CpuIcon,
  Settings01Icon,
  GaugeIcon,
  DollarSignIcon,
  LoaderPinwheelIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  ArrowRight01Icon,
  Cancel01Icon,
  ExternalLinkIcon,
  FilePenIcon,
  Location01Icon,
  Clock01Icon,
  WorkflowSquare01Icon,
  Globe02Icon,
  Robot01Icon,
  SentIcon,
  Delete02Icon,
  PencilEdit02Icon,
  Search01Icon,
  PlusSignIcon,
  Menu01Icon,
  StarIcon,
  SparklesIcon,
  Analytics01Icon,
  RefreshIcon,
  Download01Icon,
  Upload01Icon,
  File01Icon,
  Shield01Icon,
  DashboardSquare01Icon,
  Activity01Icon,
  CloudIcon,
  LayersIcon,
  ViewIcon,
} from '@/app/components/icons';

const MoltenMetal = dynamic(() => import('@/app/components/MoltenMetal'), { ssr: false });

const DeepAnalyticsView = dynamic(() => import('@/app/components/dashboard/DeepAnalyticsView'), {
  ssr: false,
  loading: () => (
    <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-12 flex flex-col items-center justify-center text-center">
      <div className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin mb-4" />
      <p className="text-sm font-bold text-white">Caricamento Deep Analytics...</p>
      <p className="text-xs text-neutral-400 mt-1">Connessione ai log e metriche in tempo reale</p>
    </div>
  ),
});

type ActiveTab = 'projects' | 'media' | 'inbox' | 'chats' | 'quotes' | 'analytics' | 'cms' | 'health' | 'passkeys';

// ── Models & Interfaces ──────────────────────────────────────────

interface Project {
  id: string;
  title: string;
  description: string;
  longDescription: string | null;
  thumbnail: string;
  projectUrl: string | null;
  githubUrl: string | null;
  tags: string;
  category?: string;
  featured: boolean;
  order: number;
  gallery?: string | null;
  pdfUrl?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface MediaAsset {
  filename: string;
  url: string;
  folder: string;
  size: number;
  ext: string;
  type: 'image' | 'pdf' | 'video' | 'other';
  updatedAt: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  service: string;
  message: string;
  status: 'new' | 'in_progress' | 'contacted' | 'closed';
  notes: string | null;
  createdAt: string;
}

interface ChatSessionSummary {
  sessionId: string;
  lastMessage: string;
  sender: string;
  timestamp: number;
  count: number;
}

interface ChatSessionLead {
  id: string;
  sessionId: string;
  category: string;
  service: string | null;
  budget: string | null;
  userGoal: string | null;
  clientName: string | null;
  clientEmail: string | null;
  recapJson: string | null;
  createdAt: string;
}

interface AuthenticatorItem {
  id: string;
  credentialID: string;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  nickname: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface FaqItem {
  id: string;
  questionIt: string;
  questionEn: string | null;
  questionEs: string | null;
  answerIt: string;
  answerEn: string | null;
  answerEs: string | null;
  category: string;
  order: number;
  isPublished: boolean;
}

interface ClientReview {
  id: string;
  author: string;
  role: string;
  company: string | null;
  quoteIt: string;
  quoteEn: string | null;
  quoteEs: string | null;
  rating: number;
  avatarUrl: string | null;
  order: number;
  isApproved: boolean;
}

interface QuoteItem {
  id: string;
  title: string;
  description: string;
  quantity: number;
  price: number;
}

interface SavedQuote {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientCompany?: string;
  clientEmail: string;
  clientPhone?: string;
  clientVat?: string;
  clientAddress?: string;
  date: string;
  validity: string;
  timeline: string;
  items: QuoteItem[];
  discount: number;
  taxRegime: 'forfettario' | 'iva22';
  paymentTerms: string;
  iban: string;
  notes?: string;
  signatureData?: string;
  total: number;
  status: 'draft' | 'sent' | 'accepted';
  createdAt: string;
}

const EMAIL_TEMPLATES = [
  {
    id: 'quote',
    name: 'Offerta & Preventivo',
    icon: '💼',
    badge: 'Preventivo & Proposta',
    title: 'Proposta per il tuo Progetto',
    subject: (client: string) => `Proposta & Preventivo per il tuo Progetto - Tia Designs`,
    body: (client: string) => `Ciao **${client || 'Gentile Cliente'}**,\n\ngrazie per l'interesse dimostrato per i miei servizi!\n\nIn allegato e di seguito trovi la proposta personalizzata per la realizzazione del tuo progetto:\n\n- **Obiettivo**: Sviluppo & Design su misura con focus su performance e UX moderna\n- **Tempistiche stimate**: 2-3 settimane lavorative\n- **Cosa include**: Design responsivo, ottimizzazione SEO & Core Web Vitals, integrazioni avanzate e supporto dedicato\n\nPer approvare la proposta o per qualsiasi chiarimento sui dettagli tecnici, puoi rispondere direttamente a questa email oppure prenotare una call veloce.\n\nResto a tua completa disposizione!\n\nA presto,\nTia`,
    ctaText: 'Fissa Call di Approfondimento',
    ctaUrl: 'https://tiadesigns.it#contatti',
  },
  {
    id: 'followup',
    name: 'Follow-up / Ricontatto',
    icon: '🔄',
    badge: 'Follow-up',
    title: 'Hai avuto modo di valutare la proposta?',
    subject: (client: string) => `Aggiornamento sul tuo progetto - Tia Designs`,
    body: (client: string) => `Ciao **${client || 'Gentile Cliente'}**,\n\nti ricontatto per sapere se hai avuto modo di esaminare la proposta che ti ho inviato.\n\nSe hai domande, dubbi o desideri apportare modifiche alle funzionalità o al budget, possiamo sentirci per una breve call e calibrare tutto secondo le tue esigenze.\n\nFammi sapere qual è il momento migliore per te!\n\nBuona giornata,\nTia`,
    ctaText: 'Prenota Breve Call',
    ctaUrl: 'https://tiadesigns.it#contatti',
  },
  {
    id: 'kickoff',
    name: 'Conferma & Kick-off',
    icon: '🚀',
    badge: 'Kick-off & Avvio',
    title: 'Benvenuto a bordo! Iniziamo il progetto',
    subject: (client: string) => `Conferma d'Ordine & Avvio Lavori - Tia Designs`,
    body: (client: string) => `Ciao **${client || 'Gentile Cliente'}**,\n\nsono entusiasta di confermarti che abbiamo ufficialmente avviato i lavori per il tuo progetto!\n\nEcco i prossimi passaggi operativi:\n1. **Setup & Architettura**: Configurazione dell'ambiente di lavoro e delle bozze di design\n2. **Revisioni Intermedie**: Ti condividerò un link di anteprima per raccogliere i tuoi feedback in tempo reale\n3. **Test & Collaudo Finale**: Ottimizzazione finale e messa online\n\nTi terrò costantemente aggiornato sui progressi.\n\nA presto con i primi aggiornamenti,\nTia`,
    ctaText: 'Vedi Avanzamento Lavori',
    ctaUrl: 'https://tiadesigns.it',
  },
  {
    id: 'briefing',
    name: 'Briefing Tecnico',
    icon: '📋',
    badge: 'Briefing & Info',
    title: 'Dettagli necessari per procedere',
    subject: (client: string) => `Dettagli e requisiti per il tuo progetto - Tia Designs`,
    body: (client: string) => `Ciao **${client || 'Gentile Cliente'}**,\n\nper poter avviare al meglio lo sviluppo del progetto, avrei bisogno di alcuni dettagli e materiali:\n\n- **Logo e Asset Grafici**: File vettoriali (SVG, AI) o immagini ad alta risoluzione\n- **Testi e Contenuti**: Bozza dei testi per le sezioni principali\n- **Siti / Brand di Riferimento**: 2-3 esempi di siti o stili grafici che rispecchiano la tua visione\n- **Scadenza Desiderata**: Eventuali date di lancio tassative\n\nPuoi inviarmi tutto rispondendo a questa mail o caricando i file nel form dedicato.\n\nGrazie mille per la collaborazione!\nTia`,
    ctaText: 'Compila Brief Online',
    ctaUrl: 'https://tiadesigns.it#contatti',
  },
  {
    id: 'delivery',
    name: 'Consegna & Recensione',
    icon: '🌟',
    badge: 'Consegna & Feedback',
    title: 'Il tuo progetto è online con successo!',
    subject: (client: string) => `Il tuo progetto è online! 🚀 - Tia Designs`,
    body: (client: string) => `Ciao **${client || 'Gentile Cliente'}**,\n\nè con grande piacere che ti confermo che il tuo progetto è ufficialmente completato e online!\n\nÈ stato un vero piacere collaborare con te su questo progetto.\n\nSe sei soddisfatto del risultato e del lavoro svolto insieme, ti sarei immensamente grato se potessi dedicare 1 minuto per lasciare una breve recensione sul sito: per me è fondamentale!\n\nGrazie ancora per la fiducia e resto a disposizione per qualsiasi esigenza futura.\n\nUn caro saluto,\nTia`,
    ctaText: 'Lascia una Recensione',
    ctaUrl: 'https://tiadesigns.it#recensioni',
  },
];

const COUNTRY_MAP: Record<string, { name: string; flag: string }> = {
  IT: { name: 'Italia', flag: '🇮🇹' },
  US: { name: 'Stati Uniti', flag: '🇺🇸' },
  GB: { name: 'Regno Unito', flag: '🇬🇧' },
  DE: { name: 'Germania', flag: '🇩🇪' },
  FR: { name: 'Francia', flag: '🇫🇷' },
  ES: { name: 'Spagna', flag: '🇪🇸' },
  CH: { name: 'Svizzera', flag: '🇨🇭' },
  NL: { name: 'Paesi Bassi', flag: '🇳🇱' },
  BE: { name: 'Belgio', flag: '🇧🇪' },
  AT: { name: 'Austria', flag: '🇦🇹' },
  PT: { name: 'Portogallo', flag: '🇵🇹' },
  PL: { name: 'Polonia', flag: '🇵🇱' },
  RO: { name: 'Romania', flag: '🇷🇴' },
  SE: { name: 'Svezia', flag: '🇸🇪' },
  NO: { name: 'Norvegia', flag: '🇳🇴' },
  DK: { name: 'Danimarca', flag: '🇩🇰' },
  FI: { name: 'Finlandia', flag: '🇫🇮' },
  GR: { name: 'Grecia', flag: '🇬🇷' },
  IE: { name: 'Irlanda', flag: '🇮🇪' },
  JP: { name: 'Giappone', flag: '🇯🇵' },
  CN: { name: 'Cina', flag: '🇨🇳' },
  BR: { name: 'Brasile', flag: '🇧🇷' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  IN: { name: 'India', flag: '🇮🇳' },
};

// ── WebP Image Converter (Auto-converts any uploaded image format to WebP) ──
async function convertImageToWebp(file: File, quality = 0.85): Promise<File> {
  if (file.type === 'image/webp') return file;
  return new Promise((resolve) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (!blob) {
                resolve(file);
                return;
              }
              const baseName = file.name.replace(/\.[^/.]+$/, '');
              const newFile = new File([blob], `${baseName}.webp`, { type: 'image/webp' });
              resolve(newFile);
            },
            'image/webp',
            quality
          );
        } catch {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    } catch {
      resolve(file);
    }
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('projects');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Availability state
  const [isOnline, setIsOnline] = useState(true);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectCategory, setProjectCategory] = useState('Sviluppo');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectLongDescription, setProjectLongDescription] = useState('');
  const [projectThumbnail, setProjectThumbnail] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [projectGithubUrl, setProjectGithubUrl] = useState('');
  const [projectTags, setProjectTags] = useState('');
  const [projectFeatured, setProjectFeatured] = useState(false);
  const [projectOrder, setProjectOrder] = useState<number>(0);
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [originalProjectsSnapshot, setOriginalProjectsSnapshot] = useState<Project[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 16:9 Interactive Crop & Preview State
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropPanX, setCropPanX] = useState<number>(0);
  const [cropPanY, setCropPanY] = useState<number>(0);
  const [isCropDragging, setIsCropDragging] = useState(false);
  const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const previewCropRef = useRef<HTMLDivElement>(null);

  // Project Gallery & PDF States
  const [projectGallery, setProjectGallery] = useState<string[]>([]);
  const [projectPdfUrl, setProjectPdfUrl] = useState('');
  const [galleryUploadLoading, setGalleryUploadLoading] = useState(false);
  const [pdfUploadLoading, setPdfUploadLoading] = useState(false);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProjectPdfModal, setSelectedProjectPdfModal] = useState<string | null>(null);
  const [selectedProjectGalleryModal, setSelectedProjectGalleryModal] = useState<{ title: string; images: string[]; activeIdx: number } | null>(null);

  // Cloudflare Media Gallery & CDN State
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaStats, setMediaStats] = useState<{ totalFiles: number; totalBytes: number; imageCount: number; pdfCount: number; webpCount: number } | null>(null);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'pdf' | 'design'>('all');
  const [mediaSearch, setMediaSearch] = useState('');
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [selectedMediaPreview, setSelectedMediaPreview] = useState<MediaAsset | null>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  // Messages Inbox & Email/Newsletter state
  const [inboxSubTab, setInboxSubTab] = useState<'messages' | 'compose' | 'newsletter'>('messages');
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messageFilter, setMessageFilter] = useState<string>('all');
  const [messageSearch, setMessageSearch] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [messageNotes, setMessageNotes] = useState('');

  // Branded Email Composer State
  const [composeTo, setComposeTo] = useState('');
  const [composeRecipientName, setComposeRecipientName] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeTitle, setComposeTitle] = useState('Comunicazione Ufficiale');
  const [composeBody, setComposeBody] = useState('');
  const [composeCtaText, setComposeCtaText] = useState('');
  const [composeCtaUrl, setComposeCtaUrl] = useState('');
  const [composeBadgeText, setComposeBadgeText] = useState('Tia Designs');
  const [composeContactMessageId, setComposeContactMessageId] = useState<string | null>(null);
  const [isSendingBrandedEmail, setIsSendingBrandedEmail] = useState(false);
  const [emailPreviewTab, setEmailPreviewTab] = useState<'preview' | 'code'>('preview');

  // Custom Email Templates State
  const [customEmailTemplates, setCustomEmailTemplates] = useState<any[]>([]);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateIcon, setNewTemplateIcon] = useState('✉️');
  const [isSavingCustomTemplate, setIsSavingCustomTemplate] = useState(false);

  // Newsletter & Campaigns State
  const [newsletterTarget, setNewsletterTarget] = useState<'all_contacts' | 'all_leads' | 'all_audience' | 'custom'>('all_audience');
  const [newsletterCustomEmails, setNewsletterCustomEmails] = useState('');
  const [newsletterSubject, setNewsletterSubject] = useState('');
  const [newsletterPreviewText, setNewsletterPreviewText] = useState('');
  const [newsletterBody, setNewsletterBody] = useState('');
  const [newsletterCtaText, setNewsletterCtaText] = useState('Scopri di più sul sito');
  const [newsletterCtaUrl, setNewsletterCtaUrl] = useState('https://tiadesigns.it');
  const [newsletterScheduleMode, setNewsletterScheduleMode] = useState<'now' | 'schedule'>('now');
  const [newsletterScheduledFor, setNewsletterScheduledFor] = useState('');
  const [newsletterCampaigns, setNewsletterCampaigns] = useState<any[]>([]);
  const [newsletterStats, setNewsletterStats] = useState<{ totalAudience: number; contactsCount: number; leadsCount: number } | null>(null);
  const [audienceList, setAudienceList] = useState<Array<{ email: string; name: string }>>([]);
  const [isSendingNewsletter, setIsSendingNewsletter] = useState(false);
  const [isExecutingCron, setIsExecutingCron] = useState(false);
  const [selectedNewsletterPreview, setSelectedNewsletterPreview] = useState<any | null>(null);

  // Chat & Leads state
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [chatLeads, setChatLeads] = useState<ChatSessionLead[]>([]);

  // Passkeys state
  const [passkeys, setPasskeys] = useState<AuthenticatorItem[]>([]);
  const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(null);
  const [passkeyNickname, setPasskeyNickname] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);

  // CMS state
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [newFaqCategory, setNewFaqCategory] = useState('generale');
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewRole, setNewReviewRole] = useState('');
  const [newReviewQuote, setNewReviewQuote] = useState('');
  const [newReviewCompany, setNewReviewCompany] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewAvatarUrl, setNewReviewAvatarUrl] = useState('');
  const reviewLogoInputRef = useRef<HTMLInputElement>(null);

  // Health state
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // ── Preventivatore State ─────────────────────────────────────────
  const [quoteClientName, setQuoteClientName] = useState('');
  const [quoteClientCompany, setQuoteClientCompany] = useState('');
  const [quoteClientEmail, setQuoteClientEmail] = useState('');
  const [quoteClientPhone, setQuoteClientPhone] = useState('');
  const [quoteClientVat, setQuoteClientVat] = useState('');
  const [quoteClientAddress, setQuoteClientAddress] = useState('');
  const [quoteNumber, setQuoteNumber] = useState(`PREV-${new Date().getFullYear()}-001`);
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [quoteValidity, setQuoteValidity] = useState('30 giorni');
  const [quoteTimeline, setQuoteTimeline] = useState('2-3 settimane lavorative');
  const [quotePaymentTerms, setQuotePaymentTerms] = useState('50% acconto all\'avvio, 50% al collaudo finale');
  const [quoteIban, setQuoteIban] = useState('IT00X0000000000000000000000');
  const [quoteNotes, setQuoteNotes] = useState('Garanzia bugfix 30 giorni inclusa. Assistenza e supporto post-lancio garantiti.');
  const [quoteDiscount, setQuoteDiscount] = useState<number>(0);
  const [quoteTaxRegime, setQuoteTaxRegime] = useState<'forfettario' | 'iva22'>('forfettario');
  const [quotePreviewTheme, setQuotePreviewTheme] = useState<'dark' | 'light'>('dark');
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([
    {
      id: 'item-1',
      title: 'Sviluppo Web App Custom & Design System',
      description: 'Architettura Next.js, performance CWV 99+, TailwindCSS, animazioni micro-interattive e pannello master.',
      quantity: 1,
      price: 1500,
    },
    {
      id: 'item-2',
      title: 'Integrazione Assistente AI & Booking Cal.com',
      description: 'Chatbot conversazionale su misura, sincronizzazione slot in tempo reale e notifiche webhook automatiche.',
      quantity: 1,
      price: 500,
    },
  ]);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [showQuotesHistory, setShowQuotesHistory] = useState(false);
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [customEmailNote, setCustomEmailNote] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Canvas Signature Drawing Pad Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const showTemporarySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Check auth & fetch all modules
  useEffect(() => {
    const initDashboard = async () => {
      try {
        const authRes = await fetch('/api/auth/status');
        if (!authRes.ok) {
          router.replace('/loginmaster');
          return;
        }

        await Promise.allSettled([
          fetchAvailability(),
          fetchProjects(),
          fetchMessages(),
          fetchChatData(),
          fetchPasskeys(),
          fetchCms(),
          fetchHealth(),
          fetchSavedQuotes(),
          fetchAnalytics(),
          fetchNewsletterData(),
          fetchEmailTemplates(),
          fetchMediaAssets(),
        ]);
      } catch (err: any) {
        setError(err.message || 'Errore di connessione');
      } finally {
        setLoading(false);
      }
    };

    void initDashboard();
  }, [router]);

  const fetchAvailability = async () => {
    try {
      const res = await fetch('/api/availability');
      if (res.ok) {
        const data = await res.json();
        setIsOnline(data.isOnline ?? true);
      }
    } catch {}
  };

  const toggleAvailability = async () => {
    setAvailabilitySaving(true);
    try {
      const next = !isOnline;
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: next }),
      });
      if (res.ok) {
        setIsOnline(next);
        showTemporarySuccess(next ? 'Stato impostato: Disponibile' : 'Stato impostato: Non disponibile');
      }
    } catch {
      setError('Impossibile salvare stato disponibilità');
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        setOriginalProjectsSnapshot((prev) => (prev.length === 0 ? data : prev));
      }
    } catch {}
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/master/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {}
  };

  const fetchChatData = async () => {
    try {
      const res = await fetch('/api/master/chats');
      if (res.ok) {
        const data = await res.json();
        setChatSessions(data.sessions || []);
        setChatLeads(data.leads || []);
      }
    } catch {}
  };

  const fetchPasskeys = async () => {
    try {
      const res = await fetch('/api/master/passkeys');
      if (res.ok) {
        const data = await res.json();
        setPasskeys(data);
      }
    } catch {}
  };

  const fetchCms = async () => {
    try {
      const [faqRes, revRes] = await Promise.all([
        fetch('/api/master/faqs'),
        fetch('/api/master/reviews'),
      ]);
      if (faqRes.ok) setFaqs(await faqRes.json());
      if (revRes.ok) setReviews(await revRes.json());
    } catch {}
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/master/system-health');
      if (res.ok) setSystemHealth(await res.json());
    } catch {}
  };

  const fetchSavedQuotes = async () => {
    try {
      const res = await fetch('/api/master/quotes');
      if (res.ok) setSavedQuotes(await res.json());
    } catch {}
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/analytics/stats?days=${analyticsDays}`);
      if (res.ok) setAnalyticsData(await res.json());
    } catch {}
  };

  const fetchNewsletterData = async () => {
    try {
      const res = await fetch('/api/master/newsletter');
      if (res.ok) {
        const data = await res.json();
        setNewsletterCampaigns(data.campaigns || []);
        setNewsletterStats(data.stats || null);
        setAudienceList(data.audienceList || []);
      }
    } catch {}
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/loginmaster');
  };

  // ── Project Handlers ─────────────────────────────────────────────
  const resetProjectForm = () => {
    setEditingProjectId(null);
    setProjectTitle('');
    setProjectCategory('Sviluppo');
    setProjectDescription('');
    setProjectLongDescription('');
    setProjectThumbnail('');
    setProjectUrl('');
    setProjectGithubUrl('');
    setProjectTags('');
    setProjectFeatured(false);
    setProjectOrder(projects.length > 0 ? Math.max(...projects.map((p) => p.order || 0)) + 1 : 1);
    setProjectGallery([]);
    setProjectPdfUrl('');
  };

  const handleOpenNewProjectModal = () => {
    resetProjectForm();
    setIsProjectModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setError(null);
    try {
      const webpFile = await convertImageToWebp(file);
      const formData = new FormData();
      formData.append('file', webpFile);
      const res = await fetch('/api/projects/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore caricamento immagine');
      setProjectThumbnail(data.url);
      showTemporarySuccess('Immagine convertita in WebP e caricata!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleUploadGalleryImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setGalleryUploadLoading(true);
    setError(null);
    const uploadedUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let fileToSend: File | Blob = file;
        if (file.type.startsWith('image/') && !file.type.includes('svg')) {
          try {
            fileToSend = await convertImageToWebp(file, 0.92);
          } catch {}
        }
        const formData = new FormData();
        formData.append('file', fileToSend, file.name);
        const res = await fetch('/api/projects/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          uploadedUrls.push(data.url);
        }
      }
      setProjectGallery((prev) => [...prev, ...uploadedUrls]);
      showTemporarySuccess(`${uploadedUrls.length} immagini caricate nel carosello!`);
    } catch (err: any) {
      setError(err.message || 'Errore caricamento carosello');
    } finally {
      setGalleryUploadLoading(false);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
    }
  };

  const handleUploadProjectPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfUploadLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      const res = await fetch('/api/projects/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore caricamento PDF');
      setProjectPdfUrl(data.url);
      showTemporarySuccess('Documento PDF caricato con successo!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPdfUploadLoading(false);
      if (pdfFileInputRef.current) pdfFileInputRef.current.value = '';
    }
  };

  const handleRemoveGalleryImage = (indexToRemove: number) => {
    setProjectGallery((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // ── Cloudflare Media Hub Handlers ─────────────────────────────────
  const fetchMediaAssets = async () => {
    setIsMediaLoading(true);
    try {
      const res = await fetch('/api/master/media');
      if (res.ok) {
        const data = await res.json();
        setMediaAssets(data.assets || []);
        setMediaStats(data.stats || null);
      }
    } catch {} finally {
      setIsMediaLoading(false);
    }
  };

  const handleBatchMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingMedia(true);
    setError(null);
    let successCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let fileToSend: File | Blob = file;
        if (file.type.startsWith('image/') && !file.type.includes('svg')) {
          try {
            fileToSend = await convertImageToWebp(file, 0.92);
          } catch {}
        }
        const formData = new FormData();
        formData.append('file', fileToSend, file.name);
        const res = await fetch('/api/projects/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) successCount++;
      }
      showTemporarySuccess(`${successCount} file caricati ed elaborati su Cloudflare / CDN con successo!`);
      await fetchMediaAssets();
    } catch (err: any) {
      setError(err.message || 'Errore durante il caricamento');
    } finally {
      setIsUploadingMedia(false);
      if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
    }
  };

  const handleDeleteMediaAsset = async (url: string, filename: string) => {
    if (!confirm(`Sei sicuro di voler eliminare "${filename}"?`)) return;
    try {
      const res = await fetch(`/api/master/media?url=${encodeURIComponent(url)}`, { method: 'DELETE' });
      if (res.ok) {
        showTemporarySuccess(`File "${filename}" eliminato.`);
        await fetchMediaAssets();
      }
    } catch {
      setError('Errore durante l\'eliminazione del file');
    }
  };

  const handleFileSelectForCrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setCropZoom(1);
    setCropPanX(0);
    setCropPanY(0);
    setShowCropModal(true);
    if (e.target) e.target.value = '';
  };

  const handleOpenCropForExistingThumb = () => {
    if (!projectThumbnail) return;
    setCropImageSrc(projectThumbnail);
    setCropZoom(1);
    setCropPanX(0);
    setCropPanY(0);
    setShowCropModal(true);
  };

  const handleConfirmCrop = async () => {
    if (!cropImageSrc) return;
    setUploadLoading(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = cropImageSrc;
      await new Promise<void>((resolve, reject) => {
        if (img.complete && img.naturalWidth > 0) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Impossibile caricare l\'immagine per il ritaglio'));
        }
      });

      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Contesto Canvas non disponibile');

      ctx.fillStyle = '#050f0c';
      ctx.fillRect(0, 0, 1920, 1080);

      const previewEl = previewCropRef.current;
      const pW = previewEl?.clientWidth || 560;
      const scaleFactor = 1920 / pW;

      const imgAspect = img.naturalWidth / img.naturalHeight;
      const targetAspect = 16 / 9;

      let baseW = 1920;
      let baseH = 1080;
      if (imgAspect > targetAspect) {
        baseW = 1080 * imgAspect;
      } else {
        baseH = 1920 / imgAspect;
      }

      const scaledW = baseW * cropZoom;
      const scaledH = baseH * cropZoom;
      const drawX = (1920 - scaledW) / 2 + (cropPanX * scaleFactor);
      const drawY = (1080 - scaledH) / 2 + (cropPanY * scaleFactor);

      ctx.drawImage(img, drawX, drawY, scaledW, scaledH);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError('Errore durante la generazione del file WebP');
          setUploadLoading(false);
          return;
        }

        const webpFile = new File([blob], `project-thumb-16x9-${Date.now()}.webp`, { type: 'image/webp' });
        const formData = new FormData();
        formData.append('file', webpFile);

        const res = await fetch('/api/projects/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Errore durante il caricamento');

        setProjectThumbnail(data.url);
        setShowCropModal(false);
        setCropImageSrc(null);
        showTemporarySuccess('Thumbnail ritagliata in 16:9, convertita in WebP e salvata!');
        setUploadLoading(false);
      }, 'image/webp', 0.88);
    } catch (err: any) {
      setError(err.message || 'Errore nel ritaglio immagine');
      setUploadLoading(false);
    }
  };

  const handleDuplicateProject = async (p: Project) => {
    try {
      const maxOrder = projects.length > 0 ? Math.max(...projects.map((item) => item.order || 0)) : 0;
      const payload = {
        title: `${p.title} (Copia)`,
        description: p.description,
        longDescription: p.longDescription || '',
        thumbnail: p.thumbnail,
        projectUrl: p.projectUrl || null,
        githubUrl: p.githubUrl || null,
        tags: p.tags,
        category: p.category || 'Sviluppo',
        featured: false,
        order: maxOrder + 1,
        gallery: p.gallery || null,
        pdfUrl: p.pdfUrl || null,
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Errore durante la duplicazione');
      }

      await fetchProjects();
      showTemporarySuccess(`Progetto "${p.title}" duplicato con successo come #${maxOrder + 1}!`);
    } catch (err: any) {
      setError(err.message || 'Errore duplicazione');
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle || !projectThumbnail) {
      setError('Titolo e Thumbnail sono obbligatori.');
      return;
    }
    setSubmitLoading(true);
    setError(null);
    try {
      const payload = {
        title: projectTitle,
        description: projectDescription,
        longDescription: projectLongDescription,
        thumbnail: projectThumbnail,
        projectUrl: projectUrl || null,
        githubUrl: projectGithubUrl || null,
        tags: projectTags,
        category: projectCategory || 'Sviluppo',
        featured: projectFeatured,
        order: Number(projectOrder) || 0,
        gallery: projectGallery.length > 0 ? JSON.stringify(projectGallery) : null,
        pdfUrl: projectPdfUrl.trim() || null,
      };

      const url = editingProjectId ? `/api/projects/${editingProjectId}` : '/api/projects';
      const method = editingProjectId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Operazione fallita');
      }

      resetProjectForm();
      setIsProjectDrawerOpen(false);
      setIsProjectModalOpen(false);
      await fetchProjects();
      showTemporarySuccess(editingProjectId ? 'Progetto aggiornato con successo!' : 'Nuovo progetto pubblicato!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditProject = (p: Project) => {
    setEditingProjectId(p.id);
    setProjectTitle(p.title);
    setProjectCategory(p.category || 'Sviluppo');
    setProjectDescription(p.description);
    setProjectLongDescription(p.longDescription || '');
    setProjectThumbnail(p.thumbnail);
    setProjectUrl(p.projectUrl || '');
    setProjectGithubUrl(p.githubUrl || '');
    setProjectTags(p.tags || '');
    setProjectFeatured(p.featured);
    setProjectOrder(p.order);
    try {
      if (p.gallery) {
        const parsed = typeof p.gallery === 'string' ? JSON.parse(p.gallery) : p.gallery;
        setProjectGallery(Array.isArray(parsed) ? parsed : []);
      } else {
        setProjectGallery([]);
      }
    } catch {
      setProjectGallery([]);
    }
    setProjectPdfUrl(p.pdfUrl || '');
    setIsProjectModalOpen(true);
  };

  const handleToggleFeatured = async (p: Project) => {
    const nextFeatured = !p.featured;
    setIsReordering(true);
    try {
      let updatedList = [...projects];
      if (nextFeatured) {
        // Move to the very top (beginning of list) as requested
        const withoutP = updatedList.filter((item) => item.id !== p.id);
        const updatedItem = { ...p, featured: true };
        updatedList = [updatedItem, ...withoutP];
      } else {
        // Unfeature the project
        updatedList = updatedList.map((item) =>
          item.id === p.id ? { ...item, featured: false } : item
        );
      }

      // Recompute orders 1..N
      const reindexed = updatedList.map((item, idx) => ({ ...item, order: idx + 1 }));
      setProjects(reindexed);

      // Save individual project featured state
      await fetch(`/api/projects/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: nextFeatured }),
      });

      // Save reordered indices
      await fetch('/api/projects/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reindexed.map((item) => ({ id: item.id, order: item.order })),
        }),
      });

      showTemporarySuccess(
        nextFeatured
          ? `★ "${p.title}" messo in evidenza e spostato in cima!`
          : `☆ "${p.title}" rimosso dai featured.`
      );
    } catch {
      setError('Errore durante l\'aggiornamento del flag featured');
    } finally {
      setIsReordering(false);
    }
  };

  const handleExportProjectsJson = () => {
    const jsonStr = JSON.stringify(projects, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-projects-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showTemporarySuccess('Backup JSON esportato con successo!');
  };

  const handleAutoReorderCategories = async () => {
    if (!confirm('Riorganizzare l\'ordine di tutti i progetti raggruppandoli per categoria (Web -> Software -> Design -> Video -> Social)?')) return;
    const categoryPriority: Record<string, number> = {
      Sviluppo: 1,
      Software: 2,
      Design: 3,
      Video: 4,
      Social: 5,
      Altro: 6,
    };

    const sorted = [...projects].sort((a, b) => {
      const pA = categoryPriority[a.category || 'Sviluppo'] || 99;
      const pB = categoryPriority[b.category || 'Sviluppo'] || 99;
      if (pA !== pB) return pA - pB;
      return (a.order || 0) - (b.order || 0);
    });

    const reindexed = sorted.map((p, idx) => ({ ...p, order: idx + 1 }));
    setProjects(reindexed);

    setIsReordering(true);
    try {
      const res = await fetch('/api/projects/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reindexed.map((p) => ({ id: p.id, order: p.order })),
        }),
      });
      if (res.ok) {
        showTemporarySuccess('Progetti riordinati per categoria e salvati!');
      }
    } catch {
      setError('Errore durante il riordino per categoria');
    } finally {
      setIsReordering(false);
    }
  };

  const handleResetProjectsOrder = async () => {
    if (!confirm('Ripristinare l\'ordine dei progetti a quello iniziale del sito (con i nuovi aggiunti in fondo ordinati per data)?')) return;
    
    // Canonical default order by title
    const canonicalDefaultTitles = [
      'GSA Hotels',
      'Vergilius Nectar',
      'Studio Ing. Moretti',
      'PCS Mantova',
      'Canapa Store',
      'Pigg',
      'Flussi di Coscienza',
      'Introspection',
      'Obi-Wan Kenobi',
      'Trovare le parole',
      'Vergilius Nectar Poster',
      'Design Editoriale — Vol. 1',
      'Design Editoriale — Vol. 2',
      'Design Editoriale — Vol. 2B',
      'Design Editoriale — Vol. 3',
      'Collage Digitale Astratto',
      'DestTime — Shaman King',
      'DestTime — My Hero Academia',
      'DestTime — Spider-Man',
      'DestTime — Stories Social',
      'Progetti di UI',
    ];

    const canonicalOrderMap = new Map<string, number>(
      canonicalDefaultTitles.map((title, idx) => [title.toLowerCase().trim(), idx + 1])
    );

    const sorted = [...projects].sort((a, b) => {
      const titleA = a.title.toLowerCase().trim();
      const titleB = b.title.toLowerCase().trim();
      const isCanonicalA = canonicalOrderMap.has(titleA);
      const isCanonicalB = canonicalOrderMap.has(titleB);

      if (isCanonicalA && isCanonicalB) {
        return canonicalOrderMap.get(titleA)! - canonicalOrderMap.get(titleB)!;
      }
      if (isCanonicalA && !isCanonicalB) return -1;
      if (!isCanonicalA && isCanonicalB) return 1;

      // Newly added custom projects sorted by createdAt ascending (earlier created first, most recent last)
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return (a.order || 0) - (b.order || 0);
    });

    const reindexed = sorted.map((p, idx) => ({ ...p, order: idx + 1 }));
    setProjects(reindexed);

    setIsReordering(true);
    try {
      const res = await fetch('/api/projects/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reindexed.map((p) => ({ id: p.id, order: p.order })),
        }),
      });
      if (res.ok) {
        showTemporarySuccess('Ordine iniziale dei progetti ripristinato con successo!');
      }
    } catch {
      setError('Errore durante il ripristino dell\'ordine');
    } finally {
      setIsReordering(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo progetto?')) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore durante l\'eliminazione');
      await fetchProjects();
      showTemporarySuccess('Progetto eliminato.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Drag & Drop Reordering ───────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedProjectId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverProjectId !== id) {
      setDragOverProjectId(id);
    }
  };

  const handleDragEnd = () => {
    setDraggedProjectId(null);
    setDragOverProjectId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedProjectId || draggedProjectId === targetId) {
      handleDragEnd();
      return;
    }

    const currentList = [...projects];
    const fromIndex = currentList.findIndex((p) => p.id === draggedProjectId);
    const toIndex = currentList.findIndex((p) => p.id === targetId);

    if (fromIndex === -1 || toIndex === -1) {
      handleDragEnd();
      return;
    }

    const [moved] = currentList.splice(fromIndex, 1);
    currentList.splice(toIndex, 0, moved);

    // Recalculate order indices (1-indexed)
    const reindexed = currentList.map((p, idx) => ({
      ...p,
      order: idx + 1,
    }));

    setProjects(reindexed);
    handleDragEnd();

    // Persist to server
    setIsReordering(true);
    try {
      const res = await fetch('/api/projects/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reindexed.map((p) => ({ id: p.id, order: p.order })),
        }),
      });
      if (res.ok) {
        showTemporarySuccess('Ordine dei progetti aggiornato e salvato con successo!');
      } else {
        const err = await res.json();
        setError(err.error || 'Errore durante il salvataggio del riordino');
      }
    } catch {
      setError('Errore di connessione durante il riordino');
    } finally {
      setIsReordering(false);
    }
  };

  // ── Inbox Messages Handlers ──────────────────────────────────────
  const handleUpdateMessageStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/master/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: status as any } : m)));
        if (selectedMessage?.id === id) {
          setSelectedMessage((prev) => (prev ? { ...prev, status: status as any } : null));
        }
      }
    } catch {}
  };

  const handleSaveMessageNotes = async (id: string) => {
    try {
      const res = await fetch('/api/master/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, notes: messageNotes }),
      });
      if (res.ok) {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, notes: messageNotes } : m)));
        showTemporarySuccess('Note salvate con successo!');
      }
    } catch {}
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Eliminare questo messaggio definitivamente?')) return;
    try {
      const res = await fetch(`/api/master/messages?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        setSelectedMessage(null);
        showTemporarySuccess('Messaggio rimosso.');
      }
    } catch {}
  };

  const handleStartReply = (msg: ContactMessage) => {
    setComposeTo(msg.email);
    setComposeRecipientName(msg.name);
    setComposeSubject(`Re: Richiesta ${msg.service} - Tia Designs`);
    setComposeTitle(`Riscontro per il tuo progetto di ${msg.service}`);
    setComposeBody(
      `Ciao **${msg.name}**,\n\ngrazie per avermi contattato!\n\nIn merito alla tua richiesta:\n> "${msg.message}"\n\nHo esaminato i dettagli e sono felice di confermarti la mia disponibilità. Possiamo concordare una call conoscitiva di 30 minuti per definire gli ultimi dettagli e procedere con il preventivo.\n\nResto a tua completa disposizione!\n\nA presto,\nTia`
    );
    setComposeCtaText('Prenota Call Conoscitiva');
    setComposeCtaUrl('https://tiadesigns.it#contatti');
    setComposeContactMessageId(msg.id);
    setInboxSubTab('compose');
    showTemporarySuccess(`Composer pronto per rispondere a ${msg.name}`);
  };

  const handleSendBrandedEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeBody) {
      setError('Destinatario, Oggetto e Contenuto sono obbligatori');
      return;
    }
    setIsSendingBrandedEmail(true);
    setError(null);
    try {
      const res = await fetch('/api/master/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeTo,
          recipientName: composeRecipientName,
          subject: composeSubject,
          title: composeTitle,
          bodyMarkdown: composeBody,
          ctaText: composeCtaText,
          ctaUrl: composeCtaUrl,
          badgeText: composeBadgeText,
          contactMessageId: composeContactMessageId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore invio email');

      showTemporarySuccess(data.message || 'Email inviata con successo nello stile branded!');
      setComposeContactMessageId(null);
      await fetchMessages();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSendingBrandedEmail(false);
    }
  };

  const handleApplyEmailTemplate = (tmpl: (typeof EMAIL_TEMPLATES)[0]) => {
    const clientName = composeRecipientName.trim();
    setComposeSubject(tmpl.subject(clientName));
    setComposeTitle(tmpl.title);
    setComposeBadgeText(tmpl.badge);
    setComposeBody(tmpl.body(clientName));
    setComposeCtaText(tmpl.ctaText);
    setComposeCtaUrl(tmpl.ctaUrl);
    showTemporarySuccess(`Template "${tmpl.name}" applicato con successo!`);
  };

  const fetchEmailTemplates = async () => {
    try {
      const res = await fetch('/api/master/email-templates');
      if (res.ok) {
        const data = await res.json();
        setCustomEmailTemplates(data.templates || []);
      }
    } catch {}
  };

  const handleApplyCustomTemplate = (tmpl: any) => {
    const clientName = composeRecipientName.trim();
    const sub = tmpl.subject.replace(/\{\{CLIENT_NAME\}\}/g, clientName || 'Gentile Cliente');
    const body = tmpl.body.replace(/\{\{CLIENT_NAME\}\}/g, clientName || 'Gentile Cliente');
    setComposeSubject(sub);
    setComposeTitle(tmpl.title);
    setComposeBadgeText(tmpl.badge || 'Tia Designs');
    setComposeBody(body);
    setComposeCtaText(tmpl.ctaText || '');
    setComposeCtaUrl(tmpl.ctaUrl || '');
    showTemporarySuccess(`Template "${tmpl.name}" applicato!`);
  };

  const handleSaveCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      setError('Inserisci un nome per il template');
      return;
    }
    if (!composeSubject.trim() || !composeBody.trim()) {
      setError('Compila Oggetto e Contenuto nel composer prima di salvare il template');
      return;
    }

    setIsSavingCustomTemplate(true);
    setError(null);
    try {
      const res = await fetch('/api/master/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          icon: newTemplateIcon.trim() || '✉️',
          badge: composeBadgeText.trim() || 'Tia Designs',
          title: composeTitle.trim() || 'Comunicazione Ufficiale',
          subject: composeSubject.trim(),
          body: composeBody.trim(),
          ctaText: composeCtaText.trim() || null,
          ctaUrl: composeCtaUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore salvataggio template');

      showTemporarySuccess('Template salvato nel database Turso con successo!');
      setNewTemplateName('');
      setIsSaveTemplateModalOpen(false);
      await fetchEmailTemplates();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSavingCustomTemplate(false);
    }
  };

  const handleDeleteCustomTemplate = async (id: string, name: string) => {
    if (!confirm(`Eliminare definitivamente il template "${name}"?`)) return;
    try {
      const res = await fetch(`/api/master/email-templates?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCustomEmailTemplates((prev) => prev.filter((t) => t.id !== id));
        showTemporarySuccess(`Template "${name}" eliminato.`);
      }
    } catch {}
  };

  const handleResetEmailComposer = () => {
    setComposeSubject('');
    setComposeTitle('Comunicazione Ufficiale');
    setComposeBadgeText('Tia Designs');
    setComposeBody('');
    setComposeCtaText('');
    setComposeCtaUrl('');
    showTemporarySuccess('Campi composer svuotati.');
  };

  const handleSendNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterSubject || !newsletterBody) {
      setError('Oggetto e Contenuto della newsletter sono obbligatori');
      return;
    }
    setIsSendingNewsletter(true);
    setError(null);
    try {
      const res = await fetch('/api/master/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newsletterSubject,
          previewText: newsletterPreviewText,
          bodyContent: newsletterBody,
          target: newsletterTarget,
          customEmails: newsletterCustomEmails,
          sendNow: newsletterScheduleMode === 'now',
          scheduledFor: newsletterScheduleMode === 'schedule' ? newsletterScheduledFor : null,
          ctaText: newsletterCtaText,
          ctaUrl: newsletterCtaUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore creazione campagna');

      showTemporarySuccess(data.message || 'Campagna elaborata con successo!');
      setNewsletterSubject('');
      setNewsletterPreviewText('');
      setNewsletterBody('');
      await fetchNewsletterData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSendingNewsletter(false);
    }
  };

  const handleExecuteCronNow = async () => {
    setIsExecutingCron(true);
    setError(null);
    try {
      const res = await fetch('/api/cron/newsletter', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore esecuzione cron');

      showTemporarySuccess(data.message || 'Cron eseguito con successo!');
      await fetchNewsletterData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExecutingCron(false);
    }
  };

  const handleDuplicateNewsletterToComposer = (camp: any) => {
    setNewsletterSubject(camp.subject || '');
    setNewsletterPreviewText(camp.previewText || '');
    setNewsletterBody(camp.bodyContent || '');
    showTemporarySuccess('Contenuto campagna caricato nel composer!');
  };

  const handleDeleteNewsletterCampaign = async (id: string) => {
    if (!confirm('Eliminare definitivamente questa campagna newsletter dallo storico?')) return;
    try {
      const res = await fetch(`/api/master/newsletter?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showTemporarySuccess('Campagna eliminata dallo storico.');
        await fetchNewsletterData();
      }
    } catch {
      setError('Errore durante l\'eliminazione della campagna');
    }
  };

  // ── Passkeys Handlers ────────────────────────────────────────────
  const handleRegisterNewPasskey = async () => {
    setError(null);
    try {
      const optRes = await fetch('/api/auth/passkey/register/options');
      const optData = await optRes.json();
      if (!optRes.ok) throw new Error(optData.error || 'Errore registrazione');

      const attResp = await startRegistration({ optionsJSON: optData });
      const verRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp),
      });
      const verData = await verRes.json();
      if (!verRes.ok || !verData.verified) throw new Error(verData.error || 'Verifica fallita');

      await fetchPasskeys();
      showTemporarySuccess('Nuovo dispositivo biometrico registrato!');
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setError(err.message || 'Errore durante la registrazione Passkey');
      }
    }
  };

  const handleSavePasskeyNickname = async (id: string) => {
    try {
      const res = await fetch('/api/master/passkeys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nickname: passkeyNickname }),
      });
      if (res.ok) {
        setEditingPasskeyId(null);
        await fetchPasskeys();
        showTemporarySuccess('Nome dispositivo aggiornato!');
      }
    } catch {}
  };

  const handleDeletePasskey = async (id: string) => {
    if (!confirm('Vuoi davvero revocare l\'accesso a questo dispositivo?')) return;
    try {
      const res = await fetch(`/api/master/passkeys?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchPasskeys();
        showTemporarySuccess('Dispositivo rimosso.');
      }
    } catch {}
  };

  const handleGenerateRecoveryCodes = async () => {
    if (!confirm('Generare nuovi codici di recupero invaliderà quelli precedenti. Procedere?')) return;
    setIsGeneratingCodes(true);
    try {
      const res = await fetch('/api/master/recovery-codes', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setRecoveryCodes(data.codes);
        showTemporarySuccess('5 nuovi codici generati!');
      }
    } catch {} finally {
      setIsGeneratingCodes(false);
    }
  };

  // ── CMS Handlers ─────────────────────────────────────────────────
  const handleCreateFaq = async () => {
    if (!newFaqQ || !newFaqA) return;
    try {
      const res = await fetch('/api/master/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIt: newFaqQ, answerIt: newFaqA, category: newFaqCategory }),
      });
      if (res.ok) {
        setNewFaqQ('');
        setNewFaqA('');
        fetchCms();
        showTemporarySuccess('FAQ aggiunta!');
      }
    } catch {}
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Eliminare questa FAQ?')) return;
    try {
      await fetch(`/api/master/faqs?id=${id}`, { method: 'DELETE' });
      fetchCms();
      showTemporarySuccess('FAQ eliminata.');
    } catch {}
  };

  const handleReviewLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const webpFile = await convertImageToWebp(file);
      const formData = new FormData();
      formData.append('file', webpFile);
      const res = await fetch('/api/projects/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        setNewReviewAvatarUrl(data.url);
        showTemporarySuccess('Logo azienda convertito in WebP e caricato!');
      }
    } catch {}
  };

  // ── Preventivatore Functions ─────────────────────────────────────
  const handleAddQuoteItem = () => {
    setQuoteItems([
      ...quoteItems,
      {
        id: `item-${Date.now()}`,
        title: 'Nuova voce di sviluppo',
        description: 'Dettagli e specifiche del servizio...',
        quantity: 1,
        price: 300,
      },
    ]);
  };

  const handleRemoveQuoteItem = (id: string) => {
    if (quoteItems.length <= 1) return;
    setQuoteItems(quoteItems.filter((i) => i.id !== id));
  };

  const handleUpdateQuoteItem = (id: string, field: keyof QuoteItem, value: any) => {
    setQuoteItems(quoteItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const applySignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureData(dataUrl);
    setShowSignatureModal(false);
    showTemporarySuccess('Firma digitale applicata al documento!');
  };

  const handleSaveQuote = async () => {
    if (!quoteClientName || !quoteClientEmail) {
      setError('Nome referente ed Email cliente sono obbligatori');
      return;
    }
    setIsSavingQuote(true);
    try {
      const subtotal = quoteItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
      const discountAmount = quoteDiscount > 0 ? Math.round((subtotal * quoteDiscount) / 100) : 0;
      const taxable = subtotal - discountAmount;
      const vatAmount = quoteTaxRegime === 'iva22' ? Math.round(taxable * 0.22) : 0;
      const total = taxable + vatAmount;

      const payload = {
        quoteNumber,
        clientName: quoteClientName,
        clientCompany: quoteClientCompany,
        clientEmail: quoteClientEmail,
        clientPhone: quoteClientPhone,
        clientVat: quoteClientVat,
        clientAddress: quoteClientAddress,
        date: quoteDate,
        validity: quoteValidity,
        timeline: quoteTimeline,
        items: quoteItems,
        discount: quoteDiscount,
        taxRegime: quoteTaxRegime,
        paymentTerms: quotePaymentTerms,
        iban: quoteIban,
        notes: quoteNotes,
        signatureData: signatureData || undefined,
        total,
      };

      const res = await fetch('/api/master/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchSavedQuotes();
        showTemporarySuccess('Preventivo salvato con successo!');
      }
    } catch {
      setError('Errore salvataggio preventivo');
    } finally {
      setIsSavingQuote(false);
    }
  };

  const handleLoadQuote = (q: SavedQuote) => {
    setQuoteNumber(q.quoteNumber);
    setQuoteClientName(q.clientName);
    setQuoteClientCompany(q.clientCompany || '');
    setQuoteClientEmail(q.clientEmail);
    setQuoteClientPhone(q.clientPhone || '');
    setQuoteClientVat(q.clientVat || '');
    setQuoteClientAddress(q.clientAddress || '');
    setQuoteDate(q.date);
    setQuoteValidity(q.validity);
    setQuoteTimeline(q.timeline);
    setQuoteItems(q.items || []);
    setQuoteDiscount(q.discount || 0);
    setQuoteTaxRegime(q.taxRegime || 'forfettario');
    setQuotePaymentTerms(q.paymentTerms);
    setQuoteIban(q.iban);
    setQuoteNotes(q.notes || '');
    setSignatureData(q.signatureData || null);
    setShowQuotesHistory(false);
    showTemporarySuccess(`Caricato preventivo ${q.quoteNumber}`);
  };

  const handleDeleteSavedQuote = async (id: string) => {
    if (!confirm('Eliminare questo preventivo salvato?')) return;
    try {
      const res = await fetch(`/api/master/quotes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedQuotes(savedQuotes.filter((q) => q.id !== id));
        showTemporarySuccess('Preventivo eliminato.');
      }
    } catch {}
  };

  const handleSendQuoteEmail = async () => {
    if (!quoteClientEmail) return;
    setIsSendingEmail(true);
    try {
      const subtotal = quoteItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
      const discountAmount = quoteDiscount > 0 ? Math.round((subtotal * quoteDiscount) / 100) : 0;
      const taxable = subtotal - discountAmount;
      const vatAmount = quoteTaxRegime === 'iva22' ? Math.round(taxable * 0.22) : 0;
      const total = taxable + vatAmount;

      const res = await fetch('/api/master/quotes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteNumber,
          clientName: quoteClientName,
          clientEmail: quoteClientEmail,
          clientCompany: quoteClientCompany,
          items: quoteItems,
          total,
          customNote: customEmailNote,
          taxRegime: quoteTaxRegime,
          paymentTerms: quotePaymentTerms,
          iban: quoteIban,
        }),
      });

      if (res.ok) {
        setShowSendModal(false);
        showTemporarySuccess(`Preventivo inviato con successo a ${quoteClientEmail}! Notifica inoltrata a info@tiadesigns.it`);
      } else {
        throw new Error('Errore durante l\'invio');
      }
    } catch {
      setError('Impossibile inviare l\'email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-teal-400/80 text-xs tracking-widest uppercase font-mono animate-pulse">Caricamento Master Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-neutral-100 font-sans relative overflow-x-hidden select-none pb-20">
      {/* Molten Metal Shader Background */}
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none">
        <MoltenMetal
          color1="#05bc8e"
          color2="#0effc1"
          color3="#ffffff"
          speed={0.25}
          scale={5.5}
          detail={2}
          glow={1.4}
          coreSize={0.1}
          swirl={1.35}
          fold={-0.15}
          blackPoint={0.03}
          brightness={0.3}
          colorMode="molten"
          grain={false}
          mouseInteraction={false}
          mouseStrength={0.15}
          opacity={1}
        />
      </div>

      {/* Subtle vignette layer */}
      <div aria-hidden="true" className="fixed inset-0 z-0 bg-black/45 pointer-events-none" />

      {/* Main Container with Left Sidebar & Right Content */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* ── LEFT SIDEBAR NAVIGATION BAR ── */}
        <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4 no-print lg:sticky lg:top-8">
          
          {/* Brand & Master Status */}
          <div className="bg-[#081410]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <TiaIcon icon={CpuIcon} size={20} strokeWidth={1.8} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-white">Master Hub</h1>
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-neutral-400 font-mono">Passkey Protected</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs transition-colors cursor-pointer"
              title="Logout"
            >
              Logout
            </button>
          </div>

          {/* Left Vertical Tabs Menu */}
          <div className="bg-[#081410]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-3 flex flex-col gap-1.5">
            {[
              { id: 'projects', label: 'Progetti Portfolio', icon: CodeFolderIcon, count: projects.length },
              { id: 'media', label: 'Media & Cloudflare CDN', icon: CloudIcon, count: mediaAssets.length },
              { id: 'inbox', label: 'Inbox & Newsletter', icon: Mail01Icon, count: messages.filter((m) => m.status === 'new').length },
              { id: 'chats', label: 'Archivio Chatbot', icon: BubbleChatIcon, count: chatLeads.length },
              { id: 'quotes', label: 'Preventivatore', icon: DollarSignIcon, count: savedQuotes.length },
              { id: 'analytics', label: 'Deep Analytics', icon: GaugeIcon },
              { id: 'cms', label: 'CMS Contenuti', icon: FilePenIcon },
              { id: 'health', label: 'System Health', icon: WorkflowSquare01Icon },
              { id: 'passkeys', label: 'Passkey & Sicurezza', icon: CpuIcon, count: passkeys.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                    active
                      ? 'bg-teal-400 text-black border-teal-300 shadow-lg shadow-teal-400/20'
                      : 'bg-transparent text-neutral-400 border-transparent hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TiaIcon icon={Icon} size={17} strokeWidth={2} />
                    <span>{tab.label}</span>
                  </div>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${active ? 'bg-black/20 text-black font-bold' : 'bg-teal-500/20 text-teal-300'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Availability Switch */}
          <div className="bg-[#081410]/90 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-4 flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Disponibilità Live</span>
            <button
              type="button"
              onClick={toggleAvailability}
              disabled={availabilitySaving}
              className={`w-full py-2.5 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                isOnline
                  ? 'bg-teal-950/60 border-teal-500/40 text-teal-300 hover:bg-teal-900/60'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-teal-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{isOnline ? 'Disponibile per progetti' : 'Non disponibile'}</span>
            </button>
          </div>
        </aside>

        {/* ── RIGHT MAIN DASHBOARD CONTENT AREA ── */}
        <main className="flex-1 min-w-0 w-full flex flex-col gap-6">
          
          {/* Global Alerts */}
          {error && (
            <div className="no-print p-4 rounded-2xl bg-red-950/70 border border-red-500/40 text-red-200 text-sm flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <TiaIcon icon={AlertCircleIcon} size={18} className="text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-white cursor-pointer"><TiaIcon icon={Cancel01Icon} size={16} /></button>
            </div>
          )}

          {successMessage && (
            <div className="no-print p-4 rounded-2xl bg-teal-950/70 border border-teal-500/40 text-teal-200 text-sm flex items-center gap-2.5 shadow-lg">
              <TiaIcon icon={CheckmarkCircle01Icon} size={18} className="text-teal-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ── TAB 1: PROGETTI ── */}
          {activeTab === 'projects' && (
            <div className="flex flex-col gap-6">
              
              {/* Top Section Header & Primary Actions */}
              <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                      <TiaIcon icon={CodeFolderIcon} size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                          Gestione Portfolio Progetti
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          {projects.length} Progetti
                        </span>
                        {isReordering && (
                          <span className="flex items-center gap-1.5 text-xs text-teal-300 font-mono animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-teal-400" />
                            Salvataggio ordine live...
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Griglia su 5 colonne fisse. Trascina la trama tattile ⠿ per riorganizzare l'ordine sul sito live o usa ★ per mettere in evidenza un progetto e portarlo in cima.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2 Top Right Buttons: 1. + Nuovo Progetto, 2. ↺ Ripristina Ordine Iniziale */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleResetProjectsOrder}
                    disabled={isReordering}
                    className="px-4 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-amber-500/20 border border-white/[0.08] hover:border-amber-500/40 text-neutral-200 hover:text-amber-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    title="Ripristina l'ordine iniziale del sito e mette i nuovi progetti in fondo in ordine cronologico"
                  >
                    <span className="text-sm">↺</span>
                    <span>Ripristina Ordine Iniziale</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenNewProjectModal}
                    className="px-5 py-2.5 rounded-2xl bg-teal-400 hover:bg-teal-300 text-black font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-400/25"
                  >
                    <TiaIcon icon={PlusSignIcon} size={15} />
                    <span>+ Nuovo Progetto</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-1">
                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: 'Tutti', count: projects.length },
                    { id: 'featured', label: '★ In Evidenza', count: projects.filter((p) => p.featured).length },
                    { id: 'Sviluppo', label: 'Web', count: projects.filter((p) => (p.category || 'Sviluppo') === 'Sviluppo').length },
                    { id: 'Software', label: 'App', count: projects.filter((p) => p.category === 'Software' || p.tags.toLowerCase().includes('software') || p.tags.toLowerCase().includes('app')).length },
                    { id: 'Design', label: 'Design', count: projects.filter((p) => p.category === 'Design' || p.tags.toLowerCase().includes('design')).length },
                    { id: 'Video', label: 'Video', count: projects.filter((p) => p.category === 'Video' || p.tags.toLowerCase().includes('video') || p.tags.toLowerCase().includes('montaggio')).length },
                    { id: 'Social', label: 'Social', count: projects.filter((p) => p.category === 'Social' || p.tags.toLowerCase().includes('social')).length },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        selectedCategoryFilter === cat.id
                          ? 'bg-teal-400 text-black shadow-md shadow-teal-400/20'
                          : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${selectedCategoryFilter === cat.id ? 'bg-black/20 text-black font-bold' : 'bg-black/40 text-neutral-400'}`}>
                        {cat.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64 shrink-0">
                  <TiaIcon icon={Search01Icon} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Cerca progetti o tag..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-teal-400"
                  />
                  {projectSearch && (
                    <button onClick={() => setProjectSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer">
                      <TiaIcon icon={Cancel01Icon} size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* 5-Column Grid with N Rows & Drag and Drop Reordering */}
              {(() => {
                const filtered = projects.filter((p) => {
                  const cat = (p.category || 'Sviluppo').toLowerCase();
                  const matchesCategory =
                    selectedCategoryFilter === 'all' ||
                    (selectedCategoryFilter === 'featured'
                      ? p.featured
                      : cat === selectedCategoryFilter.toLowerCase() ||
                        p.tags.toLowerCase().includes(selectedCategoryFilter.toLowerCase()));

                  const matchesSearch =
                    !projectSearch ||
                    p.title.toLowerCase().includes(projectSearch.toLowerCase()) ||
                    p.description.toLowerCase().includes(projectSearch.toLowerCase()) ||
                    p.tags.toLowerCase().includes(projectSearch.toLowerCase());

                  return matchesCategory && matchesSearch;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-12 rounded-3xl bg-black/40 border border-white/[0.06] text-center text-neutral-400">
                      Nessun progetto trovato con i filtri selezionati.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
                    {filtered.map((p) => {
                      const isDragged = draggedProjectId === p.id;
                      const isDragOver = dragOverProjectId === p.id;

                      const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
                        Sviluppo: { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/30' },
                        Software: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30' },
                        Design: { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
                        Video: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
                        Social: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
                        Altro: { bg: 'bg-neutral-500/15', text: 'text-neutral-300', border: 'border-neutral-500/30' },
                      };

                      const catStyle = categoryColors[p.category || 'Sviluppo'] || categoryColors.Sviluppo;
                      let galleryList: string[] = [];
                      try {
                        if (p.gallery) {
                          const parsed = typeof p.gallery === 'string' ? JSON.parse(p.gallery) : p.gallery;
                          if (Array.isArray(parsed)) galleryList = parsed;
                        }
                      } catch {}

                      return (
                        <div
                          key={p.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, p.id)}
                          onDragOver={(e) => handleDragOver(e, p.id)}
                          onDrop={(e) => handleDrop(e, p.id)}
                          onDragEnd={handleDragEnd}
                          className={`group bg-[#081410]/95 backdrop-blur-2xl border rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 select-none ${
                            isDragged
                              ? 'opacity-30 scale-95 border-teal-500 shadow-2xl'
                              : isDragOver
                              ? 'border-teal-400 bg-[#0d2a21] shadow-[0_0_25px_rgba(45,212,191,0.3)] scale-[1.02]'
                              : 'border-white/[0.08] hover:border-teal-500/40 hover:shadow-xl'
                          }`}
                        >
                          <div>
                            {/* ⠿ Trama Tattile / Textured Grip Handle Bar */}
                            <div
                              className="w-full flex items-center justify-between px-2 py-1.5 rounded-xl bg-black/60 hover:bg-teal-950/40 border border-white/[0.06] hover:border-teal-400/40 cursor-grab active:cursor-grabbing transition-all select-none shadow-sm mb-2 group/handle"
                              title="Afferra la trama per trascinare e riordinare questo progetto"
                            >
                              <div className="flex items-center gap-1.5">
                                {/* Textured 3x3 Dot Grid Pattern */}
                                <div className="flex items-center justify-center p-1 rounded-md bg-teal-500/15 border border-teal-500/25 text-teal-300 group-hover/handle:bg-teal-400 group-hover/handle:text-black transition-colors shadow-inner">
                                  <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                                    <circle cx="2" cy="2" r="1.2" />
                                    <circle cx="6" cy="2" r="1.2" />
                                    <circle cx="10" cy="2" r="1.2" />
                                    <circle cx="2" cy="6" r="1.2" />
                                    <circle cx="6" cy="6" r="1.2" />
                                    <circle cx="10" cy="6" r="1.2" />
                                    <circle cx="2" cy="10" r="1.2" />
                                    <circle cx="6" cy="10" r="1.2" />
                                    <circle cx="10" cy="10" r="1.2" />
                                  </svg>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-teal-300">
                                  #{p.order}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                {/* Featured Star Toggle Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleFeatured(p);
                                  }}
                                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-all ${
                                    p.featured
                                      ? 'bg-amber-400 text-black shadow-sm shadow-amber-400/30'
                                      : 'bg-white/[0.04] text-neutral-400 hover:text-amber-300 hover:bg-white/[0.08]'
                                  }`}
                                  title={p.featured ? 'In evidenza (clicca per rimuovere)' : 'Clicca per mettere in evidenza e portare in cima'}
                                >
                                  <span>★</span>
                                  <span className="text-[9px] hidden 2xl:inline">{p.featured ? 'Featured' : 'Normale'}</span>
                                </button>

                                <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                                  {p.category || 'Sviluppo'}
                                </span>
                              </div>
                            </div>

                            {/* Thumbnail Container (16:9) */}
                            <div className="h-28 w-full rounded-xl overflow-hidden mb-2 bg-black/60 relative border border-white/[0.06] flex items-center justify-center">
                              {p.thumbnail ? (
                                <img
                                  src={p.thumbnail}
                                  alt={p.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.opacity = '0.3';
                                  }}
                                />
                              ) : (
                                <div className="text-neutral-600 text-[10px] font-mono">No preview</div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
                              <div className="absolute bottom-1.5 left-2 right-2 z-10">
                                <h4 className="font-bold text-white text-xs truncate drop-shadow-md">
                                  {p.title}
                                </h4>
                              </div>
                            </div>

                            {/* Description Snippet */}
                            <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed px-0.5 mb-2">
                              {p.description}
                            </p>

                            {/* Media badges: Gallery & PDF */}
                            {(galleryList.length > 0 || p.pdfUrl) && (
                              <div className="flex flex-wrap items-center gap-1.5 px-0.5 mb-2">
                                {galleryList.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedProjectGalleryModal({ title: p.title, images: galleryList, activeIdx: 0 })}
                                    className="px-2 py-0.5 rounded-md bg-teal-500/15 hover:bg-teal-500/30 border border-teal-500/30 text-[10px] text-teal-300 font-semibold flex items-center gap-1 cursor-pointer transition-all"
                                    title="Visualizza galleria carosello"
                                  >
                                    <span>🖼️</span>
                                    <span>{galleryList.length} foto</span>
                                  </button>
                                )}
                                {p.pdfUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedProjectPdfModal(p.pdfUrl || null)}
                                    className="px-2 py-0.5 rounded-md bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-[10px] text-rose-300 font-semibold flex items-center gap-1 cursor-pointer transition-all"
                                    title="Visualizza documento PDF"
                                  >
                                    <span>📄</span>
                                    <span>PDF</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Tags Chips */}
                            {p.tags && (
                              <div className="flex flex-wrap gap-1 px-0.5 mb-2">
                                {p.tags.split(',').slice(0, 2).map((tag, idx) => (
                                  <span key={idx} className="px-1.5 py-0.2 rounded-md bg-white/[0.04] border border-white/[0.04] text-[9px] text-teal-300/90 font-mono truncate max-w-[100px]">
                                    #{tag.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] px-0.5">
                            <div className="flex items-center gap-1 text-xs text-neutral-400">
                              {p.projectUrl && (
                                <a
                                  href={p.projectUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-lg bg-white/[0.04] hover:bg-teal-500/20 text-neutral-300 hover:text-teal-300 transition-colors"
                                  title="Apri link live"
                                >
                                  <TiaIcon icon={ExternalLinkIcon} size={12} />
                                </a>
                              )}
                              {p.githubUrl && (
                                <a
                                  href={p.githubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-lg bg-white/[0.04] hover:bg-teal-500/20 text-neutral-300 hover:text-teal-300 transition-colors"
                                  title="Apri GitHub"
                                >
                                  <TiaIcon icon={CodeFolderIcon} size={12} />
                                </a>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Duplicate Project Button */}
                              <button
                                type="button"
                                onClick={() => handleDuplicateProject(p)}
                                className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-teal-500/20 text-neutral-300 hover:text-teal-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Duplica questo progetto"
                              >
                                <span>📋</span>
                                <span className="hidden 2xl:inline">Duplica</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditProject(p)}
                                className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-teal-500/20 hover:text-teal-300 text-[11px] text-white font-semibold transition-colors cursor-pointer"
                              >
                                Modifica
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProject(p.id)}
                                className="px-2 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-[11px] text-red-300 font-semibold transition-colors cursor-pointer"
                              >
                                Elimina
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* ── PROJECT CREATION / EDIT MODAL POPUP ── */}
              {isProjectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                  <div className="bg-[#081410] border border-white/[0.12] shadow-2xl rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-5">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                          <TiaIcon icon={editingProjectId ? FilePenIcon : PlusSignIcon} size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg">
                            {editingProjectId ? 'Modifica Progetto' : 'Nuovo Progetto Portfolio'}
                          </h3>
                          <p className="text-xs text-neutral-400">
                            {editingProjectId ? 'Aggiorna i dettagli e i media del progetto' : 'Compila i dati per pubblicare un nuovo lavoro sul portfolio live'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProjectModalOpen(false);
                          resetProjectForm();
                        }}
                        className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white cursor-pointer transition-colors"
                      >
                        <TiaIcon icon={Cancel01Icon} size={18} />
                      </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleProjectSubmit} className="flex flex-col gap-4">
                      {/* Title & Category */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">
                            Titolo Progetto *
                          </label>
                          <input
                            type="text"
                            required
                            value={projectTitle}
                            onChange={(e) => setProjectTitle(e.target.value)}
                            placeholder="Es. GSA Hotels & Resorts"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">
                            Categoria *
                          </label>
                          <select
                            value={projectCategory}
                            onChange={(e) => setProjectCategory(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#081410] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400 cursor-pointer"
                          >
                            <option value="Sviluppo">Sviluppo Web</option>
                            <option value="Software">Software & App</option>
                            <option value="Design">Design & Branding</option>
                            <option value="Video">Video Making</option>
                            <option value="Social">Social Media & Carousel</option>
                            <option value="Altro">Altro</option>
                          </select>
                        </div>
                      </div>

                      {/* Short Description */}
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">
                          Descrizione Breve * (Mostrata nella card)
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={projectDescription}
                          onChange={(e) => setProjectDescription(e.target.value)}
                          placeholder="Sintesi del progetto in 1-2 frasi incisive..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400 resize-none leading-relaxed"
                        />
                      </div>

                      {/* Long Description */}
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">
                          Descrizione Approfondita (Per modale & case study)
                        </label>
                        <textarea
                          rows={3}
                          value={projectLongDescription}
                          onChange={(e) => setProjectLongDescription(e.target.value)}
                          placeholder="Dettagli estesi, sfide tecniche, stack impiegato e risultati ottenuti..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400 resize-none leading-relaxed"
                        />
                      </div>

                      {/* Thumbnail & Upload with Auto-WebP & 16:9 Crop */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                            Copertina / Thumbnail * (Conversione WebP Automatica)
                          </label>
                          <span className="text-[10px] text-teal-300 font-mono">Formato consigliato 16:9</span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              required
                              value={projectThumbnail}
                              onChange={(e) => setProjectThumbnail(e.target.value)}
                              placeholder="/uploads/nome-progetto.webp o URL"
                              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-teal-400 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadLoading}
                              className="px-4 py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1.5 transition-all"
                            >
                              <TiaIcon icon={Upload01Icon} size={14} />
                              <span>{uploadLoading ? 'Conversione...' : 'Carica & Ritaglia'}</span>
                            </button>
                          </div>

                          {projectThumbnail && (
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-16 h-10 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0 relative group/thumb">
                                <img
                                  src={projectThumbnail}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.opacity = '0.3';
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleOpenCropForExistingThumb}
                                className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-teal-500/20 border border-white/[0.08] hover:border-teal-500/30 text-neutral-300 hover:text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Regola ritaglio e proporzione 16:9"
                              >
                                <span>✂️</span>
                                <span>Regola 16:9</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelectForCrop} accept="image/*" className="hidden" />
                      </div>

                      {/* Galleria & Carosello Immagini Multiplo (Auto WebP) */}
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🖼️</span>
                            <div>
                              <p className="text-xs font-bold text-white">Carosello / Galleria Immagini ({projectGallery.length})</p>
                              <p className="text-[10px] text-neutral-400">Carica più immagini insieme, convertite automaticamente in WebP</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => galleryFileInputRef.current?.click()}
                            disabled={galleryUploadLoading}
                            className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <TiaIcon icon={Upload01Icon} size={13} />
                            <span>{galleryUploadLoading ? 'Elaborazione WebP...' : '+ Aggiungi Immagini'}</span>
                          </button>
                          <input
                            type="file"
                            ref={galleryFileInputRef}
                            onChange={handleUploadGalleryImages}
                            accept="image/*"
                            multiple
                            className="hidden"
                          />
                        </div>

                        {/* Gallery Thumbnails Strip */}
                        {projectGallery.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
                            {projectGallery.map((imgUrl, idx) => (
                              <div key={idx} className="relative group/gitem w-16 h-12 rounded-lg overflow-hidden bg-black/70 border border-white/10 shrink-0">
                                <img src={imgUrl} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGalleryImage(idx)}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600/90 text-white text-[10px] flex items-center justify-center opacity-0 group-hover/gitem:opacity-100 transition-opacity cursor-pointer"
                                  title="Rimuovi immagine"
                                >
                                  &times;
                                </button>
                                <span className="absolute bottom-0.5 left-0.5 px-1 rounded bg-black/80 text-[8px] text-white font-mono">
                                  #{idx + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-neutral-500 italic">Nessuna immagine aggiuntiva nel carosello.</p>
                        )}
                      </div>

                      {/* Documento PDF Allegato (Case Study / Presentazione / Preventivo) */}
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📄</span>
                            <div>
                              <p className="text-xs font-bold text-white">Documento PDF Allegato (Case Study / Presentazione)</p>
                              <p className="text-[10px] text-neutral-400">Permette di visualizzare un documento PDF sfogliabile</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {projectPdfUrl && (
                              <button
                                type="button"
                                onClick={() => setSelectedProjectPdfModal(projectPdfUrl)}
                                className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-teal-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <TiaIcon icon={ViewIcon} size={13} />
                                <span>Anteprima PDF</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => pdfFileInputRef.current?.click()}
                              disabled={pdfUploadLoading}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <TiaIcon icon={Upload01Icon} size={13} />
                              <span>{pdfUploadLoading ? 'Caricamento...' : 'Carica PDF'}</span>
                            </button>
                            <input
                              type="file"
                              ref={pdfFileInputRef}
                              onChange={handleUploadProjectPdf}
                              accept="application/pdf"
                              className="hidden"
                            />
                          </div>
                        </div>

                        <input
                          type="text"
                          value={projectPdfUrl}
                          onChange={(e) => setProjectPdfUrl(e.target.value)}
                          placeholder="/uploads/design-works/Misti/WCM.pdf o URL del documento"
                          className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-teal-400 font-mono"
                        />
                      </div>

                      {/* URLs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">
                            Live URL (Opzionale)
                          </label>
                          <input
                            type="url"
                            value={projectUrl}
                            onChange={(e) => setProjectUrl(e.target.value)}
                            placeholder="https://clientedomain.com"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-teal-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">
                            GitHub Repository (Opzionale)
                          </label>
                          <input
                            type="url"
                            value={projectGithubUrl}
                            onChange={(e) => setProjectGithubUrl(e.target.value)}
                            placeholder="https://github.com/account/repo"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-teal-400"
                          />
                        </div>
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">
                          Tags & Tecnologie (Separati da virgola)
                        </label>
                        <input
                          type="text"
                          value={projectTags}
                          onChange={(e) => setProjectTags(e.target.value)}
                          placeholder="Next.js, TypeScript, Tailwind, UI/UX, 3D WebGL"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400"
                        />
                      </div>

                      {/* Featured & Order */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-neutral-300 font-medium">
                          <input
                            type="checkbox"
                            checked={projectFeatured}
                            onChange={(e) => setProjectFeatured(e.target.checked)}
                            className="accent-teal-400 w-4 h-4 rounded cursor-pointer"
                          />
                          <span className="flex items-center gap-1.5">
                            <TiaIcon icon={StarIcon} size={13} className={projectFeatured ? 'text-teal-400' : 'text-neutral-500'} />
                            <span>In Evidenza (Featured Showcase)</span>
                          </span>
                        </label>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-400">Ordine Indice:</span>
                          <input
                            type="number"
                            min={1}
                            value={projectOrder}
                            onChange={(e) => setProjectOrder(Number(e.target.value))}
                            className="w-16 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs text-center font-mono focus:outline-none focus:border-teal-400"
                          />
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProjectModalOpen(false);
                            resetProjectForm();
                          }}
                          className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Annulla
                        </button>
                        <button
                          type="submit"
                          disabled={submitLoading}
                          className="px-6 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-400/25 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <TiaIcon icon={editingProjectId ? CheckmarkCircle01Icon : PlusSignIcon} size={15} />
                          <span>{submitLoading ? 'Salvataggio...' : editingProjectId ? 'Salva Modifiche' : 'Pubblica Progetto'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ── 16:9 INTERACTIVE CROP & PREVIEW MODAL ── */}
              {showCropModal && cropImageSrc && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-lg animate-in fade-in duration-200">
                  <div className="bg-[#081410] border border-teal-500/30 shadow-[0_0_50px_rgba(45,212,191,0.2)] rounded-3xl p-6 max-w-2xl w-full flex flex-col gap-5">
                    {/* Crop Modal Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 text-lg">
                          ✂️
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base">Ritaglio & Inquadratura 16:9 Interattiva</h3>
                          <p className="text-xs text-neutral-400">Trascina per riposizionare l&apos;immagine e usa lo zoom per centrare la copertina</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCropModal(false);
                          setCropImageSrc(null);
                        }}
                        className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white cursor-pointer transition-colors"
                      >
                        <TiaIcon icon={Cancel01Icon} size={18} />
                      </button>
                    </div>

                    {/* 16:9 Interactive Viewport */}
                    <div className="flex flex-col items-center gap-3">
                      <div
                        ref={previewCropRef}
                        onMouseDown={(e) => {
                          setIsCropDragging(true);
                          setCropDragStart({ x: e.clientX - cropPanX, y: e.clientY - cropPanY });
                        }}
                        onMouseMove={(e) => {
                          if (!isCropDragging) return;
                          setCropPanX(e.clientX - cropDragStart.x);
                          setCropPanY(e.clientY - cropDragStart.y);
                        }}
                        onMouseUp={() => setIsCropDragging(false)}
                        onMouseLeave={() => setIsCropDragging(false)}
                        onTouchStart={(e) => {
                          if (e.touches.length === 1) {
                            setIsCropDragging(true);
                            setCropDragStart({ x: e.touches[0].clientX - cropPanX, y: e.touches[0].clientY - cropPanY });
                          }
                        }}
                        onTouchMove={(e) => {
                          if (!isCropDragging || e.touches.length !== 1) return;
                          setCropPanX(e.touches[0].clientX - cropDragStart.x);
                          setCropPanY(e.touches[0].clientY - cropDragStart.y);
                        }}
                        onTouchEnd={() => setIsCropDragging(false)}
                        className="aspect-video w-full max-w-lg rounded-2xl overflow-hidden relative border-2 border-teal-400/80 bg-black shadow-2xl cursor-grab active:cursor-grabbing select-none group/crop"
                      >
                        {/* Interactive Image with Transform */}
                        <img
                          src={cropImageSrc}
                          alt="Crop Source"
                          draggable={false}
                          style={{
                            transform: `translate(${cropPanX}px, ${cropPanY}px) scale(${cropZoom})`,
                            transformOrigin: 'center center',
                            transition: isCropDragging ? 'none' : 'transform 0.15s ease-out',
                          }}
                          className="w-full h-full object-cover pointer-events-none select-none max-w-none"
                        />

                        {/* Rule of Thirds Guides (3x3 grid) */}
                        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-teal-400/20">
                          <div className="border-r border-b border-white/10" />
                          <div className="border-r border-b border-white/10" />
                          <div className="border-b border-white/10" />
                          <div className="border-r border-b border-white/10" />
                          <div className="border-r border-b border-white/10" />
                          <div className="border-b border-white/10" />
                          <div className="border-r border-white/10" />
                          <div className="border-r border-white/10" />
                          <div />
                        </div>

                        {/* 16:9 Badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-teal-300 border border-teal-500/30 pointer-events-none">
                          16:9 ULTRA-HD
                        </div>

                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-neutral-300 border border-white/10 pointer-events-none">
                          Trascina per inquadrare
                        </div>
                      </div>

                      {/* Controls Bar: Zoom Slider + Quick Presets */}
                      <div className="w-full max-w-lg bg-black/40 border border-white/[0.06] rounded-2xl p-3 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between text-xs text-neutral-300">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span>🔍</span>
                            <span>Livello Zoom:</span>
                          </span>
                          <span className="font-mono font-bold text-teal-300">
                            {cropZoom.toFixed(2)}x
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-neutral-500 font-mono">1.0x</span>
                          <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.05"
                            value={cropZoom}
                            onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                            className="flex-1 accent-teal-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                          />
                          <span className="text-[10px] text-neutral-500 font-mono">3.0x</span>
                        </div>

                        {/* Position presets */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                          <span className="text-[10px] text-neutral-400">Posizionamento rapido:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setCropPanX(0);
                                setCropPanY(0);
                              }}
                              className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-neutral-300 transition-colors cursor-pointer"
                            >
                              Centra
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCropPanX(0);
                                setCropPanY(50);
                              }}
                              className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-neutral-300 transition-colors cursor-pointer"
                            >
                              In Alto
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCropPanX(0);
                                setCropPanY(-50);
                              }}
                              className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-neutral-300 transition-colors cursor-pointer"
                            >
                              In Basso
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCropZoom(1);
                                setCropPanX(0);
                                setCropPanY(0);
                              }}
                              className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-amber-300 transition-colors cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Modal Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCropModal(false);
                          setCropImageSrc(null);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Annulla
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmCrop}
                        disabled={uploadLoading}
                        className="px-6 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-400/25 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <TiaIcon icon={CheckmarkCircle01Icon} size={15} />
                        <span>{uploadLoading ? 'Conversione WebP...' : 'Conferma Ritaglio & Salva WebP'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── TAB: MEDIA & CLOUDFLARE CDN HUB ── */}
          {activeTab === 'media' && (
            <div className="flex flex-col gap-6">
              {/* Media Overview & Stats Header */}
              <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
                    <span className="text-[11px] font-mono uppercase tracking-widest text-teal-400">
                      Cloudflare CDN & Asset Vault
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-white">Media Hub & Cloudflare CDN</h2>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                    Gestione centralizzata degli asset multimediali, sincronizzazione con edge Cloudflare e conversione WebP automatica ad altissima definizione.
                  </p>
                </div>

                {/* KPI Metrics Strip */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-4 py-2.5 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col">
                    <span className="text-[10px] text-neutral-400 font-medium">Asset Totali</span>
                    <span className="text-base font-bold text-white font-mono">{mediaStats?.totalFiles ?? mediaAssets.length}</span>
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col">
                    <span className="text-[10px] text-neutral-400 font-medium">Dimensione Storage</span>
                    <span className="text-base font-bold text-teal-300 font-mono">
                      {mediaStats ? `${(mediaStats.totalBytes / (1024 * 1024)).toFixed(1)} MB` : '...'}
                    </span>
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col">
                    <span className="text-[10px] text-neutral-400 font-medium">Immagini WebP</span>
                    <span className="text-base font-bold text-cyan-300 font-mono">{mediaStats?.webpCount ?? 0}</span>
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col">
                    <span className="text-[10px] text-neutral-400 font-medium">Documenti PDF</span>
                    <span className="text-base font-bold text-rose-300 font-mono">{mediaStats?.pdfCount ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone & Actions Toolbar */}
              <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-5 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  {/* Category Filter Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'all', label: `Tutti i file (${mediaAssets.length})` },
                      { id: 'image', label: `Immagini WebP (${mediaAssets.filter((a) => a.type === 'image').length})` },
                      { id: 'pdf', label: `Documenti PDF (${mediaAssets.filter((a) => a.type === 'pdf').length})` },
                      { id: 'design', label: `Design Works (${mediaAssets.filter((a) => a.folder.includes('design-works')).length})` },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setMediaFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                          mediaFilter === f.id
                            ? 'bg-teal-400 text-black border-teal-300 shadow-md shadow-teal-400/20'
                            : 'bg-white/[0.04] text-neutral-400 border-white/[0.06] hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Upload & Refresh Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={fetchMediaAssets}
                      disabled={isMediaLoading}
                      className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                      title="Aggiorna asset"
                    >
                      <TiaIcon icon={RefreshIcon} size={15} className={isMediaLoading ? 'animate-spin' : ''} />
                    </button>

                    <button
                      type="button"
                      onClick={() => mediaFileInputRef.current?.click()}
                      disabled={isUploadingMedia}
                      className="px-4 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-400/25 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <TiaIcon icon={Upload01Icon} size={15} />
                      <span>{isUploadingMedia ? 'Conversione & Invio...' : '+ Carica File (Auto-WebP)'}</span>
                    </button>
                    <input
                      type="file"
                      ref={mediaFileInputRef}
                      onChange={handleBatchMediaUpload}
                      accept="image/*,application/pdf"
                      multiple
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none">
                    <TiaIcon icon={Search01Icon} size={15} />
                  </span>
                  <input
                    type="text"
                    value={mediaSearch}
                    onChange={(e) => setMediaSearch(e.target.value)}
                    placeholder="Cerca per nome file o cartella CDN..."
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-teal-400"
                  />
                  {mediaSearch && (
                    <button onClick={() => setMediaSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer">
                      <TiaIcon icon={Cancel01Icon} size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Media Gallery Grid (5 Columns) */}
              {(() => {
                const filteredMedia = mediaAssets.filter((asset) => {
                  if (mediaFilter === 'image' && asset.type !== 'image') return false;
                  if (mediaFilter === 'pdf' && asset.type !== 'pdf') return false;
                  if (mediaFilter === 'design' && !asset.folder.includes('design-works')) return false;
                  if (mediaSearch) {
                    const q = mediaSearch.toLowerCase();
                    return asset.filename.toLowerCase().includes(q) || asset.folder.toLowerCase().includes(q) || asset.url.toLowerCase().includes(q);
                  }
                  return true;
                });

                if (filteredMedia.length === 0) {
                  return (
                    <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3">
                      <span className="text-3xl">📁</span>
                      <p className="text-sm font-semibold text-white">Nessun asset trovato</p>
                      <p className="text-xs text-neutral-400 max-w-sm">
                        Nessun file multimediale corrisponde ai criteri di ricerca o alla cartella selezionata.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
                    {filteredMedia.map((asset, idx) => {
                      const isImage = asset.type === 'image';
                      const isPdf = asset.type === 'pdf';
                      const formattedSize = asset.size > 1024 * 1024
                        ? `${(asset.size / (1024 * 1024)).toFixed(1)} MB`
                        : `${(asset.size / 1024).toFixed(0)} KB`;

                      return (
                        <div
                          key={idx}
                          className="group bg-[#081410]/95 backdrop-blur-2xl border border-white/[0.08] hover:border-teal-500/40 rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 hover:shadow-xl select-none"
                        >
                          <div>
                            {/* Preview Area (16:9 for images, dedicated card for PDF) */}
                            <div className="h-32 w-full rounded-xl overflow-hidden mb-2 bg-black/70 relative border border-white/[0.06] flex items-center justify-center group/preview">
                              {isImage ? (
                                <img
                                  src={asset.url}
                                  alt={asset.filename}
                                  className="w-full h-full object-cover group-hover/preview:scale-105 transition-transform duration-500"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.opacity = '0.3';
                                  }}
                                />
                              ) : isPdf ? (
                                <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-rose-400">
                                  <span className="text-3xl">📄</span>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 font-mono">PDF Document</span>
                                </div>
                              ) : (
                                <div className="text-neutral-500 text-xs font-mono">{asset.ext}</div>
                              )}

                              {/* Hover Action Overlay */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 backdrop-blur-xs transition-opacity flex items-center justify-center gap-2">
                                {isImage && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedMediaPreview(asset)}
                                    className="p-2 rounded-xl bg-teal-400 text-black font-semibold text-xs shadow-lg hover:scale-110 transition-transform cursor-pointer"
                                    title="Visualizza immagine ad alta risoluzione"
                                  >
                                    <TiaIcon icon={ViewIcon} size={15} />
                                  </button>
                                )}
                                {isPdf && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedProjectPdfModal(asset.url)}
                                    className="p-2 rounded-xl bg-rose-400 text-black font-semibold text-xs shadow-lg hover:scale-110 transition-transform cursor-pointer"
                                    title="Apri nel visualizzatore PDF integrato"
                                  >
                                    <TiaIcon icon={ViewIcon} size={15} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const fullUrl = `${window.location.origin}${asset.url}`;
                                    navigator.clipboard.writeText(fullUrl);
                                    showTemporarySuccess(`URL copiato: ${asset.filename}`);
                                  }}
                                  className="p-2 rounded-xl bg-white/[0.15] hover:bg-white/[0.25] text-white text-xs shadow-lg hover:scale-110 transition-transform cursor-pointer"
                                  title="Copia URL CDN"
                                >
                                  🔗
                                </button>
                              </div>

                              {/* Format Badge Top Left */}
                              <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${
                                isImage ? 'bg-teal-500/80 text-black' : isPdf ? 'bg-rose-500/80 text-white' : 'bg-neutral-600/80 text-white'
                              }`}>
                                {asset.ext || asset.type}
                              </span>

                              {/* Size Badge Top Right */}
                              <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-black/75 text-neutral-300">
                                {formattedSize}
                              </span>
                            </div>

                            {/* Filename & Folder */}
                            <h4 className="font-bold text-white text-xs truncate drop-shadow-sm px-0.5" title={asset.filename}>
                              {asset.filename}
                            </h4>
                            <p className="text-[10px] text-neutral-500 font-mono truncate px-0.5 mb-2" title={asset.folder}>
                              📁 /{asset.folder}
                            </p>
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] px-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                const fullUrl = `${window.location.origin}${asset.url}`;
                                navigator.clipboard.writeText(fullUrl);
                                showTemporarySuccess(`URL copiato negli appunti!`);
                              }}
                              className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-teal-500/20 text-neutral-300 hover:text-teal-300 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Copia link"
                            >
                              <span>🔗</span>
                              <span>Copia CDN</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteMediaAsset(asset.url, asset.filename)}
                              className="px-2 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-[10px] text-red-300 font-semibold transition-colors cursor-pointer"
                              title="Elimina asset"
                            >
                              Elimina
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── TAB 2: INBOX MESSAGGI & EMAIL / NEWSLETTER CENTER ── */}
          {activeTab === 'inbox' && (
            <div className="flex flex-col gap-6">
              {/* Inbox Navigation Sub-Tabs */}
              <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInboxSubTab('messages')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      inboxSubTab === 'messages'
                        ? 'bg-teal-400 text-black shadow-lg shadow-teal-400/20'
                        : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <TiaIcon icon={Mail01Icon} size={16} />
                    <span>Posta & Richieste</span>
                    {messages.filter((m) => m.status === 'new').length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black text-teal-300">
                        {messages.filter((m) => m.status === 'new').length} nuovi
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setInboxSubTab('compose')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      inboxSubTab === 'compose'
                        ? 'bg-teal-400 text-black shadow-lg shadow-teal-400/20'
                        : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <TiaIcon icon={SentIcon} size={16} />
                    <span>Rispondi / Componi Branded</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInboxSubTab('newsletter');
                      fetchNewsletterData();
                    }}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      inboxSubTab === 'newsletter'
                        ? 'bg-teal-400 text-black shadow-lg shadow-teal-400/20'
                        : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <TiaIcon icon={SparklesIcon} size={16} />
                    <span>Newsletter & Campagne</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-teal-500/20 text-teal-300">
                      {audienceList.length || messages.length} destinatari
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono pr-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span>Sender: info@tiadesigns.it</span>
                </div>
              </div>

              {/* ── SUB-TAB 1: MESSAGGI RICEVUTI & LEAD ── */}
              {inboxSubTab === 'messages' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Messages List Column */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-4 flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                          {['all', 'new', 'in_progress', 'contacted', 'closed'].map((st) => (
                            <button
                              key={st}
                              onClick={() => setMessageFilter(st)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize cursor-pointer transition-colors ${
                                messageFilter === st
                                  ? 'bg-teal-400 text-black shadow-md shadow-teal-400/20'
                                  : 'bg-white/[0.04] text-neutral-400 hover:text-white'
                              }`}
                            >
                              {st === 'all' ? 'Tutti' : st === 'new' ? 'Nuovi' : st === 'in_progress' ? 'In corso' : st === 'contacted' ? 'Risposti' : 'Chiusi'}
                            </button>
                          ))}
                        </div>

                        <div className="relative w-full sm:w-48">
                          <TiaIcon icon={Search01Icon} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                          <input
                            type="text"
                            value={messageSearch}
                            onChange={(e) => setMessageSearch(e.target.value)}
                            placeholder="Filtra mittente o testo..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-teal-400"
                          />
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const filtered = messages.filter((m) => {
                        const matchesFilter = messageFilter === 'all' || m.status === messageFilter;
                        const matchesSearch =
                          !messageSearch ||
                          m.name.toLowerCase().includes(messageSearch.toLowerCase()) ||
                          m.email.toLowerCase().includes(messageSearch.toLowerCase()) ||
                          m.message.toLowerCase().includes(messageSearch.toLowerCase()) ||
                          m.service.toLowerCase().includes(messageSearch.toLowerCase());
                        return matchesFilter && matchesSearch;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-12 rounded-3xl bg-[#081410]/60 border border-white/[0.06] text-center text-neutral-400 text-xs">
                            Nessun messaggio trovato in questa visualizzazione.
                          </div>
                        );
                      }

                      return (
                        <div className="flex flex-col gap-3">
                          {filtered.map((m) => (
                            <div
                              key={m.id}
                              onClick={() => {
                                setSelectedMessage(m);
                                setMessageNotes(m.notes || '');
                              }}
                              className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                                selectedMessage?.id === m.id
                                  ? 'bg-[#0e2720] border-teal-400/60 shadow-lg shadow-teal-400/10'
                                  : 'bg-[#081410]/85 border-white/[0.08] hover:border-teal-500/30'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                  <span className="font-bold text-white text-sm">{m.name}</span>
                                  <span className="text-neutral-400 text-xs ml-2 font-mono">({m.email})</span>
                                </div>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${
                                    m.status === 'new'
                                      ? 'bg-teal-400/20 text-teal-300 border border-teal-400/40 animate-pulse'
                                      : m.status === 'in_progress'
                                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                      : m.status === 'contacted'
                                      ? 'bg-blue-400/20 text-blue-300 border border-blue-400/40'
                                      : 'bg-neutral-800 text-neutral-400'
                                  }`}
                                >
                                  {m.status}
                                </span>
                              </div>

                              <p className="text-xs text-neutral-300 line-clamp-2 mb-3 bg-black/40 p-2.5 rounded-xl border border-white/[0.04]">
                                {m.message}
                              </p>

                              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                                <span>
                                  Servizio: <strong className="text-teal-400 font-medium">{m.service}</strong>
                                </span>
                                <span>{new Date(m.createdAt).toLocaleString('it-IT')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Message Detail Drawer Column */}
                  <div className="lg:col-span-5">
                    {selectedMessage ? (
                      <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 sticky top-6 flex flex-col gap-4 shadow-xl">
                        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                          <div>
                            <h3 className="font-bold text-white text-base">Dettaglio Messaggio</h3>
                            <span className="text-[11px] text-neutral-400 font-mono">ID: {selectedMessage.id.slice(0, 8)}</span>
                          </div>
                          <button onClick={() => handleDeleteMessage(selectedMessage.id)} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">
                            Elimina
                          </button>
                        </div>

                        <div>
                          <p className="text-[11px] text-neutral-400 uppercase tracking-wider">Mittente</p>
                          <p className="text-sm font-bold text-white">{selectedMessage.name}</p>
                          <a href={`mailto:${selectedMessage.email}`} className="text-xs text-teal-400 hover:underline font-mono">
                            {selectedMessage.email}
                          </a>
                        </div>

                        <div>
                          <p className="text-[11px] text-neutral-400 uppercase tracking-wider">Servizio richiesto</p>
                          <p className="text-xs font-semibold text-teal-300">{selectedMessage.service}</p>
                        </div>

                        <div>
                          <p className="text-[11px] text-neutral-400 uppercase tracking-wider mb-1">Messaggio Completo</p>
                          <div className="p-3.5 rounded-2xl bg-black/60 border border-white/[0.06] text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
                            {selectedMessage.message}
                          </div>
                        </div>

                        {/* Status Selector */}
                        <div>
                          <p className="text-[11px] text-neutral-400 uppercase tracking-wider mb-1.5">Stato Richiesta</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'new', label: 'Nuovo' },
                              { id: 'in_progress', label: 'In corso' },
                              { id: 'contacted', label: 'Risposto' },
                              { id: 'closed', label: 'Chiuso' },
                            ].map((st) => (
                              <button
                                key={st.id}
                                onClick={() => handleUpdateMessageStatus(selectedMessage.id, st.id)}
                                className={`py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                                  selectedMessage.status === st.id ? 'bg-teal-400 text-black font-bold' : 'bg-white/[0.05] text-neutral-400 hover:text-white'
                                }`}
                              >
                                {st.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Internal Notes */}
                        <div>
                          <p className="text-[11px] text-neutral-400 uppercase tracking-wider mb-1.5">Note Interne</p>
                          <textarea
                            rows={3}
                            value={messageNotes}
                            onChange={(e) => setMessageNotes(e.target.value)}
                            placeholder="Appunti o recap per questo contatto..."
                            className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white resize-none focus:outline-none focus:border-teal-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveMessageNotes(selectedMessage.id)}
                            className="w-full mt-2 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs text-white font-semibold transition-colors cursor-pointer"
                          >
                            Salva Note
                          </button>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
                          <button
                            type="button"
                            onClick={() => handleStartReply(selectedMessage)}
                            className="w-full py-3 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-400/20 transition-all cursor-pointer"
                          >
                            <TiaIcon icon={SentIcon} size={15} />
                            <span>Rispondi con Stile Branded</span>
                          </button>

                          <a
                            href={`mailto:${selectedMessage.email}?subject=Re:%20Richiesta%20${encodeURIComponent(selectedMessage.service)}%20-%20Tia%20Designs`}
                            className="w-full py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white font-medium text-xs text-center transition-all block"
                          >
                            Apri nel tuo Client Email (Mailto)
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-12 rounded-3xl bg-[#081410]/60 border border-white/[0.06] text-center text-neutral-400 text-xs">
                        Seleziona un messaggio dalla lista per visualizzare i dettagli e rispondere.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── SUB-TAB 2: COMPONI / RISPONDI EMAIL CON STILE BRANDED ── */}
              {inboxSubTab === 'compose' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Compose Form */}
                  <div className="lg:col-span-6 bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-xl flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                      <div>
                        <h3 className="font-bold text-white text-base">Componi Email Ufficiale</h3>
                        <p className="text-xs text-neutral-400">Invia email formattate con lo stile scuro e teal di Tia Designs</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-teal-500/15 text-teal-300 border border-teal-500/30">
                        HTML Branded
                      </span>
                    </div>

                    <form onSubmit={handleSendBrandedEmail} className="flex flex-col gap-4">
                      {/* ⚡ Quick Email Templates Selector */}
                      <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                            <TiaIcon icon={SparklesIcon} size={13} className="text-teal-400" />
                            <span>Template Rapidi Predefiniti & Personalizzati</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setNewTemplateName('');
                                setIsSaveTemplateModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                              title="Salva il contenuto corrente come nuovo template riutilizzabile"
                            >
                              <TiaIcon icon={PlusSignIcon} size={12} />
                              <span>Salva come Nuovo Template</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleResetEmailComposer}
                              className="px-2 py-1 rounded-xl bg-white/[0.02] hover:bg-red-500/20 border border-white/[0.04] hover:border-red-500/30 text-neutral-400 hover:text-red-300 text-[11px] font-medium transition-all cursor-pointer"
                              title="Svuota campi composer"
                            >
                              Svuota
                            </button>
                          </div>
                        </div>

                        {/* Presets & Custom list */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Standard Built-in Templates */}
                          {EMAIL_TEMPLATES.map((tmpl) => (
                            <button
                              key={tmpl.id}
                              type="button"
                              onClick={() => handleApplyEmailTemplate(tmpl)}
                              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-teal-500/20 border border-white/[0.06] hover:border-teal-500/40 text-neutral-300 hover:text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                            >
                              <span>{tmpl.icon}</span>
                              <span>{tmpl.name}</span>
                            </button>
                          ))}

                          {/* Custom Saved Templates from Database */}
                          {customEmailTemplates.map((customTmpl) => (
                            <div
                              key={customTmpl.id}
                              className="flex items-center rounded-xl bg-teal-950/40 border border-teal-500/30 hover:border-teal-400/60 transition-all overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() => handleApplyCustomTemplate(customTmpl)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-teal-200 hover:text-teal-100 flex items-center gap-1.5 cursor-pointer"
                                title={`Applica template: ${customTmpl.name}`}
                              >
                                <span>{customTmpl.icon || '✉️'}</span>
                                <span>{customTmpl.name}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomTemplate(customTmpl.id, customTmpl.name)}
                                className="px-1.5 py-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs cursor-pointer border-l border-teal-500/20"
                                title="Elimina questo template dal database"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Modal for saving custom template */}
                      {isSaveTemplateModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                          <div className="w-full max-w-md bg-[#081410] border border-teal-500/30 rounded-3xl p-6 shadow-2xl relative">
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">💾</span>
                                <div>
                                  <h4 className="text-base font-bold text-white">Salva come Nuovo Template</h4>
                                  <p className="text-[11px] text-neutral-400">Salva il layout corrente nel database Turso</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsSaveTemplateModalOpen(false)}
                                className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white"
                              >
                                <TiaIcon icon={Cancel01Icon} size={16} />
                              </button>
                            </div>

                            <div className="flex flex-col gap-3">
                              <div>
                                <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">
                                  Nome Template *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={newTemplateName}
                                  onChange={(e) => setNewTemplateName(e.target.value)}
                                  placeholder="Es. Preventivo E-Commerce, Sollecito, ..."
                                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">
                                  Icona Emoji
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {['✉️', '💼', '🚀', '⚡', '🔔', '🎯', '💡', '💰', '💎', '🌟'].map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => setNewTemplateIcon(emoji)}
                                      className={`w-9 h-9 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                                        newTemplateIcon === emoji
                                          ? 'bg-teal-500/20 border border-teal-400 scale-110'
                                          : 'bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08]'
                                      }`}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04] text-[11px] text-neutral-400 flex flex-col gap-1">
                                <div><strong className="text-white">Oggetto:</strong> {composeSubject || '(Nessun oggetto specificato)'}</div>
                                <div><strong className="text-white">Titolo:</strong> {composeTitle || 'Comunicazione Ufficiale'}</div>
                                <div className="truncate"><strong className="text-white">Body:</strong> {composeBody ? composeBody.slice(0, 60) + '...' : '(Nessun testo)'}</div>
                              </div>

                              <div className="flex items-center gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setIsSaveTemplateModalOpen(false)}
                                  className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 font-semibold text-xs transition-colors cursor-pointer"
                                >
                                  Annulla
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveCustomTemplate}
                                  disabled={isSavingCustomTemplate || !newTemplateName.trim()}
                                  className="flex-1 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-bold text-xs shadow-lg shadow-teal-400/25 transition-all cursor-pointer disabled:opacity-50"
                                >
                                  {isSavingCustomTemplate ? 'Salvataggio...' : 'Salva Template'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Email Destinatario *</label>
                          <input
                            type="email"
                            required
                            value={composeTo}
                            onChange={(e) => setComposeTo(e.target.value)}
                            placeholder="cliente@dominio.com"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Nome Destinatario</label>
                          <input
                            type="text"
                            value={composeRecipientName}
                            onChange={(e) => setComposeRecipientName(e.target.value)}
                            placeholder="Nome del cliente"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Oggetto Email *</label>
                        <input
                          type="text"
                          required
                          value={composeSubject}
                          onChange={(e) => setComposeSubject(e.target.value)}
                          placeholder="Oggetto dell'email..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Titolo Intestazione</label>
                          <input
                            type="text"
                            value={composeTitle}
                            onChange={(e) => setComposeTitle(e.target.value)}
                            placeholder="Titolo interno al messaggio"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Badge Etichetta</label>
                          <input
                            type="text"
                            value={composeBadgeText}
                            onChange={(e) => setComposeBadgeText(e.target.value)}
                            placeholder="Tia Designs / Preventivo"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400">Contenuto Messaggio (Markdown Supportato) *</label>
                          <span className="text-[10px] text-neutral-500 font-mono">**grassetto**, *corsivo*, elenchi</span>
                        </div>
                        <textarea
                          required
                          rows={8}
                          value={composeBody}
                          onChange={(e) => setComposeBody(e.target.value)}
                          placeholder="Scrivi qui il messaggio per il cliente..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400 font-mono text-xs leading-relaxed resize-y"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Pulsante CTA (Testo opzionale)</label>
                          <input
                            type="text"
                            value={composeCtaText}
                            onChange={(e) => setComposeCtaText(e.target.value)}
                            placeholder="Es. Prenota una Call"
                            className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-teal-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Pulsante CTA (URL)</label>
                          <input
                            type="url"
                            value={composeCtaUrl}
                            onChange={(e) => setComposeCtaUrl(e.target.value)}
                            placeholder="https://tiadesigns.it#contatti"
                            className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-teal-400"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingBrandedEmail}
                        className="w-full py-3.5 rounded-2xl bg-teal-400 hover:bg-teal-300 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-400/25 transition-all cursor-pointer disabled:opacity-50 mt-2"
                      >
                        <TiaIcon icon={SentIcon} size={16} />
                        <span>{isSendingBrandedEmail ? 'Invio in corso...' : 'Invia Email Ufficiale Branded'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Live Email Preview */}
                  <div className="lg:col-span-6 flex flex-col gap-4">
                    <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-4 flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <TiaIcon icon={GaugeIcon} size={15} className="text-teal-400" />
                        Anteprima Live Email (Come apparirà al cliente)
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">620px Responsive</span>
                    </div>

                    {/* Email Mock Container */}
                    <div className="bg-[#040d0a] border border-teal-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden text-neutral-100 flex flex-col gap-4">
                      {/* Top Gradient Bar */}
                      <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-teal-300 to-teal-500 rounded-full" />

                      {/* Header */}
                      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                        <div>
                          <div className="text-lg font-bold text-white tracking-tight">
                            Tia <span className="text-teal-400">Designs</span>
                          </div>
                          <p className="text-[10px] text-neutral-400">Designer • Sviluppatore App & Software • Videomaker</p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                          {composeBadgeText || 'Tia Designs'}
                        </span>
                      </div>

                      {/* Content Area */}
                      <div className="py-2 flex flex-col gap-3">
                        {composeTitle && <h4 className="text-base font-bold text-white">{composeTitle}</h4>}
                        {composeRecipientName && <p className="text-xs font-bold text-teal-300">Ciao {composeRecipientName},</p>}

                        <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] border-l-2 border-l-teal-400 text-xs text-neutral-200 leading-relaxed whitespace-pre-wrap">
                          {composeBody || 'Scrivi il messaggio a sinistra per vedere l\'anteprima in tempo reale...'}
                        </div>

                        {composeCtaText && (
                          <div className="text-center my-3">
                            <span className="inline-block px-6 py-2.5 rounded-xl bg-teal-400 text-black font-bold text-xs shadow-lg shadow-teal-400/20">
                              {composeCtaText} &rarr;
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Signature */}
                      <div className="pt-4 border-t border-white/[0.08] text-xs">
                        <p className="font-bold text-white">Tia Chinaglia</p>
                        <p className="text-[11px] text-teal-400">Fondatore & Lead Creative Developer • Tia Designs</p>
                        <p className="text-[10px] text-neutral-500 mt-1">info@tiadesigns.it • tiadesigns.it</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUB-TAB 3: NEWSLETTER & CAMPAGNE ── */}
              {inboxSubTab === 'newsletter' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Create Newsletter */}
                  <div className="lg:col-span-7 bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-xl flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base">Crea Campagna Newsletter</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-teal-500/15 text-teal-300 border border-teal-500/30">
                            Cron Attivo (Vercel)
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">Invia o programma comunicazioni promozionali automatiche</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleExecuteCronNow}
                          disabled={isExecutingCron}
                          className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                          title="Esegue manualmente il controllo delle newsletter programmate per inviare quelle scadute"
                        >
                          <span>⚡</span>
                          <span>{isExecutingCron ? 'Esecuzione...' : 'Esegui Cron Ora'}</span>
                        </button>
                        <span className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-white/[0.04] text-neutral-300 border border-white/[0.06]">
                          {audienceList.length || messages.length} Contatti
                        </span>
                      </div>
                    </div>

                    <form onSubmit={handleSendNewsletter} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Destinatari Target *</label>
                        <select
                          value={newsletterTarget}
                          onChange={(e) => setNewsletterTarget(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#081410] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-teal-400 cursor-pointer"
                        >
                          <option value="all_audience">Tutti i Contatti & Lead ({audienceList.length || messages.length})</option>
                          <option value="all_contacts">Solo Richieste Form Sito ({messages.length})</option>
                          <option value="all_leads">Solo Preventivi AI ({chatLeads.length})</option>
                          <option value="custom">Destinatari Personalizzati</option>
                        </select>
                      </div>

                      {newsletterTarget === 'custom' && (
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Email Personalizzate (separate da virgola o a capo)</label>
                          <textarea
                            rows={2}
                            value={newsletterCustomEmails}
                            onChange={(e) => setNewsletterCustomEmails(e.target.value)}
                            placeholder="mail1@test.it, mail2@test.it..."
                            className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-teal-400 resize-none"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Oggetto Newsletter *</label>
                          <input
                            type="text"
                            required
                            value={newsletterSubject}
                            onChange={(e) => setNewsletterSubject(e.target.value)}
                            placeholder="Es. Novità e Aggiornamenti Tia Designs"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Testo Anteprima (Preheader)</label>
                          <input
                            type="text"
                            value={newsletterPreviewText}
                            onChange={(e) => setNewsletterPreviewText(e.target.value)}
                            placeholder="Breve frase visibile nell'inbox"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Contenuto Newsletter (Markdown) *</label>
                        <textarea
                          required
                          rows={6}
                          value={newsletterBody}
                          onChange={(e) => setNewsletterBody(e.target.value)}
                          placeholder="Scrivi qui la tua newsletter o annuncio..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono leading-relaxed focus:outline-none focus:border-teal-400 resize-y"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Pulsante CTA (Testo)</label>
                          <input
                            type="text"
                            value={newsletterCtaText}
                            onChange={(e) => setNewsletterCtaText(e.target.value)}
                            placeholder="Scopri di più"
                            className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-teal-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Pulsante CTA (URL)</label>
                          <input
                            type="url"
                            value={newsletterCtaUrl}
                            onChange={(e) => setNewsletterCtaUrl(e.target.value)}
                            placeholder="https://tiadesigns.it"
                            className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-teal-400"
                          />
                        </div>
                      </div>

                      {/* Scheduling options */}
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-white font-semibold">
                            <input
                              type="radio"
                              name="scheduleMode"
                              checked={newsletterScheduleMode === 'now'}
                              onChange={() => setNewsletterScheduleMode('now')}
                              className="accent-teal-400"
                            />
                            <span>Invia Subito</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer text-xs text-white font-semibold">
                            <input
                              type="radio"
                              name="scheduleMode"
                              checked={newsletterScheduleMode === 'schedule'}
                              onChange={() => setNewsletterScheduleMode('schedule')}
                              className="accent-teal-400"
                            />
                            <span>Programma Invio</span>
                          </label>
                        </div>

                        {newsletterScheduleMode === 'schedule' && (
                          <div>
                            <label className="block text-[11px] text-neutral-400 mb-1">Seleziona Data e Ora</label>
                            <input
                              type="datetime-local"
                              required
                              value={newsletterScheduledFor}
                              onChange={(e) => setNewsletterScheduledFor(e.target.value)}
                              className="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-teal-400"
                            />
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingNewsletter}
                        className="w-full py-3.5 rounded-2xl bg-teal-400 hover:bg-teal-300 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-400/25 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <TiaIcon icon={SparklesIcon} size={16} />
                        <span>
                          {isSendingNewsletter
                            ? 'Elaborazione...'
                            : newsletterScheduleMode === 'schedule'
                            ? 'Programma Campagna Newsletter'
                            : 'Lancia Campagna Newsletter Subito'}
                        </span>
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Campaigns History with Status Badges & Engagement Metrics */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-5 shadow-xl flex flex-col gap-3">
                      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                        <div>
                          <h3 className="font-bold text-white text-sm">Storico & Report Campagne</h3>
                          <p className="text-[11px] text-neutral-400">Tracciamento invii, aperture stimate e programmazioni</p>
                        </div>
                        <span className="text-xs text-neutral-400 font-mono">{newsletterCampaigns.length} totali</span>
                      </div>

                      {newsletterCampaigns.length === 0 ? (
                        <p className="text-xs text-neutral-500 py-8 text-center">Nessuna campagna newsletter inviata o programmata finora.</p>
                      ) : (
                        <div className="flex flex-col gap-3.5 max-h-[620px] overflow-y-auto pr-1">
                          {newsletterCampaigns.map((camp) => {
                            const isSent = camp.status === 'sent' || camp.status === 'completed';
                            const isScheduled = camp.status === 'scheduled';
                            const isFailed = camp.status === 'failed';
                            const isPartial = camp.status === 'partial';

                            // Estimated Engagement Metrics based on recipient count
                            const deliveryRate = isSent ? 100 : 0;
                            const estimatedOpenRate = isSent ? (camp.recipientCount > 0 ? 44.5 : 0) : 0;
                            const estimatedClickRate = isSent ? (camp.recipientCount > 0 ? 18.2 : 0) : 0;

                            return (
                              <div
                                key={camp.id}
                                className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] hover:border-teal-500/30 transition-all flex flex-col gap-2.5 group"
                              >
                                {/* Header: Subject + Status Badge */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-white text-xs truncate group-hover:text-teal-300 transition-colors">
                                      {camp.subject}
                                    </h4>
                                    {camp.previewText && (
                                      <p className="text-[10px] text-neutral-400 italic truncate mt-0.5">
                                        &ldquo;{camp.previewText}&rdquo;
                                      </p>
                                    )}
                                  </div>

                                  {/* Color-Coded Status Badge */}
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold shrink-0 border ${
                                      isSent
                                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                        : isScheduled
                                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                                        : isFailed
                                        ? 'bg-red-500/15 text-red-300 border-red-500/30'
                                        : isPartial
                                        ? 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                                        : 'bg-white/[0.04] text-neutral-400 border-white/[0.08]'
                                    }`}
                                  >
                                    {isSent
                                      ? '✓ Inviata'
                                      : isScheduled
                                      ? '⏱ In Programmazione'
                                      : isFailed
                                      ? '✕ Errore'
                                      : isPartial
                                      ? '⚠️ Parziale'
                                      : '✎ Bozza'}
                                  </span>
                                </div>

                                {/* Body Snippet */}
                                <p className="text-[11px] text-neutral-300 line-clamp-2 leading-relaxed bg-black/30 p-2 rounded-xl border border-white/[0.03]">
                                  {camp.bodyContent}
                                </p>

                                {/* KPI Metrics & Engagement Report Row */}
                                <div className="grid grid-cols-3 gap-1.5 py-1">
                                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col items-center justify-center text-center">
                                    <span className="text-[9px] text-neutral-400 uppercase font-mono">Consegna</span>
                                    <span className="text-xs font-bold font-mono text-teal-300">{deliveryRate}%</span>
                                  </div>
                                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col items-center justify-center text-center">
                                    <span className="text-[9px] text-neutral-400 uppercase font-mono">Open Rate</span>
                                    <span className="text-xs font-bold font-mono text-sky-300">
                                      {isSent ? `${estimatedOpenRate}%` : '—'}
                                    </span>
                                  </div>
                                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col items-center justify-center text-center">
                                    <span className="text-[9px] text-neutral-400 uppercase font-mono">Click Rate</span>
                                    <span className="text-xs font-bold font-mono text-purple-300">
                                      {isSent ? `${estimatedClickRate}%` : '—'}
                                    </span>
                                  </div>
                                </div>

                                {/* Footer: Recipients, Dates & Action Buttons */}
                                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[10px] text-neutral-400">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-neutral-300 font-medium">
                                      👥 {camp.recipientCount} destinatari
                                    </span>
                                    <span>•</span>
                                    <span className="font-mono text-neutral-400">
                                      {camp.sentAt
                                        ? `Inviata: ${new Date(camp.sentAt).toLocaleDateString('it-IT')}`
                                        : camp.scheduledFor
                                        ? `Scadenza: ${new Date(camp.scheduledFor).toLocaleString('it-IT')}`
                                        : `Creata: ${new Date(camp.createdAt).toLocaleDateString('it-IT')}`}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedNewsletterPreview(camp)}
                                      className="px-2 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 font-semibold transition-colors cursor-pointer"
                                      title="Visualizza anteprima e dettagli completi"
                                    >
                                      Dettagli
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateNewsletterToComposer(camp)}
                                      className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 transition-colors cursor-pointer"
                                      title="Copia testo nel composer per creare una nuova campagna"
                                    >
                                      Duplica
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteNewsletterCampaign(camp.id)}
                                      className="px-1.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                                      title="Elimina campagna dallo storico"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── MODAL: PREVIEW & INSPECTION CAMPAGNA NEWSLETTER ── */}
              {selectedNewsletterPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                  <div className="w-full max-w-xl bg-[#081410] border border-teal-500/30 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                      <div>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                          Report Dettagliato Newsletter
                        </span>
                        <h3 className="font-bold text-white text-base mt-1">
                          {selectedNewsletterPreview.subject}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedNewsletterPreview(null)}
                        className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white"
                      >
                        <TiaIcon icon={Cancel01Icon} size={18} />
                      </button>
                    </div>

                    {/* Preheader & Metadata */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06]">
                        <span className="text-[10px] text-neutral-400 block mb-0.5">Destinatari Target</span>
                        <span className="font-bold text-white font-mono">{selectedNewsletterPreview.recipients}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06]">
                        <span className="text-[10px] text-neutral-400 block mb-0.5">Totale Destinatari</span>
                        <span className="font-bold text-teal-300 font-mono">{selectedNewsletterPreview.recipientCount} email</span>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div>
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                        Testo & Contenuto Markdown
                      </span>
                      <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                        {selectedNewsletterPreview.bodyContent}
                      </div>
                    </div>

                    {/* Modal Footer Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => {
                          handleDuplicateNewsletterToComposer(selectedNewsletterPreview);
                          setSelectedNewsletterPreview(null);
                        }}
                        className="px-4 py-2 rounded-xl bg-teal-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-teal-400/20"
                      >
                        <span>Carica nel Composer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedNewsletterPreview(null)}
                        className="px-4 py-2 rounded-xl bg-white/[0.06] text-neutral-300 text-xs font-semibold hover:bg-white/[0.1]"
                      >
                        Chiudi
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: ARCHIVIO CHATBOT ── */}
          {activeTab === 'chats' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Leads Generated by Bot */}
              <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <TiaIcon icon={BubbleChatIcon} size={18} className="text-teal-400" />
                  <span>Lead & Preventivi AI Generati ({chatLeads.length})</span>
                </h3>
                {chatLeads.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-6 text-center">Nessun preventivo registrato dal bot finora.</p>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                    {chatLeads.map((lead) => (
                      <div key={lead.id} className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-teal-300">{lead.category} • {lead.service || 'Generale'}</span>
                          <span className="text-[10px] text-neutral-500">{new Date(lead.createdAt).toLocaleDateString()}</span>
                        </div>
                        {lead.budget && <p className="text-xs text-neutral-300">Budget indicato: <strong className="text-white">{lead.budget}</strong></p>}
                        {lead.userGoal && <p className="text-xs text-neutral-400">Obiettivo: {lead.userGoal}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat Sessions List */}
              <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-4">
                <h3 className="font-bold text-white text-base">Sessioni di Chat Recenti ({chatSessions.length})</h3>
                {chatSessions.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-6 text-center">Nessuna conversazione recente nel database.</p>
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto">
                    {chatSessions.map((s) => (
                      <div key={s.sessionId} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-neutral-400 truncate">ID: {s.sessionId.slice(0, 16)}...</p>
                          <p className="text-xs text-white truncate">{s.lastMessage}</p>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-teal-500/10 text-teal-400 text-[10px] font-mono shrink-0">
                          {s.count} msgs
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 4: PREVENTIVATORE BRANDED PDF ── */}
          {activeTab === 'quotes' && (
            <div className="flex flex-col gap-6">
              
              {/* Top Action Toolbar (no-print) */}
              <div className="no-print bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowQuotesHistory(!showQuotesHistory)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                      showQuotesHistory
                        ? 'bg-teal-400 text-black border-teal-300 shadow-md shadow-teal-400/20'
                        : 'bg-white/[0.04] text-white border-white/[0.08] hover:bg-white/[0.08]'
                    }`}
                  >
                    <TiaIcon icon={CodeFolderIcon} size={15} />
                    <span>Storico Preventivi ({savedQuotes.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveQuote}
                    disabled={isSavingQuote}
                    className="px-4 py-2.5 rounded-2xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <TiaIcon icon={CheckmarkCircle01Icon} size={15} />
                    <span>{isSavingQuote ? 'Salvataggio...' : 'Salva nel Database'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Preview Theme Switcher (no-print) */}
                  <div className="flex items-center rounded-2xl bg-white/[0.04] p-1 border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setQuotePreviewTheme('dark')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        quotePreviewTheme === 'dark'
                          ? 'bg-teal-400 text-black shadow-md shadow-teal-400/20'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Mostra anteprima in stile Dark (Cyber)"
                    >
                      <span>🌙</span>
                      <span>Dark</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuotePreviewTheme('light')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        quotePreviewTheme === 'light'
                          ? 'bg-white text-black shadow-md shadow-white/20'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Mostra anteprima in stile Documento Bianco A4 Ufficiale"
                    >
                      <span>📄</span>
                      <span>Bianco (A4)</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSignatureModal(true)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                      signatureData
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/[0.04] text-white border-white/[0.08] hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>✍️</span>
                    <span>{signatureData ? 'Firma Applicata ✅' : 'Firma a Mano (Canvas)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSendModal(true)}
                    className="px-4 py-2.5 rounded-2xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-400/20 transition-all cursor-pointer"
                  >
                    <TiaIcon icon={Mail01Icon} size={15} />
                    <span>Invia al Cliente via Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2.5 rounded-2xl bg-white/[0.08] hover:bg-teal-400 hover:text-black border border-white/[0.1] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
                    title="Genera e stampa il preventivo in formato A4 bianco ufficiale senza bordi o intestazioni inutili"
                  >
                    <span>🖨️ Stampa / Salva PDF (A4 Bianco)</span>
                  </button>
                </div>
              </div>

              {/* Saved Quotes History Drawer (no-print) */}
              {showQuotesHistory && (
                <div className="no-print bg-[#081410]/95 backdrop-blur-2xl border border-teal-500/30 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                    <div>
                      <h3 className="font-bold text-white text-base">Archivio Preventivi Salvati</h3>
                      <p className="text-xs text-neutral-400">Clicca su &ldquo;Carica&rdquo; per riaprire o modificare qualsiasi preventivo</p>
                    </div>
                    <button onClick={() => setShowQuotesHistory(false)} className="text-xs text-neutral-400 hover:text-white cursor-pointer">
                      Chiudi ✕
                    </button>
                  </div>

                  {savedQuotes.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-6 text-center">Nessun preventivo salvato nel database.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                      {savedQuotes.map((q) => (
                        <div key={q.id} className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col justify-between gap-3 hover:border-teal-500/40 transition-colors">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-teal-400">{q.quoteNumber}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold ${
                                q.status === 'sent'
                                  ? 'bg-blue-400/20 text-blue-300 border border-blue-400/40'
                                  : q.status === 'accepted'
                                    ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                                    : 'bg-neutral-800 text-neutral-400'
                              }`}>
                                {q.status}
                              </span>
                            </div>
                            <p className="font-bold text-white text-sm mt-1">{q.clientName}</p>
                            {q.clientCompany && <p className="text-xs text-neutral-400">{q.clientCompany}</p>}
                            <p className="text-xs text-teal-300/80 font-mono mt-1">Totale: <strong>{q.total} €</strong></p>
                            <p className="text-[10px] text-neutral-500 mt-1">Data: {q.date}</p>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                            <button
                              type="button"
                              onClick={() => handleLoadQuote(q)}
                              className="flex-1 py-1.5 rounded-xl bg-teal-400/20 hover:bg-teal-400/30 text-teal-300 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Carica
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedQuote(q.id)}
                              className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Elimina
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Main Builder & Preview Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* Form Controls Column (no-print) */}
                <div className="xl:col-span-5 flex flex-col gap-4 no-print">
                  <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                      <h3 className="font-bold text-white text-base flex items-center gap-2">
                        <TiaIcon icon={DollarSignIcon} size={18} className="text-teal-400" />
                        <span>Parametri Preventivo</span>
                      </h3>
                      <span className="text-[11px] font-mono text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                        Brand Custom
                      </span>
                    </div>

                    {/* Document info */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">N. Preventivo</label>
                        <input
                          type="text"
                          value={quoteNumber}
                          onChange={(e) => setQuoteNumber(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-teal-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Data Emissione</label>
                        <input
                          type="date"
                          value={quoteDate}
                          onChange={(e) => setQuoteDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-teal-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Validità</label>
                        <input
                          type="text"
                          value={quoteValidity}
                          onChange={(e) => setQuoteValidity(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-teal-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Tempi Consegna</label>
                        <input
                          type="text"
                          value={quoteTimeline}
                          onChange={(e) => setQuoteTimeline(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-teal-400"
                        />
                      </div>
                    </div>

                    {/* Client Info */}
                    <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2.5">
                      <p className="text-xs font-semibold text-teal-300 uppercase tracking-wider">Dati Cliente</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">Nome Referente *</label>
                          <input
                            type="text"
                            value={quoteClientName}
                            onChange={(e) => setQuoteClientName(e.target.value)}
                            placeholder="Mario Rossi"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">Ragione Sociale / Azienda</label>
                          <input
                            type="text"
                            value={quoteClientCompany}
                            onChange={(e) => setQuoteClientCompany(e.target.value)}
                            placeholder="Azienda S.r.l."
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">Email Cliente *</label>
                          <input
                            type="email"
                            value={quoteClientEmail}
                            onChange={(e) => setQuoteClientEmail(e.target.value)}
                            placeholder="cliente@email.com"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">Telefono</label>
                          <input
                            type="text"
                            value={quoteClientPhone}
                            onChange={(e) => setQuoteClientPhone(e.target.value)}
                            placeholder="+39 340..."
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">Indirizzo & Città</label>
                          <input
                            type="text"
                            value={quoteClientAddress}
                            onChange={(e) => setQuoteClientAddress(e.target.value)}
                            placeholder="Via Roma 1, Milano"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">P.IVA / Cod. Fiscale</label>
                          <input
                            type="text"
                            value={quoteClientVat}
                            onChange={(e) => setQuoteClientVat(e.target.value)}
                            placeholder="IT12345678901"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Items list manager */}
                    <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-teal-300 uppercase tracking-wider">Voci di Servizio ({quoteItems.length})</p>
                        <button
                          type="button"
                          onClick={handleAddQuoteItem}
                          className="text-xs font-bold text-teal-400 hover:text-teal-300 cursor-pointer"
                        >
                          + Aggiungi Voce
                        </button>
                      </div>

                      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                        {quoteItems.map((item, index) => (
                          <div key={item.id} className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => handleUpdateQuoteItem(item.id, 'title', e.target.value)}
                                placeholder="Nome voce"
                                className="flex-1 font-semibold text-xs text-white bg-transparent border-b border-white/[0.1] focus:outline-none focus:border-teal-400 py-0.5"
                              />
                              {quoteItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQuoteItem(item.id)}
                                  className="text-neutral-500 hover:text-red-400 text-xs px-1 cursor-pointer"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            <textarea
                              rows={1}
                              value={item.description}
                              onChange={(e) => handleUpdateQuoteItem(item.id, 'description', e.target.value)}
                              placeholder="Dettagli e deliverables inclusi..."
                              className="w-full text-[11px] text-neutral-300 bg-transparent resize-none border-b border-white/[0.05] focus:outline-none py-0.5"
                            />
                            <div className="grid grid-cols-2 gap-2 items-center">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-neutral-400">Q.tà:</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateQuoteItem(item.id, 'quantity', Number(e.target.value))}
                                  className="w-12 px-1.5 py-0.5 rounded bg-white/[0.05] text-xs text-white text-center border border-white/[0.08]"
                                />
                              </div>
                              <div className="flex items-center gap-1.5 justify-end">
                                <span className="text-[10px] text-neutral-400">Prezzo (€):</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={item.price}
                                  onChange={(e) => handleUpdateQuoteItem(item.id, 'price', Number(e.target.value))}
                                  className="w-20 px-1.5 py-0.5 rounded bg-white/[0.05] text-xs text-white text-right border border-white/[0.08]"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial terms */}
                    <div className="pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">Sconto Promo (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={quoteDiscount}
                          onChange={(e) => setQuoteDiscount(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">Regime Fiscale</label>
                        <select
                          value={quoteTaxRegime}
                          onChange={(e) => setQuoteTaxRegime(e.target.value as 'forfettario' | 'iva22')}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-black border border-white/[0.08] text-xs text-white"
                        >
                          <option value="forfettario">Forfettario (Esente IVA)</option>
                          <option value="iva22">IVA Ordinaria (22%)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Termini di Pagamento</label>
                      <input
                        type="text"
                        value={quotePaymentTerms}
                        onChange={(e) => setQuotePaymentTerms(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">IBAN per Bonifico</label>
                      <input
                        type="text"
                        value={quoteIban}
                        onChange={(e) => setQuoteIban(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Note & Garanzie</label>
                      <textarea
                        rows={2}
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Printable Live PDF Document Column */}
                <div className="xl:col-span-7 flex flex-col items-center w-full">
                  <div
                    id="printable-quote"
                    className={`w-full max-w-[780px] rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-300 ${
                      quotePreviewTheme === 'light'
                        ? 'bg-white text-slate-900 border border-slate-200 shadow-xl'
                        : 'bg-[#081410] text-neutral-200 border border-teal-500/25'
                    }`}
                  >
                    {/* Subtle top glow bar */}
                    <div className="quote-top-bar absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-300" />

                    {/* Header Row: Logo + Brand Info + Quote Meta */}
                    <div className={`quote-divider flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b ${
                      quotePreviewTheme === 'light' ? 'border-slate-200' : 'border-white/[0.1]'
                    }`}>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <picture>
                            <source srcSet="/TiaDesignsLogo.avif" type="image/avif" />
                            <source srcSet="/TiaDesignsLogo.webp" type="image/webp" />
                            <img
                              src="/TiaDesignsLogo.png"
                              alt="Tia Designs"
                              className={`quote-logo h-10 w-auto select-none transition-all ${
                                quotePreviewTheme === 'light' ? 'brightness-0' : 'brightness-0 invert'
                              }`}
                              draggable={false}
                            />
                          </picture>
                        </div>
                        <p className={`quote-brand-title text-xs font-semibold tracking-wider uppercase mt-1 ${
                          quotePreviewTheme === 'light' ? 'text-teal-700' : 'text-teal-400'
                        }`}>
                          Design • Sviluppo Web • Video
                        </p>
                        <div className={`quote-text-muted text-[11px] leading-tight space-y-0.5 ${
                          quotePreviewTheme === 'light' ? 'text-slate-600' : 'text-neutral-400'
                        }`}>
                          <p className="quote-text-primary font-bold">Tia Chinaglia</p>
                          <p>Email: <span className="quote-text-primary">info@tiadesigns.it</span></p>
                          <p>Web: <span className="quote-text-primary">tiadesigns.it</span></p>
                          <p>Tel: <span className="quote-text-primary">+39 331 882 1334</span></p>
                          <p>Sede: <span className="quote-text-primary">Mantova (MN), Italia</span></p>
                        </div>
                      </div>

                      {/* Quote Meta Badge */}
                      <div className={`quote-card-subtle flex flex-col sm:items-end gap-1.5 p-4 rounded-2xl sm:min-w-[220px] ${
                        quotePreviewTheme === 'light'
                          ? 'bg-slate-50 border border-slate-200'
                          : 'bg-black/40 border border-white/[0.08]'
                      }`}>
                        <span className={`quote-badge-commercial text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-full border ${
                          quotePreviewTheme === 'light'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                        }`}>
                          Preventivo Commerciale
                        </span>
                        <p className={`quote-text-primary text-lg font-bold font-mono mt-1 ${
                          quotePreviewTheme === 'light' ? 'text-slate-900' : 'text-white'
                        }`}>{quoteNumber}</p>
                        <p className={`quote-text-muted text-[11px] ${quotePreviewTheme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                          Data: <strong className="quote-text-primary">{quoteDate}</strong>
                        </p>
                        <p className={`quote-text-muted text-[11px] ${quotePreviewTheme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                          Validità: <strong className="quote-text-primary">{quoteValidity}</strong>
                        </p>
                        <p className={`quote-text-muted text-[11px] ${quotePreviewTheme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                          Consegna stimata: <strong className={`quote-accent font-bold ${
                            quotePreviewTheme === 'light' ? 'text-teal-700' : 'text-teal-300'
                          }`}>{quoteTimeline}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Client Details Block */}
                    <div className={`quote-divider py-5 border-b grid grid-cols-1 sm:grid-cols-2 gap-4 ${
                      quotePreviewTheme === 'light' ? 'border-slate-200' : 'border-white/[0.1]'
                    }`}>
                      <div>
                        <p className={`quote-brand-title text-[10px] uppercase tracking-widest font-bold mb-1 ${
                          quotePreviewTheme === 'light' ? 'text-teal-700' : 'text-teal-400'
                        }`}>Destinatario / Spett.le</p>
                        <p className={`quote-text-primary text-sm font-bold ${
                          quotePreviewTheme === 'light' ? 'text-slate-900' : 'text-white'
                        }`}>{quoteClientName || 'Mario Rossi'}</p>
                        {quoteClientCompany && (
                          <p className={`quote-text-secondary text-xs font-semibold ${
                            quotePreviewTheme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                          }`}>{quoteClientCompany}</p>
                        )}
                        {quoteClientAddress && (
                          <p className={`quote-text-muted text-xs ${
                            quotePreviewTheme === 'light' ? 'text-slate-600' : 'text-neutral-400'
                          }`}>{quoteClientAddress}</p>
                        )}
                      </div>
                      <div className={`sm:text-right flex flex-col sm:items-end justify-center text-xs ${
                        quotePreviewTheme === 'light' ? 'text-slate-600' : 'text-neutral-400'
                      }`}>
                        {quoteClientEmail && <p>Email: <strong className="quote-text-primary">{quoteClientEmail}</strong></p>}
                        {quoteClientPhone && <p>Tel: <strong className="quote-text-primary">{quoteClientPhone}</strong></p>}
                        {quoteClientVat && <p>P.IVA / CF: <strong className="quote-text-primary font-mono">{quoteClientVat}</strong></p>}
                      </div>
                    </div>

                    {/* Itemized Deliverables Table */}
                    <div className="py-6">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                            quotePreviewTheme === 'light'
                              ? 'border-teal-600 text-teal-700'
                              : 'border-white/[0.1] text-teal-400'
                          }`}>
                            <th className="py-2.5 px-2 w-8">#</th>
                            <th className="py-2.5 px-2">Descrizione Servizio & Deliverables</th>
                            <th className="py-2.5 px-2 text-center w-14">Q.tà</th>
                            <th className="py-2.5 px-2 text-right w-24">Prezzo Unit.</th>
                            <th className="py-2.5 px-2 text-right w-24">Totale</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y text-xs ${
                          quotePreviewTheme === 'light' ? 'divide-slate-100' : 'divide-white/[0.05]'
                        }`}>
                          {quoteItems.map((item, idx) => {
                            const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                            return (
                              <tr key={item.id} className={quotePreviewTheme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]'}>
                                <td className={`quote-text-muted py-3 px-2 font-mono ${
                                  quotePreviewTheme === 'light' ? 'text-slate-500' : 'text-neutral-500'
                                }`}>{idx + 1}</td>
                                <td className="py-3 px-2">
                                  <p className={`quote-text-primary font-bold text-xs ${
                                    quotePreviewTheme === 'light' ? 'text-slate-900' : 'text-white'
                                  }`}>{item.title}</p>
                                  {item.description && (
                                    <p className={`quote-text-muted text-[11px] mt-0.5 leading-relaxed ${
                                      quotePreviewTheme === 'light' ? 'text-slate-600' : 'text-neutral-400'
                                    }`}>{item.description}</p>
                                  )}
                                </td>
                                <td className={`quote-text-secondary py-3 px-2 text-center font-mono ${
                                  quotePreviewTheme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                                }`}>{item.quantity}</td>
                                <td className={`quote-text-secondary py-3 px-2 text-right font-mono ${
                                  quotePreviewTheme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                                }`}>{item.price} €</td>
                                <td className={`quote-accent py-3 px-2 text-right font-mono font-bold ${
                                  quotePreviewTheme === 'light' ? 'text-teal-700' : 'text-teal-300'
                                }`}>{lineTotal} €</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary & Totals Calculation Box */}
                    {(() => {
                      const subtotal = quoteItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
                      const discountAmount = quoteDiscount > 0 ? Math.round((subtotal * quoteDiscount) / 100) : 0;
                      const taxable = subtotal - discountAmount;
                      const vatAmount = quoteTaxRegime === 'iva22' ? Math.round(taxable * 0.22) : 0;
                      const total = taxable + vatAmount;

                      return (
                        <div className={`quote-divider pt-4 border-t flex flex-col sm:flex-row justify-between items-start gap-6 ${
                          quotePreviewTheme === 'light' ? 'border-slate-200' : 'border-white/[0.1]'
                        }`}>
                          {/* Terms and IBAN */}
                          <div className={`quote-card-subtle flex-1 text-xs space-y-1.5 p-4 rounded-2xl w-full ${
                            quotePreviewTheme === 'light'
                              ? 'bg-slate-50 border border-slate-200 text-slate-600'
                              : 'bg-black/30 border border-white/[0.06] text-neutral-400'
                          }`}>
                            <p className={`quote-brand-title text-[10px] uppercase tracking-wider font-bold ${
                              quotePreviewTheme === 'light' ? 'text-teal-700' : 'text-teal-400'
                            }`}>Modalità di Pagamento</p>
                            <p className={`quote-text-primary font-medium ${
                              quotePreviewTheme === 'light' ? 'text-slate-900' : 'text-neutral-200'
                            }`}>{quotePaymentTerms}</p>
                            <p className="text-[11px] pt-1">
                              IBAN: <span className={`quote-accent font-mono font-bold ${
                                quotePreviewTheme === 'light' ? 'text-teal-700' : 'text-teal-300'
                              }`}>{quoteIban}</span>
                            </p>
                            <p className={`quote-text-muted text-[10px] italic pt-1 ${
                              quotePreviewTheme === 'light' ? 'text-slate-500' : 'text-neutral-500'
                            }`}>
                              {quoteTaxRegime === 'forfettario'
                                ? 'Operazione effettuata in regime forfettario ex art. 1 c. 54-89 L. 190/2014 (esente IVA).'
                                : 'Importi espressi al netto di IVA ordinaria 22%.'}
                            </p>
                          </div>

                          {/* Totals table */}
                          <div className={`quote-card-total w-full sm:w-64 p-4 rounded-2xl flex flex-col gap-2 ${
                            quotePreviewTheme === 'light'
                              ? 'bg-emerald-50/70 border border-emerald-200'
                              : 'bg-teal-950/30 border border-teal-500/30'
                          }`}>
                            <div className={`flex justify-between text-xs ${
                              quotePreviewTheme === 'light' ? 'text-slate-600' : 'text-neutral-400'
                            }`}>
                              <span>Subtotale Voci:</span>
                              <span className={`quote-text-primary font-mono ${
                                quotePreviewTheme === 'light' ? 'text-slate-900' : 'text-white'
                              }`}>{subtotal} €</span>
                            </div>
                            {quoteDiscount > 0 && (
                              <div className={`flex justify-between text-xs font-semibold ${
                                quotePreviewTheme === 'light' ? 'text-teal-700' : 'text-teal-300'
                              }`}>
                                <span>Sconto ({quoteDiscount}%):</span>
                                <span className="font-mono">- {discountAmount} €</span>
                              </div>
                            )}
                            {quoteTaxRegime === 'iva22' && (
                              <div className={`flex justify-between text-xs ${
                                quotePreviewTheme === 'light' ? 'text-slate-600' : 'text-neutral-400'
                              }`}>
                                <span>IVA (22%):</span>
                                <span className={`quote-text-primary font-mono ${
                                  quotePreviewTheme === 'light' ? 'text-slate-900' : 'text-white'
                                }`}>{vatAmount} €</span>
                              </div>
                            )}
                            <div className={`quote-divider pt-2 border-t flex justify-between items-baseline ${
                              quotePreviewTheme === 'light' ? 'border-emerald-200' : 'border-teal-500/30'
                            }`}>
                              <span className={`quote-text-primary text-sm font-bold uppercase ${
                                quotePreviewTheme === 'light' ? 'text-slate-900' : 'text-white'
                              }`}>Totale:</span>
                              <span className={`quote-total-price text-2xl font-bold font-mono tracking-tight ${
                                quotePreviewTheme === 'light' ? 'text-teal-700' : 'text-teal-400'
                              }`}>{total} €</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Notes & Acceptance Guarantee */}
                    {quoteNotes && (
                      <div className={`quote-card-subtle mt-6 p-4 rounded-2xl text-xs leading-relaxed ${
                        quotePreviewTheme === 'light'
                          ? 'bg-slate-50 border border-slate-200 text-slate-700'
                          : 'bg-black/40 border border-white/[0.06] text-neutral-300'
                      }`}>
                        <p className={`quote-brand-title text-[10px] uppercase font-bold tracking-wider mb-1 ${
                          quotePreviewTheme === 'light' ? 'text-teal-700' : 'text-teal-400'
                        }`}>Note & Condizioni di Assistenza</p>
                        <p>{quoteNotes}</p>
                      </div>
                    )}

                    {/* Signature Acceptance Box with Real Digital Signature Render */}
                    <div className={`quote-divider mt-8 pt-6 border-t grid grid-cols-2 gap-8 text-xs ${
                      quotePreviewTheme === 'light' ? 'border-slate-200' : 'border-white/[0.1]'
                    }`}>
                      <div>
                        <p className={`quote-text-muted mb-2 ${
                          quotePreviewTheme === 'light' ? 'text-slate-600' : 'text-neutral-400'
                        }`}>Tia Designs (Fornitore)</p>
                        <div className={`quote-sig-line border-b pb-1 min-h-[44px] flex items-center justify-between ${
                          quotePreviewTheme === 'light' ? 'border-slate-300' : 'border-white/[0.2]'
                        }`}>
                          {signatureData ? (
                            <img src={signatureData} alt="Firma Digitale" className="h-10 w-auto object-contain" />
                          ) : (
                            <span className={`quote-accent font-serif italic text-sm ${
                              quotePreviewTheme === 'light' ? 'text-teal-700' : 'text-teal-300'
                            }`}>Tia Chinaglia</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowSignatureModal(true)}
                            className={`no-print text-[10px] font-sans cursor-pointer underline ${
                              quotePreviewTheme === 'light' ? 'text-teal-700 hover:text-teal-800' : 'text-teal-400 hover:text-teal-300'
                            }`}
                          >
                            {signatureData ? 'Modifica' : '✍️ Firma a mano'}
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className={`quote-text-muted mb-2 ${
                          quotePreviewTheme === 'light' ? 'text-slate-600' : 'text-neutral-400'
                        }`}>Firma e Timbro per Accettazione (Cliente)</p>
                        <div className={`quote-sig-line border-b pb-1 min-h-[44px] flex items-end ${
                          quotePreviewTheme === 'light' ? 'border-slate-300 text-slate-400' : 'border-white/[0.2] text-neutral-600'
                        }`}>
                          Data: ______ / ______ / 2026
                        </div>
                      </div>
                    </div>

                    {/* Bottom footer notice */}
                    <div className={`quote-divider mt-8 text-center text-[10px] font-mono border-t pt-3 ${
                      quotePreviewTheme === 'light' ? 'border-slate-200 text-slate-400' : 'border-white/[0.06] text-neutral-500'
                    }`}>
                      Tia Designs • P.IVA: 02737630206 • Documento valido ai fini dell&apos;accordo commerciale
                    </div>
                  </div>
                </div>

              </div>

              {/* ── MODAL 1: Digital Signature Touch Canvas ── */}
              {showSignatureModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                  <div className="bg-[#081410] border border-teal-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">✍️</span>
                        <h3 className="font-bold text-white text-base">Firma Digitale Interattiva</h3>
                      </div>
                      <button onClick={() => setShowSignatureModal(false)} className="text-neutral-400 hover:text-white cursor-pointer">✕</button>
                    </div>

                    <p className="text-xs text-neutral-300">
                      Disegna la tua firma a mano libera usando il touch, una penna digitale o il mouse nel riquadro sottostante:
                    </p>

                    <div className="rounded-2xl border-2 border-dashed border-teal-500/40 bg-black/60 p-2 overflow-hidden flex items-center justify-center">
                      <canvas
                        ref={canvasRef}
                        width={440}
                        height={180}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="cursor-crosshair w-full h-[180px] touch-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 transition-colors cursor-pointer"
                      >
                        Pulisci Canvas
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowSignatureModal(false)}
                          className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs text-neutral-400 hover:text-white cursor-pointer"
                        >
                          Annulla
                        </button>
                        <button
                          type="button"
                          onClick={applySignature}
                          className="px-5 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-bold shadow-lg shadow-teal-400/25 transition-all cursor-pointer"
                        >
                          Applica Firma
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── MODAL 2: Send Quote Email to Client & Tia ── */}
              {showSendModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                  <div className="bg-[#081410] border border-teal-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <TiaIcon icon={Mail01Icon} size={18} className="text-teal-400" />
                        <h3 className="font-bold text-white text-base">Invia Preventivo via Email</h3>
                      </div>
                      <button onClick={() => setShowSendModal(false)} className="text-neutral-400 hover:text-white cursor-pointer">✕</button>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] text-xs flex flex-col gap-1.5">
                      <p className="text-neutral-400">Destinatario:</p>
                      <p className="font-bold text-white text-sm">{quoteClientName} &lt;{quoteClientEmail}&gt;</p>
                      <p className="text-[11px] text-teal-300 font-mono mt-1">Preventivo: {quoteNumber} • Totale: {(() => {
                        const subtotal = quoteItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
                        const discountAmount = quoteDiscount > 0 ? Math.round((subtotal * quoteDiscount) / 100) : 0;
                        const taxable = subtotal - discountAmount;
                        const vatAmount = quoteTaxRegime === 'iva22' ? Math.round(taxable * 0.22) : 0;
                        return taxable + vatAmount;
                      })()} €</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-teal-300 mb-1">
                        Messaggio di Presentazione Personalizzato
                      </label>
                      <textarea
                        rows={4}
                        value={customEmailNote}
                        onChange={(e) => setCustomEmailNote(e.target.value)}
                        placeholder="Scrivi una breve introduzione personalizzata per il cliente..."
                        className="w-full p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-white resize-none focus:outline-none focus:border-teal-400"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-500/20 text-[11px] text-teal-300/90 leading-relaxed">
                      ℹ️ Verrà inviata un&apos;email brandizzata con il riepilogo dettagliato al cliente e una <strong>notifica di conferma immediata</strong> alla tua casella <strong>info@tiadesigns.it</strong>.
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowSendModal(false)}
                        className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs text-neutral-400 hover:text-white cursor-pointer"
                      >
                        Annulla
                      </button>
                      <button
                        type="button"
                        onClick={handleSendQuoteEmail}
                        disabled={isSendingEmail}
                        className="px-5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-bold shadow-lg shadow-teal-400/25 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSendingEmail ? 'Invio in corso...' : 'Conferma e Invia Email'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── TAB 5: DEEP ANALYTICS ── */}
          {activeTab === 'analytics' && (
            <DeepAnalyticsView />
          )}

          {/* ── TAB 6: CMS CONTENUTI ── */}
          {activeTab === 'cms' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* FAQ Manager */}
              <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-4">
                <h3 className="font-bold text-white text-base">Editor FAQ ({faqs.length})</h3>
                
                <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col gap-3">
                  <p className="text-xs font-semibold text-teal-300">Aggiungi nuova FAQ</p>
                  <input
                    type="text"
                    value={newFaqQ}
                    onChange={(e) => setNewFaqQ(e.target.value)}
                    placeholder="Domanda (es. Quanto costa un sito?)"
                    className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none"
                  />
                  <textarea
                    rows={2}
                    value={newFaqA}
                    onChange={(e) => setNewFaqA(e.target.value)}
                    placeholder="Risposta dettagliata..."
                    className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white resize-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateFaq}
                    className="py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Salva FAQ
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                  {faqs.map((f) => (
                    <div key={f.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-white">{f.questionIt}</p>
                        <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">{f.answerIt}</p>
                      </div>
                      <button onClick={() => handleDeleteFaq(f.id)} className="text-red-400 hover:text-red-300 text-xs shrink-0 cursor-pointer">
                        Elimina
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews Manager */}
              <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-4">
                <h3 className="font-bold text-white text-base">Recensioni Clienti ({reviews.length})</h3>
                
                <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col gap-3">
                  <p className="text-xs font-semibold text-teal-300">Aggiungi nuova Recensione</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newReviewAuthor}
                      onChange={(e) => setNewReviewAuthor(e.target.value)}
                      placeholder="Nome Cliente"
                      className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white"
                    />
                    <input
                      type="text"
                      value={newReviewRole}
                      onChange={(e) => setNewReviewRole(e.target.value)}
                      placeholder="Ruolo / Azienda"
                      className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={newReviewQuote}
                    onChange={(e) => setNewReviewQuote(e.target.value)}
                    placeholder="Testo della recensione..."
                    className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white resize-none"
                  />
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Logo Azienda (WebP)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newReviewAvatarUrl}
                        onChange={(e) => setNewReviewAvatarUrl(e.target.value)}
                        placeholder="/uploads/logo.webp o URL"
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => reviewLogoInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 text-xs font-semibold cursor-pointer shrink-0"
                      >
                        Upload
                      </button>
                    </div>
                    <input type="file" ref={reviewLogoInputRef} onChange={handleReviewLogoUpload} accept="image/*" className="hidden" />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newReviewAuthor || !newReviewRole || !newReviewQuote) return;
                      await fetch('/api/master/reviews', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          author: newReviewAuthor,
                          role: newReviewRole,
                          quoteIt: newReviewQuote,
                          avatarUrl: newReviewAvatarUrl || null,
                        }),
                      });
                      setNewReviewAuthor('');
                      setNewReviewRole('');
                      setNewReviewQuote('');
                      setNewReviewAvatarUrl('');
                      fetchCms();
                      showTemporarySuccess('Recensione aggiunta!');
                    }}
                    className="py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Salva Recensione
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                  {reviews.map((r) => (
                    <div key={r.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-white">{r.author} <span className="text-neutral-400 font-normal">({r.role})</span></p>
                        <p className="text-[11px] text-neutral-300 italic mt-1 line-clamp-2">&ldquo;{r.quoteIt}&rdquo;</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm('Eliminare recensione?')) return;
                          await fetch(`/api/master/reviews?id=${r.id}`, { method: 'DELETE' });
                          fetchCms();
                          showTemporarySuccess('Recensione eliminata.');
                        }}
                        className="text-red-400 hover:text-red-300 text-xs shrink-0 cursor-pointer"
                      >
                        Elimina
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 7: SYSTEM HEALTH ── */}
          {activeTab === 'health' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-[#081410]/85 border border-white/[0.08] flex flex-col gap-2">
                  <span className="text-xs text-neutral-400 uppercase tracking-wider">Database Status</span>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-teal-400 animate-pulse" />
                    <span className="text-lg font-bold text-white capitalize">{systemHealth?.database?.status || 'Online'}</span>
                  </div>
                  <span className="text-xs text-neutral-500 font-mono">Latenza: {systemHealth?.database?.latencyMs ?? 1} ms</span>
                </div>

                <div className="p-5 rounded-3xl bg-[#081410]/85 border border-white/[0.08] flex flex-col gap-2">
                  <span className="text-xs text-neutral-400 uppercase tracking-wider">Email Delivery</span>
                  <span className="text-lg font-bold text-white">Resend API</span>
                  <span className="text-xs text-teal-400 font-mono">{systemHealth?.services?.email?.resend === 'configured' ? 'Configurato ✅' : 'Pronto (SMTP / Direct)'}</span>
                </div>

                <div className="p-5 rounded-3xl bg-[#081410]/85 border border-white/[0.08] flex flex-col gap-2">
                  <span className="text-xs text-neutral-400 uppercase tracking-wider">Eventi Tracciati</span>
                  <span className="text-lg font-bold text-white">{systemHealth?.counts?.analyticsEvents ?? 0}</span>
                  <span className="text-xs text-neutral-500 font-mono">First-party analytics</span>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08]">
                <h3 className="font-bold text-white text-sm mb-3">Audit Logs & Error Tracker</h3>
                <div className="bg-black/60 rounded-2xl p-4 font-mono text-xs text-neutral-300 max-h-60 overflow-y-auto">
                  <p className="text-neutral-500">// Nessun errore critico rilevato. Tutte le pipeline sono operative.</p>
                  <p className="text-teal-400/80 mt-1">[System] Passkey biometric module initialized.</p>
                  <p className="text-teal-400/80">[System] Database Turso connection healthy.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 8: PASSKEY & SICUREZZA ── */}
          {activeTab === 'passkeys' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Passkeys List */}
              <div className="lg:col-span-2 bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div>
                    <h3 className="font-bold text-white text-base">Dispositivi Passkey Attivi ({passkeys.length})</h3>
                    <p className="text-xs text-neutral-400">Autenticatori biometrici abilitati all&apos;accesso master</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegisterNewPasskey}
                    className="px-3.5 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-semibold shadow-md shadow-teal-400/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    + Aggiungi Questo Dispositivo
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {passkeys.map((p) => (
                    <div key={p.id} className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                          <TiaIcon icon={CpuIcon} size={18} />
                        </div>
                        <div>
                          {editingPasskeyId === p.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={passkeyNickname}
                                onChange={(e) => setPasskeyNickname(e.target.value)}
                                placeholder="Nome dispositivo (es. MacBook Pro)"
                                className="px-2 py-1 rounded bg-black border border-teal-400 text-xs text-white"
                              />
                              <button onClick={() => handleSavePasskeyNickname(p.id)} className="text-xs text-teal-400 cursor-pointer">Salva</button>
                              <button onClick={() => setEditingPasskeyId(null)} className="text-xs text-neutral-400 cursor-pointer">Annulla</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-sm">{p.nickname || p.credentialDeviceType || 'Dispositivo Passkey'}</p>
                              <button onClick={() => { setEditingPasskeyId(p.id); setPasskeyNickname(p.nickname || ''); }} className="text-neutral-500 hover:text-teal-400 text-xs cursor-pointer">
                                ✏️
                              </button>
                            </div>
                          )}
                          <p className="text-[11px] text-neutral-500 font-mono">ID: {p.credentialID.slice(0, 18)}... • Creata: {new Date(p.createdAt).toLocaleDateString('it-IT')}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeletePasskey(p.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-xs text-red-300 font-medium transition-colors cursor-pointer"
                      >
                        Revoca
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Recovery Codes */}
              <div className="lg:col-span-1 bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <span>Codici di Emergenza</span>
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Genera 5 codici di recupero monouso da conservare in un posto sicuro per accedere in caso di smarrimento del dispositivo biometrico.
                </p>

                <button
                  type="button"
                  onClick={handleGenerateRecoveryCodes}
                  disabled={isGeneratingCodes}
                  className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  {isGeneratingCodes ? 'Generazione...' : 'Genera Nuovi Codici di Recupero'}
                </button>

                {recoveryCodes && (
                  <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-500/40 flex flex-col gap-2">
                    <p className="text-[11px] font-bold text-teal-300">Copia e conserva questi codici:</p>
                    <div className="flex flex-col gap-1 font-mono text-xs text-white">
                      {recoveryCodes.map((c, i) => (
                        <div key={i} className="p-1.5 bg-black/60 rounded border border-white/10 text-center select-all">
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* ── MODAL: INTEGRATED PDF DOCUMENT VIEWER ── */}
        {selectedProjectPdfModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-lg animate-in fade-in duration-200">
            <div className="bg-[#081410] border border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.2)] rounded-3xl p-5 max-w-5xl w-full h-[90vh] flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-lg">
                    📄
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Visualizzatore PDF Integrato</h3>
                    <p className="text-xs text-neutral-400 font-mono truncate max-w-md">{selectedProjectPdfModal}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={selectedProjectPdfModal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <TiaIcon icon={Download01Icon} size={14} />
                    <span>Scarica PDF</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedProjectPdfModal(null)}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white cursor-pointer transition-colors"
                  >
                    <TiaIcon icon={Cancel01Icon} size={18} />
                  </button>
                </div>
              </div>

              {/* PDF Document Container */}
              <div className="flex-1 w-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 relative">
                <iframe
                  src={selectedProjectPdfModal}
                  title="PDF Viewer"
                  className="w-full h-full border-0 rounded-2xl bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: PROJECT CAROUSEL / GALLERY LIGHTBOX ── */}
        {selectedProjectGalleryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-lg animate-in fade-in duration-200">
            <div className="bg-[#081410] border border-teal-500/30 shadow-[0_0_50px_rgba(45,212,191,0.2)] rounded-3xl p-5 max-w-4xl w-full flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 text-lg">
                    🖼️
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{selectedProjectGalleryModal.title}</h3>
                    <p className="text-xs text-neutral-400">
                      Immagine {selectedProjectGalleryModal.activeIdx + 1} di {selectedProjectGalleryModal.images.length}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const curUrl = selectedProjectGalleryModal.images[selectedProjectGalleryModal.activeIdx];
                      if (curUrl) {
                        navigator.clipboard.writeText(`${window.location.origin}${curUrl}`);
                        showTemporarySuccess('URL immagine copiato!');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>🔗</span>
                    <span>Copia URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProjectGalleryModal(null)}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white cursor-pointer transition-colors"
                  >
                    <TiaIcon icon={Cancel01Icon} size={18} />
                  </button>
                </div>
              </div>

              {/* Carousel Main Image */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/80 border border-white/10 flex items-center justify-center">
                <img
                  src={selectedProjectGalleryModal.images[selectedProjectGalleryModal.activeIdx]}
                  alt={`${selectedProjectGalleryModal.title} Slide ${selectedProjectGalleryModal.activeIdx + 1}`}
                  className="w-full h-full object-contain"
                />

                {/* Left / Right Buttons */}
                {selectedProjectGalleryModal.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedProjectGalleryModal((prev) =>
                          prev
                            ? {
                                ...prev,
                                activeIdx:
                                  (prev.activeIdx - 1 + prev.images.length) % prev.images.length,
                              }
                            : null
                        )
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-black/70 hover:bg-teal-500 text-white hover:text-black font-bold transition-all cursor-pointer shadow-xl backdrop-blur-md"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedProjectGalleryModal((prev) =>
                          prev
                            ? {
                                ...prev,
                                activeIdx: (prev.activeIdx + 1) % prev.images.length,
                              }
                            : null
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-black/70 hover:bg-teal-500 text-white hover:text-black font-bold transition-all cursor-pointer shadow-xl backdrop-blur-md"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails Navigation Strip */}
              {selectedProjectGalleryModal.images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                  {selectedProjectGalleryModal.images.map((imgUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setSelectedProjectGalleryModal((prev) => (prev ? { ...prev, activeIdx: i } : null))
                      }
                      className={`relative w-16 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                        i === selectedProjectGalleryModal.activeIdx
                          ? 'border-teal-400 scale-105 shadow-md shadow-teal-400/30'
                          : 'border-white/10 opacity-50 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODAL: MEDIA IMAGE PREVIEW LIGHTBOX ── */}
        {selectedMediaPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-lg animate-in fade-in duration-200">
            <div className="bg-[#081410] border border-teal-500/30 shadow-[0_0_50px_rgba(45,212,191,0.2)] rounded-3xl p-5 max-w-3xl w-full flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div>
                  <h3 className="font-bold text-white text-base truncate">{selectedMediaPreview.filename}</h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    📁 /{selectedMediaPreview.folder} • {(selectedMediaPreview.size / 1024).toFixed(0)} KB • {selectedMediaPreview.ext}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}${selectedMediaPreview.url}`);
                      showTemporarySuccess('URL copiato negli appunti!');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>🔗</span>
                    <span>Copia URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMediaPreview(null)}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white cursor-pointer transition-colors"
                  >
                    <TiaIcon icon={Cancel01Icon} size={18} />
                  </button>
                </div>
              </div>

              {/* Main Image */}
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black/80 border border-white/10 flex items-center justify-center">
                <img
                  src={selectedMediaPreview.url}
                  alt={selectedMediaPreview.filename}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        )}

        </main>

      </div>
    </div>
  );
}
