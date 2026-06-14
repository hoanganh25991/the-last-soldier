import * as THREE from 'three';

export const QUALITY_LEVELS = ['minimal', 'low', 'medium', 'high'];

export function graphicsSliderToLevel(value) {
    if (value <= 25) return 'minimal';
    if (value <= 50) return 'low';
    if (value <= 75) return 'medium';
    return 'high';
}

export const RENDER_CONFIG = {
    high: {
        init: {
            antialias: true,
            powerPreference: 'high-performance',
            precision: 'highp',
            stencil: false,
            depth: true,
            alpha: false
        },
        settings: {
            pixelRatioMultiplier: 1,
            maxPixelRatio: 2,
            shadowMapEnabled: true,
            shadowMapSize: 2048,
            shadowMapType: THREE.PCFSoftShadowMap,
            outputColorSpace: THREE.SRGBColorSpace
        }
    },
    medium: {
        init: {
            antialias: true,
            powerPreference: 'high-performance',
            precision: 'highp',
            stencil: false,
            depth: true,
            alpha: false
        },
        settings: {
            pixelRatioMultiplier: 1,
            maxPixelRatio: 2,
            shadowMapEnabled: true,
            shadowMapSize: 1024,
            shadowMapType: THREE.PCFShadowMap,
            outputColorSpace: THREE.SRGBColorSpace
        }
    },
    low: {
        init: {
            antialias: true,
            powerPreference: 'high-performance',
            precision: 'mediump',
            stencil: false,
            depth: true,
            alpha: false
        },
        settings: {
            pixelRatioMultiplier: 0.9,
            maxPixelRatio: 2,
            shadowMapEnabled: false,
            shadowMapSize: 512,
            shadowMapType: THREE.BasicShadowMap,
            outputColorSpace: THREE.SRGBColorSpace
        }
    },
    minimal: {
        init: {
            antialias: true,
            powerPreference: 'high-performance',
            precision: 'mediump',
            stencil: false,
            depth: true,
            alpha: false
        },
        settings: {
            pixelRatioMultiplier: 0.75,
            maxPixelRatio: 1.5,
            shadowMapEnabled: false,
            shadowMapSize: 512,
            shadowMapType: THREE.BasicShadowMap,
            outputColorSpace: THREE.SRGBColorSpace
        }
    }
};

export function getEffectivePixelRatio(qualityLevel, resolutionPercent = 100) {
    const config = RENDER_CONFIG[qualityLevel] || RENDER_CONFIG.medium;
    const resolutionScale = Math.max(0.25, Math.min(1, resolutionPercent / 100));
    const base = Math.min(window.devicePixelRatio, config.settings.maxPixelRatio);
    return base * config.settings.pixelRatioMultiplier * resolutionScale;
}
