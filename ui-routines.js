/**
 * ui-routines.js — Skin Ritual · Routines Tab
 * Note: CATEGORIES and esc() live in ui-products.js (loaded first)
 */

// ─── Render ───────────────────────────────────────────────────
function renderRoutines() {
  const routines = DB.getRoutines();
  const products = DB.getProducts();
  const morning  = routines.find(r => r.id === 'morning');
  const night    = routines.find(r => r.id === 'night');
  const mEl      = document.getElementById('morning-routine-container');
  const nEl      = document.getElementById('night-routine-container');
  if (morning && mEl) mEl.innerHTML = _routineCard(morning, products);
  if (night   && nEl) nEl.innerHTML = _routineCard(night,   products);
}

// ─── Routine Card ─────────────────────────────────────────────
function _routineCard(routine, products) {
  const isMorning  = routine.id === 'morning';
  const icon       = isMorning ? '🌤' : '🌙';
  const hasContent = isMorning ? routine.steps.length > 0 : routine.cycle.length > 0;
  const { done, total } = _progress(routine, products);
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  const metaText = total > 0 ? `${done}/${total} שלבים` : 'ריקה — בני עם AI';

  return `<div class="routine-card" id="card-${routine.id}">
    <div class="routine-header" onclick="toggleRoutineCard('${routine.id}')">
      <div class="routine-icon">${icon}</div>
      <div class="routine-info">
        <span class="routine-name">${routine.name}</span>
        <span class="routine-meta">${metaText}</span>
        ${total > 0 ? `<div class="routine-progress-bar" style="margin-top:.35rem">
          <div class="routine-progress-fill" style="width:${pct}%"></div>
        </div>` : ''}
      </div>
      <svg class="routine-chevron" viewBox="0 0 256 256" fill="currentColor" width="16" height="16">
        <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/>
      </svg>
    </div>
    <div class="routine-body" id="body-${routine.id}">
      <div class="routine-body-inner">
        ${hasContent
          ? (isMorning ? _morningSteps(routine, products) : _nightCycle(routine, products))
          : _emptyRoutine(routine.id)}
        ${_routineActions(routine.id, hasContent)}
      </div>
    </div>
  </div>`;
}

// ─── Morning steps ────────────────────────────────────────────
function _morningSteps(routine, products) {
  return `<div class="step-list">${
    routine.steps
      .sort((a,b) => a.order - b.order)
      .map(s => _stepHTML(s, 'morning', null, products))
      .join('')
  }</div>`;
}

// ─── Night cycle ──────────────────────────────────────────────
function _nightCycle(routine, products) {
  const activeIdx = routine.currentDayIndex ?? 0;
  const tabs = routine.cycle.map((day, i) =>
    `<button class="cycle-btn${i===activeIdx?' active':''}"
             onclick="selectCycleTab('${routine.id}',${i},this)">
       ${day.icon||''} ${day.label}
     </button>`
  ).join('');

  const activeDay = routine.cycle[activeIdx];
  const steps = activeDay
    ? activeDay.steps.sort((a,b)=>a.order-b.order)
        .map(s => _stepHTML(s, 'night', activeIdx, products)).join('')
    : '';

  return `<div class="cycle-bar">${tabs}</div>
    ${activeDay?.description ? `<p class="text-soft" style="margin-bottom:.7rem;font-size:.75rem">${activeDay.description}</p>` : ''}
    <div class="step-list" id="cycle-steps-${routine.id}">${steps}</div>`;
}

// ─── Step HTML ────────────────────────────────────────────────
function _stepHTML(step, routineId, cycleDay, products) {
  const product = products.find(p => p.id === step.productId);
  if (!product) return '';
  const done      = DB.isDone(routineId, step.productId, cycleDay);
  const cat       = CATEGORIES[product.category] || CATEGORIES.other;
  const dayParam  = cycleDay !== null ? cycleDay : 'null';

  return `<div class="step${done?' done':''}" id="step-${routineId}-${step.productId}"
       onclick="toggleStep('${routineId}','${step.productId}',${dayParam})">
    <div class="step-check">
      ${done ? `<svg viewBox="0 0 256 256" fill="currentColor" width="12" height="12">
        <path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34Z"/>
      </svg>` : ''}
    </div>
    <div class="step-info">
      ${product.brand ? `<span class="step-brand">${esc(product.brand)}</span>` : ''}
      <span class="step-product">${esc(product.name)}</span>
    </div>
    <span class="product-badge" style="font-size:.6rem;padding:.15rem .4rem;border-radius:4px;background:var(--driftwood);color:var(--text-soft)">
      ${cat.emoji} ${cat.label}
    </span>
    <button class="step-remove" title="הסר"
            onclick="event.stopPropagation();removeStep('${routineId}','${step.productId}',${dayParam})">
      <svg viewBox="0 0 256 256" fill="currentColor" width="13" height="13">
        <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/>
      </svg>
    </button>
  </div>`;
}

// ─── Empty / Actions ──────────────────────────────────────────
function _emptyRoutine(routineId) {
  const isMorning = routineId === 'morning';
  return `<div class="empty-state" style="padding:1.5rem 0">
    <div class="empty-state-title">${isMorning ? 'שגרת הבוקר ריקה' : 'אין מחזור טיפוח'}</div>
    <p class="empty-state-sub">${isMorning ? 'לחצי "בני עם AI" לשגרה מותאמת אישית' : 'לחצי "בני מחזור" לתכנון מחזור הטיפוח'}</p>
  </div>`;
}

function _routineActions(routineId, hasContent) {
  const isMorning = routineId === 'morning';
  const addBtn = `<button class="btn btn-sm" onclick="openAddStepModal('${routineId}')">
    <svg viewBox="0 0 256 256" fill="currentColor" width="12" height="12"><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/></svg>
    הוסיפי שלב
  </button>`;

  if (isMorning) return `<div class="routine-actions">
    <button class="btn btn-primary btn-sm" onclick="openAIBuildMorning()">✦ בני עם AI</button>
    ${addBtn}
    ${hasContent ? `<button class="btn btn-sm" onclick="resetRoutine('morning')">איפוס</button>` : ''}
  </div>`;

  return `<div class="routine-actions">
    <button class="btn btn-primary btn-sm" onclick="openAIBuildCycle()">✦ ${hasContent ? 'בני מחזור מחדש' : 'בני מחזור'}</button>
    ${hasContent ? `
      <button class="btn btn-sm" onclick="openCycleExplanation()">
        <svg viewBox="0 0 256 256" fill="currentColor" width="12" height="12">
          <path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180Zm-12-108c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Z"/>
        </svg>
        למה בחרת כך?
      </button>
      <button class="btn btn-sm" onclick="advanceCycleDay()">יום הבא ›</button>
      <button class="btn btn-sm" onclick="resetRoutine('night')">איפוס</button>` : ''}
  </div>`;
}

// ─── Progress ─────────────────────────────────────────────────
function _progress(routine, products) {
  if (routine.id === 'morning') {
    const steps = routine.steps.filter(s => products.find(p => p.id === s.productId && p.active));
    return { done: steps.filter(s => DB.isDone('morning', s.productId)).length, total: steps.length };
  }
  const idx = routine.currentDayIndex ?? 0;
  const day = routine.cycle[idx];
  if (!day) return { done:0, total:0 };
  const steps = day.steps.filter(s => products.find(p => p.id === s.productId && p.active));
  return { done: steps.filter(s => DB.isDone('night', s.productId, idx)).length, total: steps.length };
}

// ─── Interaction handlers ─────────────────────────────────────
function toggleRoutineCard(routineId) {
  const card = document.getElementById(`card-${routineId}`);
  const body = document.getElementById(`body-${routineId}`);
  if (!card || !body) return;
  const open = card.classList.toggle('open');
  body.classList.toggle('open', open);
}

function toggleStep(routineId, productId, cycleDay) {
  const day = (cycleDay === null || cycleDay === 'null') ? null : Number(cycleDay);
  DB.toggleDone(routineId, productId, day);

  // Update step in-place
  const stepEl  = document.getElementById(`step-${routineId}-${productId}`);
  const routine = DB.getRoutines().find(r => r.id === routineId);
  const products= DB.getProducts();
  if (!stepEl || !routine) { renderRoutines(); return; }

  const step = day !== null
    ? routine.cycle[day]?.steps.find(s => s.productId === productId)
    : routine.steps.find(s => s.productId === productId);
  if (!step) { renderRoutines(); return; }

  const tmp = document.createElement('div');
  tmp.innerHTML = _stepHTML(step, routineId, day, products);
  stepEl.replaceWith(tmp.firstElementChild);
  _updateProgressBar(routineId, products);
}

function _updateProgressBar(routineId, products) {
  const routine = DB.getRoutines().find(r => r.id === routineId);
  if (!routine) return;
  const { done, total } = _progress(routine, products);
  const pct  = total > 0 ? Math.round((done / total) * 100) : 0;
  const fill = document.querySelector(`#card-${routineId} .routine-progress-fill`);
  const meta = document.querySelector(`#card-${routineId} .routine-meta`);
  if (fill) fill.style.width = `${pct}%`;
  if (meta) meta.textContent = `${done}/${total} שלבים`;
}

function selectCycleTab(routineId, dayIndex, btn) {
  DB.updateRoutine(routineId, { currentDayIndex: dayIndex });
  document.querySelectorAll(`#card-${routineId} .cycle-btn`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const routine  = DB.getRoutines().find(r => r.id === routineId);
  const products = DB.getProducts();
  const stepsEl  = document.getElementById(`cycle-steps-${routineId}`);
  if (!stepsEl || !routine) return;
  const day = routine.cycle[dayIndex];
  stepsEl.innerHTML = day
    ? day.steps.sort((a,b)=>a.order-b.order).map(s=>_stepHTML(s,'night',dayIndex,products)).join('')
    : '';
  _updateProgressBar(routineId, products);
}

function removeStep(routineId, productId, cycleDay) {
  const day     = (cycleDay === null || cycleDay === 'null') ? null : Number(cycleDay);
  const routine = DB.getRoutines().find(r => r.id === routineId);
  if (!routine) return;
  if (day !== null) {
    DB.updateRoutine(routineId, {
      cycle: routine.cycle.map((d,i) =>
        i !== day ? d : { ...d, steps: d.steps.filter(s => s.productId !== productId) }
      ),
    });
  } else {
    DB.updateRoutine(routineId, { steps: routine.steps.filter(s => s.productId !== productId) });
  }
  renderRoutines();
}

function resetRoutine(routineId) {
  const routine = DB.getRoutines().find(r => r.id === routineId);
  if (!routine) return;
  if (routineId === 'night' && routine.cycle.length) {
    routine.cycle.forEach((_, i) => DB.resetRoutineDone(routineId, i));
  } else {
    DB.resetRoutineDone(routineId);
  }
  renderRoutines();
  showToast('השגרה אופסה');
}

function advanceCycleDay() {
  DB.advanceCycleDay();
  renderRoutines();
  const card = document.getElementById('card-night');
  const body = document.getElementById('body-night');
  if (card && !card.classList.contains('open')) { card.classList.add('open'); body.classList.add('open'); }
  const routine  = DB.getRoutines().find(r => r.id === 'night');
  const dayLabel = routine?.cycle[routine.currentDayIndex]?.label || '';
  showToast(`מחזור: ${dayLabel}`);
}

// ─── AI Build (stubs — Sprint 4) ──────────────────────────────
async function openAIBuildMorning() {
  if (!DB.getSettings().apiKey) { showToast('נא להזין מפתח API בהגדרות', 'error'); return; }
  if (!DB.getProducts().filter(p=>p.active).length) { showToast('הוסיפי מוצרים תחילה', 'error'); return; }
  showToast('בונה שגרת בוקר... ✦');
  try {
    const steps = await AI.buildMorning();
    DB.updateRoutine('morning', { steps });
    renderRoutines();
    const card = document.getElementById('card-morning');
    const body = document.getElementById('body-morning');
    if (card && !card.classList.contains('open')) { card.classList.add('open'); body.classList.add('open'); }
    showToast('שגרת הבוקר נבנתה ✦', 'success');
  } catch(err) { showToast(err.message, 'error'); }
}

async function openAIBuildCycle() {
  if (!DB.getSettings().apiKey) { showToast('נא להזין מפתח API בהגדרות', 'error'); return; }
  if (!DB.getProducts().filter(p=>p.active).length) { showToast('הוסיפי מוצרים תחילה', 'error'); return; }
  showToast('בונה מחזור טיפוח... ✦');
  try {
    const cycle = await AI.buildNightCycle();
    DB.updateRoutine('night', { cycle, currentDayIndex: 0 });
    renderRoutines();
    const card = document.getElementById('card-night');
    const body = document.getElementById('body-night');
    if (card && !card.classList.contains('open')) { card.classList.add('open'); body.classList.add('open'); }
    showToast('מחזור הטיפוח נבנה ✦', 'success');
    // Auto-open explanation after short delay
    setTimeout(() => openCycleExplanation(), 800);
  } catch(err) { showToast(err.message, 'error'); }
}

/** Open modal with AI explanation of the current cycle */
async function openCycleExplanation() {
  const modal   = document.getElementById('modal-cycle-explain');
  const bodyEl  = document.getElementById('cycle-explain-body');
  if (!modal || !bodyEl) return;

  if (!DB.getSettings().apiKey) { showToast('נא להזין מפתח API בהגדרות', 'error'); return; }

  modal.classList.remove('hidden');
  bodyEl.innerHTML = `<div style="display:flex;align-items:center;gap:.5rem;padding:.5rem 0;color:var(--text-soft);font-size:.8rem">
    <span class="ai-thinking-dots"><span></span><span></span><span></span></span>
    AI מנתח את המחזור...
  </div>`;
  // Reset chat for this session
  _cycleExplainHistory = [];

  try {
    const explanation = await AI.explainCycle();
    _cycleExplainHistory = [
      { role: 'user',      content: 'הסבירי לי את המחזור שבנית' },
      { role: 'assistant', content: explanation },
    ];
    _renderCycleChat();
  } catch(err) {
    bodyEl.innerHTML = `<div class="conflict-warning">${err.message}</div>`;
  }
}

let _cycleExplainHistory = [];

function _renderCycleChat() {
  const bodyEl = document.getElementById('cycle-explain-body');
  if (!bodyEl) return;
  bodyEl.innerHTML = _cycleExplainHistory
    .filter(m => m.role !== 'user' || _cycleExplainHistory.indexOf(m) > 0)
    .map(m => { const bubble = m.content.replace(/\n/g, '<br>'); return `<div class="chat-bubble ${m.role === 'assistant' ? 'ai' : 'user'}" style="max-width:100%;margin-bottom:.5rem">${bubble}</div>`; })
    .join('');
  bodyEl.scrollTop = bodyEl.scrollHeight;
}

async function sendCycleChat() {
  const input = document.getElementById('cycle-explain-input');
  const msg   = input?.value?.trim();
  if (!msg) return;
  input.value = '';

  _cycleExplainHistory.push({ role: 'user', content: msg });
  _renderCycleChat();

  // Loading bubble
  const bodyEl = document.getElementById('cycle-explain-body');
  const loader = document.createElement('div');
  loader.className = 'chat-bubble ai';
  loader.style.marginBottom = '.5rem';
  loader.innerHTML = `<span class="ai-thinking-dots"><span></span><span></span><span></span></span>`;
  bodyEl?.appendChild(loader);
  bodyEl.scrollTop = bodyEl.scrollHeight;

  try {
    const reply = await AI.chat(_cycleExplainHistory);
    _cycleExplainHistory.push({ role: 'assistant', content: reply });
    loader.remove();
    _renderCycleChat();
  } catch(err) {
    loader.remove();
    _cycleExplainHistory.push({ role: 'assistant', content: `שגיאה: ${err.message}` });
    _renderCycleChat();
  }
}
