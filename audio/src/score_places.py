"""
장소 테마 11곡 + 자장가 + 창가 비 — 모두 메인 동기 M(도도라도 미도 = "뽈뽈 다녀와")의 변형.
리서치 02 §4.4 표를 따른다. 각 함수는 (Song, meta, {성부: 노트}, 진행) 을 돌려준다.
템포는 192000*60/bpm 가 정수인 값만 쓴다(루프 길이가 샘플 단위로 딱 떨어지게).
"""
import theory as th
import placekit as pk
from chip import Note, Song, preset

# ---- 장소 전용 악기 ----
preset('pl_flute_glide', wave='wave', table='flute', env=[4, 7, 9, 10, 10, 10, 9],
       rel=[0.75, 0.55, 0.35, 0.2, 0.1], vib=(20, 0.16, 4.8), pitch=[-1.5, -1.0, -0.6, -0.3, -0.1, 0])
preset('pl_stab', wave='pulse', duty=0.5, env=[7, 6, 4, 2, 0], rel=[0.0], arp=[0, 0, 3, 3, 7, 7])
preset('pl_stab_maj', wave='pulse', duty=0.5, env=[7, 6, 4, 2, 0], rel=[0.0], arp=[0, 0, 4, 4, 7, 7])
preset('pl_fifth', wave='pulse', duty=0.125, env=[3, 4, 4, 4], rel=[0.6, 0.3], arp=[0, 0, 7, 7], vib=(30, 0.06, 3.0))
preset('pl_sus', wave='pulse', duty=0.25, env=[1, 2, 3, 3, 4, 4], rel=[0.85, 0.7, 0.5, 0.3, 0.15],
       arp=[0, 0, 2, 2, 7, 7], vib=(30, 0.07, 3.5))
preset('pl_tick', wave='noise', noise=(2, True), env=[4, 2, 1, 0], rel=[0.0], gain=0.5)
preset('pl_step', wave='noise', noise=(6, False), env=[5, 3, 1, 0], rel=[0.0], gain=0.55)
preset('pl_box', wave='wave', table='sine', env=[12, 11, 10, 9, 8, 7, 7, 6, 6, 5, 5, 4, 4, 4, 3],
       rel=[0.6, 0.4, 0.25, 0.12], sus_decay=0.05)
preset('pl_box_hi', wave='pulse', duty=0.125, env=[6, 5, 4, 4, 3, 3, 2, 2, 1],
       rel=[0.5, 0.2], sus_decay=0.05)

MAJ = [0, 2, 4, 5, 7, 9, 11]


def _scale_from(root):
    return [(root + x) % 12 for x in MAJ]


# =====================================================================
# 1. hands 손과 물건 — F장조, 100 BPM, 만지작만지작
# =====================================================================
def hands():
    bpm = 100
    prog = th.Prog.bars('F | C | Dm | Bb').repeat(4)
    A = ('r8 c16 c16 <a8 >c8 f8 c8 a8 f8 | r8 c16 c16 <g8 >c8 e8 c8 g8 e8 | '
         'r8 d16 d16 <a8 >d8 f8 d8 a8 f8 | r8 d16 d16 <b-8 >d8 f4 r4 |')
    A2 = ('r8 c16 c16 <a8 >c8 f8 a8 >c8 <a8 | o5 r8 c16 c16 <g8 >c8 e8 g8 >c8 <g8 | '
          'o5 r8 d16 d16 <a8 >d8 f8 a8 >d8 <a8 | o5 b-8 a8 g8 f8 d8 c8 <b-8 a8 |')
    B = 'o5 a4. g8 f4 c4 | e4. d8 c4 <g4 | o5 f4. e8 d4 <a4 | o5 d4 f4 d4 c4 |'
    A3 = ('o5 r8 c16 c16 <a8 >c8 f8 c8 a8 f8 | r8 c16 c16 <g8 >c8 e8 c8 g8 e8 | '
          'r8 d16 d16 <a8 >d8 f8 d8 a8 f8 | r8 d16 d16 <b-8 >d8 f8 e8 d8 c8 |')
    lead = []
    for k, txt in enumerate((A, A2, B, A3)):
        nn, _ = pk.m('o5 ' + txt, 'lead25', start_bar=4 * k, vel=12, gate=5, name=f'hands{k}')
        lead += nn
    # 16분 '톱니' 오스티나토 — 3구간(B)에서는 8분으로 숨을 준다
    ost = th.arp(prog, (0, 1, 2, 3), 0.25, 62, 'pluck', 8, gate=0.5)
    ost = [n for n in ost if not (32 <= n.t < 48 and (n.t * 4) % 2)]
    bass = pk.bass_custom(prog, [0, 12, 0, 12, 0, 12, 0, 12], center=46, inst='bass', gate=0.55)
    drums = th.drums({'w': '.x.x.x.x', 't': '..x...x.'}, 16, step=0.5, vel=6,
                     kit={'w': 'woodblk', 't': 'pl_tick'})
    s = Song(bpm, 64, reverb=0.08, ir_sec=0.6, lp=7800)
    s.add('p1', lead, level=1.0)
    s.add('p2', ost, level=1.6)
    s.add('tri', bass, level=0.7)
    s.add('noise', drums, level=3.0)
    meta = dict(title='손과 물건', mode='F 이오니안', meter='4/4', bpm=bpm, bars=16,
                character='만지작만지작. M을 절반 길이로 줄이고 반 박 밀어 시작, 16분 톱니 반주, 옥타브로 튀는 베이스, 나무 톡톡')
    return s, meta, {'lead': lead}, prog


# =====================================================================
# 2. sea 바다와 생물 — G 도리안, 6/8 뱃노래 (4분=80 → 점4분≈53)
# =====================================================================
def sea():
    bpm = 80
    prog = th.Prog.bars('Gm | C | Gm | C | Gm | C | Gm | C | Gm | C | Gm | C | Bb | F | C | C', beats_per_bar=3)
    mel = ('d8 d8 <b-8 >d4. | e8 e8 c8 g4. | b-4 a8 g4 d8 | e4 f8 g4. | '
           'd8 d8 <b-8 >d4 g8 | g8 a8 g8 e4. | g8 f8 d8 <b-4. | >c4. r4. | '
           'b-8 a8 b-8 >d4. | c4 <g8 e4. | g8 a8 b-8 >d8 c8 <b-8 | g4 e8 c4. | '
           'd8 d8 <b-8 >d4. | c8 c8 <a8 >c4. | e8 g8 e8 c4 e8 | e4. r4. |')
    lead, _ = pk.m('o5 ' + mel, 'lead_soft', bar=3, vel=12, gate=7, name='sea')
    harm = pk.harmony_below(lead, prog, 3, 9, inst='lead25', vel_drop=4)
    roll = pk.bass_custom(prog, [0, 7, 12, 7, 12, 7], center=45, inst='bass', gate=0.7)
    pk.swell_preset('pl_wave', 6, bpm, peak=4, period=9)
    waves = [Note(b * 3, 6, 60, 10, 'pl_wave', 1.0, seed=b) for b in range(0, 16, 2)]
    s = Song(bpm, 48, reverb=0.14, ir_sec=1.2, lp=6800)
    s.add('p1', lead, level=1.05)
    s.add('p2', harm, level=0.75)
    s.add('tri', roll, level=0.65)
    s.add('noise', waves, level=1.6)
    meta = dict(title='바다와 생물', mode='G 도리안 (E♮ 색)', meter='6/8 (점4분≈53)', bpm=bpm, bars=16,
                character='물결 위 뱃노래. M을 6/8로 다시 박자 맞춤, 3도 아래 따라가는 둘째 펄스, 굴러가는 삼각 베이스, 2마디마다 파도 노이즈')
    return s, meta, {'lead': lead, 'harm': harm}, prog


# =====================================================================
# 3. sky 하늘과 날씨 — F 리디안 왈츠, 90 BPM 3/4
# =====================================================================
def sky():
    bpm = 90
    prog = th.Prog.bars('F | G/F | F | G/F | Am | G | F | G', beats_per_bar=3).repeat(2)
    mel1 = 'c4 c8 <f8 >c4 | b2 g4 | a4 f4 c4 | d2. | e4 e8 <a8 >e4 | d2 <b4 | >c4 <a4 f4 | g2. |'
    mel2 = 'c4 f4 a4 | @pl_flute_glide b2. | @flute >c4 <a4 f4 | g4 b4 >d4 | @pl_flute_glide e2 @flute c4 | <b4 g4 d4 | a4 >c4 <a4 | g2. |'
    l1, _ = pk.m('o5 ' + mel1, 'flute', bar=3, vel=12, gate=7, name='sky1')
    l2, _ = pk.m('o5 ' + mel2, 'flute', start_bar=8, bar=3, vel=12, gate=7, name='sky2')
    lead = l1 + l2
    arp = th.arp(prog, (0, 1, 2, 3, 2, 1), 0.5, 57, 'lead_soft', 6, gate=0.6, voicing=4)
    bass = pk.long_bass(prog, center=45, inst='bass_soft', vel=12, every=2)
    pk.swell_preset('pl_wind', 12, bpm, peak=3, period=10)
    wind = [Note(12 * 3, 12, 60, 9, 'pl_wind', 1.0, seed=3)]
    s = Song(bpm, 48, reverb=0.16, ir_sec=1.4, lp=7500)
    s.add('p1', lead, level=1.15)
    s.add('p2', arp, level=0.8)
    s.add('tri', bass, level=0.6)
    s.add('noise', wind, level=1.6)
    meta = dict(title='하늘과 날씨', mode='F 리디안 (B♮)', meter='3/4', bpm=bpm, bars=16,
                character='구름 사이를 미끄러지는 왈츠. M의 도약을 넓힘, 높은 음은 미끄러져 들어감, 넓은 아르페지오, 바람 한 줄기')
    return s, meta, {'lead': lead}, prog


# =====================================================================
# 4. signs 기호와 언어 — C 믹솔리디안, 96 BPM, 묻고 답하기(모스 부호 리듬)
# =====================================================================
def signs():
    bpm = 96
    prog = th.Prog.bars('C | Bb | F | C').repeat(4)
    q1 = 'c16 r16 c16 r16 <a8 r8 >c8. r16 e8 r8 | d8 r8 d16 r16 d16 r16 f4 r4 |'
    a1 = 'c4 <a8 r8 f4 r4 | >e8 r8 c8 r8 <g4 r4 |'
    q2 = 'e16 r16 e16 r16 c8 r8 e8. r16 g8 r8 | f8 r8 f16 r16 f16 r16 b-4 r4 |'
    a2 = 'a4 f8 r8 c4 r4 | g8 r8 e8 r8 c4 r4 |'
    q3 = 'g16 r16 g16 r16 e8 r8 g8. r16 >c8 r8 |'
    a3 = 'f8 r8 d8 r8 <b-4 r4 |'
    q4 = 'a16 r16 a16 r16 f8 r8 a8. r16 >c8 r8 |'
    a4 = 'g8 r8 e8 r8 c4 r4 |'
    P1, P2 = [], []
    seq = [(q1, 0, P1), (a1, 2, P2), (q2, 4, P1), (a2, 6, P2), (q3, 8, P1), (a3, 9, P2), (q4, 10, P1), (a4, 11, P2),
           (q1, 12, P1), (a1, 14, P2)]
    for i, (txt, b, dst) in enumerate(seq):
        inst = 'lead25' if dst is P1 else 'lead'
        nn, _ = pk.m('o5 ' + txt, inst, start_bar=b, vel=12 if dst is P1 else 11, gate=7, name=f'signs{i}')
        dst.extend(nn)
    bass = pk.bass_custom(prog, [0, None, 7, None, 0, None, 7, None], center=46, inst='bass', gate=0.45)
    ticks = th.drums({'t': '..x...x...x.x...'}, 16, step=0.25, vel=5, kit={'t': 'pl_tick'})
    s = Song(bpm, 64, reverb=0.1, ir_sec=0.8, lp=7600)
    s.add('p1', P1, level=1.0)
    s.add('p2', P2, level=0.95)
    s.add('tri', bass, level=0.7)
    s.add('noise', ticks, level=3.0)
    meta = dict(title='기호와 언어', mode='C 믹솔리디안 (B♭)', meter='4/4', bpm=bpm, bars=16,
                character='글자 퍼즐. 25% 펄스가 모스 부호 리듬으로 묻고 50% 펄스가 답함, 스타카토 베이스, 타자기 같은 틱')
    return s, meta, {'p1': P1, 'p2': P2}, prog


# =====================================================================
# 5. numbers 수와 모양 — F장조, 100 BPM, 끝없이 도는 2성부 돌림노래(4마디 간격)
# =====================================================================
NUM_SEG = {
    'a': 'f8 g8 a8 r8 >c4 r4 | <e8 f8 g8 r8 >c4 r4 | <d8 e8 f8 r8 a4 r4 | d8 e8 f8 r8 b-4 r4 |',
    'b': 'a4 >c4 <f4 a4 | g4 e4 c4 e4 | f4 a4 d4 f4 | f4 d4 <b-4 >d4 |',
    'c': 'f16 g16 a16 b-16 >c8 <a8 f8 c8 r4 | e16 f16 g16 a16 b-8 g8 e8 c8 r4 | '
         'd16 e16 f16 g16 a8 f8 d8 <a8 r4 | >d16 e16 f16 g16 f8 d8 <b-8 >d8 r4 |',
    'd': '>c2 <a2 | g2 e2 | f2 d2 | d2 f2 |',
}


def numbers():
    bpm = 100
    prog = th.Prog.bars('F | C | Dm | Bb').repeat(4)
    v1, v2 = [], []
    for k, sname in enumerate('abcd'):
        nn, _ = pk.m('o5 ' + NUM_SEG[sname], 'lead25', start_bar=4 * k, vel=12, gate=6, name=f'num{sname}')
        v1 += nn
    for k, sname in enumerate('dabc'):
        nn, _ = pk.m('o4 ' + NUM_SEG[sname], 'lead', start_bar=4 * k, vel=10, gate=6, name=f'num2{sname}')
        v2 += nn
    bass = pk.bass_custom(prog, [0, 0, 0, 0], center=43, inst='bass', gate=0.55, step=1.0)
    hats = th.drums({'h': 'X...x...x...x...'}, 16, step=0.25, vel=5, kit={'h': 'hat'})
    s = Song(bpm, 64, reverb=0.08, ir_sec=0.6, lp=7800)
    s.add('p1', v1, level=1.0)
    s.add('p2', v2, level=0.85)
    s.add('tri', bass, level=0.65)
    s.add('noise', hats, level=3.0)
    meta = dict(title='수와 모양', mode='F 이오니안', meter='4/4', bpm=bpm, bars=16,
                character='규칙대로 쌓이는 블록. 두 성부가 4마디 간격으로 영원히 도는 돌림노래(셈: 8분 계단 → 4분 → 16분 → 2분), 메트로놈 햇')
    return s, meta, {'v1': v1, 'v2': v2}, prog


# =====================================================================
# 6. sounds 소리와 리듬 — D 도리안, 100 BPM 스윙, 처음 4마디는 리듬만
# =====================================================================
def sounds():
    bpm = 100
    prog = th.Prog.bars('Dm7 | G | Dm7 | G').repeat(4)
    riffA = 'a8 a8 f8 a8 >c4 <a4 | b8 b8 g8 b8 >d4 <b4 |'
    riffB = 'a8 a8 f8 a8 >c8 d8 c8 <a8 | b8 >d8 <b8 g8 b4 r4 |'
    riffC = '>d8 d8 c8 d8 f4 d4 | <b8 b8 g8 b8 >d4 <g4 |'
    # 리듬만(1~4마디): M 리듬을 우드블록으로
    rnotes, _ = pk.m('o5 ' + riffA + riffA, 'pluck25', start_bar=0, name='sndr')
    rhythm = pk.rhythm_only(rnotes, 'woodblk', 8)
    lead = []
    for k, (txt, b) in enumerate([(riffA + riffA, 4), (riffB + riffC, 8), (riffA + riffB, 12)]):
        nn, _ = pk.m('o5 ' + txt, 'lead_pluck', start_bar=b, vel=12, gate=5, name=f'snd{k}')
        lead += nn
    # 50% 뒷박 코드 찌르기(9마디부터)
    stabs = []
    for (t, d, sym) in prog.items:
        if t < 32:
            continue
        root, pcs, _, _ = th.chord(sym)
        r = th.nearest(root, 62)
        inst = 'pl_stab' if sym.startswith('Dm') else 'pl_stab_maj'
        for off in (0.5, 1.5, 2.5, 3.5):
            stabs.append(Note(t + off, 0.5, r, 8, inst, 0.6))
    bass = pk.bass_custom(prog, [0, None, None, 0, None, 7, 12, None], center=43, inst='bass', gate=0.6)
    drums = th.drums({'k': 'x.......x.......', 's': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.'}, 16, step=0.25,
                     vel=7, kit={'k': 'kick', 's': 'snare', 'h': 'hat'})
    kicks = [n for n in drums if n.inst == 'kick']
    drums = [n for n in drums if n.inst != 'kick']
    s = Song(bpm, 64, swing=0.2, reverb=0.08, ir_sec=0.6, lp=7800)
    s.add('p1', lead, level=1.0)
    s.add('p2', stabs, level=1.2)
    s.add('tri', _merge(bass, kicks), level=0.7)
    s.add('noise', drums + rhythm, level=2.6)
    meta = dict(title='소리와 리듬', mode='D 도리안 (B♮)', meter='4/4 스윙', bpm=bpm, bars=16,
                character='장단 맞추기. 처음 4마디는 M의 리듬만 우드블록으로, 그다음 음높이가 입혀짐, 뒷박 코드, 당김 베이스, 노이즈 드럼이 주연')
    return s, meta, {'lead': lead}, prog


def _merge(bass, kicks):
    import arrange_theme as at
    return at._merge_kicks(bass, kicks)


# =====================================================================
# 7. home 집과 사람 — B♭장조(IV조), 80 BPM, 메인 선율을 이웃집 창에서 듣는 이중창
# =====================================================================
def home():
    import score_theme as sc
    bpm = 80
    prog = th.Prog.bars('Bb F/A | Gm Dm/F | Eb Bb/D | Eb F').repeat(4)
    mel = []
    for k, sname in enumerate('ABCD'):
        mel += sc.seg(sname, 16 * k, 'lead_soft', octave=5, vel=12)
    mel = pk.transpose(mel, 5)
    harm = pk.harmony_below(mel, prog, 3, 9, inst='lead_soft', vel_drop=3, scale=_scale_from(10))
    bass = th.bass_line(prog, 'root', 46, 'bass_soft', 12)
    s = Song(bpm, 64, reverb=0.14, ir_sec=1.1, lp=6500)
    s.add('p1', mel, level=1.0)
    s.add('p2', harm, level=0.8)
    s.add('tri', bass, level=0.6)
    meta = dict(title='집과 사람', mode='B♭ 이오니안 (E♭, 따뜻한 쪽)', meter='4/4', bpm=bpm, bars=16,
                character='남의 집 저녁 냄새. 메인 선율 A·B·C·D를 IV조로 옮기고 아래에 화음 성부를 붙인 따뜻한 이중창')
    return s, meta, {'mel': mel, 'harm': harm}, prog


# =====================================================================
# 8. mind 생각하는 것 — D 에올리안, 64 BPM, 메아리 두 번
# =====================================================================
def mind():
    bpm = 64
    prog = th.Prog.bars('Dm | Bb | F | C').repeat(4)
    mel = ('a8 a8 f8 a8 r2 | b-4. r8 d2 | c8 c8 <a8 >c8 r2 | e4. c8 r2 | '
           'r2 a8 f8 a8 a8 | f2 r2 | r2 c8 <a8 >c8 c8 | e2. r4 | '
           '>d8 d8 <a8 >d8 r2 | <f4. d8 <b-2 | >a4 >c4 <f2 | g2 e2 | '
           'a8 a8 f8 a8 r2 | d2 r2 | c8 c8 <a8 >c8 f4 c4 | e1 |')
    lead, _ = pk.m('o5 ' + mel, 'lead_soft', vel=12, gate=7, name='mind')
    e1 = th.echo(lead, delay=0.75, vel_drop=4, inst='echo_soft')
    e2 = th.echo(lead, delay=1.5, vel_drop=8, inst='echo_soft')
    sus = []
    for (t, d, sym) in prog.items:
        root = th.chord(sym)[0]
        sus.append(Note(t, d, th.nearest(root, 62), 7, 'pl_sus', 0.95))
    pedal = [Note(b * 4, 4, 50, 11, 'bass_soft', 0.97) for b in range(16)]   # D3 페달
    s = Song(bpm, 64, reverb=0.2, ir_sec=1.8, lp=6000)
    s.add('p1', lead, level=1.0)
    s.add('p2', e1, level=0.8)
    s.add('w', e2, level=0.6)
    s.add('pad', sus, level=1.2)
    s.add('tri', pedal, level=0.55)
    meta = dict(title='생각하는 것', mode='D 에올리안 + sus 화음', meter='4/4', bpm=bpm, bars=16,
                character='기억 속을 헤엄치는 느린 메아리. M을 쪼개고 거꾸로, 점8분 에코 두 번, D 페달, 중고음역 유지(무섭지 않게)')
    return s, meta, {'lead': lead}, prog


# =====================================================================
# 9. wild 들판 — G 믹솔리디안, 2/4 행진, 120 BPM
# =====================================================================
def wild():
    bpm = 120
    prog = th.Prog.bars('G | G7 | F | G | G | G7 | F | G | F | F | G | G | G | G7 | F | G', beats_per_bar=2)
    mel = ('d8. d16 <b8. >d16 | f4 d4 | c8. c16 <a8. >c16 | d2 | '
           '<g8. b16 >d8. g16 | f4 d4 | c4 f4 | d4 <g4 | '
           '>a8. f16 c8. <a16 | >c4 f4 | g8. d16 <b8. g16 | >d2 | '
           'd8. d16 <b8. >d16 | f4 d4 | c4. <a8 | g2 |')
    l1, _ = pk.m('o5 ' + mel, 'lead25', bar=2, vel=12, gate=6, name='wild1')
    l2 = th.shift(l1, dt=32)
    lead = l1 + l2
    prog2 = prog.repeat(2)
    drone = [Note(t, d, th.nearest((th.chord(sym)[0] + 7) % 12, 62), 6, 'pl_fifth', 0.95)
             for (t, d, sym) in prog2.items]
    drone = [n for n in drone if n.t >= 8]
    echo = th.echo(l2, delay=0.75, vel_drop=5, inst='echo', max_smear=0.25)
    bass = pk.bass_custom(prog2, [0, 7], center=43, inst='bass', gate=0.6, step=1.0)
    steps = th.drums({'s': 'x.x.', 'h': '.x.x'}, 32, beats_per_bar=2, step=0.5, vel=6,
                     kit={'s': 'pl_step', 'h': 'shaker'})
    s = Song(bpm, 64, reverb=0.1, ir_sec=0.9, lp=7800)
    s.add('p1', lead, level=1.0)
    s.add('p2', drone + echo, level=0.9)
    s.add('tri', bass, level=0.7)
    s.add('noise', steps, level=3.0)
    meta = dict(title='들판', mode='G 믹솔리디안 (F♮)', meter='2/4', bpm=bpm, bars=32,
                character='처음 가 보는 들판. 낯선 중심음 G 위의 M, 점8분+16분 걸음, 열린 5도 베이스와 드론, 발소리')
    return s, meta, {'lead': lead}, prog2


# =====================================================================
# 10. door_out 밖의 문 — C장조(V조), 90 BPM, 8마디 + 2마디 꼬리(C7 → F)
# =====================================================================
def door_out():
    import score_theme as sc
    bpm = 90
    prog = th.Prog.bars('C G/B | Am Em/G | F C/E | F G').repeat(2) + th.Prog.bars('C7 | F')
    a = pk.transpose(sc.seg('A', 0, 'lead25', octave=5, vel=12), 7)
    b = pk.transpose(sc.seg('B', 16, 'lead25', octave=5, vel=12), 7)
    a2 = pk.transpose(sc.seg('A', 16, 'lead', octave=4, vel=10), 7)      # 5마디부터 돌림
    tag, _ = pk.m('o5 e4 g4 b-4 >c4 | <a1 |', 'lead25', start_bar=8, vel=12, name='door_tag')
    bass = th.bass_line(prog, 'boom', 46, 'bass', 14)
    hats = th.drums({'h': '..x...x...x...x.'}, 10, step=0.25, vel=5, kit={'h': 'hat'})
    s = Song(bpm, 40, reverb=0.1, ir_sec=0.9, lp=8000)
    s.add('p1', a + b + tag, level=1.0)
    s.add('p2', a2, level=0.8)
    s.add('tri', bass, level=0.7)
    s.add('noise', hats, level=3.0)
    meta = dict(title='밖의 문', mode='C 이오니안 (V조, B♮)', meter='4/4', bpm=bpm, bars=10,
                character='문 밖으로 한 발. 메인 테마를 딸림조로 옮겨 한 칸 밝게, 5마디부터 돌림, 꼬리 C7→F 로 집 쪽으로 돌아옴')
    return s, meta, {'p1': a + b + tag, 'p2': a2}, prog


# =====================================================================
# 11. slow_room 느린 글의 방 — B♭장조, 60 BPM, 메인 A·B를 아주 천천히(작은 돌림)
# =====================================================================
def slow_room():
    import score_theme as sc
    bpm = 60
    prog = th.Prog.bars('Bb F/A | Gm Dm/F | Eb Bb/D | Eb F').repeat(2)
    v1 = pk.transpose(sc.seg('A', 0, 'lead_soft', 5, 11) + sc.seg('B', 16, 'lead_soft', 5, 11), -7)
    v2 = pk.transpose(sc.seg('A', 16, 'flute', 5, 9), -7)
    bass = th.bass_line(prog, 'root', 46, 'bass_soft', 11)
    s = Song(bpm, 32, reverb=0.2, ir_sec=1.8, lp=5500)
    s.add('p1', v1, level=1.0)
    s.add('w', v2, level=0.8)
    s.add('tri', bass, level=0.55)
    meta = dict(title='느린 글의 방', mode='B♭ 이오니안', meter='4/4', bpm=bpm, bars=8,
                character='한 글자씩 천천히 읽는 방. 메인 선율 A·B를 B♭조 60 BPM으로, 5마디부터 피리가 A를 따라 부름')
    return s, meta, {'v1': v1, 'v2': v2}, prog


# =====================================================================
# 12. lullaby 자장가 — F장조 3/4, 60 BPM, 오르골 (잠든 동안)
# =====================================================================
def lullaby():
    bpm = 60
    prog = th.Prog.bars('F | Bb/F | F | C/E | Dm | Bb | F/C | C', beats_per_bar=3).repeat(2)
    mel = ('c4 c4 <a4 | >d2 <b-4 | >c4 <a4 f4 | g2. | a4 a4 f4 | b-2 >d4 | c4 <a4 f4 | g2 e4 | '
           '>a4 a4 f4 | b-2 f4 | a4 g4 f4 | e2. | f4 e4 d4 | d2 <b-4 | >c4 <a4 f4 | g2. |')
    box, _ = pk.m('o5 ' + mel, 'pl_box', bar=3, vel=13, gate=7, name='lull')
    hi = th.shift(box, semis=12, vel=lambda v: 6, inst='pl_box_hi')
    bass = [Note(t, d, th.nearest(th.chord(sym)[2], 46), 10, 'bass_soft', 0.9) for (t, d, sym) in prog.items]
    s = Song(bpm, 48, reverb=0.2, ir_sec=1.8, lp=5200)
    s.add('p1', box, level=1.7)
    s.add('p2', hi, level=1.0)
    s.add('tri', bass, level=0.5)
    meta = dict(title='자장가', mode='F 이오니안, F 페달 위 흔들림', meter='3/4', bpm=bpm, bars=16,
                character='이불을 덮어 주는 흔들의자. 오르골 + 두 옥타브 위 작은 반짝, 마디마다 베이스 한 음. 2~3번 돌고 페이드해 빗소리만 남김')
    return s, meta, {'box': box}, prog


# =====================================================================
# 13. window_rain 창가 비 — D단조(vi-IV-I-V), 72 BPM (집에 있는 날, 비 올 때 창가)
# =====================================================================
def window_rain():
    bpm = 72
    prog = th.Prog.bars('Dm7 | Bb | F | C').repeat(4)
    mel = ('a8 a8 f8 a8 >c4 <a4 | f2 d4 f4 | c8 c8 <a8 >c8 f4 c4 | e2. r4 | '
           'd4 f4 a4 f4 | b-4 a4 f4 d4 | c4. <a8 >c4 f4 | e4. d8 c4 <a4 |')
    l1, _ = pk.m('o5 ' + mel, 'lead25', vel=11, gate=7, name='win1')
    l2 = th.shift(l1, dt=32)
    l2[-1].dur = 1.0      # 마지막 음은 짧게 → 처음으로 숨
    ech = th.echo(l2, delay=0.75, vel_drop=5, inst='echo_soft', max_smear=0.25)
    bass = th.bass_line(prog, 'boom', 46, 'bass_soft', 12)
    drips = th.arp(prog, (2, 0, 1, 2, 0, 2, 1, 0), 0.5, 79, 'drip', 7, gate=0.4)
    keep = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0]
    drips = [n for i, n in enumerate(drips) if keep[i % len(keep)]]
    s = Song(bpm, 64, reverb=0.16, ir_sec=1.3, lp=5000)
    s.add('p1', l1 + l2, level=1.1)
    s.add('p2', ech, level=0.7)
    s.add('tri', bass, level=0.6)
    s.add('arp', drips, level=1.4)
    meta = dict(title='창가 비', mode='D 에올리안 (vi-IV-I-V)', meter='4/4', bpm=bpm, bars=16,
                character='창가에서 빗방울 세기. D단조로 돌린 M, 두 번째에는 점8분 에코가 유리에 비친 것처럼 따라옴, 높은 물방울 반주')
    return s, meta, {'lead': l1 + l2}, prog


PLACES = {
    'place_hands': hands, 'place_sea': sea, 'place_sky': sky, 'place_signs': signs, 'place_numbers': numbers,
    'place_sounds': sounds, 'place_home': home, 'place_mind': mind, 'place_wild': wild,
    'place_door_out': door_out, 'place_slow_room': slow_room,
    'special_lullaby': lullaby, 'special_window_rain': window_rain,
}


def check_all(verbose=True):
    total = 0
    for pid, fn in PLACES.items():
        s, meta, voices, prog = fn()
        bpb = 3 if meta['meter'].startswith(('3/4', '6/8')) else 2 if meta['meter'].startswith('2/4') else 4
        strong = (0,) if bpb in (2, 3) else (0, 2)
        if meta['meter'].startswith('6/8'):
            strong = (0, 1.5)
        w = []
        for name, v in voices.items():
            w += th.strong_beat_check(v, prog, name, beats_per_bar=bpb, strong=strong)
        if len(voices) > 1:
            w += th.vertical_check(voices, min_overlap=0.3)
        total += len(w)
        if verbose:
            print(f'== {pid}: {len(w)} 경고')
            for x in w[:8]:
                print('   ', x)
    return total


if __name__ == '__main__':
    import instruments  # noqa
    check_all()
