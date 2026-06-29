// js/supabase.js
// ============================================================
// LOBBY Y2K — SUPABASE CLIENT
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = window.__ENV?.SUPABASE_URL || 'https://oninrwdiqrtemoeuajns.supabase.co';
const SUPABASE_ANON_KEY = window.__ENV?.SUPABASE_ANON_KEY || 'sb_publishable_SOnAzD0JZouJGRQ_TOgcIA_yKHMHlId';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Helper: get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Helper: get current profile
export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return data;
}

// Helper: is admin
export async function isAdmin() {
  const profile = await getCurrentProfile();
  return profile?.is_admin === true;
}

export default supabase;
