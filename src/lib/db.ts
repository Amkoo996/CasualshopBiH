import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Product,
  Order,
  NewsletterSubscriber,
  StoreSettings,
  OrderStatus,
  DEFAULT_STORE_SETTINGS,
  HomeCMSContent,
  DEFAULT_CMS_CONTENT,
} from '../types';

// ==========================================
// 1. UPRAVLJANJE PROIZVODIMA (PRODUCTS)
// ==========================================
export const getProducts = async (includeHidden = false): Promise<Product[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const products: Product[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Product;
      const product = { ...data, id: docSnap.id };
      if (includeHidden || !product.isHidden) {
        products.push(product);
      }
    });
    return products;
  } catch (error) {
    console.error('Greška pri dohvatanju proizvoda:', error);
    return [];
  }
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...(docSnap.data() as Product), id: docSnap.id };
    }
    return null;
  } catch (error) {
    console.error(`Greška pri dohvatanju proizvoda ${id}:`, error);
    return null;
  }
};

export const saveProduct = async (productData: Partial<Product>): Promise<void> => {
  const id = productData.id || `cs-${Date.now()}`;
  const docRef = doc(db, 'products', id);
  await setDoc(docRef, { ...productData, id }, { merge: true });
};

export const deleteProduct = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'products', id));
};

// ==========================================
// 2. UPRAVLJANJE NARUDŽBAMA (ORDERS)
// ==========================================
export const getOrders = async (): Promise<Order[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'orders'));
    const orders: Order[] = [];
    querySnapshot.forEach((docSnap) => {
      orders.push({ ...(docSnap.data() as Order), id: docSnap.id });
    });
    orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return orders;
  } catch (error) {
    console.error('Greška pri dohvatanju narudžbi:', error);
    return [];
  }
};

// F1 FIX: Zamjena za staru funkciju. Čita samo 'order_tracking' kolekciju
export const getOrderStatus = async (orderNumber: string) => {
  try {
    const id = orderNumber.trim().replace(/^#/, '').toUpperCase();
    const snap = await getDoc(doc(db, 'order_tracking', id));
    return snap.exists() ? (snap.data() as { status: OrderStatus; createdAt: string }) : null;
  } catch (error) {
    console.error('Greška pri traženju statusa narudžbe:', error);
    return null;
  }
};

export const createOrder = async (orderData: Omit<Order, 'id'>): Promise<string> => {
  // S3 FIX: Dokument u orders kolekciji dobiva ID jednak broju narudžbe
  const newOrderRef = doc(db, 'orders', orderData.orderNumber);
  const orderId = newOrderRef.id;

  // 1. Upis u bazu, ažuriranje zaliha i kreiranje order_tracking dokumenta
  await runTransaction(db, async (transaction) => {
    const productReads = [];
    for (const item of orderData.items) {
      const prodRef = doc(db, 'products', item.id);
      const prodSnap = await transaction.get(prodRef);
      productReads.push({ item, prodRef, prodSnap });
    }

    for (const { item, prodRef, prodSnap } of productReads) {
      if (prodSnap.exists()) {
        const prodData = prodSnap.data() as any;
        const currentSizes = { ...(prodData.sizes || {}) };
        const currentStock = currentSizes[item.size] ?? 0;
        currentSizes[item.size] = Math.max(0, currentStock - item.quantity);
        transaction.update(prodRef, { sizes: currentSizes });
      }
    }

    const cleanOrderPayload = {
      id: orderId,
      orderNumber: orderData.orderNumber,
      items: orderData.items,
      customer: orderData.customer,
      subtotal: orderData.subtotal,
      shippingFee: orderData.shippingFee,
      total: orderData.total,
      paymentMethod: orderData.paymentMethod || 'cash_on_delivery',
      status: 'Nova',
      createdAt: orderData.createdAt || new Date().toISOString(),
      promoCode: orderData.promoCode || null,
      discountAmount: orderData.discountAmount || 0,
    };

    // Glavni upis
    transaction.set(newOrderRef, cleanOrderPayload);

    // F1 FIX: Transakcijski upis u order_tracking
    const trackingRef = doc(db, 'order_tracking', orderData.orderNumber);
    transaction.set(trackingRef, {
      orderNumber: orderData.orderNumber,
      status: 'Nova',
      createdAt: cleanOrderPayload.createdAt
    });
  });

  const fullOrderObject: Order = { ...orderData, id: orderId };

  // 2. Slanje notifikacije na Telegram i EmailJS
  try {
    const c = orderData.customer || ({} as any);
    const buyerName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Kupac';
    const itemsText = orderData.items.map((i) => `• ${i.quantity}x ${i.name} (${i.size})`).join('\n');
    const isPickup = c.address?.includes('Lično');
    const deliveryStatus = isPickup ? `Preuzimanje: Lično Sarajevo (${c.note || ''})` : `Dostava: ${c.city || 'N/A'}, ${c.address || ''}`;

    const telegramText =
      `🛍️ NOVA NARUDŽBA #${orderData.orderNumber}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 Kupac: ${buyerName}\n` +
      `📞 Tel: ${c.phone || 'N/A'}\n` +
      `📍 ${deliveryStatus}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📦 Artikli:\n${itemsText}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💰 Iznos: ${orderData.total.toFixed(2)} KM (${isPickup ? 'Lično plaćanje' : 'Pouzećem'})`;

    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: telegramText,
        type: 'order',
        orderData: fullOrderObject,
      }),
    }).catch(() => {});
  } catch (err) {
    console.error('Greška pri pripremi notifikacije:', err);
  }

  return orderId;
};

export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus,
  trackingInfo?: { trackingNumber?: string; courierName?: string }
): Promise<void> => {
  const orderRef = doc(db, 'orders', orderId);
  const updateData: any = { status };
  if (trackingInfo?.trackingNumber !== undefined) {
    updateData.trackingNumber = trackingInfo.trackingNumber;
  }
  if (trackingInfo?.courierName !== undefined) {
    updateData.courierName = trackingInfo.courierName;
  }
  
  // Ažuriranje glavne narudžbe
  await updateDoc(orderRef, updateData);

  // F1 FIX: Sinhronizacija statusa sa order_tracking
  try {
    const trackingRef = doc(db, 'order_tracking', orderId);
    await updateDoc(trackingRef, { status });
  } catch (err) {
    console.warn('Upozorenje: Praćenje narudžbe nije ažurirano:', err);
  }
};

// ==========================================
// 3. RECENZIJE PROIZVODA (REVIEWS)
// ==========================================
export const getProductReviews = async (productId: string) => {
  try {
    const q = query(collection(db, 'reviews'), where('productId', '==', productId));
    const snap = await getDocs(q);
    const reviews: any[] = [];
    snap.forEach((d) => {
      reviews.push({ id: d.id, ...d.data() });
    });
    reviews.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return reviews;
  } catch (err) {
    console.error('Greška pri dohvatanju recenzija:', err);
    return [];
  }
};

export const submitProductReview = async (reviewData: any): Promise<string> => {
  const newReviewRef = doc(collection(db, 'reviews'));
  const reviewId = newReviewRef.id;
  const payload = {
    productId: reviewData.productId,
    author: reviewData.author || reviewData.userName || 'Kupac',
    userName: reviewData.userName || reviewData.author || 'Kupac',
    rating: Number(reviewData.rating) || 5,
    comment: reviewData.comment || '',
    createdAt: reviewData.createdAt || new Date().toISOString(),
  };
  await setDoc(newReviewRef, payload);
  return reviewId;
};

export const addReview = submitProductReview;

// ==========================================
// 4. NEWSLETTER PRETPLATA (SUBSCRIBERS)
// ==========================================
export const getSubscribers = async (): Promise<NewsletterSubscriber[]> => {
  try {
    const snap = await getDocs(collection(db, 'subscribers'));
    const subs: NewsletterSubscriber[] = [];
    snap.forEach((d) => {
      const data = d.data();
      subs.push({
        id: d.id,
        email: data.email || d.id,
        subscribedAt: data.subscribedAt || data.createdAt || new Date().toISOString(),
        consent: data.consent !== undefined ? Boolean(data.consent) : true,
      } as NewsletterSubscriber);
    });
    return subs;
  } catch (error) {
    console.error('Greška pri dohvatanju pretplatnika:', error);
    return [];
  }
};

export const subscribeNewsletter = async (email: string): Promise<boolean> => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docRef = doc(db, 'subscribers', cleanEmail);
    await setDoc(docRef, {
      email: cleanEmail,
      subscribedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      consent: true,
    });
    return true;
  } catch (error) {
    console.error('Greška pri newsletter prijavi:', error);
    return false;
  }
};

export const subscribeToNewsletter = subscribeNewsletter;

// ==========================================
// 5. POSTAVKE TRGOVINE I CMS
// ==========================================
export const getStoreSettings = async (): Promise<StoreSettings> => {
  try {
    const docRef = doc(db, 'settings', 'general');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...DEFAULT_STORE_SETTINGS, ...(docSnap.data() as StoreSettings) };
    }
    return DEFAULT_STORE_SETTINGS;
  } catch (error) {
    console.error('Greška pri dohvatanju postavki:', error);
    return DEFAULT_STORE_SETTINGS;
  }
};

export const saveStoreSettings = async (settings: StoreSettings): Promise<void> => {
  const docRef = doc(db, 'settings', 'general');
  await setDoc(docRef, settings, { merge: true });
};

export const getCMSContent = async (): Promise<HomeCMSContent> => {
  try {
    const docRef = doc(db, 'settings', 'cms');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...DEFAULT_CMS_CONTENT, ...(docSnap.data() as HomeCMSContent) };
    }
    return DEFAULT_CMS_CONTENT;
  } catch (error) {
    console.error('Greška pri dohvatanju CMS sadržaja:', error);
    return DEFAULT_CMS_CONTENT;
  }
};

export const saveCMSContent = async (content: HomeCMSContent): Promise<void> => {
  const docRef = doc(db, 'settings', 'cms');
  await setDoc(docRef, content, { merge: true });
};