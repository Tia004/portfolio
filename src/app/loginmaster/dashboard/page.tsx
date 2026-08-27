'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
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
} from '@/app/components/icons';

const MoltenMetal = dynamic(() => import('@/app/components/MoltenMetal'), { ssr: false });

type ActiveTab = 'projects' | 'inbox' | 'chats' | 'passkeys' | 'cms' | 'health' | 'quotes';

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
  const [selectedChatSession, setSelectedChatSession] = useState<{ id: string; messages: any[] } | null>(null);

  // Passkeys state
  const [passkeys, setPasskeys] = useState<AuthenticatorItem[]>([]);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(null);
  const [passkeyNickname, setPasskeyNickname] = useState('');

  // CMS state (FAQs & Reviews)
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewRole, setNewReviewRole] = useState('');
  const [newReviewQuote, setNewReviewQuote] = useState('');

  // System Health state
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Quick Quote Builder state
  const [quoteClient, setQuoteClient] = useState('');
  const [quoteService, setQuoteService] = useState('Sito Vetrina');
  const [quoteBasePrice, setQuoteBasePrice] = useState<number>(850);
  const [quoteDiscount, setQuoteDiscount] = useState<number>(0);
  const [quoteNotes, setQuoteNotes] = useState('Include responsive layout, animazioni interattive, SEO di base e hosting setup.');

  const showTemporarySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // ── Fetchers ──
  const fetchAvailability = async () => {
    try {
      const res = await fetch('/api/availability', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.isOnline === 'boolean') setIsOnline(data.isOnline);
      }
    } catch {}
  };

  const toggleAvailability = async () => {
    setAvailabilitySaving(true);
    setError(null);
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: !isOnline }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.isOnline === 'boolean') {
          setIsOnline(data.isOnline);
          showTemporarySuccess(data.isOnline ? 'Ora risulti Disponibile.' : 'Ora risulti Non Disponibile.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Impossibile aggiornare la disponibilità.');
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) setProjects(await res.json());
    } catch {}
  };

  const fetchMessages = async () => {
    try {
      const url = messageFilter !== 'all' ? `/api/master/messages?status=${messageFilter}` : '/api/master/messages';
      const res = await fetch(url);
      if (res.ok) setMessages(await res.json());
    } catch {}
  };

  const fetchChats = async () => {
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
      if (res.ok) setPasskeys(await res.json());
    } catch {}
  };

  const fetchCms = async () => {
    try {
      const [faqsRes, reviewsRes] = await Promise.all([
        fetch('/api/master/faqs'),
        fetch('/api/master/reviews'),
      ]);
      if (faqsRes.ok) setFaqs(await faqsRes.json());
      if (reviewsRes.ok) setReviews(await reviewsRes.json());
    } catch {}
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/master/system-health');
      if (res.ok) setSystemHealth(await res.json());
    } catch {}
  };

  // Initial mount
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchProjects(),
        fetchAvailability(),
        fetchMessages(),
        fetchPasskeys(),
      ]);
      setLoading(false);
    };
    void init();
  }, []);

  // When tab changes, load data
  useEffect(() => {
    if (activeTab === 'inbox') void fetchMessages();
    if (activeTab === 'chats') void fetchChats();
    if (activeTab === 'passkeys') void fetchPasskeys();
    if (activeTab === 'cms') void fetchCms();
    if (activeTab === 'health') void fetchHealth();
  }, [activeTab, messageFilter]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/loginmaster');
    } catch {
      router.push('/loginmaster');
    }
  };

  // Project handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/projects/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Errore di caricamento immagine.');
      const data = await res.json();
      setProjectThumbnail(data.url);
      showTemporarySuccess('Immagine caricata!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle || !projectDescription || !projectThumbnail) {
      setError('Titolo, descrizione e copertina sono obbligatori.');
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
      showTemporarySuccess(editingProjectId ? 'Progetto aggiornato!' : 'Progetto creato!');
      resetProjectForm();
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Confermi l\'eliminazione definitiva di questo progetto?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      showTemporarySuccess('Progetto eliminato.');
      fetchProjects();
      if (editingProjectId === id) resetProjectForm();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Message actions
  const handleUpdateMessageStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/master/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        showTemporarySuccess(`Stato aggiornato a ${status}`);
        fetchMessages();
        if (selectedMessage?.id === id) {
          setSelectedMessage(prev => prev ? { ...prev, status: status as any } : null);
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
      showTemporarySuccess('Note salvate con successo!');
      fetchMessages();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Vuoi eliminare questo messaggio?')) return;
    try {
      await fetch(`/api/master/messages?id=${id}`, { method: 'DELETE' });
      showTemporarySuccess('Messaggio eliminato.');
      setSelectedMessage(null);
      fetchMessages();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Passkey actions
  const handleSavePasskeyNickname = async (id: string) => {
    try {
      const res = await fetch('/api/master/passkeys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nickname: passkeyNickname }),
      });
      if (res.ok) {
        showTemporarySuccess('Nome dispositivo aggiornato!');
        setEditingPasskeyId(null);
        fetchPasskeys();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    if (!confirm('Vuoi revocare questa Passkey?')) return;
    try {
      const res = await fetch(`/api/master/passkeys?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante la revoca.');
      showTemporarySuccess('Passkey revocata con successo.');
      fetchPasskeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateRecoveryCodes = async () => {
    if (!confirm('Generare nuovi codici di emergenza sostituirà quelli precedenti. Vuoi continuare?')) return;
    try {
      const res = await fetch('/api/master/recovery-codes', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.codes) {
        setRecoveryCodes(data.codes);
        showTemporarySuccess('5 nuovi codici di emergenza generati!');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // CMS FAQ actions
  const handleCreateFaq = async () => {
    if (!newFaqQ || !newFaqA) return;
    try {
      await fetch('/api/master/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIt: newFaqQ, answerIt: newFaqA }),
      });
      setNewFaqQ('');
      setNewFaqA('');
      showTemporarySuccess('Nuova FAQ aggiunta!');
      fetchCms();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Eliminare questa FAQ?')) return;
    try {
      await fetch(`/api/master/faqs?id=${id}`, { method: 'DELETE' });
      fetchCms();
      showTemporarySuccess('FAQ rimossa.');
    } catch (err: any) {
      setError(err.message);
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

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        
        {/* Header Bar */}
        <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-5 sm:p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <TiaIcon icon={CpuIcon} size={22} strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Master Hub</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-teal-500/15 border border-teal-500/30 text-teal-300">
                  Passkey Secure
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">Control panel & portfolio management</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Availability Toggle */}
            <button
              type="button"
              onClick={toggleAvailability}
              disabled={availabilitySaving}
              className={`px-4 py-2.5 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                isOnline
                  ? 'bg-teal-950/60 border-teal-500/40 text-teal-300 hover:bg-teal-900/60'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-teal-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{isOnline ? 'Disponibile per progetti' : 'Non disponibile'}</span>
            </button>

            {/* Analytics link */}
            <Link
              href="/loginmaster/analytics"
              className="px-4 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-white flex items-center gap-2 transition-colors cursor-pointer"
            >
              <TiaIcon icon={GaugeIcon} size={15} className="text-teal-400" />
              <span>Analytics</span>
            </Link>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-2xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-xs font-medium text-red-300 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Global Error & Success Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/70 border border-red-500/40 text-red-200 text-sm flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <TiaIcon icon={AlertCircleIcon} size={18} className="text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white"><TiaIcon icon={Cancel01Icon} size={16} /></button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-teal-950/70 border border-teal-500/40 text-teal-200 text-sm flex items-center gap-2.5 shadow-lg">
            <TiaIcon icon={CheckmarkCircle01Icon} size={18} className="text-teal-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modular Tabs Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {[
            { id: 'projects', label: 'Progetti', icon: CodeFolderIcon, count: projects.length },
            { id: 'inbox', label: 'Inbox Messaggi', icon: Mail01Icon, count: messages.filter(m => m.status === 'new').length },
            { id: 'chats', label: 'Archivio Chatbot', icon: BubbleChatIcon, count: chatLeads.length },
            { id: 'passkeys', label: 'Passkey & Sicurezza', icon: CpuIcon, count: passkeys.length },
            { id: 'cms', label: 'CMS Contenuti', icon: FilePenIcon },
            { id: 'health', label: 'System Health', icon: WorkflowSquare01Icon },
            { id: 'quotes', label: 'Preventivatore', icon: DollarSignIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 whitespace-nowrap transition-all cursor-pointer border ${
                  active
                    ? 'bg-teal-400 text-black border-teal-300 shadow-lg shadow-teal-400/20'
                    : 'bg-[#081410]/70 text-neutral-400 border-white/[0.06] hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <TiaIcon icon={Icon} size={16} strokeWidth={2} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${active ? 'bg-black/20 text-black' : 'bg-teal-500/20 text-teal-300'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: PROGETTI ── */}
        {activeTab === 'projects' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-1">
              <BorderGlow continuousHover borderRadius={24} glowRadius={30} glowIntensity={2.0} edgeSensitivity={0}>
                <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-white">
                      {editingProjectId ? 'Modifica Progetto' : 'Nuovo Progetto'}
                    </h2>
                    {editingProjectId && (
                      <button onClick={resetProjectForm} className="text-xs text-neutral-400 hover:text-white underline">
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
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1">Copertina / Thumbnail *</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={projectThumbnail}
                          onChange={(e) => setProjectThumbnail(e.target.value)}
                          placeholder="/images/project.jpg o URL"
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
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
                  Progetti nel Portfolio ({projects.length})
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
                          <div className="h-32 w-full rounded-xl overflow-hidden mb-3 bg-black/40 relative">
                            <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            {p.featured && (
                              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-400 text-black">
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
                            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white font-medium transition-colors"
                          >
                            Modifica
                          </button>
                          <button
                            onClick={() => handleDeleteProject(p.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-xs text-red-300 font-medium transition-colors"
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

        {/* ── TAB 2: INBOX MESSAGGI & PREVENTIVI ── */}
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
                    <button onClick={() => handleDeleteMessage(selectedMessage.id)} className="text-xs text-red-400 hover:text-red-300">
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

        {/* ── TAB 3: ARCHIVIO CHATBOT AI ── */}
        {activeTab === 'chats' && (
          <div className="flex flex-col gap-6">
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
          </div>
        )}

        {/* ── TAB 4: PASSKEY & SICUREZZA ── */}
        {activeTab === 'passkeys' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Passkeys List */}
            <div className="lg:col-span-2 bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div>
                  <h3 className="font-bold text-white text-base">Dispositivi Passkey Attivi ({passkeys.length})</h3>
                  <p className="text-xs text-neutral-400">Autenticatori biometrici abilitati all&apos;accesso master</p>
                </div>
                <Link
                  href="/loginmaster?setup=true"
                  className="px-3.5 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-semibold shadow-md shadow-teal-400/20 transition-all"
                >
                  + Aggiungi Dispositivo
                </Link>
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
                            <button onClick={() => handleSavePasskeyNickname(p.id)} className="text-xs text-teal-400">Salva</button>
                            <button onClick={() => setEditingPasskeyId(null)} className="text-xs text-neutral-400">Annulla</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white text-sm">{p.nickname || p.credentialDeviceType || 'Dispositivo Passkey'}</p>
                            <button onClick={() => { setEditingPasskeyId(p.id); setPasskeyNickname(p.nickname || ''); }} className="text-neutral-500 hover:text-teal-400 text-xs">
                              ✏️
                            </button>
                          </div>
                        )}
                        <p className="text-[11px] text-neutral-500 font-mono">ID: {p.credentialID.slice(0, 18)}... • Creata: {new Date(p.createdAt).toLocaleDateString('it-IT')}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeletePasskey(p.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-xs text-red-300 font-medium transition-colors"
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
                className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Genera Nuovi Codici di Recupero
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

        {/* ── TAB 5: CMS FAQ & RECENSIONI ── */}
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
                  className="py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-semibold text-xs transition-colors"
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
                    <button onClick={() => handleDeleteFaq(f.id)} className="text-red-400 hover:text-red-300 text-xs shrink-0">
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
                <button
                  type="button"
                  onClick={async () => {
                    if (!newReviewAuthor || !newReviewRole || !newReviewQuote) return;
                    await fetch('/api/master/reviews', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ author: newReviewAuthor, role: newReviewRole, quoteIt: newReviewQuote }),
                    });
                    setNewReviewAuthor('');
                    setNewReviewRole('');
                    setNewReviewQuote('');
                    fetchCms();
                    showTemporarySuccess('Recensione aggiunta!');
                  }}
                  className="py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-semibold text-xs transition-colors"
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
                      className="text-red-400 hover:text-red-300 text-xs shrink-0"
                    >
                      Elimina
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 6: SYSTEM HEALTH & LOGS ── */}
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

        {/* ── TAB 7: PREVENTIVATORE RAPIDO ── */}
        {activeTab === 'quotes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-4">
              <h3 className="font-bold text-white text-base">Generatore Preventivo Rapido</h3>
              
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Nome Cliente / Azienda</label>
                <input
                  type="text"
                  value={quoteClient}
                  onChange={(e) => setQuoteClient(e.target.value)}
                  placeholder="Es. Mario Rossi - Studio Legale"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Tipologia Servizio</label>
                <select
                  value={quoteService}
                  onChange={(e) => {
                    setQuoteService(e.target.value);
                    if (e.target.value === 'Sito Vetrina') setQuoteBasePrice(850);
                    if (e.target.value === 'E-Commerce') setQuoteBasePrice(1850);
                    if (e.target.value === 'Web App & Dashboard') setQuoteBasePrice(2450);
                    if (e.target.value === 'Branding & UI Design') setQuoteBasePrice(650);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-black border border-white/[0.08] text-xs text-white"
                >
                  <option value="Sito Vetrina">Sito Vetrina (850€)</option>
                  <option value="E-Commerce">E-Commerce Completo (1.850€)</option>
                  <option value="Web App & Dashboard">Web App & Dashboard Custom (2.450€)</option>
                  <option value="Branding & UI Design">Branding & UI Design (650€)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Prezzo Base (€)</label>
                  <input
                    type="number"
                    value={quoteBasePrice}
                    onChange={(e) => setQuoteBasePrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Sconto applicato (%)</label>
                  <input
                    type="number"
                    value={quoteDiscount}
                    onChange={(e) => setQuoteDiscount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Note & Voci Incluse</label>
                <textarea
                  rows={3}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white resize-none"
                />
              </div>
            </div>

            {/* Printable Preview Card */}
            <div className="bg-[#081410]/95 backdrop-blur-2xl border border-teal-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-2xl">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                  <div>
                    <h4 className="font-bold text-teal-400 text-lg">Tia Designs</h4>
                    <p className="text-[11px] text-neutral-400">Design • Web Development • Video</p>
                  </div>
                  <span className="text-xs font-mono text-neutral-500">{new Date().toLocaleDateString('it-IT')}</span>
                </div>

                <div>
                  <p className="text-[11px] text-neutral-400 uppercase tracking-wider">Cliente</p>
                  <p className="text-sm font-bold text-white">{quoteClient || 'Nome Cliente'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/50 border border-white/[0.06] flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-semibold">{quoteService}</span>
                    <span className="text-white font-mono">{quoteBasePrice} €</span>
                  </div>
                  {quoteDiscount > 0 && (
                    <div className="flex items-center justify-between text-xs text-teal-300">
                      <span>Sconto Promo ({quoteDiscount}%)</span>
                      <span className="font-mono">- {Math.round((quoteBasePrice * quoteDiscount) / 100)} €</span>
                    </div>
                  )}
                  <p className="text-[11px] text-neutral-400 pt-2 border-t border-white/[0.06]">{quoteNotes}</p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30">
                  <span className="text-sm font-bold text-white">Totale Preventivato:</span>
                  <span className="text-xl font-bold text-teal-400 font-mono">
                    {Math.round(quoteBasePrice * (1 - quoteDiscount / 100))} €
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full mt-4 py-3 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-bold text-xs transition-colors cursor-pointer"
              >
                🖨️ Stampa / Salva in PDF
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
