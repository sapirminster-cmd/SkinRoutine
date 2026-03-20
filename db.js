/**
 * db.js — Skin Ritual · Data Layer v2
 * All internal functions are prefixed with _db to avoid global conflicts.
 * Only window.DB is exposed globally.
 */

const DB_KEYS = {
  PRODUCTS: 'sr_products_v2',
  ROUTINES: 'sr_routines_v2',
  PROFILE:  'sr_profile_v2',
  SETTINGS: 'sr_settings_v2',
  DONE:     'sr_done_v2',
  ANALYSIS: 'sr_analysis_v2',
};

// ─── Internal utils ───────────────────────────────────────────
const _dbUid   = () => Math.random().toString(36).slice(2, 10);
const _dbToday = () => new Date().toISOString().slice(0, 10);
const _dbGet   = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const _dbSet   = (key, val) => localStorage.setItem(key, JSON.stringify(val));

// ─── Products ─────────────────────────────────────────────────
const _dbGetProducts  = () => _dbGet(DB_KEYS.PRODUCTS) ?? [];
const _dbSaveProducts = ps => _dbSet(DB_KEYS.PRODUCTS, ps);

const _dbAddProduct = data => {
  const ps = _dbGetProducts();
  const p  = {
    brand:'', ingredients:[], benefits:[], warnings:[],
    conflicts:[], note:'', timeOfUse:['morning','night'], active:true,
    ...data, id:_dbUid(), createdAt:new Date().toISOString(),
  };
  ps.push(p);
  _dbSaveProducts(ps);
  return p;
};

const _dbUpdateProduct = (id, updates) =>
  _dbSaveProducts(_dbGetProducts().map(p => p.id === id ? { ...p, ...updates } : p));

const _dbDeleteProduct = id => {
  _dbSaveProducts(_dbGetProducts().filter(p => p.id !== id));
  _dbSaveRoutines(_dbGetRoutines().map(r => ({
    ...r,
    steps: (r.steps||[]).filter(s => s.productId !== id),
    cycle: (r.cycle||[]).map(day => ({ ...day, steps: (day.steps||[]).filter(s => s.productId !== id) })),
  })));
};

// ─── Routines ─────────────────────────────────────────────────
const _dbDefaultRoutines = () => [
  { id:'morning', name:'שגרת בוקר', steps:[], cycle:[], currentDayIndex:0, lastReset:_dbToday() },
  { id:'night',   name:'שגרת ערב',  steps:[], cycle:[], currentDayIndex:0, lastReset:_dbToday() },
];

const _dbGetRoutines  = () => _dbGet(DB_KEYS.ROUTINES) ?? _dbDefaultRoutines();
const _dbSaveRoutines = rs => _dbSet(DB_KEYS.ROUTINES, rs);

const _dbUpdateRoutine = (id, updates) =>
  _dbSaveRoutines(_dbGetRoutines().map(r => r.id === id ? { ...r, ...updates } : r));

const _dbAdvanceCycleDay = () => {
  const night = _dbGetRoutines().find(r => r.id === 'night');
  if (!night || !night.cycle.length) return;
  _dbUpdateRoutine('night', { currentDayIndex: (night.currentDayIndex + 1) % night.cycle.length });
};

// ─── Done state ───────────────────────────────────────────────
const _dbGetDoneStore = () => _dbGet(DB_KEYS.DONE) ?? {};
const _dbDoneKey = (routineId, productId, cycleDay) =>
  cycleDay !== null && cycleDay !== undefined
    ? `${routineId}_day${cycleDay}_${productId}`
    : `${routineId}_${productId}`;

const _dbIsDone = (routineId, productId, cycleDay = null) =>
  _dbGetDoneStore()[_dbToday()]?.[_dbDoneKey(routineId, productId, cycleDay)] === true;

const _dbToggleDone = (routineId, productId, cycleDay = null) => {
  const store = _dbGetDoneStore();
  const t = _dbToday();
  if (!store[t]) store[t] = {};
  const key = _dbDoneKey(routineId, productId, cycleDay);
  store[t][key] = !store[t][key];
  _dbSet(DB_KEYS.DONE, store);
  return store[t][key];
};

const _dbResetRoutineDone = (routineId, cycleDay = null) => {
  const store = _dbGetDoneStore();
  const t = _dbToday();
  if (!store[t]) return;
  const prefix = cycleDay !== null ? `${routineId}_day${cycleDay}_` : `${routineId}_`;
  Object.keys(store[t]).forEach(k => { if (k.startsWith(prefix)) delete store[t][k]; });
  _dbSet(DB_KEYS.DONE, store);
};

const _dbCleanOldDone = () => {
  const store = _dbGetDoneStore();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  Object.keys(store).forEach(date => { if (new Date(date) < cutoff) delete store[date]; });
  _dbSet(DB_KEYS.DONE, store);
};

// ─── Profile ──────────────────────────────────────────────────
const _dbGetProfile  = () => _dbGet(DB_KEYS.PROFILE);
const _dbSaveProfile = p  => _dbSet(DB_KEYS.PROFILE, p);

// ─── Analysis ─────────────────────────────────────────────────
const _dbGetAnalysis = () => _dbGet(DB_KEYS.ANALYSIS) ?? [];

const _dbAddAnalysis = entry => {
  const history    = _dbGetAnalysis();
  const isBaseline = history.length === 0;
  const newEntry   = { ...entry, id:_dbUid(), date:new Date().toISOString(), isBaseline, delta:null };
  history.push(newEntry);
  _dbSet(DB_KEYS.ANALYSIS, history);
  return newEntry;
};

const _dbUpdateAnalysis = (id, updates) =>
  _dbSet(DB_KEYS.ANALYSIS, _dbGetAnalysis().map(a => a.id === id ? { ...a, ...updates } : a));

const _dbGetBaseline = () => _dbGetAnalysis().find(a => a.isBaseline) ?? null;

// ─── Settings ─────────────────────────────────────────────────
const _dbGetSettings  = ()       => _dbGet(DB_KEYS.SETTINGS) ?? {};
const _dbSaveSettings = updates  => _dbSet(DB_KEYS.SETTINGS, { ..._dbGetSettings(), ...updates });

// ─── Backup ───────────────────────────────────────────────────
const _dbExportAll = () => JSON.stringify({
  products: _dbGetProducts(), routines: _dbGetRoutines(),
  profile:  _dbGetProfile(), analysis: _dbGetAnalysis(),
  exported: new Date().toISOString(), version: 2,
}, null, 2);

const _dbImportAll = json => {
  try {
    const data = JSON.parse(json);
    if (!data.version || data.version < 2) throw new Error('גרסה לא נתמכת');
    if (data.products) _dbSet(DB_KEYS.PRODUCTS, data.products);
    if (data.routines) _dbSet(DB_KEYS.ROUTINES, data.routines);
    if (data.profile)  _dbSet(DB_KEYS.PROFILE,  data.profile);
    if (data.analysis) _dbSet(DB_KEYS.ANALYSIS, data.analysis);
    return true;
  } catch { return false; }
};

// ─── Public API — window.DB ───────────────────────────────────
window.DB = {
  uid:               _dbUid,
  getProducts:       _dbGetProducts,
  addProduct:        _dbAddProduct,
  updateProduct:     _dbUpdateProduct,
  deleteProduct:     _dbDeleteProduct,
  getRoutines:       _dbGetRoutines,
  updateRoutine:     _dbUpdateRoutine,
  advanceCycleDay:   _dbAdvanceCycleDay,
  isDone:            _dbIsDone,
  toggleDone:        _dbToggleDone,
  resetRoutineDone:  _dbResetRoutineDone,
  cleanOldDone:      _dbCleanOldDone,
  getProfile:        _dbGetProfile,
  saveProfile:       _dbSaveProfile,
  getAnalysisHistory:_dbGetAnalysis,
  addAnalysis:       _dbAddAnalysis,
  updateAnalysis:    _dbUpdateAnalysis,
  getBaselineAnalysis:_dbGetBaseline,
  getSettings:       _dbGetSettings,
  saveSettings:      _dbSaveSettings,
  exportAll:         _dbExportAll,
  importAll:         _dbImportAll,
};
