/* Horizonte — Ale, Ana, Leo y Juanita de perfil, caminando, en estilo anime.
   Se dibujan con canvas cada fotograma: líneas de contorno, sombreado en dos tonos y un ciclo de paso articulado.
   Coordenadas locales: pies en y = 0, Ale en x = 0, mirando a la derecha. Altura de Ale ≈ 330. */
(function () {
  'use strict';

  const LINE = '#2A1C22';
  const SKIN = '#EDC2A2', SKIN_S = '#CF997A';
  const OUT = {
    summer: { aTop: '#F3F0EA', aTopS: '#CFC8BC', aLong: false, aPants: '#D9CCB0', aPantsS: '#B5A68A', aShoe: '#F4F1EA',
              nTop: '#F7F3EC', nTopS: '#D3CABC', nLong: false, nDress: true, nPants: null, nShoe: '#C69A74', scarf: null },
    mid:    { aTop: '#26345A', aTopS: '#18213C', aLong: false, aPants: '#D8CAAE', aPantsS: '#B0A184', aShoe: '#F4F1EA',
              nTop: '#F5F0E7', nTopS: '#CEC5B6', nLong: false, nDress: false, nPants: '#2C2725', nPantsS: '#1B1817', nShoe: '#2C2725', scarf: null },
    winter: { aTop: '#2F4C45', aTopS: '#1D322D', aLong: true, aPants: '#2F3649', aPantsS: '#1F2434', aShoe: '#4A3529',
              nTop: '#BC8C60', nTopS: '#92683F', nLong: true, nDress: false, nPants: '#2C2725', nPantsS: '#1B1817', nShoe: '#2C2725', scarf: '#9A3E3E', coat: true }
  };

  // ---------- utilidades ----------
  const P = (x, y) => ({ x, y });
  function seg(c, pts, w, fill) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.strokeStyle = LINE; c.lineWidth = w + 3; c.stroke();
    c.strokeStyle = fill; c.lineWidth = w; c.stroke();
  }
  function shape(c, fill, build, lw) {
    c.beginPath(); build(c); c.closePath();
    c.fillStyle = fill; c.fill();
    c.strokeStyle = LINE; c.lineWidth = lw || 1.8; c.lineJoin = 'round'; c.stroke();
  }
  function blob(c, cx, cy, rx, ry, fill, lw) { shape(c, fill, k => k.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2), lw); }
  // dos huesos: posición de la articulación intermedia para llegar a un objetivo
  function ik(a, t, l1, l2, bendSign) {
    const dx = t.x - a.x, dy = t.y - a.y, d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
    const ang = Math.atan2(dy, dx), cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
    const off = Math.acos(Math.max(-1, Math.min(1, cosA))) * bendSign;
    return P(a.x + Math.cos(ang + off) * l1, a.y + Math.sin(ang + off) * l1);
  }

  // ---------- piernas ----------
  // ph = fase del paso; amp = amplitud (0 = de pie)
  function legPose(hip, ph, amp, T, S) {
    const a = amp * Math.sin(ph);
    const k = amp > 0 ? 0.06 + 1.9 * amp * Math.pow(Math.max(0, Math.cos(ph)), 1.4) : 0.04;
    const knee = P(hip.x + Math.sin(a) * T, hip.y + Math.cos(a) * T);
    const ankle = P(knee.x + Math.sin(a - k) * S, knee.y + Math.cos(a - k) * S);
    return { knee, ankle, footA: (a - k) * 0.35 + (amp > 0 ? Math.max(0, -Math.sin(ph)) * 0.25 * (Math.cos(ph) < 0 ? 1 : 0) : 0) };
  }
  function drawLeg(c, hip, L, w, col, shoe, colS) {
    seg(c, [hip, L.knee, L.ankle], w, col);
    if (colS) { c.strokeStyle = colS; c.lineWidth = w * 0.35; c.beginPath(); c.moveTo(hip.x - w * 0.25, hip.y + 4); c.lineTo(L.knee.x - w * 0.25, L.knee.y); c.stroke(); }
    c.save(); c.translate(L.ankle.x, L.ankle.y); c.rotate(-L.footA);
    shape(c, shoe, k => { k.moveTo(-7, -6); k.lineTo(18, -5); k.quadraticCurveTo(26, -3, 25, 3); k.lineTo(-8, 4); k.quadraticCurveTo(-10, -2, -7, -6); });
    c.restore();
  }

  // ---------- persona ----------
  // who: 'ale' | 'ana'; o: conjunto de ropa; ph: fase; amp: amplitud; hold: punto de la mano cogida (coordenadas de esta persona)
  function person(c, who, o, ph, amp, t, hold, wind) {
    const ana = who === 'ana';
    const k = ana ? 0.93 : 1;
    c.save(); c.scale(k, k);
    if (hold) hold = P(hold.x / k, hold.y / k);
    const T = 84, S = 82, hipY = -172;
    const bob = amp > 0 ? -Math.abs(Math.cos(ph)) * 4 + 2 : Math.sin(t * 1.4) * 0.6;
    const hip = P(0, hipY + bob);
    const Lf = legPose(hip, ph + Math.PI, amp, T, S), Ln = legPose(hip, ph, amp, T, S);
    // apoyar en el suelo el pie más bajo
    const drop = -10 - Math.max(Lf.ankle.y, Ln.ankle.y);
    c.translate(0, drop);

    const top = ana ? o.nTop : o.aTop, topS = ana ? o.nTopS : o.aTopS, longS = ana ? o.nLong : o.aLong;
    const pants = ana ? o.nPants : o.aPants, pantsS = ana ? o.nPantsS : o.aPantsS, shoe = ana ? o.nShoe : o.aShoe;
    const legW = ana ? 15 : 19;
    const legCol = (ana && o.nDress) ? SKIN : pants, legColS = (ana && o.nDress) ? SKIN_S : pantsS;

    const shoulder = P(6, hipY - 92 + bob), neckB = P(7, hipY - 100 + bob);
    const UA = ana ? 58 : 62, FA = ana ? 56 : 60;

    // brazo lejano
    let farHand, nearHand;
    if (ana) { nearHand = hold; farHand = P(shoulder.x - 22 * Math.sin(ph) - 8, shoulder.y + 108); }
    else { farHand = hold; nearHand = P(shoulder.x + 52, shoulder.y + 92 + Math.sin(t * 1.8) * 1.5); }
    if (!ana) { // brazo de Ale que coge a Ana (lado lejano)
      const el = ik(shoulder, farHand, UA, FA, 1);
      seg(c, [shoulder, el], 14, longS ? topS : topS);
      seg(c, [el, farHand], 11, longS ? topS : SKIN_S);
      blob(c, farHand.x, farHand.y, 7, 7, SKIN_S, 1.4);
    } else {
      const el = ik(shoulder, farHand, UA, FA, 1);
      seg(c, [shoulder, el], 12, topS);
      seg(c, [el, farHand], 9.5, longS ? topS : SKIN_S);
      blob(c, farHand.x, farHand.y, 6, 6, SKIN_S, 1.4);
    }
    // pierna lejana (más oscura)
    drawLeg(c, hip, Lf, legW, legColS, shoe, null);

    // melena de Ana por detrás del cuerpo
    const headC = P(12, hipY - 132 + bob);
    if (ana) {
      const sw = Math.sin(t * 1.1) * 4 * wind + (amp > 0 ? Math.sin(ph * 2) * 2 : 0);
      shape(c, '#3B261C', kk => {
        kk.moveTo(headC.x - 4, headC.y - 22); kk.quadraticCurveTo(headC.x - 34, headC.y - 8, headC.x - 30 - sw, headC.y + 40);
        kk.quadraticCurveTo(headC.x - 28 - sw * 1.3, headC.y + 72, headC.x - 18 - sw * 1.5, headC.y + 92);
        kk.quadraticCurveTo(headC.x - 6, headC.y + 78, headC.x + 2, headC.y + 52); kk.quadraticCurveTo(headC.x + 4, headC.y + 20, headC.x - 4, headC.y - 22);
      });
      c.strokeStyle = '#6E4A38'; c.lineWidth = 2; c.beginPath(); c.moveTo(headC.x - 20, headC.y + 8); c.quadraticCurveTo(headC.x - 24 - sw, headC.y + 46, headC.x - 16 - sw * 1.4, headC.y + 82); c.stroke();
    }

    // torso
    const hem = ana ? (o.nDress ? hipY + 92 : o.coat ? hipY + 62 : hipY + 30) : (o.aLong ? hipY + 26 : hipY + 18);
    const flare = ana ? (o.nDress ? 30 + Math.sin(t * 1.3) * 2 * wind : o.coat ? 18 : 12) : 4;
    shape(c, top, kk => {
      kk.moveTo(shoulder.x - (ana ? 14 : 19), shoulder.y + 2);
      kk.quadraticCurveTo(shoulder.x + 2, shoulder.y - 8, shoulder.x + (ana ? 16 : 19), shoulder.y + 4);
      kk.quadraticCurveTo(shoulder.x + (ana ? 22 : 24), shoulder.y + 50, shoulder.x + (ana ? 14 : 16), hipY + bob);
      kk.lineTo(flare * 0.9 + 6, hem + bob); kk.lineTo(-flare - 14, hem + bob);
      kk.quadraticCurveTo(-(ana ? 18 : 22), hipY - 40 + bob, shoulder.x - (ana ? 14 : 19), shoulder.y + 2);
    });
    // sombra de la espalda y pliegues
    c.fillStyle = topS; c.globalAlpha = 0.75;
    c.beginPath(); c.moveTo(shoulder.x - (ana ? 14 : 19), shoulder.y + 4); c.quadraticCurveTo(-(ana ? 18 : 22), hipY - 40 + bob, -flare - 13, hem + bob - 1); c.lineTo(-flare - 4, hem + bob - 1); c.quadraticCurveTo(-10, hipY - 40 + bob, shoulder.x - 8, shoulder.y + 6); c.fill();
    c.globalAlpha = 1;
    c.strokeStyle = topS; c.lineWidth = 1.6; c.beginPath(); c.moveTo(shoulder.x + 4, shoulder.y + 30); c.quadraticCurveTo(shoulder.x + 10, shoulder.y + 60, shoulder.x + 2, hipY + bob - 6); c.stroke();
    if (!ana && !o.aLong) { c.fillStyle = topS; c.fillRect(-20, hipY + bob + 12, 40, 4); }
    if (o.scarf && ana) shape(c, o.scarf, kk => { kk.moveTo(shoulder.x - 12, shoulder.y - 4); kk.quadraticCurveTo(shoulder.x + 4, shoulder.y + 6, shoulder.x + 16, shoulder.y - 2); kk.lineTo(shoulder.x + 14, shoulder.y - 12); kk.quadraticCurveTo(shoulder.x + 2, shoulder.y - 6, shoulder.x - 10, shoulder.y - 14); });

    // cuello y cabeza
    seg(c, [neckB, P(headC.x - 2, headC.y + 18)], ana ? 10 : 13, SKIN);
    drawHead(c, ana, headC, t, wind);

    // pierna cercana
    drawLeg(c, hip, Ln, legW, legCol, shoe, legColS);
    if (ana && o.nDress) { // falda por encima de las piernas
      shape(c, top, kk => { kk.moveTo(-16, hipY + bob - 4); kk.lineTo(16, hipY + bob - 4); kk.lineTo(flare + 6, hem + bob); kk.quadraticCurveTo(0, hem + bob + 6, -flare - 14, hem + bob); kk.closePath(); });
    }

    // brazo cercano
    {
      const sh = P(shoulder.x + 2, shoulder.y + 4);
      const el = ana ? ik(sh, nearHand, UA, FA, -1) : ik(sh, nearHand, UA, FA, -1);
      const sleeveLong = longS;
      seg(c, [sh, el], ana ? 12 : 15, top);
      if (!sleeveLong) { // manga corta: el antebrazo es piel desde el codo
        const mid = P(sh.x + (el.x - sh.x) * 0.7, sh.y + (el.y - sh.y) * 0.7);
        seg(c, [mid, el], ana ? 9.5 : 11.5, SKIN); seg(c, [el, nearHand], ana ? 9.5 : 11.5, SKIN);
      } else seg(c, [el, nearHand], ana ? 10 : 12, top);
      blob(c, nearHand.x, nearHand.y, ana ? 6 : 7, ana ? 6 : 7, SKIN, 1.4);
    }
    c.restore();
    return { nearHand: P(nearHand.x * k, (nearHand.y + drop) * k), farHand: P(farHand.x * k, (farHand.y + drop) * k) };
  }

  function drawHead(c, ana, h, t, wind) {
    const r = ana ? 21 : 23;
    // cráneo y cara de perfil
    shape(c, SKIN, kk => {
      kk.moveTo(h.x - r * 0.2, h.y - r);
      kk.quadraticCurveTo(h.x + r * 0.95, h.y - r * 1.05, h.x + r * 1.02, h.y - r * 0.2);   // frente
      kk.lineTo(h.x + r * 1.18, h.y + r * 0.14);                                             // nariz
      kk.lineTo(h.x + r * 1.02, h.y + r * 0.3);
      kk.quadraticCurveTo(h.x + r * 1.06, h.y + r * 0.5, h.x + r * 0.98, h.y + r * 0.62);    // boca
      kk.quadraticCurveTo(h.x + r * 0.95, h.y + r * 0.9, h.x + r * 0.6, h.y + r * 0.98);     // barbilla
      kk.quadraticCurveTo(h.x + r * 0.1, h.y + r * 0.96, h.x - r * 0.3, h.y + r * 0.55);     // mandíbula
      kk.quadraticCurveTo(h.x - r * 1.05, h.y + r * 0.2, h.x - r * 0.95, h.y - r * 0.3);
      kk.quadraticCurveTo(h.x - r * 0.85, h.y - r * 0.95, h.x - r * 0.2, h.y - r);
    }, 1.6);
    // rubor y sombra del cuello
    c.fillStyle = 'rgba(232,140,120,.28)'; c.beginPath(); c.ellipse(h.x + r * 0.62, h.y + r * 0.32, r * 0.22, r * 0.12, 0, 0, Math.PI * 2); c.fill();
    // oreja
    blob(c, h.x - r * 0.18, h.y + r * 0.08, r * 0.17, r * 0.26, SKIN_S, 1.3);
    // ojo de anime de perfil
    const ex = h.x + r * 0.68, ey = h.y - r * 0.08;
    c.fillStyle = '#1E1418'; c.beginPath(); c.ellipse(ex, ey, r * 0.1, r * 0.17, 0.15, 0, Math.PI * 2); c.fill();
    c.fillStyle = ana ? '#7A4E36' : '#4A3428'; c.beginPath(); c.ellipse(ex + r * 0.01, ey + r * 0.05, r * 0.07, r * 0.1, 0.15, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(ex + r * 0.03, ey - r * 0.07, r * 0.045, 0, Math.PI * 2); c.fill();
    c.strokeStyle = LINE; c.lineWidth = ana ? 2.2 : 1.8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(ex - r * 0.12, ey - r * 0.2); c.quadraticCurveTo(ex + r * 0.05, ey - r * 0.26, ex + r * 0.16, ey - r * 0.16); c.stroke();  // párpado
    if (ana) { c.beginPath(); c.moveTo(ex + r * 0.14, ey - r * 0.17); c.lineTo(ex + r * 0.24, ey - r * 0.24); c.stroke(); }                          // pestañas
    c.lineWidth = ana ? 1.6 : 2.6; c.beginPath(); c.moveTo(ex - r * 0.16, ey - r * 0.4); c.quadraticCurveTo(ex + r * 0.05, ey - r * 0.48, ex + r * 0.22, ey - r * 0.38); c.stroke(); // ceja
    // boca
    c.strokeStyle = '#9A5A50'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(h.x + r * 0.9, h.y + r * 0.5); c.lineTo(h.x + r * 0.78, h.y + r * 0.52); c.stroke();

    if (ana) {
      // pelo: casquete, flequillo y raya al medio
      shape(c, '#3B261C', kk => {
        kk.moveTo(h.x - r * 1.05, h.y + r * 0.35); kk.quadraticCurveTo(h.x - r * 1.2, h.y - r * 0.9, h.x - r * 0.1, h.y - r * 1.12);
        kk.quadraticCurveTo(h.x + r * 0.9, h.y - r * 1.1, h.x + r * 1.0, h.y - r * 0.3);
        kk.quadraticCurveTo(h.x + r * 0.7, h.y - r * 0.62, h.x + r * 0.32, h.y - r * 0.55);
        kk.quadraticCurveTo(h.x + r * 0.1, h.y - r * 0.2, h.x + r * 0.05, h.y + r * 0.1);
        kk.quadraticCurveTo(h.x - r * 0.3, h.y - r * 0.2, h.x - r * 0.5, h.y + r * 0.1);
        kk.quadraticCurveTo(h.x - r * 0.75, h.y + r * 0.35, h.x - r * 1.05, h.y + r * 0.35);
      }, 1.6);
      c.strokeStyle = 'rgba(160,110,85,.9)'; c.lineWidth = 3.4; c.beginPath(); c.arc(h.x - r * 0.1, h.y - r * 0.1, r * 0.85, Math.PI * 1.15, Math.PI * 1.6); c.stroke();
      c.fillStyle = '#E2B85A'; c.beginPath(); c.arc(h.x - r * 0.18, h.y + r * 0.38, r * 0.07, 0, Math.PI * 2); c.fill(); // pendiente
    } else {
      // barba poblada siguiendo la mandíbula
      shape(c, '#26190F', kk => {
        kk.moveTo(h.x - r * 0.05, h.y + r * 0.05); kk.quadraticCurveTo(h.x + r * 0.15, h.y + r * 0.45, h.x + r * 0.62, h.y + r * 0.36);
        kk.quadraticCurveTo(h.x + r * 0.86, h.y + r * 0.34, h.x + r * 1.0, h.y + r * 0.42);
        kk.lineTo(h.x + r * 0.86, h.y + r * 0.56); kk.quadraticCurveTo(h.x + r * 1.0, h.y + r * 0.66, h.x + r * 0.96, h.y + r * 0.82);
        kk.quadraticCurveTo(h.x + r * 0.9, h.y + r * 1.22, h.x + r * 0.45, h.y + r * 1.2);
        kk.quadraticCurveTo(h.x - r * 0.05, h.y + r * 1.1, h.x - r * 0.38, h.y + r * 0.62);
        kk.quadraticCurveTo(h.x - r * 0.25, h.y + r * 0.3, h.x - r * 0.05, h.y + r * 0.05);
      }, 1.4);
      c.strokeStyle = '#5A4030'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(h.x + r * 0.3, h.y + r * 0.8); c.quadraticCurveTo(h.x + r * 0.5, h.y + r * 0.95, h.x + r * 0.7, h.y + r * 0.86); c.stroke();
      // laterales cortos (degradado) y rizos arriba
      c.fillStyle = 'rgba(38,25,15,.55)'; c.beginPath(); c.moveTo(h.x - r * 0.95, h.y - r * 0.1); c.quadraticCurveTo(h.x - r * 0.6, h.y - r * 0.35, h.x + r * 0.2, h.y - r * 0.5); c.lineTo(h.x + r * 0.1, h.y + r * 0.05); c.quadraticCurveTo(h.x - r * 0.5, h.y + r * 0.1, h.x - r * 0.95, h.y + r * 0.25); c.fill();
      const curls = [[-0.85, -0.55, 0.32], [-0.6, -0.85, 0.34], [-0.25, -1.05, 0.36], [0.12, -1.1, 0.36], [0.48, -1.0, 0.32], [0.78, -0.78, 0.26], [-0.95, -0.2, 0.26], [-0.3, -0.7, 0.3], [0.2, -0.75, 0.3]];
      c.fillStyle = '#26190F';
      c.beginPath(); curls.forEach(([dx, dy, rr]) => { c.moveTo(h.x + dx * r + rr * r, h.y + dy * r); c.arc(h.x + dx * r, h.y + dy * r, rr * r, 0, Math.PI * 2); }); c.fill();
      c.strokeStyle = LINE; c.lineWidth = 1.4; c.stroke();
      c.strokeStyle = '#6A4A36'; c.lineWidth = 1.8;
      curls.slice(0, 6).forEach(([dx, dy, rr]) => { c.beginPath(); c.arc(h.x + dx * r, h.y + dy * r, rr * r * 0.6, Math.PI * 1.1, Math.PI * 1.7); c.stroke(); });
    }
  }

  // ---------- perros ----------
  function chow(c, col, ph, amp, t, lying, bounce) {
    if (lying) {
      blob(c, 0, -26, 64, 26, col.body);
      blob(c, -50, -40, 18, 15, col.light);
      seg(c, [P(40, -12), P(78, -8)], 13, col.legs); seg(c, [P(30, -10), P(68, -4)], 13, col.body);
      blob(c, 52, -48, 30, 26, col.mane);
      blob(c, 72, -52, 21, 19, col.head);
      blob(c, 90, -46, 12, 9, col.muzzle, 1.4); blob(c, 100, -48, 4, 3.2, '#1A1214', 1);
      shape(c, col.ear, k => { k.moveTo(60, -66); k.quadraticCurveTo(62, -80, 70, -70); k.closePath(); }, 1.3);
      c.strokeStyle = LINE; c.lineWidth = 1.6; c.beginPath(); c.moveTo(76, -56); c.quadraticCurveTo(80, -58, 84, -56); c.stroke();
      return P(54, -32);
    }
    const by = -Math.abs(Math.sin(ph)) * (bounce || 2);
    c.save(); c.translate(0, by);
    const legs = [[-40, 0.0, col.shade], [34, Math.PI, col.shade], [-30, Math.PI, col.legs], [44, 0, col.legs]];
    legs.slice(0, 2).forEach(([lx, off, cc]) => { const a = amp * Math.sin(ph + off); seg(c, [P(lx, -40), P(lx + Math.sin(a) * 34, -40 + Math.cos(a) * 34 - 4)], 14, cc); });
    // cuerpo esponjoso
    shape(c, col.body, k => {
      k.moveTo(-62, -52);
      for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI, x = Math.cos(a) * 60, y = -58 + Math.sin(a) * 32; k.quadraticCurveTo(x - 4, y - 5, x, y); }
      k.quadraticCurveTo(62, -30, 40, -28); k.lineTo(-44, -28); k.quadraticCurveTo(-68, -32, -62, -52);
    });
    c.fillStyle = col.shade; c.globalAlpha = 0.6; c.beginPath(); c.ellipse(0, -36, 50, 9, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
    legs.slice(2).forEach(([lx, off, cc]) => { const a = amp * Math.sin(ph + off); seg(c, [P(lx, -40), P(lx + Math.sin(a) * 34, -40 + Math.cos(a) * 34 - 4)], 14, cc); });
    // cola enroscada sobre el lomo
    const wag = Math.sin(t * 6) * 2;
    blob(c, -38 + wag * 0.5, -94, 22, 19, col.light);
    c.strokeStyle = col.shade; c.lineWidth = 3; c.beginPath(); c.arc(-38 + wag * 0.5, -94, 9, 0.3, Math.PI * 1.7); c.stroke();
    // melena, cabeza
    shape(c, col.mane, k => {
      const cx = 46, cy = -72;
      k.moveTo(cx + 36, cy);
      for (let i = 1; i <= 14; i++) { const a = (i / 14) * Math.PI * 2, x = cx + Math.cos(a) * 36, y = cy + Math.sin(a) * 33, am = a - Math.PI / 14; k.quadraticCurveTo(cx + Math.cos(am) * 42, cy + Math.sin(am) * 39, x, y); }
    });
    const hb = Math.sin(ph * 2) * 1.2;
    blob(c, 70, -92 + hb, 22, 20, col.head);
    shape(c, col.ear, k => { k.moveTo(56, -106 + hb); k.quadraticCurveTo(56, -122 + hb, 66, -112 + hb); k.closePath(); }, 1.3);
    shape(c, col.ear, k => { k.moveTo(70, -110 + hb); k.quadraticCurveTo(72, -126 + hb, 80, -112 + hb); k.closePath(); }, 1.3);
    blob(c, 90, -86 + hb, 13, 10, col.muzzle, 1.5);
    blob(c, 101, -89 + hb, 4.2, 3.4, '#1A1214', 1);
    c.fillStyle = '#1A1214'; c.beginPath(); c.ellipse(78, -96 + hb, 2.4, 3, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(78.8, -97 + hb, 0.9, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#C45A6A'; c.beginPath(); c.ellipse(92, -78 + hb, 4, 3, 0.3, 0, Math.PI * 2); c.fill();
    // collar
    shape(c, col.collar, k => { k.moveTo(46, -64); k.quadraticCurveTo(58, -58, 64, -66); k.lineTo(66, -60); k.quadraticCurveTo(58, -50, 44, -58); }, 1.2);
    // mechones
    c.strokeStyle = col.tuft; c.lineWidth = 2; c.lineCap = 'round';
    [[30, -84], [40, -96], [-10, -84], [-30, -74], [12, -78], [54, -56]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 4, y - 6, x + 9, y - 3); c.stroke(); });
    c.restore();
    return P(56, -62 + by);
  }
  const LEO = { body: '#EED7AE', shade: '#CFAE80', legs: '#E3C796', mane: '#F4E4C6', head: '#F0DCB6', ear: '#D8B888', muzzle: '#F8EDD6', light: '#F8ECD4', tuft: '#FFF6E6', collar: '#B84A36' };
  const JUANI = { body: '#B66E3D', shade: '#8C4C28', legs: '#A25E32', mane: '#C3824E', head: '#BF7A46', ear: '#8A4A26', muzzle: '#6E4028', light: '#D0935F', tuft: '#E6AC78', collar: '#D4537E' };

  /* Dibuja a los cuatro.
     o: estación; g: crecimiento de Juanita (0..1); ph: fase de paso; amp: amplitud (0 = quietos); t: segundos; wind */
  window.HZWalk = function (c, season, g, ph, amp, t, wind) {
    const o = OUT[season] || OUT.mid;
    const ANA_X = -92;
    // punto donde se cogen de la mano (coordenadas del grupo)
    const hold = P(-46, -96 + (amp > 0 ? Math.sin(ph * 2) * 2 : 0));
    // Ana (detrás)
    c.save(); c.translate(ANA_X, 0);
    person(c, 'ana', o, ph + 0.35, amp * 0.95, t, P(hold.x - ANA_X, hold.y), wind);
    c.restore();
    // Juanita (detrás de Leo) y Leo
    const jk = 0.5 + 0.42 * g;
    const lying = amp === 0;
    let jc, lc;
    c.save(); c.translate(318 + 30 * g, 0); c.scale(jk, jk); jc = chow(c, JUANI, ph * (1.5 - 0.3 * g) + 0.8, amp > 0 ? 0.6 : 0, t, lying, 2 + (1 - g) * 5); c.restore();
    jc = P(318 + 30 * g + jc.x * jk, jc.y * jk);
    c.save(); c.translate(178, 0); lc = chow(c, LEO, ph * 1.25 + 0.4, amp > 0 ? 0.55 : 0, t, lying, 2); c.restore();
    lc = P(178 + lc.x, lc.y);
    // Ale (delante)
    const r = person(c, 'ale', o, ph, amp, t, hold, wind);
    // correas
    const h = r.nearHand;
    c.strokeStyle = '#2A1E18'; c.lineWidth = 2.2;
    [lc, jc].forEach((d, i) => { c.beginPath(); c.moveTo(h.x, h.y); c.quadraticCurveTo((h.x + d.x) / 2, Math.max(h.y, d.y) + 26 + i * 14, d.x, d.y); c.stroke(); });
    blob(c, h.x, h.y, 7, 7, SKIN, 1.4);
  };
  window.HZWalk.box = { left: -170, right: 470, top: -350, bottom: 14 };
})();
