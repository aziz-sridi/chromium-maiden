// Background service worker for handling API calls and background tasks

console.log('Background service worker started');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);

  if (request.action === 'detectHate') {
    detectHateSpeech(request.text)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'rewriteText') {
    rewriteText(request.text)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(null, (data) => {
      sendResponse({ success: true, settings: data });
    });
    return true;
  }

  if (request.action === 'updateSettings') {
    chrome.storage.sync.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Detect hate speech (mock implementation)
 */
async function detectHateSpeech(text) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const normalizedText = normalizeText(text);
      const lowerText = normalizedText.toLowerCase();
      
      const hatePatterns = {
        slur: [
          /\b(hate|despise|loathe|detest)\s+(all|all\s+those|everyone)\b/gi,
          /\b(should\s+all\s+(die|burn|suffer)|genocide|exterminate)\b/gi
        ],
        harassment: [
          /you\s*(?:are|re|'re)\s+(stupid|dumb|idiot|moron|trash|pathetic|worthless)/gi,
          /go\s+(kill\s+yourself|kys|die)/gi,
          /you\s+should\s+be\s+ashamed/gi
        ],
        threat: [
          /i\s*(?:'ll|will|am|'m)\s+(kill|hurt|find|beat|stab|shoot)/gi,
          /you\s+(deserve|should)\s+(die|suffer|burn)/gi,
          /i\s+will\s+make\s+you\s+pay/gi
        ],
        insult: [
          /\b(ugly|fat|loser|pathetic|worthless|disgusting)\b/gi
        ]
      };

      let highestConfidence = 0;
      let detectedCategory = null;

      for (const [category, patterns] of Object.entries(hatePatterns)) {
        for (const pattern of patterns) {
          if (pattern.test(lowerText)) {
            const confidence = category === 'threat' ? 0.95 :
                             category === 'slur' ? 0.85 :
                             category === 'harassment' ? 0.75 :
                             0.65;
            
            if (confidence > highestConfidence) {
              highestConfidence = confidence;
              detectedCategory = category;
            }
          }
        }
      }

      resolve({
        is_hate: highestConfidence > 0,
        confidence: highestConfidence,
        category: detectedCategory,
        timestamp: Date.now()
      });
    }, 100);
  });
}

function normalizeText(text) {
  if (!text) return '';

  const noDiacritics = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const leetNormalized = noDiacritics.replace(/[013457@$]/g, (char) => {
    const map = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };
    return map[char] || char;
  });

  return leetNormalized
    .replace(/[^\w\s']/g, ' ')
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rewrite text to remove hate (mock implementation)
 */
async function rewriteText(text) {
  return new Promise((resolve) => {
    setTimeout(() => {
      let rewritten = text;

      const rewrites = {
        'hate all': 'disagree with',
        'should all die': 'should reconsider',
        'you are stupid': 'I disagree with you',
        'go kill yourself': 'please take care of yourself',
        'you deserve to die': 'I hope you improve',
        'i will kill': 'I will stop',
        'you are ugly': 'I have different preferences',
        'you are fat': 'I have different views',
        'you are a loser': 'I think you\'re making mistakes',
        'you are pathetic': 'I disagree with your approach',
        'you are worthless': 'I don\'t see value in that',
      };

      for (const [hate, respectful] of Object.entries(rewrites)) {
        const regex = new RegExp(`\\b${hate}\\b`, 'gi');
        rewritten = rewritten.replace(regex, respectful);
      }

      if (rewritten === text) {
        rewritten = `I respectfully disagree. [Original context: ${text.substring(0, 50)}...]`;
      }

      resolve(rewritten);
    }, 150);
  });
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open settings page on first install
    chrome.tabs.create({
      url: 'popup.html'
    });

    // Initialize default settings
    chrome.storage.sync.set({
      feature1Enabled: true,
      feature2Enabled: true,
      sensitivityLevel: 'medium',
      filterAction: 'blur',
      platformsEnabled: {
        facebook: true,
        instagram: true,
        twitter: true
      }
    });
  }
});
