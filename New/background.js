const SCRIPT_FILES = [
  "constants.js",
  "utils.js",
  "metadata.js",
  "ui.js",
  "selection.js",
  "contentScript.js"
];

const CSS_FILES = ["styles.css"];

function isInjectableUrl(url) {
  if (!url) return false;
  const blockedSchemes = ["chrome://", "edge://", "about:", "chrome-extension://", "devtools://"];
  return !blockedSchemes.some((scheme) => url.startsWith(scheme));
}

async function sendToggle(tabId) {
  await chrome.tabs.sendMessage(tabId, { action: "EXTRACTOR_TOGGLE" });
}

async function ensureContentScript(tab) {
  if (!tab || !tab.id || !isInjectableUrl(tab.url)) return false;

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: CSS_FILES
    });
  } catch (_) {
    // CSS may already be present; continue to script injection.
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: SCRIPT_FILES
  });

  return true;
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-selection-mode") return;

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (!activeTab || !activeTab.id) return;

  try {
    await sendToggle(activeTab.id);
    return;
  } catch (error) {
    const canInject = await ensureContentScript(activeTab);
    if (!canInject) {
      console.error("Cannot inject content script on this page", activeTab.url);
      return;
    }

    try {
      await sendToggle(activeTab.id);
    } catch (retryError) {
      console.error("Could not send toggle message to content script", retryError);
    }
  }
});
