// Application State Management
const STATE = {
    config: {
        groqApiKey: '',
        groqModel: 'llama-3.3-70b-versatile',
        ttsVoice: '',
        ttsRate: 1.1
    },
    chatHistory: [], // Array of { role, content, timestamp }
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    isSpeaking: false,
    isMuted: false,
    speechUtterance: null,
    recordingTimeStart: null,
    clickStartRecording: false, // Tracks if recording was started via toggle click
    sessions: [],
    currentSessionId: null
};

// System instruction prompt designed for audio output clarity
const SYSTEM_PROMPT = "You are AetherVoice, a helpful voice assistant. Keep answers brief and highly conversational. If you write code, ALWAYS wrap it in triple backticks (```).";

// DOM Elements
const elements = {
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    apiKeyInput: document.getElementById('api-key-input'),
    modelSelect: document.getElementById('model-select'),
    voiceSelect: document.getElementById('voice-select'),
    voiceRate: document.getElementById('voice-rate'),
    rateDisplay: document.getElementById('rate-display'),
    welcomeCard: document.getElementById('welcome-card'),
    welcomeSetupBtn: document.getElementById('welcome-setup-btn'),
    chatHistory: document.getElementById('chat-history'),
    currentStatus: document.getElementById('current-status'),
    muteBtn: document.getElementById('mute-btn'),
    soundOnIcon: document.getElementById('sound-on-icon'),
    soundOffIcon: document.getElementById('sound-off-icon'),
    recordBtn: document.getElementById('record-btn'),
    keyboardToggleBtn: document.getElementById('keyboard-toggle-btn'),
    textInputBar: document.getElementById('text-input-bar'),
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),
    statusDot: document.querySelector('.status-dot'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    fullscreenToggleBtn: document.getElementById('fullscreen-toggle-btn'),
    clearChatBtn: document.getElementById('clear-chat-btn'),
    appContainer: document.querySelector('.app-container'),
    newChatSidebarBtn: document.getElementById('new-chat-sidebar-btn'),
    sidebarChatList: document.getElementById('sidebar-chat-list')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    loadSessions();
    setupEventListeners();
    initSpeechVoices();
});

// Load Config from LocalStorage
function loadConfig() {
    const savedConfig = localStorage.getItem('voice_chatbot_config');
    if (savedConfig) {
        try {
            STATE.config = { ...STATE.config, ...JSON.parse(savedConfig) };
        } catch (e) {
            console.error('Failed to parse local configuration', e);
        }
    }
    
    // Mask API Key in settings field
    elements.apiKeyInput.value = STATE.config.groqApiKey || '';
    elements.modelSelect.value = STATE.config.groqModel;
    elements.voiceRate.value = STATE.config.ttsRate;
    elements.rateDisplay.textContent = `${STATE.config.ttsRate}x`;

    if (STATE.config.groqApiKey) {
        elements.welcomeCard.style.display = 'none';
        updateStatusBadge('Ready', 'green');
    } else {
        updateStatusBadge('Needs API Key', 'pulsing-red');
    }
}

// Save Config to LocalStorage
function saveConfig() {
    const key = elements.apiKeyInput.value.trim();
    if (!key) {
        alert('Please enter a valid Groq API key.');
        return;
    }
    
    STATE.config.groqApiKey = key;
    STATE.config.groqModel = elements.modelSelect.value;
    STATE.config.ttsRate = parseFloat(elements.voiceRate.value);
    STATE.config.ttsVoice = elements.voiceSelect.value;

    localStorage.setItem('voice_chatbot_config', JSON.stringify(STATE.config));
    
    elements.welcomeCard.style.display = 'none';
    elements.settingsModal.classList.remove('open');
    updateStatusBadge('Ready', 'green');
    updateStatus('Configuration saved. Ready to record.');
}

// Update Status Badge UI
function updateStatusBadge(text, colorClass) {
    const badge = document.querySelector('.status-badge');
    if (badge) {
        badge.innerHTML = `<span class="status-dot ${colorClass}"></span>${text}`;
    }
}

// Update Status Bar text
function updateStatus(message) {
    elements.currentStatus.textContent = message;
}

// Initialize SpeechVoices for Dropdown
function initSpeechVoices() {
    if (typeof speechSynthesis === 'undefined') return;

    const populateVoices = () => {
        const voices = speechSynthesis.getVoices();
        elements.voiceSelect.innerHTML = '';
        
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            if (voice.name === STATE.config.ttsVoice) {
                option.selected = true;
            }
            elements.voiceSelect.appendChild(option);
        });
    };

    populateVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoices;
    }
}

// Setup Application Listeners
function setupEventListeners() {
    // Settings Modals
    elements.settingsBtn.addEventListener('click', () => elements.settingsModal.classList.add('open'));
    elements.welcomeSetupBtn.addEventListener('click', () => elements.settingsModal.classList.add('open'));
    elements.closeModalBtn.addEventListener('click', () => elements.settingsModal.classList.remove('open'));
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) elements.settingsModal.classList.remove('open');
    });
    
    elements.saveSettingsBtn.addEventListener('click', saveConfig);

    elements.voiceRate.addEventListener('input', (e) => {
        elements.rateDisplay.textContent = `${e.target.value}x`;
    });

    // Mute speech toggle
    elements.muteBtn.addEventListener('click', () => {
        STATE.isMuted = !STATE.isMuted;
        if (STATE.isMuted) {
            elements.muteBtn.classList.remove('active');
            elements.soundOnIcon.style.display = 'none';
            elements.soundOffIcon.style.display = 'block';
            window.speechSynthesis.cancel();
            updateSpeechBubbleAnimation(false);
        } else {
            elements.muteBtn.classList.add('active');
            elements.soundOnIcon.style.display = 'block';
            elements.soundOffIcon.style.display = 'none';
        }
    });

    // Keyboard Fallback View Toggle
    elements.keyboardToggleBtn.addEventListener('click', () => {
        elements.keyboardToggleBtn.classList.toggle('active');
        if (elements.keyboardToggleBtn.classList.contains('active')) {
            elements.textInputBar.style.display = 'flex';
            elements.chatInput.focus();
        } else {
            elements.textInputBar.style.display = 'none';
        }
    });

    // Theme Toggle
    elements.themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        // Update icon based on mode
        const isLightMode = document.body.classList.contains('light-mode');
        if (isLightMode) {
            elements.themeToggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>`;
        } else {
            elements.themeToggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>`;
        }
    });

    // Fullscreen Toggle
    elements.fullscreenToggleBtn.addEventListener('click', () => {
        elements.appContainer.classList.toggle('fullscreen');
        const isFullscreen = elements.appContainer.classList.contains('fullscreen');
        if (isFullscreen) {
            elements.fullscreenToggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                </svg>`;
        } else {
            elements.fullscreenToggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>`;
        }
    });

    // Clear Chat
    elements.clearChatBtn.addEventListener('click', () => {
        if (STATE.currentSessionId) {
            deleteSession(STATE.currentSessionId, null);
        }
    });

    elements.newChatSidebarBtn.addEventListener('click', () => {
        createNewSession();
    });

    // Text sending
    elements.sendBtn.addEventListener('click', handleTextInput);
    elements.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleTextInput();
    });

    // Record Button Voice triggers (Click and Keypress hold)
    elements.recordBtn.addEventListener('mousedown', () => {
        STATE.clickStartRecording = false;
        startVoiceCapture();
    });
    elements.recordBtn.addEventListener('mouseup', () => {
        if (!STATE.clickStartRecording) stopVoiceCapture();
    });
    elements.recordBtn.addEventListener('mouseleave', () => {
        if (STATE.isRecording && !STATE.clickStartRecording) stopVoiceCapture();
    });
    
    // Support click toggle behavior as fallback
    elements.recordBtn.addEventListener('click', () => {
        if (!STATE.isRecording) {
            STATE.clickStartRecording = true;
            startVoiceCapture();
        } else if (STATE.clickStartRecording) {
            STATE.clickStartRecording = false;
            stopVoiceCapture();
        }
    });

    // Spacebar Keybind Events
    let spacebarDown = false;
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !spacebarDown) {
            // Only trigger if focus is not inside text input
            if (document.activeElement !== elements.chatInput && document.activeElement !== elements.apiKeyInput) {
                e.preventDefault();
                spacebarDown = true;
                STATE.clickStartRecording = false;
                startVoiceCapture();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space' && spacebarDown) {
            e.preventDefault();
            spacebarDown = false;
            stopVoiceCapture();
        }
    });
}

// ----------------------------------------------------
// Voice Capture Logic
// ----------------------------------------------------

async function startVoiceCapture() {
    if (STATE.isRecording) return;
    
    // Stop any ongoing assistant audio output before capturing user voice
    if (STATE.isSpeaking) {
        window.speechSynthesis.cancel();
        STATE.isSpeaking = false;
        updateSpeechBubbleAnimation(false);
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        elements.recordBtn.classList.add('recording');
        updateStatus('Recording voice... Speak now.');
        updateStatusBadge('Recording', 'pulsing-red');
        
        STATE.audioChunks = [];
        STATE.isRecording = true;
        STATE.recordingTimeStart = Date.now();

        // Use standard WebM audio standard
        const options = { mimeType: 'audio/webm' };
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
            options.mimeType = 'audio/ogg';
        }

        STATE.mediaRecorder = new MediaRecorder(stream, options);
        STATE.mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                STATE.audioChunks.push(e.data);
            }
        };

        STATE.mediaRecorder.onstop = () => {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            
            // Compile and upload recorded audio
            const audioBlob = new Blob(STATE.audioChunks, { type: STATE.mediaRecorder.mimeType });
            processSpeechAudio(audioBlob);
        };

        STATE.mediaRecorder.start();
    } catch (err) {
        console.error('Microphone capture error:', err);
        updateStatus('Microphone access denied. Switching to text mode.');
        updateStatusBadge('Ready', 'green');
        elements.keyboardToggleBtn.classList.add('active');
        elements.textInputBar.style.display = 'flex';
        elements.chatInput.focus();
    }
}

function stopVoiceCapture() {
    if (!STATE.isRecording || !STATE.mediaRecorder) return;
    
    elements.recordBtn.classList.remove('recording');
    STATE.isRecording = false;
    updateStatus('Processing recorded speech...');
    updateStatusBadge('Processing', 'green');
    
    STATE.mediaRecorder.stop();
}

// ----------------------------------------------------
// API Connection and Data Request Handlers
// ----------------------------------------------------

async function processSpeechAudio(audioBlob) {
    if (!STATE.config.groqApiKey) {
        updateStatus('API key not configured.');
        elements.settingsModal.classList.add('open');
        return;
    }

    const duration = (Date.now() - STATE.recordingTimeStart) / 1000;
    if (duration < 0.5) {
        updateStatus('Audio capture too short. Please hold button longer.');
        updateStatusBadge('Ready', 'green');
        return;
    }

    updateStatus('Transcribing speech...');
    
    const formData = new FormData();
    // Resolve standard browser audio container file format extensions
    const mimeType = STATE.mediaRecorder.mimeType.split(';')[0];
    const extension = mimeType.split('/')[1] || 'webm';
    
    const audioFile = new File([audioBlob], `speech.${extension}`, { type: mimeType });
    formData.append('file', audioFile);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'en');

    try {
        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STATE.config.groqApiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`STT API returns HTTP ${response.status}`);
        }

        const data = await response.json();
        const transcriptionText = data.text ? data.text.trim() : '';

        if (!transcriptionText) {
            updateStatus('Could not detect any speech. Click Mic to try again.');
            updateStatusBadge('Ready', 'green');
            return;
        }

        // Output user speech to chat and query LLM response
        appendSpeechBubble('user', transcriptionText);
        queryLLMResponse(transcriptionText);

    } catch (error) {
        console.error('Transcription API failure:', error);
        updateStatus('Speech transcription failed. Please verify API Key.');
        updateStatusBadge('Ready', 'green');
    }
}

async function queryLLMResponse(userMessageText) {
    updateStatus('Generating response from assistant...');
    updateStatusBadge('Generating', 'green');

    // Save prompt to history state
    STATE.chatHistory.push({ role: 'user', content: userMessageText });
    updateCurrentSession();

    // Restrict history context payload length
    const recentHistory = STATE.chatHistory.slice(-10);
    const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...recentHistory
    ];

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STATE.config.groqApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: STATE.config.groqModel,
                messages: apiMessages,
                temperature: 0.7,
                max_tokens: 512
            })
        });

        if (!response.ok) {
            throw new Error(`LLM API returns HTTP ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content.trim();

        // Save reply to history
        STATE.chatHistory.push({ role: 'assistant', content: responseText });
        updateCurrentSession();
        
        appendSpeechBubble('assistant', responseText);
        speakResponseAudio(responseText);

    } catch (err) {
        console.error('LLM completion API failure:', err);
        updateStatus('Failed to generate chat response. Verify API settings.');
        updateStatusBadge('Ready', 'green');
    }
}

// Handle fallback keyboard text input
function handleTextInput() {
    const text = elements.chatInput.value.trim();
    if (!text) return;

    elements.chatInput.value = '';
    
    // Stop ongoing speech
    if (STATE.isSpeaking) {
        window.speechSynthesis.cancel();
        STATE.isSpeaking = false;
        updateSpeechBubbleAnimation(false);
    }

    appendSpeechBubble('user', text);
    queryLLMResponse(text);
}

// ----------------------------------------------------
// UI Render Helpers
// ----------------------------------------------------

// Format text with code blocks
function formatChatText(text) {
    let formatted = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const codeBlocks = [];
    
    formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        codeBlocks.push({ lang, code });
        return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });
    
    formatted = formatted.replace(/\n/g, '<br>');
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    codeBlocks.forEach((block, index) => {
        const langHtml = block.lang ? `<div class="code-header">${block.lang}</div>` : `<div class="code-header">code</div>`;
        const blockHtml = `<div class="code-block">${langHtml}<pre><code>${block.code}</code></pre></div>`;
        formatted = formatted.replace(`__CODE_BLOCK_${index}__`, blockHtml);
    });
    
    return formatted;
}

function appendSpeechBubble(role, text) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const row = document.createElement('div');
    row.classList.add('message-row', role);

    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    
    // Append structured content
    bubble.innerHTML = formatChatText(text);
    
    if (role === 'assistant') {
        const indicator = document.createElement('span');
        indicator.classList.add('speech-indicator');
        indicator.innerHTML = `
            <span class="speech-bar"></span>
            <span class="speech-bar"></span>
            <span class="speech-bar"></span>
            <span class="speech-bar"></span>
        `;
        bubble.appendChild(indicator);
    }

    const meta = document.createElement('span');
    meta.classList.add('voice-meta');
    meta.textContent = time;
    bubble.appendChild(meta);
    
    row.appendChild(bubble);
    elements.chatHistory.appendChild(row);
    
    // Auto Scroll to newest messages
    elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
}

// ----------------------------------------------------
// Audio Synthesis Playback Logic
// ----------------------------------------------------

function speakResponseAudio(text) {
    if (STATE.isMuted || typeof speechSynthesis === 'undefined') {
        updateStatus('Ready.');
        updateStatusBadge('Ready', 'green');
        return;
    }

    window.speechSynthesis.cancel(); // Clear queued outputs

    STATE.speechUtterance = new SpeechSynthesisUtterance(text);
    
    // Find matching custom voice
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => v.name === STATE.config.ttsVoice);
    if (selectedVoice) {
        STATE.speechUtterance.voice = selectedVoice;
    }
    
    STATE.speechUtterance.rate = STATE.config.ttsRate;

    STATE.speechUtterance.onstart = () => {
        STATE.isSpeaking = true;
        updateSpeechBubbleAnimation(true);
        updateStatus('Speaking response...');
        updateStatusBadge('Speaking', 'green');
    };

    STATE.speechUtterance.onend = () => {
        STATE.isSpeaking = false;
        updateSpeechBubbleAnimation(false);
        updateStatus('Ready. Click Mic or hold Spacebar to speak.');
        updateStatusBadge('Ready', 'green');
    };

    STATE.speechUtterance.onerror = (e) => {
        console.error('SpeechSynthesis Utterance error:', e);
        STATE.isSpeaking = false;
        updateSpeechBubbleAnimation(false);
        updateStatus('Ready.');
        updateStatusBadge('Ready', 'green');
    };

    window.speechSynthesis.speak(STATE.speechUtterance);
}

// Toggle indicator animation on the active assistant bubble
function updateSpeechBubbleAnimation(active) {
    const bubbles = document.querySelectorAll('.message-row.assistant');
    if (bubbles.length === 0) return;
    
    // Get last assistant bubble
    const lastBubble = bubbles[bubbles.length - 1];
    const indicator = lastBubble.querySelector('.speech-indicator');
    
    if (indicator) {
        if (active) {
            indicator.classList.add('speaking');
        } else {
            indicator.classList.remove('speaking');
        }
    }
}

// ----------------------------------------------------
// Session Management
// ----------------------------------------------------

function loadSessions() {
    const saved = localStorage.getItem('voice_chatbot_sessions');
    if (saved) {
        try {
            STATE.sessions = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse sessions', e);
            STATE.sessions = [];
        }
    }
    if (STATE.sessions.length === 0) {
        createNewSession();
    } else {
        switchSession(STATE.sessions[0].id);
    }
    renderSidebar();
}

function saveSessions() {
    localStorage.setItem('voice_chatbot_sessions', JSON.stringify(STATE.sessions));
}

function createNewSession() {
    const newId = Date.now().toString();
    STATE.sessions.unshift({
        id: newId,
        title: 'New Chat',
        history: []
    });
    switchSession(newId);
    renderSidebar();
    saveSessions();
}

function switchSession(id) {
    if (STATE.isSpeaking) {
        window.speechSynthesis.cancel();
        STATE.isSpeaking = false;
    }

    STATE.currentSessionId = id;
    const session = STATE.sessions.find(s => s.id === id);
    STATE.chatHistory = session ? [...session.history] : [];
    
    // Clear chat UI
    document.querySelectorAll('.message-row').forEach(row => row.remove());
    
    // Rebuild chat UI
    STATE.chatHistory.forEach(msg => {
        appendSpeechBubble(msg.role, msg.content);
    });
    
    if (STATE.chatHistory.length === 0 && !STATE.config.groqApiKey) {
        elements.welcomeCard.style.display = 'block';
    } else {
        elements.welcomeCard.style.display = 'none';
    }
    
    updateStatus('Switched to chat session.');
    renderSidebar();
}

function deleteSession(id, e) {
    if (e) e.stopPropagation();
    
    STATE.sessions = STATE.sessions.filter(s => s.id !== id);
    
    if (STATE.sessions.length === 0) {
        createNewSession();
    } else if (STATE.currentSessionId === id) {
        switchSession(STATE.sessions[0].id);
    } else {
        renderSidebar();
    }
    saveSessions();
    updateStatus('Chat session deleted.');
}

function updateCurrentSession() {
    const session = STATE.sessions.find(s => s.id === STATE.currentSessionId);
    if (session) {
        session.history = [...STATE.chatHistory];
        
        // Auto-generate title from first user message
        if (session.title === 'New Chat' && session.history.length > 0) {
            const firstUserMsg = session.history.find(m => m.role === 'user');
            if (firstUserMsg) {
                let title = firstUserMsg.content.substring(0, 24);
                if (firstUserMsg.content.length > 24) title += '...';
                session.title = title;
                renderSidebar();
            }
        }
    }
    saveSessions();
}

function renderSidebar() {
    elements.sidebarChatList.innerHTML = '';
    
    STATE.sessions.forEach(session => {
        const item = document.createElement('div');
        item.className = 'chat-session-item';
        if (session.id === STATE.currentSessionId) {
            item.classList.add('active');
        }
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'chat-session-title';
        titleSpan.textContent = session.title;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-session-btn';
        deleteBtn.title = 'Delete Chat';
        deleteBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        `;
        
        item.addEventListener('click', () => switchSession(session.id));
        deleteBtn.addEventListener('click', (e) => deleteSession(session.id, e));
        
        item.appendChild(titleSpan);
        item.appendChild(deleteBtn);
        
        elements.sidebarChatList.appendChild(item);
    });
}
