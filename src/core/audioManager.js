export class AudioManager {
    constructor() {
        // Background music
        this.menuMusic = null;
        this.battlefieldMusic = null;
        
        // Sound effects pool for optimization
        this.soundPool = [];
        this.maxConcurrentSounds = 8; // Limit concurrent bullet sounds
        this.activeSounds = 0;
        
        // Rate limiting for bullet sounds
        this.lastBulletSoundTime = 0;
        this.bulletSoundMinInterval = 0.05; // 50ms minimum between sounds (20 sounds/sec max)
        
        // Volume settings
        this.musicVolume = 1.0;
        this.sfxVolume = 1.0;
        
        // Audio context (will be created on first user interaction)
        this.audioContext = null;
        this.initialized = false;
    }

    // Initialize audio context (must be called after user interaction)
    init() {
        if (this.initialized) return;
        
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Pre-create sound pool for bullet sounds
            this.createSoundPool();
            
            this.initialized = true;
            console.log('AudioManager initialized');
        } catch (error) {
            console.warn('AudioContext not supported:', error);
        }
    }

    // Create a pool of audio objects for bullet sounds
    createSoundPool() {
        // Create multiple audio elements for pooling
        for (let i = 0; i < this.maxConcurrentSounds; i++) {
            const audio = new Audio();
            audio.preload = 'auto';
            this.soundPool.push({
                audio: audio,
                inUse: false
            });
        }
    }

    // Load and play background music
    async loadMusic(type, url, loop = true, volume = 1.0) {
        if (!this.initialized) {
            this.init();
        }

        try {
            // Stop existing music of this type
            if (type === 'menu' && this.menuMusic) {
                this.menuMusic.pause();
                this.menuMusic = null;
            } else if (type === 'battlefield' && this.battlefieldMusic) {
                this.battlefieldMusic.pause();
                this.battlefieldMusic = null;
            }

            // Create new audio element
            const audio = new Audio(url);
            audio.loop = loop;
            audio.volume = volume * this.musicVolume;
            
            // Handle loading errors gracefully
            audio.addEventListener('error', (e) => {
                console.warn(`Failed to load music ${type}:`, e);
            });

            // Store reference
            if (type === 'menu') {
                this.menuMusic = audio;
            } else if (type === 'battlefield') {
                this.battlefieldMusic = audio;
            }

            // Play music
            try {
                await audio.play();
            } catch (error) {
                console.warn(`Could not play ${type} music:`, error);
                // Music will play when user interacts
            }

            return audio;
        } catch (error) {
            console.warn(`Error loading music ${type}:`, error);
            return null;
        }
    }

    // Play menu music
    async playMenuMusic(url) {
        return await this.loadMusic('menu', url, true, 1.0);
    }

    // Play battlefield music (low volume)
    async playBattlefieldMusic(url) {
        return await this.loadMusic('battlefield', url, true, 0.3); // 30% volume
    }

    // Stop music
    stopMusic(type) {
        if (type === 'menu' && this.menuMusic) {
            this.menuMusic.pause();
            this.menuMusic.currentTime = 0;
        } else if (type === 'battlefield' && this.battlefieldMusic) {
            this.battlefieldMusic.pause();
            this.battlefieldMusic.currentTime = 0;
        }
    }

    // Stop all music
    stopAllMusic() {
        this.stopMusic('menu');
        this.stopMusic('battlefield');
    }

    // Play sound effect with pooling and rate limiting
    playSound(url, volume = 1.0, rateLimit = false) {
        if (!this.initialized) {
            this.init();
        }

        // Rate limiting for bullet sounds
        if (rateLimit) {
            const now = Date.now() / 1000;
            if (now - this.lastBulletSoundTime < this.bulletSoundMinInterval) {
                return; // Skip this sound
            }
            this.lastBulletSoundTime = now;
        }

        // Find available sound from pool
        const availableSound = this.soundPool.find(sound => !sound.inUse);
        
        if (!availableSound) {
            // All sounds in use, skip this one
            return;
        }

        // Mark as in use
        availableSound.inUse = true;
        this.activeSounds++;

        // Set up audio
        const audio = availableSound.audio;
        audio.src = url;
        audio.volume = volume * this.sfxVolume;
        
        // Handle errors
        audio.onerror = () => {
            availableSound.inUse = false;
            this.activeSounds--;
        };

        // Handle end of playback
        const handleEnded = () => {
            availableSound.inUse = false;
            this.activeSounds--;
            audio.removeEventListener('ended', handleEnded);
        };
        audio.addEventListener('ended', handleEnded);

        // Play sound
        audio.play().catch(error => {
            console.warn('Could not play sound:', error);
            availableSound.inUse = false;
            this.activeSounds--;
        });
    }

    // Play bullet shoot sound (optimized)
    playBulletSound(url, volume = 0.5) {
        // Use rate limiting and lower volume for bullet sounds
        this.playSound(url, volume, true);
    }

    // Set music volume (0.0 to 1.0)
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        
        if (this.menuMusic) {
            this.menuMusic.volume = this.musicVolume;
        }
        if (this.battlefieldMusic) {
            // Battlefield music should be lower volume
            this.battlefieldMusic.volume = 0.3 * this.musicVolume;
        }
    }

    // Set sound effects volume (0.0 to 1.0)
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    // Cleanup
    dispose() {
        this.stopAllMusic();
        
        // Clean up sound pool
        this.soundPool.forEach(sound => {
            sound.audio.pause();
            sound.audio.src = '';
        });
        this.soundPool = [];
        
        this.initialized = false;
    }
}

