-- ==============================================================================
-- MenuQR - Production PostgreSQL Schema & Row Level Security (RLS) for Supabase
-- ==============================================================================
-- Multi-Tenant Digital Restaurant Menu, Table Ordering & Realtime Kitchen System
-- Supports Supabase Auth, PostgreSQL RLS, Storage Buckets & Realtime Subscriptions
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE DEFINITIONS

-- 2.1 RESTAURANTS
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    cover_url TEXT,
    description TEXT,
    currency VARCHAR(10) DEFAULT 'DZD' NOT NULL,
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    address TEXT,
    google_maps_url TEXT,
    opening_hours VARCHAR(100) DEFAULT '11:30 - 23:30',
    theme_color VARCHAR(20) DEFAULT '#FF5A1F',
    facebook_url TEXT CHECK (facebook_url IS NULL OR facebook_url ~* '^https?://'),
    instagram_url TEXT CHECK (instagram_url IS NULL OR instagram_url ~* '^https?://'),
    tiktok_url TEXT CHECK (tiktok_url IS NULL OR tiktok_url ~* '^https?://'),
    youtube_url TEXT CHECK (youtube_url IS NULL OR youtube_url ~* '^https?://'),
    snapchat_url TEXT CHECK (snapchat_url IS NULL OR snapchat_url ~* '^https?://'),
    x_url TEXT CHECK (x_url IS NULL OR x_url ~* '^https?://'),
    telegram_url TEXT CHECK (telegram_url IS NULL OR telegram_url ~* '^https?://'),
    website_url TEXT CHECK (website_url IS NULL OR website_url ~* '^https?://'),
    public_base_url TEXT CHECK (public_base_url IS NULL OR public_base_url ~* '^https://'),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2.2 PROFILES (Links Supabase auth.users to a specific restaurant and role)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'staff')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2.3 CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    name_ar VARCHAR(150) NOT NULL,
    name_fr VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    image_url TEXT,
    sort_order INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2.4 PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    name_fr VARCHAR(200) NOT NULL,
    name_en VARCHAR(200) NOT NULL,
    description_ar TEXT,
    description_fr TEXT,
    description_en TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    available BOOLEAN DEFAULT TRUE NOT NULL,
    popular BOOLEAN DEFAULT FALSE NOT NULL,
    new BOOLEAN DEFAULT FALSE NOT NULL,
    spicy BOOLEAN DEFAULT FALSE NOT NULL,
    vegetarian BOOLEAN DEFAULT FALSE NOT NULL,
    sort_order INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2.5 TABLES (Physical or designated dining tables)
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    table_number INT NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_restaurant_table_number UNIQUE (restaurant_id, table_number)
);

-- 2.6 ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    table_number INT NOT NULL,
    order_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'received' CHECK (status IN ('received', 'preparing', 'ready', 'served', 'cancelled')) NOT NULL,
    customer_note TEXT,
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2.7 ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    selected_size VARCHAR(100),
    extras TEXT,
    note TEXT,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0)
);

-- 2.8 OFFERS & PROMOTIONS
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    title_ar VARCHAR(200) NOT NULL,
    title_fr VARCHAR(200) NOT NULL,
    title_en VARCHAR(200) NOT NULL,
    description_ar TEXT,
    description_fr TEXT,
    description_en TEXT,
    image_url TEXT,
    price NUMERIC(10, 2),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2.9 WAITER REQUESTS
CREATE TABLE IF NOT EXISTS public.waiter_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    table_number INT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('waiter_call', 'bill_request')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ
);

-- ==============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_restaurant_id ON public.profiles(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id ON public.categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_products_restaurant_id ON public.products(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON public.tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_offers_restaurant_id ON public.offers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_waiter_requests_restaurant_id ON public.waiter_requests(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_waiter_requests_status ON public.waiter_requests(status);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_requests ENABLE ROW LEVEL SECURITY;

-- Helper functions:
-- 1. Get the restaurant_id for the current authenticated user (filtering by user_id = auth.uid())
CREATE OR REPLACE FUNCTION public.get_auth_restaurant_id()
RETURNS UUID AS $$
  SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

-- 2. Get the role ('admin' | 'staff') for the current authenticated user (filtering by user_id = auth.uid())
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS VARCHAR AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

-- 4.1 RESTAURANTS POLICIES
-- Anyone (customers) can read restaurant public info
DROP POLICY IF EXISTS "Public can view restaurants" ON public.restaurants;
CREATE POLICY "Public can view restaurants"
ON public.restaurants FOR SELECT
USING (true);

-- Only authenticated ADMINs can update their own restaurant
DROP POLICY IF EXISTS "Admins can update their restaurant" ON public.restaurants;
CREATE POLICY "Admins can update their restaurant"
ON public.restaurants FOR UPDATE
TO authenticated
USING (id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin')
WITH CHECK (id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin');

-- 4.2 PROFILES POLICIES (STRICT: NO USER CAN INSERT OR ESCALATE ROLE/RESTAURANT)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Allow user to view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only update their full name" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Authenticated users can ONLY view their own profile (strictly user_id = auth.uid())
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can ONLY update their full_name. NEVER their role or restaurant_id.
CREATE POLICY "Users can only update their full name"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
  AND restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- 4.3 CATEGORIES POLICIES
-- Public can view categories
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
ON public.categories FOR SELECT
USING (true);

-- Admin can manage categories of their own restaurant
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
ON public.categories FOR UPDATE
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin')
WITH CHECK (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin');

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories"
ON public.categories FOR DELETE
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin');

-- 4.4 PRODUCTS / DISHES POLICIES
-- Anonymous customers can ONLY view available products
DROP POLICY IF EXISTS "Anonymous can view available products" ON public.products;
CREATE POLICY "Anonymous can view available products"
ON public.products FOR SELECT
TO anon
USING (available = true);

-- Staff and Admins can view all products of their restaurant
DROP POLICY IF EXISTS "Staff and Admins can view restaurant products" ON public.products;
CREATE POLICY "Staff and Admins can view restaurant products"
ON public.products FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() IN ('admin', 'staff')
);

-- Admin can insert products
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin');

-- Admins can update products/dishes
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Staff and Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
ON public.products FOR UPDATE
TO authenticated
USING (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() = 'admin'
)
WITH CHECK (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() = 'admin'
);

-- Admin can delete products
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin');

-- 4.5 TABLES POLICIES
-- Anonymous customers can ONLY view active tables
DROP POLICY IF EXISTS "Anonymous can view active tables" ON public.tables;
CREATE POLICY "Anonymous can view active tables"
ON public.tables FOR SELECT
TO anon
USING (active = true);

-- Staff and Admins can view all tables of their restaurant
DROP POLICY IF EXISTS "Staff and Admins can view restaurant tables" ON public.tables;
CREATE POLICY "Staff and Admins can view restaurant tables"
ON public.tables FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() IN ('admin', 'staff')
);

-- Only Admins can insert tables
DROP POLICY IF EXISTS "Admins can insert tables" ON public.tables;
CREATE POLICY "Admins can insert tables"
ON public.tables FOR INSERT
TO authenticated
WITH CHECK (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin');

-- Only Admins can update tables
DROP POLICY IF EXISTS "Admins can update tables" ON public.tables;
DROP POLICY IF EXISTS "Staff and Admins can update tables" ON public.tables;
CREATE POLICY "Admins can update tables"
ON public.tables FOR UPDATE
TO authenticated
USING (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() = 'admin'
)
WITH CHECK (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() = 'admin'
);

-- Only Admins can delete tables
DROP POLICY IF EXISTS "Admins can delete tables" ON public.tables;
CREATE POLICY "Admins can delete tables"
ON public.tables FOR DELETE
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin');

-- 4.6 ORDERS POLICIES
-- Anonymous users have NO direct insert, select, update or delete.
-- Admins and staff of a restaurant can select, update and delete rows of their own restaurant only.
DROP POLICY IF EXISTS "Customers can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can view order status" ON public.orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous order creation" ON public.orders;
DROP POLICY IF EXISTS "Staff and Admins can view restaurant orders" ON public.orders;
DROP POLICY IF EXISTS "Staff and Admins can update restaurant orders" ON public.orders;
DROP POLICY IF EXISTS "Staff and Admins can delete restaurant orders" ON public.orders;

CREATE POLICY "Staff and Admins can view restaurant orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() IN ('admin', 'staff')
);

CREATE POLICY "Staff and Admins can update restaurant orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() IN ('admin', 'staff')
)
WITH CHECK (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() IN ('admin', 'staff')
);

CREATE POLICY "Staff and Admins can delete restaurant orders"
ON public.orders FOR DELETE
TO authenticated
USING (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() IN ('admin', 'staff')
);

-- 4.7 ORDER ITEMS POLICIES
-- Anonymous users have NO direct insert, select, update or delete.
-- Admins and staff can select, update and delete order items of their own restaurant.
DROP POLICY IF EXISTS "Customers can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Customers can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff and Admins can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff and Admins can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff and Admins can delete order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff and Admins can manage order items" ON public.order_items;

CREATE POLICY "Staff and Admins can view order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.restaurant_id = public.get_auth_restaurant_id()
      AND public.get_auth_role() IN ('admin', 'staff')
  )
);

CREATE POLICY "Staff and Admins can update order items"
ON public.order_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.restaurant_id = public.get_auth_restaurant_id()
      AND public.get_auth_role() IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.restaurant_id = public.get_auth_restaurant_id()
      AND public.get_auth_role() IN ('admin', 'staff')
  )
);

CREATE POLICY "Staff and Admins can delete order items"
ON public.order_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.restaurant_id = public.get_auth_restaurant_id()
      AND public.get_auth_role() IN ('admin', 'staff')
  )
);

-- 4.8 OFFERS POLICIES
-- Public can view active and valid offers
CREATE POLICY "Public can view valid active offers"
ON public.offers FOR SELECT
TO anon, authenticated
USING (
  COALESCE(is_active, active, true) = true
  AND (start_date IS NULL OR start_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Algiers')::date)
  AND (end_date IS NULL OR end_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Algiers')::date)
);

-- Staff and Admins can manage offers
CREATE POLICY "Staff and Admins can manage restaurant offers"
ON public.offers FOR ALL
TO authenticated
USING (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() IN ('admin', 'staff')
)
WITH CHECK (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() IN ('admin', 'staff')
);

-- 4.9 WAITER REQUESTS POLICIES
-- Anonymous users have NO direct insert, select, update or delete.
-- Admins and staff can view, update and delete waiter requests for their restaurant.
DROP POLICY IF EXISTS "Customers can create waiter requests" ON public.waiter_requests;
DROP POLICY IF EXISTS "Customers can view waiter requests" ON public.waiter_requests;
DROP POLICY IF EXISTS "Public can insert waiter requests" ON public.waiter_requests;
DROP POLICY IF EXISTS "Staff and Admins can manage waiter requests" ON public.waiter_requests;
DROP POLICY IF EXISTS "Staff and Admins can view waiter requests" ON public.waiter_requests;
DROP POLICY IF EXISTS "Staff and Admins can update waiter requests" ON public.waiter_requests;
DROP POLICY IF EXISTS "Staff and Admins can delete waiter requests" ON public.waiter_requests;

CREATE POLICY "Staff and Admins can view waiter requests"
ON public.waiter_requests FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() IN ('admin', 'staff')
);

CREATE POLICY "Staff and Admins can update waiter requests"
ON public.waiter_requests FOR UPDATE
TO authenticated
USING (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() IN ('admin', 'staff')
)
WITH CHECK (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() IN ('admin', 'staff')
);

CREATE POLICY "Staff and Admins can delete waiter requests"
ON public.waiter_requests FOR DELETE
TO authenticated
USING (
  restaurant_id = public.get_auth_restaurant_id()
  AND public.get_auth_role() IN ('admin', 'staff')
);

-- ==============================================================================
-- 4.10 SECURE ORDER & WAITER RPC FUNCTIONS (SECURITY DEFINER)
-- ==============================================================================

-- 1 & 2. create_order & get_order_status canonical definitions live in Section 15
-- (single source of truth with full sizes, extras, complements & promotions support).

-- =========================================================================
-- RESTAURANT OPEN / CLOSED FUNCTIONS
-- =========================================================================

-- 1. is_restaurant_open: Returns true if restaurant is active or scheduled reopen_at has passed
CREATE OR REPLACE FUNCTION public.is_restaurant_open(p_restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_open BOOLEAN;
    v_reopen_at TIMESTAMPTZ;
BEGIN
    SELECT is_open, reopen_at INTO v_open, v_reopen_at
    FROM public.restaurants
    WHERE id = p_restaurant_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_open IS TRUE THEN
        RETURN TRUE;
    END IF;

    IF v_reopen_at IS NOT NULL AND v_reopen_at <= now() THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 2. set_restaurant_open: Allows admins and staff to toggle restaurant status
CREATE OR REPLACE FUNCTION public.set_restaurant_open(
    p_open BOOLEAN,
    p_message_ar TEXT DEFAULT NULL,
    p_message_fr TEXT DEFAULT NULL,
    p_message_en TEXT DEFAULT NULL,
    p_reopen_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_restaurant_id UUID;
    v_role TEXT;
    v_rec RECORD;
BEGIN
    -- Verify caller authentication and role (admin or staff)
    SELECT restaurant_id, role INTO v_restaurant_id, v_role
    FROM public.profiles
    WHERE user_id = auth.uid();

    IF v_restaurant_id IS NULL OR (v_role <> 'admin' AND v_role <> 'staff') THEN
        RAISE EXCEPTION 'not_allowed';
    END IF;

    -- Validate reopen_at is not in the past
    IF p_reopen_at IS NOT NULL AND p_reopen_at <= now() THEN
        RAISE EXCEPTION 'reopen_in_past';
    END IF;

    UPDATE public.restaurants
    SET
        is_open = p_open,
        closed_message_ar = CASE WHEN p_open THEN NULL ELSE p_message_ar END,
        closed_message_fr = CASE WHEN p_open THEN NULL ELSE p_message_fr END,
        closed_message_en = CASE WHEN p_open THEN NULL ELSE p_message_en END,
        reopen_at = CASE WHEN p_open THEN NULL ELSE p_reopen_at END,
        updated_at = now()
    WHERE id = v_restaurant_id
    RETURNING id, name, is_open, closed_message_ar, closed_message_fr, closed_message_en, reopen_at INTO v_rec;

    RETURN to_jsonb(v_rec);
END;
$$;

-- 3. create_waiter_request: Validates restaurant and table, enforces rate limit,
-- and inserts waiter / bill requests.
CREATE OR REPLACE FUNCTION public.create_waiter_request(
    p_restaurant_id UUID,
    p_table_id UUID,
    p_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_table_rec RECORD;
    v_clean_type TEXT;
    v_request_id UUID;
    v_recent_req_count INT;
BEGIN
    -- 1. Verify restaurant exists
    IF NOT EXISTS (SELECT 1 FROM public.restaurants WHERE id = p_restaurant_id) THEN
        RAISE EXCEPTION 'RESTAURANT_NOT_FOUND: The specified restaurant does not exist.';
    END IF;

    -- 2. Verify restaurant is currently open
    IF NOT public.is_restaurant_open(p_restaurant_id) THEN
        RAISE EXCEPTION 'restaurant_closed';
    END IF;

    -- 2. Verify table exists, belongs to restaurant and is active
    IF p_table_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_TABLE: Table ID is required.';
    END IF;

    SELECT id, table_number, active INTO v_table_rec
    FROM public.tables
    WHERE id = p_table_id AND restaurant_id = p_restaurant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_TABLE: The specified table does not belong to this restaurant.';
    END IF;

    IF v_table_rec.active = false THEN
        RAISE EXCEPTION 'TABLE_INACTIVE: This table is currently closed or inactive.';
    END IF;

    -- 3. Normalize type ('waiter_call' or 'bill_request')
    IF p_type IN ('bill', 'bill_request') THEN
        v_clean_type := 'bill_request';
    ELSE
        v_clean_type := 'waiter_call';
    END IF;

    -- 4. Anti-spam throttling: limit to 3 requests per table per 1 minute
    SELECT COUNT(*) INTO v_recent_req_count
    FROM public.waiter_requests
    WHERE restaurant_id = p_restaurant_id
      AND table_id = p_table_id
      AND created_at > (NOW() - INTERVAL '1 minute');

    IF v_recent_req_count >= 3 THEN
        RAISE EXCEPTION 'REQUEST_THROTTLED: Please wait a moment before sending another request.';
    END IF;

    -- 5. Insert request
    INSERT INTO public.waiter_requests (
        restaurant_id,
        table_id,
        table_number,
        type,
        status,
        created_at
    ) VALUES (
        p_restaurant_id,
        p_table_id,
        v_table_rec.table_number,
        v_clean_type,
        'pending',
        NOW()
    ) RETURNING id INTO v_request_id;

    RETURN jsonb_build_object(
        'id', v_request_id,
        'restaurant_id', p_restaurant_id,
        'table_id', p_table_id,
        'table_number', v_table_rec.table_number,
        'type', v_clean_type,
        'status', 'pending',
        'created_at', NOW()
    );
END;
$$;

-- Grant execution to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.create_waiter_request(UUID, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_restaurant_open(UUID) TO anon, authenticated;

-- ==============================================================================
-- 4.11 SECURE RESTAURANT ONBOARDING FUNCTION (SECURITY DEFINER)
-- ==============================================================================
-- Allows an authenticated user who does NOT yet belong to any restaurant
-- to create a NEW restaurant tenant and become its administrator.
-- Enforces:
-- 1. Requires authenticated user (auth.uid() IS NOT NULL).
-- 2. Strict rate limit (1 restaurant per user): rejects if profile already exists.
-- 3. Creates a brand new restaurant row (cannot attach to or hijack existing restaurants).
-- 4. Creates caller's profile with role = 'admin' linked ONLY to this new restaurant.
-- 5. Auto-provisions starter data: 6 tables, 1 starter category, and 1 starter dish.
-- 6. Returns the UUID of the newly created restaurant.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_restaurant(name text)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_clean_name TEXT;
    v_slug TEXT;
    v_restaurant_id UUID;
    v_existing_profile_count INT;
    v_cat_pizzas UUID;
    v_cat_burgers UUID;
    v_cat_drinks UUID;
    v_caller_email TEXT;
    v_admin_name TEXT;
BEGIN
    -- 1. Authentication check
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to create a restaurant. / يجب تسجيل الدخول لإنشاء مطعم.';
    END IF;

    -- 2. Registration PIN check (Never trust user_metadata; check server-side is_pin_verified)
    IF NOT public.is_pin_verified(v_user_id) THEN
        RAISE EXCEPTION 'PIN_VERIFICATION_REQUIRED: A valid registration PIN is required to create a restaurant. Contact platform administration. / يتطلب إنشاء المطعم كود تسجيل معتمد من إدارة المنصة.';
    END IF;

    -- 3. Privilege isolation: Refuse if user already belongs to any restaurant
    SELECT COUNT(*) INTO v_existing_profile_count
    FROM public.profiles
    WHERE user_id = v_user_id;

    IF v_existing_profile_count > 0 THEN
        RAISE EXCEPTION 'ALREADY_EXISTS: This account already owns or belongs to a restaurant. / هذا الحساب يمتلك أو يرتبط بمطعم بالفعل. / Ce compte est déjà associé à un restaurant.';
    END IF;

    -- 4. Name validation (fallback to 'My Restaurant' if missing or short)
    v_clean_name := TRIM(COALESCE(name, ''));
    IF LENGTH(v_clean_name) < 2 THEN
        v_clean_name := 'My Restaurant';
    ELSIF LENGTH(v_clean_name) > 100 THEN
        v_clean_name := SUBSTRING(v_clean_name FROM 1 FOR 100);
    END IF;

    -- 4. Generate clean URL slug: lowercase name, replace non-alphanumeric with hyphens,
    -- and if empty (e.g. Arabic names) use 'r-' || substr(replace(gen_random_uuid()::text,'-',''),1,10); always append short random suffix.
    v_slug := LOWER(REGEXP_REPLACE(v_clean_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := TRIM(BOTH '-' FROM v_slug);
    IF v_slug = '' OR v_slug IS NULL THEN
        v_slug := 'r-' || SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 10);
    ELSE
        v_slug := v_slug || '-' || SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6);
    END IF;

    -- 5. Create the NEW restaurant row (id uses default UUID)
    INSERT INTO public.restaurants (
        name,
        slug,
        description,
        currency,
        opening_hours,
        theme_color
    ) VALUES (
        v_clean_name,
        v_slug,
        'Menu & Commande sur Table',
        'DZD',
        '11:30 - 23:30',
        '#FF5A1F'
    ) RETURNING id INTO v_restaurant_id;

    -- 6. Derive admin full name: coalesce(raw_user_meta_data->>'full_name', split_part(email,'@',1))
    SELECT COALESCE(
        NULLIF(TRIM(raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(SPLIT_PART(email, '@', 1)), ''),
        'Restaurant Owner'
    ) INTO v_admin_name
    FROM auth.users
    WHERE id = v_user_id;

    IF v_admin_name IS NULL OR v_admin_name = '' THEN
        v_admin_name := 'Restaurant Owner';
    ELSIF LENGTH(v_admin_name) > 255 THEN
        v_admin_name := SUBSTRING(v_admin_name FROM 1 FOR 255);
    END IF;

    -- 7. Create caller's profile with user_id = auth user id (let id use its default)
    INSERT INTO public.profiles (
        user_id,
        restaurant_id,
        full_name,
        role
    ) VALUES (
        v_user_id,
        v_restaurant_id,
        v_admin_name,
        'admin'
    );

    -- 8. Auto-create default data: 6 Tables
    INSERT INTO public.tables (restaurant_id, table_number, active)
    VALUES 
        (v_restaurant_id, 1, true),
        (v_restaurant_id, 2, true),
        (v_restaurant_id, 3, true),
        (v_restaurant_id, 4, true),
        (v_restaurant_id, 5, true),
        (v_restaurant_id, 6, true);

    -- 9. Auto-create default sample categories
    INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
    VALUES (v_restaurant_id, 'Pizzas', 'Pizzas Artisanales', 'البيتزا الإيطالية', 1)
    RETURNING id INTO v_cat_pizzas;

    INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
    VALUES (v_restaurant_id, 'Burgers & Sandwiches', 'Burgers Gourmet', 'البرجر والساندويتش', 2)
    RETURNING id INTO v_cat_burgers;

    INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
    VALUES (v_restaurant_id, 'Drinks & Desserts', 'Boissons & Desserts', 'المشروبات والحلويات', 3)
    RETURNING id INTO v_cat_drinks;

    -- 10. Auto-create starter dishes with real UUIDs
    INSERT INTO public.products (
        restaurant_id, category_id, name_en, name_fr, name_ar,
        description_en, description_fr, description_ar,
        price, image_url, available, popular, sort_order
    ) VALUES 
    (
        v_restaurant_id, v_cat_pizzas, 'Pizza Margherita', 'Pizza Margherita', 'بيتزا مارغريتا كلاسيكية',
        'San Marzano tomato sauce, fresh mozzarella fior di latte, extra virgin olive oil, and fresh basil.',
        'Sauce tomate San Marzano, mozzarella fraîche fior di latte, huile d''olive vierge et basilic frais.',
        'صلصة طماطم سان مارزانو، جبنة موزاريلا طازجة، زيت زيتون بكر ممتاز وأوراق الريحان الطازج.',
        650.00, '/src/assets/images/dish_pizza_margherita_1793918998408.jpg', true, true, 1
    ),
    (
        v_restaurant_id, v_cat_pizzas, '4 Cheese Pizza', 'Pizza 4 Fromages', 'بيتزا أربعة أجبان',
        'Mozzarella, gorgonzola, parmesan reggiano, and creamy ricotta on stone-baked crust.',
        'Mozzarella, gorgonzola, parmesan reggiano et ricotta crémeuse cuite au feu de bois.',
        'مزيج غني من الموزاريلا، الغورغونزولا، البارميزان والريكوتا على عجينة إيطالية مقرمشة.',
        950.00, '/src/assets/images/dish_pizza_margherita_1793918998408.jpg', true, false, 2
    ),
    (
        v_restaurant_id, v_cat_burgers, 'Gourmet Beef Burger', 'Burger Gourmet Boeuf', 'برجر لحم جورميه فاخر',
        '180g fresh grilled beef patty, melted cheddar, caramelized onions, and secret chef sauce.',
        'Steak haché de boeuf frais 180g, cheddar fondant, oignons caramélisés et sauce secrète du chef.',
        'شريحة لحم بقري طازج 180غ مشوية على اللهب، جبنة شيدر ذائبة، بصل مكرمل وصلصة الشيف السرية.',
        850.00, '/src/assets/images/dish_gourmet_burger_1793918999411.jpg', true, true, 1
    ),
    (
        v_restaurant_id, v_cat_burgers, 'Crispy Chicken Sandwich', 'Sandwich Poulet Croustillant', 'ساندويتش دجاج كريسبي مقرمش',
        'Crispy fried chicken breast fillet, fresh coleslaw, pickles, and garlic smoked mayo in brioche bun.',
        'Filet de poulet croustillant pané minute, coleslaw frais, cornichons et mayonnaise fumée à l''ail.',
        'صدر دجاج مقرمش بالتتبيلة الخاصة، سلطة كولسلو طازجة، مخلل ومايونيز ثوم مدخن في خبز بريوش.',
        750.00, '/src/assets/images/dish_crispy_chicken_1793919000437.jpg', true, false, 2
    ),
    (
        v_restaurant_id, v_cat_drinks, 'Fresh Mint Lemonade', 'Citronnade Fraîche Menthe', 'عصير ليمون ونعناع منعش',
        'Freshly squeezed organic lemons, fresh spearmint leaves, pure cane sugar, and crushed ice.',
        'Citrons pressés minute, feuilles de menthe fraîche, sucre de canne et glace pilée.',
        'عصير ليمون طبيعي طازج مع أوراق النعناع، سكر القصب وثلج مجروش.',
        350.00, '/src/assets/images/dish_chocolate_fondant_1793918999440.jpg', true, false, 1
    ),
    (
        v_restaurant_id, v_cat_drinks, 'Chocolate Lava Cake', 'Fondant au Chocolat Coeur Coulant', 'فوندان الشوكولاتة الذائبة',
        'Warm dark chocolate molten cake with rich liquid center, served with vanilla cream.',
        'Gâteau coulant au chocolat noir 70%, coeur liquide onctueux, servi tiède.',
        'كعكة الشوكولاتة الداكنة الساخنة مع قلب شوكولاتة ذائب وفاخر.',
        450.00, '/src/assets/images/dish_chocolate_fondant_1793918999440.jpg', true, true, 2
    );

    -- Return the new restaurant ID
    RETURN v_restaurant_id;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.create_restaurant(text) TO authenticated;

-- ==============================================================================
-- 4.12 AUTOMATIC NEW USER ONBOARDING TRIGGER (handle_new_user)
-- ==============================================================================
-- Trigger on auth.users AFTER INSERT:
-- Automatically creates a new restaurant and links the newly registered user
-- as its admin with role = 'admin' without requiring manual SQL execution.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_name TEXT;
    v_full_name TEXT;
    v_slug TEXT;
    v_restaurant_id UUID;
    v_cat_pizzas UUID;
    v_cat_burgers UUID;
    v_cat_drinks UUID;
    v_existing_profile_count INT;
BEGIN
    -- 1. Check if PIN was verified (set by trigger on auth.users in raw_app_meta_data)
    -- ONLY create restaurant and admin profile if pin_verified = 'true'
    IF COALESCE(NEW.raw_app_meta_data->>'pin_verified', 'false') != 'true' THEN
        RETURN NEW;
    END IF;

    -- 2. Idempotency check: Skip if user already has a profile
    SELECT COUNT(*) INTO v_existing_profile_count
    FROM public.profiles
    WHERE user_id = NEW.id;

    IF v_existing_profile_count > 0 THEN
        RETURN NEW;
    END IF;

    -- 2. Extract restaurant name from raw_user_meta_data (fallback: 'My Restaurant')
    v_clean_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'restaurant_name', ''));
    IF LENGTH(v_clean_name) < 2 THEN
        v_clean_name := 'My Restaurant';
    ELSIF LENGTH(v_clean_name) > 100 THEN
        v_clean_name := SUBSTRING(v_clean_name FROM 1 FOR 100);
    END IF;

    -- Extract full name: coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
    v_full_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(SPLIT_PART(NEW.email, '@', 1)), ''),
        'Restaurant Owner'
    );
    IF LENGTH(v_full_name) > 255 THEN
        v_full_name := SUBSTRING(v_full_name FROM 1 FOR 255);
    END IF;

    -- 3. Generate clean unique slug: lowercase name, replace non-alphanumeric with hyphens,
    -- and if empty (e.g. Arabic names) use 'r-' || substr(replace(gen_random_uuid()::text,'-',''),1,10); always append short random suffix.
    v_slug := LOWER(REGEXP_REPLACE(v_clean_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := TRIM(BOTH '-' FROM v_slug);
    IF v_slug = '' OR v_slug IS NULL THEN
        v_slug := 'r-' || SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 10);
    ELSE
        v_slug := v_slug || '-' || SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6);
    END IF;

    -- 4. Insert the new restaurant row (id uses default UUID)
    INSERT INTO public.restaurants (
        name,
        slug,
        description,
        currency,
        opening_hours,
        theme_color
    ) VALUES (
        v_clean_name,
        v_slug,
        'Menu & Commande sur Table',
        'DZD',
        '11:30 - 23:30',
        '#FF5A1F'
    ) RETURNING id INTO v_restaurant_id;

    -- 5. Insert profile with user_id = auth user id (let id use default UUID)
    INSERT INTO public.profiles (
        user_id,
        restaurant_id,
        full_name,
        role
    ) VALUES (
        NEW.id,
        v_restaurant_id,
        v_full_name,
        'admin'
    );

    -- 6. Auto-create default data: 6 Tables
    INSERT INTO public.tables (restaurant_id, table_number, active)
    VALUES 
        (v_restaurant_id, 1, true),
        (v_restaurant_id, 2, true),
        (v_restaurant_id, 3, true),
        (v_restaurant_id, 4, true),
        (v_restaurant_id, 5, true),
        (v_restaurant_id, 6, true);

    -- 7. Auto-create default sample categories
    INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
    VALUES (v_restaurant_id, 'Pizzas', 'Pizzas Artisanales', 'البيتزا الإيطالية', 1)
    RETURNING id INTO v_cat_pizzas;

    INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
    VALUES (v_restaurant_id, 'Burgers & Sandwiches', 'Burgers Gourmet', 'البرجر والساندويتش', 2)
    RETURNING id INTO v_cat_burgers;

    INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
    VALUES (v_restaurant_id, 'Drinks & Desserts', 'Boissons & Desserts', 'المشروبات والحلويات', 3)
    RETURNING id INTO v_cat_drinks;

    -- 8. Auto-create starter dishes with real UUIDs
    INSERT INTO public.products (
        restaurant_id, category_id, name_en, name_fr, name_ar,
        description_en, description_fr, description_ar,
        price, image_url, available, popular, sort_order
    ) VALUES 
    (
        v_restaurant_id, v_cat_pizzas, 'Pizza Margherita', 'Pizza Margherita', 'بيتزا مارغريتا كلاسيكية',
        'San Marzano tomato sauce, fresh mozzarella fior di latte, extra virgin olive oil, and fresh basil.',
        'Sauce tomate San Marzano, mozzarella fraîche fior di latte, huile d''olive vierge et basilic frais.',
        'صلصة طماطم سان مارزانو، جبنة موزاريلا طازجة، زيت زيتون بكر ممتاز وأوراق الريحان الطازج.',
        650.00, '/src/assets/images/dish_pizza_margherita_1793918998408.jpg', true, true, 1
    ),
    (
        v_restaurant_id, v_cat_pizzas, '4 Cheese Pizza', 'Pizza 4 Fromages', 'بيتزا أربعة أجبان',
        'Mozzarella, gorgonzola, parmesan reggiano, and creamy ricotta on stone-baked crust.',
        'Mozzarella, gorgonzola, parmesan reggiano et ricotta crémeuse cuite au feu de bois.',
        'مزيج غني من الموزاريلا، الغورغونزولا، البارميزان والريكوتا على عجينة إيطالية مقرمشة.',
        950.00, '/src/assets/images/dish_pizza_margherita_1793918998408.jpg', true, false, 2
    ),
    (
        v_restaurant_id, v_cat_burgers, 'Gourmet Beef Burger', 'Burger Gourmet Boeuf', 'برجر لحم جورميه فاخر',
        '180g fresh grilled beef patty, melted cheddar, caramelized onions, and secret chef sauce.',
        'Steak haché de boeuf frais 180g, cheddar fondant, oignons caramélisés et sauce secrète du chef.',
        'شريحة لحم بقري طازج 180غ مشوية على اللهب، جبنة شيدر ذائبة، بصل مكرمل وصلصة الشيف السرية.',
        850.00, '/src/assets/images/dish_gourmet_burger_1793918999411.jpg', true, true, 1
    ),
    (
        v_restaurant_id, v_cat_burgers, 'Crispy Chicken Sandwich', 'Sandwich Poulet Croustillant', 'ساندويتش دجاج كريسبي مقرمش',
        'Crispy fried chicken breast fillet, fresh coleslaw, pickles, and garlic smoked mayo in brioche bun.',
        'Filet de poulet croustillant pané minute, coleslaw frais, cornichons et mayonnaise fumée à l''ail.',
        'صدر دجاج مقرمش بالتتبيلة الخاصة، سلطة كولسلو طازجة، مخلل ومايونيز ثوم مدخن في خبز بريوش.',
        750.00, '/src/assets/images/dish_crispy_chicken_1793919000437.jpg', true, false, 2
    ),
    (
        v_restaurant_id, v_cat_drinks, 'Fresh Mint Lemonade', 'Citronnade Fraîche Menthe', 'عصير ليمون ونعناع منعش',
        'Freshly squeezed organic lemons, fresh spearmint leaves, pure cane sugar, and crushed ice.',
        'Citrons pressés minute, feuilles de menthe fraîche, sucre de canne et glace pilée.',
        'عصير ليمون طبيعي طازج مع أوراق النعناع، سكر القصب وثلج مجروش.',
        350.00, '/src/assets/images/dish_chocolate_fondant_1793918999440.jpg', true, false, 1
    ),
    (
        v_restaurant_id, v_cat_drinks, 'Chocolate Lava Cake', 'Fondant au Chocolat Coeur Coulant', 'فوندان الشوكولاتة الذائبة',
        'Warm dark chocolate molten cake with rich liquid center, served with vanilla cream.',
        'Gâteau coulant au chocolat noir 70%, coeur liquide onctueux, servi tiède.',
        'كعكة الشوكولاتة الداكنة الساخنة مع قلب شوكولاتة ذائب وفاخر.',
        450.00, '/src/assets/images/dish_chocolate_fondant_1793918999440.jpg', true, true, 2
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Safety catch: Never raise an exception that blocks auth.users user insertion
    RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4.12 STAFF INVITE SYSTEM & MULTI-USER TEAM ACCESS
-- ==============================================================================
-- Allows restaurant administrators to invite staff (kitchen staff, waiters)
-- to their specific restaurant without granting direct profile INSERT permissions.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.staff_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff' CHECK (role IN ('staff', 'admin')) NOT NULL,
    invite_code VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')) NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') NOT NULL
);

-- Index for invite lookups
CREATE INDEX IF NOT EXISTS idx_staff_invites_code ON public.staff_invites (invite_code);
CREATE INDEX IF NOT EXISTS idx_staff_invites_restaurant ON public.staff_invites (restaurant_id);

-- RLS on staff_invites
ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage invites belonging to their own restaurant
CREATE POLICY "Admins can view and manage restaurant invites"
ON public.staff_invites FOR ALL
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin')
WITH CHECK (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin');

-- RPC to create a new staff invite
CREATE OR REPLACE FUNCTION public.create_staff_invite(
    p_email text,
    p_full_name text,
    p_role text DEFAULT 'staff'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_user_id UUID;
    v_restaurant_id UUID;
    v_admin_role TEXT;
    v_clean_email TEXT;
    v_clean_name TEXT;
    v_clean_role TEXT;
    v_invite_code TEXT;
    v_invite_id UUID;
BEGIN
    v_admin_user_id := auth.uid();
    IF v_admin_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
    END IF;

    -- Validate caller is admin of restaurant
    SELECT restaurant_id, role INTO v_restaurant_id, v_admin_role
    FROM public.profiles
    WHERE user_id = v_admin_user_id;

    IF v_restaurant_id IS NULL OR v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'FORBIDDEN: Only restaurant administrators can invite staff members.';
    END IF;

    v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));
    v_clean_name := TRIM(COALESCE(p_full_name, ''));
    v_clean_role := LOWER(TRIM(COALESCE(p_role, 'staff')));

    IF v_clean_email = '' OR v_clean_email NOT LIKE '%@%.%' THEN
        RAISE EXCEPTION 'INVALID_EMAIL: Please provide a valid email address.';
    END IF;

    IF LENGTH(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'INVALID_NAME: Full name must be at least 2 characters.';
    END IF;

    IF v_clean_role NOT IN ('staff', 'admin') THEN
        v_clean_role := 'staff';
    END IF;

    -- Generate random 8-character uppercase alphanumeric code (e.g. STAFF-9X4K2P)
    v_invite_code := 'STAFF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 6));

    INSERT INTO public.staff_invites (
        restaurant_id,
        email,
        full_name,
        role,
        invite_code,
        status,
        invited_by
    ) VALUES (
        v_restaurant_id,
        v_clean_email,
        v_clean_name,
        v_clean_role,
        v_invite_code,
        'pending',
        v_admin_user_id
    ) RETURNING id INTO v_invite_id;

    RETURN jsonb_build_object(
        'id', v_invite_id,
        'restaurant_id', v_restaurant_id,
        'email', v_clean_email,
        'full_name', v_clean_name,
        'role', v_clean_role,
        'invite_code', v_invite_code,
        'status', 'pending'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_staff_invite(text, text, text) TO authenticated;

-- RPC for an authenticated user to accept an invite and join a restaurant as staff
CREATE OR REPLACE FUNCTION public.accept_staff_invite(p_invite_code text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_invite RECORD;
    v_existing_profile_count INT;
    v_restaurant_name TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to accept an invite.';
    END IF;

    -- Check if caller already has a profile in any restaurant
    SELECT COUNT(*) INTO v_existing_profile_count
    FROM public.profiles
    WHERE user_id = v_caller_id;

    IF v_existing_profile_count > 0 THEN
        RAISE EXCEPTION 'ALREADY_MEMBER: Your account already belongs to a restaurant.';
    END IF;

    -- Locate pending and unexpired invite
    SELECT * INTO v_invite
    FROM public.staff_invites
    WHERE invite_code = UPPER(TRIM(p_invite_code))
      AND status = 'pending'
      AND expires_at > NOW();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_INVITE: Invalid or expired invite code.';
    END IF;

    -- Create profile for caller linked to the restaurant
    INSERT INTO public.profiles (
        user_id,
        restaurant_id,
        full_name,
        role
    ) VALUES (
        v_caller_id,
        v_invite.restaurant_id,
        v_invite.full_name,
        v_invite.role
    );

    -- Mark invite as accepted
    UPDATE public.staff_invites
    SET status = 'accepted'
    WHERE id = v_invite.id;

    SELECT name INTO v_restaurant_name
    FROM public.restaurants
    WHERE id = v_invite.restaurant_id;

    RETURN jsonb_build_object(
        'success', true,
        'restaurant_id', v_invite.restaurant_id,
        'restaurant_name', v_restaurant_name,
        'role', v_invite.role,
        'full_name', v_invite.full_name
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_staff_invite(text) TO authenticated;

-- RPC to list team members and invites for the caller's restaurant
CREATE OR REPLACE FUNCTION public.get_restaurant_team()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_restaurant_id UUID;
    v_members JSONB;
    v_invites JSONB;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    SELECT restaurant_id INTO v_restaurant_id
    FROM public.profiles
    WHERE user_id = v_caller_id;

    IF v_restaurant_id IS NULL THEN
        RAISE EXCEPTION 'NO_RESTAURANT';
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'full_name', p.full_name,
        'role', p.role,
        'created_at', p.created_at
    )), '[]'::jsonb) INTO v_members
    FROM public.profiles p
    WHERE p.restaurant_id = v_restaurant_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', i.id,
        'email', i.email,
        'full_name', i.full_name,
        'role', i.role,
        'invite_code', i.invite_code,
        'status', i.status,
        'created_at', i.created_at,
        'expires_at', i.expires_at
    )), '[]'::jsonb) INTO v_invites
    FROM public.staff_invites i
    WHERE i.restaurant_id = v_restaurant_id
      AND i.status = 'pending';

    RETURN jsonb_build_object(
        'members', v_members,
        'invites', v_invites
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_restaurant_team() TO authenticated;


-- ==============================================================================
-- 5. REALTIME PUBLICATION
-- ==============================================================================
-- Add tables to the realtime publication so Supabase broadcasts live changes
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.orders, public.order_items, public.waiter_requests;
COMMIT;

-- ==============================================================================
-- 6. STORAGE BUCKETS (menuqr-media)
-- ==============================================================================
-- Public bucket for restaurant media: products, logo, cover, offers
-- Structure: <restaurant_id>/products/<uuid>.<ext>
--            <restaurant_id>/logo/<uuid>.<ext>
--            <restaurant_id>/cover/<uuid>.<ext>
--            <restaurant_id>/offers/<uuid>.<ext>

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'menuqr-media',
    'menuqr-media',
    true,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS policies for menuqr-media
-- 1. Public Read: anyone can view media assets
DROP POLICY IF EXISTS "Public Access to menuqr-media" ON storage.objects;
CREATE POLICY "Public Access to menuqr-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'menuqr-media');

-- 2. Authenticated Upload: staff/admins can upload to their restaurant folder
-- Path: <restaurant_id>/<folder>/<uuid>.<ext>
DROP POLICY IF EXISTS "Authenticated users can upload to menuqr-media" ON storage.objects;
CREATE POLICY "Authenticated users can upload to menuqr-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'menuqr-media'
    AND (
        -- Enforce that first folder in path matches the user's assigned restaurant
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.restaurant_id::text = (storage.foldername(name))[1]
        )
        OR
        -- Super admin or developer bypass
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    )
);

-- 3. Authenticated Update
DROP POLICY IF EXISTS "Authenticated users can update menuqr-media" ON storage.objects;
CREATE POLICY "Authenticated users can update menuqr-media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'menuqr-media'
    AND (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.restaurant_id::text = (storage.foldername(name))[1]
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    )
);

-- 4. Authenticated Delete
DROP POLICY IF EXISTS "Authenticated users can delete from menuqr-media" ON storage.objects;
CREATE POLICY "Authenticated users can delete from menuqr-media"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'menuqr-media'
    AND (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.restaurant_id::text = (storage.foldername(name))[1]
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    )
);

-- ==============================================================================
-- 7. INITIAL SEED DATA FOR YOUNES RESTAURANT (SAMPLE RESTAURANT)
-- ==============================================================================
DO $$
DECLARE
    v_restaurant_id UUID;
    v_cat_pizza UUID;
    v_cat_burgers UUID;
    v_cat_tacos UUID;
    v_cat_chicken UUID;
    v_cat_desserts UUID;
    v_cat_drinks UUID;
    v_tbl_1 UUID;
    v_tbl_2 UUID;
    v_tbl_3 UUID;
    v_tbl_4 UUID;
    v_tbl_5 UUID;
    v_tbl_6 UUID;
BEGIN
    -- Check if restaurant already exists
    SELECT id INTO v_restaurant_id FROM public.restaurants WHERE slug = 'younes-restaurant' LIMIT 1;
    
    IF v_restaurant_id IS NULL THEN
        -- Insert Restaurant
        INSERT INTO public.restaurants (
            name, slug, logo_url, cover_url, description, currency, phone, whatsapp, address, opening_hours, theme_color
        ) VALUES (
            'Younes Restaurant',
            'younes-restaurant',
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=120&h=120&q=80',
            '/src/assets/images/restaurant_cover_interior_1793918997325.jpg',
            'Artisan Wood-Fired & Gourmet Grill',
            'DZD',
            '+213 (0) 550 12 34 56',
            '+213550123456',
            'Didouche Mourad, Alger Centre, Algeria',
            '11:30 - 23:30',
            '#FF5A1F'
        ) RETURNING id INTO v_restaurant_id;

        -- Insert Categories
        INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
        VALUES (v_restaurant_id, 'Pizza', 'Pizzas', 'بيتزا', 1) RETURNING id INTO v_cat_pizza;

        INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
        VALUES (v_restaurant_id, 'Burgers', 'Burgers', 'برغر', 2) RETURNING id INTO v_cat_burgers;

        INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
        VALUES (v_restaurant_id, 'Tacos', 'Tacos', 'تاكوس', 3) RETURNING id INTO v_cat_tacos;

        INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
        VALUES (v_restaurant_id, 'Chicken', 'Poulet', 'دجاج', 4) RETURNING id INTO v_cat_chicken;

        INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
        VALUES (v_restaurant_id, 'Desserts', 'Desserts', 'حلويات', 5) RETURNING id INTO v_cat_desserts;

        INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
        VALUES (v_restaurant_id, 'Drinks', 'Boissons', 'مشروبات', 6) RETURNING id INTO v_cat_drinks;

        -- Insert Tables (1 to 6)
        INSERT INTO public.tables (restaurant_id, table_number, active) VALUES (v_restaurant_id, 1, true) RETURNING id INTO v_tbl_1;
        INSERT INTO public.tables (restaurant_id, table_number, active) VALUES (v_restaurant_id, 2, true) RETURNING id INTO v_tbl_2;
        INSERT INTO public.tables (restaurant_id, table_number, active) VALUES (v_restaurant_id, 3, true) RETURNING id INTO v_tbl_3;
        INSERT INTO public.tables (restaurant_id, table_number, active) VALUES (v_restaurant_id, 4, true) RETURNING id INTO v_tbl_4;
        INSERT INTO public.tables (restaurant_id, table_number, active) VALUES (v_restaurant_id, 5, true) RETURNING id INTO v_tbl_5;
        INSERT INTO public.tables (restaurant_id, table_number, active) VALUES (v_restaurant_id, 6, true) RETURNING id INTO v_tbl_6;

        -- Insert Products
        INSERT INTO public.products (
            restaurant_id, category_id, name_en, name_fr, name_ar,
            description_en, description_fr, description_ar, price,
            image_url, available, popular, new, spicy, vegetarian, sort_order
        ) VALUES 
        (
            v_restaurant_id, v_cat_pizza,
            'Pizza Margherita', 'Pizza Margherita', 'بيتزا مارغريتا',
            'San Marzano tomato sauce, fior di latte mozzarella, fresh basil, kalamata olives, extra virgin olive oil.',
            'Sauce tomate San Marzano, mozzarella fior di latte, basilic frais, olives kalamata, huile d’olive extra vierge.',
            'صلصة طماطم سان مارزانو، جبنة موزاريلا طازجة، ريحان أخضر، زيتون كالاماتا وزيت زيتون بكر.',
            650.00, '/src/assets/images/dish_pizza_margherita_1793918998408.jpg',
            true, true, false, false, true, 1
        ),
        (
            v_restaurant_id, v_cat_pizza,
            'Pizza 4 Fromages Gourmet', 'Pizza 4 Fromages Gourmet', 'بيتزا 4 أجبان غورميه',
            'Cheddar aged, gorgonzola dop, mozzarella di bufala, parmigiano reggiano, crushed walnuts & honey drizzle.',
            'Cheddar affiné, gorgonzola dop, mozzarella di bufala, parmigiano reggiano, noix concassées et filet de miel.',
            'مزيج فاخر من 4 أجبان معتقة: شيدر، غورغونزولا، موزاريلا، بارميزان مع جوز مقرمش ورشة عسل.',
            950.00, '/src/assets/images/dish_pizza_margherita_1793918998408.jpg',
            true, true, false, false, true, 2
        ),
        (
            v_restaurant_id, v_cat_burgers,
            'Double Smash Beef Burger', 'Double Smash Burger Gourmand', 'دبل سماش برغر لحم بقري',
            'Two 100% fresh beef patties smashed thin, double melted cheddar, grilled onions, house secret sauce, buttery toasted brioche.',
            'Deux steaks 100% pur bœuf frais smashés, double cheddar fondu, oignons caramélisés, sauce secrète maison, pain brioché beurré.',
            'شريحتان من لحم البقر الطازج 100%، دبل جبن شيدر ذائب، بصل مكرمل مشوي، صوص سري خاص وخبز بريوش محمص بالزبدة.',
            850.00, '/src/assets/images/dish_gourmet_burger_1793918999411.jpg',
            true, true, false, false, false, 1
        ),
        (
            v_restaurant_id, v_cat_burgers,
            'Crispy Nashville Chicken Burger', 'Crispy Nashville Chicken Burger', 'برغر دجاج كرسبي ناشفيل',
            'Buttermilk-brined crispy chicken breast, spicy honey glaze, fresh creamy coleslaw, dill pickles, brioche bun.',
            'Filet de poulet mariné au babeurre pané extra croustillant, glaçage miel piquant, coleslaw crémeux, pickles d’aneth.',
            'صدر دجاج مقرمش متبل بالحليب الرائب، لمسة عسل حار، سلطة كولسلو كريمية، مخلل خيار وخبز بريوش.',
            750.00, '/src/assets/images/dish_gourmet_burger_1793918999411.jpg',
            true, false, false, true, false, 2
        ),
        (
            v_restaurant_id, v_cat_tacos,
            'French Tacos Suprême XL', 'Tacos Français Suprême XL', 'تاكوس فرنسي سوبريم إكس إل',
            'Toasted tortilla packed with minced beef, crispy chicken nuggets, golden fries, and our signature hot Gruyère cheese sauce.',
            'Galette toastée garnie de viande hachée, nuggets de poulet croustillants, frites dorées et sauce fromagère maison onctueuse au Gruyère.',
            'خبز التورتيلا المحمص المحشو باللحم المفروم، قطع الدجاج المقرمشة، بطاطس مقلية مع صوص الجبن الساخن الفاخر.',
            750.00, '/src/assets/images/dish_crispy_chicken_1793919000437.jpg',
            true, true, false, false, false, 1
        ),
        (
            v_restaurant_id, v_cat_chicken,
            'Crispy Golden Chicken Tenders (6 pcs)', 'Tenders de Poulet Dorés Croustillants (6 pcs)', 'قطع تندرز دجاج ذهبية مقرمشة (6 قطع)',
            'Hand-breaded 100% tender chicken breast strips seasoned with 11 spices, served with garlic herb dip & lemon wedges.',
            'Aiguillettes de poulet 100% filet panées minute aux 11 épices secrètes, servies avec sauce crémeuse à l’ail et quartiers de citron.',
            'أصابع دجاج مقرمشة طازجة ومحضرة بخلطة 11 بهاراً، تقدم مع صوص الثوم والأعشاب وقطع الليمون الطازج.',
            650.00, '/src/assets/images/dish_crispy_chicken_1793919000437.jpg',
            true, true, false, false, false, 1
        ),
        (
            v_restaurant_id, v_cat_desserts,
            'Molten Chocolate Lava Cake Fondant', 'Fondant au Chocolat Cœur Coulant', 'فوندان كعكة الشوكولاتة الذائبة',
            'Decadent 70% dark Belgian chocolate cake with warm flowing liquid center, scoop of pure Madagascar vanilla bean ice cream & berries.',
            'Gâteau gourmand au chocolat noir belge 70%, cœur ultra coulant tiède, boule de glace vanille Bourbon de Madagascar et fruits rouges.',
            'كعكة شوكولاتة بلجيكية فاخرة بقلب سائل دافئ يفيض عند أول ملعقة، مع كرة آيس كريم فانيليا بوربون وفواكه حمراء.',
            450.00, '/src/assets/images/dish_chocolate_fondant_1793918999440.jpg',
            true, true, false, false, true, 1
        ),
        (
            v_restaurant_id, v_cat_drinks,
            'Fresh Strawberry Virgin Mojito', 'Virgin Mojito Fraise & Menthe Fraîche', 'موخيتو الفراولة والنعناع المنعش',
            'Muddled fresh strawberries, wild garden spearmint, lime slices, sparkling soda water, and crushed crystal ice.',
            'Fraises fraîches écrasées au pilon, menthe fraîche cueillie, rondelles de citron vert, eau gazeuse vivifiante et glace pilée.',
            'حبات فراولة طازجة مهروسة، نعناع بلدي، شرائح ليمون أخضر، مياه فوارة ومجروش الثلج المنعش.',
            350.00, '/src/assets/images/dish_chocolate_fondant_1793918999440.jpg',
            true, true, false, false, true, 1
        );

        -- Insert Sample Offer
        INSERT INTO public.offers (
            restaurant_id, title_en, title_fr, title_ar,
            description_en, description_fr, description_ar,
            price, active
        ) VALUES (
            v_restaurant_id,
            'Family Pizza Special Combo',
            'Menu Pizza Familial',
            'عرض البيتزا العائلي الخاص',
            'Buy any 2 Large Pizzas and get 2 chilled drinks + 1 Tiramisu free!',
            'Pour 2 Grandes Pizzas achetées, 2 boissons fraîches + 1 Tiramisu offerts !',
            'اشترِ أي 2 بيتزا حجم كبير واحصل على 2 مشروب بارد + تيراميسو مجاناً!',
            2000.00,
            true
        );
    END IF;
END $$;

-- ==============================================================================
-- 8. MANUAL ADMIN PROVISIONING SNIPPET (RUN BY RESTAURANT OWNER VIA SQL EDITOR)
-- ==============================================================================
-- Instructions:
-- 1. Create a user via Supabase Dashboard -> Authentication -> Users -> Add User.
-- 2. Execute the snippet below in Supabase SQL Editor.
-- Replace <YOUR_USER_EMAIL> with the email of the admin user.
-- Replace <YOUR_RESTAURANT_ID> with your restaurant UUID.
-- ==============================================================================

/*
INSERT INTO public.profiles (user_id, restaurant_id, full_name, role)
SELECT 
    u.id AS user_id,
    '<YOUR_RESTAURANT_ID>'::UUID AS restaurant_id,
    'Restaurant Administrator' AS full_name,
    'admin' AS role
FROM auth.users u
WHERE u.email = '<YOUR_USER_EMAIL>'
ON CONFLICT (user_id) DO UPDATE 
SET role = 'admin', restaurant_id = EXCLUDED.restaurant_id, full_name = EXCLUDED.full_name;
*/

-- ==============================================================================
-- 9. SEED DEFAULT TABLES & MENU FOR EXISTING RESTAURANT (READY-TO-RUN IN SQL EDITOR)
-- ==============================================================================
-- Run this block to populate tables 1-6 and starter categories & dishes for your
-- existing restaurant so it is immediately usable with real Supabase UUIDs.
-- ==============================================================================

DO $$
DECLARE
    v_rest_id UUID;
    v_cat_pizzas UUID;
    v_cat_burgers UUID;
    v_cat_drinks UUID;
BEGIN
    -- Select the first active restaurant (or replace with your specific restaurant UUID)
    SELECT id INTO v_rest_id FROM public.restaurants ORDER BY created_at ASC LIMIT 1;

    IF v_rest_id IS NULL THEN
        RAISE NOTICE 'No existing restaurant found. Please create one via the onboarding screen first.';
        RETURN;
    END IF;

    -- 1. Ensure tables 1 to 6 exist
    INSERT INTO public.tables (restaurant_id, table_number, active)
    VALUES 
        (v_rest_id, 1, true),
        (v_rest_id, 2, true),
        (v_rest_id, 3, true),
        (v_rest_id, 4, true),
        (v_rest_id, 5, true),
        (v_rest_id, 6, true)
    ON CONFLICT (restaurant_id, table_number) DO UPDATE SET active = true;

    -- 2. Create Categories if not already present
    SELECT id INTO v_cat_pizzas FROM public.categories WHERE restaurant_id = v_rest_id AND name_en = 'Pizzas' LIMIT 1;
    IF v_cat_pizzas IS NULL THEN
        INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
        VALUES (v_rest_id, 'Pizzas', 'Pizzas Artisanales', 'البيتزا الإيطالية', 1)
        RETURNING id INTO v_cat_pizzas;
    END IF;

    SELECT id INTO v_cat_burgers FROM public.categories WHERE restaurant_id = v_rest_id AND name_en = 'Burgers & Sandwiches' LIMIT 1;
    IF v_cat_burgers IS NULL THEN
        INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
        VALUES (v_rest_id, 'Burgers & Sandwiches', 'Burgers Gourmet', 'البرجر والساندويتش', 2)
        RETURNING id INTO v_cat_burgers;
    END IF;

    SELECT id INTO v_cat_drinks FROM public.categories WHERE restaurant_id = v_rest_id AND name_en = 'Drinks & Desserts' LIMIT 1;
    IF v_cat_drinks IS NULL THEN
        INSERT INTO public.categories (restaurant_id, name_en, name_fr, name_ar, sort_order)
        VALUES (v_rest_id, 'Drinks & Desserts', 'Boissons & Desserts', 'المشروبات والحلويات', 3)
        RETURNING id INTO v_cat_drinks;
    END IF;

    -- 3. Create Sample Dishes with real UUIDs if category has no products
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE restaurant_id = v_rest_id AND category_id = v_cat_pizzas) THEN
        INSERT INTO public.products (
            restaurant_id, category_id, name_en, name_fr, name_ar,
            description_en, description_fr, description_ar,
            price, image_url, available, popular, sort_order
        ) VALUES 
        (
            v_rest_id, v_cat_pizzas, 'Pizza Margherita', 'Pizza Margherita', 'بيتزا مارغريتا كلاسيكية',
            'San Marzano tomato sauce, fresh mozzarella fior di latte, extra virgin olive oil, and fresh basil.',
            'Sauce tomate San Marzano, mozzarella fraîche fior di latte, huile d''olive vierge et basilic frais.',
            'صلصة طماطم سان مارزانو، جبنة موزاريلا طازجة، زيت زيتون بكر ممتاز وأوراق الريحان الطازج.',
            650.00, '/src/assets/images/dish_pizza_margherita_1793918998408.jpg', true, true, 1
        ),
        (
            v_rest_id, v_cat_pizzas, '4 Cheese Pizza', 'Pizza 4 Fromages', 'بيتزا أربعة أجبان',
            'Mozzarella, gorgonzola, parmesan reggiano, and creamy ricotta on stone-baked crust.',
            'Mozzarella, gorgonzola, parmesan reggiano et ricotta crémeuse cuite au feu de bois.',
            'مزيج غني من الموزاريلا، الغورغونزولا، البارميزان والريكوتا على عجينة إيطالية مقرمشة.',
            950.00, '/src/assets/images/dish_pizza_margherita_1793918998408.jpg', true, false, 2
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE restaurant_id = v_rest_id AND category_id = v_cat_burgers) THEN
        INSERT INTO public.products (
            restaurant_id, category_id, name_en, name_fr, name_ar,
            description_en, description_fr, description_ar,
            price, image_url, available, popular, sort_order
        ) VALUES 
        (
            v_rest_id, v_cat_burgers, 'Gourmet Beef Burger', 'Burger Gourmet Boeuf', 'برجر لحم جورميه فاخر',
            '180g fresh grilled beef patty, melted cheddar, caramelized onions, and secret chef sauce.',
            'Steak haché de boeuf frais 180g, cheddar fondant, oignons caramélisés et sauce secrète du chef.',
            'شريحة لحم بقري طازج 180غ مشوية على اللهب، جبنة شيدر ذائبة، بصل مكرمل وصلصة الشيف السرية.',
            850.00, '/src/assets/images/dish_gourmet_burger_1793918999411.jpg', true, true, 1
        ),
        (
            v_rest_id, v_cat_burgers, 'Crispy Chicken Sandwich', 'Sandwich Poulet Croustillant', 'ساندويتش دجاج كريسبي مقرمش',
            'Crispy fried chicken breast fillet, fresh coleslaw, pickles, and garlic smoked mayo in brioche bun.',
            'Filet de poulet croustillant pané minute, coleslaw frais, cornichons et mayonnaise fumée à l''ail.',
            'صدر دجاج مقرمش بالتتبيلة الخاصة، سلطة كولسلو طازجة، مخلل ومايونيز ثوم مدخن في خبز بريوش.',
            750.00, '/src/assets/images/dish_crispy_chicken_1793919000437.jpg', true, false, 2
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE restaurant_id = v_rest_id AND category_id = v_cat_drinks) THEN
        INSERT INTO public.products (
            restaurant_id, category_id, name_en, name_fr, name_ar,
            description_en, description_fr, description_ar,
            price, image_url, available, popular, sort_order
        ) VALUES 
        (
            v_rest_id, v_cat_drinks, 'Fresh Mint Lemonade', 'Citronnade Fraîche Menthe', 'عصير ليمون ونعناع منعش',
            'Freshly squeezed organic lemons, fresh spearmint leaves, pure cane sugar, and crushed ice.',
            'Citrons pressés minute, feuilles de menthe fraîche, sucre de canne et glace pilée.',
            'عصير ليمون طبيعي طازج مع أوراق النعناع، سكر القصب وثلج مجروش.',
            350.00, '/src/assets/images/dish_chocolate_fondant_1793918999440.jpg', true, false, 1
        ),
        (
            v_rest_id, v_cat_drinks, 'Chocolate Lava Cake', 'Fondant au Chocolat Coeur Coulant', 'فوندان الشوكولاتة الذائبة',
            'Warm dark chocolate molten cake with rich liquid center, served with vanilla cream.',
            'Gâteau coulant au chocolat noir 70%, coeur liquide onctueux, servi tiède.',
            'كعكة الشوكولاتة الداكنة الساخنة مع قلب شوكولاتة ذائب وفاخر.',
            450.00, '/src/assets/images/dish_chocolate_fondant_1793918999440.jpg', true, true, 2
        );
    END IF;

    RAISE NOTICE 'Defaults successfully added to restaurant %', v_rest_id;
END $$;

-- ==============================================================================
-- 10. READY-TO-RUN SQL SNIPPET: ADMIN UPDATE POLICIES FOR EXISTING DATABASES
-- ==============================================================================
-- Execute this snippet in Supabase SQL Editor to ensure all UPDATE policies are active:
/*
-- 1. Ensure helper functions resolve by user_id = auth.uid() with search_path = public, auth
CREATE OR REPLACE FUNCTION public.get_auth_restaurant_id()
RETURNS UUID AS $$
  SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS VARCHAR AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

-- 2. Restaurants UPDATE policy
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can update their restaurant" ON public.restaurants;
CREATE POLICY "Admins can update their restaurant"
ON public.restaurants FOR UPDATE
TO authenticated
USING (id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin')
WITH CHECK (id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin');

-- 3. Categories UPDATE policy
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
ON public.categories FOR UPDATE
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin')
WITH CHECK (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin');

-- 4. Products UPDATE policy
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Staff and Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
ON public.products FOR UPDATE
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin')
WITH CHECK (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin');

-- 5. Dishes table UPDATE policy (if existing database has public.dishes table)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dishes') THEN
    EXECUTE 'ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update dishes" ON public.dishes;';
    EXECUTE 'CREATE POLICY "Admins can update dishes" ON public.dishes FOR UPDATE TO authenticated USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = ''admin'') WITH CHECK (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = ''admin'');';
  END IF;
END $$;

-- 6. Tables UPDATE policy
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can update tables" ON public.tables;
DROP POLICY IF EXISTS "Staff and Admins can update tables" ON public.tables;
CREATE POLICY "Admins can update tables"
ON public.tables FOR UPDATE
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin')
WITH CHECK (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_role() = 'admin');
*/

-- ==============================================================================
-- 15. PROMOTIONS & OFFERS ENGINE (COMPLETE REBUILD & SERVER-SIDE PRICING)
-- ==============================================================================

-- 1. Ensure all columns exist on public.offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed_amount'));
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS value NUMERIC(10, 2) DEFAULT 10;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS applies_to VARCHAR(20) DEFAULT 'order' CHECK (applies_to IN ('order', 'category', 'product'));
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS target_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS target_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(10, 2);
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS active_days INT[];
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS banner_color VARCHAR(30) DEFAULT '#FF5A1F';

ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS target_product_ids UUID[] DEFAULT '{}'::UUID[];

-- Data migration: Single source of truth (is_active, start_date, end_date, target_product_ids)
UPDATE public.offers
SET is_active = COALESCE(is_active, active, true),
    start_date = COALESCE(start_date, start_at::date, CURRENT_DATE),
    end_date = COALESCE(end_date, end_at::date),
    target_product_ids = CASE
      WHEN target_product_ids IS NOT NULL AND array_length(target_product_ids, 1) > 0 THEN target_product_ids
      WHEN target_product_id IS NOT NULL THEN ARRAY[target_product_id]
      ELSE '{}'::UUID[]
    END;

-- Validation Trigger: ensure all dishes in target_product_ids belong to the offer's restaurant
CREATE OR REPLACE FUNCTION public.validate_offer_dishes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_invalid_count INT;
BEGIN
    IF NEW.applies_to = 'product' AND NEW.target_product_ids IS NOT NULL AND array_length(NEW.target_product_ids, 1) > 0 THEN
        SELECT COUNT(*)
        INTO v_invalid_count
        FROM unnest(NEW.target_product_ids) AS pid
        WHERE NOT EXISTS (
            SELECT 1 FROM public.products
            WHERE id = pid AND restaurant_id = NEW.restaurant_id
        );

        IF v_invalid_count > 0 THEN
            RAISE EXCEPTION 'INVALID_TARGET_DISHES: One or more selected dishes do not belong to this restaurant.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_offer_dishes ON public.offers;
CREATE TRIGGER trg_validate_offer_dishes
    BEFORE INSERT OR UPDATE OF applies_to, target_product_ids, restaurant_id
    ON public.offers
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_offer_dishes();

-- 2. Ensure discount columns on orders & order_items
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_total NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS applied_offers JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS complements JSONB;

-- Ensure options columns on products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS extras JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS complements JSONB DEFAULT '[]'::jsonb;

-- 3. RLS policies on public.offers
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
DROP POLICY IF EXISTS "Public can view valid active offers" ON public.offers;
DROP POLICY IF EXISTS "Anyone can view offers" ON public.offers;
DROP POLICY IF EXISTS "Admins can view all restaurant offers" ON public.offers;
DROP POLICY IF EXISTS "Admins can manage restaurant offers" ON public.offers;
DROP POLICY IF EXISTS "Admins can insert offers" ON public.offers;
DROP POLICY IF EXISTS "Admins can update offers" ON public.offers;
DROP POLICY IF EXISTS "Admins can delete offers" ON public.offers;

-- Public can view active, currently valid offers in Africa/Algiers timezone
CREATE POLICY "Public can view valid active offers"
ON public.offers FOR SELECT
TO anon, authenticated
USING (
    COALESCE(is_active, active, true) = true
    AND (start_date IS NULL OR start_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Algiers')::date)
    AND (end_date IS NULL OR end_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Algiers')::date)
);

-- Admins can view ALL offers for their restaurant (active, scheduled, expired, paused)
CREATE POLICY "Admins can view all restaurant offers"
ON public.offers FOR SELECT
TO authenticated
USING (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() = 'admin'
);

-- Admins can insert offers for their restaurant
CREATE POLICY "Admins can insert offers"
ON public.offers FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() = 'admin'
);

-- Admins can update offers for their restaurant
CREATE POLICY "Admins can update offers"
ON public.offers FOR UPDATE
TO authenticated
USING (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() = 'admin'
)
WITH CHECK (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() = 'admin'
);

-- Admins can delete offers for their restaurant
CREATE POLICY "Admins can delete offers"
ON public.offers FOR DELETE
TO authenticated
USING (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() = 'admin'
);

-- 4. Server-Side Pricing & Order Insertion Function with Full Options & Promotions Engine
DROP FUNCTION IF EXISTS public.create_order(UUID, UUID, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.create_order(
    p_restaurant_id UUID,
    p_table_id UUID,
    p_items JSONB,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_order_number TEXT;
    v_order_date DATE;
    v_table_record RECORD;
    v_item JSONB;
    v_product_id UUID;
    v_quantity INT;
    v_product_record RECORD;
    v_clean_notes TEXT;
    v_item_note TEXT;

    -- Options variables
    v_size_id TEXT;
    v_matched_size JSONB;
    v_sz JSONB;
    v_selected_size_str TEXT;

    v_extra_ids JSONB;
    v_ext_id_elem JSONB;
    v_ext_id_text TEXT;
    v_ext JSONB;
    v_matched_extra JSONB;
    v_selected_extras_json JSONB;

    v_complement_ids JSONB;
    v_c_id_elem JSONB;
    v_c_id_text TEXT;
    v_c_item JSONB;
    v_group JSONB;
    v_group_required BOOLEAN;
    v_group_selection TEXT;
    v_group_min INT;
    v_group_max INT;
    v_group_count INT;
    v_group_chosen_items JSONB;
    v_selected_complements_json JSONB;
    v_valid_complement_ids TEXT[];

    -- Pricing variables
    v_dish_unit_price NUMERIC;
    v_discounted_unit_price NUMERIC;
    v_item_discount NUMERIC;
    v_item_subtotal NUMERIC;
    v_order_subtotal NUMERIC := 0;
    v_order_discount_total NUMERIC := 0;
    v_final_total NUMERIC := 0;
    v_current_date DATE;
    v_current_dow INT;
    v_current_time TIME;
    v_applied_offers JSONB := '[]'::jsonb;
    v_offer RECORD;
    v_best_disc NUMERIC;
    v_best_offer_title TEXT;
    v_best_offer_id UUID;
    v_order_level_discount NUMERIC := 0;
    v_recent_order_count INT;
BEGIN
    -- 1. Verify restaurant exists
    IF p_restaurant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.restaurants WHERE id = p_restaurant_id) THEN
        RAISE EXCEPTION 'RESTAURANT_NOT_FOUND: Restaurant does not exist.';
    END IF;

    -- 2. Verify restaurant is open
    IF NOT public.is_restaurant_open(p_restaurant_id) THEN
        RAISE EXCEPTION 'restaurant_closed';
    END IF;

    -- 3. Verify table exists, belongs to this restaurant, and is active
    IF p_table_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_TABLE: Table ID is required.';
    END IF;

    SELECT id, table_number, active INTO v_table_record
    FROM public.tables
    WHERE id = p_table_id AND restaurant_id = p_restaurant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_TABLE: Table does not belong to this restaurant.';
    END IF;

    IF v_table_record.active = false THEN
        RAISE EXCEPTION 'TABLE_INACTIVE: This table is currently closed.';
    END IF;

    -- 4. Validate items payload is a non-empty JSONB array
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_ORDER: Cart cannot be empty.';
    END IF;

    -- 5. Anti-spam throttling: max 5 orders per table in 2 minutes
    SELECT COUNT(*) INTO v_recent_order_count
    FROM public.orders
    WHERE restaurant_id = p_restaurant_id
      AND table_id = p_table_id
      AND created_at > (NOW() - INTERVAL '2 minutes');

    IF v_recent_order_count >= 5 THEN
        RAISE EXCEPTION 'ORDER_THROTTLED: Please wait a moment before placing another order.';
    END IF;

    -- Current date, weekday (0=Sun..6=Sat), and time in Africa/Algiers
    v_current_date := (NOW() AT TIME ZONE 'Africa/Algiers')::DATE;
    v_current_dow := EXTRACT(DOW FROM (NOW() AT TIME ZONE 'Africa/Algiers'))::INT;
    v_current_time := (NOW() AT TIME ZONE 'Africa/Algiers')::TIME;

    -- 6. Insert order header with placeholder order_number (BEFORE INSERT trigger assigns daily number & order_date)
    v_clean_notes := NULLIF(SUBSTRING(TRIM(COALESCE(p_notes, '')) FROM 1 FOR 300), '');

    INSERT INTO public.orders (
        restaurant_id,
        table_id,
        table_number,
        order_number,
        status,
        customer_note,
        subtotal,
        discount_total,
        total,
        applied_offers,
        created_at,
        updated_at
    ) VALUES (
        p_restaurant_id,
        p_table_id,
        v_table_record.table_number,
        '0',
        'received',
        v_clean_notes,
        0,
        0,
        0,
        '[]'::jsonb,
        NOW(),
        NOW()
    ) RETURNING id, order_number, order_date INTO v_order_id, v_order_number, v_order_date;

    -- 7. Iterate through items and calculate authoritative prices
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        -- Product ID validation
        IF (v_item->>'product_id') ~ '^[0-9a-fA-F-]{36}$' THEN
            v_product_id := (v_item->>'product_id')::UUID;
        ELSE
            RAISE EXCEPTION 'INVALID_PRODUCT_ID: Invalid dish identifier "%"', COALESCE(v_item->>'product_id', 'null');
        END IF;

        -- Safe Quantity validation (1..50)
        IF COALESCE(v_item->>'quantity', '') !~ '^\d+$' THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Item quantity must be a whole number between 1 and 50.';
        END IF;
        v_quantity := (v_item->>'quantity')::INT;
        IF v_quantity < 1 OR v_quantity > 50 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Item quantity must be between 1 and 50.';
        END IF;

        -- Fetch product record with options jsonb arrays
        SELECT id, category_id, name_en, name_fr, name_ar, price, available,
               COALESCE(sizes, '[]'::jsonb) AS sizes,
               COALESCE(extras, '[]'::jsonb) AS extras,
               COALESCE(complements, '[]'::jsonb) AS complements
        INTO v_product_record
        FROM public.products
        WHERE id = v_product_id AND restaurant_id = p_restaurant_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PRODUCT_NOT_FOUND: One or more selected dishes do not exist in this restaurant.';
        END IF;

        IF v_product_record.available = false THEN
            RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: Item "%" is currently unavailable. Please update your cart.',
                COALESCE(v_product_record.name_ar, v_product_record.name_fr, v_product_record.name_en);
        END IF;

        -- SIZES RESOLUTION & STRICT VALIDATION
        v_size_id := NULLIF(TRIM(COALESCE(v_item->>'size_id', v_item->'selected_size'->>'id', '')), '');
        v_matched_size := NULL;
        v_selected_size_str := NULL;

        IF jsonb_typeof(v_product_record.sizes) = 'array' AND jsonb_array_length(v_product_record.sizes) > 0 THEN
            IF v_size_id IS NOT NULL THEN
                FOR v_sz IN SELECT * FROM jsonb_array_elements(v_product_record.sizes) LOOP
                    IF v_sz->>'id' = v_size_id THEN
                        v_matched_size := v_sz;
                        EXIT;
                    END IF;
                END LOOP;

                IF v_matched_size IS NULL THEN
                    RAISE EXCEPTION 'INVALID_SIZE: Selected size option "%" is no longer valid.', v_size_id;
                END IF;
            ELSE
                -- Pick default size if client omitted size_id
                FOR v_sz IN SELECT * FROM jsonb_array_elements(v_product_record.sizes) LOOP
                    IF COALESCE((v_sz->>'is_default')::boolean, false) = true THEN
                        v_matched_size := v_sz;
                        EXIT;
                    END IF;
                END LOOP;

                IF v_matched_size IS NULL THEN
                    v_matched_size := v_product_record.sizes->0;
                END IF;
            END IF;

            v_dish_unit_price := COALESCE(NULLIF(TRIM(v_matched_size->>'price'), '')::numeric, v_product_record.price);
            v_selected_size_str := LEFT(COALESCE(v_matched_size->>'name_fr', v_matched_size->>'name_en', v_matched_size->>'name_ar'), 100);
        ELSE
            IF v_size_id IS NOT NULL THEN
                RAISE EXCEPTION 'INVALID_SIZE: Selected size option "%" is no longer valid.', v_size_id;
            END IF;
            v_dish_unit_price := v_product_record.price;
            v_selected_size_str := NULL;
        END IF;

        -- EXTRAS RESOLUTION & STRICT VALIDATION
        v_extra_ids := COALESCE(v_item->'extra_ids', '[]'::jsonb);
        v_selected_extras_json := '[]'::jsonb;

        IF jsonb_typeof(v_extra_ids) = 'array' AND jsonb_array_length(v_extra_ids) > 0 THEN
            IF jsonb_typeof(v_product_record.extras) <> 'array' OR jsonb_array_length(v_product_record.extras) = 0 THEN
                RAISE EXCEPTION 'INVALID_EXTRA: Selected extra options are no longer valid.';
            END IF;

            FOR v_ext_id_elem IN SELECT * FROM jsonb_array_elements(v_extra_ids) LOOP
                v_ext_id_text := TRIM(BOTH '"' FROM v_ext_id_elem::text);
                v_matched_extra := NULL;

                FOR v_ext IN SELECT * FROM jsonb_array_elements(v_product_record.extras) LOOP
                    IF v_ext->>'id' = v_ext_id_text THEN
                        v_matched_extra := v_ext;
                        EXIT;
                    END IF;
                END LOOP;

                IF v_matched_extra IS NULL THEN
                    RAISE EXCEPTION 'INVALID_EXTRA: Selected extra "%" is no longer valid.', v_ext_id_text;
                END IF;

                IF COALESCE((v_matched_extra->>'available')::boolean, true) = false THEN
                    RAISE EXCEPTION 'EXTRA_UNAVAILABLE: Selected extra "%" is currently unavailable.',
                        COALESCE(v_matched_extra->>'name_ar', v_matched_extra->>'name_fr', v_matched_extra->>'name_en');
                END IF;

                v_dish_unit_price := v_dish_unit_price + COALESCE(NULLIF(TRIM(v_matched_extra->>'price'), '')::numeric, 0);
                v_selected_extras_json := v_selected_extras_json || jsonb_build_array(v_matched_extra);
            END LOOP;
        END IF;

        -- COMPLEMENTS RESOLUTION & STRICT VALIDATION
        v_complement_ids := COALESCE(v_item->'complement_item_ids', '[]'::jsonb);
        v_selected_complements_json := '[]'::jsonb;
        v_valid_complement_ids := '{}'::TEXT[];

        IF jsonb_typeof(v_product_record.complements) = 'array' AND jsonb_array_length(v_product_record.complements) > 0 THEN
            FOR v_group IN SELECT * FROM jsonb_array_elements(v_product_record.complements) LOOP
                v_group_required := COALESCE((v_group->>'required')::boolean, false);
                v_group_selection := COALESCE(v_group->>'selection', 'single');
                v_group_min := COALESCE((v_group->>'min')::int, 0);
                v_group_max := COALESCE((v_group->>'max')::int, 1);
                v_group_count := 0;
                v_group_chosen_items := '[]'::jsonb;

                IF jsonb_typeof(v_group->'items') = 'array' THEN
                    FOR v_c_item IN SELECT * FROM jsonb_array_elements(v_group->'items') LOOP
                        IF v_c_item->>'id' IS NOT NULL THEN
                            v_valid_complement_ids := array_append(v_valid_complement_ids, v_c_item->>'id');
                        END IF;

                        IF jsonb_typeof(v_complement_ids) = 'array' THEN
                            FOR v_c_id_elem IN SELECT * FROM jsonb_array_elements(v_complement_ids) LOOP
                                v_c_id_text := TRIM(BOTH '"' FROM v_c_id_elem::text);
                                IF v_c_item->>'id' = v_c_id_text THEN
                                    IF COALESCE((v_c_item->>'available')::boolean, true) = false THEN
                                        RAISE EXCEPTION 'COMPLEMENT_UNAVAILABLE: Selected item "%" is currently unavailable.',
                                            COALESCE(v_c_item->>'name_ar', v_c_item->>'name_fr', v_c_item->>'name_en');
                                    END IF;
                                    v_dish_unit_price := v_dish_unit_price + COALESCE(NULLIF(TRIM(v_c_item->>'price'), '')::numeric, 0);
                                    v_group_chosen_items := v_group_chosen_items || jsonb_build_array(v_c_item);
                                    v_group_count := v_group_count + 1;
                                    EXIT;
                                END IF;
                            END LOOP;
                        END IF;
                    END LOOP;
                END IF;

                -- Validation rules for complement group
                IF v_group_required AND v_group_count = 0 THEN
                    RAISE EXCEPTION 'COMPLEMENT_REQUIRED: Please select required options for "%".',
                        COALESCE(v_group->>'title_ar', v_group->>'title_fr', v_group->>'title_en', 'Options');
                END IF;

                IF v_group_selection = 'single' AND v_group_count > 1 THEN
                    RAISE EXCEPTION 'COMPLEMENT_SINGLE_VIOLATION: Only 1 selection allowed for "%".',
                        COALESCE(v_group->>'title_ar', v_group->>'title_fr', v_group->>'title_en', 'Options');
                END IF;

                IF v_group_max > 0 AND v_group_count > v_group_max THEN
                    RAISE EXCEPTION 'COMPLEMENT_MAX_EXCEEDED: Maximum % selections allowed for "%".',
                        v_group_max, COALESCE(v_group->>'title_ar', v_group->>'title_fr', v_group->>'title_en', 'Options');
                END IF;

                IF v_group_min > 0 AND v_group_count > 0 AND v_group_count < v_group_min THEN
                    RAISE EXCEPTION 'COMPLEMENT_MIN_NOT_MET: Minimum % selections required for "%".',
                        v_group_min, COALESCE(v_group->>'title_ar', v_group->>'title_fr', v_group->>'title_en', 'Options');
                END IF;

                IF v_group_count > 0 THEN
                    v_selected_complements_json := v_selected_complements_json || jsonb_build_array(jsonb_build_object(
                        'group_id', v_group->>'id',
                        'group_title_fr', v_group->>'title_fr',
                        'group_title_en', v_group->>'title_en',
                        'group_title_ar', v_group->>'title_ar',
                        'items', v_group_chosen_items
                    ));
                END IF;
            END LOOP;
        END IF;

        -- Reject unknown complement IDs sent by client
        IF jsonb_typeof(v_complement_ids) = 'array' AND jsonb_array_length(v_complement_ids) > 0 THEN
            FOR v_c_id_elem IN SELECT * FROM jsonb_array_elements(v_complement_ids) LOOP
                v_c_id_text := TRIM(BOTH '"' FROM v_c_id_elem::text);
                IF NOT (v_c_id_text = ANY(v_valid_complement_ids)) THEN
                    RAISE EXCEPTION 'INVALID_COMPLEMENT: Selected complement option "%" is no longer valid.', v_c_id_text;
                END IF;
            END LOOP;
        END IF;

        -- ITEM-LEVEL PROMOTIONS EVALUATION
        v_best_disc := 0;
        v_best_offer_title := NULL;
        v_best_offer_id := NULL;

        FOR v_offer IN
            SELECT * FROM public.offers
            WHERE restaurant_id = p_restaurant_id
              AND COALESCE(is_active, active, true) = true
              AND (start_date IS NULL OR start_date <= v_current_date)
              AND (end_date IS NULL OR end_date >= v_current_date)
              AND (active_days IS NULL OR v_current_dow = ANY(active_days))
              AND (
                  start_time IS NULL OR end_time IS NULL
                  OR (start_time <= end_time AND v_current_time >= start_time AND v_current_time <= end_time)
                  OR (start_time > end_time AND (v_current_time >= start_time OR v_current_time <= end_time))
              )
              AND applies_to IN ('product', 'category')
        LOOP
            IF v_offer.applies_to = 'product' AND (
                (v_offer.target_product_ids IS NOT NULL AND v_product_id = ANY(v_offer.target_product_ids))
                OR (v_offer.target_product_id IS NOT NULL AND v_offer.target_product_id = v_product_id)
            ) THEN
                DECLARE
                    v_calc NUMERIC := 0;
                    v_val NUMERIC := COALESCE(v_offer.value, v_offer.price, 0);
                BEGIN
                    IF v_offer.type = 'percentage' THEN
                        v_calc := ROUND((v_dish_unit_price * v_val / 100.0), 2);
                    ELSE
                        v_calc := LEAST(v_dish_unit_price, v_val);
                    END IF;
                    IF v_calc > v_best_disc THEN
                        v_best_disc := v_calc;
                        v_best_offer_title := COALESCE(v_offer.title_en, v_offer.title_fr, v_offer.title_ar, 'Discount');
                        v_best_offer_id := v_offer.id;
                    END IF;
                END;
            ELSIF v_offer.applies_to = 'category' AND v_offer.target_category_id = v_product_record.category_id THEN
                DECLARE
                    v_calc NUMERIC := 0;
                    v_val NUMERIC := COALESCE(v_offer.value, v_offer.price, 0);
                BEGIN
                    IF v_offer.type = 'percentage' THEN
                        v_calc := ROUND((v_dish_unit_price * v_val / 100.0), 2);
                    ELSE
                        v_calc := LEAST(v_dish_unit_price, v_val);
                    END IF;
                    IF v_calc > v_best_disc THEN
                        v_best_disc := v_calc;
                        v_best_offer_title := COALESCE(v_offer.title_en, v_offer.title_fr, v_offer.title_ar, 'Discount');
                        v_best_offer_id := v_offer.id;
                    END IF;
                END;
            END IF;
        END LOOP;

        v_discounted_unit_price := GREATEST(0, v_dish_unit_price - v_best_disc);
        v_item_subtotal := v_discounted_unit_price * v_quantity;
        v_item_discount := v_best_disc * v_quantity;

        v_order_subtotal := v_order_subtotal + (v_dish_unit_price * v_quantity);
        v_order_discount_total := v_order_discount_total + v_item_discount;

        IF v_best_offer_id IS NOT NULL AND v_item_discount > 0 THEN
            v_applied_offers := v_applied_offers || jsonb_build_object(
                'offer_id', v_best_offer_id,
                'title', v_best_offer_title,
                'discount_amount', v_item_discount,
                'scope', 'item'
            );
        END IF;

        v_item_note := NULLIF(SUBSTRING(TRIM(COALESCE(v_item->>'note', '')) FROM 1 FOR 150), '');

        -- Insert order item with authoritative options and prices
        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            original_price,
            discount_amount,
            selected_size,
            extras,
            complements,
            note,
            subtotal
        ) VALUES (
            v_order_id,
            v_product_id,
            LEFT(COALESCE(v_product_record.name_en, v_product_record.name_fr, v_product_record.name_ar), 255),
            v_quantity,
            v_discounted_unit_price,
            v_dish_unit_price,
            v_item_discount,
            v_selected_size_str,
            CASE WHEN jsonb_array_length(v_selected_extras_json) > 0 THEN v_selected_extras_json::text ELSE NULL END,
            CASE WHEN jsonb_array_length(v_selected_complements_json) > 0 THEN v_selected_complements_json ELSE NULL END,
            v_item_note,
            v_item_subtotal
        );
    END LOOP;

    -- 8. Check for best whole-order discount (applies_to = 'order')
    FOR v_offer IN
        SELECT * FROM public.offers
        WHERE restaurant_id = p_restaurant_id
          AND COALESCE(is_active, active, true) = true
          AND (start_date IS NULL OR start_date <= v_current_date)
          AND (end_date IS NULL OR end_date >= v_current_date)
          AND (active_days IS NULL OR v_current_dow = ANY(active_days))
          AND (
              start_time IS NULL OR end_time IS NULL
              OR (start_time <= end_time AND v_current_time >= start_time AND v_current_time <= end_time)
              OR (start_time > end_time AND (v_current_time >= start_time OR v_current_time <= end_time))
          )
          AND (min_order_amount IS NULL OR v_order_subtotal >= min_order_amount)
          AND applies_to = 'order'
    LOOP
        DECLARE
            v_calc NUMERIC := 0;
            v_val NUMERIC := COALESCE(v_offer.value, v_offer.price, 0);
            v_remaining_subtotal NUMERIC := GREATEST(0, v_order_subtotal - v_order_discount_total);
        BEGIN
            IF v_offer.type = 'percentage' THEN
                v_calc := ROUND((v_remaining_subtotal * v_val / 100.0), 2);
            ELSE
                v_calc := LEAST(v_remaining_subtotal, v_val);
            END IF;

            IF v_calc > v_order_level_discount THEN
                v_order_level_discount := v_calc;
                v_best_offer_title := COALESCE(v_offer.title_en, v_offer.title_fr, v_offer.title_ar, 'Order Discount');
                v_best_offer_id := v_offer.id;
            END IF;
        END;
    END LOOP;

    IF v_order_level_discount > 0 THEN
        v_order_discount_total := v_order_discount_total + v_order_level_discount;
        v_applied_offers := v_applied_offers || jsonb_build_object(
            'offer_id', v_best_offer_id,
            'title', v_best_offer_title,
            'discount_amount', v_order_level_discount,
            'scope', 'order'
        );
    END IF;

    -- Final total calculation (never negative)
    v_final_total := GREATEST(0, v_order_subtotal - v_order_discount_total);

    -- 9. Update order with verified subtotal, discount, total and applied offers
    UPDATE public.orders
    SET subtotal = v_order_subtotal,
        discount_total = v_order_discount_total,
        total = v_final_total,
        applied_offers = v_applied_offers,
        updated_at = NOW()
    WHERE id = v_order_id;

    RETURN jsonb_build_object(
        'id', v_order_id,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'order_date', v_order_date,
        'restaurant_id', p_restaurant_id,
        'table_id', p_table_id,
        'table_number', v_table_record.table_number,
        'subtotal', v_order_subtotal,
        'discount_total', v_order_discount_total,
        'total', v_final_total,
        'applied_offers', v_applied_offers,
        'status', 'received',
        'created_at', NOW()
    );
END;
$$;

-- 5. Updated get_order_status returning subtotal, discount_total, total, and applied_offers
CREATE OR REPLACE FUNCTION public.get_order_status(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rec RECORD;
BEGIN
    SELECT id, order_number, status, subtotal, discount_total, total, applied_offers, created_at, updated_at
    INTO v_rec
    FROM public.orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_rec.id,
        'order_number', v_rec.order_number,
        'status', v_rec.status,
        'subtotal', v_rec.subtotal,
        'discount_total', COALESCE(v_rec.discount_total, 0),
        'total', v_rec.total,
        'applied_offers', COALESCE(v_rec.applied_offers, '[]'::jsonb),
        'created_at', v_rec.created_at,
        'updated_at', v_rec.updated_at
    );
END;
$$;

-- Backwards-compatible alias for create_order_secure if called
CREATE OR REPLACE FUNCTION public.create_order_secure(
    p_restaurant_id UUID,
    p_table_id UUID,
    p_table_number INT,
    p_items JSONB,
    p_customer_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.create_order(p_restaurant_id, p_table_id, p_items, p_customer_note);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order(UUID, UUID, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_status(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_secure(UUID, UUID, INT, JSONB, TEXT) TO anon, authenticated;

-- ==============================================================================
-- 4.12 SERVER-SIDE ANALYTICS & STATS AGGREGATION FUNCTIONS
-- ==============================================================================

-- 1. Ensure performance indexes exist
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created_at ON public.orders(restaurant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS week_start_day VARCHAR(20) DEFAULT 'saturday';

-- 2. Summary KPIs (Revenue, Orders, AOV, Items, Discounts, Cancelled)
CREATE OR REPLACE FUNCTION public.get_stats_summary(
    p_from TIMESTAMPTZ,
    p_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_restaurant_id UUID;
    v_role VARCHAR;
    v_is_admin BOOLEAN;
    v_res JSONB;
BEGIN
    v_restaurant_id := public.get_auth_restaurant_id();
    v_role := public.get_auth_role();
    
    IF v_restaurant_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: No restaurant associated with session';
    END IF;

    v_is_admin := (COALESCE(v_role, 'staff') = 'admin');

    SELECT jsonb_build_object(
        'total_revenue', CASE WHEN v_is_admin THEN COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) ELSE 0 END,
        'orders_count', COALESCE(COUNT(CASE WHEN o.status != 'cancelled' THEN 1 END), 0),
        'avg_order_value', CASE 
            WHEN v_is_admin AND COUNT(CASE WHEN o.status != 'cancelled' THEN 1 END) > 0 
            THEN ROUND(COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) / COUNT(CASE WHEN o.status != 'cancelled' THEN 1 END), 2)
            ELSE 0 
        END,
        'items_sold', COALESCE((
            SELECT SUM(oi.quantity)
            FROM public.order_items oi
            JOIN public.orders o2 ON o2.id = oi.order_id
            WHERE o2.restaurant_id = v_restaurant_id
              AND o2.created_at >= p_from AND o2.created_at <= p_to
              AND o2.status != 'cancelled'
        ), 0),
        'total_discounts', CASE WHEN v_is_admin THEN COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN COALESCE(o.discount_total, 0) ELSE 0 END), 0) ELSE 0 END,
        'cancelled_orders', COALESCE(COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END), 0),
        'is_admin', v_is_admin
    ) INTO v_res
    FROM public.orders o
    WHERE o.restaurant_id = v_restaurant_id
      AND o.created_at >= p_from
      AND o.created_at <= p_to;

    RETURN COALESCE(v_res, '{}'::jsonb);
END;
$$;

-- 3. Time Series aggregation (grouped by hour, day, or week in Africa/Algiers timezone)
CREATE OR REPLACE FUNCTION public.get_stats_timeseries(
    p_from TIMESTAMPTZ,
    p_to TIMESTAMPTZ,
    p_bucket TEXT DEFAULT 'day'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_restaurant_id UUID;
    v_role VARCHAR;
    v_is_admin BOOLEAN;
    v_res JSONB;
BEGIN
    v_restaurant_id := public.get_auth_restaurant_id();
    v_role := public.get_auth_role();
    
    IF v_restaurant_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_is_admin := (COALESCE(v_role, 'staff') = 'admin');

    SELECT jsonb_agg(sub) INTO v_res
    FROM (
        SELECT 
            TO_CHAR(date_trunc(p_bucket, o.created_at AT TIME ZONE 'Africa/Algiers'), 
                CASE 
                    WHEN p_bucket = 'hour' THEN 'YYYY-MM-DD HH24:00'
                    WHEN p_bucket = 'week' THEN 'YYYY-"W"IW'
                    ELSE 'YYYY-MM-DD'
                END
            ) AS time_bucket,
            COUNT(CASE WHEN o.status != 'cancelled' THEN 1 END) AS orders_count,
            CASE WHEN v_is_admin THEN COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) ELSE 0 END AS revenue
        FROM public.orders o
        WHERE o.restaurant_id = v_restaurant_id
          AND o.created_at >= p_from
          AND o.created_at <= p_to
        GROUP BY 1
        ORDER BY 1 ASC
    ) sub;

    RETURN COALESCE(v_res, '[]'::jsonb);
END;
$$;

-- 4. Top 5 Best-Selling Dishes (quantity & revenue)
CREATE OR REPLACE FUNCTION public.get_top_products(
    p_from TIMESTAMPTZ,
    p_to TIMESTAMPTZ,
    p_limit INT DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_restaurant_id UUID;
    v_role VARCHAR;
    v_is_admin BOOLEAN;
    v_res JSONB;
BEGIN
    v_restaurant_id := public.get_auth_restaurant_id();
    v_role := public.get_auth_role();
    
    IF v_restaurant_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_is_admin := (COALESCE(v_role, 'staff') = 'admin');

    SELECT jsonb_agg(sub) INTO v_res
    FROM (
        SELECT 
            oi.product_id,
            oi.product_name,
            COALESCE(p.name_ar, oi.product_name) AS name_ar,
            COALESCE(p.name_fr, oi.product_name) AS name_fr,
            COALESCE(p.name_en, oi.product_name) AS name_en,
            p.image_url,
            SUM(oi.quantity)::INT AS quantity,
            CASE WHEN v_is_admin THEN SUM(oi.subtotal) ELSE 0 END AS revenue,
            COUNT(DISTINCT oi.order_id)::INT AS orders_count
        FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        LEFT JOIN public.products p ON p.id = oi.product_id
        WHERE o.restaurant_id = v_restaurant_id
          AND o.created_at >= p_from
          AND o.created_at <= p_to
          AND o.status != 'cancelled'
        GROUP BY oi.product_id, oi.product_name, p.name_ar, p.name_fr, p.name_en, p.image_url
        ORDER BY quantity DESC, revenue DESC
        LIMIT GREATEST(1, p_limit)
    ) sub;

    RETURN COALESCE(v_res, '[]'::jsonb);
END;
$$;

-- 5. Orders by Hour of Day (0 to 23 in Africa/Algiers)
CREATE OR REPLACE FUNCTION public.get_stats_by_hour(
    p_from TIMESTAMPTZ,
    p_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_restaurant_id UUID;
    v_role VARCHAR;
    v_is_admin BOOLEAN;
    v_res JSONB;
BEGIN
    v_restaurant_id := public.get_auth_restaurant_id();
    v_role := public.get_auth_role();
    
    IF v_restaurant_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_is_admin := (COALESCE(v_role, 'staff') = 'admin');

    SELECT jsonb_agg(sub) INTO v_res
    FROM (
        SELECT 
            EXTRACT(HOUR FROM (o.created_at AT TIME ZONE 'Africa/Algiers'))::INT AS hour,
            COUNT(CASE WHEN o.status != 'cancelled' THEN 1 END) AS orders_count,
            CASE WHEN v_is_admin THEN COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) ELSE 0 END AS revenue
        FROM public.orders o
        WHERE o.restaurant_id = v_restaurant_id
          AND o.created_at >= p_from
          AND o.created_at <= p_to
        GROUP BY 1
        ORDER BY 1 ASC
    ) sub;

    RETURN COALESCE(v_res, '[]'::jsonb);
END;
$$;

-- 6. Sales breakdown by Category
CREATE OR REPLACE FUNCTION public.get_stats_by_category(
    p_from TIMESTAMPTZ,
    p_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_restaurant_id UUID;
    v_role VARCHAR;
    v_is_admin BOOLEAN;
    v_res JSONB;
BEGIN
    v_restaurant_id := public.get_auth_restaurant_id();
    v_role := public.get_auth_role();
    
    IF v_restaurant_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_is_admin := (COALESCE(v_role, 'staff') = 'admin');

    SELECT jsonb_agg(sub) INTO v_res
    FROM (
        SELECT 
            c.id AS category_id,
            COALESCE(c.name_ar, 'أخرى') AS name_ar,
            COALESCE(c.name_fr, 'Autre') AS name_fr,
            COALESCE(c.name_en, 'Other') AS name_en,
            SUM(oi.quantity)::INT AS items_sold,
            CASE WHEN v_is_admin THEN SUM(oi.subtotal) ELSE 0 END AS revenue,
            COUNT(DISTINCT oi.order_id)::INT AS orders_count
        FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        LEFT JOIN public.products p ON p.id = oi.product_id
        LEFT JOIN public.categories c ON c.id = p.category_id
        WHERE o.restaurant_id = v_restaurant_id
          AND o.created_at >= p_from
          AND o.created_at <= p_to
          AND o.status != 'cancelled'
        GROUP BY c.id, c.name_ar, c.name_fr, c.name_en
        ORDER BY revenue DESC, items_sold DESC
    ) sub;

    RETURN COALESCE(v_res, '[]'::jsonb);
END;
$$;

-- 7. Orders distribution by Dining Table
CREATE OR REPLACE FUNCTION public.get_stats_by_table(
    p_from TIMESTAMPTZ,
    p_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_restaurant_id UUID;
    v_role VARCHAR;
    v_is_admin BOOLEAN;
    v_res JSONB;
BEGIN
    v_restaurant_id := public.get_auth_restaurant_id();
    v_role := public.get_auth_role();
    
    IF v_restaurant_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_is_admin := (COALESCE(v_role, 'staff') = 'admin');

    SELECT jsonb_agg(sub) INTO v_res
    FROM (
        SELECT 
            o.table_number,
            COUNT(CASE WHEN o.status != 'cancelled' THEN 1 END)::INT AS orders_count,
            CASE WHEN v_is_admin THEN COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) ELSE 0 END AS revenue
        FROM public.orders o
        WHERE o.restaurant_id = v_restaurant_id
          AND o.created_at >= p_from
          AND o.created_at <= p_to
        GROUP BY o.table_number
        ORDER BY orders_count DESC, revenue DESC
        LIMIT 10
    ) sub;

    RETURN COALESCE(v_res, '[]'::jsonb);
END;
$$;

-- 8. Order Status Breakdown
CREATE OR REPLACE FUNCTION public.get_stats_status_breakdown(
    p_from TIMESTAMPTZ,
    p_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_restaurant_id UUID;
    v_res JSONB;
BEGIN
    v_restaurant_id := public.get_auth_restaurant_id();
    
    IF v_restaurant_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT jsonb_agg(sub) INTO v_res
    FROM (
        SELECT 
            o.status,
            COUNT(*)::INT AS count
        FROM public.orders o
        WHERE o.restaurant_id = v_restaurant_id
          AND o.created_at >= p_from
          AND o.created_at <= p_to
        GROUP BY o.status
        ORDER BY count DESC
    ) sub;

    RETURN COALESCE(v_res, '[]'::jsonb);
END;
$$;

-- 9. Latest Orders of the Period
CREATE OR REPLACE FUNCTION public.get_stats_latest_orders(
    p_from TIMESTAMPTZ,
    p_to TIMESTAMPTZ,
    p_limit INT DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_restaurant_id UUID;
    v_role VARCHAR;
    v_is_admin BOOLEAN;
    v_res JSONB;
BEGIN
    v_restaurant_id := public.get_auth_restaurant_id();
    v_role := public.get_auth_role();
    
    IF v_restaurant_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_is_admin := (COALESCE(v_role, 'staff') = 'admin');

    SELECT jsonb_agg(sub) INTO v_res
    FROM (
        SELECT 
            o.id,
            o.order_number,
            o.table_number,
            o.status,
            CASE WHEN v_is_admin THEN o.total ELSE 0 END AS total,
            o.created_at
        FROM public.orders o
        WHERE o.restaurant_id = v_restaurant_id
          AND o.created_at >= p_from
          AND o.created_at <= p_to
        ORDER BY o.created_at DESC
        LIMIT GREATEST(1, p_limit)
    ) sub;

    RETURN COALESCE(v_res, '[]'::jsonb);
END;
$$;

-- 10. Permissions: Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_stats_summary(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stats_timeseries(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_products(TIMESTAMPTZ, TIMESTAMPTZ, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stats_by_hour(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stats_by_category(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stats_by_table(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stats_status_breakdown(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stats_latest_orders(TIMESTAMPTZ, TIMESTAMPTZ, INT) TO authenticated;




