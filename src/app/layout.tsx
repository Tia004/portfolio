import type { Metadata } from "next";
import "./globals.css";
import PixelTrail from "./components/PixelTrail";
import ClickSpark from "./components/ClickSpark";

export const metadata: Metadata = {
  title: "Tia Designs | Designer, Sviluppatore App & Software, Videomaker",
  description: "Portfolio di Tia Designs — Designer, sviluppatore di app e software, videomaker. Progetto e realizzo prodotti digitali completi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-[#02040a] text-slate-100 font-sans">
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
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 99999,
          }}
        >
          <PixelTrail
            gridSize={84}
            trailSize={0.08}
            maxAge={350}
            interpolate={1.8}
            color="#8cffd9"
            gooeyFilter={{ id: "pixel-trail-goo", strength: 1.0 }}
          />
        </div>
      </body>
    </html>
  );
}
