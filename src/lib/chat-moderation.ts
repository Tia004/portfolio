// Deliberately conservative patterns: ordinary project terms remain allowed,
// while explicit sexual, fetish, exploitative, and prompt-injection requests are stopped.
const INAPPROPRIATE_PATTERNS: RegExp[] = [
  /\b(?:porn|porno|pornografia|pornography|xxx|sexcam|nsfw|nudes?|nudes?|desnudo|desnuda|naked)\b/i,
  /\b(?:pedo|pedof|minorenne|minor|child|niñ[oa]).{0,24}\b(?:sex|sesso|sexual|nude|nudo|naked|foto|video|imagen|imagen)\b/i,
  /\b(?:rape|stupro|violaci[oó]n|violence sexuelle|sexual violence)\b/i,
  /\b(?:sui piedi|dei piedi|de los pies|about feet|with feet)\b/i,
  /\b(?:foto|photo|video|immagini|images|pictures|mandami|send me|env[ií]ame)\b.{0,40}\b(?:feet|piedi|pies|pied)\b/i,
  /\b(?:fetish|feticcio|fetiche)\b/i,
  /\b(?:jailbreak|ignore all previous|disregard previous|bypass your instructions|ignora le istruzioni|ignora todas las instrucciones)\b/i,
];

const INAPPROPRIATE_CONTACT_PATTERNS: RegExp[] = [
  // Common Italian profanity and blasphemous compounds. Keep this separate
  // from chat moderation so ordinary project messages are not over-filtered.
  /\b(?:porco|porca)\s*(?:dio|d[iì]o|cristo|madonna)\b/i,
  /\b(?:dio|d[iì]o)\s*(?:cane|boia|ladro)\b/i,
  /\bmannaggia\s*(?:a\s*)?(?:dio|d[iì]o|cristo)\b/i,
  /\b(?:porcodio|porcadio|diocane|dioboia|vaffanculo|fanculo|cazzo|coglione|stronzo|stronza|merda|bastardo|bastarda|puttana|troia)\b/i,
];

export function isInappropriateChatMessage(value: string): boolean {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > 8_000) return normalized.length > 8_000;
  return INAPPROPRIATE_PATTERNS.some((pattern) => pattern.test(normalized))
    || INAPPROPRIATE_CONTACT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isInappropriateContactValue(value: string): boolean {
  const normalized = value.replace(/[._+\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return Boolean(normalized) && INAPPROPRIATE_CONTACT_PATTERNS.some((pattern) => pattern.test(normalized));
}
