'use strict';

const DEFAULT_SETTINGS = {
  feature1Enabled: true,
  feature2Enabled: true,
  sensitivityLevel: 'medium',
  filterAction: 'blur',
  platformsEnabled: {
    facebook: true,
    instagram: true,
    twitter: true
  }
};

const elements = {};
let settings = { ...DEFAULT_SETTINGS };
let toastTimer = null;
let statusTimer = null;

document.addEventListener('DOMContentLoaded', initializePopup);

async function initializePopup() {
  collectElements();
  attachListeners();

  try {
    const [settingsResponse, statusResponse] = await Promise.all([
      sendMessage({ action: 'getSettings' }),
      sendMessage({ action: 'getStatus' })
    ]);
    settings = mergeSettings(settingsResponse.settings);
    renderSettings();
    renderStatus(statusResponse.status);
  } catch (_error) {
    renderSettings();
    renderServiceState('fallback');
    showToast('Settings could not be loaded. Defaults are shown.');
  }

  statusTimer = setInterval(refreshStatus, 4000);
  window.addEventListener('unload', () => clearInterval(statusTimer), { once: true });
}

function collectElements() {
  elements.outgoingToggle = document.getElementById('outgoingToggle');
  elements.incomingToggle = document.getElementById('incomingToggle');
  elements.sensitivitySelect = document.getElementById('sensitivitySelect');
  elements.filterActionSelect = document.getElementById('filterActionSelect');
  elements.platformInputs = Array.from(document.querySelectorAll('[data-platform]'));
  elements.protectionState = document.getElementById('protectionState');
  elements.protectionStateText = document.getElementById('protectionStateText');
  elements.incomingShielded = document.getElementById('incomingShielded');
  elements.outgoingPaused = document.getElementById('outgoingPaused');
  elements.cacheHits = document.getElementById('cacheHits');
  elements.serviceIndicator = document.getElementById('serviceIndicator');
  elements.serviceTitle = document.getElementById('serviceTitle');
  elements.serviceDetail = document.getElementById('serviceDetail');
  elements.retryBackend = document.getElementById('retryBackend');
  elements.testLabButton = document.getElementById('testLabButton');
  elements.clearCacheButton = document.getElementById('clearCacheButton');
  elements.resetButton = document.getElementById('resetButton');
  elements.toast = document.getElementById('toast');
}

function attachListeners() {
  elements.outgoingToggle.addEventListener('change', () => {
    updateSettings({ feature1Enabled: elements.outgoingToggle.checked });
  });
  elements.incomingToggle.addEventListener('change', () => {
    updateSettings({ feature2Enabled: elements.incomingToggle.checked });
  });
  elements.sensitivitySelect.addEventListener('change', () => {
    updateSettings({ sensitivityLevel: elements.sensitivitySelect.value });
  });
  elements.filterActionSelect.addEventListener('change', () => {
    updateSettings({ filterAction: elements.filterActionSelect.value });
  });
  elements.platformInputs.forEach((input) => {
    input.addEventListener('change', () => {
      updateSettings({
        platformsEnabled: {
          ...settings.platformsEnabled,
          [input.dataset.platform]: input.checked
        }
      });
    });
  });
  elements.clearCacheButton.addEventListener('click', clearCache);
  elements.testLabButton.addEventListener('click', openTestLab);
  elements.resetButton.addEventListener('click', resetSettings);
  elements.retryBackend.addEventListener('click', retryBackend);
}

async function openTestLab() {
  await chrome.tabs.create({ url: chrome.runtime.getURL('manual-test.html') });
  window.close();
}

function mergeSettings(next = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...next,
    platformsEnabled: {
      ...DEFAULT_SETTINGS.platformsEnabled,
      ...(next.platformsEnabled || {})
    }
  };
}

function renderSettings() {
  elements.outgoingToggle.checked = settings.feature1Enabled;
  elements.incomingToggle.checked = settings.feature2Enabled;
  elements.sensitivitySelect.value = settings.sensitivityLevel;
  elements.filterActionSelect.value = settings.filterAction;
  elements.platformInputs.forEach((input) => {
    input.checked = settings.platformsEnabled[input.dataset.platform] !== false;
  });
  renderProtectionState();
}

function renderProtectionState() {
  const enabledCount = Number(settings.feature1Enabled) + Number(settings.feature2Enabled);
  elements.protectionState.classList.toggle('is-off', enabledCount === 0);
  elements.protectionState.classList.toggle('is-partial', enabledCount === 1);
  elements.protectionStateText.textContent = enabledCount === 2
    ? 'Protection is on'
    : enabledCount === 1
      ? 'Partial protection'
      : 'Protection is off';
}

async function updateSettings(patch) {
  const previous = settings;
  settings = mergeSettings({ ...settings, ...patch });
  renderSettings();

  try {
    await sendMessage({ action: 'updateSettings', settings: patch });
    showToast('Saved. The maiden has adjusted her watch.');
  } catch (_error) {
    settings = previous;
    renderSettings();
    showToast('That setting could not be saved.');
  }
}

async function clearCache() {
  setButtonBusy(elements.clearCacheButton, true, 'Clearing');
  try {
    const response = await sendMessage({ action: 'clearCache' });
    renderStatus(response.stats);
    showToast('Moderation memory cleared.');
  } catch (_error) {
    showToast('Memory could not be cleared.');
  } finally {
    setButtonBusy(elements.clearCacheButton, false, 'Clear memory');
  }
}

async function resetSettings() {
  const previous = settings;
  settings = mergeSettings(DEFAULT_SETTINGS);
  renderSettings();
  setButtonBusy(elements.resetButton, true, 'Resetting');
  try {
    await sendMessage({ action: 'updateSettings', settings: DEFAULT_SETTINGS });
    showToast('Defaults restored. Back to a balanced watch.');
  } catch (_error) {
    settings = previous;
    renderSettings();
    showToast('Settings could not be reset.');
  } finally {
    setButtonBusy(elements.resetButton, false, 'Reset');
  }
}

async function retryBackend() {
  setButtonBusy(elements.retryBackend, true, 'Checking');
  try {
    const response = await sendMessage({ action: 'checkBackend' });
    renderStatus(response.status);
    showToast(response.status.backend === 'connected'
      ? 'Local model connected.'
      : 'Model is offline. Local fallback remains active.');
  } catch (_error) {
    renderServiceState('fallback');
  } finally {
    setButtonBusy(elements.retryBackend, false, 'Retry');
  }
}

async function refreshStatus() {
  try {
    const response = await sendMessage({ action: 'getStatus' });
    renderStatus(response.status);
  } catch (_error) {
    renderServiceState('fallback');
  }
}

function renderStatus(status = {}) {
  const metrics = status.metrics || {};
  const queue = status.queue || {};
  elements.incomingShielded.textContent = formatMetric(metrics.incomingShielded);
  elements.outgoingPaused.textContent = formatMetric(metrics.outgoingPaused);
  elements.cacheHits.textContent = formatMetric(queue.cacheHits);
  renderServiceState(status.backend || 'unknown');
}

function renderServiceState(state) {
  elements.serviceIndicator.dataset.state = state;
  if (state === 'connected') {
    elements.serviceTitle.textContent = 'Local model connected';
    elements.serviceDetail.textContent = 'Ollama handles deeper classification.';
    return;
  }

  if (state === 'fallback') {
    elements.serviceTitle.textContent = 'Using quick local checks';
    elements.serviceDetail.textContent = 'Start the backend for deeper analysis.';
    return;
  }

  elements.serviceTitle.textContent = 'Model status unknown';
  elements.serviceDetail.textContent = 'Local fallback is ready.';
}

function setButtonBusy(button, busy, label) {
  button.disabled = busy;
  button.textContent = label;
}

function formatMetric(value) {
  const number = Number(value || 0);
  return number > 999 ? '999+' : String(number);
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 2400);
}

async function sendMessage(payload) {
  const response = await chrome.runtime.sendMessage(payload);
  if (!response?.success) {
    throw new Error(response?.error || 'The extension service did not respond.');
  }
  return response;
}
