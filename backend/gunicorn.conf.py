import os

# Dynamically resolve Railway or Render PORT environment variable
port = os.environ.get("PORT", "5000")
bind = f"0.0.0.0:{port}"

# Concurrency settings
workers = 2
threads = 4
timeout = 120
