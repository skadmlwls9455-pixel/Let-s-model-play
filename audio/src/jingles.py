"""
뽈뽈 징글·스팅어 — 출발·귀가·기억·포스터·등불·방 완성·기분·잠·시간대 종 (folder 'jingle', kind 'jingle').

실행
  cd audio/src && python3 jingles.py               # 전부 내보내기 + manifest.d/jingle.json
  python3 jingles.py lantern_3 mood_ujjul          # 일부만 내보내기(매니페스트는 쓰지 않음)
  python3 jingles.py --check                       # 화성 검사만(렌더 없음)

작곡 규칙 (리서치 02 §3.5·§4.4–4.6, 04 §1·§4 표·표 R)
  - 홈 F장조. 징글 선율은 F 펜타(F G A C D)만 쓴다. 화성은 I·IV·V까지. 기분 징글 선율은 F로 끝난다.
    B♭·E 는 04 §1.2 가 허락한 곳(등불 4·7칸 본음, 우쭐 V 화음 성부)에만.
  - 게임 모티프 M = C5 C5 A4 C5(8분) E5 C5(4분). 징글은 머리 "C C A C"(뽈뽈)를 빌려 와 F로 푼다.
    (E 는 펜타 밖이라 징글에서는 머리만 쓴다.)
  - 히어로(room_complete·first_place·rare_sparkle)는 변형 없이 늘 같다. 실패·중립에도 단2도·트라이톤·하강 다이브 없음.
  - 시간은 전부 '초'로 쓴다: chip.render_channel 에 bpm=60 을 넘기면 박 = 초.
  - 레벨은 04 표의 dB 열 = rel_db(BGM 대비). duck_db·quantize 는 메타로.
  - 리미터 천장을 -3.6 dBFS 로 낮춰 Opus/AAC 디코드 피크가 -3 dBFS 를 넘지 않게 한다.
  - export 의 짧은 소리 측정(active RMS)은 가장 큰 10 ms 에서 50 dB 안쪽을 다 '소리'로 세므로,
    드문드문한 짧은 징글은 잔향을 작게 둔다(잔향 꼬리가 측정을 깎아 실제로는 더 크게 나가는 것 방지).

공용 모듈은 고치지 않는다. 추가 프리셋은 이 파일 안에서 jg_ 접두어로 등록한다.
"""
import math
import sys

import numpy as np
from scipy import signal

import chip
import instruments  # noqa: F401  공용 프리셋 등록
import theory as th
import export as ex
from chip import Note, SR, OS, OSR, preset

KIND = 'jingle'
CEIL_DB = -3.6
FR = chip.FRAME_HZ
PENTA = {5, 7, 9, 0, 2}          # F G A C D

# ------------------------------------------------------------------
# 음 이름
# ------------------------------------------------------------------
_PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def P(name):
    """'C5' → 72, 'Bb5' → 82 (C4 = 60)"""
    if name is None or not isinstance(name, str):
        return name
    pc = _PC[name[0]]
    i = 1
    while name[i] in '#b':
        pc += 1 if name[i] == '#' else -1
        i += 1
    return 12 * (int(name[i:]) + 1) + pc


def hz(name):
    return float(chip.midi_hz(P(name)))


def N(t, dur, pitch, vel=12, inst='jg_tri', gate=0.95, seed=0):
    return Note(t, dur, P(pitch), vel, inst, gate, seed)


def P_(base, **kw):
    """프리셋 사본 + 덮어쓰기(음마다 피치 매크로 등)"""
    d = dict(chip.get_preset(base))
    d.update(kw)
    return d


# ------------------------------------------------------------------
# jg_ 프리셋
# ------------------------------------------------------------------
def _dec(peak, sec, attack=(), floor=0.0):
    """attack 프레임 뒤 지수 감쇠(sec 에 약 -35 dB). 마지막 값 = 서스테인."""
    n = max(1, int(round(sec * FR)))
    # -35 dB(sec)를 지나 -52 dB 까지 계속 줄인 뒤 0 — 끝에서 볼륨 계단이 툭 끊기지 않게
    return list(attack) + [max(floor, peak * math.exp(-4.0 * i / n)) for i in range(int(n * 1.5))] + [floor]


# 삼각파 — 기억 아르페지오·등불 본음(04 #20·#22: A3 D600)
preset('jg_tri', wave='tri', env=_dec(15, 0.6), rel=[0.6, 0.3, 0.1], cut=False)
preset('jg_tri_long', wave='tri', env=_dec(15, 1.1), rel=[0.6, 0.3, 0.1], cut=False)
preset('jg_tri_soft', wave='tri', env=[6, 9, 10, 10, 10, 9.5, 9, 8.5, 8], rel=[0.8, 0.6, 0.4, 0.25, 0.12],
       cut=False, sus_decay=0.06)
preset('jg_tri_hold', wave='tri', env=[3, 5, 7, 9, 10, 11, 11], rel=[0.85, 0.7, 0.55, 0.4, 0.28, 0.18, 0.1, 0.05],
       cut=False)
preset('jg_tri_fade', wave='tri', env=[6, 9, 11, 11], rel=[0.6, 0.35, 0.15], cut=False, sus_decay=0.1)
preset('jg_hum', wave='tri', env=[6, 9, 11, 12, 12, 12, 12, 12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8, 7.5, 7],
       rel=[0.7, 0.45, 0.25, 0.1], cut=False)
preset('jg_thud', wave='tri', env=[15, 12, 8, 4, 0], rel=[0.0], pitch=[0, -0.6, -1.2, -1.8], cut=False)
preset('jg_knock', wave='tri', env=[15, 7, 0], rel=[0.0], cut=False)
preset('jg_wood', wave='tri', env=[14, 0], rel=[0.0], cut=False)
# 펄스 (길게 사라지는 음색은 cut=False: 4비트 볼륨 계단이 조용한 페이드에서 '틱틱' 들리지 않게)
preset('jg_p25', wave='pulse', duty=0.25, env=[8, 12, 12, 11, 10, 10, 9, 9, 8], rel=[0.6, 0.4, 0.2, 0.08],
       sus_decay=0.05, cut=False)
preset('jg_pluck25', wave='pulse', duty=0.25, env=_dec(12, 0.45, attack=[9]), rel=[0.5, 0.2], cut=False)
preset('jg_chime', wave='pulse', duty=0.25, env=_dec(11, 0.4, attack=[8]), rel=[0.5, 0.2], cut=False)
preset('jg_glint', wave='pulse', duty=0.25, env=_dec(10, 0.35), rel=[0.4, 0.1], cut=False)
preset('jg_spark', wave='pulse', duty=0.125, env=[11, 7, 3, 0], rel=[0.0])
preset('jg_hop', wave='pulse', duty=[0.125, 0.25], env=[12, 12, 10, 7, 4, 2, 0], rel=[0.3, 0.0])
preset('jg_type', wave='pulse', duty=0.25, env=[12, 9, 5, 2, 0], rel=[0.0])
preset('jg_jump', wave='pulse', duty=0.25, env=[9, 12, 12, 11, 10, 9, 7, 5, 3, 1], rel=[0.4, 0.15])
preset('jg_boing', wave='pulse', duty=0.25, env=[12, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1],
       rel=[0.5, 0.25, 0.1])
preset('jg_marc', wave='pulse', duty=0.5, env=[13, 14, 12, 11, 11, 10, 10, 10, 9], rel=[0.55, 0.3, 0.12],
       sus_decay=0.03, cut=False)
preset('jg_marc2', wave='pulse', duty=0.5, env=[10, 11, 10, 9, 9, 8, 8, 8, 7], rel=[0.55, 0.3, 0.12],
       sus_decay=0.03, cut=False)
preset('jg_calm', wave='pulse', duty=0.5, env=[3, 5, 7, 8, 8, 8, 8], rel=[0.85, 0.7, 0.55, 0.4, 0.28, 0.18, 0.1],
       sus_decay=0.02, cut=False)
preset('jg_calm_fade', wave='pulse', duty=0.5, env=[6, 8, 8], rel=[0.7, 0.45, 0.25, 0.1], sus_decay=0.075, cut=False)
preset('jg_sleepy', wave='pulse', duty=0.125, env=[2, 4, 6, 7, 7, 7], rel=[0.8, 0.6, 0.4, 0.25, 0.12],
       sus_decay=0.02, cut=False)
preset('jg_tri_sleepy', wave='tri', env=[5, 8, 10, 11, 11, 11], rel=[0.8, 0.6, 0.4, 0.25, 0.12], cut=False,
       sus_decay=0.03)
preset('jg_bell12', wave='pulse', duty=0.125, env=_dec(12, 1.4, attack=[4, 8, 11]), rel=[0.5, 0.2], cut=False)
preset('jg_glock', wave='pulse', duty=0.25, env=_dec(13, 0.9), rel=[0.5, 0.2], cut=False)
preset('jg_bigbell', wave='wave', table='bell', env=_dec(14, 1.6), rel=[0.6, 0.3, 0.1], cut=False)
preset('jg_warmbell', wave='wave', table='flute', env=_dec(13, 1.5, attack=[7, 11]), rel=[0.6, 0.35, 0.15], cut=False)
preset('jg_box', wave='wave', table='sine', env=_dec(12, 0.9), rel=[0.5, 0.2], cut=False)
preset('jg_boxglint', wave='pulse', duty=0.125, env=_dec(7, 0.4), rel=[0.4, 0.1], cut=False)
preset('jg_halo', wave='wave', table='sine', env=[2, 3, 4, 5, 6, 6, 6], rel=[0.85, 0.7, 0.55, 0.4, 0.28, 0.18, 0.1],
       sus_decay=0.05, cut=False)
preset('jg_fan', wave='pulse', duty=0.5, env=[12, 14, 13, 12, 11, 11, 10, 10, 10, 9], rel=[0.6, 0.35, 0.15],
       sus_decay=0.02, cut=False)
preset('jg_fan2', wave='pulse', duty=0.25, env=[9, 11, 10, 9, 9, 8, 8, 8, 7], rel=[0.6, 0.35, 0.15],
       sus_decay=0.02, cut=False)
# 칩 아르페지오 화음(프레임마다 한 음 = 16.7 ms 순환, 04 #23)
preset('jg_shimmer', wave='pulse', duty=0.25, env=_dec(8, 1.0, attack=[5]), arp=[0, 4, 7], rel=[0.5, 0.2], cut=False)
preset('jg_puff', wave='noise', noise=(9, False), env=[8, 6, 4, 2, 0], rel=[0.0], gain=0.7,
       pitch=[0, -1, -2, -3, -4, -5])   # 주기 인덱스가 내려갈수록 높아짐 → "퐁" 상행 스윕


# ------------------------------------------------------------------
# 신호 도우미 (48 kHz)
# ------------------------------------------------------------------
def svf(x, fc, q=0.707, mode='lp'):
    """TPT 상태변수 필터. fc 는 상수 또는 샘플별 배열(시간 변화 OK)."""
    x = np.asarray(x, dtype=np.float64)
    n = len(x)
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), (n,))
    g = np.tan(np.pi * np.clip(fc, 20.0, 0.45 * SR) / SR)
    k = 1.0 / q
    a1 = 1.0 / (1.0 + g * (g + k))
    a2 = g * a1
    a3 = g * a2
    xs, A1, A2, A3 = x.tolist(), a1.tolist(), a2.tolist(), a3.tolist()
    lp = [0.0] * n
    bp = [0.0] * n
    ic1 = ic2 = 0.0
    for i in range(n):
        v3 = xs[i] - ic2
        v1 = A1[i] * ic1 + A2[i] * v3
        v2 = ic2 + A2[i] * ic1 + A3[i] * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        lp[i] = v2
        bp[i] = v1
    if mode == 'lp':
        return np.array(lp)
    if mode == 'bp':
        return np.array(bp) * k
    return x - k * np.array(bp) - np.array(lp)


def curve(pts, n, log=False):
    """[(초, 값), ...] 꺾은선 → 샘플 배열. log=True 면 값(주파수)을 로그로 보간."""
    t = np.arange(n) / SR
    xs = [p[0] for p in pts]
    ys = np.array([p[1] for p in pts], dtype=np.float64)
    if log:
        return np.exp(np.interp(t, xs, np.log(ys)))
    return np.interp(t, xs, ys)


def noise(dur, seed=0):
    return np.random.default_rng(1000 + seed).standard_normal(int(round(dur * SR)))


def nz(dur, fc, mode='bp', q=0.9, env=None, seed=0):
    """필터 노이즈 한 덩이. fc: 숫자 | (시작, 끝) 지수 스윕 | [(초, Hz)...]"""
    x = noise(dur, seed)
    n = len(x)
    if isinstance(fc, tuple):
        f = fc[0] * (fc[1] / fc[0]) ** np.linspace(0, 1, n)
    elif isinstance(fc, list):
        f = curve(fc, n, log=True)
    else:
        f = fc
    y = svf(x, f, q, mode)
    if env:
        y = y * curve(env, n)
    return y


def tone(f0, f1, glide, dur, tau, wave='sine', a=0.002):
    """음정 처프(기포·물방울·새): f0→f1 을 glide 초에 지수 이동, tau 지수 감쇠. tri = 홀수 배음 3개 근사."""
    n = int(round(dur * SR))
    t = np.arange(n) / SR
    k = np.clip(t / glide, 0, 1) if glide > 0 else np.ones(n)
    f = f0 * (f1 / f0) ** k
    ph = 2 * np.pi * np.cumsum(f) / SR
    if wave == 'sine':
        y = np.sin(ph)
    else:
        y = np.sin(ph) - np.sin(3 * ph) / 9 + np.sin(5 * ph) / 25
    return y * np.minimum(1.0, t / a) * np.exp(-t / tau)


def delay(y, d, g, k):
    """피드백 딜레이(반복 k 번, 매번 g 배)"""
    D = int(round(d * SR))
    out = np.concatenate([y, np.zeros(D * k)])
    for i in range(1, k + 1):
        out[i * D:i * D + len(y)] += (g ** i) * y
    return out


def onepole_lp(x, fc):
    a = math.exp(-2 * math.pi * fc / SR)
    return signal.lfilter([1 - a], [1, -a], x)


def onepole_hp(x, fc):
    a = math.exp(-2 * math.pi * fc / SR)
    return signal.lfilter([(1 + a) / 2, -(1 + a) / 2], [1, -a], x)


def win_rms_max(y):
    w = int(0.01 * SR)
    n = len(y) // w
    if n == 0:
        return float(np.sqrt(np.mean(y ** 2)) + 1e-12)
    return float(np.sqrt((y[:n * w].reshape(n, w) ** 2).mean(axis=1).max()) + 1e-12)


R_REF = 0.16   # 날것 층(노이즈·처프) 0 dB = 10 ms RMS 최댓값 0.16 (칩 펄스 한 채널쯤)


# ------------------------------------------------------------------
# 징글 빌더
# ------------------------------------------------------------------
class Jg:
    """칩 채널(박 = 초) + 날것 층 → 모노. 집 소리(chip.mix)와 같은 HP 40 / 2단 LP / 다락방 잔향."""

    def __init__(self, lp=7000.0, hp=40.0, reverb=0.08, ir=0.9):
        self.lp, self.hp, self.reverb, self.ir = lp, hp, reverb, ir
        self.layers = []      # (sig, t0, gain, send)
        self.voices = {}      # 화성 검사용 {이름: [Note]}
        self.melody = None    # 기분 징글: 끝음 검사용
        self.post = []        # 전체 신호 후처리
        self.fit = None       # 정확한 길이(초) — 주어지면 자르기 대신 맞춤
        self.trim = True
        self.cap = None       # (최대 길이 초, 페이드 초) — 스펙 길이 상한
        self.minlen = None    # 꼬리를 자른 뒤 이 길이(초)까지 무음으로 채움

    def ch(self, name, notes, level=1.0, lp=None, dly=None, send=1.0, voice=True):
        notes = list(notes)
        end = max(n.t + n.dur for n in notes) + 1.5
        buf = chip.render_channel(notes, int(math.ceil(end * OSR)), 60.0)
        y = signal.resample_poly(buf, 1, OS)
        wave = chip.get_preset(notes[0].inst)['wave']
        g = level * chip.CH_LEVEL.get(wave, 1.0) * 0.32
        if lp:
            y = onepole_lp(onepole_lp(y, lp), lp * 1.6)
        if dly:
            y = delay(y, *dly)
        self.layers.append((y, 0.0, g, send))
        if voice and wave != 'noise':
            self.voices[name] = notes
            if dly:
                d, gg, k = dly
                for i in range(1, k + 1):
                    self.voices[f'{name}~{i}'] = th.shift(notes, dt=d * i)
        return notes

    def raw(self, sig, t0=0.0, db=0.0, send=1.0, dly=None):
        y = np.asarray(sig, dtype=np.float64)
        y = y / win_rms_max(y) * R_REF * 10 ** (db / 20)
        if dly:
            y = delay(y, *dly)
        self.layers.append((y, t0, 1.0, send))

    def render(self):
        n = max(int(round(t0 * SR)) + len(s) for s, t0, g, snd in self.layers)
        dry = np.zeros(n)
        bus = np.zeros(n)
        for s, t0, g, snd in self.layers:
            a = int(round(t0 * SR))
            dry[a:a + len(s)] += s * g
            bus[a:a + len(s)] += s * g * snd
        out = []
        for x in (dry, bus):
            x = onepole_hp(x, self.hp)
            if self.lp:
                x = onepole_lp(onepole_lp(x, self.lp), self.lp * 1.6)
            out.append(x)
        y = out[0]
        if self.reverb > 0:
            ir = chip.room_ir(self.ir)[0]
            y = y + self.reverb * signal.fftconvolve(out[1], ir)[:n]
        for f in self.post:
            y = f(y)
        if self.cap:
            m, fd = int(round(self.cap[0] * SR)), int(round(self.cap[1] * SR))
            if len(y) > m:
                y = y[:m].copy()
                y[-fd:] *= np.linspace(1, 0, fd) ** 2
        if self.fit:
            m = int(round(self.fit * SR))
            if len(y) >= m:
                y = y[:m].copy()
            else:
                y = np.concatenate([y, np.zeros(m - len(y))])
            f = int(0.02 * SR)
            y[-f:] *= np.linspace(1, 0, f)
        return y


def tv_lp(pts, q=0.6):
    """시간에 따라 닫히는 LPF (후처리)"""
    def f(y):
        return svf(y, curve(pts, len(y), log=True), q, 'lp')
    return f


# ==================================================================
# 출발 · 집에 있기
# ==================================================================
def b_depart_windup():
    # 04 #12: TRI F4↘C4 500 ms(-5 반음), LPF 900 "우우웅", 뒤 200 ms 무음 → 파일 길이 0.8 s 고정
    j = Jg(lp=6000, reverb=0.04)
    slide = [-5.0 * min(1.0, i / 30.0) for i in range(32)]
    j.ch('hum', [N(0.0, 0.5, 'F4', 15, P_('jg_hum', pitch=slide), gate=1.0)], lp=900)
    j.fit = 0.8
    return j


LEAVE_BUBBLES = {1: ('C6', 'D6'), 2: ('D6', 'F6'), 3: ('A5', 'C6')}


def b_depart_leave(v):
    # 04 #13 + 02 §4.6: "뽈"(C5) → 둘째 "뽈"이 C5↗F5 점프(150 ms) → 멀어지는 휙 + 먹물 퍼프 + 기포 2개(변형 = 기포 음)
    j = Jg(lp=7000, reverb=0.05)
    jump = P_('jg_jump', pitch=[min(5.0, 5.0 * i / 9) for i in range(10)])
    j.ch('lead', [N(0.0, 0.07, 'C5', 11, 'jg_hop', gate=0.85), N(0.08, 0.2, 'C5', 12, jump, gate=0.8)])
    j.raw(nz(0.62, (2000, 600), 'bp', 1.1, [(0, 0.2), (0.05, 1), (0.62, 0)], seed=10 + v), 0.18, db=-12)
    j.raw(nz(0.17, 1200, 'lp', 0.7, [(0, 0.3), (0.005, 1), (0.17, 0)], seed=20 + v), 0.18, db=-10)
    b1, b2 = LEAVE_BUBBLES[v]
    j.raw(tone(hz(b1) * 0.69, hz(b1), 0.04, 0.06, 0.025), 0.30, db=-9)
    j.raw(tone(hz(b2) * 0.69, hz(b2), 0.04, 0.06, 0.025), 0.40, db=-11)
    return j


def b_stay_settle(v):
    # 04 #32: windup 을 되돌리는 TRI C4↗F4(+5 반음, 1.03 오버슈트) + "폭신" + 장3도 차임 F5+A5
    j = Jg(lp=7000, reverb=0.05)
    pl = [5.4 * min(1.0, i / 9.0) for i in range(10)] + [5.3, 5.2, 5.1, 5.0]
    j.ch('hum', [N(0.0, 0.22, 'C4', 15, P_('jg_hum', pitch=pl), gate=1.0)], lp=1100)
    j.raw(nz(0.09, 500, 'lp', 0.7, [(0, 0.4), (0.01, 1), (0.09, 0)], seed=30 + v), 0.16, db=-8)
    if v == 1:
        j.ch('c1', [N(0.18, 0.4, 'F5', 12, 'jg_chime')], level=0.8)
        j.ch('c2', [N(0.18, 0.4, 'A5', 11, 'jg_chime')], level=0.8)
    else:
        j.ch('c1', [N(0.18, 0.4, 'F5', 12, 'jg_chime')], level=0.8)
        j.ch('c2', [N(0.23, 0.36, 'A5', 11, 'jg_chime')], level=0.8)
        j.ch('glint', [N(0.23, 0.25, 'F6', 9, 'jg_glint')], level=0.25)
    return j


def b_depart_rain_extra(v):
    # 04 #40: 퍼프 뒤 처마 물방울 두 개(C6 D6), 15 ms 처프 ↗
    j = Jg(lp=8000, reverb=0.04)
    a, b, gap = (('C6', 'D6', 0.13) if v == 1 else ('D6', 'C6', 0.16))
    j.raw(tone(hz(a) / 1.2, hz(a), 0.015, 0.1, 0.03, 'tri'), 0.0, db=0)
    j.raw(tone(hz(b) / 1.2, hz(b), 0.015, 0.1, 0.03, 'tri'), gap, db=-3)
    j.voices = {'d1': [N(0.0, 0.06, a)], 'd2': [N(gap, 0.06, b)]}
    return j


# ==================================================================
# 귀가 · 기억 · 포스터
# ==================================================================
RETURN_MEL = {
    1: [('C5', 0.40, 0.08), ('C5', 0.48, 0.08), ('F5', 0.56, 0.45)],                                  # 뽈뽈 → F
    2: [('C5', 0.40, 0.075), ('C5', 0.475, 0.075), ('A4', 0.55, 0.075), ('C5', 0.625, 0.075), ('F5', 0.70, 0.5)],  # M 머리 → F
    3: [('C5', 0.40, 0.08), ('F5', 0.48, 0.12), ('A5', 0.60, 0.5)],                                   # C→F→A
}


def b_return_home(v):
    # 04 #19 + 02 §4.6: 다가오는 NZ BP 600→2k(400 ms) → 정착 "퐁" TRI F3+F4 → P25 M 머리가 F 로 해결(V–I)
    j = Jg(lp=7500, reverb=0.07)
    j.raw(nz(0.46, (600, 2000), 'bp', 1.0, [(0, 0.3), (0.36, 1.0), (0.42, 0.35), (0.46, 0)], seed=40 + v), 0.0,
          db=-11, send=0.3)
    j.ch('thud1', [N(0.40, 0.07, 'F3', 15, 'jg_thud')], level=0.9)
    j.ch('thud2', [N(0.40, 0.07, 'F4', 11, 'jg_thud')], level=0.6)
    mel = RETURN_MEL[v]
    notes = [N(t, d, p, 12, 'jg_p25', gate=(0.85 if k < len(mel) - 1 else 1.0)) for k, (p, t, d) in enumerate(mel)]
    j.melody = j.ch('lead', notes)
    j.ch('bass', [N(mel[-1][1], 0.5, 'F3', 9, 'jg_tri_soft')], level=0.55)
    return j


REM_DLY = (0.18, 0.5, 3)    # 04 #20: 딜레이 180 ms, 피드백 -6 dB × 3


def rem_base(reverb=0.06):
    j = Jg(lp=2500, reverb=reverb, ir=1.0)
    # 12개를 같은 측정(LUFS)으로 맞춘다: 1.5 s 미만이면 export 가 active RMS 로 재는데,
    # 에코 꼬리까지 '소리'로 세어 실제보다 1.5–2 dB 크게 나간다(드문드문한 소리 측정 문제).
    j.minlen = 1.5
    return j


def b_rem_hands():
    j = rem_base()
    j.ch('wood', [N(0.0, 0.012, 'G5', 13, 'jg_wood'), N(0.11, 0.012, 'D5', 13, 'jg_wood')], level=0.8, dly=REM_DLY,
         voice=False)
    j.ch('click', [N(0.0, 0.01, None, 6, 'tick'), N(0.11, 0.01, None, 6, 'tick')], level=0.5)
    j.melody = j.ch('mem', [N(0.22, 0.15, 'C5', 14, 'jg_tri', 0.9), N(0.37, 0.5, 'F5', 15, 'jg_tri')], dly=REM_DLY)
    return j


def b_rem_sea():
    j = rem_base()
    j.raw(tone(hz('C6') * 0.69, hz('C6'), 0.035, 0.06, 0.03), 0.0, db=-6, dly=REM_DLY)
    j.raw(tone(hz('F6') * 0.69, hz('F6'), 0.035, 0.06, 0.03), 0.07, db=-8, dly=REM_DLY)
    wob = P_('jg_tri', vib=(10, 0.15, 4.0))
    j.melody = j.ch('mem', [N(0.16, 0.14, 'A4', 14, 'jg_tri', 0.9), N(0.30, 0.14, 'C5', 14, 'jg_tri', 0.9),
                            N(0.44, 0.55, 'F5', 15, wob)], dly=REM_DLY)
    return j


def b_rem_sky():
    j = rem_base()
    j.melody = j.ch('mem', [N(0.0, 0.3, 'F5', 14, 'jg_tri', 0.95), N(0.3, 0.7, 'C6', 15, 'jg_tri_long')], dly=REM_DLY)
    j.raw(nz(1.4, [(0, 500), (0.7, 950), (1.4, 550)], 'bp', 1.6, [(0, 0.3), (0.6, 1), (1.4, 0)], seed=51), 0.0,
          db=-13, send=0.3)
    return j


def b_rem_signs():
    j = rem_base()
    j.melody = j.ch('type', [N(0.0, 0.06, 'D5', 12, 'jg_type'), N(0.10, 0.06, 'D5', 12, 'jg_type'),
                             N(0.20, 0.35, 'F5', 13, 'jg_pluck25')], dly=REM_DLY, level=0.8)
    j.ch('keys', [N(t, 0.02, None, 7, 'woodblk') for t in (0.0, 0.10, 0.20)], level=0.7)
    return j


def b_rem_numbers():
    j = rem_base()
    j.melody = j.ch('mem', [N(0.0, 0.12, 'F5', 14, 'jg_tri', 0.8), N(0.16, 0.12, 'G5', 14, 'jg_tri', 0.8),
                            N(0.32, 0.4, 'A5', 15, 'jg_tri')], dly=REM_DLY)
    j.ch('tick', [N(t, 0.02, None, 5, 'tick') for t in (0.0, 0.16, 0.32)], level=0.5)
    return j


def b_rem_sounds():
    j = rem_base()
    j.melody = j.ch('mem', [N(0.0, 0.1, 'C5', 14, 'jg_tri', 0.8), N(0.24, 0.1, 'C5', 14, 'jg_tri', 0.8),
                            N(0.36, 0.45, 'F5', 15, 'jg_tri')], dly=REM_DLY)
    j.ch('hat', [N(0.12, 0.05, None, 8, 'hat'), N(0.36, 0.05, None, 6, 'shaker')], level=0.6)
    return j


def b_rem_home():
    j = rem_base()
    j.ch('m1', [N(0.0, 0.6, 'F4', 14, 'jg_tri_long')], level=0.65, dly=REM_DLY)
    j.ch('m2', [N(0.05, 0.55, 'A4', 13, 'jg_tri_long')], level=0.65, dly=REM_DLY)
    j.melody = j.ch('m3', [N(0.10, 0.5, 'C5', 13, 'jg_tri_long')], level=0.65, dly=REM_DLY)
    return j


def b_rem_mind():
    j = rem_base(reverb=0.1)
    vib = P_('jg_tri', vib=(6, 0.2, 5.0))
    vibl = P_('jg_tri_long', vib=(6, 0.2, 5.0))
    j.melody = j.ch('mem', [N(0.0, 0.2, 'A5', 14, vib), N(0.2, 0.2, 'F5', 14, vib), N(0.4, 0.6, 'C6', 15, vibl)],
                    dly=(0.18, 0.6, 4))
    return j


def b_rem_wild():
    j = rem_base()
    j.melody = j.ch('mem', [N(0.0, 0.15, 'C5', 14, 'jg_tri', 0.9), N(0.15, 0.15, 'G5', 14, 'jg_tri', 0.9),
                            N(0.30, 0.5, 'D6', 15, 'jg_tri')], dly=REM_DLY)
    j.ch('step', [N(t, 0.03, None, 4, 'tick') for t in (0.0, 0.15, 0.30)], level=0.4)
    return j


def b_rem_slow_room():
    j = rem_base()
    j.melody = j.ch('mem', [N(0.0, 0.9, 'F4', 14, 'jg_tri_long'), N(0.9, 0.9, 'C5', 14, 'jg_tri_long')], dly=REM_DLY)
    return j


PAPER_ENV = [(0, 0.5), (0.02, 1), (0.05, 0.4), (0.08, 0.9), (0.12, 0.3), (0.16, 0.7), (0.22, 0)]


def b_rem_letter_room():
    j = rem_base()
    j.raw(nz(0.22, (1200, 2600), 'bp', 0.8, PAPER_ENV, seed=61), 0.0, db=-7)
    j.melody = j.ch('mem', [N(0.15, 0.6, 'A4', 13, 'jg_tri_long')], dly=REM_DLY)
    return j


def b_rem_door_out():
    # simulated 와 같은 색: 똑똑(TRI C4 25 ms ×2, 110 ms) + P50 LPF 1.2k C5→D5 + 에코 90 ms -9 dB ×2
    j = Jg(lp=2500, reverb=0.05)
    j.minlen = 1.5
    j.ch('knock', [N(0.0, 0.025, 'C4', 15, 'jg_knock'), N(0.11, 0.025, 'C4', 15, 'jg_knock')], level=0.9,
         voice=False)
    j.ch('click', [N(0.0, 0.01, None, 5, 'tick'), N(0.11, 0.01, None, 5, 'tick')], level=0.4)
    soft = P_('lead_soft', vib=None, cut=False)
    j.melody = j.ch('door', [N(0.25, 0.12, 'C5', 12, soft, 0.9), N(0.40, 0.45, 'D5', 12, soft)], lp=1200,
                    dly=(0.09, 0.355, 2), level=1.3)
    return j


REMEMBER = {
    'hands': (b_rem_hands, '손과 물건', '나무 톡톡(TRI G5·D5 10 ms+클릭, 뽈뽈 리듬) + C5 F5'),
    'sea': (b_rem_sea, '바다와 생물', '기포 SIN ↗(→C6, →F6) + A4 C5 F5(느린 물결 비브라토)'),
    'sky': (b_rem_sky, '하늘과 날씨', 'F5 C6(열린 5도) + 바람 NZ BP 500→950→550 Hz'),
    'signs': (b_rem_signs, '기호와 언어', 'P25 타자 D5 D5 F5 + 키 딸깍(짧은 모드 노이즈)'),
    'numbers': (b_rem_numbers, '수와 모양', 'F5 G5 A5 고른 걸음(하나 둘 셋) + 틱'),
    'sounds': (b_rem_sounds, '소리와 리듬', 'C5 (쉼) C5 F5 당김음 + 쉼 자리 햇'),
    'home': (b_rem_home, '집과 사람', 'TRI 화음 F4 A4 C5 를 50 ms씩 굴림'),
    'mind': (b_rem_mind, '생각하는 것', 'A5 F5 C6 + 비브라토, 에코 4번(피드백 -4.4 dB)'),
    'wild': (b_rem_wild, '들판(미지)', 'C5 G5 D6 넓은 도약 + 발걸음 틱'),
    'slow_room': (b_rem_slow_room, '느린 글의 방', 'F4 … C5, 900 ms 간격'),
    'letter_room': (b_rem_letter_room, '편지의 방', '종이 소리(NZ BP 1.2→2.6k) + A4 하나(중립, 항상 비어 있음)'),
    'door_out': (b_rem_door_out, '밖의 문', '똑똑(TRI C4) + P50 LPF 1.2k C5→D5 + 90 ms 에코 2번(simulated 색)'),
}


def b_hang_poster(v):
    # 04 #21 + 02 §4.6: 0 ms 종이 / 500 ms 핀 "톡" / 650 ms 스티커 펼친 화음 (우쭐 축소판 I–V–I)
    j = Jg(lp=7000, reverb=0.07)
    j.raw(nz(0.22, (1000, 3000), 'bp', 0.9, PAPER_ENV, seed=70 + v), 0.0, db=-8)
    j.ch('pin', [N(0.50, 0.015, 'C6', 14, 'jg_wood')], level=0.8)
    j.ch('click', [N(0.50, 0.01, None, 7, 'tick')], level=0.5)
    if v == 1:
        stk = [N(0.65, 0.06, 'A5', 12, P_('jg_p25', pitch=[0, 1.5, 3.0]), 0.95)]       # A5↗C6
        chord = [('F5', 0.71), ('A5', 0.74), ('C6', 0.77)]
        bass = [N(0.71, 0.45, 'F3', 9, 'jg_tri_soft')]
    else:
        stk = [N(0.65, 0.06, 'G5', 12, P_('jg_p25', pitch=[0, 2.5, 5.0]), 0.95)]       # G5↗C6 (V)
        chord = [('A5', 0.71), ('C6', 0.74), ('F6', 0.77)]
        bass = [N(0.65, 0.06, 'C3', 9, 'jg_tri_soft', 1.0), N(0.71, 0.45, 'F3', 9, 'jg_tri_soft')]
    j.melody = j.ch('stk', stk, level=0.9)
    for k, (p, t) in enumerate(chord):
        j.ch(f'c{k}', [N(t, 0.45, p, 12, 'jg_pluck25')], level=0.7)
    j.ch('bass', bass, level=0.55)
    return j


# ==================================================================
# 등불 · 방 완성 · 히어로
# ==================================================================
LANTERN = ['F5', 'G5', 'A5', 'Bb5', 'C6', 'D6', 'E6', 'F6']
LANTERN_SEQ = ['C5', 'C5'] + LANTERN          # 1칸의 꾸밈음 = M 머리 "C C"(뽈뽈)
LANTERN_ROOT = {1: 'F3', 2: 'C3', 3: 'F3', 4: 'Bb2', 5: 'F3', 6: 'Bb2', 7: 'C3'}
LANTERN_CHORD = {1: 'I', 2: 'V', 3: 'I', 4: 'IV', 5: 'I', 6: 'IV', 7: 'V'}


def b_lantern(n):
    # 04 #22: 앞 칸 음 두 개 40 ms 꾸밈음(-9) → 본음 TRI A3 D600 + P25 옥타브 위(-12) + "화륵" NZ LPF 1k(-18)
    # 덧: 아주 작은 TRI 근음(I/V/IV) — 7칸 E6 은 V 위 이끎음으로 남아 방 완성 F6 으로 풀린다.
    j = Jg(lp=7500, reverb=0.07)
    j.raw(nz(0.13, 1000, 'lp', 0.7, [(0, 0.3), (0.03, 1), (0.13, 0)], seed=80 + n), 0.0, db=-16)
    g1, g2, main = LANTERN_SEQ[n - 1], LANTERN_SEQ[n], LANTERN[n - 1]
    j.melody = j.ch('tri', [N(0.0, 0.04, g1, 5, 'jg_tri', 1.0), N(0.04, 0.04, g2, 5, 'jg_tri', 1.0),
                            N(0.08, 0.6, main, 15, 'jg_tri')])
    j.ch('glint', [N(0.08, 0.35, P(main) + 12, 15, 'jg_glint')], level=0.25)
    j.ch('bass', [N(0.08, 0.5, LANTERN_ROOT[n], 9, 'jg_tri_soft')], level=0.35)
    return j


def chord_voices(j, name, t, dur, tones):
    for k, p in enumerate(tones):
        j.voices[f'{name}{k}'] = [N(t, dur, p)]


def b_room_complete():
    """
    히어로(2–6 s, BGM 일시정지). 세 장면:
      A 0.00–0.9  8번째 등불: 꾸밈음 D6 E6(7칸의 이끎음이 여기서 풀림) → F6 종 + F 화음 칩 아르페지오 + TRI F3→F2
      B 1.00–3.9  M 팡파르(8분 = 0.2 s): C6 C6 A5 C6 | D6. C6 | F6— , 3도 아래 화성, 베이스 I–IV–V–I, 스네어 롤
      C 2.9–4.4   P12 반짝 C7·D7·F7 ×6 (-18), 꼬리는 LPF 가 닫히며 끝
    """
    j = Jg(lp=7500, reverb=0.10, ir=1.1)
    # A
    j.ch('tri', [N(0.0, 0.04, 'D6', 5, 'jg_tri', 1.0), N(0.04, 0.04, 'E6', 6, 'jg_tri', 1.0),
                 N(0.08, 0.9, 'F6', 15, 'jg_tri_long')], level=0.9)
    j.ch('bell', [N(0.08, 1.1, 'F6', 13, 'jg_bigbell')], level=0.7)
    j.ch('glint', [N(0.08, 0.35, 'F7', 12, 'jg_glint')], level=0.2)
    j.ch('arp1', [N(0.08, 0.85, 'F5', 12, 'jg_shimmer')], level=0.55, voice=False)
    chord_voices(j, 'arp1_', 0.08, 0.85, ['F5', 'A5', 'C6'])
    j.raw(nz(0.22, 1500, 'lp', 0.7, [(0, 0.3), (0.03, 1), (0.22, 0)], seed=90), 0.06, db=-14)
    # B
    s = 0.2
    lead = [('C6', 1.00, s), ('C6', 1.20, s), ('A5', 1.40, s), ('C6', 1.60, s), ('D6', 1.80, 3 * s),
            ('C6', 2.40, s), ('F6', 2.60, 1.3)]
    harm = [('A5', 1.00, s), ('A5', 1.20, s), ('F5', 1.40, s), ('A5', 1.60, s), ('Bb5', 1.80, 3 * s),
            ('G5', 2.40, s), ('A5', 2.60, 1.3)]
    fan = P_('jg_fan', vib=(9, 0.2, 6.0))
    j.melody = j.ch('lead', [N(t, d, p, 13, fan if p == 'F6' else 'jg_fan', 0.95 if d > s else 0.82)
                             for p, t, d in lead], level=0.9)
    j.ch('harm', [N(t, d, p, 12, 'jg_fan2', 0.95 if d > s else 0.82) for p, t, d in harm], level=0.6)
    j.ch('bass', [N(0.08, 0.35, 'F3', 15, 'bass', 0.9), N(0.43, 0.5, 'F2', 15, 'bass', 0.9),
                  N(1.00, 0.8, 'F3', 15, 'bass', 0.9), N(1.80, 0.6, 'Bb2', 15, 'bass', 0.9),
                  N(2.40, 0.2, 'C3', 15, 'bass', 0.9), N(2.60, 1.3, 'F3', 15, 'bass', 0.95)], level=0.7)
    j.ch('arp2', [N(2.60, 1.3, 'F5', 10, 'jg_shimmer')], level=0.45, voice=False)
    chord_voices(j, 'arp2_', 2.60, 1.3, ['F5', 'A5', 'C6'])
    j.ch('roll', [N(2.30 + 0.0375 * k, 0.0375, None, int(round(3 + k * 0.6)), 'snare', 0.9, seed=k)
                  for k in range(8)], level=0.5)
    j.raw(nz(0.9, 4000, 'lp', 0.7, [(0, 1), (0.9, 0)], seed=91) * np.exp(-np.arange(int(0.9 * SR)) / SR / 0.25),
          2.60, db=-16)
    # C
    sp_t = [2.95, 3.12, 3.33, 3.50, 3.71, 3.95]
    sp_p = ['C7', 'F7', 'D7', 'C7', 'F7', 'D7']
    j.ch('spark', [N(t, 0.025, p, 11, 'jg_spark', 1.0) for t, p in zip(sp_t, sp_p)], level=0.3, voice=False)
    j.post.append(tv_lp([(0, 9000), (3.3, 9000), (4.8, 1200), (6.0, 900)]))
    return j


def b_first_place():
    # 04 #24: (M 머리 C5 C5) → P25 F5 G5 A5 C6 D6 50 ms 씩 → F6 600 ms, 150 ms 뒤 비브라토 6 Hz ±20 c, TRI F4→C5
    j = Jg(lp=7500, reverb=0.08)
    run = ['C5', 'C5', 'F5', 'G5', 'A5', 'C6', 'D6']
    notes = [N(0.05 * k, 0.05, p, 12, 'jg_p25', 0.9) for k, p in enumerate(run)]
    notes.append(N(0.35, 0.75, 'F6', 13, P_('jg_p25', vib=(9, 0.2, 6.0), sus_decay=0.04), 1.0))
    j.melody = j.ch('lead', notes)
    j.ch('echo', th.shift(notes, dt=0.09, vel=lambda v: max(1, v - 5), inst=P_('echo', cut=False)), level=0.6)
    j.ch('bass', [N(0.10, 0.25, 'F4', 11, 'jg_tri_soft', 1.0), N(0.35, 0.7, 'C5', 11, 'jg_tri_soft')], level=0.6)
    return j


def b_rare_sparkle():
    # 04 #25: (반짝 "뽈뽈" C7 C7) → P25/P12 칩 아르페지오 F6 A6 C7 500 ms, LPF 6k + 반짝 {C7 D7 F7} P12 ×6 (-16)
    j = Jg(lp=6000, reverb=0.06)
    j.ch('pip', [N(0.0, 0.025, 'C7', 11, 'jg_spark', 1.0), N(0.06, 0.025, 'C7', 11, 'jg_spark', 1.0)], level=0.5)
    j.ch('arpA', [N(0.12, 0.5, 'F6', 12, 'jg_shimmer')], level=0.8, voice=False)
    j.ch('arpB', [N(0.12, 0.5, 'F6', 10, P_('jg_shimmer', duty=0.125, arp=[4, 7, 12]))], level=0.5, voice=False)
    chord_voices(j, 'arp_', 0.12, 0.5, ['F6', 'A6', 'C7', 'F7'])
    rng = np.random.default_rng(25)
    ts = np.sort(rng.uniform(0.18, 0.92, 6))
    ps = ['C7', 'D7', 'F7', 'C7', 'F7', 'D7']
    j.ch('spark', [N(float(t), 0.025, p, 11, 'jg_spark', 1.0) for t, p in zip(ts, ps)], level=0.2, voice=False)
    return j


# ==================================================================
# 기분 4 (02 §4.5 + 04 #26–29). 선율은 F 펜타, 마지막 선율 음 = F.
# ==================================================================
def b_mood_poljjak():
    """폴짝(신남) 160 BPM: M 머리 → F5 A5 C6 스타카토 상행 → F5↗F6 옥타브 점프 "뿅"(+1 반음 ↗↘)."""
    j = Jg(lp=7500, reverb=0.05)
    s = 60 / 160 / 4
    mel = [('C5', 0), ('C5', 1), ('A4', 2), ('C5', 3), ('F5', 4), ('A5', 6), ('C6', 8), ('F5', 10), ('F6', 11)]
    boing = P_('jg_boing', pitch=[0, 0.25, 0.5, 0.75, 1.0, 1.0, 0.8, 0.6, 0.4, 0.2, 0.0])
    lead = [N(k * s, s, p, 12, 'jg_hop', 0.62) for p, k in mel[:-1]]
    lead.append(N(11 * s, 0.42, 'F6', 13, boing, 0.9))
    j.melody = j.ch('lead', lead)
    up = {'C': 'F', 'A': 'C', 'F': 'A'}               # "3도 위 메아리" = F 화음 안에서 한 칸 위 화음음

    def above(p):
        q = up[p[0]]
        o = int(p[-1]) + (1 if p[0] == 'C' else 0)
        return f'{q}{o}'
    echo = [N(k * s + s, s, above(p), 8, 'jg_hop', 0.62) for p, k in mel[:-1]]
    echo.append(N(12 * s, 0.3, 'F6', 8, 'jg_hop', 0.9))
    j.ch('echo', echo, level=0.6)
    j.ch('bass', [N(4 * s, 2 * s, 'F3', 12, 'jg_tri', 0.5), N(6 * s, 2 * s, 'A3', 12, 'jg_tri', 0.5),
                  N(8 * s, 2 * s, 'C4', 12, 'jg_tri', 0.5), N(11 * s, 0.35, 'F3', 13, 'jg_tri', 0.8)], level=0.5)
    j.ch('poof', [N(11 * s, 0.1, None, 9, 'jg_puff')], level=0.5)
    return j


def b_mood_ujjul():
    """우쭐(뿌듯) 112 BPM 점리듬 팡파르 I–IV–V–I: (M 머리 점리듬) C5. C5 A4. C5 | D5. F5 | G5 | F5—(비브라토 "에헴")."""
    j = Jg(lp=7000, reverb=0.08)
    b = 60 / 112
    lead = [('C5', 0, 0.75), ('C5', 0.75, 0.25), ('A4', 1, 0.75), ('C5', 1.75, 0.25), ('D5', 2, 0.75),
            ('F5', 2.75, 0.25), ('G5', 3, 1.0), ('F5', 4, 1.6)]
    harm = [('A4', 0, 0.75), ('A4', 0.75, 0.25), ('F4', 1, 0.75), ('A4', 1.75, 0.25), ('Bb4', 2, 0.75),
            ('D5', 2.75, 0.25), ('E5', 3, 1.0), ('A4', 4, 1.6)]
    bass = [('F3', 0, 2), ('Bb2', 2, 1), ('C3', 3, 1), ('F3', 4, 1.6)]

    def gate(d):
        return 0.95 if d >= 1.0 else (0.85 if d >= 0.5 else 0.7)
    eh = P_('jg_marc', vib=(12, 0.15, 5.0))
    eh2 = P_('jg_marc2', vib=(12, 0.15, 5.0))
    j.melody = j.ch('lead', [N(t * b, d * b, p, 13, eh if t == 4 else 'jg_marc', gate(d)) for p, t, d in lead])
    j.ch('harm', [N(t * b, d * b, p, 12, eh2 if t == 4 else 'jg_marc2', gate(d)) for p, t, d in harm], level=0.7)
    j.ch('bass', [N(t * b, d * b, p, 15, 'bass', 0.9) for p, t, d in bass], level=0.8)
    j.ch('roll', [N((3 + k * 0.125) * b, 0.125 * b, None, int(round(3 + k * 0.6)), 'snare', 0.9, seed=k)
                  for k in range(8)], level=0.6)
    n = int(0.7 * SR)
    j.raw(nz(0.7, 5000, 'lp', 0.7, seed=95) * np.exp(-np.arange(n) / SR / 0.18), 4 * b, db=-15)
    j.cap = (3.5, 0.3)
    return j


def b_mood_deomdeom():
    """
    덤덤(담담) 72 BPM: P1 50% 레가토 C5 C5 → F4(동음 반복 + 열린 5도 하행, 3음 없는 선율), 비브라토 없음.
    TRI 한 음 A3 이 끝음 밑에 들어온다 → 마지막 울림이 F/A(첫자리바꿈). 근음 위 완전종지를 피해
    '3음(A)에서 멈춘' 열린 끝이 되면서도 선율 끝음은 F (기분 징글 규칙).
    """
    j = Jg(lp=6500, reverb=0.08)
    j.melody = j.ch('lead', [N(0.0, 0.28, 'C5', 12, 'jg_calm', 1.0), N(0.28, 0.42, 'C5', 12, 'jg_calm', 1.0),
                             N(0.70, 1.3, 'F4', 12, 'jg_calm', 0.98)])
    j.ch('tri', [N(0.70, 1.35, 'A3', 9, 'jg_tri_hold', 0.95)], level=0.55)
    return j


def b_mood_jollim():
    """
    졸림 63→45 BPM 리타르단도: D5 C5 A4 F4 펜타 하행이 F 로 해결(B♭→F 변격 종지).
    TRI 선율 + P1 12.5% 작게 겹침, 끝음 F4 는 -25 c 처지고 비브라토가 점점 느려짐, LPF 3k→800, 하품 숨결.
    """
    j = Jg(lp=6000, reverb=0.10, ir=1.2)
    mel = [('D5', 0.0, 0.42), ('C5', 0.44, 0.48), ('A4', 0.94, 0.64), ('F4', 1.60, 1.3)]
    nf = int(1.3 * FR) + 12
    ph, sag = 0.0, []
    for i in range(nf):
        rate = 4.5 - 2.5 * min(1.0, i / nf)
        ph += 2 * math.pi * rate / FR
        depth = 0.10 * min(1.0, max(0.0, (i - 12) / 10.0))
        sag.append(-0.25 * min(1.0, i / (1.3 * FR)) ** 1.5 + depth * math.sin(ph))
    tri = [N(t, d, p, 13, P_('jg_tri_sleepy', pitch=sag) if p == 'F4' else 'jg_tri_sleepy', 0.97)
           for p, t, d in mel]
    j.melody = j.ch('tri', tri)
    j.ch('p12', [N(t, d, p, 10, P_('jg_sleepy', pitch=sag) if p == 'F4' else 'jg_sleepy', 0.97)
                 for p, t, d in mel], level=0.35, voice=False)
    j.ch('bass', [N(0.0, 0.94, 'Bb2', 11, 'bass_soft', 0.95), N(0.94, 2.0, 'F2', 11, 'bass_soft', 0.95)], level=0.6)
    j.raw(nz(1.0, 800, 'lp', 0.7, [(0, 0.3), (0.45, 1), (1.0, 0)], seed=99), 0.0, db=-16, send=0.3)
    j.post.append(tv_lp([(0, 3000), (1.0, 2200), (2.9, 800)], q=0.6))
    j.cap = (3.5, 0.45)
    return j


# ==================================================================
# 잠
# ==================================================================
def b_sleep_settle():
    # 04 #30: 이불 NZ LPF 1.5k 400 ms + TRI F3 허밍 페이드(+F4 오카리나 아주 작게: 폰 스피커용)
    j = Jg(lp=5000, reverb=0.06)
    j.raw(nz(0.42, 1500, 'lp', 0.7, [(0, 0.4), (0.05, 1), (0.12, 0.5), (0.2, 0.9), (0.3, 0.4), (0.42, 0)],
             seed=101), 0.0, db=-4)
    j.melody = j.ch('hum', [N(0.05, 0.55, 'F3', 13, P_('jg_tri_hold', vib=(10, 0.08, 4.0)), 1.0)], level=0.9)
    j.ch('oc', [N(0.08, 0.5, 'F4', 6, P_('ocarina', cut=False), 1.0)], level=0.3)
    return j


SNORE_LEN = {1: 3.7, 2: 4.1, 3: 4.6}


def b_snore(k):
    # 04 #31: 들숨 NZ BP 400→900 Hz 1.4 s → 0.3 s 멈춤 → 날숨 NZ LPF 600 1.6 s. 2번 파일만 TRI "푸우" C5↘A4(-26).
    L = SNORE_LEN[k]
    kf = {1: 1.0, 2: 1.08, 3: 1.18}[k]
    inh, exh = 1.4 * kf, 1.6 * kf
    j = Jg(lp=4000, reverb=0.0)
    j.raw(nz(inh, (400, 900), 'bp', 1.3, [(0, 0.15), (0.5 * inh, 0.6), (0.85 * inh, 1.0), (inh, 0)], seed=110 + k),
          0.0, db=0)
    t1 = inh + 0.3
    j.raw(nz(exh, 600, 'lp', 0.7, [(0, 0), (0.12, 1), (0.6 * exh, 0.55), (exh, 0)], seed=120 + k), t1, db=1)
    if k == 2:
        slide = [-3.0 * min(1.0, i / 40.0) for i in range(42)]
        j.ch('puu', [N(t1 + 0.1, 0.9, 'C5', 9, P_('jg_tri_hold', pitch=slide), 1.0)], level=0.6)
    j.fit = L
    j.trim = False
    return j


# ==================================================================
# 시간대 종 (02 §3.4 §4.6: TRI + P1 12.5% F–C–F, 2–3 s) — 같은 뼈대, 시간대마다 다른 색
# ==================================================================
def b_chime_dawn():
    """새벽: 높고 가벼움. F5↗C6↗F6 상행(깨어남), P12 종 부드러운 어택 + G6·C7 사인 후광 + 새 한 마리(04 #44)."""
    j = Jg(lp=6500, reverb=0.14, ir=1.4)
    for k, (p, t) in enumerate([('F5', 0.0), ('C6', 0.34), ('F6', 0.68)]):
        j.ch(f'b{k}', [N(t, 1.4, p, 11 + (k == 2), 'jg_bell12')], level=0.8)
    j.melody = j.ch('tri', [N(0.0, 0.34, 'F5', 9, 'jg_tri'), N(0.34, 0.34, 'C6', 9, 'jg_tri'),
                            N(0.68, 1.0, 'F6', 10, 'jg_tri_long')], level=0.5)
    j.ch('h1', [N(0.95, 0.9, 'G6', 8, 'jg_halo')], level=0.35)
    j.ch('h2', [N(1.05, 0.8, 'C7', 8, 'jg_halo')], level=0.3)
    j.ch('ped', [N(0.0, 1.8, 'F4', 7, 'jg_tri_hold')], level=0.3)
    t = 1.6
    for f0, f1, d in ((2600, 3300, 0.035), (3300, 2900, 0.035), (2800, 3400, 0.04)):
        j.raw(tone(f0, f1, d, d + 0.01, 0.03), t, db=-15, send=0.6)
        t += d + 0.025
    return j


def b_chime_day():
    """낮: 밝고 또렷함. M 머리 C6 C6 픽업 → 글록(P25) F5↗C6↗F6 빠르게 + 종 → F 화음 반짝 A6 C7."""
    j = Jg(lp=7500, reverb=0.09, ir=1.0)
    j.ch('pk', [N(0.0, 0.09, 'C6', 11, 'jg_hop', 0.7), N(0.09, 0.09, 'C6', 11, 'jg_hop', 0.7)], level=0.7)
    for k, (p, t) in enumerate([('F5', 0.20), ('C6', 0.36), ('F6', 0.52)]):
        j.ch(f'g{k}', [N(t, 0.9, p, 12, 'jg_glock')], level=0.75)
    j.melody = j.ch('tri', [N(0.20, 0.16, 'F5', 10, 'jg_tri'), N(0.36, 0.16, 'C6', 10, 'jg_tri'),
                            N(0.52, 0.8, 'F6', 11, 'jg_tri_long')], level=0.5)
    j.ch('bell', [N(0.52, 1.2, 'F6', 11, 'jg_bigbell')], level=0.45)
    j.ch('sp', [N(0.80, 0.08, 'A6', 9, 'jg_glint', 1.0), N(0.88, 0.3, 'C7', 9, 'jg_glint')], level=0.3)
    return j


def b_chime_dusk():
    """노을: 따뜻하고 낮음. F5↘C5↘F4 하행(하루를 접음), 플루트 파형 종 + 점8분 느낌 에코, TRI B♭2→F2 변격(아멘)."""
    j = Jg(lp=5000, reverb=0.12, ir=1.3)
    for k, (p, t) in enumerate([('F5', 0.0), ('C5', 0.42), ('F4', 0.84)]):
        j.ch(f'b{k}', [N(t, 1.5, p, 12, 'jg_warmbell')], level=0.8, dly=(0.28, 0.35, 2))
    j.melody = j.ch('tri', [N(0.0, 0.42, 'F5', 8, 'jg_tri'), N(0.42, 0.42, 'C5', 8, 'jg_tri'),
                            N(0.84, 1.0, 'F4', 9, 'jg_tri_long')], level=0.4)
    j.ch('bass', [N(0.0, 0.84, 'Bb2', 10, 'jg_tri_hold', 0.97), N(0.84, 1.6, 'F2', 10, 'jg_tri_hold', 0.97)],
         level=0.55)
    return j


def b_chime_night():
    """밤: 오르골. F5↗C6 C6↘F5 흔들의자(M 의 동음 C C), 사인 오르골 + 두 옥타브 위 P12 아주 작게, TRI F3 페달."""
    j = Jg(lp=4500, reverb=0.16, ir=1.5)
    line = [('F5', 0.0, 0.48), ('C6', 0.48, 0.24), ('C6', 0.72, 0.38), ('F5', 1.10, 1.2)]
    j.melody = j.ch('box', [N(t, d, p, 11, 'jg_box', 0.95) for p, t, d in line])
    j.ch('box2', [N(t, d, P(p) - 12, 7, 'jg_box', 0.95) for p, t, d in line], level=0.4)
    j.ch('glint', [N(t, d, P(p) + 24, 7, 'jg_boxglint', 0.9) for p, t, d in line], level=0.15)
    j.ch('ped', [N(0.0, 2.2, 'F3', 7, 'jg_tri_hold')], level=0.3)
    return j


def b_letter_room():
    """편지의 방 진입(02 §4.4): TRI F3 페달 + P1 50% 로 M 의 첫 음 C5 다음 G5(2음)에서 멈춤. 열린 5도, 답 없는 질문(중립)."""
    j = Jg(lp=5000, reverb=0.12, ir=1.4)
    j.ch('ped', [N(0.0, 2.0, 'F3', 9, 'jg_tri_fade', 1.0)], level=0.6)
    j.melody = j.ch('lead', [N(0.0, 0.375, 'C5', 11, 'jg_calm', 0.92), N(0.375, 1.5, 'G5', 11, 'jg_calm_fade', 1.0)])
    return j


# ==================================================================
# 목록 (id, 빌더, rel_db, meta)
# ==================================================================
EV_DUCK = dict(duck_attack_ms=70, duck_release_ms=750)      # 04 §1.5
MOOD_DUCK = dict(duck_attack_ms=60, duck_release_ms=500)    # 02 §3.5
HERO_DUCK = dict(duck_attack_ms=70, duck_release_ms=900)


def M(trigger, group, duck_db, quantize, notes, pause_bgm=False, **extra):
    d = dict(trigger=trigger, group=group, duck_db=duck_db, quantize=quantize, pause_bgm=pause_bgm, notes=notes)
    d.update(extra)
    return d


def specs():
    S = []
    S.append(('depart_windup', b_depart_windup, -10, M(
        '출발·집에 있기 공통 움츠림이 시작될 때(600 ms 움츠림 + 200 ms 정지와 함께)', 'depart_windup', 0, 'none',
        'TRI F4↘C4 500 ms(-5 반음), LPF 900 "우우웅" + 200 ms 무음. 파일 0.8 s 고정. 이어서 depart_leave 또는 stay_settle')))
    for v in (1, 2, 3):
        b1, b2 = LEAVE_BUBBLES[v]
        S.append((f'depart_leave_{v}', lambda v=v: b_depart_leave(v), -4, M(
            '출발: 움츠림이 끝나고 문어가 호를 그리며 나갈 때(셔플백, 직전 변형 반복 금지)', 'depart_leave', -2, 'none',
            f'P25 "뽈" C5 → 둘째 "뽈" C5↗F5 점프 150 ms(M 머리 C C). NZ BP 2k→600 Hz 600 ms 멀어짐(-12), '
            f'먹물 퍼프 NZ LPF 1.2k(-10), 기포 SIN ↗{b1}·{b2}. 덕킹 -2 는 선택', variant=v, **EV_DUCK)))
    for v in (1, 2):
        S.append((f'stay_settle_{v}', lambda v=v: b_stay_settle(v), -4, M(
            '집에 있기로 정했을 때(같은 움츠림 뒤 다른 결말, 1.03 오버슈트 모션과 함께)', 'stay_settle', 0, 'none',
            'TRI C4↗F4(+5 반음, 오버슈트 후 정착) LPF 1.1k + "폭신" NZ LPF 500 + 장3도 차임 F5+A5 400 ms'
            + (' (동시)' if v == 1 else ' (F5→A5 50 ms 굴림 + F6 반짝)'), variant=v)))
    for v in (1, 2):
        S.append((f'depart_rain_extra_{v}', lambda v=v: b_depart_rain_extra(v), -14, M(
            '비·가는 비 날 출발할 때 depart_leave 의 퍼프 직후(약 +180 ms) 덧소리', 'depart_rain_extra', 0, 'none',
            '처마 물방울 2개: 삼각 근사 15 ms ↗(+20%) 처프, ' + ('C6 → D6' if v == 1 else 'D6 → C6'), variant=v)))
    for v in (1, 2, 3):
        mel = ' '.join(p for p, _, _ in RETURN_MEL[v])
        S.append((f'return_home_{v}', lambda v=v: b_return_home(v), 0, M(
            '귀가: 문어가 돌아와 자리에 내려앉을 때(600+200 ms 정착 모션도 같은 박에 시작)', 'return_home', -3, 'beat',
            f'NZ BP 600→2k 400 ms 다가옴 → 400 ms "퐁" TRI F3+F4 → P25 {mel} (M 머리 → F, V–I), TRI F3 받침',
            variant=v, **EV_DUCK)))
    for place, (fn, ko, desc) in REMEMBER.items():
        S.append((f'remember_{place}', fn, -2, M(
            f'기억 정리(remember) 단계, 대표 장소가 {place}({ko})일 때', 'remember', -3, 'beat',
            f'{desc}. 공통: TRI 아르페지오 + 딜레이 180 ms 피드백 -6 dB ×3 + LPF 2.5k(표 R)',
            key=place, **EV_DUCK)))
    for v in (1, 2):
        S.append((f'hang_poster_{v}', lambda v=v: b_hang_poster(v), 0, M(
            '포스터를 벽에 걸 때(0 ms 종이, 500 ms 핀, 650 ms 스티커 — 모션도 같은 박에 시작)', 'hang_poster', -4, 'beat',
            ('0 ms 종이 NZ BP 1→3k, 500 ms 핀 TRI C6 15 ms+클릭, 650 ms 스티커 '
             + ('P25 A5↗C6 → F5 A5 C6 30 ms 굴림(D400), TRI F3 (I)' if v == 1 else
                'P25 G5↗C6 (V, TRI C3) → A5 C6 F6 30 ms 굴림, TRI F3 (I) — 우쭐 축소판 I–V–I')),
            variant=v, **EV_DUCK)))
    for n in range(1, 8):
        g1, g2, main = LANTERN_SEQ[n - 1], LANTERN_SEQ[n], LANTERN[n - 1]
        S.append((f'lantern_{n}', lambda n=n: b_lantern(n), 1, M(
            f'등불 {n}칸째가 켜질 때', 'lantern', -3, 'beat',
            f'꾸밈음 {g1} {g2} 40 ms(-9) → 본음 {main} TRI A3 D600 + P25 {main[:-1]}{int(main[-1]) + 1} 반짝(-12) '
            f'+ "화륵" NZ LPF 1k(-16) + TRI 근음 {LANTERN_ROOT[n]}({LANTERN_CHORD[n]}) 아주 작게',
            key=n, **EV_DUCK)))
    S.append(('room_complete', b_room_complete, 4, M(
        '등불 8칸이 다 켜져 방이 완성될 때(다음 박에 BGM 일시정지 → 이 징글 → BGM 은 다음 프레이즈 처음부터 재개)',
        'room_complete', -9, 'beat',
        'A: 꾸밈음 D6 E6 → F6 종(TRI+bell 파형+P25 F7) + F 화음 칩 아르페지오(16.7 ms) + TRI F3→F2. '
        'B: M 팡파르 8분 0.2 s — C6 C6 A5 C6 | D6. C6 | F6(비브라토 6 Hz ±20 c), 3도 아래 P25 화성, '
        '베이스 I–IV–V–I, 스네어 롤. C: P12 반짝 C7 D7 F7 ×6(-18), 꼬리 LPF 9k→1.2k 로 닫힘. 고정(변형 없음)',
        pause_bgm=True, bgm_resume='next_phrase', **HERO_DUCK)))
    S.append(('first_place', b_first_place, 2, M(
        '처음 가 본 장소를 다녀왔을 때(히어로, 고정)', 'first_place', -6, 'beat',
        'P25 C5 C5(뽈뽈) F5 G5 A5 C6 D6 50 ms 씩 → F6 750 ms, 150 ms 뒤 비브라토 6 Hz ±20 c, '
        'P25 에코 90 ms, TRI F4→C5', **HERO_DUCK)))
    S.append(('rare_sparkle', b_rare_sparkle, 2, M(
        '희귀 티어(1/6) 포스터·발견. room_complete 와 겹치면 400 ms 뒤로 미룸', 'rare_sparkle', -6, 'beat',
        'P12 C7 C7(뽈뽈) → P25+P12 칩 아르페지오 F6 A6 C7(F7) 500 ms, LPF 6k + P12 반짝 {C7 D7 F7} ×6(-16), 고정',
        **HERO_DUCK)))
    moods = [
        ('mood_poljjak', b_mood_poljjak, 1, '폴짝(신남)',
         '160 BPM P12→25% 스타카토: C5 C5 A4 C5(M 머리) F5 · A5 · C6 · F5 F6"뿅"(+1 반음 ↗↘ 180 ms). '
         'P25 화음음 위 메아리 16분 늦게, TRI F3 A3 C4 F3, 끝에 노이즈 "퐁" 상행. 약 1.8 s'),
        ('mood_ujjul', b_mood_ujjul, 1, '우쭐(뿌듯)',
         '112 BPM P50 마르카토 점리듬: C5. C5 A4. C5 | D5. F5 | G5 | F5—. P50 3도 아래(A4 F4 B♭4 D5 E5 A4), '
         'TRI F3 B♭2 C3 F3 (I–IV–V–I), V 마디 스네어 롤, 끝 화음 200 ms 뒤 비브라토 ±15 c "에헴". 3.5 s'),
        ('mood_deomdeom', b_mood_deomdeom, -1, '덤덤(담담)',
         '72 BPM P50 레가토 C5 C5 → F4(동음 + 열린 5도, 3음 없는 선율), 비브라토 없음. TRI 한 음 A3 이 끝음 밑에 '
         '→ F/A 로 멈춤(근음 완전종지 없음, 3음 A 에서 멈춘 열린 끝). 약 2.3 s'),
        ('mood_jollim', b_mood_jollim, -1, '졸림',
         'TRI(+P12 작게) D5 C5 A4 F4 리타르단도(63→45 BPM), TRI B♭2→F2 변격, 끝음 -25 c 처짐 + 비브라토 4.5→2 Hz, '
         'LPF 3k→800, 하품 숨결 NZ LPF 800. 3.5 s'),
    ]
    for sid, fn, rel, ko, notes in moods:
        S.append((sid, fn, rel, M(
            f'반응(wrap_up) 기분이 {ko}일 때 — 다음 BGM 박에 시작', sid, -9, 'beat', notes,
            key=sid.split('_', 1)[1], **MOOD_DUCK)))
    S.append(('sleep_settle', b_sleep_settle, -8, M(
        '잠들 때(wrap_up 뒤). BGM 은 3 s 페이드아웃, 이어서 snore_* 순환', 'sleep_settle', 0, 'none',
        '이불 NZ LPF 1.5k 400 ms(들썩임 3번) + TRI F3 허밍 페이드(+오카리나 F4 아주 작게)', bgm_fade_out_s=3.0)))
    for k in (1, 2, 3):
        S.append((f'snore_{k}', lambda k=k: b_snore(k), -18, M(
            '자는 동안: 숨 한 주기 파일을 끝나는 즉시 다음 것으로 이어 재생(셔플백, 직전 반복 금지)', 'snore', 0, 'none',
            f'{SNORE_LEN[k]} s 한 주기(파일 길이 = 주기, 자르지 않음): 들숨 NZ BP 400→900 Hz → 0.3 s 멈춤 → '
            '날숨 NZ LPF 600' + (', TRI "푸우" C5↘A4(-26)' if k == 2 else ''), variant=k, cycle_s=SNORE_LEN[k])))
    chimes = [
        ('chime_dawn', b_chime_dawn, -12, '새벽(6시)', '하루 첫 새벽 진입 때 한 번(dawn_chime 겸용)',
         'F5↗C6↗F6 P12 종(부드러운 어택)+TRI, G6·C7 사인 후광, TRI F4 페달, 새 한 마리(2.6–3.4 kHz 3음절). 높고 가벼움'),
        ('chime_day', b_chime_day, -10, '낮(9시)', '',
         'P25 C6 C6(M 머리) → 글록 F5↗C6↗F6 빠르게 + bell 파형 F6 + 반짝 A6 C7. 밝음'),
        ('chime_dusk', b_chime_dusk, -10, '노을(17시)', '',
         '플루트 파형 종 F5↘C5↘F4 + 에코 280 ms ×2, TRI B♭2→F2(변격). 따뜻하고 낮음'),
        ('chime_night', b_chime_night, -12, '밤(19시)', '',
         '사인 오르골 F5↗C6 C6↘F5(+한 옥타브 아래, 두 옥타브 위 P12 아주 작게), TRI F3 페달. 부드러움'),
    ]
    for sid, fn, rel, ko, extra, notes in chimes:
        S.append((sid, fn, rel, M(
            f'시간대 전환 {ko}: 경계 뒤 4마디 프레이즈 끝 → 이전 곡 2마디 페이드아웃 → 이 종 → 새 시간대 곡'
            + (f'. {extra}' if extra else ''), 'chime', -2, 'none', notes + '. F–C–F 종 가족',
            key=sid.split('_', 1)[1])))
    S.append(('letter_room', b_letter_room, -3, M(
        '편지의 방에 들어갈 때 1회(루프 없음, 그 뒤로는 앰비언스만)', 'letter_room', 0, 'none',
        'TRI F3 페달 + P50 C5(M 첫 음, 8분 @80) → G5(2음)에서 멈춰 사라짐. 열린 5도, 대답 없는 질문(중립, 슬픔 아님)')))
    return S


# ==================================================================
# 검사 · 내보내기
# ==================================================================
# 04 §1.2 가 허락한 B♭·E: 4칸 본음 B♭5(5·6칸에서는 앞 칸 꾸밈음으로), 7칸 본음 E6
LANTERN_OK = {'lantern_4': {10}, 'lantern_5': {10}, 'lantern_6': {10}, 'lantern_7': {4}}


def harmony_check(sid, j):
    warns = th.vertical_check(j.voices, min_overlap=0.15) if len(j.voices) > 1 else []
    if j.melody:
        allowed = PENTA | LANTERN_OK.get(sid, set())
        for n in j.melody:
            if n.midi is not None and n.midi % 12 not in allowed:
                warns.append(f'선율 음 {n.midi} 이 F 펜타 밖')
    if sid.startswith('mood_'):
        last = max(j.melody, key=lambda n: n.t)
        if last.midi % 12 != 5:
            warns.append(f'기분 징글 끝음 {last.midi} 이 F 가 아님')
    return [f'{sid}: {w}' for w in warns]


def main(argv):
    only = [a for a in argv if not a.startswith('-')]
    check_only = '--check' in argv
    S = specs()
    ids = [s[0] for s in S]
    assert len(ids) == len(set(ids))
    if only:
        bad = set(only) - set(ids)
        if bad:
            raise SystemExit(f'모르는 id: {sorted(bad)}')
        S = [s for s in S if s[0] in only]
    built = [(sid, fn(), rel, meta) for sid, fn, rel, meta in S]
    warns = []
    for sid, j, rel, meta in built:
        warns += harmony_check(sid, j)
    print('화성 검사(vertical_check + 펜타 + 기분 끝음 F):', '경고 없음' if not warns else f'{len(warns)}건')
    for w in warns:
        print('  ' + w)
    if warns:
        raise SystemExit(1)
    if check_only:
        return
    entries = []
    for sid, j, rel, meta in built:
        y = j.render()
        x = ex.trim_tail(y[None, :]) if j.trim else y[None, :]
        if j.minlen and x.shape[1] < int(j.minlen * SR):
            x = np.pad(x, ((0, 0), (0, int(j.minlen * SR) - x.shape[1])))
        entry, xo = ex.export(x, sid, KIND, rel_db=rel, meta=meta, ceiling_db=CEIL_DB)
        entries.append(entry)
        lv = entry['level']
        print(f"{sid:24s} {entry['duration']:6.2f}s  {lv['measured']:6.1f}/{lv['target']:6.1f} {lv['unit']:4s} "
              f"pk {lv['peak_dbfs']:5.1f}")
    if not only:
        ex.save_manifest_part('jingle', entries)
        print(f'{len(entries)}개 → manifest.d/jingle.json')


if __name__ == '__main__':
    main(sys.argv[1:])
