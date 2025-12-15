// Configuration
const CONFIG = {
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    STORAGE_KEYS: {
        API_KEY: 'gemini_api_key',
        HISTORY: 'conversation_history',
        SETTINGS: 'app_settings',
        THEME: 'app_theme'
    }
};

// State Management
const state = {
    apiKey: null,
    currentMode: null,
    conversation: [],
    roundCount: 0,
    timer: null,
    timerInterval: null,
    settings: {
        timerEnabled: false,
        timerDuration: 60,
        maxRounds: 10
    }
};

// Mode Prompts
const MODE_PROMPTS = {
    logical: `אתה מומחה לחשיבה לוגית ואנליטית. תפקידך להציג טיעון נגדי מבוסס היגיון, עקבי ומנומק. התמקד בחולשות לוגיות, הנחות שגויות, וקפיצות מסקנה. היה מכבד אך חד.`,
    practical: `אתה מומחה לחשיבה מעשית ומציאותית. תפקידך להציג טיעון נגדי המתמקד ביישום מעשי, מגבלות מציאותיות, ותוצאות בעולם האמיתי. הצג דוגמאות קונקרטיות ואתגרים מעשיים.`,
    consistent: `אתה מומחה לזיהוי סתירות ואי-עקביות. תפקידך למצוא נקודות שבהן העמדה סותרת את עצמה, או שיש פער בין הטענה להנחות שעליה מבוססת. היה ממוקד ומדויק.`,
    minimalist: `אתה מומחה לשאלות חדות וממוקדות. תפקידך לשאול שאלה אחת מדויקת שמאתגרת את הליבה של העמדה. אל תסביר יותר מדי - רק שאלה אחת חזקה שגורמת למחשבה עמוקה.`
};

const MODE_NAMES = {
    logical: 'אתגור לוגי',
    practical: 'אתגור מעשי',
    consistent: 'אתגור עקבי',
    minimalist: 'אתגור מינימליסטי'
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadTheme();
    checkApiKey();
    setupEventListeners();
});

// Load saved settings
function loadSettings() {
    const savedSettings = localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
        state.settings = JSON.parse(savedSettings);
        document.getElementById('timer-enabled').checked = state.settings.timerEnabled;
        document.getElementById('timer-duration').value = state.settings.timerDuration;
        document.getElementById('max-rounds').value = state.settings.maxRounds;
    }
}

// Load theme
function loadTheme() {
    const theme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', theme);
}

// Check if API key exists
function checkApiKey() {
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);
    if (savedKey) {
        state.apiKey = savedKey;
        showMainApp();
    } else {
        showApiSetup();
    }
}

// Show API setup screen
function showApiSetup() {
    document.getElementById('api-setup').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

// Show main app
function showMainApp() {
    document.getElementById('api-setup').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    showModeSelection();
}

// Event Listeners Setup
function setupEventListeners() {
    // API Setup
    document.getElementById('verify-key-btn').addEventListener('click', verifyApiKey);
    document.getElementById('toggle-visibility').addEventListener('click', toggleApiKeyVisibility);
    document.getElementById('api-key-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyApiKey();
    });

    // Theme Toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Mode Selection
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => selectMode(card.dataset.mode));
    });

    // Navigation
    document.getElementById('back-to-modes').addEventListener('click', showModeSelection);
    document.getElementById('challenge-btn').addEventListener('click', startChallenge);
    document.getElementById('send-reply-btn').addEventListener('click', sendReply);
    document.getElementById('stop-conversation').addEventListener('click', stopConversation);

    // Panels
    document.getElementById('history-btn').addEventListener('click', () => togglePanel('history-panel'));
    document.getElementById('settings-btn').addEventListener('click', () => togglePanel('settings-panel'));
    document.getElementById('close-history').addEventListener('click', () => closePanel('history-panel'));
    document.getElementById('close-settings').addEventListener('click', () => closePanel('settings-panel'));

    // Settings
    document.getElementById('timer-enabled').addEventListener('change', updateSettings);
    document.getElementById('timer-duration').addEventListener('change', updateSettings);
    document.getElementById('max-rounds').addEventListener('change', updateSettings);
    document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
    document.getElementById('reset-api-key-btn').addEventListener('click', resetApiKey);

    // Enter to send
    document.getElementById('user-reply').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) sendReply();
    });
}

// Toggle API Key Visibility
function toggleApiKeyVisibility() {
    const input = document.getElementById('api-key-input');
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Verify API Key
async function verifyApiKey() {
    const apiKey = document.getElementById('api-key-input').value.trim();
    const statusEl = document.getElementById('api-status');

    if (!apiKey) {
        showStatus(statusEl, 'error', 'נא להזין מפתח API');
        return;
    }

    showStatus(statusEl, 'loading', 'בודק את המפתח...');

    try {
        const response = await fetch(`${CONFIG.GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: 'שלום' }]
                }]
            })
        });

        if (response.ok) {
            state.apiKey = apiKey;
            localStorage.setItem(CONFIG.STORAGE_KEYS.API_KEY, apiKey);
            showStatus(statusEl, 'success', '✓ המפתח תקין! פותח את האתר...');
            setTimeout(() => showMainApp(), 1000);
        } else {
            const error = await response.json();
            showStatus(statusEl, 'error', `שגיאה: ${error.error?.message || 'מפתח לא תקין'}`);
        }
    } catch (error) {
        showStatus(statusEl, 'error', 'שגיאת רשת. בדוק את החיבור לאינטרנט.');
    }
}

// Show Status Message
function showStatus(element, type, message) {
    element.className = `status-message ${type}`;
    element.textContent = message;
}

// Toggle Theme
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, newTheme);
}

// Show Mode Selection
function showModeSelection() {
    document.getElementById('mode-selection').classList.remove('hidden');
    document.getElementById('statement-input').classList.add('hidden');
    document.getElementById('conversation-area').classList.add('hidden');
}

// Select Mode
function selectMode(mode) {
    state.currentMode = mode;
    document.getElementById('mode-selection').classList.add('hidden');
    document.getElementById('statement-input').classList.remove('hidden');
    document.getElementById('initial-statement').focus();
}

// Start Challenge
async function startChallenge() {
    const statement = document.getElementById('initial-statement').value.trim();

    if (!statement) {
        alert('נא להזין עמדה לאתגר');
        return;
    }

    // Initialize conversation
    state.conversation = [{
        role: 'user',
        content: statement,
        timestamp: new Date().toISOString()
    }];
    state.roundCount = 1;

    // Show conversation area
    document.getElementById('statement-input').classList.add('hidden');
    document.getElementById('conversation-area').classList.remove('hidden');
    document.getElementById('current-mode-badge').textContent = MODE_NAMES[state.currentMode];

    // Display user's initial statement
    displayMessage('user', statement);

    // Get AI counter-argument
    await getAiResponse();
}

// Display Message
function displayMessage(role, content) {
    const container = document.getElementById('messages-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = role === 'user' ? 'אתה' : 'AI';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;

    messageDiv.appendChild(label);
    messageDiv.appendChild(contentDiv);
    container.appendChild(messageDiv);

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Get AI Response
async function getAiResponse() {
    showLoading(true);

    try {
        const prompt = buildPrompt();
        const response = await fetch(`${CONFIG.GEMINI_API_URL}?key=${state.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error('שגיאה בקבלת תגובה מה-AI');
        }

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;

        state.conversation.push({
            role: 'ai',
            content: aiResponse,
            timestamp: new Date().toISOString()
        });

        displayMessage('ai', aiResponse);
        saveConversation();

        // Start timer if enabled
        if (state.settings.timerEnabled) {
            startTimer();
        }
    } catch (error) {
        alert(`שגיאה: ${error.message}`);
        console.error(error);
    } finally {
        showLoading(false);
    }
}

// Build Prompt for AI
function buildPrompt() {
    const modeInstruction = MODE_PROMPTS[state.currentMode];
    const conversationHistory = state.conversation
        .map(msg => `${msg.role === 'user' ? 'משתמש' : 'AI'}: ${msg.content}`)
        .join('\n\n');

    return `${modeInstruction}

${conversationHistory}

הנחיות חשובות:
1. הצג טיעון נגדי בלבד - אל תסכים עם המשתמש
2. היה מכבד אך ישיר וחד
3. אל תחזור על מה שהמשתמש אמר
4. הצג נקודות חדשות
5. תגובתך צריכה להיות בין 2-4 פסקאות
6. כתוב בעברית

תגובה:`;
}

// Send Reply
async function sendReply() {
    const replyInput = document.getElementById('user-reply');
    const reply = replyInput.value.trim();

    if (!reply) {
        alert('נא להזין תגובה');
        return;
    }

    // Stop timer
    stopTimer();

    // Check max rounds
    if (state.roundCount >= state.settings.maxRounds) {
        if (!confirm(`הגעת למקסימום ${state.settings.maxRounds} סבבים. להמשיך בכל זאת?`)) {
            return;
        }
    }

    // Add user reply
    state.conversation.push({
        role: 'user',
        content: reply,
        timestamp: new Date().toISOString()
    });

    displayMessage('user', reply);
    replyInput.value = '';
    state.roundCount++;
    document.getElementById('round-count').textContent = state.roundCount;

    // Get next AI response
    await getAiResponse();
}

// Start Timer
function startTimer() {
    const timerDisplay = document.getElementById('timer-display');
    const timerValue = document.getElementById('timer-value');

    timerDisplay.classList.remove('hidden');
    state.timer = state.settings.timerDuration;
    timerValue.textContent = state.timer;

    state.timerInterval = setInterval(() => {
        state.timer--;
        timerValue.textContent = state.timer;

        if (state.timer <= 0) {
            stopTimer();
            alert('הזמן נגמר! שלח את תגובתך.');
        }
    }, 1000);
}

// Stop Timer
function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    document.getElementById('timer-display').classList.add('hidden');
}

// Stop Conversation
function stopConversation() {
    if (!confirm('האם לעצור את השיחה?')) return;

    stopTimer();
    saveConversation();

    // Reset
    state.conversation = [];
    state.roundCount = 0;
    document.getElementById('messages-container').innerHTML = '';
    document.getElementById('initial-statement').value = '';
    document.getElementById('user-reply').value = '';

    showModeSelection();
}

// Save Conversation to History
function saveConversation() {
    if (state.conversation.length === 0) return;

    const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY) || '[]');

    const conversationRecord = {
        id: Date.now(),
        mode: state.currentMode,
        date: new Date().toISOString(),
        rounds: state.roundCount,
        messages: state.conversation
    };

    history.unshift(conversationRecord);

    // Keep only last 50 conversations
    if (history.length > 50) {
        history.length = 50;
    }

    localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

// Toggle Panel
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    const isHidden = panel.classList.contains('hidden');

    // Close all panels
    document.querySelectorAll('.side-panel').forEach(p => p.classList.add('hidden'));

    if (isHidden) {
        panel.classList.remove('hidden');
        if (panelId === 'history-panel') {
            loadHistory();
        }
    }
}

// Close Panel
function closePanel(panelId) {
    document.getElementById(panelId).classList.add('hidden');
}

// Load History
function loadHistory() {
    const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY) || '[]');
    const container = document.getElementById('history-list');

    if (history.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">אין שיחות שמורות</p>';
        return;
    }

    container.innerHTML = history.map(conv => {
        const date = new Date(conv.date).toLocaleDateString('he-IL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const preview = conv.messages[0].content.substring(0, 60) + '...';

        return `
            <div class="history-item" data-id="${conv.id}">
                <div class="history-item-header">
                    <span class="history-item-mode">${MODE_NAMES[conv.mode]}</span>
                    <span class="history-item-date">${date}</span>
                </div>
                <div class="history-item-preview">${preview}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                    ${conv.rounds} סבבים • ${conv.messages.length} הודעות
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => loadConversation(item.dataset.id));
    });
}

// Load Conversation from History
function loadConversation(id) {
    const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY) || '[]');
    const conv = history.find(c => c.id == id);

    if (!conv) return;

    // Load conversation
    state.currentMode = conv.mode;
    state.conversation = conv.messages;
    state.roundCount = conv.rounds;

    // Display
    document.getElementById('mode-selection').classList.add('hidden');
    document.getElementById('statement-input').classList.add('hidden');
    document.getElementById('conversation-area').classList.remove('hidden');
    document.getElementById('current-mode-badge').textContent = MODE_NAMES[state.currentMode];
    document.getElementById('round-count').textContent = state.roundCount;

    const container = document.getElementById('messages-container');
    container.innerHTML = '';

    conv.messages.forEach(msg => {
        displayMessage(msg.role, msg.content);
    });

    closePanel('history-panel');
}

// Update Settings
function updateSettings() {
    state.settings.timerEnabled = document.getElementById('timer-enabled').checked;
    state.settings.timerDuration = parseInt(document.getElementById('timer-duration').value);
    state.settings.maxRounds = parseInt(document.getElementById('max-rounds').value);

    localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
}

// Clear History
function clearHistory() {
    if (!confirm('האם למחוק את כל היסטוריית השיחות? פעולה זו בלתי הפיכה.')) return;

    localStorage.removeItem(CONFIG.STORAGE_KEYS.HISTORY);
    alert('ההיסטוריה נמחקה');
    loadHistory();
}

// Reset API Key
function resetApiKey() {
    if (!confirm('האם לאפס את מפתח ה-API? תצטרך להזין אותו מחדש.')) return;

    localStorage.removeItem(CONFIG.STORAGE_KEYS.API_KEY);
    state.apiKey = null;
    document.getElementById('api-key-input').value = '';
    showApiSetup();
}

// Show Loading
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}
