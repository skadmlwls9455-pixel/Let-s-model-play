/* Standalone offline review file. Run: node tools/bundle-avatar.js */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'avatar.html'),'utf8');
html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,file)=>
  '<style>\n'+fs.readFileSync(path.join(root,file),'utf8').replace(/<\/style/gi,'<\\/style')+'\n</style>');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>
  '<script>\n'+fs.readFileSync(path.join(root,file),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>');
html=html.replace('<a class="av-brand" href="index.html">','<span class="av-brand">').replace(' 뽈뽈 문어</a>',' 뽈뽈 문어</span>');
const license=fs.readFileSync(path.join(root,'vendor/THREE-LICENSE.txt'),'utf8');
html=html.replace('<!doctype html>','<!doctype html>\n<!-- Three.js r128 license:\n'+license.replace(/-->/g,'-- >')+'\n-->');
const out=path.join(root,'dist/avatar-preview.html');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);
console.log(path.relative(root,out)+' ('+Buffer.byteLength(html)+' bytes)');
