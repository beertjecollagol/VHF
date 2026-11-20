// Network-first for pages (so updates arrive when online), cache fallback when offline.
// Chart tiles live in their own cache (sm-tiles) that survives app updates.
const CACHE='vhf-v32';
const TILES='sm-tiles';
const REGS='sm-regs';
const FILES=['./','./index.html','./sim.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png','./robots.txt','./lib/leaflet.js','./lib/leaflet.css','./lib/maplibre-gl.js','./lib/maplibre-gl.css','./data/timezones.json','./lib/pdfjs/pdf.min.mjs','./lib/pdfjs/pdf.worker.min.mjs'];
const KV='cache.kartverket.no', NET_FIRST=['tile.openstreetmap.org','tiles.openseamap.org'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==TILES&&k!==REGS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
function putTile(req,r){if(r&&r.ok&&r.type!=='opaque'){const cp=r.clone();caches.open(TILES).then(c=>c.put(req.url,cp))}return r}
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.hostname===KV){ // sea chart / topo: cache first (stored areas work offline)
    e.respondWith(caches.open(TILES).then(c=>c.match(req.url)).then(hit=>hit||fetch(req).then(r=>putTile(req,r))).catch(()=>new Response('',{status:504})));
    return;
  }
  if(NET_FIRST.includes(url.hostname)){ // OSM / OpenSeaMap: network first, keep what was viewed for offline
    e.respondWith(fetch(req).then(r=>putTile(req,r)).catch(()=>caches.open(TILES).then(c=>c.match(req.url)).then(hit=>hit||new Response('',{status:504}))));
    return;
  }
  if(url.pathname.includes('/regs/')){ // official texts: saved copies in sm-regs; index.json network-first
    if(url.pathname.endsWith('.json')){e.respondWith(fetch(req,{cache:'no-store'}).catch(()=>caches.open(REGS).then(c=>c.match(req.url)).then(h=>h||new Response('[]',{headers:{'Content-Type':'application/json'}}))));return}
    e.respondWith(caches.open(REGS).then(c=>c.match(req.url)).then(h=>h||fetch(req)));return;
  }
  const isPage=req.mode==='navigate'||req.destination==='document';
  if(isPage){
    const key=url.pathname.endsWith('sim.html')?'./sim.html':'./index.html';
    e.respondWith(fetch(req,{cache:'no-store'}).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(key,cp))}return r})
      .catch(()=>caches.match(key).then(h=>h||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(r=>{if(r.ok&&(r.type==='basic'||r.type==='cors')){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp))}return r})));
});
