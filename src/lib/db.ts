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

// Eksport instance baze kako bi je AdminDashboard i ostale komponente mogle koristiti
export { db };

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
  
  const cleanData = Object.fromEntries(
    Object.entries(productData).filter(([_, v]) => v !== undefined)
  );
  
  await setDoc(docRef, { ...cleanData, id }, { merge: true });
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

// KREIRANJE NARUDŽBE, TELEGRAM I EMAIL POTVRDA
export const createOrder = async (orderData: Omit<Order, 'id'>): Promise<string> => {
  try {
    const orderId = orderData.orderNumber;
    
    // 1. Upisivanje narudžbe direktno u Firebase
    await setDoc(doc(db, 'orders', orderId), {
      ...orderData,
      id: orderId
    });

    // 2. Kreiranje statusa za praćenje
    await setDoc(doc(db, 'order_tracking', orderId), {
      status: orderData.status || 'Nova',
      createdAt: orderData.createdAt || new Date().toISOString()
    });

    // 3. Direktno slanje Email potvrde kupcu putem Brevo API-ja
    try {
      const brevoApiKey = process.env.NEXT_PUBLIC_BREVO_API_KEY || process.env.BREVO_API_KEY;
      if (brevoApiKey && orderData.customer?.email) {
        const itemsListHtml = orderData.items
          .map((i) => `<li style="padding: 6px 0; border-bottom: 1px solid #f0f0f0;"><strong>${i.name}</strong> (Veličina: ${i.size}) — ${i.quantity} kom × ${i.price.toFixed(2)} KM</li>`)
          .join('');

        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': brevoApiKey,
          },
          body: JSON.stringify({
            sender: { name: 'Casual Shop BiH', email: 'info@casualshop.ba' },
            to: [{ email: orderData.customer.email.trim(), name: `${orderData.customer.firstName} ${orderData.customer.lastName}` }],
            subject: `Potvrda narudžbe #${orderId} | Casual Shop BiH`,
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
                <h2 style="text-transform: uppercase; margin-bottom: 5px;">Hvala na narudžbi!</h2>
                <p>Pozdrav ${orderData.customer.firstName}, vaša narudžba <strong>#${orderId}</strong> je zaprimljena.</p>
                <h3 style="border-bottom: 2px solid #F7E97F; padding-bottom: 5px; margin-top: 20px;">Pregled narudžbe:</h3>
                <ul style="list-style: none; padding: 0;">${itemsListHtml}</ul>
                <p>Dostava: <strong>${orderData.shippingFee === 0 ? 'BESPLATNO' : `${orderData.shippingFee.toFixed(2)} KM`}</strong></p>
                <p style="font-size: 16px; font-weight: bold; background: #0A0A0A; color: #F7E97F; padding: 10px; text-align: center;">Ukupno za plaćanje: ${orderData.total.toFixed(2)} KM</p>
                <p style="font-size: 12px; color: #666; margin-top: 20px;">Plaćanje se vrši gotovinom kuriru pri preuzimanju paketa. Prije slanja ćemo vas kontaktirati na ${orderData.customer.phone}.</p>
              </div>
            `,
          }),
        });
      }
    } catch (mailErr) {
      console.warn('Greška pri slanju potvrdnog maila kupcu:', mailErr);
    }

    // 4. Direktno slanje Telegram notifikacije administratoru
    try {
      const telegramToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

      if (telegramToken && telegramChatId) {
        const itemsListText = orderData.items.map((i) => `• ${i.quantity}x ${i.name} (${i.size}) - ${(i.price * i.quantity).toFixed(2)} KM`).join('\n');
        const telegramText = `🛍️ *NOVA NARUDŽBA #${orderId}*\n━━━━━━━━━━━━━━━━━━\n👤 *Kupac:* ${orderData.customer.firstName} ${orderData.customer.lastName}\n📞 *Tel:* ${orderData.customer.phone}\n📍 *Grad/Adresa:* ${orderData.customer.city}, ${orderData.customer.address}\n💰 *Ukupno:* ${orderData.total.toFixed(2)} KM\n━━━━━━━━━━━━━━━━━━\n*Artikli:*\n${itemsListText}`;

        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: telegramText,
            parse_mode: 'Markdown',
          }),
        });
      }
    } catch (tgErr) {
      console.warn('Greška pri slanju Telegram poruke:', tgErr);
    }

    return orderId;
  } catch (error: any) {
    console.error('Greška pri kreiranju narudžbe u bazi:', error);
    throw new Error('Sistemska greška pri spašavanju narudžbe. Pokušajte ponovo.');
  }
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
  
  await updateDoc(orderRef, updateData);

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
    
    // 1. Spremanje u Firebase Firestore bazu
    const docRef = doc(db, 'subscribers', cleanEmail);
    await setDoc(docRef, {
      email: cleanEmail,
      subscribedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      consent: true,
    });

    // 2. Automatsko slanje kontakta na Brevo API
    try {
      const apiKey = process.env.NEXT_PUBLIC_BREVO_API_KEY || process.env.BREVO_API_KEY;
      if (apiKey) {
        await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify({
            email: cleanEmail,
            updateEnabled: true,
          }),
        });
      }
    } catch (brevoErr) {
      console.error('Greška pri slanju na Brevo API:', brevoErr);
    }

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
