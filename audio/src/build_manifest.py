"""
manifest.d/*.json 을 모아 audio/manifest.json 하나로 묶고, 게임 상태 → 소리 매핑과 재생 규칙을 함께 적는다.
매핑에 적힌 id 가 실제로 있는지 검사한다(없으면 실패).
사용: python3 build_manifest.py
"""
import datetime
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
PARTS = ['bgm', 'place', 'jingle', 'sfx', 'amb']

TIMES = {'dawn': [6, 9], 'day': [9, 17], 'dusk': [17, 19], 'night': [19, 6]}


def home_map():
    m = {}
    for t in TIMES:
        m[t] = {w: f'theme_{t}_{w}' for w in ('clear', 'drizzle', 'rain')}
        m[t]['snow'] = 'theme_snow_night' if t == 'night' else 'theme_snow_day'
    return m


MAP = {
    'home_bgm': {
        '_how': '집 화면 BGM = home_bgm[시간대][날씨]. 시간대는 실제 시계(dawn 6~9, day 9~17, dusk 17~19, night 19~6). '
                '날씨는 게임의 weatherFor() 값 그대로(rain/drizzle/clear/snow). 등불 0~5칸은 항상 비 → 비 버전이 가장 많이 들린다.',
        **home_map(),
    },
    'stay_home_window': {
        '_how': '집에 있는 날 + 날씨가 rain/drizzle 이고 창가 장면(빗방울 세기)일 때 집 BGM 대신',
        'rain': 'special_window_rain', 'drizzle': 'special_window_rain',
    },
    'sleep': {
        '_how': 'wrap_up 반응 징글 → sleep_settle → 자장가 2~3바퀴 → 4초 페이드 → 환경음만',
        'bgm': 'special_lullaby', 'settle': 'sleep_settle', 'snore': ['snore_1', 'snore_2', 'snore_3'],
    },
    'places': {
        '_how': '산책 중 기웃(peek)한 곳의 코너 → 장소 테마. 포스터 열람 화면에서도 그 포스터의 기억 장소 테마.',
        'hands': 'place_hands', 'sea': 'place_sea', 'sky': 'place_sky', 'signs': 'place_signs',
        'numbers': 'place_numbers', 'sounds': 'place_sounds', 'home': 'place_home', 'mind': 'place_mind',
        'wild': 'place_wild', 'door_out': 'place_door_out', 'slow_room': 'place_slow_room',
        'letter_room': None,
        '_letter_room': '편지의 방은 BGM 없이 jingle letter_room 한 번 + 환경음만(항상 비어 있는 방, 슬프지 않게)',
    },
    'remember_motif': {
        '_how': 'remember 이벤트(기억 고르기) 때 그 장소의 짧은 동기',
        **{k: f'remember_{k}' for k in ('hands', 'sea', 'sky', 'signs', 'numbers', 'sounds', 'home', 'mind', 'wild',
                                        'slow_room', 'letter_room', 'door_out')},
    },
    'moods': {
        '_how': 'wrap_up.reaction → 징글. BGM 을 duck_db 만큼 내리고 다음 박에 시작',
        '폴짝': 'mood_poljjak', '우쭐': 'mood_ujjul', '덤덤': 'mood_deomdeom', '졸림': 'mood_jollim',
    },
    'peek_status': {
        '_how': 'peek.status → 효과음 그룹(변형 중 직전 것을 피해 고르기). 다섯 개 모두 같은 길이·같은 리듬, 실패도 벌하지 않는 소리',
        'read': 'peek_read', 'builtin': 'peek_builtin', 'simulated': 'peek_simulated', 'failed': 'peek_failed',
        'none': 'peek_none',
    },
    'events': {
        'depart': ['depart_windup', 'depart_leave'],
        'depart_rain_extra': 'depart_rain_extra',
        'stay_home': ['depart_windup', 'stay_settle'],
        'return': 'return_home',
        'hang_poster': 'hang_poster',
        'lantern': {str(i): f'lantern_{i}' for i in range(1, 8)},
        'lantern_8': 'room_complete',
        'lantern_prop': 'lantern_prop_fade',
        'rare': 'rare_sparkle',
        'empty_turn': 'empty_turn',
        'time_of_day_change': {t: f'chime_{t}' for t in TIMES},
        'weather_change': 'weather_shift',
        'stay_activities': {'count_rain': 'stay_count_drops', 'tidy': 'stay_tidy', 'hum': 'stay_hum'},
    },
    'interaction': {
        'pet': ['pet_squish', 'pet_stroke', 'pet_happy'], 'window_tap': 'window_tap', 'look': 'curious',
        'walk_step': 'step',
    },
    'ui': {
        'tap': 'ui_tap', 'toggle_on': 'ui_toggle_on', 'toggle_off': 'ui_toggle_off', 'sheet_open': 'sheet_open',
        'sheet_close': 'sheet_close', 'toast': 'toast', 'log_line': 'log_line', 'card_flip': 'card_flip',
        'audio_on': 'audio_on', 'album_open': 'album_open',
        'voice': {'_how': '말풍선 음절마다 voice_{a|u}_{음}. 모음 ㅏㅓㅗ… = a(열린), ㅜㅡ… = u(둥근). 기분별 음 집합은 README',
                  'a': 'voice_a', 'u': 'voice_u'},
    },
    'ambience': {
        '_how': '날씨 환경음(항상) + 시간·계절 덧층 + 등불 온기층. 4~12초 크로스페이드',
        'weather': {'rain': 'amb_rain', 'drizzle': 'amb_drizzle', 'snow': 'amb_snow_wind',
                    'clear': {'dawn': 'amb_clear_day', 'day': 'amb_clear_day', 'dusk': 'amb_clear_day',
                              'night': 'amb_clear_night'}},
        'season_night': {'summer': 'amb_summer_night', 'autumn': 'amb_autumn'},
        'layers': {'rain': 'layer_drips', 'drizzle': 'layer_drips', 'snow': 'layer_snowbells',
                   'clear_night': 'layer_sparkle', 'winter': 'layer_winter_chime'},
        'lantern_warmth': {'0': None, '1-3': 'amb_lantern_low', '4-6': 'amb_lantern_mid', '7-8': 'amb_lantern_high'},
    },
}

RULES = {
    'formats': {
        'pick': "canPlayType('audio/ogg; codecs=opus') 가 'probably'/'maybe' 면 .ogg(Opus), 아니면 .m4a(AAC). "
                "decodeAudioData 가 실패하면 .m4a 로 한 번 더(iOS Safari 18.4 미만은 Ogg 를 못 읽는다).",
        'sample_rate': 48000, 'channels': 1,
    },
    'loudness': {
        'reference': 'BGM 통합 -20 LUFS. 모든 파일은 들려줄 크기가 이미 구워져 있다(level.rel_db = BGM 대비). '
                     '게임은 gain 1.0 으로 틀고 마스터·음악·효과·환경 슬라이더만 곱한다.',
        'night_master_db': -3,
    },
    'looping': {
        'how': 'Web Audio AudioBufferSourceNode 에 loop=true, loopStart=loop.start, loopEnd=loop.end. '
               '<audio loop> 는 쓰지 말 것(인코더 패딩 때문에 틈이 생김). 파일 앞 0.5초·뒤 1초는 이음새용 여유분.',
        'start_at': '처음 재생은 offset=loop.start 로 시작(앞 여유분은 건너뜀)',
    },
    'buses': {
        'bgm': '집·장소·특수 곡', 'amb': '환경음·덧층', 'sfx_event': '징글·이벤트', 'sfx_ui': 'UI·상호작용', 'voice': '말풍선 블립',
        'ducking': 'jingle/sfx 의 duck_db 만큼 bgm(과 amb 절반) 버스를 내린다. 어택 60~80ms, 릴리스 500~900ms. 멈추지 말고 내리기만.',
    },
    'transitions': [
        {'what': '장소 ↔ 장소, 집 ↔ 장소', 'when': '다음 마디선(bar_sec)', 'how': '1마디 등전력 크로스페이드', 'min_stay_bars': 8},
        {'what': '시간대 경계(6·9·17·19시)', 'when': '현재 4마디 프레이즈가 끝날 때',
         'how': '2마디 페이드아웃 → chime_{새 시간대} → 새 곡을 처음(마디 1)부터'},
        {'what': '날씨', 'when': '즉시', 'how': '곡은 마디선에서 1마디 크로스페이드, 환경음은 8~12초 크로스페이드 + weather_shift'},
        {'what': '방 완성(등불 8칸)', 'how': 'BGM 일시정지 → room_complete → 다음 프레이즈 처음부터 다시'},
        {'what': '산책 출발', 'how': 'depart_windup(움츠림) → depart_leave → 집 BGM 을 -3dB(빈 방) 또는 첫 peek 장소 테마로'},
        {'what': '귀가', 'how': 'return_home(-3dB 덕킹) → 다음 프레이즈에 집 BGM 으로'},
    ],
    'rest': '집 BGM 은 한 사이클(약 3.5~4.5분)이 끝나면 20~90초(시드로) 환경음만 두고 쉬었다가 다시. '
            '밤에는 자장가 한 번 뒤로 BGM 을 끄고 빗소리만 두어도 된다.',
    'variation': '변형이 여러 개인 효과음(group)은 직전과 다른 것을 고른다. 랜덤은 게임의 시드 PRNG 로(Math.random 금지). '
                 '음높이 랜덤은 ±15센트 이내(음 밖으로 나가지 않게).',
    'min_gap_ms': '효과음마다 meta.min_gap_ms. 동시에 6개 이상 울리지 않게.',
}


KIND_KO = [('bgm', '집 테마'), ('special', '특수 곡'), ('place', '장소 테마'), ('jingle', '징글·이벤트'), ('sfx', '효과음'),
           ('amb', '환경음'), ('layer', '환경 덧층')]


def write_catalog(sounds, total):
    lines = ['# 소리 목록', '',
             f'`manifest.json` 에서 자동으로 만든 표다(`python3 src/build_manifest.py`). 소리 {len(sounds)}개, '
             f'파일 합계 {total / 1e6:.1f} MB(Opus + AAC 두 벌).', '',
             '- **BGM 대비** = 이 파일이 BGM(−20 LUFS)보다 몇 dB 크게/작게 구워져 있는지. 게임은 gain 1.0 으로 튼다.',
             '- **루프** = Web Audio `loopStart`/`loopEnd`(초). 비어 있으면 한 번만 트는 소리.', '']
    for kind, ko in KIND_KO:
        items = [x for x in sounds if x['kind'] == kind]
        if not items:
            continue
        lines += [f'## {ko} ({len(items)})', '', '| id | 길이 | BGM 대비 | 루프 | 언제 / 성격 |', '|---|---|---|---|---|']
        for x in items:
            lp = f"{x['loop']['start']}–{x['loop']['end']}" if x.get('loop') else ''
            desc = x.get('character') or x.get('trigger') or ''
            if x.get('title') and kind in ('bgm', 'special', 'place'):
                desc = f"**{x['title']}** — {desc}"
            extra = []
            if x.get('bpm'):
                extra.append(f"{x['bpm']} BPM")
            if x.get('duck_db'):
                extra.append(f"BGM {x['duck_db']} dB 덕킹")
            if extra:
                desc += ' (' + ', '.join(extra) + ')'
            desc = desc.replace('|', '/').replace('\n', ' ')
            lines.append(f"| `{x['id']}` | {x['duration']:.2f}s | {x['level']['rel_db']:+g} | {lp} | {desc} |")
        lines.append('')
    with open(os.path.join(ROOT, 'CATALOG.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))


def main():
    sounds = []
    missing_parts = []
    for p in PARTS:
        path = os.path.join(HERE, 'manifest.d', p + '.json')
        if not os.path.exists(path):
            missing_parts.append(p)
            continue
        sounds += json.load(open(path, encoding='utf-8'))
    ids = {s['id'] for s in sounds}
    groups = {s.get('group') for s in sounds if s.get('group')}
    known = ids | groups

    bad = []

    def walk(x, path):
        if isinstance(x, dict):
            for k, v in x.items():
                if not k.startswith('_'):
                    walk(v, path + [k])
        elif isinstance(x, list):
            for v in x:
                walk(v, path)
        elif isinstance(x, str):
            if x not in known:
                bad.append('/'.join(path) + ' → ' + x)
    walk(MAP, [])

    # 파일 존재 검사
    nofile = [s['id'] for s in sounds for f in s.get('files', {}).values()
              if not os.path.exists(os.path.join(ROOT, f))]

    total = sum(os.path.getsize(os.path.join(ROOT, f)) for s in sounds for f in s.get('files', {}).values()
                if os.path.exists(os.path.join(ROOT, f)))
    out = dict(
        name='뽈뽈 문어 사운드',
        version=1,
        generated=datetime.date.today().isoformat(),
        key='F major (모든 소리의 집). 효과음·징글 선율은 F 펜타토닉(F G A C D)',
        motif='M = C5 C5 A4 C5 (8분) E5 C5 (4분) — "뽈 뽈 다녀 와"',
        rules=RULES,
        map=MAP,
        sounds=sounds,
    )
    with open(os.path.join(ROOT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    write_catalog(sounds, total)
    print(f'sounds: {len(sounds)}  total bytes: {total / 1e6:.1f} MB  parts missing: {missing_parts}')
    if bad:
        print('매핑에 없는 id:', *bad, sep='\n  ')
    if nofile:
        print('파일 없음:', nofile)
    return 1 if (bad or nofile) else 0


if __name__ == '__main__':
    sys.exit(main())
