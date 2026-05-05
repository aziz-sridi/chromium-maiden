(() => {
  const { endpoint, classes, hotkey } = window.ExtractorConfig;
  const { getElementText, isEditableTarget } = window.ExtractorUtils;
  const { detectContentType, detectDirection, findTimeInfo } = window.ExtractorMetadata;
  const { ensureUI, removeUI, updateCount, setStatus } = window.ExtractorUI;
  const selectedAttr = "data-extractor-selection-id";

  const state = {
    active: false,
    selections: [],
    note: "",
    hoveredElement: null
  };

  function isInsideUI(element) {
    if (!element || !element.closest) return false;
    return Boolean(element.closest("#extractor-ui-root"));
  }

  function start() {
    if (state.active) return;

    state.active = true;
    document.body.classList.add(classes.activeBody);

    ensureUI(save, cancel, (value) => {
      state.note = value;
    });

    updateCount(state.selections.length);
    setStatus("Selection mode ON. Click elements to add.");

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClickSelect, true);
    document.addEventListener("keydown", onEscape, true);
  }

  function stop() {
    state.active = false;
    document.body.classList.remove(classes.activeBody);

    if (state.hoveredElement) {
      state.hoveredElement.classList.remove(classes.hover);
      state.hoveredElement = null;
    }

    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClickSelect, true);
    document.removeEventListener("keydown", onEscape, true);

    removeUI();
  }

  function toggle() {
    if (!state.active) {
      start();
      return;
    }
    save();
  }

  function cancel() {
    clearSelectedMarks();
    state.selections = [];
    state.note = "";
    stop();
  }

  function onEscape(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  }

  function onMouseMove(event) {
    if (!state.active) return;
    const target = event.target;
    if (!target || isInsideUI(target)) return;

    if (state.hoveredElement && state.hoveredElement !== target) {
      state.hoveredElement.classList.remove(classes.hover);
    }

    if (target.classList) {
      target.classList.add(classes.hover);
      state.hoveredElement = target;
    }
  }

  function onClickSelect(event) {
    if (!state.active) return;

    const element = event.target;
    if (!element || isInsideUI(element)) return;

    event.preventDefault();
    event.stopPropagation();

    const selectedAncestor = element.closest(`.${classes.selected}`);
    if (selectedAncestor) {
      removeSelectionByElement(selectedAncestor);
      return;
    }

    const selection = window.getSelection();
    const selectionText = selection ? selection.toString() : "";

    const item = buildItem(element, selectionText, selection);
    state.selections.push(item);

    element.classList.add(classes.selected);
    element.setAttribute(selectedAttr, item.id);
    updateCount(state.selections.length);
    setStatus("Added element.");
  }

  function removeSelectionByElement(element) {
    if (!element) return;

    const selectionId = element.getAttribute(selectedAttr);
    if (!selectionId) return;

    const nextSelections = state.selections.filter((item) => item.id !== selectionId);
    state.selections = nextSelections;

    element.classList.remove(classes.selected);
    element.removeAttribute(selectedAttr);

    updateCount(state.selections.length);
    setStatus("Removed element.");
  }

  function clearSelectedMarks() {
    const selected = document.querySelectorAll(`.${classes.selected}`);
    selected.forEach((el) => {
      el.classList.remove(classes.selected);
      el.removeAttribute(selectedAttr);
    });
  }

  function buildSelectionInfo(selectionText, selection, element) {
    if (!selection || !selectionText) {
      return { selectionText: null, anchorOffset: null, focusOffset: null };
    }

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    if (!anchorNode || !focusNode) {
      return { selectionText, anchorOffset: null, focusOffset: null };
    }

    const isInside = element.contains(anchorNode) || element.contains(focusNode);
    if (!isInside) {
      return { selectionText: null, anchorOffset: null, focusOffset: null };
    }

    return {
      selectionText,
      anchorOffset: selection.anchorOffset,
      focusOffset: selection.focusOffset
    };
  }

  function pushMediaUrl(list, url, type) {
    if (!url || typeof url !== "string") return;
    const normalized = url.trim();
    if (!normalized) return;
    if (list.some((entry) => entry.url === normalized)) return;
    list.push({ url: normalized, type });
  }

  function collectFromSingleMediaNode(node, list) {
    if (!node || !node.tagName) return;
    const tag = node.tagName.toLowerCase();

    if (tag === "img") {
      pushMediaUrl(list, node.currentSrc || node.src, "image");
      return;
    }

    if (tag === "video") {
      pushMediaUrl(list, node.currentSrc || node.src, "video");
      pushMediaUrl(list, node.poster, "image");
      return;
    }

    if (tag === "audio") {
      pushMediaUrl(list, node.currentSrc || node.src, "audio");
      return;
    }

    if (tag === "source") {
      const sourceType = (node.getAttribute("type") || "").toLowerCase();
      if (sourceType.includes("video")) {
        pushMediaUrl(list, node.src, "video");
      } else if (sourceType.includes("audio")) {
        pushMediaUrl(list, node.src, "audio");
      } else if (sourceType.includes("image")) {
        pushMediaUrl(list, node.src, "image");
      } else {
        pushMediaUrl(list, node.src, "unknown");
      }
    }
  }

  function extractMediaAssets(element) {
    const media = [];
    collectFromSingleMediaNode(element, media);

    const descendants = element.querySelectorAll("img, video, audio, source");
    descendants.forEach((node) => collectFromSingleMediaNode(node, media));

    const downloadableUrls = media
      .map((entry) => entry.url)
      .filter((url) => /^https?:\/\//i.test(url));

    return {
      assets: media,
      downloadableUrls,
      hasMedia: media.length > 0
    };
  }

  function buildItem(element, selectionText, selection) {
    const rect = element.getBoundingClientRect();
    const selectionInfo = buildSelectionInfo(selectionText, selection, element);
    const media = extractMediaAssets(element);

    return {
      id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      pageTitle: document.title || "",
      pageUrl: location.href,
      extractedAt: new Date().toISOString(),
      contentType: detectContentType(element),
      direction: detectDirection(element),
      time: findTimeInfo(element),
      selectionText: selectionInfo.selectionText,
      selectionAnchorOffset: selectionInfo.anchorOffset,
      selectionFocusOffset: selectionInfo.focusOffset,
      element: {
        id: element.id || null,
        text: getElementText(element),
        value: element.value || null,
        href: element.href || null,
        src: element.src || null,
        alt: element.alt || null,
        role: element.getAttribute("role") || null,
        ariaLabel: element.getAttribute("aria-label") || null
      },
      media,
      boundingRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    };
  }

  async function save() {
    if (state.selections.length === 0) {
      setStatus("No selections yet.");
      return;
    }

    const payload = {
      note: state.note,
      meta: {
        pageTitle: document.title || "",
        pageUrl: location.href,
        extractedAt: new Date().toISOString(),
        hotkey: `Ctrl+Shift+${hotkey.key.toUpperCase()}`
      },
      items: state.selections
    };

    try {
      setStatus("Sending...");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setStatus("Saved.");
      clearSelectedMarks();
      state.selections = [];
      state.note = "";
      setTimeout(() => stop(), 250);
    } catch (error) {
      setStatus("Save failed. Check backend server.");
      console.error("Extractor save error", error);
    }
  }

  function setupKeyboardFallback() {
    document.addEventListener(
      "keydown",
      (event) => {
        if (!event.ctrlKey || !event.shiftKey) return;
        if (event.key.toLowerCase() !== hotkey.key) return;

        if (isEditableTarget(event.target)) {
          event.preventDefault();
          toggle();
          return;
        }

        event.preventDefault();
        toggle();
      },
      true
    );
  }

  function setupRuntimeListener() {
    if (!chrome.runtime || !chrome.runtime.onMessage) return;
    chrome.runtime.onMessage.addListener((message) => {
      if (message && message.action === window.ExtractorConfig.messageAction.toggle) {
        toggle();
      }
    });
  }

  window.ExtractorSelection = {
    toggle,
    setupKeyboardFallback,
    setupRuntimeListener
  };
})();
