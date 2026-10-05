import React from 'react';
import { TaskPriority } from '@/types';
import { AlertCircle, AlertTriangle, ArrowDown, Flame } from 'lucide-react';

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

export function PriorityBadge({ priority, className = '' }: PriorityBadgeProps) {
  const configs: Record<TaskPriority, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
    low: {
      label: 'Low',
      icon: <ArrowDown className="w-3 h-3" />,
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-200',
    },
    medium: {
      label: 'Medium',
      icon: <AlertCircle className="w-3 h-3" />,
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
    },
    high: {
      label: 'High',
      icon: <AlertTriangle className="w-3 h-3" />,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
    },
    urgent: {
      label: 'Urgent',
      icon: <Flame className="w-3 h-3" />,
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
    },
  };

  const config = configs[priority] || configs.medium;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
