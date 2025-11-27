import dbConnect from '../../../utils/mongoose';
import User from '../../../models/User';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken, setAuthCookies, clearAuthCookies } from '../../../utils/auth';
import { parse } from 'cookie';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    await dbConnect();

    const cookies = parse(req.headers.cookie || '');
    const refreshToken = cookies.refresh_token;

    if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token' });
    }

    // Verify token signature
    const payload = verifyRefreshToken(refreshToken);

    // If token is invalid/expired (payload is null)
    if (!payload) {
        clearAuthCookies(res);
        return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
        clearAuthCookies(res);
        return res.status(401).json({ error: 'User not found' });
    }

    // Check if token exists in DB (Rotation Check)
    const tokenIndex = user.refreshTokens.findIndex(t => t.token === refreshToken);

    if (tokenIndex === -1) {
        // Token reuse detected!
        // Security: Clear all refresh tokens for this user
        user.refreshTokens = [];
        await user.save();
        clearAuthCookies(res);
        return res.status(403).json({ error: 'Refresh token reuse detected' });
    }

    // Token is valid and unused. Rotate it!
    // Remove the used token
    user.refreshTokens.splice(tokenIndex, 1);

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Add new refresh token to DB
    user.refreshTokens.push({ token: newRefreshToken });

    // Remove old tokens (optional cleanup, e.g., keep last 5 or remove older than 30 days)
    // For now, let's just keep it simple. Maybe limit array size?
    if (user.refreshTokens.length > 10) {
        user.refreshTokens.shift(); // Remove oldest
    }

    await user.save();

    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.json({ 
      ok: true,
      token: newAccessToken // Return new access token for client-side Authorization headers
    });
}
