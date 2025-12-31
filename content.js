// Content script for Gemini AI Sidebar

(function () {
  if (document.getElementById('gemini-ai-sidebar-root')) return;

  const host = document.createElement('div');
  host.id = 'gemini-ai-sidebar-root';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // Styles - Minimalist & Content-First Design
  const style = document.createElement('style');
  style.textContent = `
    :host {
      --primary: #374151; /* Dark Grey (Neutral) */
      --accent: #111827; /* Black for monochrome accents */
      --bg-main: #ffffff;
      --bg-secondary: #f9fafb; /* Very light grey */
      --text-main: #111827; /* Near black */
      --text-muted: #6b7280;
      --border-light: #f3f4f6;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    * { box-sizing: border-box; }

    /* FAB - Side-tab Trigger */
    #fab {
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      width: 36px;
      height: 48px;
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      border-right: none;
      border-radius: 24px 0 0 24px;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: -1px 2px 8px rgba(0,0,0,0.1);
      z-index: 1000;
      transition: transform 0.2s, background-color 0.2s, opacity 0.2s;
      pointer-events: auto;
      opacity: 0.4;
      user-select: none;
      touch-action: none;
    }
    #fab:hover { opacity: 1.0; background-color: #f3f4f6; transform: translateY(-50%); }
    #fab:active { cursor: grabbing; }
    #fab img { width: 24px; height: 24px; object-fit: contain; pointer-events: none; }

    /* Sidebar Container */
    #sidebar {
      position: fixed;
      top: 0;
      right: -440px; /* Hidden */
      width: 440px;
      height: 100vh;
      background-color: var(--bg-main);
      box-shadow: -4px 0 20px rgba(0,0,0,0.05);
      z-index: 999;
      transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      pointer-events: auto;
    }
    #sidebar.open { right: 0; }

    /* Header */
    .header {
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      /* Transparent/Blurry background */
      background: rgba(255,255,255,0.9);
      backdrop-filter: blur(8px);
      z-index: 10;
      position: absolute;
      top: 0; left: 0; right: 0;
    }

    /* Monochrome Badge */
    .model-badge {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      /* No background, just clean text per request */
      padding: 4px 8px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: white;
      letter-spacing: 0.2px;
    }

    .header-controls { display: flex; gap: 8px; }
    
    .icon-btn {
      background: transparent; border: none; cursor: pointer; padding: 6px;
      border-radius: 50%; color: var(--text-muted); transition: background 0.2s, color 0.2s;
      display: flex; align-items: center; justify-content: center;
    }
    .icon-btn:hover { background-color: var(--bg-secondary); color: var(--text-main); }
    .icon-btn svg { width: 20px; height: 20px; stroke-width: 2; }

    /* Settings Panel */
    .settings-panel {
      position: absolute;
      top: 60px; right: 20px; left: 20px;
      background: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--border-light);
      z-index: 20;
      font-size: 13px;
    }
    .settings-panel label { display: block; margin-bottom: 6px; font-weight: 600; color: var(--text-main); }
    .settings-panel input, .settings-panel textarea {
      width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px;
      margin-bottom: 12px; font-family: inherit; font-size: 13px; background: var(--bg-secondary);
      outline: none; transition: border-color 0.2s;
    }
    .settings-panel input:focus, .settings-panel textarea:focus { border-color: var(--primary); }
    
    .save-btn {
      background: var(--text-main); color: white; border: none; padding: 8px 16px;
      border-radius: 8px; cursor: pointer; font-weight: 500; width: 100%;
    }
    .save-btn:hover { background: black; }

    /* Chat Area */
    #chat-history {
      flex: 1;
      overflow-y: auto;
      padding: 70px 24px 120px 24px; /* Top space for header, Bottom for input */
      display: flex;
      flex-direction: column;
      gap: 24px;
      scroll-behavior: smooth;
    }

    .msg-group { display: flex; flex-direction: column; gap: 4px; max-width: 100%; }
    
    .msg-content {
      font-size: 15px;
      line-height: 1.6;
      color: var(--text-main);
    }

    /* User Message Styling */
    .user .msg-content {
      background-color: var(--bg-secondary);
      padding: 12px 18px;
      border-radius: 20px;
      border-bottom-right-radius: 4px;
      align-self: flex-end;
      display: inline-block;
      max-width: 85%;
    }

    /* AI Message Styling */
    .ai .msg-content {
      background: transparent;
      padding: 0;
    }

    .msg-label {
      font-size: 11px; font-weight: 700; color: var(--text-muted);
      margin-bottom: 2px; margin-left: 2px; opacity: 0.6;
    }

    /* Floating Input Footer */
    .input-wrapper {
        position: absolute;
        bottom: 24px;
        left: 24px;
        right: 24px;
        z-index: 30;
    }

    .input-container {
        background: white;
        border-radius: 28px; /* Pill shape */
        box-shadow: var(--shadow-lg);
        border: 1px solid #e5e7eb;
        padding: 6px 6px 6px 16px; /* Less padding on right for button */
        display: flex;
        align-items: flex-end; /* Align bottom */
        gap: 8px;
        transition: box-shadow 0.2s, border-color 0.2s;
    }
    .input-container:focus-within {
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
        border-color: #d1d5db;
    }

    #user-input {
      flex: 1; border: none; outline: none; padding: 10px 0; font-family: inherit;
      font-size: 14.5px; max-height: 150px; overflow-y: auto; resize: none;
      background: transparent; line-height: 1.5;
    }

    #send-btn { 
      background: var(--text-main); color: white; border: none; border-radius: 50%;
      width: 36px; height: 36px; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: opacity 0.2s, transform 0.1s; margin-bottom: 2px;
    }
    #send-btn:hover { transform: scale(1.05); }
    #send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    #send-btn svg { width: 18px; height: 18px; fill: white; stroke: white; }

    /* Markdown/Code */
    code { background: var(--bg-secondary); padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
    pre { background: #111827; color: #f9fafb; padding: 16px; border-radius: 12px; overflow-x: auto; margin: 12px 0; }
    pre code { background: transparent; color: inherit; padding: 0; }
    /* Table styling also neutral */
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 0.95em; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; }
    th { background: var(--bg-secondary); font-weight: 600; }

    .hidden { display: none !important; }
  `;

  // Template HTML
  const templateHTML = `
    <div id="fab" title="Chat with Gemini">
      <img src="${chrome.runtime.getURL('icons/g.png')}" alt="Gemini">
    </div>

    <div id="sidebar">
      <!-- Top Header -->
      <div class="header">
        <div class="model-badge" id="header-model-name">Gemini</div>
        <div class="header-controls">
          <button class="icon-btn" id="toggle-settings-btn" title="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
          <button class="icon-btn close-btn" title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      
      <!-- Settings Panel -->
      <div id="settings" class="settings-panel hidden">
        <label>Gemini API Key</label>
        <input type="password" id="api-key-input" placeholder="Paste your API Key here...">
        
        <label>Base URL</label>
        <div style="margin-bottom: 4px; font-size: 11px; color: var(--text-muted);">Use {currentmodel} as placeholder</div>
        <input type="text" id="base-url-input" placeholder="https://generativelanguage.googleapis.com/v1beta/models/{currentmodel}:generateContent">

        <label>Model Name</label>
        <input type="text" id="model-name-input" placeholder="gemini-2.5-flash">

        <label>System Prompt</label>
        <textarea id="system-prompt-input" rows="2" placeholder="e.g. Summarize this page..."></textarea>
        
        <button id="save-settings-btn" class="save-btn">Save Settings</button>
      </div>

      <!-- Chat History -->
      <div id="chat-history">
      </div>

      <!-- Floating Input -->
      <div class="input-wrapper">
        <div class="input-container">
          <textarea id="user-input" placeholder="Message..." rows="1"></textarea>
          <button id="send-btn" title="Send message">
            <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    </div>
  `;

  shadow.appendChild(style);
  const container = document.createElement('div');
  container.innerHTML = templateHTML;
  shadow.appendChild(container);

  // Constants
  const fab = shadow.getElementById('fab');
  const sidebar = shadow.getElementById('sidebar');
  const closeBtn = shadow.querySelector('.close-btn');
  const sendBtn = shadow.getElementById('send-btn');
  const userInput = shadow.getElementById('user-input');
  const chatHistory = shadow.getElementById('chat-history');

  // Settings Elements
  const settingsDiv = shadow.getElementById('settings');
  const apiKeyInput = shadow.getElementById('api-key-input');
  const baseUrlInput = shadow.getElementById('base-url-input');
  const modelNameInput = shadow.getElementById('model-name-input');
  const systemPromptInput = shadow.getElementById('system-prompt-input');
  const saveSettingsBtn = shadow.getElementById('save-settings-btn');
  const toggleSettingsBtn = shadow.getElementById('toggle-settings-btn');
  const headerModelName = shadow.getElementById('header-model-name');

  // State
  const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/{currentmodel}:generateContent';
  const DEFAULT_MODEL = 'gemini-2.5-flash';

  let apiKey = '';
  let baseUrl = DEFAULT_BASE_URL;
  let modelName = DEFAULT_MODEL;
  let systemPrompt = '';

  // Initialize marked options
  if (window.marked) {
    marked.setOptions({ breaks: true, gfm: true });
  }

  // Load Settings
  const keysToLoad = ['systemPrompt', 'geminiBaseUrl', 'geminiModelName', 'fabTop'];

  // Get API key from runtime message
  chrome.runtime.sendMessage({ action: 'GET_KEY' }, (response) => {
    if (response && response.key) {
      apiKey = response.key;
      apiKeyInput.value = apiKey; // Populate the input field
    } else {
      settingsDiv.classList.remove('hidden');
    }
  });

  chrome.storage.local.get(keysToLoad, (result) => {
    if (result.systemPrompt) {
      systemPrompt = result.systemPrompt;
      systemPromptInput.value = systemPrompt;
    }

    if (result.fabTop !== undefined) {
      fab.style.top = result.fabTop + '%';
    }

    // Set Base URL
    baseUrl = result.geminiBaseUrl || DEFAULT_BASE_URL;
    baseUrlInput.value = baseUrl;

    // Set Model Name
    modelName = result.geminiModelName || DEFAULT_MODEL;
    modelNameInput.value = modelName;

    updateHeaderModelName();
  });

  function updateHeaderModelName() {
    headerModelName.textContent = modelName;
  }

  // Draggable Logic
  let isDragging = false;
  let isMouseDown = false;
  let startY, startTop;

  fab.onpointerdown = (e) => {
    isMouseDown = true;
    isDragging = false;
    startY = e.clientY;
    startTop = fab.offsetTop;
    fab.setPointerCapture(e.pointerId);
  };

  fab.onpointermove = (e) => {
    if (!isMouseDown || e.pointerId === undefined) return;
    const deltaY = e.clientY - startY;
    if (Math.abs(deltaY) > 5) isDragging = true;

    if (isDragging) {
      let newTop = startTop + deltaY;
      const fabHeight = fab.offsetHeight;
      const windowHeight = window.innerHeight;

      // Constrain within viewport
      newTop = Math.max(0, Math.min(windowHeight - fabHeight, newTop));

      // We use pixels for dragging for smoothness, but will save as percentage
      fab.style.top = newTop + 'px';
      fab.style.transform = 'translateY(0)'; // Remove the centered transform while dragging
    }
  };

  fab.onpointerup = (e) => {
    isMouseDown = false;
    fab.releasePointerCapture(e.pointerId);
    if (!isDragging) {
      sidebar.classList.add('open');
      fab.classList.add('hidden');
    } else {
      // Save position as percentage
      const topPercent = (fab.offsetTop / window.innerHeight) * 100;
      chrome.storage.local.set({ fabTop: topPercent });
    }
    isDragging = false;
  };

  closeBtn.onclick = () => {
    sidebar.classList.remove('open');
    fab.classList.remove('hidden');
    // Ensure the transform is restored if we were dragging
    const result = chrome.storage.local.get(['fabTop'], (res) => {
      if (res.fabTop === undefined) {
        fab.style.transform = 'translateY(-50%)';
      } else {
        fab.style.transform = 'none';
      }
    });
  };
  toggleSettingsBtn.onclick = () => settingsDiv.classList.toggle('hidden');

  saveSettingsBtn.onclick = () => {
    const key = apiKeyInput.value.trim();
    const promptValue = systemPromptInput.value.trim();
    const urlValue = baseUrlInput.value.trim() || DEFAULT_BASE_URL;
    const modelValue = modelNameInput.value.trim() || DEFAULT_MODEL;

    if (key) {
      chrome.runtime.sendMessage({ action: 'SAVE_KEY', key: key }, (response) => {
        if (response && response.success) {
          apiKey = key;
          apiKeyInput.value = key; // Ensure UI matches state
        }
      });
    }

    chrome.storage.local.set({
      systemPrompt: promptValue,
      geminiBaseUrl: urlValue,
      geminiModelName: modelValue
    }, () => {
      systemPrompt = promptValue;
      baseUrl = urlValue;
      modelName = modelValue;
      updateHeaderModelName();

      alert('Settings saved!');
      settingsDiv.classList.add('hidden');
    });
  };

  // Auto-resize textarea
  userInput.oninput = function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  };

  // Send logic
  async function performSend() {
    const text = userInput.value.trim();
    if (!text || sendBtn.disabled) return;
    if (!apiKey) {
      alert('Please set your Gemini API Key in settings first.');
      settingsDiv.classList.remove('hidden');
      return;
    }

    appendMessage('user', text);
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;

    const pageContent = document.body.innerText.substring(0, 15000);
    const fullPrompt = `Below is the content of the current webpage:\n---\n${pageContent}\n---\nUser query: ${text}`;

    const loadingId = appendLoading();

    chrome.runtime.sendMessage({
      action: 'GENERATE_CONTENT',
      payload: {
        prompt: fullPrompt,
        apiKey,
        systemPrompt,
        baseUrl,
        modelName
      }
    }, (response) => {
      removeLoading(loadingId);
      sendBtn.disabled = false;

      if (chrome.runtime.lastError) {
        appendMessage('ai', '❌ Runtime Error: ' + chrome.runtime.lastError.message);
      } else if (response.error) {
        appendMessage('ai', '⚠️ API Error: ' + response.error);
      } else {
        appendMessage('ai', response.result);
      }
    });
  }

  sendBtn.onclick = performSend;
  userInput.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      performSend();
    }
  };

  function appendMessage(sender, text) {
    const group = document.createElement('div');
    group.className = `msg-group ${sender}`;

    const content = document.createElement('div');
    content.className = 'msg-content';

    if (sender === 'ai' && window.marked) {
      content.innerHTML = marked.parse(text);
      if (window.renderMathInElement) {
        renderMathInElement(content, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      }
    } else {
      content.textContent = text;
    }

    group.appendChild(content);
    chatHistory.appendChild(group);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function appendLoading() {
    const id = 'loading-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'msg-group ai';
    div.innerHTML = `<div class="msg-content">Thinking...</div>`;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return id;
  }

  function removeLoading(id) {
    const el = shadow.getElementById(id);
    if (el) el.remove();
  }

})();
