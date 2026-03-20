/**
 * app.js — Skin Ritual · Application Shell
 * Navigation, onboarding, toast, daily reset.
 */

// ─── Skin types for onboarding ────────────────────────────────
const SKIN_TYPES = [
  { type:'normal',      emoji:'✨', name:'נורמלי',  desc:'מאוזן, אחיד' },
  { type:'dry',         emoji:'🌵', name:'יבש',      desc:'מרגיש מתוח' },
  { type:'oily',        emoji:'💧', name:'שמן',      desc:'מבריק, נקבוביות' },
  { type:'combination', emoji:'☯',  name:'מעורב',    desc:'T-zone שמן' },
  { type:'sensitive',   emoji:'🌸', name:'רגיש',     desc:'מגיב, אדמומיות' },
];

const CONCERNS = [
  'אקנה','פיגמנטציה','קמטים','עמעום','נקבוביות מורחבות',
  'אדמומיות','כהות מתחת לעיניים','הידרציה','חיזוק מחסום',
];

// ─── Navigation ───────────────────────────────────────────────
function showTab(tabId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`view-${tabId}`)?.classList.add('active');
  document.getElementById(`nav-${tabId}`)?.classList.add('active');
  ({ routines: renderRoutines, products: renderProducts,
     analysis: renderAnalysis, settings: renderSettings })[tabId]?.();
}

// ─── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast${type !== 'info' ? ' ' + type : ''}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ─── Modal ────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

// ─── Onboarding ───────────────────────────────────────────────
let _obStep = 1;

function initOnboarding() {
  const profile = DB.getProfile();
  const overlay = document.getElementById('onboarding-overlay');
  if (profile?.completed) { overlay.classList.add('hidden'); return; }
  overlay.classList.remove('hidden');

  // Render skin type cards
  document.getElementById('ob-skin-grid').innerHTML = SKIN_TYPES.map(s =>
    `<div class="ob-skin-card" data-type="${s.type}" onclick="obSelectSkin(this,'${s.type}')">
       <span class="sk-emoji">${s.emoji}</span>
       <span class="sk-name">${s.name}</span>
       <span class="sk-desc">${s.desc}</span>
     </div>`
  ).join('');

  // Render concern chips
  document.getElementById('ob-concerns-grid').innerHTML = CONCERNS.map(c =>
    `<button class="ob-concern-chip" data-concern="${c}" onclick="this.classList.toggle('selected')">${c}</button>`
  ).join('');

  showObStep(1);
}

function showObStep(step) {
  _obStep = step;
  document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`ob-step-${step}`)?.classList.add('active');
  document.querySelectorAll('.ob-dot').forEach((d,i) => d.classList.toggle('active', i+1 <= step));
  const back = document.getElementById('ob-back-btn');
  if (back) back.style.visibility = step > 1 ? 'visible' : 'hidden';
}

function obNext() { if (_obStep < 3) showObStep(_obStep + 1); }
function obBack() { if (_obStep > 1) showObStep(_obStep - 1); }

function obSelectSkin(el, type) {
  document.querySelectorAll('.ob-skin-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function obComplete() {
  const skinType = document.querySelector('.ob-skin-card.selected')?.dataset.type || '';
  const age      = parseInt(document.getElementById('ob-age')?.value) || null;
  const concerns = [...document.querySelectorAll('.ob-concern-chip.selected')].map(c => c.dataset.concern);
  const apiKey   = document.getElementById('ob-api-key')?.value.trim() || '';

  DB.saveProfile({ skinType, age, concerns, completed:true, createdAt:new Date().toISOString() });
  if (apiKey) DB.saveSettings({ apiKey });

  document.getElementById('onboarding-overlay').classList.add('hidden');
  showTab('routines');
  showToast('ברוכה הבאה לשגרת הטיפוח שלך ✦', 'success');
}

// ─── Daily reset ──────────────────────────────────────────────
function checkDailyReset() {
  DB.cleanOldDone();
  const t = new Date().toISOString().slice(0,10);
  DB.getRoutines().forEach(r => { if (r.lastReset !== t) DB.updateRoutine(r.id, { lastReset: t }); });
}

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkDailyReset();
  initOnboarding();
  showTab('routines');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
});
