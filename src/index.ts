import { marked } from 'marked';

// =================================================================================
// DOM ELEMENTS & STATE
// =================================================================================

const chatContainer = document.getElementById('chat-container')!;
const chatHistory = document.getElementById('chat-history')!;
const chatForm = document.getElementById('chat-form')!;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const loadingIndicator = document.getElementById('loading-indicator')!;
const commandMenu = document.getElementById('command-menu')!;

let isInSettingsMode = false;
let settingsScreen: HTMLDivElement | null = null;
let isTtsEnabled = true;
let selectedVoice = 'en-US-Wavenet-D';
let selectedSpeed = 1.0;
let currentAudio: HTMLAudioElement | null = null;
let clipboardHistory: any[] = [];
const maxClipboardItems = 50;
let lastClipboardContent = '';

const LOCAL_EXEC_URL = 'http://localhost:3000/execute';
const CHAT_URL = 'http://localhost:3000/chat';
const TTS_URL = 'http://localhost:3000/tts';
const DIRECT_VIDEO_URL = 'http://localhost:3000/direct-video-search';

const voices = [
    { name: 'Jarvis (Default)', id: 'en-US-Wavenet-D' },
    { name: 'Aura (Digital Assistant)', id: 'en-US-Studio-Q' },
    { name: 'Sentinel (Robotic)', id: 'en-US-Standard-C' },
    { name: 'Unit 734 (Synthesized Male)', id: 'en-US-Studio-M' },
    { name: 'Nova (British Female)', id: 'en-GB-Wavenet-A' },
    { name: 'Atlas (Australian Male)', id: 'en-AU-Wavenet-B' },
    { name: 'Orion (Indian Male)', id: 'en-IN-Wavenet-D' },
    { name: 'Helios (US Male)', id: 'en-US-Wavenet-J' },
    { name: 'Athena (US Female)', id: 'en-US-Wavenet-F' },
];

const commands = [
    { name: '/settings', description: 'Open the settings panel.' },
    { name: '/help', description: 'Show available commands.' },
    { name: '/clear', description: 'Clear the chat history.' },
    { name: '/video', description: 'Search for videos directly.' },
];
let selectedCommandIndex = -1;


// =================================================================================
// FUNCTION DEFINITIONS
// =================================================================================

async function speakText(text: string) {
    if (!isTtsEnabled) return;
    if (currentAudio) currentAudio.pause();
    const plainText = text.replace(/```[^`]+```/g, 'code snippet').replace(/`[^`]+`/g, 'code').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    try {
        const response = await fetch(TTS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: plainText, voice: selectedVoice, speakingRate: selectedSpeed }),
        });
        if (!response.ok) throw new Error(`TTS server error: ${response.status} ${await response.text()}`);
        const { audioContent } = await response.json();
        if (audioContent) {
            currentAudio = new Audio(`data:audio/mp3;base64,${audioContent}`);
            currentAudio.play();
        }
    } catch (error) { console.error('Failed to speak text:', error); }
}

function renderVideoCarousel(videos: any[]) {
    const carouselContainer = document.createElement('div');
    carouselContainer.className = 'video-carousel-container';
    videos.forEach(video => {
        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.innerHTML = `<a href="${video.url}" target="_blank" rel="noopener noreferrer" title="${video.title}"><img src="${video.thumbnail}" alt="${video.title}" onerror="this.style.display='none'"><div class="video-title">${video.title}</div></a>`;
        carouselContainer.appendChild(videoItem);
    });
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'ai');
    messageElement.appendChild(carouselContainer);
    chatHistory.appendChild(messageElement);
}

function addRunButtons(scopeElement: HTMLElement) {
    scopeElement.querySelectorAll('pre code.language-python').forEach(codeBlock => {
        const preElement = codeBlock.parentElement;
        if (preElement instanceof HTMLPreElement && !preElement.nextElementSibling?.classList.contains('run-button-container')) {
            const code = (codeBlock as HTMLElement).innerText;
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'run-button-container';
            const runButton = document.createElement('button');
            runButton.className = 'run-button';
            runButton.innerText = 'Run Code Locally';
            runButton.onclick = () => executeCodeLocally(code, preElement);
            buttonContainer.appendChild(runButton);
            preElement.insertAdjacentElement('afterend', buttonContainer);
        }
    });
}

async function addMessage(sender: 'user' | 'ai', message: string) {
    if (sender === 'ai') {
        try {
            const parsed = JSON.parse(message);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.thumbnail) {
                renderVideoCarousel(parsed);
                speakText("Here are the video results I found.");
                chatHistory.scrollTop = chatHistory.scrollHeight;
                return;
            }
        } catch (e) { /* Not video JSON, proceed as a normal message */ }
    }

    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.innerHTML = await marked.parse(message, { breaks: true, gfm: true });
    chatHistory.appendChild(messageElement);

    if (sender === 'ai') {
        addRunButtons(messageElement);
        speakText(message);
    }
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function updateCommandMenu(filter = '') {
    const filteredCommands = commands.filter(cmd => cmd.name.startsWith(filter));
    if (filteredCommands.length === 0 || !filter.startsWith('/')) {
        commandMenu.classList.add('hidden');
        return;
    }

    commandMenu.innerHTML = filteredCommands.map(cmd => `
        <div class="command-item" data-command="${cmd.name}">
            <strong>${cmd.name}</strong>
            <span>${cmd.description}</span>
        </div>
    `).join('');

    commandMenu.classList.remove('hidden');
    selectedCommandIndex = -1;

    document.querySelectorAll('.command-item').forEach(item => {
        item.addEventListener('click', () => {
            chatInput.value = item.getAttribute('data-command')! + ' ';
            commandMenu.classList.add('hidden');
            chatInput.focus();
        });
    });
}

function exitSettingsMode() {
    if (!isInSettingsMode || !settingsScreen) return;
    isInSettingsMode = false;

    chatContainer.classList.remove('settings-mode-active');
    settingsScreen.classList.remove('active');
    chatInput.focus();
}

function setupSettingsEventListeners() {
    if (!settingsScreen) return;

    const backBtn = settingsScreen.querySelector('.back-to-chat') as HTMLButtonElement;
    backBtn.onclick = exitSettingsMode;

    const voiceSelect = settingsScreen.querySelector('#settings-voice-select') as HTMLSelectElement;
    voiceSelect.onchange = () => { selectedVoice = voiceSelect.value; };
    
    const speedSlider = settingsScreen.querySelector('#settings-speed-slider') as HTMLInputElement;
    const speedValue = settingsScreen.querySelector('#settings-speed-value') as HTMLSpanElement;
    speedSlider.oninput = () => {
        selectedSpeed = parseFloat(speedSlider.value);
        speedValue.textContent = `${selectedSpeed.toFixed(1)}x`;
    };

    const testVoiceBtn = settingsScreen.querySelector('#test-voice-btn') as HTMLButtonElement;
    testVoiceBtn.onclick = () => { speakText("Hello, this is a test of the selected voice settings."); };

    const temperatureSlider = settingsScreen.querySelector('#temperature-slider') as HTMLInputElement;
    const temperatureValue = settingsScreen.querySelector('#temperature-value') as HTMLSpanElement;
    temperatureSlider.oninput = () => {
        const temp = parseFloat(temperatureSlider.value);
        let label = "Balanced";
        if (temp < 0.4) label = "Focused";
        if (temp > 0.7) label = "Creative";
        temperatureValue.textContent = `${temp.toFixed(1)} - ${label}`;
    };

    const themeButtons = settingsScreen.querySelectorAll('.theme-option');
    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = (button as HTMLElement).dataset.theme;
            document.body.className = theme === 'light' ? 'light-theme' : '';
            themeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    const clearChatBtn = settingsScreen.querySelector('#clear-chat-btn') as HTMLButtonElement;
    clearChatBtn.onclick = () => {
        if (confirm('Are you sure you want to clear the chat history?')) {
            chatHistory.innerHTML = '';
            addMessage('ai', 'Chat history cleared.');
            exitSettingsMode();
        }
    };
}

function createSettingsScreen() {
    const screen = document.createElement('div');
    screen.id = 'settings-screen';
    screen.className = 'settings-screen';
    screen.innerHTML = `
        <div class="settings-header">
            <h1>⚙️ Jarvis Settings</h1>
            <button class="back-to-chat">Back to Chat</button>
        </div>
        <div class="settings-grid">
            <div class="settings-card">
                <h3>🎤 Voice Settings</h3>
                <div class="setting-group">
                    <label for="settings-voice-select">Voice Model:</label>
                    <select id="settings-voice-select">
                        ${voices.map(voice => `<option value="${voice.id}" ${voice.id === selectedVoice ? 'selected' : ''}>${voice.name}</option>`).join('')}
                    </select>
                </div>
                 <div class="setting-group">
                    <label for="settings-speed-slider">Speaking Speed:</label>
                    <input type="range" id="settings-speed-slider" min="0.5" max="2.0" step="0.1" value="${selectedSpeed}">
                    <span id="settings-speed-value">${selectedSpeed.toFixed(1)}x</span>
                </div>
                <div class="setting-group">
                    <button id="test-voice-btn" class="action-button">Test Voice</button>
                </div>
            </div>
            <div class="settings-card">
                <h3>🤖 AI Parameters</h3>
                <div class="setting-group">
                    <label for="system-prompt">System Prompt (Personality):</label>
                    <textarea id="system-prompt" rows="4" placeholder="e.g., You are a helpful pirate assistant."></textarea>
                </div>
                <div class="setting-group">
                    <label for="temperature-slider">Temperature (Creativity):</label>
                    <input type="range" id="temperature-slider" min="0.1" max="1.0" step="0.1" value="0.7">
                    <span id="temperature-value">0.7 - Balanced</span>
                </div>
            </div>
            <div class="settings-card">
                <h3>🎨 Appearance</h3>
                <div class="setting-group">
                    <label>Theme:</label>
                    <div class="theme-selector">
                        <button class="theme-option active" data-theme="dark">Dark</button>
                        <button class="theme-option" data-theme="light">Light</button>
                    </div>
                </div>
            </div>
            <div class="settings-card">
                <h3>🖥️ System</h3>
                 <div class="setting-group">
                    <button id="clear-chat-btn" class="action-button danger">Clear Chat History</button>
                </div>
            </div>
        </div>
    `;
    return screen;
}

function enterSettingsMode() {
    if (isInSettingsMode) return;
    isInSettingsMode = true;
    
    if (!settingsScreen) {
        settingsScreen = createSettingsScreen();
        document.body.appendChild(settingsScreen);
        setupSettingsEventListeners();
    }
    
    chatContainer.classList.add('settings-mode-active');
    settingsScreen.classList.add('active');
}

async function monitorClipboard() {
    try {
        if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            if (text && text !== lastClipboardContent && text.trim().length > 0) {
                addToClipboardHistory(text);
                lastClipboardContent = text;
            }
        }
    } catch (err) {
        // Safe to ignore.
    }
}

function detectContentType(text: string): string {
    if (text.match(/^https?:\/\//)) return 'url';
    if (text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)) return 'email';
    if (text.match(/^\d+$/)) return 'number';
    if (text.match(/^[A-F0-9]{6}$/i)) return 'color';
    if (text.length > 100) return 'text';
    return 'snippet';
}

function addToClipboardHistory(text: string) {
    const item = {
        content: text.substring(0, 1000),
        timestamp: Date.now(),
        type: detectContentType(text)
    };
    clipboardHistory = clipboardHistory.filter(h => h.content !== text);
    clipboardHistory.unshift(item);
    if (clipboardHistory.length > maxClipboardItems) {
        clipboardHistory = clipboardHistory.slice(0, maxClipboardItems);
    }
    updateClipboardDisplay();
}

function getTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function updateClipboardDisplay() {
    const clipboardList = document.getElementById('clipboard-list');
    const searchInput = document.getElementById('clipboard-search') as HTMLInputElement;
    if (!clipboardList || !searchInput) return;

    const searchTerm = searchInput.value.toLowerCase() || '';
    const filtered = clipboardHistory.filter(item =>
        item.content.toLowerCase().includes(searchTerm)
    );

    clipboardList.innerHTML = filtered.map(item => {
        const preview = item.content.substring(0, 80).replace(/</g, "&lt;").replace(/>/g, "&gt;") + (item.content.length > 80 ? '...' : '');
        const timeAgo = getTimeAgo(item.timestamp);

        return `
            <div class="clipboard-item" data-content="${escape(item.content)}">
                <div class="clipboard-item-header">
                    <span class="clipboard-item-type">${item.type}</span>
                    <span class="clipboard-item-time">${timeAgo}</span>
                </div>
                <div class="clipboard-item-content">${preview}</div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.clipboard-item').forEach(itemEl => {
        itemEl.addEventListener('click', () => {
            const content = unescape((itemEl as HTMLElement).dataset.content || '');
            navigator.clipboard.writeText(content).then(() => {
                 document.getElementById('clipboard-panel')!.classList.add('clipboard-panel-hidden');
            });
        });
    });
}

function createHeaderUI() {
    const header = document.createElement('div');
    header.className = 'header-ui';

    const settingsButton = document.createElement('button');
    settingsButton.id = 'settings-button';
    settingsButton.title = 'Settings';
    settingsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61-.25-1.17.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19-.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"></path></svg>`;
    settingsButton.onclick = () => {
        if(isInSettingsMode) {
            exitSettingsMode();
        } else {
            enterSettingsMode();
        }
    };
    
    const clipboardButton = document.createElement('button');
    clipboardButton.id = 'clipboard-button';
    clipboardButton.title = 'Clipboard History';
    clipboardButton.innerHTML = '📋';
    clipboardButton.onclick = () => {
        const panel = document.getElementById('clipboard-panel')!;
        panel.classList.toggle('clipboard-panel-hidden');
        if (!panel.classList.contains('clipboard-panel-hidden')) {
            updateClipboardDisplay();
        }
    };

    const ttsButton = document.createElement('button');
    ttsButton.id = 'tts-button';
    ttsButton.title = 'Toggle Voice';
    ttsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>`;
    ttsButton.onclick = () => {
        isTtsEnabled = !isTtsEnabled;
        ttsButton.classList.toggle('disabled', !isTtsEnabled);
        if (!isTtsEnabled && currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
    };

    header.appendChild(settingsButton);
    header.appendChild(clipboardButton);
    header.appendChild(ttsButton);
    chatContainer.prepend(header);
}

async function executeCodeLocally(code: string, preElement: HTMLPreElement) {
    const container = preElement.nextElementSibling;
    if (!container) return;
    const runButton = container.querySelector('.run-button') as HTMLButtonElement;
    runButton.disabled = true;
    runButton.innerText = 'Running...';
    if (container.querySelector('.code-result')) container.querySelector('.code-result')!.remove();
    try {
        const response = await fetch(LOCAL_EXEC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        });
        if (!response.ok) throw new Error(`Server error: ${response.status} ${await response.text()}`);
        const result = await response.json();
        const resultElement = document.createElement('div');
        resultElement.className = 'code-result';
        let outputHtml = '<strong>Execution Result:</strong>';
        if (result.output) outputHtml += `<pre>${result.output}</pre>`;
        if (result.error) outputHtml += `<pre class="error">${result.error}</pre>`;
        if (!result.output && !result.error) outputHtml += `<pre>(No output)</pre>`;
        resultElement.innerHTML = outputHtml;
        container.appendChild(resultElement);
    } catch (error) {
        const errorElement = document.createElement('div');
        errorElement.className = 'code-result';
        errorElement.innerHTML = `<strong>Execution Error:</strong><br><pre class="error">${error instanceof Error ? error.message : 'Unknown error'}</pre>`;
        container.appendChild(errorElement);
        console.error('Local execution error:', error);
    } finally {
        runButton.disabled = false;
        runButton.innerText = 'Run Code Locally';
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}

async function handleFormSubmit(e: Event) {
    e.preventDefault();
    const prompt = chatInput.value.trim();
    if (!prompt) return;

    addMessage('user', prompt);
    chatInput.value = '';
    commandMenu.classList.add('hidden');

    if (prompt.toLowerCase() === '/settings') {
        enterSettingsMode();
        return;
    }
    if (prompt.toLowerCase() === '/help') {
        const helpMessage = `**Available Commands:**
        \n• \`/settings\` - Open the settings panel
        \n• \`/help\` - Show this help message  
        \n• \`/clear\` - Clear chat history
        \n• \`/video <query>\` - Search for videos.`;
        addMessage('ai', helpMessage);
        return;
    }
    if (prompt.toLowerCase() === '/clear') {
        chatHistory.innerHTML = '';
        addMessage('ai', 'Chat history cleared. How can I help you today?');
        return;
    }
    
    chatInput.disabled = true;
    (chatForm.querySelector('button') as HTMLButtonElement).disabled = true;
    loadingIndicator.classList.remove('hidden');

    let loadingMessage: HTMLDivElement | null = null;

    try {
        if (prompt.startsWith('/video ')) {
            loadingMessage = document.createElement('div');
            loadingMessage.className = 'message ai';
            loadingMessage.innerHTML = `
                <div class="video-search-indicator">
                    <div class="scanner">
                        <div class="scanner-bar"></div>
                        <div class="scanner-grid"></div>
                        <div class="scanner-text">ANALYZING VIDEO STREAMS...</div>
                    </div>
                </div>
            `;
            chatHistory.appendChild(loadingMessage);
            chatHistory.scrollTop = chatHistory.scrollHeight;

            const query = prompt.substring(7);
            const response = await fetch(DIRECT_VIDEO_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });
            
            loadingMessage.remove();

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Direct search error: ${errorData.error || response.statusText}`);
            }
            const videoData = await response.json();
            addMessage('ai', JSON.stringify(videoData));
        } else {
            const response = await fetch(CHAT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            if (!response.ok) throw new Error(`Server error: ${response.status} ${await response.text()}`);
            const result = await response.json();
            addMessage('ai', result.response);
        }
    } catch (error) {
        if (loadingMessage) loadingMessage.remove();
        console.error('API Error:', error);
        addMessage('ai', `Sorry, something went wrong: ${error instanceof Error ? error.message : "An unknown error occurred."}`);
    } finally {
        chatInput.disabled = false;
        (chatForm.querySelector('button') as HTMLButtonElement).disabled = false;
        loadingIndicator.classList.add('hidden');
        chatInput.focus();
    }
}


// =================================================================================
// INITIAL SETUP & EVENT LISTENERS
// =================================================================================

createHeaderUI();
chatForm.addEventListener('submit', handleFormSubmit);

document.getElementById('close-clipboard-btn')!.addEventListener('click', () => {
    document.getElementById('clipboard-panel')!.classList.add('clipboard-panel-hidden');
});
document.getElementById('clear-clipboard-btn')!.addEventListener('click', () => {
    clipboardHistory = [];
    updateClipboardDisplay();
});
(document.getElementById('clipboard-search') as HTMLInputElement)!.addEventListener('input', updateClipboardDisplay);

setInterval(monitorClipboard, 1000);

addMessage(
  'ai',
  'Hello! I am Jarvis. How can I help you today? Type `/` to see available commands.'
);