"""
메인 테마 「뽈뽈 돌림노래」 — 머니코드(캐논 진행) 위의 3성부 라운드.

조: F장조, 4/4.  진행(4마디 고리, 반 마디에 코드 하나):
  | F  C/E | Dm  Am/C | Bb  F/A | Bb  C |      (I V vi iii IV I IV V, 베이스가 F-E-D-C-Bb-A-Bb-C 로 걸어 내려감)

선율은 4마디짜리 조각 넷(A B C D)을 이어 붙인 16마디. 세 성부가 4마디 간격으로 같은 선율을 따라 들어온다.
조각마다 리듬 밀도를 다르게(파헬벨 방식) 해서 겹쳐도 서로 비켜 간다.
  A 부르기   : 8분 넷 + 4분 둘 — "뽈 뽈 다녀 와" 동기 (도도라도 미도)
  B 대답     : 4분 위주, 내려오는 노래
  C 종종걸음 : 8분 음표로 굴러가는 분산화음(문어 다리)
  D 숨 고르기: 긴 음
브리지(8마디)는 로열로드 진행(IV-V-iii-vi)으로 잠깐 다른 하늘을 보여 주고 돌아온다.
"""
import mml
import theory as th
from chip import Note

KEY = 'F'
BPM = 90

PROG = th.Prog.bars('F C/E | Dm Am/C | Bb F/A | Bb C')            # 4마디
BRIDGE = th.Prog.bars('Bb C | Am Dm | Gm C | F F/A | Bb C | Am Dm | Gm F/A | Bb C')

# 5옥타브 기준(o5 의 c = C5)
SEG = {
    'A': 'c8 c8 <a8 >c8 e4 c4 | d8 d8 <a8 >d8 e4 c4 | d8 d8 <b-8 >d8 c4 <a4 | b-8 b-8 >d8 f8 e2 |',
    'B': 'f4 g2 e4 | f4 e8 d8 c4 e4 | f4 d4 <a4 >c4 | d4 f4 g2 |',
    'C': '<f8 a8 >c8 <a8 g8 >c8 e8 c8 | <f8 a8 >d8 <a8 e8 a8 >c8 <a8 | f8 b-8 >d8 <b-8 f8 a8 >c8 <a8 | d8 f8 b-8 >d8 e8 d8 c8 <b-8 |',
    'D': 'c1 | d2 c2 | <b-2 a2 | b-2 >c4 c8 c8 |',
}
BRIDGE_MEL = ('f4. d8 e4 g4 | e2 d4 f4 | d4. <b-8 >c2 | <a2 r4 >c8 c8 | '
              'f4. d8 e4 g4 | a2 f4 d4 | d4. <b-8 >c2 | d4 f4 e2 |')


def seg(name, start, inst, octave=5, vel=12, gate=7):
    notes, end = mml.parse(SEG[name], inst=inst, octave=octave, vel=vel, gate=gate, start=start, bar=4,
                           name=f'seg{name}')
    assert abs(end - start - 16) < 1e-6, (name, end - start)
    return notes


def round_voice(start_bar, inst, octave=5, vel=12, order='ABCD', gate=7):
    out = []
    for k, s in enumerate(order):
        out += seg(s, (start_bar + 4 * k) * 4, inst, octave, vel, gate)
    return out


def bridge_mel(start_bar, inst, octave=5, vel=12):
    notes, end = mml.parse(BRIDGE_MEL, inst=inst, octave=octave, vel=vel, start=start_bar * 4, bar=4,
                           name='bridge')
    return notes


def check():
    """화성 검사 — 라운드 겹침 전부"""
    warns = []
    prog24 = PROG.repeat(6)
    v1 = round_voice(0, 'lead')
    v2 = round_voice(4, 'lead25')
    v3 = round_voice(8, 'flute', octave=4)
    for nm, v in (('v1', v1), ('v2', v2), ('v3', v3)):
        warns += th.strong_beat_check(v, prog24, nm)
    warns += th.vertical_check({'v1': v1, 'v2': v2, 'v3': v3})
    bass = th.bass_line(prog24, 'root', 41)
    warns += th.vertical_check({'v1': v1, 'bass': bass}, min_overlap=0.5)
    br, _ = mml.parse(BRIDGE_MEL, octave=5, bar=4, name='bridge')
    warns += th.strong_beat_check(br, BRIDGE, 'bridge')
    uni = th.unison_check({'v1': v1, 'v2': v2, 'v3': v3}, 1.0)
    return warns, uni


if __name__ == '__main__':
    w, u = check()
    print('\n'.join(w) or '불협 경고 없음')
    print('--- 오래 겹치는 같은 음')
    print('\n'.join(u) or '없음')
