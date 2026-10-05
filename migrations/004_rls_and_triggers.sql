-- ==============================================================================
-- Migration 004: Row Level Security (RLS) Policies and Auth Triggers
-- Defense-in-depth security layer ensuring user privacy and data integrity
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Automatic User Profile Synchronization on Supabase Auth Signup
-- ------------------------------------------------------------------------------
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

-- Trigger attached to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. Enable Row Level Security (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. Profiles Policies
-- All authenticated users can view basic public profile details (for task assignment).
-- Users can only modify their own profile.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 4. Tasks Policies
-- Users can read tasks if they are the creator or assignee.
-- Users can insert tasks where they are marked as the creator.
-- Creators can update or delete their tasks. Assignees can update status.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view accessible tasks" ON public.tasks;
CREATE POLICY "Users can view accessible tasks"
    ON public.tasks
    FOR SELECT
    TO authenticated
    USING (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
    );

DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
CREATE POLICY "Users can create tasks"
    ON public.tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Creators or assignees can update tasks" ON public.tasks;
CREATE POLICY "Creators or assignees can update tasks"
    ON public.tasks
    FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
    );

DROP POLICY IF EXISTS "Only creators can delete tasks" ON public.tasks;
CREATE POLICY "Only creators can delete tasks"
    ON public.tasks
    FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid()
    );

-- ------------------------------------------------------------------------------
-- 5. Task Activity Policies
-- Users can view activity for tasks they are allowed to see.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view activity for accessible tasks" ON public.task_activity;
CREATE POLICY "Users can view activity for accessible tasks"
    ON public.task_activity
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE public.tasks.id = public.task_activity.task_id
            AND (public.tasks.created_by = auth.uid() OR public.tasks.assigned_to = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Authenticated users can insert activity" ON public.task_activity;
CREATE POLICY "Authenticated users can insert activity"
    ON public.task_activity
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
    );
