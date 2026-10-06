import os
import sys

# Ensure backend root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.utils.supabase_client import get_supabase_client

MOCK_USERS = [
    {
        "email": "sarah.jenkins@hairdrama.com",
        "full_name": "Sarah Jenkins",
        "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    },
    {
        "email": "alex.rivera@hairdrama.com",
        "full_name": "Alex Rivera",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    },
    {
        "email": "priya.sharma@hairdrama.com",
        "full_name": "Priya Sharma",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    },
    {
        "email": "marcus.chen@hairdrama.com",
        "full_name": "Marcus Chen",
        "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    },
    {
        "email": "emily.watson@hairdrama.com",
        "full_name": "Emily Watson",
        "avatar_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    },
]

def seed_users():
    supabase = get_supabase_client()
    print("--- Seeding Mock Workspace Accounts ---")
    
    # Check existing profiles
    existing_res = supabase.table("profiles").select("email").execute()
    existing_emails = {p["email"].lower() for p in (existing_res.data or [])}
    
    created_count = 0
    for user_info in MOCK_USERS:
        email = user_info["email"]
        if email.lower() in existing_emails:
            print(f"[-] User already exists: {email}")
            continue
            
        try:
            res = supabase.auth.admin.create_user({
                "email": email,
                "password": "Password123!",
                "email_confirm": True,
                "user_metadata": {
                    "full_name": user_info["full_name"],
                    "avatar_url": user_info["avatar_url"],
                }
            })
            if res.user:
                print(f"[+] Successfully created: {user_info['full_name']} ({email}) -> {res.user.id}")
                created_count += 1
            else:
                print(f"[!] Warning creating {email}: {res}")
        except Exception as e:
            # If user already exists in auth.users, backfill into profiles
            print(f"[!] Auth create notice for {email}: {e}")
            
    print(f"--- Seeding Completed: {created_count} new accounts added ---")

if __name__ == "__main__":
    seed_users()
