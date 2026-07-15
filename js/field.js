// field.js — themed football environments. Each world only changes the scenery:
//   'worldcup' : open stadium with cheering crowd, banners/placards, floodlights
//   'beach'    : sandy pitch by the sea with a sun and palm trees
//   'indoor'   : enclosed arena with a roof, close stands and a scoreboard
(function () {
  const K = (window.Kickoff = window.Kickoff || {});
  const PITCH_HALF = 9;
  const STRIPE_LEN = 8, STRIPE_COUNT = 30;

  const THEMES = {
    worldcup: { sky: 0x9fd4ff, skyTop: 0x2f74c0, fog: 0x9fd4ff, fogFar: 170, pitch: 0x2e8b3d, style: 'stadium' },
    beach:    { sky: 0xbfe9ff, skyTop: 0x3aa6de, fog: 0xd6ecf2, fogFar: 200, pitch: 0xc2913f, style: 'beach' },
    indoor:   { sky: 0x1b1f29, skyTop: 0x0c0e14, fog: 0x1b1f29, fogFar: 110, pitch: 0x2f8f43, style: 'indoor' }
  };

  // vertical gradient sky (top -> horizon) baked into a canvas texture
  function skyTexture(topHex, bottomHex) {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const x = c.getContext('2d');
    const top = '#' + topHex.toString(16).padStart(6, '0');
    const bot = '#' + bottomHex.toString(16).padStart(6, '0');
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, top); g.addColorStop(0.72, bot); g.addColorStop(1, bot);
    x.fillStyle = g; x.fillRect(0, 0, 4, 256);
    return new THREE.CanvasTexture(c);
  }

  // procedural turf: speckled blades around the pitch base colour (works for grass or sand)
  function turfTexture(baseHex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#' + baseHex.toString(16).padStart(6, '0');
    x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 3200; i++) {
      const d = Math.random() * 0.5 - 0.24;
      x.fillStyle = '#' + shade(baseHex, d).toString(16).padStart(6, '0');
      const px = (Math.random() * 128) | 0, py = (Math.random() * 128) | 0;
      x.fillRect(px, py, 1, 1 + ((Math.random() * 3) | 0)); // tiny blades
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  // a soft cloud made of overlapping white puffs
  function cloud() {
    const g = new THREE.Group();
    const cmat = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 1, flatShading: true, emissive: 0x8ea2b6, emissiveIntensity: 0.08 });
    const puffs = 3 + ((Math.random() * 3) | 0);
    for (let i = 0; i < puffs; i++) {
      const r = 2 + Math.random() * 2.2;
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), cmat);
      puff.position.set((i - puffs / 2) * 2.4 + Math.random(), Math.random() * 1.4, Math.random() * 2.4);
      puff.scale.y = 0.55;
      g.add(puff);
    }
    return g;
  }

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
    scene.background = skyTexture(theme.skyTop != null ? theme.skyTop : theme.sky, theme.sky);
    scene.fog = new THREE.Fog(theme.fog, 48, theme.fogFar);

    const root = new THREE.Group();
    scene.add(root);
    currentRoot = root;

    // ---- common pitch ----
    const stripes = [], lines = [], circles = [];
    const baseTurf = turfTexture(theme.pitch); baseTurf.repeat.set(24, 220);
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(PITCH_HALF * 2 + 40, 600),
      new THREE.MeshStandardMaterial({ map: baseTurf, roughness: 1 })
    );
    base.rotation.x = -Math.PI / 2; base.position.set(0, 0, -150); base.receiveShadow = true;
    root.add(base);

    const stripeGeo = new THREE.PlaneGeometry(PITCH_HALF * 2, STRIPE_LEN);
    for (let i = 0; i < STRIPE_COUNT; i++) {
      const turf = turfTexture(theme.pitch); turf.repeat.set(9, 4);
      const m = new THREE.Mesh(stripeGeo, new THREE.MeshStandardMaterial({
        map: turf, color: i % 2 ? 0xffffff : 0xdcdcdc, roughness: 1 // mow-stripe tint over the turf
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
    // low-poly faceted crowd bodies: tapered torso + icosphere head, flat-shaded
    const bodyGeo = new THREE.CylinderGeometry(0.09, 0.16, 0.8, 5);
    const headGeo = new THREE.IcosahedronGeometry(0.19, 0);
    const bodyMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
    const headMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
    const crowdCols = 8, crowdRows = 4;
    const dummy = new THREE.Object3D();
    // curated, harmonised palette — no random neon (the classic AI-slop tell)
    const kitCols = [0xd94f45, 0xe0a63c, 0x2f9e8f, 0x2d4a6b, 0xe7e2d6, 0x9c4a86, 0x3a7ca5, 0xe07a3c];
    const skinCols = [0xf2c79a, 0xe0ac7d, 0xc98d5b, 0xa9713f, 0x7d5230];
    const flagCols = [0xd94f45, 0x3a7ca5, 0x2f9e8f, 0xe0a63c, 0x9c4a86, 0xe7e2d6];
    const pick = arr => arr[(Math.random() * arr.length) | 0];

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
          head.setColorAt(i, new THREE.Color(pick(skinCols)));
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
        head.setColorAt(c, new THREE.Color(pick(skinCols)));
      }
      body.instanceMatrix.needsUpdate = true; head.instanceMatrix.needsUpdate = true;
      if (body.instanceColor) body.instanceColor.needsUpdate = true;
      if (head.instanceColor) head.instanceColor.needsUpdate = true;
      parent.add(body, head);
    }

    // a stickman holding a waving flag
    function makeFlagBearer() {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: pick(kitCols), roughness: 1, flatShading: true });
      const skin = new THREE.MeshStandardMaterial({ color: pick(skinCols), roughness: 1, flatShading: true });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 0.8, 5), mat);
      body.position.y = 0.4;
      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19, 0), skin);
      head.position.y = 1.0;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 5),
        new THREE.MeshStandardMaterial({ color: 0x6b6f76, roughness: 1, flatShading: true }));
      pole.position.y = 1.4;
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45),
        new THREE.MeshStandardMaterial({ color: pick(flagCols), roughness: 1, side: THREE.DoubleSide }));
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
        // clean flat-shaded seating, one team colour per side (organised, professional look)
        const seatMats = [
          new THREE.MeshStandardMaterial({ color: 0x2d4a6b, roughness: 1, flatShading: true }),
          new THREE.MeshStandardMaterial({ color: 0xb0413e, roughness: 1, flatShading: true })
        ];
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xe7e2d6, roughness: 1, flatShading: true });
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
              const step = new THREE.Mesh(new THREE.BoxGeometry(STEP_D, h, 30), seatMats[(side + 1) / 2]);
              step.position.set(cx, h / 2, 0);
              seg.add(step);
              steps.push({ x: frontX + side * (r * STEP_D + STEP_D * 0.6), y: h });
            }
            // front barrier wall (facing the pitch) + roof over the stand
            const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, BASE_H, 30), wallMat);
            wall.position.set(frontX - side * 0.3, BASE_H / 2, 0);
            const roof = new THREE.Mesh(new THREE.BoxGeometry(ROWS * STEP_D + 2, 0.6, 30),
              new THREE.MeshStandardMaterial({ color: 0x243447, roughness: 1, flatShading: true }));
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
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x565b63, roughness: 1, flatShading: true });
      // floodlights only glow in the enclosed indoor arena; in daylight worlds they read as off glass
      const lampsOn = theme.style === 'indoor';
      const lampMat = new THREE.MeshStandardMaterial({
        color: lampsOn ? 0xfff6c0 : 0xcfd4d8,
        emissive: 0xffe27a,
        emissiveIntensity: lampsOn ? 0.9 : 0.05,
        roughness: 1.0, flatShading: true
      });
      if (theme.style === 'stadium') {
        for (let side = -1; side <= 1; side += 2)
          for (let i = 0; i < 4; i++) {
            const g = new THREE.Group();
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 22, 6), poleMat);
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
      const bannerCols = ['#d94f45', '#3a7ca5', '#2f9e8f', '#e0a63c', '#9c4a86'];
      for (let side = -1; side <= 1; side += 2)
        for (let i = 0; i < 6; i++) {
          const txt = chants[(Math.random() * chants.length) | 0];
          const bg = bannerCols[(Math.random() * bannerCols.length) | 0];
          const b = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.6),
            new THREE.MeshBasicMaterial({ map: textTexture(txt, '#' + bg.toString(16).padStart(6, '0'), '#ffffff'),
              side: THREE.DoubleSide }));
          b.position.set(side * (PITCH_HALF + 4), theme.style === 'indoor' ? 8 : 11, -i * 30);
          b.rotation.y = -side * 0.5;
          root.add(b); banners.push(b); track(b, 180);
        }
      // advertising boards at pitch side (indoor closer)
      const adCols = [0x2d4a6b, 0x9c4a86, 0x2f9e8f, 0xe07a3c];
      for (let side = -1; side <= 1; side += 2)
        for (let i = 0; i < 10; i++) {
          const ad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 6),
            new THREE.MeshStandardMaterial({ color: adCols[i % adCols.length], roughness: 1, flatShading: true }));
          ad.position.set(side * (PITCH_HALF + 1.2), 0.55, -i * 12);
          root.add(ad); boards.push(ad); track(ad, 120);
        }
    } else {
      // ---- beach ----
      // wide sandy beach floor: the sides read as sand, not water
      const sandMat = new THREE.MeshStandardMaterial({ color: 0xd9b676, roughness: 1 });
      const beachFloor = new THREE.Mesh(new THREE.PlaneGeometry(500, 720), sandMat);
      beachFloor.rotation.x = -Math.PI / 2; beachFloor.position.set(0, -0.06, -150);
      beachFloor.receiveShadow = true; root.add(beachFloor);

      // sea ONLY ahead — a wide band toward the horizon in front of the player
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 240),
        new THREE.MeshStandardMaterial({ color: 0x1ca3ec, roughness: 0.35, metalness: 0.1 }));
      sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.03, -250); root.add(sea);

      // the sun ahead-left (matches the beach key light direction)
      const sun = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xfff2a0, fog: false }));
      sun.position.set(-24, 44, -178); root.add(sun);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(15, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.25, fog: false }));
      glow.position.copy(sun.position); root.add(glow);
      // palm trees + umbrellas scrolling
      const umbCols = [0xd94f45, 0x3a7ca5, 0xe0a63c];
      function palm() {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.36, 5, 5),
          new THREE.MeshStandardMaterial({ color: 0x9c6b4a, roughness: 1, flatShading: true }));
        trunk.position.y = 2.5; trunk.castShadow = true;
        g.add(trunk);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x3a9d55, roughness: 1, flatShading: true });
        for (let i = 0; i < 6; i++) {
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3, 4), leafMat);
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
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 5),
            new THREE.MeshStandardMaterial({ color: 0xe7e2d6, roughness: 1, flatShading: true }));
          pole.position.y = 1.2;
          const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.8, 8),
            new THREE.MeshStandardMaterial({ color: umbCols[i % umbCols.length], roughness: 1, flatShading: true }));
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
            new THREE.MeshStandardMaterial({ color: 0xcbb789, roughness: 1, flatShading: true }));
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

    // drifting clouds under the open blue sky (outdoor worlds only — indoor has a roof)
    if (theme.style === 'stadium' || theme.style === 'beach') {
      for (let i = 0; i < 11; i++) {
        const cl = cloud();
        cl.position.set((Math.random() - 0.5) * 150, 26 + Math.random() * 18, -20 - i * 32);
        root.add(cl); track(cl, 360, 70);
      }
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
