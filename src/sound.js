// Tiny synthesized sound effects (no audio files). Everything is built from
// oscillators, so there is nothing to download and nothing to license.
const Sfx = (() => {
  let ctx = null;
  let muted = false;

  function ac() {
    if (muted) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // one note: frequency, start offset, length, wave, volume, optional slide to freq
  function tone(f, t0, dur, type = "sine", vol = 0.12, slideTo = null) {
    const a = ac();
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    const t = a.currentTime + t0;
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(t0, dur, vol = 0.06, from = 3000, to = 400) {
    const a = ac();
    if (!a) return;
    const n = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource();
    s.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = "bandpass";
    const t = a.currentTime + t0;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = a.createGain();
    g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination);
    s.start(t);
  }

  const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

  return {
    setMuted(m) {
      muted = m;
    },
    isMuted: () => muted,
    unlock() {
      const a = ac();
      return !!a;
    },
    tap() {
      tone(520, 0, 0.06, "triangle", 0.06);
    },
    pop() {
      tone(330, 0, 0.09, "sine", 0.12, 200);
    },
    thud() {
      tone(150, 0, 0.12, "sine", 0.14, 70);
    },
    exit(combo = 1) {
      noise(0, 0.22, 0.07, 2600, 500);
      const n = notes[Math.min(combo - 1, notes.length - 1)];
      tone(n, 0.05, 0.16, "triangle", 0.14);
      tone(n * 2, 0.1, 0.18, "sine", 0.07);
    },
    combo(c) {
      const n = notes[Math.min(c, notes.length - 1)];
      tone(n, 0, 0.1, "square", 0.05);
      tone(n * 1.5, 0.07, 0.14, "triangle", 0.1);
    },
    // hammer hitting a block: a heavy knock with a crunch on top
    smash() {
      tone(110, 0, 0.18, "sine", 0.22, 45);
      tone(220, 0, 0.06, "square", 0.05, 90);
      noise(0, 0.16, 0.12, 4200, 600);
    },
    // vacuum: air rushing in, rising in pitch
    suck() {
      noise(0, 0.55, 0.07, 500, 3600);
      tone(180, 0.05, 0.5, "sawtooth", 0.025, 520);
    },
    crack() {
      noise(0, 0.14, 0.09, 6000, 1800);
      tone(1400, 0, 0.1, "triangle", 0.06, 700);
    },
    coin() {
      tone(988, 0, 0.07, "square", 0.05);
      tone(1319, 0.07, 0.16, "square", 0.05);
    },
    star(i = 0) {
      tone(notes[2 + i], 0, 0.28, "triangle", 0.14);
      tone(notes[2 + i] * 2, 0.02, 0.3, "sine", 0.06);
    },
    win() {
      [0, 2, 4, 5, 7].forEach((k, i) => {
        tone(notes[k % 7] * (k > 6 ? 2 : 1), i * 0.1, 0.3, "triangle", 0.13);
      });
    },
    unlock_() {
      [3, 4, 5].forEach((k, i) => tone(notes[k], i * 0.09, 0.25, "triangle", 0.12));
    },
    error() {
      tone(180, 0, 0.14, "sawtooth", 0.07, 120);
    },
    boom() {
      noise(0, 0.6, 0.18, 900, 80);
      tone(110, 0, 0.5, "sawtooth", 0.16, 40);
    },
    whoosh() {
      noise(0, 0.3, 0.06, 500, 3000);
    },
    chestOpen() {
      noise(0, 0.25, 0.06, 800, 4000);
      [0, 2, 4, 6].forEach((k, i) => tone(notes[k], 0.15 + i * 0.08, 0.3, "triangle", 0.12));
    },
  };
})();
