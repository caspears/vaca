(function () {
  const SCRIPT_MARKER = "location-context-v2.4.js";
  const WALKING_SPEED_FT_PER_MINUTE = 250;
  const PATH_MULTIPLIER = 1.35;

  function catalogUrl() {
    const script = [...document.scripts].find(item =>
      (item.src || "").includes(SCRIPT_MARKER)
    );
    if (script?.src) {
      return new URL("data/trip_entities.json", script.src).toString();
    }
    return new URL("assets/data/trip_entities.json", document.baseURI).toString();
  }

  function haversineMeters(a, b) {
    const radius = 6371000;
    const radians = value => value * Math.PI / 180;
    const lat1 = radians(a.latitude);
    const lat2 = radians(b.latitude);
    const deltaLat = radians(b.latitude - a.latitude);
    const deltaLon = radians(b.longitude - a.longitude);

    const value =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

    return 2 * radius * Math.asin(Math.sqrt(value));
  }

  function formatDistance(meters) {
    const feet = meters * 3.28084;
    if (feet < 1000) return `${Math.round(feet / 25) * 25} ft`;
    return `${(feet / 5280).toFixed(1)} mi`;
  }

  function walkingRange(meters) {
    const adjustedFeet = meters * 3.28084 * PATH_MULTIPLIER;
    const midpoint = adjustedFeet / WALKING_SPEED_FT_PER_MINUTE;
    const low = Math.max(2, Math.floor(midpoint * 0.8));
    const high = Math.max(low + 1, Math.ceil(midpoint * 1.25));
    return `${low}–${high} min`;
  }

  function locationOf(entity) {
    const location = entity?.location;
    if (
      !location ||
      location.status !== "VERIFIED" ||
      typeof location.latitude !== "number" ||
      typeof location.longitude !== "number"
    ) {
      return null;
    }
    return {
      latitude: location.latitude,
      longitude: location.longitude
    };
  }

  function resolveEntity(item, entities) {
    const itemId = item.dataset.itemId;
    const parkName = item.dataset.parkName || "";

    const exact = entities[itemId];
    if (exact && exact.parkName === parkName) return exact;

    return Object.values(entities).find(entity =>
      entity.itineraryId === itemId &&
      (!parkName || entity.parkName === parkName)
    ) || exact || null;
  }

  function updateLinks(item, location) {
    const coordinate = `${location.latitude},${location.longitude}`;
    const locate = item.querySelector('.trip-item-actions a[href*="google.com/maps/search"]');
    const navigate = item.querySelector('.trip-item-actions a[href*="google.com/maps/dir"]');

    if (locate) {
      locate.href =
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinate)}`;
      locate.dataset.coordinateBacked = "true";
      locate.title = "Open this verified coordinate in Google Maps";
    }

    if (navigate) {
      navigate.href =
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinate)}&travelmode=walking`;
      navigate.dataset.coordinateBacked = "true";
      navigate.title = "Request walking directions to this verified coordinate";
    }
  }

  function updateTravel(item, previousItem, previousLocation, location) {
    const travel = item.querySelector(".trip-item-travel");
    if (!travel || !previousItem || !previousLocation || !location) return;

    const currentPark = item.dataset.parkName || "";
    const previousPark = previousItem.dataset.parkName || "";
    if (!currentPark || currentPark !== previousPark) return;

    const meters = haversineMeters(previousLocation, location);
    const routeEstimateMeters = meters * PATH_MULTIPLIER;

    const original = travel.textContent
      .replace(/\s+/g, " ")
      .replace(/^From previous:\s*/i, "")
      .trim();

    travel.innerHTML = `
      <strong>From previous:</strong>
      <span class="coordinate-travel-primary">
        ≈ ${formatDistance(routeEstimateMeters)} · ${walkingRange(meters)}
      </span>
      <span class="coordinate-travel-note">
        coordinate-based estimate; park paths may be longer
      </span>
      ${original ? `<span class="coordinate-travel-original">${original}</span>` : ""}
    `;
    travel.dataset.coordinateEstimate = "true";
  }

  function addCatalogStatus(item, entity) {
    if (!entity) return;
    item.dataset.catalogId = entity.catalogId || "";

    const location = locationOf(entity);
    if (location) {
      item.dataset.locationStatus = "verified";
    } else {
      item.dataset.locationStatus = "missing";
    }
  }

  async function initialize() {
    const root = document.querySelector(".trip-checklist");
    if (!root || root.dataset.coordinateTravelInitialized === "true") return;
    root.dataset.coordinateTravelInitialized = "true";

    let catalog;
    try {
      const response = await fetch(catalogUrl(), { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      catalog = await response.json();
    } catch (error) {
      console.warn("Trip entity catalog unavailable:", error);
      root.dataset.coordinateTravelStatus = "unavailable";
      return;
    }

    const entities = catalog.entities || {};
    const items = [...root.querySelectorAll(".trip-item")];
    let previousItem = null;
    let previousLocation = null;

    for (const item of items) {
      const entity = resolveEntity(item, entities);
      addCatalogStatus(item, entity);

      const location = locationOf(entity);
      if (location) {
        updateLinks(item, location);
        updateTravel(item, previousItem, previousLocation, location);
      }

      previousItem = item;
      previousLocation = location;
    }

    root.dataset.coordinateTravelStatus = "ready";
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(initialize);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
