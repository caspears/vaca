(function () {
  const WAIT_HISTORY_PREFIX = "vaca-wait-history:";

  function stateLabel(state) {
    return {
      pending: "○ Planned",
      skip: "◐ Skip",
      done: "● Complete"
    }[state] || "○ Planned";
  }

  function initializeStateControls() {
    document.querySelectorAll(".trip-item").forEach(item => {
      if (item.dataset.segmentedStateInitialized === "true") return;
      item.dataset.segmentedStateInitialized = "true";

      const oldButton = item.querySelector(".trip-item-state");
      const control = document.createElement("div");
      control.className = "trip-state-control";

      ["pending", "skip", "done"].forEach(state => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "trip-state-button";
        button.dataset.stateChoice = state;
        button.textContent = stateLabel(state);
        button.setAttribute("aria-pressed", item.dataset.state === state ? "true" : "false");

        button.addEventListener("click", () => {
          item.dataset.state = state;
          control.querySelectorAll(".trip-state-button").forEach(candidate => {
            candidate.setAttribute(
              "aria-pressed",
              candidate.dataset.stateChoice === state ? "true" : "false"
            );
          });

          // Let the existing checklist script persist the state by emulating
          // the original button cycle until it reaches the requested state.
          if (oldButton) {
            const cycle = { pending: 0, skip: 1, done: 2 };
            for (let i = 0; i < 3; i++) {
              if ((oldButton.textContent || "").toLowerCase().includes(
                state === "pending" ? "not decided" : state === "skip" ? "skip" : "complete"
              )) break;
              oldButton.click();
            }
          }

          item.dispatchEvent(new CustomEvent("trip-state-change", {bubbles:true}));
        });
        control.appendChild(button);
      });

      if (oldButton) oldButton.insertAdjacentElement("afterend", control);
      else item.querySelector(".trip-item-main")?.appendChild(control);
    });
  }

  function initializeTimeline() {
    document.querySelectorAll(".day-timeline-entry").forEach(link => {
      const targetId = link.getAttribute("href")?.replace("#", "");
      const target = document.getElementById(targetId);
      if (!target) return;

      const refresh = () => {
        const state = target.dataset.state || "pending";
        link.dataset.state = state;
        const dot = link.querySelector(".day-timeline-dot");
        if (dot) dot.textContent = state === "done" ? "✓" : state === "skip" ? "–" : dot.dataset.number;
      };

      refresh();
      target.addEventListener("trip-state-change", refresh);
      target.addEventListener("click", () => setTimeout(refresh, 75));
    });
  }

  function applyWaitTrend(link) {
    const item = link.closest(".trip-item");
    if (!item) return;
    const itemId = item.dataset.itemId;
    const match = link.textContent.match(/(\d+)\s*min/i);
    if (!match) return;

    const current = Number(match[1]);
    const key = `${WAIT_HISTORY_PREFIX}${itemId}`;
    const prior = Number(localStorage.getItem(key) || current);
    const difference = current - prior;

    link.dataset.trend = difference >= 10 ? "up" : difference <= -10 ? "down" : "flat";
    localStorage.setItem(key, String(current));
  }

  function observeLiveWaits() {
    document.querySelectorAll(".card-live-wait").forEach(applyWaitTrend);

    const observer = new MutationObserver(() => {
      document.querySelectorAll(".card-live-wait").forEach(applyWaitTrend);
    });
    observer.observe(document.body, {childList:true, subtree:true});
  }

  function initialize() {
    initializeStateControls();
    initializeTimeline();
    observeLiveWaits();
  }

  if (typeof document$ !== "undefined") document$.subscribe(initialize);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
