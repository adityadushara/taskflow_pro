'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { Task, TaskStatus, TaskPriority, TaskActivity, UserProfile } from '@/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { AssigneeSelector } from '@/components/ui/AssigneeSelector';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { StatusDropdown } from '@/components/ui/StatusDropdown';
import { PriorityDropdown } from '@/components/ui/PriorityDropdown';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit3,
  User,
  AlertCircle,
  Loader2,
  History,
  Save,
  Clock,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

export default function TaskDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const taskId = params?.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState<boolean>(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editAssignedTo, setEditAssignedTo] = useState<string>('');
  const [editAssignedToEmail, setEditAssignedToEmail] = useState<string>('');
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchTaskDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<Task & { activity?: TaskActivity[] }>(`/tasks/${taskId}`);
      if (res.success && res.data) {
        setTask(res.data);
        setEditTitle(res.data.title);
        setEditDescription(res.data.description || '');
        setEditPriority(res.data.priority);
        setEditAssignedTo(res.data.assigned_to || '');
        setEditAssignedToEmail(res.data.assignee?.email || '');
        setEditDueDate(
          res.data.due_date ? new Date(res.data.due_date).toISOString().slice(0, 16) : ''
        );
        if (res.data.activity) {
          setActivity(res.data.activity);
        }
      } else {
        setError(res.error?.message || 'Task not found or unauthorized');
      }
    } catch {
      setError('Failed to fetch task details.');
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && taskId) {
      fetchTaskDetails();
      apiClient<UserProfile[]>('/users').then((res) => {
        if (res.success && res.data) setUsers(res.data);
      });
    }
  }, [user, authLoading, taskId, router, fetchTaskDetails]);

  const isCreator = task?.created_by === user?.id;
  const isAssignee = task?.assigned_to === user?.id;
  const canModify = isCreator;
  const canChangeStatus = isCreator || isAssignee;

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    setIsChangingStatus(true);
    try {
      const res = await apiClient<Task>(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.success) {
        await fetchTaskDetails();
      }
    } catch (err) {
      console.error('Failed to change status:', err);
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleComplete = async () => {
    if (!task) return;
    try {
      const res = await apiClient<Task>(`/tasks/${task.id}/complete`, {
        method: 'POST',
      });
      if (res.success) {
        await fetchTaskDetails();
      }
    } catch (err) {
      console.error('Failed to mark task completed:', err);
    }
  };

  const handleSaveEdits = async () => {
    if (!task) return;
    setIsSaving(true);
    try {
      const res = await apiClient<Task>(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          priority: editPriority,
          assigned_to: editAssignedTo || null,
          assigned_to_email: editAssignedToEmail || null,
          due_date: editDueDate ? new Date(editDueDate).toISOString() : null,
        }),
      });
      if (res.success) {
        setIsEditing(false);
        await fetchTaskDetails();
      } else {
        alert(res.error?.message || 'Update failed');
      }
    } catch (err) {
      console.error('Error saving edits:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    setIsDeleting(true);
    try {
      const res = await apiClient(`/tasks/${task.id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        router.push('/dashboard');
      } else {
        alert(res.error?.message || 'Delete failed');
        setIsDeleting(false);
        setIsDeleteModalOpen(false);
      }
    } catch {
      alert('Network error while deleting task');
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="py-24 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
          <p className="text-xs font-semibold text-slate-600">Loading task details...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !task) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Task Inaccessible</h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">{error || 'Task not found'}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {canChangeStatus && task.status !== 'completed' && (
              <button
                onClick={handleComplete}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Completed</span>
              </button>
            )}

            {canModify && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit</span>
              </button>
            )}

            {isCreator && (
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-xs">
          {isEditing ? (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Task Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-500/15"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Description</label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-500/15"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Priority</label>
                  <PriorityDropdown
                    priority={editPriority}
                    onChange={setEditPriority}
                  />
                </div>

                <div>
                  <AssigneeSelector
                    users={users}
                    selectedUserId={editAssignedTo}
                    selectedEmail={editAssignedToEmail}
                    onChange={(userId, email) => {
                      setEditAssignedTo(userId);
                      setEditAssignedToEmail(email);
                    }}
                  />
                </div>

                <div>
                  <DateTimePicker
                    label="Due Date"
                    value={editDueDate}
                    onChange={setEditDueDate}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdits}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-4">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                {task.due_date && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Due: {new Date(task.due_date).toLocaleString()}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{task.title}</h1>

              <div className="mt-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {task.description || <span className="italic text-slate-400">No description provided for this task.</span>}
              </div>

              {/* Status Update Dropdown for quick state switching */}
              {canChangeStatus && (
                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600">Quick Status Transition:</span>
                  <StatusDropdown
                    status={task.status}
                    onChange={handleStatusChange}
                    disabled={isChangingStatus}
                  />
                  {isChangingStatus && (
                    <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* People & Dates Meta Grid */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block font-semibold text-[11px] uppercase tracking-wider">Created By</span>
              <span className="font-bold text-slate-800 mt-1 block truncate">
                {task.creator?.full_name || task.creator?.email || 'Creator'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block font-semibold text-[11px] uppercase tracking-wider">Assigned To</span>
              <span className="font-bold text-slate-800 mt-1 block truncate">
                {task.assignee?.full_name || task.assignee?.email || 'Unassigned'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block font-semibold text-[11px] uppercase tracking-wider">Created Date</span>
              <span className="font-bold text-slate-800 mt-1 block">
                {new Date(task.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block font-semibold text-[11px] uppercase tracking-wider">Completed Date</span>
              <span className="font-bold text-slate-800 mt-1 block">
                {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Activity & History Section */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-xs">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Chronological Activity History</h2>
          </div>

          {activity.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No activity recorded yet for this task.</p>
          ) : (
            <div className="relative pl-6 border-l-2 border-indigo-100 space-y-6">
              {activity.map((act) => {
                const actionLabels: Record<string, string> = {
                  task_created: 'created this task',
                  task_assigned: 'updated assignee',
                  task_updated: 'updated task details',
                  status_changed: 'transitioned status',
                  task_completed: 'marked task as completed',
                  task_deleted: 'deleted task',
                };

                return (
                  <div key={act.id} className="relative group">
                    <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-2xs" />

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-800">
                        {act.user?.full_name || act.user?.email || 'A team member'}
                      </span>
                      <span className="text-slate-600 font-medium">
                        {actionLabels[act.action] || act.action}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        • {new Date(act.created_at).toLocaleString()}
                      </span>
                    </div>

                    {act.metadata && Object.keys(act.metadata).length > 0 && (
                      <div className="mt-2">
                        {act.action === 'status_changed' && typeof act.metadata.from === 'string' && typeof act.metadata.to === 'string' ? (
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            <span className="text-[11px] text-slate-400 font-medium">Transitioned:</span>
                            <StatusBadge status={act.metadata.from as TaskStatus} />
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <StatusBadge status={act.metadata.to as TaskStatus} />
                          </div>
                        ) : act.action === 'task_assigned' && act.metadata.assigned_to ? (
                          (() => {
                            const assignedToId = typeof act.metadata.assigned_to === 'string' ? act.metadata.assigned_to : '';
                            const assignedEmail = typeof act.metadata.assigned_to_email === 'string' ? act.metadata.assigned_to_email : '';
                            const assignee = users.find((u) => u.id === assignedToId);
                            const name = assignee?.full_name || assignee?.email || assignedEmail || 'Assigned member';
                            return (
                              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900">
                                <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>
                                  Assigned to <strong className="font-bold">{String(name)}</strong>
                                </span>
                                {assignee?.email && assignee?.full_name && (
                                  <span className="text-[11px] text-indigo-500 font-normal">
                                    ({assignee.email})
                                  </span>
                                )}
                              </div>
                            );
                          })()
                        ) : act.action === 'task_updated' && Array.isArray(act.metadata.fields) ? (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                            <span className="text-[11px] text-slate-400 font-medium">Updated fields:</span>
                            {(act.metadata.fields as string[]).map((f: string) => {
                              const labels: Record<string, string> = {
                                title: 'Title',
                                description: 'Description',
                                priority: 'Priority',
                                due_date: 'Due Date',
                                assigned_to: 'Assignee',
                              };
                              return (
                                <span
                                  key={f}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold"
                                >
                                  {labels[f] || f}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(act.metadata).map(([k, v]) => (
                              <span
                                key={k}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium"
                              >
                                <span className="text-slate-400 font-semibold">{k}:</span>
                                <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Task"
        message="Are you sure you want to permanently delete this task? This action cannot be undone."
        confirmLabel="Delete Task"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteTask}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </AppLayout>
  );
}
