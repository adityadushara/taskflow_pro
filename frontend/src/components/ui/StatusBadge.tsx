import React from 'react';
import { TaskStatus } from '@/types';
import { CheckCircle2, Clock, CircleDot } from 'lucide-react';

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const configs: Record<TaskStatus, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
    todo: {
      label: 'To Do',
      icon: <CircleDot className="w-3 h-3" />,
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
    },
    in_progress: {
      label: 'In Progress',
      icon: <Clock className="w-3 h-3" />,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
    completed: {
      label: 'Completed',
      icon: <CheckCircle2 className="w-3 h-3" />,
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    },
  };

  const config = configs[status] || configs.todo;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
