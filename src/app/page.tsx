'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Plus, Pencil, Share2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatINR, getAllCategories } from '@/lib/constants';
import * as ui from '@/lib/ui';
import EntryForm from '@/components/EntryForm';
import SlideToDelete from '@/components/SlideToDelete';
import { useAppStore } from '@/store';
import { formatEntryAsInvoice, shareToWhatsApp } from '@/lib/whatsapp';
import type { Entry, Project } from '@/types';

export default function HomePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const { activeProjectId, customCategories, hiddenCategories, organization } = useAppStore();
  const allCategories = getAllCategories(customCategories, hiddenCategories);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('*');
      return (data ?? []) as Project[];
    },
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['entries', activeProjectId],
    queryFn: async () => {
      let q = supabase
        .from('entries')
        .select('*')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);
      if (activeProjectId) q = q.eq('project_id', activeProjectId);
      const { data } = await q;
      return (data ?? []) as Entry[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleting(null);
    },
  });

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const todayTotal = entries
    .filter((e) => e.entry_date === format(new Date(), 'yyyy-MM-dd'))
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className={ui.headerGradient}>
        <p className="text-xs font-semibold text-gray-700/70 uppercase tracking-wide">
          {organization?.name ?? 'Nirman'}
        </p>
        <h1 className="text-3xl font-bold text-gray-900">
          {formatINR(todayTotal)}
        </h1>
        <p className="text-xs text-gray-700/70 mt-0.5">Today&apos;s spending</p>
      </header>

      <div className="px-4 pt-4">
        {!isLoading && projects.length === 0 && (
          <div className={`${ui.cardAccent} text-center py-10`}>
            <p className="text-lg font-semibold text-gray-700">No projects yet</p>
            <a
              href="/settings"
              className={`${ui.btnPrimary} mt-4 inline-block max-w-[200px]`}
            >
              Add First Project
            </a>
          </div>
        )}

        {!isLoading && projects.length > 0 && entries.length === 0 && (
          <div className={`${ui.cardAccent} text-center py-10`}>
            <p className="text-lg font-semibold text-gray-700">No entries yet</p>
            <p className="text-sm text-gray-500 mt-1">Tap + to add the first one</p>
          </div>
        )}

        {/* Entry list */}
        <div className="space-y-2">
          {entries.map((e) => {
            const cat = allCategories[e.category] ?? { label: e.category, icon: '📌', color: '#B0B0B0' };
            const proj = projectMap.get(e.project_id);
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm border border-gray-100">
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl"
                  style={{ backgroundColor: cat.color + '30' }}
                >
                  {cat.icon}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-semibold text-gray-900">{e.description}</p>
                  <p className="text-xs text-gray-400">
                    {format(parseISO(e.entry_date), 'dd MMM')} · {cat.label}
                    {proj ? ` · ${proj.name}` : ''}
                    {e.is_credit && ' · ⏳'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <p className="text-base font-bold text-gray-900">{formatINR(Number(e.amount))}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        const msg = formatEntryAsInvoice(e, proj);
                        shareToWhatsApp(msg);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-green-600 active:scale-95"
                    >
                      <Share2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => setEditing(e)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600 active:scale-95"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => setDeleting(e)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 active:scale-95"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-xl active:scale-95 transition-transform"
        aria-label="Add entry"
      >
        <Plus className="h-7 w-7 text-gray-900" strokeWidth={2.5} />
      </button>

      {(showForm || editing) && (
        <EntryForm
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          initialData={editing ?? undefined}
        />
      )}

      {deleting && (
        <SlideToDelete
          label={`Delete "${deleting.description}"?`}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </main>
  );
}
