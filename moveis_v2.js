/* Móveis V2 (qualidades Média e Alta): os móveis mais usados das salas trocam de aparência por modelos do Blender
   (modelos/moveis_v2/) e a carne e o sangue ganham texturas novas (úmidas, com relevo).
   NÃO muda nada de lugar nem de regra: a colisão, o esconderijo, o clique e a fusão das malhas continuam calculados
   com a peça do V1. O modelo novo é encaixado na mesma caixa da peça antiga e pintado com a cor que o Mestre escolheu
   (cor de vértice = oclusão do modelo x cor do Mestre). Todas as peças usam UM material, então a fusão da sala junta
   todos os móveis novos numa chamada de desenho só.
   Na qualidade Leve este arquivo nem é baixado. */
(() => {
  'use strict';
  const NS = () => (window.ACF3D = window.ACF3D || {});
  const BASE = 'modelos/moveis_v2/';
  // versão dos arquivos dos móveis (própria: trocar só quando um arquivo daqui mudar; antes era a do sala3d.js, e cada
  // entrega do site fazia todo aparelho baixar tudo de novo)
  const ARQ_V = '20261107a';
  const url = a => BASE + a + '?v=' + ARQ_V;
  let forcado = null;   // só para fotos de comparação (MoveisV2.teste)
  const ligado = () => { if (forcado !== null) return forcado; try { const Q = window.ACF_QUALIDADE; return !!(Q && typeof Q.v2 === 'function' && Q.v2()); } catch (e) { return false; } };
  // um <script> por endereço na página toda (mapa, móveis e tokens pedem as mesmas bibliotecas ao mesmo tempo)
  const script = src => (NS().scripts = NS().scripts || {})[src] || (NS().scripts[src] = new Promise((ok, falha) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = e => { delete NS().scripts[src]; s.remove(); falha(e); }; document.head.appendChild(s); }));

  /* ---------- cor do Mestre por peça: slot -> [parâmetro da cena, padrão do V1] ---------- */
  const TINTA = {
    cadeira: { a: ['c', '#2c2c2c'] },
    mesa: { a: ['c', '#6e5a44'], p: [null, '#555555'] },
    armario_metal: { a: ['c', '#59656e'] },
    arquivo: { a: ['c', '#8d969e'] },
    cama: { a: ['ferro', '#3b3f44'], b: ['colchao', '#d8d3c4'], c: ['lencol', '#e8e6df'] },
    beliche: { a: ['ferro', '#3b3f44'], b: ['colchao', '#d8d3c4'], c: ['lencol', '#e8e6df'] },
    maca: { c: ['lencol', '#e8e8e2'] },
    cadeira_plastico: { a: ['c', '#d35400'] },
    banco_madeira: { a: ['c', '#6a4b2c'] },
    caixa_metal: { a: ['c', '#3a3c3e'] },
    lixeira: { a: ['c', '#4a4e52'] },
    armario: { a: ['c', '#e5e7e9'] },
    estante: { a: [null, '#5d6d7e'] },
    luminaria: { a: [null, '#d6d4cc'] },
  };
  // acerto de brilho por tipo (medido com a lanterna perto, comparado ao V1): o armário de vestiário do V1 é metal
  // escuro e quase não devolve a luz da lanterna; a pintura do V2 devolvia o dobro
  const BRILHO = { armario_metal: .32 };
  const TIPOS = new Set(['cadeira', 'caixote', 'mesa', 'mesa_metal', 'armario_metal', 'arquivo', 'cama', 'beliche', 'maca',
    'cadeira_plastico', 'banco_madeira', 'caixa_metal', 'lixeira', 'carrinho', 'estante_pastas', 'estante', 'armario', 'luminaria']);

  /* ---------- carregamento (uma vez por sessão; o sw.js guarda os arquivos com ?v=) ---------- */
  const ARQS = ['moveis_cor.webp', 'moveis_nor.webp', 'moveis_orm.webp', 'carne_cor.webp', 'carne_nor.webp', 'carne_mr.webp', 'sangue_cor.webp',
    'sangue_nor.webp', 'pastas_cor.webp', 'pastas_nor.webp', 'mancha_cor.webp', 'mancha_nor.webp', 'moveis_v2.glb'];
  let kit = null, prometido = null;
  function lerAttr(a) {
    const n = a.count, k = a.itemSize, out = new Float32Array(n * k), arr = a.array;
    let div = 1;
    if (a.normalized) div = arr instanceof Int8Array ? 127 : arr instanceof Uint8Array ? 255 : arr instanceof Int16Array ? 32767 : arr instanceof Uint16Array ? 65535 : 1;
    const st = a.isInterleavedBufferAttribute ? a.data.stride : k, of = a.isInterleavedBufferAttribute ? a.offset : 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) { const v = arr[i * st + of + j] / div; out[i * k + j] = a.normalized ? Math.max(v, -1) : v; }
    return out;
  }
  function carregar(T) {
    if (prometido) return prometido;
    prometido = (async () => {
      if (!T.GLTFLoader) await script('lib/GLTFLoader.js?v=r128');
      if (!window.MeshoptDecoder) await script('lib/meshopt_decoder.js?v=r128');
      await window.MeshoptDecoder.ready;
      const tl = new T.TextureLoader();
      const tex = (a, srgb, rep) => new Promise((ok, falha) => tl.load(url(a), t => { t.encoding = srgb ? T.sRGBEncoding : T.LinearEncoding; t.anisotropy = 4; if (rep) t.wrapS = t.wrapT = T.RepeatWrapping; ok(t); }, undefined, falha));
      const ld = new T.GLTFLoader(); ld.setMeshoptDecoder(window.MeshoptDecoder);
      const [cor, nor, orm, cCor, cNor, cMr, sCor, sNor, pCor, pNor, mCor, mNor, gltf] = await Promise.all([
        tex('moveis_cor.webp', true), tex('moveis_nor.webp'), tex('moveis_orm.webp'),
        tex('carne_cor.webp', true, 1), tex('carne_nor.webp', false, 1), tex('carne_mr.webp', false, 1),
        tex('sangue_cor.webp', true), tex('sangue_nor.webp'), tex('pastas_cor.webp', true), tex('pastas_nor.webp'),
        tex('mancha_cor.webp', true), tex('mancha_nor.webp'),
        new Promise((ok, falha) => ld.load(url('moveis_v2.glb'), ok, undefined, falha))]);
      const mat = new T.MeshStandardMaterial({ color: 0xffffff, map: cor, normalMap: nor, roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1, vertexColors: true });
      mat.userData.moveisV2 = 1;
      // lombadas das pastas com etiqueta e número: textura própria (1024 px por metro), um material a mais por sala
      const matPastas = new T.MeshStandardMaterial({ color: 0xffffff, map: pCor, normalMap: pNor, roughness: .82, metalness: 0, vertexColors: true });
      matPastas.userData.moveisV2 = 1;
      // partes: geometria no espaço da peça (a matriz do nó entra aqui) e oclusão por vértice
      const tipos = {};
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(o => {
        if (!o.isMesh) return;
        const [tipo, parte, slot] = o.name.split('__'); if (!tipo || !parte) return;
        const g = o.geometry, m = o.matrixWorld, nm = new T.Matrix3().getNormalMatrix(m), v = new T.Vector3();
        const pos = lerAttr(g.attributes.position), nr = g.attributes.normal ? lerAttr(g.attributes.normal) : null;
        const uv = lerAttr(g.attributes.uv), ca = g.attributes.color ? lerAttr(g.attributes.color) : null, n = g.attributes.position.count;
        for (let i = 1; i < uv.length; i += 2) uv[i] = 1 - uv[i];   // glTF tem v para baixo; o atlas é lido com v para cima
        const ao = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(m); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
          if (nr) { v.set(nr[i * 3], nr[i * 3 + 1], nr[i * 3 + 2]).applyMatrix3(nm).normalize(); nr[i * 3] = v.x; nr[i * 3 + 1] = v.y; nr[i * 3 + 2] = v.z; }
          ao[i] = ca ? ca[i * g.attributes.color.itemSize] : 1;
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        if (nr) geo.setAttribute('normal', new T.BufferAttribute(nr, 3));
        geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
        if (g.index) geo.setIndex(new T.BufferAttribute(Uint32Array.from(g.index.array), 1));
        if (!nr) geo.computeVertexNormals();
        geo.computeBoundingBox(); geo.computeBoundingSphere();
        (tipos[tipo] = tipos[tipo] || { partes: {}, caixa: new T.Box3() }).partes[parte] = { geo, ao, slot: slot || null, mat: /^pastas/.test(parte) ? matPastas : mat };
        tipos[tipo].caixa.union(geo.boundingBox);
      });
      // sangue: uma textura por estilo (célula do atlas 2 x 2)
      const CEL = { respingo: [0, .5], poca: [.5, .5], escorrido: [0, 0], mao: [.5, 0] };
      const celula = (t, k) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(.5, .5); c.offset.set(...CEL[k]); return c; };
      const sangue = {};
      Object.keys(CEL).forEach(k => {
        const m = new T.MeshStandardMaterial({ map: celula(sCor, k), normalMap: celula(sNor, k), roughness: .22, metalness: .05, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
        m.normalScale.set(.5, .5); m.userData.moveisV2 = 1; sangue[k] = m;
      });
      // manchas de parede: atlas de duas células altas (infiltração, fuligem com arrasto de mão)
      const manchaCel = [0, .5].map(ox => [mCor, mNor].map(t => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(.5, 1); c.offset.set(ox, 0); return c; }));
      kit = { T, mat, matPastas, tipos, mancha: { cel: manchaCel, mats: new Map() }, carne: { cor: cCor, nor: cNor, mr: cMr, porRep: new Map(), porMat: new Map() }, sangue };
      return kit;
    })();
    prometido.catch(e => { console.warn('móveis V2: não carregou', e); prometido = null; });
    return prometido;
  }

  /* ---------- montagem de uma peça ---------- */
  const caixaLocal = (T, o, so) => {
    // caixa das malhas do V1 no espaço do objeto (o objeto pode estar girado: a caixa do mundo não serve)
    const inv = new T.Matrix4().copy(o.matrixWorld).invert(), b = new T.Box3(), t = new T.Box3(), m = new T.Matrix4();
    o.traverse(x => {
      if (!x.isMesh || (so && !so(x))) return;
      if (!x.geometry.boundingBox) x.geometry.computeBoundingBox();
      t.copy(x.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv, x.matrixWorld)); b.union(t);
    });
    return b;
  };
  // encaixe: o modelo novo ocupa exatamente a caixa do V1 (centro em x e z, apoiado no chão da caixa)
  function encaixe(T, cxV2, alvo) {
    const s1 = alvo.getSize(new T.Vector3()), s0 = cxV2.getSize(new T.Vector3());
    const sx = s1.x / Math.max(1e-3, s0.x), sy = s1.y / Math.max(1e-3, s0.y), sz = s1.z / Math.max(1e-3, s0.z);
    const c1 = alvo.getCenter(new T.Vector3()), c0 = cxV2.getCenter(new T.Vector3());
    return new T.Matrix4().makeTranslation(c1.x - c0.x * sx, alvo.min.y - cxV2.min.y * sy, c1.z - c0.z * sz).multiply(new T.Matrix4().makeScale(sx, sy, sz));
  }
  const caixaPartes = (T, K, so) => { const b = new T.Box3(); Object.entries(K.partes).forEach(([p, P]) => { if (so(p)) b.union(P.geo.boundingBox); }); return b; };
  const GAMA = 1.6;
  const hash = (s, i) => { let h = (s * 2654435761 + i * 40503) >>> 0; h ^= h >>> 15; return (h >>> 0) / 4294967296; };

  // lista de [parte, matriz] (espaço do objeto) para cada tipo
  function montagem(T, tipo, o, it, K) {
    const out = [], todas = Object.keys(K.partes);
    const tudo = (m, filtro) => todas.forEach(p => { if (!filtro || filtro(p)) out.push([p, m]); });
    if (tipo === 'caixote') {
      // cada caixa do V1 (são 1 a 4, empilhadas e giradas) vira um caixote novo no mesmo lugar
      o.children.forEach(ch => {
        if (!ch.isMesh) return; if (!ch.geometry.boundingBox) ch.geometry.computeBoundingBox();
        ch.updateMatrix(); const m = ch.matrix.clone().multiply(encaixe(T, K.caixa, ch.geometry.boundingBox)); tudo(m);
      });
      return out;
    }
    if (tipo === 'mesa' || tipo === 'mesa_metal') {
      const b = caixaLocal(T, o), w = b.max.x - b.min.x, d = b.max.z - b.min.z, cx = (b.max.x + b.min.x) / 2, cz = (b.max.z + b.min.z) / 2, y0 = b.min.y;
      const base = new T.Matrix4().makeTranslation(cx, y0, cz);
      const esticado = base.clone().multiply(new T.Matrix4().makeScale(w, 1, d));
      const nx = Math.max(1, Math.round(w)), nz = Math.max(1, Math.round(d)), pw = w / nx, pd = d / nz;
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++)
        out.push(['tampo', base.clone().multiply(new T.Matrix4().makeTranslation(-w / 2 + pw * (i + .5), 0, -d / 2 + pd * (j + .5))).multiply(new T.Matrix4().makeScale(pw, 1, pd))]);
      ['saia', 'borda'].forEach(p => { if (K.partes[p]) out.push([p, esticado]); });
      if (K.partes.ralo) { const c = K.partes.ralo.geo.boundingBox.getCenter(new T.Vector3()); out.push(['ralo', base.clone().multiply(new T.Matrix4().makeTranslation(c.x * (w - 1), 0, c.z * (d - 1)))]); }
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c]) => out.push(['perna', base.clone().multiply(new T.Matrix4().makeTranslation(a * (w / 2 - .06), 0, c * (d / 2 - .06)))]));
      if (K.partes.travessa) [-1, 1].forEach(c => out.push(['travessa', base.clone().multiply(new T.Matrix4().makeTranslation(0, 0, c * (d / 2 - .06))).multiply(new T.Matrix4().makeScale(w - .1, 1, 1))]));
      return out;
    }
    if (tipo === 'armario_metal') {
      const b = caixaLocal(T, o, x => x.geometry.type === 'BoxGeometry' && x.geometry.parameters && x.geometry.parameters.depth >= .4);
      const n = Math.max(1, it.n || 1), w = (b.max.x - b.min.x + .02) / n, h = b.max.y - b.min.y, sem = it.sem || 1;
      const comSangue = new Set(); for (let i = 0; i < n; i++) if (hash(sem, i) < .34) comSangue.add(i);
      for (let i = 0; i < n; i++) {
        const x = b.min.x - .01 + w * (i + .5);
        const m = new T.Matrix4().makeTranslation(x, b.min.y, (b.max.z + b.min.z) / 2).multiply(new T.Matrix4().makeScale(w / .5, h / 1.9, 1));
        tudo(m, p => p !== 'sangue' || comSangue.has(i));
      }
      return out;
    }
    if (tipo === 'cadeira_plastico' || tipo === 'banco_madeira') {
      // fileira: n lugares lado a lado (cadeira a cada esp, banco a cada 0,6 m); cada lugar ocupa a caixa de um lugar do V1
      const b = caixaLocal(T, o), n = Math.max(1, it.n || 1), esp = tipo === 'banco_madeira' ? .6 : (it.esp || .62), larg = tipo === 'banco_madeira' ? .5 : .47;
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * esp, um = n === 1 ? b : new T.Box3(new T.Vector3(x - larg / 2, b.min.y, b.min.z), new T.Vector3(x + larg / 2, b.max.y, b.max.z));
        tudo(encaixe(T, K.caixa, um));
      }
      return out;
    }
    if (tipo === 'estante_pastas' || tipo === 'estante') {
      // montada na largura e na altura da cena, em pedaços de cerca de 1 m (a textura não estica): lados, fundo,
      // prateleiras na mesma altura das do V1 e, em cada pedaço de prateleira, uma das duas fileiras sorteada
      const b = caixaLocal(T, o), w = b.max.x - b.min.x, h = b.max.y - b.min.y, cz = (b.max.z + b.min.z) / 2, cx = (b.max.x + b.min.x) / 2, y0 = b.min.y;
      const M = (x, y, z, sx, sy, sz) => new T.Matrix4().makeTranslation(cx + x, y, z).multiply(new T.Matrix4().makeScale(sx, sy, sz));
      const lado = tipo === 'estante' ? .05 : .04, sem = it.sem || 1;
      const ny = Math.max(1, Math.round(h)), ph = h / ny;
      for (let j = 0; j < ny; j++) [-1, 1].forEach(s => out.push(['lado', M(s * (w / 2 - lado / 2), y0 + j * ph, cz, 1, ph, 1)]));
      const nx = Math.max(1, Math.round(w - .1)), pw = (w - .02) / nx;
      if (K.partes.fundo) for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) out.push(['fundo', M(-w / 2 + .01 + pw * (i + .5), y0 + j * ph, cz, pw, ph, 1)]);
      const ys = []; if (tipo === 'estante_pastas') { const n = Math.floor(h / .45); for (let k = 0; k < n; k++) ys.push(.08 + k * .45); } else for (let i = 0; i < 6; i++) ys.push(.05 + i * (h - .1) / 5.6);
      const pe = (w - .1) / nx;
      ys.forEach((y, k) => {
        for (let i = 0; i < nx; i++) {
          out.push(['prat', M(-w / 2 + .01 + pw * (i + .5), y0 + y, cz, pw, 1, 1)]);
          if (y + .38 >= h) continue;
          const v = hash(sem, k * 31 + i) < .5 ? '' : '2', m = M(-w / 2 + .05 + pe * (i + .5), y0 + y + .012, cz, pe, 1, 1);
          if (tipo === 'estante_pastas') out.push(['pastas' + v, m]); else { out.push(['caixas' + v, m]); out.push(['etiquetas' + v, m]); }
        }
      });
      return out;
    }
    if (tipo === 'luminaria') {
      // a calha nova vai na caixa da calha do V1 (z = 0 do modelo na base dela); o tubo aceso do V1 fica onde está
      const calha = o.children.find(c => c.isMesh && !acesa(c)); if (!calha) return out;
      const b = caixaLocal(T, o, x => x === calha), c = b.getCenter(new T.Vector3());
      tudo(new T.Matrix4().makeTranslation(c.x, b.min.y, c.z).multiply(new T.Matrix4().makeScale((b.max.x - b.min.x), 1, (b.max.z - b.min.z) / .22)));
      return out;
    }
    if (tipo === 'beliche') {
      const ninho = o.children.find(ch => ch.isGroup);
      const baixo = caixaLocal(T, o, x => !ninho || !isDentro(x, ninho)), alto = ninho ? caixaLocal(T, o, x => isDentro(x, ninho)) : null;
      const semLencol = p => p !== 'lencol' || it.lencol !== false;
      tudo(encaixe(T, K.caixa, baixo), semLencol); if (alto && !alto.isEmpty()) tudo(encaixe(T, K.caixa, alto), semLencol);
      return out;
    }
    if (tipo === 'arquivo') {
      // encaixe pelo corpo fechado (a gaveta aberta não pode esticar o arquivo para a frente); a 3ª gaveta sai
      // puxada, com as pastas dentro, quando a cena diz "aberta"
      const corpo = o.children.find(c => c.isMesh), ABERTA = /^(gaveta|papeis|vao)/, FECHADA = /^frente/;
      const m = encaixe(T, caixaPartes(T, K, p => !ABERTA.test(p)), caixaLocal(T, o, x => x === corpo));
      tudo(m, p => it.aberta ? !FECHADA.test(p) : !ABERTA.test(p));
      return out;
    }
    const filtro = tipo === 'cama' ? (p => p !== 'lencol' || it.lencol !== false) : tipo === 'maca' ? (p => p !== 'lencol' || !!it.lencol) : null;
    tudo(encaixe(T, K.caixa, caixaLocal(T, o)), filtro);
    return out;
  }
  const acesa = x => !!(x.isMesh && x.material && !Array.isArray(x.material) && x.material.emissive && (x.material.emissive.r || x.material.emissive.g || x.material.emissive.b) && x.material.emissiveIntensity > .05);
  const isDentro = (x, pai) => { for (let p = x; p; p = p.parent) if (p === pai) return true; return false; };

  function trocarPeca(T, o, it, desc) {
    const tipo = String(o.userData.t || ''), K = kit.tipos[tipo === 'beliche' ? 'cama' : tipo]; if (!K) return false;
    const ms = []; o.traverse(x => { if (x.isMesh) ms.push(x); });
    if (!ms.length) return false;
    o.updateMatrixWorld(true);
    const lista = montagem(T, tipo, o, it || {}, K); if (!lista.length) return false;
    const sombra = ms[0].castShadow, recebe = ms[0].receiveShadow;
    // fora: as malhas do V1 (a colisão e o esconderijo já foram calculados com elas)
    // (a luminária guarda o tubo aceso do V1: é ele que liga, desliga e pisca)
    o.children.slice().forEach(ch => { if ((ch.isMesh || ch.isGroup) && !(tipo === 'luminaria' && acesa(ch))) o.remove(ch); });
    const tin = TINTA[tipo] || {}, cores = {};
    Object.entries(tin).forEach(([s, [par, pad]]) => {
      const c = new T.Color(); try { c.set((par && it && it[par]) || pad); } catch (e) { c.set(pad); }
      // a textura nova é clara (quem escurece é a cor): curva para a cor escura do Mestre continuar escura na tela, como no V1
      const k = BRILHO[tipo] || 1;
      c.setRGB(Math.pow(c.r, GAMA) * k, Math.pow(c.g, GAMA) * k, Math.pow(c.b, GAMA) * k); cores[s] = c;
    });
    const branco = new T.Color(1, 1, 1);
    lista.forEach(([p, m]) => {
      const P = K.partes[p]; if (!P) return;
      const c = (P.slot && cores[P.slot]) || branco, n = P.ao.length, cor = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = P.ao[i]; cor[i * 3] = a * c.r; cor[i * 3 + 1] = a * c.g; cor[i * 3 + 2] = a * c.b; }
      const g = new T.BufferGeometry();
      ['position', 'normal', 'uv'].forEach(k => { if (P.geo.attributes[k]) g.setAttribute(k, P.geo.attributes[k]); });
      g.setIndex(P.geo.index); g.setAttribute('color', new T.BufferAttribute(cor, 3));
      g.boundingBox = P.geo.boundingBox; g.boundingSphere = P.geo.boundingSphere;
      const me = new T.Mesh(g, P.mat || kit.mat); me.matrixAutoUpdate = false; me.matrix.copy(m); me.castShadow = sombra; me.receiveShadow = recebe; me.userData.v2 = p;
      o.add(me); if (desc) desc.push(g);
      if (o.userData.estaticas) o.userData.estaticas.add(me);   // peça com animação (luminária que pisca): a calha nova é parada
    });
    o.userData.moveisV2 = true;
    return true;
  }

  /* ---------- carne e sangue: troca a pele no próprio material (vale para salas e corredores) ---------- */
  function patchCarne(T, M) {
    if (M.userData.carneV2 || !M.isMeshStandardMaterial || M.transparent || M.alphaTest > 0 || M.alphaMap) return;   // recorte com alfa (poça, mancha): fica o V1
    const C = kit.carne, rep = M.map ? M.map.repeat : { x: 1, y: 1 }, k = rep.x + 'x' + rep.y;
    let tx = C.porRep.get(k);
    if (!tx) { tx = ['cor', 'nor', 'mr'].map(n => { const t = C[n].clone(); t.needsUpdate = true; t.repeat.set(rep.x, rep.y); return t; }); C.porRep.set(k, tx); }
    // cor do Mestre só como um tom leve por cima (a textura nova já é carne de verdade)
    const c = M.color, mx = Math.max(c.r, c.g, c.b, 1e-3);
    M.userData.carneV2 = { map: M.map, cor: c.clone(), r: M.roughness, nm: M.normalMap, rm: M.roughnessMap };
    M.color.setRGB(.55 + .45 * c.r / mx, .55 + .45 * c.g / mx, .55 + .45 * c.b / mx);
    M.map = tx[0]; M.normalMap = tx[1]; M.roughnessMap = tx[2]; M.roughness = 1; M.normalScale.set(1.1, 1.1); M.needsUpdate = true;
    C.porMat.set(M, true);
  }
  function desfazerCarne() {
    if (!kit) return;
    kit.carne.porMat.forEach((_, M) => { const v = M.userData.carneV2; if (!v) return; M.map = v.map; M.color.copy(v.cor); M.roughness = v.r; M.normalMap = v.nm; M.roughnessMap = v.rm; delete M.userData.carneV2; M.needsUpdate = true; });
    kit.carne.porMat.clear();
  }
  function trocarPele(T, grupo) {
    grupo.traverse(x => {
      if (!x.isMesh || !x.material || Array.isArray(x.material)) return;
      const M = x.material;
      if (M.userData && (M.userData.tex === 'carne' || M.userData.tex === 'p5_carne')) patchCarne(T, M);
    });
  }
  function trocarSangue(o, it, desc) {
    const est = (it && it.estilo) || 'respingo', m = kit.sangue[est] || kit.sangue.respingo;
    o.traverse(x => {
      if (!x.isMesh) return;
      // o atlas de decalques do V1 pode ter levado o uv para um canto da textura dele: volta ao plano inteiro
      const g = x.geometry, uv = g.attributes.uv;
      if (uv && uv.count === 4) { const g2 = g.clone(); g2.setAttribute('uv', new kit.T.BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2)); x.geometry = g2; if (desc) desc.push(g2); }
      x.material = m;
    });
  }

  // mancha de parede: o plano do V1 fica, ganha a textura nova (célula e espelho sorteados pela peça) e a cor da cena
  const MANCHA_REF = [0x1a / 0x1a, 0x12 / 0x1a, 0x0a / 0x1a];
  function trocarMancha(o, it, desc) {
    const T = kit.T, sem = (it && it.sem) || o.userData.i + 1 || 1, cel = hash(sem, 7) < .5 ? 0 : 1, esp = hash(sem, 11) < .5;
    const c = new T.Color(); try { c.set((it && it.c) || '#1a120a'); } catch (e) { c.set('#1a120a'); }
    const mx = Math.max(c.r, c.g, c.b, 1e-3), t = [c.r / mx / MANCHA_REF[0], c.g / mx / MANCHA_REF[1], c.b / mx / MANCHA_REF[2]].map(v => Math.min(1, v));
    const chave = cel + '|' + c.getHexString(); let m = kit.mancha.mats.get(chave);
    if (!m) {
      const [cor, nor] = kit.mancha.cel[cel];
      m = new T.MeshStandardMaterial({ map: cor, normalMap: nor, roughness: .88, metalness: 0, transparent: true, opacity: .9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      m.color.setRGB(.4 + .6 * t[0], .4 + .6 * t[1], .4 + .6 * t[2]); m.normalScale.set(.7, .7); m.userData.moveisV2 = 1; kit.mancha.mats.set(chave, m);
    }
    o.traverse(x => {
      if (!x.isMesh || !x.geometry.attributes.uv || x.geometry.attributes.uv.count !== 4) return;
      const g2 = x.geometry.clone(); g2.setAttribute('uv', new T.BufferAttribute(new Float32Array(esp ? [1, 1, 0, 1, 1, 0, 0, 0] : [0, 1, 1, 1, 0, 0, 1, 0]), 2));
      x.geometry = g2; if (desc) desc.push(g2); x.material = m;
    });
    o.userData.moveisV2 = true;
  }

  /* ---------- uma sala: chamada pelo sala3d.js depois das colisões e antes da fusão ---------- */
  function trocar(T, g, cena, desc) {
    if (!kit || !ligado()) return 0;
    const itens = (cena && cena.itens) || []; let n = 0;
    g.children.forEach(o => {
      const u = o.userData || {}, t = String(u.t || '');
      // a luminária pode ter interruptor (só o tubo aceso muda) ou piscar (a calha é parada): entra mesmo assim
      const lum = t === 'luminaria' && !u.aoInter && !u.uso && (!u.int || u.int.m === 'ligar') && (!u.din || u.estaticas);
      if (u.moveisV2 || (!lum && (u.int || u.aoInter || u.din || u.uso || u.folha || u.temFolha))) return;
      const it = typeof u.i === 'number' ? itens[u.i] : null;
      try {
        if (t === 'sangue') { trocarSangue(o, it, desc); n++; }
        else if (t === 'mancha') { trocarMancha(o, it, desc); n++; }
        else if (TIPOS.has(t) && trocarPeca(T, o, it, desc)) n++;
      } catch (e) { console.warn('móveis V2:', t, e); }
    });
    trocarPele(T, g);
    g.userData.moveisV2 = true;
    return n;
  }

  /* ---------- com o 3D aberto: baixa e troca as salas já montadas ---------- */
  async function iniciar(ctx, W) {
    if (!ligado() || !W || !W.trocarMoveisV2) return;
    const T = window.THREE; if (!T) return;
    try { await carregar(T); } catch (e) { return; }
    if (!ligado()) return;
    const S3 = window.Sala3D, api = S3 && S3.aberta ? S3._api : null;
    if (!api || api.mundo !== W) return;
    W.trocarMoveisV2();
    try { trocarPele(T, W.raiz); } catch (e) {}
  }
  // troca ao vivo para a Leve: a carne volta ao V1 e as salas são montadas de novo com o V1
  function aplicarQualidade(on) {
    const S3 = window.Sala3D, api = S3 && S3.aberta ? S3._api : null, W = api && api.mundo;
    if (!W) return;
    if (on) iniciar(api.ctx, W); else { desfazerCarne(); if (W.refazerSalasV1) W.refazerSalasV1(); }
  }
  NS().moveisV2 = {
    carregar, iniciar, trocar, aplicarQualidade, TIPOS,
    // pré-carga (sala3d.js, no clique do 3D): só põe os arquivos no cache
    preCarregar() { const aq = NS().aquecer; if (aq) ARQS.forEach(a => aq(url(a))); },
    teste(on) { forcado = on; aplicarQualidade(on === null ? ligado() : on); },
    ativo: () => !!kit && ligado(),
    estado() {
      const S3 = window.Sala3D, api = S3 && S3.aberta ? S3._api : null, W = api && api.mundo;
      let pecas = 0, carne = 0, sangue = 0, salas = 0; const porTipo = {};
      if (W) W.carregadas.forEach(c => {
        if (c.g.userData.moveisV2) salas++;
        c.g.children.forEach(o => { if (o.userData.moveisV2) { pecas++; porTipo[o.userData.t] = (porTipo[o.userData.t] || 0) + 1; } if (o.userData.t === 'sangue') o.traverse(x => { if (x.isMesh && x.material.userData.moveisV2) sangue++; }); });
        c.g.traverse(x => { if (x.isMesh && x.material && x.material.userData && x.material.userData.carneV2) carne++; });
      });
      return { carregado: !!kit, ligado: ligado(), salas, pecas, carne, sangue, porTipo };
    },
  };
  window.MoveisV2 = NS().moveisV2;
})();
