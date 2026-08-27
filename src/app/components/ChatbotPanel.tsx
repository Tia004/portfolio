'use client';

import React, { useEffect, useState } from 'react';
import TiaIcon from './TiaIcon';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import { useLanguage } from './LanguageProvider';
import { t } from '@/lib/translations';
import { ArrowExpandDiagonal01Icon, BubbleChatIcon, Cancel01Icon, FilePenIcon, UserIcon } from './icons';
import type { ChatCategory } from '@/lib/chat-categories';
import { CHAT_CATEGORY_OPTIONS } from '@/lib/chat-categories';

export interface ChatbotMessage {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  prefill?: Record<string, string>;
  requiresApproval?: boolean;
  approvalState?: 'pending' | 'approved' | 'revising';
  /** True when this message carries an input (budget slider, name/email form
      or recap): suggestion chips must NEVER render under those — a stray
      bubble there re-proposes the field below it. */
  noChips?: boolean;
}

// Known option labels per specialization and language. Used as a fallback so
// the choice chips ALWAYS render: when the AI writes the drill-down options as
// a plain-text list instead of emitting the [SUGGESTIONS:...] marker, we
// detect the known labels and render them as bubbles anyway (same chip system:
// stale-deactivation, click-to-answer, pop-in).
const KNOWN_OPTION_LABELS: Record<string, Record<string, string[]>> = {
  it: {
    'software-web': ['Vetrina', 'E-commerce', 'Web App / Dashboard', 'SaaS', 'Software su misura'],
    design: ['UI', 'UX', 'Logo', 'Branding', 'Grafica social', 'Altro'],
    video: ['Documentario', 'Cortometraggio', 'Mediometraggio', 'Lungometraggio', 'Spot pubblicitario'],
    hardware: ['Diagnosi', 'Riparazione', 'Upgrade', 'Consulenza IT'],
    social: ['Post', 'Carousel', 'Stories', 'Thumbnail', 'Calendario editoriale'],
    interlude: ['Ricevere i file del sito', 'Pubblicazione completa affidata a Tia', '1-3 pagine', '4-6 pagine', '7-10 pagine', 'Più di 10 pagine'],
  },
  en: {
    'software-web': ['Showcase site', 'E-commerce', 'Web App / Dashboard', 'SaaS', 'Custom software'],
    design: ['UI', 'UX', 'Logo', 'Branding', 'Social graphics', 'Other'],
    video: ['Documentary', 'Short film', 'Medium-length film', 'Feature film', 'Commercial spot'],
    hardware: ['Diagnosis', 'Repair', 'Upgrade', 'IT consulting'],
    social: ['Posts', 'Carousels', 'Stories', 'Thumbnails', 'Editorial calendar'],
    interlude: ['Receive the website files', 'Full publishing handled by Tia', '1-3 pages', '4-6 pages', '7-10 pages', 'More than 10 pages'],
  },
  es: {
    'software-web': ['Sitio vitrina', 'E-commerce', 'Web App / Dashboard', 'SaaS', 'Software a medida'],
    design: ['UI', 'UX', 'Logo', 'Branding', 'Gráficos para redes', 'Otro'],
    video: ['Documental', 'Cortometraje', 'Mediometraje', 'Largometraje', 'Spot publicitario'],
    hardware: ['Diagnóstico', 'Reparación', 'Upgrade', 'Consultoría IT'],
    social: ['Posts', 'Carruseles', 'Stories', 'Miniaturas', 'Calendario editorial'],
    interlude: ['Recibir los archivos del sitio', 'Publicación completa a cargo de Tia', '1-3 páginas', '4-6 páginas', '7-10 páginas', 'Más de 10 páginas'],
  },
};

/**
 * Fallback: extract known option labels a bot message mentions as a plain-text
 * list ("Vetrina: ... \n E-commerce: ...") and turn them into chips. Only
 * triggers when at least 2 known labels are found, so ordinary descriptive
 * replies ("per il tuo sito e-commerce…") never spawn stray bubbles.
 */
function detectPlainTextSuggestions(text: string, category: ChatCategory, lang: string): string[] {
  const byLang = KNOWN_OPTION_LABELS[lang];
  if (!byLang) return [];
  const labels = [...(byLang[category] ?? []), ...byLang.interlude];
  const found: { label: string; idx: number }[] = [];
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match at line start, or after a pipe/list marker — never mid-sentence.
    const re = new RegExp(`(?:^|\n|\|)\s*(?:[-*•]|\\d+[.)])?\s*${escaped}\\b`, 'i');
    const m = re.exec(text);
    if (m) found.push({ label, idx: m.index });
  }
  if (found.length < 2) return [];
  // Dedupe by position keeping the longest label (e.g. "Spot pubblicitario"
  // over "Spot"), then preserve the order of appearance in the text.
  const byIdx = new Map<number, string>();
  for (const f of found) {
    const existing = byIdx.get(f.idx);
    if (!existing || f.label.length > existing.length) byIdx.set(f.idx, f.label);
  }
  const result = [...byIdx.values()];
  return result.length >= 2 ? result : [];
}

interface ChatbotPanelProps {
  messages: ChatbotMessage[];
  typing: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  category: ChatCategory;
  onSelectCategory: (value: ChatCategory) => void;
  chatStarted: boolean;
  chatBlocked: boolean;
  onReset: () => void;
  messagesRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onSuggestion: (text: string) => void;
  renderBotText: (msg: ChatbotMessage, isFormStale?: boolean) => React.ReactNode;
}

export default function ChatbotPanel({
  messages,
  typing,
  input,
  onInputChange,
  onSend,
  category,
  onSelectCategory,
  chatStarted,
  chatBlocked,
  onReset,
  messagesRef,
  inputRef,
  onSuggestion,
  renderBotText,
}: ChatbotPanelProps) {
  const { lang } = useLanguage();

  // Latest message id of ANY kind — chips deactivate as soon as anything newer
  // exists (user text, a chip pick, or a bot reply).
  const latestId = messages.reduce((max, m) => Math.max(max, m.id), 0);
  // Latest message id that still carries a [FORM_REQUIRED] marker: only the
  // most recent request stays active. When the bot re-asks the same fields
  // (e.g. the visitor skipped name/email), older forms collapse to a dimmed
  // note so the same data can't be entered twice and the history stays clean.
  const latestFormId = messages.reduce(
    (max, m) => (/\[FORM_REQUIRED:/i.test(m.text) ? Math.max(max, m.id) : max),
    0,
  );
  const categoryOption = CHAT_CATEGORY_OPTIONS.find(option => option.value === category);

  // Fullscreen composer — a focused, padded overlay to write long messages
  // without the compact bar. Shares the same `input`/`onSend` state.
  const [composerOpen, setComposerOpen] = useState(false);
  useEffect(() => {
    if (!composerOpen) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setComposerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    // Focus the textarea inside the fullscreen composer
    setTimeout(() => {
      const ta = document.querySelector<HTMLTextAreaElement>('[data-composer-textarea]');
      ta?.focus();
    }, 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus();
    };
  }, [composerOpen]);

  // ── Expand tip ──
  // Temporary tooltip pointing at the fullscreen toggle. On desktop it
  // reappears on hover; on mobile it stays while writing until dismissed.
  const [isTouch, setIsTouch] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(hover: none), (pointer: coarse)');
    const onChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // ── "Nuova chat" tooltip ──
  // Explains that starting a new chat deletes the current one and lets you
  // pick a specialization from the welcome bubbles. Temporary on mobile
  // (auto-hides after 5s), hover on desktop.
  const [showResetTip, setShowResetTip] = useState(true);
  const [resetTipHover, setResetTipHover] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowResetTip(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const [showTip, setShowTip] = useState(true);
  const [tipHover, setTipHover] = useState(false);
  const [tipFocused, setTipFocused] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  // Auto-hide the initial hint after a few seconds.
  useEffect(() => {
    const timer = setTimeout(() => setShowTip(false), 4500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-grow the compact input bar up to 3 lines; beyond that it scrolls
  // internally instead of pushing the bar taller.
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 24;
    ta.style.height = `${Math.min(ta.scrollHeight, lineHeight * 3)}px`;
  }, [input, inputRef]);

  const resetTitle = lang === 'it'
    ? 'Avvia una nuova chat — la conversazione corrente verrà eliminata'
    : lang === 'es'
      ? 'Iniciar nuevo chat — se eliminará la conversación actual'
      : 'Start a new chat — the current conversation will be deleted';

  /** Welcome specialization bubbles — the replacement for the old bar.
      Choosing one does NOT post a user message: it picks the specialization
      and the bot immediately replies (see selectChatCategory in HomeShell). */
  const welcomeBubbles = (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2" role="radiogroup" aria-label={t('chat.category_label', lang)}>
      {CHAT_CATEGORY_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={category === option.value}
          title={t(option.labelKey, lang)}
          disabled={chatBlocked}
          onClick={() => onSelectCategory(option.value)}
          className="animate-pop-in shrink-0 rounded-full border border-white/[0.08] bg-[#081410] px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 transition-all touch-manipulation hover:border-teal-400/40 hover:bg-teal-400/[0.06] hover:text-teal-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t(option.labelKey, lang)}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="w-full min-w-0 max-w-full flex flex-col flex-1 min-h-0">
        {/* Header row — "Nuova chat" sits ABOVE the messages (never overlaps
            them or the curtain), so even the first bubble stays fully visible.
            Its tooltip explains that a new chat deletes the current one and
            lets you pick a specialization from the welcome bubbles (the old
            specialization bar is gone). */}
        <div className="mb-2 flex items-center justify-end">
          {/* relative z-20: the reset button must paint above the chat curtain
              (which extends -top-2rem into this header row) so the blur never
              frosts it. */}
          <div className="relative z-20">
            <button
              type="button"
              onClick={onReset}
              title={resetTitle}
              aria-label={t('chat.new_chat', lang)}
              onMouseEnter={() => setResetTipHover(true)}
              onMouseLeave={() => setResetTipHover(false)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#081410] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] px-3 py-1.5 text-neutral-400 transition-all hover:bg-[#0e1c18] hover:text-neutral-200 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
            >
              <TiaIcon icon={FilePenIcon} size={14} strokeWidth={1.8} />
              <span className="text-xs font-medium">{t('chat.new_chat', lang)}</span>
            </button>
            {/* Tooltip — 5s on mount (mobile), hover on desktop */}
            {(showResetTip || resetTipHover) && (
              <div className="pointer-events-none absolute right-0 top-full mt-2 z-20 w-max max-w-[240px]">
                <div className="rounded-xl border border-white/[0.08] bg-black/85 px-3 py-2 text-[11px] leading-snug text-neutral-400 shadow-xl backdrop-blur-md">
                  {t('chat.new_chat_tip', lang)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages — scrollable history under a black curtain, no window chrome.
            flex-1 fills the section's remaining height (the section is exactly
            one viewport tall), so the chat never spills past the screen. */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          {/* Native scroll via Lenis allowNestedScroll: the messages scroll
              themselves, and at their boundary the wheel chains to the page
              (Lenis stays in sync — no fight, no jitter). */}
          <div
            ref={messagesRef}
            className="flex-1 min-h-0 relative overflow-y-auto scrollbar-hide"
          >
            {messages.length === 0 && !typing ? (
              /* Vertically centered in the space between the "Nuova chat"
                 header and the input bar. The inner wrapper uses my-auto:
                 when there is room the welcome block centers, and on small
                 screens where it doesn't fit the auto margins collapse to 0
                 so it starts at the top and scrolls — nothing is cut off. */
              <div className="flex min-h-full flex-col items-center justify-center px-6 pt-2 sm:pt-6 pb-10 text-center">
                <div className="my-auto flex w-full flex-col items-center text-center">
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{t('chat.empty_heading', lang)}</h3>
                  <p className="mt-2 max-w-md text-sm sm:text-base leading-relaxed text-neutral-400">{t('chat.welcome_short', lang)}</p>
                  {welcomeBubbles}
                </div>
              </div>
            ) : (
              // Bottom-anchored stack: messages grow upward from just above
              // the input bar (like Gemini/WhatsApp), pushing older ones up
              // instead of starting at the top of the box. pt-24 clears the
              // black curtain (h-20) so the very first message is never
              // covered when the user scrolls all the way back up.
              <div className="flex min-h-full flex-col justify-end gap-4 px-4 sm:px-5 md:px-6 pt-16 sm:pt-24 pb-4 sm:pb-5 md:pb-6">
                {messages.map((msg) => {
                  // Extract suggestion chips from bot messages. Primary source
                  // is the [SUGGESTIONS:...] marker; when the AI wrote the
                  // options as a plain-text list instead, detect the known
                  // labels so the bubbles ALWAYS appear. Messages that carry
                  // an input (slider/form/recap) NEVER show chips.
                  const suggMatch = !msg.noChips && msg.sender === 'bot' && msg.text ? msg.text.match(/\[SUGGESTIONS:([^\]]+)\]/i) : null;
                  const suggestions = suggMatch
                    ? suggMatch[1].split('|').map(s => s.trim()).filter(Boolean)
                    : !msg.noChips && msg.sender === 'bot' && msg.text
                      ? detectPlainTextSuggestions(msg.text, category, lang)
                      : [];
                  const isStale = msg.id !== latestId;
                  // A form is stale when a NEWER message re-asks the fields.
                  const hasForm = /\[FORM_REQUIRED:/i.test(msg.text ?? '');
                  const isFormStale = hasForm && msg.id !== latestFormId;
                  return (
                    <div key={msg.id} className={msg.sender === 'bot' ? 'animate-bot-msg-in motion-safe:animate-bot-msg-in' : ''}>
                      <div className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'bot' && (
                          <div className="w-9 h-9 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 mt-1">
                            <TiaIcon icon={BubbleChatIcon} size={16} className="text-teal-400" />
                          </div>
                        )}
                        <div className={`max-w-[80%] px-4 py-3 text-sm sm:text-base leading-relaxed break-words min-w-0 ${msg.sender === 'user'
                          ? 'bg-teal-600 text-white rounded-2xl rounded-br-sm'
                          : 'bg-white/[0.04] text-neutral-200 rounded-2xl rounded-bl-sm'
                          }`}
                        >
                          {msg.sender === 'bot' && msg.text
                            ? (                              <React.Fragment>
                                {renderBotText(msg, isFormStale)}
                                {/* Blinking writing caret while the reply is still streaming in */}
                                {typing && msg.id === latestId && (
                                  <span className="bot-typing-caret" aria-hidden="true" />
                                )}
                              </React.Fragment>)
                            : (msg.text || (
                              <span className="flex gap-1.5 py-1">
                                <span className="w-2 h-2 rounded-full bg-teal-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-teal-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full bg-teal-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                              </span>
                            ))}
                        </div>
                        {msg.sender === 'user' && (
                          <div className="w-9 h-9 rounded-full bg-teal-600/30 flex items-center justify-center shrink-0 mt-1">
                            <TiaIcon icon={UserIcon} size={16} className="text-teal-300" />
                          </div>
                        )}
                      </div>
                      {/* Suggestion chips — only the latest message's chips are clickable */}
                      {suggestions.length > 0 && (
                        <div className="flex gap-2 flex-wrap mt-2 ml-12">
                          {suggestions.map((sugg, idx) => (
                            isStale ? (
                              <span
                                key={idx}
                                className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs sm:text-sm text-neutral-600 cursor-default"
                              >
                                {sugg}
                              </span>
                            ) : (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => onSuggestion(sugg)}
                                disabled={chatBlocked}
                                className="animate-pop-in shrink-0 rounded-full border border-teal-400/30 bg-teal-400/[0.08] px-3 py-1.5 text-xs sm:text-sm text-teal-300 hover:bg-teal-400/20 hover:border-teal-400/50 hover:text-teal-200 transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-teal-400/[0.08] disabled:hover:border-teal-400/30 disabled:hover:text-teal-300"
                                style={{ animationDelay: `${idx * 45}ms` }}
                              >
                                {sugg}
                              </button>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Curtain — ProgressiveBlur with backdrop-filter layers. The
              container extends past the top edge so the blur samples the
              Molten background beyond the messages, never clipped. w-screen +
              left-1/2 centering spans the FULL viewport (the messages column
              is max-w-3xl, so a left-0 right-0 curtain would end at the column
              and show sharp side cuts); the symmetric mask dissolves the blur
              to 0 on BOTH sides — no hard edge above the messages nor at the
              section boundary. Sits at z-10: the "Nuova chat" button (z-20)
              and the section heading (relative z-20 in HomeShell) stay above. */}
          {messages.length > 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-[2rem] left-1/2 -translate-x-1/2 w-screen h-[6rem] sm:h-[8rem] z-10"
            >
              <ProgressiveBlur position="top" height="100%" blurLevels={[1, 4, 9, 18]} symmetric />
            </div>
          )}

        </div>

        {/* Input bar — Gemini-style. NO border/ring on the bar: the glow is a
            separate blurred teal HALO that emerges from under the bar and rises
            toward the welcome message while the chat is empty, then DIMS once
            the first message is sent (chatStarted). The bar itself is clean
            liquid glass — translucent, backdrop blur, subtle inner sheen. */}
        <div className="relative shrink-0 pt-4 sm:pt-5">
          {/* Teal halo — brightest at the bar's top edge, blurring upward into
              the empty-state area. pointer-events-none, sits behind the bar. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 transition-opacity duration-700"
            style={{
              top: '-190px',
              width: 'min(520px, 94%)',
              height: '220px',
              background: 'radial-gradient(50% 52% at 50% 100%, rgba(45,212,191,0.55) 0%, rgba(45,212,191,0.16) 55%, transparent 78%)',
              filter: 'blur(26px)',
              opacity: chatStarted ? 0.22 : 0.55,
            }}
          />
          <div className="relative z-10 flex items-center gap-2 rounded-full bg-[#081410] p-2 sm:p-2.5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-all duration-500 focus-within:bg-[#0e1c18] focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
            {/* Expand tip — temporary; hover on desktop, focus + X on mobile */}
            {(showTip || tipHover || (isTouch && tipFocused && !tipDismissed)) && (
              <div className="pointer-events-none absolute bottom-full left-0 mb-1.5 z-20 w-max max-w-[240px]">
                <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium text-neutral-500 backdrop-blur-md transition-colors hover:text-neutral-300">
                  <TiaIcon icon={ArrowExpandDiagonal01Icon} size={11} className="shrink-0 text-teal-400/70" />
                  <span className="truncate">{t('chat.fullscreen_tip', lang)}</span>
                  {isTouch && (
                    <button
                      type="button"
                      onClick={() => setTipDismissed(true)}
                      aria-label={t('chat.fullscreen_close', lang)}
                      className="shrink-0 ml-0.5 -mr-0.5 p-0.5 rounded-full text-neutral-600 hover:text-white transition-colors"
                    >
                      <TiaIcon icon={Cancel01Icon} size={10} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Fullscreen composer toggle */}
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              disabled={chatBlocked}
              aria-label={t('chat.fullscreen_title', lang)}
              title={t('chat.fullscreen_title', lang)}
              onMouseEnter={() => setTipHover(true)}
              onMouseLeave={() => setTipHover(false)}
              className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-neutral-500 transition-all hover:text-teal-300 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <TiaIcon icon={ArrowExpandDiagonal01Icon} size={18} strokeWidth={1.8} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onFocus={() => setTipFocused(true)}
              onBlur={() => { setTipFocused(false); setTipDismissed(false); }}
              placeholder={chatBlocked ? t('bot.offtopic_blocked_hint', lang) : t(categoryOption?.placeholderKey ?? 'chat.placeholder_software_web', lang)}
              disabled={chatBlocked}
              rows={1}
              className="flex-1 min-w-0 bg-transparent px-1 py-0 text-sm leading-6 text-white placeholder-neutral-600 resize-none overflow-y-auto scrollbar-hide outline-none disabled:cursor-not-allowed disabled:opacity-60"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <button
              type="button"
              onClick={onSend}
              disabled={!input.trim() || chatBlocked}
              aria-label={t('chat.send', lang)}
              className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${input.trim() && !chatBlocked ? 'bg-teal-600 text-white hover:bg-teal-500 shadow-lg shadow-teal-500/25' : 'bg-neutral-800/60 text-neutral-500'}`}
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5" />
                <path d="m5 12 7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>

      </div>

      {/* ── Fullscreen composer — the same liquid-glass bar, extended ── */}
      {composerOpen && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-black/85 backdrop-blur-sm p-4 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setComposerOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-label={t('chat.fullscreen_title', lang)}
        >
          {/* Header row — title + close, clean like the compact bar */}
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 pb-3 sm:pb-4">
            <h4 className="text-sm font-semibold text-white">{t('chat.fullscreen_title', lang)}</h4>
            <button
              type="button"
              onClick={() => setComposerOpen(false)}
              aria-label={t('chat.fullscreen_close', lang)}
              className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-neutral-500 transition-all hover:bg-white/[0.06] hover:text-white"
            >
              <TiaIcon icon={Cancel01Icon} size={18} strokeWidth={1.8} />
            </button>
          </div>

          {/* The extended bar — same translucent surface, inner sheen and teal
              halo as the compact input, just larger. Gives the feel that the
              compact bar itself grew to fill the screen. */}
          <div className="relative mx-auto flex w-full max-w-2xl flex-1 min-h-0 flex-col rounded-3xl bg-[#081410] p-4 sm:p-5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
            {/* Teal halo echoing the compact bar's glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2"
              style={{
                top: '-140px',
                width: 'min(560px, 96%)',
                height: '180px',
                background: 'radial-gradient(50% 52% at 50% 100%, rgba(45,212,191,0.5) 0%, rgba(45,212,191,0.14) 55%, transparent 78%)',
                filter: 'blur(26px)',
              }}
            />
            <textarea
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={t(categoryOption?.placeholderKey ?? 'chat.placeholder_software_web', lang)}
              data-composer-textarea
              autoFocus
              disabled={chatBlocked}
              className="relative z-10 flex-1 w-full resize-none overflow-y-auto scrollbar-hide bg-transparent text-sm sm:text-base leading-relaxed text-white placeholder-neutral-600 outline-none disabled:cursor-not-allowed disabled:opacity-60"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (input.trim()) { onSend(); setComposerOpen(false); }
                }
              }}
            />
            <div className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
              <p className="text-xs text-neutral-500">{t('chat.fullscreen_hint', lang)}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="rounded-full border border-white/[0.08] px-4 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-white/[0.06] hover:text-white"
                >
                  {t('chat.fullscreen_close', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => { onSend(); setComposerOpen(false); }}
                  disabled={!input.trim() || chatBlocked}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${input.trim() && !chatBlocked ? 'bg-teal-600 text-white hover:bg-teal-500 shadow-lg shadow-teal-500/25' : 'bg-neutral-800/60 text-neutral-500'}`}
                >
                  {t('chat.send', lang)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
