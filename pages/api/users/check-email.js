// pages/api/users/check-email.js
import dbConnect from '../../../utils/mongoose';
import User from '../../../models/User';
import { isValidEmail, sanitizeEmail } from '../../../utils/validation';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await dbConnect();

  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const sanitizedEmail = sanitizeEmail(email);

  try {
    const user = await User.findOne({ email: sanitizedEmail }).lean();
    const exists = !!user;

    res.json({ 
      exists,
      email: sanitizedEmail
    });
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({ error: 'Failed to check email' });
  }
}

