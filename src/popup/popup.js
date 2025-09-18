document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    
    document.getElementById('hideOverlays').addEventListener('change', saveSettings);
    document.getElementById('hideXray').addEventListener('change', saveSettings);
    document.getElementById('forceQuality').addEventListener('change', saveSettings);
    document.getElementById('advancedControls').addEventListener('change', saveSettings);
});

function loadSettings() {
    chrome.storage.sync.get({
        hideOverlays: true,
        hideXray: true,
        forceQuality: false,
        advancedControls: true
    }, function(items) {
        document.getElementById('hideOverlays').checked = items.hideOverlays;
        document.getElementById('hideXray').checked = items.hideXray;
        document.getElementById('forceQuality').checked = items.forceQuality;
        document.getElementById('advancedControls').checked = items.advancedControls;
    });
}

function saveSettings() {
    const settings = {
        hideOverlays: document.getElementById('hideOverlays').checked,
        hideXray: document.getElementById('hideXray').checked,
        forceQuality: document.getElementById('forceQuality').checked,
        advancedControls: document.getElementById('advancedControls').checked
    };
    
    chrome.storage.sync.set(settings, function() {
        // Notify content script of changes
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && (tabs[0].url.includes('amazon.com') || tabs[0].url.includes('primevideo.com'))) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'updateSettings', settings: settings});
                // Also send quality-specific message
                chrome.tabs.sendMessage(tabs[0].id, {action: 'updateQualitySettings', settings: settings});
            }
        });
    });
}