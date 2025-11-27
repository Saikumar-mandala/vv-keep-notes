// utils/emailService.js
import nodemailer from "nodemailer";
import { DEFAULT_APP_BASE, formatLocalString } from './helpers';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  APP_BASE = DEFAULT_APP_BASE,
} = process.env;


let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("⚠️  SMTP config missing. Emails will not be sent.");
    return null;
  }

  const port = Number(SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  try {
    await transporter.verify();
    return transporter;
  } catch (err) {
    console.error("❌ SMTP verification failed:", err.message);
    return null;
  }
}

export async function sendNotificationEmail({ to, subject, html }) {
  try {
    const emailTransporter = await getTransporter();
    if (!emailTransporter) {
      console.log(`(NO SMTP) Would send email to ${to}: ${subject}`);
      return false;
    }

    await emailTransporter.sendMail({
      from: EMAIL_FROM || SMTP_USER,
      to,
      subject,
      html,
    });

    console.log(`✅ Sent notification email to ${to}`);
    return true;
  } catch (err) {
    console.error("❌ Error sending notification email:", err.message);
    return false;
  }
}

export async function sendNoteAddedNotification({
  note,
  owner,
  collaborators,
}) {
  if (!collaborators || collaborators.length === 0) return;

  const ownerName = owner?.name || owner?.email || "Someone";
  const noteTitle = note.title || "Untitled Note";

  const safeContent = (note.content || "(No content)").slice(0, 2000); // safety limit if needed

  // Function to generate note URL with email tracking for each collaborator
  const getNoteUrl = (email) => `${APP_BASE}/notes/${note._id}?from=email&email=${encodeURIComponent(email)}`;

  // HTML template function - takes noteUrl as parameter
  const getHtmlTemplate = (noteUrl) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>New Note Shared</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f7; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 25px rgba(15,23,42,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#facc15,#f97316); padding:18px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td align="left">
                      <span style="display:inline-flex; align-items:center; gap:8px;">
                        <span style="display:inline-block; width:28px; height:28px; border-radius:8px; background-color:rgba(255,255,255,0.18); text-align:center; line-height:28px; font-size:18px;">📝</span>
                        <span style="color:#111827; font-weight:700; font-size:18px;">Your Notes</span>
                      </span>
                    </td>
                    <td align="right" style="color:#111827; font-size:13px; opacity:0.9;">
                      Shared Note Notification
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:24px 24px 8px 24px;">
                <p style="margin:0 0 12px 0; font-size:15px; color:#374151;">
                  Hi there,
                </p>
                <p style="margin:0 0 16px 0; font-size:14px; color:#4b5563; line-height:1.6;">
                  <strong style="color:#111827;">${ownerName}</strong> has shared a new note with you.
                </p>

                <!-- Note Card -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f9fafb; border-radius:10px; border:1px solid #e5e7eb; padding:16px 18px;">
                  <tr>
                    <td>
                      <div style="font-size:14px; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px;">
                        Note
                      </div>
                      <h2 style="margin:0 0 10px 0; font-size:17px; font-weight:600; color:#111827;">
                        ${noteTitle}
                      </h2>
                      <p style="margin:0; font-size:14px; color:#4b5563; line-height:1.6; white-space:pre-wrap;">
                        ${safeContent}
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- CTA -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:22px;">
                  <tr>
                    <td align="left">
                      <a href="${noteUrl}"
                        style="
                          display:inline-block;
                          padding:10px 20px;
                          background:linear-gradient(135deg,#3b82f6,#2563eb);
                          color:#ffffff;
                          text-decoration:none;
                          border-radius:999px;
                          font-size:14px;
                          font-weight:600;
                          box-shadow:0 8px 18px rgba(37,99,235,0.35);
                        ">
                        Open note
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Info -->
                <p style="margin:18px 0 0 0; font-size:12px; color:#9ca3af; line-height:1.5;">
                  If the button above doesn't work, copy and paste this link into your browser:<br />
                  <span style="word-break:break-all; color:#6b7280;">${noteUrl}</span>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 24px 20px 24px; border-top:1px solid #e5e7eb; background-color:#f9fafb;">
                <p style="margin:0; font-size:11px; color:#9ca3af; text-align:center; line-height:1.5;">
                  You're receiving this email because a note was shared with you in <strong>Your Notes</strong>.<br/>
                  If you weren't expecting this, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>

          <!-- Brand footer -->
          <div style="margin-top:10px; font-size:11px; color:#9ca3af; text-align:center;">
            © ${new Date().getFullYear()} Your Notes. All rights reserved.
          </div>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const subject = `New Note Shared: ${noteTitle}`;

  // Send personalized emails with tracking for each collaborator
  const emailPromises = collaborators.map((email) => {
    const personalizedUrl = getNoteUrl(email);
    return sendNotificationEmail({ 
      to: email, 
      subject, 
      html: getHtmlTemplate(personalizedUrl) 
    });
  });

  await Promise.all(emailPromises);
}

export async function sendReminderNotification({ note, recipients }) {
  if (!recipients || recipients.length === 0) return;

  const noteUrl = `${APP_BASE}/notes/${note._id}`;
  const noteTitle = note.title || "Untitled Note";

  const safeContent = (note.content || "").slice(0, 2000);

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
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
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
        <!-- Note Card (Improved Alignment) -->
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" 
style="
  background-color:#ffffff;
  border-radius:12px;
  border:1px solid #e5e7eb;
  padding:22px 26px;
  margin-top:18px;
">
  <tr>
    <td>

      <!-- Label -->
      <div style="
        font-size:13px; 
        color:#6b7280; 
        text-transform:uppercase; 
        letter-spacing:0.06em;
        margin-bottom:8px;
        font-weight:600;
      ">
        Note
      </div>

      <!-- Title -->
      <h2 style="
        margin:0 0 12px 0; 
        font-size:20px; 
        font-weight:700; 
        color:#111827;
        line-height:1.4;
      ">
        ${noteTitle}
      </h2>

      <!-- Content -->
      <p style="
        margin:0;
        font-size:15px; 
        color:#4b5563; 
        line-height:1.7; 
        white-space:pre-wrap;
      ">
        ${safeContent}
      </p>

    </td>
  </tr>
</table>


                <!-- CTA -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:22px;">
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
                  To stop receiving reminders for this note, you can update or remove the reminder inside the app.
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

  const subject = `Reminder: ${noteTitle}`;

  const emailPromises = recipients.map((email) =>
    sendNotificationEmail({ to: email, subject, html })
  );

  await Promise.all(emailPromises);
}

