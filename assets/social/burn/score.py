import numpy as np, wave
SR = 48000; DUR = 17.0
n = int(SR * DUR); t = np.arange(n) / SR
rng = np.random.default_rng(5)
L = np.zeros(n); R = np.zeros(n)
def env_lin(points):
    xs, ys = zip(*points); return np.interp(t, xs, ys)
def add(sig, start=0.0, pan=0.0, gain=1.0):
    i = int(start * SR); j = min(n, i + len(sig)); s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt((1 - pan) / 2); R[i:j] += s * np.sqrt((1 + pan) / 2)
def lowpass(x, cutoff):
    a = np.exp(-2*np.pi*cutoff/SR); y = np.empty_like(x); acc = 0.0
    for k in range(len(x)): acc = (1-a)*x[k] + a*acc; y[k] = acc
    return y
def pad(freqs, detune=.4):
    out = np.zeros(n)
    for f in freqs:
        for d in (-detune, 0, detune):
            ph = rng.uniform(0, 6.28); out += np.sin(2*np.pi*(f+d)*t+ph) + .25*np.sin(4*np.pi*(f+d)*t+ph)
    return out / (len(freqs)*3)
def boom(dur=2.5, f0=110, f1=32, click=.6):
    k = int(dur*SR); tt = np.arange(k)/SR
    f = f1 + (f0-f1)*np.exp(-tt*8); s = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-tt*2.2)
    return s + click*rng.standard_normal(k)*np.exp(-tt*60)

drone = (np.sin(2*np.pi*55*t) + .6*np.sin(2*np.pi*82.41*t)) * env_lin([(0,0),(1,.6),(6.9,.8),(7.0,1),(16,1),(17,0)])
add(drone, gain=.24)
add(pad([220, 261.63, 329.63]) * env_lin([(0,0),(1.5,.6),(6.8,1),(7.0,0),(17,0)]), gain=.10)          # tension
add(pad([220, 277.18, 329.63, 440]) * env_lin([(0,0),(7.0,0),(7.6,1),(16,1),(17,0)]), gain=.11)       # release
add(pad([880, 1108.7, 1318.5], .8) * env_lin([(0,0),(13.5,0),(15,.6),(17,0)]), gain=.05)

# fire crackle during the burn: dense random clicks + filtered roar
crk = np.zeros(n); i0, i1 = int(3.3*SR), int(7.1*SR)
for _ in range(900):
    p = rng.integers(i0, i1); k = int(SR*rng.uniform(.002, .012))
    if p + k < n: crk[p:p+k] += rng.standard_normal(k) * np.exp(-np.arange(k)/(k/4)) * rng.uniform(.2, 1)
roar = lowpass(rng.standard_normal(n), 900) * 3 * env_lin([(0,0),(3.3,0),(4,.6),(6.8,1),(7.05,0),(17,0)])
add(crk, gain=.35); add(roar, gain=.22)
# riser into the burn moment
rl = int(3.6*SR); rt = np.arange(rl)/SR
add(np.sin(2*np.pi*(180*rt + 160*rt**2)) * (rt/3.6)**3, 3.4, gain=.18)
add(boom(1.6, 140, 45, .4), .5, gain=.35)
add(boom(1.4, 160, 50, .5), 3.4, gain=.45)
add(boom(4.5, 120, 26, .9), 7.0, gain=1.0)        # BURNED
for s in (10.7, 11.5): add(boom(1.8, 130, 40, .3), s, gain=.4)
add(boom(4.0, 100, 30, .4), 13.6, gain=.7)
# percent ticks while counting down
for i, s in enumerate(np.arange(3.5, 7.0, .09)):
    k = int(.04*SR); tt = np.arange(k)/SR
    add(np.sin(2*np.pi*(2200 - i*25)*tt)*np.exp(-tt*80), s, pan=(-.4 if i % 2 else .4), gain=.05)

def reverb(x, secs=2.2, seed=0):
    k = int(secs*SR); g = np.random.default_rng(seed)
    ir = g.standard_normal(k) * np.exp(-np.arange(k)/SR*3.0); ir[0] = 0
    N2 = 1 << (len(x)+k-2).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, N2)*np.fft.rfft(ir, N2), N2)[:len(x)]
    return y/np.max(np.abs(y))*np.max(np.abs(x))
mix = np.stack([L + .35*reverb(L, seed=1), R + .35*reverb(R, seed=2)], 1)
mix = np.tanh(mix*1.4)/np.tanh(1.4)
mix *= env_lin([(0,0),(.2,1),(16.3,1),(17,0)])[:, None]
mix = mix/np.max(np.abs(mix))*0.8
with wave.open('score.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok')
