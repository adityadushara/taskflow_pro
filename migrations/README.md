# Supabase Database Migrations

This directory stores ordered SQL migration scripts to reproduce and version-control the database schema for the Task Management Application.

## Migration Convention
Migrations are sequentially numbered:
- `001_initial_schema.sql`: Core tables (`profiles`, `tasks`) and base schema.
- `002_add_indexes.sql`: Performance indexes on foreign keys, status, priority, and dates.
- `003_add_task_activity.sql`: Audit logging with `task_activity` table.
- `004_rls_policies.sql`: Row Level Security policies and security rules.

## Execution
Migrations can be applied directly in the Supabase Dashboard SQL Editor or via the Supabase CLI (`supabase db push`).
