// Content script for DOM interaction and hate speech detection
console.log('✅ Hate speech detection active');

// Settings
let settings = {
  feature1Enabled: true,
  feature2Enabled: true,
  filterAction: 'blur',
  platformsEnabled: {
    facebook: true,
    instagram: true,
    twitter: true
  }
};

const HATE_BADGE_TEXT = 'HS';

// Coin reward system
function awardCoins(amount, message) {
  chrome.storage.local.get(['coins'], (result) => {
    const currentCoins = result.coins || 1000;
    const newCoins = currentCoins + amount;
    
    chrome.storage.local.set({ coins: newCoins }, () => {
      console.log(`💰 Earned ${amount} coins! ${message}`);
      showCoinNotification(amount, message);
    });
  });
}

function showCoinNotification(amount, message) {
  const notification = document.createElement('div');
  notification.className = 'coin-notification';
  notification.innerHTML = `
    <span class="coin-icon">🪙</span>
    <div class="coin-message">
      <strong>+${amount}</strong>
      <p>${message}</p>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function injectIndicatorStyles() {
  if (document.getElementById('hateDetectStyles')) return;

  const style = document.createElement('style');
  style.id = 'hateDetectStyles';
  style.textContent = `
    .hate-detect-input-wrapper {
      position: relative !important;
      display: inline-block !important;
      width: 100%;
    }

    .hate-detect-ready {
      padding-right: 35px !important;
    }

    .hate-detect-active {
      outline: 2px solid rgba(231, 76, 60, 0.3);
      outline-offset: 2px;
    }

    /* Blur and warning styles for incoming content */
    .hate-content-blurred {
      position: relative !important;
      filter: blur(10px) !important;
      user-select: none !important;
      pointer-events: none !important;
      transition: filter 0.3s ease !important;
      background: none !important;
      opacity: 0.6 !important;
    }

    .hate-content-blurred.revealed {
      filter: none !important;
      pointer-events: auto !important;
      user-select: auto !important;
    }

    /* Floating FAB for unblurring - uses fixed positioning, appended to body */
    .hate-blur-fab {
      position: fixed !important;
      width: 40px !important;
      height: 40px !important;
      border-radius: 50% !important;
      background: #e74c3c !important;
      color: white !important;
      border: none !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 18px !important;
      z-index: 999999 !important;
      cursor: pointer !important;
      box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4) !important;
      transition: all 0.2s ease !important;
      pointer-events: auto !important;
      filter: none !important;
      isolation: isolate !important;
    }

    .hate-blur-fab:hover {
      background: #c0392b !important;
      transform: scale(1.1) !important;
      box-shadow: 0 6px 16px rgba(231, 76, 60, 0.5) !important;
    }

    .hate-blur-fab:active {
      transform: scale(0.95) !important;
    }

    /* Unblur menu that appears when FAB is clicked - uses fixed positioning, appended to body */
    .hate-unblur-menu {
      position: fixed !important;
      background: white !important;
      border: 1px solid #ddd !important;
      border-radius: 8px !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
      padding: 12px !important;
      min-width: 220px !important;
      z-index: 1000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
      animation: slideInUp 0.2s ease !important;
      pointer-events: auto !important;
      filter: none !important;
      isolation: isolate !important;
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .hate-unblur-menu-title {
      font-size: 11px !important;
      color: #666 !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      margin-bottom: 8px !important;
    }

    .hate-unblur-reason {
      font-size: 13px !important;
      color: #333 !important;
      padding: 8px 12px !important;
      background: #fff3cd !important;
      border-left: 3px solid #e74c3c !important;
      border-radius: 4px !important;
      margin-bottom: 12px !important;
      font-weight: 500 !important;
    }

    .hate-unblur-actions {
      display: flex !important;
      gap: 8px !important;
    }

    .hate-unblur-btn {
      flex: 1 !important;
      padding: 8px 12px !important;
      border: none !important;
      border-radius: 6px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      font-family: inherit !important;
    }

    .hate-unblur-btn-primary {
      background: #3498db !important;
      color: white !important;
    }

    .hate-unblur-btn-primary:hover {
      background: #2980b9 !important;
    }

    .hate-unblur-btn-secondary {
      background: #ecf0f1 !important;
      color: #333 !important;
    }

    .hate-unblur-btn-secondary:hover {
      background: #d5dbdb !important;
    }

    .hate-unblur-btn-rewrite {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
    }

    .hate-unblur-btn-rewrite:hover {
      background: linear-gradient(135deg, #5568d3 0%, #63397d 100%) !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3) !important;
    }

    /* Flagging styles - removed colored backgrounds */
    .hate-flag-mode {
      outline: 2px dashed #999 !important;
      outline-offset: 2px !important;
      cursor: pointer !important;
    }

    /* Inspect-style hover highlight - clean blue outline only */
    .hate-inspect-highlight {
      outline: 2px solid #1e90ff !important;
      outline-offset: 0px !important;
      cursor: crosshair !important;
      position: relative !important;
      background: rgba(30, 144, 255, 0.1) !important;
      box-shadow: 0 0 0 2px rgba(30, 144, 255, 0.3) !important;
    }

    .hate-inspect-tooltip {
      position: absolute !important;
      top: -30px !important;
      left: 0 !important;
      background: #1e90ff !important;
      color: white !important;
      padding: 5px 10px !important;
      border-radius: 3px !important;
      font-size: 12px !important;
      font-family: Consolas, monospace !important;
      z-index: 999999 !important;
      white-space: nowrap !important;
      pointer-events: none !important;
      font-weight: 600 !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
    }

    .hate-flag-menu {
      position: absolute !important;
      top: 100% !important;
      right: 0 !important;
      background: white !important;
      border: 1px solid #ccc !important;
      border-radius: 6px !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
      padding: 4px 0 !important;
      min-width: 240px !important;
      z-index: 10000 !important;
      margin-top: 5px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
    }

    .hate-flag-option {
      padding: 12px 16px !important;
      cursor: pointer !important;
      font-size: 14px !important;
      color: #333 !important;
      transition: all 0.15s ease !important;
      background: white !important;
      border: none !important;
      display: block !important;
      width: 100% !important;
      text-align: left !important;
    }

    .hate-flag-option:hover {
      background: #f0f0f0 !important;
    }

    .hate-flag-option:active {
      background: #e0e0e0 !important;
    }

    /* Detection visual indicators - different colors for different types */
    .hate-detect-dm {
      border: 3px solid #ff00ff !important;
      box-shadow: 0 0 10px rgba(255, 0, 255, 0.5) !important;
      transition: all 0.3s ease !important;
    }

    .hate-detect-post-message {
      border: 3px solid #00ffff !important;
      box-shadow: 0 0 10px rgba(0, 255, 255, 0.5) !important;
      transition: all 0.3s ease !important;
    }

    .hate-detect-comment {
      border: 3px solid #ffff00 !important;
      box-shadow: 0 0 10px rgba(255, 255, 0, 0.5) !important;
      transition: all 0.3s ease !important;
    }

    /* Coin notification */
    .coin-notification {
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #735AC1 0%, #8E82E3 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(115, 90, 193, 0.4);
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 12px;
      transform: translateX(400px);
      opacity: 0;
      transition: all 0.3s ease;
      max-width: 300px;
    }
    
    .coin-notification.show {
      transform: translateX(0);
      opacity: 1;
    }
    
    .coin-notification .coin-icon {
      font-size: 32px;
      animation: coinBounce 0.6s ease;
    }
    
    .coin-notification .coin-message strong {
      display: block;
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .coin-notification .coin-message p {
      font-size: 13px;
      opacity: 0.9;
      margin: 0;
    }
    
    @keyframes coinBounce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2) rotate(10deg); }
    }

    /* Animations */
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;

  document.head.appendChild(style);
}

// Load settings from storage
chrome.storage.sync.get(null, (data) => {
  if (data && Object.keys(data).length > 0) {
    settings = { ...settings, ...data };
  }
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    initializeExtension();
  }
});

/**
 * Initialize the extension
 */
function initializeExtension() {
  if (settings.feature1Enabled) {
    console.log('✅ Pre-send detection enabled');
    setupPreSendDetection();
  }
  
  if (settings.feature2Enabled) {
    console.log('✅ Incoming filtering enabled');
    setupIncomingFiltering();
  }
}

/**
 * FEATURE 1: Pre-Send Hate Detection
 */
function setupPreSendDetection() {
  injectIndicatorStyles();
  document.addEventListener('focusin', handleDocumentFocusIn, true);

  // Monitor for editable elements
  const observer = new MutationObserver(() => {
    attachSendListeners();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['contenteditable', 'role', 'aria-label', 'placeholder']
  });

  // Initial setup
  attachSendListeners();
  
  // For dynamic sites like Instagram, re-scan after delays
  const isInstagram = window.location.hostname.includes('instagram');
  if (isInstagram) {
    setTimeout(() => {
      attachSendListeners();
    }, 2000);
    setTimeout(() => {
      attachSendListeners();
    }, 5000);
  }
}

/**
 * Attach listeners to send buttons and editable elements
 */
function attachSendListeners() {
  const editables = getEditableElements();
  const hostname = window.location.hostname;
  console.log(`📝 [HATE-DETECT] Found ${editables.length} editable elements on ${hostname}:`);
  
  if (editables.length === 0) {
    console.warn('⚠️ [HATE-DETECT] No editable elements found on page');
    console.log('🔍 [HATE-DETECT] Trying manual detection for Instagram...');
    
    // Manual detection for Instagram
    if (hostname.includes('instagram')) {
      const manualSelectors = [
        'textarea',
        '[contenteditable="true"]',
        '[role="textbox"]',
        'div[contenteditable]',
        'form textarea',
        'form [contenteditable]'
      ];
      
      manualSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`  - ${selector}: found ${elements.length}`);
        elements.forEach((el, idx) => {
          console.log(`    Element ${idx}:`, {
            tag: el.tagName,
            contenteditable: el.getAttribute('contenteditable'),
            role: el.getAttribute('role'),
            ariaLabel: el.getAttribute('aria-label'),
            placeholder: el.getAttribute('placeholder'),
            visible: el.offsetHeight > 0
          });
        });
      });
    }
  }
  
  editables.forEach((element, index) => {
    if (element.__hateCheckListener) {
      console.log(`⏭️ [HATE-DETECT] Element ${index} already has listener, skipping`);
      return; // Already attached
    }
    
    console.log(`✅ [HATE-DETECT] Attaching listeners to element ${index}:`, {
      tag: element.tagName,
      contenteditable: element.getAttribute('contenteditable'),
      role: element.getAttribute('role'),
      ariaLabel: element.getAttribute('aria-label'),
      placeholder: element.getAttribute('placeholder')
    });
    
    // Attach keyboard listener for Enter/Ctrl+Enter
    element.addEventListener('keydown', handleKeyboardSend, true);
    element.__hateCheckListener = true;

    markEditableForDetection(element);

    // Find associated send button
    const sendButton = findSendButton(element);
    if (sendButton && !sendButton.__hateCheckListener) {
      console.log(`🔘 [HATE-DETECT] Found send button for element ${index}`);
      sendButton.addEventListener('click', (e) => handleSendButtonClick(e, element), true);
      sendButton.__hateCheckListener = true;
    }
  });
}

function markEditableForDetection(element) {
  if (!element) {
    console.warn('⚠️ [HATE-DETECT] markEditableForDetection called with null element');
    return;
  }
  
  if (element.__hateDetectMarked) {
    console.log('⏭️ [HATE-DETECT] Element already marked for detection');
    return;
  }

  console.log('🎯 [HATE-DETECT] Marking element for detection (listeners only, no  icon yet):', element);
  element.classList.add('hate-detect-ready');

  // Don't inject icon yet - only on focus
  // Icon will be injected in handleEditableFocus

  element.addEventListener('focus', handleEditableFocus, true);
  element.addEventListener('blur', handleEditableBlur, true);
  element.addEventListener('input', () => scheduleScoreUpdate(element));
  element.__hateDetectMarked = true;
  
  console.log('✅ [HATE-DETECT] Element marked successfully (ready for focus)');
}

// Track currently focused element to manage single icon
let currentFocusedElement = null;
let isClickingIcon = false; // Flag to prevent blur-based removal during icon clicks

function handleDocumentFocusIn(event) {
  console.log('👁️ [HATE-DETECT] Focus event detected on:', event.target);
  const editable = getEditableFromEventTarget(event.target);
  if (editable) {
    console.log('✅ [HATE-DETECT] Editable element focused:', editable);
    markEditableForDetection(editable);
    
    // Remove icon from previously focused element
    if (currentFocusedElement && currentFocusedElement !== editable) {
      console.log('🔄 [HATE-DETECT] Removing icon from previous element');
      removeIconFromElement(currentFocusedElement);
      currentFocusedElement.classList.remove('hate-detect-active');
    }
    
    currentFocusedElement = editable;
    editable.classList.add('hate-detect-active');
    
    // Inject icon only for focused element
    if (!editable.__hateDetectIcon) {
      console.log('🎨 [HATE-DETECT] Injecting icon for focused element...');
      injectIconIntoInput(editable);
    }
    
    scheduleScoreUpdate(editable);
  } else {
    console.log('⏭️ [HATE-DETECT] Focused element is not editable');
  }
}

function handleEditableFocus(event) {
  console.log('🎯 [HATE-DETECT] Element focus event:', event.target);
  const element = getEditableFromEventTarget(event.target) || event.target;
  
  // Remove icon from previously focused element
  if (currentFocusedElement && currentFocusedElement !== element) {
    console.log('🔄 [HATE-DETECT] Removing icon from previous element');
    removeIconFromElement(currentFocusedElement);
    currentFocusedElement.classList.remove('hate-detect-active');
  }
  
  currentFocusedElement = element;
  element.classList.add('hate-detect-active');
  
  // Inject icon only for focused element
  if (!element.__hateDetectIcon) {
    console.log('🎨 [HATE-DETECT] Injecting icon for newly focused element...');
    injectIconIntoInput(element);
  }
  
  console.log('✅ [HATE-DETECT] Added active class and icon to element');
}

function handleEditableBlur(event) {
  console.log('👋 [HATE-DETECT] Element blur event:', event.target);
  
  // Don't remove icon if we're clicking on it
  if (isClickingIcon) {
    console.log('🎯 [HATE-DETECT] User is clicking icon, keeping it visible');
    return;
  }
  
  const element = getEditableFromEventTarget(event.target) || event.target;
  
  // Small delay to allow icon clicks to complete
  setTimeout(() => {
    // Check again if user is still interacting with icon
    if (isClickingIcon) {
      console.log('🎯 [HATE-DETECT] Still interacting with icon, keeping visible');
      return;
    }
    
    element.classList.remove('hate-detect-active');
    
    // Remove icon when input loses focus (keeps UI clean)
    console.log('🧹 [HATE-DETECT] Removing icon from blurred element');
    removeIconFromElement(element);
    
    if (currentFocusedElement === element) {
      currentFocusedElement = null;
    }
    
    console.log('✅ [HATE-DETECT] Removed active class and icon from element');
  }, 150); // 150ms delay allows click events to register
}

function getEditableFromEventTarget(target) {
  if (!target) return null;
  if (target.closest) {
    try {
      const editable = target.closest('[contenteditable="true"], [contenteditable="plaintext-only"], textarea, input[type="text"], [role="textbox"]');
      if (editable) return editable;
    } catch (e) {
      console.log('⚠️ [HATE-DETECT] Error in getEditableFromEventTarget:', e.message);
    }
  }
  return null;
}

/**
 * Inject a Grammarly-style icon into an input field
 */
function injectIconIntoInput(element) {
  if (!element) {
    console.error('❌ [HATE-DETECT] Cannot inject icon: element is null');
    return;
  }
  
  if (element.__hateDetectIcon) {
    console.log('⏭️ [HATE-DETECT] Icon already exists for element');
    return;
  }
  
  console.log('🔨 [HATE-DETECT] Creating icon for element:', element);

  const icon = document.createElement('div');
  icon.className = 'hate-detect-icon';
  icon.__hateDetectElement = element;
  
  // Create shadow DOM for the icon
  const shadow = icon.attachShadow({ mode: 'open' });
  
  const style = document.createElement('style');
  style.textContent = `
    :host {
      position: absolute;
      bottom: 8px;
      right: 8px;
      z-index: 999999;
      cursor: pointer;
      pointer-events: auto;
    }
    
    .icon-button {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
      transition: all 0.2s ease;
      border: 2px solid rgba(255, 255, 255, 0.9);
    }
    
    .icon-button:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(231, 76, 60, 0.5);
    }
    
    .icon-button:active {
      transform: scale(0.95);
    }
    
    .icon-maid {
      width: 18px;
      height: 18px;
      object-fit: contain;
      border-radius: 3px;
      user-select: none;
    }
    
    .score-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #f39c12;
      color: white;
      font-size: 9px;
      font-weight: bold;
      padding: 2px 4px;
      border-radius: 8px;
      min-width: 16px;
      text-align: center;
      border: 1px solid white;
      display: none;
    }
    
    .score-badge.show {
      display: block;
    }
    
    .score-badge.high {
      background: #e74c3c;
    }
    
    .score-badge.medium {
      background: #f39c12;
    }
    
    .score-badge.low {
      background: #27ae60;
    }
  `;
  shadow.appendChild(style);
  
  const button = document.createElement('div');
  button.className = 'icon-button';
  
  // Get active mascot for icon
  chrome.storage.local.get(['activeTheme'], (result) => {
    const activeMascot = result.activeTheme || 'default';
    let iconImage = 'mascots/default_maid/';
    
    if (activeMascot === 'default' || !activeMascot) {
      iconImage += 'maid_ok.jpeg'; // Use default maid ok face for icon
    } else if (activeMascot === 'blondie') {
      iconImage = 'mascots/for_sale/blondie maid.png';
    } else if (activeMascot === 'gigia') {
      iconImage = 'mascots/for_sale/gigia.png';
    } else if (activeMascot === 'potato') {
      iconImage = 'mascots/for_sale/potato.png';
    }
    
    const iconImageUrl = chrome.runtime.getURL(iconImage);
    button.innerHTML = `<img src="${iconImageUrl}" class="icon-maid" alt="Maid">`;
  });
  
  const scoreBadge = document.createElement('div');
  scoreBadge.className = 'score-badge';
  scoreBadge.textContent = '0';
  button.appendChild(scoreBadge);
  
  shadow.appendChild(button);
  
  // Position the icon
  icon.style.cssText = `
    position: absolute !important;
    pointer-events: auto !important;
    z-index: 999999 !important;
  `;
  
  // Prevent icon clicks from blurring the input
  icon.addEventListener('mousedown', (e) => {
    console.log('🖱️ [HATE-DETECT] Icon mousedown - preventing input blur');
    e.preventDefault(); // Prevents input from losing focus
    e.stopPropagation();
    isClickingIcon = true;
  });
  
  icon.addEventListener('mouseup', (e) => {
    console.log('🖱️ [HATE-DETECT] Icon mouseup');
    // Reset flag after a short delay
    setTimeout(() => {
      isClickingIcon = false;
    }, 200);
  });
  
  // Click handler on the button inside shadow DOM
  button.addEventListener('click', (e) => {
    console.log('👆 [HATE-DETECT] Icon button clicked');
    e.preventDefault();
    e.stopPropagation();
    isClickingIcon = true;
    handleIconClick(element, shadow);
    // Reset flag after handler completes
    setTimeout(() => {
      isClickingIcon = false;
    }, 300);
  });
  
  // Also handle clicks on the shadow root container
  icon.addEventListener('click', (e) => {
    console.log('👆 [HATE-DETECT] Icon container clicked');
    e.preventDefault();
    e.stopPropagation();
  });
  
  // Position and append icon
  console.log('📍 [HATE-DETECT] Positioning and appending icon to body...');
  
  if (!document.body) {
    console.error('❌ [HATE-DETECT] document.body is not available yet!');
    // Retry after a short delay
    setTimeout(() => injectIconIntoInput(element), 100);
    return;
  }
  
  positionIcon(icon, element);
  document.body.appendChild(icon);
  console.log('✅ [HATE-DETECT] Icon appended to DOM');
  
  element.__hateDetectIcon = icon;
  icon.__hateDetectShadow = shadow;
  
  // Update position on scroll/resize
  const updatePosition = () => positionIcon(icon, element);
  window.addEventListener('scroll', updatePosition, true);
  window.addEventListener('resize', updatePosition, true);
  icon.__hateDetectPositionUpdate = updatePosition;
  
  console.log('🎉 [HATE-DETECT] Icon injection complete and visible!');
}

/**
 * Remove icon from an element
 */
function removeIconFromElement(element) {
  if (!element) {
    console.warn('⚠️ [HATE-DETECT] Cannot remove icon: element is null');
    return;
  }
  
  if (!element.__hateDetectIcon) {
    console.log('⏭️ [HATE-DETECT] No icon to remove from element');
    return;
  }
  
  console.log('🗑️ [HATE-DETECT] Removing icon from element:', element);
  
  const icon = element.__hateDetectIcon;
  
  // Remove event listeners
  if (icon.__hateDetectPositionUpdate) {
    window.removeEventListener('scroll', icon.__hateDetectPositionUpdate, true);
    window.removeEventListener('resize', icon.__hateDetectPositionUpdate, true);
    delete icon.__hateDetectPositionUpdate;
  }
  
  // Remove from DOM
  if (icon.parentNode) {
    icon.parentNode.removeChild(icon);
  }
  
  // Clear references
  delete element.__hateDetectIcon;
  delete icon.__hateDetectShadow;
  
  // Clear any pending score update timers
  if (scoreUpdateTimers.has(element)) {
    clearTimeout(scoreUpdateTimers.get(element));
    scoreUpdateTimers.delete(element);
    console.log('⏰ [HATE-DETECT] Cleared pending score update timer');
  }
  
  console.log('✅ [HATE-DETECT] Icon removed and cleaned up');
}

/**
 * Position icon relative to input field
 */
function positionIcon(icon, element) {
  if (!element || !icon) {
    console.warn('⚠️ [HATE-DETECT] Cannot position icon: missing element or icon');
    return;
  }
  
  const rect = element.getBoundingClientRect();
  console.log('📐 [HATE-DETECT] Element rect:', rect);
  
  if (rect.width === 0 && rect.height === 0) {
    console.log('⚠️ [HATE-DETECT] Element has no size, hiding icon');
    icon.style.display = 'none';
    return;
  }
  
  const top = rect.bottom - 32;
  const left = rect.right - 32;
  
  console.log(`📍 [HATE-DETECT] Positioning icon at top: ${top}px, left: ${left}px`);
  
  icon.style.display = 'block';
  icon.style.position = 'fixed';
  icon.style.top = `${top}px`;
  icon.style.left = `${left}px`;
  
  console.log('✅ [HATE-DETECT] Icon positioned');
}

/**
 * Handle icon click - show hate score and suggestions
 */
let currentScoreData = {};

async function handleIconClick(element, shadow) {
  isClickingIcon = true;
  
  const text = window.getEditableText ? window.getEditableText(element) : (element.value || element.textContent || '');
  
  if (!text || text.trim().length === 0) {
    showTooltip(shadow, 'No text to analyze', 'info');
    return;
  }
  
  showTooltip(shadow, 'Analyzing text...', 'loading');
  
  try {
    const result = await apiClient.detectHateSpeech(text);
    const hateScore = Math.round((result.confidence || result.score || 0) * 100);
    
    // Store score data
    currentScoreData[element] = result;
    
    // Update score badge
    updateScoreBadge(shadow, hateScore, result.is_hate);
    
    // Show detailed tooltip with message and rewrites
    const suggestions = generateSuggestions(result);
    showDetailedScore(shadow, hateScore, result.is_hate, suggestions, result.message, element);
    
    // Reset clicking flag after tooltip is shown
    setTimeout(() => {
      isClickingIcon = false;
    }, 500);
    
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    showTooltip(shadow, 'Error analyzing text', 'error');
    // Reset clicking flag on error too
    setTimeout(() => {
      isClickingIcon = false;
    }, 500);
  }
}

/**
 * Update the score badge on the icon
 */
function updateScoreBadge(shadow, score, isHate) {
  const badge = shadow.querySelector('.score-badge');
  if (!badge) return;
  
  badge.textContent = score;
  badge.classList.add('show');
  
  // Remove old classes
  badge.classList.remove('high', 'medium', 'low');
  
  // Add appropriate class based on score
  if (score >= 70) {
    badge.classList.add('high');
  } else if (score >= 40) {
    badge.classList.add('medium');
  } else {
    badge.classList.add('low');
  }
}

/**
 * Generate suggestions based on hate speech detection result
 */
function generateSuggestions(result) {
  const suggestions = [];
  
  // If backend provided rewrites, use them
  if (result.rewrites && result.rewrites.length > 0) {
    return result.rewrites;
  }
  
  // Otherwise, provide generic suggestions
  if (result.is_hate) {
    suggestions.push('Consider rephrasing your message to be more respectful');
    suggestions.push('Avoid using offensive or discriminatory language');
    suggestions.push('Focus on the issue rather than personal attacks');
  } else {
    suggestions.push('Your message looks good!');
    suggestions.push('Keep maintaining a respectful tone');
  }
  
  return suggestions;
}

/**
 * Show detailed score tooltip
 */
function showDetailedScore(shadow, score, isHate, suggestions, warningMessage = null, element = null) {
  // Remove existing tooltip
  const existingTooltip = shadow.querySelector('.score-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }
  
  const tooltip = document.createElement('div');
  tooltip.className = 'score-tooltip';
  
  const tooltipStyle = document.createElement('style');
  tooltipStyle.textContent = `
    .score-tooltip {
      position: absolute;
      bottom: 35px;
      right: 0;
      width: 280px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      z-index: 999999;
      animation: slideIn 0.2s ease;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .tooltip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .tooltip-title {
      font-size: 14px;
      font-weight: bold;
      color: #2c3e50;
    }
    
    .close-btn {
      cursor: pointer;
      font-size: 18px;
      color: #7f8c8d;
      line-height: 1;
      padding: 0 4px;
    }
    
    .close-btn:hover {
      color: #2c3e50;
    }
    
    .score-display {
      display: flex;
      flex-direction: row-reverse;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 12px;
      overflow: hidden;
    }
    
    .maid-mascot {
      width: 120px;
      height: 120px;
      object-fit: contain;
      border-radius: 8px;
    }
    
    .score-info {
      text-align: center;
    }
    
    .score-number {
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .score-number.high { color: #e74c3c; }
    .score-number.medium { color: #f39c12; }
    .score-number.low { color: #27ae60; }
    
    .score-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .warning-message {
      background: #fff3cd;
      border-left: 3px solid #f39c12;
      padding: 10px;
      margin-bottom: 12px;
      border-radius: 4px;
      font-size: 11px;
      color: #856404;
      line-height: 1.4;
    }
    
    .warning-message.high {
      background: #f8d7da;
      border-left-color: #e74c3c;
      color: #721c24;
    }
    
    .suggestions {
      margin-top: 12px;
    }
    
    .suggestions-title {
      font-size: 12px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 8px;
    }
    
    .suggestion-item {
      font-size: 11px;
      color: #555;
      padding: 6px 8px;
      background: #f8f9fa;
      border-radius: 4px;
      margin-bottom: 6px;
      line-height: 1.4;
    }
    
    .rewrite-item {
      font-size: 11px;
      color: #2c3e50;
      padding: 8px 10px;
      background: #e8f5e9;
      border: 1px solid #4caf50;
      border-radius: 4px;
      margin-bottom: 6px;
      line-height: 1.4;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .rewrite-item:hover {
      background: #c8e6c9;
      transform: translateX(2px);
    }
    
    .rewrite-label {
      font-size: 10px;
      color: #4caf50;
      font-weight: bold;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  `;
  shadow.appendChild(tooltipStyle);
  
  const scoreClass = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  const status = isHate ? 'Warning' : 'Safe';
  
  // Get active mascot from storage (default to default_maid)
  chrome.storage.local.get(['activeTheme'], (result) => {
    const activeMascot = result.activeTheme || 'default';
    
    let maidFolder = 'default_maid';
    if (activeMascot === 'blondie') {
      maidFolder = 'for_sale';
    } else if (activeMascot === 'gigia') {
      maidFolder = 'for_sale';
    } else if (activeMascot === 'potato') {
      maidFolder = 'for_sale';
    }
    
    // Determine which emotion/image to show based on score
    let maidImage = `mascots/${maidFolder}/`;
    if (maidFolder === 'default_maid') {
      if (score >= 70) {
        maidImage += 'maid_angry.jpeg';
      } else if (score >= 50) {
        maidImage += 'maid_mad.jpeg';
      } else if (score >= 30) {
        maidImage += 'maid_meh.jpeg';
      } else {
        maidImage += 'maid_ok.jpeg';
      }
    } else {
      // For purchased mascots, just show the single image
      if (activeMascot === 'blondie') {
        maidImage += 'blondie maid.png';
      } else if (activeMascot === 'gigia') {
        maidImage += 'gigia.png';
      } else if (activeMascot === 'potato') {
        maidImage += 'potato.png';
      }
    }
    
    const maidImageUrl = chrome.runtime.getURL(maidImage);
    
    // Build warning message HTML
    let warningHTML = '';
    if (warningMessage && isHate) {
      const warningClass = score >= 70 ? 'high' : '';
      warningHTML = `<div class="warning-message ${warningClass}">${warningMessage}</div>`;
    }
    
    // Build suggestions/rewrites HTML
    let suggestionsHTML = '';
    if (suggestions && suggestions.length > 0) {
      if (isHate && suggestions.length > 0 && suggestions[0] !== 'Your message looks good!') {
        // These are rewrites - make them clickable
        suggestionsHTML = `
          <div class="suggestions">
            <div class="suggestions-title">💡 Suggested Rewrites (click to apply):</div>
            ${suggestions.map((s, index) => `
              <div class="rewrite-item" data-rewrite-index="${index}">
                ${s}
              </div>
            `).join('')}
          </div>
        `;
      } else {
        // These are general suggestions
        suggestionsHTML = `
          <div class="suggestions">
            <div class="suggestions-title">Suggestions:</div>
            ${suggestions.map(s => `<div class="suggestion-item">• ${s}</div>`).join('')}
          </div>
        `;
      }
    }
    
    renderTooltip(tooltip, shadow, maidImageUrl, scoreClass, score, status, warningHTML, suggestionsHTML, element, suggestions);
  });
}

function renderTooltip(tooltip, shadow, maidImageUrl, scoreClass, score, status, warningHTML, suggestionsHTML, element, suggestions) {
  
  tooltip.innerHTML = `
    <div class="tooltip-header">
      <div class="tooltip-title">Hate Speech Score</div>
      <div class="close-btn">×</div>
    </div>
    <div class="score-display">
      <img src="${maidImageUrl}" class="maid-mascot" alt="Maid">
      <div class="score-info">
        <div class="score-number ${scoreClass}">${score}</div>
        <div class="score-label">${status}</div>
      </div>
    </div>
    ${warningHTML}
    ${suggestionsHTML}
  `;
  
  shadow.appendChild(tooltip);
  
  // Prevent tooltip clicks from blurring the input
  tooltip.addEventListener('mousedown', (e) => {
    e.preventDefault(); // Prevents input from losing focus
    isClickingIcon = true;
  });
  
  // Close button handler
  const closeBtn = tooltip.querySelector('.close-btn');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    tooltip.remove();
    // Keep the icon visible after closing tooltip
    isClickingIcon = false;
  });
  
  // Rewrite click handlers - store suggestions array for retrieval
  const rewriteItems = tooltip.querySelectorAll('.rewrite-item');
  
  rewriteItems.forEach((item, idx) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const rewriteIndex = parseInt(item.getAttribute('data-rewrite-index'));
      const rewriteText = suggestions[rewriteIndex];
      
      if (!rewriteText || !element) {
        return;
      }
      
      try {
        let success = false;
        const oldValue = element.value || element.textContent || '';
        
        // Method 1: For INPUT/TEXTAREA elements
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
          element.value = rewriteText;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.selectionStart = element.selectionEnd = rewriteText.length;
          success = element.value === rewriteText;
        } 
        // Method 2: For contentEditable elements (Facebook/Instagram/Twitter)
        else if (element.contentEditable === 'true' || element.contentEditable === 'plaintext-only') {
          element.focus();
          
          // Try document.execCommand first (works on most modern browsers)
          try {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            document.execCommand('insertText', false, rewriteText);
            success = true;
          } catch (e) {
            // Fallback: Find and replace all text nodes
            const replaceTextNodes = (node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                node.textContent = rewriteText;
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                // For lexical-text spans (Facebook/Meta)
                if (node.hasAttribute('data-lexical-text')) {
                  node.textContent = rewriteText;
                } else {
                  // Recursively replace in children
                  Array.from(node.childNodes).forEach(replaceTextNodes);
                }
              }
            };
            replaceTextNodes(element);
            success = true;
          }
          
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        if (success) {
          console.log('🔄 Text replaced:', oldValue.substring(0, 30) + '... → ' + rewriteText.substring(0, 30) + '...');
          element.focus();
          awardCoins(10, 'used a rewrite 🎉');
        } else {
          console.error('❌ Replacement failed');
        }
        
      } catch (error) {
        console.error('❌ Text swap error:', error.message);
      }
      
      // Close tooltip
      tooltip.remove();
      isClickingIcon = false;
      
      // Re-analyze the new text
      setTimeout(() => scheduleScoreUpdate(element), 500);
    });
  });
  
  // Auto-hide after 15 seconds (longer for rewrites)
  setTimeout(() => {
    if (tooltip.parentNode) {
      tooltip.remove();
    }
  }, 15000);
}

/**
 * Show simple tooltip
 */
function showTooltip(shadow, message, type = 'info') {
  const existingTooltip = shadow.querySelector('.simple-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }
  
  const tooltip = document.createElement('div');
  tooltip.className = 'simple-tooltip';
  
  const tooltipStyle = document.createElement('style');
  tooltipStyle.textContent = `
    .simple-tooltip {
      position: absolute;
      bottom: 35px;
      right: 0;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      animation: fadeIn 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  shadow.appendChild(tooltipStyle);
  
  tooltip.textContent = message;
  shadow.appendChild(tooltip);
  
  setTimeout(() => {
    if (tooltip.parentNode) {
      tooltip.remove();
    }
  }, 2000);
}

/**
 * Schedule automatic score update as user types
 */
let scoreUpdateTimers = new Map();

async function scheduleScoreUpdate(element) {
  if (!element) {
    console.warn('⚠️ [HATE-DETECT] scheduleScoreUpdate called with null element');
    return;
  }
  
  if (!element.__hateDetectIcon) {
    console.warn('⚠️ [HATE-DETECT] Element has no icon yet, skipping score update');
    return;
  }
  
  console.log('⏰ [HATE-DETECT] Scheduling score update...');
  
  // Clear existing timer for this element
  if (scoreUpdateTimers.has(element)) {
    clearTimeout(scoreUpdateTimers.get(element));
    console.log('🔄 [HATE-DETECT] Cleared previous timer');
  }
  
  // Set new timer (debounce)
  const timer = setTimeout(async () => {
    const text = window.getEditableText ? window.getEditableText(element) : (element.value || element.textContent || '');
    
    if (!text || text.trim().length === 0) {
      // Reset badge if no text
      const icon = element.__hateDetectIcon;
      if (icon && icon.__hateDetectShadow) {
        const badge = icon.__hateDetectShadow.querySelector('.score-badge');
        if (badge) {
          badge.classList.remove('show');
        }
      }
      return;
    }
    
    try {
      console.log('📡 [HATE-DETECT] Calling API for score update...');
      const result = await apiClient.detectHateSpeech(text);
      console.log('✅ [HATE-DETECT] API response:', result);
      const hateScore = Math.round((result.confidence || result.score || 0) * 100);
      console.log('📊 [HATE-DETECT] Calculated score:', hateScore);
      
      // Update the badge
      const icon = element.__hateDetectIcon;
      if (icon && icon.__hateDetectShadow) {
        console.log('🎨 [HATE-DETECT] Updating badge...');
        updateScoreBadge(icon.__hateDetectShadow, hateScore, result.is_hate);
        currentScoreData[element] = result;
        console.log('✅ [HATE-DETECT] Badge updated successfully');
      } else {
        console.warn('⚠️ [HATE-DETECT] Icon or shadow not found for badge update');
      }
    } catch (error) {
      console.error('❌ [HATE-DETECT] Error updating score:', error);
      console.error('❌ [HATE-DETECT] Error stack:', error.stack);
    }
  }, 1000); // Wait 1 second after user stops typing
  
  scoreUpdateTimers.set(element, timer);
  console.log('⏰ [HATE-DETECT] Timer set for 1 second');
}

/**
 * Handle keyboard send (Enter or Ctrl+Enter)
 */
function handleKeyboardSend(event) {
  const isEnter = event.key === 'Enter';
  const isCtrlEnter = (event.ctrlKey || event.metaKey) && event.key === 'Enter';
  
  if (!isEnter && !isCtrlEnter) return;
  
  // Check if we need Ctrl for this platform
  const needsCtrl = isPlatform('twitter') || isPlatform('facebook');
  if (isEnter && needsCtrl && !event.ctrlKey && !event.metaKey) {
    // This might just be a line break
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const element = event.target;
  const text = window.getEditableText ? window.getEditableText(element) : (element.value || element.textContent || '');

  processTextForSending(text, element);
}

/**
 * Handle send button click
 */
function handleSendButtonClick(event, editableElement) {
  const text = window.getEditableText ? window.getEditableText(editableElement) : (editableElement ? (editableElement.value || editableElement.textContent || '') : '');
  
  if (text.trim().length === 0) return;

  event.preventDefault();
  event.stopPropagation();

  processTextForSending(text, editableElement);
}

/**
 * Process text and check for hate speech before sending
 */
async function processTextForSending(text, editableElement) {
  if (text.trim().length === 0) return;

  // Show loading indicator
  showLoadingIndicator(editableElement);

  try {
    const result = await apiClient.detectHateSpeech(text);

    const threshold = getSensitivityThreshold();
    if (!result.is_hate || result.confidence < threshold) {
      // Safe to send
      hideLoadingIndicator(editableElement);
      actuallyAllowSend(editableElement);
    } else {
      // Hate detected - show modal
      hideLoadingIndicator(editableElement);
      showHateDetectionModal(text, editableElement, result);
    }
  } catch (error) {
    console.error('Error processing text:', error);
    hideLoadingIndicator(editableElement);
    actuallyAllowSend(editableElement); // Fail open
  }
}

/**
 * Show hate detection modal
 */
function showHateDetectionModal(originalText, editableElement, detectionResult) {
  // Remove any existing modals
  const existing = document.getElementById('hateDetectionModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'hateDetectionModal';
  modal.innerHTML = `
    <div class="hate-modal-overlay"></div>
    <div class="hate-modal-container">
      <div class="hate-modal-header">
        <h2>⚠️ Potentially Harmful Message</h2>
        <button class="hate-modal-close" aria-label="Close">✕</button>
      </div>
      <div class="hate-modal-content">
        <p class="hate-modal-message">
          This message may be interpreted as ${detectionResult.category || 'hateful'}.
        </p>
        <div class="hate-modal-confidence">
          <span class="confidence-label">Confidence:</span>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${detectionResult.confidence * 100}%"></div>
          </div>
          <span class="confidence-value">${Math.round(detectionResult.confidence * 100)}%</span>
        </div>
        <div class="hate-modal-preview">
          <p class="hate-preview-label">Your message:</p>
          <p class="hate-preview-text">"${originalText}"</p>
        </div>
      </div>
      <div class="hate-modal-actions">
        <button class="hate-btn hate-btn-cancel" data-action="cancel">Cancel</button>
        <button class="hate-btn hate-btn-rewrite" data-action="rewrite">Rewrite Respectfully</button>
        <button class="hate-btn hate-btn-send" data-action="send-anyway">Send Anyway</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Attach event listeners
  const closeBtn = modal.querySelector('.hate-modal-close');
  const cancelBtn = modal.querySelector('[data-action="cancel"]');
  const rewriteBtn = modal.querySelector('[data-action="rewrite"]');
  const sendBtn = modal.querySelector('[data-action="send-anyway"]');
  const overlay = modal.querySelector('.hate-modal-overlay');

  const closeModal = () => {
    modal.remove();
    editableElement.focus();
  };

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  rewriteBtn.addEventListener('click', async () => {
    await handleRewriteRequest(originalText, editableElement, modal);
  });

  sendBtn.addEventListener('click', () => {
    modal.remove();
    actuallyAllowSend(editableElement);
  });
}

/**
 * Handle rewrite request
 */
async function handleRewriteRequest(originalText, editableElement, oldModal) {
  oldModal.remove();

  // Show loading
  const modal = document.createElement('div');
  modal.id = 'hateRewriteModal';
  modal.innerHTML = `
    <div class="hate-modal-overlay"></div>
    <div class="hate-modal-container">
      <div class="hate-modal-header">
        <h2>✏️ Rewrite Your Message</h2>
      </div>
      <div class="hate-modal-content hate-loading">
        <p>Rewriting your message respectfully...</p>
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  try {
    const rewrittenText = await apiClient.rewriteText(originalText);

    // Replace modal content
    modal.querySelector('.hate-modal-content').innerHTML = `
      <div class="hate-modal-comparison">
        <div class="comparison-item">
          <p class="comparison-label">Original:</p>
          <p class="comparison-text original">"${originalText}"</p>
        </div>
        <div class="comparison-arrow">→</div>
        <div class="comparison-item">
          <p class="comparison-label">Rewritten:</p>
          <textarea class="hate-rewrite-textarea" id="hateRewriteTextarea">${rewrittenText}</textarea>
        </div>
      </div>
    `;

    // Update actions
    modal.querySelector('.hate-modal-actions').innerHTML = `
      <button class="hate-btn hate-btn-cancel" data-action="cancel">Cancel</button>
      <button class="hate-btn hate-btn-edit" data-action="edit">Edit More</button>
      <button class="hate-btn hate-btn-accept" data-action="accept">Accept & Send</button>
    `;

    // Attach new listeners
    const closeBtn = modal.querySelector('[data-action="cancel"]');
    const editBtn = modal.querySelector('[data-action="edit"]');
    const acceptBtn = modal.querySelector('[data-action="accept"]');

    const closeModal = () => {
      modal.remove();
      editableElement.focus();
    };

    closeBtn.addEventListener('click', closeModal);
    editBtn.addEventListener('click', () => {
      const textarea = document.getElementById('hateRewriteTextarea');
      textarea.focus();
      textarea.select();
    });

    acceptBtn.addEventListener('click', () => {
      const textarea = document.getElementById('hateRewriteTextarea');
      const finalText = textarea.value;
      modal.remove();
      
      // Use window.setEditableText with fallback
      if (window.setEditableText) {
        window.setEditableText(editableElement, finalText);
      } else {
        // Fallback: set text directly
        if (editableElement.tagName === 'TEXTAREA' || editableElement.tagName === 'INPUT') {
          editableElement.value = finalText;
        } else if (editableElement.contentEditable === 'true' || editableElement.contentEditable === 'plaintext-only') {
          editableElement.textContent = finalText;
        }
        // Trigger events
        editableElement.dispatchEvent(new Event('input', { bubbles: true }));
        editableElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      actuallyAllowSend(editableElement);
    });
  } catch (error) {
    console.error('Rewrite error:', error);
    modal.remove();
  }
}

/**
 * Actually allow the message to be sent (bypass interception)
 */
function actuallyAllowSend(editableElement) {
  const sendButton = findSendButton(editableElement);
  
  if (sendButton) {
    // Temporarily disable our listener
    sendButton.__allowSend = true;
    sendButton.click();
    delete sendButton.__allowSend;
  } else {
    // Try keyboard
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
    });
    editableElement.dispatchEvent(event);
  }
}

/**
 * FEATURE 2: Incoming Content Filtering
 * Monitor DOM for hateful messages and blur them
 */
let checkedElements = new WeakSet(); // Track already-checked elements

function setupIncomingFiltering() {
  console.log('✅ Incoming content filtering active (optimized for visible content only)');
  
  // Use Intersection Observer to detect visible messages
  const intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !checkedElements.has(entry.target)) {
        // Message is visible and hasn't been checked yet
        const type = entry.target.__messageType || 'unknown';
        checkSingleElement(entry.target, type);
      }
    });
  }, {
    root: null, // viewport
    threshold: 0.1 // 10% visible
  });
  
  // Mutation observer to find NEW elements only
  const mutationObserver = new MutationObserver(() => {
    // Only observe new visible messages
    observeVisibleMessages(intersectionObserver);
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false
  });

  // Initial scan after short delay
  setTimeout(() => {
    console.log('🔍 Initial content scan (visible only)...');
    observeVisibleMessages(intersectionObserver);
  }, 1000);
  
  // Re-scan periodically for new content (less frequent)
  setInterval(() => {
    observeVisibleMessages(intersectionObserver);
  }, 10000); // Reduced from 5s to 10s
}

/**
 * Set up observers for currently visible messages
 */
function observeVisibleMessages(intersectionObserver) {
  const messageElements = getMessageElements();
  console.log(`🔍 [BLUR] Found ${messageElements.length} total messages, observing unchecked ones...`);
  
  let newCount = 0;
  messageElements.forEach(item => {
    if (!checkedElements.has(item.element) && !item.element.__hateFiltered) {
      item.element.__messageType = item.type;
      intersectionObserver.observe(item.element);
      newCount++;
    }
  });
  
  if (newCount > 0) {
    console.log(`👀 Now observing ${newCount} new messages for visibility`);
  }
}

/**
 * Check a single element for hate speech
 */
async function checkSingleElement(element, type) {
  console.log(`  - Checking visible element: ${element.tagName}, type: ${type}`);
  
  // Mark as being checked
  checkedElements.add(element);
  
  if (element.__hateFiltered) {
    console.log('    ⏭️ Already filtered');
    return;
  }

  // Find the deepest text-containing div
  const textElement = findDeepestTextDiv(element);
  if (!textElement) {
    console.log('    ⏭️ No text element found');
    return;
  }

  const text = textElement.textContent;
  if (!text || text.trim().length === 0 || text.length > 10000) {
    console.log('    ⏭️ Invalid text length:', text?.length);
    return;
  }
  
  console.log(`    📝 Analyzing text: "${text.substring(0, 50)}..."`);

  // Mark as filtered
  element.__hateFiltered = true;

  // Call API to detect hate speech
  try {
    console.log('    🔄 Calling API...');
    const result = await apiClient.detectHateSpeech(text);
    console.log(`    📊 API result: is_hate=${result.is_hate}, score=${result.score}`);
    
    if (result.is_hate && result.score >= 0.4) {
      console.log(`    ⚠️ Hate detected (${Math.round(result.score * 100)}%): Applying blur`);
      applyBlurOverlay(textElement, {
        category: result.category || 'harmful content',
        confidence: result.score,
        message: result.message,
        rewrites: result.rewrites || [],
        originalText: text
      });
      
      // Award coins for protecting user from hate speech
      awardCoins(5, 'blocked something bad 🛡️');
    } else {
      console.log('    ✅ Content is safe');
    }
  } catch (error) {
    console.error('    ❌ Detection failed:', error.message);
  }
}

/**
 * Legacy function - now handled by checkSingleElement and observeVisibleMessages
 * Kept for backwards compatibility
 */
async function filterHateContent() {
  // This function is no longer used - filtering now happens automatically
  // when messages become visible via Intersection Observer
  console.log('⚠️ filterHateContent called but is deprecated - using visible-only detection');
}

/**
 * Get all potential message elements from Facebook and Instagram with type classification
 */
function getMessageElements() {
  const elements = [];
  const hostname = window.location.hostname;
  
  // Generic detection for test pages and other sites
  // Look for role="article" or common comment patterns
  const genericComments = document.querySelectorAll('[role="article"], .comment-body, [data-test-comment="true"]');
  if (genericComments.length > 0) {
    console.log(`📝 Found ${genericComments.length} generic comments/articles`);
    genericComments.forEach(comment => {
      if (hasTextContent(comment) && !comment.__hateFiltered) {
        elements.push({ element: comment, type: 'comment' });
      }
    });
  }
  
  // Facebook DM detection
  if (hostname.includes('facebook.com') || hostname.includes('messenger.com')) {
    
    // Facebook Messenger DMs - limit to conversation containers
    const conversationContainers = document.querySelectorAll('[aria-label*="Messages in conversation with"]');
    console.log(`  - Found ${conversationContainers.length} Facebook conversation containers`);
    conversationContainers.forEach(container => {
      const messages = container.querySelectorAll('[class*="chat-outgoing-message-bubble"], [class*="chat-incoming-message-bubble"], [role="row"] [dir="auto"]');
      messages.forEach(msg => {
        if (hasTextContent(msg)) {
          elements.push({ element: msg, type: 'dm' });
        }
      });
    });
    
    // Facebook posts with messages (look for any element with "message" in attributes)
    const fbPosts = document.querySelectorAll('[data-pagelet="FeedUnit"], [role="article"]');
    console.log(`  - Found ${fbPosts.length} Facebook posts`);
    fbPosts.forEach(post => {
      // Look for any element with "message" in any attribute (name or value)
      const allElements = post.querySelectorAll('*');
      const messageDivs = Array.from(allElements).filter(el => {
        return Array.from(el.attributes || []).some(attr => 
          attr.value.toLowerCase().includes('message')
        );
      });
      
      console.log(`    - Found ${messageDivs.length} message elements in post`);
      
      messageDivs.forEach(msg => {
        if (hasTextContent(msg)) {
          elements.push({ element: msg, type: 'post-message' });
        }
      });
    });
    
    // Facebook comments - aria-label="Comment by"
    const fbComments = document.querySelectorAll('[aria-label*="Comment by"]');
    console.log(`  - Found ${fbComments.length} Facebook comments`);
    fbComments.forEach(comment => {
      if (hasTextContent(comment)) {
        elements.push({ element: comment, type: 'comment' });
      }
    });
  }
  
  // Instagram DM detection
  if (hostname.includes('instagram.com')) {
    console.log('📸 [HATE-DETECT] Instagram detected - scanning DMs and comments...');
    
    // Instagram DMs - limit to conversation containers
    const igConversations = document.querySelectorAll('[aria-label*="Messages in conversation with"]');
    console.log(`  - Found ${igConversations.length} Instagram conversation containers`);
    igConversations.forEach(container => {
      const messages = container.querySelectorAll('[role="row"] [dir="auto"], [class*="message"]');
      messages.forEach(msg => {
        if (hasTextContent(msg)) {
          elements.push({ element: msg, type: 'dm' });
        }
      });
    });
    
    // Instagram comments
    const igComments = document.querySelectorAll('[role="button"][tabindex="0"] > span, article span[dir="auto"]');
    console.log(`  - Found ${igComments.length} Instagram comments`);
    igComments.forEach(comment => {
      if (hasTextContent(comment) && !isInsideConversation(comment)) {
        elements.push({ element: comment, type: 'comment' });
      }
    });
  }
  
  // Twitter/X detection (keep existing)
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    console.log('🐦 [HATE-DETECT] Twitter/X detected - scanning tweets...');
    const tweets = document.querySelectorAll('[data-testid="tweet"], [data-testid="tweetText"]');
    console.log(`  - Found ${tweets.length} tweets`);
    tweets.forEach(tweet => {
      if (hasTextContent(tweet)) {
        elements.push({ element: tweet, type: 'post-message' });
      }
    });
  }
  
  // Remove duplicates based on element reference
  const uniqueElements = Array.from(
    new Map(elements.map(item => [item.element, item])).values()
  ).filter(item => {
    const rect = item.element.getBoundingClientRect();
    return rect.width > 10 && rect.height > 10;
  });
  
  console.log(`✅ [HATE-DETECT] Total unique content elements found: ${uniqueElements.length}`);
  return uniqueElements;
}

/**
 * Check if element has meaningful text content
 */
function hasTextContent(element) {
  if (!element) return false;
  const text = element.textContent ? element.textContent.trim() : '';
  return text.length > 5;
}

/**
 * Check if element is inside a conversation container
 */
function isInsideConversation(element) {
  return !!element.closest('[aria-label*="Messages in conversation with"]') ||
         !!element.closest('[aria-label*="Conversation with"]');
}

/**
 * Find the deepest div that contains text (last child with text)
 */
function findDeepestTextDiv(element) {
  if (!element) return null;
  
  let deepestDiv = null;
  let maxDepth = 0;
  
  function traverse(el, depth) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
    
    const tagName = el.tagName.toLowerCase();
    
    // Check if this is a div with text content
    if (tagName === 'div' && hasTextContent(el)) {
      if (depth > maxDepth) {
        maxDepth = depth;
        deepestDiv = el;
      }
    }
    
    // Traverse children
    for (let child of el.children) {
      traverse(child, depth + 1);
    }
  }
  
  // Start traversal
  traverse(element, 0);
  
  // If no div found, return the element itself if it has text
  return deepestDiv || (hasTextContent(element) ? element : null);
}

/**
 * Find the best element to blur - the last/deepest div containing text
 */
function findSmallestTextElement(element) {
  if (!element) return null;
  
  // Function to check if element is primarily text (not buttons/links)
  function isPrimaryTextElement(el) {
    const tag = el.tagName.toLowerCase();
    // Skip non-text elements
    if (['button', 'a', 'input', 'select', 'textarea', 'svg', 'img', 'video', 'audio'].includes(tag)) {
      return false;
    }
    
    // Check if has text content
    const text = el.textContent ? el.textContent.trim() : '';
    return text.length > 5;
  }
  
  // Start with the parent element
  let bestElement = element;
  
  // Look for the deepest div or text container
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function(node) {
        if (isPrimaryTextElement(node)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    }
  );
  
  let deepestTextContainer = null;
  let maxDepth = 0;
  let currentDepth = 0;
  
  // Find the deepest element with text
  let node = walker.nextNode();
  while (node) {
    currentDepth++;
    if (currentDepth > maxDepth) {
      maxDepth = currentDepth;
      deepestTextContainer = node;
    }
    node = walker.nextNode();
  }
  
  // Return the deepest text container, or the whole element if none found
  return deepestTextContainer || element;
}

/**
 * Apply blur to potentially harmful content
 */
function applyBlurOverlay(element, detectionResult) {
  // Don't apply if already has overlay
  if (element.__hateOverlay) {
    console.log('⏭️ [HATE-DETECT] Element already has overlay, skipping');
    return;
  }
  
  // Only blur if element has text content
  const textContent = element.textContent ? element.textContent.trim() : '';
  if (!textContent || textContent.length < 5) {
    console.log('⏭️ [HATE-DETECT] Skipping element with no text content');
    return;
  }
  
  const isUserFlagged = detectionResult.userFlagged || false;
  console.log(`🚨 [HATE-DETECT] Applying blur to ${isUserFlagged ? 'user-flagged' : 'detected'} content`);
  console.log('🔍 [HATE-DETECT] Original element:', element);
  
  // Find the best text element to blur
  const targetBlurElement = findSmallestTextElement(element);
  
  // Apply blur to the target element
  targetBlurElement.classList.add('hate-content-blurred');
  
  // Also add inline styles to ensure blur is applied
  targetBlurElement.style.filter = 'blur(10px)';
  targetBlurElement.style.opacity = '0.6';
  targetBlurElement.style.userSelect = 'none';
  targetBlurElement.style.pointerEvents = 'none';
  
  const reason = isUserFlagged 
    ? detectionResult.category
    : (detectionResult.category || 'potentially harmful content');
  
  let isBlurred = true; // Track blur state
  
  // Create floating FAB button with fixed positioning
  const fab = document.createElement('button');
  fab.className = 'hate-blur-fab';
  fab.innerHTML = '🚨';
  fab.title = 'View reason and unblur';
  
  // Calculate position relative to viewport
  const updateFabPosition = () => {
    const rect = element.getBoundingClientRect();
    fab.style.cssText = `
      position: fixed !important;
      left: ${rect.right - 48}px !important;
      top: ${rect.bottom - 48}px !important;
      width: 40px !important;
      height: 40px !important;
      border-radius: 50% !important;
      background: #e74c3c !important;
      color: white !important;
      border: none !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 18px !important;
      z-index: 999999 !important;
      cursor: pointer !important;
      box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4) !important;
      transition: all 0.2s ease !important;
      pointer-events: auto !important;
      filter: none !important;
    `;
  };
  
  updateFabPosition();
  
  // Update position on scroll/resize
  const updateInterval = setInterval(() => {
    if (!document.body.contains(element)) {
      clearInterval(updateInterval);
      if (fab.parentNode) fab.remove();
      return;
    }
    updateFabPosition();
  }, 100);
  
  // Function to toggle blur state
  const toggleBlur = (shouldBlur) => {
    isBlurred = shouldBlur;
    if (shouldBlur) {
      targetBlurElement.classList.add('hate-content-blurred');
      targetBlurElement.classList.remove('revealed');
      targetBlurElement.style.filter = 'blur(10px)';
      targetBlurElement.style.opacity = '0.6';
      targetBlurElement.style.userSelect = 'none';
      targetBlurElement.style.pointerEvents = 'none';
      fab.innerHTML = '🚨';
      const rect = element.getBoundingClientRect();
      fab.style.background = '#e74c3c';
      fab.title = 'View reason and unblur';
    } else {
      targetBlurElement.classList.remove('hate-content-blurred');
      targetBlurElement.classList.add('revealed');
      targetBlurElement.style.filter = 'none';
      targetBlurElement.style.opacity = '1';
      targetBlurElement.style.userSelect = 'auto';
      targetBlurElement.style.pointerEvents = 'auto';
      fab.innerHTML = '👁️';
      fab.style.background = '#3498db';
      fab.title = 'Blur again';
    }
  };
  
  // Click FAB to show unblur menu
  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Remove existing menu if any
    const existingMenu = document.querySelector('.hate-unblur-menu');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }
    
    // Create menu based on current blur state
    const menu = document.createElement('div');
    menu.className = 'hate-unblur-menu';
    
    // Calculate position relative to FAB button
    const fabRect = fab.getBoundingClientRect();
    const menuTop = fabRect.top - 0; // Position above FAB with some spacing
    const menuLeft = fabRect.left - 180; // Align to the right of FAB
    
    menu.style.cssText = `
      position: fixed !important;
      left: ${menuLeft}px !important;
      top: ${menuTop}px !important;
      transform: translateY(-100%) translateY(-15px) !important;
      background: white !important;
      border: 1px solid #ddd !important;
      border-radius: 8px !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
      padding: 12px !important;
      min-width: 220px !important;
      z-index: 1000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
      pointer-events: auto !important;
      filter: none !important;
    `;
    
    if (isBlurred) {
      // Show menu with Unblur, Rewrite, and Keep Blurred options (always show rewrite)
      menu.innerHTML = `
        <div class="hate-unblur-menu-title">Content Filtered</div>
        <div class="hate-unblur-reason">${reason}</div>
        ${detectionResult.message ? `<div class="hate-unblur-reason" style="font-size: 11px; margin-top: 4px; color: #666;">${detectionResult.message}</div>` : ''}
        <div class="hate-unblur-actions">
          <button class="hate-unblur-btn hate-unblur-btn-primary" data-action="unblur">👁️ Unblur</button>
          <button class="hate-unblur-btn hate-unblur-btn-rewrite" data-action="rewrite">✨ Rewrite</button>
          <button class="hate-unblur-btn hate-unblur-btn-secondary" data-action="keep">Keep Blurred</button>
        </div>
      `;
      
      // Handle unblur action
      menu.querySelector('[data-action="unblur"]').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBlur(false);
        menu.remove();
      });
      
      // Handle rewrite action - always available
      menu.querySelector('[data-action="rewrite"]').addEventListener('click', async (e) => {
        e.stopPropagation();
        
        const rewriteBtn = e.target;
        const originalBtnText = rewriteBtn.innerHTML;
        
        try {
          let rewriteText;
          
          // Check if we already have rewrites
          if (detectionResult.rewrites && detectionResult.rewrites.length > 0) {
            rewriteText = detectionResult.rewrites[0];
          } else {
            // Fetch rewrite from API
            rewriteBtn.innerHTML = '⏳ Loading...';
            rewriteBtn.disabled = true;
            
            const originalText = detectionResult.originalText || targetBlurElement.textContent;
            const result = await apiClient.detectHateSpeech(originalText);
            
            if (result.rewrites && result.rewrites.length > 0) {
              rewriteText = result.rewrites[0];
            } else {
              throw new Error('No rewrites available');
            }
          }
          
          if (!rewriteText) {
            throw new Error('Rewrite text is empty');
          }
          
          const oldText = targetBlurElement.textContent;
          
          // Replace text in all text nodes and lexical spans
          const replaceAllText = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              node.textContent = rewriteText;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              // Handle Facebook/Meta lexical-text spans
              if (node.hasAttribute('data-lexical-text')) {
                node.textContent = rewriteText;
              } else if (node.tagName === 'SPAN' || node.tagName === 'DIV') {
                // For regular spans/divs, replace all children
                Array.from(node.childNodes).forEach(replaceAllText);
              }
            }
          };
          
          // Start replacement from target element
          replaceAllText(targetBlurElement);
          
          // Verify the change
          const newText = targetBlurElement.textContent;
          if (newText.includes(rewriteText.substring(0, 20))) {
            console.log('🔄 Text replaced:', oldText.substring(0, 30) + '... → ' + rewriteText.substring(0, 30) + '...');
            
            // Unblur after rewriting
            toggleBlur(false);
            menu.remove();
          } else {
            throw new Error('Text replacement verification failed');
          }
          
        } catch (error) {
          console.error('❌ Rewrite error:', error.message);
          rewriteBtn.innerHTML = originalBtnText;
          rewriteBtn.disabled = false;
          
          // Show detailed error
          const errorMsg = error.message.includes('No rewrites') 
            ? 'No alternative text available for this content.'
            : 'Could not modify this content. It may be protected by the platform.';
          alert(errorMsg);
        }
      });
      
      // Handle keep blurred action
      menu.querySelector('[data-action="keep"]').addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('🚫 [HATE-DETECT] User chose to keep content blurred');
        menu.remove();
      });
    } else {
      // Content is unblurred, show option to blur again
      menu.innerHTML = `
        <div class="hate-unblur-menu-title">Content Visible</div>
        <div class="hate-unblur-reason">Originally flagged: ${reason}</div>
        <div class="hate-unblur-actions">
          <button class="hate-unblur-btn hate-unblur-btn-primary" data-action="blur">🚨 Blur Again</button>
          <button class="hate-unblur-btn hate-unblur-btn-secondary" data-action="close">Close</button>
        </div>
      `;
      
      // Handle blur again action
      menu.querySelector('[data-action="blur"]').addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('🚨 [HATE-DETECT] User chose to blur content again');
        toggleBlur(true);
        menu.remove();
      });
      
      menu.querySelector('[data-action="close"]').addEventListener('click', (e) => {
        e.stopPropagation();
        menu.remove();
      });
    }
    
    document.body.appendChild(menu);
    
    // Close menu when clicking outside
    setTimeout(() => {
      const closeHandler = (e) => {
        if (!menu.contains(e.target) && e.target !== fab) {
          menu.remove();
          document.removeEventListener('click', closeHandler, true);
        }
      };
      document.addEventListener('click', closeHandler, true);
    }, 100);
  });
  
  // Append FAB to document.body instead of element
  document.body.appendChild(fab);
  element.__hateOverlay = fab;
  element.__blurredChild = targetBlurElement;
  
  console.log('✅ [HATE-DETECT] Blur applied successfully to:', targetBlurElement);
  console.log('🔴 [HATE-DETECT] Red flag button added to:', element);
}

/**
 * Apply filter action to hateful content (legacy function, keeping for compatibility)
 */
function applyFilterAction(element, detectionResult) {
  // Use the new blur overlay method
  applyBlurOverlay(element, detectionResult);
}

/**
 * FEATURE 3: Click-to-Flag Functionality (Inspect-Style)
 * Allows users to flag content that bothers them with element inspection
 */
let flagModeActive = false;
let flaggedElements = new Set();
let currentHighlightedElement = null;
let highlightTooltip = null;
let hoverEventsDisabled = false;

// Initialize flag mode listener
function initializeFlagMode() {
  console.log('🚩 [HATE-DETECT] Initializing flag mode...');
  
  // Listen for keyboard shortcut (Ctrl+Shift+F to toggle flag mode)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      toggleFlagMode();
    }
  });
  
  // Listen for clicks when flag mode is active
  document.addEventListener('click', handleFlagClick, true);
  
  // Listen for mouse movement to highlight elements (inspect-style)
  document.addEventListener('mouseover', handleFlagHover, true);
  document.addEventListener('mouseout', handleFlagHoverOut, true);
  
  console.log('✅ [HATE-DETECT] Flag mode initialized (Ctrl+Shift+F to toggle)');
}

function toggleFlagMode() {
  flagModeActive = !flagModeActive;
  console.log(`🚩 [HATE-DETECT] Flag mode ${flagModeActive ? 'ACTIVATED' : 'DEACTIVATED'}`);
  
  // Visual feedback
  if (flagModeActive) {
    showFlagModeNotification('🔍 Inspect Mode Active - Hover over content to inspect, click to flag');
    document.body.style.cursor = 'crosshair';
    hoverEventsDisabled = false; // Ensure hover is enabled when activating
  } else {
    showFlagModeNotification('Inspect Mode Deactivated');
    document.body.style.cursor = '';
    hoverEventsDisabled = false; // Reset hover events flag
    
    // Clean up any highlights
    if (currentHighlightedElement) {
      currentHighlightedElement.classList.remove('hate-inspect-highlight', 'locked');
      currentHighlightedElement = null;
    }
    if (highlightTooltip) {
      highlightTooltip.remove();
      highlightTooltip = null;
    }
  }
}

function handleFlagHover(e) {
  if (!flagModeActive || hoverEventsDisabled || !e.target) return;
  
  const targetElement = findFlaggableElement(e.target);
  if (!targetElement || targetElement === currentHighlightedElement) return;
  
  // Remove previous highlight
  if (currentHighlightedElement) {
    currentHighlightedElement.classList.remove('hate-inspect-highlight');
  }
  if (highlightTooltip) {
    highlightTooltip.remove();
  }
  
  // Add new highlight
  currentHighlightedElement = targetElement;
  targetElement.classList.add('hate-inspect-highlight');
  
  // Create tooltip with element info
  highlightTooltip = document.createElement('div');
  highlightTooltip.className = 'hate-inspect-tooltip';
  
  const tagName = targetElement.tagName.toLowerCase();
  const className = targetElement.className ? `.${targetElement.className.split(' ')[0]}` : '';
  const id = targetElement.id ? `#${targetElement.id}` : '';
  const textContent = targetElement.textContent ? targetElement.textContent.trim() : '';
  const textPreview = textContent.substring(0, 30) + (textContent.length > 30 ? '...' : '');
  
  highlightTooltip.textContent = `${tagName}${id}${className} | "${textPreview}"`;
  
  // Position tooltip
  const rect = targetElement.getBoundingClientRect();
  highlightTooltip.style.position = 'fixed';
  highlightTooltip.style.top = `${rect.top - 30}px`;
  highlightTooltip.style.left = `${rect.left}px`;
  
  document.body.appendChild(highlightTooltip);
}

function handleFlagHoverOut(e) {
  if (!flagModeActive || hoverEventsDisabled || !e.target) return;
  
  const targetElement = findFlaggableElement(e.target);
  
  // Only process if we have valid elements and are truly leaving
  if (!currentHighlightedElement || !targetElement) return;
  if (targetElement !== currentHighlightedElement) return;
  if (!e.relatedTarget) return;
  
  // Check if we're still inside the element
  if (targetElement.contains(e.relatedTarget)) return;
  
  // Only remove if we're truly leaving the element
  setTimeout(() => {
    if (currentHighlightedElement && currentHighlightedElement.matches && !currentHighlightedElement.matches(':hover')) {
      currentHighlightedElement.classList.remove('hate-inspect-highlight');
      currentHighlightedElement = null;
      if (highlightTooltip) {
        highlightTooltip.remove();
        highlightTooltip = null;
      }
    }
  }, 100);
}

function showFlagModeNotification(message) {
  // Create notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    font-weight: 600;
    animation: slideInRight 0.3s ease;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function handleFlagClick(e) {
  if (!flagModeActive) return;
  
  // Prevent default action
  e.preventDefault();
  e.stopPropagation();
  
  // Find the closest message/comment element
  const targetElement = findFlaggableElement(e.target);
  
  if (!targetElement) {
    console.log('⚠️ [HATE-DETECT] No flaggable element found');
    return;
  }
  
  console.log('🚩 [HATE-DETECT] Element clicked for flagging:', targetElement);
  console.log('🔒 [HATE-DETECT] Locking element and disabling hover');
  
  // Lock the element (keep it highlighted and stop hover events)
  targetElement.classList.add('hate-inspect-highlight', 'locked');
  if (currentHighlightedElement && currentHighlightedElement !== targetElement) {
    currentHighlightedElement.classList.remove('hate-inspect-highlight', 'locked');
  }
  currentHighlightedElement = targetElement;
  
  // Completely disable hover events
  document.removeEventListener('mouseover', handleFlagHover, true);
  document.removeEventListener('mouseout', handleFlagHoverOut, true);
  hoverEventsDisabled = true;
  console.log('✅ [HATE-DETECT] Hover events disabled');
  
  // Show flag menu immediately
  showFlagMenu(targetElement, e.clientX, e.clientY);
}

function findFlaggableElement(target) {
  // Skip if clicking on blur flag or button
  if (!target || !target.closest) {
    return null;
  }
  
  try {
    if (target.closest('.hate-blur-fab, .hate-unblur-menu, .hate-unblur-btn, .hate-flag-menu')) {
      return null;
    }
  } catch (e) {
    console.log('⚠️ [HATE-DETECT] Error checking closest:', e.message);
    return null;
  }
  
  // Try to find a message, comment, or post element
  const selectors = [
    '[aria-label*="Comment by"]',
    '[aria-label*="Conversation with"]',
    '[class*="message"]',
    '[class*="chat-"]',
    '[role="article"]',
    '[role="row"]',
    '.comment',
    '[data-testid="tweet"]',
    '[data-testid="tweetText"]',
    '[data-pagelet*="FeedUnit"]'
  ];
  
  // Check if target or any parent matches known selectors
  if (target && target.closest) {
    for (const selector of selectors) {
      try {
        const element = target.closest(selector);
        if (element && element.textContent && element.textContent.trim().length > 5) {
          return element;
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }
  }
  
  // If nothing specific found, intelligently traverse up to find content container
  let current = target;
  let bestCandidate = null;
  let bestScore = 0;
  
  if (!current) return null;
  
  for (let i = 0; i < 8; i++) {
    if (!current || !current.parentElement) break;
    current = current.parentElement;
    
    // Skip if already filtered or has no text
    if (current.__hateFiltered || current.__hateOverlay) continue;
    
    // Get element dimensions and text content
    const rect = current.getBoundingClientRect();
    const textContent = current.textContent ? current.textContent.trim() : '';
    const textLength = textContent.length;
    
    // Skip elements with no meaningful text
    if (textLength < 5) continue;
    const hasChildren = current.children.length > 0 && current.children.length < 20;
    
    // Calculate a score for this element
    let score = 0;
    
    // Prefer elements with text (5-1000 chars)
    if (textLength > 5 && textLength < 1000) score += 10;
    if (textLength > 20) score += 5;
    
    // Prefer reasonable dimensions
    if (rect.width > 100 && rect.width < 800) score += 5;
    if (rect.height > 30 && rect.height < 600) score += 5;
    
    // Prefer elements with some structure
    if (hasChildren) score += 3;
    
    // Bonus for semantic tags
    const tag = current.tagName.toLowerCase();
    if (['article', 'section', 'div', 'li'].includes(tag)) score += 2;
    
    // Update best candidate
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = current;
    }
  }
  
  // Return best candidate if score is good enough
  if (bestScore > 10) {
    return bestCandidate;
  }
  
  return null;
}

function showFlagMenu(element, x, y) {
  // Remove any existing menu
  const existingMenu = document.querySelector('.hate-flag-menu');
  if (existingMenu) existingMenu.remove();
  
  // Create flag menu
  const menu = document.createElement('div');
  menu.className = 'hate-flag-menu';
  menu.style.cssText = `
    position: fixed !important;
    left: ${x}px !important;
    top: ${y}px !important;
  `;
  
  const options = [
    { label: '😡 Hate Speech', value: 'hate' },
    { label: '🤬 Offensive Language', value: 'offensive' },
    { label: '👿 Harassment', value: 'harassment' },
    { label: '😰 Makes Me Uncomfortable', value: 'uncomfortable' },
    { label: '❌ Cancel', value: 'cancel' }
  ];
  
  options.forEach(option => {
    const optionDiv = document.createElement('div');
    optionDiv.className = 'hate-flag-option';
    optionDiv.textContent = option.label;
    
    optionDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      
      menu.remove();
      
      if (option.value !== 'cancel') {
        flagElement(element, option.value, option.label);
        // Re-enable hover events after selection
        hoverEventsDisabled = false;
        document.addEventListener('mouseover', handleFlagHover, true);
        document.addEventListener('mouseout', handleFlagHoverOut, true);
        console.log('✅ [HATE-DETECT] Hover events re-enabled after flagging');
        // Exit flag mode after successful flagging
        toggleFlagMode();
      } else {
        // Just unlock and re-enable hover
        if (currentHighlightedElement) {
          currentHighlightedElement.classList.remove('hate-inspect-highlight', 'locked');
          currentHighlightedElement = null;
        }
        hoverEventsDisabled = false;
        document.addEventListener('mouseover', handleFlagHover, true);
        document.addEventListener('mouseout', handleFlagHoverOut, true);
        console.log('✅ [HATE-DETECT] Hover events re-enabled after cancel');
      }
    });
    
    menu.appendChild(optionDiv);
  });
  
  document.body.appendChild(menu);
  
  // Remove menu if clicking outside
  setTimeout(() => {
    const removeMenu = (e) => {
      if (!menu || !e.target) return;
      if (!menu.contains(e.target)) {
        menu.remove();
        if (currentHighlightedElement) {
          currentHighlightedElement.classList.remove('hate-inspect-highlight', 'locked');
          currentHighlightedElement = null;
        }
        // Re-enable hover events
        hoverEventsDisabled = false;
        document.addEventListener('mouseover', handleFlagHover, true);
        document.addEventListener('mouseout', handleFlagHoverOut, true);
        console.log('✅ [HATE-DETECT] Hover events re-enabled after clicking outside');
        document.removeEventListener('click', removeMenu);
      }
    };
    document.addEventListener('click', removeMenu);
  }, 100);
}

function flagElement(element, flagType, flagLabel) {
  console.log(`🚩 [HATE-DETECT] Flagging element as: ${flagType}`);
  
  // Remove inspect highlight
  if (currentHighlightedElement) {
    currentHighlightedElement.classList.remove('hate-inspect-highlight', 'locked');
    currentHighlightedElement = null;
  }
  if (highlightTooltip) {
    highlightTooltip.remove();
    highlightTooltip = null;
  }
  
  // Apply blur overlay to flagged content
  applyBlurOverlay(element, {
    category: flagLabel,
    confidence: 1.0,
    userFlagged: true
  });
  
  // Store flag info
  flaggedElements.add(element);
  element.__flagType = flagType;
  element.__flagLabel = flagLabel;
  element.__flagTimestamp = Date.now();
  element.__hateFiltered = true; // Mark as filtered to avoid re-processing
  
  // TODO: Send to API or storage for tracking
  console.log('✅ [HATE-DETECT] Element flagged and blurred:', {
    type: flagType,
    label: flagLabel,
    text: element.textContent.substring(0, 100),
    html: element.outerHTML.substring(0, 200)
  });
  
  showFlagModeNotification(`✅ Content flagged and hidden: "${flagLabel}"`);
}

// Initialize flag mode when extension loads
if (settings.feature2Enabled) {
  initializeFlagMode();
}

/**
 * Get sensitivity threshold (0-1)
 */
function getSensitivityThreshold() {
  return 0.6;
}

/**
 * Check if current platform is enabled
 */
function isPlatform(name) {
  const url = window.location.href;
  if (name === 'facebook') return url.includes('facebook.com');
  if (name === 'instagram') return url.includes('instagram.com');
  if (name === 'twitter') return url.includes('twitter.com') || url.includes('x.com');
  return false;
}

/**
 * Loading indicator helpers
 */
function showLoadingIndicator(element) {
  const indicator = document.createElement('div');
  indicator.className = 'hate-loading-indicator';
  indicator.innerHTML = '<span class="loading-dot"></span> Checking...';
  indicator.style.position = 'absolute';
  indicator.style.bottom = '-30px';
  
  const parent = element.parentElement;
  parent.style.position = 'relative';
  parent.appendChild(indicator);
  
  element.__loadingIndicator = indicator;
}

function hideLoadingIndicator(element) {
  if (element.__loadingIndicator) {
    element.__loadingIndicator.remove();
    delete element.__loadingIndicator;
  }
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    for (const key in changes) {
      settings[key] = changes[key].newValue;
    }
    console.log('Settings updated:', settings);
  }
});

// Global debug helper for troubleshooting
window.hateDetectDebug = function() {
  console.log('\\n=== HATE DETECT DEBUG INFO ===');
  console.log('Site:', window.location.hostname);
  console.log('URL:', window.location.href);
  
  // Check all possible selectors
  const selectors = [
    'textarea',
    'input[type="text"]',
    '[contenteditable="true"]',
    '[role="textbox"]',
    'div[contenteditable]',
    'form textarea',
    'form [contenteditable]',
    '[aria-label*="comment" i]',
    '[placeholder*="comment" i]'
  ];
  
  console.log('\\nElements found by selector:');
  let totalFound = 0;
  selectors.forEach(sel => {
    try {
      const elements = document.querySelectorAll(sel);
      if (elements.length > 0) {
        totalFound += elements.length;
        console.log(`  ✓ ${sel}: ${elements.length} found`);
        elements.forEach((el, i) => {
          const isVisible = el.offsetHeight > 0 && el.offsetWidth > 0;
          console.log(`    [${i}] ${isVisible ? '👁️' : '🚫'}:`, {
            tag: el.tagName,
            contenteditable: el.getAttribute('contenteditable'),
            role: el.getAttribute('role'),
            ariaLabel: el.getAttribute('aria-label'),
            placeholder: el.getAttribute('placeholder'),
            visible: isVisible,
            hasIcon: !!el.__hateDetectIcon,
            marked: !!el.__hateDetectMarked,
            hasListener: !!el.__hateCheckListener
          });
        });
      }
    } catch (e) {
      console.log(`  ✗ ${sel}: error - ${e.message}`);
    }
  });
  
  if (totalFound === 0) {
    console.warn('⚠️ NO EDITABLE ELEMENTS FOUND! Extension cannot work.');
    console.log('💡 This might be because:');
    console.log('  1. Page hasn\'t loaded yet - try scrolling or clicking around');
    console.log('  2. Site uses iframe - check inside iframes');
    console.log('  3. Site uses Shadow DOM - elements are hidden');
    console.log('  4. Different selectors needed - inspect the input element');
  }
  
  console.log('\\nExtension state:');
  console.log('  Extension loaded:', typeof getEditableElements === 'function');
  console.log('  Content script loaded:', typeof attachSendListeners === 'function');
  console.log('  API available:', typeof apiClient === 'object');
  console.log('  Focused element:', currentFocusedElement);
  console.log('  Icons in DOM:', document.querySelectorAll('.hate-detect-icon').length);
  console.log('  Marked elements:', document.querySelectorAll('.hate-detect-ready').length);
  console.log('  Active elements:', document.querySelectorAll('.hate-detect-active').length);
  
  console.log('\\n📋 Quick actions:');
  console.log('  Force re-scan: hateDetectFunctions.attachSendListeners()');
  console.log('  Get editables: getEditableElements()');
  console.log('  Manual attach: hateDetectFunctions.markEditableForDetection(element)');
  console.log('  Click on comment box, then run hateDetectDebug() again!');
  console.log('\\nℹ️ If no elements are marked, the extension may have loaded before');
  console.log('   the page content. Try running: hateDetectFunctions.attachSendListeners()\\n');
};

console.log('💡 [HATE-DETECT] Debug helper loaded! Run hateDetectDebug() in console for troubleshooting.');

// Make key functions globally accessible for debugging
window.attachSendListeners = attachSendListeners;
window.markEditableForDetection = markEditableForDetection;
window.injectIconIntoInput = injectIconIntoInput;
window.currentFocusedElement = currentFocusedElement;

window.hateDetectFunctions = {
  attachSendListeners,
  getEditableElements,
  markEditableForDetection,
  injectIconIntoInput
};

