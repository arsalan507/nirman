'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  function sendOtp() {
    if (phone.replace(/\D/g, '').length < 10) return;
    setError(null);
    setStep('otp');
  }

  async function verifyOtp() {
    setBusy(true);
    setError(null);

    if (otp !== '0000') {
      setError('Wrong OTP. Enter 0000');
      setBusy(false);
      return;
    }

    // Use phone as fake email for Supabase session (RLS needs a real user)
    const digits = phone.replace(/\D/g, '').slice(-10);
    const fakeEmail = `${digits}@nirman.local`;
    const password = `nirman-${digits}-0000`;

    // Try sign in first, then sign up if new user
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });

    if (signInErr) {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: fakeEmail,
        password,
      });
      if (signUpErr) {
        setError(signUpErr.message);
        setBusy(false);
        return;
      }
    }

    setBusy(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-yellow-300">
        <p className="text-2xl font-black uppercase">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-yellow-300 p-6">
        <div className="w-full max-w-sm border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#000]">
          <h1 className="mb-1 text-3xl font-black uppercase">Nirman</h1>
          <p className="mb-6 text-sm font-bold">Construction Expense Tracker</p>

          {step === 'phone' ? (
            <>
              <label className="mb-1 block text-xs font-black uppercase">
                Phone Number
              </label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="9916516507"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
                className="w-full border-2 border-black px-3 py-3 text-lg font-bold"
              />
              <button
                onClick={sendOtp}
                disabled={phone.replace(/\D/g, '').length < 10}
                className="mt-4 w-full border-4 border-black bg-green-400 py-3 text-lg font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
              >
                Send OTP
              </button>
            </>
          ) : (
            <>
              <label className="mb-1 block text-xs font-black uppercase">
                Enter 4-digit OTP
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && otp.length === 4 && verifyOtp()}
                className="w-full border-2 border-black px-3 py-3 text-2xl font-black tracking-widest"
              />
              <button
                onClick={verifyOtp}
                disabled={busy || otp.length !== 4}
                className="mt-4 w-full border-4 border-black bg-green-400 py-3 text-lg font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
              >
                {busy ? 'Verifying...' : 'Verify & Enter'}
              </button>
              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(null); }}
                className="mt-2 w-full text-xs underline"
              >
                Change number
              </button>
            </>
          )}

          {error && (
            <p className="mt-3 rounded border-2 border-red-500 bg-red-100 p-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
