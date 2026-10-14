"use client";
import { CheckoutPage } from '../../src/views/CheckoutPage';

export default function Checkout() { 
  return (
    <CheckoutPage 
      onBack={() => window.history.back()} 
      onOrderSuccess={() => {}} 
      onNavigateToPage={() => {}} 
    />
  ); 
}