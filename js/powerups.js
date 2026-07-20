// powerups.js — glowing orbs: speed boost, golden boot (star magnet), one-hit shield, green card (safe player).
// Pooled + shared geometry/material per type so dense tracks never allocate mid-run.
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  const TYPES = {
    speed:     { color: 0x4fc3f7, label: 'SPEED',  dur: 4 },
    magnet:    { color: 0xffd54f, label: 'GOLDEN BOOT', dur: 5 },
    shield:    { color: 0x4fd17a, label: 'SHIELD', dur: 6 },
    greencard: { color: 0x2ecc71, label: 'GREEN CARD', dur: 0 }
  };

  // shared resources per type
  const RES = {};
  Object.keys(TYPES).forEach(type => {
    const c = TYPES[type].color;
    const mat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7, roughness: 0.4, flatShading: true });
    const core = (type === 'greencard')
      ? new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.08), mat)
      : new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), mat);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 16, 12),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    RES[type] = { core, halo, mat };
  });

  const pool = { speed: [], magnet: [], shield: [], greencard: [] };
  function acquire(type) {
    let g = pool[type].pop();
    if (!g) {
      const r = RES[type];
      const light = new THREE.PointLight(TYPES[type].color, 0.8, 4);
      g = new THREE.Group();
      const core = r.core.clone();
      const halo = r.halo.clone();
      g.add(core, halo, light);
      g.userData.core = core;
    }
    g.visible = true;
    return g;
  }

  function createOrb(type) {
    const g = acquire(type);
    g.userData.type = type;
    return g;
  }

  function release(o) {
    if (!o) return;
    const t = o.userData && o.userData.type;
    if (pool[t]) { o.visible = false; pool[t].push(o); }
  }

  K.PowerUps = { TYPES, createOrb, release };
})();
