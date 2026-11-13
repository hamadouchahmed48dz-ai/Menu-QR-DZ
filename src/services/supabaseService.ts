import { supabase, isSupabaseConfigured, deleteStorageMedia } from '../lib/supabase';
import {
  RestaurantRow,
  ProfileRow,
  CategoryRow,
  ProductRow,
  TableRow,
  OrderRow,
  OrderItemRow,
  OfferRow,
  WaiterRequestRow,
  OrderStatusDb,
} from '../types/supabase';
import {
  Restaurant,
  Category,
  Product,
  RestaurantTable,
  Order,
  CartItem,
  DishSize,
  DishExtra,
  SelectedComplement,
  Offer,
  ServiceRequest,
  OrderStatus,
  AdminUserProfile,
  AdminProfileLookupResult,
  StatsPeriod,
  WeekStartDay,
  StatsSummary,
  TimeSeriesPoint,
  TopProductStat,
  HourlyStat,
  CategoryStat,
  TableStat,
  StatusBreakdown,
  LatestOrderStat,
  FullPeriodStats,
  TeamMember,
  StaffInvite,
  CreatedStaffInviteResult,
  AcceptStaffInviteResult,
  InviteValidityDays,
  OrderHistoryResult,
} from '../types';
import { isValidUuid } from '../utils/validation';
import { normalizeInviteCode } from '../utils/teamUtils';
import { OrderRpcError, isNetworkFailure, logOrderRpcError } from '../utils/orderErrorUtils';
import {
  computeClientStats,
  getPeriodDateRange,
  calculateDelta,
  getAlgiersStartOfDayUtcIso,
  getAlgiersEndOfDayUtcIso,
  getAlgiersDateString,
} from '../utils/statistics';

export interface MutationResult<T = boolean> {
  success: boolean;
  data: T | null;
  error: { message: string; code?: string } | null;
}

// ==========================================
// DATA CONVERTERS (DB Row <-> Domain Model)
// ==========================================

export function rowToRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    tagline: {
      en: row.description || 'Artisan Gourmet Bistro',
      fr: row.description || 'Four artisanal & Gourmet',
      ar: row.description || 'مأكولات فاخرة ومشاوي شهية',
    },
    logo: row.logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=120&h=120&q=80',
    coverImage: row.cover_url || '/src/assets/images/restaurant_cover_interior_1793918997325.jpg',
    isOpen: row.is_open !== undefined && row.is_open !== null ? Boolean(row.is_open) : true,
    closedMessageAr: row.closed_message_ar || null,
    closedMessageFr: row.closed_message_fr || null,
    closedMessageEn: row.closed_message_en || null,
    reopenAt: row.reopen_at || null,
    openingHours: row.opening_hours || '11:30 - 23:30',
    phone: row.phone || '+213 (0) 550 12 34 56',
    whatsapp: row.whatsapp || '',
    address: row.address || 'Alger Centre, Algeria',
    googleMapsUrl: row.google_maps_url || '',
    currency: row.currency || 'DZD',
    currencySymbol: {
      en: row.currency === 'DZD' ? 'DA' : row.currency,
      fr: row.currency === 'DZD' ? 'DA' : row.currency,
      ar: row.currency === 'DZD' ? 'د.ج' : row.currency,
    },
    themeColor: row.theme_color || '#FF5A1F',
    weekStartDay: ((row as any).week_start_day as 'saturday' | 'sunday' | 'monday') || 'saturday',
    description: row.description || '',
    facebookUrl: row.facebook_url || null,
    instagramUrl: row.instagram_url || null,
    tiktokUrl: row.tiktok_url || null,
    youtubeUrl: row.youtube_url || null,
    snapchatUrl: row.snapchat_url || null,
    xUrl: row.x_url || null,
    telegramUrl: row.telegram_url || null,
    websiteUrl: row.website_url || null,
    publicBaseUrl: row.public_base_url || null,
  };
}

export function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: {
      en: row.name_en,
      fr: row.name_fr,
      ar: row.name_ar,
    },
    icon: row.image_url || 'Pizza',
    order: row.sort_order,
  };
}

export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    categoryId: row.category_id,
    name: {
      en: row.name_en,
      fr: row.name_fr,
      ar: row.name_ar,
    },
    description: {
      en: row.description_en || '',
      fr: row.description_fr || row.description_en || '',
      ar: row.description_ar || row.description_en || '',
    },
    price: Number(row.price),
    image: row.image_url || '/src/assets/images/dish_pizza_margherita_1793918998408.jpg',
    isAvailable: row.available,
    isPopular: row.popular,
    isNew: row.new,
    isSpicy: row.spicy,
    isVegetarian: row.vegetarian,
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    extras: Array.isArray(row.extras) ? row.extras : [],
    complements: Array.isArray(row.complements) ? row.complements : [],
  };
}

export function rowToTable(row: TableRow): RestaurantTable {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    number: row.table_number,
    label: `Table ${row.table_number}`,
    capacity: 4,
    status: row.active ? 'available' : 'occupied',
    active: row.active,
  };
}

export function rowToOffer(row: OfferRow): Offer {
  const type = (row.type as 'percentage' | 'fixed_amount') || 'percentage';
  const value = row.value != null ? Number(row.value) : (row.price != null ? Number(row.price) : 0);
  const appliesTo = (row.applies_to as 'order' | 'category' | 'product') || 'order';
  const isActive = row.is_active != null ? Boolean(row.is_active) : true;
  const startDate = row.start_date || '';
  const endDate = row.end_date || null;

  const rawProductIds: string[] = Array.isArray(row.target_product_ids)
    ? row.target_product_ids
    : row.target_product_id
    ? [row.target_product_id]
    : [];

  const discountBadge = type === 'percentage' ? `-${value}%` : `-${value} DA`;
  const validUntil = endDate ? new Date(endDate).toLocaleDateString() : 'Every day';

  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    title: {
      en: row.title_en || '',
      fr: row.title_fr || row.title_en || '',
      ar: row.title_ar || row.title_en || '',
    },
    description: {
      en: row.description_en || '',
      fr: row.description_fr || row.description_en || '',
      ar: row.description_ar || row.description_en || '',
    },
    type,
    value,
    appliesTo,
    targetCategoryId: row.target_category_id || null,
    targetProductId: rawProductIds[0] || row.target_product_id || null,
    targetProductIds: rawProductIds,
    minOrderAmount: row.min_order_amount != null ? Number(row.min_order_amount) : null,
    startDate,
    endDate,
    activeDays: row.active_days || null,
    startTime: row.start_time || null,
    endTime: row.end_time || null,
    isActive,
    bannerColor: row.banner_color || '#FF5A1F',
    imageUrl: row.image_url || null,
    createdAt: row.created_at,
    discountBadge,
    validUntil,
    price: value,
  };
}

export function rowToServiceRequest(row: WaiterRequestRow): ServiceRequest {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    tableId: row.table_id || undefined,
    tableNumber: row.table_number,
    type: row.type === 'bill_request' ? 'bill' : 'waiter',
    status: row.status,
    timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export function parseOrderItemToCartItem(it: OrderItemRow): CartItem {
  let selectedSize: DishSize | undefined;
  if (it.selected_size) {
    if (typeof it.selected_size === 'object' && it.selected_size.name_fr) {
      selectedSize = it.selected_size as DishSize;
    } else if (typeof it.selected_size === 'string') {
      try {
        if (it.selected_size.startsWith('{')) {
          selectedSize = JSON.parse(it.selected_size);
        } else {
          selectedSize = {
            id: 'sz',
            name_en: it.selected_size,
            name_fr: it.selected_size,
            name_ar: it.selected_size,
            price: 0,
            is_default: false,
          };
        }
      } catch {
        selectedSize = {
          id: 'sz',
          name_en: it.selected_size,
          name_fr: it.selected_size,
          name_ar: it.selected_size,
          price: 0,
          is_default: false,
        };
      }
    }
  }

  let selectedExtras: DishExtra[] = [];
  if (it.extras) {
    if (Array.isArray(it.extras)) {
      selectedExtras = it.extras;
    } else if (typeof it.extras === 'string') {
      try {
        if (it.extras.trim().startsWith('[')) {
          selectedExtras = JSON.parse(it.extras);
        } else {
          selectedExtras = it.extras.split(',').map((part, idx) => ({
            id: `ext_${idx}`,
            name_en: part.trim(),
            name_fr: part.trim(),
            name_ar: part.trim(),
            price: 0,
            available: true,
          }));
        }
      } catch {
        selectedExtras = [
          {
            id: 'ext_raw',
            name_en: it.extras,
            name_fr: it.extras,
            name_ar: it.extras,
            price: 0,
            available: true,
          },
        ];
      }
    }
  }

  let selectedComplements: SelectedComplement[] = [];
  if (it.complements) {
    let rawComplements = it.complements;
    if (typeof rawComplements === 'string') {
      try {
        rawComplements = JSON.parse(rawComplements);
      } catch {
        rawComplements = [];
      }
    }
    if (Array.isArray(rawComplements)) {
      selectedComplements = rawComplements.flatMap((c: any) => {
        const groupId = c.group_id || c.groupId || '';
        const groupTitle = {
          en: c.group_title_en || c.groupTitle?.en || '',
          fr: c.group_title_fr || c.groupTitle?.fr || '',
          ar: c.group_title_ar || c.groupTitle?.ar || '',
        };
        if (Array.isArray(c.items)) {
          return c.items.map((item: any) => ({
            groupId,
            groupTitle,
            itemId: item.id || item.item_id || item.itemId || '',
            name: {
              en: item.name_en || item.name?.en || '',
              fr: item.name_fr || item.name?.fr || '',
              ar: item.name_ar || item.name?.ar || '',
            },
            price: Number(item.price || 0),
          }));
        }
        return [
          {
            groupId,
            groupTitle,
            itemId: c.id || c.item_id || c.itemId || '',
            name: {
              en: c.name_en || c.name?.en || '',
              fr: c.name_fr || c.name?.fr || '',
              ar: c.name_ar || c.name?.ar || '',
            },
            price: Number(c.price || 0),
          },
        ];
      });
    }
  }

  return {
    id: it.id,
    product: {
      id: it.product_id || '',
      categoryId: '',
      name: { en: it.product_name, fr: it.product_name, ar: it.product_name },
      description: { en: '', fr: '', ar: '' },
      price: Number(it.unit_price),
      image: '/src/assets/images/dish_pizza_margherita_1793918998408.jpg',
      isAvailable: true,
    },
    quantity: it.quantity,
    selectedSize,
    selectedExtras,
    selectedComplements,
    notes: it.note || '',
    unitPrice: Number(it.unit_price),
    totalPrice: Number(it.subtotal),
  };
}

export function dbStatusToUi(status: string): OrderStatus {
  if (status === 'received') return 'new';
  if (status === 'preparing') return 'preparing';
  if (status === 'ready') return 'ready';
  if (status === 'served') return 'served';
  if (status === 'cancelled') return 'cancelled';
  return 'new';
}

export function uiStatusToDb(status: OrderStatus): OrderStatusDb {
  if (status === 'new') return 'received';
  if (status === 'preparing') return 'preparing';
  if (status === 'ready') return 'ready';
  if (status === 'served') return 'served';
  if (status === 'cancelled') return 'cancelled';
  return 'received';
}

export function rowToOrder(o: any): Order {
  const items: CartItem[] = (o.order_items || []).map(parseOrderItemToCartItem);
  return {
    id: o.id,
    restaurantId: o.restaurant_id,
    tableId: o.table_id,
    orderNumber: o.order_number,
    tableNumber: o.table_number,
    items,
    subtotal: o.subtotal != null ? Number(o.subtotal) : undefined,
    discountTotal: o.discount_total != null ? Number(o.discount_total) : 0,
    appliedOffers: o.applied_offers || [],
    total: Number(o.total),
    status: dbStatusToUi(o.status),
    createdAt: o.created_at,
    orderDate: o.order_date ?? null,
    archivedAt: o.archived_at ?? null,
    notes: o.customer_note || '',
  };
}

// ==========================================
// SUPABASE API QUERIES
// ==========================================

export const supabaseService = {
  /**
   * Fetch primary or designated restaurant by slug or fallback to first available
   */
  async getRestaurant(slug?: string): Promise<Restaurant | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      let query = supabase.from('restaurants').select('*');
      if (slug) {
        query = query.eq('slug', slug);
      }
      const { data, error } = await query.limit(1).maybeSingle();

      if (error) {
        console.warn('Supabase fetch restaurant error:', error.message);
        return null;
      }
      return data ? rowToRestaurant(data as RestaurantRow) : null;
    } catch (e) {
      console.warn('Exception in getRestaurant:', e);
      return null;
    }
  },

  /**
   * Fetch a specific restaurant by its UUID (used for admin dashboard settings)
   */
  async getRestaurantById(restaurantId: string): Promise<Restaurant | null> {
    if (!isSupabaseConfigured() || !restaurantId || !isValidUuid(restaurantId)) return null;

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .maybeSingle();

      if (error) {
        console.warn('Supabase fetch restaurant by id error:', error.message);
        return null;
      }
      return data ? rowToRestaurant(data as RestaurantRow) : null;
    } catch (e) {
      console.warn('Exception in getRestaurantById:', e);
      return null;
    }
  },

  /**
   * Fetch categories for a specific restaurant
   */
  async getCategories(restaurantId: string): Promise<Category[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data as CategoryRow[]).map(rowToCategory);
    } catch (e) {
      console.warn('Error fetching categories from Supabase:', e);
      return [];
    }
  },

  /**
   * Fetch products for a specific restaurant
   */
  async getProducts(restaurantId: string, onlyAvailable = false): Promise<Product[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true });

      if (onlyAvailable) {
        query = query.eq('available', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as ProductRow[]).map(rowToProduct);
    } catch (e) {
      console.warn('Error fetching products from Supabase:', e);
      return [];
    }
  },

  /**
   * Fetch tables for a restaurant
   */
  async getTables(restaurantId: string): Promise<RestaurantTable[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('table_number', { ascending: true });

      if (error) throw error;
      return (data as TableRow[]).map(rowToTable);
    } catch (e) {
      console.warn('Error fetching tables from Supabase:', e);
      return [];
    }
  },

  /**
   * Fetch active offers for a restaurant
   */
  async getOffers(restaurantId: string): Promise<Offer[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('[Supabase getOffers error]:', error);
        }
        throw error;
      }
      return (data as OfferRow[]).map(rowToOffer);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('Error fetching offers from Supabase:', e);
      }
      return [];
    }
  },


  /**
   * Fetch orders for the daily Kanban board:
   * - Current Africa/Algiers day (created_at >= startOfAlgiersDayUtcIso) AND archived_at IS NULL
   * - OR still open from earlier days (status IN ('received','preparing','ready')) AND archived_at IS NULL
   */
  async getDailyBoardOrders(
    restaurantId: string,
    startOfAlgiersDayUtcIso: string
  ): Promise<{ orders: Order[]; error: string | null }> {
    if (!isSupabaseConfigured() || !isValidUuid(restaurantId)) {
      return { orders: [], error: null };
    }

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurantId)
        .is('archived_at', null)
        .or(`created_at.gte.${startOfAlgiersDayUtcIso},status.in.(received,preparing,ready)`)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.warn('Error fetching daily board orders:', ordersError);
        return { orders: [], error: 'FETCH_FAILED' };
      }

      return {
        orders: (ordersData || []).map(rowToOrder),
        error: null,
      };
    } catch (e) {
      console.warn('Exception fetching daily board orders:', e);
      return { orders: [], error: 'FETCH_FAILED' };
    }
  },

  /**
   * Archive one or multiple unarchived orders by setting archived_at without altering status or deleting rows.
   */
  async archiveOrders(
    restaurantId: string,
    orderIds: string[]
  ): Promise<MutationResult<string[]>> {
    if (!isSupabaseConfigured()) {
      return { success: true, data: orderIds, error: null };
    }

    const validIds = orderIds.filter((id) => isValidUuid(id));
    if (!isValidUuid(restaurantId) || validIds.length === 0) {
      return {
        success: false,
        data: null,
        error: { message: 'INVALID_PARAMS', code: 'INVALID_PARAMS' },
      };
    }

    try {
      const archivedTimestamp = new Date().toISOString();
      const { data, error } = await supabase
        .from('orders')
        .update({ archived_at: archivedTimestamp, updated_at: archivedTimestamp })
        .eq('restaurant_id', restaurantId)
        .in('id', validIds)
        .is('archived_at', null)
        .select('id');

      if (error) {
        console.warn('Failed to archive orders:', error);
        return {
          success: false,
          data: null,
          error: { message: 'ARCHIVE_FAILED', code: error.code },
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          data: null,
          error: { message: 'ZERO_ROWS_AFFECTED', code: 'ZERO_ROWS_AFFECTED' },
        };
      }

      return {
        success: true,
        data: data.map((row: any) => row.id as string),
        error: null,
      };
    } catch (e: any) {
      console.warn('Exception archiving orders:', e);
      return {
        success: false,
        data: null,
        error: { message: 'ARCHIVE_FAILED', code: e?.code },
      };
    }
  },

  /**
   * Fetch paginated Order History (50 per page, ordered newest first) with server-side filtering
   * and an accurate day/range summary (revenue strictly computed only when isAdmin === true).
   */
  async getOrderHistory(params: {
    restaurantId: string;
    fromYmd: string;
    toYmd: string;
    status?: OrderStatus | 'all';
    search?: string;
    page: number;
    pageSize?: number;
    isAdmin: boolean;
  }): Promise<{ data: OrderHistoryResult; error: string | null }> {
    const emptyResult: OrderHistoryResult = {
      orders: [],
      totalCount: 0,
      summary: {
        ordersCount: 0,
        totalRecordsCount: 0,
        cancelledCount: 0,
        revenue: params.isAdmin ? 0 : null,
      },
    };

    if (!isSupabaseConfigured() || !isValidUuid(params.restaurantId)) {
      return { data: emptyResult, error: null };
    }

    const pageSize = params.pageSize ?? 50;
    const safePage = Math.max(0, params.page);
    const offset = safePage * pageSize;

    const fromUtc = getAlgiersStartOfDayUtcIso(params.fromYmd);
    const toUtc = getAlgiersEndOfDayUtcIso(params.toYmd);
    const cleanSearch = (params.search || '').trim().replace(/^#+/, '').replace(/[,()%\\]/g, '');

    try {
      let listQuery = supabase
        .from('orders')
        .select('*, order_items(*)', { count: 'exact' })
        .eq('restaurant_id', params.restaurantId)
        .gte('created_at', fromUtc)
        .lte('created_at', toUtc);

      if (params.status && params.status !== 'all') {
        listQuery = listQuery.eq('status', uiStatusToDb(params.status));
      }

      if (cleanSearch) {
        if (/^\d+$/.test(cleanSearch)) {
          const parsedNum = parseInt(cleanSearch, 10);
          if (!Number.isNaN(parsedNum) && parsedNum <= 2147483647) {
            listQuery = listQuery.or(
              `order_number.ilike.%${cleanSearch}%,table_number.eq.${parsedNum}`
            );
          } else {
            listQuery = listQuery.ilike('order_number', `%${cleanSearch}%`);
          }
        } else {
          listQuery = listQuery.ilike('order_number', `%${cleanSearch}%`);
        }
      }

      const { data: rows, count, error: listError } = await listQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (listError) {
        console.warn('Error fetching order history:', listError);
        return { data: emptyResult, error: 'HISTORY_FETCH_FAILED' };
      }

      // Compute summary across the full selected date range (not only the 50-row page)
      const selectCols = params.isAdmin ? 'status, total' : 'status';
      let ordersCount = 0;
      let cancelledCount = 0;
      let totalRecordsCount = 0;
      let revenue = 0;

      let summaryOffset = 0;
      const batchSize = 1000;
      while (true) {
        const { data: summaryRows, error: summaryError } = await supabase
          .from('orders')
          .select(selectCols)
          .eq('restaurant_id', params.restaurantId)
          .gte('created_at', fromUtc)
          .lte('created_at', toUtc)
          .range(summaryOffset, summaryOffset + batchSize - 1);

        if (summaryError) {
          console.warn('Error fetching order history summary:', summaryError);
          break;
        }

        const batch = summaryRows || [];
        for (const r of batch as any[]) {
          totalRecordsCount += 1;
          if (r.status === 'cancelled') {
            cancelledCount += 1;
          } else {
            ordersCount += 1;
            if (params.isAdmin) {
              revenue += Number(r.total || 0);
            }
          }
        }

        if (batch.length < batchSize) break;
        summaryOffset += batchSize;
      }

      return {
        data: {
          orders: (rows || []).map(rowToOrder),
          totalCount: count ?? (rows ? rows.length : 0),
          summary: {
            ordersCount,
            totalRecordsCount,
            cancelledCount,
            revenue: params.isAdmin ? revenue : null,
          },
        },
        error: null,
      };
    } catch (e) {
      console.warn('Exception fetching order history:', e);
      return { data: emptyResult, error: 'HISTORY_FETCH_FAILED' };
    }
  },

  /**
   * Fetch all orders with their order items for the restaurant
   */
  async getOrders(restaurantId: string): Promise<Order[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (ordersError) throw ordersError;

      return (ordersData || []).map(rowToOrder);
    } catch (e) {
      console.warn('Error fetching orders from Supabase:', e);
      return [];
    }
  },

  /**
   * Refetch a single order with its order_items by id (Requirement 2)
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    if (!isSupabaseConfigured() || !isValidUuid(orderId)) return null;

    try {
      const { data: o, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .maybeSingle();

      if (error || !o) {
        if (error) console.error('Error in getOrderById:', error);
        return null;
      }

      return rowToOrder(o);
    } catch (e) {
      console.warn('Error fetching single order from Supabase:', e);
      return null;
    }
  },

  /**
   * Fetch waiter service requests
   */
  async getWaiterRequests(restaurantId: string): Promise<ServiceRequest[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('waiter_requests')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data as WaiterRequestRow[]).map(rowToServiceRequest);
    } catch (e) {
      console.warn('Error fetching waiter requests from Supabase:', e);
      return [];
    }
  },

  /**
   * Create an Order with items in Supabase via SECURITY DEFINER create_order RPC.
   * Recalculates verified totals from database, verifies table and dishes,
   * enforces spam protection, and never relies on client-submitted prices or direct inserts.
   */
  async createOrder(
    restaurantId: string,
    tableId: string | null,
    tableNumber: number,
    items: CartItem[],
    total: number,
    customerNote?: string
  ): Promise<Order> {
    if (!isSupabaseConfigured()) {
      // Standalone Demo Mode: simulate sequential daily order locally
      const demoKey = `menuqr_demo_seq_${getAlgiersDateString()}`;
      const nextNum = (parseInt(sessionStorage.getItem(demoKey) || '4', 10) || 4) + 1;
      sessionStorage.setItem(demoKey, String(nextNum));
      return {
        id: `ord_${Date.now()}`,
        restaurantId,
        tableId: tableId || undefined,
        tableNumber,
        orderNumber: String(nextNum),
        items: [...items],
        total,
        status: 'new',
        createdAt: new Date().toISOString(),
        orderDate: getAlgiersDateString(),
        notes: customerNote,
      };
    }

    if (!isValidUuid(restaurantId)) {
      const err = new OrderRpcError('INVALID_RESTAURANT: Invalid restaurant ID.', {
        code: 'INVALID_RESTAURANT',
      });
      logOrderRpcError('supabaseService.createOrder', err);
      throw err;
    }

    if (!tableId || !isValidUuid(tableId)) {
      const err = new OrderRpcError('INVALID_TABLE: Invalid table identifier.', {
        code: 'INVALID_TABLE',
      });
      logOrderRpcError('supabaseService.createOrder', err);
      throw err;
    }

    // Prepare payload for Postgres create_order RPC (send only IDs; server recalculates prices)
    const rpcItems = items.map((it) => ({
      product_id: it.product.id,
      quantity: it.quantity,
      size_id: it.selectedSize?.id || null,
      extra_ids: it.selectedExtras ? it.selectedExtras.map((e) => e.id) : [],
      complement_item_ids: it.selectedComplements ? it.selectedComplements.map((c) => c.itemId) : [],
      note: it.notes || null,
    }));

    let rpcData: any = null;
    let rpcErr: any = null;

    try {
      const res = await supabase.rpc('create_order', {
        p_restaurant_id: restaurantId,
        p_table_id: tableId,
        p_items: rpcItems,
        p_notes: customerNote || null,
      });
      rpcData = res.data;
      rpcErr = res.error;
    } catch (networkOrThrownErr: any) {
      logOrderRpcError('supabaseService.createOrder(exception)', networkOrThrownErr);
      throw new OrderRpcError(networkOrThrownErr?.message || 'Network request failed', {
        code: networkOrThrownErr?.code,
        details: networkOrThrownErr?.details,
        hint: networkOrThrownErr?.hint,
        isNetworkError: isNetworkFailure(networkOrThrownErr),
        raw: networkOrThrownErr,
      });
    }

    if (rpcErr) {
      logOrderRpcError('supabaseService.createOrder(rpcError)', rpcErr);
      throw new OrderRpcError(rpcErr.message || 'RPC create_order failed', {
        code: rpcErr.code,
        details: rpcErr.details,
        hint: rpcErr.hint,
        isNetworkError: isNetworkFailure(rpcErr),
        raw: rpcErr,
      });
    }

    if (!rpcData) {
      const emptyErr = new OrderRpcError('Order creation returned empty result from database.', {
        code: 'EMPTY_RESPONSE',
      });
      logOrderRpcError('supabaseService.createOrder(emptyData)', emptyErr);
      throw emptyErr;
    }

    return {
      id: rpcData.id || rpcData.order_id,
      restaurantId: rpcData.restaurant_id || restaurantId,
      tableId: rpcData.table_id || tableId,
      tableNumber: rpcData.table_number || tableNumber,
      orderNumber: rpcData.order_number != null ? String(rpcData.order_number) : '',
      items: [...items],
      subtotal: rpcData.subtotal != null ? Number(rpcData.subtotal) : undefined,
      discountTotal: rpcData.discount_total != null ? Number(rpcData.discount_total) : 0,
      appliedOffers: rpcData.applied_offers || [],
      total: Number(rpcData.total ?? total),
      status: 'new',
      createdAt: rpcData.created_at || new Date().toISOString(),
      orderDate: rpcData.order_date ?? null,
      notes: customerNote || '',
    };
  },

  /**
   * Fetch order status via SECURITY DEFINER function get_order_status(p_order_id)
   * Used by customer view polling every 5s without direct read access on the orders table (Requirement 2).
   */
  async getOrderStatus(orderId: string): Promise<{
    status: OrderStatus;
    orderNumber: string;
    subtotal?: number;
    discountTotal?: number;
    total?: number;
    appliedOffers?: any[];
  } | null> {
    if (!isSupabaseConfigured() || !isValidUuid(orderId)) return null;

    try {
      const { data, error } = await supabase.rpc('get_order_status', {
        p_order_id: orderId,
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.warn(`[get_order_status ${error.code || 'RPC'}] ${error.message}`);
        }
        return null;
      }

      if (!data) return null;

      let nextStatus: OrderStatus = 'new';
      if (data.status === 'received') nextStatus = 'new';
      else if (data.status === 'preparing') nextStatus = 'preparing';
      else if (data.status === 'ready') nextStatus = 'ready';
      else if (data.status === 'served') nextStatus = 'served';
      else if (data.status === 'cancelled') nextStatus = 'cancelled';

      return {
        status: nextStatus,
        orderNumber: data.order_number != null ? String(data.order_number) : '',
        subtotal: data.subtotal != null ? Number(data.subtotal) : undefined,
        discountTotal: data.discount_total != null ? Number(data.discount_total) : 0,
        total: data.total != null ? Number(data.total) : undefined,
        appliedOffers: data.applied_offers || [],
      };
    } catch (e) {
      console.warn('Error calling get_order_status RPC:', e);
      return null;
    }
  },

  /**
   * Update order status in Supabase
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;

    let dbStatus: OrderStatusDb = 'received';
    if (status === 'new') dbStatus = 'received';
    else if (status === 'preparing') dbStatus = 'preparing';
    else if (status === 'ready') dbStatus = 'ready';
    else if (status === 'served') dbStatus = 'served';
    else if (status === 'cancelled') dbStatus = 'cancelled';

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: dbStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select('*');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Changes were not saved: permission denied or row not found');
      }
      return true;
    } catch (e) {
      console.error('Error updating order status:', e);
      return false;
    }
  },

  /**
   * Create Waiter or Bill request
  /**
   * Create Waiter or Bill request via SECURITY DEFINER create_waiter_request RPC (Requirement 3 & 7)
   */
  async createWaiterRequest(
    restaurantId: string,
    tableId: string | null,
    tableNumber: number,
    type: 'waiter' | 'bill'
  ): Promise<ServiceRequest> {
    const dbType: 'waiter_call' | 'bill_request' = type === 'bill' ? 'bill_request' : 'waiter_call';

    if (!isSupabaseConfigured()) {
      return {
        id: `req_${Date.now()}`,
        restaurantId,
        tableId: tableId || undefined,
        tableNumber,
        type,
        status: 'pending',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }

    if (!tableId || !isValidUuid(tableId)) {
      throw new Error('Invalid table identifier. Please select or scan a valid table.');
    }

    const { data: rpcData, error: rpcErr } = await supabase.rpc('create_waiter_request', {
      p_restaurant_id: restaurantId,
      p_table_id: tableId,
      p_type: dbType,
    });

    if (rpcErr) {
      console.error('Failed to create waiter request in Supabase via RPC:', rpcErr);
      const devErr = import.meta.env.DEV
        ? `[Waiter Request Error ${rpcErr.code || 'RPC'}] ${rpcErr.message}`
        : rpcErr.message;
      throw new Error(devErr);
    }

    if (!rpcData) {
      throw new Error('Waiter request returned empty response.');
    }

    return {
      id: rpcData.id,
      restaurantId: rpcData.restaurant_id || restaurantId,
      tableId: rpcData.table_id || tableId,
      tableNumber: rpcData.table_number || tableNumber,
      type: rpcData.type === 'bill_request' ? 'bill' : 'waiter',
      status: 'pending',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  },

  /**
   * Resolve a waiter request
   */
  async resolveWaiterRequest(requestId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;

    try {
      const { data, error } = await supabase
        .from('waiter_requests')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', requestId)
        .select('*');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Changes were not saved: permission denied or row not found');
      }
      return true;
    } catch (e) {
      console.error('Error resolving waiter request:', e);
      return false;
    }
  },

  /**
   * Admin: Update Restaurant Settings in Supabase
   */
  async updateRestaurant(
    restaurantId: string,
    updates: Partial<Restaurant>,
    adminProfileRestaurantId?: string
  ): Promise<MutationResult<Restaurant>> {
    if (!isSupabaseConfigured()) {
      return {
        success: true,
        data: null,
        error: null,
      };
    }

    if (!restaurantId || !isValidUuid(restaurantId)) {
      console.error('updateRestaurant: invalid or missing restaurant ID', {
        restaurantId,
        adminProfileRestaurantId,
      });
      return {
        success: false,
        data: null,
        error: {
          message: 'Changes were not saved: invalid or missing restaurant ID from admin profile',
          code: 'INVALID_RESTAURANT_ID',
        },
      };
    }

    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.openingHours !== undefined) payload.opening_hours = updates.openingHours.trim();
      if (updates.phone !== undefined) payload.phone = updates.phone.trim();
      if (updates.whatsapp !== undefined) payload.whatsapp = updates.whatsapp.trim();
      if (updates.address !== undefined) payload.address = updates.address.trim();
      if (updates.currency !== undefined) payload.currency = updates.currency.trim();
      if (updates.themeColor !== undefined) payload.theme_color = updates.themeColor;
      if (updates.logo !== undefined) payload.logo_url = updates.logo;
      if (updates.coverImage !== undefined) payload.cover_url = updates.coverImage;
      if (updates.googleMapsUrl !== undefined) payload.google_maps_url = updates.googleMapsUrl ? updates.googleMapsUrl.trim() : null;
      if (updates.weekStartDay !== undefined) payload.week_start_day = updates.weekStartDay;
      if (updates.description !== undefined) {
        payload.description = updates.description.trim();
      } else if (updates.tagline !== undefined) {
        payload.description =
          typeof updates.tagline === 'string'
            ? updates.tagline
            : updates.tagline.en || updates.tagline.fr || updates.tagline.ar || '';
      }
      if (updates.facebookUrl !== undefined) payload.facebook_url = updates.facebookUrl ? updates.facebookUrl.trim() : null;
      if (updates.instagramUrl !== undefined) payload.instagram_url = updates.instagramUrl ? updates.instagramUrl.trim() : null;
      if (updates.tiktokUrl !== undefined) payload.tiktok_url = updates.tiktokUrl ? updates.tiktokUrl.trim() : null;
      if (updates.youtubeUrl !== undefined) payload.youtube_url = updates.youtubeUrl ? updates.youtubeUrl.trim() : null;
      if (updates.snapchatUrl !== undefined) payload.snapchat_url = updates.snapchatUrl ? updates.snapchatUrl.trim() : null;
      if (updates.xUrl !== undefined) payload.x_url = updates.xUrl ? updates.xUrl.trim() : null;
      if (updates.telegramUrl !== undefined) payload.telegram_url = updates.telegramUrl ? updates.telegramUrl.trim() : null;
      if (updates.websiteUrl !== undefined) payload.website_url = updates.websiteUrl ? updates.websiteUrl.trim() : null;
      if (updates.publicBaseUrl !== undefined) payload.public_base_url = updates.publicBaseUrl ? updates.publicBaseUrl.trim() : null;

      const response = await supabase
        .from('restaurants')
        .update(payload)
        .eq('id', restaurantId)
        .select('*');

      // Requirement 3: Log the full Supabase response (data, error, status) with console.error
      console.error('Supabase updateRestaurant full response:', {
        data: response.data,
        error: response.error,
        status: response.status,
        statusText: response.statusText,
        count: response.count,
        targetRestaurantId: restaurantId,
        adminProfileRestaurantId: adminProfileRestaurantId,
      });

      if (response.error) {
        console.error('Failed to update restaurant in Supabase:', response.error);
        return {
          success: false,
          data: null,
          error: { message: response.error.message, code: response.error.code },
        };
      }

      if (!response.data || response.data.length !== 1) {
        return {
          success: false,
          data: null,
          error: {
            message: 'Changes were not saved: permission denied or row not found',
            code: 'ZERO_ROWS_AFFECTED',
          },
        };
      }

      return {
        success: true,
        data: rowToRestaurant(response.data[0] as RestaurantRow),
        error: null,
      };
    } catch (e: any) {
      console.error('Exception updating restaurant:', e);
      return {
        success: false,
        data: null,
        error: { message: e?.message || 'Unexpected error updating restaurant', code: e?.code },
      };
    }
  },

  /**
   * Set restaurant Open/Closed status via SECURITY DEFINER set_restaurant_open RPC.
   * Can be called by both Admins and Staff.
   */
  async setRestaurantOpenStatus(
    isOpen: boolean,
    messages?: { ar?: string | null; fr?: string | null; en?: string | null },
    reopenAt?: string | null
  ): Promise<MutationResult<Restaurant>> {
    if (!isSupabaseConfigured()) {
      return {
        success: true,
        data: null,
        error: null,
      };
    }

    try {
      const { data, error } = await supabase.rpc('set_restaurant_open', {
        p_open: isOpen,
        p_message_ar: isOpen ? null : (messages?.ar?.trim() || null),
        p_message_fr: isOpen ? null : (messages?.fr?.trim() || null),
        p_message_en: isOpen ? null : (messages?.en?.trim() || null),
        p_reopen_at: isOpen ? null : (reopenAt || null),
      });

      if (error) {
        console.error('set_restaurant_open RPC returned error:', error);
        return {
          success: false,
          data: null,
          error: {
            message: error.message,
            code: error.code || 'RPC_ERROR',
          },
        };
      }

      const returnedRow = data as RestaurantRow;
      return {
        success: true,
        data: returnedRow ? rowToRestaurant(returnedRow) : null,
        error: null,
      };
    } catch (err: any) {
      console.error('setRestaurantOpenStatus caught exception:', err);
      return {
        success: false,
        data: null,
        error: {
          message: err?.message || 'Error updating restaurant open/closed status',
          code: 'UNEXPECTED_ERROR',
        },
      };
    }
  },

  /**
   * Admin: Add Product to Supabase
   */
  async addProduct(
    restaurantId: string,
    product: Omit<Product, 'id'>
  ): Promise<MutationResult<Product>> {
    if (!isSupabaseConfigured()) {
      return {
        success: true,
        data: { ...product, id: `prod_${Date.now()}` } as Product,
        error: null,
      };
    }

    if (!restaurantId || !isValidUuid(restaurantId)) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Changes were not saved: invalid or missing restaurant ID from admin profile',
          code: 'INVALID_RESTAURANT_ID',
        },
      };
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          restaurant_id: restaurantId,
          category_id: product.categoryId,
          name_en: product.name.en,
          name_fr: product.name.fr,
          name_ar: product.name.ar,
          description_en: product.description.en,
          description_fr: product.description.fr,
          description_ar: product.description.ar,
          price: product.price,
          image_url: product.image,
          available: product.isAvailable,
          popular: !!product.isPopular,
          new: !!product.isNew,
          spicy: !!product.isSpicy,
          vegetarian: !!product.isVegetarian,
          sizes: product.sizes || [],
          extras: product.extras || [],
          complements: product.complements || [],
          sort_order: 1,
        })
        .select('*');

      if (error) {
        console.error('Failed to add product in Supabase:', error);
        return {
          success: false,
          data: null,
          error: { message: error.message, code: error.code },
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          data: null,
          error: {
            message: 'Changes were not saved: permission denied or row not found',
            code: 'ZERO_ROWS_AFFECTED',
          },
        };
      }

      return {
        success: true,
        data: rowToProduct(data[0] as ProductRow),
        error: null,
      };
    } catch (e: any) {
      console.error('Failed to add product in Supabase:', e);
      return {
        success: false,
        data: null,
        error: { message: e?.message || 'Unexpected error adding product', code: e?.code },
      };
    }
  },

  /**
   * Admin: Update Product in Supabase
   */
  async updateProduct(
    productId: string,
    updates: Partial<Product>,
    restaurantId?: string
  ): Promise<MutationResult<Product>> {
    if (!isSupabaseConfigured()) {
      return { success: true, data: null, error: null };
    }

    if (!productId || !isValidUuid(productId)) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Changes were not saved: invalid product ID',
          code: 'INVALID_ID',
        },
      };
    }

    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (updates.name) {
        if (updates.name.en !== undefined) payload.name_en = updates.name.en;
        if (updates.name.fr !== undefined) payload.name_fr = updates.name.fr;
        if (updates.name.ar !== undefined) payload.name_ar = updates.name.ar;
      }
      if (updates.description) {
        if (updates.description.en !== undefined) payload.description_en = updates.description.en;
        if (updates.description.fr !== undefined) payload.description_fr = updates.description.fr;
        if (updates.description.ar !== undefined) payload.description_ar = updates.description.ar;
      }
      if (updates.price !== undefined) payload.price = updates.price;
      if (updates.image !== undefined) payload.image_url = updates.image;
      if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
      if (updates.isAvailable !== undefined) payload.available = updates.isAvailable;
      if (updates.isPopular !== undefined) payload.popular = updates.isPopular;
      if (updates.isNew !== undefined) payload.new = updates.isNew;
      if (updates.isSpicy !== undefined) payload.spicy = updates.isSpicy;
      if (updates.isVegetarian !== undefined) payload.vegetarian = updates.isVegetarian;
      if (updates.sizes !== undefined) payload.sizes = updates.sizes;
      if (updates.extras !== undefined) payload.extras = updates.extras;
      if (updates.complements !== undefined) payload.complements = updates.complements;

      let query = supabase.from('products').update(payload).eq('id', productId);
      if (restaurantId && isValidUuid(restaurantId)) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query.select('*');

      if (error) {
        console.error('Failed to update product in Supabase:', error);
        return {
          success: false,
          data: null,
          error: { message: error.message, code: error.code },
        };
      }

      if (!data || data.length !== 1) {
        return {
          success: false,
          data: null,
          error: {
            message: 'Changes were not saved: permission denied or row not found',
            code: 'ZERO_ROWS_AFFECTED',
          },
        };
      }

      return {
        success: true,
        data: rowToProduct(data[0] as ProductRow),
        error: null,
      };
    } catch (e: any) {
      console.error('Failed to update product in Supabase:', e);
      return {
        success: false,
        data: null,
        error: { message: e?.message || 'Unexpected error updating product', code: e?.code },
      };
    }
  },

  /**
   * Admin: Delete Product
   */
  async deleteProduct(
    productId: string,
    restaurantId?: string
  ): Promise<MutationResult<boolean>> {
    if (!isSupabaseConfigured()) return { success: true, data: true, error: null };

    if (!productId || !isValidUuid(productId)) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Changes were not saved: invalid product ID',
          code: 'INVALID_ID',
        },
      };
    }

    try {
      let query = supabase.from('products').delete().eq('id', productId);
      if (restaurantId && isValidUuid(restaurantId)) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query.select('*');

      if (error) {
        console.error('Failed to delete product in Supabase:', error);
        return {
          success: false,
          data: null,
          error: { message: error.message, code: error.code },
        };
      }

      if (!data || data.length !== 1) {
        return {
          success: false,
          data: null,
          error: {
            message: 'Changes were not saved: permission denied or row not found',
            code: 'ZERO_ROWS_AFFECTED',
          },
        };
      }

      // Clean up storage media file if product has an uploaded image
      if (data[0]?.image_url) {
        deleteStorageMedia(data[0].image_url).catch((err) =>
          console.error('[supabaseService.deleteProduct] Failed to delete storage media:', err)
        );
      }

      return { success: true, data: true, error: null };
    } catch (e: any) {
      console.error('Failed to delete product in Supabase:', e);
      return {
        success: false,
        data: null,
        error: { message: e?.message || 'Unexpected error deleting product', code: e?.code },
      };
    }
  },

  /**
   * Admin: Add Category
   */
  async addCategory(
    restaurantId: string,
    category: Omit<Category, 'id'>
  ): Promise<MutationResult<Category>> {
    if (!isSupabaseConfigured()) {
      return {
        success: true,
        data: { ...category, id: `cat_${Date.now()}` } as Category,
        error: null,
      };
    }

    if (!restaurantId || !isValidUuid(restaurantId)) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Changes were not saved: invalid or missing restaurant ID from admin profile',
          code: 'INVALID_RESTAURANT_ID',
        },
      };
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          restaurant_id: restaurantId,
          name_en: category.name.en,
          name_fr: category.name.fr,
          name_ar: category.name.ar,
          image_url: category.icon,
          sort_order: category.order || 1,
        })
        .select('*');

      if (error) {
        console.error('Failed to add category in Supabase:', error);
        return {
          success: false,
          data: null,
          error: { message: error.message, code: error.code },
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          data: null,
          error: {
            message: 'Changes were not saved: permission denied or row not found',
            code: 'ZERO_ROWS_AFFECTED',
          },
        };
      }

      return {
        success: true,
        data: rowToCategory(data[0] as CategoryRow),
        error: null,
      };
    } catch (e: any) {
      console.error('Failed to add category in Supabase:', e);
      return {
        success: false,
        data: null,
        error: { message: e?.message || 'Unexpected error adding category', code: e?.code },
      };
    }
  },

  /**
   * Admin: Update Category
   */
  async updateCategory(
    categoryId: string,
    updates: Partial<Category>,
    restaurantId?: string
  ): Promise<MutationResult<Category>> {
    if (!isSupabaseConfigured()) return { success: true, data: null, error: null };

    if (!categoryId || !isValidUuid(categoryId)) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Changes were not saved: invalid category ID',
          code: 'INVALID_ID',
        },
      };
    }

    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (updates.name) {
        if (updates.name.en !== undefined) payload.name_en = updates.name.en;
        if (updates.name.fr !== undefined) payload.name_fr = updates.name.fr;
        if (updates.name.ar !== undefined) payload.name_ar = updates.name.ar;
      }
      if (updates.icon !== undefined) payload.image_url = updates.icon;
      if (updates.order !== undefined) payload.sort_order = updates.order;

      let query = supabase.from('categories').update(payload).eq('id', categoryId);
      if (restaurantId && isValidUuid(restaurantId)) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query.select('*');

      if (error) {
        console.error('Failed to update category in Supabase:', error);
        return {
          success: false,
          data: null,
          error: { message: error.message, code: error.code },
        };
      }

      if (!data || data.length !== 1) {
        return {
          success: false,
          data: null,
          error: {
            message: 'Changes were not saved: permission denied or row not found',
            code: 'ZERO_ROWS_AFFECTED',
          },
        };
      }

      return {
        success: true,
        data: rowToCategory(data[0] as CategoryRow),
        error: null,
      };
    } catch (e: any) {
      console.error('Failed to update category in Supabase:', e);
      return {
        success: false,
        data: null,
        error: { message: e?.message || 'Unexpected error updating category', code: e?.code },
      };
    }
  },

  /**
   * Admin: Delete Category
   */
  async deleteCategory(
    categoryId: string,
    restaurantId?: string
  ): Promise<MutationResult<boolean>> {
    if (!isSupabaseConfigured()) return { success: true, data: true, error: null };

    if (!categoryId || !isValidUuid(categoryId)) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Changes were not saved: invalid category ID',
          code: 'INVALID_ID',
        },
      };
    }

    try {
      let query = supabase.from('categories').delete().eq('id', categoryId);
      if (restaurantId && isValidUuid(restaurantId)) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query.select('*');

      if (error) {
        console.error('Failed to delete category in Supabase:', error);
        return {
          success: false,
          data: null,
          error: { message: error.message, code: error.code },
        };
      }

      if (!data || data.length !== 1) {
        return {
          success: false,
          data: null,
          error: {
            message: 'Changes were not saved: permission denied or row not found',
            code: 'ZERO_ROWS_AFFECTED',
          },
        };
      }

      return { success: true, data: true, error: null };
    } catch (e: any) {
      console.error('Failed to delete category in Supabase:', e);
      return {
        success: false,
        data: null,
        error: { message: e?.message || 'Unexpected error deleting category', code: e?.code },
      };
    }
  },

  /**
   * Admin: Add Table
   */
  async addTable(
    restaurantId: string,
    tableNumber: number
  ): Promise<MutationResult<RestaurantTable>> {
    if (!isSupabaseConfigured()) {
      return {
        success: true,
        data: {
          id: `tbl_${Date.now()}`,
          number: tableNumber,
          label: `Table ${tableNumber}`,
          capacity: 4,
          status: 'available',
          active: true,
        },
        error: null,
      };
    }

    if (!restaurantId || !isValidUuid(restaurantId)) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Changes were not saved: invalid or missing restaurant ID from admin profile',
          code: 'INVALID_RESTAURANT_ID',
        },
      };
    }

    try {
      const { data, error } = await supabase
        .from('tables')
        .insert({
          restaurant_id: restaurantId,
          table_number: tableNumber,
          active: true,
        })
        .select('*');

      if (error) {
        console.error('Failed to add table in Supabase:', error);
        return {
          success: false,
          data: null,
          error: { message: error.message, code: error.code },
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          data: null,
          error: {
            message: 'Changes were not saved: permission denied or row not found',
            code: 'ZERO_ROWS_AFFECTED',
          },
        };
      }

      return {
        success: true,
        data: rowToTable(data[0] as TableRow),
        error: null,
      };
    } catch (e: any) {
      console.error('Failed to add table in Supabase:', e);
      return {
        success: false,
        data: null,
        error: { message: e?.message || 'Unexpected error adding table', code: e?.code },
      };
    }
  },

  /**
   * Admin: Toggle or Update Table
   * Calls: supabase.from('tables').update({ active: ... }).eq('id', tableId).select().single()
   */
  async updateTable(
    tableId: string,
    updates: Partial<RestaurantTable>,
    restaurantId?: string
  ): Promise<MutationResult<RestaurantTable>> {
    if (!isSupabaseConfigured()) {
      return {
        success: true,
        data: {
          id: tableId,
          number: updates.number || 1,
          label: `Table ${updates.number || 1}`,
          capacity: 4,
          status: updates.active ? 'available' : 'occupied',
          active: updates.active !== false,
        },
        error: null,
      };
    }

    if (!tableId || !isValidUuid(tableId)) {
      console.error('Supabase updateTable rejected invalid table ID:', tableId);
      return {
        success: false,
        data: null,
        error: {
          message: `Changes were not saved: invalid table ID "${tableId}". Must be a valid UUID.`,
          code: 'INVALID_ID',
        },
      };
    }

    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (updates.number !== undefined) payload.table_number = updates.number;
      if (updates.active !== undefined) payload.active = updates.active;
      else if (updates.status !== undefined) payload.active = updates.status === 'available';

      // 5. Do not use .single() on update or delete; use .select() and check that data has length 1, and show a clear error otherwise.
      const response = await supabase
        .from('tables')
        .update(payload)
        .eq('id', tableId)
        .select('*');

      // 6. Log full Supabase response (data, error, status) with console.error
      console.error('Supabase updateTable full response:', {
        data: response.data,
        error: response.error,
        status: response.status,
        statusText: response.statusText,
        tableId,
        restaurantId,
        payload,
      });

      if (response.error) {
        console.error('Failed to update table in Supabase:', response.error);
        return {
          success: false,
          data: null,
          error: {
            message: response.error.message,
            code: response.error.code || String(response.status),
          },
        };
      }

      if (!response.data || response.data.length !== 1) {
        return {
          success: false,
          data: null,
          error: {
            message: 'Changes were not saved: permission denied or row not found',
            code: 'ZERO_ROWS_AFFECTED',
          },
        };
      }

      return {
        success: true,
        data: rowToTable(response.data[0] as TableRow),
        error: null,
      };
    } catch (e: any) {
      console.error('Exception updating table in Supabase:', e);
      return {
        success: false,
        data: null,
        error: {
          message: e?.message || 'Unexpected error updating table',
          code: e?.code || 'UNEXPECTED_ERROR',
        },
      };
    }
  },

  /**
   * Admin: Delete Table
   * Calls: supabase.from('tables').delete().eq('id', tableId).select()
   */
  async deleteTable(
    tableId: string,
    restaurantId?: string
  ): Promise<MutationResult<RestaurantTable>> {
    if (!isSupabaseConfigured()) {
      return {
        success: true,
        data: {
          id: tableId,
          number: 0,
          label: 'Deleted Table',
          capacity: 4,
          status: 'available',
          active: false,
        },
        error: null,
      };
    }

    if (!tableId || !isValidUuid(tableId)) {
      console.error('Supabase deleteTable rejected invalid table ID:', tableId);
      return {
        success: false,
        data: null,
        error: {
          message: `Changes were not saved: invalid table ID "${tableId}". Must be a valid UUID.`,
          code: 'INVALID_ID',
        },
      };
    }

    try {
      // 2. Delete: supabase.from('tables').delete().eq('id', tableId).select()
      const response = await supabase
        .from('tables')
        .delete()
        .eq('id', tableId)
        .select('*');

      // 6. Log full Supabase response (data, error, status) with console.error
      console.error('Supabase deleteTable full response:', {
        data: response.data,
        error: response.error,
        status: response.status,
        statusText: response.statusText,
        tableId,
        restaurantId,
      });

      if (response.error) {
        console.error('Failed to delete table in Supabase:', response.error);
        return {
          success: false,
          data: null,
          error: {
            message: response.error.message,
            code: response.error.code || String(response.status),
          },
        };
      }

      if (!response.data || response.data.length !== 1) {
        return {
          success: false,
          data: null,
          error: {
            message: 'Changes were not saved: permission denied or row not found',
            code: 'ZERO_ROWS_AFFECTED',
          },
        };
      }

      return {
        success: true,
        data: rowToTable(response.data[0] as TableRow),
        error: null,
      };
    } catch (e: any) {
      console.error('Exception deleting table in Supabase:', e);
      return {
        success: false,
        data: null,
        error: {
          message: e?.message || 'Unexpected error deleting table',
          code: e?.code || 'UNEXPECTED_ERROR',
        },
      };
    }
  },

  /**
   * Admin: Add Offer to Supabase
   */
  async addOffer(
    restaurantId: string,
    offer: Omit<Offer, 'id'>
  ): Promise<MutationResult<Offer>> {
    if (!isSupabaseConfigured()) {
      return {
        success: true,
        data: { ...offer, id: `off_${Date.now()}` } as Offer,
        error: null,
      };
    }

    if (!restaurantId || !isValidUuid(restaurantId)) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Changes were not saved: invalid or missing restaurant ID from admin profile',
          code: 'INVALID_RESTAURANT_ID',
        },
      };
    }

    try {
      const isActive = offer.isActive !== false;
      const targetIds = offer.targetProductIds || (offer.targetProductId ? [offer.targetProductId] : []);
      const titleEn = offer.title.en?.trim() || offer.title.fr?.trim() || offer.title.ar?.trim() || 'Special Offer';
      const titleFr = offer.title.fr?.trim() || offer.title.en?.trim() || offer.title.ar?.trim() || 'Offre Spéciale';
      const titleAr = offer.title.ar?.trim() || offer.title.fr?.trim() || offer.title.en?.trim() || 'عرض خاص';

      const { data, error } = await supabase
        .from('offers')
        .insert({
          restaurant_id: restaurantId,
          title_en: titleEn,
          title_fr: titleFr,
          title_ar: titleAr,
          description_en: offer.description?.en || '',
          description_fr: offer.description?.fr || '',
          description_ar: offer.description?.ar || '',
          type: offer.type,
          value: offer.value,
          price: offer.value, // legacy column fallback
          applies_to: offer.appliesTo,
          target_category_id: offer.targetCategoryId || null,
          target_product_id: targetIds[0] || null,
          target_product_ids: targetIds,
          min_order_amount: offer.minOrderAmount != null ? offer.minOrderAmount : null,
          start_date: offer.startDate,
          end_date: offer.endDate || null,
          start_at: offer.startDate ? `${offer.startDate}T00:00:00Z` : new Date().toISOString(),
          end_at: offer.endDate ? `${offer.endDate}T23:59:59Z` : null,
          active_days: offer.activeDays || null,
          start_time: offer.startTime || null,
          end_time: offer.endTime || null,
          is_active: isActive,
          active: isActive, // legacy column fallback
          banner_color: offer.bannerColor || '#FF5A1F',
          image_url: offer.imageUrl || null,
        })
        .select('*');

      if (error) {
        console.error('Failed to add offer in Supabase:', error);
        return {
          success: false,
          data: null,
          error: { message: error.message, code: error.code },
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          data: null,
          error: {
            message: 'Changes were not saved: permission denied or row not found',
            code: 'ZERO_ROWS_AFFECTED',
          },
        };
      }

      return {
        success: true,
        data: rowToOffer(data[0] as OfferRow),
        error: null,
      };
    } catch (e: any) {
      console.error('Failed to add offer in Supabase:', e);
      return {
        success: false,
        data: null,
        error: { message: e?.message || 'Unexpected error adding offer', code: e?.code },
      };
    }
  },

  /**
   * Admin: Update Offer in Supabase
   */
  async updateOffer(
    offerId: string,
    updates: Partial<Offer>,
    restaurantId?: string
  ): Promise<MutationResult<Offer>> {
    if (!isSupabaseConfigured()) {
      return { success: true, data: null, error: null };
    }

    if (!offerId || !isValidUuid(offerId)) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Changes were not saved: invalid offer ID',
          code: 'INVALID_ID',
        },
      };
    }

    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (updates.title) {
        if (updates.title.en !== undefined) payload.title_en = updates.title.en;
        if (updates.title.fr !== undefined) payload.title_fr = updates.title.fr;
        if (updates.title.ar !== undefined) payload.title_ar = updates.title.ar;
      }
      if (updates.description) {
        if (updates.description.en !== undefined) payload.description_en = updates.description.en;
        if (updates.description.fr !== undefined) payload.description_fr = updates.description.fr;
        if (updates.description.ar !== undefined) payload.description_ar = updates.description.ar;
      }
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.value !== undefined) {
        payload.value = updates.value;
        payload.price = updates.value; // legacy sync
      }
      if (updates.appliesTo !== undefined) payload.applies_to = updates.appliesTo;
      if (updates.targetCategoryId !== undefined) payload.target_category_id = updates.targetCategoryId;
      if (updates.targetProductIds !== undefined) {
        payload.target_product_ids = updates.targetProductIds;
        payload.target_product_id = updates.targetProductIds[0] || null;
      } else if (updates.targetProductId !== undefined) {
        payload.target_product_id = updates.targetProductId;
        payload.target_product_ids = updates.targetProductId ? [updates.targetProductId] : [];
      }
      if (updates.minOrderAmount !== undefined) payload.min_order_amount = updates.minOrderAmount;
      if (updates.startDate !== undefined) {
        payload.start_date = updates.startDate;
        payload.start_at = updates.startDate ? `${updates.startDate}T00:00:00Z` : null;
      }
      if (updates.endDate !== undefined) {
        payload.end_date = updates.endDate;
        payload.end_at = updates.endDate ? `${updates.endDate}T23:59:59Z` : null;
      }
      if (updates.activeDays !== undefined) payload.active_days = updates.activeDays;
      if (updates.startTime !== undefined) payload.start_time = updates.startTime;
      if (updates.endTime !== undefined) payload.end_time = updates.endTime;
      if (updates.isActive !== undefined) {
        payload.is_active = updates.isActive;
        payload.active = updates.isActive;
      }
      if (updates.bannerColor !== undefined) payload.banner_color = updates.bannerColor;
      if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;

      let query = supabase.from('offers').update(payload).eq('id', offerId);
      if (restaurantId && isValidUuid(restaurantId)) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query.select('*');

      if (error) {
        console.error('Failed to update offer in Supabase:', error);
        return {
          success: false,
          data: null,
          error: { message: error.message, code: error.code },
        };
      }

      if (!data || data.length !== 1) {
        return {
          success: false,
          data: null,
          error: {
            message: 'Changes were not saved: permission denied or row not found',
            code: 'ZERO_ROWS_AFFECTED',
          },
        };
      }

      return {
        success: true,
        data: rowToOffer(data[0] as OfferRow),
        error: null,
      };
    } catch (e: any) {
      console.error('Failed to update offer in Supabase:', e);
      return {
        success: false,
        data: null,
        error: { message: e?.message || 'Unexpected error updating offer', code: e?.code },
      };
    }
  },

  /**
   * Admin: Delete Offer
   */
  async deleteOffer(
    offerId: string,
    restaurantId?: string
  ): Promise<MutationResult<boolean>> {
    if (!isSupabaseConfigured()) return { success: true, data: true, error: null };

    if (!offerId || !isValidUuid(offerId)) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Changes were not saved: invalid offer ID',
          code: 'INVALID_ID',
        },
      };
    }

    try {
      let query = supabase.from('offers').delete().eq('id', offerId);
      if (restaurantId && isValidUuid(restaurantId)) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query.select('*');

      if (error) {
        console.error('Failed to delete offer in Supabase:', error);
        return {
          success: false,
          data: null,
          error: { message: error.message, code: error.code },
        };
      }

      if (!data || data.length !== 1) {
        return {
          success: false,
          data: null,
          error: {
            message: 'Changes were not saved: permission denied or row not found',
            code: 'ZERO_ROWS_AFFECTED',
          },
        };
      }

      // Clean up storage media file if offer has an uploaded image
      if (data[0]?.image_url) {
        deleteStorageMedia(data[0].image_url).catch((err) =>
          console.error('[supabaseService.deleteOffer] Failed to delete storage media:', err)
        );
      }

      return { success: true, data: true, error: null };
    } catch (e: any) {
      console.error('Failed to delete offer in Supabase:', e);
      return {
        success: false,
        data: null,
        error: { message: e?.message || 'Unexpected error deleting offer', code: e?.code },
      };
    }
  },

  /**
   * Admin: Toggle Offer Active State
   */
  async toggleOfferActive(
    offerId: string,
    isActive: boolean,
    restaurantId?: string
  ): Promise<MutationResult<Offer>> {
    return this.updateOffer(offerId, { isActive }, restaurantId);
  },

  /**
   * Detailed profile lookup: filters strictly by user_id = auth.uid(),
   * returning whether the row was found, the role, and any Supabase error.
   */
  async getAdminProfileDetailed(userId: string): Promise<AdminProfileLookupResult> {
    if (!isSupabaseConfigured() || !userId) {
      return {
        profile: null,
        found: false,
        role: null,
        error: { message: 'Supabase client is not configured or userId is empty' },
        rawRow: null,
      };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Profile lookup error from Supabase:', error.message, error.code);
        return {
          profile: null,
          found: false,
          role: null,
          error: { message: error.message, code: error.code },
          rawRow: null,
        };
      }

      if (!data) {
        return {
          profile: null,
          found: false,
          role: null,
          error: null,
          rawRow: null,
        };
      }

      // Profile row was found in Supabase!
      let restaurantName = '';
      if (data.restaurant_id) {
        try {
          const { data: restData } = await supabase
            .from('restaurants')
            .select('name')
            .eq('id', data.restaurant_id)
            .maybeSingle();
          restaurantName = restData?.name || '';
        } catch (restErr) {
          console.warn('Optional restaurant name lookup failed:', restErr);
        }
      }

      const isValidRole = data.role === 'admin' || data.role === 'staff';
      const parsedProfile: AdminUserProfile | null = isValidRole
        ? {
            id: data.id,
            userId: data.user_id,
            restaurantId: data.restaurant_id || '',
            fullName: data.full_name || 'Restaurant Admin',
            role: data.role,
            restaurantName: restaurantName || 'Restaurant',
          }
        : null;

      return {
        profile: parsedProfile,
        found: true,
        role: data.role || null,
        error: null,
        rawRow: data,
      };
    } catch (e: any) {
      console.warn('Exception during getAdminProfileDetailed:', e);
      return {
        profile: null,
        found: false,
        role: null,
        error: { message: e?.message || 'Unexpected exception during profile query' },
        rawRow: null,
      };
    }
  },

  /**
   * Admin: Load user profile and restaurant assignment.
   */
  async getAdminProfile(userId: string): Promise<AdminUserProfile | null> {
    const res = await this.getAdminProfileDetailed(userId);
    return res.profile;
  },

  /**
   * Admin: Update profile full name in profiles table
   */
  async updateAdminProfileName(
    userId: string,
    fullName: string
  ): Promise<MutationResult<{ fullName: string }>> {
    if (!isSupabaseConfigured()) {
      return { success: true, data: { fullName }, error: null };
    }

    try {
      const cleanName = fullName.trim();
      const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: cleanName })
        .eq('user_id', userId)
        .select('*');

      if (error) {
        console.error('Failed to update admin profile name in Supabase:', error);
        return {
          success: false,
          data: null,
          error: { message: error.message, code: error.code },
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          data: null,
          error: { message: 'Profile row not found or permission denied', code: 'NOT_FOUND' },
        };
      }

      return {
        success: true,
        data: { fullName: data[0].full_name },
        error: null,
      };
    } catch (e: any) {
      console.error('Exception updating admin profile name:', e);
      return {
        success: false,
        data: null,
        error: { message: e?.message || 'Failed to update profile name' },
      };
    }
  },

  /**
   * Onboarding: Call Postgres function create_restaurant(name text)
   * Creates a new restaurant, auto-provisions 6 tables, 1 starter category, and creates
   * caller's profile with role 'admin'. Returns the new restaurant ID.
   */
  async createRestaurantRPC(restaurantName: string): Promise<string> {
    if (!isSupabaseConfigured()) {
      return `rest_local_${Date.now()}`;
    }

    const { data, error } = await supabase.rpc('create_restaurant', {
      name: restaurantName.trim(),
    });

    if (error) {
      console.error('create_restaurant RPC failed:', error);
      throw error;
    }

    return data as string;
  },

  /**
   * Password Recovery: Send reset link by email
   */
  async sendPasswordReset(email: string, redirectTo?: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    try {
      const redirect = redirectTo || `${window.location.origin}/?view=admin#type=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirect,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to send password reset email' };
    }
  },

  /**
   * Update password for currently authenticated user (used during password recovery)
   */
  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to update password' };
    }
  },

  /**
   * Staff Invites: Create code-based invite via RPC create_staff_invite(p_name, p_role, p_days)
   * Returns { id, code, expires_at, role }
   */
  async createStaffInviteRPC(
    name: string | null,
    role: 'staff' | 'admin' = 'staff',
    days: InviteValidityDays = 7
  ): Promise<CreatedStaffInviteResult> {
    if (!isSupabaseConfigured()) {
      const code = `STF-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      return {
        id: `inv_${Date.now()}`,
        code,
        expires_at: new Date(Date.now() + days * 86400000).toISOString(),
        role,
      };
    }

    const cleanName = name && name.trim() ? name.trim() : null;
    const { data, error } = await supabase.rpc('create_staff_invite', {
      p_name: cleanName,
      p_role: role,
      p_days: days,
    });

    if (error) {
      console.error('create_staff_invite RPC error:', error);
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return row as CreatedStaffInviteResult;
  },

  /**
   * Staff Invites: Revoke pending invite via RPC revoke_staff_invite(p_id)
   */
  async revokeStaffInviteRPC(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase.rpc('revoke_staff_invite', {
      p_id: id,
    });

    if (error) {
      console.error('revoke_staff_invite RPC error:', error);
      throw error;
    }
  },

  /**
   * Staff Invites: Accept invite code via RPC accept_staff_invite(p_code)
   * Returns { ok, role } or { ok: false, error: 'invalid_invite' }
   * May raise 'not_authenticated', 'already_member', 'too_many_attempts'
   */
  async acceptStaffInviteRPC(code: string): Promise<AcceptStaffInviteResult> {
    if (!isSupabaseConfigured()) {
      return { ok: true, role: 'staff' };
    }

    const normalizedCode = normalizeInviteCode(code);
    const { data, error } = await supabase.rpc('accept_staff_invite', {
      p_code: normalizedCode,
    });

    if (error) {
      console.error('accept_staff_invite RPC error:', error);
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return (row || { ok: false, error: 'invalid_invite' }) as AcceptStaffInviteResult;
  },

  /**
   * Team: List team members via RPC list_team_members() (admin only)
   * Returns rows of { user_id, full_name, email, role, created_at }
   */
  async listTeamMembersRPC(): Promise<TeamMember[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase.rpc('list_team_members');
    if (error) {
      console.error('list_team_members RPC error:', error);
      throw error;
    }

    return Array.isArray(data) ? (data as TeamMember[]) : [];
  },

  /**
   * Team: Remove a member via RPC remove_team_member(p_user_id)
   * May raise 'cannot_remove_self', 'not_allowed'
   */
  async removeTeamMemberRPC(userId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase.rpc('remove_team_member', {
      p_user_id: userId,
    });

    if (error) {
      console.error('remove_team_member RPC error:', error);
      throw error;
    }
  },

  /**
   * Staff Invites: Fetch invitations from staff_invites table scoped to restaurantId
   */
  async getStaffInvites(restaurantId: string): Promise<StaffInvite[]> {
    if (!isSupabaseConfigured() || !restaurantId || !isValidUuid(restaurantId)) {
      return [];
    }

    const { data, error } = await supabase
      .from('staff_invites')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getStaffInvites query error:', error);
      throw error;
    }

    return Array.isArray(data) ? (data as StaffInvite[]) : [];
  },

  // ==========================================
  // SERVER-SIDE ANALYTICS & STATISTICS RPC
  // ==========================================

  /**
   * Fetches summary KPIs for a specific period range via get_stats_summary RPC
   */
  async getStatsSummaryRPC(fromIso: string, toIso: string): Promise<StatsSummary | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.rpc('get_stats_summary', {
        p_from: fromIso,
        p_to: toIso,
      });
      if (error) {
        console.warn('get_stats_summary RPC not available, using fallback:', error.message);
        return null;
      }
      return data;
    } catch (e) {
      console.warn('get_stats_summary RPC failed:', e);
      return null;
    }
  },

  /**
   * Fetches timeseries data (hourly, daily, weekly) via get_stats_timeseries RPC
   */
  async getStatsTimeSeriesRPC(fromIso: string, toIso: string, bucket: string): Promise<TimeSeriesPoint[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.rpc('get_stats_timeseries', {
        p_from: fromIso,
        p_to: toIso,
        p_bucket: bucket,
      });
      if (error) return null;
      return Array.isArray(data) ? data : [];
    } catch {
      return null;
    }
  },

  /**
   * Fetches top 5 products via get_top_products RPC
   */
  async getTopProductsRPC(fromIso: string, toIso: string, limit: number = 5): Promise<TopProductStat[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.rpc('get_top_products', {
        p_from: fromIso,
        p_to: toIso,
        p_limit: limit,
      });
      if (error) return null;
      return Array.isArray(data) ? data : [];
    } catch {
      return null;
    }
  },

  /**
   * Fetches orders distribution by hour via get_stats_by_hour RPC
   */
  async getStatsByHourRPC(fromIso: string, toIso: string): Promise<HourlyStat[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.rpc('get_stats_by_hour', {
        p_from: fromIso,
        p_to: toIso,
      });
      if (error) return null;
      return Array.isArray(data) ? data : [];
    } catch {
      return null;
    }
  },

  /**
   * Fetches sales breakdown by category via get_stats_by_category RPC
   */
  async getStatsByCategoryRPC(fromIso: string, toIso: string): Promise<CategoryStat[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.rpc('get_stats_by_category', {
        p_from: fromIso,
        p_to: toIso,
      });
      if (error) return null;
      return Array.isArray(data) ? data : [];
    } catch {
      return null;
    }
  },

  /**
   * Fetches sales breakdown by table via get_stats_by_table RPC
   */
  async getStatsByTableRPC(fromIso: string, toIso: string): Promise<TableStat[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.rpc('get_stats_by_table', {
        p_from: fromIso,
        p_to: toIso,
      });
      if (error) return null;
      return Array.isArray(data) ? data : [];
    } catch {
      return null;
    }
  },

  /**
   * Fetches order status breakdown via get_stats_status_breakdown RPC
   */
  async getStatsStatusBreakdownRPC(fromIso: string, toIso: string): Promise<StatusBreakdown[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.rpc('get_stats_status_breakdown', {
        p_from: fromIso,
        p_to: toIso,
      });
      if (error) return null;
      return Array.isArray(data) ? data : [];
    } catch {
      return null;
    }
  },

  /**
   * Fetches latest orders for the period via get_stats_latest_orders RPC
   */
  async getStatsLatestOrdersRPC(fromIso: string, toIso: string, limit: number = 15): Promise<LatestOrderStat[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.rpc('get_stats_latest_orders', {
        p_from: fromIso,
        p_to: toIso,
        p_limit: limit,
      });
      if (error) return null;
      return Array.isArray(data) ? data : [];
    } catch {
      return null;
    }
  },

  /**
   * High-level unified statistics fetcher.
   * Calls server-side PostgreSQL functions with zero client overload,
   * while seamlessly falling back to client-side aggregation if RPC is unavailable.
   */
  async fetchPeriodStatistics(
    period: StatsPeriod,
    weekStartDay: WeekStartDay = 'saturday',
    customStart?: string,
    customEnd?: string,
    fallbackOrders: Order[] = [],
    fallbackProducts: Product[] = [],
    isAdmin: boolean = true
  ): Promise<FullPeriodStats> {
    const range = getPeriodDateRange(period, weekStartDay, customStart, customEnd);

    if (isSupabaseConfigured()) {
      try {
        const [
          currentSummary,
          prevSummary,
          timeseries,
          topProducts,
          hourly,
          categories,
          tables,
          statuses,
          latestOrders,
        ] = await Promise.all([
          this.getStatsSummaryRPC(range.current.fromIso, range.current.toIso),
          this.getStatsSummaryRPC(range.previous.fromIso, range.previous.toIso),
          this.getStatsTimeSeriesRPC(range.current.fromIso, range.current.toIso, range.bucket),
          this.getTopProductsRPC(range.current.fromIso, range.current.toIso, 5),
          this.getStatsByHourRPC(range.current.fromIso, range.current.toIso),
          this.getStatsByCategoryRPC(range.current.fromIso, range.current.toIso),
          this.getStatsByTableRPC(range.current.fromIso, range.current.toIso),
          this.getStatsStatusBreakdownRPC(range.current.fromIso, range.current.toIso),
          this.getStatsLatestOrdersRPC(range.current.fromIso, range.current.toIso, 15),
        ]);

        if (currentSummary && prevSummary) {
          const maxProductQty = topProducts?.[0]?.quantity || 1;
          const formattedTopProducts = (topProducts || []).map((p) => ({
            ...p,
            percent: Math.min(100, Math.round((p.quantity / maxProductQty) * 100)),
          }));

          const maxTableOrders = Math.max(...(tables || []).map((t) => t.orders_count), 1);
          const formattedTables = (tables || []).map((t) => ({
            ...t,
            percent: Math.min(100, Math.round((t.orders_count / maxTableOrders) * 100)),
          }));

          const totalCatRev = (categories || []).reduce((acc, c) => acc + c.revenue, 0) || 1;
          const formattedCategories = (categories || []).map((c) => ({
            ...c,
            percent: Math.min(100, Math.round((c.revenue / totalCatRev) * 100)),
          }));

          // Fill all 24 hours if needed
          const fullHourly: HourlyStat[] = Array.from({ length: 24 }, (_, h) => {
            const found = hourly?.find((item) => item.hour === h);
            return {
              hour: h,
              orders_count: found?.orders_count || 0,
              revenue: found?.revenue || 0,
            };
          });

          return {
            summary: currentSummary,
            previousSummary: prevSummary,
            deltas: {
              revenue: calculateDelta(currentSummary.total_revenue, prevSummary.total_revenue),
              orders: calculateDelta(currentSummary.orders_count, prevSummary.orders_count),
              aov: calculateDelta(currentSummary.avg_order_value, prevSummary.avg_order_value),
              items: calculateDelta(currentSummary.items_sold, prevSummary.items_sold),
              discounts: calculateDelta(currentSummary.total_discounts, prevSummary.total_discounts),
              cancelled: calculateDelta(currentSummary.cancelled_orders, prevSummary.cancelled_orders),
            },
            timeseries: timeseries || [],
            topProducts: formattedTopProducts,
            hourly: fullHourly,
            categories: formattedCategories,
            tables: formattedTables,
            statuses: statuses || [],
            latestOrders: latestOrders || [],
            dateRangeLabel: {
              ar: range.current.labelAr,
              fr: range.current.labelFr,
              en: range.current.labelEn,
            },
            period,
            bucket: range.bucket,
          };
        }
      } catch (e) {
        console.warn('RPC statistics execution failed, falling back to client aggregation:', e);
      }
    }

    // Fallback to high-fidelity client computation
    return computeClientStats(
      fallbackOrders,
      fallbackProducts,
      period,
      weekStartDay,
      customStart,
      customEnd,
      isAdmin
    );
  },
};

