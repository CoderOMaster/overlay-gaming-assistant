class GameAssistant {
    constructor() {
        this.isProcessing = false;
        this.settings = {};
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.setupIPCListeners();
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
            window.electronAPI.minimizeWindow();
        });

        document.getElementById('closeBtn').addEventListener('click', () => {
            window.electronAPI.closeWindow();
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
