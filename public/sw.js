const CACHE='sg-study-deck-v1.5.0';
const FILES=['./','./index.html','./style.css','./manifest.webmanifest','./js/app.js','./js/core.js','./js/db.js','./js/audio.js','./js/speech.js','./js/ai-question.js','./js/practical.js','./js/cloud.js','./js/effects.js','./data/ipa-verified.json','./data/practical-verified.json','./data/practical2-verified.json','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sg-study-deck-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok&&FILES.some(f=>new URL(f,self.location.href).pathname===url.pathname)){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(()=>caches.match(event.request).then(cached=>cached||(event.request.mode==='navigate'?caches.match('./index.html'):new Response('Offline',{status:503})))));
});
