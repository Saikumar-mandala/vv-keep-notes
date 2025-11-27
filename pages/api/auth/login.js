import dbConnect from '../../../utils/mongoose';
import User from '../../../models/User';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, setAuthCookies } from '../../../utils/auth';
import { validateLogin } from '../../../utils/validation';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await dbConnect();

  // Validate and sanitize input
  const validation = validateLogin(req.body);
  if (!validation.valid) {
    return res.status(400).json({ 
      error: 'Validation failed',
      errors: validation.errors
    });
  }

  const { email, password } = validation.sanitized;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshTokens.push({ token: refreshToken });
  await user.save();

  setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      },
      token: accessToken // Also return token for client-side Authorization headers
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
