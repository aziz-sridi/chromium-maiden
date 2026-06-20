(function attachApiClient(globalScope) {
  'use strict';

  class ApiClient {
    async moderate(text, mode = 'incoming') {
      if (!String(text || '').trim()) {
        return {
          is_hate: false,
          hate_score: 0,
          confidence: 0,
          category: 'none',
          suggested_alternatives: null
        };
      }

      const response = await chrome.runtime.sendMessage({
        action: 'moderate',
        text,
        mode
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Moderation service did not respond.');
      }

      return response.result;
    }

    detectIncoming(text) {
      return this.moderate(text, 'incoming');
    }

    detectOutgoing(text) {
      return this.moderate(text, 'outgoing');
    }

    async recordMetric(name, amount = 1) {
      try {
        await chrome.runtime.sendMessage({ action: 'recordMetric', name, amount });
      } catch (_error) {
        // Metrics must never interrupt moderation.
      }
    }
  }

  globalScope.chromiumMaidenApi = new ApiClient();
})(window);
