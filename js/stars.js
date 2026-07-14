// stars.js — collectible stars (replaces trophies as the pickup).
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  function starGeometry() {
    const shape = new THREE.Shape();
    const spikes = 5, outer = 0.5, inner = 0.22;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1
    });
    geo.center();
    return geo;
  }

  function create() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffe14d, metalness: 0.6, roughness: 0.3,
      emissive: 0xffb300, emissiveIntensity: 0.45
    });
    const star = new THREE.Mesh(starGeometry(), mat);
    star.castShadow = true;
    const g = new THREE.Group();
    g.add(star);
    g.userData = { type: 'star', z: 0, lane: 0, taken: false };
    return g;
  }

  K.Star = { create };
})();
