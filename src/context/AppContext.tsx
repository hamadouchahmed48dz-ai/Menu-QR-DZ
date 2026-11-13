import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Language,
  Restaurant,
  Category,
  Product,
  RestaurantTable,
  Order,
  CartItem,
  DishSize,
  DishExtra,
  SelectedComplement,
  ProductOption,
  ProductExtra,
  OrderStatus,
  ServiceRequest,
  Offer,
  AdminUserProfile,
  TeamMember,
  StaffInvite,
  InviteValidityDays,
  CreatedStaffInviteResult,
} from '../types';
import { translateTeamError, normalizeInviteCode } from '../utils/teamUtils';
import {
  INITIAL_RESTAURANT,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_TABLES,
  INITIAL_ORDERS,
  INITIAL_OFFERS,
} from '../data/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { supabaseService, rowToServiceRequest, rowToRestaurant } from '../services/supabaseService';
import type { RestaurantRow } from '../types/supabase';
import { isRestaurantCurrentlyOpen } from '../utils/restaurantStatus';
import { soundAlert } from '../utils/soundAlert';
import {
  validateCartIntegrity,
  validateCustomerNotes,
  validateQuantity,
  isValidUuid,
} from '../utils/validation';
import { isValidStatusTransition } from '../utils/orderLifecycle';
import { OrderRpcError, logOrderRpcError, translateOrderError } from '../utils/orderErrorUtils';
import { updateDocumentSeo } from '../utils/seo';
import { translations } from '../utils/translations';
import {
  loadTableSession,
  saveTableSession,
  clearTableSession,
  parseTableUrlParam,
} from '../utils/tableSession';
import { getAlgiersStartOfDayUtcIso } from '../utils/statistics';
import type { User } from '@supabase/supabase-js';
import { ConfirmModal } from '../components/common/ConfirmModal';

interface AppContextType {
  // Localization & Theme
  lang: Language;
  setLang: (lang: Language) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Supabase Connection & Multi-Restaurant Auth
  isSupabaseLive: boolean;
  isAuthLoading: boolean;
  user: User | null;
  adminProfile: AdminUserProfile | null;
  userRole: 'admin' | 'staff';
  signInAdmin: (
    email: string,
    pass: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUpAdmin: (
    email: string,
    pass: string,
    fullName: string,
    restaurantName: string,
    pin: string
  ) => Promise<{ success: boolean; error?: string; requireEmailConfirmation?: boolean; message?: string }>;
  signUpStaff: (
    email: string,
    pass: string,
    fullName: string
  ) => Promise<{ success: boolean; error?: string; requireEmailConfirmation?: boolean; message?: string }>;
  signOutAdmin: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateAdminProfileName: (newName: string) => Promise<boolean>;
  isPasswordRecoveryMode: boolean;
  setIsPasswordRecoveryMode: (active: boolean) => void;
  isPendingProfile: boolean;
  createStaffInvite: (
    name: string | null,
    role?: 'staff' | 'admin',
    days?: InviteValidityDays
  ) => Promise<{ success: boolean; invite?: CreatedStaffInviteResult; error?: string }>;
  revokeStaffInvite: (inviteId: string) => Promise<{ success: boolean; error?: string }>;
  acceptStaffInvite: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeTeamMember: (userId: string) => Promise<{ success: boolean; error?: string }>;
  teamMembers: TeamMember[];
  teamInvites: StaffInvite[];
  isTeamLoading: boolean;
  teamError: string | null;
  loadTeamData: () => Promise<void>;
  currentRestaurantId: string;
  setCurrentRestaurantId: (id: string) => void;

  // Sound Alerts
  isSoundEnabled: boolean;
  setIsSoundEnabled: (enabled: boolean) => void;
  playTestChime: () => void;
  highlightedOrderId: string | null;
  latestRealtimeOrder: { orderId: string; restaurantId: string; ts: number } | null;

  // View Navigation
  currentView: 'menu' | 'admin' | 'qr_print';
  setCurrentView: (view: 'menu' | 'admin' | 'qr_print') => void;
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: (auth: boolean) => void;

  // Table & Security
  activeTable: number | null;
  setActiveTable: (tableNumber: number | null) => void;
  activeTableRecord: RestaurantTable | null;
  hasValidTable: boolean;
  tables: RestaurantTable[];
  addTable: (tableNumber: number) => Promise<boolean>;
  updateTable: (id: string, updates: Partial<RestaurantTable>) => Promise<boolean>;
  deleteTable: (id: string) => Promise<boolean>;
  isTableInvalid: boolean;
  isRestaurantNotFound: boolean;
  restaurantErrorMessage: string | null;

  // Restaurant & Catalog Data
  restaurant: Restaurant;
  isRestaurantOpen: boolean;
  updateRestaurant: (updates: Partial<Restaurant>) => Promise<boolean>;
  setRestaurantStatus: (
    isOpen: boolean,
    messages?: { ar?: string | null; fr?: string | null; en?: string | null },
    reopenAt?: string | null
  ) => Promise<boolean>;
  refreshRestaurantStatus: () => Promise<void>;
  categories: Category[];
  addCategory: (cat: Omit<Category, 'id'>) => Promise<Category | null>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  reorderCategories: (newCategories: Category[]) => void;

  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  toggleProductAvailability: (id: string) => Promise<boolean>;

  offers: Offer[];
  addOffer: (offer: Omit<Offer, 'id'>) => Promise<Offer | null>;
  updateOffer: (id: string, updates: Partial<Offer>) => Promise<boolean>;
  deleteOffer: (id: string) => Promise<boolean>;
  toggleOffer: (id: string) => Promise<boolean>;

  // Cart & Order Integrity
  cart: CartItem[];
  addToCart: (
    product: Product,
    quantity?: number,
    selectedSize?: DishSize,
    selectedExtras?: DishExtra[],
    selectedComplements?: SelectedComplement[],
    notes?: string
  ) => void;
  updateCartItemQuantity: (cartItemId: string, delta: number) => void;
  removeCartItem: (cartItemId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isSubmittingOrder: boolean;

  // Product Detail Modal
  selectedProductForDetail: Product | null;
  setSelectedProductForDetail: (product: Product | null) => void;

  // Orders & Realtime Status
  orders: Order[];
  demoAllOrders: Order[];
  isOrdersLoading: boolean;
  ordersError: string | null;
  ordersLastUpdated: Date;
  refreshDailyOrders: () => Promise<void>;
  archiveOrders: (orderIds: string[]) => Promise<{ success: boolean; archivedCount: number; error?: string }>;
  activeOrder: Order | null;
  setActiveOrder: (order: Order | null) => void;
  placeOrder: (notes?: string, customerName?: string) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  isOrderStatusOpen: boolean;
  setIsOrderStatusOpen: (open: boolean) => void;

  // Waiter & Service Requests
  serviceRequests: ServiceRequest[];
  callWaiter: (type: 'waiter' | 'bill' | 'water' | 'cleanup', notes?: string) => Promise<void>;
  resolveServiceRequest: (id: string) => Promise<void>;

  // Toast / notification
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Onboarding Checklist
  isOnboardingChecklistOpen: boolean;
  setIsOnboardingChecklistOpen: (open: boolean) => void;
  dismissOnboardingChecklist: () => void;
  onboardingStatus: {
    hasLogo: boolean;
    hasDishes: boolean;
    hasPrintedQR: boolean;
    completedCount: number;
    totalCount: number;
    isAllDone: boolean;
  };

  // In-App Confirmation Modal
  confirmAction: (options: {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
  }) => Promise<boolean>;
  realtimeStatus: 'connected' | 'reconnecting' | 'disconnected';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isSupabaseLive = isSupabaseConfigured();

  // Localization & RTL
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('menuqr_lang');
    return (saved as Language) || 'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('menuqr_lang', newLang);
  };

  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('menuqr_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    localStorage.setItem('menuqr_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  // View state & navigation
  const [currentView, setCurrentViewState] = useState<'menu' | 'admin' | 'qr_print'>('menu');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAdminAuthenticated, setIsAdminAuthenticatedState] = useState<boolean>(() => {
    return localStorage.getItem('menuqr_admin_auth') === 'true';
  });

  const setIsAdminAuthenticated = (auth: boolean) => {
    setIsAdminAuthenticatedState(auth);
    if (auth) {
      localStorage.setItem('menuqr_admin_auth', 'true');
    } else {
      localStorage.removeItem('menuqr_admin_auth');
    }
  };

  const setCurrentView = (view: 'menu' | 'admin' | 'qr_print') => {
    setCurrentViewState(view);
    try {
      const url = new URL(window.location.href);
      if (view === 'admin') {
        url.searchParams.set('view', 'admin');
      } else if (view === 'qr_print') {
        url.searchParams.set('view', 'qr_print');
      } else {
        url.searchParams.delete('view');
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      // Ignore if iframe environment restricts history
    }
  };

  // Supabase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUserProfile | null>(null);
  const userRole: 'admin' | 'staff' = adminProfile?.role || 'admin';
  const isPendingProfile = Boolean(user && !adminProfile);

  // Password Recovery Mode
  const [isPasswordRecoveryMode, setIsPasswordRecoveryMode] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
  });

  // Team & Staff Management
  const [latestRealtimeOrder, setLatestRealtimeOrder] = useState<{
    orderId: string;
    restaurantId: string;
    ts: number;
  } | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamInvites, setTeamInvites] = useState<StaffInvite[]>([]);
  const [isTeamLoading, setIsTeamLoading] = useState<boolean>(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Active Restaurant ID
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string>(() => {
    return isSupabaseLive ? '' : 'rest_younes_01';
  });

  const [isRestaurantNotFound, setIsRestaurantNotFound] = useState<boolean>(false);
  const [restaurantErrorMessage, setRestaurantErrorMessage] = useState<string | null>(null);

  // Restaurant data: in live Supabase mode, NEVER use demo data or ids
  const [restaurant, setRestaurant] = useState<Restaurant>(() => {
    if (isSupabaseLive) {
      return {
        id: '',
        name: '',
        slug: '',
        tagline: { en: '', fr: '', ar: '' },
        logo: '',
        coverImage: '/src/assets/images/restaurant_cover_interior_1793918997325.jpg',
        isOpen: true,
        openingHours: '11:30 - 23:30',
        phone: '',
        address: '',
        currency: 'DZD',
        currencySymbol: { en: 'DA', fr: 'DA', ar: 'د.ج' },
        themeColor: '#FF5A1F',
      };
    }
    return INITIAL_RESTAURANT;
  });

  const [categories, setCategories] = useState<Category[]>(() => (isSupabaseLive ? [] : INITIAL_CATEGORIES));
  const [products, setProducts] = useState<Product[]>(() => (isSupabaseLive ? [] : INITIAL_PRODUCTS));
  const [tables, setTables] = useState<RestaurantTable[]>(() => (isSupabaseLive ? [] : INITIAL_TABLES));
  const [offers, setOffers] = useState<Offer[]>(() => (isSupabaseLive ? [] : INITIAL_OFFERS));
  const [orders, setOrders] = useState<Order[]>(() => (isSupabaseLive ? [] : INITIAL_ORDERS));
  const [demoAllOrders, setDemoAllOrders] = useState<Order[]>(() => (isSupabaseLive ? [] : INITIAL_ORDERS));
  const [isOrdersLoading, setIsOrdersLoading] = useState<boolean>(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersLastUpdated, setOrdersLastUpdated] = useState<Date>(() => new Date());
  const ordersRefreshInFlightRef = useRef<Promise<void> | null>(null);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);

  // Sound Alerts & Order Highlights
  const [isSoundEnabled, setSoundEnabledState] = useState<boolean>(soundAlert.isEnabled());
  const setIsSoundEnabled = (enabled: boolean) => {
    soundAlert.setSoundEnabled(enabled);
    setSoundEnabledState(enabled);
  };
  const playTestChime = () => soundAlert.playNewOrderChime();
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

  // Connection state for Supabase Realtime in Admin Dashboard (Requirement 3)
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');

  // Table Selection & Security Validation (QR-only + sessionStorage with 3h TTL)
  const lastHandledQrToastRef = useRef<string | null>(null);
  const demoSwitchToastMsgRef = useRef<string | null>(null);
  const [isTablesReady, setIsTablesReady] = useState<boolean>(() => !isSupabaseLive);

  const [initialDemoResolution] = useState<{
    tableNumber: number | null;
    tableRecord: RestaurantTable | null;
    isInvalid: boolean;
    switchToastTable: number | null;
  }>(() => {
    if (isSupabaseLive) {
      return { tableNumber: null, tableRecord: null, isInvalid: false, switchToastTable: null };
    }
    const demoSlug = INITIAL_RESTAURANT.slug || INITIAL_RESTAURANT.id;
    const params = new URLSearchParams(window.location.search);
    const parsedUrl = parseTableUrlParam(params.get('table'));

    if (parsedUrl.present) {
      if (parsedUrl.malformed || parsedUrl.tableNumber === null) {
        clearTableSession(demoSlug);
        return { tableNumber: null, tableRecord: null, isInvalid: true, switchToastTable: null };
      }
      const match = INITIAL_TABLES.find((t) => t.number === parsedUrl.tableNumber);
      const belongs = match ? (!match.restaurantId || match.restaurantId === INITIAL_RESTAURANT.id) : false;
      if (match && match.active !== false && belongs) {
        const prevStored = loadTableSession(demoSlug);
        saveTableSession(demoSlug, match.number);
        const switched = prevStored !== null && prevStored !== match.number ? match.number : null;
        return { tableNumber: match.number, tableRecord: match, isInvalid: false, switchToastTable: switched };
      }
      clearTableSession(demoSlug);
      return { tableNumber: parsedUrl.tableNumber, tableRecord: null, isInvalid: true, switchToastTable: null };
    }

    const stored = loadTableSession(demoSlug);
    if (stored !== null) {
      const match = INITIAL_TABLES.find((t) => t.number === stored);
      const belongs = match ? (!match.restaurantId || match.restaurantId === INITIAL_RESTAURANT.id) : false;
      if (match && match.active !== false && belongs) {
        return { tableNumber: match.number, tableRecord: match, isInvalid: false, switchToastTable: null };
      }
      clearTableSession(demoSlug);
    }

    return { tableNumber: null, tableRecord: null, isInvalid: false, switchToastTable: null };
  });

  const [activeTable, setActiveTableState] = useState<number | null>(() => initialDemoResolution.tableNumber);
  const [activeTableRecord, setActiveTableRecord] = useState<RestaurantTable | null>(
    () => initialDemoResolution.tableRecord
  );
  const [isTableInvalid, setIsTableInvalid] = useState<boolean>(() => initialDemoResolution.isInvalid);

  const validateTableState = useCallback(
    (tableNum: number | null, tableList: RestaurantTable[]) => {
      if (!isTablesReady) return;

      const params = new URLSearchParams(window.location.search);
      const parsedUrl = parseTableUrlParam(params.get('table'));
      if (parsedUrl.present && parsedUrl.malformed) {
        setActiveTableRecord(null);
        setIsTableInvalid(true);
        return;
      }

      if (!tableNum || tableNum <= 0) {
        setActiveTableRecord(null);
        setIsTableInvalid(false);
        return;
      }

      const found = tableList.find((t) => t.number === tableNum);
      const belongs = found
        ? !found.restaurantId || !currentRestaurantId || found.restaurantId === currentRestaurantId
        : false;

      if (found && found.active !== false && belongs) {
        setActiveTableRecord(found);
        setIsTableInvalid(false);
      } else {
        setActiveTableRecord(null);
        setIsTableInvalid(true);
      }
    },
    [isTablesReady, currentRestaurantId]
  );

  // Programmatic setter (used by Admin Tables "Test" button)
  const setActiveTable = useCallback(
    (tableNumber: number | null) => {
      const sessionSlug = restaurant.slug || currentRestaurantId || 'default';
      setActiveTableState(tableNumber);
      const url = new URL(window.location.href);

      if (tableNumber && tableNumber > 0) {
        url.searchParams.set('table', tableNumber.toString());
        const found = tables.find((t) => t.number === tableNumber);
        const belongs = found
          ? !found.restaurantId || !currentRestaurantId || found.restaurantId === currentRestaurantId
          : false;

        if (found && found.active !== false && belongs) {
          setActiveTableRecord(found);
          setIsTableInvalid(false);
          saveTableSession(sessionSlug, found.number);
          lastHandledQrToastRef.current = `${sessionSlug}:${found.number}`;
        } else {
          setActiveTableRecord(null);
          setIsTableInvalid(isTablesReady);
          clearTableSession(sessionSlug);
        }
      } else {
        url.searchParams.delete('table');
        clearTableSession(sessionSlug);
        setActiveTableRecord(null);
        setIsTableInvalid(false);
      }

      try {
        window.history.replaceState({}, '', url.toString());
      } catch {
        // Ignore if iframe environment restricts history
      }
    },
    [restaurant.slug, currentRestaurantId, tables, isTablesReady]
  );

  useEffect(() => {
    validateTableState(activeTable, tables);
  }, [activeTable, tables, validateTableState]);

  const hasValidTable = useMemo(() => {
    if (!isTablesReady) return false;
    if (activeTable === null || activeTable <= 0 || isTableInvalid) return false;
    if (!activeTableRecord) return false;
    if (activeTableRecord.active === false) return false;
    if (
      activeTableRecord.restaurantId &&
      currentRestaurantId &&
      activeTableRecord.restaurantId !== currentRestaurantId
    ) {
      return false;
    }
    return true;
  }, [isTablesReady, activeTable, isTableInvalid, activeTableRecord, currentRestaurantId]);

  // Dynamic SEO Synchronization
  useEffect(() => {
    updateDocumentSeo(restaurant.name, hasValidTable ? activeTable : null);
  }, [restaurant.name, activeTable, hasValidTable]);

  // Modals & UI states
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isOrderStatusOpen, setIsOrderStatusOpen] = useState<boolean>(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  // Active customer order
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // Onboarding checklist state
  const [isOnboardingChecklistOpen, setIsOnboardingChecklistOpen] = useState<boolean>(() => {
    return localStorage.getItem('menuqr_onboarding_dismissed') !== 'true';
  });

  const dismissOnboardingChecklist = () => {
    setIsOnboardingChecklistOpen(false);
    localStorage.setItem('menuqr_onboarding_dismissed', 'true');
  };

  const hasLogo = !restaurant.logo.includes('unsplash.com') && restaurant.logo.length > 0;
  const hasDishes = products.length > 1;
  const hasPrintedQR = localStorage.getItem('menuqr_qr_printed') === 'true';
  const completedCount = (hasLogo ? 1 : 0) + (hasDishes ? 1 : 0) + (hasPrintedQR ? 1 : 0);
  const onboardingStatus = {
    hasLogo,
    hasDishes,
    hasPrintedQR,
    completedCount,
    totalCount: 3,
    isAllDone: completedCount === 3,
  };

  // Toast system
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Show table-switch toast in demo mode once after mount if QR switched tables
  useEffect(() => {
    if (!isSupabaseLive && initialDemoResolution.switchToastTable !== null && !demoSwitchToastMsgRef.current) {
      const targetTable = initialDemoResolution.switchToastTable;
      demoSwitchToastMsgRef.current = String(targetTable);
      const msg = (translations[lang]?.nowAtTable || translations.en.nowAtTable).replace(
        '{table}',
        String(targetTable)
      );
      showToast(msg);
    }
  }, [isSupabaseLive, initialDemoResolution.switchToastTable, lang, showToast]);

  // ==========================================
  // CACHE & ADMIN DATA ISOLATION
  // ==========================================
  // Clears any cached customer restaurant, table, and cart state in memory & storage
  const clearRestaurantTableCartState = useCallback(() => {
    setCart([]);
    setActiveTableRecord(null);
    setActiveTableState(null);
    setIsTableInvalid(false);
    setHighlightedOrderId(null);
    setActiveOrder(null);
    clearTableSession();
    try {
      localStorage.removeItem('menuqr_active_table');
      localStorage.removeItem('menuqr_cart');
      localStorage.removeItem('menuqr_restaurant');
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('menuqr_table') ||
            key.startsWith('menuqr_cart') ||
            key.startsWith('menuqr_active') ||
            key.startsWith('menuqr_restaurant'))
        ) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('Error clearing localStorage state:', e);
    }
  }, []);

  // Dedicated loader for Admin mode: strictly scoped to adminProfile.restaurantId (Requirement 1)
  const loadAdminData = useCallback(async (adminRestaurantId: string) => {
    if (!isSupabaseConfigured() || !adminRestaurantId || !isValidUuid(adminRestaurantId)) return;

    setIsOrdersLoading(true);
    try {
      const adminRest = await supabaseService.getRestaurantById(adminRestaurantId);
      if (!adminRest) {
        console.warn('Admin restaurant could not be resolved by id:', adminRestaurantId);
        return;
      }

      setRestaurant(adminRest);
      setCurrentRestaurantId(adminRest.id);
      setIsRestaurantNotFound(false);
      setRestaurantErrorMessage(null);

      // Load tables, products, categories, offers, and daily board orders strictly for the admin restaurant
      const startOfAlgiersDayUtc = getAlgiersStartOfDayUtcIso();
      const [dbTables, dbProds, dbCats, dbOffers, dbOrdersRes, dbRequests] = await Promise.all([
        supabaseService.getTables(adminRestaurantId),
        supabaseService.getProducts(adminRestaurantId),
        supabaseService.getCategories(adminRestaurantId),
        supabaseService.getOffers(adminRestaurantId),
        supabaseService.getDailyBoardOrders(adminRestaurantId, startOfAlgiersDayUtc),
        supabaseService.getWaiterRequests(adminRestaurantId),
      ]);

      setTables(dbTables);
      setIsTablesReady(true);
      setProducts(dbProds);
      setCategories(dbCats);
      setOffers(dbOffers);
      if (dbOrdersRes.error) {
        setOrdersError(
          lang === 'ar'
            ? 'تعذر تحميل طلبات اليوم، يرجى المحاولة مرة أخرى.'
            : lang === 'fr'
            ? 'Impossible de charger les commandes du jour. Veuillez réessayer.'
            : 'Unable to load today\'s orders. Please try again.'
        );
      } else {
        setOrders(dbOrdersRes.orders);
        setOrdersError(null);
        setOrdersLastUpdated(new Date());
      }
      setServiceRequests(dbRequests);
    } catch (e) {
      console.error('Error loading admin restaurant data:', e);
    } finally {
      setIsOrdersLoading(false);
    }
  }, [lang]);

  const refreshDailyOrders = useCallback(async () => {
    if (ordersRefreshInFlightRef.current) {
      return ordersRefreshInFlightRef.current;
    }

    const run = async () => {
      const startOfAlgiersDayUtc = getAlgiersStartOfDayUtcIso();
      if (!isSupabaseConfigured()) {
        setOrders(
          demoAllOrders.filter(
            (o) =>
              !o.archivedAt &&
              (o.createdAt >= startOfAlgiersDayUtc ||
                o.status === 'new' ||
                o.status === 'preparing' ||
                o.status === 'ready')
          )
        );
        setOrdersError(null);
        setOrdersLastUpdated(new Date());
        return;
      }

      const targetRestId = adminProfile?.restaurantId || currentRestaurantId;
      if (!targetRestId || !isValidUuid(targetRestId)) return;

      setIsOrdersLoading(true);
      try {
        const res = await supabaseService.getDailyBoardOrders(targetRestId, startOfAlgiersDayUtc);
        if (res.error) {
          setOrdersError(
            lang === 'ar'
              ? 'تعذر تحديث قائمة الطلبات، يرجى المحاولة مرة أخرى.'
              : lang === 'fr'
              ? 'Impossible d\'actualiser les commandes. Veuillez réessayer.'
              : 'Unable to refresh orders. Please try again.'
          );
        } else {
          setOrders(res.orders);
          setOrdersError(null);
          setOrdersLastUpdated(new Date());
        }
      } finally {
        setIsOrdersLoading(false);
      }
    };

    const promise = run().finally(() => {
      ordersRefreshInFlightRef.current = null;
    });
    ordersRefreshInFlightRef.current = promise;
    return promise;
  }, [adminProfile?.restaurantId, currentRestaurantId, demoAllOrders, lang]);

  // ==========================================
  // INITIAL DATA LOADING FROM SUPABASE
  // ==========================================
  const loadSupabaseData = useCallback(async (restaurantSlug?: string) => {
    if (!isSupabaseConfigured()) return;

    // Requirement 1: In admin mode, ALWAYS load tables, products, categories and offers with adminProfile.restaurantId
    if (currentView === 'admin' && adminProfile?.restaurantId && isValidUuid(adminProfile.restaurantId)) {
      await loadAdminData(adminProfile.restaurantId);
      return;
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const targetSlug = restaurantSlug || urlParams.get('r') || urlParams.get('restaurant') || undefined;

      let dbRest: Restaurant | null = null;
      if (targetSlug) {
        dbRest = await supabaseService.getRestaurant(targetSlug);
      } else if (adminProfile?.restaurantId) {
        dbRest = await supabaseService.getRestaurantById(adminProfile.restaurantId);
      } else {
        dbRest = await supabaseService.getRestaurant();
      }

      if (!dbRest) {
        console.warn('Restaurant could not be resolved from Supabase:', targetSlug || adminProfile?.restaurantId);
        setIsRestaurantNotFound(true);
        setRestaurantErrorMessage(
          lang === 'ar'
            ? 'المطعم المطلوب غير مسجل أو غير متاح. يرجى مسح رمز QR من طاولتك أو التأكد من الرابط.'
            : 'The requested restaurant was not found. Please scan the QR code on your table or check the URL.'
        );
        return;
      }

      setIsRestaurantNotFound(false);
      setRestaurantErrorMessage(null);
      setRestaurant(dbRest);
      setCurrentRestaurantId(dbRest.id);

      // Load all catalog & restaurant data strictly from Supabase
      const [dbCats, dbProds, dbTables, dbOffers, dbOrders, dbRequests] = await Promise.all([
        supabaseService.getCategories(dbRest.id),
        supabaseService.getProducts(dbRest.id),
        supabaseService.getTables(dbRest.id),
        supabaseService.getOffers(dbRest.id),
        supabaseService.getOrders(dbRest.id),
        supabaseService.getWaiterRequests(dbRest.id),
      ]);

      // Set state strictly from database (never keep demo catalog)
      setCategories(dbCats);
      setProducts(dbProds);
      setTables(dbTables);
      setIsTablesReady(true);
      setOffers(dbOffers);
      if (dbOrders.length > 0) setOrders(dbOrders);
      if (dbRequests.length > 0) setServiceRequests(dbRequests);

      // Requirement 4: Clean cart of any demo items
      setCart((prev) => prev.filter((item) => isValidUuid(item.product.id)));

      // Resolve table ONLY from QR URL (?table=N) or valid sessionStorage (3h TTL scoped to restaurant slug)
      const sessionSlug = dbRest.slug || targetSlug || dbRest.id;
      const parsedUrlTable = parseTableUrlParam(urlParams.get('table'));

      if (parsedUrlTable.present) {
        if (parsedUrlTable.malformed || parsedUrlTable.tableNumber === null) {
          clearTableSession(sessionSlug);
          setActiveTableRecord(null);
          setActiveTableState(null);
          setIsTableInvalid(true);
        } else {
          const parsedNum = parsedUrlTable.tableNumber;
          const matchingTable = dbTables.find((t) => t.number === parsedNum);
          const belongsToRestaurant = matchingTable
            ? !matchingTable.restaurantId || matchingTable.restaurantId === dbRest.id
            : false;

          if (matchingTable && matchingTable.active !== false && belongsToRestaurant) {
            const prevStored = loadTableSession(sessionSlug);
            saveTableSession(sessionSlug, matchingTable.number);
            setActiveTableRecord(matchingTable);
            setActiveTableState(matchingTable.number);
            setIsTableInvalid(false);

            const scanKey = `${sessionSlug}:${matchingTable.number}`;
            if (
              prevStored !== null &&
              prevStored !== matchingTable.number &&
              lastHandledQrToastRef.current !== scanKey
            ) {
              lastHandledQrToastRef.current = scanKey;
              const switchMsg = (translations[lang]?.nowAtTable || translations.en.nowAtTable).replace(
                '{table}',
                String(matchingTable.number)
              );
              showToast(switchMsg);
            } else {
              lastHandledQrToastRef.current = scanKey;
            }
          } else {
            clearTableSession(sessionSlug);
            setActiveTableRecord(null);
            setActiveTableState(parsedNum);
            setIsTableInvalid(true);
          }
        }
      } else {
        const storedTableNum = loadTableSession(sessionSlug);
        if (storedTableNum !== null) {
          const matchingTable = dbTables.find((t) => t.number === storedTableNum);
          const belongsToRestaurant = matchingTable
            ? !matchingTable.restaurantId || matchingTable.restaurantId === dbRest.id
            : false;

          if (matchingTable && matchingTable.active !== false && belongsToRestaurant) {
            setActiveTableRecord(matchingTable);
            setActiveTableState(matchingTable.number);
            setIsTableInvalid(false);
          } else {
            clearTableSession(sessionSlug);
            setActiveTableRecord(null);
            setActiveTableState(null);
            setIsTableInvalid(false);
          }
        } else {
          setActiveTableRecord(null);
          setActiveTableState(null);
          setIsTableInvalid(false);
        }
      }
    } catch (e) {
      console.warn('Error loading Supabase data:', e);
    }
  }, [lang, currentView, adminProfile?.restaurantId, loadAdminData, showToast]);

  // Check auth session on startup and enforce strict role validation
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsAuthLoading(false);
      return;
    }

    // 1. Restore existing session on mount and re-validate role
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      try {
        if (session?.user) {
          let lookup = await supabaseService.getAdminProfileDetailed(session.user.id);

          // User authenticated but has no profile row yet: keep signed in to show "Join a restaurant" screen
          if (!lookup.found) {
            clearRestaurantTableCartState();
            setUser(session.user);
            setAdminProfile(null);
            setIsAdminAuthenticated(false);
            return;
          }

          if (lookup.profile && (lookup.profile.role === 'admin' || lookup.profile.role === 'staff')) {
            clearRestaurantTableCartState();
            setUser(session.user);
            setAdminProfile(lookup.profile);
            setCurrentRestaurantId(lookup.profile.restaurantId);
            setIsAdminAuthenticated(true);
            await loadAdminData(lookup.profile.restaurantId);
          } else if (lookup.found && lookup.role !== 'admin' && lookup.role !== 'staff') {
            // Only sign out if profile exists and has an unauthorized role
            console.warn('User authenticated but has an unauthorized role. Signing out:', lookup.role);
            await supabase.auth.signOut();
            clearRestaurantTableCartState();
            setUser(null);
            setAdminProfile(null);
            setIsAdminAuthenticated(false);
            localStorage.removeItem('menuqr_admin_auth');
          }
        } else {
          // No session in Supabase Auth
          localStorage.removeItem('menuqr_admin_auth');
          setUser(null);
          setAdminProfile(null);
          setIsAdminAuthenticatedState(false);
        }
      } catch (err) {
        console.warn('Session restoration exception:', err);
      } finally {
        setIsAuthLoading(false);
      }
    });

    // 2. Listen to real-time auth state events
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecoveryMode(true);
        setCurrentView('admin');
        showToast(
          lang === 'ar'
            ? 'يرجى إدخال كلمة المرور الجديدة لحسابك'
            : 'Please set your new password'
        );
        return;
      }

      if (session?.user) {
        let lookup = await supabaseService.getAdminProfileDetailed(session.user.id);

        // User authenticated but has no profile row yet: keep signed in to show "Join a restaurant" screen
        if (!lookup.found) {
          clearRestaurantTableCartState();
          setUser(session.user);
          setAdminProfile(null);
          setIsAdminAuthenticated(false);
          return;
        }

        if (lookup.profile && (lookup.profile.role === 'admin' || lookup.profile.role === 'staff')) {
          clearRestaurantTableCartState();
          setUser(session.user);
          setAdminProfile(lookup.profile);
          setCurrentRestaurantId(lookup.profile.restaurantId);
          setIsAdminAuthenticated(true);
          await loadAdminData(lookup.profile.restaurantId);
        } else if (lookup.found && lookup.role !== 'admin' && lookup.role !== 'staff') {
          await supabase.auth.signOut();
          clearRestaurantTableCartState();
          setUser(null);
          setAdminProfile(null);
          setIsAdminAuthenticated(false);
          localStorage.removeItem('menuqr_admin_auth');
          showToast(
            lang === 'ar'
              ? 'هذا الحساب غير مصرح له بالدخول إلى لوحة التحكم'
              : 'This account is not authorized to access the dashboard'
          );
        }
      } else if (event === 'SIGNED_OUT') {
        clearRestaurantTableCartState();
        setUser(null);
        setAdminProfile(null);
        setIsAdminAuthenticatedState(false);
        localStorage.removeItem('menuqr_admin_auth');
        setTeamMembers([]);
        setTeamInvites([]);
        setTeamError(null);
        setTables([]);
        setProducts([]);
        setCategories([]);
        setOffers([]);
        setOrders([]);
        setServiceRequests([]);
      }
    });

    // Check hash for recovery
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setIsPasswordRecoveryMode(true);
      setCurrentView('admin');
    }

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [currentRestaurantId, lang, clearRestaurantTableCartState, loadAdminData]);

  // Synchronize admin data whenever switching to admin view
  useEffect(() => {
    if (currentView === 'admin' && adminProfile?.restaurantId && isValidUuid(adminProfile.restaurantId)) {
      loadAdminData(adminProfile.restaurantId);
    }
  }, [currentView, adminProfile?.restaurantId, loadAdminData]);

  useEffect(() => {
    loadSupabaseData();
  }, [loadSupabaseData]);

  // ==========================================
  // REALTIME SUBSCRIPTIONS & NOTIFICATION ALERTS
  // ==========================================
  useEffect(() => {
    if (!isSupabaseConfigured() || !currentRestaurantId) return;

    // Realtime channel for Kitchen Orders
    const ordersChannel = supabase
      .channel(`realtime_orders_${currentRestaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${currentRestaurantId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            soundAlert.playNewOrderChime();
            const newOrderPayload = payload.new as any;
            if (newOrderPayload?.id) {
              setHighlightedOrderId(newOrderPayload.id);
              setTimeout(() => setHighlightedOrderId(null), 6000);
              setLatestRealtimeOrder({
                orderId: newOrderPayload.id,
                restaurantId: newOrderPayload.restaurant_id || currentRestaurantId,
                ts: Date.now(),
              });
            }
            showToast(`New Ticket #${newOrderPayload?.order_number || ''} from Table ${newOrderPayload?.table_number || ''}`);
          }

          const dailyRes = await supabaseService.getDailyBoardOrders(
            currentRestaurantId,
            getAlgiersStartOfDayUtcIso()
          );
          if (!dailyRes.error) {
            setOrders(dailyRes.orders);
            setOrdersError(null);
            setOrdersLastUpdated(new Date());
          }
        }
      )
      .subscribe();

    // Realtime channel for Waiter & Bill Requests
    const requestsChannel = supabase
      .channel(`realtime_requests_${currentRestaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waiter_requests',
          filter: `restaurant_id=eq.${currentRestaurantId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            soundAlert.playWaiterCallBell();
            const req = payload.new as any;
            showToast(`Table ${req?.table_number} called for ${req?.type === 'bill_request' ? 'the bill' : 'waiter'}!`);
          }
          const freshRequests = await supabaseService.getWaiterRequests(currentRestaurantId);
          setServiceRequests(freshRequests);
        }
      )
      .subscribe();

    // Realtime channel for Restaurant Open/Closed status & metadata updates
    const restaurantChannel = supabase
      .channel(`realtime_restaurant_${currentRestaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurants',
          filter: `id=eq.${currentRestaurantId}`,
        },
        async (payload) => {
          if (payload.new) {
            const updated = rowToRestaurant(payload.new as RestaurantRow);
            setRestaurant(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(restaurantChannel);
    };
  }, [currentRestaurantId]);

  // Refresh restaurant record from database
  const refreshRestaurantStatus = useCallback(async () => {
    if (!isSupabaseConfigured() || !currentRestaurantId) return;
    try {
      const freshRest = await supabaseService.getRestaurant(currentRestaurantId);
      if (freshRest) {
        setRestaurant(freshRest);
      }
    } catch (e) {
      // ignore background refresh failure
    }
  }, [currentRestaurantId]);

  // Requirement 3: Refresh status every 30s, on window focus, and on visibilitychange
  useEffect(() => {
    if (!currentRestaurantId) return;
    const interval = setInterval(() => {
      refreshRestaurantStatus();
    }, 30000);

    const onFocus = () => {
      refreshRestaurantStatus();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshRestaurantStatus();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [currentRestaurantId, refreshRestaurantStatus]);

  // Live timer tick for automatic reopening when reopen_at expires without page reload
  const [statusTick, setStatusTick] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!restaurant.isOpen && restaurant.reopenAt) {
      const targetTime = new Date(restaurant.reopenAt).getTime();
      const interval = setInterval(() => {
        const now = Date.now();
        setStatusTick(now);
        if (now >= targetTime) {
          clearInterval(interval);
          refreshRestaurantStatus();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [restaurant.isOpen, restaurant.reopenAt, refreshRestaurantStatus]);

  // Compute status according to: is_open OR (reopen_at is not null AND reopen_at <= now)
  const isRestaurantOpen = useMemo(() => {
    void statusTick;
    return isRestaurantCurrentlyOpen(restaurant);
  }, [restaurant, statusTick]);

  // Customer order status polling (calls get_order_status RPC every 5 seconds - Requirement 2)
  useEffect(() => {
    if (!isSupabaseConfigured() || !activeOrder?.id || !isValidUuid(activeOrder.id)) return;

    // Terminal states do not require ongoing polling
    if (activeOrder.status === 'served' || activeOrder.status === 'cancelled') return;

    let isMounted = true;

    const pollStatus = async () => {
      try {
        const res = await supabaseService.getOrderStatus(activeOrder.id);
        if (!isMounted || !res) return;

        if (res.status !== activeOrder.status || (res.orderNumber && res.orderNumber !== activeOrder.orderNumber)) {
          setActiveOrder((prev) =>
            prev
              ? {
                  ...prev,
                  status: res.status,
                  orderNumber: res.orderNumber || prev.orderNumber,
                  subtotal: res.subtotal ?? prev.subtotal,
                  discountTotal: res.discountTotal ?? prev.discountTotal,
                  total: res.total ?? prev.total,
                }
              : null
          );
          if (res.status !== activeOrder.status) {
            showToast(`Order #${res.orderNumber || activeOrder.orderNumber} status: ${res.status.toUpperCase()}`);
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('Order polling error:', err);
        }
      }
    };

    // Immediate check on mount/order creation
    pollStatus();

    // Poll every 5 seconds
    const intervalId = setInterval(pollStatus, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [activeOrder?.id, activeOrder?.status]);

  // ==========================================
  // AUTH METHODS
  // ==========================================
  const signInAdmin = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass;

    if (!cleanEmail || !cleanPass) {
      return {
        success: false,
        error: lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter both email and password',
      };
    }

    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error:
          lang === 'ar'
            ? 'خدمة تسجيل الدخول غير متاحة حالياً. يرجى المحاولة لاحقاً.'
            : lang === 'fr'
            ? 'Le service d\'authentification est indisponible. Veuillez réessayer plus tard.'
            : 'Authentication service temporarily unavailable. Please try again later.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (error) {
        let friendlyError = error.message;
        if (error.message.includes('Invalid login credentials')) {
          friendlyError =
            lang === 'ar'
              ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة.'
              : 'Invalid login credentials. Please check your email and password.';
        } else if (error.message.includes('Email not confirmed')) {
          friendlyError =
            lang === 'ar'
              ? 'البريد الإلكتروني غير مؤكد بعد. يرجى مراجعة بريدك الإلكتروني لتأكيد الحساب.'
              : lang === 'fr'
              ? 'Votre adresse email n\'est pas encore confirmée. Veuillez vérifier votre boîte de réception.'
              : 'Please check your email inbox to confirm your account.';
        }
        return { success: false, error: friendlyError };
      }

      if (data.user) {
        // Check if user has an existing restaurant profile
        let lookup = await supabaseService.getAdminProfileDetailed(data.user.id);

        if (!lookup.found) {
          clearRestaurantTableCartState();
          setUser(data.user);
          setAdminProfile(null);
          setIsAdminAuthenticated(false);
          return { success: true };
        }

        // Show "not authorized" ONLY if a profile row was found and its role is not admin or staff
        if (lookup.found && lookup.role !== 'admin' && lookup.role !== 'staff') {
          console.warn('Unauthorized sign in attempt by user with invalid role. Signing out:', lookup.role);
          await supabase.auth.signOut();
          setUser(null);
          setAdminProfile(null);
          setIsAdminAuthenticated(false);
          localStorage.removeItem('menuqr_admin_auth');
          const unauthorizedMsg =
            lang === 'ar'
              ? 'هذا الحساب غير مصرح له بالدخول إلى لوحة التحكم'
              : 'This account is not authorized to access the dashboard';
          showToast(unauthorizedMsg);
          return { success: false, error: unauthorizedMsg };
        }

        if (lookup.profile && (lookup.profile.role === 'admin' || lookup.profile.role === 'staff')) {
          clearRestaurantTableCartState();
          setUser(data.user);
          setAdminProfile(lookup.profile);
          setCurrentRestaurantId(lookup.profile.restaurantId);
          setIsAdminAuthenticated(true);
          await loadAdminData(lookup.profile.restaurantId);

          showToast(lang === 'ar' ? 'مرحباً بك في لوحة تحكم المطعم' : 'Welcome to Admin Dashboard');
          return { success: true };
        }

        // Profile row was not found or could not be loaded
        console.warn('Profile lookup failed or missing restaurant linkage:', lookup);
        const errMsg =
          lang === 'ar'
            ? 'هذا الحساب غير مصرح له بالدخول إلى لوحة التحكم'
            : lang === 'fr'
            ? 'Ce compte n\'est pas autorisé à accéder au tableau de bord'
            : 'This account is not authorized to access the dashboard';
        return { success: false, error: errMsg };
      }

      return { success: false, error: 'User session could not be established' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Authentication error' };
    }
  };

  const signUpAdmin = async (
    email: string,
    pass: string,
    fullName: string,
    restaurantName: string,
    pin: string
  ): Promise<{ success: boolean; error?: string; requireEmailConfirmation?: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass;
    const cleanRestName = restaurantName.trim();
    const cleanFullName = fullName.trim() || cleanEmail.split('@')[0];
    const cleanPin = pin.trim();

    if (!cleanEmail || !cleanPass || !cleanRestName || !cleanPin) {
      return {
        success: false,
        error:
          lang === 'ar'
            ? 'يرجى إدخال اسم المطعم، البريد الإلكتروني، كلمة المرور وكود التسجيل (PIN)'
            : lang === 'fr'
            ? 'Veuillez saisir le nom du restaurant, l\'email, le mot de passe et le code PIN'
            : 'Please enter restaurant name, email, password and registration PIN',
      };
    }

    if (cleanRestName.length < 3 || cleanRestName.length > 100) {
      return {
        success: false,
        error:
          lang === 'ar'
            ? 'يجب أن يتكون اسم المطعم من 3 إلى 100 حرف'
            : lang === 'fr'
            ? 'Le nom du restaurant doit contenir entre 3 et 100 caractères'
            : 'Restaurant name must be between 3 and 100 characters',
      };
    }

    if (cleanPass.length < 6) {
      return {
        success: false,
        error:
          lang === 'ar'
            ? 'يجب ألا تقل كلمة المرور عن 6 أحرف'
            : lang === 'fr'
            ? 'Le mot de passe doit comporter au moins 6 caractères'
            : 'Password must be at least 6 characters',
      };
    }

    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error:
          lang === 'ar'
            ? 'خدمة التسجيل غير متاحة حالياً. يرجى المحاولة لاحقاً.'
            : lang === 'fr'
            ? 'Le service d\'inscription est temporairement indisponible.'
            : 'Registration service temporarily unavailable. Please try again later.',
      };
    }

    try {
      // 1. Sign up user in Supabase Auth with registration PIN metadata
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: {
            restaurant_name: cleanRestName,
            full_name: cleanFullName,
            signup_mode: 'restaurant',
            signup_pin: cleanPin,
          },
        },
      });

      if (authErr) {
        let friendlyErr = authErr.message;
        const msgLower = authErr.message.toLowerCase();
        if (
          msgLower.includes('database error') ||
          msgLower.includes('pin') ||
          msgLower.includes('trigger') ||
          msgLower.includes('exception') ||
          msgLower.includes('failed to create user') ||
          msgLower.includes('unexpected_failure')
        ) {
          friendlyErr =
            lang === 'ar'
              ? 'فشل التسجيل، يرجى التأكد من كود التسجيل (PIN) والمحاولة مجدداً'
              : lang === 'fr'
              ? 'Échec de l\'inscription, vérifiez votre code PIN et réessayez'
              : 'Registration failed, check your PIN and try again';
        } else if (msgLower.includes('user already registered') || msgLower.includes('already registered')) {
          friendlyErr =
            lang === 'ar'
              ? 'هذا البريد مسجل بالفعل في النظام. يرجى تسجيل الدخول.'
              : lang === 'fr'
              ? 'Cet email est déjà enregistré. Veuillez vous connecter.'
              : 'User already registered. Please sign in.';
        }
        return { success: false, error: friendlyErr };
      }

      // 2. Check if email confirmation is required or session is present directly
      if (!authData.session) {
        // Trigger already created the restaurant and profile in Postgres!
        return {
          success: true,
          requireEmailConfirmation: true,
          message:
            lang === 'ar'
              ? 'تم إنشاء حسابك ومطعمك بنجاح! تفقد بريدك الإلكتروني لتأكيد الحساب ثم سجل الدخول.'
              : lang === 'fr'
              ? 'Compte et restaurant créés avec succès ! Vérifiez votre email pour confirmer votre compte, puis connectez-vous.'
              : 'Account and restaurant created! Check your email to confirm your account, then sign in.',
        };
      }

      // 3. Email confirmation is OFF - session is already active
      const activeUser = authData.session.user;
      let dbProfile = await supabaseService.getAdminProfile(activeUser.id);
      let targetRestaurantId = dbProfile?.restaurantId;

      if (!dbProfile) {
        // Wait a moment for trigger completion
        await new Promise((r) => setTimeout(r, 600));
        dbProfile = await supabaseService.getAdminProfile(activeUser.id);
        targetRestaurantId = dbProfile?.restaurantId;
      }

      if (dbProfile) {
        clearRestaurantTableCartState();
        setAdminProfile(dbProfile);
        if (targetRestaurantId) {
          setCurrentRestaurantId(targetRestaurantId);
          await loadAdminData(targetRestaurantId);
        }
      }

      setUser(activeUser);
      setIsAdminAuthenticated(true);
      setIsOnboardingChecklistOpen(true);
      localStorage.removeItem('menuqr_onboarding_dismissed');

      showToast(
        lang === 'ar'
          ? 'تهانينا! تم إنشاء مطعمك وتجهيز 6 طاولات بنجاح'
          : lang === 'fr'
          ? 'Félicitations ! Votre restaurant a été créé avec 6 tables prêtes'
          : 'Congratulations! Your restaurant has been created with 6 tables'
      );
      return { success: true };
    } catch (e: any) {
      let errText = e?.message || 'Erreur lors de la création du restaurant';
      if (errText.includes('ALREADY_EXISTS')) {
        errText =
          lang === 'ar'
            ? 'هذا الحساب يمتلك مطعماً بالفعل. يُسمح بإنشاء مطعم واحد لكل حساب.'
            : lang === 'fr'
            ? 'Ce compte possède déjà un restaurant. Un seul restaurant est autorisé par compte.'
            : 'This account already belongs to a restaurant. Only one restaurant per account is permitted.';
      } else if (errText.includes('INVALID_NAME')) {
        errText =
          lang === 'ar'
            ? 'يجب أن يتكون اسم المطعم من 3 إلى 100 حرف.'
            : lang === 'fr'
            ? 'Le nom du restaurant doit contenir entre 3 et 100 caractères.'
            : 'Restaurant name must be between 3 and 100 characters.';
      }
      return { success: false, error: errText };
    }
  };

  const signUpStaff = async (
    email: string,
    pass: string,
    fullName: string
  ): Promise<{ success: boolean; error?: string; requireEmailConfirmation?: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass;
    const cleanFullName = fullName.trim();

    if (!cleanEmail || !cleanPass || cleanFullName.length < 2) {
      return {
        success: false,
        error:
          lang === 'ar'
            ? 'يرجى إدخال الاسم الكامل، البريد الإلكتروني وكلمة المرور.'
            : lang === 'fr'
            ? 'Veuillez saisir votre nom complet, email et mot de passe.'
            : 'Please enter your full name, email and password.',
      };
    }

    if (cleanPass.length < 8) {
      return {
        success: false,
        error:
          lang === 'ar'
            ? 'يجب ألا تقل كلمة المرور عن 8 أحرف.'
            : lang === 'fr'
            ? 'Le mot de passe doit contenir au moins 8 caractères.'
            : 'Password must be at least 8 characters.',
      };
    }

    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error:
          lang === 'ar'
            ? 'خدمة التسجيل غير متاحة حالياً. يرجى المحاولة لاحقاً.'
            : lang === 'fr'
            ? 'Le service d’inscription est temporairement indisponible.'
            : 'Registration service temporarily unavailable. Please try again later.',
      };
    }

    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: {
            full_name: cleanFullName,
            signup_mode: 'staff',
          },
        },
      });

      if (authErr) {
        const msgLower = (authErr.message || '').toLowerCase();
        if (msgLower.includes('user already registered') || msgLower.includes('already registered')) {
          return {
            success: false,
            error:
              lang === 'ar'
                ? 'هذا البريد مسجل بالفعل. يرجى تسجيل الدخول ثم إدخال كود الدعوة.'
                : lang === 'fr'
                ? 'Cet email est déjà utilisé. Connectez-vous pour saisir votre code d’invitation.'
                : 'This email is already registered. Please sign in to enter your invitation code.',
          };
        }
        return { success: false, error: translateTeamError(authErr, lang) };
      }

      if (!authData.session) {
        return {
          success: true,
          requireEmailConfirmation: true,
          message:
            lang === 'ar'
              ? 'تم إنشاء الحساب بنجاح! تفقد بريدك الإلكتروني لتأكيد الحساب ثم سجل الدخول لإدخال كود الدعوة.'
              : lang === 'fr'
              ? 'Compte créé avec succès ! Confirmez votre email puis connectez-vous pour entrer votre code d’invitation.'
              : 'Account created! Confirm your email, then sign in to enter your invitation code.',
        };
      }

      clearRestaurantTableCartState();
      setUser(authData.session.user);
      setAdminProfile(null);
      setIsAdminAuthenticated(false);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: translateTeamError(e, lang) };
    }
  };

  const signOutAdmin = async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out exception:', e);
      }
    }
    clearRestaurantTableCartState();
    setUser(null);
    setAdminProfile(null);
    setIsAdminAuthenticated(false);
    localStorage.removeItem('menuqr_admin_auth');
    setTeamMembers([]);
    setTeamInvites([]);
    setTeamError(null);
    setTables([]);
    setProducts([]);
    setCategories([]);
    setOffers([]);
    setOrders([]);
    setServiceRequests([]);
    setCurrentView('admin');
    showToast(
      lang === 'ar'
        ? 'تم تسجيل الخروج بنجاح'
        : lang === 'fr'
        ? 'Déconnexion réussie'
        : 'Logged out successfully'
    );
  };

  const sendPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return {
        success: false,
        error: lang === 'ar' ? 'يرجى إدخال عنوان بريد إلكتروني صالح' : 'Please provide a valid email address',
      };
    }
    const res = await supabaseService.sendPasswordReset(cleanEmail);
    if (res.success) {
      showToast(
        lang === 'ar'
          ? 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني'
          : 'Password reset link sent to your email'
      );
    }
    return res;
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: lang === 'ar' ? 'يجب ألا تقل كلمة المرور عن 8 أحرف' : 'Password must be at least 8 characters',
      };
    }
    const res = await supabaseService.updatePassword(newPassword);
    if (res.success) {
      setIsPasswordRecoveryMode(false);
      showToast(
        lang === 'ar'
          ? 'تم تحديث كلمة المرور بنجاح! تم تسجيل دخولك.'
          : 'Password updated successfully! You are now logged in.'
      );
    }
    return res;
  };

  const loadTeamData = useCallback(async () => {
    const targetRestaurantId = adminProfile?.restaurantId;
    if (!targetRestaurantId || adminProfile?.role !== 'admin') {
      setTeamMembers([]);
      setTeamInvites([]);
      return;
    }

    setIsTeamLoading(true);
    setTeamError(null);
    try {
      const [members, invites] = await Promise.all([
        supabaseService.listTeamMembersRPC(),
        supabaseService.getStaffInvites(targetRestaurantId),
      ]);
      setTeamMembers(members);
      setTeamInvites(invites);
    } catch (e: any) {
      setTeamError(translateTeamError(e, lang));
    } finally {
      setIsTeamLoading(false);
    }
  }, [adminProfile?.restaurantId, adminProfile?.role, lang]);

  const createStaffInvite = async (
    name: string | null,
    role: 'staff' | 'admin' = 'staff',
    days: InviteValidityDays = 7
  ): Promise<{ success: boolean; invite?: CreatedStaffInviteResult; error?: string }> => {
    if (userRole !== 'admin') {
      const msg = translateTeamError('not_allowed', lang);
      showToast(msg);
      return { success: false, error: msg };
    }
    try {
      const invite = await supabaseService.createStaffInviteRPC(name, role, days);
      await loadTeamData();
      return { success: true, invite };
    } catch (e: any) {
      const friendly = translateTeamError(e, lang);
      showToast(friendly);
      return { success: false, error: friendly };
    }
  };

  const revokeStaffInvite = async (inviteId: string): Promise<{ success: boolean; error?: string }> => {
    if (userRole !== 'admin') {
      const msg = translateTeamError('not_allowed', lang);
      showToast(msg);
      return { success: false, error: msg };
    }
    try {
      await supabaseService.revokeStaffInviteRPC(inviteId);
      await loadTeamData();
      showToast(
        lang === 'ar'
          ? 'تم إلغاء كود الدعوة بنجاح'
          : lang === 'fr'
          ? "Code d'invitation révoqué"
          : 'Invitation revoked'
      );
      return { success: true };
    } catch (e: any) {
      const friendly = translateTeamError(e, lang);
      showToast(friendly);
      return { success: false, error: friendly };
    }
  };

  const removeTeamMember = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (userRole !== 'admin') {
      const msg = translateTeamError('not_allowed', lang);
      showToast(msg);
      return { success: false, error: msg };
    }
    try {
      await supabaseService.removeTeamMemberRPC(userId);
      await loadTeamData();
      showToast(
        lang === 'ar'
          ? 'تمت إزالة العضو من الفريق'
          : lang === 'fr'
          ? "Membre retiré de l'équipe"
          : 'Team member removed'
      );
      return { success: true };
    } catch (e: any) {
      const friendly = translateTeamError(e, lang);
      showToast(friendly);
      return { success: false, error: friendly };
    }
  };

  const acceptStaffInvite = async (code: string): Promise<{ success: boolean; error?: string }> => {
    const normalized = normalizeInviteCode(code);
    if (!normalized) {
      return {
        success: false,
        error:
          lang === 'ar'
            ? 'يرجى إدخال كود الدعوة.'
            : lang === 'fr'
            ? "Veuillez saisir le code d'invitation."
            : 'Please enter the invitation code.',
      };
    }

    try {
      const res = await supabaseService.acceptStaffInviteRPC(normalized);
      if (!res || res.ok !== true) {
        return {
          success: false,
          error: translateTeamError(res?.error || 'invalid_invite', lang),
        };
      }

      // Determine active auth user ID and reload profile from database
      let activeUserId = user?.id || '';
      if (!activeUserId && isSupabaseConfigured()) {
        const { data: userRes } = await supabase.auth.getUser();
        activeUserId = userRes?.user?.id || '';
        if (userRes?.user) {
          setUser(userRes.user);
        }
      }

      if (activeUserId) {
        let lookup = await supabaseService.getAdminProfileDetailed(activeUserId);
        if (!lookup.found || !lookup.profile) {
          await new Promise((r) => setTimeout(r, 350));
          lookup = await supabaseService.getAdminProfileDetailed(activeUserId);
        }

        if (lookup.found && lookup.profile) {
          clearRestaurantTableCartState();
          setAdminProfile(lookup.profile);
          setCurrentRestaurantId(lookup.profile.restaurantId);
          setIsAdminAuthenticated(true);
          await loadAdminData(lookup.profile.restaurantId);
          showToast(
            lang === 'ar'
              ? 'تم الانضمام إلى فريق المطعم بنجاح!'
              : lang === 'fr'
              ? 'Vous avez rejoint le restaurant avec succès !'
              : 'Joined the restaurant team successfully!'
          );
          return { success: true };
        }
      }

      return {
        success: false,
        error: translateTeamError('not_authenticated', lang),
      };
    } catch (e: any) {
      return { success: false, error: translateTeamError(e, lang) };
    }
  };

  // ==========================================
  // MUTATIONS (PRODUCTS, CATEGORIES, TABLES)
  // ==========================================
  const updateRestaurant = async (updates: Partial<Restaurant>): Promise<boolean> => {
    if (userRole === 'staff') {
      showToast(lang === 'ar' ? 'لا يملك طاقم العمل صلاحية تعديل الإعدادات' : 'Staff role cannot modify restaurant settings');
      return false;
    }

    const targetRestaurantId = adminProfile?.restaurantId;
    if (!targetRestaurantId || !isValidUuid(targetRestaurantId)) {
      console.error('updateRestaurant: missing valid restaurant linked to admin profile');
      showToast(
        lang === 'ar'
          ? 'تعذر حفظ الإعدادات: لم يتم العثور على مطعم مرتبط بهذا الحساب'
          : lang === 'fr'
          ? 'Impossible d\'enregistrer: aucun restaurant associé à ce compte'
          : 'Could not save settings: no restaurant linked to this account'
      );
      return false;
    }

    const res = await supabaseService.updateRestaurant(targetRestaurantId, updates, adminProfile?.restaurantId);
    if (!res.success) {
      console.error('updateRestaurant failed:', res.error);
      showToast(
        lang === 'ar'
          ? 'تعذر حفظ التغييرات. يرجى المحاولة ثانية.'
          : lang === 'fr'
          ? 'Impossible d\'enregistrer les modifications. Veuillez réessayer.'
          : 'Could not save your changes. Please try again.'
      );
      return false;
    }

    if (res.data) {
      setRestaurant(res.data);
    } else {
      setRestaurant((prev) => ({ ...prev, ...updates }));
    }

    showToast(
      lang === 'ar'
        ? 'تم حفظ الإعدادات بنجاح'
        : lang === 'fr'
        ? 'Paramètres enregistrés avec succès'
        : 'Settings saved successfully'
    );
    return true;
  };

  /**
   * Toggle restaurant Open/Closed status via SECURITY DEFINER set_restaurant_open RPC.
   * Admins and Staff are authorized to invoke this.
   */
  const setRestaurantStatus = async (
    isOpen: boolean,
    messages?: { ar?: string | null; fr?: string | null; en?: string | null },
    reopenAt?: string | null
  ): Promise<boolean> => {
    const res = await supabaseService.setRestaurantOpenStatus(isOpen, messages, reopenAt);

    if (!res.success) {
      console.error('setRestaurantOpenStatus failed:', res.error);
      const errMsg = (res.error?.message || '').toLowerCase();
      let friendly = '';
      if (errMsg.includes('not_allowed')) {
        friendly =
          lang === 'ar'
            ? 'ليس لديك الصلاحية لتغيير حالة المطعم'
            : lang === 'fr'
            ? 'Vous n\'avez pas la permission de modifier le statut du restaurant'
            : 'You are not authorized to change the restaurant status';
      } else if (errMsg.includes('reopen_in_past')) {
        friendly =
          lang === 'ar'
            ? 'تاريخ ووقت إعادة الفتح يجب أن يكون في المستقبل'
            : lang === 'fr'
            ? 'L\'heure de réouverture programmée doit être dans le futur'
            : 'The scheduled reopening time must be in the future';
      } else {
        friendly =
          lang === 'ar'
            ? 'تعذر تغيير حالة المطعم، يرجى المحاولة ثانية'
            : lang === 'fr'
            ? 'Impossible de mettre à jour le statut du restaurant, veuillez réessayer'
            : 'Could not update restaurant status, please try again';
      }
      showToast(friendly);
      return false;
    }

    if (res.data) {
      setRestaurant(res.data);
    } else {
      setRestaurant((prev) => ({
        ...prev,
        isOpen,
        closedMessageAr: isOpen ? null : messages?.ar || null,
        closedMessageFr: isOpen ? null : messages?.fr || null,
        closedMessageEn: isOpen ? null : messages?.en || null,
        reopenAt: isOpen ? null : reopenAt || null,
      }));
    }

    const toastMsg = isOpen
      ? lang === 'ar'
        ? 'تم فتح المطعم بنجاح! يستقبل الآن الطلبات.'
        : lang === 'fr'
        ? 'Le restaurant est maintenant ouvert aux commandes !'
        : 'The restaurant is now OPEN for orders!'
      : lang === 'ar'
      ? 'تم إغلاق المطعم مؤقتاً.'
      : lang === 'fr'
      ? 'Le restaurant est désormais fermé temporairement.'
      : 'The restaurant is now CLOSED.';
    showToast(toastMsg);
    return true;
  };

  const updateAdminProfileName = async (newName: string): Promise<boolean> => {
    if (!user?.id) return false;
    const clean = newName.trim();
    if (!clean) return false;
    const res = await supabaseService.updateAdminProfileName(user.id, clean);
    if (res.success) {
      setAdminProfile((prev) => (prev ? { ...prev, fullName: clean } : prev));
      return true;
    }
    return false;
  };

  const addProduct = async (prod: Omit<Product, 'id'>): Promise<boolean> => {
    if (userRole === 'staff') {
      showToast(lang === 'ar' ? 'لا يملك طاقم العمل صلاحية إضافة أطباق' : 'Staff role cannot add products');
      return false;
    }
    const targetRestaurantId = adminProfile?.restaurantId || currentRestaurantId;
    if (!targetRestaurantId) {
      showToast(lang === 'ar' ? 'تعذر حفظ التغييرات' : 'Could not save changes');
      return false;
    }

    const res = await supabaseService.addProduct(targetRestaurantId, prod);
    if (!res.success) {
      console.error('addProduct failed:', res.error);
      showToast(
        lang === 'ar'
          ? 'تعذر إضافة الطبق. يرجى المحاولة ثانية.'
          : lang === 'fr'
          ? 'Impossible d\'ajouter le produit. Veuillez réessayer.'
          : 'Could not add product. Please try again.'
      );
      return false;
    }

    if (res.data) {
      setProducts((prev) => [res.data!, ...prev]);
    }
    showToast(lang === 'ar' ? 'تمت إضافة الطبق إلى القائمة' : 'Product added to menu');
    return true;
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<boolean> => {
    if (userRole === 'staff') {
      const keys = Object.keys(updates);
      const isOnlyAvailability = keys.length === 1 && keys[0] === 'isAvailable';
      if (!isOnlyAvailability) {
        showToast(
          lang === 'ar'
            ? 'لا يملك طاقم العمل صلاحية تعديل الأطباق أو الأسعار'
            : lang === 'fr'
            ? 'Le personnel ne peut pas modifier les plats ou les prix'
            : 'Staff role cannot edit dishes or prices'
        );
        return false;
      }
    }
    const targetRestaurantId = adminProfile?.restaurantId || currentRestaurantId;
    const res = await supabaseService.updateProduct(id, updates, targetRestaurantId);
    if (!res.success) {
      console.error('updateProduct failed:', res.error);
      showToast(
        lang === 'ar'
          ? 'تعذر حفظ التغييرات. يرجى المحاولة ثانية.'
          : lang === 'fr'
          ? 'Impossible d\'enregistrer les modifications. Veuillez réessayer.'
          : 'Could not save your changes. Please try again.'
      );
      return false;
    }

    if (res.data) {
      setProducts((prev) => prev.map((p) => (p.id === id ? res.data! : p)));
    }
    showToast(lang === 'ar' ? 'تم تحديث الطبق بنجاح' : 'Product updated');
    return true;
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    if (userRole === 'staff') {
      showToast(lang === 'ar' ? 'لا يملك طاقم العمل صلاحية حذف أطباق' : 'Staff role cannot delete products');
      return false;
    }
    const targetRestaurantId = adminProfile?.restaurantId || currentRestaurantId;
    const res = await supabaseService.deleteProduct(id, targetRestaurantId);
    if (!res.success) {
      console.error('deleteProduct failed:', res.error);
      showToast(
        lang === 'ar'
          ? 'تعذر حذف الطبق. يرجى المحاولة ثانية.'
          : lang === 'fr'
          ? 'Impossible de supprimer le produit. Veuillez réessayer.'
          : 'Could not delete product. Please try again.'
      );
      return false;
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast(lang === 'ar' ? 'تم حذف الطبق' : 'Product deleted');
    return true;
  };

  const toggleProductAvailability = async (id: string): Promise<boolean> => {
    const target = products.find((p) => p.id === id);
    if (!target) return false;
    const nextVal = !target.isAvailable;
    return await updateProduct(id, { isAvailable: nextVal });
  };

  const addCategory = async (cat: Omit<Category, 'id'>): Promise<Category | null> => {
    if (userRole === 'staff') {
      showToast(lang === 'ar' ? 'لا يملك طاقم العمل صلاحية إضافة أقسام' : 'Staff role cannot add categories');
      return null;
    }
    const targetRestaurantId = adminProfile?.restaurantId || currentRestaurantId;
    if (!targetRestaurantId) {
      showToast(lang === 'ar' ? 'تعذر حفظ التغييرات' : 'Could not save changes');
      return null;
    }

    const res = await supabaseService.addCategory(targetRestaurantId, cat);
    if (!res.success || !res.data) {
      console.error('addCategory failed:', res.error);
      showToast(
        lang === 'ar'
          ? 'تعذر إنشاء القسم. يرجى المحاولة ثانية.'
          : lang === 'fr'
          ? 'Impossible d\'ajouter la catégorie. Veuillez réessayer.'
          : 'Could not create category. Please try again.'
      );
      return null;
    }

    setCategories((prev) => [...prev, res.data!]);
    showToast(lang === 'ar' ? 'تم إنشاء القسم بنجاح' : 'Category created');
    return res.data;
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<boolean> => {
    if (userRole === 'staff') {
      showToast(
        lang === 'ar'
          ? 'لا يملك طاقم العمل صلاحية تعديل الأقسام'
          : lang === 'fr'
          ? 'Le personnel ne peut pas modifier les catégories'
          : 'Staff role cannot modify categories'
      );
      return false;
    }
    const targetRestaurantId = adminProfile?.restaurantId || currentRestaurantId;
    const res = await supabaseService.updateCategory(id, updates, targetRestaurantId);
    if (!res.success) {
      console.error('updateCategory failed:', res.error);
      showToast(
        lang === 'ar'
          ? 'تعذر حفظ التغييرات. يرجى المحاولة ثانية.'
          : lang === 'fr'
          ? 'Impossible d\'enregistrer les modifications. Veuillez réessayer.'
          : 'Could not save your changes. Please try again.'
      );
      return false;
    }

    if (res.data) {
      setCategories((prev) => prev.map((c) => (c.id === id ? res.data! : c)));
    }
    showToast(lang === 'ar' ? 'تم تحديث القسم بنجاح' : 'Category updated');
    return true;
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    if (userRole === 'staff') {
      showToast(lang === 'ar' ? 'لا يملك طاقم العمل صلاحية حذف أقسام' : 'Staff role cannot delete categories');
      return false;
    }
    const targetRestaurantId = adminProfile?.restaurantId || currentRestaurantId;
    const res = await supabaseService.deleteCategory(id, targetRestaurantId);
    if (!res.success) {
      console.error('deleteCategory failed:', res.error);
      showToast(
        lang === 'ar'
          ? 'تعذر حذف القسم. يرجى المحاولة ثانية.'
          : lang === 'fr'
          ? 'Impossible de supprimer la catégorie. Veuillez réessayer.'
          : 'Could not delete category. Please try again.'
      );
      return false;
    }

    setCategories((prev) => prev.filter((c) => c.id !== id));
    showToast(lang === 'ar' ? 'تم حذف القسم' : 'Category deleted');
    return true;
  };

  const reorderCategories = (newCategories: Category[]) => {
    if (userRole === 'staff') {
      showToast(
        lang === 'ar'
          ? 'لا يملك طاقم العمل صلاحية إعادة ترتيب الأقسام'
          : lang === 'fr'
          ? 'Le personnel ne peut pas réorganiser les catégories'
          : 'Staff role cannot reorder categories'
      );
      return;
    }
    setCategories(newCategories);
    if (isSupabaseConfigured()) {
      const targetRestaurantId = adminProfile?.restaurantId || currentRestaurantId;
      newCategories.forEach((c, idx) => {
        supabaseService.updateCategory(c.id, { order: idx + 1 }, targetRestaurantId);
      });
    }
  };

  const addTable = async (tableNumber: number): Promise<boolean> => {
    if (userRole === 'staff') {
      showToast(lang === 'ar' ? 'لا يملك طاقم العمل صلاحية إنشاء طاولات' : 'Staff role cannot create tables');
      return false;
    }
    const targetRestaurantId = adminProfile?.restaurantId || currentRestaurantId;
    if (!targetRestaurantId) {
      showToast(lang === 'ar' ? 'تعذر حفظ التغييرات' : 'Could not save changes');
      return false;
    }

    const res = await supabaseService.addTable(targetRestaurantId, tableNumber);
    if (!res.success) {
      console.error('addTable failed:', res.error);
      showToast(
        lang === 'ar'
          ? 'تعذر إضافة الطاولة. يرجى المحاولة ثانية.'
          : lang === 'fr'
          ? 'Impossible d\'ajouter la table. Veuillez réessayer.'
          : 'Could not add table. Please try again.'
      );
      return false;
    }

    if (res.data) {
      setTables((prev) => [...prev, res.data!]);
    }
    showToast(lang === 'ar' ? `تم إنشاء طاولة ${tableNumber}` : `Table ${tableNumber} created`);
    return true;
  };

  const updateTable = async (id: string, updates: Partial<RestaurantTable>): Promise<boolean> => {
    if (isSupabaseConfigured() && !isValidUuid(id)) {
      console.error('Invalid table ID:', id);
      showToast(lang === 'ar' ? 'تعذر تعديل هذه الطاولة' : 'Could not modify table. Please try again.');
      return false;
    }

    const targetRestaurantId = adminProfile?.restaurantId || currentRestaurantId;
    const res = await supabaseService.updateTable(id, updates, targetRestaurantId);
    if (!res.success) {
      console.error('updateTable failed:', res.error);
      showToast(
        lang === 'ar'
          ? 'تعذر حفظ التغييرات. يرجى المحاولة ثانية.'
          : lang === 'fr'
          ? 'Impossible d\'enregistrer les modifications. Veuillez réessayer.'
          : 'Could not save your changes. Please try again.'
      );
      return false;
    }

    if (res.data) {
      setTables((prev) => prev.map((t) => (t.id === res.data!.id ? res.data! : t)));
    }
    return true;
  };

  const deleteTable = async (id: string): Promise<boolean> => {
    if (userRole === 'staff') {
      showToast(lang === 'ar' ? 'لا يملك طاقم العمل صلاحية حذف طاولات' : 'Staff role cannot delete tables');
      return false;
    }

    if (isSupabaseConfigured() && !isValidUuid(id)) {
      console.error('Invalid table ID:', id);
      showToast(lang === 'ar' ? 'تعذر حذف هذه الطاولة' : 'Could not delete table. Please try again.');
      return false;
    }

    const targetRestaurantId = adminProfile?.restaurantId || currentRestaurantId;
    const res = await supabaseService.deleteTable(id, targetRestaurantId);
    if (!res.success) {
      console.error('deleteTable failed:', res.error);
      showToast(
        lang === 'ar'
          ? 'تعذر حذف الطاولة. يرجى المحاولة ثانية.'
          : lang === 'fr'
          ? 'Impossible de supprimer la table. Veuillez réessayer.'
          : 'Could not delete table. Please try again.'
      );
      return false;
    }

    const deletedId = res.data?.id || id;
    setTables((prev) => prev.filter((t) => t.id !== deletedId));
    showToast(lang === 'ar' ? 'تم حذف الطاولة' : 'Table deleted');
    return true;
  };

  const addOffer = async (off: Omit<Offer, 'id'>): Promise<Offer | null> => {
    if (userRole === 'staff') {
      showToast(lang === 'ar' ? 'لا يملك طاقم العمل صلاحية إنشاء عروض' : 'Staff role cannot create promotions');
      return null;
    }
    const targetRestaurantId = adminProfile?.restaurantId || currentRestaurantId;
    if (!targetRestaurantId) {
      showToast(lang === 'ar' ? 'تعذر حفظ التغييرات' : 'Could not save changes');
      return null;
    }

    const res = await supabaseService.addOffer(targetRestaurantId, off);
    if (!res.success || !res.data) {
      console.error('addOffer failed:', res.error);
      showToast(
        lang === 'ar'
          ? 'تعذر إنشاء العرض الترويجي. يرجى المحاولة ثانية.'
          : lang === 'fr'
          ? 'Impossible de créer la promotion. Veuillez réessayer.'
          : 'Could not create promotion. Please try again.'
      );
      return null;
    }

    setOffers((prev) => [res.data!, ...prev]);
    showToast(
      lang === 'ar'
        ? 'تم إنشاء العرض الترويجي بنجاح'
        : lang === 'fr'
        ? 'Promotion créée avec succès'
        : 'Promotion created successfully'
    );
    return res.data;
  };

  const updateOffer = async (id: string, updates: Partial<Offer>): Promise<boolean> => {
    if (userRole === 'staff') {
      showToast(lang === 'ar' ? 'لا يملك طاقم العمل صلاحية تعديل العروض' : 'Staff role cannot modify promotions');
      return false;
    }
    const targetRestaurantId = adminProfile?.restaurantId || currentRestaurantId;
    const res = await supabaseService.updateOffer(id, updates, targetRestaurantId);
    if (!res.success) {
      console.error('updateOffer failed:', res.error);
      showToast(
        lang === 'ar'
          ? 'تعذر حفظ التغييرات. يرجى المحاولة ثانية.'
          : lang === 'fr'
          ? 'Impossible d\'enregistrer les modifications. Veuillez réessayer.'
          : 'Could not save changes. Please try again.'
      );
      return false;
    }

    if (res.data) {
      setOffers((prev) => prev.map((o) => (o.id === id ? res.data! : o)));
    } else {
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
    }

    showToast(
      lang === 'ar'
        ? 'تم تحديث العرض بنجاح'
        : lang === 'fr'
        ? 'Promotion mise à jour'
        : 'Promotion updated successfully'
    );
    return true;
  };

  const deleteOffer = async (id: string): Promise<boolean> => {
    if (userRole === 'staff') {
      showToast(lang === 'ar' ? 'لا يملك طاقم العمل صلاحية حذف العروض' : 'Staff role cannot delete promotions');
      return false;
    }
    const targetRestaurantId = adminProfile?.restaurantId || currentRestaurantId;
    const res = await supabaseService.deleteOffer(id, targetRestaurantId);
    if (!res.success) {
      console.error('deleteOffer failed:', res.error);
      showToast(
        lang === 'ar'
          ? 'تعذر حذف العرض. يرجى المحاولة ثانية.'
          : lang === 'fr'
          ? 'Impossible de supprimer la promotion. Veuillez réessayer.'
          : 'Could not delete promotion. Please try again.'
      );
      return false;
    }

    setOffers((prev) => prev.filter((o) => o.id !== id));
    showToast(
      lang === 'ar'
        ? 'تم حذف العرض الترويجي'
        : lang === 'fr'
        ? 'Promotion supprimée'
        : 'Promotion deleted'
    );
    return true;
  };

  const toggleOffer = async (id: string): Promise<boolean> => {
    const target = offers.find((o) => o.id === id);
    if (!target) return false;
    const nextVal = !target.isActive;
    return await updateOffer(id, { isActive: nextVal });
  };

  // ==========================================
  // IN-APP CONFIRMATION MODAL SYSTEM
  // Replaces browser window.confirm / alert / prompt across iframe environments
  // ==========================================
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    resolve: (val: boolean) => void;
  } | null>(null);

  const confirmAction = useCallback(
    (options: {
      title?: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      variant?: 'danger' | 'warning' | 'info';
    }): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setConfirmModalState({
          isOpen: true,
          ...options,
          resolve,
        });
      });
    },
    []
  );

  const handleModalConfirm = () => {
    if (confirmModalState) {
      confirmModalState.resolve(true);
      setConfirmModalState(null);
    }
  };

  const handleModalCancel = () => {
    if (confirmModalState) {
      confirmModalState.resolve(false);
      setConfirmModalState(null);
    }
  };

  // ==========================================
  // CART OPERATIONS & VERIFIED TOTALS
  // ==========================================
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (
    product: Product,
    quantity: number = 1,
    selectedSize?: DishSize,
    selectedExtras: DishExtra[] = [],
    selectedComplements: SelectedComplement[] = [],
    notes: string = ''
  ) => {
    if (!hasValidTable) {
      showToast(translations[lang]?.scanQrToOrder || translations.en.scanQrToOrder);
      return;
    }

    if (isSupabaseLive && !isValidUuid(product.id)) {
      showToast(
        lang === 'ar'
          ? 'هذا الطبق غير متوفر حالياً'
          : lang === 'fr'
          ? 'Ce plat n\'est pas disponible actuellement'
          : 'This item is currently unavailable'
      );
      return;
    }

    const cleanQty = validateQuantity(quantity);
    const sanitizedNotes = validateCustomerNotes(notes).sanitized;

    // Full price: if sizes are defined, selected size price is full price in DZD; otherwise product.price
    const basePrice = selectedSize ? Number(selectedSize.price) : Number(product.price);
    const extrasPrice = selectedExtras.reduce((sum, extra) => sum + Number(extra.price), 0);
    const complementsPrice = selectedComplements.reduce((sum, comp) => sum + Number(comp.price), 0);
    const unitPrice = basePrice + extrasPrice + complementsPrice;
    const totalPrice = unitPrice * cleanQty;

    const compKey = selectedComplements.map((c) => c.itemId).sort().join('-');
    const extraKey = selectedExtras.map((e) => e.id).sort().join('-');
    const newItem: CartItem = {
      id: `${product.id}_${selectedSize?.id || 'std'}_${extraKey}_${compKey}_${Date.now()}`,
      product,
      quantity: cleanQty,
      selectedSize,
      selectedExtras,
      selectedComplements,
      notes: sanitizedNotes,
      unitPrice,
      totalPrice,
    };

    setCart((prev) => [...prev, newItem]);
    showToast(`${product.name[lang] || product.name.en} added to cart`);
  };

  const updateCartItemQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const cleanQty = validateQuantity(newQty);
            return {
              ...item,
              quantity: cleanQty,
              totalPrice: item.unitPrice * cleanQty,
            };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== cartItemId));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ==========================================
  // ORDER RELIABILITY & IDEMPOTENT CREATION
  // ==========================================
  const placeOrder = async (notes?: string, customerName?: string): Promise<Order> => {
    if (cart.length === 0) {
      const err = new OrderRpcError('EMPTY_ORDER: Cart is empty', { code: 'EMPTY_ORDER' });
      const msg = translateOrderError(err, lang);
      showToast(msg);
      throw err;
    }

    if (isSubmittingOrder) {
      throw new Error(
        lang === 'ar'
          ? 'جاري معالجة الطلب بالفعل'
          : lang === 'fr'
          ? 'Commande déjà en cours d\'envoi'
          : 'Order is already in progress'
      );
    }

    // Verify restaurant is currently open
    if (!isRestaurantCurrentlyOpen(restaurant)) {
      const err = new OrderRpcError('restaurant_closed', { code: 'restaurant_closed' });
      const closedMsg = translateOrderError(err, lang);
      showToast(closedMsg);
      throw err;
    }

    // Verify valid QR table session (never allow ordering without valid active table)
    if (!hasValidTable || !activeTable || !activeTableRecord || activeTableRecord.active === false) {
      const err = new OrderRpcError('INVALID_TABLE: Scan the QR code on your table to order.', {
        code: 'INVALID_TABLE',
      });
      logOrderRpcError('AppContext.placeOrder(precheck)', err);
      showToast(translations[lang]?.scanQrToOrder || translations.en.scanQrToOrder);
      throw err;
    }

    // In LIVE Supabase Mode: verify restaurant, table, and items (never wipe cart on failure)
    if (isSupabaseLive) {
      if (!currentRestaurantId || !isValidUuid(currentRestaurantId)) {
        const err = new OrderRpcError('INVALID_RESTAURANT: Restaurant not found or invalid.', {
          code: 'INVALID_RESTAURANT',
        });
        logOrderRpcError('AppContext.placeOrder(precheck)', err);
        showToast(translateOrderError(err, lang));
        throw err;
      }

      if (!activeTableRecord.id || !isValidUuid(activeTableRecord.id)) {
        const err = new OrderRpcError('INVALID_TABLE: Please scan a valid registered table QR code.', {
          code: 'INVALID_TABLE',
        });
        logOrderRpcError('AppContext.placeOrder(precheck)', err);
        showToast(translateOrderError(err, lang));
        throw err;
      }

      if (activeTableRecord.restaurantId && activeTableRecord.restaurantId !== currentRestaurantId) {
        const err = new OrderRpcError('INVALID_TABLE: This table belongs to another restaurant.', {
          code: 'INVALID_TABLE',
        });
        logOrderRpcError('AppContext.placeOrder(precheck)', err);
        showToast(translateOrderError(err, lang));
        throw err;
      }

      for (const item of cart) {
        if (!item.product.id || !isValidUuid(item.product.id)) {
          const err = new OrderRpcError(
            `INVALID_PRODUCT_ID: Invalid dish identifier "${item.product.name[lang] || item.product.name.en || ''}"`,
            { code: 'INVALID_PRODUCT_ID' }
          );
          logOrderRpcError('AppContext.placeOrder(precheck)', err);
          showToast(translateOrderError(err, lang));
          throw err;
        }
      }
    }

    // Security & Availability Verification
    const integrity = validateCartIntegrity(cart, products);
    if (!integrity.isValid) {
      const err = new OrderRpcError(integrity.error || 'Cart verification failed', {
        code: integrity.errorCode || 'PRODUCT_UNAVAILABLE',
      });
      logOrderRpcError('AppContext.placeOrder(integrity)', err);
      showToast(translateOrderError(err, lang));
      throw err;
    }

    // Input Sanitization
    const sanitizedNotes = validateCustomerNotes(notes).sanitized;
    const tableNum = activeTable;
    const tableId = activeTableRecord?.id || null;

    setIsSubmittingOrder(true);

    try {
      const createdOrder = await supabaseService.createOrder(
        currentRestaurantId,
        tableId,
        tableNum,
        cart,
        integrity.verifiedTotal,
        sanitizedNotes
      );

      setOrders((prev) => [createdOrder, ...prev]);
      if (!isSupabaseConfigured()) {
        setDemoAllOrders((prev) => [createdOrder, ...prev]);
      }
      setActiveOrder(createdOrder);
      clearCart();
      setIsCartOpen(false);
      setIsOrderStatusOpen(true);
      showToast(
        lang === 'ar'
          ? `تم إرسال الطلب #${createdOrder.orderNumber} إلى المطبخ!`
          : lang === 'fr'
          ? `Commande #${createdOrder.orderNumber} envoyée en cuisine !`
          : `Order #${createdOrder.orderNumber} sent to kitchen!`
      );

      // Sound feedback
      soundAlert.playNewOrderChime();

      if (!isSupabaseConfigured()) {
        setTimeout(() => {
          setOrders((prev) =>
            prev.map((o) => (o.id === createdOrder.id && o.status === 'new' ? { ...o, status: 'preparing' } : o))
          );
          setDemoAllOrders((prev) =>
            prev.map((o) => (o.id === createdOrder.id && o.status === 'new' ? { ...o, status: 'preparing' } : o))
          );
          setActiveOrder((prev) => (prev?.id === createdOrder.id ? { ...prev, status: 'preparing' } : prev));
        }, 12000);
      }

      return createdOrder;
    } catch (e: any) {
      logOrderRpcError('AppContext.placeOrder', e);
      const userMessage = translateOrderError(e, lang);
      showToast(userMessage);
      throw e;
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const existing = orders.find((o) => o.id === orderId);
    if (existing && !isValidStatusTransition(existing.status, status)) {
      showToast(lang === 'ar' ? 'تعذر تغيير حالة الطلب' : `Cannot change status from ${existing.status} to ${status}`);
      return;
    }

    const previousStatus = existing?.status;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    if (!isSupabaseConfigured()) {
      setDemoAllOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    }
    if (activeOrder && activeOrder.id === orderId) {
      setActiveOrder((prev) => (prev ? { ...prev, status } : null));
    }

    const ok = await supabaseService.updateOrderStatus(orderId, status);
    if (!ok) {
      if (previousStatus) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: previousStatus } : o)));
      }
      showToast(
        lang === 'ar'
          ? 'تعذر تحديث حالة الطلب، يرجى المحاولة مرة أخرى'
          : lang === 'fr'
          ? 'Impossible de mettre à jour le statut de la commande'
          : 'Could not update order status. Please try again.'
      );
      return;
    }

    setOrdersLastUpdated(new Date());
    showToast(
      lang === 'ar'
        ? 'تم تحديث حالة الطلب'
        : lang === 'fr'
        ? 'Statut de la commande mis à jour'
        : `Order status updated to ${status}`
    );
  };

  const archiveOrders = useCallback(
    async (
      orderIds: string[]
    ): Promise<{ success: boolean; archivedCount: number; error?: string }> => {
      const uniqueIds = Array.from(new Set(orderIds.filter(Boolean)));
      if (uniqueIds.length === 0) {
        return { success: false, archivedCount: 0 };
      }

      if (!isSupabaseConfigured()) {
        const nowIso = new Date().toISOString();
        const idSet = new Set(uniqueIds);
        setDemoAllOrders((prev) =>
          prev.map((o) => (idSet.has(o.id) ? { ...o, archivedAt: nowIso } : o))
        );
        setOrders((prev) => prev.filter((o) => !idSet.has(o.id)));
        setOrdersLastUpdated(new Date());
        showToast(
          lang === 'ar'
            ? `تمت أرشفة ${uniqueIds.length} طلب بنجاح`
            : lang === 'fr'
            ? `${uniqueIds.length} commande(s) archivée(s)`
            : `Archived ${uniqueIds.length} order(s)`
        );
        return { success: true, archivedCount: uniqueIds.length };
      }

      const targetRestId = adminProfile?.restaurantId || currentRestaurantId;
      const res = await supabaseService.archiveOrders(targetRestId, uniqueIds);

      if (!res.success || !res.data || res.data.length === 0) {
        const friendlyErr =
          lang === 'ar'
            ? 'تعذر أرشفة الطلب، يرجى المحاولة مرة أخرى'
            : lang === 'fr'
            ? "Impossible d'archiver la commande. Veuillez réessayer."
            : 'Unable to archive order(s). Please try again.';
        showToast(friendlyErr);
        return { success: false, archivedCount: 0, error: friendlyErr };
      }

      const archivedSet = new Set(res.data);
      setOrders((prev) => prev.filter((o) => !archivedSet.has(o.id)));
      setOrdersLastUpdated(new Date());
      showToast(
        lang === 'ar'
          ? `تمت أرشفة ${res.data.length} طلب بنجاح`
          : lang === 'fr'
          ? `${res.data.length} commande(s) archivée(s)`
          : `Archived ${res.data.length} order(s)`
      );
      return { success: true, archivedCount: res.data.length };
    },
    [adminProfile?.restaurantId, currentRestaurantId, lang, showToast]
  );

  // ==========================================
  // WAITER SERVICE CALLS
  // ==========================================
  const callWaiter = async (type: 'waiter' | 'bill' | 'water' | 'cleanup', notes?: string) => {
    if (!isRestaurantCurrentlyOpen(restaurant)) {
      showToast(
        lang === 'ar'
          ? 'المطعم مغلق حالياً، خدمة الطاولات غير متاحة في الوقت الحالي'
          : lang === 'fr'
          ? 'Le restaurant est actuellement fermé. Le service de table n\'est pas disponible pour le moment.'
          : 'The restaurant is currently closed. Table service is not available at this time.'
      );
      return;
    }

    if (!hasValidTable || !activeTable) {
      showToast(translations[lang]?.scanQrToOrder || translations.en.scanQrToOrder);
      return;
    }

    const tableNum = activeTable;
    const tableId = activeTableRecord?.id || null;
    const serviceType = type === 'bill' ? 'bill' : 'waiter';

    try {
      const req = await supabaseService.createWaiterRequest(
        currentRestaurantId,
        tableId,
        tableNum,
        serviceType
      );
      setServiceRequests((prev) => [req, ...prev]);

      if (serviceType === 'bill') {
        showToast(
          lang === 'ar'
            ? `تم طلب الحساب للطاولة ${tableNum}`
            : `Bill requested for Table ${tableNum}. Cashier notified!`
        );
      } else {
        showToast(
          lang === 'ar'
            ? `تم استدعاء النادل للطاولة ${tableNum}`
            : `Waiter summoned for Table ${tableNum}. On the way!`
        );
      }
    } catch (e: any) {
      console.error('Waiter request failed:', e);
      const isClosed = (e?.message || '').toLowerCase().includes('restaurant_closed');
      showToast(
        isClosed
          ? lang === 'ar'
            ? 'المطعم مغلق حالياً، خدمة الطاولات غير متاحة في الوقت الحالي'
            : lang === 'fr'
            ? 'Le restaurant est actuellement fermé. Le service de table n\'est pas disponible pour le moment.'
            : 'The restaurant is currently closed. Table service is not available at this time.'
          : lang === 'ar'
          ? 'تعذر إرسال الطلب، يرجى المحاولة ثانية'
          : lang === 'fr'
          ? 'Impossible d\'envoyer la demande, veuillez réessayer'
          : 'Could not send request, please try again'
      );
    }
  };

  const resolveServiceRequest = async (id: string) => {
    setServiceRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'resolved' } : r)));
    await supabaseService.resolveWaiterRequest(id);
  };

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        theme,
        toggleTheme,
        isSupabaseLive,
        isAuthLoading,
        user,
        adminProfile,
        userRole,
        signInAdmin,
        signUpAdmin,
        signUpStaff,
        signOutAdmin,
        sendPasswordReset,
        updatePassword,
        updateAdminProfileName,
        isPasswordRecoveryMode,
        setIsPasswordRecoveryMode,
        isPendingProfile,
        createStaffInvite,
        revokeStaffInvite,
        acceptStaffInvite,
        removeTeamMember,
        teamMembers,
        teamInvites,
        isTeamLoading,
        teamError,
        loadTeamData,
        currentRestaurantId,
        setCurrentRestaurantId,
        isSoundEnabled,
        setIsSoundEnabled,
        playTestChime,
        highlightedOrderId,
        latestRealtimeOrder,
        currentView,
        setCurrentView,
        isAdminAuthenticated,
        setIsAdminAuthenticated,
        activeTable,
        setActiveTable,
        activeTableRecord,
        hasValidTable,
        tables,
        addTable,
        updateTable,
        deleteTable,
        isTableInvalid,
        isRestaurantNotFound,
        restaurantErrorMessage,
        restaurant,
        isRestaurantOpen,
        updateRestaurant,
        setRestaurantStatus,
        refreshRestaurantStatus,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        toggleProductAvailability,
        offers,
        addOffer,
        updateOffer,
        deleteOffer,
        toggleOffer,
        cart,
        addToCart,
        updateCartItemQuantity,
        removeCartItem,
        clearCart,
        cartTotal,
        cartCount,
        isCartOpen,
        setIsCartOpen,
        isSubmittingOrder,
        selectedProductForDetail,
        setSelectedProductForDetail,
        orders,
        demoAllOrders,
        isOrdersLoading,
        ordersError,
        ordersLastUpdated,
        refreshDailyOrders,
        archiveOrders,
        activeOrder,
        setActiveOrder,
        placeOrder,
        updateOrderStatus,
        isOrderStatusOpen,
        setIsOrderStatusOpen,
        serviceRequests,
        callWaiter,
        resolveServiceRequest,
        realtimeStatus,
        toastMessage,
        showToast,
        isOnboardingChecklistOpen,
        setIsOnboardingChecklistOpen,
        dismissOnboardingChecklist,
        onboardingStatus,
        confirmAction,
      }}
    >
      {children}
      {confirmModalState && confirmModalState.isOpen && (
        <ConfirmModal
          isOpen={confirmModalState.isOpen}
          title={confirmModalState.title}
          message={confirmModalState.message}
          confirmLabel={confirmModalState.confirmLabel}
          cancelLabel={confirmModalState.cancelLabel}
          variant={confirmModalState.variant}
          lang={lang}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
