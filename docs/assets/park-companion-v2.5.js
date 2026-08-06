(function () {
  const SCRIPT_MARKER = "park-companion-v2.5.js";
  const LOCATION_STORAGE_KEY = "vaca-park-companion-location-enabled";
  const MAX_NEARBY = 4;

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

  function locationOf(entity) {
    const location = entity?.location;
    if (
      !location ||
      location.status !== "VERIFIED" ||
      typeof location.latitude !== "number" ||
      typeof location.longitude !== "number"
    ) return null;
    return {
      latitude: location.latitude,
      longitude: location.longitude
    };
  }

  function itemEntity(item, entities) {
    const id = item?.dataset.itemId;
    const park = item?.dataset.parkName || "";
    if (!id) return null;
    const direct = entities[id];
    if (direct && (!park || direct.parkName === park)) return direct;
    return Object.values(entities).find(entity =>
      entity.itineraryId === id && (!park || entity.parkName === park)
    ) || direct || null;
  }

  function nextPendingItem(root) {
    return [...root.querySelectorAll(".trip-item")]
      .find(item => (item.dataset.state || "pending") === "pending") || null;
  }

  function getReferenceLocation(root, entities) {
    const next = nextPendingItem(root);
    const nextEntity = itemEntity(next, entities);
    const nextLocation = locationOf(nextEntity);
    return {
      item: next,
      entity: nextEntity,
      location: nextLocation
    };
  }

  function nearbyEntities(reference, entities, parkName, excludeCatalogId) {
    return Object.values(entities)
      .filter(entity =>
        entity.catalogId !== excludeCatalogId &&
        entity.parkName === parkName &&
        locationOf(entity) &&
        entity.matchStatus !== "NOT_APPLICABLE"
      )
      .map(entity => ({
        entity,
        distance: haversineMeters(reference, locationOf(entity))
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_NEARBY);
  }

  function kindIcon(entity) {
    if (entity.kind === "meal") return "🍴";
    if (entity.kind === "show") return "🎭";
    if (entity.kind === "extra") return "🛍️";
    if (entity.kind === "hotel") return "🏨";
    return "🎢";
  }

  function ensureCompanionUi(advisor) {
    if (advisor.querySelector("[data-companion-nearby]")) return;

    const title = advisor.querySelector(".park-advisor-title");
    if (title) title.textContent = "🧭 Park Companion";

    const grid = advisor.querySelector(".park-advisor-grid");
    if (!grid) return;

    const nearby = document.createElement("section");
    nearby.className = "park-advisor-section park-companion-nearby";
    nearby.innerHTML = `
      <h3>📍 Nearby</h3>
      <div class="park-companion-location-status" data-companion-location-status>
        Using the next itinerary stop as the reference point.
      </div>
      <div class="park-companion-nearby-list" data-companion-nearby></div>
      <div class="park-companion-actions">
        <button type="button" class="park-companion-location-button" data-companion-location-button>
          📍 Use my location
        </button>
        <a class="park-companion-restroom-link" data-companion-restroom target="_blank" rel="noopener">
          🚻 Restrooms nearby
        </a>
      </div>
    `;
    grid.appendChild(nearby);
  }

  function renderNearby(advisor, root, entities, reference, locationLabel) {
    const list = advisor.querySelector("[data-companion-nearby]");
    const status = advisor.querySelector("[data-companion-location-status]");
    const restroom = advisor.querySelector("[data-companion-restroom]");
    if (!list || !status || !reference.location) return;

    const currentPark = reference.entity?.parkName || reference.item?.dataset.parkName || "";
    const nearby = nearbyEntities(
      reference.location,
      entities,
      currentPark,
      reference.entity?.catalogId
    );

    status.textContent = locationLabel;

    list.innerHTML = nearby.length
      ? nearby.map(({entity, distance}) => `
          <div class="park-companion-nearby-item">
            <span>${kindIcon(entity)}</span>
            <span>
              <strong>${entity.name}</strong>
              ${entity.area ? `<small>${entity.area}</small>` : ""}
            </span>
            <span>${formatDistance(distance)}</span>
          </div>
        `).join("")
      : "<div>No additional catalog stops are nearby.</div>";

    const coordinate = `${reference.location.latitude},${reference.location.longitude}`;
    restroom.href =
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("restrooms near " + coordinate)}`;
  }

  function updateSameArea(root, entities) {
    const items = [...root.querySelectorAll(".trip-item")];
    let previousEntity = null;

    for (const item of items) {
      const entity = itemEntity(item, entities);
      if (!entity) {
        previousEntity = null;
        continue;
      }

      const travel = item.querySelector(".trip-item-travel");
      if (
        travel &&
        previousEntity &&
        entity.parkName === previousEntity.parkName &&
        entity.area &&
        previousEntity.area &&
        entity.area === previousEntity.area
      ) {
        if (!travel.querySelector(".same-area-cue")) {
          const cue = document.createElement("span");
          cue.className = "same-area-cue";
          cue.textContent = `📍 Same area: ${entity.area}`;
          travel.prepend(cue);
        }
      }
      previousEntity = entity;
    }
  }

  function polishCards(root) {
    root.querySelectorAll(".trip-item-travel").forEach(travel => {
      const primary = travel.querySelector(".coordinate-travel-primary");
      const note = travel.querySelector(".coordinate-travel-note");
      if (primary) {
        primary.textContent = primary.textContent
          .replace(/^≈\s*/, "")
          .replace(/\s*·\s*/, " · ");
      }
      if (note) note.textContent = "Walking estimate; actual path may vary";
    });

    root.querySelectorAll(".trip-time-label").forEach(label => {
      if (/Approach\s*\/\s*depart/i.test(label.textContent)) {
        label.textContent = "Start walking";
      }
    });

    root.querySelectorAll(".timing-context").forEach(context => {
      context.remove();
    });

    root.querySelectorAll(".trip-item-actions a").forEach(link => {
      const text = link.textContent.replace(/\s+/g, " ").trim();
      if (/Locate/i.test(text)) {
        link.innerHTML = '<span>📍 Locate</span><small>Show pin</small>';
      } else if (/Navigate/i.test(text)) {
        link.innerHTML = '<span>➡ Walk there</span><small>Walking directions</small>';
      }
    });

    root.querySelectorAll(".trip-item-badges").forEach(container => {
      const badges = [...container.querySelectorAll(".trip-badge")];
      badges.forEach(badge => {
        const text = badge.textContent.replace(/\s+/g, " ").trim();
        const match = text.match(/^(.*?)(?:\s*[·◆]\s*|\s+)Confirmed$/i);
        if (match && !container.querySelector(".trip-badge-confirmed")) {
          badge.textContent = match[1].trim();
          const confirmed = document.createElement("span");
          confirmed.className = "trip-badge trip-badge-confirmed";
          confirmed.textContent = "✔ Confirmed";
          badge.after(confirmed);
        }
      });
    });
  }

  async function initialize() {
    const root = document.querySelector(".trip-checklist");
    const advisor = document.querySelector(".park-advisor");
    if (!root || !advisor || advisor.dataset.companionInitialized === "true") return;
    advisor.dataset.companionInitialized = "true";

    ensureCompanionUi(advisor);

    let catalog;
    try {
      const response = await fetch(catalogUrl(), { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      catalog = await response.json();
    } catch (error) {
      console.warn("Park Companion catalog unavailable:", error);
      return;
    }

    const entities = catalog.entities || {};
    polishCards(root);
    updateSameArea(root, entities);

    let reference = getReferenceLocation(root, entities);
    if (reference.location) {
      const area = reference.entity?.area;
      renderNearby(
        advisor,
        root,
        entities,
        reference,
        area
          ? `Reference: next stop in ${area}`
          : "Reference: next itinerary stop"
      );
    }

    const button = advisor.querySelector("[data-companion-location-button]");
    const locationStatus = advisor.querySelector("[data-companion-location-status]");

    function locationErrorMessage(error) {
      if (!error) return "Location could not be determined.";
      if (error.code === 1) return "Location permission was denied.";
      if (error.code === 2) return "The phone could not determine its location. Check that Android Location is on and try again outdoors.";
      if (error.code === 3) return "The location request timed out. Try again outdoors or near a window.";
      return error.message || "Location could not be determined.";
    }

    function saveSharedLocation(position) {
      const value = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now()
      };
      sessionStorage.setItem("vaca-current-location", JSON.stringify(value));
      return value;
    }

    function requestBrowserLocation(success, failure) {
      const attempt = (options, allowRetry) => {
        navigator.geolocation.getCurrentPosition(
          success,
          error => {
            console.warn("Browser location attempt failed:", error);
            if (allowRetry && error.code !== 1) {
              if (locationStatus) locationStatus.textContent = "High-accuracy location failed; trying standard location…";
              attempt({ enableHighAccuracy: false, timeout: 20000, maximumAge: 0 }, false);
              return;
            }
            failure(error);
          },
          options
        );
      };
      attempt({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }, true);
    }

    button?.addEventListener("click", () => {
      if (!navigator.geolocation) {
        if (locationStatus) locationStatus.textContent = "Location is unavailable in this browser.";
        return;
      }

      button.disabled = true;
      button.textContent = "Locating…";
      if (locationStatus) locationStatus.textContent = "Requesting a fresh phone location…";

      requestBrowserLocation(
        position => {
          const current = saveSharedLocation(position);
          const next = getReferenceLocation(root, entities);
          renderNearby(
            advisor,
            root,
            entities,
            { ...next, location: current },
            `Using current location · accuracy about ${Math.round(position.coords.accuracy)} m`
          );
          localStorage.setItem(LOCATION_STORAGE_KEY, "true");
          if (locationStatus) locationStatus.textContent = `Location updated just now · accuracy about ${Math.round(position.coords.accuracy)} m.`;
          button.textContent = "📍 Refresh my location";
          button.disabled = false;
        },
        error => {
          const message = locationErrorMessage(error);
          console.warn("Browser location unavailable:", error);
          if (locationStatus) locationStatus.textContent = `${message} The itinerary is still using the next mapped stop.`;
          button.textContent = "📍 Try my location again";
          button.disabled = false;
        }
      );
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
