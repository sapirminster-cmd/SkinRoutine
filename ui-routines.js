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
        ${hasContent ? _routineChatBar(routine.id) : ''}
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
    `<div style="display:inline-flex;align-items:center;gap:0;position:relative">
       <button class="cycle-btn${i===activeIdx?' active':''}"
               onclick="selectCycleTab('${routine.id}',${i},this)"
               style="padding-left:1.6rem">
         ${day.icon||''} ${day.label}
       </button>
       <button onclick="event.stopPropagation();deleteCycleDay('${routine.id}',${i})"
               title="מחק יום זה"
               style="position:absolute;left:2px;top:50%;transform:translateY(-50%);
                      width:16px;height:16px;border-radius:50%;background:transparent;
                      border:none;cursor:pointer;font-size:9px;color:var(--text-soft);
                      display:flex;align-items:center;justify-content:center;
                      line-height:1;opacity:.6">✕</button>
     </div>`
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
       ontouchstart="_stepPressStart(event,'${routineId}','${step.productId}',${dayParam})"
       ontouchend="_stepPressEnd(event)"
       ontouchcancel="_stepPressEnd(event)"
       ontouchmove="_stepPressEnd(event)"
       onmousedown="_stepPressStart(event,'${routineId}','${step.productId}',${dayParam})"
       onmouseup="_stepPressEnd(event)"
       onmouseleave="_stepPressEnd(event)">
    <!-- Check circle: toggles done state -->
    <div class="step-check" onclick="toggleStep('${routineId}','${step.productId}',${dayParam})" style="cursor:pointer;flex-shrink:0">
      ${done ? `<svg viewBox="0 0 256 256" fill="currentColor" width="12" height="12">
        <path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34Z"/>
      </svg>` : ''}
    </div>
    <!-- Product name: opens instructions -->
    <div class="step-info" onclick="openStepInstructions('${step.productId}')" style="cursor:pointer;flex:1;min-width:0">
      ${product.brand ? `<span class="step-brand">${esc(product.brand)}</span>` : ''}
      <span class="step-product" style="text-decoration:none">${esc(product.name)}</span>
    </div>
    <span class="product-badge" style="font-size:.6rem;padding:.15rem .4rem;border-radius:4px;background:var(--driftwood);color:var(--text-soft)">
      ${cat.emoji} ${cat.label}
    </span>
    <button class="step-remove" title="הסר"
            onclick="removeStep('${routineId}','${step.productId}',${dayParam})">
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

  if (isMorning) return `<div class="routine-actions">
    <button class="btn btn-primary btn-sm" onclick="openAIBuildMorning()">✦ בני עם AI</button>
    ${hasContent ? `
      <button class="btn btn-sm" onclick="openMorningExplanation()">
        <svg viewBox="0 0 256 256" fill="currentColor" width="12" height="12">
          <path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180Zm-12-108c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Z"/>
        </svg>
        למה נבחרה?
      </button>
      <button class="btn btn-sm" onclick="resetRoutine('morning')">איפוס</button>
      <button class="btn btn-sm btn-rose" onclick="clearRoutine('morning')" title="מחק את כל השלבים">
        <svg viewBox="0 0 256 256" fill="currentColor" width="12" height="12">
          <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192Z"/>
        </svg>
        נקי
      </button>` : ''}
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
      <button class="btn btn-sm" onclick="resetRoutine('night')">איפוס</button>
      <button class="btn btn-sm btn-rose" onclick="clearRoutine('night')" title="מחק את כל המחזור">
        <svg viewBox="0 0 256 256" fill="currentColor" width="12" height="12">
          <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192Z"/>
        </svg>
        מחק מחזור
      </button>` : ''}
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

/** Clear all steps from morning routine, or entire cycle from night */
function clearRoutine(routineId) {
  const label = routineId === 'morning' ? 'שגרת הבוקר' : 'מחזור הטיפוח הלילי';
  if (!confirm(`למחוק את כל ${label}?`)) return;

  if (routineId === 'morning') {
    DB.updateRoutine('morning', { steps: [] });
    DB.resetRoutineDone('morning');
  } else {
    const routine = DB.getRoutines().find(r => r.id === 'night');
    if (routine?.cycle) routine.cycle.forEach((_, i) => DB.resetRoutineDone('night', i));
    DB.updateRoutine('night', { cycle: [], currentDayIndex: 0 });
  }
  renderRoutines();
  showToast('הרוטינה נמחקה');
}

/** Delete a single cycle day by index */
function deleteCycleDay(routineId, dayIndex) {
  const routine = DB.getRoutines().find(r => r.id === routineId);
  if (!routine?.cycle?.length) return;

  const day = routine.cycle[dayIndex];
  if (!confirm(`למחוק את "${day?.label || 'יום זה'}" מהמחזור?`)) return;

  DB.resetRoutineDone(routineId, dayIndex);
  const newCycle = routine.cycle.filter((_, i) => i !== dayIndex);
  const newIdx   = Math.min(routine.currentDayIndex ?? 0, Math.max(0, newCycle.length - 1));
  DB.updateRoutine(routineId, { cycle: newCycle, currentDayIndex: newIdx });
  renderRoutines();
  showToast(`${day?.label || 'היום'} נמחק מהמחזור`);
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

/** Open free-text cycle goal input before building */
function openAIBuildCycle() {
  if (!DB.getSettings().apiKey) { showToast('נא להזין מפתח API בהגדרות', 'error'); return; }
  if (!DB.getProducts().filter(p=>p.active).length) { showToast('הוסיפי מוצרים תחילה', 'error'); return; }
  const modal  = document.getElementById('modal-cycle-type');
  const inputEl= document.getElementById('cycle-goal-input');
  if (modal)  modal.classList.remove('hidden');
  if (inputEl){ inputEl.value = ''; inputEl.focus(); }
}

/** Called when user submits their cycle goal */
async function buildCycleWithGoal() {
  const goal = document.getElementById('cycle-goal-input')?.value.trim() || '';
  closeModal('modal-cycle-type');
  showToast('בונה מחזור טיפוח... ✦');
  try {
    const cycle = await AI.buildNightCycle(goal);
    DB.updateRoutine('night', { cycle, currentDayIndex: 0 });
    renderRoutines();
    const card = document.getElementById('card-night');
    const body = document.getElementById('body-night');
    if (card && !card.classList.contains('open')) { card.classList.add('open'); body.classList.add('open'); }
    showToast('מחזור הטיפוח נבנה ✦', 'success');
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
    .map(m => {
      const content = m.role === 'assistant' ? _formatAI(m.content) : `<p style="font-size:.79rem;line-height:1.55">${m.content}</p>`;
      return `<div class="chat-bubble ${m.role === 'assistant' ? 'ai' : 'user'}" style="max-width:100%;margin-bottom:.6rem">${content}</div>`;
    })
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

/** Open modal with AI explanation of morning routine */
async function openMorningExplanation() {
  const modal  = document.getElementById('modal-cycle-explain');
  const bodyEl = document.getElementById('cycle-explain-body');
  const titleEl= document.getElementById('cycle-explain-title');
  if (!modal || !bodyEl) return;
  if (!DB.getSettings().apiKey) { showToast('נא להזין מפתח API בהגדרות', 'error'); return; }

  if (titleEl) titleEl.textContent = 'למה נבחרה שגרת הבוקר?';
  modal.classList.remove('hidden');
  bodyEl.innerHTML = `<div style="display:flex;align-items:center;gap:.5rem;padding:.5rem 0;color:var(--text-soft);font-size:.8rem">
    <span class="ai-thinking-dots"><span></span><span></span><span></span></span>
    AI מנתח את שגרת הבוקר...
  </div>`;
  _cycleExplainHistory = [];

  try {
    const explanation = await AI.explainMorning();
    _cycleExplainHistory = [
      { role: 'user',      content: 'הסבירי לי את שגרת הבוקר שבנית' },
      { role: 'assistant', content: explanation },
    ];
    _renderCycleChat();
  } catch(err) {
    bodyEl.innerHTML = `<div class="conflict-warning">${err.message}</div>`;
  }
}


/**
 * Show product application instructions in modal.
 * Uses AI if apiKey available, otherwise shows category defaults.
 */
async function openStepInstructions(productId) {
  const product = DB.getProducts().find(p => p.id === productId);
  if (!product) return;
  const modal  = document.getElementById('modal-step-instructions');
  const titleEl= document.getElementById('si-product-name');
  const bodyEl = document.getElementById('si-body');
  if (!modal || !bodyEl) return;

  const cat = CATEGORIES[product.category] || CATEGORIES.other;
  if (titleEl) titleEl.textContent = `${product.brand ? product.brand + ' · ' : ''}${product.name}`;
  modal.classList.remove('hidden');

  // Show skeleton immediately
  bodyEl.innerHTML = `<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem 0;color:var(--text-soft);font-size:.8rem">
    <span class="ai-thinking-dots"><span></span><span></span><span></span></span>
    טוענת הוראות יישום...
  </div>`;

  const warningsHtml = product.warnings?.length
    ? `<div class="conflict-warning" style="margin-top:.6rem">
        <svg viewBox="0 0 256 256" fill="currentColor" width="13" height="13" style="flex-shrink:0">
          <path d="M236.8,188.09,149.35,36.22a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z"/>
        </svg>
        <span>${product.warnings.map(esc).join(' · ')}</span>
      </div>` : '';

  const ingredientsHtml = product.ingredients?.length
    ? `<p style="font-size:.68rem;color:var(--text-soft);margin-top:.6rem;line-height:1.5;padding-top:.5rem;border-top:1px solid var(--border)">
        <span style="font-weight:600">רכיבים עיקריים:</span> ${product.ingredients.slice(0,5).map(esc).join(' · ')}
       </p>` : '';

  // If API available — get specific instructions from AI
  if (DB.getSettings().apiKey) {
    try {
      const profile = DB.getProfile() || {};
      const skinLabel = { normal:'נורמלי', dry:'יבש', oily:'שמן', combination:'מעורב', sensitive:'רגיש' }[profile.skinType] || '';
      const prompt = `תני הוראות יישום ספציפיות ומעשיות למוצר "${product.brand ? product.brand+' ' : ''}${product.name}" (קטגוריה: ${product.category}).
${skinLabel ? `סוג עור: ${skinLabel}` : ''}
${product.ingredients?.length ? `רכיבים פעילים: ${product.ingredients.slice(0,4).join(', ')}` : ''}

כתבי 3-4 משפטים קצרים ומדויקים בעברית:
- כמות לשימוש
- שלב היישום בשגרה (לפני/אחרי מה)
- טכניקת הריבוי על הפנים
- הערה חשובה אם יש (הדרגתיות, הימנעות, SPF אחרי וכו')

כתבי רק הוראות, ללא כותרות.`;
      const reply = await AI.chat([{ role: 'user', content: prompt }]);
      bodyEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.7rem">
          <span style="font-size:1.1rem">${cat.emoji}</span>
          <span style="font-size:.75rem;color:var(--latte)">${cat.label}</span>
        </div>
        <div style="font-size:.81rem;color:var(--text-dark);line-height:1.7">${_formatAI(reply)}</div>
        ${ingredientsHtml}${warningsHtml}`;
      return;
    } catch { /* fall through to defaults */ }
  }

  // Fallback: category defaults
  const defaults = {
    cleanser:    'מרחי על עור לח, עסי בעדינות בתנועות סיבוביות, שטפי היטב.',
    toner:       'מרחי על כותנה או כפות הידיים מיד לאחר הניקוי, טפטפי על כל הפנים.',
    exfoliant:   'הורידי על עור יבש לאחר ניקוי. השאירי 5-10 דקות, שטפי. 1-2 פעמים בשבוע.',
    serum:       'הורידי 2-3 טיפות על עור נקי, מרחי מהמרכז כלפי חוץ לפני קרם הלחות.',
    eye_care:    'הניחי כמות קטנה על קצה אצבע הטבעת, טפטפי בעדינות מתחת לעין בתנועה קלה.',
    moisturizer: 'מרחי שכבה אחידה על פנים וצוואר לאחר הסרום בעוד העור עדיין מעט לח.',
    spf:         'הורידי כמות נדיבה (כ-1/4 כפית) כשלב האחרון בבוקר. חידשי כל שעתיים בחשיפה.',
    retinoid:    'כמות קטנה (גודל פולי אורז) על עור יבש. שלבי בהדרגה — התחילי פעם בשבוע.',
    treatment:   'הורידי על אזורים ממוקדים לאחר ניקוי וטונר.',
    mask:        'מרחי שכבה אחידה על עור נקי, המתיני לפי ההוראות, שטפי היטב.',
    oil:         'הורידי 2-3 טיפות, חממי בין הכפות וטפחי על הפנים בתנועות עדינות.',
    other:       'עיני בהוראות שעל האריזה.',
  };
  const text = product.note || defaults[product.category] || defaults.other;
  bodyEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.7rem">
      <span style="font-size:1.1rem">${cat.emoji}</span>
      <span style="font-size:.75rem;color:var(--latte)">${cat.label}</span>
    </div>
    <p style="font-size:.81rem;color:var(--text-dark);line-height:1.7">${esc(text)}</p>
    ${ingredientsHtml}${warningsHtml}`;
}


/** Inline chat bar HTML for a routine card */
function _routineChatBar(routineId) {
  return `<div style="margin-top:.7rem;border-top:1px solid var(--border);padding-top:.6rem">
    <div id="rchat-messages-${routineId}" style="max-height:200px;overflow-y:auto;margin-bottom:.4rem"></div>
    <div class="chat-bar" style="background:rgba(216,207,198,.2);border-radius:var(--r-sm);padding:.3rem .3rem .3rem .4rem">
      <textarea class="chat-input" id="rchat-input-${routineId}"
                placeholder="שאלי שאלה על ${routineId === 'morning' ? 'שגרת הבוקר' : 'שגרת הערב'}..."
                rows="1" style="font-size:.76rem"
                onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendRoutineChat('${routineId}')}"></textarea>
      <button class="chat-send" onclick="sendRoutineChat('${routineId}')" style="width:32px;height:32px">
        <svg viewBox="0 0 256 256" fill="currentColor" width="14" height="14">
          <path d="M231.4,44.34a8,8,0,0,0-10.74-3.06L16.4,156.66A8,8,0,0,0,17.89,172l55.64,15.9L224,52.87A8,8,0,0,0,231.4,44.34Zm-180,137.44,63.65-63.64a8,8,0,0,1,11.32,11.31L62.72,193.11ZM192,224a8,8,0,0,1-15.65,2.19L161.5,168.34Z"/>
        </svg>
      </button>
    </div>
  </div>`;
}

/** Send a contextual question about a specific routine — stateless, no history saved */
async function sendRoutineChat(routineId) {
  const input    = document.getElementById(`rchat-input-${routineId}`);
  const messagesEl = document.getElementById(`rchat-messages-${routineId}`);
  const msg      = input?.value?.trim();
  if (!msg || !messagesEl) return;
  input.value = '';

  if (!DB.getSettings().apiKey) { showToast('נא להזין מפתח API בהגדרות', 'error'); return; }

  // User bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user';
  userBubble.style.cssText = 'max-width:100%;margin-bottom:.4rem;font-size:.76rem';
  userBubble.textContent = msg;
  messagesEl.appendChild(userBubble);

  // Loading
  const loader = document.createElement('div');
  loader.className = 'chat-bubble ai loading';
  loader.style.marginBottom = '.4rem';
  loader.innerHTML = `<span class="ai-thinking-dots"><span></span><span></span><span></span></span>`;
  messagesEl.appendChild(loader);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  // Build one-shot context — no history stored
  const routine  = DB.getRoutines().find(r => r.id === routineId);
  const products = DB.getProducts();
  const isMorning = routineId === 'morning';

  const routineDesc = isMorning
    ? (routine?.steps||[]).sort((a,b)=>a.order-b.order)
        .map(s => products.find(p=>p.id===s.productId)?.name).filter(Boolean).join(' → ')
    : (routine?.cycle||[]).map((d,i) =>
        `לילה ${i+1} (${d.label}): ${d.steps.map(s=>products.find(p=>p.id===s.productId)?.name).filter(Boolean).join(', ')}`
      ).join(' | ');

  const contextMsg = `אתה יועצת טיפוח מומחית. ענה בעברית בצורה קצרה וממוקדת.
שגרת ${isMorning?'הבוקר':'הערב'} הנוכחית: ${routineDesc || 'ריקה'}
שאלת המשתמשת: ${msg}`;

  try {
    const reply = await AI.chat([{ role: 'user', content: contextMsg }]);
    loader.remove();
    const aiBubble = document.createElement('div');
    aiBubble.className = 'chat-bubble ai';
    aiBubble.style.cssText = 'max-width:100%;margin-bottom:.4rem';
    aiBubble.innerHTML = _formatAI(reply);
    messagesEl.appendChild(aiBubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  } catch(err) {
    loader.remove();
    const errBubble = document.createElement('div');
    errBubble.className = 'chat-bubble ai';
    errBubble.style.cssText = 'max-width:100%;margin-bottom:.4rem;background:rgba(192,57,43,.07)';
    errBubble.textContent = err.message;
    messagesEl.appendChild(errBubble);
  }
}


// ─── Long-press step actions ──────────────────────────────────

let _lpTimer     = null;
let _lpFired     = false;
let _lpStartTime = 0;

function _stepPressStart(event, routineId, productId, cycleDay) {
  _lpFired     = false;
  _lpStartTime = Date.now();
  _lpTimer     = setTimeout(() => {
    _lpFired = true;
    openStepActionSheet(routineId, productId, cycleDay);
  }, 480);
}

function _stepPressEnd(event) {
  clearTimeout(_lpTimer);
  _lpTimer = null;
  // Prevent click propagation if long-press fired
  if (_lpFired) {
    event.preventDefault();
    event.stopPropagation();
    _lpFired = false;
  }
}

/** Bottom action sheet for a step: remove or replace */
function openStepActionSheet(routineId, productId, cycleDay) {
  const modal     = document.getElementById('modal-step-actions');
  const titleEl   = document.getElementById('sa-product-name');
  const replaceBtn= document.getElementById('sa-replace-btn');
  const removeBtn = document.getElementById('sa-remove-btn');
  if (!modal) return;

  const product = DB.getProducts().find(p => p.id === productId);
  if (titleEl) titleEl.textContent = product?.name || '';

  // Store context on modal for the action handlers
  modal.dataset.routineId = routineId;
  modal.dataset.productId = productId;
  modal.dataset.cycleDay  = cycleDay !== null && cycleDay !== undefined ? cycleDay : '';

  modal.classList.remove('hidden');
}

function stepActionRemove() {
  const modal    = document.getElementById('modal-step-actions');
  const routineId= modal?.dataset.routineId;
  const productId= modal?.dataset.productId;
  const cycleDay = modal?.dataset.cycleDay !== '' ? Number(modal.dataset.cycleDay) : null;
  closeModal('modal-step-actions');
  removeStep(routineId, productId, cycleDay);
}

function stepActionReplace() {
  const modal    = document.getElementById('modal-step-actions');
  const routineId= modal?.dataset.routineId;
  const productId= modal?.dataset.productId;
  const cycleDay = modal?.dataset.cycleDay !== '' ? Number(modal.dataset.cycleDay) : null;
  closeModal('modal-step-actions');
  openReplaceStepModal(routineId, productId, cycleDay);
}

/** Open the add-step modal in "replace" mode */
function openReplaceStepModal(routineId, oldProductId, cycleDay) {
  const modal   = document.getElementById('modal-add-step');
  const titleEl = document.getElementById('mas-title');
  if (!modal) return;

  const product = DB.getProducts().find(p => p.id === oldProductId);
  if (titleEl) titleEl.textContent = `החלפת "${product?.name || ''}"`;

  modal.dataset.routineId      = routineId;
  modal.dataset.cycleDay       = cycleDay !== null && cycleDay !== undefined ? cycleDay : '';
  modal.dataset.replaceId      = oldProductId;  // ← flag: replace mode

  document.querySelectorAll('#mas-filter-bar .filter-chip').forEach((c,i) => c.classList.toggle('active', i===0));
  _renderReplaceList(routineId, cycleDay ?? null, 'all', oldProductId);
  modal.classList.remove('hidden');
}

/** Render product list excluding current product, in replace mode */
function _renderReplaceList(routineId, cycleDay, catFilter, excludeId) {
  const listEl = document.getElementById('mas-product-list');
  if (!listEl) return;

  const products = DB.getProducts().filter(p =>
    p.active && p.id !== excludeId &&
    (catFilter === 'all' || p.category === catFilter)
  );

  if (!products.length) {
    listEl.innerHTML = '<p class="text-soft" style="text-align:center;padding:1rem">אין מוצרים זמינים להחלפה</p>';
    return;
  }

  const dayParam = cycleDay !== null && cycleDay !== undefined ? cycleDay : 'null';
  listEl.innerHTML = products.map(p => {
    const cat = CATEGORIES[p.category] || CATEGORIES.other;
    return `<div class="product-card" style="margin-bottom:.5rem">
      <div class="product-info">
        ${p.brand ? `<span class="product-brand">${esc(p.brand)}</span>` : ''}
        <span class="product-name">${esc(p.name)}</span>
        <div class="product-meta"><span class="product-badge badge-both">${cat.emoji} ${cat.label}</span></div>
      </div>
      <button class="btn btn-sm btn-primary"
              onclick="replaceStepFromModal('${routineId}','${p.id}',${dayParam})">
        החליפי
      </button>
    </div>`;
  }).join('');
}

/** Replace old product with new product in routine step */
function replaceStepFromModal(routineId, newProductId, cycleDay) {
  const day     = (cycleDay === null || cycleDay === 'null') ? null : Number(cycleDay);
  const modal   = document.getElementById('modal-add-step');
  const oldId   = modal?.dataset.replaceId;
  if (!oldId) return;

  const routine = DB.getRoutines().find(r => r.id === routineId);
  if (!routine) return;

  if (day !== null) {
    DB.updateRoutine(routineId, {
      cycle: routine.cycle.map((d, i) =>
        i !== day ? d : {
          ...d,
          steps: d.steps.map(s => s.productId === oldId ? { ...s, productId: newProductId } : s),
        }
      ),
    });
  } else {
    DB.updateRoutine(routineId, {
      steps: routine.steps.map(s => s.productId === oldId ? { ...s, productId: newProductId } : s),
    });
  }

  // Clear replace mode flag
  delete modal.dataset.replaceId;
  closeModal('modal-add-step');
  renderRoutines();
  showToast('המוצר הוחלף ✦', 'success');
}
