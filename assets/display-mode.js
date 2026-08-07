(function () {
  const STORAGE_KEY = "vaca-display-mode";
  const MODES = ["sunlight", "light", "dark"];

  function applyMode(mode) {
    const resolved = MODES.includes(mode) ? mode : "sunlight";
    document.documentElement.dataset.tripDisplay = resolved;

    if (resolved === "dark") {
      document.body.setAttribute("data-md-color-scheme", "slate");
    } else {
      document.body.setAttribute("data-md-color-scheme", "default");
    }

    localStorage.setItem(STORAGE_KEY, resolved);

    document.querySelectorAll(".trip-display-control button").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        button.dataset.mode === resolved ? "true" : "false"
      );
    });
  }

  function createControl() {
    if (document.querySelector(".trip-display-control")) return;

    const control = document.createElement("div");
    control.className = "trip-display-control";
    control.setAttribute("aria-label", "Display mode");

    const options = [
      ["sunlight", "☀️", "Sunlight mode"],
      ["light", "◐", "Standard light mode"],
      ["dark", "🌙", "Dark mode"]
    ];

    options.forEach(([mode, icon, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.mode = mode;
      button.textContent = icon;
      button.title = label;
      button.setAttribute("aria-label", label);
      button.addEventListener("click", () => applyMode(mode));
      control.appendChild(button);
    });

    document.body.appendChild(control);
    applyMode(localStorage.getItem(STORAGE_KEY) || "sunlight");
  }

  function initialize() {
    createControl();
    applyMode(localStorage.getItem(STORAGE_KEY) || "sunlight");
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(initialize);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
