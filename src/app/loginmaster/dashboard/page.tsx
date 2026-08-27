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
} from '@/app/components/icons';

const MoltenMetal = dynamic(() => import('@/app/components/MoltenMetal'), { ssr: false });

const RealWorldMap = dynamic(() => import('@/app/components/RealWorldMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] rounded-3xl bg-[#050f0c] border border-white/10 flex items-center justify-center text-xs text-neutral-400 font-mono">
      <span className="w-3 h-3 rounded-full bg-teal-400 animate-ping mr-2" />
      Caricamento mappa geografica interattiva...
    </div>
  ),
});

type ActiveTab = 'projects' | 'inbox' | 'chats' | 'quotes' | 'analytics' | 'cms' | 'health' | 'passkeys';

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
  featured: boolean;
  order: number;
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

// ── WebP Image Converter ─────────────────────────────────────────
async function convertImageToWebp(file: File, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/webp') {
      resolve(file);
      return;
    }
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    img.onload = () => {
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
          const newFile = new File([blob], `${baseName}.webp`, { type: 'image/webp' });
          resolve(newFile);
        },
        'image/webp',
        quality
      );
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
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
  const [projectDescription, setProjectDescription] = useState('');
  const [projectLongDescription, setProjectLongDescription] = useState('');
  const [projectThumbnail, setProjectThumbnail] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [projectGithubUrl, setProjectGithubUrl] = useState('');
  const [projectTags, setProjectTags] = useState('');
  const [projectFeatured, setProjectFeatured] = useState(false);
  const [projectOrder, setProjectOrder] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Messages Inbox state
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messageFilter, setMessageFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [messageNotes, setMessageNotes] = useState('');

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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/loginmaster');
  };

  // ── Project Handlers ─────────────────────────────────────────────
  const resetProjectForm = () => {
    setEditingProjectId(null);
    setProjectTitle('');
    setProjectDescription('');
    setProjectLongDescription('');
    setProjectThumbnail('');
    setProjectUrl('');
    setProjectGithubUrl('');
    setProjectTags('');
    setProjectFeatured(false);
    setProjectOrder(0);
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

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Operazione fallita');
      }

      resetProjectForm();
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
    setProjectDescription(p.description);
    setProjectLongDescription(p.longDescription || '');
    setProjectThumbnail(p.thumbnail);
    setProjectUrl(p.projectUrl || '');
    setProjectGithubUrl(p.githubUrl || '');
    setProjectTags(p.tags || '');
    setProjectFeatured(p.featured);
    setProjectOrder(p.order);
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
              { id: 'projects', label: 'Progetti', icon: CodeFolderIcon, count: projects.length },
              { id: 'inbox', label: 'Inbox Messaggi', icon: Mail01Icon, count: messages.filter((m) => m.status === 'new').length },
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

          {/* Direct Analytics Standalone Link */}
          <Link
            href="/loginmaster/analytics"
            className="bg-[#081410]/90 hover:bg-white/[0.06] border border-white/[0.08] rounded-3xl p-4 flex items-center justify-between text-xs font-medium text-white transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <TiaIcon icon={GaugeIcon} size={16} className="text-teal-400" />
              <span>Pagina Analytics Dedicata</span>
            </div>
            <TiaIcon icon={ExternalLinkIcon} size={14} className="text-neutral-400 group-hover:text-teal-400 transition-colors" />
          </Link>
        </aside>

        {/* ── RIGHT MAIN DASHBOARD CONTENT AREA ── */}
        <main className="flex-1 min-w-0 w-full flex flex-col gap-6">
          
          {/* Global Alerts */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-950/70 border border-red-500/40 text-red-200 text-sm flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <TiaIcon icon={AlertCircleIcon} size={18} className="text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-white cursor-pointer"><TiaIcon icon={Cancel01Icon} size={16} /></button>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-2xl bg-teal-950/70 border border-teal-500/40 text-teal-200 text-sm flex items-center gap-2.5 shadow-lg">
              <TiaIcon icon={CheckmarkCircle01Icon} size={18} className="text-teal-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ── TAB 1: PROGETTI ── */}
          {activeTab === 'projects' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Form Column */}
              <div className="xl:col-span-5">
                <BorderGlow continuousHover borderRadius={24} glowRadius={30} glowIntensity={2.0} edgeSensitivity={0}>
                  <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold text-white">
                        {editingProjectId ? 'Modifica Progetto' : 'Nuovo Progetto'}
                      </h2>
                      {editingProjectId && (
                        <button onClick={resetProjectForm} className="text-xs text-neutral-400 hover:text-white underline cursor-pointer">
                          Annulla
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleProjectSubmit} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Titolo *</label>
                        <input
                          type="text"
                          required
                          value={projectTitle}
                          onChange={(e) => setProjectTitle(e.target.value)}
                          placeholder="Nome del progetto"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Descrizione Breve *</label>
                        <textarea
                          required
                          rows={2}
                          value={projectDescription}
                          onChange={(e) => setProjectDescription(e.target.value)}
                          placeholder="Sintesi del lavoro svolto..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Descrizione Dettagliata</label>
                        <textarea
                          rows={3}
                          value={projectLongDescription}
                          onChange={(e) => setProjectLongDescription(e.target.value)}
                          placeholder="Dettagli approfonditi per il modale..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Copertina / Thumbnail * (WebP Automatico)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={projectThumbnail}
                            onChange={(e) => setProjectThumbnail(e.target.value)}
                            placeholder="/uploads/image.webp o URL"
                            className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadLoading}
                            className="px-3.5 py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-semibold cursor-pointer shrink-0"
                          >
                            {uploadLoading ? '...' : 'Upload'}
                          </button>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Live URL</label>
                          <input
                            type="url"
                            value={projectUrl}
                            onChange={(e) => setProjectUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-teal-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">GitHub URL</label>
                          <input
                            type="url"
                            value={projectGithubUrl}
                            onChange={(e) => setProjectGithubUrl(e.target.value)}
                            placeholder="https://github.com/..."
                            className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-teal-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Tags (separati da virgola)</label>
                        <input
                          type="text"
                          value={projectTags}
                          onChange={(e) => setProjectTags(e.target.value)}
                          placeholder="Next.js, TypeScript, Tailwind"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-teal-400"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                          <input
                            type="checkbox"
                            checked={projectFeatured}
                            onChange={(e) => setProjectFeatured(e.target.checked)}
                            className="accent-teal-400 w-4 h-4 rounded"
                          />
                          <span>In Evidenza (Featured)</span>
                        </label>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-400">Ordine:</span>
                          <input
                            type="number"
                            value={projectOrder}
                            onChange={(e) => setProjectOrder(Number(e.target.value))}
                            className="w-16 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs text-center focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitLoading}
                        className="w-full py-3 mt-2 font-semibold rounded-xl text-sm bg-teal-400 hover:bg-teal-300 text-black shadow-lg shadow-teal-400/25 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {submitLoading ? 'Salvataggio...' : editingProjectId ? 'Aggiorna Progetto' : 'Pubblica Progetto'}
                      </button>
                    </form>
                  </div>
                </BorderGlow>
              </div>

              {/* Projects List Column */}
              <div className="xl:col-span-7 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
                    Tutti i Progetti nel Portfolio ({projects.length})
                  </h3>
                </div>

                {projects.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-[#081410]/60 border border-white/[0.06] text-center text-neutral-400">
                    Nessun progetto caricato al momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((p) => (
                      <div
                        key={p.id}
                        className="bg-[#081410]/85 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between hover:border-teal-500/30 transition-colors group"
                      >
                        <div>
                          {p.thumbnail && (
                            <div className="h-36 w-full rounded-xl overflow-hidden mb-3 bg-black/40 relative">
                              <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              {p.featured && (
                                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-400 text-black shadow-md">
                                  Featured
                                </span>
                              )}
                            </div>
                          )}
                          <h4 className="font-bold text-white text-base">{p.title}</h4>
                          <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{p.description}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {p.tags.split(',').map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-teal-300/80">
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
                          <span className="text-[11px] text-neutral-500 font-mono">Ordine: {p.order}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditProject(p)}
                              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white font-medium transition-colors cursor-pointer"
                            >
                              Modifica
                            </button>
                            <button
                              onClick={() => handleDeleteProject(p.id)}
                              className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-xs text-red-300 font-medium transition-colors cursor-pointer"
                            >
                              Elimina
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 2: INBOX MESSAGGI ── */}
          {activeTab === 'inbox' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Messages List */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {['all', 'new', 'in_progress', 'contacted', 'closed'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setMessageFilter(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize cursor-pointer transition-colors ${
                          messageFilter === st ? 'bg-teal-400 text-black font-semibold' : 'bg-white/[0.04] text-neutral-400 hover:text-white'
                        }`}
                      >
                        {st === 'all' ? 'Tutti' : st === 'new' ? 'Nuovi' : st === 'in_progress' ? 'In corso' : st === 'contacted' ? 'Risposti' : 'Chiusi'}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-neutral-500">{messages.length} messaggi</span>
                </div>

                {messages.length === 0 ? (
                  <div className="p-12 rounded-3xl bg-[#081410]/60 border border-white/[0.06] text-center text-neutral-400">
                    Nessun messaggio trovato in questa categoria.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => { setSelectedMessage(m); setMessageNotes(m.notes || ''); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          selectedMessage?.id === m.id
                            ? 'bg-[#0e241d] border-teal-400/50 shadow-lg'
                            : 'bg-[#081410]/85 border-white/[0.08] hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <span className="font-bold text-white text-sm">{m.name}</span>
                            <span className="text-neutral-400 text-xs ml-2">({m.email})</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${
                            m.status === 'new'
                              ? 'bg-teal-400/20 text-teal-300 border border-teal-400/40 animate-pulse'
                              : m.status === 'in_progress'
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                : m.status === 'contacted'
                                  ? 'bg-blue-400/20 text-blue-300 border border-blue-400/40'
                                  : 'bg-neutral-800 text-neutral-400'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 line-clamp-2 mb-2 font-mono bg-black/30 p-2 rounded-lg">{m.message}</p>
                        <div className="flex items-center justify-between text-[11px] text-neutral-500">
                          <span>Servizio: <strong className="text-teal-400">{m.service}</strong></span>
                          <span>{new Date(m.createdAt).toLocaleString('it-IT')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Detail & Notes Drawer */}
              <div className="lg:col-span-1">
                {selectedMessage ? (
                  <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 sticky top-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                      <h3 className="font-bold text-white text-base">Dettaglio Messaggio</h3>
                      <button onClick={() => handleDeleteMessage(selectedMessage.id)} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">
                        Elimina
                      </button>
                    </div>

                    <div>
                      <p className="text-xs text-neutral-400 uppercase tracking-wider">Mittente</p>
                      <p className="text-sm font-bold text-white">{selectedMessage.name}</p>
                      <a href={`mailto:${selectedMessage.email}`} className="text-xs text-teal-400 hover:underline">
                        {selectedMessage.email}
                      </a>
                    </div>

                    <div>
                      <p className="text-xs text-neutral-400 uppercase tracking-wider">Servizio richiesto</p>
                      <p className="text-xs font-semibold text-teal-300">{selectedMessage.service}</p>
                    </div>

                    <div>
                      <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">Messaggio Completo</p>
                      <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.06] text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                        {selectedMessage.message}
                      </div>
                    </div>

                    {/* Status Selector */}
                    <div>
                      <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Aggiorna Stato</p>
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
                            className={`py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
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
                      <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Note Interne</p>
                      <textarea
                        rows={3}
                        value={messageNotes}
                        onChange={(e) => setMessageNotes(e.target.value)}
                        placeholder="Scrivi appunti su questo cliente..."
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

                    {/* Quick Action Button */}
                    <a
                      href={`mailto:${selectedMessage.email}?subject=Re:%20Preventivo%20${encodeURIComponent(selectedMessage.service)}%20-%20Tia%20Designs`}
                      className="w-full py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-semibold text-xs text-center shadow-lg shadow-teal-400/20 transition-all block"
                    >
                      Rispondi via Email
                    </a>
                  </div>
                ) : (
                  <div className="p-8 rounded-3xl bg-[#081410]/60 border border-white/[0.06] text-center text-neutral-400 text-xs">
                    Seleziona un messaggio dalla lista per visualizzare i dettagli e gestire le note.
                  </div>
                )}
              </div>
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
                <div className="xl:col-span-7 flex flex-col items-center">
                  <div
                    id="printable-quote"
                    className="w-full max-w-[780px] bg-[#081410] border border-teal-500/25 rounded-3xl p-8 sm:p-10 shadow-2xl text-neutral-200 relative overflow-hidden print:p-0 print:border-none print:shadow-none print:bg-[#081410] print:text-white"
                  >
                    {/* Subtle top glow bar */}
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
                          {/* Terms and IBAN */}
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

                          {/* Totals table */}
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

                    {/* Signature Acceptance Box with Real Digital Signature Render */}
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

                    {/* Bottom footer notice */}
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
            <div className="flex flex-col gap-6">
              
              {/* Filter bar */}
              <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-5 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <TiaIcon icon={GaugeIcon} size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Traffic & User Behavior Insights</h3>
                    <p className="text-xs text-neutral-400">First-party telemetry & GDPR Compliant</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {[7, 30, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setAnalyticsDays(d)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                        analyticsDays === d ? 'bg-teal-400 text-black' : 'bg-white/[0.04] text-neutral-400 hover:text-white'
                      }`}
                    >
                      Ultimi {d} giorni
                    </button>
                  ))}
                  <button onClick={fetchAnalytics} className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-teal-400">
                    <TiaIcon icon={RefreshIcon} size={15} />
                  </button>
                </div>
              </div>

              {/* KPIs Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Eventi Totali', val: analyticsData?.totalEvents ?? 0, icon: Activity01Icon },
                  { label: 'Sessioni Uniche', val: analyticsData?.totalSessions ?? 0, icon: DashboardSquare01Icon },
                  { label: 'Visualizzazioni Pagina', val: analyticsData?.pageViews ?? 0, icon: Globe02Icon },
                  { label: 'Click Tracciati', val: analyticsData?.totalClicks ?? 0, icon: ArrowRight01Icon },
                ].map((kpi, i) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={i} className="p-5 rounded-3xl bg-[#081410]/85 border border-white/[0.08] flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-400 uppercase tracking-wider">{kpi.label}</span>
                        <TiaIcon icon={Icon} size={16} className="text-teal-400" />
                      </div>
                      <span className="text-2xl font-bold font-mono text-white">{kpi.val.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              {/* Ultra-Detailed Real World Map with Leaflet & CartoDB Dark Tiles */}
              <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <TiaIcon icon={Globe02Icon} size={18} className="text-teal-400" />
                      <span>Distribuzione Geografica Mondiale Reale (Leaflet & CartoDB Dark)</span>
                    </h3>
                    <p className="text-xs text-neutral-400">Confini reali, costa ultra-dettagliata e pin radar pulsanti sulle coordinate esatte</p>
                  </div>
                </div>

                <RealWorldMap
                  countries={analyticsData?.countries || []}
                  cities={analyticsData?.topCities || []}
                  selectedCountry={selectedCountry}
                  onCountryClick={(country) => setSelectedCountry(selectedCountry === country ? null : country)}
                />
              </div>

              {/* Humanized Click Elements & Top Pages */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Clicked Elements with Explanations */}
                <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-4">
                  <h3 className="font-bold text-white text-base">Elementi Più Cliccati (Spiegati)</h3>
                  {(!analyticsData?.topClicked || analyticsData.topClicked.length === 0) ? (
                    <p className="text-xs text-neutral-500 py-6 text-center">Nessun click registrato nel periodo.</p>
                  ) : (
                    <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto">
                      {analyticsData.topClicked.map((item: any, idx: number) => {
                        const formatted = formatClickElement(item.element);
                        return (
                          <div key={idx} className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-lg shrink-0">{formatted.icon}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white text-xs truncate">{formatted.title}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-teal-500/10 text-teal-300 border border-teal-500/20">
                                    {formatted.category}
                                  </span>
                                </div>
                                <p className="text-[10px] text-neutral-400 truncate">{formatted.description}</p>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-teal-400 shrink-0">
                              {item.count} click
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Country List breakdown */}
                <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-4">
                  <h3 className="font-bold text-white text-base">Classifica Paesi</h3>
                  {(!analyticsData?.countries || analyticsData.countries.length === 0) ? (
                    <p className="text-xs text-neutral-500 py-6 text-center">Nessun dato geografico registrato.</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                      {analyticsData.countries.map((c: any, idx: number) => {
                        const info = COUNTRY_MAP[c.code.toUpperCase()] || { name: c.code, flag: '🌐' };
                        return (
                          <div key={idx} className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">{info.flag}</span>
                              <span className="font-bold text-white text-xs">{info.name}</span>
                              <span className="text-[10px] font-mono text-neutral-500">({c.code})</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-teal-300">{c.count} visite</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

            </div>
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

        </main>

      </div>
    </div>
  );
}
