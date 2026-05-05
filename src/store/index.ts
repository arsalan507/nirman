import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, Organization } from '@/types';

export interface CustomCategory {
  key: string;
  label: string;
  icon: string;
  color: string;
}

interface AppState {
  // Auth / profile
  profile: Profile | null;
  organization: Organization | null;
  setProfile: (p: Profile | null) => void;
  setOrganization: (o: Organization | null) => void;
  clearAuth: () => void;

  // Project filter
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;

  language: 'en' | 'hi' | 'kn';
  setLanguage: (lang: 'en' | 'hi' | 'kn') => void;

  // Last-used values for fast re-entry
  lastPaymentMode: string;
  lastVendorId: string | null;
  setLastPaymentMode: (mode: string) => void;
  setLastVendorId: (id: string | null) => void;

  // Custom categories
  customCategories: CustomCategory[];
  addCategory: (cat: CustomCategory) => void;
  removeCategory: (key: string) => void;

  // Hidden default categories
  hiddenCategories: string[];
  hideCategory: (key: string) => void;
  unhideCategory: (key: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      organization: null,
      setProfile: (p) => set({ profile: p }),
      setOrganization: (o) => set({ organization: o }),
      clearAuth: () => set({ profile: null, organization: null }),

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
