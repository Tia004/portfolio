// ── Instant estimate model ────────────────────────────────────────────────
// The number a visitor needs BEFORE they are willing to talk. The ranges below
// are derived from the onetime tiers already published on the site (they are
// the authoritative breakdown — see getPricingOnetime), so the configurator
// can never disagree with the price list by more than its own declared margin.
//
// Pure data + pure functions: no React, no DOM. The UI (QuoteEstimator) owns
// the state, the handoff to Cal/Telegram and the analytics.

export type EstimateService = 'site' | 'ecommerce' | 'software' | 'video';
export type EstimateSize = 'essential' | 'standard' | 'complete';
export type EstimateTiming = 'flexible' | 'month' | 'asap';

export interface EstimateSelection {
  service: EstimateService;
  size: EstimateSize;
  timing: EstimateTiming;
}

export interface EstimateResult {
  /** Rounded, inclusive price range in euro. */
  min: number;
  max: number;
  /** Delivery window in weeks. */
  weeksMin: number;
  weeksMax: number;
  /** True when the rush surcharge was applied. */
  rush: boolean;
}

interface ServiceModel {
  /** Price range per scope size, in euro. */
  ranges: Record<EstimateSize, [number, number]>;
  /** Delivery window per scope size, in weeks. */
  weeks: Record<EstimateSize, [number, number]>;
}

// Anchored to the published tiers:
//   sito web 600 / 1.750 / 3.250 · software 1.900 / 4.000 / 7.500
//   e-commerce 1.750 / 2.800 / 4.500 · video 600 / 2.200 / 4.500
const SERVICES: Record<EstimateService, ServiceModel> = {
  site: {
    ranges: { essential: [600, 900], standard: [900, 1750], complete: [1750, 3250] },
    weeks: { essential: [2, 3], standard: [3, 5], complete: [5, 8] },
  },
  // A shop is a web platform with a catalogue: the entry range matches the
  // platform tier's starting price (€900 / €1.750), not a separate scale.
  ecommerce: {
    ranges: { essential: [900, 1750], standard: [1750, 2800], complete: [2800, 4500] },
    weeks: { essential: [3, 4], standard: [4, 6], complete: [6, 10] },
  },
  software: {
    ranges: { essential: [1900, 2900], standard: [2900, 4000], complete: [4000, 7500] },
    weeks: { essential: [4, 6], standard: [6, 10], complete: [10, 16] },
  },
  video: {
    ranges: { essential: [600, 1200], standard: [1200, 2200], complete: [2200, 4500] },
    weeks: { essential: [1, 2], standard: [2, 4], complete: [4, 6] },
  },
};

/** Delivery-priority surcharge and lead-time compression per timing choice. */
const TIMING: Record<EstimateTiming, { price: number; weeks: number }> = {
  // Slower than the declared lead time, same price: the visitor who is not in a
  // hurry is not charged for the calm — it is simply the slot we can plan.
  flexible: { price: 1, weeks: 1.25 },
  month: { price: 1, weeks: 1 },
  asap: { price: 1.25, weeks: 0.6 },
};

/**
 * Round to the nearest €50 — prices are never "€1.847". A single step for every
 * amount on purpose: with a step of 100 above €2.000 the tier price of €3.250
 * came out as €3.300, so the estimate contradicted the published list. At €50
 * every tier-derived figure lands exactly on its published price.
 */
function round(value: number): number {
  return Math.round(value / 50) * 50;
}

export function estimateQuote({ service, size, timing }: EstimateSelection): EstimateResult {
  const model = SERVICES[service] ?? SERVICES.site;
  const [baseMin, baseMax] = model.ranges[size] ?? model.ranges.standard;
  const [baseWeeksMin, baseWeeksMax] = model.weeks[size] ?? model.weeks.standard;
  const factor = (TIMING[timing] ?? TIMING.month).price;
  const weeksFactor = (TIMING[timing] ?? TIMING.month).weeks;

  const weeksMin = Math.max(1, Math.round(baseWeeksMin * weeksFactor));
  const weeksMax = Math.max(weeksMin + 1, Math.round(baseWeeksMax * weeksFactor));

  return {
    min: round(baseMin * factor),
    max: round(baseMax * factor),
    weeksMin,
    weeksMax,
    rush: factor > 1,
  };
}

/** Euro amount formatted for the visitor's locale, no decimals. */
export function formatEuro(amount: number, lang: string): string {
  const locale = lang === 'it' ? 'it-IT' : lang === 'es' ? 'es-ES' : 'en-GB';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * One-line brief for the chat / Cal prefill, e.g.
 *   "Sito vetrina · Standard · entro un mese → €900–€1.750 (3-5 settimane)"
 * Built from the localized labels the caller already has, so the line reads in
 * the visitor's language without this module knowing about translations.
 */
export function estimateBrief(
  result: EstimateResult,
  labels: { service: string; size: string; timing: string; weeks: (min: number, max: number) => string },
  lang: string,
): string {
  return [
    labels.service,
    labels.size,
    labels.timing,
    `${formatEuro(result.min, lang)}–${formatEuro(result.max, lang)}`,
    labels.weeks(result.weeksMin, result.weeksMax),
  ].join(' · ');
}
