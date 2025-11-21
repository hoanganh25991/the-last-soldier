// Script to download free sound files for the game
// Run with: node download-sounds.js

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create sounds directory if it doesn't exist
const soundsDir = path.join(__dirname, 'sounds');
if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
}

// Free sound URLs from Mixkit (royalty-free)
const sounds = {
    'menu-music.mp3': 'https://assets.mixkit.co/music/preview/mixkit-game-show-988.mp3',
    'battlefield-music.mp3': 'https://assets.mixkit.co/music/preview/mixkit-intense-action-957.mp3',
    'rifle-shoot.mp3': 'https://assets.mixkit.co/sfx/preview/mixkit-gun-shot-1662.mp3',
    'pistol-shoot.mp3': 'https://assets.mixkit.co/sfx/preview/mixkit-gun-shot-1662.mp3',
    'bullet-shoot.mp3': 'https://assets.mixkit.co/sfx/preview/mixkit-gun-shot-1662.mp3'
};

function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(filepath);
        
        protocol.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirect
                return downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log(`✓ Downloaded: ${path.basename(filepath)}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

async function downloadAllSounds() {
    console.log('Downloading sound files...\n');
    
    for (const [filename, url] of Object.entries(sounds)) {
        const filepath = path.join(soundsDir, filename);
        
        // Skip if file already exists
        if (fs.existsSync(filepath)) {
            console.log(`⊘ Skipped (exists): ${filename}`);
            continue;
        }
        
        try {
            await downloadFile(url, filepath);
        } catch (error) {
            console.error(`✗ Failed to download ${filename}:`, error.message);
        }
    }
    
    console.log('\nDone! Sound files are in the sounds/ directory.');
}

downloadAllSounds().catch(console.error);

