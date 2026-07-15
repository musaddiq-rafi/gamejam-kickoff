// referee.js — the match official. Runs on the sideline (outside the lanes),
// never collides. Whistles at kickoff; present throughout to "maintain the game".
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  function stripeTexture() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const x = c.getContext('2d');
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#111111' : '#f5f5f5'; x.fillRect(i * 8, 0, 8, 64); }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1);
    return t;
  }

  function create() {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xc98d5b, roughness: 1, flatShading: true });
    const shirt = new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 1, flatShading: true });
    const black = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 1, flatShading: true });
    const white = new THREE.MeshStandardMaterial({ color: 0xe7e2d6, roughness: 1, flatShading: true });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.95, 0.44), shirt);
    torso.position.y = 1.4; torso.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.52), skin);
    head.position.y = 2.12; head.castShadow = true;
    // whistle on a lanyard
    const whistle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xf2d06b, emissive: 0x665500, emissiveIntensity: 0.3, roughness: 1, flatShading: true }));
    whistle.position.set(0, 1.85, 0.24);

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.8, 0.21), shirt);
    const armR = armL.clone();
    const armLP = new THREE.Group(); armLP.position.set(-0.5, 1.8, 0);
    const armRP = new THREE.Group(); armRP.position.set(0.5, 1.8, 0);
    [armL, armR].forEach(a => a.position.y = -0.4);
    armLP.add(armL); armRP.add(armR);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.3), black);
    const legR = legL.clone();
    const legLP = new THREE.Group(); legLP.position.set(-0.2, 0.9, 0);
    const legRP = new THREE.Group(); legRP.position.set(0.2, 0.9, 0);
    [legL, legR].forEach(l => l.position.y = -0.45);
    legLP.add(legL); legRP.add(legR);
    [legL, legR].forEach(l => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.32), white);
      s.position.y = -0.52; l.add(s);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.46), black);
      b.position.set(0, -0.82, 0.07); l.add(b);
    });

    g.add(torso, head, whistle, armLP, armRP, legLP, legRP);
    g.userData.pivots = { armLP, armRP, legLP, legRP };

    let ph = Math.random() * 10;
    g.userData.whistle = false;
    g.userData.animate = function (dt) {
      ph += dt * 9;
      const p = g.userData.pivots;
      if (g.userData.whistle) {
        // kickoff pose: both arms raised to the whistle, legs still, slight bob
        g.position.y = Math.sin(ph * 1.5) * 0.05;
        p.legLP.rotation.x = 0; p.legRP.rotation.x = 0;
        p.armLP.rotation.x = -2.2; p.armRP.rotation.x = -2.2;
      } else {
        g.position.y = 0;
        const swing = Math.sin(ph) * 0.85;
        p.legLP.rotation.x = swing; p.legRP.rotation.x = -swing;
        p.armLP.rotation.x = -swing; p.armRP.rotation.x = swing;
      }
    };
    return g;
  }

  K.Referee = { create };
})();
