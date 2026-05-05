(() => {
  window.ExtractorConfig = {
    endpoint: "http://localhost:5000/api/extract",
    hotkey: { key: "f", ctrl: true, shift: true },
    messageAction: {
      toggle: "EXTRACTOR_TOGGLE"
    },
    classes: {
      activeBody: "extractor-active-mode",
      hover: "extractor-hover",
      selected: "extractor-selected"
    },
    ids: {
      root: "extractor-ui-root",
      note: "extractor-note-input",
      count: "extractor-count",
      status: "extractor-status",
      save: "extractor-save",
      cancel: "extractor-cancel"
    }
  };
})();
