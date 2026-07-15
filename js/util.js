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

  // ---- dummy brand + team badges for jerseys ----
  const BADGES = {
    ARGENTINA: { a: 0x6ca6e0, b: 0xffffff, abbr: 'AFA' },
    PORTUGAL:  { a: 0xc8102e, b: 0x006600, abbr: 'FPF' },
    BRAZIL:    { a: 0xfcd116, b: 0x1d3a8f, abbr: 'CBF' },
    FRANCE:    { a: 0x0055a4, b: 0xffffff, abbr: 'FFF' },
    EGYPT:     { a: 0xc8102e, b: 0xffffff, abbr: 'EFA' },
    ENGLAND:   { a: 0xffffff, b: 0xc8102e, abbr: 'FA' },
    NORWAY:    { a: 0xc8102e, b: 0x00205b, abbr: 'NFF' },
    CROATIA:   { a: 0xd11f2d, b: 0xffffff, abbr: 'HNS' },
    RIVAL:     { a: 0x2d4a6b, b: 0x9aa6b4, abbr: 'FC' }
  };
  function hex6(n) { return '#' + n.toString(16).padStart(6, '0'); }
  function lumOf(base) { const r = (base >> 16) & 255, g = (base >> 8) & 255, b = base & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
  function roundRect(x, rx, ry, w, h, r) {
    x.beginPath();
    x.moveTo(rx + r, ry);
    x.arcTo(rx + w, ry, rx + w, ry + h, r);
    x.arcTo(rx + w, ry + h, rx, ry + h, r);
    x.arcTo(rx, ry + h, rx, ry, r);
    x.arcTo(rx, ry, rx + w, ry, r);
    x.closePath();
  }
  // dummy brand mark (white chip with a swoosh + "KX" wordmark)
  function drawBrand(x, bx, by) {
    const w = 54, h = 34;
    roundRect(x, bx, by, w, h, 7); x.fillStyle = '#ffffff'; x.fill();
    x.lineWidth = 1.5; x.strokeStyle = 'rgba(0,0,0,.2)'; x.stroke();
    x.beginPath();
    x.moveTo(bx + 10, by + 25);
    x.quadraticCurveTo(bx + 24, by + 7, bx + 46, by + 12);
    x.quadraticCurveTo(bx + 27, by + 17, bx + 10, by + 25);
    x.fillStyle = '#141414'; x.fill();
    x.font = 'bold 11px Arial'; x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillStyle = '#141414'; x.fillText('KX', bx + 9, by + 11);
  }
  // team crest: white disc, split halves in country colours, abbreviation
  function drawBadge(x, cx, cy, r, country) {
    const b = BADGES[country] || BADGES.RIVAL;
    x.save();
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = '#ffffff'; x.fill();
    x.lineWidth = 2; x.strokeStyle = 'rgba(0,0,0,.25)'; x.stroke();
    x.clip();
    x.fillStyle = hex6(b.a); x.fillRect(cx - r, cy - r, r, r * 2);
    x.fillStyle = hex6(b.b); x.fillRect(cx, cy - r, r, r * 2);
    x.restore();
    x.save();
    x.font = 'bold 16px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = lumOf(b.a) > 0.62 ? '#101010' : '#ffffff';
    x.fillText(b.abbr, cx, cy + 1);
    x.restore();
  }
  // FRONT: brand logo (one side) + team badge (other side) + number (centre)
  function makeFrontJersey(opts) {
    opts = opts || {};
    const base = opts.base != null ? opts.base : 0xd94f45;
    const num = opts.number != null ? String(opts.number) : '';
    const country = opts.country || 'RIVAL';
    const S = 256;
    const c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    x.fillStyle = hex6(base); x.fillRect(0, 0, S, S);
    x.fillStyle = 'rgba(0,0,0,0.10)'; x.fillRect(0, 0, S, 14); // collar band
    drawBrand(x, 12, 16);
    drawBadge(x, 214, 33, 20, country);
    x.fillStyle = lumOf(base) > 0.62 ? '#0c0c0c' : '#ffffff';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold ' + (num.length >= 2 ? 74 : 86) + 'px Arial';
    x.fillText(num, 128, 172);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  // BACK: ONLY name + number (used for the user's player)
  function makeBackJersey(opts) {
    opts = opts || {};
    const base = opts.base != null ? opts.base : 0xd94f45;
    const num = opts.number != null ? String(opts.number) : '';
    const name = opts.name || '';
    const S = 256;
    const c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    x.fillStyle = hex6(base); x.fillRect(0, 0, S, S);
    x.fillStyle = 'rgba(0,0,0,0.10)'; x.fillRect(0, 0, S, 14);
    x.fillStyle = lumOf(base) > 0.62 ? '#0c0c0c' : '#ffffff';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (name) { x.font = 'bold 34px Arial'; x.fillText(name.toUpperCase(), 128, 58); }
    x.font = 'bold ' + (num.length >= 2 ? 150 : 170) + 'px Arial';
    x.fillText(num, 128, 160);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }

  K.makeSoccerTexture = makeSoccerTexture;
  K.makeFrontJersey = makeFrontJersey;
  K.makeBackJersey = makeBackJersey;
})();
