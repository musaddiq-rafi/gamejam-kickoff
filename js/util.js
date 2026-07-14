// util.js — small shared helpers (soccer-ball texture).
(function () {
  const K = (window.Kickoff = window.Kickoff || {});

  function makeSoccerTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#1a1a1a';
    function pent(cx, cy, r) {
      x.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.closePath(); x.fill();
    }
    pent(64, 64, 16);
    pent(20, 30, 10); pent(108, 30, 10);
    pent(20, 98, 10); pent(108, 98, 10);
    pent(64, 8, 9); pent(64, 120, 9);
    const t = new THREE.CanvasTexture(c);
    return t;
  }

  K.makeSoccerTexture = makeSoccerTexture;
})();
