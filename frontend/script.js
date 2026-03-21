const API = 'http://127.0.0.1:8000';

// ─── State ────────────────────────────────────────────────────────
let medications = [];
let todayLogs   = [];
const today     = new Date().toISOString().split('T')[0];

// ─── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  setupTabs();
  setupMoodSelector();
  setupSuggestionChips();
  checkBackend();
  loadMedications();
  loadTodayLogs();
  loadAdherence();
  loadHealthHistory();
  loadAlerts();

  document.getElementById('addMedBtn').addEventListener('click', addMedication);
  document.getElementById('submitHealthBtn').addEventListener('click', submitHealthInput);
  document.getElementById('aiSendBtn').addEventListener('click', sendAIMessage);
  document.getElementById('alertsClose').addEventListener('click', dismissAlerts);

  document.getElementById('aiInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendAIMessage();
  });
});

// ─── Backend Status ───────────────────────────────────────────────
async function checkBackend() {
  const dot    = document.querySelector('.status-dot');
  const status = document.getElementById('backendStatus');
  try {
    await fetch(`${API}/`);
    dot.classList.add('online');
    status.textContent = 'Backend connected';
  } catch {
    dot.classList.add('offline');
    status.textContent = 'Backend offline';
  }
}

// ─── Tabs ─────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');

      if (btn.dataset.tab === 'today') {
        loadTodayLogs();
        loadAdherence();
      }
    });
  });
}

function setTodayDate() {
  const el = document.getElementById('todayDate');
  if (el) el.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ─── Medications ──────────────────────────────────────────────────
async function loadMedications() {
  try {
    const res = await fetch(`${API}/medications`);
    medications = await res.json();
    renderMedications();
    renderTodayList();
  } catch {
    document.getElementById('medicationList').innerHTML =
      '<p class="empty-msg">Could not load medications. Is the backend running?</p>';
  }
}

function renderMedications() {
  const el = document.getElementById('medicationList');
  if (!medications.length) {
    el.innerHTML = '<p class="empty-msg">No medications added yet.</p>';
    return;
  }
  el.innerHTML = medications.map(med => `
    <div class="med-item" id="med-${med.id}">
      <div class="med-info">
        <span class="med-name">${esc(med.name)}</span>
        <span class="med-detail">${esc(med.dose)} · ${esc(med.frequency)} · ${med.times.join(', ')}</span>
        ${med.notes ? `<span class="med-notes">${esc(med.notes)}</span>` : ''}
      </div>
      <div class="med-actions">
        <button class="btn btn-ghost" onclick="explainMedication(${med.id}, '${esc(med.name)}')">🤖 Explain</button>
        <button class="btn btn-danger" onclick="deleteMedication(${med.id})">Remove</button>
      </div>
    </div>
  `).join('');
}

async function addMedication() {
  const name  = document.getElementById('medName').value.trim();
  const dose  = document.getElementById('medDose').value.trim();
  const freq  = document.getElementById('medFrequency').value;
  const times = document.getElementById('medTimes').value.trim();
  const notes = document.getElementById('medNotes').value.trim();

  if (!name || !dose || !times) {
    alert('Please fill in name, dose, and times.');
    return;
  }

  const timesArr = times.split(',').map(t => t.trim());

  try {
    const res = await fetch(`${API}/medications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, dose, frequency: freq, times: timesArr, notes: notes || null })
    });
    if (!res.ok) throw new Error();
    document.getElementById('medName').value  = '';
    document.getElementById('medDose').value  = '';
    document.getElementById('medTimes').value = '';
    document.getElementById('medNotes').value = '';
    await loadMedications();
  } catch {
    alert('Failed to add medication. Make sure the backend is running.');
  }
}

async function deleteMedication(id) {
  if (!confirm('Remove this medication?')) return;
  await fetch(`${API}/medications/${id}`, { method: 'DELETE' });
  await loadMedications();
}

async function explainMedication(id, name) {
  const medEl = document.getElementById(`med-${id}`);
  let existingExplanation = medEl.querySelector('.med-explanation');

  if (existingExplanation) {
    existingExplanation.remove();
    return;
  }

  const box = document.createElement('div');
  box.className = 'med-explanation';
  box.textContent = 'Loading explanation...';
  medEl.appendChild(box);

  try {
    const res = await fetch(`${API}/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '', medication_name: name })
    });
    const data = await res.json();
    box.textContent = data.response;
  } catch {
    box.textContent = 'Could not load explanation.';
  }
}

// ─── Today / Confirmation ─────────────────────────────────────────
async function loadTodayLogs() {
  try {
    const res = await fetch(`${API}/logs/date/${today}`);
    todayLogs = await res.json();
    renderTodayList();
  } catch {
    todayLogs = [];
  }
}

function renderTodayList() {
  const el = document.getElementById('todayList');
  if (!medications.length) {
    el.innerHTML = '<p class="empty-msg">No medications scheduled. Add some in the Medications tab.</p>';
    return;
  }

  el.innerHTML = medications.map(med => {
    const log    = todayLogs.find(l => l.medication_id === med.id);
    const logged = !!log;
    const taken  = log ? log.taken : null;

    return `
      <div class="confirm-item ${logged ? (taken ? 'taken' : 'missed') : ''}">
        <div class="med-info">
          <span class="med-name">${esc(med.name)}</span>
          <span class="med-detail">${esc(med.dose)} · ${med.times.join(', ')}</span>
        </div>
        <div class="confirm-actions">
          ${logged
            ? `<span class="badge ${taken ? 'badge-green' : 'badge-red'}">${taken ? '✓ Taken' : '✗ Missed'}</span>`
            : `<button class="btn btn-green" onclick="logDose(${med.id}, true)">✓ Taken</button>
               <button class="btn btn-danger" onclick="logDose(${med.id}, false)">✗ Missed</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

async function logDose(medId, taken) {
  try {
    await fetch(`${API}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medication_id: medId, taken, date: today })
    });
    await loadTodayLogs();
    await loadAdherence();
  } catch {
    alert('Failed to log dose.');
  }
}

async function loadAdherence() {
  try {
    const res  = await fetch(`${API}/logs/adherence`);
    const data = await res.json();
    const taken  = data.taken  || 0;
    const missed = data.missed || 0;
    const total  = taken + missed;
    const pct    = total > 0 ? Math.round((taken / total) * 100) : 0;

    document.getElementById('takenCount').textContent   = taken;
    document.getElementById('missedCount').textContent  = missed;
    document.getElementById('adherencePct').textContent = pct + '%';
  } catch {}
}

// ─── Health Input ─────────────────────────────────────────────────
function setupMoodSelector() {
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('healthMood').value = btn.dataset.mood;
    });
  });
}

async function submitHealthInput() {
  const mood     = document.getElementById('healthMood').value;
  const bp       = document.getElementById('healthBP').value.trim();
  const hr       = document.getElementById('healthHR').value;
  const symptoms = document.getElementById('healthSymptoms').value.trim();
  const notes    = document.getElementById('healthNotes').value.trim();

  if (!mood) { alert('Please select your mood.'); return; }

  const payload = {
    date: today,
    mood,
    blood_pressure: bp     || null,
    heart_rate:     hr     ? parseInt(hr) : null,
    symptoms:       symptoms || null,
    notes:          notes    || null,
  };

  try {
    const res  = await fetch(`${API}/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    // Clear form
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('healthMood').value    = '';
    document.getElementById('healthBP').value      = '';
    document.getElementById('healthHR').value      = '';
    document.getElementById('healthSymptoms').value = '';
    document.getElementById('healthNotes').value   = '';

    if (data.alerts && data.alerts.length) {
      showAlerts(data.alerts.map(a => a.message));
    } else {
      alert('Check-in submitted! ✓');
    }

    await loadHealthHistory();
  } catch {
    alert('Failed to submit. Make sure the backend is running.');
  }
}

async function loadHealthHistory() {
  try {
    const res    = await fetch(`${API}/health`);
    const inputs = await res.json();
    const el     = document.getElementById('healthHistory');

    if (!inputs.length) {
      el.innerHTML = '<p class="empty-msg">No check-ins recorded yet.</p>';
      return;
    }

    el.innerHTML = inputs.slice(0, 7).map(entry => `
      <div class="health-entry">
        <div class="health-entry-date">${entry.date}
          <span class="badge ${moodBadge(entry.mood)}" style="margin-left:8px;">${entry.mood}</span>
        </div>
        <div class="health-entry-row">
          ${entry.blood_pressure ? `<span>🫀 BP: ${esc(entry.blood_pressure)}</span>` : ''}
          ${entry.heart_rate     ? `<span>💓 HR: ${entry.heart_rate} bpm</span>` : ''}
          ${entry.symptoms       ? `<span>🤒 ${esc(entry.symptoms)}</span>` : ''}
        </div>
        ${entry.notes ? `<div style="font-size:13px;color:var(--text-3);margin-top:5px;">${esc(entry.notes)}</div>` : ''}
      </div>
    `).join('');
  } catch {}
}

function moodBadge(mood) {
  if (mood === 'good') return 'badge-green';
  if (mood === 'poor') return 'badge-red';
  return 'badge-amber';
}

// ─── Alerts ───────────────────────────────────────────────────────
async function loadAlerts() {
  try {
    const res    = await fetch(`${API}/alerts`);
    const alerts = await res.json();
    if (alerts.length) showAlerts(alerts.map(a => a.message));
  } catch {}
}

function showAlerts(messages) {
  const banner = document.getElementById('alertsBanner');
  const inner  = document.getElementById('alertsInner');
  inner.innerHTML = messages.map(m => `<div>⚠️ ${esc(m)}</div>`).join('');
  banner.style.display = 'flex';
}

function dismissAlerts() {
  document.getElementById('alertsBanner').style.display = 'none';
  fetch(`${API}/alerts`, { method: 'DELETE' }).catch(() => {});
}

// ─── AI Assistant ─────────────────────────────────────────────────
function setupSuggestionChips() {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.q;
      document.getElementById('aiInput').value = q;
      sendAIMessage();
    });
  });
}

async function sendAIMessage() {
  const input = document.getElementById('aiInput');
  const q     = input.value.trim();
  if (!q) return;

  input.value = '';
  appendChatMsg('user', q);

  const thinkingEl = appendChatMsg('ai', '...');

  try {
    const res  = await fetch(`${API}/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, medication_name: null })
    });
    const data = await res.json();
    thinkingEl.querySelector('.chat-bubble').textContent = data.response;
  } catch {
    thinkingEl.querySelector('.chat-bubble').textContent =
      'Sorry, I could not connect to the AI. Make sure the backend is running.';
  }
}

function appendChatMsg(role, text) {
  const win = document.getElementById('aiChatWindow');
  const msg = document.createElement('div');
  msg.className = `chat-msg ${role}`;
  msg.innerHTML = `
    <div class="chat-avatar">${role === 'user' ? 'You' : '🤖'}</div>
    <div class="chat-bubble">${esc(text)}</div>
  `;
  win.appendChild(msg);
  win.scrollTop = win.scrollHeight;
  return msg;
}

// ─── Utils ────────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}