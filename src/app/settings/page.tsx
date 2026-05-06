'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, LogOut, Trash2, Check, Users, UserPlus, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { formatINR, CATEGORIES, getAllCategories } from '@/lib/constants';
import { inviteTeamMember } from '@/lib/auth-helpers';
import * as ui from '@/lib/ui';
import SlideToDelete from '@/components/SlideToDelete';
import RoleGate from '@/components/RoleGate';
import type { Project, Profile } from '@/types';

const EMOJI_OPTIONS = ['🔧', '🏠', '🪣', '⚡', '🔩', '🧰', '📦', '🛒', '🪵', '🚿', '🪟', '🧹', '🎨', '🔑', '🪜'];
const COLOR_OPTIONS = ['#FFD93D', '#FF9F43', '#7FFF9F', '#74C0FC', '#9775FA', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FF69B4', '#B0B0B0'];

export default function SettingsPage() {
  const qc = useQueryClient();
  const { activeProjectId, setActiveProject, customCategories, addCategory, removeCategory, hiddenCategories, hideCategory, unhideCategory, profile, organization, clearAuth } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [catLabel, setCatLabel] = useState('');
  const [catIcon, setCatIcon] = useState('🔧');
  const [catColor, setCatColor] = useState('#FFD93D');
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [invPhone, setInvPhone] = useState('');
  const [invName, setInvName] = useState('');
  const [invBusy, setInvBusy] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);

  const allCategories = getAllCategories(customCategories, []);
  const defaultCategoryKeys = Object.keys(CATEGORIES);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('*').order('created_at');
      return (data ?? []) as Project[];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ['team-members'],
    enabled: profile?.role === 'admin',
    queryFn: async () => {
      if (!organization) return [];
      const { data } = await supabase.from('profiles').select('*').eq('organization_id', organization.id).order('created_at');
      return (data ?? []) as Profile[];
    },
  });

  const addProject = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) throw new Error('Not signed in');
      const { error } = await supabase.from('projects').insert({
        owner_id: u.user.id,
        organization_id: organization?.id,
        name,
        budget: budget ? Number(budget) : 0,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setShowAdd(false); setName(''); setBudget(''); },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, name: n, budget: b }: { id: string; name: string; budget: number }) => {
      const { error } = await supabase.from('projects').update({ name: n, budget: b }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setEditingProject(null); },
  });

  async function handleInvite() {
    if (!invPhone || !invName || !organization) return;
    setInvBusy(true);
    setInvError(null);
    const result = await inviteTeamMember(invPhone, invName, organization.id);
    setInvBusy(false);
    if (!result.success) { setInvError(result.error ?? 'Failed'); return; }
    qc.invalidateQueries({ queryKey: ['team-members'] });
    setShowInvite(false);
    setInvPhone('');
    setInvName('');
  }

  return (
    <main className="min-h-screen">
      <header className={ui.headerGradient}>
        <h1 className={ui.headerTitle}>Settings</h1>
        {profile && <p className={ui.headerSubtitle}>{profile.name} · {profile.role}</p>}
      </header>

      <div className="space-y-4 p-4">
        {/* Projects */}
        <section className={ui.card}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={ui.sectionTitle}>Projects</h2>
            <RoleGate role="admin">
              <button onClick={() => setShowAdd(true)} className={`${ui.btnSmall} bg-yellow-100 text-yellow-700 flex items-center gap-1`}>
                <Plus className="h-3.5 w-3.5" /> New
              </button>
            </RoleGate>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setActiveProject(null)}
              className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition-all ${activeProjectId === null ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'bg-gray-50'}`}
            >
              <span className="text-sm font-semibold text-gray-700">All Projects</span>
              {activeProjectId === null && <Check className="h-4 w-4 text-yellow-600" strokeWidth={2.5} />}
            </button>

            {projects.map((p) => (
              <div key={p.id} className={`flex items-center gap-2 rounded-xl p-3 transition-all ${activeProjectId === p.id ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'bg-gray-50'}`}>
                <button onClick={() => setActiveProject(p.id)} className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-700">{p.name}</p>
                  <p className="text-xs text-gray-400">Budget: {formatINR(Number(p.budget))}</p>
                </button>
                <RoleGate role="admin">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { setEditingProject(p); setEditName(p.name); setEditBudget(String(p.budget ?? 0)); }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600 active:scale-95"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                    <button onClick={() => setDeletingProject(p)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 active:scale-95">
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                </RoleGate>
              </div>
            ))}
          </div>
        </section>

        {/* Team (admin only) */}
        <RoleGate role="admin">
          <section className={ui.card}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={ui.sectionTitle}>Team</h2>
              <button onClick={() => setShowInvite(true)} className={`${ui.btnSmall} bg-blue-50 text-blue-600 flex items-center gap-1`}>
                <UserPlus className="h-3.5 w-3.5" /> Invite
              </button>
            </div>

            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-sm font-bold text-yellow-700">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-700">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.phone} · {m.role}</p>
                  </div>
                  {m.role === 'admin' && (
                    <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-[10px] font-semibold text-yellow-700">Admin</span>
                  )}
                </div>
              ))}
              {members.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No team members yet</p>}
            </div>
          </section>
        </RoleGate>

        {/* Categories */}
        <RoleGate role="admin">
          <section className={ui.card}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={ui.sectionTitle}>Categories</h2>
              <button onClick={() => setShowAddCat(true)} className={`${ui.btnSmall} bg-yellow-100 text-yellow-700 flex items-center gap-1`}>
                <Plus className="h-3.5 w-3.5" /> New
              </button>
            </div>

            <div className="space-y-2">
              {Object.entries(allCategories).map(([key, cat]) => {
                const isDefault = defaultCategoryKeys.includes(key);
                const isHidden = hiddenCategories.includes(key);
                return (
                  <div key={key} className={`flex items-center justify-between rounded-xl p-3 ${isHidden ? 'opacity-40' : ''}`} style={{ backgroundColor: cat.color + '20' }}>
                    <span className="text-sm font-medium text-gray-700">
                      {cat.icon} {cat.label}
                      {isHidden && <span className="ml-2 text-xs text-gray-400">(hidden)</span>}
                    </span>
                    {isHidden ? (
                      <button onClick={() => unhideCategory(key)} className={`${ui.btnSmall} bg-green-50 text-green-600`}>Restore</button>
                    ) : (
                      <button
                        onClick={() => isDefault ? hideCategory(key) : removeCategory(key)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 active:scale-95"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </RoleGate>

        {/* Sign out */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            clearAuth();
            location.reload();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-3 text-sm font-semibold text-red-600 active:scale-[0.97] transition-all"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>

        <p className="text-center text-xs text-gray-400">Nirman v2.0 · {organization?.name}</p>
      </div>

      {/* Add project modal */}
      {showAdd && (
        <div className={ui.modalOverlay}>
          <div className={ui.modalCard}>
            <h3 className="mb-4 text-lg font-bold text-gray-900">New Project</h3>
            <label className={ui.label}>Project Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HSR Site" className={`${ui.input} mb-3`} />
            <label className={ui.label}>Budget ₹ (optional)</label>
            <input type="text" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" className={`${ui.input} mb-4`} />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowAdd(false)} className={ui.btnSecondary}>Cancel</button>
              <button onClick={() => addProject.mutate()} disabled={!name || addProject.isPending} className={ui.btnPrimary}>
                {addProject.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add category modal */}
      {showAddCat && (
        <div className={ui.modalOverlay}>
          <div className={ui.modalCard}>
            <h3 className="mb-4 text-lg font-bold text-gray-900">New Category</h3>
            <label className={ui.label}>Name</label>
            <input type="text" value={catLabel} onChange={(e) => setCatLabel(e.target.value)} placeholder="e.g. Interior Work" className={`${ui.input} mb-3`} />
            <label className={ui.label}>Icon</label>
            <div className="mb-3 flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button type="button" key={e} onClick={() => setCatIcon(e)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-all ${catIcon === e ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'bg-gray-50'}`}>{e}</button>
              ))}
            </div>
            <label className={ui.label}>Color</label>
            <div className="mb-4 flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button type="button" key={c} onClick={() => setCatColor(c)}
                  className={`h-10 w-10 rounded-lg transition-all ${catColor === c ? 'ring-2 ring-gray-900 scale-110' : ''}`} style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowAddCat(false)} className={ui.btnSecondary}>Cancel</button>
              <button
                onClick={() => {
                  if (!catLabel) return;
                  addCategory({ key: catLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''), label: catLabel, icon: catIcon, color: catColor });
                  setShowAddCat(false); setCatLabel(''); setCatIcon('🔧'); setCatColor('#FFD93D');
                }}
                disabled={!catLabel} className={ui.btnPrimary}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite member modal */}
      {showInvite && (
        <div className={ui.modalOverlay}>
          <div className={ui.modalCard}>
            <h3 className="mb-4 text-lg font-bold text-gray-900">Invite Team Member</h3>
            <label className={ui.label}>Name</label>
            <input type="text" value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="e.g. Ramesh" className={`${ui.input} mb-3`} />
            <label className={ui.label}>Phone Number</label>
            <input type="tel" inputMode="numeric" maxLength={10} value={invPhone} onChange={(e) => setInvPhone(e.target.value.replace(/\D/g, ''))} placeholder="10-digit number" className={`${ui.input} mb-1`} />
            <p className="mb-4 text-xs text-gray-400">Default PIN: last 4 digits of their phone</p>
            {invError && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">{invError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setShowInvite(false); setInvError(null); }} className={ui.btnSecondary}>Cancel</button>
              <button onClick={handleInvite} disabled={invBusy || !invName || invPhone.length < 10} className={ui.btnPrimary}>
                {invBusy ? 'Inviting...' : 'Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit project modal */}
      {editingProject && (
        <div className={ui.modalOverlay}>
          <div className={ui.modalCard}>
            <h3 className="mb-4 text-lg font-bold text-gray-900">Edit Project</h3>
            <label className={ui.label}>Project Name</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={`${ui.input} mb-3`} />
            <label className={ui.label}>Budget ₹</label>
            <input type="text" inputMode="decimal" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} className={`${ui.input} mb-4`} />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setEditingProject(null)} className={ui.btnSecondary}>Cancel</button>
              <button
                onClick={() => updateProject.mutate({ id: editingProject.id, name: editName, budget: Number(editBudget) || 0 })}
                disabled={!editName || updateProject.isPending}
                className={ui.btnPrimary}
              >
                {updateProject.isPending ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingProject && (
        <SlideToDelete
          label={`Delete "${deletingProject.name}"?`}
          onConfirm={() => { deleteProject.mutate(deletingProject.id); if (activeProjectId === deletingProject.id) setActiveProject(null); setDeletingProject(null); }}
          onCancel={() => setDeletingProject(null)}
        />
      )}
    </main>
  );
}
