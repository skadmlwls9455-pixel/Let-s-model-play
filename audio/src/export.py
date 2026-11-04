"""
공용 내보내기 — 모든 소리가 같은 음량 기준·같은 형식·같은 매니페스트 형식으로 나간다.

음량 기준 (리서치 03·04)
  - BGM(집·장소 테마) : 통합 -20 LUFS
  - 그 밖의 소리       : rel_db = "BGM 대비 dB" 로 지정. 목표 = -20 + rel_db
      · 1초 이상 소리 → 통합 LUFS
      · 짧은 소리     → 소리가 나는 구간의 RMS(dBFS) — 중역 음에서 LUFS 와 거의 같음
  - 피크 상한: BGM -2 dBFS, 그 밖 -3 dBFS (부드러운 리미터)
  파일에 이미 '들려줄 크기'가 구워져 있다 → 게임은 gain 1.0 으로 틀고 슬라이더만 곱하면 된다.

형식: 48 kHz 모노. Ogg Opus(.ogg) + AAC(.m4a) 두 벌.
루프: 파일 = [앞 여유 lead_in 초][루프 몸통][뒤 여유 lead_out 초]
      매니페스트 loop.start / loop.end(초) 를 Web Audio AudioBufferSourceNode.loopStart/loopEnd 에 넣는다.
"""
import json
import os
import subprocess
import tempfile

import numpy as np

import chip
import render as R

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
MANIFEST_DIR = os.path.join(os.path.dirname(__file__), 'manifest.d')
BGM_LUFS = -20.0


def active_rms_db(x, thresh_db=-50):
    x = np.asarray(x).reshape(-1)
    if not len(x):
        return -120.0
    win = int(0.01 * chip.SR)
    n = len(x) // win
    if n == 0:
        return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    e = (x[:n * win].reshape(n, win) ** 2).mean(axis=1)
    db = 10 * np.log10(e + 1e-20)
    act = e[db > (db.max() + thresh_db)]
    return 10 * np.log10(act.mean() + 1e-20)


def level(st, target_db, ceiling_db=-3.0, loop=False):
    """target_db 에 맞춘다. 길면 LUFS, 짧으면 active RMS."""
    x = np.asarray(st, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    dur = x.shape[1] / chip.SR
    if dur >= 1.5:
        out, I = R.normalize(x, target_db, ceiling_db=ceiling_db)
        return out, I, 'LUFS'
    pk = np.abs(x).max() or 1.0
    x = x / pk * 0.5
    for _ in range(3):
        cur = active_rms_db(x)
        x = x * 10 ** ((target_db - cur) / 20)
        x = chip.soft_limit(x, 10 ** (ceiling_db / 20))
    return x, active_rms_db(x), 'RMS'


def trim_tail(st, thresh_db=-60, fade_ms=30):
    """뒤쪽 무음을 자르고 짧게 페이드아웃 (원샷용)"""
    x = np.asarray(st)
    if x.ndim == 1:
        x = x[None, :]
    mag = np.abs(x).max(axis=0)
    thr = mag.max() * 10 ** (thresh_db / 20)
    idx = np.where(mag > thr)[0]
    end = (idx[-1] + int(0.02 * chip.SR)) if len(idx) else x.shape[1]
    x = x[:, :min(end, x.shape[1])].copy()
    f = min(x.shape[1], int(fade_ms / 1000 * chip.SR))
    if f > 0:
        x[:, -f:] *= np.linspace(1, 0, f)
    return x


def export(st, sound_id, kind, rel_db=0.0, folder=None, loop=None, meta=None, ceiling_db=None,
           opus_kbps=None, aac_kbps=None, write=True, opus_vbr='on'):
    """
    st      : (1, n) 또는 (n,) float 배열, 48 kHz
    kind    : 'bgm' | 'place' | 'special' | 'jingle' | 'sfx' | 'amb' | 'layer'
    rel_db  : BGM 대비 dB (bgm/place/special 은 0)
    loop    : None 또는 dict(start=초, end=초)  — 파일 안의 루프 구간
    meta    : 매니페스트에 그대로 들어갈 추가 정보(trigger, bpm, key, duck_db, variants ...)
    반환    : 매니페스트 항목(dict)
    """
    folder = folder or {'bgm': 'bgm', 'place': 'place', 'special': 'bgm', 'jingle': 'jingle', 'sfx': 'sfx',
                        'amb': 'amb', 'layer': 'amb'}[kind]
    if ceiling_db is None:
        ceiling_db = -2.0 if kind in ('bgm', 'place', 'special') else -3.0
    target = BGM_LUFS + rel_db
    x = np.asarray(st, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    if x.shape[0] > 1:
        x = x.mean(axis=0, keepdims=True)
    x, measured, unit = level(x, target, ceiling_db)
    out_dir = os.path.join(ROOT, folder)
    os.makedirs(out_dir, exist_ok=True)
    base = os.path.join(out_dir, sound_id)
    files = {}
    if write:
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            tmp = f.name
        try:
            chip.write_wav(tmp, x)
            ok = opus_kbps or (48 if kind in ('bgm', 'place', 'special', 'amb', 'layer') else 64)
            ak = aac_kbps or (64 if kind in ('bgm', 'place', 'special', 'amb', 'layer') else 96)
            subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', tmp, '-ac', '1',
                            '-c:a', 'libopus', '-b:a', f'{ok}k', '-vbr', opus_vbr, '-application', 'audio',
                            base + '.ogg'],
                           check=True)
            subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', tmp, '-ac', '1',
                            '-c:a', 'aac', '-b:a', f'{ak}k', '-movflags', '+faststart', base + '.m4a'],
                           check=True)
        finally:
            os.unlink(tmp)
        files = {'ogg': f'{folder}/{sound_id}.ogg', 'm4a': f'{folder}/{sound_id}.m4a'}
    entry = dict(id=sound_id, kind=kind, files=files, duration=round(x.shape[1] / chip.SR, 4),
                 level=dict(rel_db=rel_db, target=round(target, 1), measured=round(float(measured), 1), unit=unit,
                            peak_dbfs=round(float(20 * np.log10(np.abs(x).max() + 1e-12)), 1)),
                 loop=loop)
    if meta:
        entry.update(meta)
    return entry, x


def save_manifest_part(name, entries):
    os.makedirs(MANIFEST_DIR, exist_ok=True)
    with open(os.path.join(MANIFEST_DIR, name + '.json'), 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=1)


def loop_render(song, lead_in=0.5, lead_out=1.0):
    """Song 을 루프용으로 그리고 (배열, loop dict) 반환"""
    st = song.render(loop=True, lead_in=lead_in, lead_out=lead_out)
    L = song.seconds()
    return st, dict(start=round(lead_in, 6), end=round(lead_in + L, 6))


def oneshot_render(song, tail=2.0, trim=True):
    st = song.render(loop=False, tail=tail)
    return trim_tail(st) if trim else st
