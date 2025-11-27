// pages/api/reminders/check.js
import dbConnect from '../../../utils/mongoose';
import Note from '../../../models/Note';
import User from '../../../models/User';
import nodemailer from 'nodemailer';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  APP_BASE = 'http://localhost:3000'
} = process.env;

async function createTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  const port = Number(SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

function formatLocalString(date) {
  try {
    return new Date(date).toLocaleString();
  } catch (e) {
    return String(date);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const transporter = await createTransporter();
    if (!transporter) {
      return res.status(500).json({ 
        error: 'SMTP not configured',
        message: 'Please configure SMTP settings in .env file'
      });
    }

    // Find notes where reminderAt <= now and reminderSent === false
    const now = new Date();
    const due = await Note.find({
      reminderAt: { $ne: null, $lte: now },
      reminderSent: { $ne: true }
    }).populate('owner');

    console.log('Found', due.length, 'due reminder(s)');

    const results = {
      checked: due.length,
      sent: 0,
      errors: []
    };

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
          console.warn('Failed to populate owner for note', note._id);
        }
      }

      // Collaborators
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reminder: ${note.title || 'Note'}</h2>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${note.content || ''}</p>
          </div>
          <p style="color: #666; font-size: 14px;">Reminder time: ${formatLocalString(note.reminderAt)}</p>
          <p style="margin-top: 20px;">
            <a href="${noteUrl}" style="background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Open note</a>
          </p>
        </div>
      `;

      try {
        await transporter.sendMail({
          from: EMAIL_FROM || SMTP_USER,
          to: recipients.join(','),
          subject,
          html
        });

        console.log(`Sent reminder for note ${note._id} -> ${recipients.join(',')}`);
        await Note.findByIdAndUpdate(note._id, { reminderSent: true });
        results.sent++;
      } catch (err) {
        console.error('Error sending reminder for note', note._id, err);
        results.errors.push({
          noteId: note._id.toString(),
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      ...results,
      message: `Checked ${results.checked} reminders, sent ${results.sent} emails`
    });
  } catch (err) {
    console.error('Reminder check error', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  }
}

