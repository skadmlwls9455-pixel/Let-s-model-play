/* omelette-v2.js - second pass (kept so the before/after sheet can be rebuilt). See ../omelette.js for the final sprite.
 * Changes from v1: brown outline instead of red (lit a1, main r1, ground r0), paler cut face with a two-tone seam, a lighter
 * top plane 5 px deep with a cream streak, corners rounded by 3 px, a 2-px contact shadow, plate corners rounded, a ketchup
 * dab in the empty corner. */
(function (root) {
  'use strict';
  var S = {
    name: 'gyeran-mari v2', w: 48, h: 40,
    light: [1, 1, 2],
    pal: { W: 'G0', c: 'J6', y: 'J5', b: 'B2', g: 'J4', o: 'J3', r: 'J2', t: 'a1', k: 'r1', K: 'r0',
      P: 'P3', p: 'P2', q: 'P1', Q: 'P0', a: 'C2', e: 'C2', R: 'C1', D: 'C0',
      w: 's6', l: 's5', m: 's4', n: 's3', h: 'b4', i: 'b3', j: 'b2', J: 'b1' },
    ramps: ['WcybgorkK', 'PpqQ', 'eRD', 'whi', 'lmn'],
    parts: {
      plate: [
        '...JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ...',
        '..JwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ..',
        '.JwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ.',
        'JwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwllllllllllllllllllllllllllllllllllllllllllwwJ',
        'JwwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JllllllllllllllllllllllllllllllllllllllllllllllJ',
        '.JmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmJ.',
        '..JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ..'],
      slice: [
        '....ttttttt....',
        '..ttccWWccytt..',
        '.tyccccyyyyggk.',
        'tyycyyygogyyygk',
        'tyyyyyyggyyggok',
        'tygyyyyyyyygook',
        'tyygggggggggook',
        'tyggccccccygook',
        'kgcccccyyyyyyok',
        'kgcygggggggyyok',
        'kgyygyyyyyoyyok',
        'kgyygyyoayoybok',
        'kgyygoooyyoybok',
        'kgypyyyyyyobboK',
        '.KooyyybbboooK.',
        '..KKoooooooKK..',
        '....KKKKKKK....'],
      flat: [
        '....ttttttt....',
        '..ttgggggggtt..',
        '.tggccccyyyggk.',
        'tgccgggggggyyok',
        'tgyygyyoyyoybok',
        'kgyygoooyyoybok',
        'kgggggggggooook',
        'kyccyyyggggggok',
        'kgyggggggoggooK',
        '.KggggggggoooK.',
        '..KKoooooooKK..',
        '....KKKKKKK....'],
      ketchup: [
        '..DDD...',
        '.DeRRDD.',
        'DeWRRRRD',
        'DRRRRRRD',
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
    outlined: { leaf: ['q', 'Q'] },
    frames: {
      served: [['plate', 0, 14], ['leaf', 0, 8, 's'], ['slice', 22, 5, 's'], ['slice', 13, 8, 's'], ['slice', 4, 11, 's'], ['flat', 30, 19, 's'], ['ketchup', 8, 28, 's']]
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = S; else root.OMELETTE_V2 = S;
})(this);
