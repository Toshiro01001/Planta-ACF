/* tokens3d.js · os TOKENS em 3D (miniaturas) da Planta
   Token = a imagem/figura do personagem no mapa (2.5D e 3D). Ficha = as informações de jogo
   (vida, sanidade, rituais). Aqui só existem tokens: nada de ficha aparece no 3D.

   - Cobaias e robôs S.T.A.F.F.: miniaturas montadas a partir da aparência de cada um.
   - NPCs: figura genérica de macacão, com a cor do token.
   - Filhos da O.R.F.E.U.: criaturas grandes. A FORMA de cada Filho é escolhida pelo Mestre
     (mapa/formas/<id>); o código só tem formas genéricas, sem nomes.
   - Modelo próprio (.glb): se existir modelos/modelos.json listando o token, o arquivo .glb
     substitui a miniatura (gerado, por exemplo, numa IA de imagem para 3D). */
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  const LOADER = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
  const SKUTIL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js';

  /* ---------- rosto pintado numa esfera (a frente da esfera fica em u = 0,25) ---------- */
  function rostoTex(F, o) {
    const [c, x] = NS.tela(256, 256);
    x.fillStyle = o.pele || '#d9b49a'; x.fillRect(0, 0, 256, 256);
    const cx = 64;
    if (o.bandagem) {
      x.fillStyle = o.bandagem; x.fillRect(0, 0, 256, 256);
      x.strokeStyle = 'rgba(60,45,25,.45)'; x.lineWidth = 3; const r = NS.rng(o.sem || 5);
      for (let y = -40; y < 300; y += 14) { x.beginPath(); x.moveTo(0, y + r() * 8); x.lineTo(256, y + 30 + r() * 10); x.stroke(); }
      x.fillStyle = 'rgba(25,18,10,.9)'; x.fillRect(cx - 44, 104, 88, 24);   // fresta dos olhos
    }
    if (o.sardas) { x.fillStyle = 'rgba(120,70,40,.5)'; const r = NS.rng(9); for (let i = 0; i < 18; i++) { x.beginPath(); x.arc(cx - 26 + r() * 52, 128 + r() * 18, 1.4, 0, 7); x.fill(); } }
    if (o.hematoma) { x.fillStyle = 'rgba(80,30,90,.45)'; x.beginPath(); x.ellipse(cx + 20, 116, 16, 12, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(150,10,10,.8)'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx - 30, 92); x.lineTo(cx - 12, 108); x.stroke(); }
    // olhos
    const oy = 116, dx = o.olhosLonge ? 22 : 18, tam = o.olhosGrandes ? 11 : 7;
    [-1, 1].forEach(s => {
      if (o.olhoBrilho) { x.fillStyle = o.olhoBrilho; x.shadowColor = o.olhoBrilho; x.shadowBlur = 10; x.beginPath(); x.ellipse(cx + s * dx, oy, tam * .9, tam * .6, 0, 0, 7); x.fill(); x.shadowBlur = 0; return; }
      x.fillStyle = '#f4efe6'; x.beginPath(); x.ellipse(cx + s * dx, oy, tam, tam * .7, 0, 0, 7); x.fill();
      x.fillStyle = o.iris || '#3a2414'; x.beginPath(); x.arc(cx + s * dx, oy, tam * .55, 0, 7); x.fill();
      x.fillStyle = '#000'; x.beginPath(); x.arc(cx + s * dx, oy, tam * .28, 0, 7); x.fill();
      if (!o.bandagem) { x.strokeStyle = o.sobrancelha || '#2b1d14'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx + s * dx - 9, oy - 13 + (o.bravo ? s * -2 : 0)); x.lineTo(cx + s * dx + 9, oy - 13 - (o.bravo ? s * -2 : 0)); x.stroke(); }
    });
    if (!o.bandagem) {
      x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, oy + 8); x.lineTo(cx - 3, oy + 26); x.lineTo(cx + 2, oy + 28); x.stroke();
      const b = o.boca || 'normal';
      if (b === 'sorriso_largo') { x.fillStyle = '#2a0f0a'; x.beginPath(); x.ellipse(cx, 160, 34, 10, 0, 0, Math.PI); x.fill(); x.strokeStyle = '#1a0806'; x.lineWidth = 3; x.beginPath(); x.ellipse(cx, 156, 40, 14, 0, .1, Math.PI - .1); x.stroke(); }
      else if (b === 'dentes') { x.fillStyle = '#3a0d0a'; x.beginPath(); x.ellipse(cx, 160, 22, 9, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#d8c98a'; for (let i = 0; i < 7; i++) x.fillRect(cx - 18 + i * 5.4, 154, 4, 7); }
      else if (b !== 'nenhuma') { x.strokeStyle = '#7a3a30'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx - 12, 158); x.quadraticCurveTo(cx, 162, cx + 12, 158); x.stroke(); }
      if (o.barba) { x.fillStyle = 'rgba(60,40,25,.35)'; x.beginPath(); x.ellipse(cx, 168, 40, 26, 0, 0, Math.PI); x.fill(); }
    }
    const t = new F.T.CanvasTexture(c); t.encoding = F.T.sRGBEncoding; F.guardar(t); return t;
  }

  // tecido com manchas (sangue, sujeira), listras de bandagem, camuflado…
  function panoTex(F, cor, estilo, sem) {
    const [c, x] = NS.tela(128, 128), r = NS.rng(sem || 3);
    x.fillStyle = cor; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(0,0,0,${.06 * r()})`; x.fillRect(r() * 128, r() * 128, 2, 2); }
    if (estilo === 'sangue') for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(${110 + r() * 40},0,0,${.4 + r() * .4})`; x.beginPath(); x.ellipse(r() * 128, r() * 128, 2 + r() * 7, 2 + r() * 12, r() * 3, 0, 7); x.fill(); }
    if (estilo === 'bandagem') { x.strokeStyle = 'rgba(60,45,25,.5)'; x.lineWidth = 2; for (let y = -30; y < 160; y += 10) { x.beginPath(); x.moveTo(0, y); x.lineTo(128, y + 22); x.stroke(); } }
    if (estilo === 'rasgado') for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(r() * 128, r() * 128, 2, 10 + r() * 20); }
    if (estilo === 'estampa') for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(90,90,90,.35)'; x.beginPath(); x.ellipse(r() * 128, r() * 128, 3 + r() * 6, 2 + r() * 4, r() * 3, 0, 7); x.fill(); }
    const t = new F.T.CanvasTexture(c); t.encoding = F.T.sRGBEncoding; t.wrapS = t.wrapT = F.T.RepeatWrapping; F.guardar(t); return t;
  }

  /* ---------- corpo humano articulado (miniatura) ---------- */
  // op: alt, pele, camisa, calca, sapato, maos, rosto{…}, cabelo{tipo, cor}, extras(F, partes)
  function humano(F, op) {
    const T = F.T, { G, bx, cy, sf, m } = F;
    const g = G(), corpo = G(); g.add(corpo);
    const k = (op.alt || 1.72) / 1.72; corpo.scale.setScalar(k);
    const mt = (cor, extra = {}) => m(cor, { r: .8, ...extra });
    const pele = mt(op.pele || '#d9b49a', { r: .6 });
    const camisa = op.camisaTex ? m('#ffffff', { unico: true, mapa: op.camisaTex, r: .85 }) : mt(op.camisa || '#888');
    const calca = op.calcaTex ? m('#ffffff', { unico: true, mapa: op.calcaTex, r: .85 }) : mt(op.calca || '#333');
    const sapato = mt(op.sapato || '#222', { r: .6 }), maos = op.maos ? mt(op.maos) : pele;
    // pernas (pivô no quadril)
    const pernas = [-1, 1].map(s => {
      const p = G(); p.position.set(s * .1, .92, 0); corpo.add(p);
      cy(p, .085, .07, .46, calca, 0, -.46, 0, 10); cy(p, .07, .06, .44, calca, 0, -.9, 0, 10);
      const pe = bx(p, .12, .08, .27, sapato, 0, -.94, .05); if (op.sapatoClaro) pe.material = mt(op.sapatoClaro);
      if (op.bolsosCalca) bx(p, .05, .14, .12, calca, s * .085, -.5, 0);
      return p;
    });
    // tronco
    const peito = cy(corpo, .2, .15, .6, camisa, 0, .92, 0, 16); peito.scale.z = .68;
    if (op.cinto) bx(corpo, .36, .06, .26, mt(op.cinto, { r: .5 }), 0, .92);
    // braços (pivô no ombro)
    const bracos = [-1, 1].map(s => {
      const b = G(); b.position.set(s * .24, 1.47, 0); corpo.add(b);
      const manga = s < 0 && op.mangaEsq ? mt(op.mangaEsq) : (op.mangaTex ? m('#ffffff', { unico: true, mapa: op.mangaTex, r: .85 }) : (op.manga ? mt(op.manga) : camisa));
      cy(b, .06, .05, .32, manga, 0, -.32, 0, 8);
      cy(b, .05, .045, .3, op.antebraco ? mt(op.antebraco) : (op.mangaCurta ? pele : manga), 0, -.62, 0, 8);
      sf(b, .052, s < 0 && op.maoEsq ? mt(op.maoEsq) : maos, 0, -.66, 0, 8);
      b.rotation.z = s * .07;
      return b;
    });
    // pescoço e cabeça
    cy(corpo, .05, .055, .1, pele, 0, 1.5, 0, 8);
    const cab = G(); cab.position.set(0, 1.7, 0); corpo.add(cab);
    const rosto = rostoTex(F, { pele: op.pele, ...(op.rosto || {}) });
    const cabeca = sf(cab, .12, m('#ffffff', { unico: true, mapa: rosto, r: .65 }), 0, 0, 0, 24); cabeca.scale.set(.92, 1.08, 1); cabeca.rotation.y = 0;
    const cab0 = op.cabelo || {};
    const mc = mt(cab0.cor || '#2b1d14', { r: .9 });
    if (cab0.tipo === 'coque') { const c1 = sf(cab, .125, mc, 0, .03, -.02, 16); c1.scale.set(.98, .9, 1); sf(cab, .07, mc, 0, .14, -.06, 12); for (let i = 0; i < 4; i++) { const f = cy(cab, .008, .004, .14, mc, -.08 + i * .05, -.06, .08, 4); f.rotation.x = .3; } }
    else if (cab0.tipo === 'trancas') { const c1 = sf(cab, .124, mc, 0, .025, -.01, 16); c1.scale.set(.97, .9, 1.02); [-1, 1].forEach(s => { for (let i = 0; i < 9; i++) sf(cab, .03 - i * .0015, mc, s * .09, -.06 - i * .055, .03 + Math.min(i, 3) * .025, 8); }); if (op.brincos) [-1, 1].forEach(s => { const t = new T.Mesh(F.guardar(new T.TorusGeometry(.025, .004, 6, 14)), m('#d4af37', { me: .9, r: .25 })); t.position.set(s * .115, -.05, 0); t.rotation.y = Math.PI / 2; cab.add(t); }); }
    else if (cab0.tipo === 'franja_longa') { const c1 = sf(cab, .126, mc, 0, .02, -.01, 16); c1.scale.set(1, .95, 1); bx(cab, .25, .05, .06, mc, 0, .06, .1); const longo = bx(cab, .3, .6, .08, mc, 0, -.55, -.08); [-1, 1].forEach(s => bx(cab, .05, .45, .1, mc, s * .12, -.4, .02)); }
    else if (cab0.tipo === 'baguncado') { const c1 = sf(cab, .124, mc, 0, .03, -.01, 14); c1.scale.set(.98, .85, 1); const r = NS.rng(13); for (let i = 0; i < 12; i++) sf(cab, .03, mc, (r() - .5) * .2, .08 + r() * .06, (r() - .5) * .2, 6); }
    if (op.extras) op.extras({ F, g, corpo, cab, cabeca, pernas, bracos, peito, mt });
    // animação: respira parado, balança braços e pernas andando
    let fase = 0;
    const anim = (dt, t, andando) => {
      if (andando) { fase += dt * 7; const a = Math.sin(fase) * .5; pernas[0].rotation.x = a; pernas[1].rotation.x = -a; if (!op.bracosFixos) { bracos[0].rotation.x = -a * .8; bracos[1].rotation.x = a * .8; } corpo.position.y = Math.abs(Math.cos(fase)) * .03 * k; }
      else { pernas.forEach(p => { p.rotation.x *= .85; }); if (!op.bracosFixos) bracos.forEach(b => { b.rotation.x *= .85; }); corpo.position.y = 0; cab.rotation.y = Math.sin(t * .5) * .15; peito.scale.x = 1 + Math.sin(t * 2) * .01; }
      if (op.anim) op.anim(dt, t, andando);
    };
    return { g, alt: op.alt || 1.72, anim, partes: { corpo, cab, bracos, pernas } };
  }

  /* ---------- Mostarda: escorpião de sangue meio humano ---------- */
  function escorpiao(F) {
    const T = F.T, { G, bx, cy, sf, m } = F;
    const g = G(), bicho = G(); g.add(bicho);
    const casca = m('#4a0407', { unico: true, r: .16, me: .18, e: '#1a0002', ei: .5 });
    const junta = m('#2a0306', { r: .35, me: .1 });
    const veia = m('#ff2a1a', { unico: true, e: '#c80a00', ei: 1.1 });
    const UP = new T.Vector3(0, 1, 0);
    // cilindro de p1 até p2 (patas e garras)
    const osso = (pai, a, b, r1, r2, mat = casca) => {
      const p1 = new T.Vector3(...a), p2 = new T.Vector3(...b), d = p2.clone().sub(p1), L = d.length();
      const me = new T.Mesh(F.guardar(new T.CylinderGeometry(r2, r1, L, 8)), mat);
      me.position.copy(p1).add(d.multiplyScalar(.5)); me.quaternion.setFromUnitVectors(UP, p2.clone().sub(p1).normalize()); pai.add(me);
      sf(pai, r1 * 1.15, junta, ...a, 8); return me;
    };
    // corpo do escorpião: prossoma na frente, sete placas do abdome para trás
    const prossoma = sf(bicho, .32, casca, 0, .5, .12, 18); prossoma.scale.set(1.05, .5, 1.1);
    const placas = [];
    for (let i = 0; i < 7; i++) {
      const w = .36 - i * .025, z = -.2 - i * .17;
      const pl = sf(bicho, w, casca, 0, .48 + Math.sin(i * .5) * .02, z, 16); pl.scale.set(1, .42, .55); placas.push(pl);
      const v = bx(bicho, w * 1.2, .012, .02, veia, 0, .48 + w * .4, z + .04); v.rotation.x = -.2;
    }
    // oito patas (quatro de cada lado)
    const patas = [];
    [-1, 1].forEach(sx => [.12, -.12, -.36, -.6].forEach((z, i) => {
      const p = G(); p.position.set(sx * .26, .5, z); bicho.add(p);
      const ab = .12 + i * .07;
      const joelho = [sx * .42, .16, (1.5 - i) * .07], pe = [sx * (.78 + ab * .5), -.5, (1.5 - i) * .16];
      osso(p, [0, 0, 0], joelho, .06, .05);
      osso(p, joelho, pe, .05, .014);
      patas.push({ p, sx, i });
    }));
    // cauda: seis segmentos encadeados, curvando por cima das costas; ferrão na ponta
    const cauda = []; let pai = G(); pai.position.set(0, .5, -1.3); pai.rotation.x = -1.0; bicho.add(pai); cauda.push(pai);
    for (let i = 0; i < 6; i++) {
      const L = .3 - i * .018, r = .15 - i * .013;
      const seg = sf(pai, r, casca, 0, L * .5, 0, 12); seg.scale.set(1, 1.3, 1);
      bx(pai, r * 1.4, .012, .02, veia, 0, L * .5, r * .9);
      const prox = G(); prox.position.set(0, L, 0); prox.rotation.x = .47; pai.add(prox); cauda.push(prox); pai = prox;
    }
    const ferrao = G(); pai.add(ferrao); ferrao.rotation.x = .5;
    const bulbo = sf(ferrao, .13, casca, 0, .12, 0, 14); bulbo.scale.set(1, 1.35, 1);
    const ponta = new T.Mesh(F.guardar(new T.ConeGeometry(.045, .28, 8)), m('#1a0204', { r: .2, me: .4 })); ponta.position.set(0, .34, .06); ponta.rotation.x = .5; ferrao.add(ponta);
    // gotas de sangue caindo do ferrão
    const gotas = [0, 1, 2].map(i => { const gt = sf(g, .025, m('#9a0008', { unico: true, r: .15, e: '#3a0000', ei: .5 }), 0, 0, 0, 8); gt.scale.set(1, 1.6, 1); return { gt, f: i / 3 }; });
    const poca = new T.Mesh(F.guardar(new T.CircleGeometry(.5, 20)), m('#3a0003', { unico: true, r: .1, op: .85 })); poca.rotation.x = -Math.PI / 2; poca.position.set(0, .02, -.3); poca.scale.set(1.3, 1, 1); g.add(poca);
    // o homem: o humano de sempre, só do quadril para cima, saindo da frente do escorpião
    const h = humano(F, { alt: 1.82, pele: '#c9a07a', camisaTex: panoTex(F, '#c8b593', 'sangue', 17), calca: '#2c2a26', sapato: '#1a1a1a', maos: '#1e1e1e',
      rosto: { bandagem: '#cdb48a', iris: '#2a2a2a', sem: 7 }, cabelo: { tipo: 'nenhum' },
      extras: ({ F, corpo, bracos, mt }) => {
        bx(corpo, .42, .5, .3, mt('#1d1f22', { r: .7 }), 0, 1.0, 0);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) bx(corpo, .1, .1, .06, mt('#26292d'), -.13 + i * .13, 1.05 + j * .14, .16);
        bx(corpo, .38, .06, .02, m('#ffffff', { unico: true, mapa: F.textoTex('SWAT', { w: 256, h: 48, cor: '#d8d8d8', fundo: '#1d1f22', tam: 34 }) }), 0, 1.38, .155);
        // cintura virando carapaça
        const cinta = cy(corpo, .2, .26, .2, casca, 0, .8, 0, 16); cinta.scale.z = .75;
        bracos.forEach(b => { b.children[1].material = m('#ffffff', { unico: true, mapa: panoTex(F, '#cdb48a', 'bandagem', 11), r: .9 }); b.children[2].visible = false; });
      } });
    h.partes.pernas.forEach(p => { p.visible = false; });
    const homem = G(); homem.add(h.g); homem.position.set(0, -.28, .3); bicho.add(homem);
    // pinças no lugar das mãos
    const pincas = h.partes.bracos.map((b, k) => {
      const pz = G(); pz.position.set(0, -.68, 0); pz.scale.setScalar(1.45); b.add(pz);
      const palma = sf(pz, .1, casca, 0, -.1, 0, 12); palma.scale.set(1, 1.5, .8);
      const fixo = new T.Mesh(F.guardar(new T.ConeGeometry(.05, .26, 8)), casca); fixo.position.set(.035, -.32, 0); fixo.rotation.z = Math.PI + .12; pz.add(fixo);
      const mov = G(); mov.position.set(-.04, -.2, 0); pz.add(mov);
      const dedo = new T.Mesh(F.guardar(new T.ConeGeometry(.04, .24, 8)), casca); dedo.position.set(0, -.12, 0); dedo.rotation.z = Math.PI; mov.add(dedo);
      return mov;
    });
    h.partes.bracos.forEach((b, k) => { b.rotation.x = -.5; b.rotation.z = (k ? 1 : -1) * .35; });
    let fase = 0;
    const anim = (dt, t, andando) => {
      h.anim(dt, t, false);
      h.partes.bracos.forEach((b, k) => { b.rotation.x = -.5 + Math.sin(t * 1.3 + k) * .12; b.rotation.z = (k ? 1 : -1) * (.35 + Math.sin(t * .9 + k * 2) * .06); });
      if (andando) fase += dt * 9;
      patas.forEach(({ p, sx, i }) => {
        const f = fase + i * 1.4 + (sx > 0 ? Math.PI : 0);
        p.rotation.y = andando ? Math.sin(f) * .28 : p.rotation.y * .9;
        p.rotation.z = andando ? Math.max(0, Math.cos(f)) * .18 * sx : p.rotation.z * .9;
      });
      bicho.position.y = andando ? Math.abs(Math.sin(fase * 2)) * .02 : 0;
      // a cauda balança devagar e às vezes dá o bote
      const bote = Math.max(0, Math.sin(t * .7) - .92) * 9;
      cauda.forEach((c, i) => { if (i) c.rotation.x = .47 + Math.sin(t * 1.4 + i * .5) * .05 - bote * .12; c.rotation.y = Math.sin(t * .8 + i * .3) * .08; });
      pincas.forEach((pm, k) => { pm.rotation.z = -.15 - Math.max(0, Math.sin(t * 2.2 + k * 1.7)) * .5; });
      placas.forEach((pl, i) => { pl.scale.y = .42 + Math.sin(t * 2 - i * .6) * .02; });
      // gotas: caem do ferrão até o chão e recomeçam
      ferrao.updateWorldMatrix(true, false); const ptW = ponta.getWorldPosition(new T.Vector3()); g.worldToLocal(ptW);
      gotas.forEach(o => { const q = (t * .6 + o.f) % 1; o.gt.position.set(ptW.x, Math.max(.03, ptW.y * (1 - q * q)), ptW.z + .05); o.gt.visible = q < .97; });
    };
    return { g, alt: 2.05, anim, raioBase: .62 };
  }

  /* ---------- as sete cobaias (a partir das imagens de referência) ---------- */
  const COBAIAS = {
    // Faca: coque, camiseta clara, calça cargo verde-oliva, cinto de bolsas, tênis vermelho-marrom,
    // braço esquerdo com luva escura e a bolsa com a planta (brotos e gavinhas escuras) no quadril
    faca: F => humano(F, { alt: 1.62, pele: '#e2bea4', camisa: '#e6e2d8', calca: '#56603e', sapato: '#7a3a2a', cinto: '#5a3a22', bolsosCalca: true,
      mangaCurta: true, maoEsq: '#2a2a2a', antebraco: null, rosto: { sardas: true, iris: '#4a3a22' }, cabelo: { tipo: 'coque', cor: '#3b2416' },
      extras: ({ F, corpo, bracos, mt }) => {
        const { bx, cy, sf, G, m, T } = F;
        cy(bracos[0], .052, .048, .3, mt('#2a2a2a'), 0, -.62, 0, 8);    // luva longa
        const bolsa = G(); bolsa.position.set(-.26, .88, .05); corpo.add(bolsa);
        const s = cy(bolsa, .13, .12, .26, mt('#6b4a2a', { r: .7 }), 0, 0, 0, 12); s.scale.z = .8;
        const folha = mt('#3f7a34', { r: .6 }), escura = mt('#2a1a1e', { r: .5 });
        for (let i = 0; i < 7; i++) { const f = new T.Mesh(F.guardar(new T.ConeGeometry(.04, .22, 5)), folha); f.position.set((i % 3 - 1) * .06, .3 + (i % 2) * .08, (i % 2) * .04); f.rotation.set(.3 * (i % 3 - 1), i, .5 * (i % 2 ? 1 : -1)); bolsa.add(f); }
        for (let i = 0; i < 3; i++) { const pts = []; for (let k2 = 0; k2 < 6; k2++) pts.push(new T.Vector3(Math.sin(k2 + i) * .08, .25 + k2 * .11, Math.cos(k2 * 1.3 + i) * .06)); const tb = new T.Mesh(F.guardar(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 20, .012, 6)), escura); bolsa.add(tb); }
        sf(bolsa, .035, m('#8a1a1a', { e: '#3a0000', ei: .4 }), .05, .55, .02, 8);
        bx(corpo, .05, .5, .02, mt('#5a3a22'), .1, 1.05, .14).rotation.z = .6;   // alça
      },
      anim: null }),
    // Sabonete: capa azul-escura com capuz, máscara de caveira dourada com olhos vermelhos e tubo de respiração,
    // cachecol vermelho, peitoral de bronze e um revólver longo
    sabonete: F => humano(F, { alt: 1.8, pele: '#5a4a3a', camisa: '#2b2e3a', calca: '#2a2a30', sapato: '#3a2a1a', maos: '#4a3020', manga: '#232a3f',
      rosto: { pele: '#b88a2a', olhoBrilho: '#ff2a1a', boca: 'nenhuma' }, cabelo: { tipo: 'nenhum' },
      extras: ({ F, corpo, cab, cabeca, bracos, mt }) => {
        const { bx, cy, sf, G, m, T } = F;
        cabeca.material = m('#ffffff', { unico: true, mapa: (() => { const [c, x] = NS.tela(256, 256); const gr = x.createRadialGradient(64, 128, 10, 64, 128, 120); gr.addColorStop(0, '#e2b84a'); gr.addColorStop(1, '#6a4a12'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); x.fillStyle = '#140804'; [-1, 1].forEach(s => { x.beginPath(); x.ellipse(64 + s * 20, 116, 15, 12, 0, 0, 7); x.fill(); }); x.fillStyle = '#ff2a1a'; x.shadowColor = '#ff2a1a'; x.shadowBlur = 12; [-1, 1].forEach(s => { x.beginPath(); x.arc(64 + s * 20, 117, 4.5, 0, 7); x.fill(); }); x.shadowBlur = 0; x.fillStyle = '#140804'; x.beginPath(); x.moveTo(64, 132); x.lineTo(58, 146); x.lineTo(70, 146); x.fill(); for (let i = 0; i < 6; i++) x.fillRect(46 + i * 6.5, 160, 4, 10); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; F.guardar(t); return t; })(), me: .8, r: .3, e: '#2a1a00', ei: .3 });
        const capa = mt('#1f2a44', { r: .95, lado: 2 });
        const capuz = sf(cab, .17, capa, 0, .03, -.03, 16); capuz.scale.set(1, 1.15, 1.05);
        const capuzFrente = new T.Mesh(F.guardar(new T.SphereGeometry(.175, 16, 12, Math.PI * .1, Math.PI * .8)), m('#0a0a10', { lado: 2 })); capuzFrente.position.set(0, .03, .02); capuzFrente.rotation.y = Math.PI; cab.add(capuzFrente);
        const manto = new T.Mesh(F.guardar(new T.CylinderGeometry(.26, .42, 1.15, 16, 1, true, Math.PI * .15, Math.PI * 1.7)), capa); manto.position.set(0, 1.0, 0); corpo.add(manto);
        const cache = new T.Mesh(F.guardar(new T.TorusGeometry(.09, .04, 8, 16)), mt('#9a1a14')); cache.position.set(0, 1.5, .02); cache.rotation.x = Math.PI / 2; corpo.add(cache);
        const peit = cy(corpo, .21, .17, .4, m('#6b4a22', { me: .7, r: .45 }), 0, 1.05, .02, 14); peit.scale.z = .72;
        const tubo = new T.Mesh(F.guardar(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 1.62, .13), new T.Vector3(.04, 1.5, .2), new T.Vector3(.1, 1.35, .17), new T.Vector3(.12, 1.2, .12)]), 20, .015, 6)), m('#8a7a5a', { me: .7, r: .4 })); corpo.add(tubo);
        const arma = G(); arma.position.set(0, -.68, .05); bracos[1].add(arma); bx(arma, .04, .1, .05, m('#3a2416'), 0, -.05, 0); bx(arma, .035, .04, .38, m('#5a4a3a', { me: .7, r: .4 }), 0, .02, .16); cy(arma, .028, .028, .07, m('#4a3a2a', { me: .7 }), 0, .0, .04, 10).rotation.x = Math.PI / 2;
        bracos[1].rotation.x = -.3;
      } }),
    // Mostarda: o amálgama. Da cintura para cima, o homem de sempre (cabeça enfaixada, colete SWAT, camisa
    // manchada); da cintura para baixo, um escorpião de sangue: carapaça vermelha molhada, oito patas,
    // pinças no lugar das mãos e a cauda arqueada sobre a cabeça, pingando
    mostarda: F => escorpiao(F),
    // Papelão: alto, cabeça enfaixada cinza com olhos amarelos, sobretudo longo e rasgado, fivelas douradas,
    // mãos enfaixadas em garra e botas pretas
    papelao: F => humano(F, { alt: 1.92, pele: '#8a8a82', camisa: '#4a4a48', calca: '#2a2a2c', sapato: '#141414', manga: '#545658', maos: '#8a877a',
      rosto: { bandagem: '#8f8d84', olhoBrilho: '#ffd84a', sem: 3 }, cabelo: { tipo: 'nenhum' },
      extras: ({ F, corpo, bracos, mt }) => {
        const { bx, cy, G, m, T } = F;
        const casaco = new T.Mesh(F.guardar(new T.CylinderGeometry(.24, .46, 1.25, 18, 1, true, Math.PI * .12, Math.PI * 1.76)), m('#ffffff', { unico: true, mapa: panoTex(F, '#5c5e60', 'rasgado', 4), r: .95, lado: 2 })); casaco.position.set(0, .85, 0); corpo.add(casaco);
        [-1, 1].forEach(s => bx(corpo, .14, .06, .26, mt('#2a3156'), s * .2, 1.48));
        const ouro = m('#c9a227', { me: .85, r: .3 });
        for (let i = 0; i < 4; i++) { const f = bx(corpo, .44, .035, .02, mt('#6b6658'), 0, 1.0 + i * .1, .15); f.rotation.z = (i % 2 ? .35 : -.35); bx(corpo, .05, .05, .02, ouro, (i % 2 ? .08 : -.08), 1.0 + i * .1, .165); }
        bracos.forEach(b => { for (let k = 0; k < 4; k++) { const d = cy(b, .012, .004, .1, mt('#7a7768'), -.03 + k * .02, -.77, .02, 4); d.rotation.x = .3; } });
      } }),
    // Papel: tranças longas, brincos de argola, terno preto, camisa branca, mãos nos bolsos
    papel: F => humano(F, { alt: 1.7, pele: '#5a3a2a', camisa: '#121214', calca: '#111113', sapato: '#0c0c0c', bracosFixos: true,
      rosto: { pele: '#5a3a2a', iris: '#1f130c', sobrancelha: '#140c08' }, cabelo: { tipo: 'trancas', cor: '#140e0b' }, brincos: true,
      extras: ({ F, corpo, bracos, mt }) => {
        const { bx, m, T } = F;
        const gola = new T.Mesh(F.guardar(new T.ConeGeometry(.1, .28, 3)), m('#f2f2f0')); gola.position.set(0, 1.36, .12); gola.rotation.x = Math.PI; gola.scale.z = .3; corpo.add(gola);
        bracos.forEach((b, i) => { b.rotation.z = (i ? 1 : -1) * .18; b.rotation.x = .25; });
        [-1, 1].forEach(s => bx(corpo, .04, .36, .02, mt('#1d1d20'), s * .07, 1.12, .15).rotation.z = s * .25);
      } }),
    // Luva: macacão laranja de presídio sujo de sangue, cinto preto, tênis brancos, cabelo bagunçado,
    // barba por fazer, rosto machucado e sorriso de dentes amarelos
    luva: F => humano(F, { alt: 1.84, pele: '#d9a88a', camisaTex: panoTex(F, '#ef6a14', 'sangue', 21), calcaTex: panoTex(F, '#e8650f', 'sangue', 22), mangaCurta: true, sapato: '#f0f0ec', cinto: '#141414',
      rosto: { hematoma: true, boca: 'dentes', barba: true, iris: '#4a3a2a', bravo: true }, cabelo: { tipo: 'baguncado', cor: '#5a3a22' } }),
    // Velcro: cabelo longo e liso com franja, vestido escuro com estampa, rosto pálido de olhos arregalados
    // e um sorriso largo demais; mãos no rosto
    velcro: F => humano(F, { alt: 1.55, pele: '#e9c9a4', camisaTex: panoTex(F, '#2a2826', 'estampa', 31), calca: '#2a2826', sapato: '#1a1a1a', bracosFixos: true,
      rosto: { olhosGrandes: true, iris: '#c9741a', boca: 'sorriso_largo', sobrancelha: '#1a1210' }, cabelo: { tipo: 'franja_longa', cor: '#1e1612' },
      extras: ({ F, corpo, bracos, mt }) => {
        const { m, T } = F;
        const saia = new T.Mesh(F.guardar(new T.CylinderGeometry(.2, .38, .7, 16, 1, true)), m('#ffffff', { unico: true, mapa: panoTex(F, '#2a2826', 'estampa', 32), r: .95, lado: 2 })); saia.position.set(0, .62, 0); corpo.add(saia);
        bracos.forEach((b, i) => { b.rotation.x = -2.2; b.rotation.z = (i ? -1 : 1) * .45; });
      } }),
  };

  /* ---------- robôs S.T.A.F.F. ---------- */
  const ROBOS = { c2p0: { cor: '#d4a53a', nome: 'C2P0' }, b00bies: { cor: '#2a2a2c', nome: 'B00BIES', detalhe: '#b9bec4' }, m3rl1n: { cor: '#c0392b', nome: 'M3RL1N' }, k4iser: { cor: '#c62828', nome: 'K4ISER', olhos: '#ffb000' } };
  function robo(F, id, s) {
    const T = F.T, { G, bx, cy, sf, m } = F, cfg = ROBOS[id] || { cor: s.cor, nome: s.nome };
    const g = G(), cor = m(cfg.cor, { me: .55, r: .4 }), branco = m('#e8e4dc', { r: .45 }), preto = m('#1b1b1d', { r: .6 });
    // base com rodas e o nome
    const base = cy(g, .34, .4, .42, preto, 0, .16, 0, 24); cy(g, .41, .41, .1, cor, 0, .16, 0, 24); cy(g, .36, .36, .08, cor, 0, .54, 0, 24);
    const rotulo = new T.Mesh(F.guardar(new T.CylinderGeometry(.402, .402, .16, 24, 1, true, -Math.PI * .25, Math.PI * .5)), m('#ffffff', { unico: true, mapa: F.textoTex(cfg.nome, { w: 512, h: 96, cor: '#f2f2f2', fundo: '#1b1b1d', tam: 60, fonte: 'Arial Black, Arial, sans-serif' }) })); rotulo.position.y = .38; g.add(rotulo);
    const rodas = [];
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => { const r = cy(g, .16, .16, .12, preto, sx * .4, 0, sz * .2, 18); r.rotation.z = Math.PI / 2; r.position.set(sx * .4, .16, sz * .2); cy(r, .07, .07, .13, cor, 0, -.065, 0, 12); rodas.push(r); }));
    // mola do pescoço da cintura
    const mola = G(); mola.position.y = .62; g.add(mola);
    for (let i = 0; i < 5; i++) { const t = new T.Mesh(F.guardar(new T.TorusGeometry(.18, .025, 6, 20)), preto); t.rotation.x = Math.PI / 2; t.position.y = i * .045; mola.add(t); }
    // tronco
    const tronco = G(); tronco.position.y = .85; g.add(tronco);
    const peito = cy(tronco, .25, .22, .42, branco, 0, 0, 0, 20); peito.scale.z = .8;
    if (id === 'k4iser') { const faixa = bx(tronco, .14, .4, .02, cor, 0, .02, .19); }
    for (let i = 0; i < 3; i++) sf(tronco, .028, m('#ffc12a', { e: '#ff9a00', ei: id === 'k4iser' ? .8 : .2 }), 0, .1 + i * .1, .19, 10);
    const ombros = [-1, 1].map(sx => { const o = sf(tronco, .1, cor, sx * .27, .36, 0, 12); o.scale.set(1, .8, 1); return o; });
    const bracos = [-1, 1].map(sx => { const b = G(); b.position.set(sx * .3, .32, 0); tronco.add(b); cy(b, .05, .05, .2, cor, 0, -.22, 0, 10); cy(b, .045, .05, .2, branco, 0, -.42, 0, 10); bx(b, .09, .1, .07, preto, 0, -.52, 0); for (let k = 0; k < 3; k++) bx(b, .018, .07, .02, preto, -.03 + k * .03, -.6, .01); b.rotation.z = sx * .15; return b; });
    // cabeça: rosto de cerâmica, olhos grandes, bochechas laranja, capacete e fones na cor do robô
    const cab = G(); cab.position.y = 1.43; tronco.add(cab); cab.position.y = .58;
    const [c, x] = NS.tela(256, 256); x.fillStyle = '#ece8e0'; x.fillRect(0, 0, 256, 256);
    const ol = cfg.olhos;
    [-1, 1].forEach(sx => { x.fillStyle = ol || '#0c0c0c'; if (ol) { x.shadowColor = ol; x.shadowBlur = 16; } x.beginPath(); x.ellipse(64 + sx * 26, 118, 17, 21, 0, 0, 7); x.fill(); x.shadowBlur = 0; if (!ol) { x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.arc(64 + sx * 26 - 5, 110, 4, 0, 7); x.fill(); } x.fillStyle = '#ff8a2a'; x.beginPath(); x.arc(64 + sx * 34, 150, 9, 0, 7); x.fill(); });
    x.fillStyle = '#1a1a1a'; x.beginPath(); x.ellipse(64, 158, 5, 4, 0, 0, 7); x.fill();
    for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * .05})`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    const tx = new T.CanvasTexture(c); tx.encoding = T.sRGBEncoding; F.guardar(tx);
    const rosto = m('#ffffff', { unico: true, mapa: tx, r: .35, ...(ol ? { e: '#ffffff', ei: 0 } : {}) });
    const cabeca = sf(cab, .24, rosto, 0, .1, 0, 28); cabeca.scale.set(1, 1.05, .95);
    const capacete = new T.Mesh(F.guardar(new T.SphereGeometry(.25, 24, 12, 0, Math.PI * 2, 0, Math.PI * .42)), cor); capacete.position.y = .1; capacete.rotation.x = -.35; cab.add(capacete);
    [-1, 1].forEach(sx => { const f = cy(cab, .09, .09, .07, cor, sx * .25, .06, 0, 16); f.rotation.z = Math.PI / 2; f.position.set(sx * .25, .1, 0); cy(cab, .055, .055, .08, preto, sx * .27, .1, 0, 14).rotation.z = Math.PI / 2; });
    if (ol) F.luz(cab, ol, .25, 1.6, 0, .1, .3);
    const anim = (dt, t, andando) => {
      if (andando) rodas.forEach(r => { r.rotation.x += dt * 9; });
      mola.scale.y = 1 + Math.sin(t * (andando ? 14 : 2)) * (andando ? .08 : .03);
      tronco.position.y = .85 + (mola.scale.y - 1) * .2;
      cab.rotation.z = Math.sin(t * .7) * .12; cab.rotation.y = Math.sin(t * .4) * .25;
      bracos.forEach((b, i) => { b.rotation.x = andando ? Math.sin(t * 8 + i * Math.PI) * .4 : Math.sin(t * 1.3 + i) * .05; });
    };
    return { g, alt: 1.5, anim };
  }

  /* ---------- NPCs (cobaias de outros ciclos): macacão laranja e a cor do token no braço ---------- */
  function npc(F, s) {
    const h = humano(F, { alt: 1.74, pele: '#cfa588', camisa: '#d9661f', calca: '#cf5f1a', sapato: '#2a2a2a', cinto: '#3a2a1a', rosto: { iris: '#3a2a1a' }, cabelo: { tipo: 'baguncado', cor: '#2b1d14' },
      extras: ({ F, bracos }) => { const fx = F.cy(bracos[0], .065, .065, .07, F.m(s.cor || '#888'), 0, -.2, 0, 10); } });
    return h;
  }

  /* ---------- Filhos da O.R.F.E.U.: formas genéricas de criatura (o Mestre escolhe qual) ---------- */
  const FORMAS = ['esguio', 'colosso', 'rastejante', 'retalhos', 'mecanico', 'sombra', 'luz', 'enxame', 'estatica', 'olhos'];
  const NOMES_FORMA = { esguio: 'Esguio (alto e magro)', colosso: 'Colosso (enorme)', rastejante: 'Rastejante (de quatro)', retalhos: 'Retalhos (costurado)', mecanico: 'Mecânico (próteses)', sombra: 'Sombra', luz: 'Luz', enxame: 'Enxame (muitos rostos)', estatica: 'Estática (falha)', olhos: 'Olhos' };
  function criatura(F, s, forma) {
    const T = F.T, { G, bx, cy, sf, m } = F, g = G(), cor = s.cor || '#ff4d6d';
    const pele = { esguio: '#b8aaa0', colosso: '#6a2a28', rastejante: '#9a8a80', retalhos: '#c49a8a', mecanico: '#8a7a74', sombra: '#050506', luz: '#ffffff', enxame: '#b08a80', estatica: '#a0a0a8', olhos: '#9c4a4f' }[forma] || '#b8aaa0';
    const matPele = forma === 'sombra' ? m('#050506', { unico: true, op: .82, r: 1 }) : forma === 'luz' ? m('#ffffff', { unico: true, e: '#ffffff', ei: 1.6 }) : forma === 'retalhos' ? m('#ffffff', { unico: true, mapa: (() => { const [c, x] = NS.tela(128, 128), r = NS.rng(77); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.fillStyle = ['#d8a890', '#a87a64', '#e2c0a8', '#8a5a4a'][Math.floor(r() * 4)]; x.fillRect(i * 32, j * 32, 32, 32); } x.strokeStyle = '#2a0a0a'; x.lineWidth = 2; for (let i = 0; i <= 128; i += 32) { x.setLineDash([3, 3]); x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); } const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; F.guardar(t); return t; })(), r: .7 }) : m(pele, { r: .55, tex: forma === 'olhos' ? 'carne' : undefined });
    const brilho = m('#ffffff', { unico: true, e: cor, ei: 2 });
    const corpo = G(); g.add(corpo);
    let alt = 2.6, anim;
    const membro = (pai, comp, raio, x, y, z, rx, rz, mat = matPele) => { const p = G(); p.position.set(x, y, z); p.rotation.set(rx || 0, 0, rz || 0); pai.add(p); cy(p, raio, raio * .7, comp, mat, 0, -comp, 0, 8); return p; };
    if (forma === 'rastejante') {
      alt = 1.1; const tronco = cy(corpo, .22, .18, 1.4, matPele, 0, 0, 0, 12); tronco.rotation.x = Math.PI / 2; tronco.position.set(0, .9, 0);
      const pernas = [];
      for (let i = 0; i < 4; i++) { const sx = i % 2 ? 1 : -1, sz = i < 2 ? .55 : -.55; const p = G(); p.position.set(sx * .2, .9, sz); corpo.add(p); const a = cy(p, .06, .05, .8, matPele, 0, 0, 0, 8); a.position.set(sx * .35, .2, 0); a.rotation.z = sx * 1.1; const b = cy(p, .05, .03, 1.1, matPele, 0, 0, 0, 8); b.position.set(sx * .75, -.45, 0); b.rotation.z = -sx * .35; pernas.push(p); }
      const cab = sf(corpo, .18, matPele, 0, .7, .85, 14); cab.scale.set(.8, 1, 1.3); [-1, 1].forEach(s2 => sf(corpo, .03, brilho, s2 * .06, .72, 1.06, 8));
      anim = (dt, t, andando) => { pernas.forEach((p, i) => { p.rotation.x = Math.sin(t * (andando ? 9 : 1.5) + i * 1.6) * (andando ? .35 : .05); }); corpo.position.y = Math.sin(t * 2) * .02; cab.rotation.z = Math.sin(t * 3) * .3; };
    } else if (forma === 'enxame') {
      alt = 2.3; const massa = sf(corpo, .7, matPele, 0, 1.2, 0, 18); massa.scale.set(1, 1.3, .9);
      const rostos = []; const r = NS.rng(81);
      for (let i = 0; i < 14; i++) { const a = r() * 6.283, b = (r() - .3) * 2; const rr = sf(corpo, .13, m('#ffffff', { unico: true, mapa: rostoTex(F, { pele: '#c9a090', boca: r() < .5 ? 'dentes' : 'sorriso_largo', olhosGrandes: true }), r: .6 }), Math.cos(a) * .65, 1.2 + b * .45, Math.sin(a) * .55, 16); rr.rotation.y = -a + Math.PI / 2 - Math.PI / 2; rr.lookAt(rr.position.x * 3, rr.position.y, rr.position.z * 3); rostos.push(rr); }
      [-1, 1].forEach(sx => { for (let k = 0; k < 2; k++) membro(corpo, 1.1, .06, sx * .55, 1.4 - k * .4, 0, 0, sx * (.4 + k * .3)); });
      anim = (dt, t) => { rostos.forEach((rr, i) => { rr.scale.setScalar(1 + Math.sin(t * 3 + i) * .08); }); massa.scale.x = 1 + Math.sin(t * 1.2) * .04; };
    } else {
      // corpo humanoide de criatura (esguio é a base; as outras formas mudam proporção e enfeites)
      const P0 = { esguio: [2.6, .14, 1.0], colosso: [3.1, .42, 1.35], retalhos: [2.3, .24, 1.0], mecanico: [2.4, .22, 1.05], sombra: [2.5, .16, 1.0], luz: [2.4, .16, 1.0], estatica: [2.4, .16, 1.0], olhos: [2.5, .26, 1.05] }[forma] || [2.6, .14, 1];
      alt = P0[0]; const larg = P0[1], kk = alt / 2.6;
      const quadril = 1.25 * kk;
      const pernas = [-1, 1].map(sx => { const p = membro(corpo, quadril * .52, larg * .55 + .04, sx * (larg * .5 + .06), quadril, 0); const q = cy(p, larg * .4 + .03, larg * .3 + .02, quadril * .5, matPele, 0, -quadril * 1.02, 0, 8); return p; });
      const tronco = G(); tronco.position.set(0, quadril, 0); tronco.rotation.x = forma === 'colosso' ? .15 : .35; corpo.add(tronco);
      const peito = cy(tronco, larg + .16, larg * .7 + .1, alt * .32, matPele, 0, 0, 0, 12); peito.scale.z = .7;
      // costelas aparentes no esguio
      if (forma === 'esguio' || forma === 'olhos') for (let i = 0; i < 5; i++) { const c2 = new T.Mesh(F.guardar(new T.TorusGeometry(larg + .15, .015, 6, 18, Math.PI)), matPele); c2.position.set(0, alt * .12 + i * .09, .02); c2.rotation.set(Math.PI / 2, 0, 0); c2.scale.z = .7; tronco.add(c2); }
      const ombro = alt * .32;
      const bracos = [-1, 1].map(sx => { const b = membro(tronco, alt * .3, larg * .45 + .04, sx * (larg + .2), ombro, 0, 0, sx * .12); const ante = G(); ante.position.set(0, -alt * .3, 0); b.add(ante); cy(ante, larg * .38 + .03, larg * .25 + .02, alt * .3, forma === 'mecanico' && sx > 0 ? m('#7a8288', { me: .8, r: .35 }) : matPele, 0, -alt * .3, 0, 8);
        for (let k2 = 0; k2 < 4; k2++) { const d = cy(ante, .012 * (1 + larg), .004, .22 * kk + (forma === 'esguio' ? .15 : 0), forma === 'mecanico' && sx > 0 ? m('#9aa0a6', { me: .9 }) : m('#2a1a18', { r: .4 }), (k2 - 1.5) * .035, -alt * .3 - .12, .02, 4); d.rotation.x = .25; }
        return b; });
      const cab = G(); cab.position.set(0, ombro + .12 * kk, .05); tronco.add(cab);
      const crane = sf(cab, .13 * (forma === 'colosso' ? 1.3 : 1), matPele, 0, .12, 0, 16); crane.scale.set(.85, forma === 'esguio' ? 1.5 : 1.15, 1);
      if (forma !== 'olhos') { const boca = bx(cab, .025, .18, .02, m('#0a0000'), 0, .08, .12); [-1, 1].forEach(s2 => sf(cab, .022, brilho, s2 * .05, .2, .1, 8)); }
      if (forma === 'olhos') { const r = NS.rng(91); for (let i = 0; i < 16; i++) { const o2 = G(); const a = r() * 6.283; o2.position.set(Math.cos(a) * (larg + .12), alt * .05 + r() * alt * .25, Math.sin(a) * (larg * .7 + .1) + .05); tronco.add(o2); const gl = sf(o2, .06, m('#120807', { r: .12, me: .2 }), 0, 0, 0, 12); gl.scale.set(1.3, .8, .8); sf(o2, .02, brilho, .02, .01, .04, 6); o2.lookAt(o2.position.x * 4, o2.position.y, o2.position.z * 4); } }
      if (forma === 'retalhos') for (let i = 0; i < 6; i++) { const lin = bx(tronco, .005, .35, .012, m('#1a0505'), -.15 + i * .06, alt * .05, larg * .7 + .1); lin.rotation.z = (i - 3) * .2; }
      if (forma === 'mecanico') { for (let i = 0; i < 4; i++) { const pts = [new T.Vector3(-.1 + i * .07, alt * .25, .1), new T.Vector3(.2, alt * .1, .3), new T.Vector3(.35, -.1, .1)]; tronco.add(new T.Mesh(F.guardar(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 12, .015, 5)), m('#1a1a1a'))); } F.luz(tronco, '#9fd8ff', .4, 2, .35, 0, .2, true); }
      if (forma === 'luz') F.luz(corpo, '#ffffff', 1.4, 7, 0, alt * .6, .4);
      if (forma === 'sombra') { const r = NS.rng(95); for (let i = 0; i < 10; i++) { const n2 = sf(corpo, .25 + r() * .25, m('#000000', { unico: true, op: .25 }), (r() - .5) * .6, .3 + r() * alt * .8, (r() - .5) * .4, 10); } }
      let fase = 0;
      anim = (dt, t, andando) => {
        if (andando) { fase += dt * (forma === 'colosso' ? 4 : 6); const a = Math.sin(fase) * .45; pernas[0].rotation.x = a; pernas[1].rotation.x = -a; bracos[0].rotation.x = -a * .7; bracos[1].rotation.x = a * .7; }
        else { pernas.forEach(p => { p.rotation.x *= .9; }); bracos.forEach((b, i) => { b.rotation.x = Math.sin(t * .9 + i) * .08; }); }
        // espasmos: a cabeça vira de repente
        cab.rotation.y = Math.sin(t * .6) * .4 + (Math.sin(t * 7.3) > .97 ? .8 : 0);
        cab.rotation.z = Math.sin(t * 1.7) * .1;
        peito.scale.x = 1 + Math.sin(t * 1.6) * .03;
        if (forma === 'estatica') { corpo.visible = Math.sin(t * 23) * Math.sin(t * 7) > -.6; corpo.position.x = Math.sin(t * 47) > .9 ? (Math.random() - .5) * .3 : 0; }
      };
    }
    // aura escura no chão
    const aura = new T.Mesh(F.guardar(new T.CircleGeometry(alt * .35, 24)), m('#000000', { unico: true, op: .55 })); aura.rotation.x = -Math.PI / 2; aura.position.y = .012; g.add(aura);
    return { g, alt, anim };
  }

  /* ---------- modelos .glb opcionais (modelos/modelos.json) ---------- */
  let manifesto = null, pedindo = null;
  const gltfCache = new Map();
  const carregarScript = src => new Promise((ok, falha) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = falha; document.head.appendChild(s); });
  function carregarModelos() {
    if (pedindo) return pedindo;
    pedindo = fetch('modelos/modelos.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(async j => {
      manifesto = j || {};
      if (Object.keys(manifesto).length && window.THREE && !THREE.GLTFLoader) { try { await carregarScript(LOADER); await carregarScript(SKUTIL); } catch (e) { manifesto = {}; } }
      return manifesto;
    });
    return pedindo;
  }
  function modeloDe(T, id, s) {
    const cfg = manifesto && (manifesto[id] || manifesto[s.id]);
    if (!cfg || !T.GLTFLoader) return null;
    const arq = 'modelos/' + (cfg.arquivo || (s.id + '.glb'));
    const g = new T.Group(), alt = cfg.altura || (s.tipo === 'robo' ? 1.5 : s.tipo === 'filho' ? 2.6 : 1.72);
    let mixer = null, idle = null, walk = null, atual = null;
    const usar = gltf => {
      const cena = (T.SkeletonUtils && T.SkeletonUtils.clone) ? T.SkeletonUtils.clone(gltf.scene) : gltf.scene.clone(true);
      const caixa = new T.Box3().setFromObject(cena), tam = caixa.getSize(new T.Vector3());
      const k = alt / (tam.y || 1); cena.scale.setScalar(k);
      cena.position.y = -caixa.min.y * k; cena.rotation.y = (cfg.rot || 0) * Math.PI / 180;
      cena.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      g.add(cena);
      if (gltf.animations && gltf.animations.length) {
        mixer = new T.AnimationMixer(cena);
        const acha = re => gltf.animations.find(a => re.test(a.name));
        const ci = acha(/idle|parado|stand/i) || gltf.animations[0], cw = acha(/walk|andar|run|correr/i);
        idle = ci && mixer.clipAction(ci); walk = cw && mixer.clipAction(cw);
        if (idle) { idle.play(); atual = idle; }
      }
    };
    if (gltfCache.has(arq)) gltfCache.get(arq).then(usar).catch(() => {});
    else { const p = new Promise((ok, falha) => new T.GLTFLoader().load(arq, ok, undefined, falha)); gltfCache.set(arq, p); p.then(usar).catch(e => console.warn('modelo 3D:', arq, e)); }
    const anim = (dt, t, andando) => {
      if (!mixer) return; mixer.update(dt);
      const quer = andando && walk ? walk : idle;
      if (quer && quer !== atual) { quer.reset().fadeIn(.2).play(); if (atual) atual.fadeOut(.2); atual = quer; }
    };
    return { g, alt, anim };
  }

  /* ---------- fábrica principal ---------- */
  // s = ser (SER[tk.s]); forma = forma do Filho (mapa/formas); F = criarFabrica(...) do mundo
  function criarToken(F, id, s, forma) {
    const T = F.T;
    let t = modeloDe(T, id, s);
    if (!t) {
      if (s.tipo === 'cobaia' && COBAIAS[s.id]) t = COBAIAS[s.id](F);
      else if (s.tipo === 'robo') t = robo(F, s.id, s);
      else if (s.tipo === 'filho') t = criatura(F, s, FORMAS.includes(forma) ? forma : 'esguio');
      else t = npc(F, s);
    }
    // base redonda na cor do token (como a base de uma miniatura)
    const base = new T.Group();
    const R = t.raioBase || (s.tipo === 'filho' ? .55 : .32);
    const disco = new T.Mesh(F.guardar(new T.CylinderGeometry(R, R + .02, .035, 32)), F.m('#141218', { r: .4, me: .3 }));
    disco.position.y = .0175; base.add(disco);
    const aro = new T.Mesh(F.guardar(new T.TorusGeometry(R + .005, .018, 8, 40)), F.m('#ffffff', { unico: true, e: s.contorno || s.cor || '#888', ei: .9 }));
    aro.rotation.x = Math.PI / 2; aro.position.y = .035; base.add(aro);
    t.g.add(base);
    t.aro = aro; t.base = base;
    t.g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    return t;
  }

  Object.assign(NS, { criarToken, carregarModelos, FORMAS, NOMES_FORMA });
  NS.preparoTokens = F => { F.T = F.T || window.THREE; };
})();
