/* dados3d.js · dados 3D com física, na tela de quem rolou
   Quando alguém rola dados no site (botão 🎲 Dados, perícias e ataques da ficha, dano, rituais), o site
   sorteia o resultado como sempre e avisa este módulo (evento "acf-dados"). Com o 3D aberto, um quadradinho
   aparece na tela de quem rolou e os dados caem numa bandeja com física de verdade (cannon.js).
   O resultado mostrado é SEMPRE o que o site sorteou: a física roda primeiro, sem desenhar; quando os dados
   param, os números das faces são trocados para que a face de cima seja a sorteada; depois a queda é
   mostrada. Dados: d4, d6, d8, d10, d12 e d20. */
(() => {
  'use strict';
  const URL_CANNON = 'https://cdn.jsdelivr.net/npm/cannon@0.6.2/build/cannon.min.js';
  const ls = { get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  let carregando = null;
  const carregarCannon = () => window.CANNON ? Promise.resolve() : (carregando = carregando || new Promise((ok, falha) => {
    const s = document.createElement('script'); s.src = URL_CANNON; s.async = true;
    s.onload = () => ok(); s.onerror = () => { carregando = null; s.remove(); falha(new Error('cannon')); };
    document.head.appendChild(s);
  }));
  // mostrar? com o 3D aberto, sempre; no mapa 2D, só se a pessoa ligou nas Opções do 3D
  const ligado = () => ls.get('acf-dados3d', true) && ((window.Sala3D && window.Sala3D.aberta) || ls.get('acf-dados3d-2d', false));

  /* ---------- formas dos dados: geometria do Three.js + faces planas para a física ---------- */
  const cache = {};
  function forma(f) {
    if (cache[f]) return cache[f];
    const T = window.THREE;
    let g;
    if (f === 4) g = new T.TetrahedronGeometry(1.45);
    else if (f === 6) g = new T.BoxGeometry(1.5, 1.5, 1.5);
    else if (f === 8) g = new T.OctahedronGeometry(1.3);
    else if (f === 12) g = new T.DodecahedronGeometry(1.3);
    else if (f === 10) g = trapezoedro();
    else g = new T.IcosahedronGeometry(1.35);
    const geo = g.index ? g.toNonIndexed() : g;
    const pos = geo.attributes.position;
    // agrupa triângulos com a mesma normal = uma face
    const faces = [], tri = [];
    const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), n = new T.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      n.subVectors(c, b).cross(new T.Vector3().subVectors(a, b)).normalize();
      let fi = faces.findIndex(x => x.n.dot(n) > .995);
      if (fi < 0) { faces.push({ n: n.clone(), pts: [] }); fi = faces.length - 1; }
      faces[fi].pts.push(a.clone(), b.clone(), c.clone()); tri.push(fi);
    }
    // vértices únicos e cada face com os vértices em volta (sentido anti-horário visto de fora)
    const verts = [];
    const idx = p => { let i = verts.findIndex(v => v.distanceToSquared(p) < 1e-6); if (i < 0) { verts.push(p.clone()); i = verts.length - 1; } return i; };
    faces.forEach(F => {
      const ids = [...new Set(F.pts.map(idx))];
      const cen = ids.reduce((s, i) => s.add(verts[i]), new T.Vector3()).multiplyScalar(1 / ids.length);
      const u = new T.Vector3().subVectors(verts[ids[0]], cen).normalize(), v = new T.Vector3().crossVectors(F.n, u);
      ids.sort((p, q) => Math.atan2(verts[p].clone().sub(cen).dot(v), verts[p].clone().sub(cen).dot(u)) - Math.atan2(verts[q].clone().sub(cen).dot(v), verts[q].clone().sub(cen).dot(u)));
      F.ids = ids; F.cen = cen; F.u = u; F.v = v; F.R = Math.max(...ids.map(i => verts[i].distanceTo(cen)));
    });
    // UV por triângulo, no plano da face
    const uv = new Float32Array(pos.count * 2), p = new T.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const F = faces[tri[Math.floor(i / 3)]]; p.fromBufferAttribute(pos, i).sub(F.cen);
      uv[i * 2] = .5 + p.dot(F.u) / F.R * .5; uv[i * 2 + 1] = .5 + p.dot(F.v) / F.R * .5;
    }
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geo.clearGroups(); for (let i = 0; i < pos.count; i += 3) geo.addGroup(i, 3, tri[i / 3]);
    geo.computeVertexNormals();
    return (cache[f] = { geo, faces, verts });
  }
  // d10: trapezoedro pentagonal (10 faces em forma de pipa)
  function trapezoedro() {
    const T = window.THREE, h = 1.3, r = 1.25;
    // altura dos anéis que deixa cada pipa plana
    const ring = z => [0, 1, 2, 3, 4].map(i => new T.Vector3(Math.cos(i * 2 * Math.PI / 5) * r, z, Math.sin(i * 2 * Math.PI / 5) * r));
    const ring2 = z => [0, 1, 2, 3, 4].map(i => new T.Vector3(Math.cos((i + .5) * 2 * Math.PI / 5) * r, -z, Math.sin((i + .5) * 2 * Math.PI / 5) * r));
    const plana = z => { const U = ring(z), L = ring2(z), top = new T.Vector3(0, h, 0); const n = new T.Vector3().subVectors(U[0], top).cross(new T.Vector3().subVectors(L[0], top)); return n.dot(new T.Vector3().subVectors(U[1], top)); };
    let lo = 0, hi = .5; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (Math.sign(plana(m)) === Math.sign(plana(lo))) lo = m; else hi = m; }
    const z = (lo + hi) / 2, U = ring(z), L = ring2(z), top = new T.Vector3(0, h, 0), bot = new T.Vector3(0, -h, 0);
    const pts = [];
    const quad = (p0, p1, p2, p3) => { pts.push(p0, p1, p2, p0, p2, p3); };
    for (let i = 0; i < 5; i++) {
      const j = (i + 1) % 5;
      quad(top, U[j], L[i], U[i]);
      quad(bot, L[i], U[j], L[j]);
    }
    const arr = new Float32Array(pts.length * 3); pts.forEach((p, i) => { arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(arr, 3)); g.computeVertexNormals();
    // garante que as normais apontem para fora
    const pa = g.attributes.position, a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
    for (let i = 0; i < pa.count; i += 3) { a.fromBufferAttribute(pa, i); b.fromBufferAttribute(pa, i + 1); c.fromBufferAttribute(pa, i + 2); const n = new T.Vector3().subVectors(c, b).cross(new T.Vector3().subVectors(a, b)); const cen = a.clone().add(b).add(c); if (n.dot(cen) < 0) { pa.setXYZ(i + 1, c.x, c.y, c.z); pa.setXYZ(i + 2, b.x, b.y, b.z); } }
    return g;
  }

  /* ---------- texturas dos números ---------- */
  function texNumero(T, txt, cor, fundo, f, cantos) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d');
    x.fillStyle = fundo; x.fillRect(0, 0, 128, 128);
    x.fillStyle = cor; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (cantos) {   // d4: um número perto de cada canto (o de cima é o resultado)
      x.font = 'bold 30px Arial';
      cantos.forEach(([u, v, t]) => { const px = (64 + (u * 128 - 64) * .62), py = 128 - (64 + (v * 128 - 64) * .62); x.save(); x.translate(px, py); x.rotate(Math.atan2(px - 64, -(py - 64))); x.fillText(t, 0, 0); x.restore(); });
    } else {
      x.font = `bold ${f >= 12 ? 46 : f === 10 ? 50 : 60}px Arial`;
      x.fillText(txt, 64, 66);
      if (txt === '6' || txt === '9') x.fillRect(48, 94, 32, 5);
    }
    const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    return t;
  }

  /* ---------- a janelinha ---------- */
  let atual = null;
  function caixa() {
    let o = document.getElementById('dados3d');
    const pai = (window.Sala3D && window.Sala3D.aberta && document.getElementById('s3d')) || document.body;
    if (!o) {
      o = document.createElement('div'); o.id = 'dados3d'; o.className = 'dados3d'; o.hidden = true;
      o.innerHTML = '<div class="d3-palco"></div><p class="d3-res"></p>';
      o.addEventListener('click', () => encerrar());
    }
    if (o.parentNode !== pai) pai.appendChild(o);
    return o;
  }
  function encerrar() {
    if (!atual) return;
    const a = atual; atual = null;
    cancelAnimationFrame(a.raf); clearTimeout(a.tFim);
    try { a.ren.dispose(); a.ren.forceContextLoss && a.ren.forceContextLoss(); } catch (e) {}
    a.descartes.forEach(d => { try { d.dispose(); } catch (e) {} });
    const o = document.getElementById('dados3d'); if (o) { o.hidden = true; o.classList.remove('d3-fim'); const p = o.querySelector('.d3-palco'); if (p) p.innerHTML = ''; }
  }

  async function rolar(det) {
    const T = window.THREE; if (!T) return;
    try { await carregarCannon(); } catch (e) { return; }
    const C = window.CANNON; if (!C) return;
    encerrar();
    const lista = (det.dados || []).filter(d => [4, 6, 8, 10, 12, 20].includes(+d.f)).slice(0, 10);
    if (!lista.length) return;
    const o = caixa(), palco = o.querySelector('.d3-palco');
    const lado = palco.clientWidth || (Math.min(innerWidth, innerHeight) < 560 ? 168 : 214);

    /* física: bandeja com chão e quatro paredes; os dados entram por um lado, girando */
    const mundo = new C.World(); mundo.gravity.set(0, -48, 0); mundo.broadphase = new C.NaiveBroadphase(); mundo.solver.iterations = 12;
    const mDado = new C.Material(), mMesa = new C.Material();
    mundo.addContactMaterial(new C.ContactMaterial(mDado, mMesa, { friction: .28, restitution: .32 }));
    mundo.addContactMaterial(new C.ContactMaterial(mDado, mDado, { friction: .2, restitution: .35 }));
    const B = 4.4;
    const plano = (x, y, z, eixo, ang) => { const b = new C.Body({ mass: 0, material: mMesa }); b.addShape(new C.Plane()); b.position.set(x, y, z); b.quaternion.setFromAxisAngle(eixo, ang); mundo.addBody(b); };
    plano(0, 0, 0, new C.Vec3(1, 0, 0), -Math.PI / 2);
    plano(-B, 0, 0, new C.Vec3(0, 1, 0), Math.PI / 2); plano(B, 0, 0, new C.Vec3(0, 1, 0), -Math.PI / 2);
    plano(0, 0, -B, new C.Vec3(0, 1, 0), 0); plano(0, 0, B, new C.Vec3(0, 1, 0), Math.PI);
    const dados = lista.map((d, i) => {
      const f = +d.f, F = forma(f);
      const shape = f === 6 ? new C.Box(new C.Vec3(.75, .75, .75)) : new C.ConvexPolyhedron(F.verts.map(v => new C.Vec3(v.x, v.y, v.z)), F.faces.map(x => x.ids));
      const b = new C.Body({ mass: 1, material: mDado }); b.addShape(shape);
      const lado0 = Math.random() < .5 ? -1 : 1;
      b.position.set(lado0 * (B - 1.2), 3 + i * 1.3, (Math.random() - .5) * 4);
      b.quaternion.setFromEuler(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      b.velocity.set(-lado0 * (9 + Math.random() * 6), -2, (Math.random() - .5) * 8);
      b.angularVelocity.set((Math.random() - .5) * 26, (Math.random() - .5) * 26, (Math.random() - .5) * 26);
      b.linearDamping = .08; b.angularDamping = .12;
      mundo.addBody(b);
      return { f, v: +d.v, F, b, quadros: [] };
    });
    // roda a física sem desenhar e grava cada quadro
    let parado = 0;
    for (let q = 0; q < 420; q++) {
      mundo.step(1 / 60);
      dados.forEach(d => d.quadros.push([d.b.position.x, d.b.position.y, d.b.position.z, d.b.quaternion.x, d.b.quaternion.y, d.b.quaternion.z, d.b.quaternion.w]));
      const quieto = dados.every(d => d.b.velocity.norm() < .08 && d.b.angularVelocity.norm() < .1);
      parado = quieto ? parado + 1 : 0;
      if (parado > 18 && q > 50) break;
    }
    /* qual face (ou canto, no d4) ficou para cima: os números são trocados para ela mostrar o sorteado */
    const up = new T.Vector3(0, 1, 0), qt = new T.Quaternion();
    dados.forEach(d => {
      const ult = d.quadros[d.quadros.length - 1]; qt.set(ult[3], ult[4], ult[5], ult[6]);
      const n = d.f === 4 ? d.F.verts.length : d.F.faces.length;
      const rot = (d.f === 4 ? d.F.verts.map(v => v.clone().normalize()) : d.F.faces.map(F => F.n.clone())).map(x => x.applyQuaternion(qt).dot(up));
      const topo = rot.indexOf(Math.max(...rot));
      const val = Array.from({ length: n }, (_, i) => i + 1);
      const alvo = Math.min(n, Math.max(1, d.v)), j = val.indexOf(alvo);
      [val[topo], val[j]] = [val[j], val[topo]];
      d.val = val;
    });

    /* desenho */
    const ren = new T.WebGLRenderer({ antialias: true, alpha: true });
    ren.setPixelRatio(Math.min(2, devicePixelRatio || 1)); ren.setSize(lado, lado); ren.outputEncoding = T.sRGBEncoding;
    palco.innerHTML = ''; palco.appendChild(ren.domElement);
    const cena = new T.Scene(), cam = new T.PerspectiveCamera(42, 1, .1, 60);
    cam.position.set(0, 11, 3.6); cam.lookAt(0, 0, .25);
    cena.add(new T.HemisphereLight('#e8dcff', '#1a0f24', .75));
    const sol = new T.DirectionalLight('#fff4e8', .9); sol.position.set(-4, 10, 6); cena.add(sol);
    const descartes = [];
    const feltro = new T.MeshStandardMaterial({ color: '#1c1028', roughness: 1 }); descartes.push(feltro);
    const chao = new T.Mesh(new T.PlaneGeometry(B * 2 + .4, B * 2 + .4), feltro); chao.rotation.x = -Math.PI / 2; cena.add(chao); descartes.push(chao.geometry);
    const borda = new T.MeshStandardMaterial({ color: '#3a2650', roughness: .6, metalness: .2 }); descartes.push(borda);
    [[0, -B - .2, B * 2 + .8, .4], [0, B + .2, B * 2 + .8, .4], [-B - .2, 0, .4, B * 2 + .8], [B + .2, 0, .4, B * 2 + .8]].forEach(([x, z, w, d]) => { const m = new T.Mesh(new T.BoxGeometry(w, .5, d), borda); m.position.set(x, .25, z); cena.add(m); descartes.push(m.geometry); });
    const A = window.ACF || {}, eu = A.meu || A.aux, ser = eu && A.SER && A.SER[eu];
    const corDado = (ser && ser.cor) || '#7c4dff';
    dados.forEach(d => {
      const mats = d.F.faces.map((F, i) => {
        let t;
        if (d.f === 4) { const cantos = F.ids.map(vi => { const p = d.F.verts[vi].clone().sub(F.cen); return [.5 + p.dot(F.u) / F.R * .5, .5 + p.dot(F.v) / F.R * .5, String(d.val[vi])]; }); t = texNumero(T, '', '#ffffff', corDado, 4, cantos); }
        else t = texNumero(T, String(d.val[i]), '#ffffff', corDado, d.f);
        const m = new T.MeshStandardMaterial({ map: t, roughness: .35, metalness: .1 }); descartes.push(t, m); return m;
      });
      d.mesh = new T.Mesh(d.F.geo, mats); cena.add(d.mesh); d.mats = mats;
    });

    o.hidden = false; o.classList.remove('d3-fim');
    const res = o.querySelector('.d3-res'); res.textContent = '';
    const a = atual = { ren, descartes, raf: 0, tFim: 0 };
    const nQ = Math.max(...dados.map(d => d.quadros.length)), t0 = performance.now();
    const desenhar = () => {
      if (atual !== a) return;
      const q = Math.min(nQ - 1, Math.floor((performance.now() - t0) / 1000 * 60));
      dados.forEach(d => { const f = d.quadros[Math.min(q, d.quadros.length - 1)]; d.mesh.position.set(f[0], f[1], f[2]); d.mesh.quaternion.set(f[3], f[4], f[5], f[6]); });
      ren.render(cena, cam);
      if (q < nQ - 1) { a.raf = requestAnimationFrame(desenhar); return; }
      // parou: destaca o dado usado (teste com vários d20) e mostra a conta
      if (det.usado !== undefined && dados.length > 1) dados.forEach((d, i) => { d.mats.forEach(m => { if (i === det.usado) { m.emissive = new T.Color('#ffd34a'); m.emissiveIntensity = .35; } else { m.color = new T.Color('#777'); } }); });
      ren.render(cena, cam);
      const vals = lista.map(d => d.v);
      const usado = det.usado !== undefined && vals.length > 1 ? ` · usa ${vals[det.usado]}` : '';
      const bonus = det.bonus ? ` ${det.bonus > 0 ? '+' : '−'} ${Math.abs(det.bonus)}` : '';
      res.textContent = `${vals.join(' · ')}${usado}${det.total !== undefined && (bonus || vals.length > 1) ? `${bonus} = ${det.total}` : ''}`;
      o.classList.add('d3-fim');
      a.tFim = setTimeout(() => { if (atual === a) encerrar(); }, 3200 * (window.__acfLento || 1));
    };
    desenhar();
  }

  document.addEventListener('acf-dados', async e => {
    if (!ligado()) return;
    // no mapa 2D (opção ligada), o Three.js pode ainda não ter sido baixado
    if (!window.THREE && window.Sala3D && window.Sala3D.carregarThree) { try { await window.Sala3D.carregarThree(); } catch (er) { return; } }
    if (window.THREE) rolar(e.detail || {}).catch(err => console.warn('dados 3D:', err));
  });
  window.ACF_DADOS3D = { rolar, encerrar, ligado };
})();
