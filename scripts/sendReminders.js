// scripts/sendReminders.js
import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Adjust path to models depending on your project
import Note from '../models/Note.js';
import User from '../models/User.js'; // assumes you have a User model with .email

// load .env from project root
dotenv.config({ path: path.join(process.cwd(), '.env') });

const {
  MONGO_URI,
  MONGODB_URI, // Support both naming conventions
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  APP_BASE = 'http://localhost:3000'
} = process.env;

const mongoUri = MONGO_URI || MONGODB_URI;

if (!mongoUri) {
  console.error('MONGO_URI or MONGODB_URI is required in .env');
  process.exit(1);
}

async function connectDB() {
  await mongoose.connect(mongoUri, {
    // useNewUrlParser: true, useUnifiedTopology: true // mongoose 6+ auto defaults
  });
}

async function createTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP config missing. Emails will not be sent.');
    return null;
  }

  const port = Number(SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587, // Gmail requires TLS on port 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  // verify connection
  try {
    await transporter.verify();
    console.log('SMTP connection OK');
  } catch (err) {
    console.error('SMTP verification failed:', err);
    throw err;
  }

  return transporter;
}

function formatLocalString(date) {
  try {
    return new Date(date).toLocaleString();
  } catch (e) {
    return String(date);
  }
}

async function run() {
  try {
    await connectDB();
    console.log('Connected to DB');

    const transporter = await createTransporter();

    // find notes where reminderAt <= now and reminderSent === false
    const now = new Date();
    // small grace window: include reminders that are very slightly in the future due to clocks
    const due = await Note.find({
      reminderAt: { $ne: null, $lte: now },
      reminderSent: { $ne: true }
    }).populate('owner');

    console.log('Found', due.length, 'due reminder(s)');

    for (const note of due) {
      const recipientsSet = new Set();

      // owner email (owner may be populated or an ObjectId)
      if (note.owner && note.owner.email) {
        recipientsSet.add(note.owner.email);
      } else if (note.owner && typeof note.owner === 'string') {
        // owner is id-string but not populated — try fetch user
        try {
          const u = await User.findById(note.owner).lean();
          if (u && u.email) recipientsSet.add(u.email);
        } catch (e) {
          console.warn('Failed to populate owner for note', note._id);
        }
      }

      // collaborators array (emails)
      (note.collaborators || []).forEach(e => {
        if (e && typeof e === 'string') recipientsSet.add(e);
      });

      const recipients = Array.from(recipientsSet);
      if (!recipients.length) {
        console.warn('No recipient for note', note._id, '- marking as sent to avoid loop');
        await Note.findByIdAndUpdate(note._id, { reminderSent: true });
        continue;
      }

      // Compose email
      const noteUrl = `${APP_BASE}/notes/${note._id}`;
      const subject = `Reminder: ${note.title || 'You have a note reminder'}`;
      const html = `
        <p><strong>${note.title || 'Note'}</strong></p>
        <p>${note.content || ''}</p>
        <p>Reminder time: ${formatLocalString(note.reminderAt)}</p>
        <p><a href="${noteUrl}">Open note</a></p>
      `;

      if (!transporter) {
        // If no transporter (SMTP not configured), log and mark as sent (you may want different behavior)
        console.log(`(NO SMTP) Would send to ${recipients.join(', ')}: ${subject}`);
        await Note.findByIdAndUpdate(note._id, { reminderSent: true });
        continue;
      }

      try {
        await transporter.sendMail({
          from: EMAIL_FROM || SMTP_USER,
          to: recipients.join(','),
          subject,
          html
        });

        console.log(`Sent reminder for note ${note._id} -> ${recipients.join(',')}`);

        // mark as sent
        await Note.findByIdAndUpdate(note._id, { reminderSent: true });
      } catch (err) {
        console.error('Error sending reminder for note', note._id, err);
        // Do NOT mark as sent so the script can retry next run.
        // Optionally add retry counter field in Note schema for retry/backoff.
      }
    }
  } catch (err) {
    console.error('Worker error', err);
  } finally {
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(0);
  }
}

run();
