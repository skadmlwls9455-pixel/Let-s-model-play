/* mcp/i18n.js — 방의 언어 (ko · en · ja). 모델에게 가는 글 (안내문 · 도구 설명 · 상태 · 오류 · 엽서) 은 전부 여기서 나온다.
 *
 * 언어는 어디서 오나 (docs/I18N.md):
 *   1) 방을 만들 때 게임이 기기 언어를 보낸다 (POST /api/room {lang}) → meta.lang. 그 방은 늘 그 언어다.
 *   2) stdio (로컬) 는 PPOLPPOL_LANG.
 *   3) 둘 다 없으면 (옛 방) 모델이 look_room 의 lang 으로 한 번 정한다 — 대화의 언어. 그 뒤로는 상태 (S.lang) 에 남는다.
 * 문어가 남기는 글은 방의 언어로 쓰인다 — 사람이 게임 화면에서 그 언어로 읽기 때문이다 (안내문에 적는다).
 * 먼 바다 문 (FAR): 영어가 아닌 방 → 영어 위키, 영어 방 → 나머지 언어 전부 (주인 2026-11-10: 영어가 메인).
 * 사전은 언어마다 mcp/i18n/<lang>.js — 열쇠·함수 모양이 전부 같아야 한다 (시험). ko 글은 11-10 까지의 글과 글자 하나 다르지 않다. */
'use strict';
var LANGS = ['ko', 'en', 'ja', 'de', 'fr', 'es'];   /* 사전은 mcp/i18n/<lang>.js — 새 언어는 여기와 아래 require, FAR, core.SHELF_CATS, 게임의 출처 주소 검사 (app.js · brain.js) 에 더한다 */
/* 방의 언어 밖으로 나가는 문. 영어가 메인 (주인 2026-11-10): 영어가 아닌 방은 영어 위키 하나, 영어 방은 나머지 전부 */
var FAR = { ko: ['en'], ja: ['en'], de: ['en'], fr: ['en'], es: ['en'], en: ['ja', 'de', 'fr', 'es', 'ko'] };
var DEFAULT = 'en';   /* 기기 언어가 있는데 모르는 언어면 영어 방 (store.createRoom) */
/* 'ja-JP' → 'ja', 'en_US' → 'en', 모르는 것 → null */
function norm(x) { var s = String(x == null ? '' : x).trim().toLowerCase().split(/[-_]/)[0]; return LANGS.indexOf(s) >= 0 ? s : null; }

var S = { ko: require('./i18n/ko.js'), en: require('./i18n/en.js'), ja: require('./i18n/ja.js'), de: require('./i18n/de.js'), fr: require('./i18n/fr.js'), es: require('./i18n/es.js') };   /* 글자 그대로 require — Vercel 번들러가 따라올 수 있게 (동적 경로는 못 따라온다) */

/* T(lang) → 그 언어의 사전 (모르는 언어는 ko) */
function T(lang) { return S[norm(lang) || 'ko']; }

module.exports = { LANGS: LANGS, FAR: FAR, DEFAULT: DEFAULT, norm: norm, T: T, strings: S };
