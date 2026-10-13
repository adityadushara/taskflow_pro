# 🚀 Getting Started with Hairdrama Task Management App

This guide walks you through setting up and running the entire full-stack application, including the **Flask Backend (BE)**, **Next.js Frontend (FE)**, **Supabase Database & Auth**, and **Direct Gmail Transactional Email Integration**.

---

## 📋 System Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **Python**: v3.10 or higher ([Download Python](https://www.python.org/))
- **Git**

---

## ⚡ Quick Start (Two-Terminal Launch)

To run the application locally, you will open **two separate terminal windows**:

| Component | Directory | Port | Local URL |
| :--- | :--- | :--- | :--- |
| **Backend (Flask REST API)** | `backend/` | `5000` | [http://localhost:5000/api/health](http://localhost:5000/api/health) |
| **Frontend (Next.js App)** | `frontend/` | `3000` | [http://localhost:3000](http://localhost:3000) |

---

## 🖥️ Terminal 1: Start the Backend (Flask API)

### 1. Open Terminal & Navigate to `backend`
```bash
cd "d:\projects\TASK MANAGEMENT APP\backend"
```

### 2. Activate Python Virtual Environment
An existing virtual environment is already available in `backend/venv`.

- **On Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
  *(If PowerShell displays an execution policy error, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*

- **On Windows (Command Prompt `cmd`)**:
  ```cmd
  venv\Scripts\activate.bat
  ```

- **On macOS / Linux**:
  ```bash
  source venv/bin/activate
  ```

*(If you ever need to create a fresh virtual environment from scratch: `python -m venv venv` followed by `pip install -r requirements.txt`).*

### 3. Verify Dependencies
```bash
pip install -r requirements.txt
```

### 4. Check Backend Environment Configuration (`.env`)
Make sure your `backend/.env` file contains your credentials:
```env
FLASK_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Supabase Server Settings
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Direct Gmail Transactional Email Settings
EMAIL_PROVIDER=gmail_webhook # or 'gmail' for direct SMTP
GMAIL_WEBHOOK_URL=your_google_mail_webhook_url
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_character_app_password
EMAIL_FROM=Hairdrama Tasks <your_email@gmail.com>
```

### 5. Start the Backend Server
```bash
python run.py
```
**Expected Output:**
```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

### 6. Verify Backend Health
Open [http://localhost:5000/api/health](http://localhost:5000/api/health) in your browser. You should receive:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## 🌐 Terminal 2: Start the Frontend (Next.js)

### 1. Open a New Terminal & Navigate to `frontend`
```bash
cd "d:\projects\TASK MANAGEMENT APP\frontend"
```

### 2. Install Dependencies (First time only)
```bash
npm install
```

### 3. Check Frontend Environment Configuration (`.env.local`)
Verify that `frontend/.env.local` contains:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Start the Frontend Development Server
```bash
npm run dev
```
**Expected Output:**
```
  ▲ Next.js 16.x
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 1.5s
```

### 5. Launch the Web Application
Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📧 Email Notification Features (Direct Gmail Integration)

The application automatically sends styled transactional HTML emails directly from your Gmail account:
1. **Account Creation**: Welcome email with feature highlights when a user joins or is provisioned.
2. **Task Created**: Instant notification with task title, priority badge, due date, and description.
3. **Task Completed**: Includes comprehensive **Turnaround Time** (e.g. `2 days, 4 hours`) and an **On-Time vs Overdue** performance scorecard.
4. **Task Deleted**: Audit confirmation with deleted task snapshot and deleter identity.

### Direct Gmail Setup (App Password):
1. Enable **2-Step Verification** on your Google Account: [myaccount.google.com/security](https://myaccount.google.com/security).
2. Go to **App Passwords**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Create an app password named `Task Manager` and copy the 16-character code (e.g. `abcd efgh ijkl mnop`).
4. Update `backend/.env`:
   ```env
   EMAIL_PROVIDER=gmail
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_16_character_app_password
   EMAIL_FROM=Hairdrama Tasks <your_email@gmail.com>
   ```
5. Restart your backend (`python run.py`). Emails will now be sent directly from your Gmail account to any recipient without any 3rd-party software!

---

## 🧪 Running Automated Backend Tests

To run the complete test suite (verifying authentication, authorization, task lifecycle, and email pipelines):

```bash
cd "d:\projects\TASK MANAGEMENT APP\backend"
.\venv\Scripts\python.exe -m pytest -v
```

---

## 🛠️ Common Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **Port 5000 already in use** | Find and terminate the process using port 5000: `netstat -ano \| findstr :5000` and `taskkill /PID <PID> /F`, or change `PORT=5001` in `backend/.env` and `NEXT_PUBLIC_API_URL` in `frontend/.env.local`. |
| **PowerShell script execution disabled** | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in your PowerShell window before activating `venv`. |
| **CORS errors in browser console** | Ensure `FRONTEND_URL=http://localhost:3000` in `backend/.env` matches the URL you use to open the frontend. |
| **Missing Python packages** | Run `pip install -r requirements.txt` inside the activated virtual environment. |
| **Next.js cache corruption** | Delete `frontend/.next` folder and run `npm run dev` again. |
