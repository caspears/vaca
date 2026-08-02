(function () {
  const EXPANDED_KEY = "vaca-navigator-expanded";

  function stateOf(item) { return item.dataset.state || "pending"; }
  function ratingKey(dayId,itemId){return `vaca-rating:${dayId}:${itemId}`;}
  function revisitKey(dayId,itemId){return `vaca-revisit:${dayId}:${itemId}`;}

  function setExpanded(nav, value) {
    nav.classList.toggle("is-expanded", value);
    nav.querySelectorAll("[data-nav='toggle']").forEach(btn => {
      btn.setAttribute("aria-expanded", value ? "true":"false");
      if (btn.classList.contains("trip-nav-icon-button")) btn.textContent = value ? "▲":"▼";
    });
    localStorage.setItem(EXPANDED_KEY, String(value));
  }

  function saveMetadata(item, dayId) {
    const data = {
      dayId, itemId:item.dataset.itemId,
      title:item.querySelector(".trip-item-title")?.textContent?.replace(/^[^\w]+/,"").trim() || item.dataset.itemId,
      park:item.dataset.parkName || "Other",
      navigateUrl:item.dataset.navigateUrl || "",
      locateUrl:item.dataset.locateUrl || "",
      pageUrl:`${location.pathname}#${item.id}`
    };
    localStorage.setItem(`vaca-item-meta:${dayId}:${item.dataset.itemId}`, JSON.stringify(data));
  }

  function renderRating(item, dayId) {
    const id=item.dataset.itemId;
    const rating=Number(localStorage.getItem(ratingKey(dayId,id))||0);
    const revisit=localStorage.getItem(revisitKey(dayId,id))==="true";
    item.querySelectorAll(".trip-rating-star").forEach(btn=>{
      const v=Number(btn.dataset.ratingValue);
      btn.classList.toggle("is-active",v<=rating);
      btn.setAttribute("aria-pressed",v<=rating?"true":"false");
    });
    const rb=item.querySelector(".trip-revisit-toggle");
    if(rb){rb.setAttribute("aria-pressed",revisit?"true":"false");rb.textContent=revisit?"🔁 Revisit: Yes":"🔁 Revisit?";}
    const clear=item.querySelector(".trip-rating-clear");
    if(clear) clear.hidden = rating===0;
    const summary=item.querySelector(".trip-rating-summary");
    if(summary) summary.textContent=rating||revisit?`${rating?rating+"/5 stars":"No star rating"}${revisit?" · marked to revisit":""}`:"Not rated yet.";
    saveMetadata(item,dayId);
  }

  function initRatings(root) {
    const day=root.dataset.dayId;
    root.querySelectorAll(".trip-item").forEach(item=>{
      if(item.dataset.ratingInitialized==="true")return;
      item.dataset.ratingInitialized="true";
      item.querySelectorAll(".trip-rating-star").forEach(btn=>{
        btn.addEventListener("click",e=>{
          e.preventDefault();e.stopPropagation();
          const key=ratingKey(day,item.dataset.itemId);
          const current=Number(localStorage.getItem(key)||0);
          const value=Number(btn.dataset.ratingValue);
          localStorage.setItem(key,String(current===value?0:value));
          renderRating(item,day);
        });
      });
      item.querySelector(".trip-rating-clear")?.addEventListener("click",e=>{
        e.preventDefault();e.stopPropagation();
        localStorage.removeItem(ratingKey(day,item.dataset.itemId));
        renderRating(item,day);
      });
      item.querySelector(".trip-revisit-toggle")?.addEventListener("click",e=>{
        e.preventDefault();e.stopPropagation();
        const key=revisitKey(day,item.dataset.itemId);
        localStorage.setItem(key,String(localStorage.getItem(key)!=="true"));
        renderRating(item,day);
      });
      renderRating(item,day);
    });
  }

  function updateNav(root,nav) {
    const all=[...root.querySelectorAll(".trip-item")];
    const done=all.filter(x=>stateOf(x)==="done").length, skip=all.filter(x=>stateOf(x)==="skip").length;
    const next=all.find(x=>stateOf(x)==="pending");
    nav.querySelector("[data-nav='progress']").textContent=`${done} done · ${skip} skipped · ${all.length-done-skip} left`;
    nav.querySelector(".trip-nav-progress-fill").style.width=all.length?`${Math.round((done+skip)/all.length*100)}%`:"0%";
    if(next){
      nav.dataset.activePark=next.dataset.park||"ak";
      nav.querySelector("[data-nav='next-icon']").textContent=({lightning:"⚡",meal:"🍽️",show:"🎭",transfer:"🚌",extra:"🎁",hotel:"🏨",flight:"✈️"})[next.dataset.kind]||"📍";
      nav.querySelector("[data-nav='next-title']").textContent=next.querySelector(".trip-item-title")?.textContent?.replace(/^[^\w]+/,"").trim()||"Next";
      nav.querySelector("[data-nav='next-time']").textContent=next.dataset.windowLabel||"";
      nav.querySelectorAll("[data-nav='jump']").forEach(a=>{a.href=`#${next.id}`;a.hidden=false;});
    } else {
      nav.querySelector("[data-nav='next-icon']").textContent="✅";
      nav.querySelector("[data-nav='next-title']").textContent="Day complete";
      nav.querySelector("[data-nav='next-time']").textContent="";
    }
    const c=all.find(x=>x.dataset.commitment==="true"&&stateOf(x)==="pending");
    nav.querySelector("[data-nav='commitment']").textContent=c?`${c.dataset.windowLabel||""} · ${c.querySelector(".trip-item-title")?.textContent?.replace(/^[^\w]+/,"").trim()}`:"No upcoming timed commitment";
    nav.querySelector("[data-nav='leave']").textContent=c?.dataset.leaveLabel||"—";
    nav.querySelector("[data-nav='updated']").textContent=new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  }

  function initDay() {
    const root=document.querySelector(".trip-checklist[data-day-id]");
    if(!root)return;
    initRatings(root);
    const nav=document.querySelector(".trip-navigator");
    if(nav&&nav.dataset.fullInit!=="1"){
      nav.dataset.fullInit="1";
      setExpanded(nav,localStorage.getItem(EXPANDED_KEY)==="true");
      nav.querySelectorAll("[data-nav='toggle']").forEach(b=>b.addEventListener("click",()=>setExpanded(nav,!nav.classList.contains("is-expanded"))));
      root.addEventListener("click",()=>setTimeout(()=>updateNav(root,nav),70));
      updateNav(root,nav);
      setInterval(()=>updateNav(root,nav),60000);
    }
  }

  function buildRevisit(){
    const root=document.querySelector("[data-revisit-list]");if(!root)return;
    const entries=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key?.startsWith("vaca-revisit:")||localStorage.getItem(key)!=="true")continue;
      const suffix=key.slice("vaca-revisit:".length), raw=localStorage.getItem(`vaca-item-meta:${suffix}`);
      if(!raw)continue;
      try{const m=JSON.parse(raw);m.rating=Number(localStorage.getItem(`vaca-rating:${suffix}`)||0);entries.push(m);}catch{}
    }
    if(!entries.length){root.innerHTML='<div class="revisit-empty">No attractions are marked for revisit in this browser yet.</div>';return;}
    const groups={};entries.sort((a,b)=>a.park.localeCompare(b.park)||a.title.localeCompare(b.title)).forEach(e=>(groups[e.park]??=[]).push(e));
    root.innerHTML=Object.entries(groups).map(([park,items])=>`<section class="revisit-park"><h2>${park}</h2><div class="revisit-grid">${items.map(x=>`<article class="revisit-card"><h3>${x.title}</h3><div class="revisit-rating">${x.rating?"★".repeat(x.rating)+"☆".repeat(5-x.rating)+" · "+x.rating+"/5":"Not rated"}</div><div class="revisit-actions">${x.navigateUrl?`<a href="${x.navigateUrl}" target="_blank">➜ Navigate</a>`:""}${x.locateUrl?`<a href="${x.locateUrl}" target="_blank">📍 Locate</a>`:""}<a href="${x.pageUrl}">📋 Day entry</a></div></article>`).join("")}</div></section>`).join("");
  }
  function init(){initDay();buildRevisit();}
  if(typeof document$!=="undefined")document$.subscribe(init);else document.addEventListener("DOMContentLoaded",init);
})();