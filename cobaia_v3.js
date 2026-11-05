/* cobaia_v3.js (montar_cobaia_v3.js do agente das cobaias, sem mudanças de lógica): cobaias no estilo V3 (low-poly pintado, ESTILO_HUMANOS.md) a partir de cobaia_v3.glb +
   anim_humanoide.glb. Mesma API do montar_cobaia.js (window.CobaiaV3): carregar, montar, inst.tocar/definir/atualizar.
   Diferenças da V2: TUDO numa malha só (corpo, roupas, cabelo e peças exclusivas: 1 chamada), duas texturas com filtro
   Nearest (cor + dados), sem mapa de normais; peças exclusivas vêm no mesmo arquivo (nomes x_<aparência>_<peça>).
   Texto abaixo herdado da V2:
   (+ cobaia_x_<aparencia>.glb, as peças exclusivas, carregado só quando essa aparência está na sessão).
   Referência para o agente de infraestrutura (não altera o site). Uso:
     const base = await CobaiaV2.carregar(THREE, 'modelos/v2/cobaia_base.glb', 'modelos/v2/anim_humanoide.glb', meshoptDecoder);
     const c = CobaiaV2.montar(THREE, base, { pecas: ['camiseta','calca','tenis','cinto','cab_baguncado'], tintas: { pele: '#d9a88a', ... } });
     cena.add(c.grupo); c.tocar('andar'); ... c.atualizar(dt, distanciaDaCamera);
     // com peças exclusivas: const x = await CobaiaV2.carregarExtras(THREE, base, 'modelos/v2/cobaia_x_faca.glb', meshoptDecoder);
     //                         CobaiaV2.montar(THREE, base, { ...preset, extras: x });
   Desenho: 2 chamadas por cobaia (corpo + roupas + acessórios numa malha só; cabelo à parte, recorte alfa), 3 com extras.
   Rodada 2: a malha foi ligada com os braços baixos (10 graus da vertical), mas os nós dos ossos trazem a pose A
   padrão, então os clipes do pacote valem como antes. A translação da pelve dos clipes é escalada para o quadril
   da cobaia (0,910 m, V1) e as poses fixas da V1 (pose_faca, pose_sabonete, pose_papel) sobrepõem braço e antebraço.
   O glb traz em asset.extras: peças, LODs, regiões, tintas, retângulos do atlas, tabela dos ossos e a quantização. */
(function () {
'use strict';
const SLOTS = ['pele', 'cabelo', 'iris', 'cima', 'baixo', 'sapato', 'acessorio', 'nenhuma'];
const PADRAO = {
  pecas: ['camiseta', 'calca', 'tenis', 'cinto', 'cab_baguncado'],
  morfos: { feminino: 0, forte: 0 },
  tintas: { pele: '#c99a7e', cabelo: '#3a2618', iris: '#4a5a6a', cima: '#e8650f', baixo: '#e0600e', sapato: '#e6e3da', acessorio: '#1c1b1d' },
  barba: 0, sardas: 0, sobrancelhas: 1, marca: 1, etiqueta: [0, 0, 6], ferimento: 0.0, sangueFresco: 0.3, olhosBrilho: 0,
  corBrilho: '#ffd84a',
};

/* ---------------- carregar ---------------- */
function carregarGLB(T, url, dec) {
  return new Promise((ok, falha) => { const l = new T.GLTFLoader(); if (dec) l.setMeshoptDecoder(dec); l.load(url, ok, undefined, falha); });
}
async function carregar(T, urlBase, urlAnim, dec) {
  const [g, a] = await Promise.all([carregarGLB(T, urlBase, dec), urlAnim ? carregarGLB(T, urlAnim, dec) : Promise.resolve(null)]);
  const meta = (g.parser.json.asset || {}).extras || {};
  const malhas = {}; let pele = null;
  g.scene.traverse(o => { if (o.isSkinnedMesh) { malhas[o.name] = o; pele = pele || o; } });
  const q = meta.quantizacao;
  // matrizes inversas em metros (o arquivo tem posição quantizada: IBM' = IBM * T)
  const Tq = new T.Matrix4().makeScale(q.escala[0], q.escala[1], q.escala[2]).setPosition(q.desloc[0], q.desloc[1], q.desloc[2]);
  const Ti = Tq.clone().invert();
  const inversas = pele.skeleton.boneInverses.map(m => m.clone().multiply(Ti));
  const nomesOssos = pele.skeleton.bones.map(b => b.name);
  let raizEsq = pele.skeleton.bones[0]; while (raizEsq.parent && raizEsq.parent.isBone) raizEsq = raizEsq.parent;
  const clipes = {}; const kq = (meta.quadril || 0.965) / 0.965;     // pelve dos clipes (padrão 0,965 m) -> quadril da cobaia
  (a ? a.animations : []).forEach(c => {
    if (kq !== 1) { c = c.clone(); c.tracks.forEach(t => { if (/pelve\.position$/.test(t.name)) for (let i = 0; i < t.values.length; i++) t.values[i] *= kq; }); }
    clipes[c.name] = c;
  });
  const poses = {};      // poses fixas da V1: nome do osso -> quaternion (só braço/antebraço)
  (g.animations || []).forEach(c => { if (!/^pose_/.test(c.name)) return; const p = {};
    c.tracks.forEach(t => { if (/\.quaternion$/.test(t.name)) p[t.name.replace(/\.quaternion$/, '')] = new T.Quaternion().fromArray(t.values, 0); });
    poses[c.name] = p; });
  const matCob = Object.values(malhas)[0].material, matCab = matCob;
  [matCob.map, matCob.roughnessMap].forEach(t => { if (t) { t.magFilter = T.NearestFilter; t.minFilter = T.NearestMipmapLinearFilter; t.needsUpdate = true; } });
  return { T, meta, malhas, inversas, nomesOssos, raizEsq, clipes, poses, matCob, matCab, cache: new Map() };
}
// peças exclusivas de uma aparência (arquivo próprio, mesmo esqueleto e mesma ligação; posição quantizada no volume dele)
async function carregarExtras(T, base, url, dec) {
  const g = await carregarGLB(T, url, dec);
  const meta = (g.parser.json.asset || {}).extras || {};
  const malhas = {}; let pele = null;
  g.scene.traverse(o => { if (o.isSkinnedMesh) { malhas[o.name] = o; pele = pele || o; } });
  const nomes = pele.skeleton.bones.map(b => b.name);
  const remapa = nomes.map(n => base.nomesOssos.indexOf(n));      // índice do osso neste arquivo -> índice no base
  const mat = Object.values(malhas)[0].material;
  return { meta, malhas, remapa, mat, chave: url };
}

/* ---------------- morfos (mesma regra do Blender, e03c_montar.py: deslocamento pelos pesos dos ossos) ---------------- */
function morfoDelta(meta, nome, P, out) {
  // P e out em coordenadas do Blender (x, y = trás, z = cima)
  const OS = meta.__osB || (meta.__osB = Object.fromEntries(Object.entries(meta.ossos).map(([n, [a, b]]) => [n, [[a[0], -a[2], a[1]], [b[0], -b[2], b[1]]]])));
  return (osso, w) => {
    if (w < 1e-4 || !OS[osso]) return;
    const L = osso.endsWith('_e') ? 1 : osso.endsWith('_d') ? -1 : 0;
    const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    const rad = (n, s) => { const [a, b] = OS[n]; const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
      let t = ((P[0] - a[0]) * ab[0] + (P[1] - a[1]) * ab[1] + (P[2] - a[2]) * ab[2]) / l2; t = Math.min(1, Math.max(0, t));
      for (let k = 0; k < 3; k++) out[k] += w * (P[k] - (a[k] + t * ab[k])) * (s - 1); };
    const cadeia = /^(braco|antebraco|mao|indicador|medio|anelar|minimo|polegar)/.test(osso);
    const maoS = (s) => { const wr = OS['mao_' + osso.slice(-1)][0]; for (let k = 0; k < 3; k++) out[k] += w * (P[k] - wr[k]) * (s - 1); };
    if (nome === 'feminino') {
      if (osso.startsWith('braco')) rad(osso, 0.86);
      if (osso.startsWith('antebraco')) rad(osso, 0.88);
      if (/^(mao|indicador|medio|anelar|minimo|polegar)/.test(osso)) maoS(0.9);
      if (cadeia) out[0] += w * -L * 0.023;          // ombros da V1 feminina: 0,158 contra 0,182
      if (osso.startsWith('clavicula')) out[0] += w * -L * 0.009 * ss(0.03, 0.15, Math.abs(P[0]));
      if (osso === 'peito') {
        out[0] += w * P[0] * (0.92 - 1);
        for (const x of [-1, 1]) { const g = Math.exp(-(((P[0] - x * 0.062) / 0.05) ** 2 + ((P[2] - 1.305) / 0.055) ** 2)) * (P[1] < 0 ? 1 : 0); out[1] += w * -0.03 * g; out[2] += w * -0.006 * g; }
      }
      if (osso === 'coluna1' || osso === 'coluna2') { out[0] += w * P[0] * (0.88 - 1); out[1] += w * (P[1] - 0.01) * (0.95 - 1); }
      if (osso === 'pelve') { out[0] += w * P[0] * 0.11 * ss(1.05, 0.95, P[2]); out[1] += w * 0.014 * (P[1] > 0.02 ? 1 : 0) * ss(1.05, 0.95, P[2]); }
      if (osso.startsWith('coxa')) { rad(osso, 0.93); out[0] += w * L * 0.006; }
      if (osso.startsWith('canela')) rad(osso, 0.9);
      if (osso === 'pescoco') rad(osso, 0.86);
      if (osso === 'cabeca' || osso === 'mandibula') {
        const m = ss(1.62, 1.56, P[2]); out[0] += w * P[0] * (0.93 - 1) * m;
        out[1] += w * 0.006 * Math.exp(-((P[0] / 0.015) ** 2 + ((P[1] + 0.1) / 0.02) ** 2 + ((P[2] - 1.61) / 0.03) ** 2));
        out[1] += w * 0.003 * Math.exp(-(((P[2] - 1.664) / 0.008) ** 2)) * (P[1] < -0.06 ? 1 : 0);
      }
    } else {
      if (osso.startsWith('braco')) rad(osso, 1.38);
      if (osso.startsWith('antebraco')) rad(osso, 1.3);
      if (/^(mao|indicador|medio|anelar|minimo|polegar)/.test(osso)) maoS(1.1);
      if (cadeia) out[0] += w * L * 0.029;
      if (osso.startsWith('clavicula')) { out[0] += w * L * 0.012 * ss(0.03, 0.15, Math.abs(P[0])); out[2] += w * 0.008; }
      if (osso === 'peito') { out[0] += w * P[0] * 0.12; out[1] += w * (P[1] - 0.01) * 0.16; }
      if (osso === 'coluna1' || osso === 'coluna2') { out[0] += w * P[0] * 0.09; out[1] += w * (P[1] - 0.01) * 0.08; }
      if (osso === 'pelve') out[0] += w * P[0] * 0.05;
      if (osso.startsWith('coxa')) rad(osso, 1.2);
      if (osso.startsWith('canela')) rad(osso, 1.13);
      if (osso === 'pescoco') rad(osso, 1.28);
      if (osso === 'cabeca' || osso === 'mandibula') out[0] += w * P[0] * 0.06 * ss(1.62, 1.54, P[2]);
    }
  };
}

/* ---------------- juntar peças numa geometria (metros, float), com a tinta de cada peça ---------------- */
function juntar(base, nomes, morfos, fonte) {
  const { T, meta, nomesOssos } = base; const malhas = (fonte || base).malhas; const remapa = fonte ? fonte.remapa : null;
  const metaF = fonte ? fonte.meta : meta;
  const q = metaF.quantizacao; let nv = 0, ni = 0; const fontes = [];
  for (const n of nomes) { const m = malhas[n]; if (!m) continue; const g = m.geometry; fontes.push([n, g]); nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), ti = new Float32Array(nv);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let ov = 0, oi = 0;
  const fem = (morfos && morfos.feminino) || 0, forte = (morfos && morfos.forte) || 0;
  const P = [0, 0, 0], D = [0, 0, 0], D2 = [0, 0, 0];
  const dF = morfoDelta(meta, 'feminino', P, D), dS = morfoDelta(meta, 'forte', P, D2);
  for (const [n, g] of fontes) {
    const peca = metaF.pecas[pecaDe(metaF, n)] || {}; const slot = Math.max(0, SLOTS.indexOf(peca.tinta || 'pele'));
    const J = k => { const j = comp(aj, i_, k); return remapa ? Math.max(0, remapa[j]) : j; }; let i_ = 0;
    const A = g.attributes, ap = A.position, an = A.normal, au = A.uv, aj = A.skinIndex, aw = A.skinWeight;
    const lim = a => (a.array instanceof Int16Array ? 32767 : a.array instanceof Uint16Array ? 65535 : a.array instanceof Int8Array ? 127 : 255);
    const kp = ap.normalized ? 1 / lim(ap) : 1, kn = an.normalized ? 1 / lim(an) : 1, ku = au.normalized ? 1 / lim(au) : 1, kw = aw.normalized ? 1 / lim(aw) : 1;
    for (let i = 0; i < ap.count; i++) {
      i_ = i; let x = ap.getX(i) * kp, y = ap.getY(i) * kp, z = ap.getZ(i) * kp;
      if (ap.normalized) { x = x * q.escala[0] + q.desloc[0]; y = y * q.escala[1] + q.desloc[1]; z = z * q.escala[2] + q.desloc[2]; }
      if (fem || forte) {
        P[0] = x; P[1] = -z; P[2] = y; D[0] = D[1] = D[2] = 0; D2[0] = D2[1] = D2[2] = 0;
        for (let k = 0; k < 4; k++) { const w = comp(aw, i, k) * kw; if (w <= 0) continue; const on = nomesOssos[J(k)]; if (fem) dF(on, w); if (forte) dS(on, w); }
        x += D[0] * fem + D2[0] * forte; y += D[2] * fem + D2[2] * forte; z += -(D[1] * fem + D2[1] * forte);
      }
      const o = ov + i;
      pos[o * 3] = x; pos[o * 3 + 1] = y; pos[o * 3 + 2] = z;
      let nx = an.getX(i) * kn, ny = an.getY(i) * kn, nz = an.getZ(i) * kn; const l = Math.hypot(nx, ny, nz) || 1;
      nor[o * 3] = nx / l; nor[o * 3 + 1] = ny / l; nor[o * 3 + 2] = nz / l;
      uv[o * 2] = au.getX(i) * ku; uv[o * 2 + 1] = au.getY(i) * ku;
      for (let k = 0; k < 4; k++) { si[o * 4 + k] = J(k); sw[o * 4 + k] = comp(aw, i, k) * kw; }
      ti[o] = slot;
    }
    const gi = g.index.array; for (let k = 0; k < gi.length; k++) idx[oi + k] = gi[k] + ov;
    ov += ap.count; oi += gi.length;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setAttribute('skinIndex', new T.BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new T.BufferAttribute(sw, 4)); geo.setAttribute('tinta', new T.BufferAttribute(ti, 1));
  geo.setIndex(new T.BufferAttribute(idx, 1)); geo.computeBoundingSphere();
  return geo;
}
// componente k do vértice i (funciona com atributo intercalado: posições/normais quantizadas têm passo de 8 bytes)
function comp(a, i, k) { return k === 0 ? a.getX(i) : k === 1 ? a.getY(i) : k === 2 ? a.getZ(i) : a.getW(i); }
function pecaDe(meta, nomeMalha) { const b = nomeMalha.replace(/_lod\d$/, ''); return meta.pecas[b] ? b : b; }

function geometrias(base, cfg) {
  const { meta } = base;
  const X = cfg.extras || null, xp = X ? (cfg.pecasExtras || Object.keys(X.meta.pecas)) : [];
  const esconde = new Set(); cfg.pecas.forEach(p => ((meta.pecas[p] || {}).esconde || []).forEach(r => esconde.add(r)));
  xp.forEach(p => ((X.meta.pecas[p] || {}).esconde || []).forEach(r => esconde.add(r)));
  const corpo = meta.regioes.filter(r => !esconde.has(r)).map(r => 'corpo_' + r);
  const opacas = corpo.concat(cfg.pecas.filter(p => meta.pecas[p]));      // V3: cabelo opaco na mesma malha
  const cab = [];
  const chave = opacas.join(',') + '|' + cab.join(',') + '|' + (X ? X.chave + ':' + xp.join(',') : '') + '|' + (cfg.morfos.feminino || 0) + ',' + (cfg.morfos.forte || 0);
  let g = base.cache.get(chave);
  if (!g) {
    g = [0, 1, 2].map(k => ({ op: juntar(base, opacas.map(p => p + '_lod' + k), cfg.morfos), cab: cab.length ? juntar(base, cab.map(p => p + '_lod' + k), cfg.morfos) : null,
      x: xp.length ? juntar(base, xp.map(p => `x_${X.meta.aparencia}_${p}_lod${k}`), cfg.morfos, X) : null }));
    base.cache.set(chave, g);
  }
  return g;
}

/* ---------------- material com tintas, pelos, marcas, etiqueta, ferimentos ---------------- */
function linear(T, c) { return new T.Color(c).convertSRGBToLinear(); }
function materialCobaia(base, U) {
  const { T, matCob, meta } = base; const A = meta.atlas;
  const m = new T.MeshStandardMaterial({ map: matCob.map, roughnessMap: matCob.roughnessMap, metalness: 0, roughness: 1, skinning: true });
  m.name = 'cobaia_v3';
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float tinta;\nvarying float vTinta;\nvarying vec3 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTinta = tinta; vRest = position;');
    const R = v => `vec4(${v[0].toFixed(4)}, ${v[1].toFixed(4)}, ${v[2].toFixed(4)}, ${v[3].toFixed(4)})`;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying float vTinta; varying vec3 vRest;
uniform vec3 uT0, uT1, uT2, uT3, uT4, uT5, uT6;
uniform float uBarba, uSardas, uSobr, uMarca, uFer, uFresco, uBrilho; uniform vec3 uDig, uCorBrilho;
bool dentro(vec2 p, vec4 r) { return p.x > r.x && p.x < r.z && p.y > r.y && p.y < r.w; }`)
      .replace('#include <map_fragment>', `
float gSangue = 0.0; float gMetal = 0.0; float gIris = 0.0;
vec4 tc = texture2D(map, vUv);
vec4 orm = texture2D(roughnessMap, vUv);
float cod = orm.a; float marcas = 1.0; bool ehSard = abs(cod - 0.333) < 0.1, ehMarca = abs(cod - 0.667) < 0.1;
if (cod > 0.9) gMetal = 0.85;
vec4 rEt = ${R(A.etiqueta)}; vec4 rAl = ${R(A.algarismos)};
if (dentro(vUv, rEt)) {
  vec2 uE = vUv;
  vec2 l = (uE - rEt.xy) / (rEt.zw - rEt.xy);
  if (l.x > 0.48 && l.x < 0.95 && l.y > 0.15 && l.y < 0.85) {
    float f = (l.x - 0.48) / (0.95 - 0.48) * 3.0; float c = floor(f);
    float d = c < 0.5 ? uDig.x : (c < 1.5 ? uDig.y : uDig.z);
    vec2 g = vec2(rAl.x + (d + fract(f)) / 10.0 * (rAl.z - rAl.x), rAl.y + (l.y - 0.15) / 0.7 * (rAl.w - rAl.y));
    float tinta_ = 1.0 - texture2D(map, g).r; tc.rgb = mix(tc.rgb, vec3(0.06, 0.06, 0.08), clamp(tinta_ * 1.2, 0.0, 1.0));
  }
}
vec4 texelColor = mapTexelToLinear(vec4(tc.rgb, 1.0));
float s = vTinta;
vec3 tint = s < 0.5 ? uT0 : s < 1.5 ? uT1 : s < 2.5 ? uT2 : s < 3.5 ? uT3 : s < 4.5 ? uT4 : s < 5.5 ? uT5 : s < 6.5 ? uT6 : vec3(0.8);
if (dentro(vUv, ${R(A.olhos)})) { tint = uT2; gIris = tc.a; }
vec3 col = mix(texelColor.rgb, texelColor.rgb * tint * 1.25, tc.a);
// pelos: sobrancelhas (acima dos olhos) e barba (abaixo), na cor do cabelo
float pel = orm.r * (vRest.y > 1.635 ? uSobr : uBarba);
col = mix(col, uT1 * (0.35 + 0.3 * texelColor.g), pel * 0.85);
// marcas: sardas no meio do rosto; cicatriz/tatuagem só do lado escolhido (uMarca = 1 esquerda da figura, -1 espelhada)
if (ehSard) col *= 1.0 - uSardas * 0.4 * vec3(0.55, 0.7, 0.85);
else if (ehMarca && vRest.x * uMarca > 0.0) col = mix(col, vRest.y > 1.5 ? col * vec3(0.95, 0.55, 0.55) : vec3(0.05, 0.06, 0.09), abs(uMarca) * 0.8);
// ferimentos: o texel aparece quando o nível passa do valor dele
float fx = orm.b; float fv = 1.0 - fx;   // gravado invertido: 0 = sem ferimento
if (fx > 0.02 && uFer >= fv) {
  float k = smoothstep(fv, fv + 0.04, uFer);
  float olho = length(vRest - vec3(0.032, 1.645, 0.074));
  if (olho < 0.034 && fv < 0.15) col = mix(col, col * vec3(0.45, 0.3, 0.42), k * 0.8);
  else { vec3 seco = vec3(0.09, 0.012, 0.01), fresco = vec3(0.32, 0.0, 0.0); col = mix(col, mix(seco, fresco, uFresco), k * 0.9); gSangue = k; }
}
diffuseColor.rgb *= col;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, mix(0.7, 0.12, uFresco), gSangue);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = max(metalnessFactor, gMetal);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uCorBrilho * uBrilho * gIris * 2.0;');
  };
  m.customProgramCacheKey = () => 'cobaia_v3';
  return m;
}

// peças exclusivas: cor fixa (sem tinta), ORM com R = metal, G = rugosidade, B = ferimento invertido (mesma regra do base)
function materialExtras(base, X, U) {
  const { T } = base; const s = X.mat;
  const m = new T.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, metalness: 1, roughness: 1, side: T.DoubleSide, skinning: true });
  m.name = 'cobaia_v2_x';
  m.onBeforeCompile = sh => {
    sh.uniforms.uFer = U.uFer; sh.uniforms.uFresco = U.uFresco;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uFer, uFresco;')
      .replace('#include <map_fragment>', `
float gSangue = 0.0;
vec4 orm = texture2D(roughnessMap, vUv);
vec4 texelColor = mapTexelToLinear(vec4(texture2D(map, vUv).rgb, 1.0));
vec3 col = texelColor.rgb;
float fx = orm.b; float fv = 1.0 - fx;
if (fx > 0.02 && uFer >= fv) { float k = smoothstep(fv, fv + 0.04, uFer); col = mix(col, mix(vec3(0.09, 0.012, 0.01), vec3(0.32, 0.0, 0.0), uFresco), k * 0.9); gSangue = k; }
diffuseColor.rgb *= col;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, mix(0.7, 0.12, uFresco), gSangue);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = orm.r * (1.0 - gSangue);');
  };
  m.customProgramCacheKey = () => 'cobaia_v2_x';
  return m;
}

function uniformsDe(T, cfg) {
  const t = cfg.tintas, U = {};
  ['pele', 'cabelo', 'iris', 'cima', 'baixo', 'sapato', 'acessorio'].forEach((k, i) => { U['uT' + i] = { value: linear(T, t[k]) }; });
  Object.assign(U, { uBarba: { value: +cfg.barba }, uSardas: { value: +cfg.sardas }, uSobr: { value: +cfg.sobrancelhas }, uMarca: { value: +cfg.marca },
    uFer: { value: cfg.ferimento }, uFresco: { value: cfg.sangueFresco }, uBrilho: { value: cfg.olhosBrilho },
    uDig: { value: new T.Vector3(...cfg.etiqueta) }, uCorBrilho: { value: linear(T, cfg.corBrilho) } });
  return U;
}

/* ---------------- montar uma cópia ---------------- */
function clonarOssos(T, no, mapa) {
  const c = no.isBone ? new T.Bone() : new T.Object3D();
  c.name = no.name; c.position.copy(no.position); c.quaternion.copy(no.quaternion); c.scale.copy(no.scale);
  mapa[no.name] = c; no.children.forEach(f => { if (f.isBone) c.add(clonarOssos(T, f, mapa)); });
  return c;
}
function montar(T, base, cfg0) {
  const cfg = Object.assign({}, PADRAO, cfg0 || {}); cfg.tintas = Object.assign({}, PADRAO.tintas, (cfg0 || {}).tintas); cfg.morfos = Object.assign({}, PADRAO.morfos, (cfg0 || {}).morfos);
  const grupo = new T.Group(); grupo.name = 'cobaia_v2';
  const mapa = {}; const raiz = clonarOssos(T, base.raizEsq, mapa); grupo.add(raiz);
  const ossos = base.nomesOssos.map(n => mapa[n]);
  const esq = new T.Skeleton(ossos, base.inversas);
  const U = uniformsDe(T, cfg);
  const mat = materialCobaia(base, U);
  const matCab = new T.MeshStandardMaterial({ map: base.matCab.map, alphaTest: 0.5, roughness: 0.55, metalness: 0, skinning: true });
  matCab.color.copy(linear(T, cfg.tintas.cabelo)).multiplyScalar(1.6);
  let geos = geometrias(base, cfg), nivel = 0;
  const corpo = new T.SkinnedMesh(geos[0].op, mat); corpo.name = 'cobaia_corpo';
  const cab = new T.SkinnedMesh(geos[0].cab || new T.BufferGeometry(), matCab); cab.name = 'cobaia_cabelo'; cab.visible = !!geos[0].cab;
  const X = cfg.extras || null;
  const matX = X ? materialExtras(base, X, U) : null;
  const ext = new T.SkinnedMesh(geos[0].x || new T.BufferGeometry(), matX || mat); ext.name = 'cobaia_extras'; ext.visible = !!geos[0].x;
  [corpo, cab, ext].forEach(m => { m.frustumCulled = false; m.castShadow = true; grupo.add(m); m.bind(esq, new T.Matrix4()); });
  // pose fixa da V1 (braço/antebraço) por cima dos clipes que não pedem os braços (parado, andar, correr, agachar, curvada)
  const nomePose = cfg.pose || (X && X.meta.pose) || null;
  const COM_POSE = ['parado', 'andar', 'correr', 'agachar', 'curvada'];
  const esconderMaos = cfg.esconderMaos != null ? cfg.esconderMaos : !!(X && X.meta.esconder_maos);
  let nomeAtual = null;
  const mixer = new T.AnimationMixer(grupo); let atual = null;
  const inst = {
    grupo, mixer, ossos: mapa, uniforms: U, cfg, malhas: { corpo, cabelo: cab, extras: ext },
    tocar(nome, op = {}) {
      const c = base.clipes[nome]; if (!c) return null;
      const a = mixer.clipAction(c); const unico = ['morto', 'ataque', 'revelar'].includes(nome);
      a.reset(); a.setLoop(unico ? T.LoopOnce : T.LoopRepeat, Infinity); a.clampWhenFinished = unico;
      a.timeScale = op.ritmo || 1; a.play(); if (atual && atual !== a) atual.crossFadeTo(a, op.fade ?? 0.25, false); atual = a; nomeAtual = nome; return a;
    },
    lod(dist) {
      const d = base.meta.lod_distancias || [8, 20], k = dist < d[0] ? 0 : dist < d[1] ? 1 : 2;
      if (k !== nivel) { nivel = k; corpo.geometry = geos[k].op; if (geos[k].cab) cab.geometry = geos[k].cab; if (geos[k].x) ext.geometry = geos[k].x; } return k;
    },
    definir(parcial) {   // troca de peças/morfos remonta a geometria (com cache); tintas e o resto só mexem em uniforms
      Object.assign(cfg, parcial);
      if (parcial.tintas) { Object.assign(cfg.tintas, parcial.tintas); ['pele', 'cabelo', 'iris', 'cima', 'baixo', 'sapato', 'acessorio'].forEach((k, i) => U['uT' + i].value.copy(linear(T, cfg.tintas[k]))); matCab.color.copy(linear(T, cfg.tintas.cabelo)).multiplyScalar(1.6); }
      if (parcial.pecas || parcial.morfos || parcial.pecasExtras) { geos = geometrias(base, cfg); corpo.geometry = geos[nivel].op; cab.visible = !!geos[nivel].cab; if (geos[nivel].cab) cab.geometry = geos[nivel].cab; ext.visible = !!geos[nivel].x; if (geos[nivel].x) ext.geometry = geos[nivel].x; }
      const u = { barba: 'uBarba', sardas: 'uSardas', sobrancelhas: 'uSobr', marca: 'uMarca', ferimento: 'uFer', sangueFresco: 'uFresco', olhosBrilho: 'uBrilho' };
      for (const k in u) if (k in parcial) U[u[k]].value = +parcial[k];
      if (parcial.etiqueta) U.uDig.value.set(...parcial.etiqueta);
    },
    atualizar(dt, dist) { if (dist != null) inst.lod(dist); mixer.update(dt); inst.aplicarPose(); },
    aplicarPose() {      // chamar depois de mixer.update (atualizar já chama)
      const p = nomePose && base.poses[nomePose];
      if (p && COM_POSE.includes(nomeAtual)) for (const n in p) if (mapa[n]) mapa[n].quaternion.copy(p[n]);
      if (esconderMaos && COM_POSE.includes(nomeAtual)) ['mao_e', 'mao_d'].forEach(n => mapa[n] && mapa[n].scale.setScalar(0.001));
      else ['mao_e', 'mao_d'].forEach(n => mapa[n] && mapa[n].scale.setScalar(1));
    },
    triangulos() { return (corpo.geometry.index.count + (cab.visible ? cab.geometry.index.count : 0) + (ext.visible ? ext.geometry.index.count : 0)) / 3; },
    chamadas() { return 1 + (cab.visible ? 1 : 0) + (ext.visible ? 1 : 0); },
  };
  inst.tocar('parado');
  return inst;
}

window.CobaiaV3 = { carregar, montar, PADRAO, SLOTS };
})();
