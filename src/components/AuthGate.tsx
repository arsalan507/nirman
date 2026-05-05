'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchProfile, createOrgAndProfile } from '@/lib/auth-helpers';
import { useAppStore } from '@/store';
import * as ui from '@/lib/ui';
import type { Session } from '@supabase/supabase-js';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setProfile, setOrganization, profile } = useAppStore();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        const result = await fetchProfile(data.session.user.id);
        if (result) {
          setProfile(result.profile);
          setOrganization(result.organization);
        }
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [setProfile, setOrganization]);

  function getCredentials() {
    const digits = phone.replace(/\D/g, '').slice(-10);
    const pinVal = pin || digits.slice(-4);
    return {
      email: `${digits}@nirman.app`,
      password: `nrm-${pinVal}-${digits}`,
      digits,
    };
  }

  async function handleLogin() {
    setBusy(true);
    setError(null);
    const { email, password, digits } = getCredentials();

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });

    if (signInErr) {
      // User doesn't exist — show register step
      setStep('register');
      setBusy(false);
      return;
    }

    // Load profile
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const result = await fetchProfile(userData.user.id);
      if (result) {
        setProfile(result.profile);
        setOrganization(result.organization);
      }
    }
    setBusy(false);
  }

  async function handleRegister() {
    if (!name.trim()) {
      setError('Enter your name');
      return;
    }
    setBusy(true);
    setError(null);
    const { email, password, digits } = getCredentials();

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) {
      setError(signUpErr.message);
      setBusy(false);
      return;
    }

    if (!signUpData.user) {
      setError('Signup failed');
      setBusy(false);
      return;
    }

    // Create org + profile
    const result = await createOrgAndProfile(signUpData.user.id, digits, name.trim());
    if (!result) {
      setError('Failed to create account');
      setBusy(false);
      return;
    }

    setProfile(result.profile);
    setOrganization(result.organization);
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
          <p className="text-sm font-semibold text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-50 p-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg">
              <span className="text-3xl font-black text-white">N</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Nirman</h1>
            <p className="text-sm text-gray-500">Construction Expense Tracker</p>
          </div>

          <div className={ui.cardLg}>
            {step === 'login' ? (
              <>
                <label className={ui.label}>Phone Number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter 10-digit number"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className={ui.input}
                />

                <label className={`${ui.label} mt-4`}>PIN (4 digits)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="Default: last 4 digits of phone"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && phone.length >= 10 && handleLogin()}
                  className={ui.input}
                />

                <button
                  onClick={handleLogin}
                  disabled={busy || phone.length < 10}
                  className={`${ui.btnPrimary} mt-5`}
                >
                  {busy ? 'Signing in...' : 'Sign In'}
                </button>
              </>
            ) : (
              <>
                <p className="mb-4 text-sm text-gray-600">
                  New account for <span className="font-semibold">{phone}</span>
                </p>

                <label className={ui.label}>Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ahmed Khan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  className={ui.input}
                  autoFocus
                />

                <button
                  onClick={handleRegister}
                  disabled={busy || !name.trim()}
                  className={`${ui.btnPrimary} mt-5`}
                >
                  {busy ? 'Creating...' : 'Create Account'}
                </button>

                <button
                  onClick={() => { setStep('login'); setError(null); }}
                  className="mt-3 w-full text-center text-sm text-gray-500 underline"
                >
                  Back to sign in
                </button>
              </>
            )}

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            PIN is your 4-digit secret. Default: last 4 digits of your phone.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
