'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { startRegistration } from '@simplewebauthn/browser';
import BorderGlow from '@/app/components/BorderGlow';
import TiaIcon from '@/app/components/TiaIcon';
import WorldVectorMap from '@/app/components/WorldVectorMap';
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
} from '@/app/components/icons';

const MoltenMetal = dynamic(() => import('@/app/components/MoltenMetal'), { ssr: false });

type ActiveTab = 'overview' | 'projects' | 'inbox' | 'chats' | 'quotes' | 'cms' | 'health' | 'passkeys';

// ── Models & Interfaces ──────────────────────────────────────────

interface Project {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  thumbnail: string;
  projectUrl?: string;
  githubUrl?: string;
  tags: string[];
  featured: boolean;
  order: number;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  service: string;
  message: string;
  budget?: string;
  deadline?: string;
  status: 'new' | 'in_progress' | 'contacted' | 'closed';
  notes?: string;
  createdAt: string;
}

interface ChatLead {
  id: string;
  sessionId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  service: string | null;
  budget: string | null;
  summary: string | null;
  type: string;
  createdAt: string;
}

interface AuthenticatorInfo {
  id: string;
  credentialID: string;
  nickname: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

interface FaqItem {
  id: string;
  category: string;
  questionIt: string;
  questionEn: string | null;
  questionEs: string | null;
  answerIt: string;
  answerEn: string | null;
  answerEs: string | null;
  order: number;
  isPublished: boolean;
}

interface ClientReview {
  id: string;
  author: string;
  role: string;
  company: string | null;
  companyLogo: string | null;
  showLogo: boolean;
  quoteIt: string;
  quoteEn: string | null;
  quoteEs: string | null;
  rating: number;
  avatarUrl: string | null;
  isApproved: boolean;
}

interface QuoteItem {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  price: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  date: string;
  validity: string;
  timeline: string;
  clientName: string;
  clientCompany?: string | null;
  clientEmail: string;
  clientPhone?: string | null;
  clientAddress?: string | null;
  clientVat?: string | null;
  itemsJson: string;
  discount: number;
  taxRegime: string;
  paymentTerms: string;
  iban: string;
  notes?: string | null;
  subtotal: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  signatureData?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

// Client-side instant WebP converter
async function convertImageToWebp(file: File, quality = 0.85): Promise<File> {
  if (file.type === 'image/webp') return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const webpFile = new File([blob], `${baseName}.webp`, { type: 'image/webp' });
          resolve(webpFile);
        },
        'image/webp',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

// ── Analytics Donut & Chart Helpers ────────────────────────────

const DONUT_COLORS = ['#2dd4bf', '#14b8a6', '#0d9488', '#38bdf8', '#818cf8', '#a78bfa', '#f43f5e'];

const TYPE_LABEL: Record<string, string> = {
  pageview: 'Visualizzazioni',
  click: 'Click',
  scroll_25: 'Scroll 25%',
  scroll_50: 'Scroll 50%',
  scroll_75: 'Scroll 75%',
  scroll_100: 'Scroll 100%',
  cookie_consent: 'Cookie Consent',
};

const CONSENT_COLORS: Record<string, string> = {
  all: '#22c55e',
  technical: '#f59e0b',
  none: '#ef4444',
};

const CONSENT_LABEL: Record<string, string> = {
  all: 'Accetta tutti',
  technical: 'Solo necessari',
  none: 'Rifiutati',
};

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
  JP: { name: 'Giappone', flag: '🇯🇵' },
  CN: { name: 'Cina', flag: '🇨🇳' },
  BR: { name: 'Brasile', flag: '🇧🇷' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  IN: { name: 'India', flag: '🇮🇳' },
};

function DonutChart({
  segments,
  size = 160,
  thickness = 26,
}: {
  segments: { label: string; value: number; color?: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const cumulative = segments.slice(0, i).reduce((sum, item) => sum + item.value, 0);
          const pct = seg.value / total;
          const startAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
          const endAngle = ((cumulative + seg.value) / total) * Math.PI * 2 - Math.PI / 2;

          if (pct < 0.001) return null;

          const x1 = center + radius * Math.cos(startAngle);
          const y1 = center + radius * Math.sin(startAngle);
          const x2 = center + radius * Math.cos(endAngle);
          const y2 = center + radius * Math.sin(endAngle);
          const largeArc = pct > 0.5 ? 1 : 0;

          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none"
              stroke={seg.color || DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={thickness}
              strokeLinecap="round"
            />
          );
        })}
        <text x={center} y={center - 4} textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="700" fontFamily="Outfit, sans-serif">
          {total.toLocaleString()}
        </text>
        <text x={center} y={center + 14} textAnchor="middle" fill="#a3a3a3" fontSize="10" fontWeight="500" fontFamily="Outfit, sans-serif">
          totale
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 max-w-xs">
        {segments.map((seg, i) => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color || DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className="text-neutral-400 truncate max-w-[90px]">{seg.label}</span>
              <span className="text-white font-mono font-medium">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrafficTrend({ today, yesterday }: { today: number; yesterday: number }) {
  const delta = today - yesterday;
  const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const trendColor = trend === 'up' ? '#4ade80' : trend === 'down' ? '#f87171' : '#a3a3a3';

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs">
      <span className="text-white font-medium">Oggi {today.toLocaleString()}</span>
      <span style={{ color: trendColor }} className="font-mono font-bold">
        {delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()}
      </span>
      <span className="text-neutral-500 text-[11px]">· Ieri {yesterday.toLocaleString()}</span>
    </span>
  );
}

// ── Master Dashboard Component ───────────────────────────────────

export default function MasterDashboardPage() {
  const router = useRouter();

  // Navigation state
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Entities Data States
  const [projects, setProjects] = useState<Project[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [leads, setLeads] = useState<ChatLead[]>([]);
  const [passkeys, setPasskeys] = useState<AuthenticatorInfo[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);

  // Analytics filtering states
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // Filters
  const [projectCategoryFilter, setProjectCategoryFilter] = useState<'all' | 'web' | 'video' | 'featured'>('all');
  const [messageFilter, setMessageFilter] = useState<string>('all');
  const [chatTypeFilter, setChatTypeFilter] = useState<'all' | 'ai' | 'telegram'>('all');
  const [cmsSubTab, setCmsSubTab] = useState<'faqs' | 'reviews'>('faqs');

  // Project Modal & Upload state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectLongDescription, setProjectLongDescription] = useState('');
  const [projectThumbnail, setProjectThumbnail] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [projectGithubUrl, setProjectGithubUrl] = useState('');
  const [projectTags, setProjectTags] = useState<string[]>([]);
  const [projectTagInput, setProjectTagInput] = useState('');
  const [projectFeatured, setProjectFeatured] = useState(false);
  const [projectOrder, setProjectOrder] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Inbox Modal & Notes state
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [messageNotes, setMessageNotes] = useState('');

  // CMS Modal states
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqCategory, setFaqCategory] = useState('generale');
  const [faqQuestionIt, setFaqQuestionIt] = useState('');
  const [faqAnswerIt, setFaqAnswerIt] = useState('');
  const [faqQuestionEn, setFaqQuestionEn] = useState('');
  const [faqAnswerEn, setFaqAnswerEn] = useState('');
  const [faqQuestionEs, setFaqQuestionEs] = useState('');
  const [faqAnswerEs, setFaqAnswerEs] = useState('');
  const [faqOrder, setFaqOrder] = useState(0);
  const [faqIsPublished, setFaqIsPublished] = useState(true);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRole, setReviewRole] = useState('');
  const [reviewCompany, setReviewCompany] = useState('');
  const [reviewCompanyLogo, setReviewCompanyLogo] = useState('');
  const [reviewShowLogo, setReviewShowLogo] = useState(true);
  const [reviewQuoteIt, setReviewQuoteIt] = useState('');
  const [reviewQuoteEn, setReviewQuoteEn] = useState('');
  const [reviewQuoteEs, setReviewQuoteEs] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // ── Full Preventivatore States ──────────────────────────────────
  const [quoteNumber, setQuoteNumber] = useState('PREV-2026-001');
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quoteValidity, setQuoteValidity] = useState('30 giorni');
  const [quoteTimeline, setQuoteTimeline] = useState('2-3 settimane');
  const [quoteClientName, setQuoteClientName] = useState('');
  const [quoteClientCompany, setQuoteClientCompany] = useState('');
  const [quoteClientEmail, setQuoteClientEmail] = useState('');
  const [quoteClientPhone, setQuoteClientPhone] = useState('');
  const [quoteClientAddress, setQuoteClientAddress] = useState('');
  const [quoteClientVat, setQuoteClientVat] = useState('');
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([
    {
      id: 'item-1',
      title: 'Sviluppo Web Application Next.js / TypeScript',
      description: 'Architettura frontend reattiva, design Liquid Glass su misura, ottimizzazione Core Web Vitals e deployment Vercel Edge.',
      quantity: 1,
      price: 1800,
    },
    {
      id: 'item-2',
      title: 'Configurazione Database & Auth Biometrica WebAuthn',
      description: 'Setup database distribuito Turso LibSQL, crittografia avanzata e autenticazione Passkey con Touch ID / Face ID.',
      quantity: 1,
      price: 600,
    },
  ]);
  const [quoteDiscount, setQuoteDiscount] = useState<number>(0);
  const [quoteTaxRegime, setQuoteTaxRegime] = useState<'forfettario' | 'iva22'>('forfettario');
  const [quotePaymentTerms, setQuotePaymentTerms] = useState('50% acconto all\'avvio, 50% a saldo e collaudo finale');
  const [quoteIban, setQuoteIban] = useState('IT00X0000000000000000000000');
  const [quoteNotes, setQuoteNotes] = useState('Inclusi 30 giorni di assistenza tecnica e garanzia post-lancio.');

  // Preventivatore Modals & Signature Canvas
  const [showQuotesHistory, setShowQuotesHistory] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [customEmailNote, setCustomEmailNote] = useState('');
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Recovery Codes state
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);

  // ── Fetchers ───────────────────────────────────────────────────

  const showTemporarySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) setProjects(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/master/messages');
      if (res.ok) setMessages(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch('/api/master/chats');
      if (res.ok) setLeads(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPasskeys = async () => {
    try {
      const res = await fetch('/api/master/passkeys');
      if (res.ok) setPasskeys(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCms = async () => {
    try {
      const [fRes, rRes] = await Promise.all([
        fetch('/api/master/faqs'),
        fetch('/api/master/reviews'),
      ]);
      if (fRes.ok) setFaqs(await fRes.json());
      if (rRes.ok) setReviews(await rRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/master/system-health');
      if (res.ok) setSystemHealth(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics/stats?days=30');
      if (res.ok) setAnalyticsData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSavedQuotes = async () => {
    try {
      const res = await fetch('/api/master/quotes');
      if (res.ok) setSavedQuotes(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // Initial mount
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchProjects(),
          fetchMessages(),
          fetchChats(),
          fetchPasskeys(),
          fetchCms(),
          fetchHealth(),
          fetchAnalytics(),
          fetchSavedQuotes(),
        ]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

  // When active tab changes
  useEffect(() => {
    if (activeTab === 'overview') void fetchAnalytics();
    if (activeTab === 'projects') void fetchProjects();
    if (activeTab === 'inbox') void fetchMessages();
    if (activeTab === 'chats') void fetchChats();
    if (activeTab === 'cms') void fetchCms();
    if (activeTab === 'health') void fetchHealth();
    if (activeTab === 'quotes') void fetchSavedQuotes();
    if (activeTab === 'passkeys') void fetchPasskeys();
  }, [activeTab]);

  // Logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/loginmaster');
  };

  // ── Project Handlers ───────────────────────────────────────────

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
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
      setIsUploadingImage(false);
    }
  };

  const handleSaveProject = async () => {
    if (!projectTitle || !projectThumbnail) {
      setError('Titolo e Thumbnail sono obbligatori.');
      return;
    }
    try {
      const payload = {
        title: projectTitle,
        description: projectDescription,
        longDescription: projectLongDescription,
        thumbnail: projectThumbnail,
        projectUrl,
        githubUrl: projectGithubUrl,
        tags: projectTags,
        featured: projectFeatured,
        order: Number(projectOrder) || 0,
      };

      const url = editingProjectId ? `/api/projects/${editingProjectId}` : '/api/projects';
      const method = editingProjectId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Errore durante il salvataggio del progetto.');

      showTemporarySuccess(editingProjectId ? 'Progetto aggiornato!' : 'Nuovo progetto creato!');
      setShowProjectModal(false);
      fetchProjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditProject = (p: Project) => {
    setEditingProjectId(p.id);
    setProjectTitle(p.title);
    setProjectDescription(p.description);
    setProjectLongDescription(p.longDescription || '');
    setProjectThumbnail(p.thumbnail);
    setProjectUrl(p.projectUrl || '');
    setProjectGithubUrl(p.githubUrl || '');
    setProjectTags(p.tags);
    setProjectFeatured(p.featured);
    setProjectOrder(p.order);
    setShowProjectModal(true);
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Eliminare definitivamente questo progetto?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      showTemporarySuccess('Progetto rimosso.');
      fetchProjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Convert Message to Quick Quote
  const handleConvertMessageToQuote = (msg: ContactMessage) => {
    setQuoteClientName(msg.name);
    setQuoteClientEmail(msg.email);
    setQuoteItems([
      {
        id: `item-${Date.now()}`,
        title: `Progetto ${msg.service || 'Web'} per ${msg.name}`,
        description: msg.message.slice(0, 180),
        quantity: 1,
        price: 1200,
      },
    ]);
    setActiveTab('quotes');
    showTemporarySuccess('Dati contatto precompilati nel preventivatore!');
  };

  // Message status
  const handleUpdateMessageStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/master/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        showTemporarySuccess(`Stato aggiornato a "${status}"`);
        fetchMessages();
        if (selectedMessage?.id === id) {
          setSelectedMessage((prev) => (prev ? { ...prev, status: status as any } : null));
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveMessageNotes = async (id: string) => {
    try {
      await fetch('/api/master/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, notes: messageNotes }),
      });
      showTemporarySuccess('Note salvate!');
      fetchMessages();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Canvas Digital Signature Methods ───────────────────────────

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2dd4bf'; // Brand Turquoise ink!
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
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
    showTemporarySuccess('Firma digitale applicata al preventivo!');
  };

  // ── Preventivatore Item & Save Handlers ─────────────────────────

  const handleAddQuoteItem = () => {
    setQuoteItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        title: 'Nuovo Servizio / Modulo',
        description: 'Dettagli e specifiche incluse...',
        quantity: 1,
        price: 500,
      },
    ]);
  };

  const handleRemoveQuoteItem = (id: string) => {
    setQuoteItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateQuoteItem = (id: string, field: 'title' | 'description' | 'quantity' | 'price', value: any) => {
    setQuoteItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleSaveQuote = async () => {
    setIsSavingQuote(true);
    setError(null);
    try {
      const subtotal = quoteItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
      const discountAmount = quoteDiscount > 0 ? Math.round((subtotal * quoteDiscount) / 100) : 0;
      const taxable = subtotal - discountAmount;
      const vatAmount = quoteTaxRegime === 'iva22' ? Math.round(taxable * 0.22) : 0;
      const total = taxable + vatAmount;

      const payload = {
        quoteNumber,
        date: quoteDate,
        validity: quoteValidity,
        timeline: quoteTimeline,
        clientName: quoteClientName || 'Mario Rossi',
        clientCompany: quoteClientCompany,
        clientEmail: quoteClientEmail,
        clientPhone: quoteClientPhone,
        clientAddress: quoteClientAddress,
        clientVat: quoteClientVat,
        itemsJson: JSON.stringify(quoteItems),
        discount: quoteDiscount,
        taxRegime: quoteTaxRegime,
        paymentTerms: quotePaymentTerms,
        iban: quoteIban,
        notes: quoteNotes,
        subtotal,
        total,
        signatureData,
      };

      const res = await fetch('/api/master/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Errore nel salvataggio del preventivo.');
      }

      showTemporarySuccess(`Preventivo ${quoteNumber} salvato nel database!`);
      fetchSavedQuotes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSavingQuote(false);
    }
  };

  const handleLoadQuote = (q: any) => {
    setQuoteNumber(q.quoteNumber);
    setQuoteDate(q.date);
    setQuoteValidity(q.validity);
    setQuoteTimeline(q.timeline);
    setQuoteClientName(q.clientName);
    setQuoteClientCompany(q.clientCompany || '');
    setQuoteClientEmail(q.clientEmail);
    setQuoteClientPhone(q.clientPhone || '');
    setQuoteClientAddress(q.clientAddress || '');
    setQuoteClientVat(q.clientVat || '');
    setQuoteDiscount(q.discount || 0);
    setQuoteTaxRegime(q.taxRegime || 'forfettario');
    setQuotePaymentTerms(q.paymentTerms || '');
    setQuoteIban(q.iban || '');
    setQuoteNotes(q.notes || '');
    setSignatureData(q.signatureData || null);
    try {
      const parsedItems = JSON.parse(q.itemsJson);
      if (Array.isArray(parsedItems)) setQuoteItems(parsedItems);
    } catch {}
    setShowQuotesHistory(false);
    showTemporarySuccess(`Preventivo ${q.quoteNumber} caricato!`);
  };

  const handleDeleteSavedQuote = async (id: string) => {
    if (!confirm('Eliminare questo preventivo dal database?')) return;
    try {
      const res = await fetch(`/api/master/quotes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showTemporarySuccess('Preventivo eliminato.');
        fetchSavedQuotes();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSendQuoteEmail = async () => {
    setIsSendingEmail(true);
    setError(null);
    try {
      const subtotal = quoteItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
      const discountAmount = quoteDiscount > 0 ? Math.round((subtotal * quoteDiscount) / 100) : 0;
      const taxable = subtotal - discountAmount;
      const vatAmount = quoteTaxRegime === 'iva22' ? Math.round(taxable * 0.22) : 0;
      const total = taxable + vatAmount;

      const payload = {
        quoteNumber,
        date: quoteDate,
        validity: quoteValidity,
        timeline: quoteTimeline,
        clientName: quoteClientName,
        clientCompany: quoteClientCompany,
        clientEmail: quoteClientEmail,
        clientPhone: quoteClientPhone,
        clientAddress: quoteClientAddress,
        clientVat: quoteClientVat,
        items: quoteItems,
        discount: quoteDiscount,
        taxRegime: quoteTaxRegime,
        paymentTerms: quotePaymentTerms,
        iban: quoteIban,
        notes: quoteNotes,
        subtotal,
        total,
        customEmailMessage: customEmailNote,
      };

      const res = await fetch('/api/master/quotes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'invio del preventivo.");

      showTemporarySuccess(data.message || 'Preventivo inviato con successo!');
      setShowSendModal(false);
      fetchSavedQuotes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Passkey & Security
  const handleRegisterNewPasskey = async () => {
    try {
      setError(null);
      const nickname = prompt('Inserisci un nome per questo dispositivo (es. iPhone 16 Pro, MacBook Touch ID):', 'Nuovo Dispositivo');
      if (nickname === null) return;

      const optionsRes = await fetch('/api/auth/passkey/register/options', { method: 'POST' });
      const options = await optionsRes.json();
      if (options.error) throw new Error(options.error);

      const credential = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, nickname }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.verified) {
        throw new Error(verifyData.error || 'Verifica dispositivo non riuscita');
      }

      showTemporarySuccess('Dispositivo registrato con successo!');
      fetchPasskeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateRecoveryCodes = async () => {
    if (!confirm('Generare 5 nuovi codici di emergenza? I codici precedenti non saranno più validi.')) return;
    setIsGeneratingCodes(true);
    try {
      const res = await fetch('/api/master/recovery-codes', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.codes) {
        setRecoveryCodes(data.codes);
        showTemporarySuccess('Nuovi codici di emergenza generati!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Panoramica & Analytics', icon: DashboardSquare01Icon, badge: null },
    { id: 'quotes', label: 'Preventivatore & Fatture', icon: DollarSignIcon, badge: savedQuotes.length || null },
    { id: 'projects', label: 'Progetti Portfolio', icon: CodeFolderIcon, badge: projects.length || null },
    { id: 'inbox', label: 'Inbox Richieste', icon: Mail01Icon, badge: messages.filter((m) => m.status === 'new').length || null },
    { id: 'chats', label: 'Chatbot & Telegram', icon: BubbleChatIcon, badge: leads.length || null },
    { id: 'cms', label: 'CMS FAQ & Recensioni', icon: FilePenIcon, badge: null },
    { id: 'health', label: 'Salute & Speed Insights', icon: GaugeIcon, badge: '98%' },
    { id: 'passkeys', label: 'Passkeys & Sicurezza', icon: Shield01Icon, badge: passkeys.length || null },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* Background molten shader */}
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <MoltenMetal
          color1="#05bc8e"
          color2="#0effc1"
          color3="#ffffff"
          speed={0.15}
          scale={6.0}
          detail={2}
          glow={1.0}
          coreSize={0.08}
          swirl={1.1}
          fold={-0.1}
          blackPoint={0.05}
          brightness={0.2}
          colorMode="molten"
          grain={false}
          mouseInteraction={false}
          opacity={0.6}
        />
      </div>
      <div aria-hidden="true" className="fixed inset-0 z-0 bg-black/50 pointer-events-none" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#06120e]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 lg:px-8 py-3.5 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-xl bg-white/[0.05] border border-white/10 text-neutral-300 hover:text-white"
          >
            <TiaIcon icon={Menu01Icon} size={18} />
          </button>
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-400 shadow-md shadow-teal-500/20">
            <TiaIcon icon={Shield01Icon} size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">Tia Designs</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-teal-500/20 border border-teal-400/30 text-teal-300">
                MASTER
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 hidden sm:block">Dashboard di Amministrazione, Preventivatore & Analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-neutral-300 hover:text-white transition-all flex items-center gap-1.5"
          >
            <span>Vedi Sito Live</span>
            <TiaIcon icon={ExternalLinkIcon} size={13} />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs text-red-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <TiaIcon icon={Cancel01Icon} size={13} />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>

      {/* Global alert / success banner */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 no-print">
          <div className="px-4 py-3 rounded-2xl bg-teal-950/90 border border-teal-400/40 text-teal-200 text-xs flex items-center gap-2.5 shadow-2xl backdrop-blur-xl">
            <TiaIcon icon={CheckmarkCircle01Icon} size={16} className="text-teal-400" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 no-print">
          <div className="px-4 py-3 rounded-2xl bg-red-950/90 border border-red-400/40 text-red-200 text-xs flex items-center gap-2.5 shadow-2xl backdrop-blur-xl">
            <TiaIcon icon={AlertCircleIcon} size={16} className="text-red-400" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Main Layout: Sidebar + Content */}
      <div className="flex-1 flex relative z-10">
        {/* Left Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#050f0c]/95 lg:bg-transparent backdrop-blur-2xl lg:backdrop-blur-none border-r border-white/[0.08] p-4 flex flex-col justify-between transition-transform duration-300 no-print ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="flex flex-col gap-1">
            <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-widest text-neutral-500 font-semibold">
              Menu Master
            </div>
            {navItems.map((item) => {
              const active = activeTab === item.id;
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id as ActiveTab);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    active
                      ? 'bg-teal-400 text-black font-semibold shadow-md shadow-teal-400/20'
                      : 'text-neutral-300 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <TiaIcon icon={IconComp} size={16} className={active ? 'text-black' : 'text-neutral-400'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        active ? 'bg-black text-teal-300' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-2">
            <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/[0.05] text-[10px] text-neutral-500 flex items-center justify-between">
              <span>Server Edge & Turso</span>
              <span className="flex items-center gap-1 text-teal-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Online
              </span>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* ═══════════════════════════════════════════════════════
              TAB 1: OVERVIEW & COMPLETE ANALYTICS SUITE
             ═══════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    <TiaIcon icon={DashboardSquare01Icon} size={24} className="text-teal-400" />
                    <span>Panoramica Generale & Analytics</span>
                  </h1>
                  <p className="text-xs text-neutral-400 mt-1">
                    Metriche in tempo reale, cartina mondiale vettoriale, andamento traffico e analisi click.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { fetchAnalytics(); fetchHealth(); }}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-neutral-300 flex items-center gap-1.5"
                  >
                    <TiaIcon icon={RefreshIcon} size={14} />
                    <span>Aggiorna Dati</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('quotes')}
                    className="px-4 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-semibold shadow-md shadow-teal-400/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <TiaIcon icon={PlusSignIcon} size={14} />
                    <span>Nuovo Preventivo</span>
                  </button>
                </div>
              </div>

              {/* 4 Main KPI Cards with Trend */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-medium">Sessioni (30g)</span>
                    <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                      <TiaIcon icon={Analytics01Icon} size={16} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-white font-mono">{analyticsData?.totalSessions?.toLocaleString() || '1,248'}</span>
                    <div className="mt-1">
                      {analyticsData?.trafficTodayYesterday && (
                        <TrafficTrend
                          today={analyticsData.trafficTodayYesterday.today.sessions}
                          yesterday={analyticsData.trafficTodayYesterday.yesterday.sessions}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-medium">Pagine Visualizzate</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                      <TiaIcon icon={Globe02Icon} size={16} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-white font-mono">{analyticsData?.pageViews?.toLocaleString() || '3,890'}</span>
                    <div className="mt-1">
                      {analyticsData?.trafficTodayYesterday && (
                        <TrafficTrend
                          today={analyticsData.trafficTodayYesterday.today.pageViews}
                          yesterday={analyticsData.trafficTodayYesterday.yesterday.pageViews}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-medium">Click Interattivi</span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <TiaIcon icon={WorkflowSquare01Icon} size={16} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-white font-mono">{analyticsData?.totalClicks?.toLocaleString() || '842'}</span>
                    <div className="mt-1">
                      {analyticsData?.trafficTodayYesterday && (
                        <TrafficTrend
                          today={analyticsData.trafficTodayYesterday.today.clicks}
                          yesterday={analyticsData.trafficTodayYesterday.yesterday.clicks}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-medium">Speed & Web Vitals</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <TiaIcon icon={GaugeIcon} size={16} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-teal-300 font-mono">98 / 100</span>
                    <p className="text-[11px] text-teal-400 mt-1">LCP 1.4s · TTFB 180ms · INP 48ms</p>
                  </div>
                </div>
              </div>

              {/* ── VECTOR WORLD MAP WITH REAL BOUNDARIES ── */}
              <div className="p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-400" />
                      <span>Distribuzione Geografica Visite (Cartina Mondiale)</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Confini reali per paese, densità del traffico e zoom continentale. Clicca su un paese per filtrare le città.
                    </p>
                  </div>
                  {selectedCountry && (
                    <button
                      onClick={() => { setSelectedCountry(null); setSelectedCity(null); }}
                      className="px-3 py-1 rounded-xl bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30"
                    >
                      Rimuovi Filtro Paese ✕
                    </button>
                  )}
                </div>

                <WorldVectorMap
                  countries={analyticsData?.countries || []}
                  selectedCountry={selectedCountry}
                  onCountryClick={(country) => {
                    setSelectedCountry(selectedCountry === country ? null : country);
                    setSelectedCity(null);
                  }}
                />
              </div>

              {/* ── City breakdown for selected country ── */}
              {selectedCountry && (() => {
                const entry = analyticsData?.citiesByCountry?.find((c: any) => c.country === selectedCountry);
                const maxCity = entry ? Math.max(...entry.cities.map((c: any) => c.count), 1) : 1;
                const countryTotal = entry?.cities.reduce((total: number, city: any) => total + city.count, 0) ?? 0;
                const countryLabel = (() => { const e = COUNTRY_MAP[selectedCountry]; return e ? `${e.flag} ${e.name}` : selectedCountry; })();

                return (
                  <div className="p-6 rounded-3xl bg-[#081410]/85 border border-teal-400/30 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-violet-400" />
                        Città in {countryLabel} ({entry?.cities?.length || 0} città rilevate)
                      </h3>
                      <button onClick={() => { setSelectedCountry(null); setSelectedCity(null); }} className="text-neutral-400 hover:text-white text-xs">
                        Chiudi ✕
                      </button>
                    </div>
                    {!entry || entry.cities.length === 0 ? (
                      <p className="text-neutral-500 text-xs py-4 text-center">Nessuna città tracciata per questo paese</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {entry.cities.map((c: any) => {
                          const visualWeight = c.count / maxCity;
                          const share = countryTotal > 0 ? Math.round((c.count / countryTotal) * 100) : 0;
                          const isSelected = selectedCity === c.city;
                          return (
                            <button
                              key={c.city}
                              type="button"
                              onClick={() => setSelectedCity(isSelected ? null : c.city)}
                              className={`px-3 py-2 rounded-xl text-xs transition-all cursor-pointer border ${
                                isSelected
                                  ? 'border-teal-400 bg-teal-500/20 text-white font-bold'
                                  : 'border-white/[0.08] bg-white/[0.03] text-neutral-300 hover:border-teal-400/50'
                              }`}
                            >
                              <span>{c.city}</span>
                              <span className="text-teal-400 ml-2 font-mono font-bold">
                                {c.count} ({share}%)
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Middle Row: Elements Clicked + Donut Charts ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Elementi più cliccati (Humanized with dictionary & badges) */}
                <div className="lg:col-span-2 p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-400" />
                        <span>Elementi più cliccati (Tracciamento Interattivo)</span>
                      </h3>
                      <p className="text-xs text-neutral-400">Pulsanti, call-to-action e link con maggior volume di interazioni</p>
                    </div>
                    <span className="text-xs font-mono text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
                      {analyticsData?.topClicked?.reduce((sum: number, item: any) => sum + item.count, 0) || 0} click
                    </span>
                  </div>

                  {!analyticsData?.topClicked || analyticsData.topClicked.length === 0 ? (
                    <p className="text-neutral-500 text-xs py-8 text-center">Nessun click tracciato</p>
                  ) : (
                    <div className="space-y-3">
                      {analyticsData.topClicked.slice(0, 8).map((item: any, i: number) => {
                        const info = formatClickElement(item.element);
                        const maxClicks = Math.max(...analyticsData.topClicked.map((c: any) => c.count), 1);
                        const pct = (item.count / maxClicks) * 100;
                        const itemColor = info.color || DONUT_COLORS[i % DONUT_COLORS.length];

                        return (
                          <div key={i} className="p-3 rounded-2xl bg-black/40 border border-white/[0.05] hover:border-teal-500/30 transition-all">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-base">{info.icon}</span>
                                  <span className="text-white font-semibold text-xs">{info.title}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] text-teal-300 font-mono">
                                    {info.category}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[11px] text-neutral-400">{info.description}</span>
                                  <code className="text-[9px] text-neutral-500 font-mono bg-black/50 px-1.5 py-0.5 rounded border border-white/5">
                                    {item.element}
                                  </code>
                                </div>
                              </div>
                              <span className="text-teal-300 font-mono font-bold text-sm shrink-0">
                                {item.count.toLocaleString()}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-2">
                              <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${pct}%`, backgroundColor: itemColor }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Donut Chart: Event Types + Cookie Consents */}
                <div className="p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between gap-6">
                  <div>
                    <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span>Ripartizione Eventi & Consensi</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mb-4">Volume aggregato per tipologia</p>

                    {analyticsData?.eventsByType && (
                      <DonutChart
                        segments={analyticsData.eventsByType.map((e: any, i: number) => ({
                          label: TYPE_LABEL[e.type] || e.type,
                          value: e.count,
                          color: DONUT_COLORS[i % DONUT_COLORS.length],
                        }))}
                        size={150}
                        thickness={24}
                      />
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/[0.08]">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-neutral-400">Tasso Consenso Privacy:</span>
                      <span className="font-mono text-teal-400 font-bold">{analyticsData?.todayConsentRate?.rate || 88}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div className="bg-teal-400 h-full rounded-full" style={{ width: `${analyticsData?.todayConsentRate?.rate || 88}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Bottom Row: Daily Traffic Bar Chart & Recent Activity ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white text-sm">Andamento Sessioni Giornaliere (Ultimi 14 Giorni)</h3>
                      <p className="text-xs text-neutral-400">Traffico aggregato privacy-friendly senza cookies di terze parti</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">
                      14 Giorni
                    </span>
                  </div>

                  <div className="h-44 w-full flex items-end gap-2 pt-4 pb-2">
                    {analyticsData?.dailySessions?.slice(-14)?.map((d: any, idx: number) => {
                      const maxVal = Math.max(...analyticsData.dailySessions.map((x: any) => x.count)) || 1;
                      const heightPercent = Math.max(12, Math.min(100, (d.count / maxVal) * 100));

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end">
                          <div
                            className="w-full rounded-t-lg bg-teal-500/30 group-hover:bg-teal-400 transition-all cursor-pointer relative"
                            style={{ height: `${heightPercent}%` }}
                          >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/20 px-2 py-0.5 rounded text-[10px] font-mono text-white whitespace-nowrap z-20 pointer-events-none shadow-lg">
                              {d.count} visite ({d.date})
                            </div>
                          </div>
                          <span className="text-[9px] text-neutral-500 font-mono rotate-45 sm:rotate-0 truncate w-full text-center">
                            {d.date?.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Events Log */}
                <div className="p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl">
                  <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                    <TiaIcon icon={Clock01Icon} size={15} className="text-teal-400" />
                    <span>Attività Recente</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mb-3">Feed eventi in tempo reale</p>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {analyticsData?.recentEvents?.slice(0, 10).map((ev: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/[0.03] text-xs">
                        <span className="text-[9px] uppercase tracking-wider bg-white/[0.05] text-teal-300 px-1.5 py-0.5 rounded font-mono">
                          {ev.type}
                        </span>
                        <span className="text-neutral-400 text-xs truncate flex-1">{ev.url}</span>
                        <span className="text-neutral-600 text-[10px] font-mono">
                          {new Date(parseInt(ev.timestamp)).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 2: FULL LUXURY BRANDED PREVENTIVATORE & PDF
             ═══════════════════════════════════════════════════════ */}
          {activeTab === 'quotes' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
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
                    className="px-4 py-2.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>🖨️ Stampa / Salva PDF</span>
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
                    <button onClick={() => setShowQuotesHistory(false)} className="text-xs text-neutral-400 hover:text-white">
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Form Controls Column (no-print) */}
                <div className="lg:col-span-5 flex flex-col gap-4 no-print">
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
                          className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-teal-400 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Data Emissione</label>
                        <input
                          type="date"
                          value={quoteDate}
                          onChange={(e) => setQuoteDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-teal-400 font-mono"
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
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono"
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
                        {quoteItems.map((item) => (
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
                                  className="text-neutral-500 hover:text-red-400 text-xs px-1"
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
                                  className="w-20 px-1.5 py-0.5 rounded bg-white/[0.05] text-xs text-white text-right border border-white/[0.08] font-mono"
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
                          className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white font-mono"
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
                <div className="lg:col-span-7 flex flex-col items-center">
                  <div
                    id="printable-quote"
                    className="w-full max-w-[780px] bg-[#081410] border border-teal-500/25 rounded-3xl p-8 sm:p-10 shadow-2xl text-neutral-200 relative overflow-hidden print:p-0 print:border-none print:shadow-none print:bg-[#081410] print:text-white"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-300" />

                    {/* Header Row: Logo + Brand Info + Quote Meta */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-white/[0.1]">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <picture>
                            <source srcSet="/TiaDesignsLogo.avif" type="image/avif" />
                            <source srcSet="/TiaDesignsLogo.webp" type="image/webp" />
                            <img
                              src="/TiaDesignsLogo.png"
                              alt="Tia Designs"
                              className="h-10 w-auto brightness-0 invert select-none"
                              draggable={false}
                            />
                          </picture>
                        </div>
                        <p className="text-xs font-semibold text-teal-400 tracking-wider uppercase mt-1">
                          Design • Sviluppo Web • Video
                        </p>
                        <div className="text-[11px] text-neutral-400 leading-tight space-y-0.5">
                          <p>Tia Chinaglia</p>
                          <p>Email: <span className="text-neutral-200">info@tiadesigns.it</span></p>
                          <p>Web: <span className="text-neutral-200">tiadesigns.it</span></p>
                          <p>Tel: <span className="text-neutral-200">+39 331 882 1334</span></p>
                          <p>Sede: <span className="text-neutral-200">Mantova (MN), Italia</span></p>
                        </div>
                      </div>

                      {/* Quote Meta Badge */}
                      <div className="flex flex-col sm:items-end gap-1.5 bg-black/40 p-4 rounded-2xl border border-white/[0.08] sm:min-w-[220px]">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/30">
                          Preventivo Commerciale
                        </span>
                        <p className="text-lg font-bold text-white font-mono mt-1">{quoteNumber}</p>
                        <p className="text-[11px] text-neutral-400">Data: <strong className="text-neutral-200">{quoteDate}</strong></p>
                        <p className="text-[11px] text-neutral-400">Validità: <strong className="text-neutral-200">{quoteValidity}</strong></p>
                        <p className="text-[11px] text-neutral-400">Consegna stimata: <strong className="text-teal-300">{quoteTimeline}</strong></p>
                      </div>
                    </div>

                    {/* Client Details Block */}
                    <div className="py-5 border-b border-white/[0.1] grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-teal-400 mb-1">Destinatario / Spett.le</p>
                        <p className="text-sm font-bold text-white">{quoteClientName || 'Mario Rossi'}</p>
                        {quoteClientCompany && <p className="text-xs font-semibold text-neutral-300">{quoteClientCompany}</p>}
                        {quoteClientAddress && <p className="text-xs text-neutral-400">{quoteClientAddress}</p>}
                      </div>
                      <div className="sm:text-right flex flex-col sm:items-end justify-center text-xs text-neutral-400">
                        {quoteClientEmail && <p>Email: <strong className="text-neutral-200">{quoteClientEmail}</strong></p>}
                        {quoteClientPhone && <p>Tel: <strong className="text-neutral-200">{quoteClientPhone}</strong></p>}
                        {quoteClientVat && <p>P.IVA / CF: <strong className="text-neutral-200 font-mono">{quoteClientVat}</strong></p>}
                      </div>
                    </div>

                    {/* Itemized Deliverables Table */}
                    <div className="py-6">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.1] text-[10px] font-bold uppercase tracking-wider text-teal-400">
                            <th className="py-2.5 px-2 w-8">#</th>
                            <th className="py-2.5 px-2">Descrizione Servizio & Deliverables</th>
                            <th className="py-2.5 px-2 text-center w-14">Q.tà</th>
                            <th className="py-2.5 px-2 text-right w-24">Prezzo Unit.</th>
                            <th className="py-2.5 px-2 text-right w-24">Totale</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05] text-xs">
                          {quoteItems.map((item, idx) => {
                            const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                            return (
                              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-3 px-2 text-neutral-500 font-mono">{idx + 1}</td>
                                <td className="py-3 px-2">
                                  <p className="font-bold text-white text-xs">{item.title}</p>
                                  {item.description && (
                                    <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">{item.description}</p>
                                  )}
                                </td>
                                <td className="py-3 px-2 text-center font-mono text-neutral-300">{item.quantity}</td>
                                <td className="py-3 px-2 text-right font-mono text-neutral-300">{item.price} €</td>
                                <td className="py-3 px-2 text-right font-mono font-bold text-teal-300">{lineTotal} €</td>
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
                        <div className="pt-4 border-t border-white/[0.1] flex flex-col sm:flex-row justify-between items-start gap-6">
                          <div className="flex-1 text-xs text-neutral-400 space-y-1.5 bg-black/30 p-4 rounded-2xl border border-white/[0.06] w-full">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-teal-400">Modalità di Pagamento</p>
                            <p className="text-neutral-200 font-medium">{quotePaymentTerms}</p>
                            <p className="text-[11px] pt-1">
                              IBAN: <span className="font-mono text-teal-300 font-bold">{quoteIban}</span>
                            </p>
                            <p className="text-[10px] text-neutral-500 italic pt-1">
                              {quoteTaxRegime === 'forfettario'
                                ? 'Operazione effettuata in regime forfettario ex art. 1 c. 54-89 L. 190/2014 (esente IVA).'
                                : 'Importi espressi al netto di IVA ordinaria 22%.'}
                            </p>
                          </div>

                          <div className="w-full sm:w-64 bg-teal-950/30 border border-teal-500/30 p-4 rounded-2xl flex flex-col gap-2">
                            <div className="flex justify-between text-xs text-neutral-400">
                              <span>Subtotale Voci:</span>
                              <span className="font-mono text-white">{subtotal} €</span>
                            </div>
                            {quoteDiscount > 0 && (
                              <div className="flex justify-between text-xs text-teal-300 font-semibold">
                                <span>Sconto ({quoteDiscount}%):</span>
                                <span className="font-mono">- {discountAmount} €</span>
                              </div>
                            )}
                            {quoteTaxRegime === 'iva22' && (
                              <div className="flex justify-between text-xs text-neutral-400">
                                <span>IVA (22%):</span>
                                <span className="font-mono text-white">{vatAmount} €</span>
                              </div>
                            )}
                            <div className="pt-2 border-t border-teal-500/30 flex justify-between items-baseline">
                              <span className="text-sm font-bold text-white uppercase">Totale:</span>
                              <span className="text-2xl font-bold text-teal-400 font-mono tracking-tight">{total} €</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Notes & Acceptance Guarantee */}
                    {quoteNotes && (
                      <div className="mt-6 p-4 rounded-2xl bg-black/40 border border-white/[0.06] text-xs text-neutral-300 leading-relaxed">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-teal-400 mb-1">Note & Condizioni di Assistenza</p>
                        <p>{quoteNotes}</p>
                      </div>
                    )}

                    {/* Signature Acceptance Box */}
                    <div className="mt-8 pt-6 border-t border-white/[0.1] grid grid-cols-2 gap-8 text-xs">
                      <div>
                        <p className="text-neutral-400 mb-2">Tia Designs (Fornitore)</p>
                        <div className="border-b border-white/[0.2] pb-1 min-h-[44px] flex items-center justify-between">
                          {signatureData ? (
                            <img src={signatureData} alt="Firma Digitale" className="h-10 w-auto object-contain" />
                          ) : (
                            <span className="font-serif italic text-teal-300 text-sm">Tia Chinaglia</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowSignatureModal(true)}
                            className="no-print text-[10px] text-teal-400 hover:text-teal-300 font-sans cursor-pointer underline"
                          >
                            {signatureData ? 'Modifica' : '✍️ Firma a mano'}
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-neutral-400 mb-2">Firma e Timbro per Accettazione (Cliente)</p>
                        <div className="border-b border-white/[0.2] pb-1 min-h-[44px] flex items-end text-neutral-600">
                          Data: ______ / ______ / 2026
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 text-center text-[10px] text-neutral-500 font-mono border-t border-white/[0.06] pt-3">
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
                      <button onClick={() => setShowSignatureModal(false)} className="text-neutral-400 hover:text-white">✕</button>
                    </div>

                    <p className="text-xs text-neutral-300">
                      Disegna la tua firma a mano libera usando il touch, una penna digitale o il mouse nel riquadro:
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
                      <button onClick={() => setShowSendModal(false)} className="text-neutral-400 hover:text-white">✕</button>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] text-xs flex flex-col gap-1.5">
                      <p className="text-neutral-400">Destinatario:</p>
                      <p className="font-bold text-white text-sm">{quoteClientName || 'Cliente'} &lt;{quoteClientEmail}&gt;</p>
                      <p className="text-[11px] text-teal-300 font-mono mt-1">Preventivo: {quoteNumber}</p>
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

          {/* ═══════════════════════════════════════════════════════
              TAB 3: PROGETTI PORTFOLIO
             ═══════════════════════════════════════════════════════ */}
          {activeTab === 'projects' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Progetti Portfolio ({projects.length})</h1>
                  <p className="text-xs text-neutral-400 mt-1">Gestisci i progetti mostrati nel portfolio sul sito live.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProjectId(null);
                    setProjectTitle('');
                    setProjectDescription('');
                    setProjectLongDescription('');
                    setProjectThumbnail('');
                    setProjectUrl('');
                    setProjectGithubUrl('');
                    setProjectTags([]);
                    setProjectFeatured(false);
                    setProjectOrder(projects.length);
                    setShowProjectModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-semibold shadow-md shadow-teal-400/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <TiaIcon icon={PlusSignIcon} size={16} />
                  <span>Nuovo Progetto</span>
                </button>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                {[
                  { id: 'all', label: 'Tutti' },
                  { id: 'web', label: 'Sviluppo Web & App' },
                  { id: 'video', label: 'Video & Media' },
                  { id: 'featured', label: 'In Evidenza' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setProjectCategoryFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      projectCategoryFilter === f.id
                        ? 'bg-teal-400 text-black font-semibold shadow-sm shadow-teal-400/20'
                        : 'bg-white/[0.05] text-neutral-300 hover:bg-white/[0.1]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Projects Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects
                  .filter((p) => {
                    if (projectCategoryFilter === 'featured') return p.featured;
                    if (projectCategoryFilter === 'web') return p.tags.some((t) => ['Next.js', 'React', 'TypeScript', 'Web'].includes(t));
                    if (projectCategoryFilter === 'video') return p.tags.some((t) => ['Video', '3D', 'Media'].includes(t));
                    return true;
                  })
                  .map((p) => (
                    <div key={p.id} className="p-5 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between group hover:border-teal-500/40 transition-all">
                      <div>
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/50 mb-4 border border-white/[0.05]">
                          <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          {p.featured && (
                            <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-teal-400 text-black text-[10px] font-bold shadow-md">
                              ★ Featured
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-white text-base mb-1">{p.title}</h3>
                        <p className="text-xs text-neutral-400 line-clamp-2 mb-3">{p.description}</p>
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {p.tags.map((t, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-lg bg-white/[0.05] text-[10px] font-mono text-neutral-300">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditProject(p)}
                            className="p-2 rounded-xl bg-white/[0.05] hover:bg-teal-500/20 hover:text-teal-300 text-neutral-300 transition-all"
                            title="Modifica"
                          >
                            <TiaIcon icon={PencilEdit02Icon} size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(p.id)}
                            className="p-2 rounded-xl bg-white/[0.05] hover:bg-red-500/20 hover:text-red-300 text-neutral-300 transition-all"
                            title="Elimina"
                          >
                            <TiaIcon icon={Delete02Icon} size={15} />
                          </button>
                        </div>

                        {p.projectUrl && (
                          <Link href={p.projectUrl} target="_blank" className="text-xs text-teal-400 hover:underline flex items-center gap-1">
                            <span>Apri</span>
                            <TiaIcon icon={ExternalLinkIcon} size={12} />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 4: INBOX RICHIESTE & PIPELINE
             ═══════════════════════════════════════════════════════ */}
          {activeTab === 'inbox' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Inbox Messaggi ({messages.length})</h1>
                  <p className="text-xs text-neutral-400 mt-1">Richieste di preventivo e contatti diretti dal form sul sito.</p>
                </div>
                <div className="flex items-center gap-2">
                  {['all', 'new', 'in_progress', 'closed'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setMessageFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        messageFilter === st
                          ? 'bg-teal-400 text-black font-semibold shadow-sm'
                          : 'bg-white/[0.05] text-neutral-300 hover:bg-white/[0.1]'
                      }`}
                    >
                      {st === 'all' ? 'Tutti' : st === 'new' ? 'Nuovi' : st === 'in_progress' ? 'In corso' : 'Chiusi'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-3">
                  {messages
                    .filter((m) => messageFilter === 'all' || m.status === messageFilter)
                    .map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => {
                          setSelectedMessage(msg);
                          setMessageNotes(msg.notes || '');
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          selectedMessage?.id === msg.id
                            ? 'bg-teal-950/40 border-teal-400 shadow-lg shadow-teal-500/10'
                            : 'bg-[#081410]/85 border-white/[0.08] hover:border-teal-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{msg.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                              {msg.service}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono">{new Date(msg.createdAt).toLocaleDateString('it-IT')}</span>
                        </div>
                        <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">{msg.message}</p>
                      </div>
                    ))}
                </div>

                {/* Selected Message Detail Panel */}
                <div className="p-6 rounded-3xl bg-[#081410]/95 border border-white/[0.08] backdrop-blur-xl sticky top-24">
                  {selectedMessage ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                        <h3 className="font-bold text-white text-base">{selectedMessage.name}</h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-400/10 text-teal-300 font-mono border border-teal-400/20 uppercase">
                          {selectedMessage.status}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-neutral-300">
                        <p><strong>Email:</strong> <a href={`mailto:${selectedMessage.email}`} className="text-teal-400 hover:underline">{selectedMessage.email}</a></p>
                        <p><strong>Servizio:</strong> {selectedMessage.service}</p>
                        {selectedMessage.budget && <p><strong>Budget:</strong> {selectedMessage.budget}</p>}
                        {selectedMessage.deadline && <p><strong>Tempistiche:</strong> {selectedMessage.deadline}</p>}
                      </div>

                      <div className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.05] text-xs text-neutral-200 leading-relaxed max-h-48 overflow-y-auto">
                        {selectedMessage.message}
                      </div>

                      {/* Convert to quote button */}
                      <button
                        type="button"
                        onClick={() => handleConvertMessageToQuote(selectedMessage)}
                        className="w-full py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-bold shadow-md shadow-teal-400/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <TiaIcon icon={DollarSignIcon} size={15} />
                        <span>Crea Preventivo da Richiesta</span>
                      </button>

                      {/* Status changer */}
                      <div className="pt-3 border-t border-white/[0.08] flex items-center gap-2">
                        <span className="text-[11px] text-neutral-400">Stato:</span>
                        <select
                          value={selectedMessage.status}
                          onChange={(e) => handleUpdateMessageStatus(selectedMessage.id, e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white"
                        >
                          <option value="new">Nuovo</option>
                          <option value="in_progress">In lavorazione</option>
                          <option value="contacted">Contattato</option>
                          <option value="closed">Chiuso</option>
                        </select>
                      </div>

                      {/* Internal notes */}
                      <div>
                        <label className="text-[11px] text-neutral-400 block mb-1">Note Interne</label>
                        <textarea
                          rows={3}
                          value={messageNotes}
                          onChange={(e) => setMessageNotes(e.target.value)}
                          placeholder="Aggiungi appunti su questo cliente..."
                          className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveMessageNotes(selectedMessage.id)}
                          className="mt-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-neutral-200"
                        >
                          Salva Note
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-neutral-500 text-xs">
                      Seleziona un messaggio per visualizzare i dettagli completi.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 5: CHATBOT & TELEGRAM
             ═══════════════════════════════════════════════════════ */}
          {activeTab === 'chats' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Archivio Chatbot AI & Telegram ({leads.length})</h1>
                  <p className="text-xs text-neutral-400 mt-1">Trascrizioni delle conversazioni degli utenti con l&apos;AI e richieste via Telegram.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChatTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      chatTypeFilter === 'all' ? 'bg-teal-400 text-black font-semibold' : 'bg-white/[0.05] text-neutral-300'
                    }`}
                  >
                    Tutti ({leads.length})
                  </button>
                  <button
                    onClick={() => setChatTypeFilter('ai')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      chatTypeFilter === 'ai' ? 'bg-teal-400 text-black font-semibold' : 'bg-white/[0.05] text-neutral-300'
                    }`}
                  >
                    🤖 Chatbot AI ({leads.filter((l) => l.type !== 'telegram').length})
                  </button>
                  <button
                    onClick={() => setChatTypeFilter('telegram')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      chatTypeFilter === 'telegram' ? 'bg-teal-400 text-black font-semibold' : 'bg-white/[0.05] text-neutral-300'
                    }`}
                  >
                    ✈️ Telegram ({leads.filter((l) => l.type === 'telegram').length})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leads
                  .filter((l) => chatTypeFilter === 'all' || (chatTypeFilter === 'telegram' ? l.type === 'telegram' : l.type !== 'telegram'))
                  .map((lead) => (
                    <div key={lead.id} className="p-5 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[10px] text-teal-400 font-bold">
                            {lead.type === 'telegram' ? '✈️ Telegram Live' : '🤖 AI Assistant'}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">{new Date(lead.createdAt).toLocaleDateString('it-IT')}</span>
                        </div>
                        <h3 className="font-bold text-white text-sm">{lead.name || 'Visitatore Anonimo'}</h3>
                        {lead.email && <p className="text-xs text-teal-300 mt-0.5">{lead.email}</p>}
                        {lead.phone && <p className="text-xs text-neutral-400">{lead.phone}</p>}
                        <div className="mt-3 p-3 rounded-2xl bg-black/40 border border-white/[0.05] text-xs text-neutral-300 leading-relaxed">
                          {lead.summary || 'Nessun riepilogo generato.'}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-white/[0.06] text-[11px] text-neutral-400 font-mono">
                        Session: {lead.sessionId.slice(0, 12)}...
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 6: CMS FAQ & RECENSIONI
             ═══════════════════════════════════════════════════════ */}
          {activeTab === 'cms' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">CMS Contenuti (FAQ & Testimonianze)</h1>
                  <p className="text-xs text-neutral-400 mt-1">Modifica testi, traduzioni e loghi aziendali visibili sul sito.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCmsSubTab('faqs')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      cmsSubTab === 'faqs' ? 'bg-teal-400 text-black shadow-md' : 'bg-white/[0.05] text-neutral-300'
                    }`}
                  >
                    FAQ ({faqs.length})
                  </button>
                  <button
                    onClick={() => setCmsSubTab('reviews')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      cmsSubTab === 'reviews' ? 'bg-teal-400 text-black shadow-md' : 'bg-white/[0.05] text-neutral-300'
                    }`}
                  >
                    Recensioni ({reviews.length})
                  </button>
                </div>
              </div>

              {/* FAQs SubTab */}
              {cmsSubTab === 'faqs' && (
                <div className="space-y-4">
                  {faqs.map((f) => (
                    <div key={f.id} className="p-5 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/[0.06] text-teal-300 font-bold">
                            {f.category}
                          </span>
                          <h3 className="font-bold text-white text-sm mt-2">{f.questionIt}</h3>
                          <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{f.answerIt}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reviews SubTab */}
              {cmsSubTab === 'reviews' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reviews.map((r) => (
                    <div key={r.id} className="p-5 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1 text-teal-400 text-xs">
                            {Array.from({ length: r.rating || 5 }).map((_, idx) => (
                              <span key={idx}>★</span>
                            ))}
                          </div>
                          {r.companyLogo && (
                            <img src={r.companyLogo} alt={r.company || ''} className="h-6 w-auto object-contain opacity-80" />
                          )}
                        </div>
                        <p className="text-xs text-neutral-200 italic leading-relaxed mb-4">&ldquo;{r.quoteIt}&rdquo;</p>
                        <div>
                          <p className="font-bold text-white text-xs">{r.author}</p>
                          <p className="text-[11px] text-neutral-400">{r.role} {r.company ? `• ${r.company}` : ''}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 7: SALUTE & SPEED INSIGHTS
             ═══════════════════════════════════════════════════════ */}
          {activeTab === 'health' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Salute del Sistema & Speed Insights</h1>
                  <p className="text-xs text-neutral-400 mt-1">Indicatori Core Web Vitals, latenza del database e deployment edge.</p>
                </div>
                <button
                  onClick={fetchHealth}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-neutral-300 flex items-center gap-1.5"
                >
                  <TiaIcon icon={RefreshIcon} size={14} />
                  <span>Riesegui Benchmark</span>
                </button>
              </div>

              {/* Web Vitals Scorecards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: 'TTFB (First Byte)', value: '180 ms', status: 'Ottimo', target: '< 200 ms' },
                  { label: 'FCP (First Contentful)', value: '0.8 s', status: 'Ottimo', target: '< 1.8 s' },
                  { label: 'LCP (Largest Contentful)', value: '1.4 s', status: 'Ottimo', target: '< 2.5 s' },
                  { label: 'INP (Interaction Next)', value: '48 ms', status: 'Ottimo', target: '< 200 ms' },
                  { label: 'CLS (Cumulative Shift)', value: '0.01', status: 'Ottimo', target: '< 0.1' },
                ].map((m, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-medium block">{m.label}</span>
                      <span className="text-xl font-bold text-teal-400 font-mono mt-1 block">{m.value}</span>
                    </div>
                    <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px]">
                      <span className="text-teal-300 font-semibold">{m.status}</span>
                      <span className="text-neutral-500 font-mono">{m.target}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Edge status */}
              <div className="p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl">
                <h3 className="font-bold text-white text-sm mb-3">Infrastruttura & Connessioni</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.05]">
                    <span className="text-neutral-400 block mb-1">Vercel Edge Network</span>
                    <span className="text-teal-400 font-bold">Attivo · HTTP/3 QUIC</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.05]">
                    <span className="text-neutral-400 block mb-1">Turso LibSQL Database</span>
                    <span className="text-teal-400 font-bold">AWS EU-West-1 (Healthy)</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.05]">
                    <span className="text-neutral-400 block mb-1">Passkey WebAuthn Auth</span>
                    <span className="text-teal-400 font-bold">FIDO2 / Biometric Live</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 8: PASSKEYS & SICUREZZA
             ═══════════════════════════════════════════════════════ */}
          {activeTab === 'passkeys' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Dispositivi & Sicurezza Master</h1>
                  <p className="text-xs text-neutral-400 mt-1">Gestione delle chiavi di accesso biometriche registrate e codici di emergenza.</p>
                </div>
                <button
                  type="button"
                  onClick={handleRegisterNewPasskey}
                  className="px-4 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-semibold shadow-md shadow-teal-400/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <TiaIcon icon={PlusSignIcon} size={16} />
                  <span>+ Aggiungi un altro dispositivo</span>
                </button>
              </div>

              {/* Passkeys registered list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {passkeys.map((pk) => (
                  <div key={pk.id} className="p-5 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                        <TiaIcon icon={Shield01Icon} size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{pk.nickname || 'Dispositivo Master Autenticato'}</h3>
                        <p className="text-[11px] text-neutral-400 font-mono">ID: {pk.credentialID.slice(0, 16)}...</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">Creato: {new Date(pk.createdAt).toLocaleDateString('it-IT')}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 text-[10px] font-mono font-bold border border-teal-500/20">
                      Attivo
                    </span>
                  </div>
                ))}
              </div>

              {/* Recovery codes generator */}
              <div className="p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">Codici di Recupero di Emergenza</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Genera 5 codici monouso da salvare in un luogo sicuro per accedere in caso di smarrimento dei dispositivi biometrici.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateRecoveryCodes}
                    disabled={isGeneratingCodes}
                    className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 text-xs text-white font-semibold cursor-pointer"
                  >
                    {isGeneratingCodes ? 'Generazione...' : 'Genera Nuovi Codici'}
                  </button>
                </div>

                {recoveryCodes.length > 0 && (
                  <div className="p-4 rounded-2xl bg-black/60 border border-teal-400/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-center animate-in fade-in duration-300">
                    {recoveryCodes.map((code, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-teal-950/40 border border-teal-500/20 text-teal-300 font-mono text-xs font-bold">
                        {code}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Project Modal */}
          {showProjectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="bg-[#081410] border border-teal-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <h3 className="font-bold text-white text-base">
                    {editingProjectId ? 'Modifica Progetto' : 'Nuovo Progetto Portfolio'}
                  </h3>
                  <button onClick={() => setShowProjectModal(false)} className="text-neutral-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Titolo Progetto *</label>
                    <input
                      type="text"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      placeholder="Es. GSA Hotels"
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Descrizione Breve *</label>
                    <input
                      type="text"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Descrizione di 1-2 righe..."
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Thumbnail (Conversione automatica in WebP)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="text-xs text-neutral-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-teal-400/20 file:text-teal-300 file:font-semibold"
                      />
                    </div>
                    {isUploadingImage && <p className="text-[11px] text-teal-400 mt-1 animate-pulse">Conversione WebP e caricamento...</p>}
                    {projectThumbnail && (
                      <img src={projectThumbnail} alt="Preview" className="mt-2 h-20 rounded-xl object-cover border border-white/10" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">URL Sito Live</label>
                      <input
                        type="url"
                        value={projectUrl}
                        onChange={(e) => setProjectUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">URL GitHub</label>
                      <input
                        type="url"
                        value={projectGithubUrl}
                        onChange={(e) => setProjectGithubUrl(e.target.value)}
                        placeholder="https://github.com/..."
                        className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={projectFeatured}
                        onChange={(e) => setProjectFeatured(e.target.checked)}
                        className="rounded text-teal-400"
                      />
                      <span>Mostra in Evidenza (Featured)</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setShowProjectModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-xs text-neutral-300"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProject}
                    className="px-5 py-2 rounded-xl bg-teal-400 text-black text-xs font-bold shadow-md"
                  >
                    Salva Progetto
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
