/**
 * ui-settings.js — Skin Ritual · Settings Tab
 */

function renderSettings() {
  const profile  = DB.getProfile()  || {};
  const settings = DB.getSettings() || {};
  const el = id => document.getElementById(id);

  if (el('settings-api-key')      && settings.apiKey)      el('settings-api-key').value      = settings.apiKey;
  if (el('settings-age')          && profile.age)           el('settings-age').value           = profile.age;
  if (el('settings-custom-prompt')&& settings.customPrompt) el('settings-custom-prompt').value = settings.customPrompt;

  document.querySelectorAll('.skin-type-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.type === profile.skinType)
  );
}

function saveSettings() {
  const apiKey       = document.getElementById('settings-api-key')?.value.trim()       || '';
  const customPrompt = document.getElementById('settings-custom-prompt')?.value.trim() || '';
  const age          = parseInt(document.getElementById('settings-age')?.value)          || null;
  const skinType     = document.querySelector('.skin-type-btn.active')?.dataset.type    || '';

  DB.saveSettings({ apiKey, customPrompt });
  const profile = DB.getProfile() || {};
  DB.saveProfile({ ...profile, skinType, age, completed: true });
  showToast('ההגדרות נשמרו ✦', 'success');
}

function selectSkinTypeBtn(el) {
  document.querySelectorAll('.skin-type-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function exportData() {
  const blob = new Blob([DB.exportAll()], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `skin-ritual-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('הגיבוי הורד ✦');
}

function importData() {
  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = '.json';
  input.onchange = e => {
    const reader = new FileReader();
    reader.onload = ev => {
      if (DB.importAll(ev.target.result)) {
        showToast('הנתונים יובאו ✦', 'success');
        renderSettings();
        renderRoutines();
        renderProducts();
      } else {
        showToast('שגיאה בייבוא', 'error');
      }
    };
    reader.readAsText(e.target.files[0]);
  };
  input.click();
}

function clearAllData() {
  if (!confirm('למחוק את כל הנתונים? פעולה זו אינה הפיכה.')) return;
  ['sr_products_v2','sr_routines_v2','sr_profile_v2','sr_settings_v2','sr_done_v2','sr_analysis_v2']
    .forEach(k => localStorage.removeItem(k));
  showToast('כל הנתונים נמחקו', 'error');
  setTimeout(() => location.reload(), 1200);
}
