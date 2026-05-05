'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CATEGORIES, formatINR, PAYMENT_MODES, getAllCategories } from '@/lib/constants';
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

  // Category breakdown
  const byCategory = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});
  const categoryData = Object.entries(byCategory).map(([key, value]) => {
    const cat = allCategories[key] ?? { label: key, color: '#B0B0B0', icon: '📌' };
    return { name: cat.label, value, color: cat.color, icon: cat.icon };
  }).sort((a, b) => b.value - a.value);

  // Payment mode breakdown
  const byPayment = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.payment_mode] = (acc[e.payment_mode] ?? 0) + Number(e.amount);
    return acc;
  }, {});
  const paymentData = Object.entries(byPayment).map(([key, value]) => ({
    name: PAYMENT_MODES[key as keyof typeof PAYMENT_MODES].label,
    value,
  }));

  const status = pctSpent >= 100 ? 'over' : pctSpent >= 80 ? 'near' : 'ontrack';
  const statusColor = status === 'over' ? 'bg-red-300' : status === 'near' ? 'bg-orange-300' : 'bg-green-300';
  const statusLabel = status === 'over' ? '🔴 Over Budget' : status === 'near' ? '🟡 Near Limit' : '🟢 On Track';

  return (
    <main className="min-h-screen bg-white pb-32">
      <header className="border-b-4 border-black bg-yellow-300 px-4 py-6">
        <h1 className="text-3xl font-black uppercase">Dashboard</h1>
        <select
          value={activeProjectId ?? ''}
          onChange={(e) => setActiveProject(e.target.value || null)}
          className="mt-2 w-full border-2 border-black bg-white px-3 py-2 text-sm font-bold"
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
          <KpiCard label="Total Spent" value={formatINR(totalSpent)} />
          <KpiCard
            label="Entries"
            value={entries.length.toString()}
            onClick={() => router.push('/')}
          />
          <KpiCard
            label="Outstanding Credit"
            value={formatINR(totalCredit)}
            accent="bg-orange-200"
            onClick={() => creditEntries.length > 0 && setShowCredits(true)}
          />
          <KpiCard label="Budget" value={formatINR(totalBudget)} />
        </div>

        {/* Budget bar */}
        {totalBudget > 0 && (
          <div className={`border-4 border-black ${statusColor} p-4 shadow-[4px_4px_0_0_#000]`}>
            <div className="mb-2 flex justify-between text-sm font-black uppercase">
              <span>Budget Used</span>
              <span>{statusLabel}</span>
            </div>
            <div className="mb-2 h-6 w-full overflow-hidden border-2 border-black bg-white">
              <div
                className="h-full bg-black transition-all"
                style={{ width: `${Math.min(pctSpent, 100)}%` }}
              />
            </div>
            <p className="text-2xl font-black">{pctSpent}% of {formatINR(totalBudget)}</p>
          </div>
        )}

        {/* Category breakdown */}
        {categoryData.length > 0 && (
          <section className="border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="mb-3 text-lg font-black uppercase">By Category</h2>
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    stroke="#000"
                    strokeWidth={2}
                  >
                    {categoryData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatINR(Number(v))}
                    contentStyle={{ border: '2px solid black', borderRadius: 0 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {categoryData.slice(0, 5).map((d) => (
                <div key={d.name} className="flex justify-between text-sm">
                  <span>
                    {d.icon} {d.name}
                  </span>
                  <span className="font-bold">{formatINR(d.value)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Payment mode breakdown */}
        {paymentData.length > 0 && (
          <section className="border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="mb-3 text-lg font-black uppercase">By Payment Mode</h2>
            <div className="h-44">
              <ResponsiveContainer>
                <BarChart data={paymentData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v) => formatINR(Number(v))}
                    contentStyle={{ border: '2px solid black', borderRadius: 0 }}
                  />
                  <Bar dataKey="value" fill="#FFD93D" stroke="#000" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>

      {/* Outstanding credit modal */}
      {showCredits && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <header className="flex items-center justify-between border-b-4 border-black bg-orange-200 px-4 py-3">
            <h2 className="text-xl font-black uppercase">Outstanding Credit</h2>
            <button
              onClick={() => setShowCredits(false)}
              className="flex h-10 w-10 items-center justify-center border-2 border-black bg-white shadow-[3px_3px_0_0_#000]"
            >
              <X strokeWidth={3} />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4 border-4 border-black bg-orange-100 p-4 shadow-[4px_4px_0_0_#000]">
              <p className="text-xs font-black uppercase">Total Outstanding</p>
              <p className="text-3xl font-black">{formatINR(totalCredit)}</p>
            </div>
            <div className="space-y-2">
              {creditEntries.map((e) => {
                const cat = allCategories[e.category] ?? { icon: '📌', label: e.category };
                return (
                  <div key={e.id} className="flex items-center gap-3 border-2 border-black p-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-bold">{e.description}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(e.entry_date), 'dd MMM')} · {cat.label}
                      </p>
                    </div>
                    <p className="text-base font-black text-red-700">{formatINR(Number(e.amount))}</p>
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

function KpiCard({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  accent?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`border-4 border-black ${accent ?? 'bg-white'} p-3 shadow-[4px_4px_0_0_#000] text-left ${
        onClick ? 'active:translate-x-1 active:translate-y-1 active:shadow-none' : ''
      }`}
    >
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="text-xl font-black">{value}</p>
      {onClick && <p className="mt-1 text-[10px] text-gray-500">Tap to view</p>}
    </Tag>
  );
}
