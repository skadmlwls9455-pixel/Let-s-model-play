/* Avatar art and catalogue. Plain scripts + CommonJS; no DOM or game state. */
(function (root, factory) {
  var parts = factory();
  if (typeof module === 'object' && module.exports) module.exports = parts;
  else root.AVATAR_PARTS = parts;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var palette = ['#172038','#253a5e','#3c5e8b','#4f8fba','#73bed3','#a4dddb',
    '#19332d','#25562e','#468232','#75a743','#a8ca58','#d0da91','#4d2b32',
    '#7a4841','#ad7757','#c09473','#d7b594','#e7d5b3','#341c27','#602c2c',
    '#884b2b','#be772b','#de9e41','#e8c170','#241527','#411d31','#752438',
    '#a53030','#cf573c','#da863e','#1e1d39','#402751','#7a367b','#a23e8c',
    '#c65197','#df84a5','#090a14','#10141f','#151d28','#202e37','#394a50',
    '#577277','#819796','#a8b5b2','#c7cfcc','#ebede9'];
  function item(id, label, colors, extra) {
    return Object.assign({id:id, label:label, colors:colors || []}, extra || {});
  }
  var catalog = {
    hair: [item('hair.short','짧은 머리'), item('hair.bob','단발'),
      item('hair.long','긴 머리'), item('hair.pony','묶은 머리')],
    hairColor: [item('color.black','검정',['#394a50','#151d28','#090a14']),
      item('color.chestnut','밤색',['#7a4841','#4d2b32','#341c27']),
      item('color.brown','갈색',['#be772b','#884b2b','#602c2c']),
      item('color.blonde','금발',['#e8c170','#de9e41','#be772b'])],
    eyeColor: [item('eye.ink','먹색',['#394a50','#151d28']),
      item('eye.brown','갈색',['#de9e41','#884b2b']),
      item('eye.blue','파랑',['#73bed3','#3c5e8b']),
      item('eye.green','초록',['#a8ca58','#468232']),
      item('eye.plum','자두',['#df84a5','#7a367b'])],
    skin: [item('skin1','피부 1',['#e7d5b3','#d7b594','#c09473']),
      item('skin2','피부 2',['#d7b594','#c09473','#ad7757']),
      item('skin3','피부 3',['#c09473','#ad7757','#7a4841']),
      item('skin4','피부 4',['#ad7757','#884b2b','#602c2c']),
      item('skin5','피부 5',['#7a4841','#4d2b32','#341c27'])],
    top: [item('top.tee_cream','크림 티',['#ebede9','#e7d5b3','#d7b594']),
      item('top.tee_stripe','줄무늬 티',['#ebede9','#e7d5b3','#3c5e8b']),
      item('top.hood_navy','남색 후드',['#4f8fba','#3c5e8b','#253a5e'])],
    bottom: [item('bottom.pants_navy','남색 바지',['#3c5e8b','#253a5e','#172038']),
      item('bottom.shorts_brown','갈색 반바지',['#be772b','#884b2b','#602c2c']),
      item('bottom.skirt_check','체크 치마',['#ad7757','#7a4841','#4d2b32'])]
  };
  // H/h/d = hair highlight/base/shade. Every layer stays inside 16 x 24.
  var hair = {
    'hair.short': {front:{x:2,y:3,rows:[
      '...hhhhhh...','..hHHHHhhh..','.hHHHhhhhd..','hhHhhhhhhhd.',
      '.hh..hh..hh.','.h........h.']}},
    'hair.bob': {back:{x:2,y:4,rows:[
      '..hhhhhhhh..','.hhhhhhhhhhd','hhhhhhhhhhhd','hhhhhhhhhhhd',
      'hhhhhhhhhhhd','hhhhhhhhhhhd','hhhhhhhhhhhd','hhhhhhhhhhhd',
      'dhhddddddhhd','.dd......dd.']},front:{x:2,y:3,rows:[
      '...hhhhhh...','..hHHHHhhh..','.hHHHhhhhd..','hhHhhhhhhhhd',
      'hhh.hhhh.hhd','hh........hd','hh........hd','dh........hd']}},
    'hair.long': {back:{x:2,y:4,rows:[
      '..hhhhhhhh..','.hhhhhhhhhh.','hhhhhhhhhhhd','hhhhhhhhhhhd',
      'hhhhhhhhhhhd','hhhhhhhhhhhd','hhhhhhhhhhhd','hhhhhhhhhhhd',
      'hhhhhhhhhhhd','hhhhhhhhhhhd','hHhhhhhhhhhd','hHhhhhhhhhhd',
      'dhhhhhhhhhdd','.ddhhddhhdd.','...dd..dd...']},front:{x:2,y:3,rows:[
      '...hhhhhh...','..hHHHHhhh..','.hHHHhhhhd..','hhHhhhhhhhhd',
      'hhh...hh.hhd','hh........hd','hh........hd','dh........hd']}},
    'hair.pony': {back:{x:10,y:4,rows:[
      '.hhh','hHHh','hHhd','.hhd','.hhd','.hhd','.hhd','.hhd','.hhd','.ddd']},
      front:{x:2,y:3,rows:[
      '...hhhhhh...','..hHHHHhhh..','.hHHHhhhhd..','hhHhhhhhhhd.',
      '.hh.hh...hh.','.h........h.']}}
  };
  var tops = {
    'top.tee_cream':['..Tt..tT..','.TTTTTTTt.','ttTTTTTttt','..Tttttt..','..tttttv..'],
    'top.tee_stripe':['..Tt..tT..','.TTTTTTTt.','vvTvvvvTvv','..TTTTTt..','..vvvvvv..'],
    'top.hood_navy':['..vTttTv..','.vTTvvTtv.','ttTTTTTttt','tvTtTTttvt','..Ttvvtt..']
  };
  var bottoms = {
    'bottom.pants_navy':['BBBBBBBB','.Bb..Bb.','.bb..bb.'],
    'bottom.shorts_brown':['BBBBBBBB','.Bb..Bb.'],
    'bottom.skirt_check':['.BBBBBB.','BbBbbBbB','bBbbbbBb']
  };
  var defaults = {skin:'skin1',hair:'hair.bob',hairColor:'color.chestnut',eyeColor:'eye.brown',
    top:'top.tee_cream',bottom:'bottom.pants_navy',outer:null,eyes:null,head:null};
  function freeze(obj) {
    Object.keys(obj).forEach(function (k) { if (obj[k] && typeof obj[k] === 'object') freeze(obj[k]); });
    return Object.freeze(obj);
  }
  return freeze({version:1,width:16,height:24,palette:palette,catalog:catalog,hair:hair,
    tops:tops,bottoms:bottoms,defaults:defaults,frames:['stand','walk0','walk1','walk2','walk3'],
    expressions:['idle','blink','happy']});
});
