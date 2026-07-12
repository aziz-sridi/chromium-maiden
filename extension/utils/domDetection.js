(function attachDomUtilities(globalScope) {
  'use strict';

  const EDITABLE_SELECTOR = [
    'textarea',
    'input[type="text"]',
    '[contenteditable="true"]',
    '[contenteditable="plaintext-only"]',
    '[role="textbox"]'
  ].join(',');

  const SEND_BUTTON_SELECTOR = [
    'button[type="submit"]',
    'button[aria-label*="Send" i]',
    'button[aria-label*="Post" i]',
    'button[aria-label*="Reply" i]',
    'button[aria-label*="Comment" i]',
    '[data-testid="tweetButton"]',
    '[data-testid="tweetButtonInline"]',
    '[data-testid="dmComposerSendButton"]'
  ].join(',');

  const INCOMING_SELECTORS = {
    test: [
      '[data-cm-test-message]'
    ],
    facebook: [
      '[data-ad-comet-preview="message"]',
      '[aria-label*="Comment by" i]',
      '[aria-label*="Message by" i] [dir="auto"]',
      '[aria-label*="Messages in conversation with" i] [dir="auto"]'
    ],
    instagram: [
      'article ul li span[dir="auto"]',
      '[aria-label*="Messages in conversation with" i] [dir="auto"]',
      '[role="row"] [dir="auto"]'
    ],
    twitter: [
      '[data-testid="tweetText"]',
      '[data-testid="messageEntry"] [dir="auto"]'
    ]
  };

  function platformName(hostname = window.location.hostname) {
    if (document.documentElement.hasAttribute('data-cm-test')) return 'test';
    if (hostname.includes('facebook.com') || hostname.includes('messenger.com')) return 'facebook';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    return 'unsupported';
  }

  function normalizedText(text) {
    return String(text || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  }

  function elementText(element) {
    if (!element) return '';
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return normalizedText(element.value);
    }
    return normalizedText(element.innerText || element.textContent || '');
  }

  function isUsableIncomingElement(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.closest(EDITABLE_SELECTOR)) return false;
    if (element.querySelector(EDITABLE_SELECTOR)) return false;
    const text = elementText(element);
    if (text.length < 5 || text.length > 2000) return false;
    return true;
  }

  function getIncomingCandidates(root = document) {
    const platform = platformName();
    const selectors = INCOMING_SELECTORS[platform] || [];
    const found = new Set();

    selectors.forEach((selector) => {
      root.querySelectorAll(selector).forEach((element) => {
        if (isUsableIncomingElement(element)) found.add(element);
      });
    });

    const candidates = Array.from(found);
    return candidates.filter((candidate) => {
      return !candidates.some((other) => other !== candidate && candidate.contains(other));
    });
  }

  function getEditables(root = document) {
    const editables = Array.from(root.querySelectorAll(EDITABLE_SELECTOR));
    return editables.filter((element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (element.disabled || element.getAttribute('aria-disabled') === 'true') return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 20 && rect.height > 12;
    });
  }

  function closestEditable(target) {
    if (!(target instanceof Element)) return null;
    return target.closest(EDITABLE_SELECTOR);
  }

  function findEditableForButton(button) {
    const active = closestEditable(document.activeElement);
    if (active && elementText(active)) return active;

    const scope = button.closest('form, [role="dialog"], article, [data-testid]') || button.parentElement;
    if (!scope) return null;
    const candidates = getEditables(scope).filter((element) => elementText(element));
    return candidates[candidates.length - 1] || null;
  }

  function closestSendButton(target) {
    if (!(target instanceof Element)) return null;
    return target.closest(SEND_BUTTON_SELECTOR);
  }

  function isSendShortcut(event, editable) {
    if (event.key !== 'Enter' || event.shiftKey || event.altKey) return false;
    if (event.ctrlKey || event.metaKey) return true;

    const label = `${editable.getAttribute('aria-label') || ''} ${editable.getAttribute('placeholder') || ''}`.toLowerCase();
    if (/(comment|reply|message|chat)/.test(label)) return true;

    return platformName() === 'instagram' && editable.tagName !== 'TEXTAREA';
  }

  function setEditableText(element, text) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const prototype = element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (setter) setter.call(element, text);
      else element.value = text;
    } else {
      element.textContent = text;
    }

    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: text
    }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.focus();
  }

  globalScope.chromiumMaidenDom = {
    EDITABLE_SELECTOR,
    closestEditable,
    closestSendButton,
    elementText,
    findEditableForButton,
    getEditables,
    getIncomingCandidates,
    isSendShortcut,
    normalizedText,
    platformName,
    setEditableText
  };
})(window);
