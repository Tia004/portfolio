'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import BorderGlow from '@/app/components/BorderGlow';
import TiaIcon from '@/app/components/TiaIcon';
import { AlertCircleIcon, ArrowRight01Icon, LoaderPinwheelIcon } from '@/app/components/icons';

const MoltenMetal = dynamic(() => import('@/app/components/MoltenMetal'), { ssr: false });

function LoginMasterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if a master user has already been registered
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        setInitialized(data.initialized);
        if (!data.initialized) {
          setMode('register');
        } else {
          setMode('login');
        }
      } catch (err) {
        console.error('Failed to check initialization status:', err);
        setError('Impossibile verificare lo stato del server. Riprova.');
      } finally {
        setLoading(false);
      }
    }
    checkStatus();
  }, []);

  const handleRegister = async () => {
    setError(null);
    setActionLoading(true);
    try {
      const optionsRes = await fetch('/api/auth/passkey/register/options', {
        method: 'POST',
      });
      const options = await optionsRes.json();

      if (options.error) {
        throw new Error(options.error);
      }

      const credential = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential),
      });
      const verifyData = await verifyRes.json();

      if (verifyData.error) {
        throw new Error(verifyData.error);
      }

      try {
        sessionStorage.setItem('master_authenticated', 'true');
        localStorage.setItem('master_authenticated', 'true');
      } catch {}

      router.push('/loginmaster/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Registrazione Passkey annullata o fallita.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    setActionLoading(true);
    try {
      const optionsRes = await fetch('/api/auth/passkey/login/options', {
        method: 'POST',
      });
      const options = await optionsRes.json();

      if (options.error) {
        throw new Error(options.error);
      }

      const assertion = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/passkey/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertion),
      });
      const verifyData = await verifyRes.json();

      if (verifyData.error) {
        throw new Error(verifyData.error);
      }

      try {
        sessionStorage.setItem('master_authenticated', 'true');
        localStorage.setItem('master_authenticated', 'true');
      } catch {}

      router.push('/loginmaster/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Accesso Passkey annullato o fallito.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecoveryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode.trim()) {
      setError('Inserisci un codice di recupero valido');
      return;
    }
    setError(null);
    setActionLoading(true);
    try {
      const res = await fetch('/api/auth/recovery/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: recoveryCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Codice non valido');
      }

      try {
        sessionStorage.setItem('master_authenticated', 'true');
        localStorage.setItem('master_authenticated', 'true');
      } catch {}

      router.push('/loginmaster/dashboard');
    } catch (err: any) {
      setError(err.message || 'Verifica codice fallita');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-teal-400/80 text-xs tracking-widest uppercase font-mono animate-pulse">Connessione sicura in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center px-4 py-12 relative overflow-hidden font-sans select-none">
      {/* Molten Metal Shader Background */}
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none">
        <MoltenMetal
          color1="#05bc8e"
          color2="#0effc1"
          color3="#ffffff"
          speed={0.25}
          scale={5.5}
          detail={2}
          glow={1.4}
          coreSize={0.1}
          swirl={1.35}
          fold={-0.15}
          blackPoint={0.03}
          brightness={0.3}
          colorMode="molten"
          grain={false}
          mouseInteraction={false}
          mouseStrength={0.15}
          opacity={1}
        />
      </div>

      {/* Subtle vignette layer */}
      <div aria-hidden="true" className="fixed inset-0 z-0 bg-black/40 pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Teal halo behind the liquid-glass card */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2"
          style={{
            top: '-120px',
            width: 'min(500px, 94%)',
            height: '220px',
            background: 'radial-gradient(50% 50% at 50% 50%, rgba(45,212,191,0.4) 0%, rgba(45,212,191,0.12) 55%, transparent 75%)',
            filter: 'blur(32px)',
          }}
        />

        {/* Liquid Glass Card wrapped with BorderGlow */}
        <BorderGlow continuousHover borderRadius={24} glowRadius={32} glowIntensity={2.2} edgeSensitivity={0} className="w-full">
          <div className="bg-[#081410]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] rounded-[24px] p-6 sm:p-8 relative">
            {/* Top Badge Icon */}
            <div className="flex justify-center -mt-12 sm:-mt-14 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#06120e] border border-teal-500/30 p-3 shadow-xl shadow-teal-950/50 flex items-center justify-center text-teal-400">
                <svg className="w-7 h-7 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>

            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {mode === 'login' ? 'Master Access' : mode === 'recovery' ? 'Codice di Emergenza' : 'Configurazione Iniziale Passkey'}
              </h1>
              <p className="text-teal-400 text-[11px] mt-1.5 uppercase tracking-[0.2em] font-semibold">
                {mode === 'login' ? 'Autenticazione Biometrica' : mode === 'recovery' ? 'Accesso di Ripristino' : 'Chiave Master Principale'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 text-xs flex gap-2.5 items-center">
                <TiaIcon icon={AlertCircleIcon} size={16} className="text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'login' && (
              /* Login flow layout */
              <div key="login-mode" className="flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-300">
                <p className="text-neutral-400 text-sm text-center leading-relaxed">
                  Accedi in modo sicuro al tuo portale tramite Touch ID, Face ID o Windows Hello.
                </p>

                <button
                  onClick={handleLogin}
                  disabled={actionLoading}
                  className="w-full py-3.5 font-semibold rounded-xl text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 cursor-pointer bg-teal-400 hover:bg-teal-300 text-black shadow-lg shadow-teal-400/25 ring-1 ring-teal-400/40 group"
                >
                  {actionLoading ? (
                    <><TiaIcon icon={LoaderPinwheelIcon} size={18} className="animate-spin" strokeWidth={2} /> Autenticazione in corso...</>
                  ) : (
                    <>
                      <span>Accedi con Passkey</span>
                      <TiaIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                <div className="pt-3 border-t border-white/[0.08] text-center flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => { setError(null); setMode('recovery'); }}
                    className="text-xs text-neutral-400 hover:text-teal-300 transition-colors underline underline-offset-4 cursor-pointer"
                  >
                    Passkey non disponibile? Usa un Codice di Emergenza
                  </button>
                </div>
              </div>
            )}

            {mode === 'recovery' && (
              /* Emergency Recovery Code Login */
              <form key="recovery-mode" onSubmit={handleRecoveryLogin} className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
                <p className="text-neutral-400 text-xs text-center leading-relaxed">
                  Inserisci uno dei tuoi codici di emergenza generati dalla dashboard per sbloccare l&apos;accesso.
                </p>

                <div>
                  <input
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                    placeholder="ES. A1B2-C3D4"
                    className="w-full px-4 py-3 bg-black/60 border border-white/15 focus:border-teal-400 rounded-xl text-center font-mono text-sm tracking-widest text-white placeholder:text-neutral-600 outline-none uppercase"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || !recoveryCode.trim()}
                  className="w-full py-3.5 font-semibold rounded-xl text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 cursor-pointer bg-teal-400 hover:bg-teal-300 text-black shadow-lg shadow-teal-400/25 group"
                >
                  {actionLoading ? (
                    <><TiaIcon icon={LoaderPinwheelIcon} size={18} className="animate-spin" strokeWidth={2} /> Verifica codice...</>
                  ) : (
                    <span>Verifica ed Entra</span>
                  )}
                </button>

                <div className="pt-3 border-t border-white/[0.08] text-center">
                  <button
                    type="button"
                    onClick={() => { setError(null); setMode('login'); }}
                    className="text-xs text-neutral-400 hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
                  >
                    Torna all&apos;accesso con Passkey
                  </button>
                </div>
              </form>
            )}

            {mode === 'register' && (
              /* Setup initial Passkey */
              <div key="register-mode" className="flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-300">
                <p className="text-neutral-400 text-sm text-center leading-relaxed">
                  Nessuna Passkey configurata nel database. Registra la tua prima chiave master per proteggere il portale.
                </p>

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-xs text-neutral-300 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <span className="text-teal-400 font-bold">1.</span>
                    <span>Usa Touch ID, Face ID o Windows Hello per registrare questo dispositivo.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-teal-400 font-bold">2.</span>
                    <span>Una volta registrata la prima chiave, la registrazione pubblica verrà disabilitata.</span>
                  </div>
                </div>

                <button
                  onClick={handleRegister}
                  disabled={actionLoading}
                  className="w-full py-3.5 font-semibold rounded-xl text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 cursor-pointer bg-teal-400 hover:bg-teal-300 text-black shadow-lg shadow-teal-400/25 ring-1 ring-teal-400/40 group"
                >
                  {actionLoading ? (
                    <><TiaIcon icon={LoaderPinwheelIcon} size={18} className="animate-spin" strokeWidth={2} /> Registrazione in corso...</>
                  ) : (
                    <>
                      <span>Registra Prima Passkey Master</span>
                      <TiaIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </BorderGlow>

        {/* Footer text */}
        <p className="text-center text-neutral-500 text-xs mt-8 tracking-wider font-mono">
          Protetto da crittografia end-to-end WebAuthn
        </p>
      </div>
    </div>
  );
}

export default function LoginMasterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-teal-400/80 text-xs tracking-widest uppercase font-mono animate-pulse">Caricamento...</p>
        </div>
      </div>
    }>
      <LoginMasterContent />
    </Suspense>
  );
}
