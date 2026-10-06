'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TaskPriority } from '@/types';
import {
  ArrowDown,
  AlertCircle,
  AlertTriangle,
  Flame,
  ChevronDown,
  Check,
} from 'lucide-react';

interface PriorityDropdownProps {
  priority: TaskPriority;
  onChange: (newPriority: TaskPriority) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function PriorityDropdown({
  priority,
  onChange,
  disabled = false,
  size = 'md',
}: PriorityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: {
    value: TaskPriority;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgHover: string;
    badgeBg: string;
  }[] = [
    {
      value: 'low',
      label: 'Low',
      description: 'Minor or non-critical item',
      icon: <ArrowDown className="w-3.5 h-3.5 text-slate-500" />,
      color: 'text-slate-700',
      bgHover: 'hover:bg-slate-50',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    {
      value: 'medium',
      label: 'Medium',
      description: 'Standard operational task',
      icon: <AlertCircle className="w-3.5 h-3.5 text-sky-600" />,
      color: 'text-sky-800',
      bgHover: 'hover:bg-sky-50/70',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    {
      value: 'high',
      label: 'High',
      description: 'Urgent attention required',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
      color: 'text-amber-800',
      bgHover: 'hover:bg-amber-50/70',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      value: 'urgent',
      label: 'Urgent',
      description: 'Immediate blocker / escalation',
      icon: <Flame className="w-3.5 h-3.5 text-rose-600" />,
      color: 'text-rose-800',
      bgHover: 'hover:bg-rose-50/70',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  ];

  const currentOption = options.find((o) => o.value === priority) || options[1];

  const handleSelect = (newPriority: TaskPriority) => {
    if (newPriority !== priority) {
      onChange(newPriority);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-xl border bg-white transition-all cursor-pointer shadow-2xs select-none ${
          size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-xs'
        } ${
          isOpen
            ? 'border-indigo-600 ring-3 ring-indigo-500/15'
            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="flex items-center gap-2 font-bold text-slate-800">
          <span className="shrink-0">{currentOption.icon}</span>
          <span>{currentOption.label}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-1.5 w-full min-w-[200px] rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5 animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Select Priority
          </div>

          <div className="p-1 space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === priority;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer group ${
                    opt.bgHover
                  } ${isSelected ? 'bg-slate-100/80 font-bold' : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="shrink-0">{opt.icon}</div>
                    <div className="min-w-0">
                      <span className={`text-xs block font-bold ${opt.color}`}>
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate font-normal">
                        {opt.description}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
