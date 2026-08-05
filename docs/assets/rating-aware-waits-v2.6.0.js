(function(){
const RATINGS_FILE="family-ride-ratings-v2.6.0.json";
const CATALOG_FILE="data/trip_entities.json";
const PATH_MULTIPLIER=1.35;
const WALK_FPM=250;
const GROUPS=[
  ["favorite","⭐ Family favorites"],
  ["good","👍 Good options"],
  ["optional","⚪ If convenient"],
  ["unrated","More attractions"],
  ["not-recommended","🚫 Not recommended for us"]
];

function base(){
  const s=[...document.scripts].find(x=>(x.src||"").includes("rating-aware-waits-v2.6.0"));
  return s?.src?new URL(".",s.src):new URL("assets/",document.baseURI);
}
function norm(v){
  return String(v||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[™®]/g,"").replace(/[’‘]/g,"'").toLowerCase()
    .replace(/[^a-z0-9]+/g," ").trim();
}
function park(){
  const t=document.querySelector(".md-header__title .md-ellipsis")?.textContent||
    document.querySelector("h1")?.textContent||"";
  for(const [a,b] of [
    ["Epic Universe","Epic Universe"],
    ["Islands of Adventure","Islands of Adventure"],
    ["Universal Studios","Universal Studios Florida"]
  ]) if(t.includes(a)) return b;
  return "";
}
function loc(e){
  const l=e?.location;
  return l?.status==="VERIFIED"&&typeof l.latitude==="number"&&typeof l.longitude==="number"
    ?{latitude:l.latitude,longitude:l.longitude}:null;
}
function hav(a,b){
  const R=6371000,r=x=>x*Math.PI/180;
  const dlat=r(b.latitude-a.latitude),dlon=r(b.longitude-a.longitude);
  const la=r(a.latitude),lb=r(b.latitude);
  const q=Math.sin(dlat/2)**2+Math.cos(la)*Math.cos(lb)*Math.sin(dlon/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}
function distanceInfo(meters){
  const feet=meters*3.28084*PATH_MULTIPLIER;
  const midpoint=feet/WALK_FPM;
  const low=Math.max(2,Math.floor(midpoint*.8));
  const high=Math.max(low+1,Math.ceil(midpoint*1.25));
  return {
    feet,
    minutes:high,
    distance:feet<1000?`${Math.max(25,Math.round(feet/25)*25)} ft`:`${(feet/5280).toFixed(1)} mi`,
    walk:`${low}–${high} min`
  };
}
function entityByName(cat,name,p){
  const n=norm(name);
  const es=Object.values(cat.entities||{}).filter(e=>e.parkName===p);
  return es.find(e=>[e.queueTimes?.name,e.themeParksWiki?.name,e.name].some(x=>norm(x)===n))||
    es.find(e=>[e.queueTimes?.name,e.themeParksWiki?.name,e.name].filter(Boolean)
      .some(x=>norm(x).includes(n)||n.includes(norm(x))));
}
function nextRef(cat){
  const cards=[...document.querySelectorAll(".trip-item")];
  const c=cards.find(x=>!["complete","skip"].includes(x.dataset.status));
  if(c){
    const id=c.dataset.catalogId||c.dataset.itemId;
    const e=cat.entities?.[id]||
      Object.values(cat.entities||{}).find(x=>x.itineraryId===c.dataset.itemId);
    const l=loc(e);
    if(l) return {location:l,label:e.name,kind:"next"};
  }
  return null;
}
function gpsRef(){
  try{
    const s=JSON.parse(sessionStorage.getItem("vaca-current-location")||"null");
    if(s&&Date.now()-s.timestamp<30*60*1000){
      return {location:{latitude:s.latitude,longitude:s.longitude},label:"current location",kind:"current"};
    }
  }catch{}
  return null;
}
function waitNum(row){
  const text=row.querySelector(".live-wait,.live-wait-value,.wait-value,.wait-time,.live-pill")?.textContent||
    row.textContent;
  const m=String(text).match(/(\d+)/);
  return m?Number(m[1]):null;
}
function isClosed(row){return /closed|unavailable/i.test(row.textContent||"")}
function rowName(r){
  return r.querySelector(".live-ride-name,.priority-wait-jump-label,strong")?.textContent||
    r.dataset.configuredRide||r.textContent;
}
function ratingFor(all,p,name){
  const map=all[p]||{},n=norm(name);
  for(const [k,v] of Object.entries(map)){
    const nk=norm(k);
    if(nk===n||nk.includes(n)||n.includes(nk)) return v;
  }
  return {group:"unrated",rating:null,note:""};
}
function requestGps(status,done){
  if(!navigator.geolocation){
    status.textContent="Location unavailable; using the next planned stop.";
    done(null);return;
  }
  status.textContent="Getting current location…";
  navigator.geolocation.getCurrentPosition(pos=>{
    const v={latitude:pos.coords.latitude,longitude:pos.coords.longitude,timestamp:Date.now()};
    sessionStorage.setItem("vaca-current-location",JSON.stringify(v));
    status.textContent="Using current phone location.";
    done({location:v,label:"current location",kind:"current"});
  },()=>{
    status.textContent="Location permission unavailable; using the next planned stop.";
    done(null);
  },{enableHighAccuracy:true,timeout:10000,maximumAge:300000});
}
function controls(container,p,onChange){
  let c=container.querySelector(".rating-wait-controls");
  if(c)return c;
  c=document.createElement("div");
  c.className="rating-wait-controls";
  c.innerHTML=`
    <div class="rating-control-block">
      <strong>Sort</strong>
      <div class="rating-sort-buttons" role="group" aria-label="Sort attraction waits">
        <button type="button" data-sort="rating">⭐ Rating</button>
        <button type="button" data-sort="distance">🚶 Distance</button>
        <button type="button" data-sort="wait">⏱ Wait</button>
      </div>
    </div>
    <div class="rating-control-block">
      <strong>Distance from</strong>
      <div class="rating-reference-buttons" role="group" aria-label="Distance reference">
        <button type="button" data-reference="current">Current location</button>
        <button type="button" data-reference="next">Next planned stop</button>
      </div>
    </div>
    <div class="rating-reference-status" aria-live="polite"></div>`;
  const source=container.querySelector(".live-rides,[data-live-waits]");
  container.insertBefore(c,source);

  const savedSort=localStorage.getItem(`vaca-wait-sort:${p}`)||"rating";
  const savedRef=localStorage.getItem(`vaca-distance-mode:${p}`)||"current";
  c.dataset.sort=savedSort;
  c.dataset.mode=savedRef;

  c.querySelectorAll("[data-sort]").forEach(b=>{
    b.classList.toggle("is-active",b.dataset.sort===savedSort);
    b.addEventListener("click",()=>{
      localStorage.setItem(`vaca-wait-sort:${p}`,b.dataset.sort);
      c.dataset.sort=b.dataset.sort;
      c.querySelectorAll("[data-sort]").forEach(x=>x.classList.toggle("is-active",x===b));
      onChange();
    });
  });
  c.querySelectorAll("[data-reference]").forEach(b=>{
    b.classList.toggle("is-active",b.dataset.reference===savedRef);
    b.addEventListener("click",()=>{
      localStorage.setItem(`vaca-distance-mode:${p}`,b.dataset.reference);
      c.dataset.mode=b.dataset.reference;
      c.querySelectorAll("[data-reference]").forEach(x=>x.classList.toggle("is-active",x===b));
      onChange();
    });
  });
  return c;
}
function prepareRows(rows,ratings,p,cat,ref){
  return rows.map((row,index)=>{
    // Remove the earlier overlay badge if it was loaded.
    row.querySelectorAll(".family-rating-badge,.rating-aware-meta,.compact-rating-meta").forEach(x=>x.remove());

    const name=rowName(row);
    const meta=ratingFor(ratings,p,name);
    const entity=entityByName(cat,name,p);
    const location=loc(entity);
    let travel=null;
    if(ref&&location){
      const d=distanceInfo(hav(ref.location,location));
      travel={...d,label:ref.label};
    }
    return {
      row,index,name,meta,entity,travel,
      wait:waitNum(row),
      closed:isClosed(row)
    };
  });
}
function decorate(item){
  const {row,meta,travel}=item;
  const nameWrap=row.querySelector(".priority-wait-jump,.live-ride>div:first-child")||
    row.querySelector("strong")?.parentElement;
  const nameNode=row.querySelector(".priority-wait-jump-label,strong");
  if(nameNode&&meta.rating!=null){
    const badge=document.createElement("span");
    badge.className=`compact-family-rating compact-family-rating-${Math.min(5,Math.max(1,Math.round(meta.rating)))}`;
    badge.textContent=`${meta.rating}⭐`;
    badge.title=`Family rating: ${meta.rating}`;
    nameNode.insertAdjacentElement("beforebegin",badge);
  }
  if(nameWrap){
    const detail=document.createElement("span");
    detail.className="compact-rating-meta";
    detail.textContent=travel
      ?`🚶 ${travel.walk} · ${travel.distance} from ${travel.label}`
      :"Distance unavailable";
    nameWrap.appendChild(detail);
  }
  row.dataset.familyGroup=meta.group;
  row.dataset.familyRating=meta.rating??"";
}
function compare(sort){
  return (a,b)=>{
    if(a.meta.group==="not-recommended"&&b.meta.group!=="not-recommended")return 1;
    if(b.meta.group==="not-recommended"&&a.meta.group!=="not-recommended")return -1;
    if(sort==="distance"){
      return (a.travel?.minutes??999)-(b.travel?.minutes??999)||
        (b.meta.rating??-1)-(a.meta.rating??-1)||
        (a.wait??999)-(b.wait??999);
    }
    if(sort==="wait"){
      if(a.closed!==b.closed)return a.closed?1:-1;
      return (a.wait??999)-(b.wait??999)||
        (b.meta.rating??-1)-(a.meta.rating??-1)||
        (a.travel?.minutes??999)-(b.travel?.minutes??999);
    }
    return (b.meta.rating??-1)-(a.meta.rating??-1)||
      (a.wait??999)-(b.wait??999)||
      (a.travel?.minutes??999)-(b.travel?.minutes??999);
  };
}
function renderGrouped(container,items){
  for(const [key,label] of GROUPS){
    const matching=items.filter(x=>x.meta.group===key);
    if(!matching.length)continue;
    const collapsible=key==="not-recommended"||key==="unrated";
    const section=document.createElement(collapsible?"details":"section");
    section.className=`rating-wait-group rating-group-${key}`;
    section.innerHTML=collapsible
      ?`<summary>${label} <span>${matching.length}</span></summary><div class="rating-wait-group-body"></div>`
      :`<h4>${label}</h4><div class="rating-wait-group-body"></div>`;
    const body=section.querySelector(".rating-wait-group-body");
    matching.sort(compare("rating")).forEach(item=>{decorate(item);body.appendChild(item.row)});
    container.appendChild(section);
  }
}
function renderFlat(container,items,sort){
  const list=document.createElement("div");
  list.className=`rating-flat-list rating-flat-${sort}`;
  items.sort(compare(sort)).forEach(item=>{decorate(item);list.appendChild(item.row)});
  container.appendChild(list);
}
function arrange(container,rows,ratings,p,cat,ref,sort){
  container.querySelectorAll(".rating-wait-group,.rating-flat-list").forEach(x=>x.remove());
  const items=prepareRows(rows,ratings,p,cat,ref);
  if(sort==="rating")renderGrouped(container,items);
  else renderFlat(container,items,sort);
  const source=container.querySelector(".live-rides,[data-live-waits]");
  if(source)source.hidden=true;
}
async function init(){
  const p=park();
  if(!p)return;
  let ratings,cat;
  try{
    [ratings,cat]=await Promise.all([
      fetch(new URL(RATINGS_FILE,base()),{cache:"no-cache"}).then(r=>r.json()),
      fetch(new URL(CATALOG_FILE,base()),{cache:"no-cache"}).then(r=>r.json())
    ]);
  }catch(e){
    console.warn("Rating-aware waits unavailable",e);
    return;
  }

  const heading=[...document.querySelectorAll("h2,h3,h4")]
    .find(x=>/live attraction waits|priority attraction waits|family ride opportunities/i.test(x.textContent||""));
  const container=heading?.closest(".live-card,section,article,div");
  if(!container)return;
  heading.textContent="Family ride opportunities";

  const source=container.querySelector(".live-rides,[data-live-waits]");
  if(!source)return;
  const rows=[...source.querySelectorAll(".live-ride")];
  if(!rows.length)return;

  let controlsNode;
  function apply(ref){
    arrange(container,rows,ratings,p,cat,ref||nextRef(cat),controlsNode.dataset.sort||"rating");
  }
  function choose(){
    const status=controlsNode.querySelector(".rating-reference-status");
    if(controlsNode.dataset.mode==="next"){
      status.textContent="Distances use the next planned itinerary stop.";
      apply(nextRef(cat));return;
    }
    const cached=gpsRef();
    if(cached){
      status.textContent="Distances use the recent phone location.";
      apply(cached);return;
    }
    requestGps(status,r=>apply(r||nextRef(cat)));
  }
  controlsNode=controls(container,p,choose);
  choose();
}
function schedule(){
  setTimeout(init,900);
  setTimeout(init,2600);
  setTimeout(init,5000);
}
if(typeof document$!=="undefined")document$.subscribe(schedule);
else if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",schedule);
else schedule();
})();
