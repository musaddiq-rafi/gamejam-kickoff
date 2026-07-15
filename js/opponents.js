// opponents.js — two obstacle types:
//   'player' : uniform-colour rival (single lane) -> switch lanes to avoid
//   'keeper' : goalkeeper with arms spread across the pitch -> MUST jump over
//              (spans all lanes, so switching lanes is not enough)
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  const PLAYER_KIT = { jersey: 0x3a7ca5, sock: 0x2d4a6b }; // all rivals same blue kit
  const KEEPER_KIT = { jersey: 0x2f9e8f, sock: 0x216b60 }; // keeper is special teal

  function buildPlayer(kit) {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xc98d5b, roughness: 1, flatShading: true });
    const jersey = new THREE.MeshStandardMaterial({ color: kit.jersey, roughness: 1, flatShading: true });
    const shorts = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 1, flatShading: true });
    const sock = new THREE.MeshStandardMaterial({ color: kit.sock, roughness: 1, flatShading: true });
    const boot = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 1, flatShading: true });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.95, 0.44), jersey);
    torso.position.y = 1.4; torso.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.52), skin);
    head.position.y = 2.12; head.castShadow = true;

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.8, 0.21), jersey);
    const armR = armL.clone();
    const armLP = new THREE.Group(); armLP.position.set(-0.5, 1.8, 0);
    const armRP = new THREE.Group(); armRP.position.set(0.5, 1.8, 0);
    [armL, armR].forEach(a => a.position.y = -0.4);
    armLP.add(armL); armRP.add(armR);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.3), shorts);
    const legR = legL.clone();
    const legLP = new THREE.Group(); legLP.position.set(-0.2, 0.9, 0);
    const legRP = new THREE.Group(); legRP.position.set(0.2, 0.9, 0);
    [legL, legR].forEach(l => l.position.y = -0.45);
    legLP.add(legL); legRP.add(legR);
    [legL, legR].forEach(l => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.32), sock);
      s.position.y = -0.52; l.add(s);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.46), boot);
      b.position.set(0, -0.82, 0.07); l.add(b);
    });

    g.add(torso, head, armLP, armRP, legLP, legRP);
    g.userData.pivots = { armLP, armRP, legLP, legRP };
    return g;
  }

  function buildKeeper(kit) {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xc98a5b, roughness: 0.85 });
    const jersey = new THREE.MeshStandardMaterial({ color: kit.jersey, roughness: 0.7 });
    const shorts = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const sock = new THREE.MeshStandardMaterial({ color: kit.sock });
    const boot = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.6 });

    // crouched torso + head
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.0, 0.5), jersey);
    torso.position.y = 1.15; torso.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skin);
    head.position.y = 1.85; head.castShadow = true;

    // arms spread WIDE across the pitch (the "save")
    const armL = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.24, 0.24), jersey);
    armL.position.set(-1.95, 1.55, 0);
    const armR = armL.clone(); armR.position.x = 1.95;
    const gloveL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), gloveMat);
    gloveL.position.set(-3.9, 1.55, 0);
    const gloveR = gloveL.clone(); gloveR.position.x = 3.9;

    // short crouched legs
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.32), shorts);
    const legR = legL.clone();
    legL.position.set(-0.25, 0.4, 0); legR.position.set(0.25, 0.4, 0);
    [legL, legR].forEach(l => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.25, 0.34), sock);
      s.position.y = -0.4; l.add(s);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.48), boot);
      b.position.set(0, -0.62, 0.07); l.add(b);
    });

    g.add(torso, head, armL, armR, gloveL, gloveR, legL, legR);
    g.userData.pivots = { armL, armR };
    return g;
  }

  function create(lane, type) {
    if (type === 'keeper') {
      const g = buildKeeper(KEEPER_KIT);
      g.position.x = 0; // centred, spans all lanes
      const ud = g.userData;
      ud.type = 'keeper'; ud.lane = lane; ud.z = 0; ud.halfDepth = 0.6;
      ud.clearHeight = 1.6; // must jump above this
      let ph = Math.random() * 10;
      ud.animate = function (dt) {
        ph += dt * 5;
        const w = Math.sin(ph) * 0.12;
        ud.pivots.armL.rotation.z = w; ud.pivots.armR.rotation.z = -w;
        g.position.y = Math.abs(Math.sin(ph)) * 0.08;
      };
      return g;
    }
    // player
    const g = buildPlayer(PLAYER_KIT);
    const ud = g.userData;
    ud.type = 'player'; ud.lane = lane; ud.z = 0; ud.halfDepth = 0.45;
    let ph = Math.random() * 10;
    ud.animate = function (dt) {
      ph += dt * 9;
      const swing = Math.sin(ph) * 0.8;
      const p = ud.pivots;
      p.legLP.rotation.x = swing; p.legRP.rotation.x = -swing;
      p.armLP.rotation.x = -swing; p.armRP.rotation.x = swing;
    };
    return g;
  }

  K.Opponent = { create };
})();
