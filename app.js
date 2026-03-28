// ─── AI Text Formatter ────────────────────────────────────────
/**
 * Convert AI markdown response to clean, styled HTML.
 * Handles: ### headings, ** bold, * lists, numbered lists, line breaks.
 * @param {string} text
 * @returns {string} HTML
 */
function _formatAI(text) {
  if (!text) return '';

  const lines = text.split('\n');
  const out   = [];
  let inList  = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Close open list before headings/empty
    const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };

    // Skip empty lines
    if (!line.trim()) { closeList(); continue; }

    // ### Heading 3
    if (line.startsWith('### ')) {
      closeList();
      const t = _inlineFormat(line.slice(4));
      out.push(`<div style="font-family:'DanaYad',sans-serif;-webkit-text-stroke:.5px var(--text-dark);font-size:.82rem;color:var(--text-dark);margin:.75rem 0 .25rem">${t}</div>`);
      continue;
    }

    // ## Heading 2
    if (line.startsWith('## ')) {
      closeList();
      const t = _inlineFormat(line.slice(3));
      out.push(`<div style="font-family:'DanaYad',sans-serif;-webkit-text-stroke:.6px var(--text-dark);font-size:.88rem;color:var(--text-dark);margin:.9rem 0 .3rem;border-bottom:1px solid var(--border);padding-bottom:.2rem">${t}</div>`);
      continue;
    }

    // # Heading 1
    if (line.startsWith('# ')) {
      closeList();
      const t = _inlineFormat(line.slice(2));
      out.push(`<div style="font-family:'DanaYad',sans-serif;-webkit-text-stroke:.7px var(--text-dark);font-size:.95rem;color:var(--text-dark);margin:.9rem 0 .35rem">${t}</div>`);
      continue;
    }

    // Bullet list: - or *
    if (/^[-*•] /.test(line)) {
      if (!inList) { out.push('<ul style="margin:.3rem 0 .3rem 0;padding-right:1.1rem;list-style:none">'); inList = true; }
      const t = _inlineFormat(line.replace(/^[-*•] /, ''));
      out.push(`<li style="font-size:.78rem;color:var(--text-dark);line-height:1.6;margin-bottom:.15rem;position:relative">
        <span style="position:absolute;right:-1rem;color:var(--latte)">·</span>${t}</li>`);
      continue;
    }

    // Numbered list: 1. 2. etc
    const numMatch = line.match(/^(\d+)\. (.+)/);
    if (numMatch) {
      if (!inList) { out.push('<ol style="margin:.3rem 0 .3rem 0;padding-right:1.3rem">'); inList = true; }
      const t = _inlineFormat(numMatch[2]);
      out.push(`<li style="font-size:.78rem;color:var(--text-dark);line-height:1.6;margin-bottom:.2rem">${t}</li>`);
      continue;
    }

    // Regular paragraph
    closeList();
    const t = _inlineFormat(line);
    out.push(`<p style="font-size:.79rem;color:var(--text-dark);line-height:1.65;margin-bottom:.3rem">${t}</p>`);
  }

  if (inList) out.push(inList ? '</ul>' : '</ol>');
  return out.join('');
}

/** Apply inline formatting: bold, italic, inline code */
function _inlineFormat(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--text-dark);font-weight:600">$1</strong>')
    .replace(/\*([^*]+)\*/g,   '<em style="color:var(--latte)">$1</em>')
    .replace(/`([^`]+)`/g,       '<code style="background:rgba(176,152,144,.15);padding:.05rem .3rem;border-radius:3px;font-size:.75rem">$1</code>');
}

// ─── Render Scheduler ────────────────────────────────────────
// Batches multiple render calls within one animation frame.
// Instead of calling renderProducts() 3x in 1ms, runs it once.
const _renderQueue = new Set();
let   _renderFrame = null;

function _scheduleRender(name) {
  _renderQueue.add(name);
  if (_renderFrame) return;
  _renderFrame = requestAnimationFrame(() => {
    _renderFrame = null;
    const queue = [..._renderQueue];
    _renderQueue.clear();
    // Only render active tab first, others lazily
    const activeTab = document.querySelector('.view.active')?.id?.replace('view-', '');
    queue.sort((a, b) => {
      const priority = { [activeTab]: 0 };
      return (priority[a] ?? 1) - (priority[b] ?? 1);
    });
    queue.forEach(name => {
      const fns = { routines: renderRoutines, products: renderProducts,
                    analysis: renderAnalysis, settings: renderSettings };
      fns[name]?.();
    });
  });
}

// Throttled wrappers — replace direct calls with these where possible
function scheduleRenderRoutines() { _scheduleRender('routines'); }
function scheduleRenderProducts() { _scheduleRender('products'); }

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


// ─── Swipe-down to close modals ───────────────────────────────
// Trigger zone: touch starts on .modal-handle OR within the top 52px of .modal-sheet.
// Drag down ≥80px → close with animation.
(function initSwipeToClose() {
  let startY = 0, activeSheet = null;

  function isHandleArea(target, sheet) {
    // Accept touch on the handle element itself (with its padding)
    if (target.closest('.modal-handle')) return true;
    // Also accept touch in the top 52px of the sheet (captures handle padding area)
    const rect = sheet.getBoundingClientRect();
    const touchY = startY;
    return touchY - rect.top < 52;
  }

  document.addEventListener('touchstart', e => {
    const sheet = e.target.closest?.('.modal-sheet');
    if (!sheet) return;
    startY = e.touches[0].clientY;
    if (!isHandleArea(e.target, sheet)) return;
    activeSheet = sheet;
    activeSheet.style.transition = 'none';
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!activeSheet) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0) return;
    const clamped = Math.min(dy, 220);
    activeSheet.style.transform = `translateY(${clamped}px)`;
    activeSheet.style.opacity   = String(1 - clamped / 300);
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!activeSheet) return;
    const sheet = activeSheet;
    activeSheet = null;
    sheet.style.transition = '';

    const dy = e.changedTouches[0].clientY - startY;
    if (dy > 80) {
      sheet.style.transform = 'translateY(100%)';
      sheet.style.opacity   = '0';
      setTimeout(() => {
        sheet.closest('.modal-backdrop')?.classList.add('hidden');
        sheet.style.transform = '';
        sheet.style.opacity   = '';
      }, 230);
    } else {
      sheet.style.transform = '';
      sheet.style.opacity   = '';
    }
  }, { passive: true });
})();

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkDailyReset();
  initOnboarding();
  showTab('routines');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
});
