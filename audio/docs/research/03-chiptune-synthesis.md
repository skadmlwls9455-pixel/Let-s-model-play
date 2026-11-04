# 03 — Chiptune synthesis spec (NES 2A03 / GB DMG-inspired, "cozy") for 뽈뽈 문어

Scope: numbers for a Python/numpy offline renderer + web delivery. Not cycle-accurate on purpose.
Legend: **[V]** = confirmed in ≥1 cited source found this session · **[M]** = from memory / standard knowledge, not re-verified this session · **[J]** = my design judgment.
Research caveat: `nesdev.org` and `gbdev.io` could not be fetched directly (host blocked in this sandbox); their content was verified through search-engine excerpts, mirrors, and emulator source that cites them. Re-check the [M] items against those pages if exactness matters.

Frame = 1/60 s = **16.67 ms** (real NTSC 60.0988 Hz [V]). Tempo tip [J]: pick BPM so a 16th note is an integer number of frames: 16th = 900/BPM frames → **75 BPM = 12 f (200 ms)**, **90 BPM = 10 f (167 ms)**, 100 BPM = 9 f, 112.5 BPM = 8 f. (FamiTracker equivalence: tempo 150 + speed N = N frames/row [V].)

---

## 1. Channel specs

### 1.1 NES 2A03 (NTSC, fCPU = 1 789 773 Hz [V])
| Channel | Pitch formula | Range | Volume | Notes |
|---|---|---|---|---|
| Pulse 1/2 | f = fCPU / (16·(t+1)), t = 11-bit [V] | t≥8 (else muted [V]) → max **12.43 kHz**; t=2047 → min **54.6 Hz** | 4-bit (0–15) constant or envelope | duty 12.5/25/50/75%, sweep |
| Triangle | f = fCPU / (32·(t+1)) (one octave below pulse at same t [V]) | min **27.3 Hz**; max fCPU/32 ≈ 55.9 kHz (ultrasonic) [V] | **none** (on/off only via linear/length counter) [V] | 32-step 4-bit stepped wave |
| Noise | LFSR clocked at fCPU/period | 16 periods (table below) | 4-bit constant/envelope | long (32767) / short (93) mode |
| DMC | 1-bit delta at fCPU/rate | 4 181.7 Hz … 33 143.9 Hz [V] | 7-bit DAC level 0–127 | sample playback |

**Pulse duty sequences** (8-step, as on NESdev [M]; % values [V]):
`12.5%: 0 1 0 0 0 0 0 0` · `25%: 0 1 1 0 0 0 0 0` · `50%: 0 1 1 1 1 0 0 0` · `75% (=25% negated): 1 0 0 1 1 1 1 1`.
Spectrum of a pulse with duty d: harmonic n amplitude ∝ |sin(π·n·d)|/n →
- **50%**: odd harmonics only → round, hollow, "flute/clarinet" [V]. Fundamental = reference (0 dB).
- **25%**: every 4th harmonic missing; fundamental −3.0 dB vs 50% at same peak → brighter, "string/oboe-ish", the classic NES lead [V].
- **12.5%**: every 8th harmonic missing; fundamental **−8.3 dB** vs 50%, energy pushed upward → thin, nasal, piercing [V]. Most aliasing-prone.
- **75%**: same magnitude spectrum as 25% (phase-inverted) [V]; audibly identical alone [M].

**Envelope** [V]: start flag → decay level = 15, divider reload = V; each divider expiry (period **V+1 quarter-frames**) decrements decay level; loop flag → wraps 0→15; constant-volume flag → output V directly. Quarter-frame clock ≈ **240 Hz** in 4-step mode (≈192 Hz in 5-step) [M; 192 Hz figure seen in search excerpt]. Full 15→0 decay = 15·(V+1)/240 s → **V=0: 62.5 ms … V=15: 1.0 s**. Length counter/sweep are clocked at half-frame ≈ 120 Hz [M].

**Sweep** [V]: target = t ± (t >> S) (S = shift 0–7); updated every P+1 half-frames (≈ (P+1)/120 s [M]). Negate: pulse 1 adds ones'-complement (−c−1), pulse 2 two's-complement (−c) → pulse 1 sweeps down 1 unit further. Channel muted if t < 8 or target > $7FF, even when sweep is disabled. Use: SFX "bloop" rises/falls; in a cozy synth, model it as exponential pitch glide: each step multiplies period by (1 ± 2^−S).

**Triangle** [V]: sequence `15 14 13 … 1 0 0 1 2 … 14 15` (32 steps, 4-bit staircase). No volume → in music it plays at full level whenever on; the 4-bit staircase gives faint buzz/"grit" in high registers. Linear counter (7-bit, clocked at quarter frames, max 127 ≈ 0.53 s) gives note length control. Halting freezes the output at its current step (DC level) → [M] a known click/pop source; real tracks often mute by ultrasonic pitch instead (pops). Role: bass and kick. Classic trick: writing $4011 (DMC level) raises DMC DC and, via the nonlinear mixer, **lowers triangle/noise loudness** (DMC=64 → triangle ≈ −4.0 dB, computed from formula below).

**Noise** [V]: 15-bit LFSR, power-up value 1 [M]. Each clock: `fb = bit0 XOR (mode ? bit6 : bit1); reg >>= 1; reg |= fb << 14`; output = envelope volume when bit0 == 0, else 0 [M on polarity]. Long mode (mode=0) period **32 767** steps (white-ish hiss); short mode (mode=1, bit 7 of $400E) period **93** (or 31, start-state dependent) [M] → pitched, metallic buzz.
NTSC period table (CPU cycles) [V]: `4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068` (off-by-one convention differs between emulators [V]). PAL [M]: `4, 8, 14, 30, 60, 88, 118, 148, 188, 236, 354, 472, 708, 944, 1890, 3778`.
Derived (computed): LFSR clock = fCPU/period; short-mode tone ≈ clock/93:

| idx | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| clock kHz | 447 | 224 | 112 | 55.9 | 28.0 | 18.6 | 14.0 | 11.2 | 8.86 | 7.05 | 4.71 | 3.52 | 2.35 | 1.76 | 0.88 | 0.44 |
| short tone Hz | 4811 | 2406 | 1203 | 601 | 301 | 200 | 150 | 120 | 95 | 76 | 51 | 38 | 25 | 19 | 9.5 | 4.7 |
Low idx = bright hiss (hats), 5–9 = snare body, 10–15 = rumbly/crunchy.

**DMC** [V]: NTSC rate table (CPU cycles/bit) `428 380 340 320 286 254 226 214 190 160 142 128 106 84 72 54` → 4.18–33.1 kHz. [M] Each bit moves a 7-bit counter ±2 (clamped 0–127). For us: optional low-fi "woodblock/soft kick" samples; not needed for core sound.

### 1.2 NES mixer + output filters (exact)
Nonlinear mixer [V] (p1,p2,t,n ∈ 0–15, d ∈ 0–127; output 0.0–1.0):
```
pulse_out = 0                     if p1+p2 == 0 else 95.88  / (8128 / (p1 + p2) + 100)
tnd_out   = 0                     if t=n=d=0    else 159.79 / (1 / (t/8227 + n/12241 + d/22638) + 100)
out = pulse_out + tnd_out
# LUT variant [V]: pulse_table[n] = 95.52/(8128/n + 100); tnd_table[n] = 163.67/(24329/n + 100), n = 3t + 2n + d
# Linear approx [V]: pulse_out = 0.00752*(p1+p2);  tnd_out = 0.00851*t + 0.00494*n + 0.00335*d
```
Computed levels: one pulse@15 = 0.149; both pulses@15 = 0.258 (**−1.26 dB** vs linear sum → built-in "glue" compression); triangle@15 = 0.246 (peak, but triangle RMS is lower than a square's); noise@15 = 0.174; all channels max ≈ 1.000.
Output filters, NES front-loading (NTSC) [V]: **1st-order HP 90 Hz → 1st-order HP 440 Hz → 1st-order LP 14 kHz**. Famicom: only **1st-order HP 37 Hz** (+ unknown RF path) [V].
First-order coefficients @ fs = 44 100 Hz (computed; RC = 1/(2πfc), dt = 1/fs):
```
HP: y[n] = a*(y[n-1] + x[n] - x[n-1]),  a = RC/(RC+dt):  37 Hz a=0.994756 | 90 Hz a=0.987340 | 440 Hz a=0.941009
LP: y[n] = y[n-1] + α*(x[n] - y[n-1]),  α = dt/(RC+dt): 14 kHz α=0.66607 | 8 kHz α=0.53267 | 6 kHz α=0.46087
```
[J] The 440 Hz HP is what makes front-loader NES sound thin. For cozy: use the **Famicom-style 37 Hz HP (DC blocker)** + a lower LP (§3), not the 90/440 chain.

### 1.3 Game Boy DMG (for the wave + 7-bit noise flavors)
- Pulse CH1/CH2: duties 12.5/25/50/75%; f = 131072/(2048−x) Hz [M]; CH1 has sweep. Envelope: 4-bit initial volume, up/down, step every n/64 s (n=1–7) [M] → full 15-step fade **234 ms (n=1) … 1.64 s (n=7)**.
- **Wave CH3** [V]: 32 × 4-bit samples (16 bytes at FF30–FF3F, upper nibble first). Output level = right shift: mute / **100% / 50% / 25%** (only 4 coarse levels → dynamics are usually baked into the waveform). f = 65536/(2048−x) Hz [M] (32 samples per cycle). Timbre: any 4-bit single-cycle wave → sine-ish "ocarina/soft bass", rounded-square, saw "organ"; the 4-bit quantization adds a slight soft grit — this is the warmest-sounding chip voice and is a better phone-speaker bass than the NES triangle because you can add 2nd/3rd harmonics [J].
- Noise CH4 [V]: f_LFSR = 262144 / (r · 2^s) Hz (r=0 → 0.5; equivalently 524288/r/2^(s+1)); NR43 bit 3 = width: **15-bit** (hiss) or **7-bit** (127-step, tonal/metallic "chirp"); output = LFSR bit 0 (inverted).
- Mixing: linear sum of 4-bit DACs; each channel hard-routed to L, R or both (NR51); master 1–8 per side (NR50) [M]. Output HP ("capacitor") ≈ 0.999958 per 4.19 MHz cycle [M] → **≈0.99601 per sample @44.1 kHz (≈28 Hz HP)**; an emulator in search results uses 0.996 per sample [V-ish].
- Cozy 4-bit wavetables [J]: sine `w[k] = round(7.5 + 7.5*sin(2πk/32))`; "warm bass" `h = sin(θ) + 0.35 sin(2θ) + 0.15 sin(3θ)` normalized to 0–15; play bass waves at 50% level for softness.

---

## 2. Tracker idioms (numbers @ 60 Hz frames)
| Idiom | Spec | Cozy setting [J] |
|---|---|---|
| **Arpeggio 0xy** [V] | cycles base, +x, +y semitones, one step per frame → 3-note cycle = 3 f = **50 ms (20 Hz)**; 2-note `0x0` = 2 f (30 Hz). `047` major, `037` minor | Use **2 frames/step** (triad cycle 100 ms = 10 Hz) at vol 6–8/15 for "fake chord" pads; `0C0` octave shimmer for sparkle; avoid 1-f arps on loud leads (buzzy) |
| **Vibrato 4xy** [V: x=speed, y=depth, 400=off] | Units are driver-specific (FamiTracker: [M] 64-step phase, rate ≈ 60·x/64 Hz → x=5 ≈ 4.7 Hz; depth in period units, so cents vary with pitch). Specify in physical units instead | **delay 18 f (300 ms)**, fade-in 12 f (200 ms), rate **5.0 Hz**, depth **±15 cents** (±10 for low notes, ±20 on long high notes); only on notes ≥ dotted-8th |
| **Portamento 1xx/2xx/3xx** [V] | speed in period units/frame → slides faster (in semitones) at high pitch | Express as semitones/s: legato glide **40–80 ms**; grace slide from −1 or −2 st over **2–3 f (33–50 ms)** |
| **Qxy/Rxy note slide** [V] | slide up/down y semitones at speed x | ending "sigh" fall −2 st over 8–12 f on phrase ends |
| **Duty sequence per note** [V: "attack timbre" practice] | e.g. 12.5→25→50 or 50/25/12.5/25 looped animation | Lead: **25% for 2 f, then 50%** sustain (soft pluck); echo voice: 25% or 12.5% at low vol |
| **Volume macro** | 4-bit per frame | Lead: attack `6 10 12` (3 f = 50 ms) → sustain `12 11 11 10 10 9 9 8…` (−1 per ~4 f) → release `6 4 2 0` (4 f = 67 ms). Pluck/bell: `13 11 9 8 7 6 5 4 3 3 2 2 1 1 0` (~250 ms). Pad arp: `4 6 7 | 7` |
| **Echo trick** [V] | copy melody to 2nd pulse, delayed a few rows, softer, slightly detuned; or same channel re-entered 3–6 rows later at −50/−75% vol | Delay = **1/16 (10 f = 167 ms @90 BPM)** for "doubling", or **dotted-8th (30 f = 500 ms)** for a true echo; vol 5–6 when lead is 11 (≈ −6…−7 dB); +3…+5 cents detune; duty 25% |
| **Detuned double pulse (chorus)** [V] | both pulses same note, complementary detune | **±3–6 cents** (5 cents at A4 → 1.27 Hz beating); combine with different duties (50% + 25%) |
| **Triangle kick** [V: hi-pitch macro / pitch-down] | triangle pitch drops several octaves in a few frames then returns to bass note (has to interrupt the bass line) | 150 Hz → 45 Hz exponential over **3 f (50 ms)**, then bass. On phones the click carries it; keep kicks sparse |
| **Noise hi-hat** | high idx, very short | idx **0–2**, long mode, vol 5–7, decay `6 3 1 0` (**3–4 f = 50–67 ms**); open hat 8–12 f |
| **Noise snare** | mid idx | idx **5–8**, vol 7→0 over **6–10 f (100–167 ms)**; optional 1 f triangle blip (~200 Hz) at onset. Cozy "brush": idx 6, vol 4→0 over 12 f |
| **Short-mode noise** | metallic 93-step | only 1–2 f "tick"/clock SFX or water-drop accents; never sustained |

---

## 3. Making it cozy rather than harsh
Principles (sources say: lower LP cutoff, triangle/50% are mellowest, keep lead mono + delay, avoid overdone "analog warmth" [V]); specifics [J]:
1. **Duties**: lead **50%** (or 25%→50% duty sequence); 25% OK for counter-melody if LP'd; **no sustained 12.5%** (−8.3 dB fundamental, most aliasing) — only short arps/echo at ≤ 6/15. 75% = 25%.
2. **Register**: lead C4–C6 (262–1047 Hz), avoid sustained notes above E6 (≈1.3 kHz). Phone speakers roll off below ~150–300 Hz [J, typical small-speaker behavior], so a NES triangle bass at C2 (65 Hz, almost pure fundamental) vanishes on phones → write bass **C3–C4** or use a GB-style wave bass with 2nd/3rd harmonics.
3. **Envelopes**: no instant 15-attacks on leads; 2–3 f (33–50 ms) attack, 4–8 f (67–133 ms) release (also kills clicks). Peak lead volume 11–12/15, not 15.
4. **Noise**: ≤ 6/15, sparse (hat every 8th or none), prefer long mode; rain/drizzle weather can *be* the noise layer (slow random-index, vol 1–3).
5. **Filters (master)**: HP **37 Hz** 1st-order (DC block); LP 1st-order **7–8 kHz** (α≈0.53 @8 kHz) or 2nd-order Butterworth **9–10 kHz**. (NES's 14 kHz LP alone does little; the 440 Hz HP thins — skip it.)
6. **Mix**: keep the nonlinear 2A03 formula (free gentle compression); channel trims: pulse lead 0 dB, echo −7 dB, triangle −2 dB, noise −8 dB.
7. **Space**: still feels 8-bit if the space is *in-chip* (echo trick) plus a little room: reverb wet **−20 dB** (≈10%), RT60 **0.8–1.2 s**, pre-delay 15 ms, reverb return LP 5 kHz. Or tempo-synced echo: dotted-8th, feedback 20–30%, wet −15 dB, LP 3 kHz on taps. Above ~25% wet it stops reading as chip [J].
8. **Tempo/rhythm**: 72–96 BPM, swing ≤ 10%; round-style (canon) entries = delayed copies (fits the 돌림노래 brief; chip "echo" and canon are the same mechanism at different delays).
9. **Listening references** (aesthetic, not technical claims): Shovel Knight (Jake Kaufman; FamiTracker + VRC6's extra 2 pulse + saw, real-hardware-playable [V]) — dense, bright; take its melodic warmth, not its density. Pokémon R/B (Masuda, 4 GB voices [V]) town themes — 2 pulses + wave bass + light noise; pokecrystal driver exposes exactly our knobs: `duty_cycle 0–3`, `vibrato delay, extent 0–15, rate 0–15`, `note_type speed, volume 0–15, fade −7…7` [V]. PICO-8 (22 050 Hz internal synth, triangle/organ/phaser voices [V]) — Celeste Classic-style softness. Undertale/Stardew/Celeste(full) are chiptune-*adjacent* (sampled/synth instruments) [M]; useful for harmony/tempo mood, not for timbre spec.

---

## 4. Delivery for the web (2025–2026)
**Loudness**: IESD: mobile/handheld **−16 LUFS** integrated, console −24 [V]; ITU-R BS.2434: portable **−18 ±2 LKFS**, consoles −24 ±2 [V]; Sony: PS Vita −18 [V]; Bridgett: no single mobile standard, adapt −24…−16 to environment [V]. True peak: AES TD1004/TD1008 **≤ −1 dBTP** before lossy encode [V]; −2 dBTP is common extra margin [V-secondary].
Recommendation [J] (quiet, night-time, idle game): **BGM −18 LUFS-I (±1), TP ≤ −1.5 dBTP**; SFX: UI ticks peak −9…−6 dBFS, event SFX (poster hang, return) short-term ≈ −16…−14 LUFS-S, TP ≤ −1 dBTP → SFX sit 2–4 LU above BGM. Runtime: musicGain 0.8 default; optional duck BGM −3 dB for 300 ms under event SFX. Do *not* master to −14 (streaming-music level; too loud next to SFX).

**Sample rate / channels** [J]: synthesize at 4× (176.4 kHz) or 44.1 kHz + BLEP (§5), deliver **44.1 kHz** for AAC (Opus is always 48 kHz internally). 22.05 kHz saves nothing meaningful with lossy codecs (bitrate, not rate, sets size) and caps content at 11 kHz — only consider for raw WAV/PCM SFX. AudioContext often runs at 48 kHz on iOS; decodeAudioData resamples to the context rate, so store loop points in **seconds** (and samples@render-rate for provenance). **Mono** BGM (NES is mono; phone speakers ~mono) → half the bytes; stereo only if reverb/echo width is a design feature.

**Formats & iOS Safari status**:
- Ogg **Vorbis**: caniuse — iOS Safari not supported ≤17.3, partial 17.4–18.3, **supported 18.4 → 26.x** [V]. Safari 18.4 (31 Mar 2025) added **Ogg container with Opus and Vorbis** for `<audio>`/direct files on iOS/iPadOS/macOS 15.4/visionOS [V-secondary; Apple's own release-note text not retrieved]. Reports of "patchy" support and requirement to serve `audio/ogg` [V]. **`decodeAudioData()` with Ogg on iOS 18.4+/26 is not confirmed by any source found** → must device-test.
- WebM/Opus: Safari 17.4+ reported reliable for `<audio>` [V-secondary]; WebKit history shows `<audio>` support preceding `decodeAudioData` support [V].
- AAC-LC in .m4a: universal in current Safari/Chrome/Edge/Firefox [M] (Firefox relies on OS decoders; Linux needs system ffmpeg [M]).
- **Strategy [J]**: encode every asset twice — `.ogg` (Opus mono 48 kbps, or Vorbis q3 mono) + `.m4a` (AAC-LC mono 64–80 kbps). Runtime: `canPlayType('audio/ogg; codecs="opus"')` → fetch → `decodeAudioData`; on reject/throw, fall back to `.m4a`. Skip MP3 (worse quality/bit, LAME delay ≈1105 samples, gapless tag handling varies). Unlock AudioContext on first tap (iOS) [V]. iOS: Web Audio follows the ringer switch by default (`ambient`); `navigator.audioSession.type = 'playback'` (Safari 17+) overrides [V] — for a cozy companion game keep `ambient` (respects silent mode, mixes with user's podcast) unless the user opts in [J].

**Seamless looping**:
- `<audio loop>` is not gapless across browsers [V] → use Web Audio `AudioBufferSourceNode` with `loop=true`, `loopStart`, `loopEnd` (loop plays loopStart … loopEnd−1/sampleRate [V]); intro→loop handled by `start(when, 0)` with loopStart > 0.
- Encoder delay: AAC priming **2112 samples** default (Apple tools; Nero 2624), stored in `iTunSMPB`; decoders should trim but browsers differ [V]; Firefox bug reports MP3/AAC Web Audio loop breakage from encoder delay [V]. Opus pre-skip typically **312 samples** @48 kHz (opusenc), end trim via granule position [V]; browser trimming not confirmed [V-gap].
- **Robust recipe [J]**: render `intro + loop + loop + 0.5 s` with all echo/reverb running continuously; **file = intro + loop₂ (steady-state iteration incl. tails from loop₁) + 0.5–1 s guard copy of loop₂'s head**. Manifest loop points: loopStart = intro_len, loopEnd = intro_len + L. Because audio around both points is periodic, a constant decoder offset δ (untrimmed priming, ≤ ~50 ms) shifts both ends equally and the seam stays seamless. Validate in CI by decoding each encode (ffmpeg) and checking sample-domain correlation across the seam.
- Manifest example:
```json
{"id":"bgm_home_rain","bpm":90,"lufs":-18.0,"tp":-1.5,"channels":1,
 "files":{"ogg":"bgm/home_rain.ogg","m4a":"bgm/home_rain.m4a"},
 "loop":{"start":8.000000,"end":72.000000,"renderRate":44100,"startSample":352800,"endSample":3175200},
 "layers":["home_rain_base","home_rain_bells"],"tags":{"weather":"rain","time":"night"}}
```
- Weather/time variants: render as **stems of identical length/tempo/loop points** and start them at the same `ctx.currentTime` → crossfade layers (vertical remix) instead of switching songs [J].

**Size budgets** [J, computed]: Opus mono 48 kbps = **360 kB/min**; AAC mono 64 kbps = **480 kB/min**. Loops 45–90 s. First load ≤ **1 MB** audio (main theme + SFX sprite); each BGM lazy-loaded per weather/place; total BGM ≤ 5 MB per format; SFX sprite ≤ 200 kB. Decoded memory is the real mobile limit: 48 kHz mono Float32 = 187.5 KiB/s → **90 s ≈ 16.5 MiB** (stereo 33 MiB) → keep ≤ 2–3 decoded BGMs resident, release on scene change.

---

## 5. Antialiasing
- Naive pulses alias: harmonic n folds when n·f > 22.05 kHz. C6 (1046.5 Hz) 50% pulse: first folding harmonic n≈21 at **−26 dB** re fundamental; with vibrato/slides the aliases move opposite to the pitch → audibly "dirty", worst with 12.5% duty (energy in upper harmonics) [computed]. Triangle 4-bit steps and noise edges alias too.
- Real emulators avoid this with band-limited step synthesis: blargg's Blip_Buffer — waveforms specified as amplitude *changes at source-clock times*, resampled with band-limited steps + adjustable LP/HP [V]. PolyBLEP = polynomial residual added at each discontinuity, no oversampling; higher-order kernels alias less but sound duller [V].
- **Recommendation [J]** (offline numpy, cost irrelevant):
  1. Model every channel as piecewise-constant levels with **exact fractional edge times** (pulse edges, triangle step changes, LFSR updates, volume changes) — like Blip_Buffer.
  2. Render each edge with a **2-sample polyBLEP** (cheap, vectorizable) at **4× oversampling (176.4 kHz)**, then decimate with `scipy.signal.resample_poly(x, 1, 4)` (≥80 dB stopband). Residual aliasing < −60 dB in the audible band — inaudible.
  3. Simpler alternative if no scipy: per-sample exact box-integration of the pulse (area of high state within each sample interval) at 4× + FIR decimate.
  4. Noise: generate LFSR at its true clock, box-average into output samples (hiss aliasing is harmless; short-mode tones benefit from BLEP).
  5. Apply the cozy master LP (7–10 kHz) *after* decimation; it also masks residual aliasing.
  6. Verify: render a 54 Hz→4 kHz 12.5% sweep; spectrogram should show no downward-moving lines above −60 dB.

---

## Sources
- NESdev APU Mixer (formulas, LUT, linear approx, 90/440 Hz HP, 14 kHz LP, Famicom 37 Hz): https://www.nesdev.org/wiki/APU_Mixer · mirror https://nesdev-wiki.nes.science/wikipages/APU_Mixer.xhtml · emulators citing it: https://docs.rs/crate/rsemu/0.0.4/source/src/host/audio/nes.rs , https://docs.rs/crate/ludus/latest/source/src/apu.rs , MAME https://git.redump.net/mame/plain/src/devices/sound/nes_apu.cpp
- NESdev APU Pulse / Sweep / Envelope / Triangle / Noise / DMC / Frame Counter: https://nesdev.org/wiki/APU_Pulse , https://nesdev.org/wiki/APU_Sweep , https://nesdev.org/wiki/APU_Envelope , https://nesdev.org/wiki/APU_Triangle , https://nesdev.org/wiki/APU_Noise , https://nesdev.org/wiki/DMC , https://nesdev-wiki.nes.science/wikipages/APU_Frame_Counter.xhtml ; noise table in https://docs.rs/tetanes-core/0.12.2/src/tetanes_core/apu/noise.rs.html ; triangle sequence in https://docs.rs/crate/neser/latest/source/src/nes/apu/triangle.rs
- Pan Docs audio + gbdev wiki: https://gbdev.io/pandocs/Audio_details.html , https://gbdev.gg8.se/wiki/articles/Gameboy_sound_hardware , https://www.retroisle.com/others/nintendogameboy/Technical/Firmware/GBsound.php , https://aidanvidal.github.io/posts/GameBoy_Dev_APU.html
- FamiTracker effects (0xy, 1xx–3xx, 4xy, Qxy/Rxy, Pxx): https://battleofthebits.com/lyceum/View/FamiTracker+Effects+Commands ; tempo/speed: https://battleofthebits.com/academy/GroupThread/43075/Famitracker%3A+Ticks+per+frame+step%3F/ , https://zff.dev/lily-bit/famitracker-bpm , https://chipmusic.org/forums/post/47916
- Echo/detune practice: https://itch.io/profile/squiggythings , https://ddrkirby.com/articles/nes-chiptunes-unlock-everything/nes-chiptunes-unlock-everything.html , https://chipmusic.org/forums/post/148348/ ; triangle kick/noise drums: https://battleofthebits.com/lyceum/HistoryView/36 , https://lexaloffle.com/bbs/?pid=19369 ; duty animation: https://www.scribd.com/document/619757637/8-Bit-Chip-User-Manual
- Cozy/soft tone tips: https://www.audiothing.net/blog/how-to-make-a-8bit-chiptune-song/ , https://chipmusic.org/forums/post/225515/
- Pokémon driver commands: https://pret.github.io/pokecrystal/music_commands.html , https://cocalc.com/github/pret/pokered/blob/master/macros/scripts/audio.asm ; Shovel Knight: https://videogamesuncovered.com/2014/07/19/vgu-interviews-shovel-knight/2 , https://bravewave.net/album/shovel-knight-the-definitive-soundtrack/ , https://www.nintendolife.com/features/mega-man-shovel-knight-and-save-me-mr-tako-composers-on-getting-that-retro-sound ; PICO-8 22050 Hz: https://docs.rs/pixel8-runtime/latest/src/pixel8_runtime/audio.rs.html
- Loudness: https://www.audiogang.org/wp-content/uploads/2015/04/IESD-Mix-Ref-Levels-v03.02.pdf , https://www.itu.int/dms_pub/itu-r/opb/rep/R-REP-BS.2434-2018-PDF-E.pdf , https://designingsound.org/2012/07/30/video-games-and-loudness-standards-interview-with-sonys-garry-taylor/ , https://audiomediainternational.com/mobile-loudness-an-adaptive-approach/ , https://www.production-expert.com/production-expert-1/aes-update-loudness-recommendations-for-audio-only-streaming
- Browser formats: https://caniuse.com/ogg-vorbis , https://apple.gadgethacks.com/how-to/safari-18-4-hidden-web-features/ , https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes , https://github.com/Larront/grimoire/issues/244 , https://github.com/Fyrd/caniuse/issues/6805 , https://bugs.webkit.org/show_bug.cgi?id=183852 , https://frequal.com/java/OggOpusStillNotWorkingInSafari18_4.html (MediaRecorder, not playback) ; iOS audio session: https://bugs.webkit.org/show_bug.cgi?id=237322
- Gapless/encoder delay: https://developer.apple.com/library/mac/technotes/tn2258/_index.html , https://github.com/uupaa/AAC.js/wiki/EncoderDelay , https://bugzilla.mozilla.org/show_bug.cgi?id=1669166 , https://bugzilla.mozilla.org/show_bug.cgi?id=654787 , https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/loopEnd , https://code.videolan.org/videolan/vlc/-/issues/19242 (Opus pre-skip 312) ; codec quality: https://opus-codec.org/comparison/ , https://hydrogenaud.io/index.php/topic,106911.msg875036.html
- Antialiasing: Blip_Buffer https://github.com/eriser/blip-buffer , PolyBLEP https://paulbatchelor.github.io/sndkit/blep , https://mitxela.com/projects/bleps_via_state_machine , https://www.kvraudio.com/forum/viewtopic.php?p=8285261
