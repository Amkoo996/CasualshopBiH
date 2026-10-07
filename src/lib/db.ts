import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { Product, Order, NewsletterSubscriber, StoreSettings, DEFAULT_STORE_SETTINGS, ProductReview, UserWishlist } from '../types';
import { INITIAL_PRODUCTS } from './seedData';
import { handleFirestoreError, OperationType } from './firestore-errors';

const PRODUCTS_COLLECTION = 'products';
const ORDERS_COLLECTION = 'orders';
const SUBSCRIBERS_COLLECTION = 'subscribers';
const SETTINGS_COLLECTION = 'settings';
const STORE_SETTINGS_DOC = 'store_settings';

/**
 * Fetch all products, seeding or syncing with user uploaded t-shirts.
 */
export async function getProducts(includeHidden = false): Promise<Product[]> {
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    const snapshot = await getDocs(colRef);

    // If empty or missing the authentic Sarajevo / Away Days tees, initialize them
    const existingIds = new Set(snapshot.docs.map((d) => d.id));
    const hasAuthenticTees = existingIds.has('cs-tee-sarajevo-geo-01') && existingIds.has('cs-tee-away-days-02');

    if (snapshot.empty || !hasAuthenticTees) {
      console.log('Sinhronizujem autentične artikle i fotografije brenda...');
      // Clean up any old placeholder mock items if they exist
      for (const docSnap of snapshot.docs) {
        if (!INITIAL_PRODUCTS.some((p) => p.id === docSnap.id)) {
          try {
            await deleteDoc(docSnap.ref);
          } catch {
            // ignore
          }
        }
      }
      for (const prod of INITIAL_PRODUCTS) {
        await setDoc(doc(db, PRODUCTS_COLLECTION, prod.id), prod);
      }
      return includeHidden ? INITIAL_PRODUCTS : INITIAL_PRODUCTS.filter((p) => !p.isHidden);
    }

    const products: Product[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<Product, 'id'>;
      products.push({ id: docSnap.id, ...data });
    });

    if (includeHidden) return products;
    return products.filter((p) => !p.isHidden);
  } catch (error) {
    console.warn('Greška pri dohvatanju iz Firestore, koristim ažurirani katalog sa slikama:', error);
    return includeHidden ? INITIAL_PRODUCTS : INITIAL_PRODUCTS.filter((p) => !p.isHidden);
  }
}

/**
 * Explicitly overwrite Firestore products with the 8 actual products and images
 */
export async function resetDemoProducts(): Promise<Product[]> {
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    const snapshot = await getDocs(colRef);
    for (const d of snapshot.docs) {
      try {
        await deleteDoc(d.ref);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  for (const prod of INITIAL_PRODUCTS) {
    await setDoc(doc(db, PRODUCTS_COLLECTION, prod.id), prod);
  }
  return INITIAL_PRODUCTS;
}

/**
 * Fetch a single product by ID.
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as Omit<Product, 'id'>) };
    }
    const fallback = INITIAL_PRODUCTS.find((p) => p.id === id);
    return fallback || null;
  } catch {
    const fallback = INITIAL_PRODUCTS.find((p) => p.id === id);
    return fallback || null;
  }
}

/**
 * Add or update product (Admin)
 */
export async function saveProduct(product: Omit<Product, 'id'> & { id?: string }): Promise<string> {
  const id = product.id || `cs-${Date.now()}`;
  const path = `${PRODUCTS_COLLECTION}/${id}`;
  try {
    const cleanProduct: Product = {
      ...product,
      id,
      createdAt: product.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, PRODUCTS_COLLECTION, id), cleanProduct);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete product (Admin)
 */
export async function deleteProduct(productId: string): Promise<void> {
  const path = `${PRODUCTS_COLLECTION}/${productId}`;
  try {
    await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Get Store Settings
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, STORE_SETTINGS_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_STORE_SETTINGS, ...(snap.data() as StoreSettings) };
    }
    // Initialize default settings in Firestore with 10 KM delivery fee
    await setDoc(docRef, DEFAULT_STORE_SETTINGS);
    return DEFAULT_STORE_SETTINGS;
  } catch (error) {
    console.warn('Greška pri dohvatanju postavki, koristim zadane vrijednosti:', error);
    return DEFAULT_STORE_SETTINGS;
  }
}

/**
 * Save Store Settings (Admin)
 */
export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  const path = `${SETTINGS_COLLECTION}/${STORE_SETTINGS_DOC}`;
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, STORE_SETTINGS_DOC);
    await setDoc(docRef, settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Create order and atomically decrement product inventory for chosen sizes.
 */
export async function createOrder(orderData: Omit<Order, 'id'>): Promise<string> {
  try {
    await runTransaction(db, async (transaction) => {
      for (const item of orderData.items) {
        const prodRef = doc(db, PRODUCTS_COLLECTION, item.id);
        const prodSnap = await transaction.get(prodRef);

        if (prodSnap.exists()) {
          const currentProd = prodSnap.data() as Product;
          const currentSizes = { ...currentProd.sizes };
          const currentStock = currentSizes[item.size] ?? 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          currentSizes[item.size] = newStock;

          transaction.update(prodRef, { sizes: currentSizes });
        }
      }
    });

    const orderRef = await addDoc(collection(db, ORDERS_COLLECTION), orderData);
    return orderRef.id;
  } catch (error) {
    console.warn('Greška pri kreiranju u Firestore, kreiram lokalni fallback broj narudžbe:', error);
    return `local_${Date.now()}`;
  }
}

/**
 * Get all orders (Admin)
 */
export async function getOrders(): Promise<Order[]> {
  const path = ORDERS_COLLECTION;
  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const orders: Order[] = [];
    snap.forEach((docSnap) => {
      orders.push({ id: docSnap.id, ...(docSnap.data() as Omit<Order, 'id'>) });
    });
    return orders;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Update order status (Admin)
 */
export async function updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  const path = `${ORDERS_COLLECTION}/${orderId}`;
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(orderRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Subscribe to newsletter
 */
export async function subscribeNewsletter(email: string): Promise<boolean> {
  try {
    const subscriberData: NewsletterSubscriber = {
      email: email.trim().toLowerCase(),
      consent: true,
      subscribedAt: new Date().toISOString(),
    };
    await addDoc(collection(db, SUBSCRIBERS_COLLECTION), subscriberData);
    return true;
  } catch (error) {
    console.error('Newsletter error:', error);
    return true;
  }
}

/**
 * Get all newsletter subscribers (Admin)
 */
export async function getSubscribers(): Promise<NewsletterSubscriber[]> {
  const path = SUBSCRIBERS_COLLECTION;
  try {
    const snap = await getDocs(collection(db, SUBSCRIBERS_COLLECTION));
    const subscribers: NewsletterSubscriber[] = [];
    snap.forEach((docSnap) => {
      subscribers.push({ id: docSnap.id, ...(docSnap.data() as Omit<NewsletterSubscriber, 'id'>) });
    });
    return subscribers;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

const REVIEWS_COLLECTION = 'reviews';
const WISHLISTS_COLLECTION = 'wishlists';

/**
 * Fetch reviews for a specific product
 */
export async function getProductReviews(productId: string): Promise<ProductReview[]> {
  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where('productId', '==', productId)
    );
    const snap = await getDocs(q);
    const reviews: ProductReview[] = [];
    snap.forEach((docSnap) => {
      reviews.push({ id: docSnap.id, ...(docSnap.data() as Omit<ProductReview, 'id'>) });
    });
    // Sort descending by date
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return reviews;
  } catch (err) {
    console.warn('Error fetching reviews:', err);
    return [];
  }
}

/**
 * Submit a customer review for a product
 */
export async function submitProductReview(review: Omit<ProductReview, 'id'>): Promise<string> {
  try {
    const cleanReview = {
      productId: review.productId,
      userName: review.userName.trim(),
      userEmail: review.userEmail ? review.userEmail.trim() : '',
      rating: Math.min(5, Math.max(1, review.rating)),
      comment: review.comment.trim(),
      createdAt: new Date().toISOString(),
      verifiedPurchase: Boolean(review.verifiedPurchase),
    };
    const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), cleanReview);
    return docRef.id;
  } catch (err) {
    console.error('Error submitting review:', err);
    throw err;
  }
}

/**
 * Fetch user wishlist product IDs from Firestore with localStorage fallback
 */
export async function getUserWishlist(userId?: string): Promise<string[]> {
  // If not logged in, return localStorage wishlist
  if (!userId) {
    try {
      const local = localStorage.getItem('cs_local_wishlist');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  }

  try {
    const docRef = doc(db, WISHLISTS_COLLECTION, userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as UserWishlist;
      const ids = Array.isArray(data.productIds) ? data.productIds : [];
      // Also update localStorage cache
      localStorage.setItem('cs_local_wishlist', JSON.stringify(ids));
      return ids;
    }
    // If doc doesn't exist, check localStorage and sync
    const local = localStorage.getItem('cs_local_wishlist');
    const localIds = local ? JSON.parse(local) : [];
    if (localIds.length > 0) {
      await saveUserWishlist(userId, localIds);
      return localIds;
    }
    return [];
  } catch (err) {
    console.warn('Error fetching wishlist from Firestore, using cache:', err);
    try {
      const local = localStorage.getItem('cs_local_wishlist');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  }
}

/**
 * Save user wishlist product IDs to Firestore and localStorage
 */
export async function saveUserWishlist(userId: string | undefined, productIds: string[]): Promise<void> {
  try {
    localStorage.setItem('cs_local_wishlist', JSON.stringify(productIds));
  } catch {
    // ignore
  }

  if (!userId) return;

  try {
    const docRef = doc(db, WISHLISTS_COLLECTION, userId);
    await setDoc(
      docRef,
      {
        userId,
        productIds,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error saving wishlist to Firestore:', err);
  }
}

