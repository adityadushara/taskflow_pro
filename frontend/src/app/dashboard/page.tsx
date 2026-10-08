'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Plus,
  ArrowRight,
  Filter,
  CheckSquare,
  ListTodo,
  AlertTriangle,
  Loader2,
  Check,
  RotateCw,
  Flame,
} from 'lucide-react';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isLoading: authLoading } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters - sync initial state with URL query param if present
  const viewParam = searchParams?.get('view') as 'all' | 'assigned' | 'created' | null;
  const [selectedView, setSelectedView] = useState<'all' | 'assigned' | 'created'>(
    viewParam && ['all', 'assigned', 'created'].includes(viewParam) ? viewParam : 'all'
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Keep selectedView in sync if query param changes
  useEffect(() => {
    if (viewParam && ['all', 'assigned', 'created'].includes(viewParam)) {
      setSelectedView(viewParam);
    } else if (!viewParam) {
      setSelectedView('all');
    }
  }, [viewParam]);

  const fetchTasks = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const res = await apiClient<{ tasks: Task[]; total: number }>('/tasks?limit=100&sort=newest');
      if (res.success && res.data) {
        setTasks(res.data.tasks);
      } else {
        setError(res.error?.message || 'Failed to load tasks');
      }
    } catch {
      setError('An unexpected error occurred while communicating with the backend API.');
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && tasks.length === 0) {
      fetchTasks();
    }
  }, [user?.id, authLoading, router, fetchTasks, tasks.length]);

  // Quick Complete toggle from dashboard table with optimistic update
  const handleQuickComplete = async (e: React.MouseEvent, taskId: string, currentStatus: TaskStatus) => {
    e.stopPropagation();
    e.preventDefault();
    const newStatus: TaskStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';

    // Optimistic update in UI
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await apiClient<Task>(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.success) {
        // Revert on failure
        fetchTasks(true);
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
      fetchTasks(true);
    }
  };

  // Switch view tab instantly without full router reload
  const handleViewChange = (view: 'all' | 'assigned' | 'created') => {
    setSelectedView(view);
    const newParams = new URLSearchParams(window.location.search);
    if (view === 'all') {
      newParams.delete('view');
    } else {
      newParams.set('view', view);
    }
    const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
    window.history.replaceState(null, '', `/dashboard${queryStr}`);
  };

  // Derived Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const myTasks = tasks.filter((t) => t.assigned_to === user?.id).length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const now = new Date();
    const overdue = tasks.filter(
      (t) => t.status !== 'completed' && t.due_date && new Date(t.due_date) < now
    ).length;

    return { total, myTasks, inProgress, completed, overdue };
  }, [tasks, user]);

  // Tasks due soon (within 3 days and not completed)
  const tasksDueSoon = useMemo(() => {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    return tasks
      .filter((t) => {
        if (t.status === 'completed' || !t.due_date) return false;
        const d = new Date(t.due_date);
        return d >= now && d <= threeDaysFromNow;
      })
      .slice(0, 4);
  }, [tasks]);

  // Instant in-memory filtered and sorted tasks for 0ms tab and filter switching
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        // Tab / View Filter
        if (selectedView === 'assigned' && t.assigned_to !== user?.id) return false;
        if (selectedView === 'created' && t.created_by !== user?.id) return false;

        // Status Filter
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;

        // Priority Filter
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = t.title?.toLowerCase().includes(q);
          const matchDesc = t.description?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'due_soon') {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (sortBy === 'priority') {
          const weights: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (weights[b.priority] || 0) - (weights[a.priority] || 0);
        }
        // Default newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [tasks, selectedView, statusFilter, priorityFilter, searchQuery, sortBy, user?.id]);

  const rawName = profile?.full_name?.trim();
  const firstName = rawName && rawName !== user?.email
    ? rawName.split(' ')[0]
    : user?.email
      ? user.email.split('@')[0]
      : 'there';

  return (
    <AppLayout searchValue={searchQuery} onSearchChange={setSearchQuery}>
      <div className="space-y-6">
        {/* Header Title with Welcome Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Welcome back, <span className="text-indigo-600 capitalize">{firstName}</span>
              </h1>
              <span className="text-xl">👋</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Monitor team assignments, track deadlines, and review workspace activity.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchTasks(true)}
              title="Refresh tasks from server"
              className="p-2 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <Link
              href="/tasks/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-200 transition-all cursor-pointer active:scale-98"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </Link>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Total Tasks */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total Tasks</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/60 flex items-center justify-center">
                <ListTodo className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="mt-2.5 text-2xl font-black text-slate-900 tracking-tight">{metrics.total}</p>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">Workspace tasks</p>
          </div>

          {/* My Tasks */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>My Tasks</span>
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 border border-sky-100/60 flex items-center justify-center">
                <CheckSquare className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="mt-2.5 text-2xl font-black text-slate-900 tracking-tight">{metrics.myTasks}</p>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">Assigned to you</p>
          </div>

          {/* In Progress */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>In Progress</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100/60 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="mt-2.5 text-2xl font-black text-slate-900 tracking-tight">{metrics.inProgress}</p>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">Active execution</p>
          </div>

          {/* Completed */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Completed</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/60 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="mt-2.5 text-2xl font-black text-slate-900 tracking-tight">{metrics.completed}</p>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">Successfully resolved</p>
          </div>

          {/* Overdue */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Overdue</span>
              <div
                className={`w-7 h-7 rounded-lg border flex items-center justify-center ${
                  metrics.overdue > 0
                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                    : 'bg-slate-50 text-slate-400 border-slate-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <p
              className={`mt-2.5 text-2xl font-black tracking-tight ${
                metrics.overdue > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {metrics.overdue}
            </p>
            <p
              className={`mt-1 text-[11px] font-medium ${
                metrics.overdue > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'
              }`}
            >
              {metrics.overdue > 0 ? 'Action required' : 'No missed deadlines'}
            </p>
          </div>
        </div>

        {/* Tasks Due Soon - Clean Banner */}
        {tasksDueSoon.length > 0 && (
          <div className="p-4 rounded-2xl bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/70 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <Flame className="w-4 h-4 text-amber-600" />
                <span>Urgent Deadlines — {tasksDueSoon.length} Task{tasksDueSoon.length > 1 ? 's' : ''} Due in 72h</span>
              </div>
              <span className="text-[11px] text-amber-700 font-semibold bg-amber-100/70 px-2 py-0.5 rounded-full">
                Attention Needed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {tasksDueSoon.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="p-3 rounded-xl bg-white border border-amber-200/90 shadow-2xs hover:shadow-xs hover:border-amber-400 transition-all block group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-[10px] text-amber-800 font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                    {task.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* View Tabs */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/50">
              <button
                type="button"
                onClick={() => handleViewChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedView === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All Tasks
              </button>
              <button
                type="button"
                onClick={() => handleViewChange('assigned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedView === 'assigned'
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Assigned to Me
              </button>
              <button
                type="button"
                onClick={() => handleViewChange('created')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedView === 'created'
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Created by Me
              </button>
            </div>

            {/* Dropdown Filters & Sorting */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 font-semibold">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all cursor-pointer text-xs"
                >
                  <option value="all">All</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all cursor-pointer text-xs"
                >
                  <option value="all">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all cursor-pointer text-xs"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="due_soon">Due Date</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Task List Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-3.5 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Workspace Tasks</h2>
            <span className="text-xs text-slate-500 font-bold bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
              {filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'}
            </span>
          </div>

          {error && (
            <div className="p-8 text-center text-rose-600 text-sm">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {isInitialLoading && tasks.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Loading workspace tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No tasks in this view</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No tasks match your selected filter or search criteria.
              </p>
              <Link
                href="/tasks/new"
                className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-all shadow-xs cursor-pointer active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Task</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/70 text-slate-400 text-[11px] uppercase tracking-wider font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-6 w-12 text-center">Done</th>
                    <th className="py-3 px-4">Task Title</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map((task) => {
                    const isOverdue =
                      task.status !== 'completed' &&
                      task.due_date &&
                      new Date(task.due_date) < new Date();

                    const isDone = task.status === 'completed';

                    return (
                      <tr key={task.id} className="hover:bg-slate-50/90 transition-colors group">
                        {/* Quick complete checkbox */}
                        <td className="py-3.5 px-6 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleQuickComplete(e, task.id, task.status)}
                            title={isDone ? 'Mark In Progress' : 'Mark Completed'}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                              isDone
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 hover:border-indigo-600 bg-white text-transparent hover:text-indigo-600'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                        </td>

                        {/* Title & Description */}
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/tasks/${task.id}`}
                            className={`font-bold text-sm block group-hover:text-indigo-600 transition-colors ${
                              isDone ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </Link>
                          {task.description && (
                            <p className="text-xs text-slate-400 truncate max-w-sm mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={task.status} />
                        </td>

                        {/* Priority */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <PriorityBadge priority={task.priority} />
                        </td>

                        {/* Assignee */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {task.assignee ? (
                            <div className="flex items-center gap-2">
                              {/* Avatar with fallback */}
                              <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 bg-linear-to-tr from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-[10px] shadow-2xs">
                                <span>{task.assignee.full_name?.charAt(0) || 'U'}</span>
                                {task.assignee.avatar_url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={task.assignee.avatar_url}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = 'none';
                                    }}
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <span className="text-xs text-slate-700 font-bold">
                                {task.assignee.full_name || task.assignee.email}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium italic">Unassigned</span>
                          )}
                        </td>

                        {/* Due date */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                          {task.due_date ? (
                            <span
                              className={`flex items-center gap-1.5 font-bold ${
                                isOverdue ? 'text-rose-600' : 'text-slate-600'
                              }`}
                            >
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(task.due_date).toLocaleDateString()}
                              {isOverdue && (
                                <span className="text-[10px] bg-rose-50 px-1.5 py-0.5 rounded text-rose-600 border border-rose-200">
                                  Overdue
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Open Action */}
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
