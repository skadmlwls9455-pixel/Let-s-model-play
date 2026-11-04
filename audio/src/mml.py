"""
작은 MML(Music Macro Language) 파서 → chip.Note 목록.

문법(대소문자 구분 없음, 공백 무시):
  c d e f g a b   음. 뒤에 + 또는 # = 올림, - = 내림. 길이(1 2 4 8 16 32, 점 .) 생략 시 l 값.
  r               쉼표 (길이 동일)
  ^ 또는 &        붙임줄: 앞 음 길이에 더한다 (예: c4^8)
  o5              옥타브 지정 (o4 의 c = 가운데 도 = MIDI 60)
  > <             옥타브 올림 / 내림
  l8              기본 길이
  v12             세기 0~15
  q7              게이트 n/8 (스타카토 정도)
  @name           악기 바꾸기 (chip.PRESETS 이름)
  [ ... ]3        반복
  |               마디선. bar= 를 주면 길이 검사(틀리면 예외)
  ;               주석 시작(줄 끝까지)
"""
import re
from chip import Note

_NOTE = {'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11}


def _strip_comments(s):
    return '\n'.join(line.split(';', 1)[0] for line in s.splitlines())


def _expand_loops(s):
    pat = re.compile(r'\[([^\[\]]*)\](\d*)')
    while True:
        m = pat.search(s)
        if not m:
            return s
        body, n = m.group(1), int(m.group(2) or 2)
        s = s[:m.start()] + (' ' + body + ' ') * n + s[m.end():]


def parse(text, inst='lead', octave=4, length=4, vel=12, gate=7, start=0.0, bar=None, transpose=0, name='?'):
    """반환: (notes, end_beat)"""
    s = _expand_loops(_strip_comments(text)).lower()
    i = 0
    t = float(start)
    notes = []
    o = octave
    deflen = length
    v = vel
    q = gate
    cur_inst = inst
    last = None
    bar_start = t
    nbar = 0

    def read_num():
        nonlocal i
        m = re.match(r'\d+', s[i:])
        if not m:
            return None
        i += len(m.group(0))
        return int(m.group(0))

    def read_len():
        nonlocal i
        n = read_num()
        L = 4.0 / (n if n else deflen)
        dot = L
        while i < len(s) and s[i] == '.':
            dot /= 2
            L += dot
            i += 1
        return L

    while i < len(s):
        c = s[i]
        if c.isspace():
            i += 1
            continue
        if c == '|':
            i += 1
            nbar += 1
            if bar is not None:
                exp = start + nbar * bar
                if abs(t - exp) > 1e-6:
                    raise ValueError(f'[{name}] 마디 {nbar} 길이 틀림: {t - (exp - bar):.3f}박 (기대 {bar})')
            continue
        if c in _NOTE:
            i += 1
            pc = _NOTE[c]
            while i < len(s) and s[i] in '+#-':
                pc += 1 if s[i] in '+#' else -1
                i += 1
            L = read_len()
            midi = 12 * (o + 1) + pc + transpose
            last = Note(t, L, midi, v, cur_inst, q / 8.0)
            notes.append(last)
            t += L
            continue
        if c == 'r':
            i += 1
            L = read_len()
            t += L
            last = None
            continue
        if c in '^&':
            i += 1
            L = read_len()
            if last is not None:
                last.dur += L
            t += L
            continue
        if c == 'o':
            i += 1
            o = read_num()
            continue
        if c == '>':
            i += 1
            o += 1
            continue
        if c == '<':
            i += 1
            o -= 1
            continue
        if c == 'l':
            i += 1
            deflen = read_num()
            continue
        if c == 'v':
            i += 1
            v = read_num()
            continue
        if c == 'q':
            i += 1
            q = read_num()
            continue
        if c == '@':
            m = re.match(r'@([a-z0-9_]+)', s[i:])
            cur_inst = m.group(1)
            i += len(m.group(0))
            continue
        raise ValueError(f'[{name}] 알 수 없는 MML 문자 {c!r} at {i}: ...{s[max(0, i - 15):i + 15]}...')
    return notes, t
