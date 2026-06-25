'use client';

import React, { useState, useEffect } from 'react';
import PosNavbar from '@/modules/employee-pos/components/PosNavbar';
import CategoryCarousel from '@/modules/employee-pos/components/CategoryCarousel';
import OrderTypePanel from '@/modules/employee-pos/components/OrderTypePanel';
import MenuGrid from '@/modules/employee-pos/components/MenuGrid';
import CartPanel from '@/modules/employee-pos/components/CartPanel';
import ModifierDrawer from '@/modules/employee-pos/components/ModifierDrawer';
import { MenuItem } from '@/modules/employee-pos/types';
import { usePosStore } from '@/modules/employee-pos/store/pos.store';

export default function PosPage() {
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { fetchMenu } = usePosStore();

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const handleOpenModifiers = (item: MenuItem) => {
    setActiveItem(item);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setActiveItem(null);
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-neutral-100 text-neutral-900">
      {/* Navbar */}
      <PosNavbar />

      {/*Horizontal Scrollable Categories */}
      <CategoryCarousel />

      {/* Main Work Area (3-Column Layout: 20% / 55% / 25%) */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3 min-h-0">
        {/* Left Column - Order Type & Customer Actions (20%) */}
        <div className="w-[20%] flex-shrink-0 h-full">
          <OrderTypePanel />
        </div>

        {/* Center Column - Menu Items Grid (55%) */}
        <div id="menu-grid-section" className="w-[55%] flex-shrink-0 h-full flex flex-col">
          <MenuGrid onOpenModifiers={handleOpenModifiers} />
        </div>

        {/* Right Column - Current Cart & Totals (25%) */}
        <div className="w-[25%] flex-shrink-0 h-full">
          <CartPanel />
        </div>
      </div>

      {/* Modifier Customize Drawer Overlay */}
      <ModifierDrawer
        item={activeItem}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </main>
  );
}
