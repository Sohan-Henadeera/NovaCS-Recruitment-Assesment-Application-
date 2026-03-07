/* ═══════════════════════════════════════════
   NovaCS — Shared Utilities
   js/utils.js
═══════════════════════════════════════════ */

// ── TOAST ──
function showToast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  if (!t) return;
  const colors = { ok: '#1c2333', err: '#991b1b', warn: '#854d0e' };
  t.style.background = colors[type] || colors.ok;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── MODAL ──
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
function closeBg(e, id) { if (e.target === document.getElementById(id)) closeModal(id); }

// ── COPY TO CLIPBOARD ──
function copyToClipboard(text, label = 'Copied') {
  navigator.clipboard.writeText(text).then(() => showToast(`${label} copied to clipboard`));
}

// ── FORMAT HELPERS ──
function weightedScore(scores) {
  if (!scores) return null;
  return Math.round(
    scores.judgement   * 0.35 +
    scores.numerical   * 0.25 +
    scores.verbal      * 0.20 +
    scores.situational * 0.20
  );
}

function scoreColor(score) {
  if (score === null) return 'var(--slate-400)';
  if (score >= 80) return 'var(--success)';
  if (score >= 65) return 'var(--navy-600)';
  if (score >= 50) return 'var(--warning)';
  return 'var(--danger)';
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── NAVIGATION ──
function navigate(page) {
  window.location.href = page;
}

// ── LOCAL STORAGE HELPERS ──
const Store = {
  get: (key) => {
    try { return JSON.parse(localStorage.getItem(`novaCS_${key}`)); }
    catch { return null; }
  },
  set: (key, val) => {
    try { localStorage.setItem(`novaCS_${key}`, JSON.stringify(val)); }
    catch {}
  },
  clear: (key) => localStorage.removeItem(`novaCS_${key}`)
};

// ── SIDEBAR TOGGLE ──
function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const main     = document.getElementById('dash-main');
  const toggle   = document.getElementById('sidebar-toggle');
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

// ── ACTIVE NAV LINK ──
function setActiveNav(pageId) {
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === pageId);
  });
}
