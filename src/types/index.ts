import type { CategoryKey, PaymentMode } from '@/lib/constants';

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  role: 'admin' | 'team';
  organization_id: string;
  created_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  budget: number;
  color: string;
  status: 'active' | 'completed' | 'on_hold';
  start_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  gst_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface VendorWithDues extends Vendor {
  outstanding_balance: number;
  entry_count: number;
  last_transaction_date: string | null;
}

export interface Entry {
  id: string;
  owner_id: string;
  project_id: string;
  entry_date: string;
  description: string;
  amount: number;
  category: CategoryKey;
  subcategory: string | null;
  worker_count: number | null;
  daily_rate: number | null;
  quantity: number | null;
  unit: string | null;
  has_gst: boolean;
  gst_rate: number | null;
  vendor_id: string | null;
  payment_mode: PaymentMode;
  is_credit: boolean;
  bill_number: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntryWithRelations extends Entry {
  project?: Project;
  vendor?: Vendor;
}
