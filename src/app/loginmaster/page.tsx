'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export default function LoginMasterPage() {
  const router = useRouter();
  const [initialized, setInitialized] = useState<boolean | null>(null);
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
      // 1. Fetch options from backend
      const optionsRes = await fetch('/api/auth/passkey/register/options', {
        method: 'POST',
      });
      const options = await optionsRes.json();

      if (options.error) {
        throw new Error(options.error);
      }

      // 2. Open browser biometric prompt (Passkey registration)
      const credential = await startRegistration({ optionsJSON: options });

      // 3. Verify credential response on backend
      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential),
      });
      const verifyData = await verifyRes.json();

      if (verifyData.error) {
        throw new Error(verifyData.error);
      }

      // 4. Success -> Redirect
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
      // 1. Fetch options from backend
      const optionsRes = await fetch('/api/auth/passkey/login/options', {
        method: 'POST',
      });
      const options = await optionsRes.json();

      if (options.error) {
        throw new Error(options.error);
      }

      // 2. Open browser biometric prompt (Passkey authentication)
      const assertion = await startAuthentication({ optionsJSON: options });

      // 3. Verify assertion on backend
      const verifyRes = await fetch('/api/auth/passkey/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertion),
      });
      const verifyData = await verifyRes.json();

      if (verifyData.error) {
        throw new Error(verifyData.error);
      }

      // 4. Success -> Redirect
      router.push('/loginmaster/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Accesso Passkey annullato o fallito.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm tracking-wider animate-pulse">Connessione sicura in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center px-4 py-12 relative overflow-hidden font-sans select-none">
      {/* Background decorative elements */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-violet-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10">
        {/* Main Glassmorphic Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#0d1527] border border-white/15 p-4 rounded-2xl shadow-lg">
            <svg
              className="w-8 h-8 text-blue-400 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <div className="text-center mt-6 mb-8">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              {initialized ? 'Master Access' : 'Inizializzazione Portal'}
            </h1>
            <p className="text-gray-400 text-xs mt-2 uppercase tracking-widest font-semibold">
              {initialized ? 'Autenticazione Biometrica Richiesta' : 'Configurazione Amministratore'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/20 text-red-200 text-sm flex gap-3 items-center">
              <svg className="w-5 h-5 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {initialized ? (
            /* Login flow layout */
            <div className="flex flex-col gap-6">
              <p className="text-gray-400 text-sm text-center">
                Accedi in modo sicuro al tuo portale di gestione utilizzando la tua Passkey registrata.
              </p>

              <button
                onClick={handleLogin}
                disabled={actionLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium py-3.5 px-6 rounded-xl transition duration-200 cursor-pointer shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {actionLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Accedi con Passkey</span>
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* First time Setup flow layout */
            <div className="flex flex-col gap-6">
              <p className="text-gray-400 text-sm text-center">
                Benvenuto! Configura la tua chiave di sicurezza primaria (Passkey) per blindare l&apos;amministrazione di questo portfolio.
              </p>

              <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-xs text-gray-300 flex flex-col gap-2">
                <div className="flex gap-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  <span>Assicurati che il tuo dispositivo supporti l&apos;autenticazione biometrica (Touch ID, Face ID, Windows Hello) o chiavi hardware (Yubikey).</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  <span>Clicca sul tasto sotto e segui le istruzioni del tuo sistema operativo per completare il setup.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-400 font-bold">3.</span>
                  <span>Dopo la registrazione, questa schermata verrà bloccata e potrai accedere solo tu.</span>
                </div>
              </div>

              <button
                onClick={handleRegister}
                disabled={actionLoading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium py-3.5 px-6 rounded-xl transition duration-200 cursor-pointer shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {actionLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Registra Passkey Master</span>
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer text */}
        <p className="text-center text-gray-600 text-xs mt-8 tracking-wider">
          Progetto Next.js • Protetto da crittografia end-to-end
        </p>
      </div>
    </div>
  );
}
