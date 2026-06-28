'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import KitchenNavbar from './KitchenNavbar';
import KitchenOrderCard from './KitchenOrderCard';
import KitchenDetailModal from './KitchenDetailModal';
import { Order } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

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

  // ── Initial Fetch ────────────────────────────────────────────
  useEffect(() => {
    fetchOrders();
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

  // ── Fetch Full Order Details for Modal ──
  const handleSelectOrder = async (order: Order) => {
    if (order.orderNumber === '#DRAFT') {
      setSelectedOrder(order);
      return;
    }
    const toastId = toast.loading('Loading order details...');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${apiUrl}/orders/${order._id}`);
      if (res.data.success) {
        setSelectedOrder(res.data.data);
      } else {
        toast.error('Failed to load order details');
      }
    } catch (err) {
      console.error('Error fetching order details in kitchen:', err);
      toast.error('Failed to load order details');
    } finally {
      toast.dismiss(toastId);
    }
  };

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
  
  // countAll should only include placed orders (confirmed, preparing, ready). Exclude pending draftCart.
  const countAll = countConfirmed + countPreparing + countReady;

  // Totals for Order Types (Only count active DB orders, exclude pending draftCart)
  const countTakeout = orders.filter((o) => o.orderType === 'takeout').length;
  const countDriveThrough = orders.filter((o) => o.orderType === 'drive-through').length;
  const countDineIn = orders.filter((o) => o.orderType === 'dine-in').length;
  const countDelivery = orders.filter((o) => o.orderType === 'delivery').length;

  // Reset startIndex on filter change
  useEffect(() => {
    setStartIndex(0);
  }, [statusFilter, typeFilter]);

  // ── Filter and Sort All Candidates ──────────────────────────
  const filteredOrders = React.useMemo(() => {
    const candidates: Order[] = [];

    // Draft cart candidate (ONLY show in pending filter per request)
    if (draftCart) {
      const matchesStatus = statusFilter === 'pending';
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
      {/* Navbar */}
      <KitchenNavbar activePendingCount={activeDraftCount} activeConfirmedCount={countConfirmed} />

      {/* ── Filter Controls Section (Premium Low-Profile Segmented Controls) ── */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xs flex-shrink-0 select-none">
        
        {/* Status Pills */}
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { id: "all", label: "All", count: countAll },
            { id: "pending", label: "Pending", count: countPending },
            { id: "confirmed", label: "Confirmed", count: countConfirmed },
            { id: "preparing", label: "Preparing", count: countPreparing },
            { id: "ready", label: "Ready", count: countReady },
          ].map((statusTab) => {
            const active = statusFilter === statusTab.id;
            return (
              <button
                key={statusTab.id}
                onClick={() => setStatusFilter(statusTab.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-750 tracking-wide uppercase transition-all duration-150 cursor-pointer border ${
                  active
                    ? "bg-brand-primary border-brand-primary text-white shadow-sm shadow-brand-primary/15"
                    : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-brand-primary/30 hover:text-brand-primary hover:bg-orange-50/50"
                }`}
              >
                {statusTab.label} ({statusTab.count})
              </button>
            );
          })}
        </div>

        {/* Order Types Segment Bar */}
        <div className="flex items-center gap-1 bg-neutral-50 p-1 rounded-xl border border-neutral-200">
          {[
            { id: "all", label: "All Types", count: countAll },
            { id: "takeout", label: "Takeout", count: countTakeout },
            { id: "drive-through", label: "Drive Thru", count: countDriveThrough },
            { id: "dine-in", label: "Dine In", count: countDineIn },
            { id: "delivery", label: "Delivery", count: countDelivery },
          ].map((typeTab) => {
            const active = typeFilter === typeTab.id;
            return (
              <button
                key={typeTab.id}
                onClick={() => setTypeFilter(typeTab.id as any)}
                className={`px-3 py-1 rounded-lg text-[10px] font-700 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                  active
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-neutral-550 hover:text-brand-primary"
                }`}
              >
                {typeTab.label} ({typeTab.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Dashboard Cards Row with pagination arrows (height constrained to fill screen) ── */}
      <div className="flex-1 p-6 flex items-stretch justify-center gap-4 min-h-0 bg-brand-bg select-none">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-400 font-700 text-[12px] gap-2">
            <span className="animate-spin text-xl">⏳</span>
            <span>Loading active queue...</span>
          </div>
        ) : (
          <>
            {/* Left Navigation Arrow */}
            {startIndex > 0 ? (
              <button
                onClick={() => setStartIndex((prev) => Math.max(0, prev - 1))}
                className="self-center w-12 h-12 flex-shrink-0 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-brand-primary border border-neutral-200 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Previous orders"
              >
                <ChevronLeft size={24} className="stroke-[3]" />
              </button>
            ) : (
              // Invisible spacer of the same size to keep the cards centered when left button is absent
              <div className="self-center w-12 h-12 flex-shrink-0" />
            )}

            {/* Grid of 4 Cards */}
            <div className="flex-1 h-full grid grid-cols-4 gap-6 items-stretch justify-start min-h-0">
              {visibleOrders.map((order) => (
                <div
                  key={order._id || order.orderNumber}
                  className="h-full flex flex-col min-h-0"
                >
                  <KitchenOrderCard
                    order={order}
                    onClick={() => handleSelectOrder(order)}
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
                <div className="col-span-4 flex-1 flex flex-col h-full bg-white/70 rounded-xl border-2 border-dashed border-neutral-300 p-6 items-center justify-center text-center text-neutral-400">
                  <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-3">
                    🍳
                  </div>
                  <p className="text-[13px] font-800 text-neutral-850 uppercase tracking-wide">Queue Clear</p>
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
                className="self-center w-12 h-12 flex-shrink-0 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-brand-primary border border-neutral-200 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="More orders"
              >
                <ChevronRight size={24} className="stroke-[3]" />
              </button>
            ) : (
              // Invisible spacer of the same size to keep the cards centered when right button is absent
              <div className="self-center w-12 h-12 flex-shrink-0" />
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
