'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';

interface DateTimePickerProps {
  value: string; // ISO string or 'YYYY-MM-DDTHH:mm'
  onChange: (value: string) => void;
  label?: string;
  error?: string;
}

export function DateTimePicker({
  value,
  onChange,
  label = 'Due Date & Time',
  error,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial selected date
  const parsedDate = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  // Current calendar view month and year
  const [viewDate, setViewDate] = useState<Date>(() => parsedDate || new Date());

  // Selected time (hours:minutes)
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    if (parsedDate) {
      const h = String(parsedDate.getHours()).padStart(2, '0');
      const m = String(parsedDate.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
    return '18:00'; // Default: 6:00 PM End of Day
  });

  // Sync viewDate when value changes externally
  useEffect(() => {
    if (parsedDate) {
      setViewDate(parsedDate);
      const h = String(parsedDate.getHours()).padStart(2, '0');
      const m = String(parsedDate.getMinutes()).padStart(2, '0');
      setSelectedTime(`${h}:${m}`);
    }
  }, [parsedDate]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calendar math
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday

  // Month navigation
  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  // Build formatted string from a specific day and time
  const applyDateChange = (targetDate: Date, timeStr: string) => {
    const [hh, mm] = timeStr.split(':').map(Number);
    const result = new Date(targetDate);
    result.setHours(hh !== undefined ? hh : 18, mm !== undefined ? mm : 0, 0, 0);

    const yearStr = result.getFullYear();
    const monthStr = String(result.getMonth() + 1).padStart(2, '0');
    const dayStr = String(result.getDate()).padStart(2, '0');
    const hoursStr = String(result.getHours()).padStart(2, '0');
    const minutesStr = String(result.getMinutes()).padStart(2, '0');

    onChange(`${yearStr}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}`);
  };

  // Day selection click
  const handleSelectDay = (day: number) => {
    const newDate = new Date(year, month, day);
    applyDateChange(newDate, selectedTime);
  };

  // Time change
  const handleTimeChange = (newTime: string) => {
    setSelectedTime(newTime);
    if (parsedDate) {
      applyDateChange(parsedDate, newTime);
    } else {
      applyDateChange(new Date(), newTime);
    }
  };

  // Quick Preset Handlers (1-Click selection)
  const setPresetToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    setSelectedTime('18:00');
    applyDateChange(today, '18:00');
    setIsOpen(false);
  };

  const setPresetTomorrow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedTime('18:00');
    applyDateChange(tomorrow, '18:00');
    setIsOpen(false);
  };

  const setPresetFriday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = (5 - dayOfWeek + 7) % 7 || 7;
    const friday = new Date();
    friday.setDate(now.getDate() + diff);
    setSelectedTime('18:00');
    applyDateChange(friday, '18:00');
    setIsOpen(false);
  };

  const setPresetNextWeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = (1 - dayOfWeek + 7) % 7 || 7;
    const monday = new Date();
    monday.setDate(now.getDate() + diff);
    setSelectedTime('10:00');
    applyDateChange(monday, '10:00');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Friendly display formatted string
  const displayString = useMemo(() => {
    if (!parsedDate) return '';
    const now = new Date();
    const isToday =
      parsedDate.getDate() === now.getDate() &&
      parsedDate.getMonth() === now.getMonth() &&
      parsedDate.getFullYear() === now.getFullYear();

    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow =
      parsedDate.getDate() === tomorrow.getDate() &&
      parsedDate.getMonth() === tomorrow.getMonth() &&
      parsedDate.getFullYear() === tomorrow.getFullYear();

    const timeFormatted = parsedDate.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    if (isToday) return `Today at ${timeFormatted}`;
    if (isTomorrow) return `Tomorrow at ${timeFormatted}`;

    return `${parsedDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: parsedDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })} at ${timeFormatted}`;
  }, [parsedDate]);

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-800 tracking-wide">
            {label}
          </label>
          <span className="text-[11px] text-slate-400 font-medium">1-Click Presets & Time</span>
        </div>
      )}

      {/* Input Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs select-none ${
          parsedDate
            ? 'border-indigo-200 bg-indigo-50/50 text-slate-900'
            : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'
        } ${isOpen ? 'ring-3 ring-indigo-500/15 border-indigo-600' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              parsedDate ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>

          <span className="text-xs font-bold truncate">
            {displayString || 'Select due date & time...'}
          </span>
        </div>

        {parsedDate ? (
          <button
            type="button"
            onClick={handleClear}
            title="Clear due date"
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
            Pick
          </span>
        )}
      </div>

      {/* Outside Quick Preset Chips (Direct 1-Click Selection without opening popover) */}
      {!parsedDate && (
        <div className="pt-1">
          <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Quick presets:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={setPresetToday}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] font-semibold transition-all border border-slate-200/70 hover:border-indigo-200 cursor-pointer"
            >
              Today (6 PM)
            </button>
            <button
              type="button"
              onClick={setPresetTomorrow}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] font-semibold transition-all border border-slate-200/70 hover:border-indigo-200 cursor-pointer"
            >
              Tomorrow (6 PM)
            </button>
            <button
              type="button"
              onClick={setPresetFriday}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] font-semibold transition-all border border-slate-200/70 hover:border-indigo-200 cursor-pointer"
            >
              This Friday
            </button>
            <button
              type="button"
              onClick={setPresetNextWeek}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] font-semibold transition-all border border-slate-200/70 hover:border-indigo-200 cursor-pointer"
            >
              Next Week (Mon)
            </button>
          </div>
        </div>
      )}

      {/* Floating Popover Picker */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 sm:right-auto sm:w-80 mt-1.5 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
          {/* Month / Year Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-800">
              {monthNames[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((wd) => (
              <span key={wd} className="text-[10px] font-bold text-slate-400">
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected =
                parsedDate &&
                parsedDate.getDate() === dayNum &&
                parsedDate.getMonth() === month &&
                parsedDate.getFullYear() === year;

              const isToday =
                new Date().getDate() === dayNum &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-7 w-7 mx-auto rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                      : isToday
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300 font-extrabold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Time Selector Row */}
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Target Time</span>
              </span>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="px-2 py-0.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
              />
            </div>

            {/* Fast Time Pills */}
            <div className="flex flex-wrap gap-1">
              {[
                { label: '9 AM', time: '09:00' },
                { label: '1 PM', time: '13:00' },
                { label: '6 PM', time: '18:00' },
                { label: 'End of Day', time: '23:59' },
              ].map((t) => (
                <button
                  key={t.time}
                  type="button"
                  onClick={() => handleTimeChange(t.time)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                    selectedTime === t.time
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-2xs transition-all cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
}
