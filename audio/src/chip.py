"""
뽈뽈 칩 — NES 2A03 / 게임보이 DMG 를 흉내 낸 작은 합성기 (사이클 정확 아님).

- 채널은 단음(mono). 같은 채널에 새 음이 오면 이전 음은 끊긴다(진짜 칩처럼).
- 볼륨·듀티·아르페지오·비브라토는 60Hz 프레임 단위 계단으로 바뀐다(트래커 매크로).
- 볼륨은 4비트(0~15) 계단. 파형은 4배 오버샘플로 그린 뒤 다운샘플(에일리어싱 완화).
- 루프 곡은 악보를 두 번 그려 두 번째 바퀴만 잘라 쓴다 → 꼬리(릴리스·잔향)가 처음으로 이어져 이음새가 없다.

의존: numpy, scipy
"""
import math
import numpy as np
from scipy import signal

SR = 48000          # 출력 샘플레이트(Opus·모바일 Web Audio 기본과 같게)
OS = 4              # 오버샘플 배수
OSR = SR * OS
FRAME_HZ = 60.0     # 매크로 프레임 속도(NTSC)
CPU_HZ = 1789773.0  # NES NTSC CPU 클럭(노이즈 주기 표 환산용)

# NES 노이즈 주기 표 (NTSC, CPU 사이클)
NOISE_PERIODS = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068]

# NES 삼각파 32계단 (15..0, 0..15)
TRI_TABLE = np.array(list(range(15, -1, -1)) + list(range(0, 16)), dtype=np.float64)
TRI_TABLE = (TRI_TABLE / 7.5) - 1.0

# 게임보이 웨이브 채널용 4비트 파형 몇 개 (32샘플, 0~15)
WAVES = {
    # 부드러운 사인 근사 — 오르골/자장가
    'sine': [8, 10, 11, 12, 13, 14, 15, 15, 15, 15, 14, 13, 12, 11, 10, 8,
             7, 5, 4, 3, 2, 1, 0, 0, 0, 0, 1, 2, 3, 4, 5, 7],
    # 둥근 삼각 + 살짝 각 — 나무 피리
    'flute': [8, 9, 11, 12, 13, 14, 14, 15, 15, 14, 14, 13, 12, 11, 9, 8,
              7, 6, 4, 3, 2, 1, 1, 0, 0, 1, 1, 2, 3, 4, 6, 7],
    # 홀수 배음이 섞인 종소리 느낌
    'bell': [8, 12, 15, 14, 11, 9, 9, 11, 13, 13, 10, 7, 6, 7, 9, 10,
             8, 5, 3, 4, 6, 7, 6, 4, 2, 2, 4, 6, 6, 4, 1, 3],
    # 비대칭 — 리드 오르간
    'organ': [15, 15, 14, 12, 10, 10, 11, 12, 11, 8, 6, 6, 7, 8, 7, 5,
              3, 3, 4, 5, 4, 2, 1, 1, 2, 3, 2, 1, 0, 0, 3, 8],
    # 톱니 반쪽 — 따뜻한 현
    'saw': [15, 15, 14, 14, 13, 13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8,
            7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0, 0],
}
WAVES = {k: (np.array(v, dtype=np.float64) / 7.5) - 1.0 for k, v in WAVES.items()}


def _lfsr(short):
    """NES 노이즈 LFSR 한 주기(긴 모드 32767, 짧은 모드 93)를 ±1 로."""
    reg = 1
    out = []
    tap = 6 if short else 1
    n = 93 if short else 32767
    for _ in range(n):
        out.append(1.0 if (reg & 1) == 0 else -1.0)
        fb = (reg & 1) ^ ((reg >> tap) & 1)
        reg = (reg >> 1) | (fb << 14)
    return np.array(out, dtype=np.float64)


LFSR_LONG = _lfsr(False)
LFSR_SHORT = _lfsr(True)


def _polyblep(t, dt):
    y = np.zeros_like(t)
    a = t < dt
    x = t[a] / dt[a]
    y[a] = 2 * x - x * x - 1
    b = t > 1 - dt
    x = (t[b] - 1) / dt[b]
    y[b] = x * x + 2 * x + 1
    return y


def midi_hz(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=np.float64) - 69.0) / 12.0)


# ------------------------------------------------------------------
# 악기(프리셋)
# ------------------------------------------------------------------
# 필드:
#   wave   : 'pulse' | 'tri' | 'noise' | 'wave'
#   duty   : 숫자 또는 프레임별 리스트(마지막 값 유지)  — pulse 전용
#   table  : WAVES 키 — wave 전용
#   env    : 어택~디케이 프레임별 볼륨(0~15, 마지막 값이 서스테인)
#   rel    : 게이트가 닫힌 뒤 프레임별 볼륨 배율(0~1) 리스트
#   arp    : 프레임별 반음 오프셋(순환)
#   pitch  : 프레임별 반음 오프셋(마지막 값 유지) — 킥, 슬라이드
#   vib    : (지연 프레임, 깊이 반음, 속도 Hz)
#   noise  : (주기 인덱스 0~15, short bool) — noise 전용. 음높이 대신 사용.
#   gain   : 채널 출력 배율
#   cut    : 볼륨을 4비트 계단으로 자를지(True 기본)

PRESETS = {}


def preset(name, **kw):
    base = dict(wave='pulse', duty=0.5, table='sine', env=[12], rel=[0.6, 0.3, 0.12],
                arp=None, pitch=None, vib=None, noise=None, gain=1.0, cut=True, sus_decay=0.0)
    base.update(kw)
    PRESETS[name] = base
    return base


def get_preset(p):
    if isinstance(p, dict):
        return p
    return PRESETS[p]


# ------------------------------------------------------------------
# 음 하나 그리기
# ------------------------------------------------------------------
def _frames_to_samples(arr, nsamp, spf):
    """프레임별 값 배열을 샘플 길이로 늘린다(계단)."""
    idx = np.minimum((np.arange(nsamp) / spf).astype(np.int64), len(arr) - 1)
    return np.asarray(arr, dtype=np.float64)[idx]


def _seq(seq, nframes, loop=False):
    """프레임 시퀀스를 nframes 길이로: loop=False 면 마지막 값 유지."""
    if seq is None:
        return np.zeros(nframes)
    if np.isscalar(seq):
        return np.full(nframes, float(seq))
    s = np.asarray(seq, dtype=np.float64)
    if loop:
        return s[np.arange(nframes) % len(s)]
    idx = np.minimum(np.arange(nframes), len(s) - 1)
    return s[idx]


def render_note(midi, vel, gate_s, inst, total_s=None, seed=0):
    """
    한 음을 OSR 로 그린다. gate_s 동안 눌렀다가 놓고, rel 프레임 동안 사라진다.
    total_s 가 주어지면 그 길이에서 자른다(다음 음에 끊김).
    반환: float64 배열 (OSR)
    """
    p = get_preset(inst)
    spf = OSR / FRAME_HZ
    rel = p['rel'] or [0.0]
    full_s = gate_s + len(rel) / FRAME_HZ
    if total_s is not None:
        full_s = min(full_s, total_s)
    n = max(1, int(round(round(full_s, 9) * OSR)))
    nframes = int(math.ceil(n / spf)) + 1
    gate_frames = round(gate_s * FRAME_HZ, 6)   # 부동소수 흔들림이 프레임 경계를 넘지 않게

    # 볼륨 매크로
    env = _seq(p['env'], nframes)
    fr = np.arange(nframes, dtype=np.float64)
    if p.get('sus_decay'):
        # 서스테인 구간에서 프레임당 감쇠(볼륨 단위)
        start = len(p['env'])
        env = env - np.maximum(0, fr - start) * p['sus_decay']
    env = np.clip(env, 0, 15)
    # 릴리스
    relmul = np.ones(nframes)
    after = fr - gate_frames
    rel_arr = np.asarray(rel, dtype=np.float64)
    for i in range(nframes):
        a = after[i]
        if a >= 0:
            k = int(a)
            relmul[i] = rel_arr[k] if k < len(rel_arr) else 0.0
    vol = env * relmul * (vel / 15.0)
    if p['cut']:
        vol = np.floor(vol + 0.5)            # 4비트 계단
    vol = vol / 15.0

    # 음높이 매크로
    pitch = np.full(nframes, float(midi) if midi is not None else 60.0)
    if p['arp'] is not None:
        pitch = pitch + _seq(p['arp'], nframes, loop=True)
    if p['pitch'] is not None:
        pitch = pitch + _seq(p['pitch'], nframes)
    if p['vib'] is not None:
        d, depth, rate = p['vib']
        t = np.maximum(0, fr - d) / FRAME_HZ
        ramp = np.clip((fr - d) / 8.0, 0, 1)   # 비브라토는 8프레임에 걸쳐 들어온다
        pitch = pitch + depth * ramp * np.sin(2 * np.pi * rate * t)

    vol_s = _frames_to_samples(vol, n, spf)
    # 계단 모서리 다듬기: 볼륨은 여전히 60Hz·4비트 계단으로 움직이지만, 한 계단을 1.5ms 에 걸쳐 넘어가게 해서
    # 느린 감쇠(오르골·종)에서 '지글지글' 클릭이 나지 않게 한다. (순수 사인 기준 고역 잡음 -46dB → 측정값은 커밋 메시지)
    k = int(0.0015 * OSR)
    if n > 2 * k:
        c = np.cumsum(np.concatenate([np.zeros(k), vol_s]))
        vol_s = (c[k:] - c[:-k]) / k

    w = p['wave']
    if w == 'noise':
        per_idx, short = p['noise'] if p['noise'] else (8, False)
        # pitch 매크로가 있으면 주기 인덱스를 프레임마다 옮긴다
        if p['pitch'] is not None:
            idxs = np.clip(np.round(per_idx + _seq(p['pitch'], nframes)), 0, 15).astype(int)
        else:
            idxs = np.full(nframes, per_idx, dtype=int)
        rate = CPU_HZ / np.array(NOISE_PERIODS, dtype=np.float64)[idxs]
        rate_s = _frames_to_samples(rate, n, spf)
        ph = np.cumsum(rate_s / OSR)
        seq = LFSR_SHORT if short else LFSR_LONG
        off = (seed * 7919) % len(seq)
        out = seq[(ph.astype(np.int64) + off) % len(seq)]
    else:
        freq = _frames_to_samples(midi_hz(pitch), n, spf)
        ph = np.cumsum(freq / OSR)           # 음 시작마다 위상 0(칩처럼 리셋)
        frac = ph - np.floor(ph)
        if w == 'pulse':
            duty = _frames_to_samples(_seq(p['duty'], nframes), n, spf)
            out = np.where(frac < duty, 1.0, -1.0)
            # PolyBLEP: 올라가는 모서리(위상 0)와 내려가는 모서리(위상 duty)를 매끈하게 → 에일리어싱 감소
            dt = np.minimum(freq / OSR, 0.5)
            out = out + _polyblep(frac, dt) - _polyblep((frac - duty) % 1.0, dt)
            # 듀티 비대칭으로 생기는 DC 제거
            out = out - (2 * duty - 1)
        elif w == 'tri':
            out = TRI_TABLE[(frac * 32).astype(np.int64) % 32]
        elif w == 'wave':
            tab = WAVES[p['table']]
            out = tab[(frac * 32).astype(np.int64) % 32]
        elif w == 'sine':   # 칩 밖의 소리 — 앰비언스 물방울 등 아주 드물게만
            out = np.sin(2 * np.pi * frac)
        else:
            raise ValueError(w)

    y = out * vol_s * p['gain']
    # 1ms 클릭 방지 램프(앞·뒤)
    r = min(len(y) // 2, int(0.001 * OSR))
    if r > 0:
        ramp = np.linspace(0, 1, r)
        y[:r] *= ramp
        y[-r:] *= ramp[::-1]
    return y


# ------------------------------------------------------------------
# 노트 → 채널 버퍼
# ------------------------------------------------------------------
class Note:
    __slots__ = ('t', 'dur', 'midi', 'vel', 'inst', 'gate', 'seed')

    def __init__(self, t, dur, midi, vel=12, inst='lead', gate=0.9, seed=0):
        self.t = t          # 박(4분음표=1) 단위 시작
        self.dur = dur      # 박 단위 길이
        self.midi = midi
        self.vel = vel
        self.inst = inst
        self.gate = gate    # 길이 중 누르고 있는 비율
        self.seed = seed

    def __repr__(self):
        return f'Note(t={self.t}, d={self.dur}, m={self.midi}, v={self.vel}, {self.inst})'


def beat_to_sec(b, bpm, swing=0.0):
    """swing: 0~0.33. 8분음표 뒷박을 늦춘다."""
    if swing:
        whole = math.floor(b)
        frac = b - whole
        if frac > 1e-9:
            # 0~0.5 → 0~(0.5+swing/2), 0.5~1 → (0.5+swing/2)~1
            pivot = 0.5 + swing / 2
            if frac <= 0.5:
                frac = frac / 0.5 * pivot
            else:
                frac = pivot + (frac - 0.5) / 0.5 * (1 - pivot)
        b = whole + frac
    return b * 60.0 / bpm


def render_channel(notes, n_total, bpm, swing=0.0, mono=True):
    """한 채널의 노트들을 OSR 버퍼에 그린다. mono=True 면 다음 음이 이전 음을 끊는다."""
    buf = np.zeros(n_total)
    ns = sorted([x for x in notes if x.midi is not None or get_preset(x.inst)['wave'] == 'noise'],
                key=lambda x: x.t)
    for i, nt in enumerate(ns):
        t0 = beat_to_sec(nt.t, bpm, swing)
        t1 = beat_to_sec(nt.t + nt.dur, bpm, swing)
        gate_s = max(0.01, (t1 - t0) * nt.gate)
        total = None
        if mono and i + 1 < len(ns):
            total = beat_to_sec(ns[i + 1].t, bpm, swing) - t0
            if total <= 0:
                continue
        y = render_note(nt.midi, nt.vel, gate_s, nt.inst, total, seed=nt.seed)
        s = int(round(t0 * OSR))
        if s >= n_total:
            continue
        e = min(n_total, s + len(y))
        buf[s:e] += y[:e - s]
    return buf


# ------------------------------------------------------------------
# 믹스·후처리
# ------------------------------------------------------------------
# 채널 상대 레벨 — NESdev 선형 근사(펄스 0.00752, 삼각 0.00851, 노이즈 0.00494 / 레벨)에서 비율만 가져옴
CH_LEVEL = {'pulse': 1.0, 'tri': 1.13, 'noise': 0.66, 'wave': 0.9}


def _onepole_lp(x, fc, sr):
    a = math.exp(-2 * math.pi * fc / sr)
    return signal.lfilter([1 - a], [1, -a], x, axis=-1)


def _onepole_hp(x, fc, sr):
    a = math.exp(-2 * math.pi * fc / sr)
    return signal.lfilter([(1 + a) / 2, -(1 + a) / 2], [1, -a], x, axis=-1)


_IR_CACHE = {}


def room_ir(seconds=0.9, predelay=0.012, damp=4500.0, seed=7):
    """작은 다락방 잔향: 지수 감쇠 노이즈 IR(스테레오, 결정적)."""
    key = (seconds, predelay, damp, seed)
    if key in _IR_CACHE:
        return _IR_CACHE[key]
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    env = np.exp(-6.9 * t / seconds)           # -60dB at `seconds`
    ir = rng.standard_normal((2, n)) * env
    ir = _onepole_lp(ir, damp, SR)
    pd = int(predelay * SR)
    ir = np.concatenate([np.zeros((2, pd)), ir], axis=1)
    ir /= np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))
    _IR_CACHE[key] = ir
    return ir


def mix(channels, n_out, reverb=0.12, ir_sec=0.9, lp=9000.0, hp=40.0, width=1.0, mono=False):
    """
    channels: list of (buf_OSR, pan(-1..1), level)
    반환: (2, n_out) float, mono=True 면 (1, n_out)
    """
    if mono:
        M = np.zeros(channels[0][0].shape[0]) if channels else np.zeros(n_out * OS)
        for buf, pan, lvl in channels:
            M += buf * lvl
        st = signal.resample_poly(M[None, :], 1, OS, axis=1)[:, :n_out]
        if st.shape[1] < n_out:
            st = np.pad(st, ((0, 0), (0, n_out - st.shape[1])))
        st = _onepole_hp(st, hp, SR)
        if lp:
            st = _onepole_lp(_onepole_lp(st, lp, SR), lp * 1.6, SR)
        if reverb > 0:
            ir = room_ir(ir_sec)
            st = st + reverb * signal.fftconvolve(st[0], ir[0])[:n_out][None, :]
        return st
    # 다운샘플 전에 채널별 팬
    L = np.zeros(channels[0][0].shape[0]) if channels else np.zeros(n_out * OS)
    R = np.zeros_like(L)
    for buf, pan, lvl in channels:
        pan = max(-1.0, min(1.0, pan * width))
        a = (pan + 1) * math.pi / 4
        L += buf * lvl * math.cos(a)
        R += buf * lvl * math.sin(a)
    st = np.stack([L, R])
    st = signal.resample_poly(st, 1, OS, axis=1)[:, :n_out]
    if st.shape[1] < n_out:
        st = np.pad(st, ((0, 0), (0, n_out - st.shape[1])))
    # 칩 출력 필터: 고역 통과(직류·웅웅 제거) + 따뜻하게 저역 통과(2단)
    st = _onepole_hp(st, hp, SR)
    if lp:
        st = _onepole_lp(_onepole_lp(st, lp, SR), lp * 1.6, SR)
    if reverb > 0:
        ir = room_ir(ir_sec)
        wet = np.stack([signal.fftconvolve(st[0], ir[0])[:n_out],
                        signal.fftconvolve(st[1], ir[1])[:n_out]])
        st = st + wet * reverb
    return st


def soft_limit(x, ceiling=0.89):
    """부드러운 리미터(tanh 무릎). 피크를 ceiling 아래로."""
    k = 0.75 * ceiling
    y = np.copy(x)
    over = np.abs(y) > k
    s = np.sign(y[over])
    y[over] = s * (k + (ceiling - k) * np.tanh((np.abs(y[over]) - k) / (ceiling - k)))
    return y


# ------------------------------------------------------------------
# 곡 렌더
# ------------------------------------------------------------------
class Song:
    """
    tracks: dict 이름 → dict(notes=[Note], pan=float, level=float, wave='pulse'...)
    length_beats: 루프/곡 길이(박)
    """

    def __init__(self, bpm, length_beats, swing=0.0, reverb=0.10, ir_sec=0.9, lp=7500.0, hp=37.0, mono=True):
        self.bpm = bpm
        self.length_beats = length_beats
        self.swing = swing
        self.reverb = reverb
        self.ir_sec = ir_sec
        self.lp = lp
        self.hp = hp
        self.mono = mono
        self.tracks = {}

    def add(self, name, notes, pan=0.0, level=1.0):
        tr = self.tracks.setdefault(name, dict(notes=[], pan=pan, level=level))
        tr['notes'].extend(notes)
        tr['pan'] = pan
        tr['level'] = level
        return tr

    def seconds(self):
        return beat_to_sec(self.length_beats, self.bpm)

    def render(self, loop=True, tail=2.5, lead_in=0.0, lead_out=0.0):
        """
        loop=True: 악보를 세 번 그리고 가운데 바퀴를 중심으로 잘라 반환(이음새 없음).
          lead_in / lead_out 초만큼 앞뒤 여유를 붙인다(앞 = 루프 끝부분 복사, 뒤 = 루프 첫 부분 복사).
          → 인코더 패딩이 생겨도 loopStart=lead_in, loopEnd=lead_in+길이 로 이음새가 깨끗하다.
        """
        L = self.seconds()
        n_out = int(round(L * SR))
        if loop:
            span_beats = self.length_beats
            total_s = 3 * L + tail
        else:
            total_s = L + tail
        n_os = int(math.ceil(total_s * OSR))
        chans = []
        for name, tr in self.tracks.items():
            notes = tr['notes']
            if loop:
                # 1바퀴는 끝 8박만, 3바퀴는 앞 (lead_out+8박)만 있으면 된다(꼬리·앞 여유용) → 렌더 시간 절약
                keep_out = lead_out * self.bpm / 60.0 + 8
                notes = ([Note(x.t, x.dur, x.midi, x.vel, x.inst, x.gate, x.seed)
                          for x in notes if x.t + x.dur >= span_beats - 8] +
                         [Note(x.t + span_beats, x.dur, x.midi, x.vel, x.inst, x.gate, x.seed) for x in notes] +
                         [Note(x.t + 2 * span_beats, x.dur, x.midi, x.vel, x.inst, x.gate, x.seed)
                          for x in notes if x.t < keep_out])
            buf = render_channel(notes, n_os, self.bpm, self.swing)
            wave = get_preset(notes[0].inst)['wave'] if notes else 'pulse'
            chans.append((buf, tr['pan'], tr['level'] * CH_LEVEL.get(wave, 1.0) * 0.32))
        n_mix = int(math.ceil(total_s * SR))
        st = mix(chans, n_mix, self.reverb, self.ir_sec, self.lp, self.hp, mono=self.mono)
        if loop:
            s0 = n_out - int(round(lead_in * SR))
            s1 = 2 * n_out + int(round(lead_out * SR))
            return st[:, s0:s1]
        return st


# ------------------------------------------------------------------
# 파일 쓰기
# ------------------------------------------------------------------
def write_wav(path, st, sr=SR):
    import wave
    x = np.asarray(st)
    if x.ndim == 1:
        x = x[None, :]
    x = np.clip(x, -1, 1)
    # TPDF 디더 후 16비트
    rng = np.random.default_rng(1)
    d = (rng.random(x.shape) - rng.random(x.shape)) / 32768.0
    q = np.round((x + d) * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(x.shape[0])
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(q.T.tobytes())
