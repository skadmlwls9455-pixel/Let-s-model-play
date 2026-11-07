"""
뽈뽈 악기 상자 — 모든 곡·효과음이 같은 악기를 나눠 쓴다(톤 통일의 핵심).

규칙
- 리드는 50%·25% 듀티. 12.5% 는 반주 퉁김·반짝임에만, 작게.
- 어택은 1~2프레임 살짝 낮게 시작(딱 소리 줄이기), 서스테인은 9~11.
- 비브라토는 늦게(10~14프레임 뒤), 얕게(±0.12~0.2반음), 5~5.5Hz.
- 노이즈는 작게. 하이햇은 짧고, 스네어 대신 '톡' 하는 짧은 노이즈.
"""
from chip import preset

# ---------- 멜로디 ----------
preset('lead',       wave='pulse', duty=[0.25, 0.25, 0.5], env=[6, 10, 12, 11, 11, 10, 10, 10, 9],
       rel=[0.5, 0.33, 0.17, 0.0], vib=(18, 0.15, 5.0), sus_decay=0.02)
preset('lead_soft',  wave='pulse', duty=0.5, env=[4, 7, 9, 10, 10, 9, 9, 9, 8],
       rel=[0.6, 0.45, 0.3, 0.18, 0.08], vib=(18, 0.14, 5.0), sus_decay=0.02)
preset('lead25',     wave='pulse', duty=0.25, env=[6, 9, 11, 10, 10, 9, 9, 8],
       rel=[0.5, 0.33, 0.17, 0.0], vib=(18, 0.13, 5.2), sus_decay=0.02)
preset('lead_pluck', wave='pulse', duty=[0.125, 0.25], env=[12, 11, 10, 9, 8, 7, 6, 6, 5, 5, 4],
       rel=[0.5, 0.25, 0.1], sus_decay=0.15)
preset('flute',      wave='wave', table='flute', env=[5, 8, 10, 11, 11, 11, 10],
       rel=[0.75, 0.55, 0.35, 0.2, 0.1], vib=(18, 0.16, 5.0))
preset('ocarina',    wave='wave', table='sine', env=[4, 8, 11, 12, 12, 11],
       rel=[0.8, 0.6, 0.4, 0.25, 0.12, 0.05], vib=(16, 0.2, 4.8))
preset('organ',      wave='wave', table='organ', env=[10, 11, 10, 10, 9],
       rel=[0.6, 0.35, 0.15])
preset('strings',    wave='wave', table='saw', env=[3, 5, 7, 8, 9, 9, 9],
       rel=[0.85, 0.7, 0.55, 0.4, 0.28, 0.18, 0.1, 0.05], vib=(18, 0.12, 4.6))

# ---------- 반짝이·오르골 ----------
preset('musicbox',   wave='wave', table='sine', env=[13, 12, 11, 10, 9, 8, 8, 7, 7, 6, 6, 5, 5, 5, 4],
       rel=[0.6, 0.4, 0.25, 0.12], sus_decay=0.06)
preset('bell',       wave='wave', table='bell', env=[13, 11, 10, 9, 8, 7, 6, 6, 5, 5, 4, 4, 3],
       rel=[0.6, 0.35, 0.15], sus_decay=0.05)
preset('glock',      wave='pulse', duty=0.125, env=[12, 9, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1],
       rel=[0.5, 0.2], sus_decay=0.08)
preset('pluck',      wave='pulse', duty=0.125, env=[9, 7, 6, 5, 4, 3, 3, 2],
       rel=[0.5, 0.2], sus_decay=0.1)
preset('pluck25',    wave='pulse', duty=0.25, env=[9, 8, 6, 5, 4, 4, 3, 3, 2],
       rel=[0.5, 0.2], sus_decay=0.1)
preset('drip',       wave='pulse', duty=0.25, env=[10, 6, 3, 1], rel=[0.3],
       pitch=[3, 1.5, 0.5, 0])

# ---------- 화음 ----------
preset('chordarp',   wave='pulse', duty=0.25, env=[6, 6, 5, 5, 5, 4], rel=[0.6, 0.3, 0.1],
       arp=[0, 0, 4, 4, 7, 7])   # 2프레임마다 한 음
preset('pad',        wave='pulse', duty=0.5, env=[2, 3, 4, 5, 5, 6, 6], rel=[0.85, 0.7, 0.55, 0.4, 0.25, 0.1],
       vib=(20, 0.08, 4.0))

# ---------- 베이스 ----------
# NES 삼각파는 볼륨 조절이 없다 → env 를 거의 평평하게, 게이트로만 끊는다.
preset('bass',       wave='tri', env=[15], rel=[0.5], cut=False)
preset('bass_soft',  wave='tri', env=[11], rel=[0.6, 0.3], cut=False)
preset('bass_pulse', wave='pulse', duty=0.5, env=[11, 10, 9, 9, 8], rel=[0.5, 0.2])

# ---------- 타악 ----------
preset('kick',   wave='tri', env=[15], rel=[0.0], pitch=[0, -6, -12, -18, -24, -28, -30], cut=False, gain=1.1)
preset('snare',  wave='noise', noise=(7, False), env=[6, 5, 4, 3, 2, 1, 1, 0], rel=[0.0], gain=0.7)
preset('tick',   wave='noise', noise=(3, False), env=[5, 3, 1, 0], rel=[0.0], gain=0.6)
preset('hat',    wave='noise', noise=(1, False), env=[5, 3, 1, 0], rel=[0.0], gain=0.5)
preset('hatopen', wave='noise', noise=(1, False), env=[5, 4, 3, 3, 2, 2, 1, 1, 0], rel=[0.0], gain=0.45)
preset('shaker', wave='noise', noise=(2, False), env=[2, 4, 3, 2, 1, 0], rel=[0.0], gain=0.5)
preset('woodblk', wave='noise', noise=(5, True), env=[6, 3, 1, 0], rel=[0.0], gain=0.55)
preset('tom',    wave='tri', env=[15], rel=[0.0], pitch=[0, -2, -4, -6, -8, -10, -12], cut=False)

# ---------- 에코(트래커식 따라 하기) ----------
# 리서치 03: 두 번째 펄스 25%, 점8분 늦게, 약 -7~-9 dB, +3~5센트 디튠
preset('echo',       wave='pulse', duty=0.25, env=[4, 6, 7, 7, 6, 6, 6, 5],
       rel=[0.5, 0.33, 0.17, 0.0], pitch=[0.04], sus_decay=0.02)
preset('echo_soft',  wave='pulse', duty=0.5, env=[3, 5, 6, 6, 5, 5, 5, 4],
       rel=[0.6, 0.4, 0.2, 0.08], pitch=[0.04], sus_decay=0.02)
preset('echo_box',   wave='wave', table='sine', env=[7, 6, 6, 5, 5, 4, 4, 4, 3, 3, 3, 2],
       rel=[0.5, 0.25, 0.1], pitch=[0.04], sus_decay=0.04)
