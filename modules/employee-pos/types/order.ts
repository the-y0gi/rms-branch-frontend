import { CartItem } from './cart';

export interface CustomerInfo {
  name: string;
  phone: string;
  address?: string;
  postalCode?: string;
}

export interface VehicleInfo {
  vehicleNumber: string;
  customerName: string;
  phone: string;
}

export interface TableInfo {
  id: string;
  name: string;
  status: 'available' | 'occupied' | 'reserved';
}

export interface Order {
  orderNumber: string;
  orderType: 'takeout' | 'delivery' | 'drive-through' | 'dine-in';
  table: TableInfo | null;
  customer: CustomerInfo | null;
  vehicle: VehicleInfo | null;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  createdAt: string;
}
