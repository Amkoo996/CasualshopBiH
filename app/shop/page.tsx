import { Metadata } from 'next';
import { getProducts } from '../../src/lib/db';
import { ShopPageClient } from './ShopPageClient';

// 1. Dinamicki SEO
export const metadata: Metadata = {
  title: 'Kolekcija | Casualshop BiH',
  description: 'Pregledajte naSu najnoviju streetwear kolekciju. Brza dostava Sirom Bosne i Hercegovine.',
  openGraph: {
    title: 'Kolekcija | Casualshop BiH',
    description: 'Pregledajte naSu najnoviju streetwear kolekciju. Brza dostava Sirom BiH.',
  }
};

// 2. Next.js SERVER KOMPONENTA (Dohvaca podatke direktno iz baze, bez loading ekrana!)
export default async function Shop() {
  // Dohvacamo proizvode (false znaci da ne dohvacamo sakrivene proizvode)
  const initialProducts = await getProducts(false);

  // Prosljeđujemo proizvode klijentskoj komponenti
  return <ShopPageClient initialProducts={initialProducts} />;
}
