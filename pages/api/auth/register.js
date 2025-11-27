import dbConnect from '../../../utils/mongoose';
import User from '../../../models/User';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, setAuthCookies } from '../../../utils/auth';
import { validateRegistration } from '../../../utils/validation';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await dbConnect();

  // Validate and sanitize input
  const validation = validateRegistration(req.body);
  if (!validation.valid) {
    return res.status(400).json({ 
      error: 'Validation failed',
      errors: validation.errors
    });
  }

  const { name, email, password } = validation.sanitized;

  // Check if user already exists
  try {
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await User.create({ name, email, passwordHash });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshTokens.push({ token: refreshToken });
  await user.save();

  setAuthCookies(res, accessToken, refreshToken);

    res.json({
      ok: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      },
      token: accessToken // Also return token for client-side Authorization headers
    });
  } catch (error) {
    // Handle duplicate key error (email already exists)
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    // Handle validation errors from mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        errors
      });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
