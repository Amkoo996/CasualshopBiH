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
} from '../types';
import { normalizePhone } from './validation';

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

// Aliased export za kompatibilnost sa Admin komponente
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
// NARUDŽBE (ORDERS)
// ==========================================

export const createOrder = async (orderData: Omit<Order, 'id'>): Promise<string> => {
  try {
    const ordersRef = collection(db, 'orders');
    const docRef = await addDoc(ordersRef, {
      ...orderData,
      createdAt: new Date().toISOString(),
    });

    // Smanjivanje zaliha kupljenih artikala
    for (const item of orderData.items) {
      const productRef = doc(db, 'products', item.id);
      const productSnap = await getDoc(productRef);

      if (productSnap.exists()) {
        const pData = productSnap.data() as Product;
        const currentStock = pData.sizes?.[item.size] ?? 0;
        const newStock = Math.max(0, currentStock - item.quantity);

        await updateDoc(productRef, {
          [`sizes.${item.size}`]: newStock,
        });
      }
    }

    return docRef.id;
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
  status: Order['status']
): Promise<void> => {
  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, { status });
  } catch (error) {
    console.error('Greška pri ažuriranju statusa narudžbe:', error);
    throw error;
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

// Alias za kompatibilnost
export const saveStoreSettings = updateStoreSettings;

// ==========================================
// NEWSLETTER
// ==========================================

export const subscribeNewsletter = async (email: string): Promise<void> => {
  try {
    const subscribersRef = collection(db, 'newsletter');
    const q = query(subscribersRef, where('email', '==', email.trim().toLowerCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await addDoc(subscribersRef, {
        email: email.trim().toLowerCase(),
        consent: true,
        subscribedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Greška pri prijavi na newsletter:', error);
    throw error;
  }
};

export const getNewsletterSubscribers = async (): Promise<NewsletterSubscriber[]> => {
  try {
    const subscribersRef = collection(db, 'newsletter');
    const snapshot = await getDocs(subscribersRef);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as NewsletterSubscriber[];
  } catch (error) {
    console.error('Greška pri dohvaćanju newsletter pretplatnika:', error);
    return [];
  }
};

// Alias za kompatibilnost s Admin dashboardom
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
// PRETRAGA NARUDŽBE ZA KUPCA
// ==========================================

export const getOrderByNumberAndPhone = async (
  orderNumber: string,
  phone: string
): Promise<Order | null> => {
  try {
    const cleanPhone = normalizePhone(phone) || phone.trim();
    const cleanOrderNum = orderNumber.trim().toUpperCase();

    const q = query(
      collection(db, 'orders'),
      where('orderNumber', '==', cleanOrderNum)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    const orderData = { id: docSnap.id, ...docSnap.data() } as Order;

    const dbPhone = normalizePhone(orderData.customer.phone) || orderData.customer.phone;

    if (dbPhone === cleanPhone || orderData.customer.phone.includes(phone.trim())) {
      return orderData;
    }

    return null;
  } catch (error) {
    console.error('Greška pri pretrazi narudžbe:', error);
    return null;
  }
};
