'use client';

import { useAppStore } from '@/store';

/**
 * Conditionally render children based on user role.
 * Usage: <RoleGate role="admin"><AdminSection /></RoleGate>
 */
export default function RoleGate({
  role,
  children,
  fallback,
}: {
  role: 'admin' | 'team';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const profile = useAppStore((s) => s.profile);
  if (!profile) return null;
  if (profile.role !== role && role === 'admin') return fallback ?? null;
  return <>{children}</>;
}
