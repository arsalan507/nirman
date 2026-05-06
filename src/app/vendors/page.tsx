'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Phone, Share2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { formatINR, getAllCategories } from '@/lib/constants';
import * as ui from '@/lib/ui';
import { shareToWhatsApp } from '@/lib/whatsapp';
import type { Entry, Vendor } from '@/types';

interface VendorSummary {
  vendor: Vendor;
  totalPaid: number;
  totalCredit: number;
  outstanding: number;
  entries: Entry[];
  lastDate: string;
  materials: string[];
}

export default function VendorsPage() {
  const { activeProjectId, customCategories, hiddenCategories } = useAppStore();
  const allCategories = getAllCategories(customCategories, hiddenCategories);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data } = await supabase.from('vendors').select('*').order('name');
      return (data ?? []) as Vendor[];
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['vendor-entries', activeProjectId],
    queryFn: async () => {
      let q = supabase.from('entries').select('*').not('vendor_id', 'is', null).order('entry_date', { ascending: false });
      if (activeProjectId) q = q.eq('project_id', activeProjectId);
      const { data } = await q;
      return (data ?? []) as Entry[];
    },
  });

  const vendorMap = new Map<string, VendorSummary>();
  for (const v of vendors) {
    vendorMap.set(v.id, { vendor: v, totalPaid: 0, totalCredit: 0, outstanding: 0, entries: [], lastDate: '', materials: [] });
  }
  for (const e of entries) {
    if (!e.vendor_id) continue;
    const vs = vendorMap.get(e.vendor_id);
    if (!vs) continue;
    vs.entries.push(e);
    const amt = Number(e.amount);
    if (e.is_credit) vs.totalCredit += amt; else vs.totalPaid += amt;
    if (!vs.lastDate || e.entry_date > vs.lastDate) vs.lastDate = e.entry_date;
    if (e.subcategory && !vs.materials.includes(e.subcategory)) vs.materials.push(e.subcategory);
  }

  const summaries = Array.from(vendorMap.values())
    .map((vs) => ({ ...vs, outstanding: vs.totalCredit - vs.totalPaid }))
    .filter((vs) => vs.entries.length > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  const totalOutstanding = summaries.reduce((s, v) => s + Math.max(0, v.outstanding), 0);

  function shareVendorLedger(vs: VendorSummary) {
    const lines = [
      `*Vendor Ledger — ${vs.vendor.name}*`, '',
      `Total Credit: ${formatINR(vs.totalCredit)}`,
      `Total Paid: ${formatINR(vs.totalPaid)}`,
      `*Outstanding: ${formatINR(Math.max(0, vs.outstanding))}*`, '',
      '*Transactions:*',
    ];
    for (const e of vs.entries.slice(0, 20)) {
      lines.push(`${format(new Date(e.entry_date), 'dd MMM')} · ${e.description} · ${formatINR(Number(e.amount))} [${e.is_credit ? 'DUE' : 'PAID'}]`);
    }
    if (vs.entries.length > 20) lines.push(`... +${vs.entries.length - 20} more`);
    lines.push('', '_Sent from Nirman_');
    shareToWhatsApp(lines.join('\n'));
  }

  return (
    <main className="min-h-screen">
      <header className={ui.headerGradient}>
        <h1 className={ui.headerTitle}>Vendors</h1>
        {totalOutstanding > 0 && (
          <p className="text-sm font-medium text-gray-700/80 mt-1">
            Outstanding: <span className="text-lg font-bold text-red-700">{formatINR(totalOutstanding)}</span>
          </p>
        )}
      </header>

      <div className="p-4 space-y-3">
        {summaries.length === 0 && (
          <div className={`${ui.cardAccent} text-center py-10`}>
            <p className="text-sm text-gray-500">No vendor transactions yet.<br />Add entries with a vendor name to see them here.</p>
          </div>
        )}

        {summaries.map((vs) => {
          const isOpen = expandedId === vs.vendor.id;
          const hasOutstanding = vs.outstanding > 0;
          return (
            <div key={vs.vendor.id} className={`rounded-xl shadow-sm border overflow-hidden ${hasOutstanding ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}`}>
              <button
                onClick={() => setExpandedId(isOpen ? null : vs.vendor.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-lg font-bold ${hasOutstanding ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {vs.vendor.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-semibold text-gray-900">{vs.vendor.name}</p>
                  <p className="text-xs text-gray-400">
                    {vs.entries.length} txns · {vs.lastDate ? format(new Date(vs.lastDate), 'dd MMM') : '—'}
                  </p>
                  {vs.materials.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {vs.materials.slice(0, 3).join(', ')}{vs.materials.length > 3 && ` +${vs.materials.length - 3}`}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {hasOutstanding ? (
                    <p className="text-base font-bold text-red-600">{formatINR(vs.outstanding)}</p>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">Settled</span>
                  )}
                  {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-200">
                  <div className="grid grid-cols-3 divide-x divide-gray-200 bg-white">
                    <div className="p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase text-gray-400">Credit</p>
                      <p className="text-sm font-bold text-gray-900">{formatINR(vs.totalCredit)}</p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase text-gray-400">Paid</p>
                      <p className="text-sm font-bold text-gray-900">{formatINR(vs.totalPaid)}</p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase text-gray-400">Due</p>
                      <p className="text-sm font-bold text-red-600">{formatINR(Math.max(0, vs.outstanding))}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-gray-200 bg-white p-3">
                    {vs.vendor.phone && (
                      <a href={`tel:${vs.vendor.phone}`} className={`${ui.btnSmall} bg-blue-50 text-blue-600 flex items-center gap-1`}>
                        <Phone className="h-3.5 w-3.5" /> Call
                      </a>
                    )}
                    <button onClick={() => shareVendorLedger(vs)} className={`${ui.btnSmall} bg-green-50 text-green-600 flex items-center gap-1`}>
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </button>
                  </div>

                  <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto bg-white">
                    {vs.entries.map((e) => {
                      const cat = allCategories[e.category] ?? { icon: '📌', label: e.category };
                      return (
                        <div key={e.id} className="flex items-center gap-2 px-4 py-2.5">
                          <span className="text-sm">{cat.icon}</span>
                          <div className="flex-1 overflow-hidden">
                            <p className="truncate text-xs font-medium text-gray-700">{e.description}</p>
                            <p className="text-[10px] text-gray-400">{format(new Date(e.entry_date), 'dd MMM yy')} · {e.payment_mode}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${e.is_credit ? 'text-red-500' : 'text-green-600'}`}>
                              {e.is_credit ? '+' : '-'}{formatINR(Number(e.amount))}
                            </p>
                            <p className="text-[10px] text-gray-400">{e.is_credit ? 'DUE' : 'PAID'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
