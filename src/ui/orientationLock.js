export class OrientationLock {
    constructor(overlayId = 'orientation-overlay') {
        this.overlay = document.getElementById(overlayId);
        this._onChange = () => this.updateOverlay();
    }

    init() {
        window.addEventListener('orientationchange', this._onChange);
        window.addEventListener('resize', this._onChange);
        this.updateOverlay();
        this.requestLock();
    }

    async requestLock() {
        if (!screen.orientation?.lock) return;

        try {
            await screen.orientation.lock('landscape');
        } catch (error) {
            console.debug('Orientation lock unavailable:', error.message);
        }
    }

    updateOverlay() {
        if (!this.overlay) return;

        const isPortrait = window.innerHeight > window.innerWidth;
        const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
            || window.matchMedia('(max-width: 900px)').matches;

        this.overlay.classList.toggle('hidden', !isPortrait || !isMobile);
    }

    dispose() {
        window.removeEventListener('orientationchange', this._onChange);
        window.removeEventListener('resize', this._onChange);

        try {
            screen.orientation?.unlock?.();
        } catch (error) {
            console.debug('Orientation unlock failed:', error.message);
        }

        if (this.overlay) {
            this.overlay.classList.add('hidden');
        }
    }
}
