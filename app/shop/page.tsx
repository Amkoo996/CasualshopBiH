import { Metadata } from 'next';
import { getProducts } from '../../src/lib/db';
import { ShopPageClient } from './ShopPageClient';

// 1. Dinamički SEO
export const metadata: Metadata = {
  title: 'Kolekcija | Casualshop BiH',
  description: 'Pregledajte našu najnoviju streetwear kolekciju. Brza dostava širom Bosne i Hercegovine.',
  openGraph: {
    title: 'Kolekcija | Casualshop BiH',
    description: 'Pregledajte našu najnoviju streetwear kolekciju. Brza dostava širom BiH.',
  }
};

// 2. Next.js SERVER KOMPONENTA (Dohvaća podatke direktno iz baze, bez loading ekrana!)
export default async function Shop() {
  // Dohvaćamo proizvode (false znači da ne dohvaćamo sakrivene proizvode)
  const initialProducts = await getProducts(false);

  // Prosljeđujemo proizvode klijentskoj komponenti
  return <ShopPageClient initialProducts={initialProducts} />;
}
