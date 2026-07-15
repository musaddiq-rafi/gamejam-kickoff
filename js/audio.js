// audio.js — procedural sound effects & background music via Web Audio API.
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  let ctx = null;
  let master = null;
  let musicGain = null;
  let musicTimer = null;
  let enabled = true;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.5;
    musicGain.connect(master);
  }

  function resume() { if (ctx && ctx.state === 'suspended') return ctx.resume(); return null; }

  function blip(freq, dur, type, vol, slideTo, dest) {
    if (!ctx || !enabled) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(dest || master);
    o.start(); o.stop(ctx.currentTime + dur);
  }

  function noiseBurst(dur, vol) {
    if (!ctx || !enabled) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol || 0.4;
    src.connect(g); g.connect(master); src.start();
  }

  const sfx = {
    jump:   () => blip(420, 0.18, 'square', 0.22, 760),
    roll:   () => blip(300, 0.18, 'sawtooth', 0.18, 140),
    ball:   () => { blip(880, 0.07, 'square', 0.22); setTimeout(() => blip(1320, 0.09, 'square', 0.2), 55); },
    trophy: () => { blip(1046, 0.09, 'triangle', 0.22); setTimeout(() => blip(1568, 0.1, 'triangle', 0.2), 60); },
    star:   () => { blip(1318, 0.08, 'triangle', 0.22); setTimeout(() => blip(1976, 0.09, 'triangle', 0.2), 55); },
    crash:  () => { blip(150, 0.5, 'sawtooth', 0.4, 40); noiseBurst(0.4, 0.45); },
    kick:   () => { blip(180, 0.12, 'square', 0.3, 90); noiseBurst(0.08, 0.25); },
    // penalty scored: short rising fanfare
    goal:   () => {
      if (!ctx || !enabled) return;
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.25), i * 90));
    },
    // referee whistle: two clear, longer blasts with a trill — duck the music so it cuts through
    whistle: () => {
      if (!ctx || !enabled) return;
      const now = ctx.currentTime;
      if (musicGain) {
        musicGain.gain.cancelScheduledValues(now);
        musicGain.gain.setValueAtTime(musicGain.gain.value, now);
        musicGain.gain.linearRampToValueAtTime(0.08, now + 0.06);
        musicGain.gain.linearRampToValueAtTime(0.5, now + 1.2);
      }
      [{ t: 0, d: 0.34 }, { t: 0.46, d: 0.52 }].forEach(b => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(2300, now + b.t);
        const lfo = ctx.createOscillator(); const lg = ctx.createGain();
        lfo.type = 'sine'; lfo.frequency.value = 30; lg.gain.value = 170;
        lfo.connect(lg); lg.connect(o.frequency);
        g.gain.setValueAtTime(0.0001, now + b.t);
        g.gain.exponentialRampToValueAtTime(0.55, now + b.t + 0.02);
        g.gain.setValueAtTime(0.55, now + b.t + b.d - 0.07);
        g.gain.exponentialRampToValueAtTime(0.0001, now + b.t + b.d);
        o.connect(g); g.connect(master);
        o.start(now + b.t); o.stop(now + b.t + b.d + 0.02);
        lfo.start(now + b.t); lfo.stop(now + b.t + b.d + 0.02);
      });
    },
    // combo tier jingle — pitch climbs with the multiplier tier
    combo: (tier) => { const base = 660 + tier * 130; blip(base, 0.07, 'triangle', 0.2); setTimeout(() => blip(base * 1.5, 0.08, 'triangle', 0.18), 50); },
    // flair / style bonus chime
    style: () => { blip(880, 0.08, 'square', 0.2); setTimeout(() => blip(1320, 0.1, 'square', 0.18), 60); setTimeout(() => blip(1760, 0.12, 'triangle', 0.16), 120); },
    // power-up pickup whoosh
    power: () => blip(300, 0.18, 'sawtooth', 0.2, 900),
    shieldUp: () => blip(520, 0.12, 'sine', 0.22, 780),
    shieldBreak: () => { noiseBurst(0.25, 0.4); blip(220, 0.2, 'square', 0.2, 80); }
  };

  // crowd ambience: a filtered-noise bed whose level + brightness rise with the combo
  let ambientSrc = null, ambientGain = null, ambientFilter = null;
  function startAmbient() {
    if (!ctx || ambientSrc) return;
    const dur = 2.0;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 500;
    const g = ctx.createGain(); g.gain.value = 0.0;
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start();
    ambientSrc = src; ambientFilter = filt; ambientGain = g;
  }
  function stopAmbient() {
    if (ambientSrc) { try { ambientSrc.stop(); } catch (e) {} ambientSrc.disconnect(); ambientSrc = null; }
  }
  function setCrowd(level) {
    if (!ambientGain || !ctx) return;
    const lv = Math.max(0, Math.min(1, level));
    ambientGain.gain.setTargetAtTime(lv * 0.3, ctx.currentTime, 0.3);
    ambientFilter.frequency.setTargetAtTime(380 + lv * 900, ctx.currentTime, 0.3);
  }
  function musicGainSet(v) { if (musicGain) musicGain.gain.value = Math.max(0, Math.min(1, v)) * 0.5; }
  function masterGainSet(v) { master.gain.value = Math.max(0, Math.min(1, v)) * 0.6; }

  // light looping stadium chant / arpeggio
  const notes = [262, 330, 392, 523, 440, 392];
  let step = 0;
  function startMusic() {
    if (!ctx || musicTimer) return;
    musicTimer = setInterval(() => {
      if (!enabled) return;
      const n = notes[step % notes.length];
      blip(n, 0.18, 'triangle', 0.1, null, musicGain);
      if (step % 2 === 0) blip(n / 2, 0.22, 'sine', 0.09, null, musicGain);
      step++;
    }, 230);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
  function toggle() { enabled = !enabled; if (master) master.gain.value = enabled ? 0.5 : 0; return enabled; }

  K.Audio = { init, resume, startMusic, stopMusic, toggle, sfx, startAmbient, stopAmbient, setCrowd, musicGainSet, masterGainSet, get enabled() { return enabled; } };
})();
