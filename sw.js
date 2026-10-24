// Network-first for pages (so updates arrive when online), cache fallback when offline.
const CACHE='vhf-v2';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png','./robots.txt'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const isPage=req.mode==='navigate'||req.destination==='document';
  if(isPage){
    e.respondWith(fetch(req,{cache:'no-store'}).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',cp))}return r})
      .catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(r=>{if(r.ok&&(r.type==='basic'||r.type==='cors')){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp))}return r})));
});
