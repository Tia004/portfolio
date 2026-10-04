'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/crm/auth';
import { BrandLogo } from './BrandLogo';

type Mode = 'login' | 'register' | 'request-reset' | 'confirm-reset';
export const AuthScreen: React.FC = () => {
  const { loginWithPassword, registerUser, loginWithPasskey, isPasskeySupported } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [hpCode, setHpCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('notice') === 'verified') setNotice('Email verificata. Ora puoi accedere.');
    if (params.get('notice') === 'invalid') setError('Il link è scaduto o non è valido.');
    const invite = params.get('invite');
    if (invite) {
      setInviteToken(invite);
      setMode('register');
      fetch('/api/team/invite?token=' + encodeURIComponent(invite)).then((r) => r.json()).then((data) => {
        if (data.email) setEmail(data.email);
        else setError(data.error || 'Invito non valido.');
      }).catch(() => setError('Impossibile verificare l’invito.'));
    }
    const reset = params.get('reset');
    if (reset) { setResetToken(reset); setMode('confirm-reset'); }
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'login') {
        const result = await loginWithPassword(email, password);
        if (!result.success) setError(result.error || 'Accesso non riuscito.');
      } else if (mode === 'register') {
        const result = await registerUser(name, email, password, company, undefined, inviteToken, hpCode);
        if (!result.success) setError(result.error || 'Registrazione non riuscita.');
        else { setNotice(result.message || 'Controlla la tua email per verificare l’account.'); setMode('login'); setPassword(''); }
      } else {
        const response = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mode === 'request-reset' ? { action: 'request', email } : { action: 'confirm', token: resetToken, password }) });
        const data = await response.json();
        if (!response.ok) setError(data.error || 'Operazione non riuscita.');
        else { setNotice(mode === 'request-reset' ? data.message : 'Password aggiornata. Ora puoi accedere.'); if (mode === 'confirm-reset') { setMode('login'); setPassword(''); window.history.replaceState({}, '', '/'); } }
      }
    } catch { setError('Connessione non disponibile. Riprova.'); }
    finally { setBusy(false); }
  };

  const usePasskey = async () => {
    setBusy(true); setError(''); setNotice('');
    const result = await loginWithPasskey(email);
    if (!result.success) setError(result.error || 'Accesso con passkey non riuscito.');
    setBusy(false);
  };

  return <div className="auth-shell">
    <style dangerouslySetInnerHTML={{ __html: `
      .auth-form input {
        color-scheme: dark !important;
      }
      .auth-form input:-webkit-autofill,
      .auth-form input:-webkit-autofill:hover,
      .auth-form input:-webkit-autofill:focus,
      .auth-form input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 1000px #172033 inset !important;
        box-shadow: 0 0 0 1000px #172033 inset !important;
        -webkit-text-fill-color: #f8fafc !important;
        color: #f8fafc !important;
        caret-color: #f8fafc !important;
        border-color: #334155 !important;
        transition: background-color 5000000s ease-in-out 0s !important;
      }
    `}} />
    <header className="auth-header"><div className="auth-wordmark"><BrandLogo size={28} /><span>Hub Commerciale</span></div><span className="auth-header-note">Workspace vendite</span></header>
    <main className="auth-main"><div className="auth-panel">
      <div className="auth-kicker">ACCESSO SICURO</div>
      <h1>{mode === 'register' ? 'Crea il tuo workspace' : mode === 'request-reset' ? 'Recupera l’accesso' : mode === 'confirm-reset' ? 'Nuova password' : 'Bentornato'}</h1>
      <p className="auth-subtitle">{mode === 'register' ? inviteToken ? 'Completa l’invito per entrare nel team.' : 'Organizza opportunità, attività e team in un unico spazio.' : mode === 'request-reset' ? 'Ti invieremo un link per impostare una nuova password.' : mode === 'confirm-reset' ? 'Scegli una password di almeno 12 caratteri.' : 'Accedi al tuo spazio commerciale.'}</p>
      {(mode === 'login' || mode === 'register') && <div className="auth-switch"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Accedi</button><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Registrati</button></div>}
      {notice && <div className="auth-message success" role="status"><span className="material-symbols-outlined">check_circle</span><span>{notice}</span></div>}
      {error && <div className="auth-message error" role="alert"><span className="material-symbols-outlined">error</span><span>{error}</span></div>}
      <form onSubmit={submit} className="auth-form">
        <input
          type="text"
          name="hp_code"
          value={hpCode}
          onChange={(e) => setHpCode(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0, margin: 0, padding: 0 }}
          aria-hidden="true"
        />
        {mode === 'register' && <><label>Nome e cognome<input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mario Rossi" /></label>{!inviteToken && <label>Azienda<input autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nome azienda" /></label>}</>}
        {mode !== 'confirm-reset' && <label>Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={!!inviteToken && mode === 'register'} placeholder="nome@azienda.it" /></label>}
        {mode !== 'request-reset' && <label>Password<input required type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? undefined : 12} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'login' ? 'La tua password' : 'Almeno 12 caratteri'} /></label>}
        <button className="auth-submit" disabled={busy} type="submit">{busy ? 'Attendi…' : mode === 'register' ? 'Crea account' : mode === 'request-reset' ? 'Invia link di recupero' : mode === 'confirm-reset' ? 'Salva nuova password' : 'Accedi'} <span aria-hidden="true">→</span></button>
      </form>
      {mode === 'login' && isPasskeySupported && <button className="auth-passkey" disabled={busy || !email} onClick={usePasskey}><span className="material-symbols-outlined">fingerprint</span> Accedi con passkey</button>}
      {mode === 'login' ? <button className="auth-text-button" onClick={() => { setMode('request-reset'); setError(''); setNotice(''); }}>Password dimenticata?</button> : mode === 'request-reset' || mode === 'confirm-reset' ? <button className="auth-text-button" onClick={() => { setMode('login'); setError(''); setNotice(''); }}>Torna all’accesso</button> : null}
      {mode === 'login' && <button className="auth-text-button auth-resend" disabled={!email || busy} onClick={async () => { setError(''); setNotice(''); const response = await fetch('/api/auth/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); const data = await response.json(); if (response.ok) setNotice(data.message); else setError(data.error || 'Invio non riuscito.'); }}>Invia di nuovo la verifica email</button>}
      <div className="auth-footnote"><span className="material-symbols-outlined">lock</span> I dati del workspace sono protetti da accesso autenticato.</div>
    </div></main>
    <footer className="auth-footer">Hub Commerciale <span>·</span> Workspace vendite multi-brand</footer>
  </div>;
};
