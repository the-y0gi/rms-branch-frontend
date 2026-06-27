"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Plus, Minus, Check, MessageSquare, ChefHat } from "lucide-react";
import {
  MenuItem,
  ModifierGroup,
  ModifierOption,
  SelectedModifier,
} from "../types";
import { usePosStore } from "../store/pos.store";

interface Props {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ModifierDrawer({ item, isOpen, onClose }: Props) {
  const { addToCart } = usePosStore();
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<
    Record<string, ModifierOption[]>
  >({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [note, setNote] = useState("");

  // Recursively initialize default selections for groups
  useEffect(() => {
    if (!item) return;
    setQuantity(1);
    setActiveIdx(0);
    setNote("");
    
    const init: Record<string, ModifierOption[]> = {};
    const initGroup = (g: ModifierGroup) => {
      if (!g || !g.options) return;
      const defs = g.options.filter((o) => o.isDefault);
      const selected = defs.length > 0
        ? defs
        : g.required && g.maxSelection === 1 && g.options.length > 0
          ? [g.options[0]]
          : [];
      init[g.id] = selected;
      
      // Recurse for nested groups of selected options
      selected.forEach((opt) => {
        if (opt.modifierGroups) {
          opt.modifierGroups.forEach(initGroup);
        }
      });
    };

    item.modifierGroups?.forEach(initGroup);
    setSelections(init);
  }, [item, isOpen]);

  const activeGroup = useMemo(
    () => item?.modifierGroups?.[activeIdx] ?? null,
    [item, activeIdx],
  );

  // Recursive memo to get all active groups based on selections
  const allActiveGroups = useMemo(() => {
    if (!item || !item.modifierGroups) return [];
    const result: ModifierGroup[] = [];
    const visited = new Set<string>();

    const collect = (groups: ModifierGroup[]) => {
      groups.forEach((g) => {
        if (!g || visited.has(g.id)) return;
        visited.add(g.id);
        result.push(g);

        const selectedOpts = selections[g.id] ?? [];
        selectedOpts.forEach((opt) => {
          if (opt.modifierGroups && opt.modifierGroups.length > 0) {
            collect(opt.modifierGroups);
          }
        });
      });
    };

    collect(item.modifierGroups);
    return result;
  }, [item, selections]);

  if (!isOpen || !item) return null;

  const toggle = (g: ModifierGroup, opt: ModifierOption) => {
    const cur = selections[g.id] ?? [];
    const has = cur.some((o) => o.id === opt.id);
    let next: ModifierOption[];
    
    if (g.maxSelection === 1) {
      next = has && !g.required ? [] : [opt];
    } else if (has) {
      next = cur.filter((o) => o.id !== opt.id);
    } else if (cur.length < g.maxSelection) {
      next = [...cur, opt];
    } else return;

    const newSelections = { ...selections, [g.id]: next };

    // Recursively initialize default sub-groups for new selections if not present
    const initNested = (o: ModifierOption) => {
      if (o.modifierGroups) {
        o.modifierGroups.forEach((subG) => {
          if (newSelections[subG.id] === undefined) {
            const defs = subG.options.filter((so) => so.isDefault);
            newSelections[subG.id] = defs.length > 0
              ? defs
              : subG.required && subG.maxSelection === 1 && subG.options.length > 0
                ? [subG.options[0]]
                : [];
            newSelections[subG.id].forEach(initNested);
          }
        });
      }
    };

    next.forEach(initNested);
    setSelections(newSelections);
  };

  const valid = () =>
    allActiveGroups.every((g) => {
      const n = (selections[g.id] ?? []).length;
      return n >= g.minSelection && n <= g.maxSelection;
    });

  const livePrice = () => {
    let modSum = 0;
    allActiveGroups.forEach((g) => {
      const selectedOpts = selections[g.id] ?? [];
      selectedOpts.forEach((o) => {
        modSum += o.price;
      });
    });
    return (item.price + modSum) * quantity;
  };

  const handleAdd = () => {
    if (!valid()) return;
    const mods: SelectedModifier[] = [];
    allActiveGroups.forEach((g) => {
      const isRoot = item.modifierGroups?.some((rg) => rg.id === g.id) ?? false;
      const opts = selections[g.id] ?? [];
      opts.forEach((o) => {
        mods.push({
          groupId: g.id,
          groupName: g.name,
          optionId: o.id,
          optionName: o.name,
          price: o.price,
          isRoot,
        });
      });
    });
    addToCart(item, mods, quantity, note);
    onClose();
  };

  const isSelected = (gid: string, oid: string) =>
    (selections[gid] ?? []).some((o) => o.id === oid);

  //modifier groups (including child groups)
  const renderModifierGroup = (g: ModifierGroup, pathName: string = "") => {
    const isRoot = item.modifierGroups?.some((rg) => rg.id === g.id);
    const displayName = pathName ? `${pathName} › ${g.name}` : g.name;
    const selectedCount = (selections[g.id] ?? []).length;

    return (
      <div
        key={g.id}
        className={`space-y-3 ${
          !isRoot
            ? "mt-4 p-4 rounded-xl border border-dashed border-orange-200 bg-orange-50/20 pl-4 border-l-4 border-l-brand-primary"
            : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
          <div>
            <h4
              className={`font-700 uppercase tracking-wide ${
                isRoot ? "text-[10px] text-neutral-700" : "text-[9.5px] text-brand-primary"
              }`}
            >
              {displayName}
              {g.required && <span className="text-red-500 ml-1 font-bold">*</span>}
            </h4>
            {!isRoot && (
              <p className="text-[8px] text-neutral-400 font-medium">
                Nested Modifier Choice
              </p>
            )}
          </div>
          <span className="text-[9px] font-600 text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
            {selectedCount} / {g.maxSelection === 1 ? "1" : g.maxSelection} Selected
          </span>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-2">
          {g.options.map((opt) => {
            const sel = isSelected(g.id, opt.id);
            const isCard = g.displayType === "card";
            return (
              <div key={opt.id} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggle(g, opt)}
                  className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98] w-full ${
                    sel
                      ? "border-brand-primary bg-orange-50 ring-1 ring-brand-primary"
                      : "border-neutral-200 bg-white hover:bg-neutral-50"
                  }`}
                >
                  {/* Left selection circle/square for list types */}
                  {!isCard && (
                    <div
                      className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-all ${
                        g.displayType === "radio" || g.maxSelection === 1 ? "rounded-full" : "rounded"
                      } ${
                        sel ? "bg-brand-primary border-brand-primary text-white" : "border-neutral-300 bg-white"
                      }`}
                    >
                      {sel && <Check size={9} strokeWidth={3} />}
                    </div>
                  )}

                  {/* Thumbnail Image for Cards Grid only */}
                  {isCard && (
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-150 flex-shrink-0">
                      <img
                        src={
                          opt.image ||
                          item.image ||
                          "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=60"
                        }
                        alt={opt.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=60";
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-[10px] font-600 text-neutral-800 truncate">
                      {opt.name}
                    </p>
                    {opt.price > 0 && (
                      <p className="text-[9px] font-700 text-brand-primary">
                        +${opt.price.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Right selection indicator for Cards Grid */}
                  {isCard && (
                    <div
                      className={`absolute top-2.5 right-2.5 w-4 h-4 border flex items-center justify-center transition-all ${
                        g.maxSelection === 1 ? "rounded-full" : "rounded"
                      } ${
                        sel ? "bg-brand-primary border-brand-primary text-white" : "border-neutral-300"
                      }`}
                    >
                      {sel && <Check size={9} strokeWidth={3} />}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/*child groups for selected options in this group */}
        {g.options.map((opt) => {
          const sel = isSelected(g.id, opt.id);
          if (sel && opt.modifierGroups && opt.modifierGroups.length > 0) {
            return (
              <div key={`child-of-${opt.id}`} className="space-y-3">
                {opt.modifierGroups.map((childG) =>
                  renderModifierGroup(
                    childG,
                    isRoot ? opt.name : `${pathName} › ${opt.name}`
                  )
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-3xl bg-white rounded-l-2xl overflow-hidden shadow-2xl flex z-10 animate-drawer-slide-in">
        {/* ── LEFT */}
        <div className="w-[63%] flex flex-col bg-white border-r border-neutral-100">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center">
                <ChefHat size={14} className="text-brand-primary" />
              </div>
              <div>
                <p className="text-[10px] font-600 text-neutral-400 uppercase tracking-widest">
                  Customise
                </p>
                <h3 className="text-[13px] font-700 text-neutral-900 leading-tight">
                  {item.name}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-500 text-neutral-400">
                Step {activeIdx + 1} / {item.modifierGroups?.length}
              </span>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Group Tabs */}
          <div className="flex flex-wrap gap-1.5 px-5 pt-3 pb-2 flex-shrink-0">
            {item.modifierGroups?.map((g, i) => {
              const active = i === activeIdx;
              const count = (selections[g.id] ?? []).length;
              return (
                <button
                  key={g.id}
                  onClick={() => setActiveIdx(i)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-600 transition-all cursor-pointer active:scale-95 ${
                    active
                      ? "bg-brand-primary border-brand-primary text-white"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {g.name}
                  {count > 0 ? (
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded-full font-700 ${
                        active ? "bg-white/25 text-white" : "bg-brand-primary/10 text-brand-primary"
                      }`}
                    >
                      {count}
                    </span>
                  ) : (
                    g.required && (
                      <span className="text-brand-primary text-[10px] ml-0.5">
                        *
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </div>

          {/* Option Grid */}
          <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
            {activeGroup && renderModifierGroup(activeGroup)}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-100 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-lg text-[10px] font-600 hover:bg-neutral-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
                disabled={activeIdx === 0}
                className={`px-3 py-2 rounded-lg border text-[10px] font-600 transition-all cursor-pointer ${
                  activeIdx === 0
                    ? "border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                Back
              </button>
              <button
                onClick={() =>
                  setActiveIdx(
                    Math.min((item.modifierGroups?.length ?? 1) - 1, activeIdx + 1)
                  )
                }
                disabled={activeIdx === (item.modifierGroups?.length ?? 1) - 1}
                className={`px-3 py-2 rounded-lg border text-[10px] font-600 transition-all cursor-pointer ${
                  activeIdx === (item.modifierGroups?.length ?? 1) - 1
                    ? "border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="w-[37%] flex flex-col bg-neutral-50 px-5 py-5 justify-between overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 space-y-4 mb-4">
            {/* Item info */}
            <div className="pb-3 border-b border-neutral-200 flex-shrink-0">
              <p className="text-[9px] font-600 text-neutral-400 uppercase tracking-widest">
                Base Price
              </p>
              <p className="text-[15px] font-800 text-neutral-900 leading-tight mt-0.5">
                ${item.price.toFixed(2)}
              </p>
            </div>

            {/* Selected choices */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2.5 pr-1">
              <p className="text-[9px] font-700 text-neutral-400 uppercase tracking-widest sticky top-0 bg-neutral-50 pb-1 flex items-center justify-between">
                <span>Selected Choices</span>
                <span className="bg-brand-primary-light text-brand-primary px-1.5 py-0.5 rounded-full text-[8px] font-800 ml-2">
                  {allActiveGroups.reduce(
                    (acc, g) => acc + (selections[g.id] ?? []).length,
                    0
                  )}
                </span>
              </p>
              {allActiveGroups.map((g) => {
                const opts = selections[g.id] ?? [];
                if (!opts.length) return null;
                return (
                  <div key={g.id}>
                    <p className="text-[8.5px] font-600 text-neutral-400 uppercase tracking-wide mb-1">
                      {g.name}
                    </p>
                    {opts.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center gap-1 text-brand-primary"
                      >
                        <span className="text-[9px]">→</span>
                        <span className="text-[10px] font-600">{o.name}</span>
                        {o.price > 0 && (
                          <span className="text-[9px] text-neutral-400 ml-auto">
                            +${o.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
              {allActiveGroups.reduce(
                (acc, g) => acc + (selections[g.id] ?? []).length,
                0
              ) === 0 && (
                <p className="text-[9.5px] text-neutral-400 italic">
                  No choices selected yet.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* Note */}
            <div>
              <label className="flex items-center gap-1 text-[9px] font-600 text-neutral-400 uppercase tracking-wider mb-1">
                <MessageSquare size={9} />
                Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Special instructions..."
                rows={2}
                className="w-full bg-white border border-neutral-200 rounded-lg p-2 text-[10px] text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 resize-none transition-all"
              />
            </div>

            {/* Qty */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-600 text-neutral-700">Qty</span>
              <div className="flex items-center gap-2 border border-neutral-200 bg-white rounded-lg px-2 py-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="text-neutral-500 hover:text-brand-primary transition-colors cursor-pointer"
                >
                  <Minus size={11} />
                </button>
                <span className="text-[11px] font-700 text-neutral-800 w-4 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="text-neutral-500 hover:text-brand-primary transition-colors cursor-pointer"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleAdd}
              disabled={!valid()}
              className={`w-full py-3 rounded-xl text-[11px] font-700 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer ${
                valid()
                  ? "bg-brand-primary text-white hover:bg-brand-primary-hover shadow-md shadow-brand-primary/20"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none"
              }`}
            >
              Add to Cart&nbsp;·&nbsp;${livePrice().toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
