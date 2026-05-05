(() => {
  const { ids } = window.ExtractorConfig;

  function makeDraggable(root, handle) {
    let dragging = false;
    let pointerId = null;
    let offsetX = 0;
    let offsetY = 0;

    function onPointerDown(event) {
      if (event.button !== 0) return;

      dragging = true;
      pointerId = event.pointerId;
      root.classList.add("dragging");

      const rect = root.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;

      root.style.right = "auto";
      root.style.bottom = "auto";
      root.style.left = `${rect.left}px`;
      root.style.top = `${rect.top}px`;

      handle.setPointerCapture(pointerId);
      event.preventDefault();
      event.stopPropagation();
    }

    function onPointerMove(event) {
      if (!dragging || event.pointerId !== pointerId) return;

      const width = root.offsetWidth;
      const height = root.offsetHeight;

      const minLeft = 8;
      const minTop = 8;
      const maxLeft = Math.max(minLeft, window.innerWidth - width - 8);
      const maxTop = Math.max(minTop, window.innerHeight - height - 8);

      const nextLeft = Math.min(Math.max(event.clientX - offsetX, minLeft), maxLeft);
      const nextTop = Math.min(Math.max(event.clientY - offsetY, minTop), maxTop);

      root.style.left = `${nextLeft}px`;
      root.style.top = `${nextTop}px`;
    }

    function onPointerEnd(event) {
      if (!dragging || event.pointerId !== pointerId) return;

      dragging = false;
      root.classList.remove("dragging");
      handle.releasePointerCapture(pointerId);
      pointerId = null;
    }

    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerEnd);
    handle.addEventListener("pointercancel", onPointerEnd);
  }

  function ensureUI(onSave, onCancel, onNoteChange) {
    let root = document.getElementById(ids.root);
    if (root) return root;

    root = document.createElement("div");
    root.id = ids.root;
    root.innerHTML = `
      <div class="header" id="extractor-drag-handle">
        <div class="title">Selection mode</div>
        <div id="${ids.count}" class="count">0</div>
      </div>
      <input id="${ids.note}" type="text" placeholder="Add note (optional)" />
      <div class="row actions">
        <button id="${ids.save}">Save</button>
        <button id="${ids.cancel}" class="secondary">Cancel</button>
      </div>
      <div id="${ids.status}" class="status"></div>
    `;

    document.documentElement.appendChild(root);

    root.querySelector(`#${ids.save}`).addEventListener("click", onSave);
    root.querySelector(`#${ids.cancel}`).addEventListener("click", onCancel);
    root.querySelector(`#${ids.note}`).addEventListener("input", (event) => {
      onNoteChange(event.target.value || "");
    });

    const handle = root.querySelector("#extractor-drag-handle");
    makeDraggable(root, handle);

    return root;
  }

  function removeUI() {
    const root = document.getElementById(ids.root);
    if (root) root.remove();
  }

  function updateCount(count) {
    const countEl = document.getElementById(ids.count);
    if (countEl) countEl.textContent = String(count);
  }

  function setStatus(message) {
    const statusEl = document.getElementById(ids.status);
    if (statusEl) statusEl.textContent = message || "";
  }

  window.ExtractorUI = {
    ensureUI,
    removeUI,
    updateCount,
    setStatus
  };
})();
