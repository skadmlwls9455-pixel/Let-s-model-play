"""
뽈뽈 앰비언스 — 날씨·밤 베드 루프 10개 + 무박 레이어 4개.
리서치 04 §3(날씨·밤 앰비언스 표)와 02 §4.3(무박 F 펜타 레이어)의 숫자를 그대로 옮겼다.

실행
  cd audio/src && python3 ambience.py                 → audio/amb/*.ogg|*.m4a + manifest.d/amb.json
  python3 ambience.py --dump DIR                      → (검수용) 레벨 맞춘 배열 .npy + 스펙트로그램 PNG 도 DIR 에
  python3 ambience.py --only amb_rain,layer_drips     → 일부만 (매니페스트는 쓰지 않음)

원칙
- 모노 48 kHz (export 가 모노로 내보낸다 → 리서치의 '스테레오·팬 ±0.6' 은 접었다).
- 루프 몸통 = 정확히 L 초. 모든 처리를 '원형(circular)'으로 한다 → 끝→처음이 신호 안의 보통 이웃 샘플과 같다.
    · 노이즈 필터는 몸통을 두세 번 이어 붙여 거른 뒤 마지막 바퀴만 쓴다(필터 상태가 '한 바퀴 뒤'와 같아진다)
    · 느린 흔들림(LFO)은 1/L 의 정수배 주파수만 써서 L 마다 정확히 되풀이된다
    · 사건(물방울·처프·딱딱)의 꼬리가 L 을 넘으면 앞으로 감는다(mod L). 잔향은 원형 합성곱
  그 뒤 앞 여유 0.5 s(몸통 끝 복사) + 뒤 여유 1.0 s(몸통 앞 복사)를 붙이고 loop=(0.5, 0.5+L) 로 내보낸다.
- 음이 있는 것은 모두 F 펜타토닉(F G A C D) 음에만 선다(nm() 이 검사). 빗방울 처프도 음계 음 → 음계 음으로 미끄러진다.
- 시드 고정 numpy Generator → 몇 번을 돌려도 같은 파일.
- 부드럽게: 노이즈 베드 LPF ≤ 8 kHz(대부분 2~6 kHz), 작은 반짝이만 8.5 kHz. 귀뚜라미는 4.5 kHz 대신 F7/G7 + LPF 5 kHz.
- 칩 맛: 노이즈 원천은 NES 15비트 LFSR(긴 모드), 썰매방울만 7비트 숏모드. 음은 NES 삼각 32계단·PolyBLEP 펄스·GB 웨이브 표.
  엔벨로프는 프레임 계단 대신 매끈하게(앰비언스는 틱이 없어야 한다).
"""
import argparse
import json
import math
import os

import numpy as np
from scipy import signal

import chip
import export
import render as R

SR = chip.SR
OS = chip.OS
OSR = chip.OSR
LEAD_IN = 0.5
LEAD_OUT = 1.0
REF = 0.1                       # 내부 균형용 0 dB 기준 RMS (최종 크기는 export 가 rel_db 로 맞춘다)

PENTA_PC = (5, 7, 9, 0, 2)      # F G A C D
_PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def nm(name):
    """'C6' → MIDI 84. F 펜타토닉 밖이면 오류(앰비언스 음정 규칙)."""
    m = 12 * (int(name[1:]) + 1) + _PC[name[0]]
    assert m % 12 in PENTA_PC, name
    return m


def hz(midi):
    return 440.0 * 2.0 ** ((np.asarray(midi, dtype=np.float64) - 69.0) / 12.0)


def db2a(db):
    return 10.0 ** (np.asarray(db, dtype=np.float64) / 20.0)


def rms(x):
    return float(np.sqrt(np.mean(np.square(x))) + 1e-20)


def set_rms(x, db=0.0):
    return x * (REF * db2a(db) / rms(x))


def ev_rms(ev):
    """사건 하나의 '소리 나는 동안' RMS (2 ms 평균 포락선이 최대의 −20 dB 이상인 구간)."""
    a = np.abs(ev)
    k = max(1, int(0.002 * SR))
    sm = np.convolve(a, np.ones(k) / k, mode='same')
    m = sm > 0.1 * sm.max()
    return float(np.sqrt(np.mean(ev[m] ** 2)) + 1e-20)


def at_db(ev, db):
    return ev * (REF * db2a(db) / ev_rms(ev))


def mixpad(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[:len(p)] += p
    return out


# ------------------------------------------------------------------
# 원형(루프) 처리
# ------------------------------------------------------------------
def circ_sos(sos, x, reps=2):
    """주기 신호의 정상상태 필터 출력: 여러 바퀴 이어 거른 뒤 마지막 바퀴."""
    return signal.sosfilt(sos, np.tile(x, reps))[-len(x):]


def circ_ba(b, a, x, reps=2):
    return signal.lfilter(b, a, np.tile(x, reps))[-len(x):]


def circ_conv(x, h):
    N = len(x)
    hh = np.zeros(N)
    for i in range(0, len(h), N):
        seg = h[i:i + N]
        hh[:len(seg)] += seg
    return np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(hh), N)


def verb(x, wet, sec=0.9, damp=4500.0, pre=0.012, seed=7):
    """다락방 잔향(chip.room_ir) — 원형 합성곱이라 꼬리가 루프 처음으로 이어진다."""
    ir = chip.room_ir(sec, pre, damp, seed)[0]
    return x + wet * circ_conv(x, ir)


def lp(fc, order=2):
    return signal.butter(order, fc, 'lowpass', fs=SR, output='sos')


def hp(fc, order=2):
    return signal.butter(order, fc, 'highpass', fs=SR, output='sos')


def bpq(fc, q):
    """중심 fc, Q 인 2차 밴드패스(중심 이득 0 dB)."""
    b, a = signal.iirpeak(float(fc), q, fs=SR)
    return signal.tf2sos(b, a)


def finish(x, lpf=8000.0, hpf=30.0):
    x = circ_sos(hp(hpf), x)
    if lpf:
        x = circ_sos(lp(lpf, 2), x)
    return x


class Bus:
    """길이 N(=L 초)의 원형 버퍼. add() 는 꼬리를 앞으로 감는다."""

    def __init__(self, L):
        self.L = float(L)
        self.N = int(round(L * SR))
        self.x = np.zeros(self.N)

    def add(self, ev, t):
        ev = np.asarray(ev, dtype=np.float64)
        s = int(round(t * SR)) % self.N
        i = 0
        while i < len(ev):
            k = min(self.N - s, len(ev) - i)
            self.x[s:s + k] += ev[i:i + k]
            i += k
            s = 0


def plfo(rng, N, L, f_lo, f_hi):
    """주기 L 의 부드러운 무작위 곡선(평균 0, 표준편차 1): f_lo~f_hi 근처의 1/L 정수배 성분만 섞는다."""
    t = np.arange(N) / SR
    k0 = max(1, int(round(f_lo * L)))
    k1 = max(k0, int(round(f_hi * L)))
    y = np.zeros(N)
    for k in range(k0, k1 + 1):
        y += rng.standard_normal() * np.cos(2 * np.pi * k * t / L + rng.uniform(0, 2 * np.pi))
    y -= y.mean()
    return y / (y.std() + 1e-12)


def bump(t, tc, rise, fall, L):
    """원형 시간축 위의 둥근 언덕(올라감 rise 초, 내려감 fall 초)."""
    d = (t - tc + L / 2) % L - L / 2
    y = np.zeros_like(t)
    m1 = (d >= -rise) & (d < 0)
    y[m1] = 0.5 - 0.5 * np.cos(np.pi * (d[m1] + rise) / rise)
    m2 = (d >= 0) & (d <= fall)
    y[m2] = 0.5 + 0.5 * np.cos(np.pi * d[m2] / fall)
    return y


def cdist(a, b, L):
    d = abs(a - b) % L
    return min(d, L - d)


# ------------------------------------------------------------------
# 시각 뿌리기
# ------------------------------------------------------------------
def spaced(rng, L, lo, hi):
    """원형으로 고르게 흩은 시각: 이웃 간격(끝→처음 포함)이 모두 lo~hi 초 → 루프 이음매에서도 간격 규칙이 지켜진다."""
    n_min = int(math.ceil(L / hi))
    n_max = int(math.floor(L / lo))
    n = int(np.clip(round(L / ((lo + hi) / 2)), n_min, n_max))
    g = None
    for _ in range(5000):
        g = rng.uniform(lo, hi, n)
        g *= L / g.sum()
        if g.min() >= lo - 1e-9 and g.max() <= hi + 1e-9:
            break
    t0 = rng.uniform(0, L)
    return np.sort((t0 + np.concatenate([[0.0], np.cumsum(g[:-1])])) % L)


def poisson(rng, L, rate, ctrl=None):
    """원형 포아송(기억 없음 → 이음매가 따로 없다). ctrl(SR 배열)이 있으면 rate·ctrl 로 솎는다."""
    if ctrl is None:
        return np.sort(rng.uniform(0, L, rng.poisson(rate * L)))
    cmax = float(ctrl.max())
    n = rng.poisson(rate * cmax * L)
    t = np.sort(rng.uniform(0, L, n))
    keep = rng.uniform(0, cmax, n) < ctrl[np.minimum((t * SR).astype(np.int64), len(ctrl) - 1)]
    return t[keep]


class Bag:
    """셔플백: 같은 음이 두 번 연속 나오지 않게(리서치 04 §1.4)."""

    def __init__(self, rng, items, weights=None):
        self.rng = rng
        self.items = list(items)
        self.w = np.asarray(weights if weights is not None else [1.0] * len(self.items), dtype=np.float64)
        self.last = None

    def __call__(self):
        w = self.w.copy()
        if self.last is not None and len(self.items) > 1:
            w[self.items.index(self.last)] = 0.0
        i = int(self.rng.choice(len(self.items), p=w / w.sum()))
        self.last = self.items[i]
        return self.last


# ------------------------------------------------------------------
# 칩 노이즈
# ------------------------------------------------------------------
NES_CLK = chip.CPU_HZ / np.asarray(chip.NOISE_PERIODS, dtype=np.float64)
PINK_B = [0.049922035, -0.095993537, 0.050612699, -0.004408786]   # Kellet 3극 핑크 필터
PINK_A = [1.0, -2.494956002, 2.017265875, -0.522189400]


def nes_noise(rng, N, idx=4):
    """NES 15비트 LFSR(긴 모드) 1비트 노이즈를 주기 인덱스 idx 의 클럭으로 샘플-홀드.
    32767 주기(최고 클럭에서 73 ms)가 '웅웅' 무늬로 들리지 않게, 256~2047비트마다 수열의 무작위 위치로 건너뛴다."""
    step = NES_CLK[idx] / SR
    nbits = int(math.ceil(N * step)) + 2
    seq = chip.LFSR_LONG
    out = np.empty(nbits)
    pos = 0
    while pos < nbits:
        k = min(int(rng.integers(256, 2048)), nbits - pos)
        off = int(rng.integers(0, len(seq)))
        out[pos:pos + k] = seq[(off + np.arange(k)) % len(seq)]
        pos += k
    return out[np.floor(np.arange(N) * step).astype(np.int64)]


def pink(rng, N, idx=4):
    return circ_ba(PINK_B, PINK_A, nes_noise(rng, N, idx), reps=3)


def brown(rng, N, idx=4):
    y = circ_ba([1.0], [1.0, -0.997], nes_noise(rng, N, idx), reps=3)
    return circ_sos(hp(20), y)


# ------------------------------------------------------------------
# 음 하나 (칩 파형, 매끈한 엔벨로프)
# ------------------------------------------------------------------
def _blep(t, dt):
    y = np.zeros_like(t)
    a = t < dt
    x = t[a] / dt[a]
    y[a] = 2 * x - x * x - 1
    b = t > 1 - dt
    x = (t[b] - 1) / dt[b]
    y[b] = x * x + 2 * x + 1
    return y


def osc_os(wave, f, duty=0.125, table='sine'):
    """OSR(4배) 위상 누적 발진기: 'sine' | 'tri'(NES 32계단) | 'wave'(GB 표) | 'pulse'(PolyBLEP)"""
    ph = np.cumsum(f / OSR)
    frac = ph - np.floor(ph)
    if wave == 'sine':
        return np.sin(2 * np.pi * frac)
    if wave == 'tri':
        return chip.TRI_TABLE[(frac * 32).astype(np.int64) % 32]
    if wave == 'wave':
        tab = chip.WAVES[table]
        return tab[(frac * 32).astype(np.int64) % 32] - tab.mean()
    if wave == 'pulse':
        dt = np.minimum(f / OSR, 0.5)
        y = np.where(frac < duty, 1.0, -1.0)
        return y + _blep(frac, dt) - _blep((frac - duty) % 1.0, dt) - (2 * duty - 1)
    raise ValueError(wave)


def env_shape(n, sr, att, hold=0.0, tau=None, dec=None):
    """어택 raised-cosine → (hold) → 지수 감쇠(tau) 또는 raised-cosine 하강(dec). 끝 5 ms 페이드."""
    t = np.arange(n) / sr
    e = np.ones(n)
    if att > 0:
        a = t < att
        e[a] = 0.5 - 0.5 * np.cos(np.pi * t[a] / att)
    d = t - att - hold
    m = d > 0
    if dec is not None:
        e[m] = np.where(d[m] < dec, 0.5 + 0.5 * np.cos(np.pi * d[m] / dec), 0.0)
    elif tau is not None:
        e[m] = np.exp(-d[m] / tau)
    nf = min(n // 4, int(0.005 * sr))
    if nf > 0:
        e[-nf:] *= np.linspace(1, 0, nf)
    return e


def tone(midi, wave='tri', att=0.003, tau=0.1, hold=0.0, dec=None, dur=None, glide=0.0, glide_t=0.012,
         cents=0.0, duty=0.125, table='sine', vib=0.0, vib_hz=5.0):
    """칩 파형 한 음을 OSR 로 그린 뒤 48 kHz 로. glide = 시작 반음 오프셋(지수로 0 에 닿음)."""
    if dur is None:
        dur = att + hold + (dec if dec is not None else 6.9 * tau) + 0.01
    n = int(round(dur * OSR))
    t = np.arange(n) / OSR
    semi = np.full(n, midi + cents / 100.0)
    if glide:
        semi += glide * np.exp(-t / glide_t)
    if vib:
        semi += vib * np.sin(2 * np.pi * vib_hz * t) * np.clip(t / 0.2, 0, 1)
    y = osc_os(wave, hz(semi), duty, table) * env_shape(n, OSR, att, hold, tau, dec)
    return signal.resample_poly(y, 1, OS)


# 앰비언스 전용 음색(공유 instruments 와 겹치지 않게 amb_ 접두)
AMB = {
    'amb_eave':        dict(wave='tri', att=0.003, tau=0.075, glide=-0.6, glide_t=0.012),   # 처마 '똑' (NES 삼각)
    'amb_eave_gb':     dict(wave='wave', table='sine', att=0.003, tau=0.06, glide=-0.6, glide_t=0.012),
    'amb_roof':        dict(wave='tri', att=0.0006, tau=0.0028),                            # 지붕 톡 8 ms
    'amb_snowbell':    dict(wave='wave', table='bell', att=0.002, tau=0.42),
    'amb_bellhi':      dict(wave='sine', att=0.002, tau=0.12),                              # 옥타브 위 배음
    'amb_spark':       dict(wave='pulse', duty=0.125, att=0.003, tau=0.11),                 # P12 반짝
    'amb_spark_swell': dict(wave='pulse', duty=0.125, att=0.25, dec=0.4),                   # 느린 어택(반딧불)
    'amb_chime':       dict(wave='wave', table='sine', att=0.003, tau=0.8),
    'amb_chime_b':     dict(wave='wave', table='bell', att=0.003, tau=0.45),
    'amb_star':        dict(wave='sine', att=0.005, tau=0.04),                              # A5 D120
    'amb_firefly':     dict(wave='sine', att=0.3, dec=0.5, vib=0.04, vib_hz=3.0),           # A300 D500, 틱 없음
}


def play(name, midi, **kw):
    p = dict(AMB[name])
    p.update(kw)
    return tone(midi, **p)


# ------------------------------------------------------------------
# 원샷 재료
# ------------------------------------------------------------------
# 빗방울 처프: 음계 음 → 위 음계 음 (+12~19 %, 리서치 '15 ms 에 +20 % ↗' 을 음계에 맞춤), 1.57~3.5 kHz
RAIN_GLIDES = [('G6', 'A6'), ('A6', 'C7'), ('C7', 'D7'), ('D7', 'F7'), ('F7', 'G7'), ('G7', 'A7')]


def raindrop(rng, a, b):
    D = rng.uniform(0.020, 0.040)            # 감쇠 20~40 ms
    tau = D / 3
    n = int((0.001 + 6.9 * tau + 0.005) * SR)
    t = np.arange(n) / SR
    s = np.clip(t / 0.015, 0, 1)
    s = s * s * (3 - 2 * s)
    ph = 2 * np.pi * np.cumsum(hz(a + (b - a) * s)) / SR
    y = np.sin(ph)
    if rng.random() < 0.3:                   # TRI 쪽(3배음 −19 dB, 뒤의 LPF 가 대부분 지운다)
        y = y - np.sin(3 * ph) / 9
    return y * env_shape(n, SR, 0.001, 0, tau)


def chirp(f, pulses=3, on=0.018, off=0.007, edge=0.003, amps=(0.85, 1.0, 0.9), drift_c=6.0):
    """귀뚜라미 1처프: 펄스 18 ms 켬 / 7 ms 끔 ×3. 모서리 3 ms 로 둥글게, 펄스 안에서 ±6센트 살짝 내려감."""
    per = on + off
    n = int(round(pulses * per * SR))
    t = np.arange(n) / SR
    env = np.zeros(n)
    cents = np.zeros(n)
    for p in range(pulses):
        lt = t - p * per
        m = (lt >= 0) & (lt < on)
        e = np.minimum(np.clip(lt[m] / edge, 0, 1), np.clip((on - lt[m]) / edge, 0, 1))
        env[m] = amps[p] * np.sin(0.5 * np.pi * e) ** 2
        cents[m] = drift_c * (1 - 2 * lt[m] / on)
    ph = 2 * np.pi * np.cumsum(f * 2 ** (cents / 1200)) / SR
    return np.sin(ph) * env


def bouts(rng, L, duty=(0.6, 0.8), sing=(6.0, 16.0), rest=(2.0, 6.5)):
    """마리마다 60~80 % 시간만 운다: (시작, 길이) 노래 구간들(원형)."""
    best = None
    for _ in range(500):
        segs, tot = [], 0.0
        while tot < L:
            s, r = rng.uniform(*sing), rng.uniform(*rest)
            segs.append((s, r))
            tot += s + r
        k = L / tot
        best = [(s * k, r * k) for s, r in segs]
        d = sum(s for s, _ in best) / L
        if duty[0] <= d <= duty[1]:
            break
    t = rng.uniform(0, L)
    out = []
    for s, r in best:
        out.append((t % L, s))
        t += s + r
    return out


def bout_gain(t, bts, L, fade=0.9):
    g = 0.0
    for st, dur in bts:
        d = (t - st) % L
        if d < dur:
            e = min(1.0, d / fade, (dur - d) / fade)
            g = max(g, math.sin(0.5 * math.pi * e) ** 2)
    return g


def cricket(rng, L, note, rate, lvl, lpf):
    """처프 격자 주기 P = L/k (k 정수) → 이음매에서도 박자가 그대로. 각 처프 ±3 ms 흔들림."""
    k = max(1, int(round(L * rate)))
    P = L / k
    phi = rng.uniform(0, P)
    f = float(hz(nm(note)))
    tpls = []
    for _ in range(4):
        amps = tuple(np.clip(np.array([0.85, 1.0, 0.9]) * rng.uniform(0.9, 1.1, 3), 0.5, 1.1))
        tpls.append(at_db(chirp(f, amps=amps), lvl))
    bts = bouts(rng, L)
    bus = Bus(L)
    for j in range(k):
        tj = (phi + j * P + rng.uniform(-0.003, 0.003)) % L
        g = bout_gain(tj, bts, L)
        if g < 0.02:
            continue
        bus.add(tpls[int(rng.integers(len(tpls)))] * g * db2a(rng.uniform(-0.8, 0.8)), tj)
    return circ_sos(lp(lpf, 4), bus.x), k / L


def leaf_rustle(rng):
    """잎 바스락: NZ BP 2~5 kHz, 20 ms 낟알 3~8개."""
    ng = int(rng.integers(3, 9))
    span = rng.uniform(0.12, 0.45)
    n = int((span + 0.08) * SR)
    y = np.zeros(n)
    for _ in range(ng):
        gl = 0.020 * rng.uniform(0.8, 1.2)
        m = int(gl * SR)
        g = signal.sosfilt(bpq(rng.uniform(2000, 5000), 1.4), nes_noise(rng, m, int(rng.integers(1, 4))))
        g = g * env_shape(m, SR, 0.002, 0, tau=gl / 3) * rng.uniform(0.35, 1.0)
        s = int(rng.uniform(0, span) * SR)
        y[s:s + m] += g[:n - s]
    return signal.sosfilt(lp(6000), y)


CRK_SOS = np.vstack([hp(1500), lp(7000)])


def crackle(rng):
    """등불 딱딱: 2~5 ms NZ 터짐, HPF 1.5k(+LPF 7k)."""
    d = rng.uniform(0.002, 0.005)
    n = int((d + 0.004) * SR)
    src = nes_noise(rng, n, 0)
    y = src * env_shape(n, SR, 0.00015, 0, tau=d / 2.5)
    return signal.sosfilt(CRK_SOS, np.concatenate([y, np.zeros(int(0.003 * SR))]))


def jagged(rng, N, seg=(0.05, 0.22), smooth=0.012):
    """들쭉날쭉한 포락선(무작위 계단 → 12 ms 매끈하게, 가끔 솟음). 원형, RMS 1."""
    out = np.empty(N)
    pos = 0
    while pos < N:
        m = int(rng.uniform(*seg) * SR)
        v = rng.random() ** 2.2 * (3.0 if rng.random() < 0.08 else 1.0)
        out[pos:pos + m] = v
        pos += m
    a = math.exp(-1.0 / (smooth * SR))
    out = circ_ba([1 - a], [1, -a], out)
    return out / rms(out)


def bird_syllable(rng, a, b, c, dur, wave):
    """2~3.5 kHz 를 빠르게 ↗↘: 음계 음 a → b → c (매끈한 보간)."""
    n = int(dur * OSR)
    u = np.arange(n) / n
    pk = rng.uniform(0.35, 0.55)
    s1 = np.clip(u / pk, 0, 1)
    s2 = np.clip((u - pk) / (1 - pk), 0, 1)
    s1 = s1 * s1 * (3 - 2 * s1)
    s2 = s2 * s2 * (3 - 2 * s2)
    semi = a + (b - a) * s1 + (c - b) * s2
    y = osc_os(wave, hz(semi), duty=0.125) * env_shape(n, OSR, 0.005, max(0.0, dur - 0.017), dec=0.012)
    return signal.resample_poly(y, 1, OS)


BIRD_PATHS = [('C7', 'F7', 'D7'), ('D7', 'G7', 'F7'), ('F7', 'A7', 'G7'), ('C7', 'D7', 'C7'),
              ('D7', 'F7', 'C7'), ('G7', 'A7', 'F7'), ('F7', 'G7', 'D7')]


def bird_call(rng):
    nsyl = int(rng.integers(2, 5))
    wave = 'pulse' if rng.random() < 0.5 else 'tri'
    parts, t = [], 0.0
    for i in range(nsyl):
        a, b, c = BIRD_PATHS[int(rng.integers(len(BIRD_PATHS)))]
        dur = rng.uniform(0.035, 0.060) if i < nsyl - 1 else rng.uniform(0.050, 0.070)
        parts.append((t, bird_syllable(rng, nm(a), nm(b), nm(c), dur, wave) * rng.uniform(0.7, 1.0)))
        t += dur + rng.uniform(0.05, 0.11)
    out = np.zeros(int((t + 0.1) * SR))
    for t0, y in parts:
        s = int(t0 * SR)
        out[s:s + len(y)] += y
    return out


def creak(rng, dur=0.45):
    """나무 삐걱: 스틱-슬립 펄스(28→46→34 Hz)가 A4·D5 공명을 친다. 아주 작게."""
    n = int((dur + 0.15) * SR)
    t = np.arange(n) / SR
    u = np.clip(t / dur, 0, 1)
    rate = 28 + 18 * np.sin(np.pi * u ** 0.8) - 6 * u
    ph = np.cumsum(rate) / SR
    idx = np.where(np.diff(np.floor(ph)) > 0)[0] + 1
    exc = np.zeros(n)
    amp = np.sin(np.pi * u) ** 0.7
    exc[idx] = amp[idx] * rng.uniform(0.6, 1.0, len(idx))
    exc[t > dur] = 0
    y = signal.sosfilt(bpq(hz(nm('A4')), 14), exc) + 0.6 * signal.sosfilt(bpq(hz(nm('D5')), 12), exc)
    return signal.sosfilt(lp(2500), y)


def snow_slide(rng, dur=1.2):
    """지붕 눈 미끄러짐: NZ LPF 600, 1.2 s, 거친 결 + 끝에 아주 작은 '퍽'."""
    n = int((dur + 0.3) * SR)
    t = np.arange(n) / SR
    x = signal.sosfilt(lp(600, 4), nes_noise(rng, n, 5))
    gr = signal.sosfilt(lp(18, 2), rng.standard_normal(n))
    gr = 1 + 0.6 * gr / (np.abs(gr).max() + 1e-9)
    env = np.where(t < 0.35, 0.5 - 0.5 * np.cos(np.pi * t / 0.35), 1.0)
    env = np.where(t > 0.75, np.where(t < dur, 0.5 + 0.5 * np.cos(np.pi * (t - 0.75) / (dur - 0.75)), 0.0), env)
    y = x * gr * env
    m = int(0.14 * SR)
    th = signal.sosfilt(lp(150, 2), nes_noise(rng, m, 6)) * env_shape(m, SR, 0.004, 0, tau=0.03)
    s = int((dur - 0.12) * SR)
    y[s:s + m] += th * (rms(y) / (rms(th) + 1e-12)) * 0.6
    return y


def sleigh(rng, dur=1.4):
    """썰매방울 트레몰로: 7비트 숏모드 LFSR(93단계)을 F6 기음이 되게 클럭 → 금속성 '찰' 을 13 Hz 로 떨게."""
    f0 = float(hz(nm('F6')))
    n = int((dur + 0.12) * OSR)
    idx = np.floor(np.arange(n) * (93 * f0) / OSR).astype(np.int64) % len(chip.LFSR_SHORT)
    met = signal.resample_poly(chip.LFSR_SHORT[idx], 1, OS)
    m = len(met)
    t = np.arange(m) / SR
    env = np.zeros(m)
    tb = 0.0
    while tb < dur:
        d = t - tb
        k = d >= 0
        env[k] += rng.uniform(0.6, 1.0) * np.exp(-d[k] / 0.022) * np.clip(d[k] / 0.001, 0, 1)
        tb += 1 / 13.0 * rng.uniform(0.85, 1.15)
    sw = np.where(t < 0.5, 0.5 - 0.5 * np.cos(np.pi * t / 0.5), 1.0)
    sw = np.where(t > dur - 0.7, np.clip(0.5 + 0.5 * np.cos(np.pi * (t - (dur - 0.7)) / 0.7), 0, 1), sw)
    sw[t > dur] = 0
    y = met * env * sw
    return signal.sosfilt(np.vstack([hp(2000), lp(8000)]), y)


def room_air(rng, N, L, lpf=300.0, air_db=-16.0, air_lpf=2500.0):
    """방 공기: 브라운 NZ LPF(60 Hz 아래는 걷어냄) + 아주 옅은 중역 '공기'(폰에서도 방이 비어 있지 않게)."""
    b = circ_sos(hp(60), circ_sos(lp(lpf, 4), brown(rng, N)))
    a = circ_sos(lp(air_lpf, 2), circ_sos(hp(300), pink(rng, N)))
    x = set_rms(b, 0.0) + set_rms(a, air_db)
    return x * db2a(1.0 * plfo(rng, N, L, 0.02, 0.08))


# ------------------------------------------------------------------
# 베드 루프
# ------------------------------------------------------------------
def rain_chain(rng, N, L, lpf, shh_db):
    t = np.arange(N) / SR
    k = max(1, int(round(0.07 * L)))     # 0.07 Hz 에 가장 가까운 1/L 정수배
    lfo_db = 1.5 * np.sin(2 * np.pi * k * t / L + rng.uniform(0, 2 * np.pi)) + 0.4 * plfo(rng, N, L, 0.015, 0.04)
    bed = set_rms(circ_sos(lp(lpf, 4), circ_sos(hp(150), pink(rng, N))), 0.0) * db2a(lfo_db)
    if shh_db is not None:
        shh = circ_sos(lp(7000, 4), circ_sos(bpq(5000, 0.7), nes_noise(rng, N, 3)))
        bed = bed + set_rms(shh, shh_db) * db2a(0.6 * lfo_db + 0.5 * plfo(rng, N, L, 0.1, 0.3))
    return bed, lfo_db, k / L


def add_raindrops(rng, bus, L, rate, lfo_db, lvl_lo, lvl_hi):
    ctrl = 1 + 0.25 * lfo_db / 1.5
    times = poisson(rng, L, rate, ctrl)
    for tt in times:
        a, b = RAIN_GLIDES[int(rng.integers(len(RAIN_GLIDES)))]
        lvl = lvl_lo + (lvl_hi - lvl_lo) * rng.random() ** 1.6
        bus.add(at_db(raindrop(rng, nm(a), nm(b)), lvl), tt)
    return len(times) / L


def add_eave(rng, bus, L, lo, hi, lvl, notes=('C6', 'D6', 'F6', 'G6')):
    bag = Bag(rng, notes)
    times = spaced(rng, L, lo, hi)
    for tt in times:
        kind = 'amb_eave' if rng.random() < 0.75 else 'amb_eave_gb'
        ev = play(kind, nm(bag()), cents=rng.uniform(-10, 10), tau=rng.uniform(0.06, 0.1))
        bus.add(at_db(ev, lvl + rng.uniform(-2, 1)), tt)
    return len(times) / L


def build_rain(L=61, seed=4061):
    rng = np.random.default_rng(seed)
    N = int(round(L * SR))
    bed, lfo_db, f_lfo = rain_chain(rng, N, L, 3500, -12.0)
    drops = Bus(L)
    r_drop = add_raindrops(rng, drops, L, 8.0, lfo_db, -22, -8)
    roof = poisson(rng, L, 1.0)
    for tt in roof:
        ev = play('amb_roof', nm(['F5', 'G5', 'A5'][int(rng.integers(3))]), cents=rng.uniform(-10, 10))
        drops.add(at_db(ev, rng.uniform(-20, -14)), tt)
    eave = Bus(L)
    r_eave = add_eave(rng, eave, L, 1.6, 5.2, -4.0)
    x = bed + circ_sos(lp(6500), drops.x) + verb(eave.x, 0.22)
    info = f'LFO {f_lfo:.4f} Hz, 빗방울 {r_drop:.1f}/s, 지붕 톡 {len(roof) / L:.2f}/s, 처마 {r_eave:.2f}/s'
    return finish(x, 8000), info


def build_drizzle(L=47, seed=4047):
    rng = np.random.default_rng(seed)
    N = int(round(L * SR))
    bed, lfo_db, f_lfo = rain_chain(rng, N, L, 2000, None)
    drops = Bus(L)
    r_drop = add_raindrops(rng, drops, L, 2.2, lfo_db, -16, -2)   # 베드 −6 dB → 방울은 상대적으로 6 dB 앞
    eave = Bus(L)
    r_eave = add_eave(rng, eave, L, 1.0, 3.0, 4.0)                  # −14 vs 베드 −18 → +4 dB
    x = bed + circ_sos(lp(6500), drops.x) + verb(eave.x, 0.22)
    info = f'LFO {f_lfo:.4f} Hz, 빗방울 {r_drop:.1f}/s, 처마 {r_eave:.2f}/s'
    return finish(x, 7000), info


def build_snow_wind(L=73, seed=4073):
    rng = np.random.default_rng(seed)
    N = int(round(L * SR))
    t = np.arange(N) / SR
    lfo = 0.65 * plfo(rng, N, L, 0.045, 0.075) + 0.35 * plfo(rng, N, L, 0.14, 0.2)
    lfo = (lfo - lfo.min()) / (lfo.max() - lfo.min())
    gtimes = spaced(rng, L, 15, 40)
    bumps = [rng.uniform(0.6, 0.75) * bump(t, gt, rng.uniform(3.0, 6.0), rng.uniform(5.0, 9.0), L) for gt in gtimes]
    gust = np.sum(bumps, axis=0)
    c = 0.08 + 0.22 * lfo + gust
    c = c / max(1.0, c.max())
    # 바람: 핑크 → BP Q1.5, 중심 350~900 Hz 를 c 로 움직인다(고정 밴드 9개 사이를 보간 → 원형 처리 그대로)
    src = pink(rng, N)
    centers = np.geomspace(300, 1000, 9)
    fc = 350 * (900 / 350) ** c
    pos = np.log(fc / 300) / np.log(1000 / 300) * (len(centers) - 1)
    i0 = np.clip(np.floor(pos).astype(int), 0, len(centers) - 2)
    fr = pos - i0
    wind = np.zeros(N)
    for i, cf in enumerate(centers):
        w = np.where(i0 == i, 1 - fr, 0.0) + np.where(i0 + 1 == i, fr, 0.0)
        if w.max() <= 0:
            continue
        band = circ_sos(bpq(cf, 1.5), src)
        wind += band / rms(band) * w
    wind = set_rms(wind * db2a(-16 * (1 - c)), 0.0)            # 중심이 오르면 음량도 오른다(돌풍)
    low = circ_sos(hp(50), circ_sos(lp(260, 2), pink(rng, N)))
    low = set_rms(low * db2a(-10 * (1 - c)), -9.0)
    peak = c > 0.9
    wind_pk = rms(wind[peak]) if peak.any() else rms(wind)
    # 창틈 휘파람: BP Q10 을 A5/C6 에, 돌풍 꼭대기에서만(돌풍 −14 dB)
    wtop = np.clip((c - 0.72) / 0.28, 0, 1) ** 2
    hsrc = nes_noise(rng, N, 3)
    whistle = np.zeros(N)
    gsum = gust + 1e-9
    wnotes = []
    for gi in range(len(gtimes)):
        note = 'A5' if gi % 2 == 0 else 'C6'
        wnotes.append(note)
        b = circ_sos(bpq(hz(nm(note)), 10), hsrc)
        whistle += b / rms(b) * wtop * (bumps[gi] / gsum)
    act = wtop > 0.8
    if act.any():
        whistle *= wind_pk * db2a(-14) / rms(whistle[act])
    # 지붕 눈 미끄러짐 1회: 돌풍에서 가장 먼 고요한 곳
    cand = np.arange(0, L, 0.1)
    cand = [tc for tc in cand if min(cdist(tc, g, L) for g in gtimes) > 9.0] or list(cand)
    t_slide = min(cand, key=lambda tc: c[int(tc * SR) % N])
    slide_bus = Bus(L)
    slide_bus.add(at_db(snow_slide(rng), 20 * math.log10(rms(wind) / REF) - 3.0), t_slide - 0.6)
    x = wind + low + whistle + slide_bus.x
    info = (f'돌풍 {len(gtimes)}회 @ ' + ', '.join(f'{g:.1f}' for g in gtimes) +
            f' s, 휘파람 {"/".join(wnotes)}, 눈 미끄러짐 @ {t_slide:.1f} s')
    return finish(x, 6000), info


def build_clear_day(L=53, seed=4053):
    rng = np.random.default_rng(seed)
    N = int(round(L * SR))
    room = room_air(rng, N, L)
    birds = Bus(L)
    btimes = spaced(rng, L, 20, 40)
    for tt in btimes:
        birds.add(at_db(bird_call(rng), -6.0 + rng.uniform(-2, 0)), tt)
    birds_x = verb(circ_sos(lp(4500, 2), birds.x), 0.35, sec=1.1)
    cr = Bus(L)
    cand = [tc for tc in np.arange(0, L, 0.5) if min(cdist(tc, b, L) for b in btimes) > 8.0]
    t_cr = cand[int(rng.integers(len(cand)))]
    cr.add(at_db(creak(rng), -10.0), t_cr)
    x = room + birds_x + verb(cr.x, 0.2)
    info = '먼 새 @ ' + ', '.join(f'{b:.1f}' for b in btimes) + f' s, 삐걱 @ {t_cr:.1f} s'
    return finish(x, 7000), info


def build_clear_night(L=53, seed=5053):
    rng = np.random.default_rng(seed)
    N = int(round(L * SR))
    room = room_air(rng, N, L, lpf=250, air_db=-20, air_lpf=2000)
    stars = Bus(L)
    bag = Bag(rng, ['C7', 'D7'])
    st = spaced(rng, L, 10, 30)
    for tt in st:
        a = bag()
        stars.add(at_db(play('amb_star', nm(a), cents=rng.uniform(-5, 5)), -10.0), tt)
        if rng.random() < 0.4:
            b = bag()
            stars.add(at_db(play('amb_star', nm(b), cents=rng.uniform(-5, 5)), -16.0), tt + 0.11)
    x = room + verb(stars.x, 0.3, sec=1.2)
    info = '별 반짝 @ ' + ', '.join(f'{s:.1f}' for s in st) + ' s'
    return finish(x, 7000), info


def build_summer_night(L=59, seed=4059):
    rng = np.random.default_rng(seed)
    crk = np.zeros(int(round(L * SR)))
    rates = []
    for note, rate, lvl, lpf in [('F7', 2.2, 0.0, 5000), ('G7', 2.45, -2.0, 5000), ('F7', 2.0, -5.0, 3800)]:
        y, r = cricket(rng, L, note, rate, lvl, lpf)
        crk += y
        rates.append(f'{note} {r:.2f}/s')
    ff = Bus(L)
    bag = Bag(rng, ['C7', 'D7'])
    ft = spaced(rng, L, 4.5, 11)
    for tt in ft:
        ff.add(at_db(play('amb_firefly', nm(bag()), cents=rng.uniform(-4, 4)), -4.0 + rng.uniform(-2, 0)), tt)
    x = verb(crk, 0.12) + verb(ff.x, 0.3, sec=1.2)
    info = '귀뚜라미 ' + ', '.join(rates) + f', 반딧불 {len(ft)}회'
    return finish(x, 8000), info


def build_autumn(L=67, seed=4067):
    rng = np.random.default_rng(seed)
    crk, r = cricket(rng, L, 'F7', 1.2, 0.0, 5000)
    lv = Bus(L)
    lt = spaced(rng, L, 10, 25)
    for tt in lt:
        lv.add(at_db(leaf_rustle(rng), -6.0 + rng.uniform(-2, 1)), tt)
    x = verb(crk, 0.12) + verb(lv.x, 0.15)
    info = f'귀뚜라미 F7 {r:.2f}/s, 잎 바스락 @ ' + ', '.join(f'{s:.1f}' for s in lt) + ' s'
    return finish(x, 7000), info


def build_lantern(n_lamps, L=41, seed=None):
    """등불 따뜻함. 성분 크기는 리서치 표의 BGM 대비 dB 그대로(REF = BGM) → n 사이 상대 크기가 보존된다."""
    rng = np.random.default_rng(seed if seed is not None else 4100 + n_lamps)
    N = int(round(L * SR))
    rate = 0.3 + 0.4 * n_lamps
    dens = np.clip(1 + 0.6 * plfo(rng, N, L, 0.05, 0.4), 0.2, None)
    crack = Bus(L)
    times = poisson(rng, L, rate, dens / dens.mean())
    for tt in times:
        lvl = rng.uniform(-32, -20)
        crack.add(at_db(crackle(rng), lvl), tt)
        if rng.random() < 0.25:                       # 작은 연쇄 '딱-딱'
            t2 = tt
            for _ in range(int(rng.integers(1, 3))):
                t2 += rng.uniform(0.008, 0.035)
                crack.add(at_db(crackle(rng), lvl - rng.uniform(6, 10)), t2)
    rumble = circ_sos(hp(40), circ_sos(lp(180, 4), brown(rng, N)))
    rumble = set_rms(rumble * db2a(1.5 * plfo(rng, N, L, 0.3, 1.5)), -36 + n_lamps)
    hiss = circ_sos(lp(6500, 2), circ_sos(bpq(4000, 1.2), nes_noise(rng, N, 1)))
    hiss = set_rms(hiss * jagged(rng, N), -40.0)
    x = crack.x + rumble + hiss
    info = f'n={n_lamps}: 딱딱 {len(times) / L:.2f}/s(목표 {rate:.1f}), 웅 {-36 + n_lamps} dB, 쉬익 −40 dB'
    return finish(x, 7500), info


# ------------------------------------------------------------------
# 무박 레이어 (F 펜타)
# ------------------------------------------------------------------
def build_layer_drips(L=37, seed=6037):
    rng = np.random.default_rng(seed)
    notes = ['C5', 'D5', 'F5', 'G5', 'A5', 'C6', 'D6', 'F6', 'G6', 'A6', 'C7']
    bag = Bag(rng, notes, [0.4, 0.4, 0.8, 1.0, 1.5, 3, 3, 3, 3, 1.5, 0.8])
    bus = Bus(L)
    times = spaced(rng, L, 0.9, 3.4)
    for tt in times:
        name = bag()
        kind = 'amb_eave' if rng.random() < 0.7 else 'amb_eave_gb'
        lvl = rng.uniform(-6, 0)
        bus.add(at_db(play(kind, nm(name), cents=rng.uniform(-10, 10), tau=rng.uniform(0.045, 0.09)), lvl), tt)
        if rng.random() < 0.2:                        # 겹방울: 같은 음 또는 음계 한 칸 아래, −7 dB
            j = notes.index(name)
            name2 = name if (rng.random() < 0.5 or j == 0) else notes[j - 1]
            ev2 = play(kind, nm(name2), cents=rng.uniform(-10, 10), tau=rng.uniform(0.04, 0.07))
            bus.add(at_db(ev2, lvl - 7), tt + rng.uniform(0.12, 0.26))
    x = verb(bus.x, 0.22)
    return finish(x, 7000), f'{len(times) / L:.2f}음/s'


def build_layer_snowbells(L=43, seed=6043):
    rng = np.random.default_rng(seed)
    bag = Bag(rng, ['A5', 'C6', 'D6', 'F6', 'G6', 'A6', 'C7', 'D7'], [0.7, 1.2, 1.0, 1.5, 1.0, 1.2, 1.3, 0.8])
    bus = Bus(L)
    times = spaced(rng, L, 2.4, 7.6)
    for tt in times:
        m = nm(bag())
        ev = mixpad(play('amb_snowbell', m, cents=rng.uniform(-4, 4), tau=rng.uniform(0.35, 0.5)),
                    0.18 * play('amb_bellhi', m + 12))
        lvl = rng.uniform(-4, 0)
        ev = at_db(ev, lvl)
        bus.add(ev, tt)
        if rng.random() < 0.3:
            bus.add(ev * db2a(-10), tt + rng.uniform(0.38, 0.5))
    # 썰매방울 1회: 종 사이 가장 넓은 틈
    ts = np.sort(times)
    gaps = np.diff(np.concatenate([ts, [ts[0] + L]]))
    gi = int(np.argmax(gaps))
    t_sl = (ts[gi] + 0.35 * gaps[gi]) % L
    bus.add(at_db(sleigh(rng), -8.0), t_sl)
    x = verb(bus.x, 0.25, sec=1.3)
    return finish(x, 8500), f'{len(times) / L:.2f}음/s, 썰매방울 @ {t_sl:.1f} s'


def build_layer_sparkle(L=31, seed=6031):
    rng = np.random.default_rng(seed)
    notes = ['C6', 'D6', 'F6', 'G6', 'A6', 'C7', 'D7', 'F7']
    bag = Bag(rng, notes, [0.8, 0.8, 1.0, 1.0, 1.3, 1.5, 1.3, 1.0])
    bus = Bus(L)
    times = spaced(rng, L, 1.0, 3.2)
    n_sw = 0
    for tt in times:
        name = bag()
        m = nm(name)
        lvl = rng.uniform(-5, 0)
        if rng.random() < 0.25:                       # 반딧불식 느린 부풂
            bus.add(at_db(play('amb_spark_swell', m, cents=rng.uniform(-5, 5)), lvl - 2), tt)
            n_sw += 1
            continue
        ev = at_db(play('amb_spark', m, cents=rng.uniform(-5, 5), tau=rng.uniform(0.08, 0.15)), lvl)
        bus.add(ev, tt)
        bus.add(ev * db2a(-9), tt + 0.19)             # 트래커식 메아리
        bus.add(ev * db2a(-16), tt + 0.38)
        if rng.random() < 0.3:                        # 앞꾸밈음: 음계 이웃
            j = notes.index(name)
            g = notes[j - 1] if j > 0 else notes[j + 1]
            bus.add(at_db(play('amb_spark', nm(g), tau=0.05), lvl - 6), tt - 0.07)
    x = verb(bus.x, 0.3, sec=1.2)
    return finish(x, 8500), f'{len(times) / L:.2f}음/s (부풂 {n_sw})'


def build_layer_winter_chime(L=53, seed=6053):
    rng = np.random.default_rng(seed)
    notes = ['F5', 'C6', 'F6', 'C7']
    bag = Bag(rng, notes, [1.0, 1.2, 1.2, 0.8])
    bus = Bus(L)

    def chime(m):
        return mixpad(play('amb_chime', m, tau=rng.uniform(0.7, 0.95)),
                      0.4 * play('amb_chime_b', m),
                      0.12 * play('amb_bellhi', m + 12, tau=0.25))

    times = spaced(rng, L, 6.5, 15)
    n_pair = 0
    for tt in times:
        name = bag()
        lvl = rng.uniform(-3, 0)
        bus.add(at_db(chime(nm(name)), lvl), tt)
        if rng.random() < 0.35:                       # F↔C 짝(흔들리는 두 종)
            j = notes.index(name)
            k = j + 1 if j + 1 < len(notes) and (j == 0 or rng.random() < 0.5) else j - 1
            bus.add(at_db(chime(nm(notes[k])), lvl - 3), tt + rng.uniform(0.4, 0.7))
            n_pair += 1
    x = verb(bus.x, 0.3, sec=1.6, damp=3500)
    return finish(x, 7500), f'{len(times)}회/{L} s (짝 {n_pair})'


# ------------------------------------------------------------------
# 목록 · 내보내기
# ------------------------------------------------------------------
LANTERN_N = {'amb_lantern_low': 2, 'amb_lantern_mid': 5, 'amb_lantern_high': 8}
LANTERN_HIGH_DB = -24.0

# id: (kind, L, rel_db, builder, trigger, recipe)
SOUNDS = {
    'amb_rain': ('amb', 61, -12.0, build_rain,
                 '날씨 rain: 상시 베드(음악보다 앞). BGM 쉬는 구간 +4 dB, 날씨 전환 8~12 s 크로스페이드. '
                 'window_tap 때 처마 물방울 2~3개 추가는 런타임 원샷',
                 'NES 15비트 노이즈→핑크→HPF150→LPF3.5k + 쉬익 BP5k Q0.7 −12 dB(LPF7k), 세기 LFO ±1.5 dB. '
                 '빗방울 ~8/s(6~10, SIN/TRI, F펜타 음→위 음 처프 15 ms, D20~40 ms, −8~−22 dB), 지붕 톡 TRI F5/G5/A5 ~1/s, '
                 '처마 물방울 TRI C6/D6/F6/G6 ~0.3/s ±10센트(베드 −4 dB = BGM −16). 모노'),
    'amb_drizzle': ('amb', 47, -16.0, build_drizzle,
                    '날씨 drizzle: 상시 베드. 창가 stay_count_drops 와 처마 음(C6/D6/F6/G6)을 나눠 씀. layer_drips 를 겹쳐도 됨',
                    '비와 같은 체인에 LPF 2k, 쉬익 없음, 베드 −6 dB(방울 하나하나가 들리게). 빗방울 ~2.2/s(−2~−16 dB), '
                    '처마 물방울 ~0.5/s 베드 +4 dB(= BGM −14)'),
    'amb_snow_wind': ('amb', 73, -14.0, build_snow_wind,
                      '날씨 snow(1~2월): 상시 베드. 눈 자체는 무음. 등불 따뜻함 층 +2 dB(실내 대비)는 런타임',
                      '핑크 NZ → BP Q1.5 중심 350~900 Hz(주기 LFO 0.06·0.17 Hz + 돌풍 15~40 s 간격), 중심↑=음량↑, '
                      '돌풍 사이 약 −12~−15 dB로 고요. 창틈 휘파람 BP Q10 A5/C6 돌풍 꼭대기에서만(돌풍 −14 dB). '
                      '지붕 눈 미끄러짐 NZ LPF600 1.2 s 1회/루프'),
    'amb_clear_day': ('amb', 53, -18.0, build_clear_day,
                      '날씨 clear, 6~19시 낮 베드. 새벽(6~9) 새 밀도 올리기·노을(17~19) 새 줄이기는 런타임 원샷으로',
                      '방 공기: 브라운 NZ 60~300 Hz + 옅은 공기(핑크 300~2.5k −16 dB), 느린 ±1 dB. 먼 새 2회/루프'
                      '(20~40 s 간격, P12/TRI, C7~A7 음계 음 사이 ↗↘ 35~70 ms 음절 2~4개, LPF4.5k, 베드 −6 dB). 나무 삐걱 1회(A4/D5 공명)'),
    'amb_clear_night': ('amb', 53, -20.0, build_clear_night,
                        '날씨 clear, 19~6시 밤 베드(밤 마스터 −3 dB 는 런타임). 화면 별과 맞춘 반짝은 layer_sparkle',
                        '방 공기(더 어둡게 LPF250, 공기 −20 dB) + 별 반짝 SIN C7/D7 A5 ms D120 ms, 10~30 s 간격 3회/루프, '
                        '40%는 두 음, 베드 −10 dB(= BGM −30)'),
    'amb_summer_night': ('amb', 59, -20.0, build_summer_night,
                         '여름(6~8월, 9월 초) 밤 19~6시, 맑음·가는 비일 때 밤 베드 위에 겹침. 큰비면 끔. '
                         '쓰다듬는 동안 한 마리 1 s 쉬기는 런타임',
                         '귀뚜라미 3마리 SIN F7 2794/G7 3136/F7(먼 것, LPF3.8k) Hz, 펄스 18 ms 켬/7 ms 끔 ×3 = 1처프, '
                         '2.2/2.46/2.0 처프/s, 마리마다 60~80% 시간만 울음, LPF5k, 각 −6 dB(= BGM −26). '
                         '반딧불 SIN C7/D7 A300 D500 부풀림만(틱 없음) ~0.14회/s. 노이즈 베드 없음'),
    'amb_autumn': ('amb', 67, -20.0, build_autumn,
                   '가을(9~11월): 날씨 베드 위에 겹침(맑은 날·밤)',
                   '귀뚜라미 1마리 SIN F7, 처프 1.2/s(돌베어 서늘함), 펄스 18/7 ms ×3, 60~80% 시간, LPF5k. '
                   '잎 바스락 4회/루프(NZ BP 2~5k, 20 ms 낟알 3~8개, 10~25 s 간격, −6 dB). 노이즈 베드 없음'),
    'amb_lantern_low': ('amb', 41, None, lambda: build_lantern(2),
                        '등불 0~3칸: 항상(다른 베드 위). 칸이 바뀌면 low/mid/high 사이 3 s 크로스페이드',
                        '딱딱 포아송 (0.3+0.4n)/s=1.1/s, 2~5 ms NZ HPF1.5k −20~−32 dB(25% 작은 연쇄); 웅 브라운 LPF180 −34 dB; '
                        '쉬익 BP4k 들쭉날쭉 −40 dB. n=2'),
    'amb_lantern_mid': ('amb', 41, None, lambda: build_lantern(5),
                        '등불 4~6칸: 항상(다른 베드 위). 칸이 바뀌면 low/mid/high 사이 3 s 크로스페이드',
                        '딱딱 2.3/s, 웅 −31 dB, 쉬익 −40 dB (n=5). 성분 크기는 high 와 같은 기준'),
    'amb_lantern_high': ('amb', 41, LANTERN_HIGH_DB, lambda: build_lantern(8),
                         '등불 7~8칸: 항상(다른 베드 위). 방이 채워지는 것이 귀로도 들린다',
                         '딱딱 3.5/s, 웅 −28 dB, 쉬익 −40 dB (n=8). 전체 BGM −24'),
    'layer_drips': ('layer', 37, -18.0, build_layer_drips,
                    '무박 레이어: drizzle 위(그대로 ~0.46음/s) 또는 rain 위(amb_rain 처마 0.3/s 와 합쳐 ~0.8음/s). '
                    '37 s 라 곡 길이와 어긋나 덜 질림',
                    'TRI(70%)/GB 사인 웨이브(30%) 짧은 "똑"(τ 45~90 ms, 아래서 0.6반음 밀어 올림), C5~C7 F펜타'
                    '(C6/D6/F6/G6 위주), 셔플백, ±10센트, 20%는 겹방울 −7 dB'),
    'layer_snowbells': ('layer', 43, -16.0, build_layer_snowbells,
                        '무박 레이어: 날씨 snow 일 때 core 스템(−3 dB, LPF4k) 위에. 종은 필터 없이(대비)',
                        'GB bell 웨이브 종 A5~D7 F펜타 ~0.21음/s + 옥타브 위 사인 배음, 30%는 메아리 −10 dB. '
                        '썰매방울 트레몰로 1회/루프(7비트 숏모드 LFSR, F6 기음, 13 Hz)'),
    'layer_sparkle': ('layer', 31, -20.0, build_layer_sparkle,
                      '무박 레이어: 맑은 밤 별 반짝(등불 8칸 밤엔 상시). 여름밤 반딧불에도 같은 파일(gain −4 dB 권장)',
                      'P12 펄스 C6~F7 F펜타 ~0.5음/s. 75%는 짧은 반짝(τ 80~150 ms)+0.19/0.38 s 메아리, 30%는 앞꾸밈음; '
                      '25%는 느린 부풂(A250 D400). LPF 8.5k'),
    'layer_winter_chime': ('layer', 53, -18.0, build_layer_winter_chime,
                           '무박 레이어: 겨울(12~2월) 맑음·가는 비. 1~2월 snow 면 layer_snowbells 가 우선',
                           'F5/C6/F6/C7 종(GB 사인+bell 웨이브, τ 0.7~0.95 s, 옥타브 배음), ~5회/루프, 35%는 F↔C 짝'),
}


def lantern_levels(bodies):
    """세 등불을 같은 기준으로 만든 뒤 LUFS 차이만큼 mid/low 를 낮춘다(high = −24)."""
    scale = 0.5 / max(np.abs(b).max() for b in bodies.values())
    I = {k: R.loudness_of(b * scale)[0] for k, b in bodies.items()}
    return {k: round(LANTERN_HIGH_DB + (I[k] - I['amb_lantern_high']), 1) for k in bodies}


def export_loop(body, sid, kind, rel_db, L, trigger, recipe, dump=None):
    N = len(body)
    assert N == int(round(L * SR)), (sid, N)
    ni = int(round(LEAD_IN * SR))
    no = int(round(LEAD_OUT * SR))
    full = np.concatenate([body[N - ni:], body, body[:no]])
    loop = dict(start=LEAD_IN, end=round(LEAD_IN + L, 6))
    meta = dict(trigger=trigger, loop_len=L, notes=recipe)
    entry, x = export.export(full, sid, kind, rel_db=rel_db, folder='amb', loop=loop, meta=meta)
    if dump:
        import viz
        os.makedirs(dump, exist_ok=True)
        np.save(os.path.join(dump, sid + '.npy'), x[0].astype(np.float32))
        viz.spectrogram_png(x, os.path.join(dump, sid + '.png'),
                            title=f'{sid}  {L}s  target {entry["level"]["target"]}  meas {entry["level"]["measured"]}')
    return entry


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dump', default=None, help='검수용 .npy/.png 를 둘 폴더')
    ap.add_argument('--only', default=None, help='쉼표로 나눈 id 목록(매니페스트는 쓰지 않음)')
    a = ap.parse_args()
    only = set(a.only.split(',')) if a.only else None

    bodies, infos = {}, {}
    for sid, (kind, L, rel_db, fn, trig, rec) in SOUNDS.items():
        if only and sid not in only and not (sid in LANTERN_N and only & set(LANTERN_N)):
            continue
        body, info = fn()
        bodies[sid], infos[sid] = body, info
        print(f'  render {sid:20s} {L:3d} s  {info}', flush=True)

    rel = {sid: SOUNDS[sid][2] for sid in bodies}
    if set(LANTERN_N) <= set(bodies):
        rel.update(lantern_levels({k: bodies[k] for k in LANTERN_N}))

    entries = []
    for sid, body in bodies.items():
        if only and sid not in only:
            continue
        kind, L, _, _, trig, rec = SOUNDS[sid]
        e = export_loop(body, sid, kind, rel[sid], L, trig, f'{rec} | {infos[sid]}', dump=a.dump)
        entries.append(e)
        lv = e['level']
        print(f'  export {sid:20s} rel {lv["rel_db"]:6.1f}  target {lv["target"]:6.1f}  '
              f'meas {lv["measured"]:6.1f} {lv["unit"]}  peak {lv["peak_dbfs"]:6.1f} dBFS', flush=True)
    if not only:
        export.save_manifest_part('amb', entries)
        print(f'manifest.d/amb.json: {len(entries)} entries')


if __name__ == '__main__':
    main()
