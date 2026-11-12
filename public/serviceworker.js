const CACHE_PREFIX='fs-meteo16-';
const CACHE_NAME=CACHE_PREFIX+'__CACHE_VERSION__';
const SHELL=['/','/index.html','/app.js','/app.css','/offline.html','/manifest.json','/images/bg.jpg','/images/logo.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request;const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(async()=>{const cache=await caches.open(CACHE_NAME);return await cache.match('/index.html')||await cache.match('/offline.html');}));return;
 }
 if(SHELL.includes(url.pathname))event.respondWith(caches.open(CACHE_NAME).then(async cache=>await cache.match(url.pathname)||fetch(request)));
});
