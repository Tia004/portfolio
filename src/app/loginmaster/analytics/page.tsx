'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import DeepAnalyticsView from '@/app/components/dashboard/DeepAnalyticsView';

const MoltenMetal = dynamic(() => import('@/app/components/MoltenMetal'), { ssr: false });

export default function AnalyticsPage() {
  return (
    <div className="relative min-h-screen bg-[#010101] text-white p-4 sm:p-8 selection:bg-teal-400 selection:text-black">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <MoltenMetal />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-6">
        {/* Top bar back to master dashboard */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <Link
            href="/loginmaster/dashboard"
            className="px-4 py-2 rounded-2xl bg-white/[0.04] hover:bg-teal-500/20 border border-white/[0.08] text-xs font-semibold text-neutral-300 hover:text-teal-300 transition-all flex items-center gap-2"
          >
            <span>← Torna al Master Dashboard</span>
          </Link>
          <span className="text-xs text-neutral-500 font-mono">Tia Designs Telemetry Hub</span>
        </div>

        {/* Embedded Deep Analytics Suite */}
        <DeepAnalyticsView />
      </div>
    </div>
  );
}
