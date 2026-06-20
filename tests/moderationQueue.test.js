'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ModerationQueue,
  localModerate,
  normalizeText
} = require('../extension/utils/moderationQueue.js');

test('normalizes equivalent text for stable cache keys', () => {
  assert.equal(normalizeText('  HELLO\n world  '), 'hello world');
});

test('deduplicates concurrent requests and caches later requests', async () => {
  let calls = 0;
  const queue = new ModerationQueue({
    worker: async () => {
      calls += 1;
      return { is_hate: false, hate_score: 0 };
    }
  });

  const first = queue.enqueue('Same message', 'incoming');
  const second = queue.enqueue(' same   message ', 'incoming');
  const [firstResult, secondResult] = await Promise.all([first, second]);
  const cachedResult = await queue.enqueue('SAME MESSAGE', 'incoming');

  assert.equal(calls, 1);
  assert.equal(firstResult.cached, false);
  assert.equal(secondResult.cached, false);
  assert.equal(cachedResult.cached, true);
  assert.equal(queue.snapshot().deduplicated, 1);
});

test('never exceeds the configured concurrency', async () => {
  let active = 0;
  let peak = 0;
  const queue = new ModerationQueue({
    maxConcurrent: 2,
    worker: async (text) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return { text, is_hate: false, hate_score: 0 };
    }
  });

  await Promise.all([
    queue.enqueue('one'),
    queue.enqueue('two'),
    queue.enqueue('three'),
    queue.enqueue('four')
  ]);

  assert.equal(peak, 2);
  assert.equal(queue.snapshot().completed, 4);
});

test('expires cached results after the TTL', async () => {
  let clock = 1000;
  let calls = 0;
  const queue = new ModerationQueue({
    ttlMs: 50,
    now: () => clock,
    worker: async () => {
      calls += 1;
      return { is_hate: false, hate_score: 0 };
    }
  });

  await queue.enqueue('short lived');
  clock += 51;
  await queue.enqueue('short lived');
  assert.equal(calls, 2);
});

test('local fallback catches an explicit threat and leaves ordinary text alone', () => {
  assert.equal(localModerate('I will kill you').category, 'violent_hate');
  assert.equal(localModerate('I disagree with this proposal').is_hate, false);
});
