# Implementation Guide - Hate Speech Prevention Extension

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [API Integration](#api-integration)
4. [Platform Detection](#platform-detection)
5. [Testing & Deployment](#testing--deployment)

---

## Architecture Overview

### Manifest v3 Structure

The extension uses Chrome's latest manifest version for enhanced security and performance:

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "webRequest"],
  "host_permissions": ["https://*.facebook.com/*", ...],
  "background": { "service_worker": "background.js" },
  "content_scripts": [
    { "matches": ["https://*.facebook.com/*", ...], "js": [...] }
  ]
}
```

### Key Differences from MV2

| Feature | MV2 | MV3 |
|---------|-----|-----|
| Background | Persistent | Service Worker (on-demand) |
| Permissions | Broad | Specific & Required |
| Scripts | Background page | Service Worker |
| Content scripts | Same | Same |
| Storage | chrome.storage | chrome.storage |

---

## Core Components

### 1. Content Script (`contentScript.js`)

**Responsibilities:**
- Intercept user interactions with message inputs
- Monitor DOM changes for new content
- Inject modal dialogs
- Apply filtering styles

**Key Functions:**

```javascript
// Initialize features based on settings
function initializeExtension() {
  if (settings.feature1Enabled) setupPreSendDetection();
  if (settings.feature2Enabled) setupIncomingFiltering();
}

// Attach listeners to send buttons
function attachSendListeners() {
  const editables = getEditableElements();
  editables.forEach(element => {
    element.addEventListener('keydown', handleKeyboardSend, true);
    const sendButton = findSendButton(element);
    if (sendButton) {
      sendButton.addEventListener('click', handleSendButtonClick, true);
    }
  });
}

// Process text before sending
async function processTextForSending(text, editableElement) {
  const result = await apiClient.detectHateSpeech(text);
  if (result.is_hate) {
    showHateDetectionModal(text, editableElement, result);
  } else {
    actuallyAllowSend(editableElement);
  }
}
```

**Event Interception:**

```
Keyboard Event (Enter/Ctrl+Enter)
         ↓
  preventDefault()
         ↓
  Process text
         ↓
  If hate detected: show modal
  If safe: call actuallyAllowSend()
         ↓
  actuallyAllowSend():
    • Temporarily flag button to skip listener
    • Click button OR
    • Dispatch KeyboardEvent with ctrlKey=true
```

### 2. Background Service Worker (`background.js`)

**Responsibilities:**
- Handle runtime messages from content script
- Manage API calls
- Store settings in chrome.storage
- Initialize extension on install

**Message Handlers:**

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'detectHate') {
    detectHateSpeech(request.text)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open
  }
  // ... other actions
});
```

**Lifecycle:**

```
User clicks extension → Service Worker starts
         ↓
Process messages
         ↓
5 minutes idle → Service Worker stops
```

### 3. DOM Detection (`utils/domDetection.js`)

**Platform-Specific Selectors:**

```javascript
// Facebook selectors
'.fb-comment-text'
'.PageComposerFormDesktop textarea'
'[data-testid="fbComposerInput"]'

// Instagram selectors
'[contenteditable="true"]' (comment input)
'.DraftEditor-root' (message input)

// Twitter/X selectors
'[data-testid="tweet-text-textarea"]'
'[data-testid="dmComposerTextInput"]'
'[role="textbox"]'
```

**Universal Fallbacks:**

```javascript
const EDITABLE_SELECTORS = [
  'textarea',
  'input[type="text"]',
  '[contenteditable="true"]',
  '[role="textbox"]',
  '[placeholder*="comment"]',
  '[placeholder*="message"]'
];
```

**Element Type Handling:**

```javascript
// Standard inputs/textareas
element.value

// contenteditable divs
element.textContent || element.innerText

// Draft editor (Facebook/Instagram)
.DraftEditor-root child extraction
```

### 4. API Client (`utils/apiClient.js`)

**Caching Strategy:**

```javascript
class APIClient {
  constructor() {
    this.cache = new Map();      // In-memory storage
    this.cacheSize = 100;         // Max entries
  }

  async detectHateSpeech(text) {
    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Call API
    const result = await this._localHateDetection(text);

    // Store in cache
    this._cacheResult(cacheKey, result);
    return result;
  }
}
```

**Local Detection Patterns:**

```javascript
const hatePatterns = {
  slur: [
    /\b(hate|despise|loathe|detest)\s+(all|all\s+those|everyone)\b/gi,
    /\b(should\s+all\s+(die|burn|suffer)|genocide|exterminate)\b/gi
  ],
  harassment: [
    /you\s+are\s+(stupid|dumb|idiot|retard|moron)/gi,
    /go\s+(kill\s+yourself|kys|die)/gi
  ],
  threat: [
    /i('ll|'m)\s+(kill|hurt|find|beat|stab|shoot)/gi,
    /you\s+(deserve|should)\s+(die|suffer|burn)/gi
  ],
  insult: [
    /\b(ugly|fat|loser|pathetic|worthless)\b/gi
  ]
};
```

---

## API Integration

### Connecting to Real Hate Detection API

#### Option 1: Azure Content Moderator

```javascript
async _detectHateSpeechAPI(text) {
  const apiKey = 'your-api-key';
  const endpoint = 'https://{region}.api.cognitive.microsoft.com/text/analytics/v3.1/analyze';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      documents: [{
        id: '1',
        language: 'en',
        text: text
      }]
    })
  });

  const result = await response.json();
  // Parse result and map to our format
  return {
    is_hate: result.results[0].entities.some(e => e.category === 'PII'),
    confidence: 0.85,
    category: 'harassment'
  };
}
```

#### Option 2: OpenAI Moderation API

```javascript
async _detectHateSpeechAPI(text) {
  const apiKey = 'sk-...';
  
  const response = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: text,
      model: 'text-moderation-latest'
    })
  });

  const result = await response.json();
  const flagged = result.results[0].flagged;
  const categories = result.results[0].categories;

  return {
    is_hate: flagged && (categories.hate || categories.violence),
    confidence: result.results[0].category_scores.hate,
    category: 'harassment'
  };
}
```

#### Option 3: Custom ML Model

```javascript
async _detectHateSpeechAPI(text) {
  // Using ONNX Runtime for in-browser inference
  const session = await ort.InferenceSession.create('model.onnx');
  
  const embedding = await this.getTextEmbedding(text);
  const results = await session.run({
    input: embedding
  });

  return {
    is_hate: results.output[0].data[0] > 0.5,
    confidence: results.output[0].data[0],
    category: this.getCategory(results)
  };
}
```

### Setting API Keys Securely

```javascript
// In popup.js
document.getElementById('apiKeyInput').addEventListener('change', (e) => {
  chrome.storage.sync.set({
    apiKey: e.target.value,
    apiProvider: 'openai' // or 'azure', 'custom'
  });
});

// In utils/apiClient.js
async detectHateSpeech(text) {
  const { apiKey, apiProvider } = await chrome.storage.sync.get(['apiKey', 'apiProvider']);
  
  if (apiProvider === 'openai') {
    return this._detectWithOpenAI(text, apiKey);
  } else if (apiProvider === 'azure') {
    return this._detectWithAzure(text, apiKey);
  }
}
```

---

## Platform Detection

### Facebook Specifics

**Detecting Inputs:**
```javascript
// Post composer
'.fb-comment-text'
'.PageComposerFormDesktop textarea'
'[data-testid="fbComposerInput"]'

// Comment input (appears dynamically)
'[data-testid="comment-box"]'

// Message input
'[placeholder="Aa"]' // Facebook Messenger
```

**Send Button:**
```javascript
// Post button
'button[aria-label="Post"]'

// Comment button
'.PageComposerFormActionButtons button'

// Send button (Messages)
'[aria-label="Send"]'
```

### Instagram Specifics

**Detecting Inputs:**
```javascript
// Comment input
'textarea[aria-label="Add a comment..."]'

// Story reply
'textarea[placeholder="Send message"]'

// DM input
'[data-testid="dmComposerTextInput"]'
```

**Send Button:**
```javascript
// Comment send
'button[aria-label="Post"]'

// DM send
'button[aria-label="Send message"]'

// Story reply send
'[aria-label="Send"]'
```

### Twitter/X Specifics

**Detecting Inputs:**
```javascript
// Tweet composer
'[data-testid="tweet-text-textarea"]'

// Reply input
'[role="textbox"]'

// DM composer
'[data-testid="dmComposerTextInput"]'
```

**Send Button:**
```javascript
// Tweet button
'[data-testid="tweetButton"]'

// Reply button
'button[aria-label="Reply"]'

// DM send
'[data-testid="dmComposerSendButton"]'
```

### Testing Platform Detection

```javascript
// Add to contentScript.js for debugging
console.log('Current URL:', window.location.href);
console.log('Editable elements:', getEditableElements().length);
console.log('Send buttons:', document.querySelectorAll('button').length);
```

---

## Testing & Deployment

### Unit Testing

```javascript
// Test domDetection.js
const text = getEditableText(element);
console.assert(text.length > 0, 'Should extract text');

// Test apiClient.js
const result = await apiClient.detectHateSpeech('I hate all people');
console.assert(result.is_hate === true, 'Should detect hate');
console.assert(result.confidence > 0.5, 'Should have high confidence');

// Test rewriting
const rewritten = await apiClient.rewriteText('I hate you');
console.assert(rewritten !== 'I hate you', 'Should rewrite');
console.assert(rewritten.length > 0, 'Should produce output');
```

### Integration Testing

```javascript
// Test Feature 1: Pre-Send
1. Navigate to Facebook
2. Open comment box
3. Type: "You should all die"
4. Press Enter
5. Modal should appear
6. Verify "Rewrite" button works
7. Verify "Send Anyway" works

// Test Feature 2: Filtering
1. Refresh Facebook page
2. Look for hateful comments
3. Verify blur applied (if setting = blur)
4. Click to reveal
5. Verify click handler works
```

### Deployment Checklist

- [ ] Update version in manifest.json
- [ ] Update version in popup.html
- [ ] Test on all supported platforms
- [ ] Verify no console errors
- [ ] Test with various hate speech patterns
- [ ] Test settings persistence
- [ ] Test cache clearing
- [ ] Verify privacy (no data logging)
- [ ] Create Chrome Web Store listing
- [ ] Upload to Chrome Web Store
- [ ] Request review

### Publishing to Chrome Web Store

1. Create developer account (one-time $5 fee)
2. Create new item in developer dashboard
3. Upload ZIP file with all extension files
4. Fill in description, screenshots, category
5. Set content rating
6. Submit for review
7. Typically reviewed within 24-72 hours

### Privacy Policy Requirements

```markdown
# Privacy Policy

This extension does NOT:
- Store personal data
- Send messages to external servers
- Log or record conversation content
- Track user behavior
- Sell or share user information

Analysis:
- Performed per-message only
- Results cached in-memory
- Cache cleared on browser close
```

---

## Troubleshooting

### Extension Not Detecting Inputs

```javascript
// Debugging script (run in console)
console.log('Platform:', window.location.host);
const editables = document.querySelectorAll('textarea, input, [contenteditable="true"]');
console.log('Found', editables.length, 'editable elements');
editables.forEach(el => console.log(el));
```

### Modal Not Appearing

```javascript
// Check if modal is being injected
console.log('Modal created:', document.getElementById('hateDetectionModal'));

// Verify z-index
console.log('Modal z-index:', 
  window.getComputedStyle(document.getElementById('hateDetectionModal')).zIndex);
```

### Settings Not Persisting

```javascript
// Check storage
chrome.storage.sync.get(null, (data) => {
  console.log('Stored settings:', data);
});

// Verify quota
chrome.storage.sync.getBytesInUse(null, (bytes) => {
  console.log('Storage used:', bytes, 'bytes');
});
```

---

**Last Updated:** February 2026
**Version:** 1.0.0
