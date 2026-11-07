"""
메인 테마 편곡기 — 같은 악보(score_theme)를 시간대·날씨별로 다르게 입힌다.
애니멀 크로싱 시간대 음악이 비 오는 날 '같은 곡, 다른 옷'으로 바뀌는 방식.

한 사이클 = 68마디 (80 BPM 이면 204초 = 3분 24초). 리서치 01 §4-2 타임라인.
  마디  1-16 혼자   : V1 A B C D            + V2 가 V1 을 점8분 늦게 작게 따라 함(NES 에코)
  마디 17-32 둘이   : V1 A B C D            , V2 는 21마디부터 A B C
  마디 33-48 셋이   : V1 A B C D            , V2 D A B C, V3 는 41마디부터 A B
  마디 49-56 빠짐   :                         V2 D,  V3 C D
  마디 57-64 브리지 : 로열로드, 카논 쉼
  마디 65-68 꼬리   : 모티프 두 마디 + IV-V 로 처음에 돌아갈 준비
베이스는 바퀴마다 모양만 바꾼다(슬래시 하행 → 8분 경과음 → 통통 8분), 선율은 그대로.
"""
import theory as th
import score_theme as sc
from chip import Note, Song

CYCLE_BARS = 68
BASS_C = 46   # 베이스 중심(Bb2~F3) — 폰 스피커에서도 들리게 (리서치 03)

# 각 성부의 (세그먼트, 시작 마디 0부터)
TIMELINE = {
    'v1': [('A', 0), ('B', 4), ('C', 8), ('D', 12),
           ('A', 16), ('B', 20), ('C', 24), ('D', 28),
           ('A', 32), ('B', 36), ('C', 40), ('D', 44)],
    'v2': [('A', 20), ('B', 24), ('C', 28),
           ('D', 32), ('A', 36), ('B', 40), ('C', 44),
           ('D', 48)],
    'v3': [('A', 40), ('B', 44), ('C', 48), ('D', 52)],
}
TAIL = 'c8 c8 <a8 >c8 e4 c4 | d8 d8 <a8 >d8 e4 c4 | d2 d-2 | c2 e2 |'   # 모티프 + IV-iv 그리움 한 방울
TAIL_PROG = th.Prog.bars('F C/E | Dm Am/C | Bb Bbm | Csus4 C')


# 변주 설정 -----------------------------------------------------------
# v1/v2/v3: (악기, 옥타브, 세기)   echo: V2 가 혼자 바퀴에서 V1 을 따라 할 때 악기
VARIANTS = {
    'day': dict(bpm=80, swing=0.0, lp=7800, reverb=0.10, ir=0.8,
                v1=('lead', 5, 12), v2=('lead25', 5, 10), v3=('flute', 4, 11), echo='echo',
                bass='bass', arp=('pluck', (0, 1, 2, 1), 0.5, 69, 10),
                drums={'k': 'x.......x.......', 'h': '....x.......x...', 'c': '..x...x...x...x.'},
                drum_step=0.25, drum_vel=9, bridge='flute', pad=True,
                lv=dict(p1=1.0, p2=0.9, w=1.0, tri=0.72, arp=2.2, pad=1.0, noise=5.0)),
    'dawn': dict(bpm=72, swing=0.0, lp=6500, reverb=0.15, ir=1.2,
                 v1=('lead_soft', 5, 10), v2=('flute', 5, 9), v3=('ocarina', 4, 10), echo='echo_soft',
                 bass='bass_soft', arp=('musicbox', (0, 2, 1, 2), 1.0, 72, 8),
                 drums=None, drum_step=0.5, drum_vel=6, bridge='ocarina', pad=False,
                 lv=dict(p1=1.1, p2=0.9, w=1.0, tri=0.6, arp=1.6, pad=1.0, noise=4.0)),
    'dusk': dict(bpm=75, swing=0.16, lp=7000, reverb=0.13, ir=1.0,
                 v1=('flute', 5, 12), v2=('lead_soft', 5, 10), v3=('strings', 4, 11), echo='echo_soft',
                 bass='bass', arp=('pluck25', (0, 1, 2, 1), 0.5, 67, 9),
                 drums={'k': 'x.......', 'c': '..x...x.'}, drum_step=0.5, drum_vel=7,
                 bridge='strings', pad=True,
                 lv=dict(p1=1.0, p2=0.9, w=1.0, tri=0.7, arp=2.2, pad=1.0, noise=5.0)),
    'night': dict(bpm=64, swing=0.0, lp=5200, reverb=0.18, ir=1.5,
                  v1=('musicbox', 5, 12), v2=('ocarina', 5, 9), v3=('bell', 4, 9), echo='echo_box',
                  bass='bass_soft', arp=('glock', (0, 2, 1, 2), 1.0, 76, 9),
                  drums=None, drum_step=0.5, drum_vel=5, bridge='ocarina', pad=False,
                  lv=dict(p1=1.7, p2=0.9, w=2.2, tri=0.5, arp=1.6, pad=1.0, noise=4.0)),
}

# 날씨는 편곡을 덧칠한다 (시간대 변주 위에)
WEATHER = {
    'clear':   dict(),
    'drizzle': dict(lp_mul=0.85, arp_inst='drip', drum_mul=0.6),
    'rain':    dict(lp_mul=0.65, slower=True, arp_inst='drip', drums_off=True, rain_drips=True,
                    thin=True),
    'snow':    dict(lp_mul=0.75, slower=True, arp_inst='bell', drums_off=True, reverb_add=0.06,
                    octave_up_arp=12, box=True),
}
SLOWER = {80: 75, 75: 72, 72: 64, 64: 60}     # 192000*60/bpm 가 정수인 템포만


def _seg_notes(voice_tl, inst, octave, vel):
    out = []
    for name, bar in voice_tl:
        out += sc.seg(name, bar * 4, inst, octave, vel)
    return out


def build(variant='day', weather='clear'):
    V = VARIANTS[variant]
    W = WEATHER[weather]
    bpm = SLOWER[V['bpm']] if W.get('slower') else V['bpm']
    lp = V['lp'] * W.get('lp_mul', 1.0)
    song = Song(bpm, CYCLE_BARS * 4, swing=V['swing'], reverb=V['reverb'] + W.get('reverb_add', 0),
                ir_sec=V['ir'], lp=lp, hp=37)

    v1i, v2i, v3i = V['v1'], V['v2'], V['v3']
    if W.get('thin'):
        # 비: 성부를 얇게(25%·12.5% 듀티, 조금 작게) — 빗소리에 자리를 내준다
        v1i = ('lead25', v1i[1], v1i[2] - 1) if v1i[0].startswith('lead') else (v1i[0], v1i[1], v1i[2] - 1)
        v2i = (v2i[0], v2i[1], v2i[2] - 1)
    if W.get('box'):
        # 눈: 오르골 옷(네코아츠메 눈 오르골, 동숲 눈 버전처럼)
        v1i = ('musicbox', v1i[1], 12)
        v3i = ('bell', v3i[1], v3i[2] - 1)

    p1 = _seg_notes(TIMELINE['v1'], *v1i)
    p2 = _seg_notes(TIMELINE['v2'], *v2i)
    w3 = _seg_notes(TIMELINE['v3'], *v3i)

    # 혼자 바퀴: V2 가 V1 을 점8분 늦게, 작게(NES 에코)
    solo = [n for n in p1 if n.t < 16 * 4]
    p2 += th.echo(solo, delay=0.75, vel_drop=5, inst=V['echo'], max_smear=0.25)

    # 브리지 선율 + 꼬리 모티프 (V1)
    p1 += sc.bridge_mel(56, V['bridge'], octave=5, vel=12)
    tail, _ = sc.mml.parse(TAIL, inst=v1i[0], octave=5, vel=v1i[2] - 2,
                           start=64 * 4, bar=4, name='tail')
    p1 += tail
    # 브리지에서 V2 는 브리지 선율의 에코
    br = [n for n in p1 if 56 * 4 <= n.t < 64 * 4]
    p2 += th.echo(br, delay=0.75, vel_drop=6, inst=V['echo'], max_smear=0.25)

    # 베이스: 바퀴마다 모양만 바꾼다
    binst = V['bass']
    tri = []
    prog4 = sc.PROG.repeat(4)          # 16마디
    tri += th.bass_line(prog4, 'root', BASS_C, binst, 15)                                  # 혼자: 슬래시 하행 2분
    tri += th.shift(th.bass_line(prog4, 'boom', BASS_C, binst, 15), dt=16 * 4)            # 둘이: 근음-5도
    tri += th.shift(th.bass_line(prog4, 'pulse', BASS_C, binst, 15), dt=32 * 4)           # 셋이: 통통 8분
    tri += th.shift(th.bass_line(sc.PROG.repeat(2), 'root', BASS_C, binst, 15), dt=48 * 4)  # 빠짐
    tri += th.shift(th.bass_line(sc.BRIDGE, 'walk', BASS_C, binst, 14), dt=56 * 4)         # 브리지
    tri += th.shift(th.bass_line(TAIL_PROG, 'root', BASS_C, binst, 14), dt=64 * 4)         # 꼬리

    # 반주(퉁김): 둘이 바퀴부터, 빠짐에서 줄고, 브리지는 화음 아르페지오
    ainst, apat, astep, acenter, avel = V['arp']
    ainst = W.get('arp_inst', ainst)
    acenter += W.get('octave_up_arp', 0)
    arpn = th.shift(th.arp(sc.PROG.repeat(10), apat, astep, acenter, ainst, avel), dt=16 * 4)  # 마디 17-56
    if W.get('rain_drips'):
        keep = [1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0]    # 듬성듬성 — 빗방울처럼
        arpn = [n for i, n in enumerate(arpn) if keep[i % len(keep)]]
    arpn = [n for n in arpn if not (48 * 4 <= n.t < 56 * 4 and int(n.t * 2) % 2)]  # 빠짐: 절반만
    arpn += th.shift(th.arp(sc.BRIDGE, apat, astep, acenter, ainst, max(1, avel - 1)), dt=56 * 4)

    pad = []
    if V['pad']:
        pad = th.shift(th.pad_arp(sc.BRIDGE, 64, 'chordarp', 5), dt=56 * 4)

    # 타악: 셋이 바퀴(33-48)만, 아주 작게
    noise = []
    if V['drums'] and not W.get('drums_off'):
        dv = max(1, int(round(V['drum_vel'] * W.get('drum_mul', 1.0))))
        noise = th.drums(V['drums'], 16, offset=32 * 4, vel=dv, step=V['drum_step'])
        noise += th.drums({k: v for k, v in V['drums'].items() if k != 'k'}, 4, offset=48 * 4,
                          vel=max(1, dv - 3), step=V['drum_step'])
    kicks = [n for n in noise if n.inst in ('kick', 'tom')]
    noise = [n for n in noise if n.inst not in ('kick', 'tom')]
    tri = _merge_kicks(tri, kicks)

    lv = dict(V['lv'])
    if W.get('thin'):
        lv['p1'] *= 1.25          # 얇아진 리드가 묻히지 않게
    if W.get('box'):
        lv['p1'] = max(lv['p1'], 1.6)
        lv['w'] = max(lv['w'], 1.8)
    song.add('p1', p1, pan=-0.25, level=lv['p1'])
    song.add('p2', p2, pan=0.3, level=lv['p2'])
    song.add('w', w3, pan=0.1, level=lv['w'])
    song.add('tri', tri, pan=0.0, level=lv['tri'])
    song.add('arp', arpn, pan=0.45, level=lv['arp'])
    if pad:
        song.add('pad', pad, pan=-0.4, level=lv['pad'])
    if noise:
        song.add('noise', noise, pan=0.15, level=lv['noise'])
    return song


def voices_for_check(variant='day'):
    s = build(variant)
    return {k: v['notes'] for k, v in s.tracks.items() if k in ('p1', 'p2', 'w', 'tri')}


def _merge_kicks(bass, kicks):
    """킥(삼각파 음높이 급강하)이 울리는 순간 베이스를 잠깐 끊고, 킥 뒤에 베이스를 다시 이어 준다(NES 방식)."""
    if not kicks:
        return bass
    out = list(bass)
    for k in kicks:
        k.dur = 0.12
        for b in bass:
            if b.t <= k.t < b.t + b.dur and k.t + 0.12 < b.t + b.dur:
                out.append(Note(k.t + 0.12, b.t + b.dur - k.t - 0.12, b.midi, b.vel, b.inst, b.gate))
                break
    out += kicks
    return out
