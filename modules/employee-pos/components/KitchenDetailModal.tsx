"use client";

import React, { useState, useEffect } from "react";
import { X, Clock, Printer, Trash2, Plus, Minus } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { Order } from "../types";

interface KitchenDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onStatusChange: () => void;
}

interface GroupedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
  isRoot: boolean;
  quantity: number;
}

const getGroupedModifiers = (modifiers: any[]): GroupedModifier[] => {
  if (!modifiers) return [];
  const grouped: GroupedModifier[] = [];
  modifiers.forEach((mod) => {
    const isRootVal =
      mod.isRoot !== undefined
        ? mod.isRoot
        : !(
            mod.groupName?.toLowerCase().includes("mix") ||
            mod.groupName?.toLowerCase().includes("white & dark")
          );

    const existing = grouped.find(
      (g) => g.groupId === mod.groupId && g.optionId === mod.optionId,
    );
    if (existing) {
      existing.quantity += 1;
    } else {
      grouped.push({
        groupId: mod.groupId,
        groupName: mod.groupName,
        optionId: mod.optionId,
        optionName: mod.optionName,
        price: mod.price,
        isRoot: isRootVal,
        quantity: 1,
      });
    }
  });
  return grouped;
};

export default function KitchenDetailModal({
  order,
  onClose,
  onStatusChange,
}: KitchenDetailModalProps) {
  const [updating, setUpdating] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [localOrder, setLocalOrder] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<any[]>([]);

  useEffect(() => {
    setLocalOrder(order);
  }, [order]);

  // Initialize due date based on database order data (dueAt or createdAt)
  useEffect(() => {
    if (localOrder) {
      const baseTime = localOrder.dueAt
        ? new Date(localOrder.dueAt)
        : localOrder.scheduledAt
          ? new Date(localOrder.scheduledAt)
          : new Date(localOrder.createdAt);

      // If it has no dueAt (older order), default it to baseTime + 15 mins
      const currentDue = localOrder.dueAt
        ? baseTime
        : new Date(baseTime.getTime() + 15 * 60000);
      setDueDate(currentDue);
    } else {
      setDueDate(null);
    }
  }, [localOrder]);

  if (!localOrder) return null;

  const isDraft = localOrder.orderNumber === "#DRAFT";

  // Handle due time adjustments (- 5 mins / + 5 mins) and save to database
  const adjustDueTime = async (mins: number) => {
    if (isDraft || !dueDate || !localOrder) return;
    const newDueDate = new Date(dueDate.getTime() + mins * 60000);
    setUpdating(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.patch(
        `${apiUrl}/orders/${localOrder._id}/due-time`,
        { dueAt: newDueDate.toISOString() },
      );
      if (res.data.success) {
        setDueDate(newDueDate);
        setLocalOrder({
          ...localOrder,
          dueAt: newDueDate.toISOString(),
        });
        toast.success(
          `Preparation time adjusted by ${mins > 0 ? "+" : ""}${mins} minutes`,
        );
        onStatusChange(); // Reload dashboard so timer updates
      } else {
        throw new Error(res.data.message || "Time update failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to adjust due time",
      );
    } finally {
      setUpdating(false);
    }
  };

  // Status transitions
  const handleTransition = async (
    nextStatus: "preparing" | "ready" | "completed",
  ) => {
    if (isDraft || !localOrder) return;

    if (nextStatus === "completed" && localOrder.paymentStatus === "unpaid") {
      toast.error(
        "Cannot complete an unpaid order. Please collect payment and mark as Paid first.",
      );
      return;
    }

    setUpdating(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const note = `Kitchen updated status to ${nextStatus}`;
      const res = await axios.patch(
        `${apiUrl}/orders/${localOrder._id}/status`,
        { status: nextStatus, note },
      );

      if (res.data.success) {
        const readyText =
          localOrder.orderType === "delivery"
            ? "Ready for Delivery"
            : "Ready for Pickup";
        toast.success(
          `Order transitioned to ${nextStatus === "preparing" ? "Preparing" : nextStatus === "ready" ? readyText : "Completed"}`,
        );

        // Update local status and history
        const updatedHistory = [...(localOrder.statusHistory || [])];
        updatedHistory.push({
          status: nextStatus,
          changedAt: new Date().toISOString(),
          note,
        });

        setLocalOrder({
          ...localOrder,
          status: nextStatus,
          statusHistory: updatedHistory,
        });

        onStatusChange();

        if (nextStatus === "completed") {
          onClose();
        }
      } else {
        throw new Error(res.data.message || "Transition failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to update order status",
      );
    } finally {
      setUpdating(false);
    }
  };

  // Mark unpaid order as paid
  const executeMarkAsPaid = async () => {
    setUpdating(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const payload = {
        payments: [
          {
            method: "cash" as const,
            amount: unpaidBalance,
            cashGiven: unpaidBalance,
            changeGiven: 0,
          },
        ],
      };
      const res = await axios.patch(
        `${apiUrl}/orders/${localOrder._id}/payment`,
        payload,
      );
      if (res.data.success) {
        toast.success(
          `Order ${localOrder.orderNumber} payment difference of $${unpaidBalance.toFixed(2)} marked as PAID!`,
        );

        setLocalOrder({
          ...localOrder,
          paymentStatus: "paid",
          paymentTiming: "pay-now",
          payments: [...(localOrder.payments || []), ...payload.payments],
        });

        onStatusChange();
      } else {
        throw new Error(res.data.message || "Payment update failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to update payment status",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAsPaid = () => {
    if (isDraft || !localOrder) return;

    toast(
      (t) => (
        <div className="flex flex-col gap-2 p-1.5 min-w-[220px]">
          <p className="text-[11px] font-700 text-neutral-800 uppercase tracking-wide">
            Confirm Payment
          </p>
          <p className="text-[10px] text-neutral-500 font-500">
            Are you sure you want to mark order {localOrder.orderNumber} as
            PAID?
          </p>
          <div className="flex justify-end gap-2 mt-1.5">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[10px] font-700 transition-all cursor-pointer border border-neutral-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeMarkAsPaid();
              }}
              className="px-2.5 py-1 rounded bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] font-700 transition-all cursor-pointer"
            >
              Yes, Paid
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
      },
    );
  };

  // ── Reorder Order (Kitchen side clone) ───────────────────────
  const executeReorder = async () => {
    if (isDraft || !localOrder) return;
    setUpdating(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

      const payload = {
        orderType: localOrder.orderType,
        orderSource: localOrder.orderSource || "pos",
        items: localOrder.items.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          image: item.image || "",
          basePrice: item.basePrice,
          selectedModifiers: item.selectedModifiers || [],
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          note: item.note || "",
        })),
        subtotal: localOrder.subtotal,
        taxRate: localOrder.taxRate || 0.05,
        tax: localOrder.tax,
        discount: localOrder.discount || 0,
        discountType: localOrder.discountType || "none",
        promoCode: localOrder.promoCode || "",
        total: localOrder.total,
        paymentTiming: "pay-later", // starts unpaid
        paymentType: "one-time",
        payments: [],
        orderTiming: "now",
        scheduledAt: null,
        customer: localOrder.customer || {
          name: "No Name",
          phone: "",
          email: "",
        },
        notes:
          `Reordered from #${localOrder.orderNumber}. ${localOrder.notes || ""}`.trim(),
      };

      const res = await axios.post(`${apiUrl}/orders`, payload);
      if (res.data.success) {
        toast.success(
          `Order ${localOrder.orderNumber} reordered successfully as #${res.data.data.orderNumber}!`,
        );
        onStatusChange();
        onClose();
      } else {
        throw new Error(res.data.message || "Reorder failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to reorder",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleReorder = () => {
    if (isDraft || !localOrder) return;

    toast(
      (t) => (
        <div className="flex flex-col gap-2 p-1.5 min-w-[220px]">
          <p className="text-[11px] font-700 text-neutral-800 uppercase tracking-wide">
            Confirm Reorder
          </p>
          <p className="text-[10px] text-neutral-500 font-500">
            Are you sure you want to REORDER / duplicate order{" "}
            {localOrder.orderNumber}?
          </p>
          <div className="flex justify-end gap-2 mt-1.5">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[10px] font-700 transition-all cursor-pointer border border-neutral-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeReorder();
              }}
              className="px-2.5 py-1 rounded bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] font-700 transition-all cursor-pointer"
            >
              Yes, Reorder
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
      },
    );
  };

  // ── Update Order (Kitchen side edit) ─────────────────────────
  const handleStartEdit = () => {
    if (isDraft || !localOrder) return;
    setEditItems(JSON.parse(JSON.stringify(localOrder.items)));
    setIsEditing(true);
  };

  const handleUpdateQty = (idx: number, change: number) => {
    const copy = [...editItems];
    const newQty = Math.max(1, copy[idx].quantity + change);
    copy[idx].quantity = newQty;
    copy[idx].totalPrice = newQty * copy[idx].basePrice;
    setEditItems(copy);
  };

  const handleRemoveItem = (idx: number) => {
    const copy = editItems.filter((_, i) => i !== idx);
    setEditItems(copy);
  };

  const handleUpdateItemNote = (idx: number, note: string) => {
    const copy = [...editItems];
    copy[idx].note = note;
    setEditItems(copy);
  };

  const getEditTotals = () => {
    const subtotal = editItems.reduce(
      (sum, item) => sum + item.quantity * item.basePrice,
      0,
    );
    const discount = localOrder.discount || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = Math.round(taxableAmount * 0.05 * 100) / 100;
    const total = Math.max(0, subtotal + tax - discount);
    return { subtotal, tax, total };
  };

  const handleSaveOrder = async () => {
    if (isDraft || !localOrder) return;
    if (editItems.length === 0) {
      toast.error(
        "Cannot save an order with 0 items. Please cancel the order instead.",
      );
      return;
    }
    setUpdating(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const { subtotal, tax, total } = getEditTotals();
      const payload = {
        items: editItems,
        subtotal,
        tax,
        total,
      };
      const res = await axios.patch(
        `${apiUrl}/orders/${localOrder._id}`,
        payload,
      );
      if (res.data.success) {
        toast.success(`Order ${localOrder.orderNumber} updated successfully.`);
        setLocalOrder({
          ...localOrder,
          items: editItems,
          subtotal,
          tax,
          total,
        });
        setIsEditing(false);
        onStatusChange();
      } else {
        throw new Error(res.data.message || "Update failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to update order",
      );
    } finally {
      setUpdating(false);
    }
  };

  // Cancel order
  const executeCancelOrder = async () => {
    setUpdating(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.delete(`${apiUrl}/orders/${localOrder._id}`);

      if (res.data.success) {
        toast.success("Order cancelled successfully.");
        onStatusChange();
        onClose();
      } else {
        throw new Error(res.data.message || "Cancellation failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to cancel order",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = () => {
    if (isDraft || !localOrder) return;

    toast(
      (t) => (
        <div className="flex flex-col gap-2 p-1.5 min-w-[220px]">
          <p className="text-[11px] font-700 text-red-600 uppercase tracking-wide">
            Confirm Cancellation
          </p>
          <p className="text-[10px] text-neutral-500 font-500">
            Are you sure you want to CANCEL order {localOrder.orderNumber}?
          </p>
          <div className="flex justify-end gap-2 mt-1.5">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[10px] font-700 transition-all cursor-pointer border border-neutral-200"
            >
              No, Keep it
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeCancelOrder();
              }}
              className="px-2.5 py-1 rounded bg-[#DC2626] hover:bg-red-700 text-white text-[10px] font-700 transition-all cursor-pointer"
            >
              Yes, Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
      },
    );
  };

  // Print mock invoice
  const handlePrintInvoice = () => {
    toast.success("Invoice print job sent to terminal printer.");
  };

  const paymentsTotal = localOrder.payments
    ? localOrder.payments.reduce((sum, p: any) => sum + p.amount, 0)
    : 0;
  const unpaidBalance = Math.max(0, localOrder.total - paymentsTotal);
  const isUnpaid =
    localOrder.paymentStatus === "unpaid" || unpaidBalance > 0.01;

  // Format type tag
  const formattedType =
    {
      takeout: "Take-Out",
      "drive-through": "Drive-Through",
      "dine-in": "Dine-In",
      delivery: "Delivery",
    }[localOrder.orderType] || localOrder.orderType;

  // Determine transition button label and color matching brand primary orange
  const renderTransitionButtons = () => {
    if (isDraft) {
      return (
        <span className="text-[12px] text-neutral-400 font-750 bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-lg select-none">
          Active POS Draft Preview
        </span>
      );
    }

    if (localOrder.status === "pending") {
      return (
        <button
          onClick={() => handleTransition("preparing")}
          disabled={updating}
          className="bg-brand-primary text-white text-[12px] font-800 px-4 py-2 rounded-full hover:bg-brand-primary-hover shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          In Preparing
        </button>
      );
    }

    if (localOrder.status === "preparing") {
      return (
        <button
          onClick={() => handleTransition("ready")}
          disabled={updating}
          className="bg-brand-primary text-white text-[12px] font-800 px-4 py-2 rounded-full hover:bg-brand-primary-hover shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {localOrder.orderType === "delivery"
            ? "Ready For Delivery"
            : "Ready For Pickup"}
        </button>
      );
    }

    if (localOrder.status === "ready") {
      return (
        <button
          onClick={() => handleTransition("completed")}
          disabled={updating}
          className="bg-success text-white text-[12px] font-800 px-4 py-2 rounded-full hover:bg-green-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          Complete Order
        </button>
      );
    }

    return null;
  };

  const getSubtotal = () => {
    return localOrder.items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-[2px] flex items-center justify-center z-[200] p-4 font-sans">
      {/* Container */}
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-scale-up border border-neutral-300">
        {/* ── Header (Charcoal brand-dark banner matching POS) ── */}
        <div className="bg-[#1E1B18] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Customer Button */}
            <button className="bg-white/10 hover:bg-white/20 text-white text-[11px] font-850 px-3.5 py-1.5 rounded-lg border border-white/15 transition-all">
              Customer: {localOrder.customer?.name || "N/A"}
            </button>
            <span className="text-[12.5px] font-700 text-neutral-300">
              Order By :{" "}
              <span className="text-white font-800">
                {localOrder.orderSource === "online"
                  ? "Online (Uber)"
                  : "Employee (Doe )"}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!isDraft && (
              <button
                onClick={handlePrintInvoice}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-[11.5px] font-800 px-3.5 py-1.5 rounded-lg border border-white/15 transition-all cursor-pointer"
              >
                <Printer size={13} />
                Print Invoice
              </button>
            )}
            <span className="bg-brand-primary text-white text-[11.5px] font-900 px-3.5 py-1.5 rounded uppercase tracking-wider select-none shadow-sm">
              {formattedType}
            </span>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/15 p-1.5 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Subheader Controls & Status Pills ── */}
        <div className="bg-[#FAF9F6] px-5 py-3.5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-900 text-neutral-850 text-[15.5px] tracking-wide uppercase">
              {localOrder.orderNumber}
            </span>

            {dueDate && (
              <div className="flex items-center gap-2 bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-lg text-[12px] font-800 text-neutral-700">
                <Clock size={13} className="text-neutral-500" />
                <span>
                  Pickup{" "}
                  {dueDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {!isDraft && (
                  <span className="text-neutral-550 font-600 font-mono">
                    (
                    {Math.max(
                      0,
                      Math.floor((dueDate.getTime() - Date.now()) / 60000),
                    )}{" "}
                    mins remaining)
                  </span>
                )}
              </div>
            )}

            {!isDraft && dueDate && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => adjustDueTime(-5)}
                  disabled={updating}
                  className="w-7 h-7 bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-900 rounded-full flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Minus size={12} />
                </button>
                <span className="text-[11.5px] font-800 text-neutral-600 px-1.5">
                  5 Mins
                </span>
                <button
                  onClick={() => adjustDueTime(5)}
                  disabled={updating}
                  className="w-7 h-7 bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-900 rounded-full flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Action Button Row */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveOrder}
                  disabled={updating || editItems.length === 0}
                  className="bg-[#16A34A] text-white text-[12px] font-800 px-4 py-2 rounded-full hover:bg-green-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={updating}
                  className="bg-neutral-500 text-white text-[12px] font-800 px-4 py-2 rounded-full hover:bg-neutral-600 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {renderTransitionButtons()}

                {/* Unpaid/Paid toggle pill */}
                {isUnpaid ? (
                  <button
                    onClick={handleMarkAsPaid}
                    disabled={updating}
                    className="px-4 py-2 rounded-full text-[12px] font-900 uppercase tracking-wide border text-[#DC2626] bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300 transition-all cursor-pointer disabled:opacity-50 font-sans shadow-sm"
                    title="Click to mark as PAID"
                  >
                    Unpaid (Click to Pay)
                  </button>
                ) : (
                  <span className="px-4 py-2 rounded-full text-[12px] font-900 select-none uppercase tracking-wide border text-[#16A34A] bg-green-50 border-green-200">
                    Paid
                  </span>
                )}

                {!isDraft && (
                  <>
                    <button
                      onClick={handleStartEdit}
                      className="bg-[#A61B1E] text-white text-[12px] font-800 px-4 py-2 rounded-full hover:bg-red-800 transition-colors shadow-sm cursor-pointer"
                    >
                      Update Order
                    </button>
                    <button
                      onClick={handleReorder}
                      className="bg-[#1E1B18] text-white text-[12px] font-800 px-4 py-2 rounded-full hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
                    >
                      Reorder
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Scrollable Body Wrapper ── */}
        <div className="flex-1 overflow-y-auto bg-[#F5F4F1] flex flex-col min-h-0">
          {/* ── Middle section (2 Columns side-by-side) ── */}
          <div className="flex flex-row p-5 gap-5 items-start">
            {/* Left Column: Items Table List */}
            <div className="w-[60%] flex flex-col">
              <div className="bg-white border border-neutral-300 rounded-xl overflow-hidden flex flex-col shadow-sm">
                {/* Brand Dark Header row from reference screenshot */}
                <div className="bg-[#1E1B18] text-white px-4 py-2.5 flex text-[11.5px] font-900 uppercase tracking-wider select-none">
                  <span className="flex-1">Items</span>
                  <span className="w-16 text-center">Qty</span>
                  <span className="w-24 text-right">Price</span>
                </div>

                <div className="flex flex-col divider-y divider-neutral-200">
                  {isEditing
                    ? editItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 border-b border-neutral-200 last:border-b-0"
                        >
                          <div className="flex items-start">
                            <div className="flex-1">
                              <h4 className="font-900 text-[13.5px] text-brand-primary leading-tight">
                                {item.name}
                              </h4>

                              {item.selectedModifiers &&
                                item.selectedModifiers.length > 0 && (
                                  <div className="pl-3 mt-1.5 border-l border-neutral-200 flex flex-col gap-1 text-[11.5px] font-sans">
                                    {getGroupedModifiers(
                                      item.selectedModifiers,
                                    ).map((mod, modIdx) => (
                                      <div
                                        key={modIdx}
                                        className="flex flex-col"
                                      >
                                        {mod.isRoot ? (
                                          <>
                                            <span className="text-neutral-500 font-800 text-[9.5px] uppercase tracking-wider mt-1 select-none">
                                              {mod.groupName}
                                            </span>
                                            <div className="flex justify-between items-baseline text-neutral-800 font-700 pl-0.5 text-[11.5px]">
                                              <span>{mod.optionName}</span>
                                              {mod.quantity > 1 && (
                                                <span className="font-850 text-neutral-900 ml-1 text-[10.5px]">
                                                  {mod.quantity}
                                                </span>
                                              )}
                                            </div>
                                          </>
                                        ) : (
                                          <div className="flex justify-between items-baseline text-neutral-500 font-600 pl-3 text-[10.5px] italic">
                                            <span>{mod.optionName}</span>
                                            {mod.quantity > 1 && (
                                              <span className="font-700 text-neutral-600 ml-1 text-[9.5px]">
                                                {mod.quantity}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                              <input
                                type="text"
                                placeholder="Add item note..."
                                value={item.note || ""}
                                onChange={(e) =>
                                  handleUpdateItemNote(idx, e.target.value)
                                }
                                className="mt-2 px-2 py-1 text-[11px] border border-neutral-200 rounded w-full focus:outline-none focus:border-brand-primary"
                              />
                            </div>

                            <div className="w-24 flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(idx, -1)}
                                className="w-6 h-6 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center font-900 text-[11.5px] text-neutral-600 transition-all border border-neutral-200"
                              >
                                -
                              </button>
                              <span className="font-800 text-[12px] min-w-[14px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(idx, 1)}
                                className="w-6 h-6 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center font-900 text-[11.5px] text-neutral-600 transition-all border border-neutral-200"
                              >
                                +
                              </button>
                            </div>

                            <div className="w-24 text-right flex items-center justify-end font-950 text-[13.5px] text-neutral-900 font-mono">
                              <span>
                                ${(item.quantity * item.basePrice).toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-all ml-2 cursor-pointer"
                                title="Remove Item"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    : localOrder.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 border-b border-neutral-200 last:border-b-0"
                        >
                          <div className="flex items-start">
                            <div className="flex-1">
                              <h4 className="font-900 text-[13.5px] text-brand-primary leading-tight">
                                {item.name}
                              </h4>

                              {item.selectedModifiers &&
                                item.selectedModifiers.length > 0 && (
                                  <div className="pl-3 mt-1.5 border-l border-neutral-200 flex flex-col gap-1 text-[11.5px] font-sans">
                                    {getGroupedModifiers(
                                      item.selectedModifiers,
                                    ).map((mod, modIdx) => (
                                      <div
                                        key={modIdx}
                                        className="flex flex-col"
                                      >
                                        {mod.isRoot ? (
                                          <>
                                            <span className="text-neutral-500 font-800 text-[9.5px] uppercase tracking-wider mt-1 select-none">
                                              {mod.groupName}
                                            </span>
                                            <div className="flex justify-between items-baseline text-neutral-800 font-700 pl-0.5 text-[11.5px]">
                                              <span>{mod.optionName}</span>
                                              {mod.quantity > 1 && (
                                                <span className="font-850 text-neutral-900 ml-1 text-[10.5px]">
                                                  {mod.quantity}
                                                </span>
                                              )}
                                            </div>
                                          </>
                                        ) : (
                                          <div className="flex justify-between items-baseline text-neutral-500 font-600 pl-3 text-[10.5px] italic">
                                            <span>{mod.optionName}</span>
                                            {mod.quantity > 1 && (
                                              <span className="font-700 text-neutral-600 ml-1 text-[9.5px]">
                                                {mod.quantity}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              {item.note && (
                                <p className="text-[11px] text-amber-700 font-600 italic mt-1.5 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50 inline-block">
                                  Note: {item.note}
                                </p>
                              )}
                            </div>

                            <div className="w-16 text-center font-800 text-[13.5px] text-neutral-800">
                              {item.quantity}
                            </div>

                            <div className="w-24 text-right font-950 text-[13.5px] text-neutral-900 font-mono">
                              ${item.totalPrice.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                </div>
              </div>
            </div>

            {/* Right Column: Invoice summary details */}
            <div className="w-[40%] flex flex-col gap-5">
              <div className="bg-white border border-neutral-250 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
                <h3 className="text-[12px] font-900 text-neutral-500 uppercase tracking-wider border-b border-neutral-250 pb-2 select-none">
                  Invoice Breakdown
                </h3>

                <div className="flex flex-col gap-2.5 text-[12px] font-750 text-neutral-600">
                  <div className="flex justify-between">
                    <span>Item Total:</span>
                    <span className="text-neutral-850 font-mono">
                      $
                      {(isEditing
                        ? editItems.reduce(
                            (sum, item) => sum + item.quantity * item.basePrice,
                            0,
                          )
                        : getSubtotal()
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span className="text-[#DC2626] font-mono">
                      -${localOrder.discount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-neutral-200 pt-2 text-neutral-850">
                    <span>Sub Total:</span>
                    <span className="font-mono">
                      $
                      {(isEditing
                        ? getEditTotals().subtotal
                        : localOrder.subtotal
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%):</span>
                    <span className="text-neutral-850 font-mono">
                      $
                      {(isEditing
                        ? getEditTotals().tax
                        : localOrder.tax
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Tax:</span>
                    <span className="text-neutral-850 font-mono">
                      $
                      {(isEditing
                        ? getEditTotals().tax
                        : localOrder.tax
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[14.5px] font-950 text-neutral-950 border-t border-neutral-200 pt-2.5">
                    <span>Grand Total:</span>
                    <span className="font-mono">
                      $
                      {(isEditing
                        ? getEditTotals().total
                        : localOrder.total
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[13.5px] font-900 text-[#DC2626] pt-1">
                    <span>Total Unpaid:</span>
                    <span className="font-mono">
                      $
                      {Math.max(
                        0,
                        (isEditing ? getEditTotals().total : localOrder.total) -
                          paymentsTotal,
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cancel Order */}
              {!isDraft &&
                localOrder.status !== "completed" &&
                localOrder.status !== "cancelled" && (
                  <button
                    onClick={handleCancelOrder}
                    disabled={updating}
                    className="w-full flex items-center justify-center gap-2 border border-red-300 hover:border-red-400 bg-red-50 hover:bg-red-100 text-[#DC2626] py-3 rounded-lg text-[13px] font-900 transition-all cursor-pointer shadow-xs"
                  >
                    <Trash2 size={14} />
                    Cancel Order
                  </button>
                )}
            </div>
          </div>

          {/* ── Bottom Section: logs and histories ── */}
          <div className="border-t border-neutral-200 bg-[#FAF9F6] p-5 flex flex-col gap-4 text-[11.5px] text-neutral-600 font-750">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order Info */}
              <div className="bg-white rounded-lg p-3.5 border border-neutral-200 shadow-2xs">
                <h4 className="text-neutral-800 font-900 mb-1.5 border-b border-neutral-200 pb-1 uppercase text-[10px] tracking-wider">
                  Order Information
                </h4>
                <div className="flex flex-col gap-1 text-neutral-600">
                  <p>
                    Order Date:{" "}
                    <span className="text-neutral-805 font-700">
                      {new Date(localOrder.createdAt).toLocaleString()}
                    </span>
                  </p>
                  <p>
                    Order Due Date:{" "}
                    <span className="text-neutral-805 font-700">
                      {dueDate ? dueDate.toLocaleString() : "N/A"}
                    </span>
                  </p>
                  <p>
                    Report Date:{" "}
                    <span className="text-neutral-805 font-700">
                      {new Date(localOrder.createdAt).toLocaleDateString()}
                    </span>
                  </p>
                  <p>
                    Order By:{" "}
                    <span className="text-neutral-805 font-700">
                      {localOrder.orderSource === "online"
                        ? "Online Source"
                        : "Employee (Doe)"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Discount History */}
              <div className="bg-white rounded-lg p-3.5 border border-neutral-200 shadow-2xs">
                <h4 className="text-neutral-800 font-900 mb-1.5 border-b border-neutral-200 pb-1 uppercase text-[10px] tracking-wider">
                  Order Discount History
                </h4>
                <div className="flex flex-col gap-1 text-neutral-600">
                  {localOrder.discount > 0 ? (
                    <>
                      <p>
                        Type:{" "}
                        <span className="text-neutral-805 font-700">
                          {localOrder.discountType}
                        </span>
                      </p>
                      {localOrder.promoCode && (
                        <p>
                          Promo Code:{" "}
                          <span className="text-neutral-805 font-700">
                            {localOrder.promoCode}
                          </span>
                        </p>
                      )}
                      <p>
                        Discount amount:{" "}
                        <span className="text-[#DC2626] font-800">
                          ${localOrder.discount.toFixed(2)}
                        </span>
                      </p>
                    </>
                  ) : (
                    <p className="text-neutral-400 italic">
                      No discount applied.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="bg-white rounded-lg p-3.5 border border-neutral-200 shadow-2xs">
              <h4 className="text-neutral-800 font-900 mb-1.5 border-b border-neutral-200 pb-1 uppercase text-[10px] tracking-wider">
                Order Payment History
              </h4>
              {localOrder.payments && localOrder.payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-neutral-200 text-neutral-400 uppercase text-[9px]">
                        <th className="py-1">Type</th>
                        <th className="py-1">Person</th>
                        <th className="py-1">Card Type</th>
                        <th className="py-1">Amount</th>
                        <th className="py-1">Cash Given</th>
                        <th className="py-1">Change Given</th>
                      </tr>
                    </thead>
                    <tbody className="text-neutral-700">
                      {localOrder.payments.map((p, pIdx) => (
                        <tr
                          key={pIdx}
                          className="border-b border-neutral-100 last:border-b-0 text-[11px]"
                        >
                          <td className="py-1.5 uppercase font-800 text-neutral-800">
                            {p.method}
                          </td>
                          <td className="py-1.5">
                            {p.personName || "Customer"}
                          </td>
                          <td className="py-1.5">
                            {p.method === "card" ? "Visa/Mastercard" : "-"}
                          </td>
                          <td className="py-1.5 font-800">
                            ${p.amount.toFixed(2)}
                          </td>
                          <td className="py-1.5">
                            ${(p.cashGiven || 0).toFixed(2)}
                          </td>
                          <td className="py-1.5">
                            ${(p.changeGiven || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-neutral-400 italic">
                  No payment record found (unpaid order).
                </p>
              )}
            </div>

            {/* Order Activity Log (Dynamic status history rendering) */}
            {!isDraft && (
              <div className="bg-white rounded-lg p-3.5 border border-neutral-200 shadow-2xs">
                <h4 className="text-neutral-800 font-900 mb-1.5 border-b border-neutral-200 pb-1 uppercase text-[10px] tracking-wider select-none">
                  Order Log History
                </h4>
                <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto pr-1">
                  <div className="flex justify-between py-1 border-b border-neutral-100 last:border-0 text-neutral-650">
                    <span>• Order Created: New order placed</span>
                    <span className="text-[10px] text-neutral-455">
                      {new Date(localOrder.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {localOrder.statusHistory &&
                  localOrder.statusHistory.length > 0
                    ? localOrder.statusHistory.map(
                        (historyItem: any, idx: number) => {
                          if (historyItem.status === "pending" && idx === 0)
                            return null;

                          const statusLabels: Record<string, string> = {
                            preparing: "In Preparing",
                            ready: "Ready For Pickup",
                            completed: "Completed",
                            cancelled: "Cancelled",
                          };
                          const label =
                            statusLabels[historyItem.status] ||
                            historyItem.status;

                          return (
                            <div
                              key={idx}
                              className="flex justify-between py-1 border-b border-neutral-100 last:border-0 text-neutral-600 font-medium animate-fade-in"
                            >
                              <span>
                                • Status Updated →{" "}
                                <span className="uppercase text-brand-primary font-850">
                                  {label}
                                </span>
                                {historyItem.note
                                  ? ` (${historyItem.note})`
                                  : ""}
                              </span>
                              <span className="text-[10px] text-neutral-455">
                                {new Date(
                                  historyItem.changedAt,
                                ).toLocaleString()}
                              </span>
                            </div>
                          );
                        },
                      )
                    : localOrder.status !== "pending" && (
                        <div className="flex justify-between py-1 border-b border-neutral-100 last:border-0 text-neutral-650">
                          <span>
                            • Status Updated →{" "}
                            <span className="uppercase text-brand-primary font-850">
                              {localOrder.status}
                            </span>
                          </span>
                          <span className="text-[10px] text-neutral-455">
                            Updated in kitchen
                          </span>
                        </div>
                      )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
