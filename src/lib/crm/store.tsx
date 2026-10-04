'use client';

import { italianDateKey } from '@/lib/crm/date';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './auth';
import {
  Opportunity,
  CommercialTask,
  Brand,
  SalesRep,
  CommercialAlert,
  KPISummary,
  DealStage,
  NextAction,
  ActivityHistoryItem,
} from '@/lib/crm/types';
import {
  INITIAL_BRANDS,
  INITIAL_REPS,
  INITIAL_OPPORTUNITIES,
  INITIAL_TASKS,
  DEMO_OPPORTUNITIES,
  DEMO_TASKS,
} from './initialData';

interface CRMContextType {
  // Data
  opportunities: Opportunity[];
  tasks: CommercialTask[];
  brands: Brand[];
  salesReps: SalesRep[];
  selectedBrand: string;
  selectedRep: string;
  searchQuery: string;
  theme: 'light' | 'slate' | 'oled';
  alerts: CommercialAlert[];
  kpis: KPISummary;
  geminiApiKey: string;
  syncStatus: 'loading' | 'saved' | 'saving' | 'error' | 'conflict';
  retrySave: () => void;
  dataReady: boolean;
  importLegacyData: () => { success: boolean; message: string };

  // Next step prompt modal state
  nextStepModalDeal: Opportunity | null;
  setNextStepModalDeal: (deal: Opportunity | null) => void;

  // Active deal drawer/modal
  selectedDeal: Opportunity | null;
  setSelectedDeal: (deal: Opportunity | null) => void;

  // New deal modal
  isNewDealModalOpen: boolean;
  setIsNewDealModalOpen: (open: boolean) => void;

  // Settings & MCP modal
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;

  // Actions
  setSelectedBrand: (b: string) => void;
  setSelectedRep: (r: string) => void;
  setSearchQuery: (q: string) => void;
  setTheme: (t: 'light' | 'slate' | 'oled') => void;
  setGeminiApiKey: (key: string) => void;

  addOpportunity: (opp: Omit<Opportunity, 'id' | 'history'> & { initialHistoryTitle?: string }) => Opportunity;
  updateOpportunity: (id: string, updates: Partial<Opportunity>) => void;
  deleteOpportunity: (id: string) => void;
  moveDealStage: (id: string, newStage: DealStage) => void;
  setDealNextAction: (id: string, nextAction: NextAction) => void;
  snoozeDeal: (id: string, reason: string, reactivationDate: string) => void;

  addTask: (task: Omit<CommercialTask, 'id'>) => CommercialTask;
  updateTask: (id: string, updates: Partial<CommercialTask>) => void;
  completeTask: (id: string) => void;

  addBrand: (brandName: string) => void;
  deleteBrand: (brandName: string) => void;
  addSalesRep: (name: string, role: string) => void;

  addDealHistoryLog: (dealId: string, item: Omit<ActivityHistoryItem, 'id' | 'timestamp'>) => void;
  triggerNextStepPrompt: (deal: Opportunity) => void;

  // Demo & Reset
  loadDemoData: () => void;
  resetAllData: () => void;

  // Autonomous AI executor
  executeAIInstruction: (instruction: string) => Promise<{ success: boolean; message: string; data?: any }>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_THEME = 'hubc_crm_theme_v1';
const LOCAL_STORAGE_KEY_GEMINI_KEY = 'hubc_crm_gemini_key_v1';

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [dataReady, setDataReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'saved' | 'saving' | 'error' | 'conflict'>('loading');
  const revisionRef = useRef(0);
  const lastSavedPayloadRef = useRef('');
  const blockedRef = useRef(false);
  const activeUserRef = useRef<string | undefined>(undefined);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [retryEpoch, setRetryEpoch] = useState(0);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPORTUNITIES);
  const [tasks, setTasks] = useState<CommercialTask[]>(INITIAL_TASKS);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>(INITIAL_REPS);

  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [theme, setThemeState] = useState<'light' | 'slate' | 'oled'>('slate');
  const [geminiApiKey, setGeminiApiKeyState] = useState<string>('');

  const [selectedDeal, setSelectedDeal] = useState<Opportunity | null>(null);
  const [nextStepModalDeal, setNextStepModalDeal] = useState<Opportunity | null>(null);
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(LOCAL_STORAGE_KEY_THEME) as 'light' | 'slate' | 'oled' | null;
      if (savedTheme) {
        setThemeState(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }

      const savedApiKey = localStorage.getItem(LOCAL_STORAGE_KEY_GEMINI_KEY);
      if (savedApiKey) {
        setGeminiApiKeyState(savedApiKey);
      }

    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, []);

  // The CRM archive belongs to the authenticated account and is stored server-side.
  useEffect(() => {
    activeUserRef.current = userId;
    blockedRef.current = false;
    setDataReady(false);
    if (!userId) { revisionRef.current = 0; lastSavedPayloadRef.current = ''; setOpportunities([]); setTasks([]); setBrands([]); setSalesReps([]); return; }
    let cancelled = false;
    setSyncStatus('loading');
    fetch('/api/crm', { cache: 'no-store' }).then(async (r) => { if (!r.ok) throw new Error('load'); return r.json(); })
      .then(({ data, revision }) => {
        if (cancelled) return;
        const initialUserBrands: Brand[] = Array.isArray(data?.brands) && data.brands.length > 0
          ? data.brands
          : (user?.company?.trim() ? [user.company.trim()] : []);
        revisionRef.current = Number(revision || 0);
        lastSavedPayloadRef.current = JSON.stringify({ opportunities: data?.opportunities || [], tasks: data?.tasks || [], brands: initialUserBrands, salesReps: data?.salesReps || [] });
        setOpportunities(data?.opportunities || []);
        setTasks(data?.tasks || []);
        setBrands(initialUserBrands);
        setSalesReps(data?.salesReps || []);
        setDataReady(true);
        setSyncStatus('saved');
      }).catch(() => { if (!cancelled) setSyncStatus('error'); });
    return () => { cancelled = true; };
  }, [userId, user?.company]);

  useEffect(() => {
    if (!userId || !dataReady) return;
    const payload = JSON.stringify({ opportunities, tasks, brands, salesReps });
    if (payload === lastSavedPayloadRef.current || blockedRef.current) return;
    const timer = window.setTimeout(() => {
      setSyncStatus('saving');
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        if (blockedRef.current || activeUserRef.current !== userId || payload === lastSavedPayloadRef.current) return;
        try {
          const response = await fetch('/api/crm', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...JSON.parse(payload), baseRevision: revisionRef.current }) });
          if (response.status === 409) { blockedRef.current = true; setSyncStatus('conflict'); return; }
          if (!response.ok) throw new Error('save');
          const result = await response.json();
          revisionRef.current = result.revision;
          lastSavedPayloadRef.current = payload;
          setSyncStatus('saved');
        } catch { blockedRef.current = true; setSyncStatus('error'); }
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [userId, dataReady, opportunities, tasks, brands, salesReps, retryEpoch]);

  const retrySave = () => { blockedRef.current = false; setRetryEpoch((value) => value + 1); };

  const setTheme = (newTheme: 'light' | 'slate' | 'oled') => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_THEME, newTheme);
    } catch (e) {}
  };

  const setGeminiApiKey = (key: string) => {
    setGeminiApiKeyState(key);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_GEMINI_KEY, key);
    } catch (e) {}
  };

  // Stand-by auto-reactivation check
  const today = italianDateKey();

  // Calculate dynamic alerts
  const alerts: CommercialAlert[] = [];

  opportunities.forEach((deal) => {
    const isClosed = deal.stage === 'Venduta' || deal.stage === 'Persa';

    // 1. Stand-by auto-reactivation check
    if (deal.stage === 'Stand-by' && deal.standbyReactivationDate) {
      if (deal.standbyReactivationDate <= today) {
        alerts.push({
          id: `alert-standby-${deal.id}`,
          type: 'standby-reactivate',
          title: `Stand-by terminato per ${deal.name}`,
          description: `La trattativa (${deal.company} • ${deal.brand}) è programmata per riattivazione oggi! Motivo: "${deal.standbyReason || 'Rivedere accordo'}"`,
          dealId: deal.id,
          dealName: deal.name,
          severity: 'urgent',
          date: deal.standbyReactivationDate,
        });
      }
    }

    if (!isClosed && deal.stage !== 'Stand-by') {
      // 2. Alert: Opportunità senza prossima azione definita (Regola Fondamentale)
      if (!deal.nextAction || !deal.nextAction.what || deal.nextAction.completed) {
        alerts.push({
          id: `alert-noaction-${deal.id}`,
          type: 'no-next-action',
          title: `Nessuna prossima azione: ${deal.name}`,
          description: `La trattativa "${deal.company}" (${deal.brand}) in fase ${deal.stage} non ha un prossimo step pianificato!`,
          dealId: deal.id,
          dealName: deal.name,
          severity: 'urgent',
          date: today,
        });
      } else {
        // 3. Alert: Follow-up o step scaduto
        if (deal.nextAction.when < today && !deal.nextAction.completed) {
          alerts.push({
            id: `alert-overdue-${deal.id}`,
            type: 'expired-followup',
            title: `Follow-up scaduto: ${deal.name}`,
            description: `Azione "${deal.nextAction.what}" prevista per il ${deal.nextAction.when} (${deal.nextAction.who}) non ancora completata!`,
            dealId: deal.id,
            dealName: deal.name,
            severity: 'urgent',
            date: deal.nextAction.when,
          });
        }

        // 4. Alert: Appuntamento oggi
        if (deal.nextAction.when === today && deal.nextAction.type === 'appuntamento') {
          alerts.push({
            id: `alert-todayapp-${deal.id}`,
            type: 'meeting-today',
            title: `Appuntamento oggi con ${deal.name}`,
            description: `Ore ${deal.nextAction.time || '15:00'} - ${deal.nextAction.what} (${deal.company})`,
            dealId: deal.id,
            dealName: deal.name,
            severity: 'info',
            date: today,
          });
        }
      }

      // 5. Alert: Opportunità ferma da troppo tempo (Aging > 12 giorni)
      const entryTime = new Date(deal.entryDate).getTime();
      const nowTime = Date.now();
      const diffDays = Math.floor((nowTime - entryTime) / (1000 * 60 * 60 * 24));
      if (diffDays >= 12 && deal.stage !== 'Nuovo lead') {
        alerts.push({
          id: `alert-stuck-${deal.id}`,
          type: 'stuck-deal',
          title: `Trattativa ferma: ${deal.company}`,
          description: `In fase ${deal.stage} da oltre ${diffDays} giorni senza avanzamento di pipeline. Valore: €${deal.value.toLocaleString()}`,
          dealId: deal.id,
          dealName: deal.name,
          severity: 'warning',
          date: today,
        });
      }
    }
  });

  // Calculate KPIs
  const filteredDeals = opportunities.filter((deal) => {
    if (selectedBrand !== 'all' && deal.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false;
    if (selectedRep !== 'all' && !deal.salesRep.toLowerCase().includes(selectedRep.toLowerCase())) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        deal.name.toLowerCase().includes(q) ||
        deal.company.toLowerCase().includes(q) ||
        deal.service.toLowerCase().includes(q) ||
        deal.brand.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Financial normalizer: One-Shot + (Mensile * 12) + Annuale
  const getNormalizedValue = (deal: Opportunity) => {
    if (deal.valueType === 'Mensile') return deal.value * 12;
    return deal.value;
  };

  const soldTotal = filteredDeals
    .filter((d) => d.stage === 'Venduta')
    .reduce((sum, d) => sum + getNormalizedValue(d), 0);

  const openDeals = filteredDeals.filter((d) => d.stage !== 'Venduta' && d.stage !== 'Persa' && d.stage !== 'Stand-by');
  const pipelineTotal = openDeals.reduce((sum, d) => sum + getNormalizedValue(d), 0);
  const openDealsCount = openDeals.length;

  const scheduledMeetingsCount = tasks.filter(
    (t) => t.type === 'appuntamento' && t.status !== 'Completata' &&
      (selectedBrand === 'all' || t.brand === selectedBrand) &&
      (selectedRep === 'all' || t.assignedTo === selectedRep)
  ).length;

  const totalClosed = filteredDeals.filter((d) => d.stage === 'Venduta' || d.stage === 'Persa').length;
  const wonCount = filteredDeals.filter((d) => d.stage === 'Venduta').length;
  const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

  const kpis: KPISummary = {
    soldTotal,
    pipelineTotal,
    openDealsCount,
    scheduledMeetingsCount,
    monthlyTarget: 800000,
    winRate,
  };

  // CRUD Operations
  const addOpportunity = (
    data: Omit<Opportunity, 'id' | 'history'> & { initialHistoryTitle?: string }
  ): Opportunity => {
    const brandPrefix = data.brand.substring(0, 2).toUpperCase();
    const id = `${brandPrefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const newDeal: Opportunity = {
      ...data,
      id,
      dealHealthScore: 80,
      history: [
        {
          id: `h-${Date.now()}`,
          date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
          timestamp: new Date().toISOString(),
          title: data.initialHistoryTitle || 'Opportunità creata nel sistema',
          description: `Registrato da ${data.leadSource}. Responsabile: ${data.salesRep}`,
          type: 'task',
          author: data.salesRep || 'System',
        },
      ],
    };

    setOpportunities((prev) => [newDeal, ...prev]);

    // Also auto-create a task if nextAction exists
    if (newDeal.nextAction && newDeal.nextAction.what) {
      addTask({
        dealId: newDeal.id,
        dealTitle: `${newDeal.company} - ${newDeal.name}`,
        title: newDeal.nextAction.what,
        client: newDeal.name,
        brand: newDeal.brand,
        assignedTo: newDeal.nextAction.who,
        type: newDeal.nextAction.type,
        priority: newDeal.nextAction.priority,
        date: newDeal.nextAction.when,
        time: newDeal.nextAction.time || '10:00',
        description: `Prossima azione generata per la trattativa ${newDeal.id}`,
        status: 'Da fare',
      });
    }

    return newDeal;
  };

  const updateOpportunity = (id: string, updates: Partial<Opportunity>) => {
    setOpportunities((prev) =>
      prev.map((deal) => {
        if (deal.id === id) {
          const updated = { ...deal, ...updates };
          if (selectedDeal?.id === id) setSelectedDeal(updated);
          return updated;
        }
        return deal;
      })
    );
  };

  const deleteOpportunity = (id: string) => {
    setOpportunities((prev) => prev.filter((d) => d.id !== id));
    setTasks((prev) => prev.filter((t) => t.dealId !== id));
    if (selectedDeal?.id === id) setSelectedDeal(null);
  };

  const triggerNextStepPrompt = (deal: Opportunity) => {
    setNextStepModalDeal(deal);
  };

  const moveDealStage = (id: string, newStage: DealStage) => {
    const deal = opportunities.find((d) => d.id === id);
    if (!deal) return;
    if (newStage === 'Stand-by') { setSelectedDeal(deal); return; }

    const oldStage = deal.stage;
    const historyItem: ActivityHistoryItem = {
      id: `h-${Date.now()}`,
      date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
      timestamp: new Date().toISOString(),
      title: `Avanzamento fase: ${oldStage} → ${newStage}`,
      description: `Spostata da ${deal.salesRep} nella pipeline commerciale`,
      type: 'task',
      author: deal.salesRep,
    };

    const updates: Partial<Opportunity> = {
      stage: newStage,
      history: [historyItem, ...deal.history],
    };

    if (newStage !== 'Venduta' && newStage !== 'Persa' && deal.nextAction) {
      updates.nextAction = { ...deal.nextAction, completed: true };
    }

    if (newStage === 'Venduta') {
      updates.winDate = italianDateKey();
    }

    updateOpportunity(id, updates);

    // REGOLA FONDAMENTALE: Se spostiamo una trattativa aperta e non ha un prossimo step o è concluso,
    // chiediamo subito: "Qual è il prossimo step?"
    if (newStage !== 'Venduta' && newStage !== 'Persa') {
      const updatedDeal = { ...deal, ...updates };
      triggerNextStepPrompt(updatedDeal);
    }
  };

  const setDealNextAction = (id: string, nextAction: NextAction) => {
    const deal = opportunities.find((d) => d.id === id);
    if (!deal) return;

    const historyItem: ActivityHistoryItem = {
      id: `h-${Date.now()}`,
      date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
      timestamp: new Date().toISOString(),
      title: `Nuovo Prossimo Step: ${nextAction.what}`,
      description: `Tipo: ${nextAction.type} • Assegnato a: ${nextAction.who} • Data: ${nextAction.when} ${nextAction.time || ''}`,
      type: nextAction.type,
      author: nextAction.who,
    };

    updateOpportunity(id, {
      nextAction: { ...nextAction, id: `act-${Date.now()}`, completed: false },
      history: [historyItem, ...deal.history],
    });

    // Create or update task for "Cosa fare oggi"
    addTask({
      dealId: deal.id,
      dealTitle: `${deal.company} - ${deal.name}`,
      title: nextAction.what,
      client: deal.name,
      brand: deal.brand,
      assignedTo: nextAction.who,
      type: nextAction.type,
      priority: nextAction.priority,
      date: nextAction.when,
      time: nextAction.time || '10:00',
      description: `Prossima azione commerciale per ${deal.company}`,
      status: 'Da fare',
    });
  };

  const snoozeDeal = (id: string, reason: string, reactivationDate: string) => {
    const deal = opportunities.find((d) => d.id === id);
    if (!deal) return;

    const historyItem: ActivityHistoryItem = {
      id: `h-${Date.now()}`,
      date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
      timestamp: new Date().toISOString(),
      title: `Trattativa messa in Stand-by fino al ${reactivationDate}`,
      description: `Motivo: ${reason}`,
      type: 'task',
      author: deal.salesRep,
    };

    updateOpportunity(id, {
      stage: 'Stand-by',
      standbyReason: reason,
      standbyReactivationDate: reactivationDate,
      nextAction: {
        id: `act-${Date.now()}`,
        what: `Riattivare trattativa da Stand-by: ${reason}`,
        who: deal.salesRep,
        when: reactivationDate,
        time: '09:30',
        type: 'standby-wake',
        priority: 'Alta',
        completed: false,
      },
      history: [historyItem, ...deal.history],
    });

    // Add wake task
    addTask({
      dealId: deal.id,
      dealTitle: `${deal.company} - ${deal.name}`,
      title: `Sveglia Stand-by: ${deal.name} (${deal.company})`,
      client: deal.name,
      brand: deal.brand,
      assignedTo: deal.salesRep,
      type: 'standby-wake',
      priority: 'Alta',
      date: reactivationDate,
      time: '09:30',
      description: `Motivo Stand-by: ${reason}`,
      status: 'Da fare',
    });
  };

  const addTask = (taskData: Omit<CommercialTask, 'id'>): CommercialTask => {
    const newTask: CommercialTask = {
      ...taskData,
      id: `tsk-${crypto.randomUUID()}`,
    };
    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  };

  const updateTask = (id: string, updates: Partial<CommercialTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const completeTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    updateTask(id, { status: 'Completata' });

    // If linked to deal, log history & prompt next step!
    if (task.dealId) {
      const deal = opportunities.find((d) => d.id === task.dealId);
      if (deal) {
        if (deal.nextAction && deal.stage !== 'Venduta' && deal.stage !== 'Persa') {
          updateOpportunity(deal.id, { nextAction: { ...deal.nextAction, completed: true } });
        }
        addDealHistoryLog(deal.id, {
          date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
          title: `Attività completata: ${task.title}`,
          description: task.description || 'Attività completata con successo',
          type: task.type,
          author: task.assignedTo,
        });

        // Trigger the mandatory "Qual è il prossimo step?" prompt!
        triggerNextStepPrompt(deal.nextAction ? { ...deal, nextAction: { ...deal.nextAction, completed: true } } : deal);
      }
    }
  };

  const addBrand = (brandName: string) => {
    const trimmed = brandName.trim();
    if (trimmed && !brands.includes(trimmed)) {
      setBrands((prev) => [...prev, trimmed]);
      if (brands.length === 0) setSelectedBrand('all');
    }
  };

  const deleteBrand = (brandName: string) => {
    setBrands((prev) => prev.filter((b) => b !== brandName));
    if (selectedBrand === brandName) setSelectedBrand('all');
  };

  const addSalesRep = (name: string, role: string) => {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    setSalesReps((prev) => [...prev, { id, name, role, active: true }]);
  };

  const addDealHistoryLog = (dealId: string, item: Omit<ActivityHistoryItem, 'id' | 'timestamp'>) => {
    const deal = opportunities.find((d) => d.id === dealId);
    if (!deal) return;

    const newHistoryItem: ActivityHistoryItem = {
      ...item,
      id: `h-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    updateOpportunity(dealId, {
      history: [newHistoryItem, ...deal.history],
    });
  };

  // Autonomous AI Action Execution Engine
  const executeAIInstruction = async (
    instruction: string
  ): Promise<{ success: boolean; message: string; data?: any }> => {
    const lower = instruction.toLowerCase();

    // Structured deal creation stays in the validated form; free text must not invent contact data.
    if (lower.includes('crea') && (lower.includes('opportunità') || lower.includes('lead') || lower.includes('trattativa'))) {
      setIsNewDealModalOpen(true);
      return { success: false, message: 'Ho aperto il modulo: inserisci i dati del cliente e la prossima azione per creare la trattativa.' };
    }

    // 2. Check if user wants to move deal stage
    if (lower.includes('sposta') || lower.includes('avanza') || lower.includes('cambia fase')) {
      let targetStage: DealStage = 'Trattativa';
      if (lower.includes('conoscenza')) targetStage = 'Conoscenza';
      if (lower.includes('appuntamento')) targetStage = 'Appuntamento';
      if (lower.includes('trattativa')) targetStage = 'Trattativa';
      if (lower.includes('chiusura')) targetStage = 'Chiusura';
      if (lower.includes('venduta') || lower.includes('vinta')) targetStage = 'Venduta';
      if (lower.includes('persa')) targetStage = 'Persa';
      if (lower.includes('stand-by') || lower.includes('standby')) targetStage = 'Stand-by';

      // Find deal
      const matchedDeal = opportunities.find(
        (d) =>
          lower.includes(d.name.toLowerCase()) ||
          lower.includes(d.company.toLowerCase()) ||
          lower.includes(d.id.toLowerCase())
      );

      if (matchedDeal) {
        moveDealStage(matchedDeal.id, targetStage);
        return {
          success: true,
          message: `Ho spostato la trattativa di ${matchedDeal.name} (${matchedDeal.company}) nella fase "${targetStage}".`,
          data: { dealId: matchedDeal.id, newStage: targetStage },
        };
      }
    }

    if (lower.includes('stand-by') || lower.includes('standby') || lower.includes('snooze') || lower.includes('congela')) {
      return { success: false, message: 'Apri la trattativa e indica motivo e data di riattivazione per metterla in stand-by.' };
    }

    // 4. Check if user asks "cosa devo fare oggi"
    if (lower.includes('cosa devo fare') || lower.includes('attivita') || lower.includes('task di oggi')) {
      const todayTasks = tasks.filter((t) => t.date <= today && t.status !== 'Completata');
      return {
        success: true,
        message: `Hai ${todayTasks.length} attività da completare: ${todayTasks
          .map((t) => `• ${t.time || 'Orario flessibile'}: ${t.title} (${t.brand})`)
          .join('\n')}`,
        data: todayTasks,
      };
    }

    // Never claim an action succeeded when it was not actually executed.
    return {
      success: false,
      message: 'Non ho riconosciuto il comando. Usa le azioni della dashboard per registrare i dati in modo preciso.',
    };
  };

  const loadDemoData = () => {
    setOpportunities(DEMO_OPPORTUNITIES);
    setTasks(DEMO_TASKS);
  };

  const resetAllData = () => {
    setOpportunities([]);
    setTasks([]);
    setSelectedDeal(null);
  };

  const importLegacyData = () => {
    if (!dataReady) return { success: false, message: 'Attendi il caricamento dei dati.' };
    if (opportunities.length || tasks.length) return { success: false, message: 'L’archivio attuale non è vuoto. L’importazione richiede un account senza dati.' };
    try {
      const legacyDeals = JSON.parse(localStorage.getItem('hubc_crm_opportunities_v2') || '[]');
      const legacyTasks = JSON.parse(localStorage.getItem('hubc_crm_tasks_v2') || '[]');
      const legacyBrands = JSON.parse(localStorage.getItem('hubc_crm_brands_v2') || '[]');
      if (!Array.isArray(legacyDeals) || !Array.isArray(legacyTasks) || !Array.isArray(legacyBrands)) throw new Error('Formato non valido');
      if (!legacyDeals.every((deal) => deal && typeof deal.id === 'string' && typeof deal.name === 'string' && typeof deal.company === 'string' && Array.isArray(deal.history)) || !legacyTasks.every((task) => task && typeof task.id === 'string' && typeof task.title === 'string') || !legacyBrands.every((brand) => typeof brand === 'string')) throw new Error('Dati non validi');
      if (!legacyDeals.length && !legacyTasks.length) return { success: false, message: 'Nessun dato locale precedente trovato in questo browser.' };
      setOpportunities(legacyDeals);
      setTasks(legacyTasks);
      if (legacyBrands.length) setBrands(legacyBrands);
      return { success: true, message: `${legacyDeals.length} opportunità e ${legacyTasks.length} attività importate. Attendi che lo stato diventi “Dati salvati”.` };
    } catch { return { success: false, message: 'Impossibile leggere i dati precedenti.' }; }
  };

  return (
    <CRMContext.Provider
      value={{
        opportunities,
        tasks,
        brands,
        salesReps,
        selectedBrand,
        selectedRep,
        searchQuery,
        theme,
        alerts,
        kpis,
        geminiApiKey,
        syncStatus,
        retrySave,
        dataReady,
        importLegacyData,
        nextStepModalDeal,
        setNextStepModalDeal,
        selectedDeal,
        setSelectedDeal,
        isNewDealModalOpen,
        setIsNewDealModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        setSelectedBrand,
        setSelectedRep,
        setSearchQuery,
        setTheme,
        setGeminiApiKey,
        addOpportunity,
        updateOpportunity,
        deleteOpportunity,
        moveDealStage,
        setDealNextAction,
        snoozeDeal,
        addTask,
        updateTask,
        completeTask,
        addBrand,
        deleteBrand,
        addSalesRep,
        addDealHistoryLog,
        triggerNextStepPrompt,
        executeAIInstruction,
        loadDemoData,
        resetAllData,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
}
