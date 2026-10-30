/* Horizonte — Ale, Ana, Leo y Juanita en estilo anime, de espaldas mirando el Estrecho.
   Se dibujan como SVG (caja de 600x480, suelo en y=460) y la escena los ilumina en cada fotograma. */
(function () {
  'use strict';

  const OUTFITS = {
    summer: { aleTop: '#F2EFE8', aleTopS: '#C9C3B8', alePants: '#D9CCB0', alePantsS: '#B2A486', aleShoe: '#F4F1EA', aleLong: false,
              anaTop: '#F6F2EA', anaTopS: '#CFC6B8', anaPants: null, anaShoe: '#C69A74', anaLong: false, scarf: null },
    mid:    { aleTop: '#24314F', aleTopS: '#161F36', alePants: '#D6C8AC', alePantsS: '#AE9F82', aleShoe: '#F4F1EA', aleLong: false,
              anaTop: '#F4EFE6', anaTopS: '#CBC2B4', anaPants: '#2B2624', anaPantsS: '#1A1716', anaShoe: '#2B2624', anaLong: true, scarf: null },
    winter: { aleTop: '#2E4A44', aleTopS: '#1C302C', alePants: '#2E3548', alePantsS: '#1E2333', aleShoe: '#3B2E27', aleLong: true,
              anaTop: '#B98A5E', anaTopS: '#8E6542', anaPants: '#2B2624', anaPantsS: '#1A1716', anaShoe: '#2B2624', anaLong: true, scarf: '#8E3B3B' }
  };
  const SKIN = '#E4B796', SKIN_S = '#C08B6C', HAIR_A = '#24180F', HAIR_AH = '#5A4130', HAIR_N = '#3A251B', HAIR_NH = '#7A5440';

  function ale(o) {
    const sleeveEnd = o.aleLong ? 252 : 160;
    return `
    <!-- piernas -->
    <path d="M300 268 L331 268 L328 448 L303 448 Z" fill="${o.alePants}"/>
    <path d="M331 268 L363 268 L358 448 L334 448 Z" fill="${o.alePants}"/>
    <path d="M300 268 L312 268 L309 448 L303 448 Z" fill="${o.alePantsS}"/>
    <path d="M326 276 L331 268 L334 448 L328 448 Z" fill="${o.alePantsS}" opacity=".8"/>
    <path d="M306 330 q6 4 14 2 M338 350 q8 4 16 0 M306 400 q6 3 14 1" stroke="${o.alePantsS}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- zapatillas -->
    <path d="M300 444 h31 q5 0 5 7 v5 h-39 v-5 q0 -7 3 -7z" fill="${o.aleShoe}"/>
    <path d="M332 444 h29 q5 0 5 7 v5 h-37 v-5 q0 -7 3 -7z" fill="${o.aleShoe}"/>
    <path d="M297 452 h39 v4 h-39z M329 452 h37 v4 h-37z" fill="#00000022"/>
    <!-- brazo izquierdo (de la mano con Ana) -->
    <path d="M281 120 Q266 132 264 160 L262 ${sleeveEnd} L276 ${sleeveEnd + 2} L284 160 Z" fill="${o.aleTopS}"/>
    <path d="M264 ${sleeveEnd - 4} Q262 210 258 258 L271 262 Q276 210 279 ${sleeveEnd - 2} Z" fill="${o.aleLong ? o.aleTopS : SKIN}"/>
    <!-- brazo derecho (correas) -->
    <path d="M382 120 Q396 132 398 160 L400 ${sleeveEnd} L386 ${sleeveEnd + 2} L380 160 Z" fill="${o.aleTop}"/>
    <path d="M386 ${sleeveEnd - 4} Q388 210 388 254 L401 254 Q401 210 400 ${sleeveEnd - 2} Z" fill="${o.aleLong ? o.aleTop : SKIN}"/>
    <!-- espalda -->
    <path d="M276 128 Q278 108 302 104 L362 104 Q386 108 388 128 L377 274 L287 274 Z" fill="${o.aleTop}"/>
    <path d="M276 128 Q278 108 302 104 L306 104 Q294 150 297 274 L287 274 Z" fill="${o.aleTopS}"/>
    <path d="M332 112 Q328 190 334 272" stroke="${o.aleTopS}" stroke-width="2.4" fill="none" opacity=".7"/>
    <path d="M300 150 Q316 162 312 200 M360 148 Q350 170 356 214 M308 238 Q330 246 352 236" stroke="${o.aleTopS}" stroke-width="2" fill="none" opacity=".75" stroke-linecap="round"/>
    <path d="M287 262 L377 262 L377 274 L287 274 Z" fill="${o.aleTopS}" opacity=".55"/>
    <!-- cuello de la camisa y cuello -->
    <path d="M318 84 L345 84 L347 106 L316 106 Z" fill="${SKIN}"/>
    <path d="M318 84 L328 84 L326 106 L316 106 Z" fill="${SKIN_S}"/>
    <path d="M311 102 Q331 112 352 102 L350 114 Q331 121 313 114 Z" fill="${o.aleTopS}"/>
    <!-- cabeza de espaldas: orejas, nuca y pelo -->
    <ellipse cx="331" cy="60" rx="28" ry="31" fill="${SKIN_S}"/>
    <ellipse cx="302" cy="64" rx="5.5" ry="10" fill="${SKIN_S}"/>
    <ellipse cx="360" cy="64" rx="5.5" ry="10" fill="${SKIN}"/>
    <path d="M361 58 q3 6 0 12" stroke="${SKIN_S}" stroke-width="1.5" fill="none"/>
    <path d="M314 78 Q331 90 348 78 L347 98 L316 98 Z" fill="${SKIN}"/>
    <!-- barba asomando por la mandíbula -->
    <path d="M357 72 Q364 94 347 104 Q354 92 354 78 Z" fill="${HAIR_A}"/>
    <path d="M305 72 Q299 92 315 103 Q309 90 309 78 Z" fill="${HAIR_A}"/>
    <!-- pelo: nuca rapada (más clara) y rizos arriba -->
    <path d="M304 66 Q300 24 331 20 Q362 24 358 66 Q356 80 346 85 Q331 91 316 85 Q306 80 304 66 Z" fill="#5E4434"/>
    <path d="M305 66 Q302 22 331 18 Q360 22 357 66 Q346 80 331 81 Q316 80 305 66 Z" fill="${HAIR_A}"/>
    <g fill="${HAIR_A}">
      <circle cx="309" cy="34" r="10"/><circle cx="321" cy="24" r="10"/><circle cx="335" cy="20" r="10"/><circle cx="349" cy="25" r="10"/>
      <circle cx="358" cy="37" r="9"/><circle cx="304" cy="47" r="8"/><circle cx="318" cy="40" r="9"/><circle cx="342" cy="38" r="9"/><circle cx="356" cy="50" r="7"/><circle cx="331" cy="50" r="9"/><circle cx="315" cy="56" r="8"/><circle cx="347" cy="56" r="8"/><circle cx="331" cy="64" r="8"/>
    </g>
    <g stroke="${HAIR_AH}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".9">
      <path d="M314 30 q5 -6 11 -3"/><path d="M329 20 q6 -4 12 0"/><path d="M344 24 q6 -2 9 4"/><path d="M312 44 q5 -5 10 -2"/><path d="M336 36 q6 -5 11 -1"/><path d="M302 42 q2 -6 7 -7"/>
    </g>`;
  }

  function ana(o) {
    const legs = o.anaPants
      ? `<path d="M171 290 L192 290 L190 450 L175 450 Z" fill="${o.anaPants}"/>
         <path d="M192 290 L213 290 L209 450 L194 450 Z" fill="${o.anaPants}"/>
         <path d="M171 290 L180 290 L179 450 L175 450 Z" fill="${o.anaPantsS}"/>`
      : `<path d="M178 340 L190 340 L189 446 L180 446 Z" fill="${SKIN}"/>
         <path d="M194 340 L206 340 L204 446 L195 446 Z" fill="${SKIN}"/>
         <path d="M178 340 L183 340 L182 446 L180 446 Z" fill="${SKIN_S}"/>`;
    const bottom = o.anaPants ? (o.anaLong ? 300 : 290) : 352;
    const sleeveEnd = o.anaLong ? 250 : 196;
    return `
    ${legs}
    <path d="M172 444 h20 q4 0 4 6 v3 h-26 v-3 q0 -6 2 -6z M193 444 h18 q4 0 4 6 v3 h-24 v-3 q0 -6 2 -6z" fill="${o.anaShoe}"/>
    <!-- brazo izquierdo -->
    <path d="M162 134 Q148 150 148 ${sleeveEnd} L162 ${sleeveEnd + 2} L168 150 Z" fill="${o.anaTopS}"/>
    <path d="M149 ${sleeveEnd - 4} Q148 240 152 282 L163 282 Q162 240 162 ${sleeveEnd} Z" fill="${o.anaLong && sleeveEnd > 240 ? o.anaTopS : SKIN}"/>
    <!-- brazo derecho hacia Ale -->
    <path d="M214 132 Q228 142 232 ${o.anaLong ? 196 : 170} L220 ${o.anaLong ? 200 : 174} L208 150 Z" fill="${o.anaTop}"/>
    <path d="M222 ${o.anaLong ? 194 : 168} Q238 220 256 262 L266 256 Q248 214 233 ${o.anaLong ? 190 : 164} Z" fill="${o.anaLong && o.scarf ? o.anaTop : SKIN}"/>
    <!-- cuerpo: camisa de lino amplia -->
    <path d="M160 140 Q162 120 180 116 L204 116 Q222 120 224 140 L${o.anaPants ? 230 : 234} ${bottom} L${o.anaPants ? 154 : 150} ${bottom} Z" fill="${o.anaTop}"/>
    <path d="M160 140 Q162 120 180 116 L183 116 Q172 200 170 ${bottom} L${o.anaPants ? 154 : 150} ${bottom} Z" fill="${o.anaTopS}"/>
    <path d="M196 220 Q200 260 194 ${bottom - 4} M214 228 Q222 268 220 ${bottom - 6} M176 236 Q172 270 176 ${bottom - 8}" stroke="${o.anaTopS}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
    ${o.scarf ? `<path d="M172 112 Q192 124 214 112 L216 128 Q192 140 170 128 Z" fill="${o.scarf}"/>` : ''}
    <!-- cuello y cabeza -->
    <path d="M182 100 L200 100 L202 118 L180 118 Z" fill="${SKIN_S}"/>
    <circle cx="191" cy="84" r="23" fill="${SKIN}"/>`;
  }

  function anaHair() {
    return `
    <path d="M166 90 Q162 58 191 56 Q220 58 216 90 Q222 140 224 200 Q216 214 206 210 Q198 222 190 216 Q182 222 174 210 Q164 214 158 200 Q160 140 166 90 Z" fill="${HAIR_N}"/>
    <path d="M166 90 Q162 140 160 200 Q166 210 174 210 Q170 150 176 96 Z" fill="#00000030"/>
    <path d="M191 58 L191 80" stroke="#1C110B" stroke-width="2" stroke-linecap="round"/>
    <path d="M170 84 Q191 70 212 84" stroke="${HAIR_NH}" stroke-width="4.5" fill="none" stroke-linecap="round" opacity=".85"/>
    <path d="M176 92 Q191 84 206 92" stroke="${HAIR_NH}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>
    <g stroke="#1C110B" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".55">
      <path d="M180 110 Q178 160 182 206"/><path d="M196 112 Q198 164 194 212"/><path d="M208 108 Q212 160 214 204"/>
    </g>
    <path d="M158 200 Q162 212 170 214 M224 200 Q220 212 212 214" stroke="${HAIR_N}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  }

  // Contorno esponjoso: elipse con mechones
  function fluff(cx, cy, rx, ry, n, amp, a0, a1) {
    a0 = a0 == null ? 0 : a0; a1 = a1 == null ? Math.PI * 2 : a1;
    let d = '';
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      if (!i) { d += `M${x.toFixed(1)} ${y.toFixed(1)}`; continue; }
      const am = a - (a1 - a0) / n / 2, k = 1 + amp, mx = cx + Math.cos(am) * rx * k, my = cy + Math.sin(am) * ry * k;
      d += ` Q${mx.toFixed(1)} ${my.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d + ' Z';
  }
  // Chow chow sentado, de espaldas. c = colores, cx = centro, k = escala (cachorro)
  function chow(c, cx, k, collar) {
    const body = fluff(cx, 404, 50, 60, 22, 0.06);
    const mane = fluff(cx, 318, 46, 42, 20, 0.1);
    const head = fluff(cx, 290, 29, 27, 14, 0.06);
    const tail = fluff(cx + 6, 388, 26, 22, 14, 0.12);
    return `<g transform="translate(${cx} 460) scale(${k}) translate(${-cx} -460)">
    <ellipse cx="${cx}" cy="460" rx="58" ry="7" fill="#00000026"/>
    <path d="${body}" fill="${c.body}"/>
    <path d="M${cx - 50} 404 Q${cx - 50} 350 ${cx - 14} 344 Q${cx - 36} 400 ${cx - 26} 462 Q${cx - 48} 450 ${cx - 50} 404 Z" fill="${c.shade}" opacity=".85"/>
    <ellipse cx="${cx - 30}" cy="458" rx="18" ry="7" fill="${c.shade}"/><ellipse cx="${cx + 30}" cy="458" rx="18" ry="7" fill="${c.body}"/>
    <path d="${mane}" fill="${c.mane}"/>
    <path d="M${cx - 44} 318 Q${cx - 46} 288 ${cx - 24} 278 Q${cx - 36} 310 ${cx - 26} 352 Q${cx - 42} 340 ${cx - 44} 318 Z" fill="${c.shade}" opacity=".55"/>
    <path d="${head}" fill="${c.head}"/>
    <path d="M${cx - 24} 276 Q${cx - 26} 256 ${cx - 12} 262 Q${cx - 14} 272 ${cx - 16} 280 Z" fill="${c.ear}"/>
    <path d="M${cx + 24} 276 Q${cx + 26} 256 ${cx + 12} 262 Q${cx + 14} 272 ${cx + 16} 280 Z" fill="${c.ear}"/>
    <path d="M${cx - 26} 340 Q${cx} 352 ${cx + 26} 340 L${cx + 24} 348 Q${cx} 360 ${cx - 24} 348 Z" fill="${collar}"/>
    <path d="${tail}" fill="${c.light}"/>
    <path d="M${cx - 6} 390 q2 -12 14 -10 q10 4 4 14" stroke="${c.shade}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".45"/>
    <g stroke="${c.tuft}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85">
      <path d="M${cx - 16} 298 q4 -6 8 -2"/><path d="M${cx + 6} 302 q4 -6 8 -2"/><path d="M${cx - 6} 284 q4 -6 8 -2"/>
      <path d="M${cx - 28} 326 q4 -6 8 -2"/><path d="M${cx + 20} 324 q4 -6 8 -2"/><path d="M${cx + 14} 420 q4 -6 8 -2"/><path d="M${cx - 18} 428 q4 -6 8 -2"/>
    </g>
  </g>`;
  }
  const LEO = { body: '#EDD6AC', shade: '#CDAE80', mane: '#F3E2C2', head: '#EFDBB4', ear: '#D9B98A', inner: '#B89466', light: '#F8EBD2', tuft: '#FFF6E4' };
  const JUANI = { body: '#B56D3C', shade: '#8A4A26', mane: '#C2804C', head: '#BE7845', ear: '#8A4A26', inner: '#6A3A1E', light: '#CF925E', tuft: '#E2A874' };

  function leashes(g) {
    const jx = 552, jy = 460 - (460 - 342) * (0.5 + 0.5 * g);
    return `<path d="M394 260 Q440 320 470 346" stroke="#2A1E18" stroke-width="2" fill="none"/>
            <path d="M394 260 Q480 360 ${jx} ${jy + 4}" stroke="#2A1E18" stroke-width="2" fill="none"/>
            <circle cx="394" cy="258" r="9" fill="${SKIN}"/><circle cx="262" cy="262" r="9" fill="${SKIN}"/><circle cx="258" cy="262" r="7.5" fill="${SKIN_S}"/>`;
  }

  function svgDoc(inner) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="480" viewBox="0 0 600 480">${inner}</svg>`;
  }

  const cache = {};
  function img(key, svg) {
    if (cache[key]) return cache[key];
    const im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    cache[key] = im;
    return im;
  }

  // Devuelve las capas listas (o null mientras cargan). season: summer|mid|winter, growth: 0..1 de Juanita
  window.HZChars = function (season, growth) {
    const o = OUTFITS[season] || OUTFITS.mid, g = Math.round(growth * 20) / 20;
    const base = img('b-' + season + '-' + g, svgDoc(
      chow(JUANI, 552, 0.5 + 0.5 * g, '#D4537E') + chow(LEO, 470, 1, '#B84A36') + ana(o) + ale(o) + leashes(g)));
    const hair = img('h', svgDoc(anaHair()));
    return { base, hair, ready: base.complete && base.naturalWidth > 0 && hair.complete && hair.naturalWidth > 0, hairPivot: [191, 70] };
  };
})();
