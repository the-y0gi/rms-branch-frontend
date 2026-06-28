'use client';

import React from 'react';
import { Search, Bell, Settings, ChefHat, ChevronDown, Power, X, ClipboardList, LayoutGrid } from 'lucide-react';
import { usePosStore } from '../store/pos.store';

export default function PosNavbar() {
  const { search, setSearch, orders } = usePosStore();
  const [selectedBranch, setSelectedBranch] = React.useState('Downtown Main');

  return (
    <header className="h-[64px] bg-white border-b border-neutral-200 px-5 flex items-center justify-between sticky top-0 z-40 shadow-sm">

      {/* ── Left: Logo + Branch ── */}
      <div className="flex items-center gap-5">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-brand-primary rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <ChefHat size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <p className="text-[13px] font-900 text-neutral-900 leading-tight tracking-tight">Chicken</p>
            <p className="text-[11px] font-700 text-brand-primary leading-tight tracking-widest uppercase">Delight</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-7 w-px bg-neutral-200" />

        {/* Branch Selector */}
        <div className="relative">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="appearance-none bg-neutral-50 border border-neutral-200 rounded-lg pl-3 pr-8 py-1.5 text-[12px] font-600 text-neutral-700 hover:border-neutral-300 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 cursor-pointer transition-all"
          >
            <option value="Downtown Main">Downtown Main</option>
            <option value="Airport Road">Airport Road</option>
            <option value="West End">West End</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-neutral-200" />

        {/* POS Terminal Link (Active) */}
        <a
          href="/employee/pos"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-primary/30 bg-brand-primary-light text-[12px] font-700 text-brand-primary transition-all cursor-pointer"
        >
          <LayoutGrid size={14} className="text-brand-primary" />
          <span>POS Terminal</span>
        </a>

        {/* Kitchen View Link */}
        <a
          href="/employee/kitchen"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-[12px] font-600 text-neutral-700 hover:border-brand-primary/30 hover:bg-brand-primary-light hover:text-brand-primary transition-all cursor-pointer"
        >
          <ChefHat size={14} className="text-neutral-500 group-hover:text-brand-primary" />
          <span>Kitchen View</span>
        </a>

        {/* Orders Link */}
        <a
          href="/employee/orders"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-[12px] font-600 text-neutral-700 hover:border-brand-primary/30 hover:bg-brand-primary-light hover:text-brand-primary transition-all cursor-pointer"
        >
          <ClipboardList size={14} className="text-neutral-500 group-hover:text-brand-primary" />
          <span>Orders</span>
        </a>
      </div>

      {/* ── Center: Global Search ── */}
      <div className="flex-1 max-w-sm mx-6">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu items..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg py-2 pl-9 pr-8 text-[12px] text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Right: Actions + Profile ── */}
      <div className="flex items-center gap-3">

        {/* Notification Bell */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-500 hover:text-brand-primary hover:border-brand-primary/30 hover:bg-brand-primary-light transition-all cursor-pointer">
          <Bell size={16} />
          {orders.length + 2 > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-brand-primary text-white text-[9px] font-700 rounded-full flex items-center justify-center px-1 border border-white">
              {orders.length > 0 ? orders.length : 2}
            </span>
          )}
        </button>

        {/* Settings */}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-500 hover:text-brand-primary hover:border-brand-primary/30 hover:bg-brand-primary-light transition-all cursor-pointer">
          <Settings size={16} />
        </button>

        {/* Divider */}
        <div className="h-7 w-px bg-neutral-200" />

        {/* Employee Profile */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-[12px] font-700 text-neutral-800 leading-tight">Hi, Jone</p>
            <span className="text-[10px] font-600 text-brand-primary leading-tight uppercase tracking-wide">Cashier</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-[11px] font-800 text-white shadow-sm border border-brand-primary-hover/30">
            JO
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => { if (confirm('Exit the POS system?')) window.close(); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 border border-red-200 text-red-400 hover:bg-red-100 hover:text-red-600 hover:border-red-300 transition-all cursor-pointer"
          title="Exit POS"
        >
          <Power size={14} />
        </button>
      </div>
    </header>
  );
}
