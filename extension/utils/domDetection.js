// Utility functions for detecting editable elements on social media platforms

const EDITABLE_SELECTORS = [
  // Instagram-specific selectors (prioritized)
  '[role="textbox"][contenteditable="true"]',
  'textarea[placeholder*="message" i]',
  '[aria-label*="Message" i][contenteditable="true"]',
  '[aria-label*="Add a comment" i]',
  '[aria-label*="Write a comment" i]',
  '[placeholder*="Add a comment" i]',
  'p[contenteditable="true"]',
  // General selectors
  'textarea',
  'input[type="text"]',
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
  '[role="textbox"]',
  '.DraftEditor-root',
  '[data-testid="tweet-text-textarea"]',
  '[data-testid="dmComposerTextInput"]',
  '.fb-comment-text',
  '.PageComposerFormDesktop textarea',
  '[placeholder*="comment" i]',
  '[placeholder*="tweet" i]',
  '[placeholder*="reply" i]',
  'form textarea[placeholder]',
  'form [contenteditable="true"]',
  'div[contenteditable="true"][role="textbox"]',
  // More generic but specific patterns
  'div[contenteditable="true"]',
  'span[contenteditable="true"]'
];

const SEND_BUTTON_SELECTORS = [
  'button[aria-label*="Send"]',
  'button[aria-label*="Post"]',
  'button[aria-label*="Comment"]',
  'button[aria-label*="Reply"]',
  'button[type="submit"]',
  '[data-testid="tweetButton"]',
  '[data-testid="dmComposerSendButton"]',
  '.PageComposerFormActionButtons button[type="button"]',
  '.fb-comment-reply-submit',
  '[aria-label="Send"]',
  '.compose-btn'
];

/**
 * Get all editable elements on the current page
 * @returns {Element[]} Array of editable elements
 */
function getEditableElements() {
  const elements = [];
  EDITABLE_SELECTORS.forEach(selector => {
    try {
      const found = document.querySelectorAll(selector);
      elements.push(...Array.from(found));
    } catch (e) {
      console.warn('Invalid selector:', selector);
    }
  });
  // Remove duplicates
  return Array.from(new Set(elements));
}

/**
 * Find the closest send button for a given editable element
 * @param {Element} editableElement - The editable element
 * @returns {Element|null} The send button or null
 */
function findSendButton(editableElement) {
  // Try finding in parent containers first
  let parent = editableElement.closest('form') || 
              editableElement.closest('[role="group"]') ||
              editableElement.closest('div');
  
  if (!parent) {
    parent = editableElement.parentElement?.parentElement?.parentElement;
  }

  if (parent) {
    for (const selector of SEND_BUTTON_SELECTORS) {
      try {
        const button = parent.querySelector(selector);
        if (button && isVisible(button)) return button;
      } catch (e) {
        console.warn('Invalid selector:', selector);
      }
    }
  }

  // Fallback: search in nearby elements
  const allButtons = document.querySelectorAll('button');
  for (const button of allButtons) {
    const label = button.getAttribute('aria-label')?.toLowerCase() || '';
    const text = button.textContent?.toLowerCase() || '';
    if ((label.includes('send') || label.includes('post') || label.includes('reply')) &&
        isVisible(button) &&
        button.offsetParent !== null) {
      return button;
    }
  }

  return null;
}

/**
 * Check if an element is visible in the viewport
 * @param {Element} element - The element to check
 * @returns {boolean} True if visible
 */
function isVisible(element) {
  return !!(element.offsetParent !== null);
}

/**
 * Extract text content from an editable element
 * @param {Element} element - The editable element
 * @returns {string} The extracted text
 */
function getEditableText(element) {
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    return element.value;
  } else if (element.contentEditable === 'true' || element.contentEditable === 'plaintext-only') {
    return element.textContent || element.innerText || '';
  }
  return '';
}

/**
 * Set text content in an editable element
 * @param {Element} element - The editable element
 * @param {string} text - The text to set
 */
function setEditableText(element, text) {
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    element.value = text;
    // Trigger input event to update UI
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (element.contentEditable === 'true' || element.contentEditable === 'plaintext-only') {
    element.textContent = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * Get currently active editable element (focused)
 * @returns {Element|null} The active element or null
 */
function getActiveEditableElement() {
  const active = document.activeElement;
  if (!active) return null;

  const editables = getEditableElements();
  if (editables.includes(active)) {
    return active;
  }
  return null;
}

// Expose functions globally for debugging and cross-script access
window.getEditableElements = getEditableElements;
window.findSendButton = findSendButton;
window.getEditableText = getEditableText;
window.setEditableText = setEditableText;
window.getActiveEditableElement = getActiveEditableElement;
