/* ============================================================
   UzairTechGuide - script.js
   - Robust vanilla JS with defensive checks
   - Handles hamburger + morphing + fallback to Unicode
   - Theme toggle with persistence (localStorage)
   - Overlay handling + accessibility (focus move)
   - Smooth scroll for same-page anchors
   - Reveal-on-scroll using IntersectionObserver
   - Comments are verbose and aimed at non-webdev readers
   ============================================================ */

/* ---------- small utilities ---------- */
/* $() and $$() are convenience helpers to find elements quickly.
   $ returns the first match; $$ returns an array of matches. */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ---------- Element references ---------- */
const hamburger = $('#hamburger-btn');      // the top-right hamburger button
const sideNav = $('#side-nav');             // side navigation panel (slides from right)
const sideClose = $('#side-close');         // close (×) button inside side nav
let overlay = $('#page-overlay');          // the dark overlay behind the panel
const themeToggle = $('#theme-toggle');     // theme toggle button

/* Defensive: ensure required elements exist. If not, we log and gracefully exit. */
if (!hamburger || !sideNav || !overlay || !themeToggle) {
  console.warn('One or more core UI elements are missing. Script will try to run partially.');
}

/* ---------- Overlay creation fallback ----------
   In case overlay is missing or script runs before DOM finished loading,
   we ensure an overlay element exists and is appended to <body>.
*/
(function ensureOverlay(){
  try {
    if (!overlay) {
      const ov = document.createElement('div');
      ov.id = 'page-overlay';
      ov.className = 'overlay';
      ov.hidden = true;
      document.body.appendChild(ov);
      overlay = ov;
    }
  } catch (e) {
    console.warn('Failed to ensure overlay exists:', e);
  }
})();

/* ---------- Side nav open/close logic ----------
   Two functions: openSide() and closeSide().
   They:
   - add/remove CSS classes to show/hide elements
   - manage aria attributes for accessibility
   - move keyboard focus into the panel when opened
   - restore focus when closed
*/
let lastFocusedBeforeNav = null;

function openSide() {
  try {
    lastFocusedBeforeNav = document.activeElement;
    sideNav.classList.add('open');
    hamburger.classList.add('open'); // triggers CSS morph to X
    overlay.classList.add('show');
    overlay.hidden = false;
    hamburger.setAttribute('aria-expanded', 'true');
    sideNav.setAttribute('aria-hidden', 'false');

    // Move keyboard focus to the first link inside the side nav for accessibility
    const firstLink = sideNav.querySelector('.side-links a');
    if (firstLink) firstLink.focus();
  } catch (err) {
    console.error('openSide error:', err);
  }
}

function closeSide() {
  try {
    sideNav.classList.remove('open');
    hamburger.classList.remove('open');
    overlay.classList.remove('show');
    setTimeout(() => { overlay.hidden = true; }, 220);
    hamburger.setAttribute('aria-expanded', 'false');
    sideNav.setAttribute('aria-hidden', 'true');

    // restore focus to last focused element (usually hamburger)
    if (lastFocusedBeforeNav) {
      try { lastFocusedBeforeNav.focus(); } catch (e) {}
      lastFocusedBeforeNav = null;
    }
  } catch (err) {
    console.error('closeSide error:', err);
  }
}

/* Attach click listeners safely */
if (hamburger) {
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sideNav.classList.contains('open')) closeSide();
    else openSide();
  });
}
if (sideClose) sideClose.addEventListener('click', closeSide);
if (overlay) overlay.addEventListener('click', closeSide);

/* Close side nav when clicking outside or pressing Escape */
document.addEventListener('click', (e) => {
  if (!sideNav.contains(e.target) && !hamburger.contains(e.target)) {
    if (sideNav.classList.contains('open')) closeSide();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sideNav.classList.contains('open')) closeSide();
});

/* ---------- Hamburger fallback detection ----------
   Some devices or mysterious CSS bugs render the 3 <span> bars incorrectly.
   We detect whether the bars have a useful width; if not we hide the spans
   and show the Unicode fallback "☰" inside the button.
*/
(function hamburgerFallbackCheck(){
  try {
    const spans = hamburger ? Array.from(hamburger.querySelectorAll('span')) : [];
    const bars = spans.filter(s => !s.classList.contains('hamburger-fallback'));

    // If no bars or bars have negligible width/height, show fallback
    let needFallback = false;
    if (!bars.length) needFallback = true;
    else {
      // compute a typical bar's computed width; if it's < 6px we consider it broken
      const rect = bars[0].getBoundingClientRect();
      if (rect.width < 6 || rect.height < 2) needFallback = true;
    }

    // toggle fallback visibility by adding class 'use-fallback' to the hamburger
    if (needFallback) {
      hamburger.classList.add('use-fallback');
      // show the fallback element
      const fb = hamburger.querySelector('.hamburger-fallback');
      if (fb) { fb.style.display = 'block'; }
      // hide the three empty spans visually (they may be garbage)
      bars.forEach(s => { s.style.display = 'none'; });
    } else {
      // normal good path: ensure fallback hidden and spans visible
      hamburger.classList.remove('use-fallback');
      const fb = hamburger.querySelector('.hamburger-fallback');
      if (fb) fb.style.display = 'none';
      bars.forEach(s => { s.style.display = 'block'; });
    }
  } catch (e) {
    // if something unusually fails, fallback to unicode
    try {
      const fb = hamburger.querySelector('.hamburger-fallback');
      if (fb) { fb.style.display = 'block'; }
      const spans = hamburger.querySelectorAll('span:not(.hamburger-fallback)');
      spans.forEach(s => { s.style.display = 'none'; });
      hamburger.classList.add('use-fallback');
    } catch (err) {/* swallow */}
  }
})();

/* ---------- Theme toggle (dark/light) ----------
   - We persist the user's selection in localStorage
   - We respect OS preference (prefers-color-scheme) if no saved choice
   - We avoid encoding issues by setting button text via JS
*/
const THEME_KEY = 'utg_theme';
function setTheme(mode) {
  if (mode === 'light') {
    document.body.classList.add('light');
    document.body.classList.remove('dark');
    themeToggle.textContent = '☀️';
    themeToggle.title = 'Switch to dark';
  } else {
    document.body.classList.remove('light');
    document.body.classList.add('dark');
    themeToggle.textContent = '🌙';
    themeToggle.title = 'Switch to light';
  }
  try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
}

/* Initialize theme */
(function initTheme(){
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (e) { saved = null; }
  if (!saved) {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    saved = prefersLight ? 'light' : 'dark';
  }
  setTheme(saved);
})();

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.body.classList.contains('light') ? 'light' : 'dark';
    setTheme(current === 'light' ? 'dark' : 'light');
  });
}

/* ---------- Smooth scroll for internal anchors ----------
   When clicking "#tutorials" etc. the page scrolls smoothly. Also close side nav.
*/
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || href === '#') return;
  const target = document.querySelector(href);
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (sideNav.classList.contains('open')) closeSide();
});

/* ---------- Reveal-on-scroll ----------
   Items with classes .reveal, .tile, .card will fade in as they appear
   on screen. We use IntersectionObserver for performant watching.
*/
(function setupReveal(){
  try {
    const selector = '.reveal, .tile, .card, .hero-inner';
    const elements = Array.from(document.querySelectorAll(selector));
    if (!elements.length) return;
    // ensure each element has initial 'reveal' class so CSS hides it first
    elements.forEach(el => { if (!el.classList.contains('reveal')) el.classList.add('reveal'); });

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show'); // CSS transitions handle the reveal
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    elements.forEach(el => io.observe(el));
  } catch (e) {
    console.warn('Reveal setup failed:', e);
  }
})();

/* ---------- Keep hero height reasonable on tiny viewports ----------
   If the viewport height is very small (on-screen keyboard), reduce hero min-height
*/
function adjustHeroForViewport() {
  try {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    if (window.innerHeight < 500) hero.style.minHeight = '56vh';
    else hero.style.minHeight = '';
  } catch (e) {}
}
window.addEventListener('resize', debounce(adjustHeroForViewport, 120, 300));
function debounce(fn, wait, maxWait) {
  let t = null, last = null;
  return function(...args){
    const now = Date.now();
    if (!last) last = now;
    clearTimeout(t);
    t = setTimeout(() => { fn.apply(this, args); last = null; }, wait);
    if (maxWait && now - last >= maxWait) { clearTimeout(t); fn.apply(this, args); last = null; }
  };
}

/* ---------- Small safety: ensure overlay exists if script loaded early ----------
   (shouldn't happen with defer, but defensive code is helpful)
*/
(function ensureOverlayAgain(){
  try {
    if (!document.getElementById('page-overlay')) {
      const ov = document.createElement('div');
      ov.id = 'page-overlay';
      ov.className = 'overlay';
      ov.hidden = true;
      document.body.appendChild(ov);
    }
  } catch (e) {}
})();

/* ========== End of script ========== */
/* If you want extra features (keyboard-only menu navigation, focus trap inside side-nav,
   or auto-closing after link click on mobile), tell me and I will add them carefully. */
