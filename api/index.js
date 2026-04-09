require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const PORT = process.env.PORT || 3000;
const TMDB_KEY = process.env.TMDB_KEY || '15d2ea6d0dc1d476efbca3eba2b9bbfb';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const app = express();

// ─── ADVANCED SECURITY (Tailored for Streaming) ───────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            "img-src": ["'self'", "data:", "https://image.tmdb.org"],
            "connect-src": ["'self'", "https://api.themoviedb.org"],
            "frame-src": [
                "'self'", 
                "https://player.videasy.net", 
                "https://vidsrc.xyz", 
                "https://www.2embed.cc", 
                "https://vidsrc.me", 
                "https://multiembed.mov", 
                "https://dl.vidsrc.vip",
                "https://*.to"
            ],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || '*' }));
app.use(compression({ level: 6, threshold: 0 }));
app.use(morgan(process.env.LOG_LEVEL === 'debug' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── RATE LIMITING (DDoS Protection) ──────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 1000, 
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Extreme traffic detected. Rate limit exceeded.' }
});

// ─── TMDB SECURE PROXY ────────────────────────────────────────────────────
app.get('/api/tmdb', apiLimiter, async (req, res) => {
    try {
        const { ep, ...queryParams } = req.query;
        if (!ep) return res.status(400).json({ error: 'Endpoint parameter required' });

        const params = new URLSearchParams({
            api_key: TMDB_KEY,
            language: 'en-US',
            ...queryParams
        });

        const response = await axios.get(`${TMDB_BASE_URL}${ep}?${params.toString()}`, {
            headers: { 'Accept-Encoding': 'gzip,deflate,compress' },
            timeout: parseInt(process.env.STREAM_TIMEOUT) || 30000
        });

        res.set('Cache-Control', 'public, max-age=1800'); 
        return res.json(response.data);
    } catch (error) {
        console.error(`[Proxy Error]: ${error.message}`);
        res.status(error.response?.status || 500).json({ error: 'Proxy request failed.' });
    }
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'Operational', pid: process.pid, engine: 'Omega-V10' });
});

// ─── FRONTEND SERVING ─────────────────────────────────────────────────────
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath, { maxAge: '1d' }));

app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// ─── SERVER STARTUP ───────────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SYS] Engine online via Port ${PORT}`);
});

const gracefulShutdown = () => {
    server.close(() => process.exit(0));
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
