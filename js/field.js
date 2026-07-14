// field.js — themed football environments. Each world only changes the scenery:
//   'worldcup' : open stadium with cheering crowd, banners/placards, floodlights
//   'beach'    : sandy pitch by the sea with a sun and palm trees
//   'indoor'   : enclosed arena with a roof, close stands and a scoreboard
(function () {
  const K = (window.Kickoff = window.Kickoff || {});
  const PITCH_HALF = 9;
  const STRIPE_LEN = 8, STRIPE_COUNT = 30;

  const THEMES = {
    worldcup: { sky: 0x9fd4ff, fog: 0x9fd4ff, fogFar: 170, pitch: 0x2e8b3d, style: 'stadium' },
    beach:    { sky: 0xbfe9ff, fog: 0xd6ecf2, fogFar: 200, pitch: 0xc2913f, style: 'beach' },
    indoor:   { sky: 0x1b1f29, fog: 0x1b1f29, fogFar: 110, pitch: 0x2f8f43, style: 'indoor' }
  };

  function crowdTexture() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#3a4a3a'; x.fillRect(0, 0, 256, 128);
    const cols = ['#e74c3c', '#f1c40f', '#ecf0f1', '#3498db', '#2ecc71', '#e67e22', '#9b59b6'];
    for (let i = 0; i < 1500; i++) {
      x.fillStyle = cols[(Math.random() * cols.length) | 0];
      x.fillRect((Math.random() * 256) | 0, (Math.random() * 128) | 0, 2, 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 2);
    return t;
  }

  function textTexture(text, bg, fg) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96;
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 256, 96);
    x.fillStyle = fg; x.font = 'bold 56px Segoe UI, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 128, 50);
    const t = new THREE.CanvasTexture(c);
    return t;
  }

  let currentRoot = null;
  function disposeTree(obj) {
    obj.traverse(n => {
      if (n.geometry) n.geometry.dispose();
      if (n.material) { (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => m.dispose()); }
    });
  }

  function create(scene, themeKey) {
    const theme = THEMES[themeKey] || THEMES.worldcup;
    if (currentRoot) { scene.remove(currentRoot); disposeTree(currentRoot); }
    scene.background = new THREE.Color(theme.sky);
    scene.fog = new THREE.Fog(theme.fog, 55, theme.fogFar);

    const root = new THREE.Group();
    scene.add(root);
    currentRoot = root;

    // ---- common pitch ----
    const stripes = [], lines = [], circles = [];
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(PITCH_HALF * 2 + 40, 600),
      new THREE.MeshStandardMaterial({ color: theme.pitch, roughness: 1 })
    );
    base.rotation.x = -Math.PI / 2; base.position.set(0, 0, -150); base.receiveShadow = true;
    root.add(base);

    const stripeGeo = new THREE.PlaneGeometry(PITCH_HALF * 2, STRIPE_LEN);
    for (let i = 0; i < STRIPE_COUNT; i++) {
      const m = new THREE.Mesh(stripeGeo, new THREE.MeshStandardMaterial({
        color: i % 2 ? theme.pitch : shade(theme.pitch, -0.08), roughness: 1
      }));
      m.rotation.x = -Math.PI / 2; m.position.set(0, 0.01, -i * STRIPE_LEN);
      m.receiveShadow = true; root.add(m); stripes.push(m);
    }
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    [-PITCH_HALF, PITCH_HALF].forEach(x => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 600), lineMat);
      s.position.set(x, 0.03, -150); root.add(s);
    });
    const transGeo = new THREE.PlaneGeometry(PITCH_HALF * 2, 0.22);
    for (let i = 0; i < STRIPE_COUNT; i++) {
      const l = new THREE.Mesh(transGeo, lineMat);
      l.rotation.x = -Math.PI / 2; l.position.set(0, 0.03, -i * STRIPE_LEN); root.add(l); lines.push(l);
    }
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.8, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.03, -i * 40); root.add(ring); circles.push(ring);
    }

    // ---- theme backdrop ----
    const scrollers = []; // { obj, total, limit }
    function track(obj, total, limit) { scrollers.push({ obj, total: total, limit: limit == null ? 10 : limit }); }

    let banners = [], palms = [], umbrellas = [], roofLights = [], boards = [], scoreboards = [], stands = [], floods = [];
    let flagBearers = [], messages = [];

    // ---- gallery spectators: stickmen (instanced), flag-wavers, support messages ----
    const SHOW_AFTER = 25; // metres before the crowd starts showing support messages
    const CHEER_MSGS = ['KEEP GOING', 'VAMOS', 'ANKARA MESSI', 'OLE!', 'FORZA', 'GOAL!',
      'COME ON', 'RUN!', 'NICE!', 'CAMPEONES', 'YOU GOT THIS', 'LEGEND'];
    const bodyGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6);   // stickman torso
    const headGeo = new THREE.SphereGeometry(0.18, 8, 8);           // stickman head
    const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const headMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const crowdCols = 8, crowdRows = 4;
    const dummy = new THREE.Object3D();
    const kitCols = [0xe53935, 0x1e88e5, 0x43a047, 0xfbc02d, 0x8e24aa, 0xffffff, 0xfb8c00, 0x00bcd4];
    const flagCols = [0xe74c3c, 0x3498db, 0x2ecc71, 0xfbc02d, 0x9b59b6, 0xffffff];

    // base stickman crowd (instanced): body low, head on top
    function addCrowd(parent, innerX, tierX, baseY, topY, length, z0) {
      const n = crowdRows * crowdCols;
      const body = new THREE.InstancedMesh(bodyGeo, bodyMat, n);
      const head = new THREE.InstancedMesh(headGeo, headMat, n);
      let i = 0;
      for (let r = 0; r < crowdRows; r++) {
        const y = baseY + (r + 0.5) * ((topY - baseY) / crowdRows);
        const x = innerX + tierX * r;
        for (let c = 0; c < crowdCols; c++) {
          const z = z0 + (crowdCols === 1 ? 0 : (c / (crowdCols - 1) - 0.5) * length);
          dummy.position.set(x + (Math.random() - 0.5) * 0.15, y + 0.4, z);
          dummy.rotation.set(0, (Math.random() - 0.5) * 0.5, 0);
          dummy.scale.setScalar(0.9 + Math.random() * 0.25);
          dummy.updateMatrix();
          body.setMatrixAt(i, dummy.matrix);
          body.setColorAt(i, new THREE.Color(kitCols[(Math.random() * kitCols.length) | 0]));
          dummy.position.y = y + 1.0; dummy.updateMatrix();
          head.setMatrixAt(i, dummy.matrix);
          head.setColorAt(i, new THREE.Color(0xf1c27d));
          i++;
        }
      }
      body.instanceMatrix.needsUpdate = true; head.instanceMatrix.needsUpdate = true;
      if (body.instanceColor) body.instanceColor.needsUpdate = true;
      if (head.instanceColor) head.instanceColor.needsUpdate = true;
      parent.add(body, head);
    }

    // one row of stickmen along z, seated at a fixed x / ground height
    function addCrowdRow(parent, x, baseY, length, z0) {
      const n = crowdCols;
      const body = new THREE.InstancedMesh(bodyGeo, bodyMat, n);
      const head = new THREE.InstancedMesh(headGeo, headMat, n);
      for (let c = 0; c < crowdCols; c++) {
        const z = z0 + (c / (crowdCols - 1) - 0.5) * length;
        dummy.position.set(x + (Math.random() - 0.5) * 0.15, baseY + 0.4, z);
        dummy.rotation.set(0, (Math.random() - 0.5) * 0.5, 0);
        dummy.scale.setScalar(0.9 + Math.random() * 0.25);
        dummy.updateMatrix();
        body.setMatrixAt(c, dummy.matrix);
        body.setColorAt(c, new THREE.Color(kitCols[(Math.random() * kitCols.length) | 0]));
        dummy.position.y = baseY + 1.0; dummy.updateMatrix();
        head.setMatrixAt(c, dummy.matrix);
        head.setColorAt(c, new THREE.Color(0xf1c27d));
      }
      body.instanceMatrix.needsUpdate = true; head.instanceMatrix.needsUpdate = true;
      if (body.instanceColor) body.instanceColor.needsUpdate = true;
      if (head.instanceColor) head.instanceColor.needsUpdate = true;
      parent.add(body, head);
    }

    // a stickman holding a waving flag
    function makeFlagBearer() {
      const g = new THREE.Group();
      const kit = kitCols[(Math.random() * kitCols.length) | 0];
      const mat = new THREE.MeshStandardMaterial({ color: kit, roughness: 0.9 });
      const skin = new THREE.MeshStandardMaterial({ color: 0xf1c27d });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6), mat);
      body.position.y = 0.4;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), skin);
      head.position.y = 1.0;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 6),
        new THREE.MeshStandardMaterial({ color: 0x555555 }));
      pole.position.y = 1.4;
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45),
        new THREE.MeshStandardMaterial({ color: flagCols[(Math.random() * flagCols.length) | 0], side: THREE.DoubleSide }));
      flag.position.set(0.38, 1.7, 0);
      g.add(body, head, pole, flag);
      g.userData.flag = flag; g.userData.phase = Math.random() * 10;
      return g;
    }
    function addFlags(parent, innerX, tierX, baseY, topY, length, z0, count) {
      for (let k = 0; k < count; k++) {
        const fb = makeFlagBearer();
        const row = (Math.random() * crowdRows) | 0;
        const y = baseY + (row + 0.5) * ((topY - baseY) / crowdRows);
        const x = innerX + tierX * row + (Math.random() - 0.5) * 0.5;
        const z = z0 + (Math.random() - 0.5) * length;
        fb.position.set(x, y, z);
        fb.rotation.y = (Math.random() - 0.5) * 0.5;
        parent.add(fb);
        flagBearers.push(fb);
      }
    }

    // floating support-message bubble (canvas text), shown after some distance
    function makeMessage() {
      const canvas = document.createElement('canvas');
      canvas.width = 384; canvas.height = 96;
      const ctx = canvas.getContext('2d');
      const tex = new THREE.CanvasTexture(canvas);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 1.0),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, opacity: 0 }));
      mesh.visible = false;
      mesh.userData = { canvas, ctx, tex, timer: 4 + Math.random() * 8, shown: false, opacity: 0 };
      return mesh;
    }
    function setMsg(mesh, text) {
      const { ctx, tex } = mesh.userData;
      ctx.clearRect(0, 0, 384, 96);
      ctx.fillStyle = 'rgba(10,12,20,0.72)'; ctx.fillRect(6, 6, 372, 84);
      ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 4; ctx.strokeRect(6, 6, 372, 84);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 36px Segoe UI, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, 192, 50);
      tex.needsUpdate = true;
    }
    function addMessages(parent, x, y, count) {
      for (let k = 0; k < count; k++) {
        const m = makeMessage();
        m.position.set(x + (Math.random() - 0.5) * 2, y, (Math.random() - 0.5) * 20);
        parent.add(m);
        messages.push(m);
      }
    }

      if (theme.style === 'stadium' || theme.style === 'indoor') {
        const crowdTex = crowdTexture();
        const standMat = new THREE.MeshStandardMaterial({ map: crowdTex, roughness: 1 });
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 1 });
        const sH = theme.style === 'indoor' ? 11 : 14;
        const STEP_H = 1.4, STEP_D = 1.1, ROWS = crowdRows; // stepped grandstand
        const BASE_H = 1.2; // front barrier height
        const TOP_H = BASE_H + ROWS * STEP_H; // top of the highest step
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < 6; i++) {
            const seg = new THREE.Group();
            const frontX = -side * 5; // pitch-facing edge of the stand (local)
            const steps = [];
            for (let r = 0; r < ROWS; r++) {
              const h = BASE_H + (r + 1) * STEP_H;
              const cx = frontX + side * (r * STEP_D + STEP_D / 2);
              const step = new THREE.Mesh(new THREE.BoxGeometry(STEP_D, h, 30), standMat);
              step.position.set(cx, h / 2, 0);
              seg.add(step);
              steps.push({ x: frontX + side * (r * STEP_D + STEP_D * 0.6), y: h });
            }
            // front barrier wall (facing the pitch) + roof over the stand
            const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, BASE_H, 30), wallMat);
            wall.position.set(frontX - side * 0.3, BASE_H / 2, 0);
            const roof = new THREE.Mesh(new THREE.BoxGeometry(ROWS * STEP_D + 2, 0.6, 30),
              new THREE.MeshStandardMaterial({ color: 0x2c3e50 }));
            roof.position.set(frontX + side * (ROWS * STEP_D / 2), TOP_H + 1.4, 0);
            seg.add(wall, roof);
            seg.position.set(side * (PITCH_HALF + 8), 0, -i * 30);
            root.add(seg); stands.push(seg); track(seg, 180);
            // seat the crowd one row per step (clearly in front of the wall)
            steps.forEach(s => addCrowdRow(seg, s.x, s.y, 26, 0));
            // a single gentle flag-waver and a support bubble on random steps
            {
              const s = steps[(Math.random() * steps.length) | 0];
              const fb = makeFlagBearer();
              fb.position.set(s.x, s.y, (Math.random() - 0.5) * 24);
              fb.rotation.y = (Math.random() - 0.5) * 0.5;
              seg.add(fb); flagBearers.push(fb);
            }
            // support bubble sits at the front of the stand, just under the roof (never floats over it)
            const m = makeMessage();
            m.position.set(frontX + side * 0.3, TOP_H + 0.7, (Math.random() - 0.5) * 18);
            seg.add(m); messages.push(m);
          }
        }
      // floodlights (stadium) / roof spotlights (indoor)
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
      const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xffe27a, emissiveIntensity: 0.9 });
      if (theme.style === 'stadium') {
        for (let side = -1; side <= 1; side += 2)
          for (let i = 0; i < 4; i++) {
            const g = new THREE.Group();
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 22, 8), poleMat);
            pole.position.y = 11; pole.castShadow = true;
            const head = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 0.6), lampMat); head.position.y = 22;
            g.add(pole, head); g.position.set(side * (PITCH_HALF + 8), 0, -i * 45);
            root.add(g); floods.push(g); track(g, 180);
          }
      } else {
        for (let i = 0; i < 8; i++) {
          const p = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 1.2), lampMat);
          p.position.set((-1 + (i % 2) * 2) * (PITCH_HALF + 4), 23.5, -i * 22);
          root.add(p); roofLights.push(p); track(p, 176);
        }
        // roof
        const roof = new THREE.Mesh(new THREE.PlaneGeometry(60, 400),
          new THREE.MeshStandardMaterial({ color: 0x12141b, roughness: 1 }));
        roof.rotation.x = Math.PI / 2; roof.position.set(0, 24, -120); root.add(roof);
        // scoreboard at far end
        const sb = new THREE.Mesh(new THREE.PlaneGeometry(14, 5),
          new THREE.MeshBasicMaterial({ map: textTexture('0 - 0', '#0b0b0b', '#ffd54f') }));
        sb.position.set(0, 16, -150); root.add(sb); scoreboards.push(sb);
      }
      // cheering placards / banners high on the stands
      const chants = ['GOAL!', 'VAMOS!', 'ALLEZ!', 'COME ON!', 'OLE!', 'FORZA!'];
      const flagCols = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];
      for (let side = -1; side <= 1; side += 2)
        for (let i = 0; i < 6; i++) {
          const txt = chants[(Math.random() * chants.length) | 0];
          const bg = flagCols[(Math.random() * flagCols.length) | 0];
          const b = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.6),
            new THREE.MeshBasicMaterial({ map: textTexture(txt, '#' + bg.toString(16).padStart(6, '0'), '#ffffff'),
              side: THREE.DoubleSide }));
          b.position.set(side * (PITCH_HALF + 4), theme.style === 'indoor' ? 8 : 11, -i * 30);
          b.rotation.y = -side * 0.5;
          root.add(b); banners.push(b); track(b, 180);
        }
      // advertising boards at pitch side (indoor closer)
      const adCols = ['#1565c0', '#ad1457', '#00897b', '#ef6c00'];
      for (let side = -1; side <= 1; side += 2)
        for (let i = 0; i < 10; i++) {
          const ad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 6),
            new THREE.MeshStandardMaterial({ color: adCols[i % adCols.length], emissive: 0x111111 }));
          ad.position.set(side * (PITCH_HALF + 1.2), 0.55, -i * 12);
          root.add(ad); boards.push(ad); track(ad, 120);
        }
    } else {
      // ---- beach ----
      // sea + sun (static background)
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400),
        new THREE.MeshStandardMaterial({ color: 0x1ca3ec, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.9 }));
      sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.4, -180); root.add(sea);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xfff2a0 }));
      sun.position.set(-30, 35, -260); root.add(sun);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.25 }));
      glow.position.copy(sun.position); root.add(glow);
      // sand strip on each side
      const sandMat = new THREE.MeshStandardMaterial({ color: 0xc2913f, roughness: 1 });
      [-1, 1].forEach(s => {
        const sand = new THREE.Mesh(new THREE.PlaneGeometry(10, 600), sandMat);
        sand.rotation.x = -Math.PI / 2; sand.position.set(s * 16, 0.005, -150); root.add(sand);
      });
      // palm trees + umbrellas scrolling
      function palm() {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 5, 8),
          new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
        trunk.position.y = 2.5; trunk.castShadow = true;
        g.add(trunk);
        for (let i = 0; i < 6; i++) {
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3, 6),
            new THREE.MeshStandardMaterial({ color: 0x2e9e3f }));
          leaf.position.y = 5; leaf.rotation.z = Math.PI / 2.4;
          leaf.rotation.y = i * Math.PI / 3;
          leaf.position.x = Math.cos(i * Math.PI / 3) * 1.3;
          leaf.position.z = Math.sin(i * Math.PI / 3) * 1.3;
          g.add(leaf);
        }
        return g;
      }
      for (let side = -1; side <= 1; side += 2)
        for (let i = 0; i < 6; i++) {
          const p = palm();
          p.position.set(side * (PITCH_HALF + 7), 0, -i * 22 + (Math.random() * 6));
          root.add(p); palms.push(p); track(p, 132);
          const umb = new THREE.Group();
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
            new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
          pole.position.y = 1.2;
          const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.8, 12),
            new THREE.MeshStandardMaterial({ color: ['#e74c3c', '#3498db', '#f1c40f'][i % 3] }));
          canopy.position.y = 2.4;
          umb.add(pole, canopy);
          umb.position.set(side * (PITCH_HALF + 4), 0, -i * 22 - 11);
          root.add(umb); umbrellas.push(umb); track(umb, 132);
        }
      // spectator gallery along the beach: low bleachers with crowds on both sides
      [-1, 1].forEach(side => {
        for (let i = 0; i < 6; i++) {
          const seg = new THREE.Group();
          const step = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 30),
            new THREE.MeshStandardMaterial({ color: 0xcfc09a, roughness: 1 }));
          step.position.set(side * (PITCH_HALF + 3), 0.6, 0);
          seg.add(step);
          seg.position.set(0, 0, -i * 30);
          root.add(seg);
          addCrowd(seg, side * (PITCH_HALF + 1), side * 0.45, 1.4, 3.2, 26, 0);
          addFlags(seg, side * (PITCH_HALF + 1), side * 0.45, 1.4, 3.2, 26, 0, 2);
          addMessages(seg, side * (PITCH_HALF + 0.5), 4.5, 1);
          track(seg, 180);
        }
      });
    }

    function scroll(moveAmt) {
      const total = STRIPE_COUNT * STRIPE_LEN;
      stripes.forEach(s => { s.position.z += moveAmt; if (s.position.z > 10) s.position.z -= total; });
      lines.forEach(s => { s.position.z += moveAmt; if (s.position.z > 10) s.position.z -= total; });
      circles.forEach(c => { c.position.z += moveAmt; if (c.position.z > 10) c.position.z -= 240; });
      scrollers.forEach(sc => { sc.obj.position.z += moveAmt; if (sc.obj.position.z > sc.limit) sc.obj.position.z -= sc.total; });
    }

    // wave the flags gently; reveal support messages slowly (fade in/out) once far enough
    function update(distance, dt) {
      flagBearers.forEach(fb => {
        fb.userData.phase += dt * 1.4;
        fb.userData.flag.rotation.z = Math.sin(fb.userData.phase) * 0.25;
      });
      if (distance > SHOW_AFTER) {
        messages.forEach(m => {
          const u = m.userData;
          u.timer -= dt;
          if (u.timer <= 0) {
            u.timer = 7 + Math.random() * 7; // calm, infrequent
            if (Math.random() < 0.6) { setMsg(m, CHEER_MSGS[(Math.random() * CHEER_MSGS.length) | 0]); u.shown = true; }
            else u.shown = false;
          }
          const target = u.shown ? 1 : 0;
          u.opacity += (target - u.opacity) * Math.min(1, dt * 1.5); // gentle fade
          m.material.opacity = u.opacity;
          m.visible = u.opacity > 0.02;
        });
      } else {
        messages.forEach(m => {
          const u = m.userData;
          u.opacity += (0 - u.opacity) * Math.min(1, dt * 2);
          m.material.opacity = u.opacity;
          if (u.opacity <= 0.02) m.visible = false;
        });
      }
    }

    return { scroll, update, theme: theme.style, root };
  }

  // lighten/darken a hex color by amount (-1..1)
  function shade(hex, amt) {
    const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
    const f = c => Math.max(0, Math.min(255, Math.round(c + c * amt)));
    return (f(r) << 16) | (f(g) << 8) | f(b);
  }

  K.Field = { create, THEMES };
})();
