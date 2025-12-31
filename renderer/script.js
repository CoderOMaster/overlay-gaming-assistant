class GameAssistant {
    constructor() {
        this.isProcessing = false;
        this.settings = {};
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.currentAudioBlob = null;
        this.currentAudioUrl = null;
        this.audioPlayer = null;
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.setupIPCListeners();
        this.setupVoiceRecording();
    }

    async loadSettings() {
        try {
            this.settings = await window.electronAPI.getSettings();
            this.updateSettingsUI();
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    setupEventListeners() {
        // Window controls
        document.getElementById('minimizeBtn').addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.minimizeWindow) {
                window.electronAPI.minimizeWindow();
            } else {
                document.querySelector('.app-container').style.display = 'none';
            }
        });

        document.getElementById('closeBtn').addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.closeWindow) {
                window.electronAPI.closeWindow();
            } else {
                document.querySelector('.app-container').style.display = 'none';
            }
        });

        // Action buttons
        document.getElementById('screenshotBtn').addEventListener('click', () => {
            this.takeScreenshot();
        });

        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettings();
        });

        // Query input
        const queryInput = document.getElementById('queryInput');
        const askBtn = document.getElementById('askBtn');

        askBtn.addEventListener('click', () => {
            this.processQuery(queryInput.value.trim());
        });

        queryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.processQuery(queryInput.value.trim());
            }
        });

        // Clear button
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearResponse();
        });

        // Settings modal
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.hideSettings();
        });

        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettings();
        });

        // Settings sliders
        const opacitySlider = document.getElementById('opacitySlider');
        const intervalSlider = document.getElementById('screenshotInterval');

        opacitySlider.addEventListener('input', (e) => {
            document.getElementById('opacityValue').textContent = `${e.target.value}%`;
        });

        intervalSlider.addEventListener('input', (e) => {
            document.getElementById('intervalValue').textContent = `${e.target.value}s`;
        });

        // Close modal on background click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.hideSettings();
            }
        });
    }

    setupIPCListeners() {
        window.electronAPI.onTakeScreenshot(() => {
            this.takeScreenshot();
        });

        window.electronAPI.onOpenSettings(() => {
            this.showSettings();
        });
    }

    // ============================================
    // VOICE RECORDING SETUP
    // ============================================
    setupVoiceRecording() {
        const micBtn = document.getElementById('micBtn');
        
        if (!micBtn) {
            console.error('Microphone button not found');
            return;
        }

        micBtn.addEventListener('click', async () => {
            if (!this.isRecording) {
                await this.startRecording();
            } else {
                await this.stopRecording();
            }
        });
    }

    // Start recording audio
    async startRecording() {
        try {
            // Clear previous recording
            this.clearAudioRecording();
            
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            // Clear previous audio chunks
            this.audioChunks = [];
            
            // Collect audio data
            this.mediaRecorder.addEventListener('dataavailable', event => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            });
            
            // Handle recording stop
            this.mediaRecorder.addEventListener('stop', () => {
                // Stop all audio tracks
                stream.getTracks().forEach(track => track.stop());
                
                // Process the recorded audio
                this.processRecordedAudio();
            });
            
            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // Update UI
            const micBtn = document.getElementById('micBtn');
            const recordingStatus = document.getElementById('recordingStatus');
            
            micBtn.classList.add('recording');
            recordingStatus.style.display = 'block';
            this.updateStatus('🎤 Recording... Click mic again to stop', 'processing');
            
            console.log('Recording started');
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.updateStatus('❌ Microphone access denied', 'error');
            this.showResponse('Could not access microphone. Please allow microphone access and try again.');
        }
    }

    // Stop recording audio
    async stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Update UI
            const micBtn = document.getElementById('micBtn');
            const recordingStatus = document.getElementById('recordingStatus');
            
            micBtn.classList.remove('recording');
            recordingStatus.style.display = 'none';
            this.updateStatus('⏹️ Processing audio...', 'processing');
            
            console.log('Recording stopped');
        }
    }

    // Process recorded audio
    processRecordedAudio() {
        // Create audio blob from chunks
        this.currentAudioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        console.log('Audio recorded:', {
            size: this.currentAudioBlob.size,
            type: this.currentAudioBlob.type
        });
        
        if (this.currentAudioBlob.size === 0) {
            this.updateStatus('❌ No audio recorded', 'error');
            this.showResponse('No audio was recorded. Please try again and speak clearly.');
            return;
        }
        
        // Create audio URL for playback
        this.currentAudioUrl = URL.createObjectURL(this.currentAudioBlob);
        
        // Show success message with playback controls
        const sizeKB = (this.currentAudioBlob.size / 1024).toFixed(2);
        this.updateStatus(`✅ Audio recorded: ${sizeKB} KB`, 'ready');
        this.showAudioControls(sizeKB);
    }

    // Show audio playback controls (like WhatsApp)
    showAudioControls(sizeKB) {
        const responseContent = document.getElementById('responseContent');
        responseContent.innerHTML = `
            <div class="audio-controls-container">
                <div class="audio-info">
                    <span class="audio-icon">🎤</span>
                    <span class="audio-size">Audio recorded: ${sizeKB} KB</span>
                </div>
                <div class="audio-buttons">
                    <button class="audio-btn play-btn" id="playAudioBtn">
                        <span class="btn-icon">▶️</span>
                        <span class="btn-label">Play</span>
                    </button>
                    <button class="audio-btn send-btn" id="sendAudioBtn">
                        <span class="btn-icon">✅</span>
                        <span class="btn-label">Send to AI</span>
                    </button>
                    <button class="audio-btn delete-btn" id="deleteAudioBtn">
                        <span class="btn-icon">🗑️</span>
                        <span class="btn-label">Delete</span>
                    </button>
                </div>
                <div class="audio-message">
                    Click Play to listen, or Send to AI for speech-to-text conversion.
                </div>
            </div>
        `;

        // Add event listeners to the buttons
        document.getElementById('playAudioBtn').addEventListener('click', () => {
            this.playAudio();
        });

        document.getElementById('sendAudioBtn').addEventListener('click', () => {
            this.sendAudioToBackend();
        });

        document.getElementById('deleteAudioBtn').addEventListener('click', () => {
            this.clearAudioRecording();
            this.clearResponse();
        });
    }

    // Play recorded audio
    playAudio() {
        if (!this.currentAudioUrl) {
            this.updateStatus('❌ No audio to play', 'error');
            return;
        }

        // Stop previous playback if any
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer = null;
        }

        // Create new audio player
        this.audioPlayer = new Audio(this.currentAudioUrl);
        
        // Update button to show pause
        const playBtn = document.getElementById('playAudioBtn');
        playBtn.innerHTML = `
            <span class="btn-icon">⏸️</span>
            <span class="btn-label">Pause</span>
        `;
        playBtn.classList.add('playing');

        // Handle playback events
        this.audioPlayer.addEventListener('ended', () => {
            playBtn.innerHTML = `
                <span class="btn-icon">▶️</span>
                <span class="btn-label">Play</span>
            `;
            playBtn.classList.remove('playing');
            this.updateStatus('✅ Playback finished', 'ready');
        });

        this.audioPlayer.addEventListener('pause', () => {
            playBtn.innerHTML = `
                <span class="btn-icon">▶️</span>
                <span class="btn-label">Play</span>
            `;
            playBtn.classList.remove('playing');
        });

        // Play or pause
        if (this.audioPlayer.paused) {
            this.audioPlayer.play();
            this.updateStatus('🔊 Playing audio...', 'processing');
        } else {
            this.audioPlayer.pause();
            this.updateStatus('⏸️ Paused', 'ready');
        }

        // Update play button click handler to toggle play/pause
        playBtn.onclick = () => {
            if (this.audioPlayer.paused) {
                this.audioPlayer.play();
                this.updateStatus('🔊 Playing audio...', 'processing');
                playBtn.innerHTML = `
                    <span class="btn-icon">⏸️</span>
                    <span class="btn-label">Pause</span>
                `;
                playBtn.classList.add('playing');
            } else {
                this.audioPlayer.pause();
                this.updateStatus('⏸️ Paused', 'ready');
                playBtn.innerHTML = `
                    <span class="btn-icon">▶️</span>
                    <span class="btn-label">Play</span>
                `;
                playBtn.classList.remove('playing');
            }
        };
    }

    // Send audio to backend for speech-to-text conversion
    async sendAudioToBackend() {
        if (!this.currentAudioBlob) {
            this.updateStatus('❌ No audio to send', 'error');
            return;
        }

        this.updateStatus('📤 Converting speech to text...', 'processing');
        this.showResponse('🎤 Transcribing your audio...');

        try {
            // Create FormData to send audio file
            const formData = new FormData();
            formData.append('audio', this.currentAudioBlob, 'recording.webm');

            // Send to backend
            const response = await fetch('http://localhost:8080/transcribe', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.error) {
                this.updateStatus('❌ Transcription failed', 'error');
                this.showResponse(`Error: ${result.error}`);
                return;
            }

            // Get transcribed text
            const transcribedText = result.text || result.transcription;

            if (!transcribedText || transcribedText.trim() === '') {
                this.updateStatus('❌ No speech detected', 'error');
                this.showResponse('Could not detect any speech in the audio. Please try speaking more clearly.');
                return;
            }

            console.log('Transcription successful:', transcribedText);

            // Put transcribed text in input box
            const queryInput = document.getElementById('queryInput');
            queryInput.value = transcribedText;

            // Clear audio controls
            this.clearAudioRecording();

            // Show transcription in response
            this.showResponse(`✅ Transcribed: "${transcribedText}"\n\nProcessing your question...`);
            this.updateStatus('✅ Transcription complete', 'ready');

            // Automatically process the query
            setTimeout(() => {
                this.processQuery(transcribedText);
            }, 500);

        } catch (error) {
            console.error('Transcription error:', error);
            this.updateStatus('❌ Connection failed', 'error');
            this.showResponse('Failed to connect to backend. Make sure the Python server is running on port 5000.');
        }
    }

    // Clear audio recording
    clearAudioRecording() {
        // Stop playback if any
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer = null;
        }

        // Revoke audio URL to free memory
        if (this.currentAudioUrl) {
            URL.revokeObjectURL(this.currentAudioUrl);
            this.currentAudioUrl = null;
        }

        this.currentAudioBlob = null;
        this.audioChunks = [];
    }

    async processQuery(query) {
        if (!query || this.isProcessing) return;

        this.isProcessing = true;
        this.updateStatus('Processing...', 'processing');
        this.showResponse('Thinking...');

        try {
            const response = await window.electronAPI.processQuery(query);
            
            if (response.error) {
                this.showResponse(`Error: ${response.error}`);
                this.updateStatus('Error', 'error');
            } else {
                this.showResponse(response.response || response.message || 'No response received');
                this.updateStatus('Ready', 'ready');
            }
        } catch (error) {
            console.error('Query processing error:', error);
            this.showResponse('Failed to process your request. Please try again.');
            this.updateStatus('Error', 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    async takeScreenshot() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.updateStatus('Taking screenshot...', 'processing');

        try {
            const response = await window.electronAPI.takeScreenshot();
            
            if (response.error) {
                this.updateStatus('Screenshot failed', 'error');
                this.showResponse(`Screenshot failed: ${response.error}`);
            } else {
                this.updateStatus('Screenshot captured', 'ready');
                this.showResponse('Screenshot captured successfully!');
                
                // Auto-analyze if we have an AI key
                if (this.settings.openaiApiKey) {
                    setTimeout(() => {
                        this.processQuery('What game is this and what am I currently doing?');
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Screenshot error:', error);
            this.updateStatus('Screenshot failed', 'error');
            this.showResponse('Failed to take screenshot. Please try again.');
        } finally {
            this.isProcessing = false;
        }
    }

    showResponse(text) {
        const responseContent = document.getElementById('responseContent');
        responseContent.innerHTML = `<div class="response-text">${this.escapeHtml(text)}</div>`;
        responseContent.scrollTop = responseContent.scrollHeight;
    }

    clearResponse() {
        const responseContent = document.getElementById('responseContent');
        responseContent.innerHTML = '<div class="placeholder">Ready to help! Ask me anything about your game.</div>';
    }

    updateStatus(text, state = 'ready') {
        const statusText = document.getElementById('statusText');
        const statusIndicator = document.getElementById('statusIndicator');

        statusText.textContent = text;
        statusIndicator.className = `status-indicator ${state}`;
    }

    showSettings() {
        const modal = document.getElementById('settingsModal');
        modal.classList.add('show');
        this.updateSettingsUI();
    }

    hideSettings() {
        const modal = document.getElementById('settingsModal');
        modal.classList.remove('show');
    }

    updateSettingsUI() {
        // Update opacity
        const opacitySlider = document.getElementById('opacitySlider');
        const opacityValue = document.getElementById('opacityValue');
        const opacity = Math.round((this.settings.overlayOpacity || 0.9) * 100);
        opacitySlider.value = opacity;
        opacityValue.textContent = `${opacity}%`;

        // Update screenshot interval
        const intervalSlider = document.getElementById('screenshotInterval');
        const intervalValue = document.getElementById('intervalValue');
        const interval = (this.settings.screenshotInterval || 30000) / 1000;
        intervalSlider.value = interval;
        intervalValue.textContent = `${interval}s`;

        // Update always on top
        const alwaysOnTop = document.getElementById('alwaysOnTop');
        alwaysOnTop.checked = this.settings.alwaysOnTop !== false;
    }

    async saveSettings() {
        const opacitySlider = document.getElementById('opacitySlider');
        const intervalSlider = document.getElementById('screenshotInterval');
        const alwaysOnTop = document.getElementById('alwaysOnTop');

        const newSettings = {
            overlayOpacity: opacitySlider.value / 100,
            screenshotInterval: intervalSlider.value * 1000,
            alwaysOnTop: alwaysOnTop.checked
        };

        try {
            await window.electronAPI.updateSettings(newSettings);
            this.settings = { ...this.settings, ...newSettings };
            this.hideSettings();
            this.showResponse('Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showResponse('Failed to save settings. Please try again.');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GameAssistant();
});