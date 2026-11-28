/* omelette.js - RESEARCH SAMPLE (round 7, topic 09): a rolled omelette (gyeran-mari) on a small rectangular plate,
 * three-quarter view, 48 x 40 art px, game palette only (Apollo 46 + FOOD 24 by name). Evidence for the pipeline, not final art.
 * Light from the upper left. One character = one pixel, '.' = empty. See pixmap.js for the format.
 * History: history/omelette-v1.js -> v2 -> v3 -> this file (the lying slice redrawn with a bigger, lighter cut face; the
 * seam got its own two characters so a doneness palette swap can leave it alone; a 16-px icon and a 12 x 9 table sprite added). */
(function (root) {
  'use strict';
  var S = {
    name: 'gyeran-mari', w: 48, h: 40,
    light: [1, 1, 2],                     /* contact shadows fall 1 right, 1 down, walked 2 steps */
    /* character -> palette NAME (js/cook-art.js: PAL = Apollo by role, F = FOOD). One character per ROLE, not per colour:
       g o r = skin (base, shade, deep), u v = the seam between the rolled layers (lit side, shadow side), c y b = cut face
       (light, base, shade), W = hard glint, t k K = outline (lamp side, main, grounded). u and g are the same colour today. */
    pal: { W: 'G0', c: 'J6', y: 'J5', b: 'B2', g: 'J4', o: 'J3', r: 'J2', u: 'J4', v: 'J3', t: 'a1', k: 'r1', K: 'r0',
      P: 'P3', p: 'P2', q: 'P1', Q: 'P0', a: 'C2', e: 'C2', R: 'C1', D: 'C0',
      w: 's6', l: 's5', m: 's4', n: 's3', h: 'b4', i: 'b3', j: 'b2', J: 'b1' },
    ramps: ['WcybgorkK', 'PpqQ', 'eRD', 'whi', 'lmn', 'jJ'],          /* light -> dark; a shadow moves one step right */
    states: {                             /* cooking states of the same pixels: only the skin roles are re-mapped */
      pale: { g: 'J5', o: 'J4', r: 'J3' },
      golden: {},
      browned: { g: 'J3', o: 'J2', r: 'J1' }
    },
    parts: {
      plate: [
        '...JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ...',
        '..JwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ..',
        '.JwjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjwJ.',
        'JwjwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwllllllllllllllllllllllllllllllllllllllllwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjwJ',
        'JwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JllllllllllllllllllllllllllllllllllllllllllllllJ',
        '.JmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmJ.',
        '..JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ..'],
      /* one slice standing on its skin: rows 1-5 the browned top (skin), row 6 the skin seen edge-on, rows 7-14 the cut
         face with the rolled layers (a 1.5-turn seam), flecks of scallion (p q) and carrot (a) */
      slice: [
        '...ttttttttt...',
        '.ttggyyygggokk.',
        'tgyccWWcygggook',
        'tyycccyygooggok',
        'tgyyygggggogork',
        'tggyyyygggggork',
        'kggggggggggoook',
        'kgccccccccyyyok',
        'kgcccccccyyyyok',
        'kgccuuuuuvvyyok',
        'kgccuccyyyvyyok',
        'kgccucyvayvybok',
        'kgcyuvvvyyvybok',
        'kgypyyyyyyvbboK',
        'kooqyyybbbvbooK',
        '.KKoooooooooKK.',
        '...KKKKKKKKK...'],
      /* one slice lying down: the cut face on top (the most lit plane, 6 rows), the skin in front (3 rows) */
      flat: [
        '...ttttttttt...',
        '.ttgggggggggkk.',
        'tgcccccccccyyok',
        'tgccccccccyyyok',
        'tgccuuuuuvvyyok',
        'kgccuccyyyvyyok',
        'kgccucyvayvybok',
        'kgcyuvvvyyvybok',
        'kggggggggggoook',
        'kyccyyygggggook',
        'kgyyggggooggorK',
        '.KKgggggooooKK.',
        '...KKKKKKKKK...'],
      ketchup: [
        '...DD...',
        '..DeRD..',
        '.DeWRRD.',
        'DRRRRRRD',
        'DRRRRRDD',
        '.DDDDDD.'],
      leaf: [
        '..PP...PPp...',
        '.PPpp.PPppp.p',
        'PPpppqPppppqp',
        'PppppqpppppqP',
        'pppppqppppqpp',
        '.ppppqpppqppp',
        '..pppqppqppq.',
        '...ppqpqppq..',
        '....qqqqqq...'],
      /* 16-px icon parts: a 9 x 9 slice (the seam shrinks to a square ring) and a plate strip */
      mini: [
        '.ttttttt.',
        'tyWcygggk',
        'tgyggggok',
        'kcccccyok',
        'kcuuuvyok',
        'kcuccvyok',
        'kcuvvvybK',
        'kyyyyybbK',
        '.KKKKKKK.'],
      plate16: [
        '.JJJJJJJJJJJJJJ.',
        'JwwwwwwwwwwwwwwJ',
        'JwwwwwwwwwwwwwwJ',
        'JwwwwwwwwwwwwwwJ',
        'JllllllllllllllJ',
        '.JJJJJJJJJJJJJJ.'],
      /* the play-room table: 12 x 9, one texel = one room pixel (today's plate is 9 room px wide on a phone). Two slices staggered
         (side by side with one glint each they read as a face with two eyes: first try, see the report) */
      table: [
        '......ttt...',
        '.....tgWgk..',
        '..tttkccyk..',
        'JtycgkcvykJJ',
        'JkccykyybkhJ',
        'JkcvykKKKhwJ',
        'JwKKKhwRRwwJ',
        'JllllllllllJ',
        '.JJJJJJJJJJ.']
    },
    outlined: { leaf: ['q', 'Q'] },       /* parts drawn without an outline: [lit ring, shadow ring] for the outline pass */
    frames: {                             /* back to front; 's' = cast a contact shadow on what is already painted */
      served: { w: 48, h: 40, list: [['plate', 0, 14], ['leaf', 0, 7, 's'], ['slice', 22, 4, 's'], ['slice', 13, 7, 's'], ['slice', 4, 10, 's'], ['flat', 30, 18, 's'], ['ketchup', 6, 27, 's']] },
      icon: { w: 16, h: 16, list: [['plate16', 0, 9], ['mini', 6, 2, 's'], ['mini', 1, 4, 's']] },
      table: { w: 12, h: 9, list: [['table', 0, 0]] }
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = S; else root.OMELETTE = S;
})(this);
