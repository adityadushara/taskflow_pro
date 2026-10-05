export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_by: string;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  creator?: UserProfile;
  assignee?: UserProfile | null;
}

export type TaskAction =
  | 'task_created'
  | 'task_assigned'
  | 'task_updated'
  | 'status_changed'
  | 'task_completed'
  | 'task_deleted';

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  action: TaskAction;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user?: UserProfile;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
