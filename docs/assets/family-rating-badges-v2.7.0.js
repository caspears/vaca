(function () {
  const RATINGS_FILE = "family-ride-ratings-v2.6.0.json";

  function assetBase() {
    const script = [...document.scripts].find(node =>
      (node.src || "").includes("family-rating-badges-v2.7.0")
    );
    return script?.src ? new URL(".", script.src) : new URL("assets/", document.baseURI);
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[™®]/g, "")
      .replace(/[’‘]/g, "'")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function currentPark() {
    const title =
      document.querySelector(".md-header__title .md-ellipsis")?.textContent ||
      document.querySelector("h1")?.textContent || "";

    const mappings = [
      ["Epic Universe", "Epic Universe"],
      ["Islands of Adventure", "Islands of Adventure"],
      ["Universal Studios", "Universal Studios Florida"],
      ["Animal Kingdom", "Animal Kingdom"],
      ["Hollywood Studios", "Hollywood Studios"],
      ["Magic Kingdom", "Magic Kingdom"],
    ];

    return mappings.find(([needle]) => title.includes(needle))?.[1] || "";
  }

  function rideNameNode(row) {
    return row.querySelector(
      ".live-ride-name, .priority-wait-jump-label, .priority-wait-name, " +
      ".live-wait-name, td:first-child"
    );
  }

  function ratingFor(parkRatings, rideName) {
    const target = normalize(rideName);

    for (const [name, metadata] of Object.entries(parkRatings || {})) {
      const candidate = normalize(name);
      if (
        candidate === target ||
        candidate.includes(target) ||
        target.includes(candidate)
      ) {
        return metadata;
      }
    }

    return null;
  }

  function formatRating(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "";
    return `${Number.isInteger(numeric) ? numeric : numeric.toFixed(1)}⭐`;
  }

  function decorate(row, metadata) {
    if (!metadata || row.querySelector(".family-rating-badge-v27")) return;

    const nameNode = rideNameNode(row);
    if (!nameNode) return;

    const badge = document.createElement("span");
    badge.className = `family-rating-badge-v27 family-rating-group-${metadata.group || "unrated"}`;
    badge.textContent = formatRating(metadata.rating);
    badge.title = `Family rating: ${metadata.rating} out of 5`;
    badge.setAttribute("aria-label", `Family rating ${metadata.rating} out of 5`);

    const link = nameNode.closest("a");
    if (link) {
      link.insertBefore(badge, link.firstChild);
    } else {
      nameNode.insertAdjacentElement("beforebegin", badge);
    }

    row.dataset.familyRating = String(metadata.rating);
    row.dataset.familyRatingGroup = metadata.group || "unrated";
  }

  async function initialize() {
    const park = currentPark();
    if (!park) return;

    let ratings;
    try {
      const response = await fetch(new URL(RATINGS_FILE, assetBase()), { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      ratings = await response.json();
    } catch (error) {
      console.warn("Family ratings unavailable:", error);
      return;
    }

    const parkRatings = ratings[park] || {};

    document.querySelectorAll(
      ".live-ride, .live-wait-row, .priority-wait-row, [data-ride-id]"
    ).forEach(row => {
      const name = rideNameNode(row)?.textContent || row.dataset.configuredRide || "";
      decorate(row, ratingFor(parkRatings, name));
    });
  }

  function schedule() {
    setTimeout(initialize, 500);
    setTimeout(initialize, 1600);
    setTimeout(initialize, 3200);
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(schedule);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule);
  } else {
    schedule();
  }
})();
