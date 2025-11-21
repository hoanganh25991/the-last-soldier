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
        // Define available options for each category
        // Primary = long gun (rifle), Secondary = short gun (pistol)
        const categoryOptions = {
            primary: [
                { name: 'MP40', icon: '🔫' },  // Long gun
                { name: 'Sten', icon: '🔫' }   // Long gun
            ],
            secondary: [
                { name: 'Pistol', icon: '🔫' }, // Short gun
                { name: 'Luger', icon: '🔫' }   // Short gun
            ],
            gadget: [
                { name: 'Grenade', icon: '💣' },
                { name: 'Medkit', icon: '🏥' },
                { name: 'Binoculars', icon: '🔭' }
            ]
        };

        // Section click to show options in right panel
        const weaponSections = document.querySelectorAll('.weapon-section');
        weaponSections.forEach(section => {
            const sectionType = section.dataset.section;
            
            section.addEventListener('click', () => {
                // Remove active class from all sections
                document.querySelectorAll('.weapon-section').forEach(s => {
                    s.classList.remove('active');
                });
                // Add active class to clicked section
                section.classList.add('active');
                
                // Show options in right panel
                this.showCategoryOptions(sectionType, categoryOptions[sectionType]);
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

        // Initialize with primary section active
        const primarySection = document.querySelector('.weapon-section[data-section="primary"]');
        if (primarySection) {
            primarySection.click();
        }
    }

    showCategoryOptions(categoryType, options) {
        const detailView = document.getElementById('item-detail-view');
        if (!detailView) return;

        // Get current selection for this category
        const currentSelection = this.selectedWeapons[categoryType] || options[0].name;
        
        // Create options list HTML
        const optionsHtml = options.map(option => {
            const isSelected = option.name === currentSelection;
            const optionClass = `weapon-option-${categoryType}`;
            return `
                <div class="${optionClass} ${isSelected ? 'selected' : ''}" 
                     data-${categoryType}="${option.name}">
                    <div class="weapon-silhouette-small">${option.icon}</div>
                    <span>${option.name}</span>
                </div>
            `;
        }).join('');

        // Show options list
        detailView.innerHTML = `
            <div class="item-detail-content">
                <div class="weapon-list" id="category-options-list">
                    ${optionsHtml}
                </div>
            </div>
        `;
        
        // Update stats for currently selected item
        this.updateDetailView(categoryType, currentSelection);

        // Add click listeners to options
        const optionElements = detailView.querySelectorAll(`[data-${categoryType}]`);
        optionElements.forEach(element => {
            element.addEventListener('click', () => {
                const itemName = element.dataset[categoryType];
                this.selectItem(categoryType, itemName, options);
            });
        });
    }

    selectItem(categoryType, itemName, options) {
        // Update selection
        this.selectedWeapons[categoryType] = itemName;
        
        // Update selected state in UI
        const optionElements = document.querySelectorAll(`[data-${categoryType}]`);
        optionElements.forEach(element => {
            element.classList.remove('selected');
            if (element.dataset[categoryType] === itemName) {
                element.classList.add('selected');
            }
        });

        // Update weapon display on left
        this.updateWeaponDisplay(categoryType, itemName);
        
        // Update detail stats
        this.updateDetailView(categoryType, itemName);
    }

    updateWeaponDisplay(type, itemName) {
        // Primary = long gun (rifle), Secondary = short gun (pistol)
        const weaponIcons = {
            'MP40': '🔫',      // Long gun
            'Sten': '🔫',      // Long gun
            'Pistol': '🔫',    // Short gun
            'Luger': '🔫',    // Short gun
            'Grenade': '💣',
            'Medkit': '🏥',
            'Binoculars': '🔭'
        };

        if (type === 'primary') {
            const display = document.getElementById('primary-display');
            if (display) {
                display.textContent = weaponIcons[itemName] || '🔫';
                display.classList.remove('empty');
            }
        } else if (type === 'secondary') {
            const display = document.getElementById('secondary-display');
            if (display) {
                display.textContent = weaponIcons[itemName] || '🔫';
                display.classList.remove('empty');
            }
        } else if (type === 'gadget') {
            const display = document.getElementById('gadget-display');
            if (display) {
                display.textContent = weaponIcons[itemName] || '🚫';
                if (itemName) {
                    display.classList.remove('empty');
                } else {
                    display.classList.add('empty');
                }
            }
        }
    }

    updateDetailView(type, itemName) {
        const detailView = document.getElementById('item-detail-view');
        if (!detailView) return;

        // Weapon stats data
        // Primary = long gun (rifle), Secondary = short gun (pistol)
        const weaponStats = {
            'MP40': {
                name: 'MP40',
                icon: '🔫', // Long gun
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
                icon: '🔫', // Long gun
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
                icon: '🔫', // Short gun
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
                icon: '🔫', // Short gun
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

        // Check if options list exists, if not create it
        let optionsList = detailView.querySelector('.weapon-list');
        let detailContent = detailView.querySelector('.item-detail-content');
        
        if (!detailContent) {
            // If no content exists, create basic structure
            detailContent = document.createElement('div');
            detailContent.className = 'item-detail-content';
            detailView.appendChild(detailContent);
        }

        // Remove existing stats section if any
        const existingStats = detailContent.querySelector('.item-detail-stats-section');
        if (existingStats) {
            existingStats.remove();
        }

        // Create stats HTML
        const statsHtml = Object.entries(itemData.stats).map(([label, value]) => `
            <div class="item-detail-stat">
                <div class="item-detail-stat-label">${label}</div>
                <div class="item-detail-stat-value">${value}</div>
            </div>
        `).join('');

        // Append stats section below options list
        const statsSection = document.createElement('div');
        statsSection.className = 'item-detail-stats-section';
        statsSection.innerHTML = `
            <div class="item-detail-name">${itemData.name}</div>
            <div class="item-detail-image">${itemData.icon}</div>
            <div class="item-detail-stats">
                ${statsHtml}
            </div>
        `;
        detailContent.appendChild(statsSection);
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
                const primarySection = document.querySelector('.weapon-section[data-section="primary"]');
                if (primarySection) {
                    primarySection.click();
                }
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
        // Try to load music file, will fallback to generated sound if not found
        const menuMusicUrl = 'sounds/menu-music.mp3';
        this.audioManager.playMenuMusic(menuMusicUrl).catch(() => {
            // Fallback handled in AudioManager, this is just for safety
        });
    }

    startBattlefieldMusic() {
        // Try to load music file, will fallback to generated sound if not found
        const battlefieldMusicUrl = 'sounds/battlefield-music.mp3';
        this.audioManager.playBattlefieldMusic(battlefieldMusicUrl).catch(() => {
            // Fallback handled in AudioManager, this is just for safety
        });
    }

    getAudioManager() {
        return this.audioManager;
    }
}

