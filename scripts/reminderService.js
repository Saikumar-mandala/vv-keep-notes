// scripts/reminderService.js
// This runs continuously on the server to check and send reminders
import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import Note from '../models/Note.js';
import User from '../models/User.js';

// Load .env from project root
dotenv.config({ path: path.join(process.cwd(), '.env') });

const {
  MONGO_URI,
  MONGODB_URI,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  APP_BASE = 'http://localhost:3000'
} = process.env;

const mongoUri = MONGO_URI || MONGODB_URI;
const CHECK_INTERVAL = 60000; // Check every 60 seconds (1 minute)

if (!mongoUri) {
  console.error('MONGO_URI or MONGODB_URI is required in .env');
  process.exit(1);
}

async function connectDB() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

async function createTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️  SMTP config missing. Emails will not be sent.');
    return null;
  }

  const port = Number(SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  // Verify connection
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    return transporter;
  } catch (err) {
    console.error('❌ SMTP verification failed:', err.message);
    return null;
  }
}

function formatLocalString(date) {
  try {
    return new Date(date).toLocaleString();
  } catch (e) {
    return String(date);
  }
}

async function checkAndSendReminders() {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      console.log('⏭️  Skipping reminder check (SMTP not configured)');
      return;
    }

    const now = new Date();
    const due = await Note.find({
      reminderAt: { $ne: null, $lte: now },
      reminderSent: { $ne: true }
    }).populate('owner');

    if (due.length === 0) {
      return; // No reminders due
    }

    console.log(`📧 Found ${due.length} due reminder(s)`);

    for (const note of due) {
      const recipientsSet = new Set();

      // Owner email
      if (note.owner && note.owner.email) {
        recipientsSet.add(note.owner.email);
      } else if (note.owner && typeof note.owner === 'string') {
        try {
          const u = await User.findById(note.owner).lean();
          if (u && u.email) recipientsSet.add(u.email);
        } catch (e) {
          console.warn('⚠️  Failed to populate owner for note', note._id);
        }
      }

      // Collaborators
      (note.collaborators || []).forEach(e => {
        if (e && typeof e === 'string') recipientsSet.add(e);
      });

      const recipients = Array.from(recipientsSet);
      if (!recipients.length) {
        console.warn('⚠️  No recipient for note', note._id, '- marking as sent');
        await Note.findByIdAndUpdate(note._id, { reminderSent: true });
        continue;
      }

      // Compose email
      const noteUrl = `${APP_BASE}/notes/${note._id}`;
      const subject = `Reminder: ${note.title || 'You have a note reminder'}`;
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Note Reminder</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0; padding:0; background-color:#020617; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:radial-gradient(circle at top,#1d4ed8 0,#020617 52%,#020617 100%); padding:26px 0;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background-color:#0b1120; border-radius:18px; overflow:hidden; box-shadow:0 20px 45px rgba(15,23,42,0.9); border:1px solid rgba(148,163,184,0.22);">
                <!-- Header -->
                <tr>
                  <td style="padding:18px 24px 10px 24px; border-bottom:1px solid rgba(148,163,184,0.3);">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
                      <tr>
                        <td align="left">
                          <span style="display:inline-flex; align-items:center; gap:10px;">
                            <span style="display:inline-block; width:30px; height:30px; border-radius:999px; background:radial-gradient(circle,#22c55e,#16a34a); text-align:center; line-height:30px; font-size:18px; color:#ecfdf5;">⏰</span>
                            <span style="color:#e5e7eb; font-weight:700; font-size:18px;">Note Reminder</span>
                          </span>
                        </td>
                        <td align="right" style="color:#9ca3af; font-size:12px;">
                          ${formatLocalString(note.reminderAt)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:22px 24px 8px 24px;">
                    <p style="margin:0 0 8px 0; font-size:14px; color:#e5e7eb;">
                      Hey,
                    </p>
                    <p style="margin:0 0 16px 0; font-size:14px; color:#cbd5f5; line-height:1.6;">
                      This is a friendly reminder for your note:
                    </p>

                    <!-- Note Card -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate; border-spacing:0; background:linear-gradient(145deg,#020617,#020617 45%,#030712 100%); border-radius:12px; border:1px solid rgba(148,163,184,0.35);">
                      <tr>
                        <td style="padding:16px 18px;">
                          <div style="font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:0.12em; margin-bottom:6px;">
                            Reminder
                          </div>
                          <h2 style="margin:0 0 10px 0; font-size:18px; font-weight:600; color:#f9fafb;">
                            ${note.title || 'Untitled Note'}
                          </h2>

                          <p style="margin:0 0 14px 0; font-size:14px; color:#e5e7eb; line-height:1.7; white-space:pre-wrap;">
                            ${(note.content || '(No additional details in this note)')}
                          </p>

                          <div style="margin-top:4px; font-size:12px; color:#9ca3af;">
                            <span style="display:inline-flex; align-items:center; gap:6px;">
                              <span style="display:inline-block; width:8px; height:8px; border-radius:999px; background:radial-gradient(circle,#22c55e,#16a34a);"></span>
                              Reminder time: <span style="color:#e5e7eb; font-weight:500;">${formatLocalString(note.reminderAt)}</span>
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:22px; border-collapse:collapse;">
                      <tr>
                        <td align="left">
                          <a href="${noteUrl}"
                            style="
                              display:inline-block;
                              padding:10px 22px;
                              background:linear-gradient(135deg,#22c55e,#16a34a);
                              color:#022c22;
                              text-decoration:none;
                              border-radius:999px;
                              font-size:14px;
                              font-weight:600;
                              box-shadow:0 10px 30px rgba(34,197,94,0.45);
                            ">
                            Open note
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info -->
                    <p style="margin:18px 0 0 0; font-size:11px; color:#9ca3af; line-height:1.6;">
                      If the button above doesn't work, copy and paste this link into your browser:<br />
                      <span style="word-break:break-all; color:#e5e7eb;">${noteUrl}</span>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:14px 24px 18px 24px; border-top:1px solid rgba(148,163,184,0.3); background:linear-gradient(180deg,#020617,#020617 40%,#020617);">
                    <p style="margin:0; font-size:11px; color:#6b7280; text-align:center; line-height:1.6;">
                      You are receiving this reminder from <strong style="color:#e5e7eb;">Your Notes</strong>.<br/>
                      To stop receiving reminders for this note, update or remove the reminder inside the app.
                    </p>
                  </td>
                </tr>
              </table>

              <div style="margin-top:12px; font-size:11px; color:#6b7280; text-align:center;">
                © ${new Date().getFullYear()} Your Notes. All rights reserved.
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `;


      try {
        await transporter.sendMail({
          from: EMAIL_FROM || SMTP_USER,
          to: recipients.join(','),
          subject,
          html
        });

        console.log(`✅ Sent reminder for note "${note.title || note._id}" -> ${recipients.join(', ')}`);
        await Note.findByIdAndUpdate(note._id, { reminderSent: true });
      } catch (err) {
        console.error('❌ Error sending reminder for note', note._id, ':', err.message);
      }
    }
  } catch (err) {
    console.error('❌ Error in reminder check:', err.message);
  }
}

async function startService() {
  console.log('🚀 Starting Reminder Service...');
  console.log(`⏰ Checking reminders every ${CHECK_INTERVAL / 1000} seconds`);
  
  await connectDB();
  
  // Check immediately on start
  await checkAndSendReminders();
  
  // Then check periodically
  setInterval(async () => {
    await checkAndSendReminders();
  }, CHECK_INTERVAL);

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down reminder service...');
    await mongoose.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down reminder service...');
    await mongoose.disconnect();
    process.exit(0);
  });
}

startService().catch(err => {
  console.error('❌ Failed to start reminder service:', err);
  process.exit(1);
});

