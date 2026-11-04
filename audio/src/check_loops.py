"""인코딩된 루프 파일 검사: 디코드 → loop.start/end 구간 앞뒤가 이어지는지(뒤 여유 = 루프 처음 복사본)"""
import json, os, subprocess, sys
import numpy as np
ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))

def decode(path, sr=48000):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '1',
                        '-ar', str(sr), '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32)

def check(entry, fmt):
    x = decode(os.path.join(ROOT, entry['files'][fmt]))
    s, e = int(round(entry['loop']['start'] * 48000)), int(round(entry['loop']['end'] * 48000))
    n = min(int(0.4 * 48000), len(x) - e)
    a, b = x[s:s + n], x[e:e + n]
    err = np.sqrt(np.mean((a - b) ** 2)) / (np.sqrt(np.mean(a ** 2)) + 1e-9)
    # 지연 추정(패딩이 안 지워졌는지)
    lag = 0
    if len(x) > 0:
        c = np.correlate(x[s:s + 4800], x[s - 200:s + 5000], mode='valid')
        lag = int(np.argmax(c)) - 200
    return dict(fmt=fmt, decoded_len=round(len(x) / 48000, 4), file_dur=entry['duration'],
                rel_err_db=round(20 * np.log10(err + 1e-12), 1), lag_samples=lag)

if __name__ == '__main__':
    parts = sys.argv[1:] or ['bgm']
    for part in parts:
        for en in json.load(open(os.path.join(ROOT, 'src', 'manifest.d', part + '.json'), encoding='utf-8')):
            if en.get('loop'):
                for fmt in ('ogg', 'm4a'):
                    print(en['id'], check(en, fmt))
