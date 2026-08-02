(function () {
  const ORLANDO = { latitude: 28.5383, longitude: -81.3792 };
  const WEATHER_REFRESH_MS = 15 * 60 * 1000;
  const WAIT_REFRESH_MS = 5 * 60 * 1000;

  const weatherCodes = {
    0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Cloudy",
    45:"Fog",48:"Fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",
    61:"Light rain",63:"Rain",65:"Heavy rain",80:"Rain showers",
    81:"Rain showers",82:"Heavy showers",95:"Thunderstorms",
    96:"Thunderstorms",99:"Severe thunderstorms"
  };

  const parkNameToId = {
    "Animal Kingdom": 8,
    "Hollywood Studios": 7,
    "Magic Kingdom": 6,
    "Epic Universe": 334,
    "Islands of Adventure": 64,
    "Universal Studios Florida": 65
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    })[c]);
  }

  function normalize(value) {
    return String(value || "").toLowerCase()
      .replace(/[’'™®:–—-]/g, "")
      .replace(/\bthe\b/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function formatHour(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], {
      hour:"numeric", minute:"2-digit", timeZone:"America/New_York"
    });
  }

  function formatRange(startIso, endIso) {
    return `${formatHour(startIso)}–${formatHour(endIso)}`;
  }

  function dateIndex(times, tripDate) {
    return times.findIndex(time => String(time).slice(0,10) === tripDate);
  }

  function buildWeatherWindows(hourly, tripDate) {
    const rows = [];
    const times = hourly?.time || [];
    for (let i=0; i<times.length; i++) {
      if (!String(times[i]).startsWith(tripDate)) continue;
      const code = Number(hourly.weather_code?.[i] || 0);
      const probability = Number(hourly.precipitation_probability?.[i] || 0);
      const amount = Number(hourly.precipitation?.[i] || 0);
      const thunder = code >= 95;
      const rain = thunder || code >= 51 || probability >= 40 || amount > 0;
      rows.push({index:i,time:times[i],code,probability,amount,thunder,rain});
    }

    function ranges(predicate) {
      const output = [];
      let current = null;
      rows.forEach((row, idx) => {
        if (predicate(row)) {
          if (!current) current = {start:row.time,end:row.time,maxProbability:row.probability};
          current.end = row.time;
          current.maxProbability = Math.max(current.maxProbability,row.probability);
        } else if (current) {
          const endIndex = rows.findIndex(r => r.time === current.end);
          const next = rows[endIndex + 1];
          output.push({...current,endExclusive:next?.time || current.end});
          current = null;
        }
      });
      if (current) {
        const endIndex = rows.findIndex(r => r.time === current.end);
        const next = rows[endIndex + 1];
        output.push({...current,endExclusive:next?.time || current.end});
      }
      return output;
    }

    return {
      thunder: ranges(row => row.thunder),
      rain: ranges(row => row.rain && !row.thunder)
    };
  }

  function weatherWindowHtml(windows) {
    const lines = [];
    windows.thunder.forEach(range => {
      lines.push(`<div><strong>⛈️ Thunderstorms:</strong> ${formatRange(range.start,range.endExclusive)} <span class="live-muted">(up to ${Math.round(range.maxProbability)}% precipitation)</span></div>`);
    });
    windows.rain.forEach(range => {
      lines.push(`<div><strong>🌧️ Rain/showers:</strong> ${formatRange(range.start,range.endExclusive)} <span class="live-muted">(up to ${Math.round(range.maxProbability)}%)</span></div>`);
    });
    if (!lines.length) lines.push('<div><strong>☀️ No defined rain window</strong> in the current hourly forecast.</div>');
    return `<div class="live-weather-windows">${lines.join("")}</div>`;
  }

  async function fetchWeather(panel) {
    const tripDate = panel.dataset.tripDate;
    const weather = panel.querySelector("[data-live-weather]");
    weather.innerHTML = '<div class="live-muted">Loading forecast…</div>';

    const params = new URLSearchParams({
      latitude:ORLANDO.latitude,
      longitude:ORLANDO.longitude,
      timezone:"America/New_York",
      forecast_days:"16",
      temperature_unit:"fahrenheit",
      precipitation_unit:"inch",
      daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      hourly:"weather_code,precipitation_probability,precipitation",
      current:"temperature_2m,apparent_temperature,weather_code,precipitation"
    });

    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error(`weather HTTP ${response.status}`);
      const data = await response.json();
      const idx = dateIndex(data.daily?.time || [], tripDate);

      if (idx >= 0) {
        const windows = buildWeatherWindows(data.hourly,tripDate);
        weather.innerHTML = `
          <div class="live-weather-main">${escapeHtml(weatherCodes[data.daily.weather_code[idx]] || "Forecast")}</div>
          <div><strong>${Math.round(data.daily.temperature_2m_max[idx])}°</strong> / ${Math.round(data.daily.temperature_2m_min[idx])}°F</div>
          <div>Daily rain chance: <strong>${Math.round(data.daily.precipitation_probability_max[idx] || 0)}%</strong></div>
          ${weatherWindowHtml(windows)}
          <div class="live-muted">Start/end times are approximate hourly forecast boundaries and may shift.</div>
        `;
      } else if (data.current) {
        weather.innerHTML = `
          <div class="live-weather-main">${escapeHtml(weatherCodes[data.current.weather_code] || "Current conditions")}</div>
          <div><strong>${Math.round(data.current.temperature_2m)}°F</strong> · feels ${Math.round(data.current.apparent_temperature)}°F</div>
          <div class="live-muted">Trip-day hourly forecast is not yet in the API horizon.</div>
        `;
      } else throw new Error("forecast unavailable");
    } catch {
      weather.innerHTML = `<div class="live-error"><strong>Weather unavailable.</strong><br><span class="live-muted">Use the phone weather app or refresh later.</span></div>`;
    }
  }

  function flattenRides(payload) {
    const rides = [];
    (payload.lands || []).forEach(land => (land.rides || []).forEach(ride => rides.push({...ride,land:land.name})));
    (payload.rides || []).forEach(ride => rides.push({...ride,land:""}));
    return rides;
  }

  function findRide(rides, requested) {
    const target = normalize(requested);
    let match = rides.find(ride => normalize(ride.name) === target);
    if (match) return match;
    match = rides.find(ride => normalize(ride.name).includes(target) || target.includes(normalize(ride.name)));
    if (match) return match;

    const aliases = [
      ["avatar flight of passage","flight of passage"],
      ["star wars rise of resistance","rise of resistance"],
      ["harry potter escape from gringotts","escape from gringotts"],
      ["harry potter forbidden journey","forbidden journey"],
      ["mickey minnies runaway railway","runaway railway"],
      ["despicable me minion mayhem","minion mayhem"]
    ];
    for (const [a,b] of aliases) {
      if (target.includes(a) || target.includes(b)) {
        match = rides.find(ride => {
          const n = normalize(ride.name);
          return n.includes(a) || n.includes(b);
        });
        if (match) return match;
      }
    }
    return null;
  }

  function waitClass(ride) {
    if (!ride?.is_open) return "closed";
    const wait = Number(ride.wait_time || 0);
    if (wait <= 25) return "open-short";
    if (wait <= 55) return "open-medium";
    return "open-long";
  }

  function rideUrl(parkId, rideId) {
    return `https://queue-times.com/en-US/parks/${parkId}/rides/${rideId}`;
  }

  function insertCardWait(item, ride, parkId) {
    const grid = item.querySelector(".trip-detail-grid");
    if (!grid || !ride?.id) return;

    let label = grid.querySelector("[data-card-wait-label]");
    let value = grid.querySelector("[data-card-wait-value]");

    if (!label) {
      label = document.createElement("div");
      label.className = "trip-detail-label";
      label.dataset.cardWaitLabel = "true";
      label.textContent = "Current wait";

      value = document.createElement("div");
      value.dataset.cardWaitValue = "true";

      const nextLabel = [...grid.children].find(child =>
        child.classList.contains("trip-detail-label") &&
        child.textContent.trim().toLowerCase() === "next"
      );

      if (nextLabel) {
        grid.insertBefore(label,nextLabel);
        grid.insertBefore(value,nextLabel);
      } else {
        grid.append(label,value);
      }
    }

    const status = ride.is_open ? `${Number(ride.wait_time || 0)} min` : "Closed";
    value.innerHTML = `<a class="card-live-wait ${waitClass(ride)}" href="${rideUrl(parkId,ride.id)}" target="_blank" rel="noopener">${escapeHtml(status)} · Queue-Times details</a>`;
  }

  function annotateCards(allParkRides) {
    document.querySelectorAll(".trip-item").forEach(item => {
      if (!["lightning","planned"].includes(item.dataset.kind)) return;
      const parkId = parkNameToId[item.dataset.parkName];
      if (!parkId || !allParkRides.has(parkId)) return;

      const title = item.querySelector(".trip-item-title")?.textContent?.replace(/^[^\w]+/,"").trim();
      const ride = findRide(allParkRides.get(parkId),title);
      if (ride) insertCardWait(item,ride,parkId);
    });
  }

  async function fetchWaits(panel) {
    const container = panel.querySelector("[data-live-waits]");
    const parks = JSON.parse(panel.dataset.queueParks || "[]");
    const priorityNames = JSON.parse(panel.dataset.priorityRides || "[]");

    if (!parks.length) {
      container.innerHTML = '<div class="live-muted">Live waits are not configured for this day.</div>';
      return;
    }

    container.innerHTML = '<div class="live-muted">Loading current waits…</div>';

    try {
      const results = await Promise.all(parks.map(async park => {
        const response = await fetch(`https://queue-times.com/parks/${park.id}/queue_times.json`);
        if (!response.ok) throw new Error(`${park.name}: HTTP ${response.status}`);
        return {park,payload:await response.json()};
      }));

      const allParkRides = new Map();
      results.forEach(({park,payload}) => allParkRides.set(park.id,flattenRides(payload)));

      const rows = [];
      priorityNames.forEach(item => {
        const rides = allParkRides.get(item.parkId) || [];
        rows.push({
          requested:item.name,
          park:parks.find(p => p.id === item.parkId)?.name || "",
          parkId:item.parkId,
          ride:findRide(rides,item.name)
        });
      });

      container.innerHTML = `<div class="live-rides">${rows.map(row => {
        const ride = row.ride;
        const status = !ride ? "Unavailable" : ride.is_open ? `${Number(ride.wait_time || 0)} min` : "Closed";
        const content = ride?.id
          ? `<a class="live-wait-link" href="${rideUrl(row.parkId,ride.id)}" target="_blank" rel="noopener"><span class="live-wait ${waitClass(ride)}">${escapeHtml(status)}</span></a>`
          : `<span class="live-wait closed">${escapeHtml(status)}</span>`;
        return `<div class="live-ride"><div><strong>${escapeHtml(row.requested)}</strong><div class="live-muted">${escapeHtml(row.park)}${ride?.land?` · ${escapeHtml(ride.land)}`:""}</div></div>${content}</div>`;
      }).join("")}</div>`;

      annotateCards(allParkRides);
    } catch {
      container.innerHTML = `<div class="live-error"><strong>Live waits unavailable.</strong><br><span class="live-muted">Open the official Disney or Universal app for authoritative current waits.</span></div>`;
    }
  }

  async function refreshPanel(panel) {
    const button = panel.querySelector(".live-refresh");
    if (button) {button.disabled=true;button.textContent="Refreshing…";}
    await Promise.all([fetchWeather(panel),fetchWaits(panel)]);
    const updated = panel.querySelector("[data-live-updated]");
    if (updated) updated.textContent = new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
    if (button) {button.disabled=false;button.textContent="↻ Refresh";}
  }

  function initialize() {
    document.querySelectorAll(".live-park-panel").forEach(panel => {
      if (panel.dataset.initialized === "true") return;
      panel.dataset.initialized = "true";
      panel.querySelector(".live-refresh")?.addEventListener("click",()=>refreshPanel(panel));
      refreshPanel(panel);
      setInterval(()=>fetchWaits(panel),WAIT_REFRESH_MS);
      setInterval(()=>fetchWeather(panel),WEATHER_REFRESH_MS);
    });
  }

  if (typeof document$ !== "undefined") document$.subscribe(initialize);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",initialize);
  else initialize();
})();