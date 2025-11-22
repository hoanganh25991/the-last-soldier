import { MenuManager } from './ui/menuManager.js';

// Initialize menu system when page loads
window.addEventListener('DOMContentLoaded', async () => {
    // Initialize menu manager
    const menuManager = new MenuManager();
    menuManager.init();
    
    // Make menuManager accessible globally for game start
    window.menuManager = menuManager;
    
    // Hide initial loading screen after menu is ready
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }, 500);
});

