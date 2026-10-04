'use client';
import React, { useMemo } from 'react';
import { useCRM } from '@/lib/crm/store';
import { useAuth } from '@/lib/crm/auth';
import { CustomDropdown, DropdownOption } from './CustomDropdown';

interface Props { onMenu: () => void; onOpenSearch: () => void }

export const Header: React.FC<Props> = ({ onMenu, onOpenSearch }) => {
  const {
    brands,
    addBrand,
    salesReps,
    selectedBrand,
    selectedRep,
    syncStatus,
    retrySave,
    setSelectedBrand,
    setSelectedRep,
    setIsNewDealModalOpen,
    setIsSettingsModalOpen
  } = useCRM();
  const { user } = useAuth();

  const brandOptions: DropdownOption[] = useMemo(() => [
    { value: 'all', label: `Tutti i brand${brands.length ? ` (${brands.length})` : ''}`, icon: 'layers' },
    ...brands.map((b) => ({ value: b, label: b, icon: 'business' })),
    { value: '__add_brand__', label: '+ Aggiungi brand…', isAction: true },
  ], [brands]);

  const repOptions: DropdownOption[] = useMemo(() => [
    { value: 'all', label: 'Tutto il team', icon: 'groups' },
    ...salesReps.map((r) => ({ value: r.name, label: r.name, icon: 'person_outline' })),
  ], [salesReps]);

  return (
    <header className="app-header">
      <div className="header-leading">
        <button className="menu-trigger" onClick={onMenu} aria-label="Apri menu">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="header-section">Workspace <span>/</span> Vendite</span>
      </div>

      <button className="header-search" onClick={onOpenSearch} aria-label="Apri ricerca globale">
        <span className="material-symbols-outlined">search</span>
        <span>Cerca nel workspace</span>
        <kbd>⌘ K</kbd>
      </button>

      <div className="header-actions">
        <div className="w-[155px]">
          <CustomDropdown
            ariaLabel="Filtra per brand"
            value={selectedBrand}
            onChange={(val) => {
              if (val === '__add_brand__') {
                const name = window.prompt('Nome del nuovo brand da gestire:');
                if (name && name.trim()) {
                  addBrand(name.trim());
                  setSelectedBrand(name.trim());
                }
                return;
              }
              setSelectedBrand(val);
            }}
            options={brandOptions}
            size="sm"
          />
        </div>

        <div className="w-[145px] rep-select">
          <CustomDropdown
            ariaLabel="Filtra per commerciale"
            value={selectedRep}
            onChange={(val) => setSelectedRep(val)}
            options={repOptions}
            size="sm"
          />
        </div>

        {syncStatus === 'conflict' ? (
          <button className="sync-action" onClick={() => window.location.reload()}>
            Dati aggiornati altrove · Ricarica
          </button>
        ) : syncStatus === 'error' ? (
          <button className="sync-action" onClick={retrySave}>
            Salvataggio non riuscito · Riprova
          </button>
        ) : (
          <span
            className={`sync-indicator ${syncStatus}`}
            title={syncStatus === 'saved' ? 'Dati salvati' : 'Sincronizzazione in corso'}
            aria-label={`Stato dati: ${syncStatus}`}
          />
        )}

        <button
          className="header-icon settings-trigger cursor-pointer"
          onClick={() => setIsSettingsModalOpen(true)}
          aria-label="Impostazioni"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>

        <button
          className="header-new cursor-pointer"
          onClick={() => setIsNewDealModalOpen(true)}
        >
          <span className="material-symbols-outlined">add</span>
          <span>Nuova opportunità</span>
        </button>

        <button
          className="profile-trigger cursor-pointer"
          onClick={() => setIsSettingsModalOpen(true)}
          aria-label="Gestisci account"
          title={user?.name}
        >
          <span className="material-symbols-outlined">person_outline</span>
        </button>
      </div>
    </header>
  );
};
