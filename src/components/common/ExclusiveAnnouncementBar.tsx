"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Flame, Clock, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const ExclusiveAnnouncementBar: React.FC = () => {
  const { settings } = useCart();
  const [currentSlide, setCurrentSlide] = useState(0);

  const announcements = [
    {
      icon: <Flame className="w-3.5 h-3.5 text-amber-300 animate-pulse" />,
      text: "LIMITIRANI DROP U TOKU • BESPLATNA DOSTAVA IZNAD 100 KM",
      link: "/shop"
    },
    {
      icon: <Sparkles className="w-3.5 h-3.5 text-[#F7E97F]" />,
      text: "OTVARANJE PAKETA DOZVOLJENO PRIJE PLAĆANJA POUZEĆEM",
      link: "/dostava-i-povrat"
    },
    {
      icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
      text: "ISPORUKA UNUTAR 24-48H ŠIROM BIH • X EXPRESS",
      link: "/shop"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % announcements.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [announcements.length]);

  return (
    <div className="bg-[#0A0A0A] border-b border-neutral-800 text-white overflow-hidden py-2 px-4 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <Link 
          href={announcements[currentSlide].link}
          className="flex items-center gap-2 text-[11px] sm:text-xs font-['Poppins'] font-bold tracking-widest uppercase transition-all duration-300 hover:text-[#F7E97F]"
        >
          {announcements[currentSlide].icon}
          <span className="text-[#F7E97F]">EKSKLUZIVNO:</span>
          <span className="text-neutral-200">{settings?.topBarText || announcements[currentSlide].text}</span>
          <span className="text-[10px] text-neutral-400 underline ml-1">Pogledaj →</span>
        </Link>
      </div>
    </div>
  );
};