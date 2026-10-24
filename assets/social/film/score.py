import numpy as np, wave
SR = 48000; DUR = 34.0
n = int(SR * DUR); t = np.arange(n) / SR
rng = np.random.default_rng(3)
L = np.zeros(n); R = np.zeros(n)

def env_lin(points):
    xs, ys = zip(*points); return np.interp(t, xs, ys)

def add(sig, start=0.0, pan=0.0, gain=1.0):
    i = int(start * SR); j = min(n, i + len(sig)); s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt((1 - pan) / 2); R[i:j] += s * np.sqrt((1 + pan) / 2)

def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.empty_like(x); acc = 0.0
    for k in range(len(x)): acc = (1 - a) * x[k] + a * acc; y[k] = acc
    return y

def pad(freqs, detune=0.4):
    out = np.zeros(n)
    for f in freqs:
        for d in (-detune, 0, detune):
            ph = rng.uniform(0, 2 * np.pi)
            out += np.sin(2 * np.pi * (f + d) * t + ph) + .25 * np.sin(2 * np.pi * 2 * (f + d) * t + ph)
    return out / (len(freqs) * 3)

# drone: A1 + E2 with slow breathing
drone = (np.sin(2*np.pi*55*t) + .6*np.sin(2*np.pi*82.41*t) + .3*np.sin(2*np.pi*110*t)) * (0.75 + .25*np.sin(2*np.pi*t/7))
drone *= env_lin([(0,0),(1.5,.5),(11.4,.65),(11.6,1),(33,1),(34,0)])
add(drone, gain=.22)

# minor pad (tension) then major pad (release)
minor = pad([220, 261.63, 329.63]) * env_lin([(0,0),(2,.0),(4.2,.6),(11.2,.9),(11.6,0),(34,0)])
major = pad([220, 277.18, 329.63, 440]) * env_lin([(0,0),(11.6,0),(12.4,1),(29.5,.9),(31,1.1),(34,0)])
add(minor, gain=.10); add(major, gain=.11)
# shimmer on end card
shim = pad([880, 1108.7, 1318.5], .8) * env_lin([(0,0),(29.6,0),(31,.6),(34,0)])
add(shim, gain=.05)

# riser: filtered noise swell 9.0 -> 11.6
rl = int(2.6 * SR); rt = np.arange(rl) / SR
noise = rng.standard_normal(rl)
riser = np.diff(np.concatenate([[0], noise])) * (rt / 2.6) ** 2.5   # brighter as it rises
riser += np.sin(2*np.pi*(200*rt + 300*rt**2)) * (rt/2.6)**3 * .5
add(riser, 9.0, gain=.25)

def boom(dur=2.5, f0=110, f1=32, click=.6):
    k = int(dur*SR); tt = np.arange(k)/SR
    f = f1 + (f0-f1)*np.exp(-tt*8); ph = 2*np.pi*np.cumsum(f)/SR
    s = np.sin(ph) * np.exp(-tt*2.2)
    s += click * rng.standard_normal(k) * np.exp(-tt*60)
    return s

def whoosh(dur=1.0):
    k = int(dur*SR); tt = np.arange(k)/SR
    e = np.sin(np.pi*tt/dur)**2
    return lowpass(rng.standard_normal(k), 1800) * e * 3

def blip(f=1800, dur=.12):
    k = int(dur*SR); tt = np.arange(k)/SR
    return np.sin(2*np.pi*f*tt) * np.exp(-tt*40)

add(boom(3.0, 90, 30, .2), 0.6, gain=.35)
for s in (4.5, 5.9, 7.3): add(boom(1.6, 140, 45, .4), s, gain=.45)
add(boom(1.2, 300, 60, 1.0), 9.0, gain=.35)                     # glitch
add(boom(4.0, 120, 28, .8), 11.6, gain=.9)                      # big reveal
add(boom(2.5, 160, 40, .5), 13.0, gain=.45)
for s in (16.0, 19.4, 21.7, 24.0, 26.5): add(whoosh(.9), s - .2, pan=rng.uniform(-.5,.5), gain=.35)
for s in (16.4, 19.7, 22.0, 24.3, 26.8): add(boom(1.8, 130, 40, .3), s, gain=.4)
add(boom(4.0, 100, 30, .4), 29.9, gain=.7)
# ledger ticks
for i, s in enumerate(np.arange(4.4, 9.0, .23)):
    add(blip(1500 + 400*(i % 3), .08), s, pan=(-.6 if i % 2 else .6), gain=.06)
# redaction stutter
for i in range(16): add(blip(900, .05), 9.0 + i*.05, pan=(i/8-1), gain=.08)
# step dots
for s in (19.9, 22.2, 24.5): add(blip(2400, .3), s, gain=.08)

# simple stereo reverb via FFT convolution
def reverb(x, secs=2.2, seed=0):
    k = int(secs*SR); g = np.random.default_rng(seed)
    ir = g.standard_normal(k) * np.exp(-np.arange(k)/SR * 3.0); ir[0] = 0
    m = len(x) + k - 1; N2 = 1 << (m-1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, N2) * np.fft.rfft(ir, N2), N2)[:len(x)]
    return y / np.max(np.abs(y)) * np.max(np.abs(x))
L2 = L + .35 * reverb(L, seed=1); R2 = R + .35 * reverb(R, seed=2)
mix = np.stack([L2, R2], 1)
mix = np.tanh(mix * 1.4) / np.tanh(1.4)                           # gentle saturation / glue
mix *= env_lin([(0,0),(.3,1),(33.2,1),(34,0)])[:, None]
mix = mix / np.max(np.abs(mix)) * 0.89
with wave.open('score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok')
