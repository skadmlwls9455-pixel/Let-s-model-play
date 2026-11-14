"""
렌더 도우미: 라우드니스 맞추기(ffmpeg ebur128), 이음새 검사, 인코딩(OGG Vorbis / M4A AAC / WAV).
"""
import json
import os
import re
import subprocess
import tempfile

import numpy as np

import chip


def measure(path):
    """ffmpeg ebur128 → (integrated LUFS, true peak dBTP)"""
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true',
                        '-f', 'null', '-'], capture_output=True, text=True)
    txt = r.stderr
    summ = txt[txt.rfind('Summary:'):]
    I = float(re.search(r'I:\s+(-?[\d.]+|-inf) LUFS', summ).group(1))
    m = re.search(r'Peak:\s+(-?[\d.]+|-inf) dBFS', summ)
    tp = float(m.group(1)) if m else 0.0
    return I, tp


def loudness_of(st):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    chip.write_wav(tmp, np.clip(st, -1, 1))
    try:
        return measure(tmp)
    finally:
        os.unlink(tmp)


def normalize(st, target_lufs, ceiling_db=-2.0, loop=False):
    """정적 게인으로 target LUFS 에 맞추고, 넘치는 피크만 부드럽게 누른다(샘플 단위 → 루프 이음새 안전)."""
    pk = np.abs(st).max() or 1.0
    st = st / pk * 0.5
    I, _ = loudness_of(st)
    if I == float('-inf'):
        return st, I
    for _ in range(3):
        g = 10 ** ((target_lufs - I) / 20)
        out = chip.soft_limit(st * g, 10 ** (ceiling_db / 20))
        I2, _ = loudness_of(out)
        if abs(I2 - target_lufs) < 0.3:
            return out, I2
        st = st * 10 ** ((target_lufs - I2) / 20)
        I = target_lufs
    return out, I2


def seam_report(st):
    """루프 이음새: 끝→처음 점프 크기를 곡 안의 일반적인 샘플 간 차이와 비교"""
    x = st if st.ndim == 1 else st.mean(axis=0)
    d = np.abs(np.diff(x))
    jump = abs(x[0] - x[-1])
    p99 = float(np.percentile(d, 99.9))
    return dict(seam_jump=float(jump), p999_step=p99, ok=bool(jump <= p99 * 1.5 + 1e-4))


def encode(wav, base, formats=('ogg', 'm4a'), mono=False, q_ogg=4, aac_kbps=96):
    out = {}
    ch = ['-ac', '1'] if mono else []
    if 'ogg' in formats:
        p = base + '.ogg'
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', wav, *ch,
                        '-c:a', 'libvorbis', '-q:a', str(q_ogg), p], check=True)
        out['ogg'] = p
    if 'm4a' in formats:
        p = base + '.m4a'
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', wav, *ch,
                        '-c:a', 'aac', '-b:a', f'{aac_kbps}k', '-movflags', '+faststart', p], check=True)
        out['m4a'] = p
    if 'mp3' in formats:
        p = base + '.mp3'
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', wav, *ch,
                        '-c:a', 'libmp3lame', '-q:a', '4', p], check=True)
        out['mp3'] = p
    return out
