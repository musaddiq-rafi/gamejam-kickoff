// powerups.js — glowing orbs: speed boost, golden boot (star magnet), one-hit shield, extra life.
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  const TYPES = {
    speed:  { color: 0x4fc3f7, label: 'SPEED',  dur: 4 },
    magnet: { color: 0xffd54f, label: 'GOLDEN BOOT', dur: 5 },
    shield: { color: 0x4fd17a, label: 'SHIELD', dur: 6 },
    life:   { color: 0xff3b5c, label: 'LIFE',   dur: 0 }
  };

  function makeHeart(color) {
    const grp = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.55, roughness: 0.4, flatShading: true });
    const top1 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), mat); top1.position.set(-0.17, 0.16, 0);
    const top2 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), mat); top2.position.set(0.17, 0.16, 0);
    const bot = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.62, 14), mat); bot.position.set(0, -0.18, 0); bot.rotation.z = Math.PI;
    grp.add(top1, top2, bot);
    return grp;
  }

  function createOrb(type) {
    const t = TYPES[type];
    const g = new THREE.Group();
    const core = (type === 'life')
      ? makeHeart(t.color)
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
