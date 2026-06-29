// js/services/products.js
// ============================================================
// LOBBY Y2K — PRODUCTS SERVICE
// ============================================================
import { supabase } from '../supabase.js';

export const ProductsService = {

  /**
   * Get featured products
   */
  async getFeatured(limit = 8) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images!inner(url, alt_text, is_primary),
        product_variants(size, color, color_hex, stock)
      `)
      .eq('is_featured', true)
      .eq('is_active', true)
      .eq('product_images.is_primary', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  /**
   * Get newest arrivals
   */
  async getNewest(limit = 12) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(url, alt_text, is_primary)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  /**
   * Get products with filters, sorting, and pagination
   */
  async getProducts({
    brand,
    category,
    search,
    minPrice,
    maxPrice,
    sortBy = 'created_at',
    sortDir = 'desc',
    page = 1,
    limit = 12,
  } = {}) {
    let query = supabase
      .from('products')
      .select(`
        *,
        product_images(url, alt_text, is_primary)
      `, { count: 'exact' })
      .eq('is_active', true);

    if (brand)    query = query.eq('brand', brand);
    if (category) query = query.eq('category', category);
    if (search)   query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%`);
    if (minPrice) query = query.gte('base_price', minPrice);
    if (maxPrice) query = query.lte('base_price', maxPrice);

    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    const { data, error, count } = await query
      .order(sortBy, { ascending: sortDir === 'asc' })
      .range(from, to);

    if (error) throw error;
    return { products: data || [], total: count || 0, page, limit };
  },

  /**
   * Get single product with full details
   */
  async getProduct(id) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(id, url, alt_text, position, is_primary),
        product_variants(id, size, color, color_hex, sku, stock)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Get reviews for a product
   */
  async getReviews(productId) {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles(username, avatar_url)
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /**
   * Add a review
   */
  async addReview({ productId, rating, title, body }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Must be logged in to review');

    const { data, error } = await supabase
      .from('reviews')
      .upsert({
        product_id: productId,
        user_id: user.id,
        rating,
        title,
        body,
      });
    if (error) throw error;
    return data;
  },

  /**
   * Get available brands
   */
  async getBrands() {
    const { data, error } = await supabase
      .from('products')
      .select('brand')
      .eq('is_active', true);
    if (error) throw error;
    const brands = [...new Set((data || []).map(p => p.brand))].sort();
    return brands;
  },

  /**
   * Get available categories
   */
  async getCategories() {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('is_active', true);
    if (error) throw error;
    const cats = [...new Set((data || []).map(p => p.category).filter(Boolean))].sort();
    return cats;
  },

  /**
   * Get related products (same brand or category)
   */
  async getRelated(product, limit = 4) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(url, alt_text, is_primary)
      `)
      .eq('is_active', true)
      .eq('brand', product.brand)
      .neq('id', product.id)
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  // ============================================================
  // ADMIN METHODS
  // ============================================================

  async createProduct(productData) {
    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProduct(id, updates) {
    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteProduct(id) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  },

  async uploadProductImage(productId, file) {
    const ext  = file.name.split('.').pop();
    const path = `products/${productId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(path);

    const { data, error } = await supabase
      .from('product_images')
      .insert({ product_id: productId, url: publicUrl, position: 0, is_primary: false })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addVariant(productId, variantData) {
    const { data, error } = await supabase
      .from('product_variants')
      .insert({ product_id: productId, ...variantData })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateVariant(id, updates) {
    const { data, error } = await supabase
      .from('product_variants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAllProductsAdmin({ page = 1, limit = 20, search } = {}) {
    let query = supabase
      .from('products')
      .select('*, product_images(url, is_primary)', { count: 'exact' });

    if (search) query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);

    const from = (page - 1) * limit;
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw error;
    return { products: data || [], total: count || 0 };
  },
};

export default ProductsService;
