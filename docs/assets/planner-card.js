(function(){
const K="vaca-park-advisor-collapsed";
const state=i=>i.dataset.state||"pending";
const title=i=>i?.querySelector(".trip-item-title")?.textContent?.replace(/^[^\w]+/,"").trim()||"";
function detail(i,label){const g=i?.querySelector(".trip-detail-grid");if(!g)return"";const c=[...g.children];for(let x=0;x<c.length;x+=2)if((c[x]?.textContent||"").trim().toLowerCase()===label.toLowerCase())return c[x+1]?.textContent?.trim()||"";return""}
function render(a,r){
 const items=[...r.querySelectorAll(".trip-item")],next=items.find(i=>state(i)==="pending");
 a.querySelector("[data-advisor-next-title]").textContent=next?title(next):"Day complete";
 a.querySelector("[data-advisor-next-meta]").textContent=next?[next.dataset.windowLabel||"",next.dataset.leaveLabel||""].filter(Boolean).join(" · "):"";
 a.querySelector("[data-advisor-collapsed-text]").textContent=next?`Next: ${title(next)}${next.dataset.windowLabel?` (${next.dataset.windowLabel})`:""}`:"Day complete";
 const cs=items.filter(i=>i.dataset.commitment==="true"&&state(i)==="pending").slice(0,6);
 a.querySelector("[data-advisor-commitments]").innerHTML=cs.map(i=>`<div class="park-advisor-item"><span>${i.dataset.kind==="meal"?"🍽️":i.dataset.kind==="show"?"🎭":"⚡"}</span><span>${title(i)}</span><span class="park-advisor-time">${i.dataset.windowLabel||""}</span></div>`).join("")||"<div>No remaining timed commitments.</div>";
 let advice=next?detail(next,"Day-of guidance"):"All planned activities are complete.";
 if(!advice&&next)advice=next.dataset.kind==="lightning"?"Protect the confirmed return window and use the reserved lane.":next.dataset.kind==="meal"?"Protect this dining commitment and start moving with the planned buffer.":"Continue with the ordered itinerary unless live conditions suggest a nearby better option.";
 a.querySelector("[data-advisor-advice]").textContent=advice;
 const waits=items.filter(i=>state(i)==="pending").map(i=>({i,w:detail(i,"Current wait")})).filter(x=>x.w).slice(0,3);
 a.querySelector("[data-advisor-watch]").innerHTML=waits.map(x=>`<div class="park-advisor-item"><span>⏱</span><span>${title(x.i)}</span><span class="park-advisor-time">${x.w.replace("· Queue-Times details","").trim()}</span></div>`).join("")||"<div>Live ride waits will appear after data loads.</div>";
 const src=document.querySelector("[data-live-weather]"),wt=a.querySelector("[data-advisor-weather]");
 if(src&&wt){const lines=[...src.querySelectorAll(".live-weather-windows>div")];const main=src.querySelector(".live-weather-main")?.textContent?.trim();wt.innerHTML=(main?`<div><strong>${main}</strong></div>`:"")+(lines.length?lines.slice(0,3).map(l=>`<div>${l.innerHTML}</div>`).join(""):`<div>${src.textContent.replace(/\s+/g," ").trim()||"Forecast loading…"}</div>`);}
 const u=document.querySelector("[data-live-updated]")?.textContent?.trim();a.querySelector("[data-advisor-status]").textContent=u&&u!=="—"?`Live data updated ${u}. Official park apps remain authoritative.`:"Live data is loading. Official park apps remain authoritative.";
}
function init(){const a=document.querySelector(".park-advisor"),r=document.querySelector(".trip-checklist");if(!a||!r||a.dataset.init)return;a.dataset.init="1";a.classList.toggle("is-collapsed",localStorage.getItem(K)==="true");a.querySelector(".park-advisor-toggle")?.addEventListener("click",()=>{const v=!a.classList.contains("is-collapsed");a.classList.toggle("is-collapsed",v);localStorage.setItem(K,String(v))});const up=()=>render(a,r);up();r.addEventListener("click",()=>setTimeout(up,100));new MutationObserver(up).observe(document.body,{childList:true,subtree:true,characterData:true});setInterval(up,60000)}
if(typeof document$!=="undefined")document$.subscribe(init);else document.addEventListener("DOMContentLoaded",init);
})();
