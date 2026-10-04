"""music.py: the score for "Twelve Worlds", synthesised from nothing but
numpy and the SLUMBR sky stem. 120 BPM in D minor, on the same beat map as
reel.js, so every hit lands on its cut. Writes score.wav (48 kHz stereo)."""
import subprocess
import wave
import numpy as np

SR = 48000
SPB = 0.5
DUR = 88.0
N = int(SR * DUR)
rng = np.random.default_rng(1207)

def at(b):
    return int(round(b * SPB * SR))

def hz(note):
    names = {'C': -9, 'C#': -8, 'Db': -8, 'D': -7, 'D#': -6, 'Eb': -6, 'E': -5, 'F': -4, 'F#': -3, 'Gb': -3,
             'G': -2, 'G#': -1, 'Ab': -1, 'A': 0, 'A#': 1, 'Bb': 1, 'B': 2}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + (o - 4) * 12) / 12)

class Bus:
    def __init__(self):
        self.l = np.zeros(N)
        self.r = np.zeros(N)
    def add(self, x, b=None, i0=None, pan=0.0, gain=1.0):
        i0 = at(b) if i0 is None else i0
        if i0 >= N:
            return
        x = x[: N - i0] * gain
        a = (pan + 1) * np.pi / 4
        self.l[i0:i0 + len(x)] += x * np.cos(a)
        self.r[i0:i0 + len(x)] += x * np.sin(a)

drums, bass, kal, pad, fx, sub = Bus(), Bus(), Bus(), Bus(), Bus(), Bus()

def tt(sec):
    return np.arange(int(sec * SR)) / SR

def fftfilter(x, lo=None, hi=None, edge=0.25):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo:
        m *= np.clip((np.log2(np.maximum(f, 1)) - np.log2(lo * (1 - edge))) / np.log2(1 / (1 - edge)), 0, 1)
    if hi:
        m *= np.clip((np.log2(hi * (1 + edge)) - np.log2(np.maximum(f, 1))) / np.log2(1 + edge), 0, 1)
    return np.fft.irfft(X * m, len(x))

def noise(sec):
    return rng.standard_normal(int(sec * SR))

def env_ad(t, a, d):
    return np.minimum(t / max(a, 1e-4), 1.0) * np.exp(-np.maximum(t - a, 0) * d)

# ---------- instruments ----------
def kick(amp=1.0):
    t = tt(0.55)
    f = 44 + 110 * np.exp(-t * 30)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(t, 0.002, 6.5)
    click = fftfilter(noise(0.55), 1800, 9000) * np.exp(-t * 700) * 0.35
    return (body + click) * amp

def tom(freq, amp=1.0, dec=7.0):
    t = tt(0.8)
    f = freq * (1 + 0.6 * np.exp(-t * 26))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(t, 0.002, dec)
    skin = fftfilter(noise(0.8), 200, 2400) * np.exp(-t * 40) * 0.2
    return (body + skin) * amp

def clap(amp=1.0):
    t = tt(0.4)
    n = fftfilter(noise(0.4), 900, 4200)
    e = np.zeros_like(t)
    for d in (0.0, 0.011, 0.023):
        e += np.where(t >= d, np.exp(-(t - d) * 160), 0)
    e += np.where(t >= 0.03, np.exp(-(t - 0.03) * 16) * 0.35, 0)
    return n * e * amp * 0.9

def hat(amp=1.0, open_=False):
    t = tt(0.35 if open_ else 0.08)
    return fftfilter(noise(len(t) / SR), 6500, 16000) * np.exp(-t * (14 if open_ else 75)) * amp

def crash(amp=1.0):
    t = tt(2.6)
    return fftfilter(noise(2.6), 3500, 16000) * env_ad(t, 0.004, 1.9) * amp

def bass_note(freq, sec, amp=1.0, bright=1.0):
    t = tt(sec + 0.12)
    out = np.zeros_like(t)
    for k in range(1, 14):
        if freq * k > 6000:
            break
        out += np.sin(2 * np.pi * freq * k * t) / k * np.exp(-t * k * 2.2 / bright)
    out += np.sin(2 * np.pi * freq * t) * 0.8
    e = np.minimum(t / 0.006, 1) * np.where(t < sec, 1.0, np.exp(-(t - sec) * 30))
    return np.tanh(out * e * 0.9) * amp

def kalimba(freq, amp=1.0, dec=1.6):
    t = tt(dec * 2.4)
    tone = np.sin(2 * np.pi * freq * t) * np.exp(-t * (2.6 / dec))
    tone += 0.32 * np.sin(2 * np.pi * freq * 5.93 * t) * np.exp(-t * 26)
    tone += 0.12 * np.sin(2 * np.pi * freq * 2.0 * t + 0.4) * np.exp(-t * 7)
    tine = fftfilter(noise(len(t) / SR), 2000, 9000) * np.exp(-t * 900) * 0.25
    return (tone + tine) * np.minimum(t / 0.0015, 1) * amp

def bell(freq, amp=1.0):
    t = tt(3.0)
    out = np.zeros_like(t)
    for ratio, a, d in ((1, 1, 1.4), (2.76, 0.45, 3.2), (5.4, 0.25, 6), (8.93, 0.12, 9)):
        out += a * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t * d)
    return out * np.minimum(t / 0.002, 1) * amp

def boom(amp=1.0, length=2.4):
    t = tt(length)
    f = 26 + 38 * np.exp(-t * 2.2)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(t, 0.004, 1.4)
    n = fftfilter(noise(length), 30, 900) * env_ad(t, 0.002, 3.4) * 0.6
    return np.tanh((s + n) * 1.3) * amp

def braaam(amp=1.0, root='D1', length=3.2):
    t = tt(length)
    out = np.zeros_like(t)
    for note, a in ((root, 1.0), (root[:-1] + str(int(root[-1]) + 1), 0.7), ('A' + str(int(root[-1]) + 1), 0.5)):
        for det in (-0.35, 0.0, 0.4):
            f0 = hz(note) * 2 ** (det / 12 / 4)
            ph = rng.random() * 6.28
            for k in range(1, 26):
                if f0 * k > 5000:
                    break
                # the filter opens over the first second, then slowly closes
                bright = 1 + 9 * np.clip(t / 0.9, 0, 1) * np.exp(-t * 0.5)
                out += a / k * np.sin(2 * np.pi * f0 * k * t + ph * k) * np.exp(-k / bright)
    e = env_ad(t, 0.05, 0.75)
    return np.tanh(out * e * 0.18) * amp

def riser(sec, amp=1.0, lo=250, hi=7000):
    n = noise(sec)
    hop, win = 1024, 2048
    out = np.zeros(len(n) + win)
    w = np.hanning(win)
    f = np.fft.rfftfreq(win, 1 / SR)
    frames = (len(n) - win) // hop + 1
    for i in range(max(frames, 1)):
        k = i / max(frames - 1, 1)
        fc = lo * (hi / lo) ** (k ** 1.6)
        seg_ = n[i * hop: i * hop + win]
        if len(seg_) < win:
            break
        X = np.fft.rfft(seg_ * w)
        m = np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / 0.7) ** 2)
        out[i * hop: i * hop + win] += np.fft.irfft(X * m, win)
    out = out[: len(n)]
    t = tt(sec)
    tone = np.sin(2 * np.pi * np.cumsum(180 * (6.5 ** ((t / sec) ** 1.8))) / SR) * 0.18
    e = (t / sec) ** 2.2
    return (out * 0.55 + tone) * e * amp

def suck(sec, amp=1.0):
    t = tt(sec)
    n = fftfilter(noise(sec), 400, 9000)
    return n * (t / sec) ** 4 * amp

def whoosh(sec, amp=1.0):
    t = tt(sec)
    k = t / sec
    return fftfilter(noise(sec), 300, 5000) * np.sin(np.pi * k) ** 2 * amp

def tick(amp=1.0, freq=2600):
    t = tt(0.08)
    return (np.sin(2 * np.pi * freq * t) * np.exp(-t * 90) + fftfilter(noise(0.08), 4000, 12000) * np.exp(-t * 400) * 0.4) * amp

def heartbeat(amp=1.0):
    t = tt(0.9)
    def thump(d, a):
        tt_ = np.maximum(t - d, 0)
        f = 48 + 30 * np.exp(-tt_ * 25)
        return np.where(t >= d, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt_ * 11) * a, 0)
    return np.tanh((thump(0, 1) + thump(0.3, 0.7)) * 1.6) * amp

def pad_chord(notes, sec, amp=1.0, att=0.6):
    t = tt(sec + 1.2)
    out = np.zeros_like(t)
    for nm in notes:
        for det in (-0.12, 0.0, 0.13):
            f0 = hz(nm) * 2 ** (det / 12)
            for k in range(1, 9):
                out += np.sin(2 * np.pi * f0 * k * t + rng.random() * 6.28) / (k ** 1.6)
    e = np.minimum(t / att, 1) * np.where(t < sec, 1.0, np.exp(-(t - sec) * 3))
    return out * e * amp / (len(notes) * 3)

# ---------- the arrangement ----------
# drone and air under the summoning and the council
t_all = np.arange(N) / SR
drone = (np.sin(2 * np.pi * hz('D1') * t_all) * 0.6 + np.sin(2 * np.pi * hz('D2') * t_all + 0.3) * 0.3
         + np.sin(2 * np.pi * hz('A2') * t_all) * 0.08 * (1 + 0.5 * np.sin(2 * np.pi * 0.11 * t_all)))
dmask = np.clip(t_all / 4, 0, 1) * np.where(t_all < 12.0, 1.0, np.clip((12.5 - t_all) / 0.5, 0, 1))
dmask += np.clip((t_all - 52) / 2, 0, 1) * np.clip((62 - t_all) / 1, 0, 1) * 0.7     # under the writer
dmask += np.clip((t_all - 80.2) / 0.3, 0, 1) * np.clip((87 - t_all) / 4, 0, 1)       # under the mark
sub.add(drone * dmask * 0.26, i0=0)

# the SLUMBR sky stem as the room's air
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', '/home/user/portfolio/audio/stems/sky4.ogg', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                     capture_output=True, check=True).stdout
sky = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
reps = int(np.ceil(N / len(sky))) + 1
sky = np.tile(sky, (reps, 1))[:N]
skymask = (np.clip(t_all / 3, 0, 1) * np.clip((12.4 - t_all) / 1.2, 0, 1) * 0.9
           + np.clip((t_all - 36) / 1.5, 0, 1) * np.clip((62 - t_all) / 1.5, 0, 1) * 0.55
           + np.clip((t_all - 80) / 0.5, 0, 1) * np.clip((87.5 - t_all) / 4, 0, 1) * 0.8)
skyl = sky[:, 0] * skymask
skyr = sky[:, 1] * skymask
pk = max(np.abs(skyl).max(), np.abs(skyr).max(), 1e-6)
pad.l += skyl / pk * 0.13
pad.r += skyr / pk * 0.13

# the summoning: a heartbeat, five moons, a swell
for b in range(2, 16, 2):
    sub.add(heartbeat(0.45 + 0.4 * (b / 16)), b)
for i, nm in enumerate(['D5', 'F5', 'G5', 'A5', 'C6']):
    kal.add(kalimba(hz(nm), 0.55, 2.2), 12 + i * 0.5, pan=-0.5 + i * 0.25)
fx.add(bell(hz('D6'), 0.18), 10.6, pan=0.2)
fx.add(riser(2.0, 0.35, 300, 3000), 12)

# the council: tribal toms gathering, then the eyes
TOMS = [hz('D2') * 0.75, hz('A2') * 0.5, hz('D3') * 0.5]
for bar in range(4):
    b0 = 16 + bar * 2
    for off, k, a in ((0, 0, 1), (0.75, 1, 0.6), (1.0, 0, 0.8), (1.5, 2, 0.6), (1.75, 1, 0.7)):
        drums.add(tom(TOMS[k], (0.35 + bar * 0.15) * a), b0 + off, pan=(k - 1) * 0.35)
fx.add(boom(0.5, 1.6), 22)
fx.add(riser(2.0, 0.9), 22)
fx.add(suck(0.5, 0.7), 23.0)

def hit(b, big=1.0, root='D1'):
    fx.add(boom(1.0 * big), b)
    fx.add(braaam(0.9 * big, root), b)
    drums.add(crash(0.5 * big), b, pan=0.15)
    drums.add(kick(1.0 * big), b)

def groove(b0, b1, intensity=1.0, kal_oct=5, four=False, kal_from=None):
    """the drive: syncopated kick, claps on two and four, sixteenth hats,
    the bass ostinato, and the kalimba hook over the top"""
    A = ['D2', 'D2', 'D3', 'D2', 'F2', 'D2', 'G2', 'A2']
    Bp = ['D2', 'D2', 'D3', 'D2', 'C3', 'A2', 'G2', 'F2']
    HOOK = [('D', 0), ('A', -1), ('F', 0), ('A', -1), ('D', 0), ('A', -1), ('G', 0), ('A', -1),
            ('C', 1), ('A', -1), ('F', 0), ('A', -1), ('E', 0), ('C', 0), ('D', 0), ('A', -1)]
    bar = 0
    b = b0
    while b < b1 - 1e-6:
        kicks = (0, 1, 2, 3, 3.5) if four else (0, 0.75, 2, 2.5)
        for o in kicks:
            if b + o < b1:
                drums.add(kick(0.95 * intensity), b + o)
        for o in (1, 3):
            if b + o < b1:
                drums.add(clap(0.55 * intensity), b + o, pan=0.05)
        for i in range(16):
            o = i * 0.25
            if b + o < b1:
                acc = 1.0 if i % 4 == 2 else 0.55 if i % 2 == 0 else 0.35
                drums.add(hat(0.22 * acc * intensity, open_=(i == 14)), b + o, pan=0.3 if i % 2 else -0.2)
        if bar % 4 == 3:
            for j, o in enumerate((3, 3.25, 3.5, 3.75)):
                drums.add(tom(TOMS[2 - min(j, 2)] * (1.15 - j * 0.07), 0.55 * intensity), b + o, pan=-0.4 + j * 0.25)
        notes = A if bar % 2 == 0 else Bp
        for i, nm in enumerate(notes):
            o = i * 0.5
            if b + o < b1:
                bass.add(bass_note(hz(nm), 0.2, 0.42 * intensity), b + o)
        if kal_from is not None and b >= kal_from:
            for i in range(8):
                o = i * 0.5
                nm, oc = HOOK[(bar % 2) * 8 + i]
                if b + o < b1:
                    kal.add(kalimba(hz(f'{nm}{kal_oct + oc}'), 0.3 * intensity, 1.1), b + o, pan=-0.35 if i % 2 else 0.35)
        bar += 1
        b += 4

# i · human being
hit(24, 1.0)
groove(24, 56, 1.0, 5, kal_from=40)
for b in (36, 46, 47):
    fx.add(tick(0.25, 3200), b)
# the dust wall: a roll gathering, the bass on its root
for i in range(16):
    drums.add(tom(TOMS[i % 3] * 1.1, 0.25 + i * 0.04), 56 + i * 0.25, pan=-0.3 + (i % 3) * 0.3)
bass.add(bass_note(hz('D1'), 2.0, 0.6, 0.6), 56)
fx.add(riser(2.0, 0.9), 58)
fx.add(suck(0.45, 0.6), 59.1)

# twelve worlds: a tick for every tile, a lighter pulse
fx.add(boom(0.55, 1.8), 60)
drums.add(crash(0.3), 60)
for k in range(12):
    fx.add(tick(0.3, 2200 + (k % 4) * 260), 60 + k * 0.25, pan=-0.6 + (k % 4) * 0.4)
for b in np.arange(60, 68, 0.5):
    bass.add(bass_note(hz('D2'), 0.2, 0.28), b)
    drums.add(hat(0.12), b + 0.25, pan=0.25)
fx.add(boom(0.4, 1.4), 64)
kal.add(kalimba(hz('A4'), 0.35, 2.0), 64, pan=-0.2)
kal.add(kalimba(hz('D5'), 0.35, 2.0), 65.2, pan=0.2)
pad.add(pad_chord(['D3', 'F3', 'A3', 'C4'], 4.0, 0.5, 1.2), 64)
fx.add(whoosh(2.0, 0.5), 70)
fx.add(suck(0.6, 0.5), 71.4)

# ii · human doing: half time, a progression with weight, the hook slowed
fx.add(boom(0.55, 2.0), 72)
drums.add(crash(0.25), 72)
PROG = [(['D3', 'F3', 'A3', 'E4'], 'D2'), (['Bb2', 'D3', 'F3', 'C4'], 'Bb1'), (['F3', 'A3', 'C4', 'G4'], 'F2'), (['C3', 'E3', 'G3', 'D4'], 'C2')]
for bar in range(7):
    b0 = 72 + bar * 4
    chord, root = PROG[bar % 4]
    pad.add(pad_chord(chord, 2.0, 0.55, 0.4), b0)
    bass.add(bass_note(hz(root), 1.8, 0.45, 0.5), b0)
    if b0 < 100:
        drums.add(kick(0.75), b0)
        drums.add(kick(0.4), b0 + 1.5)
        drums.add(clap(0.5), b0 + 2)
        for i in range(8):
            drums.add(hat(0.1 * (1.0 if i % 2 == 0 else 0.6)), b0 + i * 0.5, pan=0.3)
    for i, nm in enumerate(chord[1:] + chord[2:3]):
        kal.add(kalimba(hz(nm) * 2, 0.16, 1.4), b0 + 0.5 + i * 0.75, pan=-0.3 + i * 0.2)
fx.add(whoosh(2.0, 0.4), 102)

# iii · human thinking: the breakdown, a note for every headline
MEL = ['A4', 'D5', 'F5', 'E5', 'D5', 'A4', 'C5', 'D5', 'F5', 'A5']
for i, nm in enumerate(MEL):
    b = 105.5 + i * 0.95
    kal.add(kalimba(hz(nm), 0.4, 1.8), b, pan=-0.4 + (i % 5) * 0.2)
    fx.add(tick(0.12, 4200), b)
for b in range(104, 124, 2):
    sub.add(heartbeat(0.2), b)
pad.add(pad_chord(['D3', 'A3', 'C4', 'F4'], 9.0, 0.22, 2.0), 104)
fx.add(boom(0.35, 1.5), 115.8)
fx.add(riser(2.0, 0.7), 120)
fx.add(suck(0.5, 0.5), 123.0)

# iv · the fourth door: the pulse quickens, a bell for every sigil, the roll
fx.add(boom(0.6, 1.8), 124)
for i, nm in enumerate(['A5', 'C6', 'D6', 'F6', 'G6']):
    fx.add(bell(hz(nm), 0.22), 124.2 + i * 0.5, pan=-0.6 + i * 0.3)
for b in np.arange(124, 136, 0.5):
    k = (b - 124) / 12
    bass.add(bass_note(hz('D2'), 0.22, 0.25 + 0.3 * k, 0.6 + k), b)
    drums.add(hat(0.08 + 0.18 * k), b + 0.25, pan=0.3)
    if b >= 128:
        drums.add(kick(0.5 + 0.4 * k), b) if (b * 2) % 2 == 0 else None
for b in np.arange(132, 134, 0.5):
    drums.add(clap(0.3), b)
for b in np.arange(134, 135, 0.25):
    drums.add(clap(0.38), b)
for b in np.arange(135, 135.75, 0.125):
    drums.add(clap(0.45), b)
fx.add(riser(4.0, 1.0), 128)
fx.add(suck(0.5, 0.8), 135.0)

# the finale: everything, harder
hit(136, 1.15)
groove(136, 154, 1.1, 6, four=True, kal_from=136)
fx.add(braaam(0.55, 'D1', 2.0), 144)
fx.add(braaam(0.55, 'F1', 2.0), 152)
fx.add(boom(0.5, 1.5), 152)
for b in (140, 148):
    fx.add(tick(0.3, 3400), b)
# the sand: the floor drops out, tension, then nothing
bass.add(bass_note(hz('D1'), 3.6, 0.55, 0.5), 154)
pad.add(pad_chord(['D3', 'F3', 'A3', 'D4'], 3.4, 0.5, 0.3), 154)
fx.add(riser(1.8, 0.9, 400, 9000), 154.2)
fx.add(suck(0.55, 0.9), 156.5)

# the mark
hit(160, 1.0)
for nm in ('D5', 'F5', 'A5'):
    kal.add(kalimba(hz(nm), 0.35, 3.0), 160, pan=0.0)
pad.add(pad_chord(['D3', 'F3', 'A3', 'C4', 'E4'], 10.0, 0.4, 1.5), 160.5)
for b, nm in ((162, 'A4'), (163, 'D5'), (164, 'F5'), (166, 'E5'), (168, 'D5')):
    kal.add(kalimba(hz(nm), 0.34, 2.6), b, pan=-0.2 + (b % 3) * 0.2)

# ---------- the mix ----------
def ir(sec=2.8, pre=0.02, bright=6000):
    t = tt(sec)
    e = np.exp(-t * 6.9 / sec)
    l = fftfilter(rng.standard_normal(len(t)), 120, bright) * e
    r = fftfilter(rng.standard_normal(len(t)), 120, bright) * e
    z = np.zeros(int(pre * SR))
    return np.concatenate([z, l]), np.concatenate([z, r])

def convolve(x, h):
    n = len(x) + len(h) - 1
    nf = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(h, nf), nf)[:len(x)]
    return y

# the kick ducks the bass and the pads, the sidechain pump
duck = np.ones(N)
kt = np.zeros(N)
for b in [x for x in np.arange(24, 56, 1.0)] + [x for x in np.arange(136, 154, 1.0)]:
    i0 = at(b)
    L_ = min(int(0.3 * SR), N - i0)
    kt[i0:i0 + L_] = np.maximum(kt[i0:i0 + L_], np.exp(-np.arange(L_) / SR * 14))
duck -= 0.45 * kt

irl, irr = ir()
send = {'drums': 0.12, 'bass': 0.0, 'kal': 0.45, 'pad': 0.3, 'fx': 0.25, 'sub': 0.0}
gain = {'drums': 1.05, 'bass': 0.85, 'kal': 0.8, 'pad': 0.7, 'fx': 0.85, 'sub': 0.8}
mixl = np.zeros(N); mixr = np.zeros(N); revl = np.zeros(N); revr = np.zeros(N)
for name, bus in (('drums', drums), ('bass', bass), ('kal', kal), ('pad', pad), ('fx', fx), ('sub', sub)):
    l, r = bus.l * gain[name], bus.r * gain[name]
    if name in ('bass', 'pad'):
        l, r = l * duck, r * duck
    mixl += l; mixr += r
    revl += l * send[name]; revr += r * send[name]
mixl += convolve(revl, irl) * 0.5
mixr += convolve(revr, irr) * 0.5
# the ride: quiet passages sit well under the drops, as an engineer would ride the faders
RIDE = [(0, -9), (7.5, -8), (8, -4), (11.6, -2), (12.0, 0), (29.6, 0), (30.2, -2.5), (35.6, -3), (36, -3.5), (50.5, -3.5),
        (52, -8), (61, -7), (62, -4), (67.6, 0), (68, 0.5), (76.9, 0.5), (78.8, -1), (80, -1.5), (88, -2)]
rt, rdb = zip(*RIDE)
ride = 10 ** (np.interp(t_all, rt, rdb) / 20)
mixl *= ride; mixr *= ride
# low cut below 25 Hz
mixl = fftfilter(mixl, 25, None, 0.3)
mixr = fftfilter(mixr, 25, None, 0.3)
# glue: a gentle soft clip, then a ceiling just under full scale
peak = max(np.abs(mixl).max(), np.abs(mixr).max())
mixl, mixr = mixl / peak * 1.25, mixr / peak * 1.25
mixl, mixr = np.tanh(mixl) / np.tanh(1.25), np.tanh(mixr) / np.tanh(1.25)
peak = max(np.abs(mixl).max(), np.abs(mixr).max())
mixl, mixr = mixl / peak * 0.94, mixr / peak * 0.94
# the silence before the mark really is silent
sil0, sil1 = at(157.62), at(159.0)
fade = np.ones(N)
fade[sil0:sil1] = 0.0
fade[sil0 - 240:sil0] = np.linspace(1, 0, 240)
fade[sil1:at(160)] = np.linspace(0, 1, at(160) - sil1) ** 3
tailend = at(173.6)
fade[tailend:] = np.linspace(1, 0, N - tailend) ** 2
mixl *= fade; mixr *= fade
pcm = (np.stack([mixl, mixr], 1) * 32767).astype(np.int16)
with wave.open('score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
rms = np.sqrt(np.mean(mixl ** 2))
print('score.wav written', N / SR, 's  rms dBFS', round(20 * np.log10(rms), 1))

if __name__ == '__main__' and __import__('os').environ.get('BUSDEBUG'):
    for nm, bus in (('drums', drums), ('bass', bass), ('kal', kal), ('pad', pad), ('fx', fx), ('sub', sub)):
        row = []
        for a, b in ((0, 8), (12, 28), (52, 62), (68, 77)):
            s_ = bus.l[int(a * SR):int(b * SR)] * gain[nm]
            row.append(f"{20 * np.log10(np.sqrt((s_ ** 2).mean()) + 1e-9):6.1f}")
        print(f"{nm:6s}", ' '.join(row))
