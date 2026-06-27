"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Order } from "../types";

interface KitchenOrderCardProps {
  order: Order;
  onClick: () => void;
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

export default function KitchenOrderCard({
  order,
  onClick,
}: KitchenOrderCardProps) {
  const [elapsedMins, setElapsedMins] = useState(0);

  useEffect(() => {
    const updateElapsed = () => {
      const createdTime = new Date(order.createdAt).getTime();
      const diffMs = Date.now() - createdTime;
      const diffMins = Math.max(0, Math.floor(diffMs / 60000));
      setElapsedMins(diffMins);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const isUnpaid = order.paymentStatus === "unpaid";
  const isDraft = order.orderNumber === "#DRAFT";

  const formattedType =
    {
      takeout: "Take-Out",
      "drive-through": "Drive-Through",
      "dine-in": "Dine-In",
      delivery: "Delivery",
    }[order.orderType] || order.orderType;

  // Header background: brand-dark charcoal for placed, dark amber for draft
  const headerBg = isDraft ? "bg-[#D97706]" : "bg-[#1E1B18]";

  return (
    <div
      onClick={onClick}
      className={`flex flex-col rounded-xl shadow-md border border-neutral-200 overflow-hidden cursor-pointer bg-white hover:shadow-lg transition-all duration-200 select-none ${
        isDraft ? "border-dashed border-amber-400 bg-amber-50/20" : ""
      }`}
    >
      {/* ── Ticket Header ── */}
      <div
        className={`px-4 py-2.5 flex items-center justify-between text-white ${headerBg} font-sans`}
      >
        <span className="font-900 text-[13.5px] tracking-wide uppercase">
          {order.orderNumber}
        </span>
        <div className="flex flex-col text-right leading-none gap-0.5">
          <span className="font-855 text-[11px] uppercase tracking-wider text-brand-primary-muted">
            {formattedType}
          </span>
          <span className="font-700 text-[10.5px] opacity-90 text-neutral-300">
            {new Date(order.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* ── Ticket Body (Items List) ── */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-4 font-sans min-h-[160px]">
        <div className="flex flex-col gap-3">
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="text-[12px] leading-tight pb-2 border-b border-neutral-100 last:border-b-0"
            >
              {/* Item Title & Qty */}
              <div className="flex justify-between items-start">
                <span className="text-brand-primary font-800 text-[13px] tracking-tight">
                  {item.name}
                </span>
                <span className="text-neutral-900 font-900 text-[13px] ml-2">
                  {item.quantity}
                </span>
              </div>

              {/* Modifiers */}
              {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                <div className="pl-2 mt-1 flex flex-col gap-0.5 border-l border-neutral-200">
                  {getGroupedModifiers(item.selectedModifiers).map(
                    (mod, modIdx) => (
                      <div
                        key={modIdx}
                        className="flex flex-col text-[11px] leading-tight"
                      >
                        {mod.isRoot ? (
                          <>
                            <span className="text-neutral-500 font-800 text-[9.5px] uppercase tracking-wider mt-1 select-none">
                              {mod.groupName}
                            </span>
                            <div className="flex justify-between items-baseline text-neutral-800 font-650 pl-0.5">
                              <span>{mod.optionName}</span>
                              {mod.quantity > 1 && (
                                <span className="font-800 text-neutral-900 ml-1">
                                  {mod.quantity}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between items-baseline text-neutral-500 font-550 pl-3 italic">
                            <span>{mod.optionName}</span>
                            {mod.quantity > 1 && (
                              <span className="font-700 text-neutral-600 ml-1">
                                {mod.quantity}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}

              {/* Custom Note */}
              {item.note && (
                <p className="text-[10px] text-amber-700 font-650 italic mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50">
                  Note: {item.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Ticket Jagged Tear Separator ── */}
      <div className="relative h-1 bg-transparent border-t border-dashed border-neutral-250 mx-4" />

      {/* ── Ticket Footer ── */}
      <div className="px-4 py-3 bg-neutral-50 flex flex-col gap-1 text-[11.5px] font-sans select-none border-t border-neutral-100">
        {/* Row 1: Status & Price */}
        <div className="flex justify-between items-center">
          <span className="text-[#1E40AF] font-800 uppercase tracking-wide">
            {isDraft
              ? "POS Drafting"
              : order.status === "pending"
                ? "Order Confirmed"
                : order.status === "preparing"
                  ? "In Preparing"
                  : order.orderType === "delivery"
                    ? "Ready For Delivery"
                    : "Ready For Pickup"}
          </span>
          <span className="font-900 text-[#16A34A] text-[13.5px]">
            ${order.total.toFixed(2)}
          </span>
        </div>
        {/* Row 2: Payment & Elapsed Time */}
        <div className="flex justify-between items-center text-[10.5px]">
          <span
            className={`font-900 uppercase tracking-wider ${isUnpaid ? "text-[#DC2626]" : "text-[#16A34A]"}`}
          >
            {isUnpaid ? "Unpaid" : "Paid"}
          </span>
          {!isDraft && (
            <span className="text-neutral-450 font-800">
              {elapsedMins} Min{elapsedMins !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
