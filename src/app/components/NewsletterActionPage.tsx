import BorderGlow from './BorderGlow';
import TiaIcon from './TiaIcon';
import { StaticDitherTexture } from './DitherStatic';
import { t, type Lang } from '@/lib/translations';
import { ArrowRight01Icon, Cancel01Icon, CheckmarkCircle01Icon, Home01Icon, Mail01Icon } from './icons';

// ── Newsletter double opt-in pages ────────────────────────────────────────
// Where the links inside the emails land. Deliberately SERVER-rendered with a
// plain HTML form: these pages are opened from a mail client, sometimes in an
// in-app browser with JavaScript half-broken, and the visitor has exactly one
// thing to do. No client state, no fetch, nothing that can fail between them
// and the button.
//
// The mutation is always a POST. Mail scanners and link previews fetch GET
// URLs, so a GET that confirmed a subscription (or worse, unsubscribed
// somebody) would fire without the human ever clicking.

interface NewsletterActionPageProps {
  mode: 'confirm' | 'unsubscribe';
  lang: Lang;
  /** Capability token from the email. Absent on the "type your email" opt-out. */
  token?: string;
  /** Result of the POST, echoed back by the API: confermato | disiscritto | … */
  esito?: string;
}

interface ResultState {
  tone: 'ok' | 'info' | 'bad';
  titleKey: string;
  textKey: string;
}

function resolveResult(mode: 'confirm' | 'unsubscribe', esito: string): ResultState | null {
  if (!esito) return null;
  if (mode === 'confirm') {
    if (esito === 'confermato') return { tone: 'ok', titleKey: 'newsletter.confirmed_title', textKey: 'newsletter.confirmed_text' };
    if (esito === 'gia-confermato') return { tone: 'info', titleKey: 'newsletter.already_title', textKey: 'newsletter.already_text' };
  } else if (esito === 'disiscritto') {
    return { tone: 'ok', titleKey: 'newsletter.unsubscribed_title', textKey: 'newsletter.unsubscribed_text' };
  }
  if (esito === 'errore') return { tone: 'bad', titleKey: 'newsletter.failed_title', textKey: 'newsletter.failed_text' };
  return { tone: 'bad', titleKey: 'newsletter.invalid_title', textKey: 'newsletter.invalid_text' };
}

/** Section shortcuts — the same keys the navbar and the 404 page use, so the
 *  labels cannot drift from the rest of the site. */
const SECTIONS: { href: string; key: string }[] = [
  { href: '#servizi', key: 'nav.servizi' },
  { href: '#progetti', key: 'nav.progetti' },
  { href: '#prezzi', key: 'nav.prezzi' },
  { href: '#contatti', key: 'nav.contattami' },
];

const inputClass =
  'w-full rounded-full border border-white/[0.12] bg-black/50 px-5 py-3 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-teal-400/50 focus:bg-black/70';

export default function NewsletterActionPage({ mode, lang, token = '', esito = '' }: NewsletterActionPageProps) {
  const base = lang === 'it' ? '' : `/${lang}`;
  const result = resolveResult(mode, esito);
  const action = mode === 'confirm' ? '/api/newsletter/confirm' : '/api/newsletter/unsubscribe';

  const tone = result?.tone ?? 'action';
  const icon = tone === 'ok' ? CheckmarkCircle01Icon : tone === 'info' ? Mail01Icon : tone === 'bad' ? Cancel01Icon : Mail01Icon;
  const iconClass = tone === 'ok' ? 'text-teal-300' : tone === 'info' ? 'text-teal-300' : tone === 'bad' ? 'text-amber-300' : 'text-teal-300';

  const title = result ? t(result.titleKey, lang) : t(mode === 'confirm' ? 'newsletter.confirm_title' : 'newsletter.unsub_title', lang);
  const text = result ? t(result.textKey, lang) : t(mode === 'confirm' ? 'newsletter.confirm_text' : 'newsletter.unsub_text', lang);

  return (
    <main
      className="relative isolate flex min-h-[100svh] w-full items-center justify-center overflow-hidden px-5 py-16 sm:px-8"
      style={{ backgroundColor: '#010101' }}
      data-newsletter-page={`${mode}${esito ? `-${esito}` : ''}`}
    >
      <div aria-hidden className="hero-bottom-curtain absolute inset-0 -z-10">
        <StaticDitherTexture />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[32rem] w-[32rem] max-w-[130vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.10), rgba(45,212,191,0) 70%)' }}
      />

      <BorderGlow continuousHover borderRadius={28} glowRadius={40} glowIntensity={2.2} edgeSensitivity={0} className="w-full max-w-2xl">
        <div className="px-6 py-10 text-center sm:px-12 sm:py-12">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.32em] text-teal-400/90 sm:text-[12px]">
            Newsletter
          </p>

          <div className={`mt-6 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] ${iconClass}`}>
            <TiaIcon icon={icon} size={24} strokeWidth={1.8} />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-neutral-400 sm:text-base">{text}</p>

          {/* ── Action: the one thing the visitor came here to do ── */}
          {!result && (
            <form method="post" action={action} className="mx-auto mt-8 flex w-full max-w-md flex-col items-stretch gap-3">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="lang" value={lang} />
              {/* No token → the visitor unsubscribes by typing the address.
                  That path can only ADD a suppression, never subscribe. */}
              {mode === 'unsubscribe' && !token && (
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder={t('newsletter.unsub_email_placeholder', lang)}
                  aria-label={t('newsletter.unsub_email_placeholder', lang)}
                  className={inputClass}
                />
              )}
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-teal-600/25 transition-all hover:bg-teal-500 active:scale-[0.99]"
              >
                {t(mode === 'confirm' ? 'newsletter.confirm_button' : 'newsletter.unsub_button', lang)}
              </button>
              <p className="text-[11px] leading-relaxed text-neutral-500">
                {t(mode === 'confirm' ? 'newsletter.confirm_secure' : 'newsletter.unsub_email_hint', lang)}
              </p>
              {mode === 'unsubscribe' && !token && (
                <a
                  href={`${base}/`}
                  className="inline-flex min-h-[24px] items-center text-[11px] text-neutral-500 underline underline-offset-2 transition-colors hover:text-neutral-300"
                >
                  {t('newsletter.back_home', lang)}
                </a>
              )}
            </form>
          )}

          {/* ── Result: what happened, and a way back into the site ── */}
          {result && (
            <>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href={`${base}/`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-teal-600/25 transition-all hover:bg-teal-500"
                >
                  <TiaIcon icon={Home01Icon} size={16} strokeWidth={2} />
                  {t('newsletter.back_home', lang)}
                </a>
              </div>
              <div className="mt-9 border-t border-white/[0.08] pt-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  {t('newsletter.sections', lang)}
                </p>
                <nav aria-label={t('newsletter.sections', lang)} className="mt-4 flex flex-wrap justify-center gap-2">
                  {SECTIONS.map(({ href, key }) => (
                    <a
                      key={href}
                      href={`${base}/${href}`}
                      className="group inline-flex min-h-[24px] items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.03] px-4 py-2 text-xs font-semibold text-neutral-300 transition-all hover:border-teal-400/45 hover:bg-teal-400/[0.09] hover:text-teal-200"
                    >
                      {t(key, lang)}
                      <TiaIcon icon={ArrowRight01Icon} size={12} strokeWidth={2} className="opacity-50 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </a>
                  ))}
                </nav>
              </div>
            </>
          )}
        </div>
      </BorderGlow>
    </main>
  );
}
