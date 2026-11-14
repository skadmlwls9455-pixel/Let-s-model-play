# 사진 여러 장을 한 장으로: python3 sheet.py out.png cols scale a.png b.png ...
import sys
from PIL import Image
out, cols, sc = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
ims = [Image.open(p).convert('RGB') for p in sys.argv[4:]]
w, h = int(ims[0].width * sc), int(ims[0].height * sc)
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * w, rows * h), (255, 255, 255))
for i, im in enumerate(ims):
    S.paste(im.resize((w, h), Image.NEAREST), ((i % cols) * w, (i // cols) * h))
S.save(out, optimize=True)
