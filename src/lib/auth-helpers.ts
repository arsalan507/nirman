import { supabase } from './supabase';
import type { Profile, Organization } from '@/types';

/**
 * Fetch the current user's profile and organization.
 * Called after auth session is confirmed.
 */
export async function fetchProfile(userId: string): Promise<{
  profile: Profile;
  organization: Organization;
} | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !profile) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.organization_id)
    .single();

  if (!org) return null;

  return { profile: profile as Profile, organization: org as Organization };
}

/**
 * Create a new organization + admin profile on first signup.
 */
export async function createOrgAndProfile(
  userId: string,
  phone: string,
  name: string
): Promise<{ profile: Profile; organization: Organization } | null> {
  // Create organization
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: `${name}'s Construction` })
    .select()
    .single();

  if (orgErr || !org) return null;

  // Create admin profile
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      name,
      phone,
      role: 'admin',
      organization_id: org.id,
    })
    .select()
    .single();

  if (profErr || !profile) return null;

  return { profile: profile as Profile, organization: org as Organization };
}

/**
 * Invite a team member (admin only).
 * Creates Supabase auth user + profile.
 */
export async function inviteTeamMember(
  phone: string,
  name: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const digits = phone.replace(/\D/g, '').slice(-10);
  const defaultPin = digits.slice(-4);
  const fakeEmail = `${digits}@nirman.app`;
  const password = `nrm-${defaultPin}-${digits}`;

  // Create auth user via signup
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: fakeEmail,
    password,
  });

  if (authErr) return { success: false, error: authErr.message };
  if (!authData.user) return { success: false, error: 'Failed to create user' };

  // Create profile
  const { error: profErr } = await supabase
    .from('profiles')
    .insert({
      user_id: authData.user.id,
      name,
      phone: digits,
      role: 'team',
      organization_id: organizationId,
    });

  if (profErr) return { success: false, error: profErr.message };

  return { success: true };
}
