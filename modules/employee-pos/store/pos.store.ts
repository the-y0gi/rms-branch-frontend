import { create } from 'zustand';
import toast from 'react-hot-toast';
import axios from 'axios';
import { MenuItem, SelectedModifier, CartItem, CustomerInfo, VehicleInfo, TableInfo, Order, Category } from '../types';

interface PosState {
  // State
  selectedCategory: string;
  search: string;
  sortBy: string;
  orderType: 'takeout' | 'delivery' | 'drive-through' | 'dine-in';
  selectedTable: TableInfo | null;
  selectedCustomer: CustomerInfo | null;
  selectedVehicle: VehicleInfo | null;
  cartItems: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currentOrder: Order | null;
  orders: Order[];
  currentOrderSeq: number;
  categories: Category[];
  menuItems: MenuItem[];
  loadingMenu: boolean;

  // Actions
  setCategory: (category: string) => void;
  setSearch: (query: string) => void;
  setSort: (sort: string) => void;
  setOrderType: (type: 'takeout' | 'delivery' | 'drive-through' | 'dine-in') => void;
  setCustomer: (customer: CustomerInfo | null) => void;
  setTable: (table: TableInfo | null) => void;
  setVehicle: (vehicle: VehicleInfo | null) => void;
  addToCart: (menuItem: MenuItem, selectedModifiers: SelectedModifier[], quantity?: number, note?: string) => void;
  removeFromCart: (cartItemId: string) => void;
  increaseQuantity: (cartItemId: string) => void;
  decreaseQuantity: (cartItemId: string) => void;
  clearCart: () => void;
  calculateTotals: () => void;
  saveOrder: () => Order | null;
  createOrder: () => Order | null;
  fetchMenu: () => Promise<void>;
}

const TAX_RATE = 0.13; // 13% tax

const roundToTwo = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Generates unique composite cart item ID based on menuItem ID and sorted modifier option IDs
const generateCartItemId = (menuItemId: string, modifiers: SelectedModifier[]): string => {
  const sortedOptionIds = modifiers
    .map((m) => m.optionId)
    .sort()
    .join('-');
  return sortedOptionIds ? `${menuItemId}-${sortedOptionIds}` : menuItemId;
};

export const usePosStore = create<PosState>((set, get) => ({
  // Initial State
  selectedCategory: 'all',
  search: '',
  sortBy: 'popular',
  orderType: 'takeout',
  selectedTable: null,
  selectedCustomer: null,
  selectedVehicle: null,
  cartItems: [],
  subtotal: 0,
  tax: 0,
  discount: 0,
  total: 0,
  currentOrder: null,
  orders: [],
  currentOrderSeq: 124, // Starting number matching #TO-000124 example
  categories: [],
  menuItems: [],
  loadingMenu: false,

  // Actions
  setCategory: (category) => set({ selectedCategory: category }),
  
  setSearch: (query) => set({ search: query }),
  
  setSort: (sort) => set({ sortBy: sort }),
  
  setOrderType: (type) => {
    // When changing order type, clear other incompatible states
    const updates: Partial<PosState> = { orderType: type };
    if (type !== 'delivery') updates.selectedCustomer = null;
    if (type !== 'dine-in') updates.selectedTable = null;
    if (type !== 'drive-through') updates.selectedVehicle = null;
    set(updates);
  },
  
  setCustomer: (customer) => set({ selectedCustomer: customer }),
  
  setTable: (table) => set({ selectedTable: table }),
  
  setVehicle: (vehicle) => set({ selectedVehicle: vehicle }),

  addToCart: (menuItem, selectedModifiers, quantity = 1, note = '') => {
    const { cartItems } = get();
    const cartItemId = generateCartItemId(menuItem.id, selectedModifiers);

    const modifierSum = selectedModifiers.reduce((sum, mod) => sum + mod.price, 0);
    const itemUnitCost = menuItem.price + modifierSum;

    const existingIndex = cartItems.findIndex((item) => item.id === cartItemId);
    let updatedCartItems = [...cartItems];

    if (existingIndex > -1) {
      const item = updatedCartItems[existingIndex];
      const newQty = item.quantity + quantity;
      updatedCartItems[existingIndex] = {
        ...item,
        quantity: newQty,
        totalPrice: roundToTwo(itemUnitCost * newQty),
        note: note || item.note, // preserve or overwrite note
      };
    } else {
      const newItem: CartItem = {
        id: cartItemId,
        menuItemId: menuItem.id,
        name: menuItem.name,
        image: menuItem.image,
        basePrice: menuItem.price,
        selectedModifiers,
        quantity,
        totalPrice: roundToTwo(itemUnitCost * quantity),
        note,
      };
      updatedCartItems.push(newItem);
    }

    set({ cartItems: updatedCartItems });
    get().calculateTotals();
    toast.success(`${menuItem.name} added to cart`);
  },
  
  removeFromCart: (cartItemId) => {
    const item = get().cartItems.find((i) => i.id === cartItemId);
    const updatedCartItems = get().cartItems.filter((item) => item.id !== cartItemId);
    set({ cartItems: updatedCartItems });
    get().calculateTotals();
    if (item) {
      toast.success(`${item.name} removed from cart`);
    }
  },

  increaseQuantity: (cartItemId) => {
    const updatedCartItems = get().cartItems.map((item) => {
      if (item.id === cartItemId) {
        const newQty = item.quantity + 1;
        const modifierSum = item.selectedModifiers.reduce((sum, mod) => sum + mod.price, 0);
        const itemUnitCost = item.basePrice + modifierSum;
        return {
          ...item,
          quantity: newQty,
          totalPrice: roundToTwo(itemUnitCost * newQty),
        };
      }
      return item;
    });

    set({ cartItems: updatedCartItems });
    get().calculateTotals();
  },

  decreaseQuantity: (cartItemId) => {
    const { cartItems } = get();
    const existingItem = cartItems.find((item) => item.id === cartItemId);
    if (!existingItem) return;

    let updatedCartItems: CartItem[];
    if (existingItem.quantity <= 1) {
      updatedCartItems = cartItems.filter((item) => item.id !== cartItemId);
    } else {
      updatedCartItems = cartItems.map((item) => {
        if (item.id === cartItemId) {
          const newQty = item.quantity - 1;
          const modifierSum = item.selectedModifiers.reduce((sum, mod) => sum + mod.price, 0);
          const itemUnitCost = item.basePrice + modifierSum;
          return {
            ...item,
            quantity: newQty,
            totalPrice: roundToTwo(itemUnitCost * newQty),
          };
        }
        return item;
      });
    }

    set({ cartItems: updatedCartItems });
    get().calculateTotals();
  },

  clearCart: () => {
    set({
      cartItems: [],
      selectedCustomer: null,
      selectedTable: null,
      selectedVehicle: null,
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
    });
  },

  calculateTotals: () => {
    const { cartItems, discount } = get();
    const subtotal = roundToTwo(
      cartItems.reduce((sum, item) => sum + item.totalPrice, 0)
    );
    const tax = roundToTwo(subtotal * TAX_RATE);
    const total = roundToTwo(subtotal + tax - discount);

    set({
      subtotal,
      tax,
      total,
    });
  },

  saveOrder: () => {
    const {
      cartItems,
      orderType,
      selectedTable,
      selectedCustomer,
      selectedVehicle,
      subtotal,
      tax,
      discount,
      total,
      currentOrderSeq,
      orders,
    } = get();

    if (cartItems.length === 0) return null;

    // Helper prefix based on type
    const prefix = orderType === 'takeout' ? 'TO' : orderType === 'delivery' ? 'DL' : orderType === 'drive-through' ? 'DT' : 'DN';
    const orderNumber = `#${prefix}-${String(currentOrderSeq).padStart(6, '0')}`;

    const newOrder: Order = {
      orderNumber,
      orderType,
      table: selectedTable,
      customer: selectedCustomer,
      vehicle: selectedVehicle,
      items: [...cartItems],
      subtotal,
      tax,
      discount,
      total,
      createdAt: new Date().toISOString(),
    };

    set({
      orders: [...orders, newOrder],
      currentOrder: newOrder,
      currentOrderSeq: currentOrderSeq + 1,
      cartItems: [],
      selectedCustomer: null,
      selectedTable: null,
      selectedVehicle: null,
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
    });

    return newOrder;
  },

  createOrder: () => {
    // Delegate to saveOrder since they perform the same physical state action on frontend
    return get().saveOrder();
  },

  fetchMenu: async () => {
    set({ loadingMenu: true });
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${apiUrl}/menu/pos-feed`);
      if (res.data.success) {
        const allCategory: Category = {
          id: 'all',
          name: 'ALL MENUS',
          image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=150&auto=format&fit=crop&q=60',
          sortOrder: 0
        };
        set({
          categories: [allCategory, ...res.data.data.categories],
          menuItems: res.data.data.menuItems,
        });
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      // fallback to offline static data to avoid breaking layout
      const { categories: staticCats } = require('../data/categories');
      const { menuItems: staticItems } = require('../data/menuItems');
      set({ categories: staticCats, menuItems: staticItems });
    } finally {
      set({ loadingMenu: false });
    }
  }
}));
