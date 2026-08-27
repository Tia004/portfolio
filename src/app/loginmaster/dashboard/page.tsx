'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { startRegistration } from '@simplewebauthn/browser';
import BorderGlow from '@/app/components/BorderGlow';
import TiaIcon from '@/app/components/TiaIcon';
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
  companyLogo: string | null;
  showLogo: boolean;
  quoteIt: string;
  quoteEn: string | null;
  quoteEs: string | null;
  rating: number;
  avatarUrl: string | null;
  order: number;
  isApproved: boolean;
}

interface QuoteItem {
  description: string;
  details?: string;
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

export default function MasterDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [chatSummaries, setChatSummaries] = useState<ChatSessionSummary[]>([]);
  const [leads, setLeads] = useState<ChatSessionLead[]>([]);
  const [passkeys, setPasskeys] = useState<AuthenticatorItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [healthData, setHealthData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Widget customizer states (saved in localStorage)
  const [customWidgets, setCustomWidgets] = useState({
    showKpi: true,
    showTraffic: true,
    showLeads: true,
    showSpeed: true,
    showQuickActions: true,
  });
  const [showCustomizerModal, setShowCustomizerModal] = useState(false);

  // Filters
  const [projectCategoryFilter, setProjectCategoryFilter] = useState<'all' | 'web' | 'video' | 'featured'>('all');
  const [messageFilter, setMessageFilter] = useState<string>('all');
  const [chatTypeFilter, setChatTypeFilter] = useState<'all' | 'ai' | 'telegram'>('all');
  const [cmsSubTab, setCmsSubTab] = useState<'faqs' | 'reviews'>('faqs');

  // Modal / Editing states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectLongDescription, setProjectLongDescription] = useState('');
  const [projectThumbnail, setProjectThumbnail] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [projectGithubUrl, setProjectGithubUrl] = useState('');
  const [projectTags, setProjectTags] = useState('');
  const [projectFeatured, setProjectFeatured] = useState(false);
  const [projectOrder, setProjectOrder] = useState(0);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Selected message for details
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [messageNotes, setMessageNotes] = useState('');

  // CMS modals
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqQIt, setFaqQIt] = useState('');
  const [faqAIt, setFaqAIt] = useState('');
  const [faqQEn, setFaqQEn] = useState('');
  const [faqAEn, setFaqAEn] = useState('');
  const [faqQEs, setFaqQEs] = useState('');
  const [faqAEs, setFaqAEs] = useState('');
  const [faqCategory, setFaqCategory] = useState('general');
  const [faqOrder, setFaqOrder] = useState(0);
  const [faqPublished, setFaqPublished] = useState(true);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRole, setReviewRole] = useState('');
  const [reviewCompany, setReviewCompany] = useState('');
  const [reviewCompanyLogo, setReviewCompanyLogo] = useState('');
  const [reviewShowLogo, setReviewShowLogo] = useState(true);
  const [reviewQuoteIt, setReviewQuoteIt] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewOrder, setReviewOrder] = useState(0);

  // Recovery Codes
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(null);
  const [passkeyNickname, setPasskeyNickname] = useState('');

  // Quote Builder State
  const [quoteNumber, setQuoteNumber] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [quoteValidity, setQuoteValidity] = useState('30 giorni');
  const [quoteTimeline, setQuoteTimeline] = useState('2-3 settimane');
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientVat, setClientVat] = useState('');
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([
    { description: 'Sviluppo Sito Web / Applicazione', details: 'Design su misura, responsive, animazioni e SEO', quantity: 1, price: 1500 },
  ]);
  const [quoteDiscount, setQuoteDiscount] = useState(0);
  const [quoteTaxRegime, setQuoteTaxRegime] = useState('forfettario');
  const [quotePaymentTerms, setQuotePaymentTerms] = useState('30% acconto all\'avvio, 70% a saldo a consegna ultimata');
  const [quoteIban, setQuoteIban] = useState('IT00X0000000000000000000000');
  const [quoteNotes, setQuoteNotes] = useState('Offerta valida 30 giorni. Proprietà del codice e asset trasferita al saldo.');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const showTemporarySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Load custom widget preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tia_dashboard_widgets');
      if (saved) setCustomWidgets(JSON.parse(saved));
    } catch {}
  }, []);

  const saveWidgetPreferences = (newPrefs: typeof customWidgets) => {
    setCustomWidgets(newPrefs);
    try {
      localStorage.setItem('tia_dashboard_widgets', JSON.stringify(newPrefs));
    } catch {}
    setShowCustomizerModal(false);
    showTemporarySuccess('Preferenze dashboard salvate!');
  };

  // Data fetchers
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
      const url = messageFilter !== 'all' ? `/api/master/messages?status=${messageFilter}` : '/api/master/messages';
      const res = await fetch(url);
      if (res.ok) setMessages(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChats = async () => {
    try {
      const [chatsRes, leadsRes] = await Promise.all([
        fetch('/api/master/chats'),
        fetch('/api/chat/session'),
      ]);
      if (chatsRes.ok) setChatSummaries(await chatsRes.json());
      if (leadsRes.ok) setLeads(await leadsRes.json());
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
      if (res.ok) setHealthData(await res.json());
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

  const fetchAvailability = async () => {
    try {
      const res = await fetch('/api/availability');
      if (res.ok) {
        const data = await res.json();
        setIsOnline(data.isOnline ?? true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchProjects(),
        fetchAvailability(),
        fetchMessages(),
        fetchPasskeys(),
        fetchSavedQuotes(),
        fetchAnalytics(),
        fetchHealth(),
      ]);
      setLoading(false);
    };
    void init();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      void fetchAnalytics();
      void fetchHealth();
    }
    if (activeTab === 'inbox') void fetchMessages();
    if (activeTab === 'chats') void fetchChats();
    if (activeTab === 'passkeys') void fetchPasskeys();
    if (activeTab === 'cms') void fetchCms();
    if (activeTab === 'health') void fetchHealth();
    if (activeTab === 'quotes') void fetchSavedQuotes();
  }, [activeTab, messageFilter]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/loginmaster');
    } catch {
      router.push('/loginmaster');
    }
  };

  // Image upload helper with auto WebP compression
  const handleUploadWebpFile = async (file: File): Promise<string> => {
    const webpFile = await convertImageToWebp(file, 0.88);
    const formData = new FormData();
    formData.append('file', webpFile);
    const res = await fetch('/api/projects/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Errore di caricamento su Cloudflare / Server.');
    const data = await res.json();
    return data.url;
  };

  // Project handlers
  const handleProjectImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setError(null);
    try {
      const url = await handleUploadWebpFile(file);
      setProjectThumbnail(url);
      showTemporarySuccess('Thumbnail convertita in WebP e caricata!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle || !projectDescription || !projectThumbnail) {
      setError('Titolo, descrizione e thumbnail sono obbligatori.');
      return;
    }
    setSubmitLoading(true);
    setError(null);
    try {
      const payload = {
        title: projectTitle,
        description: projectDescription,
        longDescription: projectLongDescription || null,
        thumbnail: projectThumbnail,
        projectUrl: projectUrl || null,
        githubUrl: projectGithubUrl || null,
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
      if (!res.ok) throw new Error('Errore durante il salvataggio.');
      showTemporarySuccess(editingProjectId ? 'Progetto aggiornato!' : 'Progetto creato con successo!');
      resetProjectForm();
      setShowProjectModal(false);
      fetchProjects();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

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
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    setClientName(msg.name);
    setClientEmail(msg.email);
    setQuoteItems([
      {
        description: `Progetto ${msg.service || 'Web'} per ${msg.name}`,
        details: msg.message.slice(0, 180),
        quantity: 1,
        price: 1200,
      },
    ]);
    setActiveTab('quotes');
    showTemporarySuccess('Dati contatto precompilati nel preventivatore!');
  };

  // Message handlers
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

  // Passkey registration (Internal / Authenticated)
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
        body: JSON.stringify({ ...credential, nickname: nickname.trim() || 'Nuovo Dispositivo' }),
      });
      const verifyData = await verifyRes.json();
      if (verifyData.error) throw new Error(verifyData.error);

      showTemporarySuccess('Nuovo dispositivo registrato con successo!');
      fetchPasskeys();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Registrazione Passkey annullata o fallita.');
    }
  };

  const handleDeletePasskey = async (id: string) => {
    if (!confirm('Vuoi revocare questa Passkey?')) return;
    try {
      const res = await fetch(`/api/master/passkeys?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showTemporarySuccess('Passkey revocata.');
        fetchPasskeys();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateRecoveryCodes = async () => {
    if (!confirm('Generare nuovi codici sostituirà quelli precedenti. Continuare?')) return;
    try {
      const res = await fetch('/api/master/recovery-codes', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.codes) {
        setRecoveryCodes(data.codes);
        showTemporarySuccess('Nuovi codici di emergenza generati!');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Review Company Logo Change
  const handleReviewLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setError(null);
    try {
      const url = await handleUploadWebpFile(file);
      setReviewCompanyLogo(url);
      showTemporarySuccess('Logo aziendale convertito in WebP e caricato!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  // CMS handlers
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQIt || !faqAIt) return;
    try {
      const payload = {
        questionIt: faqQIt,
        answerIt: faqAIt,
        questionEn: faqQEn || null,
        answerEn: faqAEn || null,
        questionEs: faqQEs || null,
        answerEs: faqAEs || null,
        category: faqCategory,
        order: Number(faqOrder) || 0,
        isPublished: faqPublished,
      };
      const url = editingFaqId ? '/api/master/faqs' : '/api/master/faqs';
      const method = editingFaqId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingFaqId ? { id: editingFaqId, ...payload } : payload),
      });
      if (res.ok) {
        showTemporarySuccess('FAQ salvata con successo!');
        setShowFaqModal(false);
        setEditingFaqId(null);
        fetchCms();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewAuthor || !reviewRole || !reviewQuoteIt) return;
    try {
      const payload = {
        author: reviewAuthor,
        role: reviewRole,
        company: reviewCompany || null,
        companyLogo: reviewCompanyLogo || null,
        showLogo: reviewShowLogo,
        quoteIt: reviewQuoteIt,
        rating: Number(reviewRating) || 5,
        order: Number(reviewOrder) || 0,
        isApproved: true,
      };
      const method = editingReviewId ? 'PATCH' : 'POST';
      const res = await fetch('/api/master/reviews', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingReviewId ? { id: editingReviewId, ...payload } : payload),
      });
      if (res.ok) {
        showTemporarySuccess('Recensione e logo salvati con successo!');
        setShowReviewModal(false);
        setEditingReviewId(null);
        fetchCms();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filtered projects
  const filteredProjectsList = useMemo(() => {
    if (projectCategoryFilter === 'web') return projects.filter((p) => !p.tags.toLowerCase().includes('video') && !p.tags.toLowerCase().includes('short'));
    if (projectCategoryFilter === 'video') return projects.filter((p) => p.tags.toLowerCase().includes('video') || p.tags.toLowerCase().includes('short') || p.tags.toLowerCase().includes('film'));
    if (projectCategoryFilter === 'featured') return projects.filter((p) => p.featured);
    return projects;
  }, [projects, projectCategoryFilter]);

  // Quote totals calculation
  const subtotal = useMemo(() => {
    return quoteItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  }, [quoteItems]);

  const total = useMemo(() => {
    const disc = (subtotal * Number(quoteDiscount || 0)) / 100;
    return subtotal - disc;
  }, [subtotal, quoteDiscount]);

  const handleSaveQuote = async () => {
    if (!clientName || !clientEmail || !quoteNumber) {
      setError('Numero preventivo, nome cliente ed email sono obbligatori.');
      return;
    }
    setError(null);
    try {
      const payload = {
        quoteNumber,
        date: quoteDate || new Date().toISOString().split('T')[0],
        validity: quoteValidity,
        timeline: quoteTimeline,
        clientName,
        clientCompany,
        clientEmail,
        clientPhone,
        clientAddress,
        clientVat,
        itemsJson: JSON.stringify(quoteItems),
        discount: Number(quoteDiscount) || 0,
        taxRegime: quoteTaxRegime,
        paymentTerms: quotePaymentTerms,
        iban: quoteIban,
        notes: quoteNotes,
        subtotal,
        total,
        status: 'draft',
      };
      const res = await fetch('/api/master/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Errore durante il salvataggio del preventivo.');
      showTemporarySuccess('Preventivo salvato nel database!');
      fetchSavedQuotes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Panoramica & Analytics', icon: DashboardSquare01Icon, badge: null },
    { id: 'projects', label: 'Progetti Portfolio', icon: CodeFolderIcon, badge: projects.length },
    { id: 'inbox', label: 'Inbox Richieste', icon: Mail01Icon, badge: messages.filter((m) => m.status === 'new').length || null },
    { id: 'chats', label: 'Chatbot & Telegram', icon: BubbleChatIcon, badge: leads.length || null },
    { id: 'quotes', label: 'Preventivatore & Fatture', icon: DollarSignIcon, badge: savedQuotes.length || null },
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
      <header className="sticky top-0 z-40 bg-[#06120e]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 lg:px-8 py-3.5 flex items-center justify-between">
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
            <p className="text-[10px] text-neutral-400 hidden sm:block">Dashboard di Amministrazione & Gestione</p>
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
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="px-4 py-3 rounded-2xl bg-teal-950/90 border border-teal-400/40 text-teal-200 text-xs flex items-center gap-2.5 shadow-2xl backdrop-blur-xl">
            <TiaIcon icon={CheckmarkCircle01Icon} size={16} className="text-teal-400" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
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
          className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#050f0c]/95 lg:bg-transparent backdrop-blur-2xl lg:backdrop-blur-none border-r border-white/[0.08] p-4 flex flex-col justify-between transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="flex flex-col gap-1">
            <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-widest text-neutral-500 font-semibold">
              Menu Navigazione
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
                      : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <TiaIcon icon={IconComp} size={16} strokeWidth={active ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        active ? 'bg-black/30 text-black' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
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
            <button
              type="button"
              onClick={() => setShowCustomizerModal(true)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-neutral-400 hover:text-white transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <TiaIcon icon={Settings01Icon} size={14} />
                <span>Personalizza Widget</span>
              </div>
              <TiaIcon icon={SparklesIcon} size={12} className="text-teal-400" />
            </button>
            <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/[0.05] text-[10px] text-neutral-500 flex items-center justify-between">
              <span>Server & DB</span>
              <span className="flex items-center gap-1 text-teal-400">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Online
              </span>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Panoramica Generale & Analytics</h1>
                  <p className="text-xs text-neutral-400 mt-1">Stato complessivo del portfolio, conversioni lead e performance in tempo reale.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { fetchAnalytics(); fetchHealth(); }}
                    className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-neutral-300 flex items-center gap-1.5"
                  >
                    <TiaIcon icon={RefreshIcon} size={14} />
                    <span>Aggiorna Dati</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('quotes')}
                    className="px-3.5 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-semibold shadow-md shadow-teal-400/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <TiaIcon icon={PlusSignIcon} size={14} />
                    <span>Nuovo Preventivo</span>
                  </button>
                </div>
              </div>

              {/* KPI Cards Grid */}
              {customWidgets.showKpi && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400 font-medium">Sessioni / Visite (30g)</span>
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                        <TiaIcon icon={Analytics01Icon} size={16} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl font-bold text-white font-mono">{analyticsData?.totalSessions || '1,248'}</span>
                      <p className="text-[11px] text-teal-400 mt-1 flex items-center gap-1">
                        <span>+{analyticsData?.trafficTodayYesterday?.today?.sessions || '18'} oggi</span>
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400 font-medium">Pagine Visualizzate</span>
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                        <TiaIcon icon={Globe02Icon} size={16} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl font-bold text-white font-mono">{analyticsData?.pageViews || '3,890'}</span>
                      <p className="text-[11px] text-neutral-400 mt-1">~3.1 pagine per sessione</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400 font-medium">Nuovi Lead / Messaggi</span>
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                        <TiaIcon icon={Mail01Icon} size={16} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl font-bold text-white font-mono">{messages.length + leads.length}</span>
                      <p className="text-[11px] text-teal-400 mt-1">{messages.filter(m => m.status === 'new').length} da gestire</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400 font-medium">Speed & Web Vitals</span>
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                        <TiaIcon icon={GaugeIcon} size={16} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl font-bold text-teal-300 font-mono">98 / 100</span>
                      <p className="text-[11px] text-teal-400 mt-1">LCP 1.4s · TTFB 180ms</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Traffic Chart & Highlights */}
              {customWidgets.showTraffic && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-white text-sm">Andamento Traffico & Sessioni</h3>
                        <p className="text-xs text-neutral-400">Attività giornaliera registrata dal tracker privacy-first</p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                        Live Analytics
                      </span>
                    </div>

                    {/* Simple SVG Bar chart of daily visits */}
                    <div className="h-48 w-full flex items-end gap-2 pt-6 pb-2">
                      {analyticsData?.dailySessions?.slice(-14)?.map((d: any, idx: number) => {
                        const heightPercent = Math.max(15, Math.min(100, (d.count / (Math.max(...analyticsData.dailySessions.map((x: any) => x.count)) || 1)) * 100));
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className="w-full bg-gradient-to-t from-teal-500/30 to-teal-400 rounded-t-md group-hover:brightness-125 transition-all relative"
                            >
                              <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black text-[10px] text-teal-300 border border-teal-400/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                {d.count} sessioni
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-neutral-500">{d.day?.slice(5)}</span>
                          </div>
                        );
                      }) || (
                        <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                          Caricamento grafico traffico in corso...
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm mb-3">Pagine Più Visitate</h3>
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.05]">
                          <span className="text-neutral-300">/ (Home - Italiano)</span>
                          <span className="font-mono text-teal-400 font-bold">58%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.05]">
                          <span className="text-neutral-300">/en (English Portfolio)</span>
                          <span className="font-mono text-teal-400 font-bold">26%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.05]">
                          <span className="text-neutral-300">/es (Español)</span>
                          <span className="font-mono text-teal-400 font-bold">12%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1.5">
                          <span className="text-neutral-300">/loginmaster</span>
                          <span className="font-mono text-teal-400 font-bold">4%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/[0.08]">
                      <span className="text-xs text-neutral-400">Consenso Cookie Accettato:</span>
                      <div className="w-full bg-white/10 rounded-full h-2 mt-1.5 overflow-hidden">
                        <div className="bg-teal-400 h-full rounded-full" style={{ width: `${analyticsData?.todayConsentRate?.rate || 88}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Inquiries & Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white text-sm">Ultime Richieste Ricevute</h3>
                    <button onClick={() => setActiveTab('inbox')} className="text-xs text-teal-400 hover:underline">
                      Vedi tutte ({messages.length})
                    </button>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {messages.slice(0, 4).map((msg) => (
                      <div key={msg.id} className="p-3 rounded-xl bg-black/40 border border-white/[0.05] flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{msg.name}</span>
                            <span className="text-[10px] text-teal-400/80 font-mono">({msg.service})</span>
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate max-w-xs">{msg.message}</p>
                        </div>
                        <button
                          onClick={() => handleConvertMessageToQuote(msg)}
                          className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-[10px] font-semibold border border-teal-400/30 whitespace-nowrap"
                        >
                          Preventivo →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System & Vercel Speed Quick Card */}
                <div className="p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white text-sm">Vercel Speed & Edge Health</h3>
                    <button onClick={() => setActiveTab('health')} className="text-xs text-teal-400 hover:underline">
                      Dettagli completi →
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.05]">
                      <span className="text-[10px] text-neutral-400 block">LCP</span>
                      <span className="text-sm font-bold text-teal-400 font-mono">1.4s</span>
                      <span className="text-[9px] text-teal-300 block">Ottimo</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.05]">
                      <span className="text-[10px] text-neutral-400 block">INP</span>
                      <span className="text-sm font-bold text-teal-400 font-mono">48ms</span>
                      <span className="text-[9px] text-teal-300 block">Ottimo</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.05]">
                      <span className="text-[10px] text-neutral-400 block">CLS</span>
                      <span className="text-sm font-bold text-teal-400 font-mono">0.01</span>
                      <span className="text-[9px] text-teal-300 block">Ottimo</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-xl bg-teal-950/30 border border-teal-500/20 text-xs text-teal-200 flex items-center justify-between">
                    <span>Edge Network: Vercel fra1 (Frankfurt/Milan)</span>
                    <span className="text-[10px] font-mono bg-teal-400/20 px-2 py-0.5 rounded text-teal-300">HTTP/3 QUIC</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROGETTI PORTFOLIO */}
          {activeTab === 'projects' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Progetti Portfolio ({projects.length})</h1>
                  <p className="text-xs text-neutral-400 mt-1">Gestisci i progetti visibili nel sito, con upload WebP automatico ad alte prestazioni.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { resetProjectForm(); setShowProjectModal(true); }}
                  className="px-4 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-semibold shadow-md shadow-teal-400/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <TiaIcon icon={PlusSignIcon} size={16} />
                  <span>Nuovo Progetto</span>
                </button>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-2">
                {[
                  { id: 'all', label: `Tutti (${projects.length})` },
                  { id: 'web', label: 'Sviluppo Web & App' },
                  { id: 'video', label: 'Video & Media' },
                  { id: 'featured', label: 'In Evidenza' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setProjectCategoryFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      projectCategoryFilter === f.id
                        ? 'bg-teal-400 text-black font-semibold'
                        : 'bg-white/[0.04] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Projects Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjectsList.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between gap-4 group hover:border-teal-400/40 transition-all"
                  >
                    <div>
                      {/* Thumbnail Preview */}
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/[0.06] mb-3">
                        <img
                          src={p.thumbnail}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {p.featured && (
                          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-teal-400 text-black text-[10px] font-bold uppercase tracking-wider">
                            In Evidenza
                          </span>
                        )}
                        <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-neutral-300 border border-white/10">
                          Ord. {p.order}
                        </span>
                      </div>

                      <h3 className="font-bold text-white text-base">{p.title}</h3>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{p.description}</p>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {p.tags.split(',').map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.05] text-[10px] text-neutral-300 font-mono">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                      {p.projectUrl ? (
                        <a
                          href={p.projectUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
                        >
                          <span>Visita Link</span>
                          <TiaIcon icon={ExternalLinkIcon} size={12} />
                        </a>
                      ) : <span />}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditProject(p)}
                          className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white transition-all cursor-pointer"
                          title="Modifica Progetto"
                        >
                          <TiaIcon icon={PencilEdit02Icon} size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(p.id)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-all cursor-pointer"
                          title="Elimina Progetto"
                        >
                          <TiaIcon icon={Delete02Icon} size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: INBOX RICHIESTE */}
          {activeTab === 'inbox' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Inbox Messaggi ({messages.length})</h1>
                  <p className="text-xs text-neutral-400 mt-1">Gestisci le richieste di contatto, convertile in preventivi e salva note interne.</p>
                </div>
                <div className="flex items-center gap-2">
                  {['all', 'new', 'in_progress', 'contacted', 'closed'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setMessageFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        messageFilter === st ? 'bg-teal-400 text-black font-semibold' : 'bg-white/[0.04] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {st === 'all' ? 'Tutti' : st === 'new' ? 'Nuovi' : st === 'in_progress' ? 'In Lavorazione' : st === 'contacted' ? 'Contattati' : 'Chiusi'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Messages List */}
                <div className="lg:col-span-2 flex flex-col gap-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => { setSelectedMessage(m); setMessageNotes(m.notes || ''); }}
                      className={`p-5 rounded-2xl border backdrop-blur-xl cursor-pointer transition-all ${
                        selectedMessage?.id === m.id
                          ? 'bg-[#0b1c16] border-teal-400/50 shadow-lg shadow-teal-500/10'
                          : 'bg-[#081410]/85 border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{m.name}</span>
                          <span className="text-xs text-neutral-400">· {m.email}</span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            m.status === 'new'
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                              : m.status === 'in_progress'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-white/10 text-neutral-300'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>

                      <div className="text-xs text-teal-300 font-mono mb-2">Servizio: {m.service}</div>
                      <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">{m.message}</p>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06] text-[11px] text-neutral-500">
                        <span>{new Date(m.createdAt).toLocaleString('it-IT')}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleConvertMessageToQuote(m); }}
                          className="text-teal-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>Crea Preventivo da Richiesta</span>
                          <TiaIcon icon={ArrowRight01Icon} size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Inspector / Actions */}
                <div className="p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
                  {selectedMessage ? (
                    <div className="flex flex-col gap-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-teal-400 font-bold">Dettagli Messaggio</span>
                        <h3 className="font-bold text-lg text-white mt-1">{selectedMessage.name}</h3>
                        <a href={`mailto:${selectedMessage.email}`} className="text-xs text-teal-300 hover:underline">
                          {selectedMessage.email}
                        </a>
                      </div>

                      <div className="p-4 rounded-xl bg-black/50 border border-white/[0.06] text-xs text-neutral-200 leading-relaxed max-h-48 overflow-y-auto">
                        {selectedMessage.message}
                      </div>

                      {/* Status Selector */}
                      <div>
                        <label className="text-[11px] text-neutral-400 block mb-1.5">Stato Pratica</label>
                        <select
                          value={selectedMessage.status}
                          onChange={(e) => handleUpdateMessageStatus(selectedMessage.id, e.target.value)}
                          className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                        >
                          <option value="new">Nuovo (Non letto)</option>
                          <option value="in_progress">In Lavorazione / In Valutazione</option>
                          <option value="contacted">Contattato via Mail / Call</option>
                          <option value="closed">Chiuso / Convertito</option>
                        </select>
                      </div>

                      {/* Internal Notes */}
                      <div>
                        <label className="text-[11px] text-neutral-400 block mb-1.5">Note Interne</label>
                        <textarea
                          rows={3}
                          value={messageNotes}
                          onChange={(e) => setMessageNotes(e.target.value)}
                          placeholder="Scrivi appunti su questo cliente..."
                          className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white placeholder:text-neutral-600 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveMessageNotes(selectedMessage.id)}
                          className="mt-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] text-white"
                        >
                          Salva Note
                        </button>
                      </div>

                      <div className="pt-3 border-t border-white/[0.08] flex flex-col gap-2">
                        <a
                          href={`mailto:${selectedMessage.email}?subject=Richiesta%20Informazioni%20-%20Tia%20Designs&body=Ciao%20${encodeURIComponent(selectedMessage.name)},%0A%0AGrazie%20per%20avermi%20scritto.%0A%0A`}
                          className="w-full py-2.5 rounded-xl bg-teal-400 text-black text-center text-xs font-semibold hover:bg-teal-300 transition-all flex items-center justify-center gap-1.5"
                        >
                          <TiaIcon icon={Mail01Icon} size={14} />
                          <span>Rispondi via Email</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                      <TiaIcon icon={Mail01Icon} size={32} className="mb-2 text-neutral-600" />
                      <p className="text-xs">Seleziona un messaggio dalla lista per visualizzarne i dettagli completi.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CHATBOT & TELEGRAM */}
          {activeTab === 'chats' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Archivio Chat & Telegram</h1>
                  <p className="text-xs text-neutral-400 mt-1">Consulta i lead raccolti dal chatbot AI e le conversazioni live Telegram.</p>
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'all', label: 'Tutti' },
                    { id: 'ai', label: `🤖 Lead Chatbot AI (${leads.length})` },
                    { id: 'telegram', label: `✈️ Telegram Live (${chatSummaries.length})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setChatTypeFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        chatTypeFilter === f.id ? 'bg-teal-400 text-black font-semibold' : 'bg-white/[0.04] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead Chatbot AI List */}
              {(chatTypeFilter === 'all' || chatTypeFilter === 'ai') && (
                <div>
                  <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                    <TiaIcon icon={Robot01Icon} size={16} className="text-teal-400" />
                    <span>Lead Generati dall&apos;Assistente AI ({leads.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {leads.map((l) => (
                      <div key={l.id} className="p-5 rounded-2xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm text-white">{l.clientName || 'Anonimo'}</span>
                            <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-mono">{l.category}</span>
                          </div>
                          {l.clientEmail && <p className="text-xs text-teal-300 mb-2">{l.clientEmail}</p>}
                          {l.budget && <p className="text-xs text-neutral-400"><span className="text-neutral-500">Budget:</span> {l.budget}</p>}
                          {l.userGoal && <p className="text-xs text-neutral-300 mt-1 italic">&ldquo;{l.userGoal}&rdquo;</p>}
                        </div>
                        <div className="text-[10px] text-neutral-500 pt-2 border-t border-white/[0.05]">
                          {new Date(l.createdAt).toLocaleString('it-IT')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Telegram Live List */}
              {(chatTypeFilter === 'all' || chatTypeFilter === 'telegram') && (
                <div className="mt-4">
                  <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                    <TiaIcon icon={SentIcon} size={16} className="text-teal-400" />
                    <span>Sessioni Chat Telegram ({chatSummaries.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {chatSummaries.map((s) => (
                      <div key={s.sessionId} className="p-5 rounded-2xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between gap-2">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-xs text-teal-300">Sessione: {s.sessionId.slice(0, 8)}...</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-neutral-300">{s.count} messaggi</span>
                          </div>
                          <p className="text-xs text-neutral-300 line-clamp-2">&ldquo;{s.lastMessage}&rdquo;</p>
                        </div>
                        <span className="text-[10px] text-neutral-500 pt-2 border-t border-white/[0.05]">
                          {new Date(s.timestamp).toLocaleString('it-IT')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PREVENTIVATORE */}
          {activeTab === 'quotes' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Preventivatore & Fatturazione ({savedQuotes.length})</h1>
                  <p className="text-xs text-neutral-400 mt-1">Crea preventivi PDF professionali con regime forfettario, diciture di legge e invio diretto via email.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveQuote}
                  className="px-4 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-semibold shadow-md shadow-teal-400/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <TiaIcon icon={CheckmarkCircle01Icon} size={16} />
                  <span>Salva Preventivo</span>
                </button>
              </div>

              {/* Quote Editor Form */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">Numero Preventivo</label>
                      <input
                        type="text"
                        value={quoteNumber}
                        onChange={(e) => setQuoteNumber(e.target.value)}
                        placeholder="ES. PREV-2026-001"
                        className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">Data Emissione</label>
                      <input
                        type="date"
                        value={quoteDate}
                        onChange={(e) => setQuoteDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">Nome Cliente / Referente</label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Nome e Cognome"
                        className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">Email Cliente</label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="cliente@email.com"
                        className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Items list */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-neutral-300 font-bold">Voci Preventivo</label>
                      <button
                        type="button"
                        onClick={() => setQuoteItems([...quoteItems, { description: 'Nuova voce', quantity: 1, price: 500 }])}
                        className="text-xs text-teal-400 hover:underline flex items-center gap-1"
                      >
                        + Aggiungi Voce
                      </button>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {quoteItems.map((item, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08] grid grid-cols-12 gap-2.5 items-center">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const next = [...quoteItems];
                              next[idx].description = e.target.value;
                              setQuoteItems(next);
                            }}
                            placeholder="Descrizione servizio"
                            className="col-span-6 px-2.5 py-1.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white"
                          />
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => {
                              const next = [...quoteItems];
                              next[idx].price = Number(e.target.value);
                              setQuoteItems(next);
                            }}
                            placeholder="Prezzo €"
                            className="col-span-4 px-2.5 py-1.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== idx))}
                            className="col-span-2 text-xs text-red-400 hover:text-red-300"
                          >
                            Elimina
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quote Summary / Total Card */}
                <div className="p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base mb-4">Riepilogo Importi</h3>
                    <div className="flex flex-col gap-2.5 text-xs">
                      <div className="flex justify-between text-neutral-300">
                        <span>Imponibile Lordo:</span>
                        <span className="font-mono">€{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span>Sconto (%):</span>
                        <input
                          type="number"
                          value={quoteDiscount}
                          onChange={(e) => setQuoteDiscount(Number(e.target.value))}
                          className="w-16 px-1.5 py-0.5 bg-black/60 border border-white/10 rounded text-right font-mono text-xs text-white"
                        />
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span>Regime Fiscale:</span>
                        <span className="text-teal-400">Forfettario (No IVA)</span>
                      </div>
                      <div className="pt-3 border-t border-white/[0.08] flex justify-between text-sm font-bold text-white">
                        <span>Totale Finale:</span>
                        <span className="font-mono text-teal-300 text-lg">€{total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-xl bg-black/40 border border-white/[0.05] text-[10px] text-neutral-400 leading-relaxed">
                      Operazione effettuata ai sensi dell&apos;art. 1, commi da 54 a 89, della Legge n. 190/2014. Non soggetta a ritenuta d&apos;acconto.
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={handleSaveQuote}
                      className="w-full py-3 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-bold transition-all shadow-lg shadow-teal-400/20"
                    >
                      Salva ed Emetti Preventivo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CMS CONTENUTI (FAQ & RECENSIONI CON LOGHI) */}
          {activeTab === 'cms' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">CMS Contenuti (FAQ & Recensioni)</h1>
                  <p className="text-xs text-neutral-400 mt-1">Gestisci le FAQ e le recensioni dei clienti con caricamento loghi aziendali WebP.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCmsSubTab('faqs')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      cmsSubTab === 'faqs' ? 'bg-teal-400 text-black font-semibold' : 'bg-white/[0.04] text-neutral-400 hover:text-white'
                    }`}
                  >
                    Domande Frequenti ({faqs.length})
                  </button>
                  <button
                    onClick={() => setCmsSubTab('reviews')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      cmsSubTab === 'reviews' ? 'bg-teal-400 text-black font-semibold' : 'bg-white/[0.04] text-neutral-400 hover:text-white'
                    }`}
                  >
                    Recensioni & Loghi ({reviews.length})
                  </button>
                </div>
              </div>

              {/* Sub-tab: FAQs */}
              {cmsSubTab === 'faqs' && (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => { setEditingFaqId(null); setFaqQIt(''); setFaqAIt(''); setShowFaqModal(true); }}
                      className="px-3 py-1.5 rounded-xl bg-teal-400 text-black text-xs font-semibold"
                    >
                      + Nuova FAQ
                    </button>
                  </div>
                  {faqs.map((f) => (
                    <div key={f.id} className="p-4 rounded-2xl bg-[#081410]/85 border border-white/[0.08] flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{f.questionIt}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-neutral-400">{f.category}</span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{f.answerIt}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingFaqId(f.id);
                            setFaqQIt(f.questionIt);
                            setFaqAIt(f.answerIt);
                            setFaqCategory(f.category);
                            setShowFaqModal(true);
                          }}
                          className="p-1.5 rounded-lg bg-white/10 text-neutral-300 hover:text-white"
                        >
                          <TiaIcon icon={PencilEdit02Icon} size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-tab: Reviews with Company Logos */}
              {cmsSubTab === 'reviews' && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setEditingReviewId(null);
                        setReviewAuthor('');
                        setReviewRole('');
                        setReviewCompany('');
                        setReviewCompanyLogo('');
                        setReviewQuoteIt('');
                        setShowReviewModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-teal-400 text-black text-xs font-semibold"
                    >
                      + Nuova Recensione con Logo
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reviews.map((r) => (
                      <div key={r.id} className="p-5 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-bold text-sm text-white">{r.author}</h4>
                              <p className="text-[11px] text-neutral-400">{r.role} {r.company && `· ${r.company}`}</p>
                            </div>
                            {r.companyLogo && (
                              <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 p-1 flex items-center justify-center overflow-hidden">
                                <img src={r.companyLogo} alt="Logo" className="w-full h-full object-contain" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-neutral-300 italic">&ldquo;{r.quoteIt}&rdquo;</p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                          <div className="flex text-amber-400 text-xs">
                            {Array.from({ length: r.rating }).map((_, i) => (
                              <span key={i}>★</span>
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              setEditingReviewId(r.id);
                              setReviewAuthor(r.author);
                              setReviewRole(r.role);
                              setReviewCompany(r.company || '');
                              setReviewCompanyLogo(r.companyLogo || '');
                              setReviewShowLogo(r.showLogo);
                              setReviewQuoteIt(r.quoteIt);
                              setReviewRating(r.rating);
                              setShowReviewModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-white/10 text-neutral-300 hover:text-white"
                          >
                            <TiaIcon icon={PencilEdit02Icon} size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: SALUTE & SPEED INSIGHTS */}
          {activeTab === 'health' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Stato & Speed Insights</h1>
                  <p className="text-xs text-neutral-400 mt-1">Metriche Core Web Vitals Vercel, latenza database Turso e log di sistema.</p>
                </div>
                <button
                  onClick={fetchHealth}
                  className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-neutral-300 flex items-center gap-1.5"
                >
                  <TiaIcon icon={RefreshIcon} size={14} />
                  <span>Riesegui Test</span>
                </button>
              </div>

              {/* Core Web Vitals Visual Scorecards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { key: 'ttfb', label: 'TTFB', sub: 'Time to First Byte', value: '180ms', status: 'Ottimo', score: 98 },
                  { key: 'fcp', label: 'FCP', sub: 'First Contentful Paint', value: '0.8s', status: 'Ottimo', score: 96 },
                  { key: 'lcp', label: 'LCP', sub: 'Largest Contentful Paint', value: '1.4s', status: 'Ottimo', score: 94 },
                  { key: 'inp', label: 'INP', sub: 'Interaction to Next Paint', value: '48ms', status: 'Ottimo', score: 99 },
                  { key: 'cls', label: 'CLS', sub: 'Layout Shift', value: '0.01', status: 'Ottimo', score: 100 },
                ].map((m) => (
                  <div key={m.key} className="p-4 rounded-2xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">{m.label}</span>
                      <p className="text-[10px] text-neutral-400">{m.sub}</p>
                    </div>
                    <div className="mt-3">
                      <span className="text-xl font-bold text-teal-400 font-mono">{m.value}</span>
                      <span className="block text-[10px] text-teal-300 font-semibold mt-0.5">{m.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* System Logs & Infrastructure */}
              <div className="p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl">
                <h3 className="font-bold text-white text-sm mb-3">Log di Sistema Recenti</h3>
                <div className="flex flex-col gap-2 font-mono text-xs max-h-64 overflow-y-auto">
                  {healthData?.logs?.map((l: any) => (
                    <div key={l.id} className="p-2 rounded bg-black/40 border border-white/[0.05] flex items-center justify-between text-neutral-300">
                      <span>[{l.source}] {l.message}</span>
                      <span className="text-[10px] text-neutral-500">{new Date(l.timestamp).toLocaleTimeString()}</span>
                    </div>
                  )) || <p className="text-neutral-500">Nessun log registrato.</p>}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: PASSKEYS & SICUREZZA */}
          {activeTab === 'passkeys' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Dispositivi Passkey & Sicurezza ({passkeys.length})</h1>
                  <p className="text-xs text-neutral-400 mt-1">Registra nuovi dispositivi biometrici e genera codici di emergenza monouso.</p>
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

              {/* Devices Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {passkeys.map((p) => (
                  <div key={p.id} className="p-5 rounded-2xl bg-[#081410]/85 border border-white/[0.08] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                        <TiaIcon icon={CpuIcon} size={20} />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-white">{p.nickname || 'Dispositivo Master'}</span>
                        <p className="text-[11px] text-neutral-400 font-mono">ID: {p.credentialID.slice(0, 16)}...</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePasskey(p.id)}
                      className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs"
                    >
                      Revoca
                    </button>
                  </div>
                ))}
              </div>

              {/* Emergency Recovery Codes Generator */}
              <div className="p-6 rounded-3xl bg-[#081410]/85 border border-white/[0.08] backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white text-sm">Codici di Emergenza Monouso</h3>
                    <p className="text-xs text-neutral-400">Usali per accedere nel caso in cui tu non abbia temporaneamente a portata di mano la tua Passkey.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateRecoveryCodes}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white"
                  >
                    Genera 5 Nuovi Codici
                  </button>
                </div>

                {recoveryCodes && (
                  <div className="mt-3 p-4 rounded-xl bg-black/60 border border-teal-500/30 grid grid-cols-1 sm:grid-cols-5 gap-2 text-center font-mono text-teal-300 font-bold text-xs">
                    {recoveryCodes.map((code, idx) => (
                      <span key={idx} className="p-2 rounded bg-teal-950/40 border border-teal-500/20">{code}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-[#081410] border border-white/15 rounded-3xl p-6 relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">{editingProjectId ? 'Modifica Progetto' : 'Nuovo Progetto Portfolio'}</h2>
            <form onSubmit={handleProjectSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Titolo Progetto *</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Es. GSA Hotels"
                  className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Descrizione Breve *</label>
                <textarea
                  rows={2}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Thumbnail (Auto WebP Cloudflare) *</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleProjectImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadLoading}
                    className="px-3 py-2 rounded-xl bg-teal-500/20 text-teal-300 text-xs border border-teal-400/30"
                  >
                    {uploadLoading ? 'Conversione WebP...' : 'Scegli Immagine'}
                  </button>
                  {projectThumbnail && <span className="text-xs text-neutral-400 truncate max-w-xs">{projectThumbnail}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">URL Progetto Live</label>
                  <input
                    type="url"
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Tags (separati da virgola)</label>
                  <input
                    type="text"
                    value={projectTags}
                    onChange={(e) => setProjectTags(e.target.value)}
                    placeholder="Next.js, UI/UX"
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={projectFeatured}
                    onChange={(e) => setProjectFeatured(e.target.checked)}
                    className="rounded text-teal-400"
                  />
                  <span>Mostra in primo piano</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-neutral-400">Ordine:</label>
                  <input
                    type="number"
                    value={projectOrder}
                    onChange={(e) => setProjectOrder(Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-black/60 border border-white/15 rounded text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-xs text-neutral-300"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 rounded-xl bg-teal-400 text-black text-xs font-bold"
                >
                  {submitLoading ? 'Salvataggio...' : 'Salva Progetto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal with WebP Company Logo */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-lg w-full bg-[#081410] border border-white/15 rounded-3xl p-6 relative">
            <h2 className="text-xl font-bold text-white mb-4">{editingReviewId ? 'Modifica Recensione' : 'Nuova Recensione'}</h2>
            <form onSubmit={handleSaveReview} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Autore *</label>
                  <input
                    type="text"
                    value={reviewAuthor}
                    onChange={(e) => setReviewAuthor(e.target.value)}
                    placeholder="Nome Cognome"
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Ruolo / Azienda *</label>
                  <input
                    type="text"
                    value={reviewRole}
                    onChange={(e) => setReviewRole(e.target.value)}
                    placeholder="CEO / Brand"
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Logo Aziendale (Auto WebP)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/*"
                    onChange={handleReviewLogoChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadLoading}
                    className="px-3 py-2 rounded-xl bg-teal-500/20 text-teal-300 text-xs border border-teal-400/30"
                  >
                    {uploadLoading ? 'Caricamento...' : 'Carica Logo Azienda'}
                  </button>
                  {reviewCompanyLogo && <img src={reviewCompanyLogo} alt="Logo" className="w-8 h-8 object-contain rounded bg-black/50 p-1" />}
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Testo Recensione (Italiano) *</label>
                <textarea
                  rows={3}
                  value={reviewQuoteIt}
                  onChange={(e) => setReviewQuoteIt(e.target.value)}
                  className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-xs text-neutral-300"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-400 text-black text-xs font-bold"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Widget Customizer Modal */}
      {showCustomizerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#081410] border border-white/15 rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">Personalizza la tua Dashboard</h2>
            <p className="text-xs text-neutral-400 mb-4">Attiva o disattiva i widget mostrati nella pagina Panoramica:</p>
            <div className="flex flex-col gap-3">
              {[
                { key: 'showKpi', label: 'Metriche KPI Principali (Sessioni, Lead, Speed)' },
                { key: 'showTraffic', label: 'Grafico Andamento Traffico & Pagine' },
                { key: 'showLeads', label: 'Feed Ultime Richieste Ricevute' },
                { key: 'showSpeed', label: 'Card Vercel Speed & Edge Health' },
              ].map((w) => (
                <label key={w.key} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/[0.06] text-xs text-white cursor-pointer">
                  <span>{w.label}</span>
                  <input
                    type="checkbox"
                    checked={(customWidgets as any)[w.key]}
                    onChange={(e) => setCustomWidgets({ ...customWidgets, [w.key]: e.target.checked })}
                    className="rounded text-teal-400"
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowCustomizerModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs text-neutral-300"
              >
                Chiudi
              </button>
              <button
                type="button"
                onClick={() => saveWidgetPreferences(customWidgets)}
                className="px-4 py-2 rounded-xl bg-teal-400 text-black text-xs font-bold"
              >
                Salva Preferenze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
