(function () {
  const EXPANDED_KEY = "vaca-navigator-expanded";

  function stateOf(item) {
    return item.dataset.state || "pending";
  }

  function ratingKey(dayId, itemId) {
    return `vaca-rating:${dayId}:${itemId}`;
  }

  function revisitKey(dayId, itemId) {
    return `vaca-revisit:${dayId}:${itemId}`;
  }

  function setExpanded(navigator, expanded) {
    navigator.classList.toggle("is-expanded", expanded);
    navigator.querySelectorAll("[data-nav='toggle']").forEach((button) => {
      button.setAttribute("aria-expanded", expanded ? "true" : "false");
      if (button.classList.contains("trip-nav-icon-button")) {
        button.textContent = expanded ? "▲" : "▼";
      }
    });
    localStorage.setItem(EXPANDED_KEY, String(expanded));
  }

  function renderRating(item, dayId) {
    const itemId = item.dataset.itemId;
    const rating = Number(localStorage.getItem(ratingKey(dayId, itemId)) || 0);
    const revisit = localStorage.getItem(revisitKey(dayId, itemId)) === "true";

    item.querySelectorAll(".trip-rating-star").forEach((button) => {
      const value = Number(button.dataset.ratingValue);
      const active = value <= rating;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    const revisitButton = item.querySelector(".trip-revisit-toggle");
    if (revisitButton) {
      revisitButton.setAttribute("aria-pressed", revisit ? "true" : "false");
      revisitButton.textContent = revisit ? "🔁 Revisit: Yes" : "🔁 Revisit?";
    }

    const summary = item.querySelector(".trip-rating-summary");
    if (summary) {
      if (!rating && !revisit) summary.textContent = "Not rated yet.";
      else {
        summary.textContent =
          `${rating ? `${rating}/5 stars` : "No star rating"}${revisit ? " · marked to revisit" : ""}`;
      }
    }

    // Keep metadata current for the aggregate revisit page.
    const metadata = {
      dayId,
      itemId,
      title: item.querySelector(".trip-item-title")?.textContent?.replace(/^[^\w]+/, "").trim() || itemId,
      park: item.dataset.parkName || item.dataset.park || "Other",
      navigateUrl: item.dataset.navigateUrl || "",
      locateUrl: item.dataset.locateUrl || "",
      pageUrl: `${location.pathname}#${item.id}`
    };
    localStorage.setItem(`vaca-item-meta:${dayId}:${itemId}`, JSON.stringify(metadata));
  }

  function initializeRatings(root) {
    const dayId = root.dataset.dayId;
    root.querySelectorAll(".trip-item").forEach((item) => {
      if (item.dataset.ratingInitialized === "true") return;
      item.dataset.ratingInitialized = "true";

      item.querySelectorAll(".trip-rating-star").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const value = button.dataset.ratingValue;
          localStorage.setItem(ratingKey(dayId, item.dataset.itemId), value);
          renderRating(item, dayId);
        });
      });

      const revisitButton = item.querySelector(".trip-revisit-toggle");
      if (revisitButton) {
        revisitButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const key = revisitKey(dayId, item.dataset.itemId);
          const next = localStorage.getItem(key) !== "true";
          localStorage.setItem(key, String(next));
          renderRating(item, dayId);
        });
      }

      renderRating(item, dayId);
    });
  }

  function updateNavigator(root, navigator) {
    const items = [...root.querySelectorAll(".trip-item")];
    const done = items.filter((item) => stateOf(item) === "done").length;
    const skipped = items.filter((item) => stateOf(item) === "skip").length;
    const next = items.find((item) => stateOf(item) === "pending");
    const remaining = items.length - done - skipped;

    navigator.querySelector("[data-nav='progress']").textContent =
      `${done} done · ${skipped} skipped · ${remaining} left`;

    const fill = navigator.querySelector(".trip-nav-progress-fill");
    if (fill && items.length) {
      fill.style.width = `${Math.round(((done + skipped) / items.length) * 100)}%`;
    }

    if (next) {
      navigator.dataset.activePark = next.dataset.park || "ak";
      const icon = ({lightning:"⚡", meal:"🍽️", show:"🎭", transfer:"🚌"})[next.dataset.kind] || "📍";
      navigator.querySelector("[data-nav='next-icon']").textContent = icon;
      navigator.querySelector("[data-nav='next-title']").textContent =
        next.querySelector(".trip-item-title")?.textContent?.replace(/^[^\w]+/, "").trim() || "Next activity";
      navigator.querySelector("[data-nav='next-time']").textContent =
        next.dataset.windowLabel || "";
      navigator.querySelectorAll("[data-nav='jump']").forEach((link) => {
        link.href = `#${next.id}`;
        link.hidden = false;
      });
    } else {
      navigator.querySelector("[data-nav='next-icon']").textContent = "✅";
      navigator.querySelector("[data-nav='next-title']").textContent = "Day complete";
      navigator.querySelector("[data-nav='next-time']").textContent = "";
      navigator.querySelectorAll("[data-nav='jump']").forEach((link) => link.hidden = true);
    }

    const commitment = items.find(
      (item) => item.dataset.commitment === "true" && stateOf(item) === "pending"
    );
    navigator.querySelector("[data-nav='commitment']").textContent = commitment
      ? `${commitment.dataset.windowLabel || ""} · ${commitment.querySelector(".trip-item-title")?.textContent?.replace(/^[^\w]+/, "").trim() || ""}`
      : "No upcoming timed commitment";
    navigator.querySelector("[data-nav='leave']").textContent =
      commitment?.dataset.leaveLabel || "—";
    navigator.querySelector("[data-nav='updated']").textContent =
      new Date().toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
  }

  function initializeDay() {
    const root = document.querySelector(".trip-checklist[data-day-id]");
    const navigator = document.querySelector(".trip-navigator");
    if (!root) return;

    initializeRatings(root);

    if (navigator && navigator.dataset.ratingNavInitialized !== "true") {
      navigator.dataset.ratingNavInitialized = "true";
      setExpanded(navigator, localStorage.getItem(EXPANDED_KEY) === "true");

      navigator.querySelectorAll("[data-nav='toggle']").forEach((button) => {
        button.addEventListener("click", () => {
          setExpanded(navigator, !navigator.classList.contains("is-expanded"));
        });
      });

      root.addEventListener("click", () => {
        window.setTimeout(() => updateNavigator(root, navigator), 75);
      });

      updateNavigator(root, navigator);
      window.setInterval(() => updateNavigator(root, navigator), 60000);
    }
  }

  function buildRevisitPage() {
    const root = document.querySelector("[data-revisit-list]");
    if (!root) return;

    const entries = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith("vaca-revisit:")) continue;
      if (localStorage.getItem(key) !== "true") continue;

      const suffix = key.substring("vaca-revisit:".length);
      const metadataRaw = localStorage.getItem(`vaca-item-meta:${suffix}`);
      if (!metadataRaw) continue;

      try {
        const metadata = JSON.parse(metadataRaw);
        const rating = Number(localStorage.getItem(`vaca-rating:${suffix}`) || 0);
        entries.push({...metadata, rating});
      } catch (_) {
        // Ignore malformed browser-local metadata.
      }
    }

    if (!entries.length) {
      root.innerHTML =
        '<div class="revisit-empty">No attractions are marked for revisit in this browser yet.</div>';
      return;
    }

    const byPark = new Map();
    entries
      .sort((a, b) => String(a.park).localeCompare(String(b.park)) || String(a.title).localeCompare(String(b.title)))
      .forEach((entry) => {
        if (!byPark.has(entry.park)) byPark.set(entry.park, []);
        byPark.get(entry.park).push(entry);
      });

    root.innerHTML = [...byPark.entries()].map(([park, items]) => `
      <section class="revisit-park">
        <h2>${park}</h2>
        <div class="revisit-grid">
          ${items.map((item) => `
            <article class="revisit-card">
              <h3>${item.title}</h3>
              <div class="revisit-rating">${item.rating ? `${"★".repeat(item.rating)}${"☆".repeat(5-item.rating)} · ${item.rating}/5` : "Not rated"}</div>
              <div class="revisit-actions">
                ${item.navigateUrl ? `<a href="${item.navigateUrl}" target="_blank" rel="noopener">➜ Navigate</a>` : ""}
                ${item.locateUrl ? `<a href="${item.locateUrl}" target="_blank" rel="noopener">📍 Locate</a>` : ""}
                ${item.pageUrl ? `<a href="${item.pageUrl}">📋 Day entry</a>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `).join("");
  }

  function initialize() {
    initializeDay();
    buildRevisitPage();
  }

  if (typeof document$ !== "undefined") document$.subscribe(initialize);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();