// js/services/auth.js
// ============================================================
// LOBBY Y2K — AUTHENTICATION SERVICE
// ============================================================
import { supabase } from '../supabase.js';

export const AuthService = {

  /**
   * Sign up with email, password, and username
   */
  async signUp({ email, password, username }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username.toLowerCase().trim() },
      },
    });
    if (error) throw error;
    return data;
  },

  /**
   * Sign in with email and password
   */
  async signIn({ email, password, rememberMe = false }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Sign out
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = '/';
  },

  /**
   * Send password reset email
   */
  async forgotPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/pages/reset-password.html`,
    });
    if (error) throw error;
  },

  /**
   * Update password (after reset)
   */
  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  /**
   * Get current session
   */
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  /**
   * Get current user
   */
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },

  /**
   * Require authentication — redirect to login if not logged in
   */
  async requireAuth(redirectUrl) {
    const user = await this.getUser();
    if (!user) {
      const redirect = redirectUrl || window.location.href;
      window.location.href = `/pages/login.html?redirect=${encodeURIComponent(redirect)}`;
      return null;
    }
    return user;
  },

  /**
   * Check if user is admin
   */
  async checkAdmin() {
    const user = await this.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    return data?.is_admin === true;
  },
};

export default AuthService;
