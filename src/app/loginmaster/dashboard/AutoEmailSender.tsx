'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import TiaIcon from '@/app/components/TiaIcon';
import {
  Mail01Icon,
  Upload01Icon,
  Download01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  SparklesIcon,
  WorkflowSquare01Icon,
  Delete02Icon,
  RefreshIcon,
  Search01Icon,
  File01Icon,
} from '@/app/components/icons';
import {
  Play,
  Pause,
  Square,
  Send,
  Eye,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  Users,
  Settings2,
  Clock,
  ChevronRight,
  Info,
  Shield,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { buildBrandedEmailHtml } from '@/lib/email-template';

export interface RecipientRow {
  id: string;
  email: string;
  name: string;
  company?: string;
  customSubject?: string;
  customBody?: string;
  extraData?: Record<string, string>;
  status: 'idle' | 'sending' | 'sent' | 'failed';
  error?: string;
  sentAt?: string;
}

export default function AutoEmailSender() {
  // Input Mode: 'csv' | 'manual'
  const [inputMode, setInputMode] = useState<'csv' | 'manual'>('csv');

  // Manual list textarea
  const [manualText, setManualText] = useState('');

  // Virtualization for recipients table
  const [visibleCount, setVisibleCount] = useState(100);

  // CSV file state
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    email: '',
    name: '',
    company: '',
    subject: '',
    body: '',
  });

  // Recipients list
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Template fields
  const [templateSubject, setTemplateSubject] = useState('Opportunità di collaborazione per {azienda}');
  const [templateBody, setTemplateBody] = useState(
    `Ciao {nome},\n\nHo visto con grande interesse i progetti di {azienda} e credo ci sia un'ottima opportunità per valorizzare la vostra presenza online con una piattaforma web ad alte prestazioni, moderna e curata nei dettagli.\n\nHo pensato a una proposta su misura per voi. Possiamo organizzare una breve call conoscitiva senza impegno?\n\nA presto,\nMattia Chinaglia — Designer & Full-Stack Developer`
  );
  const [emailStyle, setEmailStyle] = useState<'branded' | 'direct'>('branded');
  const [badgeText, setBadgeText] = useState('Proposta Dedicata');
  const [ctaText, setCtaText] = useState('Visita il Portfolio');
  const [ctaUrl, setCtaUrl] = useState('https://tiadesigns.it');
  const [companyGreetingFormat, setCompanyGreetingFormat] = useState<'spett_le' | 'team_di' | 'ciao'>('spett_le');

  // Sending configuration
  const [delayMs, setDelayMs] = useState<number>(600); // ms between emails
  const [testEmailAddress, setTestEmailAddress] = useState('info@tiadesigns.it');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Execution engine state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const pauseRef = useRef(false);
  const cancelRef = useRef(false);

  // Preview modal/drawer state
  const [previewRecipientId, setPreviewRecipientId] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Toast / Status Message
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Anti-duplication sent registry state
  const [sentRegistry, setSentRegistry] = useState<Set<string>>(new Set());
  const [excludedAlreadySent, setExcludedAlreadySent] = useState<{ email: string; company?: string }[]>([]);
  const [showExcludedModal, setShowExcludedModal] = useState(false);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);

  // Addresses strictly exempt from duplication blocks (test / developer accounts)
  const EXEMPT_EMAILS = useMemo(
    () =>
      new Set([
        'info@tiadesigns.it',
        'tiachinaglia@gmail.com',
        'latitiante@gmail.com',
      ]),
    []
  );

  const fetchSentRegistry = async () => {
    setIsLoadingRegistry(true);
    try {
      const res = await fetch('/api/master/emails/sent-registry');
      const data = await res.json();
      if (data.success && Array.isArray(data.sentEmails)) {
        const s = new Set<string>();
        data.sentEmails.forEach((e: string) => s.add(e.toLowerCase().trim()));
        setSentRegistry(s);
      }
    } catch (err) {
      console.warn('Could not load sent registry:', err);
    } finally {
      setIsLoadingRegistry(false);
    }
  };

  useEffect(() => {
    fetchSentRegistry();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const resolveGreeting = (name?: string, company?: string): string | undefined => {
    const cleanName = (name || '').trim();
    const cleanCompany = (company || '').trim();
    if (cleanName) {
      return `Ciao ${cleanName},`;
    }
    if (cleanCompany) {
      if (companyGreetingFormat === 'team_di') {
        return `All'attenzione del team di ${cleanCompany},`;
      }
      if (companyGreetingFormat === 'ciao') {
        return `Ciao ${cleanCompany},`;
      }
      return `Spett.le ${cleanCompany},`;
    }
    return undefined;
  };

  // Helper to substitute variables
  const substituteVariables = (template: string, row: RecipientRow): string => {
    let result = template;
    const nameVal = row.name || row.company || '';
    const companyVal = row.company || row.name || 'la vostra azienda';
    const emailVal = row.email || '';

    result = result.replace(/\{nome\}|\{name\}/gi, nameVal);
    result = result.replace(/\{azienda\}|\{company\}|\{societa\}/gi, companyVal);
    result = result.replace(/\{email\}|\{e-mail\}|\{mail\}/gi, emailVal);

    if (row.extraData) {
      for (const [key, value] of Object.entries(row.extraData)) {
        const regex = new RegExp(`\\{${key}\\}`, 'gi');
        result = result.replace(regex, value);
      }
    }
    return result;
  };

  // Auto-detect CSV delimiter (comma, semicolon, tab)
  const detectDelimiter = (firstLine: string): string => {
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;
    if (semicolons > commas && semicolons > tabs) return ';';
    if (tabs > commas && tabs > semicolons) return '\t';
    return ',';
  };

  // Parse entire CSV respecting RFC 4180 rules (quotes, multiline fields, commas/semicolons/tabs)
  const parseFullCsv = (text: string, delimiter: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c !== '')) {
        rows.push(currentRow);
      }
    }
    return rows;
  };

  const [isLoading400Preset, setIsLoading400Preset] = useState(false);
  const [isLoadingPartialPreset, setIsLoadingPartialPreset] = useState(false);

  // Process and ingest CSV text content
  const processCsvContent = (cleanText: string, fileName: string) => {
    try {
      setCsvFileName(fileName);
      const firstLineEnd = cleanText.search(/[\r\n]/);
      const headerSample = firstLineEnd !== -1 ? cleanText.slice(0, firstLineEnd) : cleanText;
      const delimiter = detectDelimiter(headerSample);

      const allRows = parseFullCsv(cleanText, delimiter);
      if (allRows.length === 0) {
        showToast('Nessun dato valido trovato nel CSV.', 'error');
        return;
      }

      const firstRow = allRows[0];
      const hasEmailInFirst = firstRow.some((cell) => cell.includes('@'));

      let headers: string[] = [];
      let dataRows: string[][] = [];

      if (hasEmailInFirst) {
        headers = firstRow.map((_, idx) => (idx === 0 ? 'email' : idx === 1 ? 'nome' : `colonna_${idx + 1}`));
        dataRows = allRows;
      } else {
        headers = firstRow.map((h) => h.toLowerCase().replace(/[^a-z0-9_]/gi, '_'));
        dataRows = allRows.slice(1);
      }

      setCsvHeaders(headers);

      // Auto map columns
      const emailCol = headers.find((h) => /email|e_mail|mail|indirizzo|destinatario/i.test(h)) || headers[0] || '';
      const nameCol = headers.find((h) => /nome|name|cliente|contatto|referente/i.test(h)) || '';
      const companyCol = headers.find((h) => /azienda|company|societa|business|studio/i.test(h)) || '';
      const subjectCol = headers.find((h) => /oggetto|subject|titolo/i.test(h)) || '';
      const bodyCol = headers.find((h) => /corpo|body|messaggio|message|testo/i.test(h)) || '';

      const mapping = {
        email: emailCol,
        name: nameCol,
        company: companyCol,
        subject: subjectCol,
        body: bodyCol,
      };
      setColumnMapping(mapping);

      // Parse rows
      const parsedRaw: Record<string, string>[] = [];
      const builtRecipients: RecipientRow[] = [];
      const newlyExcluded: { email: string; company?: string }[] = [];

      dataRows.forEach((cells, lineIdx) => {
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cells[idx] || '';
        });
        parsedRaw.push(rowObj);

        const emailVal = (rowObj[emailCol] || '').trim();
        const cleanEmail = emailVal.toLowerCase();
        if (emailVal) {
          // Anti-duplication check: if already sent and not exempt, exclude
          if (!EXEMPT_EMAILS.has(cleanEmail) && sentRegistry.has(cleanEmail)) {
            newlyExcluded.push({
              email: emailVal,
              company: companyCol ? rowObj[companyCol] || '' : '',
            });
            return;
          }

          builtRecipients.push({
            id: `csv-${lineIdx}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            email: emailVal,
            name: nameCol ? rowObj[nameCol] || '' : '',
            company: companyCol ? rowObj[companyCol] || '' : '',
            customSubject: subjectCol && rowObj[subjectCol] ? rowObj[subjectCol] : undefined,
            customBody: bodyCol && rowObj[bodyCol] ? rowObj[bodyCol] : undefined,
            extraData: rowObj,
            status: 'idle',
          });
        }
      });

      setRawRows(parsedRaw);
      setRecipients(builtRecipients);
      setExcludedAlreadySent(newlyExcluded);

      if (newlyExcluded.length > 0) {
        showToast(
          `Importate ${builtRecipients.length} righe (${newlyExcluded.length} già inviate escluse per prevenire spam)`,
          'info'
        );
      } else {
        showToast(`Importate con successo ${builtRecipients.length} righe dal CSV!`, 'success');
      }
    } catch (err: any) {
      console.error('Error parsing CSV:', err);
      showToast('Errore nella lettura del file CSV: ' + err.message, 'error');
    }
  };

  // Handle CSV file upload
  const handleFileUpload = (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const cleanText = text.replace(/^\uFEFF/, '').trim();
      if (!cleanText) {
        showToast('Il file CSV è vuoto.', 'error');
        return;
      }
      processCsvContent(cleanText, file.name);
    };
    reader.readAsText(file);
  };

  // 1-Click loader for the converted 400 companies campaign
  const handleLoadPreloaded400 = async () => {
    setIsLoading400Preset(true);
    try {
      const res = await fetch('/campaigns/campagna_400_aziende.csv');
      if (!res.ok) throw new Error('File della campagna non trovato su /campaigns');
      const text = await res.text();
      const cleanText = text.replace(/^\uFEFF/, '').trim();
      processCsvContent(cleanText, 'campagna_400_aziende_tiadesigns.csv');
    } catch (err: any) {
      showToast('Impossibile caricare il file preimpostato: ' + err.message, 'error');
    } finally {
      setIsLoading400Preset(false);
    }
  };

  // 1-Click loader for campaign starting from Salesiani Verona (158 contacts)
  const handleLoadPreloadedPartial = async () => {
    setIsLoadingPartialPreset(true);
    try {
      const res = await fetch('/campaigns/campagna_da_salesianiverona.csv');
      if (!res.ok) throw new Error('File della campagna non trovato su /campaigns');
      const text = await res.text();
      const cleanText = text.replace(/^\uFEFF/, '').trim();
      processCsvContent(cleanText, 'campagna_da_salesianiverona.csv');
    } catch (err: any) {
      showToast('Impossibile caricare il file: ' + err.message, 'error');
    } finally {
      setIsLoadingPartialPreset(false);
    }
  };

  // Re-apply column mapping if user changes dropdown
  const applyColumnMapping = (newMapping: typeof columnMapping) => {
    setColumnMapping(newMapping);
    if (!rawRows.length) return;

    const newlyExcluded: { email: string; company?: string }[] = [];
    const rebuilt: RecipientRow[] = [];

    rawRows.forEach((rowObj, lineIdx) => {
      const emailVal = (rowObj[newMapping.email] || '').trim();
      const cleanEmail = emailVal.toLowerCase();
      if (!emailVal) return;

      if (!EXEMPT_EMAILS.has(cleanEmail) && sentRegistry.has(cleanEmail)) {
        newlyExcluded.push({
          email: emailVal,
          company: newMapping.company ? rowObj[newMapping.company] || '' : '',
        });
        return;
      }

      rebuilt.push({
        id: `csv-${lineIdx}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        email: emailVal,
        name: newMapping.name ? rowObj[newMapping.name] || '' : '',
        company: newMapping.company ? rowObj[newMapping.company] || '' : '',
        customSubject: newMapping.subject && rowObj[newMapping.subject] ? rowObj[newMapping.subject] : undefined,
        customBody: newMapping.body && rowObj[newMapping.body] ? rowObj[newMapping.body] : undefined,
        extraData: rowObj,
        status: 'idle',
      });
    });

    setExcludedAlreadySent(newlyExcluded);
    setRecipients(rebuilt);
    showToast('Mappatura colonne aggiornata!', 'info');
  };

  // Parse manual text input (e.g. "mario@test.it, Mario Rossi" or list of emails)
  const handleParseManualInput = () => {
    if (!manualText.trim()) {
      showToast('Inserisci almeno un\'email nel campo di testo', 'error');
      return;
    }

    const lines = manualText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed: RecipientRow[] = [];
    const newlyExcluded: { email: string; company?: string }[] = [];

    const addRecipientIfValid = (emailVal: string, nameVal = '', companyVal = '') => {
      const clean = emailVal.trim();
      const lower = clean.toLowerCase();
      if (!clean) return;
      if (!EXEMPT_EMAILS.has(lower) && sentRegistry.has(lower)) {
        newlyExcluded.push({ email: clean, company: companyVal });
        return;
      }
      parsed.push({
        id: `man-${parsed.length}-${Date.now()}`,
        email: clean,
        name: nameVal,
        company: companyVal,
        status: 'idle',
      });
    };

    lines.forEach((line) => {
      const bracketMatch = line.match(/^([^<]+)<([^>]+)>$/);
      if (bracketMatch) {
        addRecipientIfValid(bracketMatch[2], bracketMatch[1].trim());
        return;
      }

      const delimiter = line.includes(';') ? ';' : ',';
      const parts = line.split(delimiter).map((p) => p.trim());
      if (parts[0].includes('@')) {
        addRecipientIfValid(parts[0], parts[1] || '', parts[2] || '');
      } else if (parts[1] && parts[1].includes('@')) {
        addRecipientIfValid(parts[1], parts[0] || '', parts[2] || '');
      } else {
        const emailMatch = line.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
        if (emailMatch) {
          addRecipientIfValid(emailMatch[0]);
        }
      }
    });

    setExcludedAlreadySent(newlyExcluded);
    setRecipients(parsed);

    if (parsed.length === 0 && newlyExcluded.length === 0) {
      showToast('Nessun indirizzo email valido trovato nel testo.', 'error');
      return;
    }

    if (newlyExcluded.length > 0) {
      showToast(`Caricate ${parsed.length} email (${newlyExcluded.length} già inviate escluse per prevenire spam)`, 'info');
    } else {
      showToast(`Caricate ${parsed.length} email dalla lista manuale!`, 'success');
    }
  };

  // Download sample CSV
  const handleDownloadSampleCsv = () => {
    const csvContent = `email;nome;azienda;ruolo
mario.rossi@azienda.it;Mario Rossi;Acme Srl;CEO
giulia.bianchi@studio.com;Giulia Bianchi;Studio Creativo;Marketing Manager
info@ristoranteesempio.it;Marco;Ristorante Il Faro;Titolare`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_invio_email.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = recipients.length;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid = recipients.filter((r) => emailRegex.test(r.email));
    const invalid = recipients.filter((r) => !emailRegex.test(r.email));
    const seen = new Set<string>();
    const duplicates = recipients.filter((r) => {
      const lower = r.email.toLowerCase().trim();
      if (seen.has(lower)) return true;
      seen.add(lower);
      return false;
    });

    const sent = recipients.filter((r) => r.status === 'sent').length;
    const failed = recipients.filter((r) => r.status === 'failed').length;
    const pending = recipients.filter((r) => r.status === 'idle').length;

    return {
      total,
      validCount: valid.length,
      invalidCount: invalid.length,
      duplicateCount: duplicates.length,
      sent,
      failed,
      pending,
    };
  }, [recipients]);

  // Clean actions
  const handleRemoveDuplicates = () => {
    const seen = new Set<string>();
    const cleaned = recipients.filter((r) => {
      const lower = r.email.toLowerCase().trim();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
    const removed = recipients.length - cleaned.length;
    setRecipients(cleaned);
    showToast(`Rimossi ${removed} duplicati!`, 'success');
  };

  const handleRemoveInvalid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleaned = recipients.filter((r) => emailRegex.test(r.email.trim()));
    const removed = recipients.length - cleaned.length;
    setRecipients(cleaned);
    showToast(`Rimossi ${removed} indirizzi non validi!`, 'success');
  };

  const handleClearAll = () => {
    if (isRunning) return;
    if (confirm('Sei sicuro di voler svuotare la lista dei destinatari?')) {
      setRecipients([]);
      setRawRows([]);
      setCsvFileName(null);
      setManualText('');
      showToast('Lista svuotata.', 'info');
    }
  };

  // Delete single row
  const handleDeleteRow = (id: string) => {
    if (isRunning) return;
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  // Unblock / re-admit an email from the anti-spam sent registry
  const handleUnblockEmail = async (email: string) => {
    try {
      const res = await fetch(`/api/master/emails/sent-registry?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');

      const clean = email.toLowerCase().trim();
      setSentRegistry((prev) => {
        const next = new Set(prev);
        next.delete(clean);
        return next;
      });
      setExcludedAlreadySent((prev) =>
        prev.filter((item) => item.email.toLowerCase().trim() !== clean)
      );

      // Re-insert into recipients if available from rawRows
      const foundRow = rawRows.find(
        (r) => (r[columnMapping.email] || '').toLowerCase().trim() === clean
      );
      if (foundRow) {
        setRecipients((prev) => [
          ...prev,
          {
            id: `restored-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            email,
            name: columnMapping.name ? foundRow[columnMapping.name] || '' : '',
            company: columnMapping.company ? foundRow[columnMapping.company] || '' : '',
            customSubject:
              columnMapping.subject && foundRow[columnMapping.subject]
                ? foundRow[columnMapping.subject]
                : undefined,
            customBody:
              columnMapping.body && foundRow[columnMapping.body]
                ? foundRow[columnMapping.body]
                : undefined,
            status: 'idle',
          },
        ]);
      }

      showToast(`Indirizzo ${email} sbloccato dallo storico!`, 'success');
    } catch (err: any) {
      showToast(`Errore durante lo sblocco: ${err.message}`, 'error');
    }
  };

  // Single test send
  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      showToast('Inserisci un\'email di test valida', 'error');
      return;
    }
    const sampleRow: RecipientRow = recipients[0] || {
      id: 'test-preview',
      email: testEmailAddress,
      name: 'Marco Rossi',
      company: 'Azienda Esempio Srl',
      status: 'idle',
    };

    const resolvedSubject = sampleRow.customSubject || substituteVariables(templateSubject, sampleRow);
    const resolvedBody = sampleRow.customBody || substituteVariables(templateBody, sampleRow);
    const resolvedName = sampleRow.name || sampleRow.company || undefined;
    const resolvedGreeting = resolveGreeting(sampleRow.name, sampleRow.company);

    setIsSendingTest(true);
    try {
      const res = await fetch('/api/master/emails/auto-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmailAddress,
          name: resolvedName,
          greeting: resolvedGreeting,
          subject: `[TEST] ${resolvedSubject}`,
          body: resolvedBody,
          style: emailStyle,
          badgeText,
          ctaText,
          ctaUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore invio test');
      showToast(`Email di prova inviata con successo a ${testEmailAddress}!`, 'success');
    } catch (err: any) {
      showToast(`Errore invio test: ${err.message}`, 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Execution Engine: Send one email
  const sendSingleRecipient = async (row: RecipientRow): Promise<{ success: boolean; error?: string }> => {
    const cleanTo = row.email.toLowerCase().trim();
    if (!EXEMPT_EMAILS.has(cleanTo) && sentRegistry.has(cleanTo)) {
      return { success: false, error: 'Email già presente nello storico invii (bloccata per prevenire spam)' };
    }

    const resolvedSubject = row.customSubject || substituteVariables(templateSubject, row);
    const resolvedBody = row.customBody || substituteVariables(templateBody, row);
    const resolvedName = row.name || row.company || undefined;
    const resolvedGreeting = resolveGreeting(row.name, row.company);

    try {
      const res = await fetch('/api/master/emails/auto-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: row.email,
          name: resolvedName,
          greeting: resolvedGreeting,
          subject: resolvedSubject,
          body: resolvedBody,
          style: emailStyle,
          badgeText,
          ctaText,
          ctaUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Errore invio' };
      }
      // Update local sent registry
      setSentRegistry((prev) => new Set([...prev, cleanTo]));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Errore di rete' };
    }
  };

  // Start Batch Execution
  const handleStartAutoSending = async (onlyFailed = false) => {
    if (recipients.length === 0) {
      showToast('Nessun destinatario presente nella lista.', 'error');
      return;
    }

    const toProcess = recipients.filter((r) => (onlyFailed ? r.status === 'failed' : r.status !== 'sent'));
    if (toProcess.length === 0) {
      showToast('Tutte le email nella lista sono già state inviate!', 'info');
      return;
    }

    if (!confirm(`Confermi l'invio automatico a ${toProcess.length} destinatari con intervallo di ${delayMs}ms?`)) {
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    pauseRef.current = false;
    cancelRef.current = false;

    for (let i = 0; i < recipients.length; i++) {
      if (cancelRef.current) {
        showToast('Invio interrotto dall\'utente.', 'info');
        break;
      }

      // Check pause
      while (pauseRef.current) {
        await new Promise((r) => setTimeout(r, 400));
        if (cancelRef.current) break;
      }
      if (cancelRef.current) break;

      const current = recipients[i];
      if (onlyFailed ? current.status !== 'failed' : current.status === 'sent') {
        continue;
      }

      // Mark as sending
      setRecipients((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: 'sending', error: undefined } : r))
      );

      const result = await sendSingleRecipient(current);

      setRecipients((prev) =>
        prev.map((r, idx) =>
          idx === i
            ? {
                ...r,
                status: result.success ? 'sent' : 'failed',
                error: result.error,
                sentAt: result.success ? new Date().toLocaleTimeString('it-IT') : undefined,
              }
            : r
        )
      );

      // Delay between emails to respect SMTP rate limits
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    setIsRunning(false);
    setIsPaused(false);
    showToast('Processo di invio completato!', 'success');
  };

  const handlePauseResume = () => {
    if (isPaused) {
      pauseRef.current = false;
      setIsPaused(false);
    } else {
      pauseRef.current = true;
      setIsPaused(true);
    }
  };

  const handleCancelSending = () => {
    cancelRef.current = true;
    pauseRef.current = false;
    setIsPaused(false);
    setIsRunning(false);
  };

  // Export Results Report to CSV
  const handleExportReport = () => {
    if (!recipients.length) return;
    const header = ['email', 'nome', 'azienda', 'stato', 'inviata_alle', 'errore'];
    const rows = recipients.map((r) => [
      `"${r.email}"`,
      `"${r.name || ''}"`,
      `"${r.company || ''}"`,
      `"${r.status}"`,
      `"${r.sentAt || ''}"`,
      `"${r.error || ''}"`,
    ]);
    const csvString = [header.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_invio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report CSV esportato con successo!', 'success');
  };

  // Export Remaining (unsent / failed) Contacts to a clean CSV ready for re-import
  const handleExportRemainingCsv = () => {
    const remaining = recipients.filter((r) => r.status !== 'sent');
    if (remaining.length === 0) {
      showToast('Tutte le email nella lista sono già state inviate con successo!', 'info');
      return;
    }

    let csvContent = '';
    if (csvHeaders.length > 0) {
      // Reconstruct with identical CSV headers and columns from extraData
      const rows = remaining.map((r) => {
        return csvHeaders
          .map((h) => {
            let val = r.extraData?.[h] ?? '';
            if (columnMapping.subject === h && r.customSubject) val = r.customSubject;
            if (columnMapping.body === h && r.customBody) val = r.customBody;
            if (columnMapping.email === h && r.email) val = r.email;
            if (columnMapping.name === h && r.name) val = r.name;
            if (columnMapping.company === h && r.company) val = r.company;
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(';');
      });
      csvContent = [csvHeaders.map((h) => `"${h.replace(/"/g, '""')}"`).join(';'), ...rows].join('\r\n');
    } else {
      const headers = ['email', 'nome', 'azienda', 'oggetto', 'corpo'];
      const rows = remaining.map((r) =>
        [
          `"${r.email.replace(/"/g, '""')}"`,
          `"${(r.name || '').replace(/"/g, '""')}"`,
          `"${(r.company || '').replace(/"/g, '""')}"`,
          `"${(r.customSubject || substituteVariables(templateSubject, r)).replace(/"/g, '""')}"`,
          `"${(r.customBody || substituteVariables(templateBody, r)).replace(/"/g, '""')}"`,
        ].join(';')
      );
      csvContent = [headers.join(';'), ...rows].join('\r\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanBase = (csvFileName || 'campagna').replace(/\.csv$/i, '');
    a.download = `${cleanBase}_rimanenti_${remaining.length}_email.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`CSV con ${remaining.length} email rimanenti scaricato con successo!`, 'success');
  };

  // Selected preview item
  const previewItem = useMemo(() => {
    if (!recipients.length) {
      return {
        email: 'destinatario@esempio.it',
        name: 'Mario Rossi',
        company: 'Acme Corp',
        subject: substituteVariables(templateSubject, { id: '0', email: 'destinatario@esempio.it', name: 'Mario Rossi', company: 'Acme Corp', status: 'idle' }),
        body: substituteVariables(templateBody, { id: '0', email: 'destinatario@esempio.it', name: 'Mario Rossi', company: 'Acme Corp', status: 'idle' }),
      };
    }
    const found = recipients.find((r) => r.id === previewRecipientId) || recipients[0];
    const resolvedName = found.name || found.company || undefined;
    const resolvedGreeting = resolveGreeting(found.name, found.company);
    return {
      email: found.email,
      name: resolvedName,
      company: found.company || 'la vostra azienda',
      greeting: resolvedGreeting,
      subject: found.customSubject || substituteVariables(templateSubject, found),
      body: found.customBody || substituteVariables(templateBody, found),
    };
  }, [recipients, previewRecipientId, templateSubject, templateBody, companyGreetingFormat]);

  // Rendered HTML preview
  const livePreviewHtml = useMemo(() => {
    if (emailStyle === 'direct') {
      const paragraphs = previewItem.body
        .split(/\n\s*\n/)
        .map((p) => `<p style="margin: 0 0 12px 0; line-height: 1.6; color: #222;">${p.replace(/\n/g, '<br />')}</p>`)
        .join('');
      return `<div style="padding: 24px; font-family: -apple-system, sans-serif; background: #ffffff; color: #222; border-radius: 12px;">
        ${paragraphs}
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 13px; color: #666;">
          <strong>Mattia Chinaglia</strong> — Designer & Developer<br />
          <a href="https://tiadesigns.it" style="color: #0d9488;">tiadesigns.it</a>
        </div>
      </div>`;
    }
    return buildBrandedEmailHtml({
      recipientName: previewItem.name,
      greeting: previewItem.greeting,
      title: previewItem.subject,
      bodyMarkdown: previewItem.body,
      badgeText,
      ctaText: ctaText || undefined,
      ctaUrl: ctaUrl || undefined,
      forPreview: true,
    });
  }, [previewItem, emailStyle, badgeText, ctaText, ctaUrl]);

  // Filtered recipients
  const filteredRecipients = useMemo(() => {
    if (!searchQuery.trim()) return recipients;
    const q = searchQuery.toLowerCase();
    return recipients.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.company && r.company.toLowerCase().includes(q))
    );
  }, [recipients, searchQuery]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`fixed bottom-8 right-8 z-[99999] px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl transition-all ${
            statusMessage.type === 'success'
              ? 'bg-teal-950/90 border-teal-500/40 text-teal-200'
              : statusMessage.type === 'error'
              ? 'bg-red-950/90 border-red-500/40 text-red-200'
              : 'bg-neutral-900/90 border-white/20 text-neutral-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-5 h-5 text-teal-400 shrink-0" />
          ) : statusMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-teal-400 shrink-0" />
          )}
          <span className="text-xs font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Top Banner & Mode Selector */}
      <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-inner">
            <TiaIcon icon={WorkflowSquare01Icon} size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Inviatore Automatico di Email & CSV</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                PRO AUTOMATION
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Importa un foglio CSV o incolla le email: il sistema sostituisce i dati riga per riga e le invia in automatico.
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/[0.06] shrink-0">
          <button
            type="button"
            onClick={() => setInputMode('csv')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              inputMode === 'csv'
                ? 'bg-teal-400 text-black shadow-md shadow-teal-400/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importa CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setInputMode('manual')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              inputMode === 'manual'
                ? 'bg-teal-400 text-black shadow-md shadow-teal-400/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Inserimento Manuale</span>
          </button>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Import / Input Zone (Col 5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Input Box Card */}
          <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-xl flex flex-col gap-4">
            {inputMode === 'csv' ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                    <span>Carica File CSV</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLoadPreloaded400}
                      disabled={isLoading400Preset}
                      className="px-2.5 py-1 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                      title="Carica istantaneamente la campagna 400 aziende convertita"
                    >
                      <span>⚡</span>
                      <span>{isLoading400Preset ? 'Caricamento...' : 'Carica Campagna 400'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadPreloadedPartial}
                      disabled={isLoadingPartialPreset}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                      title="Carica le rimanenti 158 aziende a partire da Salesiani Verona"
                    >
                      <span>📍</span>
                      <span>{isLoadingPartialPreset ? 'Caricamento...' : 'Da Salesiani (158)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleCsv}
                      className="text-[11px] font-mono text-neutral-400 hover:text-white underline flex items-center gap-1 cursor-pointer"
                      title="Scarica un file CSV di esempio già pronto"
                    >
                      <TiaIcon icon={Download01Icon} size={13} />
                      <span>Template</span>
                    </button>
                  </div>
                </div>

                {/* Drag and drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-teal-500/30 hover:border-teal-400/70 rounded-2xl p-6 bg-teal-500/[0.02] hover:bg-teal-500/[0.05] transition-all flex flex-col items-center justify-center text-center gap-2 cursor-pointer group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 group-hover:scale-110 transition-transform flex items-center justify-center text-teal-400">
                    <TiaIcon icon={Upload01Icon} size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {csvFileName ? `File: ${csvFileName}` : 'Trascina qui il tuo CSV o fai click per selezionarlo'}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Supporta separatori virgola (,), punto e virgola (;) e tabulazione.
                    </p>
                  </div>
                </div>

                {/* Column Mappings if CSV headers loaded */}
                {csvHeaders.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col gap-2.5">
                    <p className="text-[11px] font-mono uppercase text-teal-300 font-bold flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>Mappatura Colonne CSV</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">Colonna Email *</label>
                        <select
                          value={columnMapping.email}
                          onChange={(e) => applyColumnMapping({ ...columnMapping, email: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
                        >
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">Colonna Nome</label>
                        <select
                          value={columnMapping.name}
                          onChange={(e) => applyColumnMapping({ ...columnMapping, name: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
                        >
                          <option value="">-- Nessuna --</option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">Colonna Azienda</label>
                        <select
                          value={columnMapping.company}
                          onChange={(e) => applyColumnMapping({ ...columnMapping, company: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
                        >
                          <option value="">-- Nessuna --</option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">Oggetto Custom</label>
                        <select
                          value={columnMapping.subject}
                          onChange={(e) => applyColumnMapping({ ...columnMapping, subject: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
                        >
                          <option value="">-- Usa Template --</option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">Corpo / Testo Custom</label>
                        <select
                          value={columnMapping.body}
                          onChange={(e) => applyColumnMapping({ ...columnMapping, body: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
                        >
                          <option value="">-- Usa Template --</option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-400" />
                    <span>Incolla Lista Email</span>
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400">Una per riga o separate da virgola</span>
                </div>
                <textarea
                  rows={6}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={`mario.rossi@azienda.it, Mario Rossi, Acme Srl\ngiulia@studio.com\n"Marco Bianchi" <marco@azienda.it>`}
                  className="w-full p-3 rounded-2xl bg-black/40 border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-teal-400 resize-none leading-relaxed"
                />
                <button
                  type="button"
                  onClick={handleParseManualInput}
                  className="w-full py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-teal-400/20"
                >
                  <Users className="w-4 h-4" />
                  <span>Carica Destinatari nel Modello</span>
                </button>
              </>
            )}

            {/* Quick Helper on placeholders */}
            <div className="p-3 rounded-2xl bg-teal-500/[0.05] border border-teal-500/20 text-[11px] text-teal-200/90 leading-relaxed">
              <strong className="text-teal-300">Variabili dinamiche utilizzabili:</strong>
              <div className="flex flex-wrap gap-1.5 mt-1.5 font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-black/60 text-teal-300 border border-teal-500/30 cursor-pointer" onClick={() => setTemplateBody(prev => prev + ' {nome}')}>
                  {'{nome}'}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-black/60 text-teal-300 border border-teal-500/30 cursor-pointer" onClick={() => setTemplateBody(prev => prev + ' {azienda}')}>
                  {'{azienda}'}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-black/60 text-teal-300 border border-teal-500/30 cursor-pointer" onClick={() => setTemplateBody(prev => prev + ' {email}')}>
                  {'{email}'}
                </span>
              </div>
            </div>
          </div>

          {/* Engine Controls & Anti-Spam Settings */}
          <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" />
              <span>Impostazioni & Protezione Invio</span>
            </h3>

            <div>
              <label className="block text-[11px] font-mono text-neutral-300 mb-1">
                Intervallo tra le email (Anti-Spam Rate Limit)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '300ms', value: 300, desc: 'Veloce' },
                  { label: '600ms', value: 600, desc: 'Consigliato' },
                  { label: '1.2s', value: 1200, desc: 'Prudente' },
                  { label: '2.0s', value: 2000, desc: 'Anti-Spam' },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setDelayMs(preset.value)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold flex flex-col items-center cursor-pointer transition-all ${
                      delayMs === preset.value
                        ? 'bg-teal-400 text-black shadow-md'
                        : 'bg-white/[0.04] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>{preset.label}</span>
                    <span className="text-[9px] opacity-70 font-sans font-normal">{preset.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Test Send Section */}
            <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2">
              <label className="text-[11px] font-mono text-neutral-300">Invia prima un test alla tua email:</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="tua-email@tiadesigns.it"
                  className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-teal-400"
                />
                <button
                  type="button"
                  disabled={isSendingTest}
                  onClick={handleSendTestEmail}
                  className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-teal-400" />
                  <span>{isSendingTest ? 'Invio...' : 'Invia Test'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Template & Message Builder (Col 7) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Modello Email & Messaggio</h3>
                <span className="text-xs text-neutral-400 font-mono">Da: info@tiadesigns.it</span>
              </div>

              {/* Style selector */}
              <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setEmailStyle('branded')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    emailStyle === 'branded'
                      ? 'bg-teal-400 text-black shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  🌟 Branded Tia
                </button>
                <button
                  type="button"
                  onClick={() => setEmailStyle('direct')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    emailStyle === 'direct'
                      ? 'bg-teal-400 text-black shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  ✉️ Diretto / Semplice
                </button>
              </div>
            </div>

            {/* Subject field */}
            <div>
              <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
                Oggetto dell'email *
              </label>
              <input
                type="text"
                required
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                placeholder="Es. Opportunità per {azienda}"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm font-semibold focus:outline-none focus:border-teal-400"
              />
            </div>

            {/* Optional Branded Options */}
            {emailStyle === 'branded' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-black/30 border border-white/[0.04]">
                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">Badge Superiore</label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="Proposta Dedicata"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">Testo Bottone CTA</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="Visita il Portfolio"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">Link Bottone CTA</label>
                  <input
                    type="url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://tiadesigns.it"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">Saluto Azienda (Senza Nome)</label>
                  <select
                    value={companyGreetingFormat}
                    onChange={(e) => setCompanyGreetingFormat(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
                  >
                    <option value="spett_le">Spett.le [Azienda]</option>
                    <option value="team_di">All'attenzione del team di [Azienda]</option>
                    <option value="ciao">Ciao [Azienda]</option>
                  </select>
                </div>
              </div>
            )}

            {/* Message Body Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Corpo del Messaggio (Markdown supportato) *
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setTemplateBody((prev) => prev + '\n\n**Grassetto**')}
                    className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] text-neutral-300 hover:text-white"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateBody((prev) => prev + '\n\n*Corsivo*')}
                    className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] text-neutral-300 hover:text-white"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateBody((prev) => prev + '\n- Punto 1\n- Punto 2')}
                    className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] text-neutral-300 hover:text-white"
                  >
                    • Lista
                  </button>
                </div>
              </div>
              <textarea
                rows={9}
                required
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                placeholder="Scrivi qui il corpo del messaggio..."
                className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-teal-400 resize-y leading-relaxed"
              />
            </div>

            {/* Live Preview Button */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-neutral-400">
                Anteprima per:{' '}
                <strong className="text-teal-300">{previewItem.name || previewItem.company}</strong> ({previewItem.email})
              </span>
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-teal-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Anteprima Reale Completa</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recipients List & Execution Console */}
      <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-xl flex flex-col gap-5">
        {/* Progress & Stats Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-400" />
              <span>Destinatari ({stats.total})</span>
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20">
              {stats.validCount} validi
            </span>
            {stats.duplicateCount > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {stats.duplicateCount} duplicati
              </span>
            )}
            {stats.invalidCount > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-red-500/10 text-red-300 border border-red-500/20">
                {stats.invalidCount} non validi
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-300 font-bold">
              ✅ {stats.sent} inviate
            </span>
            {stats.failed > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-red-500/20 text-red-300 font-bold">
                ❌ {stats.failed} fallite
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowExcludedModal(true)}
              className="px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Registro anti-duplicazione email già inviate"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{sentRegistry.size} registrate anti-spam</span>
            </button>
            {excludedAlreadySent.length > 0 && (
              <button
                type="button"
                onClick={() => setShowExcludedModal(true)}
                className="px-2.5 py-1 rounded-full text-xs font-mono bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 flex items-center gap-1.5 cursor-pointer transition-colors animate-pulse"
              >
                <Shield className="w-3.5 h-3.5 text-amber-300" />
                <span>{excludedAlreadySent.length} già inviate escluse</span>
              </button>
            )}
          </div>

          {/* Quick Tools */}
          <div className="flex flex-wrap items-center gap-2">
            {stats.duplicateCount > 0 && (
              <button
                type="button"
                onClick={handleRemoveDuplicates}
                disabled={isRunning}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium cursor-pointer transition-colors"
              >
                Rimuovi Duplicati
              </button>
            )}
            {stats.invalidCount > 0 && (
              <button
                type="button"
                onClick={handleRemoveInvalid}
                disabled={isRunning}
                className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium cursor-pointer transition-colors"
              >
                Rimuovi Non Validi
              </button>
            )}
            {recipients.length > 0 && (
              <button
                type="button"
                onClick={handleExportReport}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <TiaIcon icon={Download01Icon} size={14} />
                <span>Esporta Report CSV</span>
              </button>
            )}
            {recipients.some((r) => r.status === 'sent') && recipients.some((r) => r.status !== 'sent') && (
              <button
                type="button"
                onClick={handleExportRemainingCsv}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                title="Esporta in CSV solo le email rimanenti / non ancora inviate (esclude quelle già mandate con successo)"
              >
                <TiaIcon icon={Download01Icon} size={14} />
                <span>Esporta Rimanenti ({recipients.filter((r) => r.status !== 'sent').length})</span>
              </button>
            )}
            {recipients.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isRunning}
                className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium cursor-pointer transition-colors"
              >
                Svuota Lista
              </button>
            )}
          </div>
        </div>

        {/* Anti-Spam Excluded Banner */}
        {excludedAlreadySent.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-amber-300 flex items-center gap-2">
                  <span>Protezione Anti-Spam attiva</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
                    {excludedAlreadySent.length} {excludedAlreadySent.length === 1 ? 'esclusa' : 'escluse'}
                  </span>
                </p>
                <p className="text-amber-200/70 text-[11px]">
                  {excludedAlreadySent.length === 1
                    ? "1 email a cui hai già inviato dal sito è stata automaticamente esclusa dalla lista per non risultare spam."
                    : `${excludedAlreadySent.length} email a cui hai già inviato dal sito sono state automaticamente escluse dalla lista per non risultare spam.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowExcludedModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 font-semibold cursor-pointer transition-colors border border-amber-500/30 text-xs flex items-center gap-1.5"
            >
              <span>Vedi o sblocca ({excludedAlreadySent.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Error / Interruption Banner with 1-click download of remaining emails */}
        {stats.failed > 0 && !isRunning && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-500/20 via-orange-500/10 to-transparent border border-red-500/30 flex flex-wrap items-center justify-between gap-3 text-xs text-red-200 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center text-red-300 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-red-300 flex items-center gap-2">
                  <span>Invio interrotto o con errori ({stats.failed} {stats.failed === 1 ? 'fallita' : 'fallite'})</span>
                </p>
                <p className="text-red-200/70 text-[11px]">
                  Scarica subito un nuovo CSV pulito contenente solo le email rimaste (senza quelle già inviate con successo).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportRemainingCsv}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold cursor-pointer transition-all shadow-lg text-xs flex items-center gap-2"
              title="Scarica un nuovo file CSV pronto da ricaricare con solo le email non inviate"
            >
              <TiaIcon icon={Download01Icon} size={14} />
              <span>Scarica CSV Rimanenti ({recipients.filter((r) => r.status !== 'sent').length})</span>
            </button>
          </div>
        )}

        {/* Live Progress Bar during execution */}
        {isRunning && (
          <div className="p-4 rounded-2xl bg-black/60 border border-teal-500/30 flex flex-col gap-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-teal-300 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                Invio in corso: {stats.sent} su {stats.total} (
                {Math.round(((stats.sent + stats.failed) / (stats.total || 1)) * 100)}%)
              </span>
              <span className="text-neutral-400">{isPaused ? 'In Pausa' : `Ritardo: ${delayMs}ms`}</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300"
                style={{
                  width: `${Math.round(((stats.sent + stats.failed) / (stats.total || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Main Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] w-full sm:w-72">
            <TiaIcon icon={Search01Icon} size={14} className="text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per email, nome o azienda..."
              className="bg-transparent text-white text-xs focus:outline-none w-full"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            {isRunning ? (
              <>
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                  <span>{isPaused ? 'Riprendi' : 'Pausa'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelSending}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-red-600/20"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Interrompi</span>
                </button>
                {isPaused && (
                  <button
                    type="button"
                    onClick={handleExportRemainingCsv}
                    className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
                    title="Esporta le email rimanenti"
                  >
                    <TiaIcon icon={Download01Icon} size={14} />
                    <span>Esporta Rimanenti ({recipients.filter((r) => r.status !== 'sent').length})</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {stats.failed > 0 && (
                  <button
                    type="button"
                    onClick={() => handleStartAutoSending(true)}
                    className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Riprova solo le fallite ({stats.failed})</span>
                  </button>
                )}
                {stats.sent > 0 && recipients.some((r) => r.status !== 'sent') && (
                  <button
                    type="button"
                    onClick={handleExportRemainingCsv}
                    className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md"
                    title="Scarica un nuovo file CSV con solo le email rimanenti da inviare (senza quelle già mandate con successo)"
                  >
                    <TiaIcon icon={Download01Icon} size={15} />
                    <span>Esporta CSV Rimanenti ({recipients.filter((r) => r.status !== 'sent').length})</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={recipients.length === 0}
                  onClick={() => handleStartAutoSending(false)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-400/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Avvia Invio Automatico ({recipients.length})</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Recipients Table */}
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-black/30">
          <div className="max-h-96 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#081410] border-b border-white/[0.08] text-[11px] font-mono text-neutral-400 uppercase tracking-wider z-10">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Destinatario</th>
                  <th className="py-3 px-4">Azienda</th>
                  <th className="py-3 px-4">Oggetto Risolto</th>
                  <th className="py-3 px-4">Stato</th>
                  <th className="py-3 px-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredRecipients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-500">
                      Nessun destinatario presente. Carica un file CSV o incolla le email per iniziare.
                    </td>
                  </tr>
                ) : (
                  filteredRecipients.slice(0, visibleCount).map((r, idx) => {
                    const resolvedSub = r.customSubject || substituteVariables(templateSubject, r);
                    return (
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 text-neutral-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white font-mono">{r.email}</span>
                            {r.name && <span className="text-[11px] text-neutral-400">{r.name}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-neutral-300">
                          {r.company || <span className="text-neutral-600 italic">-</span>}
                        </td>
                        <td className="py-3 px-4 text-neutral-300 max-w-xs truncate" title={resolvedSub}>
                          {resolvedSub}
                        </td>
                        <td className="py-3 px-4">
                          {r.status === 'idle' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                              ⏳ In attesa
                            </span>
                          )}
                          {r.status === 'sending' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/40 animate-pulse font-bold">
                              🔄 Invio in corso...
                            </span>
                          )}
                          {r.status === 'sent' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1 w-fit">
                              ✅ Inviata {r.sentAt && `(${r.sentAt})`}
                            </span>
                          )}
                          {r.status === 'failed' && (
                            <span
                              className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/30 font-bold flex items-center gap-1 w-fit cursor-help"
                              title={r.error || 'Errore'}
                            >
                              ❌ Errore: {r.error || 'Fallito'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewRecipientId(r.id);
                                setShowPreviewModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-teal-500/20 text-neutral-400 hover:text-teal-300 cursor-pointer transition-colors"
                              title="Anteprima personalizzata per questa riga"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isRunning}
                              onClick={() => handleDeleteRow(r.id)}
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/20 text-neutral-400 hover:text-red-300 cursor-pointer transition-colors disabled:opacity-30"
                              title="Rimuovi destinatario"
                            >
                              <TiaIcon icon={Delete02Icon} size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {filteredRecipients.length > visibleCount && (
              <div className="p-3 bg-[#081410] border-t border-white/[0.08] flex items-center justify-between text-xs text-neutral-400">
                <span>Visualizzati <strong>{visibleCount}</strong> di <strong>{filteredRecipients.length}</strong> destinatari (Virtualizzazione attiva per prestazioni istantanee).</span>
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => Math.min(prev + 200, filteredRecipients.length))}
                  className="px-3 py-1 bg-white/[0.06] hover:bg-teal-500/20 text-teal-300 rounded-lg font-mono text-[11px] transition-colors"
                >
                  Mostra altri 200 ↓
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#081410] border border-white/20 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h4 className="font-bold text-white text-base">Anteprima Reale Destinatario</h4>
                <p className="text-xs text-neutral-400">
                  Per: <strong className="text-teal-300">{previewItem.name || previewItem.company}</strong> ({previewItem.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 flex flex-col gap-3">
              <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                <span className="text-neutral-400 font-mono">Oggetto: </span>
                <strong className="text-white">{previewItem.subject}</strong>
              </div>

              {/* Rendered HTML Container */}
              <div className="rounded-2xl border border-white/10 overflow-hidden bg-black p-1 shadow-inner">
                <div
                  className="rounded-xl overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: livePreviewHtml }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-bold cursor-pointer transition-colors"
              >
                Chiudi Anteprima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excluded Anti-Spam Modal */}
      {showExcludedModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#081410] border border-white/20 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Registro Anti-Spam & Contatti Esclusi</h4>
                  <p className="text-xs text-neutral-400">
                    {sentRegistry.size} email registrate nello storico • {excludedAlreadySent.length} escluse dal file attuale
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExcludedModal(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 flex flex-col gap-4">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-neutral-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>
                  Per proteggere la tua reputazione mittente e non risultare spam, il sistema esclude automaticamente tutti i contatti a cui hai già inviato un'email dal sito. Gli account di test (<strong className="text-white">info@tiadesigns.it</strong>, <strong className="text-white">tiachinaglia@gmail.com</strong>, <strong className="text-white">latitiante@gmail.com</strong>) sono sempre ammessi e non vengono mai bloccati.
                </span>
              </div>

              {excludedAlreadySent.length > 0 ? (
                <div>
                  <h5 className="text-xs font-semibold text-amber-300 mb-2 uppercase tracking-wider">
                    Contatti esclusi automaticamente ({excludedAlreadySent.length}):
                  </h5>
                  <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5 bg-black/40 max-h-72 overflow-y-auto">
                    {excludedAlreadySent.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between gap-2 hover:bg-white/[0.02]">
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-white truncate">{item.email}</p>
                          {item.company && (
                            <p className="text-[11px] text-neutral-400 truncate">{item.company}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnblockEmail(item.email)}
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[11px] font-medium border border-red-500/20 cursor-pointer shrink-0 transition-colors"
                          title="Rimuovi dallo storico e riammetti nella lista di invio"
                        >
                          Sblocca e riammetti
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center text-xs text-neutral-400">
                  Nessun contatto del file attuale è presente nello storico invii. Tutti i destinatari sono nuovi.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowExcludedModal(false)}
                className="px-5 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-bold cursor-pointer transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
