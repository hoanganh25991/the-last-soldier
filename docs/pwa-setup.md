# PWA Setup Guide

This game is now configured as a Progressive Web App (PWA), allowing users to install it on their devices and use it offline.

## What's Included

1. **manifest.json** - Defines the app metadata, icons, and display settings
2. **sw.js** - Service worker for offline functionality and caching
3. **HTML Updates** - Manifest link and service worker registration added to index.html

## Icon Requirements

To complete the PWA setup, you need to add the following icon files to the `images/` directory:

- `icon-72x72.png` (72x72 pixels)
- `icon-96x96.png` (96x96 pixels)
- `icon-128x128.png` (128x128 pixels)
- `icon-144x144.png` (144x144 pixels)
- `icon-152x152.png` (152x152 pixels)
- `icon-192x192.png` (192x192 pixels) - **Required for Android**
- `icon-384x384.png` (384x384 pixels)
- `icon-512x512.png` (512x512 pixels) - **Required for Android**

### Creating Icons

You can create these icons from a single high-resolution source image (at least 512x512 pixels):

1. Use an image editor or online tool to resize your source image to each required size
2. Ensure icons are square (same width and height)
3. Icons should be optimized PNG files
4. For best results, icons should have transparent backgrounds or match your theme color (#1a1a1a)

### Quick Icon Generation

You can use online tools like:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)

Or use ImageMagick/GraphicsMagick:
```bash
# Example: Generate all sizes from a 512x512 source image
convert source-icon.png -resize 72x72 images/icon-72x72.png
convert source-icon.png -resize 96x96 images/icon-96x96.png
# ... and so on
```

## Testing the PWA

1. **Local Testing**: Run your server and open the game in Chrome/Edge
2. **Install Prompt**: Look for the install button in the address bar
3. **DevTools**: Open Chrome DevTools → Application → Service Workers to verify registration
4. **Manifest**: Check Application → Manifest to verify manifest.json is loaded correctly
5. **Offline Mode**: Use DevTools → Network → Offline to test offline functionality

## Features Enabled

- ✅ **Installable**: Users can install the app on their devices
- ✅ **Offline Support**: Basic offline functionality via service worker caching
- ✅ **App-like Experience**: Standalone display mode (no browser UI)
- ✅ **Fast Loading**: Cached assets load instantly on subsequent visits

## Service Worker Strategy

The service worker uses a **Cache First** strategy for static assets and **Network First** for dynamic content:

- Static assets (HTML, CSS, JS) are cached on install
- Dynamic content (game resources) is cached on first load
- Falls back to cached content when offline
- Automatically updates when new versions are available

## Updating the Cache

When you update the game:

1. Update the `CACHE_NAME` version in `sw.js` (e.g., `'the-last-soldier-v2'`)
2. The service worker will automatically cache new assets
3. Old caches will be cleaned up on activation

## Browser Support

- ✅ Chrome/Edge (Android & Desktop)
- ✅ Firefox (Android & Desktop)
- ✅ Safari (iOS 11.3+)
- ✅ Samsung Internet

## Troubleshooting

- **Icons not showing**: Ensure icon files exist in the `images/` directory
- **Service Worker not registering**: Check browser console for errors, ensure you're using HTTPS or localhost
- **App not installable**: Verify manifest.json is valid and icons are present
- **Cache not updating**: Clear browser cache or unregister service worker in DevTools

