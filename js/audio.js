// audio.js — procedural sound effects & background music via Web Audio API.
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  let ctx = null;
  let master = null;
  let musicTimer = null;
  let enabled = true;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }

  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx || !enabled) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master);
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
    crash:  () => { blip(150, 0.5, 'sawtooth', 0.4, 40); noiseBurst(0.4, 0.45); },
    kick:   () => { blip(180, 0.12, 'square', 0.3, 90); noiseBurst(0.08, 0.25); },
    // referee whistle: two quick high trills
    whistle: () => {
      if (!ctx || !enabled) return;
      [0, 0.18].forEach(off => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(2100, ctx.currentTime + off);
        const lfo = ctx.createOscillator(); const lg = ctx.createGain();
        lfo.frequency.value = 28; lg.gain.value = 120;
        lfo.connect(lg); lg.connect(o.frequency);
        g.gain.setValueAtTime(0.0001, ctx.currentTime + off);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + off + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + off + 0.16);
        o.connect(g); g.connect(master);
        o.start(ctx.currentTime + off); o.stop(ctx.currentTime + off + 0.16);
        lfo.start(ctx.currentTime + off); lfo.stop(ctx.currentTime + off + 0.16);
      });
    }
  };

  // light looping stadium chant / arpeggio
  const notes = [262, 330, 392, 523, 440, 392];
  let step = 0;
  function startMusic() {
    if (!ctx || musicTimer) return;
    musicTimer = setInterval(() => {
      if (!enabled) return;
      const n = notes[step % notes.length];
      blip(n, 0.18, 'triangle', 0.1);
      if (step % 2 === 0) blip(n / 2, 0.22, 'sine', 0.09);
      step++;
    }, 230);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
  function toggle() { enabled = !enabled; if (master) master.gain.value = enabled ? 0.5 : 0; return enabled; }

  K.Audio = { init, resume, startMusic, stopMusic, toggle, sfx, get enabled() { return enabled; } };
})();
