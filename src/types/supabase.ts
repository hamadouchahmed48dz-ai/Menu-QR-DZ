// Database Table Row Interfaces matching the Supabase PostgreSQL Schema

export interface RestaurantRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  currency: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  google_maps_url: string | null;
  opening_hours: string | null;
  theme_color: string | null;
  is_open?: boolean;
  closed_message_ar?: string | null;
  closed_message_fr?: string | null;
  closed_message_en?: string | null;
  reopen_at?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  snapchat_url?: string | null;
  x_url?: string | null;
  telegram_url?: string | null;
  website_url?: string | null;
  public_base_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  user_id: string;
  restaurant_id: string;
  full_name: string;
  role: 'admin' | 'staff';
  created_at: string;
}

export interface CategoryRow {
  id: string;
  restaurant_id: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  restaurant_id: string;
  category_id: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  description_ar: string | null;
  description_fr: string | null;
  description_en: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  popular: boolean;
  new: boolean;
  spicy: boolean;
  vegetarian: boolean;
  sizes?: any;
  extras?: any;
  complements?: any;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TableRow {
  id: string;
  restaurant_id: string;
  table_number: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type OrderStatusDb = 'received' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface OrderRow {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  table_number: number;
  order_number: string;
  status: OrderStatusDb;
  customer_note: string | null;
  subtotal?: number | null;
  discount_total?: number | null;
  applied_offers?: any;
  total: number;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  order_date?: string | null;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  selected_size: any;
  extras: any;
  complements?: any;
  note: string | null;
  subtotal: number;
  original_price?: number | null;
  discount_amount?: number | null;
}

export interface OfferRow {
  id: string;
  restaurant_id: string;
  title_ar: string;
  title_fr: string;
  title_en: string;
  description_ar: string | null;
  description_fr: string | null;
  description_en: string | null;
  type?: 'percentage' | 'fixed_amount';
  value?: number;
  applies_to?: 'order' | 'category' | 'product';
  target_category_id?: string | null;
  target_product_id?: string | null;
  target_product_ids?: string[] | null;
  min_order_amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  active_days?: number[] | null;
  start_time?: string | null;
  end_time?: string | null;
  is_active?: boolean;
  banner_color?: string | null;
  image_url: string | null;
  price: number | null;
  active: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at?: string;
}

export type WaiterRequestType = 'waiter_call' | 'bill_request';
export type WaiterRequestStatus = 'pending' | 'resolved';

export interface WaiterRequestRow {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  table_number: number;
  type: WaiterRequestType;
  status: WaiterRequestStatus;
  created_at: string;
  resolved_at: string | null;
}
