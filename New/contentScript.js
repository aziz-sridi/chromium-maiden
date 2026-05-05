(() => {
  if (!window.ExtractorSelection) {
    console.error("ExtractorSelection module not loaded");
    return;
  }

  window.ExtractorSelection.setupKeyboardFallback();
  window.ExtractorSelection.setupRuntimeListener();
})();
