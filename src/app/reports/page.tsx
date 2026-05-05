'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Share2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { CATEGORIES, formatINR } from '@/lib/constants';
import { formatSummary, shareToWhatsApp } from '@/lib/whatsapp';
import type { Entry, Project } from '@/types';

type Range = 'today' | 'week' | 'month' | 'all';

export default function ReportsPage() {
  const [range, setRange] = useState<Range>('today');
  const { activeProjectId } = useAppStore();

  const { from, to, label } = (() => {
    const now = new Date();
    if (range === 'today') {
      const d = format(now, 'yyyy-MM-dd');
      return { from: d, to: d, label: `Today — ${format(now, 'dd MMM yyyy')}` };
    }
    if (range === 'week') {
      return {
        from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        label: 'This Week',
      };
    }
    if (range === 'month') {
      return {
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: format(endOfMonth(now), 'yyyy-MM-dd'),
        label: format(now, 'MMMM yyyy'),
      };
    }
    return { from: '1970-01-01', to: format(now, 'yyyy-MM-dd'), label: 'All Time' };
  })();

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    enabled: !!activeProjectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', activeProjectId)
        .single();
      return data as Project | null;
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['report-entries', activeProjectId, from, to],
    queryFn: async () => {
      let q = supabase
        .from('entries')
        .select('*')
        .gte('entry_date', from)
        .lte('entry_date', to)
        .order('entry_date');
      if (activeProjectId) q = q.eq('project_id', activeProjectId);
      const { data } = await q;
      return (data ?? []) as Entry[];
    },
  });

  const total = entries.reduce((s, e) => s + Number(e.amount), 0);

  function shareReport() {
    const msg = formatSummary(entries, project ?? undefined, label);
    shareToWhatsApp(msg);
  }

  function downloadCsv() {
    const header = ['Date', 'Description', 'Category', 'Amount', 'Payment Mode', 'Credit'];
    const rows = entries.map((e) => [
      e.entry_date,
      e.description,
      CATEGORIES[e.category].label,
      e.amount,
      e.payment_mode,
      e.is_credit ? 'Yes' : 'No',
    ]);
    const csv =
      [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nirman-${range}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-white pb-32">
      <header className="border-b-4 border-black bg-yellow-300 px-4 py-6">
        <h1 className="text-3xl font-black uppercase">Reports</h1>
        <p className="text-sm font-bold">{label}</p>
      </header>

      <div className="p-4">
        {/* Range tabs */}
        <div className="mb-4 grid grid-cols-4 gap-1">
          {(['today', 'week', 'month', 'all'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`border-2 border-black py-2 text-xs font-black uppercase ${
                range === r ? 'bg-yellow-300 shadow-[3px_3px_0_0_#000]' : 'bg-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Total */}
        <div className="mb-4 border-4 border-black bg-yellow-100 p-4 shadow-[4px_4px_0_0_#000]">
          <p className="text-xs font-black uppercase">Total ({entries.length} entries)</p>
          <p className="text-4xl font-black">{formatINR(total)}</p>
        </div>

        {/* Action buttons */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <button
            onClick={shareReport}
            disabled={entries.length === 0}
            className="flex items-center justify-center gap-2 border-4 border-black bg-green-400 py-3 font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40"
          >
            <Share2 className="h-5 w-5" strokeWidth={3} /> WhatsApp
          </button>
          <button
            onClick={downloadCsv}
            disabled={entries.length === 0}
            className="flex items-center justify-center gap-2 border-4 border-black bg-blue-300 py-3 font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40"
          >
            <Download className="h-5 w-5" strokeWidth={3} /> CSV
          </button>
        </div>

        {/* Entry list */}
        <div className="space-y-2">
          {entries.map((e) => {
            const cat = CATEGORIES[e.category];
            return (
              <div key={e.id} className="flex items-center gap-3 border-2 border-black p-3">
                <span className="text-2xl">{cat.icon}</span>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-bold">{e.description}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(e.entry_date), 'dd MMM')} · {cat.label}
                  </p>
                </div>
                <p className="text-base font-black">{formatINR(Number(e.amount))}</p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
