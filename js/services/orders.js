// js/services/orders.js
// ============================================================
// LOBBY Y2K — ORDERS SERVICE
// ============================================================
import { supabase } from '../supabase.js';
import CartService from './cart.js';

export const OrdersService = {

  /**
   * Create an order from current cart
   */
  async createOrder({ shippingAddress, billingAddress, cartId, items, subtotal }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'placed',
        subtotal,
        shipping: 0, // Admin sets shipping
        total: subtotal,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      price: item.price,
      product_name: item.products?.name,
      variant_info: {
        size: item.product_variants?.size,
        color: item.product_variants?.color,
        sku: item.product_variants?.sku,
      },
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Mark cart as checked out
    if (cartId) await CartService.checkoutCart(cartId);

    return order;
  },

  /**
   * Get user's orders
   */
  async getMyOrders() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          id, quantity, price, product_name, variant_info,
          products:product_id(name, brand),
          product_images:product_id(url, is_primary)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get single order
   */
  async getOrder(orderId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          id, quantity, price, product_name, variant_info,
          products:product_id(id, name, brand),
          product_images:product_id(url, is_primary)
        )
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  },

  // ============================================================
  // ADMIN METHODS
  // ============================================================

  /**
   * Get all orders (admin)
   */
  async getAllOrders({ page = 1, limit = 20, status, search } = {}) {
    let query = supabase
      .from('orders')
      .select(`
        *,
        profiles:user_id(username, email)
      `, { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('id', `%${search}%`);

    const from = (page - 1) * limit;
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw error;
    return { orders: data || [], total: count || 0 };
  },

  /**
   * Update order status (admin only)
   */
  async updateOrderStatus(orderId, status) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update shipping cost (admin only)
   */
  async updateShipping(orderId, shipping) {
    const { data: order } = await supabase
      .from('orders')
      .select('subtotal')
      .eq('id', orderId)
      .single();

    const { data, error } = await supabase
      .from('orders')
      .update({
        shipping,
        total: (order?.subtotal || 0) + shipping,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get dashboard stats (admin)
   */
  async getStats() {
    const [ordersRes, customersRes, productsRes, revenueRes] = await Promise.all([
      supabase.from('orders').select('id, status, total', { count: 'exact' }),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('is_admin', false),
      supabase.from('products').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('orders').select('total').eq('status', 'paid'),
    ]);

    const revenue = (revenueRes.data || []).reduce((sum, o) => sum + (o.total || 0), 0);
    const ordersByStatus = (ordersRes.data || []).reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalOrders: ordersRes.count || 0,
      totalCustomers: customersRes.count || 0,
      totalProducts: productsRes.count || 0,
      totalRevenue: revenue,
      ordersByStatus,
    };
  },
};

export default OrdersService;
