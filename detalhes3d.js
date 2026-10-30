/* detalhes3d.js · objetos DETALHADOS das salas em 3D (Three.js)
   Extensão de objetos3d.js: acrescenta texturas com desgaste (concreto manchado, metal enferrujado,
   azulejo encardido, forro com infiltração…) e objetos montados a partir das imagens de referência
   das salas (expositores de loja, quadros elétricos com centelhas, negatoscópio, lousa, cabines de
   gravação, monitores cardíacos, colunas de pressão, máquinas de escrever, fitas VHS…).
   Tudo é genérico: o que cada sala tem continua vindo do arquivo de cenas (fora do GitHub). */
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  NS.extensoes = NS.extensoes || [];
  NS.texturas = NS.texturas || {};
  const TX = NS.texturas;

  /* ================= texturas com desgaste ================= */
  const rgba = (c, a) => { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  function ruido(x, S, r, n, a, tam = 2) { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${a * r()})`; x.fillRect(r() * S, r() * S, tam, tam); } }
  function manchas(x, S, r, n, cor, a, tam = 60) { for (let i = 0; i < n; i++) { const cx = r() * S, cy = r() * S, rr = tam * (.3 + r()); const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, rgba(cor, a * (.5 + r() * .5))); g.addColorStop(1, rgba(cor, 0)); x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rr, rr * (.5 + r() * .7), r() * 3, 0, 7); x.fill(); } }
  function escorridos(x, S, r, n, cor, a, topo = 0) { for (let i = 0; i < n; i++) { const x0 = r() * S, y0 = topo + r() * S * .3, L = S * (.2 + r() * .7), w = 2 + r() * 10; const g = x.createLinearGradient(0, y0, 0, y0 + L); g.addColorStop(0, rgba(cor, a)); g.addColorStop(1, rgba(cor, 0)); x.fillStyle = g; x.fillRect(x0, y0, w, L); } }
  function rachaduras(x, S, r, n, a = .45) { x.strokeStyle = `rgba(0,0,0,${a})`; for (let i = 0; i < n; i++) { x.lineWidth = .8 + r() * 1.5; let px = r() * S, py = r() * S; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (r() - .5) * 40; py += r() * 30; x.lineTo(px, py); } x.stroke(); } }
  function grade(x, S, n, cor, a, lw = 2) { x.strokeStyle = rgba(cor, a); x.lineWidth = lw; for (let i = 0; i <= S; i += S / n) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke(); } }
  function rebites(x, S, r, passo, cor = '#000000') { for (let i = passo / 2; i < S; i += passo) [6, S - 6].forEach(b => { [[i, b], [b, i]].forEach(([a, c]) => { x.fillStyle = rgba(cor, .45); x.beginPath(); x.arc(a, c, 3.2, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.15)'; x.beginPath(); x.arc(a - 1, c - 1, 1.4, 0, 7); x.fill(); }); }); }

  TX.concreto_sujo = (x, S, r) => { ruido(x, S, r, 16000, .1); manchas(x, S, r, 14, '#1a1410', .35, 90); escorridos(x, S, r, 22, '#14100c', .32); rachaduras(x, S, r, 5); manchas(x, S, r, 6, '#3a2a14', .18, 50); };
  TX.metal_sujo = (x, S, r) => { ruido(x, S, r, 9000, .08); grade(x, S, 2, '#000000', .45, 3); rebites(x, S, r, 32); for (let i = 0; i < 18; i++) { const px = r() * S, py = r() * S * .6, L = 40 + r() * 160; const g = x.createLinearGradient(0, py, 0, py + L); g.addColorStop(0, 'rgba(110,52,18,.55)'); g.addColorStop(1, 'rgba(110,52,18,0)'); x.fillStyle = g; x.fillRect(px, py, 3 + r() * 6, L); } manchas(x, S, r, 10, '#5a2a0a', .3, 50); x.strokeStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 40; i++) { x.beginPath(); const a = r() * S, b = r() * S; x.moveTo(a, b); x.lineTo(a + (r() - .5) * 60, b + (r() - .5) * 8); x.stroke(); } };
  TX.azulejo_sujo = (x, S, r) => { ruido(x, S, r, 6000, .05); grade(x, S, 8, '#2a2620', .5, 3); const g = x.createLinearGradient(0, S * .5, 0, S); g.addColorStop(0, 'rgba(40,30,20,0)'); g.addColorStop(1, 'rgba(40,30,20,.45)'); x.fillStyle = g; x.fillRect(0, 0, S, S); manchas(x, S, r, 26, '#2a2014', .3, 30); for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(${60 + r() * 40},${8 + r() * 10},8,${.25 + r() * .4})`; x.beginPath(); x.arc(r() * S, r() * S, 1 + r() * 4, 0, 7); x.fill(); } escorridos(x, S, r, 8, '#3a2a18', .25); };
  TX.forro_sujo = (x, S, r) => { ruido(x, S, r, 12000, .07, 1); for (let i = 0; i < 3000; i++) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(r() * S, r() * S, 1.5, 1.5); } grade(x, S, 2, '#3a3a36', .7, 6); for (let i = 0; i < 5; i++) { const cx = r() * S, cy = r() * S, rr = 30 + r() * 70; for (let k = 0; k < 4; k++) { x.strokeStyle = `rgba(90,60,20,${.18 + k * .05})`; x.lineWidth = 3; x.beginPath(); x.ellipse(cx, cy, rr - k * 8, (rr - k * 8) * .7, r(), 0, 7); x.stroke(); } x.fillStyle = 'rgba(90,60,20,.18)'; x.beginPath(); x.ellipse(cx, cy, rr, rr * .7, 0, 0, 7); x.fill(); } };
  TX.chao_sujo = (x, S, r) => { ruido(x, S, r, 14000, .09); grade(x, S, 4, '#000000', .3, 2); manchas(x, S, r, 22, '#100c08', .4, 70); manchas(x, S, r, 8, '#3a2a18', .25, 40); x.strokeStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 30; i++) { x.lineWidth = 1 + r() * 2; x.beginPath(); const a = r() * S, b = r() * S; x.moveTo(a, b); x.quadraticCurveTo(a + (r() - .5) * 80, b + (r() - .5) * 80, a + (r() - .5) * 120, b + (r() - .5) * 120); x.stroke(); } };
  TX.madeira_velha = (x, S, r) => { for (let i = 0; i < S; i += 64) { x.fillStyle = `rgba(0,0,0,${.05 + r() * .12})`; x.fillRect(0, i, S, 64); x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, i, S, 3); } x.strokeStyle = 'rgba(30,15,5,.25)'; for (let i = 0; i < 90; i++) { x.lineWidth = .6 + r(); x.beginPath(); const y = r() * S; x.moveTo(0, y); x.bezierCurveTo(S * .3, y + (r() - .5) * 20, S * .6, y + (r() - .5) * 20, S, y + (r() - .5) * 10); x.stroke(); } manchas(x, S, r, 10, '#0c0804', .35, 50); ruido(x, S, r, 4000, .06); };
  TX.porta_aco = (x, S, r) => { ruido(x, S, r, 9000, .08); x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 6; x.strokeRect(10, 10, S - 20, S - 20); [S * .33, S * .66].forEach(y => { x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(14, y - 6, S - 28, 12); x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(14, y - 6, S - 28, 3); }); rebites(x, S, r, 26); for (let i = 0; i < 26; i++) { const px = r() * S, py = r() * S * .5, L = 60 + r() * 220; const g = x.createLinearGradient(0, py, 0, py + L); g.addColorStop(0, 'rgba(90,40,12,.5)'); g.addColorStop(1, 'rgba(90,40,12,0)'); x.fillStyle = g; x.fillRect(px, py, 2 + r() * 5, L); } manchas(x, S, r, 8, '#000000', .3, 60); };
  TX.grade_chao = (x, S, r) => { x.fillStyle = '#050505'; for (let i = 0; i < S; i += 32) for (let j = 0; j < S; j += 32) x.fillRect(i + 5, j + 5, 22, 22); ruido(x, S, r, 5000, .12); manchas(x, S, r, 8, '#5a2a0a', .35, 60); };
  TX.ferrugem = (x, S, r) => { ruido(x, S, r, 16000, .14); manchas(x, S, r, 30, '#6a2a08', .5, 60); manchas(x, S, r, 20, '#2a1004', .4, 40); escorridos(x, S, r, 18, '#3a1404', .35); };
  TX.cortica = (x, S, r) => { for (let i = 0; i < 26000; i++) { x.fillStyle = `rgba(${90 + r() * 60},${60 + r() * 40},${30 + r() * 20},.5)`; x.fillRect(r() * S, r() * S, 2, 2); } };
  TX.parede_mofada = (x, S, r) => { ruido(x, S, r, 12000, .08); manchas(x, S, r, 18, '#1a2214', .4, 80); manchas(x, S, r, 10, '#2a1a0c', .35, 60); escorridos(x, S, r, 30, '#120c06', .35); rachaduras(x, S, r, 7, .5); for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(0,0,0,.25)'; const a = r() * S, b = r() * S; x.beginPath(); x.ellipse(a, b, 20 + r() * 50, 10 + r() * 30, r() * 3, 0, 7); x.fill(); } };
  TX.carpete_velho = (x, S, r) => { for (let i = 0; i < 30000; i++) { x.fillStyle = `rgba(0,0,0,${r() * .12})`; x.fillRect(r() * S, r() * S, 1, 1); } manchas(x, S, r, 16, '#0a0806', .45, 70); manchas(x, S, r, 5, '#3a0806', .3, 40); };

  /* ================= os objetos ================= */
  NS.extensoes.push(F => {
    const { P, m, bx, cy, sf, pl, luz, textoTex, G, metal, texCanvas, guardar, ALT, anim, rng, tela, T } = F;
    const sujo = (c, tex = 'metal_sujo', o = {}) => m(c, { tex, r: o.r ?? .75, me: o.me ?? .25, rep: o.rep, ...o });
    const emis = (c, ei = 1.2, o = {}) => m('#ffffff', { unico: true, e: c, ei, r: .4, ...o });
    const canvasMat = (w, h, desenha, o = {}) => { const [c, x] = tela(w, h); desenha(x, c.width, c.height); const t = texCanvas(c); const mt = m('#ffffff', { unico: true, mapa: t, r: o.r ?? .8, me: o.me ?? 0 }); if (o.brilho) { mt.emissive = new T.Color('#ffffff'); mt.emissiveMap = t; mt.emissiveIntensity = o.brilho; } if (o.transp) mt.transparent = true; if (o.lado) mt.side = T.DoubleSide; return mt; };
    const UP = new T.Vector3(0, 1, 0);
    const tubo = (pai, pts, r, mat, seg = 24) => { const me = new T.Mesh(guardar(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), seg, r, 6)), mat); pai.add(me); return me; };
    const osso = (pai, a, b, r1, mat) => { const p1 = new T.Vector3(...a), p2 = new T.Vector3(...b), d = p2.clone().sub(p1), L = d.length(); const me = new T.Mesh(guardar(new T.CylinderGeometry(r1, r1, L, 8)), mat); me.position.copy(p1).add(d.multiplyScalar(.5)); me.quaternion.setFromUnitVectors(UP, p2.clone().sub(p1).normalize()); pai.add(me); return me; };
    // várias geometrias numa malha só (menos trabalho para o celular)
    function juntar(geos, mat) {
      let nv = 0; const gs = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; nv += n.attributes.position.count; return n; });
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2); let o = 0;
      gs.forEach(g => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); });
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
      return new T.Mesh(guardar(geo), mat);
    }
    const ret = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = new T.BoxGeometry(w, h, d); if (rx || ry || rz) g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(rx, ry, rz))); g.translate(x, y + h / 2, z); return g; };
    const cil = (r1, r2, h, x, y, z, seg = 10, rx = 0, rz = 0) => { const g = new T.CylinderGeometry(r1, r2, h, seg); if (rx || rz) g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(rx, 0, rz))); g.translate(x, y + h / 2, z); return g; };

    // textura de "produtos" (latas, caixas, garrafas) para prateleiras e expositores
    function produtosTex(sem, tipo = 'caixas', escuro = 0) {
      const r = rng(sem || 3);
      return canvasMat(512, 128, (x, W, H) => {
        x.fillStyle = '#0c0c0e'; x.fillRect(0, 0, W, H); let px = 4;
        const pal = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad', '#ecf0f1', '#d35400', '#16a085', '#7f8c8d', '#e8d8b0', '#2c3e50'];
        while (px < W - 10) {
          const w = tipo === 'garrafas' ? 14 + r() * 8 : 18 + r() * 30, h = tipo === 'garrafas' ? H * (.6 + r() * .3) : H * (.35 + r() * .55), c = pal[Math.floor(r() * pal.length)];
          if (tipo === 'garrafas') { x.fillStyle = c; x.globalAlpha = .85; x.fillRect(px, H - h, w, h); x.fillRect(px + w * .3, H - h - 14, w * .4, 14); x.globalAlpha = 1; x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(px + 2, H - h + 4, 3, h - 8); x.fillStyle = '#f4f0e0'; x.fillRect(px + 1, H - h * .55, w - 2, h * .22); }
          else if (r() < .4) { x.fillStyle = c; x.fillRect(px, H - h * .7, w * .8, h * .7); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(px, H - h * .7, w * .8, 4); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px + w * .1, H - h * .45, w * .6, h * .2); }
          else { x.fillStyle = c; x.fillRect(px, H - h, w, h); x.fillStyle = 'rgba(255,255,255,.75)'; x.font = `bold ${Math.max(8, w * .35)}px Arial`; x.fillText(['GO', 'ZAP', 'MAX', 'OK', '24', 'K'][Math.floor(r() * 6)], px + 2, H - h * .5); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px + w - 3, H - h, 3, h); }
          if (r() < .12) { x.clearRect(px, 0, w, H); x.fillStyle = '#0c0c0e'; x.fillRect(px, 0, w, H); }   // buraco na prateleira
          px += w + 2 + r() * 3;
        }
        x.fillStyle = `rgba(0,0,0,${.15 + escuro})`; x.fillRect(0, 0, W, H);
      }, { r: .6 });
    }

    Object.assign(P, {
      /* ---------- comuns ---------- */
      // papéis espalhados no chão (alguns com sangue)
      papeis_chao(o) {
        const g = G(), r = rng(o.sem || 61), n = o.n || 18, w = o.w || 4, d = o.d || 4, geos = [], geosS = [];
        for (let i = 0; i < n; i++) { const p = new T.PlaneGeometry(.21 + r() * .06, .29 + r() * .05); p.rotateX(-Math.PI / 2); p.rotateY(r() * 6.28); if (r() < .3) p.rotateX((r() - .5) * .12); p.translate((r() - .5) * w, .006 + i * .0004, (r() - .5) * d); (o.sangue && r() < o.sangue ? geosS : geos).push(p); }
        const papel = canvasMat(128, 176, (x, W, H) => { x.fillStyle = '#a49c88'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(40,30,20,.55)'; for (let i = 14; i < H - 10; i += 9) x.fillRect(10, i, W - 20 - (i % 3) * 14, 2); x.fillStyle = 'rgba(60,40,20,.3)'; x.fillRect(0, 0, W, H * .08); for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(50,35,20,.18)'; x.beginPath(); x.ellipse(Math.random() * W, Math.random() * H, 20, 14, 0, 0, 7); x.fill(); } }, { r: .95 });
        papel.side = T.DoubleSide;
        if (geos.length) g.add(juntar(geos, papel));
        if (geosS.length) { const ps = canvasMat(128, 176, (x, W, H) => { x.fillStyle = '#a49c88'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(40,30,20,.5)'; for (let i = 14; i < H - 10; i += 9) x.fillRect(10, i, W - 30, 2); x.fillStyle = 'rgba(110,8,8,.8)'; x.beginPath(); x.ellipse(W * .6, H * .5, 40, 26, .5, 0, 7); x.fill(); for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(W * .6 + (Math.random() - .5) * 100, H * .5 + (Math.random() - .5) * 80, 2 + Math.random() * 5, 0, 7); x.fill(); } }, { r: .9 }); ps.side = T.DoubleSide; g.add(juntar(geosS, ps)); }
        return g;
      },
      // cabos grossos serpenteando pelo chão
      cabos_chao(o) {
        const g = G(), r = rng(o.sem || 63), n = o.n || 6, w = o.w || 3, d = o.d || 2, mat = m(o.c || '#0a0a0a', { r: .85 });
        const geos = [];
        for (let i = 0; i < n; i++) {
          const pts = []; let px = (r() - .5) * w * .3, pz = -d / 2; const ang = (r() - .5) * .8;
          for (let k = 0; k < 7; k++) { pts.push(new T.Vector3(px, .03 + (k === 0 && o.sobe ? o.sobe : 0), pz)); px += Math.sin(ang + (r() - .5) * 1.6) * w / 6; pz += d / 6; }
          if (o.sobe) pts.unshift(new T.Vector3(pts[0].x, o.sobe, pts[0].z - .05));
          geos.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, .025 + r() * .03, 6));
        }
        g.add(juntar(geos, mat)); return g;
      },
      // placa da sala, em cima da porta: "SALA CN 08 / Depósito Estrutural da ORFEU"
      placa_sala(o) {
        const g = G(), w = o.w || 2.6, h = o.h || .55, y = o.y ?? 2.38, r = rng(o.sem || 65);
        const mt = canvasMat(1024, Math.round(1024 * h / w), (x, W, H) => {
          x.fillStyle = o.f || '#cfc8b4'; x.fillRect(0, 0, W, H);
          const g2 = x.createLinearGradient(0, 0, 0, H); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(60,40,20,.35)'); x.fillStyle = g2; x.fillRect(0, 0, W, H);
          for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(60,40,20,${r() * .2})`; x.fillRect(r() * W, r() * H, 3, 3); }
          for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(90,45,15,${.15 + r() * .3})`; x.fillRect(r() * W, 0, 3 + r() * 8, H * (.3 + r() * .7)); }
          x.strokeStyle = '#2a2420'; x.lineWidth = 10; x.strokeRect(8, 8, W - 16, H - 16);
          // triângulo de alerta
          const tx = H * .5, ty = H * .5, ts = H * .32; x.fillStyle = '#e8b417'; x.strokeStyle = '#1a1612'; x.lineWidth = 6; x.beginPath(); x.moveTo(tx, ty - ts); x.lineTo(tx + ts, ty + ts * .8); x.lineTo(tx - ts, ty + ts * .8); x.closePath(); x.fill(); x.stroke(); x.fillStyle = '#1a1612'; x.font = `bold ${ts}px Arial`; x.textAlign = 'center'; x.fillText('!', tx, ty + ts * .6);
          x.fillStyle = o.c || '#1e1a16'; x.textAlign = 'center';
          const cxT = (H * .95 + W - 24) / 2, larg = W - H * .95 - 40;
          let t1 = Math.round(H * .38); x.font = `bold ${t1}px Arial`; while (x.measureText(o.txt1 || '').width > larg && t1 > 10) { t1 -= 2; x.font = `bold ${t1}px Arial`; } x.fillText(o.txt1 || '', cxT, H * .45);
          const sub = (o.txt2 || '').toUpperCase(); let t2 = Math.round(H * .23); x.font = `bold ${t2}px Arial`; while (x.measureText(sub).width > larg && t2 > 10) { t2 -= 2; x.font = `bold ${t2}px Arial`; } x.fillText(sub, cxT, H * .78);
        }, { r: .8, me: .2 });
        bx(g, w + .06, h + .06, .03, m('#2a2622', { me: .5, r: .6 }), 0, y - .03, 0);
        const p = pl(g, w, h, mt, 0, y + h / 2, .02); p.rotation.z = (r() - .5) * .025;
        [-1, 1].forEach(s => sf(g, .015, metal('#5a5a5a'), s * (w / 2 - .06), y + h - .06, .035, 6));
        return g;
      },
      // lâmpada vermelha de alerta (ao lado das portas)
      lampada_alerta(o) {
        const g = G(), y = o.y ?? 1.75, cor = o.c || '#ff2010';
        bx(g, .14, .18, .06, m('#1a1a1a', { me: .5 }), 0, y - .09, .03);
        const domo = sf(g, .055, m('#ffffff', { unico: true, e: cor, ei: 2.2, r: .2, op: .95 }), 0, y, .09, 12); domo.scale.z = .7;
        cy(g, .065, .065, .02, m('#2a2a2a', { me: .6 }), 0, y - .01, .07, 12).rotation.x = Math.PI / 2;
        const f = rng(o.sem || 7)() * 6;
        anim.push((dt, t) => { domo.material.emissiveIntensity = 1.4 + Math.sin(t * 2.2 + f) * .9; });
        g.userData.luzBotao = domo;
        return g;
      },
      // mancha de sujeira/mofo/infiltração numa parede
      mancha(o) {
        const g = G(), w = o.w || 1.5, h = o.h || 1.2, y = o.y ?? .1, r = rng(o.sem || 67), cor = o.c || '#1a120a';
        const mt = canvasMat(256, Math.round(256 * h / w), (x, W, H) => { x.clearRect(0, 0, W, H); manchas(x, W, r, 8, cor, .55, W * .25); escorridos(x, W, r, 10, cor, .45, 0); }, { r: 1, transp: true });
        mt.depthWrite = false; mt.polygonOffset = true; mt.polygonOffsetFactor = -2;
        pl(g, w, h, mt, 0, y + h / 2, .015); return g;
      },
      lixeira(o) {
        const g = G(), c = o.c || '#4a4e52';
        const corpo = new T.Mesh(guardar(new T.CylinderGeometry(.2, .17, .55, 16, 1, true)), m(c, { tex: 'metal_sujo', me: .5, r: .6, lado: 2 })); corpo.position.y = .275; g.add(corpo);
        cy(g, .17, .17, .01, m('#111'), 0, .005, 0, 16);
        const r = rng(o.sem || 9); for (let i = 0; i < 5; i++) { const b = sf(g, .06 + r() * .04, m(['#d8d2c0', '#e8e8e0', '#8a7a6a'][i % 3], { r: 1 }), (r() - .5) * .2, .5 + r() * .12, (r() - .5) * .2, 6); b.scale.set(1, .7, 1); }
        if (o.caida) g.rotation.z = Math.PI / 2.3;
        return g;
      },
      // teia de aranha num canto
      teia(o) {
        const g = G(), s = o.s || .8, r = rng(o.sem || 69);
        const mt = canvasMat(256, 256, (x, W) => { x.clearRect(0, 0, W, W); x.strokeStyle = 'rgba(230,230,230,.5)'; x.lineWidth = 1.2; for (let k = 0; k < 9; k++) { x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(k * .19) * W * 1.2, Math.sin(k * .19) * W * 1.2); x.stroke(); } for (let rr = 20; rr < W * 1.1; rr += 16 + r() * 10) { x.beginPath(); for (let k = 0; k < 9; k++) { const a = k * .19, px = Math.cos(a) * rr, py = Math.sin(a) * rr; k ? x.quadraticCurveTo(Math.cos(a - .1) * rr * .92, Math.sin(a - .1) * rr * .92, px, py) : x.moveTo(px, py); } x.stroke(); } }, { r: 1, transp: true, lado: true });
        mt.depthWrite = false; const p = pl(g, s, s, mt, s / 2, -s / 2, 0); p.rotation.y = -Math.PI / 4; g.position.y = ALT; return g;
      },
      // porta de aço dupla e rebitada (decoração de parede, quando a sala precisa de mais uma porta trancada)
      porta_aco_parede(o) {
        const g = G(), w = o.w || 2.2, h = o.h || 2.4, mt = m('#5a5e62', { tex: 'porta_aco', r: .65, me: .45 });
        bx(g, w + .3, h + .15, .14, m('#2a2c2e', { me: .5, r: .6 }), 0, 0, -.03);
        [-1, 1].forEach(s => { bx(g, w / 2 - .02, h, .06, mt, s * w / 4, 0, .05); bx(g, .03, .5, .05, metal('#9aa0a6'), s * .1, 1.0, .1); [.4, h - .5].forEach(yy => bx(g, .06, .25, .05, m('#1a1a1a', { me: .6 }), s * (w / 2 - .04), yy, .08)); });
        return g;
      },

      /* ---------- CN 01 · loja de conveniência ---------- */
      // expositor refrigerado de portas de vidro, iluminado, cheio de garrafas
      expositor(o) {
        const g = G(), n = o.n || 3, wp = .78, w = n * wp, h = 2.05, d = .75, sem = o.sem || 71;
        const casco = sujo('#2a2c30', 'metal_sujo', { rep: [n, 2] });
        bx(g, w + .08, h + .25, .04, casco, 0, 0, -d / 2 + .02); bx(g, w + .08, .1, d, casco, 0, 0, 0); bx(g, w + .08, .25, d, casco, 0, h, 0);
        [-1, 1].forEach(s => bx(g, .04, h + .25, d, casco, s * (w / 2 + .02), 0, 0));
        const interior = m('#ffffff', { unico: true, e: '#cfe8ff', ei: .5, r: .5 });
        bx(g, w - .04, h - .1, .02, interior, 0, .12, -d / 2 + .06);
        for (let k = 0; k < 5; k++) {
          const yy = .25 + k * .38; bx(g, w - .06, .015, d - .16, metal('#9aa4ac'), 0, yy - .015, 0);
          const pm = produtosTex(sem + k, 'garrafas'); const p = pl(g, w - .08, .34, pm, 0, yy + .17, d / 2 - .2); pm.emissive = new T.Color('#ffffff'); pm.emissiveMap = pm.map; pm.emissiveIntensity = .35;
        }
        const vidro = m('#bcd8e8', { unico: true, op: .16, r: .05, me: .3 });
        for (let i = 0; i < n; i++) { const x0 = -w / 2 + wp * (i + .5); bx(g, wp - .04, h - .05, .02, vidro, x0, .1, d / 2 + .01); [-1, 1].forEach(s => bx(g, .035, h - .05, .04, m('#d8dde0', { me: .6, r: .35 }), x0 + s * (wp / 2 - .02), .1, d / 2 + .01)); bx(g, .025, .55, .04, metal('#c8ccd0'), x0 + wp / 2 - .12, .85, d / 2 + .05); }
        bx(g, w, .2, .04, emis('#ffffff', .9), 0, h + .02, d / 2 + .01);
        luz(g, '#d8ecff', .7, 3.5, 0, 1.2, d / 2 + .5);
        return g;
      },
      // gôndola de supermercado (dois lados), com produtos
      gondola(o) {
        const g = G(), w = o.w || 2.4, h = o.h || 1.75, d = o.d || .9, sem = o.sem || 73, lados = o.lados ?? 2, tombado = o.tombado;
        const mt = sujo('#3a3e44', 'metal_sujo', { rep: [2, 1] });
        bx(g, w, h, .05, mt, 0, 0, 0); bx(g, w, .12, d, mt, 0, 0, 0);
        [-1, 1].forEach(s => bx(g, .04, h, d, mt, s * w / 2, 0, 0));
        (lados === 2 ? [-1, 1] : [1]).forEach(lz => {
          for (let k = 0; k < 4; k++) {
            const yy = .15 + k * .4; bx(g, w - .06, .02, d / 2 - .04, mt, 0, yy, lz * d / 4);
            const pm = produtosTex(sem + k * 3 + (lz > 0 ? 0 : 50), k === 3 ? 'garrafas' : 'caixas', .1);
            const p = pl(g, w - .08, .36, pm, 0, yy + .2, lz * (d / 2 - .06)); if (lz < 0) p.rotation.y = Math.PI;
            bx(g, w - .06, .05, .01, m('#e8e0c8'), 0, yy - .01, lz * (d / 2 - .015));
          }
        });
        if (o.placa) { const pt = canvasMat(512, 96, (x, W, H) => { x.fillStyle = '#b81a1a'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; x.font = 'bold 54px Arial'; x.textAlign = 'center'; x.fillText(o.placa, W / 2, 66); }); pl(g, w * .6, .16, pt, 0, h + .12, .03); bx(g, .02, .12, .02, metal(), 0, h, 0); }
        if (tombado) { g.rotation.z = .1; }
        return g;
      },
      // revisteiro inclinado com capas
      revistaria(o) {
        const g = G(), w = o.w || 1.4, h = 1.6, r = rng(o.sem || 75), mt = sujo('#2a2a2e');
        [-1, 1].forEach(s => bx(g, .04, h, .45, mt, s * w / 2, 0, 0)); bx(g, w, h, .03, mt, 0, 0, -.2);
        for (let k = 0; k < 5; k++) {
          const yy = .2 + k * .3; const tb = bx(g, w - .06, .02, .2, mt, 0, yy, 0); tb.rotation.x = .25;
          const capas = canvasMat(512, 128, (x, W, H) => { let px = 0; while (px < W) { const ww = 70 + r() * 30; x.fillStyle = `hsl(${r() * 360},${40 + r() * 40}%,${25 + r() * 35}%)`; x.fillRect(px, 0, ww - 4, H); x.fillStyle = 'rgba(255,255,255,.8)'; x.font = 'bold 18px Arial'; x.fillText(['VEJA', 'NEWS', 'ISTO', 'MODA', 'TV', 'CRIME'][Math.floor(r() * 6)], px + 6, 22); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px + 8, 40, ww - 20, 60); if (r() < .25) { x.fillStyle = 'rgba(120,10,10,.6)'; x.beginPath(); x.arc(px + ww / 2, 80, 14, 0, 7); x.fill(); } px += ww; } x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(0, 0, W, H); });
          const p = pl(g, w - .1, .28, capas, 0, yy + .17, .04); p.rotation.x = -.35;
        }
        return g;
      },
      // mesa redonda de lanchonete com cadeiras de metal e restos de comida
      mesa_redonda(o) {
        const g = G(), r = rng(o.sem || 77), tampo = m('#3a3c40', { tex: 'metal_sujo', me: .4, r: .5 });
        cy(g, .45, .45, .04, tampo, 0, .74, 0, 28); cy(g, .04, .04, .74, metal('#2a2a2a'), 0, 0, 0, 10); cy(g, .25, .3, .03, metal('#1a1a1a'), 0, 0, 0, 20);
        (o.cadeiras ?? 2) && Array.from({ length: o.cadeiras ?? 2 }).forEach((_, i) => { const c = P.cadeira_bistro({}); const a = i * 2.4 + 1.2; c.position.set(Math.sin(a) * .72, 0, Math.cos(a) * .72); c.rotation.y = a + Math.PI + (r() - .5) * .5; g.add(c); });
        if (o.restos !== false) { const it = P.restos_comida({ sem: o.sem }); it.position.y = .78; g.add(it); }
        return g;
      },
      cadeira_bistro(o) {
        const g = G(), mt = m('#151515', { me: .6, r: .4 });
        cy(g, .2, .2, .04, m('#1e1e1e', { r: .5 }), 0, .46, 0, 18);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const p = cy(g, .012, .012, .48, mt, a * .13, 0, b * .13, 6); });
        const enc = new T.Mesh(guardar(new T.TorusGeometry(.18, .012, 6, 18, Math.PI)), mt); enc.position.set(0, .82, -.17); g.add(enc);
        [-1, 1].forEach(s => cy(g, .012, .012, .38, mt, s * .17, .46, -.17, 6));
        const anel = new T.Mesh(guardar(new T.TorusGeometry(.12, .008, 6, 16)), mt); anel.rotation.x = Math.PI / 2; anel.position.y = .55; anel.position.z = -.17; g.add(anel);
        return g;
      },
      // restos: copo de café, hambúrguer mordido, rosquinhas, embalagens
      restos_comida(o) {
        const g = G(), r = rng(o.sem || 79);
        const copo = cy(g, .045, .035, .13, m('#8a6a4a', { r: .7 }), .12, 0, .1, 12); cy(g, .046, .046, .012, m('#ffffff'), .12, .13, .1, 12);
        const pao = sf(g, .07, m('#b8783a', { r: .7 }), -.1, .04, -.05, 12); pao.scale.y = .45; cy(g, .065, .065, .015, m('#4a2a14'), -.1, .03, -.05, 12);
        for (let i = 0; i < 3; i++) { const ro = new T.Mesh(guardar(new T.TorusGeometry(.04, .02, 6, 12)), m(['#c8964a', '#6a3a1a', '#e8c8d8'][i])); ro.rotation.x = Math.PI / 2; ro.position.set(-.2 + i * .07, .02, .15 - i * .02); g.add(ro); }
        for (let i = 0; i < 4; i++) { const p = pl(g, .12, .1, m('#e8e4d8', { r: 1, lado: 2 }), (r() - .5) * .5, .012, (r() - .5) * .5); p.rotation.x = -Math.PI / 2; p.rotation.z = r() * 3; }
        for (let i = 0; i < 12; i++) sf(g, .01 + r() * .012, m('#6a4a2a'), (r() - .5) * .6, .01, (r() - .5) * .6, 5);
        return g;
      },

      /* ---------- CN 02 · servidores ---------- */
      rack_servidor(o) {
        const g = G(), w = o.w || .7, h = o.h || 2.2, d = .9, r = rng(o.sem || 81), mt = sujo('#1c1e22', 'metal_sujo');
        bx(g, w, h, d, mt);
        const leds = canvasMat(128, 512, (x, W, H) => { x.fillStyle = '#0a0b0d'; x.fillRect(0, 0, W, H); for (let j = 0; j < 16; j++) { const y0 = 8 + j * 31; x.fillStyle = '#16181c'; x.fillRect(6, y0, W - 12, 26); x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(6, y0, W - 12, 2); for (let k = 0; k < 6; k++) { x.fillStyle = r() < .6 ? ['#2ecc71', '#2ecc71', '#f1c40f', '#e74c3c', '#3498db'][Math.floor(r() * 5)] : '#222'; x.fillRect(12 + k * 7, y0 + 10, 4, 4); } for (let k = 0; k < 8; k++) { x.fillStyle = '#0a0a0a'; x.fillRect(60 + k * 7, y0 + 6, 4, 14); } } }, { brilho: .9 });
        const fr = pl(g, w - .08, h - .12, leds, 0, h / 2, d / 2 + .005);
        bx(g, w - .04, h - .06, .02, m('#9ab0c0', { unico: true, op: .12, r: .05 }), 0, .03, d / 2 + .02);
        bx(g, .02, .4, .03, metal('#aab'), w / 2 - .06, h / 2 - .2, d / 2 + .04);
        const off = r() * 9; anim.push((dt, t) => { leds.emissiveIntensity = .7 + (Math.sin(t * 11 + off) > .6 ? .4 : 0); leds.map.offset.y = Math.floor(t * 2 + off) % 7 === 0 ? .002 : 0; });
        return g;
      },
      mesa_metal(o) {
        const g = G(), w = o.w || 1.8, d = o.d || .8, mt = sujo(o.c || '#4a4e52', 'metal_sujo', { rep: [2, 1] });
        bx(g, w, .04, d, mt, 0, .74, 0);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cy(g, .02, .02, .74, metal('#2a2a2a'), a * (w / 2 - .06), 0, b * (d / 2 - .06), 6));
        bx(g, w - .1, .02, .02, metal('#2a2a2a'), 0, .2, d / 2 - .06); bx(g, w - .1, .02, .02, metal('#2a2a2a'), 0, .2, -d / 2 + .06);
        return g;
      },
      // pilhas de papéis e pastas (em cima de mesa: h0 = altura da mesa)
      pilhas_papel(o) {
        const g = G(), r = rng(o.sem || 83), n = o.n || 6, w = o.w || 1.4, d = o.d || .6, geos = [], geosC = [];
        for (let i = 0; i < n; i++) { const px = (r() - .5) * w, pz = (r() - .5) * d, hh = .03 + r() * .2, rot = (r() - .5) * .5; for (let k = 0; k < Math.ceil(hh / .03); k++) geos.push(ret(.24 + r() * .04, .028, .32 + r() * .03, px + (r() - .5) * .03, k * .03, pz + (r() - .5) * .03, 0, rot + (r() - .5) * .15)); if (r() < .35) geosC.push(ret(.25, .02, .33, px, hh + .01, pz, 0, rot)); }
        for (let i = 0; i < (o.soltos ?? 5); i++) geos.push(ret(.21, .002, .29, (r() - .5) * w * 1.1, .001, (r() - .5) * d * 1.1, 0, r() * 3));
        const mp = m('#9c947f', { r: .95, tex: 'madeira_velha', rep: [1, 4] }); g.add(juntar(geos, mp)); if (geosC.length) g.add(juntar(geosC, m('#7a6a4a', { r: .9 })));
        return g;
      },

      /* ---------- CN 03 · alta voltagem ---------- */
      centelhas(o) {
        const g = G(), r = rng(o.sem || 85), R = o.raio || .35, cor = o.c || '#bfe4ff';
        const mt = new T.LineBasicMaterial({ color: cor, transparent: true, opacity: 1 }); guardar(mt);
        const linhas = []; for (let k = 0; k < 4; k++) { const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(new Float32Array(10 * 3), 3)); guardar(geo); const l = new T.Line(geo, mt); g.add(l); linhas.push(l); }
        const brilho = sf(g, .05, m('#ffffff', { unico: true, e: cor, ei: 3, op: .9 }), 0, 0, 0, 8);
        const L = luz(g, cor, 0, 3.5, 0, 0, .1);
        let prox = 0; const ff = r() * 9;
        anim.push((dt, t) => {
          if (t > prox) { prox = t + .04 + Math.random() * .12; linhas.forEach(l => { const p = l.geometry.attributes.position; let x = 0, y = 0, z = 0; const ax = (Math.random() - .5) * 2, ay = (Math.random() - .3) * 2, az = Math.random(); for (let i = 0; i < 10; i++) { p.setXYZ(i, x, y, z); x += ax * R / 9 + (Math.random() - .5) * .07; y += ay * R / 9 + (Math.random() - .5) * .07; z += az * R / 12; } p.needsUpdate = true; l.visible = Math.random() < .7; }); }
          const on = Math.sin(t * 7 + ff) > .2 || Math.random() < .1; brilho.visible = on; mt.opacity = on ? 1 : 0; L.intensity = on ? 1.2 + Math.random() * 1.5 : 0;
        });
        return g;
      },
      quadro_eletrico(o) {
        const g = G(), w = o.w || .9, h = o.h || 1.9, d = .55, mt = sujo(o.c || '#4a4e52', 'metal_sujo');
        bx(g, w, h, d, mt);
        bx(g, .01, h - .1, .01, m('#111'), 0, .05, d / 2 + .005);
        [-1, 1].forEach(s => bx(g, .03, .14, .03, metal('#999'), s * .06, h * .55, d / 2 + .02));
        const placa = canvasMat(256, 300, (x, W, H) => { x.fillStyle = '#e8e4d8'; x.fillRect(0, 0, W, H); for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(80,60,30,${Math.random() * .2})`; x.fillRect(Math.random() * W, Math.random() * H, 3, 3); } x.fillStyle = '#e8b417'; x.strokeStyle = '#111'; x.lineWidth = 8; x.beginPath(); x.moveTo(W / 2, 30); x.lineTo(W - 40, 190); x.lineTo(40, 190); x.closePath(); x.fill(); x.stroke(); x.fillStyle = '#111'; x.beginPath(); x.moveTo(W / 2 + 10, 70); x.lineTo(W / 2 - 18, 125); x.lineTo(W / 2 + 4, 125); x.lineTo(W / 2 - 12, 172); x.lineTo(W / 2 + 22, 112); x.lineTo(W / 2 + 2, 112); x.closePath(); x.fill(); x.font = 'bold 44px Arial'; x.textAlign = 'center'; x.fillText(o.txt || 'PERIGO', W / 2, 252); x.strokeStyle = '#111'; x.lineWidth = 4; x.strokeRect(6, 6, W - 12, H - 12); }, { r: .85 });
        pl(g, w * .6, w * .7, placa, -w * .12, h * .62, d / 2 + .01);
        bx(g, w * .9, .25, d * .9, sujo('#2a2c2e'), 0, h, 0);
        if (o.centelhas !== false) { const f = P.centelhas({ sem: o.sem, raio: .4 }); f.position.set(0, h + .3, 0); g.add(f); }
        return g;
      },
      // fileira de baterias/transformadores com cabos
      baterias(o) {
        const g = G(), n = o.n || 5, r = rng(o.sem || 87), mt = sujo('#2c2e30', 'metal_sujo'), geos = [];
        for (let i = 0; i < n; i++) { const x0 = (i - (n - 1) / 2) * .34; bx(g, .3, .55 + r() * .15, .45, mt, x0, 0, 0); [-1, 1].forEach(s => cy(g, .03, .03, .06, m(s > 0 ? '#b82020' : '#202020', { r: .5 }), x0 + s * .08, .62, 0, 8)); bx(g, .22, .06, .02, m('#c8a428'), x0, .3, .23); }
        const cab = P.cabos_chao({ n: Math.ceil(n / 1.5), w: n * .34, d: 1.4, sem: o.sem }); cab.position.z = .9; g.add(cab);
        return g;
      },
      grade_chao(o) {
        const g = G(), w = o.w || 1.6, d = o.d || 1.0;
        const mt = m('#3a3a3a', { tex: 'grade_chao', rep: [w / 1.2, d / 1.2], me: .6, r: .5 });
        bx(g, w, .02, d, mt, 0, 0, 0);
        bx(g, w + .06, .025, .04, metal('#2a2a2a'), 0, 0, d / 2); bx(g, w + .06, .025, .04, metal('#2a2a2a'), 0, 0, -d / 2);
        if (o.brasa) { const b = pl(g, w - .1, d - .1, m('#ffffff', { unico: true, e: '#ff3010', ei: 1.4, op: .8 }), 0, -.005, 0); b.rotation.x = -Math.PI / 2; luz(g, '#ff4020', .9, 3, 0, .3, 0, true); const v = P.vapor_sobe({ y: 0 }); g.add(v); }
        return g;
      },

      /* ---------- CN 04 · consultório odontológico ---------- */
      cadeira_dentista2(o) {
        const g = G(), estofo = m('#7a8a90', { tex: 'metal_sujo', r: .45, me: .1 }), cromo = metal('#b8bec4'), r = rng(o.sem || 91);
        cy(g, .4, .5, .08, metal('#3a3e42'), 0, 0, 0, 24); cy(g, .12, .14, .45, cromo, 0, .08, 0, 14);
        const assento = bx(g, .62, .14, .7, estofo, 0, .52, .05); const enc = bx(g, .6, .85, .14, estofo, 0, .6, -.38); enc.rotation.x = -.55; enc.position.set(0, .7, -.42);
        bx(g, .3, .22, .1, estofo, 0, 1.18, -.72).rotation.x = -.55;
        const pernas = bx(g, .58, .12, .62, estofo, 0, .45, .62); pernas.rotation.x = .35;
        [-1, 1].forEach(s => { bx(g, .06, .05, .5, m('#3a3e42'), s * .36, .74, -.02); cy(g, .02, .02, .18, cromo, s * .36, .56, .1, 6); });
        // sangue no estofado
        const mancha = P.sangue({ chao: 1, estilo: 'poca', w: .45, sem: 3 }); mancha.position.set(0, .66, .08); g.add(mancha);
        // braço do refletor
        const poste = cy(g, .04, .04, 1.7, cromo, .55, .08, -.3, 10);
        const braco = G(); braco.position.set(.55, 1.78, -.3); g.add(braco);
        cy(braco, .025, .025, .8, cromo, 0, 0, 0, 8).rotation.z = Math.PI / 2; braco.children[0].position.set(-.4, 0, 0);
        const cab = G(); cab.position.set(-.8, -.05, .1); braco.add(cab);
        const refl = new T.Mesh(guardar(new T.SphereGeometry(.17, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)), m('#5a5e62', { me: .6, r: .4, lado: 2 })); refl.rotation.x = Math.PI * .85; cab.add(refl);
        const lamp = cy(cab, .13, .13, .02, emis('#fff6dc', 2.2), 0, -.05, .05, 18); lamp.rotation.x = Math.PI * .35;
        const spot = new T.SpotLight('#fff3d6', 1.6, 5, .6, .5, 2); spot.position.set(0, -.05, .05); spot.target.position.set(.4, -1.3, .1); cab.add(spot); cab.add(spot.target);
        anim.push((dt, t) => { const f = Math.sin(t * 13) > .96 ? .2 : 1; spot.intensity = 1.6 * f; lamp.material.emissiveIntensity = 2.2 * f; });
        // bandeja de instrumentos e cuspideira
        const bandeja = G(); bandeja.position.set(-.5, 1.0, .25); g.add(bandeja); bx(bandeja, .45, .02, .3, cromo); cy(g, .02, .02, .95, cromo, -.5, .05, .25, 6);
        for (let i = 0; i < 6; i++) { const it = bx(bandeja, .01, .01, .16, cromo, -.18 + i * .07, .02, (r() - .5) * .05); it.rotation.y = (r() - .5) * .3; }
        cy(g, .14, .1, .12, m('#e8e4dc', { r: .3 }), -.52, .82, -.25, 14); cy(g, .02, .02, .8, cromo, -.52, 0, -.25, 6);
        return g;
      },
      // bancada com gavetas e armários, pia e tralha em cima
      bancada_armarios(o) {
        const g = G(), w = o.w || 2.4, d = .62, h = .9, r = rng(o.sem || 93), mt = m(o.c || '#b8bcb6', { tex: 'metal_sujo', r: .6, me: .15 }), tampo = m(o.tampo || '#8a8478', { tex: 'chao_sujo', r: .55 });
        bx(g, w, h - .04, d, mt); bx(g, w + .04, .04, d + .04, tampo, 0, h - .04, .01);
        const nm = Math.max(2, Math.round(w / .5));
        for (let i = 0; i < nm; i++) { const x0 = -w / 2 + w / nm * (i + .5); bx(g, w / nm - .03, h - .12, .01, m('#a8aca6', { r: .5 }), x0, .04, d / 2 + .005); bx(g, .1, .015, .02, metal('#d0d0d0'), x0, h - .2, d / 2 + .02); if (i % 2 === 0) bx(g, w / nm - .06, .005, .01, m('#555'), x0, h * .55, d / 2 + .012); }
        if (o.pia) { cy(g, .2, .16, .06, metal('#c8ccd0'), o.pia, h - .04, 0, 18); const tor = cy(g, .015, .015, .3, metal('#c8ccd0'), o.pia, h, -.22, 8); const bico = cy(g, .012, .012, .16, metal('#c8ccd0'), o.pia, h + .28, -.15, 8); bico.rotation.x = Math.PI / 2; }
        // tralha: frascos, potes, uma caixa amarela, panos
        for (let i = 0; i < (o.tralha ?? 9); i++) { const px = (r() - .5) * (w - .3), pz = (r() - .5) * (d - .2); if (o.pia && Math.abs(px - o.pia) < .3) continue; const k = r(); if (k < .4) cy(g, .03 + r() * .03, .03 + r() * .03, .08 + r() * .14, m(['#e8e4d8', '#8a5a2a', '#d8c8a0', '#5a7a8a'][Math.floor(r() * 4)], { r: .4, op: k < .15 ? .7 : undefined }), px, h, pz, 10); else if (k < .6) bx(g, .12 + r() * .1, .05 + r() * .12, .1, m(['#e8b417', '#e8e0d0', '#7a8a7a'][Math.floor(r() * 3)], { r: .7 }), px, h, pz); else if (k < .8) { const p = pl(g, .25, .2, m('#d8d2c0', { r: 1, lado: 2 }), px, h + .005, pz); p.rotation.x = -Math.PI / 2; p.rotation.z = r() * 3; } else for (let j = 0; j < 3; j++) { const it = bx(g, .008, .008, .14, metal('#c0c4c8'), px + j * .02, h + .01, pz); it.rotation.y = r(); } }
        // escorrido escuro da bancada (sangue/óleo)
        if (o.escorre) { const es = P.sangue({ estilo: 'escorrido', w: .5, h: .7, y: .15, sem: 5 }); es.position.set(o.escorre, 0, d / 2 + .012); g.add(es); for (let i = 0; i < 8; i++) { const fio = cy(g, .006, .004, .3 + r() * .5, m('#1a0404', { r: .2 }), o.escorre + (r() - .5) * .4, h - .7 - r() * .2, d / 2 + .02, 4); } }
        return g;
      },
      armario_suspenso(o) {
        const g = G(), w = o.w || 1.2, h = o.h || .7, y = o.y ?? 1.8, mt = m(o.c || '#b8bcb6', { tex: 'metal_sujo', r: .6 });
        bx(g, w, h, .36, mt, 0, y, 0); bx(g, .01, h - .06, .01, m('#444'), 0, y + .03, .185);
        [-1, 1].forEach(s => bx(g, .02, .12, .02, metal('#ccc'), s * .06, y + .08, .2));
        return g;
      },
      // negatoscópio: quadros de luz com radiografias de crânios
      negatoscopio(o) {
        const g = G(), n = o.n || 4, w = o.w || 1.8, h = .7, y = o.y ?? 1.35, r = rng(o.sem || 95);
        const mt = canvasMat(1024, 400, (x, W, H) => {
          x.fillStyle = '#c8dce8'; x.fillRect(0, 0, W, H); const cw = W / n;
          for (let i = 0; i < n; i++) {
            const cx = cw * (i + .5); x.fillStyle = '#0c1014'; x.fillRect(cw * i + 10, 10, cw - 20, H - 20);
            x.strokeStyle = 'rgba(220,235,245,.85)'; x.fillStyle = 'rgba(210,228,240,.55)'; x.lineWidth = 3;
            x.beginPath(); x.ellipse(cx, H * .38, cw * .28, H * .28, 0, 0, 7); x.fill(); x.stroke();
            x.fillStyle = '#0c1014'; [-1, 1].forEach(s => { x.beginPath(); x.ellipse(cx + s * cw * .1, H * .38, cw * .07, H * .08, 0, 0, 7); x.fill(); });
            x.beginPath(); x.moveTo(cx, H * .44); x.lineTo(cx - 10, H * .55); x.lineTo(cx + 10, H * .55); x.fill();
            x.fillStyle = 'rgba(210,228,240,.7)'; for (let k = 0; k < 8; k++) x.fillRect(cx - cw * .17 + k * cw * .045, H * .62, cw * .03, H * .08);
            x.strokeStyle = 'rgba(210,228,240,.5)'; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(cx - cw * .2, H * (.76 + k * .04)); x.quadraticCurveTo(cx, H * (.8 + k * .04), cx + cw * .2, H * (.76 + k * .04)); x.stroke(); }
            if (r() < .5) { x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(cw * i + 10, 10, cw - 20, H - 20); }
          }
        }, { brilho: 1.1 });
        bx(g, w + .08, h + .08, .08, m('#2a2c2e', { me: .4 }), 0, y - .04, 0);
        pl(g, w, h, mt, 0, y + h / 2, .045);
        luz(g, '#d8ecff', .5, 3, 0, y + h / 2, .4);
        return g;
      },
      // quadros de dentes (pôsteres antigos)
      quadro_dentes(o) {
        const g = G(), w = o.w || .8, h = o.h || 1.0, y = o.y ?? 1.3, r = rng(o.sem || 97);
        const mt = canvasMat(256, 320, (x, W, H) => {
          x.fillStyle = '#c8b898'; x.fillRect(0, 0, W, H); for (let i = 0; i < 600; i++) { x.fillStyle = `rgba(70,50,20,${r() * .2})`; x.fillRect(r() * W, r() * H, 3, 3); }
          x.fillStyle = '#3a2a1a'; x.font = 'bold 16px serif'; x.textAlign = 'center'; x.fillText(o.titulo || 'ANATOMIA DENTÁRIA', W / 2, 26);
          const n = o.estilo === 'molar' ? 4 : 10;
          for (let i = 0; i < n; i++) {
            const cx = o.estilo === 'molar' ? W * (.3 + (i % 2) * .4) : W * (.15 + (i % 5) * .175), cy = o.estilo === 'molar' ? H * (.35 + Math.floor(i / 2) * .32) : H * (.38 + Math.floor(i / 5) * .32), s = o.estilo === 'molar' ? 46 : 18;
            x.fillStyle = '#efe6d0'; x.strokeStyle = '#5a3a1a'; x.lineWidth = 2;
            x.beginPath(); x.moveTo(cx - s, cy - s * .5); x.quadraticCurveTo(cx - s, cy - s * 1.1, cx, cy - s * .9); x.quadraticCurveTo(cx + s, cy - s * 1.1, cx + s, cy - s * .5); x.lineTo(cx + s * .6, cy + s * 1.2); x.lineTo(cx + s * .1, cy + s * .3); x.lineTo(cx - s * .3, cy + s * 1.3); x.closePath(); x.fill(); x.stroke();
            x.fillStyle = 'rgba(160,60,40,.5)'; x.beginPath(); x.ellipse(cx, cy - s * .3, s * .35, s * .45, 0, 0, 7); x.fill();
          }
          x.fillStyle = 'rgba(40,20,10,.35)'; x.fillRect(0, H - 40, W, 40);
        }, { r: .9 });
        bx(g, w + .08, h + .08, .04, m('#2a1e14', { r: .6 }), 0, y - .04, 0); pl(g, w, h, mt, 0, y + h / 2, .025);
        return g;
      },
      mocho(o) { const g = G(); cy(g, .2, .2, .08, m('#2a2c30', { r: .5 }), 0, .55, 0, 18); cy(g, .03, .03, .5, metal('#888'), 0, .05, 0, 8); for (let i = 0; i < 5; i++) { const a = i * 1.257; const p = bx(g, .03, .03, .28, metal('#555'), Math.sin(a) * .13, .03, Math.cos(a) * .13); p.rotation.y = a; sf(g, .03, m('#111'), Math.sin(a) * .26, .03, Math.cos(a) * .26, 6); } return g; },

      /* ---------- CN 07 / 09 / 10 · máquinas ---------- */
      // console de controle com telas acesas, botões e mostradores
      console_tela(o) {
        const g = G(), w = o.w || 1.1, r = rng(o.sem || 99), cor = o.cor || '#ffb040', mt = sujo(o.c || '#4a4842', o.ferrugem ? 'ferrugem' : 'metal_sujo', { rep: [1, 1] });
        bx(g, w, .95, .7, mt); const tampo = bx(g, w, .06, .45, mt, 0, .95, .08); tampo.rotation.x = .45;
        bx(g, w, .6, .3, mt, 0, 1.0, -.22);
        const tela2 = canvasMat(256, 160, (x, W, H) => { x.fillStyle = '#0a0806'; x.fillRect(0, 0, W, H); x.strokeStyle = cor; x.fillStyle = cor; x.lineWidth = 2; x.globalAlpha = .9; for (let i = 0; i < 6; i++) x.fillRect(12, 14 + i * 22, 40 + r() * 140, 8); x.beginPath(); x.moveTo(10, H - 20); for (let i = 0; i < 30; i++) x.lineTo(10 + i * 8, H - 30 - r() * 40); x.stroke(); x.globalAlpha = .15; for (let i = 0; i < H; i += 3) x.fillRect(0, i, W, 1); }, { brilho: 1.2 });
        const n = o.telas || Math.max(1, Math.round(w / .55));
        for (let i = 0; i < n; i++) { const x0 = -w / 2 + w / n * (i + .5); bx(g, w / n - .08, .42, .08, m('#1a1a1a', { me: .4 }), x0, 1.08, -.06); pl(g, w / n - .14, .34, tela2, x0, 1.29, -.015); }
        for (let i = 0; i < 10; i++) { const b = cy(g, .02, .02, .025, m(['#ff3020', '#30ff60', '#ffd020', '#ddd'][Math.floor(r() * 4)], { e: r() < .5 ? '#ff6020' : '#000', ei: .8 }), (r() - .5) * (w - .2), 1.0, .14 + r() * .1, 8); b.rotation.x = .45; }
        for (let i = 0; i < 2; i++) { const mo = cy(g, .06, .06, .02, m('#e8e4d8'), (i - .5) * .3, .7, .36, 14); mo.rotation.x = Math.PI / 2; }
        const cab = P.cabos_chao({ n: 4, w: w, d: 1.2, sem: o.sem, c: '#121212' }); cab.position.z = .9; g.add(cab);
        const off = r() * 5; anim.push((dt, t) => { tela2.emissiveIntensity = 1.0 + Math.sin(t * 9 + off) * .15 + (Math.random() < .02 ? .8 : 0); });
        return g;
      },
      caixa_metal(o) { const g = G(), w = o.w || .7, h = o.h || .45; bx(g, w, h, .45, sujo('#3a3c3e', 'metal_sujo')); bx(g, w + .02, .05, .47, sujo('#2a2c2e'), 0, h, 0); [-1, 1].forEach(s => bx(g, .12, .03, .03, metal('#777'), s * w * .3, h * .7, .24)); return g; },
      // tubulação grossa pela parede (canos verticais com um tubo horizontal em cima)
      canos_parede(o) {
        const g = G(), n = o.n || 4, w = o.w || 2.4, R = o.raio || .14, mt = m(o.c || '#5a3a2a', { tex: 'ferrugem', me: .55, r: .5 }), geos = [];
        for (let i = 0; i < n; i++) { const x0 = -w / 2 + w / (n - 1 || 1) * i; geos.push(cil(R, R, ALT - .35, x0, 0, 0, 14)); for (let k = 0; k < 4; k++) geos.push(cil(R + .03, R + .03, .06, x0, .4 + k * .7, 0, 14)); }
        const cano = juntar(geos, mt); g.add(cano);
        const horiz = cy(g, R * 1.4, R * 1.4, w + .4, mt, 0, 0, 0, 14); horiz.rotation.z = Math.PI / 2; horiz.position.set(0, ALT - .45, 0);
        if (o.vazamento) { const v = P.vapor_sobe({ y: 1.2 }); v.position.set(w * .3, 0, .1); g.add(v); }
        return g;
      },
      // turbina gigante deitada no chão (num poço), girando devagar
      turbina_chao(o) {
        const g = G(), R = o.raio || 1.2, mt = m('#6a625a', { tex: 'ferrugem', me: .6, r: .45 });
        const aro = new T.Mesh(guardar(new T.TorusGeometry(R, .1, 10, 40)), mt); aro.rotation.x = Math.PI / 2; aro.position.y = .2; g.add(aro);
        const fundo = new T.Mesh(guardar(new T.CircleGeometry(R, 32)), m('#050505')); fundo.rotation.x = -Math.PI / 2; fundo.position.y = .02; g.add(fundo);
        const rotor = G(); rotor.position.y = .3; g.add(rotor);
        sf(rotor, .26, mt, 0, 0, 0, 16).scale.y = .6;
        for (let i = 0; i < 7; i++) { const p = G(); p.rotation.y = i * Math.PI * 2 / 7; rotor.add(p); const pa = bx(p, .3, .03, R * .85, mt, 0, -.015, R * .48); pa.rotation.z = .5; }
        if (o.sangue !== false) { const s2 = P.sangue({ chao: 1, estilo: 'respingo', w: R * 1.6, sem: o.sem || 4 }); s2.position.y = .25; g.add(s2); }
        const v = o.v ?? .4; anim.push(dt => { rotor.rotation.y += dt * v; });
        return g;
      },

      /* ---------- CN 08 · depósito ---------- */
      estante_pastas(o) {
        const g = G(), w = o.w || 2.0, h = o.h || 2.6, d = .42, r = rng(o.sem || 101), mt = sujo('#2a2c2e', 'metal_sujo');
        [-1, 1].forEach(s => bx(g, .04, h, d, mt, s * w / 2, 0, 0)); bx(g, w, h, .02, mt, 0, 0, -d / 2);
        const nP = Math.floor(h / .45);
        const pastas = canvasMat(1024, 128, (x, W, H) => { x.fillStyle = '#0c0c0c'; x.fillRect(0, 0, W, H); let px = 0; while (px < W) { const ww = 26 + r() * 22; if (r() < .08) { px += ww; continue; } x.fillStyle = `hsl(${30 + r() * 20},${10 + r() * 25}%,${55 + r() * 25}%)`; x.fillRect(px, 8 + r() * 10, ww - 3, H); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px + ww - 6, 0, 3, H); x.fillStyle = '#f2ece0'; x.fillRect(px + 4, 40, ww - 11, 26); x.fillStyle = '#1a1a1a'; x.font = `bold ${Math.min(20, ww * .55)}px Arial`; x.textAlign = 'center'; x.fillText(String(Math.floor(r() * 99)), px + ww / 2 - 1, 60); x.fillStyle = `rgba(60,40,20,${r() * .4})`; x.fillRect(px, 70, ww - 3, H); px += ww; } }, { r: .85 });
        for (let k = 0; k < nP; k++) { const yy = .08 + k * .45; bx(g, w, .025, d, mt, 0, yy, 0); const p = pl(g, w - .1, .38, pastas, 0, yy + .21, d / 2 - .04); p.material = pastas; if (k % 2) p.scale.x = -1; }
        return g;
      },
      painel_leds(o) {
        const g = G(), w = o.w || .7, h = o.h || 1.0, y = o.y ?? .9, r = rng(o.sem || 103);
        bx(g, w + .1, h + .1, .2, sujo('#1a1c1e'), 0, y - .05, 0);
        const cores = ['#ff3020', '#30ff50', '#ffd020', '#ff8020'];
        const mt = canvasMat(128, 192, (x, W, H) => { x.fillStyle = '#050505'; x.fillRect(0, 0, W, H); for (let j = 0; j < 14; j++) for (let i = 0; i < 10; i++) { x.fillStyle = r() < .55 ? cores[Math.floor(r() * 4)] : '#1a1a1a'; x.beginPath(); x.arc(8 + i * 12, 8 + j * 13, 3.5, 0, 7); x.fill(); } }, { brilho: 1.4 });
        pl(g, w, h, mt, 0, y + h / 2, .105);
        const off = r() * 3; anim.push((dt, t) => { mt.map.offset.x = (Math.floor(t * 1.7 + off) % 3) * .08; });
        mt.map.wrapS = T.RepeatWrapping;
        return g;
      },
      carrinho(o) {
        const g = G(), mt = sujo('#5a5e62');
        [.2, .65].forEach(yy => bx(g, .9, .03, .5, mt, 0, yy, 0)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { cy(g, .015, .015, .9, metal('#777'), a * .43, .05, b * .23, 6); sf(g, .05, m('#111'), a * .43, .05, b * .23, 8); });
        const alca = new T.Mesh(guardar(new T.TorusGeometry(.2, .012, 6, 12, Math.PI)), metal('#888')); alca.position.set(-.45, .95, 0); alca.rotation.y = Math.PI / 2; g.add(alca);
        const pp = P.pilhas_papel({ n: 3, w: .7, d: .3, soltos: 0, sem: o.sem }); pp.position.y = .68; g.add(pp);
        bx(g, .4, .2, .3, m('#6a5a3a', { tex: 'madeira_velha' }), .15, .23, 0);
        return g;
      },

      /* ---------- CN 11 · sala de aula ---------- */
      lousa(o) {
        const g = G(), w = o.w || 3.6, h = o.h || 1.3, y = o.y ?? .95, r = rng(o.sem || 105);
        const mt = canvasMat(1024, Math.round(1024 * h / w), (x, W, H) => {
          x.fillStyle = '#23382c'; x.fillRect(0, 0, W, H); for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(255,255,255,${r() * .05})`; x.fillRect(r() * W, r() * H, 3, 2); }
          x.strokeStyle = 'rgba(230,236,226,.55)'; x.fillStyle = 'rgba(230,236,226,.6)'; x.lineWidth = 2; const cols = o.colunas || 3;
          for (let c = 0; c < cols; c++) { const x0 = 30 + c * (W - 60) / cols; x.strokeRect(x0, 30, (W - 60) / cols - 20, H - 60); for (let l = 0; l < 12; l++) { let px = x0 + 14; const py = 56 + l * (H - 90) / 12; while (px < x0 + (W - 60) / cols - 60) { const ww = 8 + r() * 26; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) x.lineTo(px + ww * k / 3, py + (r() - .5) * 8); x.stroke(); px += ww + 8; } } }
          if (o.txt) { x.font = 'bold 54px "Comic Sans MS", cursive'; x.fillStyle = 'rgba(240,240,230,.85)'; x.textAlign = 'center'; x.fillText(o.txt, W / 2, H * .55); }
          x.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse(r() * W, r() * H, 60 + r() * 120, 20 + r() * 40, r() * 3, 0, 7); x.fill(); }
        }, { r: .95 });
        bx(g, w + .14, h + .14, .05, m('#4a3020', { tex: 'madeira_velha' }), 0, y - .07, 0); pl(g, w, h, mt, 0, y + h / 2, .03);
        bx(g, w, .04, .1, m('#4a3020', { tex: 'madeira_velha' }), 0, y - .06, .05); for (let i = 0; i < 4; i++) bx(g, .06, .015, .015, m('#f0f0e8'), -w * .3 + i * .15, y - .02, .06);
        return g;
      },
      carteira2(o) {
        const g = G(), r = rng(o.sem || 107), mad = m('#6a4a2e', { tex: 'madeira_velha', r: .8 }), ferro = metal('#3a3a3a');
        bx(g, .7, .04, .5, mad, 0, .72, 0); bx(g, .66, .14, .42, mad, 0, .58, 0);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cy(g, .015, .015, .58, ferro, a * .3, 0, b * .2, 6));
        const ch = G(); ch.position.set(0, 0, .55); ch.rotation.y = Math.PI + (r() - .5) * .3; g.add(ch);
        bx(ch, .42, .03, .4, mad, 0, .44, 0); bx(ch, .42, .32, .03, mad, 0, .6, .19); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cy(ch, .012, .012, .44, ferro, a * .18, 0, b * .17, 6)); [-1, 1].forEach(s => cy(ch, .012, .012, .5, ferro, s * .18, .44, .19, 6));
        if (o.livro !== false) { const lv = P.livro_aberto({ sem: o.sem }); lv.position.set((r() - .5) * .1, .76, 0); lv.rotation.y = (r() - .5) * .4; g.add(lv); }
        return g;
      },
      livro_aberto(o) {
        const g = G(), r = rng(o.sem || 109), w = o.w || .42;
        const pag = canvasMat(256, 160, (x, W, H) => { x.fillStyle = '#d8ccb0'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(40,30,20,.6)'; for (let s2 = 0; s2 < 2; s2++) for (let i = 0; i < 16; i++) x.fillRect(12 + s2 * W / 2, 12 + i * 9, W / 2 - 24 - r() * 20, 2); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(W / 2 - 2, 0, 4, H); x.fillStyle = `rgba(90,60,30,${r() * .3})`; x.fillRect(0, 0, W, H); }, { r: .95 });
        [-1, 1].forEach(s => { const p = pl(g, w / 2, w * .66, pag, s * w / 4, .012, 0); p.rotation.x = -Math.PI / 2; p.rotation.y = s * .06; if (s > 0) p.material = pag; });
        bx(g, w + .02, .012, w * .68, m('#3a2a1a', { r: .7 }), 0, 0, 0);
        return g;
      },
      mesa_professor(o) {
        const g = G(), mad = m('#5a3a22', { tex: 'madeira_velha', r: .75 }), w = o.w || 1.6;
        bx(g, w, .06, .75, mad, 0, .74, 0); bx(g, .45, .74, .7, mad, -w / 2 + .23, 0, 0); bx(g, .45, .74, .7, mad, w / 2 - .23, 0, 0); bx(g, w - .9, .4, .03, mad, 0, .34, -.34);
        const gl = P.globo({}); gl.position.set(-w / 2 + .3, .8, -.1); g.add(gl);
        const pp = P.pilhas_papel({ n: 3, w: .6, d: .35, soltos: 2, sem: o.sem }); pp.position.set(.2, .8, 0); g.add(pp);
        cy(g, .05, .045, .12, m('#6a6a6a', { me: .5 }), .55, .8, -.15, 10); for (let i = 0; i < 5; i++) { const lp = cy(g, .006, .006, .16, m(['#d8b420', '#c03020', '#202080'][i % 3]), .55 + (i - 2) * .012, .86, -.15, 5); lp.rotation.z = (i - 2) * .1; }
        return g;
      },
      estante_livros(o) {
        const g = G(), w = o.w || 1.2, h = o.h || 2.0, d = .35, r = rng(o.sem || 111), mad = m('#4a3020', { tex: 'madeira_velha' });
        [-1, 1].forEach(s => bx(g, .04, h, d, mad, s * w / 2, 0, 0)); bx(g, w, h, .02, mad, 0, 0, -d / 2);
        const livros = canvasMat(512, 128, (x, W, H) => { x.fillStyle = '#0a0806'; x.fillRect(0, 0, W, H); let px = 0; while (px < W) { const ww = 10 + r() * 16, hh = H * (.65 + r() * .35); x.fillStyle = `hsl(${r() * 50},${20 + r() * 40}%,${15 + r() * 30}%)`; x.fillRect(px, H - hh, ww - 1, hh); x.fillStyle = 'rgba(220,190,120,.5)'; x.fillRect(px + 2, H - hh + 8, ww - 5, 2); x.fillRect(px + 2, H - 14, ww - 5, 2); if (r() < .1) { px += ww * 2; continue; } px += ww; } x.fillStyle = 'rgba(80,70,50,.2)'; x.fillRect(0, 0, W, H); }, { r: .85 });
        const nP = Math.floor(h / .38); for (let k = 0; k < nP; k++) { const yy = .05 + k * .38; bx(g, w, .025, d, mad, 0, yy, 0); pl(g, w - .08, .32, livros, 0, yy + .18, d / 2 - .05); }
        return g;
      },
      // janela com persiana e um facho de luz entrando (luz "de fora" que não existe)
      janela_luz(o) {
        const g = G(), w = o.w || 1.4, h = o.h || 1.5, y = o.y ?? .9;
        bx(g, w + .14, h + .14, .1, m('#d8d0c0', { r: .7 }), 0, y - .07, 0);
        pl(g, w, h, emis('#e8f0e0', 1.4), 0, y + h / 2, .02);
        for (let i = 0; i < 22; i++) { const l = bx(g, w, .03, .02, m('#c8c0b0', { r: .6 }), 0, y + .04 + i * (h / 22), .06); l.rotation.x = .9; }
        [-1, 1].forEach(s => { const c = bx(g, .35, h + .4, .04, m('#8a7a5a', { tex: 'madeira_velha', r: 1, lado: 2 }), s * (w / 2 + .1), y - .2, .12); });
        const fg = G(); fg.position.set(0, y + h * .55, .05); fg.rotation.x = .55; g.add(fg);
        const fgeo = new T.CylinderGeometry(w * .9, w * .32, 2.2, 4, 1, true); fgeo.rotateY(Math.PI / 4); fgeo.rotateX(Math.PI / 2); fgeo.translate(0, 0, 1.4);
        const facho = new T.Mesh(guardar(fgeo), m('#ffffff', { unico: true, e: '#fff4d8', ei: .5, op: .06, lado: 2 })); facho.material.depthWrite = false; fg.add(facho);
        luz(g, '#fff0d0', 1.0, 6, 0, y + h / 2, .8);
        return g;
      },

      /* ---------- CN 12 · fonética ---------- */
      cabine_vidro(o) {
        const g = G(), w = o.w || 1.3, d = o.d || 1.1, h = 2.3, mt = sujo('#4a3e30', 'metal_sujo');
        bx(g, w, h, .05, mt, 0, 0, -d / 2); [-1, 1].forEach(s => bx(g, .06, h, d, mt, s * w / 2, 0, 0)); bx(g, w, .08, d, mt, 0, h, 0);
        bx(g, w - .1, h - .4, .02, m('#9ab0a8', { unico: true, op: .22, r: .05, me: .2 }), 0, .35, d / 2); bx(g, w, .35, .05, mt, 0, 0, d / 2);
        [-1, 1].forEach(s => bx(g, .05, h, .06, mt, s * (w / 2 - .02), 0, d / 2));
        bx(g, w * .7, .04, .4, m('#3a2a1a', { tex: 'madeira_velha' }), 0, .75, -d / 2 + .25);
        const mic = P.microfone({}); mic.position.set(0, .79, -d / 2 + .3); g.add(mic);
        luz(g, '#ffd8a0', .35, 2.5, 0, h - .2, 0, true); sf(g, .06, emis('#ffd8a0', 1.2), 0, h - .1, 0, 10);
        return g;
      },
      microfone(o) { const g = G(); cy(g, .07, .08, .02, m('#1a1a1a', { me: .5 }), 0, 0, 0, 14); cy(g, .008, .008, .28, metal('#888'), 0, .02, 0, 6); const c = sf(g, .045, m('#1a1a1a', { r: .4 }), 0, .34, .02, 12); c.scale.y = 1.4; return g; },
      // estação de áudio: receptor com tela, microfone, fones e papéis
      estacao_audio(o) {
        const g = G(), r = rng(o.sem || 113), mad = m('#4a3a26', { tex: 'madeira_velha' }), w = o.w || 1.3;
        bx(g, w, .75, .7, mad); bx(g, w + .04, .04, .74, mad, 0, .75, 0);
        const rx = G(); rx.position.set(-.1, .79, -.1); g.add(rx); bx(rx, .55, .3, .35, sujo('#2a2a26'));
        const tl = canvasMat(128, 64, (x, W, H) => { x.fillStyle = '#081008'; x.fillRect(0, 0, W, H); x.strokeStyle = '#6aff8a'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i < W; i += 3) x.lineTo(i, H / 2 + Math.sin(i * .3) * (8 + r() * 14)); x.stroke(); }, { brilho: 1.2 }); pl(rx, .24, .14, tl, -.1, .17, .18);
        for (let i = 0; i < 3; i++) { const k = cy(rx, .03, .03, .03, metal('#aaa'), .1 + i * .07, .1, .18, 10); k.rotation.x = Math.PI / 2; }
        const mic = P.microfone({}); mic.position.set(.35, .79, .05); g.add(mic);
        const fone = new T.Mesh(guardar(new T.TorusGeometry(.09, .012, 6, 14, Math.PI)), m('#151515')); fone.position.set(-.45, .82, .15); fone.rotation.x = -1.2; g.add(fone); [-1, 1].forEach(s => { const e = cy(g, .045, .045, .03, m('#222'), -.45 + s * .09, .79, .2, 12); });
        const pp = P.papeis_chao({ n: 4, w: .8, d: .4, sem: o.sem }); pp.position.y = .78; g.add(pp);
        const cab = P.cabos_chao({ n: 3, w: .8, d: 1.2, sem: o.sem, sobe: .75 }); cab.position.z = .55; g.add(cab);
        return g;
      },
      // a "onda de som" visível no ar (efeito)
      onda_som(o) {
        const g = G(), w = o.w || 4, y = o.y ?? 1.3, nP = 120, mt = new T.LineBasicMaterial({ color: o.c || '#d8f0e0', transparent: true, opacity: .55 }); guardar(mt);
        const linhas = [0, 1, 2].map(k => { const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(new Float32Array(nP * 3), 3)); guardar(geo); const l = new T.Line(geo, mt); g.add(l); return l; });
        anim.push((dt, t) => linhas.forEach((l, k) => { const p = l.geometry.attributes.position; for (let i = 0; i < nP; i++) { const u = i / (nP - 1), xx = (u - .5) * w, env = Math.sin(u * Math.PI); p.setXYZ(i, xx, y + Math.sin(u * 40 + t * (6 + k) + k) * .18 * env * (1 + Math.sin(t * 1.3 + k)) + (k - 1) * .04, Math.sin(u * 7 + t) * .05); } p.needsUpdate = true; }));
        return g;
      },

      /* ---------- CN 13 · sala hemodinâmica ---------- */
      corpo_lencol(o) {
        const g = G(), r = rng(o.sem || 115), L = o.l || 1.9;
        const lenc = m('#ffffff', { unico: true, mapa: (() => { const [c, x] = tela(256, 256); x.fillStyle = '#9c938a'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(${100 + r() * 50},${r() * 10},${r() * 10},${.4 + r() * .5})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, 8 + r() * 40, 6 + r() * 30, r() * 3, 0, 7); x.fill(); } escorridos(x, 256, r, 14, '#6a0606', .7, 120); return texCanvas(c); })(), r: .55, lado: 2 });
        const corpo = G(); g.add(corpo);
        const tor = sf(corpo, .3, lenc, 0, .14, -.1, 16); tor.scale.set(1.1, .5, 2.4);
        sf(corpo, .14, lenc, 0, .16, -L / 2 + .15, 14).scale.set(1, .8, 1.1);
        [-1, 1].forEach(s => { const p = cy(corpo, .1, .07, .8, lenc, s * .12, .06, .45, 10); p.rotation.x = Math.PI / 2; p.position.set(s * .12, .1, .5); });
        const panos = new T.Mesh(guardar(new T.PlaneGeometry(1.0, L + .2, 6, 10)), lenc); panos.rotation.x = -Math.PI / 2; panos.position.y = .02; g.add(panos);
        [-1, 1].forEach(s => { const cai = pl(g, L * .9, .45, lenc, s * .5, -.2, 0); cai.rotation.y = Math.PI / 2; });
        for (let i = 0; i < 5; i++) { const fio = cy(g, .007, .004, .3 + r() * .5, m('#5a0404', { r: .2 }), (r() < .5 ? -1 : 1) * .5, -.7 - r() * .2, (r() - .5) * L * .8, 4); }
        anim.push((dt, t) => { tor.scale.y = .5 + Math.max(0, Math.sin(t * .4)) * .015; });
        return g;
      },
      monitor_ecg(o) {
        const g = G(), w = o.w || .6, cor = o.cor || '#30ff70', fase = rng(o.sem || 117)() * 9;
        bx(g, w + .08, .46, .2, sujo('#3a3a36'), 0, 0, 0);
        const [c, x] = tela(256, 160); const t = texCanvas(c); const mt = m('#ffffff', { unico: true, mapa: t, e: '#ffffff', ei: 1.3 }); mt.emissiveMap = t;
        pl(g, w - .04, .36, mt, 0, .23, .105);
        let col = 0, ult = 0;
        anim.push((dt, tt) => {
          if (tt - ult < .03) return; ult = tt;
          if (col === 0) { x.fillStyle = '#020804'; x.fillRect(0, 0, 256, 160); x.strokeStyle = 'rgba(40,120,60,.25)'; for (let i = 0; i < 256; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 160); x.stroke(); } }
          x.fillStyle = '#020804'; x.fillRect(col, 0, 8, 160);
          const ph = (tt * 1.1 + fase) % 1; const yv = ph < .05 ? 80 - Math.sin(ph / .05 * Math.PI) * 60 : ph < .1 ? 80 + Math.sin((ph - .05) / .05 * Math.PI) * 25 : 80 + Math.sin(tt * 30) * 2;
          x.strokeStyle = cor; x.lineWidth = 3; x.beginPath(); x.moveTo(col - 4, x.__y || 80); x.lineTo(col, yv); x.stroke(); x.__y = yv;
          x.fillStyle = cor; x.font = 'bold 18px monospace'; x.fillStyle = '#020804'; x.fillRect(200, 6, 56, 22); x.fillStyle = cor; x.fillText(String(58 + Math.floor(Math.sin(tt) * 3)), 206, 24);
          col = (col + 4) % 256; t.needsUpdate = true;
        });
        return g;
      },
      // suporte de soro com bolsas de sangue e tubos
      suporte_bolsas(o) {
        const g = G(), n = o.n || 3, r = rng(o.sem || 119), cromo = metal('#a8aeb4');
        cy(g, .02, .02, 2.1, cromo, 0, 0, 0, 8); for (let i = 0; i < 5; i++) { const a = i * 1.257; const p = bx(g, .02, .02, .3, cromo, Math.sin(a) * .14, .04, Math.cos(a) * .14); p.rotation.y = a; sf(g, .025, m('#111'), Math.sin(a) * .28, .025, Math.cos(a) * .28, 6); }
        bx(g, .6, .015, .015, cromo, 0, 2.05, 0);
        for (let i = 0; i < n; i++) { const xx = (i - (n - 1) / 2) * .2; const b = bx(g, .13, .26, .04, m('#ffffff', { unico: true, e: '#4a0000', ei: .25, r: .15, op: .82, mapa: (() => { const [c, x] = tela(64, 128); x.fillStyle = '#7a0a0a'; x.fillRect(0, 0, 64, 128); x.fillStyle = '#f0ece0'; x.fillRect(8, 20, 48, 34); x.fillStyle = '#222'; x.font = 'bold 10px Arial'; x.fillText('O-  ' + (100 + i), 12, 40); x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(4, 4, 6, 120); return texCanvas(c); })() }), xx, 1.72 - r() * .05, 0); tubo(g, [[xx, 1.72, 0], [xx + .05, 1.3, .1], [xx * 2, .9, .25], [xx * 3, .7, .4]], .006, m('#8a0a0a', { r: .2, op: .85 }), 20); }
        return g;
      },
      foco_cirurgico(o) {
        const g = G(), y = ALT, cromo = metal('#b0b4b8');
        cy(g, .05, .05, .5, cromo, 0, y - .5, 0, 8);
        [-1, 1].forEach(s => { const br = G(); br.position.set(0, y - .5, 0); br.rotation.y = s * .9 + (o.r2 || 0); g.add(br); const arm = bx(br, .04, .04, .7, cromo, 0, 0, .35); const cab = G(); cab.position.set(0, -.15, .7); br.add(cab); const disco = new T.Mesh(guardar(new T.SphereGeometry(.35, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), m('#c8ccd0', { me: .5, r: .35, lado: 2 })); disco.rotation.x = Math.PI; cab.add(disco); for (let k = 0; k < 5; k++) { const a = k * 1.257; cy(cab, .07, .07, .02, emis('#fff6e0', 2.2), Math.sin(a) * .2, -.1, Math.cos(a) * .2, 14); } cy(cab, .07, .07, .02, emis('#fff6e0', 2.2), 0, -.1, 0, 14); const sp = new T.SpotLight('#fff8e8', 1.4, 6, .55, .6, 2); sp.position.set(0, -.1, 0); sp.target.position.set(-s * .4, -2, -.6); cab.add(sp); cab.add(sp.target); });
        return g;
      },
      bandeja_instrumentos(o) {
        const g = G(), r = rng(o.sem || 121), cromo = metal('#c0c4c8');
        bx(g, .7, .02, .45, cromo, 0, .85, 0); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cy(g, .012, .012, .85, cromo, a * .32, 0, b * .2, 6)); bx(g, .66, .015, .4, cromo, 0, .25, 0);
        for (let i = 0; i < 9; i++) { const it = G(); it.position.set((r() - .5) * .55, .875, (r() - .5) * .3); it.rotation.y = r() * 3; g.add(it); bx(it, .01, .008, .14 + r() * .06, cromo); if (r() < .4) bx(it, .025, .006, .04, cromo, 0, 0, .09); }
        const sg = P.sangue({ chao: 1, estilo: 'poca', w: .4, sem: 9 }); sg.position.set(.1, .865, 0); g.add(sg);
        return g;
      },

      /* ---------- CN 14 · câmara de pressão ---------- */
      coluna_pressao(o) {
        const g = G(), R = o.raio || .42, h = ALT, mt = m('#5a4a3a', { tex: 'ferrugem', me: .6, r: .45 }), geos = [];
        geos.push(cil(R, R, h, 0, 0, 0, 20)); for (let k = 0; k < 5; k++) geos.push(cil(R + .07, R + .07, .14, 0, .2 + k * .62, 0, 20));
        geos.push(cil(R + .18, R + .22, .3, 0, 0, 0, 20)); geos.push(cil(R + .14, R + .1, .28, 0, h - .55, 0, 20));
        g.add(juntar(geos, mt));
        const fresta = cy(g, R + .005, R + .005, .05, emis('#ff8a20', 1.6), 0, 1.35, 0, 20);
        for (let i = 0; i < 4; i++) { const a = i * 1.57 + .4; tubo(g, [[Math.sin(a) * R, 2.6, Math.cos(a) * R], [Math.sin(a) * (R + .3), 2.1, Math.cos(a) * (R + .3)], [Math.sin(a) * (R + .2), .6, Math.cos(a) * (R + .2)], [Math.sin(a) * (R + .6), .05, Math.cos(a) * (R + .6)]], .025, m('#1a1612', { r: .5 }), 24); }
        const L = luz(g, '#ff8a30', .7, 3, 0, 1.4, R + .3);
        const f = rng(o.sem || 3)() * 6; anim.push((dt, t) => { const k = .8 + Math.sin(t * 1.3 + f) * .3; fresta.material.emissiveIntensity = 1.6 * k; L.intensity = .7 * k; });
        return g;
      },
      // a porta incandescente da câmara, com escada de grade (fica numa parede SEM porta)
      portal_brilho(o) {
        const g = G(), w = o.w || 1.8, h = 2.4, mt = m('#3a2a1a', { tex: 'ferrugem', me: .6 });
        bx(g, w + .7, h + .5, .3, mt, 0, 0, -.1);
        const brasa = canvasMat(256, 340, (x, W, H) => { const gr = x.createRadialGradient(W / 2, H * .5, 10, W / 2, H * .5, W * .7); gr.addColorStop(0, '#fff6d0'); gr.addColorStop(.3, '#ffb040'); gr.addColorStop(1, '#6a1a00'); x.fillStyle = gr; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(255,255,220,.9)'; x.lineWidth = 6; x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2 + 6, H * .4); x.lineTo(W / 2 - 4, H * .7); x.lineTo(W / 2, H); x.stroke(); }, { brilho: 2 });
        pl(g, w, h, brasa, 0, .45 + h / 2, .06);
        for (let i = 0; i < 4; i++) bx(g, w * .7, .08, .35, m('#2a2420', { tex: 'grade_chao', me: .6 }), 0, i * .12, .25 + (3 - i) * .3);
        [-1, 1].forEach(s => { const lp = sf(g, .08, emis('#ffb040', 2), s * (w / 2 + .2), 1.7, .1, 10); });
        const L = luz(g, '#ff9a40', 2.2, 7, 0, 1.5, 1.0);
        anim.push((dt, t) => { brasa.emissiveIntensity = 1.8 + Math.sin(t * 2.3) * .3 + Math.random() * .2; L.intensity = 2 + Math.sin(t * 2.3) * .4; });
        return g;
      },

      /* ---------- CN 15 · escritório abandonado ---------- */
      maquina_escrever(o) {
        const g = G(), mt = m('#2a2826', { me: .4, r: .5 });
        const base = bx(g, .42, .1, .34, mt); const corpo = bx(g, .4, .1, .22, mt, 0, .1, -.04); corpo.rotation.x = -.25;
        for (let j = 0; j < 4; j++) for (let i = 0; i < 10; i++) cy(g, .011, .011, .01, m('#e8e2d0'), -.16 + i * .035 + j * .008, .12 + j * .02, .11 - j * .035, 8);
        const rolo = cy(g, .03, .03, .46, m('#151515', { r: .4 }), 0, .23, -.12, 12); rolo.rotation.z = Math.PI / 2; rolo.position.set(0, .23, -.12);
        const fl = pl(g, .2, .26, m('#e8e0cc', { r: 1, lado: 2 }), 0, .36, -.14); fl.rotation.x = -.15;
        return g;
      },
      telefone_antigo(o) { const g = G(), mt = m('#151515', { r: .3, me: .2 }); const b = bx(g, .2, .08, .22, mt); const disco = cy(g, .065, .065, .015, m('#c8c0a8'), 0, .085, .03, 18); disco.rotation.x = -.3; const fone = cy(g, .025, .025, .24, mt, 0, .12, -.05, 8); fone.rotation.z = Math.PI / 2; [-1, 1].forEach(s => sf(g, .035, mt, s * .12, .12, -.05, 8)); tubo(g, [[.1, .04, .1], [.18, .02, .2], [.1, 0, .3], [0, .01, .25]], .005, mt, 16); return g; },
      // esqueleto sentado numa poltrona (o funcionário que nunca saiu)
      esqueleto_poltrona(o) {
        const g = G(), osso_ = m('#c8b890', { r: .7 }), estofo = m('#3a2a1a', { tex: 'carpete_velho', r: .9 }), roupa = m('#2a2018', { r: 1, lado: 2 });
        bx(g, .8, .42, .8, estofo, 0, 0, 0); bx(g, .8, .9, .2, estofo, 0, .42, -.32); [-1, 1].forEach(s => bx(g, .16, .3, .8, estofo, s * .34, .42, 0));
        const cranio = sf(g, .11, osso_, 0, 1.2, -.12, 16); cranio.scale.set(.9, 1.05, 1.05);
        [-1, 1].forEach(s => sf(g, .028, m('#0a0806'), s * .04, 1.21, -.03, 8)); bx(g, .06, .04, .05, osso_, 0, 1.1, -.06);
        cy(g, .02, .02, .18, osso_, 0, .9, -.2, 6);
        for (let i = 0; i < 6; i++) { const c = new T.Mesh(guardar(new T.TorusGeometry(.13 - i * .006, .012, 5, 14, Math.PI * 1.3)), osso_); c.rotation.set(Math.PI / 2, 0, -Math.PI * .15); c.position.set(0, .98 - i * .055, -.17); g.add(c); }
        const casaco = new T.Mesh(guardar(new T.CylinderGeometry(.16, .26, .55, 12, 1, true, Math.PI * .25, Math.PI * 1.5)), roupa); casaco.position.set(0, .72, -.15); g.add(casaco);
        [-1, 1].forEach(s => { osso(g, [s * .18, 1.0, -.15], [s * .3, .7, -.05], .018, osso_); osso(g, [s * .3, .7, -.05], [s * .33, .62, .22], .015, osso_); for (let k = 0; k < 4; k++) osso(g, [s * .33, .62, .22], [s * (.31 + k * .015), .6, .3], .006, osso_); osso(g, [s * .1, .48, -.05], [s * .12, .5, .35], .025, osso_); osso(g, [s * .12, .5, .35], [s * .14, .05, .42], .02, osso_); });
        if (o.teia !== false) { const t = P.teia({ s: .6, sem: 5 }); t.position.set(0, 0, -.42); t.rotation.y = -Math.PI / 4; g.add(t); t.position.y = 1.45 - ALT + ALT; }
        return g;
      },
      escorpiao(o) {
        const g = G(), mt = m(o.c || '#3a2a14', { r: .4, me: .2 }), s = o.s || .25; g.scale.setScalar(s);
        const corpo = sf(g, .2, mt, 0, .1, 0, 12); corpo.scale.set(.8, .4, 1.4);
        for (let i = 0; i < 4; i++) [-1, 1].forEach(sx => osso(g, [sx * .1, .1, .12 - i * .1], [sx * .45, 0, .2 - i * .14], .02, mt));
        [-1, 1].forEach(sx => { osso(g, [sx * .1, .1, .25], [sx * .3, .1, .5], .03, mt); sf(g, .07, mt, sx * .33, .1, .6, 8).scale.set(.7, .5, 1.3); });
        let px = 0, py = .12, pz = -.25; for (let i = 0; i < 6; i++) { const npz = pz - .1 * Math.cos(i * .5), npy = py + .1 * Math.sin(i * .5) + .03; osso(g, [px, py, pz], [px, npy, npz], .03 - i * .003, mt); px = px; py = npy; pz = npz; } cy(g, .015, .001, .1, mt, 0, py, pz + .03, 6);
        return g;
      },

      /* ---------- CN 16 · artefatos cognitivos ---------- */
      vitrine_brilho(o) {
        const g = G(), w = o.w || 1.2, h = o.h || 1.4, cor = o.cor || '#ffb050', mad = m('#3a2410', { tex: 'madeira_velha' });
        bx(g, w, .9, .6, mad); bx(g, w, h, .05, mad, 0, .9, -.28); [-1, 1].forEach(s => bx(g, .05, h, .6, mad, s * w / 2, .9, 0)); bx(g, w, .06, .6, mad, 0, .9 + h, 0);
        bx(g, w - .1, h - .05, .02, m('#c0d0c8', { unico: true, op: .14, r: .05, me: .3 }), 0, .92, .29);
        const art = G(); art.position.set(0, 1.25, 0); g.add(art);
        const nucleo = sf(art, .12, emis(cor, 2.2), 0, 0, 0, 14); const anel = new T.Mesh(guardar(new T.TorusGeometry(.22, .012, 6, 30)), metal('#c8a050')); art.add(anel); const anel2 = anel.clone(); anel2.rotation.x = Math.PI / 2; art.add(anel2);
        for (let i = 0; i < 6; i++) { const a = i * 1.05; osso(art, [0, 0, 0], [Math.cos(a) * .3, -.25, Math.sin(a) * .2], .006, metal('#8a6a3a')); }
        luz(g, cor, .8, 2.5, 0, 1.3, .2);
        const et = canvasMat(256, 96, (x, W, H) => { x.fillStyle = '#e8dcc0'; x.fillRect(0, 0, W, H); x.fillStyle = '#2a1a0a'; x.font = 'bold 22px serif'; x.textAlign = 'center'; x.fillText(o.txt || 'FHP-??? · IMPRESSÃO', W / 2, 40); x.font = 'italic 16px serif'; x.fillText('sem função conhecida', W / 2, 72); }); const e = pl(g, .34, .13, et, 0, .97, .31); e.rotation.x = -.4;
        anim.push((dt, t) => { art.rotation.y += dt * .5; anel.rotation.x = t * .9; nucleo.material.emissiveIntensity = 1.8 + Math.sin(t * 3) * .5; });
        return g;
      },
      orbe(o) {
        const g = G(), cor = o.cor || '#fff0c0', mt = m('#6a5a3a', { tex: 'ferrugem', me: .6 });
        for (let i = 0; i < 3; i++) cy(g, .45 - i * .1, .5 - i * .1, .12, mt, 0, i * .12, 0, 18);
        const vidro = sf(g, .3, m('#d8e8f0', { unico: true, op: .25, r: .02, me: .3 }), 0, .7, 0, 24);
        const nucleo = sf(g, .08, emis(cor, 3), 0, .7, 0, 14);
        const raios = P.centelhas({ raio: .25, c: '#fff4d0', sem: o.sem }); raios.position.set(0, .7, 0); g.add(raios);
        for (let i = 0; i < 5; i++) { const a = i * 1.257; tubo(g, [[Math.sin(a) * .25, .3, Math.cos(a) * .25], [Math.sin(a) * .5, .15, Math.cos(a) * .5], [Math.sin(a) * .8, .02, Math.cos(a) * .8]], .012, m('#1a1612'), 12); }
        const L = luz(g, cor, 1.2, 4, 0, .8, 0);
        anim.push((dt, t) => { const k = .85 + Math.sin(t * 4) * .15; nucleo.material.emissiveIntensity = 3 * k; L.intensity = 1.2 * k; });
        return g;
      },
      cranio(o) { const g = G(), mt = m(o.metal ? '#8a8070' : '#c8b890', { r: o.metal ? .35 : .7, me: o.metal ? .7 : 0 }), s = o.s || 1; g.scale.setScalar(s); const c = sf(g, .11, mt, 0, .12, 0, 16); c.scale.set(.9, 1, 1.1); bx(g, .12, .06, .1, mt, 0, .02, .04); [-1, 1].forEach(sx => sf(g, .03, m('#0a0806'), sx * .04, .12, .09, 8)); for (let i = 0; i < 6; i++) bx(g, .012, .02, .01, m('#e8e0c8'), -.03 + i * .012, .03, .095); return g; },

      /* ---------- CN 17 · amostras ---------- */
      rack_tubos(o) {
        const g = G(), nx = o.nx || 8, nz = o.nz || 5, r = rng(o.sem || 123), tampa = o.tampa || '#5a2a7a', cromo = metal('#8a8e92');
        const w = nx * .09, d = nz * .09; bx(g, w + .06, .02, d + .06, cromo, 0, 0, 0); bx(g, w + .06, .02, d + .06, cromo, 0, .1, 0); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cy(g, .008, .008, .12, cromo, a * (w / 2 + .02), 0, b * (d / 2 + .02), 6));
        const vidroGeo = [], liqGeo = [], tampaGeo = [];
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { if (r() < .08) continue; const x0 = -w / 2 + .045 + i * .09, z0 = -d / 2 + .045 + j * .09, hh = .2; vidroGeo.push(cil(.032, .032, hh, x0, .02, z0, 10)); liqGeo.push(cil(.028, .028, hh * (.3 + r() * .55), x0, .03, z0, 10)); tampaGeo.push(cil(.035, .035, .04, x0, .02 + hh, z0, 10)); }
        g.add(juntar(liqGeo, m(o.liq || '#4a0408', { r: .2, e: '#1a0000', ei: .3 }))); g.add(juntar(vidroGeo, m('#d8e8f0', { op: .3, r: .05 }))); g.add(juntar(tampaGeo, m(tampa, { r: .5 })));
        if (o.txt) { const pt = canvasMat(512, 96, (x, W, H) => { x.fillStyle = '#c8bca0'; x.fillRect(0, 0, W, H); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(70,40,20,${Math.random() * .3})`; x.fillRect(Math.random() * W, Math.random() * H, 3, 3); } x.strokeStyle = '#2a1a0a'; x.lineWidth = 6; x.strokeRect(4, 4, W - 8, H - 8); x.fillStyle = '#1a1208'; x.font = 'bold 40px Arial'; x.textAlign = 'center'; x.fillText(o.txt, W / 2, 62); }); const p = pl(g, w, .14, pt, 0, .0, d / 2 + .05); p.position.y = .02 + .07; p.rotation.x = -.15; }
        return g;
      },
      // bolsas de sangue penduradas num trilho, com etiquetas
      bolsas_parede(o) {
        const g = G(), n = o.n || 5, w = o.w || 1.6, y = o.y ?? 1.45, r = rng(o.sem || 125);
        bx(g, w, .03, .03, metal('#6a6e72'), 0, y + .45, .02);
        for (let i = 0; i < n; i++) { const x0 = -w / 2 + w / n * (i + .5), cor = ['#5a0408', '#7a0a0a', '#3a0204', '#8a2a10'][Math.floor(r() * 4)]; cy(g, .004, .004, .12, metal(), x0, y + .33, .03, 4); const b = bx(g, .14, .26, .05, m(cor, { unico: true, r: .15, op: .88, e: '#200000', ei: .3 }), x0, y + .05, .04); b.rotation.z = (r() - .5) * .1; const et = pl(g, .09, .06, m('#ece4d0'), x0, y + .2, .07); tubo(g, [[x0, y + .05, .04], [x0 + .02, y - .2, .06], [x0 - .03, y - .45, .05]], .005, m('#6a0606', { op: .85 }), 10); }
        if (o.txt) { const pt = canvasMat(512, 80, (x, W, H) => { x.fillStyle = '#d0c4a8'; x.fillRect(0, 0, W, H); x.strokeStyle = '#2a1a0a'; x.lineWidth = 5; x.strokeRect(3, 3, W - 6, H - 6); x.fillStyle = '#1a1208'; x.font = 'bold 34px Arial'; x.textAlign = 'center'; x.fillText(o.txt, W / 2, 52); }); pl(g, w * .55, .12, pt, 0, y + .62, .03); }
        return g;
      },

      /* ---------- CN 19 · vídeo ---------- */
      tv_estatica(o) {
        const g = G(), s = o.s || 1, mt = m('#2a2420', { r: .5, me: .2 }); g.scale.setScalar(s);
        bx(g, .8, .6, .55, mt, 0, .12, 0); bx(g, .85, .12, .55, m('#1a1612', { me: .3 }), 0, 0, 0); bx(g, .25, .03, .01, emis('#40c0ff', .9), -.1, .05, .28);
        const [c, x] = tela(128, 96), t = texCanvas(c), tm = m('#ffffff', { unico: true, mapa: t, e: '#ffffff', ei: 1.3 }); tm.emissiveMap = t;
        const tl = pl(g, .58, .44, tm, -.07, .42, .28);
        for (let i = 0; i < 4; i++) { const k = cy(g, .025, .025, .02, m('#888'), .3, .55 - i * .08, .28, 10); k.rotation.x = Math.PI / 2; }
        const L = luz(g, '#b8d8ff', .9, 4, -.07, .4, .6);
        let ult = 0; anim.push((dt, tt) => { if (tt - ult < .05) return; ult = tt; const im = x.createImageData(128, 96); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = v * .85; im.data[i + 1] = v * .92; im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, (tt * 60) % 96, 128, 6); t.needsUpdate = true; L.intensity = .7 + Math.random() * .4; });
        return g;
      },
      vhs_pilha(o) {
        const g = G(), n = o.n || 6, r = rng(o.sem || 127), geos = [];
        for (let i = 0; i < n; i++) geos.push(ret(.19, .028, .105, (r() - .5) * .02, i * .029, (r() - .5) * .02, 0, (r() - .5) * .25));
        const capa = canvasMat(128, 64, (x, W, H) => { x.fillStyle = '#121212'; x.fillRect(0, 0, W, H); x.fillStyle = '#d8d0b8'; x.fillRect(10, 18, 108, 26); x.fillStyle = '#2a2a2a'; x.font = 'bold 14px Arial'; x.fillText('VHS · ' + (o.txt || 'CASO ' + Math.floor(r() * 99)), 14, 36); }, { r: .5 });
        g.add(juntar(geos, capa)); return g;
      },
      estante_vhs(o) {
        const g = G(), w = o.w || 1.6, h = o.h || 2.4, d = .3, r = rng(o.sem || 129), mad = m('#3a2a1a', { tex: 'madeira_velha' });
        [-1, 1].forEach(s => bx(g, .04, h, d, mad, s * w / 2, 0, 0)); bx(g, w, h, .02, mad, 0, 0, -d / 2);
        const fitas = canvasMat(1024, 128, (x, W, H) => { x.fillStyle = '#050505'; x.fillRect(0, 0, W, H); let px = 0; while (px < W) { const ww = 22 + r() * 6; if (r() < .07) { px += ww * 2; continue; } x.fillStyle = `hsl(${20 + r() * 30},${5 + r() * 15}%,${10 + r() * 20}%)`; x.fillRect(px, 10, ww - 2, H - 10); x.fillStyle = '#d8ccb0'; x.fillRect(px + 3, 30, ww - 8, 60); x.fillStyle = 'rgba(30,20,10,.7)'; for (let k = 0; k < 5; k++) x.fillRect(px + 6, 38 + k * 10, ww - 14, 2); if (r() < .08) { x.fillStyle = 'rgba(120,10,10,.6)'; x.fillRect(px + 2, 70, ww - 4, 20); } px += ww; } }, { r: .8 });
        const nP = Math.floor(h / .3); for (let k = 0; k < nP; k++) { const yy = .04 + k * .3; bx(g, w, .02, d, mad, 0, yy, 0); pl(g, w - .08, .24, fitas, 0, yy + .13, d / 2 - .03); }
        return g;
      },
      luminaria_mesa(o) {
        const g = G(), mt = m('#2a2a2a', { me: .6, r: .4 });
        cy(g, .09, .1, .03, mt, 0, 0, 0, 14); osso(g, [0, .03, 0], [.05, .35, -.05], .012, mt); osso(g, [.05, .35, -.05], [.2, .42, .05], .012, mt);
        const cup = new T.Mesh(guardar(new T.ConeGeometry(.09, .14, 14, 1, true)), m('#3a3a3a', { me: .5, lado: 2 })); cup.position.set(.24, .38, .08); cup.rotation.z = -.9; g.add(cup);
        sf(g, .035, emis('#ffd090', 2.5), .25, .35, .09, 10); luz(g, '#ffc070', 1.2, 3.5, .28, .3, .12);
        return g;
      },
      cinzeiro(o) { const g = G(); cy(g, .08, .07, .03, m('#3a3a36', { me: .5 }), 0, 0, 0, 14); for (let i = 0; i < 4; i++) { const c = cy(g, .006, .006, .07, m('#e8e0d0'), Math.cos(i * 1.6) * .04, .03, Math.sin(i * 1.6) * .04, 6); c.rotation.z = Math.PI / 2 - .2; c.rotation.y = i * 1.6; } const v = P.vapor_sobe({ y: .05 }); v.scale.setScalar(.25); g.add(v); return g; },

      /* ---------- CN 20 · testes psicológicos ---------- */
      mural_graficos(o) {
        const g = G(), w = o.w || 2.2, h = o.h || 1.4, y = o.y ?? 1.0, r = rng(o.sem || 131);
        const mt = canvasMat(1024, Math.round(1024 * h / w), (x, W, H) => {
          TX.cortica(x, W, r); x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(0, 0, W, H);
          for (let i = 0; i < 14; i++) {
            const px = r() * (W - 180), py = r() * (H - 180), pw = 120 + r() * 90, ph = 120 + r() * 90; x.save(); x.translate(px + pw / 2, py + ph / 2); x.rotate((r() - .5) * .12);
            x.fillStyle = '#ece6d6'; x.fillRect(-pw / 2, -ph / 2, pw, ph);
            const tipo = r();
            if (tipo < .35) { let a0 = 0; const cs = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad']; for (let k = 0; k < 6; k++) { const a1 = a0 + .4 + r() * 1.4; x.fillStyle = cs[k]; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, Math.min(pw, ph) * .38, a0, Math.min(a1, Math.PI * 2)); x.fill(); a0 = a1; } }
            else if (tipo < .6) { for (let k = 0; k < 6; k++) { x.fillStyle = ['#c0392b', '#2980b9', '#27ae60', '#f1c40f'][k % 4]; const bh = 20 + r() * (ph * .6); x.fillRect(-pw / 2 + 12 + k * (pw - 24) / 6, ph / 2 - 12 - bh, (pw - 24) / 6 - 4, bh); } }
            else { x.fillStyle = 'rgba(30,30,40,.6)'; for (let k = 0; k < 9; k++) x.fillRect(-pw / 2 + 10, -ph / 2 + 14 + k * 12, pw - 20 - r() * 40, 3); }
            x.fillStyle = '#c0392b'; x.beginPath(); x.arc(0, -ph / 2 + 6, 5, 0, 7); x.fill(); x.restore();
          }
          for (let i = 0; i < 18; i++) { x.save(); x.translate(r() * W, r() * H); x.rotate((r() - .5) * .3); x.fillStyle = ['#f7e26b', '#f7c66b', '#f4f08a'][i % 3]; x.fillRect(-28, -28, 56, 56); x.fillStyle = 'rgba(40,40,40,.6)'; for (let k = 0; k < 4; k++) x.fillRect(-22, -18 + k * 10, 30 + r() * 12, 2); x.restore(); }
        }, { r: .9 });
        bx(g, w + .1, h + .1, .04, m('#4a3020', { tex: 'madeira_velha' }), 0, y - .05, 0); pl(g, w, h, mt, 0, y + h / 2, .025);
        return g;
      },
      prancheta(o) { const g = G(); const b = bx(g, .26, .01, .36, m('#6a4a2a', { tex: 'madeira_velha' })); const f = canvasMat(256, 340, (x, W, H) => { x.fillStyle = '#ece6d4'; x.fillRect(0, 0, W, H); x.fillStyle = '#1a1a1a'; x.font = 'bold 18px Arial'; x.textAlign = 'center'; x.fillText(o.txt || 'TESTE DE PERSONALIDADE', W / 2, 30); x.strokeStyle = '#555'; for (let i = 0; i < 12; i++) { x.strokeRect(14, 50 + i * 22, W - 28, 22); x.beginPath(); x.moveTo(W * .55, 50 + i * 22); x.lineTo(W * .55, 72 + i * 22); x.stroke(); } x.fillStyle = 'rgba(200,200,40,.35)'; x.fillRect(14, 116, W - 28, 22); }); const p = pl(g, .23, .31, f, 0, .012, .01); p.rotation.x = -Math.PI / 2; bx(g, .1, .025, .04, metal('#bbb'), 0, .01, -.16); const lp = cy(g, .006, .006, .16, m('#d8b420'), .05, .02, 0, 5); lp.rotation.x = Math.PI / 2; lp.rotation.z = .4; return g; },
      monitor_grafico(o) {
        const g = G(), mt = m('#d8d4c8', { r: .5 }); bx(g, .1, .2, .1, mt, 0, 0, -.05); bx(g, .45, .36, .32, mt, 0, .18, -.08);
        const tl = canvasMat(256, 192, (x, W, H) => { x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, W, H); for (let k = 0; k < 9; k++) { x.fillStyle = ['#c0392b', '#2980b9', '#27ae60', '#f39c12'][k % 4]; const bh = 20 + Math.random() * 120; x.fillRect(20 + k * 24, H - 20 - bh, 16, bh); } x.strokeStyle = '#333'; x.beginPath(); x.moveTo(14, 10); x.lineTo(14, H - 18); x.lineTo(W - 8, H - 18); x.stroke(); }, { brilho: .8 });
        pl(g, .36, .27, tl, 0, .36, .085); return g;
      },
      poligrafo(o) {
        const g = G(), mt = sujo('#6a6458'); bx(g, .7, .2, .45, mt); const tampa = bx(g, .66, .02, .38, m('#2a2a2a'), 0, .2, 0);
        const [c, x] = tela(256, 96), t = texCanvas(c), pm = m('#ffffff', { unico: true, mapa: t, r: .9 }); const pp = pl(g, .5, .2, pm, 0, .225, 0); pp.rotation.x = -Math.PI / 2;
        for (let i = 0; i < 3; i++) { const ag = bx(g, .005, .02, .12, metal('#222'), -.05 + i * .05, .22, -.08); }
        let off = 0; anim.push((dt, tt) => { off += dt * 30; x.fillStyle = '#f2ece0'; x.fillRect(0, 0, 256, 96); x.strokeStyle = 'rgba(200,120,120,.4)'; for (let i = 0; i < 256; i += 12) { x.beginPath(); x.moveTo((i - off % 12 + 256) % 256, 0); x.lineTo((i - off % 12 + 256) % 256, 96); x.stroke(); } ['#1a3a9a', '#9a1a1a', '#1a1a1a'].forEach((cc, k) => { x.strokeStyle = cc; x.lineWidth = 2; x.beginPath(); for (let i = 0; i < 256; i += 4) x.lineTo(i, 16 + k * 30 + Math.sin((i + off) * (.08 + k * .03)) * (6 + (k === 1 && Math.sin(tt) > .7 ? 10 : 0)) + Math.sin((i + off) * .5) * 2); x.stroke(); }); t.needsUpdate = true; });
        return g;
      },

      /* ---------- CN 21 · isolamento vermelho ---------- */
      tubo_neon(o) {
        const g = G(), w = o.w || 1.2, y = o.y ?? 2.5, cor = o.c || '#ff2010';
        bx(g, w + .1, .06, .06, m('#1a1a1a', { me: .5 }), 0, y - .03, 0);
        const tb = cy(g, .022, .022, w, emis(cor, 2.6), 0, y, .05, 10); tb.rotation.z = Math.PI / 2; tb.position.set(0, y, .05);
        const L = luz(g, cor, 1.4, 6, 0, y - .2, .4);
        const f = rng(o.sem || 3)() * 9; anim.push((dt, t) => { const k = Math.sin(t * 23 + f) > .97 ? .15 : 1; tb.material.emissiveIntensity = 2.6 * k; L.intensity = 1.4 * k; });
        return g;
      },
      maca_sangue(o) {
        const g = G(), cromo = metal('#6a5a50'), r = rng(o.sem || 133);
        bx(g, .75, .06, 1.95, cromo, 0, .72, 0); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { cy(g, .02, .02, .7, cromo, a * .33, .05, b * .88, 6); sf(g, .05, m('#111'), a * .33, .05, b * .88, 8); }); bx(g, .7, .03, 1.9, cromo, 0, .3, 0);
        const colchao = m('#ffffff', { unico: true, r: .35, mapa: (() => { const [c, x] = tela(128, 256); x.fillStyle = '#8a3a30'; x.fillRect(0, 0, 128, 256); manchas(x, 256, r, 20, '#3a0204', .8, 50); manchas(x, 256, r, 8, '#c02010', .5, 30); return texCanvas(c); })() });
        bx(g, .7, .14, 1.9, colchao, 0, .78, 0);
        [-1, 1].forEach(s => { const c = bx(g, .08, .02, .4, m('#2a1a10'), s * .3, .93, -.1 + s * .3); });
        for (let i = 0; i < 6; i++) cy(g, .006, .003, .25 + r() * .4, m('#3a0202', { r: .2 }), (r() - .5) * .75, .3 + r() * .2, (r() - .5) * 1.8, 4);
        const poca = P.sangue({ chao: 1, estilo: 'poca', w: 1.6, sem: 21 }); g.add(poca);
        return g;
      },
      // CN 06 · poltrona de transfusão
      poltrona_transfusao(o) {
        const g = G(), estofo = m('#4a5a58', { tex: 'metal_sujo', r: .5 }), cromo = metal('#a0a6ac');
        bx(g, .7, .45, .7, estofo, 0, 0, 0); const enc = bx(g, .7, .85, .18, estofo, 0, .4, -.3); enc.rotation.x = -.25; enc.position.set(0, .45, -.36);
        [-1, 1].forEach(s => { bx(g, .14, .1, .7, estofo, s * .42, .6, 0); bx(g, .04, .03, .5, m('#2a1a10'), s * .42, .7, .05); cy(g, .02, .02, .6, cromo, s * .42, 0, .1, 6); });
        const sp = P.suporte_bolsas({ n: 2, sem: o.sem }); sp.position.set(.65, 0, -.2); g.add(sp);
        return g;
      },

      /* ---------- estação de leitura: Terminal O.R.F.E.U. e Arquivo (documentos e cifras) ---------- */
      terminal_orfeu(o) {
        const g = G(), mt = sujo('#3a3e42', 'metal_sujo'), r = rng(o.sem || 141);
        bx(g, 1.3, .05, .75, mt, 0, .74, 0); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cy(g, .025, .025, .74, metal('#2a2a2a'), a * .6, 0, b * .32, 6)); bx(g, .45, .6, .7, mt, .4, .12, 0);
        const crt = G(); crt.position.set(-.12, .79, -.08); g.add(crt);
        bx(crt, .62, .5, .5, m('#c8c2ae', { r: .55 }), 0, 0, -.05); bx(crt, .54, .44, .02, m('#1a1a18'), 0, .03, .2);
        const [c, x] = tela(256, 192), t = texCanvas(c), tm = m('#ffffff', { unico: true, mapa: t, e: '#ffffff', ei: 1.4 }); tm.emissiveMap = t;
        const sc = pl(crt, .48, .36, tm, 0, .25, .215);
        const linhas = ['O.R.F.E.U. TERMINAL v3.1', 'ACERVO INTERNO', '', '> ls', 'docs/  cifras/  visoes/', '> acesso ********', 'ACESSO PARCIAL', '> _'];
        let ult = 0; anim.push((dt, tt) => { if (tt - ult < .25) return; ult = tt; x.fillStyle = '#020a04'; x.fillRect(0, 0, 256, 192); x.font = 'bold 15px monospace'; x.fillStyle = '#5aff8a'; x.shadowColor = '#5aff8a'; x.shadowBlur = 6; const n = Math.min(linhas.length, 1 + Math.floor(tt * 1.5) % (linhas.length + 4)); for (let i = 0; i < n; i++) { let l = linhas[i]; if (i === n - 1 && l.endsWith('_')) l = Math.floor(tt * 2) % 2 ? l : l.slice(0, -1); x.fillText(l, 10, 22 + i * 21); } x.shadowBlur = 0; x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 192; i += 3) x.fillRect(0, i, 256, 1); t.needsUpdate = true; });
        const tec = bx(g, .46, .03, .16, m('#bdb7a2', { r: .6 }), -.12, .79, .2); tec.rotation.x = -.08;
        for (let j = 0; j < 4; j++) for (let i = 0; i < 12; i++) bx(g, .028, .012, .028, m('#e8e2cc'), -.3 + i * .033, .815, .14 + j * .033);
        luz(g, '#5aff8a', .7, 3, -.12, 1.1, .5, true);
        P.cadeira && (() => { const ca = P.cadeira({}); ca.position.set(-.1, 0, .75); ca.rotation.y = Math.PI; g.add(ca); })();
        const pp = P.pilhas_papel({ n: 3, w: .4, d: .3, soltos: 2, sem: o.sem }); pp.position.set(.42, .79, .05); g.add(pp);
        return g;
      },
      arquivo_orfeu(o) {
        const g = G(), w = o.w || .95, mt = sujo('#5a5e58', 'metal_sujo');
        bx(g, w, 1.5, .55, mt);
        for (let i = 0; i < 4; i++) { bx(g, w - .08, .32, .02, sujo('#6a6e66'), 0, .08 + i * .35, .28); bx(g, .16, .03, .03, metal('#bbb'), 0, .3 + i * .35, .3); const et = pl(g, .2, .07, m('#ece4cc'), 0, .2 + i * .35, .3); }
        const pb = canvasMat(256, 256, (x, W, H) => { TX.cortica(x, W, rng(5)); x.fillStyle = '#efe6cf'; x.fillRect(20, 30, 140, 100); x.fillStyle = '#221d14'; x.font = 'bold 18px serif'; x.fillText('◈ CIFRA 07', 30, 54); x.font = '26px serif'; x.fillText('ʘ ǂ ǁ ɮ ʭ ɸ', 28, 100); x.fillStyle = '#e8dcc0'; x.fillRect(110, 140, 120, 90); x.fillStyle = '#3a2a1a'; for (let k = 0; k < 6; k++) x.fillRect(120, 156 + k * 12, 90 - k * 6, 3); x.fillStyle = '#b81a1a'; [[30, 36], [120, 146]].forEach(([a, b]) => { x.beginPath(); x.arc(a + 60, b - 10, 5, 0, 7); x.fill(); }); }, { r: .9 });
        bx(g, w + .3, .9, .04, m('#4a3020', { tex: 'madeira_velha' }), 0, 1.62, -.25); pl(g, w + .2, .8, pb, 0, 2.07, -.225);
        const pt = canvasMat(512, 96, (x, W, H) => { x.fillStyle = '#c8bea4'; x.fillRect(0, 0, W, H); x.strokeStyle = '#221d14'; x.lineWidth = 6; x.strokeRect(4, 4, W - 8, H - 8); x.fillStyle = '#221d14'; x.font = 'bold 40px Arial'; x.textAlign = 'center'; x.fillText('ARQUIVO · CIFRAS', W / 2, 62); });
        pl(g, w, .16, pt, 0, 1.4, .285);
        luz(g, '#ffe0a0', .45, 2.5, 0, 2.6, .3);
        return g;
      },
    });
  });
})();
