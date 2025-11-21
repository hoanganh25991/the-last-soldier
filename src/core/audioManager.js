export class AudioManager {
    constructor() {
        // Background music
        this.menuMusic = null;
        this.battlefieldMusic = null;
        
        // Sound effects pool for optimization
        this.soundPool = [];
        this.maxConcurrentSounds = 8; // Limit concurrent bullet sounds
        this.activeSounds = 0;
        
        // Preloaded audio cache - keyed by URL
        this.preloadedSounds = new Map();
        
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
        // Pool will be created dynamically per sound URL
    }

    // Preload a sound file and create pool of audio elements
    async preloadSound(url) {
        // Check if already preloaded
        if (this.preloadedSounds.has(url)) {
            return true;
        }

        return new Promise((resolve, reject) => {
            // Create multiple audio elements for this sound (for concurrent playback)
            const audioElements = [];
            let loadedCount = 0;
            let errorCount = 0;
            const totalElements = this.maxConcurrentSounds;
            
            const checkComplete = () => {
                if (loadedCount + errorCount === totalElements) {
                    if (loadedCount > 0) {
                        // Store the pool
                        this.preloadedSounds.set(url, audioElements.filter(a => a.readyState >= 2));
                        resolve(true);
                    } else {
                        reject(new Error(`Failed to preload: ${url}`));
                    }
                }
            };
            
            // Create multiple audio elements with same URL (browser will cache)
            for (let i = 0; i < totalElements; i++) {
                const audio = new Audio();
                audio.preload = 'auto';
                
                const handleCanPlay = () => {
                    audio.removeEventListener('canplaythrough', handleCanPlay);
                    audio.removeEventListener('error', handleError);
                    loadedCount++;
                    checkComplete();
                };
                
                const handleError = (e) => {
                    audio.removeEventListener('canplaythrough', handleCanPlay);
                    audio.removeEventListener('error', handleError);
                    errorCount++;
                    checkComplete();
                };
                
                audio.addEventListener('canplaythrough', handleCanPlay, { once: true });
                audio.addEventListener('error', handleError, { once: true });
                
                audio.src = url;
                audio.load();
                audioElements.push(audio);
            }
            
            // Timeout after 5 seconds
            setTimeout(() => {
                if (!this.preloadedSounds.has(url)) {
                    reject(new Error(`Timeout preloading: ${url}`));
                }
            }, 5000);
        });
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

    // Load audio file (simple static server compatible)
    async loadAudioFile(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            
            // Disable preload to avoid range requests on simple servers
            audio.preload = 'none';
            
            // Simple approach: just set src and let it load naturally
            audio.src = url;
            
            // Handle successful load
            const handleCanPlay = () => {
                audio.removeEventListener('canplay', handleCanPlay);
                audio.removeEventListener('error', handleError);
                resolve({ audio, isGenerated: false });
            };
            
            // Handle errors gracefully
            const handleError = (e) => {
                audio.removeEventListener('canplay', handleCanPlay);
                audio.removeEventListener('error', handleError);
                console.warn(`Audio file not found: ${url}`);
                reject(new Error(`Failed to load audio: ${url}`));
            };
            
            audio.addEventListener('canplay', handleCanPlay, { once: true });
            audio.addEventListener('error', handleError, { once: true });
            
            // Start loading
            audio.load();
            
            // Timeout after 5 seconds
            setTimeout(() => {
                audio.removeEventListener('canplay', handleCanPlay);
                audio.removeEventListener('error', handleError);
                reject(new Error(`Timeout loading audio: ${url}`));
            }, 5000);
        });
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

            // Load audio file (requires actual MP3 file)
            const result = await this.loadAudioFile(url);
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

        // Get preloaded audio elements for this URL
        const audioPool = this.preloadedSounds.get(url);
        if (!audioPool || audioPool.length === 0) {
            // Not preloaded yet - start preloading in background and skip this play
            this.preloadSound(url).catch(() => {});
            return;
        }

        // Find an available audio element from the pool
        let audio = null;
        for (const a of audioPool) {
            // Check if audio is not currently playing (available)
            if (a.paused || a.ended || a.currentTime === 0 || a.currentTime >= a.duration) {
                audio = a;
                break;
            }
        }

        // If all are playing, use the first one (overlap is okay for bullet sounds)
        if (!audio) {
            audio = audioPool[0];
        }

        // Reset and configure - NO src change, just reset time
        // This avoids network requests - audio is already loaded
        audio.pause();
        audio.currentTime = 0;
        audio.volume = volume * this.sfxVolume;
        
        // Play sound - NO network request since audio is already loaded
        audio.play().catch(error => {
            // Silently fail - might be autoplay restriction
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

