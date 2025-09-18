const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Simple in-memory token store
const activeTokens = new Map(); // token -> { issuedAt, expiresAt }
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const router = express.Router();

router.post('/login', (req, res) => {
    try {
        const { password } = req.body || {};
        if (!password || password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: true, message: 'Invalid credentials', code: 'UNAUTHORIZED' });
        }
        const token = uuidv4();
        const now = Date.now();
        activeTokens.set(token, { issuedAt: now, expiresAt: now + TOKEN_TTL_MS });
        return res.json({ success: true, data: { token, expiresInMs: TOKEN_TTL_MS } });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message, code: 'AUTH_ERROR' });
    }
});

function requireAuth(req, res, next) {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: true, message: 'Missing token', code: 'UNAUTHORIZED' });
    const meta = activeTokens.get(token);
    if (!meta) return res.status(401).json({ error: true, message: 'Invalid token', code: 'UNAUTHORIZED' });
    if (Date.now() > meta.expiresAt) {
        activeTokens.delete(token);
        return res.status(401).json({ error: true, message: 'Token expired', code: 'UNAUTHORIZED' });
    }
    return next();
}

module.exports = { authRouter: router, requireAuth };


