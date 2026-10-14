"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Product } from '../../src/types';
import { ShopPage } from '../../src/views/ShopPage';
import { getProducts } from '../../src/lib/db';

export function ShopPageClient({ initialProducts = [] }: { initialProducts?: Product[] }) {
  const router = useRouter();
  
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 text-center">Učitavanje kolekcije...</div>}>
      <ShopPageContent initialProducts={initialProducts} router={router} />
    </Suspense>
  );
}

function ShopPageContent({ initialProducts, router }: { initialProducts: Product[], router: any }) {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>(initialProducts);

  useEffect(() => {
    getProducts().then((data) => {
      if (data && data.length > 0) {
        setProducts(data);
      }
    });
  }, []);

  const categoryParam = searchParams.get('category') || 'Sve';
  const searchParam = searchParams.get('search') || '';

  return (
    <ShopPage 
      key={categoryParam + searchParam}
      products={products} 
      initialCategory={categoryParam}
      searchTerm={searchParam}
      onSelectProduct={(product) => {
        router.push(`/proizvod/${product.id}`);
      }}
    />
  );
}