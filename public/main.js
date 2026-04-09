/**
 * ████████╗███████╗███╗   ██╗███████╗██╗     ██╗██╗  ██╗
 *    ██╔══╝██╔════╝████╗  ██║██╔════╝██║     ██║╚██╗██╔╝
 *    ██║   █████╗  ██╔██╗ ██║█████╗  ██║     ██║ ╚███╔╝
 *    ██║   ██╔══╝  ██║╚██╗██║██╔══╝  ██║     ██║ ██╔██╗
 *    ██║   ███████╗██║ ╚████║███████╗███████╗██║██╔╝ ██╗
 *    ╚═╝   ╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝╚═╝  ╚═╝
 *
 * TENEFLIX — Full Movie & TV Streaming Platform
 * Unified main.js — All modules consolidated
 * Architecture: Vanilla ES2022+ with module-pattern encapsulation
 */

'use strict';

/* ============================================================
   ██████╗  ██████╗ ███╗   ███╗ █████╗ ██╗███╗   ██╗███████╗
   ██╔══██╗██╔═══██╗████╗ ████║██╔══██╗██║████╗  ██║██╔════╝
   ██║  ██║██║   ██║██╔████╔██║███████║██║██╔██╗ ██║███████╗
   ██║  ██║██║   ██║██║╚██╔╝██║██╔══██║██║██║╚██╗██║╚════██║
   ██████╔╝╚██████╔╝██║ ╚═╝ ██║██║  ██║██║██║ ╚████║███████║
   ╚═════╝  ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝
   ============================================================ */

// ─── RUNTIME ENVIRONMENT DETECTION ──────────────────────────────────────────
const ENV = (() => {
    const isLocal = location.hostname === 'localhost'
        || location.hostname === '127.0.0.1'
        || location.protocol === 'file:';
    return {
        isLocal,
        // Public TMDB key (for Railway / production, calls route through /api/tmdb proxy)
        API_KEY: '2f4f31012b0fd04c0893666bcd782e4b',
        TMDB_BASE: isLocal ? 'https://api.themoviedb.org/3' : '',
        IMG_BASE: 'https://image.tmdb.org/t/p',
        VIDEASY: 'https://player.videasy.net',
        VIDSRC: 'https://vidsrc.xyz/embed',
        EMBED2: 'https://www.2embed.cc/embed',
        DL_EMBED: 'https://dl.vidsrc.vip',
        CACHE_TTL: 30 * 60 * 1000, // 30 min session cache
    };
})();

// ─── TMDB API PROXY / DIRECT ─────────────────────────────────────────────────
const API = (() => {
    /**
     * Unified TMDB fetch with session-level caching.
     * On Railway (production): calls /api/tmdb?ep=...
     * On localhost: calls TMDB directly with API_KEY
     */
    async function fetch_(endpoint, extra = {}) {
        let url;
        if (ENV.isLocal) {
            const sep = endpoint.includes('?') ? '&' : '?';
            url = `${ENV.TMDB_BASE}${endpoint}${sep}api_key=${ENV.API_KEY}&language=en-US`;
            Object.entries(extra).forEach(([k, v]) => (url += `&${k}=${encodeURIComponent(v)}`));
        } else {
            const params = new URLSearchParams({ ep: endpoint, ...extra });
            url = `/api/tmdb?${params}`;
        }

        const cacheKey = `tnx_${endpoint}_${JSON.stringify(extra)}`;
        const isSearch = Object.keys(extra).includes('query');

        if (!isSearch) {
            try {
                const raw = sessionStorage.getItem(cacheKey);
                if (raw) {
                    const { data, ts } = JSON.parse(raw);
                    if (Date.now() - ts < ENV.CACHE_TTL) return data;
                }
            } catch (_) {}
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`TMDB ${res.status} — ${url}`);
        const data = await res.json();

        if (!isSearch) {
            try { sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })); }
            catch (_) {}
        }
        return data;
    }

    return { fetch: fetch_ };
})();

/* ============================================================
   ██████╗ ██████╗       ██████╗ ██╗      ██████╗  ██████╗██╗  ██╗███████╗██████╗
   ██╔══██╗╚════██╗      ██╔══██╗██║     ██╔═══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗
   ██║  ██║ █████╔╝█████╗██████╔╝██║     ██║   ██║██║     █████╔╝ █████╗  ██████╔╝
   ██║  ██║ ╚═══██╗╚════╝██╔══██╗██║     ██║   ██║██║     ██╔═██╗ ██╔══╝  ██╔══██╗
   ██████╔╝██████╔╝      ██████╔╝███████╗╚██████╔╝╚██████╗██║  ██╗███████╗██║  ██║
   ╚═════╝ ╚═════╝       ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
   ============================================================ */

/**
 * OmegaShield — Multi-layer ad/popup blocker
 * Merged from DownloadModal_jsx adBlocker + initAdShield modules
 */
const OmegaShield = (() => {
    const BLOCKED_DOMAINS = [
        'popads.net', 'adsterra.com', 'exoclick.com', 'propellerads.com',
        'bet365.com', '1xbet.com', 'adcash.com', 'onclickalgo.com',
        'doubleclick.net', 'google-analytics.com', 'mgid.com',
        'trafficjunky.net', 'juicyads.com', 'hilltopads.net',
        'clickadu.com', 'popcash.net', 'trafficforce.com',
    ];

    const BLOCKED_SELECTORS = [
        '[class*="ad-"]', '[class*="-ad"]', '[id*="ad-banner"]',
        '[class*="popup"]', '[class*="overlay-ad"]', '[class*="sponsor"]',
        '[class*="ad-container"]', '[class*="banner-ad"]',
        'div[style*="z-index: 999"]', 'div[style*="z-index:999"]',
        'div[style*="z-index: 9999"]', 'div[style*="z-index:9999"]',
    ];

    function isAdNode(node) {
        if (node.nodeType !== 1) return false;
        const sig = ((node.id || '') + ' ' + (node.className || '')).toLowerCase();
        const zIdx = parseInt(node.style?.zIndex || 0);
        return (
            BLOCKED_DOMAINS.some(d => (node.src || node.href || '').includes(d)) ||
            ['popup', 'overlay', 'banner', 'sponsor', 'ad-container', 'ad-banner', 'ads-wrapper'].some(k => sig.includes(k)) ||
            (zIdx > 9999 && node.tagName !== 'SCRIPT' && !node.id?.includes('teneflix'))
        );
    }

    function scanAndDestroy(node) {
        if (isAdNode(node)) {
            node.style.display = 'none';
            node.remove();
        }
    }

    function interceptNetworkLayer() {
        // Intercept fetch
        const _fetch = window.fetch;
        window.fetch = async function (...args) {
            const url = String(args[0] || '');
            if (BLOCKED_DOMAINS.some(d => url.includes(d))) {
                console.warn('[OmegaShield] fetch blocked:', url);
                return new Response(null, { status: 204 });
            }
            return _fetch.apply(this, args);
        };

        // Intercept XHR
        const _xhrOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            if (BLOCKED_DOMAINS.some(d => String(url).includes(d))) {
                console.warn('[OmegaShield] XHR blocked:', url);
                return _xhrOpen.call(this, method, 'about:blank', ...rest);
            }
            return _xhrOpen.call(this, method, url, ...rest);
        };
    }

    function init() {
        // Block popups globally
        const _open = window.open;
        window.open = function (url, ...rest) {
            if (!url || BLOCKED_DOMAINS.some(d => String(url).includes(d))) {
                console.warn('[OmegaShield] popup blocked:', url);
                return null;
            }
            return _open.call(window, url, ...rest);
        };

        interceptNetworkLayer();

        // DOM mutation observer — continuous patrol
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    scanAndDestroy(node);
                }
            }
        });

        const startObserver = () => {
            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
                console.log('%c[OmegaShield] Active', 'color:#46d369;font-weight:bold');
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserver);
        } else {
            startObserver();
        }
    }

    function isAdUrl(url) {
        return BLOCKED_DOMAINS.some(d => String(url).includes(d));
    }

    return { init, isAdUrl, BLOCKED_DOMAINS };
})();

/* ============================================================
   ███████╗██████╗ ███████╗███████╗██████╗
   ██╔════╝██╔══██╗██╔════╝██╔════╝██╔══██╗
   ███████╗██████╔╝█████╗  █████╗  ██║  ██║
   ╚════██║██╔═══╝ ██╔══╝  ██╔══╝  ██║  ██║
   ███████║██║     ███████╗███████╗██████╔╝
   ╚══════╝╚═╝     ╚══════╝╚══════╝╚═════╝
   ============================================================ */

// ─── STREAM SERVERS ──────────────────────────────────────────────────────────
const SERVERS = [
    { name: 'Videasy',   build: (t,id,s,e) => t==='tv' ? `${ENV.VIDEASY}/tv/${id}/${s}/${e}` : `${ENV.VIDEASY}/movie/${id}` },
    { name: 'VidSrc',    build: (t,id,s,e) => t==='tv' ? `${ENV.VIDSRC}/tv?tmdb=${id}&season=${s}&episode=${e}` : `${ENV.VIDSRC}/movie?tmdb=${id}` },
    { name: '2Embed',    build: (t,id,s,e) => t==='tv' ? `${ENV.EMBED2}/embedtv/${id}&s=${s}&e=${e}` : `${ENV.EMBED2}/${id}` },
    { name: 'VidSrc.me', build: (t,id,s,e) => t==='tv' ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}` : `https://vidsrc.me/embed/movie?tmdb=${id}` },
    { name: 'SuperEmbed',build: (t,id,s,e) => t==='tv' ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}` : `https://multiembed.mov/?video_id=${id}&tmdb=1` },
];

// ─── CONTENT ROW DEFINITIONS ──────────────────────────────────────────────────
const ROWS = [
    { id: 'trending',   title: '🔥 Trending Now',              ep: '/trending/all/week',                                       mt: 'all',   badge: 'top10' },
    { id: 'popular-m',  title: 'Popular Movies',               ep: '/movie/popular',                                           mt: 'movie' },
    { id: 'now-play',   title: '🎬 Now Playing in Theaters',   ep: '/movie/now_playing',                                       mt: 'movie', badge: 'new' },
    { id: 'top-m',      title: 'Top Rated Movies',             ep: '/movie/top_rated',                                         mt: 'movie' },
    { id: 'upcoming',   title: '🗓 Upcoming Movies',            ep: '/movie/upcoming',                                          mt: 'movie', badge: 'new' },
    { id: 'popular-t',  title: 'Popular TV Shows',             ep: '/tv/popular',                                              mt: 'tv' },
    { id: 'top-t',      title: 'Top Rated TV Shows',           ep: '/tv/top_rated',                                            mt: 'tv' },
    { id: 'airing',     title: '📡 Currently Airing',          ep: '/tv/on_the_air',                                           mt: 'tv',    badge: 'new' },
    { id: 'action',     title: '💥 Action & Adventure',        ep: '/discover/movie?with_genres=28&sort_by=popularity.desc',   mt: 'movie' },
    { id: 'comedy',     title: '😂 Comedies',                  ep: '/discover/movie?with_genres=35&sort_by=popularity.desc',   mt: 'movie' },
    { id: 'horror',     title: '👻 Horror',                    ep: '/discover/movie?with_genres=27&sort_by=popularity.desc',   mt: 'movie' },
    { id: 'scifi',      title: '🚀 Sci-Fi',                    ep: '/discover/movie?with_genres=878&sort_by=popularity.desc',  mt: 'movie' },
    { id: 'romance',    title: '💞 Romance',                   ep: '/discover/movie?with_genres=10749&sort_by=popularity.desc',mt: 'movie' },
    { id: 'thriller',   title: '🔪 Thrillers',                 ep: '/discover/movie?with_genres=53&sort_by=popularity.desc',   mt: 'movie' },
    { id: 'docs',       title: '📽 Documentaries',             ep: '/discover/movie?with_genres=99&sort_by=popularity.desc',   mt: 'movie' },
    { id: 'animation',  title: '✨ Animation',                  ep: '/discover/movie?with_genres=16&sort_by=popularity.desc',   mt: 'movie' },
    { id: 'anime-tv',   title: '⛩ Anime Series',              ep: '/discover/tv?with_genres=16&sort_by=popularity.desc',      mt: 'tv' },
    { id: 'crime-tv',   title: '🕵️ Crime TV',                  ep: '/discover/tv?with_genres=80&sort_by=popularity.desc',      mt: 'tv' },
];

const GENRE_MAP = {};
const GENRE_IDS = { action:28, comedy:35, horror:27, romance:10749, 'sci-fi':878 };

/* ============================================================
   ███████╗████████╗ █████╗ ████████╗███████╗
   ██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██╔════╝
   ███████╗   ██║   ███████║   ██║   █████╗
   ╚════██║   ██║   ██╔══██║   ██║   ██╔══╝
   ███████║   ██║   ██║  ██║   ██║   ███████╗
   ╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚══════╝
   ============================================================ */

const State = (() => {
    let _s = {
        // Player
        currentId:          null,
        currentType:        null,
        currentSeason:      1,
        currentEpisode:     1,
        currentServer:      0,
        // Search / browse
        searchQuery:        '',
        searchPage:         1,
        searchType:         'multi',
        filterPage:         1,
        currentCategory:    '',
        currentCategoryType:'movie',
        currentGenreId:     null,
        // UI
        heroItems:          [],
        heroIndex:          0,
        heroTimer:          null,
        // Wishlist / watch history
        wishlist:           JSON.parse(localStorage.getItem('tnx_wishlist') || '[]'),
        watchHistory:       JSON.parse(localStorage.getItem('tnx_history') || '[]'),
        // Downloads manager
        downloads:          JSON.parse(localStorage.getItem('tnx_downloads') || '[]'),
        downloadsPanelOpen: false,
        wishlistPanelOpen:  false,
        // Misc
        isLoading:          false,
        isFetchingMore:     false,
        infiniteScrollOn:   false,
        notifPanelOpen:     false,
        searchOpen:         false,
        mobileMenuOpen:     false,
    };

    function persist() {
        localStorage.setItem('tnx_wishlist',   JSON.stringify(_s.wishlist));
        localStorage.setItem('tnx_history',    JSON.stringify(_s.watchHistory));
        localStorage.setItem('tnx_downloads',  JSON.stringify(_s.downloads));
    }

    return {
        get: k => _s[k],
        set: (k, v) => { _s[k] = v; },
        toggle: k => { _s[k] = !_s[k]; return _s[k]; },
        persist,
        all: () => ({ ..._s }),
    };
})();

/* ============================================================
   ██╗   ██╗████████╗██╗██╗     ███████╗
   ██║   ██║╚══██╔══╝██║██║     ██╔════╝
   ██║   ██║   ██║   ██║██║     ███████╗
   ██║   ██║   ██║   ██║██║     ╚════██║
   ╚██████╔╝   ██║   ██║███████╗███████║
    ╚═════╝    ╚═╝   ╚═╝╚══════╝╚══════╝
   ============================================================ */

function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function norm(item, fallback = 'movie') {
    const mt = item.media_type || fallback;
    if (mt === 'person') return null;
    return {
        id:       String(item.id),
        title:    item.title || item.name || '',
        type:     mt,
        poster:   item.poster_path   ? `${ENV.IMG_BASE}/w500${item.poster_path}` : null,
        backdrop: item.backdrop_path ? `${ENV.IMG_BASE}/w1280${item.backdrop_path}` : null,
        desc:     item.overview || '',
        rating:   item.vote_average ? item.vote_average.toFixed(1) : null,
        year:     (item.release_date || item.first_air_date || '').slice(0, 4) || null,
        genreIds: item.genre_ids || [],
    };
}

function genreNames(ids) {
    return ids.map(id => GENRE_MAP[id]).filter(Boolean).slice(0, 3);
}

function matchPct(rating) {
    return Math.min(99, Math.round((parseFloat(rating) || 0) * 10));
}

function fmtRuntime(min) {
    if (!min) return '';
    const h = Math.floor(min / 60), m = min % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
}

function qualityLabel(item, type) {
    const year = parseInt((item.release_date || item.first_air_date || '0').slice(0,4));
    const now = new Date().getFullYear();
    const votes = item.vote_count || 0;
    const inTheaters = type === 'movie' && now === year && votes < 500;
    if (inTheaters) return { label: 'CAM', cls: 'q-cam', cam: true };
    if (item.vote_average >= 7) return { label: 'HD', cls: 'q-hd', cam: false };
    return { label: 'SD', cls: 'q-sd', cam: false };
}

function getEmbedUrl() {
    const id   = State.get('currentId');
    const type = State.get('currentType');
    const srv  = State.get('currentServer');
    const s    = State.get('currentSeason');
    const e    = State.get('currentEpisode');
    if (!id || !type) return '';
    return SERVERS[srv].build(type, id, s, e);
}

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    if (!t) return;
    const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle' };
    t.className = `toast toast-${type} show`;
    t.innerHTML = `<i class="fas ${icons[type] || icons.success}" style="color:var(--primary)"></i> ${msg}`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ============================================================
   ██╗  ██╗███████╗██████╗  ██████╗
   ██║  ██║██╔════╝██╔══██╗██╔═══██╗
   ███████║█████╗  ██████╔╝██║   ██║
   ██╔══██║██╔══╝  ██╔══██╗██║   ██║
   ██║  ██║███████╗██║  ██║╚██████╔╝
   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝
   ============================================================ */

/** Hero banner — auto-cycles through trending items */
const Hero = (() => {
    const CYCLE_MS = 8000;

    function render(item) {
        const el = document.getElementById('hero');
        if (!el || !item) return;
        const mp  = matchPct(item.rating);
        const genres = genreNames(item.genreIds).join(' • ');

        el.style.cssText = item.backdrop
            ? `background-image: linear-gradient(77deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.5) 40%,rgba(0,0,0,.1) 80%), url('${item.backdrop}'); background-size:cover; background-position:center top;`
            : '';

        el.querySelector('.hero-badge').textContent   = item.type === 'tv' ? 'SERIES' : 'FILM';
        el.querySelector('.hero-match').textContent   = `${mp}% Match`;
        el.querySelector('.hero-title').textContent   = item.title;
        el.querySelector('.hero-genres').textContent  = genres;
        el.querySelector('.hero-desc').textContent    = item.desc.slice(0, 220) + (item.desc.length > 220 ? '…' : '');
        el.querySelector('.hero-year').textContent    = item.year || '';
        el.querySelector('.hero-rating').textContent  = item.rating ? `★ ${item.rating}` : '';

        const playBtn = el.querySelector('.hero-play-btn');
        const infoBtn = el.querySelector('.hero-info-btn');
        playBtn.onclick = () => openDetailModal(item.id, item.type, true);
        infoBtn.onclick = () => openDetailModal(item.id, item.type, false);

        // Pulsed backdrop animation
        el.classList.remove('hero-fade');
        requestAnimationFrame(() => el.classList.add('hero-fade'));
    }

    function startCycle() {
        clearInterval(State.get('heroTimer'));
        const timer = setInterval(() => {
            const items = State.get('heroItems');
            if (!items.length) return;
            let idx = (State.get('heroIndex') + 1) % items.length;
            State.set('heroIndex', idx);
            render(items[idx]);
            syncDots();
        }, CYCLE_MS);
        State.set('heroTimer', timer);
    }

    function syncDots() {
        const dots = document.querySelectorAll('.hero-dot');
        dots.forEach((d, i) => d.classList.toggle('active', i === State.get('heroIndex')));
    }

    function buildDots(count) {
        const wrap = document.getElementById('heroDots');
        if (!wrap) return;
        wrap.innerHTML = Array.from({ length: count }, (_, i) =>
            `<button class="hero-dot ${i === 0 ? 'active' : ''}" aria-label="Slide ${i+1}" onclick="Hero.jumpTo(${i})"></button>`
        ).join('');
    }

    function jumpTo(idx) {
        clearInterval(State.get('heroTimer'));
        const items = State.get('heroItems');
        State.set('heroIndex', idx);
        render(items[idx]);
        syncDots();
        startCycle();
    }

    async function load() {
        try {
            const data = await API.fetch('/trending/movie/week');
            const items = (data.results || []).slice(0, 6).map(i => norm(i, 'movie')).filter(Boolean);
            State.set('heroItems', items);
            State.set('heroIndex', 0);
            buildDots(items.length);
            render(items[0]);
            startCycle();
        } catch (e) { console.error('[Hero]', e); }
    }

    return { load, jumpTo };
})();

/* ============================================================
   ██████╗  ██████╗ ██╗    ██╗███████╗
   ██╔══██╗██╔═══██╗██║    ██║██╔════╝
   ██████╔╝██║   ██║██║ █╗ ██║███████╗
   ██╔══██╗██║   ██║██║███╗██║╚════██║
   ██║  ██║╚██████╔╝╚███╔███╔╝███████║
   ╚═╝  ╚═╝ ╚═════╝  ╚══╝╚══╝ ╚══════╝
   ============================================================ */

/**
 * Renders a single scrollable content row.
 * Includes: Top-10 badges, NEW badges, match score, hover overlays.
 */
const Rows = (() => {
    function card(item, badge, rank) {
        if (!item) return '';
        const mp = matchPct(item.rating);
        const inList = State.get('wishlist').some(w => w.id === item.id);
        const badgeHTML = badge === 'top10' && rank != null
            ? `<div class="top10-badge">#${rank + 1}</div>`
            : badge === 'new'
            ? `<div class="new-badge">NEW</div>`
            : '';

        return `
        <article class="card" tabindex="0" role="button"
          aria-label="Watch ${esc(item.title)}"
          onclick="openDetailModal('${item.id}','${item.type}',false)"
          onkeydown="if(event.key==='Enter')openDetailModal('${item.id}','${item.type}',false)">
          <div class="card-img-wrap">
            ${badgeHTML}
            ${item.poster
                ? `<img class="card-img" src="${item.poster}" alt="${esc(item.title)}" loading="lazy" decoding="async">`
                : `<div class="card-img card-no-img"><i class="fas fa-film"></i></div>`}
            <div class="card-overlay">
              <div class="card-overlay-meta">
                <span class="card-match">${mp}% Match</span>
                <span class="card-year">${item.year || ''}</span>
              </div>
              <div class="card-overlay-actions">
                <button class="card-circle card-play-btn" onclick="event.stopPropagation();openDetailModal('${item.id}','${item.type}',true)" title="Play">
                  <i class="fas fa-play"></i>
                </button>
                <button class="card-circle card-list-btn ${inList ? 'in-list' : ''}"
                  onclick="event.stopPropagation();toggleWishlist('${item.id}','${item.type}','${esc(item.title)}','${item.poster||''}','${item.year||''}')"
                  title="${inList ? 'Remove from list' : 'Add to list'}">
                  <i class="fas ${inList ? 'fa-check' : 'fa-plus'}"></i>
                </button>
              </div>
              <p class="card-overlay-title">${esc(item.title)}</p>
              <p class="card-overlay-genres">${genreNames(item.genreIds).join(' • ')}</p>
            </div>
          </div>
        </article>`;
    }

    async function load(rowDef) {
        const rowEl = document.getElementById(`row-${rowDef.id}`);
        if (!rowEl) return;

        // Skeleton shimmer
        rowEl.innerHTML = Array(8).fill('<div class="card card-skeleton"></div>').join('');

        try {
            const data = await API.fetch(rowDef.ep, { page: 1 });
            const results = data.results || [];
            const items = results.map(i => norm(i, rowDef.mt === 'all' ? (i.media_type || 'movie') : rowDef.mt)).filter(Boolean);

            rowEl.innerHTML = items.slice(0, 20).map((item, idx) => card(item, rowDef.badge, idx)).join('');
        } catch (e) {
            rowEl.innerHTML = '<div class="row-error"><i class="fas fa-exclamation-triangle"></i> Failed to load</div>';
            console.error(`[Row:${rowDef.id}]`, e);
        }
    }

    function loadAll() {
        ROWS.forEach(row => load(row));
    }

    return { load, loadAll };
})();

/* ============================================================
   ██████╗ ███████╗████████╗ █████╗ ██╗██╗      ███╗   ███╗ ██████╗ ██████╗  █████╗ ██╗
   ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██║██║      ████╗ ████║██╔═══██╗██╔══██╗██╔══██╗██║
   ██║  ██║█████╗     ██║   ███████║██║██║      ██╔████╔██║██║   ██║██║  ██║███████║██║
   ██║  ██║██╔══╝     ██║   ██╔══██║██║██║      ██║╚██╔╝██║██║   ██║██║  ██║██╔══██║██║
   ██████╔╝███████╗   ██║   ██║  ██║██║███████╗ ██║ ╚═╝ ██║╚██████╔╝██████╔╝██║  ██║███████╗
   ╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚══════╝ ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝
   ============================================================ */

/**
 * openDetailModal — Master detail panel + embedded streaming player
 * Merges logic from: MoviePage, AdvancedStream, AdvancedVideoPlayer, openModal
 */
async function openDetailModal(id, type, autoPlay = false) {
    State.set('currentId', id);
    State.set('currentType', type);
    State.set('currentSeason', 1);
    State.set('currentEpisode', 1);
    State.set('currentServer', 0);

    const overlay = document.getElementById('detailOverlay');
    const modal   = document.getElementById('detailModal');
    const body    = document.getElementById('detailBody');

    if (!overlay || !modal || !body) return;

    // Show loading state
    body.innerHTML = `
      <div class="detail-loading">
        <div class="detail-spinner"></div>
        <span>Loading…</span>
      </div>`;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    history.pushState({ view: 'modal', id, type }, '');

    try {
        const [detail, credits, similar, external] = await Promise.all([
            API.fetch(`/${type}/${id}`, { append_to_response: 'videos,production_companies' }),
            API.fetch(`/${type}/${id}/credits`),
            API.fetch(`/${type}/${id}/similar`, { page: 1 }),
            API.fetch(`/${type}/${id}/external_ids`),
        ]);

        const item       = norm(detail, type);
        const title      = detail.title || detail.name || '';
        const year       = (detail.release_date || detail.first_air_date || '').slice(0, 4);
        const runtime    = detail.runtime ? fmtRuntime(detail.runtime) : '';
        const rating     = detail.vote_average ? detail.vote_average.toFixed(1) : 'N/A';
        const mp         = matchPct(detail.vote_average);
        const q          = qualityLabel(detail, type);
        const gnames     = (detail.genres || []).map(g => g.name);
        const ns         = detail.number_of_seasons || 0;
        const budget     = detail.budget ? `$${(detail.budget / 1e6).toFixed(1)}M` : '—';
        const revenue    = detail.revenue ? `$${(detail.revenue / 1e6).toFixed(1)}M` : '—';

        // Cast
        const cast = (credits.cast || []).slice(0, 8);
        const director = (credits.crew || []).find(c => c.job === 'Director');
        const writers  = (credits.crew || []).filter(c => ['Writer','Screenplay','Story'].includes(c.job)).slice(0, 3);

        // Wishlist state
        const inList = State.get('wishlist').some(w => w.id === String(id));

        // Similar cards
        const simCards = (similar.results || [])
            .slice(0, 8)
            .map(s => norm(s, type))
            .filter(Boolean)
            .map(s => `
              <article class="sim-card" onclick="openDetailModal('${s.id}','${s.type}',false)">
                ${s.poster ? `<img class="sim-card-img" src="${s.poster}" alt="${esc(s.title)}" loading="lazy">` : '<div class="sim-card-img sim-no-img"></div>'}
                <div class="sim-card-body">
                  <div class="sim-card-head">
                    <span class="sim-match">${matchPct(s.rating)}% Match</span>
                    <span class="sim-year">${s.year || ''}</span>
                  </div>
                  <p class="sim-card-title">${esc(s.title)}</p>
                  <p class="sim-card-desc">${esc((s.desc || '').slice(0, 120))}</p>
                </div>
              </article>`).join('');

        // Episodes HTML (TV only)
        const epsHTML = type === 'tv' && ns > 0
            ? `<section class="episodes-section active" id="episodesSection">
                <div class="episodes-top">
                  <h3>Episodes</h3>
                  <select id="seasonPicker" class="season-select" onchange="loadEpisodes(${id}, parseInt(this.value))">
                    ${Array.from({ length: ns }, (_, i) => `<option value="${i+1}">Season ${i+1}</option>`).join('')}
                  </select>
                </div>
                <div class="ep-list" id="epList"></div>
              </section>` : '';

        // Quality notice
        const qNotice = q.cam
            ? `<div class="q-notice q-notice-cam"><i class="fas fa-exclamation-triangle"></i><span><strong>${q.label}</strong> — This title is still in theaters. Video may be camera-recorded.</span></div>`
            : `<div class="q-notice q-notice-hd"><i class="fas fa-shield-alt"></i><span><strong>${q.label}</strong> — High definition stream available.</span></div>`;

        // Server buttons
        const serverBtns = SERVERS.map((s, i) =>
            `<button class="srv-btn ${i === 0 ? 'active' : ''}" onclick="switchServer(this,${i})">
              <i class="fas fa-circle-dot"></i> ${s.name}
            </button>`).join('');

        body.innerHTML = `
          <button class="modal-close" onclick="closeDetailModal()" aria-label="Close">
            <i class="fas fa-times"></i>
          </button>

          <!-- ── HERO BANNER ── -->
          <div class="detail-hero" style="${item?.backdrop ? `background-image:url('${item.backdrop}')` : 'background:#111'}">
            <div class="detail-hero-fade"></div>
            <div class="detail-hero-inner">
              <h2 class="detail-hero-title">${esc(title)}</h2>
              <div class="detail-hero-actions">
                <button class="btn-play-primary" onclick="startPlaying()">
                  <i class="fas fa-play"></i> Play Now
                </button>
                <button class="circle-action ${inList ? 'in-list' : ''}" id="detailListBtn"
                  onclick="toggleWishlist('${id}','${type}','${esc(title)}','${item?.poster||''}','${year}')"
                  title="${inList ? 'Remove from My List' : 'Add to My List'}">
                  <i class="fas ${inList ? 'fa-check' : 'fa-plus'}"></i>
                </button>
                <button class="circle-action" onclick="shareMedia('${esc(title)}')" title="Share">
                  <i class="fas fa-share-alt"></i>
                </button>
                <button class="circle-action" onclick="openDownloadModal('${id}','${type}','${esc(title)}')" title="Download">
                  <i class="fas fa-download"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- ── PLAYER (hidden until play pressed) ── -->
          <div class="player-section" id="playerSection" style="display:none">
            ${qNotice}
            <div class="player-box" id="playerBox">
              <iframe id="streamPlayer" src="" allowfullscreen
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"></iframe>
              <div class="player-bar">
                <div class="player-bar-left">
                  <span class="media-quality ${q.cls}">${q.label}</span>
                  <span class="player-hint">If video doesn't play, try another server</span>
                </div>
                <div class="player-bar-right">
                  <button class="pbtn" onclick="popOutPlayer()" title="Open in new tab">
                    <i class="fas fa-external-link-alt"></i> Pop Out
                  </button>
                  <button class="pbtn" id="fsBtn" onclick="goFullscreen()" title="Fullscreen">
                    <i class="fas fa-expand"></i> Fullscreen
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ── META ── -->
          <div class="detail-body">
            <div class="detail-columns">
              <div class="detail-left">
                <div class="detail-meta">
                  <span class="match">${mp}% Match</span>
                  <span class="year">${year}</span>
                  ${runtime ? `<span class="badge">${runtime}</span>` : ''}
                  <span class="badge">${detail.original_language?.toUpperCase() || ''}</span>
                  ${type === 'tv' ? `<span class="badge">${ns} Season${ns !== 1 ? 's' : ''}</span>` : ''}
                  <span class="media-quality ${q.cls}">${q.label}</span>
                </div>
                <p class="detail-desc">${esc(detail.overview || 'No overview available.')}</p>
              </div>
              <div class="detail-right">
                ${director ? `<p class="detail-tag"><span>Director:</span> ${esc(director.name)}</p>` : ''}
                ${writers.length ? `<p class="detail-tag"><span>Writers:</span> ${writers.map(w => esc(w.name)).join(', ')}</p>` : ''}
                ${gnames.length ? `<p class="detail-tag"><span>Genres:</span> ${gnames.map(g => `<a class="genre-link" href="#" onclick="event.preventDefault();filterByGenre(${(detail.genres||[]).find(x=>x.name===g)?.id},'${g}')">${g}</a>`).join(', ')}</p>` : ''}
                ${type === 'movie' ? `<p class="detail-tag"><span>Budget:</span> ${budget}</p>` : ''}
                ${type === 'movie' ? `<p class="detail-tag"><span>Revenue:</span> ${revenue}</p>` : ''}
              </div>
            </div>

            <!-- Rating bar -->
            <div class="meta-grid">
              <div class="meta-cell">
                <span class="meta-label">Rating</span>
                <span class="meta-value">⭐ ${rating}</span>
              </div>
              <div class="meta-cell">
                <span class="meta-label">Votes</span>
                <span class="meta-value">${(detail.vote_count || 0).toLocaleString()}</span>
              </div>
              <div class="meta-cell">
                <span class="meta-label">Status</span>
                <span class="meta-value">${detail.status || '—'}</span>
              </div>
              <div class="meta-cell">
                <span class="meta-label">Match</span>
                <span class="meta-value meta-match">${mp}%</span>
              </div>
            </div>

            <!-- Genres pills -->
            <div class="genre-pills">
              ${gnames.map(g => `<span class="genre-pill">${g}</span>`).join('')}
            </div>

            <!-- Server selection -->
            <div class="srv-section">
              <h4><i class="fas fa-server"></i> Streaming Servers</h4>
              <div class="srv-btns">${serverBtns}</div>
            </div>

            <!-- Cast -->
            ${cast.length ? `
            <div class="cast-section">
              <h4>Cast</h4>
              <div class="cast-scroll">
                ${cast.map(c => `
                  <div class="cast-card" onclick="searchByCast('${esc(c.name)}')">
                    <div class="cast-img-wrap">
                      ${c.profile_path
                          ? `<img src="${ENV.IMG_BASE}/w185${c.profile_path}" alt="${esc(c.name)}" loading="lazy">`
                          : `<div class="cast-no-img"><i class="fas fa-user"></i></div>`}
                    </div>
                    <span class="cast-name">${esc(c.name)}</span>
                    <span class="cast-char">${esc(c.character || '')}</span>
                  </div>`).join('')}
              </div>
            </div>` : ''}

            <!-- TV: Episodes -->
            ${epsHTML}

            <!-- Similar -->
            ${simCards ? `
            <div class="similar-section">
              <h3>More Like This</h3>
              <div class="similar-grid">${simCards}</div>
            </div>` : ''}
          </div>`;

        // Load episodes if TV
        if (type === 'tv' && ns > 0) loadEpisodes(id, 1);

        // Auto-play if requested
        if (autoPlay) {
            setTimeout(() => startPlaying(), 400);
        }

        // Track watch history
        addToHistory(id, type, title, item?.poster || '', year);

    } catch (err) {
        body.innerHTML = `<div class="detail-error"><i class="fas fa-exclamation-triangle"></i><p>Failed to load details. Please try again.</p><button class="btn-retry" onclick="openDetailModal('${id}','${type}',${autoPlay})">Retry</button></div>`;
        console.error('[DetailModal]', err);
    }
}

function closeDetailModal() {
    const overlay = document.getElementById('detailOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    // Nuke iframe src to stop playback/ads
    const iframe = document.getElementById('streamPlayer');
    if (iframe) iframe.src = '';
    if (history.state?.view === 'modal') history.back();
}

function startPlaying() {
    const section = document.getElementById('playerSection');
    const iframe  = document.getElementById('streamPlayer');
    if (!section || !iframe) return;
    section.style.display = 'block';
    iframe.src = getEmbedUrl();
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('Stream started — enjoy!');
}

function switchServer(btn, idx) {
    State.set('currentServer', idx);
    document.querySelectorAll('.srv-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const iframe = document.getElementById('streamPlayer');
    if (iframe && iframe.src) iframe.src = getEmbedUrl();
    showToast(`Switched to ${SERVERS[idx].name}`);
}

async function loadEpisodes(tvId, season) {
    State.set('currentSeason', parseInt(season));
    State.set('currentEpisode', 1);
    const picker = document.getElementById('seasonPicker');
    if (picker) picker.value = season;
    const list = document.getElementById('epList');
    if (!list) return;
    list.innerHTML = '<div class="ep-loading"><div class="detail-spinner"></div></div>';
    try {
        const data = await API.fetch(`/tv/${tvId}/season/${season}`);
        list.innerHTML = (data.episodes || []).map(ep => `
          <div class="ep-card" onclick="playEpisode(${tvId},${season},${ep.episode_number},this)">
            <div class="ep-index">${ep.episode_number}</div>
            <div class="ep-thumb" style="${ep.still_path ? `background-image:url('${ENV.IMG_BASE}/w300${ep.still_path}')` : 'background:#222'}">
              <div class="ep-play-overlay"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
            </div>
            <div class="ep-info">
              <div class="ep-info-top">
                <span class="ep-name">${esc(ep.name || `Episode ${ep.episode_number}`)}</span>
                ${ep.runtime ? `<span class="ep-len">${fmtRuntime(ep.runtime)}</span>` : ''}
              </div>
              <p class="ep-synopsis">${esc((ep.overview || '').slice(0, 160))}</p>
            </div>
          </div>`).join('');
    } catch (e) {
        list.innerHTML = '<p class="ep-error">Failed to load episodes.</p>';
        console.error('[Episodes]', e);
    }
}

function playEpisode(tvId, season, episode, btn) {
    State.set('currentSeason', season);
    State.set('currentEpisode', episode);
    document.querySelectorAll('.ep-card').forEach(c => c.classList.remove('ep-active'));
    if (btn) btn.classList.add('ep-active');
    const playerSection = document.getElementById('playerSection');
    const iframe = document.getElementById('streamPlayer');
    if (!playerSection || !iframe) return;
    playerSection.style.display = 'block';
    iframe.src = getEmbedUrl();
    playerSection.scrollIntoView({ behavior: 'smooth' });
    showToast(`Playing S${season}E${episode}`);
}

function popOutPlayer() {
    const url = getEmbedUrl();
    if (url) window.open(url, '_blank', 'noopener');
}

function goFullscreen() {
    const box = document.getElementById('playerBox');
    if (!box) return;
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    } else {
        (box.requestFullscreen || box.webkitRequestFullscreen || box.mozRequestFullScreen).call(box);
    }
}

document.addEventListener('fullscreenchange', () => {
    const btn = document.getElementById('fsBtn');
    if (btn) btn.innerHTML = document.fullscreenElement
        ? '<i class="fas fa-compress"></i> Exit'
        : '<i class="fas fa-expand"></i> Fullscreen';
});

/* ============================================================
   ██████╗  ██████╗ ██╗    ██╗███╗   ██╗██╗      ██████╗  █████╗ ██████╗
   ██╔══██╗██╔═══██╗██║    ██║████╗  ██║██║     ██╔═══██╗██╔══██╗██╔══██╗
   ██║  ██║██║   ██║██║ █╗ ██║██╔██╗ ██║██║     ██║   ██║███████║██║  ██║
   ██║  ██║██║   ██║██║███╗██║██║╚██╗██║██║     ██║   ██║██╔══██║██║  ██║
   ██████╔╝╚██████╔╝╚███╔███╔╝██║ ╚████║███████╗╚██████╔╝██║  ██║██████╔╝
   ╚═════╝  ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝
   ============================================================ */

/** Download modal — launches vidsrc.vip download iframe */
function openDownloadModal(id, type, title) {
    const overlay = document.getElementById('downloadOverlay');
    if (!overlay) return;
    const iframe = overlay.querySelector('.dl-iframe');
    const titleEl = overlay.querySelector('.dl-title');
    if (titleEl) titleEl.textContent = `Download: ${title}`;
    if (iframe) {
        iframe.src = type === 'movie'
            ? `${ENV.DL_EMBED}/movie/${id}`
            : `${ENV.DL_EMBED}/tv/${id}/${State.get('currentSeason')}/${State.get('currentEpisode')}`;
    }
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDownloadModal() {
    const overlay = document.getElementById('downloadOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    const iframe = overlay.querySelector('.dl-iframe');
    if (iframe) iframe.src = '';
}

/* ============================================================
   ███████╗███████╗ █████╗ ██████╗  ██████╗██╗  ██╗
   ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝██║  ██║
   ███████╗█████╗  ███████║██████╔╝██║     ███████║
   ╚════██║██╔══╝  ██╔══██║██╔══██╗██║     ██╔══██║
   ███████║███████╗██║  ██║██║  ██║╚██████╗██║  ██║
   ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
   ============================================================ */

const Search = (() => {
    let _debounce = null;
    let _suggestDebounce = null;

    function open() {
        State.set('searchOpen', true);
        const wrap = document.getElementById('searchWrapper');
        const input = document.getElementById('searchInput');
        if (wrap) wrap.classList.add('open');
        if (input) { input.focus(); }
    }

    function close() {
        State.set('searchOpen', false);
        const wrap = document.getElementById('searchWrapper');
        const input = document.getElementById('searchInput');
        if (wrap) wrap.classList.remove('open');
        if (input) { input.value = ''; }
        hideSuggestions();
    }

    function toggle() {
        State.get('searchOpen') ? close() : open();
    }

    function hideSuggestions() {
        const sug = document.getElementById('searchSuggestions');
        if (sug) sug.classList.remove('active');
    }

    function onKeydown(e) {
        const q = e.target.value.trim();
        if (e.key === 'Enter' && q) {
            clearTimeout(_debounce);
            hideSuggestions();
            State.set('searchQuery', q);
            State.set('searchPage', 1);
            doSearch();
            return;
        }
        if (!q) { hideSuggestions(); goHome(); return; }

        // Live suggestions (debounced)
        clearTimeout(_suggestDebounce);
        _suggestDebounce = setTimeout(() => loadSuggestions(q), 300);

        // Auto-search for 3+ chars
        if (q.length >= 3) {
            clearTimeout(_debounce);
            _debounce = setTimeout(() => {
                State.set('searchQuery', q);
                State.set('searchPage', 1);
                doSearch();
            }, 600);
        }
    }

    async function loadSuggestions(q) {
        const sug = document.getElementById('searchSuggestions');
        if (!sug) return;
        try {
            const data = await API.fetch('/search/multi', { query: q, page: 1 });
            const results = (data.results || [])
                .filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && (r.poster_path || r.backdrop_path))
                .slice(0, 7);

            if (!results.length) { hideSuggestions(); return; }

            sug.innerHTML = results.map(r => {
                const item = norm(r, r.media_type);
                if (!item) return '';
                return `
                <div class="suggest-item" onclick="openDetailModal('${item.id}','${item.type}',false);Search.close()">
                  ${item.poster
                      ? `<img class="suggest-poster" src="${item.poster}" alt="${esc(item.title)}" loading="lazy">`
                      : `<div class="suggest-poster suggest-poster-empty"></div>`}
                  <div class="suggest-info">
                    <p class="suggest-title">${esc(item.title)}</p>
                    <p class="suggest-meta">
                      <span class="sug-type">${item.type.toUpperCase()}</span>
                      ${item.year ? ` • ${item.year}` : ''}
                      ${item.rating ? ` • ★ ${item.rating}` : ''}
                    </p>
                  </div>
                </div>`;
            }).join('') + `<div class="suggest-footer" onclick="Search.triggerFull('${esc(q)}')">See all results for "<strong>${esc(q)}</strong>"</div>`;

            sug.classList.add('active');
        } catch (_) {}
    }

    async function doSearch() {
        const q = State.get('searchQuery');
        if (!q) return;
        showResultsPanel(`Results for "<span>${esc(q)}</span>"`);
        const grid = document.getElementById('searchResultsGrid');
        const page = State.get('searchPage');
        if (page === 1 && grid) grid.innerHTML = '<div class="results-loading"><div class="detail-spinner"></div></div>';

        try {
            const data = await API.fetch('/search/multi', { query: q, page });
            const results = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');

            if (!results.length && page === 1) {
                grid.innerHTML = `<div class="no-results"><i class="fas fa-search"></i><p>No results for "<strong>${esc(q)}</strong>"</p></div>`;
                document.getElementById('loadMoreBtn').style.display = 'none';
                return;
            }

            const cards = results.map(r => {
                const item = norm(r, r.media_type);
                if (!item) return '';
                return gridCard(item);
            }).join('');

            if (page === 1) grid.innerHTML = cards;
            else grid.insertAdjacentHTML('beforeend', cards);

            const lb = document.getElementById('loadMoreBtn');
            if (lb) lb.style.display = data.page < data.total_pages ? 'flex' : 'none';
        } catch (e) {
            console.error('[Search]', e);
        }
    }

    function triggerFull(q) {
        const input = document.getElementById('searchInput');
        if (input) input.value = q;
        State.set('searchQuery', q);
        State.set('searchPage', 1);
        hideSuggestions();
        doSearch();
    }

    return { open, close, toggle, onKeydown, doSearch, hideSuggestions, triggerFull };
})();

function gridCard(item) {
    const mp = matchPct(item.rating);
    return `
    <article class="grid-card" onclick="openDetailModal('${item.id}','${item.type}',false)">
      ${item.poster
          ? `<img src="${item.poster}" alt="${esc(item.title)}" loading="lazy" decoding="async">`
          : `<div class="grid-card-no-img"><i class="fas fa-film"></i></div>`}
      <div class="grid-card-body">
        <p class="grid-card-title">${esc(item.title)}</p>
        <div class="grid-card-meta">
          <span class="match">${mp}% Match</span>
          <span>${item.year || ''}</span>
          <span class="type-badge">${item.type.toUpperCase()}</span>
        </div>
      </div>
    </article>`;
}

function showResultsPanel(title) {
    document.getElementById('pageHome').style.display   = 'none';
    document.getElementById('pageResults').classList.add('active');
    const t = document.getElementById('resultsTitle');
    if (t) t.innerHTML = title;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goHome() {
    document.getElementById('pageHome').style.display   = '';
    document.getElementById('pageResults').classList.remove('active');
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    State.set('searchQuery', '');
    State.set('currentCategory', '');
    State.set('currentGenreId', null);
    updateActiveNav('nav-home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function searchByCast(name) {
    const input = document.getElementById('searchInput');
    if (input) { input.value = name; Search.open(); }
    State.set('searchQuery', name);
    State.set('searchPage', 1);
    Search.doSearch();
}

/* ============================================================
   ███████╗██╗██╗  ████████╗███████╗██████╗ ███████╗
   ██╔════╝██║██║  ╚══██╔══╝██╔════╝██╔══██╗██╔════╝
   █████╗  ██║██║     ██║   █████╗  ██████╔╝███████╗
   ██╔══╝  ██║██║     ██║   ██╔══╝  ██╔══██╗╚════██║
   ██║     ██║███████╗██║   ███████╗██║  ██║███████║
   ╚═╝     ╚═╝╚══════╝╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝
   ============================================================ */

async function showCategory(type, cat) {
    State.set('currentCategoryType', type);
    State.set('currentCategory', cat);
    State.set('currentGenreId', null);
    State.set('filterPage', 1);

    const labels = {
        popular:    `Popular ${type === 'movie' ? 'Movies' : 'TV Shows'}`,
        top_rated:  'Top Rated',
        upcoming:   'Upcoming',
        now_playing:'Now Playing',
        on_the_air: 'Currently Airing',
    };
    showResultsPanel(labels[cat] || cat);

    const grid = document.getElementById('searchResultsGrid');
    if (grid) grid.innerHTML = '<div class="results-loading"><div class="detail-spinner"></div></div>';

    try {
        const data = await API.fetch(`/${type}/${cat}`, { page: 1 });
        if (grid) {
            grid.innerHTML = (data.results || []).map(i => {
                const item = norm(i, type);
                return item ? gridCard(item) : '';
            }).join('');
        }
        const lb = document.getElementById('loadMoreBtn');
        if (lb) lb.style.display = data.page < data.total_pages ? 'flex' : 'none';
    } catch (e) { console.error('[Category]', e); }

    updateActiveNav('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function filterByGenre(gid, gname) {
    if (!gid) return;
    State.set('currentGenreId', gid);
    State.set('currentCategoryType', 'movie');
    State.set('currentCategory', '');
    State.set('filterPage', 1);

    showResultsPanel(`<i class="fas fa-film"></i> ${esc(gname)} Movies`);

    const grid = document.getElementById('searchResultsGrid');
    if (grid) grid.innerHTML = '<div class="results-loading"><div class="detail-spinner"></div></div>';

    try {
        const data = await API.fetch('/discover/movie', { with_genres: gid, page: 1, sort_by: 'popularity.desc' });
        if (grid) grid.innerHTML = (data.results || []).map(i => gridCard(norm(i, 'movie'))).filter(Boolean).join('');
        const lb = document.getElementById('loadMoreBtn');
        if (lb) lb.style.display = data.page < data.total_pages ? 'flex' : 'none';
    } catch (e) { console.error('[Genre]', e); }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadMore() {
    if (State.get('isFetchingMore')) return;
    State.set('isFetchingMore', true);

    const q   = State.get('searchQuery');
    const cat = State.get('currentCategory');
    const gid = State.get('currentGenreId');
    const type = State.get('currentCategoryType');
    const page = State.get('filterPage') + 1;
    State.set('filterPage', page);

    const grid = document.getElementById('searchResultsGrid');

    try {
        let data;
        if (q) {
            State.set('searchPage', State.get('searchPage') + 1);
            data = await API.fetch('/search/multi', { query: q, page: State.get('searchPage') });
            const results = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
            if (grid) grid.insertAdjacentHTML('beforeend', results.map(r => gridCard(norm(r, r.media_type))).filter(Boolean).join(''));
        } else if (gid) {
            data = await API.fetch('/discover/movie', { with_genres: gid, page, sort_by: 'popularity.desc' });
            if (grid) grid.insertAdjacentHTML('beforeend', (data.results || []).map(i => gridCard(norm(i, 'movie'))).filter(Boolean).join(''));
        } else if (cat) {
            data = await API.fetch(`/${type}/${cat}`, { page });
            if (grid) grid.insertAdjacentHTML('beforeend', (data.results || []).map(i => gridCard(norm(i, type))).filter(Boolean).join(''));
        }

        const lb = document.getElementById('loadMoreBtn');
        if (lb && data) lb.style.display = data.page < data.total_pages ? 'flex' : 'none';
    } catch (e) { console.error('[LoadMore]', e); }

    State.set('isFetchingMore', false);
}

/* ============================================================
   ██╗    ██╗██╗███████╗██╗  ██╗██╗     ██╗███████╗████████╗
   ██║    ██║██║██╔════╝██║  ██║██║     ██║██╔════╝╚══██╔══╝
   ██║ █╗ ██║██║███████╗███████║██║     ██║███████╗   ██║
   ██║███╗██║██║╚════██║██╔══██║██║     ██║╚════██║   ██║
   ╚███╔███╔╝██║███████║██║  ██║███████╗██║███████║   ██║
    ╚══╝╚══╝ ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝╚══════╝   ╚═╝
   ============================================================ */

function toggleWishlist(id, type, title, poster, year) {
    const wishlist  = State.get('wishlist');
    const idx       = wishlist.findIndex(w => w.id === String(id));
    let added;

    if (idx > -1) {
        wishlist.splice(idx, 1);
        added = false;
        showToast(`Removed "${title}" from My List`, 'info');
    } else {
        wishlist.unshift({ id: String(id), type, title, poster, year, addedAt: Date.now() });
        added = true;
        showToast(`Added "${title}" to My List`);
    }

    State.set('wishlist', wishlist);
    State.persist();
    refreshWishlistUI();

    // Update any visible buttons
    document.querySelectorAll(`[data-wishlist-id="${id}"]`).forEach(btn => {
        btn.classList.toggle('in-list', added);
        btn.querySelector('i')?.classList.toggle('fa-plus', !added);
        btn.querySelector('i')?.classList.toggle('fa-check', added);
    });

    // Update detail modal button if open
    const detailBtn = document.getElementById('detailListBtn');
    if (detailBtn && State.get('currentId') === String(id)) {
        detailBtn.classList.toggle('in-list', added);
        const icon = detailBtn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-plus', !added);
            icon.classList.toggle('fa-check', added);
        }
    }
}

function refreshWishlistUI() {
    const list = document.getElementById('wishlistItems');
    const empty = document.getElementById('wishlistEmpty');
    const wishlist = State.get('wishlist');

    if (!list) return;
    if (!wishlist.length) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = wishlist.map(item => `
      <div class="wishlist-item">
        ${item.poster
            ? `<img class="wishlist-poster" src="${item.poster}" alt="${esc(item.title)}" loading="lazy">`
            : `<div class="wishlist-poster wishlist-poster-empty"><i class="fas fa-film"></i></div>`}
        <div class="wishlist-info">
          <p class="wishlist-title">${esc(item.title)}</p>
          <p class="wishlist-meta">${item.type.toUpperCase()}${item.year ? ' • ' + item.year : ''}</p>
        </div>
        <div class="wishlist-actions">
          <button class="wl-play-btn" onclick="closeWishlistPanel();openDetailModal('${item.id}','${item.type}',true)" title="Play">
            <i class="fas fa-play"></i>
          </button>
          <button class="wl-remove-btn" onclick="toggleWishlist('${item.id}','${item.type}','${esc(item.title)}','${item.poster||''}','${item.year||''}')" title="Remove">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>`).join('');
}

function openWishlistPanel() {
    const panel = document.getElementById('wishlistPanel');
    if (!panel) return;
    refreshWishlistUI();
    panel.classList.add('open');
    State.set('wishlistPanelOpen', true);
}

function closeWishlistPanel() {
    const panel = document.getElementById('wishlistPanel');
    if (!panel) return;
    panel.classList.remove('open');
    State.set('wishlistPanelOpen', false);
}

function toggleWishlistPanel() {
    State.get('wishlistPanelOpen') ? closeWishlistPanel() : openWishlistPanel();
}

/* ============================================================
   ██╗  ██╗██╗███████╗████████╗ ██████╗ ██████╗ ██╗   ██╗
   ██║  ██║██║██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗╚██╗ ██╔╝
   ███████║██║███████╗   ██║   ██║   ██║██████╔╝ ╚████╔╝
   ██╔══██║██║╚════██║   ██║   ██║   ██║██╔══██╗  ╚██╔╝
   ██║  ██║██║███████║   ██║   ╚██████╔╝██║  ██║   ██║
   ╚═╝  ╚═╝╚═╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝
   ============================================================ */

function addToHistory(id, type, title, poster, year) {
    const hist = State.get('watchHistory');
    const filtered = hist.filter(h => h.id !== String(id));
    filtered.unshift({ id: String(id), type, title, poster, year, watchedAt: Date.now() });
    State.set('watchHistory', filtered.slice(0, 100)); // cap at 100
    State.persist();
    refreshHistoryUI();
}

function refreshHistoryUI() {
    const list = document.getElementById('historyItems');
    if (!list) return;
    const hist = State.get('watchHistory');
    if (!hist.length) { list.innerHTML = '<p class="history-empty">No watch history yet</p>'; return; }
    list.innerHTML = hist.slice(0, 20).map(item => `
      <div class="history-item" onclick="openDetailModal('${item.id}','${item.type}',false)">
        ${item.poster ? `<img class="history-poster" src="${item.poster}" alt="${esc(item.title)}" loading="lazy">` : ''}
        <div class="history-info">
          <p class="history-title">${esc(item.title)}</p>
          <p class="history-meta">${item.type.toUpperCase()}${item.year ? ' • ' + item.year : ''}</p>
        </div>
      </div>`).join('');
}

/* ============================================================
   ███╗   ██╗ █████╗ ██╗   ██╗██████╗  █████╗ ██████╗
   ████╗  ██║██╔══██╗██║   ██║██╔══██╗██╔══██╗██╔══██╗
   ██╔██╗ ██║███████║██║   ██║██████╔╝███████║██████╔╝
   ██║╚██╗██║██╔══██║╚██╗ ██╔╝██╔══██╗██╔══██║██╔══██╗
   ██║ ╚████║██║  ██║ ╚████╔╝ ██████╔╝██║  ██║██║  ██║
   ╚═╝  ╚═══╝╚═╝  ╚═╝  ╚═══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
   ============================================================ */

/** Full navbar scroll/solid effect, mobile menu, avatar dropdown */
const Navbar = (() => {
    let _scrolled = false;

    function onScroll() {
        const nav = document.getElementById('navbar');
        if (!nav) return;
        const solid = window.scrollY > 60;
        if (solid !== _scrolled) {
            nav.classList.toggle('solid', solid);
            _scrolled = solid;
        }
    }

    function toggleMobileMenu() {
        const menu = document.getElementById('mobileNav');
        if (menu) menu.classList.toggle('open');
        State.toggle('mobileMenuOpen');
    }

    function closeMobileMenu() {
        const menu = document.getElementById('mobileNav');
        if (menu) menu.classList.remove('open');
        State.set('mobileMenuOpen', false);
    }

    function toggleAccountDropdown() {
        const dd = document.getElementById('accountDropdown');
        if (dd) dd.classList.toggle('open');
    }

    function closeAccountDropdown() {
        const dd = document.getElementById('accountDropdown');
        if (dd) dd.classList.remove('open');
    }

    function toggleNotifPanel() {
        const panel = document.getElementById('notifPanel');
        if (!panel) return;
        const open = State.toggle('notifPanelOpen');
        panel.classList.toggle('open', open);
        if (open) {
            const badge = document.getElementById('notifBadge');
            if (badge) badge.style.display = 'none';
        }
    }

    function init() {
        window.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('click', e => {
            if (!e.target.closest('#accountMenu')) closeAccountDropdown();
            if (!e.target.closest('#notifToggle') && !e.target.closest('#notifPanel')) {
                const panel = document.getElementById('notifPanel');
                if (panel) { panel.classList.remove('open'); State.set('notifPanelOpen', false); }
            }
            if (!e.target.closest('#mobileNav') && !e.target.closest('.mobile-menu-btn')) closeMobileMenu();
        });
    }

    return { init, onScroll, toggleMobileMenu, closeMobileMenu, toggleAccountDropdown, toggleNotifPanel };
})();

/* ============================================================
   ██╗███╗   ██╗███████╗██╗███╗   ██╗██╗████████╗███████╗
   ██║████╗  ██║██╔════╝██║████╗  ██║██║╚══██╔══╝██╔════╝
   ██║██╔██╗ ██║█████╗  ██║██╔██╗ ██║██║   ██║   █████╗
   ██║██║╚██╗██║██╔══╝  ██║██║╚██╗██║██║   ██║   ██╔══╝
   ██║██║ ╚████║██║     ██║██║ ╚████║██║   ██║   ███████╗
   ╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚══════╝
   ============================================================ */

/** Initializes after DOM ready — orchestrates all subsystems */
async function init() {
    // Activate OmegaShield ad-blocker
    OmegaShield.init();

    // Loader screen
    const loader = document.getElementById('loaderOverlay');
    if (loader) {
        setTimeout(() => loader.classList.add('hidden'), 1400);
    }

    // Navbar
    Navbar.init();

    // Load genre map (needed for genre pills + labels)
    try {
        const [mg, tg] = await Promise.all([
            API.fetch('/genre/movie/list'),
            API.fetch('/genre/tv/list'),
        ]);
        [...(mg.genres || []), ...(tg.genres || [])].forEach(g => { GENRE_MAP[g.id] = g.name; });
        buildGenrePills();
    } catch (_) {}

    // Hero
    Hero.load();

    // Content rows
    Rows.loadAll();

    // Wishlist & history UI init
    refreshWishlistUI();
    refreshHistoryUI();

    // Infinite scroll (optional)
    setupInfiniteScroll();

    // vh fix for mobile browsers
    setVhVar();
    window.addEventListener('resize', setVhVar, { passive: true });

    // Keyboard shortcuts
    setupKeyboard();

    // Footer quick links
    initFooter();

    // Handle browser back button
    window.addEventListener('popstate', e => {
        if (!e.state || e.state.view !== 'modal') closeDetailModal();
    });

    console.log('%cTENEFLIX loaded ✓', 'color:#e50914;font-size:18px;font-weight:900;');
}

function setVhVar() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}

function buildGenrePills() {
    const container = document.getElementById('genrePills');
    if (!container) return;
    const genreList = [
        { id: 28,    name: 'Action' },
        { id: 35,    name: 'Comedy' },
        { id: 27,    name: 'Horror' },
        { id: 878,   name: 'Sci-Fi' },
        { id: 10749, name: 'Romance' },
        { id: 53,    name: 'Thriller' },
        { id: 18,    name: 'Drama' },
        { id: 12,    name: 'Adventure' },
        { id: 16,    name: 'Animation' },
        { id: 99,    name: 'Documentary' },
        { id: 14,    name: 'Fantasy' },
        { id: 80,    name: 'Crime' },
        { id: 9648,  name: 'Mystery' },
        { id: 10402, name: 'Music' },
    ];
    container.innerHTML = genreList.map(g =>
        `<button class="genre-pill-btn" data-id="${g.id}" onclick="filterByGenre(${g.id},'${g.name}')">${g.name}</button>`
    ).join('');
}

function updateActiveNav(id) {
    document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
    if (id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    }
}

function setupKeyboard() {
    document.addEventListener('keydown', e => {
        const tag = document.activeElement?.tagName;
        if (e.key === 'Escape') {
            closeDetailModal();
            closeDownloadModal();
            closeWishlistPanel();
            Search.hideSuggestions();
        }
        if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
            e.preventDefault();
            Search.open();
        }
    });
}

function setupInfiniteScroll() {
    const sentinel = document.getElementById('infiniteScrollSentinel');
    if (!sentinel) return;
    const obs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && State.get('infiniteScrollOn') && !State.get('isFetchingMore')) {
            loadMore();
        }
    }, { rootMargin: '200px' });
    obs.observe(sentinel);
}

function toggleInfiniteScroll() {
    const on = State.toggle('infiniteScrollOn');
    const btn = document.getElementById('infiniteScrollBtn');
    if (btn) {
        btn.textContent = on ? '⚡ Auto-Load: ON' : '🔄 Auto-Load: OFF';
        btn.classList.toggle('active', on);
    }
    showToast(on ? 'Auto-load enabled' : 'Auto-load disabled', 'info');
}

/* ============================================================
   ███████╗██╗  ██╗ █████╗ ██████╗ ███████╗
   ██╔════╝██║  ██║██╔══██╗██╔══██╗██╔════╝
   ███████╗███████║███████║██████╔╝█████╗
   ╚════██║██╔══██║██╔══██║██╔══██╗██╔══╝
   ███████║██║  ██║██║  ██║██║  ██║███████╗
   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
   ============================================================ */

async function shareMedia(title) {
    const url = window.location.href;
    if (navigator.share) {
        try {
            await navigator.share({ title: `Watch ${title} on TENEFLIX`, url });
            return;
        } catch (_) {}
    }
    try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard!');
    } catch (_) {
        showToast('Copy URL: ' + url, 'info');
    }
}

/* ============================================================
   ███████╗ ██████╗  ██████╗ ████████╗███████╗██████╗
   ██╔════╝██╔═══██╗██╔═══██╗╚══██╔══╝██╔════╝██╔══██╗
   █████╗  ██║   ██║██║   ██║   ██║   █████╗  ██████╔╝
   ██╔══╝  ██║   ██║██║   ██║   ██║   ██╔══╝  ██╔══██╗
   ██║     ╚██████╔╝╚██████╔╝   ██║   ███████╗██║  ██║
   ╚═╝      ╚═════╝  ╚═════╝    ╚═╝   ╚══════╝╚═╝  ╚═╝
   ============================================================ */

function initFooter() {
    setTimeout(() => {
        const footerLinks = document.querySelectorAll('.footer-link[data-cat]');
        footerLinks.forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const cat  = link.dataset.cat;
                const type = link.dataset.type || 'movie';
                showCategory(type, cat);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }, 600);
}

/* ============================================================
   ██████╗ ██╗   ██╗██████╗ ██╗     ██╗ ██████╗
   ██╔══██╗██║   ██║██╔══██╗██║     ██║██╔════╝
   ██████╔╝██║   ██║██████╔╝██║     ██║██║
   ██╔═══╝ ██║   ██║██╔══██╗██║     ██║██║
   ██║     ╚██████╔╝██████╔╝███████╗██║╚██████╗
   ╚═╝      ╚═════╝ ╚═════╝ ╚══════╝╚═╝ ╚═════╝
   ============================================================ */

// Expose globals needed by inline HTML event handlers
window.Hero                 = Hero;
window.Search               = Search;
window.Navbar               = Navbar;
window.openDetailModal      = openDetailModal;
window.closeDetailModal     = closeDetailModal;
window.switchServer         = switchServer;
window.loadEpisodes         = loadEpisodes;
window.playEpisode          = playEpisode;
window.startPlaying         = startPlaying;
window.popOutPlayer         = popOutPlayer;
window.goFullscreen         = goFullscreen;
window.openDownloadModal    = openDownloadModal;
window.closeDownloadModal   = closeDownloadModal;
window.toggleWishlist       = toggleWishlist;
window.toggleWishlistPanel  = toggleWishlistPanel;
window.openWishlistPanel    = openWishlistPanel;
window.closeWishlistPanel   = closeWishlistPanel;
window.showCategory         = showCategory;
window.filterByGenre        = filterByGenre;
window.goHome               = goHome;
window.loadMore             = loadMore;
window.toggleInfiniteScroll = toggleInfiniteScroll;
window.shareMedia           = shareMedia;
window.searchByCast         = searchByCast;
window.showToast            = showToast;
window.updateActiveNav      = updateActiveNav;

// ─── BOOT ─────────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
