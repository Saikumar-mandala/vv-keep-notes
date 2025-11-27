# Google Keep Clone (Next.js + Tailwind + Mongoose)

## What this scaffold includes

- Next.js (pages router) frontend + backend API in `pages/api`
- Tailwind CSS setup
- Mongoose connection helper
- Basic JWT auth (register/login)
- Notes API with reminder time
- Collaboration: invite collaborators by email (stored on note)
- Admin API for managing users
- Local development: expects a running MongoDB (local)

## Setup

1. Create a `.env` file in the project root with the following variables:

   ```
   MONGO_URI=mongodb://localhost:27017/google-keep-clone
   JWT_SECRET=your-secret-key-change-this
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-gmail-app-password
   EMAIL_FROM=your-email@gmail.com
   APP_BASE=http://localhost:3000
   ```

2. **Gmail SMTP Setup (Free)**:

   - Enable 2-Step Verification on your Google Account
   - Generate an App Password: Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)" and enter "Google Keep Clone"
   - Copy the 16-character password and use it as `SMTP_PASS` in your `.env` file
   - Use your Gmail address for `SMTP_USER` and `EMAIL_FROM`

3. `npm install`
4. `npm run dev`
5. Open http://localhost:3000

## Email Reminders

The app includes an **automatic reminder system** that sends emails when note reminders are due.

### 🚀 Start the Reminder Service (Required for Background Notifications)

**For the reminders to work even when your browser is closed**, you need to run the reminder service:

**Windows:**

```bash
npm run reminders
# OR double-click: scripts/startReminderService.bat
```

**Mac/Linux:**

```bash
npm run reminders
# OR: bash scripts/startReminderService.sh
```

This service runs continuously in the background and checks for due reminders every 60 seconds.

### 📧 How It Works

1. **Create a note** with a reminder time (e.g., 10 minutes from now)
2. **Start the reminder service** (see above)
3. **Close your browser** - the service keeps running
4. **You'll receive an email** when the reminder time arrives

### 🔧 Alternative Methods

- **Manual check**: `npm run reminders:check` (runs once and exits)
- **API endpoint**: `POST /api/reminders/check` (can be called from cron jobs)
- **Client-side**: Reminders also check every 2 minutes when the notes page is open (but this stops when browser closes)

### 🖥️ Production Deployment

For production, you can:

1. Run the reminder service as a background process (PM2, systemd, etc.)
2. Use a cron job to call the API endpoint every minute
3. Use a cloud scheduler (Vercel Cron, AWS EventBridge, etc.)

**Example PM2 setup:**

```bash
pm2 start scripts/reminderService.js --name "reminder-service"
pm2 save
pm2 startup
```

## Notes

- This scaffold is functional but minimal — extend UI, security, validation, and production readiness as needed.
