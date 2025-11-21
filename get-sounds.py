#!/usr/bin/env python3
"""
Download free sound files for the game.
Run with: python3 get-sounds.py
"""

import os
import urllib.request
import urllib.error

# Create sounds directory
sounds_dir = 'sounds'
os.makedirs(sounds_dir, exist_ok=True)

# Free sound URLs - using direct links to free sounds
# These are placeholder URLs - you'll need to replace with actual free sound URLs
# or download manually from freesound.org, pixabay.com, etc.

sounds = {
    'menu-music.mp3': None,  # Will generate if None
    'battlefield-music.mp3': None,  # Not needed - music stops on battlefield
    'rifle-shoot.mp3': None,
    'pistol-shoot.mp3': None,
    'bullet-shoot.mp3': None
}

def download_file(url, filepath):
    """Download a file from URL"""
    try:
        print(f"Downloading {os.path.basename(filepath)}...")
        urllib.request.urlretrieve(url, filepath)
        print(f"✓ Downloaded: {os.path.basename(filepath)}")
        return True
    except Exception as e:
        print(f"✗ Failed to download {os.path.basename(filepath)}: {e}")
        return False

def main():
    print("=" * 50)
    print("Game Sound Files Setup")
    print("=" * 50)
    print("\nSince direct downloads are restricted, please:")
    print("1. Open generate-sounds.html in your browser")
    print("2. Click buttons to generate WAV files")
    print("3. Convert WAV to MP3 using an online converter")
    print("4. Place MP3 files in the sounds/ directory")
    print("\nOR download free sounds from:")
    print("- https://freesound.org/")
    print("- https://pixabay.com/music/")
    print("- https://mixkit.co/free-stock-music/")
    print("\nRequired files:")
    for filename in sounds.keys():
        if filename != 'battlefield-music.mp3':  # Not needed
            print(f"  - {filename}")
    print("\n" + "=" * 50)

if __name__ == '__main__':
    main()

