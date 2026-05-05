import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;

  language: 'en' | 'hi' | 'kn';
  setLanguage: (lang: 'en' | 'hi' | 'kn') => void;

  // last-used values for fast re-entry
  lastPaymentMode: string;
  lastVendorId: string | null;
  setLastPaymentMode: (mode: string) => void;
  setLastVendorId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      setActiveProject: (id) => set({ activeProjectId: id }),

      language: 'en',
      setLanguage: (lang) => set({ language: lang }),

      lastPaymentMode: 'cash',
      lastVendorId: null,
      setLastPaymentMode: (mode) => set({ lastPaymentMode: mode }),
      setLastVendorId: (id) => set({ lastVendorId: id }),
    }),
    { name: 'nirman-app' }
  )
);
