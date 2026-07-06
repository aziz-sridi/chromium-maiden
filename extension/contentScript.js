(function startChromiumMaiden() {
  'use strict';

  const api = window.chromiumMaidenApi;
  const dom = window.chromiumMaidenDom;
  if (!api || !dom || dom.platformName() === 'unsupported') return;

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

  const THRESHOLDS = {
    high: 0.25,
    medium: 0.4,
    low: 0.6
  };

  let settings = { ...DEFAULT_SETTINGS };
  let scanTimer = null;
  let positionFrame = null;
  let activePrompt = null;

  const incomingStates = new Map();
  const observedElements = new WeakSet();
  const shieldRecords = new Map();
  const outgoingStates = new WeakMap();
  const outgoingTimers = new WeakMap();
  const approvedTexts = new WeakMap();
  const approvedButtons = new WeakSet();

  const intersectionObserver = new IntersectionObserver(handleIntersections, {
    root: null,
    rootMargin: '180px 0px',
    threshold: 0.01
  });

  const mutationObserver = new MutationObserver(scheduleScan);

  initialize();

  async function initialize() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (response?.success) mergeSettings(response.settings);
    } catch (_error) {
      // Defaults keep the extension useful if storage is briefly unavailable.
    }

    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    document.addEventListener('input', handleEditableInput, true);
    document.addEventListener('keydown', handleKeydown, true);
    document.addEventListener('click', handleClick, true);
    window.addEventListener('scroll', scheduleShieldPositions, true);
    window.addEventListener('resize', scheduleShieldPositions);
    chrome.storage.onChanged.addListener(handleSettingsChanged);
    scheduleScan();
  }

  function mergeSettings(nextSettings = {}) {
    settings = {
      ...settings,
      ...nextSettings,
      platformsEnabled: {
        ...settings.platformsEnabled,
        ...(nextSettings.platformsEnabled || {})
      }
    };
  }

  function handleSettingsChanged(changes, areaName) {
    if (areaName !== 'sync') return;
    const patch = {};
    Object.entries(changes).forEach(([key, change]) => {
      patch[key] = change.newValue;
    });
    mergeSettings(patch);

    const incomingPolicyChanged = [
      'feature2Enabled',
      'filterAction',
      'sensitivityLevel',
      'platformsEnabled'
    ].some((key) => Object.prototype.hasOwnProperty.call(patch, key));
    if (!incomingEnabled() || incomingPolicyChanged) clearIncomingInterventions();
    scheduleScan();
  }

  function platformEnabled() {
    return settings.platformsEnabled?.[dom.platformName()] !== false;
  }

  function incomingEnabled() {
    return settings.feature2Enabled && platformEnabled();
  }

  function outgoingEnabled() {
    return settings.feature1Enabled && platformEnabled();
  }

  function sensitivityThreshold() {
    return THRESHOLDS[settings.sensitivityLevel] || THRESHOLDS.medium;
  }

  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      scanIncomingCandidates();
    }, 80);
  }

  function scanIncomingCandidates() {
    cleanupDetachedRecords();
    if (!incomingEnabled()) return;

    dom.getIncomingCandidates().forEach((element) => {
      if (!observedElements.has(element)) {
        observedElements.add(element);
        intersectionObserver.observe(element);
      } else if (isNearViewport(element)) {
        const text = dom.normalizedText(dom.elementText(element));
        const state = incomingStates.get(element);
        if (text && state?.text !== text) analyzeIncoming(element);
      }
    });
  }

  function handleIntersections(entries) {
    if (!incomingEnabled()) return;
    entries.forEach((entry) => {
      if (entry.isIntersecting) analyzeIncoming(entry.target);
    });
  }

  async function analyzeIncoming(element) {
    const text = dom.normalizedText(dom.elementText(element));
    if (!text || text.length > 2000) return;

    const previous = incomingStates.get(element);
    if (previous?.text === text && (previous.status === 'pending' || previous.status === 'done')) return;

    removeShield(element);
    const requestState = { text, status: 'pending' };
    incomingStates.set(element, requestState);
    element.classList.add('cm-pending');
    element.setAttribute('aria-busy', 'true');

    try {
      const result = await api.detectIncoming(text);
      const currentText = dom.normalizedText(dom.elementText(element));
      if (!element.isConnected || currentText !== text || incomingStates.get(element) !== requestState) return;

      requestState.status = 'done';
      requestState.result = result;
      element.classList.remove('cm-pending');
      element.removeAttribute('aria-busy');
      api.recordMetric('incomingChecked');

      const score = Number(result.hate_score ?? result.confidence ?? 0);
      if (result.is_hate && score >= sensitivityThreshold()) {
        applyShield(element, text, result);
        api.recordMetric('incomingShielded');
      }
    } catch (_error) {
      if (incomingStates.get(element) === requestState) {
        requestState.status = 'done';
        element.classList.remove('cm-pending');
        element.removeAttribute('aria-busy');
      }
    }
  }

  function applyShield(element, text, result) {
    const action = ['blur', 'hide', 'warn'].includes(settings.filterAction)
      ? settings.filterAction
      : 'blur';
    element.classList.add('cm-filtered', `cm-action-${action}`);

    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'cm-shield-control';
    control.setAttribute('aria-expanded', 'false');

    const marker = document.createElement('span');
    marker.className = 'cm-shield-marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = 'CM';

    const label = document.createElement('span');
    label.className = 'cm-shield-label';
    label.textContent = `Shielded ${friendlyCategory(result.category)}`;

    const actionLabel = document.createElement('span');
    actionLabel.className = 'cm-shield-action';
    actionLabel.textContent = action === 'warn' ? 'Details' : 'Reveal';

    control.append(marker, label, actionLabel);
    document.body.appendChild(control);

    const record = { element, text, result, control, action, revealed: action === 'warn' };
    shieldRecords.set(element, record);
    control.addEventListener('click', () => toggleShield(record));
    positionShield(record);
  }

  function toggleShield(record) {
    record.revealed = !record.revealed;
    record.element.classList.toggle('cm-revealed', record.revealed);
    record.control.setAttribute('aria-expanded', String(record.revealed));
    record.control.querySelector('.cm-shield-action').textContent = record.revealed ? 'Shield again' : 'Reveal';
    record.control.title = record.revealed
      ? record.result.reason || 'Potentially harmful language was detected.'
      : '';
    scheduleShieldPositions();
  }

  function friendlyCategory(category) {
    const labels = {
      violent_hate: 'a threat',
      discrimination: 'discrimination',
      harassment: 'harassment',
      insult: 'an insult'
    };
    return labels[category] || 'harmful language';
  }

  function scheduleShieldPositions() {
    if (positionFrame) return;
    positionFrame = requestAnimationFrame(() => {
      positionFrame = null;
      shieldRecords.forEach(positionShield);
    });
  }

  function positionShield(record) {
    if (!record.element.isConnected || !record.control.isConnected) return;
    const rect = record.element.getBoundingClientRect();
    const visible = rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    record.control.hidden = !visible;
    if (!visible) return;

    const controlRect = record.control.getBoundingClientRect();
    const left = Math.max(8, Math.min(
      window.innerWidth - controlRect.width - 8,
      rect.left + (rect.width - controlRect.width) / 2
    ));
    const top = Math.max(8, Math.min(
      window.innerHeight - controlRect.height - 8,
      rect.top + (rect.height - controlRect.height) / 2
    ));
    record.control.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
  }

  function removeShield(element) {
    const record = shieldRecords.get(element);
    if (record) record.control.remove();
    shieldRecords.delete(element);
    element.classList.remove('cm-filtered', 'cm-action-blur', 'cm-action-hide', 'cm-action-warn', 'cm-revealed');
  }

  function clearIncomingInterventions() {
    incomingStates.forEach((_state, element) => {
      element.classList.remove('cm-pending');
      element.removeAttribute('aria-busy');
      removeShield(element);
    });
    incomingStates.clear();
  }

  function cleanupDetachedRecords() {
    incomingStates.forEach((_state, element) => {
      if (!element.isConnected) {
        intersectionObserver.unobserve(element);
        removeShield(element);
        incomingStates.delete(element);
      }
    });
  }

  function isNearViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.bottom > -180 && rect.top < window.innerHeight + 180;
  }

  function handleEditableInput(event) {
    if (!outgoingEnabled()) return;
    const editable = dom.closestEditable(event.target);
    if (!editable) return;

    approvedTexts.delete(editable);
    const existingTimer = outgoingTimers.get(editable);
    if (existingTimer) clearTimeout(existingTimer);

    const text = dom.normalizedText(dom.elementText(editable));
    if (text.length < 3) {
      outgoingStates.delete(editable);
      return;
    }

    const timer = setTimeout(() => {
      outgoingTimers.delete(editable);
      ensureOutgoingResult(editable, text).catch(() => undefined);
    }, 450);
    outgoingTimers.set(editable, timer);
  }

  function handleKeydown(event) {
    if (!outgoingEnabled()) return;
    const editable = dom.closestEditable(event.target);
    if (!editable || !dom.isSendShortcut(event, editable)) return;

    const text = dom.normalizedText(dom.elementText(editable));
    if (!text) return;

    if (approvedTexts.get(editable) === text) {
      approvedTexts.delete(editable);
      return;
    }

    const state = outgoingStates.get(editable);
    if (state?.text === text && state.status === 'done') {
      if (!isHarmful(state.result)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showComposerPrompt(editable, state.result, null);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    ensureOutgoingResult(editable, text)
      .then((result) => {
        if (isHarmful(result)) showComposerPrompt(editable, result, null);
        else showToast('Looks clear. Send once more.');
      })
      .catch(() => showToast('Could not check that message. Please try again.'));
  }

  function handleClick(event) {
    if (!outgoingEnabled()) return;
    const button = dom.closestSendButton(event.target);
    if (!button) return;

    if (approvedButtons.has(button)) {
      approvedButtons.delete(button);
      return;
    }

    const editable = dom.findEditableForButton(button);
    const text = editable ? dom.normalizedText(dom.elementText(editable)) : '';
    if (!editable || !text) return;

    if (approvedTexts.get(editable) === text) {
      approvedTexts.delete(editable);
      return;
    }

    const state = outgoingStates.get(editable);
    if (state?.text === text && state.status === 'done') {
      if (!isHarmful(state.result)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showComposerPrompt(editable, state.result, button);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    ensureOutgoingResult(editable, text)
      .then((result) => {
        if (isHarmful(result)) {
          showComposerPrompt(editable, result, button);
        } else {
          approvedButtons.add(button);
          button.click();
        }
      })
      .catch(() => showToast('Could not check that message. It was not sent.'));
  }

  function ensureOutgoingResult(editable, text) {
    const current = outgoingStates.get(editable);
    if (current?.text === text) {
      if (current.status === 'done') return Promise.resolve(current.result);
      if (current.promise) return current.promise;
    }

    const state = { text, status: 'pending', result: null, promise: null };
    state.promise = api.detectOutgoing(text).then((result) => {
      const latestText = dom.normalizedText(dom.elementText(editable));
      if (latestText === text && outgoingStates.get(editable) === state) {
        state.status = 'done';
        state.result = result;
      }
      return result;
    }).catch((error) => {
      if (outgoingStates.get(editable) === state) outgoingStates.delete(editable);
      throw error;
    });
    outgoingStates.set(editable, state);
    return state.promise;
  }

  function isHarmful(result) {
    const score = Number(result?.hate_score ?? result?.confidence ?? 0);
    return Boolean(result?.is_hate && score >= sensitivityThreshold());
  }

  function showComposerPrompt(editable, result, triggerButton) {
    closeComposerPrompt();
    api.recordMetric('outgoingPaused');

    const panel = document.createElement('section');
    panel.className = 'cm-composer-prompt';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Chromium Maiden message check');

    const header = document.createElement('div');
    header.className = 'cm-composer-header';

    const avatar = document.createElement('img');
    avatar.className = 'cm-composer-avatar';
    avatar.src = chrome.runtime.getURL('mascots/default_maid/maid_meh.jpeg');
    avatar.alt = '';

    const headingGroup = document.createElement('div');
    const eyebrow = document.createElement('span');
    eyebrow.className = 'cm-composer-eyebrow';
    eyebrow.textContent = 'Chromium Maiden';
    const title = document.createElement('strong');
    title.textContent = 'That landed sharper than you may intend.';
    headingGroup.append(eyebrow, title);

    const closeButton = createButton('Close', 'cm-icon-button');
    closeButton.setAttribute('aria-label', 'Close message check');
    closeButton.textContent = '×';
    header.append(avatar, headingGroup, closeButton);

    const reason = document.createElement('p');
    reason.className = 'cm-composer-reason';
    const score = Math.round(Number(result.hate_score ?? result.confidence ?? 0) * 100);
    reason.textContent = `${friendlyCategory(result.category)} detected, ${score}% score. ${result.reason || ''}`.trim();

    const suggestions = document.createElement('div');
    suggestions.className = 'cm-suggestions';
    const suggestionLabel = document.createElement('span');
    suggestionLabel.className = 'cm-field-label';
    suggestionLabel.textContent = 'Try a calmer version';
    suggestions.appendChild(suggestionLabel);

    const alternatives = Array.isArray(result.suggested_alternatives)
      ? result.suggested_alternatives.filter(Boolean).slice(0, 3)
      : [];
    alternatives.forEach((alternative) => {
      const suggestion = createButton(alternative, 'cm-suggestion');
      suggestion.addEventListener('click', () => {
        dom.setEditableText(editable, alternative);
        closeComposerPrompt();
        showToast('Rewritten. Still your point, fewer sparks.');
      });
      suggestions.appendChild(suggestion);
    });

    if (alternatives.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'cm-suggestion-empty';
      empty.textContent = 'Keep the point. Remove the personal hit.';
      suggestions.appendChild(empty);
    }

    const actions = document.createElement('div');
    actions.className = 'cm-composer-actions';
    const editButton = createButton('Keep editing', 'cm-button cm-button-secondary');
    const sendButton = createButton('Send anyway', 'cm-button cm-button-quiet');
    actions.append(editButton, sendButton);

    panel.append(header, reason, suggestions, actions);
    document.body.appendChild(panel);
    activePrompt = { panel, editable };
    positionPrompt(panel, editable);

    closeButton.addEventListener('click', closeComposerPrompt);
    editButton.addEventListener('click', () => {
      closeComposerPrompt();
      editable.focus();
    });
    sendButton.addEventListener('click', () => {
      const text = dom.normalizedText(dom.elementText(editable));
      approvedTexts.set(editable, text);
      closeComposerPrompt();
      if (triggerButton?.isConnected) {
        approvedButtons.add(triggerButton);
        triggerButton.click();
      } else {
        editable.focus();
        showToast('Approved. Send once more.');
      }
    });

    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeComposerPrompt();
    });
    closeButton.focus();
  }

  function positionPrompt(panel, editable) {
    const rect = editable.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const left = Math.max(12, Math.min(window.innerWidth - panelRect.width - 12, rect.right - panelRect.width));
    const topAbove = rect.top - panelRect.height - 10;
    const top = topAbove >= 12
      ? topAbove
      : Math.min(window.innerHeight - panelRect.height - 12, rect.bottom + 10);
    panel.style.transform = `translate3d(${Math.round(left)}px, ${Math.max(12, Math.round(top))}px, 0)`;
  }

  function closeComposerPrompt() {
    if (!activePrompt) return;
    activePrompt.panel.remove();
    activePrompt = null;
  }

  function createButton(label, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    return button;
  }

  function showToast(message) {
    document.querySelector('.cm-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'cm-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('cm-toast-visible'));
    setTimeout(() => {
      toast.classList.remove('cm-toast-visible');
      setTimeout(() => toast.remove(), 180);
    }, 2600);
  }
})();
