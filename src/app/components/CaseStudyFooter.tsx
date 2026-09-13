'use client';

import { useState } from 'react';
import FooterAnimation from './FooterAnimation';
import LegalModal from './LegalModal';
import { useLanguage } from './LanguageProvider';
import { getLegalDoc, type LegalDoc } from '@/lib/legal-content';

/**
 * Footer + legal modal for the content pages (case studies, and later the
 * service pages). On the home page this pair lives inside HomeShell; a content
 * page has no HomeShell, and the footer's legal links would open nothing.
 * This is the smallest possible client island that keeps them working.
 */
export default function CaseStudyFooter() {
  const { lang } = useLanguage();
  const [doc, setDoc] = useState<LegalDoc | null>(null);

  return (
    <>
      {/* onHome={false}: the footer's section links must point back at the home
          page's anchors, not at anchors that do not exist here. */}
      <FooterAnimation
        lang={lang}
        onHome={false}
        onOpenLegal={(key) => setDoc(getLegalDoc(lang, key) ?? null)}
      />
      {doc && <LegalModal doc={doc} onClose={() => setDoc(null)} />}
    </>
  );
}
