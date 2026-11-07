/* Run: node tools/test-avatar.js. No packages or browser required. */
'use strict';
const assert=require('node:assert/strict');
const P=require('../js/avatar-parts.js'),A=require('../js/avatar.js');
let checked=0;
const palette=new Set(P.palette.map(c=>c.toLowerCase()));
function verify(look,opts){
  const image=A.pixels(look,opts),d=image.data;assert.equal(image.width,16);assert.equal(image.height,24);
  const solid=new Set();
  for(let i=0;i<384;i++){
    const alpha=d[i*4+3];assert.ok(alpha===0||alpha===255,'partial alpha');
    if(alpha){solid.add(i);const hex='#'+Array.from(d.slice(i*4,i*4+3),v=>v.toString(16).padStart(2,'0')).join('');assert.ok(palette.has(hex),'off-palette pixel');
      assert.ok(i%16>0&&i%16<15&&i>=16&&i<368,'clipped border: '+JSON.stringify([look,opts]));}
  }
  assert.ok(solid.size>100,'empty or incomplete character');
  // Four-connected silhouette: catches stray pixels and disconnected hands/feet.
  const queue=[solid.values().next().value],seen=new Set(queue);
  for(let k=0;k<queue.length;k++)for(const n of neighbors(queue[k]))if(solid.has(n)&&!seen.has(n)){seen.add(n);queue.push(n);}
  assert.equal(seen.size,solid.size,'detached pixels: '+JSON.stringify([look,opts]));
  // Flood the background from outside: any remaining clear pixel is an internal hole.
  const bg=[0],outside=new Set(bg);
  for(let k=0;k<bg.length;k++)for(const n of neighbors(bg[k]))if(!solid.has(n)&&!outside.has(n)){outside.add(n);bg.push(n);}
  assert.equal(solid.size+outside.size,384,'transparent hole: '+JSON.stringify([look,opts]));
  checked++;
}
function neighbors(i){const out=[];if(i%16)out.push(i-1);if(i%16<15)out.push(i+1);if(i>=16)out.push(i-16);if(i<368)out.push(i+16);return out;}
const fields=Object.keys(P.catalog);
function eachCombination(n,look){if(n===fields.length){verify(look,{outline:true});return;}const f=fields[n];for(const item of P.catalog[f])eachCombination(n+1,{...look,[f]:item.id});}
eachCombination(0,{});
// Every geometric combination at every pose and expression, both outline modes.
for(const hair of P.catalog.hair)for(const top of P.catalog.top)for(const bottom of P.catalog.bottom)
  for(const frame of P.frames)for(const expr of P.expressions)for(const outline of [true,false])verify({hair:hair.id,top:top.id,bottom:bottom.id},{frame,expr,outline});
assert.deepEqual(A.validate(null),A.validate({}));
assert.deepEqual(A.validate({hair:'__proto__',eyeColor:'constructor',skin:42}),A.validate({}));
assert.equal(A.validate({top:'bad',hair:'hair.long'}).hair,'hair.long');
assert.equal(A.validate({top:'bad'}).top,P.defaults.top);
const original={...P.defaults};A.pixels(original);assert.deepEqual(original,P.defaults);
const hashes=new Set(P.catalog.eyeColor.map(c=>Buffer.from(A.pixels({eyeColor:c.id},{outline:false}).data).toString('base64')));
assert.equal(hashes.size,P.catalog.eyeColor.length,'eye colours are not visibly distinct');
const altered=A.pixels({});altered.data.fill(0);assert.ok(A.pixels({}).data.some(x=>x===255),'caller mutated cache');
assert.ok(A.cacheInfo().size<=96,'unbounded cache');
console.log(JSON.stringify({ok:true,framesChecked:checked,checks:['binary alpha','Apollo palette','transparent margin','connected silhouette','no internal holes','visible eye colours','safe normalization','bounded cache']},null,2));
