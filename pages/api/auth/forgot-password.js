import dbConnect from '../../../utils/mongoose';
import User from '../../../models/User';
import nodemailer from 'nodemailer';
import { isValidEmail, sanitizeEmail } from '../../../utils/validation';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const sanitizedEmail = sanitizeEmail(email);

    const user = await User.findOne({ email: sanitizedEmail });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ 
        success: true, 
        message: 'If that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Create email transporter
    const transporter = await createTransporter();
    
    if (!transporter) {
      // If SMTP not configured, return error
      return res.status(500).json({ 
        error: 'Email service not configured',
        message: 'Please configure SMTP settings to enable password reset'
      });
    }

    // Create reset URL
    const resetUrl = `${APP_BASE}/reset-password?token=${resetToken}`;

    // Send email
    const mailOptions = {
      from: EMAIL_FROM || SMTP_USER,
      to: user.email,
      subject: 'Password Reset Request - Keep Notes',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Keep Notes</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #666; line-height: 1.6;">
              Hello ${user.name || 'there'},
            </p>
            <p style="color: #666; line-height: 1.6;">
              You requested to reset your password. Click the button below to reset it:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 14px 28px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        display: inline-block;
                        font-weight: 600;
                        font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="color: #999; font-size: 14px; line-height: 1.6;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: #667eea; font-size: 12px; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>
            <p style="color: #999; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              This link will expire in 1 hour. If you didn't request this, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} Keep Notes. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${user.email}`);
      
      return res.json({ 
        success: true, 
        message: 'If that email exists, a password reset link has been sent.' 
      });
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      
      // Clear the reset token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      return res.status(500).json({ 
        error: 'Failed to send email',
        message: 'Please try again later'
      });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  }
}

