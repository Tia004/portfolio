'use client';

import React, { useEffect, useState } from 'react';
import { useCRM } from '@/lib/crm/store';
import { useAuth } from '@/lib/crm/auth';
import {
  stopAllAudio,
} from '@/lib/crm/speechVoice';
import { VoiceAuraOrb } from '@/app/components/crm/VoiceAuraOrb';
import { CustomDropdown } from '@/app/components/crm/CustomDropdown';

type Tab = 'account' | 'appearance' | 'team' | 'voice' | 'data' | 'integrations' | 'catalog';
type Member = { id: string; email: string; name: string; role: string; verified: boolean };
type Invite = { email: string; role: string; expiresAt: string };
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'account', label: 'Account e sicurezza', icon: 'shield' },
  { id: 'appearance', label: 'Aspetto', icon: 'palette' },
  { id: 'team', label: 'Team', icon: 'group' },
  { id: 'voice', label: 'Voce AI', icon: 'graphic_eq' },
  { id: 'data', label: 'Dati', icon: 'database' },
  { id: 'integrations', label: 'Integrazioni', icon: 'extension' },
  { id: 'catalog', label: 'Brand e commerciali', icon: 'layers' },
];

export const SettingsMcpModal: React.FC = () => {
  const { isSettingsModalOpen, setIsSettingsModalOpen, theme, setTheme, brands, addBrand, deleteBrand, salesReps, addSalesRep, opportunities, importLegacyData, loadDemoData, resetAllData } = useCRM();
  const { user, isPasskeySupported, registerPasskey, removePasskey, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('account');
  const [feedback, setFeedback] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [keyName, setKeyName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [repName, setRepName] = useState('');
  const [mcpStatus, setMcpStatus] = useState('not_configured');
  const canManage = user?.role === 'owner' || user?.role === 'admin';

  const refreshTeam = async () => {
    const response = await fetch('/api/team', { cache: 'no-store' });
    if (response.ok) { const data = await response.json(); setMembers(data.members); setInvites(data.invites); }
  };
  useEffect(() => {
    if (!isSettingsModalOpen) return;
    void refreshTeam();
    fetch('/api/mcp').then((r) => r.json()).then((data) => setMcpStatus(data.status || 'not_configured')).catch(() => {});
    return () => { stopAllAudio(); };
  }, [isSettingsModalOpen]);
  if (!isSettingsModalOpen) return null;

  const request = async (method: string, body: object) => {
    const response = await fetch('/api/team', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    setFeedback(response.ok ? 'Modifica salvata.' : data.error || 'Operazione non riuscita.');
    if (response.ok) await refreshTeam();
    return response.ok;
  };
  const close = () => { setIsSettingsModalOpen(false); setFeedback(''); };
  return <div className="settings-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section className="settings-dialog" role="dialog" aria-modal="true" aria-label="Impostazioni workspace">
      <div className="settings-top"><div><span className="settings-eyebrow">WORKSPACE</span><h2>Impostazioni</h2></div><button onClick={close} aria-label="Chiudi impostazioni"><span className="material-symbols-outlined">close</span></button></div>
      <div className="settings-layout"><nav className="settings-nav" aria-label="Sezioni impostazioni">{tabs.filter((item) => canManage || !['team', 'data', 'integrations', 'catalog'].includes(item.id)).map((item) => <button key={item.id} onClick={() => { setTab(item.id); setFeedback(''); }} className={tab === item.id ? 'active' : ''}><span className="material-symbols-outlined">{item.icon}</span>{item.label}</button>)}</nav>
      <div className="settings-content">
        {feedback && <div className="settings-feedback" role="status">{feedback}</div>}
        {tab === 'account' && <div className="settings-section"><div className="settings-intro"><span className="settings-eyebrow">IDENTITÀ</span><h3>Account e sicurezza</h3><p>Gestisci l’accesso personale al workspace.</p></div>
          <div className="settings-card"><div className="settings-row"><div><strong>{user?.name}</strong><small>{user?.email}</small></div><span className="settings-pill">{user?.role === 'owner' ? 'Proprietario' : user?.role === 'admin' ? 'Amministratore' : 'Commerciale'}</span></div><div className="settings-row"><div><strong>Email verificata</strong><small>Confermata tramite link di attivazione</small></div><span className="settings-ok">Attiva</span></div></div>
          <div className="settings-card"><div className="settings-row"><div><strong>Passkey</strong><small>Accesso con autenticazione biometrica o chiave di sicurezza</small></div><span className="settings-pill">{user?.passkeys?.length || 0} registrate</span></div>{user?.passkeys?.map((key) => <div className="settings-row" key={key.id}><div><strong>{key.name}</strong><small>{new Date(key.createdAt).toLocaleDateString('it-IT')}</small></div><button className="settings-text-action" onClick={() => { if (window.confirm('Rimuovere questa passkey?')) removePasskey(key.id); }}>Rimuovi</button></div>)}<div className="settings-inline"><input aria-label="Nome nuova passkey" value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="Nome dispositivo" /><button disabled={!isPasskeySupported} onClick={async () => { const result = await registerPasskey(keyName || 'Passkey'); setFeedback(result.success ? 'Passkey aggiunta.' : result.error || 'Operazione non riuscita.'); if (result.success) setKeyName(''); }}>Aggiungi passkey</button></div>{!isPasskeySupported && <small>Il browser o il dispositivo non supporta WebAuthn.</small>}</div>
          <div className="settings-card"><div className="settings-row"><div><strong>Sessione</strong><small>Esci da questo dispositivo.</small></div><button className="settings-text-action" onClick={() => { logout(); close(); }}>Disconnetti</button></div></div>
        </div>}
        {tab === 'appearance' && <div className="settings-section"><div className="settings-intro"><span className="settings-eyebrow">PREFERENZE</span><h3>Aspetto</h3><p>Il tema viene salvato su questo dispositivo.</p></div><div className="theme-grid">{[{ id: 'slate', label: 'Dark', detail: 'Predefinito', icon: 'dark_mode' }, { id: 'light', label: 'Light', detail: 'Chiaro e pulito', icon: 'light_mode' }, { id: 'oled', label: 'OLED', detail: 'Nero assoluto', icon: 'contrast' }].map((item) => <button key={item.id} className={`theme-choice ${theme === item.id ? 'active' : ''}`} onClick={() => setTheme(item.id as 'light' | 'slate' | 'oled')}><span className={`theme-preview ${item.id}`}><span /><span /><span /></span><strong><span className="material-symbols-outlined">{item.icon}</span>{item.label}</strong><small>{item.detail}</small></button>)}</div></div>}
        {tab === 'team' && canManage && <div className="settings-section"><div className="settings-intro"><span className="settings-eyebrow">COLLABORAZIONE</span><h3>Team e permessi</h3><p>Proprietario e amministratori gestiscono team, brand e archivio. I commerciali lavorano sulle trattative condivise, senza poter eliminare dati o modificare la configurazione.</p></div><div className="settings-card">{members.map((member) => <div className="settings-row" key={member.id}><div><strong>{member.name}</strong><small>{member.email} · {member.verified ? 'Verificato' : 'In verifica'}</small></div><div className="settings-row-actions">{user?.role === 'owner' && member.role !== 'owner' ? <div className="w-[145px]"><CustomDropdown size="sm" ariaLabel={`Ruolo di ${member.name}`} value={member.role} onChange={(val) => void request('PATCH', { userId: member.id, role: val })} options={[{ value: 'admin', label: 'Amministratore' }, { value: 'member', label: 'Commerciale' }]} /></div> : <span className="settings-pill">{member.role === 'owner' ? 'Proprietario' : member.role === 'admin' ? 'Amministratore' : 'Commerciale'}</span>}{member.id !== user?.id && member.role !== 'owner' && (user?.role === 'owner' || member.role === 'member') && <button className="settings-text-action" onClick={() => { if (window.confirm('Rimuovere questo membro dal workspace?')) void request('DELETE', { userId: member.id }); }}>Rimuovi</button>}</div></div>)}</div><div className="settings-card"><strong>Invita una persona</strong><p>L’invito viene inviato per email e scade dopo 7 giorni.</p><div className="settings-inline"><input type="email" aria-label="Email collega" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="collega@azienda.it" /><div className="w-[145px]"><CustomDropdown size="sm" ariaLabel="Ruolo invito" value={inviteRole} onChange={(val) => setInviteRole(val)} options={[{ value: 'member', label: 'Commerciale' }, ...(user?.role === 'owner' ? [{ value: 'admin', label: 'Amministratore' }] : [])]} /></div><button onClick={async () => { if (await request('POST', { email: inviteEmail, role: inviteRole })) setInviteEmail(''); }}>Invia invito</button></div>{invites.length > 0 && <div className="settings-pending"><strong>Inviti in attesa</strong>{invites.map((invite) => <small key={invite.email}>{invite.email} · {invite.role} · scade il {new Date(invite.expiresAt).toLocaleDateString('it-IT')}</small>)}</div>}</div></div>}
        {tab === 'voice' && (
          <div className="settings-section">
            <VoiceAuraOrb />
          </div>
        )}
        {tab === 'data' && canManage && <div className="settings-section"><div className="settings-intro"><span className="settings-eyebrow">ARCHIVIO</span><h3>Dati commerciali</h3><p>{opportunities.length} opportunità nello spazio condiviso. Le modifiche vengono salvate sul server.</p></div><div className="settings-card"><div className="settings-row"><div><strong>Importa dalla versione precedente</strong><small>Disponibile solo quando l’archivio è vuoto.</small></div><button className="settings-secondary" onClick={() => { const result = importLegacyData(); setFeedback(result.message); }}>Importa</button></div><div className="settings-row"><div><strong>Dati dimostrativi</strong><small>Carica dati di esempio per esplorare l’interfaccia.</small></div><button className="settings-secondary" onClick={() => { if (window.confirm('Caricare i dati dimostrativi nel workspace?')) loadDemoData(); }}>Carica</button></div><div className="settings-row"><div><strong>Svuota archivio</strong><small>Elimina opportunità e attività del workspace.</small></div><button className="settings-danger" onClick={() => { if (window.confirm('Confermi la rimozione dei dati commerciali del workspace?')) resetAllData(); }}>Svuota</button></div></div></div>}
        {tab === 'integrations' && canManage && <div className="settings-section"><div className="settings-intro"><span className="settings-eyebrow">AUTOMAZIONI</span><h3>Integrazioni</h3><p>Collega agenti e strumenti all’archivio condiviso con credenziali sul server.</p></div><div className="settings-card"><div className="settings-row"><div><strong>API per agenti</strong><small>Endpoint JSON protetto da token dedicato.</small></div><span className={mcpStatus === 'configured' ? 'settings-ok' : 'settings-pill'}>{mcpStatus === 'configured' ? 'Configurata' : 'Da configurare'}</span></div><div className="settings-row"><div><strong>Server MCP STDIO</strong><small>Usa lo stesso database del workspace.</small></div><span className="settings-pill">Disponibile</span></div><div className="settings-row"><div><strong>ID proprietario per MCP</strong><small className="settings-mono">{user?.workspaceId}</small></div></div></div><p className="settings-muted">Configura le variabili sul server Vercel. Non inserire token nel browser.</p></div>}
        {tab === 'catalog' && canManage && <div className="settings-section"><div className="settings-intro"><span className="settings-eyebrow">ORGANIZZAZIONE</span><h3>Brand e commerciali</h3><p>Gestisci i brand che la tua azienda segue e i membri del team commerciale.</p></div><div className="settings-card"><strong>Brand gestiti</strong><div className="settings-tags">{brands.map((brand) => <span key={brand} className="settings-tag-item"><span>{brand}</span><button type="button" className="settings-tag-remove" title={`Rimuovi ${brand}`} onClick={() => { if (window.confirm(`Rimuovere il brand "${brand}" dal workspace?`)) { deleteBrand(brand); setFeedback(`Brand "${brand}" rimosso.`); } }}>×</button></span>)}{brands.length === 0 && <small className="settings-muted">Nessun brand configurato. Aggiungi il tuo primo brand qui sotto.</small>}</div><form className="settings-inline" onSubmit={(e) => { e.preventDefault(); if (brandName.trim()) { addBrand(brandName.trim()); setBrandName(''); setFeedback('Brand aggiunto al workspace.'); } }}><input value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder="Nome nuovo brand (es: MioBrand)" aria-label="Nuovo brand" /><button type="submit">Aggiungi brand</button></form></div><div className="settings-card"><strong>Commerciali</strong><div className="settings-tags">{salesReps.map((rep) => <span key={rep.id}>{rep.name}</span>)}</div><div className="settings-inline"><input value={repName} onChange={(event) => setRepName(event.target.value)} placeholder="Nome commerciale" aria-label="Nome commerciale" /><button onClick={() => { if (repName.trim()) { addSalesRep(repName.trim(), 'Commerciale'); setRepName(''); } }}>Aggiungi</button></div></div></div>}
      </div></div>
    </section>
  </div>;
};
