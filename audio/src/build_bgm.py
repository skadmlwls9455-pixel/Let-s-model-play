"""
집 테마 14곡 렌더: 시간대 4 × 날씨 3(맑음·가는 비·비) + 눈 2.
사용: python3 build_bgm.py            (전부, 2프로세스)
      python3 build_bgm.py theme_day_clear theme_night_rain   (일부)
"""
import json
import os
import sys
from multiprocessing import Pool

import instruments  # noqa: F401  (프리셋 등록)
import arrange_theme as at
import export as ex

TIME_KO = {'dawn': '새벽 6~9시', 'day': '낮 9~17시', 'dusk': '노을 17~19시', 'night': '밤 19~6시'}
WX_KO = {'clear': '맑음', 'drizzle': '가는 비', 'rain': '비', 'snow': '눈'}
CHAR = {
    ('dawn', 'clear'): '창틈으로 들어오는 첫 빛. 부드러운 펄스와 오카리나, 오르골 반주, 북 없음',
    ('day', 'clear'): '기본형. 펄스 리드 + 25% 돌림 성부 + 게임보이 피리, 통통 베이스, 셋이 구간에만 작은 틱',
    ('dusk', 'clear'): '금빛으로 하루를 접는 노래. 피리 리드, 현 같은 웨이브, 살짝 스윙, 브러시',
    ('night', 'clear'): '자장가 옷. 오르골 리드, 오카리나, 종, 64 BPM',
    ('dawn', 'drizzle'): '새벽 + 처마 물방울 반주, 필터 살짝',
    ('day', 'drizzle'): '낮 + 물방울 반주, 타악 절반, 필터 살짝 — 비가 잦아드는 날',
    ('dusk', 'drizzle'): '노을 + 물방울 반주',
    ('night', 'drizzle'): '밤 + 물방울 반주',
    ('dawn', 'rain'): '새벽, 비. 한 단계 느리게, 얇은 리드, 듬성듬성한 빗방울 반주, 먹먹하게',
    ('day', 'rain'): '비 오는 낮(등불 0~5칸의 기본 날씨). 느리게·얇게·먹먹하게, 북 없음 — 빗소리가 주인공',
    ('dusk', 'rain'): '노을, 비',
    ('night', 'rain'): '비 오는 밤의 자장가. 60 BPM',
    ('day', 'snow'): '눈 오는 날(1~2월). 오르골 + 종, 한 단계 느리게, 잔향 조금 더',
    ('night', 'snow'): '눈 오는 밤. 오르골 + 종, 60 BPM',
}

JOBS = []
for t in ('day', 'dawn', 'dusk', 'night'):
    for w in ('clear', 'drizzle', 'rain'):
        JOBS.append((f'theme_{t}_{w}', t, w))
JOBS += [('theme_snow_day', 'day', 'snow'), ('theme_snow_night', 'night', 'snow')]


def job(args):
    sid, t, w = args
    song = at.build(t, w)
    st, loop = ex.loop_render(song, lead_in=0.5, lead_out=1.0)
    bar_s = 4 * 60.0 / song.bpm
    meta = dict(
        title=f'뽈뽈 돌림노래 — {TIME_KO[t]} · {WX_KO[w]}',
        trigger=f'집 화면 BGM. 시간대={t}, 날씨={w}' + (' (1~2월 눈)' if w == 'snow' else ''),
        character=CHAR[(t, w)],
        time=t, weather=w, key='F major', bpm=song.bpm, meter='4/4', bars=at.CYCLE_BARS,
        bar_sec=round(bar_s, 6), phrase_bars=4,
        sections=dict(solo=[1, 16], duo=[17, 32], trio=[33, 48], drain=[49, 56], bridge=[57, 64], tail=[65, 68]),
        progression='| F C/E | Dm Am/C | Bb F/A | Bb C | (캐논 진행), 브리지: 로열로드',
        rest_after_sec=[20, 90],
    )
    entry, _ = ex.export(st, sid, 'bgm', rel_db=0.0, loop=loop, meta=meta, opus_kbps=40, aac_kbps=48, opus_vbr='constrained')
    print(sid, entry['duration'], entry['level'], flush=True)
    return entry


if __name__ == '__main__':
    want = sys.argv[1:]
    jobs = [j for j in JOBS if not want or j[0] in want]
    with Pool(2) as p:
        entries = p.map(job, jobs, chunksize=1)
    # 기존 부분 매니페스트와 병합(일부만 다시 렌더한 경우)
    path = os.path.join(ex.MANIFEST_DIR, 'bgm.json')
    old = []
    if os.path.exists(path):
        old = json.load(open(path, encoding='utf-8'))
    byid = {e['id']: e for e in old}
    for e in entries:
        byid[e['id']] = e
    order = [j[0] for j in JOBS]
    ex.save_manifest_part('bgm', [byid[i] for i in order if i in byid])
