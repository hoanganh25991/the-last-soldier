# Sound Files

This directory should contain the following audio files for the game:

## Background Music

1. **menu-music.mp3** - Background music that plays when clicking "Play" from the main menu
   - Should loop seamlessly
   - Recommended: Ambient, atmospheric music

2. **battlefield-music.mp3** - Background music that plays during gameplay (after Deploy)
   - Should loop seamlessly
   - Plays at 30% volume automatically
   - Recommended: Intense, action-oriented music

## Sound Effects

1. **rifle-shoot.mp3** - Sound effect for primary weapon (rifle) shots
   - Should be short and punchy
   - Will be rate-limited and pooled for performance

2. **pistol-shoot.mp3** - Sound effect for secondary weapon (pistol) shots
   - Should be short and punchy
   - Will be rate-limited and pooled for performance

3. **bullet-shoot.mp3** - Default bullet sound (fallback if weapon-specific sounds aren't available)

## Notes

- All audio files should be in MP3 format for maximum browser compatibility
- Keep sound effects short (< 1 second) for best performance
- Music files can be longer as they loop
- The audio system automatically handles:
  - Volume control via settings
  - Sound pooling for performance
  - Rate limiting to prevent audio overload
  - Seamless looping for background music

## Adding Your Own Sounds

1. Place your audio files in this `sounds/` directory
2. Update the file paths in:
   - `src/ui/menuManager.js` (for menu and battlefield music)
   - `src/weapons/weaponBase.js` (for default bullet sound)
   - `src/weapons/primaryWeapon.js` (for rifle sound)
   - `src/weapons/secondaryWeapon.js` (for pistol sound)

Or use the placeholder paths and add your files with the expected names.

