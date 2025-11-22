# Sound Files Setup

## Quick Setup

The game requires MP3 sound files. Here are the easiest ways to get them:

### Option 1: Generate Sounds (Recommended)

1. **Open `generate-sounds.html` in your browser**
2. Click the buttons to generate WAV files
3. Convert WAV to MP3 using:
   - Online: https://cloudconvert.com/wav-to-mp3
   - Or use: `ffmpeg -i input.wav output.mp3`
4. Place MP3 files in `sounds/` directory

### Option 2: Download Free Sounds

Download from these free sources:

**Menu Music:**
- https://pixabay.com/music/search/ambient/
- https://mixkit.co/free-stock-music/tag/ambient/

**Gunshot Sounds:**
- https://freesound.org/search/?q=gunshot
- https://pixabay.com/sound-effects/search/gunshot/

## Required Files

Place these files in the `sounds/` directory:

- ✅ `menu-music.mp3` - Background music (plays when clicking "Play")
- ✅ `rifle-shoot.mp3` - Primary weapon sound
- ✅ `pistol-shoot.mp3` - Secondary weapon sound  
- ✅ `bullet-shoot.mp3` - Default bullet sound (fallback)

## Important Notes

- **Background music stops when entering battlefield** (as requested)
- Only menu music and bullet sounds are needed
- Files must be MP3 format
- Keep bullet sounds short (< 1 second) for best performance

## File Structure

```
sounds/
  ├── menu-music.mp3
  ├── rifle-shoot.mp3
  ├── pistol-shoot.mp3
  └── bullet-shoot.mp3
```

Once files are added, the game will automatically use them!

