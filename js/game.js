// game.js — orchestrates scene, player, opponents, input, loop and HUD.
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  // Surface any runtime error on screen instead of an infinite loading spinner.
  function showFatal(msg) {
    const t = document.getElementById('loadingText');
    const ring = document.querySelector('.loader-ring');
    if (ring) ring.style.display = 'none';
    if (t) { t.textContent = 'ERROR: ' + msg; t.style.color = '#ff6b6b'; t.style.whiteSpace = 'pre-wrap'; }
    const ls = document.getElementById('loadingScreen');
    if (ls) { ls.classList.remove('hidden'); ls.style.display = 'flex'; }
  }
  window.addEventListener('error', e => {
    showFatal((e && e.message ? e.message : 'unknown') + (e && e.filename ? '\n@ ' + e.filename + ':' + e.lineno : ''));
  });
  window.addEventListener('unhandledrejection', e => {
    showFatal('promise: ' + (e && e.reason ? (e.reason.message || e.reason) : 'unknown'));
  });
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

  // ---- Career / level progression ----
  // The 3 worlds form a footballer's "life journey" (career order).
  const LEVELS = ['beach', 'indoor', 'worldcup'];
  const LEVEL_NAMES = { beach: 'THE ROOTS', indoor: 'THE GRIND', worldcup: 'THE PRIME' };
  // A level N unlocks when ALL three LIFETIME requirements are met.
  const UNLOCK_REQ = {
    2: { goals: 3,  m: 2000, stars: 200 },   // Indoor  — "The Grind"
    3: { goals: 8,  m: 5000, stars: 600 }    // World Cup — "The Prime"
  };
  // Per-level difficulty ramp (speed mult + spawn density mult).
  const DIFFICULTY = {
    beach:    { speed: 1.00, density: 1.00 },
    indoor:   { speed: 1.20, density: 1.20 },
    worldcup: { speed: 1.40, density: 1.40 }
  };

  // Generic kits (colour selection only — no real players). Each has its own balanced stats.
  const KITS = {
    red:    { key: 'red',    label: 'RED DEVILS',    jersey: 0xc8102e, shorts: 0xf2f2f2, skin: 0xe8b487, speed: 1.05, star: 1.0, combo: 1.0, blast: 5, shieldStart: false },
    blue:   { key: 'blue',   label: 'BLUE LIONS',    jersey: 0x2d4a6b, shorts: 0x111418, skin: 0xb07a44, speed: 1.00, star: 1.0, combo: 1.0, blast: 6, shieldStart: false },
    gold:   { key: 'gold',   label: 'GOLDEN EAGLES', jersey: 0xe0a63c, shorts: 0x111418, skin: 0xcf9b6b, speed: 1.05, star: 1.1, combo: 1.0, blast: 5, shieldStart: false },
    black:  { key: 'black',  label: 'BLACK PANTHERS',jersey: 0x222831, shorts: 0xf2f2f2, skin: 0xe8b487, speed: 1.00, star: 1.0, combo: 1.6, blast: 5, shieldStart: false },
    rainbow:{ key: 'rainbow',label: 'PINK STORM',    jersey: 0xff1493, shorts: 0x101820, skin: 0xcf9b6b, speed: 1.03, star: 1.0, combo: 1.3, blast: 6, shieldStart: false }
  };

  // ---- persistent career state (localStorage) ----
  const CAREER_KEY = 'kickoff_career';
  const LB_KEY = 'kickoff_leaderboard';
  function defaultCareer() {
    return { unlocked: 1, lifetimeGoals: 0, lifetimeM: 0, lifetimeStars: 0, newLevel: 0,
             name: 'PLAYER', number: 10, kit: 'red' };
  }
  function loadCareer() {
    try {
      const raw = localStorage.getItem(CAREER_KEY);
      if (!raw) return defaultCareer();
      const c = Object.assign(defaultCareer(), JSON.parse(raw));
      if (LEVELS.indexOf(c.kit) < 0) c.kit = 'red';
      c.number = Math.max(0, Math.min(99, parseInt(c.number, 10) || 0));
      c.name = (c.name || 'PLAYER').toString().slice(0, 12).toUpperCase();
      return c;
    } catch (e) { return defaultCareer(); }
  }
  function saveCareer() { try { localStorage.setItem(CAREER_KEY, JSON.stringify(career)); } catch (e) {} }
  function loadLeaderboard() {
    try { const raw = localStorage.getItem(LB_KEY); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  }
  function saveLeaderboard() { try { localStorage.setItem(LB_KEY, JSON.stringify(leaderboard)); } catch (e) {} }

  let career = loadCareer();
  function currentKit() { return KITS[career.kit] || KITS.red; }

  const container = document.getElementById('game');

  // ---- adaptive quality: target buttery-smooth on the weakest hardware ----
  // Anything with few cores / low DPR / mobile / small screen is treated as low-end.
  const cores = navigator.hardwareConcurrency || 4;
  const LOW_END = cores <= 4 || (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
                  /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 900;
  const PIXEL_CAP = LOW_END ? 1.0 : Math.min(window.devicePixelRatio, 1.25);
  const SHADOWS = !LOW_END;          // shadows are the single most expensive feature
  const USE_FXAA = !LOW_END;         // FXAA is a full extra full-screen pass
  const BLOOM_SCALE = LOW_END ? 0.25 : 0.5;

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(PIXEL_CAP);
  renderer.shadowMap.enabled = SHADOWS;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 4.4, 9);
  camera.lookAt(0, 1.4, -12);

  const hemi = new THREE.HemisphereLight(0xcfe4f5, 0x4a5a3a, 0.45);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff6e6, 1.35);
  sun.position.set(14, 34, 12);
  sun.castShadow = SHADOWS;
  if (SHADOWS) {
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
    sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
  }
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
    sun.color.setHex(L.sun.color); sun.intensity = L.sun.intensity; sun.castShadow = SHADOWS && L.sun.shadow;
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
  const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth * BLOOM_SCALE, window.innerHeight * BLOOM_SCALE), 0.35, 0.45, 0.92);
  composer.addPass(bloomPass);
  composer.addPass(new THREE.ShaderPass(VignetteShader));
  let fxaaPass = null;
  if (USE_FXAA) {
    fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
    function setFxaa() {
      const pr = renderer.getPixelRatio();
      fxaaPass.material.uniforms.resolution.value.set(1 / (window.innerWidth * pr), 1 / (window.innerHeight * pr));
    }
    setFxaa();
    composer.addPass(fxaaPass);
  }

  let field = K.Field.create(scene, 'worldcup');
  applyLighting('worldcup');
  let playerObj = null, player = null, ball = null;
  let playerGlow = null, playerAura = null;
  function buildPlayer() {
    if (playerObj) scene.remove(player);
    const kit = currentKit();
    kit.name = career.name; kit.number = career.number; kit.country = kit.label;
    playerObj = K.Player.create(scene, kit);
    player = playerObj.group;
    ball = player.userData.ball;
    if (!playerGlow) {
      playerGlow = new THREE.PointLight(0x66e0ff, 0, 7);
      playerGlow.position.set(0, 1.2, 0);
      playerAura = new THREE.Mesh(
        new THREE.SphereGeometry(1.7, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x6fd6ff, transparent: true, opacity: 0, depthWrite: false })
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
  let currentWorld = LEVELS[career.unlocked - 1] || 'beach';
  let best = 0;
  let introT = 0, introOpp = null, introSwitched = false;
  let invisibleT = 0, ghostOn = false, nextFreeKickAt = 100;
  const MAX_LIVES = 2;
  let lives = 2;
  let fovKick = 0;
  let freeKickReady = false, ballKicked = false, ballReturning = false, ballKickT = 0, ballReturnT = 0;
  // penalty box phase
  let penaltyT = 0, penMarker = 0, penResolved = false, penKeeperGrace = 0, penDifficulty = 0;
  let penaltyGoal = null, penaltyKeeper = null, penPhase = 'suspense', penPhaseT = 0;
  let penShotT = 0, penBallFly = -1, penKeeperDive = 0, penScored = false, penKeeperPhase = Math.random() * 10, penShotFinished = false, penShotStage = 'fly';
  let penResultCounted = false;
  let penBallTarget = new THREE.Vector3(), penReboundFrom = new THREE.Vector3(), penReboundTo = new THREE.Vector3();
  let goalCount = 0, nextPenaltyAt = 500, penaltyIndex = 0, lastPenaltyAt = 0;
  let slowmoT = 0;                 // slow-motion timer (visual lead-in to GOAL CHANCE)
  let penLead = null;              // visual goal+keeper that runs up before GOAL CHANCE
  let penLeadSpawned = false;      // ensures the lead-in spawns only once per chance
  let penLeadActive = false;       // true while the goal is flying in (run is frozen)
  const PEN_LEAD = 55;             // runway distance over which the goal flies in toward the player
  const ballReturnFrom = new THREE.Vector3();
  const LEG_POS = new THREE.Vector3(0, 0.32, -1.05);
  const BALL_AHEAD = new THREE.Vector3(0, 1.8, -11);
  const camLook = new THREE.Vector3();

  // combo / score
  let combo = 0, comboTimer = 0, bestCombo = 0;
  // power-ups
  let speedBoostT = 0, magnetT = 0, shieldT = 0;
  // style
  let styleBonus = 0, closeCalls = 0, kickoffBlasts = 0, noRollDist = 0;
  // juice
  let shakeT = 0, hitStopT = 0, dyingT = 0;
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
  const themeScreen = document.getElementById('themeScreen');
  const introSlides = document.getElementById('introSlides');
  const isBg = document.getElementById('isBg');
  const isPoem = document.getElementById('isPoem');
  const isCard = document.getElementById('isCard');
  const isEyebrow = document.getElementById('isEyebrow');
  const isTitle = document.getElementById('isTitle');
  const isText = document.getElementById('isText');
  const isTag = document.getElementById('isTag');
  const isDots = document.getElementById('isDots');
  const isNext = document.getElementById('isNext');
  const isSkip = document.getElementById('isSkip');
  const isFact = document.getElementById('isFact');
  const isFactText = document.getElementById('isFactText');
  const cardToastWrap = document.getElementById('cardToastWrap');
  const invisHud = document.getElementById('invisHud');
  const invisNum = document.getElementById('invisNum');
  const invisFill = document.getElementById('invisFill');
  const freeKick = document.getElementById('freeKick');
  const fk1 = document.getElementById('fk1');
  const fk2 = document.getElementById('fk2');
  const fkFill = document.getElementById('fkFill');
  const fkReady = document.getElementById('fkReady');
  const pauseScreen = document.getElementById('pauseScreen');
  const penaltyScreen = document.getElementById('penaltyScreen');
  const penaltyBanner = document.getElementById('penaltyBanner');
  const penaltyGreen = document.getElementById('penaltyGreen');
  const penaltyMarker = document.getElementById('penaltyMarker');
  const penaltySub = document.getElementById('penaltySub');
  const penaltyBar = document.getElementById('penaltyBar');
  const penaltyScore = document.getElementById('penaltyScore');
  const goalCountEl = document.getElementById('goalCount');
  const penMap = document.getElementById('penMap');
  const penMapDist = document.getElementById('penMapDist');
  const penMapFill = document.getElementById('penMapFill');
  const penMapPlayer = document.getElementById('penMapPlayer');
  const penMapFlag = document.getElementById('penMapFlag');

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

  function despawnOpponent(o) { obstacleGroup.remove(o); K.Opponent.release(o); }
  function despawnStar(b) { starGroup.remove(b); K.Star.release(b); }
  function despawnPowerup(p) { powerupGroup.remove(p); K.PowerUps.release(p); }

  function resetGame() {
    buildPlayer();
    obstacles.forEach(o => despawnOpponent(o));
    stars.forEach(b => { starGroup.remove(b); K.Star.release(b); });
    powerups.forEach(p => { powerupGroup.remove(p); K.PowerUps.release(p); });
    obstacles.length = 0; stars.length = 0; powerups.length = 0;

    const u = player.userData;
    u.lane = 1; u.x = LANES[1]; u.y = 0; u.vy = 0;
    u.jumping = false; u.rolling = false; u.rollT = 0;
    player.position.set(LANES[1], 0, PLAYER_Z);
    player.rotation.z = 0; player.scale.y = 1;

    speed = BASE_SPEED; distance = 0; starCount = 0; score = 0;
    grace = 0; iframes = 0; lives = 2; updateLives();
    penKeeperGrace = 0; penaltyT = 0;
    goalCount = 0; goalCountEl.textContent = '0';
    nextPenaltyAt = 500; lastPenaltyAt = 0; penaltyIndex = 0;
    slowmoT = 0; penLeadSpawned = false; penLeadActive = false; if (penLead) { scene.remove(penLead); penLead = null; }
    combo = 0; comboTimer = 0; bestCombo = 0;
    speedBoostT = 0; magnetT = 0; shieldT = currentKit().shieldStart ? 6 : 0;
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
    lastUnlocked = career.unlocked;

    referee.userData.whistle = true;
    referee.position.set(3, 0, 2);
    if (!referee.parent) scene.add(referee);
    if (introOpp) { scene.remove(introOpp); introOpp = null; }
    introOpp = K.Opponent.create(1, 'player', 9);
    introOpp.position.set(0, 0, -7);
    scene.add(introOpp);
  }

  let pendingIntro = false;

  function startGame(world) {
    hideAllOverlays();
    if (world) currentWorld = world;
    field = K.Field.create(scene, currentWorld);
    applyLighting(currentWorld);
    clearPenalty();
    resetGame();
    introT = 0;
    paused = false; pauseScreen.classList.add('hidden');
    overScreen.classList.add('hidden'); helpScreen.classList.add('hidden');
    document.getElementById('redCardPop').classList.add('hidden');
    if (pendingIntro) {
      pendingIntro = false;
      state = 'slides';
      playIntroSlides(beginIntro);
    } else {
      beginIntro();
    }
  }
  function beginIntro() {
    if (state === 'intro' || state === 'playing') return;
    clearTimeout(themeScreen._autoTimer);
    themeScreen.classList.add('hidden');
    state = 'intro';
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
  themeScreen.addEventListener('click', () => { if (state === 'theme') beginIntro(); });

  // ---- skippable cinematic loading intro (images + text overlay, music, manual NEXT) ----
  const INTRO_SLIDES = [
    {
      type: 'poem',
      img: 'assets/leonel_messi_childhood.png',
      lines: [
        'KICKOFF is the first step of every journey.',
        'Every player starts somewhere.',
        'The cards are the lessons.',
        'Your run ends not when you lose,',
        'but when you’re sent off , ',
        'and then you kick off again.'
      ]
    },
    { type: 'chapter', side: 'left',  img: 'assets/loading_bg_beach.png',     eyebrow: 'CHAPTER 01 — THE ROOTS', title: 'THE KICKOFF',  text: 'Every great career starts with a single kickoff — the first touch, the first dream. Ours begins on the sandy riverbanks of Rosario, Argentina, where a small boy played barefoot against the wind off the Paraná.' },
    { type: 'chapter', side: 'right', img: 'assets/loading_bg_indoor.png',    eyebrow: 'CHAPTER 02 — THE GRIND', title: 'THE CLUB',     text: 'Talent finds its way. The boy crosses an ocean to FC Barcelona, learning that touch, vision and heart beat raw power.', fact: 'Messi made his Barcelona first-team debut in 2004, aged 17, and went on to become the club’s all-time top scorer.' },
    { type: 'chapter', side: 'left',  img: 'assets/loading_bg_worldcup.png',  eyebrow: 'CHAPTER 03 — THE PRIME', title: 'THE WORLD CUP', text: 'The peak. The loudest stage in sport, where a nation holds its breath and the barefoot kid from Rosario chases the one trophy that had always escaped him.', fact: 'In 2022, at last, the boy from Rosario lifted the World Cup — completing football’s greatest career arc.' },
    { type: 'chapter', side: 'right', img: 'assets/lobby_bg_main.png',        eyebrow: 'KICKOFF RUSH',          title: 'YOUR KICKOFF', text: 'Every time you press play, you are that kid again, taking the first touch of a brand-new journey.' }
  ];
  const INTRO_SEEN_KEY = 'kickoff_intro_seen';
  function introSeen() { try { return localStorage.getItem(INTRO_SEEN_KEY) === '1'; } catch (e) { return false; } }
  function markIntroSeen() { try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch (e) {} }

  let slideIndex = 0, slideDone = null, slideActive = false;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function buildDots() {
    if (!isDots) return;
    isDots.innerHTML = '';
    INTRO_SLIDES.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = 'is-dot' + (i === 0 ? ' on' : '');
      isDots.appendChild(d);
    });
  }
  function showSlide(i) {
    const s = INTRO_SLIDES[i];
    const last = i === INTRO_SLIDES.length - 1;
    isBg.style.backgroundImage = "url('" + s.img + "')";
    introSlides.classList.remove('is-active');
    void introSlides.offsetWidth;
    introSlides.classList.add('is-active');
    introSlides.classList.toggle('is-side-left', s.side === 'left');
    introSlides.classList.toggle('is-side-right', s.side === 'right');
    if (s.type === 'poem') {
      isPoem.innerHTML = s.lines.map((t, idx) =>
        '<div class="is-line' + (idx === s.lines.length - 1 ? ' is-line-final' : '') +
        '" style="animation-delay:' + (0.35 + idx * 0.5) + 's">' + t + '</div>'
      ).join('');
      isPoem.classList.remove('hidden');
      isCard.classList.add('hidden');
      if (isFact) isFact.classList.add('hidden');
    } else {
      isEyebrow.textContent = s.eyebrow;
      isTitle.textContent = s.title;
      isText.textContent = s.text;
      if (isFact && isFactText) {
        if (s.fact) { isFactText.textContent = s.fact; isFact.classList.remove('hidden'); }
        else { isFact.classList.add('hidden'); }
      }
      isCard.classList.remove('hidden', 'is-left', 'is-right');
      isCard.classList.add(s.side === 'right' ? 'is-right' : 'is-left');
      isPoem.classList.add('hidden');
      introSlides.classList.remove('is-text-in');
      void introSlides.offsetWidth;
      introSlides.classList.add('is-text-in');
    }
    if (isTag) isTag.textContent = 'STORY · ' + pad2(i + 1) + ' / ' + pad2(INTRO_SLIDES.length);
    if (isNext) isNext.innerHTML = last ? 'START &#9656;' : 'NEXT &#9656;';
    if (isDots) {
      Array.from(isDots.children).forEach((d, idx) => d.classList.toggle('on', idx === i));
    }
  }
  function finishSlides() {
    if (!slideActive) return;
    slideActive = false;
    markIntroSeen();
    introSlides.classList.add('hidden');
    introSlides.classList.remove('is-active', 'is-text-in', 'is-side-left', 'is-side-right');
    const cb = slideDone; slideDone = null;
    if (cb) cb();
  }
  function nextSlide() {
    if (!slideActive) return;
    if (slideIndex >= INTRO_SLIDES.length - 1) { finishSlides(); return; }
    slideIndex++;
    showSlide(slideIndex);
  }
  function playIntroSlides(onDone) {
    slideDone = onDone;
    slideActive = true;
    slideIndex = 0;
    buildDots();
    showOverlay(introSlides);
    K.Audio.init();
    const p = K.Audio.resume();
    const startMusic = () => K.Audio.startMusic();
    if (p && p.then) p.then(startMusic); else startMusic();
    showSlide(0);
  }
  function skipSlides() { if (slideActive) finishSlides(); }
  if (isSkip) isSkip.addEventListener('click', skipSlides);
  if (isNext) isNext.addEventListener('click', nextSlide);
  window.addEventListener('keydown', (e) => {
    if (!slideActive) return;
    if (e.code === 'Escape') { e.preventDefault(); skipSlides(); }
    else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') { e.preventDefault(); nextSlide(); }
  });

  function redCard() {
    showBanner('RED CARD!', 'Sent off — game over', 'red');
    flashScreen(0.85, 'rgba(255,40,60,0.85)');
    document.getElementById('redCardPop').classList.remove('hidden');
    gameOver();
  }
  function gameOver() {
    state = 'dying';
    dyingT = 0.14;
    clearPenalty();
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
    saveLeaderboard();
    // ---- career / lifetime progression (persists across runs) ----
    career.lifetimeGoals += goalCount;
    career.lifetimeM += d;
    career.lifetimeStars += starCount;
    checkUnlocks();
    saveCareer();
    document.getElementById('finalScore').textContent = d;
    document.getElementById('finalScoreVal').textContent = score;
    document.getElementById('finalStars').textContent = starCount;
    document.getElementById('finalCombo').textContent = 'x' + (bestCombo >= 50 ? 5 : bestCombo >= 30 ? 4 : bestCombo >= 15 ? 3 : bestCombo >= 5 ? 2 : 1) + ' (' + bestCombo + ')';
    document.getElementById('finalClose').textContent = closeCalls;
    document.getElementById('finalBlasts').textContent = kickoffBlasts;
    document.getElementById('finalGoals').textContent = goalCount;
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
      if (n === playerAura) return; // keep the aura translucent + non-occluding
      if (n.isMesh && n.material) {
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        mats.forEach(m => { m.transparent = false; m.opacity = 1; m.depthWrite = true; });
      }
    });
    playerGlow.color.set(0x2a3bff);
    playerGlow.intensity = on ? 1.6 : 0;
    playerAura.visible = on;
    playerAura.material.color.set(0x6fd6ff);
    playerAura.material.opacity = on ? 0.16 : 0;
  }
  function fadeObj(obj, op) {
    obj.traverse(n => {
      if (n.isMesh && n.material) {
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        mats.forEach(m => { m.transparent = op < 1; m.opacity = op; });
      }
    });
  }
  function flashScreen(a, color) {
    if (color) flash.style.background = color;
    else flash.style.background = '';
    flash.style.transition = 'none'; flash.style.opacity = a;
    requestAnimationFrame(() => { flash.style.transition = 'opacity .5s'; flash.style.opacity = '0'; });
  }
  function showBanner(big, small, kind) {
    const toast = document.createElement('div');
    toast.className = 'card-toast ' + kind;
    const card = document.createElement('div');
    card.className = 'ct-card ' + kind;
    const text = document.createElement('div');
    text.className = 'ct-text';
    const b = document.createElement('div');
    b.className = 'ct-big'; b.textContent = big;
    const s = document.createElement('div');
    s.className = 'ct-small'; s.textContent = small || '';
    text.appendChild(b); text.appendChild(s);
    toast.appendChild(card); toast.appendChild(text);
    cardToastWrap.appendChild(toast);
    while (cardToastWrap.children.length > 3) cardToastWrap.removeChild(cardToastWrap.firstChild);
    requestAnimationFrame(() => toast.classList.add('out'));
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 4000);
  }

  // ---- level / career unlock logic ----
  function reqMet(level) {
    const r = UNLOCK_REQ[level]; if (!r) return true;
    return career.lifetimeGoals >= r.goals && career.lifetimeM >= r.m && career.lifetimeStars >= r.stars;
  }
  function reqText(level) {
    const r = UNLOCK_REQ[level]; if (!r) return '';
    const g = career.lifetimeGoals, m = Math.floor(career.lifetimeM), s = career.lifetimeStars;
    const goalPart = g + '/' + r.goals + ' goals';
    const mPart = m + '/' + r.m + ' m';
    const sPart = s + '/' + r.stars + ' ⭐';
    return 'Unlock: ' + goalPart + ' · ' + mPart + ' · ' + sPart;
  }
  // Raise unlocked level for any newly-met requirement (called at game-over).
  function checkUnlocks() {
    let changed = false;
    for (let lvl = career.unlocked + 1; lvl <= LEVELS.length; lvl++) {
      if (reqMet(lvl)) { career.unlocked = lvl; career.newLevel = lvl; changed = true; }
      else break;
    }
    return changed;
  }
  // Mid-run check: project lifetime = saved totals + current run progress, and
  // unlock the moment the threshold is crossed (run continues — non-interrupting).
  let lastUnlocked = career.unlocked;
  function checkUnlocksLive() {
    for (let lvl = lastUnlocked + 1; lvl <= LEVELS.length; lvl++) {
      const r = UNLOCK_REQ[lvl]; if (!r) break;
      const projGoals = career.lifetimeGoals + goalCount;
      const projM = career.lifetimeM + Math.floor(distance);
      const projStars = career.lifetimeStars + starCount;
      if (projGoals >= r.goals && projM >= r.m && projStars >= r.stars) {
        career.unlocked = lvl; career.newLevel = lvl;
        lastUnlocked = lvl;
        const world = LEVELS[lvl - 1];
        const name = LEVEL_NAMES[world] || world.toUpperCase();
        const worldName = world === 'beach' ? 'BEACH' : world === 'indoor' ? 'INDOOR' : 'WORLD CUP';
        const toast = lvl === 2
          ? 'You did so well — kick off your career and step into ' + name + '.'
          : 'You made it — stride into ' + name + ' under the lights.';
        showBanner(worldName + ' UNLOCKED!', toast, 'green');
        saveCareer();
        applyUnlocks();
      } else break;
    }
  }
  // Reflect unlock state onto the world-select cards.
  function applyUnlocks() {
    document.querySelectorAll('.lp-world').forEach(card => {
      const w = card.dataset.world;
      const idx = LEVELS.indexOf(w) + 1;
      const locked = idx > career.unlocked;
      card.classList.toggle('locked', locked);
      const isNew = (idx === career.unlocked && career.newLevel === idx);
      const badge = card.querySelector('.wc-new');
      if (badge) badge.classList.toggle('hidden', !isNew);
    });
  }
  function clearNewBadges() {
    if (career.newLevel) { career.newLevel = 0; saveCareer(); }
    applyUnlocks();
  }

  function awardFreeKick() { freeKickReady = true; fkReady.classList.remove('hidden'); }
  function shootFreeKick() {
    freeKickReady = false;
    invisibleT = currentKit().blast; // KICKOFF BLAST duration (per-kit)
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

  // ---- GOAL CHANCE phase (every ~500m+) ----
  function buildPenaltyKeeper() {
    // a NORMAL standing goalkeeper (arms at his sides, not spread wide) who DIVES to save
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xc98d5b, roughness: 0.7, metalness: 0.15, flatShading: true });
    const jersey = new THREE.MeshStandardMaterial({ color: 0x2f9e8f, roughness: 0.7, metalness: 0.15, flatShading: true });
    const shorts = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.7, metalness: 0.15, flatShading: true });
    const sock = new THREE.MeshStandardMaterial({ color: 0x216b60, roughness: 0.7, metalness: 0.15, flatShading: true });
    const boot = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.7, metalness: 0.15, flatShading: true });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0xe7e2d6, roughness: 0.7, metalness: 0.15, flatShading: true });

    const frontTex = K.makeFrontJersey({ base: 0x2f9e8f, number: 1, country: 'GK' });
    const matFront = frontTex
      ? new THREE.MeshStandardMaterial({ map: frontTex, color: 0xffffff, roughness: 0.7, metalness: 0.15, flatShading: true })
      : jersey;
    const torsoMats = [jersey, jersey, jersey, jersey, matFront, jersey];
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.95, 0.44), torsoMats);
    torso.position.y = 1.4; torso.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.52), skin);
    head.position.y = 2.12; head.castShadow = true;

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), jersey);
    const armR = armL.clone();
    const armLP = new THREE.Group(); armLP.position.set(-0.5, 1.8, 0);
    const armRP = new THREE.Group(); armRP.position.set(0.5, 1.8, 0);
    [armL, armR].forEach(a => a.position.y = -0.4);
    armLP.add(armL); armRP.add(armR);
    const gloveL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), gloveMat);
    gloveL.position.y = -0.8; armLP.add(gloveL);
    const gloveR = gloveL.clone(); gloveR.position.y = -0.8; armRP.add(gloveR);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.3), shorts);
    const legR = legL.clone();
    const legLP = new THREE.Group(); legLP.position.set(-0.2, 0.9, 0);
    const legRP = new THREE.Group(); legRP.position.set(0.2, 0.9, 0);
    [legL, legR].forEach(l => l.position.y = -0.45);
    legLP.add(legL); legRP.add(legR);
    [legL, legR].forEach(l => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.34), sock);
      s.position.y = -0.52; l.add(s);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.46), boot);
      b.position.set(0, -0.82, -0.07); l.add(b);
    });

    g.add(torso, head, armLP, armRP, legLP, legRP);
    g.userData.pivots = { armLP, armRP, gloveL, gloveR };
    g.position.set(0, 0, -18.5);
    scene.add(g);
    return g;
  }

  // a SMALL goal (posts + crossbar + NET) sits in ONE lane on the open track, with a
  // keeper in front of it. Appears while running like any other defender.
  function buildTrackGoal() {
    const g = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6, flatShading: true });
    const half = 1.5;                                  // lane-width goal
    const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6);
    const lp = new THREE.Mesh(postGeo, postMat); lp.position.set(-half, 1.2, 0);
    const rp = new THREE.Mesh(postGeo.clone(), postMat); rp.position.set(half, 1.2, 0);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, half * 2 + 0.24, 6), postMat);
    bar.rotation.z = Math.PI / 2; bar.position.set(0, 2.4, 0);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, wireframe: true }));
    net.position.set(0, 1.2, -0.15);
    g.add(lp, rp, bar, net);
    return g;
  }

  // visual goal + keeper that runs toward the player as a lead-in to GOAL CHANCE.
  // Purely cosmetic — not in the obstacles array, so it never collides.
  function spawnPenaltyLead() {
    const lane = (Math.random() * 3) | 0;
    const grp = new THREE.Group();
    const k = buildPenaltyKeeper(); k.scale.set(0.7, 0.7, 0.7); k.position.set(0, 0, 0);
    const goal = buildTrackGoal(); goal.position.set(0, 0, -2.2);
    grp.add(k, goal);
    grp.position.set(LANES[lane], 0, -PEN_LEAD - 10);
    grp.userData = { lane: lane, animate: function (dt) { if (k.userData && k.userData.animate) k.userData.animate(dt); } };
    scene.add(grp);
    penLead = grp;
  }

  function buildPenaltyGoal() {
    const g = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6, flatShading: true });
    const postGeo = new THREE.CylinderGeometry(0.18, 0.18, 3.2, 6);
    const lp = new THREE.Mesh(postGeo, postMat); lp.position.set(-4.2, 1.6, 0);
    const rp = new THREE.Mesh(postGeo.clone(), postMat); rp.position.set(4.2, 1.6, 0);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 8.6, 6), postMat);
    bar.rotation.z = Math.PI / 2; bar.position.set(0, 3.2, 0);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 3.2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, wireframe: true }));
    net.position.set(0, 1.6, -0.2);
    g.add(lp, rp, bar, net);
    g.position.set(0, 0, -20);
    scene.add(g);
    const keeper = buildPenaltyKeeper();
    return { goal: g, keeper };
  }

  // schedule the next penalty: first at 500, then gaps grow ~250m each time with jitter
  function scheduleNextPenalty() {
    lastPenaltyAt = nextPenaltyAt;
    penaltyIndex++;
    const gap = 1000 + (penaltyIndex - 1) * 250 + ((Math.random() * 400) | 0) - 100;
    nextPenaltyAt += gap;
  }

  function updatePenMap() {
    if (state !== 'playing') return;
    const remain = Math.max(0, nextPenaltyAt - distance);
    penMap.classList.remove('hidden');
    penMapDist.textContent = remain.toFixed(0) + ' m';
    const leg = nextPenaltyAt - lastPenaltyAt;
    const p = leg > 0 ? Math.min(1, (distance - lastPenaltyAt) / leg) : 1;
    penMapFill.style.width = (p * 100) + '%';
    penMapPlayer.style.left = (p * 100) + '%';
    if (remain < 250) penMap.classList.add('close'); else penMap.classList.remove('close');
  }

  function startPenalty() {
    state = 'penalty';
    penaltyT = 0; penResolved = false; penBallFly = -1; penShotT = 0; penScored = false; penResultCounted = false;
    penKeeperDive = 0; penKeeperPhase = Math.random() * 10; penShotFinished = false; penShotStage = 'fly';
    penPhase = 'suspense'; penPhaseT = 0;
    // pick the keeper's dive side NOW so the player can read it during the aim phase
    penKeeperDive = Math.random() < 0.5 ? -1 : 1;
    // DIFFICULTY: scales 0 -> 1 as the run gets longer. Drives how late the keeper
    // commits his tell and how fast the aim bar sweeps (so scoring gets harder).
    penDifficulty = Math.min(1, distance / 6000);
    // no green zone — the bar is just an aim indicator
    penaltyGreen.style.display = 'none';
    const remain = Math.max(0, nextPenaltyAt - distance);
    penaltyBanner.textContent = '⚽ GOAL CHANCE!';
    penaltyBanner.classList.remove('success', 'fail');
    penaltyScore.textContent = 'GOALS  ' + goalCount + '   •   SCORE  ' + score.toLocaleString();
    penaltyScore.classList.remove('show');
    penaltyBar.style.display = ''; // keep the bar visible as aim track
    penaltySub.classList.remove('pulse');
    penaltySub.innerHTML = 'Goalkeeper in <b>' + remain.toFixed(0) + ' m</b> — take your shot!';
    penaltyScreen.classList.remove('hidden');
    // clear obstacles + stars ahead so the path is clean
    for (let i = obstacles.length - 1; i >= 0; i--) { despawnOpponent(obstacles[i]); }
    obstacles.length = 0;
    for (let i = stars.length - 1; i >= 0; i--) { despawnStar(stars[i]); }
    stars.length = 0;
    for (let i = powerups.length - 1; i >= 0; i--) { despawnPowerup(powerups[i]); }
    powerups.length = 0;
    const built = buildPenaltyGoal();
    penaltyGoal = built.goal; penaltyKeeper = built.keeper;
    penKeeperGrace = 60;
    scene.attach(ball);
    ball.position.copy(LEG_POS);
    ball.rotation.set(0, 0, 0);
    K.Audio.sfx.whistle();
  }

  // ============================================================================
  //  PENALTY RULES (simple):
  //   - The sweeping bar is just an AIM indicator (no green zone).
  //   - The keeper pre-leans to his dive side (penKeeperDive) during the aim.
  //   - You shoot to the side the marker is on.
  //   - GOAL (surely): you shoot the side the keeper did NOT dive to.
  //       -> ball flies into the open net corner and passes the bar, keeper never touches it.
  //   - SAVE: you shoot the same side the keeper dives to.
  //       -> ball flies into the keeper's glove; he catches it and it stays with him.
  //  No other logic.
  // ============================================================================
  function resolvePenalty(forceMiss) {
    if (penResolved || penPhase !== 'aim') return;
    penResolved = true;
    penPhase = 'shot'; penShotT = 0;
    const shotSide = penMarker < 0.5 ? -1 : 1;
    const scored = forceMiss ? false : (shotSide !== penKeeperDive);
    penScored = scored;
    const aimX = shotSide * 3.4;
    // GOAL: open corner of the net (keeper is diving the OTHER way, ball passes the bar)
    // SAVE: straight into the keeper's glove on his dive side (he catches it)
    penBallTarget = scored
      ? new THREE.Vector3(aimX, 1.1, -19.2)
      : new THREE.Vector3(penKeeperDive * 3.0, 1.3, -18.2);
    K.Audio.sfx.kick ? K.Audio.sfx.kick() : K.Audio.sfx.whistle();
    playerObj && playerObj.anim && playerObj.anim.kick && playerObj.anim.kick();
  }

  function finishPenaltyResult() {
    if (penResultCounted) return;
    penResultCounted = true;
    if (penScored) {
      goalCount++;
      goalCountEl.textContent = goalCount;
      particles.confetti(player.position.clone().add(new THREE.Vector3(0, 1.4, 0)));
      const gain = 500;
      score += gain; styleBonus += gain;
      speedBoostT = Math.max(speedBoostT, 3);
      flashScreen(0.4);
      K.Audio.sfx.goal();
      penaltyBanner.textContent = '✅ GOAL!';
      penaltyBanner.classList.add('success');
      penaltySub.innerHTML = 'Goal succeeded!  <b>+' + gain + '</b>';
    } else {
      penaltyBanner.textContent = '❌ GOAL FAILED';
      penaltyBanner.classList.add('fail');
      penaltySub.innerHTML = 'Keeper saved it — no harm done, keep running!';
      K.Audio.sfx.crash();
    }
    penaltyScore.classList.add('show');
    penaltyScore.textContent = 'GOALS  ' + goalCount + '   •   SCORE  ' + score.toLocaleString();
    scheduleNextPenalty();
    setTimeout(endPenalty, 1400);
  }

  function endPenalty() {
    if (penaltyGoal) { scene.remove(penaltyGoal); penaltyGoal = null; }
    if (penaltyKeeper) { scene.remove(penaltyKeeper); penaltyKeeper = null; }
    penaltyScreen.classList.add('hidden');
    player.attach(ball); // reattach to the player's feet
    ball.position.copy(LEG_POS);
    ball.rotation.set(0, 0, 0);
    grace = 1.2; // brief safety so nothing immediately hits
    nextSpawnDist = distance + 24;
    state = 'playing';
  }

  function clearPenalty() {
    if (penaltyGoal) { scene.remove(penaltyGoal); penaltyGoal = null; }
    if (penaltyKeeper) { scene.remove(penaltyKeeper); penaltyKeeper = null; }
    if (ball.parent !== player) { player.attach(ball); ball.position.copy(LEG_POS); ball.rotation.set(0, 0, 0); }
    penaltyScreen.classList.add('hidden');
    penResolved = false; penBallFly = -1; penPhase = 'suspense'; penPhaseT = 0; penShotFinished = false; penShotStage = 'fly';
  }

  function updatePenalty(dt) {
    penaltyT += dt;
    penPhaseT += dt;

    const u = player.userData;
    // keep the player dribbling in place (legs move, field scrolls slowly for motion)
    runPhase += dt * 12;
    playerObj.animate(runPhase, false);
    u.x += (LANES[u.lane] - u.x) * Math.min(1, dt * 12);
    player.position.x = u.x;

    // slow field scroll for a sense of motion without advancing distance
    const moveAmt = 4 * dt;
    field.scroll(moveAmt);
    field.update(distance, dt);

    // keeper idle ready-stance (and a full dive during the shot)
    if (penaltyKeeper) {
      const baseX = 0, baseZ = -18.5;
      if (penPhase === 'shot' || penPhase === 'result') {
        const k = Math.min(1, penShotT / 0.4);
        const e = k * k * (3 - 2 * k);
        // dive toward penKeeperDive side: slide + lean + arms reach that way
        penaltyKeeper.position.x = baseX + penKeeperDive * 3.0 * e;
        penaltyKeeper.position.z = baseZ + penKeeperDive * 0.3 * e;
        penaltyKeeper.rotation.z = -penKeeperDive * 1.15 * e; // topple sideways
        penaltyKeeper.rotation.y = penKeeperDive * 0.5 * e;
        const reach = penKeeperDive * e;
        if (penaltyKeeper.userData.pivots) {
          const p = penaltyKeeper.userData.pivots;
          p.armLP.rotation.z = -0.1 - Math.max(0, reach) * 1.4 + Math.min(0, reach) * 0.2;
          p.armRP.rotation.z = 0.1 + Math.min(0, reach) * 1.4 - Math.max(0, reach) * 0.2;
          p.armLP.rotation.x = -reach * 0.6;
          p.armRP.rotation.x = -reach * 0.6;
        }
      } else if (penPhase === 'aim') {
        // TELEGRAPH: keeper pre-leans toward his dive side so the player can read it.
        // At higher difficulty he stays neutral longer, then snaps the lean late —
        // so the tell is much harder to read in time.
        const delay = penDifficulty * 1.4;            // up to 1.4s of neutral stance
        const ramp = 0.3 + penDifficulty * 0.9;        // snappier lean when hard
        const leanAmt = Math.min(1, Math.max(0, (penaltyT - delay)) * ramp);
        const d = penKeeperDive * leanAmt;
        penaltyKeeper.position.x = baseX + d * 1.8;
        penaltyKeeper.rotation.z = -penKeeperDive * 0.3 * leanAmt;
        penaltyKeeper.rotation.y = penKeeperDive * 0.2 * leanAmt;
        penaltyKeeper.position.y = Math.abs(Math.sin(penKeeperPhase)) * 0.05;
        penaltyKeeper.position.z = baseZ;
        const p = penaltyKeeper.userData.pivots;
        if (p) {
          const spread = leanAmt;
          p.armLP.rotation.z = -0.15 + (-penKeeperDive * 0.5) * spread;
          p.armRP.rotation.z = 0.15 + (-penKeeperDive * 0.5) * spread;
          p.armLP.rotation.x = Math.abs(penKeeperDive) * 0.3 * spread;
          p.armRP.rotation.x = Math.abs(penKeeperDive) * 0.3 * spread;
        }
      } else {
        // ready stance (suspense)
        penKeeperPhase += dt * 4;
        const w = Math.sin(penKeeperPhase) * 0.06;
        penaltyKeeper.position.set(baseX, Math.abs(Math.sin(penKeeperPhase)) * 0.05, baseZ);
        penaltyKeeper.rotation.set(0, w * 0.3, 0);
        if (penaltyKeeper.userData.pivots) {
          const p = penaltyKeeper.userData.pivots;
          p.armLP.rotation.set(0, 0, -0.15 + w); p.armRP.rotation.set(0, 0, 0.15 - w);
        }
      }
    }

    // ball flight after the shot (ball is detached to scene space during the penalty)
    const footWorld = new THREE.Vector3().copy(player.position).add(LEG_POS);
    if (penPhase === 'shot') {
      penShotT += dt;
      if (penShotStage === 'fly') {
        const k = Math.min(1, penShotT / 0.45);
        const e = k * k * (3 - 2 * k);
        ball.position.lerpVectors(footWorld, penBallTarget, e);
        ball.position.y += Math.sin(k * Math.PI) * 1.4; // arc
        ball.rotation.x -= dt * 18;
        if (k >= 1) {
          if (!penShotFinished) { penShotFinished = true; finishPenaltyResult(); }
          // GOAL: ball is in the net, done.  SAVE: he catches it, then it returns.
          if (!penScored) penShotStage = 'caught';
        }
      } else if (penShotStage === 'caught') {
        // SAVE: ball sticks in the keeper's glove on his dive side...
        if (penaltyKeeper && penaltyKeeper.userData.pivots) {
          const glove = penKeeperDive < 0
            ? penaltyKeeper.userData.pivots.gloveL
            : penaltyKeeper.userData.pivots.gloveR;
          const wp = new THREE.Vector3();
          glove.getWorldPosition(wp);
          if (penShotT < 0.45 + 0.25) {
            ball.position.lerp(wp, Math.min(1, dt * 20));
          } else if (penShotStage === 'caught') {
            // ...then it returns back out toward the player (deflected save)
            penShotStage = 'return';
          }
        }
        ball.rotation.x -= dt * 4;
      } else if (penShotStage === 'return') {
        // ball bounces back out in front of the keeper and settles
        const back = new THREE.Vector3(penKeeperDive * 2.2, 0.4, -15.5);
        ball.position.lerp(back, Math.min(1, dt * 6));
        ball.rotation.x -= dt * 6;
      }
    } else {
      // ball sits at the feet while aiming/suspense
      ball.position.lerp(footWorld, Math.min(1, dt * 10));
    }

    // SUSPENSE: build tension before the bar appears
    if (penPhase === 'suspense') {
      if (penPhaseT < 0.9) penaltySub.innerHTML = 'Goalkeeper in <b>' + Math.max(0, nextPenaltyAt - distance).toFixed(0) + ' m</b> — take your shot!';
      else if (penPhaseT < 1.8) penaltySub.textContent = 'Steady… watch the keeper…';
      else if (penPhaseT < 2.5) { penaltySub.textContent = 'Watch which way he leans!'; penaltySub.classList.add('pulse'); }
      else { penPhase = 'aim'; penPhaseT = 0; penaltyBar.classList.remove('dimmed'); penaltySub.classList.add('pulse'); penaltySub.innerHTML = 'Shoot the side the keeper <b>isn\'t</b> leaning! &nbsp;<b>Press SPACE to shoot</b>'; K.Audio.sfx.whistle(); }
    } else if (penPhase === 'aim') {
      // marker sweeps, faster as difficulty rises — it is only an AIM indicator
      const sweepSpeed = 1.6 + penDifficulty * 2.2;
      penMarker = (Math.sin(penaltyT * sweepSpeed) * 0.5 + 0.5);
      penaltyMarker.style.left = (penMarker * 100) + '%';
      if (penPhaseT > 6) { resolvePenalty(true); } // safety auto-miss
    }

    // camera eases to a behind-the-shoulder view of the goal
    const camPos = new THREE.Vector3(u.x * 0.3, 3.0, 6.5);
    const camLook = new THREE.Vector3(u.x * 0.3, 1.4, -18);
    camera.position.lerp(camPos, Math.min(1, dt * 4));
    camera.lookAt(camLook);
    camera.fov = 55; camera.updateProjectionMatrix();
  }

  // ---- spawning ----
  function spawnStarsOnly(z, freeLane) {
    const n = 3 + ((Math.random() * 4) | 0);
    let orbSpawned = false, orbIdx = -1, orbType = 'speed';
    if (Math.random() < 0.22) {
      orbSpawned = true; orbIdx = (Math.random() * n) | 0;
      const types = ['speed', 'magnet', 'magnet', 'shield', 'greencard'];
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

  // spawn a rival defender that CHARGES toward the player (extra closing speed + optional
  // angled approach). Spawn distance is extended by the same factor so reaction time is
  // preserved — the game stays just as playable, just more "they're coming for you".
  function spawnDefender(lane, z) {
    const o = K.Opponent.create(lane, 'player', 2 + ((Math.random() * 9) | 0));
    const closing = 0.35 + Math.random() * 0.20;        // +35%..+55% — opponents sprint at you
    o.userData.closing = closing;
    o.userData.angleTo = null;                          // decided later, only when close (see update loop)
    const spawnZ = z - closing * 55;                    // start further so they arrive at the same time
    o.position.x = LANES[lane]; o.position.z = spawnZ; o.userData.z = spawnZ;
    obstacleGroup.add(o); obstacles.push(o);
  }

  function spawnChunk(z) {
    const DM = DIFFICULTY[currentWorld] || DIFFICULTY.beach;
    if (penKeeperGrace > 0) {
      // no keeper in the way right after a penalty box — only rival runners
      const order = [0, 1, 2];
      for (let i = order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
      const blockedCount = Math.random() < 0.55 * DM.density ? 1 : 2;
      for (let i = 0; i < blockedCount; i++) spawnDefender(order[i], z);
      spawnStarsOnly(z, order[blockedCount]);
      return;
    }
    // NOTE: full goalkeepers only appear in the Penalty Box — not on the open track.
    const order = [0, 1, 2];
    for (let i = order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
    const blockedCount = Math.random() < 0.55 * DM.density ? 1 : 2;
    for (let i = 0; i < blockedCount; i++) spawnDefender(order[i], z);
    spawnStarsOnly(z, order[blockedCount]);
  }

  // ---- input ----
  function moveLane(dir) {
    if (state !== 'playing' || paused) return;
    const u = player.userData;
    const nl = Math.min(2, Math.max(0, u.lane + dir));
    if (nl !== u.lane) u.lane = nl;
  }
  function doJump() {
    if (state !== 'playing' || paused) return;
    const u = player.userData;
    if (!u.jumping && !u.rolling) { u.vy = JUMP_V; u.jumping = true; K.Audio.sfx.jump(); }
  }
  function doRoll() {
    if (state !== 'playing' || paused) return;
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
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); showCareer(); }
      else if (e.key === 'Escape') { e.preventDefault(); showCareer(); }
      return;
    }
    if (state === 'farewell') {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); showCareer(); }
      else if (e.key === 'Escape') { e.preventDefault(); showCareer(); }
      return;
    }
    if (state === 'theme') {
      if (e.key === ' ') { e.preventDefault(); beginIntro(); }
      return;
    }
    if (state === 'over') {
      if (e.key === 'Escape') { e.preventDefault(); showCareer(); }
      return;
    }
    if (state === 'penalty') {
      if (e.key === ' ') { e.preventDefault(); resolvePenalty(); }
      return;
    }
    if (state === 'playing' && freeKickReady && e.key === ' ') { e.preventDefault(); shootFreeKick(); return; }
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': moveLane(-1); break;
      case 'ArrowRight': case 'd': case 'D': moveLane(1); break;
      case 'ArrowUp': case 'w': case 'W': case ' ': doJump(); e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S': doRoll(); break;
      case 'm': case 'M': K.Audio.toggle(); break;
      case 'p': case 'P': case 'Escape': togglePause(); break;
      case 'r': case 'R': if (['playing', 'over', 'world', 'intro', 'dying', 'theme'].indexOf(state) >= 0) startGame(); break;
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
  document.getElementById('pauseBtn').addEventListener('click', () => {
    if (state === 'playing') togglePause();
    else if (state === 'intro') { paused = true; pauseScreen.classList.remove('hidden'); }
  });

  const helpScreen = document.getElementById('helpScreen');
  const helpContinue = document.getElementById('helpContinue');
  const optionsScreen = document.getElementById('optionsScreen');
  const farewellScreen = document.getElementById('farewellScreen');

  const ALL_OVERLAYS = [optionsScreen, farewellScreen, helpScreen, overScreen, pauseScreen, loadingScreen,
    document.getElementById('careerScreen'), document.getElementById('resetModal'), document.getElementById('storyScreen')];
  function hideAllOverlays() { ALL_OVERLAYS.forEach(el => { if (el) el.classList.add('hidden'); }); }

  function showHelp() {
    hideAllOverlays();
    showOverlay(helpScreen);
    state = 'help';
  }
  function showOptions() {
    hideAllOverlays();
    showOverlay(optionsScreen);
    state = 'options';
  }
  function showStory() {
    hideAllOverlays();
    showOverlay(document.getElementById('storyScreen'));
    state = 'story';
    const sc = document.querySelector('#storyScreen .story-scroll');
    if (sc) sc.scrollTop = 0;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in-view'); });
      }, { root: sc, threshold: 0.18 });
      document.querySelectorAll('#storyScreen .story-chapter').forEach(c => io.observe(c));
    } else {
      document.querySelectorAll('#storyScreen .story-chapter').forEach(c => c.classList.add('in-view'));
    }
  }

  function showFarewell() {
    hideAllOverlays();
    showOverlay(farewellScreen);
    state = 'farewell';
  }

  function startWithLoad() {
    state = 'loading';
    runLoading('assets/loading_bg_' + currentWorld + '.png', () => startGame(), 1100);
  }

  if (helpContinue) helpContinue.addEventListener('click', showCareer);
  if (optionsScreen) document.getElementById('optionsBack').addEventListener('click', showCareer);
  if (farewellScreen) document.getElementById('farewellPlay').addEventListener('click', showCareer);

  // ---- lobby world card selection ----
  document.querySelectorAll('.lp-world').forEach(card => {
    card.addEventListener('click', () => {
      const w = card.dataset.world;
      const idx = LEVELS.indexOf(w) + 1;
      if (idx > career.unlocked) {
        showBanner('LOCKED', 'Keep playing to unlock!', 'yellow');
        return;
      }
      document.querySelectorAll('.lp-world').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      currentWorld = w;
    });
  });

  // ---- start lobby music on first user gesture (browsers block autoplay) ----
  let lobbyMusicStarted = false;
  function startLobbyMusic() {
    if (lobbyMusicStarted) return;
    lobbyMusicStarted = true;
    K.Audio.init();
    const p = K.Audio.resume();
    const play = () => { K.Audio.startMusic(); };
    if (p && p.then) p.then(play); else play();
  }
  ['click', 'keydown', 'touchstart'].forEach(ev =>
    window.addEventListener(ev, startLobbyMusic, { once: true }));

  // ---- lobby utility buttons ----
  const lobbyHowto = document.getElementById('lobbyHowto');
  if (lobbyHowto) lobbyHowto.addEventListener('click', showHelp);
  const lobbyOptions = document.getElementById('lobbyOptions');
  if (lobbyOptions) lobbyOptions.addEventListener('click', showOptions);
  const lobbyStory = document.getElementById('lobbyStory');
  if (lobbyStory) lobbyStory.addEventListener('click', showStory);
  const storyBack = document.getElementById('storyBack');
  if (storyBack) storyBack.addEventListener('click', showCareer);
  const lobbyDemo = document.getElementById('lobbyDemo');
  if (lobbyDemo) lobbyDemo.addEventListener('click', () => {
    const m = document.getElementById('demoModal');
    if (m) m.classList.remove('hidden');
  });
  const demoUseBtn = document.getElementById('demoUseBtn');
  if (demoUseBtn) demoUseBtn.addEventListener('click', () => {
    const m = document.getElementById('demoModal');
    if (m) m.classList.add('hidden');
    career.unlocked = LEVELS.length;
    lastUnlocked = career.unlocked;
    career.newLevel = 0;
    saveCareer();
    renderCareerStats();
    applyUnlocks();
    showBanner('DEMO MODE', 'All worlds unlocked — go explore!', 'green');
  });
  const demoCloseBtn = document.getElementById('demoCloseBtn');
  if (demoCloseBtn) demoCloseBtn.addEventListener('click', () => {
    const m = document.getElementById('demoModal');
    if (m) m.classList.add('hidden');
  });

  // ---- identity inputs (Customize + Career share the same career object) ----
  function wireIdentityInputs() {
    const kName = document.getElementById('careerNameInput');
    const kNum = document.getElementById('careerNumInput');
    if (kName) kName.addEventListener('input', () => {
      career.name = kName.value.toString().slice(0, 12).toUpperCase() || 'PLAYER';
      saveCareer();
    });
    if (kNum) kNum.addEventListener('input', () => {
      let v = parseInt(kNum.value, 10); if (isNaN(v)) v = 0; v = Math.max(0, Math.min(99, v));
      career.number = v; saveCareer();
    });
  }
  wireIdentityInputs();

  // ---- Lobby (career + customize merged) ----
  let careerRenderer = null, careerScene = null, careerCam = null, careerPlayer = null, careerPhase = 0;
  function initCareerPreview() {
    if (careerRenderer) return;
    const canvas = document.getElementById('careerCanvas');
    if (!canvas) return;
    careerRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    careerRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    careerRenderer.setSize(360, 480, false);
    careerScene = new THREE.Scene();
    careerCam = new THREE.PerspectiveCamera(38, 360 / 480, 0.1, 100);
    careerCam.position.set(0, 1.75, 4.8);
    careerCam.lookAt(0, 1.3, 0);
    careerScene.add(new THREE.HemisphereLight(0xdde8ff, 0x3a4050, 0.9));
    const dl = new THREE.DirectionalLight(0xffffff, 1.35); dl.position.set(2, 5, 4); careerScene.add(dl);
    const dl2 = new THREE.DirectionalLight(0x6688bb, 0.35); dl2.position.set(-3, 3, -2); careerScene.add(dl2);
  }
  function setCareerPreview() {
    initCareerPreview();
    if (!careerRenderer) return;
    const k = KITS[career.kit] || KITS.red;
    k.name = career.name; k.number = career.number; k.country = k.label;
    if (careerPlayer) careerScene.remove(careerPlayer.group);
    careerPlayer = K.Player.create(careerScene, k);
    careerPlayer.group.rotation.y = Math.PI;
    if (careerPlayer.group.userData.ball) careerPlayer.group.userData.ball.visible = false;
  }
  function renderCareerStats() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('careerNameVal', career.name + ' #' + career.number);
    set('careerKitVal', (KITS[career.kit] || KITS.red).label);
    set('careerGoals', career.lifetimeGoals);
    set('careerDist', Math.floor(career.lifetimeM) + ' m');
    set('careerStars', career.lifetimeStars + ' ⭐');
    const worldFlags = { beach: '\u26BD', indoor: '\u{1F3DF}', worldcup: '\u{1F3C6}' };
    LEVELS.forEach((w, i) => {
      const lvl = i + 1;
      const row = document.querySelector('.lp-world[data-world="' + w + '"]');
      if (!row) return;
      const flag = row.querySelector('.lp-world-flag');
      if (flag) flag.textContent = worldFlags[w] || '';
      const locked = lvl > career.unlocked;
      row.classList.toggle('locked', locked);
      const st = row.querySelector('.lp-world-status');
      if (st) st.textContent = locked ? reqText(lvl) : 'UNLOCKED';
      const sp = row.querySelector('.lp-world-speed');
      if (sp) {
        const mult = (DIFFICULTY[w] && DIFFICULTY[w].speed) || 1;
        sp.textContent = 'SPEED ' + mult.toFixed(1) + 'x';
      }
      row.classList.toggle('selected', w === currentWorld && !locked);
    });
    document.querySelectorAll('.lp-kit-card').forEach(c => {
      c.classList.toggle('active', c.dataset.kit === career.kit);
      const swatch = c.querySelector('.lp-kit-swatch');
      if (swatch) swatch.style.borderColor = (c.dataset.kit === career.kit) ? '#ffd54f' : 'rgba(255,255,255,.3)';
    });
  }
  function showCareer() {
    hideAllOverlays();
    showOverlay(document.getElementById('careerScreen'));
    const p = K.Audio.resume();
    const play = () => { K.Audio.startMusic(); };
    if (p && p.then) p.then(play); else play();
    const lobbyBg = document.querySelector('#careerScreen .lobby-bg');
    if (lobbyBg) lobbyBg.style.backgroundImage = "url('assets/lobby_bg_main.png')";
    state = 'career';
    setCareerPreview();
    renderCareerStats();
    buildLobbyKits();
    const kName = document.getElementById('careerNameInput');
    const kNum = document.getElementById('careerNumInput');
    if (kName) kName.value = career.name;
    if (kNum) kNum.value = career.number;
  }
  function buildLobbyKits() {
    const list = document.getElementById('kitList');
    if (!list || list.childElementCount) return;
    Object.keys(KITS).forEach(key => {
      const k = KITS[key];
      const card = document.createElement('button');
      card.className = 'lp-kit-card'; card.dataset.kit = key;
      card.innerHTML = '<span class="lp-kit-swatch" style="background:#' + k.jersey.toString(16).padStart(6, '0') + '"></span>' +
        '<span class="lp-kit-name">' + k.label + '</span>';
      card.addEventListener('click', () => { career.kit = key; saveCareer(); setCareerPreview(); renderCareerStats(); });
      list.appendChild(card);
    });
  }

  // ---- Reset modal (career-only vs factory) ----
  function openReset() { const m = document.getElementById('resetModal'); if (m) m.classList.remove('hidden'); }
  function closeReset() { const m = document.getElementById('resetModal'); if (m) m.classList.add('hidden'); }
  function doReset(factory) {
    if (factory) {
      leaderboard = [];
      try { localStorage.removeItem(LB_KEY); } catch (e) {}
      try { localStorage.removeItem(INTRO_SEEN_KEY); } catch (e) {}
    }
    career = defaultCareer();
    saveCareer();
    lastUnlocked = 1;
    applyUnlocks();
    closeReset();
    showCareer();
  }
  const careerBtn = document.getElementById('careerBtn');
  if (careerBtn) careerBtn.addEventListener('click', showCareer);
  const careerBack = document.getElementById('careerBack');
  if (careerBack) careerBack.addEventListener('click', openReset);
  const careerPlay = document.getElementById('careerPlay');
    if (careerPlay) careerPlay.addEventListener('click', () => { saveCareer(); pendingIntro = !introSeen(); startWithLoad(); });
  const resetBtns = document.querySelectorAll('[data-reset]');
  resetBtns.forEach(b => b.addEventListener('click', openReset));
  const resetFactoryBtn = document.getElementById('resetFactoryBtn');
  if (resetFactoryBtn) resetFactoryBtn.addEventListener('click', () => doReset(true));
  const resetCancel = document.getElementById('resetCancel');
  if (resetCancel) resetCancel.addEventListener('click', closeReset);

  // first screen: loading -> career lobby
  helpScreen.classList.add('hidden');
  try { applyUnlocks(); } catch (e) { console.error(e); }
  runLoading('assets/lobby_bg_main.png', () => { try { showCareer(); } catch (e) { showFatal((e && e.message) || e); } }, 1300);

  // pause controls
  document.getElementById('resumeBtn').addEventListener('click', togglePause);
  document.getElementById('pauseRestart').addEventListener('click', () => startGame());
  document.getElementById('pauseWorld').addEventListener('click', () => { paused = false; pauseScreen.classList.add('hidden'); showCareer(); });
  document.getElementById('pauseMenu').addEventListener('click', () => { paused = false; pauseScreen.classList.add('hidden'); showCareer(); });
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
    livesHud.innerHTML = '';
    // MAX_LIVES = 2: 2 left = two green, 1 left = green + yellow, 0 = red
    for (let i = 0; i < MAX_LIVES; i++) {
      const c = document.createElement('div');
      let cls = 'green';
      if (i >= lives) {
        if (lives <= 0 && i === MAX_LIVES - 1) cls = 'red';
        else if (lives === 1 && i === MAX_LIVES - 1) cls = 'yellow';
        else cls = 'used';
      }
      c.className = 'ref-card ' + cls;
      livesHud.appendChild(c);
    }
  }
  function checkObstacle(o) {
    if (state !== 'playing') return;
    if (grace > 0 || iframes > 0) return;
    if (invisibleT > 0) { smashObstacle(o); return; }
    if (o.userData.frozen) return;
    const u = player.userData, d = o.userData;
    const near = Math.abs(o.position.z - PLAYER_Z) < d.halfDepth + 0.4;
    if (!near) return;
    if (d.type === 'keeper') { if (u.y < d.clearHeight) { if (shieldT > 0) absorbHit(); else hitPlayer(); } }
    else { if (Math.abs(u.x - o.position.x) < 0.85) { if (shieldT > 0) absorbHit(); else hitPlayer(); } }
  }
  function smashObstacle(o) {
    const idx = obstacles.indexOf(o);
    if (idx < 0) return;
    obstacles.splice(idx, 1);
    despawnOpponent(o);
    particles.smoke(o.position.clone().add(new THREE.Vector3(0, 1, 0)));
  }
  function hitPlayer() {
    if (shieldT > 0) { absorbHit(); return; }
    lives--;
    updateLives();
    breakCombo();
    if (lives <= 0) { redCard(); return; }
    showBanner('YELLOW CARD', 'Warning! One more and you\'re out', 'yellow');
    iframes = 2.0;
    shakeT = 0.3; flashScreen(0.5);
    K.Audio.sfx.crash();
    // give breathing room: clear defenders right around the player
    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (obstacles[i].position.z > -2 && obstacles[i].position.z < 4) {
        const o = obstacles[i];
        obstacles.splice(i, 1); despawnOpponent(o);
      }
    }
  }
  function absorbHit() {
    shieldT = 0; iframes = 1.2;
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
        combo++; comboTimer = COMBO_TIMEOUT * currentKit().combo;
        const mult = comboMult(combo);
        const gain = Math.round(10 * mult * currentKit().star);
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
    else if (type === 'shield') shieldT = 6;
    else if (type === 'greencard') { if (lives < MAX_LIVES) { lives++; updateLives(); particles.starBurst(player.position.clone().add(new THREE.Vector3(0, 1.4, 0))); } showBanner('GREEN CARD', 'Safe player — card cleared!', 'green'); }
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
    const team = currentKit();
    const DM = DIFFICULTY[currentWorld] || DIFFICULTY.beach;
    const spd = (BASE_SPEED + Math.min(22, distance / 90)) * team.speed * DM.speed * (speedBoostT > 0 ? 1.4 : 1) * (invisibleT > 0 ? 1.3 : 1);
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

    // career: live level-unlock check (non-interrupting toast)
    checkUnlocksLive();

    // power-up timers + HUD
    if (speedBoostT > 0) speedBoostT -= dt;
    if (magnetT > 0) magnetT -= dt;
    if (shieldT > 0) shieldT -= dt;
    // GOLDEN BOOT: turn the player's boots gold while the magnet is active
    const bm = player.userData.bootMat;
    if (bm) {
      if (magnetT > 0) { bm.color.setHex(0xffd54f); bm.emissive.setHex(0xffb300); bm.emissiveIntensity = 0.5; }
      else { bm.color.setHex(0x20242b); bm.emissive.setHex(0x000000); bm.emissiveIntensity = 0; }
    }
    if (shieldT > 0 || speedBoostT > 0 || magnetT > 0) {
      powerHud.classList.remove('hidden');
      if (shieldT > 0) { powerIcon.textContent = '🛡️'; powerLabel.textContent = 'SHIELD'; powerFill.style.width = (shieldT / 6 * 100) + '%'; }
      else if (speedBoostT > 0) { powerIcon.textContent = '⚡'; powerLabel.textContent = 'SPEED'; powerFill.style.width = (speedBoostT / 4 * 100) + '%'; }
      else { powerIcon.textContent = '👢'; powerLabel.textContent = 'GOLDEN BOOT'; powerFill.style.width = (magnetT / 5 * 100) + '%'; }
    } else powerHud.classList.add('hidden');

    // KICKOFF BLAST power run
    const wasGhost = ghostOn;
    ghostOn = invisibleT > 0;
    if (ghostOn) {
      invisibleT -= dt;
      invisNum.textContent = Math.max(1, Math.ceil(invisibleT));
      invisFill.style.width = (Math.max(0, invisibleT) / currentKit().blast * 100) + '%';
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

    const moveAmt = speed * dt;
    field.scroll(moveAmt);
    field.update(distance, dt);

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      const closing = o.userData.closing || 0;
      o.position.z += moveAmt * (1 + closing); o.userData.z = o.position.z;
      // When CLOSE, the defender crosses toward your CURRENT lane in whole-lane steps
      // (eased glide so you SEE it move from one lane to another, never resting between).
      // Hard-clamped to the 3-lane band so it can't leave lanes 0..2.
      const CLOSE = -24;
      if (o.position.z < CLOSE) {
        const tx = LANES[player.userData.lane];
        o.position.x += (tx - o.position.x) * Math.min(1, dt * 2.2);
      }
      o.position.x = Math.max(LANES[0], Math.min(LANES[2], o.position.x));
      // last-moment tackle tell (within ~16m): lean in harder
      o.userData.closePhase = (o.position.z < -16) ? Math.min(1, (-16 - o.position.z) / 16) : 0;
      if (!o.userData.frozen) o.userData.animate && o.userData.animate(dt);
      // style: reward a clean dodge / limbo as the rival passes
      if (!o.userData.scored && o.position.z > PLAYER_Z + 0.5) {
        o.userData.scored = true;
        if (o.userData.type === 'player' && Math.abs(u.x - o.position.x) > 0.85) awardCloseCall();
        else if (o.userData.type === 'keeper' && u.rolling && u.y > 0 && u.y < 1.6) awardLimbo();
      }
      if (o.userData.z > DESPAWN_Z) { obstacles.splice(i, 1); despawnOpponent(o); continue; }
      checkObstacle(o);
      if (state !== 'playing') return;
    }
    for (let i = stars.length - 1; i >= 0; i--) {
      const b = stars[i];
      if (magnetT > 0) { b.position.x += (u.x - b.position.x) * Math.min(1, dt * 12); b.position.z += (PLAYER_Z - b.position.z) * Math.min(1, dt * 6); }
      b.position.z += moveAmt; b.userData.z = b.position.z;
      if (b.userData.animate) b.userData.animate(dt);
      if (b.userData.z > DESPAWN_Z) { stars.splice(stars.indexOf(b), 1); despawnStar(b); continue; }
      checkStar(b);
    }
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.userData.bob += dt * 3;
      p.position.y = 1.0 + Math.sin(p.userData.bob) * 0.15;
      p.userData.core.rotation.y += dt * 2; p.userData.core.rotation.x += dt * 1.3;
      p.position.z += moveAmt; p.userData.z = p.position.z;
      if (p.userData.z > DESPAWN_Z) { powerups.splice(i, 1); despawnPowerup(p); continue; }
      if (Math.abs(p.position.z - PLAYER_Z) < 0.9 && Math.abs(u.x - p.position.x) < 1.3) {
        powerups.splice(i, 1); despawnPowerup(p); collectPowerup(p.userData.type);
      }
    }

    if (distance >= nextSpawnDist) {
      spawnChunk(SPAWN_Z);
      nextSpawnDist += 24 + Math.random() * 16;
    }

    // ---- GOAL CHANCE lead-in: player stops running, the goal flies in toward him ----
    if (penLeadActive) {
      // freeze the run: no distance/field/obstacle updates happen while the goal approaches
      const ldt = slowmoT > 0 ? dt * 0.5 : dt;   // cinematic slow approach
      if (penLead) {
        // ease the goal + keeper from far away toward the player's viewpoint
        const targetZ = -20;
        penLead.position.z += (targetZ - penLead.position.z) * Math.min(1, ldt * 1.6);
        const tx = LANES[player.userData.lane];
        penLead.position.x += (tx - penLead.position.x) * Math.min(1, ldt * 2.2);
        penLead.position.x = Math.max(LANES[0], Math.min(LANES[2], penLead.position.x));
        if (penLead.userData.animate) penLead.userData.animate(ldt);
        // when it has arrived close to the player, hand off to the real GOAL CHANCE
        if (penLead.position.z > -21) {
          scene.remove(penLead); penLead = null;
          penLeadActive = false; penLeadSpawned = false;
          startPenalty();                // existing GOAL CHANCE code — untouched
        }
      }
      return;                           // skip the rest of the running update this frame
    }

    // penalty box trigger at escalating, jittered distances (500, ~1500, ~2750 …)
    if (penKeeperGrace > 0) penKeeperGrace -= speed * dt;
    // start the lead-in when we're within runway distance of the next GOAL CHANCE
    if (state === 'playing' && !penLeadSpawned && distance >= nextPenaltyAt - PEN_LEAD && invisibleT <= 0 && grace <= 0) {
      penLeadSpawned = true;
      penLeadActive = true;
      slowmoT = 1.2;                     // smooth slow-mo during the approach
      spawnPenaltyLead();
    }
    if (state === 'playing' && distance >= nextPenaltyAt && invisibleT <= 0 && grace <= 0) {
      // (fallback: if lead-in wasn't active, just start — keeps old behaviour)
      slowmoT = 1.0;
      startPenalty();
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

    if (slowmoT > 0) slowmoT -= dt;
    // slow-mo punch as GOAL CHANCE begins (only affects the running view)
    const gdt = (slowmoT > 0 && state === 'playing') ? dt * 0.35 : dt;

    if (state === 'dying') {
      dyingT -= dt;
      if (dyingT <= 0) finishGameOver();
    } else if (!paused && state === 'playing') {
      update(gdt);
    } else if (!paused && state === 'penalty') {
      updatePenalty(dt);
    } else if (state === 'intro') {
      updateIntro(dt);
    }

    particles.update(dt);
    scoreEl.textContent = score;
    distEl.textContent = Math.floor(distance) + ' m';
    starEl.textContent = starCount;
    goalCountEl.textContent = goalCount;
    if (state === 'playing') updatePenMap(); else penMap.classList.add('hidden');

    // camera shake
    if (shakeT > 0) {
      shakeT -= dt;
      const s = Math.max(0, shakeT) * 0.5;
      camera.position.set(CAM_GAME_POS.x + (Math.random() - 0.5) * s, CAM_GAME_POS.y + (Math.random() - 0.5) * s, CAM_GAME_POS.z);
    } else if (state === 'playing' || state === 'dying') {
      camera.position.copy(CAM_GAME_POS);
    }

    // smooth KICKOFF BLAST camera punch (eases back to base fov)
    if (state !== 'penalty') {
      fovKick += (0 - fovKick) * Math.min(1, dt * 3.5);
      camera.fov = 60 + fovKick * 9;
      camera.updateProjectionMatrix();
    }

    // Only render the full game scene during active gameplay states
    if (state === 'playing' || state === 'dying' || state === 'intro' || state === 'penalty') {
      composer.render();
    }

    if (state === 'career' && careerPlayer && careerRenderer) {
      careerPhase += dt * 7;
      careerPlayer.animate(careerPhase, false);
      careerPlayer.group.rotation.y += dt * 0.5;
      careerRenderer.render(careerScene, careerCam);
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.setSize(window.innerWidth * BLOOM_SCALE, window.innerHeight * BLOOM_SCALE);
    if (fxaaPass) {
      const pr = renderer.getPixelRatio();
      fxaaPass.material.uniforms.resolution.value.set(1 / (window.innerWidth * pr), 1 / (window.innerHeight * pr));
    }
  });
})();
