'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, LogOut, Trash2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { formatINR } from '@/lib/constants';
import type { Project } from '@/types';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { activeProjectId, setActiveProject } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('*').order('created_at');
      return (data ?? []) as Project[];
    },
  });

  const addProject = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) throw new Error('Not signed in');
      const { error } = await supabase.from('projects').insert({
        owner_id: u.user.id,
        name,
        budget: budget ? Number(budget) : 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setShowAdd(false);
      setName('');
      setBudget('');
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  return (
    <main className="min-h-screen bg-white pb-32">
      <header className="border-b-4 border-black bg-yellow-300 px-4 py-6">
        <h1 className="text-3xl font-black uppercase">Settings</h1>
      </header>

      <div className="space-y-4 p-4">
        {/* Projects */}
        <section className="border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black uppercase">Projects</h2>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 border-2 border-black bg-yellow-300 px-3 py-1 text-xs font-black uppercase shadow-[3px_3px_0_0_#000]"
            >
              <Plus className="h-4 w-4" /> New
            </button>
          </div>

          {projects.length === 0 && (
            <p className="text-sm text-gray-500">
              No projects yet — add one to start tracking.
            </p>
          )}

          <div className="space-y-2">
            {/* "All projects" option */}
            <button
              onClick={() => setActiveProject(null)}
              className={`flex w-full items-center justify-between border-2 border-black p-3 text-left ${
                activeProjectId === null ? 'bg-yellow-200' : 'bg-white'
              }`}
            >
              <span className="font-bold">All Projects</span>
              {activeProjectId === null && <Check className="h-5 w-5" strokeWidth={3} />}
            </button>

            {projects.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between border-2 border-black p-3 ${
                  activeProjectId === p.id ? 'bg-yellow-200' : 'bg-white'
                }`}
              >
                <button
                  onClick={() => setActiveProject(p.id)}
                  className="flex-1 text-left"
                >
                  <p className="font-bold">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    Budget: {formatINR(Number(p.budget))}
                  </p>
                </button>
                {activeProjectId === p.id && (
                  <Check className="mx-2 h-5 w-5" strokeWidth={3} />
                )}
                <button
                  onClick={() => {
                    if (confirm(`Delete project "${p.name}"? All entries will be deleted too.`)) {
                      deleteProject.mutate(p.id);
                      if (activeProjectId === p.id) setActiveProject(null);
                    }
                  }}
                  className="flex h-8 w-8 items-center justify-center border border-black bg-red-300"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Sign out */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            location.reload();
          }}
          className="flex w-full items-center justify-center gap-2 border-4 border-black bg-red-300 py-3 font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          <LogOut className="h-5 w-5" strokeWidth={3} /> Sign Out
        </button>

        <p className="text-center text-xs text-gray-500">
          Nirman v0.1 · Built for Bengaluru construction
        </p>
      </div>

      {/* Add project modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-md border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#000]">
            <h3 className="mb-4 text-xl font-black uppercase">New Project</h3>
            <label className="mb-1 block text-xs font-black uppercase">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HSR Site, Whitefield Villa"
              className="mb-3 w-full border-2 border-black px-3 py-3 text-base"
            />
            <label className="mb-1 block text-xs font-black uppercase">
              Total Budget ₹ (optional)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0"
              className="mb-4 w-full border-2 border-black px-3 py-3 text-base"
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowAdd(false)}
                className="border-2 border-black bg-white py-3 font-black uppercase"
              >
                Cancel
              </button>
              <button
                onClick={() => addProject.mutate()}
                disabled={!name || addProject.isPending}
                className="border-2 border-black bg-green-400 py-3 font-black uppercase shadow-[3px_3px_0_0_#000] disabled:opacity-50"
              >
                {addProject.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
