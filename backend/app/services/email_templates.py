import html
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple

def parse_iso_datetime(dt_val: Any) -> Optional[datetime]:
    """Safely parse various datetime representations into UTC datetime."""
    if not dt_val:
        return None
    if isinstance(dt_val, datetime):
        if dt_val.tzinfo is None:
            return dt_val.replace(tzinfo=timezone.utc)
        return dt_val.astimezone(timezone.utc)
    try:
        clean_str = str(dt_val).strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None

def format_datetime_pretty(dt_val: Any) -> str:
    """Format datetime into a clean, professional string like 'October 08, 2026, 06:14 PM UTC'."""
    dt = parse_iso_datetime(dt_val)
    if not dt:
        return "Not specified"
    return dt.strftime("%B %d, %Y, %I:%M %p UTC")

def format_duration(seconds: float) -> str:
    """Format total seconds into human-readable duration."""
    if seconds < 0:
        seconds = 0
    total_seconds = int(seconds)
    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60
    
    parts = []
    if days > 0:
        parts.append(f"{days} day{'s' if days != 1 else ''}")
    if hours > 0:
        parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    if minutes > 0 or not parts:
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
    
    return ", ".join(parts)

def calculate_task_performance(
    created_at_val: Any,
    completed_at_val: Any,
    due_date_val: Any
) -> Dict[str, Any]:
    """
    Computes precise turnaround metrics and deadline/overdue analysis.
    Returns structured stats for templates.
    """
    created_at = parse_iso_datetime(created_at_val) or datetime.now(timezone.utc)
    completed_at = parse_iso_datetime(completed_at_val) or datetime.now(timezone.utc)
    due_date = parse_iso_datetime(due_date_val)

    # 1. Turnaround time needed to complete task
    turnaround_seconds = max(0.0, (completed_at - created_at).total_seconds())
    turnaround_str = format_duration(turnaround_seconds)

    # 2. Overdue / On-time analysis
    has_due_date = due_date is not None
    is_overdue = False
    schedule_summary = ""
    status_tag = ""
    badge_bg = "#f1f5f9"
    badge_color = "#475569"
    badge_border = "#cbd5e1"

    if has_due_date and due_date:
        diff_from_due = (completed_at - due_date).total_seconds()
        if diff_from_due > 60:  # Completed more than 1 min past due date
            is_overdue = True
            delta_str = format_duration(diff_from_due)
            schedule_summary = f"Overdue by {delta_str}"
            status_tag = "COMPLETED AFTER DEADLINE"
            badge_bg = "#fef2f2"
            badge_color = "#b91c1c"
            badge_border = "#fecaca"
        else:
            is_overdue = False
            ahead_seconds = abs(diff_from_due)
            if ahead_seconds >= 60:
                ahead_str = format_duration(ahead_seconds)
                schedule_summary = f"Completed {ahead_str} ahead of deadline"
            else:
                schedule_summary = "Completed right on schedule"
            status_tag = "ON TIME"
            badge_bg = "#ecfdf5"
            badge_color = "#047857"
            badge_border = "#a7f3d0"
    else:
        schedule_summary = "Completed on demand (no fixed deadline was set)"
        status_tag = "NO DEADLINE"
        badge_bg = "#f8fafc"
        badge_color = "#475569"
        badge_border = "#e2e8f0"

    return {
        "turnaround_str": turnaround_str,
        "turnaround_seconds": turnaround_seconds,
        "has_due_date": has_due_date,
        "is_overdue": is_overdue,
        "schedule_summary": schedule_summary,
        "status_tag": status_tag,
        "badge_bg": badge_bg,
        "badge_color": badge_color,
        "badge_border": badge_border,
        "created_formatted": format_datetime_pretty(created_at),
        "completed_formatted": format_datetime_pretty(completed_at),
        "due_formatted": format_datetime_pretty(due_date) if due_date else "No deadline set",
    }

def get_priority_style(priority: str) -> Dict[str, str]:
    p = (priority or "medium").lower()
    styles = {
        "urgent": {"bg": "#fee2e2", "color": "#991b1b", "border": "#f87171", "label": "URGENT"},
        "high": {"bg": "#ffedd5", "color": "#9a3412", "border": "#fb923c", "label": "HIGH"},
        "medium": {"bg": "#e0e7ff", "color": "#3730a3", "border": "#818cf8", "label": "MEDIUM"},
        "low": {"bg": "#f1f5f9", "color": "#334155", "border": "#94a3b8", "label": "LOW"},
    }
    return styles.get(p, styles["medium"])

def build_base_email(
    preheader: str,
    hero_badge: str,
    hero_title: str,
    content_html: str,
    cta_text: Optional[str] = None,
    cta_url: Optional[str] = None,
    badge_bg: str = "#eef2ff",
    badge_color: str = "#4338ca",
    badge_border: str = "#c7d2fe"
) -> str:
    """Wraps content in a responsive, modern HTML email layout with inline styles."""
    cta_block = ""
    if cta_text and cta_url:
        cta_block = f"""
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 12px 0; width: 100%;">
          <tr>
            <td align="center">
              <a href="{html.escape(cta_url)}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; letter-spacing: -0.2px;">
                {html.escape(cta_text)} &rarr;
              </a>
            </td>
          </tr>
        </table>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(hero_title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <!-- Preview snippet in inbox -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-width: 0px; opacity: 0; color: transparent;">
    {html.escape(preheader)}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc; padding: 36px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.05);">
          <!-- Top Accent Line -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #4f46e5 0%, #6366f1 50%, #3b82f6 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 18px 32px; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; vertical-align: middle;">
                      <div style="width: 32px; height: 32px; background: #4f46e5; border-radius: 8px; text-align: center; line-height: 32px; color: #ffffff; font-weight: 800; font-size: 16px; display: inline-block; vertical-align: middle;">
                        H
                      </div>
                      <span style="font-size: 16px; font-weight: 700; color: #0f172a; margin-left: 10px; vertical-align: middle; letter-spacing: -0.3px;">
                        Hairdrama Task Hub
                      </span>
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: {badge_bg}; color: {badge_color}; border: 1px solid {badge_border}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 9999px;">
                      {html.escape(hero_badge)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.4px; line-height: 1.3;">
                {html.escape(hero_title)}
              </h1>
              {content_html}
              {cta_block}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                This notification was dispatched automatically by <strong>Hairdrama Task Hub</strong>.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; 2026 Hairdrama Task Management Hub. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

# ==============================================================================
# 1. WELCOME EMAIL (ACCOUNT CREATION)
# ==============================================================================
def render_welcome_email(
    user: Dict[str, Any],
    frontend_url: str = "http://localhost:3000",
    temporary_password: Optional[str] = None
) -> Tuple[str, str]:
    """Generates creative welcome email on account creation."""
    user_name = user.get("full_name") or user.get("name") or (user.get("email", "").split("@")[0] if user.get("email") else "there")
    user_email = user.get("email", "")
    dashboard_url = f"{frontend_url.rstrip('/')}/dashboard"

    cred_html = ""
    cred_text = ""
    if temporary_password:
        cred_html = f"""
        <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 10px; padding: 14px 18px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #854d0e; text-transform: uppercase;">Temporary Account Credentials</p>
          <p style="margin: 0; font-size: 13px; color: #a16207; font-family: monospace;">
            Email: <strong>{html.escape(user_email)}</strong><br>
            Password: <strong>{html.escape(temporary_password)}</strong>
          </p>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #ca8a04;">Please log in and update your password immediately.</p>
        </div>
        """
        cred_text = f"\nTemporary Credentials:\nEmail: {user_email}\nPassword: {temporary_password}\n"

    content_html = f"""
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
      Hi <strong>{html.escape(user_name)}</strong>, welcome to <strong>Hairdrama Task Hub</strong>!
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">
      Your workspace account has been initialized. You can now manage your projects, collaborate with team members, track deadlines, and maintain audit visibility.
    </p>

    {cred_html}

    <!-- Features Overview -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin: 20px 0;">
      <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Workspace Capabilities</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="20" valign="top" style="padding-bottom: 10px; color: #4f46e5; font-size: 14px; font-weight: bold;">&#8226;</td>
          <td style="padding-bottom: 10px; font-size: 13px; color: #334155;">
            <strong>Task Prioritization:</strong> Organize workloads by urgency, priority, and deadlines.
          </td>
        </tr>
        <tr>
          <td width="20" valign="top" style="padding-bottom: 10px; color: #4f46e5; font-size: 14px; font-weight: bold;">&#8226;</td>
          <td style="padding-bottom: 10px; font-size: 13px; color: #334155;">
            <strong>Velocity Tracking:</strong> Monitor execution speed and turnaround analytics automatically.
          </td>
        </tr>
        <tr>
          <td width="20" valign="top" style="color: #4f46e5; font-size: 14px; font-weight: bold;">&#8226;</td>
          <td style="font-size: 13px; color: #334155;">
            <strong>Complete Audit History:</strong> Every change, assignment, and completion is securely logged.
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 16px 0 0 0; font-size: 14px; color: #475569;">
      Click below to launch your personal dashboard and get started.
    </p>
    """

    html_email = build_base_email(
        preheader=f"Welcome to Hairdrama Task Hub, {user_name}! Your workspace is ready.",
        hero_badge="WELCOME",
        hero_title="Your Workspace is Ready",
        content_html=content_html,
        cta_text="Launch Your Dashboard",
        cta_url=dashboard_url,
        badge_bg="#e0e7ff",
        badge_color="#3730a3",
        badge_border="#c7d2fe"
    )

    text_email = (
        f"Welcome to Hairdrama Task Hub, {user_name}!\n\n"
        f"Your account has been successfully created. You can now collaborate on tasks, track turnaround velocity, and manage deadlines with team visibility.\n"
        f"{cred_text}\n"
        f"Dashboard: {dashboard_url}\n\n"
        f"Enjoy your workspace!\n- The Hairdrama Task Hub Team"
    )

    return html_email, text_email


# ==============================================================================
# 2. TASK CREATED EMAIL
# ==============================================================================
def render_task_created_email(
    task: Dict[str, Any],
    creator: Dict[str, Any],
    assignee: Optional[Dict[str, Any]] = None,
    frontend_url: str = "http://localhost:3000"
) -> Tuple[str, str]:
    """Generates detailed task creation email with clean typography and badges."""
    task_id = task.get("id", "")
    task_title = task.get("title", "Untitled Task")
    task_desc = task.get("description", "").strip() or "No description provided."
    priority = task.get("priority", "medium")
    due_date_str = format_datetime_pretty(task.get("due_date"))
    created_str = format_datetime_pretty(task.get("created_at"))

    creator_name = creator.get("full_name") or creator.get("email", "").split("@")[0] or "A teammate"
    creator_email = creator.get("email", "")

    assignee_name = "Unassigned"
    assignee_email = ""
    if assignee:
        assignee_name = assignee.get("full_name") or assignee.get("email", "").split("@")[0] or "Assigned"
        assignee_email = assignee.get("email", "")

    p_style = get_priority_style(priority)
    task_url = f"{frontend_url.rstrip('/')}/tasks/{task_id}" if task_id else f"{frontend_url.rstrip('/')}/dashboard"

    content_html = f"""
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
      A new task has been created by <strong>{html.escape(creator_name)}</strong> in your workspace:
    </p>

    <!-- Task Overview Card -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 18px 0;">
      <div style="margin-bottom: 12px;">
        <span style="display: inline-block; background-color: {p_style['bg']}; color: {p_style['color']}; border: 1px solid {p_style['border']}; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 9999px; text-transform: uppercase; margin-right: 6px;">
          {p_style['label']}
        </span>
        <span style="display: inline-block; background-color: #e2e8f0; color: #334155; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 9999px; text-transform: uppercase;">
          STATUS: TO DO
        </span>
      </div>

      <h2 style="margin: 0 0 10px 0; font-size: 17px; font-weight: 700; color: #0f172a; line-height: 1.4;">
        {html.escape(task_title)}
      </h2>

      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;">
        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Description</p>
        <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">{html.escape(task_desc)}</p>
      </div>

      <!-- Metadata Table -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 13px;">
        <tr>
          <td width="35%" style="padding: 5px 0; color: #64748b; font-weight: 500;">Target Deadline:</td>
          <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">{html.escape(due_date_str)}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748b; font-weight: 500;">Assignee:</td>
          <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">
            {html.escape(assignee_name)} {f'<span style="color: #64748b; font-weight: normal; font-size: 12px;">({html.escape(assignee_email)})</span>' if (assignee_email and assignee_email != assignee_name) else ''}
          </td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748b; font-weight: 500;">Created By:</td>
          <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">
            {html.escape(creator_name)} {f'<span style="color: #64748b; font-weight: normal; font-size: 12px;">({html.escape(creator_email)})</span>' if (creator_email and creator_email != creator_name) else ''}
          </td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748b; font-weight: 500;">Created At:</td>
          <td style="padding: 5px 0; color: #475569;">{html.escape(created_str)}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 13px; color: #64748b;">
      You can track this item and update its progress directly from your workspace.
    </p>
    """

    html_email = build_base_email(
        preheader=f"Task Created: {task_title} | Due: {due_date_str}",
        hero_badge="TASK CREATED",
        hero_title="New Task Created",
        content_html=content_html,
        cta_text="View Task Details",
        cta_url=task_url,
        badge_bg="#eff6ff",
        badge_color="#1d4ed8",
        badge_border="#bfdbfe"
    )

    text_email = (
        f"[Task Created] {task_title}\n\n"
        f"A new task has been created in Hairdrama Task Hub:\n\n"
        f"- Title: {task_title}\n"
        f"- Priority: {priority.upper()}\n"
        f"- Status: TO DO\n"
        f"- Due Date: {due_date_str}\n"
        f"- Assignee: {assignee_name}\n"
        f"- Created By: {creator_name}\n"
        f"- Description: {task_desc}\n\n"
        f"View task: {task_url}\n"
    )

    return html_email, text_email


# ==============================================================================
# 3. TASK COMPLETED EMAIL (WITH DETAILED TURNAROUND & OVERDUE ANALYSIS)
# ==============================================================================
def render_task_completed_email(
    task: Dict[str, Any],
    completed_by: Dict[str, Any],
    recipient: Dict[str, Any],
    frontend_url: str = "http://localhost:3000"
) -> Tuple[str, str]:
    """
    Generates rich completion email with comprehensive turnaround duration,
    overdue vs on-time audit, and performance breakdown.
    """
    task_id = task.get("id", "")
    task_title = task.get("title", "Untitled Task")
    task_desc = task.get("description", "").strip() or "No description provided."
    priority = task.get("priority", "medium")

    completer_name = completed_by.get("full_name") or completed_by.get("email", "").split("@")[0] or "A collaborator"
    completer_email = completed_by.get("email", "")

    perf = calculate_task_performance(
        created_at_val=task.get("created_at"),
        completed_at_val=task.get("completed_at"),
        due_date_val=task.get("due_date")
    )

    p_style = get_priority_style(priority)
    task_url = f"{frontend_url.rstrip('/')}/tasks/{task_id}" if task_id else f"{frontend_url.rstrip('/')}/dashboard"

    content_html = f"""
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
      Great news! <strong>{html.escape(completer_name)}</strong> has completed the following task:
    </p>

    <!-- Performance Analytics Banner -->
    <div style="background-color: {perf['badge_bg']}; border: 1px solid {perf['badge_border']}; border-radius: 10px; padding: 18px 20px; margin: 18px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td valign="middle">
            <span style="display: inline-block; background-color: #ffffff; color: {perf['badge_color']}; border: 1px solid {perf['badge_border']}; font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 6px;">
              {perf['status_tag']}
            </span>
            <div style="font-size: 14px; font-weight: 700; color: {perf['badge_color']};">
              {html.escape(perf['schedule_summary'])}
            </div>
          </td>
        </tr>
      </table>

      <!-- Metrics Scorecard -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 14px; border-top: 1px solid {perf['badge_border']}; padding-top: 12px;">
        <tr>
          <td width="50%" valign="top">
            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Time Needed to Complete</p>
            <p style="margin: 4px 0 0 0; font-size: 17px; font-weight: 800; color: #0f172a;">
              {html.escape(perf['turnaround_str'])}
            </p>
          </td>
          <td width="50%" valign="top">
            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Target Deadline</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 700; color: #334155;">
              {html.escape(perf['due_formatted'])}
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Complete Task Details Card -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 18px 0;">
      <div style="margin-bottom: 12px;">
        <span style="display: inline-block; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 9999px; text-transform: uppercase; margin-right: 6px;">
          STATUS: COMPLETED
        </span>
        <span style="display: inline-block; background-color: {p_style['bg']}; color: {p_style['color']}; border: 1px solid {p_style['border']}; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 9999px; text-transform: uppercase;">
          {p_style['label']}
        </span>
      </div>

      <h2 style="margin: 0 0 10px 0; font-size: 17px; font-weight: 700; color: #0f172a; line-height: 1.4;">
        {html.escape(task_title)}
      </h2>

      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px;">
        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Description</p>
        <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">{html.escape(task_desc)}</p>
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 13px;">
        <tr>
          <td width="35%" style="padding: 5px 0; color: #64748b; font-weight: 500;">Completed By:</td>
          <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">
            {html.escape(completer_name)} {f'<span style="color: #64748b; font-weight: normal; font-size: 12px;">({html.escape(completer_email)})</span>' if (completer_email and completer_email != completer_name) else ''}
          </td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748b; font-weight: 500;">Created At:</td>
          <td style="padding: 5px 0; color: #334155;">{html.escape(perf['created_formatted'])}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748b; font-weight: 500;">Completed At:</td>
          <td style="padding: 5px 0; color: #047857; font-weight: 700;">{html.escape(perf['completed_formatted'])}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748b; font-weight: 500;">Total Duration:</td>
          <td style="padding: 5px 0; color: #0f172a; font-weight: 700;">{html.escape(perf['turnaround_str'])}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 13px; color: #64748b;">
      The task timeline and completion audit have been permanently recorded in your workspace.
    </p>
    """

    html_email = build_base_email(
        preheader=f"Task Completed: {task_title} | Turnaround: {perf['turnaround_str']} ({perf['status_tag']})",
        hero_badge="TASK COMPLETED",
        hero_title="Task Completed Successfully",
        content_html=content_html,
        cta_text="Review Completed Task",
        cta_url=task_url,
        badge_bg="#ecfdf5",
        badge_color="#047857",
        badge_border="#a7f3d0"
    )

    text_email = (
        f"[Task Completed] {task_title}\n\n"
        f"Marked as COMPLETED by {completer_name}.\n\n"
        f"PERFORMANCE BREAKDOWN:\n"
        f"- Time Needed to Complete: {perf['turnaround_str']}\n"
        f"- Schedule Status: {perf['status_tag']} ({perf['schedule_summary']})\n"
        f"- Target Deadline: {perf['due_formatted']}\n"
        f"- Created At: {perf['created_formatted']}\n"
        f"- Completed At: {perf['completed_formatted']}\n\n"
        f"TASK DETAILS:\n"
        f"- Title: {task_title}\n"
        f"- Priority: {priority.upper()}\n"
        f"- Description: {task_desc}\n\n"
        f"View task: {task_url}\n"
    )

    return html_email, text_email


# ==============================================================================
# 4. TASK DELETED EMAIL
# ==============================================================================
def render_task_deleted_email(
    task: Dict[str, Any],
    deleted_by: Dict[str, Any],
    recipient: Dict[str, Any],
    frontend_url: str = "http://localhost:3000"
) -> Tuple[str, str]:
    """Generates confirmation notification when a task is permanently deleted."""
    task_title = task.get("title", "Untitled Task")
    task_desc = task.get("description", "").strip() or "No description recorded."
    priority = task.get("priority", "medium")
    last_status = (task.get("status") or "todo").upper().replace("_", " ")

    deleter_name = deleted_by.get("full_name") or deleted_by.get("email", "").split("@")[0] or "Task Creator"
    deleter_email = deleted_by.get("email", "")
    deleted_time_str = format_datetime_pretty(datetime.now(timezone.utc))

    dashboard_url = f"{frontend_url.rstrip('/')}/dashboard"

    content_html = f"""
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
      A task in your Hairdrama Task Hub workspace has been permanently removed by <strong>{html.escape(deleter_name)}</strong>:
    </p>

    <!-- Deletion Notice Card -->
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 20px; margin: 18px 0;">
      <div style="margin-bottom: 12px;">
        <span style="display: inline-block; background-color: #b91c1c; color: #ffffff; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 9999px; text-transform: uppercase; margin-right: 6px;">
          DELETED
        </span>
        <span style="display: inline-block; background-color: #ffffff; color: #7f1d1d; border: 1px solid #fca5a5; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 9999px; text-transform: uppercase;">
          LAST STATUS: {html.escape(last_status)}
        </span>
      </div>

      <h2 style="margin: 0 0 10px 0; font-size: 17px; font-weight: 700; color: #991b1b; text-decoration: line-through; line-height: 1.4;">
        {html.escape(task_title)}
      </h2>

      <div style="background-color: #ffffff; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px;">
        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">Recorded Description</p>
        <p style="margin: 0; font-size: 13px; color: #7f1d1d; line-height: 1.5;">{html.escape(task_desc)}</p>
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 13px;">
        <tr>
          <td width="35%" style="padding: 5px 0; color: #7f1d1d; font-weight: 600;">Deleted By:</td>
          <td style="padding: 5px 0; color: #991b1b; font-weight: 700;">
            {html.escape(deleter_name)} {f'<span style="color: #991b1b; font-weight: normal; font-size: 12px;">({html.escape(deleter_email)})</span>' if (deleter_email and deleter_email != deleter_name) else ''}
          </td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #7f1d1d; font-weight: 600;">Deleted At:</td>
          <td style="padding: 5px 0; color: #7f1d1d;">{html.escape(deleted_time_str)}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #7f1d1d; font-weight: 600;">Priority:</td>
          <td style="padding: 5px 0; color: #7f1d1d;">{html.escape(priority.upper())}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 13px; color: #64748b;">
      The deletion event has been recorded in the system audit timeline for workspace integrity.
    </p>
    """

    html_email = build_base_email(
        preheader=f"Task Deleted: {task_title} was deleted by {deleter_name}",
        hero_badge="TASK DELETED",
        hero_title="Task Removed from Workspace",
        content_html=content_html,
        cta_text="Return to Dashboard",
        cta_url=dashboard_url,
        badge_bg="#fee2e2",
        badge_color="#991b1b",
        badge_border="#fca5a5"
    )

    text_email = (
        f"[Task Deleted] {task_title}\n\n"
        f"A task has been permanently deleted from Hairdrama Task Hub.\n\n"
        f"- Task Title: {task_title}\n"
        f"- Deleted By: {deleter_name}\n"
        f"- Deleted At: {deleted_time_str}\n"
        f"- Last Status: {last_status}\n"
        f"- Priority: {priority.upper()}\n"
        f"- Description: {task_desc}\n\n"
        f"Dashboard: {dashboard_url}\n"
    )

    return html_email, text_email
