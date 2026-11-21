/* omelette-v3.js - third pass (kept so the before/after sheet can be rebuilt). See ../omelette.js for the final sprite.
 * Changes from v2: the skin went golden (J4 base) and the cut face cream (J6 base) so the two planes and the two materials
 * read apart, the seam is drawn in two tones (lit side J4, shadow side J3), corners back to a 2-px round, a blue line on the
 * plate rim, a peak on the ketchup dab. */
(function (root) {
  'use strict';
  var S = {
    name: 'gyeran-mari v3', w: 48, h: 40,
    light: [1, 1, 2],                     /* contact shadows fall 1 right, 1 down, walked 2 steps */
    /* character -> palette NAME (js/cook-art.js: C = Apollo by role, F = FOOD). Egg ramp W c y b g o r is hue-shifted:
       cream -> yellow -> orange -> red-brown. Outline t k K = warm browns, lit to grounded. */
    pal: { W: 'G0', c: 'J6', y: 'J5', b: 'B2', g: 'J4', o: 'J3', r: 'J2', t: 'a1', k: 'r1', K: 'r0',
      P: 'P3', p: 'P2', q: 'P1', Q: 'P0', a: 'C2', e: 'C2', R: 'C1', D: 'C0',
      w: 's6', l: 's5', m: 's4', n: 's3', h: 'b4', i: 'b3', j: 'b2', J: 'b1' },
    ramps: ['WcybgorkK', 'PpqQ', 'eRD', 'whi', 'lmn', 'jJ'],
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
        'kgccgggggooyyok',
        'kgccgccyyyoyyok',
        'kgccgcyoayoybok',
        'kgcygoooyyoybok',
        'kgypyyyyyyobboK',
        'kooqyyybbbobooK',
        '.KKoooooooooKK.',
        '...KKKKKKKKK...'],
      /* one slice lying down: the cut face on top (foreshortened to 4 rows), the skin in front */
      flat: [
        '...ttttttttt...',
        '.ttgggggggggkk.',
        'tgcccccccyyyyok',
        'tgccgggggooyyok',
        'kgccgcyoyyoybok',
        'kgcygoooyyoybok',
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
        '....qqqqqq...']
    },
    outlined: { leaf: ['q', 'Q'] },       /* parts drawn without an outline: [lit ring, shadow ring] for the outline pass */
    frames: {                             /* back to front; 's' = cast a contact shadow on what is already painted */
      served: [['plate', 0, 14], ['leaf', 0, 7, 's'], ['slice', 22, 4, 's'], ['slice', 13, 7, 's'], ['slice', 4, 10, 's'], ['flat', 30, 19, 's'], ['ketchup', 6, 27, 's']]
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = S; else root.OMELETTE_V3 = S;
})(this);
