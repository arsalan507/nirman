/**
 * Bengaluru construction master data — categories, labor types,
 * materials, payment modes. Used in dropdowns + smart categorization.
 */

export const CATEGORIES = {
  labor_daily: { label: 'Daily Wage Labor', icon: '👷', color: '#FFD93D' },
  labor_contract: { label: 'Contract Labor', icon: '📋', color: '#FF9F43' },
  material: { label: 'Materials', icon: '🧱', color: '#7FFF9F' },
  vendor_payment: { label: 'Vendor Payment', icon: '💰', color: '#74C0FC' },
  govt_approval: { label: 'Govt Approval / Fee', icon: '📑', color: '#9775FA' },
  equipment_rental: { label: 'Equipment Rental', icon: '🏗️', color: '#FF6B6B' },
  transport: { label: 'Transport', icon: '🚚', color: '#4ECDC4' },
  utility: { label: 'Utility (Water/Power)', icon: '💧', color: '#45B7D1' },
  professional_fee: { label: 'Professional Fee', icon: '👔', color: '#A8DADC' },
  misc: { label: 'Miscellaneous', icon: '📌', color: '#B0B0B0' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES | string;

export type CategoryInfo = { label: string; icon: string; color: string };

/**
 * Merge default categories with custom ones from the store.
 */
export function getAllCategories(
  custom: { key: string; label: string; icon: string; color: string }[],
  hidden: string[] = []
): Record<string, CategoryInfo> {
  const merged: Record<string, CategoryInfo> = { ...CATEGORIES };
  for (const c of custom) {
    merged[c.key] = { label: c.label, icon: c.icon, color: c.color };
  }
  for (const key of hidden) {
    delete merged[key];
  }
  return merged;
}

export const LABOR_TYPES = [
  { name: 'Mason', default_rate: 800 },
  { name: 'Helper / Mazdoor', default_rate: 550 },
  { name: 'Carpenter', default_rate: 900 },
  { name: 'Electrician', default_rate: 850 },
  { name: 'Plumber', default_rate: 850 },
  { name: 'Painter', default_rate: 700 },
  { name: 'Tile Layer', default_rate: 950 },
  { name: 'Bar Bender', default_rate: 800 },
  { name: 'Shuttering / Centering', default_rate: 750 },
  { name: 'Welder', default_rate: 800 },
  { name: 'Site Supervisor', default_rate: 1200 },
] as const;

export const MATERIALS = [
  { name: 'Cement (OPC 53)', unit: 'bag', default_rate: 420 },
  { name: 'Cement (PPC)', unit: 'bag', default_rate: 380 },
  { name: 'Steel / TMT (Fe500)', unit: 'kg', default_rate: 65 },
  { name: 'Sand (M-Sand)', unit: 'cft', default_rate: 75 },
  { name: 'Sand (River)', unit: 'cft', default_rate: 95 },
  { name: 'Aggregate / Jelly (20mm)', unit: 'cft', default_rate: 60 },
  { name: 'Aggregate / Jelly (40mm)', unit: 'cft', default_rate: 55 },
  { name: 'Bricks (Red)', unit: 'nos', default_rate: 8 },
  { name: 'Concrete Block (4")', unit: 'nos', default_rate: 22 },
  { name: 'Concrete Block (6")', unit: 'nos', default_rate: 28 },
  { name: 'Tiles (Vitrified)', unit: 'sqft', default_rate: 75 },
  { name: 'Tiles (Floor)', unit: 'sqft', default_rate: 45 },
  { name: 'Wood / Ply', unit: 'sqft', default_rate: 80 },
  { name: 'Paint (Interior)', unit: 'litre', default_rate: 180 },
  { name: 'Paint (Exterior)', unit: 'litre', default_rate: 220 },
  { name: 'Waterproofing', unit: 'kg', default_rate: 250 },
  { name: 'Electrical Fittings', unit: 'lot', default_rate: 0 },
  { name: 'Plumbing / Sanitary', unit: 'lot', default_rate: 0 },
  { name: 'Hardware / Fasteners', unit: 'lot', default_rate: 0 },
  { name: 'Glass', unit: 'sqft', default_rate: 0 },
] as const;

export const APPROVAL_TYPES = [
  'BBMP Plan Sanction',
  'BDA Approval',
  'BESCOM Connection',
  'BWSSB Connection',
  'Khata Transfer',
  'Layout Approval',
  'OC (Occupancy Certificate)',
  'Property Tax',
  'Other',
] as const;

export const PAYMENT_MODES = {
  cash: { label: 'Cash', icon: '💵' },
  upi: { label: 'UPI', icon: '📱' },
  bank_transfer: { label: 'Bank Transfer', icon: '🏦' },
  cheque: { label: 'Cheque', icon: '🧾' },
  credit: { label: 'Credit (Pay Later)', icon: '⏳' },
} as const;

export type PaymentMode = keyof typeof PAYMENT_MODES;

export const GST_RATES = [0, 5, 12, 18, 28] as const;

/**
 * Smart category detection from description text.
 * Returns best-guess category + subcategory for "auto-fill" UX.
 */
export function detectCategory(description: string): {
  category: CategoryKey;
  subcategory?: string;
} {
  const d = description.toLowerCase();

  // Material keywords
  for (const mat of MATERIALS) {
    const baseName = mat.name.toLowerCase().split(/[\s(]/)[0];
    if (baseName && d.includes(baseName)) {
      return { category: 'material', subcategory: mat.name };
    }
  }

  // Labor keywords
  for (const lab of LABOR_TYPES) {
    const baseName = lab.name.toLowerCase().split(/[\s/]/)[0];
    if (baseName && d.includes(baseName)) {
      return { category: 'labor_daily', subcategory: lab.name };
    }
  }
  if (/contract|piece work|piece rate|tikka/i.test(d)) {
    return { category: 'labor_contract' };
  }

  // Govt approval
  if (/bbmp|bda|bescom|bwssb|khata|sanction|approval/i.test(d)) {
    return { category: 'govt_approval' };
  }

  // Equipment rental
  if (/jcb|crane|hire|rent|scaffolding|centering plate/i.test(d)) {
    return { category: 'equipment_rental' };
  }

  // Transport
  if (/transport|tempo|truck|lorry|vehicle|fuel|diesel|petrol/i.test(d)) {
    return { category: 'transport' };
  }

  // Utility
  if (/water tanker|electric bill|power|water bill|borewell/i.test(d)) {
    return { category: 'utility' };
  }

  // Professional
  if (/architect|engineer|consultant|lawyer|accountant|fees|fee/i.test(d)) {
    return { category: 'professional_fee' };
  }

  // Vendor payment / settlement
  if (/payment to|paid|settled|due|advance/i.test(d)) {
    return { category: 'vendor_payment' };
  }

  return { category: 'misc' };
}

/**
 * Format ₹ amount Indian-style with commas (1,23,456)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
