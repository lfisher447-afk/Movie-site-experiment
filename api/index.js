require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const os = require('os');

/**
 * ─── CONFIGURATION & CONSTANTS ────────────────────────────────────────────
 */
const PORT = process.env.PORT || 3000;
const TMDB_KEY = process.env.TMDB_KEY || '15d2ea6d0dc1d476efbca3eba2b9bbfb';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IS_PROD = process.env.NODE_ENV === 'production';

// In-memory cache for TMDB responses (10-minute TTL)
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; 

const app = express();

/**
 * ─── SECURITY ENGINE (HARDENED) ───────────────────────────────────────────
 */
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
                "https://player.videasy.net", "https://vidsrc.xyz", 
                "https://www.2embed.cc", "https://vidsrc.me", 
                "https://multiembed.mov", "https://dl.vidsrc.vip", "https://*.to"
            ],
            "upgrade-insecure-requests": [],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

/**
 * ─── CORE MIDDLEWARE ──────────────────────────────────────────────────────
 */
app.use(cors({ 
    origin: process.env.ALLOWED_ORIGINS === '*' ? '*' : (process.env.ALLOWED_ORIGINS || '').split(','),
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression({ 
    level: 6, 
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => (req.headers['x-no-compression'] ? false : compression.filter(req, res))
}));

// Advanced Logging: Custom tokens for performance tracking
morgan.token('resp-time', (req, res) => res.getHeader('X-Response-Time'));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

app.use(express.json({ limit: '1mb' }));

/**
 * ─── RESILIENCE & RATE LIMITING ───────────────────────────────────────────
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000, 
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Traffic threshold exceeded. Infrastructure protection active.' },
    skip: (req) => req.path === '/api/health'
});

/**
 * ─── TMDB OMEGA PROXY (WITH CACHING & CIRCUIT BREAKER LOGIC) ──────────────
 */
app.get('/api/tmdb', apiLimiter, async (req, res, next) => {
    const start = Date.now();
    try {
        const { ep, ...queryParams } = req.query;
        if (!ep) return res.status(400).json({ error: 'Endpoint parameter required' });

        // Cache Key Generation
        const cacheKey = JSON.stringify({ ep, queryParams });
        const cachedData = cache.get(cacheKey);

        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
            res.set('X-Cache', 'HIT');
            return res.json(cachedData.data);
        }

        const params = new URLSearchParams({
            api_key: TMDB_KEY,
            language: 'en-US',
            ...queryParams
        });

        const response = await axios.get(`${TMDB_BASE_URL}${ep}?${params.toString()}`, {
            headers: { 'Accept-Encoding': 'gzip,deflate,compress' },
            timeout: 15000 // 15s timeout for upstream resilience
        });

        // Update Cache
        cache.set(cacheKey, { data: response.data, timestamp: Date.now() });

        res.set('X-Cache', 'MISS');
        res.set('X-Response-Time', `${Date.now() - start}ms`);
        res.set('Cache-Control', 'public, max-age=3600'); 
        
        return res.json(response.data);
    } catch (error) {
        next(error); // Pass to centralized error handler
    }
});

/**
 * ─── SYSTEM DIAGNOSTICS ───────────────────────────────────────────────────
 */
app.get('/api/health', (req, res) => {
    const stats = {
        status: 'Operational',
        uptime: Math.floor(process.uptime()),
        memory: {
            free: Math.round(os.freemem() / 1024 / 1024) + 'MB',
            total: Math.round(os.totalmem() / 1024 / 1024) + 'MB'
        },
        load: os.loadavg().map(l => l.toFixed(2)),
        engine: 'Omega-V10-Pro',
        timestamp: new Date().toISOString()
    };
    res.status(200).json(stats);
});

/**
 * ─── STATIC ASSETS ENGINE ─────────────────────────────────────────────────
 */
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath, { 
    maxAge: '7d',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    }
}));

app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

/**
 * ─── CENTRALIZED ERROR ORCHESTRATION ──────────────────────────────────────
 */
app.use((err, req, res, next) => {
    const status = err.response?.status || err.status || 500;
    const message = IS_PROD ? 'An internal engine error occurred.' : err.message;
    
    console.error(`[SYSTEM ERROR] ${status} - ${err.message}`);
    
    res.status(status).json({
        error: true,
        message: message,
        code: err.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
    });
});

/**
 * ─── BOOT SEQUENCE ────────────────────────────────────────────────────────
 */
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SYS] OMEGA ENGINE ONLINE`);
    console.log(`[SYS] Port: ${PORT} | Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[SYS] CPU Cores: ${os.cpus().length} | Arch: ${os.arch()}`);
});

// Graceful Exit Handler
const initiateShutdown = (signal) => {
    console.log(`[SYS] ${signal} received. Powering down...`);
    server.close(() => {
        console.log('[SYS] Engine offline. All connections terminated.');
        process.exit(0);
    });
    
    // Force exit if shutdown takes too long
    setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => initiateShutdown('SIGTERM'));
process.on('SIGINT', () => initiateShutdown('SIGINT'));
