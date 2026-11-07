/* Pixel compositor. Owns no storage, game loop, network or game state. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./avatar-parts.js'));
  else root.AVATAR = factory(root.AVATAR_PARTS);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (P) {
  'use strict';
  if (!P) throw new Error('Load avatar-parts.js before avatar.js');
  var W=P.width, H=P.height, fields=Object.keys(P.catalog), cache=new Map(), LIMIT=96;
  var rgb=P.palette.map(function (hex) { return [1,3,5].map(function(i){return parseInt(hex.slice(i,i+2),16);}); });
  var index=Object.create(null), items=Object.create(null);
  P.palette.forEach(function(c,i){index[c]=i+1;});
  fields.forEach(function(f){ items[f]=Object.create(null); P.catalog[f].forEach(function(v){items[f][v.id]=v;}); });
  function lab(c) {
    var a=c.map(function(v){v/=255; return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
    var l=Math.cbrt(.4122214708*a[0]+.5363325363*a[1]+.0514459929*a[2]);
    var m=Math.cbrt(.2119034982*a[0]+.6806995451*a[1]+.1073969566*a[2]);
    var s=Math.cbrt(.0883024619*a[0]+.2817188376*a[1]+.6299787005*a[2]);
    return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
  }
  var labs=rgb.map(lab), dark=[0];
  labs.forEach(function(c){
    var best=0, distance=Infinity;
    labs.forEach(function(d,i){var q=Math.pow(c[0]*.62-d[0],2)+Math.pow(c[1]-d[1],2)+Math.pow(c[2]-d[2],2); if(q<distance){best=i+1;distance=q;}});
    dark.push(best);
  });
  function validate(value) {
    var source=value && typeof value==='object'?value:{}, out={};
    fields.forEach(function(f){out[f]=typeof source[f]==='string' && Object.prototype.hasOwnProperty.call(items[f],source[f])?source[f]:P.defaults[f];});
    // Reserved equipment slots from PLAYER_PROGRESSION. Unsupported items are not rendered.
    out.outer=null; out.eyes=null; out.head=null;
    return out;
  }
  function options(o) {
    o=o||{};
    return {frame:P.frames.indexOf(o.frame)>=0?o.frame:'stand',expr:P.expressions.indexOf(o.expr)>=0?o.expr:'idle',outline:o.outline!==false};
  }
  function describe(value) {var v=validate(value);return ['hair','hairColor','eyeColor','top','bottom'].map(function(f){return items[f][v[f]].label+(f==='hairColor'?' 머리':f==='eyeColor'?' 눈':'');}).join(', ');}
  function getIndices(value, opts) {
    var v=validate(value), o=options(opts), key=JSON.stringify([v,o]), hit=cache.get(key);
    if(hit){cache.delete(key);cache.set(key,hit);return hit;}
    var pixels=new Uint8Array(W*H), skin=items.skin[v.skin].colors, hair=items.hairColor[v.hairColor].colors;
    var top=items.top[v.top].colors, bottom=items.bottom[v.bottom].colors, eye=items.eyeColor[v.eyeColor].colors;
    var colors={s:skin[1],S:skin[0],a:skin[2],H:hair[0],h:hair[1],d:hair[2],
      T:top[0],t:top[1],v:top[2],B:bottom[0],b:bottom[1],c:bottom[2],
      k:'#151d28',w:'#ebede9',e:eye[1],E:eye[0],r:'#c09473'};
    var step=o.frame==='stand'?0:Number(o.frame.slice(-1)), bob=(step===1||step===3)?-1:0;
    function dot(x,y,c){if(x>=0&&y>=0&&x<W&&y<H) pixels[y*W+x]=typeof c==='number'?c:index[colors[c]||c];}
    function rect(x,y,w,h,c){for(var dy=0;dy<h;dy++) for(var dx=0;dx<w;dx++) dot(x+dx,y+dy,c);}
    function layer(a,dy){if(!a)return;a.rows.forEach(function(row,y){for(var x=0;x<row.length;x++) if(row[x]!=='.') dot(a.x+x,a.y+y+(dy||0),row[x]);});}
    layer(P.hair[v.hair].back,bob);
    // Skin silhouette: face, neck, arms and legs connect before clothing is applied.
    rect(4,7+bob,8,5,'s');rect(5,6+bob,6,7,'s');rect(4,7+bob,7,4,'S');
    rect(3,9+bob,1,2,'s');rect(12,9+bob,1,2,'a');rect(5,12+bob,6,3-bob,'s');
    rect(3,15,2,3,'s');rect(11,15,2,3,'a');
    rect(5,18,2,3,'s');rect(9,18,2,3,'s');
    layer({x:4,y:18,rows:P.bottoms[v.bottom]});
    layer({x:3,y:13,rows:P.tops[v.top]});
    // Hoodie cuffs and pocket, all on integer coordinates.
    if(v.top==='top.hood_navy'){rect(3,17,1,1,'v');rect(12,17,1,1,'v');rect(7,16,2,1,'v');}
    var left=step===1?1:0, right=step===3?1:0;
    if(left){rect(4,21,3,1,0);rect(5,20,2,1,0);}
    if(right){rect(9,21,3,1,0);rect(9,20,2,1,0);}
    rect(4,21-left,3,1,'k');rect(9,21-right,3,1,'k');
    dot(4,21-left,'#394a50');dot(9,21-right,'#394a50');
    // Eye colours occupy two pixels per eye, including a dark upper edge.
    [5,9].forEach(function(x){
      if(o.expr==='blink'){rect(x,10+bob,2,1,'k');}
      else if(o.expr==='happy'){dot(x,10+bob,'k');dot(x+1,9+bob,'k');}
      else{rect(x,9+bob,2,2,'e');dot(x,9+bob,'k');dot(x,10+bob,'E');}
    });
    dot(7,12+bob,'a'); if(o.expr==='happy')dot(8,12+bob,'a');
    layer(P.hair[v.hair].front,bob);
    if(v.hair==='hair.pony'){dot(12,7+bob,'#d7b594');}
    if(o.outline){
      var before=pixels.slice();
      for(var y=0;y<H;y++)for(var x=0;x<W;x++){
        if(before[y*W+x])continue;
        var neighbors=[[x,y-1],[x-1,y],[x+1,y],[x,y+1]], chosen=0;
        neighbors.forEach(function(n){if(n[0]<0||n[0]>=W||n[1]<0||n[1]>=H)return;var c=before[n[1]*W+n[0]];if(c&&(!chosen||labs[c-1][0]<labs[chosen-1][0]))chosen=c;});
        if(chosen)pixels[y*W+x]=dark[chosen];
      }
    }
    cache.set(key,pixels);if(cache.size>LIMIT)cache.delete(cache.keys().next().value);
    return pixels;
  }
  function pixels(value,opts) {
    var data=getIndices(value,opts), rgba=new Uint8ClampedArray(W*H*4);
    for(var i=0;i<data.length;i++)if(data[i]){var c=rgb[data[i]-1];rgba.set([c[0],c[1],c[2],255],i*4);}
    return {width:W,height:H,data:rgba};
  }
  function compose(value,opts) {
    if(typeof document==='undefined') throw new Error('AVATAR.compose requires a browser. Use AVATAR.pixels in Node.');
    var canvas=document.createElement('canvas'), p=pixels(value,opts);canvas.width=W;canvas.height=H;
    var ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
    var img=ctx.createImageData(W,H);img.data.set(p.data);ctx.putImageData(img,0,0);return canvas;
  }
  function face(value,expr){var c=document.createElement('canvas');c.width=16;c.height=16;c.getContext('2d').drawImage(compose(value,{expr:expr}),0,0);return c;}
  function draw(canvas,value,opts){
    var ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);
    var scale=Math.max(1,Math.floor(Math.min(canvas.width/W,canvas.height/H)));
    ctx.drawImage(compose(value,opts),Math.floor((canvas.width-W*scale)/2),Math.floor((canvas.height-H*scale)/2),W*scale,H*scale);
  }
  return {version:1,width:W,height:H,validate:validate,describe:describe,pixels:pixels,compose:compose,face:face,draw:draw,
    cacheInfo:function(){return {size:cache.size,limit:LIMIT};},clearCache:function(){cache.clear();}};
});
