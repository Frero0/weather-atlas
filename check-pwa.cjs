const assert=require('node:assert/strict');const fs=require('fs');const vm=require('vm');const path=require('path');
(async()=>{
 const listeners={};let cached=[],deleted=[],claimed=false;
 const cache={addAll:async urls=>{cached=Array.from(urls);},match:async name=>({cached:name})};
 const self={location:{origin:'http://localhost:3016'},clients:{claim:async()=>{claimed=true}},addEventListener:(type,fn)=>listeners[type]=fn};
 const source=fs.readFileSync('dist/serviceworker.js','utf8');assert.doesNotMatch(source,/__CACHE_VERSION__/);const current=source.match(/fs-meteo16-/)&&source.match(/CACHE_PREFIX\+'([^']+)'/)[1];
 const caches={open:async()=>cache,keys:async()=>['fs-meteo16-old','other-app','fs-meteo16-'+current],delete:async key=>{deleted.push(key)}};
 vm.runInNewContext(source,{self,caches,URL,fetch:async()=>{throw Error('offline')}});
 let pending;listeners.install({waitUntil:promise=>pending=promise});await pending;
 for(const url of cached){const filename=url==='/'?'index.html':url.slice(1);assert.ok(fs.existsSync(path.join('dist',filename)),filename);}
 assert.ok(cached.includes('/app.js'));assert.ok(cached.includes('/app.css'));assert.ok(cached.includes('/images/bg.jpg'));
 listeners.activate({waitUntil:promise=>pending=promise});await pending;assert.deepEqual(deleted,['fs-meteo16-old']);assert.equal(claimed,true);
 listeners.fetch({request:{url:'http://localhost:3016/',method:'GET',mode:'navigate'},respondWith:promise=>pending=promise});assert.equal((await pending).cached,'/index.html');
 listeners.fetch({request:{url:'http://localhost:3016/app.js',method:'GET',mode:'cors'},respondWith:promise=>pending=promise});assert.equal((await pending).cached,'/app.js');
 let handled=false;listeners.fetch({request:{url:'https://api.open-meteo.com/v1/forecast',method:'GET'},respondWith:()=>handled=true});assert.equal(handled,false);
 const manifest=JSON.parse(fs.readFileSync('dist/manifest.json'));assert.equal(manifest.lang,'it');assert.match(manifest.name,/Federico Santorsola/);assert.equal(manifest.display,'standalone');
 console.log('Verificati: risorse offline, fallback della pagina, pulizia limitata alla cache del progetto e manifest italiano.');
})().catch(error=>{console.error(error);process.exitCode=1;});
