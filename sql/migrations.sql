-- ============================================================
-- LOBBY Y2K — SUPABASE SQL MIGRATIONS
-- Run these in order in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. ENSURE TABLES EXIST (safe with IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  email       TEXT,
  full_name   TEXT,
  avatar_url  TEXT,
  is_admin    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  brand       TEXT NOT NULL,
  category    TEXT,
  base_price  NUMERIC(10,2) NOT NULL,
  sale_price  NUMERIC(10,2),
  is_featured BOOLEAN DEFAULT FALSE,
  is_active   BOOLEAN DEFAULT TRUE,
  rating      NUMERIC(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID REFERENCES public.products(id) ON DELETE CASCADE,
  size        TEXT NOT NULL,
  color       TEXT NOT NULL,
  color_hex   TEXT,
  sku         TEXT UNIQUE,
  stock       INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID REFERENCES public.products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt_text    TEXT,
  position    INT DEFAULT 0,
  is_primary  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.carts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active','checked_out','abandoned')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, status) -- only one active cart per user at a time (relaxed below)
);

-- Drop the unique constraint that's too strict; allow one active per user
ALTER TABLE public.carts DROP CONSTRAINT IF EXISTS carts_user_id_status_key;
CREATE UNIQUE INDEX IF NOT EXISTS carts_one_active_per_user
  ON public.carts(user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.cart_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id     UUID REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity    INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price       NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.addresses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  line1         TEXT NOT NULL,
  line2         TEXT,
  city          TEXT NOT NULL,
  state         TEXT,
  postal_code   TEXT NOT NULL,
  country       TEXT NOT NULL DEFAULT 'ZA',
  phone         TEXT,
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status          TEXT DEFAULT 'placed' CHECK (status IN ('placed','paid','fulfilled','cancelled','refunded')),
  subtotal        NUMERIC(10,2) NOT NULL,
  shipping        NUMERIC(10,2) DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL,
  shipping_address JSONB,
  billing_address  JSONB,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id  UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity    INT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  product_name TEXT,
  variant_info JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wishlists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES public.products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order   NUMERIC(10,2) DEFAULT 0,
  max_uses    INT,
  used_count  INT DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID REFERENCES public.products(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT,
  body        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_brand    ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_active   ON public.products(is_active)   WHERE is_active   = TRUE;
CREATE INDEX IF NOT EXISTS idx_variants_product  ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_images_product    ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_images_primary    ON public.product_images(product_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_cart_items_cart   ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_user       ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_user     ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user    ON public.wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product   ON public.reviews(product_id);

-- ============================================================
-- 4. TRIGGER: AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _username TEXT;
  _email    TEXT;
BEGIN
  -- Extract username from metadata (try both keys)
  _username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'user_name',
    split_part(NEW.email, '@', 1)
  );
  -- Normalize: trim + lowercase
  _username := lower(trim(_username));
  -- Remove non-alphanumeric characters except underscore/hyphen
  _username := regexp_replace(_username, '[^a-z0-9_\-]', '', 'g');
  -- Ensure minimum length
  IF length(_username) < 3 THEN
    _username := _username || substr(md5(NEW.id::text), 1, 6);
  END IF;
  -- Handle duplicates by appending random suffix
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = _username) LOOP
    _username := _username || substr(md5(random()::text), 1, 4);
  END LOOP;

  _email := NEW.email;

  INSERT INTO public.profiles (id, username, email, created_at, updated_at)
  VALUES (NEW.id, _username, _email, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. FUNCTION: GET OR CREATE ACTIVE CART
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_cart()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _cart_id UUID;
BEGIN
  SELECT id INTO _cart_id
  FROM public.carts
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF _cart_id IS NULL THEN
    INSERT INTO public.carts (user_id, status)
    VALUES (auth.uid(), 'active')
    RETURNING id INTO _cart_id;
  END IF;

  RETURN _cart_id;
END;
$$;

-- ============================================================
-- 6. FUNCTION: UPDATE PRODUCT RATING
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE public.products
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  ),
  review_count = (
    SELECT COUNT(*) FROM public.reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();

-- ============================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews          ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. RLS POLICIES — PROFILES
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"    ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    -- Block username changes
    username = (SELECT username FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- 9. RLS POLICIES — PRODUCTS (public read, admin write)
-- ============================================================
DROP POLICY IF EXISTS "products_public_read"  ON public.products;
DROP POLICY IF EXISTS "products_admin_write"  ON public.products;

CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "products_admin_write" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- 10. RLS — PRODUCT VARIANTS & IMAGES (public read)
-- ============================================================
DROP POLICY IF EXISTS "variants_public_read" ON public.product_variants;
DROP POLICY IF EXISTS "variants_admin_write" ON public.product_variants;
CREATE POLICY "variants_public_read" ON public.product_variants FOR SELECT USING (TRUE);
CREATE POLICY "variants_admin_write" ON public.product_variants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

DROP POLICY IF EXISTS "images_public_read" ON public.product_images;
DROP POLICY IF EXISTS "images_admin_write" ON public.product_images;
CREATE POLICY "images_public_read" ON public.product_images FOR SELECT USING (TRUE);
CREATE POLICY "images_admin_write" ON public.product_images FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- ============================================================
-- 11. RLS — CARTS (owner only)
-- ============================================================
DROP POLICY IF EXISTS "carts_owner"       ON public.carts;
DROP POLICY IF EXISTS "carts_admin"       ON public.carts;
CREATE POLICY "carts_owner" ON public.carts
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "carts_admin" ON public.carts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- 12. RLS — CART ITEMS (inherit from cart)
-- ============================================================
DROP POLICY IF EXISTS "cart_items_owner" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_admin" ON public.cart_items;
CREATE POLICY "cart_items_owner" ON public.cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE id = cart_items.cart_id AND user_id = auth.uid()
    )
  );
CREATE POLICY "cart_items_admin" ON public.cart_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- 13. RLS — ADDRESSES
-- ============================================================
DROP POLICY IF EXISTS "addresses_owner" ON public.addresses;
DROP POLICY IF EXISTS "addresses_admin" ON public.addresses;
CREATE POLICY "addresses_owner" ON public.addresses
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "addresses_admin" ON public.addresses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- 14. RLS — ORDERS
-- ============================================================
DROP POLICY IF EXISTS "orders_owner_select" ON public.orders;
DROP POLICY IF EXISTS "orders_owner_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_all"    ON public.orders;

CREATE POLICY "orders_owner_select" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_owner_insert" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Users CANNOT update orders (shipping/status admin-only)
CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- 15. RLS — ORDER ITEMS
-- ============================================================
DROP POLICY IF EXISTS "order_items_owner_select" ON public.order_items;
DROP POLICY IF EXISTS "order_items_owner_insert" ON public.order_items;
DROP POLICY IF EXISTS "order_items_admin_all"    ON public.order_items;

CREATE POLICY "order_items_owner_select" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid())
  );
CREATE POLICY "order_items_owner_insert" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid())
  );
CREATE POLICY "order_items_admin_all" ON public.order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- 16. RLS — MESSAGES (users read only their own; admins full control)
-- ============================================================
DROP POLICY IF EXISTS "messages_user_select"  ON public.messages;
DROP POLICY IF EXISTS "messages_admin_all"    ON public.messages;

CREATE POLICY "messages_user_select" ON public.messages
  FOR SELECT USING (auth.uid() = user_id);
-- Users CANNOT insert/update/delete messages
CREATE POLICY "messages_admin_all" ON public.messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- 17. RLS — WISHLISTS
-- ============================================================
DROP POLICY IF EXISTS "wishlists_owner" ON public.wishlists;
CREATE POLICY "wishlists_owner" ON public.wishlists
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 18. RLS — COUPONS (public read active ones; admin full)
-- ============================================================
DROP POLICY IF EXISTS "coupons_public_read" ON public.coupons;
DROP POLICY IF EXISTS "coupons_admin_all"   ON public.coupons;
CREATE POLICY "coupons_public_read" ON public.coupons
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "coupons_admin_all" ON public.coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- 19. RLS — REVIEWS
-- ============================================================
DROP POLICY IF EXISTS "reviews_public_read"  ON public.reviews;
DROP POLICY IF EXISTS "reviews_owner_write"  ON public.reviews;
DROP POLICY IF EXISTS "reviews_admin_all"    ON public.reviews;
CREATE POLICY "reviews_public_read" ON public.reviews  FOR SELECT USING (TRUE);
CREATE POLICY "reviews_owner_write" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_owner_delete" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "reviews_admin_all" ON public.reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- 20. SEED DATA — SAMPLE PRODUCTS
-- ============================================================
INSERT INTO public.products (name, description, brand, category, base_price, sale_price, is_featured, rating, review_count) VALUES
  ('Air Force 1 Low ''07', 'The radiance lives on in the Nike Air Force 1 ''07, the basketball original that puts a fresh spin on what you know best.', 'Nike', 'Low Top', 1499.00, NULL, TRUE, 4.8, 2341),
  ('Air Max 90', 'Nothing as fly, nothing as comfortable, nothing as proven. The Nike Air Max 90 stays true to its OG running roots.', 'Nike', 'Lifestyle', 1899.00, 1699.00, TRUE, 4.7, 1892),
  ('Dunk Low Retro', 'Created for the hardwood but taken to the streets, the '85 Dunk has become a true icon.', 'Nike', 'Low Top', 2199.00, NULL, TRUE, 4.9, 3102),
  ('Jordan 1 Retro High OG', 'Inspired by the first colorway Michael Jordan wore on an NBA court, this mid-top features classic details.', 'Jordan', 'High Top', 2799.00, NULL, TRUE, 4.9, 5621),
  ('Jordan 4 Retro', 'The Air Jordan 4 returns in familiar style with premium materials and visible Air cushioning.', 'Jordan', 'High Top', 3299.00, 2999.00, TRUE, 4.8, 4201),
  ('Forum Low', 'Born on the basketball court in 1984, the adidas Forum Low comes back with a premium leather upper.', 'Adidas', 'Low Top', 1699.00, NULL, FALSE, 4.6, 987),
  ('Samba OG', 'Born in Germany in 1950, the Samba was designed for icy indoor surfaces.', 'Adidas', 'Low Top', 1599.00, 1399.00, TRUE, 4.8, 2890),
  ('Stan Smith', 'First introduced in the 1970s as a tennis shoe, the Stan Smith has become a streetwear icon.', 'Adidas', 'Low Top', 1299.00, NULL, FALSE, 4.5, 1543),
  ('Suede Classic XXI', 'The Puma Suede first hit the scene in 1968 and has been changing the game ever since.', 'Puma', 'Low Top', 999.00, 899.00, FALSE, 4.4, 756),
  ('RS-X3', 'The RS-X3 takes the RS line to the next level with an even thicker sole and bolder design.', 'Puma', 'Lifestyle', 1399.00, NULL, FALSE, 4.3, 432),
  ('990v6', 'The Made in USA 990v6 continues New Balance''s legacy of premium craftsmanship.', 'New Balance', 'Running', 2999.00, NULL, TRUE, 4.9, 1234),
  ('574 Core', 'The 574 is a classic New Balance silhouette, updated with modern materials and styling.', 'New Balance', 'Lifestyle', 1799.00, 1599.00, FALSE, 4.6, 867),
  ('Chuck Taylor All Star', 'The Converse Chuck Taylor All Star is the world''s most iconic sneaker.', 'Converse', 'High Top', 899.00, NULL, FALSE, 4.7, 8901),
  ('Run Star Hike', 'The Run Star Hike takes the All Star to new heights with an exaggerated platform sole.', 'Converse', 'High Top', 1299.00, NULL, FALSE, 4.5, 543),
  ('Old Skool', 'The Vans Old Skool is a classic skate shoe with the iconic side stripe.', 'Vans', 'Low Top', 899.00, 799.00, FALSE, 4.6, 2134),
  ('Authentic', 'The Vans Authentic is the original Vans shoe, introduced in 1966.', 'Vans', 'Low Top', 799.00, NULL, FALSE, 4.5, 1678)
ON CONFLICT DO NOTHING;

-- Add sample images using placeholder images
DO $$
DECLARE
  p RECORD;
  img_urls TEXT[];
  img_url TEXT;
  i INT;
BEGIN
  -- Curated Unsplash sneaker images
  img_urls := ARRAY[
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800',
    'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800',
    'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800',
    'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=800',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800',
    'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800',
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800',
    'https://images.unsplash.com/photo-1584735175315-9d5df23be1e1?w=800',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800',
    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800',
    'https://images.unsplash.com/photo-1562183241-b937e415fd70?w=800',
    'https://images.unsplash.com/photo-1574492843804-e6af2e20d079?w=800',
    'https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=800',
    'https://images.unsplash.com/photo-1465453869711-7e174808ace9?w=800'
  ];

  i := 1;
  FOR p IN SELECT id FROM public.products ORDER BY created_at LOOP
    img_url := img_urls[i];
    INSERT INTO public.product_images (product_id, url, alt_text, position, is_primary)
    VALUES (p.id, img_url, 'Product image', 0, TRUE)
    ON CONFLICT DO NOTHING;
    -- Add a second angle
    INSERT INTO public.product_images (product_id, url, alt_text, position, is_primary)
    VALUES (p.id, img_url || '&fit=crop&crop=center', 'Product side view', 1, FALSE)
    ON CONFLICT DO NOTHING;
    i := i + 1;
    IF i > array_length(img_urls, 1) THEN i := 1; END IF;
  END LOOP;
END $$;

-- Add variants for each product
DO $$
DECLARE
  p RECORD;
  sizes TEXT[] := ARRAY['6','6.5','7','7.5','8','8.5','9','9.5','10','10.5','11','11.5','12'];
  colors TEXT[][] := ARRAY[
    ARRAY['White/Black', '#FFFFFF'],
    ARRAY['Triple Black', '#1A1A1A'],
    ARRAY['University Red', '#CC0000'],
    ARRAY['Royal Blue', '#0044CC'],
    ARRAY['Pine Green', '#2D6A4F']
  ];
  s TEXT;
  c TEXT[];
BEGIN
  FOR p IN SELECT id FROM public.products LOOP
    FOREACH s IN ARRAY sizes LOOP
      FOREACH c SLICE 1 IN ARRAY colors LOOP
        INSERT INTO public.product_variants (product_id, size, color, color_hex, sku, stock)
        VALUES (
          p.id,
          s,
          c[1],
          c[2],
          substr(md5(p.id::text || s || c[1]), 1, 12),
          floor(random() * 50)::int
        ) ON CONFLICT (sku) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- DONE
-- ============================================================
SELECT 'Migrations complete. ' || count(*) || ' products seeded.' AS result
FROM public.products;
