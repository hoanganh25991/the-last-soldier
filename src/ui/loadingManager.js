export class LoadingManager {
    constructor() {
        this.progress = 0;
        this.totalSteps = 0;
        this.completedSteps = 0;
        this.loadingScreen = null;
        this.progressBar = null;
        this.loadingText = null;
    }

    show() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressBar = document.getElementById('loading-progress');
        this.loadingText = document.getElementById('loading-text');
        
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('hidden');
            this.loadingScreen.style.display = 'flex';
        }
        
        this.progress = 0;
        this.completedSteps = 0;
        this.updateProgress(0, 'Initializing...');
    }

    hide() {
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
            await promise;
            this.completeStep(stepText);
            return true;
        } catch (error) {
            console.error('Loading error:', error);
            this.completeStep(stepText);
            return false;
        }
    }
}

