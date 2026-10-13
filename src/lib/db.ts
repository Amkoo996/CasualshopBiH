// ==========================================
// NEWSLETTER
// ==========================================

export const subscribeNewsletter = async (email: string): Promise<void> => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    // Koristimo kolekciju 'subscribers' koja je usklađena sa Firestore pravilima
    const subscribersRef = collection(db, 'subscribers');
    const q = query(subscribersRef, where('email', '==', cleanEmail));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await addDoc(subscribersRef, {
        email: cleanEmail,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Greška pri prijavi na newsletter:', error);
    throw error;
  }
};

export const getNewsletterSubscribers = async (): Promise<NewsletterSubscriber[]> => {
  try {
    // Učitavamo iz tačne kolekcije 'subscribers' i sortiramo po 'createdAt'
    const subscribersRef = collection(db, 'subscribers');
    const q = query(subscribersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as NewsletterSubscriber[];
  } catch (error) {
    console.error('Greška pri dohvaćanju newsletter pretplatnika:', error);
    return [];
  }
};

// Alias za kompatibilnost sa Admin dashboardom
export const getSubscribers = getNewsletterSubscribers;
