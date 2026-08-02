(function () {
  const ORLANDO = { latitude: 28.5383, longitude: -81.3792 };
  const WEATHER_REFRESH_MS = 15 * 60 * 1000;
  const WAIT_REFRESH_MS = 5 * 60 * 1000;

  const weatherCodes = {
    0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy",
    45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle",
    55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
    80: "Rain showers", 81: "Rain showers", 82: "Heavy showers",
    95: "Thunderstorms", 96: "Thunderstorms", 99: "Severe thunderstorms"
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    })[char]);
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function dateIndex(times, tripDate) {
    return times.findIndex(time => String(time).slice(0, 10) === tripDate);
  }

  async function fetchWeather(panel) {
    const tripDate = panel.dataset.tripDate;
    const weather = panel.querySelector("[data-live-weather]");
    weather.innerHTML = '<div class="live-muted">Loading forecast…</div>';

    const params = new URLSearchParams({
      latitude: ORLANDO.latitude,
      longitude: ORLANDO.longitude,
      timezone: "America/New_York",
      forecast_days: "16",
      temperature_unit: "fahrenheit",
      precipitation_unit: "inch",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      current: "temperature_2m,apparent_temperature,weather_code,precipitation"
    });

    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error(`weather HTTP ${response.status}`);
      const data = await response.json();
      const idx = dateIndex(data.daily?.time || [], tripDate);
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York", year:"numeric", month:"2-digit", day:"2-digit"
      }).format(new Date());

      if (idx >= 0) {
        weather.innerHTML = `
          <div class="live-weather-main">${escapeHtml(weatherCodes[data.daily.weather_code[idx]] || "Forecast")}</div>
          <div><strong>${Math.round(data.daily.temperature_2m_max[idx])}°</strong> / ${Math.round(data.daily.temperature_2m_min[idx])}°F</div>
          <div>Rain chance: <strong>${Math.round(data.daily.precipitation_probability_max[idx] || 0)}%</strong></div>
          <div class="live-muted">${tripDate === today ? "Today’s Orlando forecast" : `Forecast for ${tripDate}`}</div>
        `;
      } else if (data.current) {
        weather.innerHTML = `
          <div class="live-weather-main">${escapeHtml(weatherCodes[data.current.weather_code] || "Current conditions")}</div>
          <div><strong>${Math.round(data.current.temperature_2m)}°F</strong> · feels ${Math.round(data.current.apparent_temperature)}°F</div>
          <div class="live-muted">Trip-day forecast is not yet in the API horizon.</div>
        `;
      } else {
        throw new Error("forecast unavailable");
      }
    } catch (error) {
      weather.innerHTML = `
        <div class="live-error"><strong>Weather unavailable.</strong><br>
        <span class="live-muted">Use the phone weather app or refresh later.</span></div>
      `;
    }
  }

  function flattenRides(payload) {
    const rides = [];
    (payload.lands || []).forEach(land => {
      (land.rides || []).forEach(ride => rides.push({...ride, land: land.name}));
    });
    (payload.rides || []).forEach(ride => rides.push({...ride, land: ""}));
    return rides;
  }

  function findRide(rides, requested) {
    const target = normalize(requested);
    return rides.find(ride => normalize(ride.name) === target)
      || rides.find(ride => normalize(ride.name).includes(target))
      || rides.find(ride => target.includes(normalize(ride.name)));
  }

  function waitClass(ride) {
    if (!ride?.is_open) return "closed";
    const wait = Number(ride.wait_time || 0);
    if (wait <= 25) return "open-short";
    if (wait <= 55) return "open-medium";
    return "open-long";
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
        return { park, payload: await response.json() };
      }));

      const rideRows = [];
      results.forEach(({park, payload}) => {
        const rides = flattenRides(payload);
        const requested = priorityNames.filter(item => item.parkId === park.id);
        requested.forEach(item => {
          const ride = findRide(rides, item.name);
          rideRows.push({
            requested: item.name,
            park: park.name,
            ride
          });
        });
      });

      if (!rideRows.length) throw new Error("No configured priority rides");

      container.innerHTML = `<div class="live-rides">${rideRows.map(row => {
        const ride = row.ride;
        const status = !ride ? "Unavailable"
          : ride.is_open ? `${Number(ride.wait_time || 0)} min`
          : "Closed";
        return `
          <div class="live-ride">
            <div>
              <strong>${escapeHtml(row.requested)}</strong>
              <div class="live-muted">${escapeHtml(row.park)}${ride?.land ? ` · ${escapeHtml(ride.land)}` : ""}</div>
            </div>
            <span class="live-wait ${waitClass(ride)}">${escapeHtml(status)}</span>
          </div>`;
      }).join("")}</div>`;
    } catch (error) {
      container.innerHTML = `
        <div class="live-error"><strong>Live waits unavailable.</strong><br>
        <span class="live-muted">Open the official Disney or Universal app for authoritative current waits.</span></div>
      `;
    }
  }

  async function refreshPanel(panel) {
    const button = panel.querySelector(".live-refresh");
    if (button) {
      button.disabled = true;
      button.textContent = "Refreshing…";
    }
    await Promise.all([fetchWeather(panel), fetchWaits(panel)]);
    const updated = panel.querySelector("[data-live-updated]");
    if (updated) updated.textContent = new Date().toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
    if (button) {
      button.disabled = false;
      button.textContent = "↻ Refresh";
    }
  }

  function initialize() {
    document.querySelectorAll(".live-park-panel").forEach(panel => {
      if (panel.dataset.initialized === "true") return;
      panel.dataset.initialized = "true";
      panel.querySelector(".live-refresh")?.addEventListener("click", () => refreshPanel(panel));
      refreshPanel(panel);
      setInterval(() => fetchWaits(panel), WAIT_REFRESH_MS);
      setInterval(() => fetchWeather(panel), WEATHER_REFRESH_MS);
    });
  }

  if (typeof document$ !== "undefined") document$.subscribe(initialize);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();