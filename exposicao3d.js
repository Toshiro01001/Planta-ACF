/* =========================================================
   exposicao3d.js · Salas de Exposição no 3D e no mapa 2.5D
   - Quando uma sala de exposição está em andamento (mapa/expo), a sala da planta onde ela acontece
     se TRANSFORMA no ambiente da exposição: no 3D (ACF3D.expo3d.montar) e no mapa 2.5D (camada
     animada por cima da sala, com o selo "EXPOSIÇÃO · nome · rodada N").
   - Tudo aqui é GENÉRICO: chuva, maré, paredes que fecham, desabamento, zonas, labirinto, horda,
     vento, frio, fogo, floresta, banquete, navio, biblioteca, ampulheta, plateia, roleta, elétrico...
     O que cada sala de exposição mostra vem do campo "cena3d" da biblioteca do Mestre (fora do
     GitHub), que o exposicao.js publica junto da sala (salaPublica). Sem "cena3d", o visual é
     escolhido pelo modelo, pelo elemento e pelo ambiente sonoro da sala.
   - O 3D evolui com a rodada (x.rod) e com o progresso do grupo (registro expoLog, lido pelo
     ACF_EXPO.progresso): a água sobe, as paredes se fecham, o labirinto muda, a horda diminui...
   - Orçamento: ~150 mil triângulos e até 4 luzes extras por sala (no celular, metade).
   ========================================================= */
(() => {
'use strict';
const NS = window.ACF3D = window.ACF3D || {};
const PI = Math.PI, TAU = PI * 2;
const lim = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, k) => a + (b - a) * k;
const numero = (v, p = 0) => { const n = parseFloat(v); return isFinite(n) ? n : p; };
function hashTxt(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function aleatorio(sem) { let a = (sem >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rgb(h) { h = String(h || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
const hexDe = c => '#' + c.map(v => Math.round(lim(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const misturar = (a, b, k) => { const A = rgb(a), B = rgb(b); return hexDe(A.map((v, i) => mix(v, B[i], k))); };
const rgba = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
const COR_EL = { Sangue: '#9e1b22', Morte: '#2c2c2e', Conhecimento: '#d9a514', Energia: '#8a3fd1', Medo: '#e9e4f2' };

/* =========================================================
   ESTADO COMUM (3D e 2D)
   ========================================================= */
// rodada, progresso do grupo e quantos participam, já normalizados (0 a 1)
function lerEstado(x) {
  x = x || {};
  const s = x.sala || {}, meta = s.meta || {}, c3 = s.cena3d || {};
  const rod = Math.max(1, Math.round(numero(x.rod, 1)));
  const rodMax = Math.max(2, Math.round(numero(meta.rodadas, 0)) || Math.round(numero(c3.rodadas, 0)) || 7);
  const nPart = Object.keys(x.part || {}).length;
  let need = Math.max(1, Math.round(numero(x.meta, 0)) || Math.round(numero(meta.sucessos, 0)) || 5);
  if (meta.modo === 'individual') need *= Math.max(1, nPart);
  let grupo = numero(x.prog, NaN);
  if (!isFinite(grupo)) { grupo = 0; try { const E = window.ACF_EXPO; if (E && E.progresso && x.on) grupo = Math.max(0, numero(E.progresso(x).grupo, 0)); } catch (e) { grupo = 0; } }
  return { on: !!x.on, rod, rodMax, kRod: lim((rod - 1) / (rodMax - 1)), need, grupo, kProg: lim(grupo / need), nPart, id: x.id || '' };
}
// o visual da sala: o campo cena3d (biblioteca) ou um padrão tirado do modelo, do elemento e do ambiente
function cenaPadrao(s) {
  const amb = s.amb || '', mod = s.modelo || 'livre';
  let base = { mare: 'mare', paredes: 'paredes', desabamento: 'desabamento', zonas: 'zonas', labirinto: 'labirinto', horda: 'horda' }[mod];
  if (!base) base = amb === 'Chuva' ? 'chuva' : amb === 'Vento' ? 'vento' : amb === 'Goteira' ? 'mare' : mod === 'travessia' ? 'vento' : 'vazio';
  const ex = { Coração: ['pulso'], Sussurros: ['nevoa_baixa', 'olhos'], Relógio: ['tique'], Sirene: ['sirene'], Maquinário: ['poeira', 'tremor'], Energia: ['faiscas', 'arcos'], Fluorescente: ['fluorescente'], Medo: ['nevoa_baixa'], Tensão: ['luz_vermelha'], Chuva: ['respingos', 'pocas'], Vento: ['poeira'], Goteira: ['gotejar'] }[amb] || [];
  if (mod === 'travessia') ex.push('trechos');
  return { base, extras: ex, intensidade: .7 };
}
function cenaDe(s) {
  s = s || {};
  const c = s.cena3d && typeof s.cena3d === 'object' ? s.cena3d : cenaPadrao(s);
  return { cor: COR_EL[s.el] || '#8a3fd1', intensidade: .7, extras: [], semente: hashTxt(s.id || s.nome || 'x') % 997, ...c, el: s.el || '', modelo: s.modelo || '', amb: s.amb || '', textos: c.textos || {} };
}

/* ---------- labirintos (mesma semente no 3D e no 2D) ---------- */
// grade N x N (N ímpar: o vão de 2,4 m no meio de cada parede cai dentro de uma célula, nunca numa parede interna)
function gerarLabirinto(N, sem) {
  const r = aleatorio(sem * 7919 + 13), vis = new Uint8Array(N * N);
  const v = Array.from({ length: N - 1 }, () => new Array(N).fill(1));   // parede entre (i,j) e (i+1,j)
  const h = Array.from({ length: N }, () => new Array(N - 1).fill(1));   // parede entre (i,j) e (i,j+1)
  const m0 = (N - 1) >> 1, pilha = [[m0, m0]]; vis[m0 * N + m0] = 1;
  while (pilha.length) {
    const [i, j] = pilha[pilha.length - 1];
    const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [i + a, j + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !vis[a * N + b]);
    if (!viz.length) { pilha.pop(); continue; }
    const [a, b] = viz[Math.floor(r() * viz.length)];
    if (a !== i) v[Math.min(a, i)][j] = 0; else h[i][Math.min(b, j)] = 0;
    vis[a * N + b] = 1; pilha.push([a, b]);
  }
  // alguns atalhos: um labirinto perfeito demais fica claustrofóbico e sem escolha
  for (let k = 0; k < N; k++) { if (r() < .5) v[Math.floor(r() * (N - 1))][Math.floor(r() * N)] = 0; else h[Math.floor(r() * N)][Math.floor(r() * (N - 1))] = 0; }
  return { N, v, h };
}
// espiral: anéis de monólitos com uma abertura cada, que gira a cada rodada
function gerarEspiral(sem, rod) {
  const r = aleatorio(sem * 31 + rod * 977), a0 = r() * TAU;
  return [2.0, 4.0, 6.2].map((R, i) => ({ R, gap: a0 + i * 2.1 + (r() - .5) * .6, larg: 1.0 / R + .15 }));
}

/* =========================================================
   PARTÍCULAS (THREE.Points com shader: chuva, neve, poeira, faíscas, vidro, letras...)
   modo 0 fluxo com volta, 1 giro (ciclone), 2 flutua, 3 pulso (nasce e some no lugar)
   forma 0 disco, 1 traço de chuva, 2 brilho, 3 anel (respingo), 4 lasca, 5 gota grossa, 6 letra
   ========================================================= */
const VS = `
uniform float uT; uniform float uTam; uniform float uEsc; uniform vec3 uVel; uniform vec3 uMin; uniform vec3 uMax;
uniform float uModo; uniform float uVar; uniform float uTurb; uniform vec4 uGiro; uniform float uFluxo; uniform float uCresce;
attribute vec4 aSem;
varying float vA; varying float vSem; varying float vFase;
#include <fog_pars_vertex>
float h1(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  vec3 tam = uMax - uMin; vec3 p = position; vA = 1.0; vFase = 0.0; vSem = aSem.x;
  if (uModo < 0.5) {
    vec3 v = uVel * (1.0 + (aSem.w - 0.5) * uVar);
    p = uMin + mod(position - uMin + v * uT, tam);
    p.x += sin(uT * 1.7 + aSem.x * 40.0) * uTurb; p.z += cos(uT * 1.3 + aSem.y * 40.0) * uTurb; p.y += sin(uT * 1.1 + aSem.z * 40.0) * uTurb * 0.3;
    float fy = (p.y - uMin.y) / max(0.001, tam.y); vA = smoothstep(0.0, 0.06, fy) * smoothstep(1.0, 0.9, fy);
  } else if (uModo < 1.5) {
    float r = mix(uGiro.y, uGiro.z, sqrt(aSem.x));
    float w = uGiro.x * (0.6 + aSem.w * 0.8) * (3.0 / (1.0 + r));
    float a = aSem.y * 6.2832 + uT * w;
    float y = mod(aSem.z * tam.y + uT * uGiro.w * (0.4 + aSem.w), tam.y);
    p = vec3(cos(a) * r, uMin.y + y, sin(a) * r);
    p.xz += vec2(sin(uT * 3.0 + aSem.x * 30.0), cos(uT * 2.6 + aSem.y * 30.0)) * uTurb;
    float fy = y / max(0.001, tam.y); vA = smoothstep(0.0, 0.08, fy) * smoothstep(1.0, 0.85, fy);
  } else if (uModo < 2.5) {
    p = position + vec3(sin(uT * 0.7 + aSem.x * 30.0), sin(uT * 0.5 + aSem.y * 30.0) * 0.6, cos(uT * 0.6 + aSem.z * 30.0)) * uTurb + uVel * sin(uT * 0.3 + aSem.w * 6.2832);
  } else {
    float c = uT * uFluxo * (0.6 + aSem.w * 0.8) + aSem.x * 17.0;
    float id = floor(c); vFase = fract(c);
    p = uMin + vec3(h1(id * 12.9898 + aSem.y * 78.233), h1(id * 39.346 + aSem.z * 11.135), h1(id * 73.156 + aSem.x * 52.235)) * tam;
    p += uVel * vFase;
    vA = 1.0 - vFase;
  }
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  float esc = max(0.05, 1.0 + uCresce * (vFase - 0.5) * 2.0);
  gl_PointSize = clamp(uTam * (0.6 + aSem.z * 0.8) * esc * uEsc / max(0.05, -mvPosition.z), 1.0, 220.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FS = `
uniform vec3 uCor; uniform float uOp; uniform float uForma; uniform float uT; uniform sampler2D uMapa;
varying float vA; varying float vSem; varying float vFase;
#include <fog_pars_fragment>
void main() {
  vec2 c = gl_PointCoord - 0.5; float a = 0.0; float d = length(c); vec3 cor = uCor * (0.75 + 0.5 * vSem);
  if (uForma < 0.5) { a = smoothstep(0.5, 0.05, d); }
  else if (uForma < 1.5) { a = smoothstep(0.09, 0.0, abs(c.x)) * smoothstep(0.5, 0.12, abs(c.y)) * (0.45 + 0.55 * (0.5 - c.y)); }
  else if (uForma < 2.5) { a = max(smoothstep(0.06, 0.0, abs(c.x)) * smoothstep(0.5, 0.0, abs(c.y)), smoothstep(0.06, 0.0, abs(c.y)) * smoothstep(0.5, 0.0, abs(c.x))) * 0.8 + smoothstep(0.18, 0.0, d); a *= 0.55 + 0.45 * sin(uT * 9.0 + vSem * 50.0); }
  else if (uForma < 3.5) { a = smoothstep(0.08, 0.0, abs(d - 0.36)) * 0.9; }
  else if (uForma < 4.5) { float an = vSem * 6.2832 + uT * (vSem - 0.5) * 5.0; vec2 q = mat2(cos(an), -sin(an), sin(an), cos(an)) * c; float e = abs(q.x) + abs(q.y) * 2.4; a = smoothstep(0.46, 0.38, e); cor *= 0.8 + 2.2 * pow(max(0.0, sin(uT * 4.0 + vSem * 40.0)), 8.0); }
  else if (uForma < 5.5) { a = smoothstep(0.5, 0.4, d); cor = mix(cor, vec3(1.0), smoothstep(0.14, 0.0, length(c - vec2(-0.14, -0.16))) * 0.5); }
  else { float k = floor(vSem * 15.99); vec2 cel = vec2(mod(k, 4.0), floor(k / 4.0)); vec2 uv = (vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y) + cel) / 4.0; a = texture2D(uMapa, uv).a; }
  a *= vA * uOp;
  if (a < 0.01) discard;
  gl_FragColor = vec4(cor, a);
  #include <fog_fragment>
}`;

/* =========================================================
   GEOMETRIA: peças posicionadas para juntar numa malha só
   ========================================================= */
function geoKit(T) {
  const rot = (g, rx, ry, rz) => { if (rx || ry || rz) g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(rx, ry, rz))); return g; };
  // caixa e cilindro com a BASE em y (giram em torno da base)
  const caixa = (w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => rot(new T.BoxGeometry(w, h, d).translate(0, h / 2, 0), rx, ry, rz).translate(x, y, z);
  const cil = (rt, rb, h, x = 0, y = 0, z = 0, seg = 8, rx = 0, ry = 0, rz = 0) => rot(new T.CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0), rx, ry, rz).translate(x, y, z);
  const esf = (r, x = 0, y = 0, z = 0, seg = 8, sx = 1, sy = 1, sz = 1) => new T.SphereGeometry(r, seg, Math.max(4, Math.round(seg * .7))).scale(sx, sy, sz).translate(x, y, z);
  // cilindro entre dois pontos (galhos, cabos, barras)
  const barra = (a, b, r1, r2 = r1, seg = 6) => {
    const A = new T.Vector3(...a), B = new T.Vector3(...b), d = B.clone().sub(A), L = d.length() || .001;
    const g = new T.CylinderGeometry(r2, r1, L, seg).translate(0, L / 2, 0);
    g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize())));
    return g.translate(A.x, A.y, A.z);
  };
  const tubo = (pts, r, seg = 12, rad = 5) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), seg, r, rad, false);
  function juntar(lista, cores) {
    const nn = lista.map(g => g.index ? g.toNonIndexed() : g);
    let n = 0; nn.forEach(g => { n += g.attributes.position.count; });
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), C = cores ? new Float32Array(n * 3) : null;
    let o = 0; const cc = new T.Color();
    nn.forEach((g, i) => {
      const k = g.attributes.position.count;
      P.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) N.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2);
      if (C) { cc.set(cores[i] || '#ffffff'); for (let j = 0; j < k; j++) { C[(o + j) * 3] = cc.r; C[(o + j) * 3 + 1] = cc.g; C[(o + j) * 3 + 2] = cc.b; } }
      o += k;
    });
    lista.forEach(g => g.dispose()); nn.forEach(g => g.dispose());
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(P, 3)); out.setAttribute('normal', new T.BufferAttribute(N, 3)); out.setAttribute('uv', new T.BufferAttribute(U, 2));
    if (C) out.setAttribute('color', new T.BufferAttribute(C, 3));
    out.computeBoundingSphere(); return out;
  }
  // gente genérica (de pé ou sentada), sem rosto: para multidões com instancing
  function boneco(pose = 'pe') {
    const L = [];
    if (pose === 'sentado') {
      [-1, 1].forEach(s => { L.push(caixa(.13, .13, .46, s * .1, .4, .2)); L.push(cil(.06, .05, .42, s * .1, 0, .42, 6)); });
      L.push(cil(.18, .15, .6, 0, .45, 0, 8).scale(1, 1, .72));
      [-1, 1].forEach(s => L.push(cil(.05, .045, .55, s * .24, .5, .12, 6, -.9)));
      L.push(cil(.05, .05, .1, 0, 1.03, 0, 6)); L.push(esf(.12, 0, 1.22, 0, 8, .9, 1.1, 1));
    } else {
      [-1, 1].forEach(s => L.push(cil(.07, .055, .88, s * .1, 0, 0, 6)));
      L.push(cil(.19, .15, .62, 0, .86, 0, 8).scale(1, 1, .72));
      [-1, 1].forEach(s => L.push(cil(.052, .045, .62, s * .25, .82, 0, 6)));
      L.push(cil(.05, .05, .1, 0, 1.47, 0, 6)); L.push(esf(.12, 0, 1.66, 0, 8, .9, 1.1, 1));
    }
    return juntar(L);
  }
  // criatura da horda: corpo curvado, cabeça baixa, quatro membros finos
  function criatura() {
    const L = [esf(.24, 0, .5, 0, 7, .75, .62, 1.45), esf(.12, 0, .56, .42, 6, .9, .85, 1.2)];
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([s, f]) => { L.push(barra([s * .14, .5, f * .2], [s * .34, .26, f * .34], .04, .035, 4)); L.push(barra([s * .34, .26, f * .34], [s * .3, 0, f * .44], .035, .02, 4)); });
    return juntar(L);
  }
  return { caixa, cil, esf, barra, tubo, juntar, boneco, criatura, rot };
}

/* =========================================================
   3D: ACF3D.expo3d.montar(op)
   op = { T, F, sala:{cn,cx,cz,x0,x1,z0,z1,vaos:[{lado,u}]}, expo, ALT, SALA_M, celular }
   devolve { grupo, anim(dt,t,cam), atualizar(expo), colisoes, atmosfera, descartar() }
   ========================================================= */
function montar(op) {
  const T = op.T, ALT = op.ALT || 4, sala = op.sala || {}, celular = !!op.celular;
  const SALA = op.SALA_M || Math.abs((sala.x1 || 10) - (sala.x0 || -10)) || 20, H = SALA / 2;
  const CX = sala.cx || 0, CZ = sala.cz || 0, Q = celular ? .5 : 1;
  const desc = [], animF = [], luzesF = [];
  let F = null;
  try { F = NS.criarFabrica(T, animF, luzesF, desc, { alt: ALT }); } catch (e) { F = op.F; }
  F.T = T;
  const guardar = x => { desc.push(x); return x; };
  const K = geoKit(T);
  const grupo = new T.Group(); grupo.name = 'expo3d'; grupo.position.set(CX, 0, CZ);
  const teto = new T.Group(); grupo.add(teto);            // céus e forros: somem quando a câmera está acima do teto
  const lados = { n: new T.Group(), s: new T.Group(), w: new T.Group(), e: new T.Group() };
  Object.values(lados).forEach(g => grupo.add(g));
  let expoAtual = op.expo || {};
  const cena = cenaDe(expoAtual.sala);
  const r = aleatorio(cena.semente * 131 + 7);
  const uT = { value: 0 };
  const anims = [], upds = [], luzes = [], maxLuz = celular ? 2 : 4;
  const colisoes = [];

  /* ----- portas (vãos de 2,4 m no meio das paredes), em metros locais ----- */
  const vaos = (sala.vaos || []).map(v => {
    const u = numero(v.u, 0);
    const p = { lado: v.lado, u };
    if (v.lado === 'n') Object.assign(p, { x: u, z: -H, nx: 0, nz: 1 });
    else if (v.lado === 's') Object.assign(p, { x: u, z: H, nx: 0, nz: -1 });
    else if (v.lado === 'w') Object.assign(p, { x: -H, z: u, nx: 1, nz: 0 });
    else Object.assign(p, { x: H, z: u, nx: -1, nz: 0 });
    p.dentro = d => [p.x + p.nx * d, p.z + p.nz * d];
    return p;
  });
  const ent = vaos[0] || null;
  let sai = null; if (vaos.length > 1) { let bd = -1; vaos.slice(1).forEach(v => { const d = Math.hypot(v.x - ent.x, v.z - ent.z); if (d > bd) { bd = d; sai = v; } }); }
  const ladoOposto = { n: 's', s: 'n', w: 'e', e: 'w' };
  // ponto de chegada da travessia (a porta mais distante ou a parede oposta)
  const pEnt = ent ? ent.dentro(1.4) : [0, H - 1.4];
  const pSai = sai ? sai.dentro(1.4) : ent ? (() => { const v = { n: [0, H - 1.4], s: [0, -H + 1.4], w: [H - 1.4, 0], e: [-H + 1.4, 0] }[ent.lado]; return v; })() : [0, -H + 1.4];
  // nada de móvel na frente de porta: 2,8 m para dentro, 3,4 m de largura
  function livre(x, z, folga = 0) {
    for (const v of vaos) {
      const dIn = (x - v.x) * v.nx + (z - v.z) * v.nz, lat = v.nx ? Math.abs(z - v.z) : Math.abs(x - v.x);
      if (dIn < 2.8 + folga && lat < 1.7 + folga) return false;
    }
    return true;
  }
  const portasNoLado = l => vaos.filter(v => v.lado === l).length;
  // lados para encostar coisas grandes: sem porta primeiro, de preferência longe da entrada
  const ladosLivres = () => ['n', 's', 'w', 'e'].sort((a, b) => (portasNoLado(a) - portasNoLado(b)) || ((ent && b === ladoOposto[ent.lado]) - (ent && a === ladoOposto[ent.lado])));
  // posição ao longo de uma parede: t (ao longo) e d (para dentro); ry vira a frente (+z) para dentro da sala
  function naParede(l, t, d) {
    if (l === 'n') return { x: t, z: -H + d, ry: 0 };
    if (l === 's') return { x: -t, z: H - d, ry: PI };
    if (l === 'w') return { x: -H + d, z: -t, ry: PI / 2 };
    return { x: H - d, z: t, ry: -PI / 2 };
  }
  // posição ao longo da parede da porta: u da porta no sistema t de naParede
  const tDaPorta = v => (v.lado === 'n' || v.lado === 'e') ? v.u : -v.u;
  function pontoLivre(rr = r, margem = 1, folga = .3, tent = 60) {
    for (let i = 0; i < tent; i++) { const x = (rr() - .5) * (SALA - margem * 2), z = (rr() - .5) * (SALA - margem * 2); if (livre(x, z, folga)) return [x, z]; }
    return [0, 0];
  }

  /* ----- materiais e texturas ----- */
  const mat = (cor, o = {}) => F.m(cor, o);
  const cacheTx = {};
  function textura(chave, w, h, desenho, rep) {
    const k = chave + (rep ? rep.join('x') : '');
    if (cacheTx[k]) return cacheTx[k];
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    desenho(cv.getContext('2d'), w, h, aleatorio(hashTxt(chave)));
    const t = guardar(new T.CanvasTexture(cv)); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    t.wrapS = t.wrapT = T.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]);
    cacheTx[k] = t; return t;
  }
  const repetir = (tx, a, b) => { const t = guardar(tx.clone()); t.repeat.set(a, b); t.needsUpdate = true; return t; };
  function matTx(tx, o = {}) {
    const p = { map: tx, color: new T.Color(o.c || '#ffffff'), roughness: o.r ?? .85, metalness: o.me ?? 0 };
    if (o.e) { p.emissive = new T.Color(o.e); p.emissiveIntensity = o.ei ?? 1; if (o.emap !== false) p.emissiveMap = tx; }
    if (o.op !== undefined) { p.transparent = true; p.opacity = o.op; p.depthWrite = false; }
    if (o.alfa) p.alphaTest = o.alfa;
    if (o.lado) p.side = T.DoubleSide;
    if (o.vc) p.vertexColors = true;
    const m = guardar(new T.MeshStandardMaterial(p));
    if (o.decal) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; }
    return m;
  }
  const basico = (cor, o = {}) => guardar(new T.MeshBasicMaterial({ color: new T.Color(cor), map: o.map || null, transparent: o.op !== undefined || !!o.aditivo, opacity: o.op ?? 1, depthWrite: !(o.op !== undefined || o.aditivo), side: o.lado ? T.DoubleSide : T.FrontSide, blending: o.aditivo ? T.AdditiveBlending : T.NormalBlending, fog: o.fog !== false }));
  const emis = (cor, ei = 1.5, o = {}) => guardar(new T.MeshStandardMaterial({ color: new T.Color(o.c || '#111111'), emissive: new T.Color(cor), emissiveIntensity: ei, roughness: o.r ?? .5, transparent: o.op !== undefined, opacity: o.op ?? 1 }));
  const vc = (o = {}) => guardar(new T.MeshStandardMaterial({ vertexColors: true, roughness: o.r ?? .8, metalness: o.me ?? 0, side: o.lado ? T.DoubleSide : T.FrontSide, emissive: new T.Color(o.e || '#000000'), emissiveIntensity: o.ei ?? 1 }));
  const malha = (geo, m, pai = grupo, x = 0, y = 0, z = 0) => { const me = new T.Mesh(guardar(geo), m); me.position.set(x, y, z); pai.add(me); return me; };
  const D = new T.Object3D(); D.rotation.order = 'YXZ';
  function multidao(geo, m, n, pai = grupo) { const im = new T.InstancedMesh(guardar(geo), m, Math.max(1, n)); im.instanceMatrix.setUsage(T.DynamicDrawUsage); im.frustumCulled = false; pai.add(im); return im; }
  function por(im, i, x, y, z, ry = 0, s = 1, rx = 0, rz = 0, sy) { D.position.set(x, y, z); D.rotation.set(rx, ry, rz); D.scale.set(s, sy ?? s, s); D.updateMatrix(); im.setMatrixAt(i, D.matrix); }

  /* ----- luzes extras (no máximo 4; 2 no celular): userData.i é a intensidade pedida ----- */
  function luz(cor, i, d, x, y, z) {
    if (luzes.length >= maxLuz) { const f = { intensity: 0, color: new T.Color(cor), position: new T.Vector3(x, y, z), distance: d, userData: { i }, falsa: true }; return f; }
    const l = new T.PointLight(cor, i, d, 2); l.position.set(x, y, z); l.userData.i = i; grupo.add(l); luzes.push(l); return l;
  }

  /* ----- partículas ----- */
  const V2 = new T.Vector2();
  let atlasLetras = null;
  function letras() {
    if (atlasLetras) return atlasLetras;
    atlasLetras = textura('expo_letras', 256, 256, (x, W) => {
      x.clearRect(0, 0, W, W); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 44px Georgia, serif';
      'aeorsɘʁɿʎϟЖѦ§∆ΨΩ'.split('').forEach((ch, i) => x.fillText(ch, (i % 4) * 64 + 32, Math.floor(i / 4) * 64 + 34));
    });
    atlasLetras.encoding = T.LinearEncoding; return atlasLetras;
  }
  function part(o) {
    const n = Math.max(1, Math.round((o.n || 400) * (o.fixo ? 1 : Q)));
    const [x0, x1, y0, y1, z0, z1] = o.caixa || [-H, H, 0, ALT, -H, H];
    const P = new Float32Array(n * 3), S = new Float32Array(n * 4), rr = aleatorio((o.sem || 1) * 97 + n + cena.semente);
    for (let i = 0; i < n; i++) {
      const p = o.pontos ? o.pontos(i, rr) : [mix(x0, x1, rr()), mix(y0, y1, rr()), mix(z0, z1, rr())];
      P[i * 3] = p[0]; P[i * 3 + 1] = p[1]; P[i * 3 + 2] = p[2];
      for (let k = 0; k < 4; k++) S[i * 4 + k] = rr();
    }
    const geo = guardar(new T.BufferGeometry());
    geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('aSem', new T.BufferAttribute(S, 4));
    const v = o.vel || [0, 0, 0], gi = o.giro || [1, 1, 6, .3];
    const u = T.UniformsUtils.merge([T.UniformsLib.fog, {
      uTam: { value: o.tam || .05 }, uEsc: { value: 600 }, uVel: { value: new T.Vector3(v[0], v[1], v[2]) },
      uMin: { value: new T.Vector3(x0, y0, z0) }, uMax: { value: new T.Vector3(x1, y1, z1) }, uModo: { value: o.modo || 0 },
      uVar: { value: o.var ?? .3 }, uTurb: { value: o.turb ?? 0 }, uGiro: { value: new T.Vector4(gi[0], gi[1], gi[2], gi[3]) },
      uFluxo: { value: o.fluxo ?? 1 }, uCresce: { value: o.cresce ?? 0 }, uCor: { value: new T.Color(o.cor || '#ffffff') },
      uOp: { value: o.op ?? .8 }, uForma: { value: o.forma || 0 }, uMapa: { value: o.forma === 6 ? letras() : null },
    }]);
    u.uT = uT;
    const m = guardar(new T.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, fog: true, blending: o.aditivo ? T.AdditiveBlending : T.NormalBlending }));
    const pts = new T.Points(geo, m); pts.frustumCulled = false; pts.renderOrder = o.ordem || 3;
    pts.onBeforeRender = (ren, sc, cam) => { ren.getDrawingBufferSize(V2); u.uEsc.value = V2.y / (2 * Math.tan(((cam && cam.fov) || 60) * PI / 360)); };
    if (o.pos) pts.position.set(...o.pos);
    (o.pai || grupo).add(pts);
    return { pts, u, n, dens(k) { geo.setDrawRange(0, Math.max(0, Math.round(n * lim(k)))); } };
  }

  /* ----- líquido (ondula, sobe por rodada, pode inclinar) ----- */
  function liquido(o) {
    const seg = Math.max(12, Math.round((o.seg || 44) * (celular ? .55 : 1)));
    const w = o.w || SALA - .04, d = o.d || SALA - .04;
    const geo = guardar(o.geo || new T.PlaneGeometry(w, d, seg, seg)); geo.rotateX(-PI / 2);
    const pos = geo.attributes.position, nor = geo.attributes.normal, base = Float32Array.from(pos.array);
    const m = guardar(new T.MeshStandardMaterial({ color: new T.Color(o.cor || '#20304a'), roughness: o.r ?? .1, metalness: o.me ?? .25, emissive: new T.Color(o.e || '#000000'), emissiveIntensity: o.ei ?? 1, map: o.mapa || null }));
    if ((o.op ?? 1) < 1) { m.transparent = true; m.opacity = o.op; }
    const me = new T.Mesh(geo, m); me.position.set(o.x || 0, o.y ?? .05, o.z || 0); me.renderOrder = 1; grupo.add(me);
    // nos vãos das portas, a "parede" de líquido (como num aquário): ninguém vê o corredor seco por baixo
    const faces = [];
    if (o.faces !== false && !o.w && !o.geo) vaos.forEach(v => {
      const f = new T.Mesh(guardar(new T.PlaneGeometry(2.4, 1).translate(0, .5, 0)), m);
      f.position.set(v.x + v.nx * .03, 0, v.z + v.nz * .03); f.rotation.y = v.nx ? (v.nx > 0 ? PI / 2 : -PI / 2) : (v.nz > 0 ? 0 : PI);
      m.side = T.DoubleSide; grupo.add(f); faces.push(f);
    });
    const L = { me, m, nivel: o.y ?? .05, alvo: o.y ?? .05, amp: o.amp ?? .05, vel: o.vel ?? 1, ondas: [], inclina: o.inclina || 0, escala: o.escala ?? 1 };
    // anel de pulso (batida de coração, coisa caindo): L.pulsar(x, z, força)
    L.pulsar = (x, z, f = 1) => { L.ondas.push({ x, z, t0: uT.value, f }); if (L.ondas.length > 4) L.ondas.shift(); };
    anims.push((dt, t) => {
      L.nivel += (L.alvo - L.nivel) * Math.min(1, dt * .5);
      me.position.y = L.nivel; me.rotation.z += (L.inclina - me.rotation.z) * Math.min(1, dt);
      faces.forEach(f => { f.scale.y = Math.max(.001, L.nivel + L.amp); f.visible = L.nivel > .08; });
      const A = L.amp, vv = L.vel, p = pos.array, nn = nor.array, sc = L.escala;
      const on = L.ondas.filter(q => t - q.t0 < 6);
      for (let i = 0; i < p.length; i += 3) {
        const x = base[i] * sc, z = base[i + 2] * sc;
        const a1 = x * .55 + t * vv, a2 = z * .8 - t * vv * 1.3, a3 = (x + z) * 1.6 + t * vv * 2.1;
        let y = A * (Math.sin(a1) + .6 * Math.sin(a2) + .25 * Math.sin(a3));
        let dx = A * (.55 * Math.cos(a1) + .4 * Math.cos(a3)), dz = A * (.48 * Math.cos(a2) + .4 * Math.cos(a3));
        for (const q of on) {
          const ex = x - q.x, ez = z - q.z, rr2 = Math.sqrt(ex * ex + ez * ez) + .001, R = (t - q.t0) * 4, f = rr2 - R, g = Math.exp(-f * f * 1.2) * q.f * .14 * Math.max(0, 1 - (t - q.t0) / 6);
          y += g * Math.cos(f * 3); const dg = -g * 3 * Math.sin(f * 3) / rr2; dx += dg * ex; dz += dg * ez;
        }
        p[i + 1] = y;
        const inv = 1 / Math.sqrt(dx * dx + 1 + dz * dz); nn[i] = -dx * inv; nn[i + 1] = inv; nn[i + 2] = -dz * inv;
      }
      pos.needsUpdate = true; nor.needsUpdate = true;
    });
    return L;
  }

  /* ----- casca: piso, paredes (com os vãos) e forro/céu por cima da sala original ----- */
  function geoParede(lado, rep) {
    const sh = new T.Shape(); sh.moveTo(-H, 0); sh.lineTo(H, 0); sh.lineTo(H, ALT); sh.lineTo(-H, ALT); sh.closePath();
    vaos.filter(v => v.lado === lado).forEach(v => {
      const t = tDaPorta(v), f = new T.Path();
      f.moveTo(t - 1.25, 0); f.lineTo(t - 1.25, 2.26); f.lineTo(t + 1.25, 2.26); f.lineTo(t + 1.25, 0); f.closePath(); sh.holes.push(f);
    });
    const g = new T.ShapeGeometry(sh), uv = g.attributes.uv, p = g.attributes.position, R = rep || [1, 1];
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) / SALA + .5) * R[0], p.getY(i) / ALT * R[1]);
    return g;
  }
  function parede(lado, m, rep, dentro = .025) {
    const me = new T.Mesh(guardar(geoParede(lado, rep)), m), P = naParede(lado, 0, dentro);
    me.position.set(P.x, 0, P.z); me.rotation.y = P.ry; lados[lado].add(me); return me;
  }
  function casca(o) {
    if (o.piso) { const p = malha(new T.PlaneGeometry(SALA, SALA), o.piso); p.rotation.x = -PI / 2; p.position.y = o.pisoY ?? .012; p.renderOrder = 0; }
    if (o.parede) ['n', 's', 'w', 'e'].forEach(l => parede(l, o.parede[l] || o.parede, o.repParede));
    if (o.teto) { const p = malha(new T.PlaneGeometry(SALA, SALA), o.teto, teto); p.rotation.x = PI / 2; p.position.y = ALT - .018; }
  }
  // céu desenhado (nuvens, pintado, vazio, aquário...) no lugar do forro
  function ceuTx(o) {
    const a = o.a || '#3a0004', b = o.b || '#000000', tipo = o.tipo || 'nuvens';
    return textura(`ceu_${tipo}_${a}_${b}_${o.sem || 0}`, 512, 512, (x, W, Hh, rr) => {
      const g = x.createRadialGradient(W / 2, Hh / 2, 20, W / 2, Hh / 2, W * .72); g.addColorStop(0, a); g.addColorStop(1, b);
      x.fillStyle = g; x.fillRect(0, 0, W, Hh);
      const blob = (cx, cy, R, cor) => { for (const ox of [-W, 0, W]) for (const oy of [-Hh, 0, Hh]) { const gg = x.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, R); gg.addColorStop(0, cor); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gg; x.fillRect(cx + ox - R, cy + oy - R, R * 2, R * 2); } };
      if (tipo === 'nuvens') for (let i = 0; i < 70; i++) blob(rr() * W, rr() * Hh, 30 + rr() * 90, rr() < .5 ? rgba(misturar(a, '#ffffff', .25), .18 + rr() * .2) : rgba(misturar(a, '#000000', .6), .25 + rr() * .3));
      if (tipo === 'pintado') { for (let i = 0; i < 22; i++) { const cx = rr() * W, cy = rr() * Hh; for (let k = 0; k < 5; k++) { x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(cx + k * 14 - 28, cy + Math.sin(k) * 6, 22, 14, 0, 0, TAU); x.fill(); } } x.strokeStyle = 'rgba(40,30,20,.35)'; for (let i = 0; i < 18; i++) { x.lineWidth = .8 + rr(); let px = rr() * W, py = rr() * Hh; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 7; k++) { px += (rr() - .5) * 50; py += (rr() - .5) * 50; x.lineTo(px, py); } x.stroke(); } }
      if (tipo === 'copa') { x.strokeStyle = 'rgba(0,0,0,.85)'; for (let i = 0; i < 60; i++) { x.lineWidth = 1 + rr() * 6; let px = rr() * W, py = rr() * Hh, an = rr() * TAU; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { an += (rr() - .5) * 1.2; px += Math.cos(an) * 30; py += Math.sin(an) * 30; x.lineTo(px, py); } x.stroke(); } }
      if (tipo === 'aquario') { for (let i = 0; i < 40; i++) blob(rr() * W, rr() * Hh, 20 + rr() * 60, rgba('#000000', .25)); blob(W * .62, Hh * .4, 70, 'rgba(220,240,255,.5)'); blob(W * .62, Hh * .4, 20, 'rgba(255,255,255,.9)'); }
      if (tipo === 'estatica') for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(255,255,255,${rr() * .25})`; x.fillRect(rr() * W, rr() * Hh, 2, 1); }
    });
  }
  function ceu(o) {
    const tx = ceuTx(o); tx.repeat.set(o.rep || 1, o.rep || 1);
    const m = basico('#ffffff', { map: tx }); m.color.setScalar(o.brilho ?? 1);
    const p = malha(new T.PlaneGeometry(SALA, SALA), m, teto); p.rotation.x = PI / 2; p.position.y = ALT - .02;
    if (o.rolar) anims.push(dt => { tx.offset.x += dt * o.rolar[0]; tx.offset.y += dt * o.rolar[1]; });
    return { me: p, m, tx };
  }
  // céu que continua nas paredes: horizonte (aberto, sem fim)
  function horizonte(o) {
    const tx = textura(`hor_${o.ceu}_${o.chao}_${o.tipo || ''}`, 512, 256, (x, W, Hh, rr) => {
      const g = x.createLinearGradient(0, 0, 0, Hh); g.addColorStop(0, o.ceu); g.addColorStop(.62, misturar(o.ceu, o.chao, .55)); g.addColorStop(.7, o.chao); g.addColorStop(1, misturar(o.chao, '#000000', .25));
      x.fillStyle = g; x.fillRect(0, 0, W, Hh);
      if (o.tipo === 'montes') { x.fillStyle = rgba(misturar(o.ceu, '#000000', .35), .5); x.beginPath(); x.moveTo(0, Hh * .66); for (let i = 0; i <= 16; i++) x.lineTo(i * W / 16, Hh * (.6 - rr() * .08)); x.lineTo(W, Hh * .7); x.lineTo(0, Hh * .7); x.fill(); }
      if (o.tipo === 'dunas') { for (let k = 0; k < 3; k++) { x.fillStyle = rgba(misturar(o.chao, '#000000', .1 + k * .1), .6); x.beginPath(); x.moveTo(0, Hh); for (let i = 0; i <= 20; i++) x.lineTo(i * W / 20, Hh * (.64 + k * .05) + Math.sin(i * 1.3 + k * 2) * 6); x.lineTo(W, Hh); x.fill(); } }
      if (o.tipo === 'estacao') { x.fillStyle = 'rgba(40,46,52,.55)'; x.fillRect(W * .7, Hh * .6, 10, 6); x.fillStyle = 'rgba(255,200,120,.9)'; x.fillRect(W * .705, Hh * .61, 2, 2); }
    });
    const m = basico('#ffffff', { map: tx }); m.color.setScalar(o.brilho ?? 1);
    ['n', 's', 'w', 'e'].forEach(l => parede(l, m));
    return m;
  }

  /* ----- colisões (metros do mundo) e garantia de que toda porta continua alcançável ----- */
  const colFixas = [];
  const colDin = () => { const q = [-1e5, -1e5, -1e5, -1e5]; colisoes.push(q); return q; };
  const col = (x0, x1, z0, z1) => { const q = [CX + Math.min(x0, x1), CX + Math.max(x0, x1), CZ + Math.min(z0, z1), CZ + Math.max(z0, z1)]; colFixas.push(q); colisoes.push(q); return q; };
  const colRet = (x, z, w, d, ry = 0) => { const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)), W = w * c + d * s, Dd = w * s + d * c; return col(x - W / 2, x + W / 2, z - Dd / 2, z + Dd / 2); };
  function conectado(lista) {
    if (vaos.length < 1) return true;
    const P = .4, N = Math.ceil(SALA / P), ocupado = new Uint8Array(N * N), RAIO = .25;
    lista.forEach(q => { const x0 = Math.floor((q[0] - CX + H - RAIO) / P), x1 = Math.floor((q[1] - CX + H + RAIO) / P), z0 = Math.floor((q[2] - CZ + H - RAIO) / P), z1 = Math.floor((q[3] - CZ + H + RAIO) / P); for (let i = Math.max(0, x0); i <= Math.min(N - 1, x1); i++) for (let j = Math.max(0, z0); j <= Math.min(N - 1, z1); j++) ocupado[i * N + j] = 1; });
    const cel = ([x, z]) => [lim(Math.floor((x + H) / P), 0, N - 1), lim(Math.floor((z + H) / P), 0, N - 1)];
    const alvos = vaos.map(v => cel(v.dentro(.5)));
    const [si, sj] = alvos[0]; if (ocupado[si * N + sj]) return false;
    const vis = new Uint8Array(N * N), fila = [[si, sj]]; vis[si * N + sj] = 1;
    while (fila.length) { const [i, j] = fila.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const ni = i + a, nj = j + b; if (ni < 0 || nj < 0 || ni >= N || nj >= N) return; const k = ni * N + nj; if (vis[k] || ocupado[k]) return; vis[k] = 1; fila.push([ni, nj]); }); }
    return alvos.every(([i, j]) => vis[i * N + j]);
  }
  function garantirPortas() {
    while (colFixas.length && !conectado(colisoes)) { const q = colFixas.pop(); const i = colisoes.indexOf(q); if (i >= 0) colisoes.splice(i, 1); }
  }

  /* ----- textos públicos da sala (placas, cartazes): vêm do cena3d ----- */
  const textoTex = (t, o) => F.textoTex(t, o);

  // contexto que os construtores usam
  const c = {
    T, F, K, ALT, H, SALA, Q, celular, r, cena, uT, grupo, teto, lados, vaos, ent, sai, pEnt, pSai,
    anim: f => anims.push(f), upd: f => upds.push(f), luz, part, liquido, casca, ceu, ceuTx, horizonte, parede,
    mat, matTx, textura, repetir, basico, emis, vc, malha, multidao, por, col, colDin, colRet, livre, naParede, tDaPorta, ladosLivres, portasNoLado, pontoLivre, textoTex,
    tremem: [], atm: { nevoa: { c: '#060505', d: .03 }, fundo: '#060505', amb: { i: .25, c: '#bfc6d6' }, exposicao: 1.2 },
    st: lerEstado(expoAtual), guardar, D,
  };

  /* ----- monta: construtor base + camadas extras ----- */
  const base = BASES[cena.base] || BASES[{ vento: 'deserto', calor: 'fogo', eletrico: 'paredes' }[cena.base]] || BASES.vazio;
  try { base(c, cena); } catch (e) { console.warn('expo3d base:', e); }
  (cena.extras || []).forEach(nome => { const f = EXTRAS[nome]; if (f) { try { f(c, cena); } catch (e) { console.warn('expo3d extra ' + nome + ':', e); } } });
  garantirPortas();
  // luzes que os objetos da biblioteca trouxeram ficam de fora (o orçamento é das luzes desta sala)
  const tirar = []; grupo.traverse(o => { if (o.isLight && !luzes.includes(o)) tirar.push(o); }); tirar.forEach(l => l.parent && l.parent.remove(l));

  // atmosfera pedida pela sala (névoa, fundo, ambiente, exposição)
  const atmosfera = {
    nevoa: { c: cena.nevoa?.c || c.atm.nevoa.c, d: cena.nevoa?.d ?? c.atm.nevoa.d },
    fundo: cena.fundo || c.atm.fundo, amb: { i: cena.amb?.i ?? c.atm.amb.i, c: cena.amb?.c || c.atm.amb.c }, exposicao: cena.exposicao ?? c.atm.exposicao,
  };

  function atualizar(x) {
    if (x) expoAtual = x;
    c.st = lerEstado(expoAtual);
    upds.forEach(f => { try { f(c.st); } catch (e) { console.warn('expo3d atualizar:', e); } });
  }
  atualizar(expoAtual);

  let tProg = 0, ultG = c.st.grupo;
  function anim(dt, t, cam) {
    dt = Math.min(.1, Math.max(0, dt || 0)); uT.value = t;
    // o progresso vem do registro (não muda o estado público): olha de vez em quando
    tProg -= dt; if (tProg <= 0) { tProg = 1.2; const g = lerEstado(expoAtual).grupo; if (g !== ultG) { ultG = g; atualizar(); } }
    for (let i = 0; i < anims.length; i++) anims[i](dt, t, cam);
    for (let i = 0; i < animF.length; i++) animF[i](dt, t);
    // de cima (vista de fora): sem céu e sem as paredes do lado da câmera, como a casa de bonecas do site
    if (cam && cam.position) {
      const dx = cam.position.x - CX, dz = cam.position.z - CZ, fora = cam.position.y > ALT + .05;
      teto.visible = !fora;
      if (fora) { lados.n.visible = dz > -2; lados.s.visible = dz < 2; lados.w.visible = dx > -2; lados.e.visible = dx < 2; }
      else lados.n.visible = lados.s.visible = lados.w.visible = lados.e.visible = true;
    }
    const A = window.ACF, fat = A && A.apagao ? .08 : 1;
    for (let i = 0; i < luzes.length; i++) luzes[i].intensity = Math.max(0, luzes[i].userData.i) * fat;
  }
  function descartar() {
    if (grupo.parent) grupo.parent.remove(grupo);
    desc.forEach(x => { try { x.dispose(); } catch (e) {} });
    desc.length = 0; anims.length = 0; upds.length = 0;
  }
  return { grupo, anim, atualizar, colisoes, atmosfera, descartar, luzes, base: cena.base };
}

/* =========================================================
   CAMADAS EXTRAS (combináveis em qualquer sala)
   ========================================================= */
const EXTRAS = {
  // respingos no chão (anéis que abrem e somem)
  respingos(c, s) {
    const T = c.T, n = Math.round(110 * c.Q), cor = s.respingoCor || misturar(s.cor, '#ffffff', .3), lento = s.viscosidade > .7;
    const im = c.multidao(new T.RingGeometry(.55, .7, 18).rotateX(-PI / 2), c.basico(cor, { op: .45 }), n), ps = [];
    for (let i = 0; i < n; i++) ps.push({ x: 0, z: 0, f: c.r(), v: (lento ? .35 : 1.2) * (.7 + c.r() * .6), id: -1 });
    c.anim((dt, t) => {
      const y = c.liq ? c.liq.nivel + .03 : .03;
      ps.forEach((p, i) => { const k = t * p.v + p.f, id = Math.floor(k), f = k - id; if (id !== p.id) { p.id = id; p.x = (Math.random() - .5) * (c.SALA - .6); p.z = (Math.random() - .5) * (c.SALA - .6); } c.por(im, i, p.x, f < .75 ? y : -5, p.z, 0, .04 + f * .4); });
      im.instanceMatrix.needsUpdate = true;
    });
    c.part({ modo: 3, n: 500, forma: 0, tam: .05, cor, op: .9, fluxo: lento ? .5 : 2.2, cresce: -.6, vel: [0, .35, 0], caixa: [-c.H, c.H, .02, .04, -c.H, c.H], sem: 2 });
  },
  // poças que crescem com as rodadas
  pocas(c, s) {
    const tx = c.textura('pocas' + s.cor, 512, 512, (x, W, Hh, rr) => { x.fillStyle = '#000'; x.fillRect(0, 0, W, Hh); for (let i = 0; i < 26; i++) { const cx = rr() * W, cy = rr() * Hh; x.fillStyle = 'rgba(255,255,255,1)'; x.beginPath(); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, R = 14 + rr() * 40; x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R * .8); } x.fill(); } });
    tx.encoding = c.T.LinearEncoding;
    const m = c.matTx(null, { c: misturar(s.cor, '#000000', .55), r: .03, me: .6, op: 0, decal: true }); m.alphaMap = tx; m.map = null; m.needsUpdate = true;
    const p = c.malha(new c.T.PlaneGeometry(c.SALA, c.SALA), m); p.rotation.x = -PI / 2; p.position.y = .02;
    c.upd(st => { m.opacity = .45 + .5 * Math.max(st.kRod, .1); });
  },
  // gotas grossas paradas no ar (o tempo anda devagar)
  gotas_suspensas(c, s) { c.part({ modo: 2, n: 380, forma: 5, tam: .2, cor: s.cor, op: .95, turb: .06, vel: [0, -.25, 0], caixa: [-c.H + .5, c.H - .5, .4, c.ALT - .4, -c.H + .5, c.H - .5], sem: 3 }); },
  // céu baixo que escurece e relampeja
  relampago(c, s) {
    const l = c.luz(misturar(s.cor, '#ffffff', .6), 0, 40, 0, c.ALT - .3, 0); let prox = 4, fl = 0;
    c.anim((dt, t) => { prox -= dt; if (prox < 0) { prox = 5 + c.r() * 9; fl = 1; } fl = Math.max(0, fl - dt * 3.5); l.userData.i = fl * (Math.sin(t * 60) > -.3 ? 3.5 : .4); });
  },
  // névoa rente ao chão
  nevoa_baixa(c, s) { c.part({ modo: 2, n: 260, forma: 0, tam: 4.2, cor: s.nevoaCor || misturar(c.atm.nevoa.c, '#aab0b8', .55), op: .1, turb: .6, caixa: [-c.H + 1, c.H - 1, .1, .9, -c.H + 1, c.H - 1], sem: 4, ordem: 4 }); c.atm.nevoa.d = Math.max(c.atm.nevoa.d, .045); },
  poeira(c, s) { c.part({ modo: 2, n: 900, forma: 0, tam: .035, cor: s.poeiraCor || '#d8ccb4', op: .5, turb: .35, caixa: [-c.H, c.H, .2, c.ALT - .2, -c.H, c.H], sem: 5 }); },
  cinzas(c, s) { c.part({ n: 1200, forma: 4, tam: .07, cor: '#6a6866', op: .7, vel: [.2, -.35, .1], turb: .25, caixa: [-c.H, c.H, 0, c.ALT, -c.H, c.H], sem: 6 }); },
  neve(c, s) { c.part({ n: 2600, forma: 0, tam: .06, cor: '#f2f6ff', op: .85, vel: [s.vento ? 4 : .2, -.6, s.vento ? 1 : .1], turb: .3, caixa: [-c.H, c.H, 0, c.ALT, -c.H, c.H], sem: 7 }); },
  brasas(c, s) { c.part({ n: 700, forma: 0, tam: .06, cor: '#ff7a1a', op: 1, aditivo: true, vel: [.15, .7, .05], turb: .4, caixa: [-c.H, c.H, 0, c.ALT, -c.H, c.H], sem: 8 }); },
  faiscas(c, s) {
    const cor = s.faiscaCor || '#bfe0ff';
    const p = c.part({ modo: 3, n: 260, forma: 2, tam: .22, cor, op: 1, aditivo: true, fluxo: 1.1, cresce: -.7, vel: [0, -1.2, 0], caixa: [-c.H + 1, c.H - 1, c.ALT - .6, c.ALT - .2, -c.H + 1, c.H - 1], sem: 9 });
    c.upd(st => p.dens(.3 + .7 * Math.max(st.kRod, .2)));
  },
  vapor(c, s) { c.part({ n: 260, forma: 0, tam: .9, cor: '#e8e4dc', op: .07, vel: [0, .35, 0], turb: .2, caixa: [-c.H + 2, c.H - 2, .6, c.ALT, -c.H + 2, c.H - 2], sem: 10 }); },
  letras(c, s) {
    const p = c.part({ modo: 2, n: 520, forma: 6, tam: .22, cor: s.letraCor || '#f4e7c8', op: .9, turb: .9, vel: [0, .4, 0], caixa: [-c.H + 1, c.H - 1, .5, c.ALT - .3, -c.H + 1, c.H - 1], sem: 11 });
    c.upd(st => p.dens(.25 + .75 * Math.max(st.kProg, st.kRod * .6)));
  },
  // batida de coração: luzes e brilho pulsam (tum... tum)
  pulso(c, s) {
    const l = c.luz(s.pulsoCor || '#ff2a2a', 0, 22, 0, .6, 0);
    c.anim((dt, t) => { const k = Math.pow(Math.max(0, Math.sin(t * 6.2)), 12) + .6 * Math.pow(Math.max(0, Math.sin(t * 6.2 - 1.1)), 12); l.userData.i = .3 + k * (1.6 + c.st.kRod * 1.4); c.pulsoK = k; });
  },
  sirene(c, s) {
    const l = c.luz('#ff1a0a', 1.6, 18, 0, c.ALT - .5, 0); const G = new c.T.Group(); G.position.set(0, c.ALT - .02, 0); c.grupo.add(G);
    c.malha(new c.T.CylinderGeometry(.18, .22, .3, 14).translate(0, -.15, 0), c.emis('#ff2010', 2.2, { c: '#400000' }), G);
    c.anim((dt, t) => { const a = t * 3.2; l.position.set(Math.cos(a) * 5, c.ALT - .5, Math.sin(a) * 5); l.userData.i = 1.2 + .8 * Math.max(0, Math.sin(t * 6.4)); });
  },
  luz_vermelha(c, s) { c.vermelho = true; },
  // tremores: sacode o que estiver em c.tremem e solta poeira do teto
  tremor(c, s) {
    const p = c.part({ modo: 3, n: 160, forma: 0, tam: .08, cor: '#cbbfa6', op: .8, fluxo: .9, vel: [0, -3, 0], caixa: [-c.H + 1, c.H - 1, c.ALT - .3, c.ALT - .1, -c.H + 1, c.H - 1], sem: 12 });
    let prox = 3, f = 0;
    c.anim((dt, t) => {
      prox -= dt; if (prox < 0) { prox = (7 - 4 * c.st.kRod) + c.r() * 4; f = 1; }
      f = Math.max(0, f - dt * 1.2); p.u.uOp.value = .2 + f * .8;
      c.tremem.forEach((o, i) => { if (!o.userData.r0) o.userData.r0 = o.rotation.clone(); o.rotation.z = o.userData.r0.z + Math.sin(t * 31 + i) * .03 * f; o.rotation.x = o.userData.r0.x + Math.cos(t * 27 + i) * .02 * f; });
      c.tremorK = f;
    });
  },
  // rachaduras no chão que crescem com as rodadas (o canal alfa guarda a ordem em que a rachadura abre)
  rachaduras(c, s) {
    const tx = c.textura('rachaduras', 1024, 1024, (x, W, Hh, rr) => {
      x.fillStyle = '#000'; x.fillRect(0, 0, W, Hh); x.lineCap = 'round';
      const ramo = (px, py, an, comp, larg, ordem) => { for (let k = 0; k < comp; k++) { const nx = px + Math.cos(an) * 14, ny = py + Math.sin(an) * 14; const a = Math.min(1, ordem + k / 160), v = Math.round(255 * (1 - a * .92)); x.strokeStyle = `rgb(${v},${v},${v})`; x.lineWidth = Math.max(1, larg * (1 - k / comp)); x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke(); px = nx; py = ny; an += (rr() - .5) * .7; if (rr() < .08 && larg > 1.5) ramo(px, py, an + (rr() < .5 ? .9 : -.9), comp * .5, larg * .6, a); } };
      for (let i = 0; i < 6; i++) ramo(W / 2 + (rr() - .5) * 300, Hh / 2 + (rr() - .5) * 300, rr() * TAU, 40 + rr() * 30, 7, 0);
    });
    tx.encoding = c.T.LinearEncoding;
    const m = c.matTx(null, { c: '#050403', r: 1, decal: true }); m.alphaMap = tx; m.transparent = true; m.alphaTest = .5; m.needsUpdate = true;
    const p = c.malha(new c.T.PlaneGeometry(c.SALA, c.SALA), m); p.rotation.x = -PI / 2; p.position.y = .022;
    c.upd(st => { m.alphaTest = lim(.93 - .8 * Math.max(st.kRod, .08), .06, .95); });
  },
  // zonas marcadas no chão (anéis que acendem em sequência)
  zonas(c, s) {
    const cen = s.zonaCentro || [0, 0], raios = s.raios || [3, 6, 9];
    const mats = raios.map((R, i) => { const m = c.emis(s.zonaCor || s.cor, 0, { c: '#0a0a0a', op: .85 }); m.depthWrite = false; const me = c.malha(new c.T.RingGeometry(R - .12, R + .12, 72), m, c.grupo, cen[0], .03 + i * .002, cen[1]); me.rotation.x = -PI / 2; return m; });
    const disco = c.emis(s.zonaCor || s.cor, 0, { c: '#000000', op: .25 }); disco.depthWrite = false; c.malha(new c.T.CircleGeometry(raios[0] - .12, 48), disco, c.grupo, cen[0], .028, cen[1]).rotation.x = -PI / 2;
    c.anim((dt, t) => { const v = 1.2 + c.st.kRod * 3; mats.forEach((m, i) => { m.emissiveIntensity = .3 + 1.6 * Math.pow(Math.max(0, Math.sin(t * v - i * 1.1)), 6); }); disco.emissiveIntensity = .2 + .5 * Math.max(0, Math.sin(t * v * 2)); });
  },
  // marcas do caminho da travessia: acendem conforme o grupo avança
  trechos(c, s) {
    const n = Math.min(9, Math.max(3, c.st.need || 5)), lista = [];
    const [ax, az] = c.pEnt, [bx, bz] = c.pSai, ml = c.emis('#c8ffe6', 0, { c: '#101412' }), md = c.mat('#1a1a1a', { r: .6, me: .5 });
    for (let i = 1; i <= n; i++) { const k = i / (n + 1), x = mix(ax, bx, k) + Math.sin(k * 7 + c.cena.semente) * 1.2, z = mix(az, bz, k) + Math.cos(k * 5 + c.cena.semente) * 1.2; const me = c.malha(new c.T.CylinderGeometry(.16, .18, .05, 16), md, c.grupo, x, .03, z); const tp = c.malha(new c.T.CircleGeometry(.11, 16), ml, c.grupo, x, .062, z); tp.rotation.x = -PI / 2; lista.push(tp); me.userData.k = i; }
    const mo = c.emis('#c8ffe6', 1.4, { c: '#101412' });
    c.upd(st => { const feitos = Math.round(st.kProg * n); lista.forEach((p, i) => { p.material = i < feitos ? mo : ml; }); });
  },
  fluorescente(c, s) {
    const m = c.emis('#e8fff4', 1.8, { c: '#ffffff' }), lista = [];
    for (let i = 0; i < 6; i++) { const x = (i % 3 - 1) * 6, z = (i < 3 ? -1 : 1) * 4; if (!c.livre(x, z, -1)) continue; lista.push(c.malha(new c.T.BoxGeometry(1.4, .05, .16), m, c.grupo, x, c.ALT - .1, z)); }
    const l = c.luz('#dffff0', 1.2, 14, 0, c.ALT - .4, 0), rr = aleatorio(31);
    c.anim((dt, t) => { const on = !(Math.sin(t * 2.3) > .92 || rr() < .02); m.emissiveIntensity = on ? 1.8 : .1; l.userData.i = on ? 1.2 : .1; });
  },
  tique(c, s) {
    const lado = c.ladosLivres()[1] || 'e', P = c.naParede(lado, 4, .04), g = c.F.P.relogio({ y: 2.8, raio: .45 });
    g.position.set(P.x, 0, P.z); g.rotation.y = P.ry; c.grupo.add(g);
  },
  // olhos que piscam no escuro
  olhos(c, s) {
    const n = Math.round(14 * (c.celular ? .6 : 1)), m = c.emis(s.olhoCor || '#fff1b0', 2.2, { c: '#000000' }), lista = [];
    for (let i = 0; i < n; i++) { const P = c.naParede(['n', 's', 'w', 'e'][i % 4], (c.r() - .5) * 16, .06 + c.r() * .2); if (!c.livre(P.x, P.z, -2)) continue; const g = new c.T.Group(); g.position.set(P.x, .6 + c.r() * 2.6, P.z); g.rotation.y = P.ry; [-1, 1].forEach(sx => c.malha(new c.T.SphereGeometry(.025, 6, 4), m, g, sx * .06, 0, 0)); c.grupo.add(g); lista.push([g, c.r() * 20]); }
    c.anim((dt, t) => lista.forEach(([g, f]) => { g.visible = Math.sin(t * .4 + f) > .2 && Math.sin(t * 7 + f) > -.95; }));
  },
  // arcos elétricos que estalam entre pontos baixos
  arcos(c, s) {
    const T = c.T, n = c.celular ? 3 : 6, seg = 10, pos = new Float32Array(n * seg * 2 * 3);
    const geo = c.guardar(new T.BufferGeometry()); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const m = c.guardar(new T.LineBasicMaterial({ color: new T.Color(s.arcoCor || '#9fd8ff'), transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }));
    const ln = new T.LineSegments(geo, m); ln.frustumCulled = false; c.grupo.add(ln);
    const pontos = []; for (let i = 0; i < n; i++) { const [x, z] = c.pontoLivre(aleatorio(77 + i), 1.5); pontos.push([x, z, c.r() * TAU]); }
    let tt = 0;
    c.anim((dt, t) => {
      tt -= dt; if (tt > 0) return; tt = .06;
      const rr = Math.random; let k = 0;
      pontos.forEach(([x, z, f], i) => {
        const on = Math.sin(t * 2.1 + f) > .2 - c.st.kRod * .6, a = [x, .05, z], b = [x + Math.cos(f + t) * 1.6, on ? 1.8 + rr() : .05, z + Math.sin(f + t) * 1.6];
        let px = a[0], py = a[1], pz = a[2];
        for (let j = 1; j <= seg; j++) { const q = j / seg, nx = mix(a[0], b[0], q) + (j < seg ? (rr() - .5) * .35 : 0), ny = mix(a[1], b[1], q) + (j < seg ? (rr() - .5) * .35 : 0), nz = mix(a[2], b[2], q) + (j < seg ? (rr() - .5) * .35 : 0); if (!on) { pos.fill(0, k, k + 6); k += 6; continue; } pos[k++] = px; pos[k++] = py; pos[k++] = pz; pos[k++] = nx; pos[k++] = ny; pos[k++] = nz; px = nx; py = ny; pz = nz; }
      });
      geo.attributes.position.needsUpdate = true;
    });
  },
  gotejar(c, s) {
    c.part({ n: 140, forma: 1, tam: .25, cor: s.cor, op: .8, vel: [0, -6, 0], caixa: [-c.H + 2, c.H - 2, 0, c.ALT, -c.H + 2, c.H - 2], sem: 13 });
    c.part({ modo: 3, n: 120, forma: 3, tam: .35, cor: misturar(s.cor, '#ffffff', .2), op: .6, fluxo: .8, cresce: .8, caixa: [-c.H + 2, c.H - 2, .04, .05, -c.H + 2, c.H - 2], sem: 14 });
  },
  // chuva por cima de outra cena (tanque, navio...)
  chuva(c, s) {
    const cor = s.chuvaCor || '#c8d8e8';
    const p = c.part({ n: 7000, forma: 1, tam: .3, cor, op: .45, vel: [1.2, -10, .5], var: .3, turb: .02, caixa: [-c.H, c.H, 0, c.ALT - .1, -c.H, c.H], sem: 16 });
    c.upd(st => p.dens(.4 + .6 * Math.max(st.kRod, .1)));
  },
  calor(c, s) {
    c.part({ n: 500, forma: 0, tam: .5, cor: '#ffb070', op: .05, vel: [0, .9, 0], turb: .3, caixa: [-c.H, c.H, 0, c.ALT, -c.H, c.H], sem: 15 });
    EXTRAS.brasas(c, s);
  },
};

/* =========================================================
   CONSTRUTORES BASE
   ========================================================= */
// piso e paredes comuns (concreto do elemento)
function cascaPadrao(c, s, o = {}) {
  const cor = s.cor || '#555555';
  c.casca({ piso: c.mat(o.piso || misturar('#3a3734', cor, .12), { tex: o.pisoTex || 'concreto_sujo', rep: [5, 5], r: o.pisoR ?? .8 }), parede: c.mat(o.parede || misturar('#4a4642', cor, .1), { tex: o.paredeTex || 'parede_mofada', rep: [4, 1], r: .9 }), teto: o.semTeto ? null : c.mat(o.teto || '#2a2826', { tex: 'concreto_sujo', rep: [4, 4] }) });
}

const BASES = {
  /* ---------- chuva: céu baixo, gotas por elemento, respingos ---------- */
  chuva(c, s) {
    const cor = s.cor || '#7a0008', visc = s.viscosidade ?? .3, lento = visc > .7;
    c.casca({ piso: c.mat('#2b2725', { tex: 'concreto_sujo', rep: [5, 5], r: .2, me: .2 }), parede: c.mat('#3a3431', { tex: 'parede_mofada', rep: [4, 1], r: .55 }) });
    const ceuA = s.ceu || misturar(cor, '#000000', .45);
    c.ceu({ tipo: 'nuvens', a: ceuA, b: s.ceu2 || '#050404', rolar: [.006, .003], brilho: s.brilhoCeu ?? .8, sem: s.semente });
    const vel = lento ? -1.1 : -10 + visc * 4;
    const chuva = c.part({ n: lento ? 2400 : 9000, forma: lento ? 5 : 1, tam: lento ? .17 : .32, cor, op: lento ? .95 : .55, vel: [lento ? 0 : .8, vel, lento ? 0 : .4], var: .35, turb: lento ? .05 : .02, caixa: [-c.H, c.H, 0, c.ALT - .1, -c.H, c.H], sem: 1 });
    const lc = c.luz(misturar(ceuA, '#ffffff', .35), 1.6, 34, 0, c.ALT - .7, 0);
    c.upd(st => { const k = .35 + .65 * Math.max(st.kRod, .1) * (s.intensidade ?? .8) / .8; chuva.dens(k); chuva.u.uVel.value.y = vel * (.85 + .3 * k); lc.userData.i = 1.2 + .6 * k; });
    c.atm = { nevoa: { c: misturar(cor, '#000000', .8), d: .05 }, fundo: misturar(cor, '#000000', .85), amb: { i: .34, c: misturar(cor, '#ffffff', .55) }, exposicao: 1.15 };
  },

  /* ---------- maré / inundação: líquido que sobe por rodada ---------- */
  mare(c, s) {
    const T = c.T, K = c.K, cor = s.cor || '#2a0204', visc = s.viscosidade ?? .5, v = s.variante || 'tunel';
    if (v === 'piscina') { c.casca({ piso: c.mat('#9fb6bf', { tex: 'azulejo_sujo', rep: [10, 10], r: .4 }), parede: c.mat('#8fa6ae', { tex: 'azulejo_sujo', rep: [10, 2], r: .45 }) }); c.ceu({ tipo: 'nuvens', a: '#1d2328', b: '#020304', rolar: [.012, .004], brilho: .7 }); }
    else if (v === 'brejo') { c.casca({ piso: c.mat('#1d1a12', { tex: 'terra', rep: [5, 5] }), parede: c.mat('#1e2118', { tex: 'parede_mofada', rep: [3, 1] }) }); c.ceu({ tipo: 'copa', a: '#151a14', b: '#030403' }); }
    else {
      const parTx = s.paredeTipo === 'cranios' ? c.textura('cranios', 512, 512, (x, W, Hh, rr) => { x.fillStyle = '#2c2822'; x.fillRect(0, 0, W, Hh); for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { const cx = i * 58 + (j % 2) * 29 + 12, cy = j * 58 + 26, k = .8 + rr() * .4; x.fillStyle = `hsl(40,${12 + rr() * 10}%,${50 + rr() * 18}%)`; x.beginPath(); x.ellipse(cx, cy, 22 * k, 26 * k, 0, 0, TAU); x.fill(); x.fillRect(cx - 12 * k, cy + 14 * k, 24 * k, 14 * k); x.fillStyle = '#0b0907'; [-1, 1].forEach(s2 => { x.beginPath(); x.ellipse(cx + s2 * 9 * k, cy, 6 * k, 7 * k, 0, 0, TAU); x.fill(); }); x.beginPath(); x.moveTo(cx, cy + 6 * k); x.lineTo(cx - 3 * k, cy + 12 * k); x.lineTo(cx + 3 * k, cy + 12 * k); x.fill(); } }, [6, 1.2]) : null;
      c.casca({ piso: c.mat('#2a2622', { tex: 'concreto_sujo', rep: [6, 6], r: .4 }), parede: parTx ? c.matTx(parTx, { r: .8 }) : c.mat('#4a3c34', { tex: 'tijolo', rep: [8, 2], r: .7 }), teto: c.mat('#1e1b18', { tex: 'concreto_sujo', rep: [5, 5] }) });
      // costelas do túnel: arcos de concreto a cada 2,5 m e canos nas paredes
      const geos = [];
      for (let z = -c.H + 1.25; z < c.H; z += 2.5) { if (!c.livre(-c.H + .3, z, -1.5) || !c.livre(c.H - .3, z, -1.5)) continue; geos.push(K.caixa(.35, c.ALT, .45, -c.H + .2, 0, z), K.caixa(.35, c.ALT, .45, c.H - .2, 0, z), K.caixa(c.SALA, .35, .45, 0, c.ALT - .35, z)); }
      if (geos.length) c.malha(K.juntar(geos), c.mat('#3a332c', { tex: 'concreto_sujo', rep: [2, 1] }));
      const canos = []; ['w', 'e'].forEach(l => [1.1, 3.1].forEach(y => { const P0 = c.naParede(l, -c.H + .2, .45), P1 = c.naParede(l, c.H - .2, .45); const pa = c.vaos.find(q => q.lado === l); if (pa && y < 2.4) { const tP = c.tDaPorta(pa), A1 = c.naParede(l, tP - 1.4, .45), B1 = c.naParede(l, tP + 1.4, .45); canos.push(K.barra([P0.x, y, P0.z], [A1.x, y, A1.z], .18, .18, 10), K.barra([B1.x, y, B1.z], [P1.x, y, P1.z], .18, .18, 10)); } else canos.push(K.barra([P0.x, y, P0.z], [P1.x, y, P1.z], .18, .18, 10)); }));
      c.malha(K.juntar(canos), c.mat('#4a4038', { tex: 'ferrugem', r: .6, me: .5 }));
      // manchas secas nas paredes
      const sujo = c.textura('sangue_seco' + cor, 512, 256, (x, W, Hh, rr) => { x.clearRect(0, 0, W, Hh); for (let i = 0; i < 40; i++) { const px = rr() * W, w = 4 + rr() * 22; const g = x.createLinearGradient(0, 0, 0, Hh); g.addColorStop(0, rgba(misturar(cor, '#000000', .2), .0)); g.addColorStop(.3 + rr() * .3, rgba(misturar(cor, '#000000', .2), .7)); g.addColorStop(1, rgba(cor, .0)); x.fillStyle = g; x.fillRect(px, 0, w, Hh * (.4 + rr() * .6)); } });
      const ms = c.matTx(sujo, { r: .5, op: .8 }); ['n', 's', 'w', 'e'].forEach(l => c.parede(l, ms, [2, 1], .04));
    }
    const L = c.liquido({ cor, op: s.opacidade ?? (v === 'piscina' ? .82 : 1), r: s.rugosidade ?? (visc > .7 ? .25 : .08), me: .25, e: misturar(cor, '#000000', .6), ei: .25, amp: s.amplitude ?? (v === 'piscina' ? .3 : .05 + (1 - visc) * .05), vel: s.velocidade ?? (v === 'piscina' ? 1.6 : 1.4 - visc), y: .05 });
    const n0 = s.nivel ? s.nivel[0] : .05, n1 = s.nivel ? s.nivel[1] : 1.7;
    c.liq = L;
    // coisas boiando (coágulos, dentes, roupas, detritos)
    if (s.boiando) {
      const n = Math.round(60 * c.Q), geo = s.boiando === 'coagulos' ? new T.IcosahedronGeometry(.16, 0) : new T.BoxGeometry(.18, .04, .12);
      const im = c.multidao(geo, c.mat(s.boiando === 'coagulos' ? misturar(cor, '#000000', .35) : '#cfc6b0', { r: .5 }), n), pos = [];
      for (let i = 0; i < n; i++) pos.push([(c.r() - .5) * (c.SALA - 1), (c.r() - .5) * (c.SALA - 1), c.r() * TAU, .5 + c.r()]);
      c.anim((dt, t) => { pos.forEach((p, i) => { p[0] += Math.sin(t * .3 + i) * dt * .2; p[1] += dt * .25 * (1 - visc); if (p[1] > c.H - .5) p[1] = -c.H + .5; c.por(im, i, p[0], L.nivel + .02 + Math.sin(t * 1.5 + i) * .03, p[1], p[2] + t * .1, p[3]); }); im.instanceMatrix.needsUpdate = true; });
    }
    // corpos boiando de bruços (aparecem com as rodadas)
    if (s.corpos) {
      const n = Math.round(10 * (c.celular ? .6 : 1)), im = c.multidao(K.boneco('pe'), c.mat(s.corpoCor || '#d9661f', { r: .85 }), n), ps = [];
      for (let i = 0; i < n; i++) { const [x, z] = c.pontoLivre(aleatorio(300 + i), 1.5); ps.push([x, z, c.r() * TAU]); }
      c.anim((dt, t) => { const vis = Math.round(n * Math.min(1, .2 + c.st.kRod)); im.count = vis; ps.forEach((p, i) => c.por(im, i, p[0] + Math.sin(t * .2 + i) * .3, L.nivel - .04 + Math.sin(t + i) * .02, p[1], p[2] + Math.sin(t * .1 + i) * .2, 1, PI / 2)); im.instanceMatrix.needsUpdate = true; });
    }
    // juncos e mato que fecham o caminho (brejo)
    if (v === 'brejo') {
      const n = Math.round(1400 * c.Q), im = c.multidao(new T.ConeGeometry(.025, 1.8, 3).translate(0, .9, 0), c.mat('#3a3a22', { r: .9 }), n), rr = aleatorio(91);
      for (let i = 0; i < n; i++) { const cx = (rr() - .5) * (c.SALA - 1), cz = (rr() - .5) * (c.SALA - 1); if (!c.livre(cx, cz, -1)) { c.por(im, i, 0, -9, 0); continue; } c.por(im, i, cx, 0, cz, rr() * 3, .6 + rr() * .9, (rr() - .5) * .3, (rr() - .5) * .3); }
      im.instanceMatrix.needsUpdate = true;
      c.part({ modo: 3, n: 200, forma: 3, tam: .3, cor: '#6a6a50', op: .6, fluxo: .5, cresce: .6, caixa: [-c.H, c.H, 0, .01, -c.H, c.H], pai: L.me, sem: 21 });
    }
    // piscina de ondas: máquinas nas paredes, balsa e plataforma de saída
    if (v === 'piscina') {
      const geos = []; ['w', 'e'].forEach(l => [-6, 0, 6].forEach(t => { const P = c.naParede(l, t, .6); if (!c.livre(P.x, P.z, -1)) return; geos.push(K.caixa(2.2, 2.6, 1.1, P.x, 0, P.z, 0, P.ry, 0)); }));
      if (geos.length) c.malha(K.juntar(geos), c.mat('#4c5258', { tex: 'metal_sujo', me: .6, r: .45 }));
      const balsa = new T.Group(); c.grupo.add(balsa);
      c.malha(K.juntar([new T.TorusGeometry(1.25, .3, 10, 28).rotateX(PI / 2).scale(1, 1, 1.45).translate(0, .3, 0)]), c.mat('#e0581a', { r: .55 }), balsa);
      c.malha(new T.CircleGeometry(1.25, 28).rotateX(-PI / 2).scale(1, 1, 1.45).translate(0, .1, 0), c.mat('#2a2a2a', { r: .8 }), balsa);
      c.malha(K.tubo([[-1.3, .55, -1], [-1.5, .5, 0], [-1.3, .55, 1], [0, .55, 1.95], [1.3, .55, 1], [1.5, .5, 0], [1.3, .55, -1], [0, .55, -1.95], [-1.3, .55, -1]], .025, 40, 4), c.mat('#e8e2d0', { r: .8 }), balsa);
      const [bx, bz] = c.pSai, plat = c.mat('#5a6066', { tex: 'grade_chao', me: .5, r: .5 }), lado = c.sai ? c.sai : null;
      const pl2 = c.malha(new T.BoxGeometry(3, 1.4, 2.4).translate(0, .7, 0), plat, c.grupo, bx + (lado && lado.nz ? 3.4 : 0), 0, bz + (lado && lado.nx ? 3.4 : 0));
      c.anim((dt, t) => { const k = c.st.kProg, x = mix(c.pEnt[0], c.pSai[0], .15 + .7 * k), z = mix(c.pEnt[1], c.pSai[1], .15 + .7 * k); balsa.position.set(mix(balsa.position.x, x, dt * .5), L.nivel - .12 + Math.sin(t * 1.6) * .15, mix(balsa.position.z, z, dt * .5)); balsa.rotation.set(Math.sin(t * 1.3) * .12, Math.atan2(c.pSai[0] - c.pEnt[0], c.pSai[1] - c.pEnt[1]), Math.cos(t * 1.1) * .1); });
      void pl2;
    }
    c.upd(st => { L.alvo = s.fixo ? n1 : mix(n0, n1, Math.max(st.kRod, .05)); });
    const pulso = s.extras && s.extras.includes('pulso');
    if (pulso) { let ult = 0; c.anim((dt, t) => { const fase = Math.floor(t * 6.2 / TAU); if (fase !== ult) { ult = fase; L.pulsar(c.pEnt[0], c.pEnt[1], 1 + c.st.kRod); } }); }
    c.atm = v === 'brejo' ? { nevoa: { c: '#1a1d16', d: .085 }, fundo: '#0b0c09', amb: { i: .3, c: '#a8b498' }, exposicao: 1.1 }
      : v === 'piscina' ? { nevoa: { c: '#10161a', d: .045 }, fundo: '#06090b', amb: { i: .4, c: '#a8c0d0' }, exposicao: 1.15 }
      : { nevoa: { c: misturar(cor, '#000000', .7), d: .05 }, fundo: '#040303', amb: { i: .28, c: misturar(cor, '#ffd8c8', .6) }, exposicao: 1.2 };
    if (v !== 'piscina') c.luz(misturar(cor, '#ffffff', .5), 1.1, 24, 0, c.ALT - .5, 0);
  },

  /* ---------- paredes que fecham (carne viva ou aço com ladrilhos elétricos) ---------- */
  paredes(c, s) {
    const T = c.T, K = c.K, carne = (s.material || 'carne') === 'carne', H = c.H, ALT = c.ALT;
    const mP = carne ? c.mat('#7a1c20', { tex: 'carne', rep: [3, 1], r: .35, e: '#2a0004', ei: .5 }) : c.mat('#5d646b', { tex: 'metal_sujo', rep: [3, 1], me: .7, r: .4 });
    c.casca({ piso: carne ? c.mat('#5a1418', { tex: 'carne', rep: [4, 4], r: .3 }) : c.mat('#3c4248', { tex: 'grade_chao', rep: [6, 6], me: .6, r: .45 }), parede: mP, teto: carne ? c.mat('#4a1014', { tex: 'carne', rep: [3, 3], r: .4 }) : c.mat('#2e3338', { tex: 'metal_sujo', rep: [4, 4], me: .6 }) });
    // eixo: as paredes com menos portas são as que andam
    const eixoX = (c.portasNoLado('w') + c.portasNoLado('e')) <= (c.portasNoLado('n') + c.portasNoLado('s'));
    const ladosM = eixoX ? ['w', 'e'] : ['n', 's'], dMax = s.fecha ?? 6.2, ESP = .6;
    const moveis = ladosM.map(l => {
      const g = new T.Group(); c.grupo.add(g);
      const porta = c.vaos.find(v => v.lado === l), tP = porta ? c.tDaPorta(porta) : null;
      const segs = tP === null ? [[-H, H]] : [[-H, tP - 1.3], [tP + 1.3, H]];
      const geos = segs.filter(([a, b]) => b - a > .05).map(([a, b]) => K.caixa(b - a, ALT - .02, ESP, (a + b) / 2, 0, -ESP / 2));
      if (tP !== null) geos.push(K.caixa(2.6, ALT - 2.4, ESP, tP, 2.4, -ESP / 2));
      const painel = c.malha(K.juntar(geos), mP, g);
      // túnel da porta: batentes do vão até o painel (nunca fecha a porta)
      let manga = null;
      if (tP !== null) { manga = new T.Group(); g.add(manga); const gm = K.juntar([K.caixa(.15, ALT, 1, tP - 1.37, 0, -.5), K.caixa(.15, ALT, 1, tP + 1.37, 0, -.5), K.caixa(2.9, ALT - 2.4, 1, tP, 2.4, -.5)]); c.malha(gm, mP, manga); }
      // veias / rebites na face
      if (carne) { const vg = []; for (let i = 0; i < 14; i++) { const t0 = (c.r() - .5) * c.SALA, pts = []; let y = 0, t1 = t0; for (let k = 0; k < 6; k++) { pts.push([t1, y, .02]); y += .7; t1 += (c.r() - .5) * 1.2; } if (tP !== null && Math.abs(t0 - tP) < 1.8) continue; vg.push(K.tubo(pts, .05 + c.r() * .04, 16, 5)); } if (vg.length) c.malha(K.juntar(vg), c.mat('#4a0a12', { r: .3, e: '#300006', ei: .6 }), g); }
      return { l, g, painel, manga, tP, d: 0, q: [], rects: [c.colDin(), c.colDin()] };
    });
    // boca na porta de saída (carne): dentes em volta do vão
    if (carne && c.sai) { const v = c.sai, P = c.naParede(v.lado, c.tDaPorta(v), .05), g = new T.Group(); g.position.set(P.x, 0, P.z); g.rotation.y = P.ry; c.grupo.add(g); const dg = []; for (let i = 0; i < 18; i++) { const k = i / 17; const y = k < .35 ? k / .35 * 2.25 : k < .65 ? 2.25 : (1 - k) / .35 * 2.25; const x = k < .35 ? -1.25 : k < .65 ? -1.25 + (k - .35) / .3 * 2.5 : 1.25; const ang = k < .35 ? -PI / 2 : k < .65 ? PI : PI / 2; dg.push(new T.ConeGeometry(.08, .32, 5).rotateZ(ang).translate(x + (k < .35 ? .12 : k > .65 ? -.12 : 0), y - (k >= .35 && k <= .65 ? .12 : 0), .06)); } c.malha(K.juntar(dg), c.mat('#e6dcc0', { r: .4 }), g); g.userData.boca = true; c.boca = g; }
    // ladrilhos numerados (aço): 5 x 5 no meio, alguns acendem em azul e estalam
    if (!carne) {
      const L = 12, tx = c.textura('ladrilhos', 1024, 1024, (x, W, Hh) => { x.fillStyle = '#2e3236'; x.fillRect(0, 0, W, Hh); x.strokeStyle = '#111'; x.lineWidth = 8; x.font = 'bold 90px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { x.strokeRect(i * W / 5 + 4, j * Hh / 5 + 4, W / 5 - 8, Hh / 5 - 8); x.fillStyle = 'rgba(220,230,240,.55)'; x.fillText(String(j * 5 + i + 1), i * W / 5 + W / 10, j * Hh / 5 + Hh / 10); } });
      c.malha(new T.PlaneGeometry(L, L), c.matTx(tx, { me: .6, r: .4, decal: true }), c.grupo, 0, .025, 0).rotation.x = -PI / 2;
      const mL = c.emis('#4aa8ff', 2.2, { c: '#0a1a2a', op: .7 }); mL.depthWrite = false;
      const im = c.multidao(new T.PlaneGeometry(L / 5 - .16, L / 5 - .16).rotateX(-PI / 2), mL, 25);
      const ac = c.part({ modo: 3, n: 300, forma: 2, tam: .25, cor: '#9fd8ff', op: 1, aditivo: true, fluxo: 2.2, cresce: -.6, vel: [0, .6, 0], caixa: [-L / 2, L / 2, .05, .4, -L / 2, L / 2], sem: 31 });
      const lz = c.luz('#5ab0ff', 0, 14, 0, .8, 0);
      c.upd(st => { const rr = aleatorio(c.cena.semente + st.rod * 17); let k = 0; for (let i = 0; i < 25; i++) { const on = rr() < .25 + .25 * st.kRod; c.por(im, i, (i % 5 - 2) * L / 5, on ? .03 : -5, (Math.floor(i / 5) - 2) * L / 5); k += on; } im.instanceMatrix.needsUpdate = true; ac.dens(.2 + k / 12); });
      c.anim((dt, t) => { mL.emissiveIntensity = 1.4 + Math.random() * 1.6; lz.userData.i = .6 + Math.random() * 1.2; });
    }
    // anda: devagar "espreitando", às vezes num tranco
    let tranco = 0, prox = 3;
    c.anim((dt, t) => {
      prox -= dt; if (prox < 0) { prox = 3 + c.r() * 5; tranco = 1; }
      tranco = Math.max(0, tranco - dt * 2.5);
      const alvo = dMax * Math.max(c.st.kRod, 0) + (carne ? Math.sin(t * .5) * .15 : 0) + tranco * .45;
      moveis.forEach((M, i) => {
        M.d += (alvo - M.d) * Math.min(1, dt * (tranco > .5 ? 4 : .4));
        const d = Math.max(0, M.d), P = c.naParede(M.l, 0, d + ESP + .02);
        M.g.position.set(P.x, 0, P.z); M.g.rotation.y = P.ry;
        if (carne) M.painel.scale.z = 1 + Math.sin(t * 2.2 + i) * .08 + (c.pulsoK || 0) * .12;
        if (M.manga) { M.manga.position.z = -ESP; M.manga.scale.set(1, 1, Math.max(.001, d + .02)); M.manga.visible = d > .03; }
        // colisões: atrás do painel (menos o túnel da porta) e o próprio painel
        const prof = d + ESP, t0 = M.tP;
        const ret = (a, b, q) => { const p1 = c.naParede(M.l, a, 0), p2 = c.naParede(M.l, b, prof); q[0] = c.grupo.position.x + Math.min(p1.x, p2.x); q[1] = c.grupo.position.x + Math.max(p1.x, p2.x); q[2] = c.grupo.position.z + Math.min(p1.z, p2.z); q[3] = c.grupo.position.z + Math.max(p1.z, p2.z); };
        if (t0 === null) { ret(-H, H, M.rects[0]); M.rects[1].fill(-1e5); }
        else { ret(-H, t0 - 1.3, M.rects[0]); ret(t0 + 1.3, H, M.rects[1]); }
      });
      if (c.boca) c.boca.scale.setScalar(1 + Math.sin(t * 3) * .03);
    });
    c.atm = carne ? { nevoa: { c: '#2a0806', d: .05 }, fundo: '#140302', amb: { i: .35, c: '#ff9a7a' }, exposicao: 1.2 } : { nevoa: { c: '#05080c', d: .035 }, fundo: '#030507', amb: { i: .3, c: '#9ab4d0' }, exposicao: 1.2 };
    c.luz(carne ? '#ff6a4a' : '#d8e6ff', carne ? 1.1 : 1.2, 22, 0, ALT - .5, 0);
  },

  /* ---------- poço: borda de concreto em volta de um poço que respira ---------- */
  poco(c, s) {
    const T = c.T, K = c.K, cor = s.cor || '#4a0306', R = s.raio || 6.4;
    cascaPadrao(c, s, { piso: '#3a3836', parede: '#3e3a36', paredeTex: 'concreto_sujo' });
    c.malha(new T.CylinderGeometry(R + .5, R + .55, .7, 64, 1, true), c.mat('#55524e', { tex: 'concreto_sujo', rep: [8, 1], lado: 2 }), c.grupo, 0, .35, 0);
    c.malha(new T.CylinderGeometry(R, R, .7, 64, 1, true), c.mat('#3a3634', { tex: 'concreto_sujo', rep: [8, 1], lado: 2 }), c.grupo, 0, .35, 0);
    const borda = c.malha(new T.RingGeometry(R, R + .5, 64), c.mat('#605c58', { tex: 'concreto_sujo', rep: [6, 1] }), c.grupo, 0, .7, 0); borda.rotation.x = -PI / 2;
    const L = c.liquido({ cor, r: .12, me: .3, e: misturar(cor, '#000000', .5), ei: .4, amp: .03, vel: .4, y: .5, faces: false, geo: new T.RingGeometry(.01, R, 64, 14) });
    // a placa na parede (texto público vem do cena3d)
    if (s.textos.placa) { const lado = c.ladosLivres()[0], P = c.naParede(lado, 0, .05); const me = c.malha(new T.PlaneGeometry(4, .6), c.matTx(c.textoTex(s.textos.placa, { w: 1024, h: 150, cor: '#d8d2c4', fundo: '#2a2622', tam: 64 }), { r: .9 }), c.grupo, P.x, 2.6, P.z); me.rotation.y = P.ry; }
    // guincho e corda descendo para o fundo
    const P = c.naParede(c.ladosLivres()[1] || 'e', 0, 0), dir = [-P.x, -P.z], k = (c.H - R) / c.H;
    const gx = P.x + dir[0] * k * .9, gz = P.z + dir[1] * k * .9;
    c.malha(K.juntar([K.caixa(.8, .8, .8, 0, 0, 0), K.cil(.25, .25, 1, 0, .6, 0, 12, 0, 0, PI / 2), K.caixa(.1, 2.6, .1, -.3, 0, 0), K.caixa(.1, 2.6, .1, .3, 0, 0), K.caixa(.8, .1, .1, 0, 2.6, 0)]), c.mat('#4a4440', { tex: 'ferrugem', me: .5 }), c.grupo, gx, 0, gz);
    c.malha(K.barra([gx, 2.6, gz], [gx * .82, .4, gz * .82], .02), c.mat('#c8b890'));
    const l = c.luz(misturar(cor, '#ff3030', .4), .8, 16, 0, .9, 0);
    c.anim((dt, t) => { L.alvo = .5 + Math.sin(t * .55) * .06; l.userData.i = .6 + Math.sin(t * .55) * .3; });
    c.part({ modo: 3, n: 140, forma: 3, tam: .5, cor: misturar(cor, '#ffffff', .15), op: .5, fluxo: .4, cresce: .8, caixa: [-R * .7, R * .7, 0, .01, -R * .7, R * .7], pai: L.me, sem: 41 });
    c.colRet(0, 0, R * 2 - 1, R * 2 - 1);
    c.colisaoPoco = true;
    c.atm = { nevoa: { c: '#120606', d: .045 }, fundo: '#070303', amb: { i: .22, c: '#d8b0a8' }, exposicao: 1.2 };
  },

  /* ---------- floresta de árvores com forma de gente e uma passarela torta ---------- */
  floresta(c, s) {
    const T = c.T, K = c.K, casca = s.cor || '#4a3a30';
    c.casca({ piso: c.mat('#1c1611', { tex: 'terra', rep: [5, 5] }), parede: c.mat('#16130f', { tex: 'parede_mofada', rep: [3, 1] }) });
    c.ceu({ tipo: 'copa', a: '#1a1e24', b: '#030304', brilho: .8 });
    // passarela: curva da entrada até a saída, feita de galhos trançados
    const [ax, az] = c.pEnt, [bx, bz] = c.pSai, dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
    const cur = new T.CatmullRomCurve3([0, .25, .5, .75, 1].map((k, i) => new T.Vector3(ax + dx * k + nx * (i % 2 ? (i === 1 ? 2.6 : -2.2) : 0), .35, az + dz * k + nz * (i % 2 ? (i === 1 ? 2.6 : -2.2) : 0))));
    const pl = [], tr = [], n = Math.ceil(cur.getLength() / .32);
    for (let i = 0; i <= n; i++) { const p = cur.getPoint(i / n), tg = cur.getTangent(i / n); const ry = Math.atan2(tg.x, tg.z); pl.push(K.caixa(1.6, .07, .26, 0, 0, 0, 0, ry, 0).translate(p.x, p.y - .07, p.z)); if (i % 3 === 0) [-1, 1].forEach(sd => tr.push(K.barra([p.x + Math.cos(ry) * sd * .7, 0, p.z - Math.sin(ry) * sd * .7], [p.x + Math.cos(ry) * sd * .78, .9 + c.r() * .2, p.z - Math.sin(ry) * sd * .78], .05, .03, 5))); }
    [-1, 1].forEach(sd => [.85, .55].forEach(y => { const pts = []; for (let i = 0; i <= 24; i++) { const p = cur.getPoint(i / 24), tg = cur.getTangent(i / 24), ry = Math.atan2(tg.x, tg.z); pts.push([p.x + Math.cos(ry) * sd * .78, y + Math.sin(i * 1.7) * .06, p.z - Math.sin(ry) * sd * .78]); } tr.push(K.tubo(pts, .045, 60, 5)); }));
    c.malha(K.juntar([...pl, ...tr]), c.mat(casca, { tex: 'madeira_velha', r: .95 }));
    // árvores-gente
    const perto = (x, z) => { for (let i = 0; i <= 30; i++) { const p = cur.getPoint(i / 30); if (Math.hypot(p.x - x, p.z - z) < 2.2) return true; } return false; };
    const nArv = Math.round(22 * (c.celular ? .55 : 1)), mCasca = c.mat(casca, { tex: 'madeira_velha', r: .95 }), olhos = [], mOlho = c.emis('#ffe9b0', 0, { c: '#000' });
    const arvs = [];
    for (let i = 0, tent = 0; i < nArv && tent < 400; tent++) {
      const x = (c.r() - .5) * (c.SALA - 1.6), z = (c.r() - .5) * (c.SALA - 1.6);
      if (!c.livre(x, z, .4) || perto(x, z) || arvs.some(a => Math.hypot(a[0] - x, a[1] - z) < 2.2)) continue;
      const rr = aleatorio(500 + i), h = 1.9 + rr() * .5, L2 = [];
      L2.push(K.cil(.26, .45, h, 0, 0, 0, 8)); L2.push(K.esf(.3, 0, h, 0, 8, 1.6, .7, .9)); L2.push(K.cil(.1, .12, .25, 0, h + .1, 0, 6)); L2.push(K.esf(.24, 0, h + .5, .02, 8, .9, 1.15, .95));
      [-1, 1].forEach(sd => { const pts = [[sd * .4, h + .05, 0], [sd * (.8 + rr() * .3), h + .5 + rr() * .4, (rr() - .5) * .5], [sd * (1.1 + rr() * .5), c.ALT - .4 - rr() * .5, (rr() - .5) * .8]]; L2.push(K.tubo(pts, .09, 10, 5)); const e = pts[2]; for (let f = 0; f < 4; f++) L2.push(K.barra(e, [e[0] + sd * (rr() - .2) * .5, e[1] + .2 + rr() * .3, e[2] + (rr() - .5) * .5], .03, .012, 4)); });
      // raízes como pés
      for (let f = 0; f < 4; f++) { const a = f / 4 * TAU + rr(); L2.push(K.barra([0, .4, 0], [Math.cos(a) * .9, 0, Math.sin(a) * .9], .1, .04, 5)); }
      const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z) + (rr() - .5) * .8; c.grupo.add(g);
      c.malha(K.juntar(L2), mCasca, g);
      const ol = new T.Group(); ol.position.set(0, h + .55, .22); [-1, 1].forEach(sd => c.malha(new T.SphereGeometry(.035, 6, 4), mOlho, ol, sd * .08, 0, 0)); g.add(ol); olhos.push(ol);
      arvs.push([x, z, g, rr() * 9]); c.colRet(x, z, .8, .8); i++;
    }
    // raízes pelo chão
    const rz = []; for (let i = 0; i < 26 * c.Q; i++) { const [x, z] = c.pontoLivre(aleatorio(700 + i), .8, -1); const a = c.r() * TAU; rz.push(K.tubo([[x, .02, z], [x + Math.cos(a) * 1.2, .12, z + Math.sin(a) * 1.2], [x + Math.cos(a + .5) * 2.4, .02, z + Math.sin(a + .5) * 2.4]], .06, 8, 4)); }
    if (rz.length) c.malha(K.juntar(rz), mCasca);
    c.anim((dt, t) => { arvs.forEach(([x, z, g, f]) => { const k = Math.sin(t * .7 + f); g.scale.set(1 + k * .015, 1 + k * .01, 1 + k * .02); }); mOlho.emissiveIntensity = .2 + c.st.kRod * 2.5; olhos.forEach((o, i) => { o.visible = i < Math.ceil(olhos.length * (.15 + c.st.kRod * .85)) && Math.sin(t * 5 + i * 7) > -.97; }); });
    c.luz('#8fa8d8', 1.1, 26, 3, c.ALT - .4, -2); c.luz('#c8b080', .6, 12, c.pSai[0], 2, c.pSai[1]);
    c.atm = { nevoa: { c: '#0c0f12', d: .06 }, fundo: '#050607', amb: { i: .28, c: '#8a9ab8' }, exposicao: 1.2 };
  },

  /* ---------- campo de grama (cinza que vira carne vermelha) ---------- */
  campo(c, s) {
    const T = c.T, K = c.K;
    c.casca({ piso: c.mat('#34322e', { tex: 'terra', rep: [6, 6] }) });
    c.horizonte({ ceu: '#8fa4b8', chao: '#5c5a54', tipo: 'montes', brilho: .75 });
    c.ceu({ tipo: 'pintado', a: '#9ab4cc', b: '#6a8098', brilho: .85 });
    const n = Math.round(9000 * c.Q), g = new T.BufferGeometry(), w = .045, h = .55;
    g.setAttribute('position', new T.BufferAttribute(new Float32Array([-w, 0, 0, w, 0, 0, -w * .6, h * .5, 0, w, 0, 0, w * .6, h * .5, 0, -w * .6, h * .5, 0, -w * .6, h * .5, 0, w * .6, h * .5, 0, 0, h, .04]), 3)); g.computeVertexNormals();
    const m = c.guardar(new T.MeshStandardMaterial({ color: new T.Color(s.cor || '#8a8a84'), roughness: .9, side: T.DoubleSide, emissive: new T.Color('#5a0008'), emissiveIntensity: 0 }));
    const bal = { value: .35 };
    m.onBeforeCompile = sh => { sh.uniforms.uT = c.uT; sh.uniforms.uBal = bal; sh.vertexShader = 'uniform float uT; uniform float uBal;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #else
      vec3 ip = vec3(0.0);
      #endif
      float fl = position.y * position.y * 3.0;
      transformed.x += sin(uT * 1.6 + ip.x * 0.7 + ip.z * 0.4) * fl * uBal;
      transformed.z += cos(uT * 1.2 + ip.z * 0.6) * fl * uBal * 0.6;`); };
    const im = c.multidao(g, m, n), rr = aleatorio(61);
    for (let i = 0; i < n; i++) { const x = (rr() - .5) * (c.SALA - .3), z = (rr() - .5) * (c.SALA - .3); c.por(im, i, x, 0, z, rr() * TAU, .6 + rr() * .9, (rr() - .5) * .3, (rr() - .5) * .3); }
    im.instanceMatrix.needsUpdate = true;
    // fios brancos que sobem e enrolam nos tornozelos
    const nf = Math.round(380 * c.Q), fio = c.multidao(new T.CylinderGeometry(.006, .012, 1, 3).translate(0, .5, 0), c.mat('#f2efe8', { r: .5 }), nf), fp = [];
    for (let i = 0; i < nf; i++) { const a = rr() * TAU, R = rr() * 7; fp.push([c.pEnt[0] * .2 + Math.cos(a) * R, c.pEnt[1] * .2 + Math.sin(a) * R, .3 + rr() * .9, rr() * 9]); }
    // a flor no fim do caminho
    const fl = new T.Group(); fl.position.set(c.pSai[0] * .8, 0, c.pSai[1] * .8); c.grupo.add(fl);
    const mf = c.mat('#8a0a14', { r: .35, e: '#3a0004', ei: .6 });
    c.malha(K.juntar([K.cil(.05, .08, 1.1, 0, 0, 0, 6), K.esf(.32, 0, 1.3, 0, 12, 1, 1.5, 1), ...[0, 1, 2, 3, 4].map(i => K.esf(.2, Math.cos(i * 1.26) * .32, 1.05, Math.sin(i * 1.26) * .32, 8, .6, 1.6, .6))]), mf, fl);
    const lf = c.luz('#ff2030', 0, 10, fl.position.x, 1.2, fl.position.z);
    c.luz('#c8d4e8', 1.2, 30, 0, c.ALT - .4, 0);
    const cinza = new T.Color(s.cor || '#8a8a84'), verm = new T.Color(s.cor2 || '#a0101a'), tmp = new T.Color();
    let kv = 0;
    c.anim((dt, t) => {
      const alvo = c.st.rod > 1 || c.st.kProg > 0 ? 1 : 0; kv += (alvo - kv) * Math.min(1, dt * .3);
      const pul = Math.pow(Math.max(0, Math.sin(t * 5.6)), 10);
      m.color.copy(tmp.copy(cinza).lerp(verm, kv)); m.emissiveIntensity = kv * (.25 + pul * .9); bal.value = .25 + kv * .25 + pul * .15 * kv;
      const vis = Math.round(nf * (.15 + .85 * Math.max(kv, c.st.kRod)));
      fio.count = vis; fp.forEach((p, i) => c.por(fio, i, p[0] + Math.sin(t * 2 + p[3]) * .03, 0, p[1], t * .5 + p[3], 1, Math.sin(t * 1.5 + p[3]) * .3, 0, p[2] * (.4 + .6 * kv))); fio.instanceMatrix.needsUpdate = true;
      fl.scale.setScalar(1 + pul * .06 * kv); lf.userData.i = kv * (.4 + pul * 1.6);
    });
    c.atm = { nevoa: { c: '#3a3c40', d: .035 }, fundo: '#2a2c30', amb: { i: .45, c: '#d8dce8' }, exposicao: 1.1 };
  },

  /* ---------- banquete: mesa comprida, velas e um lugar a mais ---------- */
  banquete(c, s) {
    const T = c.T, K = c.K, eixoX = !c.ent || c.ent.nz !== 0, L = s.comprimento || 12;
    c.casca({ piso: c.mat('#2a1a12', { tex: 'madeira_velha', rep: [6, 6], r: .45 }), parede: c.mat('#3a0c10', { tex: 'veludo', rep: [8, 1], r: 1 }), teto: c.mat('#160e0a', { tex: 'madeira_velha', rep: [4, 4] }) });
    const g = new T.Group(); g.rotation.y = eixoX ? 0 : PI / 2; c.grupo.add(g);
    const mad = c.mat('#3a2410', { tex: 'madeira', r: .45 }), toalha = c.mat('#ece6d6', { r: .9 });
    // passadeira vermelha, mesa comprida e toalha
    c.malha(new T.PlaneGeometry(3.2, L + 3).rotateX(-PI / 2), c.mat('#5a0c14', { tex: 'carpete_velho', rep: [1, 4], r: 1 }), g, 0, .02, 0);
    c.malha(K.juntar([K.caixa(1.4, .06, L, 0, .74, 0), ...[-1, 1].flatMap(a => [-1, 0, 1].map(b => K.caixa(.09, .74, .09, a * .55, 0, b * (L / 2 - .2))))]), mad, g);
    c.malha(K.juntar([K.caixa(1.5, .02, L + .1, 0, .8, 0), K.caixa(.02, .4, L + .1, .75, .41, 0), K.caixa(.02, .4, L + .1, -.75, .41, 0)]), toalha, g);
    c.colRet(0, 0, eixoX ? 1.6 : L + .2, eixoX ? L + .2 : 1.6);
    // um lugar para cada participante e, na cabeceira, o lugar a mais (cartão em branco)
    const nP = Math.max(2, c.st.nPart || 4), porLado = Math.ceil(nP / 2), lugares = [];
    for (let i = 0; i < nP; i++) { const lado = i % 2 ? 1 : -1, k = Math.floor(i / 2), z = -L / 2 + 1.6 + k * ((L - 3.2) / Math.max(1, porLado - 1)); lugares.push({ x: lado * 1.15, z, ry: lado > 0 ? -PI / 2 : PI / 2, px: lado * .42, pz: z }); }
    lugares.push({ x: 0, z: L / 2 + .7, ry: PI, px: 0, pz: L / 2 - .35, extra: true });
    const cad = [], pratos = [], tampas = [];
    const prata = c.mat('#c8ccd2', { me: .9, r: .2 }), louca = c.mat('#f4f2ec', { r: .3 });
    lugares.forEach(q => {
      const enc = K.caixa(.5, 1.1, .07, 0, 0, 0).translate(0, .5, -.24).applyMatrix4(new T.Matrix4().makeRotationY(q.ry)).translate(q.x, 0, q.z);
      cad.push(K.caixa(.5, .08, .5, q.x, .46, q.z), enc, ...[-1, 1].flatMap(a => [-1, 1].map(b => K.caixa(.05, .46, .05, q.x + a * .2, 0, q.z + b * .2))));
      pratos.push(K.cil(.17, .14, .03, q.px, .81, q.pz, 18));
      tampas.push(c.malha(new T.SphereGeometry(.16, 14, 8, 0, TAU, 0, PI / 2), prata, g, q.px, .83, q.pz));
      const cart = c.malha(new T.PlaneGeometry(.16, .08), c.mat('#f2ecd8', { r: .9, lado: 2 }), g, q.px * .45, .86, q.extra ? q.pz - .3 : q.pz); cart.rotation.set(-.5, q.ry + PI, 0);
    });
    c.malha(K.juntar(cad), c.mat('#3a1a10', { tex: 'madeira', r: .6 }), g); c.malha(K.juntar(pratos), louca, g);
    // candelabros ao longo da mesa e um lustre de velas
    const ch = [], vel = [], pos = []; const mCh = c.emis('#ffcc66', 3, { c: '#ffaa33' });
    for (let z = -L / 2 + 1; z <= L / 2 - .9; z += 2) { ch.push(K.cil(.12, .14, .05, 0, .81, z, 12), K.cil(.025, .025, .4, 0, .81, z, 6), K.caixa(.4, .02, .02, 0, 1.2, z)); [-1, 0, 1].forEach(a => { vel.push(K.cil(.03, .03, .25, a * .18, 1.21, z, 8)); pos.push([a * .18, 1.47, z]); }); }
    const lus = new T.Group(); lus.position.set(0, c.ALT - 1.3, 0); g.add(lus);
    ch.push(...[0, 1, 2, 3].map(i => K.barra([0, c.ALT, 0], [Math.cos(i * PI / 2) * 1.1, c.ALT - 1.3, Math.sin(i * PI / 2) * 1.1], .01, .01, 4)));
    lus.add(new T.Mesh(c.guardar(new T.TorusGeometry(1.2, .05, 8, 40).rotateX(PI / 2)), c.mat('#8a6a30', { me: .85, r: .3 })));
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; vel.push(K.cil(.03, .03, .22, Math.cos(a) * 1.2, c.ALT - 1.28, Math.sin(a) * 1.2, 8)); pos.push([Math.cos(a) * 1.2, c.ALT - 1.02, Math.sin(a) * 1.2]); }
    c.malha(K.juntar(ch), c.mat('#b08d3a', { me: .8, r: .3 }), g); c.malha(K.juntar(vel), c.mat('#efe6d0', { r: .6 }), g);
    const chamas = c.multidao(new T.ConeGeometry(.025, .09, 6).translate(0, .045, 0), mCh, pos.length, g); pos.forEach((p, i) => c.por(chamas, i, p[0], p[1], p[2])); chamas.instanceMatrix.needsUpdate = true;
    // arandelas de vela nas paredes (só brilho, sem luz)
    const ar = []; ['n', 's', 'w', 'e'].forEach(l => [-6, 6].forEach(t => { const P = c.naParede(l, t, .12); if (!c.livre(P.x, P.z, -1.5)) return; ar.push(K.cil(.04, .04, .2, P.x, 2.2, P.z, 6)); })); if (ar.length) c.malha(K.juntar(ar), c.emis('#ffb050', 2.5, { c: '#ffb050' }));
    const lz = [c.luz('#ffb060', 1.5, 12, 0, 1.9, -L / 3), c.luz('#ffb060', 1.5, 12, 0, 1.9, L / 3), c.luz('#ffc880', 1.3, 16, 0, c.ALT - 1.4, 0)];
    if (!eixoX) { lz[0].position.set(-L / 3, 1.9, 0); lz[1].position.set(L / 3, 1.9, 0); }
    const vp = c.part({ n: 200, forma: 0, tam: .35, cor: '#f2ece0', op: .1, vel: [0, .3, 0], turb: .1, caixa: eixoX ? [-.8, .8, .9, 2.2, -L / 2, L / 2] : [-L / 2, L / 2, .9, 2.2, -.8, .8], sem: 51 });
    // relógio de pé
    const P = c.naParede(c.ladosLivres()[0], -5, .4), rel = new T.Group(); rel.position.set(P.x, 0, P.z); rel.rotation.y = P.ry; c.grupo.add(rel);
    c.malha(K.juntar([K.caixa(.7, 2.4, .4, 0, 0, 0), K.caixa(.8, .3, .45, 0, 2.4, 0)]), c.mat('#2a1810', { tex: 'madeira', r: .5 }), rel);
    c.malha(new T.CircleGeometry(.24, 24), c.mat('#eae2cc'), rel, 0, 2.05, .21);
    const pend = new T.Group(); pend.position.set(0, 1.75, .21); rel.add(pend); c.malha(K.juntar([K.caixa(.02, .9, .02, 0, -.9, 0), K.cil(.1, .1, .02, 0, -1, 0, 14, PI / 2)]), c.mat('#c8a040', { me: .8, r: .3 }), pend);
    c.anim((dt, t) => { pend.rotation.z = Math.sin(t * 3.1) * .25; mCh.emissiveIntensity = 2.6 + Math.sin(t * 11) * .4 + Math.sin(t * 23) * .2; lz.forEach((l, i) => { l.userData.i = (i < 2 ? 1.5 : 1.3) + Math.sin(t * (8 + i) + i) * .15; }); lus.rotation.y = Math.sin(t * .4) * .03; });
    c.upd(st => { const vazios = Math.round(st.kProg * lugares.length); tampas.forEach((tp, i) => { tp.visible = i >= vazios; }); vp.dens(1 - st.kProg * .9); });
    c.atm = { nevoa: { c: '#120a06', d: .04 }, fundo: '#080503', amb: { i: .24, c: '#ffcf9a' }, exposicao: 1.3 };
  },

  /* ---------- bar: balcão, jukebox, gente; as lâmpadas ficam vermelhas ---------- */
  bar(c, s) {
    const T = c.T, K = c.K;
    c.casca({ piso: c.mat('#3a3430', { tex: 'xadrez', rep: [10, 10], r: .45 }), parede: c.mat('#3a2418', { tex: 'madeira_velha', rep: [6, 1], r: .7 }), teto: c.mat('#1a1410', { tex: 'madeira', rep: [5, 5] }) });
    const lado = c.ladosLivres()[0], porta = c.vaos.find(v => v.lado === lado), tP = porta ? c.tDaPorta(porta) : null;
    const t0 = tP !== null && tP < 0 ? tP + 2 : -7, t1 = tP !== null && tP >= 0 ? tP - 2 : 7;
    const len = Math.max(4, t1 - t0), tm = (t0 + t1) / 2, P = c.naParede(lado, tm, 3), g = new T.Group(); g.position.set(P.x, 0, P.z); g.rotation.y = P.ry; c.grupo.add(g);
    c.malha(K.juntar([K.caixa(len, 1.05, .7, 0, 0, 0), K.caixa(len + .2, .07, .85, 0, 1.05, 0)]), c.mat('#4a2a16', { tex: 'madeira', r: .35 }), g);
    c.malha(K.juntar([K.caixa(len, .05, .35, 0, 1.4, -2.6), K.caixa(len, .05, .35, 0, 1.9, -2.6), K.caixa(len, .05, .35, 0, 2.4, -2.6)]), c.mat('#2a1a10', { tex: 'madeira' }), g);
    const nG = Math.round(len * 9), gar = c.multidao(new T.CylinderGeometry(.04, .045, .3, 6).translate(0, .15, 0), c.guardar(new T.MeshStandardMaterial({ roughness: .15, metalness: .1 })), nG, g), cc = new T.Color(), passo = (len - .3) / Math.ceil(nG / 3);
    for (let i = 0; i < nG; i++) { const prat = i % 3; c.por(gar, i, -len / 2 + .15 + (i / 3 | 0) * passo + c.r() * .05, 1.45 + prat * .5, -2.6, 0, .8 + c.r() * .4); gar.setColorAt(i, cc.set(['#2a6a3a', '#7a3a10', '#c8c0a0', '#3a1a5a', '#8a1a1a'][i % 5])); }
    gar.instanceColor.needsUpdate = true;
    c.colRet(P.x, P.z, len + .2, 1, P.ry);
    // jukebox no canto
    const J = c.naParede(c.ladosLivres()[1] || 'e', 6.5, .5), jk = new T.Group(); jk.position.set(J.x, 0, J.z); jk.rotation.y = J.ry; c.grupo.add(jk);
    c.malha(K.juntar([K.caixa(1, 1.4, .6, 0, 0, 0), K.cil(.5, .5, .6, 0, 1.4, 0, 16, PI / 2).translate(0, -.3, 0)]), c.mat('#5a2a18', { tex: 'madeira', r: .3 }), jk);
    const mj = c.emis('#ffb040', 2, { c: '#301000' }); c.malha(new T.PlaneGeometry(.8, .5), mj, jk, 0, 1.15, .31);
    // mesas redondas e gente
    const mesas = []; for (let i = 0; i < 5; i++) { const [x, z] = c.pontoLivre(aleatorio(80 + i), 3, .6); const me = c.F.P.mesa_redonda({ sem: i, cadeiras: 3, restos: false }); me.position.set(x, 0, z); c.grupo.add(me); mesas.push([x, z]); }
    const nP = Math.max(3, Math.round(numero(s.pessoas, 6))), pess = c.multidao(K.boneco('pe'), c.mat('#6a5a50', { r: .8 }), nP), pp = [];
    for (let i = 0; i < nP; i++) { const m0 = mesas[i % mesas.length], a = c.r() * TAU; pp.push([m0[0] + Math.cos(a) * 1.1, m0[1] + Math.sin(a) * 1.1, a + PI, c.r() * 9]); }
    // lâmpadas penduradas
    const lamp = [], mb = c.emis('#ffd090', 2.4, { c: '#ffd090' }); for (let i = 0; i < 8; i++) { const x = (i % 4 - 1.5) * 4.2, z = (i < 4 ? -1 : 1) * 3.5; lamp.push(K.barra([x, c.ALT, z], [x, c.ALT - 1, z], .008)); c.malha(new T.SphereGeometry(.07, 10, 8), mb, c.grupo, x, c.ALT - 1.05, z); }
    c.malha(K.juntar(lamp), c.mat('#111'));
    const l1 = c.luz('#ffc080', 1.3, 16, -4, c.ALT - 1.2, 0), l2 = c.luz('#ffc080', 1.3, 16, 4, c.ALT - 1.2, 0);
    const quente = new T.Color('#ffc080'), verm = new T.Color('#ff1810');
    c.anim((dt, t) => {
      const k = lim(c.st.kRod * 1.2), pis = k > .5 && Math.sin(t * 7.3) > .93 ? .3 : 1;
      [l1, l2].forEach(l => { if (l.color) l.color.copy(quente).lerp(verm, k); l.userData.i = 1.3 * pis; }); mb.emissive.copy(quente).lerp(verm, k); mb.emissiveIntensity = 2.4 * pis;
      mj.emissive.setHSL((t * .05) % 1, .8, .55);
      pp.forEach((p, i) => { const vira = k * Math.sin(t * .3 + p[3]) * .8; c.por(pess, i, p[0] + Math.sin(t * .5 + p[3]) * .05 * (1 + k * 4), 0, p[1], p[2] + vira + (k > .6 ? Math.sin(t * 3 + i) * .2 : 0)); }); pess.instanceMatrix.needsUpdate = true;
    });
    c.part({ modo: 2, n: 300, forma: 0, tam: 1.6, cor: '#8a7060', op: .05, turb: .5, caixa: [-c.H + 1, c.H - 1, 1.5, c.ALT - .3, -c.H + 1, c.H - 1], sem: 52 });
    c.atm = { nevoa: { c: '#140c08', d: .04 }, fundo: '#070403', amb: { i: .22, c: '#ffcfa0' }, exposicao: 1.25 };
  },

  /* ---------- hospital: banco de sangue (mostrador) ou recepção com senhas ---------- */
  hospital(c, s) {
    const T = c.T, K = c.K, v = s.variante || 'banco_sangue';
    c.casca({ piso: c.mat('#a4a69e', { tex: 'azulejo', rep: [18, 18], r: .35 }), parede: c.mat(v === 'espera' ? '#8a9a84' : '#a8b8b0', { tex: 'azulejo_sujo', rep: [12, 2], r: .6 }), teto: c.mat('#d8d6ce', { tex: 'forro', rep: [8, 8] }) });
    // painéis fluorescentes no forro
    const mPan = c.emis('#eef8ff', 1.6, { c: '#ffffff' }); const pan = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) pan.push(K.caixa(1.2, .04, .6, i * 6, c.ALT - .05, j * 6)); c.malha(K.juntar(pan), mPan, c.teto);
    const lz = c.luz('#e8f4ff', 1.3, 26, 0, c.ALT - .5, 0), rr = aleatorio(71);
    c.anim((dt, t) => { const on = !(rr() < .015 || Math.sin(t * 1.3) > .985); mPan.emissiveIntensity = on ? 1.6 : .15; lz.userData.i = on ? 1.3 : .2; });
    const alvoLado = c.sai ? c.sai.lado : c.ladosLivres()[0];
    if (v === 'banco_sangue') {
      for (let i = 0; i < 8; i++) { const lado = ['n', 's', 'w', 'e'].filter(l => l !== alvoLado)[i % 3], P = c.naParede(lado, -6 + (i >> 1) % 4 * 4 + (i % 2) * 1.5, 1.2); if (!c.livre(P.x, P.z, .3)) continue; const p = c.F.P.poltrona_transfusao({ sem: i }); p.position.set(P.x, 0, P.z); p.rotation.y = P.ry; c.grupo.add(p); }
      // mostrador analógico (0 a 100, marca vermelha no 100) ao lado da porta de saída
      const tS = c.sai ? c.tDaPorta(c.sai) : 0, P = c.naParede(alvoLado, tS + 3.4, .06), g = new T.Group(); g.position.set(P.x, 2.3, P.z); g.rotation.y = P.ry; c.grupo.add(g);
      const tx = c.textura('mostrador', 512, 512, (x, W) => { x.fillStyle = '#f0ece0'; x.beginPath(); x.arc(W / 2, W / 2, W / 2 - 6, 0, TAU); x.fill(); x.lineWidth = 12; x.strokeStyle = '#222'; x.stroke(); x.fillStyle = '#222'; x.font = 'bold 34px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; for (let i = 0; i <= 10; i++) { const a = PI * .75 + i / 10 * PI * 1.5; x.save(); x.translate(W / 2, W / 2); x.rotate(a); x.fillRect(W / 2 - 60, -3, 36, 6); x.restore(); x.fillText(String(i * 10), W / 2 + Math.cos(a) * (W / 2 - 100), W / 2 + Math.sin(a) * (W / 2 - 100)); } x.strokeStyle = '#c00'; x.lineWidth = 18; x.beginPath(); x.arc(W / 2, W / 2, W / 2 - 40, PI * .75 + PI * 1.45, PI * .75 + PI * 1.55); x.stroke(); });
      c.malha(new T.CircleGeometry(.85, 48), c.matTx(tx, { r: .4 }), g);
      const agulha = new T.Group(); agulha.position.z = .03; g.add(agulha); c.malha(new T.BoxGeometry(.04, .7, .015).translate(0, .3, 0), c.mat('#b00000'), agulha);
      c.malha(new T.TorusGeometry(.87, .05, 8, 48), c.mat('#888', { me: .8, r: .3 }), g);
      // cânula saindo do batente
      if (c.sai) { const Q2 = c.naParede(alvoLado, tS + 1.45, .1); c.malha(c.K.tubo([[Q2.x, 1.2, Q2.z], [Q2.x + Math.cos(P.ry) * .3, 1.0, Q2.z - Math.sin(P.ry) * .3], [Q2.x + Math.cos(P.ry) * .5, 1.15, Q2.z - Math.sin(P.ry) * .5]], .012, 10, 5), c.mat('#d8e0e0', { op: .7, r: .2 })); }
      let ang = -1.25 * PI; c.anim((dt, t) => { const alvo = -1.25 * PI - 1.5 * PI * c.st.kProg; ang += (alvo - ang) * Math.min(1, dt * 1.5); agulha.rotation.z = ang + Math.sin(t * 20) * .004; });
      agulha.rotation.z = ang;
    } else {
      // fileiras de cadeiras de plástico viradas para a TV e para o painel de senhas
      const P = c.naParede(alvoLado, -3, .1), tv = c.F.P.tv_estatica({ s: 1.2 }); tv.position.set(P.x, 2.2, P.z); tv.rotation.y = P.ry; c.grupo.add(tv);
      const pnl = new T.Group(), Pp = c.naParede(alvoLado, 3.5, .08); pnl.position.set(Pp.x, 2.5, Pp.z); pnl.rotation.y = Pp.ry; c.grupo.add(pnl);
      c.malha(new T.BoxGeometry(2.2, .8, .12), c.mat('#151515'), pnl, 0, 0, -.06);
      const tela = c.malha(new T.PlaneGeometry(2, .62), c.emis('#ff2a1a', 1, { c: '#000' }), pnl, 0, 0, .01);
      let txAnt = null;
      c.upd(st => { const nro = String(((c.cena.semente % 40) + st.rod * 7) % 100).padStart(2, '0'); const tx = c.textoTex(`SENHA  ${nro}`, { w: 512, h: 160, cor: '#ff3a1a', fundo: '#050000', tam: 96, fonte: 'Courier New, monospace', brilho: true }); tela.material.emissiveMap = tx; tela.material.map = tx; tela.material.needsUpdate = true; if (txAnt) txAnt.dispose(); txAnt = tx; });
      const fil = []; const ry = P.ry; for (let f = 0; f < 4; f++) for (let k = -2; k <= 2; k++) { const Q2 = c.naParede(alvoLado, k * 3, 4.5 + f * 2.2); if (!c.livre(Q2.x, Q2.z, .4)) continue; fil.push([Q2.x, Q2.z]); const b = c.F.P.banco_espera({ n: 4, c: '#2e86de' }); b.position.set(Q2.x, 0, Q2.z); b.rotation.y = ry; c.grupo.add(b); c.colRet(Q2.x, Q2.z, 2.2, .6, ry); }
      const nP = Math.max(3, Math.round(numero(s.pessoas, 5))), pess = c.multidao(K.boneco('sentado'), c.mat('#7a7a78', { r: .85 }), nP), sen = c.multidao(new T.PlaneGeometry(.1, .14), c.mat('#f4f0e2', { lado: 2 }), nP);
      for (let i = 0; i < nP; i++) { const f2 = fil[(i * 3) % Math.max(1, fil.length)] || [0, 0], dxp = ((i % 3) - 1) * .55; const x = f2[0] + Math.cos(ry) * dxp, z = f2[1] - Math.sin(ry) * dxp; c.por(pess, i, x, 0, z, ry); c.por(sen, i, x + Math.sin(ry) * .35, .78, z + Math.cos(ry) * .35, ry, 1, -.8); }
      pess.instanceMatrix.needsUpdate = sen.instanceMatrix.needsUpdate = true;
      // balcão e a atendente sem rosto
      const B = c.naParede(c.ladosLivres()[1] || 'e', 4, 2.2), bal = c.F.P.balcao({ w: 3, c: '#c8c0b0' }); bal.position.set(B.x, 0, B.z); bal.rotation.y = B.ry; c.grupo.add(bal); c.colRet(B.x, B.z, 3.2, .8, B.ry);
      const at = c.malha(K.boneco('pe'), c.mat('#e8e8e4', { r: .7 }), c.grupo, B.x - Math.sin(B.ry) * .8, 0, B.z - Math.cos(B.ry) * .8); at.rotation.y = B.ry;
      const bb = c.F.P.bebedouro({}); const Bb = c.naParede(c.ladosLivres()[2] || 'w', -6, .4); bb.position.set(Bb.x, 0, Bb.z); bb.rotation.y = Bb.ry; c.grupo.add(bb);
      EXTRAS.tique(c, s);
    }
    c.atm = { nevoa: { c: '#1c201e', d: .025 }, fundo: '#0c0e0d', amb: { i: .45, c: '#e0ece8' }, exposicao: 1.1 };
  },

  /* ---------- labirinto (grade com paredes inteiras ou espiral de monólitos) ---------- */
  labirinto(c, s) {
    const T = c.T, K = c.K, v = s.variante || 'pedra', H = c.H, ALT = c.ALT;
    const pedra = c.mat(s.paredeCor || '#7a7468', { tex: 'concreto_sujo', rep: [1, 1], r: .9 });
    c.casca({ piso: c.mat(v === 'espiral' ? '#7a7264' : '#5a564e', { tex: v === 'espiral' ? 'areia' : 'concreto_sujo', rep: [6, 6] }) });
    c.ceu({ tipo: 'nuvens', a: '#0c0c0e', b: '#000000', brilho: .5 });
    const grupoL = new T.Group(); c.grupo.add(grupoL);
    const colL = [];
    let atual = null, proximo = null, fase = 1;
    const limparCol = () => { colL.forEach(q => q.fill(-1e5)); };
    function montarGrade(sem) {
      const N = 7, cel = c.SALA / N, M = gerarLabirinto(N, sem), geos = [], rects = [], E = .3;
      for (let i = 0; i < N - 1; i++) for (let j = 0; j < N; j++) if (M.v[i][j]) { const x = -H + (i + 1) * cel, z0 = -H + j * cel, z1 = z0 + cel; geos.push(K.caixa(E, ALT, cel + E, x, 0, (z0 + z1) / 2)); rects.push([x - E / 2, x + E / 2, z0 - E / 2, z1 + E / 2]); }
      for (let i = 0; i < N; i++) for (let j = 0; j < N - 1; j++) if (M.h[i][j]) { const z = -H + (j + 1) * cel, x0 = -H + i * cel, x1 = x0 + cel; geos.push(K.caixa(cel + E, ALT, E, (x0 + x1) / 2, 0, z)); rects.push([x0 - E / 2, x1 + E / 2, z - E / 2, z + E / 2]); }
      const g = new T.Group(); grupoL.add(g); const me = new T.Mesh(c.guardar(K.juntar(geos)), pedra); g.add(me);
      // sigilos de giz nas esquinas
      if (s.sigilos !== false) { const tx = c.textura('sigilos', 256, 256, (x, W, Hh, rr) => { x.clearRect(0, 0, W, Hh); x.strokeStyle = 'rgba(240,236,224,.85)'; x.lineWidth = 4; for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(W / 2, Hh / 2, 30 + k * 22, rr() * TAU, rr() * TAU + 3); x.stroke(); } x.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * TAU * 3; x.lineTo(W / 2 + Math.cos(a) * 90, Hh / 2 + Math.sin(a) * 90); } x.stroke(); }); tx.encoding = c.T.sRGBEncoding; const ms = c.matTx(tx, { op: .85, r: 1 }); const im = c.multidao(new T.PlaneGeometry(.9, .9), ms, 24, g); let k = 0; for (let i = 0; i < N - 1 && k < 24; i++) for (let j = 0; j < N && k < 24; j++) if (M.v[i][j] && (i + j) % 3 === 0) { c.por(im, k++, -H + (i + 1) * cel + .16, 1.4 + (j % 2) * .5, -H + j * cel + cel / 2, PI / 2); } im.count = k; im.instanceMatrix.needsUpdate = true; }
      return { g, me, rects, M };
    }
    function montarEspiral(sem, rod) {
      const aneis = gerarEspiral(sem, rod), geos = [], rects = [];
      aneis.forEach(A => { const n = Math.max(6, Math.round(TAU * A.R / 1.9)); for (let k = 0; k < n; k++) { const a = k / n * TAU; let dg = Math.abs(((a - A.gap) % TAU + TAU + PI) % TAU - PI); if (dg < A.larg) continue; const rr = aleatorio(k * 31 + A.R * 7), x = Math.cos(a) * A.R, z = Math.sin(a) * A.R, w = 1.3 + rr() * .45, d = .75 + rr() * .3; geos.push(K.caixa(w, ALT + .2, d, x, 0, z, 0, -a + PI / 2 + (rr() - .5) * .16, 0)); const ext = Math.max(w, d) * .6; rects.push([x - ext, x + ext, z - ext, z + ext]); } });
      const tx = c.textura('escrita_morta', 256, 512, (x, W, Hh, rr) => { x.fillStyle = '#9a9286'; x.fillRect(0, 0, W, Hh); for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(0,0,0,${rr() * .12})`; x.fillRect(rr() * W, rr() * Hh, 2, 2); } x.fillStyle = 'rgba(20,16,10,.55)'; x.font = '20px serif'; for (let j = 0; j < 22; j++) x.fillText(Array.from({ length: 9 }, () => 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'[Math.floor(rr() * 24)]).join(' '), 14, 26 + j * 22); }, [1, 1]);
      const g = new T.Group(); grupoL.add(g); const me = new T.Mesh(c.guardar(K.juntar(geos)), c.matTx(tx, { r: .95, c: '#c8c0b0' })); g.add(me);
      return { g, me, rects };
    }
    const fazer = (rod) => v === 'espiral' ? montarEspiral(c.cena.semente, s.muda ? rod : 1) : montarGrade(c.cena.semente + (s.muda ? rod * 101 : 0));
    const aplicarCol = L => { limparCol(); L.rects.forEach((q, i) => { if (!colL[i]) colL[i] = c.colDin(); const x = colL[i]; x[0] = c.grupo.position.x + q[0]; x[1] = c.grupo.position.x + q[1]; x[2] = c.grupo.position.z + q[2]; x[3] = c.grupo.position.z + q[3]; }); };
    let rodAtual = 0;
    c.upd(st => { const rod = s.muda ? st.rod : 1; if (rod === rodAtual) return; rodAtual = rod; if (!atual) { atual = fazer(rod); aplicarCol(atual); return; } if (proximo) { grupoL.remove(proximo.g); } proximo = fazer(rod); proximo.g.position.y = -ALT; fase = 0; });
    c.anim((dt, t) => {
      if (proximo) { fase = Math.min(1, fase + dt * .45); atual.g.position.y = -ALT * Math.min(1, fase * 2); proximo.g.position.y = -ALT * Math.max(0, 1 - (fase - .5) * 2); if (fase > .5 && !proximo.col) { proximo.col = true; aplicarCol(proximo); } if (fase >= 1) { grupoL.remove(atual.g); atual = proximo; proximo = null; } }
    });
    // três círculos que acendem (só no labirinto de pedra)
    if (v === 'pedra' && s.circulos) {
      const N = 7, cel = c.SALA / N, M = gerarLabirinto(N, c.cena.semente), sem = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { let p = 0; if (i === 0 || M.v[i - 1][j]) p++; if (i === N - 1 || M.v[i][j]) p++; if (j === 0 || M.h[i][j - 1]) p++; if (j === N - 1 || M.h[i][j]) p++; const x = -H + (i + .5) * cel, z = -H + (j + .5) * cel; if (p >= 3 && c.livre(x, z, .5)) sem.push([x, z, Math.hypot(x, z)]); }
      sem.sort((a, b) => b[2] - a[2]); const esc = []; sem.forEach(q => { if (esc.length < 3 && esc.every(e => Math.hypot(e[0] - q[0], e[1] - q[1]) > 6)) esc.push(q); });
      const tx = c.textura('circulo', 512, 512, (x, W, Hh, rr) => { x.clearRect(0, 0, W, Hh); x.strokeStyle = '#fff'; x.lineWidth = 10; x.beginPath(); x.arc(W / 2, Hh / 2, W / 2 - 20, 0, TAU); x.stroke(); x.lineWidth = 5; x.beginPath(); x.arc(W / 2, Hh / 2, W / 2 - 60, 0, TAU); x.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; x.save(); x.translate(W / 2 + Math.cos(a) * (W / 2 - 40), Hh / 2 + Math.sin(a) * (W / 2 - 40)); x.rotate(a); x.fillStyle = '#fff'; x.font = 'bold 30px serif'; x.fillText('ᛟᛉᛗᛞᚹᚱ'[k % 6], -8, 10); x.restore(); } x.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU * 2 + PI / 2; x.lineTo(W / 2 + Math.cos(a) * 150, Hh / 2 + Math.sin(a) * 150); } x.closePath(); x.stroke(); });
      const circs = esc.map(([x, z]) => { const m = c.matTx(tx, { c: '#f0e8d0', e: '#ffe08a', ei: 0, op: .95, decal: true }); const me = c.malha(new T.PlaneGeometry(2.4, 2.4), m, c.grupo, x, .03, z); me.rotation.x = -PI / 2; const vela = c.F.P.velas({ n: 4, raio: 1.25 }); vela.position.set(x, 0, z); c.grupo.add(vela); const tubo = c.malha(new T.BoxGeometry(1.2, .05, .12), c.emis('#e8fff0', 1.5, { c: '#fff' }), c.grupo, x, ALT - .1, z); return { m, tubo, x, z }; });
      const lz = c.luz('#ffe8a0', 0, 10, 0, 1.2, 0);
      c.anim((dt, t) => { const on = Math.round(c.st.kProg * 3); circs.forEach((q, i) => { q.m.emissiveIntensity = i < on ? 1.4 + Math.sin(t * 3 + i) * .3 : .05; q.tubo.material.emissiveIntensity = Math.sin(t * 13 + i * 3) > .7 ? .2 : 1.5; }); if (circs[0]) { lz.position.set(circs[Math.max(0, on - 1)].x, 1.2, circs[Math.max(0, on - 1)].z); lz.userData.i = on ? 1.2 : 0; } });
    }
    // cadáveres secos pelo chão
    if (s.cadaveres) { const n = 5, im = c.multidao(K.boneco('pe'), c.mat('#6b5444', { r: .95 }), n); for (let i = 0; i < n; i++) { const [x, z] = c.pontoLivre(aleatorio(900 + i), 1.2); c.por(im, i, x, .1, z, c.r() * TAU, .95, PI / 2, (c.r() - .5)); } im.instanceMatrix.needsUpdate = true; }
    c.luz(s.luzCor || '#c8d4e0', 1.5, 26, 0, ALT - .3, 0); c.luz(s.luzCor || '#d8c8a8', 1.1, 18, H * .55, 2.6, -H * .55);
    c.atm = { nevoa: { c: '#0c0c0e', d: .04 }, fundo: '#050506', amb: { i: .6, c: '#c8ccd8' }, exposicao: 1.35 };
  },

  /* ---------- ampulheta gigante: a areia de cima acaba com as rodadas ---------- */
  ampulheta(c, s) {
    const T = c.T, K = c.K, cor = s.cor || '#8d8d92';
    c.casca({ piso: c.mat(cor, { tex: 'areia', rep: [6, 6], r: .95 }), parede: c.mat('#4a4844', { tex: 'concreto_sujo', rep: [4, 1] }), teto: c.mat('#262624', { tex: 'concreto_sujo', rep: [4, 4] }) });
    const prof = [[.05, .37], [1.55, .4], [1.7, .55], [1.82, .9], [1.6, 1.5], [.55, 1.84], [.12, 1.95], [.55, 2.06], [1.6, 2.4], [1.82, 3.0], [1.6, 3.4], [.05, 3.52]].map(([x, y]) => new T.Vector2(x, y));
    const vidro = c.guardar(new T.MeshStandardMaterial({ color: new T.Color('#d8eef4'), roughness: .05, metalness: .2, transparent: true, opacity: .2, side: T.DoubleSide, depthWrite: false }));
    c.malha(new T.LatheGeometry(prof, 40), vidro).renderOrder = 5;
    const lat = c.mat('#8a6a30', { me: .85, r: .3 });
    c.malha(K.juntar([K.cil(2.2, 2.3, .36, 0, 0, 0, 32), K.cil(2.2, 2.2, .3, 0, 3.52, 0, 32), ...[0, 1, 2, 3].map(i => K.cil(.11, .11, 3.2, Math.cos(i * PI / 2 + PI / 4) * 2, .34, Math.sin(i * PI / 2 + PI / 4) * 2, 10))]), lat);
    const mA = c.mat(misturar(cor, '#ffffff', .1), { r: .9, e: '#30302c', ei: .3 });
    const cima = c.malha(new T.ConeGeometry(1.5, 1.4, 32).rotateX(PI).translate(0, .7, 0), mA, c.grupo, 0, 1.97, 0);
    const baixo = c.malha(new T.ConeGeometry(1.6, 1.3, 32).translate(0, .65, 0), mA, c.grupo, 0, .38, 0);
    const fio = c.malha(new T.CylinderGeometry(.03, .03, 1, 6).translate(0, -.5, 0), mA, c.grupo, 0, 1.97, 0);
    c.colRet(0, 0, 4.8, 4.8);
    const brilho = c.part({ modo: 2, n: 500, forma: 2, tam: .07, cor: '#f4f4ff', op: .9, aditivo: true, turb: .02, caixa: [-c.H, c.H, .02, .08, -c.H, c.H], sem: 61 });
    c.part({ n: 200, forma: 0, tam: .04, cor: '#e8e8f0', op: .9, vel: [0, -1.4, 0], caixa: [-.04, .04, .4, 1.95, -.04, .04], sem: 62, fixo: true });
    // ralos que engolem a areia
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b], i) => { const x = a * 6.5, z = b * 6.5; if (!c.livre(x, z, .5)) return; c.malha(new T.CircleGeometry(.6, 24), c.mat('#050505'), c.grupo, x, .03, z).rotation.x = -PI / 2; c.malha(new T.TorusGeometry(.6, .05, 6, 24), c.mat('#3a3a3a', { me: .7 }), c.grupo, x, .04, z).rotation.x = -PI / 2; c.part({ modo: 1, n: 80, forma: 0, tam: .05, cor: '#d8d8e0', op: .8, giro: [1.5, .1, .9, -.3], caixa: [-1, 1, 0, .15, -1, 1], pos: [x, .02, z], sem: 63 + i, fixo: true }); });
    let kc = 1, kb = 0;
    c.anim((dt, t) => { const k = 1 - c.st.kRod; kc += (k - kc) * Math.min(1, dt * .5); kb = 1 - kc; const sc = Math.cbrt(Math.max(.001, kc)), sb = Math.cbrt(Math.max(.05, kb)); cima.scale.set(sc, sc, sc); baixo.scale.set(sb, sb, sb); fio.visible = kc > .01; fio.scale.y = 1.97 - .38 - 1.3 * sb; });
    void brilho;
    c.luz('#c8d4ff', 1.2, 20, 0, c.ALT - .4, 3); c.luz('#ffe8c0', .8, 10, 0, 2, 0);
    c.atm = { nevoa: { c: '#0e0e10', d: .04 }, fundo: '#060607', amb: { i: .3, c: '#d0d4e0' }, exposicao: 1.2 };
  },

  /* ---------- contagem regressiva: robô com núcleo pulsando e zonas de explosão ---------- */
  contagem(c, s) {
    const T = c.T, K = c.K;
    cascaPadrao(c, s, { piso: '#3a3e42', pisoTex: 'grade_chao', parede: '#4a5056', paredeTex: 'metal_sujo' });
    const rb = new T.Group(); c.grupo.add(rb);
    const metal = c.mat('#c8ccd0', { me: .8, r: .3 }), escuro = c.mat('#2a2c30', { me: .6, r: .4 });
    c.malha(K.juntar([K.caixa(.55, .9, .3, 0, .95, 0), K.caixa(.2, .9, .2, -.15, 0, 0), K.caixa(.2, .9, .2, .15, 0, 0), K.caixa(.14, .7, .14, -.38, 1.1, 0), K.caixa(.14, .7, .14, .38, 1.1, 0)]), metal, rb);
    const cab = new T.Group(); cab.position.y = 1.9; rb.add(cab); c.malha(new T.BoxGeometry(.36, .3, .32).translate(0, .15, 0), metal, cab);
    const visor = c.malha(new T.PlaneGeometry(.3, .12), c.emis('#33ff66', 1.5, { c: '#000' }), cab, 0, .17, .165);
    const nucleo = c.malha(new T.SphereGeometry(.16, 20, 14), c.emis('#ff00ff', 3, { c: '#000' }), rb, 0, 1.4, .14);
    const halo = c.part({ modo: 2, n: 60, forma: 0, tam: .9, cor: '#ffffff', op: .25, aditivo: true, turb: .05, caixa: [-.05, .05, 1.35, 1.45, .1, .2], sem: 71, fixo: true });
    c.malha(new T.BoxGeometry(.6, .05, .4), escuro, rb, 0, 0, 0);
    rb.rotation.y = c.ent ? Math.atan2(c.ent.x, c.ent.z) + PI : PI;
    c.colRet(0, 0, .9, .7);
    const l = c.luz('#ff40ff', 1.6, 14, 0, 1.5, .5);
    let txAnt = null, ultNum = -1;
    const cont = () => Math.max(0, Math.round(numero(s.contagem, c.st.rodMax)) - c.st.rod);
    c.upd(() => { const n = cont(); if (n === ultNum) return; ultNum = n; const tx = c.textoTex(String(n).padStart(2, '0'), { w: 256, h: 100, cor: '#33ff66', fundo: '#001a08', tam: 80, fonte: 'Courier New, monospace', brilho: true }); visor.material.emissiveMap = tx; visor.material.map = tx; visor.material.needsUpdate = true; if (txAnt) txAnt.dispose(); txAnt = tx; });
    const cc = new T.Color();
    c.anim((dt, t, cam) => {
      const n = cont(), vel = 2 + (5 - Math.min(5, n)) * 1.6;
      cc.setHSL((t * .37) % 1, 1, .55); nucleo.material.emissive.copy(cc); halo.u.uCor.value.copy(cc); if (l.color) l.color.copy(cc);
      const p = Math.pow(Math.max(0, Math.sin(t * vel)), 6); nucleo.scale.setScalar(1 + p * .35); l.userData.i = 1 + p * 2.5;
      // a cabeça vira para quem está olhando
      if (cam && cam.position) { const lx = cam.position.x - (c.grupo.position.x), lz = cam.position.z - c.grupo.position.z; const alvo = Math.atan2(lx, lz) - rb.rotation.y; let d = ((alvo - cab.rotation.y) % TAU + TAU + PI) % TAU - PI; d = lim(d, -1.6, 1.6); cab.rotation.y += d * Math.min(1, dt * 2); }
    });
    EXTRAS.zonas(c, { ...s, zonaCor: s.zonaCor || '#ff2a1a', raios: [2.5, 5.5, 8.5] });
    c.atm = { nevoa: { c: '#08060a', d: .035 }, fundo: '#040305', amb: { i: .28, c: '#d8c8e8' }, exposicao: 1.2 };
  },

  /* ---------- navio afundando: convés, observatório de vidro e água entrando ---------- */
  navio(c, s) {
    const T = c.T, K = c.K, H = c.H;
    c.casca({ piso: c.mat('#3a2a1c', { tex: 'madeira_velha', rep: [6, 6], r: .3, me: .1 }), parede: c.mat('#3e2c1e', { tex: 'madeira_velha', rep: [8, 1.5], r: .6 }) });
    const cv = c.ceu({ tipo: 'aquario', a: '#1a6a72', b: '#02161a', brilho: 1.5, rolar: [.002, .001] });
    // estrutura do observatório (caixilhos)
    const cx = []; for (let i = -4; i <= 4; i++) { cx.push(K.caixa(.12, .1, c.SALA, i * 2.5, c.ALT - .14, 0), K.caixa(c.SALA, .1, .12, 0, c.ALT - .14, i * 2.5)); } c.malha(K.juntar(cx), c.mat('#2a2a28', { me: .7, r: .4 }), c.teto);
    // peixes que não deveriam existir, além do vidro
    const txP = c.textura('peixe', 256, 128, (x, W, Hh) => { x.clearRect(0, 0, W, Hh); x.fillStyle = '#000'; x.beginPath(); x.ellipse(W * .45, Hh / 2, W * .32, Hh * .22, 0, 0, TAU); x.fill(); x.beginPath(); x.moveTo(W * .75, Hh / 2); x.lineTo(W * .98, Hh * .18); x.lineTo(W * .98, Hh * .82); x.fill(); for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(W * (.2 + i * .08), Hh * .3); x.lineTo(W * (.22 + i * .08), Hh * .05); x.lineTo(W * (.26 + i * .08), Hh * .3); x.fill(); } x.fillStyle = '#fff'; x.beginPath(); x.arc(W * .2, Hh * .45, 5, 0, TAU); x.fill(); });
    const mP = c.basico('#1a2a2c', { map: txP, op: .85 }); mP.alphaTest = .3;
    const peixes = []; for (let i = 0; i < 7; i++) { const me = c.malha(new T.PlaneGeometry(1.4 + c.r() * 2, .7 + c.r()), mP, c.teto, 0, c.ALT - .04, 0); me.rotation.x = PI / 2; peixes.push([me, c.r() * TAU, 2 + c.r() * 6, .05 + c.r() * .08]); }
    // costelas do casco
    const cos = []; ['n', 's', 'w', 'e'].forEach(l => { for (let t = -8; t <= 8; t += 2.6) { const P = c.naParede(l, t, .15); if (!c.livre(P.x, P.z, -1.5)) continue; cos.push(K.caixa(.25, c.ALT, .3, P.x, 0, P.z, 0, P.ry, 0)); } }); c.malha(K.juntar(cos), c.mat('#2a1c10', { tex: 'madeira', r: .7 }));
    // lanternas penduradas que balançam
    const lan = [], mL = c.emis('#ffc070', 2.2, { c: '#ffaa40' });
    [[-5, -5], [5, -5], [-5, 5], [5, 5]].forEach(([x, z]) => { const g = new T.Group(); g.position.set(x, c.ALT, z); c.grupo.add(g); c.malha(K.juntar([K.cil(.01, .01, 1.2, 0, -1.2, 0, 4)]), c.mat('#222'), g); c.malha(new T.BoxGeometry(.2, .28, .2).translate(0, -1.45, 0), mL, g); lan.push(g); c.tremem.push(g); });
    const l1 = c.luz('#ffb060', 1.4, 12, -5, 2.5, -5), l2 = c.luz('#ffb060', 1.4, 12, 5, 2.5, 5), l3 = c.luz('#5aa8b8', 1.2, 30, 3, c.ALT - .3, -2);
    // caixotes e barris que flutuam quando a água chega
    const n = 10, im = c.multidao(new T.BoxGeometry(.7, .6, .7).translate(0, .3, 0), c.mat('#6a4a2a', { tex: 'madeira', r: .7 }), n), cx2 = [];
    for (let i = 0; i < n; i++) { const [x, z] = c.pontoLivre(aleatorio(400 + i), 1.2); cx2.push([x, z, c.r() * TAU]); }
    const L = c.liquido({ cor: '#05171a', op: .9, r: .14, me: .1, e: '#010607', ei: .4, amp: .04, vel: 1.1, y: .06, inclina: .03 });
    let geme = 0, prox = 5;
    c.upd(st => { L.alvo = mix(.08, 1.9, Math.max(st.kRod, .04)); L.inclina = .015 + st.kRod * .03; });
    c.anim((dt, t) => {
      prox -= dt; if (prox < 0) { prox = 7 + c.r() * 6; geme = 1; } geme = Math.max(0, geme - dt * .5);
      lan.forEach((g, i) => { g.rotation.z = Math.sin(t * .9 + i) * (.08 + geme * .25) + L.inclina * 2; g.rotation.x = Math.cos(t * .7 + i) * (.05 + geme * .15); });
      [l1, l2].forEach((l, i) => { const g = lan[i * 3]; l.position.set(g.position.x + Math.sin(g.rotation.z) * 1.4, c.ALT - 1.4, g.position.z - Math.sin(g.rotation.x) * 1.4); l.userData.i = 1.3 + Math.sin(t * 10 + i) * .1; });
      l3.userData.i = 1 + Math.sin(t * .3) * .2;
      peixes.forEach(([me, f, R, w]) => { const a = f + t * w; me.position.set(Math.cos(a) * R, c.ALT - .035, Math.sin(a) * R); me.rotation.z = -a; });
      cx2.forEach((p, i) => { const flut = L.nivel > .35; c.por(im, i, p[0] + (flut ? Math.sin(t * .2 + i) * .5 : 0), flut ? L.nivel - .45 + Math.sin(t * 1.2 + i) * .05 : 0, p[1], p[2] + (flut ? t * .05 : 0), 1, flut ? Math.sin(t + i) * .1 : 0); }); im.instanceMatrix.needsUpdate = true;
    });
    void cv; void H;
    c.part({ modo: 3, n: 120, forma: 0, tam: .06, cor: '#bfb6a6', op: .7, fluxo: .7, vel: [0, -3, 0], caixa: [-c.H, c.H, c.ALT - .3, c.ALT - .2, -c.H, c.H], sem: 81 });
    c.atm = { nevoa: { c: '#05141a', d: .05 }, fundo: '#020809', amb: { i: .3, c: '#8ab8c8' }, exposicao: 1.2 };
  },

  /* ---------- frio: câmara frigorífica (ganchos, rampa, massa de gelo) ou campo ártico ---------- */
  frio(c, s) {
    const T = c.T, K = c.K, H = c.H, ALT = c.ALT, v = s.variante || 'camara';
    const txG = c.textura('gelo', 512, 512, (x, W, Hh, rr) => { x.fillStyle = '#c8dce8'; x.fillRect(0, 0, W, Hh); for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(255,255,255,${rr() * .4})`; x.fillRect(rr() * W, rr() * Hh, 2, 2); } x.strokeStyle = 'rgba(120,150,170,.45)'; for (let i = 0; i < 30; i++) { x.lineWidth = .6 + rr(); let px = rr() * W, py = rr() * Hh; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (rr() - .5) * 60; py += (rr() - .5) * 60; x.lineTo(px, py); } x.stroke(); } });
    if (v === 'artico') {
      c.casca({ piso: c.mat('#e8eef2', { tex: 'areia', rep: [5, 5], r: .9 }) });
      c.horizonte({ ceu: '#b8c4cc', chao: '#e6ecf0', tipo: 'estacao', brilho: 1 });
      c.ceu({ tipo: 'nuvens', a: '#c8d0d8', b: '#9aa6b0', brilho: 1, rolar: [.01, .002] });
      const mont = []; for (let i = 0; i < 14; i++) { const [x, z] = c.pontoLivre(aleatorio(600 + i), 1); mont.push(K.esf(1 + c.r() * 1.6, x, 0, z, 10, 1, .25, .7)); } c.malha(K.juntar(mont), c.mat('#eef2f6', { r: .9 }));
      const pg = c.textura('pegadas', 256, 1024, (x, W, Hh) => { x.clearRect(0, 0, W, Hh); x.fillStyle = 'rgba(70,90,110,.55)'; for (let i = 0; i < 8; i++) { const px = W / 2 + (i % 2 ? 40 : -40), py = 60 + i * 120; x.beginPath(); x.ellipse(px, py, 26, 34, 0, 0, TAU); x.fill(); for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(px - 24 + k * 12, py - 44, 7, 0, TAU); x.fill(); } } });
      const mp = c.matTx(pg, { op: 1, decal: true }); const me = c.malha(new T.PlaneGeometry(1.6, 8), mp, c.grupo, 2, .03, 0); me.rotation.set(-PI / 2, 0, .6);
      const mo = new T.Group(); mo.position.set(c.pEnt[0] * .8 + 1, 0, c.pEnt[1] * .8); c.grupo.add(mo); c.malha(K.juntar([K.caixa(.45, .55, .28, 0, 0, 0), K.cil(.1, .1, .5, 0, .62, 0, 10, 0, 0, PI / 2)]), c.mat('#5a6a3a', { r: .8 }), mo); c.malha(new T.PlaneGeometry(.4, .3), c.mat('#e8dcc0', { lado: 2 }), mo, .5, .02, .2).rotation.x = -PI / 2;
      c.part({ n: 4200, forma: 0, tam: .07, cor: '#ffffff', op: .9, vel: [9, -1.2, 2.5], turb: .4, caixa: [-H, H, 0, ALT, -H, H], sem: 91 });
      c.part({ n: 260, forma: 0, tam: 3.5, cor: '#e8eef4', op: .08, vel: [6, 0, 1], turb: .3, caixa: [-H, H, .2, 2.5, -H, H], sem: 92 });
      c.luz('#e8f0ff', 1.2, 40, 0, ALT - .3, 0);
      c.atm = { nevoa: { c: '#c8d2da', d: .065 }, fundo: '#c0cad2', amb: { i: .75, c: '#eef4ff' }, exposicao: .95 };
      return;
    }
    c.casca({ piso: c.matTx(txG, { c: '#dfeaf2', r: .35, me: .1 }), parede: c.matTx(c.repetir(txG, 4, 1), { c: '#b8c8d4', r: .4, me: .3 }), teto: c.mat('#8a96a0', { tex: 'metal_sujo', rep: [4, 4], me: .5 }) });
    // rampa de neve até o teto, no fundo (parede sem porta)
    const lado = c.ladosLivres()[0], porta = c.vaos.find(q => q.lado === lado), tP = porta ? c.tDaPorta(porta) : null;
    const prisma = (t0, t1) => { const g = new T.BufferGeometry(), P1 = c.naParede(lado, t0, 0), P2 = c.naParede(lado, t1, 0), Q1 = c.naParede(lado, t0, 7), Q2 = c.naParede(lado, t1, 7); const v3 = [P1.x, 0, P1.z, P2.x, 0, P2.z, Q2.x, 0, Q2.z, Q1.x, 0, Q1.z, P1.x, ALT - .1, P1.z, P2.x, ALT - .1, P2.z]; const idx = [0, 4, 5, 0, 5, 1, 3, 2, 5, 3, 5, 4, 0, 3, 4, 1, 5, 2]; const pos = []; idx.forEach(i => pos.push(v3[i * 3], v3[i * 3 + 1], v3[i * 3 + 2])); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; };
    const segs = tP === null ? [[-H, H]] : [[-H, tP - 1.8], [tP + 1.8, H]];
    const mN = c.mat('#f2f6fa', { r: .9, lado: 2 });
    segs.forEach(([a, b]) => { if (b - a < 1) return; c.malha(prisma(a, b), mN); const P = c.naParede(lado, (a + b) / 2, 3.5); c.colRet(P.x, P.z, b - a, 7, P.ry); });
    // massa de neve e gelo presa por cabos
    const P = c.naParede(lado, tP !== null ? (tP > 0 ? -5 : 5) : 0, 4.2), mass = new T.Group(); mass.position.set(P.x, ALT - .95, P.z); mass.rotation.y = P.ry; c.grupo.add(mass);
    const geoM = new T.IcosahedronGeometry(1, 2); const pa = geoM.attributes.position, rr = aleatorio(95); for (let i = 0; i < pa.count; i++) { const f = .8 + rr() * .35; pa.setXYZ(i, pa.getX(i) * f, pa.getY(i) * f, pa.getZ(i) * f); } geoM.computeVertexNormals(); geoM.scale(3.4, .7, 2);
    c.malha(geoM, c.matTx(txG, { c: '#e8f2f8', r: .6 }), mass);
    const cab = []; [[-2.6, -1.4], [2.6, -1.4], [-2.6, 1.4], [2.6, 1.4]].forEach(([x, z]) => cab.push(K.barra([x * .8, .3, z * .8], [x * 1.1, 1.2, z * 1.1], .025))); c.malha(K.juntar(cab), c.mat('#9aa0a6', { me: .9, r: .3 }), mass);
    // ganchos vazios em trilhos no teto
    const nG = Math.round(28 * c.Q), gan = c.multidao(K.juntar([K.cil(.012, .012, 1.2, 0, -1.2, 0, 4), new T.TorusGeometry(.09, .015, 5, 10, PI * 1.4).rotateZ(PI * .8).translate(0, -1.3, 0)]), c.mat('#7a8088', { me: .9, r: .35 }), nG), gp = [];
    for (let i = 0; i < nG; i++) { const a = i % 2 ? 1 : -1, x = (Math.floor(i / 2) / (nG / 2) - .5) * (c.SALA - 4); gp.push([x, a * 3.2]); }
    c.malha(K.juntar([K.caixa(c.SALA - 3, .1, .1, 0, ALT - .12, 3.2), K.caixa(c.SALA - 3, .1, .1, 0, ALT - .12, -3.2)]), c.mat('#5a6068', { me: .8 }));
    c.anim((dt, t) => { gp.forEach(([x, z], i) => c.por(gan, i, x, ALT - .1, z, Math.sin(t * .5 + i) * .3, 1, Math.sin(t * .8 + i) * .04, Math.cos(t * .6 + i) * .04)); gan.instanceMatrix.needsUpdate = true; mass.rotation.z = Math.sin(t * .35) * .02 * (1 + c.st.kRod * 2); mass.position.y = ALT - .95 - c.st.kRod * .25; });
    c.part({ n: 1600, forma: 0, tam: .05, cor: '#ffffff', op: .8, vel: [.2, -.5, .1], turb: .25, caixa: [-H, H, 0, ALT, -H, H], sem: 93 });
    c.part({ modo: 2, n: 500, forma: 2, tam: .05, cor: '#e8f8ff', op: .9, aditivo: true, turb: .05, caixa: [-H, H, .05, ALT, -H, H], sem: 94 });
    c.luz('#a8d0ff', 1.3, 26, 0, ALT - .5, 0); c.luz('#d8eeff', .9, 16, P.x * .6, 2.5, P.z * .6);
    c.atm = { nevoa: { c: '#a8bccb', d: .05 }, fundo: '#0e1418', amb: { i: .45, c: '#cce4ff' }, exposicao: 1.05 };
  },

  /* ---------- ciclone de energia: luz, ruído e estática girando; o olho parado no meio ---------- */
  ciclone(c, s) {
    const T = c.T, K = c.K, cor = s.cor || '#a46cff', H = c.H, ALT = c.ALT;
    cascaPadrao(c, s, { piso: '#2a2a30', pisoTex: 'grade_chao', parede: '#3a3a44', paredeTex: 'metal_sujo', teto: '#1e1e24' });
    const g1 = c.part({ modo: 1, n: 5200, forma: 2, tam: .14, cor, op: .9, aditivo: true, giro: [1.4, 1.6, 7.5, .6], turb: .25, caixa: [-1, 1, 0, ALT, -1, 1], sem: 101 });
    const g2 = c.part({ modo: 1, n: 2400, forma: 0, tam: .08, cor: '#e8f4ff', op: .8, aditivo: true, giro: [2.2, 1.4, 6, -.4], turb: .4, caixa: [-1, 1, 0, ALT, -1, 1], sem: 102 });
    const g3 = c.part({ modo: 1, n: 1400, forma: 4, tam: .18, cor: '#ffffff', op: .6, giro: [1.1, 2, 8.5, .2], turb: .3, caixa: [-1, 1, 0, ALT, -1, 1], sem: 103 });
    // destroços girando: lâmpadas arrancadas e pedaços de grade
    const nD = Math.round(70 * c.Q), im = c.multidao(K.juntar([K.caixa(.5, .04, .12, 0, 0, 0), K.cil(.04, .04, .5, 0, .04, 0, 6, 0, 0, PI / 2)]), c.mat('#9aa0a8', { me: .8, r: .3 }), nD), dp = [];
    for (let i = 0; i < nD; i++) dp.push([2 + c.r() * 5.5, c.r() * TAU, .3 + c.r() * (ALT - .6), .5 + c.r(), c.r() * 9]);
    // o objeto que flutua no olho
    const olho = new T.Group(); olho.position.set(0, 1.5, 0); c.grupo.add(olho);
    c.malha(new T.OctahedronGeometry(.22, 0), c.emis('#ffffff', 2.4, { c: '#ffffff' }), olho);
    c.malha(new T.TorusGeometry(.4, .012, 6, 40), c.emis(cor, 2, { c: '#000' }), olho);
    // grades tortas pelo chão
    const gr = []; for (let i = 0; i < 8; i++) { const [x, z] = c.pontoLivre(aleatorio(1100 + i), 1); gr.push(K.caixa(1.4, .04, .9, x, .02, z, (c.r() - .5) * .5, c.r() * 3, (c.r() - .5) * .4)); } c.malha(K.juntar(gr), c.mat('#4a4e54', { tex: 'grade_chao', me: .7 }));
    const l = c.luz(cor, 1.6, 20, 0, 2, 0), l2 = c.luz('#c8e8ff', 1, 18, 4, 3, 4);
    c.upd(st => { const k = .45 + .55 * Math.max(st.kRod, .1); g1.dens(k); g2.dens(k); g3.dens(k); g1.u.uGiro.value.x = 1 + k; g1.u.uGiro.value.z = 5 + k * 3; });
    c.anim((dt, t) => {
      const k = .5 + c.st.kRod * .8; dp.forEach((p, i) => { const a = p[1] + t * p[3] * k * 1.4 / (1 + p[0] * .2); c.por(im, i, Math.cos(a) * p[0], p[2] + Math.sin(t + p[4]) * .3, Math.sin(a) * p[0], t * 3 + p[4], 1, t * 2 + p[4], t + p[4]); }); im.instanceMatrix.needsUpdate = true;
      olho.rotation.y = t * .3; olho.position.y = 1.5 + Math.sin(t * .8) * .1; l.userData.i = 1.2 + Math.random() * 1.2; l2.userData.i = Math.random() < .1 ? 2 : .6;
    });
    EXTRAS.zonas(c, { ...s, zonaCor: cor, raios: [1.6, 4.5, 7.5] });
    c.atm = { nevoa: { c: '#0a0612', d: .04 }, fundo: '#040208', amb: { i: .3, c: '#c8b8ff' }, exposicao: 1.2 };
  },

  /* ---------- deserto: dunas e vento (vidro moído, areia branca, letras desenhadas) ---------- */
  deserto(c, s) {
    const T = c.T, H = c.H, ALT = c.ALT, cor = s.cor || '#b8733a', v = s.variante || 'vidro';
    const geo = new T.PlaneGeometry(c.SALA, c.SALA, 48, 48); geo.rotateX(-PI / 2); const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i); let h = (Math.sin(x * .45 + z * .2) * .5 + .5) * (Math.sin(z * .3 - x * .1) * .5 + .5) * .9; const dw = H - Math.max(Math.abs(x), Math.abs(z)); h *= lim(dw / 1.5); if (!c.livre(x, z, .6)) h *= .1; h *= lim((Math.hypot(x, z) - 2) / 3); pa.setY(i, .01 + h); }
    geo.computeVertexNormals();
    const dun = c.malha(geo, c.mat(cor, { tex: 'areia', rep: [8, 8], r: .95 }));
    c.horizonte({ ceu: s.ceu || '#f4f2ee', chao: misturar(cor, '#ffffff', .1), tipo: 'dunas', brilho: 1 });
    c.ceu({ tipo: 'nuvens', a: s.ceu || '#f6f4f0', b: misturar(s.ceu || '#f6f4f0', '#c8c0b8', .5), brilho: 1.05, rolar: [.004, 0] });
    const vento = c.part({ n: 5200, forma: v === 'vidro' ? 4 : 0, tam: v === 'vidro' ? .06 : .04, cor: v === 'vidro' ? '#f0f8ff' : misturar(cor, '#ffffff', .4), op: v === 'vidro' ? .9 : .7, aditivo: v === 'vidro', vel: [11, .3, 3], var: .5, turb: .3, caixa: [-H, H, 0, ALT, -H, H], sem: 111 });
    const veu = c.part({ n: 300, forma: 0, tam: 3, cor: misturar(cor, '#ffffff', .3), op: .06, vel: [7, 0, 2], turb: .2, caixa: [-H, H, .1, 2.2, -H, H], sem: 112 });
    if (v === 'vidro') {
      // reflexos: cacos grandes girando no ar, com silhuetas por meio segundo
      const tx = c.textura('reflexo', 256, 256, (x, W) => { const g = x.createLinearGradient(0, 0, W, W); g.addColorStop(0, '#e8f0ff'); g.addColorStop(1, '#8090a0'); x.fillStyle = g; x.fillRect(0, 0, W, W); x.fillStyle = 'rgba(20,20,30,.6)'; x.beginPath(); x.ellipse(W / 2, 70, 22, 26, 0, 0, TAU); x.fill(); x.fillRect(W / 2 - 30, 100, 60, 120); });
      const mc = c.matTx(tx, { me: .9, r: .05, op: .8, lado: true, e: '#ffffff', ei: .15 }), cac = [];
      for (let i = 0; i < 9; i++) { const [x, z] = c.pontoLivre(aleatorio(1200 + i), 2); const me = c.malha(new T.PlaneGeometry(.5 + c.r() * .4, .8 + c.r() * .5), mc, c.grupo, x, 1.2 + c.r() * 1.8, z); cac.push([me, c.r() * 9]); }
      c.anim((dt, t) => cac.forEach(([me, f]) => { me.rotation.y = t * .6 + f; me.rotation.x = Math.sin(t * .4 + f) * .4; me.position.y += Math.sin(t + f) * .002; }));
      c.luz('#fff4e0', 1.4, 34, 0, ALT - .3, 0);
      c.atm = { nevoa: { c: misturar(cor, '#e8d8c8', .5), d: .055 }, fundo: '#e8dccc', amb: { i: .7, c: '#fff4e8' }, exposicao: 1.0 };
    } else {
      // letras que o vento desenha nas dunas: aparecem conforme o grupo decifra
      const tx = c.textura('dunas_letras', 1024, 1024, (x, W, Hh, rr) => { x.fillStyle = '#000'; x.fillRect(0, 0, W, Hh); x.strokeStyle = 'rgba(255,255,255,1)'; x.lineWidth = 6; x.lineCap = 'round'; for (let j = 0; j < 7; j++) { let px = 80, py = 120 + j * 120; x.beginPath(); x.moveTo(px, py); while (px < W - 80) { const k = rr(); if (k < .3) { x.lineTo(px + 20, py - 40); x.lineTo(px + 40, py); } else if (k < .6) { x.arc(px + 20, py - 18, 18, PI, 0); } else { x.moveTo(px + 10, py); x.lineTo(px + 10, py - 40); } px += 50; x.moveTo(px, py); } x.stroke(); } });
      tx.encoding = c.T.LinearEncoding;
      const ml = c.matTx(null, { c: misturar(cor, '#3a3020', .55), r: 1, decal: true }); ml.alphaMap = tx; ml.transparent = true; ml.opacity = 0; ml.depthWrite = false;
      const me = new T.Mesh(geo, ml); me.position.y = .015; c.grupo.add(me);
      const lq = c.luz('#ffb070', 1.4, 34, 0, ALT - .3, 0);
      const brs = c.part({ n: 600, forma: 0, tam: .5, cor: '#ffb070', op: .05, vel: [0, .9, 0], turb: .3, caixa: [-H, H, 0, ALT, -H, H], sem: 113 });
      const gelo = c.part({ modo: 2, n: 500, forma: 2, tam: .05, cor: '#e8f6ff', op: .9, aditivo: true, turb: .05, caixa: [-H, H, .05, ALT, -H, H], sem: 114 });
      c.anim((dt, t) => { tx.offset.x = Math.sin(t * .05) * .01; });
      c.upd(st => { const dia = st.rod % 2 === 1; ml.opacity = .15 + .75 * st.kProg; lq.userData.i = dia ? 1.6 : .9; if (lq.color) lq.color.set(dia ? '#ffb070' : '#a8c8ff'); brs.dens(dia ? 1 : 0); gelo.dens(dia ? 0 : 1); vento.u.uVel.value.x = dia ? 11 : 4; });
      c.atm = { nevoa: { c: '#d8d4cc', d: .05 }, fundo: '#e6e2da', amb: { i: .7, c: '#fff8f0' }, exposicao: 1.0 };
    }
    void dun; void veu;
  },

  /* ---------- desabamento: rachaduras, poeira, vigas e pedaços caindo ---------- */
  desabamento(c, s) {
    const T = c.T, K = c.K, H = c.H, ALT = c.ALT;
    if (!s.semCasca) cascaPadrao(c, s, { piso: '#3e3a36', parede: '#4a4642', paredeTex: 'concreto_sujo', teto: '#2a2826' });
    // vigas quebradas, apoiadas do teto ao chão
    const vg = [];
    for (let i = 0; i < (s.semVigas ? 0 : 5); i++) { const [x, z] = c.pontoLivre(aleatorio(1300 + i), 2.5, .8); const a = c.r() * TAU, L = 5 + c.r() * 2, x2 = x + Math.cos(a) * 3, z2 = z + Math.sin(a) * 3; if (!c.livre(x2, z2, .5)) continue; const A = [x, 0, z], B = [x2, ALT - .1, z2]; vg.push(K.barra(A, B, .14, .14, 4)); vg.push(K.barra([A[0] + .14, A[1], A[2]], [B[0] + .14, B[1], B[2]], .05, .05, 4)); c.colRet(x, z, .6, .6); void L; }
    if (vg.length && !s.semVigas) c.malha(K.juntar(vg), c.mat(s.vigaCor || '#6a4a30', { tex: s.vigaTex || 'ferrugem', me: .5, r: .6 }));
    // placas do forro penduradas
    const pf = []; for (let i = 0; i < 6; i++) { const [x, z] = c.pontoLivre(aleatorio(1400 + i), 1.5); const g = new T.Group(); g.position.set(x, ALT - .02, z); c.grupo.add(g); c.malha(new T.BoxGeometry(1.2, .04, 1.2).translate(.6, 0, 0), c.mat('#8a8680', { tex: 'concreto_sujo' }), g); g.rotation.z = -.6 - c.r() * .5; pf.push(g); c.tremem.push(g); }
    // cortinas de poeira caindo do teto
    for (let i = 0; i < 4; i++) { const [x, z] = c.pontoLivre(aleatorio(1500 + i), 2); c.part({ n: 500, forma: 0, tam: .05, cor: '#cfc4ae', op: .55, vel: [0, -1.5, 0], var: .6, turb: .05, caixa: [x - .4, x + .4, 0, ALT, z - .3, z + .3], sem: 120 + i }); }
    c.part({ modo: 2, n: 900, forma: 0, tam: .04, cor: '#d8ccb4', op: .5, turb: .4, caixa: [-H, H, .2, ALT, -H, H], sem: 125 });
    // pedaços que caem e ficam no chão (o entulho cresce com as rodadas)
    const n = Math.round(70 * c.Q), geoP = s.pedaco === 'livro' ? new T.BoxGeometry(.3, .07, .22) : new T.IcosahedronGeometry(.22, 0);
    const im = c.multidao(geoP, s.pedaco === 'livro' ? c.guardar(new T.MeshStandardMaterial({ roughness: .8 })) : c.mat('#6a6660', { tex: 'concreto_sujo', r: .9 }), n);
    if (s.pedaco === 'livro') { const cc = new T.Color(); for (let i = 0; i < n; i++) im.setColorAt(i, cc.setHSL(c.r() * .12, .3 + c.r() * .3, .15 + c.r() * .2)); im.instanceColor.needsUpdate = true; }
    const ped = []; for (let i = 0; i < n; i++) ped.push({ x: 0, z: 0, y: -5, vy: 0, on: false, rx: c.r() * 3, ry: c.r() * 3, s: .6 + c.r() * 1.1, chao: 0 });
    let iP = 0, acum = 0;
    c.anim((dt, t) => {
      acum += dt * (.4 + c.st.kRod * 2.6 + (c.tremorK || 0) * 4);
      while (acum > 1) { acum -= 1; const p = ped[iP]; iP = (iP + 1) % n; const [x, z] = c.pontoLivre(Math.random, 1, -.5, 10); Object.assign(p, { x, z, y: ALT - .3, vy: 0, on: true, chao: .1 * p.s }); }
      ped.forEach((p, i) => { if (p.on && p.y > p.chao) { p.vy -= 9.8 * dt; p.y = Math.max(p.chao, p.y + p.vy * dt); p.rx += dt * 4; } c.por(im, i, p.x, p.on ? p.y : -5, p.z, p.ry, p.s, p.rx, 0); }); im.instanceMatrix.needsUpdate = true;
    });
    if (!s.semCasca) { c.luz('#ffd8a8', 1.6, 24, 0, ALT - .5, 0); const lf = c.luz('#ffe0b0', .8, 12, -4, 2.5, 4); const rr = aleatorio(131); c.anim((dt, t) => { lf.userData.i = rr() < .05 || (c.tremorK || 0) > .5 && rr() < .5 ? .1 : .8; }); }
    if (!(s.extras || []).includes('tremor')) EXTRAS.tremor(c, s);
    if (!(s.extras || []).includes('rachaduras')) EXTRAS.rachaduras(c, s);
    if (!s.semCasca) c.atm = { nevoa: { c: '#3a342c', d: .055 }, fundo: '#12100e', amb: { i: .42, c: '#e8d8c0' }, exposicao: 1.2 };
  },

  /* ---------- parquinho limpo e iluminado demais ---------- */
  parquinho(c, s) {
    const T = c.T, K = c.K, H = c.H;
    const tx = c.textura('borracha', 512, 512, (x, W, Hh, rr) => { const cs = ['#e85a4a', '#4ab0e8', '#f2c84a', '#5ac87a']; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { x.fillStyle = cs[(i + j * 3) % 4]; x.fillRect(i * 64, j * 64, 64, 64); } for (let i = 0; i < 6000; i++) { x.fillStyle = `rgba(0,0,0,${rr() * .08})`; x.fillRect(rr() * W, rr() * Hh, 2, 2); } x.strokeStyle = 'rgba(0,0,0,.15)'; x.lineWidth = 2; for (let i = 0; i <= 512; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, Hh); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); } }, [6, 6]);
    const mural = c.textura('mural', 1024, 256, (x, W, Hh, rr) => { const g = x.createLinearGradient(0, 0, 0, Hh); g.addColorStop(0, '#7ec8ff'); g.addColorStop(1, '#cfefff'); x.fillStyle = g; x.fillRect(0, 0, W, Hh); x.fillStyle = '#ffffff'; for (let i = 0; i < 10; i++) { const cx = rr() * W, cy = 30 + rr() * 80; for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(cx + k * 22, cy + Math.sin(k) * 8, 22, 0, TAU); x.fill(); } } x.fillStyle = '#6ad86a'; x.beginPath(); x.moveTo(0, Hh); for (let i = 0; i <= 20; i++) x.lineTo(i * W / 20, Hh * .75 + Math.sin(i * .9) * 18); x.lineTo(W, Hh); x.fill(); x.fillStyle = '#ffe24a'; x.beginPath(); x.arc(W * .85, 50, 34, 0, TAU); x.fill(); }, [2, 1]);
    c.casca({ piso: c.matTx(tx, { r: .8 }), parede: c.matTx(mural, { r: .9 }), teto: c.mat('#f4f4f0', { tex: 'forro', rep: [5, 5] }) });
    const pan = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) pan.push(K.caixa(1.6, .04, 1.6, i * 6, c.ALT - .05, j * 6)); c.malha(K.juntar(pan), c.emis('#ffffff', 2.4, { c: '#fff' }), c.teto);
    const lado = c.ladosLivres()[0], cores = ['#e8443a', '#3aa0e8', '#f2c030', '#4ac86a', '#b05ae8'];
    // escorregador
    const E = c.naParede(lado, -4, 4), esc = new T.Group(); esc.position.set(E.x, 0, E.z); esc.rotation.y = E.ry; c.grupo.add(esc);
    const g1 = [], cs1 = [];
    [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]].forEach(([a, b]) => { g1.push(K.cil(.05, .05, 2, a, 0, b, 8)); cs1.push('#c8c8c8'); });
    g1.push(K.caixa(1.2, .1, 1.2, 0, 2, 0)); cs1.push(cores[2]); for (let k = 0; k < 6; k++) { g1.push(K.caixa(.9, .05, .1, 0, .3 + k * .3, -.6)); cs1.push(cores[1]); }
    g1.push(K.caixa(.9, .06, 3.4, 0, 0, 0, -.6, 0, 0).translate(0, .3, 2.1)); cs1.push(cores[0]); g1.push(K.caixa(.06, .3, 3.4, .45, 0, 0, -.6, 0, 0).translate(0, .3, 2.1)); cs1.push(cores[0]); g1.push(K.caixa(.06, .3, 3.4, -.45, 0, 0, -.6, 0, 0).translate(0, .3, 2.1)); cs1.push(cores[0]);
    c.malha(K.juntar(g1, cs1), c.vc({ r: .35 }), esc); c.colRet(E.x, E.z, 1.4, 1.4);
    // gangorra
    const G = c.naParede(lado, 3.5, 5), gang = new T.Group(); gang.position.set(G.x, .5, G.z); gang.rotation.y = G.ry + PI / 2; c.grupo.add(gang); c.malha(K.caixa(.3, .5, .3, G.x, 0, G.z), c.mat('#888', { me: .7 })).position.y = 0;
    c.malha(K.juntar([K.caixa(3.2, .08, .3, 0, 0, 0), K.caixa(.06, .3, .3, -1.5, .08, 0), K.caixa(.06, .3, .3, 1.5, .08, 0)], ['#3aa0e8', '#f2c030', '#f2c030']), c.vc({ r: .4 }), gang);
    // trepa-trepa
    const T2 = c.naParede(c.ladosLivres()[1] || 'e', 3, 4.5), tr = [], trc = [];
    for (let i = 0; i <= 3; i++) for (let j = 0; j <= 2; j++) { tr.push(K.cil(.035, .035, 2.2, i * .7 - 1.05, 0, j * .7 - .7, 6)); trc.push(cores[(i + j) % 5]); }
    for (let k = 1; k <= 3; k++) { for (let j = 0; j <= 2; j++) { tr.push(K.barra([-1.05, k * .7, j * .7 - .7], [1.05, k * .7, j * .7 - .7], .03)); trc.push(cores[k % 5]); } for (let i = 0; i <= 3; i++) { tr.push(K.barra([i * .7 - 1.05, k * .7, -.7], [i * .7 - 1.05, k * .7, .7], .03)); trc.push(cores[(k + 2) % 5]); } }
    const trm = c.malha(K.juntar(tr, trc), c.vc({ r: .4, me: .3 }), c.grupo, T2.x, 0, T2.z); trm.rotation.y = T2.ry; c.colRet(T2.x, T2.z, 2.4, 1.8, T2.ry);
    // casinha de madeira e túnel colorido
    const C = c.naParede(c.ladosLivres()[2] || 'w', -3, 3), ca = new T.Group(); ca.position.set(C.x, 0, C.z); ca.rotation.y = C.ry; c.grupo.add(ca);
    c.malha(K.juntar([K.caixa(2, 1.6, 2, 0, 0, 0), new T.ConeGeometry(1.7, 1, 4).rotateY(PI / 4).translate(0, 2.1, 0)], ['#c89a5a', '#d8443a']), c.vc({ r: .7 }), ca); c.malha(new T.PlaneGeometry(.7, 1.1), c.mat('#1a1410'), ca, 0, .55, 1.01); c.colRet(C.x, C.z, 2.2, 2.2);
    const Tu = c.naParede(c.ladosLivres()[3] || 's', 4, 3.5), tu = []; for (let k = 0; k < 6; k++) tu.push(new T.TorusGeometry(.7, .12, 8, 20, PI).translate(0, 0, k * .4 - 1));
    const tum = c.malha(K.juntar(tu, cores.concat(cores)), c.vc({ r: .35 }), c.grupo, Tu.x, 0, Tu.z); tum.rotation.y = Tu.ry;
    // o pegador sentado no alto do escorregador, balançando as pernas (some quando o jogo começa)
    const fil = new T.Group(); fil.position.set(0, 2.1, .1); esc.add(fil);
    c.malha(K.boneco('sentado'), c.mat('#d8d4cc', { r: .8 }), fil).scale.setScalar(.75);
    const braco = c.malha(new T.CylinderGeometry(.035, .03, .45, 6).translate(0, .22, 0), c.mat('#d8d4cc'), fil, .2, .82, .05);
    c.anim((dt, t) => { gang.rotation.x = Math.sin(t * .9) * .2; braco.rotation.z = -2.2 + Math.sin(t * 6) * .4; fil.visible = c.st.rod <= 1; });
    c.luz('#fffbe8', 1.8, 30, 0, c.ALT - .4, 0); c.luz('#fff0d0', 1.2, 20, E.x * .6, 3, E.z * .6);
    c.atm = { nevoa: { c: '#d8e8f0', d: .012 }, fundo: '#cfe8f8', amb: { i: .9, c: '#ffffff' }, exposicao: 1.35 };
  },

  /* ---------- cassino: roleta gigante embutida no chão ---------- */
  roleta(c, s) {
    const T = c.T, K = c.K, R = s.raio || 6;
    c.casca({ piso: c.mat('#5a0a12', { tex: 'carpete_velho', rep: [8, 8], r: 1 }), parede: c.mat('#2a1410', { tex: 'madeira_velha', rep: [6, 1], r: .5 }), teto: c.mat('#1a0e0a', { tex: 'madeira', rep: [4, 4] }) });
    const tx = c.textura('roleta', 1024, 1024, (x, W) => { const cx = W / 2; x.fillStyle = '#3a2410'; x.beginPath(); x.arc(cx, cx, cx, 0, TAU); x.fill(); const n = 37; for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU; x.fillStyle = i === 0 ? '#1a7a3a' : i % 2 ? '#b01818' : '#141414'; x.beginPath(); x.moveTo(cx, cx); x.arc(cx, cx, cx - 8, a0, a1); x.closePath(); x.fill(); x.save(); x.translate(cx, cx); x.rotate((a0 + a1) / 2); x.fillStyle = '#f2e8c8'; x.font = 'bold 30px Georgia'; x.textAlign = 'center'; x.fillText(String((i * 13) % 37), cx - 50, 10); x.restore(); } x.fillStyle = '#4a2c14'; x.beginPath(); x.arc(cx, cx, cx * .72, 0, TAU); x.fill(); x.strokeStyle = '#c8a040'; x.lineWidth = 6; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; x.beginPath(); x.moveTo(cx + Math.cos(a) * cx * .2, cx + Math.sin(a) * cx * .2); x.lineTo(cx + Math.cos(a) * cx * .7, cx + Math.sin(a) * cx * .7); x.stroke(); } x.beginPath(); x.arc(cx, cx, cx * .72, 0, TAU); x.stroke(); });
    const disco = new T.Group(); disco.position.y = .03; c.grupo.add(disco);
    c.malha(new T.CircleGeometry(R, 72), c.matTx(tx, { r: .35, me: .1, decal: true }), disco).rotation.x = -PI / 2;
    c.malha(new T.ConeGeometry(.35, .35, 8), c.mat('#c8a040', { me: .9, r: .25 }), disco);
    c.malha(new T.TorusGeometry(R + .1, .1, 8, 96), c.mat('#c8a040', { me: .9, r: .25 }), c.grupo, 0, .05, 0).rotation.x = PI / 2;
    const bola = c.malha(new T.SphereGeometry(.16, 16, 12), c.mat('#f4f4f4', { r: .1, me: .3 }), c.grupo, R - .4, .19, 0);
    // mesas de pôquer cobertas de pó e lustres
    const ms = []; for (let i = 0; i < 4; i++) { const P = c.naParede(['n', 's', 'w', 'e'][i], (i % 2 ? 1 : -1) * 6, 2); if (!c.livre(P.x, P.z, .5)) continue; ms.push(K.cil(1, 1, .08, P.x, .74, P.z, 24), K.cil(.12, .2, .74, P.x, 0, P.z, 8)); c.colRet(P.x, P.z, 2, 2); }
    if (ms.length) c.malha(K.juntar(ms), c.mat('#3a5a40', { tex: 'carpete', r: 1 }));
    const lus = []; [[-6, -6], [6, 6], [-6, 6], [6, -6]].forEach(([x, z]) => { lus.push(K.cil(.6, .2, .5, x, c.ALT - .9, z, 10), K.barra([x, c.ALT, z], [x, c.ALT - .4, z], .02)); }); c.malha(K.juntar(lus), c.emis('#ffe8b0', 1.4, { c: '#ffe8c0' }));
    // o crupiê robótico de smoking, ao lado do caixa
    const P = c.naParede(c.ladosLivres()[0], 4, 1.2), cr = new T.Group(); cr.position.set(P.x, 0, P.z); cr.rotation.y = P.ry; c.grupo.add(cr);
    c.malha(K.juntar([K.caixa(.55, .9, .3, 0, .95, 0), K.caixa(.2, .9, .2, -.15, 0, 0), K.caixa(.2, .9, .2, .15, 0, 0)]), c.mat('#101012', { r: .6 }), cr);
    c.malha(K.juntar([K.caixa(.2, .5, .02, 0, 1.3, .16), K.caixa(.36, .3, .32, 0, 1.9, 0)]), c.mat('#c8ccd0', { me: .8, r: .3 }), cr); c.malha(new T.BoxGeometry(.2, .07, .03), c.mat('#000'), cr, 0, 1.78, .17);
    const cx = c.naParede(c.ladosLivres()[0], 6.5, 1.2); c.malha(K.juntar([K.caixa(1.6, 1.1, .6, 0, 0, 0)]), c.mat('#2a1810', { tex: 'madeira' }), c.grupo, cx.x, 0, cx.z).rotation.y = cx.ry; c.colRet(cx.x, cx.z, 1.8, .8, cx.ry);
    const fich = c.multidao(new T.CylinderGeometry(.06, .06, .02, 12), c.guardar(new T.MeshStandardMaterial({ roughness: .4 })), 60), ccl = new T.Color();
    for (let i = 0; i < 60; i++) fich.setColorAt(i, ccl.set(['#c81818', '#1a1a1a', '#e8e8e8', '#2a6ae8', '#18a050'][i % 5])); fich.instanceColor.needsUpdate = true;
    let w = .15, ang = 0, angB = 0, ultRod = 0;
    c.upd(st => { if (st.rod !== ultRod) { ultRod = st.rod; w = 1.4; } const n = Math.round(st.kProg * 60); for (let i = 0; i < 60; i++) c.por(fich, i, cx.x + ((i % 6) - 2.5) * .15 * Math.cos(cx.ry), i < n ? 1.11 + Math.floor(i / 6) * .02 : -5, cx.z - ((i % 6) - 2.5) * .15 * Math.sin(cx.ry)); fich.instanceMatrix.needsUpdate = true; });
    c.anim((dt, t) => { w = Math.max(.12, w - dt * .08); ang += w * dt; disco.rotation.y = ang; angB -= (w * 1.8 + .1) * dt; const rB = R - .4 - Math.max(0, .9 - w) * .6; bola.position.set(Math.cos(angB) * rB, .19, Math.sin(angB) * rB); });
    c.luz('#ffd8a0', 1.5, 20, 0, c.ALT - .6, 0); c.luz('#ff3040', .6, 16, P.x, 2, P.z);
    c.atm = { nevoa: { c: '#140608', d: .035 }, fundo: '#080203', amb: { i: .3, c: '#ffd0b0' }, exposicao: 1.25 };
  },

  /* ---------- biblioteca (universitária, organizada; ou em ruínas, prestes a cair) ---------- */
  biblioteca(c, s) {
    const T = c.T, K = c.K, H = c.H, ALT = c.ALT, ruina = s.variante === 'ruinas';
    c.casca({ piso: c.mat(ruina ? '#2a1c12' : '#5a3a20', { tex: 'madeira', rep: [10, 10], r: .5 }), parede: c.mat(ruina ? '#2a1a10' : '#4a3020', { tex: 'madeira_velha', rep: [6, 1], r: .6 }), teto: c.mat(ruina ? '#1a120c' : '#d8d0c0', { tex: ruina ? 'madeira_velha' : 'forro', rep: [5, 5] }) });
    const lom = c.textura('lombadas', 512, 128, (x, W, Hh, rr) => { x.fillStyle = '#0a0806'; x.fillRect(0, 0, W, Hh); let px = 0; while (px < W) { const ww = 8 + rr() * 16, hh = Hh * (.6 + rr() * .4); x.fillStyle = `hsl(${rr() * 40},${20 + rr() * 40}%,${12 + rr() * 26}%)`; x.fillRect(px, Hh - hh, ww - 1, hh); x.fillStyle = 'rgba(220,190,120,.4)'; x.fillRect(px + 2, Hh - hh + 8, ww - 5, 2); px += ww; } }, [3, 1]);
    const hE = ruina ? ALT - .1 : 2.6, mE = ruina ? c.mat('#2a1a0e', { tex: 'madeira_velha', r: .7 }) : c.mat('#3a3e42', { me: .7, r: .4 });
    // fileiras de estantes (de 1,2 m) com as lombadas dos dois lados
    // cada coluna de estantes é uma malha só (armação + lombadas), presa num grupo que pode inclinar
    const est = [], ml = c.matTx(lom, { r: .8 }), nP = Math.floor(hE / .42);
    [-8.2, -6.2, -4.2, 4.2, 6.2, 8.2].forEach(x => {
      const geo = [], liv = [];
      for (let z = -8.4; z <= 8.4; z += 1.2) {
        if (Math.abs(z) < 1.6 || !c.livre(x, z, .3)) continue;
        geo.push(K.caixa(.5, .05, 1.2, 0, 0, z), K.caixa(.5, .04, 1.2, 0, hE - .04, z), K.caixa(.04, hE, 1.2, 0, 0, z));
        for (let k = 1; k < nP; k++) geo.push(K.caixa(.5, .03, 1.2, 0, k * .42, z));
        for (let k = 0; k < nP; k++) [-1, 1].forEach(sd => liv.push(new T.PlaneGeometry(1.16, .36).rotateY(sd * PI / 2).translate(sd * .24, k * .42 + .22, z)));
        c.colRet(x, z, .55, 1.2);
      }
      if (!geo.length) return;
      const g = new T.Group(); g.position.set(x, 0, 0); c.grupo.add(g);
      c.malha(K.juntar(geo), mE, g); c.malha(K.juntar(liv), ml, g); est.push([g, c.r() * 9]);
    });
    // mesas de leitura com abajur verde e um livro aberto
    const mesas = ruina ? [[-c.H + 4, 0], [c.H - 4, 0]] : [[-1.6, -5], [1.6, 5], [0, 0]];
    const abaj = [];
    mesas.forEach(([x, z], i) => { if (!c.livre(x, z, .5)) { x = x * .6; } const m = c.F.P.mesa({ w: 2, d: 1, c: '#4a2e18' }); m.position.set(x, 0, z); c.grupo.add(m); c.colRet(x, z, 2, 1); const lv = c.F.P.livro_aberto({ sem: i, w: .5 }); lv.position.set(x, .77, z); c.grupo.add(lv); const ab = new T.Group(); ab.position.set(x + .6, .76, z - .2); c.grupo.add(ab); c.malha(K.juntar([K.cil(.08, .1, .03, 0, 0, 0, 12), K.cil(.012, .012, .35, 0, .03, 0, 6)]), c.mat('#b08d3a', { me: .8 }), ab); c.malha(new T.CylinderGeometry(.08, .2, .14, 16, 1, true).translate(0, .4, 0), c.emis(ruina ? '#ffd08a' : '#2a8a4a', 1.4, { c: ruina ? '#3a2a10' : '#0a3a1a' }), ab); abaj.push([x, z]); });
    abaj.slice(0, 2).forEach(([x, z]) => c.luz(ruina ? '#ffcc80' : '#d8ffd0', 1.4, 9, x + .6, 1.4, z));
    // fichários
    if (!ruina) { const fi = []; for (let i = 0; i < 4; i++) { const P = c.naParede(c.ladosLivres()[i % 2], -2 + i * 1.2, .4); if (!c.livre(P.x, P.z)) continue; fi.push(K.caixa(1, 1.2, .5, P.x, 0, P.z, 0, P.ry, 0)); } if (fi.length) c.malha(K.juntar(fi), c.mat('#6a4a2a', { tex: 'madeira' })); }
    c.luz(ruina ? '#c8a878' : '#f4ead8', ruina ? .7 : 1.1, 24, 0, ALT - .5, 0);
    if (ruina) {
      // estantes rangendo, inclinando aos poucos; poeira e livros caindo
      c.anim((dt, t) => est.forEach(([g, f]) => { g.rotation.z = Math.sin(t * .6 + f) * .01 + c.st.kRod * .06 * Math.sin(f) + (c.tremorK || 0) * Math.sin(t * 30 + f) * .02; }));
      BASES.desabamento(c, { ...s, semCasca: true, semVigas: true, pedaco: 'livro' });
      c.atm = { nevoa: { c: '#1a140e', d: .06 }, fundo: '#0a0806', amb: { i: .22, c: '#e8d0a8' }, exposicao: 1.2 };
    } else {
      c.anim((dt, t) => est.forEach(([g, f]) => { g.position.y = Math.max(0, Math.sin(t * 5 + f * 3)) * .003 * c.st.kRod; }));
      c.atm = { nevoa: { c: '#120e0a', d: .035 }, fundo: '#080604', amb: { i: .35, c: '#f4e8d0' }, exposicao: 1.2 };
    }
  },

  /* ---------- arquivo morto: gaveteiros até o teto, tarjas pretas e uma lâmpada que balança ---------- */
  arquivo(c, s) {
    const T = c.T, K = c.K, H = c.H, ALT = c.ALT;
    cascaPadrao(c, s, { piso: '#3a3a38', parede: '#4a4c4a', paredeTex: 'concreto_sujo', teto: '#2a2a28' });
    const gav = c.textura('gaveteiro', 256, 512, (x, W, Hh, rr) => { x.fillStyle = '#7a8086'; x.fillRect(0, 0, W, Hh); for (let k = 0; k < 6; k++) { const y = k * Hh / 6; x.fillStyle = '#6a7076'; x.fillRect(8, y + 6, W - 16, Hh / 6 - 12); x.fillStyle = '#2a2c2e'; x.fillRect(W / 2 - 30, y + 30, 60, 10); x.fillStyle = '#e8e2d0'; x.fillRect(W / 2 - 24, y + 14, 48, 12); } for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(0,0,0,${rr() * .1})`; x.fillRect(rr() * W, rr() * Hh, 2, 2); } });
    const mg = c.matTx(gav, { me: .6, r: .45 });
    const nG = [], geos = [];
    ['n', 's', 'w', 'e'].forEach(l => { for (let t = -H + .5; t < H - .4; t += .95) { const P = c.naParede(l, t, .4); if (!c.livre(P.x, P.z, -1.4)) continue; nG.push(P); } });
    // corredores de gaveteiros soltos (longe das portas)
    [-5.5, 5.5].forEach(x => { for (let z = -6; z <= 6; z += .95) { if (Math.abs(z) < 1.5 || !c.livre(x, z, .5)) continue; nG.push({ x, z, ry: PI / 2 }); nG.push({ x: x + .8, z, ry: -PI / 2 }); c.colRet(x + .4, z, 1.6, .95); } });
    const im = c.multidao(new T.BoxGeometry(.9, ALT - .05, .78).translate(0, (ALT - .05) / 2, 0), mg, nG.length);
    nG.forEach((P, i) => c.por(im, i, P.x, 0, P.z, P.ry)); im.instanceMatrix.needsUpdate = true;
    // mesa no meio, lupa e a lâmpada pendurada
    const m = c.F.P.mesa({ w: 2.2, d: 1.1, c: '#5a5040' }); c.grupo.add(m); c.colRet(0, 0, 2.2, 1.1);
    c.malha(K.juntar([new T.TorusGeometry(.09, .015, 8, 20).rotateX(PI / 2).translate(.4, .79, .1), K.caixa(.03, .02, .2, .4, .78, .25)]), c.mat('#2a2a2a', { me: .6 }));
    c.malha(new T.CircleGeometry(.085, 20), c.mat('#d8f0ff', { op: .4, r: .05, me: .5 }), c.grupo, .4, .795, .1).rotation.x = -PI / 2;
    const tar = c.textura('tarjas', 256, 340, (x, W, Hh, rr) => { x.fillStyle = '#ece6d4'; x.fillRect(0, 0, W, Hh); for (let j = 0; j < 22; j++) { const y = 20 + j * 14; let px = 16; while (px < W - 20) { const w = 10 + rr() * 30; x.fillStyle = rr() < .25 ? '#050505' : 'rgba(60,50,40,.55)'; x.fillRect(px, y, w, rr() < .25 ? 11 : 4); px += w + 5; } } });
    const mT = c.matTx(tar, { r: .9, lado: true }), papeis = [];
    for (let i = 0; i < 26; i++) { const sobre = i < 8, [x, z] = sobre ? [(c.r() - .5) * 1.8, (c.r() - .5) * .8] : c.pontoLivre(aleatorio(1600 + i), 1.5); const p = c.malha(new T.PlaneGeometry(.24, .32), mT, c.grupo, x, sobre ? .78 : .025, z); p.rotation.set(-PI / 2, 0, c.r() * TAU); papeis.push(p); }
    // palavras que ardem nos olhos (aparecem com o progresso)
    const ard = c.part({ modo: 2, n: 120, forma: 6, tam: .12, cor: '#ffd060', op: 1, aditivo: true, turb: .08, vel: [0, .05, 0], caixa: [-1, 1, .8, 1.2, -.5, .5], sem: 141, fixo: true });
    const fio = new T.Group(); fio.position.set(0, ALT, 0); c.grupo.add(fio);
    c.malha(new T.CylinderGeometry(.006, .006, 1.7, 4).translate(0, -.85, 0), c.mat('#111'), fio);
    c.malha(new T.SphereGeometry(.08, 12, 8).translate(0, -1.78, 0), c.emis('#fff2d0', 2.6, { c: '#fff' }), fio);
    const l = c.luz('#ffe8c0', 1.7, 12, 0, ALT - 1.8, 0);
    // o cofre da porta: quatro visores, que acendem conforme os dígitos aparecem
    const v = c.sai || c.ent, tS = v ? c.tDaPorta(v) : 0, Pc = c.naParede(v ? v.lado : 'n', tS + 2.1, .06), cof = new T.Group(); cof.position.set(Pc.x, 1.4, Pc.z); cof.rotation.y = Pc.ry; c.grupo.add(cof);
    c.malha(new T.CylinderGeometry(.42, .42, .1, 32).rotateX(PI / 2), c.mat('#5a5e62', { me: .9, r: .3 }), cof);
    const vis = [0, 1, 2, 3].map(i => c.malha(new T.PlaneGeometry(.12, .16), c.emis('#ff9a30', .05, { c: '#100800' }), cof, -.21 + i * .14, .02, .06));
    c.upd(st => { const n = Math.round(st.kProg * 4); vis.forEach((p, i) => { p.material.emissiveIntensity = i < n ? 1.8 : .05; }); ard.dens(.1 + st.kProg * .9); });
    c.anim((dt, t) => { fio.rotation.z = Math.sin(t * .7) * .14; fio.rotation.x = Math.sin(t * .53) * .1; l.position.set(Math.sin(fio.rotation.z) * 1.78, ALT - 1.75, -Math.sin(fio.rotation.x) * 1.78); l.userData.i = 1.6 + Math.sin(t * 17) * .05; });
    c.atm = { nevoa: { c: '#0c0b0a', d: .045 }, fundo: '#050505', amb: { i: .14, c: '#e8dcc8' }, exposicao: 1.25 };
  },

  /* ---------- sala branca, vazia, com uma falha de luz ---------- */
  vazio(c, s) {
    const T = c.T, K = c.K, cor = s.cor || '#ffffff', branca = s.variante === 'branca';
    if (branca) c.casca({ piso: c.mat('#ecebe8', { r: .7 }), parede: c.mat('#f2f1ee', { r: .9 }), teto: c.mat('#f4f3f0', { r: .9, e: '#ffffff', ei: .35 }) });
    else cascaPadrao(c, s);
    const pan = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) pan.push(K.caixa(2, .03, 2, i * 6, c.ALT - .04, j * 6)); const mp = c.emis('#ffffff', branca ? 2 : .8, { c: '#fff' }); c.malha(K.juntar(pan), mp, c.teto);
    const l = c.luz(branca ? '#ffffff' : misturar(cor, '#ffffff', .5), branca ? 1.6 : 1, 30, 0, c.ALT - .4, 0);
    // a sombra a mais: uma mancha escura que anda devagar pelo chão depois da primeira falha
    const tx = c.textura('sombra', 128, 128, (x, W) => { const g = x.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, W); });
    const sb = c.malha(new T.PlaneGeometry(1.1, 1.6), c.matTx(tx, { op: 1, decal: true }), c.grupo, 0, .02, 0); sb.rotation.x = -PI / 2; sb.visible = false;
    let prox = 6, apaga = 0, falhou = false;
    c.anim((dt, t) => {
      prox -= dt; if (prox < 0) { prox = 12 + c.r() * 10; apaga = .5 + c.r() * .6; falhou = true; }
      apaga = Math.max(0, apaga - dt); const k = apaga > 0 ? (Math.random() < .3 ? .4 : 0) : 1;
      mp.emissiveIntensity = (branca ? 2 : .8) * k; l.userData.i = (branca ? 1.6 : 1) * k;
      sb.visible = falhou && branca; sb.position.set(Math.sin(t * .07) * 6, .02, Math.cos(t * .05) * 5); sb.rotation.z = t * .05;
    });
    if (!branca) { c.part({ modo: 2, n: 700, forma: 0, tam: .05, cor: misturar(cor, '#ffffff', .3), op: .6, aditivo: s.el === 'Energia', turb: .5, caixa: [-c.H, c.H, .2, c.ALT, -c.H, c.H], sem: 151 }); c.atm = { nevoa: { c: misturar(cor, '#000000', .85), d: .045 }, fundo: misturar(cor, '#000000', .9), amb: { i: .3, c: misturar(cor, '#ffffff', .6) }, exposicao: 1.2 }; }
    else c.atm = { nevoa: { c: '#e8e8e6', d: .012 }, fundo: '#e0e0de', amb: { i: .9, c: '#ffffff' }, exposicao: 1.0 };
  },

  /* ---------- julgamento: dois céus brigando e o chão de balança ---------- */
  julgamento(c, s) {
    const T = c.T, K = c.K, H = c.H, ALT = c.ALT, ca = s.cor || '#d8c86a', cb = s.cor2 || '#8a1018';
    const eixoX = (c.portasNoLado('w') + c.portasNoLado('e')) <= (c.portasNoLado('n') + c.portasNoLado('s'));
    c.casca({ piso: c.mat('#6a6660', { tex: 'marmore', rep: [4, 4], r: .7 }) });
    // os dois céus: à esquerda amarelo pálido com a máscara, à direita vermelho úmido que pulsa
    const txA = c.textura('ceu_rei', 512, 1024, (x, W, Hh, rr) => { const g = x.createRadialGradient(W / 2, Hh / 2, 20, W / 2, Hh / 2, Hh * .6); g.addColorStop(0, misturar(ca, '#ffffff', .2)); g.addColorStop(1, misturar(ca, '#3a3420', .6)); x.fillStyle = g; x.fillRect(0, 0, W, Hh); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,250,210,${rr() * .12})`; x.beginPath(); x.arc(rr() * W, rr() * Hh, 20 + rr() * 80, 0, TAU); x.fill(); } x.fillStyle = 'rgba(250,246,230,.92)'; x.beginPath(); x.ellipse(W / 2, Hh / 2, W * .3, Hh * .24, 0, 0, TAU); x.fill(); x.strokeStyle = 'rgba(120,110,80,.4)'; x.lineWidth = 6; x.stroke(); });
    const txB = c.textura('ceu_mae', 512, 1024, (x, W, Hh, rr) => { const g = x.createRadialGradient(W / 2, Hh / 2, 20, W / 2, Hh / 2, Hh * .6); g.addColorStop(0, misturar(cb, '#ff6060', .3)); g.addColorStop(1, misturar(cb, '#000000', .5)); x.fillStyle = g; x.fillRect(0, 0, W, Hh); x.strokeStyle = 'rgba(60,0,10,.55)'; for (let i = 0; i < 60; i++) { x.lineWidth = 1 + rr() * 5; let px = rr() * W, py = rr() * Hh, an = rr() * TAU; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 8; k++) { an += (rr() - .5) * .9; px += Math.cos(an) * 30; py += Math.sin(an) * 30; x.lineTo(px, py); } x.stroke(); } });
    const mA = c.basico('#ffffff', { map: txA }), mB = c.basico('#ffffff', { map: txB });
    const pA = c.malha(new T.PlaneGeometry(H, c.SALA), mA, c.teto), pB = c.malha(new T.PlaneGeometry(H, c.SALA), mB, c.teto);
    [pA, pB].forEach((p, i) => { p.rotation.x = PI / 2; p.position.y = ALT - .02; if (eixoX) p.position.x = (i ? 1 : -1) * H / 2; else { p.rotation.z = PI / 2; p.position.z = (i ? 1 : -1) * H / 2; } });
    // paredes: a cor do céu de cada lado continua até o chão
    const parTx = (lado) => c.textura('par_julg_' + lado + eixoX, 512, 256, (x, W, Hh) => { const g = x.createLinearGradient(0, 0, W, 0); const inv = (eixoX ? lado === 's' : lado === 'e'); const a1 = misturar(ca, '#2a2418', .3), b1 = misturar(cb, '#100004', .3); g.addColorStop(0, inv ? b1 : a1); g.addColorStop(.48, inv ? b1 : a1); g.addColorStop(.52, inv ? a1 : b1); g.addColorStop(1, inv ? a1 : b1); x.fillStyle = g; x.fillRect(0, 0, W, Hh); const v = x.createLinearGradient(0, 0, 0, Hh); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)'); x.fillStyle = v; x.fillRect(0, 0, W, Hh); });
    ['n', 's', 'w', 'e'].forEach(l => { const usaSplit = eixoX ? (l === 'n' || l === 's') : (l === 'w' || l === 'e'); const m = usaSplit ? c.basico('#ffffff', { map: parTx(l) }) : c.basico(misturar(eixoX ? (l === 'w' ? ca : cb) : (l === 'n' ? ca : cb), '#000000', .45)); c.parede(l, m); });
    // o prato do meio e os dois pratos pendurados por correntes no céu
    const pedra = c.mat('#8a847a', { tex: 'marmore', rep: [2, 2], r: .6 });
    c.malha(K.juntar([K.cil(3.2, 3.4, .18, 0, 0, 0, 48)]), pedra);
    const pratos = [-1, 1].map(sd => { const g = new T.Group(); if (eixoX) g.position.x = sd * 6.2; else g.position.z = sd * 6.2; c.grupo.add(g); c.malha(K.juntar([K.cil(2.1, 2.2, .2, 0, 0, 0, 40), new T.TorusGeometry(2.15, .07, 6, 40).rotateX(PI / 2).translate(0, .2, 0)]), pedra, g); const cor2 = []; for (let k = 0; k < 3; k++) { const a = k / 3 * TAU; cor2.push(K.barra([Math.cos(a) * 2, .2, Math.sin(a) * 2], [0, ALT - .5, 0], .025, .025, 4)); } c.malha(K.juntar(cor2), c.mat('#4a4438', { me: .8, r: .4 }), g); return g; });
    const trav = new T.Group(); trav.position.y = ALT - .5; c.grupo.add(trav); if (!eixoX) trav.rotation.y = PI / 2;
    const travI = new T.Group(); trav.add(travI); c.malha(K.juntar([K.caixa(13, .26, .36, 0, -.13, 0), K.cil(.3, .3, .5, 0, -.25, 0, 12, PI / 2), K.caixa(.18, .6, .18, 0, 0, 0)]), c.mat('#4a4438', { me: .8, r: .35 }), travI);
    c.part({ modo: 2, n: 500, forma: 0, tam: .06, cor: misturar(ca, '#ffffff', .3), op: .7, aditivo: true, turb: .5, caixa: eixoX ? [-c.H, -.5, .3, ALT, -c.H, c.H] : [-c.H, c.H, .3, ALT, -c.H, -.5], sem: 161 });
    c.part({ modo: 2, n: 220, forma: 0, tam: 1.8, cor: misturar(cb, '#000000', .2), op: .07, turb: .5, caixa: eixoX ? [.5, c.H, .3, ALT, -c.H, c.H] : [-c.H, c.H, .3, ALT, .5, c.H], sem: 162 });
    const l1 = c.luz(ca, 1.8, 24, eixoX ? -6 : 0, ALT - .5, eixoX ? 0 : -6), l2 = c.luz('#ff3a3a', 1.8, 24, eixoX ? 6 : 0, ALT - .5, eixoX ? 0 : 6);
    let ang = 0;
    c.anim((dt, t) => {
      const st = c.st, rr = aleatorio(c.cena.semente + st.rod * 37), lado0 = rr() < .5 ? -1 : 1, des = (1 - st.kProg) * .38;
      const alvo = lado0 * des + Math.sin(t * .6) * .05 * (1 - st.kProg); ang += (alvo - ang) * Math.min(1, dt * .8);
      pratos.forEach((g, i) => { g.position.y = .15 + (i ? ang : -ang); }); travI.rotation.z = Math.atan2(ang, 6.2);
      const pul = Math.pow(Math.max(0, Math.sin(t * 1.9)), 4); mB.color.setScalar(.75 + pul * .35); mA.color.setScalar(.95 + Math.sin(t * .3) * .05); l2.userData.i = 1.3 + pul * 1.4; l1.userData.i = 1.8;
    });
    c.atm = { nevoa: { c: '#1a1410', d: .03 }, fundo: '#0e0a08', amb: { i: .45, c: '#f0e0c8' }, exposicao: 1.15 };
  },

  /* ---------- laboratório: cabos, painéis de cinco cores e cilindros de vidro ---------- */
  laboratorio(c, s) {
    const T = c.T, K = c.K, H = c.H, ALT = c.ALT;
    cascaPadrao(c, s, { piso: '#24262a', pisoTex: 'grade_chao', parede: '#383c42', paredeTex: 'metal_sujo', teto: '#1c1e22' });
    const cinco = ['#c2272f', '#2a2a2a', '#d9a514', '#8a3fd1', '#e9e4f2'];
    const pm = cinco.map(cr => c.emis(cr, 1.2, { c: '#101010' })), pn = [];
    ['n', 's', 'w', 'e'].forEach((l, li) => { for (let t = -7.5; t <= 7.5; t += 2.5) { const P = c.naParede(l, t, .3); if (!c.livre(P.x, P.z, -1.6)) continue; const k = (((li * 7 + Math.round(t)) % 5) + 5) % 5; const g = new T.Group(); g.position.set(P.x, 0, P.z); g.rotation.y = P.ry; c.grupo.add(g); c.malha(new T.BoxGeometry(1.8, 2.4, .5).translate(0, 1.2, 0), c.mat('#4a4e54', { tex: 'metal_sujo', me: .6 }), g); pn.push(c.malha(new T.PlaneGeometry(1.4, .9), pm[k], g, 0, 1.6, .26)); } });
    // cabos grossos no chão e pendurados
    const cb = []; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, x0 = Math.cos(a) * 9, z0 = Math.sin(a) * 9; if (!c.livre(x0, z0, -1.5)) continue; cb.push(K.tubo([[x0, .06, z0], [x0 * .6, .08, z0 * .6 + 1], [x0 * .25, .06, z0 * .25], [0, .1, 0]], .07, 20, 6)); cb.push(K.tubo([[x0 * .7, ALT, z0 * .7], [x0 * .5, ALT - 1.3, z0 * .5], [x0 * .3, ALT, z0 * .3]], .05, 14, 5)); }
    c.malha(K.juntar(cb), c.mat('#151515', { r: .6 }));
    // a cadeira no centro
    const cad = c.F.P.cadeira_dentista({ c: '#3a2a20' }); c.grupo.add(cad); c.colRet(0, 0, .9, 1.6);
    // cilindros de vidro: sobem do chão e descem do teto
    const vidro = c.guardar(new T.MeshStandardMaterial({ color: new T.Color('#cfe8f0'), roughness: .05, metalness: .2, transparent: true, opacity: .22, side: T.DoubleSide, depthWrite: false }));
    const tubos = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .4, x = Math.cos(a) * 5.5, z = Math.sin(a) * 5.5; if (!c.livre(x, z, .8)) continue; c.malha(K.juntar([K.cil(.9, .95, .4, x, 0, z, 24), K.cil(.9, .95, .35, x, ALT - .35, z, 24)]), c.mat('#55595e', { me: .8, r: .35 })); const g = new T.Group(); g.position.set(x, 0, z); c.grupo.add(g); c.malha(new T.CylinderGeometry(.85, .85, ALT - .75, 28, 1, true).translate(0, (ALT - .75) / 2, 0), vidro, g).renderOrder = 5; const brilho = c.malha(new T.CylinderGeometry(.84, .84, ALT - .8, 24, 1, true).translate(0, (ALT - .8) / 2, 0), c.emis('#ffffff', 0, { c: '#000', op: .2 }), g); brilho.material.side = T.DoubleSide; tubos.push({ g, brilho, x, z }); }
    const l = c.luz('#ffffff', 0, 10, 0, 1.5, 0);
    // alto-falante
    const Pf = c.naParede(c.ladosLivres()[0], 0, .3); c.malha(new T.ConeGeometry(.35, .6, 16, 1, true).rotateX(-PI / 2).translate(0, 0, .3), c.mat('#2a2a2a', { me: .5, lado: 2 }), c.grupo, Pf.x, 3.3, Pf.z).rotation.y = Pf.ry;
    let escolhido = -1, corT = '#ffffff';
    c.upd(st => { const rr = aleatorio(c.cena.semente + st.rod * 53); escolhido = tubos.length ? Math.floor(rr() * tubos.length) : -1; corT = cinco[Math.floor(rr() * 5)]; if (escolhido >= 0 && l.color) { l.color.set(corT); } });
    c.anim((dt, t) => {
      tubos.forEach((q, i) => { const alvo = i === escolhido ? 0 : .38; q.g.position.y += (alvo - q.g.position.y) * Math.min(1, dt * 1.5); q.g.scale.y = 1; q.brilho.material.emissive.set(corT); q.brilho.material.emissiveIntensity = i === escolhido ? 1 + Math.sin(t * 8) * .5 : 0; });
      if (escolhido >= 0) { const q = tubos[escolhido]; l.position.set(q.x, 1.5, q.z); l.userData.i = 1.2 + Math.sin(t * 8) * .6; }
      pm.forEach((m, i) => { m.emissiveIntensity = .6 + .8 * Math.max(0, Math.sin(t * 2 + i * 1.3)); });
    });
    c.luz('#d0d8e8', .9, 24, 0, ALT - .5, 0);
    c.atm = { nevoa: { c: '#06070a', d: .035 }, fundo: '#030305', amb: { i: .28, c: '#c8d0e0' }, exposicao: 1.2 };
  },

  /* ---------- horda: o enxame (e, se pedir, o prédio de onde ele sai) ---------- */
  horda(c, s) {
    const T = c.T, K = c.K, H = c.H, ALT = c.ALT;
    cascaPadrao(c, s, { piso: '#2e2a26', parede: '#3a342e', teto: '#141210' });
    const lado = c.ladosLivres()[0], porta = c.vaos.find(v => v.lado === lado), tP = porta ? c.tDaPorta(porta) : null, D0 = 4.5;
    const faixas = s.predio === false ? [] : (tP === null ? [[-7, 7]] : [[-7, Math.min(7, tP - 1.9)], [Math.max(-7, tP + 1.9), 7]]).filter(([a, b]) => b - a > 1.5);
    const jan = c.textura('janelas', 512, 256, (x, W, Hh, rr) => { x.fillStyle = '#4a4440'; x.fillRect(0, 0, W, Hh); for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(0,0,0,${rr() * .15})`; x.fillRect(rr() * W, rr() * Hh, 3, 3); } for (let j = 0; j < 2; j++) for (let i = 0; i < 6; i++) { const px = 20 + i * 82, py = 22 + j * 120; x.fillStyle = '#1a1612'; x.fillRect(px - 4, py - 4, 60, 84); x.fillStyle = rr() < .35 ? '#c89a4a' : '#060504'; x.fillRect(px, py, 52, 76); x.fillStyle = 'rgba(0,0,0,.8)'; for (let k = 0; k < 3; k++) { x.beginPath(); x.ellipse(px + rr() * 52, py + 50 + rr() * 26, 8 + rr() * 8, 12, 0, 0, TAU); x.fill(); } } }, [1, 1]);
    const mJ = c.matTx(jan, { r: .85, e: '#ffffff', ei: .35 });
    faixas.forEach(([a, b]) => { const P = c.naParede(lado, (a + b) / 2, D0 / 2), w = b - a; const g = new T.Group(); g.position.set(P.x, 0, P.z); g.rotation.y = P.ry; c.grupo.add(g); c.malha(new T.BoxGeometry(w, ALT, D0).translate(0, ALT / 2, 0), c.mat('#3e3832', { tex: 'tijolo', rep: [w / 2, 2] }), g); const f = c.malha(new T.PlaneGeometry(w, ALT), mJ, g, 0, ALT / 2, D0 / 2 + .01); f.material.map.repeat.set(w / 7, 1); c.colRet(P.x, P.z, w, D0, P.ry); });
    // a porta de entrada aberta (escura) e o cartaz na janela de cima
    if (faixas.length) { const [a, b] = faixas[0], P = c.naParede(lado, (a + b) / 2, D0 + .02); c.malha(new T.PlaneGeometry(1.4, 2.1), c.mat('#000000', { r: 1 }), c.grupo, P.x, 1.05, P.z).rotation.y = P.ry;
      if (s.textos.cartaz) { const Pc = c.naParede(lado, (a + b) / 2 + 2.2, D0 + .04), car = c.malha(new T.PlaneGeometry(.9, .6), c.matTx(c.textoTex(s.textos.cartaz, { w: 512, h: 340, cor: '#1a1a1a', fundo: '#efe8d4', tam: 54, fonte: 'Comic Sans MS, cursive', peso: 'bold' }), { r: .9 }), c.grupo, Pc.x, 3.0, Pc.z); car.rotation.y = Pc.ry; c.anim((dt, t) => { car.position.y = 3.0 + (Math.sin(t * 9) > .6 ? Math.sin(t * 40) * .02 : 0); car.rotation.z = Math.sin(t * 9) > .6 ? Math.sin(t * 30) * .04 : 0; }); } }
    // o enxame
    const nMax = Math.round(Math.min(numero(s.n, 260), 280) * c.Q), im = c.multidao(K.criatura(), c.mat(s.criaturaCor || '#17120f', { r: .75 }), nMax), cr = [];
    const fP = faixas.length ? c.naParede(lado, (faixas[0][0] + faixas[0][1]) / 2, D0 + 2.5) : { x: 0, z: 0 };
    for (let i = 0; i < nMax; i++) {
      const tipo = faixas.length && i % 5 === 0 ? 'parede' : 'chao';
      if (tipo === 'parede') { const [a, b] = faixas[i % faixas.length]; cr.push({ tipo, t: mix(a, b, c.r()), y: .3 + c.r() * (ALT - .8), f: c.r() * 9, v: .3 + c.r() * .6 }); }
      else { const ang = c.r() * TAU, R = 1 + c.r() * 7; cr.push({ tipo, cx: fP.x * .6 + Math.cos(ang) * R * .4, cz: fP.z * .6 + Math.sin(ang) * R * .4, R: 1.5 + c.r() * 4, f: c.r() * TAU, v: .2 + c.r() * .5, s: .8 + c.r() * .5 }); }
    }
    let vis = nMax;
    c.upd(st => { vis = Math.max(Math.round(nMax * .1), Math.round(nMax * (1 - .85 * st.kProg))); });
    c.anim((dt, t) => {
      im.count = vis;
      for (let i = 0; i < vis; i++) {
        const q = cr[i];
        if (q.tipo === 'parede') { const y = q.y + Math.sin(t * q.v + q.f) * .8, tt = q.t + Math.cos(t * q.v * .7 + q.f) * .6, P = c.naParede(lado, tt, D0 + .2); c.por(im, i, P.x, lim(y, .2, ALT - .4), P.z, P.ry + PI, .9, -PI / 2, Math.sin(t * 3 + q.f) * .3); }
        else { const a = q.f + t * q.v, x = q.cx + Math.cos(a) * q.R + Math.sin(t * 2.3 + q.f) * .4, z = q.cz + Math.sin(a * 1.3) * q.R * .7; const hd = Math.atan2(-Math.sin(a) * q.R, Math.cos(a * 1.3) * q.R * .91); const xx = lim(x, -H + .4, H - .4), zz = lim(z, -H + .4, H - .4); c.por(im, i, xx, Math.abs(Math.sin(t * 8 + q.f)) * .06, zz, hd, q.s); }
      }
      im.instanceMatrix.needsUpdate = true;
    });
    const l = c.luz('#ffb050', 1.3, 14, fP.x, 1.8, fP.z), rr = aleatorio(171); c.anim(() => { l.userData.i = rr() < .06 ? .2 : 1.3; });
    c.luz('#a8b8d0', .8, 26, -fP.x * .5, ALT - .4, -fP.z * .5);
    c.atm = { nevoa: { c: '#0e0c0a', d: .05 }, fundo: '#060504', amb: { i: .24, c: '#d8c8b0' }, exposicao: 1.2 };
  },

  /* ---------- plateia: teatro antigo, holofote no palco e máscaras sem olhos ---------- */
  teatro(c, s) {
    const T = c.T, K = c.K, H = c.H, ALT = c.ALT;
    c.casca({ piso: c.mat('#2a1a10', { tex: 'madeira_velha', rep: [8, 8], r: .6 }), parede: c.mat('#4a0e16', { tex: 'veludo', rep: [6, 1], r: 1 }), teto: c.mat('#140808', { tex: 'madeira_velha', rep: [4, 4] }) });
    const lado = c.ladosLivres()[0], porta = c.vaos.find(v => v.lado === lado), tP = porta ? c.tDaPorta(porta) : null, DP = 4;
    const faixas = tP === null ? [[-H, H]] : [[-H, tP - 1.8], [tP + 1.8, H]];
    faixas.forEach(([a, b]) => { if (b - a < .5) return; const P = c.naParede(lado, (a + b) / 2, DP / 2), w = b - a; const me = c.malha(new T.BoxGeometry(w, .8, DP).translate(0, .4, 0), c.mat('#3a2410', { tex: 'madeira', rep: [w / 2, 2] }), c.grupo, P.x, 0, P.z); me.rotation.y = P.ry; c.colRet(P.x, P.z, w, DP, P.ry); });
    // cortinas amarelas abertas para os lados e a bambolina em cima
    const mC = c.mat(s.cortina || '#b8901a', { tex: 'veludo', r: 1, lado: 2 });
    [-1, 1].forEach(sd => { const P = c.naParede(lado, sd * 7.5, DP), g = c.F.P.cortina({ w: 5, h: ALT - .1, c: s.cortina || '#b8901a' }); g.position.set(P.x, 0, P.z); g.rotation.y = P.ry; c.grupo.add(g); c.anim((dt, t) => { g.rotation.y = P.ry + Math.sin(t * .4 + sd) * .02; }); });
    const Pb = c.naParede(lado, 0, DP), bamb = c.malha(new T.PlaneGeometry(c.SALA, .9), mC, c.grupo, Pb.x, ALT - .45, Pb.z); bamb.rotation.y = Pb.ry;
    // holofote: círculo de luz no palco e um cone de poeira iluminada
    const Ph = c.naParede(lado, tP !== null && Math.abs(tP) < 3 ? (tP > 0 ? -5 : 5) : 0, DP * .55);
    const foco = c.malha(new T.CircleGeometry(1.4, 32), c.emis('#fff4d8', 1.2, { c: '#fff4d8', op: .5 }), c.grupo, Ph.x, .82, Ph.z); foco.rotation.x = -PI / 2; foco.material.depthWrite = false;
    const cone = c.malha(new T.ConeGeometry(1.4, ALT - .8, 32, 1, true).translate(0, -(ALT - .8) / 2, 0), c.basico('#fff0c8', { op: .06, aditivo: true, lado: true }), c.grupo, Ph.x, ALT, Ph.z);
    const lf = c.luz('#fff0d0', 2.2, 10, Ph.x, 3.2, Ph.z);
    // poltronas com o público mascarado
    const ry0 = c.naParede(lado, 0, 0).ry + PI, assentos = [];
    for (let f = 0; f < 11; f += c.celular ? 2 : 1) for (let i = -12; i <= 12; i++) { const t = i * .78, d = DP + 2.2 + f * 1.15; if (Math.abs(t) < .9 || d > c.SALA - 1.2) continue; const P = c.naParede(lado, t, d); if (!c.livre(P.x, P.z, .3) || Math.abs(P.x) > H - .6 || Math.abs(P.z) > H - .6) continue; assentos.push([P.x, P.z, f]); }
    const n = assentos.length, mPol = c.mat('#5a0a14', { tex: 'veludo', r: 1 });
    const pol = c.multidao(K.juntar([K.caixa(.6, .45, .55, 0, 0, 0), K.caixa(.6, .55, .1, 0, .45, -.26)]), mPol, n), corpo = c.multidao(K.boneco('sentado'), c.mat('#1a1416', { r: .9 }), n);
    const masc = c.multidao(new T.SphereGeometry(.13, 12, 8, 0, PI).scale(.85, 1.15, .6), c.mat('#f2efe6', { r: .4, e: '#2a2826', ei: .3 }), n);
    assentos.forEach(([x, z], i) => { c.por(pol, i, x, 0, z, ry0); c.por(corpo, i, x, .02, z, ry0); }); pol.instanceMatrix.needsUpdate = corpo.instanceMatrix.needsUpdate = true;
    const rot = assentos.map(() => 0);
    c.anim((dt, t, cam) => {
      // as máscaras viram devagar para quem está olhando (o público espera)
      const cx = cam && cam.position ? cam.position.x - c.grupo.position.x : 0, cz = cam && cam.position ? cam.position.z - c.grupo.position.z : 0, olhar = cam && cam.position && Math.abs(cx) < H + 2 && Math.abs(cz) < H + 2;
      assentos.forEach(([x, z], i) => { let alvo = 0; if (olhar) { const a = Math.atan2(cx - x, cz - z) - ry0; alvo = lim(((a % TAU) + TAU + PI) % TAU - PI, -1.1, 1.1) * (.5 + .5 * c.st.kProg); } rot[i] += (alvo - rot[i]) * Math.min(1, dt * (.3 + (i % 7) * .05)); const yaw = ry0 + rot[i]; c.por(masc, i, x + Math.sin(yaw) * .1, 1.22, z + Math.cos(yaw) * .1, yaw); });
      masc.instanceMatrix.needsUpdate = true;
      foco.material.emissiveIntensity = 1 + Math.sin(t * 1.3) * .08; lf.userData.i = 2 + Math.sin(t * 1.3) * .2;
    });
    c.upd(st => { cone.material.opacity = .05 + st.kProg * .04; });
    c.part({ modo: 2, n: 400, forma: 0, tam: .03, cor: '#fff4d8', op: .8, turb: .3, caixa: [Ph.x - 1.2, Ph.x + 1.2, 1, ALT - .2, Ph.z - 1.2, Ph.z + 1.2], sem: 181, fixo: true });
    c.luz('#8a2030', .5, 26, 0, ALT - .5, 0);
    c.atm = { nevoa: { c: '#0a0405', d: .035 }, fundo: '#040102', amb: { i: .14, c: '#e8c8b8' }, exposicao: 1.3 };
  },

  /* ---------- quarto de bebê: carneirinhos, móbile girando e um berço com mosquiteiro ---------- */
  quarto(c, s) {
    const T = c.T, K = c.K, ALT = c.ALT;
    const pap = c.textura('carneirinhos', 512, 512, (x, W, Hh, rr) => { x.fillStyle = '#b8cce0'; x.fillRect(0, 0, W, Hh); x.fillStyle = 'rgba(240,190,206,.55)'; for (let i = 0; i < W; i += 64) x.fillRect(i, 0, 26, Hh); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const cx = i * 128 + (j % 2) * 64 + 50, cy = j * 128 + 60; x.fillStyle = '#fdfcf8'; for (let k = 0; k < 7; k++) { x.beginPath(); x.arc(cx + Math.cos(k) * 22, cy + Math.sin(k * 1.3) * 12, 17, 0, TAU); x.fill(); } x.fillStyle = '#3a3430'; x.beginPath(); x.ellipse(cx + 36, cy - 2, 11, 8, 0, 0, TAU); x.fill(); x.fillRect(cx - 14, cy + 16, 4, 16); x.fillRect(cx + 10, cy + 16, 4, 16); } for (let i = 0; i < 26; i++) { const g = x.createLinearGradient(0, 0, 0, Hh); const px = rr() * W; g.addColorStop(0, 'rgba(110,90,50,0)'); g.addColorStop(1, 'rgba(110,90,50,.35)'); x.fillStyle = g; x.fillRect(px, Hh * rr() * .5, 6 + rr() * 30, Hh); } }, [5, 1.2]);
    c.casca({ piso: c.mat('#9a8a7a', { tex: 'carpete', rep: [8, 8], r: 1 }), parede: c.matTx(pap, { r: .9 }), teto: c.mat('#c8c0b8', { tex: 'forro', rep: [4, 4] }) });
    // tapete redondo, berço no centro e o mosquiteiro fechado
    c.malha(new T.CircleGeometry(3.4, 48).rotateX(-PI / 2), c.mat('#e8c8d0', { tex: 'carpete', rep: [3, 3], r: 1 }), c.grupo, 0, .02, 0);
    const b = new T.Group(); c.grupo.add(b);
    const mad = c.mat('#e8d4b8', { tex: 'madeira', r: .6 }), gb = [];
    [[-.65, -.42], [.65, -.42], [-.65, .42], [.65, .42]].forEach(([x, z]) => gb.push(K.cil(.035, .035, 1.15, x, 0, z, 8)));
    for (let i = 0; i < 12; i++) [-.42, .42].forEach(z => gb.push(K.cil(.013, .013, .52, -.6 + i * .109, .45, z, 4)));
    gb.push(K.caixa(1.35, .05, .88, 0, .42, 0), K.caixa(1.35, .05, .05, 0, .97, -.42), K.caixa(1.35, .05, .05, 0, .97, .42));
    c.malha(K.juntar(gb), mad, b); c.malha(new T.BoxGeometry(1.25, .12, .8).translate(0, .47, 0), c.mat('#f4ece8', { tex: 'acolchoado', r: .9 }), b);
    const veu = c.malha(new T.ConeGeometry(1.05, ALT - .25, 28, 1, true).translate(0, (ALT - .25) / 2, 0), c.mat('#f8f6f2', { op: .38, r: .9, lado: 2 }), c.grupo, 0, 0, 0);
    c.malha(new T.TorusGeometry(.15, .02, 6, 16).rotateX(PI / 2), c.mat('#d8c8a0', { me: .6 }), c.grupo, 0, ALT - .3, 0);
    c.colRet(0, 0, 2, 2);
    // móbile girando sozinho
    const mob = new T.Group(); mob.position.set(0, 2.25, 0); c.grupo.add(mob);
    c.malha(K.juntar([K.cil(.004, .004, ALT - 2.5, 0, 0, 0, 4), K.barra([-.4, 0, 0], [.4, 0, 0], .008), K.barra([0, 0, -.4], [0, 0, .4], .008)]), c.mat('#888', { me: .6 }), mob);
    const fig = [new T.SphereGeometry(.08, 10, 8), new T.OctahedronGeometry(.09), new T.TorusGeometry(.07, .025, 6, 12), new T.ConeGeometry(.07, .14, 5)];
    [[.4, 0], [-.4, 0], [0, .4], [0, -.4]].forEach(([x, z], i) => { c.malha(K.juntar([K.cil(.003, .003, .3, x, -.3, z, 3), fig[i].translate(x, -.38, z)]), c.mat(['#f2c8d0', '#c8e0f2', '#f2e8b0', '#d0f0c8'][i], { r: .6 }), mob); });
    // cadeira de balanço que balança sozinha, cômoda com o abajur de estrelas, ursinho e blocos
    const Pc = c.naParede(c.ladosLivres()[0], 4, 1.8), cb = new T.Group(); cb.position.set(Pc.x, 0, Pc.z); cb.rotation.y = Pc.ry; c.grupo.add(cb);
    const cbI = new T.Group(); cb.add(cbI); c.malha(K.juntar([K.caixa(.6, .06, .55, 0, .45, 0), K.caixa(.6, .75, .05, 0, .5, -.26), ...[-1, 1].map(sd => K.tubo([[sd * .28, .1, -.45], [sd * .28, 0, 0], [sd * .28, .1, .45]], .025, 10, 4)), ...[-1, 1].flatMap(sd => [K.cil(.02, .02, .45, sd * .28, .02, .2, 4), K.cil(.02, .02, .45, sd * .28, .02, -.2, 4)])]), mad, cbI);
    const Pd = c.naParede(c.ladosLivres()[1] || 'e', -3, .35); c.malha(new T.BoxGeometry(1.4, .9, .5).translate(0, .45, 0), c.mat('#e8dcc8', { tex: 'madeira' }), c.grupo, Pd.x, 0, Pd.z).rotation.y = Pd.ry;
    c.malha(K.juntar([K.cil(.12, .14, .2, 0, 0, 0, 12), K.esf(.16, 0, .32, 0, 12)]), c.emis('#ffd090', 1.6, { c: '#ffd090' }), c.grupo, Pd.x, .9, Pd.z);
    const urso = new T.Group(); const Pu = c.naParede(c.ladosLivres()[2] || 'w', 2, .5); urso.position.set(Pu.x, 0, Pu.z); urso.rotation.y = Pu.ry; c.grupo.add(urso);
    c.malha(K.juntar([K.esf(.22, 0, .22, 0, 10, 1, 1.1, .9), K.esf(.15, 0, .55, 0, 10), K.esf(.06, -.1, .68, 0, 6), K.esf(.06, .1, .68, 0, 6), K.esf(.08, -.18, .1, .12, 6), K.esf(.08, .18, .1, .12, 6)]), c.mat('#8a6a4a', { tex: 'carpete', r: 1 }), urso);
    const bl = [], cs = []; for (let i = 0; i < 9; i++) { const [x, z] = c.pontoLivre(aleatorio(1900 + i), 2.5); bl.push(K.caixa(.18, .18, .18, x, 0, z, 0, c.r() * 3, 0)); cs.push(['#e85a4a', '#4ab0e8', '#f2c84a', '#5ac87a'][i % 4]); } c.malha(K.juntar(bl, cs), c.vc({ r: .6 }));
    // estrelas do abajur projetadas no teto, girando devagar
    const est = c.part({ modo: 2, n: 260, forma: 2, tam: .16, cor: '#ffe2a8', op: .7, aditivo: true, turb: .01, caixa: [-c.H + .5, c.H - .5, ALT - .06, ALT - .04, -c.H + .5, c.H - .5], sem: 192, fixo: true });
    // a fechadura em forma de mão pequena na porta de saída
    if (c.sai) { const P = c.naParede(c.sai.lado, c.tDaPorta(c.sai) + 1.5, .05), tx = c.textura('maozinha', 128, 128, (x, W) => { x.clearRect(0, 0, W, W); x.fillStyle = '#c8a888'; x.beginPath(); x.ellipse(64, 80, 26, 30, 0, 0, TAU); x.fill(); for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(36 + k * 14, 40 - Math.sin(k * .8) * 10, 6, 18, (k - 2) * .2, 0, TAU); x.fill(); } }); c.malha(new T.PlaneGeometry(.3, .3), c.matTx(tx, { op: 1, r: .5 }), c.grupo, P.x, 1.1, P.z).rotation.y = P.ry; }
    const l = c.luz('#ffc890', .9, 16, Pd.x * .85, 1.4, Pd.z * .85), l2 = c.luz('#c8d8ff', .5, 14, 0, ALT - .5, 0);
    c.anim((dt, t) => {
      const choro = 1 - c.st.kProg; mob.rotation.y = t * .35; cbI.rotation.x = Math.sin(t * 1.2) * .12; est.pts.rotation.y = t * .03;
      b.rotation.z = Math.sin(t * 18) * .006 * choro * (Math.sin(t * .7) > 0 ? 1 : .3); veu.rotation.y = Math.sin(t * .5) * .05; veu.scale.x = 1 + Math.sin(t * 1.1) * .01;
      l.userData.i = .8 + .4 * c.st.kProg + Math.sin(t * 7) * .03; l2.userData.i = .45;
    });
    c.part({ modo: 2, n: 500, forma: 0, tam: .03, cor: '#fffaf0', op: .6, turb: .3, caixa: [-c.H, c.H, .3, ALT, -c.H, c.H], sem: 191 });
    c.atm = { nevoa: { c: '#120e10', d: .05 }, fundo: '#080607', amb: { i: .2, c: '#ffd8c8' }, exposicao: 1.3 };
  },

  /* ---------- fogo / calor: chão queimado, brasas e chamas ao longo das paredes ---------- */
  fogo(c, s) {
    const T = c.T, cor = s.cor || '#ff6a1a';
    cascaPadrao(c, s, { piso: '#1a1612', parede: '#2a2420', teto: '#100c0a' });
    c.part({ modo: 3, n: 900, forma: 0, tam: .5, cor, op: .8, aditivo: true, fluxo: 1.4, cresce: -.6, vel: [0, 1.6, 0], caixa: [-c.H + .3, c.H - .3, 0, .3, -c.H + .3, c.H - .3], pontos: (i, rr) => { const P = c.naParede(['n', 's', 'w', 'e'][i % 4], (rr() - .5) * 18, .4); return [P.x, .1, P.z]; }, sem: 201 });
    EXTRAS.calor(c, s);
    const l = c.luz(cor, 1.8, 20, 0, 1.2, 0), rr = aleatorio(203); c.anim(() => { l.userData.i = 1.5 + rr() * .6; });
    void T;
    c.atm = { nevoa: { c: '#2a1006', d: .045 }, fundo: '#100402', amb: { i: .35, c: '#ffb080' }, exposicao: 1.15 };
  },

  /* ---------- zonas (genérico): anéis no chão e partículas do elemento ---------- */
  zonas(c, s) {
    cascaPadrao(c, s);
    EXTRAS.zonas(c, s);
    c.part({ modo: 2, n: 600, forma: 0, tam: .05, cor: misturar(s.cor, '#ffffff', .3), op: .6, aditivo: true, turb: .5, caixa: [-c.H, c.H, .2, c.ALT, -c.H, c.H], sem: 211 });
    c.luz(misturar(s.cor, '#ffffff', .4), 1.2, 22, 0, c.ALT - .5, 0);
    c.atm = { nevoa: { c: misturar(s.cor, '#000000', .85), d: .04 }, fundo: '#050405', amb: { i: .3, c: misturar(s.cor, '#ffffff', .6) }, exposicao: 1.2 };
  },
};

/* =========================================================
   MAPA 2.5D: camada animada por cima da sala + selo
   ========================================================= */
const D2 = { el: null, cv: null, ctx: null, selo: null, x: null, st: null, cena: null, raf: 0, ult: 0, sig: '', obs: null, stage: null };
const reduzido = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
function css2d() {
  if (document.getElementById('expo2dCss')) return;
  const st = document.createElement('style'); st.id = 'expo2dCss';
  st.textContent = `
.expo2d { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 1; border-radius: 1px;
  box-shadow: inset 0 0 0 4px var(--ex2d, #c2272f), inset 0 0 34px var(--ex2d, #c2272f); animation: expo2dBorda 2.4s ease-in-out infinite; }
.expo2d canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.expo2d-selo { position: absolute; left: 5%; right: 5%; bottom: 15%; padding: 2px 5px 3px; border-radius: 6px; text-align: center;
  background: rgba(8, 6, 10, .86); border: 2px solid var(--ex2d, #c2272f); color: #f4eef8; font: 700 11px/1.3 var(--mono, ui-monospace, monospace);
  letter-spacing: 0; text-transform: uppercase; box-shadow: 0 0 14px rgba(0, 0, 0, .7); }
.expo2d-selo span { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.expo2d-selo b { color: var(--ex2d, #c2272f); letter-spacing: .06em; }
.expo2d-selo i { font-style: normal; opacity: .85; }
@keyframes expo2dBorda { 0%, 100% { opacity: 1; } 50% { opacity: .78; } }
@media (prefers-reduced-motion: reduce) { .expo2d { animation: none; } }`;
  document.head.appendChild(st);
}
function podeVer2d(x) {
  const A = window.ACF; if (!A) return false;
  if (A.mestre || A.aux) return true;
  if (A.meu && (x.part || {})[A.meu]) return true;
  try { return !!A.salaVisivel(+x.cn); } catch (e) { return false; }
}
function remover2d() { if (D2.el) D2.el.remove(); D2.el = D2.cv = D2.ctx = D2.selo = null; if (D2.raf) cancelAnimationFrame(D2.raf); D2.raf = 0; }
const corEl2d = el => ({ Sangue: '#c2272f', Morte: '#8c8c8c', Conhecimento: '#d9a514', Energia: '#8a3fd1', Medo: '#e9e4f2' })[el] || '#8a3fd1';
function esc2d(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
function sinc2d() {
  try {
    const A = window.ACF, x = A && A.estado && A.estado.expo;
    if (!x || !x.on || !x.cn || !podeVer2d(x)) { remover2d(); return; }
    const sala = document.querySelector(`.sala[data-cn="${+x.cn}"]`);
    if (!sala) { remover2d(); return; }
    css2d();
    if (!D2.el || D2.el.parentNode !== sala) {
      remover2d();
      const o = document.createElement('div'); o.className = 'expo2d'; o.setAttribute('aria-hidden', 'true');
      o.innerHTML = '<canvas></canvas><div class="expo2d-selo"></div>';
      const tinta = sala.querySelector('.sala-tinta'); if (tinta && tinta.nextSibling) sala.insertBefore(o, tinta.nextSibling); else sala.appendChild(o);
      D2.el = o; D2.cv = o.querySelector('canvas'); D2.ctx = D2.cv.getContext('2d'); D2.selo = o.querySelector('.expo2d-selo');
    }
    const s = x.sala || {};
    D2.x = x; D2.st = lerEstado(x); D2.cena = cenaDe(s);
    D2.el.style.setProperty('--ex2d', corEl2d(s.el));
    const selo = `<span><b>EXPOSIÇÃO</b> · <i>rodada ${D2.st.rod}</i></span><span>${esc2d(s.nome || 'Sala de Exposição')}</span>`;
    if (D2.selo.innerHTML !== selo) D2.selo.innerHTML = selo;
    const w = D2.el.clientWidth || 200, dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(w * dpr);
    if (D2.cv.width !== W) { D2.cv.width = W; D2.cv.height = W; }
    if (reduzido()) { if (D2.raf) cancelAnimationFrame(D2.raf); D2.raf = 0; desenhar2d(4); }
    else if (!D2.raf) D2.raf = requestAnimationFrame(laco2d);
  } catch (e) { console.warn('expo 2.5D:', e); }
}
function laco2d(ms) {
  D2.raf = 0;
  if (!D2.el || !D2.el.isConnected) { remover2d(); return; }
  if (!document.hidden && ms - D2.ult > 40) { D2.ult = ms; desenhar2d(ms / 1000); }
  D2.raf = requestAnimationFrame(laco2d);
}
// o progresso vem do registro: confere de vez em quando (e a sala pode ter sido redesenhada)
setInterval(() => { if (D2.x && D2.x.on) { const g = lerEstado(D2.x).grupo; if (D2.st && g !== D2.st.grupo) sinc2d(); } if ((window.ACF && window.ACF.estado && (window.ACF.estado.expo || {}).on) && (!D2.el || !D2.el.isConnected)) sinc2d(); }, 1500);

function desenhar2d(t) {
  const x = D2.ctx, W = D2.cv.width; if (!x || !W) return;
  const s = D2.cena, st = D2.st, cor = s.cor || corEl2d(s.el), r = aleatorio(s.semente * 13 + 5);
  x.clearRect(0, 0, W, W);
  const f = D2FN[s.base] || D2FN[{ vento: 'deserto', calor: 'fogo' }[s.base]] || D2FN.vazio;
  x.save(); try { f(x, W, t, st, s, cor, r); } catch (e) { /* desenho opcional */ } x.restore();
  // brilho do elemento por cima de tudo (a sala inteira muda de cor no mapa)
  x.fillStyle = rgba(corEl2d(s.el), .1 + .06 * Math.sin(t * 2)); x.fillRect(0, 0, W, W);
  // vinheta comum
  const g = x.createRadialGradient(W / 2, W / 2, W * .25, W / 2, W / 2, W * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.4)'); x.fillStyle = g; x.fillRect(0, 0, W, W);
}
const chuva2d = (x, W, t, n, cor, vel, ang = .25, comp = .07, larg = 1) => { x.strokeStyle = cor; x.lineWidth = larg * 2.2 * W / 200; for (let i = 0; i < n; i++) { const a = (i * 97.13) % 1, b = (i * 57.31) % 1, y = ((b + t * vel * (.8 + a * .4)) % 1) * W * 1.2 - W * .1, xx = a * W * 1.2 - W * .1 + y * ang; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx - comp * W * ang, y - comp * W); x.stroke(); } };
const aneis2d = (x, W, t, cor, n = 3, vel = 1) => { for (let i = 0; i < n; i++) { const k = ((t * vel * .3 + i / n) % 1); x.strokeStyle = rgba(cor, (1 - k) * .8); x.lineWidth = W * .012; x.beginPath(); x.arc(W / 2, W / 2, k * W * .48, 0, TAU); x.stroke(); } };
const pontos2d = (x, W, t, n, cor, tam, mov) => { x.fillStyle = cor; for (let i = 0; i < n; i++) { const p = mov(i, t); x.beginPath(); x.arc(p[0] * W, p[1] * W, tam * W, 0, TAU); x.fill(); } };
const liquido2d = (x, W, t, nivel, cor, op = .8) => { const y0 = W * (1 - nivel); x.fillStyle = rgba(cor, op); x.beginPath(); x.moveTo(0, W); for (let i = 0; i <= 24; i++) x.lineTo(i / 24 * W, y0 + Math.sin(i * .9 + t * 2) * W * .012); x.lineTo(W, W); x.fill(); x.strokeStyle = rgba(misturar(cor, '#ffffff', .4), .7); x.lineWidth = W * .008; x.beginPath(); for (let i = 0; i <= 24; i++) x.lineTo(i / 24 * W, y0 + Math.sin(i * .9 + t * 2) * W * .012); x.stroke(); };
const D2FN = {
  chuva(x, W, t, st, s, cor) { x.fillStyle = rgba(misturar(cor, '#000000', .45), .6); x.fillRect(0, 0, W, W); chuva2d(x, W, t, s.viscosidade > .7 ? 50 : 110, rgba(misturar(cor, '#ffffff', .3), .95), s.viscosidade > .7 ? .12 : .9, .2, s.viscosidade > .7 ? .02 : .07, s.viscosidade > .7 ? 3 : 1.2); for (let i = 0; i < 6; i++) { const k = (t * .8 + i / 6) % 1, px = ((i * 37) % 10) / 10 * W, py = ((i * 61) % 10) / 10 * W; x.strokeStyle = rgba(cor, 1 - k); x.lineWidth = W * .006; x.beginPath(); x.ellipse(px, py, k * W * .05, k * W * .03, 0, 0, TAU); x.stroke(); } if ((s.extras || []).includes('trechos')) trechos2d(x, W, st); },
  mare(x, W, t, st, s, cor) { const v = s.variante, n = v === 'brejo' ? .55 : v === 'piscina' ? .6 : s.fixo ? .5 : .1 + .8 * Math.max(st.kRod, .05); if (v === 'brejo') { x.fillStyle = 'rgba(40,46,34,.6)'; x.fillRect(0, 0, W, W); } liquido2d(x, W, t, n, cor, v === 'piscina' ? .55 : .85); if (v === 'brejo') pontos2d(x, W, t, 30, 'rgba(200,210,190,.18)', .06, (i, tt) => [((i * .37 + tt * .01) % 1), ((i * .61) % 1)]); if (v === 'piscina') { const k = st.kProg; x.fillStyle = '#e8641c'; x.fillRect(W * (.15 + .6 * k), W * .45 + Math.sin(t * 2) * W * .02, W * .14, W * .08); chuva2d(x, W, t, 60, 'rgba(200,220,240,.6)', .9); } if (s.corpos) for (let i = 0; i < Math.round(3 + st.kRod * 6); i++) { x.fillStyle = '#d9661f'; x.save(); x.translate(((i * .29) % 1) * W, W * (1 - n * .5) + Math.sin(t + i) * 3); x.rotate(i); x.fillRect(-W * .03, -W * .01, W * .06, W * .02); x.restore(); } },
  paredes(x, W, t, st, s, cor) { const carne = (s.material || 'carne') === 'carne', d = (s.fecha ?? 6.2) / 20 * Math.max(st.kRod, .02) * W + Math.sin(t * .5) * W * .006; if (!carne) { x.strokeStyle = 'rgba(160,200,255,.35)'; x.lineWidth = 1; const L = W * .6, o = W * .2; for (let i = 0; i <= 5; i++) { x.beginPath(); x.moveTo(o + i * L / 5, o); x.lineTo(o + i * L / 5, o + L); x.stroke(); x.beginPath(); x.moveTo(o, o + i * L / 5); x.lineTo(o + L, o + i * L / 5); x.stroke(); } const rr = aleatorio(s.semente + st.rod * 17); for (let i = 0; i < 25; i++) if (rr() < .25 + .25 * st.kRod) { x.fillStyle = `rgba(80,170,255,${.4 + Math.random() * .4})`; x.fillRect(o + (i % 5) * L / 5 + 2, o + Math.floor(i / 5) * L / 5 + 2, L / 5 - 4, L / 5 - 4); } } const c1 = carne ? '#7a1c20' : '#5d646b'; [0, 1].forEach(k => { const gx = k ? W - d : 0; const g = x.createLinearGradient(k ? W : 0, 0, k ? W - d : d, 0); g.addColorStop(0, misturar(c1, '#000000', .3)); g.addColorStop(1, c1); x.fillStyle = g; x.fillRect(gx, 0, d, W); x.fillStyle = carne ? 'rgba(255,120,120,.6)' : 'rgba(220,230,240,.6)'; x.fillRect(k ? W - d : d - W * .01, 0, W * .01, W); }); },
  labirinto(x, W, t, st, s, cor) { x.fillStyle = 'rgba(10,10,12,.5)'; x.fillRect(0, 0, W, W); x.strokeStyle = rgba(misturar(s.paredeCor || '#9a948a', '#ffffff', .2), .9); x.lineWidth = W * .022; x.lineCap = 'square'; if (s.variante === 'espiral') { gerarEspiral(s.semente, s.muda ? st.rod : 1).forEach(A => { const R = A.R / 20 * W; x.beginPath(); x.arc(W / 2, W / 2, R, A.gap + A.larg, A.gap - A.larg + TAU); x.stroke(); }); } else { const N = 7, M = gerarLabirinto(N, s.semente + (s.muda ? st.rod * 101 : 0)), c0 = W / N; for (let i = 0; i < N - 1; i++) for (let j = 0; j < N; j++) if (M.v[i][j]) { x.beginPath(); x.moveTo((i + 1) * c0, j * c0); x.lineTo((i + 1) * c0, (j + 1) * c0); x.stroke(); } for (let i = 0; i < N; i++) for (let j = 0; j < N - 1; j++) if (M.h[i][j]) { x.beginPath(); x.moveTo(i * c0, (j + 1) * c0); x.lineTo((i + 1) * c0, (j + 1) * c0); x.stroke(); } if (s.circulos) { const on = Math.round(st.kProg * 3); [[.5, .5], [6.5, .5], [3.5, 6.5]].forEach(([i, j], k) => { x.strokeStyle = k < on ? `rgba(255,224,138,${.7 + Math.sin(t * 3) * .3})` : 'rgba(240,232,208,.35)'; x.lineWidth = W * .01; x.beginPath(); x.arc(i * c0, j * c0, c0 * .3, 0, TAU); x.stroke(); }); } } },
  zonas(x, W, t, st, s, cor) { x.fillStyle = rgba(cor, .15); x.fillRect(0, 0, W, W); aneis2d(x, W, t, s.zonaCor || cor, 3, 1 + st.kRod * 3); x.fillStyle = rgba(s.zonaCor || cor, .5 + .4 * Math.sin(t * (3 + st.kRod * 6))); x.beginPath(); x.arc(W / 2, W / 2, W * .05, 0, TAU); x.fill(); },
  contagem(x, W, t, st, s) { D2FN.zonas(x, W, t, st, { ...s, zonaCor: '#ff2a1a' }, '#ff2a1a'); const n = Math.max(0, Math.round(numero(s.contagem, st.rodMax)) - st.rod); x.fillStyle = '#33ff66'; x.font = `bold ${W * .16}px monospace`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n).padStart(2, '0'), W / 2, W * .4); },
  ciclone(x, W, t, st, s, cor) { x.fillStyle = rgba(cor, .12); x.fillRect(0, 0, W, W); const k = .6 + st.kRod; for (let i = 0; i < 160; i++) { const R = (.08 + ((i * .618) % 1) * .38) * W, a = i * 2.4 + t * k * 2.5 / (.4 + R / W * 3); x.fillStyle = i % 3 ? rgba(cor, .9) : 'rgba(230,244,255,.9)'; x.fillRect(W / 2 + Math.cos(a) * R, W / 2 + Math.sin(a) * R, W * .012, W * .012); } x.fillStyle = '#fff'; x.beginPath(); x.arc(W / 2, W / 2, W * .025 * (1 + Math.sin(t * 3) * .2), 0, TAU); x.fill(); },
  horda(x, W, t, st, s) { if (s.predio !== false) { x.fillStyle = '#3e3832'; x.fillRect(W * .15, 0, W * .7, W * .22); for (let i = 0; i < 6; i++) { x.fillStyle = Math.sin(t * 2 + i * 3) > .5 ? '#c89a4a' : '#1a1612'; x.fillRect(W * (.19 + i * .11), W * .06, W * .06, W * .1); } } const n = Math.round(140 * (1 - .85 * st.kProg)); pontos2d(x, W, t, n, 'rgba(20,14,10,.95)', .014, (i, tt) => { const a = i * 2.1 + tt * (.3 + (i % 5) * .1), R = .1 + (i % 9) * .035; return [.5 + Math.cos(a) * R + Math.sin(tt * 3 + i) * .01, .52 + Math.sin(a * 1.3) * R * .8]; }); pontos2d(x, W, t, n, 'rgba(255,90,60,.5)', .004, (i, tt) => { const a = i * 2.1 + tt * (.3 + (i % 5) * .1), R = .1 + (i % 9) * .035; return [.5 + Math.cos(a) * R + Math.sin(tt * 3 + i) * .01, .52 + Math.sin(a * 1.3) * R * .8 - .008]; }); },
  deserto(x, W, t, st, s, cor) { x.fillStyle = rgba(cor, .45); x.fillRect(0, 0, W, W); x.strokeStyle = rgba(misturar(cor, '#000000', .3), .5); x.lineWidth = W * .01; for (let k = 0; k < 6; k++) { x.beginPath(); for (let i = 0; i <= 20; i++) x.lineTo(i / 20 * W, (k + .5) / 6 * W + Math.sin(i * .8 + k) * W * .02); x.stroke(); } const vidro = s.variante !== 'branco'; for (let i = 0; i < 90; i++) { const a = (i * .618) % 1, b = (i * .377) % 1, px = ((a + t * (.5 + b * .4)) % 1) * W, py = b * W; x.fillStyle = vidro ? `rgba(240,248,255,${.4 + .6 * Math.abs(Math.sin(t * 5 + i))})` : rgba(misturar(cor, '#ffffff', .4), .8); x.fillRect(px, py, W * .03, W * .006); } if (!vidro) { x.fillStyle = `rgba(40,30,20,${.2 + .6 * st.kProg})`; x.font = `${W * .07}px serif`; x.textAlign = 'center'; x.fillText('ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ'.slice(0, 1 + Math.round(st.kProg * 10)), W / 2, W * .35); } },
  vento(x, W, t, st, s, cor) { D2FN.deserto(x, W, t, st, s, cor); },
  frio(x, W, t, st, s) { x.fillStyle = 'rgba(200,220,236,.35)'; x.fillRect(0, 0, W, W); pontos2d(x, W, t, 120, 'rgba(255,255,255,.9)', .006, (i, tt) => [((i * .618) + tt * (s.variante === 'artico' ? .25 : .03)) % 1, ((i * .377) + tt * .06) % 1]); if (s.variante !== 'artico') { x.fillStyle = 'rgba(240,246,250,.85)'; x.fillRect(0, 0, W, W * .25); x.fillStyle = 'rgba(160,190,210,.9)'; x.beginPath(); x.ellipse(W / 2 + Math.sin(t * .35) * W * .01, W * .22, W * .28, W * .07, 0, 0, TAU); x.fill(); } },
  desabamento(x, W, t, st) { x.fillStyle = 'rgba(60,54,48,.4)'; x.fillRect(0, 0, W, W); const r = aleatorio(7); x.strokeStyle = 'rgba(0,0,0,.85)'; x.lineWidth = W * .008; for (let k = 0; k < 5; k++) { let px = W / 2 + (r() - .5) * W * .5, py = W / 2 + (r() - .5) * W * .5, an = r() * TAU; x.beginPath(); x.moveTo(px, py); const n = Math.round(4 + st.kRod * 14); for (let i = 0; i < n; i++) { an += (r() - .5) * .8; px += Math.cos(an) * W * .03; py += Math.sin(an) * W * .03; x.lineTo(px, py); } x.stroke(); } const n = Math.round(10 + st.kRod * 30); for (let i = 0; i < n; i++) { x.fillStyle = 'rgba(110,104,96,.95)'; x.fillRect(((i * .618) % 1) * W, ((i * .377) % 1) * W, W * .03, W * .03); } const k = (t * .7) % 1; x.fillStyle = `rgba(200,190,170,${(1 - k) * .5})`; x.beginPath(); x.arc(W * .5, W * .5, k * W * .4, 0, TAU); x.fill(); },
  campo(x, W, t, st, s) { const k = st.rod > 1 || st.kProg > 0 ? 1 : 0, pul = Math.pow(Math.max(0, Math.sin(t * 5.6)), 10) * k; x.fillStyle = rgba(misturar(s.cor || '#8a8a84', s.cor2 || '#a0101a', k), .45 + pul * .25); x.fillRect(0, 0, W, W); x.strokeStyle = rgba(misturar('#9a9a94', '#d0202a', k), .8); x.lineWidth = W * .005; for (let i = 0; i < 160; i++) { const a = (i * .618) % 1, b = (i * .377) % 1; x.beginPath(); x.moveTo(a * W, b * W); x.lineTo(a * W + Math.sin(t * 1.6 + i) * W * .01, b * W - W * .03); x.stroke(); } x.fillStyle = '#8a0a14'; x.beginPath(); x.arc(W * .5, W * .15, W * .04 * (1 + pul * .2), 0, TAU); x.fill(); },
  floresta(x, W, t, st, s) { x.fillStyle = 'rgba(12,14,16,.55)'; x.fillRect(0, 0, W, W); x.strokeStyle = 'rgba(120,96,70,.9)'; x.lineWidth = W * .05; x.beginPath(); x.moveTo(W * .5, W); x.bezierCurveTo(W * .2, W * .7, W * .8, W * .35, W * .5, 0); x.stroke(); const r = aleatorio(s.semente); for (let i = 0; i < 16; i++) { const px = r() * W, py = r() * W; if (Math.abs(px - W / 2) < W * .15) continue; x.fillStyle = '#3a2c22'; x.beginPath(); x.arc(px, py, W * .03 * (1 + Math.sin(t * .7 + i) * .05), 0, TAU); x.fill(); if (i < st.kRod * 16) { x.fillStyle = 'rgba(255,233,176,.9)'; x.fillRect(px - 2, py - 1, 1.5, 1.5); x.fillRect(px + 1, py - 1, 1.5, 1.5); } } },
  poco(x, W, t, st, s, cor) { x.fillStyle = 'rgba(60,58,56,.5)'; x.fillRect(0, 0, W, W); const R = W * .32 * (1 + Math.sin(t * .55) * .02); x.fillStyle = rgba(cor, .95); x.beginPath(); x.arc(W / 2, W / 2, R, 0, TAU); x.fill(); x.strokeStyle = '#8a8680'; x.lineWidth = W * .025; x.stroke(); aneis2d(x, W * .7, t, cor, 2, .5); },
  ampulheta(x, W, t, st) { x.fillStyle = 'rgba(140,140,146,.35)'; x.fillRect(0, 0, W, W); const k = 1 - st.kRod; x.fillStyle = '#c8a040'; x.fillRect(W * .4, W * .2, W * .2, W * .02); x.fillRect(W * .4, W * .78, W * .2, W * .02); x.strokeStyle = 'rgba(220,240,250,.8)'; x.lineWidth = W * .008; x.beginPath(); x.moveTo(W * .42, W * .22); x.lineTo(W * .5, W * .5); x.lineTo(W * .58, W * .22); x.moveTo(W * .42, W * .78); x.lineTo(W * .5, W * .5); x.lineTo(W * .58, W * .78); x.stroke(); x.fillStyle = '#d8d8e0'; const ht = W * .26 * k; x.beginPath(); x.moveTo(W * .5, W * .5); x.lineTo(W * .5 - ht * .3, W * .5 - ht); x.lineTo(W * .5 + ht * .3, W * .5 - ht); x.fill(); const hb = W * .26 * (1 - k); x.beginPath(); x.moveTo(W * .5 - hb * .35, W * .78); x.lineTo(W * .5, W * .78 - hb); x.lineTo(W * .5 + hb * .35, W * .78); x.fill(); if (k > .01) { x.fillRect(W * .498, W * .5, W * .004, W * .28 - hb); } },
  navio(x, W, t, st) { x.fillStyle = 'rgba(58,42,28,.5)'; x.fillRect(0, 0, W, W); x.strokeStyle = 'rgba(30,20,10,.6)'; x.lineWidth = 1; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(0, i / 12 * W); x.lineTo(W, i / 12 * W); x.stroke(); } x.save(); x.translate(W / 2, W / 2); x.rotate(.05); x.translate(-W / 2, -W / 2); liquido2d(x, W, t, .1 + .8 * Math.max(st.kRod, .04), '#0b3a40', .75); x.restore(); },
  biblioteca(x, W, t, st, s) { x.fillStyle = 'rgba(40,28,18,.5)'; x.fillRect(0, 0, W, W); [.09, .19, .29, .71, .81, .91].forEach((k, i) => { x.save(); x.translate(k * W, W / 2); if (s.variante === 'ruinas') x.rotate(st.kRod * .06 * Math.sin(i) + Math.sin(t * .6 + i) * .01); x.fillStyle = s.variante === 'ruinas' ? '#2a1a0e' : '#3a3e42'; x.fillRect(-W * .025, -W * .42, W * .05, W * .84); x.restore(); }); pontos2d(x, W, t, Math.round(20 + 60 * Math.max(st.kProg, st.kRod * .6)), 'rgba(244,231,200,.85)', .006, (i, tt) => [.5 + Math.sin(tt * .5 + i) * .18, .5 + Math.cos(tt * .4 + i * 1.7) * .3]); },
  arquivo(x, W, t, st) { x.fillStyle = 'rgba(30,30,30,.55)'; x.fillRect(0, 0, W, W); x.fillStyle = '#7a8086'; x.fillRect(0, 0, W, W * .07); x.fillRect(0, W * .93, W, W * .07); x.fillRect(0, 0, W * .07, W); x.fillRect(W * .93, 0, W * .07, W); const a = Math.sin(t * .7) * .14, cx = W / 2 + Math.sin(a) * W * .2; const g = x.createRadialGradient(cx, W / 2, 0, cx, W / 2, W * .35); g.addColorStop(0, 'rgba(255,232,192,.5)'); g.addColorStop(1, 'rgba(255,232,192,0)'); x.fillStyle = g; x.fillRect(0, 0, W, W); for (let i = 0; i < 4; i++) { x.fillStyle = i < Math.round(st.kProg * 4) ? '#ff9a30' : 'rgba(255,154,48,.15)'; x.fillRect(W * (.38 + i * .07), W * .12, W * .05, W * .06); } },
  vazio(x, W, t, st, s, cor) { const branca = s.variante === 'branca', pis = Math.sin(t * .5) > .97; x.fillStyle = branca ? (pis ? 'rgba(0,0,0,.6)' : 'rgba(255,255,255,.55)') : rgba(cor, .2); x.fillRect(0, 0, W, W); if (!branca) pontos2d(x, W, t, 40, rgba(misturar(cor, '#ffffff', .3), .7), .006, (i, tt) => [((i * .618) + Math.sin(tt * .3 + i) * .05) % 1, ((i * .377) + Math.cos(tt * .2 + i) * .05) % 1]); },
  julgamento(x, W, t, st, s) { const ca = s.cor || '#d8c86a', cb = s.cor2 || '#8a1018', pul = Math.pow(Math.max(0, Math.sin(t * 1.9)), 4); x.fillStyle = rgba(ca, .5); x.fillRect(0, 0, W / 2, W); x.fillStyle = rgba(cb, .5 + pul * .3); x.fillRect(W / 2, 0, W / 2, W); const rr = aleatorio(s.semente + st.rod * 37), lado = rr() < .5 ? -1 : 1, ang = lado * (1 - st.kProg) * .25 + Math.sin(t * .6) * .03 * (1 - st.kProg); x.save(); x.translate(W / 2, W / 2); x.rotate(ang); x.fillStyle = '#8a847a'; x.fillRect(-W * .38, -W * .012, W * .76, W * .024); x.restore(); [-1, 1].forEach(k => { x.fillStyle = '#9a948a'; x.beginPath(); x.arc(W / 2 + k * W * .32, W / 2 + k * Math.sin(ang) * W * .32, W * .1, 0, TAU); x.fill(); }); x.fillStyle = '#a8a298'; x.beginPath(); x.arc(W / 2, W / 2, W * .15, 0, TAU); x.fill(); x.fillStyle = 'rgba(250,246,230,.8)'; x.beginPath(); x.ellipse(W * .25, W * .2, W * .07, W * .09, 0, 0, TAU); x.fill(); },
  laboratorio(x, W, t, st, s) { x.fillStyle = 'rgba(30,32,36,.55)'; x.fillRect(0, 0, W, W); const cs = ['#c2272f', '#2a2a2a', '#d9a514', '#8a3fd1', '#e9e4f2'], rr = aleatorio(s.semente + st.rod * 53), esc = Math.floor(rr() * 6), cor = cs[Math.floor(rr() * 5)]; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .4, px = W / 2 + Math.cos(a) * W * .28, py = W / 2 + Math.sin(a) * W * .28; x.strokeStyle = 'rgba(200,230,240,.6)'; x.lineWidth = W * .008; x.beginPath(); x.arc(px, py, W * .045, 0, TAU); x.stroke(); if (i === esc) { x.fillStyle = rgba(cor, .5 + Math.sin(t * 8) * .3); x.fill(); } } x.fillStyle = '#3a2a20'; x.fillRect(W * .47, W * .45, W * .06, W * .1); },
  teatro(x, W, t, st, s) { x.fillStyle = 'rgba(40,8,14,.55)'; x.fillRect(0, 0, W, W); x.fillStyle = '#3a2410'; x.fillRect(0, 0, W, W * .2); x.fillStyle = s.cortina || '#b8901a'; x.fillRect(0, 0, W * .12, W * .2); x.fillRect(W * .88, 0, W * .12, W * .2); const g = x.createRadialGradient(W / 2, W * .1, 0, W / 2, W * .1, W * .1); g.addColorStop(0, 'rgba(255,244,216,.9)'); g.addColorStop(1, 'rgba(255,244,216,0)'); x.fillStyle = g; x.fillRect(0, 0, W, W * .25); for (let j = 0; j < 7; j++) for (let i = 0; i < 12; i++) { if (i === 5 || i === 6) continue; x.fillStyle = '#f2efe6'; x.beginPath(); x.arc(W * (.06 + i * .08), W * (.32 + j * .09), W * .015, 0, TAU); x.fill(); } },
  quarto(x, W, t, st) { x.fillStyle = 'rgba(216,228,236,.35)'; x.fillRect(0, 0, W, W); x.fillStyle = '#d8c0a0'; x.fillRect(W * .44, W * .46, W * .12, W * .08); x.strokeStyle = 'rgba(244,242,238,.7)'; x.lineWidth = W * .006; x.beginPath(); x.arc(W / 2, W / 2, W * .09, 0, TAU); x.stroke(); for (let i = 0; i < 4; i++) { const a = t * .35 + i * PI / 2; x.fillStyle = ['#f2c8d0', '#c8e0f2', '#f2e8b0', '#d0f0c8'][i]; x.beginPath(); x.arc(W / 2 + Math.cos(a) * W * .05, W / 2 + Math.sin(a) * W * .05, W * .012, 0, TAU); x.fill(); } const ch = 1 - st.kProg; if (Math.sin(t * .7) > 0) { x.strokeStyle = `rgba(255,255,255,${.4 * ch})`; for (let k = 1; k <= 3; k++) { x.beginPath(); x.arc(W / 2, W / 2, W * (.1 + k * .04 + ((t * .5) % .04)), -.6, .6); x.stroke(); } } },
  hospital(x, W, t, st, s) { x.fillStyle = 'rgba(200,210,206,.3)'; x.fillRect(0, 0, W, W); if (s.variante === 'espera') { for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { x.fillStyle = '#2e86de'; x.fillRect(W * (.15 + i * .12), W * (.4 + j * .12), W * .08, W * .05); } x.fillStyle = '#050000'; x.fillRect(W * .55, W * .08, W * .3, W * .1); x.fillStyle = '#ff3a1a'; x.font = `bold ${W * .07}px monospace`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String((s.semente % 40 + st.rod * 7) % 100).padStart(2, '0'), W * .7, W * .13); } else { x.strokeStyle = '#222'; x.fillStyle = '#f0ece0'; x.lineWidth = W * .01; x.beginPath(); x.arc(W / 2, W / 2, W * .18, 0, TAU); x.fill(); x.stroke(); const a = PI * .75 + st.kProg * PI * 1.5; x.strokeStyle = '#b00000'; x.lineWidth = W * .012; x.beginPath(); x.moveTo(W / 2, W / 2); x.lineTo(W / 2 + Math.cos(a) * W * .15, W / 2 + Math.sin(a) * W * .15); x.stroke(); } },
  banquete(x, W, t, st, s) { x.fillStyle = 'rgba(40,20,14,.5)'; x.fillRect(0, 0, W, W); x.fillStyle = '#ece6d6'; x.fillRect(W * .44, W * .2, W * .12, W * .6); const n = Math.max(3, (st.nPart || 4) + 1), vaz = Math.round(st.kProg * n); for (let i = 0; i < n; i++) { const lado = i % 2 ? 1 : -1, k = Math.floor(i / 2); x.fillStyle = i < vaz ? '#f4f2ec' : '#c8ccd2'; x.beginPath(); x.arc(W * (.5 + lado * .03), W * (.25 + k * .12), W * .02, 0, TAU); x.fill(); } for (let k = 0; k < 3; k++) { x.fillStyle = `rgba(255,204,102,${.6 + Math.sin(t * 11 + k) * .3})`; x.beginPath(); x.arc(W * .5, W * (.3 + k * .2), W * .012, 0, TAU); x.fill(); } },
  bar(x, W, t, st) { const k = lim(st.kRod * 1.2); x.fillStyle = rgba(misturar('#ffc080', '#ff1810', k), .3 + (k > .5 && Math.sin(t * 7.3) > .93 ? -.2 : 0)); x.fillRect(0, 0, W, W); x.fillStyle = '#4a2a16'; x.fillRect(W * .15, W * .06, W * .7, W * .08); for (let i = 0; i < 5; i++) { x.fillStyle = '#3a3c40'; x.beginPath(); x.arc(W * (.2 + i * .15), W * (.5 + (i % 2) * .2), W * .04, 0, TAU); x.fill(); } x.fillStyle = `hsl(${(t * 18) % 360},80%,55%)`; x.fillRect(W * .86, W * .8, W * .07, W * .1); },
  parquinho(x, W, t) { const cs = ['#e85a4a', '#4ab0e8', '#f2c84a', '#5ac87a']; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { x.fillStyle = rgba(cs[(i + j * 3) % 4], .3); x.fillRect(i * W / 8, j * W / 8, W / 8, W / 8); } x.fillStyle = '#e8443a'; x.fillRect(W * .2, W * .15, W * .08, W * .25); x.save(); x.translate(W * .7, W * .3); x.rotate(Math.sin(t * .9) * .2); x.fillStyle = '#3aa0e8'; x.fillRect(-W * .12, -W * .01, W * .24, W * .02); x.restore(); },
  roleta(x, W, t, st) { x.fillStyle = 'rgba(90,10,18,.45)'; x.fillRect(0, 0, W, W); x.save(); x.translate(W / 2, W / 2); x.rotate(t * .4); for (let i = 0; i < 37; i++) { x.fillStyle = i === 0 ? '#1a7a3a' : i % 2 ? '#b01818' : '#141414'; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, W * .3, i / 37 * TAU, (i + 1) / 37 * TAU); x.fill(); } x.fillStyle = '#4a2c14'; x.beginPath(); x.arc(0, 0, W * .2, 0, TAU); x.fill(); x.restore(); const a = -t * 1.1; x.fillStyle = '#fff'; x.beginPath(); x.arc(W / 2 + Math.cos(a) * W * .27, W / 2 + Math.sin(a) * W * .27, W * .015, 0, TAU); x.fill(); x.fillStyle = '#c81818'; for (let i = 0; i < Math.round(st.kProg * 10); i++) x.fillRect(W * .82, W * (.9 - i * .025), W * .06, W * .02); },
  fogo(x, W, t, st, s, cor) { x.fillStyle = 'rgba(30,10,4,.5)'; x.fillRect(0, 0, W, W); pontos2d(x, W, t, 80, rgba(cor, .9), .008, (i, tt) => { const a = (i * .618) % 1; const side = i % 4; const k = ((tt * .5 + a) % 1); return side === 0 ? [a, k * .1] : side === 1 ? [a, 1 - k * .1] : side === 2 ? [k * .1, a] : [1 - k * .1, a]; }); },
};
function trechos2d(x, W, st) { const n = Math.min(9, Math.max(3, st.need)), feitos = Math.round(st.kProg * n); for (let i = 1; i <= n; i++) { x.fillStyle = i <= feitos ? 'rgba(200,255,230,.95)' : 'rgba(200,255,230,.25)'; x.beginPath(); x.arc(W * (.1 + .8 * i / (n + 1)), W * .5 + Math.sin(i * 1.3) * W * .12, W * .018, 0, TAU); x.fill(); } }

/* ---------- ligações do 2.5D ---------- */
function ligar2d() {
  const A = window.ACF;
  if (!A || !A.aoMudar) { setTimeout(ligar2d, 400); return; }
  let ag = false;
  A.aoMudar(() => { if (ag) return; ag = true; requestAnimationFrame(() => { ag = false; sinc2d(); }); });
  // o mapa é redesenhado inteiro (montarAndar): acompanha o palco para recolocar a camada
  const vigiar = () => {
    const st = document.querySelector('.stage');
    if (st && st !== D2.stage) { if (D2.obs) D2.obs.disconnect(); D2.stage = st; D2.obs = new MutationObserver(() => { if (D2.el && !D2.el.isConnected) sinc2d(); else if (!D2.el && window.ACF && (window.ACF.estado.expo || {}).on) sinc2d(); }); D2.obs.observe(st, { childList: true }); }
  };
  vigiar(); setInterval(vigiar, 3000);
  ['acf-perfil', 'acf-ativa', 'acf-segredos'].forEach(ev => document.addEventListener(ev, () => setTimeout(sinc2d, 80)));
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', sinc2d); } catch (e) {}
  setTimeout(sinc2d, 600);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar2d); else ligar2d();

NS.expo3d = { montar, lerEstado, cenaDe, gerarLabirinto, gerarEspiral, bases: Object.keys(BASES), extras: Object.keys(EXTRAS), sinc2d };
})();
