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
async function aiAnalyzeSkin(images) {
  // images: [{ base64, mimeType }] — support 1 or more angles
  const prods = DB.getProducts().filter(p => p.active).map(p => p.name).join(', ');
  const multi = images.length > 1;

  const prompt = `אני רוצה לתת לך מבט חם ומקצועי על העור שלך${multi ? ' — העלית כמה תמונות מזוויות שונות, מעולה' : ''}.

${_profileCtx()}
${prods ? `מוצרים שאת משתמשת בהם: ${prods}` : ''}

אני אסתכל על העור שלך בעיניים מקצועיות אבל חמות, ואתן לך תמונה כנה ואופטימיסטית של מה שאני רואה.

ענה ב-JSON בלבד, בעברית, בנימה נעימה ומעודדת:
{
  "overallScore": 75,
  "skinType": "תיאור עדין של סוג העור",
  "conditions": [{"name": "שם המצב", "severity": "mild|moderate|significant", "notes": "הסבר חם ובגובה העיניים"}],
  "positives": ["דבר מחמיא ואמיתי על העור"],
  "concerns": ["דאגה קטנה, מנוסחת בעדינות"],
  "recommendations": [{"priority": "high|medium|low", "action": "המלצה ספציפית ומעשית, מנוסחת כהצעה לא כציווי"}],
  "ingredients_to_seek": ["רכיב שיועיל"],
  "ingredients_to_avoid": ["רכיב להימנע ממנו"],
  "summary": "סיכום חם ב-2-3 משפטים שמדגיש את הטוב ומציין בעדינות מה אפשר לשפר"
}

חשוב: הציון הוא לא ציון מבחן — הוא מדד להתקדמות. כל עור יפה בדרכו.`;

  const imageBlocks = images.map(img => ({
    type: 'image',
    source: { type: 'base64', media_type: img.mimeType, data: img.base64 },
  }));

  const text = await _aiCall({
    messages:[{ role:'user', content:[...imageBlocks, { type:'text', text:prompt }] }],
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

// ─── 7. Explain cycle ─────────────────────────────────────────
async function aiExplainCycle() {
  const night    = DB.getRoutines().find(r => r.id === 'night');
  const products = DB.getProducts();
  if (!night?.cycle?.length) throw new Error('אין מחזור לנתח');

  const cycleDesc = night.cycle.map((day, i) => {
    const names = day.steps
      .map(s => products.find(p => p.id === s.productId))
      .filter(Boolean)
      .map(p => `${p.brand ? p.brand+' ' : ''}${p.name} (${p.category})`)
      .join(', ');
    return `לילה ${i+1} — ${day.label}: ${names || 'ריק'}`;
  }).join('\n');

  const allProds = products.filter(p => p.active)
    .map(p => `${p.brand ? p.brand+' ' : ''}${p.name} (${p.category})`).join(', ');

  const prompt = `הסבירי את בחירות המחזור בעברית, בסגנון ידידותי ומקצועי.

המחזור:
${cycleDesc}

כל המוצרים הזמינים:
${allProds}

${_profileCtx()}

ענה עם:
1. הלוגיקה הכללית של המחזור
2. לגבי כל לילה — למה הסדר והמוצרים האלה
3. אם יש מוצרים שלא נכללו — למה
4. המלצה לשיפור אם יש

כתבי בגוף שני, פסקאות קצרות.`;

  return _aiCall({ messages: [{ role: 'user', content: prompt }] });
}

// ─── 8. Consult library ────────────────────────────────────────
async function aiConsultLibrary() {
  const products = DB.getProducts().filter(p => p.active);
  if (products.length < 2) throw new Error('הוסיפי לפחות 2 מוצרים לייעוץ');

  const list = products.map(p =>
    `- ${p.brand ? p.brand+' ' : ''}${p.name} | ${p.category} | ${(p.timeOfUse||[]).join('+')}${p.ingredients?.length ? ' | '+p.ingredients.slice(0,3).join(', ') : ''}`
  ).join('\n');

  const prompt = `נתחי את ספריית מוצרי הטיפוח ותני ייעוץ מקצועי.
${_profileCtx()}

הספרייה:
${list}

ענה ב-JSON בלבד, ללא טקסט נוסף:
{"summary":"סיכום כללי 2 משפטים","duplicates":[{"products":["מוצר1","מוצר2"],"reason":"הסבר"}],"missing":[{"category":"קטגוריה","reason":"למה חשוב","suggestion":"המלצה"}],"unnecessary":[{"product":"שם","reason":"הסבר"}],"conflicts":[{"products":["מוצר1","מוצר2"],"reason":"הסבר"}],"tips":["טיפ1","טיפ2"]}

אם אין בעיה בקטגוריה — החזר מערך ריק [].`;

  const text = await _aiCall({ _maxTok: 1500, messages: [{ role: 'user', content: prompt }] });
  return _parseJSON(text);
}

// ─── Public API ───────────────────────────────────────────────
window.AI = {
  enrichProduct:  aiEnrichProduct,
  scanProducts:   aiScanProducts,
  buildMorning:   aiBuildMorning,
  buildNightCycle:aiBuildNightCycle,
  analyzeSkin:    aiAnalyzeSkin,  // now accepts images array
  chat:           aiChat,
  explainCycle:   aiExplainCycle,
  consultLibrary: aiConsultLibrary,
  compareProducts: aiCompareProducts,
};
