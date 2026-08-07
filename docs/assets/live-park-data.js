(function(){
const R=300000,C={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Cloudy",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorms",96:"Thunderstorms",99:"Severe thunderstorms"};
function n(v){return String(v||"").toLowerCase().replace(/[’'™®:–—-]/g,"").replace(/\bthe\b/g,"").replace(/[^a-z0-9]+/g," ").trim()}
function e(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c])}
function ride(rs,name){const t=n(name);return rs.find(r=>n(r.name)===t)||rs.find(r=>n(r.name).includes(t)||t.includes(n(r.name)))||null}
function timeVal(s,mer){const m=String(s||"").match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);if(!m)return null;let h=+m[1],mi=+(m[2]||0),x=(m[3]||mer||"").toLowerCase();if(x.startsWith("p")&&h<12)h+=12;if(x.startsWith("a")&&h===12)h=0;return h+mi/60}
function windowOf(label){const s=String(label||"").replace(/≈|target|opening|early entry/gi,"");const am=[...s.matchAll(/(a\.?m\.?|p\.?m\.?)/gi)],mer=am.length?am.at(-1)[1]:null,p=s.split(/[–—-]/),a=timeVal(p[0],mer),b=timeVal(p[1],mer);return a==null?null:{start:a,end:b??a}}
function hv(iso){const m=String(iso).match(/T(\d{2}):(\d{2})/);return m?+m[1]+(+m[2]/60):null}
function weather(rows,w){if(!w)return null;const x=rows.filter(r=>{const h=hv(r.time);return h>=Math.floor(w.start)&&h<=Math.ceil(w.end)});if(!x.length)return null;const rain=Math.max(...x.map(r=>+(r.precipitationProbability||0))),code=Math.max(...x.map(r=>+(r.weatherCode||0)));return{condition:C[code]||"Forecast",temp:Math.round(x.reduce((a,r)=>a+(+r.temperatureF||0),0)/x.length),feels:Math.round(x.reduce((a,r)=>a+(+r.apparentTemperatureF||+r.temperatureF||0),0)/x.length),rain,thunder:code>=95}}
function cls(r){return!r?.isOpen?"closed":r.waitMinutes<=25?"open-short":r.waitMinutes<=55?"open-medium":"open-long"}
function detail(item,label,html,key){const g=item.querySelector(".trip-detail-grid");if(!g)return;let l=g.querySelector(`[data-live-detail-label="${key}"]`),v=g.querySelector(`[data-live-detail-value="${key}"]`);if(!l){l=document.createElement("div");l.className="trip-detail-label";l.dataset.liveDetailLabel=key;l.textContent=label;v=document.createElement("div");v.dataset.liveDetailValue=key;const next=[...g.children].find(c=>c.classList.contains("trip-detail-label")&&c.textContent.trim().toLowerCase()==="next");next?(g.insertBefore(l,next),g.insertBefore(v,next)):g.append(l,v)}v.innerHTML=html}
function guide(item,r,w){const txt=item.textContent.toLowerCase(),reserved=item.dataset.kind==="lightning"||txt.includes("express")||txt.includes("single pass")||txt.includes("multi pass");if(w?.thunder&&!['meal','show','hotel','transfer'].includes(item.dataset.kind))return["Weather caution","Thunderstorms are forecast near this time; outdoor operations may pause."];if(reserved)return["Use reserved access","Keep the scheduled Lightning Lane or Express plan rather than standby."];if(!r)return["Follow the plan","No matched live wait is available; use the official app."];if(!r.isOpen)return["Wait for later","Currently reported closed; continue to the next planned experience."];if(r.waitMinutes<=20)return["Good standby opportunity","Short current wait, provided it does not threaten the next timed commitment."];if(r.waitMinutes>=55)return["Protect the schedule","Long current wait; continue with the plan or use reserved access."];return["Follow the plan","Moderate current wait; keep the planned sequence."]}
function clock(s){return new Date(s).toLocaleTimeString([],{hour:"numeric",minute:"2-digit",timeZone:"America/New_York"})}
function rainRanges(rows,date){const a=rows.filter(r=>String(r.time).startsWith(date)),out=[];let cur=null;for(const r of a){const code=+r.weatherCode||0,p=+r.precipitationProbability||0,t=code>=95?"thunder":(code>=51||p>=40||(+r.precipitationInches||0)>0)?"rain":null;if(t){if(!cur||cur.type!==t){if(cur)out.push(cur);cur={type:t,start:r.time,end:r.time,p}}else{cur.end=r.time;cur.p=Math.max(cur.p,p)}}else if(cur){out.push(cur);cur=null}}if(cur)out.push(cur);return out.map(g=>{const i=a.findIndex(r=>r.time===g.end);return{...g,end:a[i+1]?.time||g.end}})}
function renderWeather(panel,w){const t=panel.querySelector("[data-live-weather]");if(!w?.daily){t.innerHTML='<div class="live-muted">Trip-day forecast is not yet available.</div>';return}const ranges=rainRanges(w.hourly||[],w.date),rh=ranges.length?ranges.map(g=>`<div><strong>${g.type==="thunder"?"⛈️ Thunderstorms":"🌧️ Rain/showers"}:</strong> ${clock(g.start)}–${clock(g.end)} <span class="live-muted">(up to ${Math.round(g.p)}%)</span></div>`).join(""):'<div><strong>☀️ No defined rain window</strong></div>';t.innerHTML=`<div class="live-weather-main">${e(C[w.daily.weatherCode]||"Forecast")}</div><div><strong>${Math.round(w.daily.highF)}°</strong> / ${Math.round(w.daily.lowF)}°F</div><div>Daily rain chance: <strong>${Math.round(w.daily.precipitationProbability||0)}%</strong></div><div class="live-weather-windows">${rh}</div><div class="live-muted">Hourly boundaries are approximate.</div>`}
const WAIT_AUX={promise:null};
function assetBase(){const s=[...document.scripts].find(x=>(x.src||"").includes("live-park-data.js"));return s?.src?new URL(".",s.src):new URL("assets/",document.baseURI)}
function loadWaitAux(){if(!WAIT_AUX.promise)WAIT_AUX.promise=Promise.all([fetch(new URL("family-ride-ratings-v2.6.0.json",assetBase()),{cache:"no-cache"}).then(r=>r.json()),fetch(new URL("data/trip_entities.json",assetBase()),{cache:"no-cache"}).then(r=>r.json())]).then(([ratings,catalog])=>({ratings,catalog})).catch(err=>(console.warn("Wait metadata unavailable",err),{ratings:{},catalog:{entities:{}}}));return WAIT_AUX.promise}
function pagePark(panel){const pc=JSON.parse(panel.dataset.queueParks||"[]");if(pc.length===1)return pc[0].name;const title=document.querySelector(".md-header__title .md-ellipsis")?.textContent||document.querySelector("h1")?.textContent||"";if(title.includes("Epic Universe"))return"Epic Universe";if(title.includes("Islands of Adventure"))return"Islands of Adventure";if(title.includes("Universal Studios"))return"Universal Studios Florida";if(title.includes("Animal Kingdom"))return"Animal Kingdom";if(title.includes("Hollywood Studios"))return"Hollywood Studios";if(title.includes("Magic Kingdom"))return"Magic Kingdom";if(title.includes("Typhoon Lagoon"))return"Typhoon Lagoon";return pc[0]?.name||""}
function ratingMeta(all,park,name){const map=all?.[park]||{},target=n(name);for(const[k,v]of Object.entries(map)){const key=n(k);if(key===target||key.includes(target)||target.includes(key))return{...v,rating:Math.min(5,Number(v.rating)||0)}}return null}
function entityFor(cat,park,name,parkId){const target=n(name),aliasGroups=[["harry potter and battle at ministry","ministry of magic","ministry","battle at ministry"],["star tours adventures continue","star tours"],["mickey minnies runaway railway","runaway railway"],["star wars rise of resistance","rise of resistance"]],targets=new Set([target]);for(const group of aliasGroups){const normalized=group.map(n);if(normalized.some(v=>v===target||v.includes(target)||target.includes(v)))normalized.forEach(v=>targets.add(v))}const es=Object.values(cat?.entities||{}).filter(x=>(!park||x.parkName===park)&&(!parkId||!x.queueTimes?.parkId||Number(x.queueTimes.parkId)===Number(parkId))),names=x=>[x.queueTimes?.name,x.themeParksWiki?.name,x.name].filter(Boolean).map(n);return es.find(x=>names(x).some(v=>targets.has(v)))||es.find(x=>names(x).some(v=>[...targets].some(t=>v.includes(t)||t.includes(v))))||null}
function validLoc(entity){const l=entity?.location;return l?.status==="VERIFIED"&&typeof l.latitude==="number"&&typeof l.longitude==="number"?{latitude:l.latitude,longitude:l.longitude}:null}
function haversine(a,b){const R=6371000,rad=x=>x*Math.PI/180,dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude),la=rad(a.latitude),lb=rad(b.latitude),q=Math.sin(dlat/2)**2+Math.cos(la)*Math.cos(lb)*Math.sin(dlon/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
function distanceText(m){const feet=m*3.28084*1.35;if(feet<1000)return`${Math.max(25,Math.round(feet/25)*25)} ft`;return`${(feet/5280).toFixed(1)} mi`}
function walkText(m){const mid=m*3.28084*1.35/250,lo=Math.max(2,Math.floor(mid*.8)),hi=Math.max(lo+1,Math.ceil(mid*1.25));return`${lo}–${hi} min`}
function nextReference(cat,park){const entities=Object.values(cat?.entities||{}),cards=[...document.querySelectorAll(".trip-item")].filter(c=>!["complete","skip"].includes(c.dataset.status));for(const card of cards){const id=card.dataset.catalogId||card.dataset.itemId;let entity=cat.entities?.[id];if(entity&&park&&entity.parkName!==park)entity=null;if(!entity)entity=entities.find(x=>x.itineraryId===card.dataset.itemId&&(!park||x.parkName===park));const location=validLoc(entity);if(location)return{location,label:referenceLabel(entity),source:"next-stop",park}}const fallback=entities.find(x=>(!park||x.parkName===park)&&validLoc(x));return fallback?{location:validLoc(fallback),label:referenceLabel(fallback),source:"park-fallback",park}:null}function referenceLabel(entity){return entity?.name?.replace(/ priorities$/i,"")||"mapped park location"}
function currentReference(){try{const x=JSON.parse(sessionStorage.getItem("vaca-current-location")||"null");if(x&&Date.now()-x.timestamp<30*60*1000)return{location:{latitude:x.latitude,longitude:x.longitude},label:"current location"}}catch{}return null}
function waitValue(r){return!r||!r.isOpen?999:Number(r.waitMinutes)||999}
function waitToolbar(panel,park,onChange){let bar=panel.querySelector(".wait-tools");if(bar)return bar;bar=document.createElement("div");bar.className="wait-tools";bar.innerHTML=`<div class="wait-tool-row"><span>Sort</span><button data-sort="rating">⭐ Rating</button><button data-sort="distance">🚶 Distance</button><button data-sort="wait">⏱ Wait</button></div><div class="wait-tool-row"><span>From</span><button data-ref="next">Next stop</button><button data-ref="current">Current location</button></div><div class="wait-tool-status" aria-live="polite"></div>`;panel.querySelector("[data-live-waits]").before(bar);const sort=localStorage.getItem(`vaca-wait-sort:${park}`)||"rating",ref=localStorage.getItem(`vaca-distance-mode:${park}`)||"next";bar.dataset.sort=sort;bar.dataset.ref=ref;const paint=()=>{bar.querySelectorAll("[data-sort]").forEach(b=>b.classList.toggle("is-active",b.dataset.sort===bar.dataset.sort));bar.querySelectorAll("[data-ref]").forEach(b=>b.classList.toggle("is-active",b.dataset.ref===bar.dataset.ref))};bar.querySelectorAll("[data-sort]").forEach(b=>b.onclick=()=>{bar.dataset.sort=b.dataset.sort;localStorage.setItem(`vaca-wait-sort:${park}`,b.dataset.sort);paint();onChange()});bar.querySelectorAll("[data-ref]").forEach(b=>b.onclick=()=>{bar.dataset.ref=b.dataset.ref;localStorage.setItem(`vaca-distance-mode:${park}`,b.dataset.ref);paint();onChange(true)});paint();return bar}
function parkNameForId(panel,parkId){const pc=JSON.parse(panel.dataset.queueParks||"[]"),match=pc.find(p=>Number(p.id)===Number(parkId));if(match?.name)return match.name;const known={"8":"Animal Kingdom","7":"Hollywood Studios","6":"Magic Kingdom","334":"Epic Universe","64":"Islands of Adventure","65":"Universal Studios Florida"};return known[String(parkId)]||pagePark(panel)}
function gpsErrorText(error){if(!error)return"Location could not be determined.";if(error.code===1)return"Location permission was denied.";if(error.code===2)return"Phone location is unavailable. Check Android Location and try outdoors.";if(error.code===3)return"Location request timed out. Try again outdoors or near a window.";return error.message||"Location could not be determined."}
function requestFreshLocation(status,success,failure){const attempt=(options,retry)=>navigator.geolocation.getCurrentPosition(success,error=>{console.warn("Wait-list location attempt failed",error);if(retry&&error.code!==1){status.textContent="High-accuracy location failed; trying standard location…";attempt({enableHighAccuracy:false,timeout:20000,maximumAge:0},false);return}failure(error)},options);attempt({enableHighAccuracy:true,timeout:20000,maximumAge:0},true)}
function getReferences(bar,cat,panel,priority,request,done){const status=bar.querySelector(".wait-tool-status"),parks=[...new Map(priority.map(c=>[String(c.parkId),parkNameForId(panel,c.parkId)])).values()];const nextMap=(prefix="")=>{const refs=new Map(parks.map(park=>[park,nextReference(cat,park)]));const available=[...refs].filter(([,ref])=>ref),base=parks.length===1&&available.length?`Distances use next mapped stop: ${available[0][1].label}.`:available.length?"Distances use each park's next mapped stop.":"No mapped itinerary reference is available.";status.textContent=prefix?`${prefix} ${base}`:base;done({mode:"next",refs})};if(bar.dataset.ref!=="current"){nextMap();return}if(request){if(!navigator.geolocation){nextMap("GPS is unavailable.");return}status.textContent="Requesting a fresh phone location…";requestFreshLocation(status,pos=>{const v={latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy:pos.coords.accuracy,timestamp:Date.now()};sessionStorage.setItem("vaca-current-location",JSON.stringify(v));status.textContent=`Distances use current phone location · accuracy about ${Math.round(pos.coords.accuracy)} m.`;done({mode:"current",current:{location:v,label:"current location",source:"gps"}})},error=>nextMap(`${gpsErrorText(error)}`));return}const cached=currentReference();if(cached){status.textContent="Distances use recent phone location. Tap Current location to refresh it.";done({mode:"current",current:cached});return}status.textContent="Tap Current location to request GPS; temporarily using next mapped stops.";nextMap()}
async function renderWaits(panel,parks,priority,requestGps=false){
const heading=panel.querySelector("[data-live-waits-heading]");if(heading)heading.textContent=priority.length>6?"Live attraction waits":"Priority attraction waits";
const target=panel.querySelector("[data-live-waits]"),toolbarPark=pagePark(panel),aux=await loadWaitAux();
let toolbar;const draw=(forceGps=false)=>getReferences(toolbar,aux.catalog,panel,priority,forceGps,referenceState=>{const rows=priority.map(c=>{const rowPark=parkNameForId(panel,c.parkId),r=ride(parks[String(c.parkId)]?.rides||[],c.name),meta=ratingMeta(aux.ratings,rowPark,c.name),entity=entityFor(aux.catalog,rowPark,c.name,c.parkId),location=validLoc(entity),reference=referenceState.mode==="current"?referenceState.current:referenceState.refs.get(rowPark);let meters=null;if(reference&&location)meters=haversine(reference.location,location);return{c,r,meta,meters,reference,rowPark,entity}});const sort=toolbar.dataset.sort;rows.sort((a,b)=>{const badA=a.meta?.group==="not-recommended"?1:0,badB=b.meta?.group==="not-recommended"?1:0;if(badA!==badB)return badA-badB;if(sort==="distance")return(a.meters??Infinity)-(b.meters??Infinity)||waitValue(a.r)-waitValue(b.r);if(sort==="wait")return waitValue(a.r)-waitValue(b.r)||(b.meta?.rating||0)-(a.meta?.rating||0);return(b.meta?.rating||-1)-(a.meta?.rating||-1)||(a.meters??Infinity)-(b.meters??Infinity)||waitValue(a.r)-waitValue(b.r)});target.innerHTML=`<div class="live-rides integrated-live-rides">${rows.map(({c,r,meta,meters,reference,rowPark})=>{const status=!r?"Unavailable":r.isOpen?`${r.waitMinutes} min`:"Closed",rating=meta?.rating?`<span class="wait-family-rating ${meta.group==="not-recommended"?"not-recommended":""}">${meta.group==="not-recommended"?"🚫 ":""}${meta.rating}⭐</span>`:"",travel=meters!=null?`<small class="wait-distance">🚶 ${walkText(meters)} · ${distanceText(meters)}${reference?.label?` from ${e(reference.label)}`:""}</small>`:`<small class="wait-distance unavailable">Distance unavailable${rowPark?` · ${e(rowPark)}`:""}</small>`;return`<div class="live-ride" data-family-rating="${meta?.rating||""}" data-distance="${meters??""}" data-park="${e(rowPark)}"><div class="live-ride-copy"><div class="live-ride-name-line">${rating}<strong class="live-ride-name">${e(c.name)}</strong></div>${travel}</div>${r?.queueTimesUrl?`<a href="${r.queueTimesUrl}" target="_blank"><span class="live-wait ${cls(r)}">${e(status)}</span></a>`:`<span class="live-wait closed">${e(status)}</span>`}</div>`}).join("")}</div>`});
toolbar=waitToolbar(panel,toolbarPark,forceGps=>draw(Boolean(forceGps)));draw(Boolean(requestGps))}
function annotate(root,w,parks){root.querySelectorAll(".trip-item").forEach(item=>{const pid=item.dataset.queueParkId,title=item.querySelector(".trip-item-title")?.textContent.replace(/^[^\w]+/,"").trim()||"",r=ride(parks[String(pid)]?.rides||[],title),fw=weather(w?.hourly||[],windowOf(item.dataset.windowLabel));if(r)detail(item,"Current wait",`<a class="card-live-wait ${cls(r)}" href="${r.queueTimesUrl}" target="_blank">${r.isOpen?r.waitMinutes+" min":"Closed"} · Queue-Times details</a>`,"wait");if(fw)detail(item,"Weather near planned time",`<span class="card-weather">${fw.thunder?"⛈️":fw.rain>=40?"🌧️":"🌤️"} ${e(fw.condition)} · ${fw.temp}°F · feels ${fw.feels}°F · rain ${Math.round(fw.rain)}%</span>`,"weather");const g=guide(item,r,fw);detail(item,"Day-of guidance",`<span class="card-guidance"><strong>${e(g[0])}:</strong> ${e(g[1])}</span>`,"guidance")})}
async function refresh(panel){const base=String(window.VACA_API_BASE||"").replace(/\/$/,""),b=panel.querySelector(".live-refresh"),root=document.querySelector(".trip-checklist");if(!base||base.includes("REPLACE-WITH")){panel.querySelector("[data-live-weather]").innerHTML='<div class="live-error"><strong>Worker URL not configured.</strong></div>';panel.querySelector("[data-live-waits]").innerHTML='<div class="live-muted">Run cloudflare-worker/deploy.ps1.</div>';return}if(b){b.disabled=true;b.textContent="Refreshing…"}try{const date=panel.dataset.tripDate,pc=JSON.parse(panel.dataset.queueParks||"[]"),pr=JSON.parse(panel.dataset.priorityRides||"[]"),ids=pc.map(p=>p.id).join(","),res=await fetch(`${base}/api/day?date=${encodeURIComponent(date)}&parks=${encodeURIComponent(ids)}`);if(!res.ok)throw Error(`HTTP ${res.status}`);const d=await res.json();renderWeather(panel,d.weather);await renderWaits(panel,d.parks||{},pr);if(root)annotate(root,d.weather,d.parks||{});panel.querySelector("[data-live-updated]").textContent=new Date(d.generatedAt||Date.now()).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}catch(err){panel.querySelector("[data-live-weather]").innerHTML='<div class="live-error"><strong>Live data unavailable.</strong></div>';panel.querySelector("[data-live-waits]").innerHTML=`<div class="live-muted">${e(err.message)} · use official apps.</div>`}finally{if(b){b.disabled=false;b.textContent="↻ Refresh"}}}
function init(){document.querySelectorAll(".live-park-panel").forEach(p=>{if(p.dataset.workerInitialized)return;p.dataset.workerInitialized="1";p.querySelector(".live-refresh")?.addEventListener("click",()=>refresh(p));refresh(p);setInterval(()=>{if(document.visibilityState==="visible")refresh(p)},R);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh(p)})})}
if(typeof document$!=="undefined")document$.subscribe(init);else document.addEventListener("DOMContentLoaded",init)})();

/* v2.5.1: catalog-backed wait matching and priority-wait jump links */
(function () {
  const CATALOG_FILE = "data/trip_entities.json";

  function assetBaseUrl() {
    const script = [...document.scripts].find(node =>
      (node.src || "").includes("live-park-data.js")
    );
    return script?.src ? new URL(".", script.src) : new URL("assets/", document.baseURI);
  }

  function normalizeName(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[™®]/g, "")
      .replace(/[’‘]/g, "'")
      .toLowerCase()
      .replace(/\bdecision point\b/g, "")
      .replace(/\bevening extension\b/g, "")
      .replace(/\boptional\b/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  async function loadCatalog() {
    const response = await fetch(new URL(CATALOG_FILE, assetBaseUrl()), { cache: "no-cache" });
    if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
    return response.json();
  }

  function resolveEntity(card, entities) {
    const itemId = card.dataset.itemId;
    const park = card.dataset.parkName || "";
    const exact = entities[itemId];
    if (exact && (!park || exact.parkName === park)) return exact;
    return Object.values(entities).find(entity =>
      entity.itineraryId === itemId && (!park || entity.parkName === park)
    ) || exact || null;
  }

  function buildIndex(catalog) {
    const byRideId = new Map();
    const byName = new Map();
    document.querySelectorAll('.trip-item').forEach(card => {
      const entity = resolveEntity(card, catalog.entities || {});
      if (!entity) return;
      const rideId = entity.queueTimes?.rideId;
      if (rideId !== null && rideId !== undefined && rideId !== "") {
        byRideId.set(String(rideId), {card, entity});
        card.dataset.queueRideId = String(rideId);
      }
      [entity.name, entity.queueTimes?.name, entity.themeParksWiki?.name,
       card.querySelector('.trip-item-title')?.textContent]
        .filter(Boolean)
        .forEach(name => byName.set(normalizeName(name), {card, entity}));
    });
    return {byRideId, byName};
  }

  function waitPanel() {
    const heading = [...document.querySelectorAll('h1,h2,h3,h4,strong')]
      .find(node => /priority attraction waits/i.test(node.textContent || ''));
    return heading?.closest('.live-panel, .admonition, section, article, div') || null;
  }

  function waitRows(panel) {
    if (!panel) return [];
    let rows = [...panel.querySelectorAll('[data-ride-id], [data-queue-id], .live-ride, .live-wait-row, .priority-wait-row, li, tr')];
    return rows.filter(row => {
      const text=(row.textContent||'').trim();
      return text && !/priority attraction waits/i.test(text);
    });
  }

  function nameNode(row) {
    return row.querySelector('.live-wait-name, .priority-wait-name, td:first-child, strong, span:first-child');
  }

  function rideIdOf(row) {
    return row.dataset.rideId || row.dataset.queueId ||
      row.querySelector('[data-ride-id]')?.dataset.rideId || '';
  }

  function waitText(row) {
    const node = row.querySelector('.live-wait-value, .wait-value, .wait-time, td:last-child');
    if (node) return node.textContent.trim();
    const match=(row.textContent||'').match(/(Closed|\d+\s*min)/i);
    return match ? match[1] : '';
  }

  function resolveRow(row,index) {
    const rideId=rideIdOf(row);
    if (rideId && index.byRideId.has(String(rideId))) return index.byRideId.get(String(rideId));
    const node=nameNode(row);
    const normalized=normalizeName(node?.textContent || '');
    if (index.byName.has(normalized)) return index.byName.get(normalized);
    for (const [name,match] of index.byName.entries()) {
      if (name && normalized && (name.includes(normalized) || normalized.includes(name))) return match;
    }
    return null;
  }

  function ensureAnchor(card) {
    if (card.id) return card.id;
    card.id=`activity-${card.dataset.itemId || 'item'}`;
    return card.id;
  }

  function addJumpLink(row,match) {
    const node=nameNode(row);
    if (!node || node.closest('a[data-wait-jump]')) return;

    const link=document.createElement('a');
    link.href=`#${ensureAnchor(match.card)}`;
    link.dataset.waitJump='true';
    link.className='priority-wait-jump';
    link.setAttribute('aria-label',`Jump to ${match.entity.name} itinerary card`);
    link.title=`Jump to ${match.entity.name}`;
    link.innerHTML=`<span class="priority-wait-jump-label">${node.textContent}</span><span class="priority-wait-jump-icon" aria-hidden="true">›</span>`;

    node.replaceWith(link);
    row.classList.add('has-wait-jump');

    row.addEventListener('click',event => {
      if (event.target.closest('a')) return;
      link.click();
    });
  }

  function cardWaitClass(text) {
    if (/closed/i.test(text)) return 'closed';
    const minutes = Number((String(text).match(/(\d+)/) || [])[1]);
    if (!Number.isFinite(minutes)) return 'closed';
    return minutes <= 25 ? 'open-short' : minutes <= 55 ? 'open-medium' : 'open-long';
  }

  function cardWaitMarkup(match,text) {
    const parkId = match.entity?.queueTimes?.parkId;
    const rideId = match.entity?.queueTimes?.rideId;
    const cssClass = cardWaitClass(text);
    const label = `${text} · Queue-Times details`;

    if (parkId && rideId) {
      const url = `https://queue-times.com/en-US/parks/${encodeURIComponent(parkId)}/rides/${encodeURIComponent(rideId)}`;
      return `<a class="card-live-wait ${cssClass}" href="${url}" target="_blank" rel="noopener">${label}</a>`;
    }

    return `<span class="card-live-wait ${cssClass}">${text}</span>`;
  }

  function setCardWait(match,text) {
    if (!text) return;

    const details =
      match.card.querySelector('details.trip-item-more') ||
      match.card.querySelector('details') ||
      match.card.querySelector('.trip-more-details');

    if (!details) return;

    const candidateRows=[...details.querySelectorAll(
      '.trip-detail-row, .trip-more-row, .detail-row, [data-detail-key]'
    )];

    const existingRow=candidateRows.find(row => {
      const key=(row.dataset.detailKey||'').toLowerCase();
      const label=row.querySelector(
        '.trip-detail-label, .trip-more-label, .detail-label, dt, strong, b'
      );
      return key==='current-wait' ||
        /^current wait$/i.test((label?.textContent||'').trim());
    });

    if (existingRow) {
      let value=existingRow.querySelector(
        '.trip-detail-value, .trip-more-value, .detail-value, dd, .current-wait-value'
      );
      if (!value) {
        value=document.createElement('span');
        value.className='trip-detail-value current-wait-value';
        existingRow.appendChild(value);
      }
      value.innerHTML=cardWaitMarkup(match,text);
      value.dataset.liveWaitMatched='true';
      existingRow.dataset.liveWaitMatched='true';
      return;
    }

    const labels=[...details.querySelectorAll(
      'dt, .trip-detail-label, .trip-more-label, .detail-label, strong, b'
    )];
    const label=labels.find(n =>
      /^current wait$/i.test((n.textContent||'').trim())
    );

    if (label) {
      let value =
        (label.tagName==='DT' ? label.nextElementSibling : null) ||
        label.parentElement?.querySelector(
          '.trip-detail-value, .trip-more-value, .detail-value, dd, .current-wait-value'
        ) ||
        label.nextElementSibling;

      if (!value || /^(STRONG|B|DT)$/.test(value.tagName||'')) {
        value=document.createElement('span');
        value.className='current-wait-value';
        label.insertAdjacentElement('afterend',value);
      }

      value.innerHTML=cardWaitMarkup(match,text);
      value.dataset.liveWaitMatched='true';
      return;
    }

    const target=labels.find(n =>
      /^(day-of guidance|next)$/i.test((n.textContent||'').trim())
    );

    const row=document.createElement('div');
    row.className='catalog-current-wait trip-detail-row';
    row.dataset.detailKey='current-wait';
    row.dataset.liveWaitMatched='true';
    row.innerHTML=
      `<strong class="trip-detail-label">Current wait</strong>`+
      `<span class="trip-detail-value current-wait-value">${cardWaitMarkup(match,text)}</span>`;

    const targetRow=target?.closest(
      '.trip-detail-row, .trip-more-row, .detail-row, div, p'
    );

    if (targetRow?.parentElement) {
      targetRow.parentElement.insertBefore(row,targetRow);
    } else {
      details.appendChild(row);
    }
  }

  async function sync() {
    if (!document.querySelector('.trip-checklist')) return;
    try {
      const catalog=await loadCatalog();
      const index=buildIndex(catalog);
      waitRows(waitPanel()).forEach(row => {
        const match=resolveRow(row,index);
        if (!match) return;
        addJumpLink(row,match);
        setCardWait(match,waitText(row));
      });
    } catch (error) {
      console.warn('Catalog-backed wait synchronization failed:',error);
    }
  }

  function init() {
    setTimeout(sync,500);
    setTimeout(sync,1800);
    setInterval(sync,60000);
  }
  if (typeof document$ !== 'undefined') document$.subscribe(init);
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
