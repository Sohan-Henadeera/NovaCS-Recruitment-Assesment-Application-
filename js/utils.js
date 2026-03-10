/* ═══════════════════════════════════════════════════════════════
   NovaCS — Shared Utilities  |  js/utils.js
   v2.0 — March 2026

   Load this on every recruiter page. No dependencies.
   Provides: Toast, Modal, Clipboard, Score helpers,
             Sidebar, Nav, Store, Format helpers.
═══════════════════════════════════════════════════════════════ */


// ── TOAST ──────────────────────────────────────────────────────
// showToast('Message')           → dark/default
// showToast('Message', 'err')    → red
// showToast('Message', 'warn')   → amber
let _toastTimer;
function showToast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  if (!t) return;
  const colors = { ok:'#1c2333', err:'#991b1b', warn:'#854d0e' };
  t.style.background = colors[type] || colors.ok;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}


// ── MODAL ───────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
// Use on the backdrop div: onclick="closeBg(event,'modal-id')"
function closeBg(e, id) { if (e.target === document.getElementById(id)) closeModal(id); }


// ── CLIPBOARD ───────────────────────────────────────────────────
function copyToClipboard(text, label = 'Copied') {
  navigator.clipboard.writeText(text)
    .then(() => showToast(`${label} copied to clipboard`))
    .catch(() => showToast('Copy failed — try manually', 'err'));
}


// ── SCORE HELPERS ───────────────────────────────────────────────
// These mirror DB.wScore / DB.scoreColor but work standalone
// (for pages that need them before DB is available)
function weightedScore(scores, weights) {
  if (!scores) return null;
  const w = weights || { judgement:0.35, numerical:0.25, verbal:0.20, situational:0.20 };
  return Math.round(
    scores.judgement   * w.judgement   +
    scores.numerical   * w.numerical   +
    scores.verbal      * w.verbal      +
    scores.situational * w.situational
  );
}

function scoreColor(score, threshold = 65) {
  if (score === null || score === undefined) return 'var(--slate-400)';
  if (score >= 80)         return 'var(--success)';
  if (score >= threshold)  return 'var(--navy-600)';
  if (score >= 50)         return 'var(--warning)';
  return 'var(--danger)';
}

function scoreColorFromDB(score) {
  const threshold = window.DB?.config?.passThreshold ?? 65;
  return scoreColor(score, threshold);
}

function passFail(score, threshold = 65) {
  if (score === null || score === undefined) return null;
  return score >= threshold ? 'pass' : 'fail';
}

function rankChip(rank) {
  if (!rank) return '<span class="rank-chip rn">—</span>';
  if (rank === 1) return '<span class="rank-chip r1">🥇</span>';
  if (rank === 2) return '<span class="rank-chip r2">🥈</span>';
  if (rank === 3) return '<span class="rank-chip r3">🥉</span>';
  return `<span class="rank-chip rn">#${rank}</span>`;
}


// ── STATUS / DECISION PILLS ─────────────────────────────────────
function statusPill(s) {
  const m = { completed:'pill-done', pending:'pill-pending', invited:'pill-invited' };
  const l = { completed:'✓ Done',    pending:'⏳ Pending',  invited:'📧 Invited' };
  return `<span class="pill ${m[s] || ''}">${l[s] || s}</span>`;
}

function decisionPill(d) {
  if (d === 'shortlisted') return '<span class="pill pill-shortlisted">★ Shortlisted</span>';
  if (d === 'rejected')    return '<span class="pill pill-rejected">✗ Rejected</span>';
  return '<span style="color:var(--slate-300);font-size:12px">—</span>';
}

function passFailPill(score, threshold = 65) {
  if (score === null || score === undefined) return '';
  return score >= threshold
    ? '<span class="pill pill-pass">✓ Pass</span>'
    : '<span class="pill pill-fail">✗ Fail</span>';
}


// ── FORMAT HELPERS ──────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr; // already formatted string like "Mar 3"
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function pluralise(n, singular, plural) {
  return `${n} ${n === 1 ? singular : (plural || singular + 's')}`;
}


// ── CODE GENERATOR ──────────────────────────────────────────────
// Standalone version — use DB.generateCode() when DB is available
function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}


// ── NAVIGATION ──────────────────────────────────────────────────
function navigate(page) {
  window.location.href = page;
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}


// ── LOCAL STORAGE ───────────────────────────────────────────────
const Store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(`novaCS_${key}`)); }
    catch { return null; }
  },
  set(key, val) {
    try { localStorage.setItem(`novaCS_${key}`, JSON.stringify(val)); }
    catch {}
  },
  clear(key) {
    localStorage.removeItem(`novaCS_${key}`);
  },
};


// ── SIDEBAR TOGGLE ──────────────────────────────────────────────
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('dash-main');
  const toggle  = document.getElementById('sidebar-toggle');
  if (!sidebar || !toggle) return;

  let collapsed = Store.get('sidebarCollapsed') || false;
  const apply = () => {
    sidebar.classList.toggle('collapsed', collapsed);
    main?.classList.toggle('expanded', collapsed);
    Store.set('sidebarCollapsed', collapsed);
  };
  apply();
  toggle.addEventListener('click', () => { collapsed = !collapsed; apply(); });
}


// ── ACTIVE NAV LINK ─────────────────────────────────────────────
function setActiveNav(pageId) {
  document.querySelectorAll('[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });
}


// ── SCORE BAR HTML ──────────────────────────────────────────────
// Renders the score bar + number used on candidates table
function scoreBarHTML(score, threshold = 65) {
  if (score === null || score === undefined) return '<span style="color:var(--slate-300)">—</span>';
  const col = scoreColor(score, threshold);
  return `<div class="score-cell">
    <div class="score-bar"><div class="score-fill" style="width:${score}%;background:${col}"></div></div>
    <div class="score-num" style="color:${col}">${score}%</div>
  </div>`;
}


// ── AVATAR HTML ─────────────────────────────────────────────────
function avatarHTML(initials, color, size = 34) {
  return `<div class="cand-av" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px;background:${color}18;color:${color}">${initials}</div>`;
}


// ── CSV EXPORT ──────────────────────────────────────────────────
function downloadCSV(rows, filename = 'export.csv') {
  const csv = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a   = document.createElement('a');
  a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = filename;
  a.click();
}


// ── DEBOUNCE ────────────────────────────────────────────────────
function debounce(fn, ms = 250) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}


// ── SESSION GUARD ───────────────────────────────────────────────
// Call at top of every protected recruiter page
function requireSession() {
  const session = Store.get('session');
  if (!session) {
    window.location.href = (window.location.pathname.includes('/pages/') ? '../' : '') + 'pages/login.html?reason=auth';
    return false;
  }
  return session;
}

// ── POPULATE SESSION UI ─────────────────────────────────────────
// Fills #session-name, #session-email, #session-initials, #session-org
// from DB.session (or Store fallback)
function populateSessionUI() {
  const s = window.DB?.session || Store.get('session');
  if (!s) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('session-name',    s.recruiter?.name     || '');
  set('session-email',   s.recruiter?.email    || '');
  set('session-role',    s.recruiter?.role     || '');
  set('session-org',     s.org?.name           || '');
  set('session-plan',    s.org?.plan           || '');
  const av = document.getElementById('session-initials');
  if (av) {
    av.textContent        = s.recruiter?.initials || '?';
    av.style.background   = (s.recruiter?.color || '#1e3a5f') + '22';
    av.style.color        = s.recruiter?.color || '#1e3a5f';
  }
}