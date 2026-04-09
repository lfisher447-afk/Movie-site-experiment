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
const TMDB_KEY = process.env.TMDB_KEY || '2f4f31012b0fd04c0893666bcd782e4b'; // Ensure this is set in Railway Variables
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const app = express();

// ─── ADVANCED SECURITY HEADERS ────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'"], 
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            "img-src": ["'self'", "data:", "https://image.tmdb.org"],
            "connect-src": ["'self'", "https://api.themoviedb.org"],
            // CRITICAL: Allow your specific streaming server iframes to load
            "frame-src": [
                "'self'", 
                "https://player.videasy.net", 
                "https://vidsrc.xyz", 
                "https://www.2embed.cc", 
                "https://vidsrc.me", 
                "https://multiembed.mov", 
                "https://dl.vidsrc.vip"
            ],
        },
    },
    crossOriginEmbedderPolicy: false, // Must be false to allow external video embeds
}));

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || '*' }));
app.use(compression({ level: 6, threshold: 0 })); // GZIP compression
app.use(morgan(process.env.LOG_LEVEL === 'debug' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── RATE LIMITING ────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 1000, // Generous limit for heavy browsing, but stops scraping
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded. Please wait a moment before continuing.' }
});

// ─── TMDB SECURE PROXY ────────────────────────────────────────────────────
// Routes frontend /api/tmdb calls to the real TMDB API, injecting the key backend-side
app.get('/api/tmdb', apiLimiter, async (req, res) => {
    try {
        const { ep, ...queryParams } = req.query;
        
        if (!ep) {
            return res.status(400).json({ error: 'Endpoint parameter (ep) is required' });
        }

        const params = new URLSearchParams({
            api_key: TMDB_KEY,
            language: 'en-US',
            ...queryParams
        });

        const targetUrl = `${TMDB_BASE_URL}${ep}?${params.toString()}`;
        
        const response = await axios.get(targetUrl, {
            headers: { 'Accept-Encoding': 'gzip,deflate,compress' },
            timeout: parseInt(process.env.STREAM_TIMEOUT) || 30000
        });

        // Browser caching for 30 minutes to reduce redundant backend hits
        res.set('Cache-Control', 'public, max-age=1800'); 
        return res.json(response.data);

    } catch (error) {
        console.error(`[TMDB Proxy Error]: ${error.message}`);
        const status = error.response ? error.response.status : 500;
        res.status(status).json({ error: 'Proxy request failed.' });
    }
});

// Health check for Railway deployment checks
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'Operational', pid: process.pid });
});

// ─── FRONTEND SERVING ─────────────────────────────────────────────────────
const publicPath = path.join(__dirname, '../public');

// Serve static files with 1-day cache for assets
app.use(express.static(publicPath, { maxAge: '1d' }));

// SPA Fallback: Route all unknown requests to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// ─── SERVER STARTUP ───────────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Worker ${process.pid}] TENEFLIX Engine online via Port ${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = () => {
    console.log(`\n[Worker ${process.pid}] Shutting down gracefully...`);
    server.close(() => {
        process.exit(0);
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
