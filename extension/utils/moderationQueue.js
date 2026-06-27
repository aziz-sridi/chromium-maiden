(function attachModerationUtilities(globalScope) {
  'use strict';

  const DEFAULT_TTL_MS = 30 * 60 * 1000;
  const DEFAULT_CACHE_SIZE = 400;
  const DEFAULT_CONCURRENCY = 3;

  function normalizeText(text) {
    return String(text || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function localModerate(text) {
    const normalized = normalizeText(text)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[013457@$]/g, (character) => {
        const replacements = {
          '0': 'o',
          '1': 'i',
          '3': 'e',
          '4': 'a',
          '5': 's',
          '7': 't',
          '@': 'a',
          '$': 's'
        };
        return replacements[character] || character;
      });

    const rules = [
      {
        category: 'violent_hate',
        score: 0.96,
        pattern: /\b(?:i(?:'ll| will)?|we(?:'ll| will)?)\s+(?:kill|hurt|stab|shoot|find)\s+(?:you|them)\b|\b(?:you|they)\s+(?:should|deserve to)\s+(?:die|burn|suffer)\b/i
      },
      {
        category: 'harassment',
        score: 0.88,
        pattern: /\b(?:go\s+(?:kill yourself|kys|die)|you(?:'re| are)\s+(?:trash|worthless|pathetic|an?\s+idiot|a\s+moron))\b/i
      },
      {
        category: 'discrimination',
        score: 0.84,
        pattern: /\b(?:all|those)\s+(?:people|immigrants?)\s+(?:are\s+(?:vermin|trash|subhuman)|should\s+(?:leave|die|be\s+removed)|deserve\s+(?:nothing|to\s+die))\b|\b(?:exterminate|genocide)\b/i
      },
      {
        category: 'insult',
        score: 0.67,
        pattern: /\byou(?:'re| are)\s+(?:stupid|dumb|disgusting|a\s+loser)\b/i
      }
    ];

    const matchedRule = rules.find((rule) => rule.pattern.test(normalized));
    if (!matchedRule) {
      return {
        is_hate: false,
        hate_score: 0,
        confidence: 0.55,
        category: 'none',
        reason: 'No high-confidence harmful pattern was found by the local fallback.',
        suggested_alternative: null,
        suggested_alternatives: null,
        source: 'local'
      };
    }

    const alternatives = [
      'I strongly disagree, but I want to keep this focused on the issue.',
      'I am frustrated by this. Here is what I think needs to change.',
      'I disagree with your point and want to explain why without making it personal.'
    ];

    return {
      is_hate: true,
      hate_score: matchedRule.score,
      confidence: matchedRule.score,
      category: matchedRule.category,
      reason: 'The local fallback found a direct hostile or threatening phrase.',
      suggested_alternative: alternatives[0],
      suggested_alternatives: alternatives,
      source: 'local'
    };
  }

  class ModerationQueue {
    constructor(options = {}) {
      if (typeof options.worker !== 'function') {
        throw new TypeError('ModerationQueue requires a worker function.');
      }

      this.worker = options.worker;
      this.maxConcurrent = options.maxConcurrent || DEFAULT_CONCURRENCY;
      this.maxCacheSize = options.maxCacheSize || DEFAULT_CACHE_SIZE;
      this.ttlMs = options.ttlMs || DEFAULT_TTL_MS;
      this.now = options.now || Date.now;
      this.queue = [];
      this.activeCount = 0;
      this.cache = new Map();
      this.inFlight = new Map();
      this.stats = {
        cacheHits: 0,
        cacheMisses: 0,
        deduplicated: 0,
        completed: 0
      };
    }

    createKey(text, mode) {
      return `${mode}:${normalizeText(text)}`;
    }

    getCached(key) {
      const entry = this.cache.get(key);
      if (!entry) return null;

      if (entry.expiresAt <= this.now()) {
        this.cache.delete(key);
        return null;
      }

      this.cache.delete(key);
      this.cache.set(key, entry);
      return { ...entry.value, cached: true };
    }

    enqueue(text, mode = 'incoming') {
      const normalized = normalizeText(text);
      if (!normalized) {
        return Promise.resolve(localModerate(''));
      }

      const key = this.createKey(normalized, mode);
      const cached = this.getCached(key);
      if (cached) {
        this.stats.cacheHits += 1;
        return Promise.resolve(cached);
      }

      if (this.inFlight.has(key)) {
        this.stats.deduplicated += 1;
        return this.inFlight.get(key);
      }

      this.stats.cacheMisses += 1;
      let resolveTask;
      let rejectTask;
      const taskPromise = new Promise((resolve, reject) => {
        resolveTask = resolve;
        rejectTask = reject;
      });

      this.inFlight.set(key, taskPromise);
      this.queue.push({
        key,
        text: String(text),
        mode,
        resolve: resolveTask,
        reject: rejectTask
      });
      this.drain();
      return taskPromise;
    }

    drain() {
      while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
        const task = this.queue.shift();
        this.activeCount += 1;
        this.runTask(task);
      }
    }

    async runTask(task) {
      try {
        const result = await this.worker(task.text, task.mode);
        const cacheValue = { ...result, cached: false };
        this.setCached(task.key, cacheValue);
        this.stats.completed += 1;
        task.resolve(cacheValue);
      } catch (error) {
        task.reject(error);
      } finally {
        this.inFlight.delete(task.key);
        this.activeCount -= 1;
        this.drain();
      }
    }

    setCached(key, value) {
      if (this.cache.has(key)) this.cache.delete(key);
      this.cache.set(key, {
        value,
        expiresAt: this.now() + this.ttlMs
      });

      while (this.cache.size > this.maxCacheSize) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
    }

    hydrate(entries) {
      if (!Array.isArray(entries)) return;
      entries.forEach(([key, entry]) => {
        if (entry && entry.expiresAt > this.now() && entry.value) {
          this.cache.set(key, entry);
        }
      });

      while (this.cache.size > this.maxCacheSize) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
    }

    serialize() {
      return Array.from(this.cache.entries());
    }

    clear() {
      this.cache.clear();
      this.stats.cacheHits = 0;
      this.stats.cacheMisses = 0;
      this.stats.deduplicated = 0;
      this.stats.completed = 0;
    }

    snapshot() {
      return {
        ...this.stats,
        cacheSize: this.cache.size,
        active: this.activeCount,
        queued: this.queue.length
      };
    }
  }

  const api = {
    ModerationQueue,
    localModerate,
    normalizeText
  };

  globalScope.ChromiumMaidenModeration = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : globalThis);
