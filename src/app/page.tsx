'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Plus, Pencil, Share2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatINR, getAllCategories } from '@/lib/constants';
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
  const { activeProjectId, customCategories, hiddenCategories } = useAppStore();
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
    <main className="min-h-screen bg-white pb-32">
      <header className="border-b-4 border-black bg-yellow-300 px-4 pb-4 pt-6">
        <h1 className="text-3xl font-black uppercase">Nirman</h1>
        <p className="text-xs font-bold uppercase tracking-wide">
          Today: <span className="text-2xl">{formatINR(todayTotal)}</span>
        </p>
      </header>

      {!isLoading && projects.length === 0 && (
        <div className="px-4 pt-12 text-center">
          <p className="text-lg font-bold">No projects yet.</p>
          <a
            href="/settings"
            className="mt-3 inline-block border-4 border-black bg-yellow-300 px-6 py-3 font-black uppercase shadow-[4px_4px_0_0_#000]"
          >
            Add First Project
          </a>
        </div>
      )}

      {!isLoading && projects.length > 0 && entries.length === 0 && (
        <div className="px-4 pt-12 text-center">
          <p className="text-lg font-bold">No entries yet.</p>
          <p className="text-sm text-gray-500">Tap + below to add the first one.</p>
        </div>
      )}

      <div className="divide-y-2 divide-black">
        {entries.map((e) => {
          const cat = allCategories[e.category] ?? { label: e.category, icon: '📌', color: '#B0B0B0' };
          const proj = projectMap.get(e.project_id);
          return (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-black text-2xl"
                style={{ backgroundColor: cat.color }}
              >
                {cat.icon}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-base font-bold">{e.description}</p>
                <p className="text-xs text-gray-500">
                  {format(parseISO(e.entry_date), 'dd MMM')} · {cat.label}
                  {proj ? ` · ${proj.name}` : ''}
                  {e.is_credit && ' · ⏳ Credit'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className="text-lg font-black">{formatINR(Number(e.amount))}</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const msg = formatEntryAsInvoice(e, proj);
                      shareToWhatsApp(msg);
                    }}
                    className="flex h-7 w-7 items-center justify-center border border-black bg-green-300 active:translate-x-px active:translate-y-px"
                    aria-label="Share"
                  >
                    <Share2 className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => setEditing(e)}
                    className="flex h-7 w-7 items-center justify-center border border-black bg-yellow-200 active:translate-x-px active:translate-y-px"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => setDeleting(e)}
                    className="flex h-7 w-7 items-center justify-center border border-black bg-red-300 active:translate-x-px active:translate-y-px"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 z-30 flex h-16 w-16 items-center justify-center rounded-full border-4 border-black bg-yellow-300 shadow-[6px_6px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none"
        aria-label="Add entry"
      >
        <Plus className="h-8 w-8" strokeWidth={3} />
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
