(function () {
  const STORAGE_KEY = "vaca-entity-review-v1";

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function itemState(state, itemId) {
    if (!state[itemId]) {
      state[itemId] = {
        selected_tpw_candidate: "",
        selected_queue_candidate: "",
        match_status: "",
        review_note: ""
      };
    }
    return state[itemId];
  }

  function updateProgress(state) {
    const items = document.querySelectorAll(".entity-review-item");
    const reviewed = [...items].filter(item => {
      const value = state[item.dataset.itemId];
      return value && value.match_status;
    }).length;

    const progress = document.getElementById("entity-review-progress");
    if (progress) progress.textContent = `${reviewed} of ${items.length} reviewed`;
  }

  function restore(state) {
    document.querySelectorAll(".entity-review-item").forEach(item => {
      const itemId = item.dataset.itemId;
      const value = itemState(state, itemId);

      if (value.selected_tpw_candidate) {
        item.querySelector(
          `input[data-provider="tpw"][value="${value.selected_tpw_candidate}"]`
        )?.click();
      }

      if (value.selected_queue_candidate) {
        item.querySelector(
          `input[data-provider="queue"][value="${value.selected_queue_candidate}"]`
        )?.click();
      }

      if (value.match_status) {
        const status = item.querySelector(
          `input[data-status-item="${itemId}"][value="${value.match_status}"]`
        );
        if (status) status.checked = true;
      }

      const note = item.querySelector(`[data-note-item="${itemId}"]`);
      if (note) note.value = value.review_note || "";

      item.classList.toggle("is-reviewed", Boolean(value.match_status));
    });
    updateProgress(state);
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportCsv(state) {
    const headers = [
      "itinerary_id",
      "itinerary_name",
      "kind",
      "park_scope",
      "selected_tpw_candidate",
      "selected_queue_candidate",
      "match_status",
      "review_note"
    ];

    const rows = [...document.querySelectorAll(".entity-review-item")].map(item => {
      const value = itemState(state, item.dataset.itemId);
      return {
        itinerary_id: item.dataset.itemId,
        itinerary_name: item.dataset.name,
        kind: item.dataset.kind,
        park_scope: item.dataset.park,
        ...value
      };
    });

    const csv = [
      headers.join(","),
      ...rows.map(row => headers.map(header => csvEscape(row[header])).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reviewed_matches.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function initialize() {
    const root = document.querySelector(".entity-review-toolbar");
    if (!root || root.dataset.initialized === "true") return;
    root.dataset.initialized = "true";

    const state = loadState();

    document.querySelectorAll("input[data-provider]").forEach(input => {
      input.addEventListener("change", () => {
        const value = itemState(state, input.dataset.itemId);
        if (input.dataset.provider === "tpw") {
          value.selected_tpw_candidate = input.value;
        } else {
          value.selected_queue_candidate = input.value;
        }
        saveState(state);
      });
    });

    document.querySelectorAll("input[data-status-item]").forEach(input => {
      input.addEventListener("change", () => {
        const itemId = input.dataset.statusItem;
        const value = itemState(state, itemId);
        value.match_status = input.value;
        const item = document.querySelector(`.entity-review-item[data-item-id="${itemId}"]`);
        item?.classList.toggle("is-reviewed", Boolean(input.value));
        saveState(state);
        updateProgress(state);
      });
    });

    document.querySelectorAll("[data-note-item]").forEach(input => {
      input.addEventListener("input", () => {
        const value = itemState(state, input.dataset.noteItem);
        value.review_note = input.value;
        saveState(state);
      });
    });

    document.getElementById("entity-review-export")?.addEventListener("click", () => {
      exportCsv(state);
    });

    document.getElementById("entity-review-clear")?.addEventListener("click", () => {
      if (!confirm("Clear all saved entity-review selections on this device?")) return;
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    });

    restore(state);
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(initialize);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
