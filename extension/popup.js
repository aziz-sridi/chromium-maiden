// Popup script for handling settings and UI interactions

// Default settings
const defaultSettings = {
  feature1Enabled: true,
  feature2Enabled: true,
  filterAction: 'blur',
  platformsEnabled: {
    facebook: true,
    instagram: true,
    twitter: true
  }
};

// Load and initialize settings
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  attachEventListeners();
});

/**
 * Load settings from storage
 */
function loadSettings() {
  chrome.storage.sync.get(null, (data) => {
    const settings = { ...defaultSettings, ...data };

    // Update UI
    document.getElementById('feature1Toggle').checked = settings.feature1Enabled;
    document.getElementById('feature2Toggle').checked = settings.feature2Enabled;
    document.getElementById('filterAction').value = settings.filterAction;
    
    if (settings.platformsEnabled) {
      document.getElementById('platformFacebook').checked = settings.platformsEnabled.facebook;
      document.getElementById('platformInstagram').checked = settings.platformsEnabled.instagram;
      document.getElementById('platformTwitter').checked = settings.platformsEnabled.twitter;
    }

    updateStatusBadges(settings);
  });
}

/**
 * Update status badges
 */
function updateStatusBadges(settings) {
  const feature1Status = document.getElementById('feature1Status');
  const feature2Status = document.getElementById('feature2Status');

  feature1Status.textContent = settings.feature1Enabled ? '✓ Active' : '✕ Inactive';
  feature1Status.className = `status-badge ${settings.feature1Enabled ? 'active' : 'inactive'}`;

  feature2Status.textContent = settings.feature2Enabled ? '✓ Active' : '✕ Inactive';
  feature2Status.className = `status-badge ${settings.feature2Enabled ? 'active' : 'inactive'}`;
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
  // Feature toggles
  document.getElementById('feature1Toggle').addEventListener('change', (e) => {
    saveSetting('feature1Enabled', e.target.checked);
  });

  document.getElementById('feature2Toggle').addEventListener('change', (e) => {
    saveSetting('feature2Enabled', e.target.checked);
  });

  // Filter action
  document.getElementById('filterAction').addEventListener('change', (e) => {
    saveSetting('filterAction', e.target.value);
  });

  // Platform checkboxes
  document.getElementById('platformFacebook').addEventListener('change', (e) => {
    updatePlatform('facebook', e.target.checked);
  });

  document.getElementById('platformInstagram').addEventListener('change', (e) => {
    updatePlatform('instagram', e.target.checked);
  });

  document.getElementById('platformTwitter').addEventListener('change', (e) => {
    updatePlatform('twitter', e.target.checked);
  });

  // Debug buttons
  document.getElementById('clearCacheBtn').addEventListener('click', clearCache);
  document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);
  
  // Shop button
  document.getElementById('shopBtn').addEventListener('click', () => {
    window.location.href = 'shop.html';
  });
}

/**
 * Save a single setting
 */
function saveSetting(key, value) {
  const update = { [key]: value };
  
  chrome.storage.sync.set(update, () => {
    console.log(`Setting saved: ${key} = ${value}`);
    loadSettings(); // Reload to update UI
  });
}

/**
 * Update platform setting
 */
function updatePlatform(platform, enabled) {
  chrome.storage.sync.get('platformsEnabled', (data) => {
    const platformsEnabled = data.platformsEnabled || { facebook: true, instagram: true, twitter: true };
    platformsEnabled[platform] = enabled;
    
    chrome.storage.sync.set({ platformsEnabled }, () => {
      console.log(`Platform ${platform} set to ${enabled}`);
    });
  });
}

/**
 * Clear cache
 */
function clearCache() {
  chrome.runtime.sendMessage({ action: 'clearCache' }, (response) => {
    showNotification('Cache cleared successfully');
  });
}

/**
 * Reset to default settings
 */
function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to default?')) {
    chrome.storage.sync.clear(() => {
      chrome.storage.sync.set(defaultSettings, () => {
        console.log('Settings reset to defaults');
        loadSettings();
        showNotification('Settings reset to defaults');
      });
    });
  }
}

/**
 * Show notification
 */
function showNotification(message) {
  const debugInfo = document.getElementById('debugInfo');
  debugInfo.textContent = message;
  debugInfo.style.display = 'block';
  
  setTimeout(() => {
    debugInfo.style.display = 'none';
  }, 3000);
}

// Update settings display every 2 seconds
setInterval(() => {
  chrome.storage.sync.get(null, (data) => {
    const settings = { ...defaultSettings, ...data };
    updateStatusBadges(settings);
  });
}, 2000);
