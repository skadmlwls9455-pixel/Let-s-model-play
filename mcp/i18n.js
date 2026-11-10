/* mcp/i18n.js — 방의 언어 (ko · en · ja · de · fr · es · it · pt · id · hi — claude.ai 가 지원하는 화면 언어 전부). 모델에게 가는 글 (안내문 · 도구 설명 · 상태 · 오류 · 엽서) 은 전부 여기서 나온다.
 *
 * 언어는 어디서 오나 (docs/I18N.md):
 *   1) 사람이 정해 둔 것: 게임 설정 (api/lang → meta.lang + pin) · stdio 의 PPOLPPOL_LANG. 모델이 바꾸지 못한다.
 *   2) 아니면 대화의 언어: 모델이 look_room 의 lang 으로 알려 준다 (S.lang). 바뀌면 방도 바뀐다 — 클로드 사용자의 언어 설정을 따라가는 길 (주인 2026-11-10 밤).
 *   3) 아직 아무도 말하지 않았으면 방을 만들 때의 기기 언어 (meta.lang, 모르는 언어면 DEFAULT), 그것도 없으면 ko.
 * 문어가 남기는 글은 방의 언어로 쓰인다 — 사람이 게임 화면에서 그 언어로 읽기 때문이다 (안내문에 적는다).
 * 먼 바다 문 (FAR): 어느 방이든 나머지 다섯 언어의 위키 전부 — 양이 같다 (주인: "각 양은 똑같이", 언어로 거절하지 않는다).
 * 사전은 언어마다 mcp/i18n/<lang>.js — 열쇠·함수 모양이 전부 같아야 한다 (시험). ko 글은 11-10 까지의 글과 글자 하나 다르지 않다. */
'use strict';
var LANGS = ['ko', 'en', 'ja', 'de', 'fr', 'es', 'it', 'pt', 'id', 'hi'];   /* claude.ai 화면 언어 전부 (2026-11: 영어·프랑스어·독일어·힌디어·인도네시아어·이탈리아어·일본어·한국어·브라질 포르투갈어·스페인어 둘) */   /* 사전은 mcp/i18n/<lang>.js — 새 언어는 여기와 아래 require, FAR, core.SHELF_CATS, 게임의 출처 주소 검사 (app.js · brain.js) 에 더한다 */
/* 먼 바다 문 너머: 방의 언어 밖의 다섯 위키 전부 — 어느 방이든 양이 같다 (주인 2026-11-10 밤: "각 양은 똑같이", 언어로 거절하지 않는다) */
var FAR = {}; LANGS.forEach(function (l) { FAR[l] = LANGS.filter(function (x) { return x !== l; }); });
var DEFAULT = 'en';   /* 기기 언어가 있는데 모르는 언어면 영어 방 (store.createRoom) */
/* 'ja-JP' → 'ja', 'en_US' → 'en', 모르는 것 → null */
function norm(x) { var s = String(x == null ? '' : x).trim().toLowerCase().split(/[-_]/)[0]; return LANGS.indexOf(s) >= 0 ? s : null; }

var S = { ko: require('./i18n/ko.js'), en: require('./i18n/en.js'), ja: require('./i18n/ja.js'), de: require('./i18n/de.js'), fr: require('./i18n/fr.js'), es: require('./i18n/es.js'), it: require('./i18n/it.js'), pt: require('./i18n/pt.js'), id: require('./i18n/id.js'), hi: require('./i18n/hi.js') };   /* 글자 그대로 require — Vercel 번들러가 따라올 수 있게 (동적 경로는 못 따라온다) */

/* T(lang) → 그 언어의 사전 (모르는 언어는 ko) */
function T(lang) { return S[norm(lang) || 'ko']; }

module.exports = { LANGS: LANGS, FAR: FAR, DEFAULT: DEFAULT, norm: norm, T: T, strings: S };
