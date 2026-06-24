'use client';

import React from 'react';
import { ShoppingBag, Users, Trash2, Plus, ChevronRight, Save, Car, TableProperties } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePosStore } from '../store/pos.store';
import CartItem from './CartItem';

export default function CartPanel() {
  const {
    cartItems, selectedCustomer, selectedTable, selectedVehicle,
    subtotal, tax, discount, total, currentOrderSeq,
    orderType, createOrder, saveOrder, clearCart,
  } = usePosStore();

  const prefix = { takeout: 'TO', delivery: 'DL', 'drive-through': 'DT', 'dine-in': 'DN' }[orderType] ?? 'TO';
  const orderNum = `#${prefix}-${String(currentOrderSeq).padStart(6, '0')}`;

  const validate = () => {
    if (!cartItems.length) { 
      toast.error('Cart is empty.'); 
      return false; 
    }
    if (orderType === 'dine-in' && !selectedTable) { 
      toast.error('Please assign a table for Dine-In.'); 
      return false; 
    }
    if (orderType === 'drive-through' && !selectedVehicle) { 
      toast.error('Please record vehicle details for Drive-Through.'); 
      return false; 
    }
    return true;
  };

  const handleCreate = () => {
    if (!validate()) return;
    const o = createOrder();
    if (o) {
      toast.success(
        <div className="flex flex-col gap-0.5 text-left select-none">
          <span className="font-bold text-[11px] text-green-900">Order Created!</span>
          <span className="text-[10px] text-green-800">{o.orderNumber} • {o.orderType.toUpperCase()}</span>
          <span className="font-semibold text-[10px] text-green-950">Total: ${o.total.toFixed(2)}</span>
        </div>
      );
    }
  };

  const handleSave = () => {
    if (!validate()) return;
    const o = saveOrder();
    if (o) {
      toast.success(
        <div className="flex flex-col gap-0.5 text-left select-none">
          <span className="font-bold text-[11px] text-green-900">Draft Saved!</span>
          <span className="text-[10px] text-green-800">Order {o.orderNumber} saved to hold.</span>
        </div>
      );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 flex flex-col h-full overflow-hidden select-none">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-neutral-100 flex-shrink-0">
        <div>
          <h3 className="text-[12px] font-700 text-neutral-900 leading-tight">Current Order</h3>
          <span className="text-[10px] font-600 text-brand-primary tracking-wide mt-0.5 block">{orderNum}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-neutral-100 px-2 py-0.5 rounded-md">
            <Users size={9} className="text-neutral-500" />
            <span className="text-[9px] font-700 text-neutral-600">{selectedCustomer ? 1 : 0}</span>
          </div>
          <button
            onClick={() => cartItems.length > 0 && confirm('Clear cart?') && clearCart()}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
            title="Clear cart"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* ── Cart Items ── */}
      <div className="flex-1 overflow-y-auto px-3.5 min-h-0">
        {cartItems.length > 0 ? (
          <div className="py-1">
            {cartItems.map((item) => <CartItem key={item.id} item={item} />)}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-neutral-50 border border-neutral-200 rounded-full flex items-center justify-center mb-2">
              <ShoppingBag size={18} className="text-neutral-300" />
            </div>
            <h4 className="text-[11px] font-600 text-neutral-600">Cart is empty</h4>
            <p className="text-[9px] text-neutral-400 mt-1 leading-normal">Select items from the menu</p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-neutral-100 px-3.5 py-3 space-y-2.5 flex-shrink-0">

        {/* Add More */}
        <button
          onClick={() => document.getElementById('menu-grid-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-full py-1.5 rounded-lg border border-dashed border-neutral-300 text-neutral-500 hover:border-brand-primary hover:text-brand-primary text-[9.5px] font-600 flex items-center justify-center gap-1 hover:bg-orange-50/30 transition-all cursor-pointer"
        >
          <Plus size={10} />Add More Items
        </button>

        {/* Totals */}
        <div className="space-y-1.5">
          {[
            { label: 'Subtotal',    value: `$${subtotal.toFixed(2)}`,  cls: 'text-neutral-700' },
            { label: 'Tax (HST 13%)', value: `$${tax.toFixed(2)}`,    cls: 'text-neutral-500' },
            ...(discount > 0 ? [{ label: 'Discount', value: `-$${discount.toFixed(2)}`, cls: 'text-green-600' }] : []),
          ].map(({ label, value, cls }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[10px] font-500 text-neutral-500">{label}</span>
              <span className={`text-[10px] font-600 ${cls}`}>{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100 mt-1">
            <span className="text-[11px] font-700 text-neutral-900 uppercase tracking-wide">Total</span>
            <span className="text-[14px] font-800 text-brand-primary">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-1.5 pt-0.5">
          <button
            onClick={handleCreate}
            disabled={!cartItems.length}
            className={`w-full py-2.5 rounded-xl text-[11px] font-700 flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.99] cursor-pointer ${
              cartItems.length
                ? 'bg-brand-primary text-white hover:bg-brand-primary-hover shadow-brand-primary/20'
                : 'bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none'
            }`}
          >
            Create Order <ChevronRight size={13} strokeWidth={2.5} />
          </button>
          <button
            onClick={handleSave}
            disabled={!cartItems.length}
            className={`w-full py-2 rounded-xl border text-[10px] font-600 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer ${
              cartItems.length
                ? 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
                : 'border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed'
            }`}
          >
            <Save size={11} />Save Order
          </button>
        </div>

        {/* Context warnings */}
        {/* {!selectedCustomer && orderType !== 'delivery' && (
          <p className="text-[9px] font-500 text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2 text-center">
            💡 Add customer info for booking (Optional)
          </p>
        )} */}
        {!selectedTable && orderType === 'dine-in' && (
          <p className="text-[9px] font-500 text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2 flex items-center justify-center gap-1">
            <TableProperties size={10} />Please assign a table for Dine-In.
          </p>
        )}
        {!selectedVehicle && orderType === 'drive-through' && (
          <p className="text-[9px] font-500 text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2 flex items-center justify-center gap-1">
            <Car size={10} />Record vehicle license and driver name.
          </p>
        )}
      </div>
    </div>
  );
}
