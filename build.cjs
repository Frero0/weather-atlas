const esbuild=require('esbuild');
esbuild.buildSync({entryPoints:['src/index.js'],bundle:true,outfile:'dist/app.js',loader:{'.js':'jsx'},external:['/images/*'],define:{'process.env.NODE_ENV':'"production"'},minify:true});
require('./prepare.cjs');
