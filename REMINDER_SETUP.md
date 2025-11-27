# 📧 Reminder Service Setup Guide

## Problem Solved
Your reminders now work **even when your browser is closed**! 

## Quick Start

### Step 1: Start Your Next.js App
```bash
npm run dev
```

### Step 2: Start the Reminder Service (in a separate terminal)
```bash
npm run reminders
```

**That's it!** The reminder service will now check for due reminders every 60 seconds, even when your browser is closed.

## How to Use

1. **Open your app** in browser: `http://localhost:3000`
2. **Login/Register** and create a note
3. **Set a reminder time** (e.g., 10 minutes from now)
4. **Start the reminder service** in a separate terminal: `npm run reminders`
5. **Close your browser** - the service keeps running!
6. **You'll receive an email** when the reminder time arrives

## Windows Users

You can also double-click:
- `scripts/startReminderService.bat`

## What the Service Does

- ✅ Runs continuously in the background
- ✅ Checks for due reminders every 60 seconds
- ✅ Sends email notifications automatically
- ✅ Works even when browser is closed
- ✅ Handles errors gracefully

## Stopping the Service

Press `Ctrl+C` in the terminal where the service is running.

## Production Deployment

For production, use a process manager like PM2:

```bash
# Install PM2
npm install -g pm2

# Start the reminder service
pm2 start scripts/reminderService.js --name "reminder-service"

# Make it start on system boot
pm2 save
pm2 startup
```

## Troubleshooting

**No emails received?**
1. Check your `.env` file has correct Gmail SMTP settings
2. Make sure you're using a Gmail App Password (not regular password)
3. Check the service console for error messages
4. Verify your note has a valid reminder time set

**Service won't start?**
1. Make sure MongoDB is running
2. Check your `.env` file has `MONGO_URI` or `MONGODB_URI`
3. Verify all dependencies are installed: `npm install`

