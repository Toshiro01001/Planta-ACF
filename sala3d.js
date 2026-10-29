/* sala3d.js · "Entrar na sala": a sala em 3D de verdade (Three.js)
   - O código aqui é só o MOTOR e uma biblioteca de objetos genéricos (cadeira, mesa, rack…).
     O que existe em cada sala (a "cena") NÃO fica no GitHub: vem do arquivo salas-3d.json,
     que o Mestre importa pelo cartão de qualquer sala e que fica nos segredos.
   - Quando o Mestre revela a sala aos jogadores, a tela dele publica a cena no mapa público
     (mapa/m3d/cNN). Sala escondida = cena apagada do mapa público.
   - Mestre vê todas as cenas importadas; auxiliares, as das salas reveladas; o JOGADOR só entra
     na sala onde a ficha dele está (se a ficha sai, a vista fecha ou acompanha a ficha).
   - Duas vistas: a sala sozinha ("casa de bonecas") e o andar inteiro, com corredores e as portas
     no estado público (fechada, aberta, trancada, escombros, carne).
   - Por dentro, anda-se com WASD/setas (Shift corre) ou com o joystick na tela do celular.
   - Cada cena pode ter um som ambiente ("som"), gerado na hora pelo navegador (sem arquivos).
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

  /* ================= cartão da sala: botões "Entrar na sala" e "Andar inteiro" ================= */
  const botoes = () => `<button type="button" data-s3d="abrir">🧊 Entrar na sala (3D)</button>${typeof LAYOUT !== 'undefined' ? '<button type="button" data-s3d="andar">🏢 Andar inteiro (3D)</button>' : ''}`;
  function blocoMestre(cn) {
    const tem = !!cenaDe(cn);
    const pub = !!(((ACF().estado || {}).m3d || {})['c' + cn]);
    return `<div class="s3d-bloco">
      ${tem ? `${botoes()}
        <span class="mini">${pub ? 'Publicada: o jogador entra quando a ficha dele estiver nesta sala.' : 'Só você vê: a sala está oculta aos jogadores.'}</span>`
      : '<span class="mini">Sala sem cena 3D.</span>'}
      <button type="button" class="btn-fantasma" data-s3d="importar">Importar cenas 3D (.json)</button>
    </div>`;
  }
  // jogador: o botão só aparece com a ficha dele EM CIMA da sala; auxiliar: em toda sala revelada
  function blocoPublico(cn) {
    const a = ACF();
    if (!cenaDe(cn)) return '';
    if (a.aux || (a.meu && a.salaDe(a.meu) === cn)) return `<div class="s3d-bloco">${botoes()}</div>`;
    return a.meu ? '<div class="s3d-bloco"><span class="mini">🧊 Leve sua cobaia até esta sala para entrar nela em 3D.</span></div>' : '';
  }
  function ligarBloco(c, cn) {
    c.querySelectorAll('[data-s3d="abrir"]').forEach(b => b.onclick = () => abrir(cn));
    c.querySelectorAll('[data-s3d="andar"]').forEach(b => b.onclick = () => abrir(cn, { andar: true }));
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

  /* ================= montagem: objetos da cena ================= */
  // objetos que não atrapalham a caminhada (estão no chão, na parede ou no teto)
  const SEM_COLISAO = new Set(['tapete', 'ralo', 'cabos', 'ventilador', 'luminaria', 'lampada', 'placa', 'quadro', 'cartaz', 'pintura', 'relogio', 'telao', 'senhas', 'espelho', 'triangulo', 'rasgos', 'canos', 'gotas', 'mural', 'helice', 'porta', 'porta_dupla']);
  const RAIO = .25;     // "largura" de quem anda (distância mínima das paredes e dos móveis)

  function montarItens(F, cena, pai, semPortas) {
    (cena.itens || []).forEach((it, i) => {
      if (semPortas && it.t === 'porta') return;      // no andar inteiro, as portas de verdade são os vãos dos corredores
      const fab = F.P[it.t]; if (!fab) return;
      let o; try { o = fab({ sem: i + 1, ...it }); } catch (e) { console.warn('3D:', it.t, e); return; }
      // objetos de parede e de mesa usam o próprio "y"; h0 levanta qualquer objeto do chão
      o.position.set(it.x || 0, it.h0 || 0, it.z || 0);
      o.rotation.y = (it.r || 0) * Math.PI / 180;
      if (it.s) o.scale.setScalar(it.s);
      o.userData.t = it.t;
      pai.add(o);
    });
  }

  // caixas (no chão) que bloqueiam a caminhada: uma por móvel, já com a folga de quem anda
  function obstaculos(T, pai) {
    const out = [], b = new T.Box3();
    pai.updateMatrixWorld(true);
    pai.children.forEach(o => {
      const t = o.userData.t;
      if (!t || SEM_COLISAO.has(t)) return;
      b.setFromObject(o);
      if (b.isEmpty() || b.max.y < .25 || b.min.y > 1.8) return;
      out.push([b.min.x - RAIO, b.max.x + RAIO, b.min.z - RAIO, b.max.z + RAIO]);
    });
    return out;
  }
  const dentroDe = (r, x, z) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3];

  // procura o ponto livre mais perto (em espiral), para ninguém nascer dentro de um armário
  function pontoLivre(livre, x, z) {
    if (livre(x, z)) return [x, z];
    for (let raio = .3; raio < 7; raio += .3) for (let k = 0; k < 16; k++) {
      const ang = k / 16 * Math.PI * 2, nx = x + Math.cos(ang) * raio, nz = z + Math.sin(ang) * raio;
      if (livre(nx, nz)) return [nx, nz];
    }
    return [x, z];
  }

  // várias peças estáticas viram UMA malha por material (bem menos trabalho para o celular)
  function criarLote(T, descartes) {
    const porMat = new Map();
    const por = (mat, g) => { if (!porMat.has(mat)) porMat.set(mat, []); porMat.get(mat).push(g); };
    return {
      caixa(mat, w, h, d, x, y, z) { const g = new T.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); por(mat, g); },
      plano(mat, w, h, x, y, z, rx, ry) { const g = new T.PlaneGeometry(w, h); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); por(mat, g); },
      montar(pai) {
        porMat.forEach((gs, mat) => {
          let nv = 0, ni = 0;
          gs.forEach(g => { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
          const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
          let ov = 0, oi = 0;
          gs.forEach(g => {
            const p = g.attributes.position;
            pos.set(p.array, ov * 3); nor.set(g.attributes.normal.array, ov * 3); uv.set(g.attributes.uv.array, ov * 2);
            if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[oi + i] = a[i] + ov; oi += a.length; }
            else { for (let i = 0; i < p.count; i++) idx[oi + i] = ov + i; oi += p.count; }
            ov += p.count; g.dispose();
          });
          const geo = new T.BufferGeometry();
          geo.setAttribute('position', new T.BufferAttribute(pos, 3));
          geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
          geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
          geo.setIndex(new T.BufferAttribute(idx, 1));
          geo.computeBoundingSphere(); descartes.push(geo);
          const me = new T.Mesh(geo, mat); me.receiveShadow = true; pai.add(me);
        });
        porMat.clear();
      }
    };
  }

  /* ---------- modo SALA: uma sala só, com paredes de casa de bonecas ---------- */
  function montarSala(T, cena, anim, luzes, descartes) {
    const F = criarFabrica(T, anim, luzes, descartes);
    const raiz = new T.Group();
    const piso = cena.piso || {}, par = cena.parede || {}, teto = cena.teto || {};
    const ch = F.pl(raiz, LADO, LADO, F.m(piso.c || '#7f8c8d', { tex: piso.tex || 'concreto', rep: [piso.rep || 4, piso.rep || 4], r: piso.r ?? .85 }));
    ch.rotation.x = -Math.PI / 2; ch.receiveShadow = true;
    // paredes viradas para dentro: de fora, a parede da frente some (casa de bonecas)
    const pm = F.m(par.c || '#c9c3b8', { tex: par.tex || 'concreto', rep: [par.rep || 3, 1], r: .9 });
    [[0, -MEIO, 0], [0, MEIO, Math.PI], [-MEIO, 0, Math.PI / 2], [MEIO, 0, -Math.PI / 2]].forEach(([x, z, ry]) => { const p = F.pl(raiz, LADO, ALT, pm, x, ALT / 2, z); p.rotation.y = ry; p.receiveShadow = true; });
    const rod = F.m(par.rodape || '#2b2b2b');
    [[0, -MEIO + .02, 0], [0, MEIO - .02, Math.PI], [-MEIO + .02, 0, Math.PI / 2], [MEIO - .02, 0, -Math.PI / 2]].forEach(([x, z, ry]) => { const p = F.pl(raiz, LADO, .12, rod, x, .06, z); p.rotation.y = ry; });
    const te = F.pl(raiz, LADO, LADO, F.m(teto.c || '#5f5f5f', { tex: teto.tex || 'concreto', rep: [3, 3] }), 0, ALT, 0); te.rotation.x = Math.PI / 2;
    montarItens(F, cena, raiz, false);
    raiz.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    ch.castShadow = false;
    return raiz;
  }

  // luz ambiente com piso mínimo, para nenhuma sala virar um quadrado preto
  const ambDe = c => ({ i: Math.max(c.amb?.i ?? .35, c.amb?.min ?? .2), c: c.amb?.c || '#bfc6d6', chao: c.amb?.chao || '#1a1410' });

  function mundoSala(ctx, cena, cn) {
    const { T } = ctx;
    const anim = [], luzes = [];
    const raiz = montarSala(T, cena, anim, luzes, ctx.descartes);
    ctx.cena.add(raiz);
    (cena.luzes || []).forEach((l, i) => {
      const L = new T.PointLight(l.c || '#fff', l.i ?? 1, l.d ?? 10, 2); L.position.set(l.x || 0, l.y ?? ALT - .4, l.z || 0); ctx.cena.add(L);
      if (l.pisca) { const base = L.intensity, r = rng(i + 50); anim.push((dt, t) => { L.intensity = base * (Math.sin(t * 2.7 + i) > .92 || r() < .02 ? .1 : 1); }); }
    });
    // uma luz com sombra (só no computador); no celular, uma luz comum no mesmo lugar mantém o brilho
    if (ctx.celular && cena.sombra !== false) { const s = new T.PointLight(cena.sombraCor || '#fff4e6', (cena.sombraI ?? .8) * .8, 14, 2); s.position.set(1.2, ALT - .4, .8); ctx.cena.add(s); }
    if (!ctx.celular && cena.sombra !== false) { const s = new T.SpotLight(cena.sombraCor || '#fff4e6', cena.sombraI ?? .8, 16, Math.PI / 2.6, .6, 1.5); s.position.set(1.2, ALT - .1, .8); s.target.position.set(0, 0, 0); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -.0005; ctx.cena.add(s, s.target); }
    // atmosfera fixa
    const am = ambDe(cena); ctx.amb.intensity = am.i; ctx.amb.color.set(am.c); ctx.amb.groundColor.set(am.chao);
    ctx.cena.background = new T.Color(cena.fundo || '#07060a');
    const nevoaBase = cena.nevoa ? (cena.nevoa.d || .05) : 0;
    if (cena.nevoa) ctx.cena.fog = new T.FogExp2(cena.nevoa.c || '#000', nevoaBase);
    ctx.ren.toneMappingExposure = cena.exposicao || 1.25;
    const obst = obstaculos(T, raiz);
    const lim = MEIO - RAIO - .05;
    const livre = (x, z) => Math.abs(x) <= lim && Math.abs(z) <= lim && !obst.some(r => dentroDe(r, x, z));
    return {
      tipo: 'sala', livre, inicio: { x: 0, z: 3.6, yaw: 0 },
      alvo: () => [0, 0], rFora: 14.5, rCima: 15, rMin: 4, rMax: 30, ambBase: am.i,
      atualizar(dt, t, x, z, modo) {
        for (let i = 0; i < anim.length; i++) anim[i](dt, t);
        // por fora a câmera fica longe: a névoa afina para a sala continuar legível
        if (ctx.cena.fog) ctx.cena.fog.density = nevoaBase * (modo === 'dentro' ? 1 : .3);
      },
      rotulo: () => cn,
      sons: () => cena.som ? [{ k: 'c' + cn, som: cena.som, g: 1 }] : [],
      descartar() {}
    };
  }

  /* ---------- modo ANDAR: as 25 salas do andar ligadas pelos corredores ----------
     Escala: 1 quadradinho da planta = 2 m. Cada sala tem 10 m; cada corredor, 4 m.
     As portas dos corredores mostram o estado PÚBLICO (mapa/portas): fechada, aberta,
     trancada, escombros ou carne. Porta que não está aberta barra a passagem
     (o Mestre atravessa, como um fantasma, para conferir as salas). */
  const PASSO = 14, VAO = 1.6, VAO_H = 2.2, OFF = 3.2, CORR_W = 2.4, CORR_H = 2.6, ESP = .2;
  const lay = () => (typeof LAYOUT !== 'undefined' && Array.isArray(LAYOUT) ? LAYOUT : null);
  const POS5 = {}, CORR = [];
  (() => {
    const L = lay(); if (!L) return;
    L.forEach((l, r) => l.forEach((p, c) => { POS5[p] = { r, c }; }));
    // mesma ordem dos corredores do app.js (é o número "c" das portas)
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      if (c < 4) CORR.push({ eixo: 'h', p1: L[r][c], p2: L[r][c + 1] });
      if (r < 4) CORR.push({ eixo: 'v', p1: L[r][c], p2: L[r + 1][c] });
    }
  })();
  const centro = p => [POS5[p].c * PASSO - 28, POS5[p].r * PASSO - 28];
  // ponto da planta (quadradinhos) -> metros no 3D
  const planta3D = (x, y) => [x * 2 - 37, y * 2 - 37];
  function salaNoPonto(x, z) {
    const L = lay(); if (!L) return null;
    const c = Math.round((x + 28) / PASSO), r = Math.round((z + 28) / PASSO);
    if (c < 0 || c > 4 || r < 0 || r > 4) return null;
    const p = L[r][c], [cx, cz] = centro(p);
    return Math.abs(x - cx) <= 5.05 && Math.abs(z - cz) <= 5.05 ? p : null;
  }
  // h: corredor no sentido X (sala da esquerda -> direita) · v: no sentido Z (de cima -> para baixo)
  function geoCorr(k) {
    const [ax, az] = centro(k.p1);
    return k.eixo === 'h' ? { h: true, a0: ax + 5, a1: ax + 9, linha: az - OFF, mx: ax + 7, mz: az - OFF }
      : { h: false, a0: az + 5, a1: az + 9, linha: ax + OFF, mx: ax + OFF, mz: az + 7 };
  }
  function estadoPorta(a, ci) {
    const v = (((ACF().estado || {}).portas) || {})['a' + a + 'c' + ci];
    if (!v) return 'f';
    if (v === 'a') return 'a';
    if (typeof v === 'string' && v.startsWith('p')) return 'p';
    if (typeof v === 'string' && v.startsWith('k:')) return 'tk';
    return ['t', 'tk', 'd', 'c'].includes(v) ? v : 'f';
  }

  function mundoAndar(ctx, a, quem, minha, base) {
    const { T, celular } = ctx;
    const F = criarFabrica(T, [], [], ctx.descartes);
    const raiz = new T.Group(), tetos = new T.Group();
    ctx.cena.add(raiz); raiz.add(tetos);
    const fantasma = quem === 'mestre';

    // quem enxerga o quê: Mestre, todas; auxiliar, as reveladas; jogador, só a sala da própria cobaia
    const S = {};
    for (let p = 1; p <= 25; p++) {
      const cn = 25 * (a - 1) + p, [cx, cz] = centro(p);
      const aberta = quem === 'mestre' ? true : quem === 'aux' ? !!ACF().salaRevelada(cn) : cn === minha;
      S[p] = { p, cn, cx, cz, aberta, cena: aberta ? cenaDe(cn) : null };
    }
    const temLado = (p, l) => { const { r, c } = POS5[p]; return l === 'n' ? r > 0 : l === 's' ? r < 4 : l === 'w' ? c > 0 : c < 4; };

    /* ----- cascas das salas (chão, paredes com vãos, teto) ----- */
    const mSelada = F.m('#050407', { r: 1 }), mBatente = F.m('#26262b', { r: .5, me: .4 });
    function parede(lt, mat, rod, eixoX, fixo, de, ate, vao, sinal) {
      const segs = vao ? [[de, vao[0]], [vao[1], ate]] : [[de, ate]];
      segs.forEach(([u0, u1]) => {
        const L = u1 - u0; if (L < .01) return; const m = (u0 + u1) / 2, f = fixo + sinal * (ESP / 2 + .012);
        if (eixoX) { lt.caixa(mat, L, ALT, ESP, m, 0, fixo); lt.caixa(rod, L, .12, .02, m, 0, f); }
        else { lt.caixa(mat, ESP, ALT, L, fixo, 0, m); lt.caixa(rod, .02, .12, L, f, 0, m); }
      });
      if (vao) {
        const L = vao[1] - vao[0], m = (vao[0] + vao[1]) / 2;
        if (eixoX) { lt.caixa(mat, L, ALT - VAO_H, ESP, m, VAO_H, fixo); [vao[0], vao[1]].forEach(u => lt.caixa(mBatente, .08, VAO_H, ESP + .04, u, 0, fixo)); lt.caixa(mBatente, L + .16, .08, ESP + .04, m, VAO_H - .04, fixo); }
        else { lt.caixa(mat, ESP, ALT - VAO_H, L, fixo, VAO_H, m); [vao[0], vao[1]].forEach(u => lt.caixa(mBatente, ESP + .04, VAO_H, .08, fixo, 0, u)); lt.caixa(mBatente, ESP + .04, .08, L + .16, fixo, VAO_H - .04, m); }
      }
    }
    Object.values(S).forEach(s => {
      const lt = criarLote(T, ctx.descartes), { cx, cz } = s;
      if (!s.aberta) {
        // sala que você não pode ver: um bloco escuro e fechado
        lt.caixa(mSelada, 10 + ESP * 2, ALT + .02, 10 + ESP * 2, cx, 0, cz);
        lt.montar(raiz); return;
      }
      const c = s.cena || {}, piso = c.piso || {}, par = c.parede || {}, teto = c.teto || {};
      const mPiso = F.m(piso.c || '#3d3b40', { tex: piso.tex || 'concreto', rep: [piso.rep || 4, piso.rep || 4], r: piso.r ?? .85 });
      const mPar = F.m(par.c || '#55514b', { tex: par.tex || 'concreto', rep: [par.rep || 3, 1], r: .9 });
      const mRod = F.m(par.rodape || '#2b2b2b');
      lt.plano(mPiso, 10, 10, cx, 0, cz, -Math.PI / 2);
      const vx = tem => tem ? [cx + OFF - VAO / 2, cx + OFF + VAO / 2] : null;
      const vz = tem => tem ? [cz - OFF - VAO / 2, cz - OFF + VAO / 2] : null;
      parede(lt, mPar, mRod, true, cz - 5 - ESP / 2, cx - 5 - ESP, cx + 5 + ESP, vx(temLado(s.p, 'n')), 1);
      parede(lt, mPar, mRod, true, cz + 5 + ESP / 2, cx - 5 - ESP, cx + 5 + ESP, vx(temLado(s.p, 's')), -1);
      parede(lt, mPar, mRod, false, cx - 5 - ESP / 2, cz - 5, cz + 5, vz(temLado(s.p, 'w')), 1);
      parede(lt, mPar, mRod, false, cx + 5 + ESP / 2, cz - 5, cz + 5, vz(temLado(s.p, 'e')), -1);
      lt.montar(raiz);
      const lt2 = criarLote(T, ctx.descartes);
      lt2.plano(F.m(teto.c || '#4a4a4a', { tex: teto.tex || 'concreto', rep: [3, 3] }), 10, 10, cx, ALT, cz, Math.PI / 2);
      lt2.montar(tetos);
    });

    /* ----- corredores ----- */
    const mChaoC = F.m('#2c2b31', { tex: 'metal', rep: [2, 1], r: .6 }), mParC = F.m('#3b3742', { tex: 'concreto', rep: [2, 1] });
    const mTetoC = F.m('#232127'), mFaixa = F.m('#ffffff', { e: '#ff5a46', ei: 1.4 });
    const ltC = criarLote(T, ctx.descartes), ltCT = criarLote(T, ctx.descartes);
    const virtCorr = [];
    const usados = CORR.map(k => S[k.p1].aberta || S[k.p2].aberta);
    CORR.forEach((k, ci) => {
      if (!usados[ci]) return;
      const g = geoCorr(k), L = g.a1 - g.a0, Li = L - 2 * ESP, mid = (g.a0 + g.a1) / 2;
      const lados = [g.linha - CORR_W / 2 - .075, g.linha + CORR_W / 2 + .075];
      if (g.h) {
        ltC.plano(mChaoC, L, CORR_W, mid, .003, g.linha, -Math.PI / 2);
        lados.forEach(z => ltC.caixa(mParC, Li, CORR_H, .15, mid, 0, z));
        ltC.caixa(mParC, Li, ALT - CORR_H, CORR_W + .3, mid, CORR_H, g.linha);          // laje acima do corredor
        ltCT.plano(mTetoC, Li, CORR_W, mid, CORR_H - .001, g.linha, Math.PI / 2);
        [-1.25, 1.25].forEach(o => ltC.caixa(mFaixa, .9, .03, .08, mid + o, CORR_H - .03, g.linha));
      } else {
        ltC.plano(mChaoC, CORR_W, L, g.linha, .003, mid, -Math.PI / 2);
        lados.forEach(x => ltC.caixa(mParC, .15, CORR_H, Li, x, 0, mid));
        ltC.caixa(mParC, CORR_W + .3, ALT - CORR_H, Li, g.linha, CORR_H, mid);
        ltCT.plano(mTetoC, CORR_W, Li, g.linha, CORR_H - .001, mid, Math.PI / 2);
        [-1.25, 1.25].forEach(o => ltC.caixa(mFaixa, .08, .03, .9, g.linha, CORR_H - .03, mid + o));
      }
      // luz de emergência (avermelhada, fraca), uma de cada lado da porta
      [-1.25, 1.25].forEach(o => {
        const l = new T.PointLight('#ff7a62', .8, 5.5, 2);
        virtCorr.push({ l, p: g.h ? new T.Vector3(mid + o, CORR_H - .3, g.linha) : new T.Vector3(g.linha, CORR_H - .3, mid + o) });
      });
    });
    ltC.montar(raiz); ltCT.montar(tetos);

    /* ----- portas dos corredores (mudam ao vivo) ----- */
    const animPortas = [];
    const portas = CORR.map((k, ci) => {
      if (!usados[ci]) return null;
      const g = geoCorr(k), grp = new T.Group();
      grp.position.set(g.mx, 0, g.mz); if (!g.h) grp.rotation.y = -Math.PI / 2;
      raiz.add(grp);
      return { grp, g, v: null, desc: [], anim: [] };
    });
    function montarPorta(P, e) {
      P.grp.clear(); P.desc.forEach(x => { try { x.dispose(); } catch (er) {} }); P.desc = []; P.anim = [];
      const Fp = criarFabrica(T, P.anim, [], P.desc), g = P.grp;
      const metalP = Fp.m('#737a83', { r: .55, me: .2, tex: 'metal', rep: [1, 2] });
      // batentes e travessa (sempre)
      [-1, 1].forEach(s => Fp.bx(g, .22, CORR_H, .12, mBatente, 0, 0, s * (CORR_W / 2 - .06)));
      Fp.bx(g, .22, .14, CORR_W, mBatente, 0, CORR_H - .14, 0);
      if (e === 'a') { Fp.bx(g, .12, .1, CORR_W - .2, metalP, 0, CORR_H - .24, 0); return; }   // aberta: a folha sumiu no teto
      if (e === 'd') {
        // escombros: entulho que fecha o corredor
        const r = rng(P.g.mx * 7 + P.g.mz), mc = Fp.m('#6a665f', { tex: 'concreto', r: 1 }), mf = Fp.m('#3b3a38', { r: .9 });
        for (let i = 0; i < 22; i++) {
          const w = .3 + r() * .7, h = .25 + r() * .6, y = Math.max(0, (1 - Math.abs(r() - .5) * 2) * 1.5 * r());
          const b = Fp.bx(g, w, h, .3 + r() * .7, i % 4 ? mc : mf, (r() - .5) * 1.4, y, (r() - .5) * (CORR_W - .4));
          b.rotation.set(r() * .6, r() * 3, r() * .6);
        }
        const viga = Fp.bx(g, .18, .18, CORR_W + .6, metalP, .2, 1.2, 0); viga.rotation.x = .5; viga.rotation.y = .3;
        return;
      }
      if (e === 'c') {
        // carne: uma parede viva que pulsa
        const [cv, x] = tela(256, 256), r = rng(11);
        x.fillStyle = '#5a0f16'; x.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${150 + r() * 80},${20 + r() * 30},${30 + r() * 30},.35)`; x.beginPath(); x.arc(r() * 256, r() * 256, 10 + r() * 30, 0, 7); x.fill(); }
        x.strokeStyle = 'rgba(30,0,0,.6)'; x.lineWidth = 2; for (let i = 0; i < 18; i++) { x.beginPath(); x.moveTo(r() * 256, r() * 256); for (let j = 0; j < 4; j++) x.quadraticCurveTo(r() * 256, r() * 256, r() * 256, r() * 256); x.stroke(); }
        const tx = new T.CanvasTexture(cv); tx.encoding = T.sRGBEncoding; P.desc.push(tx);
        const mcarne = Fp.m('#b07070', { unico: true, mapa: tx, r: .35, e: '#1a0002', ei: .4 });
        const parede = new T.Group(); g.add(parede);
        Fp.bx(parede, .3, CORR_H, CORR_W - .1, mcarne, 0, 0, 0);
        for (let i = 0; i < 9; i++) Fp.sf(parede, .14 + r() * .2, mcarne, (r() - .5) * .3, .3 + r() * 1.9, (r() - .5) * (CORR_W - .5), 12).scale.set(.55, 1, 1);
        P.anim.push((dt, t) => { const k = 1 + Math.max(0, Math.sin(t * 5.2)) * .04 + Math.max(0, Math.sin(t * 5.2 - 1.2)) * .02; parede.scale.set(k, 1, 1 + (k - 1) * .4); });
        return;
      }
      // fechada (com ou sem tranca): folha de metal com o botão vermelho dos dois lados
      Fp.bx(g, .1, CORR_H - .16, CORR_W - .12, metalP, 0, 0, 0);
      const faixa = Fp.m('#d4a017', { r: .7 });
      Fp.bx(g, .11, .12, CORR_W - .12, faixa, 0, .25, 0);
      const mb = Fp.m('#ffffff', { unico: true, e: '#ff2020', ei: e === 'p' ? 3 : 1.4 });
      [-1, 1].forEach(s => {
        Fp.bx(g, .04, .2, .2, Fp.m('#1b1b1e'), s * .07, 1.12, CORR_W / 2 - .35);
        Fp.sf(g, .05, mb, s * .1, 1.22, CORR_W / 2 - .35, 12);
        if (e === 't' || e === 'tk') {
          const tx = Fp.textoTex(e === 'tk' ? '🔢\nTECLADO' : '🔒\nTRANCADA', { w: 256, h: 192, cor: '#ffd36b', fundo: '#1a1408' });
          const pm = Fp.pl(g, .6, .45, Fp.m('#ffffff', { unico: true, mapa: tx, r: .9 }), s * .061, 1.75, 0);
          pm.rotation.y = s * Math.PI / 2;
          if (e === 'tk') Fp.bx(g, .05, .28, .2, Fp.m('#111', { e: '#2ecc71', ei: .6 }), s * .075, 1.32, CORR_W / 2 - .35);
        }
      });
      if (e === 'p') P.anim.push((dt, t) => { mb.emissiveIntensity = Math.sin(t * 10) > 0 ? 3.5 : .6; });
    }
    function atualizarPortas() {
      portas.forEach((P, ci) => { if (!P) return; const e = estadoPorta(a, ci); if (e === P.v) return; P.v = e; montarPorta(P, e); });
    }
    atualizarPortas();

    /* ----- onde dá para andar ----- */
    const zonas = [], bloqueios = [];
    Object.values(S).forEach(s => { if (s.aberta) zonas.push([s.cx - 5 + RAIO, s.cx + 5 - RAIO, s.cz - 5 + RAIO, s.cz + 5 - RAIO]); });
    CORR.forEach((k, ci) => {
      if (!usados[ci]) return;
      const g = geoCorr(k), w0 = g.linha - CORR_W / 2 + RAIO, w1 = g.linha + CORR_W / 2 - RAIO;
      const R = (s0, s1, t0, t1) => g.h ? [s0, s1, t0, t1] : [t0, t1, s0, s1];
      zonas.push(R(g.a0 + ESP + RAIO, g.a1 - ESP - RAIO, w0, w1));
      const v0 = g.linha - VAO / 2 + RAIO, v1 = g.linha + VAO / 2 - RAIO;
      if (S[k.p1].aberta) zonas.push(R(g.a0 - .6, g.a0 + ESP + .6, v0, v1));
      if (S[k.p2].aberta) zonas.push(R(g.a1 - ESP - .6, g.a1 + .6, v0, v1));
      const m = g.h ? g.mx : g.mz;
      bloqueios[ci] = { f: R(m - .45, m + .45, g.linha - 1.3, g.linha + 1.3), c: R(m - .85, m + .85, g.linha - 1.3, g.linha + 1.3), d: R(m - 1.45, m + 1.45, g.linha - 1.3, g.linha + 1.3) };
    });

    /* ----- conteúdo das salas: carregado só perto de quem anda ----- */
    const carregadas = new Map();
    function carregar(p) {
      const s = S[p]; if (!s.aberta || !s.cena || carregadas.has(p)) return;
      const desc = [], anim = [], luzes = [], g = new T.Group();
      g.position.set(s.cx, 0, s.cz); raiz.add(g);
      montarItens(criarFabrica(T, anim, luzes, desc), s.cena, g, true);
      g.updateMatrixWorld(true);
      // as luzes da sala viram "luzes virtuais": um conjunto fixo de luzes de verdade copia as mais próximas
      const virt = luzes.map(l => { const w = new T.Vector3(); l.getWorldPosition(w); l.parent.remove(l); return { l, p: w }; });
      (s.cena.luzes || []).forEach((l, i) => {
        const L = new T.PointLight(l.c || '#fff', l.i ?? 1, l.d ?? 10, 2);
        virt.push({ l: L, p: new T.Vector3(s.cx + (l.x || 0), l.y ?? ALT - .4, s.cz + (l.z || 0)) });
        if (l.pisca) { const base = L.intensity, r = rng(i + 50); anim.push((dt, t) => { L.intensity = base * (Math.sin(t * 2.7 + i) > .92 || r() < .02 ? .1 : 1); }); }
      });
      // a "luz de teto" que no modo sala projeta sombra: aqui, uma luz comum
      if (s.cena.sombra !== false) virt.push({ l: new T.PointLight(s.cena.sombraCor || '#fff4e6', (s.cena.sombraI ?? .8) * .8, 14, 2), p: new T.Vector3(s.cx + 1.2, ALT - .4, s.cz + .8) });
      carregadas.set(p, { g, desc, anim, virt, obst: obstaculos(T, g) });
    }
    function descarregar(p) {
      const c = carregadas.get(p); if (!c) return;
      raiz.remove(c.g); c.desc.forEach(x => { try { x.dispose(); } catch (e) {} });
      carregadas.delete(p);
    }
    function vizinhas(p) {
      const out = [];
      CORR.forEach((k, ci) => { if (k.p1 === p) out.push([k.p2, ci]); else if (k.p2 === p) out.push([k.p1, ci]); });
      return out;
    }
    const pertoDe = (x, z) => {
      const p = salaNoPonto(x, z); if (p) return p;
      let best = null, bd = 1e9; Object.values(S).forEach(s => { const d = (s.cx - x) ** 2 + (s.cz - z) ** 2; if (d < bd) { bd = d; best = s.p; } });
      return best;
    };
    let tStream = 0;
    function streaming(x, z, modo) {
      const p0 = pertoDe(x, z), quer = new Set([p0]);
      vizinhas(p0).forEach(([p, ci]) => { if (S[p].aberta && (portas[ci] && portas[ci].v === 'a' || (modo !== 'dentro' && !celular))) quer.add(p); });
      // jogador: só a própria sala, sempre
      if (quem === 'jog') { quer.clear(); Object.values(S).forEach(s => { if (s.aberta) quer.add(s.p); }); }
      [...carregadas.keys()].forEach(p => { if (!quer.has(p)) descarregar(p); });
      // uma sala por vez, para não travar a tela
      const falta = [...quer].find(p => !carregadas.has(p) && S[p].cena);
      if (falta) carregar(falta);
    }

    /* ----- conjunto fixo de luzes (não recompila os materiais quando as salas entram e saem) ----- */
    const POOL = celular ? 6 : 12, pool = [];
    for (let i = 0; i < POOL; i++) { const L = new T.PointLight('#fff', 0, 1, 2); raiz.add(L); pool.push(L); }
    const lista = [];
    function distribuirLuzes(x, z) {
      lista.length = 0;
      carregadas.forEach(c => c.virt.forEach(v => lista.push(v)));
      virtCorr.forEach(v => lista.push(v));
      lista.forEach(v => { v.d = (v.p.x - x) ** 2 + (v.p.z - z) ** 2; });
      lista.sort((u, w) => u.d - w.d);
      for (let i = 0; i < POOL; i++) {
        const L = pool[i], v = lista[i];
        if (!v) { L.intensity = 0; continue; }
        L.position.copy(v.p); L.color.copy(v.l.color); L.intensity = v.l.intensity; L.distance = v.l.distance; L.decay = v.l.decay;
      }
    }

    /* ----- atmosfera: segue a sala onde você está ----- */
    const corredorAtm = { i: .22, c: '#9aa0b4', chao: '#120e10', nc: '#050407', nd: .045, fundo: '#050407', exp: 1.25 };
    const atmDe = p => {
      const s = p && S[p];
      if (!s || !s.aberta || !s.cena) return corredorAtm;
      const c = s.cena, am = ambDe(c);
      return { i: am.i, c: am.c, chao: am.chao, nc: c.nevoa ? c.nevoa.c || '#000' : (c.fundo || '#07060a'), nd: c.nevoa ? c.nevoa.d || .05 : .015, fundo: c.fundo || '#07060a', exp: c.exposicao || 1.25 };
    };
    ctx.cena.background = new T.Color('#050407');
    ctx.cena.fog = new T.FogExp2('#050407', .04);
    const cTmp = new T.Color();
    function atmosfera(x, z, modo, dt) {
      const at = atmDe(salaNoPonto(x, z)), k = Math.min(1, dt * 3);
      ctx.amb.intensity += (at.i - ctx.amb.intensity) * k;
      ctx.amb.color.lerp(cTmp.set(at.c), k); ctx.amb.groundColor.lerp(cTmp.set(at.chao), k);
      ctx.cena.fog.color.lerp(cTmp.set(at.nc), k);
      const nd = at.nd * (modo === 'dentro' ? 1 : .12);
      ctx.cena.fog.density += (nd - ctx.cena.fog.density) * k;
      ctx.cena.background.lerp(cTmp.set(modo === 'dentro' ? at.fundo : '#050407'), k);
      ctx.ren.toneMappingExposure += (at.exp - ctx.ren.toneMappingExposure) * k;
    }

    function livre(x, z) {
      if (!zonas.some(r => dentroDe(r, x, z))) return false;
      // porta que não está aberta barra a passagem; escombros e carne ocupam mais espaço
      if (!fantasma) for (let ci = 0; ci < portas.length; ci++) { const P = portas[ci]; if (P && P.v !== 'a' && dentroDe(bloqueios[ci][P.v === 'd' || P.v === 'c' ? P.v : 'f'], x, z)) return false; }
      for (const c of carregadas.values()) if (c.obst.some(r => dentroDe(r, x, z))) return false;
      return true;
    }

    // começa onde está a ficha do jogador (ou no meio da sala aberta)
    const pIni = (minha || base) - 25 * (a - 1);
    const [ix, iz] = centro(pIni);
    // a sala inicial já entra carregada (os móveis contam para achar um lugar livre)
    carregar(pIni);

    return {
      tipo: 'andar', livre, inicio: { x: ix, z: iz + 3.6, yaw: 0 },
      alvo: (x, z) => { const s = S[pertoDe(x, z)]; return [s.cx, s.cz]; },
      rFora: 24, rCima: 30, rMin: 6, rMax: 95, ambBase: .3,
      atualizar(dt, t, x, z, modo) {
        tStream -= dt; if (tStream <= 0) { tStream = .35; streaming(x, z, modo); }
        carregadas.forEach(c => { for (let i = 0; i < c.anim.length; i++) c.anim[i](dt, t); });
        portas.forEach(P => { if (P) for (let i = 0; i < P.anim.length; i++) P.anim[i](dt, t); });
        distribuirLuzes(x, z);
        atmosfera(x, z, modo, dt);
        tetos.visible = modo === 'dentro';
      },
      rotulo(x, z) { const p = salaNoPonto(x, z); return p && S[p].aberta ? S[p].cn : null; },
      sons(x, z) {
        const out = [];
        carregadas.forEach((c, p) => {
          const s = S[p]; if (!s.cena || !s.cena.som) return;
          const d = Math.hypot(s.cx - x, s.cz - z), dentro = salaNoPonto(x, z) === p;
          out.push({ k: 'c' + s.cn, som: s.cena.som, g: dentro ? 1 : Math.max(0, 1 - (d - 5) / 9) * .45 });
        });
        return out;
      },
      // toque numa sala (vista de fora): vai até ela
      tocou(x, z) { const p = salaNoPonto(x, z); if (!p || !S[p].aberta) return null; return [S[p].cx, S[p].cz + 3.6]; },
      portas: atualizarPortas,
      salaInicial: pIni,
      descartar() {
        [...carregadas.keys()].forEach(descarregar);
        portas.forEach(P => P && P.desc.forEach(x => { try { x.dispose(); } catch (e) {} }));
      }
    };
  }

  /* ================= som ambiente (gerado na hora, sem arquivos) ================= */
  const Som = (() => {
    let ctx = null, saida = null, branco = null, marrom = null, ligado = true;
    try { ligado = JSON.parse(localStorage.getItem('acf-s3d-som') ?? 'true'); } catch (e) {}
    const vozes = new Map();
    function buf(tipo) {
      const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      let ult = 0;
      for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (tipo === 'marrom') { ult = (ult + .02 * w) / 1.02; d[i] = ult * 3.5; } else d[i] = w; }
      return b;
    }
    function preparar() {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      try {
        if (!ctx) { ctx = new AC(); saida = ctx.createGain(); saida.gain.value = 0; saida.connect(ctx.destination); branco = buf('branco'); marrom = buf('marrom'); }
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      } catch (e) { ctx = null; }
    }
    // pecinhas
    const ruido = (o, b, destino) => { const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; s.connect(destino); s.start(0, Math.random() * 1.9); o.fontes.push(s); return s; };
    const filtro = (tipo, f, q, destino) => { const x = ctx.createBiquadFilter(); x.type = tipo; x.frequency.value = f; if (q) x.Q.value = q; x.connect(destino); return x; };
    const ganho = (v, destino) => { const g = ctx.createGain(); g.gain.value = v; g.connect(destino); return g; };
    const osc = (o, tipo, f, destino) => { const s = ctx.createOscillator(); s.type = tipo; s.frequency.value = f; s.connect(destino); s.start(); o.fontes.push(s); return s; };
    const lfo = (o, f, amp, param) => { const s = osc(o, 'sine', f, ganho(amp, param)); return s; };
    // um "toque" curto (gota, batida, bip, estalo)
    function toque(t, destino, { f = 800, f2, tipo = 'sine', v = .1, ataque = .005, dur = .2, ruidoBP }) {
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + ataque); g.gain.exponentialRampToValueAtTime(.0001, t + dur); g.connect(destino);
      let s;
      if (ruidoBP) { s = ctx.createBufferSource(); s.buffer = branco; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ruidoBP; bp.Q.value = 2; s.connect(bp); bp.connect(g); }
      else { s = ctx.createOscillator(); s.type = tipo; s.frequency.setValueAtTime(f, t); if (f2) s.frequency.exponentialRampToValueAtTime(f2, t + dur); s.connect(g); }
      s.start(t, ruidoBP ? Math.random() : 0); s.stop(t + dur + .05);
    }
    // repetição com intervalo (fixo ou sorteado)
    const ritmo = (o, intervalo, fn) => { let prox = ctx.currentTime + .3 + Math.random() * .5; o.ticks.push(t => { while (prox < t + .25) { fn(prox); prox += typeof intervalo === 'function' ? intervalo() : intervalo; } }); };
    const PRESETS = {
      zumbido(o, s) { const g = ganho(.05, s); osc(o, 'sine', 60, g); osc(o, 'sine', 120, ganho(.5, g)); osc(o, 'sine', 180, ganho(.22, g)); ruido(o, marrom, filtro('lowpass', 300, 0, ganho(.25, s))); },
      fluor(o, s) {
        const g = ganho(.012, s); osc(o, 'sawtooth', 120, filtro('lowpass', 1100, 0, g)); osc(o, 'sine', 240, ganho(.5, g));
        ritmo(o, () => 4 + Math.random() * 9, t => { for (let i = 0; i < 2 + Math.random() * 3; i++) toque(t + i * .07, s, { ruidoBP: 2400, v: .05, dur: .04 }); });
      },
      freezer(o, s) { const g = ganho(.1, s); ruido(o, marrom, filtro('lowpass', 180, 0, g)); const h = ganho(.03, s); osc(o, 'sine', 50, h); lfo(o, .11, .015, h.gain); },
      ventilacao(o, s) { const g = ganho(.13, s); ruido(o, marrom, filtro('bandpass', 520, .7, g)); lfo(o, .17, .04, g.gain); },
      vapor(o, s) {
        const g = ganho(.012, s); ruido(o, branco, filtro('bandpass', 3200, .8, g));
        ritmo(o, () => 3 + Math.random() * 6, t => { g.gain.setTargetAtTime(.075, t, .12); g.gain.setTargetAtTime(.012, t + 1.4, .5); });
      },
      gotas(o, s) {
        const eco = ctx.createDelay(1); eco.delayTime.value = .23; const fb = ganho(.32, eco); eco.connect(fb); eco.connect(s); const ent = ganho(1, s); ent.connect(eco);
        ritmo(o, () => .5 + Math.random() * 1.8, t => toque(t, ent, { f: 1100 + Math.random() * 700, f2: 380, v: .07, dur: .16 }));
      },
      coracao(o, s) { const lp = filtro('lowpass', 160, 0, s); ritmo(o, 1.05, t => { toque(t, lp, { f: 58, f2: 40, v: .5, ataque: .01, dur: .16 }); toque(t + .27, lp, { f: 50, f2: 36, v: .32, ataque: .01, dur: .14 }); }); },
      bip(o, s) { ritmo(o, 1.03, t => toque(t, s, { f: 980, v: .03, ataque: .004, dur: .1 })); },
      estatica(o, s) { ruido(o, branco, filtro('highpass', 1500, 0, ganho(.022, s))); ritmo(o, () => .08 + Math.random() * .5, t => toque(t, s, { ruidoBP: 3500, v: .03 * Math.random(), dur: .02 })); },
      vela(o, s) { ruido(o, marrom, filtro('lowpass', 900, 0, ganho(.02, s))); ritmo(o, () => .15 + Math.random() * .8, t => toque(t, s, { ruidoBP: 2600, v: .04 * Math.random(), dur: .018 })); },
      maquinas(o, s) {
        osc(o, 'sawtooth', 42, filtro('lowpass', 160, 0, ganho(.06, s)));
        ritmo(o, 1.4, t => { toque(t, s, { ruidoBP: 900, v: .09, dur: .09 }); toque(t, s, { tipo: 'square', f: 160, f2: 90, v: .02, dur: .15 }); });
      },
      neutra(o, s) { ruido(o, marrom, filtro('lowpass', 400, 0, ganho(.035, s))); },
      eco(o, s) {
        const eco = ctx.createDelay(1.5); eco.delayTime.value = .6; const fb = ganho(.4, eco); eco.connect(fb); eco.connect(s);
        const bp = filtro('bandpass', 220, 4, ganho(.06, s)); bp.connect(eco); ruido(o, branco, bp); lfo(o, .05, 120, bp.frequency);
      },
      relogio(o, s) { let par = 0; ritmo(o, 1, t => toque(t, s, { ruidoBP: (par++ % 2) ? 3000 : 2300, v: .05, dur: .03 })); },
    };
    const normal = som => (Array.isArray(som) ? som : [som]).map(x => typeof x === 'string' ? [x, 1] : Array.isArray(x) ? [x[0], x[1] ?? 1] : x && x.p ? [x.p, x.v ?? 1] : null).filter(x => x && PRESETS[x[0]]);
    function criarVoz(k, som) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(saida);
      const o = { fontes: [], ticks: [] };
      normal(som).forEach(([nome, v]) => { try { PRESETS[nome](o, ganho(v, g)); } catch (e) { console.warn('som 3D:', nome, e); } });
      const voz = { g, o }; vozes.set(k, voz); return voz;
    }
    function soltar(k) {
      const v = vozes.get(k); if (!v) return; vozes.delete(k);
      const t = ctx.currentTime; v.g.gain.setTargetAtTime(0, t, .3);
      setTimeout(() => { v.o.fontes.forEach(s => { try { s.stop(); } catch (e) {} }); try { v.g.disconnect(); } catch (e) {} }, 1600);
    }
    return {
      preparar,
      get ligado() { return ligado; },
      alternar() { ligado = !ligado; try { localStorage.setItem('acf-s3d-som', JSON.stringify(ligado)); } catch (e) {} return ligado; },
      // alvos: [{k, som, g}] · chamado algumas vezes por segundo
      atualizar(alvos) {
        if (!ctx) return;
        const t = ctx.currentTime, mudo = !ligado || (ACF() && ACF().mudo);
        saida.gain.setTargetAtTime(mudo ? 0 : .7, t, .25);
        const quer = new Set();
        alvos.forEach(a => { quer.add(a.k); const v = vozes.get(a.k) || criarVoz(a.k, a.som); v.g.gain.setTargetAtTime(a.g, t, .5); });
        [...vozes.keys()].forEach(k => { if (!quer.has(k)) soltar(k); });
      },
      tick() { if (!ctx) return; const t = ctx.currentTime; vozes.forEach(v => v.o.ticks.forEach(f => f(t))); },
      pausar() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); },
      retomar() { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
      parar() { [...vozes.keys()].forEach(soltar); if (ctx) setTimeout(() => { if (!V && ctx) ctx.suspend().catch(() => {}); }, 1800); },
    };
  })();

  /* ================= o visualizador (tela cheia) ================= */
  let V = null;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ehToque = () => matchMedia('(pointer: coarse)').matches;

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
      <div class="s3d-joy" id="s3dJoy" hidden aria-hidden="true"><span></span></div>
      <div class="s3d-barra">
        <button type="button" data-s3dv="fora" class="on" title="Ver por fora (casa de bonecas)"><i>🏠</i><span>Fora</span></button>
        <button type="button" data-s3dv="dentro" title="Andar por dentro (WASD ou setas; Shift corre)"><i>👁</i><span>Dentro</span></button>
        <button type="button" data-s3dv="cima" title="Vista de cima"><i>⬇</i><span>Cima</span></button>
        <button type="button" data-s3dv="luz" title="Acender ou apagar uma luz de serviço"><i>🔦</i><span>Luz</span></button>
        <button type="button" data-s3dv="andar" title="Alternar entre a sala e o andar inteiro"><i>🏢</i><span>Andar</span></button>
        <button type="button" data-s3dv="som" title="Som ambiente da sala"><i>🔊</i><span>Som</span></button>
      </div>`;
    document.body.appendChild(d);
    d.addEventListener('click', e => {
      const b = e.target.closest('[data-s3dv]'); if (!b || !V) return;
      const k = b.dataset.s3dv;
      if (k === 'fechar') fechar();
      else if (k === 'luz') { V.lanterna = !V.lanterna; V.luzServico.intensity = V.lanterna ? 1.1 : 0; b.classList.toggle('on', V.lanterna); }
      else if (k === 'som') { Som.preparar(); Som.alternar(); pintarSom(); }
      else if (k === 'andar') alternarAndar();
      else definirModo(k);
    });
    ligarJoystick($('#s3dJoy', d));
    return d;
  }
  function pintarSom() {
    const b = $('#s3d [data-s3dv="som"]'); if (!b) return;
    b.classList.toggle('on', Som.ligado); $('i', b).textContent = Som.ligado ? '🔊' : '🔇';
  }

  // teclado: com a sala aberta, NENHUMA tecla chega ao mapa (ex.: "A" é o apagão do Mestre)
  const TECLAS = { w: 'f', arrowup: 'f', s: 't', arrowdown: 't', a: 'e', arrowleft: 'e', d: 'd', arrowright: 'd' };
  window.addEventListener('keydown', e => {
    const d = $('#s3d'); if (!V || !d || d.hidden) return;
    if (e.target && e.target.matches && e.target.matches('input, textarea, select')) return;
    const k = (e.key || '').toLowerCase();
    e.stopImmediatePropagation();
    if (k === 'escape') { e.preventDefault(); fechar(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === 'shift') V.correr = true;
    if (TECLAS[k]) { e.preventDefault(); V.teclas.add(TECLAS[k]); if (V.cam.modo !== 'dentro') definirModo('dentro'); }
  }, true);
  window.addEventListener('keyup', e => {
    if (!V) return;
    const k = (e.key || '').toLowerCase();
    if (k === 'shift') V.correr = false;
    if (TECLAS[k]) { V.teclas.delete(TECLAS[k]); e.stopImmediatePropagation(); }
  }, true);
  window.addEventListener('blur', () => { if (V) { V.teclas.clear(); V.correr = false; } });

  // joystick na tela (celular e tablet): arrastar o polegar anda; perto da borda, corre
  function ligarJoystick(j) {
    const bola = $('span', j); let id = null;
    const mover = e => {
      const r = j.getBoundingClientRect(), raio = r.width / 2;
      let dx = (e.clientX - r.left - raio) / raio, dy = (e.clientY - r.top - raio) / raio;
      const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
      bola.style.transform = `translate(${dx * raio * .55}px, ${dy * raio * .55}px)`;
      if (V) V.joy = { x: dx, y: -dy };
    };
    const soltar = () => { id = null; bola.style.transform = ''; if (V) V.joy = null; };
    j.addEventListener('pointerdown', e => { e.preventDefault(); id = e.pointerId; j.setPointerCapture(id); mover(e); });
    j.addEventListener('pointermove', e => { if (e.pointerId === id) mover(e); });
    j.addEventListener('pointerup', soltar); j.addEventListener('pointercancel', soltar);
  }

  function definirModo(k) {
    if (!V) return;
    const c = V.cam, M = V.mundo;
    $$('.s3d-barra [data-s3dv]').forEach(b => { if (['fora', 'dentro', 'cima'].includes(b.dataset.s3dv)) b.classList.toggle('on', b.dataset.s3dv === k); });
    // tela em pé (celular): a câmera recua para a sala inteira caber
    const asp = V.camera.aspect || 1, recuo = asp < 1 ? Math.pow(1 / asp, 1.1) : 1;
    const [ax, az] = M.alvo(c.px, c.pz);
    if (k === 'dentro') { c.modo = 'dentro'; c.fov = asp < 1 ? 85 : 70; }
    else if (k === 'cima') { c.modo = 'cima'; c.theta = .0001; c.phi = .06; c.r = M.rCima * recuo; c.ax = ax; c.az = az; }
    else { c.modo = 'fora'; c.theta = .62; c.phi = M.tipo === 'andar' ? .7 : .95; c.r = M.rFora * recuo; c.ax = ax; c.az = az; }
    const j = $('#s3dJoy'); if (j) j.hidden = !(c.modo === 'dentro' && ehToque());
    V.d.classList.toggle('s3d-andando', c.modo === 'dentro');
    dica();
  }
  function dica() {
    if (!V) return;
    const curto = innerWidth < 560, tq = ehToque(), andar = V.mundo.tipo === 'andar' && V.quem !== 'jog';
    $('#s3dDica').textContent = V.cam.modo === 'dentro'
      ? (tq ? 'Polegar no círculo para andar · arraste a tela para olhar' : 'WASD ou setas para andar · Shift corre · arraste para olhar')
      : (curto ? 'Arraste para girar · pinça para aproximar' + (andar ? ' · toque numa sala para ir até ela' : '')
        : 'Arraste para girar · roda do mouse para aproximar' + (andar ? ' · clique numa sala para ir até ela' : '') + ' · WASD entra andando');
  }

  /* ---------- quem pode entrar ---------- */
  const quemSou = () => { const a = ACF(); return a.mestre ? 'mestre' : a.aux ? 'aux' : 'jog'; };
  function podeAbrir(cn) {
    const a = ACF(); if (!a || !cenaDe(cn)) return false;
    if (a.mestre || a.aux) return true;
    // jogador: só a sala onde está a própria cobaia
    return !!a.meu && a.salaDe(a.meu) === cn;
  }
  // posição da ficha do jogador no 3D (metros do andar)
  function posFicha() {
    const a = ACF(), tk = a.meu && ((a.estado || {}).tokens || {})[a.meu];
    if (!tk || !tk.a) return null;
    const [x, z] = planta3D(tk.x, tk.y); return { a: tk.a, x, z };
  }

  async function abrir(cn, op = {}) {
    if (!podeAbrir(cn)) {
      ACF().aviso(cenaDe(cn) ? 'Para entrar em 3D, sua cobaia precisa estar nesta sala.' : 'Esta sala ainda não tem cena 3D.');
      return;
    }
    Som.preparar();   // precisa ser no clique (celular só libera o som assim)
    const andar = !!op.andar && !!lay();
    const d = criarJanela();
    if (V) fechar(true);
    d.hidden = false; document.body.classList.add('s3d-aberta');
    $('#s3dCN').textContent = andar ? `${Math.ceil(cn / 25)}º ANDAR` : `CN ${pad2(cn)}`;
    $('#s3dNome').textContent = '';
    $('[data-s3dv="andar"]', d).hidden = !lay();
    const msg = $('#s3dMsg'); msg.hidden = false; msg.textContent = andar ? 'Montando o andar…' : 'Carregando a sala…';
    $('.s3d-x', d).focus();
    try { await carregarThree(); } catch (e) { msg.textContent = 'Não consegui carregar o 3D (sem internet?). Tente de novo.'; return; }
    if (d.hidden) return;
    msg.hidden = true;
    try { iniciar({ cn, andar, a: Math.ceil(cn / 25), pos: op.pos || null, modo: op.modo || null }, d); }
    catch (e) { console.error(e); msg.hidden = false; msg.textContent = 'Não consegui montar o 3D neste aparelho.'; }
  }

  // troca sala <-> andar levando junto a posição de quem está andando
  function alternarAndar() {
    if (!V) return;
    const c = V.cam, op = V.op, modo = c.modo;
    if (!op.andar) {
      const [cx, cz] = centro(op.cn - 25 * (op.a - 1));
      abrir(op.cn, { andar: true, modo, pos: { x: cx + c.px, z: cz + c.pz, yaw: c.yaw, pitch: c.pitch } });
      return;
    }
    const p = salaNoPonto(c.px, c.pz), cn = p ? 25 * (op.a - 1) + p : (quemSou() === 'jog' ? op.cn : null);
    if (!cn || !podeAbrir(cn)) { ACF().aviso('Entre numa sala com cena 3D para ver só ela.'); return; }
    const [cx, cz] = centro(cn - 25 * (op.a - 1));
    abrir(cn, { modo, pos: p ? { x: c.px - cx, z: c.pz - cz, yaw: c.yaw, pitch: c.pitch } : null });
  }

  function iniciar(op, d) {
    const T = window.THREE, A = ACF();
    const palco = $('.s3d-palco', d);
    const celular = Math.min(innerWidth, innerHeight) < 700 || ehToque();
    const ren = new T.WebGLRenderer({ antialias: !celular, powerPreference: 'high-performance' });
    ren.setPixelRatio(Math.min(devicePixelRatio || 1, celular ? 1.5 : 2));
    ren.outputEncoding = T.sRGBEncoding; ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = 1.25;
    ren.shadowMap.enabled = !celular && !op.andar; ren.shadowMap.type = T.PCFSoftShadowMap;
    palco.appendChild(ren.domElement);
    const cenaT = new T.Scene(); cenaT.background = new T.Color('#07060a');
    const descartes = [];
    const amb = new T.HemisphereLight('#bfc6d6', '#1a1410', .35); cenaT.add(amb);
    const luzServico = new T.PointLight('#ffffff', 0, 14, 2); cenaT.add(luzServico);
    const ctx = { T, cena: cenaT, ren, amb, celular, descartes };
    const quem = quemSou();
    const minha = quem === 'jog' ? A.salaDe(A.meu) : null;
    const mundo = op.andar ? mundoAndar(ctx, op.a, quem, quem === 'jog' ? (minha || op.cn) : null, op.cn) : mundoSala(ctx, cenaDe(op.cn), op.cn);

    const cam = new T.PerspectiveCamera(50, 1, .05, op.andar ? 160 : 80);
    const est = { modo: 'fora', theta: .62, phi: .95, r: mundo.rFora, ax: 0, az: 0, px: 0, pz: 0, yaw: 0, pitch: -.05, fov: 70, passo: 0 };
    // onde começa: posição trazida da outra vista, a ficha do jogador, ou a entrada da sala
    let ini = op.pos;
    if (!ini && quem === 'jog') {
      const pf = posFicha();
      if (pf && pf.a === op.a) { if (op.andar) ini = { x: pf.x, z: pf.z }; else { const [cx, cz] = centro(op.cn - 25 * (op.a - 1)); ini = { x: pf.x - cx, z: pf.z - cz }; } }
    }
    if (!ini && op.andar) { const [cx, cz] = centro(op.cn - 25 * (op.a - 1)); ini = { x: cx, z: cz + 3.6 }; }
    ini = ini || mundo.inicio;
    [est.px, est.pz] = pontoLivre(mundo.livre, ini.x, ini.z);
    est.yaw = ini.yaw || 0; if (ini.pitch !== undefined) est.pitch = ini.pitch;

    V = { op, ren, cena: cenaT, cam: est, camera: cam, mundo, descartes, amb, luzServico, lanterna: false, rodando: true, raf: 0, d,
      teclas: new Set(), correr: false, joy: null, quem, minha: quem === 'jog' ? (minha || op.cn) : null, sig: assinatura(op, quem === 'jog' ? (minha || op.cn) : null) };
    $$('.s3d-barra [data-s3dv="luz"]').forEach(b => b.classList.remove('on'));
    const ba = $('[data-s3dv="andar"]', d); $('i', ba).textContent = op.andar ? '🧊' : '🏢'; $('span', ba).textContent = op.andar ? 'Sala' : 'Andar';
    pintarSom();

    const tamanho = () => { const w = palco.clientWidth || innerWidth, h = palco.clientHeight || innerHeight; ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    tamanho(); V.tamanho = tamanho; addEventListener('resize', tamanho);
    definirModo(op.modo || 'fora');

    // controles: arrastar gira / olha; pinça e roda aproximam; toque rápido (no andar) vai até a sala
    const pts = new Map(); let dist0 = 0, ini0 = null;
    const el = ren.domElement; el.style.touchAction = 'none';
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      ini0 = pts.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; dist0 = Math.hypot(a[0] - b[0], a[1] - b[1]); }
    });
    el.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const [px, py] = pts.get(e.pointerId); const dx = e.clientX - px, dy = e.clientY - py; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const dd = Math.hypot(a[0] - b[0], a[1] - b[1]); if (dist0) zoom((dist0 - dd) * .02); dist0 = dd; return; }
      if (est.modo === 'dentro') { est.yaw -= dx * .005; est.pitch = Math.max(-1.2, Math.min(1.2, est.pitch - dy * .005)); }
      else { est.theta -= dx * .006; est.phi = Math.max(.06, Math.min(1.45, est.phi - dy * .006)); }
    });
    const ray = new T.Raycaster(), chao = new T.Plane(new T.Vector3(0, 1, 0), 0), pt = new T.Vector3(), v2 = new T.Vector2();
    const solta = e => {
      if (ini0 && e.type === 'pointerup' && mundo.tocou && est.modo !== 'dentro' && Math.hypot(e.clientX - ini0.x, e.clientY - ini0.y) < 8 && performance.now() - ini0.t < 400) {
        const r = el.getBoundingClientRect(); v2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
        ray.setFromCamera(v2, cam);
        if (ray.ray.intersectPlane(chao, pt)) { const alvo = mundo.tocou(pt.x, pt.z); if (alvo) { [est.px, est.pz] = pontoLivre(mundo.livre, alvo[0], alvo[1]); [est.ax, est.az] = mundo.alvo(est.px, est.pz); } }
      }
      ini0 = null; pts.delete(e.pointerId); if (pts.size < 2) dist0 = 0;
    };
    el.addEventListener('pointerup', solta); el.addEventListener('pointercancel', solta);
    el.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY * .01); }, { passive: false });
    function zoom(k) { if (est.modo === 'dentro') est.fov = Math.max(35, Math.min(100, est.fov + k * 8)); else est.r = Math.max(mundo.rMin, Math.min(mundo.rMax, est.r + k * (mundo.tipo === 'andar' ? 3 : 1.2))); }

    // andar: WASD / setas / joystick, com colisão (desliza na parede em vez de travar)
    function mover(dt) {
      let f = 0, s = 0;
      if (V.teclas.has('f')) f += 1; if (V.teclas.has('t')) f -= 1; if (V.teclas.has('d')) s += 1; if (V.teclas.has('e')) s -= 1;
      let corre = V.correr;
      if (V.joy) { f += V.joy.y; s += V.joy.x; if (Math.hypot(V.joy.x, V.joy.y) > .92) corre = true; }
      const m = Math.hypot(f, s); if (m < .05) return false;
      if (m > 1) { f /= m; s /= m; }
      const vel = (corre ? 4.2 : 2.1) * dt, sy = Math.sin(est.yaw), cyw = Math.cos(est.yaw);
      const dx = (-sy * f + cyw * s) * vel, dz = (-cyw * f - sy * s) * vel;
      const L = mundo.livre;
      if (L(est.px + dx, est.pz + dz)) { est.px += dx; est.pz += dz; }
      else if (L(est.px + dx, est.pz)) est.px += dx;
      else if (L(est.px, est.pz + dz)) est.pz += dz;
      est.passo += vel * 3.2;
      return true;
    }

    V.mover = mover;
    let t0 = performance.now(), tt = 0, tHud = 0, ultRot;
    const alvo = new T.Vector3();
    const quadro = agora => {
      if (!V || !V.rodando) return;
      V.raf = requestAnimationFrame(quadro);
      const dt = Math.min(.05, (agora - t0) / 1000); t0 = agora; tt += dt;
      const andou = est.modo === 'dentro' && mover(dt);
      // vista de fora: o centro da órbita segue a sala de quem anda
      const [rx, rz] = est.modo === 'dentro' ? [est.px, est.pz] : [est.ax, est.az];
      mundo.atualizar(dt, tt, est.modo === 'dentro' ? est.px : est.ax, est.modo === 'dentro' ? est.pz : est.az, est.modo);
      luzServico.position.set(rx, ALT - .3, rz);
      if (est.modo === 'dentro') {
        cam.fov += (est.fov - cam.fov) * .2;
        const y = 1.6 + (andou ? Math.sin(est.passo) * .025 : 0);
        cam.position.set(est.px, y, est.pz);
        cam.lookAt(est.px - Math.sin(est.yaw) * Math.cos(est.pitch), y + Math.sin(est.pitch), est.pz - Math.cos(est.yaw) * Math.cos(est.pitch));
      } else {
        cam.fov += (50 - cam.fov) * .2;
        alvo.x += (est.ax - alvo.x) * .12; alvo.z += (est.az - alvo.z) * .12; alvo.y = 1.1;
        cam.position.set(alvo.x + est.r * Math.sin(est.phi) * Math.sin(est.theta), alvo.y + est.r * Math.cos(est.phi), alvo.z + est.r * Math.sin(est.phi) * Math.cos(est.theta));
        cam.lookAt(alvo);
      }
      cam.updateProjectionMatrix();
      ren.render(cenaT, cam);
      // título (sala onde você está) e som, algumas vezes por segundo
      tHud -= dt;
      if (tHud <= 0) {
        tHud = .3;
        if (mundo.tipo === 'andar') {
          const cn = mundo.rotulo(rx, rz);
          if (cn !== ultRot) {
            ultRot = cn;
            $('#s3dCN').textContent = cn ? `CN ${pad2(cn)}` : `${op.a}º ANDAR`;
            $('#s3dNome').textContent = cn ? (ACF().nomeSala(cn) || '').replace(/^CN \d+\s*·?\s*/, '') : 'Corredor';
          }
        } else if (ultRot === undefined) {
          ultRot = op.cn; $('#s3dNome').textContent = (ACF().nomeSala(op.cn) || '').replace(/^CN \d+\s*·?\s*/, '');
        }
        Som.atualizar(mundo.sons(rx, rz));
      }
      Som.tick();
    };
    alvo.set(est.ax, 1.1, est.az);
    V.raf = requestAnimationFrame(quadro);
    V.retomar = () => { if (V && !V.rodando) { V.rodando = true; t0 = performance.now(); V.raf = requestAnimationFrame(quadro); } };
  }

  document.addEventListener('visibilitychange', () => {
    if (!V) return;
    if (document.hidden) { V.rodando = false; cancelAnimationFrame(V.raf); Som.pausar(); }
    else { V.retomar && V.retomar(); Som.retomar(); }
  });

  function fechar(trocando) {
    if (V) {
      V.rodando = false; cancelAnimationFrame(V.raf);
      removeEventListener('resize', V.tamanho);
      try { V.mundo.descartar(); } catch (e) {}
      V.descartes.forEach(x => { try { x.dispose && x.dispose(); } catch (e) {} });
      try { V.ren.dispose(); V.ren.forceContextLoss && V.ren.forceContextLoss(); } catch (e) {}
      V.ren.domElement.remove();
      V = null;
    }
    if (trocando) return;
    Som.atualizar([]); Som.parar();
    const d = $('#s3d'); if (d) { d.hidden = true; const j = $('#s3dJoy', d); if (j) j.hidden = true; }
    document.body.classList.remove('s3d-aberta');
  }

  /* ---------- vigia: a vista 3D acompanha o mapa ---------- */
  // "assinatura" do que está montado: se mudar (sala revelada, cena nova), a vista é remontada
  const cacheImp = new WeakMap();
  const imp = o => { if (!o || typeof o !== 'object') return '-'; if (o._h) return o._h; if (!cacheImp.has(o)) cacheImp.set(o, impressao(o)); return cacheImp.get(o); };
  function assinatura(op, minha) {
    const a = ACF(); if (!a) return '';
    if (!op.andar) return imp(cenaDe(op.cn));
    const q = quemSou(), partes = [];
    for (let p = 1; p <= 25; p++) {
      const cn = 25 * (op.a - 1) + p;
      const aberta = q === 'mestre' ? 1 : q === 'aux' ? (a.salaRevelada(cn) ? 1 : 0) : (cn === minha ? 1 : 0);
      partes.push(aberta ? imp(cenaDe(cn)) : '0');
    }
    return partes.join('|');
  }
  let tVigia = null;
  function vigiar() {
    clearTimeout(tVigia);
    tVigia = setTimeout(() => {
      if (!V) return;
      const a = ACF(), op = V.op, c = V.cam;
      if (V.quem === 'jog') {
        const agora = a.salaDe(a.meu), pf = posFicha();
        if (!op.andar) {
          if (agora !== op.cn || !cenaDe(op.cn)) { fechar(); a.aviso('Sua cobaia saiu da sala: a vista 3D foi fechada.'); }
          else if (assinatura(op, V.minha) !== V.sig) abrir(op.cn, { modo: c.modo, pos: { x: c.px, z: c.pz, yaw: c.yaw, pitch: c.pitch } });
          return;
        }
        if (!pf || pf.a !== op.a) { fechar(); a.aviso('Sua cobaia saiu deste andar: a vista 3D foi fechada.'); return; }
        // a ficha foi para outra sala: a vista vai junto (no corredor, nada muda)
        if (agora && agora !== V.minha) {
          if (cenaDe(agora)) abrir(agora, { andar: true, modo: c.modo });
          else { fechar(); a.aviso('Sua cobaia entrou numa sala sem cena 3D: a vista foi fechada.'); }
          return;
        }
        if (assinatura(op, V.minha) !== V.sig) { abrir(op.cn, { andar: true, modo: c.modo, pos: { x: c.px, z: c.pz, yaw: c.yaw, pitch: c.pitch } }); return; }
        V.mundo.portas && V.mundo.portas();
        return;
      }
      // Mestre e auxiliares
      if (!op.andar && !cenaDe(op.cn)) { fechar(); a.aviso('A cena 3D desta sala saiu do ar.'); return; }
      if (assinatura(op, V.minha) !== V.sig) { abrir(op.cn, { andar: op.andar, modo: c.modo, pos: { x: c.px, z: c.pz, yaw: c.yaw, pitch: c.pitch } }); return; }
      V.mundo.portas && V.mundo.portas();
    }, 250);
  }
  (function ligarVigia() {
    const a = ACF(); if (!a || !a.aoMudar) return setTimeout(ligarVigia, 250);
    a.aoMudar(vigiar);
    document.addEventListener('acf-segredos', vigiar);
  })();

  // para outros módulos e para testes
  // (testes) caixas de cada objeto de uma cena, em metros da sala
  function caixasDaCena(cena) {
    const T = window.THREE; if (!T) return [];
    const desc = [], g = new T.Group(); montarItens(criarFabrica(T, [], [], desc), cena, g, true);
    g.updateMatrixWorld(true); const b = new T.Box3();
    const out = g.children.map(o => { b.setFromObject(o); return { t: o.userData.t, x0: +b.min.x.toFixed(2), x1: +b.max.x.toFixed(2), y0: +b.min.y.toFixed(2), y1: +b.max.y.toFixed(2), z0: +b.min.z.toFixed(2), z1: +b.max.z.toFixed(2) }; });
    desc.forEach(x => { try { x.dispose(); } catch (e) {} });
    return out;
  }
  // (testes) anda de forma determinística: teclas = 'w', 'a', 's', 'd' (pode combinar); passos de 1/60 s
  function andarTeste(teclas, seg) {
    if (!V || V.cam.modo !== 'dentro') return null;
    const salva = new Set(V.teclas); V.teclas = new Set([...teclas].map(k => TECLAS[k]).filter(Boolean));
    for (let i = 0; i < seg * 60; i++) { V.mover(1 / 60); V.mundo.atualizar(1 / 60, i / 60, V.cam.px, V.cam.pz, 'dentro'); }
    V.teclas = salva; return [+V.cam.px.toFixed(2), +V.cam.pz.toFixed(2)];
  }
  function virarTeste(yaw) { if (V) V.cam.yaw = yaw; }
  window.Sala3D = { abrir, fechar, cenaDe, podeAbrir, caixasDaCena, andarTeste, virarTeste, publicar: agendarPublicar, get aberta() { return !!V; }, get estado() { return V ? { op: V.op, cam: { ...V.cam }, quem: V.quem } : null; }, Som };
})();
