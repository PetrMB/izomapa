// Doplněk „Vzpomínkový přelet“: historický letoun (zatím Vickers Wellington) občas přeletí po přímé trase nad městem
// na počest místního letce (assets/doplnky/vzpominkovy_prelet.json). Nad letounem je štítek se jménem, klik na něj
// otevře kartu s příběhem; tlačítko v liště spustí přelet hned a pohled jede za letounem (sledování zruší × nebo
// posunutí mapy). Trasa se na obou koncích prodlouží o 3,5 km, aby letoun přilétal a odlétal mimo pohled.
// Kreslí se jako vozidla mapy: kvádry stínované sluncem od jihovýchodu, obrys 1 px, cache podle směru (48 směrů).
(() => {
  const ID = 'vzpominkovy_prelet';
  const Izomapa = window.Izomapa;
  if (!Izomapa) return;
  let unsub = null, unclick = null;
  const NDIR = 48, PRODLOUZENI = 3500, NAJEZD = 1800;
  const SUNV = (() => { const v = [0.38, -0.68, 0.62], n = Math.hypot(...v); return v.map((q) => q / n); })();
  const lit = (rgb, d) => { const f = (0.62 + 0.42 * Math.max(0, d)) / 0.88; return `rgb(${rgb.map((q) => Math.min(255, Math.round(q * f))).join(',')})`; };
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  // rozměry letounu [m] pro stín a klikací plochu
  const TYPY = { wellington: { len: 19.7, span: 26.3 } };

  Izomapa.registerPlugin(ID, {
    onInit(api) {
      const D = api.getPluginData(ID);
      if (!D) return;
      const toImg = api.toImg, gz = api.gz, T = TYPY[D.letoun] || TYPY.wellington;
      const body = D.trasa.map((q) => api.latLonToWorld(q[0], q[1]));
      const smer = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
      const d0 = smer(body[1], body[0]), d1 = smer(body[body.length - 2], body[body.length - 1]);
      const cesta = [[body[0][0] + d0[0] * PRODLOUZENI, body[0][1] + d0[1] * PRODLOUZENI, D.vyska + 40], ...body.map((b) => [b[0], b[1], D.vyska]),
        [body[body.length - 1][0] + d1[0] * PRODLOUZENI, body[body.length - 1][1] + d1[1] * PRODLOUZENI, D.vyska + 40]];
      function let_(zpet) {
        const pts = zpet ? [...cesta].reverse() : cesta, len = [0];
        for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
        return { pts, len, L: len[len.length - 1] };
      }
      const P = { m: null, s: 0, zpet: true, wait: 120 + rnd(Date.now() % 997) * 240, follow: false, last: null, scr: null };
      const pose = () => {
        const m = P.m; let i = 1; while (i < m.len.length - 1 && m.len[i] < P.s) i++;
        const a = m.pts[i - 1], b = m.pts[i], f = Math.max(0, Math.min(1, (P.s - m.len[i - 1]) / ((m.len[i] - m.len[i - 1]) || 1)));
        return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, z: a[2] + (b[2] - a[2]) * f, dx: b[0] - a[0], dy: b[1] - a[1] };
      };
      const start = (najezd) => { P.zpet = !P.zpet; P.m = let_(P.zpet); P.s = najezd ? Math.max(0, P.m.len[1] - NAJEZD) : 0; };

      // ---------- sprite ----------
      const SPR = new Map();
      function sprite(k) {
        if (SPR.has(k)) return SPR.get(k);
        const a = k / NDIR * Math.PI * 2, fx = Math.cos(a), fy = Math.sin(a), sxv = -fy, syv = fx;
        const O = toImg(0, 0, 0), R = (s, t, h) => { const p = toImg(fx * s + sxv * t, fy * s + syv * t, h); return [p[0] - O[0], p[1] - O[1]]; };
        const faces = [], vis = (nx, ny) => nx + ny < 0, sun = (nx, ny, nz) => nx * SUNV[0] + ny * SUNV[1] + nz * SUNV[2];
        const box = (s0, s1, t0, t1, z0, z1, rgb, top) => {
          for (const [nx, ny, P0, P1] of [[fx, fy, [s1, t0], [s1, t1]], [-fx, -fy, [s0, t1], [s0, t0]], [sxv, syv, [s1, t1], [s0, t1]], [-sxv, -syv, [s0, t0], [s1, t0]]])
            if (vis(nx, ny)) faces.push([[R(P0[0], P0[1], z0), R(P1[0], P1[1], z0), R(P1[0], P1[1], z1), R(P0[0], P0[1], z1)], lit(rgb, sun(nx, ny, 0)), (z0 + z1) / 2]);
          faces.push([[R(s0, t0, z1), R(s1, t0, z1), R(s1, t1, z1), R(s0, t1, z1)], lit(top || rgb, sun(0, 0, 1)), z1]);
        };
        const l = T.len / 2;
        // Vickers Wellington: středoplošník se dvěma motory, prosklená příďová a ocasní věž. Noční bombardér RAF: shora
        // tmavě zelená a hnědá (dark green / dark earth), boky a spodek černé, výsostné znaky na křídlech.
        const GR = [70, 80, 54], ER = [112, 94, 64], BK = [34, 34, 38], BLU = [44, 60, 116], RED = [156, 44, 40], GLs = [96, 118, 140], DK = [44, 46, 50];
        box(-l + 1.2, l - 1.6, -0.9, 0.9, 0.2, 2.5, BK, GR);                                   // trup
        box(l - 1.6, l, -0.7, 0.7, 0.6, 2.2, GLs);                                              // příďová věž
        box(-l, -l + 1.2, -0.6, 0.6, 0.7, 2.0, GLs);                                            // ocasní věž
        box(l - 4.2, l - 2.6, -0.6, 0.6, 2.5, 2.8, GLs);                                        // kokpit
        box(0.0, 4.2, -6.2, 6.2, 1.2, 1.55, BK, ER);                                            // centroplán
        for (const e of [-1, 1]) {
          box(0.6, 3.4, e > 0 ? 6.2 : -13.15, e > 0 ? 13.15 : -6.2, 1.25, 1.5, BK, e > 0 ? GR : ER);   // vnější (zúžená) křídla
          box(1.4, 3.0, e * 9.6 - 1.0, e * 9.6 + 1.0, 1.5, 1.53, BLU); box(1.9, 2.5, e * 9.6 - 0.4, e * 9.6 + 0.4, 1.53, 1.56, RED);   // výsostné znaky
          box(1.6, 6.4, e * 3.7 - 0.7, e * 3.7 + 0.7, 0.6, 1.9, BK, e > 0 ? ER : GR);           // motorové gondoly
          box(6.4, 6.5, e * 3.7 - 1.8, e * 3.7 + 1.8, 1.2, 1.35, DK);                           // vrtule
        }
        box(-l + 0.6, -l + 3.0, -5.1, 5.1, 1.7, 1.9, BK, GR);                                   // vodorovné ocasní plochy
        box(-l + 0.4, -l + 3.4, -0.12, 0.12, 1.9, 5.3, BK, ER);                                 // kýlovka
        box(-l + 2.0, -l + 3.0, -0.13, 0.13, 3.6, 4.6, [180, 50, 44]);                          // znak na kýlovce (zjednodušeně)
        faces.sort((p, q) => p[2] - q[2]);
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const [pts] of faces) for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        x0 = Math.floor(x0) - 1; y0 = Math.floor(y0) - 1;
        const cw = Math.ceil(x1) - x0 + 2, chh = Math.ceil(y1) - y0 + 2, cv = document.createElement('canvas'); cv.width = cw; cv.height = chh;
        const g = cv.getContext('2d');
        for (const [pts, fill] of faces) { g.fillStyle = fill; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x - x0, y - y0) : g.moveTo(x - x0, y - y0))); g.closePath(); g.fill(); }
        const im = g.getImageData(0, 0, cw, chh), d = im.data, solid = new Uint8Array(cw * chh);   // ostré okraje a tmavý obrys jako vozidla
        for (let i = 0; i < cw * chh; i++) { solid[i] = d[i * 4 + 3] >= 110 ? 1 : 0; d[i * 4 + 3] = solid[i] ? 255 : 0; }
        for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) {
          const i = y * cw + x; if (solid[i]) continue;
          if ((x > 0 && solid[i - 1]) || (x < cw - 1 && solid[i + 1]) || (y > 0 && solid[i - cw]) || (y < chh - 1 && solid[i + cw])) d.set([27, 28, 34, 255], i * 4);
        }
        g.putImageData(im, 0, 0);
        const spr = { c: cv, x0, y0 }; SPR.set(k, spr); return spr;
      }

      // ---------- rozhraní: tlačítko v liště, karta s příběhem, lišta sledování ----------
      const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
      const btn = el('button', 'px-btn vp-btn', '✈'); btn.type = 'button'; btn.title = D.tlacitko; btn.setAttribute('aria-label', D.tlacitko);
      (api.getUiSlot('sidebar-tabs') || document.body).appendChild(btn);
      const karta = el('section', 'vp-karta'); karta.hidden = true; karta.setAttribute('aria-live', 'polite');
      const zavri = el('button', 'vp-x', '×'); zavri.type = 'button'; zavri.setAttribute('aria-label', 'Zavřít');
      const h = el('h3', null, D.pribeh.titulek), p = el('p', null, D.pribeh.text), dl = el('dl');
      for (const [k, v] of D.pribeh.radky) dl.append(el('dt', null, k), el('dd', null, v));
      const stav = el('p', 'vp-stav'), akce = el('p', 'vp-akce');
      const sled = el('button', 'px-btn', ''); sled.type = 'button';
      akce.appendChild(sled);
      if (D.pribeh.zdroj) { const a = el('a', null, 'Zdroj příběhu'); a.href = D.pribeh.zdroj; a.target = '_blank'; a.rel = 'noopener noreferrer'; akce.appendChild(a); }
      karta.append(zavri, h); if (D.pribeh.text) karta.appendChild(p);
      karta.append(dl, stav, akce);
      const lista = el('div', 'vp-lista'); lista.hidden = true;
      const listaTxt = el('span', null, ''), listaX = el('button', 'vp-x', '×'); listaX.type = 'button'; listaX.setAttribute('aria-label', 'Přestat sledovat');
      lista.append(listaTxt, listaX);
      document.body.append(karta, lista);
      const popis = () => {
        if (!P.m) { const min = Math.max(1, Math.round(P.wait / 60)); return `Letoun teď není nad mapou, další přelet asi za ${min} min.`; }
        return P.follow ? 'Letoun právě přelétá, pohled ho sleduje.' : 'Letoun právě přelétá nad mapou.';
      };
      const obnov = () => {
        stav.textContent = popis();
        sled.textContent = P.follow ? 'Přestat sledovat' : P.m ? 'Sledovat letoun' : 'Spustit přelet';
        lista.hidden = !P.follow;
        if (P.follow) { listaTxt.replaceChildren(el('b', null, `✈️ ${D.nazev}`), ' · pohled sleduje letoun'); }
      };
      const sledovat = (ano) => { P.follow = ano; P.last = null; obnov(); };
      const spustit = () => {                                     // přelet hned, kousek před první body trasy, a sledovat
        if (!P.m) start(true);
        sledovat(true);
        const o = pose(), [ix, iy] = toImg(o.x, o.y, gz(o.x, o.y) + o.z), cam = api.getCam();
        api.panTo(ix, iy, cam.w / 1600, true);                     // ~1600 px obrazu na šířku okna: letoun i okolí
      };
      const ukaz = () => { karta.hidden = false; obnov(); };
      btn.addEventListener('click', () => { spustit(); ukaz(); });
      sled.addEventListener('click', () => { if (P.follow) sledovat(false); else spustit(); });
      zavri.addEventListener('click', () => { karta.hidden = true; });
      listaX.addEventListener('click', () => sledovat(false));
      unclick = api.onMapClick((e) => {
        if (!P.scr || Math.hypot(P.scr[0] - e.screenX, P.scr[1] - e.screenY) > P.scr[2]) return false;
        ukaz(); return true;
      }, { priority: 5 });

      // ---------- let a kreslení ----------
      let tObnov = 0;
      unsub = api.onFrame((ctx, view, t) => {
        const dt = Math.min(0.1, view.dt || 0);
        P.scr = null;
        if (!P.m) {
          if (D.jen_ve_dne && view.night > 0.45) return;
          P.wait -= dt;
          if (P.wait > 0) { if (!karta.hidden && (tObnov -= dt) < 0) { tObnov = 5; obnov(); } return; }
          start(false);
        }
        P.s += D.rychlost * dt;
        if (P.s >= P.m.L) {
          P.m = null; P.wait = D.interval[0] + rnd(t) * (D.interval[1] - D.interval[0]);
          if (P.follow) { P.follow = false; listaTxt.textContent = 'Letoun odletěl.'; lista.hidden = false; setTimeout(() => { if (!P.follow) lista.hidden = true; }, 4000); }
          if (!karta.hidden) obnov();
          return;
        }
        const o = pose(), g = gz(o.x, o.y), [ix, iy] = toImg(o.x, o.y, g + o.z);
        if (P.follow) {                                           // posunul-li uživatel mapu, sledování skončí
          const v = api.getView();
          if (P.last && Math.hypot(v.x - P.last[0], v.y - P.last[1]) > 6 / Math.max(0.05, view.sx)) sledovat(false);
          else { api.panTo(ix, iy, undefined, false); P.last = [ix, iy]; }
        }
        if (view.sx <= 0.08 || !view.vis(ix, iy, 300)) return;
        const { sx, ox, oy } = view;
        const a = Math.max(0, 0.3 * (1 - o.z / 320));             // stín na zemi, slábne s výškou
        if (a > 0.02) {
          const sh = [-SUNV[0] / SUNV[2] * o.z, -SUNV[1] / SUNV[2] * o.z], L = Math.hypot(o.dx, o.dy) || 1, fx = o.dx / L, fy = o.dy / L;
          const Q = (s, tt) => { const x = o.x + sh[0] + fx * s - fy * tt, y = o.y + sh[1] + fy * s + fx * tt, q = toImg(x, y, gz(x, y)); return [ox + q[0] * sx, oy + q[1] * sx]; };
          ctx.fillStyle = `rgba(20,26,30,${a.toFixed(2)})`;
          for (const r of [[-T.len / 2, T.len / 2, -0.9, 0.9], [0.6, 3.4, -T.span / 2, T.span / 2], [-T.len / 2 + 0.6, -T.len / 2 + 3, -5.1, 5.1]]) {
            ctx.beginPath(); [Q(r[0], r[2]), Q(r[1], r[2]), Q(r[1], r[3]), Q(r[0], r[3])].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.fill();
          }
        }
        const k = ((Math.round(Math.atan2(o.dy, o.dx) / (Math.PI * 2) * NDIR) % NDIR) + NDIR) % NDIR, spr = sprite(k);
        ctx.drawImage(spr.c, Math.round(ox + (ix + spr.x0) * sx), Math.round(oy + (iy + spr.y0) * sx), Math.round(spr.c.width * sx), Math.round(spr.c.height * sx));
        const X = Math.round(ox + ix * sx), Y = Math.round(oy + iy * sx);
        P.scr = [X, Y, Math.max(24, T.span * 0.6 * sx)];
        ctx.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';   // štítek
        const txt = `✈️ ${D.stitek}`, tw = Math.ceil(ctx.measureText(txt).width) + 12, ty = Y - Math.round(14 * sx) - 16;
        ctx.fillStyle = 'rgba(22, 25, 31, 0.88)'; ctx.fillRect(X - tw / 2, ty - 10, tw, 20);
        if (P.follow) { ctx.strokeStyle = '#f2c66d'; ctx.lineWidth = 1.5; ctx.strokeRect(X - tw / 2, ty - 10, tw, 20); }
        ctx.fillStyle = P.follow ? '#f2c66d' : '#f3efe2'; ctx.fillText(txt, X, ty + 1);
      }, { layer: 'sky' });
    },
    onDestroy() { if (unsub) unsub(); if (unclick) unclick(); },
  });
})();
