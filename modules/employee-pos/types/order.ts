import { CartItem } from "./cart";

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
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
  status: "available" | "occupied" | "reserved";
}

export interface SplitPayment {
  method: "cash" | "card" | "credit" | "debit";
  amount: number;
  personName?: string;
  cashGiven?: number;
  changeGiven?: number;
}

export interface PromoApplied {
  code: string;
  description: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  discountAmount: number;
}

export interface Order {
  _id?: string;
  orderNumber: string;
  orderType: "takeout" | "delivery" | "drive-through" | "dine-in";
  orderSource: "pos" | "online";
  table: TableInfo | null;
  customer: CustomerInfo | null;
  vehicle: VehicleInfo | null;
  items: CartItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  discount: number;
  discountType: "none" | "promo" | "percentage" | "flat";
  promoCode: string;
  total: number;
  // Payment
  paymentTiming: "pay-now" | "pay-later";
  paymentType: "one-time" | "split";
  paymentStatus: "paid" | "unpaid";
  payments: SplitPayment[];
  // Scheduling
  orderTiming: "now" | "later";
  scheduledAt: string | null;
  dueAt?: string | null;
  notes: string;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  statusHistory?: Array<{ status: string; changedAt: string; note?: string }>;
  createdAt: string;
}
