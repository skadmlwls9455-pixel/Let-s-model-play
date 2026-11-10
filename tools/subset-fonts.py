#!/usr/bin/env python3
"""tools/subset-fonts.py — Galmuri 서브셋 글꼴(vendor/fonts/Galmuri*.sub.woff2)과 vendor/fonts/galmuri.css 를 만든다.

왜: Galmuri woff2 네 개가 1.38 MB 인데 화면에 쓰는 글자는 그중 일부다. 서브셋은 ~170 KB.

서브셋에 넣는 글자 (빌드할 때마다 다시 센다):
  - KS X 1001 한글 음절 2,350자 (EUC-KR 2바이트로 인코딩되는 음절)
  - ASCII U+0020–007E, 한글 호환 자모 U+3131–318E, 일반 구두점 U+2000–206F
  - js/*.js · css/*.css · index.html 에 나오는 모든 비ASCII 글자 (HTML 엔티티·JS \\uXXXX 이스케이프도 풀어서 센다)
  그중 원본 글꼴 cmap 에 있는 글자만 남는다 (이모지 등은 원래 Galmuri 에 없음).

galmuri.css 는 원본 면을 먼저, 서브셋 면을 뒤에 선언한다. 브라우저는 같은 family/weight 면 가운데 뒤에 선언한 면부터
보므로, 서브셋 cmap 에 있는 글자는 서브셋에서, 없는 글자(드문 음절 '똠' 등)는 원본에서 그린다 → 원본은 그런 글자가
화면에 나올 때만 내려받는다. 서브셋의 unicode-range 는 서브셋 파일의 cmap 그대로(정확히)다.
원본 면의 unicode-range 는 원본 cmap 그대로이되, 한자(CJK) 구역 안의 16자 이하 틈만 메운다(규칙 ~200조각).
기호·이모지 구역(☔ ♾ ❔ 등 Galmuri 에 없는 글자)은 틈을 메우지 않는다 — 그런 글자 하나 때문에 원본 160–500 KB 를
헛되이 받지 않게.

사용:
  python3 tools/subset-fonts.py           # 서브셋 + galmuri.css 다시 쓰기
  python3 tools/subset-fonts.py --check   # 지금 코드 글자가 서브셋에 다 있고 galmuri.css 가 최신인지 (아니면 exit 1)
필요: fontTools + brotli (pip install fonttools brotli). 없는 환경이면 PYTHONPATH 로 둘이 든 폴더를 가리킨다.
UI 문구에 새 글자를 넣었으면 다시 돌린다. 안 돌려도 깨지지는 않는다 (그 글자만 원본 파일에서 받아 그린다).
"""
import argparse
import glob
import html
import io
import logging
import os
import re
import sys

try:
    from fontTools import subset
    from fontTools.ttLib import TTFont
except ImportError:  # pragma: no cover
    sys.exit('subset-fonts: fontTools 가 없다. `pip install fonttools brotli` 또는 PYTHONPATH=<fontTools 폴더> 로 실행.')

# 원본 Galmuri11-Bold 의 fsSelection/macStyle 불일치 경고 — 원본 그대로 두므로 숨긴다
logging.getLogger('fontTools.ttLib.tables.O_S_2f_2').setLevel(logging.ERROR)

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
FONT_DIR = os.path.join(ROOT, 'vendor', 'fonts')
CSS_PATH = os.path.join(FONT_DIR, 'galmuri.css')

# (family, weight, 원본 파일 이름(확장자 없이)) — galmuri.css 선언 순서
FACES = [
    ('Galmuri11', 400, 'Galmuri11'),
    ('Galmuri11', 700, 'Galmuri11-Bold'),
    ('Galmuri9', 400, 'Galmuri9'),
    ('Galmuri7', 400, 'Galmuri7'),
]
FULL_RANGE_GAP = 16  # 원본 면 unicode-range: 한자 구역 안에서 cmap 사이 틈이 이 이하면 메운다 (규칙 수를 ~200개로)


def ksx1001_syllables():
    out = set()
    for cp in range(0xAC00, 0xD7A4):
        try:
            if len(chr(cp).encode('euc_kr')) == 2:  # 나머지 음절은 8바이트 조합 시퀀스로 인코딩된다
                out.add(cp)
        except UnicodeEncodeError:
            pass
    assert len(out) == 2350, len(out)
    return out


JS_ESC = re.compile(r'\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})')


def source_files():
    files = sorted(glob.glob(os.path.join(ROOT, 'js', '*.js')))
    files += sorted(glob.glob(os.path.join(ROOT, 'css', '*.css')))
    files.append(os.path.join(ROOT, 'index.html'))
    return files


def used_chars():
    """코드에 나오는 비ASCII 글자 (서로게이트 쌍은 JS 이스케이프로 쓴 경우 합쳐서)."""
    used = set()
    for path in source_files():
        with open(path, encoding='utf-8') as fh:
            text = fh.read()
        if path.endswith('.html'):
            text += '\n' + html.unescape(text)
        if path.endswith('.js'):
            esc = []
            for m in JS_ESC.finditer(text):
                esc.append(int(m.group(1) or m.group(2), 16))
            decoded = ''.join(chr(c) for c in esc).encode('utf-16', 'surrogatepass').decode('utf-16', 'replace')
            text += '\n' + decoded
        used |= {ord(c) for c in text if ord(c) > 0x7F and not 0xD800 <= ord(c) <= 0xDFFF}
    return used


def wanted_chars():
    base = set(range(0x20, 0x7F)) | set(range(0xA0, 0x180)) | set(range(0x3131, 0x318F)) | set(range(0x2000, 0x2070))   # 0xA0–0x17F: 라틴 보충·확장 A (독일어·프랑스어·스페인어 제목의 é ü ß ñ …)
    return base | ksx1001_syllables() | used_chars()


def to_ranges(cps, gap=0):
    ranges = []
    for cp in sorted(cps):
        if ranges and cp <= ranges[-1][1] + 1 + gap:
            ranges[-1][1] = cp
        else:
            ranges.append([cp, cp])
    return ranges


def is_cjk(cp):
    """틈을 메워도 되는 구역: 한자(확장 A·통합·호환). 여기 빠진 글자는 드문 한자라 원본을 받아 봐도 손해가 작다."""
    return 0x3400 <= cp <= 0x9FFF or 0xF900 <= cp <= 0xFAFF


def full_ranges(cmap):
    """원본 면 unicode-range: cmap 정확히 + 양끝과 틈 전체가 한자 구역인 FULL_RANGE_GAP 이하 틈만 메움."""
    ranges = []
    for cp in sorted(cmap):
        if ranges and (cp == ranges[-1][1] + 1 or (cp - ranges[-1][1] - 1 <= FULL_RANGE_GAP
                                                    and is_cjk(ranges[-1][1]) and is_cjk(cp))):
            ranges[-1][1] = cp
        else:
            ranges.append([cp, cp])
    return ranges


def unicode_range(ranges, indent='  '):
    parts = ['U+%X' % a if a == b else 'U+%X-%X' % (a, b) for a, b in ranges]
    lines, line = [], ''
    for p in parts:   # 쉼표 뒤 공백 없음: 서브셋 범위는 면마다 ~1,650조각이라 공백만 6 KB
        piece = (',' if line else '') + p
        if line and len(line) + len(piece) > 118:
            lines.append(line + ',')
            line = p
        else:
            line += piece
    lines.append(line)
    return ('\n' + indent).join(lines)


def build_subset(src, unicodes):
    font = TTFont(src, recalcTimestamp=False)  # head.modified 그대로 → 같은 입력이면 같은 바이트
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']      # 커닝·GSUB 그대로 → 원본과 같은 그림
    opts.name_IDs = ['*']             # 저작권·OFL 라이선스 이름 레코드 유지
    opts.name_languages = ['*']
    opts.name_legacy = True
    opts.notdef_outline = True
    opts.recalc_timestamp = False
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=sorted(unicodes))
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    return buf.getvalue()


CSS_HEAD = """/* Galmuri (갈무리) — Korean pixel fonts by quiple, SIL Open Font License 1.1 (see GALMURI-LICENSE.txt).
   Pixel grid (em size): Galmuri7 → 8px, Galmuri9 → 10px, Galmuri11 → 12px. Use integer multiples only — the UI uses 2×: 16/20/24px.
   GENERATED by tools/subset-fonts.py — do not edit by hand; rerun it after adding UI text with new characters.
   Order matters: the full faces come FIRST, the *.sub.woff2 subsets AFTER. For each character the browser takes the
   last-declared face whose unicode-range covers it, so everyday text comes from the ~40 KB subsets and the full file
   (~0.3–0.5 MB) is fetched only when a character outside the subset is shown (e.g. a rare syllable like '똠').
   Subset unicode-range = the subset's exact cmap. Full unicode-range = the full cmap, exact except that gaps of <= %d
   code points inside the CJK ideograph blocks are filled (keeps the rule short), so characters Galmuri does not have
   at all (emoji, symbols like U+2614) never trigger a full download.
   Subset contents: KS X 1001 Hangul (2,350), ASCII, compatibility jamo, U+2000-206F, every non-ASCII char in
   js/*.js, css/*.css, index.html. Sizes: %s */
"""


def face_rule(family, weight, filename, ranges):
    return ("@font-face { font-family: '%s'; src: url('%s') format('woff2'); font-weight: %d; font-display: swap;\n"
            "  unicode-range: %s; }\n") % (family, filename, weight, unicode_range(ranges))


def generate():
    wanted = wanted_chars()
    used = used_chars()
    full_rules, sub_rules, sizes, outputs, report = [], [], [], {}, []
    for family, weight, name in FACES:
        src = os.path.join(FONT_DIR, name + '.woff2')
        full_cmap = set(TTFont(src).getBestCmap())
        keep = wanted & full_cmap
        data = build_subset(src, keep)
        sub_name = name + '.sub.woff2'
        sub_cmap = set(TTFont(io.BytesIO(data)).getBestCmap())
        missing = sorted(c for c in keep if c not in sub_cmap)
        if missing:
            raise SystemExit('subset-fonts: %s 서브셋에서 빠진 글자: %s' % (name, ''.join(map(chr, missing))))
        outputs[os.path.join(FONT_DIR, sub_name)] = data
        full_rules.append(face_rule(family, weight, name + '.woff2', full_ranges(full_cmap)))
        sub_rules.append(face_rule(family, weight, sub_name, to_ranges(sub_cmap)))
        sizes.append('%s %d→%d KB' % (name, os.path.getsize(src) // 1024, len(data) // 1024))
        not_in_font = sorted(c for c in used if c not in full_cmap)
        fr = full_ranges(full_cmap)
        wasted = [c for c in not_in_font if any(a <= c <= b for a, b in fr)]
        if wasted:  # 코드에 쓴 글자가 원본에 없는데 원본 범위 안 → 그 글자를 그릴 때 원본을 헛되이 받는다
            raise SystemExit('subset-fonts: %s 원본 범위가 원본에 없는 글자를 덮음: %s' % (name, ''.join(map(chr, wasted))))
        report.append('%-15s full %4d KB %5d chars (%3d range parts) → sub %3d KB %4d chars (%4d parts) · code chars not in font: %d'
                      % (name, os.path.getsize(src) // 1024, len(full_cmap), len(fr), len(data) // 1024, len(sub_cmap),
                         len(to_ranges(sub_cmap)), len(not_in_font)))
    css = (CSS_HEAD % (FULL_RANGE_GAP, ', '.join(sizes) + '.')
           + '\n/* full faces (fallback for characters outside the subset) */\n' + ''.join(full_rules)
           + '\n/* subsets — must stay AFTER the full faces */\n' + ''.join(sub_rules))
    outputs[CSS_PATH] = css.encode('utf-8')
    return outputs, report, wanted, used


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--check', action='store_true', help='파일을 쓰지 않고 최신인지만 확인 (다르면 exit 1)')
    args = ap.parse_args()
    outputs, report, wanted, used = generate()
    print('wanted %d code points (code uses %d non-ASCII chars)' % (len(wanted), len(used)))
    for line in report:
        print('  ' + line)
    stale = []
    for path, data in outputs.items():
        old = open(path, 'rb').read() if os.path.exists(path) else None
        if old != data:
            stale.append(os.path.relpath(path, ROOT))
            if not args.check:
                with open(path, 'wb') as fh:
                    fh.write(data)
    total = sum(len(d) for p, d in outputs.items() if p.endswith('.woff2'))
    print('subsets total %d KB' % (total // 1024))
    if args.check:
        print('stale: ' + (', '.join(stale) if stale else 'none'))
        sys.exit(1 if stale else 0)
    print('wrote: ' + (', '.join(stale) if stale else 'nothing (already up to date)'))


if __name__ == '__main__':
    main()
