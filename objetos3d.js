/* objetos3d.js · biblioteca de objetos 3D da Planta (Three.js)
   Só peças GENÉRICAS (cama, armário, maca, tanque, figura humana…). O que existe em cada sala
   vem do arquivo de cenas (salas-3d.json), que fica fora do GitHub.
   Usado por sala3d.js (o visualizador) e tokens3d.js (os tokens). */
(() => {
  'use strict';
  /* ================= utilidades de desenho ================= */
  function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

  function criarFabrica(T, anim, luzes, descartes, op = {}) {
    const ALT = op.alt || 3.0;
    const cacheM = new Map(), cacheT = new Map();
    const guardar = x => { descartes.push(x); return x; };
    const texCanvas = (c, rep) => { const t = guardar(new T.CanvasTexture(c)); t.encoding = T.sRGBEncoding; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };

    // texturas de superfície geradas na hora (nada de imagem externa)
    function texturaBase(tipo, cor, rep) {
      const k = tipo + cor + (rep || '');
      if (cacheT.has(k)) return cacheT.get(k);
      const [c, x] = tela(256, 256), r = rng(tipo.length * 31 + cor.length);
      x.fillStyle = cor; x.fillRect(0, 0, 256, 256);
      const ruido = (n, a, tam) => { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${a * r()})`; x.fillRect(r() * 256, r() * 256, tam, tam); } };
      if (tipo === 'azulejo' || tipo === 'xadrez' || tipo === 'xadrez_pb') {
        if (tipo === 'xadrez') { x.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) x.fillRect(i * 64, j * 64, 64, 64); }
        if (tipo === 'xadrez_pb') { x.fillStyle = 'rgba(8,8,8,.9)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) x.fillRect(i * 64, j * 64, 64, 64); for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(40,30,20,${.05 + r() * .12})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, 6 + r() * 30, 4 + r() * 18, r() * 3, 0, 7); x.fill(); } }
        ruido(900, .05, 2);
        x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 3;
        for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
      } else if (tipo === 'concreto') { ruido(5000, .09, 2); ruido(60, .05, 18); }
      else if (tipo === 'metal') {
        ruido(2500, .05, 2); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.strokeRect(2, 2, 252, 252);
        x.fillStyle = 'rgba(0,0,0,.4)'; [[12, 12], [244, 12], [12, 244], [244, 244]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 4, 0, 7); x.fill(); });
      } else if (tipo === 'carpete') ruido(9000, .07, 1);
      else if (tipo === 'madeira') { for (let i = 0; i < 256; i += 32) { x.fillStyle = `rgba(0,0,0,${.08 + r() * .1})`; x.fillRect(0, i, 256, 2); } ruido(1500, .04, 3); }
      else if (tipo === 'acolchoado') {
        x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 3;
        for (let i = -256; i < 512; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 256, 256); x.stroke(); x.beginPath(); x.moveTo(i + 256, 0); x.lineTo(i, 256); x.stroke(); }
        x.fillStyle = 'rgba(0,0,0,.45)'; for (let i = 0; i <= 256; i += 64) for (let j = 32; j <= 256; j += 64) { x.beginPath(); x.arc(i, j, 4, 0, 7); x.fill(); x.beginPath(); x.arc(i + 32, j - 32, 4, 0, 7); x.fill(); }
      } else if (tipo === 'espuma') { x.fillStyle = 'rgba(0,0,0,.4)'; for (let i = 0; i < 256; i += 32) for (let j = 0; j < 256; j += 32) { x.beginPath(); x.moveTo(i, j + 32); x.lineTo(i + 16, j); x.lineTo(i + 32, j + 32); x.fill(); } }
      else ruido(1200, .04, 2);
      const t = texCanvas(c, rep || [1, 1]);
      cacheT.set(k, t); return t;
    }

    // material com cache: m('#888', { r: rugosidade, me: metal, e: cor emissiva, ei, op, tex, rep, lado })
    function m(cor, o = {}) {
      const k = cor + JSON.stringify(o);
      if (cacheM.has(k) && !o.unico) return cacheM.get(k);
      const p = { color: new T.Color(cor), roughness: o.r ?? .8, metalness: o.me ?? 0 };
      if (o.e) { p.emissive = new T.Color(o.e); p.emissiveIntensity = o.ei ?? 1; }
      if (o.op !== undefined) { p.transparent = true; p.opacity = o.op; p.depthWrite = o.op > .6; }
      if (o.tex) p.map = textura(o.tex, cor, o.rep);
      if (o.mapa) p.map = o.mapa;
      if (o.lado === 2) p.side = T.DoubleSide;
      const mat = guardar(new T.MeshStandardMaterial(p));
      if (!o.unico) cacheM.set(k, mat);
      return mat;
    }

    // texto em textura (placas, quadros, telas)
    function textoTex(linhas, o = {}) {
      const [c, x] = tela(o.w || 512, o.h || 256);
      if (o.fundo) { x.fillStyle = o.fundo; x.fillRect(0, 0, c.width, c.height); }
      const L = String(linhas).split('\n');
      const tam = o.tam || Math.min(c.height / (L.length * 1.35), 64);
      x.font = `${o.peso || 'bold'} ${tam}px ${o.fonte || 'Arial, Helvetica, sans-serif'}`;
      x.fillStyle = o.cor || '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      if (o.brilho) { x.shadowColor = o.cor || '#fff'; x.shadowBlur = tam * .5; }
      const alt = tam * 1.3, y0 = c.height / 2 - (L.length - 1) * alt / 2;
      L.forEach((l, i) => {
        let tt = tam; while (x.measureText(l).width > c.width * .92 && tt > 8) { tt -= 2; x.font = `${o.peso || 'bold'} ${tt}px ${o.fonte || 'Arial, Helvetica, sans-serif'}`; }
        x.fillText(l, c.width / 2 + (o.tremido ? (Math.random() - .5) * 3 : 0), y0 + i * alt);
      });
      return texCanvas(c);
    }

    // peças básicas: a altura "y" é sempre a BASE do objeto
    const G = () => new T.Group();
    function bx(pai, w, h, d, mat, x = 0, y = 0, z = 0) { const me = new T.Mesh(guardar(new T.BoxGeometry(w, h, d)), mat); me.position.set(x, y + h / 2, z); pai.add(me); return me; }
    function cy(pai, rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 16) { const me = new T.Mesh(guardar(new T.CylinderGeometry(rt, rb, h, seg)), mat); me.position.set(x, y + h / 2, z); pai.add(me); return me; }
    function sf(pai, r, mat, x = 0, y = 0, z = 0, seg = 16) { const me = new T.Mesh(guardar(new T.SphereGeometry(r, seg, Math.max(8, seg * .75))), mat); me.position.set(x, y, z); pai.add(me); return me; }
    function pl(pai, w, h, mat, x = 0, y = 0, z = 0) { const me = new T.Mesh(guardar(new T.PlaneGeometry(w, h)), mat); me.position.set(x, y, z); pai.add(me); return me; }
    function luz(pai, cor, int, dist, x, y, z, pisca) {
      const l = new T.PointLight(cor, int, dist, 2); l.position.set(x, y, z); pai.add(l); luzes.push(l);
      if (pisca) { const base = int, r = rng(Math.round(x * 100 + z * 7)); anim.push((dt, t) => { l.intensity = base * (pisca === 'vela' ? .82 + .18 * Math.sin(t * 9 + Math.sin(t * 23)) * r() : (Math.sin(t * 3.1) > .93 || r() < .015 ? .15 : 1)); }); }
      return l;
    }

    const cores = ['#c0392b', '#2e86de', '#f1c40f', '#27ae60', '#e67e22', '#8e44ad', '#ecf0f1', '#16a085'];
    const metal = (c = '#8a8f96') => m(c, { r: .45, me: .7 });

    /* ---------- biblioteca de objetos (genéricos: o que cada sala tem vem do arquivo da cena) ---------- */
    const P = {
      porta(o) { const g = G(); const w = o.w || 1.1; bx(g, w + .16, .08, .14, m('#3a3a3a'), 0, 2.1, 0); bx(g, .08, 2.18, .14, m('#3a3a3a'), -w / 2 - .04); bx(g, .08, 2.18, .14, m('#3a3a3a'), w / 2 + .04); bx(g, w, 2.1, .05, m(o.c || '#5b5f66', { r: .6, me: .3 }), 0, 0, .02); cy(g, .03, .03, .14, metal('#bbb'), w / 2 - .12, 1.0, .08, 8).rotation.x = Math.PI / 2; return g; },
      placa(o) {
        const g = G(); const w = o.w || 1.6, h = o.h || .5;
        const mat = m('#ffffff', { unico: true, mapa: textoTex(o.txt || '', { w: 512, h: Math.round(512 * h / w), cor: o.c || '#fff', fundo: o.f || 'rgba(0,0,0,0)', brilho: !!o.neon, tam: o.tam }), r: .9 });
        mat.transparent = !o.f;
        if (o.neon) { mat.emissive = new T.Color('#ffffff'); mat.emissiveMap = mat.map; mat.emissiveIntensity = 1.2; }
        const y = o.y ?? 2.2;
        pl(g, w, h, mat, 0, y + h / 2, .01);
        if (o.f) bx(g, w + .04, h + .04, .03, m('#222'), 0, y - .02, -.02);
        if (o.pisca) { const r = rng(w * 100); anim.push((dt, t) => { mat.emissiveIntensity = (Math.sin(t * 2.3) > .8 && r() < .3) || r() < .02 ? .1 : 1.2; }); }
        if (o.neon) luz(g, o.c || '#fff', .6, 3, 0, y + h / 2, .4, o.pisca);
        return g;
      },
      prateleira(o) {
        const g = G(), r = rng(o.sem || 1), w = o.w || 1.8;
        bx(g, w, 1.6, .06, m('#d5d8dc', { r: .5, me: .3 }), 0, 0, -.22);
        for (let i = 0; i < 4; i++) { const y = .1 + i * .45; bx(g, w, .03, .45, m('#bdc3c7', { r: .5, me: .4 }), 0, y, 0);
          for (let x = -w / 2 + .1; x < w / 2 - .08; x += .16 + r() * .08) { const hh = .12 + r() * .2; bx(g, .12, hh, .2 + r() * .15, m(cores[Math.floor(r() * cores.length)], { r: .6 }), x, y + .03, .02); } }
        return g;
      },
      freezer(o) { const g = G(); bx(g, 1.4, .85, .7, m('#f4f6f7', { r: .4 })); bx(g, 1.34, .04, .64, m('#9fd8ff', { op: .35, r: .1 }), 0, .85); pl(g, 1.3, .6, m('#bfe9ff', { e: '#bfe9ff', ei: .6 }), 0, .5, .36); luz(g, '#bfe9ff', .4, 2, 0, 1, .4); return g; },
      balcao(o) { const g = G(); const w = o.w || 2.2; bx(g, w, .95, .6, m(o.c || '#7f8c8d', { r: .6 })); bx(g, w + .1, .05, .7, m('#2c3e50', { r: .4 }), 0, .95);
        if (o.caixa) { bx(g, .4, .18, .35, m('#1c1c1c', { r: .5 }), -w / 4, 1.0); const t = bx(g, .3, .2, .03, m('#111', { e: '#2ecc71', ei: .4 }), -w / 4, 1.18, -.08); t.rotation.x = -.4; bx(g, .36, .07, .3, m('#2a2a2a'), -w / 4, .98, .3); for (let i = 0; i < 5; i++) cy(g, .02, .02, .01, m('#d4ac0d', { me: .8, r: .3 }), -w / 4 - .12 + i * .06, 1.0, .5, 10); }
        return g; },
      rack(o) {
        const g = G(); bx(g, .6, 2.0, .9, m('#151719', { r: .5, me: .4 }));
        const on = m('#111', { e: o.c || '#2ecc71', ei: 2 }), off = m('#0b0b0b');
        const r = rng(o.sem || 3), leds = [];
        for (let i = 0; i < 10; i++) { const l = bx(g, .05, .025, .01, on, -.2 + (i % 4) * .13, .3 + Math.floor(i / 4) * .55 + r() * .3, .455); leds.push([l, r() * 6, .6 + r() * 2]); }
        anim.push((dt, t) => leds.forEach(([l, f, v]) => { l.material = Math.sin(t * v * 3 + f) > 0 ? on : off; }));
        return g;
      },
      grade(o) {
        const g = G(); const w = o.w || 4, h = o.h || 2.4;
        const [c, x] = tela(128, 128); x.clearRect(0, 0, 128, 128); x.strokeStyle = '#ccc'; x.lineWidth = 6;
        for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); }
        x.lineWidth = 4; x.beginPath(); x.moveTo(0, 64); x.lineTo(128, 64); x.stroke();
        const t = texCanvas(c, [w * 2, h * 2]);
        const mat = m('#9aa0a6', { unico: true, mapa: t, me: .7, r: .4, lado: 2 }); mat.alphaTest = .5; mat.alphaMap = t;
        pl(g, w, h, mat, 0, h / 2, 0); return g;
      },
      mesa(o) { const g = G(); const w = o.w || 1.4, d = o.d || .7, c = m(o.c || '#6e5a44', { tex: o.tex || 'madeira' });
        bx(g, w, .04, d, c, 0, .72); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bx(g, .05, .72, .05, metal('#555'), a * (w / 2 - .06), 0, b * (d / 2 - .06))); return g; },
      crt(o) {
        const g = G(); const y = o.y ?? .76;
        bx(g, .46, .4, .42, m(o.casca || '#d8d2c0', { r: .6 }), 0, y, -.05);
        const telaTex = o.txt ? textoTex(o.txt, { w: 256, h: 192, cor: o.c || '#33ff66', fundo: '#03140a', tam: 22, fonte: 'Courier New, monospace', brilho: true }) : null;
        const tm = m('#000', { unico: true, e: o.c || '#33ff66', ei: telaTex ? 1 : .55, mapa: telaTex }); if (telaTex) tm.emissiveMap = telaTex;
        pl(g, .36, .28, tm, 0, y + .2, .166);
        bx(g, .44, .03, .16, m('#cfc9b6'), 0, y, .3);
        return g;
      },
      mural(o) {
        const g = G(), r = rng(o.sem || 5), n = o.n || 14, w = o.w || 3, h = o.h || 1.6;
        const [c, x] = tela(128, 160); x.fillStyle = '#f2efe6'; x.fillRect(0, 0, 128, 160); x.fillStyle = '#333'; x.font = '12px monospace';
        for (let i = 0; i < 11; i++) x.fillText(Array.from({ length: 12 }, () => '◇△⊗∴§¶#%&@ΣΩ'[Math.floor(r() * 13)]).join(''), 8, 18 + i * 13);
        const mat = m('#ffffff', { unico: true, mapa: texCanvas(c), r: .95 });
        for (let i = 0; i < n; i++) { const p = pl(g, .3, .38, mat, (r() - .5) * w, .4 + r() * h, .005 + i * .001); p.rotation.z = (r() - .5) * .25; }
        return g;
      },
      painel(o) {
        const g = G(); bx(g, .9, 1.9, .4, m(o.c || '#7b8a8b', { r: .5, me: .5 }));
        pl(g, .02, 1.7, m('#333'), 0, .95, .201);
        for (let i = 0; i < 3; i++) { const gm = cy(g, .07, .07, .02, m('#eee'), -.22 + i * .22, 1.45, .2, 20); gm.rotation.x = Math.PI / 2; }
        const r = rng(o.sem || 7), lamp = [];
        for (let i = 0; i < 4; i++) lamp.push([sf(g, .025, m('#111', { e: i % 2 ? '#e74c3c' : '#2ecc71', ei: 2 }), -.3 + i * .2, 1.2, .21, 8), r() * 9]);
        anim.push((dt, t) => lamp.forEach(([l, f]) => { l.visible = Math.sin(t * 2 + f) > -.3; }));
        return g;
      },
      cabos(o) {
        const g = G(), r = rng(o.sem || 9), n = o.n || 5, mat = m(o.c || '#1b1b1b', { r: .7 });
        for (let i = 0; i < n; i++) {
          const pts = []; let x = (r() - .5) * 2, z = (r() - .5) * 2;
          for (let k = 0; k < 6; k++) { pts.push(new T.Vector3(x, .05, z)); x += (r() - .5) * 1.6; z += (o.l || 1.2) * .6; }
          const me = new T.Mesh(guardar(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, .05 + r() * .03, 8)), mat); g.add(me);
        }
        return g;
      },
      cadeira_dentista(o) {
        const g = G(), couro = m(o.c || '#4aa3b5', { r: .45 }), cromo = metal('#c9cdd2'), tira = m('#2b1d14', { r: .6 });
        cy(g, .35, .4, .08, cromo); cy(g, .08, .08, .45, cromo, 0, .08);
        const corpo = G(); corpo.position.set(0, .55, 0); corpo.rotation.x = -.18; g.add(corpo);
        bx(corpo, .6, .14, .9, couro, 0, 0, .15); const enc = bx(corpo, .55, .9, .12, couro, 0, .1, -.32); enc.rotation.x = -.35; bx(corpo, .3, .2, .1, couro, 0, .95, -.65);
        bx(corpo, .5, .1, .6, couro, 0, -.05, .85).rotation.x = .5;
        [-1, 1].forEach(s => { bx(corpo, .1, .06, .6, couro, s * .36, .22, .1); bx(corpo, .12, .02, .08, tira, s * .36, .29, .2); bx(corpo, .12, .02, .08, tira, s * .36, .29, -.05); });
        bx(corpo, .5, .02, .08, tira, 0, .2, .7).rotation.x = .5;
        // braço com refletor
        cy(g, .03, .03, 1.7, cromo, .55, 0, -.4); const br = bx(g, .8, .04, .04, cromo, .2, 1.7, -.4); br.rotation.y = .4;
        const ref = cy(g, .18, .08, .12, m('#e8e8e8'), -.15, 1.55, -.25, 20); ref.rotation.x = .9;
        luz(g, '#fff6e0', .7, 3, -.15, 1.45, -.1);
        return g;
      },
      armario(o) { const g = G(); const w = o.w || 1, h = o.h || 2; bx(g, w, h, .5, m(o.c || '#e5e7e9', { r: .5, me: .2 })); pl(g, .015, h - .1, m('#555'), 0, h / 2, .251); [-1, 1].forEach(s => bx(g, .03, .18, .03, metal('#aaa'), s * .07, h * .55, .26)); return g; },
      radio(o) { const g = G(); const y = o.y ?? 0; bx(g, .32, .18, .1, m(o.c || '#2d2d2d'), 0, y); cy(g, .06, .06, .01, m('#666'), -.08, y + .08, .051, 16).rotation.x = Math.PI / 2; bx(g, .24, .02, .02, metal('#999'), 0, y + .22); return g; },
      maca(o) { const g = G(), aco = metal('#b8bcc2'); bx(g, 2, .06, .75, aco, 0, .82); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cy(g, .025, .025, .82, aco, a * .9, 0, b * .32, 8)); if (o.lencol) bx(g, 1.9, .03, .7, m(o.lencol), 0, .88); return g; },
      soro(o) {
        const g = G(), aco = metal('#c7cbd0'), n = o.n || 2;
        cy(g, .015, .015, 1.95, aco, 0, 0, 0, 8); [0, 1, 2, 3].forEach(i => { const p = bx(g, .5, .02, .03, aco, 0, .02, 0); p.rotation.y = i * Math.PI / 4; });
        bx(g, .5, .02, .02, aco, 0, 1.92);
        const sangue = m('#7a0c10', { op: .85, r: .25, e: '#3a0000', ei: .4 });
        for (let i = 0; i < n; i++) { const x = -.2 + i * (.4 / Math.max(1, n - 1)); bx(g, .12, .2, .05, sangue, x, 1.68); cy(g, .006, .006, 1.2, m('#9b1b1f', { op: .7 }), x, .48, 0, 6); }
        return g;
      },
      bomba(o) { const g = G(); const y = o.y ?? .9; bx(g, .32, .26, .22, m('#e8e8e8', { r: .5 }), 0, y); const tm = m('#000', { unico: true, e: o.c || '#e74c3c', ei: 1.4 }); pl(g, .2, .08, tm, 0, y + .17, .111); const r = rng(o.sem || 11); anim.push((dt, t) => { tm.emissiveIntensity = Math.sin(t * 4 + r() * .1) > 0 ? 1.4 : .3; }); return g; },
      ventilador(o) {
        const g = G(), v = o.v ?? 6, y = ALT - .05;
        cy(g, .03, .03, .5, metal('#444'), 0, y - .5); cy(g, .22, .22, .22, m('#2c2c2c', { me: .5, r: .4 }), 0, y - .72);
        const pas = G(); pas.position.set(0, y - .62, 0); g.add(pas);
        for (let i = 0; i < 4; i++) { const p = bx(pas, 1.2, .02, .24, m(o.c || '#6d7176', { me: .5, r: .5 }), .7, 0, 0); p.position.x = Math.cos(i * Math.PI / 2) * .7; p.position.z = Math.sin(i * Math.PI / 2) * .7; p.rotation.y = -i * Math.PI / 2; p.rotation.x = .25; }
        anim.push(dt => { pas.rotation.y += v * dt; });
        return g;
      },
      estante(o) {
        const g = G(), r = rng(o.sem || 13), w = o.w || 2, h = o.h || 3;
        [-1, 1].forEach(s => bx(g, .05, h, .5, metal('#5d6d7e'), s * (w / 2 - .025)));
        for (let i = 0; i < 6; i++) { const y = .05 + i * (h - .1) / 5.6; bx(g, w, .03, .5, metal('#5d6d7e'), 0, y);
          for (let x = -w / 2 + .17; x < w / 2 - .1; x += .32) { if (r() < .12) continue; const cx = bx(g, .3, .3, .4, m('#c8b48a', { r: .9 }), x, y + .03, 0); cx.rotation.y = (r() - .5) * .1; pl(g, .16, .05, m('#f5f5f0'), x, y + .2, .201); } }
        return g;
      },
      canos(o) {
        const g = G(), mat = m(o.c || '#7b3f2a', { me: .6, r: .45 }), n = o.n || 3, l = o.l || 8;
        for (let i = 0; i < n; i++) { const c = cy(g, .1, .1, l, mat, 0, 0, 0, 14); c.rotation.z = Math.PI / 2; c.position.set(0, .6 + i * .55, 0); for (let k = -l / 2 + .5; k < l / 2; k += 1.5) cy(g, .13, .13, .08, mat, k, .6 + i * .55 - .04, 0, 14).rotation.z = Math.PI / 2; }
        return g;
      },
      gotas(o) {
        const g = G(), r = rng(o.sem || 15), n = o.n || 8, w = o.w || 6, mat = m('#6b0a0a', { r: .2, e: '#2a0000', ei: .6, op: .9 });
        for (let i = 0; i < n; i++) { const p = pl(g, .04 + r() * .04, 1, mat, (r() - .5) * w, 0, .01); const h0 = .5 + r() * 1.5, top = 1.6 + r() * 1.2, f = r() * 10;
          anim.push((dt, t) => { const k = ((t * .05 + f) % 1); p.scale.y = .1 + k * h0; p.position.y = top - p.scale.y / 2; }); }
        return g;
      },
      ralo(o) { const g = G(); const me = cy(g, .2, .2, .01, m('#1a1a1a', { me: .7, r: .4 }), 0, .001, 0, 20); for (let i = -2; i <= 2; i++) bx(g, .02, .012, .34, m('#444', { me: .8 }), i * .07, .006); return g; },
      turbina(o) {
        const g = G(), cas = m(o.c || '#6c7a89', { me: .6, r: .45 }), R = o.raio || 1.1;
        const corpo = new T.Mesh(guardar(new T.CylinderGeometry(R, R, 1.2, 32, 1, true)), m(o.c || '#6c7a89', { me: .6, r: .45, lado: 2 })); corpo.rotation.x = Math.PI / 2; corpo.position.y = R + .2; g.add(corpo);
        bx(g, .3, .3, .8, cas, -R * .6); bx(g, .3, .3, .8, cas, R * .6);
        const rotor = G(); rotor.position.set(0, R + .2, 0); g.add(rotor);
        cy(rotor, .2, .2, .5, m('#333', { me: .7 }), 0, -.25).rotation.x = Math.PI / 2;
        for (let i = 0; i < 7; i++) { const p = bx(rotor, .22, R * .9, .04, m('#9aa4ad', { me: .7, r: .35 }), 0, 0, 0); p.position.set(Math.cos(i / 7 * 6.283) * R * .48, Math.sin(i / 7 * 6.283) * R * .48, 0); p.rotation.z = i / 7 * 6.283 - Math.PI / 2; p.rotation.y = .45; }
        anim.push(dt => { rotor.rotation.z += (o.v ?? 9) * dt; });
        return g;
      },
      porta_dupla(o) { const g = G(), ferro = m('#3d4247', { me: .7, r: .55, tex: 'metal', rep: [2, 2] }); [-1, 1].forEach(s => bx(g, 1, 2.5, .1, ferro, s * .51)); bx(g, 2.3, .15, .2, m('#2a2d30', { me: .7 }), 0, 2.5); for (let i = 0; i < 8; i++) sf(g, .025, metal('#888'), -.9 + (i % 4) * .6, .4 + Math.floor(i / 4) * 1.6, .06, 6); return g; },
      helice(o) { const g = G(); const p = bx(g, .25, .04, 1.1, m('#9aa4ad', { me: .7, r: .4 })); p.rotation.y = o.r2 || .5; p.rotation.z = .15; return g; },
      carteira(o) { const g = G(), mad = m('#a67c52', { tex: 'madeira' }), ferro = metal('#3b3b3b');
        bx(g, .6, .03, .45, mad, 0, .72, -.05); bx(g, .4, .03, .38, mad, 0, .42, .38); bx(g, .4, .35, .03, mad, 0, .48, .58);
        [[-.27, -.22], [.27, -.22], [-.27, .12], [.27, .12]].forEach(([a, b]) => bx(g, .025, .72, .025, ferro, a, 0, b)); [[-.18, .25], [.18, .25], [-.18, .55], [.18, .55]].forEach(([a, b]) => bx(g, .025, .42, .025, ferro, a, 0, b)); return g; },
      quadro(o) {
        const g = G(); const w = o.w || 3.2, h = o.h || 1.3, y = o.y ?? .95;
        bx(g, w + .12, h + .12, .05, m('#5d4037', { tex: 'madeira' }), 0, y - .06);
        const mat = m('#ffffff', { unico: true, mapa: textoTex(o.txt || '', { w: 1024, h: Math.round(1024 * h / w), cor: o.c || '#e8e6dc', fundo: o.f || '#1f3b2a', peso: '600', fonte: '"Comic Sans MS", "Segoe Print", cursive', tam: o.tam }), r: .95 });
        pl(g, w, h, mat, 0, y + h / 2, .03); bx(g, w, .03, .08, m('#5d4037'), 0, y - .03, .06);
        return g;
      },
      relogio(o) {
        const g = G(); const y = o.y ?? 2.3, R = o.raio || .28;
        const face = cy(g, R, R, .05, m('#fafafa'), 0, y, 0, 32); face.rotation.x = Math.PI / 2; face.position.y = y;
        const aro = new T.Mesh(guardar(new T.TorusGeometry(R, .025, 8, 32)), m('#222')); aro.position.set(0, y, .03); g.add(aro);
        for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; bx(g, .015, .05, .01, m('#222'), Math.sin(a) * R * .82, y + Math.cos(a) * R * .82 - .025, .03).rotation.z = -a; }
        const hh = (o.hora || 0) % 12, mm = o.min || 0;
        const ponteiro = (comp, larg, ang) => { const p = G(); p.position.set(0, y, .04); p.rotation.z = -ang; bx(p, larg, comp, .01, m('#111'), 0, 0, 0); g.add(p); return p; };
        ponteiro(R * .5, .03, (hh + mm / 60) / 12 * 6.283); ponteiro(R * .75, .02, mm / 60 * 6.283);
        const s = ponteiro(R * .82, .008, (o.seg || 0) / 60 * 6.283); s.children[0].material = m('#c0392b');
        if (o.treme) { const base = s.rotation.z; anim.push((dt, t) => { s.rotation.z = base + Math.sin(t * 40) * .02; }); } else if (o.anda) anim.push(dt => { s.rotation.z -= dt * 6.283 / 60; });
        return g;
      },
      globo(o) {
        const g = G(); cy(g, .12, .15, .05, m('#4e342e')); cy(g, .015, .015, .3, metal('#b08d57'), 0, .05);
        const [c, x] = tela(256, 128), r = rng(o.sem || 17); x.fillStyle = '#2a6fa8'; x.fillRect(0, 0, 256, 128);
        x.fillStyle = '#5c8a3c'; for (let i = 0; i < 18; i++) { x.beginPath(); x.ellipse(r() * 256, 20 + r() * 88, 10 + r() * 22, 6 + r() * 14, r() * 3, 0, 7); x.fill(); }
        if (o.manchas) { x.fillStyle = o.manchas; for (let i = 0; i < 7; i++) { x.beginPath(); x.ellipse(r() * 256, 20 + r() * 88, 6 + r() * 12, 4 + r() * 8, r() * 3, 0, 7); x.fill(); } }
        const esf = sf(g, .2, m('#ffffff', { unico: true, mapa: texCanvas(c), r: .5 }), 0, .55, 0, 24); esf.rotation.z = .4;
        anim.push(dt => { esf.rotation.y += dt * .15; });
        return g;
      },
      cabine(o) { const g = G(), esp = m('#3a3d42', { tex: 'espuma', rep: [3, 3] }), casca = m('#d9d4c7', { r: .6 });
        bx(g, 1.4, 2.2, .06, casca, 0, 0, -.7); bx(g, .06, 2.2, 1.4, casca, -.7); bx(g, .06, 2.2, 1.4, casca, .7); bx(g, 1.46, .06, 1.46, casca, 0, 2.2);
        pl(g, 1.3, 2.1, esp, 0, 1.05, -.66); bx(g, .7, 2.1, .05, casca, -.35, 0, .7); pl(g, .5, .4, m('#9fd8ff', { op: .3, r: .1 }), -.35, 1.5, .73);
        const fone = new T.Mesh(guardar(new T.TorusGeometry(.1, .015, 8, 16, Math.PI)), m('#111')); fone.position.set(.4, 1.6, -.6); g.add(fone); [-1, 1].forEach(s => sf(g, .04, m('#222'), .4 + s * .1, 1.6, -.6, 8));
        bx(g, .5, .03, .3, m('#6e5a44'), 0, .9, -.5); cy(g, .02, .02, .35, metal('#555'), 0, .93, -.5, 8); sf(g, .05, m('#333'), 0, 1.33, -.5, 10);
        return g; },
      gravador(o) { const g = G(); const y = o.y ?? .76; bx(g, .6, .2, .4, m('#3b3b3b', { r: .5 }), 0, y); const rolos = [-1, 1].map(s => { const ro = cy(g, .13, .13, .02, m('#aaa', { me: .7, r: .3 }), s * .15, y + .2, 0, 24); return ro; }); anim.push(dt => rolos.forEach(r => { r.rotation.y += dt * 1.5; })); return g; },
      cartaz(o) {
        const g = G(); const w = o.w || 1, h = o.h || 1.2, y = o.y ?? 1.1, r = rng(o.sem || 19);
        const [c, x] = tela(256, Math.round(256 * h / w)); x.fillStyle = o.f || '#efe9d8'; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = '#333'; x.fillStyle = '#222';
        if (o.estilo === 'simbolos') { x.font = '20px serif'; for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) x.fillText('ʘǂǁɮʭʬɸƻƾʖɷʘɤ'[Math.floor(r() * 13)], 18 + i * 33, 34 + j * 32 * c.height / 256); x.strokeRect(6, 6, c.width - 12, c.height - 12); }
        else if (o.estilo === 'rede') {
          // desenho de neurônios/teia: nós ligados por galhos finos, e às vezes uma teia circular
          x.strokeStyle = '#2a2622'; x.lineWidth = 1.4; const W0 = c.width, H0 = c.height;
          const nos = Array.from({ length: 16 }, () => [16 + r() * (W0 - 32), 16 + r() * (H0 - 32)]);
          nos.forEach(([a1, b1], i) => { for (let k = 0; k < 3; k++) { const [a2, b2] = nos[Math.floor(r() * nos.length)]; x.beginPath(); x.moveTo(a1, b1); x.quadraticCurveTo((a1 + a2) / 2 + (r() - .5) * 40, (b1 + b2) / 2 + (r() - .5) * 40, a2, b2); x.stroke(); }
            for (let k = 0; k < 4; k++) { const an = r() * 6.28, L = 6 + r() * 14; x.beginPath(); x.moveTo(a1, b1); x.lineTo(a1 + Math.cos(an) * L, b1 + Math.sin(an) * L); x.stroke(); }
            x.fillStyle = '#1a1612'; x.beginPath(); x.arc(a1, b1, 2.5 + r() * 2.5, 0, 7); x.fill(); });
          if (o.teia) { const cx2 = W0 / 2, cy2 = H0 / 2; for (let k = 1; k < 6; k++) { x.beginPath(); x.arc(cx2, cy2, k * Math.min(W0, H0) / 13, 0, 7); x.stroke(); } for (let k = 0; k < 14; k++) { x.beginPath(); x.moveTo(cx2, cy2); x.lineTo(cx2 + Math.cos(k * .449) * W0 * .45, cy2 + Math.sin(k * .449) * H0 * .45); x.stroke(); } }
          x.lineWidth = 6; x.strokeStyle = '#3a2a1a'; x.strokeRect(3, 3, W0 - 6, H0 - 6);
        }
        else { x.font = 'bold 22px Arial'; x.textAlign = 'center'; x.fillText(o.txt || '', c.width / 2, 34); x.font = '14px Arial'; for (let i = 0; i < 9; i++) x.fillRect(24, 60 + i * 20, 160 + r() * 50, 4); }
        pl(g, w, h, m('#ffffff', { unico: true, mapa: texCanvas(c), r: .95 }), 0, y + h / 2, .01);
        return g;
      },
      leito(o) {
        const g = G(), aco = metal('#c9cdd2');
        bx(g, .95, .5, 2, m('#dfe6e9', { r: .5 }), 0, .1); bx(g, .9, .1, 1.9, m(o.lencol || '#f5f6fa'), 0, .6); bx(g, .4, .08, .3, m('#ffffff'), 0, .7, -.75);
        [-1, 1].forEach(s => bx(g, .03, .25, 1, aco, s * .5, .62, .2)); bx(g, .95, .5, .05, aco, 0, .55, -1);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cy(g, .04, .04, .1, m('#222'), a * .4, 0, b * .9, 8));
        if (o.monitor !== false) {
          const p = G(); p.position.set(.75, 0, -.85); g.add(p); cy(p, .02, .02, 1.5, aco, 0, 0, 0, 8); bx(p, .42, .32, .12, m('#2d3436'), 0, 1.5);
          const [c, x] = tela(256, 128); const t = texCanvas(c); const tm = m('#000', { unico: true, mapa: t, e: '#ffffff', ei: 1 }); tm.emissiveMap = t;
          const scr = pl(p, .36, .25, tm, 0, 1.66, .061); scr.rotation.y = 0; p.rotation.y = -.6;
          let fase = 0, ult = 0; const bpm = o.bpm || 62;
          anim.push((dt, tt) => { if (tt - ult < .04) return; ult = tt; fase = (fase + 4) % 256;
            x.fillStyle = 'rgba(0,10,0,.25)'; x.fillRect(0, 0, 256, 128); x.strokeStyle = o.c || '#2ecc71'; x.lineWidth = 3; x.beginPath();
            for (let i = 0; i < 256; i++) { const ph = ((i + fase) / 256 * bpm / 60 * 4) % 1; const v = ph < .05 ? -40 : ph < .08 ? 30 : ph < .1 ? -8 : 0; i ? x.lineTo(i, 64 + v) : x.moveTo(i, 64 + v); }
            x.stroke(); x.fillStyle = o.c || '#2ecc71'; x.font = 'bold 26px monospace'; x.fillText(String(bpm), 200, 30); t.needsUpdate = true; });
        }
        return g;
      },
      pintura(o) {
        const g = G(); const w = o.w || .9, h = o.h || 1.1, y = o.y ?? 1.2, r = rng(o.sem || 21);
        const [c, x] = tela(256, Math.round(256 * h / w)); const grd = x.createRadialGradient(128, c.height * .45, 10, 128, c.height / 2, 200); grd.addColorStop(0, o.c1 || '#d98c6a'); grd.addColorStop(1, o.c2 || '#3a0d12'); x.fillStyle = grd; x.fillRect(0, 0, 256, c.height);
        for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${90 + r() * 120},${10 + r() * 30},${20 + r() * 30},${r() * .25})`; x.beginPath(); x.ellipse(r() * 256, r() * c.height, 4 + r() * 22, 2 + r() * 10, r() * 3, 0, 7); x.fill(); }
        if (o.figura) { x.fillStyle = 'rgba(30,0,4,.55)'; x.beginPath(); x.ellipse(128, c.height * .35, 26, 32, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(128, c.height * .72, 60, 80, 0, 0, 7); x.fill(); }
        bx(g, w + .1, h + .1, .05, m('#6d4c1f', { me: .4, r: .4 }), 0, y - .05);
        pl(g, w, h, m('#ffffff', { unico: true, mapa: texCanvas(c), r: .7 }), 0, y + h / 2, .03);
        if (o.txt) { const pm = m('#ffffff', { unico: true, mapa: textoTex(o.txt, { w: 256, h: 48, cor: '#2b2b2b', fundo: '#c9a24b', tam: 26 }) }); pl(g, .34, .065, pm, 0, y - .12, .03); }
        return g;
      },
      pistao(o) {
        const g = G(), aco = metal('#9aa0a6'), y0 = ALT;
        cy(g, .22, .22, .7, m('#3c4043', { me: .6, r: .5 }), 0, y0 - .7, 0, 18);
        const haste = cy(g, .08, .08, 1.6, aco, 0, y0 - 2.3, 0, 12); const pe = cy(g, .35, .35, .1, m('#2f3337', { me: .6 }), 0, y0 - 2.4, 0, 20);
        const f = o.fase || 0;
        anim.push((dt, t) => { const k = (Math.sin(t * .6 + f) + 1) / 2 * (o.curso ?? .9); const fundo = y0 - 1.6 - k; haste.position.y = fundo + .8; pe.position.y = fundo - .05; });
        return g;
      },
      nucleo(o) { const g = G(); const mat = m('#ff8c1a', { unico: true, e: o.c || '#ff7a00', ei: 1.6, r: .3 }); const n = cy(g, .45, .45, 1.2, mat, 0, .15, 0, 24); cy(g, .55, .55, .15, metal('#444'), 0, 0, 0, 24); cy(g, .55, .55, .15, metal('#444'), 0, 1.35, 0, 24);
        const l = luz(g, o.c || '#ff8c1a', 1.6, 7, 0, 1, 0); anim.push((dt, t) => { const k = .75 + .25 * Math.sin(t * 2.2); mat.emissiveIntensity = 1.6 * k; l.intensity = 1.6 * k; }); return g; },
      mesa_escritorio(o) { const g = G(); const mad = m(o.c || '#5d4a36', { tex: 'madeira' }); bx(g, 1.5, .05, .75, mad, 0, .73); bx(g, .45, .73, .72, mad, .5); bx(g, .04, .73, .7, mad, -.71);
        for (let i = 0; i < 3; i++) bx(g, .1, .02, .02, metal('#aaa'), .5, .15 + i * .24, .37);
        if (o.papeis) { const r = rng(o.sem || 23); for (let i = 0; i < o.papeis; i++) bx(g, .3, .04 + r() * .25, .22, m('#f2efe6'), -.45 + r() * .7, .78, -.15 + r() * .3).rotation.y = (r() - .5) * .5; }
        return g; },
      arquivo(o) { const g = G(); const h = o.h || 1.3; bx(g, .5, h, .62, m(o.c || '#8d969e', { me: .5, r: .45 })); for (let i = 0; i < 4; i++) { pl(g, .46, .01, m('#444'), 0, (i + 1) * h / 4 - .02, .311); bx(g, .12, .02, .03, metal('#ccc'), 0, (i + .6) * h / 4, .32); } if (o.aberta) bx(g, .44, .25, .5, m('#9aa3ab', { me: .5 }), 0, h * .55, .4); return g; },
      cadeira(o) { const g = G(); const c = m(o.c || '#2c2c2c', { r: .6 }); cy(g, .3, .3, .04, metal('#444'), 0, 0, 0, 5); cy(g, .03, .03, .42, metal('#555'), 0, .04); bx(g, .48, .08, .46, c, 0, .46); bx(g, .46, .55, .06, c, 0, .54, -.22).rotation.x = -.08; return g; },
      esqueleto(o) {
        const g = G(); if (o.cadeira !== false) g.add(P.cadeira({ c: '#3a2a20' }));
        const osso = m('#e6dcc3', { r: .7 });
        sf(g, .1, osso, 0, 1.33, -.12, 14); bx(g, .1, .05, .08, osso, 0, 1.2, -.09); sf(g, .022, m('#111'), -.035, 1.35, -.03, 6); sf(g, .022, m('#111'), .035, 1.35, -.03, 6);
        const col = cy(g, .02, .02, .55, osso, 0, .55, -.18, 8); col.rotation.x = .12;
        for (let i = 0; i < 5; i++) { const ar = new T.Mesh(guardar(new T.TorusGeometry(.13 - i * .01, .012, 6, 14, Math.PI * 1.4)), osso); ar.position.set(0, .95 + i * .045, -.12); ar.rotation.set(Math.PI / 2, 0, Math.PI * .8); ar.scale.set(1, .75, 1); g.add(ar); }
        bx(g, .3, .08, .16, osso, 0, .52, -.14);
        [-1, 1].forEach(s => { const f = cy(g, .022, .022, .42, osso, s * .1, .52, .07, 8); f.rotation.x = Math.PI / 2; f.position.set(s * .1, .55, .07); cy(g, .02, .02, .45, osso, s * .11, .08, .28, 8); cy(g, .02, .02, .32, osso, s * .19, .82, -.1, 8).rotation.z = s * .2; const b = cy(g, .018, .018, .3, osso, s * .2, .7, .06, 8); b.rotation.x = Math.PI / 2.4; });
        return g;
      },
      pilha(o) { const g = G(), r = rng(o.sem || 25); for (let i = 0; i < (o.n || 4); i++) bx(g, .32, .1 + r() * .5, .24, m('#efebe0', { r: .95 }), (r() - .5) * (o.w || 1.2), 0, (r() - .5) * (o.d || .8)).rotation.y = (r() - .5); return g; },
      vitrine(o) {
        const g = G(); bx(g, .9, .9, .6, m('#3e2f25', { tex: 'madeira' })); bx(g, .9, .55, .6, m('#c8e6f5', { op: .18, r: .05 }), 0, .9);
        const y = .93, mat = m(o.c || '#b8a07a', { r: .5, me: .3 }), k = o.obj || 'chave';
        if (k === 'oculos') [-1, 1].forEach(s => { const a = new T.Mesh(guardar(new T.TorusGeometry(.05, .006, 6, 16)), mat); a.position.set(s * .06, y + .06, 0); g.add(a); });
        else if (k === 'terco') { for (let i = 0; i < 14; i++) sf(g, .012, mat, Math.cos(i / 14 * 6.283) * .1, y + .01, Math.sin(i / 14 * 6.283) * .1, 6); bx(g, .012, .08, .012, mat, 0, y, .14); }
        else if (k === 'brinquedo') { bx(g, .1, .08, .07, m('#c0392b'), 0, y); cy(g, .02, .02, .06, m('#f1c40f'), 0, y + .08, 0, 8); }
        else { bx(g, .12, .01, .02, mat, 0, y); const a = new T.Mesh(guardar(new T.TorusGeometry(.025, .006, 6, 12)), mat); a.position.set(-.08, y + .01, 0); a.rotation.x = Math.PI / 2; g.add(a); }
        if (o.txt) pl(g, .3, .06, m('#ffffff', { unico: true, mapa: textoTex(o.txt, { w: 256, h: 52, cor: '#222', fundo: '#f5f0e1', tam: 20 }) }), 0, .75, .302);
        luz(g, '#fff4d6', .9, 2.2, 0, 1.5, 0);
        return g;
      },
      frascos(o) {
        const g = G(), w = o.w || 2.4, filas = o.filas || 5;
        [-1, 1].forEach(s => bx(g, .04, 2.2, .35, metal('#9aa0a6'), s * w / 2));
        for (let i = 0; i < filas; i++) bx(g, w, .02, .35, m('#dfe6e9', { op: .5, r: .1 }), 0, .3 + i * .4);
        const geo = guardar(new T.CylinderGeometry(.025, .025, .14, 8)), n = Math.floor(w / .07) * filas * 2;
        const inst = new T.InstancedMesh(geo, m('#7a0c10', { r: .2, e: '#2a0000', ei: .5 }), n), d = new T.Object3D(), r = rng(o.sem || 27); let k = 0;
        for (let i = 0; i < filas; i++) for (let x = -w / 2 + .06; x < w / 2 - .04 && k < n; x += .07) for (let z = -.08; z <= .08 && k < n; z += .16) { if (r() < .08) continue; d.position.set(x, .32 + i * .4 + .07, z); d.scale.y = .7 + r() * .5; d.updateMatrix(); inst.setMatrixAt(k++, d.matrix); }
        inst.count = k; g.add(inst);
        return g;
      },
      bancada(o) { const g = G(); const w = o.w || 2.4; bx(g, w, .9, .8, m('#dfe6e9', { r: .5 })); bx(g, w + .04, .04, .84, m('#2d3436', { r: .4 }), 0, .9);
        const vid = m('#d6f0ff', { op: .35, r: .05 }), liq = m('#8b0000', { op: .8, r: .2 }); for (let i = 0; i < (o.n || 4); i++) { const x = -w / 2 + .3 + i * .45; cy(g, .05, .05, .16, vid, x, .94, 0, 12); cy(g, .045, .045, .08, liq, x, .945, 0, 12); } return g; },
      maquina(o) {
        const g = G(); bx(g, 1.2, 1.4, .8, m(o.c || '#bdc3c7', { r: .45, me: .4 })); bx(g, .5, .08, .1, m('#111'), 0, .9, .4);
        const rot = o.rotulos || ['BAIXA', 'MÉDIA', 'ALTA'], cs = ['#2ecc71', '#f1c40f', '#e74c3c'], lamps = [];
        rot.forEach((t, i) => { const x = -.38 + i * .38; lamps.push(sf(g, .05, m('#111', { unico: true, e: cs[i % 3], ei: 1.5 }), x, 1.2, .41, 10)); pl(g, .3, .07, m('#ffffff', { unico: true, mapa: textoTex(t, { w: 256, h: 60, cor: '#111', fundo: '#ecf0f1', tam: 34 }) }), x, 1.08, .401); });
        anim.push((dt, t) => lamps.forEach((l, i) => { l.material.emissiveIntensity = Math.floor(t / 1.5) % 3 === i ? 1.8 : .15; }));
        return g;
      },
      transformador(o) {
        const g = G(), cas = m('#4b5560', { me: .6, r: .5 }); bx(g, 1.1, 1.5, .8, cas);
        for (let i = 0; i < 6; i++) bx(g, .04, 1.2, .9, m('#3a434c', { me: .6 }), -.45 + i * .18, .1, 0);
        const bob = m('#c46b1a', { unico: true, me: .8, r: .3, e: o.c || '#ff6a00', ei: .3 }); [-1, 0, 1].forEach(s => { const t = new T.Mesh(guardar(new T.TorusGeometry(.13, .05, 8, 16)), bob); t.position.set(s * .32, 1.62, 0); t.rotation.x = Math.PI / 2; g.add(t); cy(g, .05, .05, .2, m('#ddd', { r: .3 }), s * .32, 1.5, 0, 10); });
        const r = rng(o.sem || 29); anim.push((dt, t) => { bob.emissiveIntensity = .3 + .5 * (Math.sin(t * 7 + Math.sin(t * 13)) > .6 ? 1 : 0) + r() * .1; });
        return g;
      },
      cadeira_plastico(o) {
        const g = G(), n = o.n || 1, c = m(o.c || '#d35400', { r: .5 });
        for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * (o.esp || .62); bx(g, .45, .04, .42, c, x, .44); bx(g, .45, .42, .04, c, x, .48, -.2).rotation.x = -.08; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bx(g, .025, .44, .025, metal('#555'), x + a * .2, 0, b * .18)); }
        return g;
      },
      tv(o) {
        const g = G(), y = o.carrinho === false ? (o.y ?? 0) : .85;
        if (o.carrinho !== false) { bx(g, .8, .05, .55, metal('#555'), 0, .8); bx(g, .8, .05, .55, metal('#555'), 0, .3); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bx(g, .03, .8, .03, metal('#555'), a * .37, 0, b * .25)); bx(g, .4, .09, .25, m('#1d1d1d'), 0, .35); }
        bx(g, .7, .55, .55, m(o.c || '#2a2a2a', { r: .5 }), 0, y);
        const [c, x] = tela(128, 96), t = texCanvas(c); const tm = m('#000', { unico: true, mapa: t, e: '#ffffff', ei: 1 }); tm.emissiveMap = t;
        pl(g, .56, .42, tm, 0, y + .28, .276);
        if (o.txt) { x.fillStyle = '#000'; x.fillRect(0, 0, 128, 96); x.fillStyle = o.cor || '#e74c3c'; x.font = 'bold 28px monospace'; x.textAlign = 'center'; x.fillText(o.txt, 64, 58); t.needsUpdate = true; if (o.troca) { let ult = 0; anim.push((dt, tt) => { if (tt - ult < (o.troca || 4)) return; ult = tt; x.fillStyle = '#000'; x.fillRect(0, 0, 128, 96); x.fillStyle = o.cor || '#e74c3c'; x.fillText(o.lista ? o.lista[Math.floor(tt / (o.troca || 4)) % o.lista.length] : o.txt, 64, 58); t.needsUpdate = true; }); } }
        else if (o.desligada) { x.fillStyle = '#050505'; x.fillRect(0, 0, 128, 96); t.needsUpdate = true; tm.emissiveIntensity = .05; }
        else { const img = x.createImageData(128, 96); let ult = 0; anim.push((dt, tt) => { if (tt - ult < .06) return; ult = tt; for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 200; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } x.putImageData(img, 0, 0); t.needsUpdate = true; }); luz(g, '#cfd8ff', .35, 2.5, 0, y + .3, .6, true); }
        return g;
      },
      espelho(o) { const g = G(); const w = o.w || 2.4, h = o.h || 1.2, y = o.y ?? .9; bx(g, w + .1, h + .1, .06, m('#222'), 0, y - .05); pl(g, w, h, m('#0e1418', { me: 1, r: .08 }), 0, y + h / 2, .035); return g; },
      cartoes(o) {
        const g = G(), r = rng(o.sem || 31), y = o.y ?? .77;
        for (let i = 0; i < (o.n || 4); i++) { const [c, x] = tela(128, 160); x.fillStyle = '#f7f4ea'; x.fillRect(0, 0, 128, 160); x.fillStyle = '#111';
          for (let k = 0; k < 12; k++) { const px = r() * 50, py = 20 + r() * 120, rx = 4 + r() * 16, ry = 4 + r() * 22; x.beginPath(); x.ellipse(64 - px, py, rx, ry, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(64 + px, py, rx, ry, 0, 0, 7); x.fill(); }
          const p = pl(g, .18, .23, m('#ffffff', { unico: true, mapa: texCanvas(c) }), (i - 1.5) * .22, y, (r() - .5) * .1); p.rotation.x = -Math.PI / 2; p.rotation.z = (r() - .5) * .3; }
        return g;
      },
      rasgos(o) { const g = G(), r = rng(o.sem || 33), w = o.w || 6; for (let i = 0; i < (o.n || 6); i++) for (let k = 0; k < 4; k++) { const p = pl(g, .015, .5 + r() * .4, m('#2b1b14'), (r() - .5) * w + k * .05, .8 + r() * 1.4, .012); p.rotation.z = .2 + r() * .1; } return g; },
      lampada(o) { const g = G(); const y = o.y ?? ALT - .9; cy(g, .006, .006, ALT - y, m('#111'), 0, y); const b = sf(g, .07, m('#ffffff', { e: o.c || '#ff2a2a', ei: 2 }), 0, y - .02, 0, 12); luz(g, o.c || '#ff2a2a', o.i || 2.2, o.d || 9, 0, y - .2, 0, o.pisca); return g; },
      vela(o) {
        const g = G(); cy(g, .1, .12, .04, m('#3a3a3a', { me: .5 })); cy(g, .045, .045, .28, m('#efe9d8', { r: .6 }), 0, .04, 0, 14);
        const ch = new T.Mesh(guardar(new T.ConeGeometry(.02, .07, 10)), m('#ffb000', { e: '#ffcc55', ei: 2.5 })); ch.position.y = .37; g.add(ch);
        anim.push((dt, t) => { ch.scale.set(1 + Math.sin(t * 17) * .08, 1 + Math.sin(t * 11) * .2, 1); ch.rotation.z = Math.sin(t * 5) * .08; });
        luz(g, '#ffb347', o.i || 1.6, o.d || 6, 0, .45, 0, 'vela');
        return g;
      },
      interface(o) {
        // massa orgânica com olhos: superfície ondulada que respira
        const g = G(), w = o.w || 4.4, h = o.h || 2.8, r = rng(o.sem || 35);
        const geo = guardar(new T.PlaneGeometry(w, h, 48, 32)); const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, .18 * Math.sin(x * 2.3 + y * 1.7) + .12 * Math.sin(x * 5.1 - y * 3.3) + .25 * (1 - Math.abs(x) / (w / 2)) + .06 * r()); }
        geo.computeVertexNormals();
        const carne = m(o.c || '#9c4a4f', { r: .38, me: .05, e: '#2a0507', ei: .35, lado: 2 });
        const mesh = new T.Mesh(geo, carne); mesh.position.set(0, h / 2, 0); g.add(mesh);
        const olhos = [], n = o.olhos || 5;
        for (let i = 0; i < n; i++) {
          const ol = G(); ol.position.set((i - (n - 1) / 2) * (w / (n + .5)) + (r() - .5) * .3, .9 + r() * (h - 1.4), .32 + r() * .1); g.add(ol);
          const pal = sf(ol, .2, m('#5a1e22', { r: .5 }), 0, 0, -.04, 18); pal.scale.set(1.35, .85, .6);
          const glob = sf(ol, .15, m('#120807', { r: .12, me: .2 }), 0, 0, 0, 20); glob.scale.set(1.3, .9, .9);
          const iris = sf(ol, .07, m('#3b2414', { r: .2 }), 0, 0, .1, 12); iris.scale.set(1.4, .8, .4);
          sf(ol, .02, m('#ffffff', { e: '#ffffff', ei: .6 }), .05, .04, .14, 6);
          olhos.push([ol, r() * 9]);
        }
        anim.push((dt, t) => { mesh.scale.z = 1 + Math.sin(t * .9) * .12; olhos.forEach(([ol, f]) => { ol.rotation.y = Math.sin(t * .4 + f) * .35; ol.rotation.x = Math.sin(t * .3 + f * 2) * .15; ol.scale.y = (Math.sin(t * .7 + f) > .985) ? .1 : 1; }); });
        return g;
      },
      banco_espera(o) { const g = G(), n = o.n || 4, c = m(o.c || '#2e86de', { r: .5 }); bx(g, n * .55, .05, .08, metal('#555'), 0, .38, 0); for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * .55; bx(g, .48, .05, .42, c, x, .42, .05); bx(g, .48, .42, .05, c, x, .47, -.17).rotation.x = -.1; } [-1, 1].forEach(s => bx(g, .05, .4, .4, metal('#555'), s * (n * .55 / 2 - .1), 0, 0)); return g; },
      senhas(o) {
        const g = G(); const y = o.y ?? 2.2; bx(g, 1.1, .45, .1, m('#111'), 0, y);
        const [c, x] = tela(256, 96), t = texCanvas(c); const tm = m('#000', { unico: true, mapa: t, e: '#ffffff', ei: 1.3 }); tm.emissiveMap = t; pl(g, 1, .38, tm, 0, y + .225, .051);
        const lista = o.lista || ['001', '002', '003'], dur = o.troca || 5; let ult = -99, idx = 0;
        const pinta = () => { x.fillStyle = '#100000'; x.fillRect(0, 0, 256, 96); x.fillStyle = o.c || '#ff3b2f'; x.font = 'bold 54px "Courier New", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = o.c || '#ff3b2f'; x.shadowBlur = 14; x.fillText(lista[idx % lista.length], 128, 50); t.needsUpdate = true; };
        pinta(); anim.push((dt, tt) => { if (tt - ult < dur) return; ult = tt; idx++; pinta(); });
        return g;
      },
      triangulo(o) { const g = G(); const w = o.w || 2, y = o.y ?? .8; const [c, x] = tela(256, 256); x.clearRect(0, 0, 256, 256); x.strokeStyle = o.c || '#e8e2d0'; x.lineWidth = 14; x.beginPath(); x.moveTo(128, 20); x.lineTo(236, 226); x.lineTo(20, 226); x.closePath(); x.stroke(); const mat = m('#ffffff', { unico: true, mapa: texCanvas(c), r: .9 }); mat.transparent = true; pl(g, w, w, mat, 0, y + w / 2, .01); return g; },
      telao(o) { const g = G(); const w = o.w || 3.2, h = o.h || 1.6, y = o.y ?? 1.2; bx(g, w + .12, h + .12, .1, m('#111'), 0, y - .06); const tx = textoTex(o.txt || '', { w: 1024, h: Math.round(1024 * h / w), cor: o.c || '#7fe3d6', fundo: '#04100f', fonte: '"Courier New", monospace', brilho: true, tam: o.tam }); const tm = m('#000', { unico: true, mapa: tx, e: '#ffffff', ei: 1 }); tm.emissiveMap = tx; pl(g, w, h, tm, 0, y + h / 2, .051); luz(g, o.c || '#7fe3d6', .5, 5, 0, y + h / 2, 1); return g; },
      sofa(o) { const g = G(), c = m(o.c || '#5b4b6b', { r: .9 }), w = o.w || 2; bx(g, w, .42, .85, c); bx(g, w, .5, .2, c, 0, .4, -.33); [-1, 1].forEach(s => bx(g, .18, .25, .85, c, s * (w / 2 - .09), .4)); for (let i = 0; i < 3; i++) bx(g, w / 3 - .06, .12, .6, m(o.c2 || '#6d5a80', { r: .95 }), (i - 1) * w / 3, .42, .06); return g; },
      caixote(o) { const g = G(), r = rng(o.sem || 37); for (let i = 0; i < (o.n || 3); i++) bx(g, .6, .5, .6, m('#8a6d3b', { tex: 'madeira' }), (r() - .5) * 1.4, i > 1 ? .5 : 0, (r() - .5) * .8).rotation.y = r(); return g; },
      tapete(o) { const g = G(); const p = pl(g, o.w || 3, o.d || 2, m(o.c || '#6b2737', { tex: 'carpete', r: 1 }), 0, .005, 0); p.rotation.x = -Math.PI / 2; return g; },
      luminaria(o) { const g = G(); const y = ALT - .03; bx(g, o.w || 1.3, .05, .22, m('#e8e8e8'), 0, y - .05); const tub = bx(g, (o.w || 1.3) - .1, .03, .14, m('#ffffff', { unico: true, e: o.c || '#eaf6ff', ei: 1.6 }), 0, y - .08);
        const l = luz(g, o.c || '#eaf6ff', o.i || 1.6, o.d || 10, 0, y - .3, 0); if (o.pisca) { const r = rng(o.sem || 39); anim.push((dt, t) => { const on = !(Math.sin(t * 1.7 + r() * .2) > .9 || r() < .01); l.intensity = on ? (o.i || 1.6) : .05; tub.material.emissiveIntensity = on ? 1.6 : .05; }); } return g; },
    };

    /* ---------- texturas novas (geradas na hora) ---------- */
    function textura(tipo, cor, rep) {
      const NOVAS = ['papel_parede', 'carpete_umido', 'forro', 'marmore', 'areia', 'grama', 'carne', 'osso', 'tijolo', 'estrelas', 'nomes', 'veludo', 'terra', 'agua', 'vagao', 'ceu_noite', 'ceu_nublado', 'ceu_branco', 'asfalto'];
      if (!NOVAS.includes(tipo)) return texturaBase(tipo, cor, rep);
      const k = tipo + cor + (rep || '');
      if (cacheT.has(k)) return cacheT.get(k);
      const [c, x] = tela(256, 256), r = rng(tipo.length * 53 + cor.length * 7);
      x.fillStyle = cor; x.fillRect(0, 0, 256, 256);
      const ruido = (n, a, tam, claro) => { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${claro === undefined ? (r() < .5 ? '0,0,0' : '255,255,255') : claro ? '255,255,255' : '0,0,0'},${a * r()})`; x.fillRect(r() * 256, r() * 256, tam, tam); } };
      const blob = (n, rgba, rmin, rmax) => { for (let i = 0; i < n; i++) { x.fillStyle = rgba; x.beginPath(); x.ellipse(r() * 256, r() * 256, rmin + r() * (rmax - rmin), rmin + r() * (rmax - rmin) * .7, r() * 3, 0, 7); x.fill(); } };
      if (tipo === 'papel_parede') {
        // papel de parede amarelado das "backrooms": listras finas, losangos apagados, manchas de umidade
        for (let i = 0; i < 256; i += 16) { x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(i, 0, 2, 256); x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(i + 8, 0, 1, 256); }
        x.strokeStyle = 'rgba(90,70,20,.09)'; x.lineWidth = 2;
        for (let j = 0; j < 256; j += 32) for (let i = 0; i < 256; i += 32) { x.beginPath(); x.moveTo(i + 16, j + 4); x.lineTo(i + 28, j + 16); x.lineTo(i + 16, j + 28); x.lineTo(i + 4, j + 16); x.closePath(); x.stroke(); }
        ruido(1800, .05, 2);
        for (let i = 0; i < 5; i++) { const gx = r() * 256, gw = 20 + r() * 60; const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(110,80,20,.25)'); gr.addColorStop(.25 + r() * .3, 'rgba(110,80,20,0)'); x.fillStyle = gr; x.fillRect(gx, 0, gw, 256); }
        x.fillStyle = 'rgba(80,60,20,.2)'; x.fillRect(0, 250, 256, 6);
      } else if (tipo === 'carpete_umido') { ruido(9000, .09, 1); blob(14, 'rgba(40,30,10,.12)', 12, 40); blob(6, 'rgba(255,240,200,.05)', 10, 30); }
      else if (tipo === 'forro') {
        x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 4; x.strokeRect(0, 0, 256, 256); x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke();
        for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(0,0,0,${.15 * r()})`; x.fillRect(r() * 256, r() * 256, 1, 1); }
        blob(3, 'rgba(120,90,30,.18)', 10, 35);
      } else if (tipo === 'marmore') {
        ruido(1500, .03, 3); x.strokeStyle = 'rgba(80,80,90,.25)'; x.lineWidth = 1.5;
        for (let i = 0; i < 9; i++) { x.beginPath(); let px = r() * 256, py = 0; x.moveTo(px, py); while (py < 256) { px += (r() - .5) * 40; py += 10 + r() * 20; x.lineTo(px, py); } x.stroke(); }
        x.strokeStyle = 'rgba(0,0,0,.2)'; x.lineWidth = 2; x.strokeRect(0, 0, 256, 256);
      } else if (tipo === 'areia') { ruido(14000, .18, 1); ruido(400, .1, 3, true); }
      else if (tipo === 'grama') { for (let i = 0; i < 2600; i++) { x.strokeStyle = `rgba(${20 + r() * 40},${50 + r() * 70},${15 + r() * 25},${.5 + r() * .5})`; x.lineWidth = 1; x.beginPath(); const px = r() * 256, py = r() * 256; x.moveTo(px, py); x.lineTo(px + (r() - .5) * 6, py - 4 - r() * 10); x.stroke(); } }
      else if (tipo === 'carne') {
        blob(60, 'rgba(160,30,40,.25)', 8, 34); blob(30, 'rgba(240,140,140,.12)', 6, 20);
        x.strokeStyle = 'rgba(40,0,5,.45)'; x.lineWidth = 2;
        for (let i = 0; i < 16; i++) { x.beginPath(); x.moveTo(r() * 256, r() * 256); for (let j = 0; j < 4; j++) x.quadraticCurveTo(r() * 256, r() * 256, r() * 256, r() * 256); x.stroke(); }
        ruido(2000, .08, 2);
      } else if (tipo === 'osso') {
        for (let j = 0; j < 256; j += 22) for (let i = (j / 22) % 2 ? 0 : 18; i < 256; i += 36) { x.fillStyle = `rgba(${210 + r() * 30},${200 + r() * 25},${170 + r() * 25},1)`; x.beginPath(); x.ellipse(i, j + 11, 15, 8, (r() - .5) * .4, 0, 7); x.fill(); x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.arc(i - 5, j + 10, 2.5, 0, 7); x.arc(i + 5, j + 10, 2.5, 0, 7); x.fill(); }
        ruido(1500, .1, 2, false);
      } else if (tipo === 'tijolo') {
        for (let j = 0; j < 256; j += 32) for (let i = (j / 32) % 2 ? -32 : 0; i < 256; i += 64) { x.fillStyle = `rgba(${130 + r() * 50},${60 + r() * 30},${40 + r() * 20},1)`; x.fillRect(i + 2, j + 2, 60, 28); }
        ruido(1500, .1, 2);
      } else if (tipo === 'estrelas') {
        for (let i = 0; i < 90; i++) { const px = r() * 256, py = r() * 256, s = 2 + r() * 4; x.fillStyle = `rgba(255,240,170,${.5 + r() * .5})`; x.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, rr = k % 2 ? s * .4 : s; x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); } x.fill(); }
      } else if (tipo === 'nomes') {
        const alf = 'ABCDEFGHIJKLMNOPRSTUVZ' + 'ΑΒΓΔΣΩ' + 'БДЖЗИЛ' + 'あかさたな';
        x.fillStyle = 'rgba(30,20,10,.75)';
        for (let j = 10; j < 256; j += 9) { let px = r() * -20; while (px < 256) { const n = 3 + Math.floor(r() * 7); x.font = `${7 + r() * 4}px serif`; let w = ''; for (let k = 0; k < n; k++) w += alf[Math.floor(r() * alf.length)]; x.fillText(w, px, j + (r() - .5) * 3); px += x.measureText(w).width + 4 + r() * 6; } }
      } else if (tipo === 'veludo') { ruido(6000, .08, 1); for (let i = 0; i < 256; i += 3) { x.fillStyle = `rgba(0,0,0,${.05 + r() * .06})`; x.fillRect(i, 0, 1, 256); } }
      else if (tipo === 'terra') { ruido(9000, .14, 2); blob(20, 'rgba(0,0,0,.12)', 6, 22); }
      else if (tipo === 'agua') { for (let i = 0; i < 120; i++) { x.strokeStyle = `rgba(255,255,255,${.04 + r() * .06})`; x.lineWidth = 1; x.beginPath(); const px = r() * 256, py = r() * 256; x.ellipse(px, py, 8 + r() * 26, 2 + r() * 5, 0, 0, 7); x.stroke(); } }
      // céus pintados nas paredes (relíquias ao ar livre): v=0 embaixo, v=1 no alto da parede
      else if (tipo === 'ceu_noite') { const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#02040c'); gr.addColorStop(.7, '#0a1430'); gr.addColorStop(1, '#141c10'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(255,255,240,${.3 + r() * .7})`; x.fillRect(r() * 256, r() * 190, 1 + (r() < .1), 1 + (r() < .1)); } x.fillStyle = '#05070a'; x.beginPath(); x.moveTo(0, 256); for (let i = 0; i <= 256; i += 16) x.lineTo(i, 222 - r() * 16 - (i % 64 === 0 ? 12 : 0)); x.lineTo(256, 256); x.fill(); }
      else if (tipo === 'ceu_nublado') { const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#3a3e44'); gr.addColorStop(.8, '#6a7076'); gr.addColorStop(1, '#4a4e52'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); blob(26, 'rgba(255,255,255,.05)', 20, 60); blob(16, 'rgba(0,0,0,.08)', 20, 60); }
      else if (tipo === 'ceu_branco') { x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256); blob(10, 'rgba(255,250,230,.4)', 30, 80); }
      else if (tipo === 'asfalto') { ruido(12000, .16, 1); x.fillStyle = 'rgba(240,240,220,.6)'; x.fillRect(120, 0, 16, 90); x.fillRect(120, 160, 16, 96); }
      else if (tipo === 'vagao') { ruido(1500, .04, 2); x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 256; i += 64) x.fillRect(i, 0, 3, 256); }
      const t = texCanvas(c, rep || [1, 1]);
      cacheT.set(k, t); return t;
    }

    // mancha de sangue (respingo, escorrido, poça ou mão) com fundo transparente
    function manchaTex(tipo, sem) {
      const [c, x] = tela(256, 256), r = rng(sem || 41);
      x.clearRect(0, 0, 256, 256);
      const vermelho = a => `rgba(${90 + r() * 50},${r() * 10},${r() * 12},${a})`;
      if (tipo === 'escorrido') {
        for (let i = 0; i < 14; i++) { const px = 30 + r() * 196, w = 3 + r() * 9, h = 60 + r() * 180; x.fillStyle = vermelho(.75); x.fillRect(px, 0, w, h); x.beginPath(); x.arc(px + w / 2, h, w * .8, 0, 7); x.fill(); }
        x.fillStyle = vermelho(.8); x.beginPath(); x.ellipse(128, 18, 110, 22, 0, 0, 7); x.fill();
      } else if (tipo === 'mao') {
        for (let k = 0; k < 3; k++) { const ox = 40 + k * 70 + r() * 10, oy = 60 + r() * 80; x.fillStyle = vermelho(.7); x.beginPath(); x.ellipse(ox, oy + 30, 22, 28, 0, 0, 7); x.fill(); for (let d = 0; d < 5; d++) { x.beginPath(); x.ellipse(ox - 22 + d * 11, oy - 6 + Math.abs(d - 2) * 6, 5, 16, (d - 2) * .15, 0, 7); x.fill(); } x.fillRect(ox - 10, oy + 50, 20, 60 + r() * 60); }
      } else {
        const poca = tipo === 'poca';
        x.fillStyle = vermelho(.85); x.beginPath(); x.ellipse(128, 128, poca ? 95 : 45, poca ? 70 : 38, r() * 3, 0, 7); x.fill();
        for (let i = 0; i < (poca ? 12 : 40); i++) { const a = r() * 6.283, d = (poca ? 90 : 50) + r() * (poca ? 30 : 70), s = 2 + r() * (poca ? 14 : 8); x.fillStyle = vermelho(.7 + r() * .3); x.beginPath(); x.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, s, 0, 7); x.fill(); }
      }
      const t = texCanvas(c); return t;
    }

    /* ---------- figura humana genérica (técnicos, plateia, coro, soldados, moldes…) ---------- */
    // pose: em_pe | sentado | deitado | pendurado | de_costas · c: roupa · pele · cab: normal | costurada | lencol | ressecado | sem
    function figura(o = {}) {
      const g = G(), alt = o.h || 1.72, k = alt / 1.72;
      const roupa = m(o.c || '#d9661f', { r: .85, tex: o.tex }), pele = m(o.pele || '#c9a38a', { r: .7 }), escuro = m(o.c2 || '#2a2a2a', { r: .8 });
      const corpo = G(); g.add(corpo); corpo.scale.setScalar(k);
      const sentado = o.pose === 'sentado';
      // pernas
      [-1, 1].forEach(s => {
        if (sentado) { const coxa = cy(corpo, .075, .07, .45, roupa, s * .11, .44, .2, 10); coxa.rotation.x = Math.PI / 2; coxa.position.set(s * .11, .47, .02); cy(corpo, .065, .055, .44, roupa, s * .11, .03, .24, 10); bx(corpo, .11, .07, .24, escuro, s * .11, 0, .3); }
        else { cy(corpo, .075, .06, .86, roupa, s * .1, .06, 0, 10); bx(corpo, .11, .07, .25, escuro, s * .1, 0, .05); }
      });
      const y0 = sentado ? .47 : .9;
      // tronco e braços
      cy(corpo, .2, .16, .62, roupa, 0, y0, 0, 14).scale.z = .7;
      const brPose = o.bracos || (sentado ? 'colo' : 'baixo');
      [-1, 1].forEach(s => {
        const b = G(); b.position.set(s * .23, y0 + .55, 0); corpo.add(b);
        cy(b, .055, .045, .6, roupa, 0, -.6, 0, 8); sf(b, .05, pele, 0, -.63, 0, 8);
        if (brPose === 'colo') b.rotation.x = -.9; else if (brPose === 'frente') b.rotation.x = -1.4; else if (brPose === 'cima') b.rotation.z = s * 2.6; else b.rotation.z = s * .08;
      });
      // cabeça
      const cab = o.cab || 'normal';
      const cy0 = y0 + .7;
      if (cab !== 'sem') {
        cy(corpo, .05, .05, .1, pele, 0, cy0 - .02, 0, 8);
        const cmat = cab === 'lencol' ? m('#e9e6df', { r: .9 }) : cab === 'ressecado' ? m('#6b5444', { r: .95 }) : cab === 'cera' ? m(o.pele || '#e8d9c4', { r: .35 }) : pele;
        const hd = sf(corpo, .12, cmat, 0, cy0 + .16, 0, 16); hd.scale.set(.9, 1.1, 1);
        if (cab === 'costurada') { const linha = m('#2a0a0a'); for (let i = 0; i < 3; i++) { const t = bx(corpo, .005, .2, .01, linha, -.05 + i * .05, cy0 + .06, .11); t.rotation.z = (i - 1) * .3; } }
        if (cab === 'normal' || cab === 'cera') { [-1, 1].forEach(s => sf(corpo, .016, m('#111'), s * .045, cy0 + .19, .105, 6)); if (o.cabelo !== false) { const ca = sf(corpo, .125, m(o.cabelo || '#2b1d14', { r: .9 }), 0, cy0 + .2, -.02, 14); ca.scale.set(.95, .9, 1); } }
      }
      if (o.pose === 'de_costas') g.rotation.y = Math.PI;
      if (o.pose === 'deitado') { corpo.rotation.x = -Math.PI / 2; corpo.position.set(0, (o.base ?? .9) + .1, .85); }
      if (o.pose === 'pendurado') { corpo.position.y = o.alto ?? .5; cy(g, .01, .01, ALT - (o.alto ?? .5) - alt, metal('#777'), 0, (o.alto ?? .5) + alt); }
      if (o.lencol) { const l = bx(corpo, .62, .25, 1.9, m('#ecebe6', { r: .95 }), 0, y0 - .2, 0); if (o.pose !== 'deitado') l.visible = false; }
      // respiração (quem está "vivo demais")
      if (o.respira) { const f = rng(o.sem || 7)() * 6; anim.push((dt, t) => { corpo.scale.y = k * (1 + Math.sin(t * 1.3 + f) * .012); }); }
      return g;
    }

    /* ---------- objetos novos (2º ao 5º andar, corredores, controles do Mestre) ---------- */
    Object.assign(P, {
      sangue(o) {
        // decalque: no chão (chao:1) ou na parede (y)
        const g = G(), w = o.w || 1, h = o.h || w, mat = m('#ffffff', { unico: true, mapa: manchaTex(o.estilo || 'respingo', o.sem), r: .3 });
        mat.transparent = true; mat.depthWrite = false; mat.polygonOffset = true; mat.polygonOffsetFactor = -2;
        const p = pl(g, w, h, mat, 0, o.chao ? .006 : (o.y ?? 1) + h / 2, o.chao ? 0 : .012);
        if (o.chao) p.rotation.x = -Math.PI / 2;
        return g;
      },
      texto(o) {
        // texto pintado na parede (tinta escorrida)
        const g = G(), w = o.w || 3, h = o.h || .8, y = o.y ?? 1.4;
        const [c, x] = tela(1024, Math.round(1024 * h / w)); x.clearRect(0, 0, c.width, c.height);
        x.fillStyle = o.c || '#e0b400'; x.font = `bold ${o.tam || Math.round(c.height * .42)}px ${o.fonte || 'Georgia, serif'}`; x.textAlign = 'center'; x.textBaseline = 'middle';
        const L = String(o.txt || '').split('\n'), alt = c.height / (L.length + .4);
        L.forEach((l, i) => x.fillText(l, c.width / 2, alt * (i + .7)));
        if (o.escorre !== false) { const r = rng(o.sem || 43); for (let i = 0; i < 40; i++) { const px = 40 + r() * (c.width - 80); x.fillRect(px, c.height * .3 + r() * c.height * .4, 3 + r() * 4, 20 + r() * c.height * .5); } }
        const mat = m('#ffffff', { unico: true, mapa: texCanvas(c), r: .6 }); mat.transparent = true; mat.depthWrite = false;
        if (o.brilho) { mat.emissive = new T.Color('#ffffff'); mat.emissiveMap = mat.map; mat.emissiveIntensity = o.brilho; }
        pl(g, w, h, mat, 0, y + h / 2, .013);
        return g;
      },
      figura(o) { return figura(o); },
      cama(o) {
        const g = G(), ferro = m(o.ferro || '#3b3f44', { me: .6, r: .5 }), w = o.w || .95, L = o.l || 2;
        [-1, 1].forEach(s => { cy(g, .025, .025, .95, ferro, -w / 2, 0, s * L / 2, 8); cy(g, .025, .025, .95, ferro, w / 2, 0, s * L / 2, 8); });
        bx(g, w, .04, .04, ferro, 0, .9, -L / 2); bx(g, w, .04, .04, ferro, 0, .6, L / 2); for (let i = -2; i <= 2; i++) bx(g, .02, .5, .02, ferro, i * w / 5, .4, -L / 2);
        bx(g, w, .05, L, ferro, 0, .38); bx(g, w - .05, .16, L - .05, m(o.colchao || '#d8d3c4', { r: .95 }), 0, .43);
        if (o.lencol !== false) bx(g, w - .02, .03, L * .7, m(o.lencol || '#e8e6df', { r: .95 }), 0, .59, L * .14);
        bx(g, w * .6, .1, .35, m(o.travesseiro || '#f1efe8', { r: .95 }), 0, .6, -L / 2 + .3);
        if (o.correias) [-.3, .3].forEach(z => bx(g, w + .04, .02, .08, m('#3a2a1a'), 0, .6, z));
        return g;
      },
      beliche(o) { const g = P.cama(o); const s = P.cama({ ...o, lencol: o.lencol }); s.position.y = 1.15; g.add(s); return g; },
      armario_metal(o) {
        // armário de vestiário (dá para se esconder dentro)
        const g = G(), w = o.w || .5, h = o.h || 1.9, n = o.n || 1, cor = m(o.c || '#59656e', { me: .55, r: .45, tex: 'metal', rep: [1, 3] });
        for (let i = 0; i < n; i++) {
          const x = (i - (n - 1) / 2) * w;
          bx(g, w - .02, h, .5, cor, x);
          for (let k = 0; k < 4; k++) bx(g, w * .6, .015, .01, m('#222'), x, h - .25 - k * .05, .255);
          bx(g, .03, .14, .03, metal('#aaa'), x + w * .3, h * .5, .27);
          if (o.txt) { const t = Array.isArray(o.txt) ? o.txt[i] : o.txt; if (t) pl(g, w * .8, .14, m('#ffffff', { unico: true, mapa: textoTex(t, { w: 256, h: 48, cor: '#f2f2f2', fundo: 'rgba(0,0,0,0)', tam: 30, fonte: 'Impact, Arial Black, sans-serif' }) }), x, h * .72, .256).material.transparent = true; }
        }
        return g;
      },
      maquina_lavar(o) {
        const g = G(), n = o.n || 1;
        for (let i = 0; i < n; i++) {
          const x = (i - (n - 1) / 2) * .78;
          bx(g, .72, .95, .7, m('#d9dcd6', { r: .45, me: .2 }), x);
          const aro = new T.Mesh(guardar(new T.TorusGeometry(.22, .04, 10, 24)), metal('#9aa0a6')); aro.position.set(x, .52, .36); g.add(aro);
          const tambor = G(); tambor.position.set(x, .52, .3); g.add(tambor);
          const roupa = sf(tambor, .18, m(o.roupa || '#d9661f', { r: .9 }), .06, 0, 0, 10); roupa.scale.z = .4;
          pl(g, .4, .4, m('#9fd8ff', { op: .25, r: .05 }), x, .52, .37);
          if (o.gira !== false) anim.push((dt, t) => { tambor.rotation.z += dt * (3 + Math.sin(t * .5 + i) * 2); });
        }
        return g;
      },
      fogao(o) { const g = G(); bx(g, .9, .9, .7, m('#c9ccc8', { me: .4, r: .4 })); [[-.2, -.15], [.2, -.15], [-.2, .15], [.2, .15]].forEach(([a, b]) => cy(g, .09, .09, .02, m('#222'), a, .9, b, 14)); bx(g, .7, .4, .02, m('#111', { op: .8 }), 0, .2, .351); return g; },
      pia(o) { const g = G(), n = o.n || 1; for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * .9; bx(g, .7, .1, .45, m('#e8e8e2', { r: .3 }), x, .8); cy(g, .02, .02, .25, metal('#bbb'), x, .9, -.18, 8); bx(g, .1, .8, .1, m('#d8d8d2'), x); } return g; },
      chuveiro(o) { const g = G(), n = o.n || 1; for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 1.1; cy(g, .015, .015, .5, metal('#aaa'), x, 2.1, 0, 6).rotation.x = .9; cy(g, .08, .04, .05, metal('#bbb'), x, 2.2, .25, 12); } return g; },
      esteira(o) {
        const g = G(); bx(g, .8, .15, 1.8, m('#2b2b2b')); const fita = bx(g, .65, .02, 1.7, m('#111', { unico: true, tex: 'concreto', rep: [1, 6] }), 0, .15);
        [-1, 1].forEach(s => bx(g, .05, 1.1, .05, metal('#555'), s * .37, .15, -.75)); bx(g, .8, .25, .1, m('#333'), 0, 1.2, -.75);
        const tela2 = m('#000', { unico: true, e: '#ff3b2f', ei: 1.4 }); pl(g, .3, .1, tela2, 0, 1.35, -.69);
        anim.push((dt) => { fita.material.map.offset.y -= dt * (o.v ?? 1.5); });
        return g;
      },
      saco_pancada(o) { const g = G(); cy(g, .01, .01, ALT - 1.9, metal('#777'), 0, 1.9); const s = cy(g, .18, .18, .9, m('#5a1d1d', { r: .6 }), 0, 1, 0, 14); const r = rng(o.sem || 45); anim.push((dt, t) => { s.rotation.z = Math.sin(t * 1.3) * .05; }); bx(g, .3, .25, .02, m('#c9b48a'), 0, 1.2, .18).rotation.z = .3; return g; },
      pesos(o) { const g = G(), r = rng(o.sem || 47); for (let i = 0; i < (o.n || 6); i++) { const x = (r() - .5) * 1.6, z = (r() - .5) * 1.2; const d = cy(g, .12, .12, .05, m('#1c1c1c', { me: .6 }), x, 0, z, 16); d.rotation.x = Math.PI / 2; d.position.y = .12; } return g; },
      barra_fixa(o) { const g = G(), aco = metal('#888'); [-1, 1].forEach(s => cy(g, .03, .03, 2.3, aco, s * .6, 0, 0, 8)); const b = cy(g, .02, .02, 1.2, aco, 0, 2.25, 0, 8); b.rotation.z = Math.PI / 2; b.position.y = 2.25; return g; },
      poltronas(o) {
        // fileiras de poltronas (cinema / teatro), opcionalmente com plateia
        const g = G(), fil = o.filas || 3, n = o.n || 6, c = m(o.c || '#6b1220', { tex: 'veludo', r: 1 });
        for (let f = 0; f < fil; f++) for (let i = 0; i < n; i++) {
          const x = (i - (n - 1) / 2) * .62, z = f * .95, y = f * (o.degrau ?? .15);
          bx(g, .55, .45 + y, .5, c, x, 0, z); bx(g, .55, .6, .12, c, x, .45 + y, z + .2);
          if (o.plateia) { const fg = figura({ pose: 'sentado', c: o.roupa || '#d9661f', cab: o.cab || 'normal', bracos: 'colo', sem: f * 9 + i }); fg.position.set(x, y + .02, z - .05); fg.rotation.y = Math.PI; g.add(fg); }
        }
        return g;
      },
      tela_cinema(o) {
        const g = G(), w = o.w || 4.6, h = o.h || 2.2, y = o.y ?? .55;
        bx(g, w + .2, h + .2, .05, m('#111'), 0, y - .1);
        const [c, x] = tela(256, 128), t = texCanvas(c), tm = m('#000', { unico: true, mapa: t, e: '#ffffff', ei: 1 }); tm.emissiveMap = t;
        pl(g, w, h, tm, 0, y + h / 2, .03);
        let ult = 0; const r = rng(o.sem || 49);
        anim.push((dt, tt) => { if (tt - ult < .12) return; ult = tt; const v = 120 + r() * 60; x.fillStyle = `rgb(${v},${v * .95},${v * .85})`; x.fillRect(0, 0, 256, 128); x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(90 + Math.sin(tt * .7) * 20, 70, 30, 44, 0, 0, 7); x.fill(); x.fillRect(0, 0, 256, 10); for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(255,255,255,.15)'; x.fillRect(r() * 256, 0, 1, 128); } t.needsUpdate = true; });
        luz(g, '#d9d4c8', .8, 7, 0, y + h / 2, 1.2, true);
        return g;
      },
      projetor(o) { const g = G(), y = o.y ?? 1.6; bx(g, .4, .3, .6, m('#2d2d2d', { me: .4 }), 0, y); [-1, 1].forEach(s => { const ro = cy(g, .22, .22, .04, metal('#888'), 0, y + .45, s * .2, 20); ro.rotation.x = Math.PI / 2; ro.position.y = y + .45; anim.push(dt => { ro.rotation.y += dt * 2; }); }); return g; },
      caldeira(o) {
        const g = G(), R = o.raio || .8, h = o.h || 2.4, mat = m(o.c || '#5c4033', { me: .6, r: .5, tex: 'metal', rep: [3, 2] });
        cy(g, R, R, h, mat, 0, 0, 0, 24); sf(g, R, mat, 0, h, 0, 24).scale.y = .4;
        const brasa = m('#ff5a00', { unico: true, e: '#ff4400', ei: 2 }); pl(g, .4, .25, brasa, 0, .45, R + .01);
        if (o.canos !== false) for (let i = 0; i < 3; i++) { const c = cy(g, .08, .08, 1.4, metal('#7b3f2a'), R * .6, h - .2 + i * .1, 0, 10); c.rotation.z = Math.PI / 2; c.position.set(R + .5, h - .5 - i * .4, 0); }
        const l = luz(g, '#ff6a1a', 1.2, 5, 0, .6, R + .4);
        anim.push((dt, t) => { const k = .8 + .2 * Math.sin(t * 6 + Math.sin(t * 13)); brasa.emissiveIntensity = 2 * k; l.intensity = 1.2 * k; });
        return g;
      },
      fliperama(o) {
        const g = G(), c = m(o.c || '#1b1464', { r: .5 }); bx(g, .7, 1.8, .7, c); const p = bx(g, .65, .4, .05, m('#111'), 0, 1.05, .35); p.rotation.x = -.3;
        bx(g, .7, .1, .3, c, 0, .95, .45); for (let i = 0; i < 4; i++) sf(g, .03, m(cores[i], { e: cores[i], ei: .6 }), -.2 + i * .13, 1.02, .5, 8);
        const [cv, x] = tela(128, 96), t = texCanvas(cv), tm = m('#000', { unico: true, mapa: t, e: '#ffffff', ei: 1.2 }); tm.emissiveMap = t; const tl = pl(g, .5, .38, tm, 0, 1.3, .36); tl.rotation.x = -.15;
        let ult = 0; anim.push((dt, tt) => { if (tt - ult < .1) return; ult = tt; x.fillStyle = '#05010a'; x.fillRect(0, 0, 128, 96); x.fillStyle = o.cor || '#00ffcc'; x.font = 'bold 14px monospace'; x.fillText(o.txt || 'INSERT COIN', 10, 40 + Math.sin(tt * 3) * 6); x.fillStyle = '#ff2fd0'; x.fillRect((tt * 40) % 128, 70, 8, 8); t.needsUpdate = true; });
        return g;
      },
      pingpong(o) { const g = G(); bx(g, 2.7, .05, 1.5, m('#1d5c3a', { r: .5 }), 0, .74); bx(g, .02, .15, 1.5, m('#eee', { op: .7 }), 0, .79); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bx(g, .05, .74, .05, metal('#444'), a * 1.2, 0, b * .6)); sf(g, .02, m('#ffffff'), .5, .8, .2, 8); return g; },
      banco_madeira(o) { const g = G(), n = o.n || 4, mad = m(o.c || '#6a4b2c', { tex: 'madeira' }); for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * .6; bx(g, .45, .04, .42, mad, x, .45); bx(g, .45, .5, .04, mad, x, .49, -.2); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bx(g, .04, .45, .04, mad, x + a * .19, 0, b * .17)); } return g; },
      trono(o) {
        const g = G(), mad = m(o.c || '#4a3418', { tex: 'madeira', r: .6 }), ouro = m('#c9a227', { me: .8, r: .3 });
        bx(g, .9, .5, .8, mad); bx(g, .9, 2.4, .15, mad, 0, .5, -.35); bx(g, .12, .3, .8, mad, -.45, .5); bx(g, .12, .3, .8, mad, .45, .5);
        const topo = new T.Mesh(guardar(new T.ConeGeometry(.18, .5, 4)), ouro); topo.position.set(0, 3.1, -.35); g.add(topo);
        if (o.rei) { const v = m('#d8b51e', { r: .7, e: '#3a2a00', ei: .3, lado: 2 }); const capa = cy(g, .35, .55, 1.6, v, 0, .5, 0, 12); capa.scale.z = .7; sf(g, .14, v, 0, 2.2, 0, 12); const coroa = cy(g, .14, .13, .1, ouro, 0, 2.33, 0, 10); }
        if (o.vestes) { const v = m('#d8b51e', { r: .8, lado: 2 }); const pano = pl(g, 1.2, 1, v, .2, .02, .8); pano.rotation.x = -Math.PI / 2; }
        return g;
      },
      gancho(o) {
        // ganchos no teto, com corpos ou peças
        const g = G(), n = o.n || 3, esp = o.esp || .8;
        bx(g, n * esp, .06, .06, metal('#6a6a6a'), 0, ALT - .2);
        for (let i = 0; i < n; i++) {
          const x = (i - (n - 1) / 2) * esp; cy(g, .01, .01, .4, metal('#888'), x, ALT - .6, 0, 6);
          if (o.corpo) { const f = figura({ pose: 'em_pe', c: o.c || '#d9661f', cab: o.cab || 'normal', bracos: 'baixo', sem: i }); f.position.set(x, ALT - .6 - 1.72, 0); g.add(f); if (o.etiquetas) pl(g, .16, .08, m('#ffffff', { unico: true, mapa: textoTex(o.etiquetas[i % o.etiquetas.length], { w: 128, h: 64, cor: '#222', fundo: '#f2efe2', tam: 22 }) }), x + .05, ALT - 1.6, .16); }
          else { const p = cy(g, .14, .1, .55, m('#8a2a2a', { r: .5 }), x, ALT - 1.15, 0, 10); p.scale.z = .7; }
        }
        return g;
      },
      manequim(o) { const g = G(), mat = m(o.c || '#c99a86', { r: .45, tex: o.tex }); cy(g, .02, .02, .9, metal('#555'), 0, 0, 0, 6); cy(g, .25, .1, .1, metal('#444'), 0, 0, 0, 12); const t = cy(g, .19, .16, .7, mat, 0, .95, 0, 14); t.scale.z = .7; sf(g, .1, mat, 0, 1.75, 0, 12); for (let i = 0; i < 5; i++) { const lin = bx(g, .005, .5, .01, m('#3a0a0a'), -.12 + i * .06, 1, .14); lin.rotation.z = (i - 2) * .15; } return g; },
      maquina_costura(o) { const g = G(); bx(g, 1, .05, .55, m('#5d4a36', { tex: 'madeira' }), 0, .75); [-1, 1].forEach(s => bx(g, .05, .75, .5, metal('#2f2f2f'), s * .45)); bx(g, .45, .25, .15, m('#1c1c1c', { me: .4 }), 0, .8); bx(g, .1, .2, .15, m('#1c1c1c'), -.18, 1.05); bx(g, .45, .08, .15, m('#1c1c1c'), 0, 1.25); const ag = bx(g, .01, .12, .01, metal('#ddd'), .17, .9); anim.push((dt, t) => { ag.position.y = .9 + Math.abs(Math.sin(t * 14)) * .05; }); return g; },
      balanca(o) { const g = G(); bx(g, .5, .06, .4, m('#ddd', { me: .3 }), 0, 0); cy(g, .02, .02, 1.3, metal('#888'), 0, .06, -.18, 8); const vis = cy(g, .14, .14, .04, m('#f4f4f4'), 0, 1.36, -.18, 18); vis.rotation.x = Math.PI / 2; vis.position.y = 1.36; if (o.txt) pl(g, .2, .08, m('#000', { unico: true, mapa: textoTex(o.txt, { w: 128, h: 48, cor: '#ff3b2f', fundo: '#100', tam: 30 }), e: '#ffffff', ei: .8 }), 0, 1.36, -.155); return g; },
      radio_antigo(o) { const g = G(), n = o.n || 1; for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * .7; bx(g, .6, .4, .35, m(o.c || '#5a4630', { tex: 'madeira' }), x, o.y ?? .76); for (let k = 0; k < 3; k++) { const b = cy(g, .04, .04, .03, m('#ddd'), x - .15 + k * .15, (o.y ?? .76) + .12, .18, 10); b.rotation.x = Math.PI / 2; } pl(g, .4, .12, m('#000', { unico: true, e: '#ffb347', ei: .8 }), x, (o.y ?? .76) + .28, .176); } return g; },
      antena(o) { const g = G(); cy(g, .03, .05, o.h || 2.6, metal('#777'), 0, 0, 0, 8); for (let i = 0; i < 4; i++) { const b = cy(g, .01, .01, .8 - i * .15, metal('#999'), 0, 1 + i * .5, 0, 6); b.rotation.z = Math.PI / 2; b.position.y = 1 + i * .5; } return g; },
      piano(o) { const g = G(), c = m('#1f1410', { r: .3, me: .1 }); bx(g, 1.5, 1.25, .6, c); bx(g, 1.4, .08, .3, m('#f5f5f0'), 0, .72, .38); for (let i = 0; i < 20; i++) bx(g, .03, .03, .18, m('#111'), -.66 + i * .07, .79, .32); bx(g, .4, .3, .02, m('#f1ece0'), 0, .95, .29).rotation.x = -.2; return g; },
      poco(o) {
        // poço vertical (aberto no chão) com a plataforma presa de lado
        const g = G(), R = o.raio || 1.1;
        const anel = new T.Mesh(guardar(new T.RingGeometry(R, R + .25, 32)), m('#3a3a3a', { tex: 'metal' })); anel.rotation.x = -Math.PI / 2; anel.position.y = .01; g.add(anel);
        const buraco = new T.Mesh(guardar(new T.CircleGeometry(R, 32)), m('#000000', { r: 1 })); buraco.rotation.x = -Math.PI / 2; buraco.position.y = .008; g.add(buraco);
        const tubo = new T.Mesh(guardar(new T.CylinderGeometry(R, R, 6, 32, 1, true)), m(o.c || '#4a2a2a', { lado: 2, tex: o.tex || 'metal', r: .6 })); tubo.position.y = -3; g.add(tubo);
        if (o.plataforma !== false) { const pf = bx(g, R * 1.5, .08, R * 1.2, m('#5b5f66', { tex: 'metal', me: .5 }), 0, -.5, 0); pf.rotation.z = .35; }
        if (o.cabos !== false) for (let i = 0; i < 3; i++) { const c = cy(g, .02, .02, 1.6, metal('#555'), (i - 1) * .4, -.4, R * .6, 6); c.rotation.x = .3 * (i - 1); }
        return g;
      },
      gerador(o) {
        const g = G(), mat = m(o.c || '#4e5a3c', { me: .5, r: .5, tex: 'metal', rep: [3, 1] }), w = o.w || 3.2;
        bx(g, w, 1.6, 1.3, mat); cy(g, .55, .55, w * .5, m('#333', { me: .6 }), w * .15, 1.6, 0, 18).rotation.z = Math.PI / 2;
        for (let i = 0; i < 4; i++) bx(g, .05, 1.2, 1.32, m('#333'), -w / 2 + .3 + i * .25, .2);
        const v = G(); g.add(v); if (!o.coracao) anim.push((dt, t) => { v.position.y = Math.sin(t * 40) * .004; g.position.y += 0; });
        else { anim.push((dt, t) => { const k = Math.max(0, Math.sin(t * 5.2)) ** 8 + .6 * Math.max(0, Math.sin(t * 5.2 - 1.1)) ** 8; g.scale.set(1 + k * .015, 1 + k * .02, 1 + k * .015); }); }
        return g;
      },
      painel_botao(o) { const g = G(), y = o.y ?? .9; bx(g, .8, .5, .3, m('#ccc', { me: .3 }), 0, y); cy(g, .07, .07, .05, m('#ffffff', { e: '#ff1a1a', ei: 1.6 }), 0, y + .5, 0, 16); const tampa = bx(g, .22, .14, .22, m('#e0f4ff', { op: .25, r: .05 }), 0, y + .5); if (o.txt) pl(g, .7, .1, m('#ffffff', { unico: true, mapa: textoTex(o.txt, { w: 512, h: 72, cor: '#111', fundo: '#f1c40f', tam: 30 }) }), 0, y + .32, .151); return g; },
      tanque(o) {
        // tanque de vidro com líquido e um corpo dentro
        const g = G(), R = o.raio || .55, h = o.h || 2.2;
        cy(g, R + .08, R + .08, .25, metal('#555'), 0, 0, 0, 20); cy(g, R + .08, R + .08, .2, metal('#555'), 0, h + .25, 0, 20);
        const liq = cy(g, R - .02, R - .02, h - .1, m(o.liq || '#4fb3ff', { unico: true, op: .55, r: .1, e: o.liq || '#4fb3ff', ei: .35 }), 0, .25, 0, 20);
        cy(g, R, R, h, m('#d6f0ff', { op: .18, r: .02 }), 0, .25, 0, 20);
        if (o.corpo !== false) { const f = figura({ pose: 'em_pe', c: o.roupa || '#d9661f', pele: o.pele || '#b9a3a0', h: 1.6, cab: o.cab || 'normal', sem: o.sem }); f.position.y = .3; g.add(f); const ph = rng(o.sem || 3)() * 6; anim.push((dt, t) => { f.position.y = .32 + Math.sin(t * .5 + ph) * .04; f.rotation.y = Math.sin(t * .2 + ph) * .2; }); }
        if (o.luz !== false) luz(g, o.liq || '#4fb3ff', .5, 3, 0, 1.2, R + .3);
        return g;
      },
      porta_cofre(o) {
        const g = G(), R = o.raio || 1.2, aco = m('#7d848c', { me: .8, r: .35 });
        const d = cy(g, R, R, .35, aco, 0, 0, 0, 40); d.rotation.x = Math.PI / 2; d.position.set(0, R + .1, 0);
        const anel = new T.Mesh(guardar(new T.TorusGeometry(R + .05, .1, 10, 40)), m('#4a4f55', { me: .8 })); anel.position.set(0, R + .1, .1); g.add(anel);
        for (let i = 0; i < 3; i++) { const c = cy(g, .2, .2, .03, m('#f4f4f4'), -.5 + i * .5, R + .25, .19, 18); c.rotation.x = Math.PI / 2; const p = bx(g, .02, .16, .01, m('#c0392b'), -.5 + i * .5, R + .25, .21); p.rotation.z = .9; }
        const vid = cy(g, .2, .2, .05, m('#3a6b8a', { op: .5, r: .05 }), 0, R + .9, .18, 18); vid.rotation.x = Math.PI / 2;
        return g;
      },
      esteira_carga(o) {
        const g = G(), L = o.l || 5; bx(g, L, .8, .9, m('#3a3d40', { me: .5 }), 0, 0); const fita = bx(g, L, .04, .8, m('#151515', { unico: true, tex: 'concreto', rep: [6, 1] }), 0, .8);
        const sacos = []; const r = rng(o.sem || 51);
        for (let i = 0; i < 5; i++) { const s = sf(g, .25 + r() * .15, m('#2b2b2b', { r: .9 }), -L / 2 + i * L / 5, 1.05, 0, 10); s.scale.set(1.3, .7, 1); sacos.push(s); }
        anim.push(dt => { fita.material.map.offset.x -= dt * .25; sacos.forEach(s => { s.position.x += dt * .6; if (s.position.x > L / 2) s.position.x = -L / 2; }); });
        return g;
      },
      cano_grande(o) { const g = G(), L = o.l || 6.5, R = o.raio || .5, mat = m(o.c || '#6d3a2a', { me: .5, r: .45 }); const c = cy(g, R, R, L, mat, 0, 0, 0, 20); c.rotation.z = Math.PI / 2; c.position.y = o.y ?? (R + .1); for (let x = -L / 2 + .6; x < L / 2; x += 1.6) { const a = cy(g, R + .06, R + .06, .15, metal('#555'), x, 0, 0, 20); a.rotation.z = Math.PI / 2; a.position.set(x, c.position.y, 0); } if (o.pulsa !== false) anim.push((dt, t) => { const k = 1 + Math.max(0, Math.sin(t * 2.6)) ** 6 * .04; c.scale.set(k, 1, k); }); return g; },
      volante(o) {
        const g = G(), y = o.y ?? 1.3, R = o.raio || .45, mat = o.osso ? m('#e3d8bd', { r: .6 }) : m('#7a4b2a', { me: .7, r: .4 });
        cy(g, .1, .1, y, m('#555', { me: .6 }), 0, 0, 0, 10);
        const v = new T.Mesh(guardar(new T.TorusGeometry(R, .05, 10, 28)), mat); v.position.set(0, y + .05, .15); g.add(v);
        for (let i = 0; i < 4; i++) { const r2 = bx(g, R * 2, .04, .04, mat, 0, y + .03, .15); r2.rotation.z = i * Math.PI / 4; }
        if (o.faiscas) { const fa = sf(g, .06, m('#ffffff', { unico: true, e: '#9fd8ff', ei: 3 }), 0, y - .3, .2, 6); anim.push((dt, t) => { fa.visible = Math.sin(t * 11) > .7; }); luz(g, '#9fd8ff', .6, 3, 0, y, .4, true); }
        return g;
      },
      fornalha(o) {
        const g = G(), mat = m('#7a3b2b', { tex: 'tijolo', rep: [2, 2] }); bx(g, 2.2, 2.2, 1.4, mat); bx(g, .7, 3, .7, mat, 0, 2.2, -.2);
        const fogo = m('#ffffff', { unico: true, e: o.c || '#e8f4ff', ei: 2.4 }); pl(g, 1, .8, fogo, 0, .7, .71);
        const l = luz(g, o.c || '#e8f4ff', 1.6, 6, 0, .9, 1.2); anim.push((dt, t) => { const k = .8 + .2 * Math.sin(t * 9 + Math.sin(t * 17)); l.intensity = 1.6 * k; fogo.emissiveIntensity = 2.4 * k; });
        return g;
      },
      cilindros(o) { const g = G(), r = rng(o.sem || 53), lista = []; for (let i = 0; i < (o.n || 8); i++) { const c = cy(g, .07, .07, .32, metal('#b9bfc6'), (r() - .5) * (o.w || 2), o.y ?? .92, (r() - .5) * .5, 14); lista.push([c, r() * 9]); } anim.push((dt, t) => lista.forEach(([c, f]) => { c.visible = Math.sin(t * 1.7 + f) > -.6; })); return g; },
      agua(o) { const g = G(), w = o.w || 6.6, d = o.d || 6.6; const mat = m(o.c || '#1b1410', { unico: true, op: .82, r: .08, me: .2, tex: 'agua', rep: [3, 3] }); const p = pl(g, w, d, mat, 0, o.y ?? .25, 0); p.rotation.x = -Math.PI / 2; anim.push((dt) => { mat.map.offset.x += dt * .01; mat.map.offset.y += dt * .007; }); return g; },
      bracos(o) { const g = G(), r = rng(o.sem || 55); for (let i = 0; i < (o.n || 4); i++) { const b = G(); b.position.set((r() - .5) * (o.w || 1.8), o.y ?? .95, (r() - .5) * .4); g.add(b); cy(b, .05, .04, .5, metal('#8a9096'), 0, 0, 0, 8).rotation.z = Math.PI / 2 * r(); sf(b, .06, metal('#666'), 0, 0, 0, 8); const mao = bx(b, .1, .04, .14, metal('#9aa0a6'), .2, .1, 0); if (r() < .5) bx(b, .12, .1, .14, m('#9c5a55', { r: .6 }), -.2, 0, 0); } return g; },
      parede_monitores(o) {
        const g = G(), w = o.w || 6, h = o.h || 2.2, y = o.y ?? .5, nx = o.nx || 6, ny = o.ny || 3;
        const [c, x] = tela(512, 256), t = texCanvas(c), tm = m('#000', { unico: true, mapa: t, e: '#ffffff', ei: 1 }); tm.emissiveMap = t;
        bx(g, w + .1, h + .1, .25, m('#1a1a1a'), 0, y - .05);
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const p = pl(g, w / nx - .06, h / ny - .06, tm, -w / 2 + (i + .5) * w / nx, y + (j + .5) * h / ny, .13); const uv = p.geometry.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, (i + uv.getX(k)) / nx, (j + uv.getY(k)) / ny); }
        const r = rng(o.sem || 57); let ult = 0;
        anim.push((dt, tt) => { if (tt - ult < .3) return; ult = tt; x.fillStyle = o.fundo || '#041008'; x.fillRect(0, 0, 512, 256); x.strokeStyle = o.cor || '#1f8f4a'; x.lineWidth = 2; for (let a = 0; a < 5; a++) { x.strokeRect(20 + a * 96, 60, 80, 120); for (let k = 0; k < 3; k++) x.strokeRect(24 + a * 96 + k * 26, 66, 22, 108); } if (o.manchas !== false) { for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(255,30,30,${.25 + r() * .4})`; x.beginPath(); x.arc(20 + r() * 470, 60 + r() * 120, 6 + r() * 14, 0, 7); x.fill(); } } if (o.amarelo) { x.fillStyle = 'rgba(220,180,0,.35)'; x.fillRect(0, 0, 512, 256); } t.needsUpdate = true; });
        luz(g, o.cor || '#4fe08a', .6, 5, 0, y + h / 2, 1);
        return g;
      },
      velas(o) { const g = G(), n = o.n || 3, R = o.raio || .9; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + Math.PI / 2; const v = P.vela({ i: o.i || 1, d: o.d || 5 }); v.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); g.add(v); } return g; },
      ventilador_parede(o) {
        const g = G(), R = o.raio || 2.2, y = o.y ?? 1.5; const aro = new T.Mesh(guardar(new T.TorusGeometry(R, .12, 10, 40)), m('#3a3d40', { me: .6 })); aro.position.set(0, y, .1); g.add(aro);
        const rot = G(); rot.position.set(0, y, .2); g.add(rot); for (let i = 0; i < 5; i++) { const p = bx(rot, .5, R * .95, .05, m('#6d7176', { me: .6, r: .4 }), 0, 0, 0); p.position.set(Math.cos(i / 5 * 6.283) * R * .45, Math.sin(i / 5 * 6.283) * R * .45, 0); p.rotation.z = i / 5 * 6.283 - Math.PI / 2; p.rotation.y = .5; }
        sf(rot, .3, m('#222', { me: .6 }), 0, 0, 0, 14); anim.push(dt => { rot.rotation.z += (o.v ?? 6) * dt; }); return g;
      },
      traje(o) { const g = G(), n = o.n || 3; bx(g, n * .7, .05, .05, metal('#777'), 0, 2.1, 0); for (let i = 0; i < n; i++) { const f = figura({ pose: 'em_pe', c: o.c || '#d8c22a', cab: 'lencol', h: 1.7, sem: i }); f.position.set((i - (n - 1) / 2) * .7, .3, 0); g.add(f); const ph = i * 2.1; anim.push((dt, t) => { f.rotation.y = Math.sin(t * .8 + ph) * (Math.sin(t * .13 + ph) > .8 ? .4 : .03); }); } return g; },
      cordao_veludo(o) { const g = G(), n = o.n || 4, esp = o.esp || 1.2; for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * esp; cy(g, .15, .17, .05, metal('#b8962e'), x, 0, 0, 14); cy(g, .025, .025, .95, metal('#c9a227'), x, .05, 0, 8); sf(g, .05, metal('#c9a227'), x, 1.02, 0, 10); if (i < n - 1) { const c = cy(g, .02, .02, esp, m('#7a0d1d', { tex: 'veludo' }), x + esp / 2, .85, 0, 6); c.rotation.z = Math.PI / 2; c.position.set(x + esp / 2, .85, 0); } } return g; },
      placa_bronze(o) { const g = G(), y = o.y ?? 1.5; const mat = m('#ffffff', { unico: true, mapa: textoTex(o.txt || '', { w: 512, h: 192, cor: '#2a1d08', fundo: '#b08d3a', tam: 34, fonte: 'Georgia, serif' }), me: .6, r: .35 }); bx(g, .62, .26, .03, m('#7a5f22', { me: .7 }), 0, y - .03); pl(g, .58, .22, mat, 0, y + .1, .02); return g; },
      janela(o) {
        // janela que mostra outro lugar (incêndio, escuridão, túnel…)
        const g = G(), w = o.w || 1.4, h = o.h || 1.2, y = o.y ?? 1;
        const [c, x] = tela(256, 220), t = texCanvas(c), tm = m('#000', { unico: true, mapa: t, e: '#ffffff', ei: 1 }); tm.emissiveMap = t;
        const pinta = tt => { const gr = x.createLinearGradient(0, 0, 0, 220); (o.ceu || ['#1a0a05', '#5a1a05', '#ff6a1a']).forEach((cc, i, a) => gr.addColorStop(i / (a.length - 1), cc)); x.fillStyle = gr; x.fillRect(0, 0, 256, 220);
          if (o.cena === 'usina') { x.fillStyle = '#0b0605'; x.fillRect(60, 120, 140, 100); x.fillRect(150, 70, 22, 60); x.fillStyle = `rgba(255,${120 + Math.sin(tt * 3) * 40},20,.85)`; x.beginPath(); x.ellipse(120, 118, 50 + Math.sin(tt * 2) * 6, 22, 0, 0, 7); x.fill(); }
          else if (o.cena === 'tunel') { x.fillStyle = '#020202'; x.fillRect(0, 0, 256, 220); }
          t.needsUpdate = true; };
        pinta(0); if (o.cena === 'usina') { let ult = 0; anim.push((dt, tt) => { if (tt - ult < .15) return; ult = tt; pinta(tt); }); }
        pl(g, w, h, tm, 0, y + h / 2, .02); bx(g, w + .12, .08, .1, m('#e8e2d0'), 0, y - .04); bx(g, w + .12, .08, .1, m('#e8e2d0'), 0, y + h - .04); bx(g, .06, h, .1, m('#e8e2d0'), 0, y); [-1, 1].forEach(s => bx(g, .06, h, .1, m('#e8e2d0'), s * (w / 2 + .03), y));
        if (o.luz !== false) luz(g, (o.ceu || ['#ff6a1a']).slice(-1)[0], .7, 5, 0, y + h / 2, .8, o.cena === 'usina');
        return g;
      },
      barco(o) { const g = G(), mad = m(o.c || '#5a4a32', { tex: 'madeira', r: .8 }); const casco = cy(g, .8, .55, 3.2, mad, 0, .45, 0, 6, 1); casco.rotation.x = Math.PI / 2; casco.scale.set(1, 1, .5); casco.position.set(0, .45, 0); bx(g, 1.5, .5, .1, mad, 0, .5, 1.55); if (o.remos) [-1, 1].forEach(s => { const r2 = bx(g, .05, .05, 2, mad, s * .9, .7, 0); r2.rotation.y = s * .4; }); return g; },
      grama(o) {
        const g = G(), n = o.n || 300, w = o.w || 6.4, r = rng(o.sem || 59);
        const geo = guardar(new T.ConeGeometry(.03, .35, 3)), inst = new T.InstancedMesh(geo, m(o.c || '#4a5a2a', { r: .9 }), n), d = new T.Object3D();
        for (let i = 0; i < n; i++) { d.position.set((r() - .5) * w, .15, (r() - .5) * w); d.rotation.set((r() - .5) * .4, r() * 3, (r() - .5) * .4); d.scale.setScalar(.6 + r() * .9); d.updateMatrix(); inst.setMatrixAt(i, d.matrix); }
        g.add(inst); anim.push((dt, t) => { g.rotation.z = Math.sin(t * 1.3) * .004; });
        return g;
      },
      halo(o) { const g = G(), y = o.y ?? ALT - .15; const a = new T.Mesh(guardar(new T.TorusGeometry(o.raio || 1.2, .05, 10, 48)), m('#ffffff', { unico: true, e: '#ffd23f', ei: 2.4 })); a.rotation.x = Math.PI / 2; a.position.y = y; g.add(a); luz(g, '#ffd23f', 1.2, 8, 0, y - .3, 0); anim.push((dt, t) => { a.rotation.z += dt * .15; a.material.emissiveIntensity = 2 + Math.sin(t * .8) * .5; }); return g; },
      estrela_cadente(o) { const g = G(), s = bx(g, .5, .015, .015, m('#ffffff', { e: '#ffffff', ei: 3 }), 0, ALT - .2, 0); let fase = 0; anim.push((dt) => { fase = (fase + dt / 3) % 1; s.position.x = -3 + fase * 6; s.position.y = ALT - .2 - fase * .4; s.visible = fase < .25; }); return g; },
      berco(o) { const g = G(), n = o.n || 1; for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * .8; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cy(g, .015, .015, .7, metal('#ccc'), x + a * .3, 0, b * .2, 6)); bx(g, .62, .35, .42, m('#d6f0ff', { op: .25, r: .05 }), x, .7); bx(g, .55, .05, .38, m('#c79a86', { tex: 'acolchoado', r: .9 }), x, .72); } return g; },
      portas_fileira(o) { const g = G(), nomes = o.nomes || [], esp = o.esp || .95; nomes.forEach((nm, i) => { const p = P.porta({ c: o.c || '#5a4a3a', w: .8 }); p.position.x = (i - (nomes.length - 1) / 2) * esp; g.add(p); pl(g, .5, .12, m('#ffffff', { unico: true, mapa: textoTex(nm, { w: 256, h: 64, cor: '#f2f2f2', fundo: '#1c1c1c', tam: 30 }) }), p.position.x, 2.25, .06); }); return g; },
      placa_saida(o) { const g = G(), y = o.y ?? 2.2, mat = m('#ffffff', { unico: true, mapa: textoTex(o.txt || '⬅ SAÍDA', { w: 256, h: 96, cor: '#ffffff', fundo: '#0b7a3b', tam: 40 }), e: '#ffffff', ei: .9 }); mat.emissiveMap = mat.map; bx(g, .62, .26, .06, m('#111'), 0, y - .03); pl(g, .58, .22, mat, 0, y + .1, .035); return g; },
      seteira(o) { const g = G(), w = o.w || 1.6, y = o.y ?? 1.4; pl(g, w, .14, m('#ffffff', { unico: true, e: o.c || '#bcc6cf', ei: 1.2 }), 0, y, .015); return g; },
      silhuetas(o) {
        // sombras de pessoas gravadas na parede
        const g = G(), r = rng(o.sem || 61), [c, x] = tela(512, 256); x.clearRect(0, 0, 512, 256); x.fillStyle = 'rgba(15,12,10,.82)';
        for (let i = 0; i < (o.n || 4); i++) { const px = 50 + i * (420 / (o.n || 4)) + r() * 30, esc = .8 + r() * .3; x.beginPath(); x.ellipse(px, 70 * esc + 40, 14 * esc, 17 * esc, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(px - 24 * esc, 90 * esc + 40); x.lineTo(px + 24 * esc, 90 * esc + 40); x.lineTo(px + 18 * esc, 256); x.lineTo(px - 18 * esc, 256); x.fill(); x.fillRect(px - 34 * esc, 95 * esc + 40, 10, 80 * esc); }
        const mat = m('#ffffff', { unico: true, mapa: texCanvas(c), r: .9 }); mat.transparent = true; mat.depthWrite = false; pl(g, o.w || 4, (o.w || 4) / 2, mat, 0, (o.w || 4) / 4 + .02, .012);
        return g;
      },
      cortina(o) { const g = G(), w = o.w || 6, h = o.h || ALT - .1, mat = m(o.c || '#7a0d1d', { tex: 'veludo', r: 1, lado: 2 }); const geo = guardar(new T.PlaneGeometry(w, h, 40, 1)); const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 9) * .08); geo.computeVertexNormals(); const me = new T.Mesh(geo, mat); me.position.y = h / 2; g.add(me); return g; },
      palco(o) { const g = G(), w = o.w || 6, d = o.d || 2.2; bx(g, w, .7, d, m('#3a2614', { tex: 'madeira', rep: [4, 2] })); luz(g, '#fff2cc', o.i || 1.4, 6, 0, 2.6, .2); const foco = new T.Mesh(guardar(new T.CircleGeometry(1, 24)), m('#ffffff', { e: '#fff2cc', ei: .4, op: .4 })); foco.rotation.x = -Math.PI / 2; foco.position.y = .71; g.add(foco); return g; },
      tenda(o) { const g = G(), w = o.w || 6.8, mat = m('#6b6a4a', { r: 1, lado: 2 }); const t = cy(g, .1, w * .72, 1.2, mat, 0, ALT - 1.2, 0, 4, 1); t.rotation.y = Math.PI / 4; [-1, 1].forEach(s => cy(g, .04, .04, ALT, m('#4a3a20'), 0, 0, s * w * .3, 6)); return g; },
      balcao_vidro(o) { const g = G(), w = o.w || 2.6; bx(g, w, .5, .7, m('#d8d8d0', { me: .2 })); bx(g, w, .6, .7, m('#cfeeff', { op: .2, r: .05 }), 0, .5); for (let i = 0; i < 5; i++) { const p = cy(g, .1, .1, .1, m('#9c3a3a', { r: .5 }), -w / 2 + .3 + i * .5, .55, 0, 10); p.scale.x = 1.6; } bx(g, w + .1, .04, .75, m('#bbb', { me: .4 }), 0, 1.1); return g; },
      fenda(o) {
        const g = G(), h = o.h || 2.6, mat = m('#000000', { r: 1 }), borda = m('#7a2a30', { r: .4, e: '#2a0006', ei: .4 });
        const geo = guardar(new T.PlaneGeometry(.45, h, 1, 12)); const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) * (1 - Math.abs(pos.getY(i)) / (h / 2)) + Math.sin(pos.getY(i) * 4) * .05); const me = new T.Mesh(geo, mat); me.position.set(0, h / 2 + .1, .03); g.add(me);
        [-1, 1].forEach(s => { const b = cy(g, .06, .06, h * .9, borda, s * .2, .2, .05, 8); b.scale.x = .7; });
        anim.push((dt, t) => { me.scale.x = 1 + Math.sin(t * .8) * .08; });
        return g;
      },
      fotos(o) { const g = G(), r = rng(o.sem || 63), y = o.y ?? 1.2; for (let i = 0; i < (o.n || 5); i++) { const [c, x] = tela(96, 120); x.fillStyle = '#c9b38a'; x.fillRect(0, 0, 96, 120); x.fillStyle = '#6a5a40'; for (let k = 0; k < 3; k++) { x.beginPath(); x.ellipse(20 + k * 28, 50, 10, 13, 0, 0, 7); x.fill(); x.fillRect(10 + k * 28, 64, 20, 50); } x.strokeStyle = '#eee'; x.lineWidth = 3; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(10 + k * 28, 40 + r() * 6); x.lineTo(30 + k * 28, 58); x.moveTo(30 + k * 28, 40); x.lineTo(10 + k * 28, 60); x.stroke(); } const f = G(); f.position.set((i - ((o.n || 5) - 1) / 2) * .28, y, 0); g.add(f); bx(f, .22, .28, .03, m('#4a3a2a'), 0, 0); pl(f, .18, .22, m('#ffffff', { unico: true, mapa: texCanvas(c) }), 0, .14, .02); f.rotation.x = -.12; } return g; },
      mapa_mundi(o) { const g = G(), w = o.w || 2.4, h = w / 2, y = o.y ?? 1.1, [c, x] = tela(512, 256), r = rng(o.sem || 65); x.fillStyle = '#d9c9a0'; x.fillRect(0, 0, 512, 256); x.fillStyle = '#9c8a60'; for (let i = 0; i < 14; i++) { x.beginPath(); x.ellipse(r() * 512, 40 + r() * 180, 20 + r() * 50, 12 + r() * 30, r() * 3, 0, 7); x.fill(); } x.fillStyle = '#b00'; for (let i = 0; i < (o.marcas || 8); i++) { x.beginPath(); x.arc(r() * 512, 40 + r() * 180, 5, 0, 7); x.fill(); } pl(g, w, h, m('#ffffff', { unico: true, mapa: texCanvas(c), r: .9 }), 0, y + h / 2, .015); return g; },
      cilindro_gigante(o) { const g = G(), R = o.raio || 1.3, L = o.l || 5.5, mat = m('#b9bfc6', { unico: true, me: .85, r: .25 }); const c = cy(g, R, R, L, mat, 0, 0, 0, 32); c.rotation.z = Math.PI / 2; c.position.y = R + .05; const metade = cy(g, R * 1.001, R * 1.001, L / 2, m('#d0d8e0', { unico: true, me: .9, r: .2, op: .5 }), L / 4, 0, 0, 32); metade.rotation.z = Math.PI / 2; metade.position.set(L / 4, R + .05, 0); anim.push((dt, t) => { metade.visible = Math.sin(t * 3.7) * Math.sin(t * 1.3) > -.2; }); if (o.correntes) for (let i = 0; i < 4; i++) { const k = cy(g, .03, .03, ALT, metal('#555'), -L / 2 + .6 + i * 1.2, 0, R + .3, 6); k.rotation.x = .3; } return g; },
      lapide(o) { const g = G(), n = o.n || 1, r = rng(o.sem || 67); for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * .9; const l = bx(g, .55, .8 + r() * .3, .14, m('#6f6f6a', { tex: 'concreto', r: .95 }), x, 0, 0); l.rotation.z = (r() - .5) * .12; if (o.txt) pl(g, .4, .2, m('#ffffff', { unico: true, mapa: textoTex(Array.isArray(o.txt) ? o.txt[i % o.txt.length] : o.txt, { w: 256, h: 128, cor: '#2a2a28', fundo: '#8a8a84', tam: 26 }) }), x, .55, .075); if (o.fofa) { const t = bx(g, .6, .12, 1.4, m('#3a2a1c', { tex: 'terra' }), x, 0, .8); } } return g; },
      mesa_banquete(o) {
        const g = G(), n = o.n || 6, L = n * .7 + .6, mad = m('#3a2410', { tex: 'madeira', r: .5 });
        bx(g, 1.1, .05, L, mad, 0, .75); bx(g, 1.15, .02, L + .05, m('#e8e2d0', { r: .9 }), 0, .8);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bx(g, .07, .75, .07, mad, a * .45, 0, b * (L / 2 - .1)));
        for (let i = 0; i < n; i++) [-1, 1].forEach(s => { const z = -L / 2 + .6 + i * .7; const cad = P.cadeira({ c: '#3a2410' }); cad.position.set(s * .85, 0, z); cad.rotation.y = s * Math.PI / 2; g.add(cad); cy(g, .12, .12, .01, m('#f2f2f2'), s * .3, .82, z, 14); if (o.convidados !== false) { const f = figura({ pose: 'sentado', c: '#2a2a2a', cab: 'costurada', bracos: 'colo', sem: i * 2 + (s > 0) }); f.position.set(s * .8, 0, z); f.rotation.y = -s * Math.PI / 2; g.add(f); } });
        const cab = P.cadeira({ c: '#5a1a10' }); cab.position.set(0, 0, -L / 2 - .5); g.add(cab);
        if (o.cartao) pl(g, .18, .1, m('#ffffff', { unico: true, mapa: textoTex(o.cartao, { w: 256, h: 128, cor: '#222', fundo: '#f5f0e0', tam: 18 }) }), 0, .9, -L / 2 + .15).rotation.x = -.6;
        return g;
      },
      tribuna(o) { const g = G(), mad = m('#4a2e14', { tex: 'madeira' }); bx(g, 2.6, 1.3, .9, mad); bx(g, 2.8, .08, 1, mad, 0, 1.3); if (o.txt) pl(g, 1, .2, m('#ffffff', { unico: true, mapa: textoTex(o.txt, { w: 512, h: 96, cor: '#2a1d08', fundo: '#b08d3a', tam: 40 }), me: .5 }), 0, 1, .46); if (o.toga) { const v = m('#d8b51e', { r: .8, lado: 2 }), t = cy(g, .3, .5, 1.3, v, 0, 1.4, -.2, 10, 1); const ph = 1.3; anim.push((dt, tt) => { t.rotation.y = Math.sin(tt * .7) * .2; t.scale.x = 1 + Math.sin(tt * 1.1 + ph) * .04; }); } return g; },
      escada_espiral(o) {
        const g = G(), R = o.raio || 1.2, ferro = m('#3a3c3f', { me: .7, r: .45 });
        const buraco = new T.Mesh(guardar(new T.CircleGeometry(R + .3, 32)), m('#000000')); buraco.rotation.x = -Math.PI / 2; buraco.position.y = .006; g.add(buraco);
        cy(g, .08, .08, 8, ferro, 0, -8, 0, 10);
        for (let i = 0; i < 40; i++) { const a = i * .45, y = -i * .2; const d = bx(g, R, .04, .3, ferro, R / 2, y, 0); d.position.set(Math.cos(a) * R / 2, y, Math.sin(a) * R / 2); d.rotation.y = -a; }
        if (o.txt) { const p = pl(g, .5, .1, m('#ffffff', { unico: true, mapa: textoTex(o.txt, { w: 256, h: 52, cor: '#c8c8c8', fundo: '#2a2a2a', tam: 24 }) }), R / 2, .05, 0); p.rotation.x = -Math.PI / 2; }
        return g;
      },
      bacias(o) { const g = G(), r = rng(o.sem || 69); for (let i = 0; i < (o.n || 3); i++) { const b = cy(g, .25, .15, .12, m('#b06a3a', { me: .8, r: .35 }), (i - 1) * .55, o.y ?? .78, (r() - .5) * .2, 18); cy(g, .22, .22, .01, m('#6b0a0a', { r: .2 }), b.position.x, (o.y ?? .78) + .09, b.position.z, 18); } return g; },
      potes(o) { const g = G(), r = rng(o.sem || 71); for (let i = 0; i < (o.n || 5); i++) { const x = (i - ((o.n || 5) - 1) / 2) * .22; cy(g, .08, .08, .22, m('#cfe8d0', { op: .4, r: .05 }), x, o.y ?? .78, 0, 12); cy(g, .07, .07, .14, m('#2a1a1a', { op: .8 }), x, (o.y ?? .78) + .02, 0, 12); } return g; },
      painel_controle(o) {
        const g = G(), w = o.w || 4, mat = m('#c4c9b4', { r: .55, me: .2 }); bx(g, w, 1.1, .8, mat); const tamp = bx(g, w, .05, .9, mat, 0, 1.1); tamp.rotation.x = -.35;
        const r = rng(o.sem || 73), ponteiros = [];
        for (let i = 0; i < Math.floor(w / .3); i++) { const x = -w / 2 + .2 + i * .3; const d = cy(g, .09, .09, .02, m('#f4f4ea'), x, 1.6, -.25, 16); d.rotation.x = Math.PI / 2 - .1; d.position.y = 1.6; const p = bx(g, .01, .07, .01, m('#c0392b'), x, 1.6, -.24); ponteiros.push([p, r() * 9]); bx(g, .25, .5, .05, m('#d8dccb'), x, 1.35, -.32); }
        anim.push((dt, t) => ponteiros.forEach(([p, f]) => { p.rotation.z = Math.sin(t * 7 + f) * .25 + Math.sin(t * 23 + f) * .05; }));
        if (o.botao) { cy(g, .1, .1, .06, m('#ffffff', { unico: true, e: '#d63031', ei: .8 }), 0, 1.15, .2, 18); pl(g, .3, .08, m('#ffffff', { unico: true, mapa: textoTex(o.botao, { w: 256, h: 64, cor: '#111', fundo: '#e8e4d0', tam: 36 }) }), 0, 1.2, .37).rotation.x = -.35; }
        return g;
      },
      vagao(o) {
        // interior de vagão de metrô (a sala inteira)
        const g = G(), L = o.l || 6.4;
        // bancos dos dois lados, com um vão no meio (as portas do vagão)
        const seg = (L / 2 - 1) ; [-1, 1].forEach(s => { [-1, 1].forEach(k => { bx(g, .45, .45, seg, m('#2d5aa0', { r: .6 }), s * 1.25, 0, k * (1 + seg / 2)); bx(g, .1, .5, seg, m('#2d5aa0'), s * 1.45, .45, k * (1 + seg / 2)); }); for (let z = -L / 2 + .8; z < L / 2; z += 1.6) pl(g, 1.1, .7, m('#020202', { r: .1, me: .3 }), s * 1.65, 1.6, z).rotation.y = -s * Math.PI / 2; });
        for (let z = -2.1; z <= 2.11; z += 1.4) { cy(g, .025, .025, ALT, metal('#cfd3d8'), .6, 0, z, 8); cy(g, .025, .025, ALT, metal('#cfd3d8'), -.6, 0, z, 8); }
        for (let z = -L / 2 + 1; z < L / 2; z += 1.6) { bx(g, .3, .03, 1.2, m('#ffffff', { e: '#f4f8ff', ei: 1.4 }), 0, ALT - .05, z); }
        luz(g, '#eaf2ff', 1.2, 8, 0, ALT - .4, 0);
        return g;
      },
      abajur(o) { const g = G(), y = o.y ?? .6; cy(g, .08, .1, y, m('#d8c8a0'), 0, 0, 0, 12); const cup = cy(g, .22, .14, .25, m('#f2e2b0', { unico: true, e: '#ffcc66', ei: .6, lado: 2, op: .9 }), 0, y, 0, 16); luz(g, '#ffcc88', .8, 5, 0, y + .1, 0); anim.push(dt => { cup.rotation.y += dt * .6; }); return g; },
      coracoes(o) {
        const g = G(), nx = o.nx || 6, ny = o.ny || 3, w = o.w || 6, mat = m('#8a1d24', { unico: true, r: .35, e: '#3a0004', ei: .4 }), lista = [];
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = sf(g, .22, mat, -w / 2 + (i + .5) * w / nx, .7 + j * .75, .25, 14); c.scale.set(1, 1.15, .8); lista.push(c); }
        for (let i = 0; i < nx - 1; i++) { const t = cy(g, .03, .03, w / nx, m('#e8d0d0', { op: .5 }), -w / 2 + (i + 1) * w / nx, 1.1, .2, 6); t.rotation.z = Math.PI / 2; t.position.set(-w / 2 + (i + 1) * w / nx, 1.1, .2); }
        anim.push((dt, t) => { const k = 1 + (Math.max(0, Math.sin(t * 6.5)) ** 10) * .12 + (Math.max(0, Math.sin(t * 6.5 - 1.1)) ** 10) * .06; lista.forEach(c => c.scale.set(k, 1.15 * k, .8 * k)); mat.emissiveIntensity = .4 + (k - 1) * 4; });
        if (o.txt) pl(g, 3, .3, m('#ffffff', { unico: true, mapa: textoTex(o.txt, { w: 1024, h: 100, cor: '#2ecc71', fundo: '#06140c', tam: 54 }) }), 0, .7 + ny * .75 + .2, .1);
        return g;
      },
      membrana(o) {
        const g = G(), w = o.w || 6.8, h = o.h || ALT - .05, mat = m('#e8b8a8', { unico: true, op: .55, r: .3, lado: 2, e: '#3a1008', ei: .3 });
        const geo = guardar(new T.PlaneGeometry(w, h, 30, 16)), pos = geo.attributes.position, base = pos.array.slice();
        const me = new T.Mesh(geo, mat); me.position.y = h / 2; g.add(me);
        const sombra = pl(g, 1.6, 2.6, m('#000000', { unico: true, op: .35 }), 0, 1.4, -.25);
        anim.push((dt, t) => { for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(base[i * 3] * 1.3 + t) * .05 + Math.sin(base[i * 3 + 1] * 2 + t * .7) * .04); pos.needsUpdate = true; sombra.position.x = Math.sin(t * .15) * w * .4; sombra.material.opacity = .25 + Math.sin(t * .5) * .1; });
        return g;
      },
      vela_grande(o) { const g = G(), h = o.h || 1.8; cy(g, .4, .45, .1, metal('#333'), 0, 0, 0, 18); cy(g, .25, .25, h, m('#efe6d0', { r: .6 }), 0, .1, 0, 20); const ch = new T.Mesh(guardar(new T.ConeGeometry(.08, .28, 12)), m('#ffffff', { unico: true, e: o.c || '#ffcc55', ei: 3 })); ch.position.y = h + .25; g.add(ch); anim.push((dt, t) => { ch.scale.set(1 + Math.sin(t * 13) * .1, 1 + Math.sin(t * 9) * .2, 1); }); luz(g, o.c || '#ffb347', o.i || 2.4, o.d || 9, 0, h + .3, 0, 'vela'); return g; },
      coracao_eletrico(o) {
        const g = G(), R = o.raio || 1.5, y = R + .2, mat = m('#7a4a4a', { r: .4, me: .5, tex: 'carne', rep: [2, 2] });
        const esf = sf(g, R, mat, 0, y, 0, 32); const cab = G(); cab.position.y = y; g.add(cab);
        for (let i = 0; i < 10; i++) { const t = new T.Mesh(guardar(new T.TorusGeometry(R * (.9 + i * .02), .03, 6, 40)), metal('#5a5a5a')); t.rotation.set(i * .6, i * 1.1, 0); cab.add(t); }
        const fa = sf(g, .08, m('#ffffff', { unico: true, e: '#9fd8ff', ei: 3 }), R * .8, y + R * .6, 0, 8);
        luz(g, '#9fd8ff', 1.4, 8, 0, y, R + .5, true);
        anim.push((dt, t) => { esf.rotation.y += dt * .3; cab.rotation.y -= dt * .1; fa.visible = Math.sin(t * 13) > .6; fa.position.set(Math.cos(t * 3) * R, y + Math.sin(t * 5) * R * .7, Math.sin(t * 3) * R); });
        return g;
      },
      mesa_cirurgica(o) {
        const g = G(), L = o.l || 3.4, w = o.w || 1.6; bx(g, w, .1, L, metal('#9aa0a6'), 0, .85); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cy(g, .05, .05, .85, metal('#777'), a * (w / 2 - .1), 0, b * (L / 2 - .1), 8));
        if (o.lencol !== false) { const f = figura({ pose: 'deitado', lencol: true, base: .85, c: '#ecebe6', cab: 'lencol', h: 1.75 }); f.position.z = -.4; g.add(f); }
        const r = rng(o.sem || 75); for (let i = 0; i < 12; i++) { const a = bx(g, .006, .4 + r() * .6, .006, metal('#ddd'), (r() - .5) * (w + 1), .95, (r() - .5) * (L + .6)); a.rotation.set(r() - .5, 0, r() - .5); }
        if (o.mae) { const f = figura({ pose: 'em_pe', c: '#1a1a1a', cab: 'normal', cabelo: '#111', bracos: 'frente', h: 1.85 }); f.position.set(w / 2 + .5, 0, 0); f.rotation.y = -Math.PI / 2; g.add(f); const veu = sf(g, .2, m('#111'), w / 2 + .5, 1.78, 0, 12); veu.scale.set(1, 1.3, 1.1); }
        return g;
      },
      casulo(o) {
        const g = G(), y = o.y ?? 1.4, est = o.estado || 'neutro';
        const cor = est === 'rei' ? '#d8c27a' : est === 'mae' ? '#e8a0a8' : '#d8e0e8', op = est === 'neutro' ? .45 : .85;
        const mat = m(cor, { unico: true, op, r: .3, e: est === 'mae' ? '#3a0010' : '#1a1a10', ei: .4, lado: 2 });
        const c = sf(g, .7, mat, 0, y, 0, 24); c.scale.set(.85, 1.4, .85);
        const sil = figura({ pose: 'em_pe', c: '#2a1a1a', pele: '#2a1a1a', h: 1.1, cab: 'normal', cabelo: false }); sil.position.y = y - .6; sil.scale.setScalar(.9); g.add(sil);
        const cord = cy(g, .12, .12, ALT - y - .9, m('#9c4a4f', { r: .4 }), 0, y + .9, 0, 10);
        for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, cab = cy(g, .03, .03, 1.4, metal('#3a3a3a'), Math.cos(a) * .5, 0, Math.sin(a) * .5, 6); cab.rotation.z = Math.cos(a) * .4; cab.rotation.x = -Math.sin(a) * .4; }
        anim.push((dt, t) => { const k = 1 + Math.sin(t * 1.4) * .04; c.scale.set(.85 * k, 1.4 * k, .85 * k); if (est === 'mae') sil.rotation.y = Math.sin(t * 2) * .5; });
        luz(g, cor, .6, 4, 0, y, .9);
        return g;
      },
      incubadora(o) { const g = G(); const mq = P.maquina({ c: '#9aa3ab', rotulos: ['CALOR', 'FLUXO', 'NUTR.'] }); g.add(mq); const tm = m('#000', { unico: true, mapa: textoTex(o.txt || 'GESTAÇÃO: 87%', { w: 512, h: 96, cor: '#ff9f43', fundo: '#140800', tam: 50, fonte: 'Courier New, monospace', brilho: true }), e: '#ffffff', ei: 1 }); tm.emissiveMap = tm.map; pl(g, 1, .2, tm, 0, 1.7, .41); return g; },
      jaula_sol(o) {
        const g = G(), R = o.raio || .9, h = o.h || 2.2, ferro = m('#2f2f2f', { me: .7, r: .5 });
        for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; cy(g, .02, .02, h, ferro, Math.cos(a) * R, 0, Math.sin(a) * R, 6); }
        [0, h].forEach(y => { const t = new T.Mesh(guardar(new T.TorusGeometry(R, .04, 6, 28)), ferro); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); });
        const cor = o.cor || '#ffffff', sol = sf(g, .3, m('#ffffff', { unico: true, e: cor, ei: 4 }), 0, h / 2, 0, 24);
        const l = luz(g, cor, 3.2, 10, 0, h / 2, 0);
        anim.push((dt, t) => { const k = o.pulsa ? .8 + .2 * Math.max(0, Math.sin(t * 5)) ** 4 : 1; sol.scale.setScalar(k); l.intensity = 3.2 * k; });
        return g;
      },
      moldes(o) { const g = G(), n = o.n || 7, R = o.raio || 2.3; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * .42; const x = Math.cos(a) * R, z = Math.sin(a) * R + R * .6; cy(g, .32, .34, .35, m('#5a5248', { tex: 'concreto' }), x, 0, z, 16); const f = figura({ pose: 'em_pe', c: '#d9c4a8', pele: '#e8d4bc', cab: 'cera', cabelo: false, h: 1.72, sem: i }); f.position.set(x, .35, z); f.rotation.y = -a - Math.PI / 2; g.add(f); } return g; },
      cordao(o) { const g = G(), mat = m('#9c4a4f', { r: .35, e: '#2a0507', ei: .35, tex: 'carne', rep: [1, 3] }); const pts = [new T.Vector3(0, ALT + .1, -1.5), new T.Vector3(.6, 2, -.6), new T.Vector3(-.4, 1, .6), new T.Vector3(.2, -.2, 1.8)]; const me = new T.Mesh(guardar(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, o.raio || .45, 14)), mat); g.add(me); anim.push((dt, t) => { const k = 1 + Math.max(0, Math.sin(t * 2.2)) ** 6 * .05; me.scale.set(k, 1, k); }); return g; },
      escrivaninhas(o) { const g = G(), n = o.n || 12, cols = o.cols || 4; const pos = o.pos || Array.from({ length: n }, (_, i) => [(i % cols - (cols - 1) / 2) * 1.5, (Math.floor(i / cols) - (Math.ceil(n / cols) - 1) / 2) * 1.6]); pos.forEach(([x, z], i) => { const e = P.mesa_escritorio({ papeis: 3, sem: i }); e.position.set(x, 0, z); e.scale.setScalar(.85); g.add(e); }); return g; },
      ninho_simbolo(o) { const g = G(), y = o.y ?? 1.2, R = o.raio || .8, mat = m('#ffffff', { unico: true, e: o.c || '#cfc8e8', ei: .8 }); const a = new T.Mesh(guardar(new T.TorusGeometry(R, .04, 8, 40)), mat); a.position.set(0, y + R, .02); g.add(a); for (let i = 0; i < 3; i++) sf(g, .08, mat, (i - 1) * .3, y + R - .3 + (i % 2) * .15, .03, 8); return g; },
      // botão vermelho de porta, ao lado do vão (o 3D liga o estado)
      botao_porta(o) { const g = G(); bx(g, .16, .26, .05, m('#1b1b1e', { me: .5 }), 0, 1.05); const b = sf(g, .045, m('#ffffff', { unico: true, e: '#ff2020', ei: 1.4 }), 0, 1.18, .04, 12); g.userData.luzBotao = b; return g; },
      pratos(o) {
        const g = G(), n = o.n || 4, y = o.y ?? .77, r = rng(o.sem || 81), comida = o.podre ? ['#4a5a2a', '#3a3a20', '#5a4a3a'] : ['#f2efe2', '#5a3a1a', '#8a3a2a'];
        for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * .5, z = (i % 2 ? .18 : -.18); cy(g, .13, .1, .02, m('#f2f2ee', { r: .3 }), x, y, z, 18); for (let k = 0; k < 3; k++) { const c = sf(g, .035 + r() * .02, m(comida[k], { r: .7 }), x + (r() - .5) * .12, y + .03, z + (r() - .5) * .12, 8); c.scale.y = .5; } if (o.quente) { const v = P.vapor_sobe({ y: y + .05, sem: i }); v.position.set(x, 0, z); g.add(v); } }
        return g;
      },
      vapor_sobe(o) { const g = G(), y = o.y ?? .9, mat = m('#ffffff', { unico: true, op: .12, r: 1 }), r = rng(o.sem || 83), bolas = []; mat.depthWrite = false; for (let i = 0; i < 5; i++) { const b = sf(g, .05 + r() * .04, mat, (r() - .5) * .06, y, (r() - .5) * .06, 8); bolas.push([b, r()]); } anim.push((dt, t) => bolas.forEach(([b, f]) => { const k = (t * .25 + f) % 1; b.position.y = y + k * .45; b.scale.setScalar(.6 + k * 1.4); b.material.opacity = .14 * (1 - k); })); return g; },
      varal(o) {
        const g = G(), w = o.w || 6, n = o.n || 8, r = rng(o.sem || 85), y = o.y ?? 2.1;
        const fio = cy(g, .006, .006, w, m('#ddd'), 0, y, 0, 4); fio.rotation.z = Math.PI / 2; fio.position.y = y;
        const pecas = [];
        for (let i = 0; i < n; i++) { const x = -w / 2 + .4 + i * (w - .8) / Math.max(1, n - 1); const c = ['#d9661f', '#e8e4d8', '#d9661f', '#8a8a84', '#d9661f'][Math.floor(r() * 5)]; const p = pl(g, .5 + r() * .2, .7 + r() * .3, m(c, { r: .95, lado: 2 }), x, y - .4, 0); pecas.push([p, r() * 9]); }
        anim.push((dt, t) => pecas.forEach(([p, f]) => { p.rotation.x = Math.sin(t * .9 + f) * .12; }));
        return g;
      },
      porta_parede(o) { const g = G(); bx(g, 1.1, 2.15, .08, m(o.c || '#8a8f96', { me: .6, r: .4, tex: 'metal' }), 0, 0, .04); bx(g, .06, .4, .08, metal('#ccc'), .4, 1.0, .12); if (o.txt) pl(g, .6, .16, m('#ffffff', { unico: true, mapa: textoTex(o.txt, { w: 256, h: 64, cor: '#111', fundo: '#e8e8e0', tam: 26 }) }), 0, 1.8, .09); return g; },
      canteiro(o) {
        const g = G(), w = o.w || 2, d = o.d || .9, r = rng(o.sem || 87);
        bx(g, w, .45, d, m('#4a3a2a', { tex: 'madeira' })); bx(g, w - .08, .02, d - .08, m('#2a1e14', { tex: 'terra' }), 0, .44);
        const folha = m('#2f6a2a', { r: .6 }), escura = m('#1e2a14', { r: .7 }), fruta = m('#5a1a3a', { r: .4, e: '#200010', ei: .3 });
        for (let i = 0; i < 12; i++) { const x = (r() - .5) * (w - .3), z = (r() - .5) * (d - .3); const c = new T.Mesh(guardar(new T.ConeGeometry(.08, .45 + r() * .4, 5)), r() < .3 ? escura : folha); c.position.set(x, .65, z); c.rotation.set((r() - .5) * .5, r() * 3, (r() - .5) * .5); g.add(c); if (r() < .5) { const f = sf(g, .05, fruta, x + .05, .75 + r() * .3, z, 8); if (r() < .3) sf(g, .012, m('#ffffff', { e: '#ffe0a0', ei: .8 }), x + .07, f.position.y + .02, z + .04, 6); } }
        return g;
      },
      parede_interna(o) { const g = G(); bx(g, o.w || .2, o.h || ALT - .01, o.d || 3, m(o.c || '#6a6a62', { tex: o.tex || 'concreto', rep: [Math.max(1, Math.round((o.d || 3) / 2)), 1], r: .85 })); return g; },
      cabide_habito(o) { const g = G(); cy(g, .02, .02, 1.8, metal('#3a3a3a'), 0, 0, 0, 6); cy(g, .25, .25, .03, metal('#3a3a3a'), 0, 0, 0, 12); bx(g, .5, .03, .03, metal('#3a3a3a'), 0, 1.8); const h = cy(g, .2, .38, 1.4, m('#141414', { r: .95, lado: 2 }), 0, .35, 0, 12); h.scale.z = .6; const c = sf(g, .13, m('#141414', { r: .95 }), 0, 1.85, 0, 10); c.scale.set(1, 1.2, 1); return g; },
      estante_musica(o) { const g = G(); cy(g, .015, .015, 1.1, metal('#2a2a2a'), 0, 0, 0, 6); for (let i = 0; i < 3; i++) { const p = bx(g, .5, .01, .02, metal('#2a2a2a'), 0, 0, 0); p.position.set(Math.cos(i * 2.1) * .2, .02, Math.sin(i * 2.1) * .2); p.rotation.y = -i * 2.1; } const pa = bx(g, .5, .35, .02, metal('#2a2a2a'), 0, 1.05); pa.rotation.x = -.3; pl(g, .44, .3, m('#f2ece0'), 0, 1.26, .04).rotation.x = -.3; return g; },
      /* ---------- Zona Neutra: o Maurício, a banca, o bebedouro e a placa pendurada ---------- */
      // O Maurício: palhaço de mola saindo de uma caixa "PROJ Maurício" (o Mestre o põe em cima da banca)
      mauricio(o) {
        const g = G(), r = rng(o.sem || 41);
        // a caixa azul com faixas vermelhas e a manivela
        const caixaTex = (() => { const [c, x] = tela(256, 256); x.fillStyle = '#1f3f9a'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#b3171f'; x.fillRect(0, 0, 34, 256); x.fillRect(222, 0, 34, 256); x.fillStyle = '#e8c547'; x.fillRect(0, 0, 256, 8); x.fillStyle = '#e8eef8'; x.font = 'bold 58px Arial'; x.textAlign = 'center'; x.fillText('PROJ', 128, 120); x.font = 'bold 44px Arial'; x.fillText('Maurício', 128, 178); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(0,0,0,${.12 * r()})`; x.fillRect(r() * 256, r() * 256, 3, 3); } return texCanvas(c); })();
        const lisa = m('#1f3f9a', { r: .6 }), faces = m('#ffffff', { unico: true, mapa: caixaTex, r: .6 });
        const caixa = new T.Mesh(guardar(new T.BoxGeometry(.56, .5, .56)), [lisa, lisa, m('#2a2a2a'), lisa, faces, lisa]); caixa.position.y = .25; g.add(caixa);
        const man = G(); man.position.set(.29, .25, 0); g.add(man); cy(man, .03, .03, .08, metal('#3a5ab0'), .04, 0, 0, 8).rotation.z = Math.PI / 2; const braco = bx(man, .03, .2, .03, metal('#3a5ab0'), .09, -.18, 0); const cabo = cy(man, .025, .025, .1, m('#1f3f9a'), .14, -.2, 0, 8); cabo.rotation.z = Math.PI / 2;
        // a mola
        const pts = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2 * 6; pts.push(new T.Vector3(Math.cos(a) * .13, i / 120 * .5, Math.sin(a) * .13)); }
        const mola = new T.Mesh(guardar(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 240, .014, 6)), metal('#2a2c30')); mola.position.y = .48; g.add(mola);
        // o palhaço
        const palhaco = G(); palhaco.position.y = .98; g.add(palhaco);
        const bolinhas = (() => { const [c, x] = tela(256, 256); x.fillStyle = '#c0151d'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#1f3fb0'; for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(i * 46 + (j % 2) * 23 + 10, j * 46 + 16, 11, 0, 7); x.fill(); } for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(0,0,0,${.1 * r()})`; x.fillRect(r() * 256, r() * 256, 2, 2); } return texCanvas(c); })();
        const roupa = m('#ffffff', { unico: true, mapa: bolinhas, r: .95 });
        const tronco = cy(palhaco, .19, .25, .5, roupa, 0, 0, 0, 18);
        cy(palhaco, .05, .05, .04, m('#1f3fb0', { r: .9 }), 0, .2, .2, 10).rotation.x = Math.PI / 2;   // pompom
        const gola = new T.Mesh(guardar(new T.CylinderGeometry(.16, .34, .1, 20, 1, true)), m('#1f3fb0', { r: .9, lado: 2 })); gola.position.y = .52; palhaco.add(gola);
        const borda = new T.Mesh(guardar(new T.TorusGeometry(.33, .012, 6, 40)), m('#f2f2f2')); borda.rotation.x = Math.PI / 2; borda.position.y = .48; palhaco.add(borda);
        const bracos = [-1, 1].map(sx => { const b = G(); b.position.set(sx * .2, .4, 0); palhaco.add(b); cy(b, .06, .055, .34, roupa, 0, -.34, 0, 10); cy(b, .07, .07, .06, m('#1f3fb0'), 0, -.38, 0, 10); const mao = sf(b, .07, m('#f0c8a8', { r: .7 }), 0, -.44, 0, 10); mao.scale.set(1.3, .8, .6); sf(b, .03, m('#f0c8a8'), sx * -.06, -.4, .02, 8); b.rotation.z = sx * 2.2; return b; });
        // cabeça: rosto pintado, nariz vermelho, cabelo laranja crespo e chapéu-coco azul
        const rosto = (() => { const [c, x] = tela(256, 256); x.fillStyle = '#efd8c0'; x.fillRect(0, 0, 256, 256); const cx = 64; x.fillStyle = '#fafafa'; x.beginPath(); x.ellipse(cx, 150, 44, 34, 0, 0, 7); x.fill(); [-1, 1].forEach(s2 => { x.beginPath(); x.ellipse(cx + s2 * 18, 108, 14, 20, 0, 0, 7); x.fill(); x.fillStyle = '#111'; x.beginPath(); x.ellipse(cx + s2 * 18, 110, 5, 8, 0, 0, 7); x.fill(); x.lineWidth = 4; x.strokeStyle = '#111'; x.beginPath(); x.arc(cx + s2 * 18, 86, 12, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); x.fillStyle = '#fafafa'; }); x.fillStyle = '#c0151d'; x.beginPath(); x.moveTo(cx - 34, 148); x.quadraticCurveTo(cx, 200, cx + 34, 148); x.quadraticCurveTo(cx, 168, cx - 34, 148); x.fill(); x.fillStyle = '#5a0a0a'; x.beginPath(); x.moveTo(cx - 22, 156); x.quadraticCurveTo(cx, 186, cx + 22, 156); x.quadraticCurveTo(cx, 166, cx - 22, 156); x.fill(); x.fillStyle = 'rgba(220,60,60,.35)'; [-1, 1].forEach(s2 => { x.beginPath(); x.arc(cx + s2 * 40, 140, 10, 0, 7); x.fill(); }); return texCanvas(c); })();
        const cab = G(); cab.position.y = .72; palhaco.add(cab);
        const cabeca = sf(cab, .19, m('#ffffff', { unico: true, mapa: rosto, r: .55 }), 0, 0, 0, 24); cabeca.scale.set(1, 1.08, .95);
        sf(cab, .045, m('#d0101a', { r: .25, e: '#400000', ei: .3 }), 0, -.01, .19, 12);
        const cabelo = m('#e0601a', { r: 1 });
        for (let i = 0; i < 26; i++) { const a = Math.PI * .25 + r() * Math.PI * 1.5; const yy = -.08 + r() * .18; sf(cab, .05 + r() * .025, cabelo, Math.sin(a) * .19, yy, Math.cos(a) * .17 - .02, 8); }
        const chapeu = G(); chapeu.position.y = .14; chapeu.rotation.z = -.15; cab.add(chapeu);
        cy(chapeu, .21, .21, .02, m('#1f3fb0', { r: .7 }), 0, 0, 0, 24); const copa = sf(chapeu, .14, m('#1f3fb0', { r: .7 }), 0, .02, 0, 18); copa.scale.set(1, .85, 1);
        cy(chapeu, .142, .142, .035, m('#e8c547'), 0, .02, 0, 18);
        [0, 1, 2, 3, 4].forEach(k2 => { const pt = sf(chapeu, .022, m('#c0151d'), .11 + Math.cos(k2 * 1.256) * .025, .07 + Math.sin(k2 * 1.256) * .025, .08, 8); }); sf(chapeu, .015, m('#f2d040'), .11, .07, .09, 8);
        // anima: balança na mola, a cabeça inclina e, de vez em quando, dá um tranco
        let tranco = 0;
        anim.push((dt, t) => {
          const b = Math.sin(t * 2.2) * .03 + Math.sin(t * 5.1) * .008; palhaco.position.y = .98 + b; mola.scale.y = 1 + b / .5;
          palhaco.rotation.z = Math.sin(t * 1.1) * .06; palhaco.rotation.y = Math.sin(t * .4) * .25;
          if (Math.sin(t * .53) > .995) tranco = 1; tranco *= .9;
          cab.rotation.z = Math.sin(t * .9) * .18 + tranco * .5; cab.rotation.x = tranco * -.2;
          bracos.forEach((br, i) => { br.rotation.z = (i ? 1 : -1) * (2.2 + Math.sin(t * 1.6 + i) * .15); });
          man.rotation.x = t * .8;
        });
        return g;
      },
      // a banca do Maurício: mesa de madeira com armas, lanternas, latas, máscaras de gás e a placa
      banca_mauricio(o) {
        const g = G(), r = rng(o.sem || 47), w = o.w || 2.8, d = o.d || 1.0, hm = .82;
        const mad = m('#6a4a2e', { tex: 'madeira', rep: [3, 1], r: .85 });
        bx(g, w, .07, d, mad, 0, hm - .07, 0);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bx(g, .08, hm - .07, .08, mad, a * (w / 2 - .08), 0, b * (d / 2 - .08)));
        bx(g, w - .2, .05, d - .2, mad, 0, .12, 0);
        // caixotes e caixas embaixo
        for (let i = 0; i < 3; i++) { const cx2 = -w / 2 + .5 + i * (w - 1) / 2; bx(g, .62, .4, .5, m(['#5a5c5e', '#4a4c4e', '#6a6c6e'][i], { tex: 'metal', r: .6 }), cx2, .17, .05); for (let k = 0; k < 4; k++) bx(g, .1, .12, .2, m(cores[(i + k) % 8], { r: .8 }), cx2 - .2 + k * .13, .57, .05); }
        const topo = hm;
        // lanternas a querosene acesas (verde e vermelha)
        [['#1f6a3a', -w / 2 + .25], ['#9a1a1a', -w / 2 + .62]].forEach(([c2, x2]) => { cy(g, .1, .12, .05, m(c2, { me: .5, r: .4 }), x2, topo, -.25, 12); const vid = cy(g, .08, .08, .2, m('#fff2c0', { unico: true, e: '#ffbb55', ei: 1.6, op: .85 }), x2, topo + .05, -.25, 12); cy(g, .11, .06, .07, m(c2, { me: .5 }), x2, topo + .25, -.25, 12); const al = new T.Mesh(guardar(new T.TorusGeometry(.06, .008, 6, 16, Math.PI)), metal()); al.position.set(x2, topo + .33, -.25); g.add(al); });
        luz(g, '#ffb860', .9, 4, -w / 2 + .45, topo + .4, -.2, 'vela');
        // latas de comida
        for (let i = 0; i < 9; i++) { const x2 = -w / 2 + .2 + (i % 5) * .13, z2 = .05 + Math.floor(i / 5) * .14; cy(g, .045, .045, .1 + (i % 2) * .03, m(cores[(i * 3) % 8], { me: .5, r: .4 }), x2, topo, z2, 12); }
        // lanterna de mão, alicate, chave
        const lt = cy(g, .045, .05, .3, m('#2a2a2a', { me: .4 }), -w / 2 + 1.0, topo + .05, .25, 12); lt.rotation.z = Math.PI / 2; lt.position.y = topo + .05; sf(g, .05, m('#fffbe0', { unico: true, e: '#fff3b0', ei: .8 }), -w / 2 + 1.16, topo + .05, .25, 10);
        bx(g, .28, .08, .18, m('#5a5e64', { me: .6 }), -w / 2 + 1.0, topo, -.2);
        // facas, facões e pistolas enfileirados
        for (let i = 0; i < 8; i++) {
          const x2 = .05 + i * ((w / 2 - .25) / 8), z2 = .22 - (i % 2) * .16, faca = G(); faca.position.set(x2, topo + .012, z2); faca.rotation.y = .3 - r() * .6; g.add(faca);
          const L = .2 + r() * .22; bx(faca, .03, .015, L, metal('#c8ccd2'), 0, 0, -L / 2); bx(faca, .035, .03, .12, m(['#3a2416', '#111', '#5a3a22'][i % 3], { r: .6 }), 0, 0, .06);
        }
        for (let i = 0; i < 3; i++) { const pi = G(); pi.position.set(.15 + i * .38, topo + .015, -.22); pi.rotation.y = -.4 + i * .3; g.add(pi); bx(pi, .03, .05, .2, m('#1a1a1c', { me: .5, r: .4 }), 0, 0, 0); bx(pi, .03, .11, .05, m('#2a1a12'), 0, -.02, .09).rotation.x = .3; }
        // máscaras de gás
        for (let i = 0; i < 3; i++) { const mg = G(); mg.position.set(w / 2 - .3 - i * .32, topo + .13, -.1 + (i % 2) * .2); mg.rotation.set(-.5, -.4 + i * .3, 0); g.add(mg); const face = sf(mg, .12, m('#1c1c1e', { r: .5 }), 0, 0, 0, 14); face.scale.set(1, 1.15, .8); [-1, 1].forEach(s2 => { const l = cy(mg, .045, .045, .03, m('#6a8a9a', { r: .1, me: .6, op: .8 }), s2 * .05, .04, .08, 14); l.rotation.x = Math.PI / 2; l.position.set(s2 * .05, .04, .09); }); const f2 = cy(mg, .05, .05, .09, m('#3a3a3a', { me: .4 }), 0, -.08, .09, 12); f2.rotation.x = Math.PI / 2 - .4; f2.position.set(0, -.08, .11); }
        // a placa de papelão "COMPRE OU TROQUE!"
        const placaTex = (() => { const [c, x] = tela(256, 220); x.fillStyle = '#d8c8a8'; x.fillRect(0, 0, 256, 220); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(90,60,20,${.15 * r()})`; x.fillRect(r() * 256, r() * 220, 3, 3); } x.fillStyle = '#9a1414'; x.font = 'bold italic 54px Georgia, serif'; x.textAlign = 'center'; x.fillText('COMPRE', 128, 70); x.font = 'bold italic 30px Georgia, serif'; x.fillText('ou', 128, 112); x.font = 'bold italic 54px Georgia, serif'; x.fillText('TROQUE!', 128, 170); return texCanvas(c); })();
        const pc = pl(g, .62, .53, m('#ffffff', { unico: true, mapa: placaTex, r: .95 }), -w / 2 + .55, topo - .38, d / 2 + .015); pc.rotation.z = -.05;
        [-1, 1].forEach(s2 => cy(g, .004, .004, .16, m('#bbb'), -w / 2 + .55 + s2 * .2, topo - .14, d / 2 + .01, 4));
        // o próprio Maurício em cima da banca
        if (o.mauricio !== false) { const mau = P.mauricio({ sem: 41 }); mau.position.set(-.15, topo, -.05); mau.rotation.y = o.rm ? o.rm * Math.PI / 180 : 0; g.add(mau); }
        return g;
      },
      // bebedouro de galão
      bebedouro(o) {
        const g = G();
        bx(g, .36, 1.0, .36, m(o.c || '#d8dcdc', { r: .4, me: .2 }));
        bx(g, .3, .02, .14, metal('#888'), 0, .62, .13);
        [[-.06, '#2e86de'], [.06, '#c0392b']].forEach(([x2, c2]) => { bx(g, .04, .06, .05, m(c2), x2, .72, .19); });
        const galao = cy(g, .15, .15, .44, m('#7fc8ff', { unico: true, r: .05, op: .55 }), 0, 1.0, 0, 18);
        cy(g, .06, .15, .06, m('#7fc8ff', { op: .55, r: .05 }), 0, 1.0, 0, 18);
        cy(g, .15, .15, .02, m('#5aa8e0', { op: .7 }), 0, 1.44, 0, 18);
        const agua = cy(g, .14, .14, .3, m('#4aa0e8', { unico: true, op: .5, r: .05, e: '#0a3a6a', ei: .3 }), 0, 1.02, 0, 18);
        anim.push((dt, t) => { agua.scale.y = .95 + Math.sin(t * .7) * .02; });
        return g;
      },
      // placa pendurada no teto por duas correntes (lê dos dois lados)
      placa_teto(o) {
        const g = G(), w = o.w || 3.2, h = o.h || .62, y = o.y ?? (ALT - .35 - h);
        const tex = textoTex(o.txt || '', { w: 1024, h: Math.round(1024 * h / w), cor: o.c || '#1a1a1a', fundo: o.f || '#e2ddd0', tam: o.tam, peso: 'bold' });
        const mat = m('#ffffff', { unico: true, mapa: tex, r: .85, lado: 2 });
        bx(g, w + .08, h + .08, .05, m('#3a2a1a', { r: .7 }), 0, y - .04, -.03);
        pl(g, w, h, mat, 0, y + h / 2, 0); const tras = pl(g, w, h, mat, 0, y + h / 2, -.061); tras.rotation.y = Math.PI;
        [-1, 1].forEach(s2 => cy(g, .008, .008, ALT - y - h, metal('#555'), s2 * w * .38, y + h, -.03, 4));
        const l = new T.Mesh(guardar(new T.BoxGeometry(1.1, .04, .12)), m('#ffffff', { e: '#f4f8ff', ei: 1.2 })); l.position.set(0, ALT - .03, .8); g.add(l);
        return g;
      },
      // parede hipnótica: elipses pretas e brancas e um triângulo invertido em volta do vão da porta
      espiral(o) {
        const g = G(), w = o.w || 9.6, h = o.h || ALT - .02, vao = o.vao || null;
        const [c, x] = tela(1536, Math.round(1536 * h / w)), W2 = c.width, H2 = c.height;
        const ey = H2 * (1 - (o.cy ?? (vao ? (vao[1] + .1) / h : .5)));
        const cxp = W2 / 2;
        for (let i = 26; i >= 0; i--) { x.fillStyle = i % 2 ? '#f2efe8' : '#0d0d0f'; x.beginPath(); x.ellipse(cxp, ey, 40 + i * (W2 * .028), 24 + i * (H2 * .05), 0, 0, 7); x.fill(); }
        // triângulo invertido (borda clara) com o vão da porta no miolo
        const px = W2 / w, topoY = H2 * (1 - (o.triTopo ?? (h - .15)) / h), base = (o.triBase ?? 1.9) * px, apice = H2 * (1 - (o.triApice ?? .3) / h);
        x.lineJoin = 'miter'; x.strokeStyle = '#f6f2ea'; x.lineWidth = .16 * px; x.fillStyle = '#0a0a0c';
        x.beginPath(); x.moveTo(cxp - base, topoY); x.lineTo(cxp + base, topoY); x.lineTo(cxp, apice); x.closePath(); x.fill(); x.stroke();
        x.strokeStyle = '#0a0a0c'; x.lineWidth = .05 * px; x.beginPath(); x.moveTo(cxp - base * .78, topoY + .1 * px); x.lineTo(cxp + base * .78, topoY + .1 * px); x.lineTo(cxp, apice - .25 * px); x.closePath(); x.stroke();
        // o triângulo de luz acima da porta
        const ly = vao ? (vao[1] + (o.triTopo ?? (h - .15))) / 2 : h * .5, lt = .28 * px;
        x.shadowColor = '#ffffff'; x.shadowBlur = 40; x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(cxp - lt, H2 * (1 - (ly + .12) / h)); x.lineTo(cxp + lt, H2 * (1 - (ly + .12) / h)); x.lineTo(cxp, H2 * (1 - (ly - .2) / h)); x.closePath(); x.fill(); x.shadowBlur = 0;
        for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(60,50,40,${Math.random() * .08})`; x.fillRect(Math.random() * W2, Math.random() * H2, 3, 3); }
        const tex = texCanvas(c);
        const mat = m('#ffffff', { unico: true, mapa: tex, r: .85, e: '#ffffff', ei: .06 }); mat.emissiveMap = tex;
        let geo;
        if (vao) {
          const sh = new T.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h); sh.lineTo(-w / 2, h); sh.lineTo(-w / 2, 0);
          const furo = new T.Path(); furo.moveTo(-vao[0] / 2, 0); furo.lineTo(-vao[0] / 2, vao[1]); furo.lineTo(vao[0] / 2, vao[1]); furo.lineTo(vao[0] / 2, 0); furo.lineTo(-vao[0] / 2, 0);
          sh.holes.push(furo); geo = new T.ShapeGeometry(sh);
          const uv = geo.attributes.uv, pos = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + .5, pos.getY(i) / h);
        } else { geo = new T.PlaneGeometry(w, h); geo.translate(0, h / 2, 0); }
        const me = new T.Mesh(guardar(geo), mat); g.add(me);
        const luzT = luz(g, '#ffffff', .5, 4, 0, ly, .5);
        anim.push((dt, t) => { mat.emissiveIntensity = .06 + Math.max(0, Math.sin(t * .8)) * .1; luzT.intensity = .35 + Math.sin(t * .8) * .2; });
        return g;
      },
      geladeira(o) { const g = G(); bx(g, .7, 1.8, .7, m(o.c || '#e8e6e0', { r: .35, me: .1 })); bx(g, .68, .02, .02, m('#888'), 0, 1.2, .36); bx(g, .03, .35, .03, metal('#bbb'), .28, 1.35, .37); bx(g, .03, .5, .03, metal('#bbb'), .28, .5, .37); return g; },
      colunas_anel(o) { const g = G(), n = o.n || 12, R = o.raio || 2.8, mat = o.metal ? metal(o.c || '#6a7078') : m(o.c || '#4a4a52', { r: .7 }); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; if (Math.abs(Math.sin(a)) < .25 || Math.abs(Math.cos(a)) < .25) continue; cy(g, .14, .16, ALT - .01, mat, Math.cos(a) * R, 0, Math.sin(a) * R, 10); } const anel = new T.Mesh(guardar(new T.TorusGeometry(R, .08, 6, 48)), mat); anel.rotation.x = Math.PI / 2; anel.position.y = ALT - .12; g.add(anel); return g; },
      trilhos(o) { const g = G(), L = o.l || 7; [-.35, .35].forEach(dx => { const t = bx(g, .08, .1, L, metal('#5a5e64'), dx, 0, 0); }); for (let z = -L / 2 + .3; z < L / 2; z += .6) bx(g, 1, .06, .18, m('#3a2a1a', { tex: 'madeira' }), 0, 0, z); return g; },
      pegadas(o) {
        const g = G(), n = o.n || 6, r = rng(o.sem || 89), cascos = o.estilo === 'cascos', mat = m(cascos ? '#2a1a14' : '#8a8a84', { op: cascos ? .8 : .5, r: 1 });
        for (let i = 0; i < n; i++) { const z = -i * .55, x = (i % 2 ? .14 : -.14); const p = new T.Mesh(guardar(cascos ? new T.RingGeometry(.04, .08, 12, 1, 0, Math.PI * 1.6) : new T.CircleGeometry(.07, 10)), mat); p.rotation.x = -Math.PI / 2; p.position.set(x, .006, z); if (!cascos) p.scale.set(.7, 1.6, 1); if (o.some) p.material = m('#8a8a84', { unico: true, op: Math.max(0, .55 - i * (.55 / n) * 1.6), r: 1 }); g.add(p); }
        return g;
      },
      tapete_parede(o) { const g = G(), w = o.w || 2, h = o.h || 1.4, y = o.y ?? .9, [c, x] = tela(256, 180), r = rng(o.sem || 91); x.fillStyle = o.c || '#8a2a2a'; x.fillRect(0, 0, 256, 180); x.strokeStyle = '#d8b878'; x.lineWidth = 6; x.strokeRect(10, 10, 236, 160); for (let i = 0; i < 14; i++) { x.fillStyle = ['#d8b878', '#2a3a6a', '#1a1a1a'][i % 3]; x.beginPath(); const px = 40 + (i % 5) * 44, py = 40 + Math.floor(i / 5) * 50; x.moveTo(px, py - 14); x.lineTo(px + 14, py); x.lineTo(px, py + 14); x.lineTo(px - 14, py); x.fill(); } pl(g, w, h, m('#ffffff', { unico: true, mapa: texCanvas(c), r: 1 }), 0, y + h / 2, .015); return g; },
      capacete(o) { const g = G(); const c = new T.Mesh(guardar(new T.SphereGeometry(.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), m('#4a4a32', { r: .6, me: .3 })); c.rotation.x = .5; c.position.y = .02; g.add(c); return g; },
      arvore(o) {
        const g = G(), r = rng(o.sem || 93), casca = m('#3a2a1a', { r: .95 }), folha = m('#2a3a1a', { r: .9 });
        const pts = []; let x = 0, z = 0; for (let i = 0; i < 5; i++) { pts.push(new T.Vector3(x, i * .5, z)); x += (r() - .5) * .4; z += (r() - .5) * .4; }
        g.add(new T.Mesh(guardar(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 16, .07, 6)), casca));
        for (let i = 0; i < 6; i++) { const f = sf(g, .3 + r() * .25, folha, pts[4].x + (r() - .5) * .9, 2 + r() * .4, pts[4].z + (r() - .5) * .9, 8); f.scale.y = .6; }
        return g;
      },
      telescopio(o) { const g = G(), aco = metal('#5a5e66'); [0, 2.1, 4.2].forEach(a => { const p = cy(g, .03, .03, 1.3, aco, Math.cos(a) * .35, 0, Math.sin(a) * .35, 6); p.rotation.set(Math.sin(a) * .25, 0, -Math.cos(a) * .25); }); const tubo = cy(g, .16, .22, 2.2, m('#c8c0a8', { me: .5, r: .35 }), 0, 0, 0, 18); tubo.position.set(0, 1.9, 0); tubo.rotation.x = .25; const furo = new T.Mesh(guardar(new T.CircleGeometry(.6, 24)), m('#000000')); furo.rotation.x = Math.PI / 2; furo.position.y = ALT - .01; g.add(furo); return g; },
      ventilador_mesa(o) { const g = G(), y = o.y ?? .76; cy(g, .08, .1, .03, m('#2a2a2a'), 0, y, 0, 12); cy(g, .015, .015, .25, metal('#888'), 0, y, 0, 6); const gr = new T.Mesh(guardar(new T.TorusGeometry(.13, .008, 6, 20)), metal('#aaa')); gr.position.set(0, y + .32, 0); g.add(gr); const pas = G(); pas.position.set(0, y + .32, 0); g.add(pas); for (let i = 0; i < 3; i++) { const p = bx(pas, .04, .11, .005, m('#3a6a8a'), 0, 0, 0); p.position.set(Math.cos(i * 2.1) * .06, Math.sin(i * 2.1) * .06, 0); p.rotation.z = i * 2.1 - Math.PI / 2; } anim.push(dt => { pas.rotation.z += dt * 18; }); return g; },
      linhas_ausencia(o) { const g = G(), r = rng(o.sem || 95); for (let i = 0; i < (o.n || 3); i++) { const p = pl(g, .12, 4 + r() * 3, m('#000000', { r: 1 }), (r() - .5) * 5, .008, (r() - .5) * 2); p.rotation.x = -Math.PI / 2; p.rotation.z = (r() - .5) * .6; } return g; },
      elevador(o) { const g = G(), ferro = m('#4a4f55', { me: .7, r: .4, tex: 'metal' }); bx(g, 1.6, 2.3, .15, ferro); [-1, 1].forEach(s => bx(g, .75, 2.1, .05, m('#6d747b', { me: .7, r: .35 }), s * .39, .05, .1)); bx(g, .4, .15, .05, m('#ffffff', { e: '#ffb000', ei: 1 }), 0, 2.2, .1); return g; },
    });

    return { P, m, textura, bx, cy, sf, pl, luz, textoTex, G, metal, texCanvas, guardar, figura, cores };
  }
  // caixas de colisão de um objeto da cena: peças grandes e "compostas" (anel de colunas, vagão,
  // fileira de mesas) viram uma caixa por peça, para não bloquear a sala inteira com uma caixa só
  function caixasColisao(T, obj, out = [], prof = 0) {
    const b = new T.Box3().setFromObject(obj);
    if (b.isEmpty()) return out;
    const w = b.max.x - b.min.x, d = b.max.z - b.min.z;
    const filhos = obj.children.filter(c => !c.isLight && !c.isSprite && !c.isPoints);
    if (prof < 3 && filhos.length > 1 && (w * d > 3.2 || Math.max(w, d) > 3.4)) { filhos.forEach(c => caixasColisao(T, c, out, prof + 1)); return out; }
    out.push(b);
    return out;
  }
  // cena feita para uma sala de outro tamanho (ex.: arquivo antigo, de 7,07 m): leva cada item para a sala nova.
  // Quem estava encostado na parede continua encostado; o miolo da sala se espalha; o que ia de parede a
  // parede (tapete, cano, água, trilho) cresce junto. Assim um arquivo antigo continua servindo.
  function ajustarItem(it, ladoVelho, ladoNovo, alt) {
    const H0 = ladoVelho / 2, H1 = ladoNovo / 2, K = ladoNovo / ladoVelho, o = { ...it };
    const f = c => { if (c == null) return c; const a = Math.abs(c), sg = Math.sign(c), d = H0 - a; if (d < 0) return sg * (a + H1 - H0); const w = Math.min(1, Math.max(0, (1.3 - d) / .9)); return +(sg * (w * (a + H1 - H0) + (1 - w) * a * K)).toFixed(3); };
    o.x = f(it.x); o.z = f(it.z);
    ['w', 'l', 'd'].forEach(k => { if (typeof it[k] === 'number' && it[k] >= 5) o[k] = +(it[k] * K).toFixed(2); });
    if (it.t === 'agua') ['w', 'd'].forEach(k => { if (typeof it[k] === 'number') o[k] = +(it[k] * K).toFixed(2); });
    if (['cano_grande', 'esteira_carga', 'trilhos'].includes(it.t) && typeof it.l === 'number') o.l = +(it.l * K).toFixed(2);
    if (['colunas_anel', 'moldes'].includes(it.t) && typeof it.raio === 'number') o.raio = +(it.raio * K).toFixed(2);
    if (Array.isArray(it.pos)) o.pos = it.pos.map(([x, z]) => [f(x), f(z)]);
    if (alt && typeof it.h === 'number' && it.h >= 2.8) o.h = +(it.h + alt - 3).toFixed(2);
    return o;
  }
  window.ACF3D = Object.assign(window.ACF3D || {}, { criarFabrica, rng, tela, caixasColisao, ajustarItem });
})();
