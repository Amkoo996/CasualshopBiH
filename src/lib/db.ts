import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { Product, Order, NewsletterSubscriber, StoreSettings, OrderStatus, DEFAULT_STORE_SETTINGS } from '../types';

export const PRODUCTS_COLLECTION = 'products';
export const ORDERS_COLLECTION = 'orders';
export const SUBSCRIBERS_COLLECTION = 'subscribers';
export const SETTINGS_COLLECTION = 'settings';

// ------------------------------------------------------------------
// 1. PROIZVODI (PRODUCTS)
// ------------------------------------------------------------------

export async function getProducts(includeHidden = false): Promise<Product[]> {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const snap = await getDocs(productsRef);
    const products = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Product[];

    if (!includeHidden) {
      return products.filter((p) => !p.isHidden);
    }
    return products;
  } catch (error) {
    console.error('Greška pri dohvatanju proizvoda:', error);
    return [];
  }
}

export async function saveProduct(productData: Omit<Product, 'id'> & { id?: string }): Promise<string> {
  const { id, ...data } = productData;
  if (id) {
    const prodRef = doc(db, PRODUCTS_COLLECTION, id);
    await setDoc(prodRef, data, { merge: true });
    return id;
  } else {
    const prodRef = doc(collection(db, PRODUCTS_COLLECTION));
    await setDoc(prodRef, data);
    return prodRef.id;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const prodRef = doc(db, PRODUCTS_COLLECTION, id);
  await deleteDoc(prodRef);
}

// ------------------------------------------------------------------
// 2. NARUDŽBE (ORDERS - Transakcija iz P1.3)
// ------------------------------------------------------------------

export async function createOrder(orderData: Omit<Order, 'id'>): Promise<string> {
  const orderRef = doc(collection(db, ORDERS_COLLECTION));

  await runTransaction(db, async (transaction) => {
    // 1) Čitanja
    const snaps = await Promise.all(
      orderData.items.map((item) =>
        transaction.get(doc(db, PRODUCTS_COLLECTION, item.id))
      )
    );

    // 2) Provjera zalihe
    const updates = new Map<string, Record<string, number>>();

    orderData.items.forEach((item, i) => {
      const snap = snaps[i];
      if (!snap.exists()) {
        throw new Error('Artikal "' + item.name + '" više nije dostupan.');
      }
      const prod = snap.data() as Product;
      const sizes = updates.get(item.id) ?? ({ ...prod.sizes } as Record<string, number>);
      const stock = sizes[item.size] ?? 0;

      if (stock < item.quantity) {
        throw new Error('Artikal "' + item.name + '" (' + item.size + ') nema dovoljno na stanju.');
      }

      sizes[item.size] = stock - item.quantity;
      updates.set(item.id, sizes);
    });

    // 3) Upisi: zaliha i narudžba
    updates.forEach((sizes, id) => {
      transaction.update(doc(db, PRODUCTS_COLLECTION, id), { sizes });
    });

    transaction.set(orderRef, orderData);
  });

  return orderRef.id;
}

export async function getOrders(): Promise<Order[]> {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Order[];
  } catch (error) {
    console.error('Greška pri dohvatanju narudžbi:', error);
    return [];
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(orderRef, { status });
}

// ------------------------------------------------------------------
// 3. NEWSLETTER PRETPLATNICI
// ------------------------------------------------------------------

export async function getSubscribers(): Promise<NewsletterSubscriber[]> {
  try {
    const subsRef = collection(db, SUBSCRIBERS_COLLECTION);
    const snap = await getDocs(subsRef);
    return snap.docs.map((d) => d.data() as NewsletterSubscriber);
  } catch (error) {
    console.error('Greška pri dohvatanju pretplatnika:', error);
    return [];
  }
}

export async function subscribeNewsletter(email: string): Promise<void> {
  const subsRef = doc(collection(db, SUBSCRIBERS_COLLECTION));
  await setDoc(subsRef, {
    email: email.trim().toLowerCase(),
    consent: true,
    subscribedAt: new Date().toISOString(),
  });
}

// ------------------------------------------------------------------
// 4. POSTAVKE TRGOVINE (STORE SETTINGS)
// ------------------------------------------------------------------

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, 'general');
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      return { ...DEFAULT_STORE_SETTINGS, ...snap.data() } as StoreSettings;
    }
  } catch (error) {
    console.error('Greška pri dohvatanju postavki:', error);
  }
  return DEFAULT_STORE_SETTINGS;
}

export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  const settingsRef = doc(db, SETTINGS_COLLECTION, 'general');
  await setDoc(settingsRef, settings, { merge: true });
}
