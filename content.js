// Prime Video Player Enhancer Content Script
// This script runs on Amazon Prime Video pages to enhance the player

(function() {
    'use strict';
    
    let settings = {
        hideOverlays: true,
        advancedControls: true
    };
    
    // Advanced overlay management variables
    let rootRef = null;
    let seekSuppressTimer = null;
    let interceptArrows = true;
    let overlaysEnabled = true;
    
    // Wait for the page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEnhancements);
    } else {
        initializeEnhancements();
    }
    
    // Listen for settings updates from popup
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'updateSettings') {
            settings = request.settings;
            applyEnhancements();
        }
    });
    
    function initializeEnhancements() {
        console.log('Prime Video Player Enhancer: Initializing...');
        
        // Load settings from storage
        chrome.storage.sync.get({
            hideOverlays: true,
            advancedControls: true
        }, function(items) {
            settings = items;
            
            // Wait for the video player to load
            waitForElement('video, .dv-player-fullscreen', function(player) {
                console.log('Prime Video Player Enhancer: Player found, applying enhancements...');
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
        // Remove existing classes first
        document.body.classList.remove('pv-hide-overlays-enabled', 'pv-advanced-controls-enabled');
        
        // Apply overlay hiding based on setting
        if (settings.hideOverlays) {
            document.body.classList.add('pv-hide-overlays-enabled');
            overlaysEnabled = true;
        } else {
            overlaysEnabled = false;
        }
        
        // Apply advanced controls based on setting
        if (settings.advancedControls) {
            document.body.classList.add('pv-advanced-controls-enabled');
            addKeyboardShortcuts();
        } else {
            removeKeyboardShortcuts();
        }
        
        console.log('Prime Video Player Enhancer: Enhancements applied!', settings);
    }
    
    function initializeAdvancedFeatures() {
        // Initialize player root detection for overlay management
        initRootSoon();
        
        // Setup toggle shortcuts (Alt+O for overlays, Alt+K for arrow interception)
        setupToggleShortcuts();
        
        // Setup advanced arrow key handling (always active when advanced controls enabled)
        setupAdvancedKeyHandling();
    }
    
    // ...existing utility functions...
    
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
        // Advanced arrow key handler (capture phase to pre-empt site handlers)
        window.addEventListener('keydown', function(e) {
            if (!interceptArrows || !settings.advancedControls) return;
            var key = e.key;
            if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
            if (isEditableTarget(e.target)) return;

            var video = getActiveVideo();
            if (!video) return;

            // Prevent site from receiving the key (which would show controls)
            e.stopImmediatePropagation();
            e.preventDefault();

            // Step sizes: Alt = 60s, default = 10s, Shift = 3s
            var step = e.altKey ? 60 : (e.shiftKey ? 3 : 10);
            var delta = (key === 'ArrowRight') ? +step : -step;

            performSeek(video, delta);
            suppressControlsBriefly();
            
            // Show notification
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
    
    function setupToggleShortcuts() {
        document.addEventListener('keydown', function (e) {
            // Toggle overlays with Alt+O (only works if hideOverlays setting is enabled)
            if (e.altKey && (e.key === 'o' || e.key === 'O') && settings.hideOverlays) {
                overlaysEnabled = !overlaysEnabled;
                // Toggle the CSS by enabling/disabling overlay hiding classes
                document.body.classList.toggle('pv-overlays-runtime-disabled', !overlaysEnabled);
                showShortcutNotification(overlaysEnabled ? 'Overlay hiding enabled' : 'Overlay hiding disabled');
                console.log('[PV Overlay]', overlaysEnabled ? 'Hidden overlays enabled' : 'Hidden overlays disabled');
            }
            
            // Toggle arrow interception with Alt+K (only works if advanced controls enabled)
            if (e.altKey && (e.key === 'k' || e.key === 'K') && settings.advancedControls) {
                interceptArrows = !interceptArrows;
                showShortcutNotification(`Arrow seek ${interceptArrows ? 'enabled' : 'disabled'}`);
                console.log('[PV Overlay] Arrow seek interception', interceptArrows ? 'ENABLED' : 'DISABLED');
            }
        });
    }
    
    function initRootSoon() {
        var tries = 0;
        var iv = setInterval(function () {
            tries++;
            if (ensureRoot() || tries > 60) clearInterval(iv);
        }, 250);
    }
    
    let keyboardHandler = null;
    
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
        const notification = document.createElement('div');
        notification.className = 'pv-shortcut-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
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
    
})();