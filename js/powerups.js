// powerups.js — glowing orbs: speed boost, star magnet, one-hit shield.
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  const TYPES = {
    speed:  { color: 0x4fc3f7, label: 'SPEED',  dur: 4 },
    magnet: { color: 0xb069ff, label: 'MAGNET', dur: 5 },
    shield: { color: 0x4fd17a, label: 'SHIELD', dur: 0 }
  };

  function createOrb(type) {
    const t = TYPES[type];
    const g = new THREE.Group();
    const core = new THREE.Mesh(
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
