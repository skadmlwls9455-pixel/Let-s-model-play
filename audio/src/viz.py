"""스펙트로그램·파형 PNG — 들을 수 없는 검수자가 눈으로 확인하는 용도(PIL만 사용)."""
import numpy as np
from PIL import Image, ImageDraw

import chip


def spectrogram_png(x, path, sr=chip.SR, width=1200, height=360, fmax=8000, title=''):
    x = np.asarray(x)
    if x.ndim > 1:
        x = x.mean(axis=0)
    nfft = 2048
    hop = max(256, len(x) // width)
    frames = max(1, (len(x) - nfft) // hop)
    win = np.hanning(nfft)
    idx = np.arange(nfft)[None, :] + hop * np.arange(frames)[:, None]
    S = np.abs(np.fft.rfft(x[idx] * win, axis=1))
    S = 20 * np.log10(S + 1e-9)
    kmax = int(fmax / (sr / nfft))
    S = S[:, :kmax].T[::-1]
    S = np.clip((S - (S.max() - 80)) / 80, 0, 1)
    img = (S * 255).astype(np.uint8)
    im = Image.fromarray(img).resize((width, height))
    # 파형 띠
    wav_h = 80
    canvas = Image.new('RGB', (width, height + wav_h + 18), (16, 18, 28))
    pal = np.zeros((256, 3), np.uint8)
    t = np.linspace(0, 1, 256)
    pal[:, 0] = (255 * np.clip(t * 1.6, 0, 1)).astype(np.uint8)
    pal[:, 1] = (255 * np.clip(t * 1.2 - 0.3, 0, 1)).astype(np.uint8)
    pal[:, 2] = (255 * np.clip(0.4 + t * 0.4 - t * t * 0.5, 0, 1)).astype(np.uint8)
    rgb = Image.fromarray(pal[np.asarray(im)])
    canvas.paste(rgb, (0, 18))
    d = ImageDraw.Draw(canvas)
    d.text((4, 2), title, fill=(240, 200, 120))
    seg = len(x) // width
    for i in range(width):
        c = x[i * seg:(i + 1) * seg]
        if len(c) == 0:
            continue
        a, b = c.min(), c.max()
        y0 = height + 18 + wav_h // 2
        d.line([(i, y0 - int(b * wav_h / 2)), (i, y0 - int(a * wav_h / 2))], fill=(232, 70, 60))
    canvas.save(path)
