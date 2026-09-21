'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'error' | 'info';
}

export function showToast(text: string, type: 'success' | 'error' | 'info' = 'success') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { text, type } }));
  }
}

export default function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text: string; type?: 'success' | 'error' | 'info' }>).detail;
      if (!detail || !detail.text) return;

      const newToast: ToastMessage = {
        id: `${Date.now()}-${Math.random()}`,
        text: detail.text,
        type: detail.type || 'success',
      };

      setToasts((prev) => [...prev.slice(-2), newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3500);
    };

    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100000] flex flex-col gap-2 pointer-events-none items-center">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#081410]/90 backdrop-blur-2xl border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] text-xs font-medium text-white animate-in slide-in-from-bottom-2 fade-in duration-200"
        >
          {t.type === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          ) : t.type === 'info' ? (
            <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          )}
          <span className="leading-none">{t.text}</span>
        </div>
      ))}
    </div>
  );
}
