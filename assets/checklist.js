(function () {
  const STATES = ["pending", "done", "skip"];
  const LABELS = {
    pending: "⬜ Not decided",
    done: "✅ Completed",
    skip: "⏭️ Skipped"
  };

  function storageKey(dayId, itemId) {
    return `vaca-checklist:${dayId}:${itemId}`;
  }

  function getStoredState(dayId, itemId) {
    const value = localStorage.getItem(storageKey(dayId, itemId));
    return STATES.includes(value) ? value : "pending";
  }

  function saveState(dayId, itemId, state) {
    localStorage.setItem(storageKey(dayId, itemId), state);
  }

  function updateItem(item) {
    const button = item.querySelector(".trip-item-state");
    if (!button) return;
    button.textContent = LABELS[item.dataset.state];
    button.setAttribute(
      "aria-label",
      `Status: ${LABELS[item.dataset.state]}. Tap to change.`
    );
  }

  function updateSummary(root) {
    const counts = { pending: 0, done: 0, skip: 0 };

    root.querySelectorAll(".trip-item").forEach((item) => {
      counts[item.dataset.state] += 1;
    });

    const summary = root.querySelector(".trip-checklist-summary");
    if (summary) {
      summary.textContent =
        `${counts.done} completed · ${counts.skip} skipped · ${counts.pending} remaining`;
    }
  }

  function initializeChecklist(root) {
    if (root.dataset.initialized === "true") return;

    const dayId = root.dataset.dayId;
    if (!dayId) return;

    root.dataset.initialized = "true";

    root.querySelectorAll(".trip-item").forEach((item) => {
      const itemId = item.dataset.itemId;
      if (!itemId) return;

      item.dataset.state = getStoredState(dayId, itemId);
      updateItem(item);

      const button = item.querySelector(".trip-item-state");
      if (!button) return;

      button.addEventListener("click", () => {
        const current = item.dataset.state || "pending";
        const next = STATES[(STATES.indexOf(current) + 1) % STATES.length];

        item.dataset.state = next;
        saveState(dayId, itemId, next);
        updateItem(item);
        updateSummary(root);
      });
    });

    const filterButton = root.querySelector("[data-action='toggle-finished']");
    if (filterButton) {
      filterButton.addEventListener("click", () => {
        root.classList.toggle("hide-finished");
        filterButton.textContent = root.classList.contains("hide-finished")
          ? "Show all"
          : "Show unfinished only";
      });
    }

    const resetButton = root.querySelector("[data-action='reset-day']");
    if (resetButton) {
      resetButton.addEventListener("click", () => {
        if (!window.confirm("Reset all checklist statuses for this day?")) return;

        root.querySelectorAll(".trip-item").forEach((item) => {
          item.dataset.state = "pending";
          saveState(dayId, item.dataset.itemId, "pending");
          updateItem(item);
        });

        updateSummary(root);
      });
    }

    updateSummary(root);
  }

  function initializeAllChecklists() {
    document.querySelectorAll(".trip-checklist").forEach(initializeChecklist);
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(initializeAllChecklists);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAllChecklists);
  } else {
    initializeAllChecklists();
  }
})();
