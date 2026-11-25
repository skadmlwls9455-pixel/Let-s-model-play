/* SVG 글자 → PNG · 인쇄. 브라우저 안에서만 (서버로 보내지 않는다). */
(function () {
  'use strict';
  var BJ = window.BJ = window.BJ || {};
  var W = 600, H = 900;

  function sized(svg, scale) {
    return svg.replace('width="' + W + '" height="' + H + '"', 'width="' + Math.round(W * scale) + '" height="' + Math.round(H * scale) + '"');
  }

  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('그림으로 바꾸지 못했어요')); };
      img.src = url;
    });
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* SVG 글자 하나 → 캔버스 */
  function toCanvas(svg, scale) {
    var blob = new Blob([sized(svg, scale)], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    return loadImage(url).then(function (img) {
      /* 사파리는 SVG 안 글꼴을 한 박자 늦게 그려서, 잠깐 기다렸다 그린다 */
      return wait(150).then(function () {
        var c = document.createElement('canvas');
        c.width = Math.round(W * scale); c.height = Math.round(H * scale);
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        return c;
      });
    }, function (e) { URL.revokeObjectURL(url); throw e; });
  }

  function canvasBlob(c) {
    return new Promise(function (resolve, reject) {
      c.toBlob(function (b) { if (b) resolve(b); else reject(new Error('PNG 를 만들지 못했어요')); }, 'image/png');
    });
  }

  /* 앞 · 뒤를 나란히 한 장으로 */
  function sideBySide(c1, c2, scale) {
    var gap = Math.round(40 * scale), pad = Math.round(40 * scale);
    var c = document.createElement('canvas');
    c.width = c1.width + c2.width + gap + pad * 2; c.height = Math.max(c1.height, c2.height) + pad * 2;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(c1, pad, pad); ctx.drawImage(c2, pad + c1.width + gap, pad);
    return c;
  }

  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  /* 인쇄: 10 × 15 cm 실제 크기로 앞면 한 쪽, 뒷면 한 쪽 */
  function print(pngURLs, title) {
    var w = window.open('', '_blank');
    if (!w) return false;
    var pages = pngURLs.map(function (u) { return '<div class="pg"><img src="' + u + '"></div>'; }).join('');
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + (title || '부적 인쇄') + '</title>' +
      '<style>@page{margin:12mm}body{margin:0}.pg{page-break-after:always;display:flex;justify-content:center;padding-top:6mm}' +
      '.pg:last-child{page-break-after:auto}img{width:100mm;height:150mm;display:block}</style></head><body>' + pages +
      '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>');
    w.document.close();
    return true;
  }

  BJ.exporter = { toCanvas: toCanvas, canvasBlob: canvasBlob, sideBySide: sideBySide, download: download, print: print, sized: sized };
})();
