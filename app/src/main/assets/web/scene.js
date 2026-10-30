/* Horizonte — escena ilustrada del Estrecho desde el faro de Punta Carnero.
   Todo se dibuja en un lienzo de diseño de 1920x1080 y se escala a la pantalla. */
(function () {
  'use strict';

  const W = 1920, H = 1080, HOR = 640;
  const CFG = Object.assign({
    lat: 36.0773, lon: -5.4258,          // Faro de Punta Carnero
    juanitaBirth: '2026-10-15T12:00:00', // fecha aproximada de nacimiento de Juanita
    quality: 1                           // 1 = 1920x1080 internos
  }, window.HZ_CONFIG || {});

  // ---------- Tiempo (con modo prueba: ?t=2026-10-30T18:40&speed=600) ----------
  const qs = new URLSearchParams(location.search);
  const REAL0 = Date.now();
  const SIM0 = qs.get('t') ? new Date(qs.get('t')).getTime() : REAL0;
  const SPEED = parseFloat(qs.get('speed') || '1');
  const now = () => SIM0 + (Date.now() - REAL0) * SPEED;

  // ---------- Utilidades de color ----------
  const rgbCache = new Map();
  function h2r(h) {
    let v = rgbCache.get(h);
    if (!v) { const s = h.slice(1); v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; rgbCache.set(h, v); }
    return v;
  }
  const r2h = r => '#' + r.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = h2r(a), B = h2r(b); return r2h([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); };
  const rgba = (h, a) => { const r = h2r(h); return `rgba(${r[0]},${r[1]},${r[2]},${a})`; };
  const desat = (h, k) => { const r = h2r(h); const l = r[0] * 0.3 + r[1] * 0.59 + r[2] * 0.11; return r2h(r.map(v => v + (l - v) * k)); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------- Astronomía (adaptado de SunCalc, BSD) ----------
  const RAD = Math.PI / 180, DAYMS = 864e5, J1970 = 2440588, J2000 = 2451545, OBL = RAD * 23.4397;
  const toDays = ms => ms / DAYMS - 0.5 + J1970 - J2000;
  const decl = (l, b) => Math.asin(Math.sin(b) * Math.cos(OBL) + Math.cos(b) * Math.sin(OBL) * Math.sin(l));
  const rasc = (l, b) => Math.atan2(Math.sin(l) * Math.cos(OBL) - Math.tan(b) * Math.sin(OBL), Math.cos(l));
  const sidereal = (d, lw) => RAD * (280.16 + 360.9856235 * d) - lw;
  const altitude = (Hh, phi, dec) => Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(Hh));
  const azimuth = (Hh, phi, dec) => Math.atan2(Math.sin(Hh), Math.cos(Hh) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  function sunCoords(d) {
    const M = RAD * (357.5291 + 0.98560028 * d);
    const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const L = M + C + RAD * 102.9372 + Math.PI;
    return { dec: decl(L, 0), ra: rasc(L, 0) };
  }
  function moonCoords(d) {
    const L = RAD * (218.316 + 13.176396 * d), M = RAD * (134.963 + 13.064993 * d), F = RAD * (93.272 + 13.229350 * d);
    const l = L + RAD * 6.289 * Math.sin(M), b = RAD * 5.128 * Math.sin(F), dist = 385001 - 20905 * Math.cos(M);
    return { ra: rasc(l, b), dec: decl(l, b), dist };
  }
  function sunPos(ms) {
    const lw = RAD * -CFG.lon, phi = RAD * CFG.lat, d = toDays(ms), c = sunCoords(d), Hh = sidereal(d, lw) - c.ra;
    return { alt: altitude(Hh, phi, c.dec) / RAD, az: azimuth(Hh, phi, c.dec) / RAD };
  }
  function moonPos(ms) {
    const lw = RAD * -CFG.lon, phi = RAD * CFG.lat, d = toDays(ms), c = moonCoords(d), Hh = sidereal(d, lw) - c.ra;
    return { alt: altitude(Hh, phi, c.dec) / RAD, az: azimuth(Hh, phi, c.dec) / RAD };
  }
  function moonPhase(ms) {
    const d = toDays(ms), s = sunCoords(d), m = moonCoords(d), sd = 149598000;
    const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
    const inc = Math.atan2(sd * Math.sin(phi), m.dist - sd * Math.cos(phi));
    const ang = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
    return { fraction: (1 + Math.cos(inc)) / 2, phase: 0.5 + 0.5 * inc * (ang < 0 ? -1 : 1) / Math.PI };
  }
  const sunDayCache = {};
  function sunTimes(ms) {
    const day = new Date(ms); day.setHours(0, 0, 0, 0);
    const key = day.getTime();
    if (sunDayCache[key]) return sunDayCache[key];
    let rise = key + 7 * 36e5, set = key + 19 * 36e5, noonAlt = -90, prev = sunPos(key).alt;
    for (let m = 2; m <= 1440; m += 2) {
      const t = key + m * 6e4, a = sunPos(t).alt;
      if (prev < -0.833 && a >= -0.833) rise = t;
      if (prev >= -0.833 && a < -0.833) set = t;
      noonAlt = Math.max(noonAlt, a); prev = a;
    }
    return (sunDayCache[key] = { rise, set, noonAlt });
  }

  // ---------- Paletas por altura del sol ----------
  const P = {
    night:   { skyTop: '#141A2E', skyHor: '#2C3352', sun: '#FFF1D6', cloud: '#353B5A', cloudSh: '#252B45', mtFar: '#232A44', mtNear: '#1B2138', seaFar: '#1E2944', seaNear: '#111A2E', waves: '#5A6890', cliff: '#3A2A30', cliffSh: '#2A1F26', ground: '#33282E', path: '#4E4652', bush: '#1E2426', rock: '#2A2026', amb: '#2A3560', ambK: 0.55, ui: '#EDE8F2' },
    dusk:    { skyTop: '#3B3F63', skyHor: '#A27686', sun: '#FFE0B8', cloud: '#8A7590', cloudSh: '#5C5170', mtFar: '#4A4562', mtNear: '#36334E', seaFar: '#4C4E6C', seaNear: '#262D45', waves: '#A497B0', cliff: '#5A3438', cliffSh: '#43282C', ground: '#5C3C42', path: '#86707A', bush: '#2F3236', rock: '#42292E', amb: '#5A5A8A', ambK: 0.42, ui: '#F4ECE6' },
    sunset:  { skyTop: '#8C6F8E', skyHor: '#EFA27C', sun: '#FFE2B0', cloud: '#F2A98C', cloudSh: '#B97C84', mtFar: '#7A6178', mtNear: '#5E4B63', seaFar: '#7A6E84', seaNear: '#3A4560', waves: '#F2B79A', cliff: '#8A4636', cliffSh: '#6A352C', ground: '#965A44', path: '#D0A48A', bush: '#4C4836', rock: '#643C32', amb: '#E08A70', ambK: 0.26, ui: '#FBF1E6' },
    golden:  { skyTop: '#D99A6E', skyHor: '#F5C88E', sun: '#FFF1CC', cloud: '#F8D4A8', cloudSh: '#E0A27A', mtFar: '#A0838E', mtNear: '#83697A', seaFar: '#8E8A92', seaNear: '#4E5E72', waves: '#F6D8B0', cliff: '#AE573A', cliffSh: '#88412B', ground: '#BC7850', path: '#ECC79C', bush: '#5E5E3C', rock: '#7C4834', amb: '#FFB070', ambK: 0.16, ui: '#2B211C' },
    late:    { skyTop: '#C49080', skyHor: '#F4CC9C', sun: '#FFF2D2', cloud: '#F8DCBC', cloudSh: '#DFAE90', mtFar: '#A48A98', mtNear: '#866F84', seaFar: '#8590A0', seaNear: '#4A6276', waves: '#F5E0C4', cliff: '#B65E40', cliffSh: '#92462E', ground: '#C48256', path: '#EED0A6', bush: '#666A42', rock: '#844E3A', amb: '#FFC890', ambK: 0.12, ui: '#2D2621' },
    after:   { skyTop: '#8AA0B0', skyHor: '#F0D4A8', sun: '#FFF4DC', cloud: '#F6E4CA', cloudSh: '#DDBB9C', mtFar: '#A89CA4', mtNear: '#8C808E', seaFar: '#7894A2', seaNear: '#44677A', waves: '#F3E8D6', cliff: '#BE6444', cliffSh: '#9C4C32', ground: '#CC8A5C', path: '#F0D8B0', bush: '#6A7246', rock: '#8E5640', amb: '#FFE2B8', ambK: 0.08, ui: '#2D2621' },
    day:     { skyTop: '#7FA3B5', skyHor: '#E8DCC6', sun: '#FFF8E8', cloud: '#F5EDE0', cloudSh: '#DBD1C4', mtFar: '#A9B0BA', mtNear: '#8E97A5', seaFar: '#6E95A6', seaNear: '#3F6E84', waves: '#EAF1EE', cliff: '#BA664A', cliffSh: '#9A5038', ground: '#CB8F64', path: '#EEDABA', bush: '#6C784C', rock: '#8E5A45', amb: '#FFFFFF', ambK: 0.0, ui: '#2D2621' },
    // mañana: más rosas y fríos
    dawnDusk:{ skyTop: '#3E4468', skyHor: '#8E7896', sun: '#FFE6D0', cloud: '#7E7494', cloudSh: '#585274', mtFar: '#474864', mtNear: '#363650', seaFar: '#4A5070', seaNear: '#262E48', waves: '#9C98B8', cliff: '#563440', cliffSh: '#422830', ground: '#5A3E48', path: '#84727E', bush: '#2E3438', rock: '#402A30', amb: '#6A6A9A', ambK: 0.42, ui: '#F2ECF2' },
    dawn:    { skyTop: '#7D8AAE', skyHor: '#F3B8A6', sun: '#FFEAD6', cloud: '#F4C4BC', cloudSh: '#B99CAA', mtFar: '#80748E', mtNear: '#655A78', seaFar: '#7A7C98', seaNear: '#3C4866', waves: '#F2C8C0', cliff: '#8E4A42', cliffSh: '#6E3834', ground: '#9A6052', path: '#D4AA9A', bush: '#4C4C40', rock: '#663E3A', amb: '#E89A9A', ambK: 0.24, ui: '#FBF1EE' },
    morning: { skyTop: '#A6B4C8', skyHor: '#F6D5B4', sun: '#FFF4E2', cloud: '#F8E2D2', cloudSh: '#DCC0B4', mtFar: '#A8A0AE', mtNear: '#8E8496', seaFar: '#8698A8', seaNear: '#4A6A80', waves: '#F4E6DC', cliff: '#B65E46', cliffSh: '#944A36', ground: '#C48660', path: '#EED6B6', bush: '#62684A', rock: '#86503E', amb: '#FFD4C0', ambK: 0.12, ui: '#2D2621' }
  };
  const EVE = [[-14, P.night], [-8, P.dusk], [-3, P.sunset], [1, P.golden], [5, P.late], [12, P.after], [25, P.day]];
  const MORN = [[-14, P.night], [-8, P.dawnDusk], [-3, P.dawn], [2, P.morning], [12, P.after], [25, P.day]];
  function palette(e, morning, cc) {
    const L = morning ? MORN : EVE;
    let a = L[0], b = L[0], t = 0;
    if (e <= L[0][0]) { a = b = L[0]; } else if (e >= L[L.length - 1][0]) { a = b = L[L.length - 1]; }
    else for (let i = 0; i < L.length - 1; i++) if (e >= L[i][0] && e < L[i + 1][0]) { a = L[i]; b = L[i + 1]; t = (e - a[0]) / (b[0] - a[0]); break; }
    const out = {};
    for (const k in a[1]) out[k] = typeof a[1][k] === 'number' ? lerp(a[1][k], b[1][k], t) : mix(a[1][k], b[1][k], t);
    // cielo cubierto: menos saturación y nubes más grises
    const ov = clamp((cc - 40) / 60, 0, 1) * 0.55;
    if (ov > 0) ['skyTop', 'skyHor', 'seaFar', 'seaNear', 'cloud', 'cloudSh', 'mtFar', 'mtNear'].forEach(k => out[k] = desat(out[k], ov));
    return out;
  }

  // ---------- Geometría fija del paisaje ----------
  const FAR = [[0, 636], [200, 636], [262, 632], [300, 626], [360, 620], [410, 612], [440, 601], [462, 598], [490, 606], [540, 616], [600, 620], [660, 612], [700, 605], [740, 600], [780, 602], [820, 594], [860, 588], [900, 590], [950, 580], [1000, 575], [1040, 566], [1080, 560], [1110, 548], [1140, 552], [1170, 538], [1200, 530], [1230, 515], [1255, 508], [1280, 494], [1300, 500], [1325, 482], [1350, 470], [1370, 476], [1392, 458], [1414, 462], [1436, 448], [1452, 452], [1470, 446], [1490, 458], [1512, 470], [1530, 466], [1556, 486], [1590, 500], [1620, 512], [1650, 526], [1690, 545], [1730, 566], [1770, 590], [1810, 612], [1850, 628], [1880, 635], [1920, 636]];
  const NEAR = [[560, 640], [640, 633], [700, 628], [760, 624], [820, 619], [880, 616], [930, 610], [980, 606], [1030, 600], [1070, 596], [1110, 590], [1150, 586], [1180, 590], [1215, 594], [1250, 598], [1290, 594], [1330, 597], [1380, 603], [1440, 609], [1500, 614], [1580, 620], [1660, 628], [1720, 634], [1760, 640]];
  const SHORE = [[-20, 772], [0, 768], [120, 756], [300, 748], [430, 752], [530, 766], [620, 790], [700, 816], [790, 838], [900, 852], [1080, 858], [1280, 853], [1480, 847], [1640, 850], [1800, 855], [1940, 858]];
  function shoreY(x) {
    for (let i = 0; i < SHORE.length - 1; i++) if (x >= SHORE[i][0] && x <= SHORE[i + 1][0]) {
      const t = (x - SHORE[i][0]) / (SHORE[i + 1][0] - SHORE[i][0]); return lerp(SHORE[i][1], SHORE[i + 1][1], smooth(t));
    }
    return SHORE[SHORE.length - 1][1];
  }
  // Camino por donde paseáis (curva de Bézier)
  const PB = [[330, 790], [760, 790], [1140, 908], [2000, 872]];
  const bez = (t, i) => { const u = 1 - t; return u * u * u * PB[0][i] + 3 * u * u * t * PB[1][i] + 3 * u * t * t * PB[2][i] + t * t * t * PB[3][i]; };
  const PATH = []; for (let i = 0; i <= 400; i++) { const t = i / 400; PATH.push([bez(t, 0), bez(t, 1), t]); }
  function pathY(x) {
    if (x <= PATH[0][0]) return PATH[0][1];
    for (let i = 0; i < PATH.length - 1; i++) if (x <= PATH[i + 1][0]) { const t = (x - PATH[i][0]) / (PATH[i + 1][0] - PATH[i][0]); return lerp(PATH[i][1], PATH[i + 1][1], t); }
    return PATH[PATH.length - 1][1];
  }
  const pathX = u => bez(clamp(u, 0, 1), 0);

  // roundRect no existe en WebView antiguos
  if (!CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };

  // ---------- Lienzos ----------
  let cv, ctx, L1, L2, L3, grain, moonCv;
  const mk = () => { const c = document.createElement('canvas'); c.width = W * CFG.quality; c.height = H * CFG.quality; const x = c.getContext('2d'); x.setTransform(CFG.quality, 0, 0, CFG.quality, 0, 0); return c; };
  function makeGrain() {
    const c = document.createElement('canvas'); c.width = c.height = 220;
    const x = c.getContext('2d'), img = x.createImageData(220, 220), r = rng(7);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() < 0.5 ? 0 : 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = r() * 16; }
    x.putImageData(img, 0, 0); return c;
  }
  function addGrain(c, atop) {
    const x = c.getContext('2d'); x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
    if (atop) x.globalCompositeOperation = 'source-atop';
    x.fillStyle = x.createPattern(grain, 'repeat'); x.fillRect(0, 0, c.width, c.height); x.restore();
  }
  function poly(x, pts, fill) { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); x.fillStyle = fill; x.fill(); }
  function smoothTop(x, pts, fill, bottom) {
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; x.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    const l = pts[pts.length - 1]; x.lineTo(l[0], l[1]); x.lineTo(l[0], bottom); x.lineTo(pts[0][0], bottom); x.closePath(); x.fillStyle = fill; x.fill();
  }
  function smoothPoly(x, pts, fill) {
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; x.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    const l = pts[pts.length - 1]; x.lineTo(l[0], l[1]); x.closePath(); x.fillStyle = fill; x.fill();
  }
  const circle = (x, cx, cy, r, f) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = f; x.fill(); };
  const ell = (x, cx, cy, rx, ry, f, rot) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot || 0, 0, Math.PI * 2); x.fillStyle = f; x.fill(); };

  // ---------- Estado ----------
  const S = { weather: { cc: 25, code: 1, temp: null, wind: 10 }, pal: null, e: 0, morning: true, night: 0, sun: null, moon: null, ships: [], nextShip: 0, lastBuild: -1e15, lastBuildReal: 0 };
  const rnd = rng(42);
  const STARS = Array.from({ length: 170 }, () => ({ x: rnd() * W, y: rnd() * 560, r: 0.6 + rnd() * 1.3, p: rnd() * 6.28, s: 0.6 + rnd() * 1.6 }));
  const CLOUDS = Array.from({ length: 13 }, (_, i) => {
    const w = 220 + rnd() * 260, h = w * (0.2 + rnd() * 0.1), n = 4 + Math.floor(rnd() * 4), puffs = [];
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n + (rnd() - 0.5) * 0.08; puffs.push({ t, r: h * (0.38 + 0.62 * Math.sin(Math.PI * clamp(t, 0.05, 0.95))) * (0.75 + rnd() * 0.4) }); }
    return { x: rnd() * (W + 600) - 300, y: 270 + rnd() * 220 - (i % 3 === 0 ? 90 : 0), w, h, puffs, sp: 0.6 + rnd() * 0.8, layer: i % 2 };
  });
  const STREAKS = Array.from({ length: 5 }, () => ({ x: rnd() * W, y: 330 + rnd() * 250, w: 260 + rnd() * 520, h: 7 + rnd() * 8, sp: 0.3 + rnd() * 0.4 }));
  const WAVES = Array.from({ length: 90 }, () => { const y = 650 + Math.pow(rnd(), 1.3) * 230; return { x: rnd() * W, y, len: 10 + (y - 640) * 0.18 + rnd() * 18, p: rnd() * 6.28 }; });
  const LIGHTS = Array.from({ length: 70 }, () => { const x = 260 + rnd() * 1500; return { x, y: 634 + rnd() * 5 - (x > 1100 && x < 1700 ? 4 : 0), r: 0.9 + rnd() * 1.4, p: rnd() * 6.28 }; });
  // matorrales: [x, base, ancho, alto, tono]
  const BUSHES = [[60, 772, 150, 34, 0], [150, 760, 70, 22, 1], [372, 766, 90, 20, 1], [598, 796, 80, 26, 0], [960, 866, 150, 24, 1], [1080, 868, 80, 18, 0], [1250, 866, 120, 20, 0], [1560, 864, 120, 26, 1], [1740, 866, 140, 28, 0], [1880, 868, 90, 22, 1],
    [120, 1082, 420, 96, 0], [-40, 1082, 200, 120, 1], [1820, 1082, 380, 90, 1], [1960, 1082, 160, 130, 0], [620, 1082, 240, 34, 1], [1300, 1082, 260, 38, 0]].sort((a, b) => a[1] - b[1]);
  function bush(x, cx, by, w, h, col, light, seed) {
    const r = rng(seed), n = Math.max(3, Math.round(w / 34));
    x.save(); x.beginPath(); x.rect(cx - w, by - h * 3, w * 2, h * 3); x.clip();
    x.fillStyle = col; x.beginPath();
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, px = cx - w / 2 + t * w, hh = h * (0.55 + 0.45 * Math.sin(Math.PI * t)) * (0.8 + r() * 0.35);
      x.moveTo(px + hh, by); x.ellipse(px, by, w / n * 0.95, hh, 0, 0, Math.PI * 2);
    }
    x.fill();
    x.fillStyle = light;
    for (let i = 0; i < n; i += 2) { const t = (i + 0.5) / n, px = cx - w / 2 + t * w - 6, hh = h * 0.45 * (0.55 + 0.45 * Math.sin(Math.PI * t)); x.beginPath(); x.ellipse(px, by - h * 0.55 * (0.55 + 0.45 * Math.sin(Math.PI * t)), w / n * 0.45, hh * 0.45, -0.2, 0, Math.PI * 2); x.fill(); }
    x.restore();
  }

  // ---------- Construcción de capas fijas ----------
  function buildSky(p) {
    const x = L1.getContext('2d'); x.clearRect(0, 0, W, H);
    const N = 8;
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const y0 = HOR * Math.pow(t0, 0.85), y1 = HOR * Math.pow(t1, 0.85);
      x.fillStyle = mix(p.skyTop, p.skyHor, Math.pow(i / (N - 1), 1.3));
      x.fillRect(0, y0 - 1, W, y1 - y0 + 2);
    }
    // sol
    if (S.sun.vis) {
      const sx = S.sun.x, sy = S.sun.y, low = clamp(1 - S.e / 14, 0, 1);
      if (low > 0) { circle(x, sx, sy, 150, rgba(p.sun, 0.07 * low)); circle(x, sx, sy, 108, rgba(p.sun, 0.11 * low)); }
      x.globalAlpha = 1 - clamp((S.weather.cc - 75) / 25, 0, 1) * 0.7;
      circle(x, sx, sy, 68, p.sun);
      x.globalAlpha = 1;
    }
    // luna
    if (S.moon.vis) {
      const r = 30, m = moonCv.getContext('2d'); m.clearRect(0, 0, 80, 80);
      const ph = S.moon.phase, k = Math.cos(ph * 2 * Math.PI), wax = ph < 0.5, lit = '#F4EBD6';
      circle(m, 40, 40, r, rgba(lit, 0.12));
      m.beginPath(); m.arc(40, 40, r, wax ? -Math.PI / 2 : Math.PI / 2, wax ? Math.PI / 2 : Math.PI * 1.5); m.closePath(); m.fillStyle = lit; m.fill();
      if (k > 0) { m.globalCompositeOperation = 'destination-out'; ell(m, 40, 40, k * r, r, '#000'); m.globalCompositeOperation = 'source-over'; circle(m, 40, 40, r, rgba(lit, 0.1)); }
      else ell(m, 40, 40, -k * r, r, lit);
      const a = clamp(S.night * 1.2 + 0.25, 0, 1);
      if (S.night > 0.3) circle(x, S.moon.x, S.moon.y, 70, rgba(lit, 0.05 * S.night));
      x.globalAlpha = a; x.drawImage(moonCv, S.moon.x - 40, S.moon.y - 40); x.globalAlpha = 1;
    }
    addGrain(L1, false);
  }

  function buildSea(p) {
    const x = L2.getContext('2d'); x.clearRect(0, 0, W, H);
    // África: capa lejana y cercana
    poly(x, FAR.concat([[1920, HOR], [0, HOR]]), p.mtFar);
    // cara iluminada de Jebel Musa según el lado del sol
    const lit = rgba(mix(p.mtFar, p.skyHor, 0.5), 0.35), sunLeft = S.sun.x < 1436;
    if (sunLeft) poly(x, [[1436, 448], [1414, 462], [1392, 458], [1370, 476], [1350, 470], [1325, 482], [1300, 500], [1280, 494], [1255, 508], [1230, 515], [1200, 530], [1300, 600], [1400, 560]], lit);
    else poly(x, [[1470, 446], [1490, 458], [1512, 470], [1530, 466], [1556, 486], [1590, 500], [1620, 512], [1650, 526], [1560, 590], [1480, 560]], lit);
    poly(x, [[440, 601], [462, 598], [490, 606], [540, 616], [470, 626]], rgba(mix(p.mtFar, p.skyHor, 0.5), 0.25));
    smoothTop(x, NEAR, p.mtNear, HOR);
    // neblina en la base de las montañas
    x.fillStyle = rgba(p.skyHor, 0.22); x.fillRect(0, 628, W, 12);
    // mar por franjas
    const N = 6, y0 = HOR, y1 = 900;
    for (let i = 0; i < N; i++) {
      const a = y0 + (y1 - y0) * Math.pow(i / N, 1.2), b = y0 + (y1 - y0) * Math.pow((i + 1) / N, 1.2);
      x.fillStyle = mix(p.seaFar, p.seaNear, i / (N - 1)); x.fillRect(0, a, W, b - a + 1);
    }
    x.fillStyle = rgba(p.waves, 0.35); x.fillRect(0, HOR, W, 2);
    addGrain(L2, true);
  }

  function T(c) { return S.pal.ambK > 0 ? mix(c, S.pal.amb, S.pal.ambK) : c; }

  function buildLand(p) {
    const x = L3.getContext('2d'); x.clearRect(0, 0, W, H);
    // tierra
    const top = SHORE.map(q => q.slice());
    smoothTop(x, top, p.ground, H);
    // cara del acantilado a la izquierda
    const face = []; for (let X = -20; X <= 760; X += 20) face.push([X, shoreY(X)]);
    for (let X = 760; X >= -20; X -= 20) face.push([X, shoreY(X) + clamp(46 - Math.max(0, X - 420) * 0.12, 6, 46)]);
    poly(x, face, p.cliff);
    x.strokeStyle = p.cliffSh; x.lineCap = 'round';
    for (let X = 20; X < 700; X += 34) { // estratos de la roca
      const y = shoreY(X) + 10, d = clamp(40 - Math.max(0, X - 420) * 0.12, 6, 40);
      x.lineWidth = 3; x.beginPath(); x.moveTo(X, y); x.lineTo(X + 10, y + d * 0.7); x.stroke();
    }
    // franjas de tierra hacia el primer plano
    smoothTop(x, [[-20, 930], [400, 918], [900, 962], [1400, 952], [1940, 930]], mix(p.ground, p.cliff, 0.4), H);
    smoothTop(x, [[-20, 1012], [500, 1000], [1000, 1024], [1500, 1008], [1940, 1000]], mix(p.cliff, p.cliffSh, 0.6), H);
    // rocas en la orilla
    [[612, 792, 26], [660, 806, 18], [706, 822, 22], [1460, 852, 16], [1500, 856, 12], [1880, 860, 20]].forEach(([rx, ry, s]) => {
      poly(x, [[rx - s, ry + 6], [rx - s * 0.6, ry - s * 0.5], [rx + s * 0.2, ry - s * 0.7], [rx + s, ry + 6]], p.rock);
      poly(x, [[rx + s * 0.1, ry + 6], [rx + s * 0.2, ry - s * 0.7], [rx + s, ry + 6]], mix(p.rock, '#000000', 0.2));
    });
    // camino
    x.beginPath();
    for (let i = 0; i <= 100; i++) { const t = i / 100, w = 9 + t * 26; const X = bez(t, 0), Y = bez(t, 1); i ? x.lineTo(X, Y - w) : x.moveTo(X, Y - w); }
    for (let i = 100; i >= 0; i--) { const t = i / 100, w = 9 + t * 26; x.lineTo(bez(t, 0), bez(t, 1) + w * 0.55); }
    x.closePath(); x.fillStyle = p.path; x.fill();
    // matorrales
    const bushC = desat(p.bush, 0.2), bd = mix(bushC, '#000000', 0.22);
    BUSHES.forEach(([bx, by, bw, bh, tone], i) => { const c = tone ? bushC : bd; bush(x, bx, by, bw, bh, c, mix(c, p.skyHor, 0.09), 20 + i); });
    // briznas
    x.strokeStyle = mix(p.bush, p.ground, 0.3); x.lineWidth = 2; x.lineCap = 'round';
    const gr = rng(5);
    for (let i = 0; i < 60; i++) { const gx = gr() * W, gy = 940 + gr() * 130, h = 8 + gr() * 14; x.beginPath(); x.moveTo(gx, gy); x.quadraticCurveTo(gx + 2, gy - h * 0.6, gx + 5 * (gr() - 0.3), gy - h); x.stroke(); }
    drawLighthouse(x, p);
    addGrain(L3, true);
  }

  function drawLighthouse(x, p) {
    const white = T('#F1EBDF'), shade = T('#D3C8B8'), roof = T('#B4583E'), dark = T('#3A3A40');
    const sunRight = S.sun.x > 232;
    // casa del farero
    poly(x, [[146, 752], [306, 752], [306, 712], [146, 712]], white);
    poly(x, sunRight ? [[146, 752], [176, 752], [176, 712], [146, 712]] : [[276, 752], [306, 752], [306, 712], [276, 712]], shade);
    poly(x, [[138, 713], [314, 713], [300, 699], [152, 699]], roof);
    [[170, 724], [200, 724], [262, 724]].forEach(([wx, wy]) => poly(x, [[wx, wy], [wx + 12, wy], [wx + 12, wy + 16], [wx, wy + 16]], dark));
    // torre
    poly(x, [[212, 713], [252, 713], [248, 610], [216, 610]], white);
    poly(x, sunRight ? [[212, 713], [222, 713], [220, 610], [216, 610]] : [[242, 713], [252, 713], [248, 610], [244, 610]], shade);
    poly(x, [[205, 610], [259, 610], [259, 603], [205, 603]], dark);
    poly(x, [[220, 603], [244, 603], [244, 582], [220, 582]], S.night > 0.35 ? '#FFE3A0' : T('#A9BAC2'));
    x.beginPath(); x.arc(232, 582, 14, Math.PI, 0); x.closePath(); x.fillStyle = dark; x.fill();
    poly(x, [[231, 568], [233, 568], [233, 560], [231, 560]], dark);
  }

  // ---------- Elementos animados ----------
  function drawStars(x, t) {
    if (S.night <= 0.02) return;
    for (const s of STARS) {
      const a = S.night * (0.45 + 0.55 * Math.sin(t * s.s + s.p) ** 2);
      circle(x, s.x, s.y, s.r, `rgba(250,244,230,${a.toFixed(3)})`);
    }
  }
  function cloudShape(x, cx, base, c, dy) {
    x.beginPath();
    c.puffs.forEach(pf => { const px = cx + pf.t * c.w, py = base + dy - pf.r * 0.42; x.moveTo(px + pf.r, py); x.arc(px, py, pf.r, 0, Math.PI * 2); });
    x.rect(cx + c.puffs[0].t * c.w, base + dy - c.h * 0.32, (c.puffs[c.puffs.length - 1].t - c.puffs[0].t) * c.w, c.h * 0.32);
  }
  function drawClouds(x, t, p) {
    const cc = S.weather.cc, n = Math.round(3 + cc * 0.1);
    const wind = 0.6 + (S.weather.wind || 10) / 20;
    const light = mix(p.cloud, '#FFFFFF', 0.22), lowSun = S.e < 14 ? 1 : 0.45;
    // velos alargados, como en las láminas de referencia
    STREAKS.forEach(s => {
      const span = W + s.w + 200, sx = ((s.x + t * s.sp * 3 * wind) % span + span) % span - s.w - 100;
      x.beginPath(); x.roundRect(sx, s.y, s.w, s.h, s.h / 2); x.fillStyle = rgba(p.cloud, 0.42 * lowSun); x.fill();
    });
    for (let i = 0; i < Math.min(n, CLOUDS.length); i++) {
      const c = CLOUDS[i], span = W + c.w + 400;
      const cx = ((c.x + t * c.sp * 4 * wind) % span + span) % span - c.w - 200;
      const base = c.y, col = c.layer ? p.cloud : mix(p.cloud, p.cloudSh, 0.25);
      const sunSide = S.sun.x < cx + c.w / 2 ? -1 : 1;
      x.save(); x.beginPath(); x.rect(cx - 100, base - c.h * 3, c.w + 200, c.h * 3 + 8); x.clip();
      cloudShape(x, cx, base, c, 8); x.fillStyle = p.cloudSh; x.fill();
      x.restore();
      // la nube en tono claro y, encima, el cuerpo desplazado: queda un borde iluminado hacia el sol
      x.save(); x.beginPath(); x.rect(cx - 100, base - c.h * 3, c.w + 200, c.h * 3); x.clip();
      cloudShape(x, cx, base, c, 0); x.fillStyle = light; x.fill();
      x.clip();
      x.translate(-sunSide * 8, 8); cloudShape(x, cx, base, c, 0); x.fillStyle = col; x.fill();
      x.restore();
    }
  }
  function drawCoastLights(x, t) {
    if (S.night < 0.35) return;
    const a0 = (S.night - 0.35) / 0.65;
    for (const l of LIGHTS) circle(x, l.x, l.y, l.r, `rgba(255,214,150,${(a0 * (0.55 + 0.45 * Math.sin(t * 1.3 + l.p))).toFixed(3)})`);
  }
  function drawGlint(x, t, p) {
    let gx, col, a;
    if (S.sun.vis && S.e < 40) { gx = S.sun.x; col = mix(p.sun, p.waves, 0.3); a = 0.6; }
    else if (S.moon.vis && S.night > 0.4) { gx = S.moon.x; col = '#EDE6D2'; a = 0.32 * S.night; }
    else return;
    for (let y = 648, i = 0; y < 860; y += 8, i++) {
      const w = (16 + (y - 646) * 0.42) * (0.45 + 0.55 * Math.abs(Math.sin(t * 1.4 + i * 1.7)));
      const off = Math.sin(t * 0.8 + i) * 6;
      x.fillStyle = rgba(col, a * (1 - (y - 648) / 260));
      x.fillRect(gx - w / 2 + off, y, w, 2 + (y - 648) / 90);
    }
  }
  function drawWaves(x, t, p) {
    const wind = 0.5 + (S.weather.wind || 10) / 25;
    x.lineCap = 'round';
    for (const w of WAVES) {
      const k = (w.y - 640) / 240, sp = (3 + k * 10) * wind;
      const wx = ((w.x - t * sp) % (W + 80) + W + 80) % (W + 80) - 40;
      if (w.y > shoreY(wx) - 4) continue;
      const a = 0.18 + 0.32 * k * (0.5 + 0.5 * Math.sin(t * 0.9 + w.p));
      x.strokeStyle = rgba(p.waves, a); x.lineWidth = 1 + k * 2;
      x.beginPath(); x.moveTo(wx, w.y); x.quadraticCurveTo(wx + w.len / 2, w.y - 2 - k * 2, wx + w.len, w.y); x.stroke();
    }
  }
  function drawFoam(x, t, p) {
    x.strokeStyle = rgba(p.waves, 0.55); x.lineWidth = 3; x.lineCap = 'round';
    x.beginPath();
    for (let X = 540; X <= 1920; X += 12) { const y = shoreY(X) - 3 - (Math.sin(t * 0.7 + X * 0.015) + 1) * 2.5; X === 540 ? x.moveTo(X, y) : x.lineTo(X, y); }
    x.stroke();
    x.strokeStyle = rgba(p.waves, 0.25); x.lineWidth = 2; x.beginPath();
    for (let X = 540; X <= 1920; X += 12) { const y = shoreY(X) - 10 - (Math.sin(t * 0.7 + X * 0.015 + 1.4) + 1) * 3; X === 540 ? x.moveTo(X, y) : x.lineTo(X, y); }
    x.stroke();
  }

  // Barcos cruzando el Estrecho
  function spawnShip(ms) {
    const r = Math.random(), dir = Math.random() < 0.5 ? 1 : -1;
    const type = r < 0.5 ? 'cargo' : (r < 0.8 ? 'ferry' : 'sail');
    const sp = type === 'cargo' ? 7 + Math.random() * 3 : (type === 'ferry' ? 16 : 5);
    S.ships.push({ type, dir, sp, x: dir > 0 ? -160 : W + 160, y: 648 + Math.random() * 16, seed: Math.random() * 1000, born: ms });
  }
  function updateShips(ms, dtSim) {
    if (!S.nextShip) S.nextShip = ms + 20000;
    if (ms > S.nextShip && S.ships.length < 2) { spawnShip(ms); S.nextShip = ms + (240 + Math.random() * 360) * 1000; }
    S.ships.forEach(s => s.x += s.dir * s.sp * dtSim / 1000);
    S.ships = S.ships.filter(s => s.x > -220 && s.x < W + 220);
  }
  function drawShips(x, t, p) {
    const night = S.night > 0.45;
    S.ships.forEach(s => {
      x.save(); x.translate(s.x, s.y); x.scale(s.dir * (0.7 + (s.y - 648) / 60), 0.7 + (s.y - 648) / 60);
      const hull = T(mix('#3E4A5A', p.mtNear, 0.35));
      if (s.type === 'cargo') {
        poly(x, [[-60, -2], [62, -2], [56, 8], [-54, 8]], hull);
        const cols = ['#B8654A', '#6E8494', '#D4A25A', '#7E8C6A', '#9C6A8A'], rr = rng(s.seed | 0);
        for (let cx = -38; cx < 48; cx += 9) { const h = 4 + Math.floor(rr() * 3) * 3; poly(x, [[cx, -2], [cx + 8, -2], [cx + 8, -2 - h], [cx, -2 - h]], T(mix(cols[Math.floor(rr() * 5)], p.mtNear, 0.35))); }
        poly(x, [[-56, -2], [-44, -2], [-44, -16], [-56, -16]], T(mix('#EDE6DA', p.mtNear, 0.25)));
        if (night) { circle(x, 58, -6, 1.6, '#FFF2C8'); circle(x, -50, -20, 1.6, '#FFF2C8'); circle(x, -48, -9, 1.2, '#FFD27A'); }
      } else if (s.type === 'ferry') {
        poly(x, [[-36, -2], [40, -2], [34, 7], [-32, 7]], T(mix('#EDE6DA', p.mtNear, 0.2)));
        poly(x, [[-36, 1], [38, 1], [37, 3], [-35, 3]], T(mix('#3D6A9A', p.mtNear, 0.3)));
        poly(x, [[-26, -2], [22, -2], [16, -12], [-22, -12]], T(mix('#F2EEE6', p.mtNear, 0.2)));
        if (night) for (let w = -20; w < 16; w += 5) circle(x, w, -6, 1.1, '#FFE2A0');
      } else {
        poly(x, [[-12, 0], [14, 0], [10, 5], [-9, 5]], T(mix('#F2EEE6', p.mtNear, 0.25)));
        poly(x, [[0, -1], [0, -28], [12, -2]], T(mix('#F6F0E4', p.mtNear, 0.2)));
        poly(x, [[-1, -1], [-1, -22], [-10, -2]], T(mix('#E6DCCB', p.mtNear, 0.3)));
        if (night) circle(x, 0, -29, 1.3, '#FFF2C8');
      }
      x.restore();
    });
  }

  function drawBeam(x, t) {
    if (S.night < 0.3) return;
    const a0 = (S.night - 0.3) / 0.7, lx = 232, ly = 593;
    const ang = t * 0.9;
    for (const off of [0, Math.PI]) {
      const c = Math.cos(ang + off), sn = Math.sin(ang + off);
      const L = 820 * Math.abs(c) + 60, ex = lx + Math.sign(c) * L, spread = 20 + 30 * (1 - Math.abs(c));
      const facing = sn > 0 ? sn : 0;
      x.beginPath(); x.moveTo(lx, ly - 3); x.lineTo(ex, ly - spread * 0.7); x.lineTo(ex, ly + spread * 0.5); x.lineTo(lx, ly + 3); x.closePath();
      x.fillStyle = `rgba(255,230,170,${(a0 * (0.06 + 0.07 * (1 - Math.abs(c)))).toFixed(3)})`; x.fill();
      if (facing > 0.85) circle(x, lx, ly, 18 + 26 * (facing - 0.85) / 0.15, `rgba(255,236,180,${(a0 * 0.35 * (facing - 0.85) / 0.15).toFixed(3)})`);
    }
    circle(x, lx, ly, 9, `rgba(255,232,170,${(0.6 * a0).toFixed(3)})`);
  }

  function drawPalm(x, t, p) {
    const bx = 1650, by = 856, sway = Math.sin(t * 0.5) * 0.02 + Math.sin(t * 1.3) * 0.006 * (1 + (S.weather.wind || 10) / 20);
    const tx = 1676 + sway * 300, ty = 516;
    const trunk = T(mix('#5A4232', p.cliffSh, 0.35)), leaf = T(mix(p.bush, '#2E3A24', 0.25)), leaf2 = T(mix(p.bush, '#000000', 0.32));
    x.strokeStyle = trunk; x.lineCap = 'round';
    x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(1648, 690, tx, ty); x.lineWidth = 15; x.stroke();
    x.strokeStyle = mix(trunk, '#000000', 0.2); x.lineWidth = 2;
    for (let i = 1; i < 14; i++) { const u = i / 14, px = (1 - u) * (1 - u) * bx + 2 * (1 - u) * u * 1648 + u * u * tx, py = (1 - u) * (1 - u) * by + 2 * (1 - u) * u * 690 + u * u * ty; x.beginPath(); x.moveTo(px - 7, py); x.lineTo(px + 7, py - 2); x.stroke(); }
    const fronds = [-2.9, -2.45, -2.0, -1.5, -1.05, -0.6, -0.2, 0.25];
    fronds.forEach((a, i) => {
      const L = 110 + (i % 3) * 18, aa = a + Math.sin(t * 0.9 + i) * 0.03 + sway * 2;
      const ex = tx + Math.cos(aa) * L, ey = ty + Math.sin(aa) * L * 0.55 + L * 0.42;
      const mx = tx + Math.cos(aa) * L * 0.5, my = ty + Math.sin(aa) * L * 0.5 - 20;
      x.beginPath(); x.moveTo(tx, ty); x.quadraticCurveTo(mx, my - 10, ex, ey); x.quadraticCurveTo(mx, my + 14, tx, ty + 6); x.closePath();
      x.fillStyle = i % 2 ? leaf : leaf2; x.fill();
    });
    circle(x, tx, ty + 2, 10, leaf2);
  }

  // ---------- Personajes ----------
  function outfit(month) {
    if ([10, 11, 0, 1, 2].includes(month)) return 'winter';   // nov–mar
    if ([5, 6, 7, 8].includes(month)) return 'summer';         // jun–sep
    return 'mid';                                              // abr, may, oct
  }
  function limb(x, a, b, c, d, w, col) { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); }

  function drawAle(x, ph, o, walking) {
    const skin = T(o === 'summer' ? '#C2865F' : '#C98E6E'), hair = T('#2B1E18');
    const top = T({ winter: '#2F4A44', mid: '#22304A', summer: '#F4F0E6' }[o]);
    const pants = T({ winter: '#2C3446', mid: '#D8CBB0', summer: '#DCCFB4' }[o]);
    const pantsB = mix(pants, '#000000', 0.15), shoe = T(o === 'winter' ? '#3A2E28' : '#F2EDE3');
    const sw = walking ? Math.sin(ph) * 0.36 : 0.04;
    const f1 = [Math.sin(sw) * 60, -60 + Math.cos(sw) * 60], f2 = [Math.sin(-sw) * 60, -60 + Math.cos(sw) * 60];
    limb(x, 0, -60, f2[0], f2[1] - 2, 12, pantsB); ell(x, f2[0] + 3, f2[1] - 1, 7, 3.4, mix(shoe, '#000000', 0.12));
    limb(x, 0, -60, f1[0], f1[1] - 2, 12, pants); ell(x, f1[0] + 3, f1[1] - 1, 7, 3.4, shoe);
    // brazo de atrás (de la mano con Ana)
    const sl = o === 'winter' ? 1 : 0.4;
    limb(x, -9, -100, -26, -64, 8, skin);
    limb(x, -9, -100, -9 - 17 * sl, -100 + 36 * sl, 11, mix(top, '#000000', 0.12));
    // torso
    x.beginPath(); x.moveTo(-15, o === 'winter' ? -52 : -58); x.lineTo(-16, -100); x.quadraticCurveTo(0, -112, 16, -100); x.lineTo(15, o === 'winter' ? -52 : -58); x.closePath(); x.fillStyle = top; x.fill();
    if (o === 'winter') { poly(x, [[-4, -108], [6, -108], [10, -98], [2, -102], [-6, -98]], mix(top, '#000000', 0.2)); limb(x, 1, -100, 1, -54, 1.5, mix(top, '#000000', 0.25)); }
    else if (o === 'mid') poly(x, [[-2, -107], [8, -107], [5, -99]], mix(top, '#FFFFFF', 0.15));
    else limb(x, 3, -104, 3, -62, 1, mix(top, '#9C9488', 0.4));
    // brazo delantero (correas)
    const hx = 22 + (walking ? Math.sin(ph) * 2 : 0);
    limb(x, 9, -100, hx, -64, 8, skin);
    limb(x, 9, -100, 9 + (hx - 9) * sl, -100 + 36 * sl, 11, top);
    // cabeza
    poly(x, [[-4, -112], [6, -112], [6, -104], [-4, -104]], skin);
    circle(x, 2, -124, 12.5, skin);
    // pelo rizado con laterales más cortos
    x.beginPath(); x.arc(1, -126, 12.8, Math.PI * 1.02, Math.PI * 1.98); x.closePath(); x.fillStyle = hair; x.fill();
    [[-8, -135], [-3, -138.5], [3, -139], [8, -136.5], [12, -132], [-11, -130]].forEach(([cx, cy]) => circle(x, cx, cy, 4, hair));
    poly(x, [[-11, -126], [-6, -126], [-7, -120], [-11, -121]], mix(hair, skin, 0.45));
    // barba poblada
    x.beginPath(); x.moveTo(-5, -125); x.quadraticCurveTo(-7, -113, 0, -108); x.quadraticCurveTo(9, -104, 14, -112); x.quadraticCurveTo(16, -117, 14, -121); x.quadraticCurveTo(9, -117, 3, -120); x.closePath(); x.fillStyle = hair; x.fill();
    circle(x, -3, -124, 2.6, mix(skin, '#000000', 0.12));
    return { hand: [hx, -64], hold: [-26, -64] };
  }

  function drawAna(x, ph, o, walking, hold) {
    const skin = T('#D49F80'), hair = T('#3A2620');
    const shirt = T({ winter: '#B98A5E', mid: '#F2EDE3', summer: '#F4EEE4' }[o]);
    const pants = T('#2A2522'), shoe = T(o === 'summer' ? '#C9A27E' : '#2A2522');
    const sw = walking ? Math.sin(ph + 0.25) * 0.34 : 0.03;
    const f1 = [Math.sin(sw) * 56, -56 + Math.cos(sw) * 56], f2 = [Math.sin(-sw) * 56, -56 + Math.cos(sw) * 56];
    const legC = o === 'summer' ? skin : pants;
    limb(x, 0, -56, f2[0], f2[1] - 2, 8.5, mix(legC, '#000000', 0.12)); ell(x, f2[0] + 2, f2[1] - 1, 5.5, 2.8, shoe);
    limb(x, 0, -56, f1[0], f1[1] - 2, 8.5, legC); ell(x, f1[0] + 2, f1[1] - 1, 5.5, 2.8, shoe);
    // melena por detrás
    x.beginPath(); x.moveTo(-9, -120); x.quadraticCurveTo(-16, -100, -13, -80); x.lineTo(-4, -82); x.quadraticCurveTo(-2, -100, 2, -106); x.closePath(); x.fillStyle = hair; x.fill();
    // cuerpo
    if (o === 'summer') { x.beginPath(); x.moveTo(-12, -96); x.quadraticCurveTo(0, -104, 13, -96); x.lineTo(20, -22); x.lineTo(-18, -22); x.closePath(); x.fillStyle = shirt; x.fill(); }
    else {
      const bot = o === 'winter' ? -34 : -52;
      x.beginPath(); x.moveTo(-13, -96); x.quadraticCurveTo(0, -105, 14, -96); x.lineTo(17, bot); x.lineTo(-16, bot); x.closePath(); x.fillStyle = shirt; x.fill();
      if (o === 'winter') { poly(x, [[-6, -104], [8, -104], [9, -96], [-7, -96]], T('#8E3B3B')); limb(x, 1, -96, 1, -36, 1.2, mix(shirt, '#000000', 0.25)); }
      else limb(x, 2, -100, 3, -54, 1, mix(shirt, '#9C9488', 0.4));
    }
    // brazo hacia Ale
    const sl = o === 'mid' ? 0.6 : (o === 'winter' ? 1 : 0.25);
    limb(x, 8, -96, hold[0], hold[1], 7, skin);
    limb(x, 8, -96, 8 + (hold[0] - 8) * sl, -96 + (hold[1] + 96) * sl, o === 'summer' ? 7 : 10, mix(shirt, '#000000', 0.05));
    // cabeza y pelo con raya al medio
    poly(x, [[-3, -106], [5, -106], [5, -98], [-3, -98]], skin);
    circle(x, 2, -116, 11, skin);
    x.beginPath(); x.arc(1.5, -117.5, 11.6, Math.PI * 1.0, Math.PI * 1.92); x.quadraticCurveTo(4, -122, -3, -117); x.lineTo(-10, -112); x.closePath(); x.fillStyle = hair; x.fill();
    circle(x, -2, -114, 1.4, T('#D9B45A'));
    circle(x, hold[0], hold[1], 3.6, skin);
  }

  // Chow chow: origen en los pies, mirando a la derecha
  function drawChow(x, ph, col, opt) {
    const g = opt.growth == null ? 1 : opt.growth;              // 0 cachorro … 1 adulto
    const headK = 1.3 - 0.3 * g, legK = 0.62 + 0.38 * g;
    const bounce = opt.walking ? Math.abs(Math.sin(ph)) * (2 + (1 - g) * 4) : 0;
    x.save(); x.translate(0, -bounce);
    if (opt.lying) {
      ell(x, 0, -16, 34, 14, col.body);
      circle(x, -26, -28, 10, col.light);
      ell(x, 38, -5, 9, 4.5, col.legs); ell(x, 28, -4, 9, 4.5, col.legs);
      circle(x, 22, -26, 19, col.body);
      x.save(); x.translate(30, -30); x.scale(headK, headK);
      circle(x, 6, -4, 14, col.head);
      poly(x, [[-2, -14], [1, -24], [6, -15]], col.ear); poly(x, [[8, -16], [13, -25], [16, -13]], col.ear);
      ell(x, 18, -1, 8, 6, col.muzzle); ell(x, 25, -3, 3, 2.4, col.nose);
      limb(x, 10, -7, 13, -7, 1.6, col.nose);
      x.restore();
      x.restore(); return [24, -24];
    }
    const sw = opt.walking ? Math.sin(ph * 1.25) * 0.42 : 0;
    const LL = 24 * legK, ly = -26;
    [[-22, -sw, col.legsB], [14, sw, col.legsB], [-14, sw, col.legs], [22, -sw, col.legs]].forEach(([lx, a, c]) => limb(x, lx, ly, lx + Math.sin(a) * LL, ly + Math.cos(a) * LL - 3, 9, c));
    const by = -24 - LL * 0.45;
    ell(x, 0, by, 32, 17 * (1 + (1 - g) * 0.15), col.body);
    ell(x, 2, by + 8, 26, 7, col.shade);
    // cola enroscada
    const wag = opt.walking ? Math.sin(ph * 2.2) * 2 : 0;
    circle(x, -27, by - 18 + wag, 12 * (0.7 + 0.3 * g), col.light);
    circle(x, -24, by - 18 + wag, 5 * (0.7 + 0.3 * g), col.body);
    // melena de león
    const mx = 22, my = by - 10;
    for (let a = -1.9; a <= 1.9; a += 0.38) circle(x, mx + Math.cos(a) * 20, my + Math.sin(a) * 20, 6, col.body);
    circle(x, mx, my, 21, col.body);
    // collar
    poly(x, [[14, my + 4], [30, my - 2], [31, my + 2], [15, my + 8]], col.collar);
    circle(x, 25, my + 6, 2.3, col.tag);
    // cabeza
    x.save(); x.translate(32, my - 10); x.scale(headK, headK);
    circle(x, 2, -4, 14.5, col.head);
    poly(x, [[-7, -14], [-4, -25], [2, -16]], col.ear); poly(x, [[4, -17], [9, -26], [12, -13]], col.ear);
    ell(x, 14, 1, 9, 7, col.muzzle);
    ell(x, 22, -1, 3.2, 2.6, col.nose);
    limb(x, 4, -7, 8, -7.5, 1.6, col.nose);
    x.restore();
    x.restore();
    return [22 + 4, my + 4 - bounce];
  }
  const LEO = { body: '#EBD3A8', light: '#F3E4C4', legs: '#DCC08F', legsB: '#CDB07E', shade: '#D8BC8C', head: '#EFDAB2', ear: '#D9B98A', muzzle: '#F5E8CC', nose: '#5E4A42', collar: '#B84A36', tag: '#E58A3A' };
  const JUANI = { body: '#B8703E', light: '#C88A55', legs: '#9C5A30', legsB: '#8A4E28', shade: '#A0602F', head: '#BE7845', ear: '#8A4A26', muzzle: '#6E4028', nose: '#2A1C18', collar: '#D4537E', tag: '#E87BA4' };
  function tinted(c) { const o = {}; for (const k in c) o[k] = T(c[k]); return o; }

  function drawFamily(x, ms, t) {
    const st = sunTimes(ms), m20 = 20 * 6e4;
    const a = st.rise + m20, b = st.set - m20, back = st.set + 70 * 6e4;
    let u, dir = 1, walking = true;
    if (ms >= a && ms <= b) u = (ms - a) / (b - a);
    else if (ms > b && ms <= back) { u = 1 - (ms - b) / (back - b); dir = -1; }
    else { u = 0.12; walking = false; }
    const ax = pathX(lerp(0.12, 0.8, u));
    const o = outfit(new Date(ms).getMonth());
    const g = clamp((ms - new Date(CFG.juanitaBirth).getTime()) / (DAYMS * 300), 0, 1);
    const ph = t * 2 * Math.PI * 1.35;
    const scaleAt = X => 0.84 + (pathY(X) - 790) / 115 * 0.22;
    const shadowA = S.e > 0 ? 0.16 : 0.08, shDx = S.sun.vis ? (S.sun.x > ax ? -10 : 10) : 0;
    const at = off => { const X = ax + off * dir; return [X, pathY(X), scaleAt(X)]; };
    const mem = { ana: at(-44), ale: at(0), leo: at(walking ? 80 : 70), jua: at(walking ? 128 + 38 * g : 128 + 30 * g) };
    const shadow = ([X, Y, s], w) => ell(x, X + shDx * s, Y + 1, w * s, 4 * s, `rgba(20,14,10,${shadowA})`);
    shadow(mem.ana, 18); shadow(mem.ale, 20); shadow(mem.leo, 36); shadow(mem.jua, 36 * (0.45 + 0.4 * g));
    const place = ([X, Y, s], k) => { x.save(); x.translate(X, Y); x.scale(dir * s * (k || 1), s * (k || 1)); };
    const toWorld = ([X, Y, s], p, k) => [X + dir * p[0] * s * (k || 1), Y + p[1] * s * (k || 1)];
    const o2 = o;
    // Ana detrás
    const aleS = mem.ale[2], anaS = mem.ana[2];
    const holdWorld = [mem.ale[0] + dir * -26 * aleS, mem.ale[1] - 64 * aleS];
    const holdAna = [(holdWorld[0] - mem.ana[0]) * dir / anaS, (holdWorld[1] - mem.ana[1]) / anaS];
    place(mem.ana); drawAna(x, ph, o2, walking, holdAna); x.restore();
    place(mem.ale); const r = drawAle(x, ph, o2, walking); x.restore();
    const hand = toWorld(mem.ale, r.hand);
    // perros
    const jk = 0.45 + 0.37 * g;
    place(mem.leo); const cL = drawChow(x, ph + 0.6, tinted(LEO), { walking, lying: !walking }); x.restore();
    place(mem.jua, jk); const cJ = drawChow(x, ph * (1.25 - 0.2 * g), tinted(JUANI), { walking, lying: !walking, growth: g }); x.restore();
    const leash = (p, sag) => { x.strokeStyle = T('#2E2420'); x.lineWidth = 1.4; x.beginPath(); x.moveTo(hand[0], hand[1]); x.quadraticCurveTo((hand[0] + p[0]) / 2, Math.max(hand[1], p[1]) + sag, p[0], p[1]); x.stroke(); };
    leash(toWorld(mem.leo, cL), 12); leash(toWorld(mem.jua, cJ, jk), 18);
  }

  function drawRain(x, t) {
    const c = S.weather.code;
    if (!((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95)) return;
    const heavy = c >= 63 || c >= 81;
    x.strokeStyle = 'rgba(220,226,236,0.22)'; x.lineWidth = 1.2;
    const r = rng(3), n = heavy ? 220 : 110;
    x.beginPath();
    for (let i = 0; i < n; i++) { const X = (r() * W + t * 60) % W, Y = (r() * H + t * 900 * (0.7 + r() * 0.5)) % H; x.moveTo(X, Y); x.lineTo(X - 6, Y + 22); }
    x.stroke();
    if (c === 96 || c === 99) { // granizo: bolitas que rebotan
      const h = rng(9);
      for (let i = 0; i < 70; i++) { const X = (h() * W + t * 20) % W, Y = (h() * H + t * 520 * (0.8 + h() * 0.4)) % H; circle(x, X, Y, 2 + h() * 1.5, 'rgba(240,244,248,0.55)'); }
    }
  }

  // ---------- Bucle ----------
  function update(ms) {
    const sp = sunPos(ms), st = sunTimes(ms);
    S.e = sp.alt;
    S.morning = ms < (st.rise + st.set) / 2;
    S.night = clamp((-S.e - 3) / 9, 0, 1);
    // sol: x por progreso del día, y por altura real
    const u = (ms - st.rise) / (st.set - st.rise);
    S.sun = { vis: sp.alt > -3.5 && u > -0.06 && u < 1.06, x: lerp(150, 1790, u), y: HOR - sp.alt * 7.2 };
    const mp = moonPos(ms), ph = moonPhase(ms);
    S.moon = { vis: mp.alt > 1, x: 960 + (mp.az + 15) * 8.5, y: clamp(HOR - mp.alt * 7.2, 70, HOR), phase: ph.phase, fraction: ph.fraction };
    S.moon.vis = S.moon.vis && S.moon.x > 40 && S.moon.x < W - 40 && (S.night > 0.1 || ph.fraction > 0.3);
    S.pal = palette(S.e, S.morning, S.weather.cc);
  }
  function rebuild() { buildSky(S.pal); buildSea(S.pal); buildLand(S.pal); }

  let lastFrame = 0, lastSim = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (document.hidden || ts - lastFrame < 32) return;
    lastFrame = ts;
    const ms = now(), t = ms / 1000;
    const dtSim = lastSim ? ms - lastSim : 0; lastSim = ms;
    update(ms);
    if (Math.abs(ms - S.lastBuild) > 45000 || Date.now() - S.lastBuildReal > 20000) { rebuild(); S.lastBuild = ms; S.lastBuildReal = Date.now(); }
    updateShips(ms, Math.min(dtSim, 60000));
    const x = ctx, p = S.pal;
    x.drawImage(L1, 0, 0, W, H);
    drawStars(x, t);
    drawClouds(x, t, p);
    x.drawImage(L2, 0, 0, W, H);
    drawCoastLights(x, t);
    drawGlint(x, t, p);
    drawWaves(x, t, p);
    drawShips(x, t, p);
    x.drawImage(L3, 0, 0, W, H);
    drawFoam(x, t, p);
    drawBeam(x, t);
    drawFamily(x, ms, t);
    drawPalm(x, t, p);
    drawRain(x, t);
  }

  function start(canvas) {
    cv = canvas; cv.width = W * CFG.quality; cv.height = H * CFG.quality;
    ctx = cv.getContext('2d'); ctx.setTransform(CFG.quality, 0, 0, CFG.quality, 0, 0);
    L1 = mk(); L2 = mk(); L3 = mk(); grain = makeGrain();
    moonCv = document.createElement('canvas'); moonCv.width = moonCv.height = 80;
    if (qs.get('ship')) { S.nextShip = 1; setTimeout(() => S.ships.forEach(sh => sh.x = 900), 300); }
    requestAnimationFrame(frame);
  }

  window.HZScene = {
    start,
    now,
    setWeather(w) { Object.assign(S.weather, w); S.lastBuild = -1e15; },
    state() {
      const p = S.pal || palette(10, false, 20);
      return { night: S.night, e: S.e, ui: S.night > 0.3 ? '#F3EDE8' : '#2B231E', accent: mix(p.sun, p.cliff, 0.35), dock: mix(p.cliffSh, '#000000', 0.25), drawer: mix(mix(p.cliffSh, p.mtNear, 0.5), '#000000', 0.55), sky: p.skyTop, hor: p.skyHor, path: p.path, sun: p.sun };
    },
    sunTimes
  };
})();
