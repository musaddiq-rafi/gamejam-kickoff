// balls.js — loose footballs you can pick up for bonus (collectibles).
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  let tex = null;
  function ballMaterial() {
    if (!tex) tex = K.makeSoccerTexture();
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0x334422, emissiveIntensity: 0.15 });
  }

  function create() {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 20), ballMaterial());
    b.castShadow = true;
    b.userData = { type: 'ball', z: 0, lane: 0, taken: false };
    return b;
  }

  K.Ball = { create };
})();
