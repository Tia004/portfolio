'use client';
/**
 * CRM Auth Shim for Portfolio Integration
 *
 * The commercial CRM's auth system (with its own users/sessions DB) is replaced
 * here by a lightweight shim that defers to the portfolio's master-session auth.
 * Since the dashboard is already behind the master passkey login, we treat the
 * master user as always authenticated inside the CRM tab.
 *
 * A fixed "master" user ID is used so that CRM data is persisted per-user in
 * the serverDb. This is fine for a single-owner setup.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface UserPasskey { id: string; name: string; createdAt: string; rawId: string; type: string; }
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  company?: string;
  role: string;
  workspaceId: string;
  emailVerified: boolean;
  hasPasskey: boolean;
  passkeys: UserPasskey[];
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (name: string, email: string, pass: string, company?: string, role?: string, inviteToken?: string, hpCode?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => void;
  isPasskeySupported: boolean;
  registerPasskey: (name?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPasskey: (email?: string) => Promise<{ success: boolean; error?: string }>;
  removePasskey: (id: string) => void;
}

const MASTER_USER: AuthUser = {
  id: 'master',
  name: 'Tia Designs',
  email: 'info@tiadesigns.it',
  company: 'Tia Designs',
  role: 'owner',
  workspaceId: 'master',
  emailVerified: true,
  hasPasskey: true,
  passkeys: [],
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate a short auth check to allow CRM store to init gracefully
    const t = setTimeout(() => setIsLoading(false), 50);
    return () => clearTimeout(t);
  }, []);

  const noop = async () => ({ success: false, error: 'Not supported in portfolio mode' });

  return (
    <AuthContext.Provider value={{
      user: MASTER_USER,
      isAuthenticated: true,
      isLoading,
      loginWithPassword: noop,
      registerUser: noop,
      logout: () => {},
      isPasskeySupported: false,
      registerPasskey: noop,
      loginWithPasskey: noop,
      removePasskey: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('CRM AuthProvider mancante');
  return context;
}
