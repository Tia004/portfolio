import Link from 'next/link';
import Navbar from './Navbar';
import CaseStudyFooter from './CaseStudyFooter';
import CaseStudyJsonLd from './CaseStudyJsonLd';
import { t, type Lang, type ProjectData } from '@/lib/translations';
import { caseStudyPath, pageSpeedUrl, relatedCaseStudies, siteHost } from '@/lib/case-studies';

/**
 * One case study, server-rendered in every language.
 *
 * A portfolio piece used to exist only inside the home page's modal: real work,
 * real galleries, zero URLs. This page gives each project its own address, its
 * own title and description, its own structured data, and — the part that makes
 * the whole set discoverable — links to its neighbours and back to the home
 * page, so the case studies are a crawlable cluster and not 21 islands.
 *
 * Deliberately a server component: the copy must be in the HTML that arrives,
 * not assembled by the client bundle. The only client islands are the navbar
 * and the footer (nav state, legal modal).
 */
export default function CaseStudyPage({ lang, project }: { lang: Lang; project: ProjectData }) {
  const related = relatedCaseStudies(lang, project.id);
  const homeHref = lang === 'it' ? '/' : `/${lang}`;
  const gallery = project.gallery ?? [];
  const hasLinks = Boolean(project.url || project.githubUrl || project.pdfUrl);
  const documents = project.documents ?? [];
  // Only for a live site Google can actually analyse: the point of this block
  // is that the visitor re-runs the measurement themselves.
  const measureUrl = pageSpeedUrl(project.url);
  const host = siteHost(project.url);

  return (
    <>
      <CaseStudyJsonLd lang={lang} project={project} />
      <Navbar onHome={false} />

      <main className="relative min-h-screen bg-[#010101] text-neutral-200 font-sans">
        {/* Static glow instead of the home page's WebGL background: a content
            page has to be cheap and readable, and the animated layer is the
            most expensive thing on the site. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-60"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 0%, rgba(45,212,191,0.14) 0%, rgba(45,212,191,0.04) 45%, transparent 100%)',
          }}
        />

        <div className="relative mx-auto w-full max-w-4xl px-4 pt-32 pb-20 sm:pt-40">
          {/* ── Breadcrumb — a real link back, and the same shape the JSON-LD
              declares, so the two cannot tell different stories. ── */}
          <nav aria-label="Breadcrumb" className="mb-8 text-xs text-neutral-500">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href={homeHref} className="inline-flex min-h-[28px] items-center transition-colors hover:text-teal-400">
                  Tia Designs
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`${homeHref}#progetti`} className="inline-flex min-h-[28px] items-center transition-colors hover:text-teal-400">
                  {t('progetto.breadcrumb', lang)}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-neutral-300">{project.title}</li>
            </ol>
          </nav>

          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-teal-400">
            {t('progetto.intro_label', lang)}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">{project.title}</h1>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-teal-400/25 bg-teal-400/10 px-3 py-1 text-xs font-medium text-teal-300">
              {project.category}
            </span>
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-400"
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="mt-8 max-w-2xl text-base leading-relaxed text-neutral-300 sm:text-lg">
            {project.description}
          </p>

          {hasLinks && (
            <div className="mt-8 flex flex-wrap gap-3">
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-teal-500/90 px-5 py-2.5 text-sm font-semibold text-[#04120f] transition-colors hover:bg-teal-400"
                >
                  {t('progetto.visit', lang)}
                  <span aria-hidden="true">↗</span>
                </a>
              )}
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:border-teal-400/40 hover:text-teal-300"
                >
                  {t('progetto.code', lang)}
                  <span aria-hidden="true">↗</span>
                </a>
              )}
              {project.pdfUrl && (
                <a
                  href={project.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:border-teal-400/40 hover:text-teal-300"
                >
                  PDF
                  <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          )}

          {/* ── Verifiable proof ───────────────────────────────────────────
              No invented outcome: the number is Google's, the report is public
              and the visitor can re-run it. Claiming "+X% sales" is not
              something a freelancer can usually stand behind; pointing at a
              measurement that anyone can repeat is. */}
          {measureUrl && host && (
            <section
              data-verify
              className="mt-10 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7"
            >
              <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-teal-400">
                {t('progetto.verify_label', lang)}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">
                {t('progetto.verify_text', lang)}
              </p>
              <a
                href={measureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-teal-400/30 px-5 py-2.5 text-sm font-medium text-teal-300 transition-colors hover:border-teal-400/60 hover:text-teal-200"
              >
                {t('progetto.verify_cta', lang)}
                <span className="font-mono text-xs text-neutral-500">{host}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </section>
          )}

          {gallery.length > 0 && (
            <section className="mt-14" aria-label={t('progetto.gallery', lang)}>
              <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                {t('progetto.gallery', lang)}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {gallery.map((src, index) => (
                  <img
                    key={src}
                    src={src}
                    // Alt text carries the project name: these images are the
                    // only content on some pages, and an empty alt would leave
                    // them unreadable for both image search and screen readers.
                    alt={`${project.title} — ${index + 1}`}
                    loading="lazy"
                    className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.02] object-cover"
                  />
                ))}
              </div>
            </section>
          )}

          {documents.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-4 text-sm">
              {documents.map((doc) => (
                <li key={doc}>
                  <a
                    href={doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 underline underline-offset-4"
                  >
                    {doc.split('/').pop()}
                  </a>
                </li>
              ))}
            </ul>
          )}

          {/* ── CTA — the page ends where the work is relevant: the contact
              section, pre-pointed at this project. ── */}
          <section className="mt-16 rounded-3xl border border-teal-400/20 bg-teal-400/[0.04] p-7 sm:p-9">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">{t('progetto.cta_title', lang)}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-300">
              {t('progetto.cta_text', lang)}
            </p>
            <Link
              href={`${homeHref}#contatti`}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-teal-500/90 px-6 py-3 text-sm font-semibold text-[#04120f] transition-colors hover:bg-teal-400"
            >
              {t('progetto.cta_button', lang)}
            </Link>
          </section>

          {related.length > 0 && (
            <section className="mt-16" aria-label={t('progetto.others', lang)}>
              <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                {t('progetto.others', lang)}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    href={caseStudyPath(item.id)}
                    className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:border-teal-400/30"
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      loading="lazy"
                      className="mb-3 aspect-video w-full rounded-xl object-cover"
                    />
                    <p className="text-sm font-medium text-white transition-colors group-hover:text-teal-300">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">{item.category}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <p className="mt-14">
            <Link href={homeHref} className="inline-flex min-h-[28px] items-center text-sm text-neutral-400 transition-colors hover:text-teal-400">
              ← {t('progetto.back', lang)}
            </Link>
          </p>
        </div>

        <CaseStudyFooter />
      </main>
    </>
  );
}
