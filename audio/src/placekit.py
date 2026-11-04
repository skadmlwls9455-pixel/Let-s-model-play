"""
장소 테마용 도구: 화음 아래 화성 붙이기, 베이스 무늬, 파도·바람 노이즈.
(theory.py 는 다른 작업과 같이 쓰므로 여기에 따로 둔다)
"""
import theory as th
from chip import Note, preset


def m(text, inst, start_bar=0, bar=4, octave=5, vel=12, gate=7, name='?'):
    """MML 한 덩어리 → 노트. start_bar 는 0부터."""
    import mml
    notes, end = mml.parse(text, inst=inst, octave=octave, vel=vel, gate=gate, start=start_bar * bar, bar=bar,
                           name=name)
    return notes, end


def harmony_below(notes, prog, min_gap=3, max_gap=9, inst=None, vel_drop=2, scale=None):
    """
    선율 아래에 화음음 한 성부를 붙인다(두 사람 이중창).
    각 음: 그 박 코드의 구성음 중 선율보다 min_gap~max_gap 반음 아래에서 가장 높은 것.
    없으면(경과음) 음계에서 3도 아래.
    """
    out = []
    for n in notes:
        if n.midi is None:
            continue
        sym, _, _ = prog.at(n.t)
        _, pcs, _, _ = th.chord(sym)
        cand = [n.midi - k for k in range(min_gap, max_gap + 1) if (n.midi - k) % 12 in pcs]
        if cand:
            h = cand[0]
        else:
            sc = scale or [0, 2, 4, 5, 7, 9, 11]
            # 음계 3도 아래
            below = [n.midi - k for k in range(3, 5) if (n.midi - k) % 12 in sc]
            h = below[0] if below else n.midi - 3
        out.append(Note(n.t, n.dur, h, max(1, n.vel - vel_drop), inst or n.inst, n.gate, n.seed))
    return out


def transpose(notes, semis):
    return th.shift(notes, semis=semis)


def bass_custom(prog, pattern, center=46, inst='bass', vel=15, gate=0.8, step=0.5, offset=0.0):
    """
    pattern: 코드 길이 동안 반복할 (음정 오프셋 or None) 목록. 오프셋은 근음 기준 반음.
      예) 옥타브 튕김 [0, 12], 6/8 굴림 [0, 7, 12, 7, 12, 7], 열린 5도 [0, 7]
    """
    out = []
    for (t, d, sym) in prog.items:
        root, pcs, bass, _ = th.chord(sym)
        r = th.nearest(bass, center)
        n = int(round(d / step))
        for j in range(n):
            o = pattern[j % len(pattern)]
            if o is None:
                continue
            out.append(Note(t + offset + j * step, step, r + o, vel, inst, gate))
    return out


def long_bass(prog, center=46, inst='bass_soft', vel=12, every=1, gate=0.95):
    """코드 every 개마다 근음 하나(긴 음)."""
    out = []
    items = prog.items
    for k in range(0, len(items), every):
        t, d, sym = items[k]
        dur = sum(x[1] for x in items[k:k + every])
        out.append(Note(t, dur, th.nearest(th.chord(sym)[2], center), vel, inst, gate))
    return out


def swell_preset(name, beats, bpm, peak=4, period=8, short=False):
    """파도/바람: 긴 노이즈. beats 동안 올라갔다 내려간다."""
    frames = int(beats * 60.0 / bpm * 60)
    up = int(frames * 0.4)
    env = [round(peak * (i / up) ** 1.5, 2) for i in range(up)] + \
          [round(peak * (1 - i / (frames - up)) ** 1.2, 2) for i in range(frames - up)]
    return preset(name, wave='noise', noise=(period, short), env=env, rel=[0.0], cut=False, gain=0.6)


def rhythm_only(notes, inst='woodblk', vel=7):
    """선율의 리듬만 노이즈로 (소리와 리듬의 첫 4마디)."""
    return [Note(n.t, n.dur, 60, vel, inst, 0.9, seed=i) for i, n in enumerate(notes) if n.midi is not None]
