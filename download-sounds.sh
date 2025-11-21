#!/bin/bash
# Download free sound files for the game

mkdir -p sounds

echo "Downloading free sound files..."

# Download from free sound sources
# Using archive.org and other public sources

# Menu music - ambient background
echo "Downloading menu music..."
curl -L -o sounds/menu-music.mp3 "https://archive.org/download/testmp3testfile/mpthreetest.mp3" 2>/dev/null || \
curl -L -o sounds/menu-music.mp3 "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 2>/dev/null || \
echo "Menu music download failed - please download manually from https://pixabay.com/music/"

# Bullet sounds - gunshot effect
echo "Downloading bullet sounds..."
# Try multiple sources
curl -L -o sounds/bullet-shoot.mp3 "https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav" 2>/dev/null || \
echo "Bullet sound download failed - please download manually from https://freesound.org/"

curl -L -o sounds/rifle-shoot.mp3 "https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav" 2>/dev/null || \
echo "Rifle sound download failed"

curl -L -o sounds/pistol-shoot.mp3 "https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav" 2>/dev/null || \
echo "Pistol sound download failed"

echo ""
echo "If downloads failed, please:"
echo "1. Open generate-sounds.html in your browser to generate sounds"
echo "2. Or download from:"
echo "   - https://freesound.org/ (free account required)"
echo "   - https://pixabay.com/music/"
echo "   - https://mixkit.co/free-stock-music/"
echo ""
echo "Place MP3 files in the sounds/ directory with these names:"
echo "  - menu-music.mp3"
echo "  - rifle-shoot.mp3"
echo "  - pistol-shoot.mp3"
echo "  - bullet-shoot.mp3"

