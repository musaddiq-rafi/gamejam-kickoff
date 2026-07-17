// powerups.js — glowing orbs: speed boost, golden boot (star magnet), one-hit shield, green card (safe player).
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  const TYPES = {
    speed:     { color: 0x4fc3f7, label: 'SPEED',  dur: 4 },
    magnet:    { color: 0xffd54f, label: 'GOLDEN BOOT', dur: 5 },
    shield:    { color: 0x4fd17a, label: 'SHIELD', dur: 6 },
    greencard: { color: 0x2ecc71, label: 'GREEN CARD', dur: 0 }
  };

  function makeCard(color) {
    const grp = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.55, roughness: 0.4, flatShading: true });
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.08), mat);
    grp.add(card);
    return grp;
  }

  function createOrb(type) {
    const t = TYPES[type];
    const g = new THREE.Group();
    const core = (type === 'greencard')
      ? makeCard(t.color)
      : new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.4, 0),
          new THREE.MeshStandardMaterial({ color: t.color, emissive: t.color, emissiveIntensity: 0.7, roughness: 0.4, flatShading: true })
        );
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 16, 12),
      new THREE.MeshBasicMaterial({ color: t.color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    const light = new THREE.PointLight(t.color, 0.8, 4);
    g.add(core, halo, light);
    g.userData = { type, core };
    return g;
  }

  K.PowerUps = { TYPES, createOrb };
})();
