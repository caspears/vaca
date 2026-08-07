(function () {
  const CONFIG_FILE = "priority-waits-config-v2.5.8.json";
  const CATALOG_FILE = "data/trip_entities.json";
  const PATH_MULTIPLIER = 1.35;
  const WALKING_FEET_PER_MINUTE = 250;

  function baseUrl() {
    const script = [...document.scripts].find(node =>
      (node.src || "").includes("priority-context-v2.5.8")
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

  function haversineMeters(a, b) {
    const r = 6371000;
    const rad = value => value * Math.PI / 180;
    const dLat = rad(b.latitude - a.latitude);
    const dLon = rad(b.longitude - a.longitude);
    const lat1 = rad(a.latitude);
    const lat2 = rad(b.latitude);
    const q =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * r * Math.asin(Math.sqrt(q));
  }

  function formatDistance(meters) {
    const feet = meters * 3.28084 * PATH_MULTIPLIER;
    if (feet < 1000) return `${Math.max(25, Math.round(feet / 25) * 25)} ft`;
    return `${(feet / 5280).toFixed(1)} mi`;
  }

  function walkingMinutes(meters) {
    const feet = meters * 3.28084 * PATH_MULTIPLIER;
    const midpoint = feet / WALKING_FEET_PER_MINUTE;
    const low = Math.max(2, Math.floor(midpoint * 0.8));
    const high = Math.max(low + 1, Math.ceil(midpoint * 1.25));
    return `${low}–${high} min`;
  }

  function currentParkName() {
    const title =
      document.querySelector(".md-header__title .md-ellipsis")?.textContent ||
      document.querySelector("h1")?.textContent ||
      "";
    const mappings = [
      ["Epic Universe", "Epic Universe"],
      ["Islands of Adventure", "Islands of Adventure"],
      ["Universal Studios", "Universal Studios Florida"],
      ["Typhoon Lagoon", "Typhoon Lagoon"],
      ["Animal Kingdom", "Animal Kingdom"],
      ["Hollywood Studios", "Hollywood Studios"],
      ["Magic Kingdom", "Magic Kingdom"],
    ];
    return mappings.find(([needle]) => title.includes(needle))?.[1] || "";
  }

  function locationOf(entity) {
    const location = entity?.location;
    if (
      location?.status !== "VERIFIED" ||
      typeof location.latitude !== "number" ||
      typeof location.longitude !== "number"
    ) return null;
    return {
      latitude: location.latitude,
      longitude: location.longitude
    };
  }

  function cardForEntity(entity) {
    if (!entity) return null;
    return [...document.querySelectorAll(".trip-item")].find(card =>
      card.dataset.catalogId === entity.catalogId ||
      card.dataset.itemId === entity.itineraryId
    ) || null;
  }

  function nextReference(catalog) {
    const nextCard = document.querySelector(".trip-item:not([data-status='complete'])");
    if (nextCard) {
      const id = nextCard.dataset.catalogId || nextCard.dataset.itemId;
      const entity = catalog.entities?.[id] ||
        Object.values(catalog.entities || {}).find(item =>
          item.itineraryId === nextCard.dataset.itemId
        );
      const location = locationOf(entity);
      if (location) return { entity, location, label: entity.name };
    }

    const park = currentParkName();
    const first = Object.values(catalog.entities || {}).find(entity =>
      entity.parkName === park && locationOf(entity)
    );
    return first ? { entity: first, location: locationOf(first), label: first.name } : null;
  }

  function waitNumber(text) {
    const match = String(text || "").match(/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  function recommendation(waitText, distanceMinutes, entity) {
    const wait = waitNumber(waitText);
    const hasReserved = !!cardForEntity(entity)?.querySelector(
      ".trip-badge, .trip-pill, .trip-item-badge"
    )?.textContent?.match(/confirmed|reserved|single pass|multi pass|express/i);

    if (/closed/i.test(waitText)) {
      return "Currently closed; keep the planned alternative.";
    }
    if (hasReserved) {
      return "Reserved access is planned; standby is usually unnecessary.";
    }
    if (wait !== null && wait <= 15 && distanceMinutes <= 10) {
      return "Short wait and nearby — a strong opportunity now.";
    }
    if (wait !== null && wait <= 20 && distanceMinutes > 10) {
      return "Short wait, but account for the walk before diverting.";
    }
    if (wait !== null && wait >= 60) {
      return "Long standby wait; keep the existing plan unless this is a top priority.";
    }
    if (distanceMinutes <= 5) {
      return "Nearby; practical to consider if it fits the schedule.";
    }
    return "Use the wait and travel time together before changing the plan.";
  }

  function addContext(row, entity, reference) {
    if (!row || !entity || !reference) return;
    if (row.querySelector(".priority-context")) return;

    const location = locationOf(entity);
    if (!location) return;

    const meters = haversineMeters(reference.location, location);
    const minutesText = walkingMinutes(meters);
    const minutes = Number(minutesText.split("–")[1] || minutesText.split("–")[0] || 99);
    const waitText =
      row.querySelector(".live-wait-value, .wait-value, .wait-time, .card-live-wait, .live-pill")?.textContent ||
      row.textContent;

    const context = document.createElement("div");
    context.className = "priority-context";
    context.innerHTML = `
      <div class="priority-context-distance">
        🚶 ${formatDistance(meters)} · ${minutesText} from ${reference.label}
      </div>
      <div class="priority-context-guidance">
        ${recommendation(waitText, minutes, entity)}
      </div>
    `;
    row.appendChild(context);
  }

  function findEntityByName(catalog, name, park) {
    const target = normalize(name);
    const candidates = Object.values(catalog.entities || {}).filter(entity =>
      entity.parkName === park
    );

    return candidates.find(entity =>
      normalize(entity.queueTimes?.name) === target ||
      normalize(entity.themeParksWiki?.name) === target ||
      normalize(entity.name) === target
    ) || candidates.find(entity => {
      const names = [
        entity.queueTimes?.name,
        entity.themeParksWiki?.name,
        entity.name
      ].filter(Boolean).map(normalize);
      return names.some(candidate =>
        candidate.includes(target) || target.includes(candidate)
      );
    });
  }

  function priorityContainer() {
    const heading = [...document.querySelectorAll("h2,h3,h4")]
      .find(node => /priority attraction waits/i.test(node.textContent || ""));
    return heading?.closest(".live-card, section, article, div") || null;
  }

  function ensureRows(container, names) {
    let list = container.querySelector(".live-rides, .priority-waits-list, ul");
    if (!list) {
      list = document.createElement("div");
      list.className = "live-rides";
      container.appendChild(list);
    }

    const existingNames = [...list.querySelectorAll(".live-ride")]
      .map(row => normalize(row.querySelector(".live-ride-name")?.textContent || row.textContent));

    names.forEach(name => {
      if (existingNames.includes(normalize(name))) return;
      const row = document.createElement("div");
      row.className = "live-ride priority-configured";
      row.dataset.configuredRide = name;
      row.innerHTML = `
        <span class="live-ride-name">${name}</span>
        <span class="live-wait-value">Loading…</span>
      `;
      list.appendChild(row);
    });
  }

  async function initialize() {
    const park = currentParkName();
    if (!park) return;

    let catalog, config;
    try {
      [catalog, config] = await Promise.all([
        fetch(new URL(CATALOG_FILE, baseUrl()), { cache: "no-cache" }).then(r => r.json()),
        fetch(new URL(CONFIG_FILE, baseUrl()), { cache: "no-cache" }).then(r => r.json())
      ]);
    } catch (error) {
      console.warn("Priority context data unavailable:", error);
      return;
    }

    const configured = config[park] || [];
    let container = priorityContainer();

    if (!container && configured.length) {
      const livePanel = document.querySelector(".live-park-grid, .live-park-panel");
      if (livePanel) {
        container = document.createElement("section");
        container.className = "live-card priority-context-card";
        container.innerHTML = "<h3>Priority attraction waits</h3>";
        livePanel.appendChild(container);
      }
    }

    if (!container) return;
    if (configured.length) ensureRows(container, configured);

    const reference = nextReference(catalog);
    if (!reference) return;

    [...container.querySelectorAll(".live-ride")].forEach(row => {
      const name =
        row.querySelector(".live-ride-name, .priority-wait-jump-label")?.textContent ||
        row.dataset.configuredRide ||
        row.textContent;
      const entity = findEntityByName(catalog, name, park);
      if (entity) addContext(row, entity, reference);
    });
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(() => {
      setTimeout(initialize, 700);
      setTimeout(initialize, 2200);
    });
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(initialize, 700);
      setTimeout(initialize, 2200);
    });
  } else {
    setTimeout(initialize, 700);
    setTimeout(initialize, 2200);
  }
})();
