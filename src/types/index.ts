export type Language = 'en' | 'fr' | 'ar';

export interface LocalizedString {
  en: string;
  fr: string;
  ar: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug?: string;
  tagline: LocalizedString;
  logo: string;
  coverImage: string;
  isOpen: boolean;
  closedMessageAr?: string | null;
  closedMessageFr?: string | null;
  closedMessageEn?: string | null;
  reopenAt?: string | null;
  openingHours: string;
  phone: string;
  whatsapp?: string;
  address: string;
  googleMapsUrl?: string;
  currency: string;
  currencySymbol: LocalizedString;
  themeColor?: string;
  weekStartDay?: 'saturday' | 'sunday' | 'monday';
  description?: string;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  youtubeUrl?: string | null;
  snapchatUrl?: string | null;
  xUrl?: string | null;
  telegramUrl?: string | null;
  websiteUrl?: string | null;
  publicBaseUrl?: string | null;
}

export interface Category {
  id: string;
  restaurantId?: string;
  name: LocalizedString;
  icon: string;
  order: number;
}

export interface DishSize {
  id: string;
  name_ar?: string;
  name_fr?: string;
  name_en?: string;
  name?: LocalizedString;
  price?: number;
  priceOffset?: number;
  is_default?: boolean;
}

export interface DishExtra {
  id: string;
  name_ar?: string;
  name_fr?: string;
  name_en?: string;
  name?: LocalizedString;
  price: number;
  available?: boolean;
}

export interface DishComplementItem {
  id: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  price: number;
  available: boolean;
}

export interface DishComplementGroup {
  id: string;
  title_ar: string;
  title_fr: string;
  title_en: string;
  selection: 'single' | 'multiple';
  required: boolean;
  min: number;
  max: number;
  items: DishComplementItem[];
}

export interface SelectedComplement {
  groupId: string;
  groupTitle: LocalizedString;
  itemId: string;
  name: LocalizedString;
  price: number;
  items?: DishComplementItem[];
}

export function getOptionName(
  opt: { name_ar?: string; name_fr?: string; name_en?: string; name?: LocalizedString } | null | undefined,
  lang: Language
): string {
  if (!opt) return '';
  if (opt.name) {
    return opt.name[lang] || opt.name.en || opt.name.fr || opt.name.ar || '';
  }
  if (lang === 'ar' && opt.name_ar) return opt.name_ar;
  if (lang === 'fr' && opt.name_fr) return opt.name_fr;
  if (lang === 'en' && opt.name_en) return opt.name_en;
  return opt.name_fr || opt.name_en || opt.name_ar || '';
}

// Backward-compatibility aliases
export type ProductOption = DishSize;
export type ProductExtra = DishExtra;

export interface Product {
  id: string;
  restaurantId?: string;
  categoryId: string;
  name: LocalizedString;
  description: LocalizedString;
  price: number;
  image: string;
  isPopular?: boolean;
  isNew?: boolean;
  isSpicy?: boolean;
  isVegetarian?: boolean;
  isAvailable: boolean;
  sizes?: DishSize[];
  extras?: DishExtra[];
  complements?: DishComplementGroup[];
  preparationTimeMinutes?: number;
}

export interface CartItem {
  id: string; // unique item cart instance id
  product: Product;
  quantity: number;
  selectedSize?: DishSize;
  selectedExtras?: DishExtra[];
  selectedComplements?: SelectedComplement[];
  notes?: string;
  unitPrice: number;
  totalPrice: number;
}

export type OfferType = 'percentage' | 'fixed_amount';
export type OfferAppliesTo = 'order' | 'category' | 'product';

export interface AppliedOffer {
  id: string;
  title: string;
  type: OfferType;
  value: number;
  discountAmount: number;
  productId?: string;
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface Order {
  id: string;
  restaurantId?: string;
  tableId?: string;
  orderNumber: string;
  tableNumber: number;
  items: CartItem[];
  subtotal?: number;
  discountTotal?: number;
  appliedOffers?: AppliedOffer[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  orderDate?: string | null;
  archivedAt?: string | null;
  notes?: string;
  customerName?: string;
  paymentMethod?: 'cash' | 'card' | 'baridimob';
}

export interface OrderHistorySummary {
  ordersCount: number;
  totalRecordsCount: number;
  cancelledCount: number;
  revenue: number | null;
}

export interface OrderHistoryResult {
  orders: Order[];
  totalCount: number;
  summary: OrderHistorySummary;
}

export interface RestaurantTable {
  id: string;
  restaurantId?: string;
  number: number;
  label: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  active?: boolean;
}

export interface ServiceRequest {
  id: string;
  restaurantId?: string;
  tableId?: string;
  tableNumber: number;
  type: 'waiter' | 'bill' | 'water' | 'cleanup';
  status: 'pending' | 'resolved';
  timestamp: string;
  notes?: string;
}

export interface Offer {
  id: string;
  restaurantId?: string;
  title: LocalizedString;
  description: LocalizedString;
  type: OfferType;
  value: number;
  appliesTo: OfferAppliesTo;
  targetCategoryId?: string | null;
  targetProductId?: string | null;
  targetProductIds?: string[];
  minOrderAmount?: number | null;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  activeDays?: number[] | null; // 0=Sunday, 1=Monday... 6=Saturday
  startTime?: string | null; // HH:mm
  endTime?: string | null; // HH:mm
  isActive: boolean;
  bannerColor?: string;
  imageUrl?: string | null;
  createdAt?: string;
  // Legacy & convenience getters
  discountBadge?: string;
  validUntil?: string;
  code?: string;
  price?: number;
}

export interface AdminUserProfile {
  id: string;
  userId: string;
  restaurantId: string;
  fullName: string;
  role: 'admin' | 'staff';
  restaurantName?: string;
}

export interface AdminProfileLookupResult {
  profile: AdminUserProfile | null;
  found: boolean;
  role: string | null;
  error: { message: string; code?: string } | null;
  rawRow: any | null;
}

export type InviteValidityDays = 1 | 3 | 7 | 30;

export interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'staff';
  created_at: string;
}

export type StaffInviteStatus = 'pending' | 'used' | 'expired' | 'revoked';

export interface StaffInvite {
  id: string;
  restaurant_id?: string;
  code_hint: string;
  name?: string | null;
  full_name?: string | null;
  role: 'admin' | 'staff';
  status?: string | null;
  created_at: string;
  expires_at: string;
  used_at?: string | null;
  accepted_at?: string | null;
  revoked_at?: string | null;
}

export interface CreatedStaffInviteResult {
  id: string;
  code: string;
  expires_at: string;
  role: 'admin' | 'staff';
}

export interface AcceptStaffInviteResult {
  ok: boolean;
  role?: 'admin' | 'staff';
  error?: string;
}

// ==========================================
// STATISTICS & REPORTING TYPES
// ==========================================
export type StatsPeriod = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

export type WeekStartDay = 'saturday' | 'sunday' | 'monday';

export interface StatsSummary {
  total_revenue: number;
  orders_count: number;
  avg_order_value: number;
  items_sold: number;
  total_discounts: number;
  cancelled_orders: number;
  is_admin: boolean;
}

export interface MetricDelta {
  percent: number;
  isUp: boolean;
  isNeutral: boolean;
}

export interface StatsSummaryWithDelta {
  current: StatsSummary;
  previous: StatsSummary;
  deltas: {
    revenue: MetricDelta;
    orders: MetricDelta;
    aov: MetricDelta;
    items: MetricDelta;
    discounts: MetricDelta;
    cancelled: MetricDelta;
  };
}

export interface TimeSeriesPoint {
  time_bucket: string;
  orders_count: number;
  revenue: number;
}

export interface TopProductStat {
  product_id?: string;
  product_name: string;
  name_ar?: string;
  name_fr?: string;
  name_en?: string;
  image_url?: string | null;
  quantity: number;
  revenue: number;
  orders_count: number;
  percent?: number;
}

export interface HourlyStat {
  hour: number;
  orders_count: number;
  revenue: number;
}

export interface CategoryStat {
  category_id?: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  items_sold: number;
  revenue: number;
  orders_count: number;
  percent?: number;
}

export interface TableStat {
  table_number: number;
  orders_count: number;
  revenue: number;
  percent?: number;
}

export interface StatusBreakdown {
  status: OrderStatus;
  count: number;
  percent?: number;
}

export interface LatestOrderStat {
  id: string;
  order_number: string;
  order_date?: string | null;
  table_number: number;
  status: OrderStatus;
  total: number;
  created_at: string;
}

export interface FullPeriodStats {
  summary: StatsSummary;
  previousSummary: StatsSummary;
  deltas: {
    revenue: MetricDelta;
    orders: MetricDelta;
    aov: MetricDelta;
    items: MetricDelta;
    discounts: MetricDelta;
    cancelled: MetricDelta;
  };
  timeseries: TimeSeriesPoint[];
  topProducts: TopProductStat[];
  hourly: HourlyStat[];
  categories: CategoryStat[];
  tables: TableStat[];
  statuses: StatusBreakdown[];
  latestOrders: LatestOrderStat[];
  dateRangeLabel: {
    ar: string;
    fr: string;
    en: string;
  };
  period: StatsPeriod;
  bucket: 'hour' | 'day' | 'week';
}

