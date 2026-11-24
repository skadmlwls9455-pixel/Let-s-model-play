# 갈래 W 다섯째 바퀴: cam-probe 결과 → 흔들림 수치.  python3 cam-stats.py before.json after.json
import json, sys
def stats(rows):
    mv = [i for i, r in enumerate(rows) if r['moving']]
    if not mv: return None
    a, b = mv[0], len(rows)
    pl = [r['pl'] for r in rows[a:b]]; cam = [r['cam'] for r in rows[a:b]]; pan = [r['pan'] for r in rows[a:b]]
    # 캐릭터 화면 떨림: 그려진 화면 자리가 프레임마다 바뀐 칸 수 합 · 방향이 뒤집힌 횟수 (앞뒤로 떨기)
    dpl = [(pl[i+1][0]-pl[i][0], pl[i+1][1]-pl[i][1]) for i in range(len(pl)-1)]
    jit = sum(abs(x)+abs(y) for x, y in dpl)
    flips = sum(1 for k in (0, 1) for i in range(len(dpl)-1) if dpl[i][k]*dpl[i+1][k] < 0)
    # 카메라 매끄러움: 반올림 전 밀기의 2차 차분 (아트px/프레임²) 최대 · 카메라 속도 방향 뒤집힘
    acc = max([abs(pan[i+1][k]-2*pan[i][k]+pan[i-1][k]) for k in (0, 1) for i in range(1, len(pan)-1)] or [0])
    dc = [(cam[i+1][0]-cam[i][0], cam[i+1][1]-cam[i][1]) for i in range(len(cam)-1)]
    sv = lambda x: (x > 0) - (x < 0)
    rev = 0
    for k in (0, 1):
        last = 0
        for d in dc:
            s = sv(round(d[k], 3))
            if s and last and s != last: rev += 1
            if s: last = s
    def quick(seq):
        m = 0
        for k in (0, 1):
            ls, lf = 0, -99
            for i in range(1, len(seq)):
                d = seq[i][k] - seq[i-1][k]; s_ = 1 if d > 0.5 else -1 if d < -0.5 else 0
                if not s_: continue
                if ls and s_ != ls and i - lf <= 4: m += 1
                ls, lf = s_, i
        return m
    qpl, qcam = quick(pl), quick(cam)
    big = max([max(abs(x), abs(y)) for x, y in dc] or [0])
    spread = [max(p[k] for p in pl) - min(p[k] for p in pl) for k in (0, 1)]
    return dict(frames=len(pl), plShake=qpl, groundShake=qcam, plJitterPx=round(jit, 1), plFlips=flips, camAccMax=round(acc, 2), camReversals=rev, camMaxStep=round(big, 2), plSpread=[round(x, 1) for x in spread])
out = {}
for fn in sys.argv[1:]:
    d = json.load(open(fn)); out[fn] = {}
    for m, R in d.items():
        for k, rows in R.items():
            out[fn][m + ' ' + k] = stats(rows)
keys = list(out[sys.argv[1]].keys())
print('%-34s %s' % ('scenario', ' | '.join(sys.argv[1:])))
for k in keys:
    print(k)
    for fn in sys.argv[1:]: print('   ', fn.split('/')[-1], out[fn].get(k))
