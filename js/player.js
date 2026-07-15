// player.js — the user-controlled footballer, dribbling a ball at his feet.
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  function create(scene) {
    const player = new THREE.Group();
    scene.add(player);

    const skin = new THREE.MeshStandardMaterial({ color: 0xf2c79a, roughness: 1, flatShading: true });
    const jersey = new THREE.MeshStandardMaterial({ color: 0xd94f45, roughness: 1, flatShading: true });
    const shorts = new THREE.MeshStandardMaterial({ color: 0xe7e2d6, roughness: 1, flatShading: true });
    const sock = new THREE.MeshStandardMaterial({ color: 0xd94f45, roughness: 1, flatShading: true });
    const boot = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 1, flatShading: true });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 0.45), jersey);
    torso.position.y = 1.45; torso.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skin);
    head.position.y = 2.2; head.castShadow = true;
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.2, 0.58),
      new THREE.MeshStandardMaterial({ color: 0x2e1d10, roughness: 1, flatShading: true }));
    hair.position.y = 2.48;

    // arms (pivots at shoulder)
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.85, 0.22), jersey);
    const armR = armL.clone();
    const armLPivot = new THREE.Group(); armLPivot.position.set(-0.52, 1.85, 0);
    const armRPivot = new THREE.Group(); armRPivot.position.set(0.52, 1.85, 0);
    [armL, armR].forEach(a => { a.position.y = -0.42; });
    armLPivot.add(armL); armRPivot.add(armR);

    // legs (pivots at hip)
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.95, 0.32), shorts);
    const legR = legL.clone();
    const legLPivot = new THREE.Group(); legLPivot.position.set(-0.22, 0.95, 0);
    const legRPivot = new THREE.Group(); legRPivot.position.set(0.22, 0.95, 0);
    [legL, legR].forEach(l => { l.position.y = -0.475; });
    legLPivot.add(legL); legRPivot.add(legR);
    // socks + boots as children of legs
    [legL, legR].forEach(l => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.34), sock);
      s.position.y = -0.55; l.add(s);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.5), boot);
      b.position.set(0, -0.86, 0.08); l.add(b);
    });

    player.add(torso, head, hair, armLPivot, armRPivot, legLPivot, legRPivot);

    // dribbled ball in front of the player's feet
    const ballTex = K.makeSoccerTexture();
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 14, 10),
      new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.9, flatShading: true })
    );
    ball.castShadow = true;
    ball.position.set(0, 0.32, 1.05);
    player.add(ball);

    player.userData = {
      lane: 1, x: 0, y: 0, vy: 0, jumping: false, rolling: false, rollT: 0,
      height: 2.0, rollHeight: 0.95, ball
    };

    function animate(phase, rolling, t) {
      const swing = Math.sin(phase) * 0.95;
      if (!rolling) {
        legLPivot.rotation.x = swing; legRPivot.rotation.x = -swing;
        armLPivot.rotation.x = -swing * 0.8; armRPivot.rotation.x = swing * 0.8;
        ball.position.z = 1.05 + Math.sin(phase) * 0.12;
        ball.position.y = 0.32 + Math.abs(Math.sin(phase * 1.2)) * 0.12;
        ball.rotation.x = -phase * 2;
      } else {
        legLPivot.rotation.x = 0.3; legRPivot.rotation.x = 0.3;
        armLPivot.rotation.x = -1.5; armRPivot.rotation.x = -1.5;
        ball.position.set(0, 0.25, 1.25);
      }
    }

    return { group: player, animate };
  }

  K.Player = { create };
})();
