import { MainMenuBackground } from './mainMenuBackground.js';
import { BattlefieldDeployBackground } from './battlefieldDeployBackground.js';
import { PlayModeBackground } from './playModeBackground.js';
import { AudioManager } from '../core/audioManager.js';

export class MenuManager {
    constructor() {
        this.currentScreen = 'main-menu';
        this.gameInstance = null;
        this.mainMenuBackground = null;
        this.battlefieldDeployBackground = null;
        this.playModeBackgrounds = {};
        this.audioManager = new AudioManager();
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
            secondary: 'Pistol',
            gadget: null
        };
        this.playerName = 'player name...';
    }

    init() {
        this.setupEventListeners();
        this.initializeWeaponSelection();
        this.initMainMenuBackground();
        this.showScreen('main-menu');
        
        // Initialize audio manager (will be activated on first user interaction)
        this.audioManager.init();
    }

    initBattlefieldDeployBackground() {
        const canvas = document.getElementById('battlefield-canvas');
        if (canvas) {
            // Wait a bit for canvas to be properly sized and screen to be visible
            setTimeout(async () => {
                // Dispose existing instance if any
                if (this.battlefieldDeployBackground) {
                    this.battlefieldDeployBackground.dispose();
                    this.battlefieldDeployBackground = null;
                }
                
                // Create new instance
                this.battlefieldDeployBackground = new BattlefieldDeployBackground(canvas);
                await this.battlefieldDeployBackground.init();
                this.battlefieldDeployBackground.start();
            }, 150);
        }
    }

    initMainMenuBackground() {
        const container = document.getElementById('main-menu-background');
        if (container) {
            // Wait a bit for container to be properly sized
            setTimeout(() => {
                this.mainMenuBackground = new MainMenuBackground(container);
                this.mainMenuBackground.init();
                this.mainMenuBackground.start();
            }, 100);
        }
    }

    initPlayModeBackgrounds() {
        const modes = [
            { id: 'preview-map-editor', mode: 'map-editor' },
            { id: 'preview-join-match', mode: 'join-match' },
            { id: 'preview-online-match', mode: 'online-match' },
            { id: 'preview-create-match', mode: 'create-match' }
        ];

        modes.forEach(({ id, mode }) => {
            const container = document.getElementById(id);
            if (container) {
                // If already initialized, just start it
                if (this.playModeBackgrounds[mode]) {
                    this.playModeBackgrounds[mode].start();
                    return;
                }
                
                // Wait a bit for container to be properly sized and visible
                setTimeout(() => {
                    const background = new PlayModeBackground(container, mode);
                    background.init();
                    background.start();
                    this.playModeBackgrounds[mode] = background;
                }, 150);
            }
        });
    }

    initializeWeaponSelection() {
        // Set initial selected weapon based on HTML
        const selectedPrimary = document.querySelector('.weapon-option-primary.selected');
        if (selectedPrimary) {
            this.selectedWeapons.primary = selectedPrimary.dataset.weapon || 'MP40';
        }
    }

    setupEventListeners() {
        // Main Menu
        document.getElementById('menu-play').addEventListener('click', () => {
            // Start menu music when Play is clicked
            this.startMenuMusic();
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
        // Section header click to toggle options
        const weaponSections = document.querySelectorAll('.weapon-section');
        weaponSections.forEach(section => {
            const header = section.querySelector('.weapon-section-header');
            const weaponList = section.querySelector('.weapon-list');
            const displayLarge = section.querySelector('.weapon-display-large');
            
            if (header && weaponList) {
                // Make the entire section header area clickable
                const toggleList = (e) => {
                    e.stopPropagation();
                    // Toggle display
                    const isVisible = weaponList.style.display !== 'none';
                    weaponList.style.display = isVisible ? 'none' : 'block';
                };
                
                header.addEventListener('click', toggleList);
                if (displayLarge) {
                    displayLarge.addEventListener('click', toggleList);
                }
            }
        });

        // Primary weapon selection
        const primaryWeapons = document.querySelectorAll('.weapon-option-primary');
        primaryWeapons.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.weapon-option-primary').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                this.selectedWeapons.primary = option.dataset.weapon;
                this.updateDetailView('primary', option.dataset.weapon);
                this.updateWeaponDisplay('primary', option.dataset.weapon);
            });
        });

        // Secondary weapon selection
        const secondaryWeapons = document.querySelectorAll('.weapon-option-secondary');
        secondaryWeapons.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.weapon-option-secondary').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                this.selectedWeapons.secondary = option.dataset.weapon;
                this.updateDetailView('secondary', option.dataset.weapon);
                this.updateWeaponDisplay('secondary', option.dataset.weapon);
            });
        });

        // Gadget selection
        const gadgets = document.querySelectorAll('.weapon-option-gadget');
        gadgets.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.weapon-option-gadget').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                this.selectedWeapons.gadget = option.dataset.gadget;
                this.updateDetailView('gadget', option.dataset.gadget);
                this.updateWeaponDisplay('gadget', option.dataset.gadget);
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

        // Initialize detail view with default primary weapon
        this.updateDetailView('primary', this.selectedWeapons.primary);
        this.updateWeaponDisplay('primary', this.selectedWeapons.primary);
        this.updateWeaponDisplay('secondary', this.selectedWeapons.secondary);
    }

    updateWeaponDisplay(type, itemName) {
        const weaponIcons = {
            'MP40': '🔫',
            'Sten': '🔫',
            'Pistol': '🔫',
            'Luger': '🔫',
            'Grenade': '💣',
            'Medkit': '🏥',
            'Binoculars': '🔭'
        };

        if (type === 'primary') {
            const display = document.getElementById('primary-display');
            if (display) {
                display.textContent = weaponIcons[itemName] || '';
                display.style.display = 'flex';
                display.style.alignItems = 'center';
                display.style.justifyContent = 'center';
                display.style.fontSize = '60px';
            }
        } else if (type === 'secondary') {
            const display = document.getElementById('secondary-display');
            if (display) {
                display.textContent = weaponIcons[itemName] || '';
                display.style.display = 'flex';
                display.style.alignItems = 'center';
                display.style.justifyContent = 'center';
                display.style.fontSize = '60px';
            }
        } else if (type === 'gadget') {
            const display = document.getElementById('gadget-display');
            if (display) {
                display.textContent = weaponIcons[itemName] || '🚫';
                display.classList.remove('empty');
                display.style.display = 'flex';
                display.style.alignItems = 'center';
                display.style.justifyContent = 'center';
                display.style.fontSize = '60px';
            }
        }
    }

    updateDetailView(type, itemName) {
        const detailView = document.getElementById('item-detail-view');
        if (!detailView) return;

        // Weapon stats data
        const weaponStats = {
            'MP40': {
                name: 'MP40',
                icon: '🔫',
                stats: {
                    'Damage': '30',
                    'Fire Rate': '600 RPM',
                    'Range': '200m',
                    'Ammo': '32/288',
                    'Reload': '2.5s',
                    'Spread': 'Low'
                }
            },
            'Sten': {
                name: 'Sten',
                icon: '🔫',
                stats: {
                    'Damage': '28',
                    'Fire Rate': '550 RPM',
                    'Range': '180m',
                    'Ammo': '32/256',
                    'Reload': '2.8s',
                    'Spread': 'Medium'
                }
            },
            'Pistol': {
                name: 'Pistol',
                icon: '🔫',
                stats: {
                    'Damage': '20',
                    'Fire Rate': '300 RPM',
                    'Range': '100m',
                    'Ammo': '12/60',
                    'Reload': '1.5s',
                    'Spread': 'Low'
                }
            },
            'Luger': {
                name: 'Luger',
                icon: '🔫',
                stats: {
                    'Damage': '25',
                    'Fire Rate': '350 RPM',
                    'Range': '120m',
                    'Ammo': '8/48',
                    'Reload': '1.8s',
                    'Spread': 'Low'
                }
            },
            'Grenade': {
                name: 'Grenade',
                icon: '💣',
                stats: {
                    'Damage': '100',
                    'Blast Radius': '5m',
                    'Fuse Time': '4s',
                    'Throw Range': '30m',
                    'Cooldown': '30s',
                    'Type': 'Explosive'
                }
            },
            'Medkit': {
                name: 'Medkit',
                icon: '🏥',
                stats: {
                    'Heal Amount': '50 HP',
                    'Use Time': '3s',
                    'Cooldown': '60s',
                    'Range': 'Self',
                    'Type': 'Support',
                    'Capacity': '1'
                }
            },
            'Binoculars': {
                name: 'Binoculars',
                icon: '🔭',
                stats: {
                    'Zoom': '4x',
                    'Range': '500m',
                    'Use Time': 'Instant',
                    'Cooldown': 'None',
                    'Type': 'Utility',
                    'Durability': 'Unlimited'
                }
            }
        };

        const itemData = weaponStats[itemName];
        if (!itemData) return;

        const statsHtml = Object.entries(itemData.stats).map(([label, value]) => `
            <div class="item-detail-stat">
                <div class="item-detail-stat-label">${label}</div>
                <div class="item-detail-stat-value">${value}</div>
            </div>
        `).join('');

        detailView.innerHTML = `
            <div class="item-detail-content">
                <div class="item-detail-name">${itemData.name}</div>
                <div class="item-detail-image">${itemData.icon}</div>
                <div class="item-detail-stats">
                    ${statsHtml}
                </div>
            </div>
        `;
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
                
                // Update audio volumes
                if (setting === 'music') {
                    this.audioManager.setMusicVolume(value / 100);
                } else if (setting === 'game') {
                    this.audioManager.setSfxVolume(value / 100);
                }
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
        
        // Apply initial audio settings
        if (this.audioManager) {
            this.audioManager.setMusicVolume(this.settings.music / 100);
            this.audioManager.setSfxVolume(this.settings.game / 100);
        }
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
        
        // Apply audio settings after loading
        if (this.audioManager) {
            this.audioManager.setMusicVolume(this.settings.music / 100);
            this.audioManager.setSfxVolume(this.settings.game / 100);
        }
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
        // Stop game if leaving game screen
        if (this.currentScreen === 'game' && screenName !== 'game') {
            this.stopGame();
        }

        // Update current screen
        this.currentScreen = screenName;

        // Hide all menu screens
        document.querySelectorAll('.menu-screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show selected menu screen (if not game)
        if (screenName !== 'game') {
            const screen = document.getElementById(`screen-${screenName}`);
            if (screen) {
                screen.classList.add('active');
            }
        }

        // Start/stop main menu background animation
        if (screenName === 'main-menu' && this.mainMenuBackground) {
            this.mainMenuBackground.start();
        } else if (this.mainMenuBackground) {
            this.mainMenuBackground.stop();
        }

        // Start/stop play mode backgrounds
        if (screenName === 'play-mode') {
            this.initPlayModeBackgrounds();
        } else {
            Object.values(this.playModeBackgrounds).forEach(bg => {
                if (bg) bg.stop();
            });
        }

        // Start/stop battlefield deploy background
        if (screenName === 'battlefield-deploy') {
            this.initBattlefieldDeployBackground();
        } else if (this.battlefieldDeployBackground) {
            this.battlefieldDeployBackground.stop();
        }

        // Initialize customize screen detail view
        if (screenName === 'customize') {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                this.updateDetailView('primary', this.selectedWeapons.primary);
            }, 100);
        }

        // Show/hide game container and HUD
        const gameContainer = document.getElementById('game-container');
        const hud = document.getElementById('hud');
        if (screenName === 'game') {
            if (gameContainer) {
                gameContainer.style.display = 'block';
                gameContainer.classList.add('game-active');
            }
            if (hud) {
                hud.style.display = 'block';
                hud.classList.add('game-active');
            }
        } else {
            if (gameContainer) {
                gameContainer.style.display = 'none';
                gameContainer.classList.remove('game-active');
            }
            if (hud) {
                hud.style.display = 'none';
                hud.classList.remove('game-active');
            }
        }
    }

    async startGame() {
        // Stop menu music and start battlefield music
        this.audioManager.stopMusic('menu');
        this.startBattlefieldMusic();
        
        this.showScreen('game');
        
        // Import and start game
        if (!this.gameInstance) {
            const { Game } = await import('../core/game.js');
            this.gameInstance = new Game(this.audioManager);
            await this.gameInstance.init();
        } else {
            // Resume game if it already exists
            this.gameInstance.start();
        }
        
        // Auto-capture mouse (pointer lock) when game starts
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            // Small delay to ensure game container is visible
            setTimeout(() => {
                if (!document.pointerLockElement) {
                    gameContainer.requestPointerLock().catch((err) => {
                        console.debug('Pointer lock not available:', err.message);
                    });
                }
            }, 100);
        }
    }

    stopGame() {
        if (this.gameInstance) {
            this.gameInstance.stop();
        }
        // Stop battlefield music when leaving game
        this.audioManager.stopMusic('battlefield');
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

    startMenuMusic() {
        // Use a placeholder URL - user should replace with actual music file
        // For now, we'll use a data URL or placeholder
        // In production, replace with actual music file path
        const menuMusicUrl = 'sounds/menu-music.mp3'; // Placeholder - user should add actual file
        this.audioManager.playMenuMusic(menuMusicUrl).catch(() => {
            // Silently fail if music file doesn't exist
            console.debug('Menu music file not found, skipping...');
        });
    }

    startBattlefieldMusic() {
        // Use a placeholder URL - user should replace with actual music file
        const battlefieldMusicUrl = 'sounds/battlefield-music.mp3'; // Placeholder - user should add actual file
        this.audioManager.playBattlefieldMusic(battlefieldMusicUrl).catch(() => {
            // Silently fail if music file doesn't exist
            console.debug('Battlefield music file not found, skipping...');
        });
    }

    getAudioManager() {
        return this.audioManager;
    }
}

