"""
화성 도우미: 코드 표기 → 음, 반주 패턴 생성, 그리고 '귀 대신' 쓰는 검사기.

검사기
- strong_beat_check: 강박(1·3박, 코드 바뀌는 곳)에 화음 밖의 음이 오래 걸리면 경고
- vertical_check   : 동시에 울리는 성부끼리 단2도/장7도/트라이톤이 일정 시간 이상 겹치면 경고
"""
from chip import Note

NOTE_PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

QUALITY = {
    '': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10],
    'sus2': [0, 2, 7], 'sus4': [0, 5, 7], 'add9': [0, 4, 7, 14], 'dim': [0, 3, 6], '6': [0, 4, 7, 9],
    'm6': [0, 3, 7, 9], 'madd9': [0, 3, 7, 14], 'aug': [0, 4, 8], '9': [0, 4, 7, 10, 14],
}


def parse_pc(s):
    pc = NOTE_PC[s[0].upper()]
    for ch in s[1:]:
        if ch in '#+':
            pc += 1
        elif ch in 'b-':
            pc -= 1
    return pc % 12


def chord(sym):
    """'F', 'C/E', 'Dm7', 'Bb', 'Am/C' → (root_pc, [pcs], bass_pc)"""
    bass = None
    if '/' in sym:
        sym, b = sym.split('/')
        bass = parse_pc(b)
    i = 1
    while i < len(sym) and sym[i] in '#b':
        i += 1
    root = parse_pc(sym[:i])
    q = sym[i:]
    ivs = QUALITY[q]
    pcs = sorted(set((root + x) % 12 for x in ivs))
    return root, pcs, (bass if bass is not None else root), ivs


class Prog:
    """코드 진행: [(시작 박, 길이 박, 기호)]"""

    def __init__(self, items):
        self.items = []
        t = 0.0
        for sym, dur in items:
            self.items.append((t, dur, sym))
            t += dur
        self.length = t

    @staticmethod
    def bars(spec, beats_per_bar=4):
        """'F C/E | Dm Am/C | ...' — 마디 안 코드는 등분"""
        items = []
        for bar in spec.split('|'):
            syms = bar.split()
            if not syms:
                continue
            d = beats_per_bar / len(syms)
            items += [(s, d) for s in syms]
        return Prog(items)

    def repeat(self, n):
        items = []
        for _ in range(n):
            items += [(s, d) for (_, d, s) in self.items]
        return Prog(items)

    def __add__(self, other):
        return Prog([(s, d) for (_, d, s) in self.items] + [(s, d) for (_, d, s) in other.items])

    def at(self, t):
        t = t % self.length
        for (s, d, sym) in self.items:
            if s <= t < s + d:
                return sym, s, d
        return self.items[-1][2], self.items[-1][0], self.items[-1][1]


def nearest(pc, around):
    """around(MIDI) 근처에서 pitch class pc 인 MIDI"""
    base = around - ((around - pc) % 12)
    cands = [base, base + 12, base - 12]
    return min(cands, key=lambda m: abs(m - around))


# ------------------------------------------------------------------
# 반주 생성기
# ------------------------------------------------------------------
def bass_line(prog, style='root', octave_center=41, inst='bass', vel=15, gate=0.85, offset=0.0):
    """
    style:
      'root'   — 코드 길이만큼 근음(슬래시 베이스) 하나
      'pulse'  — 근음 8분 두 번 + 쉼 (통통)
      'rf'     — 근음-5도 4분 교대
      'walk'   — 근음, 5도, 다음 코드로 반음/온음 접근
      'waltz'  — 3/4: 근음 한 번
    """
    out = []
    items = prog.items
    for k, (t, d, sym) in enumerate(items):
        root, pcs, bass, _ = chord(sym)
        r = nearest(bass, octave_center)
        fifth = nearest((root + 7) % 12, r + 5)
        if style == 'root':
            out.append(Note(t + offset, d, r, vel, inst, gate))
        elif style == 'pulse':
            n = int(d * 2)
            for j in range(n):
                if j % 4 == 3:
                    continue
                out.append(Note(t + offset + j * 0.5, 0.5, r, vel, inst, 0.6))
        elif style == 'rf':
            n = int(d)
            for j in range(n):
                out.append(Note(t + offset + j, 1, r if j % 2 == 0 else fifth, vel, inst, gate))
        elif style == 'walk':
            n = int(d)
            nxt = items[(k + 1) % len(items)][2]
            nb = nearest(chord(nxt)[2], octave_center)
            for j in range(n):
                if j == n - 1 and n > 1:
                    m = nb - 1 if nb > r else nb + 1
                    if abs(m - r) > 4:
                        m = fifth
                elif j == 0:
                    m = r
                else:
                    m = fifth if j % 2 else r + 12 if r + 12 < 55 else r
                out.append(Note(t + offset + j, 1, m, vel, inst, gate))
        elif style == 'waltz':
            out.append(Note(t + offset, 1, r, vel, inst, 0.9))
        elif style == 'boom':
            # 1박 근음, 3박 5도 (2분)
            n = int(d // 2) or 1
            for j in range(n):
                out.append(Note(t + offset + j * 2, 2 if d >= 2 else d, r if j % 2 == 0 else fifth, vel, inst, gate))
    return out


def arp(prog, pattern=(0, 1, 2, 1), step=0.5, center=67, inst='pluck', vel=7, gate=0.5, offset=0.0,
        voicing=3, skip=None):
    """코드 톤을 center 근처에 쌓고 pattern 인덱스대로 굴린다."""
    out = []
    for (t, d, sym) in prog.items:
        root, pcs, bass, ivs = chord(sym)
        # 근음부터 쌓기
        r = nearest(root, center - 5)
        tones = sorted(set(r + (x % 12) + (12 if x >= 12 else 0) for x in ivs))
        while len(tones) < voicing:
            tones.append(tones[len(tones) - voicing] + 12 if len(tones) >= voicing else tones[-1] + 12)
        n = int(round(d / step))
        for j in range(n):
            if skip and skip(t + j * step):
                continue
            idx = pattern[j % len(pattern)]
            m = tones[idx % len(tones)] + 12 * (idx // len(tones))
            out.append(Note(t + offset + j * step, step, m, vel, inst, gate))
    return out


def pad_arp(prog, center=64, inst='chordarp', vel=6, offset=0.0, gate=0.95):
    """칩 '가짜 화음': 한 음에 아르페지오 매크로를 건 지속음. 악기 arp 매크로를 코드에 맞춰 덮어쓴다."""
    from chip import PRESETS
    out = []
    base = PRESETS[inst]
    for (t, d, sym) in prog.items:
        root, pcs, bass, ivs = chord(sym)
        r = nearest(root, center)
        offs = [x % 12 for x in ivs[:3]]
        p = dict(base)
        p['arp'] = [o for o in offs for _ in (0, 1)]   # 2프레임마다 한 음
        out.append(Note(t + offset, d, r, vel, p, gate))
    return out


def drums(pattern, bars, beats_per_bar=4, step=0.5, vel=10, offset=0.0, kit=None):
    """
    pattern: {'k': 'x...x...', 's': '....x...', 'h': 'x.x.x.x.'} — 한 마디(step 단위)
    kit: 문자 → 악기 이름
    """
    kit = kit or {'k': 'kick', 's': 'snare', 'h': 'hat', 'o': 'hatopen', 't': 'tick', 'c': 'shaker'}
    out = []
    for b in range(bars):
        for key, pat in pattern.items():
            for j, ch in enumerate(pat):
                if ch in 'xX':
                    v = vel + (2 if ch == 'X' else 0)
                    out.append(Note(offset + b * beats_per_bar + j * step, step, 60, v, kit[key], 0.9,
                                    seed=b * 31 + j))
    return out


def shift(notes, dt=0.0, semis=0, vel=None, inst=None, gate=None):
    out = []
    for n in notes:
        out.append(Note(n.t + dt, n.dur, None if n.midi is None else n.midi + semis,
                        n.vel if vel is None else (vel(n.vel) if callable(vel) else vel),
                        n.inst if inst is None else inst, n.gate if gate is None else gate, n.seed))
    return out


def echo(notes, delay=0.75, vel_drop=5, semis=0, inst=None, max_smear=None):
    """트래커 '에코' 기법: 같은 선율을 늦게, 작게 다른 채널에.
    max_smear(박): 주어지면 에코 음이 원래 다음 음 위로 번지는 길이를 그만큼으로 줄인다(반음 부딪힘 방지)."""
    out = shift(notes, dt=delay, semis=semis, vel=lambda v: max(1, v - vel_drop), inst=inst)
    if max_smear is not None:
        for e in out:
            sound = max(0.2, e.dur - delay + max_smear)
            e.gate = min(e.gate, sound / e.dur)
    return out


def window(notes, t0, t1):
    return [n for n in notes if t0 - 1e-9 <= n.t < t1 - 1e-9]


# ------------------------------------------------------------------
# 검사기
# ------------------------------------------------------------------
BAD = {1: '단2도', 11: '장7도', 6: '트라이톤', 13: '단9도'}


def strong_beat_check(notes, prog, name, min_dur=0.5, beats_per_bar=4, strong=(0, 2)):
    """강박에 걸린(또는 코드 시작에 걸린) 화음 밖 음 중 min_dur 박 이상 울리는 것"""
    warns = []
    for n in notes:
        if n.midi is None:
            continue
        pos = n.t % beats_per_bar
        sym, cs, cd = prog.at(n.t)
        on_strong = any(abs(pos - s) < 1e-6 for s in strong) or abs((n.t % prog.length) - cs) < 1e-6
        if not on_strong:
            continue
        _, pcs, _, ivs = chord(sym)
        ext = set(pcs) | set((chord(sym)[0] + x) % 12 for x in ivs)
        if n.midi % 12 not in ext and n.dur * n.gate >= min_dur - 1e-6:
            warns.append(f'{name}: 박 {n.t:.2f} (마디 {int(n.t // beats_per_bar) + 1}) 음 {n.midi} 이 {sym} 밖 (길이 {n.dur})')
    return warns


def vertical_check(voices, min_overlap=0.25, ignore_octave=True):
    """voices: {이름: [Note]} — 서로 다른 성부 사이 불협 겹침"""
    warns = []
    names = list(voices)
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = voices[names[i]], voices[names[j]]
            for x in a:
                if x.midi is None:
                    continue
                xe = x.t + x.dur * x.gate
                for y in b:
                    if y.midi is None:
                        continue
                    ye = y.t + y.dur * y.gate
                    ov = min(xe, ye) - max(x.t, y.t)
                    if ov < min_overlap:
                        continue
                    iv = abs(x.midi - y.midi)
                    key = iv % 12 if ignore_octave else iv
                    if iv == 13:
                        key = 13
                    if key in BAD or iv == 1:
                        warns.append(f'{names[i]}×{names[j]}: 박 {max(x.t, y.t):.2f} {x.midi}/{y.midi} {BAD.get(key, "단2도")} {ov:.2f}박')
    return warns


def unison_check(voices, min_overlap=1.0):
    """두 성부가 같은 음을 오래 같이 내는 곳(밋밋함)"""
    warns = []
    names = list(voices)
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            for x in voices[names[i]]:
                for y in voices[names[j]]:
                    if x.midi is None or y.midi is None or x.midi != y.midi:
                        continue
                    ov = min(x.t + x.dur, y.t + y.dur) - max(x.t, y.t)
                    if ov >= min_overlap:
                        warns.append(f'{names[i]}={names[j]}: 박 {max(x.t, y.t):.2f} 같은 음 {x.midi} {ov:.2f}박')
    return warns
