/**
 * ai.js — Skin Ritual · AI Layer
 * All Anthropic API calls. Exposed via window.AI
 */

const AI_MODEL  = 'claude-sonnet-4-20250514';
const AI_URL    = 'https://api.anthropic.com/v1/messages';

// ─── Core fetch ───────────────────────────────────────────────
async function _aiCall(body) {
  const settings = DB.getSettings();
  if (!settings.apiKey) throw new Error('נא להזין מפתח API בהגדרות');

  const response = await fetch(AI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      AI_MODEL,
      max_tokens: body._maxTok || 1500,
      ...body,
      _maxTok: undefined,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('מפתח API שגוי — עדכני בהגדרות');
    if (response.status === 429) throw new Error('חרגת ממגבלת הבקשות — נסי שוב בעוד רגע');
    throw new Error(err.error?.message || `שגיאת API (${response.status})`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

function _parseJSON(text) {
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  return JSON.parse(clean);
}

function _profileCtx() {
  const p = DB.getProfile() || {};
  const s = DB.getSettings();
  const labels = { normal:'נורמלי', dry:'יבש', oily:'שמן', combination:'מעורב', sensitive:'רגיש' };
  const parts = [];
  if (p.skinType) parts.push(`סוג עור: ${labels[p.skinType] || p.skinType}`);
  if (p.age)      parts.push(`גיל: ${p.age}`);
  if (p.concerns?.length) parts.push(`דאגות: ${p.concerns.join(', ')}`);
  const profile = parts.length ? `פרופיל: ${parts.join(' · ')}` : '';
  const custom  = s.customPrompt ? `הקשר: ${s.customPrompt}` : '';
  return [profile, custom].filter(Boolean).join('\n');
}

// ─── 1. Enrich product ────────────────────────────────────────
async function aiEnrichProduct(productId) {
  const product = DB.getProducts().find(p => p.id === productId);
  if (!product) throw new Error('מוצר לא נמצא');

  const others = DB.getProducts()
    .filter(p => p.id !== productId && p.active)
    .map(p => `${p.brand ? p.brand+' ' : ''}${p.name} (${p.category||'?'})`)
    .join(', ');

  const prompt = `אנליזה של מוצר טיפוח.
${_profileCtx()}
מוצר: ${product.brand ? product.brand+' — ' : ''}${product.name}
${others ? `ספרייה קיימת: ${others}` : ''}

ענה ב-JSON בלבד:
{"category":"cleanser|toner|exfoliant|serum|eye_care|moisturizer|spf|retinoid|treatment|mask|oil|other","subCat":"תיאור קצר","timeOfUse":["morning","night"],"ingredients":["רכיב1"],"benefits":["יתרון1"],"warnings":["אזהרה אם יש"],"conflicts":["קטגוריה מתנגשת אם יש"],"note":"הוראת שימוש"}`;

  const text = await _aiCall({ messages:[{ role:'user', content:prompt }] });
  const data = _parseJSON(text);
  DB.updateProduct(productId, {
    category:    data.category    || product.category || 'other',
    subCat:      data.subCat      || '',
    timeOfUse:   data.timeOfUse   || ['morning','night'],
    ingredients: data.ingredients || [],
    benefits:    data.benefits    || [],
    warnings:    data.warnings    || [],
    conflicts:   data.conflicts   || [],
    note:        data.note        || '',
  });
}

// ─── 2. Scan products from images ─────────────────────────────
async function aiScanProducts(images) {
  const imageBlocks = images.map(img => ({
    type: 'image',
    source: { type:'base64', media_type:img.mimeType, data:img.base64 },
  }));

  const prompt = `זהי את כל מוצרי הטיפוח שנראים ב-${images.length} תמונות.
${_profileCtx()}
ענה ב-JSON בלבד:
{"products":[{"brand":"מותג","name":"שם","category":"cleanser|toner|exfoliant|serum|eye_care|moisturizer|spf|retinoid|treatment|mask|oil|other","subCat":"תיאור","timeOfUse":["morning","night"],"ingredients":["רכיב1"],"benefits":["יתרון1"],"warnings":[],"conflicts":[],"note":"הוראה"}]}
כלולי רק מוצרים שזוהו בוודאות. אל תכפילי מוצרים שנראים בכמה תמונות.`;

  const text = await _aiCall({
    _maxTok: 2000,
    messages:[{ role:'user', content:[...imageBlocks, { type:'text', text:prompt }] }],
  });
  const data = _parseJSON(text);
  return (data.products || []).filter(p => p.name && p.name !== 'לא זוהה');
}

// ─── 3. Build morning routine ─────────────────────────────────
async function aiBuildMorning() {
  const products = DB.getProducts().filter(p => p.active);
  if (!products.length) throw new Error('אין מוצרים בספרייה');
  const list = products.map(p =>
    `ID:${p.id} | ${p.brand?p.brand+' ':''}${p.name} | ${p.category} | ${(p.timeOfUse||[]).join('+')}`
  ).join('\n');

  const prompt = `בני שגרת בוקר.
${_profileCtx()}
מוצרים:
${list}
כלולי רק מוצרים עם "morning". סדר: קלנזר→טונר→סרום→עיניים→לחות→SPF. מוצר אחד לכל קטגוריה.
ענה ב-JSON בלבד: {"steps":[{"productId":"ID","order":1,"note":""}]}`;

  const text = await _aiCall({ messages:[{ role:'user', content:prompt }] });
  const data = _parseJSON(text);
  return data.steps || [];
}

// ─── 4. Build night cycle ─────────────────────────────────────
async function aiBuildNightCycle() {
  const products = DB.getProducts().filter(p => p.active);
  if (!products.length) throw new Error('אין מוצרים בספרייה');
  const list = products.map(p =>
    `ID:${p.id} | ${p.brand?p.brand+' ':''}${p.name} | ${p.category} | ${(p.timeOfUse||[]).join('+')}`
  ).join('\n');

  const prompt = `בני מחזור טיפוח לילי (skin cycling).
${_profileCtx()}
מוצרים:
${list}
כלולי רק מוצרים עם "night". מחזור קלאסי: אקספוליאציה→רטינול→התאוששות→התאוששות. התאם לפי מוצרים זמינים.
ענה ב-JSON בלבד: {"cycle":[{"label":"שם יום","icon":"✨","description":"תיאור","steps":[{"productId":"ID","order":1,"note":""}]}]}`;

  const text = await _aiCall({ messages:[{ role:'user', content:prompt }] });
  const data = _parseJSON(text);
  return (data.cycle || []).map((day, i) => ({
    id: DB.uid(), label: day.label||`לילה ${i+1}`,
    icon: day.icon||'🌙', description: day.description||'',
    steps: day.steps||[],
  }));
}

// ─── 5. Skin analysis ─────────────────────────────────────────
async function aiAnalyzeSkin(base64, mimeType) {
  const prods = DB.getProducts().filter(p => p.active).map(p => p.name).join(', ');
  const prompt = `ניתוח דרמטולוגי של עור הפנים.
${_profileCtx()}
${prods ? `מוצרים בשימוש: ${prods}` : ''}
ענה ב-JSON בלבד:
{"overallScore":75,"skinType":"תיאור","conditions":[{"name":"שם","severity":"mild|moderate|significant","notes":"תיאור"}],"positives":["חיובי1"],"concerns":["דאגה1"],"recommendations":[{"priority":"high|medium|low","action":"המלצה"}],"ingredients_to_seek":["רכיב1"],"ingredients_to_avoid":["להימנע1"],"summary":"סיכום 2-3 משפטים"}`;

  const text = await _aiCall({
    messages:[{ role:'user', content:[
      { type:'image', source:{ type:'base64', media_type:mimeType, data:base64 } },
      { type:'text',  text:prompt },
    ]}],
  });
  return _parseJSON(text);
}

// ─── 6. Chat ──────────────────────────────────────────────────
async function aiChat(messages) {
  const prods  = DB.getProducts().filter(p=>p.active).map(p=>`${p.name}(${p.category})`).join(', ');
  const system = [
    'את יועצת טיפוח עור מומחית. עני בעברית, בסגנון חמות ומקצועי.',
    _profileCtx(),
    prods ? `מוצרי המשתמשת: ${prods}` : '',
  ].filter(Boolean).join('\n');

  return _aiCall({ system, messages });
}

// ─── Public API ───────────────────────────────────────────────
window.AI = {
  enrichProduct:  aiEnrichProduct,
  scanProducts:   aiScanProducts,
  buildMorning:   aiBuildMorning,
  buildNightCycle:aiBuildNightCycle,
  analyzeSkin:    aiAnalyzeSkin,
  chat:           aiChat,
};
