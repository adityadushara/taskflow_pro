from flask import Blueprint, request, g
from app.middleware.auth import require_auth
from app.services.task_service import TaskService
from app.utils.responses import success_response, error_response

tasks_bp = Blueprint("tasks", __name__)

@tasks_bp.route("/tasks", methods=["GET"])
@require_auth
def list_tasks():
    """
    GET /api/tasks
    Query parameters: status, priority, assigned_to, created_by, search, sort, page, limit
    """
    try:
        status = request.args.get("status")
        priority = request.args.get("priority")
        assigned_to = request.args.get("assigned_to")
        created_by = request.args.get("created_by")
        search = request.args.get("search")
        sort = request.args.get("sort", "newest")
        
        try:
            page = int(request.args.get("page", 1))
            limit = min(int(request.args.get("limit", 50)), 100)
        except ValueError:
            return error_response(code="INVALID_QUERY_PARAMS", message="Page and limit must be integers.", status_code=400)

        result = TaskService.list_tasks(
            current_user_id=g.current_user["id"],
            status=status,
            priority=priority,
            assigned_to=assigned_to,
            created_by=created_by,
            search=search,
            sort=sort,
            page=page,
            limit=limit
        )
        return success_response(data=result)
    except Exception as e:
        return error_response(code="TASK_FETCH_FAILED", message="Failed to list tasks", status_code=500, details=str(e))

@tasks_bp.route("/tasks", methods=["POST"])
@require_auth
def create_task():
    """
    POST /api/tasks
    Creates a new task.
    """
    payload = request.get_json(silent=True)
    if not payload or not isinstance(payload, dict):
        return error_response(code="INVALID_BODY", message="Request body must be a valid JSON object.", status_code=400)

    task, error = TaskService.create_task(current_user=g.current_user, data=payload)
    if error:
        status_code = 400
        if error["code"] == "USER_NOT_FOUND":
            status_code = 404
        return error_response(code=error["code"], message=error["message"], status_code=status_code)

    return success_response(data=task, status_code=201)

@tasks_bp.route("/tasks/<task_id>", methods=["GET"])
@require_auth
def get_task(task_id):
    """
    GET /api/tasks/<task_id>
    Retrieves task details and activity.
    """
    task, error = TaskService.get_task(task_id=task_id, current_user_id=g.current_user["id"])
    if error:
        status_code = 400
        if error["code"] == "TASK_NOT_FOUND":
            status_code = 404
        elif error["code"] == "FORBIDDEN":
            status_code = 403
        return error_response(code=error["code"], message=error["message"], status_code=status_code)

    return success_response(data=task)

@tasks_bp.route("/tasks/<task_id>", methods=["PATCH"])
@require_auth
def update_task(task_id):
    """
    PATCH /api/tasks/<task_id>
    Updates task fields according to role authorization.
    """
    payload = request.get_json(silent=True)
    if not payload or not isinstance(payload, dict):
        return error_response(code="INVALID_BODY", message="Request body must be a valid JSON object.", status_code=400)

    task, error = TaskService.update_task(task_id=task_id, current_user=g.current_user, data=payload)
    if error:
        status_code = 400
        if error["code"] == "TASK_NOT_FOUND":
            status_code = 404
        elif error["code"] == "FORBIDDEN":
            status_code = 403
        elif error["code"] == "USER_NOT_FOUND":
            status_code = 404
        return error_response(code=error["code"], message=error["message"], status_code=status_code)

    return success_response(data=task)

@tasks_bp.route("/tasks/<task_id>/complete", methods=["POST"])
@require_auth
def complete_task(task_id):
    """
    POST /api/tasks/<task_id>/complete
    Marks a task as completed.
    """
    task, error = TaskService.complete_task(task_id=task_id, current_user=g.current_user)
    if error:
        status_code = 400
        if error["code"] == "TASK_NOT_FOUND":
            status_code = 404
        elif error["code"] == "FORBIDDEN":
            status_code = 403
        return error_response(code=error["code"], message=error["message"], status_code=status_code)

    return success_response(data=task)

@tasks_bp.route("/tasks/<task_id>", methods=["DELETE"])
@require_auth
def delete_task(task_id):
    """
    DELETE /api/tasks/<task_id>
    Deletes task (creator only).
    """
    success, error = TaskService.delete_task(
        task_id=task_id,
        current_user_id=g.current_user["id"],
        current_user=g.current_user
    )
    if error:
        status_code = 400
        if error["code"] == "TASK_NOT_FOUND":
            status_code = 404
        elif error["code"] == "FORBIDDEN":
            status_code = 403
        return error_response(code=error["code"], message=error["message"], status_code=status_code)

    return success_response(data={"deleted": True, "task_id": task_id})

@tasks_bp.route("/tasks/<task_id>/activity", methods=["GET"])
@require_auth
def get_task_activity(task_id):
    """
    GET /api/tasks/<task_id>/activity
    Retrieves chronological task audit log.
    """
    activity, error = TaskService.get_task_activity(task_id=task_id, current_user_id=g.current_user["id"])
    if error:
        status_code = 400
        if error["code"] == "TASK_NOT_FOUND":
            status_code = 404
        elif error["code"] == "FORBIDDEN":
            status_code = 403
        return error_response(code=error["code"], message=error["message"], status_code=status_code)

    return success_response(data=activity)
