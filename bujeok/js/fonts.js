/* 글꼴: 구글 폰트의 한글 손글씨 · 둥근 글꼴 몇 개 + 내가 올린 글꼴.
 * 화면은 <link> 로 불러오고, PNG 로 내보낼 때는 쓰인 글자만 받아서 SVG 안에 넣는다 (그림으로 바꾸면 바깥 글꼴을 못 읽어서).
 */
(function () {
  'use strict';
  var BJ = window.BJ = window.BJ || {};

  var LIST = [
    { id: 'Poor Story', name: '푸어스토리 (기본)', q: 'Poor+Story', w: 400 },
    { id: 'Black And White Picture', name: '흑백사진', q: 'Black+And+White+Picture', w: 400 },
    { id: 'Gugi', name: '구기', q: 'Gugi', w: 400 },
    { id: 'Single Day', name: '싱글데이', q: 'Single+Day', w: 400 },
    { id: 'Gamja Flower', name: '감자꽃', q: 'Gamja+Flower', w: 400 },
    { id: 'Hi Melody', name: '하이멜로디', q: 'Hi+Melody', w: 400 },
    { id: 'Gaegu', name: '개구 (굵게)', q: 'Gaegu:wght@700', w: 700 },
    { id: 'Jua', name: '주아', q: 'Jua', w: 400 },
    { id: 'Do Hyeon', name: '도현', q: 'Do+Hyeon', w: 400 },
    { id: 'Sunflower', name: '해바라기 (굵게)', q: 'Sunflower:wght@700', w: 700 },
    { id: 'Yeon Sung', name: '연성', q: 'Yeon+Sung', w: 400 },
    { id: 'Nanum Pen Script', name: '나눔손글씨 펜', q: 'Nanum+Pen+Script', w: 400 },
    { id: 'Gowun Dodum', name: '고운돋움', q: 'Gowun+Dodum', w: 400 }
  ];
  /* 한자 (丁未年 · 福 …) 는 손글씨 글꼴에 없어서 이 글꼴로 넘어간다 */
  var HANJA = { id: 'Noto Serif KR', q: 'Noto+Serif+KR:wght@700;900', w: 700 };

  var custom = {};   /* id → { family, name, dataURL } */
  var cssCache = {};
  var canvas = null;

  function find(id) {
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i];
    return null;
  }

  /* 글꼴 고르기 값 ('Poor Story' 또는 'custom:<id>') → { family, weight } */
  function resolve(value) {
    if (value && value.indexOf('custom:') === 0) {
      var c = custom[value.slice(7)];
      if (c) return { family: c.family, weight: 400, custom: c };
      value = LIST[0].id;
    }
    var f = find(value) || LIST[0];
    return { family: f.id, weight: f.w, def: f };
  }

  function stack(family) { return "'" + family + "', 'Noto Serif KR', sans-serif"; }

  function measure(text, family, weight, size) {
    canvas = canvas || document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    ctx.font = weight + ' ' + size + 'px ' + stack(family);
    return ctx.measureText(text).width;
  }

  function ensure(family, weight, text) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load(weight + " 40px '" + family + "'", text || '가'),
      document.fonts.load("700 40px 'Noto Serif KR'", '丁未年福')
    ]).catch(function () {});
  }

  /* 내 글꼴: 실제로 읽힌 다음에만 목록에 올린다 (깨진 파일이 '내 글꼴'에 남지 않게) */
  function addCustom(id, name, dataURL) {
    var family = 'BJ Custom ' + id, entry = { id: id, family: family, name: name, dataURL: dataURL };
    if (!/^data:[\w.+\/-]*;base64,[A-Za-z0-9+\/=]*$/.test(String(dataURL).slice(0, 200)) || /["'()\\<>]/.test(String(dataURL))) {
      return Promise.reject(new Error('글꼴 파일이 아니에요'));
    }
    if (typeof FontFace === 'undefined') { custom[id] = entry; return Promise.resolve(entry); }
    var ff;
    try { ff = new FontFace(family, 'url(' + dataURL + ')'); } catch (e) { return Promise.reject(e); }
    return ff.load().then(function (loaded) {
      document.fonts.add(loaded);
      custom[id] = entry;
      return entry;
    });
  }
  function removeCustom(id) {
    var c = custom[id];
    delete custom[id];
    if (c && document.fonts && document.fonts.forEach) {
      var drop = [];
      document.fonts.forEach(function (f) { if (f.family === c.family || f.family === '"' + c.family + '"') drop.push(f); });
      drop.forEach(function (f) { try { document.fonts.delete(f); } catch (e) {} });
    }
  }

  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(blob);
    });
  }

  /* 내보내기용 @font-face (쓰인 글자만). → { css, failed }
     failed 면 받지 못한 글자가 있다는 뜻 — 그 글자는 컴퓨터에 있는 글꼴로 대신 그려지니 화면에서 알려 준다.
     화면처럼 Noto Serif KR 을 모든 글자의 대신 글꼴로 넣는다 (고른 글꼴에 없는 글자 · 기호가 화면과 같게 나오도록). */
  var FALLBACK = { id: 'Noto Serif KR', q: 'Noto+Serif+KR:wght@700', w: 700 };
  function embedCSS(value, chars, hanjaChars) {
    var r = resolve(value), parts = [];
    chars = chars || ''; hanjaChars = hanjaChars || '';
    if (r.custom) parts.push(Promise.resolve({ css: "@font-face{font-family:'" + r.family + "';src:url(" + r.custom.dataURL + ');}', failed: false }));
    else if (chars) parts.push(google(r.def, chars));
    if (hanjaChars) parts.push(google(HANJA, hanjaChars));
    if (chars) parts.push(google(FALLBACK, chars));
    return Promise.all(parts).then(function (a) {
      return { css: a.map(function (x) { return x.css; }).join('\n'), failed: a.some(function (x) { return x.failed; }) };
    });
  }

  function google(def, chars) {
    /* 띄어쓰기도 꼭 넣는다 — 빠지면 구글이 줄 높이 정보가 다른 글꼴 조각을 줘서 PNG 글자가 위아래로 밀린다 */
    var uniq = Array.from(new Set(Array.from(chars + ' '))).join('');
    var key = def.q + '|' + uniq;
    if (cssCache[key]) return Promise.resolve({ css: cssCache[key], failed: false });
    var url = 'https://fonts.googleapis.com/css2?family=' + def.q + '&text=' + encodeURIComponent(uniq) + '&display=block';
    return fetch(url).then(function (res) { if (!res.ok) throw new Error('font css ' + res.status); return res.text(); })
      .then(function (css) {
        var urls = [];
        css.replace(/url\((https:[^)]+)\)/g, function (m, u) { urls.push(u); return m; });
        if (!urls.length) throw new Error('font css empty');
        return Promise.all(urls.map(function (u) {
          return fetch(u).then(function (r) {
            if (!r.ok) throw new Error('font file ' + r.status);
            return r.blob();
          }).then(function (b) {
            if (b.type && !/font|octet-stream/.test(b.type)) throw new Error('font file type ' + b.type);
            return blobToDataURL(b);
          }).then(function (d) { return [u, d]; });
        })).then(function (pairs) {
          pairs.forEach(function (p) { css = css.split(p[0]).join(p[1]); });
          cssCache[key] = css;   /* 다 받은 것만 기억한다 */
          return { css: css, failed: false };
        });
      })
      .catch(function () { return { css: '', failed: true }; });
  }

  BJ.fonts = {
    LIST: LIST, HANJA: HANJA, custom: custom, find: find, resolve: resolve, stack: stack, measure: measure, ensure: ensure,
    addCustom: addCustom, removeCustom: removeCustom, embedCSS: embedCSS, blobToDataURL: blobToDataURL
  };
})();
