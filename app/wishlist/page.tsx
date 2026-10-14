"use client";
import { WishlistPage } from '../../src/views/WishlistPage';

export default function Wishlist() { 
  return (
    <WishlistPage 
      products={[]} 
      onSelectProduct={() => {}} 
      onExploreProducts={() => {}} 
    />
  ); 
}