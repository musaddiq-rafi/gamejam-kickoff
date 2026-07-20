// opponents.js — two obstacle types:
//   'player' : uniform-colour rival (single lane) -> switch lanes to avoid
//   'keeper' : goalkeeper with arms spread across the pitch -> MUST jump over
//              (spans all lanes, so switching lanes is not enough)
//
// Performance: all rivals share ONE set of geometries + materials + jersey texture.
// Opponent groups are pooled and reused (never re-allocated per spawn) so the
// endless track never triggers GC hitches or GPU texture uploads mid-run.
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  const PLAYER_KIT = { jersey: 0x3a7ca5, sock: 0x2d4a6b, country: 'RIVAL' }; // all rivals same blue kit
  const KEEPER_KIT = { jersey: 0x2f9e8f, sock: 0x216b60, country: 'RIVAL' }; // keeper is special teal

  // ---- shared resources (built once) ----
  const G = {
    torso: new THREE.BoxGeometry(0.82, 0.95, 0.44),
    head: new THREE.BoxGeometry(0.52, 0.52, 0.52),
    arm: new THREE.BoxGeometry(0.21, 0.8, 0.21),
    leg: new THREE.BoxGeometry(0.28, 0.9, 0.3),
    sock: new THREE.BoxGeometry(0.3, 0.38, 0.32),
    boot: new THREE.BoxGeometry(0.32, 0.16, 0.46),
    kTorso: new THREE.BoxGeometry(0.95, 1.0, 0.5),
    kArm: new THREE.BoxGeometry(3.9, 0.24, 0.24),
    kGlove: new THREE.BoxGeometry(0.4, 0.4, 0.4),
    kLeg: new THREE.BoxGeometry(0.3, 0.55, 0.32),
    kSock: new THREE.BoxGeometry(0.32, 0.25, 0.34),
    kBoot: new THREE.BoxGeometry(0.34, 0.16, 0.48)
  };

  const playerFrontTex = K.makeFrontJersey
    ? K.makeFrontJersey({ base: PLAYER_KIT.jersey, number: 7, country: 'RIVAL' })
    : null;
  const keeperFrontTex = K.makeFrontJersey
    ? K.makeFrontJersey({ base: KEEPER_KIT.jersey, number: 1, country: 'GK' })
    : null;

  function mat(color, map) {
    return map
      ? new THREE.MeshStandardMaterial({ map, color: 0xffffff, roughness: 0.7, metalness: 0.15, flatShading: true })
      : new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.15, flatShading: true });
  }
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98d5b, roughness: 0.7, metalness: 0.15, flatShading: true });
  const jersey = new THREE.MeshStandardMaterial({ color: PLAYER_KIT.jersey, roughness: 0.7, metalness: 0.15, flatShading: true });
  const keeperJersey = new THREE.MeshStandardMaterial({ color: KEEPER_KIT.jersey, roughness: 0.7, metalness: 0.15, flatShading: true });
  const shorts = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.7, metalness: 0.15, flatShading: true });
  const sock = new THREE.MeshStandardMaterial({ color: PLAYER_KIT.sock, roughness: 0.7, metalness: 0.15, flatShading: true });
  const keeperSock = new THREE.MeshStandardMaterial({ color: KEEPER_KIT.sock, roughness: 0.7, metalness: 0.15, flatShading: true });
  const boot = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.7, metalness: 0.15, flatShading: true });
  const glove = new THREE.MeshStandardMaterial({ color: 0xe7e2d6, roughness: 0.7, metalness: 0.15, flatShading: true });
  const matFrontPlayer = playerFrontTex ? mat(0, playerFrontTex) : jersey;
  const matFrontKeeper = keeperFrontTex ? mat(0, keeperFrontTex) : keeperJersey;

  function buildPlayer() {
    const g = new THREE.Group();
    const torsoMats = [jersey, jersey, jersey, jersey, matFrontPlayer, jersey];
    const torso = new THREE.Mesh(G.torso, torsoMats);
    torso.position.y = 1.4; torso.castShadow = true;
    const head = new THREE.Mesh(G.head, skin);
    head.position.y = 2.12; head.castShadow = true;

    const armL = new THREE.Mesh(G.arm, jersey);
    const armR = armL.clone();
    const armLP = new THREE.Group(); armLP.position.set(-0.5, 1.8, 0);
    const armRP = new THREE.Group(); armRP.position.set(0.5, 1.8, 0);
    [armL, armR].forEach(a => a.position.y = -0.4);
    armLP.add(armL); armRP.add(armR);

    const legL = new THREE.Mesh(G.leg, shorts);
    const legR = legL.clone();
    const legLP = new THREE.Group(); legLP.position.set(-0.2, 0.9, 0);
    const legRP = new THREE.Group(); legRP.position.set(0.2, 0.9, 0);
    [legL, legR].forEach(l => l.position.y = -0.45);
    legLP.add(legL); legRP.add(legR);
    [legL, legR].forEach(l => {
      const s = new THREE.Mesh(G.sock, sock); s.position.y = -0.52; l.add(s);
      const b = new THREE.Mesh(G.boot, boot); b.position.set(0, -0.82, -0.07); l.add(b);
    });

    g.add(torso, head, armLP, armRP, legLP, legRP);
    g.userData.pivots = { armLP, armRP, legLP, legRP };
    return g;
  }

  function buildKeeper() {
    const g = new THREE.Group();
    const torsoMats = [keeperJersey, keeperJersey, keeperJersey, keeperJersey, matFrontKeeper, keeperJersey];
    const torso = new THREE.Mesh(G.kTorso, torsoMats);
    torso.position.y = 1.15; torso.castShadow = true;
    const head = new THREE.Mesh(G.head, skin);
    head.position.y = 1.85; head.castShadow = true;

    const armL = new THREE.Mesh(G.kArm, keeperJersey);
    armL.position.set(-1.95, 1.55, 0);
    const armR = armL.clone(); armR.position.x = 1.95;
    const gloveL = new THREE.Mesh(G.kGlove, glove);
    gloveL.position.set(-3.9, 1.55, 0);
    const gloveR = gloveL.clone(); gloveR.position.x = 3.9;

    const legL = new THREE.Mesh(G.kLeg, shorts);
    const legR = legL.clone();
    legL.position.set(-0.25, 0.4, 0); legR.position.set(0.25, 0.4, 0);
    [legL, legR].forEach(l => {
      const s = new THREE.Mesh(G.kSock, keeperSock); s.position.y = -0.4; l.add(s);
      const b = new THREE.Mesh(G.kBoot, boot); b.position.set(0, -0.62, -0.07); l.add(b);
    });

    g.add(torso, head, armL, armR, gloveL, gloveR, legL, legR);
    g.userData.pivots = { armL, armR };
    return g;
  }

  // ---- pool ----
  const pool = { player: [], keeper: [] };
  function acquire(type) {
    const free = pool[type];
    let g;
    if (free.length) { g = free.pop(); }
    else { g = type === 'keeper' ? buildKeeper() : buildPlayer(); }
    g.visible = true;
    return g;
  }

  function create(lane, type, number) {
    const g = acquire(type);
    if (type === 'keeper') {
      g.position.x = 0; // centred, spans all lanes
      const ud = g.userData;
      ud.type = 'keeper'; ud.lane = lane; ud.z = 0; ud.halfDepth = 0.6;
      ud.clearHeight = 1.6; // must jump above this
      ud.scored = false; ud.frozen = false; ud.closePhase = 0;
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
    const ud = g.userData;
    ud.type = 'player'; ud.lane = lane; ud.z = 0; ud.halfDepth = 0.45;
    ud.closing = 0; ud.angleTo = null; // set by game.js for the "charging at you" feel
    ud.scored = false; ud.frozen = false; ud.closePhase = 0;
    let ph = Math.random() * 10;
    ud.animate = function (dt) {
      ph += dt * 13;
      const swing = Math.sin(ph) * 1.05; // pronounced leg pump -> reads as sprinting at you
      const p = ud.pivots;
      p.legLP.rotation.x = swing; p.legRP.rotation.x = -swing;
      p.armLP.rotation.x = -swing * 0.9; p.armRP.rotation.x = swing * 0.9;
      // forward lean (charging) + last-moment tackle tell when close
      const lean = 0.12 + (ud.closePhase || 0) * 0.5;
      g.rotation.x = -lean;
    };
    return g;
  }

  // return an opponent group to the pool (called by game.js on despawn)
  function release(o) {
    if (!o) return;
    const t = o.userData && o.userData.type;
    if (t === 'player' || t === 'keeper') {
      o.userData.animate = null;
      pool[t].push(o);
    }
  }

  K.Opponent = { create, release };
})();
