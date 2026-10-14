"use client";

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Product } from '../../src/types';
import { ShopPage } from '../../src/views/ShopPage';

export function ShopPageClient({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter();
  
  // Da bismo koristili useSearchParams, Next.js traži da to bude omotano u Suspense
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 text-center">Učitavanje...</div>}>
      <ShopPageContent initialProducts={initialProducts} router={router} />
    </Suspense>
  );
}

function ShopPageContent({ initialProducts, router }: { initialProducts: Product[], router: any }) {
  const searchParams = useSearchParams();
  
  // Čitamo URL parametre (npr. ako netko klikne na kategoriju u Navbaru)
  const categoryParam = searchParams.get('category') || 'Sve';
  const searchParam = searchParams.get('search') || '';

  // Ovdje koristimo tvoju originalnu ShopPage komponentu!
  return (
    <ShopPage 
      products={initialProducts} 
      initialCategory={categoryParam}
      searchTerm={searchParam}
      onSelectProduct={(product) => {
        // Kada korisnik klikne na proizvod, šaljemo ga na novu dinamičku rutu!
        router.push(`/proizvod/${product.id}`);
      }}
    />
  );
}
