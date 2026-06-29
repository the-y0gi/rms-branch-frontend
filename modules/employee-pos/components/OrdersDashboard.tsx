'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import OrdersNavbar from './OrdersNavbar';
import DashboardView from './DashboardView';
import SalesSummaryView from './SalesSummaryView';
import ExpenseDashboardView from './ExpenseDashboardView';
import POSSidebarDrawer from './POSSidebarDrawer';
import OrdersTableView from './OrdersTableView';
import OrderDetailModal from './OrderDetailModal';
import { Order } from '../types';
import { Search, Calendar, ChevronDown, SlidersHorizontal, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrdersDashboard() {
  // ── Sub-tabs ──
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'orders' | 'sales_summary' | 'expense_payout'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ── Orders State ──
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // ── Filters State ──
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  
  // Date states (Default: Last 30 Days)
  const getPastDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };
  const getTodayDateStr = () => {
    return new Date().toISOString().slice(0, 10);
  };
  const getPastDateOf = (dateStr: string, daysAgo: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  const [startDate, setStartDate] = useState(getPastDateStr(30));
  const [endDate, setEndDate] = useState(getTodayDateStr());
  
  // Standard single date input (synced with endDate)
  const [singleDate, setSingleDate] = useState(getTodayDateStr());

  // ── Advance Search Modal State ──
  const [isAdvanceSearchOpen, setIsAdvanceSearchOpen] = useState(false);
  const [advStartDate, setAdvStartDate] = useState(getPastDateStr(30));
  const [advEndDate, setAdvEndDate] = useState(getTodayDateStr());

  // ── Fetch Orders from API ──
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      let finalStartDate = startDate;
      let finalEndDate = endDate;

      // Force 30-day window ending on TODAY'S actual date for dashboard tab
      if (activeSubTab === 'dashboard') {
        finalEndDate = getTodayDateStr();
        finalStartDate = getPastDateStr(30);
      }

      const res = await axios.get(`${apiUrl}/orders`, {
        params: {
          startDate: finalStartDate,
          endDate: finalEndDate,
          status: activeSubTab === 'orders' ? (statusFilter || undefined) : undefined,
          paymentStatus: activeSubTab === 'orders' ? (paymentFilter || undefined) : undefined,
        }
      });

      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      toast.error('Could not load orders from database.');
    } finally {
      setLoading(false);
    }
  }, [activeSubTab, startDate, endDate, singleDate, statusFilter, paymentFilter]);

  // ── Initial Fetch ──
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Sync singleDate to startDate/endDate range ──
  const handleSingleDateChange = (val: string) => {
    setSingleDate(val);
    if (activeSubTab === 'orders') {
      setStartDate(val);
      setEndDate(val);
    }
  };


  // ── Apply Quick Date Ranges (Advance Search) ──
  const handleQuickRange = (range: 'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (range) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'this_week':
        // Current week (Monday to Sunday)
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is sunday
        start = new Date(today.setDate(diff));
        end = new Date();
        break;
      case 'last_week':
        const lastWeekStart = new Date();
        lastWeekStart.setDate(today.getDate() - today.getDay() - 6);
        const lastWeekEnd = new Date();
        lastWeekEnd.setDate(today.getDate() - today.getDay());
        start = lastWeekStart;
        end = lastWeekEnd;
        break;
      case 'this_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
        break;
      case 'last_month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
    }

    setAdvStartDate(start.toISOString().slice(0, 10));
    setAdvEndDate(end.toISOString().slice(0, 10));
  };

  const handleSelectOrder = async (order: Order) => {
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
      console.error('Error fetching order details:', err);
      toast.error('Failed to load order details');
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleAdvanceSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStartDate(advStartDate);
    setEndDate(advEndDate);
    setIsAdvanceSearchOpen(false);
    toast.success(`Date range updated: ${advStartDate} to ${advEndDate}`);
  };

  const handleResetAdvanceSearch = () => {
    const defaultStart = getPastDateStr(30);
    const defaultEnd = getTodayDateStr();
    setAdvStartDate(defaultStart);
    setAdvEndDate(defaultEnd);
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setSingleDate(defaultEnd);
    setIsAdvanceSearchOpen(false);
    toast.success('Filters reset to default last 30 days');
  };

  const handleClearFilters = () => {
    setSearchKeyword('');
    setStatusFilter('');
    setPaymentFilter('');
    const today = getTodayDateStr();
    setSingleDate(today);
    
    if (activeSubTab === 'dashboard') {
      setStartDate(getPastDateStr(30));
      setEndDate(today);
    } else {
      setStartDate(today);
      setEndDate(today);
    }
    toast.success('Filters cleared successfully');
  };

  // ── Client-side Text Filter (Instant Search) ──
  const filteredOrders = React.useMemo(() => {
    return orders.filter(order => {
      const keyword = searchKeyword.toLowerCase().trim();
      if (!keyword) return true;

      const orderNo = order.orderNumber.toLowerCase();
      const custName = order.customer?.name?.toLowerCase() || '';
      const custPhone = order.customer?.phone || '';

      return orderNo.includes(keyword) || custName.includes(keyword) || custPhone.includes(keyword);
    });
  }, [orders, searchKeyword]);

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans">
      
      {/* Navbar Header */}
      <OrdersNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />

      {/* ── Secondary Control Bar (Dashboard / Orders / Sales tabs + Filters) ── */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3.5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shadow-sm flex-shrink-0 select-none">
        
        {/* Left Side: Sub-tabs and Main Header Text */}
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-xl font-900 text-neutral-900 tracking-tight leading-none min-w-[140px]">
            {activeSubTab === 'dashboard' ? 'Dashboard' : activeSubTab === 'orders' ? 'Orders' : activeSubTab === 'sales_summary' ? 'Sales Summary' : 'Expense/Payout'}
          </h1>
          
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
            <button
              onClick={() => {
                setActiveSubTab('dashboard');
                // Sync range to last 30 days relative to today's actual date
                setStartDate(getPastDateStr(30));
                setEndDate(getTodayDateStr());
              }}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                activeSubTab === 'dashboard'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-neutral-500 hover:text-brand-primary'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setActiveSubTab('orders');
                // Sync range to selected singleDate
                setStartDate(singleDate);
                setEndDate(singleDate);
              }}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                activeSubTab === 'orders'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-neutral-500 hover:text-brand-primary'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => {
                setActiveSubTab('sales_summary');
              }}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                activeSubTab === 'sales_summary'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-neutral-500 hover:text-brand-primary'
              }`}
            >
              Sales Summary
            </button>
          </div>
        </div>

        {/* Right Side: Filters (Keyword, Status, Payment, Date, More Search) */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Date Picker Input */}
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="date"
              value={singleDate}
              onChange={(e) => handleSingleDateChange(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-[12px] font-600 text-neutral-700 hover:border-neutral-350 focus:outline-none focus:border-brand-primary cursor-pointer transition-all"
            />
          </div>

          {/* Keyword Search Input */}
          <div className="relative w-[180px] sm:w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search by Order #, Cust"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-[12px] text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary hover:border-neutral-350 focus:bg-white transition-all"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Order Status Select */}
          {activeSubTab === 'orders' && (
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-neutral-50 border border-neutral-200 rounded-lg pl-3 pr-8 py-1.5 text-[12px] font-600 text-neutral-700 hover:border-neutral-350 focus:outline-none focus:border-brand-primary cursor-pointer transition-all"
              >
                <option value="">Order Status</option>
                <option value="pending">Pending</option>
                <option value="preparing">In Preparing</option>
                <option value="ready">Ready For Pickup</option>
                <option value="completed">Order Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
          )}

          {/* Payment Method Select */}
          {activeSubTab === 'orders' && (
            <div className="relative">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="appearance-none bg-neutral-50 border border-neutral-200 rounded-lg pl-3 pr-8 py-1.5 text-[12px] font-600 text-neutral-700 hover:border-neutral-350 focus:outline-none focus:border-brand-primary cursor-pointer transition-all"
              >
                <option value="">Payment Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
          )}

          {/* Advance Search Button */}
          {activeSubTab === 'orders' && (
            <button
              onClick={() => setIsAdvanceSearchOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-[12px] font-600 text-neutral-700 hover:text-brand-primary transition-all cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal size={13} />
              <span>Advance Search</span>
            </button>
          )}

          {/* Clear Filters Button */}
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-600 text-neutral-500 hover:text-neutral-800 transition-all cursor-pointer"
          >
            <span>Clear</span>
          </button>

          {/* Manual Refresh Trigger */}
          {activeSubTab === 'orders' && (
            <button
              onClick={fetchOrders}
              className={`p-1.5 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-500 hover:text-brand-primary transition-all cursor-pointer ${
                loading ? 'animate-spin' : ''
              }`}
              title="Refresh list"
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>

      </div>

      {/* ── Main View Container ── */}
      <div className="flex-1 overflow-hidden p-6 bg-brand-bg flex flex-col min-h-0">
        
        {loading && orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 font-750 text-[12px] gap-2">
            <span className="animate-spin text-xl">⏳</span>
            <span>Fetching updated order records...</span>
          </div>
        ) : (
          <>
            {activeSubTab === 'dashboard' ? (
              <DashboardView
                allOrders={orders}
                selectedDate={singleDate}
                searchKeyword={searchKeyword}
              />
            ) : activeSubTab === 'sales_summary' ? (
              <SalesSummaryView selectedDate={singleDate} />
            ) : activeSubTab === 'expense_payout' ? (
              <ExpenseDashboardView />
            ) : (
              <OrdersTableView orders={filteredOrders} onSelectOrder={handleSelectOrder} />
            )}
          </>
        )}

      </div>

      {/* Sidebar Drawer Component */}
      <POSSidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeSubTab}
        onSelectTab={(tabKey) => {
          if (tabKey === 'dashboard' || tabKey === 'orders' || tabKey === 'sales_summary' || tabKey === 'expense_payout') {
            setActiveSubTab(tabKey as any);
          } else {
            toast.success(`Navigating to ${tabKey.replace('_', ' ').toUpperCase()}`);
          }
        }}
      />

      {/* ── Advance Search Modal ── */}
      {isAdvanceSearchOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
          <form
            onSubmit={handleAdvanceSearchSubmit}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up"
          >
            {/* Modal Header */}
            <div className="bg-amber-500 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-800 text-[13px] uppercase tracking-wide">Advance Search</h3>
              <button
                type="button"
                onClick={() => setIsAdvanceSearchOpen(false)}
                className="text-white hover:text-white/80"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              
              {/* Quick Ranges */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-neutral-450 font-800 tracking-wider uppercase block">Quick Ranges</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'this_week', label: 'This Week' },
                    { id: 'last_week', label: 'Last Week' },
                    { id: 'this_month', label: 'This Month' },
                    { id: 'last_month', label: 'Last Month' },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => handleQuickRange(btn.id as any)}
                      className="px-3 py-1 border border-neutral-200 rounded-md bg-neutral-50 hover:bg-neutral-100 text-[11px] font-600 text-neutral-600 hover:text-brand-primary transition-all cursor-pointer"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start and End Date selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10.5px] text-neutral-500 font-700">Start Date</label>
                  <input
                    type="date"
                    required
                    value={advStartDate}
                    onChange={(e) => setAdvStartDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[12px] font-600 text-neutral-700 focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10.5px] text-neutral-500 font-700">End Date</label>
                  <input
                    type="date"
                    required
                    value={advEndDate}
                    onChange={(e) => setAdvEndDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[12px] font-600 text-neutral-700 focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="bg-neutral-50 border-t border-neutral-150 p-4 flex items-center justify-end gap-3.5 select-none">
              <button
                type="submit"
                className="px-6 py-1.5 bg-red-700 hover:bg-red-800 text-white text-[11px] font-800 tracking-wide uppercase rounded-lg shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleResetAdvanceSearch}
                className="px-6 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-800 tracking-wide uppercase rounded-lg shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                Reset
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ── Order Detail Modal Overlay ── */}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onRefresh={fetchOrders}
      />

    </main>
  );
}
