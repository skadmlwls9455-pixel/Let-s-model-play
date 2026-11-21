/* omelette-v1.js - first pass (kept so the before/after sheet can be rebuilt). See ../omelette.js for the final sprite. */
(function (root) {
  'use strict';
  var S = {
    name: 'gyeran-mari v1', w: 48, h: 40,
    light: [1, 1, 1],
    pal: { W: 'G0', c: 'J6', y: 'J5', b: 'B2', g: 'J4', o: 'J3', r: 'J2', k: 'J1', K: 'J0',
      P: 'P3', p: 'P2', q: 'P1', Q: 'P0', a: 'C2',
      w: 's6', l: 's5', m: 's4', n: 's3', h: 'b4', i: 'b3', j: 'b2', J: 'b1' },
    ramps: ['WcybgorkK', 'PpqQ', 'whi', 'lmn'],
    parts: {
      plate: [
        '..JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ..',
        '.JwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ.',
        'JwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwllllllllllllllllllllllllllllllllllllllllllwwJ',
        'JwwmwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwmwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwmwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwmwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwmwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwmwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwmwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwmwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwmwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwmwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwmwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwmwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwmwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwmwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JllllllllllllllllllllllllllllllllllllllllllllllJ',
        '.JmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmJ.',
        '..JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ..'],
      slice: [
        '..kkkkkkkkkkk..',
        '.kyccWWccyggok.',
        'kyccccyygggggoK',
        'kgyyygggooggggK',
        'kggggggggggoogK',
        'koooooooooooorK',
        'kocccccyyyyyyrK',
        'koccyyyyypyyyrK',
        'kocyoooooooyyrK',
        'koyyoyyyyyoyyrK',
        'koyyoyyoayoybrK',
        'koyyooooyyoybrK',
        'koyqyyyyyyobbrK',
        'kobpyyybbbobbrK',
        '.KrrrrrrrrrrrK.',
        '..KKKKKKKKKKK..'],
      flat: [
        '..kkkkkkkkkkk..',
        '.koooooooooook.',
        'kocccyyyyyyyyrK',
        'kocyoooooooyyrK',
        'koyyoyyoyyoybrK',
        'koyyoooyyyoybrK',
        'kyyggggggggggoK',
        'kyggggggggggooK',
        'kggggggooggggoK',
        '.KoooooooooorK.',
        '..KKKKKKKKKKK..'],
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
    outlined: { leaf: ['q', 'Q'] },   /* parts drawn without an outline: [lit ring colour, shadow ring colour] */
    frames: {
      served: [['plate', 0, 13], ['leaf', 0, 7, 's'], ['slice', 22, 6, 's'], ['slice', 13, 9, 's'], ['slice', 4, 12, 's'], ['flat', 30, 19, 's']]
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = S; else root.OMELETTE_V1 = S;
})(this);
