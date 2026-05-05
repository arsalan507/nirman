import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomCategory {
  key: string;
  label: string;
  icon: string;
  color: string;
}

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

  // custom categories
  customCategories: CustomCategory[];
  addCategory: (cat: CustomCategory) => void;
  removeCategory: (key: string) => void;

  // hidden default categories
  hiddenCategories: string[];
  hideCategory: (key: string) => void;
  unhideCategory: (key: string) => void;
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

      customCategories: [],
      addCategory: (cat) =>
        set((s) => ({ customCategories: [...s.customCategories, cat] })),
      removeCategory: (key) =>
        set((s) => ({
          customCategories: s.customCategories.filter((c) => c.key !== key),
        })),

      hiddenCategories: [],
      hideCategory: (key) =>
        set((s) => ({ hiddenCategories: [...s.hiddenCategories, key] })),
      unhideCategory: (key) =>
        set((s) => ({
          hiddenCategories: s.hiddenCategories.filter((k) => k !== key),
        })),
    }),
    { name: 'nirman-app' }
  )
);
