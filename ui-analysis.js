/**
 * ui-analysis.js — Skin Ritual · Analysis Tab
 */

let _chatHistory = [];

function renderAnalysis() {
  const baseline = DB.getBaselineAnalysis();
  const statusEl = document.getElementById('analysis-status');
  if (!statusEl) return;
  statusEl.className = `analysis-status-chip${baseline ? ' has-baseline' : ''}`;
  statusEl.innerHTML = baseline
    ? `✓ ניתוח בסיס מ-${new Date(baseline.date).toLocaleDateString('he-IL')}`
    : `○ לא בוצע ניתוח עדיין`;
}

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
  div.textContent = text;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

async function _doChat() {
  if (!DB.getSettings().apiKey) {
    _appendBubble('נא להזין מפתח API בהגדרות ✦', 'ai');
    return;
  }
  const loadEl = document.createElement('div');
  loadEl.className = 'chat-bubble ai loading';
  loadEl.innerHTML = `<span class="ai-thinking-dots"><span></span><span></span><span></span></span>`;
  document.getElementById('analysis-chat-messages')?.appendChild(loadEl);

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

function openAnalysisUpload() {
  showToast('ניתוח עור AI יגיע בקרוב ✦');
}
