"""
뽈뽈 문어 — 작은 상호작용 효과음 (리서치 04 §4 표의 UI·목소리·기웃·쓰다듬기·집에 있기 줄 + 발소리).

원칙(리서치 04 §0–§1.6)
- F장조. 음 있는 소리는 F 펜타토닉(F G A C D)만 쓴다(note() 가 검사한다).
- 부드럽게: 모든 층 어택 ≥2 ms, 마지막에 LPF ~7 kHz, 듀티 25~50%, 톱니·bitcrush 없음,
  3반음 넘는 피치 다이브 없음, 반음 부딪힘·트라이톤 없음.
- 실패도 벌하지 않는다: peek_* 다섯 상태는 리듬(0 ms·60 ms 두 번 발음)과 파일 길이가 모두 같고
  음색·음정만 다르다.
- 칩 맛은 파형에서 낸다(NES 32계단 삼각파, PolyBLEP 펄스, 15/7비트 LFSR 노이즈, 게임보이 웨이브 표).
  짧은 소리는 60 Hz 계단 엔벨로프가 지퍼 소리를 내므로 엔벨로프만 샘플 단위로 매끈하게 그린다.
- 4배 오버샘플(chip.OSR)로 파형을 그리고 48 kHz 로 내린 뒤 필터·믹스한다.

레벨: 표의 dB 열을 export.export(rel_db=...) 에 그대로 넣는다(BGM -20 LUFS 대비).

실행:  cd audio/src && python3 sfx.py            → ../sfx/*.ogg|.m4a + manifest.d/sfx.json
        python3 sfx.py peek ui_tap               → 이름에 들어간 것만 다시 굽기(매니페스트는 안 건드림)
"""
import math
import sys

import numpy as np
from scipy import signal

import chip
import export

SR = chip.SR
OS = chip.OS
OSR = chip.OSR

# ------------------------------------------------------------------
# 음 이름
# ------------------------------------------------------------------
_PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
PENTA = {5, 7, 9, 0, 2}          # F G A C D


def midi(name):
    """'F4' → 65, 'Bb5' → 82 (C4 = 60)."""
    if not isinstance(name, str):
        return int(name)
    letter, rest = name[0].upper(), name[1:]
    acc = 0
    if rest[:1] == 'b':
        acc, rest = -1, rest[1:]
    elif rest[:1] == '#':
        acc, rest = 1, rest[1:]
    return 12 * (int(rest) + 1) + _PC[letter] + acc


def n_of(ms, sr=SR):
    return int(round(ms * sr / 1000.0))


# ------------------------------------------------------------------
# 필터
# ------------------------------------------------------------------
def lowpass(y, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, 'lowpass', fs=SR, output='sos'), y)


def highpass(y, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, 'highpass', fs=SR, output='sos'), y)


def bandpass(y, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), y)


def svf_sweep(x, points, q=0.707, mode='lp'):
    """
    시간에 따라 컷오프가 움직이는 2극 상태변수 필터(TPT/Zavalishin).
    points: [(ms, Hz), ...] — 로그 주파수로 직선 보간.
    """
    t = np.arange(len(x)) * (1000.0 / SR)
    pt, pf = zip(*points)
    fc = np.exp(np.interp(t, pt, np.log(pf)))
    g = np.tan(np.pi * np.clip(fc, 20.0, 0.45 * SR) / SR)
    k = 1.0 / q
    a1 = 1.0 / (1.0 + g * (g + k))
    a2 = g * a1
    a3 = g * a2
    xs, A1, A2, A3 = x.tolist(), a1.tolist(), a2.tolist(), a3.tolist()
    out = [0.0] * len(xs)
    ic1 = ic2 = 0.0
    for i in range(len(xs)):
        v3 = xs[i] - ic2
        v1 = A1[i] * ic1 + A2[i] * v3
        v2 = ic2 + A2[i] * ic1 + A3[i] * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 'lp':
            out[i] = v2
        elif mode == 'bp':
            out[i] = k * v1
        else:
            out[i] = xs[i] - k * v1 - v2
    return np.asarray(out)


# ------------------------------------------------------------------
# 엔벨로프·오실레이터
# ------------------------------------------------------------------
def _env(n, sr, att, hold, dec, k=2.0, att_curve='lin', amp=None):
    """
    어택(att ms, 0→1) → 홀드(hold ms) → 디케이(dec ms 동안 (1-x)^k 로 0까지).
    k=1 은 sfxr 같은 직선, k=2~3 은 지수 감쇠에 가깝다. 끝이 정확히 0 이라 길이가 정해진다.
    att_curve='sin' 은 처음이 가파른 곡선(긴 어택에서도 앞 무음이 생기지 않게).
    amp: [(ms, gain)...] 추가 곱(음절 강약).
    """
    t = np.arange(n) * (1000.0 / sr)
    e = np.zeros(n)
    if att > 0:
        a = t < att
        x = t[a] / att
        e[a] = np.sin(0.5 * np.pi * x) if att_curve == 'sin' else x
    h = (t >= att) & (t < att + hold)
    e[h] = 1.0
    d = t >= att + hold
    if dec > 0:
        x = (t[d] - att - hold) / dec
        e[d] = np.clip(1.0 - x, 0.0, 1.0) ** k
    if amp:
        at, av = zip(*amp)
        e = e * np.interp(t, at, av)
    return e


def _blep(t, dt):
    y = np.zeros_like(t)
    a = t < dt
    x = t[a] / dt[a]
    y[a] = 2 * x - x * x - 1
    b = t > 1 - dt
    x = (t[b] - 1) / dt[b]
    y[b] = x * x + 2 * x + 1
    return y


def _osc(wave, f, duty=0.25, table='sine'):
    """f: OSR 샘플마다의 Hz. 음마다 위상 0 에서 시작(칩처럼)."""
    ph = np.cumsum(f / OSR)
    frac = ph - np.floor(ph)
    if wave == 'pulse':
        assert 0.25 <= duty <= 0.5, 'duty 25~50% 만'
        out = np.where(frac < duty, 1.0, -1.0)
        dt = np.minimum(f / OSR, 0.5)
        out = out + _blep(frac, dt) - _blep((frac - duty) % 1.0, dt)
        return out - (2 * duty - 1)
    if wave == 'tri':
        return chip.TRI_TABLE[(frac * 32).astype(np.int64) % 32]
    if wave == 'wave':
        tab = chip.WAVES[table]
        return tab[(frac * 32).astype(np.int64) % 32] - tab.mean()
    if wave == 'sine':
        return np.sin(2 * np.pi * frac)
    raise ValueError(wave)


def note(pitch, dur_ms, wave='tri', att=3.0, hold=0.0, dec=None, k=2.0, att_curve='lin', cents=0.0,
         bend=None, vib=None, duty=0.25, table='sine', lp=None, amp=None, allow=False):
    """
    음 하나 → 48 kHz 배열(길이 dur_ms).
    bend: [(ms, 반음)...] 직선 보간 피치 곡선. vib: (지연 ms, 깊이 반음, Hz).
    allow=False 면 F 펜타토닉 밖의 음을 막는다.
    """
    m = midi(pitch)
    if not allow and m % 12 not in PENTA:
        raise ValueError(f'{pitch} 는 F 펜타토닉 밖')
    if att < 2.0:
        raise ValueError('어택은 2 ms 이상')
    n = n_of(dur_ms, OSR)
    t = np.arange(n) * (1000.0 / OSR)
    semi = np.full(n, m + cents / 100.0)
    if bend:
        bt, bv = zip(*bend)
        semi = semi + np.interp(t, bt, bv)
    if vib:
        d, depth, rate = vib
        ramp = np.clip((t - d) / 80.0, 0, 1)
        semi = semi + depth * ramp * np.sin(2 * np.pi * rate * np.maximum(0, t - d) / 1000.0)
    f = 440.0 * 2.0 ** ((semi - 69.0) / 12.0)
    if dec is None:
        dec = max(1.0, dur_ms - att - hold)
    y = _osc(wave, f, duty, table) * _env(n, OSR, att, hold, dec, k, att_curve, amp)
    y = signal.resample_poly(y, 1, OS)
    if lp:
        y = lowpass(y, lp)
    return y


def nzb(dur_ms, att=2.0, hold=0.0, dec=None, k=2.0, att_curve='lin', clock=111860.0, short=False, f0=None,
        seed=0, bp=None, lp=None, hp=None, sweep=None, sweep_mode='lp', q=0.707):
    """
    LFSR 노이즈 한 덩이 → 48 kHz. 필터를 먼저(30 ms 미리 굴려 안정) 걸고, RMS 를 삼각파(피크 1)와
    같게 맞춘 뒤 엔벨로프를 곱한다 → db 인자가 '같은 엔벨로프의 삼각파 대비'가 된다.
    short=True 는 7비트(93걸음) 금속성 노이즈; f0 를 주면 그 반복 주기가 f0 Hz 가 되게 클럭을 정한다.
    """
    if att < 2.0:
        raise ValueError('어택은 2 ms 이상')
    pre = 30.0
    seq = chip.LFSR_SHORT if short else chip.LFSR_LONG
    if f0:
        clock = f0 * len(seq)
    n_os = n_of(dur_ms + pre, OSR)
    idx = (np.arange(n_os) * (clock / OSR)).astype(np.int64)
    x = seq[(idx + seed * 7919) % len(seq)]
    x = signal.resample_poly(x, 1, OS)
    if hp:
        x = highpass(x, hp)
    if bp:
        x = bandpass(x, *bp)
    if lp:
        x = lowpass(x, lp)
    if sweep:
        x = svf_sweep(x, [(0.0, sweep[0][1])] + [(t + pre, f) for t, f in sweep], q=q, mode=sweep_mode)
    x = x[n_of(pre):]
    n = n_of(dur_ms)
    x = x[:n]
    x = x / (np.sqrt(np.mean(x ** 2)) + 1e-12) / math.sqrt(3.0)
    if dec is None:
        dec = max(1.0, dur_ms - att - hold)
    return x * _env(len(x), SR, att, hold, dec, k, att_curve)


class Mix:
    """한 효과음의 층을 쌓고 마스터(HPF·LPF·작은 방 잔향·끝 페이드)해서 정확히 length_ms 로 자른다."""

    def __init__(self, length_ms, pad_ms=500):
        self.length_ms = length_ms
        self.y = np.zeros(n_of(length_ms + pad_ms))

    def add(self, sig, at_ms=0.0, db=0.0):
        s = n_of(at_ms)
        e = min(len(self.y), s + len(sig))
        self.y[s:e] += sig[:e - s] * 10 ** (db / 20.0)
        return self

    def render(self, lp=7000.0, hp=60.0, verb=0.0, ir_sec=0.45, fade_ms=4.0, echo=None):
        y = self.y
        if echo:                                   # (지연 ms, [탭 dB...], 탭 LPF Hz)
            d_ms, taps, elp = echo
            src = lowpass(y, elp) if elp else y
            out = y.copy()
            for i, db in enumerate(taps, 1):
                s = n_of(d_ms * i)
                out[s:] += src[:len(y) - s] * 10 ** (db / 20.0)
            y = out
        y = highpass(y, hp)
        if lp:
            y = lowpass(y, lp)
        if verb > 0:
            ir = chip.room_ir(ir_sec)[0]
            y = y + verb * signal.fftconvolve(y, ir)[:len(y)]
        n = n_of(self.length_ms)
        y = y[:n].copy()
        f = min(n, n_of(fade_ms))
        if f > 0:
            y[-f:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, f))
        return y


# ------------------------------------------------------------------
# 등록부
# ------------------------------------------------------------------
REG = []          # dict(id, fn, rel_db, spec_ms, meta)
SPEC_MS = {}      # id → 표의 길이(ms) — 검사용


def reg(sid, fn, rel_db, spec_ms, trigger, notes, group=None, duck_db=0, min_gap_ms=0):
    REG.append(dict(id=sid, fn=fn, rel_db=rel_db, spec_ms=spec_ms,
                    meta=dict(trigger=trigger, group=group or sid, duck_db=duck_db, min_gap_ms=min_gap_ms,
                              notes=notes)))
    SPEC_MS[sid] = spec_ms


# ==================================================================
# 1. UI
# ==================================================================
def ui_tap(p, c, seed):
    mx = Mix(30)
    mx.add(note(p, 30, 'tri', att=2, dec=26, k=2.2, cents=c))
    mx.add(nzb(4, att=2, dec=2, hp=4000, seed=seed), 0, db=-20)
    return mx.render(fade_ms=3)


for i, (p, c) in enumerate([('C6', -8), ('D6', 6), ('C6', 10), ('D6', -10)], 1):
    reg(f'ui_tap_{i}', lambda p=p, c=c, i=i: ui_tap(p, c, i), -12, 30,
        '일반 버튼 탭(주 버튼은 depart 가 대신함). 셔플백으로 직전 변형 피하기',
        f'TRI {p} {c:+d}c A2 D26 + NZ 클릭 4ms HPF4k -20dB', group='ui_tap', min_gap_ms=60)


def toggle(a, b, cents, split=35):
    mx = Mix(80)
    mx.add(note(a, split, 'tri', att=2, hold=split - 12, dec=10, k=1.5, cents=cents))
    mx.add(note(b, 80 - split, 'tri', att=2, hold=8, dec=80 - split - 10, k=1.8, cents=cents), split)
    return mx.render(verb=0.04)


for i, c in enumerate([0, 10], 1):
    reg(f'ui_toggle_on_{i}', lambda c=c: toggle('G5', 'C6', c), -12, 80, '토글 켬',
        f'TRI G5 35ms → C6 45ms (완전4도↑) {c:+d}c', group='ui_toggle_on', min_gap_ms=150)
for i, c in enumerate([0, -10], 1):
    reg(f'ui_toggle_off_{i}', lambda c=c: toggle('C6', 'G5', c), -13, 80,
        '토글 끔(부정이 아니라 열림). 1초 안 연타의 두 번째부터는 무음',
        f'TRI C6 35ms → G5 45ms (완전4도↓, toggle_on 뒤집기) {c:+d}c', group='ui_toggle_off', min_gap_ms=150)


def sheet_open(f0, f1, seed, cents, tail='A5'):
    mx = Mix(250)
    mx.add(nzb(170, att=40, dec=130, k=1.6, att_curve='sin', sweep=[(0, f0), (160, f1)], hp=250, seed=seed))
    mx.add(note(tail, 100, 'tri', att=2, hold=18, dec=80, k=2.6, cents=cents), 150, db=-3)
    return mx.render(verb=0.06)


for i, (f0, f1, s, c) in enumerate([(800, 3000, 3, 0), (880, 3300, 8, 8)], 1):
    reg(f'sheet_open_{i}', lambda f0=f0, f1=f1, s=s, c=c: sheet_open(f0, f1, s, c), -14, 250,
        '바텀시트 열기', f'NZ LPF {f0}→{f1}Hz 스윕 160ms(A40) "스윽" + TRI A5 20ms 꼬리 {c:+d}c',
        group='sheet_open', min_gap_ms=200)


def sheet_close(f0, f1, seed):
    mx = Mix(110)
    mx.add(nzb(110, att=4, dec=106, k=1.4, sweep=[(0, f0), (110, f1)], hp=250, seed=seed))
    return mx.render(verb=0.04)


for i, (f0, f1, s) in enumerate([(3000, 800, 4), (3300, 880, 9)], 1):
    reg(f'sheet_close_{i}', lambda f0=f0, f1=f1, s=s: sheet_close(f0, f1, s), -15, 110,
        '바텀시트 닫기(여는 소리보다 짧게)', f'NZ LPF {f0}→{f1}Hz 스윕 110ms, 음 없음',
        group='sheet_close', min_gap_ms=200)


def toast(a, b):
    mx = Mix(300)
    mx.add(note(a, 50, 'tri', att=2, hold=36, dec=12, k=1.5))
    mx.add(note(b, 250, 'tri', att=2, hold=10, dec=238, k=3.0), 50)
    return mx.render(verb=0.08)


for i, (a, b) in enumerate([('A5', 'D6'), ('G5', 'C6')], 1):
    reg(f'toast_{i}', lambda a=a, b=b: toast(a, b), -12, 300, '토스트가 뜰 때(자동 닫힘은 무음)',
        f'TRI {a} 50ms → {b} 250ms 지수 감쇠 "플링" (완전4도↑)', group='toast', min_gap_ms=500)


def log_line(p, c, seed):
    mx = Mix(20)
    mx.add(note(p, 18, 'tri', att=2, dec=16, k=2.0, cents=c))
    mx.add(nzb(4, att=2, dec=2, hp=2000, seed=seed), 0, db=-8)
    return mx.render(fade_ms=3)


for i, (p, c) in enumerate([('C6', -6), ('D6', 5), ('C6', 9), ('D6', -9)], 1):
    reg(f'log_line_{i}', lambda p=p, c=c, i=i: log_line(p, c, 20 + i), -16, 20,
        '로그 한 줄 추가(peek 가 아닌 줄). 로그 시트가 닫혀 있으면 무음',
        f'NZ 틱 4ms HPF2k + TRI {p} {c:+d}c 18ms', group='log_line', min_gap_ms=120)


def card_flip(seed, lo, hi, gap, cents):
    mx = Mix(120)
    mx.add(nzb(18, att=2, dec=16, k=1.8, bp=(lo, hi), seed=seed))
    mx.add(nzb(18, att=2, dec=16, k=1.8, bp=(lo, hi), seed=seed + 11), gap, db=-2)
    mx.add(note('F5', 60, 'tri', att=2, hold=16, dec=42, k=2.5, cents=cents), 60, db=-2)
    return mx.render(verb=0.05)


for i, (s, lo, hi, g, c) in enumerate([(5, 1500, 4000, 30, 0), (12, 1700, 4400, 28, 8)], 1):
    reg(f'card_flip_{i}', lambda s=s, lo=lo, hi=hi, g=g, c=c: card_flip(s, lo, hi, g, c), -14, 120,
        '포스터 카드 뒤집기', f'NZ BP {lo}~{hi}Hz 18ms 두 번({g}ms 간격) "팔락" + TRI F5 20ms {c:+d}c',
        group='card_flip', min_gap_ms=120)


def audio_on():
    mx = Mix(400)
    for j, p in enumerate(['F5', 'A5']):
        mx.add(note(p, 50, 'pulse', duty=0.25, att=3, hold=35, dec=12, k=1.5, lp=6000), 50 * j)
        mx.add(note(p, 50, 'tri', att=3, hold=35, dec=12, k=1.5), 50 * j, db=-6)
    mx.add(note('C6', 300, 'pulse', duty=0.25, att=3, hold=45, dec=252, k=2.6, lp=6000), 100)
    mx.add(note('C6', 300, 'tri', att=3, hold=45, dec=252, k=2.6), 100, db=-6)
    return mx.render(verb=0.10)


reg('audio_on', audio_on, -8, 400, '🔈 소리를 처음 켰을 때 "안녕"(처음엔 꺼진 상태로 시작)',
    'P25 F5·A5·C6 50ms씩 + C6 꼬리 250ms, TRI 유니즌 -6dB', min_gap_ms=1000)


def album_open():
    mx = Mix(250)
    mx.add(nzb(170, att=40, dec=130, k=1.6, att_curve='sin', sweep=[(0, 700), (160, 2600)], hp=250, seed=21))
    mx.add(note('F5', 40, 'tri', att=2, hold=12, dec=26, k=2.0), 130, db=-3)
    mx.add(note('A5', 80, 'tri', att=2, hold=14, dec=64, k=2.6), 170, db=-3)
    return mx.render(verb=0.08)


reg('album_open', album_open, -13, 250, '앨범·벽(포스터 모음) 보기 열기',
    'sheet_open 변형: NZ LPF 700→2600Hz 160ms + TRI F5(130ms)·A5(170ms) 두 음', min_gap_ms=200)


# ==================================================================
# 2. 목소리 블립 (표 V 음 집합의 합집합 × 모음 2계열)
# ==================================================================
VOICE_PITCHES = ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5']


def vowel_note(p, dur, vowel, **kw):
    if vowel == 'a':     # ㅏㅑ: 열린 소리
        return note(p, dur, 'pulse', duty=0.5, lp=2400, **kw)
    return note(p, dur, 'tri', lp=1200, **kw)    # ㅗㅛㅜㅠ: 둥근 "뽈"


def voice(p, vowel):
    mx = Mix(40)
    mx.add(vowel_note(p, 40, vowel, att=3, dec=35, k=1.6))
    return mx.render(hp=80, fade_ms=2)


for vw, desc in (('a', 'ㅏㅑ 열린 모음: P50 LPF 2.4k'), ('u', 'ㅗㅛㅜㅠ 둥근 모음: TRI LPF 1.2k')):
    for p in VOICE_PITCHES:
        reg(f'voice_{vw}_{p}', lambda p=p, vw=vw: voice(p, vw), -6, 40,
            '말풍선 음절마다 하나(공백·문장부호·"…" 는 무음). 음은 음절 해시로, 기분별 음 집합은 표 V. '
            '런타임 ±12c',
            f'{p} {desc}, A3 D35. 기분 집합: idle{{A4 C5 D5}} 폴짝{{C5 D5 F5 G5}} 우쭐{{C5 F5 A5}} '
            f'덤덤{{A4 C5}} 졸림{{F4 G4 A4}} 쓰다듬기{{D5 F5}}',
            group=f'voice_{vw}', min_gap_ms=50)


def curious(vowel, gap):
    mx = Mix(140)
    mx.add(vowel_note('A4', 40, vowel, att=3, dec=35, k=1.6))
    mx.add(vowel_note('D5', 140 - gap, vowel, att=3, hold=25, dec=140 - gap - 28, k=1.8,
                      bend=[(0, 0), (20, 0), (70, 0.2), (200, 0.2)]), gap)
    return mx.render(hp=80, verb=0.05)


for i, (vw, g) in enumerate([('u', 60), ('a', 65)], 1):
    reg(f'curious_{i}', lambda vw=vw, g=g: curious(vw, g), -8, 140, '바라보기, 창문 반응 "?"',
        f'목소리 블립({vw}) A4 → D5(완전4도↑, 둘째 블립 +20c ↗), 간격 {g}ms', group='curious', min_gap_ms=400)


# ==================================================================
# 3. 기웃(peek) — 다섯 상태 모두 0 ms·60 ms 발음(60+140 ms) + 같은 100 ms 꼬리 = 300 ms
# ==================================================================
PEEK_MS = 300


def _slot1(mx, p, wave, dur=60, at=0, **kw):
    mx.add(note(p, dur, wave, att=3, hold=dur - 13, dec=10, k=1.4, **kw), at)


def _slot2(mx, p, wave, **kw):
    mx.add(note(p, PEEK_MS - 60, wave, att=3, hold=60, dec=PEEK_MS - 60 - 63, k=2.4, **kw), 60)


def peek_read(first):
    mx = Mix(PEEK_MS)
    for p, at, d in first:
        _slot1(mx, p, 'pulse', dur=d, at=at, duty=0.25, lp=6000)
    _slot2(mx, 'F5', 'pulse', duty=0.25, lp=6000)
    mx.add(note('A5', 45, 'pulse', duty=0.25, att=3, hold=6, dec=36, k=2.0, lp=6000), 60, db=-15)
    return mx.render(verb=0.08)


PEEK_READ = [([('C5', 0, 60)], 'C5→F5'), ([('A4', 0, 30), ('C5', 30, 30)], 'A4·C5→F5'), ([('D5', 0, 60)], 'D5→F5')]
for i, (first, desc) in enumerate(PEEK_READ, 1):
    reg(f'peek_read_{i}', lambda first=first: peek_read(first), -4, PEEK_MS, '기웃: 문서를 읽었음(read)',
        f'기준 리듬 60+140ms. P25 {desc}, 둘째 음 시작에 P25 A5 반짝 -15dB. 상행 = 기쁨',
        group='peek_read', min_gap_ms=300)


def peek_builtin(page_at, seed, cents):
    mx = Mix(PEEK_MS)
    _slot1(mx, 'A4', 'tri', cents=cents)
    _slot2(mx, 'C5', 'tri', cents=cents)
    mx.add(nzb(40, att=8, hold=4, dec=28, k=1.6, bp=(2000, 4000), seed=seed), page_at, db=-8)
    return mx.render(verb=0.08)


for i, (at, s, c) in enumerate([(60, 31, 0), (0, 37, 8)], 1):
    reg(f'peek_builtin_{i}', lambda at=at, s=s, c=c: peek_builtin(at, s, c), -5, PEEK_MS,
        '기웃: 책장 메모(builtin)로 대신 읽음',
        f'같은 리듬. TRI A4→C5 {c:+d}c("나무") + NZ BP 2~4k 40ms "책장 넘김" @{at}ms',
        group='peek_builtin', min_gap_ms=300)


def peek_simulated(cents, lpf):
    mx = Mix(PEEK_MS)
    _slot1(mx, 'C5', 'pulse', duty=0.5, cents=cents, lp=lpf)
    mx.add(note('D5', 150, 'pulse', duty=0.5, att=3, hold=50, dec=97, k=2.2, cents=cents, lp=lpf), 60)
    return mx.render(verb=0.05, echo=(90, [-9, -18], 900))


for i, (c, f) in enumerate([(0, 1200), (7, 1050)], 1):
    reg(f'peek_simulated_{i}', lambda c=c, f=f: peek_simulated(c, f), -6, PEEK_MS,
        '기웃: 모의 방문(문 앞까지만, simulated)',
        f'같은 리듬. P50 LPF {f}Hz C5→D5(장2도 매달림) {c:+d}c + 에코 90ms -9/-18dB(LPF 900) "문 너머"',
        group='peek_simulated', min_gap_ms=300)


def peek_failed(wave, table, cents):
    mx = Mix(PEEK_MS)
    _slot1(mx, 'D5', wave, table=table, cents=cents)
    _slot2(mx, 'C5', wave, table=table, cents=cents)
    for at in (0, 60):      # 똑똑 노크를 두 발음에 맞춰 얹는다(리듬을 바꾸지 않으려고)
        mx.add(note('C4', 25, 'tri', att=2, hold=3, dec=20, k=2.5, bend=[(0, 0), (25, -0.7)]), at, db=-10)
    return mx.render(verb=0.08)


for i, (w, tb, c) in enumerate([('tri', 'sine', 0), ('wave', 'flute', 6)], 1):
    reg(f'peek_failed_{i}', lambda w=w, tb=tb, c=c: peek_failed(w, tb, c), -6, PEEK_MS,
        '기웃: 못 읽음(failed) — 오류가 아니라 "닫힌 문 두드림"',
        f'같은 리듬. {"TRI" if w == "tri" else "GB flute"} D5→C5(5도에 착지) {c:+d}c + 노크 TRI C4 25ms ×2 '
        f'(0·60ms) -10dB. 버즈·다이브 없음', group='peek_failed', min_gap_ms=300)


def peek_none(first):
    mx = Mix(PEEK_MS)
    mx.add(note(first, 60, 'tri', att=40, hold=0, dec=20, k=1.2))
    mx.add(note('F4', PEEK_MS - 60, 'tri', att=40, hold=60, dec=PEEK_MS - 60 - 100, k=2.0), 60)
    mx.add(nzb(200, att=60, hold=40, dec=100, k=1.5, att_curve='sin', lp=800, seed=5), 0, db=-20)
    return mx.render(verb=0.06)


for i, first in enumerate(['F4', 'C4'], 1):
    reg(f'peek_none_{i}', lambda first=first: peek_none(first), -8, PEEK_MS, '기웃: 앉아만 있음(none)',
        f'같은 리듬. TRI A40 {first}→F4 ({"동음 반복" if first == "F4" else "C4+F4 4도"}) + 숨결 NZ LPF800 -20dB',
        group='peek_none', min_gap_ms=300)


# ==================================================================
# 4. 쓰다듬기·창문·발소리
# ==================================================================
PET = ['D5', 'F5', 'G5', 'A5', 'C6']


def pet_stroke(p):
    mx = Mix(90)
    bend = [(0, 0), (90, 0.3)]
    mx.add(note(p, 90, 'tri', att=4, hold=20, dec=66, k=2.0, bend=bend))
    mx.add(note(p, 90, 'pulse', duty=0.5, att=4, hold=16, dec=70, k=2.4, bend=bend, lp=4000), 0, db=-12)
    return mx.render(verb=0.06)


for i, p in enumerate(PET, 1):
    reg(f'pet_stroke_{i}', lambda p=p: pet_stroke(p), -8, 90,
        f'쓰다듬기 {i}번째(D5 F5 G5 A5 C6 순서, C6에서 멈춤, 1.5초 쉬면 처음으로). 런타임 ±20c',
        f'TRI {p} + P50 -12dB, +30c ↗. 점수·콤보처럼 들리지 않게 5단에서 상한', group='pet_stroke',
        min_gap_ms=120)


def pet_happy(wave):
    mx = Mix(150)
    kw = dict(duty=0.25, lp=4000) if wave == 'pulse' else {}
    mx.add(note('D5', 82, wave, att=4, hold=50, dec=28, k=1.5,
                bend=[(0, 0), (8, 0), (30, 2.2), (55, 3.0), (82, 3.0)], **kw))
    mx.add(note('A5', 70, wave, att=3, hold=20, dec=47, k=2.2, **kw), 80)
    return mx.render(verb=0.07)


for i, w in enumerate(['pulse', 'tri'], 1):
    reg(f'pet_happy_{i}', lambda w=w: pet_happy(w), -6, 150, '안 씀 (11-15, 주인 C3 b: 기쁨 소리 없음) · 예전: 3번 넘게 쓰다듬은 뒤 기뻐함(10초에 한 번)',
        f'{"P25" if w == "pulse" else "TRI"} "뀨" D5↗F5 80ms + A5 60ms', group='pet_happy', min_gap_ms=10000)


def pet_squish():
    mx = Mix(140)
    mx.add(note('A4', 135, 'wave', table='sine', att=8, hold=40, dec=87, k=2.0,
                bend=[(0, 0), (50, -1.8), (105, -0.3), (135, 0)]))
    mx.add(nzb(80, att=10, hold=10, dec=60, k=1.8, sweep=[(0, 1400), (70, 600)], hp=200, seed=33), 0, db=-10)
    return mx.render(lp=4000, verb=0.06)


reg('pet_squish', pet_squish, -9, 140, '쓰다듬기를 시작할 때 몸이 폭 눌리는 소리(첫 pet_stroke 와 함께)',
    'GB sine A4 눌림 -1.8반음 → 되튐 + NZ LPF 1400→600 "푹". 다이브 2반음 미만', min_gap_ms=300)


def window_tap(p, c, seed):
    mx = Mix(80)
    mx.add(note(p, 72, 'tri', att=2, hold=6, dec=64, k=2.6, cents=c))
    mx.add(nzb(15, att=2, dec=13, k=2.0, short=True, f0=midi_hz_f5(), bp=(1800, 3400), seed=seed), 0, db=-6)
    return mx.render(verb=0.05)


def midi_hz_f5():
    return 440.0 * 2 ** ((midi('F5') - 69) / 12.0)


for i, (p, c) in enumerate([('A6', 0), ('G6', 0), ('A6', 12), ('G6', -12)], 1):
    reg(f'window_tap_{i}', lambda p=p, c=c, i=i: window_tap(p, c, i), -10, 80,
        '창문 두드리기(두 번 탭하면 "똑똑"). 비·가는 비면 80~200ms 뒤 처마 물방울 2~3개(amb 쪽)',
        f'TRI {p} {c:+d}c 70ms + NZm(7비트, F5 주기) BP 2.5k 15ms "똑" -6dB', group='window_tap',
        min_gap_ms=90)


STEPS = [('C5', 48), ('D5', 44), ('A4', 52), ('F5', 46)]


def step(p, d, seed):
    mx = Mix(d)
    mx.add(note(p, d, 'wave', table='sine', att=3, hold=6, dec=d - 9, k=2.2, bend=[(0, -1.5), (12, 0), (d, 0.1)]))
    mx.add(nzb(10, att=2, dec=8, k=2.0, lp=1500, hp=300, seed=seed), 0, db=-14)
    return mx.render(lp=3500, hp=90, verb=0.04, fade_ms=3)


for i, (p, d) in enumerate(STEPS, 1):
    reg(f'step_{i}', lambda p=p, d=d, i=i: step(p, d, 40 + i), -12, d,
        '문어 발소리 "뽈뽈" 종종걸음(걷는 애니메이션 프레임마다, 셔플)',
        f'GB sine {p} {d}ms, -1.5반음→0 빨판 "뽈" ↗ + 촉촉 NZ LPF1.5k 10ms -14dB, 전체 LPF 3.5k',
        group='step', min_gap_ms=60)


# ==================================================================
# 5. 집에 있기·빈 차례
# ==================================================================
DROPS = ['C6', 'D6', 'F6', 'G6']


def drop(p):
    mx = Mix(40)
    mx.add(note(p, 40, 'tri', att=2, hold=2, dec=36, k=2.0, bend=[(0, 0), (25, 0.4), (40, 0.4)]))
    return mx.render(fade_ms=3)


for i, p in enumerate(DROPS, 1):
    reg(f'stay_count_drops_{i}', lambda p=p: drop(p), -8, 40,
        f'창가에서 빗방울 세기 {i}번째(하나씩 위로, 400~600ms 간격)',
        f'TRI {p} 40ms, +40c ↗ 처프', group='stay_count_drops', min_gap_ms=400)


TIDY = [[(0, 'D5'), (160, 'G5'), (320, 'D5')],
        [(0, 'G5'), (110, 'G5'), (330, 'D5')],
        [(0, 'D5'), (220, 'D5'), (330, 'G5')]]


def tidy(hits, seed):
    mx = Mix(450)
    for j, (at, p) in enumerate(hits):
        mx.add(note(p, 40, 'tri', att=2, hold=8, dec=30, k=3.0, bend=[(0, 0.15), (10, 0)]), at,
               db=-1.5 if j == 1 else 0)
        mx.add(nzb(5, att=2, dec=3, bp=(1000, 3500), seed=seed + j), at, db=-8)
    # 짧은 방(0.12 s)만: 타 사이 틈을 잔향으로 채우면 export 의 active-RMS 가 틈까지 평균 내서 타가 커진다
    return mx.render(verb=0.06, ir_sec=0.12)


for i, hits in enumerate(TIDY, 1):
    reg(f'stay_tidy_{i}', lambda hits=hits, i=i: tidy(hits, 50 + 5 * i), -10, 450, '집에 있는 날: 정리하기',
        '나무 "딱" 3타: TRI D5(587Hz≈600)/G5(784Hz≈800) 10ms+꼬리 + NZ 클릭, 타이밍 '
        + '/'.join(f'{t}ms {p}' for t, p in hits), group='stay_tidy', min_gap_ms=500)


def hum(seq):
    """한 채널 허밍: 음 사이는 30 ms 포르타멘토, 음절마다 살짝 숨 고르기(진폭 골)."""
    base = midi(seq[0][0])
    for p, _ in seq:
        assert midi(p) % 12 in PENTA
    bend, amp, t = [], [(0, 1.0)], 0.0
    for j, (p, d) in enumerate(seq):
        off = midi(p) - base
        if j == 0:
            bend.append((0.0, off))
        else:
            bend.append((t + 15, off))
            amp += [(t - 30, 1.0), (t, 0.62), (t + 40, 1.0)]
        t += d
        bend.append((t - 15, off))
    total = t
    amp.append((total, 1.0))
    mx = Mix(total)
    mx.add(note(seq[0][0], total, 'tri', att=40, att_curve='sin', hold=total - 40 - 320, dec=320, k=1.6,
                bend=bend, vib=(220, 0.10, 5.0), amp=amp, lp=1200))
    return mx.render(verb=0.12, ir_sec=0.6, fade_ms=10)


HUMS = [[('A4', 300), ('C5', 300), ('D5', 300), ('C5', 300), ('A4', 400)],
        [('C5', 200), ('C5', 200), ('A4', 200), ('C5', 200), ('D5', 400), ('C5', 400)]]
for i, seq in enumerate(HUMS, 1):
    reg(f'stay_hum_{i}', lambda seq=seq: hum(seq), -10, 1600, '집에 있는 날: 창가에서 흥얼흥얼',
        '목소리 ㅜ 음색(TRI LPF 1.2k) 허밍, 포르타멘토 30ms, 늦은 비브라토 ±10c: '
        + ' '.join(f'{p}({d})' for p, d in seq)
        + (' — 테마 "뽈 뽈 다녀 와" 리듬(E→D)' if i == 2 else ''),
        group='stay_hum', duck_db=-2, min_gap_ms=4000)


def empty_turn(wave, table):
    mx = Mix(750)
    for at, db in ((0, 0), (350, -3), (700, -6)):
        mx.add(note('C5', 25, wave, table=table, att=3, hold=4, dec=18, k=2.0), at, db=db)
    # 잔향 없음: 틈이 -50 dB 아래여야 active-RMS 가 블립 세 개만 재서 표의 -16/-19/-22 가 지켜진다
    return mx.render(verb=0.0)


for i, (w, tb) in enumerate([('tri', 'sine'), ('wave', 'sine')], 1):
    reg(f'empty_turn_{i}', lambda w=w, tb=tb: empty_turn(w, tb), -16, 750,
        '빈 차례 "…"(50%는 아예 무음으로 두기)',
        f'{"TRI" if w == "tri" else "GB sine"} C5 25ms를 0/350/700ms에 0/-3/-6dB(표의 -16/-19/-22). 같은 음, 하강 없음',
        group='empty_turn', min_gap_ms=1000)


def lantern_prop_fade():
    mx = Mix(250)
    mx.add(note('A5', 250, 'tri', att=6, hold=20, dec=224, k=3.0))
    mx.add(note('A6', 70, 'pulse', duty=0.25, att=3, hold=5, dec=62, k=2.5, lp=6000), 0, db=-14)
    return mx.render(verb=0.10)


reg('lantern_prop_fade', lantern_prop_fade, -16, 250, '등불이 켜지고 200ms 뒤 소품이 나타날 때',
    'TRI A5(으뜸음 F의 장3도) 짧은 반짝 + P25 A6 -14dB', min_gap_ms=300)


def weather_shift():
    mx = Mix(400)
    mx.add(nzb(400, att=110, hold=60, dec=230, k=1.6, att_curve='sin', clock=55930,
               sweep=[(0, 900), (200, 2400), (400, 700)], q=0.9, hp=150, seed=9))
    return mx.render(verb=0.10)


reg('weather_shift', weather_shift, -18, 400, '날씨가 바뀔 때(8~12초 앰비언스 크로스페이드 시작과 함께)',
    '음 없음. NZ LPF 900→2400→700Hz 0.4s 열렸다 닫힘 "바뀌었다"', min_gap_ms=8000)


# ------------------------------------------------------------------
def build(filters=None):
    out = []
    for r in REG:
        if filters and not any(f in r['id'] for f in filters):
            continue
        y = r['fn']()
        out.append((r, y))
    return out


def main(argv):
    filters = argv[1:] or None
    entries = []
    for r, y in build(filters):
        e, _ = export.export(y, r['id'], 'sfx', rel_db=r['rel_db'], meta=r['meta'])
        entries.append(e)
        lv = e['level']
        print(f"{r['id']:<22} {e['duration'] * 1000:6.0f} ms  target {lv['target']:6.1f}  "
              f"measured {lv['measured']:6.1f} {lv['unit']}  peak {lv['peak_dbfs']:6.1f}")
    if filters:
        print('(부분 렌더 — manifest.d/sfx.json 은 그대로 둠)')
    else:
        export.save_manifest_part('sfx', entries)
        print(f'{len(entries)} 개 → manifest.d/sfx.json')


if __name__ == '__main__':
    main(sys.argv)
