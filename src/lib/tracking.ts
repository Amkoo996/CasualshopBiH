import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  increment, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from './firebase';

export interface StoreFunnelMetrics {
  totalVisits: number;
  productViews: number;
  addToCartCount: number;
  checkoutStarts: number;
  completedPurchases: number;
}

export interface AnalyticsEvent {
  id?: string;
  eventType: 'visit' | 'product_view' | 'add_to_cart' | 'checkout_start' | 'purchase';
  visitorId: string;
  timestamp: string;
  date: string;
  metadata?: Record<string, any>;
}

// P1.4: Inicijalne vrijednosti postavljene na 0 (bez lažnih brojki)
export const DEFAULT_METRICS: StoreFunnelMetrics = {
  totalVisits: 0,
  productViews: 0,
  addToCartCount: 0,
  checkoutStarts: 0,
  completedPurchases: 0,
};

function getVisitorId(): string {
  let id = localStorage.getItem('casualshop_visitor_id');
  if (!id) {
    id = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('casualshop_visitor_id', id);
  }
  return id;
}

export async function recordAnalyticsEvent(
  eventType: AnalyticsEvent['eventType'],
  metadata?: Record<string, any>
) {
  // P2.2: Praćenje se izvršava samo ako je korisnik prihvatio kolačiće
  if (localStorage.getItem('casualshop_cookie_consent') !== 'accepted') return;

  try {
    const visitorId = getVisitorId();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const eventData: Omit<AnalyticsEvent, 'id'> = {
      eventType,
      visitorId,
      timestamp: now.toISOString(),
      date: dateStr,
      ...(metadata ? { metadata } : {}),
    };

    const eventsRef = collection(db, 'analytics_events');
    const newDocRef = doc(eventsRef);
    await setDoc(newDocRef, eventData);

    // Ažuriranje agregiranih funkcija u store_metrics/funnel
    const funnelRef = doc(db, 'store_metrics', 'funnel');
    const updateData: Record<string, any> = {};

    if (eventType === 'visit') updateData.totalVisits = increment(1);
    if (eventType === 'product_view') updateData.productViews = increment(1);
    if (eventType === 'add_to_cart') updateData.addToCartCount = increment(1);
    if (eventType === 'checkout_start') updateData.checkoutStarts = increment(1);
    if (eventType === 'purchase') updateData.completedPurchases = increment(1);

    if (Object.keys(updateData).length > 0) {
      await updateDoc(funnelRef, updateData).catch(async () => {
        await setDoc(funnelRef, { ...DEFAULT_METRICS, ...updateData }, { merge: true });
      });
    }
  } catch (error) {
    console.error('Greška pri snimanju analitike:', error);
  }
}

// POMOĆNE EXPORT FUNKCIJE KOJE POZIVAJU KOMPONENTE
export async function getFunnelMetrics(): Promise<StoreFunnelMetrics> {
  try {
    const funnelRef = doc(db, 'store_metrics', 'funnel');
    const funnelSnap = await getDoc(funnelRef);
    if (funnelSnap.exists()) {
      return funnelSnap.data() as StoreFunnelMetrics;
    }
  } catch (error) {
    console.error('Greška pri dohvaćanju funnel metrika:', error);
  }
  return DEFAULT_METRICS;
}

export async function recordProductView(productId?: string) {
  await recordAnalyticsEvent('product_view', productId ? { productId } : undefined);
}

export async function recordAddToCartEvent(productId?: string) {
  await recordAnalyticsEvent('add_to_cart', productId ? { productId } : undefined);
}

export async function recordCheckoutStart() {
  await recordAnalyticsEvent('checkout_start');
}

export async function recordCompletedPurchase(orderNumber?: string, total?: number) {
  await recordAnalyticsEvent('purchase', { orderNumber, total });
}

export async function trackVisit() {
  if (localStorage.getItem('casualshop_cookie_consent') !== 'accepted') return;
  
  const lastVisit = sessionStorage.getItem('casualshop_visited_session');
  if (!lastVisit) {
    sessionStorage.setItem('casualshop_visited_session', 'true');
    await recordAnalyticsEvent('visit');
  }
}

export async function saveCartSession(cartData: any) {
  if (localStorage.getItem('casualshop_cookie_consent') !== 'accepted') return;
  
  try {
    const visitorId = getVisitorId();
    const cartRef = doc(db, 'abandoned_carts', visitorId);

    const isArray = Array.isArray(cartData);
    const items = isArray ? cartData : cartData?.items || [];

    if (items.length === 0 && isArray) {
      await setDoc(cartRef, { items: [], updatedAt: new Date().toISOString() }, { merge: true });
      return;
    }

    const payload = isArray
      ? { visitorId, items, updatedAt: new Date().toISOString() }
      : { visitorId, ...cartData, updatedAt: new Date().toISOString() };

    await setDoc(cartRef, payload, { merge: true });
  } catch (error) {
    console.error('Greška pri spašavanju sesije korpe:', error);
  }
}

export async function getAnalyticsStats() {
  try {
    const funnelRef = doc(db, 'store_metrics', 'funnel');
    const funnelSnap = await getDoc(funnelRef);
    const funnelData = funnelSnap.exists() ? (funnelSnap.data() as StoreFunnelMetrics) : DEFAULT_METRICS;

    const eventsRef = collection(db, 'analytics_events');
    const eventsSnap = await getDocs(query(eventsRef, orderBy('timestamp', 'desc'), limit(1000)));

    const allUniqueVisitors = new Set<string>();
    const allAddToCartVisitors = new Set<string>();
    let totalVisits = 0;
    let totalAddToCart = 0;

    const dailyMap = new Map<string, {
      date: string;
      fullDate: string;
      uniqueVisitorsSet: Set<string>;
      visits: number;
      addToCart: number;
    }>();

    eventsSnap.docs.forEach((d) => {
      const data = d.data() as AnalyticsEvent;
      allUniqueVisitors.add(data.visitorId);

      if (data.eventType === 'visit') {
        totalVisits++;
      }
      if (data.eventType === 'add_to_cart') {
        totalAddToCart++;
        allAddToCartVisitors.add(data.visitorId);
      }

      const dateKey = data.date || data.timestamp?.split('T')[0];
      if (dateKey) {
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, {
            date: dateKey.substring(5),
            fullDate: dateKey,
            uniqueVisitorsSet: new Set(),
            visits: 0,
            addToCart: 0,
          });
        }
        const entry = dailyMap.get(dateKey)!;
        entry.uniqueVisitorsSet.add(data.visitorId);
        if (data.eventType === 'visit') entry.visits++;
        if (data.eventType === 'add_to_cart') entry.addToCart++;
      }
    });

    const dailyTrends = Array.from(dailyMap.values())
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate))
      .slice(-14)
      .map((d) => ({
        date: d.date,
        fullDate: d.fullDate,
        uniqueVisitors: d.uniqueVisitorsSet.size,
        visits: d.visits,
        addToCart: d.addToCart,
      }));

    return {
      funnel: funnelData,
      uniqueVisitorsCount: allUniqueVisitors.size,
      totalVisitsCount: totalVisits || funnelData.totalVisits,
      addToCartCount: totalAddToCart || funnelData.addToCartCount,
      uniqueAddToCartUsersCount: allAddToCartVisitors.size,
      dailyTrends,
    };
  } catch (error) {
    console.error('Greška pri učitavanju analitike:', error);
    return {
      funnel: DEFAULT_METRICS,
      uniqueVisitorsCount: 0,
      totalVisitsCount: 0,
      addToCartCount: 0,
      uniqueAddToCartUsersCount: 0,
      dailyTrends: [],
    };
  }
}
