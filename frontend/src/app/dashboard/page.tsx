'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedView, setSelectedView] = useState<'all' | 'assigned' | 'created'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (selectedView === 'assigned') params.append('assigned_to', 'me');
    if (selectedView === 'created') params.append('created_by', 'me');
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (priorityFilter !== 'all') params.append('priority', priorityFilter);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    if (sortBy) params.append('sort', sortBy);

    try {
      const res = await apiClient<{ tasks: Task[]; total: number }>(`/tasks?${params.toString()}`);
      if (res.success && res.data) {
        setTasks(res.data.tasks);
      } else {
        setError(res.error?.message || 'Failed to load tasks');
      }
    } catch {
      setError('An unexpected error occurred while communicating with the backend API.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedView, statusFilter, priorityFilter, searchQuery, sortBy]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchTasks();
    }
  }, [user, authLoading, router, fetchTasks]);

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

  const firstName =
    profile?.full_name?.split(' ')[0] ||
    (user?.email ? user.email.split('@')[0] : 'there');

  return (
    <AppLayout searchValue={searchQuery} onSearchChange={setSearchQuery}>
      <div className="space-y-7">
        {/* Header Title & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Welcome back, <span className="text-indigo-600 capitalize">{firstName}</span>
              </h1>
              <span className="text-lg">👋</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Monitor team assignments, track deadlines, and review workspace activity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/tasks/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </Link>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total Tasks</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ListTodo className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">{metrics.total}</p>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">Accessible workspace tasks</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>My Tasks</span>
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">{metrics.myTasks}</p>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">Assigned to your account</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>In Progress</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">{metrics.inProgress}</p>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">Currently active execution</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Completed</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">{metrics.completed}</p>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">Successfully resolved</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Overdue</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-rose-600 tracking-tight">{metrics.overdue}</p>
            <p className="mt-1 text-[11px] text-rose-500 font-medium">Missed deadline</p>
          </div>
        </div>

        {/* Tasks Due Soon Alert Banner */}
        {tasksDueSoon.length > 0 && (
          <div className="p-5 rounded-2xl bg-linear-to-r from-amber-50/80 to-amber-50/40 border border-amber-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider mb-3">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Urgent Deadlines — {tasksDueSoon.length} Task(s) Due Within 72 Hours</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {tasksDueSoon.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="p-3.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all block group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-[10px] text-amber-800 font-bold">
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
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* View Tabs */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/60">
              <button
                onClick={() => setSelectedView('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedView === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setSelectedView('assigned')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedView === 'assigned'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Assigned to Me
              </button>
              <button
                onClick={() => setSelectedView('created')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedView === 'created'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Created by Me
              </button>
            </div>

            {/* Dropdown Filters & Sorting */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 font-semibold">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
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
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
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
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <h2 className="text-sm font-bold text-slate-900 tracking-wide">Workspace Tasks</h2>
            <span className="text-xs text-slate-500 font-semibold bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
              {tasks.length} task{tasks.length === 1 ? '' : 's'}
            </span>
          </div>

          {error && (
            <div className="p-8 text-center text-rose-600 text-sm">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
              <p className="font-semibold">{error}</p>
              <p className="text-xs text-slate-400 mt-1">Please ensure the Supabase migrations have been run in your project.</p>
            </div>
          )}

          {isLoading ? (
            <div className="p-16 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Loading tasks from Flask API...</p>
            </div>
          ) : tasks.length === 0 ? (
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
                    <th className="py-3 px-6">Task Title</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((task) => {
                    const isOverdue =
                      task.status !== 'completed' &&
                      task.due_date &&
                      new Date(task.due_date) < new Date();

                    return (
                      <tr key={task.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 px-6">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors block text-sm"
                          >
                            {task.title}
                          </Link>
                          {task.description && (
                            <p className="text-xs text-slate-400 truncate max-w-md mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <StatusBadge status={task.status} />
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <PriorityBadge priority={task.priority} />
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          {task.assignee ? (
                            <div className="flex items-center gap-2">
                              {task.assignee.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={task.assignee.avatar_url}
                                  alt=""
                                  className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                                  {task.assignee.full_name?.charAt(0) || 'U'}
                                </div>
                              )}
                              <span className="text-xs text-slate-700 font-semibold">
                                {task.assignee.full_name || task.assignee.email}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap text-xs">
                          {task.due_date ? (
                            <span
                              className={`flex items-center gap-1.5 font-semibold ${
                                isOverdue ? 'text-rose-600' : 'text-slate-600'
                              }`}
                            >
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(task.due_date).toLocaleDateString()}
                              {isOverdue && <span className="text-[10px] bg-rose-50 px-1.5 py-0.5 rounded text-rose-600 border border-rose-200">Overdue</span>}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3.5 h-3.5" />
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
