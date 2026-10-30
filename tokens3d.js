/* tokens3d.js · os TOKENS em 3D (miniaturas) da Planta
   Token = a imagem/figura do personagem no mapa (2.5D e 3D). Ficha = as informações de jogo
   (vida, sanidade, rituais). Aqui só existem tokens: nada de ficha aparece no 3D.

   - Cobaias e robôs S.T.A.F.F.: miniaturas montadas a partir da aparência de cada um.
   - NPCs: figura genérica de macacão, com a cor do token.
   - Filhos da O.R.F.E.U.: criaturas grandes. A FORMA de cada Filho é escolhida pelo Mestre
     (mapa/formas/<id>); o código só tem formas genéricas, sem nomes.
   - Modelo próprio (.glb): se existir modelos/modelos.json listando o token, o arquivo .glb
     substitui a miniatura (gerado, por exemplo, numa IA de imagem para 3D).

   Convenções das miniaturas: o grupo g tem os pés em y = 0 e olha para +Z; alt é a altura do
   topo da cabeça (usada no nome e no balão de fala). Toda geometria e textura passa por
   F.guardar (descarte) e todo material por F.m. */
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  const LOADER = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
  const SKUTIL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js';

  /* ================= utilidades ================= */
  // cores escritas como aparecem na tela: a tela sai em sRGB, então a cor do material vai para o espaço linear
  // (sem isso, todo tom escuro sai lavado e acinzentado)
  const LIN = new Map();
  function lin(T, cor) { if (typeof cor !== 'string' || cor[0] !== '#') return cor; let v = LIN.get(cor); if (!v) { v = '#' + new T.Color(cor).convertSRGBToLinear().getHexString(); LIN.set(cor, v); } return v; }
  const M = (F, cor, o = {}) => F.m(lin(F.T, cor), o.e ? { ...o, e: lin(F.T, o.e) } : o);
  // cache de texturas e materiais por fábrica (vários tokens iguais dividem a mesma textura)
  const CACHE = new WeakMap();
  const cacheDe = F => { let c = CACHE.get(F); if (!c) { c = new Map(); CACHE.set(F, c); } return c; };
  function texDe(F, chave, fazer) { const c = cacheDe(F), k = 't:' + chave; if (!c.has(k)) c.set(k, fazer()); return c.get(k); }
  function matTex(F, tex, o = {}) {
    const c = cacheDe(F), k = 'm:' + tex.uuid + JSON.stringify(o);
    if (!c.has(k)) { const mat = M(F, '#ffffff', { ...o, unico: true, mapa: tex }); if (o.emiMapa) { mat.emissiveMap = tex; } c.set(k, mat); }
    return c.get(k);
  }
  function fazTex(F, c, rep) { const t = new F.T.CanvasTexture(c); t.encoding = F.T.sRGBEncoding; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = F.T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } F.guardar(t); return t; }
  const malha = (F, pai, geo, mat) => { const me = new F.T.Mesh(F.guardar(geo), mat); pai.add(me); return me; };
  const elipse = (x, cx, cy, rx, ry, a = 0) => { x.beginPath(); x.ellipse(cx, cy, Math.max(.1, rx), Math.max(.1, ry), a, 0, Math.PI * 2); };
  const hash = (i, s) => { const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };

  /* casca: superfície de revolução de seção elíptica, anel por anel (de baixo para cima).
     perfil: [[y, largura, profundidade, deslocZ], ...]. A frente (+Z) fica no meio da textura (u = 0,5).
     o: { seg, abertura (frente aberta, em rad), arco: [início, comprimento], arcoY(y) → [início, comp],
          quadrado (expoente < 1 deixa a seção mais quadrada), deform(x, y, z, j, u, ang) → [x, y, z] } */
  function casca(F, pai, perfil, mat, o = {}) {
    const T = F.T, seg = o.seg || 16, n = perfil.length;
    const ab = o.abertura || 0, fechada = !ab && !o.arco && !o.arcoY;
    const ps0 = o.arco ? o.arco[0] : ab ? ab / 2 : Math.PI, pl0 = o.arco ? o.arco[1] : ab ? Math.PI * 2 - ab : Math.PI * 2;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      for (let j = 0; j < n; j++) {
        const p = perfil[j];
        const [ps, pl] = o.arcoY ? o.arcoY(p[0], j) : [ps0, pl0];
        const ph = ps + u * pl;
        let sx = Math.sin(ph), sz = Math.cos(ph);
        if (o.quadrado) { sx = Math.sign(sx) * Math.pow(Math.abs(sx), o.quadrado); sz = Math.sign(sz) * Math.pow(Math.abs(sz), o.quadrado); }
        let x = sx * p[1], y = p[0], z = sz * p[2] + (p[3] || 0);
        if (o.deform) { const r = o.deform(x, y, z, j, u, Math.atan2(Math.sin(ph), Math.cos(ph)), i); if (r) [x, y, z] = r; }
        pos.push(x, y, z); uv.push(u, j / (n - 1));
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < n - 1; j++) {
      const a = i * n + j, b = (i + 1) * n + j, c = (i + 1) * n + j + 1, d = i * n + j + 1;
      idx.push(a, b, d, b, c, d);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    if (fechada) {   // costura nas costas: a normal do primeiro e do último gomo vira uma só
      const nr = geo.attributes.normal;
      for (let j = 0; j < n; j++) { const a = j, b = seg * n + j; const x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b), l = Math.hypot(x, y, z) || 1; nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l); }
    }
    return malha(F, pai, geo, mat);
  }
  // cápsula pendurada: começa no pivô (y = 0) e desce até -L; pontas arredondadas (juntas sem fresta)
  function capsula(F, pai, r1, r2, L, mat, seg = 10, anel = 4) {
    const pf = [];
    for (let a = 0; a <= anel; a++) { const t = a / anel * Math.PI / 2; pf.push([-L - r2 * Math.cos(t), Math.max(1e-4, r2 * Math.sin(t))]); }
    for (let a = 1; a <= anel; a++) { const t = Math.PI / 2 + a / anel * Math.PI / 2; pf.push([-r1 * Math.cos(t), Math.max(1e-4, r1 * Math.sin(t))]); }
    return casca(F, pai, pf.map(([y, r]) => [y, r, r]), mat, { seg });
  }
  // tubo que afina (patas, tranças, cauda): raio(t) com t de 0 a 1 ao longo da curva
  function tuboAfilado(F, pai, pts, raio, mat, o = {}) {
    const T = F.T, curva = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], p[1], p[2])), false, 'catmullrom', o.tensao ?? .5);
    const nS = o.seg || 20, nR = o.rad || 7;
    const geo = new T.TubeGeometry(curva, nS, 1, nR, false);
    const pos = geo.attributes.position, P = new T.Vector3();
    for (let i = 0; i <= nS; i++) {
      curva.getPointAt(i / nS, P); const rr = raio(i / nS, i);
      for (let j = 0; j <= nR; j++) { const k = i * (nR + 1) + j; pos.setXYZ(k, P.x + (pos.getX(k) - P.x) * rr, P.y + (pos.getY(k) - P.y) * rr, P.z + (pos.getZ(k) - P.z) * rr); }
    }
    geo.computeVertexNormals();
    return malha(F, pai, geo, mat);
  }
  // calota de esfera (cabelo, capacete): theta de 0 até tl; phi aberto na frente se abertura > 0
  function calota(F, pai, r, mat, tl, o = {}) {
    const T = F.T, ab = o.abertura || 0;
    const geo = new T.SphereGeometry(r, o.seg || 18, o.segV || 10, ab ? Math.PI / 2 + ab / 2 : 0, Math.PI * 2 - ab, o.t0 || 0, tl);
    return malha(F, pai, geo, mat);
  }
  // braço em pose fixa (IK de dois ossos): alvo da mão e polo (para onde o cotovelo aponta), no espaço do corpo
  function posar(F, br, alvo, polo) {
    const T = F.T, P = br.ombro.position.clone(), Tg = new T.Vector3(alvo[0], alvo[1], alvo[2]);
    const u = Tg.clone().sub(P); let d = u.length(); u.normalize();
    const L1 = br.Lb, L2 = br.La;
    d = Math.max(Math.abs(L1 - L2) + 1e-3, Math.min(d, (L1 + L2) * .999));
    const ang = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
    const pv = new T.Vector3(polo[0], polo[1], polo[2]); pv.sub(u.clone().multiplyScalar(pv.dot(u))).normalize();
    const d1 = u.clone().multiplyScalar(Math.cos(ang)).add(pv.multiplyScalar(Math.sin(ang))).normalize();
    const cot = P.clone().add(d1.clone().multiplyScalar(L1));
    const d2 = Tg.clone().sub(cot).normalize();
    const BX = new T.Vector3(0, -1, 0);
    br.ombro.rotation.set(0, 0, 0);
    br.braco.quaternion.setFromUnitVectors(BX, d1);
    br.cot.quaternion.setFromUnitVectors(BX, d2.applyQuaternion(br.braco.quaternion.clone().invert()));
    br.fixo = true;
  }

  // gira um objeto para ficar com esta orientação no espaço do token (o token ainda está parado na origem)
  function alinhar(F, obj, rx, ry, rz) {
    const T = F.T; obj.parent.updateWorldMatrix(true, false);
    const qp = obj.parent.getWorldQuaternion(new T.Quaternion()).invert();
    obj.quaternion.copy(qp.multiply(new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz))));
  }

  /* ================= texturas pintadas na hora ================= */
  // rosto pintado numa esfera (a frente da esfera fica em u = 0,25; tela 512 x 256)
  function rostoTex(F, o) {
    const [c, x] = NS.tela(512, 256), r = NS.rng(o.sem || 5);
    const pele = o.pele || '#d9b49a', cx = 128;
    x.fillStyle = pele; x.fillRect(0, 0, 512, 256);
    // volume: luz no meio do rosto, sombra nas laterais, embaixo do queixo e na nuca
    const gr = x.createRadialGradient(cx, 128, 8, cx, 138, 130);
    gr.addColorStop(0, 'rgba(255,240,225,.12)'); gr.addColorStop(.55, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(30,15,8,.24)');
    x.fillStyle = gr; x.fillRect(0, 0, 512, 256);
    const gq = x.createLinearGradient(0, 196, 0, 256); gq.addColorStop(0, 'rgba(0,0,0,0)'); gq.addColorStop(1, 'rgba(20,10,5,.35)'); x.fillStyle = gq; x.fillRect(0, 196, 512, 60);
    if (o.bandagem) {
      // faixas cruzadas em volta da cabeça inteira
      x.fillStyle = o.bandagem; x.fillRect(0, 0, 512, 256);
      for (let i = -6; i < 22; i++) {
        const y0 = i * 16 + r() * 6, inc = (r() - .5) * 40 + (i % 2 ? 26 : -18), tom = (r() - .5) * 30;
        x.fillStyle = `rgba(${tom > 0 ? '255,250,235' : '40,30,20'},${Math.abs(tom) / 120})`;
        x.beginPath(); x.moveTo(0, y0); x.lineTo(512, y0 + inc); x.lineTo(512, y0 + inc + 15); x.lineTo(0, y0 + 15); x.fill();
        x.strokeStyle = 'rgba(40,30,18,.55)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(0, y0); x.lineTo(512, y0 + inc); x.stroke();
      }
      for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(${o.sujaSangue ? '110,20,10' : '70,55,35'},${.08 + r() * .15})`; elipse(x, r() * 512, r() * 256, 4 + r() * 16, 3 + r() * 10, r() * 3); x.fill(); }
      // fresta dos olhos
      const fg = x.createLinearGradient(0, 118, 0, 150); fg.addColorStop(0, 'rgba(10,6,4,0)'); fg.addColorStop(.3, 'rgba(10,6,4,.92)'); fg.addColorStop(.7, 'rgba(10,6,4,.92)'); fg.addColorStop(1, 'rgba(10,6,4,0)');
      x.fillStyle = fg; x.beginPath(); x.ellipse(cx, 134, 46, 14, 0, 0, 7); x.fill();
    }
    const oy = 133, dx = o.olhosLonge ? 24 : 21, ew = o.olhosGrandes ? 14 : 10, eh = o.olhosGrandes ? 12.5 : 6.2;
    if (!o.bandagem && o.olheiras) [-1, 1].forEach(s => { x.fillStyle = 'rgba(80,50,80,.28)'; elipse(x, cx + s * dx, oy + eh + 3, ew * 1.05, 5); x.fill(); });
    if (!o.bandagem && o.blush) [-1, 1].forEach(s => { x.fillStyle = o.blush; elipse(x, cx + s * (dx + 9), oy + 26, 12, 7); x.fill(); });
    // olhos
    [-1, 1].forEach(s => {
      const ex = cx + s * dx;
      if (o.olhoBrilho) { x.fillStyle = o.olhoBrilho; x.shadowColor = o.olhoBrilho; x.shadowBlur = 10; elipse(x, ex, oy, ew * .8, eh * .7); x.fill(); x.shadowBlur = 0; return; }
      if (o.semOlhos) return;
      const ehh = o.bandagem ? eh * .75 : eh;
      x.fillStyle = o.esclera || '#f2ece2'; elipse(x, ex, oy, ew, ehh); x.fill();
      x.save(); elipse(x, ex, oy, ew, ehh); x.clip();
      const ir = o.olhosGrandes ? 7.5 : ehh * 1.05;
      x.fillStyle = o.iris || '#3a2414'; x.beginPath(); x.arc(ex + (o.olharLado || 0), oy + .5, ir, 0, 7); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 1.5; x.stroke();
      x.fillStyle = '#060404'; x.beginPath(); x.arc(ex + (o.olharLado || 0), oy + .5, ir * (o.pupilaPequena ? .3 : .48), 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.arc(ex - 2.5, oy - 2.5, o.olhosGrandes ? 2.4 : 1.6, 0, 7); x.fill();
      x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(ex - ew, oy - ehh, ew * 2, ehh * .5);
      x.restore();
      // pálpebra e cílios
      x.strokeStyle = o.bandagem ? 'rgba(10,6,4,.8)' : '#1c120c'; x.lineWidth = o.fem ? 2.8 : 2.2;
      x.beginPath(); x.ellipse(ex, oy, ew, ehh, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
      if (o.fem) { x.beginPath(); x.moveTo(ex + s * ew * .95, oy - ehh * .3); x.lineTo(ex + s * (ew + 4), oy - ehh - 1); x.stroke(); }
      if (o.olhosGrandes) { x.strokeStyle = 'rgba(60,30,20,.4)'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(ex, oy + 1, ew + 1, ehh + 2, 0, .2, Math.PI - .2); x.stroke(); }
      // sobrancelha
      if (!o.bandagem && !o.semSobrancelha) {
        const by = oy - (o.olhosGrandes ? 21 : 14), inc = o.bravo ? 4 : o.triste ? -3 : 0;
        x.strokeStyle = o.sobrancelha || '#2b1d14'; x.lineWidth = o.fem ? 3 : 4; x.lineCap = 'round';
        x.beginPath(); x.moveTo(ex - s * 9, by + inc); x.quadraticCurveTo(ex + s * 1, by - 3, ex + s * 11, by + 1); x.stroke();
      }
    });
    if (!o.bandagem) {
      // nariz: sombra lateral e narinas
      x.fillStyle = 'rgba(60,30,15,.16)'; elipse(x, cx + 5, oy + 12, 3, 12); x.fill();
      x.fillStyle = 'rgba(40,18,10,.4)'; [-1, 1].forEach(s => { elipse(x, cx + s * 4.5, oy + 24, 2.4, 1.6); x.fill(); });
      const my = 170, b = o.boca || 'normal';
      if (b === 'sorriso_largo') {
        // sorriso largo demais, de canto a canto, lábios fechados
        x.fillStyle = 'rgba(200,90,80,.22)'; [-1, 1].forEach(s => { elipse(x, cx + s * 30, my - 12, 12, 8); x.fill(); });
        x.fillStyle = '#3a0d0b'; x.beginPath(); x.moveTo(cx - 44, my - 10); x.quadraticCurveTo(cx, my + 26, cx + 44, my - 10); x.quadraticCurveTo(cx, my + 12, cx - 44, my - 10); x.fill();
        x.strokeStyle = '#2a0806'; x.lineWidth = 2.5; x.lineCap = 'round'; [-1, 1].forEach(s => { x.beginPath(); x.moveTo(cx + s * 44, my - 10); x.quadraticCurveTo(cx + s * 49, my - 15, cx + s * 47, my - 19); x.stroke(); });
        x.strokeStyle = 'rgba(120,40,35,.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 30, my + 9); x.quadraticCurveTo(cx, my + 24, cx + 30, my + 9); x.stroke();
      } else if (b === 'dentes') {
        // careta aberta com dentes amarelados
        x.fillStyle = '#2a0a08'; x.beginPath(); x.moveTo(cx - 22, my - 4); x.quadraticCurveTo(cx, my - 9, cx + 22, my - 4); x.quadraticCurveTo(cx, my + 16, cx - 22, my - 4); x.fill();
        x.save(); x.clip();
        for (let i = 0; i < 8; i++) { x.fillStyle = i === 2 || i === 6 ? '#8a7a40' : '#d9c477'; x.fillRect(cx - 19 + i * 4.9, my - 8, 4, 8 + (i % 3 === 1 ? 1 : 0)); }
        for (let i = 0; i < 6; i++) { x.fillStyle = '#c4ad62'; x.fillRect(cx - 13 + i * 4.6, my + 5, 3.8, 6); }
        x.restore();
        x.strokeStyle = 'rgba(110,50,40,.8)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 23, my - 4); x.quadraticCurveTo(cx, my - 10, cx + 23, my - 4); x.stroke();
      } else if (b === 'seria') {
        x.fillStyle = o.labio || '#4a2a20'; x.beginPath(); x.moveTo(cx - 12, my); x.quadraticCurveTo(cx - 5, my - 6, cx, my - 3); x.quadraticCurveTo(cx + 5, my - 6, cx + 12, my); x.quadraticCurveTo(cx, my + 1, cx - 12, my); x.fill();
        x.fillStyle = o.labioInf || '#5a3226'; x.beginPath(); x.moveTo(cx - 11, my + 1); x.quadraticCurveTo(cx, my + 10, cx + 11, my + 1); x.fill();
        x.strokeStyle = 'rgba(20,8,5,.8)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(cx - 12, my); x.lineTo(cx + 12, my); x.stroke();
      } else if (b !== 'nenhuma') {
        x.strokeStyle = 'rgba(100,40,32,.85)'; x.lineWidth = 2.6; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx - 12, my); x.quadraticCurveTo(cx, my + 3, cx + 12, my); x.stroke();
        x.fillStyle = 'rgba(170,70,60,.25)'; elipse(x, cx, my + 4, 9, 3); x.fill();
      }
      if (o.sardas) { x.fillStyle = 'rgba(130,70,40,.55)'; for (let i = 0; i < 26; i++) { const sx = (r() - .5) * 2; x.beginPath(); x.arc(cx + sx * 30, oy + 14 + r() * 14 - Math.abs(sx) * 4, .9 + r() * .9, 0, 7); x.fill(); } }
      if (o.barba) { for (let i = 0; i < 2600; i++) { const ax = (r() - .5) * 2, ay = r(); const px = cx + ax * 46, py = 150 + ay * 66; if (Math.abs(ax) < .32 && py < my + 6 && py > my - 6) continue; if (py < 160 && Math.abs(ax) < .55) continue; x.fillStyle = `rgba(40,24,12,${.25 + r() * .3})`; x.fillRect(px, py, 1.4, 1.4); } for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(40,24,12,.35)'; x.fillRect(cx - 14 + r() * 28, my - 9 + r() * 4, 1.3, 1.3); } }
      if (o.hematoma) {
        const hx = cx + dx;
        const hg = x.createRadialGradient(hx, oy + 2, 4, hx, oy + 2, 22); hg.addColorStop(0, 'rgba(70,20,70,.65)'); hg.addColorStop(.6, 'rgba(110,40,80,.35)'); hg.addColorStop(1, 'rgba(110,60,40,0)');
        x.fillStyle = hg; elipse(x, hx, oy + 2, 22, 18); x.fill();
        x.strokeStyle = 'rgba(150,10,10,.9)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(cx - 16, oy - 40); x.lineTo(cx - 6, oy - 22); x.stroke();
        x.strokeStyle = 'rgba(130,10,10,.6)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx - 7, oy - 22); x.lineTo(cx - 9, oy - 6); x.stroke();
        x.strokeStyle = 'rgba(150,10,10,.8)'; x.beginPath(); x.moveTo(cx + 36, oy + 10); x.lineTo(cx + 30, oy + 30); x.stroke();
      }
    }
    return fazTex(F, c);
  }

  /* rosto pintado com mais detalhe (pele sombreada, olhos com íris, brilho e cílios, nariz, lábios, sobrancelhas
     fio a fio). Mesma convenção: tela 512 x 256, frente em x = 128.
     o: pele, iris, sobrancelha, fem, boca ('normal' | 'seria' | 'sorriso' | 'dentes' | 'nenhuma'), labio, labioInf,
        sardas, barba, hematoma, sangue, sujeira, blush, palhaco, cadaver, bandagem{…}, olhoFresta, semOlhos */
  function rostoTex2(F, o) {
    const [c, x] = NS.tela(512, 256), r = NS.rng(o.sem || 5), T = F.T;
    const pele = o.pele || '#d9b49a', cx = 128, oy = 134;
    const P = new T.Color(pele), q = v => Math.max(0, Math.min(255, v * 255 | 0));
    const sombra = a => `rgba(${q(P.r * .42)},${q(P.g * .28)},${q(P.b * .26)},${a})`;
    const luz = a => `rgba(255,246,236,${a})`;
    const mist = (k, cor) => { const C = new T.Color(cor); return `rgb(${q(P.r * (1 - k) + C.r * k)},${q(P.g * (1 - k) + C.g * k)},${q(P.b * (1 - k) + C.b * k)})`; };
    x.fillStyle = pele; x.fillRect(0, 0, 512, 256);
    // poros e manchinhas da pele
    for (let i = 0; i < 3500; i++) { x.fillStyle = r() < .5 ? `rgba(0,0,0,${.035 * r()})` : `rgba(255,255,255,${.03 * r()})`; x.fillRect(r() * 512, r() * 256, 1.5, 1.5); }
    // volume: luz no meio do rosto, sombra nas laterais, no queixo e na nuca
    let gr = x.createRadialGradient(cx, 126, 6, cx, 140, 128);
    gr.addColorStop(0, luz(.1)); gr.addColorStop(.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, sombra(.32));
    x.fillStyle = gr; x.fillRect(0, 0, 512, 256);
    gr = x.createLinearGradient(0, 196, 0, 256); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, sombra(.45)); x.fillStyle = gr; x.fillRect(0, 196, 512, 60);
    if (o.bandagem) return bandagemRosto(F, x, c, o, r);
    if (o.palhaco) {   // base branca de palhaço
      gr = x.createRadialGradient(cx, 146, 30, cx, 146, 66); gr.addColorStop(0, 'rgba(244,240,234,.96)'); gr.addColorStop(.8, 'rgba(240,236,230,.9)'); gr.addColorStop(1, 'rgba(240,236,230,0)');
      x.fillStyle = gr; elipse(x, cx, 146, 66, 80); x.fill();
    }
    const cad = !!o.cadaver;
    // órbitas (sombra em volta dos olhos) e olheiras
    [-1, 1].forEach(s => {
      const ex = cx + s * 21;
      gr = x.createRadialGradient(ex, oy - 2, 2, ex, oy - 1, cad ? 26 : 19);
      gr.addColorStop(0, cad ? 'rgba(25,14,22,.85)' : sombra(.32)); gr.addColorStop(.6, cad ? 'rgba(40,24,34,.45)' : sombra(.14)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr; elipse(x, ex, oy - 1, cad ? 26 : 20, cad ? 21 : 15); x.fill();
      // maçã do rosto: luz em cima, cavidade embaixo
      x.fillStyle = luz(cad ? .05 : .09); elipse(x, ex + s * 8, oy + 17, 13, 7, s * .3); x.fill();
      gr = x.createRadialGradient(cx + s * 33, oy + 36, 2, cx + s * 33, oy + 36, cad ? 20 : 14); gr.addColorStop(0, cad ? 'rgba(30,20,25,.5)' : sombra(.12)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr; elipse(x, cx + s * 33, oy + 36, cad ? 20 : 14, cad ? 22 : 14); x.fill();
      if (o.blush) { x.fillStyle = o.blush; elipse(x, cx + s * 30, oy + 24, 13, 8); x.fill(); }
    });
    // testa: brilho
    x.fillStyle = luz(.07); elipse(x, cx, oy - 34, 32, 12); x.fill();
    // nariz: ponte iluminada, lateral sombreada, narinas e ponta
    x.strokeStyle = luz(.18); x.lineWidth = 4; x.beginPath(); x.moveTo(cx - 1, oy - 6); x.lineTo(cx - 1, oy + 18); x.stroke();
    gr = x.createLinearGradient(cx + 2, 0, cx + 11, 0); gr.addColorStop(0, sombra(.22)); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(cx + 2, oy, 9, 22);
    x.fillStyle = sombra(.28); elipse(x, cx, oy + 27, 9, 3); x.fill();
    x.fillStyle = 'rgba(30,12,8,.55)'; [-1, 1].forEach(s => { elipse(x, cx + s * 4.5, oy + 25, 2.6, 1.6, s * .4); x.fill(); });
    x.fillStyle = luz(.22); elipse(x, cx - 1, oy + 20, 3, 2.4); x.fill();
    if (o.narizVermelho) { x.fillStyle = '#c4141c'; elipse(x, cx, oy + 21, 8, 7); x.fill(); }
    // sulco do lábio e queixo
    x.fillStyle = sombra(.14); x.fillRect(cx - 2.5, oy + 29, 5, 6);
    x.fillStyle = luz(.08); elipse(x, cx, oy + 64, 12, 7); x.fill();
    // boca
    const my = oy + 38, b = o.boca || 'normal';
    const lab = o.labio || mist(.42, '#8a2a24'), labI = o.labioInf || mist(.32, '#a4403a');
    if (b === 'normal' || b === 'seria') {
      const w = b === 'seria' ? 13 : 12;
      x.fillStyle = lab; x.beginPath(); x.moveTo(cx - w, my); x.quadraticCurveTo(cx - 6, my - 5.5, cx - 1.5, my - 4); x.lineTo(cx, my - 3); x.lineTo(cx + 1.5, my - 4); x.quadraticCurveTo(cx + 6, my - 5.5, cx + w, my); x.quadraticCurveTo(cx, my + 1.5, cx - w, my); x.fill();
      x.fillStyle = labI; x.beginPath(); x.moveTo(cx - w + 1, my + .5); x.quadraticCurveTo(cx, my + (b === 'seria' ? 11 : 9), cx + w - 1, my + .5); x.quadraticCurveTo(cx, my + 2, cx - w + 1, my + .5); x.fill();
      x.fillStyle = luz(.3); elipse(x, cx, my + 4.5, 5, 1.4); x.fill();
      x.strokeStyle = 'rgba(25,8,6,.75)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(cx - w, my); x.quadraticCurveTo(cx, my + 1.8, cx + w, my); x.stroke();
      if (cad) { x.strokeStyle = 'rgba(60,40,45,.6)'; x.lineWidth = .8; for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(cx + i * 3.5, my - 3); x.lineTo(cx + i * 3.5, my + 4); x.stroke(); } }
    } else if (b === 'sorriso') {
      // sorriso fechado de batom vermelho, cantos para cima
      x.fillStyle = o.labio || '#b3121e'; x.beginPath(); x.moveTo(cx - 17, my - 5); x.quadraticCurveTo(cx - 7, my - 4, cx - 1.5, my - 3); x.lineTo(cx, my - 2); x.lineTo(cx + 1.5, my - 3); x.quadraticCurveTo(cx + 7, my - 4, cx + 17, my - 5); x.quadraticCurveTo(cx, my + 4, cx - 17, my - 5); x.fill();
      x.fillStyle = o.labioInf || '#c41a26'; x.beginPath(); x.moveTo(cx - 15, my - 3); x.quadraticCurveTo(cx, my + 12, cx + 15, my - 3); x.quadraticCurveTo(cx, my + 3, cx - 15, my - 3); x.fill();
      x.fillStyle = 'rgba(255,255,255,.4)'; elipse(x, cx + 2, my + 5, 5, 1.5); x.fill();
      x.strokeStyle = 'rgba(40,0,4,.9)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx - 17, my - 5); x.quadraticCurveTo(cx, my + 4, cx + 17, my - 5); x.stroke();
    } else if (b === 'dentes') {
      x.fillStyle = '#2a0a08'; x.beginPath(); x.moveTo(cx - 22, my - 4); x.quadraticCurveTo(cx, my - 9, cx + 22, my - 4); x.quadraticCurveTo(cx, my + 16, cx - 22, my - 4); x.fill();
      x.save(); x.clip();
      for (let i = 0; i < 8; i++) { gr = x.createLinearGradient(0, my - 8, 0, my + 1); gr.addColorStop(0, i === 2 || i === 6 ? '#8a7a40' : '#e2cf86'); gr.addColorStop(1, '#a8904a'); x.fillStyle = gr; x.fillRect(cx - 19 + i * 4.9, my - 8, 4.2, 8.5 + (i % 3 === 1 ? 1 : 0)); }
      for (let i = 0; i < 6; i++) { x.fillStyle = '#c4ad62'; x.fillRect(cx - 13 + i * 4.6, my + 5, 3.8, 6); }
      x.restore();
      x.strokeStyle = mist(.45, '#6a2018'); x.lineWidth = 2.6; x.beginPath(); x.moveTo(cx - 23, my - 4); x.quadraticCurveTo(cx, my - 10, cx + 23, my - 4); x.stroke();
      x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 21, my - 2); x.quadraticCurveTo(cx, my + 17, cx + 21, my - 2); x.stroke();
    }
    // olhos
    const ew = o.ew || 11.5, eh = o.eh || 7;
    if (!o.semOlhos) [-1, 1].forEach(s => olhoDet(x, cx + s * 21, oy, ew, eh, s, o, r, sombra));
    // sobrancelhas fio a fio
    if (!o.semSobrancelha) [-1, 1].forEach(s => {
      const ex = cx + s * 21, by = oy - 15 + (o.bravo ? 0 : 0);
      x.strokeStyle = o.sobrancelha || '#2b1d14'; x.lineCap = 'round';
      for (let i = 0; i < 34; i++) {
        const t = i / 33, px = ex - s * 10 + s * 23 * t, py = by + (o.bravo ? (1 - t) * 4 : 0) - Math.sin(t * Math.PI) * 3.5 + (r() - .5) * 2;
        x.globalAlpha = .55 + r() * .4; x.lineWidth = (1 - t) * 1.8 + .7;
        x.beginPath(); x.moveTo(px, py + 2); x.lineTo(px + s * (2 + t * 3), py - 2 + t * 2); x.stroke();
      }
      x.globalAlpha = 1;
    });
    if (o.palhaco) {   // riscos escuros de lágrima e contorno pesado
      x.strokeStyle = 'rgba(20,18,34,.9)'; x.lineWidth = 2.4; x.lineCap = 'round';
      [-1, 1].forEach(s => { const ex = cx + s * 21; x.beginPath(); x.moveTo(ex, oy + 9); x.quadraticCurveTo(ex + s * 2, oy + 24, ex + s * 1, oy + 40); x.stroke(); x.beginPath(); x.moveTo(ex + s * 5, oy + 8); x.lineTo(ex + s * 6, oy + 22); x.stroke(); x.fillStyle = 'rgba(20,18,34,.9)'; elipse(x, ex + s * 1, oy + 42, 2, 3); x.fill(); });
    }
    if (o.sardas) { x.fillStyle = 'rgba(130,70,40,.55)'; for (let i = 0; i < 34; i++) { const sx = (r() - .5) * 2; x.beginPath(); x.arc(cx + sx * 32, oy + 12 + r() * 14 - Math.abs(sx) * 4, .8 + r() * 1, 0, 7); x.fill(); } }
    if (o.barba) { for (let i = 0; i < 4200; i++) { const ax = (r() - .5) * 2, ay = r(); const px = cx + ax * 50, py = oy + 18 + ay * 70; if (Math.abs(ax) < .3 && Math.abs(py - my) < 6) continue; if (py < oy + 30 && Math.abs(ax) < .6) continue; x.fillStyle = `rgba(35,22,12,${.22 + r() * .35})`; x.fillRect(px, py, 1.3, 1.3); } for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(35,22,12,.38)'; x.fillRect(cx - 15 + r() * 30, my - 10 + r() * 5, 1.2, 1.2); } }
    if (o.hematoma) {
      const hx = cx + 21;
      gr = x.createRadialGradient(hx, oy + 2, 4, hx, oy + 2, 24); gr.addColorStop(0, 'rgba(70,20,70,.7)'); gr.addColorStop(.6, 'rgba(110,40,80,.38)'); gr.addColorStop(1, 'rgba(110,60,40,0)');
      x.fillStyle = gr; elipse(x, hx, oy + 2, 24, 19); x.fill();
      x.strokeStyle = 'rgba(150,10,10,.9)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(cx - 16, oy - 42); x.lineTo(cx - 6, oy - 22); x.stroke();
      x.strokeStyle = 'rgba(130,10,10,.6)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx - 7, oy - 22); x.lineTo(cx - 9, oy - 6); x.stroke();
      x.strokeStyle = 'rgba(150,10,10,.8)'; x.beginPath(); x.moveTo(cx + 38, oy + 10); x.lineTo(cx + 32, oy + 30); x.stroke();
    }
    if (o.sangue) for (let i = 0; i < o.sangue; i++) { x.fillStyle = `rgba(${110 + r() * 40},8,6,${.4 + r() * .4})`; const px = cx + (r() - .5) * 110, py = 60 + r() * 170; elipse(x, px, py, 1.5 + r() * 4, 1.5 + r() * 5, r() * 3); x.fill(); if (r() < .3) x.fillRect(px - .8, py, 1.6, 6 + r() * 14); }
    if (o.veias) { x.strokeStyle = 'rgba(80,90,130,.28)'; x.lineWidth = 1; for (let i = 0; i < 8; i++) { let px = cx + (r() < .5 ? -1 : 1) * (40 + r() * 20), py = 80 + r() * 90; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (r() - .5) * 12; py += (r() - .3) * 12; x.lineTo(px, py); } x.stroke(); } }
    if (o.sujeira) for (let i = 0; i < o.sujeira; i++) { x.fillStyle = `rgba(50,40,30,${.06 + r() * .12})`; elipse(x, r() * 512, r() * 256, 4 + r() * 18, 3 + r() * 12, r() * 3); x.fill(); }
    return fazTex(F, c);
  }
  // olho detalhado: pálpebra, esclera sombreada, íris em degradê com raios, pupila, dois brilhos e cílios
  function olhoDet(x, ex, oy, ew, eh, s, o, r, sombra) {
    const amend = () => { x.beginPath(); x.moveTo(ex - ew, oy + 1); x.bezierCurveTo(ex - ew * .5, oy - eh * 1.25, ex + ew * .55, oy - eh * 1.3, ex + ew, oy - (o.cadaver ? 0 : 1)); x.bezierCurveTo(ex + ew * .5, oy + eh * .95, ex - ew * .5, oy + eh, ex - ew, oy + 1); };
    // vinco da pálpebra
    x.strokeStyle = sombra(.4); x.lineWidth = 1.3; x.beginPath(); x.ellipse(ex, oy - 1, ew * 1.02, eh * 1.55, 0, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    // esclera
    let gr = x.createRadialGradient(ex, oy, 1, ex, oy, ew); gr.addColorStop(0, o.cadaver ? '#e2dcc4' : '#f6f2ea'); gr.addColorStop(1, o.cadaver ? '#b8a890' : '#cfc6bc');
    x.fillStyle = gr; amend(); x.fill();
    x.save(); amend(); x.clip();
    if (o.cadaver || o.olhoVermelho) { x.strokeStyle = 'rgba(170,30,30,.5)'; x.lineWidth = .7; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(ex + s * ew, oy + (r() - .5) * 4); x.lineTo(ex + s * ew * .4, oy + (r() - .5) * 6); x.stroke(); } }
    const ir = eh * (o.cadaver ? .8 : 1.02), ix = ex + (o.olharLado || 0), iy = oy - .5;
    const C = o.iris || '#4a3220';
    gr = x.createRadialGradient(ix, iy, ir * .15, ix, iy, ir); gr.addColorStop(0, o.irisClara || C); gr.addColorStop(.75, C); gr.addColorStop(1, 'rgba(10,6,4,1)');
    x.fillStyle = gr; x.beginPath(); x.arc(ix, iy, ir, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = .7; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; x.beginPath(); x.moveTo(ix + Math.cos(a) * ir * .4, iy + Math.sin(a) * ir * .4); x.lineTo(ix + Math.cos(a) * ir * .85, iy + Math.sin(a) * ir * .85); x.stroke(); }
    x.fillStyle = '#050304'; x.beginPath(); x.arc(ix, iy, ir * (o.cadaver ? .55 : .42), 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.arc(ix - ir * .38, iy - ir * .38, ir * .26, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(ix + ir * .35, iy + ir * .3, ir * .12, 0, 7); x.fill();
    gr = x.createLinearGradient(0, oy - eh, 0, oy - eh * .2); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(ex - ew, oy - eh * 1.3, ew * 2, eh * 1.2);
    x.restore();
    // linha da pálpebra superior e cílios
    x.strokeStyle = o.cadaver ? 'rgba(30,18,24,.9)' : '#160c08'; x.lineWidth = o.fem || o.palhaco ? 3 : 2.2; x.lineCap = 'round';
    x.beginPath(); x.moveTo(ex - ew, oy + 1); x.bezierCurveTo(ex - ew * .5, oy - eh * 1.25, ex + ew * .55, oy - eh * 1.3, ex + ew, oy - 1); x.stroke();
    if (o.fem || o.palhaco) { x.lineWidth = 1.3; for (let i = 0; i < 5; i++) { const t = .45 + i * .13, px = ex - ew + 2 * ew * t, py = oy - eh * 1.1 * Math.sin(t * Math.PI) - .5; x.beginPath(); x.moveTo(px, py); x.lineTo(px + s * (2 + t * 3), py - 3 - t * 2); x.stroke(); } }
    // pálpebra de baixo
    x.strokeStyle = sombra(.45); x.lineWidth = 1; x.beginPath(); x.moveTo(ex - ew * .9, oy + 2); x.bezierCurveTo(ex - ew * .4, oy + eh, ex + ew * .4, oy + eh, ex + ew * .95, oy); x.stroke();
  }
  // cabeça enfaixada: faixas sobrepostas com volume, fiapos, manchas e a fresta dos olhos
  function bandagemRosto(F, x, c, o, r) {
    const cx = 128, oy = 134, base = new F.T.Color(o.bandagem);
    const tom = k => `rgb(${base.r * 255 * k | 0},${base.g * 255 * k | 0},${base.b * 255 * k | 0})`;
    x.fillStyle = tom(.55); x.fillRect(0, 0, 512, 256);
    const faixas = [];
    for (let i = -4; i < 20; i++) faixas.push({ y0: i * 13 + r() * 5, inc: (r() - .5) * 46 + (i % 2 ? 28 : -22), h: 13 + r() * 5, k: .82 + r() * .3 });
    faixas.sort(() => r() - .5).forEach(f => {
      const g = x.createLinearGradient(0, f.y0, 0, f.y0 + f.h); g.addColorStop(0, tom(f.k * 1.08)); g.addColorStop(.6, tom(f.k)); g.addColorStop(1, tom(f.k * .74));
      x.fillStyle = g; x.beginPath(); x.moveTo(0, f.y0); x.lineTo(512, f.y0 + f.inc); x.lineTo(512, f.y0 + f.inc + f.h); x.lineTo(0, f.y0 + f.h); x.fill();
      x.strokeStyle = 'rgba(30,22,12,.6)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, f.y0 + f.h); x.lineTo(512, f.y0 + f.inc + f.h); x.stroke();
      x.strokeStyle = 'rgba(255,250,235,.25)'; x.lineWidth = .8; x.beginPath(); x.moveTo(0, f.y0 + .8); x.lineTo(512, f.y0 + f.inc + .8); x.stroke();
      x.strokeStyle = 'rgba(40,30,18,.12)'; for (let k = 0; k < 40; k++) { const t = r(); const px = t * 512, py = f.y0 + f.inc * t + r() * f.h; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 6, py + f.inc / 80); x.stroke(); }
      for (let k = 0; k < 4; k++) { const t = r(); const px = t * 512, py = f.y0 + f.inc * t + f.h; x.strokeStyle = 'rgba(200,190,170,.5)'; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 3, py + 4, px + (r() - .5) * 6, py + 7); x.stroke(); }
    });
    for (let i = 0; i < 14; i++) {
      const px = r() * 512, py = r() * 256, rr = 4 + r() * 16, sg = o.sujaSangue && r() < .6;
      const g = x.createRadialGradient(px, py, 1, px, py, rr); g.addColorStop(0, sg ? 'rgba(110,20,10,.55)' : 'rgba(80,62,38,.32)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; elipse(x, px, py, rr, rr * .7); x.fill();
    }
    // fresta dos olhos: sombra funda, com brilho se os olhos acendem
    const g = x.createLinearGradient(0, oy - 16, 0, oy + 14); g.addColorStop(0, 'rgba(8,5,3,0)'); g.addColorStop(.3, 'rgba(8,5,3,.94)'); g.addColorStop(.7, 'rgba(8,5,3,.94)'); g.addColorStop(1, 'rgba(8,5,3,0)');
    x.fillStyle = g; elipse(x, cx, oy, 48, 15); x.fill();
    if (o.olhoFresta) [-1, 1].forEach(s => { const gg = x.createRadialGradient(cx + s * 21, oy, 1, cx + s * 21, oy, 16); gg.addColorStop(0, o.olhoFresta); gg.addColorStop(.4, o.olhoFrestaMeio || 'rgba(255,170,30,.35)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gg; elipse(x, cx + s * 21, oy, 16, 9); x.fill(); });
    else if (!o.semOlhos) [-1, 1].forEach(s => olhoDet(x, cx + s * 21, oy, 9, 5, s, { ...o, olhoVermelho: true, iris: o.iris || '#2a2a2a' }, r, a => `rgba(20,12,6,${a})`));
    return fazTex(F, c);
  }
  // máscara de caveira dourada: ouro gasto com pátina, gravações, rachaduras, órbitas com brilho vermelho e dentes
  function caveiraTex(F) {
    return texDe(F, 'caveira2', () => {
      const [c, x] = NS.tela(512, 256), r = NS.rng(61), cx = 128, oy = 132;
      let gr = x.createRadialGradient(cx - 6, 110, 6, cx, 132, 150); gr.addColorStop(0, '#f2d27a'); gr.addColorStop(.35, '#c8982e'); gr.addColorStop(.75, '#7a5418'); gr.addColorStop(1, '#3a2408');
      x.fillStyle = gr; x.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 3000; i++) { x.fillStyle = r() < .5 ? `rgba(60,35,5,${.12 * r()})` : `rgba(255,235,170,${.1 * r()})`; x.fillRect(r() * 512, r() * 256, 2, 1); }
      for (let i = 0; i < 18; i++) { x.fillStyle = r() < .4 ? `rgba(70,90,60,${.12 + r() * .12})` : `rgba(50,30,8,${.12 + r() * .15})`; elipse(x, r() * 512, r() * 256, 3 + r() * 14, 2 + r() * 8, r() * 3); x.fill(); }
      // gravações em espiral na testa e nas têmporas (sulco escuro com borda clara)
      const espiral = (px, py, rr, s) => { [['rgba(255,225,150,.45)', 1], ['rgba(45,25,4,.8)', 0]].forEach(([cor, d]) => { x.strokeStyle = cor; x.lineWidth = 1.3; x.beginPath(); for (let a = 0; a < 9; a += .2) { const rad = rr * (1 - a / 10); x.lineTo(px + d + Math.cos(a * s) * rad, py + d + Math.sin(a * s) * rad); } x.stroke(); }); };
      [[cx - 30, 92, 11, 1], [cx + 30, 92, 11, -1], [cx, 82, 9, 1], [cx - 58, 120, 10, -1], [cx + 58, 120, 10, 1], [cx - 14, 64, 7, -1], [cx + 14, 64, 7, 1]].forEach(a => espiral(...a));
      x.strokeStyle = 'rgba(45,25,4,.7)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(cx - 45, 106); x.quadraticCurveTo(cx, 96, cx + 45, 106); x.stroke();
      // arco da sobrancelha iluminado
      x.strokeStyle = 'rgba(255,240,190,.55)'; x.lineWidth = 3; [-1, 1].forEach(s => { x.beginPath(); x.ellipse(cx + s * 21, oy - 2, 18, 15, s * .2, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); });
      // órbitas fundas com brasa vermelha no fundo
      [-1, 1].forEach(s => {
        const ex = cx + s * 21;
        gr = x.createRadialGradient(ex, oy, 1, ex, oy, 17); gr.addColorStop(0, '#ff3a18'); gr.addColorStop(.25, '#7a0a04'); gr.addColorStop(.55, '#140604'); gr.addColorStop(1, '#2a1404');
        x.fillStyle = gr; elipse(x, ex, oy, 16, 14, s * .25); x.fill();
      });
      // cavidade do nariz
      x.fillStyle = '#120804'; x.beginPath(); x.moveTo(cx, oy + 9); x.quadraticCurveTo(cx - 9, oy + 24, cx - 5, oy + 29); x.lineTo(cx, oy + 25); x.lineTo(cx + 5, oy + 29); x.quadraticCurveTo(cx + 9, oy + 24, cx, oy + 9); x.fill();
      x.strokeStyle = 'rgba(255,230,160,.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx - 6, oy + 14); x.quadraticCurveTo(cx - 10, oy + 24, cx - 5, oy + 30); x.stroke();
      // maçãs salientes e bochecha funda
      [-1, 1].forEach(s => { x.fillStyle = 'rgba(255,230,160,.25)'; elipse(x, cx + s * 30, oy + 18, 11, 5, s * .4); x.fill(); x.fillStyle = 'rgba(40,20,2,.5)'; elipse(x, cx + s * 33, oy + 38, 9, 14); x.fill(); });
      // dentes em duas fileiras, com falhas
      x.fillStyle = '#1a0c04'; x.fillRect(cx - 26, oy + 36, 52, 24);
      for (let k = 0; k < 2; k++) for (let i = 0; i < 9; i++) {
        if ((k === 0 && i === 6) || (k === 1 && i === 2)) continue;
        const tx = cx - 25 + i * 5.6, ty = oy + 37 + k * 11;
        gr = x.createLinearGradient(tx, 0, tx + 5, 0); gr.addColorStop(0, '#8a6420'); gr.addColorStop(.5, '#f0cf78'); gr.addColorStop(1, '#8a6420');
        x.fillStyle = gr; x.beginPath(); x.moveTo(tx, ty + (k ? 10 : 0)); x.lineTo(tx + 4.8, ty + (k ? 10 : 0)); x.lineTo(tx + 4.2, ty + (k ? 0 : 10)); x.lineTo(tx + .6, ty + (k ? 0 : 10)); x.fill();
      }
      x.strokeStyle = 'rgba(255,225,150,.5)'; x.lineWidth = 1.5; x.strokeRect(cx - 26, oy + 36, 52, 24);
      // rachaduras com borda clara
      for (let i = 0; i < 7; i++) {
        let px = cx + (r() - .5) * 90, py = 70 + r() * 60; const pts = [[px, py]];
        for (let k = 0; k < 6; k++) { px += (r() - .5) * 16; py += 3 + r() * 9; pts.push([px, py]); }
        [['rgba(255,230,160,.4)', 1], ['rgba(25,12,0,.9)', 0]].forEach(([cor, d]) => { x.strokeStyle = cor; x.lineWidth = d ? 1 : 1.3; x.beginPath(); pts.forEach(([a, b], j) => j ? x.lineTo(a + d, b + d) : x.moveTo(a + d, b + d)); x.stroke(); });
      }
      return fazTex(F, c);
    });
  }
  // cerâmica do rosto dos robôs: brilho, bochechas pintadas em degradê, boca pequena, emendas e desgaste
  function rostoRoboTex(F) {
    return texDe(F, 'rostoRobo2', () => {
      const [c, x] = NS.tela(512, 256), r = NS.rng(5), cx = 128;
      x.fillStyle = '#ece8e0'; x.fillRect(0, 0, 512, 256);
      let gr = x.createRadialGradient(cx - 14, 104, 4, cx, 130, 160); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.4, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(70,60,50,.35)');
      x.fillStyle = gr; x.fillRect(0, 0, 512, 256);
      // emenda da placa do rosto e emenda vertical da nuca
      x.strokeStyle = 'rgba(80,70,60,.35)'; x.lineWidth = 1.5; elipse(x, cx, 140, 76, 92); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 1; elipse(x, cx, 141, 77, 93); x.stroke();
      x.strokeStyle = 'rgba(80,70,60,.3)'; x.beginPath(); x.moveTo(384, 0); x.lineTo(384, 256); x.stroke();
      [-1, 1].forEach(k => {
        gr = x.createRadialGradient(cx + k * 40, 160, 1, cx + k * 40, 160, 14); gr.addColorStop(0, '#ff9a3a'); gr.addColorStop(.7, '#f07a1a'); gr.addColorStop(1, 'rgba(240,122,26,0)');
        x.fillStyle = gr; x.beginPath(); x.arc(cx + k * 40, 160, 14, 0, 7); x.fill();
        x.fillStyle = 'rgba(255,230,200,.7)'; x.beginPath(); x.arc(cx + k * 40 - 4, 156, 3, 0, 7); x.fill();
      });
      x.fillStyle = '#141414'; elipse(x, cx, 168, 6, 4.5); x.fill(); x.strokeStyle = 'rgba(120,110,100,.6)'; x.lineWidth = 1; elipse(x, cx, 168, 7.5, 6); x.stroke();
      for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(0,0,0,${r() * .045})`; x.fillRect(r() * 512, r() * 256, 2, 2); }
      x.strokeStyle = 'rgba(70,60,50,.35)'; x.lineWidth = 1; for (let i = 0; i < 8; i++) { let px = r() * 512, py = r() * 256; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (r() - .5) * 24; py += (r() - .5) * 24; x.lineTo(px, py); } x.stroke(); }
      for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(60,50,40,${.05 + r() * .07})`; elipse(x, r() * 512, 180 + r() * 76, 10 + r() * 30, 4 + r() * 10); x.fill(); }
      return fazTex(F, c);
    });
  }

  // tecido: trama, dobras, costuras, sujeira, sangue, estampa
  function tecidoTex(F, cor, o = {}) {
    return texDe(F, 'tec' + cor + JSON.stringify(o), () => {
      const N = o.n || 256, [c, x] = NS.tela(N, N), r = NS.rng(o.sem || 3);
      x.fillStyle = cor; x.fillRect(0, 0, N, N);
      for (let i = 0; i < N; i += 2) { x.fillStyle = `rgba(0,0,0,${.025 + r() * .03})`; x.fillRect(0, i, N, 1); }
      for (let i = 0; i < 1600; i++) { x.fillStyle = r() < .5 ? `rgba(0,0,0,${.07 * r()})` : `rgba(255,255,255,${.05 * r()})`; x.fillRect(r() * N, r() * N, 2, 2); }
      if (o.dobras) for (let i = 0; i < 9; i++) { const gx = r() * N, w = 6 + r() * 14, g = x.createLinearGradient(gx - w, 0, gx + w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, `rgba(0,0,0,${.1 + r() * .12})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(gx - w, 0, w * 2, N); }
      if (o.estampa === 'fantasmas') {
        for (let i = 0; i < 16; i++) {
          const px = r() * N, py = r() * N, t = 7 + r() * 9, a = (r() - .5) * .8;
          x.save(); x.translate(px, py); x.rotate(a);
          x.fillStyle = `rgba(150,145,150,${.2 + r() * .16})`; x.beginPath(); x.arc(0, 0, t, Math.PI, 0); x.lineTo(t, t * 1.4); for (let k = 0; k < 4; k++) x.lineTo(t - (k + .5) * t / 2, t * (k % 2 ? 1.4 : 1)); x.lineTo(-t, t * 1.4); x.closePath(); x.fill();
          x.fillStyle = 'rgba(15,12,14,.7)'; [-1, 1].forEach(s => { x.beginPath(); x.arc(s * t * .35, -t * .1, t * .16, 0, 7); x.fill(); });
          x.strokeStyle = 'rgba(15,12,14,.6)'; x.lineWidth = 1; x.beginPath(); x.arc(0, t * .25, t * .35, .2, Math.PI - .2); x.stroke();
          x.restore();
        }
      }
      if (o.costuras) { x.strokeStyle = o.corCostura || 'rgba(0,0,0,.4)'; x.lineWidth = 1.5; x.setLineDash([4, 3]); o.costuras.forEach(u => { x.beginPath(); x.moveTo(u * N, 0); x.lineTo(u * N, N); x.stroke(); }); x.setLineDash([]); }
      if (o.ziper) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(o.ziper * N - 1.5, 0, 3, N); x.fillStyle = 'rgba(200,200,200,.35)'; for (let y = 0; y < N; y += 4) x.fillRect(o.ziper * N - 1, y, 2, 1.5); }
      if (o.sujeira) for (let i = 0; i < o.sujeira; i++) { x.fillStyle = `rgba(50,35,20,${.06 + r() * .12})`; elipse(x, r() * N, r() * N, 6 + r() * 26, 4 + r() * 18, r() * 3); x.fill(); }
      if (o.borrao) for (let i = 0; i < o.borrao; i++) { x.fillStyle = `rgba(${110 + r() * 40},${8 + r() * 10},6,${.35 + r() * .3})`; elipse(x, r() * N, r() * N, 6 + r() * 16, 14 + r() * 30, (r() - .5) * .6); x.fill(); }
      if (o.sangue) for (let i = 0; i < o.sangue; i++) {
        const sx = r() * N, sy = r() * N; x.fillStyle = `rgba(${95 + r() * 50},${r() * 10},${r() * 8},${.55 + r() * .4})`;
        elipse(x, sx, sy, 1.5 + r() * 6, 1.5 + r() * 9, r() * 3); x.fill();
        for (let k = 0; k < 6; k++) { x.beginPath(); x.arc(sx + (r() - .5) * 34, sy + (r() - .5) * 34, .6 + r() * 2, 0, 7); x.fill(); }
        if (r() < .4) { x.fillRect(sx - 1, sy, 2, 8 + r() * 20); }
      }
      if (o.rasgado) for (let i = 0; i < o.rasgado; i++) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(r() * N, r() * N, 2, 10 + r() * 24); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(r() * N, r() * N, 1, 8 + r() * 20); }
      return fazTex(F, c, o.rep || [1, 1]);
    });
  }
  // compatibilidade: tecido com manchas no estilo antigo
  function panoTex(F, cor, estilo, sem) {
    return tecidoTex(F, cor, { sem, sangue: estilo === 'sangue' ? 9 : 0, rasgado: estilo === 'rasgado' ? 14 : 0, estampa: estilo === 'estampa' ? 'fantasmas' : undefined, dobras: true });
  }
  // fios de cabelo (riscos verticais)
  function cabeloTex(F, cor) {
    return texDe(F, 'cab' + cor, () => {
      const [c, x] = NS.tela(128, 128), r = NS.rng(cor.length * 7 + 3);
      x.fillStyle = cor; x.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 260; i++) { const px = r() * 128; x.strokeStyle = r() < .5 ? `rgba(0,0,0,${.15 + r() * .25})` : `rgba(255,240,220,${.03 + r() * .05})`; x.lineWidth = .6 + r() * 1.2; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + (r() - .5) * 6, 40, px + (r() - .5) * 6, 90, px + (r() - .5) * 4, 128); x.stroke(); }
      return fazTex(F, c, [2, 1]);
    });
  }
  // trança: gomos diagonais alternados
  function trancaTex(F, cor) {
    return texDe(F, 'tr' + cor, () => {
      const [c, x] = NS.tela(64, 128); x.fillStyle = cor; x.fillRect(0, 0, 64, 128);
      for (let y = -16; y < 140; y += 16) { [0, 1].forEach(k => { const g = x.createLinearGradient(0, y, 0, y + 14); g.addColorStop(0, 'rgba(255,240,220,.14)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = g; x.beginPath(); if (k) { x.moveTo(0, y); x.lineTo(32, y + 8); x.lineTo(32, y + 22); x.lineTo(0, y + 14); } else { x.moveTo(64, y + 8); x.lineTo(32, y + 16); x.lineTo(32, y + 30); x.lineTo(64, y + 22); } x.fill(); }); }
      return fazTex(F, c, [1, 6]);
    });
  }
  // atadura enrolada (braços, pernas, pescoço)
  function bandagemTex(F, cor, sem, sangue) {
    return texDe(F, 'band' + cor + sem + (sangue || ''), () => {
      const [c, x] = NS.tela(128, 128), r = NS.rng(sem || 11);
      x.fillStyle = cor; x.fillRect(0, 0, 128, 128);
      for (let y = -40; y < 170; y += 11) { const inc = 18 + r() * 10; x.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,250,235'},${.04 + r() * .08})`; x.beginPath(); x.moveTo(0, y); x.lineTo(128, y + inc); x.lineTo(128, y + inc + 11); x.lineTo(0, y + 11); x.fill(); x.strokeStyle = 'rgba(40,30,18,.5)'; x.lineWidth = 1.3; x.beginPath(); x.moveTo(0, y); x.lineTo(128, y + inc); x.stroke(); }
      for (let i = 0; i < (sangue || 0); i++) { x.fillStyle = `rgba(110,15,10,${.25 + r() * .35})`; elipse(x, r() * 128, r() * 128, 3 + r() * 9, 2 + r() * 6, r() * 3); x.fill(); }
      for (let i = 0; i < 6; i++) { x.fillStyle = `rgba(60,45,25,${.06 + r() * .1})`; elipse(x, r() * 128, r() * 128, 5 + r() * 14, 3 + r() * 9, r() * 3); x.fill(); }
      return fazTex(F, c, [2, 2]);
    });
  }

  /* ================= cabelos ================= */
  function cabelo(F, cab, R, sx, sz, o, op) {
    if (!o || !o.tipo || o.tipo === 'nenhum') return;
    const T = F.T, mc = matTex(F, cabeloTex(F, o.cor || '#2b1d14'), { r: .7 });
    // a escala fica num grupo de fora e a inclinação dentro: assim a calota acompanha a forma da cabeça sem furar
    const cap = (k, tl, incl, ab) => { const gr = F.G(); gr.scale.set(sx, 1, sz); cab.add(gr); const me = calota(F, gr, R * k, mc, tl, { abertura: ab }); me.rotation.x = incl; return me; };
    if (o.tipo === 'coque') {
      cap(1.07, Math.PI * .56, -.85);
      const bun = F.sf(cab, R * .42, mc, 0, R * .72, -R * .58, 12); bun.scale.set(1, .9, 1);
      const nó = F.sf(cab, R * .2, mc, R * .18, R * .96, -R * .5, 8); nó.scale.set(1.2, .8, 1);
      // mechas soltas caindo na frente das orelhas
      [-1, 1].forEach(s => tuboAfilado(F, cab, [[s * R * sx * .85, R * .45, R * .5], [s * R * sx * 1.02, R * .05, R * .55], [s * R * sx * .98, -R * .45, R * .5], [s * R * sx * .9, -R * .7, R * .55]], t => R * .07 * (1 - t * .8), mc, { seg: 10, rad: 5 }));
    } else if (o.tipo === 'trancas') {
      cap(1.045, Math.PI * .57, -.8);
      const mt = matTex(F, trancaTex(F, o.cor || '#140e0b'), { r: .65 });
      // duas tranças grossas saindo de trás das orelhas e caindo pela frente dos ombros
      const L = o.comp || .5;
      [-1, 1].forEach(s => tuboAfilado(F, cab, [[s * R * sx * .7, R * .05, -R * .45], [s * R * sx * 1.05, -R * .45, -R * .2], [s * (R * sx * 1.1 + .03), -R * 1.3, R * .25], [s * (R * sx * 1.05 + .05), -L * .62, R * .55 + .02], [s * (R * sx + .055), -L, R * .62 + .03]],
        (t, i) => R * (.17 - t * .06) * (1 + .22 * Math.abs(Math.sin(i * 1.57))) * (t > .94 ? .55 : 1), mt, { seg: 28, rad: 7 }));
      [-1, 1].forEach(s => { const pt = F.sf(cab, R * .09, M(F, '#3a2a20', { r: .6 }), s * (R * sx + .055), -L - R * .05, R * .62 + .03, 6); pt.scale.y = 1.6; });
    } else if (o.tipo === 'franja_longa') {
      cap(1.07, Math.PI * .62, -.95);
      // franja reta cortada logo acima dos olhos
      const fr = new T.Mesh(F.guardar(new T.SphereGeometry(R * 1.1, 18, 5, Math.PI / 2 - 1.25, 2.5, Math.PI * .06, Math.PI * .325)), mc); fr.scale.set(sx, 1, sz); cab.add(fr);
      // cabelo comprido e liso: cortina atrás e mechas dos lados emoldurando o rosto
      const L = o.comp || .45;
      casca(F, cab, [[-L, R * 1.55, R * 1.25, -R * .32], [-L * .55, R * 1.42, R * 1.18, -R * .28], [-R * .7, R * sx * 1.2, R * sz * 1.1, -R * .14], [-R * .2, R * sx * 1.1, R * sz * 1.08, -R * .05], [R * .1, R * sx * 1.07, R * sz * 1.06]],
        matTex(F, cabeloTex(F, o.cor || '#1e1612'), { r: .7, lado: 2 }), { abertura: 1.75, seg: 20,
          deform: (x, y, z, j, u, ang, i) => j === 0 ? [x, y - hash(i, 3) * .03, z] : [x, y, z] });
    } else if (o.tipo === 'chanel') {
      // chanel com franja e mechas coloridas
      const mm = matTex(F, o.mecha ? cabeloMechaTex(F, o.cor || '#0e0e12', o.mecha) : cabeloTex(F, o.cor || '#0e0e12'), { r: .6, lado: 2 });
      cap(1.07, Math.PI * .58, -.8);
      const gf = F.G(); gf.scale.set(sx, 1, sz); cab.add(gf);
      malha(F, gf, new T.SphereGeometry(R * 1.1, 18, 5, Math.PI / 2 - 1.2, 2.4, Math.PI * .06, Math.PI * .33), mm);
      casca(F, cab, [[-R * .85, R * sx * 1.3, R * sz * 1.24, -R * .1], [-R * .4, R * sx * 1.24, R * sz * 1.18, -R * .06], [R * .1, R * sx * 1.13, R * sz * 1.11], [R * .55, R * sx * .9, R * sz * .92]], mm,
        { abertura: 1.95, seg: 22, deform: (x, y, z, j, u, ang, i) => j === 0 ? [x, y - hash(i, 5) * .03, z] : [x, y, z] });
    } else if (o.tipo === 'baguncado' || o.tipo === 'curto') {
      cap(1.07, Math.PI * .56, o.incl ?? -.7);
      if (o.tipo === 'baguncado') {
        const r = NS.rng(o.sem || 13);
        for (let i = 0; i < 10; i++) {
          const a = r() * Math.PI * 2, el = .25 + r() * .9, len = R * (.35 + r() * .25);
          const tu = F.sf(cab, R * .22, mc, Math.sin(a) * Math.cos(el) * R * sx * .9, Math.sin(el) * R * .95 + R * .05, (Math.cos(a) * Math.cos(el) * R * sz * .9) - R * .05, 6);
          tu.scale.set(.7, .55, len / (R * .22)); tu.lookAt(tu.position.x * 3, tu.position.y * 3 + R * .5, tu.position.z * 3);
        }
        const fr = F.sf(cab, R * .3, mc, R * .1, R * .62, R * .62, 6); fr.scale.set(1.6, .5, .6); fr.rotation.z = .3;
      }
    }
  }

  /* ================= corpo humano articulado (miniatura) ================= */
  // op: alt, sexo ('f'), crianca, porte, pele, camisa/camisaTex, calca/calcaTex, manga/mangaTex, mangaCurta,
  // sapato, sola, bota, maos, luvaEsq, gola ('redonda' | 'camisa'), cinto, rosto{…}, cabelo{tipo, cor},
  // bracosFixos, giroCabeca, extras(partes), anim(dt, t, andando)
  function humano(F, op) {
    const T = F.T, { G } = F, m = (c, o) => M(F, c, o);
    const A = op.alt || 1.72, cri = !!op.crianca, fem = op.sexo === 'f';
    const s = cri ? A / 1.2 : A / 1.72, P = op.porte || 1;
    const hc = A / (cri ? 5.3 : 7.4);
    const Y = { topo: A, queixo: A - hc };
    Y.ombro = Y.queixo - (cri ? .25 : .33) * hc;
    Y.peito = Y.ombro - (cri ? .38 : .5) * hc;
    Y.cintura = A * (cri ? .6 : .615);
    Y.quadril = A * (cri ? .475 : .52);
    Y.virilha = Y.quadril - A * (cri ? .045 : .05);
    Y.joelho = A * (cri ? .255 : .285);
    Y.tornozelo = A * (cri ? .04 : .045);
    const W0 = cri ? { ombro: .118, tO: .124, p: .112, dP: .084, c: .106, dC: .08, q: .112, dQ: .08, coxa: .056, canela: .043, braco: .039, ante: .032, pesc: .036 }
      : fem ? { ombro: .158, tO: .162, p: .142, dP: .102, c: .118, dC: .088, q: .162, dQ: .104, coxa: .074, canela: .05, braco: .046, ante: .038, pesc: .04 }
        : { ombro: .182, tO: .188, p: .165, dP: .11, c: .14, dC: .094, q: .152, dQ: .104, coxa: .08, canela: .057, braco: .053, ante: .043, pesc: .046 };
    const W = {}; Object.keys(W0).forEach(k => { W[k] = W0[k] * s * (k === 'pesc' ? 1 : P); });
    if (op.forte) { const f = op.forte; [['tO', .22], ['p', .2], ['dP', .2], ['braco', .38], ['ante', .3], ['coxa', .15], ['canela', .1], ['c', .06], ['ombro', .16], ['pesc', .25]].forEach(([k, v]) => { W[k] *= 1 + v * f; }); }
    const Lb = A * (cri ? .17 : .185) * (op.bracoLongo || 1), La = A * (cri ? .14 : .15) * (op.bracoLongo || 1);
    const Lc = Y.quadril - Y.joelho, Ls = Y.joelho - Y.tornozelo;
    const eM = s * (cri ? .74 : fem ? .9 : 1) * (op.maoGrande || 1);   // escala das mãos e pés

    const mt = (cor, ex = {}) => m(cor, { r: .8, ...ex });
    const pele = mt(op.pele || '#d9b49a', { r: .62 });
    const tx = (t, ex = {}) => matTex(F, t, { r: .85, ...ex });
    const camisa = op.camisaTex ? tx(op.camisaTex) : mt(op.camisa || '#888');
    const calca = op.calcaTex ? tx(op.calcaTex) : mt(op.calca || '#333');
    const manga = op.mangaTex ? tx(op.mangaTex) : op.manga ? mt(op.manga) : camisa;
    const maos = op.maos ? mt(op.maos, { r: .6 }) : pele;
    const sapato = mt(op.sapato || '#222', { r: .5 }), sola = mt(op.sola || '#141414', { r: .9 });

    const g = G(), corpo = G(); g.add(corpo);
    // quadril (calça) e tronco (camisa), de seção elíptica
    const quadril = casca(F, corpo, [
      [Y.virilha - .035 * s, .025 * s, .03 * s], [Y.virilha, W.q * .9, W.dQ * .9], [Y.quadril - .02 * s, W.q, W.dQ, -.004 * s],
      [(Y.quadril + Y.cintura) / 2, (W.q + W.c) / 2 * 1.02, (W.dQ + W.dC) / 2 * 1.02], [Y.cintura + .025 * s, W.c * 1.035, W.dC * 1.04]], op.quadrilMat || calca, { seg: 16 });
    const tronco = casca(F, corpo, [
      [Y.cintura - .07 * s, W.c * .97, W.dC * .97], [Y.cintura, W.c, W.dC], [(Y.cintura + Y.peito) / 2, (W.c + W.p) / 2, (W.dC + W.dP) / 2, fem ? .004 : 0],
      [Y.peito, W.p, W.dP, fem ? .014 * s : .006 * s], [Y.ombro - .045 * s, W.tO * 1.04, W.dP * .92], [Y.ombro + .005 * s, W.tO * .93, W.dP * .8],
      [Y.ombro + .035 * s, W.tO * .5, W.dP * .58], [Y.ombro + .05 * s, W.pesc * 1.25, W.pesc * 1.15]], camisa, { seg: 18 });
    // pescoço
    const pesc = F.cy(corpo, W.pesc, W.pesc * 1.12, Y.queixo - Y.ombro + .06 * s, op.pescocoMat || pele, 0, Y.ombro - .01 * s, -.008 * s, 10);
    if (op.gola === 'redonda') { const go = new T.Mesh(F.guardar(new T.TorusGeometry(W.pesc * 1.25, .011 * s, 6, 18)), camisa); go.rotation.x = Math.PI / 2 - .2; go.position.set(0, Y.ombro + .045 * s, .004); go.scale.set(1, 1.05, 1); corpo.add(go); }
    if (op.gola === 'camisa') [-1, 1].forEach(k => { const go = F.bx(corpo, .055 * s, .045 * s, .008 * s, mt(op.corGola || '#f2f2f0', { r: .7 }), k * .03 * s, Y.ombro + .025 * s, W.pesc * 1.05); go.rotation.set(-.35, k * .5, k * .7); });
    // cinto com fivela
    if (op.cinto) {
      casca(F, corpo, [[Y.cintura - .022 * s, W.c * 1.07, W.dC * 1.09], [Y.cintura + .022 * s, W.c * 1.065, W.dC * 1.08]], mt(op.cinto, { r: .45 }), { seg: 18 });
      F.bx(corpo, .055 * s, .04 * s, .012 * s, m(op.fivela || '#b9b9b0', { me: .8, r: .3 }), 0, Y.cintura - .02 * s, W.dC * 1.09);
    }

    // cabeça
    const R = hc * .5, sxC = cri ? .9 : fem ? .8 : .82, szC = cri ? .94 : .92;
    const cab = G(); cab.position.set(0, Y.queixo + R * .95, cri ? 0 : .006 * s); corpo.add(cab);
    // rosto: a Velcro usa o desenho original (v1); os outros, o rosto detalhado
    const cabMat = op.cabecaMat || matTex(F, (op.rosto && op.rosto.v1 ? rostoTex : rostoTex2)(F, { pele: op.pele, fem, ...(op.rosto || {}) }), { r: .6 });
    const ec = op.escalaCabeca || [1, 1, 1];
    const cabeca = F.sf(cab, R, cabMat, 0, 0, 0, 22); cabeca.scale.set(sxC * ec[0], ec[1], szC * ec[2]);
    if (!op.semNariz) { const n = F.sf(cab, R * .095, op.narizMat || pele, 0, -R * .16, R * szC * .97, 8); n.scale.set(.85, 1.15, 1); }
    if (!op.semOrelhas) [-1, 1].forEach(k => { const o2 = F.sf(cab, R * .21, op.narizMat || pele, k * R * sxC * .96, -R * .06, -R * .04, 8); o2.scale.set(.42, 1, .72); });
    cabelo(F, cab, R, sxC, szC, op.cabelo, op);
    if (op.brincos) [-1, 1].forEach(k => { const t = new T.Mesh(F.guardar(new T.TorusGeometry(R * .2, R * .03, 6, 16)), m('#d4af37', { me: .9, r: .25 })); t.position.set(k * R * sxC * 1.0, -R * .42, -R * .02); t.rotation.y = Math.PI / 2; cab.add(t); });

    // braços: ombro (balanço) > braço (pose) > cotovelo > mão
    const bracos = [-1, 1].map(k => {
      const ombro = G(); ombro.position.set(k * W.ombro * .96, Y.ombro - .038 * s, 0); corpo.add(ombro);
      const braco = G(); ombro.add(braco); braco.rotation.z = k * .07;
      const mg = k > 0 && op.mangaEsq ? mt(op.mangaEsq) : manga;
      F.sf(braco, W.braco * 1.12, op.ombroMat || (op.mangaCurta ? camisa : mg), 0, -.004 * s, 0, 10).scale.set(.9, .82, 1);
      if (op.mangaCurta) capsula(F, braco, W.braco * .95, W.braco * .84, Lb * .7, pele, 10).position.y = -Lb * .3;
      else capsula(F, braco, W.braco, W.braco * .84, Lb, mg, 10);
      if (op.mangaCurta) casca(F, braco, [[-Lb * .45, W.braco * 1.18, W.braco * 1.18], [-Lb * .2, W.braco * 1.15, W.braco * 1.16], [W.braco * .3, W.braco * 1.12, W.braco * 1.12]], op.mangaCurtaMat || camisa, { seg: 12 });
      const cot = G(); cot.position.y = -Lb; braco.add(cot); cot.rotation.x = -.12;
      const luva = k > 0 && op.luvaEsq ? mt(op.luvaEsq, { r: .45 }) : null;
      const anteMat = luva || (op.anteMat ? op.anteMat(k) : null) || (op.mangaCurta ? pele : mg);
      capsula(F, cot, W.ante, W.ante * .78, La, anteMat, 10);
      if (!op.mangaCurta && !luva && !op.semPunho) casca(F, cot, [[-La + .005 * s, W.ante * 1.02, W.ante * 1.05], [-La + .03 * s, W.ante * 1.08, W.ante * 1.1]], op.punhoMat || mg, { seg: 10 });
      const mao = G(); mao.position.y = -La; cot.add(mao);
      const mm = luva || maos;
      const palma = F.sf(mao, .03 * eM, mm, 0, -.034 * eM, 0, 8); palma.scale.set(.55, 1.4, 1);
      const dedos = F.sf(mao, .027 * eM, mm, -k * .003 * eM, -.075 * eM, .004 * eM, 8); dedos.scale.set(.5, 1.45, .95); dedos.rotation.z = -k * .12;
      const pol = capsula(F, mao, .011 * eM, .009 * eM, .038 * eM, mm, 6, 2); pol.position.set(-k * .006 * eM, -.018 * eM, .02 * eM); pol.rotation.set(-.55, 0, -k * .25);
      return { ombro, braco, cot, mao, k, Lb, La, fixo: !!op.bracosFixos };
    });
    // pernas: quadril > joelho > pé
    const pernas = [-1, 1].map(k => {
      const quad = G(); quad.position.set(k * W.q * .48, Y.quadril, 0); corpo.add(quad);
      capsula(F, quad, W.coxa, W.canela * 1.12, Lc, op.coxaMat || calca, 10);
      const joelho = G(); joelho.position.y = -Lc; quad.add(joelho);
      capsula(F, joelho, W.canela * 1.08, W.canela * (op.bocaLarga || .82), Ls, op.canelaMat || calca, 10);
      const pe = G(); pe.position.y = -Ls; joelho.add(pe);
      const ch = -Y.tornozelo;
      const dom = calota(F, pe, 1, op.sapatoMat || sapato, Math.PI / 2, { seg: 12, segV: 5 }); dom.scale.set(.05 * eM, .085 * eM, .125 * eM); dom.position.set(0, ch + .018 * s, .04 * eM);
      F.bx(pe, .1 * eM, .02 * s, .255 * eM, sola, 0, ch, .035 * eM);
      if (op.bota) F.cy(pe, W.canela * .95, .05 * eM, .1 * s + .05 * eM, op.sapatoMat || sapato, 0, ch + .02 * s, 0, 10);
      return { quad, joelho, pe };
    });

    const partes = { F, g, corpo, cab, cabeca, pernas, bracos, tronco, quadril, pesc, mt, Y, W, R, s, A, sxC, szC, Lb, La, posar: (br, alvo, polo) => posar(F, br, alvo, polo) };
    if (op.extras) op.extras(partes);

    // animação: respira parado; andando, pernas e braços balançam (com o joelho dobrando)
    let fase = 0;
    const amp = cri ? .38 : .45, giro = op.giroCabeca ?? .15;
    const anim = (dt, t, andando) => {
      if (op.semAnimPadrao) { if (op.anim) op.anim(dt, t, andando, partes); return; }
      if (andando) {
        fase += dt * (cri ? 8.5 : 7);
        const a = Math.sin(fase) * amp, cf = Math.cos(fase);
        pernas[0].quad.rotation.x = a; pernas[1].quad.rotation.x = -a;
        pernas[0].joelho.rotation.x = Math.max(0, -cf) * .85; pernas[1].joelho.rotation.x = Math.max(0, cf) * .85;
        bracos.forEach((b, i) => { if (!b.fixo) { b.ombro.rotation.x = (i ? a : -a) * .75; b.cot.rotation.x = -.2 - Math.max(0, i ? -a : a) * .5; } });
        corpo.position.y = Math.abs(Math.cos(fase)) * .025 * s;
      } else {
        pernas.forEach(p => { p.quad.rotation.x *= .85; p.joelho.rotation.x *= .85; });
        bracos.forEach(b => { if (!b.fixo) { b.ombro.rotation.x *= .85; b.cot.rotation.x = b.cot.rotation.x * .85 - .12 * .15; } });
        corpo.position.y *= .8; cab.rotation.y = Math.sin(t * .5) * giro;
        tronco.scale.x = 1 + Math.sin(t * 2) * .012; tronco.scale.z = 1 + Math.sin(t * 2) * .02;
      }
      if (op.anim) op.anim(dt, t, andando, partes);
    };
    return { g, alt: A, anim, partes };
  }

  /* ================= Mostarda: escorpião de sangue meio humano ================= */
  function carapacaTex(F) {
    return texDe(F, 'carapaca', () => {
      const [c, x] = NS.tela(256, 256), r = NS.rng(41);
      x.fillStyle = '#4a0508'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1800; i++) { x.fillStyle = r() < .5 ? `rgba(0,0,0,${.15 * r()})` : `rgba(255,120,110,${.06 * r()})`; x.fillRect(r() * 256, r() * 256, 2, 2); }
      x.strokeStyle = 'rgba(255,60,40,.85)'; x.lineWidth = 1.6;
      for (let i = 0; i < 12; i++) { let px = r() * 256, py = r() * 256; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - .5) * 40; py += (r() - .5) * 40; x.lineTo(px, py); } x.stroke(); }
      return fazTex(F, c, [2, 1]);
    });
  }
  function escorpiao(F) {
    const T = F.T, { G, cy, sf } = F, m = (c, o) => M(F, c, o);
    const g = G(), bicho = G(); g.add(bicho);
    const casc = matTex(F, carapacaTex(F), { r: .2, me: .2, e: '#ff2010', ei: .55, emiMapa: true });
    const junta = m('#2a0306', { r: .35, me: .1 });
    // prossoma (frente) e abdome de sete placas numa peça só, deitado para trás
    const pro = casca(F, bicho, [[-.3, .02, .02], [-.2, .24, .3], [0, .34, .36], [.12, .3, .3], [.2, .02, .02]], casc, { seg: 18, deform: (x, y, z) => [x, z * .5, y] });
    pro.position.set(0, .52, .1);
    const ab = [];
    for (let i = 0; i <= 28; i++) { const t = i / 28, k = Math.max(0, 1 - t * .5); const ond = Math.abs(Math.sin(t * Math.PI * 7)); ab.push([-t * 1.25, .34 * k * (.88 + ond * .12), .3 * k * (.9 + ond * .1)]); }
    ab.unshift([.02, .02, .02]); ab.push([-1.3, .02, .02]);
    const abd = casca(F, bicho, ab.map(([y, w, d]) => [y, w, d]), casc, { seg: 16, deform: (x, y, z) => [x, z * .45, y] });
    abd.position.set(0, .5, -.12);
    // oito patas (quatro de cada lado), cada uma um tubo só com joelho
    const patas = [];
    [-1, 1].forEach(sx => [.12, -.12, -.36, -.6].forEach((z, i) => {
      const p = G(); p.position.set(sx * .26, .5, z); bicho.add(p);
      const ab2 = .12 + i * .07, zz = (1.5 - i);
      tuboAfilado(F, p, [[0, 0, 0], [sx * .3, .2, zz * .05], [sx * .5, .18, zz * .08], [sx * (.68 + ab2 * .4), -.15, zz * .13], [sx * (.8 + ab2 * .5), -.5, zz * .16]],
        t => (.06 - t * .048) * (1 + .35 * Math.max(0, 1 - Math.abs(t - .35) * 12) + .3 * Math.max(0, 1 - Math.abs(t - .66) * 12)), casc, { seg: 18, rad: 6, tensao: .2 });
      patas.push({ p, sx, i });
    }));
    // cauda: seis segmentos encadeados, curvando por cima das costas; ferrão na ponta
    const cauda = []; let pai = G(); pai.position.set(0, .5, -1.32); pai.rotation.x = -1.0; bicho.add(pai); cauda.push(pai);
    for (let i = 0; i < 6; i++) {
      const L = .3 - i * .018, rr = .14 - i * .012;
      casca(F, pai, [[-.02, rr * .7, rr * .7], [L * .15, rr, rr * .95], [L * .55, rr * 1.06, rr], [L * .9, rr * .85, rr * .8], [L + .02, rr * .55, rr * .55]], casc, { seg: 12 });
      sf(pai, rr * .62, junta, 0, L, 0, 8);
      const prox = G(); prox.position.set(0, L, 0); prox.rotation.x = .47; pai.add(prox); cauda.push(prox); pai = prox;
    }
    const ferrao = G(); pai.add(ferrao); ferrao.rotation.x = .5;
    const bulbo = sf(ferrao, .12, casc, 0, .12, 0, 14); bulbo.scale.set(1, 1.4, 1.1);
    const ponta = tuboAfilado(F, ferrao, [[0, .22, 0], [0, .34, .04], [0, .42, .14], [0, .43, .24]], t => .05 * (1 - t) + .003, m('#1a0204', { r: .2, me: .4 }), { seg: 10, rad: 6 });
    const pontaFim = new T.Object3D(); pontaFim.position.set(0, .43, .24); ferrao.add(pontaFim);
    // gotas de sangue caindo do ferrão
    const gotaMat = m('#9a0008', { r: .15, e: '#3a0000', ei: .5 });
    const gotas = [0, 1, 2].map(i => { const gt = sf(g, .025, gotaMat, 0, 0, 0, 6); gt.scale.set(1, 1.6, 1); return { gt, f: i / 3 }; });
    const poca = new T.Mesh(F.guardar(new T.CircleGeometry(.5, 20)), m('#3a0003', { r: .1, op: .85 })); poca.rotation.x = -Math.PI / 2; poca.position.set(0, .02, -.3); poca.scale.set(1.3, 1, 1); g.add(poca);

    // o homem: o humano de sempre, só do quadril para cima, saindo da frente do escorpião
    const veste = texDe(F, 'colete', () => {
      const [c, x] = NS.tela(512, 256), r = NS.rng(51);
      x.fillStyle = '#1e2124'; x.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(255,255,255,${.04 * r()})`; x.fillRect(r() * 512, r() * 256, 2, 2); }
      x.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 120; y < 250; y += 14) x.fillRect(0, y, 512, 4);   // fitas de engate
      x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 3; x.strokeRect(150, 4, 212, 248);
      x.font = 'bold 34px Arial Black, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#cfcfcf';
      x.fillText('SWAT', 256, 62); x.font = 'bold 44px Arial Black, Arial, sans-serif'; x.fillText('SWAT', 0, 90); x.fillText('SWAT', 512, 90);
      x.fillStyle = 'rgba(80,60,40,.35)'; for (let i = 0; i < 10; i++) { elipse(x, r() * 512, r() * 256, 6 + r() * 18, 4 + r() * 10, r() * 3); x.fill(); }
      return fazTex(F, c);
    });
    const h = humano(F, { alt: 1.82, porte: 1.12, pele: '#c9a07a', camisaTex: tecidoTex(F, '#c8b593', { sem: 17, sangue: 10, sujeira: 10, dobras: true }), calca: '#2c2a26', sapato: '#1a1a1a', maos: '#1e1e1e',
      rosto: { bandagem: '#cdb48a', iris: '#3a2a20', sem: 7, sujaSangue: true }, cabelo: { tipo: 'nenhum' }, semNariz: true, semOrelhas: true,
      pescocoMat: matTex(F, bandagemTex(F, '#c4ab80', 12, 3), { r: .9 }), giroCabeca: .1,
      anteMat: () => matTex(F, bandagemTex(F, '#b8a07a', 11, 6), { r: .9 }), semPunho: true,
      extras: ({ F, corpo, Y, W, s, mt }) => {
        const vm = matTex(F, veste, { r: .75 });
        casca(F, corpo, [[Y.cintura - .03, W.c * 1.16, W.dC * 1.28], [Y.peito - .06, W.p * 1.12, W.dP * 1.25, .005], [Y.peito + .03, W.p * 1.1, W.dP * 1.22, .008], [Y.ombro - .03, W.tO * .9, W.dP * 1.05]], vm, { seg: 18 });
        // alças nos ombros e bolsos na frente
        [-1, 1].forEach(k => { const al = F.bx(corpo, .07, .03, .2, mt('#1a1c1f'), k * .11, Y.ombro - .02, 0); al.rotation.z = k * .3; });
        const bol = mt('#26292d', { r: .7 });
        for (let i = 0; i < 3; i++) { const b2 = F.bx(corpo, .085, .1, .045, bol, -.1 + i * .1, Y.cintura + .02, W.dC * 1.2); b2.rotation.x = -.05; }
        // cintura virando carapaça
        const cinta = cy(corpo, .2, .27, .24, casc, 0, Y.quadril - .06, -.02, 16); cinta.scale.z = .78;
      } });
    h.partes.pernas.forEach(p => { p.quad.visible = false; });
    const homem = G(); homem.add(h.g); homem.position.set(0, -.35, .3); bicho.add(homem);
    // pinças no lugar das mãos
    const pincas = h.partes.bracos.map(b => {
      b.mao.children.forEach(c => { c.visible = false; });
      const pz = G(); pz.position.set(0, -.02, 0); b.mao.add(pz);
      const palma = casca(F, pz, [[-.26, .02, .02], [-.2, .085, .07], [-.08, .1, .08], [0, .06, .05], [.03, .02, .02]], casc, { seg: 12 });
      tuboAfilado(F, pz, [[.04, -.2, 0], [.07, -.32, .01], [.05, -.46, .02], [.0, -.52, .02]], t => .05 * (1 - t * .9), casc, { seg: 10, rad: 6 });
      const mov = G(); mov.position.set(-.04, -.2, 0); pz.add(mov);
      tuboAfilado(F, mov, [[0, 0, 0], [-.04, -.12, .01], [-.03, -.25, .02], [.02, -.3, .02]], t => .042 * (1 - t * .9), casc, { seg: 10, rad: 6 });
      return mov;
    });
    h.partes.bracos.forEach((b, k) => { b.fixo = true; b.ombro.rotation.x = -.5; b.ombro.rotation.z = (k ? 1 : -1) * .35; });
    let fase = 0;
    const anim = (dt, t, andando) => {
      h.anim(dt, t, false);
      h.partes.bracos.forEach((b, k) => { b.ombro.rotation.x = -.5 + Math.sin(t * 1.3 + k) * .12; b.ombro.rotation.z = (k ? 1 : -1) * (.35 + Math.sin(t * .9 + k * 2) * .06); b.cot.rotation.x = -.5; });
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
      pincas.forEach((pm, k) => { pm.rotation.z = -.1 - Math.max(0, Math.sin(t * 2.2 + k * 1.7)) * .45; });
      abd.scale.y = 1 + Math.sin(t * 2) * .03;
      // gotas: caem do ferrão até o chão e recomeçam
      g.updateWorldMatrix(true, true); const ptW = pontaFim.getWorldPosition(new T.Vector3()); g.worldToLocal(ptW);
      gotas.forEach(o => { const q = (t * .6 + o.f) % 1; o.gt.position.set(ptW.x, Math.max(.03, ptW.y * (1 - q * q)), ptW.z + .03); o.gt.visible = q < .97; });
    };
    return { g, alt: 2.05, anim, raioBase: .62 };
  }

  /* ================= detalhes de roupa usados por mais de uma cobaia ================= */
  // pano que cai (capa, sobretudo): dobras que crescem para baixo e barra recortada
  const pano = (amp, nd, serra, sem, nAneis) => (x, y, z, j, u, ang, i) => {
    const f = 1 - j / (nAneis - 1), k = 1 + amp * f * Math.sin(ang * nd + sem);
    let yy = y; if (j === 0) yy -= serra * (hash(i, sem) > .45 ? hash(i * 3, sem) : .1);
    return [x * k, yy, z * k];
  };

  /* ================= as sete cobaias (a partir das imagens de referência) ================= */
  const COBAIAS = {
    // Faca: coque bagunçado, sardas, blusa clara, calça cargo verde-oliva com bolsos laterais, botas de trilha
    // vermelho-marrom, cinto de bolsinhas; luva escura comprida no braço esquerdo segurando um frasco; bolsa de
    // couro no quadril direito com a planta (brotos, folhas e gavinhas escuras) saindo dela
    faca: F => humano(F, { alt: 1.62, sexo: 'f', pele: '#e2bea4', camisaTex: tecidoTex(F, '#e4dccb', { sem: 4, sujeira: 12, dobras: true, sangue: 2 }),
      calcaTex: tecidoTex(F, '#56603e', { sem: 5, costuras: [.25, .75], sujeira: 16, dobras: true, sangue: 3 }), mangaCurta: true, gola: 'redonda',
      sapato: '#7a3a2a', sola: '#2a1a14', bota: true, bocaLarga: 1.15, cinto: '#4a3020', fivela: '#8a7a5a', luvaEsq: '#1e1e20',
      rosto: { sardas: true, iris: '#5a4422', irisClara: '#8a7a4a', sobrancelha: '#3b2416', blush: 'rgba(200,110,100,.2)', sujeira: 4 }, cabelo: { tipo: 'coque', cor: '#3b2416' },
      extras: ({ F, corpo, pernas, bracos, Y, W, s, mt, posar }) => {
        const { G, T } = F, m = (c, o) => M(F, c, o);
        // bolsos laterais (cargo) nas coxas, com aba
        const verde = matTex(F, tecidoTex(F, '#56603e', { sem: 5, costuras: [.25, .75], sujeira: 16, dobras: true, sangue: 3 }), { r: .85 }), aba = mt('#3d4529');
        pernas.forEach((p, i) => { const k = i ? 1 : -1; F.bx(p.quad, .032, .11, .1, verde, k * .07, -.32, 0); });
        // bainha franzida dentro da bota
        pernas.forEach(p => casca(F, p.joelho, [[-(Y.joelho - Y.tornozelo) + .1, W.canela * 1.0, W.canela * 1.0], [-(Y.joelho - Y.tornozelo) + .14, W.canela * 1.12, W.canela * 1.12], [-(Y.joelho - Y.tornozelo) + .2, W.canela * 1.0, W.canela * 1.0]], verde, { seg: 10 }));
        // bolsinhas do cinto
        const couro = mt('#5a3a22', { r: .6 });
        [[-.08, .7], [.06, .3], [.12, 1.3]].forEach(([x0, a]) => { const b = F.bx(corpo, .055, .06, .035, couro, 0, Y.cintura - .07, 0); b.position.set(Math.sin(a) * W.c * 1.1 * Math.sign(x0 || 1), Y.cintura - .045, Math.cos(a) * W.dC * 1.15); b.rotation.y = a * Math.sign(x0 || 1); });
        // alça atravessada no peito (do ombro esquerdo ao quadril direito)
        tuboAfilado(F, corpo, [[W.ombro * .7, Y.ombro + .03, -.02], [W.p * .5, Y.peito + .02, W.dP * 1.12], [-W.p * .2, Y.cintura + .1, W.dC * 1.22], [-W.q * .95, Y.quadril + .02, .05]], () => .011, couro, { seg: 16, rad: 4 });
        // bolsa no quadril direito com a planta saindo
        const bolsa = G(); bolsa.position.set(-W.q * 1.2, Y.quadril - .12, .04); corpo.add(bolsa);
        casca(F, bolsa, [[0, .02, .02], [.02, .1, .08], [.14, .12, .09], [.24, .1, .075], [.27, .11, .08]], mt('#4a2e18', { r: .65 }), { seg: 14 });
        const folha = mt('#2f5a26', { r: .55 }), escura = mt('#241418', { r: .45 });
        for (let i = 0; i < 5; i++) { const f = new T.Mesh(F.guardar(new T.ConeGeometry(.035, .18, 4)), folha); f.position.set((i % 3 - 1) * .05, .32 + (i % 2) * .06, (i % 2) * .03 - .01); f.rotation.set(.35 * (i % 3 - 1), i, .6 * (i % 2 ? 1 : -1)); f.scale.z = .3; bolsa.add(f); }
        const r = NS.rng(8);
        for (let i = 0; i < 3; i++) { const pts = []; let px = 0, pz = 0; for (let k = 0; k < 6; k++) { pts.push([px, .2 + k * .1, pz]); px += (r() - .5) * .14 - .02; pz += (r() - .5) * .1; } tuboAfilado(F, bolsa, pts, t => .016 * (1 - t * .85), escura, { seg: 14, rad: 4 }); }
        F.sf(bolsa, .03, m('#8a1a1a', { e: '#3a0000', ei: .4 }), .03, .5, .02, 8);
        // braço esquerdo dobrado segurando um frasco vermelho
        posar(bracos[1], [W.ombro * 1.35, Y.ombro + .12, .16], [.35, -1, .25]);
        const fr = G(); fr.position.set(0, -.07, .015); bracos[1].mao.add(fr); alinhar(F, fr, 0, 0, .15);
        F.cy(fr, .013, .013, .075, m('#c81e1e', { r: .1, op: .85, e: '#500000', ei: .6 }), 0, -.02, 0, 8);
        F.cy(fr, .015, .015, .018, m('#3a3a3a'), 0, .055, 0, 8);
      } }),
    // Sabonete: capa azul-escura esfarrapada com capuz aberto na frente, máscara de caveira dourada com olhos
    // vermelhos acesos e um tubo de respiração, cachecol vermelho, couraça de bronze gravada e um revólver longo
    sabonete: F => humano(F, { alt: 1.8, pele: '#5a4a3a', camisa: '#22252e', calca: '#24252b', sapato: '#2e2218', bota: true, maos: '#3a2618', manga: '#1d2436',
      rosto: { bandagem: '#000', semOlhos: true }, cabelo: { tipo: 'nenhum' }, semNariz: true, semOrelhas: true, giroCabeca: .05,
      extras: ({ F, corpo, cab, cabeca, bracos, Y, W, R, sxC, szC, s, mt, posar }) => {
        const { G, T } = F, m = (c, o) => M(F, c, o);
        // máscara de caveira dourada (textura) com relevo de sobrancelha, maçãs e queixo
        const masc = caveiraTex(F);
        const ouro = m('#c89a38', { me: .65, r: .38, e: '#2a1800', ei: .4 });
        cabeca.material = matTex(F, masc, { me: .6, r: .38, e: '#2a1800', ei: .45 });
        const sob = F.sf(cab, R * .45, ouro, 0, R * .2, R * szC * .62, 10); sob.scale.set(1.6, .45, .7);
        [-1, 1].forEach(k => { const mc = F.sf(cab, R * .24, ouro, k * R * .5, -R * .28, R * szC * .7, 8); mc.scale.set(1, .7, .7); });
        const qx = F.sf(cab, R * .4, ouro, 0, -R * .7, R * .45, 10); qx.scale.set(1.3, .6, 1);
        const olhoV = m('#ff2a1a', { e: '#ff1a0a', ei: 2.2 });
        [-1, 1].forEach(k => F.sf(cab, R * .085, olhoV, k * R * .33, -R * .03, R * szC * .9, 8));
        // capuz: aberto na frente (o rosto aparece), bico para trás, por dentro escuro
        const capa = mt('#1c2438', { r: .95 }), forro = m('#07080c', { r: 1, lado: 1 });
        const gC = new T.SphereGeometry(R * 1.42, 22, 12, Math.PI / 2 + .85, Math.PI * 2 - 1.7, 0, Math.PI * .78);
        const pc = gC.attributes.position;
        for (let i = 0; i < pc.count; i++) { let x = pc.getX(i), y = pc.getY(i), z = pc.getZ(i); if (z < 0 && y > 0) { z -= y * .35 * (-z / (R * 1.42)); y += (-z) * .12; } if (y < 0) { const k = 1 + (-y / (R * 1.42)) * .55; x *= k; z = z * k - (-y) * .1; } pc.setXYZ(i, x * sxC * 1.05, y, z); }
        gC.computeVertexNormals();
        const capuz = malha(F, cab, gC, capa); capuz.position.set(0, R * .08, -R * .06); capuz.rotation.x = .12;
        const dentro = new T.Mesh(gC, forro); dentro.position.copy(capuz.position); dentro.rotation.copy(capuz.rotation); dentro.scale.setScalar(.985); cab.add(dentro);
        const nuca = F.sf(cab, R * 1.25, forro, 0, 0, -R * .2, 12); nuca.scale.set(.95, 1, .7);
        // cachecol vermelho
        const verm = mt('#7a1410', { r: .9 });
        casca(F, corpo, [[Y.ombro - .02, W.pesc * 2.1, W.pesc * 2.2], [Y.ombro + .04, W.pesc * 1.9, W.pesc * 2.0], [Y.ombro + .08, W.pesc * 1.5, W.pesc * 1.6]], verm, { seg: 14, deform: (x, y, z, j, u, ang) => [x * (1 + .08 * Math.sin(ang * 7)), y, z * (1 + .08 * Math.sin(ang * 7))] });
        casca(F, corpo, [[Y.peito + .0, W.p * .45, W.dP * 1.36, .012], [Y.ombro - .01, W.pesc * 2.2, W.dP * 1.25, .012]], verm, { arcoY: (y, j) => j ? [-.6, 1.2] : [-.08, .16], seg: 8 });
        // couraça de bronze gravada com placas no abdome
        const bronze = texDe(F, 'bronze', () => {
          const [c, x] = NS.tela(256, 256), r = NS.rng(71);
          x.fillStyle = '#7a5428'; x.fillRect(0, 0, 256, 256);
          for (let i = 0; i < 2000; i++) { x.fillStyle = r() < .5 ? `rgba(0,0,0,${.15 * r()})` : `rgba(255,220,150,${.1 * r()})`; x.fillRect(r() * 256, r() * 256, 2, 2); }
          x.strokeStyle = 'rgba(40,22,6,.7)'; x.lineWidth = 2;
          for (let i = 0; i < 26; i++) { const px = r() * 256, py = r() * 256, rr = 6 + r() * 14; x.beginPath(); x.arc(px, py, rr, r() * 6, r() * 6 + 3); x.stroke(); x.beginPath(); x.arc(px + rr * .5, py, rr * .5, 0, 4); x.stroke(); }
          x.strokeStyle = 'rgba(255,215,140,.35)'; x.lineWidth = 1; for (let i = 0; i < 20; i++) { const px = r() * 256, py = r() * 256; x.beginPath(); x.arc(px, py, 4 + r() * 10, 0, 3); x.stroke(); }
          return fazTex(F, c, [2, 1]);
        });
        const bz = matTex(F, bronze, { me: .55, r: .42, e: '#1a0e00', ei: .3 });
        casca(F, corpo, [[Y.peito - .14, W.c * 1.12, W.dC * 1.3], [Y.peito - .04, W.p * 1.1, W.dP * 1.22, .01], [Y.peito + .05, W.p * 1.1, W.dP * 1.25, .015], [Y.ombro - .04, W.tO * 1.0, W.dP * 1.08], [Y.ombro + .02, W.tO * .72, W.dP * .8]], bz, { seg: 18 });
        for (let i = 0; i < 3; i++) { const y0 = Y.peito - .16 - i * .065; casca(F, corpo, [[y0 - .055, W.c * (1.12 + i * .01), W.dC * 1.26], [y0, W.c * 1.16, W.dC * 1.32]], bz, { seg: 16 }); }
        // capa esfarrapada sobre os ombros, aberta na frente, com dobras e barra rasgada
        const nA = 7;
        const pCapa = [[Y.tornozelo + .06, W.q * 2.3, W.dQ * 2.4, -.06], [Y.joelho, W.q * 1.95, W.dQ * 2.05, -.05], [Y.quadril, W.q * 1.6, W.dQ * 1.75, -.03], [Y.cintura, W.c * 1.75, W.dC * 1.9, -.02], [Y.peito, W.tO * 1.35, W.dP * 1.4], [Y.ombro + .01, W.tO * 1.18, W.dP * 1.15], [Y.ombro + .07, W.pesc * 2.3, W.pesc * 2.3]];
        const gCapa = casca(F, corpo, pCapa, mt('#1c2438', { r: .95 }), { seg: 26, abertura: 1.25, deform: pano(.09, 9, .16, 2, nA) });
        const fC = new T.Mesh(gCapa.geometry, m('#0d1220', { r: 1, lado: 1 })); corpo.add(fC);
        // capinha curta por cima dos ombros, presa ao capuz
        const pCap = [[Y.peito - .1, W.tO * 1.55, W.dP * 1.75], [Y.peito + .02, W.tO * 1.42, W.dP * 1.55], [Y.ombro + .01, W.tO * 1.25, W.dP * 1.3], [Y.ombro + .08, W.pesc * 2.5, W.pesc * 2.6]];
        const gCp = casca(F, corpo, pCap, mt('#222b44', { r: .95 }), { seg: 24, abertura: .7, deform: pano(.07, 11, .09, 5, 4) });
        const fCp = new T.Mesh(gCp.geometry, m('#0d1220', { r: 1, lado: 1 })); corpo.add(fCp);
        // tubo de respiração: da boca da máscara até a couraça, sanfonado
        const rib = texDe(F, 'sanfona', () => { const [c, x] = NS.tela(32, 128); x.fillStyle = '#8a7448'; x.fillRect(0, 0, 32, 128); for (let y = 0; y < 128; y += 8) { x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, y, 32, 3); x.fillStyle = 'rgba(255,230,170,.35)'; x.fillRect(0, y + 4, 32, 1); } return fazTex(F, c, [1, 8]); });
        const yc = cab.position.y;
        tuboAfilado(F, corpo, [[-.012, yc - R * .62, R * .92 + .02], [-.05, yc - R * 1.1, R * 1.05 + .03], [-.09, Y.ombro, W.dP * 1.25], [-.12, Y.peito - .02, W.dP * 1.45], [-.1, Y.peito - .1, W.dP * 1.3]], t => .016, matTex(F, rib, { me: .5, r: .4 }), { seg: 26, rad: 7 });
        // revólver longo erguido na mão direita
        posar(bracos[0], [-W.ombro * 1.25, Y.ombro + .02, .16], [-.5, -1, -.1]);
        const arma = G(); arma.position.set(0, -.06, .0); bracos[0].mao.add(arma);
        const ferro = m('#4a3e32', { me: .7, r: .35 }), madeira = mt('#4a2a18', { r: .55 }), lat = m('#8a6a3a', { me: .7, r: .35 });
        F.bx(arma, .03, .09, .05, madeira, 0, -.05, -.005).rotation.x = .25;
        const cil = F.cy(arma, .026, .026, .06, ferro, 0, .035, .03, 8); cil.rotation.x = 0;
        const cano = F.cy(arma, .012, .014, .36, ferro, 0, .06, .03, 8);
        F.cy(arma, .016, .016, .03, lat, 0, .055, .03, 8); F.cy(arma, .014, .014, .02, lat, 0, .4, .03, 8);
        F.bx(arma, .012, .03, .02, ferro, 0, .02, -.018);
        alinhar(F, arma, -.1, 0, .06);
        bracos[1].braco.rotation.z = .12;
      } }),
    // Mostarda: o amálgama. Da cintura para cima, o homem de sempre (cabeça enfaixada, colete SWAT, camisa
    // manchada); da cintura para baixo, um escorpião de sangue: carapaça vermelha molhada, oito patas,
    // pinças no lugar das mãos e a cauda arqueada sobre a cabeça, pingando
    mostarda: F => escorpiao(F),
    // Papelão: alto e magro, cabeça enfaixada cinza com olhos amarelos acesos, sobretudo longo rasgado de gola
    // alta, faixas cruzadas no peito com fivelas douradas, antebraços e mãos enfaixados em garra, botas pretas
    papelao: F => humano(F, { alt: 1.92, porte: .95, pele: '#8a8a82', camisa: '#2e2e30', calca: '#2a2a2c', sapato: '#121212', bota: true, manga: '#4f5153',
      rosto: { bandagem: '#8f8d84', olhoFresta: 'rgba(255,215,70,.95)', sem: 3, sujaSangue: true }, cabelo: { tipo: 'nenhum' }, semNariz: true, semOrelhas: true, maoGrande: 1.25,
      pescocoMat: matTex(F, bandagemTex(F, '#86847a', 21), { r: .95 }), maos: '#86847a', semPunho: true,
      anteMat: () => matTex(F, bandagemTex(F, '#86847a', 22), { r: .95 }), canelaMat: matTex(F, bandagemTex(F, '#7a786e', 23), { r: .95 }),
      extras: ({ F, corpo, cab, bracos, pernas, Y, W, R, szC, s, mt }) => {
        const { G, T } = F, m = (c, o) => M(F, c, o);
        const olho = m('#ffd84a', { e: '#ffc21a', ei: 2.4 });
        [-1, 1].forEach(k => { const o2 = F.sf(cab, R * .1, olho, k * R * .33, -R * .02, R * szC * .93, 8); o2.scale.set(1.3, .7, .6); });
        // faixas cruzadas no peito com fivelas
        const faixa = mt('#6e6a5e', { r: .9 }), ouro = m('#c9a227', { me: .85, r: .3 });
        for (let i = 0; i < 4; i++) {
          const y0 = Y.peito - .2 + i * .1, sg = i % 2 ? 1 : -1;
          casca(F, corpo, [[y0 - .022, W.p * 1.06, W.dP * 1.1], [y0 + .022, W.p * 1.06, W.dP * 1.1]], faixa, { seg: 16, deform: (x, y, z) => [x, y + x * sg * .5, z] });
          F.bx(corpo, .045, .045, .015, ouro, sg * .05, y0 - .02 + sg * .025, W.dP * 1.12);
        }
        // avental de pano cinza pendurado na frente
        const av = casca(F, corpo, [[Y.joelho + .05, W.q * 1.2, W.dQ * 1.35], [Y.quadril, W.q * 1.12, W.dQ * 1.2], [Y.cintura, W.c * 1.12, W.dC * 1.2]], mt('#5c5a54', { r: .95, lado: 2 }), { arco: [-.9, 1.8], seg: 10, deform: pano(.06, 5, .12, 7, 3) });
        // sobretudo longo, aberto na frente, com barra rasgada
        const cTex = tecidoTex(F, '#55575a', { sem: 4, rasgado: 18, sujeira: 10, dobras: true });
        const casaco = matTex(F, cTex, { r: .95 });
        const nA = 8;
        const pC = [[Y.tornozelo + .12, W.q * 2.0, W.dQ * 1.9, -.03], [Y.joelho, W.q * 1.7, W.dQ * 1.62, -.02], [Y.quadril, W.q * 1.32, W.dQ * 1.35], [Y.cintura, W.c * 1.3, W.dC * 1.38], [Y.peito, W.p * 1.24, W.dP * 1.25, .01], [Y.ombro - .03, W.tO * 1.18, W.dP * 1.12], [Y.ombro + .02, W.tO * .98, W.dP * .95], [Y.ombro + .05, W.tO * .55, W.dP * .65]];
        const sob = casca(F, corpo, pC, casaco, { seg: 26, arcoY: (y, j) => { const a = j >= 4 ? .95 - (j - 4) * .12 : .55 + j * .1; return [a / 2, Math.PI * 2 - a]; }, deform: pano(.06, 7, .2, 9, nA) });
        const dentro = new T.Mesh(sob.geometry, m('#24252a', { r: 1, lado: 1 })); corpo.add(dentro);
        // gola alta virada e lapelas
        const gola = casca(F, corpo, [[Y.ombro + .03, W.tO * .72, W.dP * .9], [Y.ombro + .14, W.tO * .85, W.dP * 1.05, -.02]], m('#ffffff', { unico: true, mapa: cTex, r: .95, lado: 2 }), { arco: [.6, Math.PI * 2 - 1.2], seg: 16, deform: pano(.05, 6, .03, 3, 2) });
        [-1, 1].forEach(k => casca(F, corpo, [[Y.peito - .1, W.p * 1.27, W.dP * 1.3, .012], [Y.ombro - .02, W.tO * 1.2, W.dP * 1.16, .015]], casaco, { arcoY: (y, j) => j ? (k > 0 ? [.5, .55] : [-1.05, .55]) : (k > 0 ? [.48, .12] : [-.6, .12]), seg: 5 }));
        // ombreiras azul-marinho
        [-1, 1].forEach(k => { const o3 = F.sf(corpo, W.braco * 1.35, mt('#272d55', { r: .8 }), k * W.ombro, Y.ombro + .0, 0, 10); o3.scale.set(1.15, .55, 1.25); });
        // mangas do sobretudo até o meio do antebraço, largas
        bracos.forEach(b => {
          casca(F, b.braco, [[-b.Lb - .02, W.braco * 1.75, W.braco * 1.75], [-b.Lb * .5, W.braco * 1.55, W.braco * 1.55], [W.braco * .5, W.braco * 1.4, W.braco * 1.4]], casaco, { seg: 12 });
          casca(F, b.cot, [[-b.La * .45, W.ante * 2.2, W.ante * 2.2], [-b.La * .2, W.ante * 1.9, W.ante * 1.9], [W.ante * .3, W.ante * 1.7, W.ante * 1.7]], m('#ffffff', { unico: true, mapa: cTex, r: .95, lado: 2 }), { seg: 12, deform: pano(.08, 5, .05, 4, 3) });
          // garras: dedos compridos enfaixados
          const e = 1.25 * s, dm = mt('#7a786e', { r: .9 });
          for (let d = 0; d < 4; d++) tuboAfilado(F, b.mao, [[0, -.07 * e, (-.015 + d * .012) * e], [b.k * -.01 * e, -.12 * e, (-.02 + d * .014) * e], [b.k * -.025 * e, -.15 * e, (-.01 + d * .016) * e]], t => .008 * e * (1 - t * .7), dm, { seg: 6, rad: 4 });
        });
        bracos.forEach(b => { b.braco.rotation.z = b.k * .2; });
        // tiras rasgadas penduradas

      } }),
    // Papel: tranças grossas, brincos de argola, pele escura; terno preto com camisa branca e, por cima, um jaleco
    // branco até o joelho, aberto, com lapelas, bolsos e o bordado do nome no peito todo riscado; mãos nos bolsos
    papel: F => humano(F, { alt: 1.7, sexo: 'f', pele: '#5a3a2a', camisa: '#121214', calca: '#111113', sapato: '#0c0c0c', manga: '#f0efea', giroCabeca: .05,
      rosto: { pele: '#5a3a2a', iris: '#2a1a10', irisClara: '#5a3a20', sobrancelha: '#140c08', boca: 'seria', labio: '#3a2018', labioInf: '#4e2c22' }, cabelo: { tipo: 'trancas', cor: '#140e0b', comp: .52 }, brincos: true, narizMat: null,
      gola: 'camisa', corGola: '#f4f4f0',
      extras: ({ F, corpo, bracos, Y, W, s, mt, posar }) => {
        const { T } = F, m = (c, o) => M(F, c, o);
        const branco = matTex(F, tecidoTex(F, '#efeee9', { sem: 81, costuras: [.25, .5, .75], corCostura: 'rgba(0,0,0,.2)', dobras: true, sujeira: 3 }), { r: .85 }), brancoDentro = m('#d8d6d0', { r: .9, lado: 1 });
        // camisa branca aparecendo no decote do blazer e lapelas pretas do blazer
        casca(F, corpo, [[Y.peito - .1, W.p * .15, W.dP * 1.04, .008], [Y.peito, W.p * .5, W.dP * 1.06, .016], [Y.ombro - .02, W.tO * .7, W.dP * .98, .01], [Y.ombro + .02, W.pesc * 1.5, W.dP * .8]], mt('#f4f4f0', { r: .7 }), { arco: [-.45, .9], seg: 8 });
        [-1, 1].forEach(k => casca(F, corpo, [[Y.peito - .1, W.p * 1.01, W.dP * 1.07, .008], [Y.ombro - .03, W.tO * .95, W.dP * 1.0, .012]], mt('#0c0c0e', { r: .6 }), { arcoY: (y, j) => j ? (k > 0 ? [.18, .38] : [-.56, .38]) : (k > 0 ? [.07, .1] : [-.17, .1]), seg: 4 }));
        // jaleco branco até o joelho, aberto na frente
        const pJ = [[Y.joelho + .03, W.q * 1.32, W.dQ * 1.42, -.01], [Y.quadril - .05, W.q * 1.2, W.dQ * 1.28], [Y.cintura, W.c * 1.26, W.dC * 1.36], [Y.peito, W.p * 1.15, W.dP * 1.18, .014], [Y.ombro - .045, W.tO * 1.22, W.dP * 1.08], [Y.ombro + .015, W.tO * 1.02, W.dP * .9], [Y.ombro + .035, W.tO * .58, W.dP * .64], [Y.ombro + .055, W.pesc * 1.5, W.pesc * 1.45]];
        const jal = casca(F, corpo, pJ, branco, { seg: 26, arcoY: (y, j) => { const a = j >= 4 ? 1.0 - (j - 4) * .2 : .62 + j * .04; return [a / 2, Math.PI * 2 - a]; }, deform: pano(.025, 6, .015, 1, 8) });
        const jd = new T.Mesh(jal.geometry, brancoDentro); corpo.add(jd);
        // lapelas do jaleco (largas no peito, afinando até a cintura)
        [-1, 1].forEach(k => casca(F, corpo, [[Y.peito - .14, W.c * 1.27, W.dC * 1.38, .006], [Y.peito, W.p * 1.18, W.dP * 1.22, .02], [Y.ombro - .03, W.tO * 1.12, W.dP * 1.06, .01]],
          mt('#e2e1da', { r: .8 }), { arcoY: (y, j) => { const w = [.08, .5, .42][j], a = [.34, .44, .5][j]; return k > 0 ? [a, w] : [-a - w, w]; }, seg: 5 }));
        // gola do jaleco por trás do pescoço
        casca(F, corpo, [[Y.ombro + .02, W.tO * .66, W.dP * .76], [Y.ombro + .045, W.tO * .82, W.dP * .95, -.016]], m('#e8e7e1', { r: .85, lado: 2 }), { arco: [.9, Math.PI * 2 - 1.8], seg: 12 });
        // bolsos: dois na altura do quadril e um no peito esquerdo
        const bolsoArco = (yb, yt, a0, aw, esc) => casca(F, corpo, [[yb, ...esc(yb)], [yt, ...esc(yt)]], mt('#e8e7e1', { r: .85 }), { arco: [a0, aw], seg: 5 });
        const escQ = y => { const t = (y - (Y.quadril - .05)) / (Y.cintura - (Y.quadril - .05)); return [W.q * 1.2 + (W.c * 1.26 - W.q * 1.2) * t + .006, W.dQ * 1.28 + (W.dC * 1.36 - W.dQ * 1.28) * t + .008]; };
        [-1, 1].forEach(k => bolsoArco(Y.quadril - .1, Y.quadril + .03, k > 0 ? .55 : -1.15, .6, escQ));
        const escP = y => [W.p * 1.15 + .005, W.dP * 1.18 + .02];
        bolsoArco(Y.peito - .1, Y.peito - .035, .62, .38, escP);
        [0, 1].forEach(i => F.cy(corpo, .005, .005, .05, m(i ? '#1a3a8a' : '#222', { r: .4 }), Math.sin(.75 + i * .1) * (W.p * 1.15 + .02), Y.peito - .06, Math.cos(.75 + i * .1) * (W.dP * 1.18 + .02) + .014, 6));
        // bordado do nome no peito, rasurado (ilegível e riscado por cima)
        const etiq = texDe(F, 'bordado', () => {
          const [c, x] = NS.tela(320, 128), r = NS.rng(97);
          x.fillStyle = '#f4f3ee'; x.fillRect(0, 0, 320, 128);
          x.strokeStyle = '#2a4aa0'; x.lineWidth = 3; x.setLineDash([5, 3]); x.strokeRect(8, 8, 304, 112); x.setLineDash([]);
          x.strokeStyle = '#1f3c8c'; x.lineWidth = 5; x.lineCap = 'round'; x.lineJoin = 'round';
          let px = 30; x.beginPath(); x.moveTo(px, 72);
          while (px < 290) { const h = 18 + r() * 26; x.quadraticCurveTo(px + 6, 72 - h, px + 12, 70); x.quadraticCurveTo(px + 15, 82, px + 20 + r() * 6, 68 - r() * 8); px += 20 + r() * 8; }
          x.stroke();
          x.strokeStyle = '#0a0a0a'; x.lineWidth = 9;
          for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(18, 40 + i * 16 + r() * 6); for (let k = 0; k < 9; k++) x.lineTo(18 + (k + 1) * 33, 34 + i * 16 + (k % 2 ? 18 : 0) + r() * 6); x.stroke(); }
          x.lineWidth = 4; x.beginPath(); for (let k = 0; k < 40; k++) x.lineTo(30 + r() * 260, 30 + r() * 70); x.stroke();
          return fazTex(F, c);
        });
        casca(F, corpo, [[Y.peito - .012, W.p * 1.15 + .009, W.dP * 1.18 + .02 + .007], [Y.peito + .046, W.p * 1.14 + .009, W.dP * 1.16 + .02 + .007]], matTex(F, etiq, { r: .8 }), { arco: [.5, .66], seg: 6 });
        // mangas do jaleco com punho e mãos enfiadas nos bolsos
        bracos.forEach(b => posar(b, [b.k * (W.q * 1.22), Y.quadril - .02, W.dQ * .7], [b.k * .5, 0, -1]));
        bracos.forEach(b => { b.mao.visible = false; });
      } }),
    // Luva: macacão laranja de presídio sujo de sangue (camiseta e calça), cinto preto, tênis brancos, cabelo
    // bagunçado, barba por fazer, olho roxo, corte na testa e sorriso de dentes amarelos
    luva: F => humano(F, { alt: 1.84, porte: 1.06, pele: '#d9a88a', camisaTex: tecidoTex(F, '#ef6a14', { sem: 21, sangue: 14, dobras: true, sujeira: 6 }),
      calcaTex: tecidoTex(F, '#e8650f', { sem: 22, sangue: 18, dobras: true, costuras: [.25, .75], sujeira: 6 }), mangaCurta: true, gola: 'redonda',
      sapato: '#eeeeea', sola: '#cfcfca', cinto: '#141414', fivela: '#c8c8c0', bocaLarga: 1.05,
      anteMat: () => null,
      rosto: { hematoma: true, boca: 'dentes', barba: true, iris: '#4a5a6a', irisClara: '#8a9aa8', bravo: true, sobrancelha: '#3a2618', sangue: 5, olhoVermelho: true }, cabelo: { tipo: 'baguncado', cor: '#5a3a22' },
      extras: ({ F, bracos, pernas, Y, W, mt }) => {
        const m = (c, o) => M(F, c, o);
        // braços arranhados e sujos de sangue
        const pb = matTex(F, tecidoTex(F, '#d9a88a', { sem: 31, sangue: 20, borrao: 6, sujeira: 8 }), { r: .6 });
        bracos.forEach(b => { b.cot.children[0].material = pb; });
        // cadarços do tênis
        pernas.forEach(p => { for (let i = 0; i < 3; i++) F.bx(p.pe, .04, .006, .008, m('#bdbdb5'), 0, -Y.tornozelo + .07 - i * .012, .05 + i * .025); });
        bracos.forEach(b => { b.braco.rotation.z = b.k * .12; });
      } }),
    // Velcro: menina de uns sete anos. Cabelo preto comprido e liso com franja, vestido escuro estampado,
    // rosto pálido, olhos laranja arregalados e um sorriso largo demais; mãos para trás, nas costas
    velcro: F => humano(F, { alt: 1.2, crianca: true, sexo: 'f', pele: '#ecd8c8', camisaTex: tecidoTex(F, '#262427', { sem: 31, estampa: 'fantasmas', dobras: true, rep: [2, 1] }), calca: '#262427',
      coxaMat: M(F, '#ecd8c8', { r: .62 }), canelaMat: M(F, '#1b1a1d', { r: .7 }), sapato: '#141214', sola: '#0a0a0a', bracosFixos: true, giroCabeca: .1, semNariz: true,
      anteMat: () => M(F, '#ecd8c8', { r: .62 }), semPunho: true,
      rosto: { v1: true, olhosGrandes: true, iris: '#d9781c', pupilaPequena: true, boca: 'sorriso_largo', sobrancelha: '#1a1210', olheiras: true }, cabelo: { tipo: 'franja_longa', cor: '#151214', comp: .4 },
      extras: ({ F, corpo, cab, bracos, Y, W, s, mt, posar }) => {
        const m = (c, o) => M(F, c, o);
        const vestL = matTex(F, tecidoTex(F, '#262427', { sem: 32, estampa: 'fantasmas', dobras: true, rep: [4, 2] }), { r: .9, lado: 2 });
        // saia longa e rodada, com pregas, até perto do tornozelo
        casca(F, corpo, [[Y.tornozelo + .09, W.q * 2.0, W.dQ * 2.1], [(Y.joelho + Y.tornozelo) / 2 + .05, W.q * 1.75, W.dQ * 1.85], [Y.quadril, W.q * 1.25, W.dQ * 1.35], [Y.cintura - .02, W.c * 1.06, W.dC * 1.08]], vestL, { seg: 24, deform: pano(.08, 10, .015, 0, 4) });
        // gola redonda mais clara
        const gola = new F.T.Mesh(F.guardar(new F.T.TorusGeometry(W.pesc * 1.5, .012, 6, 18)), mt('#3c393e')); gola.rotation.x = Math.PI / 2 - .25; gola.position.set(0, Y.ombro + .035, .006); gola.scale.set(1, 1.15, 1); corpo.add(gola);
        // mangas largas e soltas até o cotovelo
        bracos.forEach(b => casca(F, b.braco, [[-b.Lb * 1.02, W.braco * 1.55, W.braco * 1.55], [-b.Lb * .5, W.braco * 1.4, W.braco * 1.4], [W.braco * .3, W.braco * 1.22, W.braco * 1.22]], vestL, { seg: 12, deform: pano(.08, 5, .02, 1, 3) }));
        // mãos para trás, juntas na lombar
        bracos.forEach(b => posar(b, [b.k * .018, Y.cintura - .1, -W.dC * 1.5], [b.k * 1, -.2, -.4]));
      },
      anim: (dt, t, andando, p) => {
        // parada, balança devagar e inclina a cabeça de um jeito estranho
        if (!andando) { p.corpo.rotation.z = Math.sin(t * .9) * .025; p.cab.rotation.z = Math.sin(t * .45) * .12 + .05; }
        else { p.corpo.rotation.z *= .9; p.cab.rotation.z *= .9; }
      } }),
  };

  /* ================= robôs S.T.A.F.F. ================= */
  // torso: 'branco' (cerâmica com detalhes na cor), 'cor' (pintado na cor), 'v' (branco com V na cor)
  const ROBOS = {
    c2p0: { cor: '#c99a32', nome: 'C2P0', torso: 'branco', botao: '#e8b83a', base: 'cor', antebraco: 'cor', braco: 'branco', ombro: 'cor' },
    b00bies: { cor: '#2c2d31', nome: 'B00BIES', torso: 'branco', botao: '#b9bec4', base: 'cor', antebraco: 'cor', braco: 'cor', ombro: 'branco', metalBotao: true },
    m3rl1n: { cor: '#b52a22', nome: 'M3RL1N', torso: 'cor', botao: '#e8b030', base: 'preto', antebraco: 'cor', braco: 'cor', ombro: 'cor' },
    k4iser: { cor: '#c42a24', nome: 'K4ISER', torso: 'v', botao: '#ffb000', base: 'preto', antebraco: 'cor', braco: 'cor', ombro: 'branco', olhos: '#ffb000' },
  };
  // cerâmica gasta: rachaduras, sujeira, linhas de painel e rebites; desenho(x, N) pinta a cor do robô por cima
  function ceramicaTex(F, chave, base, desenho, w = 512, h = 256) {
    return texDe(F, 'cer' + chave, () => {
      const [c, x] = NS.tela(w, h), r = NS.rng(chave.length * 17 + 5);
      x.fillStyle = base; x.fillRect(0, 0, w, h);
      if (desenho) desenho(x, w, h);
      for (let i = 0; i < 2600; i++) { x.fillStyle = r() < .6 ? `rgba(0,0,0,${.06 * r()})` : `rgba(255,255,255,${.06 * r()})`; x.fillRect(r() * w, r() * h, 2, 2); }
      x.strokeStyle = 'rgba(60,50,40,.35)'; x.lineWidth = 1;
      for (let i = 0; i < 14; i++) { let px = r() * w, py = r() * h; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (r() - .5) * 26; py += (r() - .5) * 26; x.lineTo(px, py); } x.stroke(); }
      for (let i = 0; i < 10; i++) { x.fillStyle = `rgba(40,30,20,${.05 + r() * .08})`; elipse(x, r() * w, r() * h, 8 + r() * 30, 5 + r() * 16, r() * 3); x.fill(); }
      return fazTex(F, c);
    });
  }
  function robo(F, id, s) {
    const T = F.T, { G, bx, cy, sf } = F, m = (c, o) => M(F, c, o), cfg = ROBOS[id] || { cor: s.cor || '#888', nome: (s.nome || id || '').toUpperCase(), torso: 'branco', botao: '#ffc12a', base: 'cor', antebraco: 'cor', braco: 'cor', ombro: 'cor' };
    const g = G();
    const cor = m(cfg.cor, { me: .45, r: .38 }), branco = m('#e6e2da', { r: .4 }), preto = m('#18181a', { r: .55, me: .2 }), borracha = m('#121212', { r: .9 });
    const corDe = q => q === 'branco' ? branco : q === 'preto' ? preto : cor;
    const linhas = (x, w, h, ys) => { x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2; ys.forEach(y => { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }); };
    const rebites = (x, pts) => pts.forEach(([a, b]) => { x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.arc(a, b, 3.5, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.arc(a - 1, b - 1, 1.4, 0, 7); x.fill(); });

    // ---------- base: carcaça arredondada com painel, placa do nome, rodas com pneus de garra e para-lamas ----------
    const corBase = cfg.base === 'preto' ? '#1c1c1f' : cfg.cor;
    const baseTex = ceramicaTex(F, 'base' + id, corBase, (x, w, h) => {
      // faixa de baixo branca (ou na cor), painel branco na frente, linhas de painel
      x.fillStyle = cfg.base === 'preto' ? '#e2ddd4' : '#e6e2da'; x.fillRect(0, h * .78, w, h * .22);
      if (id === 'k4iser' || id === 'm3rl1n') { x.fillStyle = cfg.cor; x.fillRect(0, h * .83, w, h * .07); }
      x.fillStyle = '#e6e2da'; x.beginPath(); x.moveTo(w * .35, h * .1); x.lineTo(w * .65, h * .1); x.lineTo(w * .62, h * .46); x.lineTo(w * .38, h * .46); x.fill();
      if (cfg.base === 'preto' && id === 'm3rl1n') { x.fillStyle = cfg.cor; x.fillRect(w * .37, h * .1, w * .26, h * .36); }
      linhas(x, w, h, [h * .06, h * .78]);
      x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2; [.18, .82].forEach(u => { x.beginPath(); x.moveTo(w * u, h * .06); x.lineTo(w * u, h * .78); x.stroke(); });
      rebites(x, [[w * .38, h * .12], [w * .62, h * .12], [w * .39, h * .32], [w * .61, h * .32], [w * .2, h * .7], [w * .8, h * .7], [w * .45, h * .92], [w * .55, h * .92]]);
    });
    const baseM = matTex(F, baseTex, { r: .45, me: cfg.base === 'preto' ? .2 : .4 });
    const pB = [[.08, .2, .17], [.12, .3, .26], [.2, .325, .28], [.44, .33, .28], [.52, .31, .26], [.58, .27, .22], [.62, .2, .17], [.63, .02, .02]];
    casca(F, g, pB, baseM, { seg: 28, quadrado: .6 });
    // placa com o nome, curva, na frente da carcaça
    const placa = matTex(F, F.textoTex(cfg.nome, { w: 512, h: 128, cor: '#f2f2f2', fundo: '#141416', tam: 74, fonte: 'Arial Black, Arial, sans-serif' }), { r: .5 });
    casca(F, g, [[.22, .338, .288], [.33, .337, .287]], placa, { arco: [-.62, 1.24], seg: 10, quadrado: .6 });
    // para-choque de baixo
    casca(F, g, [[.06, .31, .27], [.1, .335, .29], [.13, .33, .285]], branco, { seg: 24, quadrado: .6 });
    // rodas: pneu com garras (geometria) e calota pintada
    const calTex = texDe(F, 'calota' + id, () => {
      const [c, x] = NS.tela(128, 128); x.fillStyle = '#141414'; x.fillRect(0, 0, 128, 128);
      x.fillStyle = '#26262a'; x.beginPath(); x.arc(64, 64, 46, 0, 7); x.fill();
      x.fillStyle = cfg.cor; for (let i = 0; i < 4; i++) { x.save(); x.translate(64, 64); x.rotate(i * Math.PI / 2 + .3); x.beginPath(); x.moveTo(6, -8); x.quadraticCurveTo(40, -30, 42, 0); x.lineTo(8, 6); x.fill(); x.restore(); }
      x.fillStyle = '#9a9a9a'; x.beginPath(); x.arc(64, 64, 10, 0, 7); x.fill(); x.strokeStyle = '#0a0a0a'; x.lineWidth = 3; x.beginPath(); x.arc(64, 64, 46, 0, 7); x.stroke();
      return fazTex(F, c);
    });
    const pneuTex = texDe(F, 'pneu', () => { const [c, x] = NS.tela(256, 64); x.fillStyle = '#1a1a1a'; x.fillRect(0, 0, 256, 64); for (let i = 0; i < 256; i += 16) { x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(i, 4, 9, 56); x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(i + 9, 0, 3, 64); } return fazTex(F, c); });
    const pneuM = matTex(F, pneuTex, { r: .9 }), calM = matTex(F, calTex, { r: .5, me: .3 });
    const rodas = [];
    [-1, 1].forEach(sx => {
      const eixo = G(); eixo.position.set(sx * .4, .175, 0); g.add(eixo);
      const gp = new T.CylinderGeometry(.175, .175, .13, 32, 1);
      const pp = gp.attributes.position; const nLado = 2 * 33;
      for (let k = 0; k < nLado; k++) { const i = k % 33; const f = Math.floor(i / 2) % 2 ? 1 : .9; pp.setX(k, pp.getX(k) * f); pp.setZ(k, pp.getZ(k) * f); }
      gp.computeVertexNormals();
      const pn = new T.Mesh(F.guardar(gp), [pneuM, calM, calM]); pn.rotation.z = Math.PI / 2; eixo.add(pn);
      const cubo = cy(eixo, .05, .06, .03, cor, 0, 0, 0, 12); cubo.rotation.z = -sx * Math.PI / 2; cubo.position.set(sx * .075, 0, 0);
      rodas.push(eixo);
      // para-lama branco por cima da roda
      const pl = new T.Mesh(F.guardar(new T.CylinderGeometry(.205, .205, .15, 18, 1, true, .15, Math.PI - .3)), m(cfg.base === 'preto' && id !== 'k4iser' ? cfg.cor : '#e6e2da', { r: .42, lado: 2, me: cfg.base === 'preto' && id !== 'k4iser' ? .4 : 0 }));
      pl.rotation.z = Math.PI / 2; pl.position.set(sx * .4, .2, 0); g.add(pl);
    });


    // ---------- mola da cintura (uma hélice só) ----------
    const mola = G(); mola.position.y = .6; g.add(mola);
    const hel = []; for (let i = 0; i <= 90; i++) { const a = i / 90 * Math.PI * 2 * 6; hel.push([Math.cos(a) * .165, i / 90 * .26, Math.sin(a) * .165]); }
    tuboAfilado(F, mola, hel, () => .022, m('#1e1e20', { r: .35, me: .6 }), { seg: 144, rad: 5 });
    cy(mola, .12, .12, .28, m('#0c0c0d', { r: .8 }), 0, 0, 0, 14);

    // ---------- tronco de cerâmica com painéis, botões, anéis e ombreiras ----------
    const tronco = G(); tronco.position.y = .86; g.add(tronco);
    const baseTorso = cfg.torso === 'cor' ? cfg.cor : '#e6e2da';
    const torsoTex = ceramicaTex(F, 'tor' + id, baseTorso, (x, w, h) => {
      if (cfg.torso === 'v') { x.fillStyle = cfg.cor; x.beginPath(); x.moveTo(w * .4, 0); x.lineTo(w * .6, 0); x.lineTo(w * .53, h); x.lineTo(w * .47, h); x.fill(); x.fillRect(0, 0, w * .12, h); x.fillRect(w * .88, 0, w * .12, h); }
      if (cfg.torso === 'branco') { x.fillStyle = cfg.cor; x.fillRect(0, h * .9, w, h * .1); x.fillRect(w * .16, 0, w * .06, h); x.fillRect(w * .78, 0, w * .06, h); }
      if (cfg.torso === 'cor') { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(w * .16, 0, w * .06, h); x.fillRect(w * .78, 0, w * .06, h); }
      x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 2;
      [[.3, .2, .36, .62], [.64, .2, .7, .62]].forEach(([a, b, c2, d]) => { x.beginPath(); x.moveTo(w * a, h * b); x.lineTo(w * c2, h * d); x.stroke(); });
      linhas(x, w, h, [h * .12, h * .88]);
      rebites(x, [[w * .32, h * .8], [w * .68, h * .8], [w * .3, h * .2], [w * .7, h * .2], [w * .05, h * .5], [w * .95, h * .5]]);
    });
    const pT = [[-.02, .17, .14], [.03, .22, .17], [.14, .265, .19], [.28, .29, .2], [.36, .28, .19], [.42, .23, .16], [.46, .15, .12], [.48, .02, .02]];
    casca(F, tronco, pT, matTex(F, torsoTex, { r: .38, me: cfg.torso === 'cor' ? .35 : 0 }), { seg: 26, quadrado: .75 });
    const anel = r0 => { const t = new T.Mesh(F.guardar(new T.TorusGeometry(r0, .025, 8, 26)), preto); t.rotation.x = Math.PI / 2; t.scale.set(1, .78, 1); return t; };
    const a1 = anel(.18); a1.position.y = .0; tronco.add(a1);
    const a2 = anel(.12); a2.position.y = .46; tronco.add(a2);
    // três botões redondos com aro
    const bt = m(cfg.botao, { me: cfg.metalBotao ? .8 : .3, r: .3, e: cfg.olhos ? '#ff8a00' : '#000000', ei: cfg.olhos ? .9 : 0 });
    for (let i = 0; i < 3; i++) { const y0 = .14 + i * .085, z0 = .2 * Math.cos(0) * (1 - (y0 > .36 ? (y0 - .36) * 2 : 0)) + .012; const b = cy(tronco, .026, .03, .02, bt, 0, y0, z0, 14); b.rotation.x = Math.PI / 2 - .1; b.position.set(0, y0, z0); }
    // ombreiras (cúpulas) e braços segmentados com garra
    const ombM = corDe(cfg.ombro), braM = corDe(cfg.braco), antM = corDe(cfg.antebraco);
    const bracos = [-1, 1].map(sx => {
      const om = G(); om.position.set(sx * .3, .37, 0); om.scale.setScalar(1.2); tronco.add(om);
      const cup = calota(F, om, .1, ombM, Math.PI * .55, { seg: 14, segV: 6 }); cup.position.y = .02; cup.rotation.z = -sx * .3; cup.scale.set(1, .85, 1.1);
      sf(om, .055, preto, 0, 0, 0, 10);
      const b = G(); om.add(b); b.rotation.z = sx * .12;
      capsula(F, b, .046, .044, .16, braM, 10, 3);
      const ct = G(); ct.position.y = -.18; b.add(ct); ct.rotation.x = -.75;
      sf(ct, .048, preto, 0, 0, 0, 10);
      casca(F, ct, [[-.2, .058, .054], [-.15, .07, .064], [-.06, .062, .058], [-.02, .05, .048]], antM, { seg: 12, quadrado: .8 });
      casca(F, ct, [[-.215, .042, .042], [-.195, .046, .046]], preto, { seg: 10 });
      // mão: palma, três dedos de dois gomos e o polegar
      const mao = G(); mao.position.y = -.22; ct.add(mao);
      bx(mao, .07, .06, .045, preto, 0, -.06, 0);
      bx(mao, .074, .035, .05, antM, 0, -.045, .002);
      const dedos = [];
      for (let d = 0; d < 3; d++) { const dd = G(); dd.position.set((d - 1) * .024, -.06, .012); mao.add(dd); capsula(F, dd, .011, .01, .045, preto, 6, 2); const d2 = G(); d2.position.y = -.05; dd.add(d2); capsula(F, d2, .01, .008, .035, preto, 6, 2); d2.rotation.x = -.5; dd.rotation.x = -.3; dedos.push(dd); }
      const pol = G(); pol.position.set(-sx * .035, -.035, .02); mao.add(pol); capsula(F, pol, .011, .009, .04, preto, 6, 2); pol.rotation.set(-.6, 0, sx * .5);
      mao.rotation.y = -sx * .4;
      return { om, b, ct, dedos };
    });

    // ---------- cabeça de cerâmica, olhos grandes, bochechas, capacete e fones ----------
    cy(tronco, .06, .07, .1, preto, 0, .44, 0, 12);
    const cab = G(); cab.position.y = .7; tronco.add(cab);
    const rostoT = rostoRoboTex(F);
    const RH = .21;
    const cabeca = sf(cab, RH, matTex(F, rostoT, { r: .32 }), 0, 0, 0, 28); cabeca.scale.set(1, 1.02, .96);
    const ol = cfg.olhos;
    const olhoM = ol ? m('#2a1600', { r: .2, e: ol, ei: 1.6 }) : m('#050505', { r: .08, me: .3 });
    const brilhoM = m('#ffffff', { e: '#ffffff', ei: 1.2 });
    [-1, 1].forEach(sx => {
      const o2 = sf(cab, .055, olhoM, sx * .078, .015, RH * .8, 18); o2.scale.set(1, 1.05, .55);
      if (ol) { const aro = new T.Mesh(F.guardar(new T.TorusGeometry(.055, .01, 6, 18)), m('#1a1a1a', { r: .5 })); aro.position.set(sx * .078, .015, RH * .8 + .012); aro.rotation.y = sx * .35; cab.add(aro); }
      else { sf(cab, .013, brilhoM, sx * .078 - .018, .036, RH * .8 + .028, 6); sf(cab, .006, brilhoM, sx * .078 + .016, -.008, RH * .8 + .028, 6); }
    });
    // capacete na cor do robô (aberto na frente) e fones de ouvido
    const cap = calota(F, cab, RH * 1.06, cor, Math.PI * .66, { abertura: 2.0, seg: 24, segV: 10 }); cap.rotation.x = -.12;

    [-1, 1].forEach(sx => {
      const f = cy(cab, .085, .085, .07, cor, 0, 0, 0, 18); f.rotation.z = Math.PI / 2; f.position.set(sx * RH * 1.04, .01, -.01);

    });
    if (ol) F.luz(cab, ol, .25, 1.6, 0, .02, .35);
    const anim = (dt, t, andando) => {
      if (andando) rodas.forEach(r => { r.rotation.x += dt * 9; });
      mola.scale.y = 1 + Math.sin(t * (andando ? 14 : 2)) * (andando ? .08 : .03);
      tronco.position.y = .86 + (mola.scale.y - 1) * .26;
      cab.rotation.z = Math.sin(t * .7) * .12; cab.rotation.y = Math.sin(t * .4) * .25;
      bracos.forEach((b, i) => {
        b.om.rotation.x = andando ? Math.sin(t * 8 + i * Math.PI) * .35 : Math.sin(t * 1.3 + i) * .06;
        b.ct.rotation.x = -.75 + Math.sin(t * 1.1 + i * 2) * .08;
        const ab = .15 + Math.max(0, Math.sin(t * .9 + i * 1.7)) * .4; b.dedos.forEach(d => { d.rotation.x = -.3 - ab; });
      });
    };
    return { g, alt: 1.55, anim };
  }

  /* ================= NPCs (cobaias de outros ciclos): macacão laranja e a cor do token no braço ================= */
  function npc(F, s) {
    const proprio = NPCS[chaveNpc(s.id)];
    if (proprio) return proprio(F, s);
    return humano(F, { alt: 1.74, pele: '#cfa588', camisaTex: tecidoTex(F, '#d9661f', { sem: 61, ziper: .5, dobras: true, sujeira: 5 }), calcaTex: tecidoTex(F, '#cf5f1a', { sem: 62, costuras: [.25, .75], dobras: true, sujeira: 5 }),
      sapato: '#2a2a2a', gola: 'camisa', corGola: '#c95a1a', rosto: { iris: '#3a2a1a', irisClara: '#6a4a2a', sujeira: 3 }, cabelo: { tipo: 'baguncado', cor: '#2b1d14' },
      extras: ({ F, corpo, bracos, Y, W, mt }) => {
        // braçadeira com a cor do token e bolso no peito
        casca(F, bracos[0].braco, [[-.2, W.braco * 1.12, W.braco * 1.12], [-.13, W.braco * 1.14, W.braco * 1.14]], M(F, s.cor || '#888', { r: .5, e: s.cor || '#888', ei: .15 }), { seg: 12 });
        F.bx(corpo, .07, .07, .01, mt('#c35618'), .07, Y.peito - .04, W.dP * .98);
      } });
  }

  /* ================= texturas de pele e roupa dos NPCs ================= */
  // pele com rachaduras, veias, sangue e sujeira (braços, pernas, tronco nu)
  function peleTex(F, cor, sem, o = {}) {
    return texDe(F, 'pele' + cor + sem + JSON.stringify(o), () => {
      const [c, x] = NS.tela(256, 256), r = NS.rng(sem);
      x.fillStyle = cor; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) { x.fillStyle = r() < .5 ? `rgba(0,0,0,${.04 * r()})` : `rgba(255,255,255,${.035 * r()})`; x.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
      if (o.rachaduras) { x.lineWidth = .9; for (let i = 0; i < o.rachaduras; i++) { let px = r() * 256, py = r() * 256; x.strokeStyle = `rgba(90,30,20,${.35 + r() * .3})`; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (r() - .5) * 26; py += (r() - .5) * 26; x.lineTo(px, py); } x.stroke(); } }
      if (o.veias) { x.strokeStyle = 'rgba(70,80,120,.25)'; x.lineWidth = 1.2; for (let i = 0; i < 10; i++) { let px = r() * 256, py = r() * 256; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - .5) * 14; py += 6 + r() * 10; x.lineTo(px, py); } x.stroke(); } }
      if (o.sujeira) for (let i = 0; i < o.sujeira; i++) { x.fillStyle = `rgba(55,45,32,${.07 + r() * .12})`; elipse(x, r() * 256, r() * 256, 5 + r() * 20, 4 + r() * 14, r() * 3); x.fill(); }
      if (o.sangue) for (let i = 0; i < o.sangue; i++) {
        const px = r() * 256, py = r() * 256; x.fillStyle = `rgba(${110 + r() * 40},${8 + r() * 10},6,${.45 + r() * .4})`;
        elipse(x, px, py, 2 + r() * 7, 2 + r() * 9, r() * 3); x.fill();
        for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(px + (r() - .5) * 30, py + (r() - .5) * 30, .6 + r() * 1.8, 0, 7); x.fill(); }
        if (r() < .45) x.fillRect(px - 1, py, 2, 8 + r() * 20);
      }
      return fazTex(F, c, [1, 1]);
    });
  }
  // tronco nu musculoso (peitoral, abdome, dorsais, coluna), rachado e manchado de sangue
  function musculoTex(F, cor) {
    return texDe(F, 'musc' + cor, () => {
      const [c, x] = NS.tela(512, 256), r = NS.rng(77), fx = 256;
      x.fillStyle = cor; x.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 4000; i++) { x.fillStyle = r() < .5 ? `rgba(0,0,0,${.04 * r()})` : `rgba(255,255,255,${.035 * r()})`; x.fillRect(r() * 512, r() * 256, 1.5, 1.5); }
      const sombra = a => `rgba(60,30,15,${a})`, luz = a => `rgba(255,235,210,${a})`;
      // peitorais
      [-1, 1].forEach(s => {
        let g = x.createRadialGradient(fx + s * 34, 70, 4, fx + s * 34, 74, 46); g.addColorStop(0, luz(.18)); g.addColorStop(.7, 'rgba(0,0,0,0)'); g.addColorStop(1, sombra(.0));
        x.fillStyle = g; elipse(x, fx + s * 34, 74, 46, 32); x.fill();
        x.strokeStyle = sombra(.55); x.lineWidth = 3; x.beginPath(); x.moveTo(fx + s * 4, 54); x.quadraticCurveTo(fx + s * 30, 112, fx + s * 78, 84); x.stroke();
        // dorsais e serrátil
        for (let k = 0; k < 3; k++) { x.strokeStyle = sombra(.35); x.lineWidth = 2; x.beginPath(); x.moveTo(fx + s * (58 + k * 6), 112 + k * 16); x.lineTo(fx + s * (74 + k * 6), 104 + k * 16); x.stroke(); }
        x.fillStyle = sombra(.22); elipse(x, fx + s * 96, 130, 22, 70); x.fill();
      });
      x.strokeStyle = sombra(.5); x.lineWidth = 2.5; x.beginPath(); x.moveTo(fx, 40); x.lineTo(fx, 250); x.stroke();
      // abdome em gomos
      for (let j = 0; j < 4; j++) [-1, 1].forEach(s => {
        const gx = fx + s * 16, gy = 128 + j * 30;
        const g = x.createRadialGradient(gx - s * 2, gy - 4, 2, gx, gy, 16); g.addColorStop(0, luz(.2)); g.addColorStop(1, sombra(.25));
        x.fillStyle = g; elipse(x, gx, gy, 13, 12); x.fill();
      });
      for (let j = 0; j < 4; j++) { x.strokeStyle = sombra(.45); x.lineWidth = 2; x.beginPath(); x.moveTo(fx - 30, 142 + j * 30); x.lineTo(fx + 30, 142 + j * 30); x.stroke(); }
      // costas: coluna e escápulas
      [0, 512].forEach(bx0 => { x.strokeStyle = sombra(.45); x.lineWidth = 3; x.beginPath(); x.moveTo(bx0, 20); x.lineTo(bx0, 256); x.stroke(); [-1, 1].forEach(s => { x.fillStyle = sombra(.25); elipse(x, bx0 + s * 46, 70, 26, 34, s * .3); x.fill(); }); });
      // rachaduras e veias
      x.lineWidth = 1; for (let i = 0; i < 40; i++) { let px = r() * 512, py = r() * 256; x.strokeStyle = `rgba(100,35,20,${.3 + r() * .3})`; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (r() - .5) * 26; py += (r() - .5) * 26; x.lineTo(px, py); } x.stroke(); }
      for (let i = 0; i < 20; i++) { const px = r() * 512, py = r() * 256; x.fillStyle = `rgba(${120 + r() * 40},8,6,${.5 + r() * .4})`; elipse(x, px, py, 2 + r() * 6, 2 + r() * 8, r() * 3); x.fill(); if (r() < .5) x.fillRect(px - 1, py, 2, 10 + r() * 24); }
      return fazTex(F, c);
    });
  }
  // tronco magro com costelas, clavículas e esterno aparentes, sujo
  function costelaTex(F, cor) {
    return texDe(F, 'cost' + cor, () => {
      const [c, x] = NS.tela(512, 256), r = NS.rng(93), fx = 256;
      x.fillStyle = cor; x.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 4000; i++) { x.fillStyle = r() < .5 ? `rgba(0,0,0,${.05 * r()})` : `rgba(255,255,255,${.03 * r()})`; x.fillRect(r() * 512, r() * 256, 1.5, 1.5); }
      const somb = a => `rgba(40,36,40,${a})`, luz = a => `rgba(255,252,240,${a})`;
      [-1, 1].forEach(s => {
        x.strokeStyle = somb(.55); x.lineWidth = 3; x.beginPath(); x.moveTo(fx + s * 8, 30); x.quadraticCurveTo(fx + s * 40, 20, fx + s * 86, 32); x.stroke();
        x.strokeStyle = luz(.3); x.lineWidth = 2; x.beginPath(); x.moveTo(fx + s * 8, 25); x.quadraticCurveTo(fx + s * 40, 15, fx + s * 86, 27); x.stroke();
        for (let i = 0; i < 7; i++) { const y0 = 58 + i * 15; x.strokeStyle = somb(.45); x.lineWidth = 3.2; x.beginPath(); x.moveTo(fx + s * 10, y0); x.quadraticCurveTo(fx + s * 55, y0 + 4, fx + s * 112, y0 + 26); x.stroke(); x.strokeStyle = luz(.22); x.lineWidth = 2; x.beginPath(); x.moveTo(fx + s * 10, y0 + 6); x.quadraticCurveTo(fx + s * 55, y0 + 10, fx + s * 112, y0 + 32); x.stroke(); }
        x.fillStyle = somb(.3); elipse(x, fx + s * 30, 200, 34, 40); x.fill();
      });
      x.fillStyle = somb(.3); x.fillRect(fx - 4, 40, 8, 120);
      [0, 512].forEach(bx0 => { for (let y = 20; y < 256; y += 14) { x.fillStyle = somb(.35); elipse(x, bx0, y, 4, 4); x.fill(); x.fillStyle = luz(.25); elipse(x, bx0 - 1, y - 2, 3, 2); x.fill(); } [-1, 1].forEach(s => { x.fillStyle = somb(.3); elipse(x, bx0 + s * 44, 70, 22, 34, s * .3); x.fill(); }); });
      for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(55,45,32,${.08 + r() * .14})`; elipse(x, r() * 512, r() * 256, 6 + r() * 24, 4 + r() * 14, r() * 3); x.fill(); }
      return fazTex(F, c);
    });
  }
  // couro preto de bota com cadarço cruzado na frente
  function botaTex(F) {
    return texDe(F, 'bota', () => {
      const [c, x] = NS.tela(256, 256), r = NS.rng(101);
      x.fillStyle = '#161415'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(255,255,255,${.05 * r()})`; x.fillRect(r() * 256, r() * 256, 2, 1); }
      for (let y = 6; y < 250; y += 16) { x.fillStyle = '#8a8a8a'; [-1, 1].forEach(s => { x.beginPath(); x.arc(128 + s * 12, y, 2.4, 0, 7); x.fill(); }); x.strokeStyle = '#3a3a3a'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(116, y); x.lineTo(140, y + 16); x.moveTo(140, y); x.lineTo(116, y + 16); x.stroke(); }
      x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 1.5; for (let i = 0; i < 12; i++) { const y = r() * 256; x.beginPath(); x.moveTo(r() * 256, y); x.lineTo(r() * 256, y + (r() - .5) * 10); x.stroke(); }
      return fazTex(F, c);
    });
  }
  // corpete preto com laço no meio, costuras e manchas de sangue
  function corpeteTex(F) {
    return texDe(F, 'corpete', () => {
      const [c, x] = NS.tela(512, 128), r = NS.rng(103);
      x.fillStyle = '#141216'; x.fillRect(0, 0, 512, 128);
      for (let i = 0; i < 2000; i++) { x.fillStyle = `rgba(255,255,255,${.04 * r()})`; x.fillRect(r() * 512, r() * 128, 2, 1); }
      x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 1.5; [.38, .45, .55, .62, .25, .75].forEach(u => { x.beginPath(); x.moveTo(u * 512, 0); x.lineTo(u * 512, 128); x.stroke(); });
      for (let y = 8; y < 128; y += 14) { x.strokeStyle = '#555'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(248, y); x.lineTo(264, y + 14); x.moveTo(264, y); x.lineTo(248, y + 14); x.stroke(); }
      for (let i = 0; i < 10; i++) { x.fillStyle = `rgba(120,15,12,${.35 + r() * .3})`; elipse(x, r() * 512, r() * 128, 4 + r() * 12, 3 + r() * 8, r() * 3); x.fill(); }
      return fazTex(F, c);
    });
  }
  // cabelo com mechas de outra cor
  function cabeloMechaTex(F, cor, mecha) {
    return texDe(F, 'cabm' + cor + mecha, () => {
      const [c, x] = NS.tela(128, 128), r = NS.rng(7);
      x.fillStyle = cor; x.fillRect(0, 0, 128, 128);
      [[14, 26], [70, 80]].forEach(([a, b]) => { x.fillStyle = mecha; x.fillRect(a, 0, b - a, 128); });
      for (let i = 0; i < 260; i++) { const px = r() * 128; x.strokeStyle = r() < .55 ? `rgba(0,0,0,${.2 + r() * .3})` : `rgba(255,255,255,${.04 + r() * .06})`; x.lineWidth = .6 + r() * 1.2; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + (r() - .5) * 6, 40, px + (r() - .5) * 6, 90, px + (r() - .5) * 4, 128); x.stroke(); }
      return fazTex(F, c, [2, 1]);
    });
  }
  // cabeça lisa sem rosto, com só um leve volume
  function semRostoTex(F) {
    return texDe(F, 'semRosto', () => {
      const [c, x] = NS.tela(512, 256), cx = 128;
      x.fillStyle = '#ecebe8'; x.fillRect(0, 0, 512, 256);
      let g = x.createRadialGradient(cx - 10, 100, 4, cx, 128, 170); g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(70,70,80,.45)');
      x.fillStyle = g; x.fillRect(0, 0, 512, 256);
      [-1, 1].forEach(s => { g = x.createRadialGradient(cx + s * 22, 134, 2, cx + s * 22, 134, 20); g.addColorStop(0, 'rgba(90,90,100,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; elipse(x, cx + s * 22, 134, 20, 14); x.fill(); });
      g = x.createRadialGradient(cx, 200, 4, cx, 200, 50); g.addColorStop(0, 'rgba(80,80,90,.15)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; elipse(x, cx, 200, 50, 30); x.fill();
      return fazTex(F, c);
    });
  }
  // máscara de coelho: plástico branco gasto, furos dos olhos, focinho rosa, rachaduras e sangue
  function mascaraCoelhoTex(F) {
    return texDe(F, 'mascCoelho', () => {
      const [c, x] = NS.tela(256, 256), r = NS.rng(111);
      let g = x.createRadialGradient(128, 110, 10, 128, 130, 150); g.addColorStop(0, '#f2eee6'); g.addColorStop(.6, '#ddd6ca'); g.addColorStop(1, '#a89e8e');
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(80,70,60,${.06 * r()})`; x.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
      [-1, 1].forEach(s => {
        g = x.createRadialGradient(128 + s * 44, 122, 2, 128 + s * 44, 122, 26); g.addColorStop(0, '#000'); g.addColorStop(.7, '#0a0606'); g.addColorStop(1, 'rgba(60,40,30,0)');
        x.fillStyle = g; elipse(x, 128 + s * 44, 122, 25, 28, s * .2); x.fill();
      });
      x.fillStyle = '#d27e86'; x.beginPath(); x.moveTo(116, 176); x.lineTo(140, 176); x.lineTo(128, 190); x.fill();
      x.strokeStyle = 'rgba(70,50,40,.7)'; x.lineWidth = 2; x.beginPath(); x.moveTo(128, 190); x.lineTo(128, 210); x.moveTo(128, 210); x.quadraticCurveTo(116, 218, 108, 212); x.moveTo(128, 210); x.quadraticCurveTo(140, 218, 148, 212); x.stroke();
      x.lineWidth = 1; for (let i = 0; i < 18; i++) { let px = r() * 256, py = r() * 256; x.strokeStyle = `rgba(60,50,40,${.35 + r() * .35})`; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (r() - .5) * 22; py += (r() - .5) * 22; x.lineTo(px, py); } x.stroke(); }
      for (let i = 0; i < 26; i++) { const px = 60 + r() * 140, py = 30 + r() * 200; x.fillStyle = `rgba(${130 + r() * 40},10,10,${.55 + r() * .4})`; elipse(x, px, py, 1.5 + r() * 7, 1.5 + r() * 8, r() * 3); x.fill(); if (r() < .4) x.fillRect(px - 1.2, py, 2.4, 8 + r() * 26); }
      return fazTex(F, c);
    });
  }

  /* ================= NPCs com modelo próprio (s.id) ================= */
  const vetor = (F, a) => new F.T.Vector3(a[0], a[1], a[2]);
  const NPCS = {
    // Coelho: enorme e musculoso, sem camisa; máscara branca de coelho rachada e suja de sangue, orelhas compridas,
    // cabelo preto atrás, barba por fazer; pele rachada e com veias; calça cargo preta com cinto, corrente e coldre de
    // faca na coxa; luvas sem dedos com faixas no pulso; coturnos pretos
    coelho: (F, s) => humano(F, { alt: 1.95, porte: 1.12, forte: 1, pele: '#b5845e', camisaTex: musculoTex(F, '#b5845e'),
      mangaTex: peleTex(F, '#b5845e', 71, { rachaduras: 14, veias: true, sangue: 5 }), anteMat: () => matTex(F, peleTex(F, '#b5845e', 72, { rachaduras: 12, veias: true, sangue: 6 }), { r: .55 }),
      calcaTex: tecidoTex(F, '#1b1b1d', { sem: 73, costuras: [.25, .75], dobras: true, sujeira: 6 }), sapato: '#121212', sola: '#0a0a0a', bota: true, bocaLarga: 1.18,
      cinto: '#121212', fivela: '#b8b8b0', maos: '#151517', punhoMat: M(F, '#1c1c1e', { r: .75 }),
      rosto: { barba: true, iris: '#2a1a10', sangue: 6 }, cabelo: { tipo: 'curto', cor: '#141210', incl: -1.3 }, semNariz: true, giroCabeca: .08,
      extras: ({ F, corpo, cab, bracos, pernas, Y, W, R, sxC, szC, mt }) => {
        const { G, T } = F, m = (c, o) => M(F, c, o);
        const masc = matTex(F, mascaraCoelhoTex(F), { r: .5 });
        // máscara: uma casca na frente da cabeça, focinho e nariz
        const gm = G(); gm.scale.set(sxC, 1, szC); cab.add(gm);
        malha(F, gm, new T.SphereGeometry(R * 1.08, 20, 12, Math.PI / 2 - 1.25, 2.5, Math.PI * .08, Math.PI * .62), masc);
        const foc = F.sf(cab, R * .3, m('#e6e0d4', { r: .5 }), 0, -R * .3, R * szC * .95, 10); foc.scale.set(1.1, .75, .65);
        F.sf(cab, R * .07, m('#d27e86', { r: .4 }), 0, -R * .22, R * szC * 1.13, 8);
        // orelhas compridas (por fora branca, por dentro rosa)
        [-1, 1].forEach(k => {
          const o2 = G(); o2.position.set(k * R * .38, R * .8, -R * .1); o2.rotation.set(-.12, 0, -k * .14); cab.add(o2);
          casca(F, o2, [[0, .035, .016], [.08, .055, .02], [.22, .06, .02], [.34, .045, .016], [.42, .006, .006]], matTex(F, tecidoTex(F, '#e8e2d6', { sem: 115, sangue: 5 }), { r: .5 }), { seg: 10 });
          casca(F, o2, [[.04, .02, .006, .012], [.2, .036, .008, .014], [.34, .022, .006, .012], [.39, .004, .004, .01]], m('#d89aa0', { r: .6 }), { seg: 8, arco: [-1, 2] });
        });
        // faixas no pulso (duas voltas acima da luva)
        bracos.forEach(b => casca(F, b.cot, [[-b.La * .92, W.ante * 1.12, W.ante * 1.12], [-b.La * .72, W.ante * 1.15, W.ante * 1.15]], m('#202022', { r: .8 }), { seg: 10 }));
        bracos.forEach(b => { b.braco.rotation.z = b.k * .2; b.cot.rotation.x = -.25; });
        // corrente pendurada do cinto até o quadril
        const corr = texDe(F, 'corrente', () => { const [c, x] = NS.tela(32, 128); x.fillStyle = '#2a2a2a'; x.fillRect(0, 0, 32, 128); for (let y = 0; y < 128; y += 16) { x.strokeStyle = '#c8c8c8'; x.lineWidth = 4; elipse(x, 16, y + 8, 7, 7); x.stroke(); } return fazTex(F, c, [1, 10]); });
        tuboAfilado(F, corpo, [[W.c * .55, Y.cintura - .03, W.dC * 1.12], [W.q * .95, Y.quadril - .1, W.dQ * .9], [W.q * 1.12, Y.quadril - .06, 0], [W.c * 1.0, Y.cintura - .03, -W.dC * .7]], () => .007, matTex(F, corr, { me: .8, r: .3 }), { seg: 24, rad: 5 });
        // coldre na coxa direita com a faca, e bolso cargo na esquerda
        const [pd, pe] = pernas, Lc = Y.quadril - Y.joelho, preto = m('#141414', { r: .6 });
        [.3, .55].forEach(f => casca(F, pd.quad, [[-Lc * f - .015, W.coxa * 1.1, W.coxa * 1.1], [-Lc * f + .015, W.coxa * 1.1, W.coxa * 1.1]], preto, { seg: 10 }));
        F.bx(pd.quad, .045, .17, .08, preto, -W.coxa * 1.05, -Lc * .62, .01);
        F.bx(pd.quad, .028, .07, .03, m('#2a1e16', { r: .6 }), -W.coxa * 1.08, -Lc * .3, .01);
        F.bx(pd.quad, .008, .19, .03, m('#b8bcc2', { me: .85, r: .25 }), -W.coxa * 1.08, -Lc * .8, .01);
        F.bx(pe.quad, .035, .13, .11, matTex(F, tecidoTex(F, '#1b1b1d', { sem: 73, costuras: [.25, .75], dobras: true, sujeira: 6 }), { r: .85 }), W.coxa * 1.02, -Lc * .62, 0);
      } }),
    // Cara Pálida: alto e magro, um pouco curvado, braços compridos; cabeça lisa e branca sem rosto nenhum; terno
    // preto de três peças (paletó, colete com botões, camisa branca, gravata preta, lenço no bolso), luvas e sapatos
    // pretos; uma lâmina longa e escura na mão, arrastando atrás
    'cara-palida': (F, s) => humano(F, { alt: 2.0, porte: .86, bracoLongo: 1.1, pele: '#e8e6e2', camisaTex: tecidoTex(F, '#0e0e11', { sem: 81, dobras: true, costuras: [0, .5] }),
      calcaTex: tecidoTex(F, '#0d0d10', { sem: 82, dobras: true, costuras: [.25, .75] }), manga: '#101013', sapato: '#070707', sola: '#050505', maos: '#0c0c0e',
      cabecaMat: matTex(F, semRostoTex(F), { r: .22 }), escalaCabeca: [1, 1.12, 1.02], semNariz: true, semOrelhas: true, cabelo: { tipo: 'nenhum' }, giroCabeca: .12,
      gola: 'camisa', corGola: '#ecebe6',
      extras: ({ F, corpo, cab, bracos, Y, W, mt }) => {
        const { T } = F, m = (c, o) => M(F, c, o);
        corpo.rotation.x = .05; cab.rotation.x = .22;
        const preto = m('#121216', { r: .5 }), branco = m('#ecebe6', { r: .7 });
        // camisa branca no decote e gravata preta
        casca(F, corpo, [[Y.peito - .08, W.p * .15, W.dP * 1.04, .006], [Y.peito + .02, W.p * .45, W.dP * 1.05, .012], [Y.ombro - .02, W.tO * .66, W.dP * .98, .008], [Y.ombro + .02, W.pesc * 1.5, W.dP * .8]], branco, { arco: [-.42, .84], seg: 8 });
        tuboAfilado(F, corpo, [[0, Y.ombro + .015, W.dP * .9], [0, Y.ombro - .04, W.dP * 1.08], [0, Y.peito - .02, W.dP * 1.12], [0, Y.peito - .08, W.dP * 1.12]], t => .014 * (t < .1 ? 1.3 : 1 + t * .5), preto, { seg: 10, rad: 5 });
        // colete com quatro botões
        casca(F, corpo, [[Y.cintura - .1, W.c * 1.05, W.dC * 1.1, .006], [Y.cintura, W.c * 1.04, W.dC * 1.09, .006], [Y.peito - .04, W.p * 1.03, W.dP * 1.08, .01]], m('#16161b', { r: .55 }), { arco: [-.55, 1.1], seg: 8 });
        for (let i = 0; i < 4; i++) F.sf(corpo, .009, m('#2a2a30', { me: .5, r: .3 }), 0, Y.cintura - .07 + i * .06, W.dC * 1.12 + .012 + i * .006, 6);
        // lapelas do paletó, aba do paletó abaixo da cintura e lenço no bolso
        const pal = matTex(F, tecidoTex(F, '#0e0e11', { sem: 81, dobras: true, costuras: [0, .5] }), { r: .55 });
        [-1, 1].forEach(k => casca(F, corpo, [[Y.cintura - .02, W.c * 1.06, W.dC * 1.12, .008], [Y.peito, W.p * 1.03, W.dP * 1.08, .016], [Y.ombro - .03, W.tO * .96, W.dP * 1.0, .012]], m('#0a0a0c', { r: .4 }),
          { arcoY: (y, j) => { const w = [.06, .42, .36][j], a = [.5, .5, .42][j]; return k > 0 ? [a, w] : [-a - w, w]; }, seg: 5 }));
        casca(F, corpo, [[Y.quadril - .14, W.q * 1.14, W.dQ * 1.2], [Y.quadril, W.q * 1.06, W.dQ * 1.1], [Y.cintura + .01, W.c * 1.03, W.dC * 1.06]], pal, { abertura: .8, seg: 18 });
        F.bx(corpo, .04, .022, .008, branco, Math.sin(.85) * W.p * 1.03, Y.peito + .015, Math.cos(.85) * W.dP * 1.04 + .01).rotation.y = .85;
        // lâmina longa e escura na mão direita, arrastando para trás
        tuboAfilado(F, bracos[0].mao, [[0, -.05, .02], [0, -.35, -.04], [0, -.7, -.16], [0, -.92, -.34], [0, -1.0, -.5]], t => .016 * (1 - t * .85), m('#1a0a0c', { me: .6, r: .3 }), { seg: 18, rad: 5 });
      } }),
    // Risa: chanel preto com mecha azul e franja; maquiagem de palhaço (base branca, nariz vermelho, riscos escuros
    // sob os olhos, batom vermelho, olhos verde-água); gargantilha; vestido preto ombro a ombro com mangas bufantes,
    // corpete com rosa azul e correntinha de cristais, saia rodada com babado acima do joelho; manchas de sangue;
    // coturnos altos de cadarço
    risa: (F, s) => humano(F, { alt: 1.66, sexo: 'f', pele: '#e6c8b2', camisaTex: peleTex(F, '#e6c8b2', 81, { sangue: 8 }), mangaTex: peleTex(F, '#e6c8b2', 82, { sangue: 6 }),
      anteMat: () => matTex(F, peleTex(F, '#e6c8b2', 83, { sangue: 7 }), { r: .6 }), coxaMat: matTex(F, peleTex(F, '#e6c8b2', 84, { sangue: 9 }), { r: .6 }),
      canelaMat: matTex(F, botaTex(F), { r: .45 }), sapato: '#141214', sola: '#0a0a0a', bocaLarga: 1.12, quadrilMat: M(F, '#141216', { r: .8 }), semPunho: true,
      rosto: { palhaco: true, iris: '#1a9a92', irisClara: '#7fe6da', boca: 'sorriso', sobrancelha: '#141016', blush: 'rgba(220,90,100,.25)', fem: true, sangue: 4 },
      cabelo: { tipo: 'chanel', cor: '#0e0e12', mecha: '#2a58e8' }, semNariz: true, giroCabeca: .12,
      extras: ({ F, corpo, cab, bracos, Y, W, R, sxC, szC, mt }) => {
        const { G, T } = F, m = (c, o) => M(F, c, o);
        const vest = matTex(F, tecidoTex(F, '#141216', { sem: 85, dobras: true, sangue: 8 }), { r: .8, lado: 2 });
        F.sf(cab, R * .13, m('#c8141c', { r: .2 }), 0, -R * .17, R * szC * .97, 10);
        // gargantilha com argola e brincos de cristal azul
        const yg = Y.ombro + (Y.queixo - Y.ombro) * .45;
        const ga = new T.Mesh(F.guardar(new T.TorusGeometry(W.pesc * 1.06, .007, 6, 20)), m('#0c0c0e', { r: .4 })); ga.rotation.x = Math.PI / 2; ga.position.set(0, yg, -.008); corpo.add(ga);
        const ar = new T.Mesh(F.guardar(new T.TorusGeometry(.009, .0025, 4, 10)), m('#c0c0c8', { me: .9, r: .2 })); ar.position.set(0, yg - .012, W.pesc * 1.02); corpo.add(ar);
        const crist = m('#5ab4ff', { r: .1, me: .3, e: '#1a5aff', ei: .4 });
        [-1, 1].forEach(k => { const b = new T.Mesh(F.guardar(new T.OctahedronGeometry(R * .07)), crist); b.position.set(k * R * sxC * .97, -R * .42, -R * .02); b.scale.y = 1.6; cab.add(b); });
        // corpete (até acima do busto) e babado ombro a ombro passando pelos braços
        casca(F, corpo, [[Y.cintura - .08, W.c * 1.07, W.dC * 1.1], [Y.cintura, W.c * 1.04, W.dC * 1.07], [(Y.cintura + Y.peito) / 2, (W.c + W.p) / 2 * 1.05, (W.dC + W.dP) / 2 * 1.07, .004], [Y.peito + .03, W.p * 1.06, W.dP * 1.1, .014]], matTex(F, corpeteTex(F), { r: .6 }), { seg: 18 });
        const bab = (x, y, z, j, u, ang) => { const k = 1 + .06 * Math.sin(ang * 22); return [x * k, y, z * k]; };
        casca(F, corpo, [[Y.peito + .02, W.ombro + W.braco * 1.45, W.dP * 1.3, .004], [Y.peito + .065, W.ombro + W.braco * 1.6, W.dP * 1.4, .004]], vest, { seg: 30, deform: bab });
        // mangas bufantes com babado
        bracos.forEach(b => {
          casca(F, b.braco, [[-b.Lb * .5, W.braco * 1.35, W.braco * 1.35], [-b.Lb * .34, W.braco * 1.95, W.braco * 1.95], [-b.Lb * .12, W.braco * 1.8, W.braco * 1.8], [-.01, W.braco * 1.25, W.braco * 1.25]], vest, { seg: 12 });
          casca(F, b.braco, [[-b.Lb * .6, W.braco * 1.7, W.braco * 1.7], [-b.Lb * .48, W.braco * 1.35, W.braco * 1.35]], vest, { seg: 16, deform: bab });
          b.braco.rotation.z = b.k * .14;
        });
        // saia rodada com babado acima do joelho
        casca(F, corpo, [[Y.joelho + .14, W.q * 1.95, W.dQ * 2.0], [Y.quadril - .04, W.q * 1.42, W.dQ * 1.52], [Y.cintura - .05, W.c * 1.08, W.dC * 1.12]], vest, { seg: 26, deform: pano(.07, 9, .01, 4, 3) });
        casca(F, corpo, [[Y.joelho + .08, W.q * 2.18, W.dQ * 2.22], [Y.joelho + .15, W.q * 1.98, W.dQ * 2.02]], vest, { seg: 40, deform: (x, y, z, j, u, ang) => { const k = 1 + .05 * Math.sin(ang * 26); return [x * k, y + (j ? 0 : Math.sin(ang * 26) * .01), z * k]; } });
        // rosa azul no peito e correntinha de cristais
        const rosa = G(); rosa.position.set(-.02, Y.peito + .035, W.dP * 1.1 + .03); corpo.add(rosa);
        const azul = m('#2346c8', { r: .5 }), azulE = m('#162c8a', { r: .6 });
        F.sf(rosa, .02, azul, 0, 0, 0, 10);
        const pet = new T.Mesh(F.guardar(new T.TorusGeometry(.022, .011, 6, 12)), azulE); pet.scale.z = .6; rosa.add(pet);
        tuboAfilado(F, corpo, [[-.09, Y.peito + .035, W.dP * 1.12], [-.04, Y.peito + .005, W.dP * 1.18 + .012], [.04, Y.peito + .005, W.dP * 1.18 + .012], [.09, Y.peito + .035, W.dP * 1.12]], () => .0028, m('#c8c8d0', { me: .9, r: .2 }), { seg: 16, rad: 4 });
        [-.04, 0, .04].forEach(px => { const cr = new T.Mesh(F.guardar(new T.OctahedronGeometry(.008)), crist); cr.position.set(px, Y.peito - .008, W.dP * 1.18 + .016); cr.scale.y = 1.7; corpo.add(cr); });
      } }),
    // Onírico: careca, muito pálido e magro, olhos fundos, costelas e clavículas aparentes, sem camisa e sujo;
    // anda e fica de quatro, rastejando, com a barriga perto do chão e a cabeça erguida olhando para frente
    onirico: (F, s) => {
      const h = humano(F, { alt: 1.78, porte: .74, pele: '#a8a59a', camisaTex: costelaTex(F, '#a8a59a'), mangaTex: peleTex(F, '#a8a59a', 91, { sujeira: 22, veias: true }),
        anteMat: () => matTex(F, peleTex(F, '#a8a59a', 92, { sujeira: 26, veias: true }), { r: .6 }), calcaTex: tecidoTex(F, '#2a2824', { sem: 93, rasgado: 20, sujeira: 14, dobras: true }),
        sapato: '#b9b5aa', sola: '#9a968a', bocaLarga: 1.0,
        rosto: { cadaver: true, iris: '#3a3530', sobrancelha: 'rgba(120,115,105,.6)', boca: 'seria', veias: true, sujeira: 8, eh: 6 }, cabelo: { tipo: 'nenhum' }, semAnimPadrao: true,
        extras: p => {
          const { corpo, cab, bracos, pernas, Y } = p, T = F.T;
          corpo.rotation.x = 1.3; corpo.position.set(0, 0, -1.1);
          cab.rotation.x = -1.5;
          const pernasIK = pernas.map((pp, i) => ({ ombro: pp.quad, braco: pp.quad, cot: pp.joelho, Lb: Y.quadril - Y.joelho, La: Y.joelho - Y.tornozelo, k: i ? 1 : -1 }));
          const local = a => { corpo.updateMatrix(); return vetor(F, a).applyMatrix4(corpo.matrix.clone().invert()); };
          const dir = a => vetor(F, a).applyQuaternion(corpo.quaternion.clone().invert());
          const ik = (br, alvo, polo) => { const l = local(alvo), d = dir(polo); posar(F, br, [l.x, l.y, l.z], [d.x, d.y, d.z]); };
          // passo do rastejar: braço de um lado anda junto com a perna do outro
          p.rastejar = (f, amp) => {
            bracos.forEach((b, i) => {
              const ph = f + (i ? Math.PI : 0);
              ik(b, [b.k * .3, .03 + Math.max(0, Math.cos(ph)) * .07 * amp, .55 + Math.sin(ph) * .12 * amp], [b.k, .7, -.4]);
            });
            pernasIK.forEach((pp, i) => {
              const ph = f + (i ? 0 : Math.PI);
              ik(pp, [pp.k * .24, .06 + Math.max(0, Math.cos(ph)) * .05 * amp, -.3 + Math.sin(ph) * .1 * amp], [pp.k * .3, -.3, 1]);

            });
          };
          // pés descalços dobrados para trás, rente ao chão
          pernas.forEach(pp => { const pe = pp.joelho.children[1]; pe.children.forEach(c => { c.visible = false; }); const f = F.sf(pe, .04, p.mt('#a8a59a', { r: .7 }), 0, -.07, 0, 8); f.scale.set(.9, 2.2, .7); });
          p.rastejar(0, 0);
          p.fase = 0;
        },
        anim: (dt, t, andando, p) => {
          if (andando) { p.fase += dt * 5; p.rastejar(p.fase, 1); p.corpo.position.x = Math.sin(p.fase) * .02; p.corpo.rotation.z = Math.sin(p.fase) * .05; }
          else { p.corpo.position.x *= .9; p.corpo.rotation.z *= .9; p.rastejar(p.fase, 0); }
          p.cab.rotation.y = Math.sin(t * .35) * .22; p.cab.rotation.z = Math.sin(t * .6) * .1;
          p.tronco.scale.x = 1 + Math.sin(t * 2.2) * .02;
        } });
      h.alt = .95; h.raioBase = .55;
      return h;
    },
  };
  const chaveNpc = id => String(id || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s_]+/g, '-');

  /* ================= espectro: aparição que acompanha uma criança ================= */
  // alto, magro e translúcido, flutuando; braços compridos de dedos ossudos; órbitas ocas com um brilho fraco;
  // boca esticada demais; cabelo comprido escondendo parte do rosto; mortalha rasgada que se desfaz em fiapos
  function espectro(F, s) {
    const T = F.T, { G } = F, m = (c, o) => M(F, c, o);
    const g = G(), flut = G(); g.add(flut);
    const fria = '#6f93ba';
    const pele = m('#c4d4e2', { op: .58, e: fria, ei: .45, r: .55 });
    const ossoEsc = m('#1a2532', { op: .5, r: .8 });
    // texturas: tronco com costelas, mortalha, desbotamento da barra e o rosto
    const corpoT = texDe(F, 'espCorpo', () => {
      const [c, x] = NS.tela(256, 128), fx = 128; x.fillStyle = '#c4d4e2'; x.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 6; i++) [-1, 1].forEach(sg => { const y0 = 26 + i * 15; x.strokeStyle = 'rgba(20,30,45,.7)'; x.lineWidth = 4; x.beginPath(); x.moveTo(fx + sg * 5, y0); x.quadraticCurveTo(fx + sg * 30, y0 + 2, fx + sg * 58, y0 + 16); x.stroke(); });
      x.fillStyle = 'rgba(20,30,45,.6)'; x.fillRect(fx - 3, 18, 6, 80);
      [0, 256].forEach(b => { for (let y = 8; y < 128; y += 9) { x.fillStyle = 'rgba(20,30,45,.55)'; elipse(x, b, y, 4, 3); x.fill(); } });
      return fazTex(F, c);
    });
    const sudT = texDe(F, 'espSud', () => {
      const [c, x] = NS.tela(256, 256), r = NS.rng(131); x.fillStyle = '#aebfcf'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 30; i++) { const px = r() * 256; x.fillStyle = `rgba(30,40,60,${.08 + r() * .15})`; x.fillRect(px, r() * 120, 2 + r() * 5, 60 + r() * 140); }
      for (let i = 0; i < 20; i++) { x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(r() * 256, r() * 256, 1, 40 + r() * 80); }
      return fazTex(F, c);
    });
    const alfaT = texDe(F, 'espAlfa', () => {
      const [c, x] = NS.tela(128, 256), r = NS.rng(133);
      const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#bbb'); gr.addColorStop(.45, '#a8a8a8'); gr.addColorStop(.8, '#444'); gr.addColorStop(1, '#000');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 40; i++) { const px = r() * 128; x.fillStyle = `rgba(0,0,0,${.3 + r() * .5})`; x.fillRect(px, 100 + r() * 80, 2 + r() * 6, 200); }
      return fazTex(F, c);
    });
    const rostoT = texDe(F, 'espRosto', () => {
      const [c, x] = NS.tela(512, 256), r = NS.rng(137), cx = 128;
      x.fillStyle = '#c8d6e2'; x.fillRect(0, 0, 512, 256);
      let gr = x.createRadialGradient(cx, 118, 6, cx, 130, 140); gr.addColorStop(0, 'rgba(255,255,255,.25)'); gr.addColorStop(.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,30,50,.55)');
      x.fillStyle = gr; x.fillRect(0, 0, 512, 256);
      [-1, 1].forEach(sg => {
        gr = x.createRadialGradient(cx + sg * 30, 160, 2, cx + sg * 30, 160, 22); gr.addColorStop(0, 'rgba(20,30,45,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; elipse(x, cx + sg * 30, 160, 20, 28); x.fill();
        gr = x.createRadialGradient(cx + sg * 20, 118, 1, cx + sg * 20, 120, 28); gr.addColorStop(0, '#6ab0d8'); gr.addColorStop(.12, '#04060a'); gr.addColorStop(.75, '#010204'); gr.addColorStop(1, 'rgba(10,15,25,0)');
        x.fillStyle = gr; elipse(x, cx + sg * 20, 120, 18, 28, sg * .2); x.fill();
      });
      // boca esticada demais, aberta até o queixo
      gr = x.createLinearGradient(0, 140, 0, 250); gr.addColorStop(0, '#05070c'); gr.addColorStop(1, '#0c1420');
      x.fillStyle = gr; x.beginPath(); x.moveTo(cx - 10, 146);
      for (let i = 0; i <= 10; i++) { const t = i / 10; x.lineTo(cx - 10 - Math.sin(t * Math.PI) * 14 - (i % 2) * 2, 146 + t * 104); }
      for (let i = 10; i >= 0; i--) { const t = i / 10; x.lineTo(cx + 10 + Math.sin(t * Math.PI) * 14 + (i % 2) * 2, 146 + t * 104); }
      x.fill();
      x.strokeStyle = 'rgba(200,220,235,.45)'; x.lineWidth = 1.2; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(cx - 12 + i * 3, 150); x.lineTo(cx - 12 + i * 3 + (r() - .5) * 2, 158 + r() * 4); x.stroke(); }
      x.strokeStyle = 'rgba(30,45,65,.5)'; x.lineWidth = 1; for (let i = 0; i < 10; i++) { let px = cx + (r() - .5) * 100, py = 60 + r() * 150; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (r() - .5) * 14; py += r() * 12; x.lineTo(px, py); } x.stroke(); }
      return fazTex(F, c);
    });
    const corpoM = matTex(F, corpoT, { op: .6, e: fria, ei: .4, r: .6 }); corpoM.depthWrite = false;
    const sudM = matTex(F, sudT, { op: .72, e: '#4a6a8c', ei: .35, r: .8, lado: 2 }); sudM.alphaMap = alfaT; sudM.depthWrite = false;
    const fiapoM = m('#9fb3c8', { op: .32, e: fria, ei: .5, r: .8 }); fiapoM.depthWrite = false;
    // mortalha da cintura para baixo, rasgada, desbotando em fiapos
    const nA = 6;
    const sud = casca(F, flut, [[-.05, .44, .4], [.35, .38, .34], [.7, .27, .24], [.95, .18, .15], [1.12, .13, .1], [1.25, .14, .1]], sudM, { seg: 24, deform: pano(.14, 7, .3, 3, nA) });
    const fiapos = [];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + .3, fg = G(); fg.position.set(Math.sin(a) * .32, .25, Math.cos(a) * .28); flut.add(fg);
      tuboAfilado(F, fg, [[0, 0, 0], [Math.sin(a) * .05, -.15, Math.cos(a) * .04], [Math.sin(a + 1) * .06, -.32, Math.cos(a + 1) * .05], [Math.sin(a + 2) * .04, -.48, Math.cos(a + 2) * .03]], t => .045 * (1 - t * .92), fiapoM, { seg: 12, rad: 5 });
      fiapos.push(fg);
    }
    // tronco magro com costelas por dentro
    casca(F, flut, [[1.08, .12, .085], [1.25, .135, .09], [1.45, .17, .1, .005], [1.62, .21, .1], [1.72, .17, .085], [1.78, .05, .045]], corpoM, { seg: 18 });
    for (let i = 0; i < 4; i++) { const cs = new T.Mesh(F.guardar(new T.TorusGeometry(.13 - i * .006, .007, 4, 14, Math.PI * 1.3)), ossoEsc); cs.rotation.set(Math.PI / 2 + .25, 0, -Math.PI * .15); cs.position.set(0, 1.33 + i * .075, 0); cs.scale.set(1, .62, 1); flut.add(cs); }
    F.cy(flut, .028, .034, .2, pele, 0, 1.74, -.01, 8);
    // cabeça comprida com órbitas ocas, brilho fraco no fundo e cabelo comprido caindo na frente
    const cab = G(); cab.position.set(0, 2.02, .01); flut.add(cab);
    const R = .115;
    const cabeca = F.sf(cab, R, matTex(F, rostoT, { op: .82, e: fria, ei: .3, r: .5 }), 0, 0, 0, 20); cabeca.scale.set(.78, 1.3, .9);
    const brilho = m('#9fd4f0', { e: '#7fc8f0', ei: 1.1 });
    [-1, 1].forEach(k => F.sf(cab, .009, brilho, k * .022, .02, R * .82, 6));
    const cabM = matTex(F, cabeloTex(F, '#0c1016'), { op: .86, r: .8, lado: 2 });
    const gc = G(); gc.scale.set(.78, 1.3, .9); cab.add(gc);
    calota(F, gc, R * 1.05, cabM, Math.PI * .42, { seg: 16, segV: 6 }).rotation.x = -.5;
    casca(F, cab, [[-.5, R * 1.5, R * 1.3, -.03], [-.25, R * 1.2, R * 1.15, -.01], [-R * .8, R * .82, R * .96], [0, R * .84, R * 1.0], [R * .9, R * .66, R * .78], [R * 1.33, .015, .015]], cabM,
      { abertura: 1.25, seg: 20, deform: (x, y, z, j, u, ang, i) => j === 0 ? [x, y - hash(i, 9) * .2, z] : [x, y, z] });
    [[-.035, .1], [.03, -.1], [.05, .2]].forEach(([px, w]) => tuboAfilado(F, cab, [[px, R * 1.1, R * .55], [px * 1.2 + w * .1, R * .3, R * .92], [px * 1.3, -R * .6, R * .98], [px * 1.4 + w * .2, -.36, R * .9]], t => .01 * (1 - t * .6), m('#0c1016', { op: .8, r: .8 }), { seg: 12, rad: 4 }));
    // braços compridos com dedos ossudos (cada dedo dobra sozinho)
    const bracos = [-1, 1].map(k => {
      const om = G(); om.position.set(k * .2, 1.7, 0); flut.add(om);
      F.sf(om, .04, pele, 0, 0, 0, 8);
      const b = G(); om.add(b); b.rotation.set(-.18, 0, k * .14);
      capsula(F, b, .032, .026, .45, pele, 8, 3);
      casca(F, b, [[-.36, .085, .085], [-.15, .06, .06], [-.01, .036, .036]], sudM, { seg: 10, deform: pano(.15, 5, .12, k + 4, 3) });
      const ct = G(); ct.position.y = -.45; b.add(ct); ct.rotation.x = -.35;
      capsula(F, ct, .026, .02, .42, pele, 8, 3);
      const mao = G(); mao.position.y = -.42; ct.add(mao); mao.rotation.y = -k * .3;
      F.sf(mao, .03, pele, 0, -.03, 0, 8).scale.set(.5, 1.3, 1);
      const dedos = [];
      for (let d = 0; d < 5; d++) {
        const dg = G(); dg.position.set(-k * (d === 4 ? .012 : 0), d === 4 ? -.03 : -.065, d === 4 ? .025 : (-.024 + d * .016)); mao.add(dg);
        const L = d === 4 ? .1 : .24 - Math.abs(d - 1.5) * .025;
        tuboAfilado(F, dg, [[0, 0, 0], [0, -L * .35, .006], [0, -L * .7, .014], [0, -L, .02]], t => .007 * (1 - t * .55) * (1 + .5 * Math.max(0, 1 - Math.abs(t - .35) * 10) + .4 * Math.max(0, 1 - Math.abs(t - .7) * 10)), pele, { seg: 10, rad: 4 });
        if (d === 4) dg.rotation.set(-.5, 0, -k * .5);
        dedos.push(dg);
      }
      return { om, b, ct, dedos, k };
    });
    let lean = 0;
    const anim = (dt, t, andando) => {
      flut.position.y = .2 + Math.sin(t * 1.1) * .06;
      lean += ((andando ? .28 : 0) - lean) * Math.min(1, dt * 3);
      flut.rotation.x = lean;
      fiapos.forEach((f, i) => { f.rotation.x = Math.sin(t * 1.3 + i) * .22 - lean * 1.4; f.rotation.z = Math.cos(t * 1.1 + i * 2) * .2; });
      sud.rotation.y = Math.sin(t * .7) * .05;
      // a cabeça às vezes dá um tranco para o lado
      const tranco = Math.max(0, Math.sin(t * .9) * Math.sin(t * 2.3) - .8) * 5;
      cab.rotation.z = Math.sin(t * .4) * .12 + tranco * .5; cab.rotation.y = Math.sin(t * .27) * .2 - tranco * .3; cab.rotation.x = .1 + Math.sin(t * .5) * .05;
      bracos.forEach((b, i) => {
        b.om.rotation.x = Math.sin(t * .8 + i * 1.7) * .1 - lean * .8;
        b.ct.rotation.x = -.35 + Math.sin(t * .6 + i) * .12;
        b.dedos.forEach((d, j) => { if (j < 4) d.rotation.x = -.2 - (Math.sin(t * .9 + i * 2 + j * .5) + 1) * .4; });
      });
    };
    return { g, alt: 2.3, anim, raioBase: .3 };
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
      else if (s.tipo === 'espectro') t = espectro(F, s);
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
    // o espectro flutua: base quase invisível
    if (s.tipo === 'espectro') { disco.material = F.m('#141218', { r: .4, me: .3, op: .12 }); aro.material.transparent = true; aro.material.opacity = .3; }
    t.aro = aro; t.base = base;
    t.g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    return t;
  }

  Object.assign(NS, { criarToken, carregarModelos, FORMAS, NOMES_FORMA });
  NS.preparoTokens = F => { F.T = F.T || window.THREE; };
})();
