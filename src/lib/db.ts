import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Product,
  Order,
  StoreSettings,
  DEFAULT_STORE_SETTINGS,
  NewsletterSubscriber,
  ProductReview,
  Category,
  HomeCMSContent,
  DEFAULT_CMS_CONTENT,
} from '../types';
import { normalizePhone, sha256 } from './validation';

// ==========================================
// PROIZVODI (PRODUCTS)
// ==========================================

export const getProducts = async (includeHidden = false): Promise<Product[]> => {
  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    
    let products = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Product[];

    if (!includeHidden) {
      products = products.filter((p) => !p.isHidden);
    }

    return products;
  } catch (error) {
    console.error('Greška pri dohvaćanju proizvoda:', error);
    return [];
  }
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Product;
    }
    return null;
  } catch (error) {
    console.error('Greška pri dohvaćanju proizvoda po ID-u:', error);
    return null;
  }
};

export const addProduct = async (productData: Omit<Product, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      ...productData,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Greška pri dodavanju proizvoda:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, productData: Partial<Product>): Promise<void> => {
  try {
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, productData);
  } catch (error) {
    console.error('Greška pri ažuriranju proizvoda:', error);
    throw error;
  }
};

export const saveProduct = async (productData: Partial<Product> & { id?: string }): Promise<string> => {
  if (productData.id) {
    const { id, ...data } = productData;
    await updateProduct(id, data);
    return id;
  } else {
    return await addProduct(productData as Omit<Product, 'id'>);
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'products', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Greška pri brisanju proizvoda:', error);
    throw error;
  }
};

// ==========================================
// NARUDŽBE (ORDERS & TRACKING)
// ==========================================

export const createOrder = async (orderData: Omit<Order, 'id'>): Promise<string> => {
  try {
    const phoneKey = normalizePhone(orderData.customer?.phone || '') || orderData.customer?.phone || '';
    const phoneHash = await sha256(phoneKey);
    const createdAt = new Date().toISOString();

    const ordersRef = collection(db, 'orders');
    const newOrderRef = doc(ordersRef);
    const trackingRef = doc(db, 'order_tracking', orderData.orderNumber);

    await runTransaction(db, async (transaction) => {
      // 1. Provjera i smanjivanje zaliha
      for (const item of orderData.items) {
        const productRef = doc(db, 'products', item.id);
        const productSnap = await transaction.get(productRef);

        if (productSnap.exists()) {
          const pData = productSnap.data() as Product;
          const currentStock = pData.sizes?.[item.size] ?? 0;
          const newStock = Math.max(0, currentStock - item.quantity);

          transaction.update(productRef, {
            [`sizes.${item.size}`]: newStock,
          });
        }
      }

      // 2. Upis kompletne narudžbe u osjetljivu kolekciju
      transaction.set(newOrderRef, {
        ...orderData,
        createdAt,
      });

      // 3. Upis anonimiziranih podataka za praćenje
      transaction.set(trackingRef, {
        orderNumber: orderData.orderNumber,
        status: 'Nova',
        phoneHash,
        createdAt,
      });
    });

    // 4. Slanje notifikacije na Telegram preko backend funkcije
    sendOrderToTelegram({ ...orderData, id: newOrderRef.id }).catch((err) => {
      console.warn('Slanje Telegram obavijesti nije uspjelo:', err);
    });

    return newOrderRef.id;
  } catch (error) {
    console.error('Greška pri kreiranju narudžbe:', error);
    throw error;
  }
};

export const getOrders = async (): Promise<Order[]> => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Order[];
  } catch (error) {
    console.error('Greška pri dohvaćanju narudžbi:', error);
    return [];
  }
};

export const updateOrderStatus = async (
  orderId: string,
  status: Order['status'],
  trackingData?: { trackingNumber?: string; courierName?: string }
): Promise<void> => {
  try {
    const docRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(docRef);

    if (!orderSnap.exists()) {
      throw new Error('Narudžba ne postoji');
    }

    const currentOrder = orderSnap.data() as Order;
    const payload: Partial<Order> = { status };

    if (trackingData?.trackingNumber !== undefined) {
      payload.trackingNumber = trackingData.trackingNumber.trim();
    }
    if (trackingData?.courierName !== undefined) {
      payload.courierName = trackingData.courierName.trim();
    }

    await updateDoc(docRef, payload);

    // Sinhronizacija javnog statusa za praćenje
    if (currentOrder.orderNumber) {
      await updateDoc(doc(db, 'order_tracking', currentOrder.orderNumber), { status }).catch(() => {});
    }
  } catch (error) {
    console.error('Greška pri ažuriranju statusa narudžbe:', error);
    throw error;
  }
};

// ==========================================
// PRETRAGA NARUDŽBE ZA KUPCA (SIGURNO)
// ==========================================

export const getOrderByNumberAndPhone = async (
  orderNumber: string,
  phone: string
): Promise<{ orderNumber: string; status: string; createdAt: string } | null> => {
  try {
    const num = orderNumber.trim().toUpperCase();
    const snap = await getDoc(doc(db, 'order_tracking', num));

    if (!snap.exists()) return null;

    const data = snap.data();
    const normalized = normalizePhone(phone);

    if (!normalized || (await sha256(normalized)) !== data.phoneHash) {
      return null;
    }

    return {
      orderNumber: data.orderNumber,
      status: data.status,
      createdAt: data.createdAt,
    };
  } catch (error) {
    console.error('Greška pri pretrazi statusa narudžbe:', error);
    return null;
  }
};

// ==========================================
// POSTAVKE TRGOVINE (STORE SETTINGS)
// ==========================================

export const getStoreSettings = async (): Promise<StoreSettings> => {
  try {
    const docRef = doc(db, 'settings', 'store');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { ...DEFAULT_STORE_SETTINGS, ...docSnap.data() } as StoreSettings;
    } else {
      await setDoc(docRef, DEFAULT_STORE_SETTINGS);
      return DEFAULT_STORE_SETTINGS;
    }
  } catch (error) {
    console.error('Greška pri dohvaćanju postavki:', error);
    return DEFAULT_STORE_SETTINGS;
  }
};

export const updateStoreSettings = async (settingsData: Partial<StoreSettings>): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', 'store');
    await setDoc(docRef, settingsData, { merge: true });
  } catch (error) {
    console.error('Greška pri spremanju postavki:', error);
    throw error;
  }
};

export const saveStoreSettings = updateStoreSettings;

// ==========================================
// UPRAVLJANJE SADRŽAJEM POČETNE STRANICE (CMS)
// ==========================================

export const getCMSContent = async (): Promise<HomeCMSContent> => {
  try {
    const docRef = doc(db, 'settings', 'cms_content');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { ...DEFAULT_CMS_CONTENT, ...docSnap.data() } as HomeCMSContent;
    } else {
      await setDoc(docRef, DEFAULT_CMS_CONTENT);
      return DEFAULT_CMS_CONTENT;
    }
  } catch (error) {
    console.error('Greška pri dohvaćanju CMS sadržaja:', error);
    return DEFAULT_CMS_CONTENT;
  }
};

export const saveCMSContent = async (cmsData: HomeCMSContent): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', 'cms_content');
    await setDoc(docRef, cmsData, { merge: true });
  } catch (error) {
    console.error('Greška pri spremanju CMS sadržaja:', error);
    throw error;
  }
};

// ==========================================
// NEWSLETTER
// ==========================================

export const subscribeNewsletter = async (email: string): Promise<void> => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const nowISO = new Date().toISOString();

    const subscriberDocRef = doc(db, 'subscribers', cleanEmail);
    await setDoc(
      subscriberDocRef,
      {
        email: cleanEmail,
        subscribedAt: nowISO,
        createdAt: nowISO,
        consent: true,
      },
      { merge: true }
    );

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: cleanEmail }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn('API sinhronizacija nije uspjela:', res.status, errData);
      }
    } catch (apiErr) {
      console.warn('Mrežna greška pri slanju na /api/subscribe:', apiErr);
    }
  } catch (error) {
    console.error('Greška pri prijavi na newsletter:', error);
    throw error;
  }
};

export const unsubscribeNewsletter = async (email: string): Promise<void> => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const subscriberDocRef = doc(db, 'subscribers', cleanEmail);
    await deleteDoc(subscriberDocRef);
  } catch (error) {
    console.error('Greška pri odjavi sa newslettera:', error);
    throw error;
  }
};

export const getNewsletterSubscribers = async (): Promise<NewsletterSubscriber[]> => {
  try {
    const subscribersRef = collection(db, 'subscribers');
    const snapshot = await getDocs(subscribersRef);

    const subscribers = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const dateVal = data.subscribedAt || data.createdAt || new Date().toISOString();

      return {
        id: docSnap.id,
        email: data.email || docSnap.id,
        subscribedAt: dateVal,
        consent: data.consent ?? true,
      } as NewsletterSubscriber;
    });

    return subscribers.sort(
      (a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime()
    );
  } catch (error) {
    console.error('Greška pri dohvaćanju newsletter pretplatnika:', error);
    return [];
  }
};

export const getSubscribers = getNewsletterSubscribers;

// ==========================================
// RECENZIJE PROIZVODA (REVIEWS)
// ==========================================

export const getProductReviews = async (productId: string): Promise<ProductReview[]> => {
  try {
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, where('productId', '==', productId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as ProductReview[];
  } catch (error) {
    console.error('Greška pri dohvaćanju recenzija:', error);
    return [];
  }
};

export const submitProductReview = async (
  reviewData: Omit<ProductReview, 'id' | 'createdAt'>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'reviews'), {
      ...reviewData,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Greška pri spremanju recenzije:', error);
    throw error;
  }
};

// ==========================================
// TELEGRAM NOTIFIKACIJE (PREKO SERVERLESS PROXY-JA)
// ==========================================

export async function sendOrderToTelegram(orderData: any) {
  try {
    const name = (
      orderData.customer?.name ||
      `${orderData.customer?.firstName || ''} ${orderData.customer?.lastName || ''}`
    ).trim() || 'Nije navedeno';

    const items = (orderData.items || [])
      .map((i: any) => `- ${i.name} (${i.size || 'Univerzalna'}) x${i.quantity || 1} - ${i.price} KM`)
      .join('\n');

    const text =
      `NOVA NARUDŽBA ${orderData.orderNumber || ''}\n\n` +
      `Ime: ${name}\n` +
      `Telefon: ${orderData.customer?.phone || 'Nije navedeno'}\n` +
      `Adresa: ${orderData.customer?.address || ''}, ${orderData.customer?.city || ''}\n\n` +
      `Artikli:\n${items}\n\n` +
      `Ukupno: ${orderData.total || 0} KM` +
      (orderData.promoCode ? `\nPromo kod: ${orderData.promoCode}` : '');

    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (error) {
    console.warn('Telegram obavijest nije poslana:', error);
  }
}
