import uuid
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from app.utils.supabase_client import get_supabase_client
from app.services.user_service import UserService
from app.services.email_service import EmailService

ALLOWED_STATUSES = {"todo", "in_progress", "completed"}
ALLOWED_PRIORITIES = {"low", "medium", "high", "urgent"}

class TaskService:
    @staticmethod
    def is_valid_uuid(val: str) -> bool:
        try:
            uuid.UUID(str(val))
            return True
        except (ValueError, AttributeError, TypeError):
            return False

    @staticmethod
    def validate_iso_date(date_str: str) -> bool:
        if not date_str:
            return True
        try:
            # Handle ISO formats
            datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            return True
        except ValueError:
            return False

    @classmethod
    def log_activity(
        cls,
        task_id: str,
        user_id: str,
        action: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Records an immutable activity log entry."""
        try:
            supabase = get_supabase_client()
            supabase.table("task_activity").insert({
                "task_id": task_id,
                "user_id": user_id,
                "action": action,
                "metadata": metadata or {}
            }).execute()
        except Exception as e:
            # Activity logging failure should not abort transaction
            print(f"[ActivityLog Error] Failed to record {action}: {e}")

    @classmethod
    def list_tasks(
        cls,
        current_user_id: str,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assigned_to: Optional[str] = None,
        created_by: Optional[str] = None,
        search: Optional[str] = None,
        sort: str = "newest",
        page: int = 1,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Lists tasks accessible to the current user (tasks created by or assigned to user).
        Applies filtering, searching, and sorting.
        """
        supabase = get_supabase_client()

        # Authorization: user can only see tasks where they are creator or assignee
        query = supabase.table("tasks").select(
            "*, creator:profiles!tasks_created_by_fkey(id, email, full_name, avatar_url), "
            "assignee:profiles!tasks_assigned_to_fkey(id, email, full_name, avatar_url)",
            count="exact"
        )

        # Access control rule
        if created_by == "me":
            query = query.eq("created_by", current_user_id)
        elif assigned_to == "me":
            query = query.eq("assigned_to", current_user_id)
        elif assigned_to:
            if cls.is_valid_uuid(assigned_to):
                query = query.eq("assigned_to", assigned_to)
                # Ensure current user is creator if querying someone else's assigned tasks
                if assigned_to != current_user_id:
                    query = query.eq("created_by", current_user_id)
        elif created_by:
            if cls.is_valid_uuid(created_by):
                query = query.eq("created_by", created_by)
                if created_by != current_user_id:
                    query = query.eq("assigned_to", current_user_id)
        else:
            # Default: tasks created by OR assigned to current user
            query = query.or_(f"created_by.eq.{current_user_id},assigned_to.eq.{current_user_id}")

        # Status filter
        if status and status in ALLOWED_STATUSES:
            query = query.eq("status", status)

        # Priority filter
        if priority and priority in ALLOWED_PRIORITIES:
            query = query.eq("priority", priority)

        # Search filter on title or description
        if search and search.strip():
            clean_search = search.strip()
            query = query.or_(f"title.ilike.%{clean_search}%,description.ilike.%{clean_search}%")

        # Sorting
        if sort == "oldest":
            query = query.order("created_at", desc=False)
        elif sort == "due_soon":
            query = query.order("due_date", desc=False, nullsfirst=False)
        elif sort == "priority":
            query = query.order("priority", desc=True)
        else:
            # Default: newest first
            query = query.order("created_at", desc=True)

        # Pagination
        offset = (max(1, page) - 1) * limit
        query = query.range(offset, offset + limit - 1)

        try:
            result = query.execute()
        except Exception:
            # Short retry for transient socket drops
            time.sleep(0.2)
            result = query.execute()
        return {
            "tasks": result.data or [],
            "total": result.count or 0,
            "page": page,
            "limit": limit
        }

    @classmethod
    def create_task(cls, current_user: Dict[str, Any], data: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """
        Creates a new task.
        Enforces created_by = current_user['id'].
        Validates all fields.
        """
        current_user_id = current_user["id"]
        title = (data.get("title") or "").strip()
        if not title:
            return None, {"code": "VALIDATION_ERROR", "message": "Task title is required."}
        if len(title) > 255:
            return None, {"code": "VALIDATION_ERROR", "message": "Task title cannot exceed 255 characters."}

        description = data.get("description")
        if description is not None and not isinstance(description, str):
            return None, {"code": "VALIDATION_ERROR", "message": "Description must be a string."}

        priority = data.get("priority", "medium")
        if priority not in ALLOWED_PRIORITIES:
            return None, {"code": "VALIDATION_ERROR", "message": f"Invalid priority. Allowed: {list(ALLOWED_PRIORITIES)}"}

        assigned_to = data.get("assigned_to")
        assigned_to_email = data.get("assigned_to_email")
        assignee_profile = None

        if assigned_to_email and not assigned_to:
            assignee_profile = UserService.get_or_create_by_email(assigned_to_email)
            if not assignee_profile:
                return None, {"code": "VALIDATION_ERROR", "message": f"Could not resolve or provision account for email '{assigned_to_email}'."}
            assigned_to = assignee_profile["id"]
        elif assigned_to:
            if not cls.is_valid_uuid(assigned_to):
                return None, {"code": "VALIDATION_ERROR", "message": "Invalid assigned_to UUID."}
            assignee_profile = UserService.get_user_by_id(assigned_to)
            if not assignee_profile:
                return None, {"code": "USER_NOT_FOUND", "message": "Assignee does not exist."}

        due_date = data.get("due_date")
        if due_date and not cls.validate_iso_date(due_date):
            return None, {"code": "VALIDATION_ERROR", "message": "Invalid due_date format. Must be an ISO timestamp."}

        supabase = get_supabase_client()
        task_payload = {
            "title": title,
            "description": description or "",
            "status": "todo",
            "priority": priority,
            "created_by": current_user_id,
            "assigned_to": assigned_to or None,
            "due_date": due_date or None
        }

        res = supabase.table("tasks").insert(task_payload).execute()
        if not res.data:
            return None, {"code": "DATABASE_ERROR", "message": "Failed to create task."}

        task = res.data[0]
        task_id = task["id"]

        # Log creation activity
        cls.log_activity(task_id, current_user_id, "task_created")

        # Log assignment & dispatch notification if assigned to another user
        if assigned_to:
            cls.log_activity(task_id, current_user_id, "task_assigned", {"assigned_to": assigned_to})
            if assignee_profile:
                EmailService.send_task_assigned_email(task, assignee_profile, current_user)

        return task, None

    @classmethod
    def get_task(cls, task_id: str, current_user_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """
        Retrieves task details if user has permission.
        """
        if not cls.is_valid_uuid(task_id):
            return None, {"code": "INVALID_ID", "message": "Invalid task ID format."}

        supabase = get_supabase_client()
        res = supabase.table("tasks").select(
            "*, creator:profiles!tasks_created_by_fkey(id, email, full_name, avatar_url), "
            "assignee:profiles!tasks_assigned_to_fkey(id, email, full_name, avatar_url)"
        ).eq("id", task_id).execute()

        if not res.data or len(res.data) == 0:
            return None, {"code": "TASK_NOT_FOUND", "message": "Task not found."}

        task = res.data[0]
        # Authorization: Creator or Assignee
        if task["created_by"] != current_user_id and task.get("assigned_to") != current_user_id:
            return None, {"code": "FORBIDDEN", "message": "You are not authorized to view this task."}

        # Include activity timeline
        act_res = supabase.table("task_activity").select(
            "*, user:profiles(id, email, full_name, avatar_url)"
        ).eq("task_id", task_id).order("created_at", desc=False).execute()

        task["activity"] = act_res.data or []
        return task, None

    @classmethod
    def update_task(
        cls,
        task_id: str,
        current_user: Dict[str, Any],
        data: Dict[str, Any]
    ) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """
        Updates task fields with strict role-based authorization.
        - Creator can update all fields.
        - Assignee can ONLY update status.
        - Unauthorized users get 403.
        """
        current_user_id = current_user["id"]
        if not cls.is_valid_uuid(task_id):
            return None, {"code": "INVALID_ID", "message": "Invalid task ID format."}

        supabase = get_supabase_client()
        existing_res = supabase.table("tasks").select("*").eq("id", task_id).execute()
        if not existing_res.data or len(existing_res.data) == 0:
            return None, {"code": "TASK_NOT_FOUND", "message": "Task not found."}

        existing_task = existing_res.data[0]
        is_creator = existing_task["created_by"] == current_user_id
        is_assignee = existing_task.get("assigned_to") == current_user_id

        if not is_creator and not is_assignee:
            return None, {"code": "FORBIDDEN", "message": "You are not authorized to modify this task."}

        # If user is assignee and NOT creator, restrict update solely to status
        update_fields: Dict[str, Any] = {}
        disallowed_fields = [k for k in data.keys() if k not in {"status"} and data[k] != existing_task.get(k)]
        if not is_creator and is_assignee and disallowed_fields:
            return None, {
                "code": "FORBIDDEN",
                "message": f"Assignees are only permitted to update task status. Forbidden fields: {disallowed_fields}"
            }

        # Validate status change
        if "status" in data:
            new_status = data["status"]
            if new_status not in ALLOWED_STATUSES:
                return None, {"code": "VALIDATION_ERROR", "message": f"Invalid status: {new_status}"}
            if new_status != existing_task["status"]:
                update_fields["status"] = new_status
                if new_status == "completed":
                    update_fields["completed_at"] = datetime.now(timezone.utc).isoformat()
                elif existing_task["status"] == "completed":
                    update_fields["completed_at"] = None

        # Fields only creator can update
        if is_creator:
            if "title" in data:
                title = (data["title"] or "").strip()
                if not title:
                    return None, {"code": "VALIDATION_ERROR", "message": "Task title cannot be empty."}
                if len(title) > 255:
                    return None, {"code": "VALIDATION_ERROR", "message": "Task title cannot exceed 255 characters."}
                update_fields["title"] = title

            if "description" in data:
                desc = data["description"]
                update_fields["description"] = desc if desc is not None else ""

            if "priority" in data:
                priority = data["priority"]
                if priority not in ALLOWED_PRIORITIES:
                    return None, {"code": "VALIDATION_ERROR", "message": f"Invalid priority: {priority}"}
                update_fields["priority"] = priority

            if "due_date" in data:
                due_date = data["due_date"]
                if due_date and not cls.validate_iso_date(due_date):
                    return None, {"code": "VALIDATION_ERROR", "message": "Invalid due_date format."}
                update_fields["due_date"] = due_date or None

            if "assigned_to_email" in data and "assigned_to" not in data:
                assigned_to_email = data["assigned_to_email"]
                if assigned_to_email:
                    assignee_profile = UserService.get_or_create_by_email(assigned_to_email)
                    if not assignee_profile:
                        return None, {"code": "VALIDATION_ERROR", "message": f"Could not resolve or provision account for email '{assigned_to_email}'."}
                    update_fields["assigned_to"] = assignee_profile["id"]
                else:
                    update_fields["assigned_to"] = None
            elif "assigned_to" in data:
                assigned_to = data["assigned_to"]
                if assigned_to:
                    if not cls.is_valid_uuid(assigned_to):
                        return None, {"code": "VALIDATION_ERROR", "message": "Invalid assigned_to UUID."}
                    if not UserService.get_user_by_id(assigned_to):
                        return None, {"code": "USER_NOT_FOUND", "message": "Assignee does not exist."}
                update_fields["assigned_to"] = assigned_to or None

        if not update_fields:
            return existing_task, None

        res = supabase.table("tasks").update(update_fields).eq("id", task_id).execute()
        updated_task = res.data[0] if res.data else existing_task

        # Record activity logs
        if "status" in update_fields:
            cls.log_activity(task_id, current_user_id, "status_changed", {
                "from": existing_task["status"],
                "to": update_fields["status"]
            })
            if update_fields["status"] == "completed":
                cls.log_activity(task_id, current_user_id, "task_completed")
                creator_profile = UserService.get_user_by_id(existing_task["created_by"])
                EmailService.send_task_completed_email(updated_task, current_user, creator_profile)

        if "assigned_to" in update_fields and update_fields["assigned_to"] != existing_task.get("assigned_to"):
            cls.log_activity(task_id, current_user_id, "task_assigned", {
                "assigned_to": update_fields["assigned_to"]
            })
            if update_fields["assigned_to"]:
                new_assignee = UserService.get_user_by_id(update_fields["assigned_to"])
                if new_assignee:
                    EmailService.send_task_assigned_email(updated_task, new_assignee, current_user)

        general_updates = {k: v for k, v in update_fields.items() if k not in {"status", "assigned_to", "completed_at"}}
        if general_updates:
            cls.log_activity(task_id, current_user_id, "task_updated", {"fields": list(general_updates.keys())})

        return updated_task, None

    @classmethod
    def complete_task(cls, task_id: str, current_user: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """Direct action to mark a task as completed."""
        return cls.update_task(task_id, current_user, {"status": "completed"})

    @classmethod
    def delete_task(cls, task_id: str, current_user_id: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Deletes a task.
        Only the creator of the task can perform deletion.
        """
        if not cls.is_valid_uuid(task_id):
            return False, {"code": "INVALID_ID", "message": "Invalid task ID format."}

        supabase = get_supabase_client()
        res = supabase.table("tasks").select("id, created_by, title").eq("id", task_id).execute()
        if not res.data or len(res.data) == 0:
            return False, {"code": "TASK_NOT_FOUND", "message": "Task not found."}

        task = res.data[0]
        if task["created_by"] != current_user_id:
            return False, {"code": "FORBIDDEN", "message": "Only the task creator can delete this task."}

        # Log deleted activity prior to deletion
        cls.log_activity(task_id, current_user_id, "task_deleted", {"title": task["title"]})

        supabase.table("tasks").delete().eq("id", task_id).execute()
        return True, None

    @classmethod
    def get_task_activity(cls, task_id: str, current_user_id: str) -> Tuple[Optional[List[Dict[str, Any]]], Optional[Dict[str, Any]]]:
        """Retrieves chronological activity for a task if authorized."""
        task, error = cls.get_task(task_id, current_user_id)
        if error:
            return None, error

        supabase = get_supabase_client()
        res = supabase.table("task_activity").select(
            "*, user:profiles(id, email, full_name, avatar_url)"
        ).eq("task_id", task_id).order("created_at", desc=False).execute()

        return res.data or [], None
