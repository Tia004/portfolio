'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import BorderGlow from './BorderGlow';
import { t, getEstimator, type Lang } from '@/lib/translations';
import {
  estimateQuote,
  estimateBrief,
  formatEuro,
  type EstimateSelection,
  type EstimateService,
  type EstimateSize,
  type EstimateTiming,
} from '@/lib/estimate';
import { trackClick, trackConversion } from '@/lib/analytics';
import { setVisitorContext } from '@/lib/booking-context';

// ── Instant estimate ──────────────────────────────────────────────────────
// Three chips (what / how big / when) and a price range. No email, no form:
// the visitor who sees a number either self-selects in — and arrives at the
// call already qualified — or self-selects out, which is worth just as much.
//
// The selection is written into the shared visitor context, so the SAME data
// travels into the Cal.com prefill and into the chatbot message instead of
// being asked again (see lib/booking-context).
interface QuoteEstimatorProps {
  lang: Lang;
  /** Opens the Cal.com booking modal (the caller owns the modal + prefill). */
  onBookCall: () => void;
  /** Opens the chat with the estimate already typed in the input. */
  onChatBrief: (text: string) => void;
}

const EMPTY: { service: EstimateService | null; size: EstimateSize | null; timing: EstimateTiming | null } = {
  service: null,
  size: null,
  timing: null,
};

export default function QuoteEstimator({ lang, onBookCall, onChatBrief }: QuoteEstimatorProps) {
  const copy = getEstimator(lang);
  const [picks, setPicks] = useState(EMPTY);
  // One analytics hit per completed selection, not one per re-render.
  const reportedRef = useRef(false);

  const { service, size, timing } = picks;
  // Memoised so the derived value is referentially stable: the estimate itself
  // and the analytics side effect key off it.
  const selection = useMemo<EstimateSelection | null>(
    () => (service && size && timing ? { service, size, timing } : null),
    [service, size, timing],
  );

  const result = useMemo(() => (selection ? estimateQuote(selection) : null), [selection]);

  const brief = useMemo(() => {
    if (!result || !selection) return '';
    return estimateBrief(
      result,
      {
        service: copy.services[selection.service],
        size: copy.sizes[selection.size],
        timing: copy.timings[selection.timing],
        weeks: (min, max) => copy.weeks(min, max),
      },
      lang,
    );
  }, [result, selection, copy, lang]);

  // As soon as a full selection exists it becomes the visitor context: the Cal
  // embed and the chat read it from there, so nobody has to repeat the three
  // choices out loud.
  useEffect(() => {
    if (!result || !selection) return;
    setVisitorContext({
      service: copy.services[selection.service],
      type: copy.sizes[selection.size],
      budget: `${formatEuro(result.min, lang)}–${formatEuro(result.max, lang)}`,
      delivery: copy.timings[selection.timing],
      notes: lang === 'en' ? `Estimate from the site calculator: ${brief}` : lang === 'es' ? `Estimación de la calculadora del sitio: ${brief}` : `Stima dal calcolatore del sito: ${brief}`,
      source: 'estimator',
    });
    if (!reportedRef.current) {
      reportedRef.current = true;
      trackConversion('stima_calcolata', {
        source: 'price_estimator',
        detail: {
          service: selection.service,
          size: selection.size,
          timing: selection.timing,
          range: `${result.min}-${result.max}`,
        },
      });
    }
  }, [result, selection, copy, brief, lang]);

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-2 text-xs sm:text-sm transition-all ${
      active
        ? 'border-teal-400/40 bg-teal-400/[0.14] text-white shadow-sm shadow-teal-500/10'
        : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/20 hover:text-white'
    }`;

  const row = (label: string, children: React.ReactNode) => (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );

  return (
    <BorderGlow
      continuousHover
      borderRadius={20}
      glowRadius={24}
      glowIntensity={2.0}
      edgeSensitivity={0}
      className="w-full"
    >
      <div className="p-5 sm:p-7" data-estimator="">
        <p className="text-center text-teal-400 text-xs font-medium uppercase tracking-[0.2em] mb-2">{copy.label}</p>
        <p className="text-center text-white font-semibold text-base sm:text-lg">{copy.title}</p>
        <p className="mx-auto mt-1.5 mb-5 max-w-xl text-center text-xs leading-relaxed text-neutral-500">{copy.subtitle}</p>

        <div className="grid gap-x-8 sm:grid-cols-3">
          {row(
            copy.stepService,
            (['site', 'ecommerce', 'software', 'video'] as EstimateService[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={service === key}
                className={chip(service === key)}
                onClick={() => {
                  setPicks((prev) => ({ ...prev, service: key }));
                  trackClick('stima_servizio', { service: key });
                }}
              >
                {copy.services[key]}
              </button>
            )),
          )}
          {row(
            copy.stepSize,
            (['essential', 'standard', 'complete'] as EstimateSize[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={size === key}
                className={chip(size === key)}
                onClick={() => setPicks((prev) => ({ ...prev, size: key }))}
              >
                {copy.sizes[key]}
              </button>
            )),
          )}
          {row(
            copy.stepTiming,
            (['flexible', 'month', 'asap'] as EstimateTiming[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={timing === key}
                className={chip(timing === key)}
                onClick={() => setPicks((prev) => ({ ...prev, timing: key }))}
              >
                {copy.timings[key]}
              </button>
            )),
          )}
        </div>

        {/* Result — the one place the visitor sees a number before talking. */}
        <div
          aria-live="polite"
          className={`mt-5 overflow-hidden rounded-2xl border transition-all duration-300 ${
            result ? 'border-teal-400/25 bg-teal-400/[0.06]' : 'border-white/10 bg-white/[0.02]'
          }`}
        >
          <div className="p-4 sm:p-5">
            {result ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">{copy.resultLabel}</p>
                    <p className="mt-1 text-2xl sm:text-3xl font-bold leading-none text-teal-300">
                      {formatEuro(result.min, lang)} – {formatEuro(result.max, lang)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">{copy.resultDelivery}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{copy.weeks(result.weeksMin, result.weeksMax)}</p>
                  </div>
                </div>
                {result.rush && <p className="mt-2 text-[11px] text-teal-300/80">{copy.rushNote}</p>}
                {/* Same rule as the price cards: from €1.000 up it can be paid
                    in instalments. Stated once here too, never per card. */}
                {result.min >= 1000 && (
                  <p className="mt-2 text-[11px] text-teal-300/80">{t('prezzi.installment_tip', lang)}</p>
                )}
                <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">{copy.note}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      trackClick('stima_click_call', { service, size, timing });
                      onBookCall();
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-teal-500"
                  >
                    {copy.ctaCall}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      trackClick('stima_click_chat', { service, size, timing });
                      onChatBrief(copy.chatBrief
                        .replace('{service}', copy.services[selection!.service])
                        .replace('{size}', copy.sizes[selection!.size])
                        .replace('{timing}', copy.timings[selection!.timing])
                        .replace('{range}', `${formatEuro(result.min, lang)}–${formatEuro(result.max, lang)}`)
                        .replace('{weeks}', copy.weeks(result.weeksMin, result.weeksMax)));
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white transition-all hover:border-teal-400/40 hover:bg-teal-400/[0.10]"
                  >
                    {copy.ctaChat}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPicks(EMPTY)}
                    className="text-xs text-neutral-500 underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    {copy.reset}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-center text-xs text-neutral-500">{copy.resultLabel}: —</p>
            )}
          </div>
        </div>
      </div>
    </BorderGlow>
  );
}
