export type Category =
  | 'Majice'
  | 'Duksevi i hoodice'
  | 'Jakne'
  | 'Pantalone i trenerke'
  | 'Šorcevi'
  | 'Kape i šeširi'
  | 'Dodaci (Accessories)'
  | 'Rasprodano';

export const CATEGORIES: Category[] = [
  'Majice',
  'Duksevi i hoodice',
  'Jakne',
  'Pantalone i trenerke',
  'Šorcevi',
  'Kape i šeširi',
  'Dodaci (Accessories)',
  'Rasprodano',
];

export type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL' | 'One size';

export type SizeStock = {
  [key in Size]?: number;
};

export interface Product {
  id: string;
  name: string;
  price: number; // in KM
  originalPrice?: number;
  category: Category;
  color: string;
  material: string;
  description: string;
  careInstructions?: string;
  details?: string[];
  sizes: SizeStock;
  images: string[];
  isNew?: boolean;
  featured?: boolean;
  isHidden?: boolean;
  createdAt?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: Size;
  quantity: number;
  maxStock: number;
}

export type OrderStatus = 'Nova' | 'Potvrđena' | 'Poslana' | 'Dostavljena' | 'Otkazana';

export interface CustomerDetails {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  postalCode: string;
  note?: string;
  termsAccepted?: boolean;
}

export interface Order {
  id?: string;
  orderNumber: string;
  items: CartItem[];
  customer: CustomerDetails;
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: 'cash_on_delivery';
  status: OrderStatus;
  promoCode?: string;
  discountAmount?: number;
  createdAt: string;
}

export interface NewsletterSubscriber {
  id?: string;
  email: string;
  consent: boolean;
  subscribedAt: string;
}

export interface StoreSettings {
  shippingFee: number;
  freeShippingThreshold: number;
  phone: string;
  email: string;
  instagramUrl: string;
  whatsappNumber: string;
  topBarText: string;
  sizeGuideText?: string;
  sellerName?: string;
  sellerAddress?: string;
  sellerIdNumber?: string;

  hiddenCategories?: Category[];

  bgColor?: string;
  textColor?: string;
  yellowBrand?: string;
  scrollThumb?: string;
  fontBody?: string;
  fontHeading?: string;
  fontSize?: number;
  bgImage?: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  shippingFee: 12.0,
  freeShippingThreshold: 100.0,
  phone: '+387 61 000 000',
  email: 'info@casualshop.ba',
  instagramUrl: 'https://www.instagram.com/casualshop.bih',
  whatsappNumber: '+387 61 000 000',
  topBarText: 'Plaćanje pouzećem • Brza pošta 12 KM • Moguće otvaranje paketa prije preuzimanja',
  sizeGuideText: 'Sve naše majice i duksevi imaju ugodan streetwear kroj. Dimenzije su izražene u centimetrima (cm): S (Širina 54cm, Dužina 70cm), M (Širina 57cm, Dužina 73cm), L (Širina 60cm, Dužina 76cm), XL (Širina 63cm, Dužina 79cm), XXL (Širina 66cm, Dužina 82cm). Kape i dodaci su u univerzalnoj veličini (One size).',
  sellerName: '',
  sellerAddress: '',
  sellerIdNumber: '',

  hiddenCategories: [
    'Duksevi i hoodice',
    'Pantalone i trenerke',
    'Šorcevi',
    'Kape i šeširi',
  ],

  bgColor: '#F4F2EC',
  textColor: '#111111',
  yellowBrand: '#F7E97F',
  scrollThumb: '#0A0A0A',
  fontBody: "'Inter', sans-serif",
  fontHeading: "'Poppins', sans-serif",
  fontSize: 16,
  bgImage: '',
};

export interface AbandonedCartSession {
  id?: string;
  email?: string;
  phone?: string;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  lastUpdated: string;
  recovered?: boolean;
}

export interface StoreFunnelMetrics {
  totalVisits: number;
  productViews: number;
  addToCartCount: number;
  checkoutStarts: number;
  completedPurchases: number;
}

export type AnalyticsEventType = 'visit' | 'add_to_cart' | 'view_item' | 'begin_checkout' | 'purchase';

export interface AnalyticsEvent {
  id?: string;
  eventType: AnalyticsEventType;
  visitorId: string;
  timestamp: string;
  date: string;
  metadata?: {
    productId?: string;
    productName?: string;
    price?: number;
    size?: string;
    path?: string;
    orderNumber?: string;
    total?: number;
    [key: string]: any;
  };
}

export interface AnalyticsStats {
  uniqueVisitorsCount: number;
  totalVisitsCount: number;
  addToCartCount: number;
  uniqueAddToCartUsersCount: number;
  addToCartRate: number;
  dailyTrends: {
    date: string;
    fullDate: string;
    uniqueVisitors: number;
    visits: number;
    addToCart: number;
  }[];
  recentEvents: AnalyticsEvent[];
}

export interface ProductReview {
  id?: string;
  productId: string;
  userName: string;
  userEmail?: string;
  rating: number;
  comment: string;
  createdAt: string;
  verifiedPurchase?: boolean;
}

export interface UserWishlist {
  userId: string;
  productIds: string[];
  updatedAt: string;
}
