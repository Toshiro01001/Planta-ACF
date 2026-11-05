/* Mapa V2 (qualidade Alta): a aparência dos andares feita com o kit modular de terror (Blender + atlas).
   NÃO muda nada de lugar nem de regra: as mesmas paredes, pisos, tetos, portas e colisões do V1 (sala3d.js); só troca
   a pele das superfícies (atlas de superfícies em coordenadas do mundo, oclusão do andar assada numa textura, sujeira,
   umidade e poças que refletem a lanterna) e põe peças de cenário finas, sem colisão, rente às paredes e ao teto dos
   corredores (fora da faixa onde se anda). Na qualidade Leve este arquivo nem é baixado: o V1 fica idêntico.
   Carregamento preguiçoso: as texturas e o .glb do kit só descem quando um andar abre na Alta (e ficam no cache). */
(() => {
  'use strict';
  const NS = () => (window.ACF3D = window.ACF3D || {});
  const VERSAO = ((document.currentScript && document.currentScript.src) || '').split('?')[1] || '';
  const BASE = 'modelos/mapa_v2/';
  const ARQ = {
    supCor: 'kit_superficies_cor.webp', supNor: 'kit_superficies_normal.webp',
    kitCor: 'kit_objetos_cor.webp', kitNor: 'kit_objetos_normal.webp', kitOrm: 'kit_objetos_orm.png', kit: 'kit_objetos.glb',
    // V3 (low-poly pintado, pixel visível, sem normal map): os mesmos ladrilhos e decalques, 256 por superfície, Nearest
    supV3: 'kit_superficies_v3.png', kitV3: 'kit_objetos_v3.png', kitV3Orm: 'kit_objetos_v3_orm.png',
  };
  // ESTILO do mapa: 'v2' (alto detalhe) ou 'v3' (piloto low-poly pintado). Mesmo sistema, mesma colisão, mesma degradação.
  const lsEstilo = () => 'v2';   // V3 do mapa arquivado (decisão do Mestre: mapa em V2); só MapaV2.estiloTeste('v3') para comparação, com os arquivos do arquivo_v3
  let estiloForcado = null;
  const estilo = () => estiloForcado || lsEstilo();
  const url = a => BASE + a + (VERSAO ? '?' + VERSAO : '');

  /* ---------- ladrilhos do atlas de superfícies (4 x 4; núcleo 480 px + borda de 16 px em 512) ---------- */
  const L = { reboco: 0, descascado: 1, azulejo: 2, papel: 3, metal: 4, mofo: 5, concreto: 6, ladrilho: 7, carpete: 8, madeira: 9, grade: 10, forro: 11, concreto_teto: 12, acolchoado: 13, chapa: 14 };
  // por superfície do V1 (chave da textura): [ladrilho A, metros A, ladrilho B, metros B, quanto de B (manchas grandes)]
  // -1 = mantém a textura do V1 (salas com desenho próprio: carne, xadrez...) e só põe a sujeira e a oclusão por cima
  const PAREDE = {
    concreto: [L.reboco, 2.0, L.descascado, 2.4, .8], concreto_sujo: [L.reboco, 2.0, L.descascado, 2.4, 1],
    azulejo_sujo: [L.azulejo, 1.2, L.mofo, 2.0, .35], azulejo: [L.azulejo, 1.2, L.mofo, 2.0, .2],
    parede_mofada: [L.reboco, 2.0, L.mofo, 2.0, 1], metal_sujo: [L.metal, 2.0, L.metal, 2.6, 0], metal: [L.metal, 2.0, L.metal, 2.6, 0],
    papel_parede: [L.papel, 1.4, L.mofo, 2.0, .45], acolchoado: [L.acolchoado, 1.2, L.acolchoado, 1.2, 0], porta_aco: [L.chapa, 1.5, L.chapa, 1.5, 0],
    madeira_velha: [L.madeira, 2.0, L.madeira, 2.0, 0], tijolo: [L.descascado, 2.0, L.descascado, 2.0, 0],
  };
  const PISO = {
    chao_sujo: [L.concreto, 2.5, L.ladrilho, 1.8, .25], concreto: [L.concreto, 2.5, L.concreto, 2.5, 0], concreto_sujo: [L.concreto, 2.5, L.concreto, 2.5, 0],
    azulejo_sujo: [L.ladrilho, 1.8, L.concreto, 2.5, .3], azulejo: [L.ladrilho, 1.8, L.ladrilho, 1.8, 0],
    carpete_velho: [L.carpete, 1.5, L.carpete, 1.5, 0], carpete_umido: [L.carpete, 1.5, L.carpete, 1.5, 0], carpete: [L.carpete, 1.5, L.carpete, 1.5, 0],
    madeira_velha: [L.madeira, 2.0, L.madeira, 2.0, 0], madeira: [L.madeira, 2.0, L.madeira, 2.0, 0], grade_chao: [L.grade, 1.0, L.grade, 1.0, 0],
    metal_sujo: [L.metal, 2.0, L.metal, 2.0, 0],
  };
  const TETO = {
    forro_sujo: [L.forro, 2.4, L.forro, 2.4, 0], forro: [L.forro, 2.4, L.forro, 2.4, 0], concreto: [L.concreto_teto, 3.0, L.concreto_teto, 3.0, 0],
    concreto_sujo: [L.concreto_teto, 3.0, L.concreto_teto, 3.0, 0], metal_sujo: [L.metal, 2.0, L.metal, 2.0, 0],
  };
  // DEGRADAÇÃO por andar (0 a 1): a Caixa fica pior e mais abandonada conforme se desce. Um número controla tudo junto:
  // superfícies (reboco caindo até o tijolo, mofo subindo, infiltração, piso quebrado, água parada), teto (laje aberta,
  // manchas), peças e decalques (densidade, sangue mais fresco, rastros, arranhões em série), luz (mais escuro e doentio).
  // O 1º andar (0,35) é a referência aprovada: tudo o que é "a mais" cresce a partir dele (e = 0 no 1º, 1 no 5º).
  const DEGRADACAO = { 1: .3, 2: .6, 3: .75, 4: .9, 5: 1.0 };
  let degrForcada = null;   // só para as fotos de comparação (MapaV2.degradacaoTeste)
  const degr = a => degrForcada ?? DEGRADACAO[a] ?? Math.min(1, .3 + .15 * (a - 1));
  // curva íngreme: o 2º andar já mostra o que o 1º não tem (e = 0 no 1º, ~0,6 no 2º, 1 no 5º)
  const extra = d => Math.pow(Math.max(0, Math.min(1, (d - .3) / .7)), .6);
  const mais = (p, e, k = 2.2) => 1 - Math.pow(1 - Math.min(.999, p), 1 + k * e);   // probabilidade que cresce com a degradação
  const MOLHADO = { chao_sujo: .8, concreto: .7, azulejo_sujo: .9, azulejo: .6, carpete_velho: .5, carpete_umido: .9, madeira_velha: .35, grade_chao: 0 };

  /* ---------- decalques: retângulos (u0, v0, du, dv) no atlas do kit e tamanho em metros ---------- */
  const DEC = {
    arrasto: [[0, 0, .15625, .5], 1.0, 3.0], maos: [[.15625, .25, .25, .25], .8, .8], unhas: [[.40625, .25, .25, .25], .55, .55],
    infiltracao: [[.65625, .25, .25, .25], 1.6, 1.6], poca: [[.15625, 0, .25, .25], 1.5, 1.5], ferrugem: [[.90625, .25, .09375, .25], .32, .9],
    pegadas: [[.90625, 0, .09375, .25], .38, 1.0], respingo: [[.40625, 0, .25, .25], .9, .9], fuligem: [[.65625, 0, .25, .25], 1.3, 1.3],
  };

  /* ---------- carregamento (uma vez por sessão; o navegador e o sw.js guardam) ---------- */
  const prontos = {};
  const script = src => new Promise((ok, falha) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = falha; document.head.appendChild(s); });
  function carregar(T, est) {
    if (prontos[est]) return prontos[est];
    const pronto = prontos[est] = (async () => {
      if (!T.GLTFLoader) await script('lib/GLTFLoader.js' + (VERSAO ? '?' + VERSAO : ''));
      if (!window.MeshoptDecoder) await script('lib/meshopt_decoder.js' + (VERSAO ? '?' + VERSAO : ''));
      await window.MeshoptDecoder.ready;
      const tl = new T.TextureLoader();
      const px = est === 'v3';
      const tex = (a, srgb) => !a ? Promise.resolve(null) : new Promise((ok, falha) => tl.load(url(a), t => { t.encoding = srgb ? T.sRGBEncoding : T.LinearEncoding; t.anisotropy = px ? 1 : 8; if (px) { t.magFilter = T.NearestFilter; t.minFilter = T.NearestMipmapLinearFilter; } ok(t); }, undefined, falha));
      const ld = new T.GLTFLoader(); ld.setMeshoptDecoder(window.MeshoptDecoder);
      const [supCor, supNor, kitCor, kitNor, kitOrm, gltf] = await Promise.all([tex(px ? ARQ.supV3 : ARQ.supCor, true), tex(px ? null : ARQ.supNor), tex(px ? ARQ.kitV3 : ARQ.kitCor, true), tex(px ? null : ARQ.kitNor), tex(px ? ARQ.kitV3Orm : ARQ.kitOrm),
        new Promise((ok, falha) => ld.load(url(ARQ.kit), ok, undefined, falha))]);
      // peças do kit: geometria já no espaço da peça (a matriz do nó entra aqui), atributos sem normalização
      const pecas = {};
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(o => { if (o.isMesh) pecas[o.name] = paraPeca(T, o); });
      return { supCor, supNor, kitCor, kitNor, kitOrm, pecas };
    })();
    pronto.catch(e => { console.warn('mapa V2: não carregou o kit', e); prontos[est] = null; });
    return pronto;
  }
  function lerAttr(a) {
    const n = a.count, k = a.itemSize, out = new Float32Array(n * k), arr = a.array;
    let div = 1;
    if (a.normalized) div = arr instanceof Int8Array ? 127 : arr instanceof Uint8Array ? 255 : arr instanceof Int16Array ? 32767 : arr instanceof Uint16Array ? 65535 : 1;
    const st = a.isInterleavedBufferAttribute ? a.data.stride : k, of = a.isInterleavedBufferAttribute ? a.offset : 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) { const v = arr[i * st + of + j] / div; out[i * k + j] = a.normalized ? Math.max(v, -1) : v; }
    return out;
  }
  function paraPeca(T, o) {
    const g = o.geometry, m = o.matrixWorld, nm = new T.Matrix3().getNormalMatrix(m), v = new T.Vector3();
    const pos = lerAttr(g.attributes.position), nor = g.attributes.normal ? lerAttr(g.attributes.normal) : null;
    const uv = g.attributes.uv ? lerAttr(g.attributes.uv) : null, cor = g.attributes.color ? lerAttr(g.attributes.color) : null;
    if (uv) for (let i = 1; i < uv.length; i += 2) uv[i] = 1 - uv[i];   // glTF tem v para baixo; o atlas é lido com v para cima
    const n = g.attributes.position.count, ao = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(m); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
      if (nor) { v.set(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]).applyMatrix3(nm).normalize(); nor[i * 3] = v.x; nor[i * 3 + 1] = v.y; nor[i * 3 + 2] = v.z; }
      ao[i] = cor ? cor[i * (g.attributes.color.itemSize)] : 1;
    }
    const idx = g.index ? Array.from(g.index.array) : Array.from({ length: n }, (_, i) => i);
    return { pos, nor, uv, ao, idx, n };
  }

  /* ---------- o shader das superfícies (MeshStandardMaterial do V1, remendado) ---------- */
  const VERT_DECL = 'varying vec3 vMv2P;\nvarying vec3 vMv2N;\n';
  const FRAG_DECL = `varying vec3 vMv2P;
varying vec3 vMv2N;
uniform vec4 mv2A; uniform vec4 mv2B; uniform vec4 mv2C; uniform vec4 mv2D;
uniform sampler2D mv2AO; uniform vec4 mv2AOr;
vec3 mv2NW; float mv2Rug; float mv2Poca; float mv2Rm;
const float MV2_C = 480.0 / 512.0; const float MV2_P = 16.0 / 512.0;
vec2 mv2At(float k, vec2 uv) { vec2 t = vec2(mod(k, 4.0), 3.0 - floor(k / 4.0)); return (t + MV2_P + fract(uv) * MV2_C) * 0.25; }
vec4 mv2Cor(float k, vec2 uv) { return textureGrad(map, mv2At(k, uv), dFdx(uv) * MV2_C * 0.25, dFdy(uv) * MV2_C * 0.25); }
#ifdef USE_NORMALMAP
vec3 mv2Nor(float k, vec2 uv) { return textureGrad(normalMap, mv2At(k, uv), dFdx(uv) * MV2_C * 0.25, dFdy(uv) * MV2_C * 0.25).xyz; }
#endif
`;
  // mv2A: ladrilho A, metros A, ladrilho B, metros B · mv2B: quanto de B, molhado, altura do teto, escuro
  // mv2C: manter a textura do V1 (1), força do relevo, dessaturação, sujeira
  const FRAG_MAP = `
  vec3 mv2N0 = normalize(vMv2N); vec3 mv2W = vMv2P; vec3 aN = abs(mv2N0);
  vec2 uw; vec3 Tw; vec3 Bw; float tipo;
  if (aN.y > 0.5) { tipo = mv2N0.y > 0.0 ? 0.0 : 2.0; Tw = vec3(1.0, 0.0, 0.0); Bw = vec3(0.0, 0.0, mv2N0.y > 0.0 ? -1.0 : 1.0); uw = vec2(mv2W.x, mv2W.z * Bw.z); }
  else if (aN.x > aN.z) { float s = sign(mv2N0.x); tipo = 1.0; uw = vec2(-mv2W.z * s, mv2W.y); Tw = vec3(0.0, 0.0, -s); Bw = vec3(0.0, 1.0, 0.0); }
  else { float s = sign(mv2N0.z); tipo = 1.0; uw = vec2(mv2W.x * s, mv2W.y); Tw = vec3(s, 0.0, 0.0); Bw = vec3(0.0, 1.0, 0.0); }
  vec4 mc = mv2Cor(15.0, tipo == 1.0 ? vec2(uw.x / 9.0, uw.y / 16.0) : uw / 14.0);
  float mB = smoothstep(0.3, 0.75, mc.b) * mv2B.x;
  vec3 alb; vec3 nt = vec3(0.0, 0.0, 1.0); mv2Rm = 0.0;
  if (mv2C.x > 0.5) { vec4 t1 = texture2D(map, vUv); alb = mapTexelToLinear(t1).rgb; mv2Rug = roughness; }
  else {
    vec4 cA = mv2Cor(mv2A.x, uw / mv2A.y); vec4 cB = mv2Cor(mv2A.z, uw / mv2A.w);
    vec4 c = mix(cA, cB, mB);
    #ifdef USE_NORMALMAP
    nt = mix(mv2Nor(mv2A.x, uw / mv2A.y), mv2Nor(mv2A.z, uw / mv2A.w), mB);
    #endif
    if (mv2D.x > 0.001) {
      // ruína: onde a máscara grande deixa, o revestimento caiu (tijolo/bloco na parede, contrapiso no chão, laje no teto)
      float rmk = mv2Cor(15.0, uw / 5.3 + 0.37).b;
      float rm = smoothstep(0.8 - 0.42 * mv2D.x, 0.85 - 0.4 * mv2D.x, rmk) * step(0.0, mv2D.y);
      vec4 cC = mv2Cor(mv2D.y, uw / mv2D.z) * vec4(vec3(0.88), 1.0);
      c = mix(c, cC, rm); mB = max(mB, rm); mv2Rm = rm;
      #ifdef USE_NORMALMAP
      nt = mix(nt, mv2Nor(mv2D.y, uw / mv2D.z), rm);
      #endif
    }
    alb = mapTexelToLinear(vec4(c.rgb, 1.0)).rgb; mv2Rug = c.a;
    #ifdef USE_NORMALMAP
    nt = normalize(nt * 2.0 - 1.0); nt.xy *= mv2C.y;
    #endif
  }
  float ao = texture2D(mv2AO, (mv2W.xz + mv2N0.xz * 0.35 - mv2AOr.xy) * mv2AOr.zw).r;
  if (mv2D.w > 0.5) ao = floor(ao * 5.0 + 0.5) / 5.0;   // V3: sombra pintada em degraus
  float y = mv2W.y; mv2Poca = 0.0; float suj = mv2C.w; float ex = mv2D.x;
  if (tipo == 0.0) {
    mv2Poca = smoothstep(0.2 - 0.22 * ex, 0.55 - 0.2 * ex, mc.r) * min(1.0, mv2B.y * (1.0 + 0.8 * ex));
    alb *= mix(0.3, 1.0, ao);
    alb *= mix(vec3(1.0), vec3(0.55, 0.45, 0.35), (1.0 - ao) * 0.7 * suj);
    alb *= mix(1.0, 0.3, mv2Poca); mv2Rug = mix(mv2Rug, 0.03, mv2Poca);
    nt = normalize(mix(nt, vec3(0.0, 0.0, 1.0), mv2Poca));
  } else if (tipo == 1.0) {
    float base = 1.0 - smoothstep(0.0, (0.7 + (mc.g - 0.5) * 0.9) * (1.0 + 2.2 * ex), y);
    float topo = smoothstep(mv2B.z - 1.2 - mc.g * 0.9 - 1.8 * ex, mv2B.z, y);
    float escorr = smoothstep(0.55 - 0.25 * ex, 0.92 - 0.15 * ex, mc.g) * smoothstep(0.0, mv2B.z, y + mc.g);
    alb = mix(alb, alb * vec3(0.22, 0.27, 0.16), base * ex * 0.85 * smoothstep(0.35, 0.6, mc.b + 0.25));   // mofo preto subindo
    alb *= 1.0 - base * 0.6 * suj; alb *= mix(vec3(1.0), vec3(0.6, 0.5, 0.35), base * 0.6 * suj);
    alb *= 1.0 - topo * (0.25 + 0.4 * mc.b) * suj; alb *= mix(vec3(1.0), vec3(0.75, 0.62, 0.42), escorr * 0.7 * suj); alb *= 1.0 - escorr * 0.3 * suj;
    alb *= mix(0.38, 1.0, mix(ao, 1.0, smoothstep(0.0, 2.4, y) * 0.65));
    mv2Rug = mix(mv2Rug, mv2Rug * 0.55, base * 0.6);
  } else {
    alb *= mix(0.4, 1.0, ao); alb *= 1.0 - smoothstep(0.5 - 0.3 * ex, 0.9 - 0.2 * ex, mc.b) * (0.45 + 0.35 * ex) * suj;
  }
  float lu = dot(alb, vec3(0.299, 0.587, 0.114)); alb = mix(vec3(lu), alb, mv2C.z) * mv2B.w * (1.0 - 0.45 * ex);
  alb *= mix(vec3(1.0), vec3(0.76, 0.88, 0.5), 0.75 * ex);   // cor doentia (verde/ocre sujo)
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.56, 0.5), mv2Rm);   // onde o revestimento caiu, a cor da sala some (tijolo/contrapiso/laje)
  diffuseColor.rgb *= alb;
  mv2NW = normalize(Tw * nt.x + Bw * nt.y + mv2N0 * nt.z);
`;
  function remendar(T, M, u, comum) {
    if (M.userData.mv2) { Object.assign(M.userData.mv2.u, u); return; }
    const v1 = { map: M.map, normalMap: M.normalMap, color: M.color.getHex(), roughness: M.roughness, metalness: M.metalness, envMapIntensity: M.envMapIntensity, obc: M.onBeforeCompile, ck: M.customProgramCacheKey };
    const uni = { mv2A: { value: new T.Vector4() }, mv2B: { value: new T.Vector4() }, mv2C: { value: new T.Vector4() }, mv2D: { value: new T.Vector4() }, mv2AO: comum.ao, mv2AOr: comum.aoR };
    M.userData.mv2 = { v1, u, uni };
    aplicarU(T, M);
    M.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = VERT_DECL + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vMv2P = (modelMatrix * vec4(transformed, 1.0)).xyz; vMv2N = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <clipping_planes_pars_fragment>', '#include <clipping_planes_pars_fragment>\n' + FRAG_DECL)
        .replace('#include <map_fragment>', FRAG_MAP)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mv2Rug;')
        .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(mv2NW, 0.0)).xyz);')
        // poça: o reflexo só brilha onde há luz direta (a lanterna ou uma lâmpada acesa), não no escuro
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  { float luzD = dot(reflectedLight.directDiffuse, vec3(0.333)) / max(0.04, dot(diffuseColor.rgb, vec3(0.333)));
    float fres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
    float rip = 0.75 + 0.5 * mc.g;
    reflectedLight.directSpecular += vec3(0.85, 0.9, 1.0) * mv2Poca * luzD * (0.06 + 0.9 * fres) * rip;
    reflectedLight.indirectSpecular *= 1.0 + mv2Poca * 4.0 * clamp(luzD * 6.0, 0.0, 1.0); }`);
    };
    // chave nova a cada montagem: o three.js r128 guarda o programa por material e, achando a mesma chave depois de uma
    // troca ao vivo (Leve -> Alta), não refaz a lista de uniforms (os do V2 ficariam parados)
    const chave = 'mapa_v2_' + geracao; M.customProgramCacheKey = () => chave;
    M.needsUpdate = true;
  }
  function aplicarU(T, M) {
    const d = M.userData.mv2, u = d.u, uni = d.uni, A = comumAtual && comumAtual.tex;
    if (!u.manter) { M.map = A.supCor; M.normalMap = A.supNor; }
    else { M.normalMap = null; }
    M.color.set(d.v1.color); M.roughness = 1; M.metalness = u.metal ? .35 : 0; M.envMapIntensity = .25;
    uni.mv2A.value.set(u.t[0], u.t[1], u.t[2], u.t[3]);
    uni.mv2B.value.set(u.t[4], u.molhado || 0, u.topo || 4, u.escuro || .78);
    uni.mv2C.value.set(u.manter ? 1 : 0, u.relevo || 1, u.sat ?? .72, u.suj ?? 1);
    uni.mv2D.value.set(u.ex || 0, u.ruina ?? -1, u.ruinaM || 2, comumAtual && comumAtual.v3 ? 1 : 0);
  }
  // sala central do 1º andar (o abrigo dos jogadores, sala 25 de cada andar): fica conservada, como na referência do
  // Mestre; nos andares de baixo ela segue a degradação do andar
  const salaAbrigo = (a, s) => a === 1 && s && s.p === 25;
  // cópia limpa (sem o remendo do V2) de um material da fábrica, para uma sala ter pele própria
  function copiaMat(T, M) {
    const v = M.userData.mv2 ? M.userData.mv2.v1 : M;
    const c = new T.MeshStandardMaterial({ color: v.color, map: v.map, normalMap: v.normalMap, roughness: v.roughness, metalness: v.metalness, envMapIntensity: v.envMapIntensity, side: M.side, transparent: M.transparent, opacity: M.opacity, depthWrite: M.depthWrite });
    if (M.userData.tex) c.userData.tex = M.userData.tex;
    return c;
  }
  function restaurar(M) {
    const d = M.userData.mv2; if (!d) return;
    const v = d.v1;
    M.map = v.map; M.normalMap = v.normalMap; M.color.set(v.color); M.roughness = v.roughness; M.metalness = v.metalness; M.envMapIntensity = v.envMapIntensity;
    M.onBeforeCompile = v.obc; M.customProgramCacheKey = v.ck; delete M.userData.mv2; M.needsUpdate = true;
  }

  /* ---------- oclusão do andar (assada na abertura, numa textura de 1024 px): salas e corredores livres = claro ---------- */
  function oclusaoAndar(T, S, CS, corr3D, CORR_W) {
    const rs = []; Object.values(S).forEach(s => rs.push([s.x0, s.x1, s.z0, s.z1]));
    CS.forEach(c => { const q = corr3D(c), W = CORR_W / 2; rs.push(q.h ? [q.a0, q.a1, q.linha - W, q.linha + W] : [q.linha - W, q.linha + W, q.a0, q.a1]); });
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; rs.forEach(r => { x0 = Math.min(x0, r[0]); x1 = Math.max(x1, r[1]); z0 = Math.min(z0, r[2]); z1 = Math.max(z1, r[3]); });
    x0 -= 4; z0 -= 4; x1 += 4; z1 += 4;
    const N = 1024, lado = Math.max(x1 - x0, z1 - z0), k = N / lado;
    const a = new Float32Array(N * N);
    rs.forEach(([ax, bx, az, bz]) => {
      const i0 = Math.max(0, Math.floor((ax - x0) * k)), i1 = Math.min(N, Math.ceil((bx - x0) * k)), j0 = Math.max(0, Math.floor((az - z0) * k)), j1 = Math.min(N, Math.ceil((bz - z0) * k));
      for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) a[j * N + i] = 1;
    });
    // desfoque em caixa (3 passadas, raio ~0,45 m): os cantos e o pé das paredes escurecem sozinhos
    const r = Math.max(1, Math.round(.45 * k)), b = new Float32Array(N * N);
    for (let p = 0; p < 3; p++) {
      for (let j = 0; j < N; j++) { let s = 0; const o = j * N; for (let i = -r; i <= r; i++) s += a[o + Math.min(N - 1, Math.max(0, i))]; for (let i = 0; i < N; i++) { b[o + i] = s / (2 * r + 1); s += a[o + Math.min(N - 1, i + r + 1)] - a[o + Math.max(0, i - r)]; } }
      for (let i = 0; i < N; i++) { let s = 0; for (let j = -r; j <= r; j++) s += b[Math.min(N - 1, Math.max(0, j)) * N + i]; for (let j = 0; j < N; j++) { a[j * N + i] = s / (2 * r + 1); s += b[Math.min(N - 1, j + r + 1) * N + i] - b[Math.max(0, j - r) * N + i]; } }
    }
    const px = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++) { const v = Math.min(1, a[i] * 1.35); px[i] = Math.round(255 * v * v * (3 - 2 * v)); }
    const t = new T.DataTexture(px, N, N, T.LuminanceFormat, T.UnsignedByteType);
    t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    return { tex: t, r: new T.Vector4(x0, z0, 1 / lado, 1 / lado) };
  }

  /* ---------- montagem das peças do kit em poucas malhas por região do andar ---------- */
  function criarLote() { return { pos: [], nor: [], uv: [], cor: [], idx: [], n: 0 }; }
  function porPeca(T, lote, pc, m4) {
    const nm = new T.Matrix3().getNormalMatrix(m4), v = new T.Vector3(), o = lote.n;
    for (let i = 0; i < pc.n; i++) {
      v.set(pc.pos[i * 3], pc.pos[i * 3 + 1], pc.pos[i * 3 + 2]).applyMatrix4(m4); lote.pos.push(v.x, v.y, v.z);
      if (pc.nor) { v.set(pc.nor[i * 3], pc.nor[i * 3 + 1], pc.nor[i * 3 + 2]).applyMatrix3(nm).normalize(); lote.nor.push(v.x, v.y, v.z); } else lote.nor.push(0, 1, 0);
      lote.uv.push(pc.uv ? pc.uv[i * 2] : 0, pc.uv ? pc.uv[i * 2 + 1] : 0);
      const a = pc.ao[i]; lote.cor.push(a, a, a);
    }
    for (let i = 0; i < pc.idx.length; i++) lote.idx.push(pc.idx[i] + o);
    lote.n += pc.n;
  }
  function porQuad(T, lote, ret, w, h, m4, alfa) {
    // quadrado no plano XY (frente +Z), centro na origem; uv do retângulo do decalque
    const [u0, v0, du, dv] = ret, nm = new T.Matrix3().getNormalMatrix(m4), v = new T.Vector3(), o = lote.n;
    const P = [[-w / 2, -h / 2, u0, v0], [w / 2, -h / 2, u0 + du, v0], [w / 2, h / 2, u0 + du, v0 + dv], [-w / 2, h / 2, u0, v0 + dv]];
    v.set(0, 0, 1).applyMatrix3(nm).normalize(); const nx = v.x, ny = v.y, nz = v.z;
    const cr = Array.isArray(alfa) ? alfa : [alfa, alfa, alfa];
    P.forEach(([x, y, uu, vv]) => { v.set(x, y, 0).applyMatrix4(m4); lote.pos.push(v.x, v.y, v.z); lote.nor.push(nx, ny, nz); lote.uv.push(uu, vv); lote.cor.push(cr[0], cr[1], cr[2]); });
    lote.idx.push(o, o + 1, o + 2, o, o + 2, o + 3); lote.n += 4;
  }
  function geometria(T, lote, alfaCor) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(lote.pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(lote.nor, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(lote.uv, 2));
    g.setAttribute('color', new T.Float32BufferAttribute(lote.cor, 3));
    g.setIndex(lote.n > 65535 ? new T.Uint32BufferAttribute(lote.idx, 1) : new T.Uint16BufferAttribute(lote.idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
  function rng(s) { let x = s >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

  // peças dos corredores: tudo rente às paredes (fora da faixa onde se anda: RAIO 0,22 m) ou acima da cabeça
  function vestirCorredores(T, W, kit, lotes) {
    const { CS, corr3D, CORR_W, CORR_H, a, paineis } = W;
    const m4 = new T.Matrix4(), q4 = new T.Quaternion(), eu = new T.Euler(), s1 = new T.Vector3(1, 1, 1), p3 = new T.Vector3();
    const M = (x, y, z, ry, rx = 0, rz = 0, esc = 1, ex = 1) => { eu.set(rx, ry, rz, 'YXZ'); q4.setFromEuler(eu); s1.set(esc * ex, esc, esc); return m4.compose(p3.set(x, y, z), q4, s1); };
    const meia = CORR_W / 2, e = W.e || 0;
    const marcas = W.marcas || [];
    const pp = (lote, nome, m) => { marcas.push([nome, +m.elements[12].toFixed(2), +m.elements[14].toFixed(2)]); porPeca(T, lote, kit[nome], m); };
    CS.forEach((c, k) => {
      if (c.saida) return;
      const q = corr3D(c), r = rng(a * 7919 + c.ci * 104729 + 17), L = q.a1 - q.a0;
      const reg = lotes(q);
      // eixo do corredor (ao) e lateral (lat); lado s: parede em linha + s * meia, normal para dentro = -s
      const P = (ao, lat, y) => q.h ? [ao, y, lat] : [lat, y, ao];
      const yawAo = q.h ? 0 : -Math.PI / 2;                       // +X da peça ao longo do corredor
      const yawDentro = s => q.h ? (s > 0 ? Math.PI : 0) : (s > 0 ? -Math.PI / 2 : Math.PI / 2);   // +Z da peça para dentro
      const ini = q.a0 + .7, fim = q.a1 - .7;
      // canos no canto de cima (um lado sempre; os dois em 40%)
      const ladosCano = r() < .3 ? [-1, 1] : [r() < .5 ? -1 : 1];
      ladosCano.forEach((s, i) => {
        const lat = q.linha + s * (meia - .1 - i * .02), y = CORR_H - .2 - i * .06;
        for (let ao = ini; ao + 2 <= fim + .01; ao += 2) { const [x, yy, z] = P(ao, lat, y); pp(reg.teto, 'cano', M(x, yy, z, yawAo, 0, 0, 1, 2)); }
        for (let ao = ini + .5; ao < fim; ao += 2.2) { const [x, yy, z] = P(ao, lat, y); pp(reg.teto, 'abracadeira', M(x, yy, z, yawAo)); }
        // ferrugem escorrendo da parede embaixo do cano, em alguns pontos
        for (let j = 0; j < 2; j++) if (r() < mais(.7, e)) { const ao = ini + r() * (fim - ini), [x, yy, z] = P(ao, q.linha + s * (meia - .012), y - .55); marcas.push(['d_ferrugem', +x.toFixed(2), +z.toFixed(2)]); porQuad(T, reg.dec, DEC.ferrugem[0], DEC.ferrugem[1] * (1 + r()), DEC.ferrugem[2] * (1 + r() * .6), M(x, yy, z, yawDentro(s)), 1); }
      });
      // calha de cabos do outro lado, às vezes
      if (r() < mais(.22, e)) { const s = -ladosCano[0], lat = q.linha + s * (meia - .2); for (let ao = ini; ao + 2 <= fim + .01; ao += 2) { const [x, yy, z] = P(ao, lat, CORR_H); pp(reg.teto, 'calha', M(x, yy, z, yawAo, 0, 0, 1, 2)); } }
      // fios soltos e corrente com gancho rente à parede
      if (r() < mais(.6, e)) { const s = r() < .5 ? -1 : 1, ao = ini + r() * (fim - ini), [x, yy, z] = P(ao, q.linha + s * (meia - .14), CORR_H); pp(reg.teto, 'fios', M(x, yy, z, r() * 6)); }
      if (r() < mais(.25, e)) { const s = r() < .5 ? -1 : 1, ao = ini + 1 + r() * (fim - ini - 2), [x, yy, z] = P(ao, q.linha + s * (meia - .1), CORR_H); pp(reg.teto, 'corrente', M(x, yy, z, yawAo)); }
      // luminária caída perto de uma lâmpada morta (ou em 25% dos corredores)
      const mortas = (paineis || []).filter(p => p.ci === c.ci && p.morta);
      if (mortas.length || r() < mais(.25, e)) {
        const ao = mortas.length ? (q.h ? mortas[0].p.x : mortas[0].p.z) + .4 : ini + r() * (fim - ini), s = r() < .5 ? -1 : 1, [x, yy, z] = P(Math.min(fim - 1.3, ao), q.linha + s * (meia - .16), CORR_H);
        pp(reg.teto, 'luminaria_quebrada', M(x, yy, z, yawAo + (r() < .5 ? 0 : Math.PI)));
        const [xp, yp, zp] = P(Math.min(fim - 1.3, ao) + .6, q.linha + s * (meia - .45), 0); pp(reg.chao, 'placa_forro', M(xp, yp, zp, r() * 6));
      }
      // grelhas de ventilação (alto ou rente ao chão)
      for (let j = 0; j < 2; j++) if (r() < mais(.5, e)) { const s = r() < .5 ? -1 : 1, ao = ini + .5 + r() * (fim - ini - 1), alto = r() < .6, [x, yy, z] = P(ao, q.linha + s * meia, alto ? CORR_H - .45 : .28); pp(reg.chao, 'grelha', M(x, yy, z, yawDentro(s))); }
      if (r() < mais(.3, e)) { const s = r() < .5 ? -1 : 1, ao = ini + 1 + r() * (fim - ini - 2), [x, yy, z] = P(ao, q.linha + s * meia, 1.3); pp(reg.chao, 'quadro_eletrico', M(x, yy, z, yawDentro(s))); }
      // chão: entulho no pé da parede, papéis, ralo
      if (r() < mais(.55, e)) { const s = r() < .5 ? -1 : 1, ao = ini + r() * (fim - ini), [x, yy, z] = P(ao, q.linha + s * (meia - .16), 0); pp(reg.chao, 'entulho', M(x, yy, z, yawDentro(s))); }
      if (r() < mais(.5, e)) { const ao = ini + r() * (fim - ini), [x, yy, z] = P(ao, q.linha + (r() - .5) * 1.2, 0); pp(reg.chao, 'papeis', M(x, yy, z, r() * 6)); }
      if (r() < mais(.35, e)) { const ao = ini + 1 + r() * (fim - ini - 2), [x, yy, z] = P(ao, q.linha + (r() - .5) * .6, 0); pp(reg.chao, 'ralo', M(x, yy, z, r() * 6)); }
      // decalques do chão: poças (refletem a lanterna), arrasto de sangue, pegadas
      let yd = .007;
      const SANG = { arrasto: 1, pegadas: 1, respingo: 1, maos: 1, unhas: 1 }, corS = nome => SANG[nome] && r() < e * 1.2 ? [1.55, .8, .8] : 1;
      const chao = (nome, ao, lat, ang, esc = 1) => { const d = DEC[nome], [x, , z] = P(ao, lat, 0); marcas.push(['d_' + nome, +x.toFixed(2), +z.toFixed(2)]); porQuad(T, reg.dec, d[0], d[1] * esc, d[2] * esc, M(x, yd, z, ang, -Math.PI / 2), corS(nome)); yd += .0012; };
      for (let j = 0; j < 1 + (r() < .5); j++) chao('poca', ini + r() * (fim - ini), q.linha + (r() - .5) * 1.4, r() * 6, .7 + r() * .7);
      chao('fuligem', ini + r() * (fim - ini), q.linha + (r() - .5) * 1.4, r() * 6, 1.2);
      if (r() < mais(.45, e)) { const ao = ini + 1.2 + r() * (fim - ini - 2.4); chao('arrasto', ao, q.linha + (r() - .5) * .8, yawAo + Math.PI / 2 + (r() - .5) * .5 + (r() < .5 ? Math.PI : 0)); }
      if (r() < mais(.25, e)) chao('pegadas', ini + 1 + r() * (fim - ini - 2), q.linha + (r() - .5) * .6, yawAo + Math.PI / 2 + (r() < .5 ? Math.PI : 0), 1.1);
      if (r() < mais(.3, e)) chao('respingo', ini + r() * (fim - ini), q.linha + (r() - .5) * 1.2, r() * 6, .8 + r() * .6);
      // paredes: infiltração do teto, mãos perto das portas, unhas, respingos, fuligem no pé
      const parede = (nome, ao, s, y, esc = 1, gira = 0, cor = null) => { const d = DEC[nome], [x, yy, z] = P(ao, q.linha + s * (meia - .012 - (yd - .007)), y); marcas.push(['d_' + nome, +x.toFixed(2), +z.toFixed(2)]); porQuad(T, reg.dec, d[0], d[1] * esc, d[2] * esc, M(x, yy, z, yawDentro(s), 0, gira), cor || corS(nome)); yd += .0012; };
      for (let j = 0; j < 2; j++) if (r() < mais(.7, e)) parede('infiltracao', ini + r() * (fim - ini), r() < .5 ? -1 : 1, CORR_H - .75, 1 + r() * .5);
      if (r() < mais(.7, e)) parede('maos', r() < .5 ? q.a0 + 1.1 + r() * .8 : q.a1 - 1.1 - r() * .8, r() < .5 ? -1 : 1, 1.0 + r() * .4, .9 + r() * .3, (r() - .5) * .3);
      if (r() < mais(.4, e)) parede('unhas', ini + r() * (fim - ini), r() < .5 ? -1 : 1, .9 + r() * .7, 1 + r() * .6, (r() - .5) * .5);
      if (r() < mais(.3, e)) parede('respingo', ini + r() * (fim - ini), r() < .5 ? -1 : 1, .8 + r() * .8, .8 + r() * .5);
      for (const s of [-1, 1]) if (r() < mais(.6, e)) parede('fuligem', ini + r() * (fim - ini), s, .45, 1.1 + r() * .6);
      // ---- degradação (andares de baixo): mais coisa caída e sinais de algo vivendo ali ----
      if (e > 0) {
        const nExtra = Math.round(e * (3 + 5 * r()));
        for (let j = 0; j < nExtra; j++) {
          const k = r(), ao = ini + r() * (fim - ini), s = r() < .5 ? -1 : 1;
          if (k < .3) { const [x, yy, z] = P(ao, q.linha + s * (meia - .16), 0); pp(reg.chao, 'entulho', M(x, yy, z, yawDentro(s))); }
          else if (k < .5) { const [x, yy, z] = P(ao, q.linha + (r() - .5) * 1.2, 0); pp(reg.chao, 'papeis', M(x, yy, z, r() * 6)); }
          else if (k < .7) { const [x, yy, z] = P(ao, q.linha + (r() - .5) * 1.4, 0); pp(reg.chao, 'placa_forro', M(x, yy, z, r() * 6)); }
          else if (k < .88) { const [x, yy, z] = P(ao, q.linha + s * (meia - .14), CORR_H); pp(reg.teto, 'fios', M(x, yy, z, r() * 6)); }
          else { const [x, yy, z] = P(Math.min(fim - 1.3, ao), q.linha + s * (meia - .16), CORR_H); pp(reg.teto, 'luminaria_quebrada', M(x, yy, z, yawAo + (r() < .5 ? 0 : Math.PI))); }
        }
        for (let j = 0; j < Math.round(e * 2 * r()); j++) chao('poca', ini + r() * (fim - ini), q.linha + (r() - .5) * 1.4, r() * 6, .9 + r() * .9);
        // arranhões em sequência pela parede (a mesma mão, andando)
        if (r() < Math.min(.9, e * 1.8)) {
          const s = r() < .5 ? -1 : 1, n = 5 + Math.floor(r() * 4), ao0 = ini + r() * Math.max(.1, fim - ini - n * .7);
          for (let i = 0; i < n; i++) parede('unhas', ao0 + i * (.62 + r() * .2), s, 1.05 + Math.sin(i * .9) * .3 + r() * .15, .85 + r() * .3, -.35 + (r() - .5) * .3, [.75, .6, .6]);
        }
        // rastro que some debaixo de uma porta (arrasto ou pegadas até a ponta do corredor)
        if (r() < Math.min(.9, e * 1.8)) {
          const ponta = r() < .5 ? 0 : 1, ao = ponta ? q.a1 - 1.3 : q.a0 + 1.3;
          chao(r() < .6 ? 'arrasto' : 'pegadas', ao, q.linha + (r() - .5) * .5, yawAo + Math.PI / 2 + (ponta ? Math.PI : 0), 1.0);
        }
        // manchas no teto (e marcas de mão lá em cima)
        for (let j = 0; j < Math.round(e * 5 * r()); j++) {
          const nome = ['respingo', 'maos', 'infiltracao'][Math.floor(r() * 3)], d = DEC[nome], ao = ini + r() * (fim - ini), [x, , z] = P(ao, q.linha + (r() - .5) * 1.4, 0);
          porQuad(T, reg.tdec, d[0], d[1], d[2], M(x, CORR_H - .006 - j * .001, z, r() * 6, Math.PI / 2), nome === 'infiltracao' ? 1 : [.55, .45, .4]); marcas.push(['t_' + nome, +x.toFixed(2), +z.toFixed(2)]);
        }
      }
    });
  }

  // salas (o desenho do Mestre fica intacto): só decalques planos, rente ao chão e às paredes, longe das portas
  // (botão vermelho e lâmpadas de alerta ficam ao lado dos vãos). Nada entra na colisão.
  function vestirSalas(T, W, lotePt) {
    const { S, ALT, CORR_W, a } = W, marcas = W.marcas || [], out = [];
    const m4 = new T.Matrix4(), q4 = new T.Quaternion(), eu = new T.Euler(), s1 = new T.Vector3(1, 1, 1), p3 = new T.Vector3();
    const M = (x, y, z, ry, rx = 0, rz = 0) => { eu.set(rx, ry, rz, 'YXZ'); q4.setFromEuler(eu); return m4.compose(p3.set(x, y, z), q4, s1); };
    const e = W.e || 0, sangue = 1 + e * 1.6;   // degradação do andar: mais sangue e mais sinais
    Object.values(S).forEach(s => {
      const r = rng(a * 15485863 + s.p * 7919 + 3), parede = criarLote();
      let yd = .008;
      const chao = (nome, x, z, ang, esc = 1) => { const d = DEC[nome]; porQuad(T, lotePt(x, z).dec, d[0], d[1] * esc, d[2] * esc, M(x, yd, z, ang, -Math.PI / 2), 1); yd += .0012; marcas.push(['d_' + nome, +x.toFixed(2), +z.toFixed(2)]); };
      const hx = (s.x1 - s.x0) / 2 - .5, hz = (s.z1 - s.z0) / 2 - .5;
      const pt = () => [s.cx + (r() - .5) * 2 * hx, s.cz + (r() - .5) * 2 * hz];
      // sala conservada: só um pouco de poeira nos cantos; nada de sangue, poça nem arranhão
      if (salaAbrigo(a, s)) {
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => chao('fuligem', s.cx + sx * (hx - .3), s.cz + sz * (hz - .3), Math.atan2(sx, sz) + Math.PI, 1.4 + r() * .4));
        out.push(parede); return;
      }
      // sujeira nos 4 cantos e no pé de algumas paredes
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => chao('fuligem', s.cx + sx * (hx - .3), s.cz + sz * (hz - .3), Math.atan2(sx, sz) + Math.PI, 2.2 + r()));
      for (let i = 0; i < 1 + (r() < .6) + (r() < .3) + Math.round(e * 2.5 * r()); i++) { const [x, z] = pt(); chao('poca', x, z, r() * 6, 1 + r() * 1.2 + e); }
      if (r() < .45 * sangue) { const [x, z] = pt(); chao('respingo', x, z, r() * 6, 1 + r() * .8); }
      if (r() < .25 * sangue) { const [x, z] = pt(); chao('pegadas', x, z, r() * 6, 1.2); }
      // arrasto de sangue saindo de um dos vãos para dentro da sala
      const vaos = Object.entries(s.vaos || {}).filter(([, v]) => v.ci >= 0);
      if (vaos.length && r() < .5 * sangue) {
        const [lado, v] = vaos[Math.floor(r() * vaos.length)], ent = 2.4 + r() * 1.5;
        const [x, z, ang] = lado === 'n' ? [v.centro, s.z0 + ent, 0] : lado === 's' ? [v.centro, s.z1 - ent, 0] : lado === 'w' ? [s.x0 + ent, v.centro, Math.PI / 2] : [s.x1 - ent, v.centro, Math.PI / 2];
        chao('arrasto', x, z, ang + (r() - .5) * .4, 1.1);
      }
      // paredes: infiltração do teto, fuligem no pé, unhas e mãos (fora da faixa de cada vão)
      const LADOS = { n: [s.x0, s.x1, s.z0, 0, 1], s: [s.x0, s.x1, s.z1, Math.PI, -1], w: [s.z0, s.z1, s.x0, Math.PI / 2, 1], e: [s.z0, s.z1, s.x1, -Math.PI / 2, -1] };
      const naParede = (nome, lado, u, y, esc = 1, gira = 0) => {
        const [, , fixo, yaw, sg] = LADOS[lado], d = DEC[nome], ns = lado === 'n' || lado === 's', off = sg * (.01 + (yd - .008));
        const x = ns ? u : fixo + off, z = ns ? fixo + off : u;
        porQuad(T, parede, d[0], d[1] * esc, d[2] * esc, M(x, y, z, yaw, 0, gira), 1); yd += .0012; marcas.push(['d_' + nome, +x.toFixed(2), +z.toFixed(2)]);
      };
      const livre = (lado, u, meia) => { const v = (s.vaos || {})[lado]; return !v || Math.abs(u - v.centro) > CORR_W / 2 + 1.4 + meia; };
      Object.keys(LADOS).forEach(lado => {
        const [u0, u1] = LADOS[lado], ach = (meia) => { for (let k = 0; k < 8; k++) { const u = u0 + 1 + meia + r() * (u1 - u0 - 2 - 2 * meia); if (livre(lado, u, meia)) return u; } return null; };
        for (let i = 0; i < 1 + (r() < .6); i++) { const esc = 1.6 + r() * 1.0, u = ach(DEC.infiltracao[1] * esc / 2); if (u !== null) naParede('infiltracao', lado, u, ALT - DEC.infiltracao[2] * esc / 2 - .02, esc); }
        for (let i = 0; i < 2; i++) { const esc = 1.3 + r() * .8, u = ach(DEC.fuligem[1] * esc / 2); if (u !== null) naParede('fuligem', lado, u, DEC.fuligem[2] * esc / 2 - .05, esc); }
        if (r() < .18 * sangue) { const u = ach(.5); if (u !== null) naParede('unhas', lado, u, .9 + r() * .8, 1.2 + r() * .6, (r() - .5) * .5); }
        if (r() < .15 * sangue) { const u = ach(.5); if (u !== null) naParede('maos', lado, u, 1.0 + r() * .5, 1 + r() * .3, (r() - .5) * .3); }
        if (r() < .12 * sangue) { const u = ach(.5); if (u !== null) naParede('respingo', lado, u, .8 + r() * 1.0, 1 + r() * .5); }
      });
      if (e > 0) {
        // arranhões em série numa parede e manchas no teto da sala
        if (r() < Math.min(.9, e * 1.4)) { const lado = Object.keys(LADOS)[Math.floor(r() * 4)], [u0, u1] = LADOS[lado], n = 5 + Math.floor(r() * 4), base = u0 + 1.5 + r() * Math.max(.1, u1 - u0 - 3 - n * .7);
          for (let i = 0; i < n; i++) { const u = base + i * (.62 + r() * .2); if (livre(lado, u, .3)) naParede('unhas', lado, u, 1.05 + Math.sin(i * .9) * .3, .9 + r() * .3, -.35); } }
        for (let j = 0; j < Math.round(e * 4 * r()); j++) { const nome = ['respingo', 'maos', 'infiltracao'][Math.floor(r() * 3)], d = DEC[nome], [x, z] = pt();
          porQuad(T, parede, d[0], d[1] * 1.4, d[2] * 1.4, M(x, ALT - .006 - j * .001, z, r() * 6, Math.PI / 2), nome === 'infiltracao' ? 1 : [.55, .45, .4]); marcas.push(['t_' + nome, +x.toFixed(2), +z.toFixed(2)]); }
      }
      out.push(parede);
    });
    return out;
  }

  /* ---------- estado por andar ---------- */
  let comumAtual = null, geracao = 0;
  const vivos = new Set();
  function desmontar(W) {
    const st = W && W.__mv2; if (!st) return;
    st.ab.forEach(l => l.forEach(z => { if (z.me.material === z.c) z.me.material = z.o; z.c.dispose(); })); st.ab.clear();
    st.mats.forEach(restaurar); st.mats.clear();
    st.grupos.forEach(g => { if (g.parent) g.parent.remove(g); g.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); });
    st.lixo.forEach(x => { try { x.dispose(); } catch (e) {} });
    if (st.ctx && st.ctx.animMundo) { const i = st.ctx.animMundo.indexOf(st.anim); if (i >= 0) st.ctx.animMundo.splice(i, 1); }
    if (st.ctx && st.ctx.v2casca === st.aoCasca) st.ctx.v2casca = null;
    delete W.__mv2; vivos.delete(W);
  }
  async function montar(ctx, W) {
    if (!W || !W.v2 || W.__mv2) return;
    const T = ctx.T;
    if (!ctx.ren.capabilities.isWebGL2) return;         // textureGrad: fica no V1 em quem só tem WebGL 1
    geracao++;
    const st = W.__mv2 = { ctx, mats: new Set(), grupos: [], lixo: [], on: false, ab: new Map() };
    let tex;
    const est = estilo(); st.estilo = est;
    try { tex = await carregar(T, est); } catch (e) { delete W.__mv2; return; }
    if (W.__mv2 !== st) return;                          // fechou ou trocou de andar enquanto baixava
    const V = W.v2;
    const ao = oclusaoAndar(T, V.S, V.CS, V.corr3D, V.CORR_W); st.lixo.push(ao.tex);
    const comum = { ao: { value: ao.tex }, aoR: { value: ao.r }, tex, v3: est === 'v3' };
    comumAtual = comum; st.comum = comum;
    const pat = (M, u) => { if (!M || !M.isMeshStandardMaterial) return; remendar(T, M, u, comum); st.mats.add(M); };
    // salas: piso, paredes e teto com a textura que a cena de cada sala pede (cor e identidade do V1 mantidas)
    const D = degr(W.a), E = extra(D); st.degradacao = D;
    const casca = s => {
      let ms = s.mats; if (!ms) return; const c = s.cena || {};
      // a sala conservada ganha materiais próprios (os da fábrica são compartilhados por cor: remendar o original
      // mudaria também as outras salas da mesma cor); os da casca anterior desta sala são liberados
      if (salaAbrigo(W.a, s)) {
        const velhos = st.ab.get(s); if (velhos) velhos.forEach(z => { st.mats.delete(z.c); restaurar(z.c); z.c.dispose(); });
        const novos = [], troca = new Map();
        const meu = M => { if (!M) return M; if (!troca.has(M)) troca.set(M, copiaMat(T, M)); return troca.get(M); };
        ms = { piso: meu(ms.piso), parede: meu(ms.parede), teto: meu(ms.teto) };
        (s.casca || []).forEach(me => { const n = troca.get(me.material); if (n) { novos.push({ me, o: me.material, c: n }); me.material = n; } });
        st.ab.set(s, novos);
      }
      const kp = (c.piso || {}).tex || 'concreto', kw = (c.parede || {}).tex || 'concreto', kt = (c.teto || {}).tex || 'concreto';
      const tp = PISO[kp], tw = PAREDE[kw], tt = TETO[kt];
      // sala central do 1º andar (abrigo): conservada, o mesmo concreto do V2 mas limpo e liso, sem poças,
      // sem descascar nem ruína; o V2 entra só na sombra assada e numa sujeira leve
      const ab = salaAbrigo(W.a, s), Ez = ab ? 0 : E, sj = ab ? .5 : 1;
      const rwP = !ab && tw && tw[0] !== L.metal && tw[0] !== L.acolchoado ? L.descascado : -1, rwC = !ab && tp && tp[0] !== L.grade ? L.concreto : -1;
      pat(ms.piso, { t: tp || [0, 1, 0, 1, 0], manter: !tp, molhado: ab ? 0 : Math.min(1, (MOLHADO[kp] ?? .4) * 1.15), topo: V.ALT, relevo: ab ? .7 : 1.3, escuro: ab ? .8 : .7, sat: .62, suj: 1.35 * sj, ex: Ez, ruina: rwC, ruinaM: 2.5 });
      pat(ms.parede, { t: tw || [0, 1, 0, 1, 0], manter: !tw, topo: V.ALT, relevo: 1.3, escuro: ab ? .74 : .66, sat: .6, suj: 1.4 * sj, ex: Ez, ruina: rwP, ruinaM: 2.2 });
      pat(ms.teto, { t: tt || [0, 1, 0, 1, 0], manter: !tt, topo: V.ALT, relevo: 1.2, escuro: ab ? .7 : .62, sat: .6, suj: 1.3 * sj, ex: Ez, ruina: !ab && tt ? L.concreto_teto : -1, ruinaM: 3 });
    };
    Object.values(V.S).forEach(casca);
    st.aoCasca = s => { try { casca(s); } catch (e) {} };
    ctx.v2casca = st.aoCasca;
    // corredores: papel de parede descascando, carpete encharcado, forro com placas faltando
    pat(V.corr.parede, { t: PAREDE.papel_parede, topo: V.CORR_H, relevo: 1, escuro: .62, sat: .62, ex: E, ruina: L.descascado, ruinaM: 2.2 });
    pat(V.corr.chao, { t: PISO.carpete_umido, molhado: .95, topo: V.CORR_H, relevo: 1, escuro: .7, sat: .6, ex: E, ruina: L.concreto, ruinaM: 2.5 });
    pat(V.corr.teto, { t: TETO.forro, topo: V.CORR_H, escuro: .7, sat: .6, ex: E, ruina: L.concreto_teto, ruinaM: 3 });
    // portas: chapa riscada (unhas), ferrugem e sangue; mesmos materiais (cache da fábrica), mesma geometria
    const portas = new Set();
    (V.portas || []).forEach(P => P && P.grps.forEach(g => g.traverse(o => { if (o.isMesh && o.material && o.material.userData && (o.material.userData.tex === 'porta_aco' || o.material.userData.tex === 'metal')) portas.add(o.material); })));
    portas.forEach(M => pat(M, { t: M.userData.tex === 'porta_aco' ? PAREDE.porta_aco : PAREDE.metal, topo: V.CORR_H, relevo: 1.2 + .6 * E, escuro: .85, metal: 1, suj: .5 + .9 * E, ex: E }));
    // peças do kit por região (4 x 4 do andar): chão/parede, teto (some com o teto na vista de fora) e decalques
    const kit = tex.pecas;
    const mKit = new T.MeshStandardMaterial({ map: tex.kitCor, normalMap: tex.kitNor, roughnessMap: tex.kitOrm, metalnessMap: tex.kitOrm, vertexColors: true, roughness: 1, metalness: 1, envMapIntensity: .3 });
    const mDec = new T.MeshStandardMaterial({ vertexColors: true, map: tex.kitCor, normalMap: tex.kitNor, roughnessMap: tex.kitOrm, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -4, roughness: 1, metalness: 0, envMapIntensity: .15 });
    mKit.color.setRGB(1 - .2 * E, 1 - .1 * E, 1 - .38 * E); mDec.color.setRGB(1 - .1 * E, 1 - .12 * E, 1 - .22 * E);
    st.lixo.push(mKit, mDec);
    const xs = Object.values(V.S).map(s => s.cx), zs = Object.values(V.S).map(s => s.cz);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const regs = new Map();
    const lotes = q => {
      const mx = (q.a0 + q.a1) / 2, cx = q.h ? mx : q.linha, cz = q.h ? q.linha : mx;
      const k = Math.min(3, Math.max(0, Math.floor((cx - minX) / ((maxX - minX) / 4 + 1e-6)))) + 4 * Math.min(3, Math.max(0, Math.floor((cz - minZ) / ((maxZ - minZ) / 4 + 1e-6))));
      if (!regs.has(k)) regs.set(k, { chao: criarLote(), teto: criarLote(), dec: criarLote(), tdec: criarLote() });
      return regs.get(k);
    };
    st.marcas = [];
    vestirCorredores(T, { CS: V.CS, corr3D: V.corr3D, CORR_W: V.CORR_W, CORR_H: V.CORR_H, a: W.a, e: E, paineis: V.paineis, marcas: st.marcas }, kit, lotes);
    // salas: decalques no chão (entram nas regiões) e nas paredes (uma malha por sala: some na vista de fora)
    const lotePt = (x, z) => lotes({ h: true, a0: x, a1: x, linha: z });
    const salasDec = vestirSalas(T, { S: V.S, ALT: V.ALT, CORR_W: V.CORR_W, a: W.a, e: E, marcas: st.marcas }, lotePt);
    let tri = 0;
    const gBaixo = new T.Group(), gTeto = new T.Group(); gBaixo.name = 'mapa_v2'; gTeto.name = 'mapa_v2_teto';
    regs.forEach(r => {
      [['chao', mKit, gBaixo], ['teto', mKit, gTeto], ['dec', mDec, gBaixo], ['tdec', mDec, gTeto]].forEach(([k, mat, pai]) => {
        if (!r[k].n) return; const g = geometria(T, r[k]); tri += r[k].idx.length / 3;
        const me = new T.Mesh(g, mat); me.matrixAutoUpdate = false; me.raycast = () => {}; me.userData.t = '_mapa_v2';
        me.castShadow = mat === mKit; me.receiveShadow = true; if (mat === mDec) me.renderOrder = 1;
        pai.add(me);
      });
    });
    const gSalas = new T.Group(); gSalas.name = 'mapa_v2_salas';
    salasDec.forEach(l => { if (!l.n) return; const me = new T.Mesh(geometria(T, l), mDec); me.matrixAutoUpdate = false; me.raycast = () => {}; me.userData.t = '_mapa_v2'; me.renderOrder = 1; me.receiveShadow = true; tri += l.idx.length / 3; gSalas.add(me); });
    V.raiz.add(gBaixo, gSalas); V.tetos.add(gTeto); st.grupos.push(gBaixo, gTeto, gSalas);
    // longe (mais de 40 m, já quase sumido na névoa): as regiões do kit nem são desenhadas
    const vC = new T.Vector3();
    // vista de fora (teto escondido): peças e decalques do kit não são desenhados (pequenos demais lá de cima; cortam ~70 chamadas)
    st.anim = () => { const cam = ctx.camera; if (!cam) return; const dentro = V.tetos.visible; [gBaixo, gTeto, gSalas].forEach(g => g.children.forEach(me => { if (!dentro) { me.visible = false; return; } const b = me.geometry.boundingBox; vC.copy(cam.position).clamp(b.min, b.max); me.visible = vC.distanceTo(cam.position) < 40; })); };
    ctx.animMundo.push(st.anim);
    st.tri = tri; st.on = true; vivos.add(W);
    if (ctx.aquecer) { ctx.aquecer(gBaixo); ctx.aquecer(gTeto); ctx.aquecer(gSalas); }
  }
  // troca ao vivo (seletor de qualidade com o 3D aberto)
  function aplicarQualidade(on) {
    const S3 = window.Sala3D, api = S3 && S3.aberta ? S3._api : null, W = api && api.mundo;
    if (!W) return;
    if (on && !W.__mv2) montar(api.ctx, W); else if (!on && W.__mv2) desmontar(W);
  }
  NS().mapaV2 = {
    DEGRADACAO, montar,
    // fotos de comparação: remonta o andar aberto com outra degradação (null volta ao valor do andar)
    degradacaoTeste(d) { degrForcada = d; aplicarQualidade(false); aplicarQualidade(true); },
    // piloto V3: 'v2' | 'v3' (remonta o andar aberto); no aparelho, 'acf-mapa-estilo' no localStorage escolhe o padrão
    estiloTeste(e) { estiloForcado = e; aplicarQualidade(false); aplicarQualidade(true); }, desmontar, aplicarQualidade,
    marcas() { const W = [...vivos][0]; return W && W.__mv2 ? W.__mv2.marcas : []; },
    estado() { const W = [...vivos][0]; const st = W && W.__mv2; return { ativo: !!(st && st.on), andar: W ? W.a : null, estilo: st ? st.estilo : null, degradacao: st ? st.degradacao : null, materiais: st ? st.mats.size : 0, triKit: st ? st.tri : 0, malhasKit: st ? st.grupos.reduce((n, g) => n + g.children.length, 0) : 0 }; },
  };
  window.MapaV2 = NS().mapaV2;
})();
