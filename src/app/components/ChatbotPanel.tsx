'use client';

import React, { useEffect, useRef, useState } from 'react';
import TiaIcon from './TiaIcon';
import { useLanguage } from './LanguageProvider';
import { t } from '@/lib/translations';
import { ArrowExpandDiagonal01Icon, BubbleChatIcon, Cancel01Icon, FilePenIcon, UserIcon } from './icons';
import type { ChatCategory } from '@/lib/chat-categories';

export interface ChatbotMessage {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  prefill?: Record<string, string>;
  requiresApproval?: boolean;
  approvalState?: 'pending' | 'approved' | 'revising';
}

// Specialization options — 'general' stays the internal default (user typed
// freely without picking a bubble) but is intentionally NOT offered visually.
export const CHAT_CATEGORY_OPTIONS: { value: ChatCategory; labelKey: string; exampleKey: string; placeholderKey: string }[] = [
  { value: 'software-web', labelKey: 'chat.category_software_web', exampleKey: 'chat.example_software_web', placeholderKey: 'chat.placeholder_software_web' },
  { value: 'design', labelKey: 'chat.category_design', exampleKey: 'chat.example_design', placeholderKey: 'chat.placeholder_design' },
  { value: 'video', labelKey: 'chat.category_video', exampleKey: 'chat.example_video', placeholderKey: 'chat.placeholder_video' },
  { value: 'hardware', labelKey: 'chat.category_hardware', exampleKey: 'chat.example_hardware', placeholderKey: 'chat.placeholder_hardware' },
  { value: 'social', labelKey: 'chat.category_social', exampleKey: 'chat.example_social', placeholderKey: 'chat.placeholder_social' },
  { value: 'other', labelKey: 'chat.category_other', exampleKey: 'chat.example_other', placeholderKey: 'chat.placeholder_other' },
];

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
  renderBotText: (msg: ChatbotMessage) => React.ReactNode;
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
  const categoryOption = CHAT_CATEGORY_OPTIONS.find(option => option.value === category);

  // Fullscreen composer — a focused, padded overlay to write long messages
  // without the compact bar. Shares the same `input`/`onSend` state.
  const [composerOpen, setComposerOpen] = useState(false);
  useEffect(() => {
    if (!composerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setComposerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [composerOpen]);

  // ── Expand tip ──
  // Temporary tooltip pointing at the fullscreen toggle. On desktop it
  // reappears on hover; on mobile it stays while writing until dismissed.
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: none), (pointer: coarse)');
    setIsTouch(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Right-edge curtain on the specialization bubbles: on mobile the row
  // scrolls horizontally, so when it overflows we fade the last chip out to
  // hint that more categories can be swiped to. Hidden on sm+ where there is
  // usually enough room (and hover/scrollbars are the affordance).
  const [catOverflow, setCatOverflow] = useState(false);
  const catScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = catScrollRef.current;
    if (!el) return;
    const check = () => setCatOverflow(el.scrollWidth > el.clientWidth + 8);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
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
  }, [input]);

  const resetTitle = lang === 'it'
    ? 'Avvia una nuova chat — la conversazione corrente verrà eliminata'
    : lang === 'es'
      ? 'Iniciar nuevo chat — se eliminará la conversación actual'
      : 'Start a new chat — the current conversation will be deleted';

  const categoryTooltip = (label: string) => lang === 'it'
    ? `Passa alla specializzazione ${label} — avvierà una nuova chat`
    : lang === 'es'
      ? `Cambia a la especialización ${label} — iniciará un nuevo chat`
      : `Switch to the ${label} specialization — it will start a new chat`;

  /** Specialization selector — always visible, one category at a time. */
  const specializationBar = (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-400/80">{t('chat.category_label', lang)}</span>
        <span className="text-[10px] text-neutral-600">{t('chat.category_single', lang)}</span>
      </div>
      <div className="relative">
        <div ref={catScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="radiogroup" aria-label={t('chat.category_label', lang)}>
          {CHAT_CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={category === option.value}
              title={categoryTooltip(t(option.labelKey, lang))}
              disabled={chatBlocked}
              onClick={() => onSelectCategory(option.value)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all touch-manipulation disabled:cursor-not-allowed disabled:opacity-40 ${category === option.value
                ? 'border-teal-400/50 bg-teal-400/15 text-teal-300 shadow-[0_0_14px_rgba(45,212,191,0.12)]'
                : 'border-white/[0.08] bg-white/[0.03] text-neutral-500 hover:border-white/20 hover:text-neutral-200'
                }`}
            >
              {t(option.labelKey, lang)}
            </button>
          ))}
        </div>
        {/* Right curtain — fades the last chip out to hint at more categories */}
        {catOverflow && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:hidden bg-gradient-to-l from-[#010101] via-[#010101]/70 to-transparent" />
        )}
      </div>
      <p className="text-[11px] leading-relaxed text-neutral-500">{t(categoryOption?.exampleKey ?? 'chat.example_software_web', lang)}</p>
    </div>
  );

  return (
    <>
      <div className="w-full min-w-0 max-w-full flex flex-col flex-1 min-h-0">
        {/* Header row — "Nuova chat" sits ABOVE the messages (never overlaps
            them or the curtain), so even the first bubble stays fully visible. */}
        <div className="mb-2 flex items-center justify-end">
          <button
            type="button"
            onClick={onReset}
            title={resetTitle}
            aria-label={t('chat.new_chat', lang)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#0f0f0f]/85 backdrop-blur-md px-3 py-1.5 text-neutral-500 transition-all hover:border-white/20 hover:bg-[#0f0f0f] hover:text-neutral-300"
          >
            <TiaIcon icon={FilePenIcon} size={14} strokeWidth={1.8} />
            <span className="text-xs font-medium">{t('chat.new_chat', lang)}</span>
          </button>
        </div>

        {/* Messages — scrollable history under a black curtain, no window chrome.
            flex-1 fills the section's remaining height (the section is exactly
            one viewport tall), so the chat never spills past the screen. */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          {/* data-lenis-prevent: native scroll inside the chat; overscroll-contain
              swallows boundary wheel/touch so it never chains into the page
              (chaining fights Lenis → up/down micro-jitter). */}
          <div
            ref={messagesRef}
            data-lenis-prevent
            className="flex-1 min-h-0 relative overflow-y-auto overscroll-contain scrollbar-hide"
          >
            {messages.length === 0 && !typing ? (
              /* Top-anchored (not centered) so the welcome message sits right
                 under the "Nuova chat" header instead of leaving a big empty
                 gap in the middle of the section. */
              <div className="flex min-h-full flex-col items-center justify-start px-6 pt-2 sm:pt-6 pb-10 text-center">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{t('chat.empty_heading', lang)}</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-400">{t('bot.welcome_category', lang).replace(/\*\*/g, '')}</p>
              </div>
            ) : (
              // Bottom-anchored stack: messages grow upward from just above
              // the input bar (like Gemini/WhatsApp), pushing older ones up
              // instead of starting at the top of the box. pt-24 clears the
              // black curtain (h-20) so the very first message is never
              // covered when the user scrolls all the way back up.
              <div className="flex min-h-full flex-col justify-end gap-4 px-4 sm:px-5 md:px-6 pt-16 sm:pt-24 pb-4 sm:pb-5 md:pb-6">
                {messages.map((msg) => {
                  // Extract suggestion chips from bot messages
                  const suggMatch = msg.sender === 'bot' && msg.text ? msg.text.match(/\[SUGGESTIONS:([^\]]+)\]/i) : null;
                  const suggestions = suggMatch ? suggMatch[1].split('|').map(s => s.trim()).filter(Boolean) : [];
                  const isStale = msg.id !== latestId;
                  return (
                    <div key={msg.id} className={msg.sender === 'bot' ? 'animate-bot-msg-in motion-safe:animate-bot-msg-in' : ''}>
                      <div className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'bot' && (
                          <div className="w-9 h-9 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 mt-1">
                            <TiaIcon icon={BubbleChatIcon} size={16} className="text-teal-400" />
                          </div>
                        )}
                        <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed break-words min-w-0 ${msg.sender === 'user'
                          ? 'bg-teal-600 text-white rounded-2xl rounded-br-sm'
                          : 'bg-white/[0.04] text-neutral-200 rounded-2xl rounded-bl-sm'
                          }`}
                        >
                          {msg.sender === 'bot' && msg.text
                            ? (<React.Fragment>
                                {renderBotText(msg)}
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
                                className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-neutral-600 cursor-default"
                              >
                                {sugg}
                              </span>
                            ) : (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => onSuggestion(sugg)}
                                disabled={chatBlocked}
                                className="animate-pop-in shrink-0 rounded-full border border-teal-400/30 bg-teal-400/[0.08] px-3 py-1.5 text-xs text-teal-300 hover:bg-teal-400/20 hover:border-teal-400/50 hover:text-teal-200 transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-teal-400/[0.08] disabled:hover:border-teal-400/30 disabled:hover:text-teal-300"
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

          {/* Black curtain — covers messages as they are pushed up. Short and
              soft on mobile so it never swallows the first visible messages;
              taller on sm+ where there is more headroom. */}
          {messages.length > 0 && (
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-12 sm:h-20 z-10 bg-gradient-to-b from-[#010101] via-[#010101]/50 to-transparent" />
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
          <div className="relative z-10 flex items-center gap-2 rounded-full bg-white/[0.06] p-2 sm:p-2.5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-all duration-500 focus-within:bg-white/[0.09] focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
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

        {/* Specializations under the input bar while the chat is still empty */}
        {!chatStarted && (
          <div className="shrink-0 pt-4 sm:pt-5">
            {specializationBar}
          </div>
        )}
      </div>

      {/* Once a specialization is chosen the bar moves to the bottom of the
          section; the section's own pb gives it whitespace below the bubbles. */}
      {chatStarted && (
        <div className="shrink-0 mt-4 sm:mt-6">{specializationBar}</div>
      )}

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
          <div className="relative mx-auto flex w-full max-w-2xl flex-1 min-h-0 flex-col rounded-3xl bg-white/[0.06] p-4 sm:p-5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
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
