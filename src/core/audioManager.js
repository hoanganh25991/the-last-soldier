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
        
        // Generated audio buffers cache
        this.generatedSounds = {};
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

    // Generate a simple tone using Web Audio API
    generateTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.audioContext) return null;
        
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = Math.floor(sampleRate * duration);
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            let value = 0;
            
            if (type === 'sine') {
                value = Math.sin(2 * Math.PI * frequency * t);
            } else if (type === 'square') {
                value = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
            } else if (type === 'sawtooth') {
                value = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
            }
            
            // Apply envelope (fade out)
            const envelope = 1 - (i / numSamples);
            data[i] = value * volume * envelope;
        }
        
        return buffer;
    }

    // Generate bullet shoot sound (short, punchy)
    generateBulletSound() {
        if (!this.audioContext) return null;
        
        const duration = 0.1; // 100ms
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = Math.floor(sampleRate * duration);
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Create a short "pop" sound with noise
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            // Mix of high frequency tone and noise
            const tone = Math.sin(2 * Math.PI * 800 * t) * 0.3;
            const noise = (Math.random() * 2 - 1) * 0.2;
            const envelope = Math.exp(-t * 50); // Quick decay
            data[i] = (tone + noise) * envelope * 0.4;
        }
        
        return buffer;
    }

    // Generate ambient background music
    generateBackgroundMusic(type = 'menu') {
        if (!this.audioContext) return null;
        
        // Create a longer buffer for looping
        const duration = 4.0; // 4 seconds loop
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = Math.floor(sampleRate * duration);
        const buffer = this.audioContext.createBuffer(2, numSamples, sampleRate); // Stereo
        
        const leftData = buffer.getChannelData(0);
        const rightData = buffer.getChannelData(1);
        
        // Generate ambient pad sound
        const baseFreq = type === 'menu' ? 220 : 180; // Lower for battlefield
        
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            
            // Multiple harmonics for rich sound
            let left = 0;
            let right = 0;
            
            // Fundamental
            left += Math.sin(2 * Math.PI * baseFreq * t) * 0.15;
            right += Math.sin(2 * Math.PI * baseFreq * t) * 0.15;
            
            // Harmonics
            left += Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.1;
            right += Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.1;
            
            left += Math.sin(2 * Math.PI * baseFreq * 3 * t) * 0.05;
            right += Math.sin(2 * Math.PI * baseFreq * 3 * t) * 0.05;
            
            // Slight stereo panning
            const pan = Math.sin(t * 0.5) * 0.3;
            leftData[i] = left * (1 - pan) * 0.3;
            rightData[i] = right * (1 + pan) * 0.3;
        }
        
        return buffer;
    }

    // Play generated audio buffer
    playGeneratedSound(buffer, loop = false, volume = 1.0) {
        if (!this.audioContext || !buffer) return null;
        
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = buffer;
        source.loop = loop;
        gainNode.gain.value = volume;
        
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        source.start(0);
        return { source, gainNode };
    }

    // Try to load audio file, fallback to generated sound
    async loadAudioWithFallback(url, fallbackGenerator, type = 'sfx') {
        try {
            const audio = new Audio(url);
            
            // Try to load the file
            await new Promise((resolve, reject) => {
                audio.addEventListener('canplaythrough', resolve, { once: true });
                audio.addEventListener('error', reject, { once: true });
                audio.load();
                
                // Timeout after 2 seconds
                setTimeout(() => reject(new Error('Timeout')), 2000);
            });
            
            return { audio, isGenerated: false };
        } catch (error) {
            // File not found or failed to load, use generated sound
            console.debug(`Audio file not found: ${url}, using generated sound`);
            
            if (type === 'music') {
                const buffer = fallbackGenerator();
                if (buffer) {
                    // Volume will be set in loadMusic
                    const soundObj = this.playGeneratedSound(buffer, true, 1.0);
                    return { audio: soundObj, isGenerated: true, buffer };
                }
            } else {
                // For SFX, we'll generate on-demand
                return { audio: null, isGenerated: true, generator: fallbackGenerator };
            }
            
            return null;
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
                if (this.menuMusic.source) {
                    this.menuMusic.source.stop();
                } else {
                    this.menuMusic.pause();
                }
                this.menuMusic = null;
            } else if (type === 'battlefield' && this.battlefieldMusic) {
                if (this.battlefieldMusic.source) {
                    this.battlefieldMusic.source.stop();
                } else {
                    this.battlefieldMusic.pause();
                }
                this.battlefieldMusic = null;
            }

            // Try to load file, fallback to generated
            const result = await this.loadAudioWithFallback(
                url,
                () => this.generateBackgroundMusic(type),
                'music'
            );

            if (!result) return null;

            if (result.isGenerated) {
                // Generated sound
                result.gainNode.gain.value = volume * this.musicVolume;
                if (type === 'menu') {
                    this.menuMusic = result;
                } else if (type === 'battlefield') {
                    this.battlefieldMusic = result;
                }
                return result;
            } else {
                // Real audio file
                const audio = result.audio;
                audio.loop = loop;
                audio.volume = volume * this.musicVolume;
                
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
                    console.debug(`Could not play ${type} music:`, error);
                    // Music will play when user interacts
                }

                return audio;
            }
        } catch (error) {
            console.debug(`Error loading music ${type}:`, error);
            // Fallback to generated sound
            const buffer = this.generateBackgroundMusic(type);
            if (buffer && this.audioContext) {
                const soundObj = this.playGeneratedSound(buffer, true, volume * this.musicVolume);
                if (type === 'menu') {
                    this.menuMusic = soundObj;
                } else if (type === 'battlefield') {
                    this.battlefieldMusic = soundObj;
                }
                return soundObj;
            }
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
            if (this.menuMusic.source) {
                // Generated sound
                this.menuMusic.source.stop();
            } else {
                // Real audio file
                this.menuMusic.pause();
                this.menuMusic.currentTime = 0;
            }
        } else if (type === 'battlefield' && this.battlefieldMusic) {
            if (this.battlefieldMusic.source) {
                // Generated sound
                this.battlefieldMusic.source.stop();
            } else {
                // Real audio file
                this.battlefieldMusic.pause();
                this.battlefieldMusic.currentTime = 0;
            }
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

        // Try to use generated sound if file fails
        const tryPlayGenerated = () => {
            if (!this.audioContext) return;
            
            const buffer = this.generateBulletSound();
            if (buffer) {
                const soundObj = this.playGeneratedSound(buffer, false, volume * this.sfxVolume);
                if (soundObj && soundObj.source) {
                    soundObj.source.onended = () => {
                        // Sound finished
                    };
                }
            }
        };

        // Find available sound from pool
        const availableSound = this.soundPool.find(sound => !sound.inUse);
        
        if (!availableSound) {
            // All sounds in use, try generated sound directly
            tryPlayGenerated();
            return;
        }

        // Mark as in use
        availableSound.inUse = true;
        this.activeSounds++;

        // Set up audio
        const audio = availableSound.audio;
        audio.src = url;
        audio.volume = volume * this.sfxVolume;
        
        // Handle errors - fallback to generated sound
        audio.onerror = () => {
            availableSound.inUse = false;
            this.activeSounds--;
            // Use generated sound as fallback
            tryPlayGenerated();
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
            // File failed, use generated sound
            availableSound.inUse = false;
            this.activeSounds--;
            tryPlayGenerated();
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
            if (this.menuMusic.gainNode) {
                // Generated sound
                this.menuMusic.gainNode.gain.value = this.musicVolume;
            } else {
                // Real audio file
                this.menuMusic.volume = this.musicVolume;
            }
        }
        if (this.battlefieldMusic) {
            // Battlefield music should be lower volume
            const battlefieldVol = 0.3 * this.musicVolume;
            if (this.battlefieldMusic.gainNode) {
                // Generated sound
                this.battlefieldMusic.gainNode.gain.value = battlefieldVol;
            } else {
                // Real audio file
                this.battlefieldMusic.volume = battlefieldVol;
            }
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

