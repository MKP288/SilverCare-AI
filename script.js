// ─── Config ──────────────────────────────────────────────────────
const API_KEY   = 'AIzaSyB74YseDbjVWcfpgaOOyT82ksAdx6wXVCc'; // 🔑 Replace with your key
const API_MODEL = 'gemini-2.0-flash';
const API_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=${API_KEY}`;

// ─── State ───────────────────────────────────────────────────────
let conversationHistory = []; // { role: 'user'|'model', parts: [{text}] }
let isLoading           = false;
let chatSessions        = []; // { id, title, history }
let activeChatId        = null;

// ─── DOM Refs ────────────────────────────────────────────────────
const chatWindow     = document.getElementById('chatWindow');
const messagesEl     = document.getElementById('messages');
const emptyState     = document.getElementById('emptyState');
const messageInput   = document.getElementById('messageInput');
const sendBtn        = document.getElementById('sendBtn');
const charCount      = document.getElementById('charCount');
const newChatBtn     = document.getElementById('newChatBtn');
const clearBtn       = document.getElementById('clearBtn');
const chatHistory    = document.getElementById('chatHistory');
const sidebarToggle  = document.getElementById('sidebarToggle');
const sidebar        = document.getElementById('sidebar');
const topbarTitle    = document.getElementById('topbarTitle');

// ─── Voice Recognition ────────────────────────────────────────────
const micBtn = document.getElementById('micBtn');
let recognition = null;
let isRecording = false;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  micBtn.style.display = 'none'; // hide mic if not supported
} else {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (e) => {
    let transcript = '';
    for (let i = 0; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    messageInput.value = transcript;
    messageInput.dispatchEvent(new Event('input'));
  };

  recognition.onerror = (e) => {
    console.warn('Speech recognition error:', e.error);
    stopRecording();
  };

  recognition.onend = () => {
    if (isRecording) stopRecording();
  };

  micBtn.addEventListener('click', () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });
}

function startRecording() {
  messageInput.value = '';
  messageInput.dispatchEvent(new Event('input'));
  isRecording = true;
  micBtn.classList.add('recording');
  micBtn.title = 'Stop recording';
  recognition.start();
}

function stopRecording() {
  isRecording = false;
  micBtn.classList.remove('recording');
  micBtn.title = 'Voice input';
  try { recognition.stop(); } catch (_) {}
}

// ─── Init ────────────────────────────────────────────────────────
loadSessionsFromStorage();
renderSidebar();
startNewChat();

// ─── Sidebar toggle ───────────────────────────────────────────────
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// ─── New chat ─────────────────────────────────────────────────────
newChatBtn.addEventListener('click', startNewChat);

function startNewChat() {
  const id = Date.now().toString();
  const session = { id, title: 'New Conversation', history: [] };
  chatSessions.unshift(session);
  activeChatId = id;
  conversationHistory = [];
  messagesEl.innerHTML = '';
  showEmptyState(true);
  topbarTitle.textContent = 'New Conversation';
  saveSessionsToStorage();
  renderSidebar();
  messageInput.focus();
}

// ─── Clear chat ───────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  if (!conversationHistory.length) return;
  conversationHistory = [];
  messagesEl.innerHTML = '';
  showEmptyState(true);
  updateActiveSession();
});

// ─── Input handling ───────────────────────────────────────────────
messageInput.addEventListener('input', () => {
  // Auto-resize
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';

  const len = messageInput.value.length;
  charCount.textContent = `${len} / 4000`;
  sendBtn.disabled = len === 0 || isLoading;
});

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

// ─── Suggestion chips ─────────────────────────────────────────────
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const prompt = chip.dataset.prompt;
    if (prompt) {
      messageInput.value = prompt;
      messageInput.dispatchEvent(new Event('input'));
      sendMessage();
    }
  });
});

// ─── Send message ─────────────────────────────────────────────────
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isLoading) return;

  isLoading = true;
  sendBtn.disabled = true;
  messageInput.value = '';
  messageInput.style.height = 'auto';
  charCount.textContent = '0 / 4000';

  // Hide empty state, show messages
  showEmptyState(false);

  // Append user message
  appendMessage('user', text);

  // Add to history
  conversationHistory.push({ role: 'user', parts: [{ text }] });

  // Update chat title if first message
  const session = getActiveSession();
  if (session && session.title === 'New Conversation') {
    session.title = truncate(text, 36);
    topbarTitle.textContent = session.title;
    renderSidebar();
  }

  // Show typing indicator
  const typingEl = appendTypingIndicator();

  try {
    const reply = await fetchGemini(conversationHistory);

    // Remove typing indicator
    typingEl.remove();

    // Append AI reply
    appendMessage('assistant', reply);
    conversationHistory.push({ role: 'model', parts: [{ text: reply }] });
    updateActiveSession();
    saveSessionsToStorage();
  } catch (err) {
    typingEl.remove();
    appendMessage('assistant', `⚠️ ${err.message || 'Something went wrong. Please try again.'}`);
  }

  isLoading = false;
  sendBtn.disabled = messageInput.value.trim().length === 0;
  messageInput.focus();
}

// ─── Gemini API call ──────────────────────────────────────────────
async function fetchGemini(history) {
  const body = {
    contents: history,
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini.');
  return text;
}

// ─── DOM helpers ─────────────────────────────────────────────────
function appendMessage(role, text) {
  const isUser = role === 'user';

  const msg = document.createElement('div');
  msg.classList.add('message', role === 'assistant' ? 'assistant' : 'user');

  const avatar = document.createElement('div');
  avatar.classList.add('avatar');
  avatar.textContent = isUser ? 'U' : 'G';

  const body = document.createElement('div');
  body.classList.add('message-body');

  const roleLabel = document.createElement('div');
  roleLabel.classList.add('message-role');
  roleLabel.textContent = isUser ? 'You' : 'Gemini';

  const textEl = document.createElement('div');
  textEl.classList.add('message-text');
  textEl.innerHTML = formatText(text);

  body.appendChild(roleLabel);
  body.appendChild(textEl);
  msg.appendChild(avatar);
  msg.appendChild(body);
  messagesEl.appendChild(msg);
  scrollToBottom();
  return msg;
}

function appendTypingIndicator() {
  const msg = document.createElement('div');
  msg.classList.add('message', 'assistant');

  const avatar = document.createElement('div');
  avatar.classList.add('avatar');
  avatar.textContent = 'G';

  const body = document.createElement('div');
  body.classList.add('message-body');

  const roleLabel = document.createElement('div');
  roleLabel.classList.add('message-role');
  roleLabel.textContent = 'Gemini';

  const indicator = document.createElement('div');
  indicator.classList.add('typing-indicator');
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    dot.classList.add('typing-dot');
    indicator.appendChild(dot);
  }

  body.appendChild(roleLabel);
  body.appendChild(indicator);
  msg.appendChild(avatar);
  msg.appendChild(body);
  messagesEl.appendChild(msg);
  scrollToBottom();
  return msg;
}

function showEmptyState(show) {
  emptyState.style.display  = show ? 'flex' : 'none';
  messagesEl.style.display  = show ? 'none' : 'flex';
}

function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Minimal markdown: bold, inline code, code blocks
function formatText(text) {
  // Code blocks first
  text = text.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre><code>${escapeHtml(code.trim())}</code></pre>`
  );
  // Inline code
  text = text.replace(/`([^`]+)`/g, (_, code) =>
    `<code>${escapeHtml(code)}</code>`
  );
  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Line breaks
  text = text.replace(/\n/g, '<br>');
  return text;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

// ─── Session management ───────────────────────────────────────────
function getActiveSession() {
  return chatSessions.find(s => s.id === activeChatId);
}

function updateActiveSession() {
  const session = getActiveSession();
  if (session) {
    session.history = conversationHistory.slice();
    saveSessionsToStorage();
  }
}

function loadSession(id) {
  const session = chatSessions.find(s => s.id === id);
  if (!session) return;
  activeChatId = id;
  conversationHistory = session.history.slice();
  messagesEl.innerHTML = '';

  if (conversationHistory.length === 0) {
    showEmptyState(true);
  } else {
    showEmptyState(false);
    conversationHistory.forEach(entry => {
      const role = entry.role === 'model' ? 'assistant' : 'user';
      const text = entry.parts[0].text;
      appendMessage(role, text);
    });
  }
  topbarTitle.textContent = session.title;
  renderSidebar();
}

function renderSidebar() {
  // Remove existing history items (keep label)
  const existingItems = chatHistory.querySelectorAll('.history-item');
  existingItems.forEach(el => el.remove());

  chatSessions.forEach(session => {
    const item = document.createElement('div');
    item.classList.add('history-item');
    if (session.id === activeChatId) item.classList.add('active');

    item.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span>${escapeHtml(truncate(session.title, 28))}</span>
    `;
    item.addEventListener('click', () => loadSession(session.id));
    chatHistory.appendChild(item);
  });
}

// ─── localStorage persistence ────────────────────────────────────
function saveSessionsToStorage() {
  try {
    // Keep only last 20 sessions, trim history to 40 messages each
    const trimmed = chatSessions.slice(0, 20).map(s => ({
      ...s,
      history: s.history.slice(-40),
    }));
    localStorage.setItem('gemini_sessions', JSON.stringify(trimmed));
    localStorage.setItem('gemini_active', activeChatId);
  } catch (_) { /* storage unavailable */ }
}

function loadSessionsFromStorage() {
  try {
    const raw = localStorage.getItem('gemini_sessions');
    if (raw) chatSessions = JSON.parse(raw);
    activeChatId = localStorage.getItem('gemini_active') || null;
  } catch (_) {
    chatSessions = [];
  }
}
