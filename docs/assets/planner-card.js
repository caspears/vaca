(function () {
  const COLLAPSED_KEY = "vaca-park-advisor-collapsed";
  const REFRESH_MS = 60000;

  function stateOf(item) {
    return item.dataset.state || "pending";
  }

  function cleanTitle(item) {
    return item?.querySelector(".trip-item-title")
      ?.textContent?.replace(/^[^\w]+/, "").trim() || "";
  }

  function detail(item, label) {
    const grid = item?.querySelector(".trip-detail-grid");
    if (!grid) return "";
    const children = [...grid.children];

    for (let index = 0; index < children.length; index += 2) {
      const heading = (children[index]?.textContent || "").trim().toLowerCase();
      if (heading === label.toLowerCase()) {
        return children[index + 1]?.textContent?.trim() || "";
      }
    }
    return "";
  }

  function nextItem(root) {
    return [...root.querySelectorAll(".trip-item")]
      .find(item => stateOf(item) === "pending") || null;
  }

  function remainingCommitments(root) {
    return [...root.querySelectorAll('.trip-item[data-commitment="true"]')]
      .filter(item => stateOf(item) === "pending")
      .slice(0, 6);
  }

  function renderWeather(advisor) {
    const source = document.querySelector("[data-live-weather]");
    const target = advisor.querySelector("[data-advisor-weather]");
    if (!target) return;

    if (!source) {
      target.textContent = "Forecast loading…";
      return;
    }

    const main = source.querySelector(".live-weather-main")?.textContent?.trim();
    const windows = [...source.querySelectorAll(".live-weather-windows > div")];

    if (main || windows.length) {
      target.innerHTML =
        (main ? `<div><strong>${main}</strong></div>` : "") +
        windows.slice(0, 3).map(row => `<div>${row.innerHTML}</div>`).join("");
      return;
    }

    const text = source.textContent.replace(/\s+/g, " ").trim();
    target.textContent = text || "Forecast loading…";
  }

  function chooseAdvice(next) {
    if (!next) return "All planned activities are complete.";

    const liveGuidance = detail(next, "Day-of guidance");
    if (liveGuidance) return liveGuidance;

    if (next.dataset.kind === "lightning") {
      return "Protect the confirmed return window and use the reserved lane.";
    }

    if (next.dataset.kind === "meal") {
      return "Protect this dining commitment and start moving with the planned buffer.";
    }

    return "Continue with the ordered itinerary unless live conditions suggest a nearby better option.";
  }

  function render(advisor, root) {
    const next = nextItem(root);

    advisor.querySelector("[data-advisor-next-title]").textContent =
      next ? cleanTitle(next) : "Day complete";

    advisor.querySelector("[data-advisor-next-meta]").textContent =
      next
        ? [next.dataset.windowLabel || "", next.dataset.leaveLabel || ""]
            .filter(Boolean)
            .join(" · ")
        : "";

    advisor.querySelector("[data-advisor-collapsed-text]").textContent =
      next
        ? `Next: ${cleanTitle(next)}${next.dataset.windowLabel ? ` (${next.dataset.windowLabel})` : ""}`
        : "Day complete";

    const commitments = remainingCommitments(root);
    advisor.querySelector("[data-advisor-commitments]").innerHTML =
      commitments.map(item => `
        <div class="park-advisor-item">
          <span>${item.dataset.kind === "meal" ? "🍽️" : item.dataset.kind === "show" ? "🎭" : "⚡"}</span>
          <span>${cleanTitle(item)}</span>
          <span class="park-advisor-time">${item.dataset.windowLabel || ""}</span>
        </div>
      `).join("") || "<div>No remaining timed commitments.</div>";

    advisor.querySelector("[data-advisor-advice]").textContent =
      chooseAdvice(next);

    const waits = [...root.querySelectorAll(".trip-item")]
      .filter(item => stateOf(item) === "pending")
      .map(item => ({ item, wait: detail(item, "Current wait") }))
      .filter(entry => entry.wait)
      .slice(0, 3);

    advisor.querySelector("[data-advisor-watch]").innerHTML =
      waits.map(entry => `
        <div class="park-advisor-item">
          <span>⏱</span>
          <span>${cleanTitle(entry.item)}</span>
          <span class="park-advisor-time">${entry.wait.replace("· Queue-Times details", "").trim()}</span>
        </div>
      `).join("") || "<div>Live ride waits will appear after data loads.</div>";

    renderWeather(advisor);

    const updated = document.querySelector("[data-live-updated]")?.textContent?.trim();
    advisor.querySelector("[data-advisor-status]").textContent =
      updated && updated !== "—"
        ? `Live data updated ${updated}. Official park apps remain authoritative.`
        : "Live data is loading. Official park apps remain authoritative.";
  }

  function initialize() {
    const advisor = document.querySelector(".park-advisor");
    const root = document.querySelector(".trip-checklist");

    if (!advisor || !root || advisor.dataset.initialized === "true") return;
    advisor.dataset.initialized = "true";

    advisor.classList.toggle(
      "is-collapsed",
      localStorage.getItem(COLLAPSED_KEY) === "true"
    );

    advisor.querySelector(".park-advisor-toggle")?.addEventListener("click", () => {
      const collapse = !advisor.classList.contains("is-collapsed");
      advisor.classList.toggle("is-collapsed", collapse);
      localStorage.setItem(COLLAPSED_KEY, String(collapse));
    });

    const update = () => render(advisor, root);

    // Initial render after the rest of the page scripts have had a chance to run.
    window.setTimeout(update, 150);

    // Update only on user interactions likely to change state.
    root.addEventListener("click", () => window.setTimeout(update, 120));
    root.addEventListener("trip-state-change", () => window.setTimeout(update, 50));

    // Live-data script refreshes every five minutes; this lightweight refresh keeps
    // the planner synchronized without observing or rewriting the whole DOM.
    window.setInterval(update, REFRESH_MS);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        window.setTimeout(update, 100);
      }
    });
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(initialize);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
