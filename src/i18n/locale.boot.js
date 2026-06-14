(function () {
    var TRANSLATIONS = {
        en: {
            gameTitle: 'The Last Soldier',
            loading: 'Loading...',
            initializing: 'Initializing...',
            loadingAudio: 'Loading audio files...',
            loadingStyles: 'Loading styles...',
            loadingJS: 'Loading JavaScript modules...',
            preparingModules: 'Preparing game modules...',
            ready: 'Ready!',
            loadingHTML: 'Loading HTML...',
            loadingCSS: 'Loading CSS...',
            loadingStep: 'Loading... {current}/{total}',
            gameModulesReady: 'Game modules ready',
            loadingGameModules: 'Loading game modules...',
            initializingEngine: 'Initializing engine...',
            loadingBattlefield: 'Loading battlefield...',
            spawningTeams: 'Spawning teams...',
            initializingPlayer: 'Initializing player...',
            loadingWeapons: 'Loading weapons...',
            initializingUI: 'Initializing UI...'
        },
        vi: {
            gameTitle: 'Người Lính Cuối',
            loading: 'Đang tải...',
            initializing: 'Đang khởi tạo...',
            loadingAudio: 'Đang tải âm thanh...',
            loadingStyles: 'Đang tải giao diện...',
            loadingJS: 'Đang tải mã JavaScript...',
            preparingModules: 'Đang chuẩn bị mô-đun game...',
            ready: 'Sẵn sàng!',
            loadingHTML: 'Đang tải HTML...',
            loadingCSS: 'Đang tải CSS...',
            loadingStep: 'Đang tải... {current}/{total}',
            gameModulesReady: 'Mô-đun game đã sẵn sàng',
            loadingGameModules: 'Đang tải mô-đun game...',
            initializingEngine: 'Đang khởi tạo engine...',
            loadingBattlefield: 'Đang tải chiến trường...',
            spawningTeams: 'Đang triển khai đội...',
            initializingPlayer: 'Đang khởi tạo người chơi...',
            loadingWeapons: 'Đang tải vũ khí...',
            initializingUI: 'Đang khởi tạo giao diện...'
        }
    };

    function getSystemLocale() {
        var lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        return lang.indexOf('vi') === 0 ? 'vi' : 'en';
    }

    function t(key, params) {
        var lang = getSystemLocale();
        var strings = TRANSLATIONS[lang] || TRANSLATIONS.en;
        var text = strings[key] || TRANSLATIONS.en[key] || key;
        if (params) {
            Object.keys(params).forEach(function (paramKey) {
                text = text.replace('{' + paramKey + '}', params[paramKey]);
            });
        }
        return text;
    }

    var lang = getSystemLocale();
    window.__gameLocale = {
        lang: lang,
        t: t,
        getGameTitle: function () {
            return t('gameTitle');
        }
    };

    document.documentElement.lang = lang;
    document.title = t('gameTitle');

    function applyLoadingScreenText() {
        var titleEl = document.getElementById('loading-title');
        var textEl = document.getElementById('loading-text');
        if (titleEl) {
            titleEl.textContent = t('gameTitle');
        }
        if (textEl) {
            textEl.textContent = t('loading');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyLoadingScreenText);
    } else {
        applyLoadingScreenText();
    }
})();
