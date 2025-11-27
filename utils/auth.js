// utils/auth.js
// Authentication utilities (server-side)
// Combined: tokens.js, cookies.js, and server-side auth functions

import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';
import dbConnect from './mongoose';
import User from '../models/User';

// ==================== Token Management ====================
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export const generateAccessToken = (user) => {
    return jwt.sign(
        { userId: user._id, email: user.email, isAdmin: user.isAdmin },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
};

export const generateRefreshToken = (user) => {
    return jwt.sign(
        { userId: user._id },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
};

export const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

// ==================== Cookie Management ====================
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
    const accessTokenCookie = serialize('access_token', accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60, // 15 minutes
    });

    const refreshTokenCookie = serialize('refresh_token', refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);
};

export const clearAuthCookies = (res) => {
    const accessTokenCookie = serialize('access_token', '', {
        ...COOKIE_OPTIONS,
        maxAge: -1,
    });

    const refreshTokenCookie = serialize('refresh_token', '', {
        ...COOKIE_OPTIONS,
        maxAge: -1,
    });

    res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);
};

// ==================== Server-Side Auth ====================
/**
 * Get user from request (server-side)
 * Extracts and verifies JWT token from Authorization header or cookies
 * @param {object} req - HTTP request object
 * @returns {object|null} - User object or null if not authenticated
 */
export async function getUserFromReq(req) {
    let token = null;
    
    // First, try to get token from Authorization header
    const auth = req.headers.authorization;
    if (auth) {
        const parts = auth.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            token = parts[1];
        }
    }
    
    // If no token in header, try to get from cookies
    if (!token) {
        const cookies = parse(req.headers.cookie || '');
        token = cookies.access_token;
    }
    
    if (!token) return null;

    try {
        // Use verifyAccessToken which handles token verification
        const data = verifyAccessToken(token);
        if (!data) return null;
        
        await dbConnect();
        const user = await User.findById(data.userId).lean();
        if (!user) return null;
        return { ...user, id: user._id };
    } catch (e) {
        return null;
    }
}

// ==================== Browser-Side Auth ====================
/**
 * Decode a JWT token (browser-side, no verification)
 * @param {string} token - JWT token to decode
 * @returns {object|null} - Decoded token payload or null if invalid
 */
export function decodeToken(token) {
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decodeURIComponent(escape(json)));
    } catch (e) {
        return null;
    }
}
