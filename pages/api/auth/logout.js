import dbConnect from '../../../utils/mongoose';
import User from '../../../models/User';
import { clearAuthCookies } from '../../../utils/auth';
import { parse } from 'cookie';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    await dbConnect();

    const cookies = parse(req.headers.cookie || '');
    const refreshToken = cookies.refresh_token;

    if (refreshToken) {
        // Try to find user with this token and remove it
        // We don't strictly need to verify signature here, just remove from DB if found
        const user = await User.findOne({ 'refreshTokens.token': refreshToken });
        if (user) {
            user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
            await user.save();
        }
    }

    clearAuthCookies(res);
    res.json({ ok: true });
}
