/* sala3d.js · "Entrar na sala": a sala em 3D de verdade (Three.js)
   - O código aqui é só o MOTOR e uma biblioteca de objetos genéricos (cadeira, mesa, rack…).
     O que existe em cada sala (a "cena") NÃO fica no GitHub: vem do arquivo salas-3d.json,
     que o Mestre importa pelo cartão de qualquer sala e que fica nos segredos.
   - Quando o Mestre revela a sala aos jogadores, a tela dele publica a cena no mapa público
     (mapa/m3d/cNN). Sala escondida = cena apagada do mapa público.
   - Mestre vê todas as cenas importadas; auxiliares e jogadores só as das salas reveladas.
   - Three.js é baixado só na primeira vez que alguém abre uma sala em 3D. */
(() => {
  'use strict';
  const URL3 = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const ACF = () => window.ACF;
  const $ = (s, r = document) => r.querySelector(s);
  const pad2 = n => String(n).padStart(2, '0');
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LADO = 10, ALT = 3.2, MEIO = LADO / 2;

  /* ================= dados: de onde vem a cena ================= */
  const cenaDe = cn => {
    const a = ACF(); if (!a) return null;
    const k = 'c' + cn;
    if (a.mestre) return (a.segredos._3d || {})[k] || null;
    return ((a.estado || {}).m3d || {})[k] || null;
  };
  // "impressão digital" da cena: a tela do Mestre só regrava o mapa público quando a cena muda
  const impressao = o => { const s = JSON.stringify(o); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

  let tPub = null;
  const agendarPublicar = () => { const a = ACF(); if (!a || !a.mestre) return; clearTimeout(tPub); tPub = setTimeout(publicar, 500); };
  function publicar() {
    const a = ACF();
    if (!a || !a.mestre || !a.segredosProntos || !a.salaRevelada) return;
    const fonte = a.segredos._3d || {}, atual = (a.estado || {}).m3d || {};
    new Set([...Object.keys(fonte), ...Object.keys(atual)]).forEach(k => {
      const cn = +k.slice(1);
      const quer = fonte[k] && a.salaRevelada(cn) ? fonte[k] : null;
      const hq = quer ? impressao(quer) : null;
      const ha = atual[k] ? atual[k]._h : null;
      if (hq === ha) return;
      a.definir(['m3d', k], quer ? { ...quer, _h: hq } : null);
    });
  }

  /* ================= cartão da sala: botão "Entrar na sala" ================= */
  function blocoMestre(cn) {
    const tem = !!cenaDe(cn);
    const pub = !!(((ACF().estado || {}).m3d || {})['c' + cn]);
    return `<div class="s3d-bloco">
      ${tem ? `<button type="button" data-s3d="abrir">🧊 Entrar na sala (3D)</button>
        <span class="mini">${pub ? 'Os jogadores também podem entrar.' : 'Só você vê: a sala está oculta aos jogadores.'}</span>`
      : '<span class="mini">Sala sem cena 3D.</span>'}
      <button type="button" class="btn-fantasma" data-s3d="importar">Importar cenas 3D (.json)</button>
    </div>`;
  }
  const blocoPublico = cn => cenaDe(cn) ? '<div class="s3d-bloco"><button type="button" data-s3d="abrir">🧊 Entrar na sala (3D)</button></div>' : '';
  function ligarBloco(c, cn) {
    c.querySelectorAll('[data-s3d="abrir"]').forEach(b => b.onclick = () => abrir(cn));
    c.querySelectorAll('[data-s3d="importar"]').forEach(b => b.onclick = importar);
  }

  function importar() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      let d; try { d = JSON.parse(await f.text()); } catch (e) { alert('Arquivo inválido.'); return; }
      if (!d || d.tipo !== 'planta-acf-3d' || !d.salas) { alert('Este arquivo não é um arquivo de cenas 3D da Planta da Caixa.'); return; }
      const n = Object.keys(d.salas).length;
      if (!confirm(`Importar ${n} cena(s) 3D? Elas ficam nos seus segredos e só aparecem aos jogadores nas salas reveladas. Cenas com o mesmo número serão substituídas.`)) return;
      Object.entries(d.salas).forEach(([k, v]) => ACF().gravarSegredo(['_3d', k], v));
      ACF().diario('sessao', `Cenas 3D importadas (${n})`);
      ACF().aviso(`${n} cena(s) 3D importada(s).`);
      setTimeout(() => { agendarPublicar(); ACF().redesenharCartao(); }, 300);
    };
    inp.click();
  }

  function registrar() {
    const a = ACF();
    if (!a || !a.ganchoSala) return setTimeout(registrar, 200);
    a.ganchoSala({ mestre: blocoMestre, publico: blocoPublico, ligar: (c, cn) => ligarBloco(c, cn) });
    a.aoMudar(() => agendarPublicar());
    document.addEventListener('acf-segredos', agendarPublicar);
    agendarPublicar();
  }
  registrar();

  /* ================= carregar o Three.js sob demanda ================= */
  let carregando = null;
  const carregarThree = () => window.THREE ? Promise.resolve() : (carregando = carregando || new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = URL3; s.async = true;
    s.onload = () => ok(); s.onerror = () => { carregando = null; s.remove(); falha(new Error('three')); };
    document.head.appendChild(s);
  }));

  /* ================= utilidades de desenho ================= */
  function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

  function criarFabrica(T, anim, luzes, descartes) {
    const cacheM = new Map(), cacheT = new Map();
    const guardar = x => { descartes.push(x); return x; };
    const texCanvas = (c, rep) => { const t = guardar(new T.CanvasTexture(c)); t.encoding = T.sRGBEncoding; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };

    // texturas de superfície geradas na hora (nada de imagem externa)
    function textura(tipo, cor, rep) {
      const k = tipo + cor + (rep || '');
      if (cacheT.has(k)) return cacheT.get(k);
      const [c, x] = tela(256, 256), r = rng(tipo.length * 31 + cor.length);
      x.fillStyle = cor; x.fillRect(0, 0, 256, 256);
      const ruido = (n, a, tam) => { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${a * r()})`; x.fillRect(r() * 256, r() * 256, tam, tam); } };
      if (tipo === 'azulejo' || tipo === 'xadrez') {
        if (tipo === 'xadrez') { x.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) x.fillRect(i * 64, j * 64, 64, 64); }
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
        if (o.estilo === 'simbolos') { x.font = '20px serif'; for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) x.fillText('ʘǂǁɮʭʬɸƻƾʖɷʘɤ'[Math.floor(r() * 14)], 18 + i * 33, 34 + j * 32 * c.height / 256); x.strokeRect(6, 6, c.width - 12, c.height - 12); }
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

    return { P, m, textura, bx, cy, sf, pl, luz, textoTex };
  }

  /* ================= montagem da cena ================= */
  function montarSala(T, cena, anim, luzes, descartes) {
    const F = criarFabrica(T, anim, luzes, descartes);
    const raiz = new T.Group();
    const piso = cena.piso || {}, par = cena.parede || {}, teto = cena.teto || {};
    // chão
    const ch = F.pl(raiz, LADO, LADO, F.m(piso.c || '#7f8c8d', { tex: piso.tex || 'concreto', rep: [piso.rep || 4, piso.rep || 4], r: piso.r ?? .85 }));
    ch.rotation.x = -Math.PI / 2; ch.receiveShadow = true;
    // paredes viradas para dentro: de fora, a parede da frente some (casa de bonecas)
    const pm = F.m(par.c || '#c9c3b8', { tex: par.tex || 'concreto', rep: [par.rep || 3, 1], r: .9 });
    [[0, -MEIO, 0], [0, MEIO, Math.PI], [-MEIO, 0, Math.PI / 2], [MEIO, 0, -Math.PI / 2]].forEach(([x, z, ry]) => { const p = F.pl(raiz, LADO, ALT, pm, x, ALT / 2, z); p.rotation.y = ry; p.receiveShadow = true; });
    // rodapé escuro, ajuda a ler o volume da sala
    const rod = F.m(par.rodape || '#2b2b2b');
    [[0, -MEIO + .02, 0], [0, MEIO - .02, Math.PI], [-MEIO + .02, 0, Math.PI / 2], [MEIO - .02, 0, -Math.PI / 2]].forEach(([x, z, ry]) => { const p = F.pl(raiz, LADO, .12, rod, x, .06, z); p.rotation.y = ry; });
    // teto (só aparece de dentro)
    const te = F.pl(raiz, LADO, LADO, F.m(teto.c || '#5f5f5f', { tex: teto.tex || 'concreto', rep: [3, 3] }), 0, ALT, 0); te.rotation.x = Math.PI / 2;
    // objetos
    (cena.itens || []).forEach((it, i) => {
      const fab = F.P[it.t]; if (!fab) return;
      let o; try { o = fab({ sem: i + 1, ...it }); } catch (e) { console.warn('3D:', it.t, e); return; }
      // objetos de parede e de mesa usam o próprio "y"; h0 levanta qualquer objeto do chão
      o.position.set(it.x || 0, it.h0 || 0, it.z || 0);
      o.rotation.y = (it.r || 0) * Math.PI / 180;
      if (it.s) o.scale.setScalar(it.s);
      raiz.add(o);
    });
    // sombras: todos os objetos projetam e recebem
    raiz.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    ch.castShadow = false;
    return raiz;
  }

  /* ================= o visualizador (tela cheia) ================= */
  let V = null;
  function criarJanela() {
    if ($('#s3d')) return $('#s3d');
    const d = document.createElement('div');
    d.id = 's3d'; d.className = 's3d'; d.hidden = true;
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Sala em 3D');
    d.innerHTML = `<div class="s3d-palco"></div>
      <div class="s3d-topo"><div class="s3d-tit"><b id="s3dCN"></b><span id="s3dNome"></span></div>
        <button type="button" class="s3d-x" data-s3dv="fechar" aria-label="Fechar">✕</button></div>
      <div class="s3d-msg" id="s3dMsg">Carregando a sala…</div>
      <p class="s3d-dica" id="s3dDica"></p>
      <div class="s3d-barra">
        <button type="button" data-s3dv="fora" class="on" title="Ver a sala por fora, como casa de bonecas">🏠 <span class="s3d-pre">Por </span>fora</button>
        <button type="button" data-s3dv="dentro" title="Ficar dentro da sala e olhar em volta">👁 <span class="s3d-pre">Por </span>dentro</button>
        <button type="button" data-s3dv="cima" title="Vista de cima">⬇ <span class="s3d-pre">De </span>cima</button>
        <button type="button" data-s3dv="luz" title="Acender ou apagar uma luz de serviço">🔦 Luz</button>
      </div>`;
    document.body.appendChild(d);
    d.addEventListener('click', e => {
      const b = e.target.closest('[data-s3dv]'); if (!b || !V) return;
      const k = b.dataset.s3dv;
      if (k === 'fechar') fechar();
      else if (k === 'luz') { V.lanterna = !V.lanterna; V.luzServico.intensity = V.lanterna ? 1.1 : 0; V.amb.intensity = V.ambBase * (V.lanterna ? 2.2 : 1); b.classList.toggle('on', V.lanterna); }
      else { definirModo(k); }
    });
    document.addEventListener('keydown', e => { if (V && !d.hidden && e.key === 'Escape') fechar(); });
    return d;
  }

  function definirModo(k) {
    if (!V) return;
    const c = V.cam;
    $$('.s3d-barra [data-s3dv]').forEach(b => { if (b.dataset.s3dv !== 'luz') b.classList.toggle('on', b.dataset.s3dv === k); });
    // tela em pé (celular): a câmera recua para a sala inteira caber
    const asp = V.camera.aspect || 1, recuo = asp < 1 ? Math.pow(1 / asp, 1.1) : 1;
    if (k === 'dentro') { c.modo = 'dentro'; c.yaw = 0; c.pitch = -.05; c.fov = asp < 1 ? 85 : 70; }
    else if (k === 'cima') { c.modo = 'fora'; c.theta = .0001; c.phi = .06; c.r = 15 * recuo; }
    else { c.modo = 'fora'; c.theta = .62; c.phi = .95; c.r = 14.5 * recuo; }
    const curto = innerWidth < 560;
    $('#s3dDica').textContent = c.modo === 'dentro' ? (curto ? 'Arraste para olhar em volta' : 'Arraste para olhar em volta · pinça ou roda do mouse para aproximar') : (curto ? 'Arraste para girar · pinça para aproximar' : 'Arraste para girar · pinça ou roda do mouse para aproximar');
  }
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  async function abrir(cn) {
    const cena = cenaDe(cn);
    if (!cena) { ACF().aviso('Esta sala ainda não tem cena 3D.'); return; }
    const d = criarJanela();
    if (V) fechar(true);
    d.hidden = false; document.body.classList.add('s3d-aberta');
    $('#s3dCN').textContent = `CN ${pad2(cn)}`;
    const nome = (ACF().nomeSala(cn) || '').replace(/^CN \d+\s*·?\s*/, '');
    $('#s3dNome').textContent = nome;
    const msg = $('#s3dMsg'); msg.hidden = false; msg.textContent = 'Carregando a sala…';
    $('.s3d-x', d).focus();
    try { await carregarThree(); } catch (e) { msg.textContent = 'Não consegui carregar o 3D (sem internet?). Tente de novo.'; return; }
    if (d.hidden) return;
    msg.hidden = true;
    iniciar(cena, d);
  }

  function iniciar(cena, d) {
    const T = window.THREE;
    const palco = $('.s3d-palco', d);
    const celular = Math.min(innerWidth, innerHeight) < 700 || matchMedia('(pointer: coarse)').matches;
    const ren = new T.WebGLRenderer({ antialias: !celular, powerPreference: 'high-performance' });
    ren.setPixelRatio(Math.min(devicePixelRatio || 1, celular ? 1.5 : 2));
    ren.outputEncoding = T.sRGBEncoding; ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = cena.exposicao || 1.25;
    ren.shadowMap.enabled = !celular; ren.shadowMap.type = T.PCFSoftShadowMap;
    palco.appendChild(ren.domElement);
    const cenaT = new T.Scene(); cenaT.background = new T.Color(cena.fundo || '#07060a');
    const nevoaBase = cena.nevoa ? (cena.nevoa.d || .05) : 0;
    if (cena.nevoa) cenaT.fog = new T.FogExp2(cena.nevoa.c || '#000', nevoaBase);
    const anim = [], luzes = [], descartes = [];
    cenaT.add(montarSala(T, cena, anim, luzes, descartes));
    // luz ambiente e luzes da cena
    // luz ambiente com piso mínimo, para nenhuma sala virar um quadrado preto (a CN escura pede amb.min baixo)
    const amb = new T.HemisphereLight(cena.amb?.c || '#bfc6d6', cena.amb?.chao || '#1a1410', Math.max(cena.amb?.i ?? .35, cena.amb?.min ?? .2)); cenaT.add(amb);
    (cena.luzes || []).forEach((l, i) => {
      const L = new T.PointLight(l.c || '#fff', l.i ?? 1, l.d ?? 10, 2); L.position.set(l.x || 0, l.y ?? ALT - .4, l.z || 0); cenaT.add(L); luzes.push(L);
      if (l.pisca) { const base = L.intensity, r = rng(i + 50); anim.push((dt, t) => { L.intensity = base * (Math.sin(t * 2.7 + i) > .92 || r() < .02 ? .1 : 1); }); }
    });
    // uma luz com sombra (só no computador): vem do teto
    // no celular não há sombra: uma luz comum no mesmo lugar mantém o mesmo brilho
    if (celular && cena.sombra !== false) { const s = new T.PointLight(cena.sombraCor || '#fff4e6', (cena.sombraI ?? .8) * .8, 14, 2); s.position.set(1.2, ALT - .4, .8); cenaT.add(s); }
    if (!celular && cena.sombra !== false) { const s = new T.SpotLight(cena.sombraCor || '#fff4e6', cena.sombraI ?? .8, 16, Math.PI / 2.6, .6, 1.5); s.position.set(1.2, ALT - .1, .8); s.target.position.set(0, 0, 0); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -.0005; cenaT.add(s, s.target); }
    const luzServico = new T.PointLight('#ffffff', 0, 14, 2); luzServico.position.set(0, ALT - .3, 0); cenaT.add(luzServico);

    const cam = new T.PerspectiveCamera(50, 1, .05, 80);
    const est = { modo: 'fora', theta: .62, phi: .95, r: 14.5, yaw: 0, pitch: 0, fov: 70 };
    const alvo = new T.Vector3(0, 1.1, 0);
    V = { ren, cena: cenaT, cam: est, camera: cam, anim, descartes, amb, ambBase: amb.intensity, luzServico, lanterna: false, rodando: true, raf: 0, d };
    $$('.s3d-barra [data-s3dv="luz"]').forEach(b => b.classList.remove('on'));

    const tamanho = () => { const w = palco.clientWidth || innerWidth, h = palco.clientHeight || innerHeight; ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    tamanho(); V.tamanho = tamanho; addEventListener('resize', tamanho);
    definirModo('fora');

    // controles: arrastar gira / olha; pinça e roda aproximam
    const pts = new Map(); let dist0 = 0;
    const el = ren.domElement; el.style.touchAction = 'none';
    el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; dist0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    el.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const [px, py] = pts.get(e.pointerId); const dx = e.clientX - px, dy = e.clientY - py; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const dd = Math.hypot(a[0] - b[0], a[1] - b[1]); if (dist0) zoom((dist0 - dd) * .02); dist0 = dd; return; }
      if (est.modo === 'dentro') { est.yaw -= dx * .005; est.pitch = Math.max(-1.2, Math.min(1.2, est.pitch - dy * .005)); }
      else { est.theta -= dx * .006; est.phi = Math.max(.06, Math.min(1.45, est.phi - dy * .006)); }
    });
    const solta = e => { pts.delete(e.pointerId); if (pts.size < 2) dist0 = 0; };
    el.addEventListener('pointerup', solta); el.addEventListener('pointercancel', solta);
    el.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY * .01); }, { passive: false });
    function zoom(k) { if (est.modo === 'dentro') est.fov = Math.max(35, Math.min(100, est.fov + k * 8)); else est.r = Math.max(4, Math.min(30, est.r + k * 1.2)); }

    let t0 = performance.now(), tt = 0;
    const quadro = agora => {
      if (!V || !V.rodando) return;
      V.raf = requestAnimationFrame(quadro);
      const dt = Math.min(.05, (agora - t0) / 1000); t0 = agora; tt += dt;
      for (let i = 0; i < anim.length; i++) anim[i](dt, tt);
      // névoa: por fora a câmera fica longe, então a névoa afina para a sala continuar legível
      if (cenaT.fog) cenaT.fog.density = nevoaBase * (est.modo === 'dentro' ? 1 : .3);
      if (est.modo === 'dentro') {
        cam.fov += (est.fov - cam.fov) * .2; cam.position.set(0, 1.6, 3.6);
        cam.lookAt(cam.position.x + Math.sin(est.yaw) * -1 * Math.cos(est.pitch), 1.6 + Math.sin(est.pitch), cam.position.z - Math.cos(est.yaw) * Math.cos(est.pitch));
      } else {
        cam.fov += (50 - cam.fov) * .2;
        cam.position.set(alvo.x + est.r * Math.sin(est.phi) * Math.sin(est.theta), alvo.y + est.r * Math.cos(est.phi), alvo.z + est.r * Math.sin(est.phi) * Math.cos(est.theta));
        cam.lookAt(alvo);
      }
      cam.updateProjectionMatrix();
      ren.render(cenaT, cam);
    };
    V.raf = requestAnimationFrame(quadro);
    V.retomar = () => { if (V && !V.rodando) { V.rodando = true; t0 = performance.now(); V.raf = requestAnimationFrame(quadro); } };
  }

  document.addEventListener('visibilitychange', () => { if (!V) return; if (document.hidden) { V.rodando = false; cancelAnimationFrame(V.raf); } else V.retomar && V.retomar(); });

  function fechar(trocando) {
    if (V) {
      V.rodando = false; cancelAnimationFrame(V.raf);
      removeEventListener('resize', V.tamanho);
      V.descartes.forEach(x => { try { x.dispose && x.dispose(); } catch (e) {} });
      try { V.ren.dispose(); V.ren.forceContextLoss && V.ren.forceContextLoss(); } catch (e) {}
      V.ren.domElement.remove();
      V = null;
    }
    if (trocando) return;
    const d = $('#s3d'); if (d) d.hidden = true;
    document.body.classList.remove('s3d-aberta');
  }

  // para outros módulos e para testes
  window.Sala3D = { abrir, fechar, cenaDe, publicar: agendarPublicar, get aberta() { return !!V; } };
})();
