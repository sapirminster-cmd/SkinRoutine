/**
 * ui-products.js — Skin Ritual · Products Tab
 * Owns: CATEGORIES, esc(), scan modal, add-step modal
 */

// ─── Global constants (used by ui-routines.js too) ────────────
const CATEGORIES = {
  cleanser:    { label:'קלנזר',      emoji:'🫧' },
  toner:       { label:'טונר',        emoji:'💦' },
  exfoliant:   { label:'אקספוליאנט', emoji:'✨' },
  serum:       { label:'סרום',        emoji:'💎' },
  eye_care:    { label:'קרם עיניים',  emoji:'👁' },
  moisturizer: { label:'מוסטורייזר',  emoji:'🌿' },
  spf:         { label:'קרם הגנה',    emoji:'☀️' },
  retinoid:    { label:'רטינואיד',    emoji:'🔬' },
  treatment:   { label:'טיפול',       emoji:'⚗️' },
  mask:        { label:'מסכה',        emoji:'🎭' },
  oil:         { label:'שמן',         emoji:'🌾' },
  other:       { label:'אחר',         emoji:'📦' },
};

function esc(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── State ────────────────────────────────────────────────────
let _productFilter = 'all';
let _scanImages    = []; // { base64, mimeType, preview }

// ─── Render ───────────────────────────────────────────────────
function renderProducts() {
  const listEl    = document.getElementById('products-list');
  const consultEl = document.getElementById('library-consult-bar');
  if (!listEl) return;

  const allProducts = DB.getProducts();
  const filtered    = _filterProducts(allProducts, _productFilter);

  listEl.innerHTML = filtered.length
    ? filtered.map((p,i) => _productCard(p,i)).join('')
    : _productsEmpty();

  // Show consult bar only when library has 2+ products
  if (consultEl) consultEl.style.display = allProducts.length >= 2 ? 'flex' : 'none';
}

function _productCard(p, i) {
  const cat      = CATEGORIES[p.category] || CATEGORIES.other;
  const timeCls  = _timeCls(p.timeOfUse);
  const conflicts= _conflicts(p);
  const detail   = p.benefits?.length || p.note || p.ingredients?.length;
  const cardId   = `pc-${p.id}`;

  return `<div class="product-card${p.active?'':' inactive'}"
               id="${cardId}"
               style="animation-delay:${i*.05}s;flex-direction:column;gap:0;padding:0;
                      overflow:hidden;cursor:pointer"
               onclick="toggleProductCard('${cardId}')">

    <div style="padding:.85rem .9rem;display:flex;flex-direction:column;gap:.45rem">

      <!-- Top row: info + dot + chevron -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem">
        <div style="flex:1;min-width:0">
          ${p.brand ? `<span class="product-brand">${esc(p.brand)}</span>` : ''}
          <span class="product-name">${esc(p.name)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:.55rem;flex-shrink:0">
          ${p.enriching ? `<span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.65rem;color:var(--text-soft)">
            <span class="ai-thinking-dots"><span></span><span></span><span></span></span>
          </span>` : ''}
          <!-- Status dot: click = toggle active, NOT expand -->
          <div style="position:relative;display:inline-flex">
            <button onclick="event.stopPropagation();toggleProductActive('${p.id}')"
                    title="${p.active ? 'השבת' : 'הפעל'}"
                    style="width:10px;height:10px;border-radius:50%;border:none;cursor:pointer;padding:0;margin-top:3px;
                           background:${p.active ? '#6a8f6a' : 'rgba(176,152,144,.45)'};
                           box-shadow:${p.active ? '0 0 0 2px rgba(106,143,106,.2)' : '0 0 0 2px rgba(176,152,144,.15)'};
                           transition:transform .15s"
                    onmouseover="this.style.transform='scale(1.35)'"
                    onmouseout="this.style.transform='scale(1)'">
            </button>
          </div>
          <!-- Chevron: indicates expand/collapse -->
          <svg style="width:12px;height:12px;color:var(--latte);flex-shrink:0;margin-top:3px;
                      transition:transform .3s;transform:rotate(${0}deg)"
               class="pc-chevron-${p.id}"
               viewBox="0 0 256 256" fill="currentColor">
            <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/>
          </svg>
        </div>
      </div>

      <!-- Badges -->
      <div class="product-meta" style="margin-top:0">
        <span class="product-badge ${timeCls}">${cat.emoji} ${cat.label}</span>
        <span class="product-badge ${timeCls}">${_timeLabel(p.timeOfUse)}</span>
        ${p.subCat ? `<span class="product-badge" style="background:transparent;border:1px solid var(--border)">${esc(p.subCat)}</span>` : ''}
      </div>

      <!-- Detail -->
      ${detail ? `<div style="padding-top:.4rem;border-top:1px solid var(--border)">
        ${p.benefits?.length ? `<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.3rem">
          ${p.benefits.slice(0,3).map(b=>`<span style="font-size:.62rem;padding:.12rem .45rem;border-radius:4px;background:rgba(176,152,144,.12);color:var(--text-soft)">${esc(b)}</span>`).join('')}
        </div>` : ''}
        ${p.note ? `<p style="font-size:.72rem;color:var(--text-soft);line-height:1.5">${esc(p.note)}</p>` : ''}
        ${p.ingredients?.length ? `<p style="font-size:.65rem;color:var(--text-soft);margin-top:.2rem;opacity:.75">${p.ingredients.slice(0,4).map(esc).join(' · ')}</p>` : ''}
      </div>` : ''}

      <!-- Conflict -->
      ${conflicts.length ? `<div class="conflict-warning" style="margin-top:.2rem">
        <svg viewBox="0 0 256 256" fill="currentColor" width="13" height="13" style="flex-shrink:0">
          <path d="M236.8,188.09,149.35,36.22a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z"/>
        </svg>
        <span>${conflicts.join(' · ')}</span>
      </div>` : ''}
    </div>

    <!-- Action bar — slides open on card tap -->
    <div id="pa-${p.id}"
         style="display:flex;border-top:1px solid rgba(176,152,144,.4);
                background:rgba(176,152,144,.42);
                max-height:0;overflow:hidden;
                transition:max-height .3s cubic-bezier(.4,0,.2,1)">
      <button onclick="event.stopPropagation();openEditProductModal('${p.id}')"
              style="flex:1;padding:9px 4px;border:none;background:transparent;cursor:pointer;
                     font-size:.73rem;font-family:'Varela Round',sans-serif;
                     font-weight:700;color:#4A3F3A;
                     border-left:1px solid rgba(176,152,144,.35);transition:background .15s"
              onmouseover="this.style.background='rgba(176,152,144,.25)'"
              onmouseout="this.style.background='transparent'">
        עריכה
      </button>
      <button onclick="event.stopPropagation();confirmDeleteProduct('${p.id}','${esc(p.name)}')"
              style="flex:1;padding:9px 4px;border:none;background:transparent;cursor:pointer;
                     font-size:.73rem;font-family:'Varela Round',sans-serif;
                     font-weight:700;color:#a93226;transition:background .15s"
              onmouseover="this.style.background='rgba(192,57,43,.06)'"
              onmouseout="this.style.background='transparent'">
        מחיקה
      </button>
    </div>
  </div>`;
}

/** Toggle product card expand/collapse */
function toggleProductCard(cardId) {
  const pid      = cardId.replace('pc-', '');
  const actionEl = document.getElementById(`pa-${pid}`);
  const chevron  = document.querySelector(`.pc-chevron-${pid}`);
  if (!actionEl) return;
  const isOpen = actionEl.style.maxHeight === '48px';
  actionEl.style.maxHeight = isOpen ? '0' : '48px';
  if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

function _conflicts(product) {
  if (!product.conflicts?.length) return [];
  const others = DB.getProducts().filter(p => p.active && p.id !== product.id);
  const w = [];
  product.conflicts.forEach(c => {
    const found = others.find(p =>
      p.category === c ||
      p.name?.toLowerCase().includes(c.toLowerCase()) ||
      p.ingredients?.some(i => i.toLowerCase().includes(c.toLowerCase()))
    );
    if (found) w.push(`לא לשלב עם ${esc(found.name)}`);
  });
  return [...new Set(w)];
}

function _filterProducts(products, f) {
  if (f === 'all')     return products;
  if (f === 'active')  return products.filter(p => p.active);
  if (f === 'inactive')return products.filter(p => !p.active);
  return products.filter(p => p.category === f);
}

function _timeLabel(t) {
  if (!t?.length || (t.includes('morning') && t.includes('night'))) return 'בוקר + ערב';
  return t.includes('morning') ? 'בוקר' : 'ערב';
}
function _timeCls(t) {
  if (!t?.length || (t.includes('morning') && t.includes('night'))) return 'badge-both';
  return t.includes('morning') ? 'badge-morning' : 'badge-night';
}

function _productsEmpty() {
  return `<div class="empty-state">
    <svg class="empty-state-icon" viewBox="0 0 256 256" fill="currentColor">
      <path d="M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8Z"/>
    </svg>
    <div class="empty-state-title">הספרייה ריקה</div>
    <p class="empty-state-sub">הוסיפי מוצר ידנית או סרקי תמונה</p>
  </div>`;
}

// ─── Filter bar ───────────────────────────────────────────────
function filterProducts(cat, btn) {
  _productFilter = cat;
  document.querySelectorAll('#product-filter-bar .filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderProducts();
}

// ─── Toggle / Delete ──────────────────────────────────────────
function toggleProductActive(id) {
  const p = DB.getProducts().find(p => p.id === id);
  if (!p) return;
  DB.updateProduct(id, { active: !p.active });
  renderProducts();
}

function confirmDeleteProduct(id, name) {
  if (!confirm(`למחוק את "${name}"?\nיוסר גם מהרוטינות.`)) return;
  DB.deleteProduct(id);
  renderProducts();
  showToast('המוצר נמחק');
}

// ─── Add / Edit Product Modal ─────────────────────────────────
function openAddProductModal()    { _openProductModal(null); }
function openEditProductModal(id) { _openProductModal(id); }

function _openProductModal(id) {
  const modal = document.getElementById('modal-product');
  if (!modal) return;
  modal.dataset.editId = id || '';
  const el = s => document.getElementById(s);

  if (id) {
    const p = DB.getProducts().find(p => p.id === id);
    if (!p) return;
    el('mp-title').textContent   = 'עריכת מוצר';
    el('mp-sub').textContent     = p.name;
    el('mp-brand').value         = p.brand    || '';
    el('mp-name').value          = p.name     || '';
    el('mp-category').value      = p.category || '';
    el('mp-time-morning').checked = p.timeOfUse?.includes('morning') ?? true;
    el('mp-time-night').checked   = p.timeOfUse?.includes('night')   ?? true;
  } else {
    el('mp-title').textContent   = 'מוצר חדש';
    el('mp-sub').textContent     = 'הוסיפי פרטים — AI יסווג ויעשיר אוטומטית';
    el('mp-brand').value         = '';
    el('mp-name').value          = '';
    el('mp-category').value      = '';
    el('mp-time-morning').checked = true;
    el('mp-time-night').checked   = true;
  }

  el('mp-ai-result').innerHTML = '';
  modal.classList.remove('hidden');
  el('mp-name').focus();
}

function saveProductModal() {
  const modal  = document.getElementById('modal-product');
  const editId = modal?.dataset.editId || '';
  const brand  = document.getElementById('mp-brand').value.trim();
  const name   = document.getElementById('mp-name').value.trim();
  const cat    = document.getElementById('mp-category').value;
  const morning= document.getElementById('mp-time-morning').checked;
  const night  = document.getElementById('mp-time-night').checked;
  const nameEl = document.getElementById('mp-name');

  if (!name) { nameEl.classList.add('error'); nameEl.focus(); return; }
  nameEl.classList.remove('error');

  const timeOfUse = [morning && 'morning', night && 'night'].filter(Boolean);
  const data = { brand, name, category: cat || 'other', timeOfUse };

  if (editId) {
    DB.updateProduct(editId, data);
    closeModal('modal-product');
    showToast('המוצר עודכן');
    _runEnrichment(editId);
  } else {
    const p = DB.addProduct(data);
    closeModal('modal-product');
    showToast('המוצר נוסף — AI מנתח... ✦');
    _runEnrichment(p.id);
  }
  renderProducts();
}

async function _runEnrichment(productId) {
  if (!DB.getSettings().apiKey) return;
  DB.updateProduct(productId, { enriching: true });
  scheduleRenderProducts();
  try {
    await AI.enrichProduct(productId);
    DB.updateProduct(productId, { enriching: false });
    scheduleRenderProducts();
    showToast('ניתוח AI הושלם ✦', 'success');
  } catch (err) {
    DB.updateProduct(productId, { enriching: false });
    scheduleRenderProducts();
    console.warn('Enrichment:', err.message);
  }
}

// ─── Scan Modal ───────────────────────────────────────────────
function openScanModal() {
  const modal = document.getElementById('modal-scan');
  if (!modal) return;
  _scanImages = [];
  _renderScanThumbs();
  document.getElementById('scan-result').innerHTML = '';
  document.getElementById('scan-file-input').value = '';
  modal.classList.remove('hidden');
}

function scanFileSelected(input) {
  const files = Array.from(input.files || []);
  if (!files.length) return;
  document.getElementById('scan-result').innerHTML = '';
  files.forEach(file => _compressAndAdd(file));
  input.value = '';
}

/**
 * Compress image to under 4MB before adding to scan queue.
 * Uses Canvas to resize large images while preserving aspect ratio.
 * @param {File} file
 */
function _compressAndAdd(file) {
  const MAX_BYTES = 3.5 * 1024 * 1024; // 3.5MB — safe margin under API 5MB limit
  const MAX_DIM   = 1600;               // max width or height in pixels

  const reader = new FileReader();
  reader.onload = e => {
    const original = e.target.result;

    // If already small enough, use as-is
    const [header, base64] = original.split(',');
    const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
    const byteLen  = Math.ceil(base64.length * 3 / 4);

    if (byteLen <= MAX_BYTES) {
      _scanImages.push({ base64, mimeType: 'image/jpeg', preview: original });
      _renderScanThumbs();
      return;
    }

    // Compress via canvas
    const img = new Image();
    img.onload = () => {
      const canvas  = document.createElement('canvas');
      let { width, height } = img;

      // Scale down if needed
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      // Try quality 0.85, then 0.7 if still too large
      let dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      if (dataUrl.length * 3 / 4 > MAX_BYTES) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      }

      const [h2, b2] = dataUrl.split(',');
      _scanImages.push({ base64: b2, mimeType: 'image/jpeg', preview: dataUrl });
      _renderScanThumbs();
    };
    img.src = original;
  };
  reader.readAsDataURL(file);
}

function _renderScanThumbs() {
  const el = document.getElementById('scan-previews');
  if (!el) return;
  if (!_scanImages.length) { el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = _scanImages.map((img, i) => `
    <div style="position:relative;flex-shrink:0">
      <img src="${img.preview}" style="width:72px;height:72px;object-fit:cover;border-radius:var(--r-sm);border:1.5px solid var(--border)">
      <button onclick="removeScanImage(${i})"
        style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;
               background:var(--text-dark);color:var(--ivory);font-size:10px;
               display:flex;align-items:center;justify-content:center;border:none;cursor:pointer">✕</button>
    </div>`).join('');
}

function removeScanImage(i) {
  _scanImages.splice(i, 1);
  _renderScanThumbs();
  document.getElementById('scan-result').innerHTML = '';
}

async function runProductScan() {
  const resultEl = document.getElementById('scan-result');
  if (!_scanImages.length) { showToast('נא לבחור תמונה תחילה', 'error'); return; }
  if (!DB.getSettings().apiKey) { showToast('נא להזין מפתח API בהגדרות', 'error'); return; }

  resultEl.innerHTML = `<div style="display:flex;align-items:center;gap:.5rem;justify-content:center;padding:.8rem">
    <span class="ai-thinking-dots"><span></span><span></span><span></span></span>
    <span style="font-size:.8rem;color:var(--text-soft)">AI מזהה מוצרים מ-${_scanImages.length} תמונות...</span>
  </div>`;

  try {
    const products = await AI.scanProducts(_scanImages);
    if (!products.length) {
      resultEl.innerHTML = `<div class="conflict-warning" style="margin-top:.6rem">לא זוהו מוצרים — נסי תמונות ברורות יותר.</div>`;
      return;
    }
    resultEl.innerHTML = _scanResultsHTML(products);
  } catch (err) {
    resultEl.innerHTML = `<div class="conflict-warning" style="margin-top:.6rem">${esc(err.message)}</div>`;
  }
}

function _scanResultsHTML(products) {
  const header = `<div style="font-family:'Poiret One',cursive;font-size:.68rem;letter-spacing:.15em;color:var(--text-soft);text-transform:uppercase;margin:.4rem 0 .5rem">
    זוהו ${products.length} מוצר${products.length !== 1 ? 'ים' : ''}
  </div>`;

  const cards = products.map((p, i) => {
    const cat     = CATEGORIES[p.category] || CATEGORIES.other;
    const dataStr = esc(JSON.stringify(p));
    return `<div id="scan-card-${i}" style="background:rgba(176,152,144,.1);border-radius:var(--r-sm);padding:.75rem;margin-bottom:.5rem;border:1.5px solid var(--border)">
      <div style="display:flex;align-items:flex-start;gap:.6rem">
        <div style="flex:1">
          ${p.brand ? `<span style="font-family:'Poiret One',cursive;font-size:.68rem;color:var(--text-soft);display:block">${esc(p.brand)}</span>` : ''}
          <span style="font-family:'DanaYad',sans-serif;-webkit-text-stroke:.6px var(--text-dark);font-size:.9rem">${esc(p.name)}</span>
          <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.3rem">
            <span class="product-badge badge-both">${cat.emoji} ${cat.label}</span>
            <span class="product-badge badge-both">${_timeLabel(p.timeOfUse)}</span>
          </div>
          ${p.note ? `<p style="font-size:.7rem;color:var(--text-soft);margin-top:.3rem;line-height:1.5">${esc(p.note)}</p>` : ''}
        </div>
        <button id="scan-btn-${i}" class="btn btn-sm btn-primary" style="flex-shrink:0;white-space:nowrap"
                data-product="${dataStr}"
                onclick="addScannedProduct(${i})">+ הוסיפי</button>
      </div>
    </div>`;
  }).join('');

  const addAll = products.length > 1
    ? `<button class="btn btn-primary" id="scan-add-all" style="width:100%;justify-content:center;margin-top:.4rem"
           onclick="addAllScanned(${products.length})">+ הוסיפי את כולם (${products.length})</button>`
    : '';

  return header + cards + addAll;
}

function addScannedProduct(index) {
  const btn = document.getElementById(`scan-btn-${index}`);
  if (!btn || btn.disabled) return;
  const data = JSON.parse(btn.dataset.product.replace(/&quot;/g, '"'));
  _saveScannedProduct(data);
  btn.textContent = '✓ נוסף';
  btn.disabled    = true;
  btn.classList.remove('btn-primary');
  renderProducts();
  showToast(`${data.name} נוסף ✦`, 'success');
  // Auto-close if all added
  const allBtns = document.querySelectorAll('[id^="scan-btn-"]');
  if ([...allBtns].every(b => b.disabled)) setTimeout(() => closeModal('modal-scan'), 600);
}

function addAllScanned(count) {
  let added = 0;
  for (let i = 0; i < count; i++) {
    const btn = document.getElementById(`scan-btn-${i}`);
    if (!btn || btn.disabled) continue;
    const data = JSON.parse(btn.dataset.product.replace(/&quot;/g, '"'));
    _saveScannedProduct(data);
    btn.textContent = '✓ נוסף';
    btn.disabled    = true;
    btn.classList.remove('btn-primary');
    added++;
  }
  const allBtn = document.getElementById('scan-add-all');
  if (allBtn) { allBtn.textContent = '✓ כולם נוספו'; allBtn.disabled = true; }
  renderProducts();
  showToast(`${added} מוצרים נוספו ✦`, 'success');
  setTimeout(() => closeModal('modal-scan'), 700);
}

function _saveScannedProduct(data) {
  return DB.addProduct({
    brand: data.brand||'', name: data.name||'',
    category: data.category||'other', subCat: data.subCat||'',
    timeOfUse: data.timeOfUse||['morning','night'],
    ingredients: data.ingredients||[], benefits: data.benefits||[],
    warnings: data.warnings||[], conflicts: data.conflicts||[],
    note: data.note||'', active: true,
  });
}

// ─── Library Consultation ────────────────────────────────────

async function openLibraryConsult() {
  const modal  = document.getElementById('modal-library-consult');
  const bodyEl = document.getElementById('library-consult-body');
  if (!modal || !bodyEl) return;

  if (!DB.getSettings().apiKey) { showToast('נא להזין מפתח API בהגדרות', 'error'); return; }
  if (DB.getProducts().filter(p=>p.active).length < 2) {
    showToast('הוסיפי לפחות 2 מוצרים לייעוץ', 'error'); return;
  }

  modal.classList.remove('hidden');
  bodyEl.innerHTML = `<div style="display:flex;align-items:center;gap:.5rem;padding:.8rem 0;color:var(--text-soft);font-size:.8rem">
    <span class="ai-thinking-dots"><span></span><span></span><span></span></span>
    AI סורק את הספרייה...
  </div>`;

  try {
    const data = await AI.consultLibrary();
    bodyEl.innerHTML = _buildConsultHTML(data);
  } catch(err) {
    const isOverload = err.retryable || err.message?.includes('עמוסים');
    bodyEl.innerHTML = `<div class="conflict-warning">
      ${esc(err.message)}
      ${isOverload ? `<br><br><button onclick="openLibraryConsult()" class="btn btn-sm" style="font-size:.72rem">נסי שוב ↺</button>` : ''}
    </div>`;
  }
}

function _buildConsultHTML(data) {
  const section = (icon, title, items, renderItem) => {
    if (!items?.length) return '';
    return `<div style="margin-bottom:1rem">
      <div class="section-label" style="margin-bottom:.5rem">${icon} ${title}</div>
      ${items.map(renderItem).join('')}
    </div>`;
  };

  const chip = text => `<span style="display:inline-block;font-size:.68rem;padding:.15rem .5rem;border-radius:4px;background:var(--driftwood);color:var(--text-soft);margin:.15rem">${esc(text)}</span>`;

  const card = (content, color='rgba(176,152,144,.1)') =>
    `<div style="background:${color};border-radius:var(--r-sm);padding:.65rem .8rem;margin-bottom:.4rem;font-size:.78rem;line-height:1.55;color:var(--text-dark)">${content}</div>`;

  let html = '';

  // Summary
  if (data.summary) {
    html += `<div style="font-size:.82rem;line-height:1.65;color:var(--text-dark);margin-bottom:1rem;padding:.7rem;background:rgba(176,152,144,.12);border-radius:var(--r-sm)">${esc(data.summary)}</div>`;
  }

  // Duplicates
  html += section('🔄', 'מוצרים דומים / כפולים', data.duplicates, d =>
    card(`<strong>${d.products.map(esc).join(' + ')}</strong><br><span style="color:var(--text-soft)">${esc(d.reason)}</span>`, 'rgba(255,200,100,.12)')
  );

  // Missing
  html += section('➕', 'חסרים לשגרה מיטבית', data.missing, m =>
    card(`<strong>${esc(m.category)}</strong> — ${esc(m.reason)}<br><span style="color:var(--latte)">${esc(m.suggestion)}</span>`, 'rgba(100,180,100,.08)')
  );

  // Unnecessary
  html += section('🗑', 'שווה לשקול להוציא', data.unnecessary, u =>
    card(`<strong>${esc(u.product)}</strong> — ${esc(u.reason)}`)
  );

  // Conflicts
  html += section('⚠️', 'התנגשויות', data.conflicts, c =>
    card(`<strong>${c.products.map(esc).join(' + ')}</strong><br>${esc(c.reason)}`, 'rgba(192,57,43,.07)')
  );

  // Tips
  if (data.tips?.length) {
    html += `<div class="section-label" style="margin-bottom:.5rem">💡 טיפים</div>`;
    html += data.tips.map(t => `<div style="font-size:.78rem;color:var(--text-soft);padding:.3rem 0;line-height:1.5">· ${esc(t)}</div>`).join('');
  }

  if (!html.trim()) html = '<p style="color:var(--text-soft);text-align:center;padding:1rem">הספרייה נראית טובה! אין הערות מיוחדות.</p>';

  return html;
}

// ─── Add Step Modal (shared with ui-routines.js) ──────────────
function openAddStepModal(routineId, cycleDay) {
  const modal   = document.getElementById('modal-add-step');
  const titleEl = document.getElementById('mas-title');
  if (!modal) return;
  if (titleEl) titleEl.textContent = routineId === 'morning' ? 'הוספה לשגרת בוקר' : 'הוספה לשגרת ערב';
  modal.dataset.routineId = routineId;
  modal.dataset.cycleDay  = (cycleDay !== undefined && cycleDay !== null) ? cycleDay : '';
  document.querySelectorAll('#mas-filter-bar .filter-chip').forEach((c,i) => c.classList.toggle('active', i===0));
  _renderStepList(routineId, cycleDay ?? null, 'all');
  modal.classList.remove('hidden');
}

function masFilter(cat, btn) {
  document.querySelectorAll('#mas-filter-bar .filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const modal     = document.getElementById('modal-add-step');
  const routineId = modal?.dataset.routineId;
  const day       = modal?.dataset.cycleDay !== '' ? Number(modal.dataset.cycleDay) : null;
  const replaceId = modal?.dataset.replaceId || '';
  // Delegate to replace list renderer if in replace mode
  if (replaceId && typeof _renderReplaceList === 'function') {
    _renderReplaceList(routineId, day, cat, replaceId);
  } else {
    _renderStepList(routineId, day, cat);
  }
}

function _renderStepList(routineId, cycleDay, catFilter) {
  const listEl  = document.getElementById('mas-product-list');
  if (!listEl) return;
  const routine  = DB.getRoutines().find(r => r.id === routineId);
  const existing = new Set(
    (cycleDay !== null && cycleDay !== undefined)
      ? (routine?.cycle[cycleDay]?.steps || []).map(s => s.productId)
      : (routine?.steps || []).map(s => s.productId)
  );
  const products = DB.getProducts().filter(p =>
    p.active && (catFilter === 'all' || p.category === catFilter)
  );

  if (!products.length) {
    listEl.innerHTML = '<p class="text-soft" style="text-align:center;padding:1rem">אין מוצרים זמינים</p>';
    return;
  }

  const dayParam = (cycleDay !== null && cycleDay !== undefined) ? cycleDay : 'null';
  listEl.innerHTML = products.map(p => {
    const cat   = CATEGORIES[p.category] || CATEGORIES.other;
    const added = existing.has(p.id);
    return `<div class="product-card" style="margin-bottom:.5rem;${added?'opacity:.5':''}">
      <div class="product-info">
        ${p.brand ? `<span class="product-brand">${esc(p.brand)}</span>` : ''}
        <span class="product-name">${esc(p.name)}</span>
        <div class="product-meta"><span class="product-badge badge-both">${cat.emoji} ${cat.label}</span></div>
      </div>
      <button class="btn btn-sm${added?'':' btn-primary'}" ${added?'disabled':''}
              onclick="addStepFromModal('${routineId}','${p.id}',${dayParam})">
        ${added ? '✓' : '+ הוסיפי'}
      </button>
    </div>`;
  }).join('');
}

function addStepFromModal(routineId, productId, cycleDay) {
  const day     = (cycleDay === null || cycleDay === 'null') ? null : Number(cycleDay);
  const routine = DB.getRoutines().find(r => r.id === routineId);
  if (!routine) return;
  const step = { productId, order: 999, optional: false, note: '' };

  if (day !== null) {
    if (routine.cycle[day]?.steps.find(s => s.productId === productId)) return;
    const cycle = routine.cycle.map((d, i) =>
      i !== day ? d : { ...d, steps: [...d.steps, { ...step, order: d.steps.length }] }
    );
    DB.updateRoutine(routineId, { cycle });
  } else {
    if (routine.steps.find(s => s.productId === productId)) return;
    DB.updateRoutine(routineId, { steps: [...routine.steps, { ...step, order: routine.steps.length }] });
  }

  closeModal('modal-add-step');
  renderRoutines();
  const card = document.getElementById(`card-${routineId}`);
  const body = document.getElementById(`body-${routineId}`);
  if (card && !card.classList.contains('open')) { card.classList.add('open'); body.classList.add('open'); }
}

// ─── Product Comparison ───────────────────────────────────────

/** Selected product IDs for comparison */
let _compareSelected = new Set();
let _compareHistory  = [];

function openCompareModal() {
  const modal = document.getElementById('modal-compare');
  if (!modal) return;
  _compareSelected = new Set();
  _compareHistory  = [];
  _renderCompareProductList();
  document.getElementById('compare-goal').value      = '';
  document.getElementById('compare-free-text').value = '';
  document.getElementById('compare-chat').innerHTML  = '';
  modal.classList.remove('hidden');
}

function _renderCompareProductList() {
  const listEl = document.getElementById('compare-product-list');
  if (!listEl) return;
  const products = DB.getProducts().filter(p => p.active);

  if (!products.length) {
    listEl.innerHTML = '<p class="text-soft" style="padding:.5rem 0;font-size:.78rem">אין מוצרים בספרייה</p>';
    return;
  }

  listEl.innerHTML = products.map(p => {
    const cat     = CATEGORIES[p.category] || CATEGORIES.other;
    const checked = _compareSelected.has(p.id);
    return `<label style="display:flex;align-items:center;gap:.65rem;padding:.5rem .65rem;border-radius:var(--r-sm);cursor:pointer;
                           background:${checked ? 'var(--driftwood)' : 'transparent'};transition:background .15s"
                   onclick="toggleCompareProduct('${p.id}')">
      <div style="width:18px;height:18px;border-radius:4px;border:1.5px solid ${checked ? 'var(--latte)' : 'var(--border)'};
                  background:${checked ? 'var(--latte)' : 'transparent'};flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .15s">
        ${checked ? '<svg viewBox="0 0 256 256" fill="white" width="11" height="11"><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34Z"/></svg>' : ''}
      </div>
      <div style="flex:1;min-width:0">
        ${p.brand ? `<span style="font-family:'Poiret One',cursive;font-size:.65rem;color:var(--text-soft)">${esc(p.brand)}</span><br>` : ''}
        <span style="font-size:.8rem;color:var(--text-dark)">${esc(p.name)}</span>
      </div>
      <span style="font-size:.65rem;color:var(--text-soft)">${cat.emoji} ${cat.label}</span>
    </label>`;
  }).join('');
}

function toggleCompareProduct(id) {
  if (_compareSelected.has(id)) {
    _compareSelected.delete(id);
  } else {
    _compareSelected.add(id);
  }
  _renderCompareProductList();
  _updateCompareCount();
}

function _updateCompareCount() {
  const countEl = document.getElementById('compare-count');
  const n = _compareSelected.size;
  const freeText = document.getElementById('compare-free-text')?.value?.trim().split('\n').filter(Boolean).length || 0;
  const total = n + freeText;
  if (countEl) countEl.textContent = total >= 2 ? `${total} מוצרים נבחרו` : total === 1 ? 'בחרי מוצר נוסף' : 'בחרי לפחות 2 מוצרים';
}

async function runProductComparison() {
  const chatEl    = document.getElementById('compare-chat');
  const goal      = document.getElementById('compare-goal')?.value.trim() || '';
  const freeRaw   = document.getElementById('compare-free-text')?.value.trim() || '';
  const freeItems = freeRaw.split('\n').map(s => s.trim()).filter(Boolean);
  const ids       = [..._compareSelected];

  if (ids.length + freeItems.length < 2) {
    showToast('בחרי לפחות 2 מוצרים להשוואה', 'error'); return;
  }
  if (!DB.getSettings().apiKey) {
    showToast('נא להזין מפתח API בהגדרות', 'error'); return;
  }

  // Add user message to chat
  const products   = DB.getProducts();
  const nameList   = [
    ...ids.map(id => products.find(p => p.id === id)?.name).filter(Boolean),
    ...freeItems,
  ];
  const userMsg = `השווי: ${nameList.join(' מול ')}${goal ? ' — ' + goal : ''}`;
  _compareHistory.push({ role: 'user', content: userMsg });
  _renderCompareChat();

  // Loading
  const loader = document.createElement('div');
  loader.className = 'chat-bubble ai loading';
  loader.innerHTML = `<span class="ai-thinking-dots"><span></span><span></span><span></span></span>`;
  chatEl.appendChild(loader);
  chatEl.scrollTop = chatEl.scrollHeight;

  try {
    const reply = await AI.compareProducts(ids, freeItems, goal);
    _compareHistory.push({ role: 'assistant', content: reply });
    loader.remove();
    _renderCompareChat();
  } catch(err) {
    loader.remove();
    const msg = err.retryable || err.message?.includes('עמוסים')
      ? `${err.message} — <button onclick="runProductComparison()" style="background:none;border:none;cursor:pointer;color:var(--latte);font-size:.75rem;text-decoration:underline">נסי שוב ↺</button>`
      : `שגיאה: ${err.message}`;
    _compareHistory.push({ role: 'assistant', content: msg });
    _renderCompareChat();
  }
}

async function sendCompareFollowUp() {
  const input   = document.getElementById('compare-followup-input');
  const chatEl  = document.getElementById('compare-chat');
  const msg     = input?.value?.trim();
  if (!msg) return;
  input.value = '';

  _compareHistory.push({ role: 'user', content: msg });
  _renderCompareChat();

  const loader = document.createElement('div');
  loader.className = 'chat-bubble ai loading';
  loader.innerHTML = `<span class="ai-thinking-dots"><span></span><span></span><span></span></span>`;
  chatEl.appendChild(loader);
  chatEl.scrollTop = chatEl.scrollHeight;

  try {
    const reply = await AI.chat(_compareHistory);
    _compareHistory.push({ role: 'assistant', content: reply });
    loader.remove();
    _renderCompareChat();
  } catch(err) {
    loader.remove();
    _compareHistory.push({ role: 'assistant', content: `שגיאה: ${err.message}` });
    _renderCompareChat();
  }
}

function _renderCompareChat() {
  const chatEl = document.getElementById('compare-chat');
  if (!chatEl) return;
  chatEl.innerHTML = _compareHistory.map(m => {
    const content = m.role === 'assistant' ? _formatAI(m.content) : `<p style="font-size:.79rem;line-height:1.55">${m.content}</p>`;
    return `<div class="chat-bubble ${m.role === 'assistant' ? 'ai' : 'user'}" style="max-width:100%;margin-bottom:.6rem">${content}</div>`;
  }).join('');
  chatEl.scrollTop = chatEl.scrollHeight;
  const followUpBar = document.getElementById('compare-followup-bar');
  if (followUpBar) followUpBar.style.display = _compareHistory.length >= 2 ? 'flex' : 'none';
}


// ═══════════════════════════════════════════════════════════════
// F1 + F2 — Examine Product + Analyze Ingredients
// ═══════════════════════════════════════════════════════════════

let _examineImage = null; // { base64, mimeType, preview }

function openExamineModal() {
  const modal = document.getElementById('modal-examine');
  if (!modal) return;
  _examineImage = null;
  document.getElementById('examine-preview').style.display = 'none';
  document.getElementById('examine-preview').src = '';
  document.getElementById('examine-result').innerHTML = '';
  document.getElementById('examine-hint').value = '';
  document.getElementById('examine-file').value = '';
  // Reset tabs
  document.querySelectorAll('.examine-tab').forEach((t,i) => t.classList.toggle('active', i===0));
  document.querySelectorAll('.examine-panel').forEach((p,i) => p.style.display = i===0 ? 'block' : 'none');
  modal.classList.remove('hidden');
}

function switchExamineTab(tab, el) {
  document.querySelectorAll('.examine-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('examine-panel-product').style.display    = tab === 'product'     ? 'block' : 'none';
  document.getElementById('examine-panel-ingredients').style.display = tab === 'ingredients' ? 'block' : 'none';
  // Reset result on tab switch
  document.getElementById('examine-result').innerHTML = '';
}

function examineFileSelected(input) {
  const file = input.files?.[0];
  if (!file) return;
  document.getElementById('examine-result').innerHTML = '';
  const reader = new FileReader();
  reader.onload = e => {
    const MAX = 3.5 * 1024 * 1024;
    const [header, base64] = e.target.result.split(',');
    const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
    const store = (b64, mime, url) => {
      _examineImage = { base64: b64, mimeType: mime, preview: url };
      const prev = document.getElementById('examine-preview');
      prev.src = url; prev.style.display = 'block';
    };
    if (Math.ceil(base64.length * 3/4) <= MAX) { store(base64, mimeType, e.target.result); return; }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      let w = img.width, h = img.height;
      const MAX_DIM = 1400;
      if (w > MAX_DIM || h > MAX_DIM) { const r = Math.min(MAX_DIM/w, MAX_DIM/h); w=Math.round(w*r); h=Math.round(h*r); }
      c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h);
      let url = c.toDataURL('image/jpeg', 0.82);
      if (url.length*3/4 > MAX) url = c.toDataURL('image/jpeg', 0.65);
      const [h2,b2] = url.split(',');
      store(b2, 'image/jpeg', url);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function runExamineProduct() {
  const resultEl = document.getElementById('examine-result');
  if (!_examineImage) { showToast('נא לבחור תמונה', 'error'); return; }
  if (!DB.getSettings().apiKey) { showToast('נא להזין מפתח API', 'error'); return; }
  const hint = document.getElementById('examine-hint')?.value.trim() || '';

  resultEl.innerHTML = `<div style="display:flex;align-items:center;gap:.5rem;padding:.8rem 0;color:var(--text-soft);font-size:.8rem">
    <span class="ai-thinking-dots"><span></span><span></span><span></span></span>
    בוחנת את המוצר...
  </div>`;

  try {
    const data = await AI.examineProduct(_examineImage.base64, _examineImage.mimeType, hint);
    resultEl.innerHTML = _examineResultHTML(data);
    resultEl.dataset.examineJson = JSON.stringify(data);
  } catch(err) {
    const retry = err.retryable || err.message?.includes('עמוסים');
    resultEl.innerHTML = `<div class="conflict-warning">${err.message}${retry ? `<br><button onclick="runExamineProduct()" class="btn btn-sm" style="margin-top:.4rem;font-size:.72rem">נסי שוב ↺</button>` : ''}</div>`;
  }
}

async function runAnalyzeIngredients() {
  const resultEl = document.getElementById('examine-result');
  if (!_examineImage) { showToast('נא לבחור תמונה של התווית', 'error'); return; }
  if (!DB.getSettings().apiKey) { showToast('נא להזין מפתח API', 'error'); return; }

  resultEl.innerHTML = `<div style="display:flex;align-items:center;gap:.5rem;padding:.8rem 0;color:var(--text-soft);font-size:.8rem">
    <span class="ai-thinking-dots"><span></span><span></span><span></span></span>
    מנתחת רכיבים...
  </div>`;

  try {
    const data = await AI.analyzeIngredients(_examineImage.base64, _examineImage.mimeType);
    resultEl.innerHTML = _ingredientsResultHTML(data);
  } catch(err) {
    const retry = err.retryable || err.message?.includes('עמוסים');
    resultEl.innerHTML = `<div class="conflict-warning">${err.message}${retry ? `<br><button onclick="runAnalyzeIngredients()" class="btn btn-sm" style="margin-top:.4rem;font-size:.72rem">נסי שוב ↺</button>` : ''}</div>`;
  }
}

function _examineResultHTML(d) {
  if (!d) return '';
  const score = d.fitScore || 0;
  const scoreCls = score >= 75 ? '#6a8f6a' : score >= 50 ? 'var(--latte)' : '#c0392b';
  const verdictEmoji = { buy: '✓ קני!', skip: '✗ דלגי', maybe: '~ אולי' }[d.verdict] || '';
  const verdictBg    = { buy: 'rgba(100,180,100,.12)', skip: 'rgba(192,57,43,.08)', maybe: 'rgba(255,200,100,.12)' }[d.verdict] || 'var(--driftwood)';
  const verdictColor = { buy: '#6a8f6a', skip: '#c0392b', maybe: '#8B6914' }[d.verdict] || 'var(--text-soft)';
  const flagEmoji    = { good: '✓', caution: '⚠', avoid: '✗', neutral: '·' };
  const flagColor    = { good: '#6a8f6a', caution: '#8B6914', avoid: '#c0392b', neutral: 'var(--text-soft)' };

  let h = '';

  // Header: identified product + score + verdict
  h += `<div style="display:flex;align-items:flex-start;gap:.8rem;margin-bottom:.85rem;padding:.75rem;background:rgba(176,152,144,.1);border-radius:var(--r-sm)">
    <div style="text-align:center;flex-shrink:0">
      <div style="font-size:1.6rem;font-weight:700;color:${scoreCls};line-height:1">${score}</div>
      <div style="font-size:.58rem;color:var(--text-soft)">התאמה</div>
    </div>
    <div style="flex:1;min-width:0">
      ${d.identified?.brand ? `<div style="font-family:'Poiret One',cursive;font-size:.68rem;color:var(--text-soft)">${esc(d.identified.brand)}</div>` : ''}
      ${d.identified?.name  ? `<div style="font-size:.85rem;font-weight:600;color:var(--text-dark)">${esc(d.identified.name)}</div>` : ''}
      <div style="font-size:.7rem;color:var(--latte);margin-top:.15rem">${esc(d.fitLabel||'')} · ${esc(d.skinCompatibility||'')}</div>
    </div>
    <div style="padding:.3rem .65rem;border-radius:20px;background:${verdictBg};color:${verdictColor};font-size:.75rem;font-weight:600;flex-shrink:0">
      ${verdictEmoji}
    </div>
  </div>`;

  // Verdict reason
  if (d.verdictReason) h += `<p style="font-size:.78rem;color:var(--text-dark);line-height:1.6;margin-bottom:.7rem;padding:.55rem .7rem;border-radius:var(--r-sm);background:${verdictBg}">${esc(d.verdictReason)}</p>`;

  // Pros + Cons
  if (d.pros?.length || d.cons?.length) {
    h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin-bottom:.7rem">`;
    if (d.pros?.length) h += `<div style="background:rgba(100,180,100,.08);border-radius:var(--r-sm);padding:.5rem .6rem">
      <div style="font-size:.62rem;color:#6a8f6a;font-weight:600;margin-bottom:.25rem">✓ יתרונות</div>
      ${d.pros.map(p=>`<div style="font-size:.7rem;color:var(--text-dark);line-height:1.5">· ${esc(p)}</div>`).join('')}
    </div>`;
    if (d.cons?.length) h += `<div style="background:rgba(192,57,43,.05);border-radius:var(--r-sm);padding:.5rem .6rem">
      <div style="font-size:.62rem;color:#c0392b;font-weight:600;margin-bottom:.25rem">⚠ חסרונות</div>
      ${d.cons.map(c=>`<div style="font-size:.7rem;color:var(--text-dark);line-height:1.5">· ${esc(c)}</div>`).join('')}
    </div>`;
    h += '</div>';
  }

  // Conflicts + duplicates
  if (d.conflicts?.filter(c=>c.product).length) {
    h += `<div class="conflict-warning" style="margin-bottom:.5rem">
      <svg viewBox="0 0 256 256" fill="currentColor" width="13" height="13" style="flex-shrink:0">
        <path d="M236.8,188.09,149.35,36.22a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z"/>
      </svg>
      <span>${d.conflicts.filter(c=>c.product).map(c=>`מתנגש עם ${esc(c.product)}: ${esc(c.reason)}`).join(' · ')}</span>
    </div>`;
  }
  if (d.duplicates?.filter(c=>c.product).length) {
    h += `<div style="font-size:.74rem;color:var(--latte);padding:.4rem .6rem;background:rgba(176,152,144,.12);border-radius:var(--r-sm);margin-bottom:.5rem">
      דומה ל: ${d.duplicates.filter(c=>c.product).map(c=>`${esc(c.product)}`).join(', ')}
    </div>`;
  }

  // Placement
  if (d.routinePlacement?.time) {
    const timeLabel = { morning: 'בוקר', night: 'ערב', both: 'בוקר + ערב' }[d.routinePlacement.time] || d.routinePlacement.time;
    h += `<div style="font-size:.72rem;color:var(--text-soft);padding:.35rem .6rem;background:var(--driftwood);border-radius:var(--r-sm);margin-bottom:.6rem">
      📍 ${timeLabel}${d.routinePlacement.after ? ` · אחרי ${esc(d.routinePlacement.after)}` : ''}${d.routinePlacement.before ? ` · לפני ${esc(d.routinePlacement.before)}` : ''}
    </div>`;
  }

  // Key ingredients
  if (d.keyIngredients?.length) {
    h += `<div class="section-label" style="margin-bottom:.4rem">רכיבים מרכזיים</div>`;
    h += `<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.7rem">`;
    h += d.keyIngredients.map(i => `<span style="font-size:.65rem;padding:.15rem .5rem;border-radius:4px;
      background:${{ good:'rgba(100,180,100,.12)', caution:'rgba(255,200,100,.15)', avoid:'rgba(192,57,43,.1)', neutral:'rgba(176,152,144,.12)' }[i.flag]||'var(--driftwood)'};
      color:${{ good:'#6a8f6a', caution:'#8B6914', avoid:'#c0392b', neutral:'var(--text-soft)' }[i.flag]||'var(--text-soft)'}">
      ${flagEmoji[i.flag]||''} ${esc(i.name)}${i.benefit ? ` — ${esc(i.benefit)}` : ''}
    </span>`).join('');
    h += '</div>';
  }

  // Add to library button
  if (d.identified?.name && d.verdict !== 'skip') {
    const prod = JSON.stringify({ brand: d.identified.brand||'', name: d.identified.name, category: d.identified.category||'other', subCat: d.identified.subCat||'', ingredients: (d.keyIngredients||[]).map(i=>i.name), benefits: d.pros||[], warnings: d.cons||[] });
    h += `<button class="btn btn-sm btn-primary" style="width:100%;justify-content:center;margin-top:.3rem"
      onclick='addExaminedToLibrary(${prod.replace(/'/g,"&#39;")})'>+ הוסיפי לספרייה</button>`;
  }

  return h;
}

function _ingredientsResultHTML(d) {
  if (!d) return '';
  const ratingLabel = { clean:'נקי ✓', mostly_clean:'נקי ברובו', mixed:'מעורב', concerning:'מעורר חשש' }[d.overallRating] || '';
  const ratingBg    = { clean:'rgba(100,180,100,.1)', mostly_clean:'rgba(100,180,100,.07)', mixed:'rgba(255,200,100,.1)', concerning:'rgba(192,57,43,.08)' }[d.overallRating] || 'var(--driftwood)';
  const ratingColor = { clean:'#6a8f6a', mostly_clean:'#6a8f6a', mixed:'#8B6914', concerning:'#c0392b' }[d.overallRating] || 'var(--text-soft)';
  const flagColor   = { good:'#6a8f6a', neutral:'var(--text-soft)', caution:'#8B6914', avoid:'#c0392b' };
  const flagBg      = { good:'rgba(100,180,100,.1)', neutral:'rgba(176,152,144,.1)', caution:'rgba(255,200,100,.12)', avoid:'rgba(192,57,43,.08)' };
  const flagLabel   = { good:'✓', neutral:'·', caution:'⚠', avoid:'✗' };

  let h = '';

  // Summary header
  h += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.7rem;padding:.6rem .75rem;background:${ratingBg};border-radius:var(--r-sm)">
    <div>
      ${d.productGuess ? `<div style="font-size:.68rem;color:var(--text-soft);margin-bottom:.15rem">${esc(d.productGuess)}</div>` : ''}
      <div style="font-size:.78rem;color:var(--text-dark);line-height:1.5">${esc(d.summary||'')}</div>
    </div>
    <div style="font-size:.72rem;font-weight:600;color:${ratingColor};flex-shrink:0;margin-right:.6rem">${ratingLabel}</div>
  </div>`;

  // Highlights + warnings
  if (d.highlights?.length || d.warnings?.length) {
    h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-bottom:.7rem">`;
    if (d.highlights?.length) h += `<div style="background:rgba(100,180,100,.07);border-radius:var(--r-sm);padding:.5rem .6rem">
      <div style="font-size:.6rem;color:#6a8f6a;font-weight:600;margin-bottom:.25rem">★ בולטים</div>
      ${d.highlights.map(i=>`<div style="font-size:.7rem;color:var(--text-dark);line-height:1.4">· ${esc(i)}</div>`).join('')}
    </div>`;
    if (d.warnings?.filter(Boolean).length) h += `<div style="background:rgba(192,57,43,.06);border-radius:var(--r-sm);padding:.5rem .6rem">
      <div style="font-size:.6rem;color:#c0392b;font-weight:600;margin-bottom:.25rem">⚠ לשים לב</div>
      ${d.warnings.filter(Boolean).map(w=>`<div style="font-size:.7rem;color:var(--text-dark);line-height:1.4">· ${esc(w)}</div>`).join('')}
    </div>`;
    h += '</div>';
  }

  // Ingredients table
  if (d.ingredients?.length) {
    h += `<div class="section-label" style="margin-bottom:.4rem">רכיבים</div>`;
    h += d.ingredients.map(i => `
      <div style="display:flex;align-items:flex-start;gap:.5rem;padding:.4rem .5rem;border-radius:6px;margin-bottom:.25rem;background:${flagBg[i.flag]||'rgba(176,152,144,.07)'}">
        <span style="font-size:.65rem;color:${flagColor[i.flag]};font-weight:700;flex-shrink:0;min-width:1rem;margin-top:.1rem">${flagLabel[i.flag]||'·'}</span>
        <div style="flex:1;min-width:0">
          <span style="font-size:.75rem;color:var(--text-dark);font-weight:600">${esc(i.name)}</span>
          ${i.role ? `<span style="font-size:.68rem;color:var(--text-soft)"> — ${esc(i.role)}</span>` : ''}
          ${i.note ? `<div style="font-size:.65rem;color:${flagColor[i.flag]};margin-top:.08rem">${esc(i.note)}</div>` : ''}
        </div>
      </div>`).join('');
  }

  return h;
}

function addExaminedToLibrary(data) {
  const product = DB.addProduct({
    brand: data.brand||'', name: data.name||'',
    category: data.category||'other', subCat: data.subCat||'',
    timeOfUse: ['morning','night'], ingredients: data.ingredients||[],
    benefits: data.benefits||[], warnings: data.warnings||[], active: true,
  });
  closeModal('modal-examine');
  renderProducts();
  showToast(`${product.name} נוסף לספרייה ✦`, 'success');
  if (DB.getSettings().apiKey) _runEnrichment(product.id);
}
