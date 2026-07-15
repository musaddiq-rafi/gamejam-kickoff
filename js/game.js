// game.js — orchestrates scene, player, opponents, input, loop and HUD.
(function () {
  const K = (window.Kickoff = window.Kickoff || {});
  const LANES = [-2.4, 0, 2.4];
  const GRAVITY = -42, JUMP_V = 15, ROLL_TIME = 0.55;
  const PLAYER_Z = 0, BASE_SPEED = 18, DESPAWN_Z = 14;
  const SPAWN_Z = -160;
  const KEEPER_CHANCE = 0.32;
  const COMBO_TIMEOUT = 3.5;
  const INTRO_HOLD = 3.2, INTRO_TRANS = 1.4;
  const CAM_GAME_POS = new THREE.Vector3(0, 4.4, 9);
  const CAM_GAME_LOOK = new THREE.Vector3(0, 1.4, -12);
  const CAM_INTRO_POS = new THREE.Vector3(0, 22, 11);
  const CAM_INTRO_LOOK = new THREE.Vector3(0, 0, -3);

  const PLAYERS = {
    messi:    { name: 'MESSI',     full: 'Lionel Messi',    number: 10, country: 'ARGENTINA', jersey: 0x6ca6e0, shorts: 0xf2f2f2, skin: 0xf2c79a, speed: 1.05, star: 1.0, combo: 1.0, blast: 5, shieldStart: false },
    ronaldo:  { name: 'RONALDO',   full: 'Cristiano Ronaldo', number: 7, country: 'PORTUGAL', jersey: 0xc8102e, shorts: 0x0a3a1f, skin: 0xe8b487, speed: 1.0,  star: 1.0, combo: 1.0, blast: 6, shieldStart: false },
    neymar:   { name: 'NEYMAR',    full: 'Neymar Jr',       number: 10, country: 'BRAZIL',    jersey: 0xfcd116, shorts: 0x1d3a8f, skin: 0xcf9b6b, speed: 1.0,  star: 1.0, combo: 1.6, blast: 5, shieldStart: false },
    mbappe:   { name: 'MBAPPÉ',    full: 'Kylian Mbappé',   number: 10, country: 'FRANCE',    jersey: 0x0055a4, shorts: 0xffffff, skin: 0xb07a44, speed: 1.05, star: 1.0, combo: 1.0, blast: 5, shieldStart: false },
    salah:    { name: 'M. SALAH',  full: 'Mohamed Salah',   number: 10, country: 'EGYPT',     jersey: 0xc8102e, shorts: 0xffffff, skin: 0x8a5a30, speed: 1.0,  star: 1.1, combo: 1.0, blast: 5, shieldStart: false },
    kane:     { name: 'KANE',      full: 'Harry Kane',      number: 9,  country: 'ENGLAND',   jersey: 0xffffff, shorts: 0x1d3a8f, skin: 0xe8b487, speed: 1.0,  star: 1.0, combo: 1.0, blast: 5, shieldStart: false },
    haaland:  { name: 'HAALAND',   full: 'Erling Haaland',  number: 9,  country: 'NORWAY',    jersey: 0xd61f26, shorts: 0x00205b, skin: 0xe8b487, speed: 1.0,  star: 1.0, combo: 1.0, blast: 6, shieldStart: false },
    modric:   { name: 'MODRIC',    full: 'Luka Modrić',     number: 10, country: 'CROATIA',  jersey: 0xd11f2d, shorts: 0xffffff, skin: 0xe8b487, speed: 1.0,  star: 1.0, combo: 1.6, blast: 5, shieldStart: false }
  };
  let selectedPlayer = 'messi';

  const container = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 4.4, 9);
  camera.lookAt(0, 1.4, -12);

  const hemi = new THREE.HemisphereLight(0xcfe4f5, 0x4a5a3a, 0.45);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff6e6, 1.35);
  sun.position.set(14, 34, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
  sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
  scene.add(sun);

  const LIGHTING = {
    worldcup: { sun: { pos: [14, 34, 12], color: 0xfff6e6, intensity: 1.35, shadow: true }, hemi: { sky: 0xcfe4f5, ground: 0x4a5a3a, intensity: 0.45 } },
    beach:    { sun: { pos: [-6, 13, -48], color: 0xffe3b0, intensity: 1.45, shadow: true }, hemi: { sky: 0xbfe9ff, ground: 0xd9b676, intensity: 0.6 } },
    indoor:   { sun: { pos: [0, 46, -16], color: 0xfff2dd, intensity: 0.8, shadow: true }, hemi: { sky: 0x8390a6, ground: 0x2f3a2a, intensity: 0.8 } }
  };
  function applyLighting(world) {
    const L = LIGHTING[world] || LIGHTING.worldcup;
    hemi.color.setHex(L.hemi.sky); hemi.groundColor.setHex(L.hemi.ground); hemi.intensity = L.hemi.intensity;
    sun.position.set(L.sun.pos[0], L.sun.pos[1], L.sun.pos[2]);
    sun.color.setHex(L.sun.color); sun.intensity = L.sun.intensity; sun.castShadow = L.sun.shadow;
    sun.target.position.set(0, 0, 0); sun.target.updateMatrixWorld();
  }

  // ---- post-processing ----
  const VignetteShader = {
    uniforms: { tDiffuse: { value: null }, offset: { value: 1.15 }, darkness: { value: 1.1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform float offset; uniform float darkness; varying vec2 vUv;',
      'void main(){',
      '  vec4 tex = texture2D(tDiffuse, vUv);',
      '  vec2 uv = (vUv - 0.5) * offset;',
      '  float vig = clamp(1.0 - dot(uv, uv) * darkness, 0.0, 1.0);',
      '  gl_FragColor = vec4(tex.rgb * mix(0.78, 1.0, vig), tex.a);',
      '}'
    ].join('\n')
  };
  const composer = new THREE.EffectComposer(renderer);
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new THREE.RenderPass(scene, camera));
  const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.45, 0.92);
  composer.addPass(bloomPass);
  composer.addPass(new THREE.ShaderPass(VignetteShader));
  const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
  function setFxaa() {
    const pr = renderer.getPixelRatio();
    fxaaPass.material.uniforms.resolution.value.set(1 / (window.innerWidth * pr), 1 / (window.innerHeight * pr));
  }
  setFxaa();
  composer.addPass(fxaaPass);

  let field = K.Field.create(scene, 'worldcup');
  applyLighting('worldcup');
  let playerObj = null, player = null, ball = null;
  let playerGlow = null, playerAura = null;
  function buildPlayer() {
    if (playerObj) scene.remove(player);
    playerObj = K.Player.create(scene, PLAYERS[selectedPlayer]);
    player = playerObj.group;
    ball = player.userData.ball;
    if (!playerGlow) {
      playerGlow = new THREE.PointLight(0x66e0ff, 0, 7);
      playerGlow.position.set(0, 1.2, 0);
      playerAura = new THREE.Mesh(
        new THREE.SphereGeometry(1.7, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      playerAura.position.y = 1.1;
    }
    player.add(playerGlow);
    player.add(playerAura);
  }
  buildPlayer();

  const referee = K.Referee.create();
  referee.position.set(6.5, 0, 2);
  scene.add(referee);

  const particles = K.Particles.create(scene);

  const obstacles = [], stars = [], powerups = [];
  const obstacleGroup = new THREE.Group();
  const starGroup = new THREE.Group();
  const powerupGroup = new THREE.Group();
  scene.add(obstacleGroup, starGroup, powerupGroup);

  // ---- state ----
  let state = 'loading', paused = false;
  let speed = BASE_SPEED, distance = 0, starCount = 0, score = 0;
  let nextSpawnDist = 0, nextSpawnGap = 22, runPhase = 0;
  let grace = 0, iframes = 0;
  let currentWorld = 'worldcup';
  let best = 0;
  let introT = 0, introOpp = null, introSwitched = false;
  let invisibleT = 0, ghostOn = false, nextFreeKickAt = 100;
  const MAX_LIVES = 3;
  let lives = 3;
  let fovKick = 0;
  let freeKickReady = false, ballKicked = false, ballReturning = false, ballKickT = 0, ballReturnT = 0;
  const ballReturnFrom = new THREE.Vector3();
  const LEG_POS = new THREE.Vector3(0, 0.32, -1.05);
  const BALL_AHEAD = new THREE.Vector3(0, 1.8, -11);
  const camLook = new THREE.Vector3();

  // combo / score
  let combo = 0, comboTimer = 0, bestCombo = 0;
  // power-ups
  let speedBoostT = 0, magnetT = 0, shield = false;
  // style
  let styleBonus = 0, closeCalls = 0, kickoffBlasts = 0, noRollDist = 0;
  // juice
  let shakeT = 0, hitStopT = 0, dyingT = 0;
  // tutorial
  let tutorialT = 0;
  let tutorialShown = false;
  let leaderboard = [];

  const scoreEl = document.getElementById('score');
  const distEl = document.getElementById('distEl');
  const starEl = document.getElementById('starCount');
  const livesHud = document.getElementById('livesHud');
  const comboEl = document.getElementById('comboEl');
  const comboMultEl = document.getElementById('comboMult');
  const powerHud = document.getElementById('powerHud');
  const powerIcon = document.getElementById('powerIcon');
  const powerLabel = document.getElementById('powerLabel');
  const powerFill = document.getElementById('powerFill');
  const overScreen = document.getElementById('overScreen');
  const loadingScreen = document.getElementById('loadingScreen');
  const loadingFill = document.getElementById('loadingFill');
  const flash = document.getElementById('flash');
  const introBanner = document.getElementById('introBanner');
  const introL1 = document.getElementById('introL1');
  const introL2 = document.getElementById('introL2');
  const introL3 = document.getElementById('introL3');
  const invisHud = document.getElementById('invisHud');
  const invisNum = document.getElementById('invisNum');
  const invisFill = document.getElementById('invisFill');
  const freeKick = document.getElementById('freeKick');
  const fk1 = document.getElementById('fk1');
  const fk2 = document.getElementById('fk2');
  const fkFill = document.getElementById('fkFill');
  const fkReady = document.getElementById('fkReady');
  const pauseScreen = document.getElementById('pauseScreen');
  const tutorialEl = document.getElementById('tutorial');

  // ---- helpers ----
  function fadeOut(el, done) {
    if (!el) { if (done) done(); return; }
    el.classList.add('fade-out');
    let called = false;
    const finish = () => {
      if (called) return; called = true;
      el.classList.add('hidden'); el.classList.remove('fade-out');
      if (done) done();
    };
    el.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 650);
  }
  function showOverlay(el) { if (el) el.classList.remove('hidden', 'fade-out'); }
  function runLoading(bgUrl, done, ms) {
    loadingScreen.style.backgroundImage =
      'linear-gradient(rgba(6,14,22,.5), rgba(6,14,22,.68)), url(' + bgUrl + ')';
    showOverlay(loadingScreen);
    loadingFill.style.width = '0%';
    const t0 = performance.now();
    const iv = setInterval(() => {
      const p = Math.min(100, ((performance.now() - t0) / ms) * 100);
      loadingFill.style.width = p.toFixed(1) + '%';
    }, 30);
    setTimeout(() => { clearInterval(iv); loadingFill.style.width = '100%'; fadeOut(loadingScreen, done); }, ms);
  }

  function resetGame() {
    buildPlayer();
    obstacles.forEach(o => obstacleGroup.remove(o));
    stars.forEach(b => starGroup.remove(b));
    powerups.forEach(p => powerupGroup.remove(p));
    obstacles.length = 0; stars.length = 0; powerups.length = 0;

    const u = player.userData;
    u.lane = 1; u.x = LANES[1]; u.y = 0; u.vy = 0;
    u.jumping = false; u.rolling = false; u.rollT = 0;
    player.position.set(LANES[1], 0, PLAYER_Z);
    player.rotation.z = 0; player.scale.y = 1;

    speed = BASE_SPEED; distance = 0; starCount = 0; score = 0;
    grace = 0; iframes = 0; lives = 3; updateLives();
    combo = 0; comboTimer = 0; bestCombo = 0;
    speedBoostT = 0; magnetT = 0; shield = !!PLAYERS[selectedPlayer].shieldStart;
    styleBonus = 0; closeCalls = 0; kickoffBlasts = 0; noRollDist = 0;
    shakeT = 0; hitStopT = 0; dyingT = 0;
    invisibleT = 0; ghostOn = false; nextFreeKickAt = 100;
    freeKickReady = false; ballKicked = false; ballReturning = false;
    fkReady.classList.add('hidden');
    ball.position.copy(LEG_POS);
    setPlayerGhost(false);
    invisHud.classList.add('hidden'); freeKick.classList.add('hidden'); powerHud.classList.add('hidden');
    comboEl.classList.add('hidden'); comboEl.classList.remove('broken', 'bump');
    nextSpawnGap = 24; nextSpawnDist = 0;
    tutorialT = tutorialShown ? 0 : 6;

    referee.userData.whistle = true;
    referee.position.set(3, 0, 2);
    if (!referee.parent) scene.add(referee);
    if (introOpp) { scene.remove(introOpp); introOpp = null; }
    introOpp = K.Opponent.create(1, 'player', 9);
    introOpp.position.set(0, 0, -7);
    scene.add(introOpp);
  }

  function startGame(world) {
    if (world) currentWorld = world;
    field = K.Field.create(scene, currentWorld);
    applyLighting(currentWorld);
    resetGame();
    introT = 0;
    state = 'intro'; paused = false; pauseScreen.classList.add('hidden');
    overScreen.classList.add('hidden');
    fadeOut(worldScreen);
    introBanner.classList.remove('hidden');
    introL1.textContent = 'REFEREE WHISTLES';
    introL2.textContent = 'KICK OFF!';
    introL3.textContent = 'Get ready…';
    introL1.style.display = ''; introL3.style.display = '';
    introSwitched = false;
    K.Audio.init();
    const playKickoff = () => { K.Audio.sfx.whistle(); K.Audio.startMusic(); };
    const p = K.Audio.resume();
    if (p && p.then) p.then(playKickoff); else playKickoff();
  }

  function gameOver() {
    state = 'dying';
    dyingT = 0.14;
    K.Audio.sfx.crash();
    K.Audio.stopMusic();
    particles.smoke(player.position.clone().add(new THREE.Vector3(0, 1, 0)));
    shakeT = 0.35;
    flash.style.transition = 'none'; flash.style.opacity = '0.85';
    requestAnimationFrame(() => { flash.style.transition = 'opacity .4s'; flash.style.opacity = '0'; });
  }
  function finishGameOver() {
    state = 'over';
    const d = Math.floor(distance);
    const isBest = d > best;
    if (isBest) best = d;
    const entry = { d, score, stars: starCount, combo: bestCombo, date: new Date().toLocaleDateString() };
    leaderboard.push(entry);
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 5);
    document.getElementById('finalScore').textContent = d;
    document.getElementById('finalScoreVal').textContent = score;
    document.getElementById('finalStars').textContent = starCount;
    document.getElementById('finalCombo').textContent = 'x' + (bestCombo >= 50 ? 5 : bestCombo >= 30 ? 4 : bestCombo >= 15 ? 3 : bestCombo >= 5 ? 2 : 1) + ' (' + bestCombo + ')';
    document.getElementById('finalClose').textContent = closeCalls;
    document.getElementById('finalBlasts').textContent = kickoffBlasts;
    document.getElementById('finalStyle').textContent = styleBonus;
    document.getElementById('bestLine').textContent = best;
    document.getElementById('bestBanner').classList.toggle('hidden', !isBest);
    const lb = document.getElementById('leaderboard');
    lb.innerHTML = '';
    leaderboard.forEach(e => {
      const li = document.createElement('li');
      li.textContent = e.score + ' pts · ' + e.d + 'm · ' + e.stars + '⭐';
      lb.appendChild(li);
    });
    freeKick.classList.add('hidden');
    fkReady.classList.add('hidden');
    overScreen.classList.remove('hidden');
  }

  function setPlayerGhost(on) {
    player.traverse(n => {
      if (n.isMesh && n.material) {
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        mats.forEach(m => { m.transparent = false; m.opacity = 1; m.depthWrite = true; });
      }
    });
    playerGlow.color.set(0x2a3bff);
    playerGlow.intensity = on ? 1.6 : 0;
    playerAura.visible = on;
    playerAura.material.color.set(0x141a33);
    playerAura.material.opacity = on ? 0.34 : 0;
  }
  function fadeObj(obj, op) {
    obj.traverse(n => {
      if (n.isMesh && n.material) {
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        mats.forEach(m => { m.transparent = op < 1; m.opacity = op; });
      }
    });
  }
  function flashScreen(a) {
    flash.style.transition = 'none'; flash.style.opacity = a;
    requestAnimationFrame(() => { flash.style.transition = 'opacity .5s'; flash.style.opacity = '0'; });
  }

  function awardFreeKick() { freeKickReady = true; fkReady.classList.remove('hidden'); }
  function shootFreeKick() {
    freeKickReady = false;
    invisibleT = PLAYERS[selectedPlayer].blast; // KICKOFF BLAST duration (per-team)
    kickoffBlasts++;
    fovKick = 1; // smooth camera punch
    K.Audio.sfx.whistle();
    K.Audio.sfx.goal();
    particles.confetti(player.position.clone().add(new THREE.Vector3(0, 1.4, 0)));
    flashScreen(0.4);
    ballKicked = true; ballReturning = false; ballKickT = 0;
    fkReady.classList.add('hidden');
    fk1.textContent = 'KICKOFF BLAST!'; fk2.style.display = 'none';
    freeKick.classList.remove('hidden'); freeKick.classList.add('fk-show');
    setTimeout(() => { freeKick.classList.add('hidden'); freeKick.classList.remove('fk-show'); }, 1400);
    invisHud.classList.remove('hidden');
  }

  // ---- spawning ----
  function spawnChunk(z) {
    if (Math.random() < KEEPER_CHANCE) {
      const o = K.Opponent.create(1, 'keeper', 1);
      o.position.z = z; o.userData.z = z;
      obstacleGroup.add(o); obstacles.push(o);
      return;
    }
    const order = [0, 1, 2];
    for (let i = order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
    const blockedCount = Math.random() < 0.55 ? 1 : 2;
    for (let i = 0; i < blockedCount; i++) {
      const lane = order[i];
      const o = K.Opponent.create(lane, 'player', 2 + ((Math.random() * 9) | 0));
      o.position.x = LANES[lane]; o.position.z = z; o.userData.z = z;
      obstacleGroup.add(o); obstacles.push(o);
    }
    const freeLane = order[blockedCount];
    const n = 3 + ((Math.random() * 4) | 0);
    let orbSpawned = false, orbIdx = -1, orbType = 'speed';
    if (Math.random() < 0.10) {
      orbSpawned = true; orbIdx = (Math.random() * n) | 0;
      const types = ['speed', 'magnet', 'shield', 'life'];
      orbType = types[(Math.random() * types.length) | 0];
    }
    for (let i = 0; i < n; i++) {
      const pz = z + i * 1.6;
      if (orbSpawned && i === orbIdx) {
        const orb = K.PowerUps.createOrb(orbType);
        orb.position.set(LANES[freeLane], 1.0, pz);
        orb.userData.z = pz; orb.userData.lane = freeLane; orb.userData.type = orbType; orb.userData.bob = Math.random() * 6;
        powerupGroup.add(orb); powerups.push(orb);
        continue;
      }
      const b = K.Star.create();
      b.position.set(LANES[freeLane], 1.0, pz);
      b.userData.z = pz; b.userData.lane = freeLane;
      starGroup.add(b); stars.push(b);
    }
  }

  // ---- input ----
  function moveLane(dir) {
    if (state !== 'playing' || paused) return;
    if (tutorialT > 0) tutorialT = 0;
    const u = player.userData;
    const nl = Math.min(2, Math.max(0, u.lane + dir));
    if (nl !== u.lane) u.lane = nl;
  }
  function doJump() {
    if (state !== 'playing' || paused) return;
    if (tutorialT > 0) tutorialT = 0;
    const u = player.userData;
    if (!u.jumping && !u.rolling) { u.vy = JUMP_V; u.jumping = true; K.Audio.sfx.jump(); }
  }
  function doRoll() {
    if (state !== 'playing' || paused) return;
    if (tutorialT > 0) tutorialT = 0;
    const u = player.userData;
    if (!u.rolling && !u.jumping) { u.rolling = true; u.rollT = ROLL_TIME; K.Audio.sfx.roll(); }
    else if (u.jumping) { u.vy = -JUMP_V * 1.4; }
  }
  function togglePause() {
    if (state !== 'playing') return;
    paused = !paused;
    pauseScreen.classList.toggle('hidden', !paused);
  }

  window.addEventListener('keydown', e => {
    if (state === 'help') {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); showMainMenu(); }
      return;
    }
    if (state === 'menu') {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); showWorldScreen(); }
      return;
    }
    if (state === 'world') {
      if (e.key === ' ') { e.preventDefault(); startWithLoad(); }
      else if (e.key === 'Escape') { e.preventDefault(); showMainMenu(); }
      return;
    }
    if (state === 'options' || state === 'customize') {
      if (e.key === 'Escape') { e.preventDefault(); showMainMenu(); }
      return;
    }
    if (state === 'farewell') {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); showMainMenu(); }
      return;
    }
    if (freeKickReady && e.key === ' ') { e.preventDefault(); shootFreeKick(); return; }
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': moveLane(-1); break;
      case 'ArrowRight': case 'd': case 'D': moveLane(1); break;
      case 'ArrowUp': case 'w': case 'W': case ' ': doJump(); e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S': doRoll(); break;
      case 'm': case 'M': K.Audio.toggle(); break;
      case 'p': case 'P': case 'Escape': togglePause(); break;
      case 'r': case 'R': if (['playing', 'over', 'world', 'intro', 'dying'].indexOf(state) >= 0) startGame(); break;
    }
  });

  let tx = 0, ty = 0, tActive = false;
  renderer.domElement.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; tActive = true; }, { passive: true });
  renderer.domElement.addEventListener('touchend', e => {
    if (!tActive) return; tActive = false;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > Math.abs(dy)) { if (Math.abs(dx) > 24) moveLane(dx > 0 ? 1 : -1); }
    else { if (Math.abs(dy) > 24) { dy < 0 ? doJump() : doRoll(); } }
  }, { passive: true });

  document.getElementById('restartBtn').addEventListener('click', () => startGame());

  const worldScreen = document.getElementById('worldScreen');
  const helpScreen = document.getElementById('helpScreen');
  const helpContinue = document.getElementById('helpContinue');
  const changeWorldBtn = document.getElementById('changeWorldBtn');
  const mainMenu = document.getElementById('mainMenu');
  const optionsScreen = document.getElementById('optionsScreen');
  const customizeScreen = document.getElementById('customizeScreen');
  const farewellScreen = document.getElementById('farewellScreen');

  const ALL_OVERLAYS = [mainMenu, optionsScreen, customizeScreen, farewellScreen, worldScreen, helpScreen, overScreen, pauseScreen, loadingScreen];
  function hideAllOverlays() { ALL_OVERLAYS.forEach(el => { if (el) el.classList.add('hidden'); }); }

  function showMainMenu() {
    hideAllOverlays();
    showOverlay(mainMenu);
    state = 'menu';
  }
  function showHelp() {
    hideAllOverlays();
    showOverlay(helpScreen);
    state = 'help';
  }
  function showWorldScreen() {
    state = 'world'; paused = false;
    K.Audio.stopMusic(); K.Audio.stopAmbient();
    hideAllOverlays();
    const p = PLAYERS[selectedPlayer];
    const asEl = document.getElementById('playingAs');
    if (asEl) asEl.textContent = 'PLAYING AS  ' + p.full + '  #' + p.number + '  ·  ' + p.country;
    showOverlay(worldScreen);
  }
  function showOptions() {
    hideAllOverlays();
    showOverlay(optionsScreen);
    state = 'options';
  }

  // ---- customize: 3D player preview ----
  let previewRenderer = null, previewScene = null, previewCam = null, previewPlayer = null, previewPhase = 0;
  function initPreview() {
    if (previewRenderer) return;
    const canvas = document.getElementById('previewCanvas');
    previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    previewRenderer.setSize(260, 340, false);
    previewScene = new THREE.Scene();
    previewCam = new THREE.PerspectiveCamera(42, 260 / 340, 0.1, 100);
    previewCam.position.set(0, 1.85, 5.2);
    previewCam.lookAt(0, 1.35, 0);
    previewScene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 1.0));
    const dl = new THREE.DirectionalLight(0xffffff, 1.25); dl.position.set(3, 6, 4); previewScene.add(dl);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.3, 32),
      new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 1 }));
    disc.rotation.x = -Math.PI / 2; previewScene.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.25, 2.4, 32),
      new THREE.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; previewScene.add(ring);
  }
  function setPreview(id) {
    initPreview();
    if (previewPlayer) previewScene.remove(previewPlayer.group);
    previewPlayer = K.Player.create(previewScene, PLAYERS[id]);
    // show the kit front (chest) to the camera; ball isn't needed in the preview
    previewPlayer.group.rotation.y = Math.PI;
    if (previewPlayer.group.userData.ball) previewPlayer.group.userData.ball.visible = false;
  }
  function buildPlayerList() {
    const list = document.getElementById('playerList');
    if (!list || list.childElementCount) return;
    Object.keys(PLAYERS).forEach(id => {
      const p = PLAYERS[id];
      const card = document.createElement('button');
      card.className = 'player-card'; card.dataset.player = id;
      card.innerHTML = '<span class="pc-num">#' + p.number + '</span>' +
        '<span class="pc-name">' + p.full + '</span>' +
        '<span class="pc-country">' + p.country + '</span>';
      card.addEventListener('click', () => selectPlayer(id));
      list.appendChild(card);
    });
  }
  function selectPlayer(id) {
    selectedPlayer = id;
    document.querySelectorAll('.player-card').forEach(c => c.classList.toggle('selected', c.dataset.player === id));
    const p = PLAYERS[id];
    const n = document.getElementById('custName'); if (n) n.textContent = p.full;
    const num = document.getElementById('custNum'); if (num) num.textContent = '#' + p.number;
    const c = document.getElementById('custCountry'); if (c) c.textContent = p.country;
    setPreview(id);
  }
  function showCustomize() {
    hideAllOverlays();
    showOverlay(customizeScreen);
    state = 'customize';
    buildPlayerList();
    selectPlayer(selectedPlayer);
  }
  function showFarewell() {
    hideAllOverlays();
    showOverlay(farewellScreen);
    state = 'farewell';
  }
  function showWorld() { showWorldScreen(); }

  function startWithLoad() {
    state = 'loading';
    worldScreen.classList.add('hidden');
    runLoading('assets/loading_bg_' + currentWorld + '.png', () => startGame(), 1100);
  }

  if (helpContinue) helpContinue.addEventListener('click', showMainMenu);
  if (mainMenu) {
    document.getElementById('startBtn').addEventListener('click', showWorldScreen);
    document.getElementById('optionsBtn').addEventListener('click', showOptions);
    document.getElementById('customizeBtn').addEventListener('click', showCustomize);
    document.getElementById('exitBtn').addEventListener('click', showFarewell);
    const howto = document.getElementById('howtoBtn');
    if (howto) howto.addEventListener('click', showHelp);
  }
  if (optionsScreen) document.getElementById('optionsBack').addEventListener('click', showMainMenu);
  if (customizeScreen) document.getElementById('custBack').addEventListener('click', showMainMenu);
  if (farewellScreen) document.getElementById('farewellPlay').addEventListener('click', showMainMenu);

  document.querySelectorAll('.world-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.world-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      currentWorld = card.dataset.world;
    });
  });
  if (changeWorldBtn) changeWorldBtn.addEventListener('click', showWorldScreen);

  // first screen: loading -> main menu
  helpScreen.classList.add('hidden');
  worldScreen.classList.add('hidden');
  runLoading('assets/lobby_bg_main.png', () => { showMainMenu(); }, 1300);

  // pause controls
  document.getElementById('resumeBtn').addEventListener('click', togglePause);
  document.getElementById('pauseRestart').addEventListener('click', () => startGame());
  document.getElementById('pauseWorld').addEventListener('click', () => { paused = false; pauseScreen.classList.add('hidden'); showWorldScreen(); });
  document.getElementById('muteBtn').addEventListener('click', () => { const on = K.Audio.toggle(); document.getElementById('muteBtn').textContent = on ? 'MUTE' : 'UNMUTE'; });
  const volMusic = document.getElementById('volMusic');
  const volSfx = document.getElementById('volSfx');
  if (volMusic) volMusic.addEventListener('input', () => { if (K.Audio.musicGainSet) K.Audio.musicGainSet(volMusic.value / 100); });
  if (volSfx) volSfx.addEventListener('input', () => { if (K.Audio.masterGainSet) K.Audio.masterGainSet(volSfx.value / 100); });
  const optMusic = document.getElementById('optMusic');
  const optSfx = document.getElementById('optSfx');
  if (optMusic) optMusic.addEventListener('input', () => { if (K.Audio.musicGainSet) K.Audio.musicGainSet(optMusic.value / 100); });
  if (optSfx) optSfx.addEventListener('input', () => { if (K.Audio.masterGainSet) K.Audio.masterGainSet(optSfx.value / 100); });

  // ---- collisions ----
  function updateLives() {
    let s = '';
    for (let i = 0; i < MAX_LIVES; i++) s += (i < lives ? '♥' : '♡');
    livesHud.textContent = s;
  }
  function checkObstacle(o) {
    if (state !== 'playing') return;
    if (grace > 0 || iframes > 0) return;
    if (invisibleT > 0) { smashObstacle(o); return; }
    if (o.userData.frozen) return;
    const u = player.userData, d = o.userData;
    const near = Math.abs(o.position.z - PLAYER_Z) < d.halfDepth + 0.4;
    if (!near) return;
    if (d.type === 'keeper') { if (u.y < d.clearHeight) { if (shield) absorbHit(); else hitPlayer(); } }
    else { if (Math.abs(u.x - o.position.x) < 0.85) { if (shield) absorbHit(); else hitPlayer(); } }
  }
  function smashObstacle(o) {
    const idx = obstacles.indexOf(o);
    if (idx < 0) return;
    obstacles.splice(idx, 1);
    obstacleGroup.remove(o);
    particles.smoke(o.position.clone().add(new THREE.Vector3(0, 1, 0)));
  }
  function hitPlayer() {
    if (shield) { absorbHit(); return; }
    lives--;
    updateLives();
    breakCombo();
    if (lives <= 0) { gameOver(); return; }
    iframes = 2.0;
    shakeT = 0.3; flashScreen(0.5);
    K.Audio.sfx.crash();
    // give breathing room: clear defenders right around the player
    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (obstacles[i].position.z > -2 && obstacles[i].position.z < 4) {
        obstacleGroup.remove(obstacles[i]); obstacles.splice(i, 1);
      }
    }
  }
  function absorbHit() {
    shield = false; iframes = 1.2;
    particles.shatter(player.position.clone().add(new THREE.Vector3(0, 1, 0)), 0x4fd17a);
    K.Audio.sfx.shieldBreak();
  }
  function checkStar(b) {
    const u = player.userData;
    if (Math.abs(b.position.z - PLAYER_Z) < 0.8 && Math.abs(u.x - b.position.x) < 1.2) {
      const top = u.y + (u.rolling ? u.rollHeight : u.height);
      const cy = b.position.y;
      if (top > cy - 0.7 && u.y < cy + 0.7) {
        starGroup.remove(b); stars.splice(stars.indexOf(b), 1);
        starCount++;
        combo++; comboTimer = COMBO_TIMEOUT * PLAYERS[selectedPlayer].combo;
        const mult = comboMult(combo);
        const gain = Math.round(10 * mult * PLAYERS[selectedPlayer].star);
        score += gain;
        if (combo > bestCombo) bestCombo = combo;
        particles.starBurst(b.position.clone());
        K.Audio.sfx.star();
        if (combo === 5 || combo === 15 || combo === 30 || combo === 50) {
          K.Audio.sfx.combo(mult);
          comboMultEl.textContent = 'x' + mult;
          comboEl.classList.remove('hidden');
          comboEl.classList.add('bump'); setTimeout(() => comboEl.classList.remove('bump'), 130);
        }
        if (u.jumping && !u.rolling) { score += 25; styleBonus += 25; }
        if (starCount >= nextFreeKickAt) { awardFreeKick(); nextFreeKickAt += 100; }
      }
    }
  }
  function comboMult(c) { return c >= 50 ? 5 : c >= 30 ? 4 : c >= 15 ? 3 : c >= 5 ? 2 : 1; }
  function breakCombo() {
    if (combo >= 5) { comboEl.classList.add('broken'); setTimeout(() => comboEl.classList.remove('broken'), 300); }
    combo = 0; comboTimer = 0; comboEl.classList.add('hidden');
  }

  function collectPowerup(type) {
    K.Audio.sfx.power();
    if (type === 'speed') speedBoostT = 4;
    else if (type === 'magnet') magnetT = 5;
    else if (type === 'shield') shield = true;
    else if (type === 'life') { if (lives < MAX_LIVES) { lives++; updateLives(); particles.starBurst(player.position.clone().add(new THREE.Vector3(0, 1.4, 0))); } }
    powerHud.classList.remove('hidden');
  }

  // ---- style bonuses (silent scoring, no text spam) ----
  function awardCloseCall() {
    styleBonus += 50; score += 50; closeCalls++;
    K.Audio.sfx.style();
  }
  function awardLimbo() {
    styleBonus += 100; score += 100;
    K.Audio.sfx.style();
  }

  // ---- update ----
  function update(dt) {
    const u = player.userData;
    const team = PLAYERS[selectedPlayer];
    const spd = (BASE_SPEED + Math.min(22, distance / 90)) * team.speed * (speedBoostT > 0 ? 1.4 : 1) * (invisibleT > 0 ? 1.3 : 1);
    speed = spd; distance += speed * dt;
    u.x += (LANES[u.lane] - u.x) * Math.min(1, dt * 12);
    player.position.x = u.x;

    if (u.jumping) { u.vy += GRAVITY * dt; u.y += u.vy * dt; if (u.y <= 0) { u.y = 0; u.vy = 0; u.jumping = false; } }
    if (u.rolling) { u.rollT -= dt; if (u.rollT <= 0) u.rolling = false; }
    player.position.y = u.y;

    // squash & stretch + lane lean
    const targetScaleY = u.rolling ? 0.5 : (u.jumping ? (u.vy > 0 ? 1.15 : 0.92) : 1);
    player.scale.y += (targetScaleY - player.scale.y) * Math.min(1, dt * 16);
    const lean = u.rolling ? -0.5 : (LANES[u.lane] - u.x) * 0.18;
    player.rotation.z += (lean - player.rotation.z) * Math.min(1, dt * 12);

    runPhase += dt * (10 + speed * 0.25);
    playerObj.animate(runPhase, u.rolling);

    if (grace > 0) { grace -= dt; player.visible = (Math.floor(grace * 8) % 2 === 0); if (grace <= 0) { player.visible = true; grace = 0; } }
    if (iframes > 0) iframes -= dt;

    // combo decay
    if (combo > 0) { comboTimer -= dt; if (comboTimer <= 0) breakCombo(); }

    // power-up timers + HUD
    if (speedBoostT > 0) speedBoostT -= dt;
    if (magnetT > 0) magnetT -= dt;
    if (shield || speedBoostT > 0 || magnetT > 0) {
      powerHud.classList.remove('hidden');
      if (shield) { powerIcon.textContent = '🛡️'; powerLabel.textContent = 'SHIELD'; powerFill.style.width = '100%'; }
      else if (speedBoostT > 0) { powerIcon.textContent = '⚡'; powerLabel.textContent = 'SPEED'; powerFill.style.width = (speedBoostT / 4 * 100) + '%'; }
      else { powerIcon.textContent = '🧲'; powerLabel.textContent = 'MAGNET'; powerFill.style.width = (magnetT / 5 * 100) + '%'; }
    } else powerHud.classList.add('hidden');

    // KICKOFF BLAST power run
    const wasGhost = ghostOn;
    ghostOn = invisibleT > 0;
    if (ghostOn) {
      invisibleT -= dt;
      invisNum.textContent = Math.max(1, Math.ceil(invisibleT));
      invisFill.style.width = (Math.max(0, invisibleT) / PLAYERS[selectedPlayer].blast * 100) + '%';
      if (invisibleT <= 0) {
        ghostOn = false; invisibleT = 0;
        invisHud.classList.add('hidden');
        ballReturning = true; ballReturnT = 0; ballReturnFrom.copy(ball.position);
      }
    }
    if (ghostOn !== wasGhost) setPlayerGhost(ghostOn);
    fkFill.style.width = (freeKickReady ? 100 : (starCount % 100) / 100 * 100) + '%';

    if (ballKicked) {
      if (ballReturning) {
        ballReturnT += dt / 0.5; const k = Math.min(1, ballReturnT), e = k * k * (3 - 2 * k);
        ball.position.lerpVectors(ballReturnFrom, LEG_POS, e); ball.rotation.x -= dt * 12;
        if (k >= 1) { ballKicked = false; ball.position.copy(LEG_POS); }
      } else {
        ballKickT += dt; const k = Math.min(1, ballKickT / 0.35), e = k * k * (3 - 2 * k);
        ball.position.lerpVectors(LEG_POS, BALL_AHEAD, e); ball.rotation.x -= dt * 16;
      }
    }

    // style: speed demon (100m without rolling)
    if (u.rolling) noRollDist = 0;
    else { noRollDist += speed * dt; if (noRollDist >= 100) { noRollDist -= 100; styleBonus += 200; score += 200; K.Audio.sfx.style(); } }

    // tutorial overlay — shows on first run, dismisses on any input or after a few seconds
    if (tutorialT > 0) {
      tutorialT -= dt;
      tutorialEl.classList.remove('hidden');
      if (tutorialT <= 0) { tutorialEl.classList.add('hidden'); tutorialShown = true; }
    } else {
      tutorialEl.classList.add('hidden');
    }

    const moveAmt = speed * dt;
    field.scroll(moveAmt);
    field.update(distance, dt);

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.position.z += moveAmt; o.userData.z = o.position.z;
      if (!o.userData.frozen) o.userData.animate && o.userData.animate(dt);
      // style: reward a clean dodge / limbo as the rival passes
      if (!o.userData.scored && o.position.z > PLAYER_Z + 0.5) {
        o.userData.scored = true;
        if (o.userData.type === 'player' && Math.abs(u.x - o.position.x) > 0.85) awardCloseCall();
        else if (o.userData.type === 'keeper' && u.rolling && u.y > 0 && u.y < 1.6) awardLimbo();
      }
      if (o.userData.z > DESPAWN_Z) { obstacleGroup.remove(o); obstacles.splice(i, 1); continue; }
      checkObstacle(o);
      if (state !== 'playing') return;
    }
    for (let i = stars.length - 1; i >= 0; i--) {
      const b = stars[i];
      if (magnetT > 0) b.position.x += (u.x - b.position.x) * Math.min(1, dt * 6);
      b.position.z += moveAmt; b.userData.z = b.position.z;
      if (b.userData.z > DESPAWN_Z) { starGroup.remove(b); stars.splice(i, 1); continue; }
      checkStar(b);
    }
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.userData.bob += dt * 3;
      p.position.y = 1.0 + Math.sin(p.userData.bob) * 0.15;
      p.userData.core.rotation.y += dt * 2; p.userData.core.rotation.x += dt * 1.3;
      p.position.z += moveAmt; p.userData.z = p.position.z;
      if (p.userData.z > DESPAWN_Z) { powerupGroup.remove(p); powerups.splice(i, 1); continue; }
      if (Math.abs(p.position.z - PLAYER_Z) < 0.9 && Math.abs(u.x - p.position.x) < 1.3) {
        powerupGroup.remove(p); powerups.splice(i, 1); collectPowerup(p.userData.type);
      }
    }

    if (distance >= nextSpawnDist) {
      spawnChunk(SPAWN_Z);
      nextSpawnDist += 24 + Math.random() * 16;
    }
  }

  function prefillTrack() {
    let z = SPAWN_Z;
    while (z < -20) { spawnChunk(z); z += 16 + Math.random() * 12; }
    nextSpawnDist = 16 + Math.random() * 12;
  }

  function updateIntro(dt) {
    introT += dt;
    runPhase += dt * 6;
    playerObj.animate(runPhase, false);
    if (introOpp) introOpp.userData.animate(dt);
    referee.userData.animate(dt);
    field.update(0, dt);

    if (introT < INTRO_HOLD) { camera.position.copy(CAM_INTRO_POS); camLook.copy(CAM_INTRO_LOOK); }
    else {
      if (!introSwitched) { introSwitched = true; introL1.style.display = 'none'; introL3.style.display = 'none'; introL2.textContent = 'GAME STARTS!!'; }
      const t = Math.min(1, (introT - INTRO_HOLD) / INTRO_TRANS);
      const s = t * t * (3 - 2 * t);
      camera.position.lerpVectors(CAM_INTRO_POS, CAM_GAME_POS, s);
      camLook.lerpVectors(CAM_INTRO_LOOK, CAM_GAME_LOOK, s);
      referee.position.set(3 + 9 * s, 0, 2 - s);
    }
    camera.lookAt(camLook);

    if (introT >= INTRO_HOLD + INTRO_TRANS) {
      introBanner.classList.add('hidden');
      referee.userData.whistle = false;
      scene.remove(referee);
      if (introOpp) { scene.remove(introOpp); introOpp = null; }
      grace = 5;
      prefillTrack();
      state = 'playing';
    }
  }

  let last = performance.now();
  function loop(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;

    if (state === 'dying') {
      dyingT -= dt;
      if (dyingT <= 0) finishGameOver();
    } else if (!paused && state === 'playing') {
      update(dt);
    } else if (state === 'intro') {
      updateIntro(dt);
    }

    particles.update(dt);
    scoreEl.textContent = score;
    distEl.textContent = Math.floor(distance) + ' m';
    starEl.textContent = starCount;

    // camera shake
    if (shakeT > 0) {
      shakeT -= dt;
      const s = Math.max(0, shakeT) * 0.5;
      camera.position.set(CAM_GAME_POS.x + (Math.random() - 0.5) * s, CAM_GAME_POS.y + (Math.random() - 0.5) * s, CAM_GAME_POS.z);
    } else if (state === 'playing' || state === 'dying') {
      camera.position.copy(CAM_GAME_POS);
    }

    // smooth KICKOFF BLAST camera punch (eases back to base fov)
    fovKick += (0 - fovKick) * Math.min(1, dt * 3.5);
    camera.fov = 60 + fovKick * 9;
    camera.updateProjectionMatrix();

    composer.render();

    if (state === 'customize' && previewPlayer && previewRenderer) {
      previewPhase += dt * 7;
      previewPlayer.animate(previewPhase, false);
      previewPlayer.group.rotation.y += dt * 0.5;
      previewRenderer.render(previewScene, previewCam);
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.setSize(window.innerWidth, window.innerHeight);
    setFxaa();
  });
})();
