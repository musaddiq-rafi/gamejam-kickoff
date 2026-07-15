// particles.js — lightweight pooled sprite particles for game juice.
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  function makeDotTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  function create(scene) {
    const MAX = 200;
    const tex = makeDotTexture();
    const group = new THREE.Group();
    scene.add(group);
    const pool = [];
    for (let i = 0; i < MAX; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
      }));
      m.visible = false; group.add(m);
      pool.push({ spr: m, life: 0, max: 1, vx: 0, vy: 0, vz: 0, grav: 0, shrink: 1 });
    }
    let cursor = 0;

    function emit(pos, color, o) {
      const p = pool[cursor]; cursor = (cursor + 1) % MAX;
      const s = p.spr;
      s.visible = true; s.material.opacity = 1; s.material.color.setHex(color);
      const sc = o.size || 0.25; s.scale.set(sc, sc, sc);
      s.position.copy(pos);
      p.life = 0; p.max = o.life || 0.6; p.vx = o.vx; p.vy = o.vy; p.vz = o.vz;
      p.grav = o.grav || 0; p.shrink = o.shrink || 1;
    }

    function burst(pos, color, count, o) {
      o = o || {};
      const speed = o.speed || 3, life = o.life || 0.6, size = o.size || 0.25, grav = o.grav || 0;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const e = (Math.random() - 0.5) * Math.PI;
        const sp = speed * (0.5 + Math.random());
        emit(pos, color, {
          vx: Math.cos(a) * Math.cos(e) * sp,
          vy: Math.abs(Math.sin(e)) * sp + (o.up || 0),
          vz: Math.sin(a) * Math.cos(e) * sp,
          life: life * (0.7 + Math.random() * 0.6), size: size * (0.7 + Math.random() * 0.6), grav
        });
      }
    }

    const palette = [0xffd54f, 0xff6b6b, 0x4fc3f7, 0x81e08a, 0xff9ff3];

    return {
      // golden sparkles when a star is collected
      starBurst(pos) { burst(pos, 0xffe08a, 9, { speed: 3.2, life: 0.5, size: 0.22, up: 1.5, grav: -4 }); },
      // multicolour confetti shower for a KICKOFF BLAST
      confetti(pos) {
        for (let i = 0; i < 34; i++) {
          const col = palette[(Math.random() * palette.length) | 0];
          burst(pos, col, 1, { speed: 4 + Math.random() * 3, life: 1.0, size: 0.3, up: 3 + Math.random() * 3, grav: -7 });
        }
      },
      // grey smoke puff at the crash point
      smoke(pos) { burst(pos, 0x9aa0a6, 16, { speed: 2.4, life: 0.8, size: 0.5, up: 1.0, grav: 1.5 }); },
      // green shards when a shield absorbs a hit
      shatter(pos, color) { burst(pos, color || 0x4fd17a, 18, { speed: 5, life: 0.6, size: 0.3, up: 2, grav: -6 }); },
      update(dt) {
        for (let i = 0; i < MAX; i++) {
          const p = pool[i];
          if (!p.spr.visible) continue;
          p.life += dt;
          if (p.life >= p.max) { p.spr.visible = false; continue; }
          const k = 1 - p.life / p.max;
          p.spr.position.x += p.vx * dt;
          p.spr.position.y += p.vy * dt;
          p.spr.position.z += p.vz * dt;
          p.vy += p.grav * dt;
          p.spr.material.opacity = k;
          const sc = (p.spr.scale.x) * (1 - dt * 0.6 * p.shrink);
          p.spr.scale.set(sc, sc, sc);
        }
      }
    };
  }

  K.Particles = { create };
})();
