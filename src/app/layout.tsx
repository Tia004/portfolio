import type { Metadata } from "next";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import ClickSpark from "./components/ClickSpark";
import PointerCursor from "./components/PointerCursor";
import LanguageProvider from "./components/LanguageProvider";
import CookieBanner from "./components/CookieBanner";
import DeviceClassInjector from "./components/DeviceClassInjector";
import SplashScreen from "./components/SplashScreen";
import FpsOverlayWrapper from "./components/FpsOverlayWrapper";
import ScrollbarReveal from "./components/ScrollbarReveal";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/translations";
import { LANGS } from "@/lib/translations";
import { Outfit, Share_Tech_Mono } from "next/font/google";

// Self-hosted fonts (next/font/google): the @font-face rules are emitted at
// build time with font-display: swap, so there is NO external render-blocking
// Google Fonts CSS and no third-party request. The first paint never waits on
// fonts, and the metrics-adjusted fallback keeps CLS at zero during the swap.
const outfit = Outfit({
  weight: ["400", "500", "600", "700", "900"],
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-share-tech-mono",
  display: "swap",
});

// Localized metadata — Google sees the right title/description per language
export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const xLang = headersList.get('x-lang') as Lang | null;
  const lang: Lang = (xLang && LANGS.some(l => l.code === xLang)) ? xLang : 'it';

  const titles: Record<Lang, string> = {
    it: "Tia Designs | Designer, Sviluppatore App & Software, Videomaker",
    en: "Tia Designs | Designer, App & Software Developer, Videomaker",
    es: "Tia Designs | Diseñador, Desarrollador de Apps & Software, Videomaker",
  };

  const descriptions: Record<Lang, string> = {
    it: "Portfolio di Tia Designs — Designer, sviluppatore di app e software, videomaker. Progetto e realizzo prodotti digitali completi.",
    en: "Tia Designs Portfolio — Designer, app & software developer, videomaker. I design and build complete digital products.",
    es: "Portfolio de Tia Designs — Diseñador, desarrollador de apps y software, videomaker. Diseño y realizo productos digitales completos.",
  };

  return {
    metadataBase: new URL("https://tiadesigns.it"),
    title: titles[lang],
    description: descriptions[lang],
    openGraph: {
      title: titles[lang],
      description: descriptions[lang],
      siteName: "Tia Designs",
      url: `https://tiadesigns.it${lang === 'it' ? '' : `/${lang}`}`,
      locale: lang === 'en' ? 'en_US' : lang === 'es' ? 'es_ES' : 'it_IT',
      type: "website",
      images: [
        {
          url: "/TiaDesignsLogo.png",
          width: 512,
          height: 512,
          alt: "Tia Designs",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titles[lang],
      description: descriptions[lang],
      images: ["/TiaDesignsLogo.png"],
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
        { url: "/favicon.svg", type: "image/svg+xml" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180" },
      ],
    },
    manifest: "/site.webmanifest",
    alternates: {
      canonical: `https://tiadesigns.it${lang === 'it' ? '' : `/${lang}`}`,
      types: {
        'application/rss+xml': 'https://tiadesigns.it/feed.xml',
        'application/feed+json': 'https://tiadesigns.it/feed.json',
      },
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Tia Designs",
    },
    themeColor: "#02040a",
    other: {
      "msapplication-TileColor": "#02040a",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read language from cookie via middleware header — no flash of default content
  const headersList = await headers();
  const xLang = headersList.get('x-lang') as Lang | null;
  const initialLang: Lang = (xLang && LANGS.some(l => l.code === xLang)) ? xLang : 'it';

  return (
    <html
      lang={initialLang}
      className={cn("h-full antialiased bg-[#010101]", "font-sans", outfit.variable, shareTechMono.variable)}
    >
      <head>
        {/* Canonical and hreflang deliberately do NOT live here.
            Both were hardcoded to the home page's URLs on every route: fine
            while the site was one page, actively harmful as soon as it is not,
            because a page whose canonical points elsewhere is read as a
            duplicate of it and never gets indexed. Each page declares its own
            through `metadata.alternates` (lib/seo.ts), which also feeds the
            sitemap, so the three can never disagree. */}
        {/* Fonts are self-hosted via next/font/google (see the Outfit /
            Share_Tech_Mono definitions above) — no external Google Fonts
            <link> here, so nothing render-blocking in the head. */}
      </head>
      <body className="min-h-full flex flex-col bg-[#02040a] text-slate-100 font-sans">
        {/* Skip link: visible ONLY when focused (keyboard users), so its
            resting 1×1 box is deliberate and excluded from touch-target
            measurements — when it matters it is a big 48px button. */}
        <a
          href="#main-content"
          data-skip-link
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[99999] focus:rounded-xl focus:bg-teal-600 focus:px-6 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none"
        >
          Salta al contenuto
        </a>
        <div id="main-content" />
        <LanguageProvider initialLang={initialLang}>
          <SplashScreen>
            <ClickSpark
              sparkColor="#2dd4bf"
              sparkSize={14}
              sparkRadius={40}
              sparkCount={8}
              duration={500}
              extraScale={0.9}
            >
              {children}
            </ClickSpark>
            <PointerCursor />
            <CookieBanner />
            <DeviceClassInjector />
            <FpsOverlayWrapper />
            <ScrollbarReveal />
            <Analytics />
            <SpeedInsights />
          </SplashScreen>
        </LanguageProvider>
      </body>
    </html>
  );
}
