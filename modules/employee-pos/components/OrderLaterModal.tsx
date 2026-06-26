'use client';

import React, { useState } from 'react';
import { X, Calendar, Clock } from 'lucide-react';

interface OrderLaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scheduledAt: string) => void;
}

function getNextDays(count: number) {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDayLabel(date: Date, index: number) {
  if (index === 0) return 'Today';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function generateTimeSlots() {
  const slots: string[] = [];
  for (let h = 9; h <= 23; h++) {
    for (const m of [0, 30]) {
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const label = `${String(hour12).padStart(2, '0')}:${m === 0 ? '00' : '30'} ${ampm}`;
      slots.push(label);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

export default function OrderLaterModal({ isOpen, onClose, onConfirm }: OrderLaterModalProps) {
  const days = getNextDays(7);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[2]); // default 10:00 AM

  if (!isOpen) return null;

  const handleConfirm = () => {
    const selectedDay = days[selectedDayIndex];
    // Parse time
    const [time, period] = selectedTime.split(' ');
    const [h, m] = time.split(':').map(Number);
    let hour = h;
    if (period === 'PM' && h !== 12) hour = h + 12;
    if (period === 'AM' && h === 12) hour = 0;

    const scheduled = new Date(selectedDay);
    scheduled.setHours(hour, m, 0, 0);
    onConfirm(scheduled.toISOString());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-up overflow-hidden">
        {/* Header */}
        <div className="bg-brand-primary px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-white" />
            <h3 className="text-[13px] font-700 text-white uppercase tracking-wide">Day & Hour of Pickup</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-all cursor-pointer"
          >
            <X size={14} className="text-white" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-[11px] text-neutral-500 text-center font-500">Day & hours of pickup</p>

          {/* Day & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Day Selector */}
            <div>
              <label className="block text-[10px] font-600 text-neutral-600 mb-1.5 uppercase tracking-wide">
                <Calendar size={9} className="inline mr-1" />Day
              </label>
              <div className="relative">
                <select
                  value={selectedDayIndex}
                  onChange={(e) => setSelectedDayIndex(Number(e.target.value))}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-[11px] font-500 text-neutral-800 bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 appearance-none cursor-pointer"
                >
                  {days.map((d, i) => (
                    <option key={i} value={i}>
                      {formatDayLabel(d, i)}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1L5 5L9 1" stroke="#78716C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Time Selector */}
            <div>
              <label className="block text-[10px] font-600 text-neutral-600 mb-1.5 uppercase tracking-wide">
                <Clock size={9} className="inline mr-1" />Time
              </label>
              <div className="relative">
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-[11px] font-500 text-neutral-800 bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 appearance-none cursor-pointer"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1L5 5L9 1" stroke="#78716C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
            <p className="text-[10px] text-neutral-500 font-500">Scheduled for</p>
            <p className="text-[13px] font-700 text-brand-primary mt-0.5">
              {formatDayLabel(days[selectedDayIndex], selectedDayIndex)}, {selectedTime}
            </p>
            <p className="text-[9px] text-neutral-400 mt-0.5">This order will be prioritized in the queue at the scheduled time</p>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-[12px] font-700 transition-all active:scale-[0.99] cursor-pointer shadow-sm"
          >
            Confirm Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
