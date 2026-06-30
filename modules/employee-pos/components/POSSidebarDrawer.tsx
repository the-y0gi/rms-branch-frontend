'use client';

import React from 'react';
import { 
  X, LogOut, LayoutDashboard, KeyRound, Clock, ShoppingBag, 
  Receipt, ArrowLeftRight, Wallet, Users, UtensilsCrossed, 
  Settings, UserCheck, Lock, Bell, BarChart3, Power, ChefHat
} from 'lucide-react';

interface POSSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tabKey: string) => void;
}

export default function POSSidebarDrawer({ isOpen, onClose, activeTab, onSelectTab }: POSSidebarDrawerProps) {
  if (!isOpen) return null;

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'login_code', label: 'Login As Code', icon: KeyRound },
    { key: 'check_in_out', label: 'Check-In/Out', icon: Clock },
    { key: 'pos', label: 'POS', icon: ShoppingBag },
    { key: 'kitchen', label: 'Kitchen View', icon: ChefHat },
    // { key: 'orders', label: 'Orders', icon: Receipt },
    { key: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { key: 'expense_payout', label: 'Expense/Payout', icon: Wallet },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'menus', label: 'Menus', icon: UtensilsCrossed },
    { key: 'setting', label: 'Setting', icon: Settings },
    { key: 'update_profile', label: 'Update Profile', icon: UserCheck },
    { key: 'change_password', label: 'Change Password', icon: Lock },
    { key: 'sound_notification', label: 'Sound Notification', icon: Bell },
    { key: 'reports', label: 'Reports', icon: BarChart3 },
    { key: 'master_logout', label: 'Master Logout', icon: LogOut, isLogout: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-neutral-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 select-none">
      
      {/* Backdrop overlay clickable */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-72 sm:w-80 bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        
        {/* Top Header matching screenshot */}
        <div className="bg-neutral-900 text-white px-5 py-4 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-[11px] text-neutral-400 font-600 uppercase tracking-wider">User Account</span>
            <span className="text-sm font-900 text-white">Hi, Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              className="p-2 rounded-full bg-red-600/90 hover:bg-red-600 text-white transition-colors cursor-pointer"
              title="Logout"
            >
              <Power size={14} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-amber-500 hover:bg-amber-600 text-neutral-900 transition-colors cursor-pointer"
              title="Close Menu"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Menu List */}
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key || 
                             (item.key === 'transactions' && activeTab === 'orders') ||
                             (item.key === 'reports' && activeTab === 'sales_summary');

            return (
              <button
                key={item.key}
                onClick={() => {
                  if (item.key === 'pos') {
                    window.location.href = '/employee/pos';
                  } else if (item.key === 'kitchen') {
                    window.location.href = '/employee/kitchen';
                  } else if (
                    item.key === 'orders' || 
                    item.key === 'dashboard' || 
                    item.key === 'expense_payout' || 
                    item.key === 'sales_summary' || 
                    item.key === 'transactions' ||
                    item.key === 'reports'
                  ) {
                    let targetTab = item.key;
                    if (item.key === 'transactions') targetTab = 'orders';
                    if (item.key === 'reports') targetTab = 'sales_summary';

                    if (typeof window !== 'undefined' && !window.location.pathname.includes('/employee/orders')) {
                      window.location.href = `/employee/orders?tab=${targetTab}`;
                    } else {
                      onSelectTab(targetTab);
                    }
                  } else {
                    onSelectTab(item.key);
                  }
                  onClose();
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-800 tracking-wide transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-brand-primary text-white shadow-md' 
                    : item.isLogout
                    ? 'text-red-600 hover:bg-red-50 mt-4 border-t border-neutral-100 rounded-none'
                    : 'text-neutral-700 hover:bg-neutral-100/80 hover:text-neutral-900'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-white' : item.isLogout ? 'text-red-600' : 'text-neutral-500'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 text-center text-[10.5px] text-neutral-400 font-600 bg-neutral-50">
          RMS POS System v2.4
        </div>

      </div>
    </div>
  );
}
