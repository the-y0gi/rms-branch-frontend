'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import KitchenNavbar from './KitchenNavbar';
import KitchenOrderCard from './KitchenOrderCard';
import KitchenDetailModal from './KitchenDetailModal';
import { Order } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function KitchenDashboard() {
  // ── States ───────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);
  const [draftCart, setDraftCart] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'preparing' | 'ready'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'takeout' | 'drive-through' | 'dine-in' | 'delivery'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [startIndex, setStartIndex] = useState(0);

  // ── Fetch DB Orders ──────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${apiUrl}/orders`);
      if (res.data.success) {
        // Only keep active kitchen orders (pending, preparing, ready)
        // and exclude future scheduled orders (orders scheduled for a day after today)
        const todayLocalStr = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
        const activeOrders = (res.data.data as Order[]).filter((o) => {
          const isActive = ['pending', 'preparing', 'ready'].includes(o.status);
          if (!isActive) return false;

          if (o.orderTiming === 'later' && o.scheduledAt) {
            const schedDate = new Date(o.scheduledAt);
            const schedLocalStr = new Date(schedDate.getTime() - (schedDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
            if (schedLocalStr > todayLocalStr) {
              return false;
            }
          }
          return true;
        });
        setOrders(activeOrders);
      }
    } catch (err) {
      console.error('Failed to fetch orders in kitchen dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Polling & Initial Fetch ──────────────────────────────────
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Poll every 5s for real-time updates
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ── LocalStorage Draft Cart Listener ──
  useEffect(() => {
    const loadDraft = () => {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem('rms_draft_cart');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setDraftCart(parsed);
        } catch {
          setDraftCart(null);
        }
      } else {
        setDraftCart(null);
      }
    };

    loadDraft();
    window.addEventListener('storage', loadDraft);
    return () => window.removeEventListener('storage', loadDraft);
  }, []);

  // ── Status Mappings ──
  const getMappedStatus = (order: Order) => {
    if (order.orderNumber === '#DRAFT') return 'pending';
    if (order.status === 'pending') return 'confirmed';
    if (order.status === 'preparing') return 'preparing';
    if (order.status === 'ready') return 'ready';
    return order.status;
  };

  // ── Calculate Counts ──
  const activeDraftCount = draftCart ? 1 : 0;
  
  // Totals for Statuses
  const countPending = activeDraftCount;
  const countConfirmed = orders.filter((o) => o.status === 'pending').length;
  const countPreparing = orders.filter((o) => o.status === 'preparing').length;
  const countReady = orders.filter((o) => o.status === 'ready').length;
  const countAll = countPending + countConfirmed + countPreparing + countReady;

  // Totals for Order Types
  const countTakeout = orders.filter((o) => o.orderType === 'takeout').length + (draftCart?.orderType === 'takeout' ? 1 : 0);
  const countDriveThrough = orders.filter((o) => o.orderType === 'drive-through').length + (draftCart?.orderType === 'drive-through' ? 1 : 0);
  const countDineIn = orders.filter((o) => o.orderType === 'dine-in').length + (draftCart?.orderType === 'dine-in' ? 1 : 0);
  const countDelivery = orders.filter((o) => o.orderType === 'delivery').length + (draftCart?.orderType === 'delivery' ? 1 : 0);

  // Reset startIndex on filter change
  useEffect(() => {
    setStartIndex(0);
  }, [statusFilter, typeFilter]);

  // ── Filter and Sort All Candidates ──────────────────────────
  const filteredOrders = React.useMemo(() => {
    const candidates: Order[] = [];

    // Draft cart candidate
    if (draftCart) {
      const mapped = getMappedStatus(draftCart);
      const matchesStatus = statusFilter === 'all' || statusFilter === mapped;
      const matchesType = typeFilter === 'all' || typeFilter === draftCart.orderType;
      if (matchesStatus && matchesType) {
        candidates.push(draftCart);
      }
    }

    // DB orders candidates
    orders.forEach((o) => {
      const mapped = getMappedStatus(o);
      const matchesStatus = statusFilter === 'all' || statusFilter === mapped;
      const matchesType = typeFilter === 'all' || typeFilter === o.orderType;
      if (matchesStatus && matchesType) {
        candidates.push(o);
      }
    });

    // Sort strictly by createdAt (oldest first)
    return candidates.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders, draftCart, statusFilter, typeFilter]);

  const visibleOrders = filteredOrders.slice(startIndex, startIndex + 4);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans">
      {/* Navbar (dark charcoal theme) */}
      <KitchenNavbar activePendingCount={activeDraftCount} activeConfirmedCount={countConfirmed} />

      {/* ── Filter Controls Section (Orange/Charcoal Premium Palette) ── */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 flex flex-col gap-3 shadow-sm">
        
        {/* Row 1: Status Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-1.5 rounded-full text-[11.5px] font-800 tracking-wide uppercase transition-all cursor-pointer border ${
              statusFilter === 'all'
                ? 'bg-brand-primary border-brand-primary text-white shadow-sm shadow-brand-primary/15'
                : 'bg-white border-neutral-200 text-neutral-600 hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary-light/40'
            }`}
          >
            All ({countAll})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-1.5 rounded-full text-[11.5px] font-800 tracking-wide uppercase transition-all cursor-pointer border ${
              statusFilter === 'pending'
                ? 'bg-brand-primary border-brand-primary text-white shadow-sm shadow-brand-primary/15'
                : 'bg-white border-neutral-200 text-neutral-600 hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary-light/40'
            }`}
          >
            Pending ({countPending})
          </button>
          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`px-4 py-1.5 rounded-full text-[11.5px] font-800 tracking-wide uppercase transition-all cursor-pointer border ${
              statusFilter === 'confirmed'
                ? 'bg-brand-primary border-brand-primary text-white shadow-sm shadow-brand-primary/15'
                : 'bg-white border-neutral-200 text-neutral-600 hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary-light/40'
            }`}
          >
            Order Confirmed ({countConfirmed})
          </button>
          <button
            onClick={() => setStatusFilter('preparing')}
            className={`px-4 py-1.5 rounded-full text-[11.5px] font-800 tracking-wide uppercase transition-all cursor-pointer border ${
              statusFilter === 'preparing'
                ? 'bg-brand-primary border-brand-primary text-white shadow-sm shadow-brand-primary/15'
                : 'bg-white border-neutral-200 text-neutral-600 hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary-light/40'
            }`}
          >
            In Preparing ({countPreparing})
          </button>
          <button
            onClick={() => setStatusFilter('ready')}
            className={`px-4 py-1.5 rounded-full text-[11.5px] font-800 tracking-wide uppercase transition-all cursor-pointer border ${
              statusFilter === 'ready'
                ? 'bg-brand-primary border-brand-primary text-white shadow-sm shadow-brand-primary/15'
                : 'bg-white border-neutral-200 text-neutral-600 hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary-light/40'
            }`}
          >
            Ready For Pickup ({countReady})
          </button>
        </div>

        {/* Row 2 & 3: Order Type Filters + Categories */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            {/* Order Types */}
            <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full border border-neutral-200">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3.5 py-1 rounded-full text-[11px] font-800 tracking-wide uppercase transition-all cursor-pointer ${
                  typeFilter === 'all' ? 'bg-brand-primary text-white shadow-xs' : 'text-neutral-600 hover:text-brand-primary'
                }`}
              >
                All ({countAll})
              </button>
              <button
                onClick={() => setTypeFilter('takeout')}
                className={`px-3.5 py-1 rounded-full text-[11px] font-800 tracking-wide uppercase transition-all cursor-pointer ${
                  typeFilter === 'takeout' ? 'bg-brand-primary text-white shadow-xs' : 'text-neutral-600 hover:text-brand-primary'
                }`}
              >
                Take Out ({countTakeout})
              </button>
              <button
                onClick={() => setTypeFilter('drive-through')}
                className={`px-3.5 py-1 rounded-full text-[11px] font-800 tracking-wide uppercase transition-all cursor-pointer ${
                  typeFilter === 'drive-through' ? 'bg-brand-primary text-white shadow-xs' : 'text-neutral-600 hover:text-brand-primary'
                }`}
              >
                Drive Through ({countDriveThrough})
              </button>
              <button
                onClick={() => setTypeFilter('dine-in')}
                className={`px-3.5 py-1 rounded-full text-[11px] font-800 tracking-wide uppercase transition-all cursor-pointer ${
                  typeFilter === 'dine-in' ? 'bg-brand-primary text-white shadow-xs' : 'text-neutral-600 hover:text-brand-primary'
                }`}
              >
                Dine In ({countDineIn})
              </button>
              <button
                onClick={() => setTypeFilter('delivery')}
                className={`px-3.5 py-1 rounded-full text-[11px] font-800 tracking-wide uppercase transition-all cursor-pointer ${
                  typeFilter === 'delivery' ? 'bg-brand-primary text-white shadow-xs' : 'text-neutral-600 hover:text-brand-primary'
                }`}
              >
                Delivery ({countDelivery})
              </button>
            </div>

       
          </div>


        </div>
      </div>

      {/* ── Main Dashboard Cards Row with pagination arrows ── */}
      <div className="flex-1 p-6 flex items-center justify-center gap-4 min-h-0">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 font-800">
            <span className="animate-spin text-2xl mb-2">⏳</span>
            Loading kitchen queue...
          </div>
        ) : (
          <>
            {/* Left Navigation Arrow */}
            {startIndex > 0 ? (
              <button
                onClick={() => setStartIndex((prev) => Math.max(0, prev - 1))}
                className="w-12 h-12 flex-shrink-0 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-brand-primary border border-neutral-200 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Previous orders"
              >
                <ChevronLeft size={24} className="stroke-[3]" />
              </button>
            ) : (
              // Invisible spacer of the same size to keep the cards centered when left button is absent
              <div className="w-12 h-12 flex-shrink-0" />
            )}

            {/* Grid of 4 Cards */}
            <div className="flex-1 h-full grid grid-cols-4 gap-6 items-stretch justify-start">
              {visibleOrders.map((order) => (
                <div
                  key={order._id || order.orderNumber}
                  className="h-full flex flex-col bg-white rounded-xl shadow-md border border-neutral-250 overflow-hidden"
                >
                  <KitchenOrderCard
                    order={order}
                    onClick={() => setSelectedOrder(order)}
                  />
                </div>
              ))}

              {/* Empty outlines for remaining slots in the 4-column layout */}
              {filteredOrders.length > 0 && visibleOrders.length < 4 && (
                Array.from({ length: 4 - visibleOrders.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="border-2 border-dashed border-neutral-200 rounded-xl"
                  />
                ))
              )}

              {/* If no orders matching filters */}
              {filteredOrders.length === 0 && (
                <div className="col-span-4 flex-1 flex flex-col h-full bg-white/70 rounded-xl border-2 border-dashed border-neutral-350 p-6 items-center justify-center text-center text-neutral-400">
                  <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-3">
                    🍽️
                  </div>
                  <p className="text-[13px] font-800 text-neutral-700 uppercase tracking-wide">Queue Clear</p>
                  <p className="text-[11px] text-neutral-400 mt-1 max-w-[200px]">
                    No active orders matching filters.
                  </p>
                </div>
              )}
            </div>

            {/* Right Navigation Arrow */}
            {startIndex + 4 < filteredOrders.length ? (
              <button
                onClick={() => setStartIndex((prev) => Math.min(filteredOrders.length - 4, prev + 1))}
                className="w-12 h-12 flex-shrink-0 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-brand-primary border border-neutral-200 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="More orders"
              >
                <ChevronRight size={24} className="stroke-[3]" />
              </button>
            ) : (
              // Invisible spacer of the same size to keep the cards centered when right button is absent
              <div className="w-12 h-12 flex-shrink-0" />
            )}
          </>
        )}
      </div>

      {/* Detail Modal Overlay */}
      <KitchenDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={fetchOrders}
      />
    </div>
  );
}
