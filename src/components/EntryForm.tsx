'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X, Save } from 'lucide-react';
import {
  CATEGORIES,
  PAYMENT_MODES,
  LABOR_TYPES,
  MATERIALS,
  formatINR,
  getAllCategories,
  type CategoryKey,
  type PaymentMode,
} from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import VoiceButton from './VoiceButton';
import type { ParsedVoiceEntry } from '@/lib/voice-parser';
import type { Project, Entry } from '@/types';

const numericString = (msg = 'Enter a valid number') =>
  z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(Number(v)), msg);

const entrySchema = z.object({
  entry_date: z.string().min(1),
  description: z.string().min(1, 'Description required'),
  amount: z
    .string()
    .min(1, 'Amount required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be > 0'),
  project_id: z.string().min(1, 'Pick a project'),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  worker_count: numericString(),
  daily_rate: numericString(),
  quantity: numericString(),
  unit: z.string().optional(),
  vendor_name: z.string().optional(),
  payment_mode: z.string().min(1),
  is_credit: z.boolean().optional(),
  bill_number: z.string().optional(),
  notes: z.string().optional(),
});

type EntryFormValues = z.infer<typeof entrySchema>;

const toNum = (v: string | undefined | null) =>
  v && !isNaN(Number(v)) ? Number(v) : null;

export default function EntryForm({
  onClose,
  initialData,
}: {
  onClose: () => void;
  initialData?: Entry;
}) {
  const qc = useQueryClient();
  const { activeProjectId, lastPaymentMode, setLastPaymentMode, customCategories, hiddenCategories } = useAppStore();
  const allCategories = getAllCategories(customCategories, hiddenCategories);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('*').order('created_at');
      return (data ?? []) as Project[];
    },
  });

  const isEdit = !!initialData;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      entry_date: initialData?.entry_date ?? format(new Date(), 'yyyy-MM-dd'),
      description: initialData?.description ?? '',
      amount: initialData?.amount ? String(initialData.amount) : '',
      project_id: initialData?.project_id ?? activeProjectId ?? '',
      category: initialData?.category ?? 'material',
      subcategory: initialData?.subcategory ?? '',
      worker_count: initialData?.worker_count ? String(initialData.worker_count) : '',
      daily_rate: initialData?.daily_rate ? String(initialData.daily_rate) : '',
      quantity: initialData?.quantity ? String(initialData.quantity) : '',
      unit: initialData?.unit ?? '',
      payment_mode: (initialData?.payment_mode ?? lastPaymentMode) as PaymentMode,
      is_credit: initialData?.is_credit ?? false,
    },
  });

  // Set first project as default if none selected
  useEffect(() => {
    if (!watch('project_id') && projects[0]) {
      setValue('project_id', projects[0].id);
    }
  }, [projects, setValue, watch]);

  const category = watch('category') as CategoryKey;

  const saveMutation = useMutation({
    mutationFn: async (values: EntryFormValues) => {
      const { data: userData } = await supabase.auth.getUser();
      const owner_id = userData.user?.id;
      if (!owner_id) throw new Error('Not signed in');

      // Atomic vendor upsert — avoids race condition on duplicate names
      let vendor_id: string | null = null;
      if (values.vendor_name) {
        const { data: vendor, error: vErr } = await supabase
          .from('vendors')
          .upsert(
            { owner_id, name: values.vendor_name },
            { onConflict: 'owner_id,name' }
          )
          .select('id')
          .single();
        if (vErr) throw vErr;
        vendor_id = vendor.id;
      }

      const payload = {
        owner_id,
        project_id: values.project_id,
        entry_date: values.entry_date,
        description: values.description,
        amount: Number(values.amount),
        category: values.category,
        subcategory: values.subcategory || null,
        worker_count: toNum(values.worker_count),
        daily_rate: toNum(values.daily_rate),
        quantity: toNum(values.quantity),
        unit: values.unit || null,
        vendor_id,
        payment_mode: values.payment_mode,
        is_credit: values.is_credit ?? false,
        bill_number: values.bill_number || null,
        notes: values.notes || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('entries')
          .update(payload)
          .eq('id', initialData!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('entries').insert(payload);
        if (error) throw error;
      }

      setLastPaymentMode(values.payment_mode);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });

  const onVoiceResult = (parsed: ParsedVoiceEntry) => {
    if (parsed.amount) setValue('amount', String(parsed.amount));
    if (parsed.description) setValue('description', parsed.description);
    setValue('category', parsed.category);
    if (parsed.subcategory) setValue('subcategory', parsed.subcategory);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b-4 border-black bg-yellow-300 px-4 py-3">
        <h2 className="text-xl font-black uppercase">
          {isEdit ? 'Edit Entry' : 'New Entry'}
        </h2>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center border-2 border-black bg-white shadow-[3px_3px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          aria-label="Close"
        >
          <X strokeWidth={3} />
        </button>
      </header>

      <form
        onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
        className="flex-1 overflow-y-auto px-4 pb-32 pt-6"
      >
        {/* Voice button */}
        {!isEdit && (
          <div className="mb-6 flex flex-col items-center gap-2">
            <VoiceButton onResult={onVoiceResult} />
            <p className="text-center text-xs text-gray-500">
              Say in Hindi, Kannada, or English
            </p>
          </div>
        )}

        <div className="space-y-5">
          {/* Date */}
          <Field label="Date">
            <input
              type="date"
              {...register('entry_date')}
              className={inputClass}
            />
          </Field>

          {/* Project */}
          <Field label="Project">
            <select {...register('project_id')} className={inputClass}>
              {projects.length === 0 && <option value="">— No projects yet —</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          {/* Amount */}
          <Field label="Amount (₹)" error={errors.amount?.message}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              {...register('amount')}
              className={`${inputClass} text-3xl font-black`}
            />
          </Field>

          {/* Description */}
          <Field label="Description" error={errors.description?.message}>
            <input
              type="text"
              placeholder="e.g. Cement 10 bags, Mason 4 days"
              {...register('description')}
              className={inputClass}
            />
          </Field>

          {/* Category — big tile picker */}
          <Field label="Category">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(allCategories).map(([key, cat]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setValue('category', key as CategoryKey)}
                  className={`flex items-center gap-2 border-2 border-black p-3 text-left text-sm font-bold ${
                    category === key
                      ? 'bg-yellow-300 shadow-[4px_4px_0_0_#000]'
                      : 'bg-white'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </Field>

          {/* Subcategory — only when relevant */}
          {(category === 'labor_daily' || category === 'labor_contract') && (
            <>
              <Field label="Worker Type">
                <select {...register('subcategory')} className={inputClass}>
                  <option value="">— Select —</option>
                  {LABOR_TYPES.map((l) => (
                    <option key={l.name} value={l.name}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>
              {category === 'labor_daily' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Workers">
                    <input
                      type="text"
                      inputMode="numeric"
                      {...register('worker_count')}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Rate / day">
                    <input
                      type="text"
                      inputMode="decimal"
                      {...register('daily_rate')}
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}
            </>
          )}

          {category === 'material' && (
            <>
              <Field label="Material Item">
                <select {...register('subcategory')} className={inputClass}>
                  <option value="">— Select —</option>
                  {MATERIALS.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity">
                  <input
                    type="text"
                    inputMode="decimal"
                    {...register('quantity')}
                    className={inputClass}
                  />
                </Field>
                <Field label="Unit">
                  <input
                    type="text"
                    placeholder="bag / kg / sqft"
                    {...register('unit')}
                    className={inputClass}
                  />
                </Field>
              </div>
            </>
          )}

          {/* Vendor */}
          <Field label="Vendor / Person (optional)">
            <input
              type="text"
              placeholder="e.g. Ramesh Cement Stores"
              {...register('vendor_name')}
              className={inputClass}
            />
          </Field>

          {/* Payment mode — big buttons */}
          <Field label="Payment Mode">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PAYMENT_MODES).map(([key, m]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() =>
                    setValue('payment_mode', key, { shouldDirty: true })
                  }
                  className={`flex flex-col items-center gap-1 border-2 border-black p-3 text-xs font-bold ${
                    watch('payment_mode') === key
                      ? 'bg-mint-400 bg-green-300 shadow-[4px_4px_0_0_#000]'
                      : 'bg-white'
                  }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </Field>

          {/* Credit toggle */}
          <label className="flex items-center gap-3 border-2 border-black bg-white p-3">
            <input
              type="checkbox"
              {...register('is_credit')}
              className="h-6 w-6 accent-black"
            />
            <span className="text-sm font-bold">
              ⏳ This amount is owed (vendor will be paid later)
            </span>
          </label>

          {/* Optional bill no + notes */}
          <Field label="Bill Number (optional)">
            <input
              type="text"
              {...register('bill_number')}
              className={inputClass}
            />
          </Field>

          <Field label="Notes (optional)">
            <textarea {...register('notes')} rows={2} className={inputClass} />
          </Field>

          {Number(watch('amount')) > 0 && (
            <div className="rounded-none border-4 border-black bg-yellow-100 p-4 text-center">
              <p className="text-sm font-bold uppercase">Total</p>
              <p className="text-4xl font-black">
                {formatINR(Number(watch('amount')))}
              </p>
            </div>
          )}
        </div>

        {saveMutation.isError && (
          <p className="mt-3 text-center text-red-600">
            {String((saveMutation.error as Error)?.message ?? 'Save failed')}
          </p>
        )}

        {/* Sticky save bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t-4 border-black bg-white p-3">
          <button
            type="submit"
            disabled={isSubmitting || saveMutation.isPending}
            className="w-full border-4 border-black bg-green-400 py-4 text-xl font-black uppercase shadow-[6px_6px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            <Save className="mr-2 inline h-6 w-6" />
            {isEdit ? 'Update' : 'Save Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  'w-full border-2 border-black bg-white px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yellow-300';

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-black uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
