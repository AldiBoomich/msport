"""Rev curve of the V10 recording for the POWER needle: JSON [[seconds, rpm], ...] for M6 Settings → Sound → Rev curve.

How: the S85 fires 5 times per crankshaft turn, but each cylinder bank has its own exhaust, so the recording is a
comb of lines on multiples of the 2.5th engine order: the lowest line is rpm / 24 (checked on this recording: lines
at 289, 578, 867, 1157 Hz at the end of the first pull = 6,900 rpm; the drop at the shift, 1.44, matches the SMG III
2nd → 3rd step, 1.47). Every 40 ms the script scores each candidate base frequency by the energy of its first
harmonics (minus the energy halfway between them, which stops octave mistakes), picks the smoothest high-scoring path
through time (dynamic programming) and simplifies it to a few dozen points.

Usage: python rpm-curve.py <recording.mp3> [plot.png]
Run with the tools venv (soundfile, numpy, Pillow):
  "C:/Users/aaldi/Local Sites/msport/.venv/Scripts/python" -I rpm-curve.py ../../assets/audio/m6-v10.mp3 plot.png
"""
import json
import sys

import numpy as np
import soundfile as sf

HOP = 0.04  # s
WIN = 8192  # samples (~186 ms at 44.1 kHz)
RPM_MIN, RPM_MAX = 750, 8300
ORDER = 2.5  # lowest engine order in the recording: line frequency = rpm * ORDER / 60
HARMONICS = 8
JUMP = 14.0  # path cost per unit of |log f0 change|, relative to the score


def spectrogram(x, sr):
    hop = int(HOP * sr)
    win = np.hanning(WIN)
    pad = np.pad(x, (WIN // 2, WIN // 2))
    frames = range(0, len(x), hop)
    spec = np.stack([np.abs(np.fft.rfft(pad[i:i + WIN] * win)) for i in frames])
    return np.log10(spec + 1e-9), np.fft.rfftfreq(WIN, 1 / sr), np.array([i / sr for i in frames])


def scores(logspec, freqs, f0s):
    out = np.zeros((logspec.shape[0], len(f0s)))
    for j, f0 in enumerate(f0s):
        ks = np.arange(1, HARMONICS + 1)
        on = np.interp(ks * f0, freqs, np.arange(len(freqs)))
        off = np.interp((ks - 0.5) * f0, freqs, np.arange(len(freqs)))
        out[:, j] = logspec[:, on.round().astype(int)].mean(1) - 0.6 * logspec[:, off.round().astype(int)].mean(1)
    # Normalise per frame, so quiet and loud frames weigh the same.
    out -= out.mean(1, keepdims=True)
    out /= out.std(1, keepdims=True) + 1e-9
    return out


def best_path(sc, f0s):
    logf = np.log(f0s)
    jump = JUMP * np.abs(logf[:, None] - logf[None, :])
    cost = -sc[0].copy()
    back = np.zeros(sc.shape, dtype=int)
    for t in range(1, len(sc)):
        total = cost[None, :] + jump  # [to, from]
        back[t] = total.argmin(1)
        cost = total.min(1) - sc[t]
    path = [int(cost.argmin())]
    for t in range(len(sc) - 1, 0, -1):
        path.append(int(back[t, path[-1]]))
    return f0s[np.array(path[::-1])]


def simplify(points, tol):
    """Ramer–Douglas–Peucker on (t, rpm) with rpm scaled to seconds-ish units."""
    pts = np.array(points, dtype=float)
    scale = np.array([1.0, 1 / 1000])

    def rdp(a, b):
        p, q = pts[a] * scale, pts[b] * scale
        d = q - p
        n = np.hypot(*d) or 1.0
        idx, best = None, tol
        for i in range(a + 1, b):
            r = pts[i] * scale - p
            dist = abs(d[0] * r[1] - d[1] * r[0]) / n
            if dist > best:
                idx, best = i, dist
        return [a, b] if idx is None else rdp(a, idx)[:-1] + rdp(idx, b)

    return [points[i] for i in rdp(0, len(points) - 1)]


def main():
    x, sr = sf.read(sys.argv[1], always_2d=True)
    x = x.mean(1)
    logspec, freqs, times = spectrogram(x, sr)
    f0s = np.arange(RPM_MIN * ORDER / 60, RPM_MAX * ORDER / 60, 1.0)
    path = best_path(scores(logspec, freqs, f0s), f0s)
    k = 60 / ORDER
    rpm = np.convolve(path * k, np.ones(3) / 3, mode="same")
    rpm[0], rpm[-1] = path[0] * k, path[-1] * k
    pts = [[round(float(t), 2), int(round(float(r) / 50) * 50)] for t, r in zip(times, rpm)]
    curve = simplify(pts, 0.06)
    print(json.dumps(curve, separators=(",", ":")))

    if len(sys.argv) > 2:
        from PIL import Image, ImageDraw

        top = int(np.searchsorted(freqs, 3000))
        img = logspec[:, :top].T[::-1]
        img = (np.clip((img - img.max() + 4) / 4, 0, 1) * 255).astype(np.uint8)
        im = Image.fromarray(img).resize((1400, 600)).convert("RGB")
        d = ImageDraw.Draw(im)
        fx = 1400 / len(times)
        fy = 600 / top
        for k in (1, 2, 3):
            line = [(i * fx, 600 - (f * k / (freqs[1])) * fy) for i, f in enumerate(path)]
            d.line(line, fill=(255, 122, 31) if k == 1 else (90, 200, 255), width=2)
        im.save(sys.argv[2])


if __name__ == "__main__":
    main()
