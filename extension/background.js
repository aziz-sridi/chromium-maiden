'use strict';

importScripts('utils/moderationQueue.js');

const { ModerationQueue, localModerate } = self.ChromiumMaidenModeration;
const API_BASE_URL = 'http://127.0.0.1:8000';
const CACHE_STORAGE_KEY = 'chromiumMaidenModerationCache';
const BACKEND_RETRY_MS = 30 * 1000;

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

const sessionMetrics = {
  incomingChecked: 0,
  incomingShielded: 0,
  outgoingPaused: 0
};

let backendUnavailableUntil = 0;
let backendState = 'unknown';
let persistTimer = null;

const moderationQueue = new ModerationQueue({
  maxConcurrent: 3,
  maxCacheSize: 400,
  ttlMs: 30 * 60 * 1000,
  worker: moderateText
});

hydrateCache();

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  await chrome.storage.sync.set({
    ...DEFAULT_SETTINGS,
    ...current,
    platformsEnabled: {
      ...DEFAULT_SETTINGS.platformsEnabled,
      ...(current.platformsEnabled || {})
    }
  });
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  handleMessage(request)
    .then((payload) => sendResponse({ success: true, ...payload }))
    .catch((error) => sendResponse({ success: false, error: error.message }));
  return true;
});

async function handleMessage(request) {
  switch (request.action) {
    case 'moderate': {
      const result = await moderationQueue.enqueue(request.text, request.mode || 'incoming');
      scheduleCachePersist();
      return { result };
    }
    case 'getSettings': {
      const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
      return { settings };
    }
    case 'updateSettings': {
      await chrome.storage.sync.set(request.settings || {});
      return {};
    }
    case 'clearCache': {
      moderationQueue.clear();
      if (chrome.storage.session) {
        await chrome.storage.session.remove(CACHE_STORAGE_KEY);
      }
      return { stats: getStatus() };
    }
    case 'recordMetric': {
      if (Object.prototype.hasOwnProperty.call(sessionMetrics, request.name)) {
        sessionMetrics[request.name] += Number(request.amount || 1);
      }
      return { metrics: { ...sessionMetrics } };
    }
    case 'getStatus':
      return { status: getStatus() };
    case 'checkBackend':
      await checkBackendHealth(true);
      return { status: getStatus() };
    default:
      throw new Error(`Unknown action: ${request.action}`);
  }
}

async function moderateText(text, mode) {
  const localResult = localModerate(text);

  if (localResult.is_hate && localResult.confidence >= 0.84) {
    return localResult;
  }

  if (Date.now() < backendUnavailableUntil) {
    return { ...localResult, cacheTtlMs: BACKEND_RETRY_MS };
  }

  const controller = new AbortController();
  const timeoutMs = mode === 'outgoing' ? 8000 : 3500;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}/monitor/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Moderation API returned ${response.status}.`);
    }

    const payload = await response.json();
    backendState = 'connected';
    backendUnavailableUntil = 0;
    return normalizeBackendResult(payload);
  } catch (_error) {
    backendState = 'fallback';
    backendUnavailableUntil = Date.now() + BACKEND_RETRY_MS;
    return { ...localResult, cacheTtlMs: BACKEND_RETRY_MS };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeBackendResult(payload) {
  const score = Number(payload.hate_score || 0);
  const alternatives = Array.isArray(payload.suggested_alternatives)
    ? payload.suggested_alternatives.filter(Boolean).slice(0, 3)
    : [];

  return {
    is_hate: score >= 0.2 && payload.category !== 'none',
    hate_score: score,
    confidence: Number(payload.confidence || score),
    category: payload.category || 'none',
    reason: payload.reason || 'The moderation model found potentially harmful language.',
    suggested_alternative: payload.suggested_alternative || alternatives[0] || null,
    suggested_alternatives: alternatives.length > 0 ? alternatives : null,
    source: 'backend'
  };
}

async function checkBackendHealth(force = false) {
  if (!force && Date.now() < backendUnavailableUntil) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    backendState = response.ok ? 'connected' : 'fallback';
    if (response.ok) backendUnavailableUntil = 0;
    return response.ok;
  } catch (_error) {
    backendState = 'fallback';
    backendUnavailableUntil = Date.now() + BACKEND_RETRY_MS;
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function getStatus() {
  return {
    backend: backendState,
    queue: moderationQueue.snapshot(),
    metrics: { ...sessionMetrics }
  };
}

async function hydrateCache() {
  if (!chrome.storage.session) return;
  try {
    const stored = await chrome.storage.session.get(CACHE_STORAGE_KEY);
    moderationQueue.hydrate(stored[CACHE_STORAGE_KEY]);
  } catch (_error) {
    // Session persistence is an optimization. The in-memory cache still works.
  }
}

function scheduleCachePersist() {
  if (!chrome.storage.session || persistTimer) return;
  persistTimer = setTimeout(async () => {
    persistTimer = null;
    try {
      await chrome.storage.session.set({
        [CACHE_STORAGE_KEY]: moderationQueue.serialize()
      });
    } catch (_error) {
      // Ignore quota or availability errors and retain the in-memory cache.
    }
  }, 500);
}
