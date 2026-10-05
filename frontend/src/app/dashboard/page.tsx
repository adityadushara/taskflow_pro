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
  User,
  Plus,
  ArrowRight,
  Filter,
  CheckSquare,
  ListTodo,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

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

  return (
    <AppLayout searchValue={searchQuery} onSearchChange={setSearchQuery}>
      <div className="space-y-8">
        {/* Header Title & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back! Here is a summary of your workspace activities and milestones.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/tasks/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </Link>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Tasks</span>
              <ListTodo className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.total}</p>
            <p className="mt-1 text-[11px] text-slate-400">Accessible tasks</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>My Tasks</span>
              <CheckSquare className="w-4 h-4 text-sky-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.myTasks}</p>
            <p className="mt-1 text-[11px] text-slate-400">Assigned to you</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>In Progress</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.inProgress}</p>
            <p className="mt-1 text-[11px] text-slate-400">Currently active</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.completed}</p>
            <p className="mt-1 text-[11px] text-slate-400">Resolved tasks</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Overdue</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-rose-600">{metrics.overdue}</p>
            <p className="mt-1 text-[11px] text-slate-400">Past due date</p>
          </div>
        </div>

        {/* Tasks Due Soon Alert Banner */}
        {tasksDueSoon.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
            <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-3">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Action Needed: {tasksDueSoon.length} Task(s) Due Within 72 Hours</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {tasksDueSoon.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="p-3 rounded-xl bg-white border border-amber-200/60 shadow-xs hover:shadow-sm transition-all block"
                >
                  <div className="flex items-center justify-between mb-1">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-[10px] text-amber-700 font-medium">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 truncate">{task.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* View Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setSelectedView('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedView === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setSelectedView('assigned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedView === 'assigned'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Assigned to Me
              </button>
              <button
                onClick={() => setSelectedView('created')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedView === 'created'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Created by Me
              </button>
            </div>

            {/* Dropdown Filters & Sorting */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="due_soon">Due Date</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Task List Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Task Overview</h2>
            <span className="text-xs text-slate-400 font-medium">
              Showing {tasks.length} task{tasks.length === 1 ? '' : 's'}
            </span>
          </div>

          {error && (
            <div className="p-6 text-center text-rose-600 text-sm">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
              <p className="text-sm">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No tasks found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                No tasks match your selected filter criteria. Create your first task to get started!
              </p>
              <Link
                href="/tasks/new"
                className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Task</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/70 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-100">
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
                            className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors block"
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
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                                  {task.assignee.full_name?.charAt(0) || 'U'}
                                </div>
                              )}
                              <span className="text-xs text-slate-700 font-medium">
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
                              className={`flex items-center gap-1.5 ${
                                isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'
                              }`}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(task.due_date).toLocaleDateString()}
                              {isOverdue && ' (Overdue)'}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            <span>Details</span>
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
