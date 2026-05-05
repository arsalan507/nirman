'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, LogOut, Trash2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { formatINR, CATEGORIES, getAllCategories } from '@/lib/constants';
import SlideToDelete from '@/components/SlideToDelete';
import type { Project } from '@/types';

const EMOJI_OPTIONS = ['🔧', '🏠', '🪣', '⚡', '🔩', '🧰', '📦', '🛒', '🪵', '🚿', '🪟', '🧹', '🎨', '🔑', '🪜'];
const COLOR_OPTIONS = ['#FFD93D', '#FF9F43', '#7FFF9F', '#74C0FC', '#9775FA', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FF69B4', '#B0B0B0'];

export default function SettingsPage() {
  const qc = useQueryClient();
  const { activeProjectId, setActiveProject, customCategories, addCategory, removeCategory, hiddenCategories, hideCategory, unhideCategory } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [catLabel, setCatLabel] = useState('');
  const [catIcon, setCatIcon] = useState('🔧');
  const [catColor, setCatColor] = useState('#FFD93D');

  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const allCategories = getAllCategories(customCategories, []);  // show all in settings, including hidden
  const defaultCategoryKeys = Object.keys(CATEGORIES);

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
                  onClick={() => setDeletingProject(p)}
                  className="flex h-8 w-8 items-center justify-center border border-black bg-red-300"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black uppercase">Categories</h2>
            <button
              onClick={() => setShowAddCat(true)}
              className="flex items-center gap-1 border-2 border-black bg-yellow-300 px-3 py-1 text-xs font-black uppercase shadow-[3px_3px_0_0_#000]"
            >
              <Plus className="h-4 w-4" /> New
            </button>
          </div>

          <div className="space-y-2">
            {Object.entries(allCategories).map(([key, cat]) => {
              const isDefault = defaultCategoryKeys.includes(key);
              const isHidden = hiddenCategories.includes(key);
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between border-2 border-black p-3 ${isHidden ? 'opacity-40' : ''}`}
                  style={{ backgroundColor: cat.color + '33' }}
                >
                  <span className="font-bold">
                    {cat.icon} {cat.label}
                    {isHidden && <span className="ml-2 text-xs text-gray-500">(hidden)</span>}
                  </span>
                  <div className="flex gap-2">
                    {isHidden ? (
                      <button
                        onClick={() => unhideCategory(key)}
                        className="border-2 border-black bg-green-300 px-3 py-1 text-xs font-black uppercase"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (isDefault) {
                            hideCategory(key);
                          } else {
                            removeCategory(key);
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center border border-black bg-red-300"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={3} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
      {/* Add category modal */}
      {showAddCat && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-md border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#000]">
            <h3 className="mb-4 text-xl font-black uppercase">New Category</h3>
            <label className="mb-1 block text-xs font-black uppercase">
              Category Name
            </label>
            <input
              type="text"
              value={catLabel}
              onChange={(e) => setCatLabel(e.target.value)}
              placeholder="e.g. Interior Work"
              className="mb-3 w-full border-2 border-black px-3 py-3 text-base"
            />
            <label className="mb-1 block text-xs font-black uppercase">
              Pick Icon
            </label>
            <div className="mb-3 flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setCatIcon(e)}
                  className={`flex h-10 w-10 items-center justify-center border-2 text-xl ${
                    catIcon === e ? 'border-black bg-yellow-300' : 'border-gray-300'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <label className="mb-1 block text-xs font-black uppercase">
              Pick Color
            </label>
            <div className="mb-4 flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCatColor(c)}
                  className={`h-10 w-10 border-2 ${
                    catColor === c ? 'border-black shadow-[2px_2px_0_0_#000]' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowAddCat(false)}
                className="border-2 border-black bg-white py-3 font-black uppercase"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!catLabel) return;
                  const key = catLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                  addCategory({ key, label: catLabel, icon: catIcon, color: catColor });
                  setShowAddCat(false);
                  setCatLabel('');
                  setCatIcon('🔧');
                  setCatColor('#FFD93D');
                }}
                disabled={!catLabel}
                className="border-2 border-black bg-green-400 py-3 font-black uppercase shadow-[3px_3px_0_0_#000] disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {deletingProject && (
        <SlideToDelete
          label={`Delete "${deletingProject.name}"?`}
          onConfirm={() => {
            deleteProject.mutate(deletingProject.id);
            if (activeProjectId === deletingProject.id) setActiveProject(null);
            setDeletingProject(null);
          }}
          onCancel={() => setDeletingProject(null)}
        />
      )}
    </main>
  );
}
