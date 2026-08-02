(function () {
  function parseLocalDate(date, time) {
    if (!date || !time) return null;
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }

  function formatClock(date) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function formatDuration(ms) {
    const sign = ms < 0 ? -1 : 1;
    const totalMinutes = Math.floor(Math.abs(ms) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const text = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    return sign < 0 ? `${text} ago` : `in ${text}`;
  }

  function getItemState(item) {
    return item.dataset.state || "pending";
  }

  function getScheduledItems(root) {
    return [...root.querySelectorAll(".trip-item[data-start-time]")].map((item) => {
      const start = parseLocalDate(root.dataset.tripDate, item.dataset.startTime);
      const leave = item.dataset.leaveTime
        ? parseLocalDate(root.dataset.tripDate, item.dataset.leaveTime)
        : null;
      return { item, start, leave };
    }).filter((x) => x.start);
  }

  function findNextItem(root, now) {
    const all = [...root.querySelectorAll(".trip-item")];

    const scheduled = getScheduledItems(root)
      .filter(({ item, start }) =>
        getItemState(item) === "pending" && start.getTime() >= now.getTime() - 15 * 60000
      )
      .sort((a, b) => a.start - b.start);

    if (scheduled.length) return scheduled[0].item;

    return all.find((item) => getItemState(item) === "pending") || null;
  }

  function updateCountdowns(root, now) {
    root.querySelectorAll(".trip-item[data-start-time]").forEach((item) => {
      const start = parseLocalDate(root.dataset.tripDate, item.dataset.startTime);
      const leave = item.dataset.leaveTime
        ? parseLocalDate(root.dataset.tripDate, item.dataset.leaveTime)
        : null;
      const target = leave && now < leave ? leave : start;
      const label = leave && now < leave ? "Leave" : "Starts";
      const el = item.querySelector(".trip-countdown");

      if (!el || !target) return;

      if (getItemState(item) !== "pending") {
        el.textContent = "Status updated";
        return;
      }

      el.textContent = `${label} ${formatDuration(target - now)}`;
    });
  }

  function updateDashboard(root) {
    const now = new Date();
    const items = [...root.querySelectorAll(".trip-item")];
    const completed = items.filter((x) => getItemState(x) === "done").length;
    const skipped = items.filter((x) => getItemState(x) === "skip").length;
    const remaining = items.length - completed - skipped;
    const percent = items.length ? Math.round(((completed + skipped) / items.length) * 100) : 0;

    const dashboard = document.querySelector(".trip-day-dashboard");
    if (!dashboard) return;

    dashboard.querySelector("[data-stat='progress']").textContent =
      `${completed} done · ${skipped} skipped · ${remaining} left`;

    dashboard.querySelector(".trip-progress-fill").style.width = `${percent}%`;

    const next = findNextItem(root, now);
    const nextLabel = dashboard.querySelector("[data-stat='next']");
    const nextLink = dashboard.querySelector(".trip-next-link");

    if (next) {
      const title = next.querySelector(".trip-item-title")?.textContent?.trim() || "Next item";
      nextLabel.textContent = title.replace(/^[^\w]+/, "");
      nextLink.href = `#${next.id}`;
      nextLink.hidden = false;
    } else {
      nextLabel.textContent = "Day complete";
      nextLink.hidden = true;
    }

    const upcoming = getScheduledItems(root)
      .filter(({ item, start }) =>
        getItemState(item) === "pending" && start.getTime() >= now.getTime() - 15 * 60000
      )
      .sort((a, b) => a.start - b.start)[0];

    const commitment = dashboard.querySelector("[data-stat='commitment']");
    if (upcoming) {
      const title = upcoming.item.querySelector(".trip-item-title")?.textContent?.trim() || "";
      commitment.textContent = `${formatClock(upcoming.start)} · ${title.replace(/^[^\w]+/, "")}`;
    } else {
      commitment.textContent = "No upcoming timed item";
    }

    dashboard.querySelector("[data-stat='updated']").textContent =
      now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    updateCountdowns(root, now);
  }

  function initialize() {
    const root = document.querySelector(".trip-checklist[data-trip-date]");
    if (!root) return;

    root.querySelectorAll(".trip-item").forEach((item) => {
      if (!item.id) item.id = `activity-${item.dataset.itemId}`;
    });

    updateDashboard(root);

    root.addEventListener("click", () => {
      window.setTimeout(() => updateDashboard(root), 50);
    });

    window.setInterval(() => updateDashboard(root), 60000);
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(initialize);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
