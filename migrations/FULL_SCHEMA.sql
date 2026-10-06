-- ==============================================================================
-- HAIRDRAMA TASK MANAGER - COMPLETE DATABASE SCHEMA
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/your-supabase-project-id/sql
-- ==============================================================================

-- 1. Enable UUID Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.profiles IS 'User profiles linked 1:1 to Supabase auth.users';

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 255),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_by UUID NOT NULL,
    assigned_to UUID,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.tasks IS 'Task management entity created and assigned to profiles';

-- 4. Automatic updated_at Trigger Function
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS tr_tasks_updated_at ON public.tasks;
CREATE TRIGGER tr_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 5. Task Activity Table
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

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON public.tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_creator_status ON public.tasks(created_by, status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_task_activity_task_id_created_at ON public.task_activity(task_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_task_activity_user_id ON public.task_activity(user_id);

-- 7. Automatic Profile Sync Trigger from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
        avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE public.profiles.avatar_url END,
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Backfill any existing auth.users who already signed in before the table existed!
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
    COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 8. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
    ON public.profiles FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view accessible tasks" ON public.tasks;
CREATE POLICY "Users can view accessible tasks"
    ON public.tasks FOR SELECT TO authenticated
    USING (created_by = auth.uid() OR assigned_to = auth.uid());

DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
CREATE POLICY "Users can create tasks"
    ON public.tasks FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Creators or assignees can update tasks" ON public.tasks;
CREATE POLICY "Creators or assignees can update tasks"
    ON public.tasks FOR UPDATE TO authenticated
    USING (created_by = auth.uid() OR assigned_to = auth.uid());

DROP POLICY IF EXISTS "Only creators can delete tasks" ON public.tasks;
CREATE POLICY "Only creators can delete tasks"
    ON public.tasks FOR DELETE TO authenticated
    USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can view activity for accessible tasks" ON public.task_activity;
CREATE POLICY "Users can view activity for accessible tasks"
    ON public.task_activity FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE public.tasks.id = public.task_activity.task_id
            AND (public.tasks.created_by = auth.uid() OR public.tasks.assigned_to = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Authenticated users can insert activity" ON public.task_activity;
CREATE POLICY "Authenticated users can insert activity"
    ON public.task_activity FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
