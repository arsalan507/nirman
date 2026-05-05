'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { formatINR, getAllCategories } from '@/lib/constants';
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
      let q = supabase
        .from('entries')
        .select('*')
        .not('vendor_id', 'is', null)
        .order('entry_date', { ascending: false });
      if (activeProjectId) q = q.eq('project_id', activeProjectId);
      const { data } = await q;
      return (data ?? []) as Entry[];
    },
  });

  // Build vendor summaries
  const vendorMap = new Map<string, VendorSummary>();
  for (const v of vendors) {
    vendorMap.set(v.id, {
      vendor: v,
      totalPaid: 0,
      totalCredit: 0,
      outstanding: 0,
      entries: [],
      lastDate: '',
      materials: [],
    });
  }

  for (const e of entries) {
    if (!e.vendor_id) continue;
    const vs = vendorMap.get(e.vendor_id);
    if (!vs) continue;
    vs.entries.push(e);
    const amt = Number(e.amount);
    if (e.is_credit) {
      vs.totalCredit += amt;
    } else {
      vs.totalPaid += amt;
    }
    if (!vs.lastDate || e.entry_date > vs.lastDate) vs.lastDate = e.entry_date;
    if (e.subcategory && !vs.materials.includes(e.subcategory)) {
      vs.materials.push(e.subcategory);
    }
  }

  const summaries = Array.from(vendorMap.values())
    .map((vs) => ({ ...vs, outstanding: vs.totalCredit - vs.totalPaid }))
    .filter((vs) => vs.entries.length > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  const totalOutstanding = summaries.reduce((s, v) => s + Math.max(0, v.outstanding), 0);

  function shareVendorLedger(vs: VendorSummary) {
    const lines = [
      `*Vendor Ledger — ${vs.vendor.name}*`,
      '',
      `Total Credit: ${formatINR(vs.totalCredit)}`,
      `Total Paid: ${formatINR(vs.totalPaid)}`,
      `*Outstanding: ${formatINR(Math.max(0, vs.outstanding))}*`,
      '',
      '*Transactions:*',
    ];
    for (const e of vs.entries.slice(0, 20)) {
      const tag = e.is_credit ? 'DUE' : 'PAID';
      lines.push(`${format(new Date(e.entry_date), 'dd MMM')} · ${e.description} · ${formatINR(Number(e.amount))} [${tag}]`);
    }
    if (vs.entries.length > 20) lines.push(`... +${vs.entries.length - 20} more`);
    lines.push('', '_Sent from Nirman_');
    shareToWhatsApp(lines.join('\n'));
  }

  return (
    <main className="min-h-screen bg-white pb-32">
      <header className="border-b-4 border-black bg-yellow-300 px-4 py-6">
        <h1 className="text-3xl font-black uppercase">Vendors</h1>
        {totalOutstanding > 0 && (
          <p className="text-sm font-bold">
            Total Outstanding: <span className="text-xl text-red-700">{formatINR(totalOutstanding)}</span>
          </p>
        )}
      </header>

      <div className="p-4 space-y-3">
        {summaries.length === 0 && (
          <p className="pt-8 text-center text-sm text-gray-500">
            No vendor transactions yet. Add entries with a vendor name to see them here.
          </p>
        )}

        {summaries.map((vs) => {
          const isOpen = expandedId === vs.vendor.id;
          const hasOutstanding = vs.outstanding > 0;
          return (
            <div
              key={vs.vendor.id}
              className={`border-4 border-black shadow-[4px_4px_0_0_#000] ${
                hasOutstanding ? 'bg-red-50' : 'bg-green-50'
              }`}
            >
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(isOpen ? null : vs.vendor.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-black bg-white text-xl font-black">
                  {vs.vendor.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-base font-black">{vs.vendor.name}</p>
                  <p className="text-xs text-gray-600">
                    {vs.entries.length} txns · Last: {vs.lastDate ? format(new Date(vs.lastDate), 'dd MMM') : '—'}
                  </p>
                  {vs.materials.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {vs.materials.slice(0, 3).join(', ')}
                      {vs.materials.length > 3 && ` +${vs.materials.length - 3}`}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {hasOutstanding ? (
                    <p className="text-lg font-black text-red-700">{formatINR(vs.outstanding)}</p>
                  ) : (
                    <p className="text-sm font-bold text-green-700">Settled</p>
                  )}
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {/* Expanded ledger */}
              {isOpen && (
                <div className="border-t-2 border-black">
                  {/* Quick stats */}
                  <div className="grid grid-cols-3 divide-x-2 divide-black border-b-2 border-black">
                    <div className="p-3 text-center">
                      <p className="text-[10px] font-black uppercase text-gray-500">Credit</p>
                      <p className="text-sm font-black">{formatINR(vs.totalCredit)}</p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-[10px] font-black uppercase text-gray-500">Paid</p>
                      <p className="text-sm font-black">{formatINR(vs.totalPaid)}</p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-[10px] font-black uppercase text-gray-500">Due</p>
                      <p className="text-sm font-black text-red-700">{formatINR(Math.max(0, vs.outstanding))}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 border-b-2 border-black p-3">
                    {vs.vendor.phone && (
                      <a
                        href={`tel:${vs.vendor.phone}`}
                        className="flex items-center gap-1 border-2 border-black bg-blue-200 px-3 py-2 text-xs font-black uppercase"
                      >
                        <Phone className="h-3 w-3" /> Call
                      </a>
                    )}
                    <button
                      onClick={() => shareVendorLedger(vs)}
                      className="flex items-center gap-1 border-2 border-black bg-green-300 px-3 py-2 text-xs font-black uppercase"
                    >
                      Share Ledger
                    </button>
                  </div>

                  {/* Transaction list */}
                  <div className="max-h-64 divide-y divide-gray-200 overflow-y-auto">
                    {vs.entries.map((e) => {
                      const cat = allCategories[e.category] ?? { icon: '📌', label: e.category };
                      return (
                        <div key={e.id} className="flex items-center gap-2 px-4 py-2">
                          <span className="text-sm">{cat.icon}</span>
                          <div className="flex-1 overflow-hidden">
                            <p className="truncate text-xs font-bold">{e.description}</p>
                            <p className="text-[10px] text-gray-500">
                              {format(new Date(e.entry_date), 'dd MMM yy')} · {e.payment_mode}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-black ${e.is_credit ? 'text-red-600' : 'text-green-700'}`}>
                              {e.is_credit ? '+' : '-'}{formatINR(Number(e.amount))}
                            </p>
                            <p className="text-[10px] text-gray-500">{e.is_credit ? 'DUE' : 'PAID'}</p>
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
