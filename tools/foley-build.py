#!/usr/bin/env python3
"""
tools/foley-build.py -- 뽈뽈 문어 부엌 소리 (진짜 녹음 foley, foley/) 한 벌을 굽는다.

  python3 -I tools/foley-build.py --raw ~/.cache/ppolppol-foley/raw            굽기 + foley/ 의 문서 + 검사
  python3 -I tools/foley-build.py --raw DIR --no-check                         검사(디코드, 스펙트로그램) 없이
  python3 -I tools/foley-build.py --raw DIR --only cook_flip_1,cook_sizzle_2   일부만 (manifest 등 문서는 안 쓴다)
  python3 -I tools/foley-build.py --raw DIR --out /tmp/foley-try               저장소 foley/ 대신 다른 곳에 (견주기)

  --raw   받은 원본을 둔 곳 (기본: $FOLEY_RAW, 없으면 ~/.cache/ppolppol-foley/raw). 저장소에는 원본을 넣지 않는다.
  --out   굽는 곳 (기본: 저장소 foley/). cook/<id>.ogg|.m4a + manifest.json, CREDITS.md, README.md, listen.html
  --work  검사 보고서(report.md, report.json), 스펙트로그램 PNG, 한 판 미리 듣기(preview/) (기본: --raw 옆 work/).
          게임 파일이 아니라서 저장소에 넣지 않는다.
필요  numpy, ffmpeg (libopus, aac). 같은 입력이면 같은 파일이 나온다 (난수 없음, ffmpeg -bitexact).
      원본을 받을 때만: curl, unzip, 7z (p7zip; 없으면 python 의 py7zr).

원본 다시 받기 (CREDITS.md 의 페이지에서. 모두 https://opengameart.org/sites/default/files/<파일> 로 바로 받힌다)
  --raw 아래에 이 자리 그대로 둔다. 묶음(zip, 7z)은 그 폴더 안 x/ 에 푼다. 받은 뒤 이 스크립트가 RAW_SHA256(아래)으로
  파일이 그때와 같은지 본다: 다르면 경고만 하고 굽는다 (지은이가 파일을 바꿨으면 소리도 조금 달라진다).

  자리 (--raw 아래)                                                      받을 파일 -> 할 일
  oga-202-more-sound-effects/x/Kitchen/Kitchen_0{2,3,4,6}.wav            MoreSounds.zip -> unzip -d x
  oga-squish-sounds-effects/{squishpop,squish_02,squish_01_0,squish_05}.mp3   같은 이름 그대로
  oga-stove-switch/switch_strength_stove_01.ogg                          같은 이름
  oga-stove-switch/turn_stove_on_01.ogg                                  turn_stove_on_01_0.ogg -> 이 이름으로 저장
  oga-flare-ignition/ignition.flac                                       같은 이름
  oga-general-household-sound-effects/{fryingpan01,forkonplate01}.wav    같은 이름 (큰 WAV: 21 MB, 42 MB)
  oga-12-wet-towel-hittingfallingpunching-floor-sounds/x/wet_towel_on_floor/wet_towel_on_floor-{07,10}.flac
                                                                         wet_towel_on_floor.7z -> 7z x -ox
  oga-54-casino-sound-effects-cards-dice-chips/x/Audio/{card-slide-7,card-slide-8,die-throw-1}.ogg
                                                                         kenney_casino-audio.zip -> unzip -d x
  oga-crunch-sounds-burnt-toast/crunch_{7,9,10}.ogg                      같은 이름
  oga-kitchen-ambience-sfx/slow_chops_on_cutting_board.wav               같은 이름 (CC BY 4.0, 크레딧 필수)
  oga-steam-release-sounds/x/steam hisses - Marker #1.wav                steam_hisses.zip -> unzip -d x
  oga-water-sounds/water_sounds.wav                                      같은 이름 (CC BY 3.0, 크레딧 필수)
  oga-boiling-water-loops/cooking_without_cover_01_0.ogg                 같은 이름
  oga-50-rpg-sound-effects/x/OGG/{bookPlace1,bookPlace3,cloth2}.ogg      RPGsounds_Kenney.zip -> unzip -d x

  예:  R=~/.cache/ppolppol-foley/raw; F=https://opengameart.org/sites/default/files
       mkdir -p "$R/oga-202-more-sound-effects/x" && curl -fL "$F/MoreSounds.zip" -o "$R/oga-202-more-sound-effects/MoreSounds.zip" \
         && unzip -o "$R/oga-202-more-sound-effects/MoreSounds.zip" -d "$R/oga-202-more-sound-effects/x"
       mkdir -p "$R/oga-stove-switch" && curl -fL "$F/turn_stove_on_01_0.ogg" -o "$R/oga-stove-switch/turn_stove_on_01.ogg"
  라이선스는 받을 때마다 그 페이지에서 다시 본다 (CREDITS.md 의 '라이선스·출처 메모'). 받은 원본은 ffmpeg 로 해독만 한다.
  처음 구운 곳(2026-11-08)의 원본 폴더 이름(oga-<페이지 slug>)을 그대로 쓴다. 주석의 work/... 는 그때의 실험 폴더라 없다.

규칙은 audio/src/export.py, ambience.py 를 따른다.
  - 48 kHz 모노. Ogg Opus + AAC 두 벌. 잡음 같은 소리라 Opus -application lowdelay, AAC -aac_coder fast.
  - 음량: BGM 통합 -20 LUFS 기준. 목표 = -20 + rel_db. 파일마다 1.5 s 이상이면 통합 LUFS, 짧으면 소리 나는 구간 RMS
    (export.py level() 코드와 audio/manifest.json 이 쓰는 경계. 그 파일 설명 글의 '1초' 는 코드와 다르다).
  - 피크: true peak -3 dBTP 아래 (넘으면 export 와 같은 tanh 소프트 리미터).
  - 루프: 파일 = [앞 0.5 s = 몸통 끝 복사][몸통 L][뒤 1.0 s = 몸통 앞 복사], loop = {start 0.5, end 0.5 + L}.
필터는 RBJ 바이쿼드(버터워스 단을 겹침)를 FFT 위에서 그대로 곱한다: 인과(causal) IIR 과 같은 결과라 앞울림이 없다.
긴 원본은 통째로 거른 뒤 자른다(자른 자리에 필터 시작 잡음이 생기지 않게). 주기 루프(끓는 냄비)는 원형으로 거른다.
"""
import argparse
import hashlib
import html
import json
import math
import os
import re
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
# 자리는 main() 이 --raw / --out / --work 로 정한다 (set_paths). 스크립트 안에 작업 폴더 경로를 굳혀 두지 않는다.
RAW = OUT = SND = CHECK = WORK = BASE = None


def set_paths(raw, out, work):
    global RAW, OUT, SND, CHECK, WORK, BASE
    RAW = os.path.abspath(os.path.expanduser(raw))
    OUT = os.path.abspath(os.path.expanduser(out))
    SND = os.path.join(OUT, 'cook')
    WORK = os.path.abspath(os.path.expanduser(work))
    CHECK = os.path.join(WORK, 'check')
    BASE = WORK                                  # 보고서 안의 상대 경로는 --work 기준


# 처음 받은 원본의 sha256 앞 16자리 (2026-11-08). 다시 받은 파일이 다르면 main() 이 경고한다.
RAW_SHA256 = {
    'oga-stove-switch/turn_stove_on_01.ogg': '44b351416dc52d61',
    'oga-stove-switch/switch_strength_stove_01.ogg': '5fea0c683cf120bc',
    'oga-flare-ignition/ignition.flac': 'bd8281bcee65bc70',
    'oga-general-household-sound-effects/fryingpan01.wav': 'cf725a48f22ef7bc',
    'oga-general-household-sound-effects/forkonplate01.wav': 'f0ded35a69cfecdf',
    'oga-12-wet-towel-hittingfallingpunching-floor-sounds/x/wet_towel_on_floor/wet_towel_on_floor-07.flac': 'c6f86f0395564bcd',
    'oga-12-wet-towel-hittingfallingpunching-floor-sounds/x/wet_towel_on_floor/wet_towel_on_floor-10.flac': '1fe42602289c93d9',
    'oga-54-casino-sound-effects-cards-dice-chips/x/Audio/card-slide-7.ogg': 'bda2040194f43484',
    'oga-54-casino-sound-effects-cards-dice-chips/x/Audio/card-slide-8.ogg': '95d9aa26f8c63af9',
    'oga-steam-release-sounds/x/steam hisses - Marker #1.wav': '1dd3462e1320c9a6',
    'oga-boiling-water-loops/cooking_without_cover_01_0.ogg': 'fea883de35adef8f',
    'oga-squish-sounds-effects/squishpop.mp3': '608865f49f3631c8',
    'oga-squish-sounds-effects/squish_02.mp3': '1ea4ec07d2af69d2',
    'oga-squish-sounds-effects/squish_01_0.mp3': 'ed0faca6a71070ab',
    'oga-squish-sounds-effects/squish_05.mp3': '2a34bd168473634e',
    'oga-kitchen-ambience-sfx/slow_chops_on_cutting_board.wav': 'cea789d8dd76d574',
    'oga-crunch-sounds-burnt-toast/crunch_9.ogg': '7f98af03bb6c357b',
    'oga-crunch-sounds-burnt-toast/crunch_10.ogg': '53932b9bff40f7cb',
    'oga-crunch-sounds-burnt-toast/crunch_7.ogg': '9bcbc8bbda5e18c7',
    'oga-202-more-sound-effects/x/Kitchen/Kitchen_04.wav': 'a0abe046c633fac4',
    'oga-202-more-sound-effects/x/Kitchen/Kitchen_03.wav': 'ab6f31cee7e053e4',
    'oga-202-more-sound-effects/x/Kitchen/Kitchen_06.wav': '7a6ec525a47d017d',
    'oga-202-more-sound-effects/x/Kitchen/Kitchen_02.wav': '41eb70d2af08c088',
    'oga-water-sounds/water_sounds.wav': '5d1c09cb1bdd3acd',
    'oga-54-casino-sound-effects-cards-dice-chips/x/Audio/die-throw-1.ogg': 'b31d716165be60e4',
    'oga-50-rpg-sound-effects/x/OGG/bookPlace3.ogg': 'b1afa711e1cabfe5',
    'oga-50-rpg-sound-effects/x/OGG/bookPlace1.ogg': '26f3ce60fbde85b6',
    'oga-50-rpg-sound-effects/x/OGG/cloth2.ogg': '8a7451193c38bc05',
}

SR = 48000
BGM_LUFS = -20.0
CEIL_DBTP = -3.0
LEAD_IN, LEAD_OUT = 0.5, 1.0
UNIT_SPLIT_S = 1.5          # export.py level(): per file, dur >= 1.5 s -> LUFS (its docstring says 1 s; code + manifest use 1.5)
GENERATED = '2026-11-08'
LAND_S = 0.255              # 뒤집기: 게임의 arc 3번째 그림(착지 찌그러짐)이 뜨는 때 = 3 x 83 ms (cook.js FMS, 12 fps) 바로 뒤

# 인코딩 묶음. export.py 기본(효과음 Opus 64k / AAC 96k)에 ambience.py 의 잡음용 플래그를 씌웠다.
# AAC -cutoff 20000: fast 코더 96k 기본 저역통과가 16~20 kHz 지글 결을 2.6 dB 깎아서 (실험: work/build_exp).
# 지글 루프 Opus 96k: 48k 에서는 탁탁(2 kHz 위, 200 ms 이동 중앙값 +6 dB)이 원본의 31~68 % 로 뭉개졌다. 96k 는 81~87 %
# (64k 는 그 중간). 검사관 측정과 work/fixer/enc_matrix.py. AAC 쪽(96k)과 같은 비트레이트다.
ENC = {
    'oneshot': dict(opus_kbps=64, opus_app='lowdelay', aac_kbps=96, aac_coder='fast', aac_cutoff=20000),
    'loop_hf': dict(opus_kbps=96, opus_app='lowdelay', aac_kbps=96, aac_coder='fast', aac_cutoff=20000),
    'loop_lf': dict(opus_kbps=48, opus_app='lowdelay', aac_kbps=64, aac_coder='fast', aac_cutoff=16000),
}

# ----------------------------------------------------------------------------------------------------------------
# 원본 (모두 두 라이선스 검사관이 ok 한 것). 글귀는 검사 결과의 attribution 그대로 옮겼다.
# ----------------------------------------------------------------------------------------------------------------
CC0 = ('CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/')
BY4 = ('CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/')
BY3 = ('CC BY 3.0', 'https://creativecommons.org/licenses/by/3.0/')


def _src(path, title, author, page, lic, file_label=None, note=''):
    return dict(path=path, title=title, author=author, page=page, license=lic[0], license_url=lic[1],
                file=file_label or os.path.basename(path), note=note)


# 젖은 수건 7z 안의 txt 는 다른 라이선스를 적고 있다. 라이선스 근거는 페이지 글이다(2026-11-08 에 받은 페이지에서 그대로 옮김).
TOWEL_NOTE = ('licence basis: the OGA page, checked 2026-11-08, lists "License(s): CC0" and says: "Also available under CC0 '
              'as of 2024-08-24. Ignore the txt file in the 7z that says otherwise." The txt inside the 7z is therefore not '
              'the licence we rely on.')


SOURCES = {
    'oga-stove-switch/turn_stove_on_01.ogg': _src(
        'oga-stove-switch/turn_stove_on_01.ogg', 'stove switch', 'TinyWorlds (Rick Hoppmann)',
        'https://opengameart.org/content/stove-switch', CC0),
    'oga-stove-switch/switch_strength_stove_01.ogg': _src(
        'oga-stove-switch/switch_strength_stove_01.ogg', 'stove switch', 'TinyWorlds (Rick Hoppmann)',
        'https://opengameart.org/content/stove-switch', CC0),
    'oga-flare-ignition/ignition.flac': _src(
        'oga-flare-ignition/ignition.flac', 'Flare ignition', 'qubodup (Iwan Gabovitch)',
        'https://opengameart.org/content/flare-ignition', CC0,
        note='the author\'s own matchstick recording, sped up'),
    'oga-general-household-sound-effects/fryingpan01.wav': _src(
        'oga-general-household-sound-effects/fryingpan01.wav', 'General Household Sound Effects',
        'Bret Bernhoft (bretbernhoft)', 'https://opengameart.org/content/general-household-sound-effects', CC0),
    'oga-general-household-sound-effects/forkonplate01.wav': _src(
        'oga-general-household-sound-effects/forkonplate01.wav', 'General Household Sound Effects',
        'Bret Bernhoft (bretbernhoft)', 'https://opengameart.org/content/general-household-sound-effects', CC0),
    'oga-12-wet-towel-hittingfallingpunching-floor-sounds/wet_towel_on_floor-07.flac': _src(
        'oga-12-wet-towel-hittingfallingpunching-floor-sounds/x/wet_towel_on_floor/wet_towel_on_floor-07.flac',
        '12 wet towel hitting/falling/punching floor sounds', 'qubodup (Iwan Gabovitch)',
        'https://opengameart.org/content/12-wet-towel-hittingfallingpunching-floor-sounds', CC0, note=TOWEL_NOTE),
    'oga-12-wet-towel-hittingfallingpunching-floor-sounds/wet_towel_on_floor-10.flac': _src(
        'oga-12-wet-towel-hittingfallingpunching-floor-sounds/x/wet_towel_on_floor/wet_towel_on_floor-10.flac',
        '12 wet towel hitting/falling/punching floor sounds', 'qubodup (Iwan Gabovitch)',
        'https://opengameart.org/content/12-wet-towel-hittingfallingpunching-floor-sounds', CC0, note=TOWEL_NOTE),
    'oga-54-casino-sound-effects-cards-dice-chips/card-slide-7.ogg': _src(
        'oga-54-casino-sound-effects-cards-dice-chips/x/Audio/card-slide-7.ogg',
        '54 Casino sound effects (cards, dice, chips)', 'Kenney (Kenney Vleugels, www.kenney.nl)',
        'https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips', CC0, file_label='Audio/card-slide-7.ogg'),
    'oga-54-casino-sound-effects-cards-dice-chips/card-slide-8.ogg': _src(
        'oga-54-casino-sound-effects-cards-dice-chips/x/Audio/card-slide-8.ogg',
        '54 Casino sound effects (cards, dice, chips)', 'Kenney (Kenney Vleugels, www.kenney.nl)',
        'https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips', CC0, file_label='Audio/card-slide-8.ogg'),
    'oga-steam-release-sounds/steam hisses - Marker #1.wav': _src(
        'oga-steam-release-sounds/x/steam hisses - Marker #1.wav', 'Steam release sounds', 'bart (Bart Kelsey)',
        'https://opengameart.org/content/steam-release-sounds', CC0, note='the author asks for attribution as a courtesy'),
    'oga-boiling-water-loops/cooking_without_cover_01_0.ogg': _src(
        'oga-boiling-water-loops/cooking_without_cover_01_0.ogg', 'boiling water loops', 'TinyWorlds (Rick Hoppmann)',
        'https://opengameart.org/content/boiling-water-loops', CC0, file_label='cooking_without_cover_01.ogg'),
    'oga-squish-sounds-effects/squishpop.mp3': _src(
        'oga-squish-sounds-effects/squishpop.mp3', 'Squish Sounds Effects', 'EZduzziteh',
        'https://opengameart.org/content/squish-sounds-effects', CC0),
    'oga-squish-sounds-effects/squish_02.mp3': _src(
        'oga-squish-sounds-effects/squish_02.mp3', 'Squish Sounds Effects', 'EZduzziteh',
        'https://opengameart.org/content/squish-sounds-effects', CC0),
    'oga-squish-sounds-effects/squish_01_0.mp3': _src(
        'oga-squish-sounds-effects/squish_01_0.mp3', 'Squish Sounds Effects', 'EZduzziteh',
        'https://opengameart.org/content/squish-sounds-effects', CC0, file_label='squish_01.mp3'),
    'oga-squish-sounds-effects/squish_05.mp3': _src(
        'oga-squish-sounds-effects/squish_05.mp3', 'Squish Sounds Effects', 'EZduzziteh',
        'https://opengameart.org/content/squish-sounds-effects', CC0),
    'oga-kitchen-ambience-sfx/slow_chops_on_cutting_board.wav': _src(
        'oga-kitchen-ambience-sfx/slow_chops_on_cutting_board.wav', 'Kitchen Ambience, SFX', 'DavidW',
        'https://opengameart.org/content/kitchen-ambience-sfx', BY4,
        note='the page also offers CC-BY 3.0, OGA-BY 3.0 and OGA-BY 4.0; CC BY 4.0 chosen. Only the downloaded WAV is '
             'used, never the page preview (its crowd walla is not the author\'s work).'),
    'oga-crunch-sounds-burnt-toast/crunch_9.ogg': _src(
        'oga-crunch-sounds-burnt-toast/crunch_9.ogg', 'Crunch sounds (burnt toast)', 'cogitollc (https://cogito.llc)',
        'https://opengameart.org/content/crunch-sounds-burnt-toast', CC0),
    'oga-crunch-sounds-burnt-toast/crunch_10.ogg': _src(
        'oga-crunch-sounds-burnt-toast/crunch_10.ogg', 'Crunch sounds (burnt toast)', 'cogitollc (https://cogito.llc)',
        'https://opengameart.org/content/crunch-sounds-burnt-toast', CC0),
    'oga-crunch-sounds-burnt-toast/crunch_7.ogg': _src(
        'oga-crunch-sounds-burnt-toast/crunch_7.ogg', 'Crunch sounds (burnt toast)', 'cogitollc (https://cogito.llc)',
        'https://opengameart.org/content/crunch-sounds-burnt-toast', CC0),
    'oga-202-more-sound-effects/Kitchen_04.wav': _src(
        'oga-202-more-sound-effects/x/Kitchen/Kitchen_04.wav', '202 More Sound Effects', 'OwlishMedia (Ashe)',
        'https://opengameart.org/content/202-more-sound-effects', CC0, file_label='Kitchen/Kitchen_04.wav'),
    'oga-202-more-sound-effects/Kitchen_03.wav': _src(
        'oga-202-more-sound-effects/x/Kitchen/Kitchen_03.wav', '202 More Sound Effects', 'OwlishMedia (Ashe)',
        'https://opengameart.org/content/202-more-sound-effects', CC0, file_label='Kitchen/Kitchen_03.wav'),
    'oga-202-more-sound-effects/Kitchen_06.wav': _src(
        'oga-202-more-sound-effects/x/Kitchen/Kitchen_06.wav', '202 More Sound Effects', 'OwlishMedia (Ashe)',
        'https://opengameart.org/content/202-more-sound-effects', CC0, file_label='Kitchen/Kitchen_06.wav'),
    'oga-202-more-sound-effects/Kitchen_02.wav': _src(
        'oga-202-more-sound-effects/x/Kitchen/Kitchen_02.wav', '202 More Sound Effects', 'OwlishMedia (Ashe)',
        'https://opengameart.org/content/202-more-sound-effects', CC0, file_label='Kitchen/Kitchen_02.wav'),
    'oga-water-sounds/water_sounds.wav': _src(
        'oga-water-sounds/water_sounds.wav', 'Water sounds', 'Vinrax (Vladislav Krotov, http://vinraxarts.ru)',
        'https://opengameart.org/content/water-sounds', BY3,
        note='the author\'s notice asks for credit with name and email/website'),
    'oga-54-casino-sound-effects-cards-dice-chips/die-throw-1.ogg': _src(
        'oga-54-casino-sound-effects-cards-dice-chips/x/Audio/die-throw-1.ogg',
        '54 Casino sound effects (cards, dice, chips)', 'Kenney (Kenney Vleugels, www.kenney.nl)',
        'https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips', CC0, file_label='Audio/die-throw-1.ogg'),
    'oga-50-rpg-sound-effects/bookPlace3.ogg': _src(
        'oga-50-rpg-sound-effects/x/OGG/bookPlace3.ogg', '50 RPG sound effects', 'Kenney (Kenney Vleugels, www.kenney.nl)',
        'https://opengameart.org/content/50-rpg-sound-effects', CC0, file_label='OGG/bookPlace3.ogg'),
    'oga-50-rpg-sound-effects/bookPlace1.ogg': _src(
        'oga-50-rpg-sound-effects/x/OGG/bookPlace1.ogg', '50 RPG sound effects', 'Kenney (Kenney Vleugels, www.kenney.nl)',
        'https://opengameart.org/content/50-rpg-sound-effects', CC0, file_label='OGG/bookPlace1.ogg'),
    'oga-50-rpg-sound-effects/cloth2.ogg': _src(
        'oga-50-rpg-sound-effects/x/OGG/cloth2.ogg', '50 RPG sound effects', 'Kenney (Kenney Vleugels, www.kenney.nl)',
        'https://opengameart.org/content/50-rpg-sound-effects', CC0, file_label='OGG/cloth2.ogg'),
}

# ----------------------------------------------------------------------------------------------------------------
# 소리 목록. 숫자는 판정 단계(work/judge)가 고른 구간과 처리 그대로다. 바꾼 곳은 note 에 이유를 적었다.
#   HP/LP(f, order): 버터워스(order 2 = 12 dB/oct, 4 = 24 dB/oct). HS(f, dB): RBJ 하이셸프(S=1).
#   layer: src, t0/t1(원본 초), at(이 소리 안에서 놓는 초), chain, fi/fo(올림 코사인 페이드 초), gain(dB, 원본 크기 기준),
#          rel = (기준 층 이름, 창 초, 목표 dB, 허용 하한, 상한): 기준 층의 가장 큰 창 RMS(에너지) 대비 이만큼. 허용 밖이면 목표로
#                맞춘다. 판정 글의 '5 dB 아래' 같은 수치는 10 ms dB 를 50 ms 로 평균한 잣대라 창 위치에 따라 7 dB 까지 흔들려서
#                (work/build_exp/relcheck.py) 에너지 창으로 다시 잡았다. 불 켜기: 판정 단계가 직접 만들어 본 H1(딸깍 0 dB,
#                화르륵 -16 dB)의 100 ms 에너지 관계 -11.7 dB 를 두 변형의 기준으로 삼는다.
# ----------------------------------------------------------------------------------------------------------------
FP = 'oga-general-household-sound-effects/fryingpan01.wav'
CHOPS = 'oga-kitchen-ambience-sfx/slow_chops_on_cutting_board.wav'
WATER = 'oga-water-sounds/water_sounds.wav'
STIR_SPEED = 2 ** (-2 / 12)      # 국자 젓기: 머그잔 크기 물소리를 2반음 낮춰 냄비 크기로


def HP(f, order=4):
    return ('hp', float(f), order)


def LP(f, order=2):
    return ('lp', float(f), order)


def HS(f, db):
    return ('hs', float(f), float(db))


# 톡톡: 판정은 '끈적하면 5 kHz 셸프 -3~-5 dB' 를 권했다. 에너지 60~70% 가 2~6 kHz(젖은 잡음)라 셸프를 4 kHz 로 내리고 -4 dB:
# 2~6 kHz 를 1~3 dB 눌러 150~600 Hz 몸통 쪽으로 기울인다(부드럽고 작은 톡, 끈적함은 덜게).
PAT_CHAIN = [('hp', 100.0, 4), ('hs', 4000.0, -4.0)]
# 끈적하게 들리면 쓰는 어두운 결(검사 메모): 3.5 kHz 저역 통과(12 dB/oct)를 더한다. listen.html 의 '어둡게' 단추가 이 결을
# 같은 크기로 미리 들려준다. 마음에 들면 아래 네 pat 의 chain=PAT_CHAIN 을 PAT_CHAIN_DARK 로 바꿔 다시 굽는다.
PAT_CHAIN_DARK = PAT_CHAIN + [('lp', 3500.0, 2)]
WARM_SHELF = ('hs', 10000.0, -3.0)   # listen.html 의 지글 '10 kHz 위 -3 dB' 견주기 (검사 메모: 너무 얇은 쉬익인지 귀로)


def L(name, src, t0, t1, at=0.0, chain=(), fi=0.004, fo=0.03, gain=0.0, rel=None, decay=None, steps=(), speed=1.0):
    return dict(name=name, src=src, t0=t0, t1=t1, at=at, chain=list(chain), fi=fi, fo=fo, gain=gain, rel=rel,
                decay=decay, steps=list(steps), speed=speed)


SOUNDS = [
    # ---------------------------------------------- 해초전 ----------------------------------------------
    # pick 은 한 판에 한 번만 난다 -> 변형 하나면 된다. (전에 있던 pick_2 는 '팬을 화구에 내려놓는 쿵' 이라 같은 몸짓의
    # 다른 녹음이 아니었다. Kitchen_04 에 가벼운 들기는 한 번뿐이라 뺐다.) 0.262 s 부터: 그 앞 22 ms 는 낮은 덜그럭이라
    # 누름에 늦게 답했다(검사: 봉우리 37 ms). 이제 딸깍은 6 ms 안에 -10 dB 를 넘고 봉우리는 약 13 ms.
    dict(id='cook_pick_1', cue='pick', act='pick', group='cook_pick', rel_db=-14, enc='oneshot', min_gap_ms=300,
         ko='조리대에서 팬을 눌러 요리를 시작할 때. 팬을 살짝 드는 가벼운 금속 톡',
         en='pressing the pan on the counter to start: a light metal pan lift',
         layers=[L('pan', 'oga-202-more-sound-effects/Kitchen_04.wav', 0.262, 0.440, chain=[HP(100)], fi=0.002, fo=0.080)]),

    dict(id='cook_pat_1', cue='pat', act='tap', group='cook_pat', rel_db=-14, enc='oneshot', min_gap_ms=80,
         ko='톡톡 단계: 차가운 팬 위 반죽을 한 번 두드릴 때 (9번, 변형 4개를 돌려 씀)',
         en='each pat on the raw batter (9 pats cycle through 4 variants)',
         layers=[L('pat', 'oga-squish-sounds-effects/squishpop.mp3', 0.008, 0.160, chain=PAT_CHAIN,
                   fi=0.004, fo=0.040)]),
    dict(id='cook_pat_2', cue='pat', act='tap', group='cook_pat', rel_db=-14, enc='oneshot', min_gap_ms=80,
         ko='톡톡 단계: 반죽 두드림 (변형 2)', en='pat, variant 2',
         layers=[L('pat', 'oga-squish-sounds-effects/squish_02.mp3', 0.006, 0.116, chain=PAT_CHAIN,
                   fi=0.004, fo=0.050)]),
    dict(id='cook_pat_3', cue='pat', act='tap', group='cook_pat', rel_db=-14, enc='oneshot', min_gap_ms=80,
         ko='톡톡 단계: 반죽 두드림 (변형 3)', en='pat, variant 3',
         layers=[L('pat', 'oga-squish-sounds-effects/squish_01_0.mp3', 0.002, 0.120, chain=PAT_CHAIN,
                   fi=0.004, fo=0.050)]),
    dict(id='cook_pat_4', cue='pat', act='tap', group='cook_pat', rel_db=-14, enc='oneshot', min_gap_ms=80,
         ko='톡톡 단계: 반죽 두드림 (변형 4, 가장 작고 가벼움)', en='pat, variant 4 (the smallest)',
         layers=[L('pat', 'oga-squish-sounds-effects/squish_05.mp3', 0.014, 0.106, chain=PAT_CHAIN,
                   fi=0.004, fo=0.040)]),

    # 불 켜기 rel_db -18 (제안 -12): 50 ms 딸깍 + 0.9 s 작은 화르륵이라 소리 나는 구간 RMS 가 딸깍을 6 dB 작게 읽는다.
    # -12 로 구우면 가장 큰 100 ms / 400 ms(K 가중)가 뒤집기만큼 컸다(-20 / -26). -18 이면 썰기·접시 바로 아래.
    dict(id='cook_heat_on_1', cue='heat_on', act='sizzle', band=0, group='cook_heat_on', rel_db=-18, enc='oneshot',
         min_gap_ms=500,
         ko='불 켜기 단추를 누를 때 (sizzle band 0 이 처음 올 때 한 번). 가스레인지 손잡이 딸깍 + 불이 붙는 부드러운 화르륵',
         en='pressing heat-on: stove knob click + soft burner whoosh',
         layers=[L('click', 'oga-stove-switch/turn_stove_on_01.ogg', 0.0, 0.33, chain=[HP(150), LP(15000)],
                   fi=0.002, fo=0.050),
                 L('flame', 'oga-flare-ignition/ignition.flac', 0.0, 0.95, at=0.060, chain=[HP(120), LP(5000, 4)],
                   fi=0.150, fo=0.250, gain=-16, rel=('click', 0.10, -11.0, -12.0, -10.0))]),
    dict(id='cook_heat_on_2', cue='heat_on', act='sizzle', band=0, group='cook_heat_on', rel_db=-18, enc='oneshot',
         min_gap_ms=500,
         ko='불 켜기 (변형 2). 같은 손잡이의 두 번째 딸깍-깍 + 화르륵', en='heat-on, variant 2 (second knob detent)',
         layers=[L('click', 'oga-stove-switch/switch_strength_stove_01.ogg', 0.29, 0.51, chain=[HP(150), LP(15000)],
                   fi=0.002, fo=0.060, gain=-3.5),                       # 0.29: 딸깍은 0.298 s 부터 오른다(판정 글의 0.315 보다 이름)
                 L('flame', 'oga-flare-ignition/ignition.flac', 0.0, 0.95, at=0.090, chain=[HP(120), LP(5000, 4)],
                   fi=0.150, fo=0.250, gain=-16, rel=('click', 0.10, -11.0, -12.0, -10.0))]),

    dict(id='cook_sizzle_0', cue='sizzle_0', act='sizzle', band=0, group='cook_sizzle_0', rel_db=-15, enc='loop_hf',
         min_gap_ms=0,
         ko='불을 켠 뒤 보들보들(0~3초) 동안 도는 루프. 작고 성긴 지글',
         en='loop while the batter is soft (0-3 s): gentle sparse sizzle',
         loop=dict(src=FP, t0=26.80, t1=32.60, xf=0.5, chain=[HP(200), HS(8000, -2.5)],
                   ramp=((26.30, 1.05), (32.60, -1.05)), dips=())),
    # 노릇노릇 창(2.05~6.55 s)은 이 녹음에서 가장 빽빽하고 밝은 쉬익이다. 하이셸프 -1.5 dB: 그대로면 바삭(2)과 밝기가 같았다
    # (무게중심, 8 kHz 위 몫이 1 % 안). 이제 0 -> 1 -> 2 로 밝기가 오른다(값은 manifest rules.sizzle_family).
    dict(id='cook_sizzle_1', cue='sizzle_1', act='sizzle', band=1, group='cook_sizzle_1', rel_db=-12, enc='loop_hf',
         min_gap_ms=0,
         ko='노릇노릇(3~6초) 루프. 기름에 전이 지글지글 굽는 고른 소리',
         en='loop while golden (3-6 s): the full steady pan-frying sizzle',
         loop=dict(src=FP, t0=2.05, t1=6.55, xf=0.5, chain=[HP(200), HS(8000, -1.5)], ramp=None, dips=())),
    # 바삭: 확 커지는 두 번(43.8, 47.6 s)은 -3 dB 그대로. 느린 크기 고르기(flatten): 400 ms 로 매끈하게 한 크기를 중앙값 쪽으로
    # 60 % 당긴다(+-4 dB 안). 몸통 3.5~5.0 s 의 작게-크게 출렁임(250 ms 단위 범위 8.2 dB)이 되풀이마다 들릴 수 있어서.
    # 2 ms 짜리 탁탁은 400 ms 크기 고르기에 거의 닿지 않는다. 기름 튐(pops): 이 창에는 중앙값 +15 dB 넘는 튐이 없어서,
    # 같은 녹음의 다른 곳(39.97 s 깨끗한 톡, 56.88 s 짧은 튐 무더기)을 18 / 30 ms 만 떠서 몸통 3.8 s, 8.0 s 에 얹었다.
    # (원본 초, 앞 s, 뒤 s, 놓는 원본 초, 2 kHz 위 2 ms 봉우리를 그 자리 200 ms 중앙값보다 몇 dB 위로)
    dict(id='cook_sizzle_2', cue='sizzle_2', act='sizzle', band=2, group='cook_sizzle_2', rel_db=-10, enc='loop_hf',
         min_gap_ms=0,
         ko='바삭바삭(6초부터 뒤집을 때까지) 루프. 탁탁 튀는 기름이 많고 조금 더 밝고 크다',
         en='loop while crisp (6 s until the flip): busier crackle and oil pops, brighter, a little louder',
         loop=dict(src=FP, t0=41.60, t1=51.60, xf=0.5, chain=[HP(250), HS(8000, 3.0)], ramp=None,
                   dips=((43.78, 44.08, -3.0, 0.03), (47.58, 47.82, -3.0, 0.03)),
                   flatten=dict(alpha=0.6, smooth_s=0.4, max_db=4.0),
                   pops=((39.970, 0.002, 0.016, 45.42, 16.0), (56.882, 0.002, 0.028, 49.62, 16.5)))),

    # 뒤집기: 게임은 뒤집는 순간 소리를 틀고, 전은 arc 그림 0~2(0~250 ms) 동안 공중에 있다가 3번째 그림(250~333 ms)에 내려앉는다.
    # 그래서 철퍽의 봉우리를 LAND_S(0.255 s)에 두고(manifest 의 sync.land_s), 그 앞 250 ms 는 '휙' 이 맡는다.
    # 휙: 대나무 막대 휘두름(전의 층)은 185 Hz 언저리 낮은 웅 소리뿐이라(2~8 kHz -60 dB) 폰에서 사라졌다. 대신 Kenney 카드가
    # 펠트 위를 미끄러지는 부분(카드가 닿는 탁 바로 앞에서 끊음)을 0.8 배로 느리게(-3.9 반음) 해서 공기 소리처럼 썼다.
    dict(id='cook_flip_1', cue='flip', act='flip', group='cook_flip', rel_db=-8, enc='oneshot', min_gap_ms=300,
         ko='뒤집개로 뒤집을 때. 휙 + 철퍽 + 지글이 확 커졌다가 1초쯤에 잦아듦',
         en='the flip: air swish + soft wet slap + a sizzle swell that dies away over about 1 s',
         layers=[L('air', 'oga-54-casino-sound-effects-cards-dice-chips/card-slide-7.ogg', 0.183, 0.325, at=0.008,
                   chain=[HP(700), LP(9000)], fi=0.016, fo=0.072, speed=0.8, rel=('slap', 0.05, -8.0, -9.0, -7.0)),
                 # 0.183: 0.179~0.180 s 의 2 ms 딸깍(+13 dB)을 뺀다. 0.325: 카드가 닿는 탁(0.329 s) 바로 앞
                 L('slap', 'oga-12-wet-towel-hittingfallingpunching-floor-sounds/wet_towel_on_floor-07.flac', 0.0, 0.30,
                   at=0.234, chain=[HP(120)], fi=0.002, fo=0.100, gain=0),
                 L('swell', FP, 54.28, 55.60, at=0.254, chain=[HP(200)], fi=0.008, fo=0.350, gain=-3,
                   rel=('slap', 0.10, -5.0, -6.0, -4.0))]),
    dict(id='cook_flip_2', cue='flip', act='flip', group='cook_flip', rel_db=-8, enc='oneshot', min_gap_ms=300,
         ko='뒤집을 때 (변형 2)', en='the flip, variant 2',
         layers=[L('air', 'oga-54-casino-sound-effects-cards-dice-chips/card-slide-8.ogg', 0.155, 0.252, at=0.012,
                   chain=[HP(700), LP(9000)], fi=0.012, fo=0.048, speed=0.8, rel=('slap', 0.05, -8.0, -9.0, -7.0)),
                 # 0.252: 카드가 닿는 탁(0.257 s)보다 5 ms 앞에서 끊는다
                 L('slap', 'oga-12-wet-towel-hittingfallingpunching-floor-sounds/wet_towel_on_floor-10.flac', 0.0, 0.30,
                   at=0.244, chain=[HP(120)], fi=0.002, fo=0.100, gain=-1),
                 L('swell', FP, 0.0, 1.50, at=0.264, chain=[HP(200)], fi=0.010, fo=0.350, gain=-2, decay=(0.40, -15.0),
                   rel=('slap', 0.10, -5.0, -6.0, -4.0))]),

    dict(id='cook_step', cue='step', act='step', group='cook_step', rel_db=-16, enc='oneshot', min_gap_ms=150,
         ko='단계 하나가 끝날 때 아주 작은 나무 톡', en='one step finished: a tiny soft wooden tock',
         layers=[L('tok', 'oga-54-casino-sound-effects-cards-dice-chips/die-throw-1.ogg', 0.150, 0.262, chain=[HP(100)],
                   fi=0.003, fo=0.047)]),

    # 썰기 1 은 바삭을 도마 톡보다 3.5 dB 아래로(2, 3 은 판정 규칙대로 6~10 dB 아래). '바삭' 이 맛있게 들리게 하는 소리라
    # 귀로 견주어 보라는 검사 메모를 따랐다: 1 이 좋으면 2, 3 의 rel 을 같은 숫자로 바꿔 다시 굽는다.
    dict(id='cook_cut_1', cue='cut', act='cut', group='cook_cut', rel_db=-11, enc='oneshot', min_gap_ms=120,
         ko='썰기에서 한 줄이 잘릴 때. 바삭한 껍질이 사각 + 칼이 나무 도마에 톡 (바삭이 가장 큰 변형)',
         en='each knife cut: a crisp crunch through the crust + the knife meeting a wooden board (the crunchiest variant)',
         layers=[L('crunch', 'oga-crunch-sounds-burnt-toast/crunch_9.ogg', 0.213, 0.318, at=0.0, chain=[HP(300)],
                   fi=0.003, fo=0.020, gain=0, rel=('tock', 0.005, -3.5, -4.5, -2.5)),
                 L('tock', CHOPS, 19.180, 19.460, at=0.080, chain=[HP(80)], fi=0.002, fo=0.110)]),
    dict(id='cook_cut_2', cue='cut', act='cut', group='cook_cut', rel_db=-11, enc='oneshot', min_gap_ms=120,
         ko='썰기 (변형 2, 껍질이 두 번에 나뉘어 깨짐)', en='knife cut, variant 2 (the crust cracks in two steps)',
         layers=[L('crunch', 'oga-crunch-sounds-burnt-toast/crunch_10.ogg', 0.175, 0.318, at=0.0, chain=[HP(300)],
                   fi=0.003, fo=0.020, gain=-1, rel=('tock', 0.005, -7.0, -10.0, -6.0)),
                 L('tock', CHOPS, 28.155, 28.435, at=0.115, chain=[HP(80)], fi=0.002, fo=0.110)]),
    dict(id='cook_cut_3', cue='cut', act='cut', group='cook_cut', rel_db=-11, enc='oneshot', min_gap_ms=120,
         ko='썰기 (변형 3, 가장 빠른 칼질)', en='knife cut, variant 3 (the quickest)',
         layers=[L('crunch', 'oga-crunch-sounds-burnt-toast/crunch_7.ogg', 0.327, 0.380, at=0.0, chain=[HP(300)],
                   fi=0.003, fo=0.015, gain=0, rel=('tock', 0.005, -7.0, -10.0, -6.0)),
                 L('tock', CHOPS, 7.562, 7.842, at=0.035, chain=[HP(80)], fi=0.002, fo=0.110)]),

    dict(id='cook_plate_1', cue='plate', act='done', group='cook_plate', rel_db=-10, enc='oneshot', min_gap_ms=500,
         ko='다 된 접시를 보여 줄 때 (done). 사기 접시를 나무 식탁에 살며시 놓는 소리',
         en='the finished dish is revealed: a ceramic plate set gently on a wooden table',
         layers=[L('plate', 'oga-202-more-sound-effects/Kitchen_03.wav', 0.012, 0.300, chain=[HP(90)], fi=0.003, fo=0.088),
                 L('ring', 'oga-general-household-sound-effects/forkonplate01.wav', 102.268, 102.560, at=0.004,
                   chain=[HP(150)], fi=0.002, fo=0.110, gain=-12)]),
    dict(id='cook_plate_2', cue='plate', act='done', group='cook_plate', rel_db=-10, enc='oneshot', min_gap_ms=500,
         ko='다 된 접시 (변형 2, 조금 더 또렷하게 놓음)', en='plate, variant 2 (a firmer set-down)',
         layers=[L('plate', 'oga-202-more-sound-effects/Kitchen_06.wav', 0.428, 0.760, chain=[HP(90)], fi=0.003, fo=0.132)]),

    dict(id='cook_steam', cue='steam', act='done', group='cook_steam', rel_db=-20, enc='oneshot', min_gap_ms=1000,
         ko='(고르면) 접시를 낼 때 김이 피어오르는 작은 쉬익. 접시 소리보다 작게',
         en='optional: a short soft steam hiss when serving, kept under the plate',
         layers=[L('hiss', 'oga-steam-release-sounds/steam hisses - Marker #1.wav', 0.0, 0.85,
                   chain=[HP(1200), LP(8000, 4)], fi=0.070, fo=0.150)]),     # 24 dB/oct: 판정 원형(S1.wav)의 가파른 거름에 가깝게

    # ---------------------------------------------- 나중 요리 (미역국, 톳 주먹밥) ----------------------------------------------
    dict(id='cook_stir_1', cue='stir', act='stir', group='cook_stir', rel_db=-13, enc='oneshot', min_gap_ms=200,
         ko='(나중: 미역국) 국자로 국을 저을 때 찰랑', en='later (seaweed soup): ladle stirring, a liquid swirl',
         layers=[L('swirl', WATER, 1.40, 1.90, chain=[HP(120)], fi=0.030, fo=0.080, speed=STIR_SPEED)]),
    dict(id='cook_stir_2', cue='stir', act='stir', group='cook_stir', rel_db=-13, enc='oneshot', min_gap_ms=200,
         ko='(나중) 젓기 변형 2: 찰랑 + 국자가 살짝 닿음', en='stir, variant 2: swirl with a light ladle touch',
         layers=[L('swirl', WATER, 2.04, 2.52, chain=[HP(120)], fi=0.030, fo=0.080, speed=STIR_SPEED)]),
    dict(id='cook_stir_3', cue='stir', act='stir', group='cook_stir', rel_db=-13, enc='oneshot', min_gap_ms=200,
         ko='(나중) 젓기 변형 3: 찰랑 끝에 국자가 냄비에 작게 띵', en='stir, variant 3: swirl ending in a faint ladle clink',
         layers=[L('swirl', WATER, 0.165, 0.980, chain=[HP(120)], fi=0.030, fo=0.080, speed=STIR_SPEED,
                   steps=[(0.745, -18.0, 0.010)])]),
    dict(id='cook_clink', cue='clink', act='clink', group='cook_clink', rel_db=-14, enc='oneshot', min_gap_ms=150,
         ko='(나중) 숟가락으로 냄비 가장자리를 톡 칠 때 작은 쇠 소리', en='later: spoon taps the pot rim, a small metal clink',
         layers=[L('clink', 'oga-202-more-sound-effects/Kitchen_02.wav', 0.012, 0.300, chain=[HP(200)], fi=0.002, fo=0.118)]),
    dict(id='cook_simmer', cue='simmer', act='simmer', group='cook_simmer', rel_db=-14, enc='loop_lf', min_gap_ms=0,
         ko='(나중: 미역국) 냄비가 끓는 동안 도는 보글보글 루프', en='later: loop while the soup simmers, gentle bubbling',
         periodic=dict(src='oga-boiling-water-loops/cooking_without_cover_01_0.ogg', n_native=440765, sr_native=44100,
                       n_out=479744, chain=[HP(80)])),
    dict(id='cook_place_1', cue='place', act='place', group='cook_place', rel_db=-13, enc='oneshot', min_gap_ms=150,
         ko='(나중: 톳 주먹밥) 주먹밥을 접시에 놓을 때 폭', en='later (rice balls): a rice ball set on a plate, soft thup',
         layers=[L('thup', 'oga-50-rpg-sound-effects/bookPlace3.ogg', 0.004, 0.230, chain=[HP(80), LP(3500)],
                   fi=0.003, fo=0.076)]),
    dict(id='cook_place_2', cue='place', act='place', group='cook_place', rel_db=-13, enc='oneshot', min_gap_ms=150,
         ko='(나중) 주먹밥 놓기 변형 2', en='place, variant 2',
         layers=[L('thup', 'oga-50-rpg-sound-effects/bookPlace1.ogg', 0.040, 0.230, chain=[HP(80), LP(3500)],
                   fi=0.003, fo=0.070)]),
    dict(id='cook_lift', cue='lift', act='lift', group='cook_lift', rel_db=-20, enc='oneshot', min_gap_ms=150,
         ko='(나중) 한 조각을 집어 올릴 때 아주 작게 (back 은 같은 소리를 더 작게)',
         en='later: picking a piece up, tiny and soft (back = the same sound quieter)',
         layers=[L('puff', 'oga-50-rpg-sound-effects/cloth2.ogg', 0.050, 0.200, chain=[HP(150)], fi=0.030, fo=0.060)]),
]

# 제안 크기에서 바꾼 것과 이유 (지휘 쪽 제안: sizzle -18/-15/-13, simmer -16, steam -14)
LEVEL_CHANGES = {
    'cook_sizzle_0': (-18, 'rain bed amb_rain (-12, 가장 자주 들리는 바탕) 아래로 6 dB 묻히지 않게 +3'),
    'cook_sizzle_1': (-15, '앞에 서는 요리 소리라 빗소리 바탕(-12)과 같은 높이로 +3'),
    'cook_sizzle_2': (-13, '세 단계 간격(3 dB, 2 dB)을 지키며 +3'),
    'cook_simmer': (-16, '보글보글 대역(250 Hz~1 kHz)이 빗소리 바탕(LPF 3.5 kHz 분홍 잡음)과 겹쳐 +2'),
    'cook_steam': (-14, '1.2~8 kHz 쉬익은 RMS 로 재면 실제보다 작게 읽힌다. -17 에서도 가장 큰 400 ms(K 가중)가 접시 둘 사이였다. '
                        '접시 아래로 -6'),
    'cook_heat_on_1': (-12, '짧은 딸깍 + 긴 작은 꼬리라 RMS 가 딸깍을 작게 읽는다. -12 면 가장 큰 100/400 ms 가 뒤집기만큼 컸다. -6'),
    'cook_heat_on_2': (-12, 'heat_on_1 과 같은 이유로 -6'),
}

GAPS = [
    ('sizzle', '지글 세 단계와 두 뒤집기 부풀음이 모두 한 녹음(bretbernhoft fryingpan01, CC0)에서 나왔다. 그래서 색이 같지만 '
               '독립된 두 번째 팬 녹음은 OGA 에 없다. BigSoundBank #0143-0145(스테이크), #1676, #2509 (CC0)는 robots/ai.txt 때문에 '
               '에이전트가 받지 않았다. 주인이 손으로 받으면 바꿀 수 있다.'),
    ('heat_on', '진짜 가스 불이 화르륵 붙는 녹음이 OGA 에 없다. 화르륵은 qubodup 성냥 녹음을 빠르게 한 것을 5 kHz 로 걸러 흉내 낸 것. '
                '어색하면 딸깍만 남겨도 된다 (BigSoundBank #0057/#0058 이 진짜, 손으로만 받을 수 있음).'),
    ('flip', '팬에서 뒤집개로 뒤집는 진짜 녹음은 없다. 카드가 펠트를 미끄러지는 소리(Kenney, 느리게) 휙 + 젖은 수건 철퍽 + '
             '같은 팬 지글 부풀음을 겹쳤다. 철퍽이 "수건이 바닥에" 처럼 들리면 철퍽을 3~6 dB 낮추거나 towel-06 으로 바꾼다. '
             '대나무 막대 휙(전의 층)은 낮은 웅 소리라 폰에서 들리지 않아 뺐다.'),
    ('pick', '팬을 드는 녹음(OwlishMedia Kitchen_04)에 가벼운 들기는 한 번뿐이다. pick 은 한 판에 한 번이라 변형 하나로 둔다.'),
    ('pat', '반죽을 두드리는 진짜 녹음은 없다. EZduzziteh 의 CC0 squish 앞머리(-20 dB 까지 55~75 ms)만 잘라 쓰고, 4 kHz 하이셸프 '
            '-4 dB 로 젖은 잡음(2~6 kHz)을 조금 눌러 몸통 쪽으로 기울였다. 끈적하게 들리면 80~90 ms 로 더 짧게, 셸프를 -6 dB 까지.'),
    ('cut', '바삭한 껍질 + 도마 톡이 한 번에 든 녹음이 없어 두 층(탄 토스트 CC0 + DavidW 도마 CC-BY)을 겹쳤다.'),
    ('plate', '"접시를 식탁에 놓기" 라고 이름 붙은 녹음이 OGA 에 없다. OwlishMedia 의 이름 없는 내려놓기 두 개를 소리 결(배음)로 사기라고 '
              '짐작했다. plate_1 에는 진짜 포크-접시 울림을 -12 dB 로 깔았다.'),
    ('step', '"뒤집개를 도마에 내려놓기" 는 없다. 주사위 첫 닿음(Kenney)의 둔한 톡으로 대신했다.'),
    ('stir', '냄비 크기 젓기 녹음이 없다. 머그잔 물소리(Vinrax, CC BY 3.0)를 2반음 낮춰 큰 그릇처럼 했다.'),
    ('clink', 'Kitchen_02 는 이름 없는 쇠 톡(아마 숟가락과 뚜껑)이다. 냄비 가장자리라는 확인은 없다.'),
    ('place', '음식(주먹밥)을 놓는 녹음이 없다. 책을 살며시 놓는 소리를 3.5 kHz 로 걸러 대신했다.'),
    ('lift', '천 스치는 소리로 "집어 올림" 을 대신했다.'),
    ('steam', '진짜 부드러운 김 녹음이 없다. bart 의 쉬익(가공된 잡음으로 보임)을 1.2~8 kHz 로 거르고 앞을 70 ms 로 눌렀다.'),
]


# 판정 단계의 처리 글과 다르게 한 곳 (README 와 검사 보고서에 그대로 싣는다)
DEVIATIONS = [
    '불 켜기 2: 구간 시작 0.30 -> 0.29 s. 딸깍은 0.298 s 부터 오른다(글의 0.315 보다 이르다). 0.30 에서 자르면 첫머리가 잘린다. '
    '화르륵은 +0.090 s (딸깍 -> 화르륵 70 ms 간격은 그대로).',
    '불 켜기 화르륵 크기: 글은 "딸깍보다 5 dB 아래"(10 ms dB 를 50 ms 로 평균한 잣대, 창 위치에 따라 7 dB 까지 흔들림)이고 '
    '변형 2 의 이득은 글(-11)과 원형 JSON(-16)이 서로 달랐다. 판정이 만든 H1 원형(딸깍 0, 화르륵 -16)을 기준으로, 두 변형 모두 '
    '화르륵의 가장 큰 100 ms 에너지가 딸깍보다 약 11~12 dB 아래가 되게 했다(변형 1 -11.7 그대로, 변형 2 -11.0).',
    '뒤집기 지글 부풀음: 글대로 철퍽보다 5 dB 아래(가장 큰 100 ms 에너지). 원형 이득 그대로면 8 dB(1), 11 dB(2) 아래라서 '
    '+3.2 / +6.1 dB. 변형 2 는 원본 부풀음이 거의 줄지 않아 1.25 s 까지 평평했으므로 덧붙인 감쇠를 -9 dB(0.45 s 부터) -> '
    '-15 dB(0.40 s 부터)로 키웠다.',
    '뒤집기 때맞춤: 철퍽(과 부풀음)을 +0.11 s -> 약 +0.24 s 로 옮겨 철퍽 봉우리가 0.255 s, 곧 게임의 착지 그림(arc 3번째, '
    '250~333 ms)에 온다. 그 앞은 휙이 채운다. 변형 2 의 부풀음은 1.55 -> 1.50 s 로 줄여 파일이 1.8 s 안.',
    '뒤집기 휙: 대나무 막대(185 Hz 웅, 2~8 kHz 거의 없음) 대신 Kenney 카드 미끄럼(같은 CC0 페이지의 다른 파일, 카드가 닿기 '
    '바로 앞까지) 0.8 배 느리게, HP 700 Hz / LP 9 kHz, 철퍽보다 가장 큰 50 ms 에너지로 8 dB 아래.',
    '크기 단위: 같은 group 은 같은 단위로 재던 것을 export.py 처럼 파일마다(1.5 s 이상 LUFS)로 되돌렸다. 뒤집기 둘이 이제 '
    '1.5 s 넘어서 둘 다 LUFS(전에는 둘 다 RMS 라 flip_2 가 LUFS 로 2.3 dB 컸다).',
    '썰기 2: 바삭 층 원본 이득 -1 dB 이면 도마 톡보다 4.1 dB 아래(5 ms)라 허용(6~10 dB) 밖 -> 7.0 dB 아래로. 썰기 3(-7.2)은 그대로. '
    '썰기 1 은 바삭을 3.5 dB 아래로 올렸다(검사 메모: 바삭이 너무 묻힌다, 귀로 견줄 것).',
    '접시 1 의 포크-접시 울림: 판정 미리 듣기처럼 원본 이득 -12 dB 그대로(10 ms 에너지로는 8.5 dB 아래).',
    '지글 밝기: 바삭(2)에 8 kHz 하이셸프 +3 dB(글은 고르면 +1.5 dB @7 kHz), 노릇(1)에 -1.5 dB, 보들(0)에 -2.5 dB. 노릇 창이 '
    '녹음에서 가장 밝은 곳이라 셸프가 없으면 바삭과 밝기가 같았다. 바삭의 확 커지는 두 번 -3 dB, 보들의 2.1 dB 크기 기울기 '
    '펴기는 글의 "고르면" 을 적용했다.',
    '바삭 루프: 느린 크기 고르기(400 ms, 60 %, +-4 dB)로 몸통 250 ms 크기 범위 8.2 -> 약 3.6 dB. 기름 튐 두 개를 같은 녹음 '
    '39.97 s, 56.88 s 에서 떠서 몸통 3.8 s, 8.0 s 에 얹음(중앙값 +16 / +16.5 dB).',
    '지글 루프 Opus 48 -> 96 kbps (탁탁 보존, 위 ENC 메모).',
    '불 켜기 -12 -> -18, 김 -17 -> -20 (짧은 시간 크기(K 가중 100/400 ms)를 썰기·접시와 견줘서).',
    '팬 들기: 변형 2(내려놓는 쿵)를 빼고, 변형 1 을 22 ms 늦게 시작(딸깍이 바로 나게).',
    '톡톡 셸프: 5 kHz -3 dB(고르면) 대신 4 kHz -4 dB.',
    '김 쉬익: HP 1.2 kHz / LP 8 kHz 를 24 dB/oct 로(글은 12 dB/oct, 그러나 판정 원형 도구의 거름은 훨씬 가팔랐다).',
    '젓기: 2반음 낮춤(글: 고르면). 젓기 3 의 띵은 -18 dB(글의 범위 -14~-18 중 작은 쪽, -16 이면 찰랑보다 1 dB 컸다).',
    '크기: 지글 +3 dB, 보글 +2 dB, 김 -6 dB, 불 켜기 -6 dB (제안 대비, 이유는 위 크기 절).',
    '필터: 판정 원형은 0 위상 FFT 필터(약 48 dB/oct)였다. 여기서는 인과 버터워스(HP 24 dB/oct)라 앞울림이 없다.',
]

# ----------------------------------------------------------------------------------------------------------------
# ffmpeg
# ----------------------------------------------------------------------------------------------------------------
def run(cmd, data=None):
    r = subprocess.run(cmd, input=data, capture_output=True)
    if r.returncode != 0:
        raise RuntimeError('command failed: %s\n%s' % (' '.join(cmd[:8]), r.stderr.decode('utf-8', 'replace')[-800:]))
    return r


def probe(path):
    j = json.loads(run(['ffprobe', '-v', 'error', '-show_entries', 'stream=channels,sample_rate', '-of', 'json',
                        path]).stdout or b'{}')
    st = (j.get('streams') or [{}])[0]
    return int(st.get('channels') or 1), int(st.get('sample_rate') or 0)


_DEC = {}


def decode_mono(key, speed=1.0, native=False):
    """원본 전체를 해독해서 모노(채널 평균) float64 로. 기본 48 kHz, speed<1 이면 그만큼 느리고 낮게(asetrate)."""
    k = (key, speed, native)
    if k in _DEC:
        return _DEC[k]
    path = os.path.join(RAW, SOURCES[key]['path'])
    ch, sr = probe(path)
    cmd = ['ffmpeg', '-v', 'error', '-nostdin', '-i', path]
    if native:
        pass
    elif speed != 1.0:
        cmd += ['-af', 'asetrate=%d,aresample=%d' % (int(round(sr * speed)), SR)]
    else:
        cmd += ['-ar', str(SR)]
    cmd += ['-ac', str(ch), '-f', 'f32le', '-']
    x = np.frombuffer(run(cmd).stdout, dtype='<f4').astype(np.float64).reshape(-1, ch).mean(axis=1)
    x = x - x.mean()                                   # DC
    _DEC[k] = x
    return x


def f32(x):
    return np.asarray(x, dtype='<f4').tobytes()


def ebur128(x):
    """(통합 LUFS, true peak dBTP) — ffmpeg ebur128, render.measure 와 같은 방식"""
    r = run(['ffmpeg', '-hide_banner', '-nostats', '-nostdin', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
             '-af', 'ebur128=peak=true', '-f', 'null', '-'], data=f32(x))
    txt = r.stderr.decode('utf-8', 'replace')
    summ = txt[txt.rfind('Summary:'):]
    m = re.search(r'I:\s+(-?[\d.]+|-inf) LUFS', summ)
    I = float(m.group(1)) if m else float('nan')
    m = re.search(r'Peak:\s+(-?[\d.]+|-inf) dBFS', summ)
    tp = float(m.group(1)) if m else float('nan')
    return I, tp


def decode_file(path):
    return np.frombuffer(run(['ffmpeg', '-v', 'error', '-nostdin', '-i', path, '-ac', '1', '-ar', str(SR),
                              '-f', 'f32le', '-']).stdout, dtype='<f4').astype(np.float64)


# ----------------------------------------------------------------------------------------------------------------
# DSP
# ----------------------------------------------------------------------------------------------------------------
def fast_len(n):
    best = 1 << int(math.ceil(math.log2(max(n, 2))))
    p5 = 1
    while p5 < best:
        p35 = p5
        while p35 < best:
            p = p35
            while p < n:
                p *= 2
            best = min(best, p)
            p35 *= 3
        p5 *= 5
    return best


def biquad(kind, f0, q=0.7071067811865476, gain_db=0.0):
    w0 = 2 * math.pi * f0 / SR
    c, s = math.cos(w0), math.sin(w0)
    if kind in ('hp', 'lp'):
        al = s / (2 * q)
        b = [(1 - c) / 2, 1 - c, (1 - c) / 2] if kind == 'lp' else [(1 + c) / 2, -(1 + c), (1 + c) / 2]
        a = [1 + al, -2 * c, 1 - al]
    elif kind == 'hs':                                  # RBJ high shelf, S = 1
        A = 10 ** (gain_db / 40)
        al = s / 2 * math.sqrt(2.0)
        sa = 2 * math.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * c + sa), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sa)]
        a = [(A + 1) - (A - 1) * c + sa, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sa]
    else:
        raise ValueError(kind)
    return np.array(b) / a[0], np.array(a) / a[0]


def sections(chain):
    out = []
    for c in chain:
        if c[0] in ('hp', 'lp'):
            order = c[2]
            for k in range(order // 2):
                out.append(biquad(c[0], c[1], q=1 / (2 * math.cos(math.pi * (2 * k + 1) / (2 * order)))))
        else:
            out.append(biquad('hs', c[1], gain_db=c[2]))
    return out


def response(chain, M):
    z1 = np.exp(-2j * np.pi * np.arange(M // 2 + 1) / M)
    H = np.ones(M // 2 + 1, dtype=complex)
    for b, a in sections(chain):
        H *= (b[0] + b[1] * z1 + b[2] * z1 * z1) / (a[0] + a[1] * z1 + a[2] * z1 * z1)
    return H


def filt(x, chain, circular=False):
    """인과 IIR(바이쿼드 단) 과 같은 결과를 FFT 로. circular=True 면 x 를 한 주기로 보고 원형으로 거른다."""
    if not chain:
        return x.copy()
    n = len(x)
    M = n if circular else fast_len(n + SR // 2)       # 0.5 s 꼬리 여유: 80 Hz 4차 버터워스 IR 은 그 안에 -150 dB 아래
    return np.fft.irfft(np.fft.rfft(x, M) * response(chain, M), M)[:n]


_FILT = {}


def filtered_source(key, chain, speed=1.0):
    k = (key, speed, json.dumps(chain))
    if k not in _FILT:
        _FILT[k] = filt(decode_mono(key, speed), chain)
    return _FILT[k]


def ramp_cos(n, rising=True):
    if n <= 0:
        return np.ones(0)
    r = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n))
    return r if rising else r[::-1]


def fade(x, fi_s, fo_s):
    y = x.copy()
    a, b = int(round(fi_s * SR)), int(round(fo_s * SR))
    if a > 0:
        y[:a] *= ramp_cos(a, True)
    if b > 0:
        y[-b:] *= ramp_cos(b, False)
    return y


def win_rms_max_db(x, win_s):
    w = max(1, int(round(win_s * SR)))
    if len(x) < w:
        return 10 * math.log10(np.mean(x * x) + 1e-30)
    c = np.concatenate([[0.0], np.cumsum(x * x)])
    return 10 * math.log10((c[w:] - c[:-w]).max() / w + 1e-30)


def active_rms_db(x, thresh_db=-50):
    """export.py active_rms_db 그대로: 10 ms 창 중 가장 큰 창에서 50 dB 안쪽만 평균"""
    win = int(0.01 * SR)
    n = len(x) // win
    if n == 0:
        return 20 * math.log10(math.sqrt(np.mean(x ** 2)) + 1e-12)
    e = (x[:n * win].reshape(n, win) ** 2).mean(axis=1)
    db = 10 * np.log10(e + 1e-20)
    act = e[db > (db.max() + thresh_db)]
    return 10 * math.log10(act.mean() + 1e-20)


def soft_limit(x, ceiling):
    """chip.soft_limit 그대로 (tanh 무릎, 0.75*ceiling 위만 누름)"""
    k = 0.75 * ceiling
    y = np.copy(x)
    over = np.abs(y) > k
    s = np.sign(y[over])
    y[over] = s * (k + (ceiling - k) * np.tanh((np.abs(y[over]) - k) / (ceiling - k)))
    return y


def measure(x, unit):
    return ebur128(x)[0] if unit == 'LUFS' else active_rms_db(x)


# BS.1770 K 가중(48 kHz 계수). 짧은 소리끼리 '들리는 크기' 를 견주는 데만 쓴다(크기 맞춤은 위 두 단위 그대로).
_KW = [((1.53512485958697, -2.69169618940638, 1.19839281085285), (1.0, -1.69065929318241, 0.73248077421585)),
       ((1.0, -2.0, 1.0), (1.0, -1.99004745483398, 0.99007225036621))]


def kweight(x):
    n = len(x)
    M = fast_len(n + SR // 2)
    z1 = np.exp(-2j * np.pi * np.arange(M // 2 + 1) / M)
    H = np.ones(M // 2 + 1, dtype=complex)
    for b, a in _KW:
        H *= (b[0] + b[1] * z1 + b[2] * z1 * z1) / (a[0] + a[1] * z1 + a[2] * z1 * z1)
    return np.fft.irfft(np.fft.rfft(x, M) * H, M)[:n]


def short_loud(x):
    """(가장 큰 100 ms, 가장 큰 400 ms) K 가중 크기, LUFS 눈금. 400 ms 는 EBU R128 의 momentary 최대와 같은 창."""
    k = kweight(np.concatenate([x, np.zeros(int(0.4 * SR))]))
    c = np.concatenate([[0.0], np.cumsum(k * k)])
    out = []
    for win_s in (0.1, 0.4):
        w = int(win_s * SR)
        out.append(round(-0.691 + 10 * math.log10((c[w:] - c[:-w]).max() / w + 1e-20), 1))
    return tuple(out)


def level(x, target, unit):
    """export.level 과 같은 뜻: target 에 맞추고, true peak 가 -3 dBTP 를 넘으면 소프트 리미터. (x, 잰 값, TP, 리미터 썼나)"""
    x = x / (np.abs(x).max() or 1.0) * 0.5
    limited = False
    for _ in range(4):
        x = x * 10 ** ((target - measure(x, unit)) / 20)
        _, tp = ebur128(x)
        c = CEIL_DBTP
        while tp > CEIL_DBTP:
            limited = True
            c -= 0.25
            x = soft_limit(x, 10 ** (c / 20))
            _, tp = ebur128(x)
        if abs(measure(x, unit) - target) < 0.05:
            break
    return x, measure(x, unit), ebur128(x)[1], limited


# ----------------------------------------------------------------------------------------------------------------
# 만들기
# ----------------------------------------------------------------------------------------------------------------
def render_layer(Ly):
    sp = Ly['speed']
    x = filtered_source(Ly['src'], Ly['chain'], sp)
    s, e = int(round(Ly['t0'] / sp * SR)), int(round(Ly['t1'] / sp * SR))
    if e > len(x):
        raise ValueError('%s: segment end %.3f beyond source (%.3f s)' % (Ly['src'], Ly['t1'], len(x) / SR * sp))
    seg = x[s:e].copy()
    for (t_abs, db, ramp_s) in Ly['steps']:            # 원본 시각 t_abs 부터 끝까지 db (ramp_s 동안 올림 코사인으로 내려감)
        k1 = int(round((t_abs - Ly['t0']) / sp * SR))
        k0 = max(0, k1 - int(round(ramp_s / sp * SR)))
        g = np.ones(len(seg))
        g1 = 10 ** (db / 20)
        g[k0:k1] = 1 + (g1 - 1) * ramp_cos(k1 - k0, True)
        g[k1:] = g1
        seg *= g
    if Ly['decay']:
        k0 = int(round(Ly['decay'][0] / sp * SR))
        seg[k0:] *= 10 ** (np.linspace(0, Ly['decay'][1], len(seg) - k0) / 20)
    seg = fade(seg, Ly['fi'] / sp, Ly['fo'] / sp)
    return seg * 10 ** (Ly['gain'] / 20)


def build_layers(spec):
    parts, log = {}, []
    for Ly in spec['layers']:
        parts[Ly['name']] = [Ly, render_layer(Ly)]
    for Ly in spec['layers']:
        r = Ly['rel']
        if not r:
            continue
        ref, win, target, lo, hi = r
        seg = parts[Ly['name']][1]
        d = win_rms_max_db(seg, win) - win_rms_max_db(parts[ref][1], win)
        adj = 0.0 if lo <= d <= hi else target - d
        if adj:
            parts[Ly['name']][1] = seg * 10 ** (adj / 20)
        log.append(dict(layer=Ly['name'], ref=ref, win_ms=round(win * 1000), raw_gain_db=Ly['gain'],
                        rel_before_db=round(d, 2), adjust_db=round(adj, 2), rel_after_db=round(d + adj, 2)))
    n = max(int(round(Ly['at'] * SR)) + len(parts[Ly['name']][1]) for Ly in spec['layers'])
    y = np.zeros(n)
    for Ly in spec['layers']:
        o = int(round(Ly['at'] * SR))
        seg = parts[Ly['name']][1]
        y[o:o + len(seg)] += seg
    return y, log


def hf_frames_db(x):
    """2 kHz 위 에너지(dB), 2 ms(96 샘플) 창 — 탁탁/튐 크기를 재는 잣대(검사관과 같은 정의)"""
    y = filt(x, [HP(2000)])
    w = 96
    n = len(y) // w
    return 10 * np.log10((y[:n * w].reshape(n, w) ** 2).mean(axis=1) + 1e-20)


def flatten_gain_db(x, a, b, alpha, smooth_s, max_db):
    """x[a:b] 의 느린 크기(10 ms 전력을 smooth_s 한 창으로 매끈하게)를 중앙값 쪽으로 alpha 만큼 당기는 이득(dB, 샘플마다).
    이득 곡선도 한 번 더 매끈하게 해서 2~20 ms 탁탁에는 거의 닿지 않는다."""
    seg = x[a:b]
    hop = int(0.01 * SR)
    n = len(seg) // hop
    p = (seg[:n * hop].reshape(n, hop) ** 2).mean(axis=1)
    k = max(3, int(round(smooth_s / 0.01)) | 1)
    win = np.hanning(k + 2)[1:-1]
    win /= win.sum()
    lev = 10 * np.log10(np.convolve(np.pad(p, (k // 2, k // 2), mode='reflect'), win, mode='valid') + 1e-20)
    g = np.clip(-alpha * (lev - np.median(lev)), -max_db, max_db)
    g = np.convolve(np.pad(g, (k // 2, k // 2), mode='edge'), win, mode='valid')
    return np.interp(np.arange(b - a), (np.arange(n) + 0.5) * hop, g)


def build_loop(spec, log=None):
    lp = spec['loop']
    x = filtered_source(lp['src'], lp['chain']).copy()
    src_f = x.copy()                                     # 기름 튐은 크기 손대기 전의 (걸러진) 원본에서 뜬다
    t = np.arange(len(x)) / SR
    if lp['ramp']:                                       # 원본 시간축 위 dB 직선(창 안의 느린 크기 변화를 편다)
        (ta, da), (tb, db) = lp['ramp']
        g_db = np.interp(t, [ta, tb], [da, db])
        x *= 10 ** (g_db / 20)
    for (a, b, db, r) in lp['dips']:                     # 튀는 지글 한두 번을 -3 dB (원본 시간축, 30 ms 경사)
        g = np.ones(len(x))
        ka, kb, kr = int(round(a * SR)), int(round(b * SR)), int(round(r * SR))
        g1 = 10 ** (db / 20)
        g[ka:ka + kr] = 1 + (g1 - 1) * ramp_cos(kr, True)
        g[ka + kr:kb - kr] = g1
        g[kb - kr:kb] = g1 + (1 - g1) * ramp_cos(kr, True)
        x *= g
    s, e, F = int(round(lp['t0'] * SR)), int(round(lp['t1'] * SR)), int(round(lp['xf'] * SR))
    fl = lp.get('flatten')
    if fl:                                               # 앞 여유(크로스페이드에 쓰는 0.5 s)부터 끝까지 한 곡선으로
        gdb = flatten_gain_db(x, s - F, e, fl['alpha'], fl['smooth_s'], fl['max_db'])
        x[s - F:e] *= 10 ** (gdb / 20)
        if log is not None:
            log.append(dict(flatten_gain_db_range=[round(float(gdb.min()), 2), round(float(gdb.max()), 2)]))
    for (st, pre, post, place, rel) in lp.get('pops', ()):
        if not (s + int(0.05 * SR) <= int(round(place * SR)) <= e - F - int(0.1 * SR)):
            raise ValueError('pop at %.3f s must sit inside the loop body, clear of the crossfade' % place)
        pop = fade(src_f[int(round((st - pre) * SR)):int(round((st + post) * SR))], pre * 0.5, post * 0.6)
        k = int(round((place - pre) * SR))
        pk = hf_frames_db(np.concatenate([pop, np.zeros(96)])).max()
        med = float(np.median(hf_frames_db(x[k - int(0.1 * SR):k + int(0.1 * SR)])))
        gain = rel - (pk - med)
        x[k:k + len(pop)] += pop * 10 ** (gain / 20)
        if log is not None:
            log.append(dict(pop_from_s=st, placed_at_s=place, body_s=round(place - lp['t0'], 3), target_over_median_db=rel,
                            gain_db=round(gain, 2)))
    body = x[s:e].copy()
    w = np.linspace(0, np.pi / 2, F)                     # 등전력: 끝 0.5 s 를 몸통 바로 앞 0.5 s 로 넘긴다
    body[-F:] = x[e - F:e] * np.cos(w) + x[s - F:s] * np.sin(w)
    return body


def build_periodic(spec):
    pc = spec['periodic']
    x = decode_mono(pc['src'], native=True)
    N = len(x)
    if N != pc['n_native']:
        raise ValueError('simmer source has %d samples, expected %d' % (N, pc['n_native']))
    M = pc['n_out']
    X = np.fft.rfft(x)                                   # 주기 신호 그대로 대역제한 재표본화 (44.1k 440765 -> 48k 479744)
    Y = np.zeros(M // 2 + 1, dtype=complex)
    k = min(len(X), len(Y))
    Y[:k] = X[:k]
    if M % 2 == 0:
        Y[-1] = 0
    y = np.fft.irfft(Y, M) * (M / N)
    return filt(y, pc['chain'], circular=True)


def pad_loop(body):
    ni, no = int(round(LEAD_IN * SR)), int(round(LEAD_OUT * SR))
    full = np.concatenate([body[len(body) - ni:], body, body[:no]])
    return full, dict(start=LEAD_IN, end=round(LEAD_IN + len(body) / SR, 6))


def encode(x, sid, enc):
    e = ENC[enc]
    base = os.path.join(SND, sid)
    head = ['ffmpeg', '-v', 'error', '-nostdin', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-']
    tail = ['-fflags', '+bitexact', '-flags', '+bitexact', '-map_metadata', '-1']
    run(head + ['-c:a', 'libopus', '-b:a', '%dk' % e['opus_kbps'], '-vbr', 'on', '-application', e['opus_app']] + tail
        + [base + '.ogg'], data=f32(x))
    run(head + ['-c:a', 'aac', '-aac_coder', e['aac_coder'], '-b:a', '%dk' % e['aac_kbps'], '-cutoff', str(e['aac_cutoff']),
                '-movflags', '+faststart'] + tail + [base + '.m4a'], data=f32(x))
    return {'ogg': 'cook/%s.ogg' % sid, 'm4a': 'cook/%s.m4a' % sid}          # 이 폴더(foley/) 기준


def unit_for(n_samples):
    """export.py level() 그대로, 파일마다: 1.5 s 이상이면 통합 LUFS, 짧으면 소리 나는 구간 RMS"""
    return 'LUFS' if n_samples / SR >= UNIT_SPLIT_S else 'RMS'


SPEC_BY_ID = {s['id']: s for s in SOUNDS}


def land_time(spec):
    """'slap' 층이 있으면 그 층 1 ms 포락선 봉우리가 이 소리 안 몇 초에 오나 (뒤집기의 착지)"""
    for Ly in spec.get('layers', []):
        if Ly['name'] == 'slap':
            seg = render_layer(Ly)
            w = SR // 1000
            e = (seg[:len(seg) // w * w].reshape(-1, w) ** 2).mean(axis=1)
            return round(Ly['at'] + (int(np.argmax(e)) + 0.5) * w / SR, 3)
    return None


def raw_render(spec):
    if 'layers' in spec:
        y, log = build_layers(spec)
        return y, None, log
    log = []
    if 'loop' in spec:
        body = build_loop(spec, log)
    else:
        body = build_periodic(spec)
    full, loop = pad_loop(body)
    return full, loop, [dict(loop_body_samples=len(body), loop_body_s=round(len(body) / SR, 6))] + log


def recipe_text(spec, log):
    """매니페스트 notes / CREDITS 의 '바꾼 것' 에 쓰는 짧은 처리 글"""
    def chain_txt(ch):
        out = []
        for c in ch:
            if c[0] == 'hp':
                out.append('HPF %g Hz %d dB/oct' % (c[1], c[2] * 6))
            elif c[0] == 'lp':
                out.append('LPF %g Hz %d dB/oct' % (c[1], c[2] * 6))
            else:
                out.append('high-shelf %+g dB @ %g Hz' % (c[2], c[1]))
        return ', '.join(out)
    if 'layers' in spec:
        rows = []
        rel = {d['layer']: d for d in log}
        for Ly in spec['layers']:
            s = SOURCES[Ly['src']]
            t = '%s %.3f-%.3f s' % (s['file'], Ly['t0'], Ly['t1'])
            if Ly['speed'] != 1.0:
                t += ', %.2gx speed, pitch %+.1f semitones (slowed by resampling)' % (Ly['speed'], 12 * math.log2(Ly['speed']))
            t += ', at +%.3f s, %s, fades %d/%d ms' % (Ly['at'], chain_txt(Ly['chain']), round(Ly['fi'] * 1000),
                                                   round(Ly['fo'] * 1000))
            if Ly['decay']:
                t += ', extra decay to %g dB from +%.2f s' % (Ly['decay'][1], Ly['decay'][0])
            for (ta, db, _) in Ly['steps']:
                t += ', %g dB from %.3f s (tames the clink)' % (db, ta)
            if Ly['name'] in rel:
                d = rel[Ly['name']]
                t += ', loudest %d ms %+.1f dB re %s' % (d['win_ms'], d['rel_after_db'], d['ref'])
            rows.append('[%s] %s' % (Ly['name'], t))
        return '; '.join(rows)
    if 'loop' in spec:
        lp = spec['loop']
        t = '%s %.2f-%.2f s (pre-roll %.2f-%.2f), 0.5 s equal-power crossfade loop, mono, %s' % (
            SOURCES[lp['src']]['file'], lp['t0'], lp['t1'], lp['t0'] - lp['xf'], lp['t0'], chain_txt(lp['chain']))
        if lp['ramp']:
            t += ', level drift flattened (%+.2f -> %+.2f dB over the source window)' % (lp['ramp'][0][1], lp['ramp'][1][1])
        for (a, b, db, _) in lp['dips']:
            t += ', %g dB dip %.2f-%.2f s (one flare)' % (db, a, b)
        if lp.get('flatten'):
            fl = lp['flatten']
            t += (', slow level riding (%d ms smoothed level pulled %d %% toward its median, max %g dB)'
                  % (round(fl['smooth_s'] * 1000), round(fl['alpha'] * 100), fl['max_db']))
        for (st, pre, post, place, rel) in lp.get('pops', ()):
            t += ', oil pop copied from %.3f s (%d ms) to %.2f s, %+g dB over the local median' % (
                st, round((pre + post) * 1000), place, rel)
        return t
    pc = spec['periodic']
    return '%s whole file (a ready-made seamless loop), mono, periodic band-limited resample %d -> %d samples, %s' % (
        SOURCES[pc['src']]['file'], pc['n_native'], pc['n_out'], chain_txt(pc['chain']))


def sources_of(spec):
    if 'layers' in spec:
        keys = [Ly['src'] for Ly in spec['layers']]
    elif 'loop' in spec:
        keys = [spec['loop']['src']]
    else:
        keys = [spec['periodic']['src']]
    out = []
    for k in keys:
        if k not in out:
            out.append(k)
    return out


def build(specs):
    os.makedirs(SND, exist_ok=True)
    raws = {}
    for spec in specs:
        y, loop, log = raw_render(spec)
        raws[spec['id']] = (y, loop, log)
        print('  render %-16s %6.3f s %s' % (spec['id'], len(y) / SR, '' if not log else json.dumps(log)[:160]), flush=True)
    entries, masters = [], {}
    for spec in specs:
        y, loop, log = raws[spec['id']]
        unit = unit_for(len(y))
        target = BGM_LUFS + spec['rel_db']
        x, meas, tp, limited = level(y, target, unit)
        lufs, _ = ebur128(x)
        m100, m400 = short_loud(x)
        files = encode(x, spec['id'], spec['enc'])
        masters[spec['id']] = x
        e = ENC[spec['enc']]
        note = recipe_text(spec, log)
        if spec['id'] in LEVEL_CHANGES:
            note += ' | level: suggested rel_db %d, used %d (%s)' % (LEVEL_CHANGES[spec['id']][0], spec['rel_db'],
                                                                  LEVEL_CHANGES[spec['id']][1])
        if unit == 'RMS' and len(x) >= 0.4 * SR:
            note += ' | for reference: integrated %.1f LUFS' % lufs
        entry = dict(id=spec['id'], kind='sfx', files=files, duration=round(len(x) / SR, 4),
                     level=dict(rel_db=spec['rel_db'], target=round(target, 1), measured=round(float(meas), 1), unit=unit,
                                peak_dbfs=round(20 * math.log10(np.abs(x).max() + 1e-12), 1),
                                true_peak_dbtp=round(tp, 1), loudest_100ms_lufs=m100, loudest_400ms_lufs=m400),
                     loop=loop, trigger=spec['ko'], group=spec['group'], duck_db=0, min_gap_ms=spec['min_gap_ms'],
                     bus='sfx_event', act=spec['act'], cue=spec['cue'], credit=sources_of(spec),
                     encode=dict(ogg='Opus %dk VBR, application %s' % (e['opus_kbps'], e['opus_app']),
                                 m4a='AAC-LC %dk, coder %s, cutoff %d Hz' % (e['aac_kbps'], e['aac_coder'], e['aac_cutoff'])),
                     notes=note)
        if 'band' in spec:
            entry['band'] = spec['band']
        land = land_time(spec)
        if land is not None:
            entry['sync'] = dict(land_s=land, how='철퍽 봉우리가 파일 %.3f s 에 온다 = 뒤집는 순간 틀면 arc 3번째 그림(250~333 ms)과 '
                                                 '맞는다. 움직임 줄이기(그림이 바로 바뀜)에서는 start(t, %.2f) 로 앞을 건너뛰면 '
                                                 '철퍽이 0.05 s 뒤에 온다.' % (land, max(0.0, land - 0.05)),
                                 reduced_motion_offset_s=round(max(0.0, land - 0.05), 2))
        if loop:
            entry['loop_len'] = round(loop['end'] - loop['start'], 6)
        if limited:
            entry['level']['limited'] = True
        entries.append(entry)
        lv = entry['level']
        print('  export %-16s %-4s rel %4d  target %6.1f  meas %6.1f  TP %5.1f  LUFS %6.1f  M100 %6.1f  M400 %6.1f%s%s' % (
            spec['id'], unit, spec['rel_db'], target, meas, tp, lufs, m100, m400, '  (limited)' if limited else '',
            '  land %.3f' % land if land is not None else ''), flush=True)
    return entries, masters


# ----------------------------------------------------------------------------------------------------------------
# 문서
# ----------------------------------------------------------------------------------------------------------------
STAGES = [
    ('해초전 (지금 게임)', ['cook_pick_1', 'cook_pat_1', 'cook_pat_2', 'cook_pat_3', 'cook_pat_4', 'cook_step',
                       'cook_heat_on_1', 'cook_heat_on_2', 'cook_sizzle_0', 'cook_sizzle_1', 'cook_sizzle_2',
                       'cook_flip_1', 'cook_flip_2', 'cook_cut_1', 'cook_cut_2', 'cook_cut_3', 'cook_plate_1',
                       'cook_plate_2', 'cook_steam']),
    ('나중 요리 (미역국, 톳 주먹밥)', ['cook_stir_1', 'cook_stir_2', 'cook_stir_3', 'cook_clink', 'cook_simmer',
                               'cook_place_1', 'cook_place_2', 'cook_lift']),
]

MAP = {
    '_how': 'AUDIO.on(\'cook\', { act, ... }) 의 act -> 소리 group. group 이 같은 변형은 직전과 다른 것을 고른다(시드 PRNG). '
            '음높이 흔들기는 +-15 센트까지.',
    'pick': 'cook_pick',
    'tap': 'cook_pat',
    'sizzle': {
        '_how': 'band 0 이 불 켜기와 함께 처음 오면 cook_heat_on 한 번 + cook_sizzle_0 루프를 1.0 s 페이드인으로 시작. '
                'band 1, 2 가 오면 지금 루프에서 다음 루프로 0.15 s 등전력 크로스페이드 + 치익 한 번(새 루프가 +4 dB 까지 '
                '올랐다가 0.5 s 에 제 크기로: 그림의 기포 터짐과 같은 때 들리는 굽기 바뀜). 탭이 돌아와 같은 band 가 '
                '다시 오면(불이 켜진 채) heat_on 없이 그 루프만 0.3 s 페이드인.',
        'heat_on': 'cook_heat_on', '0': 'cook_sizzle_0', '1': 'cook_sizzle_1', '2': 'cook_sizzle_2'},
    'flip': {'_how': 'flip 사건과 같은 때 cook_flip 을 그대로 튼다(늦추지 않는다): 파일 안의 철퍽 봉우리가 각 파일의 '
                     'sync.land_s 에 와서 arc 3번째 그림(착지, 250~333 ms)과 맞는다. 그 앞은 휙. 움직임 줄이기(arc 없이 바로 '
                     '바뀜)면 start(t, sync.reduced_motion_offset_s) 로 휙을 건너뛴다.',
             'id': 'cook_flip'},
    'quiet': {'_how': '도는 지글/보글 루프를 0.25 s 페이드아웃 후 멈춘다(원샷은 그대로 끝까지). 파일은 없다.'},
    'cut': 'cook_cut',
    'step': 'cook_step',
    'done': {'_how': '접시 공개: cook_plate. cook_plate 는 시작 17~22 ms 에 봉우리라 '
                     '접시가 다 올라온 때(6 그림 x 83 ms 의 끝, 공개 뒤 약 0.42 s)에 틀면 "탁 놓임" 과 맞는다. '
                     'cook_steam 은 고르면 그 0.15 s 뒤에 겹친다.',
             'plate': 'cook_plate', 'steam': 'cook_steam'},
    'stir': 'cook_stir', 'clink': 'cook_clink', 'simmer': 'cook_simmer', 'place': 'cook_place', 'lift': 'cook_lift',
    'back': {'_how': 'lift 와 같은 결 더 작게: cook_lift 를 gain 0.5(-6 dB)로', 'id': 'cook_lift', 'gain': 0.5},
}


def family_text(fam):
    """지글 가족 글: 잰 숫자를 그대로 넣고, 오르지 않는 것은 오르지 않는다고 적는다"""
    if not fam:
        return '지글 세 루프 중 일부만 구워서 잴 수 없었다.'
    ks = ('cook_sizzle_0', 'cook_sizzle_1', 'cook_sizzle_2')
    v = lambda key: [fam[k][key] for k in ks]
    rising = lambda a: a[0] < a[1] < a[2]
    cen, s8 = v('centroid_hz'), v('share_above_8k')
    c9 = [fam[k]['crackle_per_s']['9'] for k in ks]
    c15 = [fam[k]['crackle_per_s']['15'] for k in ks]
    t = ('cook_sizzle_0 -> 1 -> 2 는 같은 팬(같은 녹음 fryingpan01)이 달궈지는 세 결이다. 크기 %s LUFS. 밝기(마스터 몸통의 '
         '스펙트럼 무게중심 %s Hz, 8 kHz 위 에너지 몫 %s)는 %s. 도드라지는 탁탁(2 kHz 위 2 ms 창이 200 ms 이동 중앙값보다 '
         '+9 dB 솟는 곳)은 초당 %s: 0 은 조용한 바탕에 성긴 탁탁, 1 은 이 녹음에서 가장 빽빽하고 고른 쉬익이라 탁탁이 쉬익에 묻혀 '
         '따로 솟는 것이 가장 적다(소리는 셋 중 가운데로 크다), 2 가 가장 바쁘다. 기름 튐(+15 dB 넘음)은 초당 %s (2 에만). '
         '크기 흔들림(250 ms 크기의 표준편차)은 %s dB. 서로 상관없는 잡음이라 등전력(cos/sin) 크로스페이드가 맞다.') % (
        '/'.join('%g' % x for x in v('lufs')), '/'.join(str(x) for x in cen), '/'.join('%.3f' % x for x in s8),
        '0 -> 1 -> 2 로 오른다' if rising(cen) and rising(s8) else '0 -> 1 -> 2 로 고르게 오르지 않는다',
        '/'.join('%g' % x for x in c9), '/'.join('%g' % x for x in c15), '/'.join('%g' % x for x in v('env250_std_db')))
    return t


def write_manifest(entries, fam=None):
    used = []
    for e in entries:
        for k in e['credit']:
            if k not in used:
                used.append(k)
    credits = {k: dict(title=SOURCES[k]['title'], file=SOURCES[k]['file'], author=SOURCES[k]['author'],
                       page=SOURCES[k]['page'], license=SOURCES[k]['license'], license_url=SOURCES[k]['license_url'])
               for k in used}
    m = dict(
        name='뽈뽈 문어 부엌 소리 (진짜 녹음 foley)',
        version=1,
        generated=GENERATED,
        about='부엌 미니게임(해초전 등)에 쓰는 진짜 녹음 효과음. OpenGameArt 의 CC0 / CC-BY 녹음을 잘라 겹치고 크기를 맞췄다. '
              '칩튠 한 벌(audio/manifest.json) 옆에 놓는 층이다. 출처와 바꾼 것은 CREDITS.md.',
        base='files 경로는 이 폴더(foley/) 기준이다. js/audio.js 가 앞에 foley/ 를 붙여 받는다. listen.html 도 이 폴더 기준 상대 경로.',
        rules=dict(
            formats=dict(pick='audio/manifest.json 과 같다: Opus(.ogg) 를 먼저, 못 읽으면 AAC(.m4a).', sample_rate=SR, channels=1),
            loudness=dict(reference='BGM 통합 -20 LUFS. 모든 파일에 들려줄 크기가 구워져 있다(level.rel_db = BGM 대비). '
                                    'gain 1.0 으로 틀고 효과음 슬라이더만 곱한다.',
                          unit='파일마다: 1.5 s 이상 = 통합 LUFS, 짧으면 소리 나는 구간 RMS. audio/src/export.py level() 의 '
                               '코드와 audio/manifest.json 이 쓰는 경계다(그 파일 설명 글의 "1초" 는 코드와 다르다).',
                          short_term='level.loudest_100ms_lufs / loudest_400ms_lufs = K 가중 가장 큰 100 ms / 400 ms. '
                                     '단위가 달라도 들리는 크기를 견줄 수 있게 적었다(크기 맞춤에는 쓰지 않는다).',
                          true_peak='-3 dBTP 아래'),
            looping=dict(how='Web Audio AudioBufferSourceNode: loop=true, loopStart=loop.start, loopEnd=loop.end, '
                             '시작은 start(t, loop.start). <audio loop> 는 쓰지 않는다.',
                         pad='파일 앞 0.5 s = 몸통 끝 복사, 뒤 1.0 s = 몸통 앞 복사(이음새용 여유).',
                         start='루프는 처음과 끝에 0.25~1.0 s 페이드를 준다(몸통 한가운데서 시작하므로).'),
            bus='모두 sfx_event(효과음 슬라이더). 지글·보글 루프도 앞에 서는 요리 소리라 amb 가 아니다. duck_db 0: 한 번짜리 소리는 '
                'BGM 을 내리지 않는다. 지글·보글 루프가 도는 동안만 js/audio.js 가 음악을 살짝 내린다(BGM -4 dB, 환경음 -2 dB).',
            sizzle_family=family_text(fam),
            durations='duration 은 마스터(= .ogg 디코드) 길이다. .m4a 를 ffmpeg 로 디코드하면 AAC 의 마지막 1024 샘플 묶음이 '
                      '남아 0.7~21 ms 더 길다(뒤는 디지털 무음). Chrome decodeAudioData 는 정확한 길이. 루프 지점과 뒤 여유에는 '
                      '영향 없음.',
            variation='group 이 같은 변형은 직전과 다른 것. 시드 PRNG(Math.random 금지). 음높이는 +-15 센트까지.',
            sound_off='소리는 꺼진 채 시작하는 게임이라 이 층은 덤이다. 없거나 못 읽으면 조용히 건너뛴다.'),
        map=dict(cook=MAP),
        credits=credits,
        sounds=entries)
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=1)
        f.write('\n')


def speed_txt(speed, lang):
    st = 12 * math.log2(speed)
    if lang == 'ko':
        return '%.2g 배 느리게(%.1f 반음 낮춤)' % (speed, st)
    return 'slowed to %.2gx (pitched %.1f semitones)' % (speed, st)


def changes_line(spec, entry, lang):
    e = entry
    speeds = sorted({Ly['speed'] for Ly in spec.get('layers', []) if Ly['speed'] != 1.0})
    if lang == 'ko':
        s = '잘라 냄, 모노(L/R 평균) 48 kHz, DC 제거, 필터, 페이드'
        if 'layers' in spec and len(spec['layers']) > 1:
            s += ', 여러 녹음을 겹침'
        if 'loop' in spec or 'periodic' in spec:
            s += ', 이음새 없는 루프로 만듦'
        if spec.get('loop', {}).get('pops'):
            s += ', 같은 녹음의 기름 튐을 몸통에 얹음'
        for sp in speeds:
            s += ', ' + speed_txt(sp, 'ko')
        s += ', 크기 맞춤(BGM 대비 %d dB), Opus/AAC 로 인코딩' % e['level']['rel_db']
        return s
    s = 'trimmed, mono (L/R average) 48 kHz, DC removed, filtered, faded'
    if 'layers' in spec and len(spec['layers']) > 1:
        s += ', layered with other recordings'
    if 'loop' in spec or 'periodic' in spec:
        s += ', made into a seamless loop'
    if spec.get('loop', {}).get('pops'):
        s += ', oil pops from elsewhere in the same recording added to the body'
    for sp in speeds:
        s += ', ' + speed_txt(sp, 'en')
    s += ', level set (%d dB re BGM), encoded to Opus and AAC' % e['level']['rel_db']
    return s


def key_changes(k):
    ch = ['trimmed', 'mixed to mono', 'filtered', 'faded']
    for spec in SOUNDS:
        for Ly in spec.get('layers', []):
            if Ly['src'] == k and Ly['speed'] != 1.0 and speed_txt(Ly['speed'], 'en') not in ch:
                ch.append(speed_txt(Ly['speed'], 'en'))
        if spec.get('loop', {}).get('src') == k or spec.get('periodic', {}).get('src') == k:
            if 'looped' not in ch:
                ch.append('looped')
    if k in LAYERED_KEYS:
        ch.append('layered with other recordings')
    ch += ['level-adjusted', 're-encoded (Opus, AAC)']
    return ', '.join(ch)


def attribution(k, changed=True):
    s = SOURCES[k]
    t = '"%s" (%s) by %s, %s, %s (%s)' % (s['title'], s['file'], s['author'], s['page'], s['license'], s['license_url'])
    if changed:
        t += '. Changes: ' + key_changes(k) + '.'
    return t


LAYERED_KEYS = set()


def write_credits(entries):
    by_id = {e['id']: e for e in entries}
    for spec in SOUNDS:
        if 'layers' in spec and len(spec['layers']) > 1:
            LAYERED_KEYS.update(Ly['src'] for Ly in spec['layers'])
    used = []
    for e in entries:
        for k in e['credit']:
            if k not in used:
                used.append(k)
    by_lic = {}
    for k in used:
        by_lic.setdefault(SOURCES[k]['license'], []).append(k)
    o = []
    o.append('# 부엌 소리 출처 / Kitchen foley credits\n')
    o.append('이 폴더의 소리 %d개(파일 %d개: .ogg Opus + .m4a AAC)는 모두 OpenGameArt.org 에 올라온 소리를 잘라 겹쳐 만들었다. '
             '거의 모두 진짜 녹음이다(김 쉬익 cook_steam 의 원본은 가공한 잡음일 수 있다). 직접 녹음하지 않았고 AI 로 만들지 않았다. 원본 %d개 가운데 CC0 가 %d개, CC BY 가 %d개다. '
             'CC BY 는 아래 글귀를 그대로 크레딧에 넣어야 한다(바꾼 것 표시 포함). CC0 는 의무가 없지만 고마움으로 함께 적는다.\n'
             % (len(entries), 2 * len(entries), len(used), len(by_lic.get('CC0 1.0', [])),
                len(used) - len(by_lic.get('CC0 1.0', []))))
    o.append('All %d sounds here (%d files, .ogg Opus + .m4a AAC) are edited from sounds published on OpenGameArt.org, nearly '
             'all of them real recordings (the source of the steam hiss, cook_steam, may be processed noise). We did not record them '
             'and nothing is AI-generated. Of the %d source files, %d are CC0 and %d are '
             'CC BY. CC BY sources must be credited with the lines below (including the change note). CC0 sources need no '
             'credit; we list them as a courtesy.\n' % (len(entries), 2 * len(entries), len(used),
                                                         len(by_lic.get('CC0 1.0', [])), len(used) - len(by_lic.get('CC0 1.0', []))))
    o.append('## 꼭 넣을 크레딧 / Required attribution (CC BY)\n')
    for k in used:
        if SOURCES[k]['license'] != 'CC0 1.0':
            ids = [e['id'] for e in entries if k in e['credit']]
            o.append('- %s\n  - 쓰인 곳 / used in: %s\n  - %s' % (attribution(k), ', '.join(ids), SOURCES[k]['note']))
    o.append('\n## 원본 목록 / All sources\n')
    o.append('| 원본 / source file | 제목 / title | 만든 이 / author | 페이지 / page | 라이선스 / licence |')
    o.append('|---|---|---|---|---|')
    for k in used:
        s = SOURCES[k]
        o.append('| %s | %s | %s | %s | [%s](%s) |' % (s['file'], s['title'], s['author'], s['page'], s['license'],
                                                     s['license_url']))
    notes = {}
    for k in used:
        if SOURCES[k]['note']:
            notes.setdefault((SOURCES[k]['title'], SOURCES[k]['page'], SOURCES[k]['note']), []).append(SOURCES[k]['file'])
    if notes:
        o.append('\n## 라이선스·출처 메모 / Licence and provenance notes\n')
        for (title, page, note), files in notes.items():
            o.append('- "%s" (%s), %s: %s' % (title, ', '.join(files), page, note))
    o.append('\n## 소리마다 / Per sound\n')
    o.append('각 소리는 `cook/<id>.ogg` 와 `cook/<id>.m4a` 두 파일이다(같은 소리, 인코딩만 다름). '
             'Each sound is two files, `cook/<id>.ogg` and `cook/<id>.m4a` (same sound, two encodings).\n')
    for spec in SOUNDS:
        e = by_id.get(spec['id'])
        if not e:
            continue
        o.append('### %s\n' % spec['id'])
        o.append('- 언제: %s' % spec['ko'])
        o.append('- When: %s' % spec['en'])
        o.append('- 원본 / sources:')
        for k in e['credit']:
            s = SOURCES[k]
            o.append('  - "%s" (%s) by %s, %s, %s (%s)' % (s['title'], s['file'], s['author'], s['page'], s['license'],
                                                          s['license_url']))
        o.append('- 바꾼 것: %s' % changes_line(spec, e, 'ko'))
        o.append('- Changes: %s' % changes_line(spec, e, 'en'))
        o.append('- 처리 / recipe: %s\n' % e['notes'].split(' | ')[0])
    o.append('## 쓰지 않은 것 / Not used\n')
    o.append('판정 단계의 예비 후보(DavidW gas_burner, Ludrol boiling_cocoa, towel-06, swosh-16, steam Marker #3, squish_06, '
             'Kitchen_13, kitchencuttingboard01, card-place-1, card-slide-1, bottle-shake-07/08)는 이 한 벌에 들어가지 않았다. '
             '앞 판에서 뒤집기 휙으로 쓰던 qubodup 대나무 막대 휙(swosh-26, swosh-15)은 이번 판에서 뺐다(낮은 웅 소리라 폰에서 '
             '들리지 않아서, 대신 같은 Kenney 카지노 묶음의 card-slide-7, -8). '
             'The judges\' backup picks listed here are not in this set, so they need no credit. The bamboo swishes used by '
             'the previous build are no longer in it either.\n')
    with open(os.path.join(OUT, 'CREDITS.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(o) + '\n')


def fmt_dur(e):
    if e['loop']:
        return '루프 %.2f s' % e['loop_len']
    return '%.2f s' % e['duration']


def write_readme(entries, demo=None, fam=None):
    by_id = {e['id']: e for e in entries}
    o = []
    o.append('# 부엌 소리 (녹음 foley)\n')
    o.append('뽈뽈 문어 부엌 미니게임에 쓰는 녹음 효과음 %d개다(거의 모두 진짜 녹음). 지금 게임의 해초전(톡톡 -> 뒤집기 -> 썰기 -> 접시)과 '
             '나중 요리(미역국 젓기, 톳 주먹밥 올리기)에 쓴다. 냄새는 못 내니 소리로라도 "맛있겠다" 가 들리게: 가까이서 들리는 '
             '깨끗한 지글, 바삭, 톡.\n' % len(entries))
    o.append('- 원본: OpenGameArt.org 의 **CC0 와 CC BY** 녹음만. 출처와 바꾼 것은 [CREDITS.md](CREDITS.md). '
             'CC BY 두 곳(DavidW 도마 소리, Vinrax 물소리)은 크레딧을 꼭 넣어야 한다.')
    o.append('- 칩튠 한 벌(`audio/`, 합성기로 만든 오리지널) 옆에 놓는 층이다. 그 한 벌의 규칙(48 kHz 모노, Opus + AAC, '
             'BGM 대비 크기, 루프 여유)을 그대로 따른다. 접시 공개(done)에 칩튠 팡파르는 없다: 이 층의 접시 소리와 김뿐이다.')
    o.append('- 표: [manifest.json](manifest.json) (파일, 길이, 루프 지점, 크기, act, 출처 키). 들어 보기: [listen.html](listen.html) '
             '(이 폴더에서 `python3 -m http.server` 로 열면 루프를 게임처럼 돌려 들을 수 있다. 파일로 바로 열면 한 번씩만 재생).')
    o.append('- id 는 모두 `cook_` 으로 시작한다. 본 한 벌에 이미 `step`(걸음, step_1~4)과 `place_*`(장소 테마)가 있어서 겹치지 않게 했다. '
             'files 경로(`cook/<id>.ogg`)는 이 폴더(`foley/`) 기준이다. 게임에서는 js/audio.js 가 `foley/manifest.json` 을 부엌 소리가 처음 필요할 때 받고, act 를 이 표의 `map.cook` 대로 튼다.')
    o.append('- 크레딧: CC BY 두 줄과 CC0 원본은 게임의 `credits.html` (설정 맨 아래 \'만든 것들\', 부엌 조리대 아래 같은 링크)에 그대로 있다.')
    o.append('- 소리는 꺼진 채 시작하는 게임이라 이 층은 덤이다. 켰을 때만 들린다.')
    if demo:
        o.append('- 한 판 미리 듣기 `%s.m4a|.ogg` (%.1f s)는 굽기의 `--work` 폴더 preview/ 에 생긴다. 해초전 한 판을 게임처럼 '
                 '이어 붙인 **흉내**라 게임 파일이 아니고 저장소에 넣지 않는다. 불 켜면 지글 0 이 1 s 페이드인, 3 s 마다 다음 굽기로 '
                 '0.5 s 크로스페이드, 뒤집은 뒤 0.25 s 페이드아웃.' % (demo['id'], demo['duration']))
    o.append('')
    o.append('## 다시 만들기\n')
    o.append('```sh\n# 저장소 뿌리에서. 원본 28개는 저장소에 없다: tools/foley-build.py 머리글의 표대로 CREDITS.md 의 페이지에서 받아\n'
             '# --raw 폴더에 둔다 (받은 파일이 그때와 같은지 스크립트가 sha256 으로 본다). 해독은 ffmpeg 로만\n'
             'python3 -I tools/foley-build.py --raw ~/.cache/ppolppol-foley/raw              # 굽기 + 이 폴더의 문서 + 검사\n'
             'python3 -I tools/foley-build.py --raw ~/.cache/ppolppol-foley/raw --no-check   # 검사 없이\n```\n')
    o.append('numpy 와 ffmpeg(libopus, aac)만 쓴다. 난수가 없고 ffmpeg 를 `-bitexact` 로 돌려서 몇 번을 돌려도 같은 파일이 나온다. '
             '할 일: 원본 구간 자르기 -> 모노(L/R 평균) 48 kHz -> DC 제거 -> 고역/저역 통과(버터워스, 인과 IIR 과 같은 결과라 '
             '앞울림 없음) -> 페이드 -> 여러 녹음 겹치기(뒤집기, 썰기, 불 켜기, 접시) -> 크기 맞추기 -> Opus, AAC 인코딩.\n')
    o.append('## 크기\n')
    o.append('- 기준은 BGM 통합 -20 LUFS 다. 파일마다 `level.rel_db`(BGM 대비 dB)만큼 **구워져 있다**. 게임은 gain 1.0 으로 틀고 '
             '효과음 슬라이더만 곱한다.')
    units = {}
    for e in entries:
        units.setdefault(e['level']['unit'], []).append(e)
    o.append('- 파일마다 1.5 s 이상이면 통합 LUFS, 짧으면 소리 나는 구간 RMS 로 잰다(`audio/src/export.py` level() 의 코드와 '
             '`audio/manifest.json` 이 쓰는 경계. 그 파일 설명 글에는 1초라고 적혀 있지만 코드는 1.5 s 다). 지금 LUFS 로 잰 것: %s.'
             % ', '.join('`%s`' % e['id'] for e in units.get('LUFS', [])))
    ref = []
    for sid in ('cook_heat_on_1', 'cook_heat_on_2'):
        m = re.search(r'integrated (-?[\d.]+) LUFS', by_id[sid]['notes']) if sid in by_id else None
        if m:
            ref.append('%s %s LUFS (목표 %g)' % (sid, m.group(1), by_id[sid]['level']['target']))
    if ref:
        o.append('- 1~1.5 s 인 소리는 불 켜기 둘뿐이다. 1초 경계로 쟀다면 LUFS: %s. 1 dB 안이다.' % ', '.join(ref))
    o.append('- 단위가 다른 소리끼리는 `level.loudest_100ms_lufs` / `loudest_400ms_lufs`(K 가중 가장 큰 100 / 400 ms)로 '
             '들리는 크기를 견준다. 크기 맞춤에는 쓰지 않는다.')
    o.append('- true peak 는 -3 dBTP 아래.')
    o.append('- 제안 크기에서 바꾼 것: 지글 세 단계를 +3 dB(-15/-12/-10), 보글 +2 dB(-14). 비 오는 날 바탕 빗소리(amb_rain, -12)가 '
             '가장 자주 들리는데 그 아래로 지글이 묻히지 않게. 김 쉬익 -20(제안 -14): 고음 쉬익은 RMS 로 재면 작게 읽혀서 '
             '-17 에서도 가장 큰 400 ms 가 접시 둘 사이였다. 불 켜기 -18(제안 -12): 50 ms 딸깍과 0.9 s 작은 꼬리를 RMS 가 '
             '평균해 딸깍을 6 dB 작게 읽었다(-12 면 가장 큰 100 ms 가 뒤집기만큼). -18 이면 썰기 바로 아래다.\n')
    o.append('## 루프 (지글 세 단계, 보글)\n')
    o.append('- 파일 = [앞 0.5 s = 몸통 끝 복사][몸통][뒤 1.0 s = 몸통 앞 복사], `loop.start` = 0.5, `loop.end` = 0.5 + 몸통 길이.')
    o.append('- Web Audio `AudioBufferSourceNode` 에 `loop = true`, `loopStart`, `loopEnd`, 시작은 `start(t, loop.start)`. '
             '`<audio loop>` 는 쓰지 않는다(인코더 패딩 때문에 틈).')
    o.append('- 지글 몸통은 같은 녹음의 고른 구간을 잘라, 끝 0.5 s 를 몸통 바로 앞 0.5 s 로 넘기는 등전력 크로스페이드로 이었다. '
             '보글은 원래 이음새 없는 루프(TinyWorlds)를 주기 그대로 48 kHz 로 바꿨다. 이음새는 Opus, AAC 둘 다 디코드해서 확인했다 '
             '(검사 보고서: 굽기의 --work 폴더 check/report.md).')
    o.append('- 굽기가 바뀌면(band 0 -> 1 -> 2) 지금 루프에서 다음 루프로 0.15 s 등전력 크로스페이드 + 치익 한 번(새 루프가 +4 dB '
             '까지 올랐다가 0.5 s 에 제 크기로). `quiet` 이면 0.25 s 페이드아웃.')
    o.append('- ' + family_text(fam) + ' 디코드한 파일의 같은 숫자와 이음새 검사는 굽기의 --work 폴더 check/report.md.')
    o.append('- 바삭(2) 루프는 느린 크기 고르기(400 ms 로 매끈하게 한 크기를 중앙값 쪽으로 60 %)로 큰 출렁임을 폈고, 같은 녹음의 '
             '다른 곳에서 뜬 기름 튐 두 개(18 ms, 30 ms)를 몸통 3.8 s, 8.0 s 에 얹었다. 루프가 10 s 라 튐도 10 s 마다 같은 자리에 '
             '온다(바삭 상태는 보통 몇 초라 한두 바퀴).')
    o.append('- 지글 루프는 Opus 96 kbps 다(48 kbps 에서는 Opus 가 탁탁을 원본의 31~68 % 로 뭉갰다). AAC 도 96 kbps.\n')
    o.append('## 뒤집기 때맞춤\n')
    lands = ['`%s` %.3f s' % (e['id'], e['sync']['land_s']) for e in entries if e.get('sync')]
    o.append('- 게임은 뒤집는 순간 소리를 틀고, 전은 12 fps 로 arc 그림 0~2(0~250 ms) 동안 공중에 있다가 3번째 그림(250~333 ms)에 '
             '내려앉는다(js/cook.js, js/cook-art.js). 그래서 철퍽 봉우리를 그 착지에 맞췄다: %s. 그 앞은 카드 미끄럼으로 만든 휙이다.'
             % ', '.join(lands))
    o.append('- 늦추지 말고 사건과 함께 튼다. 움직임 줄이기(prefers-reduced-motion: 그림이 바로 바뀜)에서는 '
             '`start(t, sync.reduced_motion_offset_s)` 로 휙을 건너뛰면 철퍽이 50 ms 뒤에 온다.\n')
    o.append('## 길이\n')
    o.append('- manifest 의 `duration` 은 마스터(= .ogg 디코드) 길이다. .m4a 를 ffmpeg 로 디코드하면 AAC 의 마지막 1024 샘플 '
             '묶음이 통째로 남아 0.7~21 ms 더 길다(덧붙은 뒤는 디지털 무음). Chrome 의 decodeAudioData 는 정확한 길이로 '
             '디코드했다(listen.html 시험). 어느 쪽이든 루프의 `loop.end` 뒤 여유(1.0 s)에는 영향이 없다.\n')
    o.append('## 소리 표\n')
    o.append('| id | 언제 | 길이 | 크기(rel_db, 단위) | 원본 |')
    o.append('|---|---|---|---|---|')
    for title, ids in STAGES:
        o.append('| **%s** | | | | |' % title)
        for sid in ids:
            e = by_id.get(sid)
            if not e:
                continue
            srcs = ', '.join(sorted({SOURCES[k]['author'].split(' (')[0] for k in e['credit']}))
            o.append('| `%s` | %s | %s | %d %s | %s |' % (sid, SPEC_BY_ID[sid]['ko'], fmt_dur(e), e['level']['rel_db'],
                                                       e['level']['unit'], srcs))
    o.append('')
    o.append('해초전 한 판: `pick` -> `tap` x 9 -> `step` `quiet` -> `sizzle(0)`(불 켜기 + 지글 0) -> `sizzle(1)` -> `sizzle(2)` '
             '-> `flip` -> `step` `quiet` -> `cut` x 2~4 -> `step` `quiet` -> `done`(접시 + 김). '
             'act 와 group 의 짝은 manifest.json 의 `map.cook`.\n')
    o.append('## 정직 메모\n')
    o.append('- **만든 쪽(Claude)은 소리를 들을 수 없다.** 고른 구간과 겹치기는 숫자(크기, 피크, 스펙트럼 무게중심, 대역별 크기, '
             '탁탁 수, 루프 이음새 오차)와 스펙트로그램·파형 그림만 보고 정했다. 원본 페이지의 제목과 설명도 근거로 썼다.')
    o.append('- 그래서 사람 귀로 꼭 확인할 것 (listen.html 에 견주기 단추가 있다):')
    o.append('  - 뒤집기: 철퍽이 "전이 기름에 떨어짐" 으로 들리는지(젖은 수건 녹음), 휙이 공기 소리로 들리는지(카드 미끄럼을 느리게 한 것).')
    o.append('  - 톡톡이 끈적하지 않은지. listen.html 의 "톡톡 9번" 을 그대로 / 어둡게(3.5 kHz 저역 통과) 견줘서, 어두운 쪽이 '
             '낫다면 tools/foley-build.py 의 PAT_CHAIN 을 PAT_CHAIN_DARK 로 바꿔 다시 굽는다.')
    o.append('  - 지글 세 단계가 한 팬이 달궈지는 것처럼 들리는지, 너무 얇은 쉬익은 아닌지. listen.html 의 "0 -> 1 -> 2 이어 듣기" 를 '
             '그대로 / 10 kHz 위 -3 dB 로 견줘서 따뜻한 쪽이 낫다면 세 루프 셸프를 3 dB 씩 내린다.')
    o.append('  - 10 s 바삭 루프를 여러 바퀴 돌려도 같은 튐이 거슬리게 되풀이되지 않는지("루프로 듣기").')
    o.append('  - 썰기: 바삭이 큰 cut_1 과 도마 톡이 앞선 cut_2, cut_3 중 어느 결이 더 맛있게 들리는지.')
    o.append('  - 불 켜기의 화르륵이 불처럼 들리는지(성냥 녹음을 거른 것).')
    o.append('- 마음에 안 들면 tools/foley-build.py 의 숫자를 고쳐 다시 굽는다.')
    o.append('- 진짜 녹음이지만 "그 장면을 그대로 녹음한 것" 은 아닌 대역이 많다(아래). 정직하게 적어 둔다.\n')
    o.append('## 판정 단계의 처리 글과 다르게 한 것\n')
    for t in DEVIATIONS:
        o.append('- ' + t)
    o.append('')
    o.append('## 빈 곳 (대신 쓴 것)\n')
    for act, t in GAPS:
        o.append('- **%s**: %s' % (act, t))
    o.append('')
    with open(os.path.join(OUT, 'README.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(o) + '\n')


LISTEN_NOTE = {
    'cook_sizzle_0': '루프 파일: 이 줄은 한 번만 재생된다(앞 0.5초, 뒤 1초 여유 포함). 위 "루프로 듣기" 가 게임처럼 돌린다.',
    'cook_sizzle_1': '루프 파일. 게임에서는 0번에서 0.15초에 넘어오며 치익 한 번(+4 dB). 위 "루프로 듣기" 가 게임처럼 돌린다.',
    'cook_sizzle_2': '루프 파일. 뒤집을 때까지 돈다. 위 "루프로 듣기" 가 게임처럼 돌린다.',
    'cook_simmer': '루프 파일. 위 "루프로 듣기" 가 게임처럼 돌린다.',
}

LISTEN_JS = r'''
(function () {
  var D = JSON.parse(document.getElementById('snd-data').textContent);
  var ctx = null, cache = {}, voices = [], note = document.getElementById('wa-note');
  function say(t) { note.textContent = t; }
  function fmt() { var r = document.querySelector('input[name=fmt]:checked'); return r ? r.value : 'ogg'; }
  function ensure() {
    if (!ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) { say('이 브라우저는 Web Audio 가 없다.'); return false; } ctx = new AC(); }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }
  function fetchDecode(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.arrayBuffer(); })
      .then(function (ab) { return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, function (e) { rej(e || new Error('decode ' + url)); }); }); });
  }
  function load(id) {
    var f = fmt(), key = id + '.' + f;
    if (!cache[key]) {
      cache[key] = fetchDecode('cook/' + id + '.' + f).then(function (b) { return { buf: b, fmt: f }; }, function (err) {
        if (f === 'ogg') return fetchDecode('cook/' + id + '.m4a').then(function (b) { return { buf: b, fmt: 'm4a' }; });
        throw err;
      });
      cache[key].catch(function () { delete cache[key]; });
    }
    return cache[key];
  }
  function db(x) { return Math.pow(10, x / 20); }
  function curve(param, t, dur, up, peak) {     /* equal-power: sin rising (to peak, default 1) or cos falling over dur */
    var n = 64, c = new Float32Array(n);
    for (var i = 0; i < n; i++) { var a = (i / (n - 1)) * Math.PI / 2; c[i] = (peak || 1) * (up ? Math.sin(a) : Math.cos(a)); }
    param.setValueCurveAtTime(c, t, dur);
  }
  function route(id, mode) {                     /* source -> [compare filter + same-loudness gain] -> voice gain -> out */
    var g = ctx.createGain(), head = g, s = D[id];
    if (mode === 'warm' && s.warm_gain_db != null) {
      var hs = ctx.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 10000; hs.gain.value = -3;
      var cw = ctx.createGain(); cw.gain.value = db(s.warm_gain_db); hs.connect(cw); cw.connect(g); head = hs;
    } else if (mode === 'dark' && s.dark_gain_db != null) {
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3500; lp.Q.value = Math.SQRT1_2;
      var cd = ctx.createGain(); cd.gain.value = db(s.dark_gain_db); lp.connect(cd); cd.connect(g); head = lp;
    }
    g.connect(ctx.destination);
    return { head: head, g: g };
  }
  function play(id, buf, t, mode, loop) {
    var src = ctx.createBufferSource(), r = route(id, mode), L = D[id].loop;
    src.buffer = buf; src.connect(r.head);
    if (loop && L) { src.loop = true; src.loopStart = L.start; src.loopEnd = L.end; src.start(t, L.start); } else src.start(t);
    var v = { src: src, g: r.g }; voices.push(v); return v;
  }
  function stopAll(fade) {
    if (!ctx) return;
    var now = ctx.currentTime;
    voices.forEach(function (v) {
      try {
        if (v.g.gain.cancelAndHoldAtTime) v.g.gain.cancelAndHoldAtTime(now); else v.g.gain.cancelScheduledValues(now);
        v.g.gain.setTargetAtTime(0, now, (fade || 0.25) / 3); v.src.stop(now + (fade || 0.25) + 0.1);
      } catch (e) {}
    });
    voices = [];
  }
  function fail(err) { say('못 틀었다: ' + (err && err.message || err) + '. 루프·견주기는 웹서버로 열어야 한다(이 폴더에서 python3 -m http.server).'); }
  function shown(r) { say('지금 형식: ' + (r.fmt === 'ogg' ? 'Opus (.ogg)' : 'AAC (.m4a)') + (fmt() === 'ogg' && r.fmt !== 'ogg' ? ' (이 브라우저는 Opus 를 못 읽어 AAC 로)' : '')); }
  var acts = {
    loop: function (id, mode) {
      return load(id).then(function (r) {
        shown(r); var t = ctx.currentTime + 0.05, v = play(id, r.buf, t, mode, true);
        v.g.gain.setValueAtTime(0, t); v.g.gain.linearRampToValueAtTime(1, t + 0.3);
      });
    },
    chain: function (mode) {                     /* 0 -> 1 -> 2 like the game: 1 s fade-in, 3 s per band, 0.15 s equal-power crossfades, each with a +4 dB swell */
      var ids = ['cook_sizzle_0', 'cook_sizzle_1', 'cook_sizzle_2'];
      return Promise.all(ids.map(load)).then(function (rs) {
        shown(rs[0]); var t0 = ctx.currentTime + 0.05, XF = 0.15;
        rs.forEach(function (r, b) {
          var t = t0 + 3 * b, v = play(ids[b], r.buf, t, mode, true);
          if (b === 0) { v.g.gain.setValueAtTime(0, t); v.g.gain.linearRampToValueAtTime(1, t + 1.0); }
          else { curve(v.g.gain, t, XF, true, 1.585); v.g.gain.linearRampToValueAtTime(1, t + XF + 0.5); }   /* the band change: up to +4 dB, back over 0.5 s */
          if (b < 2) { curve(v.g.gain, t0 + 3 * (b + 1), XF, false); v.src.stop(t0 + 3 * (b + 1) + XF + 0.05); }
        });
      });
    },
    pats: function (mode) {                      /* 9 pats, 0.28 s apart, variants 1..4 in turn */
      var ids = ['cook_pat_1', 'cook_pat_2', 'cook_pat_3', 'cook_pat_4'];
      return Promise.all(ids.map(load)).then(function (rs) {
        shown(rs[0]); var t0 = ctx.currentTime + 0.05;
        for (var i = 0; i < 9; i++) play(ids[i % 4], rs[i % 4].buf, t0 + 0.28 * i, mode, false);
      });
    },
    flip: function (n) {                         /* crisp loop, the flip at 2 s, then step + quiet (0.25 s fade) like the game */
      var ids = ['cook_sizzle_2', 'cook_flip_' + n, 'cook_step'];
      return Promise.all(ids.map(load)).then(function (rs) {
        shown(rs[0]); var t0 = ctx.currentTime + 0.05, tf = t0 + 2.0, v = play(ids[0], rs[0].buf, t0, '', true);
        v.g.gain.setValueAtTime(0, t0); v.g.gain.linearRampToValueAtTime(1, t0 + 0.5);
        play(ids[1], rs[1].buf, tf, '', false);
        play(ids[2], rs[2].buf, tf + 0.4, '', false);
        v.g.gain.setValueAtTime(1, tf + 0.4); v.g.gain.linearRampToValueAtTime(0, tf + 0.65); v.src.stop(tf + 0.7);
      });
    }
  };
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act');
    stopAll(0.15);
    if (a === 'stop') return;
    if (!ensure()) return;
    var p = a === 'loop' ? acts.loop(b.getAttribute('data-id'), b.getAttribute('data-mode') || '')
      : a === 'chain' ? acts.chain(b.getAttribute('data-mode') || '')
      : a === 'pats' ? acts.pats(b.getAttribute('data-mode') || '')
      : acts.flip(b.getAttribute('data-n') || '1');
    p.catch(fail);
  });
  document.addEventListener('change', function (ev) { if (ev.target.name === 'fmt') { stopAll(0.15); say(''); } });
  if (location.protocol === 'file:') say('파일로 열려 있다: 아래 줄마다 한 번씩 듣기는 되지만, 루프·견주기 단추는 웹서버가 필요하다(이 폴더에서 python3 -m http.server).');
})();
'''


def listen_data(entries, masters):
    """listen.html 이 쓰는 숫자: 루프 지점, 견주기 필터를 켰을 때 다시 구운 것과 같은 크기가 되게 하는 보정(dB)"""
    out = {}
    for e in entries:
        d = dict(loop=e['loop'])
        x = masters[e['id']]
        if e['id'].startswith('cook_pat_'):              # 어둡게: 3.5 kHz 저역 통과 뒤 같은 소리 나는 구간 RMS 로
            d['dark_gain_db'] = round(active_rms_db(x) - active_rms_db(filt(x, [LP(3500, 2)])), 2)
        if e['id'].startswith('cook_sizzle_'):           # 따뜻하게: 10 kHz 하이셸프 -3 dB 뒤 같은 통합 LUFS 로
            s0, e0 = int(round(e['loop']['start'] * SR)), int(round(e['loop']['end'] * SR))
            body = x[s0:e0]
            d['warm_gain_db'] = round(ebur128(body)[0] - ebur128(filt(body, [WARM_SHELF]))[0], 2)
        out[e['id']] = d
    return out


def write_listen(entries, demo=None, masters=None):
    by_id = {e['id']: e for e in entries}
    data = listen_data(entries, masters) if masters else {}
    o = ['<!doctype html>', '<html lang="ko">', '<head>', '<meta charset="utf-8">',
         '<meta name="viewport" content="width=device-width, initial-scale=1">',
         '<meta name="robots" content="noindex">',
         '<title>부엌 소리 들어 보기</title>', '<link rel="icon" href="data:,">', '<style>',
         ':root { color-scheme: light dark; --bg: #fbf7f1; --fg: #2b2622; --muted: #6b625a; --line: #e4dccf; --card: #ffffff; }',
         '@media (prefers-color-scheme: dark) { :root { --bg: #16181d; --fg: #ece7e1; --muted: #a39a90; --line: #2c3038; '
         '--card: #1e2128; } }',
         'html { -webkit-text-size-adjust: 100%; }',
         'body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, -apple-system, '
         '"Segoe UI", Roboto, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }',
         'main { max-width: 640px; margin: 0 auto; padding: 16px; }',
         'h1 { font-size: 1.35rem; margin: 8px 0 4px; } h2 { font-size: 1.1rem; margin: 28px 0 8px; }',
         'p { margin: 6px 0; color: var(--muted); }',
         '.row { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px; margin: 10px 0; }',
         '.id { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .85rem; color: var(--muted); }',
         '.what { margin: 2px 0 8px; } .meta { font-size: .85rem; color: var(--muted); margin-top: 4px; }',
         'audio { width: 100%; height: 40px; }',
         'button { font: inherit; font-size: .95rem; padding: 8px 12px; margin: 6px 6px 0 0; border-radius: 8px; '
         'border: 1px solid var(--line); background: var(--bg); color: var(--fg); cursor: pointer; min-height: 40px; }',
         'button:active { transform: translateY(1px); } .fmt label { margin-right: 14px; white-space: nowrap; }',
         '#wa-note { min-height: 1.4em; }', '</style>', '</head>', '<body>', '<main>',
         '<h1>부엌 소리 들어 보기</h1>',
         '<p>해초전과 나중 요리에 쓰는 효과음이다(OpenGameArt 의 소리를 잘라 겹쳤다, 출처는 맨 아래). 줄마다 언제 나는 소리인지 적었다. 크기는 게임에서 나는 크기 그대로라 '
         '작은 소리는 작게 들린다(폰 소리를 조금 키우고 들어 보면 좋다).</p>',
         '<p>만든 쪽은 들을 수 없어서 숫자와 그림으로만 골랐다. 이상하게 들리는 줄이 있으면 id 를 알려 주면 다시 굽는다.</p>',
         '<h2>루프와 견주기</h2>',
         '<p>게임처럼 Web Audio 로 돈다(loopStart/loopEnd). 이 단추들은 웹서버로 열어야 한다: 이 폴더에서 '
         '<code>python3 -m http.server</code> 뒤 <code>http://localhost:8000/listen.html</code>. '
         '견주기 단추는 필터를 켠 채 다시 구웠을 때와 같은 크기로 맞춰서 튼다.</p>',
         '<div class="row fmt"><label><input type="radio" name="fmt" value="ogg" checked> Opus (.ogg, 게임이 먼저 쓰는 것)</label>'
         '<label><input type="radio" name="fmt" value="m4a"> AAC (.m4a)</label>'
         '<div class="meta" id="wa-note"></div></div>',
         '<div class="row"><div class="what">지글 0 -> 1 -> 2 이어 듣기: 불 켜고 1초 페이드인, 3초마다 0.15초 크로스페이드와 치익 한 번(+4 dB, 0.5초에 제 크기로), 2 는 멈출 '
         '때까지 돈다.</div><button data-act="chain">그대로</button><button data-act="chain" data-mode="warm">10 kHz 위 -3 dB '
         '(더 따뜻하게)</button><button data-act="stop">멈춤</button></div>',
         '<div class="row"><div class="what">루프로 듣기 (끝없이 돈다: 이음새와 되풀이 확인)</div>'
         '<button data-act="loop" data-id="cook_sizzle_0">지글 0</button><button data-act="loop" data-id="cook_sizzle_1">지글 1'
         '</button><button data-act="loop" data-id="cook_sizzle_2">지글 2 (바삭, 10초)</button><button data-act="loop" '
         'data-id="cook_simmer">보글</button><button data-act="loop" data-id="cook_sizzle_2" data-mode="warm">지글 2, 10 kHz 위 '
         '-3 dB</button><button data-act="stop">멈춤</button></div>',
         '<div class="row"><div class="what">톡톡 9번 (0.28초 간격, 변형 1~4 차례로)</div><button data-act="pats">그대로</button>'
         '<button data-act="pats" data-mode="dark">어둡게 (3.5 kHz 저역 통과)</button><button data-act="stop">멈춤</button></div>',
         '<div class="row"><div class="what">뒤집기: 바삭 루프가 돌다가 2초에 뒤집고, 0.4초 뒤 단계 톡과 함께 지글이 잦아든다'
         '(게임 순서). 철퍽은 뒤집은 뒤 {LAND}초, 게임의 착지 그림 때.</div><button data-act="flip" data-n="1">뒤집기 1</button>'
         '<button data-act="flip" data-n="2">뒤집기 2</button><button data-act="stop">멈춤</button></div>']
    if demo:
        o.append('<h2>한 판 미리 듣기</h2>')
        o.append('<div class="row">')
        o.append('<div class="id">preview/%s</div>' % demo['id'])
        o.append('<div class="what">해초전 한 판을 게임처럼 이어 붙인 흉내: 팬 들기, 톡톡 9번, 불 켜기와 지글(보들보들, 노릇노릇, '
                 '바삭바삭으로 3초마다 바뀜), 뒤집기, 썰기 3번, 접시와 김. 게임 파일이 아니라 미리 듣기용이다.</div>')
        o.append('<audio controls preload="none">'
                 '<source src="preview/%s.ogg" type="audio/ogg; codecs=opus">'
                 '<source src="preview/%s.m4a" type="audio/mp4"></audio>' % (demo['id'], demo['id']))
        o.append('<div class="meta">%.1f s.</div>'
                 % demo['duration'])
        o.append('</div>')
    for title, ids in STAGES:
        o.append('<h2>%s</h2>' % html.escape(title))
        for sid in ids:
            e = by_id.get(sid)
            if not e:
                continue
            note = LISTEN_NOTE.get(sid, '')
            o.append('<div class="row">')
            o.append('<div class="id">%s</div>' % sid)
            o.append('<div class="what">%s</div>' % html.escape(SPEC_BY_ID[sid]['ko']))
            o.append('<audio controls preload="none">'                 # 게임처럼 Opus 를 먼저, 못 읽으면 AAC
                     '<source src="cook/%s.ogg" type="audio/ogg; codecs=opus">'
                     '<source src="cook/%s.m4a" type="audio/mp4"></audio>' % (sid, sid))
            meta = '%s, BGM 대비 %d dB' % (fmt_dur(e), e['level']['rel_db'])
            if note:
                meta += '. ' + note
            o.append('<div class="meta">%s</div>' % html.escape(meta))
            o.append('</div>')
    # 출처: 이 페이지도 CC BY 소리(썰기 · 젓기)를 틀어서 그 두 줄을 글자 그대로(링크로) 싣는다. 나머지는 CREDITS.md 와 게임의 credits.html
    for spec in SOUNDS:
        if 'layers' in spec and len(spec['layers']) > 1:
            LAYERED_KEYS.update(Ly['src'] for Ly in spec['layers'])
    used = []
    for e in entries:
        for k in e['credit']:
            if k not in used:
                used.append(k)
    o.append('<h2>출처</h2>')
    o.append('<p>OpenGameArt.org 의 CC0 · CC BY 소리를 잘라 겹쳤다. 모든 출처와 바꾼 것: <a href="CREDITS.md">CREDITS.md</a> · '
             '게임의 <a href="../credits.html">만든 것들</a>.</p>')
    for k in used:
        if SOURCES[k]['license'] == 'CC0 1.0':
            continue
        t = html.escape(attribution(k))
        for u in [SOURCES[k]['page'], SOURCES[k]['license_url']] + re.findall(r'https?://[^\s,)]+', SOURCES[k]['author']):
            t = t.replace(html.escape(u), '<a href="%s" target="_blank" rel="noopener">%s</a>' % (html.escape(u), html.escape(u)), 1)
        o.append('<p class="by" lang="en">%s <span class="id">(%s)</span></p>' % (t, ', '.join(e['id'] for e in entries if k in e['credit'])))
    o.append('<script type="application/json" id="snd-data">%s</script>' % json.dumps(data, separators=(',', ':')))
    o.append('<script>%s</script>' % LISTEN_JS)
    o += ['</main>', '</body>', '</html>']
    lands = sorted({e['sync']['land_s'] for e in entries if e.get('sync')})
    o = [s.replace('{LAND}', '/'.join('%.3f' % v for v in lands) or '?') for s in o]
    with open(os.path.join(OUT, 'listen.html'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(o) + '\n')


# ----------------------------------------------------------------------------------------------------------------
# 한 판 미리 듣기 (게임 연결 전 흉내). 게임 파일이 아니다: preview/ 는 지워도 된다.
# ----------------------------------------------------------------------------------------------------------------
DEMO_ID = 'cook_demo_haechojeon'
DEMO_STEPS = [   # (초, id) 해초전 한 판: pick -> tap x 9 -> step -> 불 켜기 + 지글 0 -> 1 -> 2 -> flip -> step(quiet) -> cut x 3 -> step -> 접시
    (0.30, 'cook_pick_1')] + [(1.00 + 0.28 * i, 'cook_pat_%d' % (i % 4 + 1)) for i in range(9)] + [
    (3.75, 'cook_step'), (4.60, 'cook_heat_on_1'), (13.40, 'cook_flip_1'), (13.80, 'cook_step'),
    (15.00, 'cook_cut_1'), (15.75, 'cook_cut_2'), (16.50, 'cook_cut_3'), (17.10, 'cook_step'),
    (18.00, 'cook_plate_1'), (18.15, 'cook_steam')]
DEMO_HEAT, DEMO_QUIET, DEMO_XF, DEMO_LEN = 4.60, 13.80, 0.5, 19.40


def build_demo(masters, entries):
    """게임이 할 일을 흉내 낸 한 판: 불을 켜면 지글 0 이 1 s 페이드인, 3 s 마다 다음 굽기로 0.5 s 등전력 크로스페이드,
    뒤집은 뒤 quiet 에서 0.25 s 페이드아웃. 원샷은 정해진 시각에 그대로(게임처럼 gain 1.0). 게임 파일이 아니라 --work 폴더에."""
    E = {e['id']: e for e in entries}
    N = int(round(DEMO_LEN * SR))
    out = np.zeros(N)
    t = np.arange(N) / SR
    xf_w = lambda a: np.clip((t - a) / DEMO_XF, 0, 1) * (np.pi / 2)
    bands = [DEMO_HEAT, DEMO_HEAT + 3.0, DEMO_HEAT + 6.0]
    for b, sid in enumerate(('cook_sizzle_0', 'cook_sizzle_1', 'cook_sizzle_2')):
        x = masters[sid]
        s0, e0 = int(round(E[sid]['loop']['start'] * SR)), int(round(E[sid]['loop']['end'] * SR))
        k0 = int(round(bands[b] * SR))
        body = np.tile(x[s0:e0], N // (e0 - s0) + 2)[:N - k0]
        g = np.zeros(N)
        g[k0:] = 1.0
        if b == 0:
            r = int(round(1.0 * SR))
            g[k0:k0 + r] = ramp_cos(r, True)
        else:
            g *= np.where(t >= bands[b], np.sin(xf_w(bands[b])), 0.0)
        if b < 2:
            g *= np.cos(xf_w(bands[b + 1]))
        kq, rq = int(round(DEMO_QUIET * SR)), int(round(0.25 * SR))
        g[kq:kq + rq] *= ramp_cos(rq, False)
        g[kq + rq:] = 0.0
        out[k0:] += body * g[k0:]
    for (ts, sid) in DEMO_STEPS:
        x = masters[sid]
        k = int(round(ts * SR))
        out[k:k + len(x)] += x[:N - k]
    pk = 20 * math.log10(np.abs(out).max() + 1e-12)
    os.makedirs(os.path.join(WORK, 'preview'), exist_ok=True)
    base = os.path.join(WORK, 'preview', DEMO_ID)
    head = ['ffmpeg', '-v', 'error', '-nostdin', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-']
    tail = ['-fflags', '+bitexact', '-flags', '+bitexact', '-map_metadata', '-1']
    run(head + ['-c:a', 'libopus', '-b:a', '96k', '-vbr', 'on', '-application', 'lowdelay'] + tail + [base + '.ogg'],
        data=f32(out))                                   # 지글 루프와 같은 96k (48k 는 탁탁을 뭉갠다)
    run(head + ['-c:a', 'aac', '-aac_coder', 'fast', '-b:a', '96k', '-cutoff', '20000', '-movflags', '+faststart'] + tail
        + [base + '.m4a'], data=f32(out))
    print('  demo   %s %.1f s, peak %.1f dBFS' % (DEMO_ID, DEMO_LEN, pk), flush=True)
    return dict(id=DEMO_ID, duration=DEMO_LEN, peak_dbfs=round(pk, 1))


# ----------------------------------------------------------------------------------------------------------------
# 검사: 두 인코딩을 디코드해서 길이, 크기, 피크, 클리핑, 처음/끝 5 ms, 루프 이음새, 대역 차이를 본다
# ----------------------------------------------------------------------------------------------------------------
OCT = [125, 250, 500, 1000, 2000, 4000, 8000, 16000]


def band_db(x):
    X = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return [10 * math.log10(X[(f >= a / math.sqrt(2)) & (f < a * math.sqrt(2))].sum() + 1e-30) for a in OCT]


def lag_of(y, x):
    """디코드 y 가 마스터 x 보다 몇 샘플 늦나 (가장 큰 2048 샘플 창 근처의 상호상관)"""
    n = min(len(x), len(y))
    if n < 4096:
        return 0
    w = 2048
    c = np.concatenate([[0.0], np.cumsum(x[:n] ** 2)])
    k = int(np.argmax(c[w:] - c[:-w]))
    k = min(max(k, 400), n - w - 400)
    ref = x[k:k + w]
    seg = y[k - 400:k + w + 400]
    cc = np.correlate(seg, ref, mode='valid')
    return int(np.argmax(cc)) - 400


CRACKLE_THR = (6, 9, 12, 15)


def crackle_stats(body):
    """루프 몸통(한 바퀴)의 탁탁/튐과 크기 흔들림. 검사관과 같은 정의:
    2 kHz 위, 2 ms 창 에너지가 200 ms 이동 중앙값(몸통을 원형으로 감아서)보다 +6/+9/+12/+15 dB 넘게 솟는 곳(오르는 가장자리,
    10 ms 이상 떨어진 것)의 초당 수, 가장 큰 솟음(dB). 250 ms 크기의 중앙값 대비 표준편차와 범위, 50 ms 넓은 대역 최대."""
    from numpy.lib.stride_tricks import sliding_window_view
    X = np.fft.rfft(body)
    X[np.fft.rfftfreq(len(body), 1 / SR) < 2000] = 0              # 원형 HPF (몸통은 한 주기)
    y = np.fft.irfft(X, len(body))
    w = 96
    n = len(y) // w
    e = 10 * np.log10((y[:n * w].reshape(n, w) ** 2).mean(axis=1) + 1e-20)
    k = 100
    med = np.median(sliding_window_view(np.pad(e, (k // 2, k // 2), mode='wrap'), k)[:n], axis=1)
    rel = e - med
    dur = len(body) / SR
    rates = {}
    for thr in CRACKLE_THR:
        over = rel > thr
        cnt, last = 0, -999
        for i in range(1, n):
            if over[i] and not over[i - 1] and (i - last) * 2 >= 10:
                cnt += 1
                last = i
        rates[str(thr)] = round(cnt / dur, 2)
    w2 = int(0.25 * SR)
    m = len(body) // w2
    env = 10 * np.log10((body[:m * w2].reshape(m, w2) ** 2).mean(axis=1) + 1e-20)
    env -= np.median(env)
    w5 = int(0.05 * SR)
    m5 = len(body) // w5
    e5 = 10 * np.log10((body[:m5 * w5].reshape(m5, w5) ** 2).mean(axis=1) + 1e-20)
    return dict(crackle_per_s=rates, max_event_db=round(float(rel.max()), 1), env250_std_db=round(float(env.std()), 2),
                env250_range_db=round(float(env.max() - env.min()), 1),
                burst50_max_over_median_db=round(float(e5.max() - np.median(e5)), 1))


def family_stats(entries, masters):
    """지글 0/1/2 마스터 루프 몸통의 색·탁탁·크기 (문서에 그대로 쓰는 숫자)"""
    out = {}
    for e in entries:
        if e['id'] in ('cook_sizzle_0', 'cook_sizzle_1', 'cook_sizzle_2'):
            x = masters[e['id']]
            body = x[int(round(e['loop']['start'] * SR)):int(round(e['loop']['end'] * SR))]
            out[e['id']] = dict(colour(body), **crackle_stats(body), lufs=e['level']['measured'])
    return out if len(out) == 3 else None


def colour(x):
    X = np.abs(np.fft.rfft(x)) ** 2
    f = np.fft.rfftfreq(len(x), 1 / SR)
    tot = X.sum()
    return dict(centroid_hz=int((f * X).sum() / tot), share_above_8k=round(float(X[f >= 8000].sum() / tot), 3),
                bands_db=[round(b, 1) for b in band_db(x)])


def seam_checks(y, loop):
    s, e = int(round(loop['start'] * SR)), int(round(loop['end'] * SR))
    n = min(int(0.4 * SR), len(y) - e)
    a, b = y[s:s + n], y[e:e + n]
    err = np.sqrt(np.mean((a - b) ** 2)) / (np.sqrt(np.mean(a ** 2)) + 1e-12)
    body = y[s:e]
    d = np.abs(np.diff(body))
    jump = abs(body[0] - body[-1])
    p999 = float(np.percentile(d, 99.9))
    w = int(0.05 * SR)
    rms = lambda v: 20 * math.log10(np.sqrt(np.mean(v ** 2)) + 1e-12)
    lag = 0
    if s >= 200:
        cc = np.correlate(y[s - 200:s + 5000], y[e:e + 4800], mode='valid')
        lag = int(np.argmax(cc)) - 200
    # 실제로 도는 모양(몸통 두 번)을 이어 붙여, 이음매 양쪽 2 ms 의 8 kHz 위 에너지가 몸통 안 모든 자리 가운데 몇 % 자리인가.
    # 딸깍이면 맨 위(100 %)로 튄다. 지글·보글은 원래 튀는 소리라 99 % 아래면 내용과 같은 결로 본다.
    hf = filt(np.concatenate([body, body]), [HP(8000)])
    w2 = 96
    e2 = (hf[:len(hf) // w2 * w2].reshape(-1, w2) ** 2).mean(axis=1)
    j = len(body) // w2
    pair = np.maximum(e2[:-1], e2[1:])
    med = np.median(e2) + 1e-30
    jv = max(e2[j - 1], e2[j])
    return dict(rel_err_db=round(20 * math.log10(err + 1e-12), 1), lag_samples=lag,
                junction_hf_over_median_db=round(10 * math.log10(jv / med + 1e-30), 1),
                junction_hf_rank_pct=round(float((pair < jv).mean() * 100), 1),
                wrap_jump_over_p999=round(jump / (p999 + 1e-12), 2),
                wrap_step_ok=bool(jump <= p999 * 1.5 + 1e-4),
                level_50ms_before_end_db=round(rms(body[-w:]), 1), level_50ms_after_start_db=round(rms(body[:w]), 1))


def spectrogram(sid, ogg, m4a, label):
    png = os.path.join(CHECK, sid + '.png')
    dt = ("drawtext=text='%s':fontcolor=white:fontsize=18:x=10:y=6:box=1:boxcolor=black@0.6" % label)
    sp = 'showspectrumpic=s=900x220:legend=1:scale=log:fscale=lin:color=intensity'   # (stop= 를 주면 가짜 검은 줄이 생긴다)
    fc = ('[0:a]aformat=channel_layouts=mono,asplit=2[o1][o2];'
          '[o1]%s,%s[s1];' % (sp, dt.replace("'%s'" % label, "'%s  ogg (Opus)'" % label)) +
          '[1:a]aformat=channel_layouts=mono,%s,%s[s2];' % (sp, dt.replace("'%s'" % label, "'%s  m4a (AAC)'" % label)) +
          '[o2]showwavespic=s=1180x90:colors=white:scale=sqrt[w];'
          '[s1][s2]vstack=inputs=2[v];[w]scale=iw:ih[w2];'
          '[v]pad=iw:ih+90:0:0[vp];[vp][w2]overlay=0:H-90')
    run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-i', ogg, '-i', m4a, '-filter_complex', fc, '-frames:v', '1', png])
    return png


def run_checks(entries, masters):
    os.makedirs(CHECK, exist_ok=True)
    rep = []
    for e in entries:
        sid = e['id']
        x = masters[sid]
        r = dict(id=sid, duration=e['duration'], unit=e['level']['unit'], target=e['level']['target'],
                 master=dict(measured=e['level']['measured'], tp_dbtp=e['level']['true_peak_dbtp'],
                             first5ms_dbfs=round(20 * math.log10(np.abs(x[:240]).max() + 1e-12), 1),
                             last5ms_dbfs=round(20 * math.log10(np.abs(x[-240:]).max() + 1e-12), 1)))
        r['master']['lufs'] = round(ebur128(x)[0], 1)
        for fmt in ('ogg', 'm4a'):
            p = os.path.join(SND, sid + '.' + fmt)
            y = decode_file(p)
            n = len(x)
            yy = y[:n] if len(y) >= n else np.concatenate([y, np.zeros(n - len(y))])
            I, tp = ebur128(yy)
            meas = I if e['level']['unit'] == 'LUFS' else active_rms_db(yy)
            bm, bd = band_db(x), band_db(yy)
            dev = [round(b2 - b1, 1) for b1, b2 in zip(bm, bd)]
            # 소리가 있는 대역만 본다 (마스터에서 가장 큰 대역보다 30 dB 넘게 작은 대역은 뺌: 거기 코덱 잡음은 묻힌다)
            dev_used = [d for d, b1 in zip(dev, bm) if b1 > max(bm) - 30]
            d = dict(size_kb=round(os.path.getsize(p) / 1024, 1), decoded_s=round(len(y) / SR, 4),
                     extra_samples=len(y) - n, lag_samples=lag_of(y, x),
                     measured=round(meas, 2), delta_vs_target=round(meas - e['level']['target'], 2),
                     lufs=round(I, 1), tp_dbtp=round(tp, 1), clipped=int(np.sum(np.abs(y) >= 0.999)),
                     first5ms_dbfs=round(20 * math.log10(np.abs(y[:240]).max() + 1e-12), 1),
                     last5ms_dbfs=round(20 * math.log10(np.abs(yy[-240:]).max() + 1e-12), 1),
                     band_dev_db=dev, band_dev_max_abs=round(max(abs(v) for v in dev_used), 1))
            d['loudest_100ms_lufs'], d['loudest_400ms_lufs'] = short_loud(yy)
            if e['loop']:
                d['seam'] = seam_checks(y, e['loop'])
                s0, e0 = int(round(e['loop']['start'] * SR)), int(round(e['loop']['end'] * SR))
                d['body'] = dict(colour(y[s0:e0]), **crackle_stats(y[s0:e0]))
            if e.get('sync'):                                # 디코드한 파일에서 철퍽 봉우리(1 ms)가 몇 초에 오나
                w = SR // 1000
                a, b = int(0.20 * SR), int(0.40 * SR)
                env = (yy[a:b][:(b - a) // w * w].reshape(-1, w) ** 2).mean(axis=1)
                d['land_s'] = round((a + (int(np.argmax(env)) + 0.5) * w) / SR, 3)
            r[fmt] = d
        if e['loop']:
            s0, e0 = int(round(e['loop']['start'] * SR)), int(round(e['loop']['end'] * SR))
            r['master']['seam'] = seam_checks(x, e['loop'])
            body = x[s0:e0]
            r['body'] = dict(colour(body), **crackle_stats(body))
        else:
            r['master']['colour'] = colour(x)
        r['master']['loudest_100ms_lufs'] = e['level']['loudest_100ms_lufs']
        r['master']['loudest_400ms_lufs'] = e['level']['loudest_400ms_lufs']
        r['png'] = os.path.relpath(spectrogram(sid, os.path.join(SND, sid + '.ogg'), os.path.join(SND, sid + '.m4a'),
                                               '%s  %s %d' % (sid, e['level']['unit'], e['level']['rel_db'])), BASE)
        rep.append(r)
        print('  check  %-16s ogg %s / m4a %s' % (sid, short(r['ogg'], e), short(r['m4a'], e)), flush=True)
    # 지글 가족: 0 -> 1 -> 2 (마스터 몸통, 그리고 대부분이 받는 Opus 디코드 몸통)
    ks = ('cook_sizzle_0', 'cook_sizzle_1', 'cook_sizzle_2')
    rr = {q['id']: q for q in rep if q['id'] in ks}
    if len(rr) == 3:
        fam_rep = {}
        for src in ('master', 'ogg', 'm4a'):
            fam = {k: (rr[k]['body'] if src == 'master' else rr[k][src]['body']) for k in ks}
            ref = np.array(fam[ks[1]]['bands_db'])
            use = ref > ref.max() - 15                               # 지글을 이루는 대역만 (노릇노릇 기준 15 dB 안쪽: 2~16 kHz)
            b = {k: np.array(fam[k]['bands_db'])[use] for k in ks}
            nb = {k: b[k] - (10 * np.log10(np.sum(10 ** (b[k] / 10)))) for k in ks}
            f = dict(
                centroid_hz=[fam[k]['centroid_hz'] for k in ks],
                share_above_8k=[fam[k]['share_above_8k'] for k in ks],
                crackle_per_s={t: [fam[k]['crackle_per_s'][t] for k in ks] for t in fam[ks[0]]['crackle_per_s']},
                max_event_db=[fam[k]['max_event_db'] for k in ks],
                env250_std_db=[fam[k]['env250_std_db'] for k in ks],
                env250_range_db=[fam[k]['env250_range_db'] for k in ks],
                burst50_max_over_median_db=[fam[k]['burst50_max_over_median_db'] for k in ks],
                colour_bands_hz=[c for c, u in zip(OCT, use) if u],
                colour_max_band_diff_db={'0-1': round(float(np.abs(nb[ks[0]] - nb[ks[1]]).max()), 1),
                                         '1-2': round(float(np.abs(nb[ks[1]] - nb[ks[2]]).max()), 1)})
            f['level'] = [rr[k]['master']['measured'] if src == 'master' else rr[k][src]['measured'] for k in ks]
            f['rising'] = dict(
                level=f['level'][0] < f['level'][1] < f['level'][2],
                centroid=f['centroid_hz'][0] < f['centroid_hz'][1] < f['centroid_hz'][2],
                share_above_8k=f['share_above_8k'][0] < f['share_above_8k'][1] < f['share_above_8k'][2])
            fam_rep[src] = f
        fam_rep['chain_png'] = os.path.relpath(sizzle_chain_png(entries), BASE)
    else:
        fam_rep = None
    total = sum(os.path.getsize(os.path.join(SND, f)) for f in os.listdir(SND))
    tot_ogg = sum(os.path.getsize(os.path.join(SND, f)) for f in os.listdir(SND) if f.endswith('.ogg'))
    out_total = 0
    for root, _, fs in os.walk(OUT):
        out_total += sum(os.path.getsize(os.path.join(root, f)) for f in fs)
    summary = dict(sounds=len(entries), files=2 * len(entries), cook_kb=round(total / 1024, 1),
                   ogg_kb=round(tot_ogg / 1024, 1), m4a_kb=round((total - tot_ogg) / 1024, 1),
                   folder_kb=round(out_total / 1024, 1), sizzle_family=fam_rep)
    with open(os.path.join(CHECK, 'report.json'), 'w', encoding='utf-8') as f:
        json.dump(dict(summary=summary, sounds=rep), f, ensure_ascii=False, indent=1)
    write_report_md(summary, rep, entries)
    return summary, rep


def short(d, e):
    s = '%+.2f dB, TP %.1f, clip %d, first/last5 %.0f/%.0f, band %.1f' % (
        d['delta_vs_target'], d['tp_dbtp'], d['clipped'], d['first5ms_dbfs'], d['last5ms_dbfs'], d['band_dev_max_abs'])
    if 'seam' in d:
        s += ', seam %.1f dB lag %d step %.2f' % (d['seam']['rel_err_db'], d['seam']['lag_samples'],
                                                 d['seam']['wrap_jump_over_p999'])
    return s


def sizzle_chain_png(entries):
    """지글 0 -> 1 -> 2 를 3 s 씩, 0.5 s 등전력 크로스페이드로 이어 붙인 것(디코드한 ogg)의 스펙트로그램"""
    segs = []
    for sid in ('cook_sizzle_0', 'cook_sizzle_1', 'cook_sizzle_2'):
        e = next(q for q in entries if q['id'] == sid)
        y = decode_file(os.path.join(SND, sid + '.ogg'))
        s0, e0 = int(round(e['loop']['start'] * SR)), int(round(e['loop']['end'] * SR))
        body = y[s0:e0]
        segs.append(np.tile(body, 2)[:int(3.5 * SR)])
    F = int(0.5 * SR)
    w = np.linspace(0, np.pi / 2, F)
    out = segs[0][:int(3.0 * SR)].copy()
    for nxt in segs[1:]:
        tail = out[-F:] * np.cos(w) + nxt[:F] * np.sin(w)
        out = np.concatenate([out[:-F], tail, nxt[F:int(3.0 * SR) + F]])
    wav = os.path.join(CHECK, 'sizzle_chain_0_1_2.wav')
    run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le',
         '-fflags', '+bitexact', '-flags', '+bitexact', wav], data=f32(out))
    png = os.path.join(CHECK, 'sizzle_chain_0_1_2.png')
    run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-i', wav, '-filter_complex',
         'asplit=2[a][b];[a]showspectrumpic=s=1100x260:legend=1:scale=log:fscale=lin:color=intensity[s];'
         '[b]showwavespic=s=1380x100:colors=white:scale=sqrt[w];[s]pad=iw:ih+100:0:0[p];[p][w]overlay=0:H-100',
         '-frames:v', '1', png])
    return png


def write_report_md(summary, rep, entries):
    by_id = {e['id']: e for e in entries}
    o = ['# 부엌 소리 검사 / foley check\n',
         '두 인코딩(.ogg Opus, .m4a AAC)을 ffmpeg 로 디코드해서 잰 값. delta = 디코드 크기 - 목표(마스터와 같은 단위). '
         'TP = true peak(dBTP). first/last = 처음/끝 5 ms 최대 진폭(dBFS). band = 소리가 있는 옥타브 대역에서 마스터 대비 '
         '가장 큰 차이(dB). seam = check_loops.py 방식(루프 시작 0.4 s 와 끝 뒤 0.4 s 의 차이, dB) / 지연 샘플 / 이음새 점프 ÷ '
         '보통 샘플 간 차이의 99.9 백분위 / 이음매 2 ms 의 8 kHz 위 에너지가 몸통 안 모든 자리 중 몇 % 자리인가(딸깍이면 100 %).\n',
         '루프의 첫 값(check_loops 방식)은 넓은 대역 잡음에서 코덱이 파형을 지키지 않아 나쁘게 나온다(같은 마스터 구간을 두 번 '
         '인코딩한 차이). 칩튠 amb 루프는 -10.5 ~ -41.8 dB 였다. 이음새가 들리는지는 뒤의 세 값(지연 0, 점프 비율 1.5 미만, '
         '이음매 고음 순위 99 % 미만)으로 본다. 루프의 first/last 는 몸통 한가운데라 크다(정상).\n',
         '짧은 시간 크기(M100/M400) = K 가중 가장 큰 100 ms / 400 ms (LUFS 눈금, 마스터). 단위가 다른 소리끼리 들리는 크기를 '
         '견주는 데 쓴다. land = 뒤집기의 철퍽 봉우리(1 ms)가 디코드 파일 몇 초에 오나(게임 착지 그림 250~333 ms).\n',
         '| id | 길이 | 단위 | 목표 | ogg delta | m4a delta | M100 / M400 | TP ogg/m4a | clip | first/last ogg | band ogg/m4a | seam ogg | seam m4a | KB ogg/m4a |',
         '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|']
    for r in rep:
        e = by_id[r['id']]
        so = r['ogg'].get('seam')
        sm = r['m4a'].get('seam')
        fs = lambda s: '' if not s else '%.1f / %d / %.2f / %.0f%%' % (s['rel_err_db'], s['lag_samples'],
                                                                     s['wrap_jump_over_p999'], s['junction_hf_rank_pct'])
        mm = '%.1f / %.1f' % (r['master']['loudest_100ms_lufs'], r['master']['loudest_400ms_lufs'])
        if 'land_s' in r['ogg']:
            mm += ' (land %.3f / %.3f)' % (r['ogg']['land_s'], r['m4a']['land_s'])
        o.append('| %s | %s | %s | %.1f | %+.2f | %+.2f | %s | %.1f / %.1f | %d/%d | %.0f / %.0f | %.1f / %.1f | %s | %s | %.1f / %.1f |' % (
            r['id'], fmt_dur(e), r['unit'], r['target'], r['ogg']['delta_vs_target'], r['m4a']['delta_vs_target'], mm,
            r['ogg']['tp_dbtp'], r['m4a']['tp_dbtp'], r['ogg']['clipped'], r['m4a']['clipped'],
            r['ogg']['first5ms_dbfs'], r['ogg']['last5ms_dbfs'], r['ogg']['band_dev_max_abs'], r['m4a']['band_dev_max_abs'],
            fs(so), fs(sm), r['ogg']['size_kb'], r['m4a']['size_kb']))
    o.append('\n합계: 소리 %d개, 파일 %d개, cook/ %.1f KB (ogg %.1f + m4a %.1f), 폴더 전체 %.1f KB\n' % (
        summary['sounds'], summary['files'], summary['cook_kb'], summary['ogg_kb'], summary['m4a_kb'], summary['folder_kb']))
    fam = summary.get('sizzle_family')
    if fam:
        o.append('## 지글 가족 (0 -> 1 -> 2, 루프 몸통)\n')
        o.append('탁탁 = 2 kHz 위 2 ms 창이 200 ms 이동 중앙값보다 +N dB 솟는 곳(초당). env = 250 ms 크기의 중앙값 대비 '
                 '표준편차 / 범위. burst = 50 ms 넓은 대역 크기의 중앙값 대비 최대.\n')
        o.append('| | 크기 | 무게중심 Hz | 8 kHz 위 몫 | 탁탁 +6/+9/+12/+15 dB 초당 | 가장 큰 솟음 dB | env std / 범위 dB | burst dB | 색 차이 0-1 / 1-2 dB |')
        o.append('|---|---|---|---|---|---|---|---|---|')
        for src in ('master', 'ogg', 'm4a'):
            f = fam[src]
            crk = ' ; '.join('/'.join('%g' % f['crackle_per_s'][t][i] for t in f['crackle_per_s']) for i in range(3))
            o.append('| %s | %s%s | %s%s | %s%s | %s | %s | %s | %s | %s / %s |' % (
                src, f['level'], '' if f['rising']['level'] else ' (오르지 않음)', f['centroid_hz'],
                '' if f['rising']['centroid'] else ' (오르지 않음)', f['share_above_8k'],
                '' if f['rising']['share_above_8k'] else ' (오르지 않음)', crk, f['max_event_db'],
                ' ; '.join('%g / %g' % (a, b) for a, b in zip(f['env250_std_db'], f['env250_range_db'])),
                f['burst50_max_over_median_db'], f['colour_max_band_diff_db']['0-1'], f['colour_max_band_diff_db']['1-2']))
        o.append('\n- 이어 들은 그림: %s\n' % fam['chain_png'])
    o.append('## 판정 단계의 처리 글과 다르게 한 것\n')
    for t in DEVIATIONS:
        o.append('- ' + t)
    o.append('')
    with open(os.path.join(CHECK, 'report.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(o) + '\n')


def sha_all():
    out = {}
    for root, _, fs in os.walk(OUT):
        for f in sorted(fs):
            p = os.path.join(root, f)
            out[os.path.relpath(p, OUT)] = hashlib.sha256(open(p, 'rb').read()).hexdigest()[:16]
    return out


def main():
    cache = os.path.join(os.path.expanduser('~'), '.cache', 'ppolppol-foley')
    ap = argparse.ArgumentParser(description='뽈뽈 문어 부엌 소리 굽기 (원본 받는 법은 이 파일 머리글)')
    ap.add_argument('--raw', default=os.environ.get('FOLEY_RAW') or os.path.join(cache, 'raw'),
                    help='받은 원본 폴더 (기본: $FOLEY_RAW 또는 ~/.cache/ppolppol-foley/raw)')
    ap.add_argument('--out', default=os.path.join(REPO, 'foley'), help='굽는 곳 (기본: 저장소 foley/)')
    ap.add_argument('--work', default=None, help='검사 보고서 · 미리 듣기 (기본: --raw 옆 work/)')
    ap.add_argument('--only', default=None)
    ap.add_argument('--no-check', action='store_true')
    a = ap.parse_args()
    set_paths(a.raw, a.out, a.work or os.path.join(os.path.dirname(os.path.abspath(os.path.expanduser(a.raw))), 'work'))
    missing = [s['path'] for s in SOURCES.values() if not os.path.isfile(os.path.join(RAW, s['path']))]
    if missing:
        sys.exit('원본이 없다 (%s 아래). 이 파일 머리글의 표대로 받아 둔다:\n  %s' % (RAW, '\n  '.join(missing)))
    for p, want_sha in RAW_SHA256.items():           # 다시 받은 원본이 처음 것과 같은지 (다르면 소리도 조금 달라진다)
        f = os.path.join(RAW, p)
        if os.path.isfile(f) and hashlib.sha256(open(f, 'rb').read()).hexdigest()[:16] != want_sha:
            print('  경고: 원본이 처음 받은 것과 다르다 (sha256): ' + p, flush=True)
    os.makedirs(SND, exist_ok=True)
    os.makedirs(WORK, exist_ok=True)
    specs = SOUNDS
    if a.only:
        want = set(a.only.split(','))
        bad = want - set(SPEC_BY_ID)
        if bad:
            sys.exit('unknown id: %s' % ', '.join(sorted(bad)))
        specs = [s for s in SOUNDS if s['id'] in want]                # 단위는 파일마다 정하므로 고른 것만
    if not a.only:                                   # 이전 빌드의 남은 파일을 지운다 (우리 출력 폴더 안만)
        for d in (SND, os.path.join(WORK, 'preview')):
            if os.path.isdir(d):
                for f in os.listdir(d):
                    if f.endswith(('.ogg', '.m4a')):
                        os.remove(os.path.join(d, f))
        for f in (os.path.join(OUT, 'sha256.json'),):
            if os.path.isfile(f):
                os.remove(f)
        if os.path.isdir(CHECK):                         # 지난 빌드의 소리별 그림(빠진 소리 것 포함)도 지운다
            for f in os.listdir(CHECK):
                if f.startswith('cook_') and f.endswith('.png'):
                    os.remove(os.path.join(CHECK, f))
    entries, masters = build(specs)
    if a.only:
        entries = [e for e in entries if e['id'] in want]
    else:
        demo = build_demo(masters, entries)
        fam = family_stats(entries, masters)
        if fam:
            print('  family ' + family_text(fam), flush=True)
        write_manifest(entries, fam)
        write_credits(entries)
        write_readme(entries, demo, fam)
        write_listen(entries, None, masters)      # 미리 듣기는 --work 에 있어서 foley/listen.html 에서는 못 연다
    if not a.no_check:
        summary, _ = run_checks(entries, masters)
        print(json.dumps(summary, ensure_ascii=False))
    if not a.only:
        os.makedirs(CHECK, exist_ok=True)
        with open(os.path.join(CHECK, 'sha256.json'), 'w') as f:
            json.dump(sha_all(), f, indent=1)


if __name__ == '__main__':
    main()
