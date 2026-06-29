// js/services/wishlist.js
// ============================================================
// LOBBY Y2K — WISHLIST SERVICE
// ============================================================
import { supabase } from '../supabase.js';

export const WishlistService = {

  async getWishlist() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('wishlists')
      .select(`
        id, created_at,
        products:product_id(
          id, name, brand, base_price, sale_price, rating, review_count,
          product_images(url, is_primary)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addToWishlist(productId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('wishlists')
      .upsert({ user_id: user.id, product_id: productId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeFromWishlist(productId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) throw error;
  },

  async isWishlisted(productId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .single();

    return !!data;
  },

  async toggleWishlist(productId) {
    const wishlisted = await this.isWishlisted(productId);
    if (wishlisted) {
      await this.removeFromWishlist(productId);
      return false;
    } else {
      await this.addToWishlist(productId);
      return true;
    }
  },
};

// ============================================================
// MESSAGES SERVICE
// ============================================================
export const MessagesService = {

  async getMyMessages() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        orders:order_id(id, status, total)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async markRead(messageId) {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);

    if (error) throw error;
  },

  async getUnreadCount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return count || 0;
  },

  // Admin methods
  async getAllMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:user_id(username, email),
        orders:order_id(id, status, total)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async sendMessage({ userId, orderId, subject, body }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        order_id: orderId || null,
        subject,
        body,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMessage(id) {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// PROFILE SERVICE
// ============================================================
export const ProfileService = {

  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile({ full_name, avatar_url }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name, avatar_url, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async uploadAvatar(file) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const ext = file.name.split('.').pop();
    const path = `avatars/${user.id}.${ext}`;

    await supabase.storage.from('avatars').upload(path, file, { upsert: true });

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

    await this.updateProfile({ avatar_url: publicUrl });
    return publicUrl;
  },

  async getAllCustomers({ page = 1, limit = 20, search } = {}) {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('is_admin', false);

    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw error;
    return { customers: data || [], total: count || 0 };
  },
};

export default WishlistService;
