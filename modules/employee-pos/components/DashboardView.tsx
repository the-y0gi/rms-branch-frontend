'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ShoppingBag, DollarSign, UserCheck, Users } from 'lucide-react';
import { Order } from '../types';

interface DashboardViewProps {
  allOrders: Order[];
  selectedDate: string;
  searchKeyword: string;
}

const COLORS = [
  '#F97316', // Brand Primary Orange
  '#991B1B', // Burgundy
  '#16A34A', // Success Green
  '#D97706', // Warning Amber
  '#FBBF24', // Amber Light
  '#2563EB', // Info Blue
  '#A8A29E', // Stone Neutral
  '#78716C', // Stone Medium
  '#44403C'  // Stone Dark
];

export default function DashboardView({ allOrders, selectedDate, searchKeyword }: DashboardViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false); // Reset on unmount
    setMounted(true);
  }, []);

  const getLocalDateStr = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 10);
  };

  // ── Metrics Calculations
  const metricsOrders = React.useMemo(() => {
    return allOrders.filter(order => {
      const orderDateStr = getLocalDateStr(order.createdAt);
      if (orderDateStr !== selectedDate) return false;

      const keyword = searchKeyword.toLowerCase().trim();
      if (!keyword) return true;

      const orderNo = order.orderNumber.toLowerCase();
      const custName = order.customer?.name?.toLowerCase() || '';
      const custPhone = order.customer?.phone || '';

      return orderNo.includes(keyword) || custName.includes(keyword) || custPhone.includes(keyword);
    });
  }, [allOrders, selectedDate, searchKeyword]);

  const totalOrders = metricsOrders.length;

  const totalEarnings = metricsOrders.reduce((sum, order) => {
    if (order.status !== 'cancelled') {
      return sum + order.total;
    }
    return sum;
  }, 0);

  // New vs Returning Customer 
  let newCustomers = 0;
  let returningCustomers = 0;

  metricsOrders.forEach(order => {
    const phone = order.customer?.phone?.trim();
    const email = order.customer?.email?.trim();
    
    // If order has no phone AND no email, ignore it completely for customer cards
    if (!phone && !email) return;

    // Find other orders for this customer in the 30-day history (allOrders)
    const customerOrders = allOrders.filter(o => {
      const oPhone = o.customer?.phone?.trim();
      const oEmail = o.customer?.email?.trim();
      
      const phoneMatch = phone && oPhone && phone === oPhone;
      const emailMatch = email && oEmail && email === oEmail;
      
      return phoneMatch || emailMatch;
    });

    const currentOrderTime = new Date(order.createdAt).getTime();
    const hasPreviousOrder = customerOrders.some(o => new Date(o.createdAt).getTime() < currentOrderTime);

    if (hasPreviousOrder) {
      returningCustomers += 1;
    } else {
      newCustomers += 1;
    }
  });


  // ── Chart 1: Most Popular Days 
  const getDayName = (dateStr: string) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(dateStr).getDay()];
  };

  const daysDataCounts: Record<string, number> = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
    Sunday: 0
  };

  allOrders.forEach(order => {
    if (order.status !== 'cancelled') {
      const day = getDayName(order.createdAt);
      if (day in daysDataCounts) {
        daysDataCounts[day] += 1;
      }
    }
  });

  const popularDaysData = Object.entries(daysDataCounts).map(([name, value]) => ({
    name,
    value
  })).filter(item => item.value > 0);

  // Fallback default data if empty
  const popularDaysChartData = popularDaysData.length > 0 ? popularDaysData : [
    { name: 'Monday', value: 0 },
    { name: 'Tuesday', value: 0 },
    { name: 'Wednesday', value: 0 },
    { name: 'Thursday', value: 0 },
    { name: 'Friday', value: 0 },
    { name: 'Saturday', value: 0 },
    { name: 'Sunday', value: 0 }
  ];

  // ── Chart 2: Most Popular Food Category/Items 
  const foodDataCounts: Record<string, number> = {};
  allOrders.forEach(order => {
    if (order.status !== 'cancelled') {
      order.items.forEach(item => {
        // Group by item name
        const itemName = item.name;
        foodDataCounts[itemName] = (foodDataCounts[itemName] || 0) + item.quantity;
      });
    }
  });

  const sortedFood = Object.entries(foodDataCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Take top 6 and group others
  let popularFoodChartData: Array<{ name: string; value: number }> = [];
  if (sortedFood.length > 6) {
    popularFoodChartData = sortedFood.slice(0, 6);
    const otherVal = sortedFood.slice(6).reduce((sum, item) => sum + item.value, 0);
    popularFoodChartData.push({ name: 'Other Items', value: otherVal });
  } else {
    popularFoodChartData = sortedFood;
  }

  if (popularFoodChartData.length === 0) {
    popularFoodChartData = [{ name: 'No Menu Items Sold', value: 0 }];
  }


  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400 font-600 text-[12px] p-12">
        Initializing Dashboard metrics...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-6 pb-6 select-none font-sans">
      
      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Orders Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-brand-primary">
            <ShoppingBag size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-450 font-800 tracking-wider uppercase block">
              Total Orders
            </span>
            <span className="text-xl font-900 text-neutral-900 block leading-tight">
              {totalOrders}
            </span>
          </div>
        </div>

        {/* Total Earnings Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <DollarSign size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-450 font-800 tracking-wider uppercase block">
              Total Earning
            </span>
            <span className="text-xl font-900 text-neutral-900 block leading-tight">
              ${totalEarnings.toFixed(2)}
            </span>
          </div>
        </div>

        {/* New Customer Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
            <Users size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-450 font-800 tracking-wider uppercase block">
              New Customer
            </span>
            <span className="text-xl font-900 text-neutral-900 block leading-tight">
              {newCustomers}
            </span>
          </div>
        </div>

        {/* Returning Customer Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <UserCheck size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-450 font-800 tracking-wider uppercase block">
              Returning Customer
            </span>
            <span className="text-xl font-900 text-neutral-900 block leading-tight">
              {returningCustomers}
            </span>
          </div>
        </div>

      </div>

      {/* ── Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Most Popular Days Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-neutral-850 font-850 text-[13px] uppercase tracking-wide border-b border-neutral-100 pb-3 mb-4">
            Most Popular Days (Last 30 Days)
          </h3>
          <div className="h-[280px] w-full flex items-center justify-center">
            {popularDaysData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={popularDaysChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {popularDaysChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Orders`, 'Volume']} />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle" 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 650, color: '#44403C' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-neutral-400 text-[11px] font-700">No sales data available.</div>
            )}
          </div>
        </div>

        {/* Most Popular Food Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-neutral-850 font-850 text-[13px] uppercase tracking-wide border-b border-neutral-100 pb-3 mb-4">
            Most Popular Food (Last 30 Days)
          </h3>
          <div className="h-[280px] w-full flex items-center justify-center">
            {sortedFood.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={popularFoodChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {popularFoodChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} items sold`, 'Quantity']} />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle" 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 650, color: '#44403C' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-neutral-400 text-[11px] font-700">No items sold.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
