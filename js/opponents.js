// opponents.js — rival players you must avoid. Types:
//  'block'  : standing defender -> switch lane
//  'slide'  : sliding tackle     -> jump over
//  'leap'   : jumping block      -> roll under
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  const kits = [
    { jersey: 0x1e88e5, sock: 0x1e88e5 },  // blue
    { jersey: 0x43a047, sock: 0x43a047 },  // green
    { jersey: 0x8e24aa, sock: 0x8e24aa },  // purple
    { jersey: 0xfbc02d, sock: 0xfbc02d }   // yellow
  ];

  function build(kit) {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xc98a5b, roughness: 0.85 });
    const jersey = new THREE.MeshStandardMaterial({ color: kit.jersey, roughness: 0.7 });
    const shorts = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const sock = new THREE.MeshStandardMaterial({ color: kit.sock });
    const boot = new THREE.MeshStandardMaterial({ color: 0x111111 });

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

  function create(lane, type) {
    const kit = kits[(Math.random() * kits.length) | 0];
    const g = build(kit);
    g.position.x = 0;
    const ud = g.userData;
    ud.type = type; ud.lane = lane; ud.z = 0; ud.halfDepth = 0.45;

    if (type === 'slide') {
      // lying low, sliding toward player
      g.rotation.z = Math.PI / 2;
      g.rotation.y = Math.PI / 2;
      g.position.y = 0.25;
      ud.height = 0.85; ud.gapBottom = 0; // jump over (low)
    } else if (type === 'leap') {
      // jumping up to block
      g.position.y = 1.15;
      ud.gapBottom = 1.0; // roll under
    } else {
      ud.gapBottom = 2.0; // full body, must change lane
    }

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
