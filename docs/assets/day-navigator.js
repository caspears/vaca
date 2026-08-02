(function () {
  const EXPANDED_KEY = "vaca-navigator-expanded";

  function parseLocalDate(date, time) {
    if (!date || !time) return null;
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }

  function formatClock(date) {
    if (!date) return "Flexible";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function formatDuration(ms) {
    const totalMinutes = Math.max(0, Math.floor(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  function stateOf(item) {
    return item.dataset.state || "pending";
  }

  function pendingItems(root) {
    return [...root.querySelectorAll(".trip-item")].filter(
      item => stateOf(item) === "pending"
    );
  }

  function scheduledPending(root, now) {
    return pendingItems(root)
      .map(item => ({
        item,
        start: parseLocalDate(root.dataset.tripDate, item.dataset.startTime),
        leave: parseLocalDate(root.dataset.tripDate, item.dataset.leaveTime)
      }))
      .filter(x => x.start)
      .filter(x => x.start.getTime() >= now.getTime() - 15 * 60000)
      .sort((a, b) => a.start - b.start);
  }

  function nextItem(root, now) {
    const timed = scheduledPending(root, now);
    if (timed.length) return timed[0].item;
    return pendingItems(root)[0] || null;
  }

  function nextCommitment(root, now) {
    const candidates = scheduledPending(root, now).filter(({item}) =>
      item.dataset.commitment === "true"
    );
    return candidates[0] || null;
  }

  function iconFor(item) {
    if (!item) return "📍";
    if (item.dataset.kind === "lightning") return "⚡";
    if (item.dataset.kind === "meal") return "🍽️";
    if (item.dataset.kind === "show") return "🎭";
    if (item.dataset.kind === "transfer") return "🚌";
    return "📍";
  }

  function parkFor(item) {
    if (!item) return "ak";
    return item.dataset.park || "ak";
  }

  function ratingKey(dayId, itemId) {
    return `vaca-rating:${dayId}:${itemId}`;
  }

  function revisitKey(dayId, itemId) {
    return `vaca-revisit:${dayId}:${itemId}`;
  }

  function renderRating(item, dayId) {
    const itemId = item.dataset.itemId;
    const rating = Number(localStorage.getItem(ratingKey(dayId, itemId)) || 0);
    const revisit = localStorage.getItem(revisitKey(dayId, itemId)) === "true";

    item.querySelectorAll(".trip-rating-star").forEach(button => {
      const value = Number(button.dataset.ratingValue);
      button.classList.toggle("is-active", value <= rating);
      button.setAttribute("aria-pressed", value <= rating ? "true" : "false");
    });

    const revisitButton = item.querySelector(".trip-revisit-toggle");
    if (revisitButton) {
      revisitButton.setAttribute("aria-pressed", revisit ? "true" : "false");
      revisitButton.textContent = revisit ? "🔁 Revisit: Yes" : "🔁 Revisit?";
    }

    const summary = item.querySelector(".trip-rating-summary");
    if (summary) {
      if (!rating && !revisit) summary.textContent = "Not rated yet.";
      else summary.textContent =
        `${rating ? `${rating}/5 stars` : "No star rating"}${revisit ? " · marked to revisit" : ""}`;
    }
  }

  function initializeRatings(root) {
    const dayId = root.dataset.dayId;

    root.querySelectorAll(".trip-item").forEach(item => {
      if (item.dataset.ratingInitialized === "true") return;
      item.dataset.ratingInitialized = "true";

      item.querySelectorAll(".trip-rating-star").forEach(button => {
        button.addEventListener("click", () => {
          const value = button.dataset.ratingValue;
          localStorage.setItem(ratingKey(dayId, item.dataset.itemId), value);
          renderRating(item, dayId);
        });
      });

      const revisitButton = item.querySelector(".trip-revisit-toggle");
      if (revisitButton) {
        revisitButton.addEventListener("click", () => {
          const key = revisitKey(dayId, item.dataset.itemId);
          const current = localStorage.getItem(key) === "true";
          localStorage.setItem(key, String(!current));
          renderRating(item, dayId);
        });
      }

      renderRating(item, dayId);
    });
  }

  function update(root, navigator) {
    const now = new Date();
    const all = [...root.querySelectorAll(".trip-item")];
    const done = all.filter(x => stateOf(x) === "done").length;
    const skipped = all.filter(x => stateOf(x) === "skip").length;
    const remaining = all.length - done - skipped;
    const percent = all.length ? Math.round(((done + skipped) / all.length) * 100) : 0;

    const next = nextItem(root, now);
    const commitment = nextCommitment(root, now);

    navigator.dataset.activePark = parkFor(next);

    const icon = navigator.querySelector("[data-nav='next-icon']");
    const title = navigator.querySelector("[data-nav='next-title']");
    const time = navigator.querySelector("[data-nav='next-time']");
    const jump = navigator.querySelector("[data-nav='jump']");

    if (next) {
      icon.textContent = iconFor(next);
      title.textContent =
        next.querySelector(".trip-item-title")?.textContent?.replace(/^[^\w]+/, "").trim()
        || "Next activity";

      const start = parseLocalDate(root.dataset.tripDate, next.dataset.startTime);
      time.textContent = formatClock(start);
      jump.href = `#${next.id}`;
      jump.hidden = false;
    } else {
      icon.textContent = "✅";
      title.textContent = "Day complete";
      time.textContent = "";
      jump.hidden = true;
    }

    navigator.querySelector("[data-nav='progress']").textContent =
      `${done} done · ${skipped} skipped · ${remaining} left`;
    navigator.querySelector(".trip-nav-progress-fill").style.width = `${percent}%`;

    const commitmentValue = navigator.querySelector("[data-nav='commitment']");
    const leaveValue = navigator.querySelector("[data-nav='leave']");
    if (commitment) {
      const cTitle = commitment.item
        .querySelector(".trip-item-title")
        ?.textContent?.replace(/^[^\w]+/, "").trim() || "";
      commitmentValue.textContent = `${formatClock(commitment.start)} · ${cTitle}`;

      if (commitment.leave) {
        const ms = commitment.leave - now;
        leaveValue.textContent =
          ms > 0
            ? `${formatClock(commitment.leave)} · ${formatDuration(ms)} remaining`
            : `${formatClock(commitment.leave)} · leave now`;
      } else {
        leaveValue.textContent = "No leave-by time";
      }
    } else {
      commitmentValue.textContent = "No upcoming timed commitment";
      leaveValue.textContent = "—";
    }

    navigator.querySelector("[data-nav='updated']").textContent =
      now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function initialize() {
    const root = document.querySelector(".trip-checklist[data-trip-date]");
    const navigator = document.querySelector(".trip-navigator");
    if (!root || !navigator) return;
    if (navigator.dataset.initialized === "true") return;

    navigator.dataset.initialized = "true";

    root.querySelectorAll(".trip-item").forEach(item => {
      if (!item.id) item.id = `activity-${item.dataset.itemId}`;
    });

    const expanded = localStorage.getItem(EXPANDED_KEY) === "true";
    navigator.classList.toggle("is-expanded", expanded);

    const toggle = navigator.querySelector("[data-nav='toggle']");
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    toggle.textContent = expanded ? "▲" : "▼";

    toggle.addEventListener("click", () => {
      const nextState = !navigator.classList.contains("is-expanded");
      navigator.classList.toggle("is-expanded", nextState);
      toggle.setAttribute("aria-expanded", nextState ? "true" : "false");
      toggle.textContent = nextState ? "▲" : "▼";
      localStorage.setItem(EXPANDED_KEY, String(nextState));
    });

    initializeRatings(root);
    update(root, navigator);

    root.addEventListener("click", () => {
      window.setTimeout(() => update(root, navigator), 50);
    });

    window.setInterval(() => update(root, navigator), 60000);
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(initialize);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
