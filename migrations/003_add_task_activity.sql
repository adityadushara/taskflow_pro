-- ==============================================================================
-- Migration 003: Task Activity Log Table
-- Immutable audit log capturing task mutations, assignments, and status transitions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN (
        'task_created',
        'task_assigned',
        'task_updated',
        'status_changed',
        'task_completed',
        'task_deleted'
    )),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.task_activity IS 'Audit trail for all task-related events and modifications';

-- Performance indexes for timeline retrieval
CREATE INDEX IF NOT EXISTS idx_task_activity_task_id_created_at
    ON public.task_activity(task_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_task_activity_user_id
    ON public.task_activity(user_id);
