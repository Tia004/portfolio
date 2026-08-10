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
      className={cn("h-full antialiased bg-[#010101]", "font-sans")}
    >
      <head>
        {/* Dynamic hreflang — tells Google this page exists in 3 languages */}
        <link rel="alternate" hrefLang="it" href="https://tiadesigns.it/" />
        <link rel="alternate" hrefLang="en" href="https://tiadesigns.it/en" />
        <link rel="alternate" hrefLang="es" href="https://tiadesigns.it/es" />
        <link rel="alternate" hrefLang="x-default" href="https://tiadesigns.it/" />
        {/* Canonical — current language version; matches sitemap hreflang assignments */}
        <link rel="canonical" href={`https://tiadesigns.it${initialLang === 'it' ? '' : `/${initialLang}`}`} />
        {/* Google Fonts — preconnected and fetched in parallel with the HTML
            (previously a CSS @import, discovered only after globals.css parsed).
            The splash covers the first seconds, so the fonts are swapped in
            before the page becomes visible → no CLS from text reflow. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Only the weights actually used: Outfit 400/500/600/700/900 (the
            site never uses thin/extralight/light/extrabold), plus Share Tech
            Mono for font-mono. Space Grotesk and IBM Plex Mono were in the
            old request but are never referenced — fewer @font-face files means
            document.fonts.ready resolves sooner, so the splash fades faster. */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;900&family=Share+Tech+Mono&display=swap" />
      </head>
      <body className="min-h-full flex flex-col bg-[#02040a] text-slate-100 font-sans">
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
