'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatINR, PAYMENT_MODES, getAllCategories } from '@/lib/constants';
import * as ui from '@/lib/ui';
import { useAppStore } from '@/store';
import type { Entry, Project } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { activeProjectId, setActiveProject, customCategories, hiddenCategories } = useAppStore();
  const allCategories = getAllCategories(customCategories, hiddenCategories);
  const [showCredits, setShowCredits] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('*');
      return (data ?? []) as Project[];
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['dashboard-entries', activeProjectId],
    queryFn: async () => {
      let q = supabase.from('entries').select('*').limit(500);
      if (activeProjectId) q = q.eq('project_id', activeProjectId);
      const { data } = await q;
      return (data ?? []) as Entry[];
    },
  });

  const totalSpent = entries.reduce((s, e) => s + Number(e.amount), 0);
  const creditEntries = entries.filter((e) => e.is_credit);
  const totalCredit = creditEntries.reduce((s, e) => s + Number(e.amount), 0);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const totalBudget = activeProject?.budget ?? projects.reduce((s, p) => s + Number(p.budget), 0);
  const pctSpent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const byCategory = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});
  const categoryData = Object.entries(byCategory).map(([key, value]) => {
    const cat = allCategories[key] ?? { label: key, color: '#B0B0B0', icon: '📌' };
    return { name: cat.label, value, color: cat.color, icon: cat.icon };
  }).sort((a, b) => b.value - a.value);

  const byPayment = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.payment_mode] = (acc[e.payment_mode] ?? 0) + Number(e.amount);
    return acc;
  }, {});
  const paymentData = Object.entries(byPayment).map(([key, value]) => ({
    name: PAYMENT_MODES[key as keyof typeof PAYMENT_MODES].label,
    value,
  }));

  const status = pctSpent >= 100 ? 'over' : pctSpent >= 80 ? 'near' : 'ontrack';
  const statusBg = status === 'over' ? 'from-red-400 to-red-500' : status === 'near' ? 'from-orange-400 to-orange-500' : 'from-green-400 to-green-500';
  const statusLabel = status === 'over' ? 'Over Budget' : status === 'near' ? 'Near Limit' : 'On Track';

  return (
    <main className="min-h-screen">
      <header className={ui.headerGradient}>
        <h1 className={ui.headerTitle}>Dashboard</h1>
        <select
          value={activeProjectId ?? ''}
          onChange={(e) => setActiveProject(e.target.value || null)}
          className={`${ui.select} mt-2 bg-white/80`}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </header>

      <div className="space-y-4 p-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className={ui.kpiCard}>
            <p className={ui.kpiLabel}>Total Spent</p>
            <p className={ui.kpiValue}>{formatINR(totalSpent)}</p>
          </div>
          <button onClick={() => router.push('/')} className={`${ui.kpiCard} text-left active:scale-[0.97] transition-transform`}>
            <p className={ui.kpiLabel}>Entries</p>
            <p className={ui.kpiValue}>{entries.length}</p>
            <p className="text-[10px] text-gray-400 mt-1">Tap to view</p>
          </button>
          <button
            onClick={() => creditEntries.length > 0 && setShowCredits(true)}
            className={`rounded-xl shadow-sm border border-orange-200 bg-orange-50 p-4 text-left active:scale-[0.97] transition-transform`}
          >
            <p className={ui.kpiLabel}>Outstanding</p>
            <p className="text-xl font-bold text-orange-600 mt-0.5">{formatINR(totalCredit)}</p>
            {creditEntries.length > 0 && <p className="text-[10px] text-gray-400 mt-1">Tap to view</p>}
          </button>
          <div className={ui.kpiCard}>
            <p className={ui.kpiLabel}>Budget</p>
            <p className={ui.kpiValue}>{formatINR(totalBudget)}</p>
          </div>
        </div>

        {/* Budget bar */}
        {totalBudget > 0 && (
          <div className={`rounded-xl bg-gradient-to-r ${statusBg} p-5 shadow-md`}>
            <div className="mb-2 flex justify-between text-sm font-semibold text-white/90">
              <span>Budget Used</span>
              <span>{statusLabel}</span>
            </div>
            <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${Math.min(pctSpent, 100)}%` }}
              />
            </div>
            <p className="text-2xl font-bold text-white">{pctSpent}% of {formatINR(totalBudget)}</p>
          </div>
        )}

        {/* Category breakdown */}
        {categoryData.length > 0 && (
          <section className={ui.card}>
            <h2 className={ui.sectionTitle}>By Category</h2>
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={70} stroke="#fff" strokeWidth={2}>
                    {categoryData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatINR(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1.5">
              {categoryData.slice(0, 5).map((d) => (
                <div key={d.name} className="flex justify-between text-sm">
                  <span className="text-gray-600">{d.icon} {d.name}</span>
                  <span className="font-semibold text-gray-900">{formatINR(d.value)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Payment mode */}
        {paymentData.length > 0 && (
          <section className={ui.card}>
            <h2 className={ui.sectionTitle}>By Payment Mode</h2>
            <div className="h-44">
              <ResponsiveContainer>
                <BarChart data={paymentData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatINR(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }} />
                  <Bar dataKey="value" fill="#FFD93D" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>

      {/* Credit modal */}
      {showCredits && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
          <header className="flex items-center justify-between bg-gradient-to-r from-orange-400 to-orange-500 px-5 py-4">
            <h2 className="text-lg font-bold text-white">Outstanding Credit</h2>
            <button onClick={() => setShowCredits(false)} className={ui.btnIcon}>
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4 rounded-xl bg-orange-50 border border-orange-200 p-5">
              <p className={ui.kpiLabel}>Total Outstanding</p>
              <p className="text-3xl font-bold text-orange-600">{formatINR(totalCredit)}</p>
            </div>
            <div className="space-y-2">
              {creditEntries.map((e) => {
                const cat = allCategories[e.category] ?? { icon: '📌', label: e.category };
                return (
                  <div key={e.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm border border-gray-100">
                    <span className="text-xl">{cat.icon}</span>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-semibold">{e.description}</p>
                      <p className="text-xs text-gray-400">{format(new Date(e.entry_date), 'dd MMM')} · {cat.label}</p>
                    </div>
                    <p className="text-base font-bold text-red-600">{formatINR(Number(e.amount))}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
