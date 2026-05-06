'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Share2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { formatINR, getAllCategories } from '@/lib/constants';
import * as ui from '@/lib/ui';
import { formatSummary, shareToWhatsApp } from '@/lib/whatsapp';
import type { Entry, Project } from '@/types';

type Range = 'today' | 'week' | 'month' | 'all' | 'custom';

export default function ReportsPage() {
  const [range, setRange] = useState<Range>('today');
  const [customFrom, setCustomFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { activeProjectId, customCategories, hiddenCategories } = useAppStore();
  const allCategories = getAllCategories(customCategories, hiddenCategories);

  const { from, to, label } = (() => {
    const now = new Date();
    if (range === 'custom') return { from: customFrom, to: customTo, label: `${format(new Date(customFrom), 'dd MMM')} — ${format(new Date(customTo), 'dd MMM yyyy')}` };
    if (range === 'today') { const d = format(now, 'yyyy-MM-dd'); return { from: d, to: d, label: `Today — ${format(now, 'dd MMM yyyy')}` }; }
    if (range === 'week') return { from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), label: 'This Week' };
    if (range === 'month') return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd'), label: format(now, 'MMMM yyyy') };
    return { from: '1970-01-01', to: format(now, 'yyyy-MM-dd'), label: 'All Time' };
  })();

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId], enabled: !!activeProjectId,
    queryFn: async () => { const { data } = await supabase.from('projects').select('*').eq('id', activeProjectId).single(); return data as Project | null; },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['report-entries', activeProjectId, from, to],
    queryFn: async () => {
      let q = supabase.from('entries').select('*').gte('entry_date', from).lte('entry_date', to).order('entry_date');
      if (activeProjectId) q = q.eq('project_id', activeProjectId);
      const { data } = await q;
      return (data ?? []) as Entry[];
    },
  });

  const total = entries.reduce((s, e) => s + Number(e.amount), 0);

  function shareReport() { shareToWhatsApp(formatSummary(entries, project ?? undefined, label)); }

  function downloadCsv() {
    const header = ['Date', 'Description', 'Category', 'Amount', 'Payment Mode', 'Credit'];
    const rows = entries.map((e) => [e.entry_date, e.description, (allCategories[e.category] ?? { label: e.category }).label, e.amount, e.payment_mode, e.is_credit ? 'Yes' : 'No']);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `nirman-${range}-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen">
      <header className={ui.headerGradient}>
        <h1 className={ui.headerTitle}>Reports</h1>
        <p className={ui.headerSubtitle}>{label}</p>
      </header>

      <div className="p-4">
        {/* Range tabs */}
        <div className="mb-4 flex gap-1.5 overflow-x-auto">
          {(['today', 'week', 'month', 'all', 'custom'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                range === r ? 'bg-yellow-400 text-gray-900 shadow-sm' : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        {/* Custom dates */}
        {range === 'custom' && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={ui.label}>From</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className={ui.input} />
            </div>
            <div>
              <label className={ui.label}>To</label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={ui.input} />
            </div>
          </div>
        )}

        {/* Total */}
        <div className={`${ui.cardAccent} mb-4`}>
          <p className={ui.kpiLabel}>Total ({entries.length} entries)</p>
          <p className="text-3xl font-bold text-gray-900">{formatINR(total)}</p>
        </div>

        {/* Actions */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <button
            onClick={shareReport}
            disabled={entries.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-semibold text-white shadow-sm active:scale-[0.97] transition-all disabled:opacity-40"
          >
            <Share2 className="h-4 w-4" /> WhatsApp
          </button>
          <button
            onClick={downloadCsv}
            disabled={entries.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white shadow-sm active:scale-[0.97] transition-all disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>

        {/* Entries */}
        <div className="space-y-2">
          {entries.map((e) => {
            const cat = allCategories[e.category] ?? { label: e.category, icon: '📌', color: '#B0B0B0' };
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm border border-gray-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-lg" style={{ backgroundColor: cat.color + '30' }}>
                  {cat.icon}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-semibold text-gray-900">{e.description}</p>
                  <p className="text-xs text-gray-400">{format(new Date(e.entry_date), 'dd MMM')} · {cat.label}</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{formatINR(Number(e.amount))}</p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
