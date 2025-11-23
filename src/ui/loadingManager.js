export class LoadingManager {
    constructor() {
        this.progress = 0;
        this.totalSteps = 0;
        this.completedSteps = 0;
        this.loadingScreen = null;
        this.progressBar = null;
        this.loadingText = null;
        this.resourceProgress = {
            html: false,
            css: false,
            js: false
        };
    }

    init() {
        // Initialize immediately - loading screen should already be visible
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressBar = document.getElementById('loading-progress');
        this.loadingText = document.getElementById('loading-text');
        
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('hidden');
            this.loadingScreen.style.display = 'flex';
        }
        
        // Track HTML load
        this.resourceProgress.html = true;
        this.updateProgress(10, 'Loading HTML...');
        
        // Track CSS load
        this.trackCSSLoad();
        
        // Track JS module load
        this.trackJSLoad();
    }

    trackCSSLoad() {
        // Check if stylesheet is loaded
        const checkCSS = () => {
            const sheets = document.styleSheets;
            let loaded = false;
            try {
                for (let i = 0; i < sheets.length; i++) {
                    if (sheets[i].href && sheets[i].href.includes('style.css')) {
                        loaded = true;
                        break;
                    }
                }
            } catch (e) {
                // Cross-origin stylesheet, assume loaded if we can access it
                loaded = sheets.length > 0;
            }
            
            if (loaded || document.readyState === 'complete') {
                this.resourceProgress.css = true;
                this.updateProgress(30, 'Loading CSS...');
            } else {
                setTimeout(checkCSS, 50);
            }
        };
        
        // Start checking after a short delay
        setTimeout(checkCSS, 100);
    }

    trackJSLoad() {
        // Track when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.resourceProgress.js = true;
                this.updateProgress(50, 'Loading JavaScript modules...');
            });
        } else {
            this.resourceProgress.js = true;
            this.updateProgress(50, 'Loading JavaScript modules...');
        }
    }

    show() {
        // Ensure loading screen is visible
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('hidden');
            this.loadingScreen.style.display = 'flex';
        }
        
        this.progress = 0;
        this.completedSteps = 0;
        this.updateProgress(0, 'Initializing...');
    }

    hide() {
        // Mark body as loaded to show content
        document.body.classList.add('loaded');
        
        if (this.loadingScreen) {
            // Small delay before hiding for smooth transition
            setTimeout(() => {
                this.loadingScreen.classList.add('hidden');
            }, 300);
        }
    }

    updateProgress(percentage, text = null) {
        this.progress = Math.min(100, Math.max(0, percentage));
        
        if (this.progressBar) {
            this.progressBar.style.width = `${this.progress}%`;
        }
        
        if (text && this.loadingText) {
            this.loadingText.textContent = text;
        }
    }

    setTotalSteps(steps) {
        this.totalSteps = steps;
        this.completedSteps = 0;
    }

    completeStep(stepText = null) {
        this.completedSteps++;
        const percentage = (this.completedSteps / this.totalSteps) * 100;
        this.updateProgress(percentage, stepText || `Loading... ${this.completedSteps}/${this.totalSteps}`);
    }

    async loadWithProgress(promise, stepText) {
        try {
            const result = await promise;
            this.completeStep(stepText);
            return result;
        } catch (error) {
            console.error('Loading error:', error);
            this.completeStep(stepText);
            throw error;
        }
    }
}

