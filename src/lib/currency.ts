'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';

export type CurrencyCode = 'EUR' | 'USD' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  rateFromEur: number;
  label: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  EUR: { code: 'EUR', symbol: '€', rateFromEur: 1.0, label: 'EUR (€)' },
  USD: { code: 'USD', symbol: '$', rateFromEur: 1.08, label: 'USD ($)' },
  GBP: { code: 'GBP', symbol: '£', rateFromEur: 0.85, label: 'GBP (£)' },
};

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatPrice: (eurAmount: number | string) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'EUR',
  setCurrency: () => {},
  formatPrice: (amt) => String(amt),
});

const STORAGE_KEY = 'tiadesigns_currency';

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('EUR');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
      if (saved && CURRENCIES[saved]) {
        setCurrencyState(saved);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    if (CURRENCIES[code]) {
      setCurrencyState(code);
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        // ignore
      }
    }
  };

  const formatPrice = useMemo(() => {
    return (eurAmount: number | string): string => {
      let num = typeof eurAmount === 'number' ? eurAmount : 0;
      if (typeof eurAmount === 'string') {
        const noDots = eurAmount.replace(/\./g, '');
        const cleaned = noDots.replace(/[^\d]/g, '');
        num = parseInt(cleaned, 10) || 0;
      }
      if (num === 0) return String(eurAmount);

      const cfg = CURRENCIES[currency];
      const converted = Math.round(num * cfg.rateFromEur);

      // Format nicely with thousand separators
      const formatted = new Intl.NumberFormat('it-IT').format(converted);
      return `${cfg.symbol}${formatted}`;
    };
  }, [currency]);

  return React.createElement(
    CurrencyContext.Provider,
    { value: { currency, setCurrency, formatPrice } },
    children
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
