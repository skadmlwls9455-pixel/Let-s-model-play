/* js/cook-sprites.js -- food sprites for the kitchen and the table (round 7). One global COOK_SPR. No DOM, file:// safe, runs in node.
 *   Contract (wip/round7/briefs/SPRITES.md): COOK_SPR.get(id, frame) -> { w, h, d: Uint8ClampedArray RGBA } | null,
 *   COOK_SPR.ids() -> string[], COOK_SPR.info(id) -> { w, h, frames, ax, ay } | null.
 *   This is the empty base: the art lane fills the table. A consumer that gets null draws its own plain fallback. */
var COOK_SPR = (function () {
  'use strict';
  var TABLE = {};   /* id -> { w, h, ax, ay, frames: [rows of palette characters] } */
  function info(id) { var s = Object.prototype.hasOwnProperty.call(TABLE, id) ? TABLE[id] : null; return s ? { w: s.w, h: s.h, frames: s.frames.length, ax: s.ax, ay: s.ay } : null; }
  function ids() { return Object.keys(TABLE).sort(); }
  function get(id, frame) { return null; }
  return { get: get, ids: ids, info: info, version: 0 };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = COOK_SPR;
