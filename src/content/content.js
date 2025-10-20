(function() {
    'use strict';
    
    let settings = {
        hideOverlays: true,
        hideXray: true,
        forceQuality: false,
        advancedControls: true
    };
    
    let previousSettings = null;
    
    let isQualityModified = false;
    let interceptorsActive = false;
    let qualityObserver = null;
    let qualityMonitorInterval = null;
    
    let rootRef = null;
    let seekSuppressTimer = null;
    let interceptArrows = true;
    let overlaysEnabled = true;
    let keyboardHandler = null;
    
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEnhancements);
    } else {
        initializeEnhancements();
    }
    
    chrome.runtime.onMessage.addListener(function(request, _sender, _sendResponse) {
        if (request.action === 'updateSettings') {
            settings = request.settings;
            applyEnhancements();
        }
    });
    
    function initializeEnhancements() {
        
        chrome.storage.sync.get({
            hideOverlays: true,
            hideXray: true,
            forceQuality: false,
            advancedControls: true
        }, function(items) {
            settings = items;
            
            waitForElement('video, .dv-player-fullscreen', function(_player) {
                applyEnhancements();
                initializeAdvancedFeatures();
            });
        });
    }
    
    function waitForElement(selector, callback, timeout = 10000) {
        const startTime = Date.now();
        
        function check() {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
            } else if (Date.now() - startTime < timeout) {
                setTimeout(check, 100);
            }
        }
        
        check();
    }
    
    function applyEnhancements() {
        if (previousSettings !== null) {
            const changes = {};
            for (const key in settings) {
                if (settings[key] !== previousSettings[key]) {
                    changes[key] = { from: previousSettings[key], to: settings[key] };
                }
            }
            if (Object.keys(changes).length > 0) {
                console.log('Settings changed:', changes);
            }
        }
        
        previousSettings = { ...settings };
        
        document.body.classList.remove('pv-hide-overlays-enabled', 'pv-hide-xray-enabled', 'pv-advanced-controls-enabled');
        
        if (settings.hideOverlays) {
            document.body.classList.add('pv-hide-overlays-enabled');
            overlaysEnabled = true;
        } else {
            overlaysEnabled = false;
        }
        
        if (settings.hideXray) {
            document.body.classList.add('pv-hide-xray-enabled');
        }
        
        if (settings.advancedControls) {
            document.body.classList.add('pv-advanced-controls-enabled');
            addKeyboardShortcuts();
        } else {
            removeKeyboardShortcuts();
        }
        
        if (settings.forceQuality) {
            initializeQualityEnhancements();
        } else {
            cleanupQuality();
        }
        
    }
    
    
    function setupQualityInterception() {
        if (interceptorsActive) return;

        if (!window.originalFetch) {
            window.originalFetch = window.fetch;
            window.fetch = function (...args) {
                const url = args[0];

                if (typeof url === 'string') {
                    const primeVideoPatterns = [
                        'manifest', 'playlist', '.m3u8', '.mpd',
                        'quality', 'bitrate', 'variant', 'segment'
                    ];

                    const matchesPattern = primeVideoPatterns.some(pattern => url.includes(pattern));

                    if (matchesPattern) {
                        if (args[1]) {
                            args[1].headers = args[1].headers || {};
                        } else {
                            args[1] = { headers: {} };
                        }
                        args[1].headers['X-Quality-Preference'] = 'highest';
                        args[1].headers['X-Bitrate-Preference'] = 'maximum';
                    }
                }

                return window.originalFetch.apply(this, args);
            };
        }

        if (!window.originalXHROpen) {
            window.originalXHROpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                this._url = url;
                return window.originalXHROpen.apply(this, [method, url, ...rest]);
            };

            window.originalXHRSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.send = function(...args) {
                if (this._url && typeof this._url === 'string') {
                    const primeVideoPatterns = [
                        'manifest', 'playlist', '.m3u8', '.mpd',
                        'quality', 'bitrate', 'variant', 'segment'
                    ];

                    const matchesPattern = primeVideoPatterns.some(pattern => 
                        this._url.includes(pattern)
                    );

                    if (matchesPattern) {
                        this.setRequestHeader('X-Quality-Preference', 'highest');
                        this.setRequestHeader('X-Bitrate-Preference', 'maximum');
                    }
                }
                return window.originalXHRSend.apply(this, args);
            };
        }

        const preferences = {
            'prime-video-quality': 'best',
            'video-quality': 'best',
            'bitrate-preference': 'maximum',
            'force-hd': 'true'
        };

        Object.entries(preferences).forEach(([key, value]) => {
            try {
                localStorage.setItem(key, value);
                sessionStorage.setItem(key, value);
            } catch (e) { }
        });
        interceptorsActive = true;
        console.debug('forceQuality network interception active');
    }

    function enhanceVideo() {
        const videos = document.querySelectorAll('video');

        videos.forEach(video => {
            if (video.dataset.qualityEnhanced) return;
            video.dataset.qualityEnhanced = 'true';

            video.addEventListener('resize', () => {
                console.debug('video resized:', video.videoWidth + 'x' + video.videoHeight);
                setTimeout(() => triggerQualityUpgrade(video), 1000);
            });
            video.addEventListener('canplay', () => {
                triggerQualityUpgrade(video);
            });
            video.addEventListener('loadedmetadata', () => {
                triggerQualityUpgrade(video);
            });
            video.addEventListener('seeked', () => {
                setTimeout(() => triggerQualityUpgrade(video), 100);
                setTimeout(() => triggerQualityUpgrade(video), 500);
                setTimeout(() => triggerQualityUpgrade(video), 1500);
            });
            video.addEventListener('progress', () => {
                if (settings.forceQuality) {
                    triggerQualityUpgrade(video);
                }
            });
            video.addEventListener('playing', () => {
                if (settings.forceQuality) {
                    setTimeout(() => triggerQualityUpgrade(video), 200);
                }
            });
        });
    }

    function triggerQualityUpgrade(video) {
        const qualityEvents = [
            'qualitychange', 'bitratechange', 'requestHighQuality'
        ];

        qualityEvents.forEach(eventType => {
            const event = new CustomEvent(eventType, {
                detail: {
                    quality: 'highest',
                    bitrate: 'maximum'
                }
            });
            video.dispatchEvent(event);
            document.dispatchEvent(event);
        });
        const qualityAttributes = {
            'data-quality': 'highest',
            'data-bitrate': 'maximum',
            'preload': 'metadata'
        };

        Object.entries(qualityAttributes).forEach(([attr, value]) => {
            video.setAttribute(attr, value);
        });
        forceHighestQualitySelection();
    }

    function forceHighestQualitySelection() {
        try {
            const qualityButtons = document.querySelectorAll(
                '[data-automation-id*="quality"], ' +
                '[class*="qualityButton"], ' +
                '[class*="quality-selector"], ' +
                'button[aria-label*="Quality"], ' +
                'button[title*="Quality"]'
            );

            qualityButtons.forEach(button => {
                const text = button.textContent || button.getAttribute('aria-label') || '';
                if (/best|high|1080|4k|uhd|2160/i.test(text)) {
                    button.click();
                    console.debug('clicked quality button:', text);
                }
            });
            const qualityOptions = document.querySelectorAll(
                '[role="menuitem"][class*="quality"], ' +
                '[data-testid*="quality-option"], ' +
                'li[class*="quality"]'
            );

            if (qualityOptions.length > 0) {
                qualityOptions[0].click();
                console.debug('selected highest quality option');
            }
        } catch (e) {
        }
    }

    function executeQualityEnhancements() {
        if (!settings.forceQuality) return;

        setupQualityInterception();
        enhanceVideo();
        isQualityModified = true;

        if (!qualityMonitorInterval) {
            qualityMonitorInterval = setInterval(() => {
                if (settings.forceQuality) {
                    const video = document.querySelector('video');
                    if (video && !video.paused) {
                        triggerQualityUpgrade(video);
                    }
                }
            }, 3000);
            console.debug('quality monitor started');
        }
    }

    function initializeQualityEnhancements() {
        if (!settings.forceQuality) return;

        setupQualityInterception();

        function checkAndExecuteQuality() {
            if (document.querySelector('video') && settings.forceQuality) {
                executeQualityEnhancements();
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkAndExecuteQuality);
        } else {
            checkAndExecuteQuality();
        }

        if (!qualityObserver) {
            qualityObserver = new MutationObserver(checkAndExecuteQuality);

            function startQualityObserving() {
                if (document.body) {
                    qualityObserver.observe(document.body, { childList: true, subtree: true });
                } else {
                    setTimeout(startQualityObserving, 100);
                }
            }
            startQualityObserving();
        }
    }

    function cleanupQuality() {
        if (qualityObserver) {
            qualityObserver.disconnect();
            qualityObserver = null;
        }

        if (qualityMonitorInterval) {
            clearInterval(qualityMonitorInterval);
            qualityMonitorInterval = null;
            console.debug('quality monitor stopped');
        }

        if (window.originalFetch) {
            window.fetch = window.originalFetch;
            delete window.originalFetch;
        }

        if (window.originalXHROpen) {
            XMLHttpRequest.prototype.open = window.originalXHROpen;
            delete window.originalXHROpen;
        }

        if (window.originalXHRSend) {
            XMLHttpRequest.prototype.send = window.originalXHRSend;
            delete window.originalXHRSend;
        }

        interceptorsActive = false;
        isQualityModified = false;
    }
    
    
    function initializeAdvancedFeatures() {
        initRootSoon();
        
        setupAdvancedKeyHandling();
    }
    
    
    function isVisible(el) {
        if (!el) return false;
        var rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 &&
               rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
               rect.left < (window.innerWidth || document.documentElement.clientWidth);
    }
    
    function getActiveVideo() {
        var vids = Array.prototype.slice.call(document.querySelectorAll('video'));
        var best = null, bestArea = 0;
        for (var i = 0; i < vids.length; i++) {
            var v = vids[i];
            if (!isVisible(v)) continue;
            var r = v.getBoundingClientRect();
            var area = r.width * r.height;
            if (area > bestArea) { best = v; bestArea = area; }
        }
        return best;
    }
    
    function findPlayerRoot(video) {
        var candidates = [
            '[data-automation-id="webPlayer"]',
            '[data-automation-id*="webPlayer"]',
            '[data-testid*="web-player"]',
            '.atvwebplayersdk-root',
            '.webPlayer',
            '.pv-player',
            '.av-player'
        ];
        for (var i = 0; i < candidates.length; i++) {
            var el = document.querySelector(candidates[i]);
            if (el && (!video || el.contains(video))) return el;
        }
        var v = video || getActiveVideo();
        if (!v) return document.body;
        var up = v;
        for (var j = 0; j < 6 && up && up.parentElement; j++) {
            up = up.parentElement;
            var r = up.getBoundingClientRect();
            if (r.width > 400 && r.height > 300) return up;
        }
        return v.parentElement || document.body;
    }
    
    function ensureRoot() {
        if (rootRef && document.documentElement.contains(rootRef)) return rootRef;
        var v = getActiveVideo();
        if (!v) return null;
        rootRef = findPlayerRoot(v);
        if (rootRef && !rootRef.hasAttribute('data-pv-overlay-scope')) {
            rootRef.setAttribute('data-pv-overlay-scope', '1');
        }
        return rootRef;
    }
    
    function suppressControlsBriefly() {
        var root = ensureRoot();
        if (!root) return;
        root.classList.add('pv-seek-suppress');
        if (seekSuppressTimer) clearTimeout(seekSuppressTimer);
        seekSuppressTimer = setTimeout(function () {
            if (rootRef) rootRef.classList.remove('pv-seek-suppress');
        }, 700);
    }
    
    function clamp(n, min, max) { 
        return Math.min(Math.max(n, min), max); 
    }
    
    function performSeek(video, deltaSec) {
        try {
            if (!video) return;
            var dur = isFinite(video.duration) ? video.duration : Number.POSITIVE_INFINITY;
            var target = video.currentTime + deltaSec;
            if (isFinite(dur)) {
                target = clamp(target, 0, Math.max(0, dur - 0.001));
            } else {
                target = Math.max(0, target);
            }
            video.currentTime = target;
            if (video.paused) { video.play().catch(function () {}); }
        } catch (_) {}
    }
    
    function isEditableTarget(t) {
        if (!t || t === document.body) return false;
        if (t.isContentEditable) return true;
        var tag = t.tagName ? t.tagName.toLowerCase() : '';
        return tag === 'input' || tag === 'textarea' || tag === 'select';
    }
    
    function setupAdvancedKeyHandling() {
        window.addEventListener('keydown', function(e) {
            if (!interceptArrows || !settings.advancedControls) return;
            var key = e.key;
            if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
            if (isEditableTarget(e.target)) return;

            var video = getActiveVideo();
            if (!video) return;

            e.stopImmediatePropagation();
            e.preventDefault();

            var step = e.altKey ? 60 : (e.shiftKey ? 3 : 10);
            var delta = (key === 'ArrowRight') ? +step : -step;

            performSeek(video, delta);
            suppressControlsBriefly();
            
            showShortcutNotification(`Seek ${delta > 0 ? '+' : ''}${delta}s`);
        }, true);
        
        window.addEventListener('keyup', function (e) {
            if (!interceptArrows || !settings.advancedControls) return;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                if (isEditableTarget(e.target)) return;
                e.stopImmediatePropagation();
                e.preventDefault();
                suppressControlsBriefly();
            }
        }, true);
    }
    
    function initRootSoon() {
        var tries = 0;
        var iv = setInterval(function () {
            tries++;
            if (ensureRoot() || tries > 60) clearInterval(iv);
        }, 250);
    }
    
    
    function addKeyboardShortcuts() {
        removeKeyboardShortcuts();
        
        keyboardHandler = function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch(e.key.toLowerCase()) {
                case 'f':
                    toggleFullscreen();
                    e.preventDefault();
                    showShortcutNotification('Toggling fullscreen');
                    break;
                case 'j':
                    skipTime(-10);
                    e.preventDefault();
                    showShortcutNotification('Skipped back 10 seconds');
                    break;
                case 'l':
                    skipTime(10);
                    e.preventDefault();
                    showShortcutNotification('Skipped forward 10 seconds');
                    break;
            }
        };
        
        document.addEventListener('keydown', keyboardHandler);
    }
    
    function removeKeyboardShortcuts() {
        if (keyboardHandler) {
            document.removeEventListener('keydown', keyboardHandler);
            keyboardHandler = null;
        }
    }
    
    function showShortcutNotification(message) {
        const playerContainer = document.querySelector('[data-automation-id="webPlayer"]') ||
                               document.querySelector('.atvwebplayersdk-root') ||
                               document.querySelector('.dv-player-fullscreen') ||
                               document.querySelector('.webPlayer') ||
                               document.querySelector('video').closest('[class*="player"]') ||
                               document.body;

        const existingNotification = playerContainer.querySelector('.pv-shortcut-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'pv-shortcut-notification';
        notification.textContent = message;
        
        playerContainer.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, 2000);
    }
    
    function toggleFullscreen() {
        const fullscreenButton = document.querySelector('[aria-label="Full screen"]') || 
                                document.querySelector('[data-automation-id="fullscreen-button"]') ||
                                document.querySelector('button[title*="fullscreen" i]');
        if (fullscreenButton) {
            fullscreenButton.click();
        }
    }
    
    function skipTime(seconds) {
        const video = document.querySelector('video');
        if (video) {
            video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
        }
    }


    window.addEventListener('beforeunload', function() {
        cleanupQuality();
    });
})();