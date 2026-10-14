"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckoutPage } from '../../src/views/CheckoutPage';
import { OrderSuccessPage } from '../../src/views/OrderSuccessPage';
import { Order } from '../../src/types';

export default function Checkout() {
  const router = useRouter();
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  if (completedOrder) {
    return (
      <OrderSuccessPage
        order={completedOrder}
        onContinueShopping={() => router.push('/shop')}
      />
    );
  }

  return (
    <CheckoutPage
      onBack={() => router.back()}
      onOrderSuccess={(orderData: Order) => {
        setCompletedOrder(orderData);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onNavigateToPage={(page: string) => {
        if (page === 'shop') router.push('/shop');
        else router.push('/');
      }}
    />
  );
}