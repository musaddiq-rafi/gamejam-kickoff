// trophies.js — collectible golden trophies (replaces footballs as the pickup).
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  function goldMat() {
    return new THREE.MeshStandardMaterial({
      color: 0xffd700, metalness: 0.85, roughness: 0.25,
      emissive: 0x4a3500, emissiveIntensity: 0.35
    });
  }

  function create() {
    const g = new THREE.Group();
    const mat = goldMat();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.2, 0.55, 20), mat);
    cup.position.y = 0.5; cup.castShadow = true;
    const hL = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.05, 8, 16, Math.PI), mat);
    hL.position.set(-0.34, 0.55, 0); hL.rotation.z = Math.PI / 2;
    const hR = hL.clone(); hR.position.x = 0.34;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.25, 12), mat);
    stem.position.y = 0.2;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.12, 16), mat);
    base.position.y = 0.06; base.castShadow = true;
    // little star on the cup front
    const star = new THREE.Mesh(new THREE.CircleGeometry(0.1, 5),
      new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0x886600, emissiveIntensity: 0.4 }));
    star.position.set(0, 0.52, 0.205);
    g.add(cup, hL, hR, stem, base, star);
    g.userData = { type: 'trophy', z: 0, lane: 0, taken: false };
    return g;
  }

  K.Trophy = { create };
})();
