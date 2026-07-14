// game.js — orchestrates scene, player, opponents, trophies, input, loop and HUD.
(function () {
  const K = (window.Kickoff = window.Kickoff || {});
  const LANES = [-2.4, 0, 2.4];
  const GRAVITY = -42, JUMP_V = 15, ROLL_TIME = 0.55;
  const PLAYER_Z = 0, BASE_SPEED = 18, DESPAWN_Z = 14;

  const container = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 4.4, 9);
  camera.lookAt(0, 1.4, -12);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.95);
  sun.position.set(14, 34, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
  sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
  scene.add(sun);

  let field = K.Field.create(scene, 'worldcup');
  const playerObj = K.Player.create(scene);
  const player = playerObj.group;

  const obstacles = [], trophies = [];
  const obstacleGroup = new THREE.Group();
  const trophyGroup = new THREE.Group();
  scene.add(obstacleGroup, trophyGroup);

  // ---- state ----
  let state = 'menu', speed = BASE_SPEED, distance = 0, trophyCount = 0;
  let nextSpawnDist = 0, nextSpawnGap = 22, runPhase = 0;
  const SPAWN_Z = -160;
  let currentWorld = 'worldcup';
  let best = parseInt(localStorage.getItem('kickoffBest') || '0', 10);

  const scoreEl = document.getElementById('score');
  const trophyEl = document.getElementById('trophyCount');
  const startScreen = document.getElementById('startScreen');
  const overScreen = document.getElementById('overScreen');
  const flash = document.getElementById('flash');

  function resetGame() {
    obstacles.forEach(o => obstacleGroup.remove(o));
    trophies.forEach(b => trophyGroup.remove(b));
    obstacles.length = 0; trophies.length = 0;

    const u = player.userData;
    u.lane = 1; u.x = LANES[1]; u.y = 0; u.vy = 0;
    u.jumping = false; u.rolling = false; u.rollT = 0;
    player.position.set(LANES[1], 0, PLAYER_Z);
    player.rotation.z = 0; player.scale.y = 1;

    speed = BASE_SPEED; distance = 0; trophyCount = 0;
    nextSpawnGap = 24;
    // pre-fill the visible track (leaving a short runway) so it never runs empty
    let z = SPAWN_Z;
    while (z < -20) { spawnChunk(z); z += nextSpawnGap; nextSpawnGap = 16 + Math.random() * 12; }
    nextSpawnDist = nextSpawnGap;
  }

  function startGame(world) {
    if (world) currentWorld = world;
    field = K.Field.create(scene, currentWorld);
    K.Audio.init(); K.Audio.resume();
    resetGame();
    state = 'playing';
    startScreen.classList.add('hidden');
    overScreen.classList.add('hidden');
    K.Audio.sfx.whistle();
    K.Audio.startMusic();
  }

  function gameOver() {
    state = 'over';
    K.Audio.sfx.crash();
    K.Audio.stopMusic();
    flash.style.transition = 'none'; flash.style.opacity = '0.85';
    requestAnimationFrame(() => { flash.style.transition = 'opacity .4s'; flash.style.opacity = '0'; });
    const d = Math.floor(distance);
    if (d > best) { best = d; localStorage.setItem('kickoffBest', best); }
    document.getElementById('finalScore').textContent = d;
    document.getElementById('finalTrophies').textContent = trophyCount;
    document.getElementById('bestLine').textContent = 'Best run: ' + best + ' m';
    overScreen.classList.remove('hidden');
  }

  // ---- spawning ----
  // Enemies (rival players) appear in any lane like Subway-Surfers trains.
  // 1 or 2 lanes are blocked per chunk (randomised), always leaving a safe lane.
  function spawnChunk(z) {
    const order = [0, 1, 2];
    for (let i = order.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [order[i], order[j]] = [order[j], order[i]];
    }
    const blockedCount = Math.random() < 0.55 ? 1 : 2; // usually just one lane
    const types = ['block', 'slide', 'leap'];
    for (let i = 0; i < blockedCount; i++) {
      const lane = order[i];
      const t = types[(Math.random() * types.length) | 0];
      const o = K.Opponent.create(lane, t);
      o.position.x = LANES[lane];   // place in its actual lane (was stuck at centre)
      o.position.z = z;
      o.userData.z = z;
      obstacleGroup.add(o);
      obstacles.push(o);
    }
    const freeLane = order[blockedCount]; // guaranteed open lane
    const n = 3 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const b = K.Trophy.create();
      b.position.set(LANES[freeLane], 1.0, z + i * 1.6);
      b.userData.z = z + i * 1.6;
      b.userData.lane = freeLane;
      trophyGroup.add(b);
      trophies.push(b);
    }
  }

  // ---- input ----
  function moveLane(dir) {
    if (state !== 'playing') return;
    const u = player.userData;
    const nl = Math.min(2, Math.max(0, u.lane + dir));
    if (nl !== u.lane) u.lane = nl;
  }
  function doJump() {
    if (state !== 'playing') return;
    const u = player.userData;
    if (!u.jumping && !u.rolling) { u.vy = JUMP_V; u.jumping = true; K.Audio.sfx.jump(); }
  }
  function doRoll() {
    if (state !== 'playing') return;
    const u = player.userData;
    if (!u.rolling && !u.jumping) { u.rolling = true; u.rollT = ROLL_TIME; K.Audio.sfx.roll(); }
    else if (u.jumping) { u.vy = -JUMP_V * 1.4; }
  }

  window.addEventListener('keydown', e => {
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': moveLane(-1); break;
      case 'ArrowRight': case 'd': case 'D': moveLane(1); break;
      case 'ArrowUp': case 'w': case 'W': case ' ': doJump(); e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S': doRoll(); break;
      case 'm': case 'M': K.Audio.toggle(); break;
      case 'r': case 'R': if (state !== 'menu') startGame(); break;
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

  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('restartBtn').addEventListener('click', startGame);

  // world selection
  const worldScreen = document.getElementById('worldScreen');
  const changeWorldBtn = document.getElementById('changeWorldBtn');
  function showWorldScreen() {
    state = 'menu';
    K.Audio.stopMusic();
    overScreen.classList.add('hidden');
    worldScreen.classList.remove('hidden');
  }
  document.querySelectorAll('.world-card').forEach(card => {
    card.addEventListener('click', () => {
      worldScreen.classList.add('hidden');
      startGame(card.dataset.world);
    });
  });
  if (changeWorldBtn) changeWorldBtn.addEventListener('click', showWorldScreen);

  // ---- collisions ----
  function checkObstacle(o) {
    const u = player.userData, d = o.userData;
    if (Math.abs(o.position.z - PLAYER_Z) < d.halfDepth + 0.4 && Math.abs(u.x - o.position.x) < 0.85) {
      if (d.type === 'block') gameOver();
      else if (d.type === 'slide') { if (u.y < d.height - 0.1) gameOver(); }
      else if (d.type === 'leap') {
        const top = u.y + (u.rolling ? u.rollHeight : u.height);
        if (top > d.gapBottom) gameOver();
      }
    }
  }
  function checkTrophy(b) {
    const u = player.userData;
    if (Math.abs(b.position.z - PLAYER_Z) < 0.8 && Math.abs(u.x - b.position.x) < 1.2) {
      const top = u.y + (u.rolling ? u.rollHeight : u.height);
      const cy = b.position.y;
      if (top > cy - 0.7 && u.y < cy + 0.7) {
        b.userData.taken = true;
        trophyGroup.remove(b);
        trophies.splice(trophies.indexOf(b), 1);
        trophyCount++;
        K.Audio.sfx.trophy();
      }
    }
  }

  // ---- update ----
  function update(dt) {
    speed = BASE_SPEED + Math.min(22, distance / 90);
    distance += speed * dt;

    const u = player.userData;
    u.x += (LANES[u.lane] - u.x) * Math.min(1, dt * 12);
    player.position.x = u.x;

    if (u.jumping) {
      u.vy += GRAVITY * dt; u.y += u.vy * dt;
      if (u.y <= 0) { u.y = 0; u.vy = 0; u.jumping = false; }
    }
    if (u.rolling) { u.rollT -= dt; if (u.rollT <= 0) u.rolling = false; }
    player.position.y = u.y;

    const targetScaleY = u.rolling ? 0.5 : 1;
    player.scale.y += (targetScaleY - player.scale.y) * Math.min(1, dt * 18);
    player.rotation.z += ((u.rolling ? -0.5 : 0) - player.rotation.z) * Math.min(1, dt * 14);

    runPhase += dt * (10 + speed * 0.25);
    playerObj.animate(runPhase, u.rolling);

    const moveAmt = speed * dt;
    field.scroll(moveAmt);

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.position.z += moveAmt; o.userData.z = o.position.z;
      o.userData.animate && o.userData.animate(dt);
      if (o.userData.z > DESPAWN_Z) { obstacleGroup.remove(o); obstacles.splice(i, 1); continue; }
      checkObstacle(o);
      if (state === 'over') return;
    }
    for (let i = trophies.length - 1; i >= 0; i--) {
      const b = trophies[i];
      b.position.z += moveAmt; b.userData.z = b.position.z; // still/upright, just scrolls with the world
      if (b.userData.z > DESPAWN_Z) { trophyGroup.remove(b); trophies.splice(i, 1); continue; }
      checkTrophy(b);
    }

    // endless: drop a new chunk at the far spawn point every `nextSpawnGap` metres
    if (distance >= nextSpawnDist) {
      spawnChunk(SPAWN_Z);
      nextSpawnDist += nextSpawnGap;
      nextSpawnGap = 24 + Math.random() * 16;
    }
  }

  let last = performance.now();
  function loop(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;
    if (state === 'playing') update(dt);
    scoreEl.textContent = Math.floor(distance);
    trophyEl.textContent = trophyCount;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
