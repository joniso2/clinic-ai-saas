'use client';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import type { Lead } from '@/types/leads';

interface CPCtx {
  open: () => void;
  isOpen: boolean;
  close: () => void;
  leadsRef: React.MutableRefObject<Lead[]>;
  registerLeads: (leads: Lead[]) => void;
  onNewLeadRef: React.MutableRefObject<(() => void) | null>;
  registerOnNewLead: (fn: () => void) => void;
}

const CommandPaletteContext = createContext<CPCtx | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const leadsRef = useRef<Lead[]>([]);
  const onNewLeadRef = useRef<(() => void) | null>(null);

  return (
    <CommandPaletteContext.Provider
      value={{
        open: () => setIsOpen(true),
        isOpen,
        close: () => setIsOpen(false),
        leadsRef,
        registerLeads: (leads) => { leadsRef.current = leads; },
        onNewLeadRef,
        registerOnNewLead: (fn) => { onNewLeadRef.current = fn; },
      }}
    >
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error('useCommandPalette must be used inside CommandPaletteProvider');
  return ctx;
}
