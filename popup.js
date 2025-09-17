// Popup script for Prime Video Player Enhancer

document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    loadSettings();
    
    // Add event listeners for the two toggles
    document.getElementById('hideOverlays').addEventListener('change', saveSettings);
    document.getElementById('advancedControls').addEventListener('change', saveSettings);
});

function loadSettings() {
    chrome.storage.sync.get({
        hideOverlays: true,
        advancedControls: true
    }, function(items) {
        document.getElementById('hideOverlays').checked = items.hideOverlays;
        document.getElementById('advancedControls').checked = items.advancedControls;
    });
}

function saveSettings() {
    const settings = {
        hideOverlays: document.getElementById('hideOverlays').checked,
        advancedControls: document.getElementById('advancedControls').checked
    };
    
    chrome.storage.sync.set(settings, function() {
        // Notify content script of changes
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && (tabs[0].url.includes('amazon.com') || tabs[0].url.includes('primevideo.com'))) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'updateSettings', settings: settings});
            }
        });
    });
}