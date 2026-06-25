"use client";

import React from "react";
import { ShoppingCart, Plus } from "lucide-react";
import { MenuItem } from "../types";
import { usePosStore } from "../store/pos.store";

interface MenuCardProps {
  item: MenuItem;
  onOpenModifiers: (item: MenuItem) => void;
}

const BADGE_STYLES: Record<string, string> = {
  popular: "bg-brand-primary text-white",
  "best seller": "bg-amber-500 text-white",
  new: "bg-emerald-500 text-white",
};

export default function MenuCard({ item, onOpenModifiers }: MenuCardProps) {
  const { addToCart } = usePosStore();
  const hasModifiers = !!item.modifierGroups?.length;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    hasModifiers ? onOpenModifiers(item) : addToCart(item, []);
  };

  return (
    <div
      onClick={() =>
        hasModifiers ? onOpenModifiers(item) : addToCart(item, [])
      }
      className="group relative flex flex-col bg-white rounded-xl border border-neutral-200 overflow-hidden cursor-pointer hover:border-brand-primary/50 hover:shadow-md hover:shadow-brand-primary/8 transition-all duration-200 active:scale-[0.99]"
    >
      {/* Badge */}
      {item.badge && (
        <span
          className={`absolute top-2 left-2 z-10 text-[8px] font-700 uppercase tracking-wider px-1.5 py-0.5 rounded-md ${BADGE_STYLES[item.badge.toLowerCase()] ?? "bg-neutral-500 text-white"}`}
        >
          {item.badge}
        </span>
      )}

      {/* Image */}
      <div className="h-[90px] w-full overflow-hidden bg-neutral-100 relative flex-shrink-0">
        <img
          src={item.image || 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=60'}
          alt={item.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=60';
          }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Quick-add overlay */}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <button
            onClick={handleAdd}
            className="p-2 bg-white text-brand-primary hover:bg-brand-primary hover:text-white rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 cursor-pointer"
          >
            {hasModifiers ? (
              <Plus size={15} strokeWidth={2.5} />
            ) : (
              <ShoppingCart size={15} strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-2.5 flex-1 flex flex-col justify-between gap-1.5">
        <div>
          <h4 className="text-[11px] font-700 text-neutral-800 leading-tight group-hover:text-brand-primary transition-colors line-clamp-1">
            {item.name}
          </h4>
          <p className="text-[9px] text-neutral-400 font-400 leading-snug line-clamp-2 mt-0.5">
            {item.description}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[12px] font-700 text-neutral-900">
            ${item.price.toFixed(2)}
          </span>
          <button
            onClick={handleAdd}
            className="w-6 h-6 rounded-md border border-neutral-200 flex items-center justify-center text-neutral-400 group-hover:border-brand-primary group-hover:text-brand-primary hover:bg-orange-50 transition-all cursor-pointer active:scale-90"
          >
            {hasModifiers ? (
              <Plus size={11} strokeWidth={2.5} />
            ) : (
              <ShoppingCart size={11} strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
