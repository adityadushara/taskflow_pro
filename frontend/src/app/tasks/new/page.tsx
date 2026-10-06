'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { UserProfile, TaskPriority, Task } from '@/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { AssigneeSelector } from '@/components/ui/AssigneeSelector';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  Flame,
  AlertTriangle,
  ArrowDown,
  Clock,
  User,
} from 'lucide-react';

export default function NewTaskPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [assignedToEmail, setAssignedToEmail] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const loadUsers = async () => {
      try {
        const res = await apiClient<UserProfile[]>('/users');
        if (res.success && res.data) {
          setUsers(res.data);
        }
      } catch (err) {
        console.error('Failed to load assignable users:', err);
      }
    };

    if (user) {
      loadUsers();
    }
  }, [user, authLoading, router]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) {
      errs.title = 'Task title is required.';
    } else if (title.trim().length > 255) {
      errs.title = 'Title cannot exceed 255 characters.';
    }

    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      errs.priority = 'Please select a valid priority level.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      assigned_to: assignedTo || null,
      assigned_to_email: assignedToEmail || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    };

    try {
      const res = await apiClient<Task>('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        setSuccessMessage('Task created successfully! Redirecting to task details...');
        setTimeout(() => {
          router.push(`/tasks/${res.data?.id}`);
        }, 1000);
      } else {
        setErrorMessage(res.error?.message || 'Failed to create task. Please ensure database tables exist.');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage('Network error while communicating with backend.');
      setIsSubmitting(false);
    }
  };

  const priorityOptions: { value: TaskPriority; label: string; icon: React.ReactNode; color: string; border: string; bg: string }[] = [
    {
      value: 'low',
      label: 'Low',
      icon: <ArrowDown className="w-3.5 h-3.5" />,
      color: 'text-slate-600',
      border: 'border-slate-300',
      bg: 'bg-slate-50',
    },
    {
      value: 'medium',
      label: 'Medium',
      icon: <Clock className="w-3.5 h-3.5" />,
      color: 'text-sky-600',
      border: 'border-sky-300',
      bg: 'bg-sky-50',
    },
    {
      value: 'high',
      label: 'High',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      color: 'text-amber-600',
      border: 'border-amber-300',
      bg: 'bg-amber-50',
    },
    {
      value: 'urgent',
      label: 'Urgent',
      icon: <Flame className="w-3.5 h-3.5" />,
      color: 'text-rose-600',
      border: 'border-rose-300',
      bg: 'bg-rose-50',
    },
  ];

  return (
    <AppLayout hideCreateButton={true}>
      <div className="max-w-3xl mx-auto py-4">
        {/* Top Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors group px-3 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Dashboard</span>
          </Link>
          <span className="text-xs font-medium text-slate-400">Hairdrama Workspace</span>
        </div>

        {/* Card Wrapper */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Header Banner */}
          <div className="px-8 py-6 border-b border-slate-100 bg-linear-to-r from-slate-50/50 to-white flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 mb-2">
                <Sparkles className="w-3 h-3" />
                <span>New Assignment</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Create Task</h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Define the scope, priority, team assignee, and deadline.
              </p>
            </div>
          </div>

          <div className="p-8">
            {successMessage && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Creation Error</p>
                  <p className="mt-0.5 text-xs text-rose-700">{errorMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Task Title */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="task-title" className="text-xs font-bold text-slate-800 tracking-wide">
                    Task Title <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">{title.length}/255</span>
                </div>
                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Update brand campaign assets for Q4 launch"
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all shadow-2xs focus:outline-none focus:ring-3 ${
                    errors.title
                      ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:ring-rose-500/20'
                      : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 focus:border-indigo-600 focus:ring-indigo-500/15'
                  }`}
                />
                {errors.title && <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.title}</p>}
              </div>

              {/* Task Description */}
              <div>
                <label htmlFor="task-description" className="block text-xs font-bold text-slate-800 mb-2 tracking-wide">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="task-description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add context, acceptance criteria, links, or detailed requirements..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-normal shadow-2xs hover:border-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-500/15 transition-all"
                />
              </div>

              {/* Priority Selector (Interactive Segmented Cards) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2 tracking-wide">
                  Priority Level <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {priorityOptions.map((opt) => {
                    const isSelected = priority === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPriority(opt.value)}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? `${opt.bg} ${opt.border} ${opt.color} ring-2 ring-indigo-500/30 shadow-xs font-bold`
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assignee & Due Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                {/* Assignee Selector with Email support */}
                <div>
                  <AssigneeSelector
                    users={users}
                    selectedUserId={assignedTo}
                    selectedEmail={assignedToEmail}
                    onChange={(userId, email) => {
                      setAssignedTo(userId);
                      setAssignedToEmail(email);
                    }}
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label htmlFor="task-due-date" className="block text-xs font-bold text-slate-800 mb-2 tracking-wide">
                    Due Date & Time
                  </label>
                  <div className="relative">
                    <input
                      id="task-due-date"
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium shadow-2xs hover:border-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-500/15 transition-all"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">Deadlines trigger dashboard countdowns</p>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                <Link
                  href="/dashboard"
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all disabled:opacity-60 cursor-pointer active:scale-98"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Task...</span>
                    </>
                  ) : (
                    <span>Create Task</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
