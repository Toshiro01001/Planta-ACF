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

  /* ================= movimento: velocidade real, curvas, pesos suaves e vida no parado ================= */
  // A sala só diz se o token está andando; o motor de cada token lê o próprio deslocamento a cada quadro e entrega
  // a velocidade em m/s, o giro (rad/s, para inclinar nas curvas), a aceleração, os pesos suaves de andar e correr
  // (sem estalo entre estados: 150 a 300 ms) e sorteios com semente para o parado (olhar em volta, piscar, trocar
  // o peso de perna), cada token no seu próprio ritmo. Nada é alocado por quadro.
  const suave = (x, alvo, k, dt) => { const a = k * dt; return x + (alvo - x) * (a / (1 + a + a * a * .5)); };   // ~1 - e^(-k·dt), sem exp
  const sstep = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const semDe = id => { let h = 2166136261; const s = String(id == null ? '' : id); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000003) / 1000003; };
  let semPendente = null;   // semente do token que está sendo montado agora (criarToken)
  function motor(g, op = {}) {
    const sem = op.sem != null ? (typeof op.sem === 'number' ? op.sem : semDe(op.sem)) : semPendente != null ? semPendente : Math.random();
    let r = Math.floor(sem * 2147483000) + 1;
    const rnd = () => (r = r * 16807 % 2147483647) / 2147483647;
    const m = {
      sem, rnd, v: 0, vf: 0, vEf: 0, k: 0, kc: 0, giro: 0, acel: 0, dist: 0, mov: 0, andando: false,
      vPadrao: op.vPadrao || 1.8, vCorre: op.vCorre || 3.2,
      oy: 0, op: 0, oyA: 0, opA: 0, tOlhar: .8 + sem * 3, pisca: 0, tPisca: .6 + sem * 3, piscaT: 0, duplo: false,
      peso: 0, pesoA: 0, tPeso: 2 + sem * 5, x: NaN, z: NaN, ry: NaN,
    };
    // um passo do motor: chame no começo da anim, com o dt que a anim recebeu
    m.passo = (dt, andando) => {
      const px = g.position.x, pz = g.position.z, ry = g.rotation.y;
      let inst = 0, fr = 0, gi = 0;
      if (dt > 1e-5 && m.x === m.x) {
        const dx = px - m.x, dz = pz - m.z, d = Math.sqrt(dx * dx + dz * dz);
        if (d < 1.5) { inst = Math.min(12, d / dt); fr = d > 1e-6 ? inst * (dx * Math.sin(ry) + dz * Math.cos(ry)) / d : 0; }   // salto grande é teleporte
        let dr = ry - m.ry; dr -= Math.round(dr / 6.283185) * 6.283185; gi = Math.max(-6, Math.min(6, dr / dt));
      }
      m.x = px; m.z = pz; m.ry = ry; m.andando = !!andando;
      if (dt <= 0) return m;
      const v0 = m.v;
      m.v = suave(m.v, inst, 6, dt); m.vf = suave(m.vf, fr, 6, dt);
      m.mov = suave(m.mov, inst > .12 ? 1 : 0, inst > .12 ? 8 : 1.2, dt);
      // andando sem sair do lugar (prévia, disfarce): usa a velocidade de passeio
      m.vEf = andando ? m.v * m.mov + m.vPadrao * (1 - m.mov) : m.v;
      m.k = suave(m.k, andando ? 1 : 0, 9, dt);
      m.kc = suave(m.kc, andando ? sstep((m.vEf - m.vCorre + .5) / 1.1) : 0, 6, dt);
      m.giro = suave(m.giro, gi, 7, dt);
      m.acel = suave(m.acel, Math.max(-12, Math.min(12, (m.v - v0) / dt)), 5, dt);
      m.dist += m.vEf * dt;
      return m;
    };
    // vida no parado: para onde olha, piscadas e o peso nas pernas (sorteados com a semente do token)
    m.vida = dt => {
      m.tOlhar -= dt;
      if (m.tOlhar <= 0) { const q = rnd(); m.oyA = q < .3 ? 0 : (rnd() - .5) * 1.7; m.opA = (rnd() - .5) * .4; m.tOlhar = 1.2 + rnd() * 3.8; }
      m.oy = suave(m.oy, m.oyA, 4.5, dt); m.op = suave(m.op, m.opA, 3.5, dt);
      m.tPisca -= dt;
      if (m.tPisca <= 0) { m.piscaT = .15; if (m.duplo) { m.duplo = false; m.tPisca = .22; } else { m.duplo = rnd() < .18; m.tPisca = 2 + rnd() * 4; } }
      if (m.piscaT > 0) { m.piscaT -= dt; m.pisca = Math.sin(Math.max(0, 1 - m.piscaT / .15) * Math.PI); } else m.pisca = 0;
      m.tPeso -= dt;
      if (m.tPeso <= 0) { const q = rnd(); m.pesoA = q < .25 ? 0 : q < .62 ? -1 : 1; m.tPeso = 3.5 + rnd() * 6; }
      m.peso = suave(m.peso, m.pesoA, 1.6, dt);
      return m;
    };
    // fase de um ciclo preso ao chão: avanço em radianos para um passo (ciclo completo) de comprimento L metros
    m.avanco = (dt, L) => m.vEf * dt * 6.283185 / Math.max(.05, L);
    // avanço de uma fase que a forma já tinha (K rad/s pensado para a velocidade vRef): acompanha a velocidade real
    m.ritmo = (dt, K, vRef) => dt * K * Math.max(.35, Math.min(2.4, m.vEf / (vRef || m.vPadrao))) * (m.k > .02 ? 1 : 0);
    return m;
  }
  // quadros-chave sem alocação: K = [[t, v0, v1, ...], ...]; escreve em out os valores no instante u (suavizado)
  function chave(K, u, out) {
    const n = K[0].length;
    let i = 1; while (i < K.length && u > K[i][0]) i++;
    if (i >= K.length) { for (let j = 1; j < n; j++) out[j] = K[K.length - 1][j]; return out; }
    const a = K[i - 1], b = K[i], f = sstep((u - a[0]) / Math.max(1e-4, b[0] - a[0]));
    for (let j = 1; j < n; j++) out[j] = a[j] + (b[j] - a[j]) * f;
    return out;
  }
  // IK de dois ossos sem alocação: devolve em qB e qC as rotações do braço e do antebraço (espaço do corpo)
  let IKV = null;
  function ikQ(T, br, ax, ay, az, px, py, pz, qB, qC) {
    if (!IKV) IKV = { P: new T.Vector3(), Tg: new T.Vector3(), u: new T.Vector3(), pv: new T.Vector3(), d1: new T.Vector3(), d2: new T.Vector3(), c: new T.Vector3(), BX: new T.Vector3(0, -1, 0), qi: new T.Quaternion() };
    const { P, Tg, u, pv, d1, d2, c, BX, qi } = IKV;
    P.copy(br.ombro.position); Tg.set(ax, ay, az);
    u.subVectors(Tg, P); let d = u.length(); if (d < 1e-5) { u.set(0, -1, 0); d = 1e-3; } else u.multiplyScalar(1 / d);
    const L1 = br.Lb, L2 = br.La;
    d = Math.max(Math.abs(L1 - L2) + 1e-3, Math.min(d, (L1 + L2) * .999));
    const ang = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
    pv.set(px, py, pz); pv.addScaledVector(u, -pv.dot(u)); if (pv.lengthSq() < 1e-8) pv.set(0, 0, 1); pv.normalize();
    d1.copy(u).multiplyScalar(Math.cos(ang)).addScaledVector(pv, Math.sin(ang)).normalize();
    c.copy(P).addScaledVector(d1, L1);
    d2.subVectors(Tg, c).normalize();
    qB.setFromUnitVectors(BX, d1);
    qi.copy(qB).invert(); d2.applyQuaternion(qi);
    qC.setFromUnitVectors(BX, d2);
  }
  // ataque com o que a ficha mandou: arma de fogo, arma branca ou de mãos vazias (pelo nome do golpe)
  const RE_FOGO = /pistol|rev[oó]lver|espingard|escopet|fuzil|rifle|carabin|metralhad|submetral|arma de fogo|\btiro|dispar|calibre|\.38|\.45|9 ?mm|sniper|garrucha|bacamarte|mosquet|arcabuz/i;
  const RE_BRANCA = /faca|fac[aã]o|punhal|adaga|machad|espada|katana|l[aâ]mina|foice|serra|bisturi|navalha|martelo|marreta|\btaco|bast[aã]o|cassetete|p[eé].de.cabra|lan[cç]a|tesoura|picareta|enxada|chave de roda|cutelo|estilete|garra|corrente|vara|cano|ferro|bengala|tridente|alabarda|sabre|florete|clava|ma[cç]a\b/i;
  const tipoGolpe = (nome, padrao) => { const n = String(nome || ''); if (/soco ingl|desarmad|soco|chute|cabe[cç]ada|punho/i.test(n)) return 'soco'; if (RE_FOGO.test(n)) return 'fogo'; if (RE_BRANCA.test(n)) return 'branca'; return padrao || 'soco'; };

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

    // animação: o motor lê a velocidade real e o passo fica preso ao chão (o ciclo cresce e acelera na corrida);
    // braço oposto à perna, quadril girando, tronco subindo e descendo, inclinação ao correr e nas curvas, cabeça
    // estável. Parado: respira, troca o peso de perna e olha em volta. Ações (ataque, conjuração, ritual) entram por
    // cima com mistura suave e devolvem o corpo à pose de antes.
    const mv = motor(g, { vPadrao: cri ? 1.4 : 1.8, vCorre: cri ? 2.6 : 3.2 });
    const giro = op.giroCabeca ?? .15, kOlhar = Math.min(1.2, giro / .15) * .42;
    const B0 = { cy: corpo.position.y, cz: corpo.position.z, cx: corpo.position.x, rx: corpo.rotation.x, ry: corpo.rotation.y, rz: corpo.rotation.z,
      kx: cab.rotation.x, ky: cab.rotation.y, kz: cab.rotation.z, cot: bracos.map(b => b.cot.rotation.x), oz: bracos.map(b => b.ombro.rotation.z), mao: bracos.map(b => b.mao.visible) };
    const qB = [new T.Quaternion(), new T.Quaternion()], qC = [new T.Quaternion(), new T.Quaternion()];
    const Lperna = Y.quadril - Y.tornozelo;
    let fase = mv.sem * 6.283;
    partes.mv = mv; partes.acaoPeso = 0;
    // ação em curso: { K (quadros), dur, t, tipo }
    let ac = null; const AK = new Float32Array(12);
    const acao = (tipo, nome) => {
      let K = null;
      if (tipo === 'ataque') { const tp = tipoGolpe(nome, op.golpe); K = tp === 'fogo' ? GOLPE_FOGO : tp === 'branca' ? GOLPE_BRANCA : GOLPE_SOCO; }
      else if (tipo === 'ritual') K = RITUAL; else if (tipo === 'conjurar') K = CONJURAR;
      if (K) ac = { K, dur: K[K.length - 1][0], t: 0, tipo };
    };
    const anim = (dt, t, andando) => {
      if (op.semAnimPadrao) { mv.passo(dt, andando); if (op.anim) op.anim(dt, t, andando, partes); return; }
      mv.passo(dt, andando).vida(dt);
      const k = sstep(mv.k), kc = sstep(mv.kc), kp = 1 - k;
      // ciclo do passo: comprimento cresce com a corrida; passos curtos quando anda devagar
      const ciclo = A * (.86 + .55 * kc) * (cri ? .95 : 1);
      fase += mv.avanco(dt, ciclo);
      const sf_ = Math.sin(fase), cf = Math.cos(fase), c2 = Math.cos(2 * fase);
      const curto = Math.min(1, .55 + mv.vEf / 3.2);
      const aQ = (.44 + .22 * kc) * curto * k * (cri ? .92 : 1);
      // pernas: coxa, joelho (dobra na volta e mais ainda correndo) e pé (plano no apoio, ponta caída no ar)
      const peso = mv.peso * kp;
      for (let i = 0; i < 2; i++) {
        const p = pernas[i], si = i ? -sf_ : sf_, ci = i ? -cf : cf;
        // corrida: a coxa vai pouco para trás e bem à frente; na recuperação o calcanhar sobe em direção ao glúteo
        // com a coxa já passando à frente (pico com a coxa na vertical), e o pé de trás fica perto da altura do joelho
        // da outra perna; o contato é com o joelho levemente dobrado e o apoio cede um pouco
        const qAnda = si * aQ, qCorre = (si > 0 ? si * .3 : si * .74) * curto * k - .08 * k;
        const q = qAnda + (qCorre - qAnda) * kc;
        const apoio = sstep(ci * 1.6 + .5);
        const jAnda = Math.max(0, -ci) * .78 + .06;
        const jCorre = (ci < 0 ? .28 + 1.32 * (-ci) * Math.sqrt(Math.max(0, 1 - Math.abs(si) * .35)) : .28 + .22 * ci);
        let j = k * (jAnda + (jCorre - jAnda) * kc);
        // parado: a perna sem peso dobra um pouco o joelho
        const solta = i ? Math.max(0, -peso) : Math.max(0, peso);
        j += solta * .16;
        const qq = q - solta * .05;
        p.quad.rotation.set(qq, 0, 0); p.joelho.rotation.set(j, 0, 0);
        p.pe.rotation.set(-(qq + j) * (kp + k * (.45 + .55 * apoio)) + k * (1 - apoio) * .12, 0, 0);
      }
      // tronco: sobe e desce (anda: alto na passagem; corre: voo nas passadas), balança para o lado do apoio,
      // quadril gira com a perna, inclina para frente ao correr e para dentro nas curvas
      const bob = k * s * ((1 - kc) * .02 * c2 + kc * (-.022 * c2 - .004));
      const bank = Math.max(-.22, Math.min(.22, -mv.giro * mv.vEf * .05)) * k;
      corpo.position.set(B0.cx - k * (1 - kc * .6) * cf * .016 * s + peso * .022 * s, B0.cy + bob - kp * Math.abs(mv.peso) * .006 * s, B0.cz);
      corpo.rotation.set(B0.rx + k * (.035 + .17 * kc + (1 - kc) * .012 * c2) + Math.max(-.06 * (1 - kc), Math.min(.1, mv.acel * .018)) * k,
        B0.ry - k * (.07 + .05 * kc) * sf_, B0.rz + k * (1 - kc) * .02 * cf + bank + peso * .018);
      // respiração (mais funda depois de correr: kc demora a cair)
      const resp = Math.sin(t * (1.9 + kc * 1.6) + mv.sem * 9);
      tronco.scale.x = 1 + resp * (.01 + .006 * kc); tronco.scale.z = 1 + resp * (.018 + .01 * kc);
      // braços: oposto à perna, cotovelo dobrando na ida e bem dobrado na corrida
      const aB = (.36 + .16 * kc) * curto * k;
      for (let i = 0; i < 2; i++) {
        const b = bracos[i], bal = (i ? sf_ : -sf_) * aB;
        // cada quadro parte da pose de origem do braço (a ação do quadro anterior não acumula)
        b.braco.quaternion.copy(b.q0B);
        if (b.fixo) { b.cot.quaternion.copy(b.q0C); b.ombro.rotation.set(bal * .18 + kp * Math.sin(t * .8 + i * 2 + mv.sem * 5) * .015, 0, 0); continue; }
        b.ombro.rotation.set(bal - kc * .1 * k + kp * (Math.sin(t * .7 + i * 2.1 + mv.sem * 7) * .025 + resp * .01), 0, B0.oz[i] + (i ? 1 : -1) * (kc * .1 * k + kp * Math.abs(mv.peso) * .02));
        // cotovelo: no passeio dobra na ida; na corrida fica perto de 90 graus
        b.cot.rotation.set(B0.cot[i] - k * ((1 - kc) * (.12 + Math.max(0, -bal) * .45) + kc * (1.42 + Math.max(0, -bal) * .12)), 0, 0);
      }
      // cabeça: compensa o tronco (fica estável), olha para a curva e, parada, olha em volta
      cab.rotation.set(B0.kx - (corpo.rotation.x - B0.rx) * .8 + kp * mv.op * .5 - k * .015 * c2,
        B0.ky - (corpo.rotation.y - B0.ry) * .9 + mv.oy * kOlhar * (1 - k * .75) + Math.max(-.3, Math.min(.3, mv.giro * .1)) * k,
        B0.kz - (corpo.rotation.z - B0.rz) * .7);
      // ação por cima (ataque, conjuração, ritual)
      let w = 0;
      if (ac) {
        ac.t += dt; const u = ac.t;
        if (u >= ac.dur) ac = null;
        else {
          chave(ac.K, u, AK);
          w = sstep(u / .14) * sstep((ac.dur - u) / Math.min(.4, ac.dur * .3));
          const ss = s, tr = ac.tipo === 'ritual' && u > .55 && u < 1.6 ? Math.sin((u - .55) / 1.05 * Math.PI) : 0, tre = ac.tipo !== 'ataque' && u > 1.4 ? Math.sin(t * 41) * .006 : 0;
          corpo.rotation.y += AK[7] * w; corpo.rotation.x += AK[8] * w;
          corpo.position.y += AK[9] * ss * w; corpo.position.z += AK[10] * ss * w;
          cab.rotation.x += (AK[11] - AK[8] * .6) * w; cab.rotation.y += -AK[7] * .7 * w;
          // passo à frente no golpe e joelhos dobrando ao agachar
          pernas[1].quad.rotation.x -= AK[10] * 3.2 * w; pernas[0].quad.rotation.x += AK[10] * 2 * w;
          pernas[0].joelho.rotation.x += Math.max(0, -AK[9]) * 3.5 * w; pernas[1].joelho.rotation.x += Math.max(0, -AK[9]) * 4 * w + AK[10] * 1.2 * w;
          for (let i = 0; i < 2; i++) {
            const b = bracos[i], o = i ? 4 : 1, sx = i ? 1 : -1;
            // traço do sigilo no ar (ritual) e mãos tremendo na conjuração
            const cx = tr * Math.cos(t * 13 + i * 3.1) * .06, cy2 = tr * Math.sin(t * 13 + i * 3.1) * .06;
            ikQ(T, b, (AK[o] + cx) * ss, (AK[o + 1] + cy2) * ss + tre, AK[o + 2] * ss, sx * .9, -.5, -.35, qB[i], qC[i]);
            b.ombro.rotation.x *= 1 - w; b.ombro.rotation.z += (0 - b.ombro.rotation.z) * w;
            b.braco.quaternion.slerp(qB[i], w); b.cot.quaternion.slerp(qC[i], w);
            if (!B0.mao[i]) b.mao.visible = w > .3;
          }
        }
      }
      if (!ac && partes.acaoPeso) bracos.forEach((b, i) => { b.mao.visible = B0.mao[i]; });   // a ação acabou: mãos como eram
      partes.acaoPeso = w;
      if (op.anim) op.anim(dt, t, andando, partes);
    };
    // pose original dos braços posados (para voltar depois de uma ação)
    bracos.forEach(b => { b.q0B = b.braco.quaternion.clone(); b.q0C = b.cot.quaternion.clone(); });
    return { g, alt: A, anim, partes, acao };
  }
  // quadros das ações (metros para um adulto de 1,72 m; o corpo multiplica pela escala):
  // [t (s), mão direita x y z, mão esquerda x y z, giro do tronco, inclinação, agacha, avança, cabeça]
  // soco: puxa e gira (antecipação), estica rápido com o passo (golpe), segura (follow-through) e volta
  const GOLPE_SOCO = [
    [0, -.2, 1.0, .06, .2, 1.0, .06, 0, 0, 0, 0, 0],
    [.22, -.2, 1.27, -.12, .1, 1.4, .24, -.38, -.04, -.04, -.02, .05],
    [.31, -.05, 1.37, .56, .13, 1.36, .15, .32, .12, -.05, .09, -.05],
    [.5, -.01, 1.35, .57, .14, 1.33, .12, .36, .1, -.045, .09, -.04],
    [.78, -.18, 1.24, .22, .13, 1.3, .18, .06, .03, -.02, .03, 0],
    [1.0, -.2, 1.05, .08, .2, 1.05, .08, 0, 0, 0, 0, 0]];
  // arma branca: ergue por cima do ombro, corta em diagonal para baixo e atravessa o corpo, recupera
  const GOLPE_BRANCA = [
    [0, -.2, 1.0, .06, .2, 1.0, .06, 0, 0, 0, 0, 0],
    [.34, -.3, 1.78, -.08, .16, 1.22, .25, -.42, -.08, -.02, -.03, -.05],
    [.47, .16, 1.1, .44, .24, 1.12, .12, .42, .22, -.08, .1, .1],
    [.64, .3, .96, .26, .25, 1.06, .06, .48, .2, -.08, .1, .08],
    [.92, -.08, 1.12, .16, .2, 1.1, .1, .1, .05, -.03, .04, 0],
    [1.2, -.2, 1.05, .08, .2, 1.05, .08, 0, 0, 0, 0, 0]];
  // arma de fogo: ergue e mira com as duas mãos, o tiro dá o coice para cima, segura a mira e abaixa
  const GOLPE_FOGO = [
    [0, -.2, 1.0, .06, .2, 1.0, .06, 0, 0, 0, 0, 0],
    [.28, -.06, 1.42, .52, -.02, 1.36, .44, .1, .02, -.02, .02, 0],
    [.46, -.06, 1.42, .53, -.02, 1.36, .45, .1, .02, -.02, .02, 0],
    [.52, -.06, 1.52, .44, -.02, 1.43, .38, .1, -.06, -.015, -.01, -.06],
    [.7, -.06, 1.42, .52, -.02, 1.36, .44, .1, .02, -.02, .02, 0],
    [.95, -.08, 1.38, .48, -.01, 1.33, .42, .08, .02, -.02, .02, 0],
    [1.3, -.2, 1.05, .08, .2, 1.05, .08, 0, 0, 0, 0, 0]];
  // ritual (o sigilo do site dura 4,2 s e brilha mais em 1,5 s): junta as mãos e baixa a cabeça, abre os braços
  // traçando o sigilo no ar até o pico do brilho, desce as mãos espalmadas para o chão e solta no fim do brilho
  const RITUAL = [
    [0, -.2, 1.0, .06, .2, 1.0, .06, 0, 0, 0, 0, 0],
    [.5, -.04, 1.3, .24, .04, 1.3, .24, 0, .08, -.02, 0, .3],
    [1.0, -.4, 1.56, .26, .4, 1.56, .26, 0, -.06, 0, 0, -.25],
    [1.5, -.48, 1.64, .2, .48, 1.64, .2, 0, -.08, .01, 0, -.32],
    [2.1, -.3, 1.0, .38, .3, 1.0, .38, 0, .14, -.08, .02, .25],
    [2.7, -.32, .95, .4, .32, .95, .4, 0, .16, -.1, .02, .3],
    [3.0, -.44, .86, .5, .44, .86, .5, 0, .2, -.12, .04, .18],
    [3.8, -.2, 1.05, .08, .2, 1.05, .08, 0, 0, 0, 0, 0]];
  // conjuração curta (habilidade): uma mão erguida à frente, a outra junto do peito
  const CONJURAR = [
    [0, -.2, 1.0, .06, .2, 1.0, .06, 0, 0, 0, 0, 0],
    [.35, -.12, 1.5, .46, .12, 1.25, .2, .12, .04, -.02, .02, -.08],
    [1.05, -.12, 1.52, .47, .12, 1.25, .2, .12, .04, -.02, .02, -.08],
    [1.6, -.2, 1.05, .08, .2, 1.05, .08, 0, 0, 0, 0, 0]];

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
  // bote do escorpião: [t, cauda (- enrola, + bote), avanço do corpo, pinças, agacha]
  const BOTE = [[0, 0, 0, 0, 0], [.32, -1.2, -.08, .2, .25], [.44, 2.6, .22, 1, -.1], [.62, 2.4, .2, 1, -.1], [.95, .6, .05, .4, 0], [1.25, 0, 0, 0, 0]];
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
    // anda com as oito patas em ondas alternadas (passo preso ao chão), inclina nas curvas; o ataque é o bote da
    // cauda por cima da cabeça com as pinças fechando; o ritual usa os braços do homem
    const mv = motor(g, { vPadrao: 1.6, vCorre: 3 });
    let fase = mv.sem * 6.283, ac = null, kAc = 0;
    const AKE = new Float32Array(5);
    const ptW = new T.Vector3();
    const anim = (dt, t, andando) => {
      mv.passo(dt, andando).vida(dt);
      const k = sstep(mv.k), kc = sstep(mv.kc);
      h.anim(dt, t, false);
      fase += mv.avanco(dt, .62 + .25 * kc);
      // ataque: [cauda enrola (-) / dá o bote (+), avanço do corpo, pinças fechando, corpo abaixa]
      let ab = 0, av = 0, pz = 0, ag = 0;
      if (ac) {
        ac.t += dt; const u = ac.t;
        if (u >= ac.dur) ac = null;
        else if (ac.tipo === 'ataque') { chave(BOTE, u, AKE); ab = AKE[1]; av = AKE[2]; pz = AKE[3]; ag = AKE[4]; }
      }
      const wH = h.partes.acaoPeso || 0;
      h.partes.bracos.forEach((b, i) => {
        b.ombro.rotation.x = (-.5 + Math.sin(t * 1.3 + i) * .12 - pz * .35) * (1 - wH) + b.ombro.rotation.x * wH;
        b.ombro.rotation.z = ((i ? 1 : -1) * (.35 + Math.sin(t * .9 + i * 2) * .06)) * (1 - wH) + b.ombro.rotation.z * wH;
        if (!wH) b.cot.rotation.x = -.5;
      });
      patas.forEach(({ p, sx, i }) => {
        const f = fase + i * 1.4 + (sx > 0 ? Math.PI : 0);
        p.rotation.y = Math.sin(f) * (.28 + .1 * kc) * k;
        p.rotation.z = Math.max(0, Math.cos(f)) * (.18 + .08 * kc) * sx * k;
      });
      bicho.position.y = Math.abs(Math.sin(fase * 2)) * .02 * k - ag * .08;
      bicho.position.z = av;
      bicho.rotation.z = Math.max(-.15, Math.min(.15, -mv.giro * mv.vEf * .04)) * k;
      bicho.rotation.x = k * .04 * kc + Math.max(-.05, Math.min(.06, mv.acel * .012)) * k + ag * .1;
      // a cauda balança devagar e às vezes dá o bote (sozinha ou no ataque)
      const bote = Math.max(0, Math.sin(t * .7 + mv.sem * 5) - .92) * 9 * (ac ? 0 : 1) + ab;
      cauda.forEach((c, i) => { if (i) c.rotation.x = .47 + Math.sin(t * 1.4 + i * .5) * .05 - bote * .12; c.rotation.y = Math.sin(t * .8 + i * .3) * .08 * (1 - Math.abs(ab) * .8); });
      pincas.forEach((pm, i) => { pm.rotation.z = -.1 - Math.max(0, Math.sin(t * 2.2 + i * 1.7)) * .45 * (1 - pz) - pz * .55; });
      abd.scale.y = 1 + Math.sin(t * 2 + mv.sem * 4) * .03;
      // gotas: caem do ferrão até o chão e recomeçam (só a cadeia da cauda é atualizada)
      pontaFim.updateWorldMatrix(true, false); ptW.setFromMatrixPosition(pontaFim.matrixWorld); g.worldToLocal(ptW);
      gotas.forEach(o => { const q = (t * .6 + o.f) % 1; o.gt.position.set(ptW.x, Math.max(.03, ptW.y * (1 - q * q)), ptW.z + .03); o.gt.visible = q < .97; });
    };
    const acao = (tipo, nome) => {
      if (tipo === 'ataque') ac = { tipo, t: 0, dur: BOTE[BOTE.length - 1][0] };
      else if (h.acao) h.acao(tipo, nome);
    };
    return { g, alt: 2.05, anim, acao, raioBase: .62 };
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
    sabonete: F => humano(F, { alt: 1.8, golpe: 'fogo', pele: '#5a4a3a', camisa: '#22252e', calca: '#24252b', sapato: '#2e2218', bota: true, maos: '#3a2618', manga: '#1d2436',
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
        const kp = 1 - p.mv.k;
        p.corpo.rotation.z += Math.sin(t * .9) * .025 * kp; p.cab.rotation.z += (Math.sin(t * .45) * .12 + .05) * kp;
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
  // ações dos robôs: [t, ombro dir., cotovelo dir., golpe (gira o tronco e fecha a garra), ombro esq., cotovelo esq., peso]
  const ROBO_GOLPE = [[0, 0, -.75, 0, 0, -.75, 0], [.12, .35, -1.3, -.3, .1, -.9, 1], [.3, .45, -1.45, -.5, .15, -1, 1], [.4, -1.35, -.15, 1, .1, -.9, 1], [.62, -1.3, -.2, 1, .1, -.9, 1], [.9, -.4, -.6, .3, .05, -.8, 1], [1.1, 0, -.75, 0, 0, -.75, 0]];
  const ROBO_RITUAL = [[0, 0, -.75, 0, 0, -.75, 0], [.6, -2.3, -.3, 0, -2.3, -.3, 1], [2.6, -2.4, -.25, 0, -2.4, -.25, 1], [3.0, -1.1, -.4, 0, -1.1, -.4, 1], [3.8, 0, -.75, 0, 0, -.75, 0]];
  const ROBO_CONJ = [[0, 0, -.75, 0, 0, -.75, 0], [.35, -1.5, -.2, 0, -.2, -.9, 1], [1.1, -1.5, -.2, 0, -.2, -.9, 1], [1.6, 0, -.75, 0, 0, -.75, 0]];
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
    const olhosR = [];
    [-1, 1].forEach(sx => {
      const o2 = sf(cab, .055, olhoM, sx * .078, .015, RH * .8, 18); o2.scale.set(1, 1.05, .55); olhosR.push(o2);
      if (ol) { const aro = new T.Mesh(F.guardar(new T.TorusGeometry(.055, .01, 6, 18)), m('#1a1a1a', { r: .5 })); aro.position.set(sx * .078, .015, RH * .8 + .012); aro.rotation.y = sx * .35; cab.add(aro); }
      else { sf(cab, .013, brilhoM, sx * .078 - .018, .036, RH * .8 + .028, 6); sf(cab, .006, brilhoM, sx * .078 + .016, -.008, RH * .8 + .028, 6); }
    });
    // capacete na cor do robô (aberto na frente) e fones de ouvido
    const cap = calota(F, cab, RH * 1.06, cor, Math.PI * .66, { abertura: 2.0, seg: 24, segV: 10 }); cap.rotation.x = -.12;

    [-1, 1].forEach(sx => {
      const f = cy(cab, .085, .085, .07, cor, 0, 0, 0, 18); f.rotation.z = Math.PI / 2; f.position.set(sx * RH * 1.04, .01, -.01);

    });
    if (ol) F.luz(cab, ol, .25, 1.6, 0, .02, .35);
    // movimento: as rodas giram com a distância real (sem patinar); o tronco tem peso, numa mola com amortecimento:
    // ao arrancar fica para trás, ao frear vai para frente e volta; nas curvas tomba para fora. A cabeça mira como um
    // servo (vai e assenta), os braços balançam com atraso e, parado, há pequenos ajustes hidráulicos: o cotovelo muda
    // de posição num tranco curto, a garra abre e fecha, os olhos piscam e a mola respira.
    const mv = motor(g, { vPadrao: 1.6, vCorre: 3 });
    const S = { p: 0, pv: 0, r: 0, rv: 0, ky: 0, kyv: 0, kx: 0, kxv: 0, mol: 0, molv: 0, tH: 1 + mv.sem * 2, alvoCt: [-.75, -.75], ct: [-.75, -.75], garra: [0, 0], alvoG: [0, 0], om0: 0, omv0: 0, om1: 0, omv1: 0 };
    // mola amortecida sem alocar: S[x] e S[v] são a posição e a velocidade
    const mola2 = (x, v, alvo, kk, c, dt) => { S[v] += ((alvo - S[x]) * kk - S[v] * c) * dt; S[x] += S[v] * dt; return S[x]; };
    let ac = null; const AKB = new Float32Array(7);
    const anim = (dt, t, andando) => {
      mv.passo(dt, andando).vida(dt);
      const k = sstep(mv.k), kp = 1 - k, h = Math.min(dt, .05);
      // rodas: ângulo = distância / raio (andando no lugar, gira na velocidade de passeio)
      const vr = mv.mov > .5 ? mv.vf : mv.vEf * k;
      for (let i = 0; i < rodas.length; i++) rodas[i].rotation.x += vr * dt / .175;
      // peso do tronco: inclinação para trás ao acelerar, para frente ao frear; tomba para fora nas curvas
      S.p = Math.max(-.3, Math.min(.3, mola2('p', 'pv', -mv.acel * .035 + k * .04, 70, 7, h)));
      S.r = Math.max(-.2, Math.min(.2, mola2('r', 'rv', mv.giro * mv.vEf * .035, 60, 6, h)));
      // mola da cintura: comprime com o peso, vibra no chão irregular e respira devagar parada
      mola2('mol', 'molv', -Math.abs(mv.acel) * .01 + Math.sin(t * 2 + mv.sem * 6) * .025 * kp, 90, 8, h);
      mola.scale.y = 1 + S.mol + Math.sin(t * 31 + mv.sem * 3) * .012 * k * Math.min(1, mv.vEf / 2);
      tronco.position.y = .86 + (mola.scale.y - 1) * .26;
      tronco.rotation.set(S.p, tronco.rotation.y, S.r);
      // cabeça: alvo do olhar com passos de servo (mola rígida que assenta com um leve tremor) e compensação do tronco
      mola2('ky', 'kyv', mv.oy * .55 * (1 - k * .6) + Math.max(-.35, Math.min(.35, mv.giro * .15)) * k, 140, 15, h);
      mola2('kx', 'kxv', mv.op * .4 * kp, 120, 13, h);
      cab.rotation.set(S.kx - S.p * .7, S.ky, Math.sin(t * .7 + mv.sem * 4) * .06 * kp - S.r * .6);
      // olhos piscam (a tampa é a escala vertical do olho)
      const pis = 1 - mv.pisca * .92; for (let i = 0; i < olhosR.length; i++) olhosR[i].scale.y = 1.05 * pis;
      // ajustes hidráulicos parado: troca o ângulo de um cotovelo e a abertura da garra de tempos em tempos
      S.tH -= dt;
      if (S.tH <= 0) { const i = mv.rnd() < .5 ? 0 : 1; S.alvoCt[i] = -.55 - mv.rnd() * .45; S.alvoG[i] = mv.rnd() < .4 ? .45 : 0; S.tH = 1.5 + mv.rnd() * 3.5; }
      let w = 0;
      if (ac) {
        ac.t += dt; const u = ac.t;
        if (u >= ac.dur) ac = null; else { chave(ac.K, u, AKB); w = 1; }
      }
      for (let i = 0; i < 2; i++) {
        const b = bracos[i];
        // braço balança com atraso (pêndulo pesado) contra a aceleração e no ritmo das rodas
        const alvoOm = k * (Math.sin(mv.dist * 2.4 + i * Math.PI) * .22 - mv.acel * .03) + kp * Math.sin(t * 1.3 + i + mv.sem * 4) * .04;
        mola2(i ? 'om1' : 'om0', i ? 'omv1' : 'omv0', alvoOm, 40, 5, h);
        // cotovelo: anda em degraus curtos (tranco hidráulico) até o alvo
        const d = S.alvoCt[i] - S.ct[i]; S.ct[i] += Math.sign(d) * Math.min(Math.abs(d), dt * 2.6);
        S.garra[i] += (S.alvoG[i] - S.garra[i]) * Math.min(1, dt * 9);
        let om = i ? S.om1 : S.om0, ct = S.ct[i] + Math.sin(t * 1.1 + i * 2) * .03 * kp, gz = 0, ab = .15 + S.garra[i] + Math.max(0, Math.sin(t * .9 + i * 1.7)) * .15 * kp;
        if (w) { const e = i ? AKB[4] : AKB[1]; om = om + (e - om) * AKB[6]; ct = ct + ((i ? AKB[5] : AKB[2]) - ct) * AKB[6]; gz = (i ? 1 : -1) * AKB[3] * .5; ab = ab + ((i ? .1 : AKB[3] > .5 ? -.1 : .7) - ab) * AKB[6]; }
        b.om.rotation.set(om, 0, gz); b.ct.rotation.set(ct, 0, 0);
        for (let j = 0; j < b.dedos.length; j++) b.dedos[j].rotation.x = -.3 - ab;
      }
      if (w) { tronco.rotation.y = AKB[3] * .35 * AKB[6]; tronco.position.z = AKB[3] * .06 * AKB[6]; cab.rotation.x -= AKB[6] * (ac && ac.tipo !== 'ataque' ? .35 : 0); }
      else { tronco.rotation.y *= Math.max(0, 1 - dt * 8); tronco.position.z *= Math.max(0, 1 - dt * 8); }
    };
    // ataque: o braço direito recua, dá o golpe com a garra fechada e volta; ritual e conjuração: ergue os braços
    const acao = tipo => { const K = tipo === 'ataque' ? ROBO_GOLPE : tipo === 'ritual' ? ROBO_RITUAL : tipo === 'conjurar' ? ROBO_CONJ : null; if (K) ac = { K, t: 0, dur: K[K.length - 1][0], tipo }; };
    return { g, alt: 1.55, anim, acao };
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
  // rastejante: [t, recua/avança, bote do braço, ergue o tronco]
  const BOTE_RAST = [[0, 0, 0, 0], [.28, -.12, -.15, 0], [.42, .3, 1, 0], [.66, .26, .9, 0], [1.1, 0, 0, 0]];
  const RITUAL_RAST = [[0, 0, 0, 0], [.7, 0, 0, 1], [2.6, 0, 0, 1], [3.0, .1, 0, .3], [3.8, 0, 0, 0]];
  const CONJ_RAST = [[0, 0, 0, 0], [.4, 0, 0, .6], [1.1, 0, 0, .6], [1.6, 0, 0, 0]];
  const AKR = new Float32Array(4);
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
    // pretos; mãos normais (sem nada nelas)
    'cara-palida': (F, s) => humano(F, { alt: 2.0, golpe: 'branca', porte: .86, bracoLongo: 1.1, pele: '#e8e6e2', camisaTex: tecidoTex(F, '#0e0e11', { sem: 81, dobras: true, costuras: [0, .5] }),
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
          // IK no espaço do mundo do token, convertido para o corpo deitado (sem alocar por quadro)
          const Mi = new T.Matrix4(), Qi = new T.Quaternion(), vA = new T.Vector3(), vP = new T.Vector3(), qb = new T.Quaternion(), qc = new T.Quaternion();
          const ik = (br, ax, ay, az, px, py, pz) => { vA.set(ax, ay, az).applyMatrix4(Mi); vP.set(px, py, pz).applyQuaternion(Qi); ikQ(T, br, vA.x, vA.y, vA.z, vP.x, vP.y, vP.z, qb, qc); br.ombro.rotation.set(0, 0, 0); br.braco.quaternion.copy(qb); br.cot.quaternion.copy(qc); br.fixo = true; };
          // passo do rastejar: braço de um lado anda junto com a perna do outro; alc estica o braço direito à frente
          // (bote) e ergue os dois (ritual)
          p.rastejar = (f, amp, alc = 0, ergue = 0) => {
            corpo.updateMatrix(); Mi.copy(corpo.matrix).invert(); Qi.copy(corpo.quaternion).invert();
            bracos.forEach((b, i) => {
              const ph = f + (i ? Math.PI : 0), r = i ? 0 : alc;
              ik(b, b.k * .3 * (1 - r * .5) * (1 - ergue * .3), .03 + Math.max(0, Math.cos(ph)) * .07 * amp + r * .3 + ergue * .55, .55 + Math.sin(ph) * .12 * amp + r * .5 - ergue * .25, b.k, .7, -.4);
            });
            pernasIK.forEach((pp, i) => {
              const ph = f + (i ? 0 : Math.PI);
              ik(pp, pp.k * .24, .06 + Math.max(0, Math.cos(ph)) * .05 * amp, -.3 + Math.sin(ph) * .1 * amp, pp.k * .3, -.3, 1);
            });
          };
          // pés descalços dobrados para trás, rente ao chão
          pernas.forEach(pp => { const pe = pp.joelho.children[1]; pe.children.forEach(c => { c.visible = false; }); const f = F.sf(pe, .04, p.mt('#a8a59a', { r: .7 }), 0, -.07, 0, 8); f.scale.set(.9, 2.2, .7); });
          p.rastejar(0, 0);
          p.fase = 0;
        },
        // de quatro: o passo fica preso ao chão pela velocidade real; parado, respira e olha em volta devagar.
        // Ataque: recua e dá o bote com o braço; ritual: ergue o tronco e os braços
        anim: (dt, t, andando, p) => {
          const mv = p.mv.vida(dt), k = sstep(mv.k);
          p.fase += mv.avanco(dt, .8);
          let dz = 0, alc = 0, erg = 0;
          if (p.ac) { p.ac.t += dt; const u = p.ac.t; if (u >= p.ac.K[p.ac.K.length - 1][0]) p.ac = null; else { chave(p.ac.K, u, AKR); dz = AKR[1]; alc = AKR[2]; erg = AKR[3]; } }
          p.corpo.rotation.x = 1.3 - erg * .55;
          p.corpo.position.set(Math.sin(p.fase) * .02 * k, erg * .12, -1.1 + dz + erg * .35);
          p.corpo.rotation.z = Math.sin(p.fase) * .05 * k + Math.max(-.12, Math.min(.12, -mv.giro * mv.vEf * .04)) * k;
          p.rastejar(p.fase, k, alc, erg);
          p.cab.rotation.x = -1.5 + erg * .45 - alc * .15;
          p.cab.rotation.y = mv.oy * .3 * (1 - k * .6) + Math.sin(t * .35 + mv.sem * 6) * .08; p.cab.rotation.z = Math.sin(t * .6) * .1;
          p.tronco.scale.x = 1 + Math.sin(t * 2.2 + mv.sem * 5) * .02;
        } });
      h.acao = tipo => { const K = tipo === 'ataque' ? BOTE_RAST : tipo === 'ritual' ? RITUAL_RAST : tipo === 'conjurar' ? CONJ_RAST : null; if (K) h.partes.ac = { K, t: 0 }; };
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
    const mv = motor(g, { vPadrao: 1.5 });
    // flutua: inclina com a velocidade real e para dentro das curvas, a mortalha arrasta atrás
    const anim = (dt, t, andando) => {
      mv.passo(dt, andando).vida(dt);
      const k = sstep(mv.k);
      flut.position.y = .2 + Math.sin(t * 1.1 + mv.sem * 6) * .06;
      lean += ((.12 + .1 * Math.min(1.6, mv.vEf / 2)) * k + Math.max(-.08, Math.min(.12, mv.acel * .03)) * k - lean) * Math.min(1, dt * 3);
      flut.rotation.x = lean; flut.rotation.z = Math.max(-.2, Math.min(.2, -mv.giro * mv.vEf * .05)) * k;
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
      const mv = motor(g, { vPadrao: 1.6 }); let fase = 0;
      anim = (dt, t, andando) => { mv.passo(dt, andando); const k = sstep(mv.k); fase += mv.avanco(dt, .9) + dt * 1.5 * (1 - k); pernas.forEach((p, i) => { p.rotation.x = Math.sin(fase + i * 1.6) * (.05 + .3 * k); }); corpo.position.y = Math.sin(t * 2) * .02; cab.rotation.z = Math.sin(t * 3) * .3; };
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
      const mv = motor(g, { vPadrao: forma === 'colosso' ? 1.3 : 1.8 });
      let fase = mv.sem * 6.283;
      anim = (dt, t, andando) => {
        mv.passo(dt, andando);
        const k = sstep(mv.k);
        fase += mv.avanco(dt, alt * (forma === 'colosso' ? .75 : .85));
        const a = Math.sin(fase) * .45 * k;
        pernas[0].rotation.x = a; pernas[1].rotation.x = -a;
        bracos[0].rotation.x = -a * .7 + Math.sin(t * .9) * .08 * (1 - k); bracos[1].rotation.x = a * .7 + Math.sin(t * .9 + 1) * .08 * (1 - k);
        corpo.rotation.z = Math.max(-.15, Math.min(.15, -mv.giro * mv.vEf * .04)) * k;
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
  // um <script> por endereço na página toda (mapa_v2.js e moveis_v2.js usam o mesmo registro, ACF3D.scripts)
  const carregarScript = src => { const R = (window.ACF3D = window.ACF3D || {}).scripts = (window.ACF3D || {}).scripts || {}; return R[src] || (R[src] = new Promise((ok, falha) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = e => { delete R[src]; s.remove(); falha(e); }; document.head.appendChild(s); })); };
  function carregarModelos() {
    if (pedindo) return pedindo;
    pedindo = fetch('modelos/modelos.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(async j => {
      manifesto = j || {};
      if (Object.keys(manifesto).length && window.THREE && !THREE.GLTFLoader) { try { await V2.carregarLibs(THREE); } catch (e) { manifesto = {}; } }
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

  /* ================= modelos V2 (.glb feitos no Blender) =================
     V1 = a miniatura montada em código (acima); V2 = o modelo .glb da mesma forma, em modelos/v2/<arquivo>.
     - Sob demanda: só baixa o .glb de uma forma quando um token dessa forma aparece (uma vez por arquivo; vários
       tokens iguais dividem a mesma cópia baixada). Bibliotecas r128 servidas pelo próprio site (lib/), com cache.
     - A V1 aparece na hora; a V2 entra no lugar quando termina de carregar. Se falhar ou passar de V2_PRAZO, a V1 fica.
     - Altura fixa por forma (do catálogo), sem medir caixa (a caixa de um modelo com esqueleto sai errada).
     - Cada cópia: SkeletonUtils.clone (geometria, materiais e texturas divididos), um AnimationMixer, malhas com
       esqueleto sem corte por câmera (a caixa da pose de repouso cortava braço e cabeça animados).
     - Níveis *_lod0/1/2: só um visível por distância (8 e 20 m, com folga para não ficar trocando).
     - Animação: perto, todo quadro; LOD médio, metade; longe, ~10 Hz; fora da câmera ou além de V2_CONGELA, parada
       (o ritmo é o mesmo das V1: ritmoDe abaixo).
     - Clipes: parado, andar, correr, ataque, revelar, curvada (+ parado_extra, o tique). Os humanoides dividem um
       pacote de animações (rig 'humanoide': anim_humanoide.glb), ligado pelo nome dos ossos. O que não tem clipe
       (ritual, conjurar) é feito por cima dos ossos, no próprio código (braços sobem, cabeça vai para trás).
     - Qualidade: só com a qualidade Alta (Opções › Gráficos; desempenho.js decide no Automático).
     Para entrar uma forma nova: o .glb em modelos/v2/ e uma linha em V2_CAT (v = versão do arquivo, troca a cada
     entrega para o cache do aparelho baixar de novo). */
  const TOK_V = ((document.currentScript && document.currentScript.src) || '').split('?')[1] || '';
  const LIB = 'lib/';
  const LIB_V = '?v=r128';
  const V2_DIR = 'modelos/v2/';
  const V2_PRAZO = 20000;       // ms: passou disso sem a V2, o token fica com a V1 nesta sessão
  const V2_PERTO = 8, V2_LONGE = 20, V2_FOLGA = 1, V2_CONGELA = 40;
  // forma (a mesma chave das formas V1) → arquivo, versão, altura em metros, esqueleto
  // pronto: false = arquivo ainda não entregue (nem tenta baixar; a V1 fica)
  const V2_CAT = {
    freira_cranio_equino: { arq: 'freira_cranio_equino.glb', v: '20261104d', alt: 3.4, rig: 'proprio' },
    mascara_sorriso: { arq: 'mascara_sorriso_cachecol.glb', v: '20261104e', alt: 2.0, rig: 'humanoide' },
    manto_coroa_tentaculos: { arq: 'manto_coroa_tentaculos.glb', v: '20261104e', alt: 4.07, rig: 'humanoide' },
    esqueleto_foice: { arq: 'esqueleto_foice.glb', v: '20261104e', alt: 2.2, rig: 'humanoide' },
    chama_soldado: { arq: 'chama_soldado_v3.glb', v: '20261105a', alt: 2.25, rig: 'humanoide', chama: true, v3: true },   // humano V3 (decisão do Mestre)
    sobretudo_vazio: { arq: 'sobretudo_vazio.glb', v: '20261105a', alt: 2.2, rig: 'humanoide' },
    esfolado: { arq: 'esfolado.glb', v: '20261105a', alt: 2.19, rig: 'humanoide' },
    tita_algemado: { arq: 'tita_algemado.glb', v: '20261105a', alt: 3.4, rig: 'humanoide' },
    aureola_mascara: { arq: 'aureola_mascara.glb', v: '20261104g', alt: 2.4, rig: 'humanoide' },
    afogada: { arq: 'afogada.glb', v: '20261105a', alt: 2.32, rig: 'humanoide' },
    marionetista: { arq: 'marionetista.glb', v: '20261105a', alt: 2.5, rig: 'humanoide' },
    muitos_bracos: { arq: 'muitos_bracos.glb', v: '20261105a', alt: 2.36, rig: 'humanoide' },
    cabelos_longos: { arq: 'cabelos_longos.glb', v: '20261105a', alt: 3.0, rig: 'humanoide' },
    olhos_muitos: { arq: 'olhos_muitos.glb', v: '20261107a', alt: 1.84, rig: 'proprio' },
    boca_no_tronco: { arq: 'boca_no_tronco.glb', v: '20261107a', alt: 2.6, rig: 'proprio' },
    // estática: chuvisco de TV e faixas de falha por shader (só onde o atributo _estatica = 1); cabelo até ~2,4 m
    estatica_tres_cabecas: { arq: 'estatica_tres_cabecas.glb', v: '20261107a', alt: 2.4, rig: 'humanoide', vel: { andar: 1.5, correr: 3.0 }, estatica: true },
    // disfarce de candelabro: clipes de transição (uma vez), passada própria, a luz da V1 vai para o osso da lamparina
    aranha_gaiola: { arq: 'aranha_gaiola.glb', v: '20261107a', alt: 3.9, rig: 'proprio', umaVez: ['virar_candelabro', 'soltar'], vel: { andar: 1.0, correr: 2.4 },
      disfarce: { estado: 'candelabro', entra: 'virar_candelabro', solto: 'solto', sai: 'soltar' }, luzOsso: 'luz' },
    // humanos em V3 (low-poly pintado, decisão do Mestre): entram quando o arquivo chegar (pronto: false até lá; V1)
    coroa_espinhos_sobretudo: { arq: 'coroa_espinhos_sobretudo_v3.glb', v: '20261105a', alt: 1.95, rig: 'humanoide', v3: true },
    encapuzada_meia_mascara: { arq: 'encapuzada_meia_mascara_v3.glb', v: '20261105a', alt: 1.95, rig: 'humanoide', v3: true },
    // NPCs em V3 (mesmo esqueleto e pacote dos humanos; clipes próprios por cima). O rastejante tem parado, andar,
    // correr, ataque e afins de quatro no próprio arquivo (alt menor: o nome fica perto do corpo)
    homem_mascara_coelho: { arq: 'homem_mascara_coelho.glb', v: '20261108b', alt: 1.97, rig: 'humanoide', v3: true },
    homem_terno_sem_rosto: { arq: 'homem_terno_sem_rosto.glb', v: '20261108a', alt: 2.1, rig: 'humanoide', v3: true },
    palhaca_vestido_preto: { arq: 'palhaca_vestido_preto.glb', v: '20261108a', alt: 1.66, rig: 'humanoide', v3: true },
    homem_palido_rastejante: { arq: 'homem_palido_rastejante.glb', v: '20261108a', alt: 1.2, rig: 'humanoide', v3: true },
  };
  // NPC (id do personagem) → modelo V3 próprio; os outros NPCs seguem no corpo de cobaia de macacão
  const V3_NPC = { coelho: 'homem_mascara_coelho', 'cara-palida': 'homem_terno_sem_rosto', risa: 'palhaca_vestido_preto', onirico: 'homem_palido_rastejante' };
  /* corpo V2 das cobaias: UM arquivo com o corpo e todas as peças (cobaia_base.glb); o script montador (cobaia_v3.js) junta as peças de
     cada token numa malha só (+ cabelo, + peças exclusivas da aparência num arquivo próprio, cobaia_x_<aparência>.glb,
     baixado só quando ela está na sessão) e pinta pelas tintas. Cobaias completas na V2 e os NPCs (macacão na cor do
     token); as de outro corpo (escorpião, criança) seguem na V1. Presets do agente das
     cobaias (cobaia_presets.json): peças, morfos, tintas, marcas, etiqueta (3 últimos dígitos do código), altura. */
  // trocar de versão do corpo dos humanos = trocar só esta linha (arquivo, versão, script montador e o nome global dele)
  const V2_COB_ARQ = { arq: 'cobaia_v3.glb', v: '20261105c', script: 'cobaia_v3.js', global: 'CobaiaV3' };   // arq: corpo padrão (o preset diz o seu em 'arquivo': masculino, feminino, criança)
  const V2_COBAIA = {"luva":{"alt":1.84,"pecas":["camiseta","calca","tenis","cinto","cab_baguncado","rosto_olho_roxo"],"morfos":{"feminino":0,"forte":0.3},"tintas":{"pele":"#d9a88a","cabelo":"#5a3a22","iris":"#4a5a6a","cima":"#ef6a14","baixo":"#e8650f","sapato":"#eeeeea","acessorio":"#141414"},"barba":1,"sardas":0,"sobrancelhas":1,"marca":1,"etiqueta":[0,0,6],"ferimento":0.45,"sangueFresco":0.35,"arquivo":"cobaia_v3.glb"},"faca":{"alt":1.62,"pecas":["camiseta","calca","botas","cinto","cab_coque","x_faca_bolsa","x_faca_planta","x_faca_frasco","x_faca_alca","x_faca_bolsinhas","x_faca_bolsos","oculos_redondos"],"morfos":{"feminino":0,"forte":0},"tintas":{"pele":"#e2bea4","cabelo":"#3b2416","iris":"#5a4422","cima":"#e4dccb","baixo":"#56603e","sapato":"#7a3a2a","acessorio":"#2a2220"},"barba":0,"sardas":1,"sobrancelhas":1,"marca":1,"etiqueta":[0,0,1],"ferimento":0.2,"sangueFresco":0.3,"pose":"pose_faca","arquivo":"cobaia_v3_f.glb"},"papelao":{"alt":1.92,"pecas":["macacao","botas","band_cabeca","x_papelao_sobretudo","x_papelao_ombreiras","x_papelao_faixas","x_papelao_avental","x_papelao_garras"],"morfos":{"feminino":0,"forte":0},"tintas":{"pele":"#8a8a82","cabelo":"#202020","iris":"#ffd84a","cima":"#2e2e30","baixo":"#2a2a2c","sapato":"#121212","acessorio":"#8f8d84"},"barba":0,"sardas":0,"sobrancelhas":0,"marca":0,"etiqueta":[0,0,4],"ferimento":0.25,"sangueFresco":0.2,"olhosBrilho":1,"corBrilho":"#ffc21a","arquivo":"cobaia_v3.glb"},"papel":{"alt":1.7,"pecas":["calca","tenis","brincos","cab_trancas","x_papel_jaleco","x_papel_camisa"],"morfos":{"feminino":0,"forte":0},"tintas":{"pele":"#5a3a2a","cabelo":"#140e0b","iris":"#2a1a10","cima":"#121214","baixo":"#111113","sapato":"#0c0c0c","acessorio":"#111111"},"barba":0,"sardas":0,"sobrancelhas":1,"marca":1,"etiqueta":[0,0,5],"ferimento":0.1,"sangueFresco":0.3,"pose":"pose_papel","esconderMaos":true,"arquivo":"cobaia_v3_f.glb"},"sabonete":{"alt":1.8,"pecas":["macacao","botas","x_sabonete_capa","x_sabonete_capuz","x_sabonete_mascara","x_sabonete_tubo","x_sabonete_cachecol","x_sabonete_couraca","x_sabonete_revolver"],"morfos":{"feminino":0,"forte":0},"tintas":{"pele":"#5a4a3a","cabelo":"#202020","iris":"#ff2a1a","cima":"#22252e","baixo":"#24252b","sapato":"#2e2218","acessorio":"#3a3328"},"barba":0,"sardas":0,"sobrancelhas":0,"marca":0,"etiqueta":[0,0,2],"ferimento":0.15,"olhosBrilho":1,"corBrilho":"#ff1a0a","pose":"pose_sabonete","arquivo":"cobaia_v3.glb"},"velcro":{"alt":1.2,"arquivo":"cobaia_v3_c.glb","pecas":["tenis","cab_franja_longa","x_velcro_vestido","x_velcro_meias"],"morfos":{"feminino":0,"forte":0},"tintas":{"pele":"#ecd8c8","cabelo":"#151214","iris":"#d9781c","cima":"#262427","baixo":"#262427","sapato":"#141214","acessorio":"#141214"},"barba":0,"sardas":0,"sobrancelhas":1,"marca":0,"etiqueta":[0,0,0],"ferimento":0,"sangueFresco":0.3,"pose":"pose_velcro"}};
  const V2_NPC = {"alt":1.74,"pecas":["macacao","tenis","cab_baguncado"],"morfos":{"feminino":0,"forte":0},"tintas":{"pele":"#cfa588","cabelo":"#2b1d14","iris":"#3a2a1a","cima":"#d9661f","baixo":"#cf5f1a","sapato":"#2a2a2a","acessorio":"#1a1a1a"},"barba":0,"sardas":0,"sobrancelhas":1,"marca":0,"etiqueta":[0,0,0],"ferimento":0.05,"sangueFresco":0.3,"arquivo":"cobaia_v3.glb"};
  const V2_ANIM = { humanoide: { arq: 'anim_humanoide.glb', v: '20261107a' } };
  const V2 = {
    libs: null, cache: new Map(), falhas: new Set(), ap: null, vivos: new Set(), tSoltar: 0,
    stats: { pedidos: 0, prontos: 0, falhas: 0, trocas: 0, msBaixar: 0, msParse: 0, bytes: 0 },
    // a qualidade decide (desempenho.js); sem o seletor carregado, vale a V2
    ligado() { try { return !window.ACF_QUALIDADE || ACF_QUALIDADE.v2() !== false; } catch (e) { return true; } },
    // por modelo: personagens V3 (cobaias, NPCs, criaturas V3) na Média e na Alta; criaturas V2 só na Alta
    ligadoPara(e) {
      if (!this.ligado()) return false;
      if (!e || e.cobaia || e.v3) return true;
      try { const Q = window.ACF_QUALIDADE; return !Q || typeof Q.modelosV2 !== 'function' || Q.modelosV2() !== false; } catch (er) { return true; }
    },
    entrada(forma) { const e = forma && Object.prototype.hasOwnProperty.call(V2_CAT, forma) ? V2_CAT[forma] : null; return e && e.pronto !== false ? e : null; },
    entradaCobaia(s) {
      if (!s) return null;
      if (s.tipo === 'npc' && V3_NPC[s.id]) return this.entrada(V3_NPC[s.id]);
      let p = s.tipo === 'cobaia' ? V2_COBAIA[s.id] : s.tipo === 'npc' ? V2_NPC : null;
      if (!p) return null;
      p = JSON.parse(JSON.stringify(p));
      if (s.tipo === 'npc' && s.cor) { p.tintas.cima = s.cor; p.tintas.baixo = s.cor; }
      const dg = String(s.codigo || '').replace(/\D/g, '').slice(-3).padStart(3, '0'); if (dg) p.etiqueta = dg.split('').map(Number);
      return { cobaia: true, preset: p, alt: p.alt || 1.75, arq: p.arquivo || V2_COB_ARQ.arq, v: V2_COB_ARQ.v, rig: 'humanoide' };
    },
    // um corpo-base das cobaias (uma vez por arquivo e por sessão do 3D; só baixa o corpo de quem está em cena)
    cobaiaBase(T, arq) {
      arq = arq || V2_COB_ARQ.arq;
      if (!this.cob) this.cob = new Map();
      if (this.cob.has(arq)) return this.cob.get(arq);
      this.stats.pedidos++;
      const pr = (async () => {
        await this.carregarLibs(T);
        if (!window[V2_COB_ARQ.global]) await carregarScript(V2_COB_ARQ.script + (TOK_V ? '?' + TOK_V : ''));
        const t0 = performance.now(), M = window[V2_COB_ARQ.global];
        const b = await M.carregar(T, this.url({ arq, v: V2_COB_ARQ.v }), this.url(V2_ANIM.humanoide), window.MeshoptDecoder);
        b.extrasV2 = new Map();
        this.stats.msParse += performance.now() - t0; this.stats.prontos++;
        return b;
      })();
      this.cob.set(arq, pr);
      pr.catch(e => { this.stats.falhas++; this.falhas.add(this.url({ arq, v: V2_COB_ARQ.v })); console.warn('cobaia V3:', e); if (this.cob) this.cob.delete(arq); });
      return pr;
    },
    url(e) { return V2_DIR + e.arq + '?v=' + e.v; },
    // pré-carga da abertura (sala3d.js): bibliotecas, montador e os .glb dos tokens do andar vão para o cache
    // (lista: [{ s, forma }]; mesma regra de qualidade de quem vai usar: ligadoPara)
    preCarregar(lista) {
      const aq = (window.ACF3D || {}).aquecer; if (!aq || !this.ligado()) return;
      const us = new Set(); let humano = false, cob = false;
      (lista || []).forEach(({ s, forma }) => {
        if (!s) return;
        const e = s.tipo === 'filho' ? this.entrada(forma) : (s.tipo === 'cobaia' || s.tipo === 'npc') ? this.entradaCobaia(s) : null;
        if (!e || !this.ligadoPara(e) || this.falhas.has(this.url(e))) return;
        us.add(this.url(e)); if (e.rig === 'humanoide') humano = true; if (e.cobaia) cob = true;
      });
      if (!us.size) return;
      if (!(window.THREE && THREE.GLTFLoader)) { aq(LIB + 'GLTFLoader.js' + LIB_V); aq(LIB + 'SkeletonUtils.js' + LIB_V); }
      if (!window.MeshoptDecoder) aq(LIB + 'meshopt_decoder.js' + LIB_V);
      if (cob && !window[V2_COB_ARQ.global]) aq(V2_COB_ARQ.script + (TOK_V ? '?' + TOK_V : ''));
      if (humano) aq(this.url(V2_ANIM.humanoide));
      us.forEach(aq);
    },
    urls() { return Object.values(V2_CAT).filter(e => e.pronto !== false).concat(Object.values(V2_ANIM), [...new Set([V2_COB_ARQ.arq, ...Object.values(V2_COBAIA).map(p => p.arquivo).filter(Boolean)])].map(arq => ({ arq, v: V2_COB_ARQ.v }))).map(e => new URL(this.url(e), location.href).href); },
    carregarLibs(T) {
      if (this.libs) return this.libs;
      const um = f => carregarScript(LIB + f + LIB_V);
      this.libs = (async () => {
        if (!T.GLTFLoader) await um('GLTFLoader.js');
        if (!T.SkeletonUtils) await um('SkeletonUtils.js');
        if (!window.MeshoptDecoder) await um('meshopt_decoder.js');
        if (window.MeshoptDecoder && MeshoptDecoder.ready) await MeshoptDecoder.ready;
      })();
      this.libs.catch(() => { this.libs = null; });
      return this.libs;
    },
    // KTX2 (Basis): só quando um arquivo usa (o transcodificador tem ~0,5 MB)
    async ktx2(T, ren) {
      if (this.ktx) return this.ktx;
      if (!T.BasisTextureLoader) await carregarScript(LIB + 'BasisTextureLoader.js' + LIB_V);
      if (!T.KTX2Loader) await carregarScript(LIB + 'KTX2Loader.js' + LIB_V);
      const k = new T.KTX2Loader(); k.setTranscoderPath(LIB + 'basis/'); k.setWorkerLimit(1);
      if (ren) k.detectSupport(ren);
      this.ktx = k; return k;
    },
    // baixa e lê um arquivo (uma vez): devolve o gltf
    gltf(T, url) {
      let p = this.cache.get(url);
      if (p) return p;
      this.stats.pedidos++;
      p = (async () => {
        await this.carregarLibs(T);
        const t0 = performance.now();
        const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status);
        const buf = await r.arrayBuffer(); const t1 = performance.now();
        const ld = new T.GLTFLoader();
        if (window.MeshoptDecoder) ld.setMeshoptDecoder(MeshoptDecoder);
        // o arquivo usa texturas KTX2? (procura no cabeçalho JSON do .glb, sem ler o resto)
        if (/KHR_texture_basisu/.test(new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(buf.byteLength, 65536))))) ld.setKTX2Loader(await this.ktx2(T, this.ap && this.ap.ren));
        const g = await new Promise((ok, falha) => ld.parse(buf, url.replace(/[^/]*$/, ''), ok, falha));
        const t2 = performance.now();
        this.stats.msBaixar += t1 - t0; this.stats.msParse += t2 - t1; this.stats.bytes += buf.byteLength; this.stats.prontos++;
        enxugarClipes(g);
        return g;
      })();
      p.catch(e => { this.stats.falhas++; this.falhas.add(url); console.warn('modelo V2:', url, e); });
      this.cache.set(url, p);
      return p;
    },
    // clipes de uma forma (uma vez por arquivo): os do pacote do esqueleto + os do próprio arquivo (estes mandam).
    // Do pacote saem as trilhas de ossos que o modelo não tem (evita avisos e trabalho à toa) e a posição da pelve,
    // que é absoluta, é escalada para a altura do quadril deste modelo (rig/LEIAME.md)
    async clipes(T, e, g) {
      if (g.userData.clipesV2) return g.userData.clipesV2;
      const m = new Map();
      if (e.rig && V2_ANIM[e.rig]) {
        try {
          const pa = await this.gltf(T, this.url(V2_ANIM[e.rig]));
          const nomes = new Set(); let hM = 0, hP = 0;
          g.scene.traverse(o => { nomes.add(o.name); if (o.name === 'pelve') hM = o.position.y; });
          pa.scene.traverse(o => { if (o.name === 'pelve') hP = o.position.y; });
          const k = hM > 0 && hP > 0 ? hM / hP : 1;
          pa.animations.forEach(c0 => {
            const c = c0.clone();
            c.tracks = c.tracks.filter(tr => nomes.has(tr.name.split('.')[0]));
            if (Math.abs(k - 1) > 1e-3) c.tracks.forEach(tr => { if (tr.name === 'pelve.position') { const v = tr.values; for (let i = 0; i < v.length; i++) v[i] *= k; } });
            m.set(c.name, c);
          });
        } catch (er) {}
      }
      g.animations.forEach(c => m.set(c.name, c));
      g.userData.clipesV2 = m;
      return m;
    },
    // ao fechar o 3D: solta o que foi lido (a 2ª abertura pega o arquivo do cache do aparelho)
    soltar() {
      this.cache.forEach(p => p.then(g => {
        g.scene.traverse(o => { if (!o.isMesh) return; [].concat(o.material).forEach(mt => { Object.values(mt).forEach(v => { if (v && v.isTexture) { try { if (v.image && v.image.close) v.image.close(); } catch (er) {} v.dispose(); } }); mt.dispose(); }); o.geometry.dispose(); });
      }).catch(() => {}));
      this.cache.clear(); this.vivos.clear(); this.cob = null;
    },
    // a qualidade mudou com o 3D aberto (desempenho.js): sem a Alta, as cópias V2 voltam para a V1 na hora
    aplicarQualidade() {
      this.vivos.forEach(w => { if (!w.g.parent) { this.vivos.delete(w); return; } if (!this.ligadoPara(w.entV2)) w.voltarV1(); });
    },
    estado() { return { ...this.stats, ligado: this.ligado(), arquivos: this.cache.size, falhas: [...this.falhas] }; },
  };
  // trilhas que não mexem em nada (valor constante igual ao do osso em repouso) saem do clipe: o mixer só
  // calcula o que se move (os arquivos exportados trazem posição e escala de todos os ossos)
  function enxugarClipes(g) {
    const nos = new Map(); g.scene.traverse(o => { nos.set(o.name, o); });
    const igual = (a, b, n) => { for (let i = 0; i < n; i++) if (Math.abs(a[i] - b[i]) > 1e-4) return false; return true; };
    g.animations.forEach(c => {
      c.tracks = c.tracks.filter(tr => {
        const [nome, prop] = tr.name.split('.'); const o = nos.get(nome); if (!o) return true;
        const n = tr.getValueSize(), v = tr.values, k = v.length / n;
        for (let i = 1; i < k; i++) if (!igual(v.subarray(i * n, i * n + n), v, n)) return true;   // mexe: fica
        const rep = prop === 'position' ? o.position.toArray() : prop === 'scale' ? o.scale.toArray() : prop === 'quaternion' ? o.quaternion.toArray() : null;
        return !(rep && igual(v, rep, n));
      });
      c.resetDuration();
    });
  }
  // por cima dos ossos (o que não tem clipe): gira o osso no espaço do mundo em volta do eixo lateral do corpo
  function sobreposicao(T, raiz) {
    const ossos = { bd: null, be: null, cab: null, pesc: null };
    raiz.traverse(o => {
      if (!o.isBone) return; const n = o.name.toLowerCase();
      if (!ossos.bd && /^(braco|upper_?arm|arm)[._]?(d|r|right)$/.test(n)) ossos.bd = o;
      else if (!ossos.be && /^(braco|upper_?arm|arm)[._]?(e|l|left)$/.test(n)) ossos.be = o;
      else if (!ossos.cab && /^(cabeca|head)$/.test(n)) ossos.cab = o;
      else if (/^(pescoco|neck)\d*$/.test(n)) ossos.pesc = o;
    });
    if (!ossos.bd && !ossos.be && !ossos.cab) return null;
    const qp = new T.Quaternion(), qd = new T.Quaternion(), qi = new T.Quaternion(), eixo = new T.Vector3(), q0 = new T.Quaternion();
    // osso que nenhum clipe mexe (a trilha constante saiu): sem o mixer para reescrever, o giro somaria a cada quadro;
    // guarda a rotação de antes e volta a ela se ninguém mexeu desde o último quadro
    const mem = new Map();
    [ossos.bd, ossos.be, ossos.cab, ossos.pesc].forEach(o => { if (o) mem.set(o, { antes: o.quaternion.clone(), depois: o.quaternion.clone() }); });
    // dq (mundo) vira local: local' = (pai⁻¹ · dq · pai) · local
    function girar(osso, eixoMundo, ang) {
      if (!osso) return;
      const m = mem.get(osso);
      if (osso.quaternion.equals(m.depois)) osso.quaternion.copy(m.antes); else m.antes.copy(osso.quaternion);
      if (ang) {
        osso.parent.getWorldQuaternion(qp); qi.copy(qp).invert();
        qd.setFromAxisAngle(eixoMundo, ang);
        q0.copy(qi).multiply(qd).multiply(qp);
        osso.quaternion.premultiply(q0);
      }
      m.depois.copy(osso.quaternion);
    }
    return function (k, t, tipo) {
      raiz.updateMatrixWorld(true);
      // eixo lateral do corpo (o grupo do token olha para +Z, então o lado é o X do token)
      eixo.set(1, 0, 0).applyQuaternion(raiz.getWorldQuaternion(qp)).normalize();
      const ex = eixo.clone();
      const forte = tipo === 'ritual' ? 1 : .6;
      girar(ossos.bd, ex, -2.1 * k * forte + Math.sin(t * 5) * .06 * k);
      girar(ossos.be, ex, -2.1 * k * forte + Math.sin(t * 5 + 1) * .06 * k);
      girar(ossos.pesc, ex, -.25 * k * forte);
      girar(ossos.cab, ex, -.45 * k * forte + Math.sin(t * 9) * .03 * k);
    };
  }
  // as "peças" no formato das miniaturas V1 (cab, pesc, tronco, corpo, braços com a mão, pernas com o joelho e o raio
  // da cabeça R), apontando para os ossos do esqueleto humanoide: os detalhes da cópia (disfarce3d.js) usam as mesmas
  // chaves nos dois. Sem os ossos, null (a decoração fica só com o que não depende do corpo).
  function partesDeOssos(cena, e, skel) {
    const o = {}; cena.traverse(x => { if (x.isBone) o[x.name] = x; });
    if (!o.cabeca) return null;
    // um ponto do modelo em repouso (metros, como no Blender exportado: y para cima, frente +Z) nas coordenadas do osso
    const noOsso = (nome, p) => { const b = o[nome]; if (!b || !skel) return null; const i = skel.bones.indexOf(b); if (i < 0) return null; return new b.position.constructor(p[0], p[1], p[2]).applyMatrix4(skel.boneInverses[i]); };
    const R = .115 * (e.alt || 1.75) / 1.75;
    return { R, sxC: .82, szC: .92, cab: o.cabeca, pesc: o.pescoco || o.pescoco1 || null, tronco: o.peito || o.coluna2 || null, corpo: cena,
      bracos: [['e', -1], ['d', 1]].filter(([l]) => o['mao_' + l]).map(([l, k]) => ({ mao: o['mao_' + l], braco: o['braco_' + l], cot: o['antebraco_' + l], k })),
      pernas: [['e', -1], ['d', 1]].filter(([l]) => o['canela_' + l]).map(([l, k]) => ({ quad: o['coxa_' + l], joelho: o['canela_' + l], pe: o['pe_' + l], k })), ossos: o, noOsso };
  }
  // chama (catálogo chama: true): o emissivo tremeluz, deslocando um pouco a UV só nos texels roxos/rosa do emissivo
  // (a chama) e variando o brilho; o tempo só anda quando alguma cópia está à vista (é a animação dela que avança)
  const CHAMA_T = { value: 0 };
  function chamaCompilar(sh) {
    sh.uniforms.uTempo = CHAMA_T;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTempo;')
      .replace('#include <emissivemap_fragment>', `#ifdef USE_EMISSIVEMAP
  vec4 eC0 = texture2D(emissiveMap, vUv);
  vec2 eD = vec2(sin(uTempo * 9.0 + vUv.y * 70.0), cos(uTempo * 7.0 + vUv.x * 55.0)) * .004;
  vec4 eC1 = texture2D(emissiveMap, vUv + eD);
  float roxo = smoothstep(.08, .3, eC0.b - eC0.g);
  vec4 eC = mix(eC0, eC1, roxo); eC.rgb = emissiveMapTexelToLinear(eC).rgb;
  totalEmissiveRadiance *= eC.rgb * (1.0 + roxo * (.3 * sin(uTempo * 13.0 + vUv.y * 40.0) + .15 * sin(uTempo * 31.0)));
#endif`);
  }
  // V3: o .glb diz o retângulo da cabeça de chama no atlas (asset.extras.rolagem.retangulo_uv, UV do glTF); dentro dele
  // a cor e o emissivo rolam em v (o padrão é periódico): a chama sobe. Fora do retângulo nada muda.
  function chamaV3Compilar(sh) {
    const r = this.userData.retChama; sh.uniforms.uTempo = CHAMA_T;
    const R = `vec4(${r.map(x => (+x).toFixed(5)).join(', ')})`;
    const uvc = `vec2 cUv = vUv; vec4 cR = ${R};
  if (cUv.x > cR.x && cUv.x < cR.z && cUv.y > cR.y && cUv.y < cR.w) cUv.y = cR.y + fract((cUv.y - cR.y) / (cR.w - cR.y) + uTempo * .35) * (cR.w - cR.y);`;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTempo;')
      .replace('#include <map_fragment>', `#ifdef USE_MAP
  { ${uvc}
  vec4 texelColor = mapTexelToLinear(texture2D(map, cUv)); diffuseColor *= texelColor; }
#endif`)
      .replace('#include <emissivemap_fragment>', `#ifdef USE_EMISSIVEMAP
  { ${uvc}
  totalEmissiveRadiance *= emissiveMapTexelToLinear(texture2D(emissiveMap, cUv)).rgb * (1.0 + .15 * sin(uTempo * 13.0)); }
#endif`);
  }
  function prepararChama(g) {
    if (g.userData.chamaOk) return; g.userData.chamaOk = 1;
    const rol = (((g.parser || {}).json || {}).asset || {}).extras;
    const ret = rol && rol.rolagem && rol.rolagem.retangulo_uv;
    if (ret && ret.length === 4) {
      g.scene.traverse(o => { if (!o.isMesh) return; [].concat(o.material).forEach(m => { if (m && m.onBeforeCompile !== chamaV3Compilar) { m.userData.retChama = ret; m.onBeforeCompile = chamaV3Compilar; m.customProgramCacheKey = () => 'chamaV3' + ret.join(','); m.needsUpdate = true; } }); });
      return;
    }
    g.scene.traverse(o => { if (!o.isMesh) return; [].concat(o.material).forEach(m => { if (m && m.emissiveMap && m.onBeforeCompile !== chamaCompilar) { m.onBeforeCompile = chamaCompilar; m.customProgramCacheKey = () => 'chama'; m.needsUpdate = true; } }); });
  }
  /* ---------- estática (chuvisco de TV): grão trocando 20 vezes por segundo, varredura e faixas que deslocam a malha
     de lado. Tempo e intensidade divididos por todas as cópias (uma forma rara). ---------- */
  const EST_T = { value: 0 }, EST_F = { value: .1 };
  const EST_HS = 'float hsE(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }';
  function estaticaCompilar(sh) {
    sh.uniforms.uT = EST_T; sh.uniforms.uFalha = EST_F;
    sh.vertexShader = 'attribute float _estatica;\nvarying float vEst;\nvarying vec3 vPw;\nuniform float uT; uniform float uFalha;\n' + sh.vertexShader
      .replace('#include <skinning_vertex>', `#include <skinning_vertex>
  vEst = _estatica;
  { vec4 w0 = modelMatrix * vec4(transformed, 1.0); float bY = w0.y * 14.0 - uT * 3.2; float bI = floor(bY);
    float bH = fract(sin(bI * 91.7 + floor(uT * 7.0) * 3.1) * 43758.5); float on = step(1.0 - (0.05 + uFalha * 0.35), bH) * _estatica;
    transformed.x += on * (bH - 0.5) * (0.08 + uFalha * 0.3); }`)
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vPw = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying float vEst;\nvarying vec3 vPw;\nuniform float uT; uniform float uFalha;\n' + EST_HS + '\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
  float quadro = floor(uT * 20.0);
  float nF = hsE(floor(vPw * vec3(170.0, 210.0, 170.0)) + quadro * 0.37);
  float nG = hsE(floor(vPw * vec3(26.0, 34.0, 26.0)) + quadro * 0.11);
  float tv = nF * 0.8 + nG * 0.2;
  float bY = vPw.y * 14.0 - uT * 3.2; float bH = fract(sin(floor(bY) * 91.7 + floor(uT * 7.0) * 3.1) * 43758.5);
  float faixaOn = step(1.0 - (0.05 + uFalha * 0.35), bH);
  float linha = 0.78 + 0.22 * sin(vPw.y * 380.0 + uT * 40.0);
  vec3 cTv = mix(vec3(0.04, 0.01, 0.08), vec3(0.47, 0.15, 0.81), smoothstep(0.05, 0.38, tv)); cTv = mix(cTv, vec3(1.0, 0.95, 1.0), smoothstep(0.42, 0.82, tv));
  float riscoF = step(0.5, fract(vPw.y * 120.0)); cTv = mix(cTv, mix(vec3(0.5, 0.12, 0.95), vec3(0.95, 0.75, 1.0), nF) * riscoF, faixaOn * 0.85);
  float lum = dot(diffuseColor.rgb, vec3(0.3, 0.5, 0.2));
  float kEst = vEst * 0.85 * smoothstep(0.015, 0.06, lum);
  diffuseColor.rgb = mix(diffuseColor.rgb, cTv * linha * (0.25 + 1.6 * lum), kEst);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance = mix(totalEmissiveRadiance, (mix(vec3(0.22, 0.05, 0.42), vec3(0.95, 0.85, 1.0), smoothstep(0.55, 0.95, tv)) * (0.04 + tv * 0.4) + vec3(0.6, 0.22, 1.0) * faixaOn * (0.4 + nF) * 0.7), kEst);`);
  }
  function prepararEstatica(g) {
    if (g.userData.estaticaOk) return; g.userData.estaticaOk = 1;
    g.scene.traverse(o => { if (!o.isMesh) return; [].concat(o.material).forEach(m => { if (m && m.onBeforeCompile !== estaticaCompilar) { m.onBeforeCompile = estaticaCompilar; m.customProgramCacheKey = () => 'estatica'; m.needsUpdate = true; } }); });
  }
  let estPulso = 0;
  // uma cópia da V2 para um token (chamada quando o arquivo terminou de ler)
  // pronta: cópia já montada por fora (cobaia_v2.js: grupo, mixer, lod por troca de geometria, slots do detalhe)
  function instanciaV2(T, g, clipes, e, pronta) {
    const cena = pronta ? pronta.grupo : T.SkeletonUtils.clone(g.scene);
    if (pronta) cena.scale.setScalar((e.alt || 1.75) / ((g && g.meta && g.meta.altura) || 1.75));
    const lods = [[], [], []], sempre = [];
    let skel = null;
    cena.traverse(o => {
      if (!o.isMesh) return;
      o.onBeforeRender = marcarCam;
      if (o.isSkinnedMesh) {
        o.frustumCulled = false;
        // um esqueleto só para as malhas da cópia (uma atualização dos ossos por quadro em vez de uma por malha)
        if (!skel) skel = o.skeleton;
        else if (o.skeleton.bones.length === skel.bones.length && o.skeleton.bones.every((b, i) => b === skel.bones[i]) && o.skeleton.boneInverses.every((m, i) => m.equals(skel.boneInverses[i]))) o.bind(skel, o.bindMatrix);
      }
      const m = pronta ? null : /_lod(\d)$/.exec(o.name);
      if (m) lods[Math.min(2, +m[1])].push(o); else sempre.push(o);
      o.castShadow = !m || +m[1] < 2; o.receiveShadow = false;
    });
    const temLod = lods[1].length || lods[2].length;
    const mixer = pronta ? pronta.mixer : new T.AnimationMixer(cena), acts = {};
    if (pronta) mixer.stopAllAction();
    clipes.forEach((c, nome) => { acts[nome] = mixer.clipAction(c); });
    ['ataque', 'revelar', 'parado_extra', 'morto', ...(e.umaVez || [])].forEach(n => { const a = acts[n]; if (a) { a.setLoop(T.LoopOnce, 1); a.clampWhenFinished = true; } });
    const DISF = e.disfarce || null;
    // a passada natural dos clipes é a de um corpo de 1,75 m: corpo maior dá passo maior
    const escPasso = Math.max(.5, (e.alt || 1.75) / 1.75);
    let estBase = '', corpoAnt = '';
    let base = null, uma = null, curvada = false, nivel = -1, tExtra = 8 + Math.random() * 8, kSob = 0, alvoSob = 0, tSob = 0, tipoSob = '';
    const sob = sobreposicao(T, cena);
    // cobaia: pose fixa da V1 (braço/antebraço) por cima dos clipes que não pedem os braços (cobaia_v3.js: aplicarPose)
    const POSE = pronta && pronta.cfg && pronta.cfg.pose && pronta.poses ? pronta.poses[pronta.cfg.pose] : null;
    const COM_POSE = ['parado', 'andar', 'correr', 'agachar', 'curvada', 'andar_tras', 'andar_lado_e', 'andar_lado_d', 'andar_agachado'];
    // teto baixo: quanto cada clipe abaixa a cabeça (medido no pacote: agachar e andar agachado ~0,64, curvada ~0,83)
    const FRAC_TETO = { andar_agachado: .66, agachar: .66, curvada: .85 };
    let tetoNeed = 1, tetoClipe = '';
    let nomeBase = '';
    function trocarBase(nome) {
      const a = acts[nome] || acts.parado; if (!a || a === base) return;
      nomeBase = acts[nome] ? nome : 'parado';
      a.reset().setEffectiveWeight(1).play();
      if (base && !uma) base.crossFadeTo(a, .3, false); else a.fadeIn(.3);
      if (base && uma) base.fadeOut(.3);
      base = a;
    }
    mixer.addEventListener('finished', ev => {
      if (ev.action !== uma) return;
      const a = uma; uma = null;
      if (base) { base.reset().play(); a.crossFadeTo(base, .35, false); }
    });
    function tocarUma(nome) {
      const a = acts[nome]; if (!a) return false;
      if (uma && uma !== a) uma.fadeOut(.2);
      a.reset().setEffectiveWeight(1).play();
      if (base) base.crossFadeTo(a, .2, false); else a.fadeIn(.2);
      uma = a; return true;
    }
    trocarBase('parado');
    if (base) { base.time = Math.random() * base.getClip().duration; }
    mixer.update(0);
    return {
      g: cena, mixer,
      // vel: m/s do token (o andar acompanha a passada); corpo: '' | 'ferido' | 'morrendo' | 'morto' | 'agachado'
      anim(dt, andando, vel, corpo, dir) {
        // cobaia: o ferimento e o sangue acompanham o estado do corpo (máscaras do material, sem modelo novo)
        if (pronta && corpo !== corpoAnt) {
          corpoAnt = corpo; const c0 = pronta.cfg0 || (pronta.cfg0 = { f: +pronta.cfg.ferimento || 0, s: +pronta.cfg.sangueFresco || 0 });
          pronta.definir(corpo === 'morrendo' || corpo === 'morto' ? { ferimento: .9, sangueFresco: 1 } : corpo === 'ferido' ? { ferimento: Math.min(1, c0.f + .3), sangueFresco: Math.max(c0.s, .6) } : { ferimento: c0.f, sangueFresco: c0.s });
        }
        let quer;
        if (corpo === 'morto' && acts.morto) quer = 'morto';
        else if (corpo === 'morrendo' && acts.caido) quer = 'caido';
        else if (estBase) quer = estBase;
        else if (curvada && acts.curvada) quer = 'curvada';
        else if (tetoNeed < .97 && corpo !== 'morto' && corpo !== 'morrendo') quer = tetoClipe = andando ? (acts.andar_agachado ? 'andar_agachado' : acts.curvada ? 'curvada' : 'andar') : (tetoNeed >= FRAC_TETO.curvada && acts.curvada ? 'curvada' : acts.agachar ? 'agachar' : acts.curvada ? 'curvada' : 'parado');
        else if (andando) {
          quer = corpo === 'ferido' && acts.ferido ? 'ferido' : vel > 2.2 && acts.correr ? 'correr' : acts.andar ? 'andar' : 'correr';
          // de lado ou de costas (o corpo olha para um lado e anda para outro): clipes do pacote
          if (corpo !== 'ferido' && dir) { const d = dir === 'tras' ? 'andar_tras' : dir === 'e' ? 'andar_lado_e' : dir === 'd' ? 'andar_lado_d' : ''; if (d && acts[d]) quer = d; }
        }
        else quer = corpo === 'agachado' && acts.agachar ? 'agachar' : corpo === 'ferido' && acts.curvada ? 'curvada' : 'parado';
        if (tetoNeed >= .97) tetoClipe = '';
        // passada: o clipe anda na velocidade natural do pacote (andar 1,3 m/s, correr 2,9 m/s, ferido 0,8 m/s)
        const nat = { andar: 1.3, correr: 2.9, ferido: .8, andar_tras: .6, andar_lado_e: .68, andar_lado_d: .68, andar_agachado: .6 }[quer];
        // passada própria do arquivo (forma que não é humana): velocidade natural já na escala do corpo
        const natP = e.vel && e.vel[quer];
        if ((natP || nat) && vel > .05 && acts[quer]) acts[quer].timeScale = Math.max(.6, Math.min(1.7, vel / (natP || nat * escPasso)));
        if (!uma) trocarBase(quer); else if (acts[quer] && acts[quer] !== base) { base = acts[quer]; nomeBase = quer; }
        // o tique de vez em quando, parado
        if (!andando && !uma && acts.parado_extra) { tExtra -= dt; if (tExtra <= 0) { tExtra = 9 + Math.random() * 9; tocarUma('parado_extra'); } }
        mixer.update(dt);
        if (POSE && !uma && COM_POSE.includes(nomeBase)) { const O = pronta.ossos; for (const n in POSE) if (O[n]) O[n].quaternion.copy(POSE[n]); }
        // ritual / conjurar: por cima dos ossos, sobe, segura e desce
        if (sob && (kSob > 0 || alvoSob > 0)) {
          tSob += dt; if (tSob > (tipoSob === 'ritual' ? 2.8 : 1.6)) alvoSob = 0;
          kSob += (alvoSob - kSob) * Math.min(1, dt * 5); if (kSob < .01 && !alvoSob) kSob = 0;
          sob(kSob, tSob, tipoSob);   // (com k = 0 devolve os ossos à pose do clipe)
        }
      },
      // teto baixo: need = altura livre / altura do corpo; devolve quanto o clipe escolhido abaixa (1 = nada)
      agachar(need) { tetoNeed = need; return tetoClipe ? (FRAC_TETO[tetoClipe] || 1) : 1; },
      get clipe() { return uma ? '' : nomeBase; },
      get uma() { return uma ? uma.getClip().name + ':' + uma.time.toFixed(2) + '/' + uma.getClip().duration.toFixed(2) + (uma.isRunning() ? '' : ' parada') : ''; },
      acao(tipo) {
        const n = tipo === 'atacar' ? 'ataque' : tipo;
        // atacar ou se revelar desfaz o disfarce (como na V1)
        if (DISF && estBase === DISF.estado && (n === 'ataque' || n === 'revelar')) estBase = '';
        if (acts[n]) return tocarUma(n);
        if ((tipo === 'ritual' || tipo === 'conjurar') && sob) { tipoSob = tipo; tSob = 0; alvoSob = 1; return true; }
        return false;
      },
      estado(nome) {
        if (DISF && nome === DISF.estado) { if (estBase !== DISF.estado) { estBase = DISF.estado; if (acts[DISF.entra]) tocarUma(DISF.entra); } return; }
        if (DISF && nome === DISF.solto) { if (estBase === DISF.estado) { estBase = ''; if (acts[DISF.sai]) tocarUma(DISF.sai); } return; }
        if (nome === 'curvada' || nome === 'curvado') { curvada = true; estBase = ''; }
        else if (nome === 'ereta' || nome === 'ereto' || nome === 'padrao' || !nome) { curvada = false; estBase = ''; }
        else if (acts[nome] && acts[nome].loop !== T.LoopOnce) estBase = nome;   // escalar, rastejar…: o clipe do estado vira a base
      },
      partes: partesDeOssos(cena, e, skel),
      cobaia: pronta || null,
      lod(dist) {
        if (pronta) return pronta.lod(dist);
        if (!temLod) return 0;
        let n = nivel < 0 ? (dist > V2_LONGE ? 2 : dist > V2_PERTO ? 1 : 0) : nivel;
        if (nivel >= 0) {
          if (dist > V2_LONGE + (nivel < 2 ? V2_FOLGA : 0)) n = 2;
          else if (dist < V2_LONGE - (nivel >= 2 ? V2_FOLGA : 0) && dist > V2_PERTO + (nivel < 1 ? V2_FOLGA : 0)) n = 1;
          else if (dist < V2_PERTO - (nivel >= 1 ? V2_FOLGA : 0)) n = 0;
        }
        if (n !== nivel) { nivel = n; lods.forEach((l, i) => l.forEach(o => { o.visible = i === n || (!lods[n].length && i === 0); })); }
        return n;
      },
    };
  }
  // embrulha a miniatura V1 de uma forma que tem V2: o token devolvido é o mesmo para o site (g, anim, acao, estado,
  // lod), e por dentro troca da V1 para a V2 quando ela chega
  function comV2(F, v1, e, id) {
    const T = F.T;
    const g = new T.Group(); g.add(v1.g);
    const w = { g, alt: v1.alt, raioBase: v1.raioBase, v1, v2: null, nivelLOD: 0 };
    let st = '', dist = 0;
    let px = 0, pz = 0, vel = 0, dirAt = '', dirNovo = '', tDir = 0;
    // disfarce (aranha de gaiola): para quem joga, a base, o anel e o nome somem enquanto ela finge ser objeto
    let tDisf = 0, disfLimpo = false;
    const disfarce = () => {
      const D = e.disfarce; if (!D) return;
      const A = window.ACF, quer = st === D.estado && !(A && (A.mestre || A.aux)), agora = performance.now();
      if (!quer) tDisf = 0; else if (!tDisf) tDisf = agora;
      const esconder = quer && agora - tDisf > 1200;   // (relógio: vale mesmo se a criatura estava fora da câmera)
      if (esconder === disfLimpo && !esconder) return;
      g.children.forEach(ch => { if (ch === w.corpoTeto || ch === v1.g || (w.v2 && ch === w.v2.g)) return; const u = ch.userData;
        if (esconder) { if (!u.dfEsc0) u.dfEsc0 = ch.scale.clone(); if (ch.scale.x > .001) ch.scale.setScalar(.0001); u.dfLimpo = true; }
        else if (u.dfLimpo) { ch.scale.copy(u.dfEsc0); u.dfLimpo = false; } });
      disfLimpo = esconder;
    };
    w.anim = (dt, tt, andando) => {
      disfarce();
      if (w.pend) w.trocar();
      if (!w.v2) return v1.anim ? v1.anim(dt, tt, andando) : undefined;
      // velocidade do token (o sala3d.js move o grupo): suavizada, para o andar acompanhar a passada
      const dx = g.position.x - px, dz = g.position.z - pz; px = g.position.x; pz = g.position.z;
      if (dt > 0) vel += (Math.min(8, Math.hypot(dx, dz) / dt) - vel) * Math.min(1, dt * 6);
      // andando para trás ou de lado em relação à frente do corpo (+Z girado por rotation.y): troca só depois de 0,15 s
      if (andando && Math.hypot(dx, dz) > 1e-4) {
        let rel = Math.atan2(dx, dz) - g.rotation.y; while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI;
        const ab = Math.abs(rel), q = ab < 1.05 ? '' : ab > 2.1 ? 'tras' : rel > 0 ? 'e' : 'd';
        if (q !== dirNovo) { dirNovo = q; tDir = 0; } else if (q !== dirAt && (tDir += dt) > .15) dirAt = q;
      } else if (!andando) { dirAt = dirNovo = ''; }
      if (dist > V2_CONGELA) return;
      if (e.chama) CHAMA_T.value = tt;
      if (e.estatica) { EST_T.value = tt; estPulso = Math.max(0, estPulso - (dt || 0)); EST_F.value = .1 + .4 * Math.min(1, estPulso / .6); }
      w.v2.anim(dt, andando, vel, w.estCorpo || '', dirAt);
    };
    w.acao = (tipo, nome) => {
      if (e.estatica && (tipo === 'atacar' || tipo === 'ataque' || tipo === 'revelar')) estPulso = 1.4;   // a falha estoura no golpe e ao aparecer
      if (w.v2) { if (w.v2.acao(tipo)) return; }
      if (typeof v1.acao === 'function') return v1.acao(tipo, nome);
    };
    w.estado = nome => { st = nome; if (w.v2) w.v2.estado(nome); if (typeof v1.estado === 'function') v1.estado(nome); };
    w.lod = d => {
      dist = d;
      if (w.v2) return (w.nivelLOD = w.v2.lod(d));
      if (typeof v1.lod === 'function') { v1.lod(d); w.nivelLOD = v1.nivelLOD || 0; }
      return w.nivelLOD;
    };
    const nomeY = alt => g.children.forEach(c => { if (c.isSprite) c.position.y = alt + .32; });
    // luz da V1 (PointLight da lamparina): com a V2, vai para o osso de mesmo papel e volta ao sair
    const luzesV1 = [];
    const moverLuzes = x => {
      if (!e.luzOsso) return;
      if (x) { let osso = null; x.g.traverse(o => { if (!osso && o.isBone && o.name === e.luzOsso) osso = o; }); if (!osso) return;
        v1.g.traverse(o => { if (o.isPointLight) luzesV1.push({ l: o, pai: o.parent, p: o.position.clone() }); });
        luzesV1.forEach(L => { osso.add(L.l); L.l.position.set(0, 0, 0); }); }
      else { luzesV1.forEach(L => { if (L.pai) { L.pai.add(L.l); L.l.position.copy(L.p); } }); luzesV1.length = 0; }
    };
    w.voltarV1 = () => { w.pend = null; if (!w.v2) return; moverLuzes(null); const pai = w.pai || g; pai.remove(w.v2.g); w.v2.mixer.stopAllAction(); w.v2 = null; w.alt = v1.alt; pai.add(v1.g); nomeY(v1.alt); V2.vivos.delete(w); };
    // peças do corpo para quem decora a miniatura (disfarce3d.js): as da V1 ou, com a V2, os ossos equivalentes
    Object.defineProperty(w, 'partes', { configurable: true, enumerable: true, get: () => (w.v2 ? w.v2.partes : v1.partes) });
    w.entV2 = e;
    if (!V2.ligadoPara(e) || V2.falhas.has(V2.url(e))) return w;
    const t0 = performance.now();
    (e.cobaia ? V2.cobaiaBase(T, e.arq).then(async b => {
      // peças exclusivas da aparência (uma vez por arquivo)
      let x = null;
      if (e.preset.extras) { const u = V2.url({ arq: e.preset.extras, v: V2_COB_ARQ.v }); if (!b.extrasV2.has(u)) b.extrasV2.set(u, window[V2_COB_ARQ.global].carregarExtras(T, b, u, window.MeshoptDecoder)); x = await b.extrasV2.get(u); }
      return { cob: b, extras: x };
    }) : V2.gltf(T, V2.url(e))).then(async gl => {
      const clipes = gl.cob ? new Map(Object.entries(gl.cob.clipes)) : await V2.clipes(T, e, gl);
      // o token já saiu de cena, ou demorou demais: fica a V1
      if (!g.parent || performance.now() - t0 > V2_PRAZO) return;
      if (!V2.ligadoPara(e)) return;
      if (e.chama && !gl.cob) prepararChama(gl);
      if (e.estatica && !gl.cob) prepararEstatica(gl);
      // humanos V3 (low-poly pintado): pixels nítidos de perto (Nearest só nestes)
      if (e.v3 && !gl.cob && !gl.userData.v3ok) { gl.userData.v3ok = 1; gl.scene.traverse(o => { if (o.isMesh) [].concat(o.material).forEach(m => ['map', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'aoMap'].forEach(k => { const t = m && m[k]; if (t && t.magFilter !== T.NearestFilter) { t.magFilter = T.NearestFilter; t.needsUpdate = true; } })); }); }
      const x = gl.cob ? instanciaV2(T, gl.cob, clipes, e, Object.assign(window[V2_COB_ARQ.global].montar(T, gl.cob, gl.extras ? { ...e.preset, extras: gl.extras } : e.preset), { poses: gl.cob.poses || null })) : instanciaV2(T, gl, clipes, e);
      const tok = g.userData.token;
      x.g.traverse(o => { if (tok !== undefined) o.userData.token = tok; });
      if (st) x.estado(st);
      x.lod(dist || 0);
      // entra escondida: o aquecedor do 3D sobe as texturas em fatias; a troca acontece quando ele terminar (ou em
      // até 3 s), sem engasgo no quadro da troca. Cópias seguintes da mesma forma já acham tudo pronto.
      w.pend = x; w.tPend = performance.now();
      try { const ctx = V2.ap && V2.ap.ctx; if (ctx && ctx.aquecer) ctx.aquecer(x.g); else w.tPend = 0; } catch (er) { w.tPend = 0; }
    }).catch(() => {});
    // a troca de fato (chamada a cada quadro enquanto há uma cópia esperando)
    w.trocar = () => {
      const x = w.pend, aq = V2.ap && V2.ap.ctx && V2.ap.ctx.aq;
      if (!V2.ligadoPara(e)) { w.pend = null; return; }
      if (w.tPend && performance.now() - w.tPend < 3000 && aq && aq.pendentes()) return;
      w.pend = null; w.v2 = x; w.alt = e.alt;
      // a V1 sai da árvore (outros módulos que acendem os filhos do token não a trazem de volta) e a V2 entra
      w.pai = v1.g.parent || g; w.pai.remove(v1.g); w.pai.add(x.g); V2.vivos.add(w);   // (pai: o grupo do corpo das cobaias)
      moverLuzes(x);
      // o nome (posto pelo sala3d.js em cima da V1) acompanha a altura da V2
      nomeY(e.alt);
      V2.stats.trocas++;
    };
    return w;
  }
  NS.v2 = V2;
  // a vista 3D avisa quando abre e fecha (o aquecedor e a renderização vêm dela; ao fechar solta os arquivos lidos)
  // (fechar e abrir de novo logo em seguida, como na troca de andar, reaproveita o que já foi lido)
  (NS.vista = NS.vista || []).push({
    iniciar(ap) { V2.ap = ap; clearTimeout(V2.tSoltar); },
    fechar() { V2.ap = null; V2.vivos.clear(); clearTimeout(V2.tSoltar); V2.tSoltar = setTimeout(() => { if (!V2.ap) V2.soltar(); }, 8000); },
  });

  /* ---------- o corpo mostra o estado (vitais publicadas pela ficha ativa) ----------
     ferido (PV abaixo da metade): manca ao andar; morrendo (PV 0): cai e se arrasta pelo chão;
     enlouquecendo (SAN 0): treme. A base da miniatura não se mexe. */
  function estadoDoCorpo(T, t, id) {
    const corpo = new T.Group();
    [...t.g.children].filter(c => c !== t.base).forEach(c => corpo.add(c));
    t.g.add(corpo); t.corpo = corpo;
    const animO = t.anim; let est = '', tE = 0, kc = 0, kf = 0, kt = 0;
    const estadoDe = () => {
      const tk = ((window.ACF && window.ACF.estado) || {}).tokens || {}, v = (tk[id] || {}).vit;
      if (!v) return '';
      if ((v.pv ?? 1) <= 0) return 'morrendo';
      if ((v.san !== undefined && v.san <= 0) || (v.det && (v.pd ?? 1) <= 0)) return 'enlouquecendo';
      if (v.pvM && v.pv < v.pvM / 2) return 'ferido';
      return '';
    };
    t.anim = (dt, tt, andando) => {
      tE -= dt; if (tE <= 0) { tE = .5; est = estadoDe(); }
      // modelo V2: o estado vira clipe (ferido, caído) e máscara de ferimento; aqui só o tremor de quem enlouquece
      if (t.v2) {
        t.estCorpo = est === 'enlouquecendo' ? '' : est;
        if (animO) animO(dt, tt, andando);
        kt += ((est === 'enlouquecendo' ? 1 : 0) - kt) * Math.min(1, dt * 4);
        corpo.rotation.set(0, kt * (Math.random() - .5) * .08, kt * (Math.random() - .5) * .05); corpo.position.set(kt * (Math.random() - .5) * .02, 0, 0);
        return;
      }
      if (animO) animO(dt, tt, andando);
      const suave = (x, alvo) => x + (alvo - x) * Math.min(1, dt * 4);
      kc = suave(kc, est === 'morrendo' ? 1 : 0); kf = suave(kf, est === 'ferido' ? 1 : 0); kt = suave(kt, est === 'enlouquecendo' ? 1 : 0);
      const passo = Math.sin(tt * 6);
      corpo.rotation.set(
        kc * (1.32 + (andando ? Math.sin(tt * 3) * .05 : 0)),
        kt * (Math.random() - .5) * .08,
        kf * (andando ? passo * .09 : .05) + kt * (Math.random() - .5) * .05);
      corpo.position.set(kt * (Math.random() - .5) * .02, kc * .16 - kf * (andando ? Math.abs(passo) * .045 : 0), -kc * .75 + (kc && andando ? Math.sin(tt * 3) * .06 : 0));
    };
  }

  /* ---------- fábrica principal ---------- */
  // s = ser (SER[tk.s]); forma = forma do Filho (mapa/formas); F = criarFabrica(...) do mundo
  function criarToken(F, id, s, forma) {
    const T = F.T;
    let t = modeloDe(T, id, s);
    semPendente = semDe(id);
    try { if (!t) {
      if (s.tipo === 'cobaia' && COBAIAS[s.id]) t = COBAIAS[s.id](F);
      else if (s.tipo === 'robo') t = robo(F, s.id, s);
      else if (s.tipo === 'filho') {
        // forma detalhada (filhos3d.js, baixado com o 3D) ou uma das genéricas
        const det = (NS.formasFilho || {})[forma];
        if (det) { try { t = det.criar(F, { ...s, semente: id }); } catch (e) { console.warn('3D forma:', forma, e); } }
        if (!t) t = criatura(F, s, FORMAS.includes(forma) ? forma : 'esguio');
      }
      else if (s.tipo === 'espectro') t = espectro(F, s);
      else t = npc(F, s);
    } } finally { semPendente = null; }
    // LOD (filhos3d.js): cobaias, robôs e criaturas genéricas também ganham os 3 níveis por distância
    if (NS.prepararLOD && !t.lod) { try { NS.prepararLOD(F, t); } catch (e) {} }
    // modelo V2 (.glb) da forma, se existir: a V1 fica por dentro e aparece até a V2 chegar
    if (!String(id).startsWith('_ensaio_')) { const e2 = s.tipo === 'filho' ? V2.entrada(forma) : (s.tipo === 'cobaia' || s.tipo === 'npc') ? V2.entradaCobaia(s) : null; if (e2) t = comV2(F, t, e2, id); }
    // Filho: o corpo vai num grupo próprio, para agachar sob teto baixo sem mexer na base nem no nome
    if (s.tipo === 'filho') prepararTeto(T, t);
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
    if (s.tipo === 'cobaia' || s.tipo === 'npc') estadoDoCorpo(T, t, id);
    if (typeof t.acao === 'function' && s.tipo !== 'filho') ganchosAcao(t, id);
    ritmoDe(T, t);
    return t;
  }

  /* ---------- teto baixo (corredor 2,7 m, vão de porta 2,2 m): a criatura alta se agacha ----------
     sala3d.js chama t.teto(alturaLivre, dt). Com a V2 humanoide: andar agachado / agachar / curvada (pacote) e, se
     ainda não couber, encolhe só o que falta; V1 e esqueleto próprio: encolhe o corpo e inclina um pouco à frente.
     Suave (sem salto ao passar pela porta). Corpo que cabe: nada muda. */
  function prepararTeto(T, t) {
    const ct = new T.Group(); [...t.g.children].forEach(c => ct.add(c)); t.g.add(ct); t.corpoTeto = ct;
    let k = 1, lean = 0;
    t.teto = (h, dt) => {
      const alt = t.alt || 2, need = (h - .12) / alt;
      let alvo = 1, alvoLean = 0;
      const x = t.v2 && typeof t.v2.agachar === 'function' ? t.v2 : null;
      if (x) { const fr = x.agachar(need); alvo = need < .97 ? Math.min(1, need / fr) : 1; }
      else if (need < .97) { alvo = Math.max(.35, need); alvoLean = .3 * (1 - alvo); }
      if (Math.abs(alvo - k) < .002 && Math.abs(alvoLean - lean) < .002) return;
      const f = Math.min(1, (dt || .016) * 5); k += (alvo - k) * f; lean += (alvoLean - lean) * f;
      ct.scale.setScalar(k); ct.rotation.x = lean;
    };
  }

  /* ---------- ações das miniaturas: o golpe usa a arma do efeito; conjuração e ritual vêm do site ---------- */
  // o site chama acao('ataque') sem dizer a arma: o nome do golpe está no efeito publicado no token (fx.n).
  // A habilidade (fx.t 'hab') vira o gesto de conjurar; o ritual conjurado (nó "efeito", sigilo) vira o ritual.
  const REG = new Map();   // id do token -> miniaturas com ações
  let ouvindo = false, ultEf = 0;
  function ganchosAcao(t, id) {
    const ac0 = t.acao;
    t.acao = (tipo, nome) => {
      if (tipo === 'ataque' && nome == null) { try { const fx = ((((window.ACF || {}).estado || {}).tokens || {})[id] || {}).fx; if (fx && fx.t === 'atk') nome = fx.n; } catch (e) {} }
      return ac0(tipo, nome);
    };
    let set = REG.get(id); if (!set) REG.set(id, set = new Set());
    set.forEach(x => { if (!x.g.parent) set.delete(x); }); set.add(t);
    if (!ouvindo) { ouvindo = true; ouvirEfeitos(0); }
    // habilidade: olha o fx do token duas vezes por segundo (o mesmo que o site já publica)
    let ultFx = 0, tFx = 0; const animA = t.anim;
    t.anim = (dt, tt, andando) => {
      animA(dt, tt, andando);
      tFx -= dt; if (tFx > 0) return; tFx = .5;
      try {
        const fx = ((((window.ACF || {}).estado || {}).tokens || {})[id] || {}).fx;
        if (fx && fx.ts && fx.ts !== ultFx) { const novo = ultFx !== 0; ultFx = fx.ts; if (novo && fx.t === 'hab' && Date.now() - fx.ts < 6000) t.acao('conjurar'); }
      } catch (e) {}
    };
  }
  function ouvirEfeitos(n) {
    const b = window.ACF;
    if (b && b.Rede && b.Rede.on && b.pronto) {
      try {
        b.Rede.on('efeito', e => {
          if (!e || !e.ts || e.ts <= ultEf) return; const velho = !ultEf; ultEf = e.ts;
          if (velho && Date.now() - e.ts > 8000) return;
          if (e.t !== 'sigilo' || !e.quem) return;
          const set = REG.get(e.quem); if (!set) return;
          set.forEach(x => { if (!x.g.parent) { set.delete(x); return; } try { x.acao('ritual'); } catch (er) {} });
        }, () => {});
      } catch (e) {}
    } else if (n < 240) setTimeout(() => ouvirEfeitos(n + 1), 500);
  }

  /* ---------- ritmo da animação: perto, todo quadro; LOD médio, metade; silhueta, ~10 Hz; fora da câmera, nada ----------
     A câmera é a última que desenhou alguma miniatura (onBeforeRender das malhas). Chamadas com tempo que não segue o
     relógio (prévias, o LOD testando materiais) rodam sempre, inteiras. NS.animTudo = true desliga o corte. */
  let camVista = null, FR = null, PV = null, tFR = -1, ESF = null;
  function marcarCam(r, cena, cam) { if (cam !== camVista && cam.isPerspectiveCamera && !(cam.parent && cam.parent.type === 'CubeCamera')) camVista = cam; }
  function naVista(T, t, tt) {
    if (!camVista) return true;
    if (!FR) { FR = new T.Frustum(); PV = new T.Matrix4(); ESF = new T.Sphere(); }
    if (tt !== tFR) { tFR = tt; PV.multiplyMatrices(camVista.projectionMatrix, camVista.matrixWorldInverse); FR.setFromProjectionMatrix(PV); }
    ESF.center.setFromMatrixPosition(t.g.matrixWorld); ESF.center.y += (t.alt || 1.7) * .5; ESF.radius = (t.alt || 1.7) * .8 + (t.raioBase || .4) + .6;
    return FR.intersectsSphere(ESF);
  }
  function ritmoDe(T, t) {
    if (!t || typeof t.anim !== 'function' || t.__ritmo) return;
    t.__ritmo = true;
    t.g.traverse(o => { if (o.isMesh && o.onBeforeRender === T.Object3D.prototype.onBeforeRender) o.onBeforeRender = marcarCam; });
    // cada miniatura vive no seu próprio relógio (deslocado pela semente): os parados não ficam sincronizados
    const anim = t.anim, sm0 = semDe(t.g.uuid), desl = Math.floor(sm0 * 6), off = 10 + sm0 * 50;
    let acc = 0, tUlt = -1, n = 0, poseQ = 0;
    t.anim = (dt, tt, andando) => {
      const segue = tUlt >= 0 && tt > tUlt && Math.abs(tt - tUlt - dt) < .25 && dt < .25; tUlt = tt;
      if (!segue || NS.animTudo) { acc = 0; anim(dt, tt + off, andando); poseQ++; return; }
      acc += dt; n++;
      if (!t.g.visible || !naVista(T, t, tt)) { t.__parado = true; return; }
      const nv = t.nivelLOD || 0;
      if (nv === 1 && ((n + desl) & 1)) return;
      if (nv >= 2 && acc < .1) return;
      const d = Math.min(acc, .25); acc = 0; t.__parado = false;
      anim(d, tt + off, andando); poseQ++;
    };
    // o LOD reassa a silhueta a partir da pose: só quando a pose mudou (ou a distância mudou bastante)
    let lodW = null, qUlt = -1, dUlt = -99;
    const embrulha = f => function (dist) {
      if (poseQ !== qUlt || Math.abs(dist - dUlt) > .8 || (t.nivelLOD || 0) < 2) { qUlt = poseQ; dUlt = dist; return f.call(this, dist); }
      return t.nivelLOD;
    };
    const atual = t.lod;
    try {
      Object.defineProperty(t, 'lod', { configurable: true, enumerable: true, get: () => lodW, set: f => { lodW = typeof f === 'function' ? embrulha(f) : f; } });
      t.lod = atual;
    } catch (e) {}
    // malhas criadas depois (silhuetas do LOD) também marcam a câmera
    t.marcarCam = marcarCam;
  }

  Object.assign(NS, { criarToken, carregarModelos, FORMAS, NOMES_FORMA });
  // para as formas dos Filhos (filhos3d.js): o mesmo motor de movimento e a curva suave
  NS.mov = motor; NS.movSuave = sstep;
  NS.preparoTokens = F => { F.T = F.T || window.THREE; };
})();
