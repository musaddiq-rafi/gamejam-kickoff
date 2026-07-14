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
    beach:    { sky: 0xbfe9ff, fog: 0xcdeeff, fogFar: 200, pitch: 0xe7cd92, style: 'beach' },
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

    if (theme.style === 'stadium' || theme.style === 'indoor') {
      const standGeo = new THREE.BoxGeometry(10, theme.style === 'indoor' ? 11 : 14, 30);
      const crowdTex = crowdTexture();
      const standMat = new THREE.MeshStandardMaterial({ map: crowdTex, roughness: 1 });
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 1 });
      const sH = theme.style === 'indoor' ? 11 : 14;
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 6; i++) {
          const seg = new THREE.Group();
          const stand = new THREE.Mesh(standGeo, standMat); stand.position.y = sH / 2;
          const wall = new THREE.Mesh(new THREE.BoxGeometry(0.6, sH, 30), wallMat);
          wall.position.set(-side * 5, sH / 2, 0);
          const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.6, 30),
            new THREE.MeshStandardMaterial({ color: 0x2c3e50 }));
          roof.position.set(0, sH + 0.3, 0);
          seg.add(stand, wall, roof);
          seg.position.set(side * (PITCH_HALF + 8), 0, -i * 30);
          root.add(seg); stands.push(seg); track(seg, 180);
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
      const sandMat = new THREE.MeshStandardMaterial({ color: 0xe9d3a0, roughness: 1 });
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
    }

    function scroll(moveAmt) {
      const total = STRIPE_COUNT * STRIPE_LEN;
      stripes.forEach(s => { s.position.z += moveAmt; if (s.position.z > 10) s.position.z -= total; });
      lines.forEach(s => { s.position.z += moveAmt; if (s.position.z > 10) s.position.z -= total; });
      circles.forEach(c => { c.position.z += moveAmt; if (c.position.z > 10) c.position.z -= 240; });
      scrollers.forEach(sc => { sc.obj.position.z += moveAmt; if (sc.obj.position.z > sc.limit) sc.obj.position.z -= sc.total; });
    }

    return { scroll, theme: theme.style, root };
  }

  // lighten/darken a hex color by amount (-1..1)
  function shade(hex, amt) {
    const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
    const f = c => Math.max(0, Math.min(255, Math.round(c + c * amt)));
    return (f(r) << 16) | (f(g) << 8) | f(b);
  }

  K.Field = { create, THEMES };
})();
