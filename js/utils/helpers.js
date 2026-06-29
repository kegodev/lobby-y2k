// js/utils/helpers.js
// ============================================================
// LOBBY Y2K — UTILITY HELPERS
// ============================================================

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function toast(message, type = 'info', duration = 3000) {
  const container = getToastContainer();
  const el = document.createElement('div');

  const colors = {
    success: 'var(--accent)',
    error: '#ff4757',
    warning: '#ffa502',
    info: 'var(--violet)',
  };

  el.style.cssText = `
    background: var(--glass-bg, rgba(20,20,20,0.95));
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid ${colors[type] || colors.info};
    color: var(--text-primary, #fff);
    padding: 14px 20px;
    border-radius: 14px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    max-width: 320px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    pointer-events: all;
    transform: translateX(120%);
    transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s;
    opacity: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  `;

  const icons = { success: '✓', error: '✕', warning: '⚠', info: '●' };
  el.innerHTML = `
    <span style="color:${colors[type]};font-weight:700;font-size:16px;">${icons[type] || '●'}</span>
    <span>${message}</span>
  `;

  container.appendChild(el);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transform = 'translateX(0)';
      el.style.opacity = '1';
    });
  });

  setTimeout(() => {
    el.style.transform = 'translateX(120%)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ============================================================
// FORMATTING
// ============================================================
export function formatPrice(price, currency = 'ZAR') {
  if (price == null) return 'R0.00';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr));
}

export function timeAgo(dateStr) {
  const now = Date.now();
  const past = new Date(dateStr).getTime();
  const diff = now - past;
  const minute = 60 * 1000;
  const hour   = 60 * minute;
  const day    = 24 * hour;
  const week   = 7 * day;
  const month  = 30 * day;

  if (diff < minute)  return 'just now';
  if (diff < hour)    return `${Math.floor(diff / minute)}m ago`;
  if (diff < day)     return `${Math.floor(diff / hour)}h ago`;
  if (diff < week)    return `${Math.floor(diff / day)}d ago`;
  if (diff < month)   return `${Math.floor(diff / week)}w ago`;
  return formatDate(dateStr);
}

// ============================================================
// PRODUCT HELPERS
// ============================================================
export function getPrimaryImage(product) {
  if (!product?.product_images?.length) {
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400';
  }
  const primary = product.product_images.find(img => img.is_primary);
  return primary?.url || product.product_images[0]?.url;
}

export function getEffectivePrice(product) {
  return product?.sale_price || product?.base_price || 0;
}

export function getDiscountPercent(product) {
  if (!product?.sale_price || !product?.base_price) return 0;
  return Math.round((1 - product.sale_price / product.base_price) * 100);
}

export function renderStars(rating) {
  const full  = Math.floor(rating || 0);
  const half  = (rating || 0) % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

// ============================================================
// PRODUCT CARD HTML
// ============================================================
export function productCardHTML(product) {
  const img   = getPrimaryImage(product);
  const price = getEffectivePrice(product);
  const disc  = getDiscountPercent(product);
  const stars = renderStars(product.rating);

  return `
    <article class="product-card" data-product-id="${product.id}" onclick="window.location.href='/pages/product.html?id=${product.id}'">
      <div class="product-card__image-wrap">
        <img
          class="product-card__image"
          src="${img}"
          alt="${product.name}"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'"
        />
        ${disc > 0 ? `<span class="badge badge--sale">-${disc}%</span>` : ''}
        <button
          class="wishlist-btn"
          aria-label="Add to wishlist"
          onclick="event.stopPropagation(); toggleWishlist('${product.id}', this)"
        >♡</button>
      </div>
      <div class="product-card__info">
        <span class="product-card__brand">${product.brand}</span>
        <h3 class="product-card__name">${product.name}</h3>
        <div class="product-card__meta">
          <div class="product-card__rating">
            <span class="stars">${stars}</span>
            <span class="review-count">(${(product.review_count || 0).toLocaleString()})</span>
          </div>
          <div class="product-card__price">
            ${disc > 0 ? `<s class="original">${formatPrice(product.base_price)}</s>` : ''}
            <span class="current">${formatPrice(price)}</span>
          </div>
        </div>
      </div>
    </article>
  `;
}

// ============================================================
// SKELETON LOADER
// ============================================================
export function skeletonCardHTML() {
  return `
    <div class="skeleton-card">
      <div class="skeleton skeleton--image"></div>
      <div class="skeleton-card__info">
        <div class="skeleton skeleton--text skeleton--short"></div>
        <div class="skeleton skeleton--text"></div>
        <div class="skeleton skeleton--text skeleton--med"></div>
      </div>
    </div>
  `;
}

export function showSkeletons(container, count = 8) {
  container.innerHTML = Array(count).fill(skeletonCardHTML()).join('');
}

// ============================================================
// NAVIGATION HELPERS
// ============================================================
export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function navigate(url) {
  window.location.href = url;
}

// ============================================================
// DARK MODE
// ============================================================
export function initTheme() {
  const stored = localStorage.getItem('lobby-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', stored);
  return stored;
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('lobby-theme', next);
  return next;
}

// ============================================================
// CART BADGE
// ============================================================
export async function updateCartBadge() {
  try {
    const CartService = (await import('../services/cart.js')).default;
    const count = await CartService.getItemCount();
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  } catch (_) {}
}

// ============================================================
// WISHLIST TOGGLE (global handler)
// ============================================================
window.toggleWishlist = async function(productId, btn) {
  const { data: { user } } = await (await import('../supabase.js')).supabase.auth.getUser();
  if (!user) {
    toast('Sign in to save to wishlist', 'info');
    return;
  }
  try {
    const WishlistService = (await import('../services/misc.js')).WishlistService;
    const added = await WishlistService.toggleWishlist(productId);
    btn.textContent = added ? '♥' : '♡';
    btn.classList.toggle('active', added);
    toast(added ? 'Added to wishlist' : 'Removed from wishlist', added ? 'success' : 'info');
  } catch (e) {
    toast('Failed to update wishlist', 'error');
  }
};

// ============================================================
// DEBOUNCE
// ============================================================
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ============================================================
// STATUS BADGE
// ============================================================
export function statusBadgeHTML(status) {
  const map = {
    placed:    ['⏳', '#f59e0b', 'Placed'],
    paid:      ['💳', '#10b981', 'Paid'],
    fulfilled: ['📦', '#6366f1', 'Fulfilled'],
    cancelled: ['✕',  '#ef4444', 'Cancelled'],
    refunded:  ['↩',  '#8b5cf6', 'Refunded'],
  };
  const [icon, color, label] = map[status] || ['?', '#888', status];
  return `<span class="status-badge" style="--status-color:${color}">${icon} ${label}</span>`;
}
