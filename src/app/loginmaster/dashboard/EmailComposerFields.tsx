'use client';

import { useId } from 'react';
import { RotateCcw } from 'lucide-react';

export function ResetEmailField({ label, onReset }: { label: string; onReset: () => void }) {
  return (
    <button type="button" onClick={onReset} title={`Ripristina ${label}`} aria-label={`Ripristina ${label}`}
      className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:text-teal-300 hover:bg-teal-500/10 cursor-pointer">
      <RotateCcw size={13} />
    </button>
  );
}

export function EmailComposerField({ label, value, onChange, onReset, multiline = false, type = 'text' }: {
  label: string; value: string; onChange: (value: string) => void; onReset: () => void;
  multiline?: boolean; type?: 'text' | 'url' | 'email';
}) {
  const id = useId();
  const className = 'w-full min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400';
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="flex items-center justify-between text-xs text-neutral-300">
        <label htmlFor={id}>{label}</label><ResetEmailField label={label} onReset={onReset} />
      </span>
      {multiline
        ? <textarea id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={className} />
        : <input id={id} aria-label={label} type={type} value={value} onChange={(e) => onChange(e.target.value)} className={className} />}
    </div>
  );
}
