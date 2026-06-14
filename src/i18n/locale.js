export function t(key, params) {
    if (window.__gameLocale) {
        return window.__gameLocale.t(key, params);
    }
    return key;
}

export function getGameTitle() {
    if (window.__gameLocale) {
        return window.__gameLocale.getGameTitle();
    }
    return 'The Last Soldier';
}

export function getSystemLocale() {
    if (window.__gameLocale) {
        return window.__gameLocale.lang;
    }
    return 'en';
}
