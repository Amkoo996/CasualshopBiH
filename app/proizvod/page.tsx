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
    // Svaki put kada se id promijeni, forsiramo "loading" state
    setState('loading');
    setProduct(null);

    if (!id) { 
      setState('missing'); 
      return; 
    }
    
    // Dodali smo timeout od 10ms da "očistimo" prethodni dom prije crtanja novog
    const timer = setTimeout(() => {
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
    }, 10);

    return () => clearTimeout(timer);
  }, [id]);

  if (state === 'loading') {
    return <div className='min-h-screen pt-24 text-center'>Učitavanje proizvoda...</div>;
  }

  if (state === 'missing' || !product) {
    return <div className='min-h-screen pt-24 text-center font-bold'>Proizvod nije pronađen ili je uklonjen iz ponude.</div>;
  }

  // Proslijeđujemo ključ kako bi React znao da je ovo POTPUNO nova komponenta (sprječava stare keširane slike)
  return <ProductDetailPage key={product.id} product={product} />;
}

export default function ProductPage() {
  return (
    <Suspense fallback={<div className='min-h-screen pt-24 text-center'>Učitavanje...</div>}>
      <ProductLoader />
    </Suspense>
  );
}
