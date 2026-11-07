"""장소 테마 11곡 + 자장가 + 창가 비 렌더. 사용: python3 build_places.py [id ...]"""
import json, os, sys
from multiprocessing import Pool
import instruments  # noqa
import score_places as sp
import export as ex

TRIG = {
    'place_hands': '산책 중 손과 물건 코너(모자·단추·열쇠…)를 기웃거릴 때, 그 포스터를 볼 때',
    'place_sea': '바다와 생물 코너', 'place_sky': '하늘과 날씨 코너', 'place_signs': '기호와 언어 코너',
    'place_numbers': '수와 모양 코너', 'place_sounds': '소리와 리듬 코너', 'place_home': '집과 사람 코너',
    'place_mind': '생각하는 것(꿈·기억) 코너', 'place_wild': '들판(위키 링크로 간 미지의 곳)',
    'place_door_out': '밖의 문(URL 힌트, 모의 방문)', 'place_slow_room': '느린 글의 방(linger)',
    'special_lullaby': '마무리 후 문어가 잠든 동안(2~3번 돌고 페이드 → 빗소리만)',
    'special_window_rain': '집에 있는 날 + 비/가는 비: 창가에서 빗방울 세기 장면',
}


def job(pid):
    s, meta, _, _ = sp.PLACES[pid]()
    st, loop = ex.loop_render(s, lead_in=0.5, lead_out=1.0)
    meta = dict(meta, trigger=TRIG[pid], key=meta['mode'], bar_sec=round(s.seconds() / meta['bars'], 6),
                min_stay_bars=8 if pid.startswith('place_') else None)
    kind = 'place' if pid.startswith('place_') else 'special'
    entry, _ = ex.export(st, pid, kind, rel_db=0.0, loop=loop, meta=meta, folder='place' if kind == 'place' else 'bgm',
                         opus_kbps=40, aac_kbps=48, opus_vbr='constrained')
    print(pid, entry['duration'], entry['level'], flush=True)
    return entry


if __name__ == '__main__':
    ids = sys.argv[1:] or list(sp.PLACES)
    with Pool(2) as p:
        entries = p.map(job, ids, chunksize=1)
    path = os.path.join(ex.MANIFEST_DIR, 'place.json')
    old = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else []
    byid = {e['id']: e for e in old}
    byid.update({e['id']: e for e in entries})
    ex.save_manifest_part('place', [byid[i] for i in sp.PLACES if i in byid])
