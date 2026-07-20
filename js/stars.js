// stars.js — collectible stars (replaces trophies as the pickup).
// Pooled + shared geometry/material so dense tracks never allocate mid-run.
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

  const GEO = starGeometry();
  const MAT = new THREE.MeshStandardMaterial({
    color: 0xf2d06b, metalness: 0.0, roughness: 0.7, flatShading: true,
    emissive: 0xf2a03c, emissiveIntensity: 0.5
  });

  const pool = [];
  function acquire() {
    let g = pool.pop();
    if (!g) {
      const star = new THREE.Mesh(GEO, MAT);
      star.castShadow = true;
      g = new THREE.Group();
      g.add(star);
      g.userData.starMesh = star;
    }
    g.visible = true;
    return g;
  }

  function create() {
    const g = acquire();
    const ud = g.userData;
    ud.type = 'star'; ud.z = 0; ud.lane = 0; ud.taken = false;
    let ph = Math.random() * Math.PI;
    ud.animate = function (dt) {
      ph += dt * 3;
      const s = g.userData.starMesh;
      s.rotation.y += dt * 2.5;
      s.position.y = Math.sin(ph) * 0.15;
      MAT.emissiveIntensity = 0.5 + Math.sin(ph * 2) * 0.3;
    };
    return g;
  }

  function release(o) {
    if (o) { o.userData.animate = null; o.visible = false; pool.push(o); }
  }

  K.Star = { create, release };
})();
