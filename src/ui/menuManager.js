export class MenuManager {
    constructor() {
        this.currentScreen = 'main-menu';
        this.gameInstance = null;
        this.settings = {
            music: 100,
            game: 100,
            graphics: 50, // MED
            resolution: 80,
            realTimeShadows: false,
            bakeShadows: false,
            frameRate: 60,
            bloom: false,
            motionBlur: false,
            fisheyeLens: false,
            filmGrain: true,
            gyroLook: 0,
            gyroADS: 0,
            lookSensitivity: 50,
            adsSens: 25
        };
        this.selectedWeapons = {
            primary: 'MP40',
            secondary: 'Pistol'
        };
        this.playerName = 'player name...';
    }

    init() {
        this.setupEventListeners();
        this.showScreen('main-menu');
    }

    setupEventListeners() {
        // Main Menu
        document.getElementById('menu-play').addEventListener('click', () => {
            this.showScreen('play-mode');
        });
        document.getElementById('menu-customize').addEventListener('click', () => {
            this.showScreen('customize');
        });
        document.getElementById('menu-settings').addEventListener('click', () => {
            this.showScreen('settings');
        });
        document.getElementById('menu-about').addEventListener('click', () => {
            this.showScreen('about');
        });
        document.getElementById('menu-quit').addEventListener('click', () => {
            if (confirm('Bạn có muốn thoát game?')) {
                window.close();
            }
        });

        // Back buttons
        document.querySelectorAll('.btn-back').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleBack();
            });
        });

        // Play Mode Selection
        document.getElementById('play-mode-map-editor').addEventListener('click', () => {
            // TODO: Implement map editor
            alert('Map Editor chưa được triển khai');
        });
        document.getElementById('play-mode-join-match').addEventListener('click', () => {
            // TODO: Implement join match
            alert('Join Match chưa được triển khai');
        });
        document.getElementById('play-mode-online-match').addEventListener('click', () => {
            // TODO: Implement online match
            alert('Online Match chưa được triển khai');
        });
        document.getElementById('play-mode-create-match').addEventListener('click', () => {
            this.showScreen('battlefield-deploy');
        });

        // Battlefield Deploy
        document.getElementById('btn-deploy').addEventListener('click', () => {
            this.startGame();
        });

        // Customize screen
        this.setupCustomizeListeners();

        // Settings screen
        this.setupSettingsListeners();
    }

    setupCustomizeListeners() {
        // Primary weapon selection
        const primaryWeapons = document.querySelectorAll('.weapon-option-primary');
        primaryWeapons.forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.weapon-option-primary').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                this.selectedWeapons.primary = option.dataset.weapon;
            });
        });

        // Secondary weapon selection
        const secondaryWeapons = document.querySelectorAll('.weapon-option-secondary');
        secondaryWeapons.forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.weapon-option-secondary').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                this.selectedWeapons.secondary = option.dataset.weapon;
            });
        });

        // Player name input
        const playerNameInput = document.getElementById('player-name-input');
        if (playerNameInput) {
            playerNameInput.addEventListener('input', (e) => {
                this.playerName = e.target.value || 'player name...';
            });
            playerNameInput.value = this.playerName;
        }
    }

    setupSettingsListeners() {
        // Sliders
        const sliders = document.querySelectorAll('.settings-slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const setting = e.target.dataset.setting;
                const value = parseInt(e.target.value);
                this.settings[setting] = value;
                this.updateSettingDisplay(setting, value);
            });
        });

        // Checkboxes
        const checkboxes = document.querySelectorAll('.settings-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const setting = e.target.dataset.setting;
                this.settings[setting] = e.target.checked;
            });
        });

        // Initialize settings values
        this.loadSettings();
    }

    loadSettings() {
        // Set slider values
        Object.keys(this.settings).forEach(key => {
            const slider = document.querySelector(`[data-setting="${key}"]`);
            if (slider && slider.type === 'range') {
                slider.value = this.settings[key];
                this.updateSettingDisplay(key, this.settings[key]);
            }
            const checkbox = document.querySelector(`[data-setting="${key}"]`);
            if (checkbox && checkbox.type === 'checkbox') {
                checkbox.checked = this.settings[key];
            }
        });
    }

    updateSettingDisplay(setting, value) {
        const display = document.querySelector(`[data-display="${setting}"]`);
        if (display) {
            if (setting === 'graphics') {
                const levels = ['LOW', 'MED', 'HIGH'];
                const index = Math.floor((value / 100) * levels.length);
                display.textContent = levels[Math.min(index, levels.length - 1)];
            } else if (setting === 'frameRate') {
                display.textContent = `${value} FPS`;
            } else {
                display.textContent = `${value}%`;
            }
        }
    }

    handleBack() {
        const backMap = {
            'play-mode': 'main-menu',
            'customize': 'main-menu',
            'settings': 'main-menu',
            'about': 'main-menu',
            'battlefield-deploy': 'play-mode'
        };
        const previousScreen = backMap[this.currentScreen];
        if (previousScreen) {
            this.showScreen(previousScreen);
        }
    }

    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.menu-screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show selected screen
        const screen = document.getElementById(`screen-${screenName}`);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenName;
        }

        // Hide game container when in menu
        const gameContainer = document.getElementById('game-container');
        const hud = document.getElementById('hud');
        if (screenName === 'game') {
            if (gameContainer) gameContainer.style.display = 'block';
            if (hud) hud.style.display = 'block';
        } else {
            if (gameContainer) gameContainer.style.display = 'none';
            if (hud) hud.style.display = 'none';
        }
    }

    async startGame() {
        this.showScreen('game');
        
        // Import and start game
        if (!this.gameInstance) {
            const { Game } = await import('../core/game.js');
            this.gameInstance = new Game();
            await this.gameInstance.init();
        }
    }

    getSettings() {
        return this.settings;
    }

    getSelectedWeapons() {
        return this.selectedWeapons;
    }

    getPlayerName() {
        return this.playerName;
    }
}

