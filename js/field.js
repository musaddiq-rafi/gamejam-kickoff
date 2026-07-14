// field.js — the football stadium: scrolling pitch, white markings, stands, floodlights.
(function () {
  const K = (window.Kickoff = window.Kickoff || {});
  const PITCH_HALF = 9;          // half width of playable pitch
  const STRIPE_LEN = 8;          // length of one mowing stripe
  const STRIPE_COUNT = 30;

  let stripes = [], lines = [], circles = [], stands = [], floods = [];

  function crowdTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#3a4a3a'; x.fillRect(0, 0, 256, 128);
    const cols = ['#e74c3c', '#f1c40f', '#ecf0f1', '#3498db', '#2ecc71', '#e67e22', '#9b59b6'];
    for (let i = 0; i < 1400; i++) {
      x.fillStyle = cols[(Math.random() * cols.length) | 0];
      x.fillRect((Math.random() * 256) | 0, (Math.random() * 128) | 0, 2, 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 2);
    return t;
  }

  function create(scene) {
    scene.background = new THREE.Color(0x9fd4ff);
    scene.fog = new THREE.Fog(0x9fd4ff, 55, 160);

    // base grass
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(PITCH_HALF * 2 + 40, 600),
      new THREE.MeshStandardMaterial({ color: 0x2e8b3d, roughness: 1 })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.set(0, 0, -150);
    base.receiveShadow = true;
    scene.add(base);

    // mowing stripes (scroll)
    const stripeGeo = new THREE.PlaneGeometry(PITCH_HALF * 2, STRIPE_LEN);
    for (let i = 0; i < STRIPE_COUNT; i++) {
      const m = new THREE.Mesh(stripeGeo, new THREE.MeshStandardMaterial({
        color: i % 2 ? 0x36a047 : 0x2c7d38, roughness: 1
      }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, 0.01, -i * STRIPE_LEN);
      m.receiveShadow = true;
      scene.add(m);
      stripes.push(m);
    }

    // pitch boundary lines (static, run along z)
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    [-PITCH_HALF, PITCH_HALF].forEach(x => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 600), lineMat);
      s.position.set(x, 0.03, -150);
      scene.add(s);
    });
    // halfway line + transverse lines scroll
    const transGeo = new THREE.PlaneGeometry(PITCH_HALF * 2, 0.22);
    for (let i = 0; i < STRIPE_COUNT; i++) {
      const l = new THREE.Mesh(transGeo, lineMat);
      l.rotation.x = -Math.PI / 2;
      l.position.set(0, 0.03, -i * STRIPE_LEN);
      scene.add(l);
      lines.push(l);
    }
    // centre circles scrolling
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.6, 2.8, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.03, -i * (STRIPE_COUNT / 6) * STRIPE_LEN);
      scene.add(ring);
      circles.push(ring);
    }

    // stadium stands on both sides (scroll + recycle)
    const standGeo = new THREE.BoxGeometry(10, 14, 30);
    const crowdTex = crowdTexture();
    const standMat = new THREE.MeshStandardMaterial({ map: crowdTex, roughness: 1 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 1 });
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 6; i++) {
        const seg = new THREE.Group();
        const stand = new THREE.Mesh(standGeo, standMat);
        stand.position.y = 7;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 14, 30), wallMat);
        wall.position.set(-side * 5, 7, 0);
        // roof
        const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.6, 30),
          new THREE.MeshStandardMaterial({ color: 0x2c3e50 }));
        roof.position.set(0, 14.3, 0);
        seg.add(stand, wall, roof);
        seg.position.set(side * (PITCH_HALF + 8), 0, -i * 30);
        scene.add(seg);
        stands.push(seg);
      }
    }

    // floodlights atop stands
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xffe27a, emissiveIntensity: 0.9 });
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 4; i++) {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 22, 8), poleMat);
        pole.position.y = 11; pole.castShadow = true;
        const head = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 0.6), lampMat);
        head.position.y = 22;
        g.add(pole, head);
        g.position.set(side * (PITCH_HALF + 8), 0, -i * 45);
        scene.add(g);
        floods.push(g);
      }
    }

    function scroll(moveAmt) {
      const total = STRIPE_COUNT * STRIPE_LEN;
      stripes.forEach(s => { s.position.z += moveAmt; if (s.position.z > 10) s.position.z -= total; });
      lines.forEach(s => { s.position.z += moveAmt; if (s.position.z > 10) s.position.z -= total; });
      circles.forEach(c => { c.position.z += moveAmt; if (c.position.z > 10) c.position.z -= 6 * (STRIPE_COUNT / 6) * STRIPE_LEN; });
      stands.forEach(s => { s.position.z += moveAmt; if (s.position.z > 30) s.position.z -= 6 * 30; });
      floods.forEach(f => { f.position.z += moveAmt; if (f.position.z > 45) f.position.z -= 4 * 45; });
    }

    return { scroll };
  }

  K.Field = { create };
})();
