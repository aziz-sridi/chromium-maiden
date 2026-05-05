// API client for communicating with hate detection and rewrite services

class APIClient {
  constructor() {
    this.cacheSize = 100;
    this.cache = new Map();
    this.requestQueue = [];
    this.isProcessing = false;
    this.apiBaseUrl = 'http://localhost:5000'; // Backend server URL
    this.sessionEstablished = false;
  }

  /**
   * Establish connection with backend (sets session cookie)
   * @returns {Promise<boolean>} Success status
   */
  async connect() {
    if (this.sessionEstablished) {
      return true;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/connect`, {
        method: 'POST',
        credentials: 'include', // Important: sends and receives cookies
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: [] })
      });

      if (response.ok) {
        this.sessionEstablished = true;
        console.log('✅ Backend session established');
        return true;
      } else {
        console.error('❌ Failed to establish backend session');
        return false;
      }
    } catch (error) {
      console.error('❌ Connection error:', error);
      return false;
    }
  }

  /**
   * Detect hate speech in text using backend AI
   * @param {string} text - The text to analyze
   * @returns {Promise<Object>} Hate detection result
   */
  async detectHateSpeech(text) {
    if (!text || text.trim().length === 0) {
      return {
        is_hate: false,
        score: 0,
        confidence: 0,
        category: null,
        message: null,
        rewrites: [],
        cached: false
      };
    }

    // Check cache first
    const cacheKey = `hate:${text}`;
    if (this.cache.has(cacheKey)) {
      const result = this.cache.get(cacheKey);
      result.cached = true;
      return result;
    }

    // Ensure connection is established
    await this.connect();

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/detect`, {
        method: 'POST',
        credentials: 'include', // Send cookies with request
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      
      // Normalize response format for compatibility
      const normalizedResult = {
        is_hate: result.is_hate || false,
        score: result.score || 0,
        confidence: result.score || 0, // Use score as confidence
        category: result.category || null,
        sentiment: result.sentiment || 'neutral',
        message: result.message || null,
        rewrites: result.rewrites || [],
        severity: result.severity || null,
        cached: false
      };

      // Cache the result
      this._cacheResult(cacheKey, normalizedResult);
      
      return normalizedResult;
    } catch (error) {
      console.error('❌ Hate detection error:', error);
      // Fallback to local detection if backend is unavailable
      console.log('⚠️ Falling back to local detection');
      return await this._localHateDetection(text);
    }
  }

  /**
   * Rewrite text to remove hate speech (uses detection results)
   * @param {string} originalText - The original text
   * @returns {Promise<Object>} Rewrite result with alternatives
   */
  async rewriteText(originalText) {
    if (!originalText || originalText.trim().length === 0) {
      return { original: originalText, rewrites: [], message: null };
    }

    try {
      // Detection already provides rewrites, so just call detect
      const detection = await this.detectHateSpeech(originalText);
      
      return {
        original: originalText,
        rewrites: detection.rewrites || [],
        message: detection.message || null,
        is_hate: detection.is_hate,
        score: detection.score
      };
    } catch (error) {
      console.error('❌ Rewrite error:', error);
      return { original: originalText, rewrites: [], message: null };
    }
  }

  /**
   * Local hate detection - mock implementation
   * @private
   * @param {string} text - The text to analyze
   * @returns {Promise<Object>} Result
   */
  async _localHateDetection(text) {
    return new Promise((resolve) => {
      // Simulate API latency
      setTimeout(() => {
        const normalizedText = this._normalizeText(text);
        const lowerText = normalizedText.toLowerCase();
        
        // Mock hate speech patterns
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
              // More severe patterns get higher confidence
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

  _normalizeText(text) {
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
   * Local text rewriting - mock implementation
   * @private
   * @param {string} text - The original text
   * @returns {Promise<string>} Rewritten text
   */
  async _localRewrite(text) {
    return new Promise((resolve) => {
      setTimeout(() => {
        let rewritten = text;

        // Mock rewriting rules
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

        // If no rewrites were made, add context
        if (rewritten === text) {
          rewritten = `I respectfully disagree. [Original context: ${text.substring(0, 50)}...]`;
        }

        resolve(rewritten);
      }, 150);
    });
  }

  /**
   * Cache a result
   * @private
   * @param {string} key - Cache key
   * @param {Object} value - Value to cache
   */
  _cacheResult(key, value) {
    if (this.cache.size >= this.cacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cacheSize
    };
  }
}

// Create global instance
const apiClient = new APIClient();

// Expose globally for cross-script access
window.apiClient = apiClient;
