(() => {
  function isEditableTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    if (!tag) return false;
    return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
  }

  function getCssPath(element) {
    if (!(element instanceof Element)) return "";
    const path = [];
    let node = element;

    while (node && node.nodeType === Node.ELEMENT_NODE) {
      let selector = node.nodeName.toLowerCase();
      if (node.id) {
        selector += `#${node.id}`;
        path.unshift(selector);
        break;
      }

      let sibling = node;
      let nth = 1;
      while (sibling.previousElementSibling) {
        sibling = sibling.previousElementSibling;
        if (sibling.nodeName.toLowerCase() === selector) nth += 1;
      }

      selector += `:nth-of-type(${nth})`;
      path.unshift(selector);
      node = node.parentElement;
    }

    return path.join(" > ");
  }

  function getXPath(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return "";
    if (element.id) return `//*[@id="${element.id}"]`;

    const parts = [];
    let node = element;
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = node.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === node.nodeName) {
          index += 1;
        }
        sibling = sibling.previousSibling;
      }
      const tagName = node.nodeName.toLowerCase();
      parts.unshift(`${tagName}[${index}]`);
      node = node.parentNode;
    }

    return "/" + parts.join("/");
  }

  function getAllAttrs(element) {
    if (!element || !element.attributes) return "";
    return Array.from(element.attributes)
      .map((attr) => `${attr.name}=${attr.value}`)
      .join(" ");
  }

  function getElementText(element) {
    const tag = element.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return element.value || "";
    if (tag === "IMG") return element.alt || "";
    return (element.innerText || "").trim();
  }

  window.ExtractorUtils = {
    isEditableTarget,
    getCssPath,
    getXPath,
    getAllAttrs,
    getElementText
  };
})();
