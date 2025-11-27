import dbConnect from '../../../utils/mongoose';
import User from '../../../models/User';
import { verifyAccessToken } from '../../../utils/auth';
import { parse } from 'cookie';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();
    await dbConnect();

    const cookies = parse(req.headers.cookie || '');
    const accessToken = cookies.access_token;

    if (!accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
        return res.status(401).json({ error: 'Invalid access token' });
    }

    const user = await User.findById(payload.userId).select('-passwordHash -refreshTokens');
    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user });
}
