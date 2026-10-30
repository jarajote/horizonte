/* Horizonte — interfaz: reloj, dock, cajón de apps y navegación con el mando */
(function () {
  'use strict';
  const CFG = window.HZ_CONFIG || {};
  const $ = id => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  if (qs.get('ui') === '0') document.body.classList.add('hide-ui');

  // ---------- Puente con Android (o simulación en el navegador) ----------
  const NATIVE = window.Android || {
    apps: () => JSON.stringify([
      { pkg: 'org.xbmc.kodi', label: 'Kodi' }, { pkg: 'com.tizentube.cobalt', label: 'TizenTube' }, { pkg: 'com.fctv33.app', label: 'FCTV33' },
      { pkg: 'com.android.tv.settings', label: 'Ajustes' }, { pkg: 'com.google.android.youtube.tv', label: 'YouTube' }, { pkg: 'com.netflix.ninja', label: 'Netflix' },
      { pkg: 'com.spotify.tv.android', label: 'Spotify' }, { pkg: 'com.tcl.browser', label: 'Navegador' }, { pkg: 'com.tcl.mediaplayer', label: 'Reproductor' }
    ]),
    icon: p => qs.get('mockicons') ? mockIcon(p) : '',
    customIcon: () => '',
    launch: p => console.log('launch', p),
    hdmiInputs: () => JSON.stringify([{ id: 'hdmi1', label: 'HDMI 1' }, { id: 'hdmi2', label: 'HDMI 2' }, { id: 'hdmi3', label: 'HDMI 3' }]),
    openInput: id => console.log('input', id),
    openSettings: () => console.log('settings'),
    homeOk: () => qs.get('homeok') !== '0',
    installUpdate: () => console.log('install update'),
    openHomeSetup: () => console.log('home setup')
  };
  const homeOk = () => typeof NATIVE.homeOk !== 'function' || safe(() => NATIVE.homeOk(), true);
  function mockIcon(p) {
    const c = document.createElement('canvas'); c.width = c.height = 192; const x = c.getContext('2d');
    const col = { 'org.xbmc.kodi': '#2E6FB5', 'com.google.android.youtube.tv': '#F4F1EC', 'com.fctv33.app': '#1E2E4A', 'com.spotify.tv.android': '#1C1C1C' }[p] || '#888';
    x.fillStyle = col; x.fillRect(0, 0, 192, 192); x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.arc(96, 96, 40, 0, 7); x.fill();
    return c.toDataURL();
  }
  const safe = (fn, fb) => { try { return fn(); } catch (e) { console.error(e); return fb; } };

  // ---------- Escalado a 1920x1080 ----------
  function fit() { const k = Math.min(innerWidth / 1920, innerHeight / 1080); const ui = $('ui'); ui.style.transform = `translate(${(innerWidth - 1920 * k) / 2}px,${(innerHeight - 1080 * k) / 2}px) scale(${k})`; }
  addEventListener('resize', fit); fit();
  HZScene.start($('scene'));

  // ---------- Reloj, saludo y tiempo ----------
  const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MON = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  let wxText = '', wxIcon = '';
  function tick() {
    const d = new Date(HZScene.now()), h = d.getHours();
    $('time').innerHTML = String(h).padStart(2, '0') + '<span class="colon">:</span>' + String(d.getMinutes()).padStart(2, '0');
    $('dow').textContent = DOW[d.getDay()];
    $('date').textContent = d.getDate() + ' de ' + MON[d.getMonth()];
    const g = h >= 6 && h < 13 ? 'Buenos días' : (h >= 13 && h < 21 ? 'Buenas tardes' : 'Buenas noches');
    $('greet').textContent = g + (CFG.names ? ', ' + CFG.names : '');
    $('wx').innerHTML = (wxIcon ? WXI[wxIcon] : '') + '<span>' + wxText + '</span>';
  }
  setInterval(tick, 1000); tick();

  const WX = c => c === 0 ? 'despejado' : c <= 2 ? 'poco nuboso' : c === 3 ? 'nublado' : c <= 48 ? 'niebla' : c <= 57 ? 'llovizna' : c <= 67 ? 'lluvia' : c <= 77 ? 'nieve' : c <= 82 ? 'chubascos' : c <= 86 ? 'nieve' : c === 95 ? 'tormenta' : 'granizo';
  // Icono según el tiempo del día (código WMO de la previsión diaria)
  const WXKIND = c => c <= 1 ? 'sol' : c === 2 ? 'solnubes' : c <= 48 ? 'nubes' : (c <= 67 || (c >= 80 && c <= 82)) ? 'lluvia' : (c <= 77 || c === 85 || c === 86) ? 'nieve' : c === 95 ? 'tormenta' : 'granizo';
  const SUN = '<circle cx="12" cy="12" r="4.6" fill="#F2B34A" stroke="none"/><g stroke="#F2B34A"><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g>';
  const CLOUD = (x, y) => `<path transform="translate(${x} ${y})" d="M7 18.5h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 18.5z" fill="var(--cloudfill)"/>`;
  const svg = inner => `<svg class="wxi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const WXI = {
    sol: svg(SUN),
    solnubes: svg('<g transform="translate(-3.5 -3.5) scale(.8)">' + SUN + '</g>' + CLOUD(1.5, 2)),
    nubes: svg(CLOUD(-2.5, -1.5).replace('var(--cloudfill)', 'none') + CLOUD(1, 1.5)),
    lluvia: svg(CLOUD(0, -3) + '<g stroke="#6FA6DC"><path d="M8.5 18.5l-1 2.5M12.5 18.5l-1 2.5M16.5 18.5l-1 2.5"/></g>'),
    granizo: svg(CLOUD(0, -3) + '<g fill="#EEF3F8" stroke="#9FB4C8" stroke-width="1"><circle cx="8" cy="19.5" r="1.3"/><circle cx="12.3" cy="21" r="1.3"/><circle cx="16.4" cy="19.5" r="1.3"/></g>'),
    tormenta: svg(CLOUD(0, -3) + '<path d="M12.8 16.5l-2.3 3.6h2.6l-1.8 3.4" stroke="#F2B34A" stroke-width="1.8"/>'),
    nieve: svg(CLOUD(0, -3) + '<g stroke="#BFD6EE"><path d="M8.5 18v3M7 19.5h3M15.5 18v3M14 19.5h3"/></g>')
  };
  async function weather() {
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${CFG.lat}&longitude=${CFG.lon}&current=temperature_2m,cloud_cover,weather_code,wind_speed_10m&daily=weather_code&forecast_days=1&timezone=auto`;
      const r = await fetch(u); const j = await r.json(), c = j.current;
      const day = j.daily && j.daily.weather_code ? j.daily.weather_code[0] : c.weather_code;
      HZScene.setWeather({ cc: c.cloud_cover, code: c.weather_code, temp: c.temperature_2m, wind: c.wind_speed_10m });
      wxText = Math.round(c.temperature_2m) + '° · ' + WX(day);
      wxIcon = WXKIND(day);
      tick();
    } catch (e) { /* sin conexión: seguimos con el tiempo por defecto */ }
  }
  if (!qs.get('t')) { weather(); setInterval(weather, 20 * 60 * 1000); }
  else {
    const code = +(qs.get('wx') || 2); wxText = '18° · ' + WX(code); wxIcon = WXKIND(code);
    if (qs.get('wx')) HZScene.setWeather({ cc: code >= 3 ? 90 : 30, code, wind: 20 });
  }

  // Colores de la interfaz según el cielo
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function recolor() {
    const s = HZScene.state(), r = document.documentElement.style;
    r.setProperty('--ui', s.ui); r.setProperty('--ui-soft', hexA(s.ui, 0.74));
    r.setProperty('--shadow', s.night > 0.4 ? 'rgba(0,0,0,.35)' : 'rgba(255,248,236,.35)');
    ['d40:.38', 'd70:.68', 'd80:.8', 'd90:.9', 'd95:.965'].forEach(k => { const [n, a] = k.split(':'); r.setProperty('--' + n, hexA(s.dock, +a)); });
    r.setProperty('--dd', hexA(s.drawer, 0.975));
  }
  setTimeout(recolor, 300); setInterval(recolor, 4000);

  // ---------- Apps y huecos del dock ----------
  let APPS = [], HDMI = [];
  const iconCache = {};
  function loadApps() {
    APPS = safe(() => JSON.parse(NATIVE.apps()), []).filter(a => a.pkg !== 'com.alejandro.horizonte');
    HDMI = safe(() => JSON.parse(NATIVE.hdmiInputs()), []);
  }
  function iconFor(pkg) { if (!(pkg in iconCache)) iconCache[pkg] = safe(() => NATIVE.icon(pkg), ''); return iconCache[pkg]; }

  const SLOT_DEF = [
    { id: 'kodi', title: 'Kodi', find: () => APPS.find(a => a.pkg === 'org.xbmc.kodi') || APPS.find(a => /kodi/i.test(a.label)) },
    { id: 'youtube', title: 'YouTube', find: () => APPS.find(a => /tizen/i.test(a.label + a.pkg)) || APPS.find(a => /smarttube/i.test(a.label + a.pkg)) || APPS.find(a => /youtube/i.test(a.label)) },
    { id: 'futbol', title: 'Fútbol', find: () => APPS.find(a => /fctv/i.test(a.label + a.pkg)) },
    { id: 'spotify', title: 'Spotify', find: () => APPS.find(a => a.pkg === 'com.spotify.tv.android') || APPS.find(a => /spotify/i.test(a.label + a.pkg)) },
    { id: 'ps5', title: 'PS5', find: () => { const h = HDMI.find(i => /ps5|playstation|ps 5|sony/i.test(i.label + ' ' + (i.cec || ''))); return h ? { hdmi: h.id, label: h.label } : null; } }
  ];
  const G = inner => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const GLYPH = {
    kodi: G('<rect x="3" y="5.5" width="18" height="12" rx="2.2"/><path d="M10.2 9.3l4.3 2.4-4.3 2.4z" fill="currentColor"/><path d="M8.5 20.5h7"/>'),
    youtube: G('<rect x="2.8" y="5.8" width="18.4" height="12.4" rx="4"/><path d="M10 9.6l4.6 2.4L10 14.4z" fill="currentColor" stroke="none"/>'),
    futbol: G('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.6l3.6 2.6-1.4 4.2H9.8L8.4 10.2z" fill="currentColor"/><path d="M12 3.5v4.1M15.6 10.2l4.2-1.3M14.2 14.4l2.4 3.7M9.8 14.4l-2.4 3.7M8.4 10.2L4.2 8.9"/>'),
    spotify: G('<path d="M9 17.5V6.3l9.5-2v11.2"/><circle cx="6.6" cy="17.6" r="2.4" fill="currentColor"/><circle cx="16.1" cy="15.6" r="2.4" fill="currentColor"/>'),
    ps5: G('<path d="M7.2 8h9.6a3.9 3.9 0 0 1 3.8 4.6l-.8 3.9a2.1 2.1 0 0 1-3.7.9L14.3 15H9.7l-1.8 2.4a2.1 2.1 0 0 1-3.7-.9l-.8-3.9A3.9 3.9 0 0 1 7.2 8z"/><path d="M8 10.4v3M6.5 11.9h3"/><circle cx="15.9" cy="10.9" r=".9" fill="currentColor" stroke="none"/><circle cx="17.6" cy="12.7" r=".9" fill="currentColor" stroke="none"/>'),
    hdmi: G('<path d="M3.5 8.5h17v4.6l-2 3.4h-13l-2-3.4z"/><path d="M7 11.6h10"/>')
  };
  const gico = id => `<div class="gico gico-${GLYPH[id] ? id : 'hdmi'}">${GLYPH[id] || GLYPH.hdmi}</div>`;

  const store = { get(k, d) { try { const v = localStorage.getItem('hz.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('hz.' + k, JSON.stringify(v)); } catch (e) { } } };
  let SLOTS = [];
  function resolveSlots() {
    const saved = store.get('slots', {});
    SLOTS = SLOT_DEF.map(d => {
      const s = saved[d.id];
      if (s && s.pkg && APPS.find(a => a.pkg === s.pkg)) return Object.assign({ id: d.id, title: d.title }, s);
      if (s && s.hdmi && (HDMI.find(i => i.id === s.hdmi) || !HDMI.length)) return Object.assign({ id: d.id, title: d.title }, s);
      const f = d.find();
      if (!f) return { id: d.id, title: d.title };
      return f.hdmi ? { id: d.id, title: d.title, hdmi: f.hdmi, label: f.label } : { id: d.id, title: d.title, pkg: f.pkg, label: f.label };
    });
  }

  // Iconos propios subidos al repositorio de GitHub como icono-<hueco>.png (icono-ps5.png, icono-kodi.png…)
  let ICONS = store.get('icons', {});
  let iconsChecked = 0;
  async function syncIcons(force) {
    if (!CFG.repo || (!force && Date.now() - iconsChecked < 2 * 60 * 1000)) return;
    iconsChecked = Date.now();
    try {
      const r = await fetch(`https://api.github.com/repos/${CFG.repo}/contents/?ref=main`);
      if (!r.ok) return;
      const list = await r.json(), next = {};
      let changed = false;
      for (const f of list) {
        const m = /^icono-([a-z0-9]+)\.(png|jpe?g|webp)$/i.exec(f.name || '');
        if (!m) continue;
        const slot = m[1].toLowerCase();
        if (ICONS[slot] && ICONS[slot].sha === f.sha) { next[slot] = ICONS[slot]; continue; }
        const blob = await (await fetch(f.download_url)).blob();
        const data = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
        next[slot] = { sha: f.sha, data }; changed = true;
      }
      if (Object.keys(next).length !== Object.keys(ICONS).length) changed = true;
      if (changed) { ICONS = next; store.set('icons', ICONS); renderDock(); }
    } catch (e) { /* sin conexión: seguimos con los guardados */ }
  }

  function tileInner(s) {
    const custom = safe(() => NATIVE.customIcon(s.id), '');
    if (custom) return `<img src="${custom}" alt="">`;
    if (ICONS[s.id]) return `<img src="${ICONS[s.id].data}" alt="">`;
    // El hueco de YouTube muestra el icono oficial de la app de YouTube de la tele aunque abra TizenTube
    if (s.id === 'youtube') { const yt = APPS.find(a => a.pkg === 'com.google.android.youtube.tv') || APPS.find(a => /^youtube$/i.test(a.label)); if (yt) { const ic = iconFor(yt.pkg); if (ic) return `<img src="${ic}" alt="">`; } }
    if (s.pkg) { const ic = iconFor(s.pkg); if (ic) return `<img src="${ic}" alt="">`; }
    return gico(s.id);
  }
  function renderDock() {
    const dock = $('dock'); dock.innerHTML = '';
    SLOTS.forEach((s, i) => {
      const el = document.createElement('div'); el.className = 'tile'; el.dataset.i = i;
      el.innerHTML = tileInner(s) + '<i class="live"></i>';
      if (ICONS[s.id] || safe(() => NATIVE.customIcon(s.id), '')) el.classList.add('custom');
      if (s.id === 'ps5' && s.hdmi && HDMI.find(h => h.id === s.hdmi && h.cec)) el.classList.add('on');
      dock.appendChild(el);
    });
    paintFocus();
  }

  // ---------- Uso por franjas horarias: el foco empieza en lo que más usáis a esa hora ----------
  const bucket = () => Math.floor(new Date(HZScene.now()).getHours() / 3);
  function remember(i) { const u = store.get('usage', {}); const b = bucket(); u[b] = u[b] || []; while (u[b].length < SLOTS.length) u[b].push(0); u[b][i]++; store.set('usage', u); }
  function bestSlot() {
    const u = store.get('usage', {})[bucket()];
    if (u && Math.max(...u) >= 3) return u.indexOf(Math.max(...u));
    const h = new Date(HZScene.now()).getHours();
    return h >= 20 || h < 3 ? 0 : 1;
  }

  // ---------- Acciones ----------
  function toast(msg, ms) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms || 3200); }
  function homeReminder() {
    const ok = homeOk(); $('btnSettings').classList.toggle('alert', !ok);
    if (!ok) toast('Para que el botón Home abra Horizonte: sube a ⚙ y pulsa OK', 9000);
  }
  function openSlot(i) {
    const s = SLOTS[i];
    if (s.pkg) { remember(i); NATIVE.launch(s.pkg); return; }
    if (s.hdmi) { remember(i); NATIVE.openInput(s.hdmi); return; }
    openDrawer('pick', i);
    toast(s.id === 'ps5' ? 'Elige la entrada HDMI de la PS5' : 'Elige qué app va en ' + s.title);
  }
  function assign(i, item) {
    const saved = store.get('slots', {});
    saved[SLOTS[i].id] = item.hdmi ? { hdmi: item.hdmi, label: item.label } : { pkg: item.pkg, label: item.label };
    store.set('slots', saved); resolveSlots(); renderDock();
    toast(SLOTS[i].title + ' → ' + item.label);
  }

  // ---------- Cajón ----------
  let mode = 'dock', focus = { area: 'dock', i: 0 }, drawerMode = 'apps', pickSlot = -1, drawerItems = [];
  const COLS = 7;
  function openDrawer(m, slot) {
    drawerMode = m; pickSlot = slot == null ? -1 : slot;
    $('drawerTitle').textContent = m === 'pick' ? 'Elige qué va en «' + SLOTS[slot].title + '»' : 'Tus apps';
    $('drawerSub').textContent = m === 'pick' ? 'Puede ser una app o una entrada HDMI · atrás para cancelar' : 'Mantén OK sobre un icono del dock para cambiarlo · atrás para volver';
    const inner = $('drawerInner'); inner.innerHTML = ''; drawerItems = [];
    const section = (title, list) => {
      if (!list.length) return;
      const h = document.createElement('div'); h.className = 'section'; h.textContent = title; inner.appendChild(h);
      const g = document.createElement('div'); g.className = 'grid'; inner.appendChild(g);
      list.forEach(it => {
        const el = document.createElement('div'); el.className = 'app';
        const ic = it.hdmi ? GLYPH.hdmi : (iconFor(it.pkg) ? `<img src="${iconFor(it.pkg)}" alt="">` : (it.label || '?').slice(0, 1).toUpperCase());
        el.innerHTML = `<div class="ic">${ic}</div><span>${it.label}</span>`;
        el.dataset.k = drawerItems.length; drawerItems.push({ it, el }); g.appendChild(el);
      });
    };
    if (m === 'pick') section('Entradas HDMI', HDMI.map(h => ({ hdmi: h.id, label: h.cec ? h.cec + ' · ' + h.label : h.label })));
    section('Apps', APPS.slice().sort((a, b) => a.label.localeCompare(b.label, 'es')).map(a => ({ pkg: a.pkg, label: a.label })));
    $('drawer').classList.add('open'); $('ui').classList.add('drawer-open'); mode = 'drawer'; focus = { area: 'drawer', i: 0 }; paintFocus();
  }
  function closeDrawer() { $('drawer').classList.remove('open'); $('ui').classList.remove('drawer-open'); mode = 'dock'; focus = { area: 'dock', i: Math.max(0, pickSlot) }; pickSlot = -1; paintFocus(); }
  function activateDrawer(k) {
    const { it } = drawerItems[k];
    if (drawerMode === 'pick') { const s = pickSlot; closeDrawer(); assign(s, it); focus = { area: 'dock', i: s }; paintFocus(); return; }
    if (it.pkg) NATIVE.launch(it.pkg);
  }

  // ---------- Foco y mando ----------
  let idleT;
  function paintFocus() {
    document.querySelectorAll('.focus').forEach(e => e.classList.remove('focus'));
    if (focus.area !== 'dock') document.querySelectorAll('.tile.near').forEach(e => e.classList.remove('near'));
    const label = $('label'), hint = $('hint');
    if (focus.area === 'dock') {
      const kids = $('dock').children, el = kids[focus.i];
      if (el) el.classList.add('focus');
      [...kids].forEach((k, j) => k.classList.toggle('near', Math.abs(j - focus.i) === 1));
      label.textContent = SLOTS[focus.i] ? SLOTS[focus.i].title : ''; label.classList.add('show');
      if (el) { const wrap = el.offsetParent; const off = el.offsetLeft + el.offsetWidth / 2 - wrap.offsetWidth / 2; label.style.transform = `translateX(${off}px)`; }
      hint.classList.add('show'); clearTimeout(idleT); idleT = setTimeout(() => { hint.classList.remove('show'); label.classList.remove('show'); }, 6000);
    } else { label.classList.remove('show'); hint.classList.remove('show'); }
    if (focus.area === 'corner') { const c = cornerItems(); focus.i = Math.min(focus.i, c.length - 1); $(c[focus.i]).classList.add('focus'); }
    if (focus.area === 'drawer' && drawerItems[focus.i]) {
      const el = drawerItems[focus.i].el; el.classList.add('focus');
      const inner = $('drawerInner'), top = el.offsetTop - inner.offsetTop;
      inner.style.transform = `translateY(${-Math.max(0, top - 300)}px)`;
    }
  }
  function moveDrawer(dx, dy) {
    const n = drawerItems.length; if (!n) return;
    const cur = drawerItems[focus.i].el, grid = cur.parentElement, items = [...grid.children], idx = items.indexOf(cur);
    if (dx) { const ni = focus.i + dx; if (ni >= 0 && ni < n) focus.i = ni; }
    if (dy) {
      let target = idx + dy * COLS;
      if (target >= 0 && target < items.length) focus.i = +items[target].dataset.k;
      else {
        const grids = [...$('drawerInner').querySelectorAll('.grid')], gi = grids.indexOf(grid), ng = grids[gi + dy];
        if (ng) { const ch = [...ng.children], col = idx % COLS; focus.i = +(dy > 0 ? ch[Math.min(col, ch.length - 1)] : ch[Math.min(ch.length - 1, Math.floor((ch.length - 1) / COLS) * COLS + col)]).dataset.k; }
        else if (dy < 0 && drawerMode === 'apps') { closeDrawer(); return; }
      }
    }
    paintFocus();
  }

  let pressT = null, longFired = false, pressing = false;
  function onOk() {
    if (focus.area === 'dock') openSlot(focus.i);
    else if (focus.area === 'corner') {
      if (cornerItems()[focus.i] === 'btnUpdate') { toast('Descargando la versión nueva…', 6000); NATIVE.installUpdate(); }
      else if (homeOk()) NATIVE.openSettings(); else NATIVE.openHomeSetup();
    }
    else if (focus.area === 'drawer') activateDrawer(focus.i);
  }
  function onLong() { if (focus.area === 'dock') openDrawer('pick', focus.i); }

  const OK_KEYS = ['Enter', 'NumpadEnter', ' '];
  addEventListener('keydown', e => {
    const k = e.key;
    HZScene.hold(500);
    if (OK_KEYS.includes(k) || e.keyCode === 23 || e.keyCode === 13) {
      e.preventDefault();
      if (!pressing) { pressing = true; longFired = false; pressT = setTimeout(() => { longFired = true; onLong(); }, 650); }
      return;
    }
    if (k === 'Escape' || k === 'Backspace' || k === 'GoBack' || k === 'BrowserBack') { e.preventDefault(); window.hzBack(); return; }
    if (k === 'ContextMenu' || k === 'm') { onLong(); return; }
    const dx = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0, dy = k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : 0;
    if (!dx && !dy) return;
    e.preventDefault();
    if (focus.area === 'drawer') return moveDrawer(dx, dy);
    if (focus.area === 'dock') {
      if (dx) focus.i = Math.max(0, Math.min(SLOTS.length - 1, focus.i + dx));
      if (dy > 0) return openDrawer('apps');
      if (dy < 0) focus = { area: 'corner', i: 0 };
    } else if (focus.area === 'corner') {
      const n = cornerItems().length;
      if (dy > 0) focus = { area: 'dock', i: SLOTS.length - 1 };
      else if (dx < 0) { if (focus.i > 0) focus.i--; else focus = { area: 'dock', i: SLOTS.length - 1 }; }
      else if (dx > 0 && focus.i < n - 1) focus.i++;
    }
    paintFocus();
  });
  addEventListener('keyup', e => {
    if (OK_KEYS.includes(e.key) || e.keyCode === 23 || e.keyCode === 13) {
      e.preventDefault(); clearTimeout(pressT);
      if (pressing && !longFired) onOk();
      pressing = false;
    }
  });

  // Llamadas desde Android
  window.hzBack = () => { if (mode === 'drawer') { closeDrawer(); return true; } focus = { area: 'dock', i: bestSlot() }; paintFocus(); return false; };
  window.hzResume = () => {
    syncIcons(false);
    loadApps(); resolveSlots(); renderDock();
    if (mode === 'drawer') closeDrawer();
    focus = { area: 'dock', i: bestSlot() }; paintFocus();
    homeReminder();
  };
  window.hzMenu = () => onLong();
  // Android avisa cuando hay un APK nuevo en GitHub
  const cornerItems = () => updateReady ? ['btnUpdate', 'btnSettings'] : ['btnSettings'];
  let updateReady = false;
  window.hzUpdateAvailable = (tag) => {
    if (updateReady) return;
    updateReady = true; const b = $('btnUpdate'); b.style.display = ''; b.classList.add('new');
    toast('Hay una versión nueva de Horizonte: sube a ⬇ y pulsa OK', 9000);
  };
  window.hzInputsChanged = () => { HDMI = safe(() => JSON.parse(NATIVE.hdmiInputs()), HDMI); resolveSlots(); renderDock(); };

  loadApps(); resolveSlots(); renderDock();
  focus = { area: 'dock', i: bestSlot() }; paintFocus();
  setTimeout(homeReminder, 1500);
  setTimeout(() => syncIcons(true), 2500);
  if (qs.get('update')) setTimeout(() => window.hzUpdateAvailable('v9'), 1200);
  if (qs.get('drawer')) openDrawer(qs.get('drawer') === 'pick' ? 'pick' : 'apps', 3);
})();
