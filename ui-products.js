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

  return `<div class="product-card${p.active?'':' inactive'}" style="animation-delay:${i*.05}s;flex-direction:column;gap:.5rem">
    <div style="display:flex;align-items:flex-start;gap:.8rem">
      <div class="product-info">
        ${p.brand ? `<span class="product-brand">${esc(p.brand)}</span>` : ''}
        <span class="product-name">${esc(p.name)}</span>
        <div class="product-meta">
          <span class="product-badge ${timeCls}">${cat.emoji} ${cat.label}</span>
          <span class="product-badge ${timeCls}">${_timeLabel(p.timeOfUse)}</span>
          ${p.subCat ? `<span class="product-badge" style="background:transparent;border:1px solid var(--border)">${esc(p.subCat)}</span>` : ''}
          ${p.enriching ? `<span style="display:inline-flex;align-items:center;gap:.3rem;font-size:.68rem;color:var(--text-soft)">
            <span class="ai-thinking-dots"><span></span><span></span><span></span></span>AI מנתח...
          </span>` : ''}
        </div>
      </div>
      <div class="product-actions">
        <button class="btn btn-icon btn-sm" onclick="toggleProductActive('${p.id}')" title="${p.active?'השבת':'הפעל'}">
          ${p.active
            ? `<svg viewBox="0 0 256 256" fill="currentColor" width="15" height="15"><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34Z"/></svg>`
            : `<svg viewBox="0 0 256 256" fill="currentColor" width="15" height="15"><path d="M224,128a96,96,0,1,1-96-96A96.11,96.11,0,0,1,224,128Zm-96,80a80,80,0,1,0-80-80A80.09,80.09,0,0,0,128,208Z"/></svg>`}
        </button>
        <button class="btn btn-icon btn-sm" onclick="openEditProductModal('${p.id}')" title="עריכה">
          <svg viewBox="0 0 256 256" fill="currentColor" width="15" height="15"><path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152a15.86,15.86,0,0,0-4.69,11.31V208a16,16,0,0,0,16,16H216a8,8,0,0,0,0-16H115.32l112-112A16,16,0,0,0,227.32,73.37ZM92.69,208H48V163.31l88-88L180.69,120Z"/></svg>
        </button>
        <button class="btn btn-icon btn-sm" onclick="confirmDeleteProduct('${p.id}','${esc(p.name)}')" title="מחיקה">
          <svg viewBox="0 0 256 256" fill="currentColor" width="15" height="15"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192Z"/></svg>
        </button>
      </div>
    </div>
    ${detail ? `<div style="padding-top:.4rem;border-top:1px solid var(--border)">
      ${p.benefits?.length ? `<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.3rem">
        ${p.benefits.slice(0,3).map(b=>`<span style="font-size:.62rem;padding:.12rem .45rem;border-radius:4px;background:rgba(176,152,144,.12);color:var(--text-soft)">${esc(b)}</span>`).join('')}
      </div>` : ''}
      ${p.note ? `<p style="font-size:.72rem;color:var(--text-soft);line-height:1.5">${esc(p.note)}</p>` : ''}
      ${p.ingredients?.length ? `<p style="font-size:.65rem;color:var(--text-soft);margin-top:.2rem;opacity:.75">${p.ingredients.slice(0,4).map(esc).join(' · ')}</p>` : ''}
    </div>` : ''}
    ${conflicts.length ? `<div class="conflict-warning">
      <svg viewBox="0 0 256 256" fill="currentColor" width="13" height="13" style="flex-shrink:0">
        <path d="M236.8,188.09,149.35,36.22a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z"/>
      </svg>
      <span>${conflicts.join(' · ')}</span>
    </div>` : ''}
  </div>`;
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
  renderProducts();
  try {
    await AI.enrichProduct(productId);
    DB.updateProduct(productId, { enriching: false });
    renderProducts();
    showToast('ניתוח AI הושלם ✦', 'success');
  } catch (err) {
    DB.updateProduct(productId, { enriching: false });
    renderProducts();
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
    bodyEl.innerHTML = `<div class="conflict-warning">${esc(err.message)}</div>`;
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
  _renderStepList(routineId, day, cat);
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
