const fs=require('fs');const crypto=require('crypto');
for(const file of ['index.html','offline.html','manifest.json'])fs.copyFileSync('public/'+file,'dist/'+file);
fs.cpSync('public/images','dist/images',{recursive:true});
const hash=crypto.createHash('sha256');for(const file of ['app.js','app.css','index.html','offline.html','manifest.json','images/bg.jpg','images/logo.png'])hash.update(fs.readFileSync('dist/'+file));
fs.writeFileSync('dist/serviceworker.js',fs.readFileSync('public/serviceworker.js','utf8').replace('__CACHE_VERSION__',hash.digest('hex').slice(0,12)));
