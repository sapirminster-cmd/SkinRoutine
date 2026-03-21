/**
 * ui-analysis.js — Skin Ritual · Analysis Tab — Sprint 4
 */

// ─── State ────────────────────────────────────────────────────
let _chatHistory   = [];
let _analysisImages = []; // [{ base64, mimeType, preview }]

// ─── Render ───────────────────────────────────────────────────
function renderAnalysis() {
  _renderAnalysisHero();
  _renderAnalysisHistory();
}

function _renderAnalysisHero() {
  const baseline = DB.getBaselineAnalysis();
  const statusEl = document.getElementById('analysis-status');
  const heroEl   = document.getElementById('analysis-hero');
  if (!statusEl || !heroEl) return;

  statusEl.className = `analysis-status-chip${baseline ? ' has-baseline' : ''}`;
  statusEl.innerHTML = baseline
    ? `✓ ניתוח בסיס מ-${new Date(baseline.date).toLocaleDateString('he-IL')}`
    : `○ טרם בוצע ניתוח`;

  heroEl.innerHTML = baseline
    ? `<p class="text-soft" style="line-height:1.65;margin-bottom:.9rem">
         העלי תמונה חדשה של פניך — AI ישווה למצב הבסיס ויראה לך מה השתנה.
       </p>
       <button class="btn btn-primary" onclick="openAnalysisUpload()" style="width:100%;justify-content:center">
         📸 ניתוח חדש + השוואה
       </button>`
    : `<p class="text-soft" style="line-height:1.65;margin-bottom:.9rem">
         העלי תמונה של פניך לניתוח עור מקצועי מ-AI.<br>
         הניתוח הראשון יישמר כנקודת בסיס למעקב עתידי.
       </p>
       <button class="btn btn-primary" onclick="openAnalysisUpload()" style="width:100%;justify-content:center">
         📸 התחילי ניתוח עור ✦
       </button>`;
}

function _renderAnalysisHistory() {
  const historyEl = document.getElementById('analysis-history');
  if (!historyEl) return;
  const history = DB.getAnalysisHistory();
  if (!history.length) { historyEl.innerHTML = ''; return; }

  historyEl.innerHTML = `
    <div class="section-label" style="margin-bottom:.7rem;margin-top:.3rem">
      <svg viewBox="0 0 256 256" fill="currentColor" width="11" height="11">
        <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z"/>
      </svg>
      היסטוריית ניתוחים
    </div>
    ${history.slice().reverse().map(e => _historyCard(e)).join('')}`;
}

function _historyCard(entry) {
  const a     = entry.analysis || {};
  const date  = new Date(entry.date).toLocaleDateString('he-IL', { day:'numeric', month:'short', year:'numeric' });
  const score = a.overallScore;
  const sCol  = score >= 75 ? '#6a8f6a' : score >= 50 ? 'var(--latte)' : '#c0392b';

  const deltaHtml = entry.delta
    ? _deltaChip(entry.delta)
    : (entry.isBaseline ? `<span style="font-size:.63rem;background:rgba(176,152,144,.2);padding:.12rem .45rem;border-radius:4px;color:var(--text-soft)">בסיס</span>` : '');

  return `<div class="analysis-card" style="margin-bottom:.65rem;cursor:pointer" onclick="openAnalysisDetail('${entry.id}')">
    <div style="display:flex;align-items:center;gap:.8rem">
      ${entry.imageData
        ? `<img src="${entry.imageData}" style="width:52px;height:52px;object-fit:cover;border-radius:var(--r-sm);flex-shrink:0;border:1.5px solid var(--border)">`
        : `<div style="width:52px;height:52px;border-radius:var(--r-sm);background:var(--driftwood);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.3rem">🌸</div>`}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.2rem">
          <span style="font-size:.8rem;color:var(--text-dark);font-weight:600">${date}</span>
          ${deltaHtml}
        </div>
        ${a.summary ? `<p style="font-size:.71rem;color:var(--text-soft);line-height:1.45;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${a.summary}</p>` : ''}
      </div>
      ${score !== undefined ? `<div style="text-align:center;flex-shrink:0">
        <div style="font-size:1.25rem;font-weight:700;color:${sCol}">${score}</div>
        <div style="font-size:.57rem;color:var(--text-soft)">ציון</div>
      </div>` : ''}
    </div>
  </div>`;
}

function _deltaChip(delta) {
  if (!delta || delta.scoreDiff === undefined) return '';
  const d = delta.scoreDiff;
  const color = d > 0 ? '#6a8f6a' : d < 0 ? '#c0392b' : 'var(--text-soft)';
  const bg    = d > 0 ? 'rgba(100,180,100,.12)' : d < 0 ? 'rgba(192,57,43,.1)' : 'rgba(176,152,144,.15)';
  const sign  = d > 0 ? '+' : '';
  const arrow = d > 0 ? '↑' : d < 0 ? '↓' : '—';
  return `<span style="font-size:.63rem;padding:.12rem .45rem;border-radius:4px;background:${bg};color:${color};font-weight:600">${sign}${d} ${arrow}</span>`;
}

// ─── Upload flow ──────────────────────────────────────────────
function openAnalysisUpload() {
  const modal = document.getElementById('modal-analysis-upload');
  if (!modal) return;
  _analysisImages = [];
  _renderAnalysisThumbs();
  const res = document.getElementById('analysis-upload-result');
  if (res) { res.innerHTML = ''; delete res.dataset.analysisJson; }
  const inp = document.getElementById('analysis-upload-file');
  if (inp) inp.value = '';
  modal.classList.remove('hidden');
}

function _renderAnalysisThumbs() {
  const el = document.getElementById('analysis-upload-thumbs');
  if (!el) return;
  if (!_analysisImages.length) { el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = _analysisImages.map((img, i) => `
    <div style="position:relative;flex-shrink:0">
      <img src="${img.preview}" style="width:72px;height:72px;object-fit:cover;border-radius:var(--r-sm);border:1.5px solid var(--border)">
      <button onclick="removeAnalysisImage(${i})"
        style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;
               background:var(--text-dark);color:var(--ivory);font-size:10px;
               display:flex;align-items:center;justify-content:center;border:none;cursor:pointer">✕</button>
    </div>`).join('');
}

function removeAnalysisImage(i) {
  _analysisImages.splice(i, 1);
  _renderAnalysisThumbs();
  const res = document.getElementById('analysis-upload-result');
  if (res) { res.innerHTML = ''; delete res.dataset.analysisJson; }
}

function analysisFileSelected(input) {
  const files = Array.from(input.files || []);
  if (!files.length) return;
  const res = document.getElementById('analysis-upload-result');
  if (res) { res.innerHTML = ''; delete res.dataset.analysisJson; }
  files.forEach(file => _compressAndAddAnalysis(file));
  input.value = '';
}

function _compressAndAddAnalysis(file) {
  const MAX = 3.5 * 1024 * 1024;
  const reader = new FileReader();
  reader.onload = e => {
    const [header, base64] = e.target.result.split(',');
    const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
    const bytes    = Math.ceil(base64.length * 3 / 4);

    const store = (b64, mime, url) => {
      _analysisImages.push({ base64: b64, mimeType: mime, preview: url });
      _renderAnalysisThumbs();
    };

    if (bytes <= MAX) { store(base64, mimeType, e.target.result); return; }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_DIM = 1600;
      let w = img.width, h = img.height;
      if (w > MAX_DIM || h > MAX_DIM) {
        const r = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      let url = canvas.toDataURL('image/jpeg', 0.85);
      if (url.length * 3 / 4 > MAX) url = canvas.toDataURL('image/jpeg', 0.7);
      const [h2, b2] = url.split(',');
      store(b2, 'image/jpeg', url);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function runSkinAnalysis() {
  const resultEl = document.getElementById('analysis-upload-result');
  if (!_analysisImages.length)  { showToast('נא לבחור תמונה', 'error'); return; }
  if (!DB.getSettings().apiKey) { showToast('נא להזין מפתח API בהגדרות', 'error'); return; }

  const count = _analysisImages.length;
  resultEl.innerHTML = `<div style="display:flex;align-items:center;gap:.5rem;padding:.8rem 0;color:var(--text-soft);font-size:.8rem">
    <span class="ai-thinking-dots"><span></span><span></span><span></span></span>
    מנתחת ${count > 1 ? count + ' תמונות' : 'תמונה'}...
  </div>`;

  try {
    const analysis = await AI.analyzeSkin(_analysisImages);
    resultEl.innerHTML = _analysisHTML(analysis, true);
    resultEl.dataset.analysisJson = JSON.stringify(analysis);
  } catch(err) {
    resultEl.innerHTML = `<div class="conflict-warning" style="margin-top:.5rem">${err.message}</div>`;
  }
}

function saveAnalysis() {
  const resultEl = document.getElementById('analysis-upload-result');
  if (!resultEl?.dataset.analysisJson) { showToast('הרץ ניתוח תחילה', 'error'); return; }

  const analysis = JSON.parse(resultEl.dataset.analysisJson);
  const baseline = DB.getBaselineAnalysis();
  const thumb    = _analysisImages.length ? _thumb(_analysisImages[0].preview) : null;

  let delta = null;
  if (baseline?.analysis?.overallScore !== undefined && analysis.overallScore !== undefined) {
    delta = {
      scoreDiff:        analysis.overallScore - baseline.analysis.overallScore,
      newConcerns:      (analysis.concerns || []).filter(c => !(baseline.analysis.concerns||[]).includes(c)),
      resolvedConcerns: (baseline.analysis.concerns||[]).filter(c => !(analysis.concerns||[]).includes(c)),
    };
  }

  const entry = DB.addAnalysis({ analysis, imageData: thumb, delta });
  closeModal('modal-analysis-upload');
  showToast(entry.isBaseline ? 'ניתוח הבסיס נשמר ✦' : 'ניתוח נוסף להיסטוריה ✦', 'success');
  renderAnalysis();
}

// ─── Detail modal ─────────────────────────────────────────────
function openAnalysisDetail(entryId) {
  const modal  = document.getElementById('modal-analysis-detail');
  const bodyEl = document.getElementById('analysis-detail-body');
  if (!modal || !bodyEl) return;

  const entry = DB.getAnalysisHistory().find(a => a.id === entryId);
  if (!entry) return;

  const date = new Date(entry.date).toLocaleDateString('he-IL', { day:'numeric', month:'long', year:'numeric' });

  bodyEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.9rem">
      ${entry.imageData ? `<img src="${entry.imageData}" style="width:60px;height:60px;object-fit:cover;border-radius:var(--r-sm);flex-shrink:0">` : ''}
      <div>
        <div style="font-size:.82rem;color:var(--text-dark);font-weight:600">${date}</div>
        <div style="margin-top:.2rem;display:flex;gap:.3rem;flex-wrap:wrap">
          ${entry.isBaseline ? `<span style="font-size:.63rem;background:rgba(176,152,144,.2);padding:.12rem .45rem;border-radius:4px;color:var(--text-soft)">נקודת בסיס</span>` : ''}
          ${entry.delta ? _deltaChip(entry.delta) : ''}
        </div>
      </div>
    </div>
    ${_analysisHTML(entry.analysis, false)}
    ${entry.delta && (entry.delta.newConcerns?.length || entry.delta.resolvedConcerns?.length) ? `
      <div class="section-label" style="margin:.8rem 0 .4rem">שינויים מהבסיס</div>
      ${entry.delta.resolvedConcerns?.length ? `<p style="font-size:.75rem;color:#6a8f6a;margin-bottom:.2rem">✓ שופר: ${entry.delta.resolvedConcerns.join(', ')}</p>` : ''}
      ${entry.delta.newConcerns?.length      ? `<p style="font-size:.75rem;color:#c0392b">⚠ חדש: ${entry.delta.newConcerns.join(', ')}</p>` : ''}
    ` : ''}
    <button class="btn btn-rose btn-sm" onclick="deleteAnalysisEntry('${entryId}')" style="margin-top:1rem">
      מחק ניתוח זה
    </button>`;

  modal.classList.remove('hidden');
}

function deleteAnalysisEntry(entryId) {
  if (!confirm('למחוק ניתוח זה?')) return;
  const updated = DB.getAnalysisHistory().filter(a => a.id !== entryId);
  localStorage.setItem('sr_analysis_v2', JSON.stringify(updated));
  closeModal('modal-analysis-detail');
  showToast('הניתוח נמחק');
  renderAnalysis();
}

// ─── Analysis result HTML ─────────────────────────────────────
function _analysisHTML(a, showSave) {
  if (!a) return '';
  const score  = a.overallScore;
  const sCol   = score >= 75 ? '#6a8f6a' : score >= 50 ? 'var(--latte)' : '#c0392b';

  const sevLabel = s => ({ mild:'קל', moderate:'בינוני', significant:'משמעותי' }[s] || s);
  const sevBg    = s => ({ mild:'rgba(100,180,100,.1)', moderate:'rgba(255,200,100,.13)', significant:'rgba(192,57,43,.08)' }[s] || 'var(--driftwood)');
  const sevTxt   = s => ({ mild:'#6a8f6a', moderate:'#8B6914', significant:'#c0392b' }[s] || 'var(--text-soft)');
  const priLabel = p => ({ high:'דחוף', medium:'מומלץ', low:'לשקול' }[p] || p);
  const priBg    = p => ({ high:'rgba(192,57,43,.08)', medium:'rgba(255,200,100,.1)', low:'rgba(176,152,144,.1)' }[p] || 'var(--driftwood)');

  let h = '';

  if (score !== undefined) {
    h += `<div style="display:flex;align-items:center;gap:.9rem;margin-bottom:.85rem;padding:.75rem;background:rgba(176,152,144,.1);border-radius:var(--r-sm)">
      <div style="text-align:center;flex-shrink:0">
        <div style="font-size:1.9rem;font-weight:700;color:${sCol};line-height:1">${score}</div>
        <div style="font-size:.6rem;color:var(--text-soft)">ציון</div>
      </div>
      <div>
        ${a.skinType ? `<div style="font-size:.73rem;color:var(--latte);margin-bottom:.2rem">${a.skinType}</div>` : ''}
        ${a.summary  ? `<p style="font-size:.75rem;color:var(--text-dark);line-height:1.55">${a.summary}</p>` : ''}
      </div>
    </div>`;
  }

  if (a.conditions?.length) {
    h += `<div class="section-label" style="margin-bottom:.45rem">מצב עור</div>`;
    h += a.conditions.map(c => `
      <div style="display:flex;align-items:flex-start;gap:.45rem;margin-bottom:.35rem;padding:.45rem .65rem;border-radius:var(--r-sm);background:${sevBg(c.severity)}">
        <span style="font-size:.6rem;padding:.1rem .35rem;border-radius:3px;color:${sevTxt(c.severity)};border:1px solid ${sevTxt(c.severity)}50;flex-shrink:0;margin-top:.1rem">${sevLabel(c.severity)}</span>
        <div>
          <div style="font-size:.77rem;color:var(--text-dark);font-weight:600">${c.name}</div>
          ${c.notes ? `<div style="font-size:.7rem;color:var(--text-soft);line-height:1.4;margin-top:.1rem">${c.notes}</div>` : ''}
        </div>
      </div>`).join('');
  }

  if (a.positives?.length || a.concerns?.length) {
    h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin:.65rem 0">`;
    if (a.positives?.length) h += `<div style="background:rgba(100,180,100,.08);border-radius:var(--r-sm);padding:.55rem .65rem">
      <div style="font-size:.62rem;color:#6a8f6a;font-weight:600;margin-bottom:.3rem">✓ חיובי</div>
      ${a.positives.map(p=>`<div style="font-size:.7rem;color:var(--text-dark);line-height:1.5">· ${p}</div>`).join('')}
    </div>`;
    if (a.concerns?.length)  h += `<div style="background:rgba(192,57,43,.05);border-radius:var(--r-sm);padding:.55rem .65rem">
      <div style="font-size:.62rem;color:#c0392b;font-weight:600;margin-bottom:.3rem">⚠ דאגות</div>
      ${a.concerns.map(c=>`<div style="font-size:.7rem;color:var(--text-dark);line-height:1.5">· ${c}</div>`).join('')}
    </div>`;
    h += `</div>`;
  }

  if (a.recommendations?.length) {
    h += `<div class="section-label" style="margin:.55rem 0 .4rem">המלצות</div>`;
    h += a.recommendations.map(r => `
      <div style="display:flex;gap:.45rem;margin-bottom:.3rem;padding:.4rem .6rem;border-radius:var(--r-sm);background:${priBg(r.priority)}">
        <span style="font-size:.58rem;padding:.08rem .3rem;border-radius:3px;background:rgba(255,255,255,.5);color:var(--text-soft);flex-shrink:0;margin-top:.15rem">${priLabel(r.priority)}</span>
        <span style="font-size:.74rem;color:var(--text-dark);line-height:1.45">${r.action}</span>
      </div>`).join('');
  }

  if (a.ingredients_to_seek?.length || a.ingredients_to_avoid?.length) {
    h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin-top:.65rem">`;
    if (a.ingredients_to_seek?.length) h += `<div>
      <div style="font-size:.6rem;color:var(--text-soft);margin-bottom:.25rem;text-transform:uppercase;letter-spacing:.08em">חפשי</div>
      <div style="display:flex;flex-wrap:wrap;gap:.2rem">
        ${a.ingredients_to_seek.map(i=>`<span style="font-size:.6rem;padding:.1rem .38rem;border-radius:4px;background:rgba(100,180,100,.12);color:#6a8f6a">${i}</span>`).join('')}
      </div>
    </div>`;
    if (a.ingredients_to_avoid?.length) h += `<div>
      <div style="font-size:.6rem;color:var(--text-soft);margin-bottom:.25rem;text-transform:uppercase;letter-spacing:.08em">הימנעי מ</div>
      <div style="display:flex;flex-wrap:wrap;gap:.2rem">
        ${a.ingredients_to_avoid.map(i=>`<span style="font-size:.6rem;padding:.1rem .38rem;border-radius:4px;background:rgba(192,57,43,.08);color:#c0392b">${i}</span>`).join('')}
      </div>
    </div>`;
    h += `</div>`;
  }

  if (showSave) h += `<button class="btn btn-primary" onclick="saveAnalysis()" style="width:100%;justify-content:center;margin-top:.9rem">שמירה להיסטוריה ✦</button>`;
  return h;
}

function _thumb(dataUrl) {
  try {
    const c = document.createElement('canvas');
    c.width = 80; c.height = 80;
    const img = new Image();
    img.src = dataUrl;
    c.getContext('2d').drawImage(img, 0, 0, 80, 80);
    return c.toDataURL('image/jpeg', 0.7);
  } catch { return dataUrl; }
}

// ─── Chat ─────────────────────────────────────────────────────
function sendChat() {
  const input = document.getElementById('analysis-chat-input');
  const msg   = input?.value?.trim();
  if (!msg) return;
  input.value = '';
  _appendBubble(msg, 'user');
  _chatHistory.push({ role: 'user', content: msg });
  _doChat();
}

function _appendBubble(text, role) {
  const el = document.getElementById('analysis-chat-messages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = `chat-bubble ${role}`;
  div.style.maxWidth = '100%';
  if (role === 'ai') {
    div.innerHTML = _formatAI(text);
  } else {
    div.textContent = text;
  }
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

async function _doChat() {
  if (!DB.getSettings().apiKey) { _appendBubble('נא להזין מפתח API בהגדרות ✦', 'ai'); return; }
  const loadEl = document.createElement('div');
  loadEl.className = 'chat-bubble ai loading';
  loadEl.innerHTML = `<span class="ai-thinking-dots"><span></span><span></span><span></span></span>`;
  document.getElementById('analysis-chat-messages')?.appendChild(loadEl);
  loadEl.scrollIntoView({ behavior: 'smooth' });
  try {
    const reply = await AI.chat(_chatHistory);
    _chatHistory.push({ role: 'assistant', content: reply });
    loadEl.remove();
    _appendBubble(reply, 'ai');
  } catch (err) {
    loadEl.remove();
    _appendBubble(`שגיאה: ${err.message}`, 'ai');
  }
}
