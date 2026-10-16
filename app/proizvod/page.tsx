"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getProductById } from '../../src/lib/db';
import { ProductDetailPage } from '../../src/views/ProductDetailPage';
import type { Product } from '../../src/types';

function ProductLoader() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [product, setProduct] = useState<Product | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');

  useEffect(() => {
    if (!id) { 
      setState('missing'); 
      return; 
    }
    getProductById(id)
      .then((p) => { 
        if (p) { 
          setProduct(p); 
          setState('ok'); 
        } else { 
          setState('missing'); 
        } 
      })
      .catch(() => setState('missing'));
  }, [id]);

  if (state === 'loading') {
    return <div className='min-h-screen pt-24 text-center'>Učitavanje...</div>;
  }

  if (state === 'missing' || !product) {
    return <div className='min-h-screen pt-24 text-center font-bold'>Proizvod nije pronađen.</div>;
  }

  return <ProductDetailPage product={product} />;
}

export default function ProductPage() {
  return (
    <Suspense fallback={<div className='min-h-screen pt-24 text-center'>Učitavanje...</div>}>
      <ProductLoader />
    </Suspense>
  );
}
