'use client';

import { useState } from 'react';
import TiaIcon from './TiaIcon';
import { useLanguage } from './LanguageProvider';
import { UserIcon, Mail01Icon, CheckmarkCircle01Icon, AlertCircleIcon } from './icons';
import { isValidContactEmail, isValidContactName } from '@/lib/input-validation';
import { isInappropriateContactValue } from '@/lib/chat-moderation';

interface SliderConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

interface InlinePreventivoFormProps {
  missingFields: string[];
  sliders?: SliderConfig[];
  onSubmit: (data: { name: string; email: string; service: string; sliders?: Record<string, number> }) => void;
}

const SERVICE_OPTIONS = [
  { value: '', labelKey: 'contatti.select' },
  { value: 'Sito Web', labelKey: 'servizi.option_website' },
  { value: 'Software & App', labelKey: 'servizi.option_software_app' },
  { value: 'Brand & Logo', labelKey: 'servizi.option_brand_logo' },
  { value: 'Grafica & Social', labelKey: 'servizi.option_graphic_social' },
  { value: 'UI/UX Design', labelKey: 'servizi.option_uiux' },
  { value: 'Contenuti Video', labelKey: 'servizi.option_video_content' },
  { value: 'Post-Produzione', labelKey: 'servizi.option_post_prod' },
  { value: 'Informatica Hardware', labelKey: 'servizi.option_hardware' },
  { value: 'Social Media', labelKey: 'servizi.option_social' },
  { value: 'Altro', labelKey: 'servizi.option_other' },
];

export default function InlinePreventivoForm({ missingFields, sliders, onSubmit }: InlinePreventivoFormProps) {
  const { lang } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>(() => {
    if (!sliders?.length) return {};
    return Object.fromEntries(sliders.map(s => [s.key, s.default]));
  });

  const needsName = missingFields.some((field) => field === 'nome' || field === 'name');
  const needsEmail = missingFields.includes('email');
  const needsService = missingFields.some((field) => field === 'servizio' || field === 'service');
  const nameValid = !needsName || (isValidContactName(name) && !isInappropriateContactValue(name));
  const emailValid = !needsEmail || (isValidContactEmail(email) && !isInappropriateContactValue(email));
  const serviceValid = !needsService || Boolean(service);
  const canSubmit = nameValid && emailValid && serviceValid;

  const handleSubmit = () => {
    setAttempted(true);
    if (!canSubmit || submitted) return;
    setSubmitted(true);
    onSubmit({ name: name.trim(), email: email.trim(), service, sliders: sliders?.length ? sliderValues : undefined });
  };

  const fieldError = (field: 'name' | 'email' | 'service') => {
    if (!attempted) return '';
    if (field === 'name' && !nameValid) return tInline('bot.invalid_name', lang);
    if (field === 'email' && !emailValid) return tInline('bot.invalid_email', lang);
    if (field === 'service' && !serviceValid) return tInline('bot.invalid_service', lang);
    return '';
  };

  if (submitted) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-teal-500/20 bg-teal-500/[0.06] p-4">
        <TiaIcon icon={CheckmarkCircle01Icon} size={20} className="shrink-0 text-teal-400" strokeWidth={2} />
        <span className="text-sm font-medium text-teal-300">{tInline('bot.details_saved', lang)}</span>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-xs font-medium text-neutral-300">{tInline('bot.complete_details', lang)}</p>

      {/* ── Interactive sliders (budget, products, etc.) ── */}
      {sliders?.map((slider) => (
        <div key={slider.key} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-400">{slider.label}</label>
            <span className="text-xs font-medium text-teal-400 tabular-nums">{sliderValues[slider.key] ?? slider.default}</span>
          </div>
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={sliderValues[slider.key] ?? slider.default}
            onChange={(e) => setSliderValues(prev => ({ ...prev, [slider.key]: Number(e.target.value) }))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/[0.08] accent-teal-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-400 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(45,212,191,0.4)] [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-600">
            <span>{slider.min}</span>
            <span>{slider.max}</span>
          </div>
        </div>
      ))}

      {needsName && (
        <div>
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${fieldError('name') ? 'border-red-500/70 bg-red-500/[0.08]' : 'border-white/[0.06] bg-white/[0.04] focus-within:border-teal-500/40'}`}>
            {fieldError('name') && <span className="sr-only">{fieldError('name')}</span>}
            <TiaIcon icon={UserIcon} size={14} className={fieldError('name') ? 'shrink-0 text-red-400' : 'shrink-0 text-neutral-500'} strokeWidth={1.5} />
            <input
              type="text"
              placeholder={tInline('contatti.placeholder_name', lang)}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-600"
              autoFocus
              aria-invalid={Boolean(fieldError('name'))}
            />
            {name.trim().length > 0 && nameValid && <TiaIcon icon={CheckmarkCircle01Icon} size={15} className="shrink-0 text-teal-400" aria-hidden="true" />}
          </div>
          {fieldError('name') && <p className="mt-1 flex items-center gap-1 text-[11px] text-red-400"><TiaIcon icon={AlertCircleIcon} size={12} />{fieldError('name')}</p>}
        </div>
      )}

      {needsEmail && (
        <div>
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${fieldError('email') ? 'border-red-500/70 bg-red-500/[0.08]' : 'border-white/[0.06] bg-white/[0.04] focus-within:border-teal-500/40'}`}>
            <TiaIcon icon={Mail01Icon} size={14} className={fieldError('email') ? 'shrink-0 text-red-400' : 'shrink-0 text-neutral-500'} strokeWidth={1.5} />
            <input
              type="email"
              placeholder={tInline('contatti.placeholder_email', lang)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-600"
              aria-invalid={Boolean(fieldError('email'))}
            />
            {email.trim().length > 0 && emailValid && <TiaIcon icon={CheckmarkCircle01Icon} size={15} className="shrink-0 text-teal-400" aria-hidden="true" />}
          </div>
          {fieldError('email') && <p className="mt-1 flex items-center gap-1 text-[11px] text-red-400"><TiaIcon icon={AlertCircleIcon} size={12} />{fieldError('email')}</p>}
        </div>
      )}

      {needsService && (
        <div>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            aria-invalid={Boolean(fieldError('service'))}
            className={`w-full cursor-pointer appearance-none rounded-lg border px-3 py-2.5 text-sm text-white outline-none transition-colors ${fieldError('service') ? 'border-red-500/70 bg-red-500/[0.08]' : 'border-white/[0.06] bg-white/[0.04] focus:border-teal-500/40'}`}
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '2rem' }}
          >
            {SERVICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#1a1a1a] text-white">
                {tInline(opt.labelKey, lang)}
              </option>
            ))}
          </select>
          {fieldError('service') && <p className="mt-1 flex items-center gap-1 text-[11px] text-red-400"><TiaIcon icon={AlertCircleIcon} size={12} />{fieldError('service')}</p>}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitted}
        className={`w-full rounded-lg py-2.5 text-sm font-medium transition-all ${canSubmit ? 'cursor-pointer bg-teal-600 text-white hover:bg-teal-500' : 'cursor-pointer bg-white/[0.04] text-neutral-500 hover:bg-red-500/[0.08] hover:text-red-300'}`}
      >
        {tInline('bot.continue_quote', lang)}
      </button>
    </div>
  );
}

function tInline(key: string, lang: 'it' | 'en' | 'es'): string {
  // Kept as a tiny local wrapper so this component remains independent of the
  // large translation data helpers used by the page shell.
  const dictionary: Record<string, Record<'it' | 'en' | 'es', string>> = {
    'bot.invalid_name': { it: 'Inserisci un nome valido e appropriato, senza numeri o caratteri speciali.', en: 'Enter a valid and appropriate name without numbers or special characters.', es: 'Introduce un nombre válido y apropiado, sin números ni caracteres especiales.' },
    'bot.invalid_email': { it: 'Inserisci un indirizzo email valido e appropriato.', en: 'Enter a valid and appropriate email address.', es: 'Introduce una dirección de email válida y apropiada.' },
    'bot.invalid_service': { it: 'Seleziona un servizio per continuare.', en: 'Select a service to continue.', es: 'Selecciona un servicio para continuar.' },
    'bot.details_saved': { it: 'Perfetto, ora completo il preventivo personalizzato.', en: 'Perfect, I will now complete your personalised quote.', es: 'Perfecto, ahora completaré tu presupuesto personalizado.' },
    'bot.complete_details': { it: 'Mi servono ancora questi dati per preparare il preventivo:', en: 'I still need these details to prepare your quote:', es: 'Todavía necesito estos datos para preparar tu presupuesto:' },
    'bot.continue_quote': { it: 'Continua la chat', en: 'Continue the chat', es: 'Continuar el chat' },
    'contatti.placeholder_name': { it: 'Il tuo nome', en: 'Your name', es: 'Tu nombre' },
    'contatti.placeholder_email': { it: 'tua@email.com', en: 'your@email.com', es: 'tu@email.com' },
    'contatti.select': { it: 'Seleziona un servizio', en: 'Select a service', es: 'Selecciona un servicio' },
    'servizi.option_website': { it: 'Sito Web', en: 'Website', es: 'Sitio Web' },
    'servizi.option_software_app': { it: 'Software & App', en: 'Software & App', es: 'Software & Apps' },
    'servizi.option_brand_logo': { it: 'Brand & Logo', en: 'Brand & Logo', es: 'Marca & Logo' },
    'servizi.option_graphic_social': { it: 'Grafica & Social', en: 'Graphic & Social', es: 'Gráfico & Social' },
    'servizi.option_uiux': { it: 'UI/UX Design', en: 'UI/UX Design', es: 'Diseño UI/UX' },
    'servizi.option_video_content': { it: 'Contenuti Video', en: 'Video Content', es: 'Contenido Video' },
    'servizi.option_post_prod': { it: 'Post-Produzione', en: 'Post-Production', es: 'Post-Producción' },
    'servizi.option_hardware': { it: 'Informatica Hardware', en: 'Computer Hardware & IT', es: 'Informática y Hardware' },
    'servizi.option_social': { it: 'Social Media', en: 'Social Media', es: 'Redes Sociales' },
    'servizi.option_other': { it: 'Altro', en: 'Other', es: 'Otro' },
  };
  return dictionary[key]?.[lang] ?? key;
}
