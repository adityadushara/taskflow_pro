'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TaskStatus } from '@/types';
import {
  CircleDot,
  Clock,
  CheckCircle2,
  ChevronDown,
  Check,
} from 'lucide-react';

interface StatusDropdownProps {
  status: TaskStatus;
  onChange: (newStatus: TaskStatus) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function StatusDropdown({
  status,
  onChange,
  disabled = false,
  size = 'md',
}: StatusDropdownProps) {
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
    value: TaskStatus;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    badgeBg: string;
    bgHover: string;
  }[] = [
    {
      value: 'todo',
      label: 'To Do',
      description: 'Pending execution',
      icon: <CircleDot className="w-3.5 h-3.5 text-slate-500" />,
      color: 'text-slate-800',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
      bgHover: 'hover:bg-slate-50',
    },
    {
      value: 'in_progress',
      label: 'In Progress',
      description: 'Actively being worked on',
      icon: <Clock className="w-3.5 h-3.5 text-blue-600" />,
      color: 'text-blue-900',
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-300',
      bgHover: 'hover:bg-blue-50/70',
    },
    {
      value: 'completed',
      label: 'Completed',
      description: 'Resolved and closed',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      color: 'text-emerald-900',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      bgHover: 'hover:bg-emerald-50/70',
    },
  ];

  const currentOption = options.find((o) => o.value === status) || options[0];

  const handleSelect = (newStatus: TaskStatus) => {
    if (newStatus !== status) {
      onChange(newStatus);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 rounded-xl border transition-all cursor-pointer shadow-2xs select-none ${
          size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs'
        } ${currentOption.badgeBg} font-bold ${
          isOpen
            ? 'ring-2 ring-indigo-500/25 border-indigo-400 scale-[1.02]'
            : 'hover:shadow-xs hover:brightness-98'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="shrink-0">{currentOption.icon}</span>
        <span>{currentOption.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 opacity-60 transition-transform ml-0.5 ${
            isOpen ? 'rotate-180 opacity-100' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5 animate-in fade-in zoom-in-95">
          <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Change Status
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Quick Transition</span>
          </div>

          <div className="p-1.5 space-y-1">
            {options.map((opt) => {
              const isSelected = opt.value === status;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer group ${
                    opt.bgHover
                  } ${
                    isSelected
                      ? 'bg-slate-100/90 ring-1 ring-slate-300 font-bold'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0">
                      {opt.icon}
                    </div>
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
