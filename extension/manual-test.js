'use strict';

const sampleFeed = document.getElementById('sampleFeed');
const sendResult = document.getElementById('sendResult');
const backendState = document.getElementById('backendState');

document.getElementById('addSafeSample').addEventListener('click', () => {
  addSample('Ordinary sample', 'I disagree with the proposal, but I understand the concern.');
});

document.getElementById('addHarmfulSample').addEventListener('click', () => {
  addSample('Harmful test sample', 'I will kill you');
});

document.getElementById('testComposer').addEventListener('submit', (event) => {
  event.preventDefault();
  const message = document.getElementById('testMessage').value.trim();
  sendResult.textContent = message
    ? `Passed the checkpoint locally: “${message}”`
    : 'The test draft is empty.';
});

initializeLab();

async function initializeLab() {
  addSample('Ordinary sample', 'I disagree with the proposal, but I understand the concern.');
  addSample('Harmful test sample', 'I will kill you');

  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
    const state = response?.status?.backend || 'unknown';
    backendState.dataset.state = state;
    backendState.textContent = state === 'connected'
      ? 'Local model connected'
      : state === 'fallback'
        ? 'Quick fallback active'
        : 'Model status unknown';
  } catch (_error) {
    backendState.dataset.state = 'fallback';
    backendState.textContent = 'Quick fallback active';
  }
}

function addSample(label, text) {
  const article = document.createElement('article');
  article.className = 'sample-message';
  article.dataset.cmTestMessage = 'true';

  const sampleLabel = document.createElement('span');
  sampleLabel.textContent = label;
  const copy = document.createElement('p');
  copy.textContent = text;
  article.append(sampleLabel, copy);
  sampleFeed.prepend(article);
}
