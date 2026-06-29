// js/services/cart.js
// ============================================================
// LOBBY Y2K — CART SERVICE
// ============================================================
import { supabase } from '../supabase.js';

export const CartService = {

  /**
   * Get or create an active cart for the current user.
   * Uses the database function to ensure atomicity.
   */
  async getOrCreateCart() {
    const { data, error } = await supabase.rpc('get_or_create_cart');
    if (error) throw error;
    return data; // returns cart UUID
  },

  /**
   * Get cart with items and product details
   */
  async getCart() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('id, status, created_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (cartError && cartError.code !== 'PGRST116') throw cartError;
    if (!cart) return { cart: null, items: [], total: 0 };

    const { data: items, error: itemsError } = await supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        price,
        product_id,
        variant_id,
        products:product_id(id, name, brand, base_price, sale_price),
        product_variants:variant_id(id, size, color, color_hex, sku, stock),
        product_images:product_id(url, is_primary)
      `)
      .eq('cart_id', cart.id);

    if (itemsError) throw itemsError;

    const enriched = (items || []).map(item => ({
      ...item,
      image: item.product_images?.find(img => img.is_primary)?.url || item.product_images?.[0]?.url,
    }));

    const total = enriched.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const count = enriched.reduce((sum, item) => sum + item.quantity, 0);

    return { cart, items: enriched, total, count };
  },

  /**
   * Add item to cart
   */
  async addItem({ productId, variantId, quantity = 1, price }) {
    const cartId = await this.getOrCreateCart();

    // Check if item already exists
    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .eq('variant_id', variantId)
      .single();

    if (existing) {
      return this.updateQuantity(existing.id, existing.quantity + quantity);
    }

    const { data, error } = await supabase
      .from('cart_items')
      .insert({
        cart_id: cartId,
        product_id: productId,
        variant_id: variantId,
        quantity,
        price,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update item quantity
   */
  async updateQuantity(itemId, quantity) {
    if (quantity <= 0) return this.removeItem(itemId);

    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Remove item from cart
   */
  async removeItem(itemId) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },

  /**
   * Clear entire cart
   */
  async clearCart() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!cart) return;

    await supabase.from('cart_items').delete().eq('cart_id', cart.id);
  },

  /**
   * Mark cart as checked out
   */
  async checkoutCart(cartId) {
    const { error } = await supabase
      .from('carts')
      .update({ status: 'checked_out', updated_at: new Date().toISOString() })
      .eq('id', cartId);

    if (error) throw error;
  },

  /**
   * Get item count badge number
   */
  async getItemCount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!cart) return 0;

    const { data } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('cart_id', cart.id);

    return (data || []).reduce((sum, item) => sum + item.quantity, 0);
  },
};

export default CartService;
