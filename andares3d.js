/* andares3d.js · objetos 3D dos andares 2 a 5 (extensão de objetos3d.js e detalhes3d.js)
   Máquinas, relíquias, crescimentos e móveis próprios dos andares de baixo, desenhados por código
   (sem imagens). O que cada sala tem continua vindo do arquivo de cenas (fora do GitHub); aqui só
   ficam as peças. O sala3d.js baixa este arquivo na primeira vez que alguém abre o 3D. */

/* ===================== 2º andar ===================== */
/* props_a2.js · objetos detalhados para salas de alojamento (Three.js)
   Extensão de objetos3d.js / detalhes3d.js: doca de carga, refeitório, lavanderia, cozinha industrial,
   banheiro coletivo, dormitório, fichário, estufa, ginásio, cinema, corredor acústico, enfermaria,
   casa de caldeiras, sala de jogos, capela, arquivo, câmara fria, ateliê de costura, sala de medição,
   central de rádio, sala de música, sala circular e poço de elevador.
   Tudo é genérico: textos, cores e códigos vêm do arquivo de cenas. Geometria leve (malhas juntadas). */
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  NS.extensoes = NS.extensoes || [];
  NS.extensoes.push(F => {
    const { P, m, bx, cy, sf, pl, luz, G, metal, tela, texCanvas, T, rng, anim, guardar, ALT } = F;
    const PI = Math.PI;

    /* ---------------- utilidades ---------------- */
    const sujo = (c, tex = 'metal_sujo', o = {}) => m(c, { tex, r: o.r ?? .75, me: o.me ?? .25, rep: o.rep });
    const emis = (c, ei = 1.2, o = {}) => m('#ffffff', { unico: true, e: c, ei, r: .4, ...o });
    const cmat = (w, h, desenha, o = {}) => {
      const [c, x] = tela(w, h); desenha(x, w, h);
      const t = texCanvas(c, o.rep);
      const mt = m(o.cor || '#ffffff', { unico: true, mapa: t, r: o.r ?? .8, me: o.me ?? 0 });
      if (o.brilho) { mt.emissive = new T.Color('#ffffff'); mt.emissiveMap = t; mt.emissiveIntensity = o.brilho; }
      if (o.transp) { mt.transparent = true; mt.depthWrite = false; }
      if (o.alfa) mt.alphaTest = o.alfa;
      if (o.lado) mt.side = T.DoubleSide;
      if (o.decal) { mt.polygonOffset = true; mt.polygonOffsetFactor = -2; }
      return mt;
    };
    const rotG = (g, rx = 0, ry = 0, rz = 0) => { if (rx || ry || rz) g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(rx, ry, rz))); return g; };
    // caixa / cilindro com a BASE em y (como bx/cy), já posicionados, para juntar numa malha só
    const ret = (w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => rotG(new T.BoxGeometry(w, h, d), rx, ry, rz).translate(x, y + h / 2, z);
    const cil = (r1, r2, h, x = 0, y = 0, z = 0, seg = 10, rx = 0, ry = 0, rz = 0) => rotG(new T.CylinderGeometry(r1, r2, h, seg), rx, ry, rz).translate(x, y + h / 2, z);
    // cilindro deitado (eixo x ou z) com o CENTRO em (x, y, z)
    const tuboEixo = (r1, r2, len, x, y, z, eixo = 'x', seg = 10) => { const g = new T.CylinderGeometry(r1, r2, len, seg); if (eixo === 'x') g.rotateZ(-PI / 2); else if (eixo === 'z') g.rotateX(PI / 2); return g.translate(x, y, z); };
    const esf = (r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 10) => { const g = new T.SphereGeometry(r, seg, Math.max(6, Math.round(seg * .7))); g.scale(sx, sy, sz); return g.translate(x, y, z); };
    const anel = (R, r, x, y, z, arc = PI * 2, rx = 0, ry = 0, rz = 0, s1 = 6, s2 = 24) => rotG(new T.TorusGeometry(R, r, s1, s2, arc), rx, ry, rz).translate(x, y, z);
    const curva = (pts, r, seg = 16, rs = 5) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), seg, r, rs);
    const plano = (w, h, x, y, z, rx = 0, ry = 0, rz = 0) => rotG(new T.PlaneGeometry(w, h), rx, ry, rz).translate(x, y, z);
    const malha = (geo, mat) => new T.Mesh(guardar(geo), mat);
    function juntar(geos, mat) {
      let nv = 0; const gs = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); nv += n.attributes.position.count; return n; });
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2); let o = 0;
      gs.forEach(g => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); });
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
      return new T.Mesh(guardar(geo), mat);
    }
    // desenhos de textura
    const zebra = (x, W, H, passo = 40) => { x.fillStyle = '#d8a818'; x.fillRect(0, 0, W, H); x.fillStyle = '#16130f'; for (let i = -H; i < W + H; i += passo) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + passo / 2, 0); x.lineTo(i + passo / 2 - H, H); x.lineTo(i - H, H); x.closePath(); x.fill(); } };
    const gasto = (x, W, H, r, n = 300, a = .35) => { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${r() < .6 ? '30,24,16' : '210,200,180'},${a * r()})`; x.fillRect(r() * W, r() * H, 1 + r() * 7, 1 + r() * 4); } };
    const escrever = (x, s, cx, cy0, tam, cor = '#111', larg = 0, peso = 'bold', fonte = 'Arial, Helvetica, sans-serif') => {
      let t = tam; x.font = `${peso} ${t}px ${fonte}`;
      if (larg) while (x.measureText(s).width > larg && t > 8) { t -= 1; x.font = `${peso} ${t}px ${fonte}`; }
      x.fillStyle = cor; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, cx, cy0);
    };
    // macacão pendurado (silhueta recortada, com etiqueta de código)
    function macacao(x, W, H, cor, cod, r) {
      x.fillStyle = cor; x.beginPath();
      x.moveTo(W * .3, 0); x.lineTo(W * .7, 0); x.lineTo(W * .98, H * .1); x.lineTo(W * .92, H * .38); x.lineTo(W * .76, H * .32); x.lineTo(W * .75, H * .52);
      x.lineTo(W * .72, H); x.lineTo(W * .53, H); x.lineTo(W * .5, H * .58); x.lineTo(W * .47, H); x.lineTo(W * .28, H); x.lineTo(W * .25, H * .52); x.lineTo(W * .24, H * .32); x.lineTo(W * .08, H * .38); x.lineTo(W * .02, H * .1); x.closePath(); x.fill();
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(W * .495, H * .02, 2, H * .5); x.fillRect(W * .25, H * .5, W * .5, 3);
      x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(W * .2, 0, W * .06, H * .4); x.fillRect(W * .74, 0, W * .06, H * .4);
      gasto(x, W, H, r, 160, .25);
      for (let i = 0; i < 3; i++) { x.fillStyle = `rgba(60,30,10,${.1 + r() * .2})`; x.beginPath(); x.ellipse(W * (.3 + r() * .4), H * (.3 + r() * .6), 4 + r() * 10, 6 + r() * 14, 0, 0, 7); x.fill(); }
      x.globalCompositeOperation = 'source-over';
      if (cod) { x.fillStyle = '#ece6d6'; x.fillRect(W * .27, H * .13, W * .46, H * .085); x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 1; x.strokeRect(W * .27, H * .13, W * .46, H * .085); escrever(x, cod, W * .5, H * .174, Math.round(H * .062), '#151515', W * .43, 'bold', '"Courier New", monospace'); }
    }

    Object.assign(P, {
      /* ================= doca / carga ================= */
      a2_faixa_zebrada(o) {
        const g = G(), w = o.w || 3, d = o.d || .3, r = rng(o.sem || 3);
        const mt = cmat(256, 64, (x, W, H) => { zebra(x, W, H, 64); gasto(x, W, H, r, 260, .5); }, { rep: [Math.max(1, Math.round(w / (d * 4))), 1], r: .7, decal: 1 });
        g.add(malha(plano(w, d, 0, .007, 0, -PI / 2), mt)); return g;
      },
      // plataforma de elevador de carga rente ao chão, com guias até o teto, cabeçote e cabos
      a2_plataforma(o) {
        const g = G(), w = o.w || 3.4, d = o.d || 2.6, r = rng(o.sem || 5);
        const aco = sujo('#4a4c50', 'metal_sujo', { rep: [1, 3], me: .5 }), amarelo = m('#c8a428', { me: .4, r: .5 });
        bx(g, w, .05, d, m('#55585c', { tex: 'grade_chao', rep: [Math.round(w / 1.2), Math.round(d / 1.2)], me: .55, r: .5 }), 0, 0, 0);
        const zb = cmat(256, 32, (x, W, H) => { zebra(x, W, H, 32); gasto(x, W, H, r, 200, .5); }, { rep: [Math.max(1, Math.round(w / 1.6)), 1], r: .7 });
        [d / 2 - .08, -d / 2 + .08].forEach(zz => g.add(malha(plano(w, .16, 0, .053, zz, -PI / 2), zb)));
        const geos = [];
        [-1, 1].forEach(s => geos.push(ret(.18, ALT, .08, s * (w / 2 + .12), 0, -d / 2 + .12), ret(.06, ALT, .22, s * (w / 2 + .12), 0, -d / 2 + .12)));
        geos.push(ret(w + .5, .22, .22, 0, ALT - .26, -d / 2 + .12), ret(w - .2, .16, .16, 0, 2.35, 0));
        g.add(juntar(geos, aco));
        const cabos = [];
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cabos.push(curva([[a * (w / 2 - .15), .06, b * (d / 2 - .15)], [a * (w / 2 - .4), 1.3, b * d / 4], [a * (w / 2 - .5), 2.38, 0]], .012, 8, 4)));
        [-.3, .3].forEach(xx => cabos.push(cil(.02, .02, ALT - 2.5, xx, 2.5, 0, 6)));
        g.add(juntar(cabos, metal('#2a2a2a')));
        const gc = [];
        [-1, 1].forEach(s => { [.5, .98].forEach(yy => gc.push(tuboEixo(.022, .022, d - .1, s * (w / 2 - .05), yy, 0, 'z', 8))); [-1, 0, 1].forEach(k => gc.push(cil(.022, .022, 1.0, s * (w / 2 - .05), .05, k * (d / 2 - .1), 8))); });
        g.add(juntar(gc, amarelo));
        const lp = sf(g, .07, emis('#ffae20', 2), w / 2 + .12, 2.2, -d / 2 + .3, 10); lp.scale.y = 1.3;
        const f = r() * 6; anim.push((dt, t) => { lp.material.emissiveIntensity = Math.sin(t * 6 + f) > .3 ? 2.4 : .3; });
        return g;
      },
      // portão de grade de correr (duas folhas; "aberto" de 0 a 1)
      a2_portao_grade(o) {
        const g = G(), w = o.w || 4, h = o.h || 2.5, ab = o.aberto ?? .4, lw = w / 2 + .06;
        const [c, x] = tela(128, 128); x.clearRect(0, 0, 128, 128); x.strokeStyle = '#d0d0d0'; x.lineWidth = 6;
        [16, 48, 80, 112].forEach(i => { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); }); x.lineWidth = 8; x.beginPath(); x.moveTo(0, 64); x.lineTo(128, 64); x.stroke();
        const t = texCanvas(c, [Math.max(1, Math.round(lw / .5)), Math.max(1, Math.round(h / .5))]);
        const mt = m(o.c || '#7a8086', { unico: true, mapa: t, me: .6, r: .45, lado: 2 }); mt.alphaTest = .5; mt.alphaMap = t;
        const quadro = sujo('#3a3c3e', 'metal_sujo', { me: .5 });
        bx(g, .14, h + .2, .14, quadro, -w / 2 - .07, 0, 0); bx(g, .14, h + .2, .14, quadro, w / 2 + .07, 0, 0);
        bx(g, w + .4, .16, .2, quadro, 0, h + .2, .04); bx(g, w, .04, .1, quadro, 0, 0, .04);
        const fq = sujo('#5a5e62', 'metal_sujo', { me: .5 });
        const folha = (x0, z0) => { const f = G(); f.position.set(x0, 0, z0); g.add(f); pl(f, lw, h - .1, mt, 0, h / 2 + .02, 0); f.add(juntar([ret(lw, .06, .05, 0, h - .06, 0), ret(lw, .06, .05, 0, .02, 0), ret(.06, h, .05, -lw / 2, 0, 0), ret(.06, h, .05, lw / 2, 0, 0)], fq)); return f; };
        folha(-w / 4, 0); const mov = folha(w / 4 - ab * (w / 2 - .1), .09);
        if (o.txt) { const pm = cmat(256, 96, (xx, W, H) => { xx.fillStyle = '#e8e2d0'; xx.fillRect(0, 0, W, H); xx.strokeStyle = '#1a1a1a'; xx.lineWidth = 6; xx.strokeRect(3, 3, W - 6, H - 6); escrever(xx, o.txt, W / 2, H / 2, 34, '#1a1a1a', W - 20); }); pl(mov, .7, .26, pm, 0, 1.35, .04); }
        return g;
      },
      // cabine de controle com vidro trincado, console e cadeira (a porta fica no lado +x)
      a2_cabine_controle(o) {
        const g = G(), w = o.w || 2.2, d = o.d || 1.7, h = o.h || 2.5, r = rng(o.sem || 7);
        const par = sujo(o.c || '#6a6a5e', 'metal_sujo', { rep: [2, 2], me: .3 }), escuro = sujo('#2a2c2e');
        bx(g, w, .06, d, escuro, 0, 0, 0);
        bx(g, w, h, .08, par, 0, 0, -d / 2 + .04);
        bx(g, .08, h, d, par, -w / 2 + .04, 0, 0);
        bx(g, .08, h, .55, par, w / 2 - .04, 0, -d / 2 + .275);
        bx(g, .08, h - 2.1, d - .55, par, w / 2 - .04, 2.1, .275);
        bx(g, w, 1.0, .08, par, 0, 0, d / 2 - .04);
        bx(g, w, h - 2.2, .08, par, 0, 2.2, d / 2 - .04);
        bx(g, w + .1, .08, d + .1, escuro, 0, h, 0);
        [-w / 2 + .06, 0, w / 2 - .06].forEach(xx => bx(g, .06, 1.2, .06, escuro, xx, 1.0, d / 2 - .04));
        const vid = cmat(256, 160, (x, W, H) => {
          x.clearRect(0, 0, W, H); x.fillStyle = 'rgba(160,190,200,.16)'; x.fillRect(0, 0, W, H);
          const cx = W * (.55 + r() * .2), cyy = H * (.35 + r() * .3); x.strokeStyle = 'rgba(235,245,250,.85)'; x.lineWidth = 1.4;
          for (let k = 0; k < 14; k++) { const a = k / 14 * PI * 2 + r() * .3; let px = cx, py = cyy; x.beginPath(); x.moveTo(px, py); for (let s = 0; s < 6; s++) { px += Math.cos(a + (r() - .5) * .5) * (14 + r() * 26); py += Math.sin(a + (r() - .5) * .5) * (10 + r() * 18); x.lineTo(px, py); } x.stroke(); }
          for (let k = 1; k < 4; k++) { x.beginPath(); x.ellipse(cx, cyy, k * 12, k * 9, 0, 0, 7); x.stroke(); }
          x.fillStyle = 'rgba(240,250,255,.5)'; x.beginPath(); x.arc(cx, cyy, 5, 0, 7); x.fill();
        }, { transp: 1, lado: 1, r: .1, me: .2 });
        pl(g, w - .1, 1.2, vid, 0, 1.6, d / 2 - .02);
        bx(g, w - .3, .85, .55, sujo('#3a3c3a'), 0, 0, d / 2 - .4);
        const tl = cmat(256, 128, (x, W, H) => { x.fillStyle = '#100a02'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffb040'; x.font = 'bold 18px monospace'; (o.telas || ['PLATAFORMA', 'NIVEL --', 'TRAVA: OK', '▮▮▮▯▯']).forEach((l, i) => x.fillText(l, 10, 26 + i * 26)); x.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 0; i < H; i += 3) x.fillRect(0, i, W, 1); }, { brilho: 1.1 });
        const zc = d / 2 - .45;
        [-.45, .45].forEach(xx => { bx(g, .5, .38, .4, m('#c8c2ae', { r: .6 }), xx, .85, zc); const p = pl(g, .4, .28, tl, xx, 1.04, zc - .205); p.rotation.y = PI; });
        const cores = ['#ff3020', '#30ff60', '#ffd020'];
        for (let i = 0; i < 12; i++) cy(g, .015, .015, .02, m(cores[i % 3], { e: cores[i % 3], ei: .8 }), -w / 2 + .35 + i * (w - .7) / 11, .85, d / 2 - .22, 8);
        const ca = P.cadeira({ c: '#3a3028' }); ca.position.set(.2, 0, -.15); ca.rotation.y = .3; g.add(ca);
        if (o.luz) luz(g, '#ffd8a0', o.luz, 3.5, 0, h - .3, 0, true);
        return g;
      },
      // palete com caixas de papelão e filme plástico
      a2_palete(o) {
        const g = G(), r = rng(o.sem || 9), geos = [];
        [-.5, 0, .5].forEach(z => geos.push(ret(1.2, .09, .1, 0, 0, z)));
        for (let i = 0; i < 7; i++) geos.push(ret(.13, .025, 1.1, -.54 + i * .18, .09, 0));
        g.add(juntar(geos, m('#7a5a3a', { tex: 'madeira_velha', r: .9 })));
        const cx = cmat(256, 256, (x, W, H) => { x.fillStyle = '#a07a4a'; x.fillRect(0, 0, W, H); gasto(x, W, H, r, 400, .25); x.fillStyle = 'rgba(200,180,140,.7)'; x.fillRect(0, H * .45, W, H * .1); x.strokeStyle = '#2a1a0a'; x.lineWidth = 4; x.strokeRect(20, 20, 70, 50); x.fillStyle = '#2a1a0a'; x.font = 'bold 26px Arial'; x.fillText('↑↑', 30, 56); x.font = 'bold 20px Arial'; x.fillText(o.txt || ('LOTE ' + (10 + Math.floor(r() * 89))), W * .45, H * .3); }, { r: .9 });
        const n = o.n ?? 5, bxs = [];
        for (let i = 0; i < n; i++) { const cam = Math.floor(i / 4), k = i % 4, s = .42 + r() * .1; bxs.push(ret(s, s * .8, s, (k % 2 - .5) * .55, .115 + cam * .42, (Math.floor(k / 2) - .5) * .5, 0, (r() - .5) * .2)); }
        if (n) { g.add(juntar(bxs, cx)); if (o.filme !== false) bx(g, 1.16, .12 + Math.ceil(n / 4) * .42, 1.06, m('#e8f0f4', { op: .16, r: .1 }), 0, .1, 0); }
        return g;
      },

      /* ================= refeitório ================= */
      // mesa comprida de metal com os dois bancos presos
      a2_mesa_refeitorio(o) {
        const g = G(), w = o.w || 3.0, inox = sujo('#9aa0a4', 'metal_sujo', { rep: [3, 1], me: .55, r: .45 }), banco = m(o.c || '#3e5a64', { tex: 'metal_sujo', r: .6, me: .3, rep: [3, 1] });
        bx(g, w, .04, .8, inox, 0, .74, 0);
        bx(g, w, .05, .32, banco, 0, .43, .62); bx(g, w, .05, .32, banco, 0, .43, -.62);
        const geos = [], ns = Math.max(2, Math.round(w / 1.4));
        for (let i = 0; i < ns; i++) { const x0 = -w / 2 + .3 + i * (w - .6) / (ns - 1); geos.push(ret(.06, .03, 1.5, x0, .02, 0), ret(.06, .72, .06, x0, .02, 0), ret(.06, .05, 1.3, x0, .38, 0), ret(.05, .38, .05, x0, .02, .62), ret(.05, .38, .05, x0, .02, -.62)); }
        geos.push(ret(w - .5, .04, .04, 0, .3, 0));
        g.add(juntar(geos, metal('#2a2c2e')));
        return g;
      },
      // balcão de servir (cubas vazias, protetor de vidro e trilho de bandejas)
      a2_balcao_servico(o) {
        const g = G(), w = o.w || 3.6, d = .72, r = rng(o.sem || 11), inox = sujo('#8e9498', 'metal_sujo', { rep: [3, 1], me: .55, r: .45 }), escuro = m('#141618', { r: .6 });
        bx(g, w, .86, d, inox, 0, 0, -.1); bx(g, w + .04, .04, d + .04, sujo('#b0b6ba', 'metal_sujo', { me: .6, r: .35 }), 0, .86, -.1); bx(g, w - .02, .1, .02, escuro, 0, 0, d / 2 - .09);
        const nc = Math.max(3, Math.floor(w / .62)), tampas = [], aros = [];
        for (let i = 0; i < nc; i++) { const x0 = -w / 2 + w / nc * (i + .5), cw = w / nc - .12; g.add(malha(plano(cw, .4, x0, .905, -.14, -PI / 2), escuro)); aros.push(ret(cw + .04, .02, .03, x0, .9, -.35), ret(cw + .04, .02, .03, x0, .9, .07)); if (r() < .4) tampas.push(ret(cw, .015, .42, x0, .92, -.14, 0, (r() - .5) * .3)); }
        g.add(juntar(aros, metal('#b8bec4'))); if (tampas.length) g.add(juntar(tampas, metal('#c8ccd0')));
        const postes = [];
        [-w / 2 + .05, 0, w / 2 - .05].forEach(xx => postes.push(cil(.015, .015, .55, xx, .9, -.38, 6), ret(.03, .03, .34, xx, 1.43, -.24)));
        g.add(juntar(postes, metal('#b8bec4')));
        const vg = bx(g, w - .1, .02, .36, m('#cfe4ee', { op: .18, r: .05, me: .3 }), 0, 1.44, -.2); vg.rotation.x = .18;
        bx(g, w - .2, .025, .05, emis('#ffe8c0', .3), 0, 1.415, -.33);
        const tr = []; [0, .1, .2].forEach(dz => tr.push(tuboEixo(.014, .014, w, 0, .84, d / 2 - .02 + dz, 'x', 6)));
        const nb = Math.max(2, Math.round(w)); for (let i = 0; i <= nb; i++) tr.push(ret(.03, .03, .32, -w / 2 + .05 + i * (w - .1) / nb, .8, d / 2 + .02));
        g.add(juntar(tr, metal('#9aa0a6')));
        const bd = []; for (let i = 0; i < 8; i++) bd.push(ret(.36, .018, .27, w / 2 - .32 + (r() - .5) * .02, .92 + i * .02, -.14 + (r() - .5) * .02));
        g.add(juntar(bd, m('#8a6e4a', { r: .5 })));
        return g;
      },
      // carrinho alto de bandejas
      a2_carrinho_bandejas(o) {
        const g = G(), r = rng(o.sem || 13), geos = [], bd = [];
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => geos.push(cil(.014, .014, 1.55, a * .27, .08, b * .2, 6)));
        [.08, 1.62].forEach(yy => geos.push(ret(.58, .03, .44, 0, yy, 0)));
        for (let i = 0; i < 11; i++) [-1, 1].forEach(s => geos.push(ret(.02, .015, .42, s * .27, .25 + i * .125, 0)));
        g.add(juntar(geos, metal('#9aa0a6')));
        for (let i = 0; i < 11; i++) if (r() < .75) bd.push(ret(.5, .02, .38, 0, .265 + i * .125, (r() - .3) * .12));
        if (bd.length) g.add(juntar(bd, m(o.c || '#9a8466', { r: .55 })));
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => sf(g, .04, m('#111'), a * .27, .04, b * .2, 8));
        return g;
      },

      /* ================= lavanderia ================= */
      a2_lavadora_industrial(o) {
        const g = G(), c = G(); g.add(c); const r = rng(o.sem || 15), w = 1.1, h = 1.75, d = .95;
        const corpo = sujo(o.c || '#c4c8c4', 'metal_sujo', { me: .35, r: .5 }), escuro = m('#1a1c1e', { r: .5 });
        bx(c, w, .12, d, escuro, 0, 0, 0); bx(c, w, h - .12, d, corpo, 0, .12, 0);
        bx(c, w - .1, .26, .04, escuro, 0, h - .32, d / 2);
        const disp = cmat(128, 48, (x, W, H) => { x.fillStyle = '#031006'; x.fillRect(0, 0, W, H); x.fillStyle = '#5aff8a'; x.font = 'bold 26px monospace'; x.fillText(o.visor || ('00:' + String(10 + Math.floor(r() * 49))), 10, 34); }, { brilho: 1.3 });
        pl(c, .26, .1, disp, -.28, h - .19, d / 2 + .025);
        const bt = []; for (let i = 0; i < 5; i++) bt.push(tuboEixo(.025, .025, .02, .05 + i * .08, h - .19, d / 2 + .03, 'z', 8));
        c.add(juntar(bt, m('#c8c0a8', { r: .4 })));
        const yP = .8, Rp = .33;
        const aro = malha(new T.TorusGeometry(Rp, .065, 10, 28), metal('#a8aeb4')); aro.position.set(0, yP, d / 2 + .04); c.add(aro);
        const fundo = malha(new T.CircleGeometry(Rp, 24), m('#0c0c0c')); fundo.position.set(0, yP, d / 2 - .02); c.add(fundo);
        const tambor = G(); tambor.position.set(0, yP, d / 2 - .01); c.add(tambor);
        const pecas = []; for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2 + r(); pecas.push(esf(.1 + r() * .06, Math.cos(a) * .17, Math.sin(a) * .17, 0, 1.3, 1, .45, 8)); }
        tambor.add(juntar(pecas, m(o.roupa || '#d9661f', { r: .9 })));
        if (o.txt) { const et = cmat(128, 48, (x, W, H) => { x.fillStyle = '#ece6d6'; x.fillRect(0, 0, W, H); escrever(x, o.txt, W / 2, H / 2 + 1, 24, '#1a1a1a', W - 8, 'bold', '"Courier New", monospace'); }); const e = pl(tambor, .16, .06, et, .05, -.12, .05); e.rotation.z = .4; }
        const vid = malha(new T.CircleGeometry(Rp - .01, 24), m('#bcd8e8', { op: .22, r: .05, me: .3 })); vid.position.set(0, yP, d / 2 + .055); c.add(vid);
        bx(c, .07, .2, .06, metal('#888'), Rp + .1, yP - .1, d / 2 + .03);
        const v = o.v ?? 4, f = r() * 6;
        if (o.gira !== false) anim.push((dt, t) => { tambor.rotation.z -= dt * v * (1 + .4 * Math.sin(t * .4 + f)); c.position.x = Math.sin(t * 47 + f) * .003; });
        return g;
      },
      // varal de pé (dois suportes) com macacões e panos pendurados
      a2_varal(o) {
        const g = G(), w = o.w || 4, n = o.n || 5, y = o.y ?? 1.95, r = rng(o.sem || 17), cods = o.txt || [];
        const est = [];
        [-1, 1].forEach(s => est.push(cil(.022, .022, y + .1, s * w / 2, 0, 0, 6), ret(.05, .04, .8, s * w / 2, 0, 0), ret(.3, .04, .05, s * w / 2, 0, 0)));
        g.add(juntar(est, metal('#5a5e62')));
        g.add(malha(tuboEixo(.005, .005, w, 0, y, 0, 'x', 4), m('#d8d8d0')));
        const pecas = [], pino = m('#c8a040');
        for (let i = 0; i < n; i++) {
          const x0 = -w / 2 + .45 + i * (w - .9) / Math.max(1, n - 1), cod = cods.length ? cods[i % cods.length] : '', mac = cod !== '' && r() < .85;
          const mt = cmat(128, 208, (x, W, H) => { x.clearRect(0, 0, W, H); if (mac) macacao(x, W, H, o.c || '#d9661f', cod, r); else { x.fillStyle = ['#e2ded2', '#b8b4aa', '#d8d0bc'][Math.floor(r() * 3)]; x.fillRect(10, 0, W - 20, H * (.55 + r() * .3)); x.globalCompositeOperation = 'source-atop'; gasto(x, W, H, r, 120, .2); x.globalCompositeOperation = 'source-over'; } }, { alfa: .5, lado: 1, r: .95 });
          const p = G(); p.position.set(x0, y, 0); g.add(p);
          pl(p, .64, 1.04, mt, 0, -.52, 0); bx(p, .02, .06, .02, pino, -.18, -.04, 0); bx(p, .02, .06, .02, pino, .18, -.04, 0);
          pecas.push([p, r() * 9]);
        }
        anim.push((dt, t) => pecas.forEach(([p, f]) => { p.rotation.x = Math.sin(t * .8 + f) * .06; }));
        return g;
      },
      // carrinho de roupa suja (estrutura de tubo, saco de lona, roupa amontoada)
      a2_carrinho_roupa(o) {
        const g = G(), r = rng(o.sem || 19), w = .95, d = .62, h = .82, geos = [];
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => geos.push(cil(.016, .016, h - .1, a * w / 2, .1, b * d / 2, 6)));
        [.12, h].forEach(yy => geos.push(tuboEixo(.016, .016, w, 0, yy, d / 2, 'x', 6), tuboEixo(.016, .016, w, 0, yy, -d / 2, 'x', 6), tuboEixo(.016, .016, d, w / 2, yy, 0, 'z', 6), tuboEixo(.016, .016, d, -w / 2, yy, 0, 'z', 6)));
        g.add(juntar(geos, metal('#8a9096')));
        const hs = h - .2, yc = (h + .2) / 2;
        g.add(juntar([plano(w - .03, hs, 0, yc, d / 2 - .015), plano(w - .03, hs, 0, yc, -d / 2 + .015), plano(d - .03, hs, w / 2 - .015, yc, 0, 0, PI / 2), plano(d - .03, hs, -w / 2 + .015, yc, 0, 0, PI / 2), plano(w - .03, d - .03, 0, .2, 0, -PI / 2)], m(o.lona || '#8a8476', { tex: 'carpete_velho', r: 1, lado: 2 })));
        const n = o.n ?? 7, roupa = [];
        for (let i = 0; i < n; i++) roupa.push(esf(.16 + r() * .08, (r() - .5) * (w - .35), h - .12 + r() * .14, (r() - .5) * (d - .25), 1.3, .55, 1, 8));
        if (n) { g.add(juntar(roupa, m(o.roupa || '#d9661f', { r: .95 }))); const manga = pl(g, .16, .5, m(o.roupa || '#d9661f', { r: .95, lado: 2 }), w / 2 + .02, h - .2, .1); manga.rotation.y = PI / 2; manga.rotation.x = .15; }
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => sf(g, .045, m('#111'), a * (w / 2 - .03), .045, b * (d / 2 - .03), 8));
        return g;
      },
      // pilhas de macacões dobrados
      a2_macacoes(o) {
        const g = G(), r = rng(o.sem || 21), n = o.n || 3, geos = [];
        const mt = cmat(128, 96, (x, W, H) => { x.fillStyle = o.c || '#d9661f'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, H * .48, W, 3); x.fillRect(W * .5, 0, 2, H); x.fillStyle = '#ece6d6'; x.fillRect(W * .58, H * .12, W * .34, H * .22); x.fillStyle = 'rgba(30,30,30,.8)'; x.fillRect(W * .62, H * .2, W * .26, 4); gasto(x, W, H, r, 100, .2); }, { r: .95 });
        for (let s = 0; s < n; s++) { const x0 = (s - (n - 1) / 2) * .42, k = 2 + Math.floor(r() * 4); for (let i = 0; i < k; i++) geos.push(ret(.36, .065, .28, x0 + (r() - .5) * .03, i * .066, (r() - .5) * .04, 0, (r() - .5) * .12)); }
        g.add(juntar(geos, mt)); return g;
      },

      /* ================= cozinha ================= */
      a2_fogao_industrial(o) {
        const g = G(), w = o.w || 1.6, d = .8, inox = sujo('#a0a6aa', 'metal_sujo', { me: .55, r: .4, rep: [2, 1] }), preto = m('#151515', { r: .6, me: .3 }), tampo = sujo('#7a7e82', 'metal_sujo', { me: .5 });
        bx(g, w, .84, d, inox, 0, .06, 0); bx(g, w, .06, d - .1, preto, 0, 0, -.05);
        bx(g, w + .02, .04, d + .02, tampo, 0, .9, 0); bx(g, w, .32, .05, inox, 0, .94, -d / 2 + .025);
        const nb = Math.max(2, Math.round(w / .5)), gr = [];
        for (let i = 0; i < nb; i++) for (let j = 0; j < 2; j++) { const x0 = -w / 2 + w / nb * (i + .5), z0 = -.16 + j * .32; gr.push(anel(.12, .012, x0, .955, z0, PI * 2, PI / 2), ret(.26, .02, .02, x0, .945, z0), ret(.02, .02, .26, x0, .945, z0), cil(.05, .05, .015, x0, .94, z0, 10)); }
        g.add(juntar(gr, preto));
        const np = Math.max(1, Math.round(w / .8)), portas = [], vidros = [], puxa = [];
        for (let i = 0; i < np; i++) { const x0 = -w / 2 + w / np * (i + .5); portas.push(ret(w / np - .08, .48, .02, x0, .16, d / 2 + .005)); vidros.push(ret(w / np - .3, .14, .01, x0, .38, d / 2 + .018)); puxa.push(ret(w / np - .2, .03, .05, x0, .67, d / 2 + .04)); }
        g.add(juntar(portas, tampo)); g.add(juntar(vidros, m('#0a0a0a', { op: .85 }))); g.add(juntar(puxa, metal('#c8ccd0')));
        const kn = []; for (let i = 0; i < nb * 2; i++) kn.push(tuboEixo(.028, .028, .04, -w / 2 + .12 + i * (w - .24) / (nb * 2 - 1), .79, d / 2 + .02, 'z', 10));
        g.add(juntar(kn, preto));
        if (o.panela !== false) { const x0 = -w / 2 + w / nb * .5; g.add(juntar([cil(.14, .14, .2, x0, .96, .16, 18), cil(.15, .15, .015, x0, 1.16, .16, 18), ret(.04, .03, .12, x0, 1.17, .16)], metal('#b8bec4'))); }
        if (o.coifa) {
          const cf = sujo('#8e9498', 'metal_sujo', { me: .5, r: .45 });
          bx(g, w + .2, .42, .95, cf, 0, 2.05, -.05); bx(g, .5, ALT - 2.47, .45, cf, 0, 2.47, -.2);
          const filtro = cmat(128, 64, (x, W, H) => { x.fillStyle = '#3a3c3e'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(200,200,200,.4)'; for (let i = 0; i < W; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } x.fillStyle = 'rgba(60,40,10,.35)'; x.fillRect(0, 0, W, H); });
          g.add(malha(plano(w + .1, .85, 0, 2.045, -.05, PI / 2), filtro));
        }
        return g;
      },
      // porta de câmara fria (isolada, trinco de alavanca, termômetro e geada)
      a2_porta_camara(o) {
        const g = G(), r = rng(o.sem || 25), w = 1.3, h = 2.2, branco = sujo(o.c || '#d4d8d6', 'metal_sujo', { me: .35, r: .5 }), aco = metal('#9aa0a6');
        bx(g, w + .3, h + .18, .1, sujo('#8a8e8c', 'metal_sujo', { me: .45 }), 0, 0, .05);
        bx(g, w, h, .12, branco, 0, .02, .14);
        bx(g, w - .1, .3, .01, aco, 0, .06, .205);
        const geos = []; [.35, h - .45].forEach(yy => geos.push(ret(.14, .26, .08, -w / 2 + .02, yy, .2)));
        geos.push(ret(.08, .5, .08, w / 2 - .2, .95, .24), ret(.32, .06, .06, w / 2 - .32, 1.22, .3), ret(.14, .14, .06, w / 2 - .2, 1.15, .21));
        g.add(juntar(geos, aco));
        bx(g, .32, .26, .02, m('#203038', { op: .8, r: .05 }), 0, 1.55, .205);
        const gelo = cmat(256, 128, (x, W, H) => { x.clearRect(0, 0, W, H); for (let i = 0; i < 900; i++) { const yy = H * (1 - Math.pow(r(), 2)); x.fillStyle = `rgba(235,245,255,${.15 + r() * .4})`; x.fillRect(r() * W, yy, 1 + r() * 4, 1 + r() * 3); } }, { transp: 1 });
        pl(g, w, .6, gelo, 0, .32, .207);
        const tmp = cmat(128, 48, (x, W, H) => { x.fillStyle = '#120202'; x.fillRect(0, 0, W, H); escrever(x, o.temp || '-18°C', W / 2, H / 2 + 1, 30, '#ff3a2a', W - 10, 'bold', 'monospace'); }, { brilho: 1.2 });
        bx(g, .3, .16, .06, m('#2a2a2a'), w / 2 + .32, 1.55, .1); pl(g, .24, .09, tmp, w / 2 + .32, 1.63, .131);
        if (o.txt) { const pt = cmat(256, 64, (x, W, H) => { x.fillStyle = '#e8e4d8'; x.fillRect(0, 0, W, H); x.strokeStyle = '#1a3a6a'; x.lineWidth = 6; x.strokeRect(3, 3, W - 6, H - 6); escrever(x, o.txt, W / 2, H / 2 + 2, 30, '#1a3a6a', W - 24); }); pl(g, .7, .17, pt, 0, h - .2, .205); }
        return g;
      },
      // esteira de corte: cinta correndo, serra circular girando sob a capa, botão de emergência
      a2_esteira_corte(o) {
        const g = G(), L = o.l || 3.2, W = .7, h = .86, r = rng(o.sem || 27), inox = sujo('#9aa0a4', 'metal_sujo', { me: .55, r: .4, rep: [3, 1] });
        const geos = [], nl = Math.max(2, Math.round(L / 1.1));
        for (let i = 0; i < nl; i++) { const x0 = -L / 2 + .15 + i * (L - .3) / (nl - 1); [-1, 1].forEach(s => geos.push(ret(.06, h - .06, .06, x0, 0, s * (W / 2 - .05)))); geos.push(ret(.05, .05, W - .1, x0, .25, 0)); }
        [-1, 1].forEach(s => geos.push(ret(L, .14, .05, 0, h - .14, s * W / 2)));
        geos.push(ret(.5, .03, W - .1, L / 2 + .24, .52, 0, 0, 0, -.45));
        g.add(juntar(geos, inox));
        g.add(juntar([tuboEixo(.07, .07, W - .05, L / 2 - .05, h - .07, 0, 'z', 12), tuboEixo(.07, .07, W - .05, -L / 2 + .05, h - .07, 0, 'z', 12)], metal('#5a5e62')));
        const [cv, x] = tela(256, 64); x.fillStyle = '#1e2022'; x.fillRect(0, 0, 256, 64); x.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 256; i += 16) x.fillRect(i, 0, 3, 64); x.fillStyle = 'rgba(90,10,10,.35)'; for (let i = 0; i < 6; i++) x.fillRect(r() * 250, r() * 60, 4 + r() * 20, 3 + r() * 8);
        const tb = texCanvas(cv, [Math.max(1, Math.round(L / .5)), 1]); const cinta = m('#ffffff', { unico: true, mapa: tb, r: .6 });
        g.add(malha(plano(L - .1, W - .1, 0, h - .005, 0, -PI / 2), cinta));
        // pórtico amarelo da serra
        const xs = L / 2 - .7, capa = sujo('#c8a018', 'metal_sujo', { me: .4, r: .5 });
        g.add(juntar([ret(.1, .62, .08, xs, h - .1, W / 2 + .04), ret(.1, .62, .08, xs, h - .1, -W / 2 - .04), ret(.16, .1, W + .2, xs, h + .5, 0), ret(.3, .26, .3, xs, h + .6, 0)], capa));
        const disco = cmat(128, 128, (x2, S) => { x2.clearRect(0, 0, S, S); x2.fillStyle = '#b8bec4'; x2.beginPath(); for (let k = 0; k < 48; k++) { const a = k / 48 * PI * 2, rr = k % 2 ? S * .44 : S * .5; x2.lineTo(S / 2 + Math.cos(a) * rr, S / 2 + Math.sin(a) * rr); } x2.closePath(); x2.fill(); x2.strokeStyle = 'rgba(0,0,0,.25)'; x2.lineWidth = 2; for (let k = 1; k < 4; k++) { x2.beginPath(); x2.arc(S / 2, S / 2, S * .1 * k, 0, 7); x2.stroke(); } x2.fillStyle = '#2a2a2a'; x2.beginPath(); x2.arc(S / 2, S / 2, S * .07, 0, 7); x2.fill(); }, { alfa: .5, lado: 1, me: .8, r: .3 });
        const lam = malha(new T.CircleGeometry(.3, 24), disco); lam.position.set(xs, h + .12, 0); g.add(lam);
        const tampa = new T.CylinderGeometry(.34, .34, .14, 16, 1, true, PI / 2, PI); tampa.rotateX(PI / 2); tampa.translate(xs, h + .12, 0);
        g.add(malha(tampa, m('#c8a018', { tex: 'metal_sujo', me: .4, r: .5, lado: 2 })));
        if (o.aviso !== false) { const pv = cmat(256, 64, (x2, W2, H2) => { x2.fillStyle = '#e8b417'; x2.fillRect(0, 0, W2, H2); x2.strokeStyle = '#111'; x2.lineWidth = 6; x2.strokeRect(3, 3, W2 - 6, H2 - 6); escrever(x2, o.aviso || 'PERIGO · LÂMINA', W2 / 2, H2 / 2 + 2, 30, '#111', W2 - 20); }); pl(g, .5, .13, pv, xs, h + .62, .16); }
        // botão de emergência
        bx(g, .14, .2, .1, m('#d8b418', { r: .5 }), -L / 2 + .4, .62, W / 2 + .06); const bt = cy(g, .045, .04, .04, m('#ffffff', { unico: true, e: '#ff1a10', ei: .9 }), -L / 2 + .4, .72, W / 2 + .13, 12); bt.rotation.x = PI / 2;
        const lp = sf(g, .025, m('#ffffff', { unico: true, e: '#30ff60', ei: 1.6 }), xs, h + .87, .16, 8);
        g.add(malha(cil(.25, .22, .45, L / 2 + .58, 0, 0, 14), sujo('#5a5e62')));
        anim.push((dt, t) => { lam.rotation.z -= dt * 16; tb.offset.x -= dt * .35; lp.visible = Math.sin(t * 4) > -.5; });
        return g;
      },
      // grade de panelas pendurada no teto (tudo acima de 1,85 m)
      a2_panelas(o) {
        const g = G(), w = o.w || 2.2, d = o.d || .6, y = o.y ?? 2.3, r = rng(o.sem || 29), geos = [], pan = [], cobre = [];
        geos.push(tuboEixo(.02, .02, w, 0, y, d / 2, 'x', 6), tuboEixo(.02, .02, w, 0, y, -d / 2, 'x', 6), tuboEixo(.02, .02, d, w / 2, y, 0, 'z', 6), tuboEixo(.02, .02, d, -w / 2, y, 0, 'z', 6));
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => geos.push(cil(.006, .006, ALT - y, a * w / 2, y, b * d / 2, 4)));
        const n = o.n || Math.round(w * 3);
        for (let i = 0; i < n; i++) {
          const x0 = -w / 2 + .15 + i * (w - .3) / Math.max(1, n - 1), z0 = (i % 2 ? 1 : -1) * d / 2, tipo = r(), top = y - .06, alvo = r() < .35 ? cobre : pan;
          geos.push(cil(.004, .004, .08, x0, top, z0, 4));
          if (tipo < .45) { const rr = .09 + r() * .05, hh = .1 + r() * .07; alvo.push(cil(rr, rr * .92, hh, x0, top - .06 - hh, z0, 14), anel(.025, .006, x0, top - .03, z0, PI * 2, 0, 0, 0, 4, 8)); }
          else if (tipo < .8) { const rr = .1 + r() * .04; alvo.push(cil(rr, rr * .85, .04, x0, top - .3, z0, 14, PI / 2), ret(.025, .22, .012, x0, top - .25, z0)); }
          else alvo.push(cil(.007, .007, .3, x0, top - .3, z0, 4), esf(.05, x0, top - .32, z0, 1, .5, 1, 8));
        }
        g.add(juntar(geos, metal('#8a9096'))); if (pan.length) g.add(juntar(pan, metal('#b8bec4'))); if (cobre.length) g.add(juntar(cobre, m('#b0683a', { me: .8, r: .35 })));
        return g;
      },

      /* ================= banheiro coletivo ================= */
      // fileira de chuveiros sem divisória (encostada na parede: origem na parede)
      a2_chuveiros(o) {
        const g = G(), n = o.n || 4, esp = o.esp || 1.2, Lp = (n - 1) * esp + .5, r = rng(o.sem || 31), geos = [], vg = [], gotas = [];
        geos.push(tuboEixo(.025, .025, Lp, 0, 2.25, .06, 'x', 8));
        for (let i = 0; i < n; i++) {
          const x0 = (i - (n - 1) / 2) * esp;
          geos.push(cil(.016, .016, 1.1, x0, 1.15, .06, 6), tuboEixo(.014, .014, .3, x0, 2.18, .2, 'z', 6), cil(.03, .09, .06, x0, 2.1, .34, 12), cil(.05, .05, .015, x0, 1.12, .015, 12, PI / 2));
          vg.push(ret(.16, .025, .025, x0, 1.12, .07), ret(.025, .16, .025, x0, 1.05, .07));
          const gt = sf(g, .012, m('#cfe4ee', { op: .7, r: .05 }), x0, 2.05, .34, 6); gotas.push([gt, r()]);
        }
        g.add(juntar(geos, metal('#b8bec4'))); g.add(juntar(vg, m('#c8ccd0', { me: .6, r: .3 })));
        anim.push((dt, t) => gotas.forEach(([gt, f]) => { const k = (t * .7 + f) % 1; gt.position.y = 2.05 - k * 2.0; gt.visible = k < .98; }));
        return g;
      },
      // cabine de sanitário (divisórias, porta entreaberta, vaso)
      a2_cabine_sanitario(o) {
        const g = G(), w = o.w || 1.0, d = o.d || 1.5, h = 1.95, lam = sujo(o.c || '#6e7f78', 'metal_sujo', { me: .2, r: .6 }), aco = metal('#9aa0a6');
        g.add(juntar([ret(.03, h - .15, d, -w / 2, .15, 0), ret(.03, h - .15, d, w / 2, .15, 0), ret(.12, h - .15, .03, -w / 2 + .06, .15, d / 2), ret(.12, h - .15, .03, w / 2 - .06, .15, d / 2)], lam));
        [-1, 1].forEach(s => bx(g, .04, .15, .04, aco, s * w / 2, 0, d / 2 - .05));
        bx(g, w, .04, .04, aco, 0, h, d / 2);
        const pv = G(); pv.position.set(-w / 2 + .12, 0, d / 2); pv.rotation.y = -(o.abre ?? .6); g.add(pv);
        bx(pv, w - .26, h - .3, .03, lam, (w - .26) / 2, .2, 0); bx(pv, .02, .06, .03, aco, w - .34, 1.0, .03);
        const lou = m('#e8e6de', { r: .25 });
        g.add(juntar([cil(.2, .15, .38, 0, 0, -d / 2 + .5, 16), ret(.42, .36, .18, 0, .38, -d / 2 + .12)], lou));
        const as = malha(new T.TorusGeometry(.17, .03, 6, 18), m('#2a2a2a', { r: .4 })); as.rotation.x = PI / 2; as.position.set(0, .4, -d / 2 + .5); g.add(as);
        g.add(malha(tuboEixo(.05, .05, .1, w / 2 - .08, .75, -.1, 'z', 10), m('#f2efe6', { r: .9 })));
        return g;
      },
      // ralo entupido: cabelo escuro e um líquido vermelho que não seca (decalque no chão)
      a2_ralo_cabelo(o) {
        const g = G(), w = o.w || 1.0, r = rng(o.sem || 35), sg = o.sangue ?? .7;
        const mt = cmat(256, 256, (x, W, H) => {
          x.clearRect(0, 0, W, H);
          if (sg) { x.fillStyle = `rgba(${110 + Math.floor(r() * 30)},8,10,${.55 + sg * .3})`; x.beginPath(); for (let k = 0; k <= 20; k++) { const a = k / 20 * PI * 2, rr = W * (.2 + r() * .22 * sg); k ? x.lineTo(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr) : x.moveTo(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr); } x.closePath(); x.fill(); x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.ellipse(W * .42, H * .4, 30, 10, -.5, 0, 7); x.fill(); }
          x.fillStyle = '#15171a'; x.beginPath(); x.arc(W / 2, H / 2, W * .12, 0, 7); x.fill(); x.strokeStyle = '#6a6e72'; x.lineWidth = 5; x.beginPath(); x.arc(W / 2, H / 2, W * .12, 0, 7); x.stroke();
          x.lineWidth = 4; for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(W / 2 + k * 10, H / 2 - W * .1); x.lineTo(W / 2 + k * 10, H / 2 + W * .1); x.stroke(); }
          x.strokeStyle = 'rgba(14,10,8,.85)';
          for (let i = 0; i < 70; i++) { x.lineWidth = .8 + r() * 1.2; const a = r() * PI * 2, r0 = r() * W * .1; let px = W / 2 + Math.cos(a) * r0, py = H / 2 + Math.sin(a) * r0; x.beginPath(); x.moveTo(px, py); const L2 = 20 + r() * 70; for (let s = 0; s < 5; s++) { px += Math.cos(a + (r() - .5) * 1.4) * L2 / 5; py += Math.sin(a + (r() - .5) * 1.4) * L2 / 5; x.lineTo(px, py); } x.stroke(); }
        }, { transp: 1, r: .15, decal: 1 });
        g.add(malha(plano(w, w, 0, .009, 0, -PI / 2), mt)); return g;
      },

      /* ================= dormitório / enfermaria ================= */
      // cama de ferro arrumada, travesseiro com a marca de uma cabeça (correias opcionais)
      a2_cama_ferro(o) {
        const g = G(), w = o.w || .95, L = o.l || 2.0, ferro = m(o.ferro || '#3b3f44', { me: .6, r: .45 }), geos = [];
        [-1, 1].forEach(s => geos.push(cil(.022, .022, 1.02, s * w / 2, 0, -L / 2, 8), cil(.022, .022, .78, s * w / 2, 0, L / 2, 8), tuboEixo(.018, .018, L, s * w / 2, .34, 0, 'z', 6)));
        [.98, .58].forEach(yy => geos.push(tuboEixo(.018, .018, w, 0, yy, -L / 2, 'x', 6)));
        geos.push(tuboEixo(.018, .018, w, 0, .74, L / 2, 'x', 6), tuboEixo(.018, .018, w, 0, .5, L / 2, 'x', 6));
        for (let i = -2; i <= 2; i++) geos.push(cil(.01, .01, .4, i * w / 6, .58, -L / 2, 5), cil(.01, .01, .24, i * w / 6, .5, L / 2, 5));
        [-1, 1].forEach(s => [-1, 1].forEach(t => geos.push(esf(.03, s * w / 2, t < 0 ? 1.03 : .79, t * L / 2, 1, 1, 1, 8))));
        g.add(juntar(geos, ferro));
        bx(g, w - .04, .03, L - .04, m('#2a2c2e', { me: .4 }), 0, .34, 0);
        bx(g, w - .05, .15, L - .06, m(o.colchao || '#cfc8b4', { r: .95 }), 0, .37, 0);
        if (o.lencol !== false) { const lc = m(o.lencol || '#e4e0d4', { r: .95 }); bx(g, w + .01, .04, L * .66, lc, 0, .5, L * .16); bx(g, w + .01, .03, .22, lc, 0, .53, -L * .18 + .1); }
        if (o.cobertor !== false) bx(g, w - .12, .07, .38, m(o.cobertor || '#4e5444', { r: 1 }), 0, .54, L / 2 - .3);
        const zt = -L / 2 + .3;
        g.add(malha(esf(.3, 0, .56, zt, 1, .2, .5, 14), m(o.travesseiro || '#f0ece2', { r: .95 })));
        const sombra = cmat(128, 96, (x, W, H) => { x.clearRect(0, 0, W, H); const gr = x.createRadialGradient(W / 2, H * .5, 4, W / 2, H * .5, W * .4); gr.addColorStop(0, 'rgba(70,58,44,.6)'); gr.addColorStop(.7, 'rgba(70,58,44,.25)'); gr.addColorStop(1, 'rgba(70,58,44,0)'); x.fillStyle = gr; x.beginPath(); x.ellipse(W / 2, H * .5, W * .36, H * .44, 0, 0, 7); x.fill(); }, { transp: 1 });
        g.add(malha(plano(.34, .26, 0, .621, zt + .01, -PI / 2), sombra));
        if (o.correias) { const cr = [], fv = []; [-.35, .25, .75].forEach(z => { cr.push(ret(w + .06, .02, .08, 0, .545, z)); [-1, 1].forEach(s => fv.push(ret(.05, .05, .06, s * (w / 2 + .02), .5, z))); }); g.add(juntar(cr, m('#4a3020', { r: .7 }))); g.add(juntar(fv, metal('#a8a8a0'))); }
        return g;
      },
      // armário de remédios: base fechada, vitrine com frascos e caixas antigas
      a2_armario_remedios(o) {
        const g = G(), w = o.w || 1.4, h = o.h || 2.0, d = .42, r = rng(o.sem || 57), corpo = sujo(o.c || '#d8dcd8', 'metal_sujo', { me: .25, r: .55 });
        g.add(juntar([ret(w, .92, d, 0, 0, 0), ret(w, h - .92, .03, 0, .92, -d / 2 + .015), ret(.03, h - .92, d, -w / 2 + .015, .92, 0), ret(.03, h - .92, d, w / 2 - .015, .92, 0), ret(w, .04, d, 0, h - .04, 0)], corpo));
        bx(g, .01, .8, .01, m('#555'), 0, .06, d / 2 + .005); [-1, 1].forEach(s => bx(g, .025, .14, .03, metal('#aaa'), s * .07, .6, d / 2 + .02));
        const ns = 3, alt = (h - 1.0) / ns;
        const rem = cmat(512, 128, (x, W, H) => {
          x.fillStyle = '#e4e8e4'; x.fillRect(0, 0, W, H); let px = 6; const pal = ['#c8ccc4', '#8a5a2a', '#e8e4d8', '#3a6a9a', '#c0392b', '#d8c890', '#6a8a6a'];
          while (px < W - 20) { const tipo = r(), ww = tipo < .5 ? 16 + r() * 10 : 26 + r() * 30, hh = H * (.35 + r() * .5), cc = pal[Math.floor(r() * pal.length)]; x.fillStyle = cc;
            if (tipo < .5) { x.fillRect(px, H - hh, ww, hh); x.fillRect(px + ww * .25, H - hh - 10, ww * .5, 10); x.fillStyle = '#f2efe6'; x.fillRect(px + 1, H - hh * .65, ww - 2, hh * .3); }
            else { x.fillRect(px, H - hh, ww, hh); x.fillStyle = 'rgba(255,255,255,.75)'; x.fillRect(px + 3, H - hh + 8, ww - 6, 10); x.fillStyle = '#b81a1a'; x.fillRect(px + 3, H - hh + 22, 8, 8); }
            x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px + ww - 2, H - hh, 2, hh); if (r() < .15) px += 18; px += ww + 3; }
          x.fillStyle = 'rgba(120,100,60,.18)'; x.fillRect(0, 0, W, H);
        }, { r: .6 });
        const prat = m('#e8eae8', { op: .6, r: .1 });
        for (let k = 0; k < ns; k++) { const yy = .95 + k * alt; bx(g, w - .06, .015, d - .06, prat, 0, yy, 0); const p = pl(g, w - .1, alt * .82, rem, 0, yy + alt * .42, -d / 2 + .1); if (k % 2) p.scale.x = -1; }
        const vid = m('#cfe0e8', { op: .14, r: .05, me: .3 });
        [-1, 1].forEach(s => { bx(g, w / 2 - .04, h - 1.0, .015, vid, s * w / 4, .94, d / 2 - .01); bx(g, .025, h - 1.0, .03, corpo, s * .02, .94, d / 2 - .01); bx(g, .02, .12, .03, metal('#aaa'), s * .06, 1.4, d / 2 + .01); });
        const cruz = cmat(64, 64, (x, W, H) => { x.fillStyle = '#f2f2ee'; x.fillRect(0, 0, W, H); x.fillStyle = '#c0141a'; x.fillRect(W * .38, H * .15, W * .24, H * .7); x.fillRect(W * .15, H * .38, W * .7, H * .24); }); pl(g, .14, .14, cruz, 0, h - .2, d / 2 + .005);
        return g;
      },
      // biombo dobrável (três folhas em zigue-zague)
      a2_biombo(o) {
        const g = G(), n = o.n || 3, pw = o.pw || .6, h = o.h || 1.75, a = o.ang ?? .45, r = rng(o.sem || 59), aco = metal('#a8aeb4');
        const pano = cmat(128, 256, (x, W, H) => { x.fillStyle = o.c || '#c8d4c8'; x.fillRect(0, 0, W, H); for (let i = 0; i < W; i += 8) { x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(i, 0, 3, H); } gasto(x, W, H, r, 140, .18); if (o.manchas !== false) for (let i = 0; i < 3; i++) { x.fillStyle = `rgba(${90 + r() * 40},${30 + r() * 20},20,${.15 + r() * .2})`; x.beginPath(); x.ellipse(r() * W, H * (.4 + r() * .6), 6 + r() * 16, 10 + r() * 30, 0, 0, 7); x.fill(); } }, { lado: 1, r: 1 });
        let px = -n * pw * Math.cos(a) / 2;
        for (let i = 0; i < n; i++) {
          const p = G(); p.position.set(px + pw * Math.cos(a) / 2, 0, 0); p.rotation.y = i % 2 ? a : -a; g.add(p);
          p.add(juntar([cil(.012, .012, h, -pw / 2, .06, 0, 6), cil(.012, .012, h, pw / 2, .06, 0, 6), tuboEixo(.012, .012, pw, 0, h + .06, 0, 'x', 6), tuboEixo(.012, .012, pw, 0, .22, 0, 'x', 6)], aco));
          pl(p, pw - .04, h - .22, pano, 0, .22 + (h - .16) / 2, 0);
          px += pw * Math.cos(a);
        }
        return g;
      },

      /* ================= fichário / arquivo ================= */
      // arquivo de fichas: grade de gavetinhas com porta-etiqueta, algumas puxadas
      a2_fichario(o) {
        const g = G(), w = o.w || 1.2, h = o.h || 1.45, d = .52, r = rng(o.sem || 39), cor = o.c || '#6e767c';
        const col = Math.max(2, Math.round(w / .3)), lin = Math.max(3, Math.round(h / .16));
        bx(g, w, h, d, sujo(cor, 'metal_sujo', { me: .45, r: .5 }), 0, 0, 0);
        const frente = cmat(256, Math.min(512, Math.round(256 * h / w)), (x, W, H) => {
          x.fillStyle = cor; x.fillRect(0, 0, W, H); const cw = W / col, ch = H / lin;
          for (let i = 0; i < col; i++) for (let j = 0; j < lin; j++) {
            const x0 = i * cw, y0 = j * ch; x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(x0, y0, cw, 2); x.fillRect(x0, y0, 2, ch); x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(x0 + 2, y0 + 2, cw - 4, 2);
            x.fillStyle = '#b8964a'; x.fillRect(x0 + cw * .25, y0 + ch * .2, cw * .5, ch * .32); x.fillStyle = '#ece4cc'; x.fillRect(x0 + cw * .29, y0 + ch * .25, cw * .42, ch * .22); x.fillStyle = 'rgba(40,30,20,.8)'; x.fillRect(x0 + cw * .33, y0 + ch * .33, cw * (.15 + r() * .2), 2);
            x.fillStyle = '#2a2a2a'; x.beginPath(); x.arc(x0 + cw / 2, y0 + ch * .72, Math.min(cw, ch) * .1, 0, 7); x.fill();
          }
          gasto(x, W, H, r, 300, .25);
        }, { r: .55, me: .3 });
        pl(g, w - .02, h - .02, frente, 0, h / 2, d / 2 + .003);
        const ab = o.abertas ?? 2, gav = [], fich = [], cw = w / col, chh = h / lin;
        for (let k = 0; k < ab; k++) { const i = Math.floor(r() * col), j = Math.floor(r() * lin), x0 = -w / 2 + cw * (i + .5), y0 = h - chh * (j + 1) + .01, pr = .2 + r() * .2; gav.push(ret(cw - .02, chh * .6, pr, x0, y0, d / 2 + pr / 2)); for (let c2 = 0; c2 < 7; c2++) fich.push(ret(cw - .05, chh * .9, .004, x0, y0 + .01, d / 2 + .04 + c2 * pr / 8, -.12)); }
        if (gav.length) { g.add(juntar(gav, sujo(cor, 'metal_sujo', { me: .45 }))); g.add(juntar(fich, m('#ece6d4', { r: .95 }))); }
        bx(g, w + .02, .02, d + .02, sujo('#4a4e52'), 0, h, 0);
        return g;
      },
      // papéis soltos: ficha (foto + digital) ou relatório; texto vem da cena
      a2_documento(o) {
        const g = G(), r = rng(o.sem || 41), n = o.n || 1, est = o.estilo || 'folha', w = o.w || .21, a = o.area || .3;
        const mt = cmat(256, 352, (x, W, H) => {
          x.fillStyle = est === 'ficha' ? '#e6dcc2' : '#ece6d6'; x.fillRect(0, 0, W, H); x.fillStyle = '#1a1612'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
          if (est === 'ficha') {
            x.font = 'bold 18px Arial'; x.fillText(o.titulo || 'FICHA', 14, 28);
            x.fillStyle = '#7a7468'; x.fillRect(14, 42, 86, 106); x.fillStyle = '#3a362e'; x.beginPath(); x.ellipse(57, 82, 22, 27, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(57, 148, 38, 30, 0, PI, 0); x.fill();
            x.strokeStyle = '#3a2a2a'; x.lineWidth = 1.5; for (let k = 1; k < 9; k++) { x.beginPath(); x.ellipse(176, 94, 4 + k * 4, 6 + k * 5, .2, 0, PI * 1.85); x.stroke(); }
            x.strokeStyle = 'rgba(30,20,10,.6)'; x.strokeRect(130, 42, 92, 106);
          } else if (o.titulo) { x.font = 'bold 19px Arial'; x.textAlign = 'center'; x.fillText(o.titulo, W / 2, 32); x.textAlign = 'left'; }
          x.font = 'bold 15px "Courier New", monospace'; x.fillStyle = '#1a1612';
          let y0 = est === 'ficha' ? 178 : 66; String(o.txt || '').split('\n').filter(Boolean).forEach(l => { x.fillText(l, 16, y0); y0 += 22; });
          x.fillStyle = 'rgba(40,30,20,.5)'; while (y0 < H - 60) { x.fillRect(16, y0 - 8, 120 + r() * 100, 2); y0 += 14; }
          if (o.assina !== false) { x.strokeStyle = '#1a2a6a'; x.lineWidth = 2; x.beginPath(); x.moveTo(W * .5, H - 40); for (let k = 0; k < 8; k++) x.lineTo(W * .5 + k * 12, H - 40 - Math.sin(k * 1.7) * 10); x.stroke(); }
          if (o.carimbo) { x.strokeStyle = 'rgba(170,20,20,.75)'; x.lineWidth = 4; x.strokeRect(18, H - 74, 104, 40); escrever(x, o.carimbo, 70, H - 54, 17, 'rgba(170,20,20,.8)', 96); }
          gasto(x, W, H, r, 120, .18);
        }, { r: .95, lado: 1 });
        for (let i = 0; i < n; i++) { const p = malha(plano(w, w * 1.375, n > 1 ? (r() - .5) * a : 0, .003 + i * .0015, n > 1 ? (r() - .5) * a : 0, -PI / 2), mt); p.rotation.y = (r() - .5) * 1.2 * (o.giro ?? 1); g.add(p); }
        return g;
      },
      // caixas-arquivo de papelão empilhadas, com etiqueta
      a2_caixas_arquivo(o) {
        const g = G(), r = rng(o.sem || 71), n = o.n || 6, w = o.w || 1.2, d = o.d || .5;
        const mt = cmat(256, 160, (x, W, H) => { x.fillStyle = '#b08a5a'; x.fillRect(0, 0, W, H); gasto(x, W, H, r, 300, .3); x.fillStyle = '#ece4cc'; x.fillRect(W * .18, H * .22, W * .64, H * .44); escrever(x, o.txt || 'ARQUIVO', W / 2, H * .36, 24, '#1a1612', W * .6); escrever(x, o.sub || ('Nº ' + (100 + Math.floor(r() * 899))), W / 2, H * .54, 18, '#1a1612', W * .6, 'normal', '"Courier New", monospace'); x.fillStyle = 'rgba(0,0,0,.4)'; x.beginPath(); x.ellipse(W * .5, H * .85, 18, 8, 0, 0, 7); x.fill(); }, { r: .9 });
        const geos = [], nc = Math.max(1, Math.round(w / .42)), nz = Math.max(1, Math.round(d / .36)); let k = 0;
        for (let i = 0; i < nc && k < n; i++) for (let j = 0; j < nz && k < n; j++) { const al = 1 + Math.floor(r() * 3); for (let s = 0; s < al && k < n; s++, k++) geos.push(ret(.4, .27, .33, -w / 2 + .21 + i * .42 + (r() - .5) * .03, s * .275, -d / 2 + .18 + j * .36 + (r() - .5) * .03, 0, (r() - .5) * .15)); }
        g.add(juntar(geos, mt)); return g;
      },

      /* ================= estufa ================= */
      // canteiro elevado com plantas carnudas, frutos (alguns com fungo, alguns com olho que segue)
      a2_canteiro_nucleo(o) {
        const g = G(), w = o.w || 2.4, d = o.d || 1.0, h = .5, r = rng(o.sem || 43);
        g.add(juntar([ret(w, h, .06, 0, 0, d / 2 - .03), ret(w, h, .06, 0, 0, -d / 2 + .03), ret(.06, h, d, w / 2 - .03, 0, 0), ret(.06, h, d, -w / 2 + .03, 0, 0)], m(o.c || '#4a3e30', { tex: 'madeira_velha', r: .9, rep: [2, 1] })));
        bx(g, w - .1, .02, d - .1, m('#1e160e', { tex: 'terra', r: 1 }), 0, h - .08, 0);
        const caule = [], folha = [], fruto = [], fungo = [], olhos = [], np = Math.max(3, Math.round(w * d * 4));
        for (let i = 0; i < np; i++) {
          const px = (r() - .5) * (w - .35), pz = (r() - .5) * (d - .3), alt = .35 + r() * .45, top = h - .06 + alt;
          caule.push(curva([[px, h - .07, pz], [px + (r() - .5) * .1, h + alt * .5, pz + (r() - .5) * .1], [px + (r() - .5) * .15, top, pz + (r() - .5) * .15]], .018, 6, 5));
          for (let k = 0; k < 4; k++) { const a = r() * PI * 2, yy = h + alt * (.3 + r() * .65), lf = new T.SphereGeometry(.1, 8, 5); lf.scale(1.7, .14, .65); lf.translate(.15, 0, 0); lf.rotateZ(.35 + r() * .4); lf.rotateY(a); lf.translate(px, yy, pz); folha.push(lf); }
          const nf = 1 + Math.floor(r() * 3);
          for (let k = 0; k < nf; k++) { const a = r() * PI * 2, rr = .05 + r() * .04, fx = px + Math.cos(a) * .12, fy = h + alt * (.5 + r() * .5), fz = pz + Math.sin(a) * .12, s = r();
            if (s < .14 && olhos.length < (o.olhos ?? 4)) olhos.push([fx, fy, fz, rr * 1.15]); else (s < .45 ? fungo : fruto).push(esf(rr, fx, fy, fz, 1, 1.15, 1, 8)); }
        }
        g.add(juntar(caule, m('#2e3a24', { r: .7 }))); g.add(juntar(folha, m(o.folha || '#24402a', { r: .55, lado: 2 })));
        if (fruto.length) g.add(juntar(fruto, m('#5a1a40', { r: .35, e: '#3a0028', ei: .35 })));
        if (fungo.length) g.add(juntar(fungo, m('#1a1c14', { r: 1, tex: 'carpete_velho' })));
        const branco = m('#e8dcc4', { r: .3, e: '#2a2010', ei: .25 }), iris = m('#c89a10', { r: .3, e: '#4a3000', ei: .5 }), pupila = m('#050505', { r: .2 }), ols = [];
        olhos.forEach(([fx, fy, fz, rr]) => { const ol = G(); ol.position.set(fx, fy, fz); g.add(ol); sf(ol, rr, branco, 0, 0, 0, 12); const ir = sf(ol, rr * .5, iris, 0, 0, rr * .9, 10); ir.scale.z = .3; const pu = sf(ol, rr * .24, pupila, 0, 0, rr * 1.0, 8); pu.scale.z = .3; ols.push([ol, r() * 9]); });
        if (ols.length) anim.push((dt, t) => ols.forEach(([ol, f]) => { ol.rotation.y = Math.sin(t * .35 + f) * 1.1; ol.rotation.x = Math.sin(t * .27 + f * 2) * .35; }));
        return g;
      },
      // luminária de cultivo pendurada (tubos de luz colorida; luz real opcional)
      a2_lampada_cultivo(o) {
        const g = G(), w = o.w || 2.0, y = o.y ?? 2.5, c = o.c || '#ff3cc8', caixa = sujo('#2a2a2e', 'metal_sujo', { me: .5 });
        g.add(juntar([ret(w, .07, .36, 0, y, 0), ret(.02, .1, .36, -w / 2, y - .1, 0), ret(.02, .1, .36, w / 2, y - .1, 0)], caixa));
        g.add(juntar([cil(.005, .005, ALT - y - .07, -(w / 2 - .2), y + .07, 0, 4), cil(.005, .005, ALT - y - .07, w / 2 - .2, y + .07, 0, 4)], metal('#555')));
        const tb = emis(c, 2.2); g.add(juntar([-.11, 0, .11].map(z => tuboEixo(.022, .022, w - .12, 0, y - .04, z, 'x', 8)), tb));
        const brilho = cmat(64, 64, (x, W, H) => { const gr = x.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H); }, { transp: 1, cor: c });
        brilho.blending = T.AdditiveBlending; g.add(malha(plano(w + .4, 1.0, 0, y - .09, 0, PI / 2), brilho));
        if (o.luz) luz(g, c, o.luz, o.d || 6, 0, y - .3, 0);
        const f = rng(o.sem || 45)() * 9; anim.push((dt, t) => { tb.emissiveIntensity = 2.2 + Math.sin(t * 50 + f) * .08 + (Math.sin(t * .7 + f) > .97 ? -1.6 : 0); });
        return g;
      },

      /* ================= ginásio ================= */
      a2_rack_halteres(o) {
        const g = G(), w = o.w || 1.8, r = rng(o.sem || 47), geos = [], cab = [], pes = [];
        [-1, 1].forEach(s => { const x0 = s * (w / 2 - .04); geos.push(ret(.05, .9, .05, x0, 0, -.18), ret(.05, .6, .05, x0, 0, .18), ret(.05, .05, .44, x0, 0, 0)); });
        geos.push(ret(w, .04, .16, 0, .56, .1, -.25), ret(w, .04, .16, 0, .86, -.12, -.25));
        const nd = Math.floor(w / .28);
        [[.6, .1], [.9, -.12]].forEach(([yy, zz]) => { for (let i = 0; i < nd; i++) { if (r() < .15) continue; const x0 = -w / 2 + .18 + i * (w - .36) / Math.max(1, nd - 1), rr = .045 + (i / nd) * .035; cab.push(tuboEixo(.016, .016, .34, x0, yy + rr, zz, 'z', 6)); [-1, 1].forEach(s => pes.push(tuboEixo(rr, rr, .08, x0, yy + rr, zz + s * .14, 'z', 6))); } });
        g.add(juntar(geos, m('#1e1f22', { me: .5, r: .45 }))); if (cab.length) { g.add(juntar(cab, metal('#b8bec4'))); g.add(juntar(pes, m('#2a2a2c', { r: .5, me: .4 }))); }
        return g;
      },
      a2_banco_supino(o) {
        const g = G(), ferro = m('#202226', { me: .5, r: .45 });
        g.add(juntar([ret(.08, .38, .08, 0, 0, -.45), ret(.08, .38, .08, 0, 0, .45), ret(.5, .05, .08, 0, 0, -.45), ret(.5, .05, .08, 0, 0, .45), ret(.08, .05, 1.0, 0, .33, 0), ret(.06, 1.15, .06, -.42, 0, -.62), ret(.06, 1.15, .06, .42, 0, -.62), ret(.12, .06, .06, -.42, 1.08, -.57), ret(.12, .06, .06, .42, 1.08, -.57), ret(.9, .05, .2, 0, 0, -.62)], ferro));
        bx(g, .3, .09, 1.15, m(o.c || '#5a1e1e', { r: .55, tex: 'carpete_velho' }), 0, .38, 0);
        g.add(malha(tuboEixo(.014, .014, 1.9, 0, 1.17, -.57, 'x', 8), metal('#c0c4c8')));
        const pesos = []; [-1, 1].forEach(s => { for (let k = 0; k < 2; k++) pesos.push(tuboEixo(.22 - k * .05, .22 - k * .05, .04, s * (.62 + k * .05), 1.17, -.57, 'x', 18)); });
        g.add(juntar(pesos, m('#151515', { r: .5, me: .3 })));
        return g;
      },
      // saco de pancada rasgado, com areia escorrendo
      a2_saco_rasgado(o) {
        const g = G(), r = rng(o.sem || 51), piv = G(); piv.position.y = ALT; g.add(piv);
        const ya = -(ALT - 2.05);
        cy(piv, .008, .008, ALT - 2.05, metal('#777'), 0, ya, 0, 4);
        cy(piv, .2, .19, 1.0, m(o.c || '#5a1d1d', { r: .55, tex: 'carpete_velho' }), 0, ya - 1.0, 0, 16);
        piv.add(juntar([.12, .5, .88].map(k => cil(.204, .204, .04, 0, ya - 1.0 + k * 1.0, 0, 16)), m('#1a1a1a', { r: .6 })));
        const rasgo = cmat(64, 128, (x, W, H) => { x.clearRect(0, 0, W, H); x.fillStyle = '#120a06'; x.beginPath(); x.moveTo(W * .5, 4); for (let i = 0; i < 10; i++) x.lineTo(W * (.5 + (i % 2 ? .3 : .05) * (1 - Math.abs(i - 5) / 6)), 4 + i * H / 10); x.lineTo(W * .5, H - 4); for (let i = 9; i >= 0; i--) x.lineTo(W * (.5 - (i % 2 ? .25 : .05) * (1 - Math.abs(i - 5) / 6)), 4 + i * H / 10); x.fill(); x.fillStyle = '#c8b088'; for (let i = 0; i < 40; i++) x.fillRect(W * .4 + r() * W * .2, H * .6 + r() * H * .4, 2, 2); }, { transp: 1 });
        pl(piv, .16, .42, rasgo, 0, ya - .45, .196);
        const ar = m('#b8a07a', { r: 1 });
        cy(g, .02, .34, .08, ar, .02, 0, .14, 14);
        cy(piv, .004, .009, 1.36, ar, 0, -ALT, .2, 5);
        const f = r() * 6; anim.push((dt, t) => { piv.rotation.z = Math.sin(t * 1.1 + f) * .03; piv.rotation.x = Math.sin(t * .8 + f) * .015; });
        return g;
      },

      /* ================= cinema ================= */
      // projetor de película num pedestal, bobinas girando (a lente aponta para +z)
      a2_projetor(o) {
        const g = G(), ferro = m('#1e1e20', { me: .5, r: .5 }), corpo = sujo('#3a4038', 'metal_sujo', { me: .45 });
        const geos = []; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => geos.push(cil(.025, .03, 1.0, a * .26, 0, b * .26, 6)));
        geos.push(ret(.64, .04, .64, 0, 1.0, 0), ret(.56, .03, .56, 0, .35, 0), ret(.03, .45, .03, 0, 1.42, .12, -.25), ret(.03, .42, .03, 0, 1.42, -.2, .35));
        g.add(juntar(geos, ferro));
        bx(g, .32, .38, .62, corpo, 0, 1.04, 0);
        g.add(malha(tuboEixo(.075, .065, .2, 0, 1.28, .4, 'z', 14), m('#151515', { me: .6, r: .3 })));
        const vid = malha(new T.CircleGeometry(.055, 14), emis('#fff2d0', 2.6)); vid.position.set(0, 1.28, .505); g.add(vid);
        const bob = [];
        [[.26, 1.86], [-.32, 1.82]].forEach(([zz, yy]) => { const b = G(); b.position.set(0, yy, zz); g.add(b); b.add(malha(tuboEixo(.24, .24, .05, 0, 0, 0, 'x', 24), m('#8a8e92', { me: .7, r: .35 }))); b.add(juntar([0, 1, 2].map(k => ret(.06, .07, .07, 0, Math.cos(k * 2.09) * .13 - .035, Math.sin(k * 2.09) * .13)), m('#1a1a1a'))); bob.push(b); });
        g.add(malha(curva([[0, 1.62, .26], [0, 1.45, .2], [0, 1.4, .05], [0, 1.45, -.1], [0, 1.6, -.32]], .006, 16, 4), m('#2a2420')));
        anim.push(dt => bob.forEach((b, i) => { b.rotation.x -= dt * (i ? 1.6 : 2.1); }));
        return g;
      },
      // facho de luz do projetor (sai da origem para +z, até a tela)
      a2_facho(o) {
        const g = G(), L = o.l || 7, w1 = o.w || 5, h1 = o.h || 2.4, y0 = o.y ?? 1.28, y1 = o.y1 ?? 1.7, k = Math.SQRT2;
        const geo = new T.CylinderGeometry(1, .02, L, 4, 1, true); geo.rotateY(PI / 4); geo.translate(0, L / 2, 0); geo.rotateX(PI / 2); geo.scale(w1 / 2 * k, h1 / 2 * k, 1);
        geo.rotateX(-Math.asin((y1 - y0) / L)); geo.translate(0, y0, 0);
        const op = o.op || .05, mt = m('#ffffff', { unico: true, e: o.c || '#fff0cc', ei: .9, op, lado: 2, r: 1 }); mt.depthWrite = false; mt.blending = T.AdditiveBlending;
        g.add(malha(geo, mt));
        const f = rng(o.sem || 55)() * 9; anim.push((dt, t) => { mt.opacity = op * (.85 + .15 * Math.sin(t * 23 + f) + (Math.random() < .03 ? -.4 : 0)); });
        return g;
      },
      // arandela de parede (meia cúpula, brilho na parede; luz real opcional)
      a2_arandela(o) {
        const g = G(), y = o.y ?? 1.95, c = o.c || '#ffb870';
        const base = malha(new T.CylinderGeometry(.07, .07, .02, 12), metal('#8a6a3a')); base.rotation.x = PI / 2; base.position.set(0, y, .01); g.add(base);
        const cup = malha(new T.CylinderGeometry(.1, .07, .16, 14, 1, true, -PI / 2, PI), m(o.cupula || '#c8b080', { r: .7, lado: 2, e: c, ei: .25 })); cup.position.set(0, y + .02, .03); g.add(cup);
        sf(g, .035, emis(c, 2.2), 0, y + .02, .05, 8);
        const brilho = cmat(64, 128, (x, W, H) => { const gr = x.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, W * .9); gr.addColorStop(0, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H); }, { transp: 1, cor: c });
        brilho.blending = T.AdditiveBlending; pl(g, .6, 1.1, brilho, 0, y + .05, .012);
        if (o.luz) luz(g, c, o.luz, o.d || 3.5, 0, y, .3, o.pisca);
        return g;
      },

      /* ================= corredor acústico ================= */
      // bloco oco revestido de espuma (paredes de um corredor), com tampa no alto
      a2_bloco_espuma(o) {
        const g = G(), w = o.w || 3, d = o.d || 3, h = o.h || ALT - .01, c = o.c || '#2f3036', e = .2;
        const parede = (len, x, z, ry) => { const mt = m(c, { tex: 'espuma', rep: [Math.max(1, Math.round(len / .7)), Math.max(1, Math.round(h / .7))], r: 1 }); g.add(malha(rotG(new T.BoxGeometry(len, h, e), 0, ry, 0).translate(x, h / 2, z), mt)); };
        parede(w, 0, d / 2 - e / 2, 0); parede(w, 0, -d / 2 + e / 2, 0); parede(d - 2 * e, w / 2 - e / 2, 0, PI / 2); parede(d - 2 * e, -w / 2 + e / 2, 0, PI / 2);
        g.add(malha(plano(w, d, 0, h, 0, -PI / 2), m(o.tampa || '#1c1c20', { tex: 'espuma', rep: [Math.max(1, Math.round(w)), Math.max(1, Math.round(d))], r: 1 })));
        return g;
      },
      // placas acústicas penduradas do teto (atravessando o corredor)
      a2_defletor(o) {
        const g = G(), n = o.n || 4, w = o.w || 1.8, h = o.h || .7, esp = o.esp || 1.0, y = o.y ?? ALT - .12, geos = [], fios = [];
        for (let i = 0; i < n; i++) { const x0 = (i - (n - 1) / 2) * esp; geos.push(ret(.07, h, w, x0, y - h, 0)); [-1, 1].forEach(s => fios.push(cil(.004, .004, ALT - y, x0, y, s * (w / 2 - .15), 4))); }
        g.add(juntar(geos, m(o.c || '#34353c', { tex: 'espuma', rep: [3, 1], r: 1 }))); g.add(juntar(fios, metal('#555')));
        return g;
      },

      /* ================= caldeiras ================= */
      // caldeira horizontal: casco rebitado em selas, fornalha acesa na frente (+z), manômetros, chaminé
      a2_caldeira_grande(o) {
        const g = G(), L = o.l || 3.2, R = o.raio || .8, yc = R + .38, r = rng(o.sem || 61);
        const casco = m(o.c || '#4a3a2e', { tex: 'ferrugem', me: .6, r: .45, rep: [3, 2] }), ferro = m('#1e1c1a', { me: .5, r: .5 });
        g.add(malha(tuboEixo(R, R, L, 0, yc, 0, 'z', 28), casco));
        [1, -1].forEach(s => { const t = new T.SphereGeometry(R, 24, 10, 0, PI * 2, 0, PI / 2); t.scale(1, .28, 1); t.rotateX(s * PI / 2); t.translate(0, yc, s * L / 2); g.add(malha(t, casco)); });
        g.add(juntar([0, 1, 2, 3, 4].map(i => anel(R + .015, .03, 0, yc, -L / 2 + .2 + i * (L - .4) / 4, PI * 2, 0, 0, 0, 6, 32)), ferro));
        g.add(juntar([ret(R * 1.7, yc - .1, .32, 0, 0, L * .3), ret(R * 1.7, yc - .1, .32, 0, 0, -L * .3), ret(R * 2 + .2, .1, L + .2, 0, 0, 0)], m('#2a2624', { tex: 'concreto_sujo', r: .9 })));
        bx(g, .66, .54, .34, ferro, 0, yc - .62, L / 2 + .12);
        const brasa = cmat(128, 96, (x, W, H) => { const gr = x.createRadialGradient(W / 2, H * .6, 4, W / 2, H * .6, W * .6); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(.4, '#ff8a20'); gr.addColorStop(1, '#5a0a00'); x.fillStyle = gr; x.fillRect(0, 0, W, H); x.fillStyle = '#1a0a04'; for (let i = 0; i < W; i += 14) x.fillRect(i, 0, 5, H); }, { brilho: 1.8 });
        pl(g, .48, .34, brasa, 0, yc - .35, L / 2 + .295);
        const L2 = luz(g, '#ff7a20', o.luz ?? 1.0, 4.5, 0, yc - .3, L / 2 + .7);
        const mano = [];
        [-.35, .35].forEach(xx => { const gm = G(); gm.position.set(xx, yc + .35, L / 2 + .24); g.add(gm); const fc = malha(new T.CircleGeometry(.1, 18), m('#e8e4d4', { r: .4 })); fc.position.z = .02; gm.add(fc); const ar = malha(new T.TorusGeometry(.1, .015, 6, 18), metal('#a88a4a')); ar.position.z = .02; gm.add(ar); gm.add(malha(tuboEixo(.02, .02, .12, 0, -.12, -.03, 'z', 6), metal('#8a7a5a'))); const ag = G(); ag.position.z = .025; gm.add(ag); bx(ag, .008, .08, .005, m('#b81a1a'), 0, 0, 0); mano.push([ag, r() * 6]); });
        g.add(juntar([cil(.17, .17, ALT - (yc + R) + .05, 0, yc + R - .05, -L / 2 + .45, 14), cil(.22, .22, .12, 0, yc + R - .08, -L / 2 + .45, 14), cil(.05, .05, .25, .3, yc + R - .05, L * .15, 8), cil(.09, .09, .1, .3, yc + R + .2, L * .15, 10)], m('#3a2e26', { tex: 'ferrugem', me: .55, r: .5 })));
        const vp = P.vapor_sobe({ y: yc + R + .3, sem: o.sem }); vp.position.set(.3, 0, L * .15); g.add(vp);
        anim.push((dt, t) => { const k = .8 + .2 * Math.sin(t * 7 + Math.sin(t * 13)); brasa.emissiveIntensity = 1.8 * k; L2.intensity = (o.luz ?? 1.0) * k; mano.forEach(([ag, f]) => { ag.rotation.z = -1 + Math.sin(t * .5 + f) * .3 + Math.sin(t * 9 + f) * .03; }); });
        return g;
      },

      /* ================= sala de jogos ================= */
      // rack baixo com TV de tubo rodando um jogo antigo, console e controles no chão
      a2_rack_tv(o) {
        const g = G(), mad = m('#4a3424', { tex: 'madeira_velha', r: .8 });
        g.add(juntar([ret(1.3, .05, .48, 0, .48, 0), ret(1.3, .04, .48, 0, .04, 0), ret(.04, .5, .48, -.63, 0, 0), ret(.04, .5, .48, .63, 0, 0), ret(1.3, .5, .02, 0, 0, -.23)], mad));
        const tv = G(); tv.position.set(0, .53, 0); g.add(tv); bx(tv, .74, .58, .5, m('#2a2826', { r: .5 }), 0, 0, -.02);
        const [c, x] = tela(160, 120), t = texCanvas(c), tm = m('#000', { unico: true, mapa: t, e: '#ffffff', ei: 1.2 }); tm.emissiveMap = t;
        pl(tv, .58, .44, tm, -.05, .3, .232);
        let ult = 0; anim.push((dt, tt) => { if (tt - ult < .12) return; ult = tt; x.fillStyle = '#0a0a2a'; x.fillRect(0, 0, 160, 120); x.fillStyle = '#2a8a3a'; x.fillRect(0, 96, 160, 24); for (let i = 0; i < 6; i++) { x.fillStyle = '#c86a2a'; x.fillRect(((i * 40 - tt * 30) % 200 + 200) % 200 - 20, 80 - (i % 3) * 18, 16, 8); } x.fillStyle = '#ffd040'; x.fillRect(30, 72 - Math.abs(Math.sin(tt * 3)) * 26, 12, 14); if (Math.floor(tt * 1.5) % 2) { x.fillStyle = '#ffffff'; x.font = 'bold 14px monospace'; x.textAlign = 'center'; x.fillText(o.txt || 'PRESS START', 80, 30); } x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 120; i += 3) x.fillRect(0, i, 160, 1); t.needsUpdate = true; });
        bx(g, .32, .08, .24, m('#8a8a90', { r: .5 }), -.3, .08, .02); const led = sf(g, .01, m('#ffffff', { unico: true, e: '#ff2010', ei: 1.6 }), -.2, .13, .145, 6);
        g.add(juntar([ret(.12, .02, .08, .25, .08, .0), ret(.12, .02, .08, .25, .1, .0, 0, .2), ret(.12, .02, .08, .38, .08, .05, 0, -.3)], m('#3a3a3c', { r: .5 })));
        const ctl = m('#5a5a60', { r: .5 }), fio = m('#1a1a1a');
        [[-.2, .75, .4], [.3, .9, -.5]].forEach(([cx, cz, ry]) => { const k = G(); k.position.set(cx, 0, cz); k.rotation.y = ry; g.add(k); k.add(juntar([ret(.16, .035, .07, 0, 0, 0), esf(.035, -.07, .02, .02, 1, .6, 1, 8), esf(.035, .07, .02, .02, 1, .6, 1, 8)], ctl)); });
        g.add(juntar([curva([[-.2, .02, .72], [-.3, .02, .5], [-.32, .1, .15]], .006, 10, 3), curva([[.3, .02, .86], [.0, .02, .6], [-.25, .1, .15]], .006, 10, 3)], fio));
        if (o.luz) luz(g, '#8ab0ff', o.luz, 3, 0, .9, .6, true);
        anim.push((dt, tt) => { led.visible = Math.sin(tt * 2) > -.8; });
        return g;
      },
      a2_maquina_venda(o) {
        const g = G(), r = rng(o.sem || 65), w = 1.0, h = 1.85, d = .8;
        bx(g, w, h, d, sujo(o.c || '#9a2420', 'metal_sujo', { me: .35, r: .5 }), 0, 0, 0);
        const prod = cmat(256, 384, (x, W, H) => { x.fillStyle = '#101214'; x.fillRect(0, 0, W, H); const pal = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad', '#ecf0f1', '#d35400']; for (let j = 0; j < 5; j++) { const y0 = 10 + j * 74; x.fillStyle = '#5a5e62'; x.fillRect(0, y0 + 62, W, 5); for (let i = 0; i < 5; i++) { if (r() < .2) continue; x.fillStyle = pal[Math.floor(r() * pal.length)]; x.fillRect(8 + i * 49, y0 + 10 + r() * 8, 38, 50); x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(12 + i * 49, y0 + 22, 30, 8); x.fillStyle = '#e8e2d0'; x.font = 'bold 10px monospace'; x.fillText(String.fromCharCode(65 + j) + (i + 1), 18 + i * 49, y0 + 73); } } }, { brilho: .55 });
        pl(g, w * .66, h * .64, prod, -w * .14, h * .58, d / 2 + .005);
        bx(g, w * .7, h * .66, .02, m('#bcd8e8', { op: .15, r: .05, me: .3 }), -w * .14, h * .25, d / 2 + .02);
        const pain = cmat(64, 192, (x, W, H) => { x.fillStyle = '#1a1a1c'; x.fillRect(0, 0, W, H); x.fillStyle = '#40ff80'; x.fillRect(8, 10, W - 16, 22); x.fillStyle = '#062010'; x.font = 'bold 14px monospace'; x.fillText('0,00', 14, 26); for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) { x.fillStyle = '#c8c4b8'; x.fillRect(8 + i * 17, 50 + j * 22, 13, 15); } x.fillStyle = '#3a3a3a'; x.fillRect(W / 2 - 4, 150, 8, 22); }, { brilho: .4 });
        pl(g, w * .2, h * .4, pain, w * .36, h * .62, d / 2 + .005);
        bx(g, w * .6, .2, .04, m('#0a0a0a'), -w * .14, .12, d / 2 + .005);
        if (o.txt) { const tt = cmat(256, 48, (x, W, H) => { x.fillStyle = '#f4e8c8'; x.fillRect(0, 0, W, H); escrever(x, o.txt, W / 2, H / 2 + 1, 28, o.c || '#9a2420', W - 16); }, { brilho: .6 }); pl(g, w - .1, .17, tt, 0, h - .13, d / 2 + .005); }
        return g;
      },
      a2_pufe(o) { const g = G(); g.add(juntar([esf(.42, 0, .22, 0, 1, .55, 1, 14), esf(.26, 0, .4, -.1, 1, .6, .9, 10)], m(o.c || '#6a2a6a', { r: .9, tex: 'carpete_velho' }))); return g; },

      /* ================= capela ================= */
      // grupo de velas acesas (uma luz só para o grupo)
      a2_velas(o) {
        const g = G(), n = o.n || 7, R = o.raio || .3, r = rng(o.sem || 67), cera = [], chamas = [], pocas = [];
        for (let i = 0; i < n; i++) { const a = r() * PI * 2, dd = Math.sqrt(r()) * R, x0 = Math.cos(a) * dd, z0 = Math.sin(a) * dd, hh = .08 + r() * .3, rr = .02 + r() * .025; cera.push(cil(rr, rr * 1.05, hh, x0, 0, z0, 10)); pocas.push(cil(rr * 2, rr * 2.2, .006, x0, 0, z0, 10)); const ch = new T.ConeGeometry(.012, .05, 6); ch.translate(x0, hh + .03, z0); chamas.push(ch); }
        g.add(juntar(cera, m(o.c || '#e8dcbc', { r: .6 }))); g.add(juntar(pocas, m(o.c || '#e8dcbc', { r: .5 })));
        const fm = emis('#ffc050', 2.6); g.add(juntar(chamas, fm));
        if ((o.i ?? 1) > 0) luz(g, '#ffb347', o.i ?? 1.0, o.d || 4, 0, .5, 0, 'vela');
        anim.push((dt, t) => { fm.emissiveIntensity = 2.2 + Math.sin(t * 17) * .3 + Math.sin(t * 29) * .2; });
        return g;
      },
      // estandarte de pano pendurado numa vara (origem na parede)
      a2_estandarte(o) {
        const g = G(), w = o.w || .9, h = o.h || 2.0, topo = o.y ?? ALT - .15, r = rng(o.sem || 69), c = o.c || '#c8a010';
        g.add(malha(tuboEixo(.018, .018, w + .2, 0, topo, .06, 'x', 8), metal('#6a5020')));
        [-1, 1].forEach(s => sf(g, .035, metal('#8a6a2a'), s * (w / 2 + .12), topo, .06, 8));
        const mt = cmat(128, 256, (x, W, H) => { x.fillStyle = c; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(0, 0, W, 10); x.fillRect(6, 0, 5, H); x.fillRect(W - 11, 0, 5, H); for (let i = 0; i < W; i += 10) { x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(i, 0, 4, H); } gasto(x, W, H, r, 150, .2); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.moveTo(0, H); x.lineTo(W / 2, H - 30); x.lineTo(W, H); x.closePath(); x.fill(); x.globalCompositeOperation = 'source-over'; }, { lado: 1, r: 1, alfa: .5 });
        const geo = new T.PlaneGeometry(w, h, 6, 1), p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9) * .03); geo.computeVertexNormals(); geo.translate(0, topo - h / 2 - .02, .07);
        const pano = malha(geo, mt); g.add(pano);
        const f = r() * 6; anim.push((dt, t) => { pano.rotation.x = Math.sin(t * .6 + f) * .006; });
        return g;
      },

      /* ================= ateliê ================= */
      // máquina de costura de pedal: pés de ferro, volante girando, agulha subindo e descendo
      a2_maquina_costura2(o) {
        const g = G(), r = rng(o.sem || 73), ferro = m('#141414', { me: .55, r: .4 }), preto = m('#0e0e0e', { r: .25, me: .3 }), ouro = m('#b8963a', { me: .8, r: .3 });
        const fr = [];
        [-1, 1].forEach(s => { const x0 = s * .42; fr.push(ret(.04, .74, .05, x0, 0, -.18), ret(.04, .74, .05, x0, 0, .18), ret(.04, .05, .44, x0, .02, 0), ret(.04, .04, .4, x0, .62, 0), anel(.13, .015, x0, .36, 0, PI * 2, 0, PI / 2)); });
        fr.push(ret(.84, .03, .03, 0, .12, .16));
        g.add(juntar(fr, ferro));
        const ped = bx(g, .5, .03, .28, ferro, 0, .1, .05); ped.rotation.x = .12;
        bx(g, 1.0, .04, .5, m('#5a3a22', { tex: 'madeira_velha', r: .7 }), 0, .74, 0);
        const vol = G(); vol.position.set(.36, .36, -.05); vol.rotation.y = PI / 2; g.add(vol);
        vol.add(malha(new T.TorusGeometry(.2, .018, 6, 24), ferro)); vol.add(juntar([0, 1, 2, 3].map(k => rotG(new T.BoxGeometry(.012, .38, .012), 0, 0, k * PI / 4)), ferro));
        const yb = .78;
        g.add(juntar([ret(.46, .06, .2, -.05, yb, 0), ret(.1, .26, .14, .13, yb + .06, 0), ret(.42, .09, .12, -.03, yb + .3, 0), ret(.09, .2, .11, -.24, yb + .17, 0)], preto));
        const dec = cmat(128, 32, (x, W, H) => { x.fillStyle = '#0e0e0e'; x.fillRect(0, 0, W, H); x.strokeStyle = '#c8a040'; x.lineWidth = 2; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(10 + i * 22, H / 2, 8, 0, PI * 1.5); x.stroke(); } }, { me: .3, r: .3 });
        pl(g, .4, .08, dec, -.03, yb + .345, .061);
        const vm = G(); vm.position.set(.2, yb + .3, 0); g.add(vm); vm.add(malha(tuboEixo(.075, .075, .035, 0, 0, 0, 'x', 18), ouro)); bx(vm, .02, .02, .1, preto, 0, .05, 0);
        const ag = G(); ag.position.set(-.24, yb + .03, .02); g.add(ag); cy(ag, .006, .006, .14, metal('#d8d8d8'), 0, 0, 0, 5);
        cy(g, .022, .022, .05, m('#8a1a1a', { r: .7 }), .04, yb + .39, 0, 10);
        const pele = cmat(128, 96, (x, W, H) => { x.fillStyle = o.tecido || '#c99a86'; x.fillRect(0, 0, W, H); gasto(x, W, H, r, 80, .2); x.strokeStyle = '#3a0a0a'; x.lineWidth = 2; for (let i = 6; i < W - 6; i += 9) { x.beginPath(); x.moveTo(i, H * .48); x.lineTo(i + 5, H * .56); x.stroke(); } }, { r: .6, lado: 1 });
        const tec = pl(g, .5, .36, pele, -.2, yb + .065, .04); tec.rotation.x = -PI / 2; tec.rotation.z = .2;
        g.add(malha(curva([[.36, .56, -.05], [.3, .76, -.02], [.2, yb + .25, 0]], .005, 8, 4), m('#5a3a1a')));
        anim.push((dt, t) => { vol.rotation.z -= dt * 5; vm.rotation.x -= dt * 9; ag.position.y = yb + .03 + Math.abs(Math.sin(t * 9)) * .06; });
        return g;
      },
      // retalhos (pele e pano), linhas grossas e agulhas espalhados (decalque)
      a2_retalhos(o) {
        const g = G(), r = rng(o.sem || 75), w = o.w || 2, d = o.d || 2, n = o.n || 14, cores = o.cores || ['#c99a86', '#b07a68', '#e0bfa8', '#3a2e28', '#6a5040'];
        const base = cmat(128, 128, (x, W, H) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(0,0,0,${r() * .12})`; x.fillRect(r() * W, r() * H, 2, 2); } x.strokeStyle = 'rgba(40,10,10,.75)'; x.lineWidth = 2; x.setLineDash([5, 4]); x.strokeRect(8, 8, W - 16, H - 16); x.setLineDash([]); }, { r: .9, lado: 1 });
        const grupos = cores.map(() => []);
        for (let i = 0; i < n; i++) { const k = Math.floor(r() * cores.length), p = new T.PlaneGeometry(.1 + r() * .25, .08 + r() * .22); p.rotateX(-PI / 2); p.rotateY(r() * PI * 2); p.translate((r() - .5) * w, .004 + i * .0006, (r() - .5) * d); grupos[k].push(p); }
        grupos.forEach((gs, k) => { if (gs.length) { const mt = guardar(base.clone()); mt.color = new T.Color(cores[k]); g.add(juntar(gs, mt)); } });
        const fios = []; for (let i = 0; i < (o.fios ?? 5); i++) { const x0 = (r() - .5) * w, z0 = (r() - .5) * d; fios.push(curva([[x0, .006, z0], [x0 + (r() - .5) * .6, .009, z0 + (r() - .5) * .6], [x0 + (r() - .5) * 1.2, .006, z0 + (r() - .5) * 1.2]], .004, 12, 3)); }
        if (fios.length) g.add(juntar(fios, m(o.linha || '#3a0a0a', { r: .8 })));
        const ag = []; for (let i = 0; i < (o.agulhas ?? 6); i++) ag.push(tuboEixo(.0025, .001, .07, 0, .006, 0, 'x', 4).rotateY(r() * 3).translate((r() - .5) * w, 0, (r() - .5) * d));
        if (ag.length) g.add(juntar(ag, metal('#d0d4d8')));
        return g;
      },
      // painel de carretéis de linha (parede)
      a2_carreteis(o) {
        const g = G(), w = o.w || 1.4, h = o.h || 1.0, y = o.y ?? 1.0, r = rng(o.sem || 77);
        const placa = cmat(256, 192, (x, W, H) => { x.fillStyle = '#8a6a44'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(30,20,10,.6)'; for (let i = 8; i < W; i += 14) for (let j = 8; j < H; j += 14) { x.beginPath(); x.arc(i, j, 2, 0, 7); x.fill(); } gasto(x, W, H, r, 200, .2); }, { r: .85 });
        bx(g, w, h, .03, placa, 0, y, .015);
        const cores = o.cores || ['#8a1a1a', '#e8e0d0', '#1a1a1a', '#c99a86', '#2a3a6a', '#6a1a3a'], grupos = cores.map(() => []), pinos = [];
        const nl = Math.max(2, Math.floor(h / .2)), nc = Math.max(3, Math.floor(w / .11));
        for (let j = 0; j < nl; j++) for (let i = 0; i < nc; i++) { if (r() < .15) continue; const x0 = -w / 2 + .07 + i * (w - .14) / (nc - 1), y0 = y + .1 + j * (h - .2) / (nl - 1); pinos.push(tuboEixo(.004, .004, .1, x0, y0, .08, 'z', 4)); grupos[Math.floor(r() * cores.length)].push(tuboEixo(.028, .028, .07, x0, y0, .09, 'z', 10)); }
        g.add(juntar(pinos, metal('#888'))); grupos.forEach((gs, k) => { if (gs.length) g.add(juntar(gs, m(cores[k], { r: .8 }))); });
        return g;
      },
      // estante de rolos de tecido
      a2_rolos_tecido(o) {
        const g = G(), w = o.w || 1.8, h = o.h || 1.8, d = .5, r = rng(o.sem || 79);
        g.add(juntar([ret(.04, h, d, -w / 2, 0, 0), ret(.04, h, d, w / 2, 0, 0), ret(w, .03, d, 0, .05, 0), ret(w, .03, d, 0, h * .36, 0), ret(w, .03, d, 0, h * .68, 0), ret(w, .03, d, 0, h - .03, 0), ret(w, h, .02, 0, 0, -d / 2)], m('#4a3424', { tex: 'madeira_velha', r: .8 })));
        const cores = o.cores || ['#c99a86', '#8a1a1a', '#2a2622', '#d8d0bc', '#b07a68', '#4a5a3a'], grupos = cores.map(() => []);
        [.08, h * .36 + .03, h * .68 + .03].forEach(yy => { let px = -w / 2 + .05; while (px < w / 2 - .2) { const rr = .06 + r() * .05; grupos[Math.floor(r() * cores.length)].push(tuboEixo(rr, rr, d - .06, px + rr, yy + rr, 0, 'z', 12)); px += rr * 2 + .01; } });
        grupos.forEach((gs, k) => { if (gs.length) g.add(juntar(gs, m(cores[k], { r: .95, tex: 'carpete_velho' }))); });
        return g;
      },

      /* ================= triagem / medição ================= */
      // fila pintada no chão (pés numerados, seta na frente = -z)
      a2_fila_chao(o) {
        const g = G(), L = o.l || 4, w = o.w || .8, n = o.n || 5, r = rng(o.sem || 81), cor = o.c || '#e8c030';
        const mt = cmat(128, 512, (x, W, H) => {
          x.clearRect(0, 0, W, H); x.fillStyle = cor; x.fillRect(4, 40, 7, H - 40); x.fillRect(W - 11, 40, 7, H - 40);
          x.beginPath(); x.moveTo(W / 2, 4); x.lineTo(W - 10, 36); x.lineTo(10, 36); x.closePath(); x.fill();
          for (let i = 0; i < n; i++) { const yy = H - 46 - i * (H - 120) / Math.max(1, n - 1); x.fillStyle = cor; x.fillRect(16, yy + 26, W - 32, 3); [-1, 1].forEach(s => { x.beginPath(); x.ellipse(W / 2 + s * 15, yy, 8, 15, s * .12, 0, 7); x.fill(); }); escrever(x, String(n - i), W / 2, yy + 40, 14, cor, W - 30); }
          escrever(x, o.txt || 'AGUARDE', W / 2, 52, 15, cor, W - 24);
          x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 500; i++) x.fillRect(r() * W, r() * H, 1 + r() * 4, 1 + r() * 3); x.globalCompositeOperation = 'source-over';
        }, { transp: 1, decal: 1, r: .8 });
        g.add(malha(plano(w, L, 0, .008, 0, -PI / 2), mt)); return g;
      },
      // régua de altura na parede (0 a 220 cm) com o esquadro deslizante
      a2_regua_altura(o) {
        const g = G(), h = 2.2, w = o.w || .32, r = rng(o.sem || 83);
        const mt = cmat(64, 512, (x, W, H) => { x.fillStyle = '#ece6d2'; x.fillRect(0, 0, W, H); x.fillStyle = '#1a1612'; for (let cm = 0; cm <= 220; cm += 2) { const yy = H - cm / 220 * H; x.fillRect(0, yy - .5, cm % 10 === 0 ? W * .45 : W * .22, cm % 10 === 0 ? 2 : 1); } x.font = 'bold 12px Arial'; for (let cm = 20; cm < 220; cm += 20) x.fillText(String(cm), W * .5, H - cm / 220 * H + 5); x.fillStyle = '#b81a1a'; x.fillRect(W - 6, 0, 6, H); gasto(x, W, H, r, 100, .2); }, { r: .8 });
        pl(g, w, h, mt, 0, h / 2, .012);
        const y = o.marca ?? 1.72; g.add(juntar([ret(.3, .025, .22, 0, y, .12), ret(.06, .08, .04, 0, y - .03, .03)], m('#d8d4c8', { r: .5 })));
        return g;
      },
      // cadeira de medição: faixas de couro, haste graduada e fita métrica
      a2_cadeira_medicao(o) {
        const g = G(), ferro = m('#3a3e42', { me: .5, r: .45 }), est = m(o.c || '#5a4a3a', { r: .6, tex: 'carpete_velho' }), couro = m('#2a1a10', { r: .7 }), fv = metal('#b8b8b0');
        const fr = []; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => fr.push(ret(.05, .45, .05, a * .24, 0, b * .22)));
        fr.push(ret(.5, .04, .5, 0, .43, 0), ret(.5, .05, .05, 0, 1.68, -.24));
        [-1, 1].forEach(s => fr.push(ret(.05, 1.25, .05, s * .24, .45, -.24), ret(.06, .05, .46, s * .27, .68, 0), ret(.04, .25, .04, s * .27, .45, .2)));
        g.add(juntar(fr, ferro));
        bx(g, .46, .06, .46, est, 0, .45, .01); bx(g, .44, .9, .05, est, 0, .62, -.22);
        const cr = [], fs = [];
        [-1, 1].forEach(s => { cr.push(ret(.09, .015, .08, s * .27, .73, .12), ret(.07, .08, .015, s * .12, .14, .25)); fs.push(ret(.03, .02, .03, s * .27, .735, .12)); });
        cr.push(ret(.5, .07, .015, 0, 1.0, -.19), ret(.5, .06, .015, 0, 1.35, -.19)); fs.push(ret(.04, .04, .02, .2, 1.01, -.18), ret(.04, .04, .02, .2, 1.36, -.18));
        g.add(juntar(cr, couro)); g.add(juntar(fs, fv));
        const regua = cmat(32, 256, (x, W, H) => { x.fillStyle = '#e8e2cc'; x.fillRect(0, 0, W, H); x.fillStyle = '#111'; for (let i = 0; i < H; i += 6) x.fillRect(0, i, i % 30 === 0 ? W * .7 : W * .35, 1.5); });
        bx(g, .04, 1.0, .02, regua, .3, 1.0, -.27); bx(g, .4, .03, .1, fv, .12, 1.78, -.22);
        const fita = cmat(16, 256, (x, W, H) => { x.fillStyle = '#e8c018'; x.fillRect(0, 0, W, H); x.fillStyle = '#111'; for (let i = 0; i < H; i += 8) x.fillRect(0, i, W * .5, 1); }, { lado: 1 });
        const ft = pl(g, .025, .7, fita, -.3, 1.0, .05); ft.rotation.y = PI / 2; ft.rotation.z = .05;
        return g;
      },

      /* ================= central de rádio ================= */
      // transceptor de válvula: dial iluminado, dois VU com ponteiro, botões, fone em cima
      a2_radio_mesa(o) {
        const g = G(), r = rng(o.sem || 87), w = o.w || .78, h = .42, d = .38, ativo = !!o.ativo;
        bx(g, w, h, d, sujo(o.c || '#4a544a', 'metal_sujo', { me: .4, r: .55 }), 0, 0, 0);
        bx(g, w - .04, h - .04, .01, m('#2a2c2a', { r: .6 }), 0, .02, d / 2 + .003);
        const dial = cmat(256, 64, (x, W, H) => { x.fillStyle = '#2a1404'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffcc70'; x.font = '11px monospace'; for (let i = 0; i < 11; i++) { x.fillRect(10 + i * 23, 34, 1.5, i % 2 ? 8 : 14); if (i % 2 === 0) x.fillText(String(530 + i * 100), 2 + i * 23, 24); } x.fillRect(8, 48, W - 16, 1); }, { brilho: 1.1 });
        pl(g, w * .62, .1, dial, -w * .12, h - .1, d / 2 + .01);
        const ag = bx(g, .006, .08, .004, m('#ff2010', { e: '#ff2010', ei: 1 }), -w * .12, h - .14, d / 2 + .013);
        const vu = cmat(64, 48, (x, W, H) => { x.fillStyle = '#f2ead0'; x.fillRect(0, 0, W, H); x.strokeStyle = '#222'; x.lineWidth = 1.5; x.beginPath(); x.arc(W / 2, H * 1.05, H * .8, PI * 1.2, PI * 1.8); x.stroke(); x.strokeStyle = '#c01010'; x.beginPath(); x.arc(W / 2, H * 1.05, H * .8, PI * 1.62, PI * 1.8); x.stroke(); }, { brilho: .5 });
        const pont = [];
        [w * .25, w * .4].forEach(xx => { pl(g, .1, .075, vu, xx, h - .13, d / 2 + .01); const pv = G(); pv.position.set(xx, h - .175, d / 2 + .013); g.add(pv); bx(pv, .003, .06, .002, m('#111'), 0, 0, 0); pont.push([pv, r() * 9]); });
        const kn = []; for (let i = 0; i < 6; i++) kn.push(tuboEixo(.028, .03, .03, -w / 2 + .1 + i * (w - .2) / 5, .12, d / 2 + .02, 'z', 12));
        g.add(juntar(kn, m('#1a1a1a', { r: .4, me: .3 })));
        const sw = []; for (let i = 0; i < 4; i++) sw.push(ret(.012, .04, .012, -w / 2 + .14 + i * .07, .2, d / 2 + .01, .5)); g.add(juntar(sw, metal('#c8ccd0')));
        const lp = sf(g, .015, m('#ffffff', { unico: true, e: ativo ? '#40ff60' : '#ff3020', ei: 1.4 }), w / 2 - .07, h - .07, d / 2 + .01, 8);
        const fone = malha(new T.TorusGeometry(.09, .012, 6, 14, PI), m('#151515', { r: .5 })); fone.position.set(-w * .2, h + .03, 0); fone.rotation.x = -PI / 2; g.add(fone);
        g.add(juntar([cil(.045, .045, .035, -w * .2 - .09, h, 0, 12), cil(.045, .045, .035, -w * .2 + .09, h, 0, 12)], m('#222', { r: .5 })));
        if (P.microfone && o.mic !== false) { const mic = P.microfone({}); mic.position.set(w / 2 + .14, 0, .05); g.add(mic); }
        anim.push((dt, t) => { pont.forEach(([pv, f]) => { pv.rotation.z = .5 - (ativo ? Math.abs(Math.sin(t * 7 + f)) * .8 + Math.random() * .1 : Math.abs(Math.sin(t * .7 + f)) * .15); }); if (ativo) { lp.material.emissiveIntensity = Math.sin(t * 5) > 0 ? 1.8 : .4; ag.position.x = -w * .12 + Math.sin(t * .3) * w * .2; } });
        if (o.luz) luz(g, ativo ? '#80ffa0' : '#ffc070', o.luz, 2.5, 0, h + .2, .3);
        return g;
      },

      /* ================= música ================= */
      // estojo de instrumento (aberto com o instrumento no forro, ou fechado)
      a2_estojo(o) {
        const g = G(), tipo = o.tipo || 'trompete', ab = o.aberto !== false;
        const [L, h, w] = ({ trompete: [.62, .14, .3], sax: [.78, .16, .34], violino: [.8, .12, .28], clarinete: [.62, .1, .2] })[tipo] || [.6, .12, .3];
        const casca = m(o.c || '#1e1e20', { r: .6, tex: 'carpete_velho' }), vel = m(o.forro || '#6a1020', { tex: 'veludo', r: 1 });
        bx(g, L, h * .55, w, casca, 0, 0, 0); bx(g, L - .04, .01, w - .04, vel, 0, h * .55 - .005, 0);
        const tampa = G(); tampa.position.set(0, h * .55, -w / 2); g.add(tampa); bx(tampa, L, h * .45, w, casca, 0, 0, w / 2); bx(tampa, L - .04, .01, w - .04, vel, 0, -.006, w / 2);
        g.add(juntar([ret(.04, .03, .015, -L * .3, h * .3, w / 2 + .005), ret(.04, .03, .015, L * .3, h * .3, w / 2 + .005)], metal('#c8b070')));
        if (ab) {
          tampa.rotation.x = -1.9;
          const lat = m('#c8a040', { me: .85, r: .28 }), inst = [], y0 = h * .55 + .03;
          if (tipo === 'trompete') { inst.push(tuboEixo(.012, .012, .36, -.05, y0, -.04, 'x', 8), tuboEixo(.012, .012, .3, -.02, y0, .05, 'x', 8), anel(.045, .012, .13, y0, 0, PI, PI / 2, 0, -PI / 2, 6, 12), cil(.018, .018, .07, 0, y0 - .02, 0, 8), cil(.018, .018, .07, .045, y0 - .02, 0, 8), cil(.018, .018, .07, -.045, y0 - .02, 0, 8)); const sino = new T.ConeGeometry(.075, .14, 16, 1, true); sino.rotateZ(PI / 2); sino.translate(-.25, y0, -.04); inst.push(sino); }
          else if (tipo === 'sax') { inst.push(curva([[.32, y0, -.06], [.1, y0, -.07], [-.15, y0, -.04], [-.27, y0, .03], [-.18, y0, .1]], .028, 16, 8)); const sino = new T.ConeGeometry(.07, .12, 14, 1, true); sino.rotateZ(-PI / 2); sino.translate(-.12, y0, .1); inst.push(sino); for (let i = 0; i < 6; i++) inst.push(esf(.012, .2 - i * .07, y0 + .025, -.06, 1, .5, 1, 6)); }
          else if (tipo === 'violino') g.add(juntar([esf(.11, -.12, y0, 0, 1.15, .3, 1, 12), esf(.09, .08, y0, 0, 1.1, .3, 1, 12), ret(.24, .02, .05, .3, y0 - .01, 0), esf(.025, .43, y0, 0, 1, 1, 1, 8)], m('#6a2a10', { r: .3, me: .1 })));
          else inst.push(tuboEixo(.014, .02, .5, 0, y0, 0, 'x', 10));
          if (inst.length) g.add(juntar(inst, tipo === 'clarinete' ? m('#111', { r: .3 }) : lat));
        }
        return g;
      },
      a2_metronomo(o) {
        const g = G(); const p = malha(new T.ConeGeometry(.07, .22, 4), m('#3a2414', { r: .5 })); p.rotation.y = PI / 4; p.position.y = .11; g.add(p);
        const br = G(); br.position.set(0, .03, .045); g.add(br); bx(br, .006, .19, .004, metal('#c8b070'), 0, 0, 0); bx(br, .02, .02, .01, metal('#c8b070'), 0, .12, 0);
        const f = rng(o.sem || 91)() * 6; anim.push((dt, t) => { br.rotation.z = Math.sin(t * 3.2 + f) * .5; });
        return g;
      },

      /* ================= sala circular ================= */
      // parede circular dentro da sala quadrada, com vãos nas quatro portas e tampa nos cantos
      a2_parede_circular(o) {
        const g = G(), R = o.raio || 4.5, vao = o.vao || 1.4, h = o.h || ALT - .01, ha = Math.asin(vao / R), ext = o.ext || 4.9;
        const mt = m(o.c || '#4a4a52', { tex: o.tex || 'concreto_sujo', rep: [3, 1], r: .9, lado: 2 });
        for (let q = 0; q < 4; q++) { const a0 = q * PI / 2 + ha, a1 = (q + 1) * PI / 2 - ha, k = Math.max(1, Math.ceil((a1 - a0) / .36)), da = (a1 - a0) / k; for (let i = 0; i < k; i++) g.add(malha(new T.CylinderGeometry(R, R, h, 6, 1, true, a0 + i * da, da).translate(0, h / 2, 0), mt)); }
        const zc = Math.sqrt(R * R - vao * vao);
        for (let q = 0; q < 4; q++) [-1, 1].forEach(s => g.add(malha(new T.BoxGeometry(.12, h, ext - zc + .05).translate(s * (vao + .06), h / 2, (zc + ext) / 2).rotateY(q * PI / 2), mt)));
        const rod = m('#151517', { r: .8, lado: 2 });
        for (let q = 0; q < 4; q++) g.add(malha(new T.CylinderGeometry(R - .01, R - .01, .14, 24, 1, true, q * PI / 2 + ha, PI / 2 - 2 * ha).translate(0, .07, 0), rod));
        if (o.tampa !== false) { const sh = new T.Shape(); sh.moveTo(-ext, -ext); sh.lineTo(ext, -ext); sh.lineTo(ext, ext); sh.lineTo(-ext, ext); sh.lineTo(-ext, -ext); const fu = new T.Path(); fu.absarc(0, 0, R, 0, PI * 2, true); sh.holes.push(fu); const sg = new T.ShapeGeometry(sh, 48); sg.rotateX(PI / 2); sg.translate(0, h, 0); g.add(malha(sg, m(o.cor_tampa || '#1a1a1e', { r: 1, lado: 2 }))); }
        return g;
      },
      a2_aneis_chao(o) {
        const g = G(), R = o.raio || 3.4, n = o.n || 7, r = rng(o.sem || 93);
        const mt = cmat(512, 512, (x, W) => { x.clearRect(0, 0, W, W); for (let k = 1; k <= n; k++) { x.strokeStyle = `rgba(${o.rgb || '200,190,230'},${.08 + .25 * (1 - k / n)})`; x.lineWidth = 2 + (n - k) * .6; x.beginPath(); x.arc(W / 2, W / 2, k / n * W * .48, 0, PI * 2); x.stroke(); } x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 400; i++) x.fillRect(r() * W, r() * W, 2 + r() * 8, 2 + r() * 4); x.globalCompositeOperation = 'source-over'; }, { transp: 1, decal: 1 });
        g.add(malha(plano(2 * R, 2 * R, 0, .008, 0, -PI / 2), mt)); return g;
      },

      /* ================= poço de elevador ================= */
      // borda de um poço vertical: mureta zebrada, buraco escuro com fundo quente, plataforma presa de lado,
      // guarda-corpo arrancado num trecho, viga com polia e cabos arrebentados balançando
      a2_poco_borda(o) {
        const g = G(), R = o.raio || 1.3, hb = .34, e = .28, r = rng(o.sem || 95);
        const fundo = cmat(256, 256, (x, W) => { const gr = x.createRadialGradient(W / 2, W / 2, 4, W / 2, W / 2, W / 2); gr.addColorStop(0, '#000000'); gr.addColorStop(.55, '#070103'); gr.addColorStop(.82, '#2a0806'); gr.addColorStop(1, '#5a1810'); x.fillStyle = gr; x.fillRect(0, 0, W, W); for (let i = 0; i < 40; i++) { const a = r() * PI * 2, dd = W * (.36 + r() * .13); x.fillStyle = `rgba(${120 + Math.floor(r() * 60)},${20 + Math.floor(r() * 20)},${20 + Math.floor(r() * 20)},${.15 + r() * .25})`; x.beginPath(); x.ellipse(W / 2 + Math.cos(a) * dd, W / 2 + Math.sin(a) * dd, 6 + r() * 14, 3 + r() * 8, a, 0, 7); x.fill(); } }, { r: .4 });
        fundo.emissive = new T.Color('#ffffff'); fundo.emissiveMap = fundo.map; fundo.emissiveIntensity = .25;
        g.add(malha(rotG(new T.CircleGeometry(R, 40), -PI / 2).translate(0, .012, 0), fundo));
        g.add(malha(new T.CylinderGeometry(R, R, hb, 40, 1, true).translate(0, hb / 2, 0), m('#3a3430', { tex: 'concreto_sujo', r: .9, lado: 2 })));
        const zb = cmat(512, 64, (x, W, H) => { zebra(x, W, H, 48); gasto(x, W, H, r, 300, .45); }, { r: .7, rep: [6, 1] });
        g.add(malha(new T.CylinderGeometry(R + e, R + e, hb, 40, 1, true).translate(0, hb / 2, 0), zb));
        g.add(malha(rotG(new T.RingGeometry(R, R + e, 40, 1), -PI / 2).translate(0, hb, 0), m('#5a5650', { tex: 'concreto_sujo', r: .9, rep: [4, 1] })));
        const pf = G(); pf.position.set(R * .1, -.06, -R * .1); pf.rotation.set(.12, .5, .38); g.add(pf);
        bx(pf, R * 1.45, .07, R * 1.1, m('#4a4c50', { tex: 'grade_chao', me: .55, r: .5, rep: [2, 2] }), 0, 0, 0);
        bx(pf, R * 1.45, .16, .04, m('#c8a428', { me: .4, r: .5 }), 0, .07, R * .55);
        const grd = G(); grd.rotation.y = r() * PI * 2; g.add(grd);
        const gap = .9, Rg = R + e / 2, amarelo = m('#c8a020', { me: .4, r: .5 }), postes = [];
        for (let i = 0; i < 10; i++) { const t = i * (PI * 2 - gap) / 9; postes.push(cil(.025, .025, .95, Rg * Math.cos(t), hb, Rg * Math.sin(t), 6)); }
        grd.add(juntar(postes, amarelo));
        [.62, 1.2].forEach(yy => { const tg = new T.TorusGeometry(Rg, .022, 6, 48, PI * 2 - gap); tg.rotateX(PI / 2); tg.translate(0, yy, 0); grd.add(malha(tg, amarelo)); });
        const torto = cil(.025, .025, .8, 0, 0, 0, 6); torto.rotateZ(.9); torto.translate(Rg * Math.cos(-.3), hb + .25, Rg * Math.sin(-.3)); grd.add(malha(torto, amarelo));
        g.add(juntar([ret(2 * R + 1.4, .22, .2, 0, ALT - .24, 0), ret(.06, .4, .12, -.12, ALT - .62, 0), ret(.06, .4, .12, .12, ALT - .62, 0)], sujo('#3a3c3e', 'metal_sujo', { me: .5 })));
        const polia = malha(new T.TorusGeometry(.26, .05, 8, 24), m('#2a2a2a', { me: .6, r: .4 })); polia.position.set(0, ALT - .6, 0); polia.rotation.y = PI / 2; g.add(polia);
        const cab = G(); cab.position.set(0, ALT - .86, 0); g.add(cab); const fios = [], pontas = [];
        [[-.08, 1.0], [.05, 1.45], [.12, .75]].forEach(([dx, cmp]) => { const zf = (r() - .5) * .3, xf = dx + (r() - .5) * .3; fios.push(curva([[dx, 0, 0], [dx + (r() - .5) * .1, -cmp * .5, zf * .5], [xf, -cmp, zf]], .018, 12, 5)); for (let k = 0; k < 5; k++) { const c2 = new T.ConeGeometry(.006, .14, 4); c2.rotateZ((r() - .5) * 1.2); c2.rotateX((r() - .5) * 1.2); c2.translate(xf, -cmp - .05, zf); pontas.push(c2); } });
        cab.add(juntar(fios, m('#2a2826', { me: .5, r: .4 }))); cab.add(juntar(pontas, metal('#8a8a84')));
        const Lq = luz(g, '#ff4a20', o.luz ?? .9, 4.5, 0, .25, 0);
        const f = r() * 6; anim.push((dt, t) => { const k = Math.max(0, Math.sin(t * 2.4)) ** 6 + .6 * Math.max(0, Math.sin(t * 2.4 - 1.0)) ** 6; Lq.intensity = (o.luz ?? .9) * (.65 + k * .8); fundo.emissiveIntensity = .2 + k * .25; cab.rotation.z = Math.sin(t * .7 + f) * .05; cab.rotation.x = Math.sin(t * .5 + f) * .04; });
        return g;
      },
      // guincho de cabo (tambor, motor, botoeira pendurada, cabo solto no chão)
      a2_guincho(o) {
        const g = G(), aco = sujo('#4a4a3e', 'ferrugem', { me: .5, r: .5 });
        bx(g, 1.5, .12, .85, m('#1e1e1c', { me: .5, r: .5 }), 0, 0, 0);
        g.add(juntar([ret(.08, .75, .7, -.65, .12, 0), ret(.08, .75, .7, .25, .12, 0)], aco));
        const cabo = cmat(256, 64, (x, W, H) => { x.fillStyle = '#2a2826'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(160,160,150,.6)'; x.lineWidth = 3; for (let i = -H; i < W; i += 7) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H * .4, H); x.stroke(); } }, { me: .5, r: .4, rep: [3, 1] });
        g.add(malha(tuboEixo(.26, .26, .82, -.2, .58, 0, 'x', 20), cabo));
        g.add(juntar([tuboEixo(.36, .36, .04, -.62, .58, 0, 'x', 20), tuboEixo(.36, .36, .04, .22, .58, 0, 'x', 20)], aco));
        bx(g, .42, .5, .5, m(o.c || '#2a4a6a', { tex: 'metal_sujo', me: .4, r: .5 }), .52, .12, 0);
        g.add(malha(tuboEixo(.18, .18, .2, .52, .4, .3, 'z', 14), m('#2a2a2c', { me: .5, r: .4 })));
        g.add(malha(curva([[-.2, .34, .26], [-.1, .1, .6], [.1, .03, 1.0], [-.3, .03, 1.4]], .018, 20, 5), m('#2a2826', { me: .4 })));
        cy(g, .006, .006, .6, metal('#555'), .7, .62, .3, 4); bx(g, .1, .2, .08, m('#e8c018', { r: .5 }), .7, .42, .3);
        return g;
      },

      /* ================= câmara fria ================= */
      // evaporador de parede, alto: ventoinhas girando, geada, pingentes e névoa fria descendo
      a2_evaporador(o) {
        const g = G(), w = o.w || 1.6, y = o.y ?? 2.3, r = rng(o.sem || 99);
        bx(g, w, .55, .48, sujo('#c8ccc8', 'metal_sujo', { me: .35, r: .5 }), 0, y, 0);
        const nf = Math.max(1, Math.round(w / .55)), pas = [];
        for (let i = 0; i < nf; i++) { const x0 = -w / 2 + w / nf * (i + .5); const gr = malha(new T.TorusGeometry(.2, .015, 6, 20), metal('#888')); gr.position.set(x0, y + .27, .25); g.add(gr); const fd = malha(new T.CircleGeometry(.2, 18), m('#151515')); fd.position.set(x0, y + .27, .242); g.add(fd); const p = G(); p.position.set(x0, y + .27, .247); g.add(p); p.add(juntar([0, 1, 2, 3].map(k => rotG(new T.BoxGeometry(.06, .17, .008).translate(0, .09, 0), 0, 0, k * PI / 2)), m('#555', { me: .4 }))); pas.push(p); }
        const gelo = cmat(256, 64, (x, W, H) => { x.clearRect(0, 0, W, H); for (let i = 0; i < 600; i++) { x.fillStyle = `rgba(240,248,255,${.2 + r() * .5})`; x.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 2); } }, { transp: 1 });
        pl(g, w, .55, gelo, 0, y + .275, .245);
        const ic = []; for (let i = 0; i < Math.round(w * 6); i++) { const c2 = new T.ConeGeometry(.012 + r() * .01, .06 + r() * .14, 5); c2.rotateX(PI); c2.translate(-w / 2 + r() * w, y - .06, .2 - r() * .4); ic.push(c2); }
        g.add(juntar(ic, m('#d8ecf8', { op: .75, r: .05, me: .1 })));
        const nev = m('#ffffff', { unico: true, op: .1, r: 1 }); nev.depthWrite = false; const bolas = []; for (let i = 0; i < 5; i++) bolas.push([sf(g, .1, nev, -w / 2 + r() * w, y, .3, 8), r()]);
        anim.push((dt, t) => { pas.forEach(p => { p.rotation.z -= dt * 7; }); bolas.forEach(([b, f]) => { const k = (t * .15 + f) % 1; b.position.y = y - k * .9; b.scale.setScalar(.6 + k * 1.6); }); nev.opacity = .08; });
        return g;
      },
      // geada na parede (decalque, mais densa embaixo)
      a2_gelo(o) {
        const g = G(), w = o.w || 2, h = o.h || 1.5, y = o.y ?? 0, r = rng(o.sem || 101);
        const mt = cmat(256, Math.round(256 * Math.min(2, Math.max(.25, h / w))), (x, W, H) => { x.clearRect(0, 0, W, H); for (let i = 0; i < 1400; i++) { const py = H * Math.pow(r(), .6); x.fillStyle = `rgba(230,242,255,${(.1 + r() * .45) * (py / H)})`; x.fillRect(r() * W, py, 1 + r() * 3, 1 + r() * 3); } x.strokeStyle = 'rgba(240,248,255,.4)'; x.lineWidth = 1; for (let i = 0; i < 40; i++) { let px = r() * W, py = H * (.4 + r() * .6); x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (r() - .5) * 30; py -= r() * 20; x.lineTo(px, py); } x.stroke(); } }, { transp: 1, decal: 1 });
        pl(g, w, h, mt, 0, y + h / 2, .014); return g;
      },

      /* ================= interrogatório ================= */
      // câmera de vigilância no alto da parede, LED piscando (origem na parede)
      a2_camera_canto(o) {
        const g = G(), y = o.y ?? 2.85, mt = m('#d8d8d0', { r: .5 });
        g.add(juntar([ret(.08, .08, .04, 0, y, .02), ret(.03, .03, .25, 0, y + .03, .14)], mt));
        const cam = G(); cam.position.set(0, y + .02, .3); cam.rotation.x = .45; g.add(cam); bx(cam, .1, .09, .24, mt, 0, -.045, 0);
        cam.add(malha(tuboEixo(.03, .03, .03, 0, 0, .13, 'z', 10), m('#111')));
        const led = sf(cam, .008, m('#ffffff', { unico: true, e: '#ff2010', ei: 2 }), .035, .03, .1, 6); anim.push((dt, t) => { led.visible = Math.sin(t * 3) > 0; });
        return g;
      },
    });
  });
})();

/* ===================== 3º andar ===================== */
/* props_a3.js · objetos da "Usina" (3º andar) para as salas em 3D
   Extensão de objetos3d.js / detalhes3d.js. Tudo genérico: o que cada sala tem, e todos os textos,
   vêm do arquivo de cenas. Geometria leve: peças simples juntadas numa malha só, no máximo uma luz por objeto. */
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  NS.extensoes = NS.extensoes || [];
  NS.extensoes.push(F => {
    const { P, m, bx, cy, sf, pl, luz, G, metal, tela, texCanvas, T, rng, anim, textoTex, guardar, ALT } = F;
    const figura = F.figura;
    const PI = Math.PI, TAU = PI * 2;
    const V = (x, y, z) => new T.Vector3(x, y, z);

    /* ---------- ajudantes de geometria ---------- */
    function juntar(geos, mat) {
      let nv = 0; const gs = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); nv += n.attributes.position.count; return n; });
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2); let o = 0;
      gs.forEach(g => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); });
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
      return new T.Mesh(guardar(geo), mat);
    }
    const tf = (g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { g.applyMatrix4(new T.Matrix4().compose(V(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), V(sx, sy, sz))); return g; };
    const ret = (w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => tf(new T.BoxGeometry(w, h, d), x, y + h / 2, z, rx, ry, rz);       // base em y
    const caixa = (w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => tf(new T.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);          // centro em y
    const cil = (r1, r2, h, x = 0, y = 0, z = 0, seg = 12) => tf(new T.CylinderGeometry(r1, r2, h, seg), x, y + h / 2, z);                  // base em y
    const cilC = (r1, r2, h, x = 0, y = 0, z = 0, seg = 12, rx = 0, ry = 0, rz = 0, aberto = false) => tf(new T.CylinderGeometry(r1, r2, h, seg, 1, aberto), x, y, z, rx, ry, rz);
    const esfG = (r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 10) => tf(new T.SphereGeometry(r, seg, Math.max(6, Math.round(seg * .7))), x, y, z, 0, 0, 0, sx, sy, sz);
    const torG = (R, r, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 24, arc = TAU, rs = 6) => tf(new T.TorusGeometry(R, r, rs, seg, arc), x, y, z, rx, ry, rz);
    const tuboG = (pts, r, seg = 20, rs = 6) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => V(...p))), seg, r, rs);
    function barra(a, b, r, seg = 8) {
      const p1 = V(...a), p2 = V(...b), d = p2.clone().sub(p1), L = d.length(); const g = new T.CylinderGeometry(r, r, L, seg);
      g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())));
      const c = p1.add(p2).multiplyScalar(.5); g.translate(c.x, c.y, c.z); return g;
    }
    const mesh = (pai, geo, mat) => { const me = new T.Mesh(guardar(geo), mat); pai.add(me); return me; };
    const add = (pai, me) => { pai.add(me); return me; };
    const canvasMat = (w, h, desenha, o = {}) => {
      const [c, x] = tela(w, h); desenha(x, c.width, c.height); const t = texCanvas(c);
      const mt = m('#ffffff', { unico: true, mapa: t, r: o.r ?? .8, me: o.me ?? 0 });
      if (o.brilho) { mt.emissive = new T.Color('#ffffff'); mt.emissiveMap = t; mt.emissiveIntensity = o.brilho; }
      if (o.transp) { mt.transparent = true; mt.depthWrite = false; }
      if (o.lado) mt.side = T.DoubleSide;
      return mt;
    };
    const sujo = (c, tex = 'metal_sujo', o = {}) => m(c, { tex, r: o.r ?? .7, me: o.me ?? .35, rep: o.rep });
    const emis = (c, ei = 1.2, o = {}) => m('#ffffff', { unico: true, e: c, ei, r: .4, ...o });
    const decal = mt => { mt.transparent = true; mt.depthWrite = false; mt.polygonOffset = true; mt.polygonOffsetFactor = -2; return mt; };
    const chaoPl = (pai, w, d, mt, x = 0, y = .004, z = 0) => { const p = pl(pai, w, d, mt, x, y, z); p.rotation.x = -PI / 2; return p; };
    const carneMat = (c = '#9c4a4f', o = {}) => m(c, { tex: 'carne', rep: o.rep || [2, 2], r: o.r ?? .38, me: .05, e: o.e || '#2a0507', ei: o.ei ?? .3, lado: o.lado });
    const listras = (W, H) => canvasMat(W, H, (x, w, h) => { x.fillStyle = '#d8b018'; x.fillRect(0, 0, w, h); x.fillStyle = '#141210'; for (let i = -h; i < w + h; i += h * 1.2) { x.beginPath(); x.moveTo(i, h); x.lineTo(i + h * .6, h); x.lineTo(i + h * 1.2, 0); x.lineTo(i + h * .6, 0); x.fill(); } x.fillStyle = 'rgba(40,25,10,.35)'; for (let i = 0; i < 300; i++) x.fillRect(Math.random() * w, Math.random() * h, 3, 3); }, { r: .7 });
    // mostrador redondo (manômetro): faixa verde-amarelo-vermelho e ponteiro
    function mostradorTex(rotulo, cor = '#f2eee2') {
      const [c, x] = tela(128, 128); x.fillStyle = cor; x.beginPath(); x.arc(64, 64, 62, 0, TAU); x.fill();
      x.lineWidth = 12; [['#2e9a3e', .75, 1.25], ['#d8b018', 1.25, 1.75], ['#c0221a', 1.75, 2.25]].forEach(([k, a, b]) => { x.strokeStyle = k; x.beginPath(); x.arc(64, 64, 46, a * PI, b * PI); x.stroke(); });
      x.strokeStyle = '#222'; x.lineWidth = 2; for (let i = 0; i <= 10; i++) { const a = (.75 + i * .15) * PI; x.beginPath(); x.moveTo(64 + Math.cos(a) * 36, 64 + Math.sin(a) * 36); x.lineTo(64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54); x.stroke(); }
      if (rotulo) { x.fillStyle = '#222'; x.font = 'bold 14px Arial'; x.textAlign = 'center'; x.fillText(rotulo, 64, 100); }
      x.strokeStyle = '#111'; x.lineWidth = 5; x.beginPath(); x.arc(64, 64, 61, 0, TAU); x.stroke();
      return texCanvas(c);
    }
    // um mostrador completo (aro + face + ponteiro), voltado para +z; devolve o ponteiro (para animar)
    function mostrador(pai, r, x, y, z, rotulo, ang = .6) {
      const aro = mesh(pai, cilC(r + .015, r + .015, .04, x, y, z - .01, 18, PI / 2), metal('#3a3a3a'));
      const face = pl(pai, r * 2, r * 2, m('#ffffff', { unico: true, mapa: mostradorTex(rotulo), r: .5 }), x, y, z + .012);
      face.material.transparent = true;
      const pt = G(); pt.position.set(x, y, z + .02); pai.add(pt);
      bx(pt, .012, r * .85, .006, m('#b01010'), 0, 0, 0); pt.rotation.z = -ang; return pt;
    }

    /* ================= ILUMINAÇÃO ================= */
    // luminária industrial pendurada (cúpula e grade); a luz "respira" devagar
    P.a3_lampada_respira = o => {
      const g = G(), y = o.y ?? 2.45, cor = o.c || '#ffd890', base = o.i ?? 1.1, per = o.periodo || 6, f = rng(o.sem || 3)() * 6;
      const preto = m('#1c1a18', { me: .5, r: .5 });
      if (o.tubo) {   // a mesma luminária de tubo do 1º andar, mas respirando
        const lw = o.w || 1.3; bx(g, lw, .05, .22, m('#d8d4c8', { r: .6 }), 0, ALT - .08, 0);
        const tb = bx(g, lw - .1, .03, .14, m('#ffffff', { unico: true, e: cor, ei: 1.6 }), 0, ALT - .11, 0);
        const L2 = luz(g, cor, base, o.d || 10, 0, ALT - .35, 0);
        anim.push((dt, t) => { const k = .4 + .6 * (.5 + .5 * Math.sin(t * TAU / per + f)); L2.intensity = base * k; tb.material.emissiveIntensity = .3 + 1.5 * k; });
        return g;
      }
      g.add(juntar([cil(.006, .006, ALT - y - .16, 0, y + .16, 0, 4), cil(.035, .035, .06, 0, y + .12, 0, 8)], preto));
      mesh(g, new T.CylinderGeometry(.05, .26, .17, 16, 1, true).translate(0, y + .04, 0), m('#3a3a2e', { me: .55, r: .45, lado: 2 }));
      g.add(juntar([torG(.09, .006, 0, y - .1, 0, PI / 2, 0, 0, 14), torG(.06, .006, 0, y - .19, 0, PI / 2, 0, 0, 12), ...[0, 1, 2, 3].map(i => barra([Math.cos(i * PI / 2) * .09, y - .1, Math.sin(i * PI / 2) * .09], [Math.cos(i * PI / 2) * .06, y - .19, Math.sin(i * PI / 2) * .06], .005, 4))], metal('#2a2a28')));
      const lb = sf(g, .06, m('#ffffff', { unico: true, e: cor, ei: 2 }), 0, y - .1, 0, 12);
      const L = luz(g, cor, base, o.d || 9, 0, y - .3, 0);
      anim.push((dt, t) => { const k = .45 + .55 * (.5 + .5 * Math.sin(t * TAU / per + f)); L.intensity = base * k; lb.material.emissiveIntensity = .4 + 1.8 * k; });
      return g;
    };

    // boca de um poço no teto (de onde se desce para esta sala) e a marca de pouso no chão
    P.a3_poco_teto = o => {
      const g = G(), R = o.raio || 1.0, r = rng(o.sem || 2);
      const buraco = mesh(g, new T.CircleGeometry(R, 32), m('#020202', { r: 1 })); buraco.rotation.x = PI / 2; buraco.position.y = ALT - .006;
      g.add(juntar([torG(R + .06, .07, 0, ALT - .05, 0, PI / 2, 0, 0, 32), ...[0, 1, 2, 3, 4, 5].map(i => ret(.12, .14, .12, Math.cos(i * PI / 3) * (R + .12), ALT - .14, Math.sin(i * PI / 3) * (R + .12)))], sujo('#3a3632', 'ferrugem', { me: .6 })));
      g.add(juntar([0, 1, 2].map(i => tuboG([[Math.cos(i * 2.1) * R * .6, ALT + .2, Math.sin(i * 2.1) * R * .6], [Math.cos(i * 2.1) * R * .5 + .1, ALT - .5, Math.sin(i * 2.1) * R * .5], [Math.cos(i * 2.1) * R * .4 + (r() - .5) * .2, 2.05, Math.sin(i * 2.1) * R * .4]], .018, 10, 5)), metal('#4a4a48')));
      const anel = canvasMat(256, 256, (x, W) => { x.clearRect(0, 0, W, W); x.save(); x.beginPath(); x.arc(W / 2, W / 2, W / 2 - 4, 0, TAU); x.arc(W / 2, W / 2, W / 2 - 30, 0, TAU, true); x.clip(); for (let i = -W; i < W * 2; i += 28) { x.fillStyle = (i / 28) % 2 ? '#141210' : '#c8a020'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 14, 0); x.lineTo(i + 14 - W, W); x.lineTo(i - W, W); x.fill(); } x.restore(); x.fillStyle = 'rgba(30,26,20,.35)'; for (let i = 0; i < 400; i++) x.fillRect(r() * W, r() * W, 3, 3); }, { r: .7 });
      chaoPl(g, (R + .3) * 2, (R + .3) * 2, decal(anel), 0, .006, 0);
      mesh(g, ret(R * 1.3, .03, R * 1.3, 0, 0, 0, 0, .3, 0), sujo('#4a4a46', 'metal_sujo', { me: .6 }));
      return g;
    };

    /* ================= CASA DE FORÇA ================= */
    // gerador gigante (do tamanho de um ônibus): motor, alternador, radiador, escapamentos até o teto
    P.a3_gerador = o => {
      const g = G(), L = o.l || 4.2, W = o.w || 1.8, H = o.h || 2.2, r = rng(o.sem || 5);
      const corpo = G(); g.add(corpo);
      const casco = m(o.c || '#4e5a3c', { tex: 'metal_sujo', me: .45, r: .55, rep: [3, 2] });
      const escuro = sujo('#1e2022'), ferr = m('#6a2e1e', { tex: 'ferrugem', me: .5, r: .55 });
      g.add(juntar([ret(L + .3, .16, W + .2, 0, 0, 0), ret(.14, .12, W + .34, -L / 2 + .25, .02, 0), ret(.14, .12, W + .34, L / 2 - .25, .02, 0)], escuro));
      const xa = -L / 2 + .1, xm0 = xa + .8, xr = L / 2 - Math.min(1.0, L * .24), Ra = Math.min(.78, (H - .4) / 2);
      const geosC = [ret(xr - xm0, H - .6, W - .12, (xm0 + xr) / 2, .16, 0)];
      for (let x = xm0 + .25; x < xr - .1; x += .32) [-1, 1].forEach(s => geosC.push(ret(.05, H - .85, .05, x, .3, s * (W / 2 - .04))));
      geosC.push(cilC(Ra, Ra, .78, xa + .39, .16 + Ra + .02, 0, 22, 0, 0, PI / 2));
      for (let k = 0; k < 6; k++) geosC.push(cilC(Ra + .04, Ra + .04, .04, xa + .06 + k * .13, .16 + Ra + .02, 0, 22, 0, 0, PI / 2));
      corpo.add(juntar(geosC, casco));
      const topo = [];
      for (let k = 0; k < 5; k++) [-1, 1].forEach(s => topo.push(ret(.3, .2, .42, xm0 + .4 + k * (xr - xm0 - .8) / 4, H - .44, s * .3)));
      topo.push(cilC(.24, .24, (xr - xm0) * .7, (xm0 + xr) / 2, H + .02, -W * .18, 16, 0, 0, PI / 2));
      corpo.add(juntar(topo, ferr));
      // radiador com grade
      corpo.add(juntar([ret(L / 2 - .05 - xr, H - .3, W, (L / 2 - .05 + xr) / 2, .16, 0)], escuro));
      const grade = canvasMat(256, 256, (x, w, h) => { x.fillStyle = '#0c0c0c'; x.fillRect(0, 0, w, h); for (let i = 6; i < h; i += 10) { x.fillStyle = '#3a3c3a'; x.fillRect(8, i, w - 16, 5); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(8, i, w - 16, 1); } x.strokeStyle = '#2a2a2a'; x.lineWidth = 10; x.strokeRect(4, 4, w - 8, h - 8); for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(110,52,18,.4)'; x.fillRect(Math.random() * w, Math.random() * h * .4, 3, 40 + Math.random() * 120); } }, { r: .6, me: .4 });
      const gl = pl(corpo, W - .16, H - .5, grade, L / 2 - .045, .16 + (H - .3) / 2, 0); gl.rotation.y = PI / 2;
      pl(corpo, L / 2 - .05 - xr - .12, H - .5, grade, (L / 2 - .05 + xr) / 2, .16 + (H - .3) / 2, W / 2 + .003);
      // escapamentos até o teto
      const esc = [];
      [-.25, .05].forEach(f => { const x = (xm0 + xr) / 2 + f * L; esc.push(cil(.12, .12, ALT - H - .02, x, H + .02, -W * .18, 12), cil(.16, .16, .1, x, H + .3, -W * .18, 12), cil(.16, .16, .1, x, ALT - .3, -W * .18, 12)); });
      g.add(juntar(esc, m('#3a3430', { tex: 'ferrugem', me: .5, r: .5 })));
      // painel do gerador (mostradores e lâmpada de estado)
      const pn = G(); pn.position.set(xm0 + .55, 0, W / 2 - .06); corpo.add(pn);
      bx(pn, .8, .7, .1, sujo('#2a2c2c'), 0, .75, .05);
      mostrador(pn, .09, -.22, 1.22, .11, 'RPM', .2 + r()); mostrador(pn, .09, .02, 1.22, .11, 'V', .5 + r()); mostrador(pn, .09, .26, 1.22, .11, '°C', 1.1 + r() * .6);
      const lamp = sf(pn, .035, m('#ffffff', { unico: true, e: o.coracao ? '#ff3020' : '#40ff60', ei: 1.8 }), -.25, .92, .12, 10);
      for (let i = 0; i < 4; i++) cy(pn, .022, .022, .04, m(['#c0221a', '#222', '#d8b018', '#222'][i]), -.05 + i * .1, .9, .1, 10).rotation.x = PI / 2;
      if (o.txt) pl(corpo, .9, .22, m('#ffffff', { unico: true, mapa: textoTex(o.txt, { w: 512, h: 120, cor: '#141210', fundo: '#d8cfb0', tam: 64, fonte: 'Impact, Arial Black, sans-serif' }), r: .8 }), (xm0 + xr) / 2 + .3, H - 1.0, W / 2 + .005);
      const fx = pl(g, L + .3, .14, listras(512, 32), 0, .08, W / 2 + .101);
      // cabos e óleo no chão
      const cab = P.cabos_chao({ n: 5, w: 1.2, d: 1.6, sem: o.sem, c: '#111' }); cab.position.set(xm0 + .2, 0, W / 2 + .9); g.add(cab);
      const oleo = canvasMat(256, 256, (x, w, h) => { x.clearRect(0, 0, w, h); for (let i = 0; i < 8; i++) { const cx = 60 + Math.random() * 136, cyy = 60 + Math.random() * 136, rr = 30 + Math.random() * 60; const gr = x.createRadialGradient(cx, cyy, 0, cx, cyy, rr); gr.addColorStop(0, 'rgba(8,6,4,.85)'); gr.addColorStop(1, 'rgba(8,6,4,0)'); x.fillStyle = gr; x.beginPath(); x.arc(cx, cyy, rr, 0, TAU); x.fill(); } }, { r: .15, me: .3 });
      chaoPl(g, 1.8, 1.4, decal(oleo), r() * L * .5 - L * .25, .005, W / 2 + .3);
      if (o.coracao) {
        anim.push((dt, t) => { const k = Math.max(0, Math.sin(t * 5.2)) ** 8 + .6 * Math.max(0, Math.sin(t * 5.2 - 1.1)) ** 8; corpo.scale.set(1 + k * .012, 1 + k * .02, 1 + k * .03); lamp.material.emissiveIntensity = .6 + k * 2.4; });
      } else {
        const f = r() * 9; anim.push((dt, t) => { corpo.position.y = Math.sin(t * 47 + f) * .004; corpo.position.x = Math.sin(t * 31 + f) * .002; lamp.material.emissiveIntensity = Math.sin(t * 3 + f) > -.2 ? 1.8 : .3; });
      }
      return g;
    };

    // mesa de controle: tampo de mostradores e chaves, telas no espelho e (opcional) o botão vermelho com tampa de acrílico
    P.a3_mesa_controle = o => {
      const g = G(), w = o.w || 2.2, d = .8, r = rng(o.sem || 7), mt = sujo(o.c || '#4a4a44', 'metal_sujo', { rep: [2, 1] });
      g.add(juntar([ret(w, .8, d - .12, 0, 0, .02), ret(w + .04, .05, d, 0, .8, 0), ret(w, .62, .2, 0, .85, -d / 2 + .1), ret(w - .1, .08, d - .3, 0, 0, .1)], mt));
      const tampo = canvasMat(512, 160, (x, W, H) => {
        x.fillStyle = '#26282a'; x.fillRect(0, 0, W, H);
        for (let i = 0; i < 9; i++) { const cx = 30 + i * 56, cyy = 46; x.fillStyle = '#e8e2cc'; x.beginPath(); x.arc(cx, cyy, 20, 0, TAU); x.fill(); x.strokeStyle = '#c0221a'; x.lineWidth = 4; x.beginPath(); x.arc(cx, cyy, 15, 1.7 * PI, 2.2 * PI); x.stroke(); x.strokeStyle = '#111'; x.lineWidth = 2; const a = PI * (1 + r()); x.beginPath(); x.moveTo(cx, cyy); x.lineTo(cx + Math.cos(a) * 16, cyy + Math.sin(a) * 16); x.stroke(); }
        for (let i = 0; i < 22; i++) { const cx = 16 + i * 22; x.fillStyle = '#111'; x.fillRect(cx, 92, 10, 22); x.fillStyle = '#bbb'; x.fillRect(cx + 2, r() < .5 ? 94 : 104, 6, 8); x.fillStyle = ['#ff3020', '#30ff60', '#ffd020', '#222'][Math.floor(r() * 4)]; x.beginPath(); x.arc(cx + 5, 128, 4, 0, TAU); x.fill(); }
        x.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 0; i < 40; i++) { x.beginPath(); x.arc(r() * W, r() * H, 3 + r() * 14, 0, TAU); x.fill(); }
      }, { r: .6, brilho: .25 });
      chaoPl(g, w - .06, d - .25, tampo, 0, .853, .1);
      const telas = canvasMat(512, 128, (x, W, H) => { x.fillStyle = '#080604'; x.fillRect(0, 0, W, H); const n = Math.max(2, Math.round(w / .55)); for (let i = 0; i < n; i++) { const x0 = i * W / n + 6, ww = W / n - 12; x.fillStyle = '#100c04'; x.fillRect(x0, 8, ww, H - 16); x.strokeStyle = o.cor || '#ffb040'; x.globalAlpha = .9; x.beginPath(); x.moveTo(x0 + 4, H / 2); for (let k = 0; k < 24; k++) x.lineTo(x0 + 4 + k * ww / 24, H / 2 + Math.sin(k * .9 + i) * 20 * r()); x.stroke(); x.fillStyle = o.cor || '#ffb040'; for (let k = 0; k < 4; k++) x.fillRect(x0 + 6, 14 + k * 8, 20 + r() * (ww - 30), 3); x.globalAlpha = 1; } x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < H; i += 3) x.fillRect(0, i, W, 1); }, { brilho: 1.1 });
      pl(g, w - .1, .34, telas, 0, 1.07, -d / 2 + .205);
      for (let i = 0; i < 3; i++) { const a = barra([-w / 2 + .2 + i * .1, .85, .22], [-w / 2 + .2 + i * .1, 1.05, .3 - i * .04], .012, 6); mesh(g, a, metal('#999')); sf(g, .03, m(['#c0221a', '#111', '#111'][i]), -w / 2 + .2 + i * .1, 1.06, .3 - i * .04, 8); }
      if (o.botao) {
        const xb = o.bx ?? w * .22;
        cy(g, .12, .12, .03, metal('#2a2a2a'), xb, .85, .12, 16);
        const bt = cy(g, .07, .07, .05, m('#ffffff', { unico: true, e: '#ff1a1a', ei: 1.4, r: .3 }), xb, .88, .12, 18);
        const tampa = G(); tampa.position.set(xb, .88, .0); g.add(tampa);
        bx(tampa, .26, .13, .26, m('#e8f6ff', { unico: true, op: .22, r: .02 }), 0, 0, .12);
        cy(tampa, .012, .012, .26, metal('#aaa'), 0, .0, 0, 6).rotation.z = PI / 2; tampa.rotation.x = -.08;
        const et = pl(g, .62, .1, m('#ffffff', { unico: true, mapa: textoTex(o.txt || '', { w: 512, h: 84, cor: '#111', fundo: '#f1c40f', tam: 40 }) }), xb, .858, .36); et.rotation.x = -PI / 2;
        pl(g, Math.min(1.1, w * .5), .15, m('#ffffff', { unico: true, mapa: textoTex(o.txt || '', { w: 512, h: 72, cor: '#111', fundo: '#f1c40f', tam: 36 }) }), xb * .2, 1.36, -d / 2 + .206);
        anim.push((dt, t) => { bt.material.emissiveIntensity = 1 + .6 * Math.sin(t * 2); });
      }
      return g;
    };

    /* ================= ESTEIRA ================= */
    // esteira que desce de uma calha no teto e entra numa boca na parede (+x), levando sacos
    P.a3_esteira = o => {
      const g = G(), L = o.l || 5.6, hb = o.hb || .95, inc = o.inc || 1.8, r = rng(o.sem || 11);
      const x0 = -L / 2, x1 = x0 + inc, yT = ALT - .62, a = Math.atan2(yT - hb, inc), Li = Math.hypot(inc, yT - hb), Lf = L / 2 - .02 - x1;
      const mt = sujo('#3a3c3e', 'metal_sujo', { rep: [3, 1] }), am = m('#b89418', { tex: 'metal_sujo', r: .6, me: .3 });
      const cinta = m('#161616', { unico: true, tex: 'chao_sujo', rep: [6, 1], r: .9 });
      // trecho reto
      const xc = (x1 + L / 2) / 2;
      const geos = [ret(Lf, .1, .78, xc, hb - .28, 0), ret(Lf, .18, .05, xc, hb - .12, .43), ret(Lf, .18, .05, xc, hb - .12, -.43)];
      for (let x = x1 + .3; x < L / 2 - .2; x += 1.1) [-1, 1].forEach(s => { geos.push(ret(.07, hb - .28, .07, x, 0, s * .36), ret(.16, .02, .16, x, 0, s * .36)); });
      g.add(juntar(geos, mt));
      mesh(g, ret(Lf, .04, .8, xc, hb - .05, 0), cinta);
      g.add(juntar([ret(Lf, .03, .055, xc, hb + .06, .43), ret(Lf, .03, .055, xc, hb + .06, -.43)], am));
      // trecho inclinado (pendurado no teto)
      const gi = G(); gi.position.set((x0 + x1) / 2, (yT + hb) / 2, 0); gi.rotation.z = -a; g.add(gi);
      gi.add(juntar([ret(Li, .1, .78, 0, -.28, 0), ret(Li, .18, .05, 0, -.12, .43), ret(Li, .18, .05, 0, -.12, -.43)], mt));
      mesh(gi, ret(Li, .04, .8, 0, -.05, 0), cinta);
      g.add(juntar([0, .55].map(f => { const x = x0 + .3 + f * inc, y = yT - Math.tan(a) * (x - x0) - .3; return [cil(.012, .012, ALT - y, x, y, .38, 4), cil(.012, .012, ALT - y, x, y, -.38, 4)]; }).flat(), metal('#555')));
      // calha (funil) no teto
      g.add(juntar([tf(new T.CylinderGeometry(.62, .4, .5, 4, 1, true), x0 + .1, ALT - .28, 0, 0, PI / 4, 0), ret(.95, .12, .95, x0 + .1, ALT - .12, 0)], m('#4a4a40', { tex: 'ferrugem', me: .5, r: .5, lado: 2 })));
      for (let i = 0; i < 6; i++) { const ab = pl(g, .12, .3, m('#121212', { r: .9, lado: 2 }), x0 + .1 - .3 + i * .12, ALT - .68, 0); ab.rotation.y = PI / 2; }
      // sacos
      const S = Li + Lf, sacos = [], cores = ['#141413', '#1a1a17', '#201d19', '#121211', '#2a221c'];
      const n = o.n || 7;
      for (let i = 0; i < n; i++) {
        const sc = .5 + r() * .7, s = new T.Mesh(guardar(new T.SphereGeometry(.26, 10, 8)), m(cores[i % cores.length], { r: .55, me: .05 }));
        s.scale.set(1.3 * sc, .62 * sc, .95 * sc); s.rotation.y = r() * 3; g.add(s); sacos.push([s, i * S / n, sc]);
      }
      const vel = o.v ?? .42;
      anim.push(dt => {
        cinta.map.offset.x -= dt * vel * .9;
        sacos.forEach(q => { q[1] += dt * vel; if (q[1] > S) q[1] = 0; const [s, d, sc] = q; let x, y;
          if (d < Li) { x = x0 + Math.cos(a) * d; y = yT - Math.sin(a) * d; s.rotation.z = -a; } else { x = x1 + (d - Li); y = hb; s.rotation.z = 0; }
          s.position.set(x, y + .14 * sc, 0); const k = Math.min(1, Math.max(0, (L / 2 - x) / .35), d / .25); s.scale.set(1.3 * sc * k, .62 * sc * Math.max(k, .01), .95 * sc * k); });
      });
      // a boca na parede
      if (o.boca !== false) {
        const bm = G(); bm.position.set(L / 2 - .01, hb + .28, 0); bm.rotation.y = -PI / 2; g.add(bm);
        const carne = carneMat('#6a2a2c', { ei: .25 }), gengiva = carneMat('#6a1e22', { ei: .4 });
        const fundo = new T.Mesh(guardar(new T.CircleGeometry(1, 28)), carneMat('#5a2224', { ei: .2 })); fundo.scale.set(1.15, .95, 1); fundo.position.z = .005; bm.add(fundo);
        const goela = new T.Mesh(guardar(new T.CircleGeometry(1, 24)), m('#050000', { r: 1 })); goela.scale.set(.6, .42, 1); goela.position.z = .03; bm.add(goela);
        const labios = G(); labios.position.z = .04; bm.add(labios);
        const lab = new T.Mesh(guardar(new T.TorusGeometry(1, .17, 10, 28)), carne); lab.scale.set(.66, .5, .45); labios.add(lab);
        const dentes = []; for (let i = 0; i < 11; i++) { const an = (i / 11) * TAU + .15, rr = .55 + r() * .05; dentes.push(tf(new T.ConeGeometry(.035, .11 + r() * .05, 6), Math.cos(an) * rr * .9, Math.sin(an) * rr * .66, .05, 0, 0, an + PI / 2)); }
        labios.add(juntar(dentes, m('#c8b890', { r: .5 })));
        labios.add(juntar([torG(.48, .06, 0, 0, .02, 0, 0, 0, 24)].map(q => tf(q, 0, 0, 0, 0, 0, 0, 1.2, .78, 1)), gengiva));
        const es = P.sangue({ estilo: 'escorrido', w: .7, h: .9, sem: o.sem }); es.position.set(0, -hb - .28 + .02, .0); bm.add(es);
        const baba = P.sangue({ estilo: 'escorrido', w: .5, h: .5, y: hb - .2, sem: (o.sem || 3) + 4 }); baba.position.set(.1, -hb - .28, .01); bm.add(baba);
        anim.push((dt, t) => { const k = Math.sin(t * 1.1) * .5 + .5; labios.scale.set(1 + k * .04, 1 - .1 + k * .14, 1); goela.scale.set(.6 + k * .05, .36 + k * .12, 1); });
      }
      return g;
    };

    /* ================= INCINERADOR ================= */
    P.a3_incinerador = o => {
      const g = G(), W = o.w || 2.6, H = o.h || 2.1, D = o.d || 1.7, ow = .95, oh = .85, oy = .42, r = rng(o.sem || 13);
      const tij = m('#6a3424', { tex: 'tijolo', rep: [3, 2], r: .9 }), ferro = sujo('#2a2624', 'metal_sujo', { me: .5 });
      const side = (W - ow) / 2;
      g.add(juntar([ret(side, H, D, -(ow / 2 + side / 2), 0, 0), ret(side, H, D, ow / 2 + side / 2, 0, 0), ret(ow, H - oy - oh, D, 0, oy + oh, 0), ret(ow, oy, D, 0, 0, 0), ret(ow, oh, .3, 0, oy, -D / 2 + .15),
        ret(.95, ALT - H, .95, 0, H, -D / 2 + .48), ret(W + .1, .12, D + .1, 0, H - .06, 0)], tij));
      g.add(juntar([ret(ow + .16, .1, .08, 0, oy + oh, D / 2 + .02), ret(.08, oh + .08, .08, -ow / 2 - .04, oy - .02, D / 2 + .02), ret(.08, oh + .08, .08, ow / 2 + .04, oy - .02, D / 2 + .02), ret(ow + .16, .06, .1, 0, oy - .06, D / 2 + .02),
        ret(.5, .34, .06, 0, ALT - .62, .0), cilC(.06, .06, .1, -.32, oy + oh / 2, D / 2 + .07, 8, PI / 2)], ferro));
      // boca da chaminé (de onde a cinza sai) e fuligem
      const boca = pl(g, .42, .26, m('#050302'), 0, ALT - .45, -D / 2 + .955 + .001);
      const fuligem = canvasMat(128, 256, (x, w, h) => { x.clearRect(0, 0, w, h); const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.beginPath(); x.moveTo(w * .2, 0); x.lineTo(w * .8, 0); x.lineTo(w, h); x.lineTo(0, h); x.fill(); }, { transp: true });
      decal(fuligem); pl(g, ow + .3, 1.0, fuligem, 0, oy + oh + .55, D / 2 + .004).rotation.z = PI;
      pl(g, .7, 1.2, fuligem, 0, ALT - 1.2, -D / 2 + .956).rotation.z = PI;
      // fogo branco lá dentro
      const fogo = emis('#eef6ff', 2.2), brasas = emis('#ffe8c8', 1.2);
      pl(g, ow - .08, oh - .1, fogo, 0, oy + oh / 2, -D / 2 + .31);
      mesh(g, ret(ow - .1, .06, D - .5, 0, oy, 0), brasas);
      const chamas = []; for (let i = 0; i < 5; i++) { const c = new T.Mesh(guardar(new T.ConeGeometry(.09 + r() * .06, .45 + r() * .25, 7)), m('#ffffff', { unico: true, e: '#f4faff', ei: 2.6, op: .75 })); c.position.set(-.3 + i * .15, oy + .3, -.15 + r() * .4); g.add(c); chamas.push([c, r() * 9]); }
      // porta de ferro aberta
      const pv = G(); pv.position.set(-ow / 2 - .04, oy, D / 2 + .06); pv.rotation.y = -1.95; g.add(pv);
      const pg = [ret(ow + .06, oh + .04, .07, (ow + .06) / 2, -.02, 0)]; for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) pg.push(esfG(.018, .12 + i * .25, .1 + k * .22, .04, 1, 1, 1, 6));
      pv.add(juntar(pg, ferro)); bx(pv, .06, .04, .12, metal('#777'), ow - .05, oh / 2, .06);
      // termômetro e atiçador
      mostrador(g, .11, ow / 2 + side / 2, 1.45, D / 2 + .02, '°C', 2.2);
      g.add(juntar([barra([W / 2 + .05, 0, D / 2 - .1], [W / 2 + .02, 1.35, D / 2 - .3], .015), barra([W / 2 + .15, 0, D / 2 - .25], [W / 2 + .03, 1.25, D / 2 - .45], .015), ret(.3, .04, .1, W / 2 + .05, 0, D / 2 - .1, 0, .3, 0)], metal('#3a3a3a')));
      // monte de cinza na frente da porta
      const cinza = m('#3a3834', { r: 1 }); mesh(g, tf(new T.SphereGeometry(.6, 12, 6, 0, TAU, 0, PI / 2), 0, 0, D / 2 + .45, 0, 0, 0, 1.2, .18, .7), cinza);
      // cinzas caindo da chaminé
      const N = o.n || 70, pos = new Float32Array(N * 3), ps = [];
      for (let i = 0; i < N; i++) ps.push({ k: r(), tx: (r() - .5) * 3.4, tz: D / 2 + .6 + r() * 3.2, v: .08 + r() * .08, f: r() * 9 });
      const geo = guardar(new T.BufferGeometry()); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      const pts = new T.Points(geo, guardar(new T.PointsMaterial({ color: '#a8a296', size: .035, transparent: true, opacity: .85, depthWrite: false }))); g.add(pts);
      const sx = 0, sy = ALT - .45, sz = -D / 2 + 1.0;
      anim.push((dt, t) => { ps.forEach((p, i) => { p.k += dt * p.v; if (p.k > 1) p.k = 0; const k = p.k; pos[i * 3] = sx + p.tx * Math.sqrt(k) + Math.sin(t * 1.3 + p.f) * .12 * k; pos[i * 3 + 1] = Math.max(.01, sy - sy * k * k + Math.sin(k * 6) * .05); pos[i * 3 + 2] = sz + (p.tz - sz) * Math.sqrt(k); }); geo.attributes.position.needsUpdate = true; });
      const Lz = luz(g, '#e8f2ff', o.i ?? 1.6, 6, 0, oy + .5, D / 2 + .7);
      anim.push((dt, t) => { const k = .8 + .2 * Math.sin(t * 9 + Math.sin(t * 17)); Lz.intensity = (o.i ?? 1.6) * k; fogo.emissiveIntensity = 2.2 * k; chamas.forEach(([c, f]) => { c.scale.set(1, .75 + .35 * Math.abs(Math.sin(t * 7 + f)), 1); }); });
      geo.boundingSphere = new T.Sphere(V(0, 1.5, 2), 4);
      return g;
    };

    /* ================= DECALQUES DE CHÃO ================= */
    // estilo: cinzas_corpos (silhuetas de gente deitada feitas de cinza) | gelo | oleo | fuligem
    P.a3_chao = o => {
      const g = G(), w = o.w || 3, d = o.d || 2, r = rng(o.sem || 17), est = o.estilo || 'oleo';
      const S = 512, H = Math.round(S * d / w);
      const mt = canvasMat(S, Math.min(512, H), (x, W, Hh) => {
        x.clearRect(0, 0, W, Hh);
        const nuvem = (cx, cyy, rr, cor, a, n) => { for (let i = 0; i < n; i++) { const an = r() * TAU, dd = Math.sqrt(r()) * rr; x.fillStyle = `rgba(${cor},${a * r()})`; x.fillRect(cx + Math.cos(an) * dd, cyy + Math.sin(an) * dd, 2 + r() * 2, 2 + r() * 2); } };
        if (est === 'cinzas_corpos') {
          for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(150,145,135,${.15 * r()})`; x.fillRect(r() * W, r() * Hh, 2, 2); }
          const n = o.n || 4;
          for (let k = 0; k < n; k++) {
            const cx = W * (.15 + .7 * (k + .5) / n) + (r() - .5) * 30, cyy = Hh * (.3 + r() * .4), an = (r() - .5) * 1.2 + (r() < .3 ? PI / 2 : 0), es = (Hh / d) * .9 / 100;
            x.save(); x.translate(cx, cyy); x.rotate(an); x.scale(es, es);
            const corpo = (px, py, rx, ry, rot = 0) => { for (let i = 0; i < 260; i++) { const a2 = r() * TAU, dd = Math.sqrt(r()); const qx = Math.cos(a2) * rx * dd, qy = Math.sin(a2) * ry * dd; x.fillStyle = `rgba(${110 + r() * 40},${106 + r() * 36},${98 + r() * 30},${.22 + r() * .4})`; x.fillRect(px + qx * Math.cos(rot) - qy * Math.sin(rot), py + qx * Math.sin(rot) + qy * Math.cos(rot), 2.5, 2.5); } };
            corpo(0, -72, 11, 13); corpo(0, -30, 19, 30); corpo(0, 15, 16, 16);
            corpo(-9, 55, 7, 32, .05); corpo(9, 55, 7, 32, -.05); corpo(-27, -22, 6, 26, .25 + r() * .3); corpo(27, -22, 6, 26, -.25 - r() * .3);
            x.restore();
          }
        } else if (est === 'gelo') {
          const gr = x.createRadialGradient(W / 2, Hh / 2, 10, W / 2, Hh / 2, Math.max(W, Hh) / 2); gr.addColorStop(0, 'rgba(220,240,255,.55)'); gr.addColorStop(.7, 'rgba(200,230,255,.25)'); gr.addColorStop(1, 'rgba(200,230,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, Hh);
          x.strokeStyle = 'rgba(240,250,255,.5)'; for (let i = 0; i < 60; i++) { let px = W / 2 + (r() - .5) * W * .8, py = Hh / 2 + (r() - .5) * Hh * .8; x.lineWidth = .8 + r(); x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - .5) * 40; py += (r() - .5) * 40; x.lineTo(px, py); } x.stroke(); }
          for (let i = 0; i < 20; i++) nuvem(W / 2 + (r() - .5) * W * .7, Hh / 2 + (r() - .5) * Hh * .7, 30, '235,245,255', .5, 120);
        } else {
          const cor = est === 'fuligem' ? '12,10,8' : est === 'sangue_oleo' ? '40,4,4' : '8,6,4';
          for (let i = 0; i < 9; i++) { const cx = W * (.2 + r() * .6), cyy = Hh * (.2 + r() * .6), rr = 40 + r() * 90; const gr = x.createRadialGradient(cx, cyy, 0, cx, cyy, rr); gr.addColorStop(0, `rgba(${cor},.85)`); gr.addColorStop(1, `rgba(${cor},0)`); x.fillStyle = gr; x.beginPath(); x.ellipse(cx, cyy, rr, rr * (.5 + r() * .5), r() * 3, 0, TAU); x.fill(); }
        }
      }, { r: est === 'gelo' ? .2 : .6, me: est === 'oleo' ? .3 : 0 });
      chaoPl(g, w, d, decal(mt), 0, o.y ?? .006, 0);
      return g;
    };

    /* ================= TUBULAÇÃO ================= */
    // cano grosso ao longo de x: flanges com parafusos, pendurado no teto ou apoiado em berços; emenda vazando (vaza = x da emenda)
    P.a3_tubo = o => {
      const g = G(), L = o.l || 9.8, R = o.raio || .5, y = o.y ?? (R + .3), r = rng(o.sem || 19);
      const mat = m(o.c || '#6d3a2a', { tex: 'ferrugem', me: .5, r: .45, rep: [Math.max(1, Math.round(L / 2)), 1] });
      const cano = mesh(g, new T.CylinderGeometry(R, R, L, 22), mat); cano.rotation.z = PI / 2; cano.position.y = y;
      const fl = [], sup = [];
      for (let x = -L / 2 + .7; x < L / 2 - .3; x += 1.8) {
        fl.push(cilC(R + .07, R + .07, .14, x, y, 0, 22, 0, 0, PI / 2));
        for (let k = 0; k < 10; k++) { const an = k / 10 * TAU; fl.push(cilC(.025, .025, .2, x, y + Math.sin(an) * (R + .035), Math.cos(an) * (R + .035), 6, 0, 0, PI / 2)); }
      }
      for (let x = -L / 2 + 1.2; x < L / 2 - .4; x += 2.4) {
        if (o.suporte === 'chao') { sup.push(ret(.3, Math.max(.05, y - R * .55), R * 1.5, x, 0, 0), ret(.5, .06, R * 1.8, x, 0, 0)); }
        else { sup.push(tf(new T.TorusGeometry(R + .04, .03, 6, 16, PI), x, y, 0, 0, PI / 2, PI)); [-1, 1].forEach(s => sup.push(cil(.018, .018, ALT - y, x, y, s * (R + .04), 5))); sup.push(ret(.12, .04, R * 2.4, x, ALT - .04, 0)); }
      }
      g.add(juntar(fl, sujo('#3a3632', 'metal_sujo', { me: .6 })));
      if (sup.length) g.add(juntar(sup, o.suporte === 'chao' ? m('#5a564e', { tex: 'concreto_sujo', r: .9 }) : metal('#4a4a48')));
      if (o.vaza !== undefined) {
        const xv = o.vaza, liq = m('#3a0404', { unico: true, r: .12, me: .1, e: '#1a0000', ei: .4 });
        const mancha = canvasMat(128, 256, (x, w, h) => { x.clearRect(0, 0, w, h); for (let i = 0; i < 10; i++) { const px = w * .3 + r() * w * .4, ww = 4 + r() * 12; const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(70,4,4,.9)'); gr.addColorStop(1, 'rgba(70,4,4,0)'); x.fillStyle = gr; x.fillRect(px, 0, ww, h * (.4 + r() * .6)); } }, { transp: true, r: .2 });
        decal(mancha); const mp = pl(g, .5, R * 1.6, mancha, xv + .1, y - R * .2, R + .015); mp.rotation.z = PI;
        const fios = [], gotas = [];
        for (let i = 0; i < 3; i++) { const fx = xv + .05 + (i - 1) * .1; const f = mesh(g, new T.CylinderGeometry(.012, .006, 1, 6), liq); f.position.set(fx, y - R - .2, R * .2); fios.push([f, r() * 9]); const gt = mesh(g, new T.SphereGeometry(.03, 8, 6), liq); gt.position.set(fx, 0, R * .2); gotas.push([gt, r(), fx]); }
        anim.push((dt, t) => { fios.forEach(([f, ph]) => { const k = .15 + .35 * (.5 + .5 * Math.sin(t * .8 + ph)); f.scale.y = k; f.position.y = y - R - k / 2; }); gotas.forEach(q => { q[1] += dt * .55; if (q[1] > 1) q[1] = 0; const yy = y - R - .1; q[0].position.y = yy - yy * q[1] * q[1]; q[0].scale.set(1, 1 + q[1] * .8, 1); }); });
        if (o.vapor) { const v = P.vapor_sobe({ y: y + R * .8, sem: o.sem }); v.position.set(xv, 0, 0); g.add(v); }
      }
      if (o.pulsa !== false) { const f = r() * 6; anim.push((dt, t) => { const k = 1 + Math.max(0, Math.sin(t * 2.6 + f)) ** 6 * .035; cano.scale.set(k, 1, k); }); }
      return g;
    };

    /* ================= VÁLVULAS ================= */
    // conjunto de válvula encostado na parede (frente em +z): coluna de cano, corpo da válvula e volante
    // tipo: ferro | osso (com tendões e coágulos); centelhas; vibra; txt (plaqueta)
    P.a3_valvula = o => {
      const g = G(), R = o.raio || .36, y = o.y ?? 1.25, osso = o.tipo === 'osso', r = rng(o.sem || 23);
      const canoM = m(o.c || (osso ? '#5a3430' : '#5a4a3a'), { tex: 'ferrugem', me: .55, r: .45 });
      const est = G(); g.add(est);
      const lc = o.lc ?? 2.6;
      est.add(juntar([cil(.26, .26, ALT, 0, 0, .3, 18), cil(.34, .34, .1, 0, 0, .3, 18), cil(.32, .32, .1, 0, .55, .3, 18), cil(.32, .32, .1, 0, 2.55, .3, 18), cil(.32, .32, .08, 0, ALT - .08, .3, 18),
        cilC(.18, .18, lc, 0, .55, .2, 14, 0, 0, PI / 2), cilC(.22, .22, .08, -lc / 2 + .1, .55, .2, 14, 0, 0, PI / 2), cilC(.22, .22, .08, lc / 2 - .1, .55, .2, 14, 0, 0, PI / 2),
        esfG(.36, 0, y, .38, 1, 1, .9, 16), cilC(.12, .14, .35, 0, y, .72, 12, PI / 2), cilC(.16, .16, .06, 0, y, .56, 14, PI / 2)], canoM));
      // parafusos das flanges
      const pf = []; [.6, 2.6].forEach(yy => { for (let k = 0; k < 8; k++) { const an = k / 8 * TAU; pf.push(cil(.022, .022, .06, Math.cos(an) * .3, yy + .02, .3 + Math.sin(an) * .3, 6)); } });
      est.add(juntar(pf, metal('#2a2a2a')));
      // volante
      const vol = G(); vol.position.set(0, y, .95); g.add(vol);
      const haste = mesh(g, cilC(.035, .035, .3, 0, y, .82, 8, PI / 2), metal('#777'));
      if (!osso) {
        const ferro = m('#5a2e1a', { tex: 'ferrugem', me: .7, r: .4 });
        vol.add(juntar([torG(R, .045, 0, 0, 0, 0, 0, 0, 32, TAU, 8), cilC(.08, .08, .1, 0, 0, 0, 12, PI / 2), ...[0, 1, 2, 3, 4, 5].map(i => barra([0, 0, 0], [Math.cos(i * PI / 3) * R, Math.sin(i * PI / 3) * R, 0], .022, 6)),
          ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => esfG(.035, Math.cos(i * PI / 6) * R, Math.sin(i * PI / 6) * R, 0, 1, 1, 1, 6))], ferro));
      } else {
        const ossoM = m('#ddd0b0', { r: .55 }), tendao = carneMat('#8a2a28', { ei: .35, r: .3 }), coag = m('#2a0204', { r: .12, me: .15, e: '#120000', ei: .3 });
        const gs = [torG(R, .05, 0, 0, 0, 0, 0, 0, 28, TAU, 8)];
        for (let i = 0; i < 10; i++) { const an = i / 10 * TAU; gs.push(esfG(.065, Math.cos(an) * R, Math.sin(an) * R, 0, 1.3, 1, 1, 8)); }
        for (let i = 0; i < 5; i++) { const an = i / 5 * TAU + .3, p = [Math.cos(an) * R * .95, Math.sin(an) * R * .95, 0]; gs.push(barra([0, 0, 0], p, .03, 7), esfG(.05, p[0] * .5, p[1] * .5, 0, 1.4, 1, 1, 7)); }
        gs.push(esfG(.11, 0, 0, 0, 1, 1, .7, 12));
        vol.add(juntar(gs, ossoM));
        const td = []; for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + r() * .4, p = [Math.cos(an) * R, Math.sin(an) * R, 0]; td.push(tuboG([p, [p[0] * .7, p[1] * .7 - .1, -.25], [p[0] * .35, p[1] * .35 - .2 + r() * .1, -.5], [(r() - .5) * .3, (r() - .5) * .3, -.62]], .022 + r() * .015, 12, 6)); }
        vol.add(juntar(td, tendao));
        const cg = []; for (let i = 0; i < 26; i++) { const an = r() * TAU, d = r() < .5 ? r() * .14 : R * (.85 + r() * .25); cg.push(esfG(.03 + r() * .05, Math.cos(an) * d, Math.sin(an) * d, (r() - .3) * .1, 1, .8 + r() * .5, .8, 7)); }
        for (let i = 0; i < 14; i++) cg.push(esfG(.04 + r() * .05, (r() - .5) * .5, y - .2 - r() * 1.0 - y, -.55 + r() * .2, 1, 1.6, .7, 7));
        vol.add(juntar(cg, coag));
        const es = P.sangue({ estilo: 'escorrido', w: .6, h: 1.0, y: .1, sem: o.sem }); es.position.set(0, 0, .57); g.add(es);
      }
      // manômetro e plaqueta
      const pt = mostrador(est, .14, 0, y + .62, .58, o.mostrador || '', o.ang ?? 2.0);
      bx(est, .06, .26, .06, canoM, 0, y + .35, .5);
      if (o.txt) pl(est, .6, .14, m('#ffffff', { unico: true, mapa: textoTex(o.txt, { w: 512, h: 120, cor: '#1a1612', fundo: '#c8b98a', tam: 54, fonte: 'Impact, Arial Black, sans-serif' }), r: .7, me: .2 }), 0, y - .62, .565);
      if (o.centelhas) { const c = P.centelhas({ sem: o.sem, raio: .45 }); c.position.set(.25, 2.05, .5); g.add(c); }
      const f = r() * 9;
      anim.push((dt, t) => { pt.rotation.z = -(o.ang ?? 2.0) + Math.sin(t * 23 + f) * (o.vibra ? .05 : .01); if (o.vibra) { est.position.x = Math.sin(t * 53 + f) * .006; vol.position.x = est.position.x; haste.position.x = est.position.x; } });
      return g;
    };

    // cano gigante cortado por cima, com líquido até a altura do peito e a válvula lá dentro (ao longo de x)
    P.a3_cano_aberto = o => {
      const g = G(), L = o.l || 3.6, R = o.raio || 1.15, yc = R + .14, ab = o.abertura || L * .55, xo = o.xo ?? 0, r = rng(o.sem || 29);
      const mt = m(o.c || '#5a3020', { tex: 'ferrugem', me: .5, r: .5, lado: 2, rep: [2, 2] }), meia = 55 * PI / 180;
      const seg = (x0, x1, aberto) => { const len = x1 - x0; if (len <= .01) return null; return aberto ? tf(new T.CylinderGeometry(R, R, len, 26, 1, true, PI / 2 + meia, TAU - 2 * meia), (x0 + x1) / 2, yc, 0, 0, 0, PI / 2) : tf(new T.CylinderGeometry(R, R, len, 26, 1, true), (x0 + x1) / 2, yc, 0, 0, 0, PI / 2); };
      const a0 = xo - ab / 2, a1 = xo + ab / 2;
      [seg(-L / 2, a0, false), seg(a0, a1, true), seg(a1, L / 2, false)].forEach(q => { if (q) mesh(g, q, mt); });
      const tampa = mesh(g, new T.CircleGeometry(R, 26), mt); tampa.position.set(L / 2, yc, 0); tampa.rotation.y = PI / 2;
      const aco = sujo('#3a2e26', 'ferrugem', { me: .6 }), fl = [];
      [-L / 2 + .2, a0, a1, L / 2 - .02].forEach(x => { fl.push(cilC(R + .08, R + .08, .16, x, yc, 0, 26, 0, 0, PI / 2)); for (let k = 0; k < 12; k++) { const an = k / 12 * TAU; fl.push(cilC(.03, .03, .22, x, yc + Math.sin(an) * (R + .04), Math.cos(an) * (R + .04), 6, 0, 0, PI / 2)); } });
      [1, -1].forEach(s => fl.push(caixa(ab, .07, .1, xo, yc + R * Math.cos(meia), s * R * Math.sin(meia))));
      for (let x = -L / 2 + .7; x < L / 2; x += 1.4) fl.push(ret(.4, .5, R * 1.7, x, 0, 0));
      g.add(juntar(fl, aco));
      // líquido
      const ys = o.nivel ?? 1.5, hw = Math.sqrt(Math.max(.01, R * R - (ys - yc) ** 2)) - .02;
      const liq = m(o.liq || '#4a0606', { unico: true, tex: 'agua', rep: [2, 1], r: .08, me: .2, e: '#200000', ei: .5, op: .95 });
      const sup = pl(g, L - .3, hw * 2, liq, -.1, ys, 0); sup.rotation.x = -PI / 2;
      anim.push((dt, t) => { liq.map.offset.x += dt * .03; sup.position.y = ys + Math.sin(t * .7) * .015; });
      // a válvula lá dentro (volante deitado, meio submerso)
      const vx = xo + ab * .25, vol = m('#3a2a20', { me: .7, r: .4 });
      g.add(juntar([cil(.05, .05, ys - .1, vx, .1, 0, 8), torG(.3, .035, vx, ys - .03, 0, PI / 2, 0, 0, 24), ...[0, 1, 2, 3].map(i => barra([vx, ys - .03, 0], [vx + Math.cos(i * PI / 2) * .3, ys - .03, Math.sin(i * PI / 2) * .3], .02, 6)), cilC(.07, .07, .08, vx, ys - .02, 0, 10)], vol));
      // escada encostada na borda, do lado +z
      const zb = R * Math.sin(meia) + .05, yb = yc + R * Math.cos(meia);
      const esc = [barra([xo - .25, 0, zb + .7], [xo - .25, yb + .3, zb - .05], .025), barra([xo + .25, 0, zb + .7], [xo + .25, yb + .3, zb - .05], .025)];
      for (let k = 1; k < 7; k++) { const f = k / 7, z = zb + .7 - .75 * f, yy = (yb + .3) * f; esc.push(barra([xo - .25, yy, z], [xo + .25, yy, z], .018)); }
      g.add(juntar(esc, metal('#6a6a64')));
      return g;
    };

    /* ================= TANQUES ================= */
    // tanque criogênico: vidro, líquido gelado, gelo, mangueiras até o teto e um corpo de olhos abertos
    P.a3_tanque_frio = o => {
      const g = G(), R = o.raio || .6, h = o.h || 2.3, r = rng(o.sem || 31), liqC = o.liq || '#7fd0ff';
      const aco = sujo('#8a9298', 'metal_sujo', { me: .6, r: .45 });
      const gs = [cil(R + .14, R + .17, .34, 0, 0, 0, 22), cil(R + .14, R + .14, .26, 0, h + .34, 0, 22), esfG(R + .1, 0, h + .6, 0, 1, .32, 1, 20), cil(.05, .05, h, R + .1, .34, -R * .3, 8)];
      for (let k = 0; k < 10; k++) { const an = k / 10 * TAU; gs.push(cil(.02, .02, .05, Math.cos(an) * (R + .1), .34, Math.sin(an) * (R + .1), 6), cil(.02, .02, .05, Math.cos(an) * (R + .1), h + .3, Math.sin(an) * (R + .1), 6)); }
      g.add(juntar(gs, aco));
      cy(g, R - .02, R - .02, h - .06, m(liqC, { op: .5, r: .08, e: liqC, ei: .35 }), 0, .37, 0, 20);
      cy(g, R, R, h, m('#d6f0ff', { op: .16, r: .02, me: .2 }), 0, .34, 0, 20);
      const geada = canvasMat(256, 256, (x, w, hh) => { x.clearRect(0, 0, w, hh); const gr = x.createLinearGradient(0, hh, 0, 0); gr.addColorStop(0, 'rgba(235,248,255,.85)'); gr.addColorStop(.45, 'rgba(235,248,255,.35)'); gr.addColorStop(1, 'rgba(235,248,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, hh); x.strokeStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 70; i++) { let px = r() * w, py = hh - r() * hh * .7; x.lineWidth = .6 + r(); x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (r() - .5) * 26; py -= r() * 18; x.lineTo(px, py); } x.stroke(); } }, { transp: true, r: .3, lado: true });
      cy(g, R + .008, R + .008, h * .6, geada, 0, .34, 0, 20);
      if (o.txt) pl(g, .5, .13, m('#ffffff', { unico: true, mapa: textoTex(o.txt, { w: 512, h: 132, cor: '#101418', fundo: '#d8dcd8', tam: 60, fonte: 'Courier New, monospace' }), r: .6 }), 0, .17, R + .175);
      // mangueiras até o teto
      [-1, 1].forEach(s => mesh(g, tuboG([[s * R * .4, h + .55, -R * .2], [s * R * .7, h + .85, -R * .5], [s * R * .9, ALT - .05, -R - .2]], .045, 14, 6), m('#1a1c1e', { r: .6 })));
      // o corpo
      if (o.corpo !== false) {
        const k = (o.alt || 1.6) / 1.72;
        const f = figura({ pose: 'em_pe', c: o.roupa || '#7a7a70', pele: o.pele || '#a8b4b8', h: o.alt || 1.6, cab: 'normal', cabelo: o.cabelo || '#3a3028', bracos: 'baixo', sem: o.sem });
        const branco = m('#f2f0e8', { r: .3 }), iris = m('#1a2a30', { r: .2 });
        [-1, 1].forEach(s => { sf(f, .024 * k, branco, s * .045 * k, 1.79 * k, .1 * k, 8); sf(f, .012 * k, iris, s * .045 * k, 1.79 * k, .12 * k, 6); });
        f.position.y = .4; f.rotation.y = (r() - .5) * .6; g.add(f);
        const ph = r() * 6; anim.push((dt, t) => { f.position.y = .42 + Math.sin(t * .45 + ph) * .035; f.rotation.z = Math.sin(t * .3 + ph) * .02; });
      }
      // bolhas
      const bol = []; for (let i = 0; i < 5; i++) { const b = sf(g, .02 + r() * .02, m('#e8f8ff', { op: .6, r: .1 }), (r() - .5) * R, .4, (r() - .5) * R, 6); bol.push([b, r()]); }
      anim.push(dt => bol.forEach(q => { q[1] += dt * .12; if (q[1] > 1) q[1] = 0; q[0].position.y = .4 + q[1] * (h - .1); }));
      const v = P.vapor_sobe({ y: .3, sem: o.sem }); v.position.set(0, 0, R + .25); g.add(v);
      if (o.luz) luz(g, liqC, .55, 3.2, 0, 1.3, R + .4);
      return g;
    };

    // a Matriz: tanque de vidro do tamanho de uma sala, líquido turvo, corpos e máquinas sendo fundidos
    P.a3_matriz = o => {
      const g = G(), w = o.w || 5.6, d = o.d || 3.0, h = o.h || 2.5, r = rng(o.sem || 37), y0 = .35;
      const aco = sujo('#3a3e40', 'metal_sujo', { me: .6, rep: [3, 1] });
      const fr = [ret(w + .3, y0, d + .3, 0, 0, 0), ret(w + .3, .14, .18, 0, y0 + h, d / 2 + .06), ret(w + .3, .14, .18, 0, y0 + h, -d / 2 - .06), ret(.18, .14, d + .3, w / 2 + .06, y0 + h, 0), ret(.18, .14, d + .3, -w / 2 - .06, y0 + h, 0)];
      [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]].forEach(([a, b]) => fr.push(ret(.14, h, .14, a * (w / 2 + .05), y0, b * (d / 2 + .05))));
      for (let k = 0; k < 16; k++) { const s = k % 2 ? 1 : -1; fr.push(cil(.025, .025, .05, -w / 2 + .2 + Math.floor(k / 2) * (w - .4) / 7, y0 - .04, s * (d / 2 + .16), 6)); }
      g.add(juntar(fr, aco));
      const vid = m('#cfe8e0', { op: .14, r: .02, me: .2 });
      [[w, d / 2, 0], [w, -d / 2, 0], [d, w / 2, 1], [d, -w / 2, 1]].forEach(([ww, p, lado]) => { const q = pl(g, ww, h, vid, lado ? p : 0, y0 + h / 2, lado ? 0 : p); if (lado) q.rotation.y = PI / 2; });
      const liqM = m(o.liq || '#5a6450', { unico: true, op: .62, r: .1, e: '#1a2414', ei: .5 });
      const liq = mesh(g, ret(w - .08, h - .3, d - .08, 0, y0 + .02, 0), liqM);
      const sup = pl(g, w - .08, d - .08, m('#4a5440', { unico: true, tex: 'agua', rep: [3, 2], op: .8, r: .05, me: .2 }), 0, y0 + h - .28, 0); sup.rotation.x = -PI / 2;
      // corpos e máquinas
      const pele = ['#b8a090', '#a89080', '#c0a898'], cabo = m('#151515', { r: .5 }), cobre = m('#b8733a', { me: .8, r: .35 }), placa = canvasMat(128, 128, (x, W, H) => { x.fillStyle = '#0e4a22'; x.fillRect(0, 0, W, H); x.strokeStyle = '#d8b040'; x.lineWidth = 2; for (let i = 0; i < 18; i++) { x.beginPath(); let px = r() * W, py = r() * H; x.moveTo(px, py); for (let k = 0; k < 4; k++) { if (r() < .5) px += (r() - .5) * 60; else py += (r() - .5) * 60; x.lineTo(px, py); } x.stroke(); } x.fillStyle = '#111'; for (let i = 0; i < 6; i++) x.fillRect(r() * W, r() * H, 14, 10); }, { r: .4, me: .3, brilho: .2 });
      const ns = o.n || 4, corpos = [];
      for (let i = 0; i < ns; i++) {
        const f = figura({ pose: i % 3 === 1 ? 'deitado' : 'em_pe', c: pele[i % 3], pele: pele[i % 3], cab: i % 2 ? 'costurada' : 'normal', cabelo: false, bracos: i % 2 ? 'frente' : 'cima', h: 1.55, sem: (o.sem || 1) + i });
        const px = -w / 2 + .9 + i * (w - 1.8) / Math.max(1, ns - 1), pz = (r() - .5) * (d - 1.2);
        f.position.set(px, y0 + .1 + r() * .3, pz); f.rotation.set((r() - .5) * .5, r() * TAU, (r() - .5) * .6); g.add(f); corpos.push([f, r() * 6, f.position.y]);
        // dedos de cabo, placas de circuito na pele, cabos subindo
        const pc = []; for (let k = 0; k < 5; k++) pc.push(tuboG([[0, 1.2, .2], [(k - 2) * .05, 1.0 - k * .03, .45], [(k - 2) * .1, .75 + r() * .2, .55 + r() * .2]], .012, 8, 5));
        f.add(juntar(pc, cobre));
        for (let k = 0; k < 3; k++) { const pq = mesh(f, new T.BoxGeometry(.16 + r() * .08, .12 + r() * .08, .012), placa); pq.position.set((r() - .5) * .25, 1.05 + r() * .4, .14); pq.rotation.set(0, 0, (r() - .5) * .6); }
        mesh(g, tuboG([[px, y0 + 1.4, pz], [px + (r() - .5) * .6, y0 + h - .2, pz + (r() - .5) * .4], [px + (r() - .5) * .8, ALT, pz]], .03, 12, 6), cabo);
      }
      // bloco de máquina com membros
      const maq = G(); maq.position.set(w * .18, y0 + .05, -d * .12); maq.rotation.y = .4; g.add(maq);
      maq.add(juntar([ret(.9, .7, .6, 0, 0, 0), cilC(.22, .22, .5, .55, .35, 0, 14, 0, 0, PI / 2), ret(.3, .3, .3, -.2, .7, .1)], sujo('#4a4e50', 'metal_sujo', { me: .6 })));
      maq.add(juntar([barra([.2, .5, .3], [.5, .9, .7], .055, 8), esfG(.06, .5, .9, .7), barra([.5, .9, .7], [.75, .6, .9], .045, 8), barra([-.3, .3, .3], [-.6, .1, .7], .06, 8), esfG(.1, 0, .72, .2, 1.4, .8, 1)], m('#b09484', { r: .45 })));
      // braços mecânicos pendurados
      for (let i = 0; i < 2; i++) { const x = (i ? 1 : -1) * w * .22; g.add(juntar([cil(.06, .06, ALT - y0 - h + .3, x, y0 + h - .1, 0, 8), barra([x, y0 + h - .1, 0], [x + .3, y0 + h - .8, .25], .05), esfG(.08, x + .3, y0 + h - .8, .25), barra([x + .3, y0 + h - .8, .25], [x + .1, y0 + h - 1.5, .3], .04), ret(.16, .1, .06, x + .1, y0 + h - 1.62, .3)], metal('#7a8086'))); }
      // bolhas
      const bol = []; for (let i = 0; i < 12; i++) { const b = sf(g, .02 + r() * .03, m('#e0ece0', { op: .5, r: .1 }), (r() - .5) * (w - .4), y0, (r() - .5) * (d - .4), 6); bol.push([b, r(), .05 + r() * .1]); }
      anim.push((dt, t) => { bol.forEach(q => { q[1] += dt * q[2]; if (q[1] > 1) q[1] = 0; q[0].position.y = y0 + .05 + q[1] * (h - .4); }); corpos.forEach(([f, ph, yb]) => { f.position.y = yb + Math.sin(t * .35 + ph) * .05; }); liqM.emissiveIntensity = .45 + .1 * Math.sin(t * .8); });
      // canos no pé
      g.add(juntar([cilC(.1, .1, 1.4, -w / 2 - .5, .18, d * .25, 10, 0, 0, PI / 2), cilC(.1, .1, 1.4, -w / 2 - .5, .18, -d * .25, 10, 0, 0, PI / 2)], m('#4a3a30', { tex: 'ferrugem', me: .5 })));
      luz(g, o.cor || '#9ad890', .9, 6, 0, y0 + h * .6, d / 2 + .6);
      return g;
    };

    /* ================= O NÓ ================= */
    // massa de carne do tamanho de um carro, cheia de olhos de cavalo, com fios de cobre entrando como veias
    P.a3_massa_olhos = o => {
      const g = G(), w = o.w || 4.0, d = o.d || 2.0, h = o.h || 1.45, r = rng(o.sem || 41), A = w / 2, C = d / 2, b0 = .12;
      const massa = G(); g.add(massa);
      const geo = new T.SphereGeometry(1, 44, 30), ps = geo.attributes.position;
      const ruido = (x, y, z) => 1 + .09 * Math.sin(x * 4.1 + z * 2.3) + .06 * Math.sin(y * 6.2 - x * 3.1) + .05 * Math.sin(z * 7.7 + y * 2.9);
      for (let i = 0; i < ps.count; i++) { const x = ps.getX(i), y = ps.getY(i), z = ps.getZ(i), f = ruido(x, y, z); ps.setXYZ(i, x * A * f, y >= 0 ? b0 + y * h * f : b0 + y * b0, z * C * f); }
      geo.computeVertexNormals();
      mesh(massa, geo, carneMat(o.c || '#8a3a3e', { rep: [4, 2], ei: .3, r: .32 }));
      const n = o.olhos || 30, soq = [], glob = [], bri = [], piscam = [];
      const sombra = m('#4a1a1c', { r: .5 }), olhoM = m('#0e0806', { r: .06, me: .35 }), brilhoM = m('#ffffff', { e: '#ffffff', ei: 1.2 });
      for (let i = 0; i < n; i++) {
        const th = (i / n) * TAU * 3.1 + r() * .6, ph = .12 + (i % 5) * .23 + r() * .1; if (ph > 1.35) continue;
        const ux = Math.cos(ph) * Math.cos(th), uy = Math.sin(ph), uz = Math.cos(ph) * Math.sin(th), f = ruido(ux, uy, uz);
        const p = V(ux * A * f, b0 + uy * h * f, uz * C * f), nn = V(p.x / (A * A), (p.y - b0) / (h * h), p.z / (C * C)).normalize();
        const q = new T.Quaternion().setFromUnitVectors(V(0, 0, 1), nn), M = (gg, s1, s2, s3, dz) => { gg.applyMatrix4(new T.Matrix4().compose(p.clone().addScaledVector(nn, dz), q, V(s1, s2, s3))); return gg; };
        const sc = .8 + r() * .5;
        soq.push(M(new T.SphereGeometry(.15, 12, 8), 1.55 * sc, .95 * sc, .45 * sc, .0));
        if (piscam.length < 6 && i % 4 === 0) { const me = new T.Mesh(guardar(new T.SphereGeometry(.12, 14, 10)), olhoM); me.position.copy(p).addScaledVector(nn, .03); me.quaternion.copy(q); me.scale.set(1.35 * sc, .82 * sc, .7 * sc); massa.add(me); piscam.push([me, r() * 20, .82 * sc]); }
        else glob.push(M(new T.SphereGeometry(.12, 14, 10), 1.35 * sc, .82 * sc, .7 * sc, .03));
        bri.push(M(new T.SphereGeometry(.012, 6, 5).translate(.035, .022, 0), sc, sc, sc, .03 + .075 * sc));
      }
      massa.add(juntar(soq, sombra)); if (glob.length) massa.add(juntar(glob, olhoM)); massa.add(juntar(bri, brilhoM));
      // fios de cobre: pelo chão (baixos) e descendo do teto (em cima da massa)
      const cobre = m('#b8733a', { me: .85, r: .32 }), chao = [], teto = [], nf = o.fios || 16;
      for (let i = 0; i < nf; i++) {
        const an = i / nf * TAU + r() * .3;
        if (i % 3) { const R0 = o.alcance || 4.4; const ex = Math.cos(an), ez = Math.sin(an); chao.push(tuboG([[ex * A * .75, .02, ez * C * .75], [ex * (A + .5), .02, ez * (C + .5) + (r() - .5) * .4], [ex * R0 * .7 + (r() - .5), .02, ez * R0 * .55], [ex * R0, .02, ez * R0 * .75]], .014 + r() * .007, 24, 5)); }
        else { const sx = Math.cos(an) * A * .4, sz = Math.sin(an) * C * .4; teto.push(tuboG([[sx, b0 + h * .8, sz], [sx * 1.2, b0 + h + .4, sz * 1.1], [sx * 1.4 + (r() - .5) * .3, ALT - .3, sz * 1.2], [sx * 1.5, ALT + .02, sz * 1.3]], .03 + r() * .02, 16, 5)); }
      }
      if (chao.length) g.add(juntar(chao, cobre)); if (teto.length) g.add(juntar(teto, cobre));
      anim.push((dt, t) => { const k = 1 + Math.sin(t * .9) * .025; massa.scale.set(1 + (k - 1) * .4, k, 1 + (k - 1) * .4); piscam.forEach(([me, f, sy]) => { const ph = (t + f) % 7; me.scale.y = ph < .18 ? sy * .12 : sy; }); });
      return g;
    };

    /* ================= VENTILAÇÃO ================= */
    // ventilador industrial em caixa quadrada (frente em +z), pás girando rápido e grade
    P.a3_ventilador = o => {
      const g = G(), R = o.raio || 1.32, S = 2 * R + .5, yc = Math.min(ALT - S / 2, S / 2), pf = o.prof || .7, r = rng(o.sem || 43);
      const mt = sujo('#3a3c3e', 'metal_sujo', { me: .55, rep: [2, 2] });
      const sh = new T.Shape(); sh.moveTo(-S / 2, -S / 2); sh.lineTo(S / 2, -S / 2); sh.lineTo(S / 2, S / 2); sh.lineTo(-S / 2, S / 2); sh.lineTo(-S / 2, -S / 2);
      const furo = new T.Path(); furo.absarc(0, 0, R + .05, 0, TAU, true); sh.holes.push(furo);
      const placa = new T.ShapeGeometry(sh, 24);
      g.add(juntar([tf(placa.clone(), 0, yc, pf / 2), tf(placa, 0, yc, -pf / 2, 0, PI, 0), ret(S, .12, pf, 0, yc + S / 2 - .12, 0), ret(S, .12, pf, 0, yc - S / 2, 0), ret(.12, S, pf, -S / 2 + .06, yc - S / 2, 0), ret(.12, S, pf, S / 2 - .06, yc - S / 2, 0),
        cilC(R + .06, R + .06, pf, 0, yc, 0, 36, PI / 2, 0, 0, true), cilC(.32, .38, .55, 0, yc, -pf / 2 + .2, 16, PI / 2), ...[0, 1, 2, 3].map(i => barra([0, yc, -pf / 2 + .2], [Math.cos(i * PI / 2 + PI / 4) * (R + .05), yc + Math.sin(i * PI / 2 + PI / 4) * (R + .05), -pf / 2 + .2], .04))], m('#3a3c3e', { tex: 'metal_sujo', me: .55, r: .6, lado: 2 })));
      const rot = G(); rot.position.set(0, yc, .05); g.add(rot);
      const pas = []; for (let i = 0; i < 6; i++) { const an = i / 6 * TAU; pas.push(tf(new T.BoxGeometry(.42, R * .9, .03), Math.cos(an) * R * .5, Math.sin(an) * R * .5, 0, 0, .45, an - PI / 2)); }
      pas.push(esfG(.26, 0, 0, .05, 1, 1, .7, 14));
      rot.add(juntar(pas, m('#6a6e72', { me: .6, r: .4, tex: 'metal_sujo' })));
      const gr = []; [.35, .65, .95].forEach(f => gr.push(torG(R * f + .05, .012, 0, yc, pf / 2 + .02, 0, 0, 0, 40)));
      for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; gr.push(barra([0, yc, pf / 2 + .02], [Math.cos(an) * (R + .05), yc + Math.sin(an) * (R + .05), pf / 2 + .02], .01, 4)); }
      g.add(juntar(gr, metal('#5a5c5e')));
      if (o.txt) pl(g, 1.2, .16, m('#ffffff', { unico: true, mapa: textoTex(o.txt, { w: 512, h: 68, cor: '#111', fundo: '#d8b018', tam: 40 }) }), 0, yc - S / 2 + .3, pf / 2 + .005);
      const v = o.v ?? 9; anim.push(dt => { rot.rotation.z -= v * dt; });
      return g;
    };

    // vento visível: riscos de poeira e papéis levados ao longo de +z (decorativo, não bloqueia)
    P.a3_vento = o => {
      const g = G(), L = o.l || 8, w = o.w || 4, n = o.n || 30, r = rng(o.sem || 47);
      const pos = new Float32Array(n * 6), ss = []; for (let i = 0; i < n; i++) ss.push({ x: (r() - .5) * w, y: .3 + r() * 2.4, z: r() * L, v: 4 + r() * 4, l: .4 + r() * .8 });
      const geo = guardar(new T.BufferGeometry()); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.boundingSphere = new T.Sphere(V(0, 1.5, L / 2), L);
      g.add(new T.LineSegments(geo, guardar(new T.LineBasicMaterial({ color: '#d8d4c8', transparent: true, opacity: .22, depthWrite: false }))));
      const pp = []; for (let i = 0; i < (o.papeis ?? 6); i++) { const p = pl(g, .21, .29, m('#b8b09a', { r: 1, lado: 2 }), 0, 0, 0); pp.push({ p, x: (r() - .5) * w, y: .4 + r() * 1.8, z: r() * L, v: 2 + r() * 2, f: r() * 9 }); }
      anim.push((dt, t) => {
        ss.forEach((s, i) => { s.z += s.v * dt; if (s.z > L) { s.z = 0; s.x = (r() - .5) * w; s.y = .3 + r() * 2.4; } const yy = s.y + Math.sin(t * 3 + i) * .05; pos.set([s.x, yy, s.z, s.x + Math.sin(t + i) * .03, yy, s.z - s.l], i * 6); });
        geo.attributes.position.needsUpdate = true;
        pp.forEach(q => { q.z += q.v * dt; if (q.z > L) { q.z = 0; q.y = .4 + r() * 1.8; } q.p.position.set(q.x + Math.sin(t * 2 + q.f) * .3, q.y + Math.sin(t * 3.3 + q.f) * .25, q.z); q.p.rotation.set(t * 5 + q.f, t * 3, t * 4); });
      });
      return g;
    };

    /* ================= CÂMARA CIRCULAR ================= */
    // parede circular de metal (gomos separados) com vãos nas quatro portas; anéis no chão
    P.a3_anel = o => {
      const g = G(), R = o.raio || 4.5, h = ALT, vao = (o.vao || 21) * PI / 180, k = o.gomos || 6;
      const mt = m(o.c || '#5a6068', { tex: 'metal_sujo', me: .6, r: .45, lado: 2, rep: [1, 2] }), escuro = sujo('#2a2c30', 'metal_sujo', { me: .6 });
      for (let q = 0; q < 4; q++) {
        const t0 = q * PI / 2 + vao, t1 = (q + 1) * PI / 2 - vao, dt = (t1 - t0) / k;
        for (let i = 0; i < k; i++) {
          const ts = t0 + i * dt, gs = [new T.CylinderGeometry(R, R, h, 3, 1, true, ts, dt).translate(0, h / 2, 0)];
          [.9, 2.25].forEach(yy => gs.push(new T.CylinderGeometry(R - .04, R - .04, .07, 3, 1, true, ts, dt).translate(0, yy, 0)));
          const nervura = (t, larg, prof) => tf(new T.BoxGeometry(larg, h, prof), Math.sin(t) * (R - prof / 2 + .02), h / 2, Math.cos(t) * (R - prof / 2 + .02), 0, t, 0);
          gs.push(nervura(ts, i === 0 ? .2 : .08, i === 0 ? .32 : .14));
          if (i === k - 1) gs.push(nervura(t1, .2, .32));
          g.add(juntar(gs, i === 0 || i === k - 1 ? mt : mt));
        }
      }
      const tet = new T.Mesh(guardar(new T.TorusGeometry(R - .05, .07, 6, 64)), escuro); tet.rotation.x = PI / 2; tet.position.y = h - .08; g.add(tet);
      const aneis = canvasMat(512, 512, (x, W, H) => { x.clearRect(0, 0, W, H); for (let i = 1; i < 9; i++) { x.strokeStyle = `rgba(20,22,26,${.55 - i * .04})`; x.lineWidth = 5 - i * .3; x.beginPath(); x.arc(W / 2, H / 2, i * W / 18, 0, TAU); x.stroke(); } x.fillStyle = 'rgba(20,22,26,.6)'; x.beginPath(); x.arc(W / 2, H / 2, 16, 0, TAU); x.fill(); }, { r: .6 });
      chaoPl(g, R * 2, R * 2, decal(aneis), 0, .005, 0);
      return g;
    };

    /* ================= PAREDES DE TELAS ================= */
    // parede de monitores (fundo em z=0, frente em +z). modo: mapa (o mapa de cinco andares, com manchas vermelhas) | olhos (cada tela um olho abrindo)
    P.a3_telas = o => {
      const g = G(), w = o.w || 4, h = o.h || 2.2, y = o.y ?? .4, nx = o.nx || 6, ny = o.ny || 3, r = rng(o.sem || 53), modo = o.modo || 'mapa';
      const cw = w / nx, ch = h / ny, cor = o.cor || (modo === 'olhos' ? '#e8d070' : '#3fe07a');
      const caixas = [], telas = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const cx = -w / 2 + (i + .5) * cw, cyy = y + (j + .5) * ch, dz = modo === 'olhos' ? .3 + r() * .08 : .2;
        caixas.push(caixa(cw - .03, ch - .03, dz, cx, cyy, dz / 2));
        const p = new T.PlaneGeometry(cw - .11, ch - .11); p.translate(cx, cyy, dz + .004);
        const uv = p.attributes.uv;
        if (modo === 'olhos') { const c = (i * 7 + j * 3 + (o.sem || 0)) % 32, ux = c % 8, uy = Math.floor(c / 8); for (let q = 0; q < uv.count; q++) uv.setXY(q, (ux + uv.getX(q)) / 8, (uy + uv.getY(q)) / 4); }
        else for (let q = 0; q < uv.count; q++) uv.setXY(q, (i + uv.getX(q)) / nx, (j + uv.getY(q)) / ny);
        telas.push(p);
      }
      g.add(juntar(caixas, m('#1a1a18', { r: .6, me: .3 })));
      const [c, x] = tela(512, 256), t = texCanvas(c), tm = m('#000000', { unico: true, mapa: t, e: '#ffffff', ei: o.ei ?? 1.05 }); tm.emissiveMap = t;
      g.add(juntar(telas, tm));
      if (o.amarelo) { const fil = pl(g, w - .04, h - .04, m('#f0c820', { unico: true, op: .1, r: .1, me: .2 }), 0, y + h / 2, .45); }
      const fases = Array.from({ length: 32 }, () => r() * 7), mk = Array.from({ length: 40 }, () => [r(), r(), r()]);
      let ult = -1;
      anim.push((dt, tt) => {
        if (tt - ult < (modo === 'olhos' ? .1 : .4)) return; ult = tt;
        if (modo === 'olhos') {
          for (let c2 = 0; c2 < 32; c2++) {
            const x0 = (c2 % 8) * 64, y0 = 256 - (Math.floor(c2 / 8) + 1) * 64, p = ((tt + fases[c2]) / 7) % 1;
            x.fillStyle = '#0c0b06'; x.fillRect(x0, y0, 64, 64);
            let k = p < .2 ? 0 : p < .5 ? (p - .2) / .3 : p < .92 ? 1 : 0; if (p > .2 && p < .5) k *= .85 + .15 * Math.sin(tt * 30 + c2);
            const cx = x0 + 32, cyy = y0 + 33, aw = 22, ah = 14 * k + .8;
            x.save(); x.beginPath(); x.moveTo(cx - aw, cyy); x.quadraticCurveTo(cx, cyy - ah * 1.5, cx + aw, cyy); x.quadraticCurveTo(cx, cyy + ah * 1.5, cx - aw, cyy); x.closePath();
            x.fillStyle = '#c8c4b4'; x.fill(); x.clip(); const ox = Math.sin(tt * .9 + c2) * 4 * (p > .55 ? 1 : 0); x.fillStyle = ['#4a3a24', '#2a3a3a', '#3a2a1a', '#4a4a3a'][c2 % 4]; x.beginPath(); x.arc(cx + ox, cyy, 9, 0, TAU); x.fill(); x.fillStyle = '#050505'; x.beginPath(); x.arc(cx + ox, cyy, 4 + (1 - k) * 2, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(cx + ox + 2, cyy - 5, 3, 3); x.restore();
            x.strokeStyle = '#2a2418'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - aw, cyy); x.quadraticCurveTo(cx, cyy - ah * 1.5, cx + aw, cyy); x.stroke();
            if (p > .92) { for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(255,255,220,${Math.random() * .5})`; x.fillRect(x0 + Math.random() * 64, y0 + Math.random() * 64, 2, 2); } }
          }
          x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 256; i += 3) x.fillRect(0, i, 512, 1);
          if (o.amarelo) { x.fillStyle = 'rgba(235,190,20,.38)'; x.fillRect(0, 0, 512, 256); }
        } else {
          x.fillStyle = o.fundo || '#031008'; x.fillRect(0, 0, 512, 256);
          x.fillStyle = cor; x.font = 'bold 13px monospace'; x.textAlign = 'left'; x.fillText(o.titulo || '', 10, 18);
          const nomes = o.andares || ['1', '2', '3', '4', '5'];
          for (let a = 0; a < 5; a++) {
            const x0 = 12 + a * 100, y0 = 44, cel = 17;
            x.fillStyle = cor; x.font = 'bold 12px monospace'; x.fillText(nomes[a] || '', x0, y0 - 8);
            x.strokeStyle = cor; x.lineWidth = 1.5; for (let i = 0; i < 5; i++) for (let k2 = 0; k2 < 5; k2++) x.strokeRect(x0 + i * cel, y0 + k2 * cel, cel - 3, cel - 3);
            if (a === 4 && o.ultimo) { x.fillStyle = 'rgba(200,20,20,.35)'; x.fillRect(x0 - 2, y0 - 2, cel * 5 + 2, cel * 5 + 2); x.fillStyle = '#ff4030'; x.font = 'bold 11px monospace'; x.fillText(o.ultimo, x0 + 2, y0 + cel * 5 + 16); }
            else mk.forEach(([u, v, f], q) => { if (q % 5 !== a) return; const k3 = .25 + .35 * (.5 + .5 * Math.sin(tt * (.5 + f) + q)); const gr = x.createRadialGradient(x0 + u * 80, y0 + v * 80, 0, x0 + u * 80, y0 + v * 80, 8 + f * 12); gr.addColorStop(0, `rgba(255,30,30,${k3})`); gr.addColorStop(1, 'rgba(255,30,30,0)'); x.fillStyle = gr; x.fillRect(x0 - 10, y0 - 10, 110, 110); });
          }
          x.fillStyle = cor; x.font = '10px monospace'; for (let i = 0; i < 6; i++) x.fillText(Array.from({ length: 30 }, () => Math.floor(Math.random() * 16).toString(16)).join(''), 12 + (i % 3) * 165, 190 + Math.floor(i / 3) * 14);
          x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 256; i += 3) x.fillRect(0, i, 512, 1);
        }
        t.needsUpdate = true;
      });
      if (o.luz !== false) luz(g, cor, o.li ?? .6, 5, 0, y + h / 2, 1.1);
      return g;
    };

    /* ================= PAPÉIS ================= */
    // bilhete escrito à mão, deitado (em cima de mesa: h0)
    P.a3_bilhete = o => {
      const g = G(), w = o.w || .22, h = o.h || .3, r = rng(o.sem || 59), H = Math.round(256 * h / w);
      const mt = canvasMat(256, H, (x, W, Hh) => {
        x.fillStyle = o.f || '#e8e0c8'; x.fillRect(0, 0, W, Hh); x.strokeStyle = 'rgba(80,110,160,.35)'; x.lineWidth = 1; for (let yy = 34; yy < Hh; yy += 22) { x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
        x.fillStyle = o.c || '#1e2440'; x.font = `${o.tam || 19}px "Segoe Print", "Comic Sans MS", cursive`; x.textAlign = 'left';
        const pal = String(o.txt || '').split(/\s+/); let linha = '', yy = 30; const lin = [];
        pal.forEach(p => { const t2 = linha ? linha + ' ' + p : p; if (x.measureText(t2).width > W - 24) { lin.push(linha); linha = p; } else linha = t2; }); if (linha) lin.push(linha);
        lin.forEach((l, i) => { x.save(); x.translate(12, yy + i * 22); x.rotate((r() - .5) * .04); x.fillText(l, 0, 0); x.restore(); });
        for (let i = 0; i < 4; i++) { x.fillStyle = `rgba(90,60,20,${.08 + r() * .1})`; x.beginPath(); x.ellipse(r() * W, r() * Hh, 20 + r() * 30, 14 + r() * 20, 0, 0, TAU); x.fill(); }
      }, { r: .95 });
      chaoPl(g, w, h, mt, 0, .003, 0).rotation.z = (r() - .5) * .5;
      return g;
    };

    // manual técnico aberto: o corte vertical de um prédio de cinco andares com um poço desenhado à mão, e a nota na margem
    P.a3_manual_corte = o => {
      const g = G(), w = o.w || .62, r = rng(o.sem || 61);
      const mt = canvasMat(512, 340, (x, W, H) => {
        x.fillStyle = '#d8ceb2'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(90,60,30,.12)'; x.fillRect(0, 0, W, H);
        x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(W / 2 - 2, 0, 4, H);
        x.fillStyle = '#1a1a22'; x.font = 'bold 13px Arial'; x.textAlign = 'center'; x.fillText(o.titulo || '', W / 4, 22);
        const x0 = 50, larg = 150, alt = 34; x.strokeStyle = '#1a2a4a'; x.lineWidth = 2;
        for (let i = 0; i < 5; i++) { const yy = 34 + i * alt; x.strokeRect(x0, yy, larg, alt); x.fillStyle = '#1a2a4a'; x.font = 'bold 12px Arial'; x.fillText(String(i + 1), x0 - 14, yy + 22); for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(x0 + 8 + k * 36, yy + 6); x.lineTo(x0 + 8 + k * 36, yy + alt - 6); x.stroke(); } }
        x.strokeStyle = '#3a3630'; x.lineWidth = 1.6; const cx = x0 + larg / 2;
        for (let s = -1; s <= 1; s += 2) { x.beginPath(); let px = cx + s * 18, py = 34 + 5 * alt; x.moveTo(px, py); while (py < H) { py += 8; px += (r() - .5) * 3; x.lineTo(px, py); } x.stroke(); }
        for (let py = 34 + 5 * alt + 12; py < H; py += 14 + r() * 6) { x.beginPath(); x.moveTo(cx - 17, py); x.lineTo(cx + 17, py + (r() - .5) * 4); x.globalAlpha = .4; x.stroke(); x.globalAlpha = 1; }
        x.fillStyle = 'rgba(30,30,40,.45)'; for (let s2 = 0; s2 < 18; s2++) x.fillRect(W / 2 + 22, 30 + s2 * 15, W / 2 - 110 - r() * 30, 3);
        x.save(); x.translate(W - 30, 40); x.rotate(PI / 2 - .06); x.fillStyle = 'rgba(70,66,60,.85)'; x.font = '15px "Segoe Print", "Comic Sans MS", cursive'; x.textAlign = 'left';
        const pal = String(o.nota || '').split(/\s+/); let linha = '', li = 0; pal.forEach(p => { const t2 = linha ? linha + ' ' + p : p; if (x.measureText(t2).width > 270) { x.fillText(linha, 0, li * 18); li++; linha = p; } else linha = t2; }); if (linha) x.fillText(linha, 0, li * 18);
        x.restore();
      }, { r: .95 });
      const pg = new T.PlaneGeometry(w, w * .66, 2, 1), ps = pg.attributes.position; for (let i = 0; i < ps.count; i++) ps.setZ(i, Math.abs(ps.getX(i)) < .01 ? -.012 : .008);
      pg.computeVertexNormals(); const pag = mesh(g, pg, mt); pag.rotation.x = -PI / 2; pag.position.y = .03;
      g.add(juntar([ret(w + .04, .025, w * .7, 0, 0, 0), ret(w - .02, .012, w * .64, 0, .022, 0)], m('#2a3a4a', { r: .7 })));
      return g;
    };

    /* ================= CARNE NA PAREDE ================= */
    // parede de carne costurada (fundo em z=0): pontos de sutura e cabos (vindos de +z, altos) entrando nela
    P.a3_carne_costurada = o => {
      const g = G(), w = o.w || 6, h = o.h || ALT - .02, y0 = o.y ?? 0, r = rng(o.sem || 67);
      const dz = (x, y) => .14 + .07 * Math.sin(x * 2.1 + y * 1.3) + .05 * Math.sin(x * 5.3 - y * 3.7) + .03 * Math.sin(y * 7.1);
      const geo = new T.PlaneGeometry(w, h, Math.round(w * 5), Math.round(h * 5)), ps = geo.attributes.position;
      for (let i = 0; i < ps.count; i++) { const x = ps.getX(i), y = ps.getY(i); const borda = Math.min(1, (w / 2 - Math.abs(x)) / .3, (h / 2 - Math.abs(y)) / .3); ps.setZ(i, dz(x, y + h / 2 + y0) * Math.max(.15, borda)); }
      geo.computeVertexNormals(); geo.translate(0, y0 + h / 2, 0);
      const pele = mesh(g, geo, carneMat(o.c || '#c88a86', { rep: [Math.max(1, Math.round(w / 1.5)), 2], ei: .22, r: .36, e: '#2a0808' }));
      // suturas
      const linha = [], fio = [];
      const ns = o.suturas || Math.max(2, Math.round(w / 1.6));
      for (let s = 0; s < ns; s++) {
        let x = -w / 2 + (s + .5) * w / ns + (r() - .5) * .4, y = y0 + .2 + r() * .3; const pts = [];
        while (y < y0 + h - .2) { pts.push([x, y, dz(x, y) + .01]); y += .25; x += (r() - .5) * .18; }
        if (pts.length < 3) continue;
        linha.push(tuboG(pts, .012, pts.length * 3, 4));
        for (let k = 0; k < pts.length - 1; k++) for (let q = 0; q < 3; q++) { const f = q / 3, px = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, py = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f; fio.push(tf(new T.BoxGeometry(.11, .008, .008), px, py, dz(px, py) + .02, 0, 0, .5)); }
      }
      if (linha.length) g.add(juntar(linha, m('#4a1414', { r: .4 })));
      if (fio.length) g.add(juntar(fio, m('#111', { r: .6 })));
      // cabos chegando (sempre acima de 1,85 m para não fechar a passagem por baixo)
      const cabos = [], golas = [];
      (o.cabos || []).forEach(([cx, al, ye], i) => {
        const yin = Math.max(2.0, Math.min(y0 + h - .2, (ye ?? 2.1) + .1 + r() * .3)), xin = cx + (r() - .5) * .4, ys = Math.max(1.95, ye ?? 2.05);
        cabos.push(tuboG([[cx, ys, al], [cx + (xin - cx) * .4, Math.max(1.88, ys - .15), al * .6], [xin, yin - .05, al * .25], [xin, yin, dz(xin, yin) - .02]], .028 + r() * .015, 16, 6));
        golas.push(tf(new T.TorusGeometry(.06, .03, 6, 12), xin, yin, dz(xin, yin) + .01));
        for (let q = 0; q < 4; q++) { const an = q * PI / 2 + .4; golas.push(tf(new T.BoxGeometry(.1, .008, .008), xin + Math.cos(an) * .08, yin + Math.sin(an) * .08, dz(xin, yin) + .03, 0, 0, an)); }
      });
      if (cabos.length) g.add(juntar(cabos, m('#121212', { r: .5 })));
      if (golas.length) g.add(juntar(golas, carneMat('#9a4a4a', { ei: .3 })));
      anim.push((dt, t) => { pele.scale.z = 1 + Math.sin(t * 1.1) * .08; });
      return g;
    };

    // veias de carne subindo pela parede (decorativo, plano)
    P.a3_veias = o => {
      const g = G(), w = o.w || 2.4, h = o.h || 2.6, r = rng(o.sem || 71), n = o.n || 5, gs = [], nos = [];
      const ramo = (x, y, ang, len, rr, prof) => { const pts = [[x, y, .025]]; for (let k = 0; k < 5; k++) { ang += (r() - .5) * .7; x += Math.cos(ang) * len / 5; y += Math.sin(ang) * len / 5; pts.push([Math.max(-w / 2, Math.min(w / 2, x)), Math.max(.02, Math.min(h, y)), .025 + r() * .015]); } gs.push(tuboG(pts, rr, 12, 5)); if (prof < 2) for (let b = 0; b < 2; b++) { const p = pts[2 + b * 2]; ramo(p[0], p[1], ang + (r() - .5) * 1.6, len * .55, rr * .6, prof + 1); } };
      for (let i = 0; i < n; i++) { const x = (r() - .5) * w * .8; ramo(x, .02, PI / 2 + (r() - .5) * .6, h * (.45 + r() * .4), .018 + r() * .012, 0); nos.push(esfG(.12 + r() * .08, x, .05, .03, 1.4, .7, .5, 8)); }
      const mv = juntar(gs, m(o.c || '#2a080a', { r: .35, e: '#100002', ei: .25 })); g.add(mv); g.add(juntar(nos, carneMat('#4a1418', { ei: .15 })));
      const f = r() * 6; anim.push((dt, t) => { mv.scale.z = 1 + Math.max(0, Math.sin(t * 2.4 + f)) ** 4 * .6; });
      return g;
    };

    /* ================= OFICINA DE PRÓTESES ================= */
    const protese = (tipo, x, y, z, r, aco, escuro, carne, gsA, gsE, gsC, rot = 0) => {
      const M = gg => tf(gg, 0, 0, 0, 0, 0, rot) && gg.translate(x, y, z);
      if (tipo === 'mao') { gsA.push(M(caixa(.1, .12, .03, 0, 0, 0))); for (let f = 0; f < 4; f++) { gsA.push(M(cilC(.012, .01, .1, -.036 + f * .024, -.11, 0, 6))); gsE.push(M(esfG(.014, -.036 + f * .024, -.065, 0, 1, 1, 1, 5))); } gsA.push(M(cilC(.013, .011, .08, .06, -.02, 0, 6, 0, 0, .7))); gsE.push(M(cilC(.04, .04, .06, 0, .09, 0, 8))); }
      else if (tipo === 'braco') { gsA.push(M(cilC(.04, .035, .36, 0, -.2, 0, 8)), M(cilC(.035, .03, .3, 0, -.55, 0, 8)), M(caixa(.08, .1, .03, 0, -.76, 0))); gsE.push(M(esfG(.05, 0, -.38, 0, 1, 1, 1, 8)), M(cilC(.05, .05, .05, 0, 0, 0, 8))); if (carne) gsC.push(M(esfG(.07, 0, .04, 0, 1, .8, 1, 8))); }
      else if (tipo === 'perna') { gsA.push(M(cilC(.05, .045, .42, 0, -.25, 0, 8)), M(cilC(.04, .035, .4, 0, -.72, 0, 8)), M(caixa(.09, .05, .22, 0, -.95, .06))); gsE.push(M(esfG(.06, 0, -.48, 0, 1, 1, 1, 8))); if (carne) gsC.push(M(esfG(.09, 0, .0, 0, 1, .8, 1, 8))); }
      else { gsE.push(M(esfG(.05, 0, 0, 0, 1, 1, 1, 8))); gsA.push(M(cilC(.025, .025, .14, 0, -.09, 0, 6)), M(cilC(.025, .025, .14, .07, .04, 0, 6, 0, 0, 1.2))); }
    };
    // painel de parede (fundo em z=0) com próteses penduradas: mãos, braços, pernas e articulações (algumas ainda com carne)
    P.a3_painel_proteses = o => {
      const g = G(), w = o.w || 2.4, h = o.h || 1.5, y = o.y ?? .75, r = rng(o.sem || 73);
      const furos = canvasMat(256, Math.round(256 * h / w), (x, W, H) => { x.fillStyle = '#5a4a36'; x.fillRect(0, 0, W, H); x.fillStyle = '#1a140c'; for (let i = 6; i < W; i += 12) for (let j = 6; j < H; j += 12) { x.beginPath(); x.arc(i, j, 2.2, 0, TAU); x.fill(); } for (let i = 0; i < 12; i++) { x.fillStyle = `rgba(20,10,5,${r() * .3})`; x.beginPath(); x.arc(r() * W, r() * H, 10 + r() * 30, 0, TAU); x.fill(); } }, { r: .9 });
      bx(g, w, h, .03, furos, 0, y, .015);
      g.add(juntar([ret(w + .06, .05, .06, 0, y - .05, .03), ret(w + .06, .05, .06, 0, y + h, .03), ret(.05, h + .1, .06, -w / 2 - .02, y - .05, .03), ret(.05, h + .1, .06, w / 2 + .02, y - .05, .03)], m('#3a3a3a', { me: .5 })));
      const aco = metal('#a8acb0'), escuro = m('#2a2c2e', { me: .6, r: .4 }), carne = carneMat('#9a3a3a', { ei: .3 }), gsA = [], gsE = [], gsC = [], gan = [];
      const tipos = ['mao', 'braco', 'articulacao', 'perna', 'mao', 'braco', 'mao', 'articulacao'];
      const nc = Math.max(3, Math.floor(w / .42));
      for (let i = 0; i < nc; i++) for (let j = 0; j < 2; j++) {
        const tp = tipos[(i * 2 + j + (o.sem || 0)) % tipos.length]; if (tp === 'perna' && j === 0) continue;
        const x = -w / 2 + (i + .5) * w / nc, yy = y + h - .12 - j * h * .5;
        gan.push(cilC(.008, .008, .08, x, yy + .03, .05, 5, PI / 2));
        protese(tp, x, yy, .09, r, aco, escuro, r() < .4, gsA, gsE, gsC, (r() - .5) * .2);
      }
      g.add(juntar(gsA, aco)); g.add(juntar(gsE.concat(gan), escuro)); if (gsC.length) g.add(juntar(gsC, carne));
      for (let i = 0; i < 2; i++) { const s = P.sangue({ estilo: 'escorrido', w: .3, h: .5, y: y - .3, sem: (o.sem || 1) + i }); s.position.set(-w / 2 + .4 + r() * (w - .8), 0, .035); g.add(s); }
      return g;
    };
    // bancada de oficina com morsa, ferramentas, próteses soltas e um braço mecânico preso a um antebraço
    P.a3_bancada_proteses = o => {
      const g = G(), w = o.w || 2.2, d = .78, r = rng(o.sem || 79);
      const aco = sujo('#4a4c4e', 'metal_sujo', { me: .5 });
      g.add(juntar([ret(w, .06, d, 0, .86, 0), ret(.06, .86, .06, -w / 2 + .05, 0, -d / 2 + .05), ret(.06, .86, .06, w / 2 - .05, 0, -d / 2 + .05), ret(.06, .86, .06, -w / 2 + .05, 0, d / 2 - .05), ret(.06, .86, .06, w / 2 - .05, 0, d / 2 - .05),
        ret(w - .1, .03, d - .1, 0, .2, 0), ret(w, .7, .03, 0, .92, -d / 2 + .02)], aco));
      mesh(g, ret(w - .04, .015, d - .04, 0, .92, .0), m('#5a4632', { tex: 'madeira_velha', r: .8 }));
      // ferramentas no espelho
      const fe = []; for (let i = 0; i < 7; i++) { const x = -w / 2 + .25 + i * (w - .5) / 6; fe.push(ret(.03, .22 + r() * .1, .015, x, 1.15, -d / 2 + .045, 0, 0, (r() - .5) * .3), esfG(.03, x, 1.42, -d / 2 + .05, 1, .5, .4, 6)); }
      g.add(juntar(fe, metal('#8a8e92')));
      // morsa
      g.add(juntar([ret(.16, .1, .2, w / 2 - .3, .935, .1), ret(.04, .14, .16, w / 2 - .36, 1.03, .1), ret(.04, .14, .16, w / 2 - .22, 1.03, .1), cilC(.012, .012, .3, w / 2 - .3, 1.0, .32, 6, PI / 2)], m('#2a4a6a', { me: .5, r: .5 })));
      // próteses e articulações em cima
      const metalP = metal('#b0b4b8'), escuro = m('#2a2c2e', { me: .6 }), carne = carneMat('#9a3a3a', { ei: .3 }), gsA = [], gsE = [], gsC = [];
      protese('mao', -w * .3, .95, .1, r, metalP, escuro, false, gsA, gsE, gsC, PI / 2);
      protese('articulacao', -w * .1, .99, .2, r, metalP, escuro, false, gsA, gsE, gsC, .4);
      protese('articulacao', w * .05, .99, -.1, r, metalP, escuro, false, gsA, gsE, gsC, 1.5);
      protese('braco', w * .12, 1.0, .12, r, metalP, escuro, true, gsA, gsE, gsC, PI / 2 + .2);
      g.add(juntar(gsA.map(q => q), metalP)); g.add(juntar(gsE, escuro)); g.add(juntar(gsC.concat([tf(new T.CylinderGeometry(.06, .07, .28, 10), w * .12 - .2, 1.0, .14, 0, 0, PI / 2 + .2)]), carne));
      // parafusos, lata de óleo
      g.add(juntar([ret(.18, .04, .12, -w * .4, .935, -.2), cil(.05, .05, .14, w * .35, .935, -.15, 10), cilC(.008, .008, .1, w * .35 + .03, 1.1, -.15, 4, 0, 0, .6)], m('#8a6a2a', { me: .5, r: .5 })));
      const s = P.sangue({ chao: 1, estilo: 'respingo', w: .45, sem: o.sem }); s.position.set(w * .1, .93, .1); g.add(s);
      return g;
    };
    // mesa de solda com braço robótico soldando metal em carne (centelhas na ponta)
    P.a3_solda = o => {
      const g = G(), r = rng(o.sem || 83), aco = sujo('#3a3c3e', 'metal_sujo', { me: .55 });
      g.add(juntar([ret(1.3, .06, .85, 0, .84, 0), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => ret(.07, .84, .07, a * .58, 0, b * .36)), ret(1.2, .03, .75, 0, .25, 0), cil(.24, .28, .9, 0, 0, -.72, 16)], aco));
      // peça: antebraço metálico unido a um pedaço de carne
      const peca = G(); peca.position.set(.05, .9, .05); peca.rotation.y = .3; g.add(peca);
      peca.add(juntar([cilC(.06, .055, .45, -.2, .06, 0, 10, 0, 0, PI / 2), esfG(.07, -.45, .06, 0), ret(.1, .04, .14, -.52, .02, 0)], metal('#a0a4a8')));
      peca.add(juntar([esfG(.13, .15, .08, 0, 1.4, .7, .9, 10), esfG(.08, .3, .07, .05, 1, .8, 1, 8)], carneMat('#a04444', { ei: .35 })));
      const costura = mesh(peca, cilC(.075, .075, .03, .0, .07, 0, 12, 0, 0, PI / 2), m('#ffffff', { unico: true, e: '#ffb050', ei: 1.6 }));
      g.add(juntar([ret(.08, .12, .3, -.35, .87, .05), ret(.08, .12, .3, .35, .87, .05)], m('#7a2a1a', { me: .5 })));
      // braço robótico
      const base = G(); base.position.set(0, .9, -.72); g.add(base);
      const ombro = G(); ombro.position.set(0, .15, 0); base.add(ombro); cy(base, .18, .2, .15, m('#c8a020', { me: .4, r: .5 }), 0, 0, 0, 14);
      const braco1 = G(); braco1.position.set(0, .1, 0); ombro.add(braco1); braco1.rotation.x = .35;
      const amar = m('#d8a818', { me: .35, r: .5, tex: 'metal_sujo' });
      braco1.add(juntar([caixa(.14, .7, .14, 0, .35, 0), esfG(.1, 0, 0, 0)], amar));
      const braco2 = G(); braco2.position.set(0, .7, 0); braco1.add(braco2); braco2.rotation.x = 2.2;
      braco2.add(juntar([esfG(.09, 0, 0, 0), caixa(.1, .65, .1, 0, .32, 0), cilC(.03, .015, .22, 0, .74, 0, 8)], amar));
      const ponta = G(); ponta.position.set(0, .86, 0); braco2.add(ponta);
      const brilho = sf(ponta, .03, m('#ffffff', { unico: true, e: '#cfe8ff', ei: 3 }), 0, 0, 0, 8);
      const cent = P.centelhas({ sem: o.sem, raio: .3, c: '#cfe4ff' }); ponta.add(cent);
      const cab = P.cabos_chao({ n: 3, w: .5, d: 1.2, sem: o.sem, c: '#111' }); cab.position.set(.2, 0, -.9); g.add(cab);
      const v = P.vapor_sobe({ y: .95, sem: o.sem }); v.position.set(.05, 0, .05); g.add(v);
      const f = r() * 6;
      anim.push((dt, t) => { ombro.rotation.y = Math.sin(t * .7 + f) * .12; braco1.rotation.x = .35 + Math.sin(t * 1.1 + f) * .05; braco2.rotation.x = 2.2 + Math.sin(t * 1.3) * .06; const on = Math.sin(t * 9) > -.3; brilho.visible = on; costura.material.emissiveIntensity = on ? 1.6 + Math.random() : .6; });
      return g;
    };

    /* ================= ECLUSA ================= */
    // porta circular de cofre no vão de uma parede (frente em +z): três ponteiros no centro e uma escotilha com o corredor do outro lado
    P.a3_eclusa = o => {
      const g = G(), R = o.raio || 1.25, yc = R + .05, r = rng(o.sem || 89);
      const aco = m('#7d848c', { tex: 'metal_sujo', me: .75, r: .38 }), escuro = sujo('#2a2c2e', 'metal_sujo', { me: .6 });
      g.add(juntar([ret(2.9, ALT - .02, .05, 0, 0, -.2)], escuro));
      const aro = mesh(g, new T.TorusGeometry(R + .14, .14, 10, 44), escuro); aro.position.set(0, yc, .0); aro.scale.z = .6;
      const pf = []; for (let k = 0; k < 18; k++) { const an = k / 18 * TAU; pf.push(cilC(.045, .045, .08, Math.cos(an) * (R + .14), yc + Math.sin(an) * (R + .14), .07, 6, PI / 2)); }
      g.add(juntar(pf, metal('#3a3a3a')));
      const porta = G(); porta.position.set(R + .1, 0, -.02); g.add(porta);
      const pg = [cilC(R, R, .3, -R - .1, yc, -.04, 44, PI / 2), cilC(R - .12, R - .12, .06, -R - .1, yc, .13, 44, PI / 2), cilC(.5, .52, .1, -R - .1, yc, .17, 32, PI / 2)];
      for (let k = 0; k < 10; k++) { const an = k / 10 * TAU; pg.push(cilC(.06, .06, .2, -R - .1 + Math.cos(an) * (R - .2), yc + Math.sin(an) * (R - .2), .17, 8, PI / 2)); }
      [-.5, .5].forEach(yy => pg.push(cil(.09, .09, .4, -.02, yc + yy - .2, .0, 10)));
      porta.add(juntar(pg, aco));
      const pts = [];
      [[-.28, -.06], [0, .1], [.28, -.06]].forEach(([dx, dy]) => pts.push(mostrador(porta, .13, -R - .1 + dx, yc + dy, .22, '', 2.05 + r() * .1)));
      // escotilha
      const vid = canvasMat(256, 256, (x, W, H) => {
        x.fillStyle = '#140806'; x.fillRect(0, 0, W, H); const vx = W / 2, vy = H * .62;
        for (let i = 0; i < 14; i++) { const k = 1 - i / 14, rw = W * .55 * k + 4, rh = H * .5 * k + 3, cyy = vy - (H * .2) * k; x.strokeStyle = `rgba(${150 * k + 40},${70 * k + 20},${60 * k + 20},${.4 + .5 * k})`; x.lineWidth = 2 + 9 * k; x.beginPath(); x.ellipse(vx, cyy + rh * .3, rw, rh, 0, PI, TAU); x.stroke(); }
        const gr = x.createRadialGradient(vx, vy - 6, 0, vx, vy - 6, 30); gr.addColorStop(0, 'rgba(255,190,140,.7)'); gr.addColorStop(1, 'rgba(255,190,140,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        x.strokeStyle = 'rgba(60,20,16,.8)'; x.lineWidth = 2; for (let s = -1; s <= 1; s += 2) { x.beginPath(); x.moveTo(vx + s * W * .55, H); x.lineTo(vx + s * 4, vy); x.stroke(); }
      }, { brilho: .55, r: .1 });
      const esc = mesh(porta, new T.CircleGeometry(.22, 24), vid); esc.position.set(-R - .1, yc + .72, .18);
      porta.add(juntar([torG(.25, .04, -R - .1, yc + .72, .18, 0, 0, 0, 24)], metal('#5a5e62')));
      const lamp = sf(g, .06, m('#ffffff', { unico: true, e: '#ff2010', ei: 2 }), R + .4, yc + R * .7, .08, 10);
      chaoPl(g, 2.6, .25, listras(512, 48), 0, .006, .35);
      if (o.aberta) porta.rotation.y = 1.8;
      const f = r() * 9; anim.push((dt, t) => { pts.forEach((p, i) => { p.rotation.z = -2.05 - i * .04 + Math.sin(t * 17 + i * 3 + f) * .02; }); lamp.material.emissiveIntensity = 1.2 + Math.sin(t * 3) * .9; });
      return g;
    };

    /* ================= PLATAFORMA DE CARGA ================= */
    // onde os trilhos entram direto na parede (decalque na parede + fendas no pé); frente em +z
    P.a3_trilhos_parede = o => {
      const g = G(), w = o.w || 2.4, h = o.h || 2.4, r = rng(o.sem || 97);
      const mt = canvasMat(256, Math.round(256 * h / w), (x, W, H) => {
        x.clearRect(0, 0, W, H);
        x.fillStyle = 'rgba(70,64,56,.55)'; x.beginPath(); x.moveTo(10, H); x.lineTo(10, H * .35); x.quadraticCurveTo(W / 2, -H * .05, W - 10, H * .35); x.lineTo(W - 10, H); x.fill();
        x.strokeStyle = 'rgba(20,18,16,.8)'; x.lineWidth = 4; x.stroke();
        x.fillStyle = 'rgba(15,12,10,.7)'; for (let yy = H * .3; yy < H; yy += 18) for (let xx = 18; xx < W - 10; xx += 22) if (r() < .8) { x.beginPath(); x.arc(xx, yy, 2.2, 0, TAU); x.fill(); }
        x.strokeStyle = 'rgba(200,190,170,.25)'; x.lineWidth = 1; for (let i = 0; i < 40; i++) { const a = r() * W, b = H * .5 + r() * H * .5; x.beginPath(); x.moveTo(a, b); x.lineTo(a + (r() - .5) * 40, b + (r() - .5) * 8); x.stroke(); }
        const gr = x.createLinearGradient(0, H, 0, H * .5); gr.addColorStop(0, 'rgba(10,8,6,.8)'); gr.addColorStop(1, 'rgba(10,8,6,0)'); x.fillStyle = gr; x.fillRect(10, H * .5, W - 20, H * .5);
      }, { transp: true, r: .7, me: .3 });
      decal(mt); pl(g, w, h, mt, 0, h / 2, .012);
      g.add(juntar([-.35, .35].map(dx => ret(.2, .16, .04, dx, 0, .005)), m('#030303', { r: 1 })));
      return g;
    };
    // palete com carga (caixas ou sacos), com filme plástico
    P.a3_palete = o => {
      const g = G(), r = rng(o.sem || 101), w = o.w || 1.2, d = o.d || 1.0, mad = m('#7a5a3a', { tex: 'madeira_velha', r: .9 });
      const gs = []; for (let i = 0; i < 5; i++) gs.push(ret(w, .025, .14, 0, .12, -d / 2 + .07 + i * (d - .14) / 4)); [-1, 0, 1].forEach(s => gs.push(ret(.1, .1, d, s * (w / 2 - .05), .02, 0))); [-1, 1].forEach(s => gs.push(ret(w, .02, .12, 0, 0, s * (d / 2 - .06))));
      g.add(juntar(gs, mad));
      const carga = o.carga || 'caixas', cs = [], y0 = .145; let topo = y0;
      if (carga === 'sacos') { for (let c = 0; c < (o.n || 3); c++) for (let i = 0; i < 2; i++) { const s = esfG(.3, (i - .5) * w * .45 + (r() - .5) * .05, y0 + .12 + c * .22, (r() - .5) * .1, 1.1, .45, 1.45, 10); cs.push(s); topo = y0 + .3 + c * .22; } g.add(juntar(cs, m(o.c || '#4a3e2c', { r: 1 }))); }
      else { const nl = o.n || 2; for (let c = 0; c < nl; c++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { if (c === nl - 1 && r() < .25) continue; const hh = .32 + r() * .08; cs.push(ret(w / 2 - .03, hh, d / 2 - .03, (i - .5) * w / 2, y0 + c * .42, (j - .5) * d / 2, 0, (r() - .5) * .08, 0)); } topo = y0 + nl * .42; g.add(juntar(cs, m(o.c || '#9a7a52', { r: .95 }))); }
      if (o.filme !== false) mesh(g, ret(w + .03, topo - y0 + .02, d + .03, 0, y0, 0), m('#e8f0f4', { op: .16, r: .1, me: .1 }));
      return g;
    };
    // paleteira manual (garfos, roda e alça)
    P.a3_paleteira = o => {
      const g = G(), mt = m(o.c || '#b8901a', { tex: 'metal_sujo', me: .45, r: .5 });
      g.add(juntar([ret(.16, .07, 1.15, -.2, .02, 0), ret(.16, .07, 1.15, .2, .02, 0), ret(.56, .28, .22, 0, .02, -.66), cilC(.08, .08, .3, 0, .38, -.7, 10), barra([0, .45, -.7], [0, 1.25, -1.05], .025), torG(.12, .02, 0, 1.3, -1.08, 0, PI / 2, 0, 12)], mt));
      g.add(juntar([cilC(.09, .09, .1, -.12, .09, -.72, 12, 0, 0, PI / 2), cilC(.09, .09, .1, .12, .09, -.72, 12, 0, 0, PI / 2)], m('#151515', { r: .8 })));
      return g;
    };
    // tambores de metal (um caído, derramando)
    P.a3_tambores = o => {
      const g = G(), r = rng(o.sem || 103), n = o.n || 3, cores = o.cores || ['#2a4a6a', '#6a2a1e', '#b0901e', '#4a4a44'];
      const pos = [[0, 0], [.62, .05], [.3, .55], [-.35, .55], [.95, .6]];
      for (let i = 0; i < n; i++) {
        const mt = m(cores[i % cores.length], { tex: r() < .5 ? 'ferrugem' : 'metal_sujo', me: .5, r: .5 });
        const tb = G(); g.add(tb);
        tb.add(juntar([cil(.29, .29, .88, 0, 0, 0, 18), cil(.3, .3, .03, 0, .28, 0, 18), cil(.3, .3, .03, 0, .58, 0, 18), cil(.3, .3, .03, 0, .86, 0, 18), cil(.04, .04, .02, .15, .88, .1, 8)], mt));
        if (o.caido === i) { tb.rotation.z = PI / 2; tb.position.set(pos[i][0] + .45, .29, pos[i][1]); const s = P.a3_chao({ estilo: o.derrame || 'oleo', w: 1.6, d: 1.2, sem: (o.sem || 1) + i }); s.position.set(pos[i][0] + 1.2, 0, pos[i][1]); g.add(s); }
        else { tb.position.set(pos[i][0], 0, pos[i][1]); tb.rotation.y = r() * 3; }
        if (o.rotulo) { const p = pl(tb, .3, .2, m('#ffffff', { unico: true, mapa: textoTex(o.rotulo, { w: 256, h: 170, cor: '#111', fundo: '#e8d8a0', tam: 34 }) }), 0, .55, .292); }
      }
      return g;
    };

    /* ================= REFEITÓRIO / VESTIÁRIO / CONTROLE ================= */
    // bandeja de refeitório com divisórias, comida (podre ou não), copo e talher (em cima de mesa: h0)
    P.a3_bandeja = o => {
      const g = G(), r = rng(o.sem || 107), podre = o.podre !== false;
      g.add(juntar([ret(.44, .015, .32, 0, 0, 0), ret(.44, .03, .01, 0, .01, .155), ret(.44, .03, .01, 0, .01, -.155), ret(.01, .03, .32, .215, .01, 0), ret(.01, .03, .32, -.215, .01, 0), ret(.01, .025, .32, .06, .01, 0), ret(.16, .025, .01, .14, .01, 0)], m(o.c || '#9a8a6a', { r: .5 })));
      const cores = podre ? ['#4a5a2a', '#3a3a20', '#5a4a3a', '#2a2418'] : ['#e8d8a0', '#7a4a2a', '#c86a3a', '#f0eee0'], cm = [], mofo = [];
      [[-.08, 0, .1], [.14, .08, .06], [.14, -.08, .06]].forEach(([x, z, s]) => { for (let k = 0; k < 4; k++) cm.push(esfG(s * (.4 + r() * .4), x + (r() - .5) * s, .02, z + (r() - .5) * s, 1, .45, 1, 7)); if (podre) for (let k = 0; k < 5; k++) mofo.push(esfG(.008 + r() * .01, x + (r() - .5) * s * 1.2, .035, z + (r() - .5) * s, 1, 1, 1, 5)); });
      g.add(juntar(cm, m(cores[Math.floor(r() * cores.length)], { r: .7 }))); if (mofo.length) g.add(juntar(mofo, m('#d8dcc8', { r: 1 })));
      g.add(juntar([cil(.035, .03, .1, -.25, 0, -.08, 10), ret(.015, .005, .16, -.04, .025, .1, 0, .3, 0)], m('#d8d8d0', { r: .4, me: .3 })));
      return g;
    };
    // trajes de proteção pendurados num trilho de parede (fundo em z=0); estão cheios: algo se mexe dentro
    P.a3_trajes = o => {
      const g = G(), n = o.n || 4, esp = o.esp || .62, r = rng(o.sem || 109), c = o.c || '#d8c22a';
      const W = n * esp;
      g.add(juntar([cilC(.025, .025, W + .2, 0, 2.05, .28, 8, 0, 0, PI / 2), ret(.05, .05, .3, -W / 2 - .05, 2.0, .13), ret(.05, .05, .3, W / 2 + .05, 2.0, .13)], metal('#6a6a6a')));
      const tecido = m(c, { r: .55, me: .05 }), preto = m('#1a1a1a', { r: .6 }), visor = m('#1a2a30', { r: .05, me: .5 });
      for (let i = 0; i < n; i++) {
        const t = G(); t.position.set(-W / 2 + (i + .5) * esp, 0, .3); g.add(t);
        t.add(juntar([esfG(.16, 0, 1.82, 0, 1.05, 1.15, 1), cilC(.24, .2, .66, 0, 1.36, 0, 12), esfG(.24, 0, 1.6, 0, 1, .5, .75, 10), cilC(.08, .07, .62, -.27, 1.25, 0, 8, 0, 0, .08), cilC(.08, .07, .62, .27, 1.25, 0, 8, 0, 0, -.08), cilC(.1, .09, .78, -.1, .62, 0, 8), cilC(.1, .09, .78, .1, .62, 0, 8)].map(q => tf(q, 0, 0, 0, 0, 0, 0, 1, 1, .72)), tecido));
        t.add(juntar([esfG(.06, -.29, .92, 0, 1, 1.3, .8, 7), esfG(.06, .29, .92, 0, 1, 1.3, .8, 7), ret(.13, .12, .2, -.1, .16, .03), ret(.13, .12, .2, .1, .16, .03), cil(.012, .012, .2, 0, 1.97, 0, 5)], preto));
        const vs = mesh(t, esfG(.11, 0, 1.84, .1, 1.1, .7, .4, 12), visor);
        const bojo = sf(t, .13, tecido, 0, 1.3, .1, 10); bojo.scale.set(1, 1.2, .8);
        const ph = r() * 9; anim.push((dt, tt) => { const k = Math.sin(tt * .17 + ph); const mx = k > .7 ? (k - .7) * 3.3 : 0; bojo.position.set(Math.sin(tt * .6 + ph) * .08, 1.15 + Math.sin(tt * .4 + ph) * .3, .1 + mx * .06); t.rotation.y = Math.sin(tt * .9 + ph) * (mx * .25 + .015); });
      }
      return g;
    };
    // cadeira de controle de encosto alto (couro escuro, intacta)
    P.a3_poltrona = o => {
      const g = G(), cou = m(o.c || '#2a2420', { r: .35, me: .05 }), aco = metal('#4a4a4a');
      const gs = [cil(.035, .035, .42, 0, .08, 0, 10)]; for (let i = 0; i < 5; i++) { const an = i / 5 * TAU; gs.push(barra([0, .08, 0], [Math.cos(an) * .34, .05, Math.sin(an) * .34], .025, 6)); }
      g.add(juntar(gs, aco)); g.add(juntar([0, 1, 2, 3, 4].map(i => esfG(.035, Math.cos(i / 5 * TAU) * .34, .035, Math.sin(i / 5 * TAU) * .34, 1, 1, 1, 6)), m('#111')));
      g.add(juntar([ret(.56, .12, .54, 0, .48, .02), ret(.54, .9, .12, 0, .62, -.26, -.12, 0, 0), esfG(.16, 0, 1.55, -.32, 1.5, .7, .5, 10), ret(.08, .06, .4, -.32, .72, .02), ret(.08, .06, .4, .32, .72, .02), ret(.04, .16, .04, -.32, .56, .1), ret(.04, .16, .04, .32, .56, .1)], cou));
      return g;
    };

    /* ================= ESGOTO ================= */
    // boca de cano de esgoto saindo da parede (fundo em z=0), com fio de água escorrendo
    P.a3_saida_esgoto = o => {
      const g = G(), R = o.raio || .42, y = o.y ?? .55, mt = m('#5a5a50', { tex: 'concreto_sujo', r: .9 });
      g.add(juntar([cilC(R + .08, R + .08, .5, 0, y, .25, 20, PI / 2, 0, 0, true), torG(R + .04, .06, 0, y, .5, 0, 0, 0, 20)], m('#5a5a50', { tex: 'concreto_sujo', r: .9, lado: 2 })));
      const fundo = mesh(g, new T.CircleGeometry(R + .06, 20), m('#030302', { r: 1 })); fundo.position.set(0, y, .02);
      g.add(juntar([-1, 0, 1].map(s => cilC(.018, .018, R * 1.9, s * R * .45, y, .46, 6)), metal('#3a2a20')));
      const agua = m('#3a3a26', { unico: true, tex: 'agua', rep: [1, 3], op: .75, r: .05, me: .2 });
      const fio = pl(g, R * .9, y - R + .05, agua, 0, (y - R) / 2, .55); fio.rotation.x = -.15;
      const lodo = canvasMat(128, 128, (x, W, H) => { x.clearRect(0, 0, W, H); const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(40,46,20,.8)'); gr.addColorStop(1, 'rgba(40,46,20,0)'); x.fillStyle = gr; x.fillRect(W * .2, 0, W * .6, H); }, { transp: true });
      decal(lodo); pl(g, R * 1.6, y - R + .1, lodo, 0, (y - R) / 2, .02);
      anim.push(dt => { agua.map.offset.y -= dt * .8; });
      return g;
    };
    // coisas se mexendo embaixo da água (formas escuras, alongadas; decorativo)
    P.a3_sob_agua = o => {
      const g = G(), r = rng(o.sem || 113), n = o.n || 5, w = o.w || 7, d = o.d || 7, mt = m('#0a0806', { op: .55, r: .3 });
      const cs = []; for (let i = 0; i < n; i++) { const c = mesh(g, new T.SphereGeometry(.2, 10, 6), mt); c.scale.set(.6 + r() * .6, .12, 2 + r() * 1.5); cs.push([c, r() * 9, .2 + r() * .25, .8 + r() * 1.4]); }
      anim.push((dt, t) => cs.forEach(([c, f, v, R]) => { const a = t * v + f; c.position.set(Math.max(-w / 2, Math.min(w / 2, Math.cos(a) * R * 1.6 + Math.sin(f) * w * .25)), .04, Math.max(-d / 2, Math.min(d / 2, Math.sin(a * 1.3) * R + Math.cos(f) * d * .25))); c.rotation.y = -a + PI / 2; }));
      return g;
    };
    // escada de marinheiro na parede (fundo em z=0) até um alçapão no teto
    P.a3_escada_parede = o => {
      const g = G(), w = o.w || .5, mt = m('#4a3a2e', { tex: 'ferrugem', me: .6, r: .5 });
      const gs = [ret(.05, ALT, .05, -w / 2, 0, .2), ret(.05, ALT, .05, w / 2, 0, .2), ret(.05, .05, .2, -w / 2, .5, .1), ret(.05, .05, .2, w / 2, .5, .1), ret(.05, .05, .2, -w / 2, 2.4, .1), ret(.05, .05, .2, w / 2, 2.4, .1)];
      for (let y = .3; y < ALT - .1; y += .3) gs.push(cilC(.018, .018, w, 0, y, .2, 6, 0, 0, PI / 2));
      gs.push(ret(.8, .04, .8, 0, ALT - .04, .4));
      g.add(juntar(gs, mt));
      return g;
    };
  });
})();

/* ===================== 4º andar ===================== */
/* props_a4.js · objetos 3D extras (relíquias, carne brotando, fendas, móveis de época…).
   Tudo genérico: textos, cores e quantidades vêm do arquivo de cenas. */
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  NS.extensoes = NS.extensoes || [];
  NS.extensoes.push(F => {
    const { P, m, bx, cy, sf, pl, luz, G, metal, tela, texCanvas, T, rng, anim, textoTex, guardar, ALT } = F;
    const canvasMat = (w, h, desenha, o = {}) => { const [c, x] = tela(w, h); desenha(x, c.width, c.height); const t = texCanvas(c); const mt = m('#ffffff', { unico: true, mapa: t, r: o.r ?? .8, me: o.me ?? 0 }); if (o.brilho) { mt.emissive = new T.Color('#ffffff'); mt.emissiveMap = t; mt.emissiveIntensity = o.brilho; } if (o.transp) mt.transparent = true; if (o.lado) mt.side = T.DoubleSide; if (o.alfa) { mt.alphaTest = o.alfa; mt.transparent = false; } return mt; };
    function juntar(geos, mat) {
      let nv = 0; const gs = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; nv += n.attributes.position.count; return n; });
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2); let k = 0;
      gs.forEach(g => { pos.set(g.attributes.position.array, k * 3); nor.set(g.attributes.normal.array, k * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, k * 2); k += g.attributes.position.count; g.dispose(); });
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
      return new T.Mesh(guardar(geo), mat);
    }
    const rot = (g, rx, ry, rz) => { if (rx || ry || rz) g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0))); return g; };
    const ret = (w, h, d, x, y, z, rx, ry, rz) => { const g = rot(new T.BoxGeometry(w, h, d), rx, ry, rz); g.translate(x, y + h / 2, z); return g; };
    const cil = (r1, r2, h, x, y, z, seg = 10, rx, ry, rz) => { const g = rot(new T.CylinderGeometry(r1, r2, h, seg), rx, ry, rz); g.translate(x, y + h / 2, z); return g; };
    const esf = (r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 10) => { const g = new T.SphereGeometry(r, seg, Math.max(6, seg * .7)); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
    const tuboG = (pts, r, seg = 16, rs = 6) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), seg, r, rs);
    const add = (g, geos, mat) => { if (geos.length) g.add(juntar(geos, mat)); };
    const carneMat = (c, o = {}) => m(c || '#8a3236', { tex: 'carne', rep: o.rep || [1, 1], r: .38, e: '#2a0406', ei: .35, lado: 2, ...(o.unico ? { unico: true } : {}) });

    /* ---------- carne brotando da parede (decalque com volume) ---------- */
    P.a4_carne_parede = o => {
      const g = G(), w = o.w || 1.2, h = o.h || 1.0, y = o.y ?? .3, r = rng(o.sem || 401);
      const pts = 14, raios = Array.from({ length: pts }, () => .62 + r() * .38);
      const raioEm = a => { const f = (a / (Math.PI * 2)) * pts, i = Math.floor(f) % pts, t = f - Math.floor(f); return raios[i] * (1 - t) + raios[(i + 1) % pts] * t; };
      const mt = canvasMat(256, 256, (x, W, H) => {
        x.clearRect(0, 0, W, H); x.beginPath();
        for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2, rr = raioEm(a) * W * .48; x.lineTo(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr); }
        x.closePath(); x.fillStyle = o.c || '#7a2a2c'; x.fill(); x.save(); x.clip();
        for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${150 + r() * 80},${30 + r() * 50},${40 + r() * 40},${.2 + r() * .3})`; x.beginPath(); x.ellipse(r() * W, r() * H, 6 + r() * 26, 4 + r() * 16, r() * 3, 0, 7); x.fill(); }
        x.strokeStyle = 'rgba(40,0,6,.6)'; for (let i = 0; i < 14; i++) { x.lineWidth = 1 + r() * 2.5; x.beginPath(); let px = W / 2, py = H / 2; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - .5) * 70; py += (r() - .5) * 70; x.lineTo(px, py); } x.stroke(); }
        x.restore(); x.lineWidth = 7; x.strokeStyle = 'rgba(30,8,6,.85)'; x.stroke();
      }, { r: .35, alfa: .4, lado: true });
      mt.emissive = new T.Color('#3a0408'); mt.emissiveIntensity = .5;
      const geo = new T.PlaneGeometry(w, h, 16, 12), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const px = p.getX(i) / (w / 2), py = p.getY(i) / (h / 2), d = Math.sqrt(px * px + py * py); const a = Math.atan2(py, px), lim = raioEm((a + Math.PI * 2) % (Math.PI * 2)); const k = Math.max(0, 1 - d / lim); p.setZ(i, (o.prof ?? .14) * Math.pow(k, .7) * (1 + .25 * Math.sin(px * 7 + py * 5))); }
      geo.computeVertexNormals();
      const me = new T.Mesh(guardar(geo), mt); me.position.set(0, y + h / 2, .02); g.add(me);
      const f = r() * 6; anim.push((dt, t) => { me.scale.z = 1 + Math.max(0, Math.sin(t * 1.1 + f)) ** 4 * .25; });
      return g;
    };

    /* ---------- fratura na realidade: rachadura negra com luz vazando ---------- */
    P.a4_fratura = o => {
      const g = G(), w = o.w || .9, h = o.h || 2.2, y = o.y ?? .2, r = rng(o.sem || 403), cor = o.cor || '#ffd9a0';
      const mt = canvasMat(128, 512, (x, W, H) => {
        x.clearRect(0, 0, W, H); const esq = [], dir = []; let cx = W / 2;
        for (let i = 0; i <= 24; i++) { const yy = i / 24 * H, larg = (1 - Math.abs(i / 24 - .5) * 2) * W * .16 + 2; cx += (r() - .5) * W * .22; cx = Math.max(W * .25, Math.min(W * .75, cx)); esq.push([cx - larg * (.5 + r()), yy]); dir.push([cx + larg * (.5 + r()), yy]); }
        x.shadowColor = cor; x.shadowBlur = 18; x.fillStyle = cor; x.beginPath(); esq.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); dir.reverse().forEach(([a, b]) => x.lineTo(a, b)); x.closePath(); x.fill();
        x.shadowBlur = 0; x.fillStyle = '#020102'; x.save(); x.scale(1, 1); x.beginPath(); esq.forEach(([a, b], i) => i ? x.lineTo(a + 2, b) : x.moveTo(a + 2, b)); dir.forEach(([a, b]) => x.lineTo(a - 2, b)); x.closePath(); x.fill(); x.restore();
        x.strokeStyle = 'rgba(10,6,4,.8)'; x.lineWidth = 1.5; for (let i = 0; i < 9; i++) { const [a, b] = esq[Math.floor(r() * esq.length)] || [W / 2, H / 2]; x.beginPath(); x.moveTo(a, b); let px = a, py = b; for (let k = 0; k < 4; k++) { px += (r() - .5) * 40; py += (r() - .5) * 40; x.lineTo(px, py); } x.stroke(); }
      }, { brilho: .9, transp: true, lado: true });
      mt.depthWrite = false; mt.polygonOffset = true; mt.polygonOffsetFactor = -2;
      const p = pl(g, w, h, mt, 0, o.chao ? .008 : y + h / 2, o.chao ? 0 : .016);
      if (o.chao) { p.rotation.x = -Math.PI / 2; }
      const f = r() * 9; anim.push((dt, t) => { mt.emissiveIntensity = .7 + Math.sin(t * 1.7 + f) * .25 + (Math.sin(t * 13 + f) > .97 ? .8 : 0); });
      return g;
    };

    /* ---------- rasgo de carne em volta de um vão de porta (estreita a passagem) ---------- */
    P.a4_fenda_portal = o => {
      const g = G(), vw = o.w || 2.4, vh = o.h || 2.2, H = o.alt || ALT, gap = o.gap || .9, larg = vw / 2 + .55, r = rng(o.sem || 405);
      const borda = (s) => { const pts = []; for (let i = 0; i <= 12; i++) { const yy = i / 12 * H, k = Math.pow(1 - yy / H, .8); pts.push([s * (gap / 2 * k + .03 + (r() - .5) * .07 * k), yy]); } return pts; };
      const be = borda(-1), bd = borda(1), L2 = larg + .45;
      const carne = canvasMat(256, 256, (x, W, Hc) => {
        x.fillStyle = o.c || '#6a2228'; x.fillRect(0, 0, W, Hc);
        for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(${140 + r() * 90},${20 + r() * 50},${30 + r() * 40},${.15 + r() * .3})`; x.beginPath(); x.ellipse(r() * W, r() * Hc, 4 + r() * 22, 3 + r() * 12, r() * 3, 0, 7); x.fill(); }
        x.strokeStyle = 'rgba(40,0,6,.55)'; for (let i = 0; i < 26; i++) { x.lineWidth = 1 + r() * 2; x.beginPath(); let px = W / 2 + (r() - .5) * 30, py = r() * Hc; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (px < W / 2 ? -1 : 1) * r() * 30; py += (r() - .5) * 30; x.lineTo(px, py); } x.stroke(); }
        const gr = x.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(10,2,2,.55)'); gr.addColorStop(.2, 'rgba(10,2,2,0)'); gr.addColorStop(.38, 'rgba(10,2,2,.15)'); gr.addColorStop(.5, 'rgba(8,0,0,.92)'); gr.addColorStop(.62, 'rgba(10,2,2,.15)'); gr.addColorStop(.8, 'rgba(10,2,2,0)'); gr.addColorStop(1, 'rgba(10,2,2,.55)'); x.fillStyle = gr; x.fillRect(0, 0, W, Hc);
      }, { r: .4, lado: true });
      carne.emissive = new T.Color('#3a0408'); carne.emissiveIntensity = .45;
      // painel de carne com a fenda no meio (no plano da parede), borda externa bem irregular
      const fora = s => { const pts = []; for (let i = 14; i >= 0; i--) { const yy = i / 14 * H, k = Math.sin(i / 14 * Math.PI); pts.push([s * (larg - .15 + k * (r() * .5) - (1 - k) * .1 + (r() - .5) * .25), yy]); } return pts; };
      const sh = new T.Shape(); sh.moveTo(-larg + .1, 0); be.forEach(([a, b]) => sh.lineTo(a, b)); fora(-1).forEach(([a, b]) => sh.lineTo(a, b));
      const sh2 = new T.Shape(); sh2.moveTo(larg - .1, 0); bd.forEach(([a, b]) => sh2.lineTo(a, b)); fora(1).forEach(([a, b]) => sh2.lineTo(a, b));
      [sh, sh2].forEach(s => { const geo = new T.ShapeGeometry(s, 6); const uv = geo.attributes.uv, ps = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (ps.getX(i) + L2) / (2 * L2), ps.getY(i) / H); const me = new T.Mesh(guardar(geo), carne); me.position.z = .03; g.add(me); });
      // escuro quente acima do vão (a fenda continua até o teto)
      const esc = new T.Shape(); be.filter(([, b]) => b >= vh - .05).forEach(([a, b], i) => i ? esc.lineTo(a, b) : esc.moveTo(a, b)); bd.filter(([, b]) => b >= vh - .05).reverse().forEach(([a, b]) => esc.lineTo(a, b));
      const me2 = new T.Mesh(guardar(new T.ShapeGeometry(esc)), m('#0a0203', { r: 1, e: '#1a0204', ei: .6 })); me2.position.z = .025; g.add(me2);
      // lábios macios ao longo das bordas
      const labios = G(); g.add(labios);
      [be, bd].forEach(b => { const pts = b.map(([a, yy], i) => [a * 1.04, yy, .09 + Math.sin(i * 1.7) * .02]); labios.add(new T.Mesh(guardar(tuboG(pts, .085, 40, 8)), carneMat('#8a3a3c'))); });
      // veias se espalhando pela parede
      const veias = []; for (let i = 0; i < 10; i++) { const s = i % 2 ? 1 : -1, y0 = .3 + r() * (H - .6); let px = s * (gap / 2 + .1), py = y0; const pts = [[px, py, .05]]; for (let k = 0; k < 4; k++) { px += s * (.25 + r() * .35); py += (r() - .5) * .5; pts.push([px, py, .04]); } veias.push(tuboG(pts, .018 + r() * .015, 12, 5)); }
      add(g, veias, m('#4a0e12', { r: .4, e: '#2a0004', ei: .4 }));
      luz(g, '#ff5a3a', o.i ?? .7, 4.5, 0, .9, .3, true);
      anim.push((dt, t) => { const k = 1 + Math.sin(t * .9) * .06; labios.scale.set(1, 1, k * 1.3); labios.children.forEach((c, i) => { c.position.x = (i ? 1 : -1) * Math.sin(t * .9) * .03; }); });
      return g;
    };

    /* ---------- calendário de parede ---------- */
    P.a4_calendario = o => {
      const g = G(), w = o.w || .44, h = o.h || .62, y = o.y ?? 1.25, r = rng(o.sem || 407);
      const mt = canvasMat(256, 360, (x, W, H) => {
        x.fillStyle = '#ece4cc'; x.fillRect(0, 0, W, H);
        const gr = x.createLinearGradient(0, 0, 0, 140); gr.addColorStop(0, o.c1 || '#6a8ab0'); gr.addColorStop(1, o.c2 || '#c8a060'); x.fillStyle = gr; x.fillRect(10, 10, W - 20, 130);
        x.fillStyle = 'rgba(30,40,20,.7)'; x.beginPath(); x.moveTo(10, 140); for (let i = 0; i <= 10; i++) x.lineTo(10 + i * (W - 20) / 10, 100 + r() * 30); x.lineTo(W - 10, 140); x.fill();
        x.fillStyle = o.cor || '#a01818'; x.font = 'bold 26px Georgia, serif'; x.textAlign = 'center'; x.fillText(o.titulo || '', W / 2, 172);
        const dias = o.dias || 31, ini = o.inicio || 0, cw = (W - 20) / 7;
        x.font = 'bold 13px Arial'; x.fillStyle = '#333'; (o.semana || ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']).forEach((d, i) => x.fillText(d, 10 + cw * (i + .5), 196));
        x.font = 'bold 17px Arial';
        for (let d = 1; d <= dias; d++) { const k = d - 1 + ini, cx = 10 + cw * (k % 7 + .5), cy = 220 + Math.floor(k / 7) * 26; x.fillStyle = k % 7 === 6 ? '#b02020' : '#222'; x.fillText(String(d), cx, cy); if (d === o.dia) { x.strokeStyle = '#c01010'; x.lineWidth = 3; x.beginPath(); x.ellipse(cx, cy - 6, 15, 12, 0, 0, 7); x.stroke(); } if (o.riscados && d < o.dia) { x.strokeStyle = 'rgba(30,30,30,.7)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 9, cy - 14); x.lineTo(cx + 9, cy + 2); x.stroke(); } }
        for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(90,70,30,${r() * .08})`; x.fillRect(r() * W, r() * H, 3, 3); }
      }, { r: .95 });
      const p = pl(g, w, h, mt, 0, y + h / 2, .012); p.rotation.z = (r() - .5) * .06;
      sf(g, .012, metal('#777'), 0, y + h + .02, .02, 6);
      return g;
    };

    /* ---------- televisor de tubo (jornal, imagem de teste, chuvisco) ---------- */
    P.a4_tv_jornal = o => {
      const g = G(), pe = !!o.pe, y = o.y ?? (pe ? .48 : 0), cas = m(o.c || '#4a3020', { tex: 'madeira_velha', r: .6 }), preto = m('#151515', { r: .5 });
      if (pe) { add(g, [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => cil(.014, .01, .48, a * .3, 0, b * .18, 6, b * .12, 0, -a * .12)), metal('#2a2a2a')); }
      add(g, [ret(.76, .58, .5, 0, y, -.02), ret(.8, .04, .52, 0, y - .02, -.02)], cas);
      add(g, [ret(.6, .46, .04, -.06, y + .06, .23), ret(.12, .44, .02, .3, y + .07, .235)], preto);
      for (let i = 0; i < 3; i++) { const k = cy(g, .022, .022, .025, m('#c8c0a8'), .3, y + .42 - i * .1, .25, 10); k.rotation.x = Math.PI / 2; }
      add(g, [cil(.004, .004, .55, -.1, y + .58, -.05, 4, 0, 0, .5), cil(.004, .004, .55, .1, y + .58, -.05, 4, 0, 0, -.5)], metal('#aaa'));
      const [c, x] = tela(256, 192), t = texCanvas(c), tm = m('#ffffff', { unico: true, mapa: t, e: '#ffffff', ei: 1.15 }); tm.emissiveMap = t;
      const tl = pl(g, .52, .39, tm, -.06, y + .095 + .195, .253);
      const modo = o.modo || 'jornal', r = rng(o.sem || 409); let pos = 256, ult = -1;
      const pinta = tt => {
        if (modo === 'estatica') { const im = x.createImageData(256, 192); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 230; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); }
        else if (modo === 'mira') { const cs = ['#e8e8e8', '#e8e820', '#20e8e8', '#20e820', '#e820e8', '#e82020', '#2020e8']; cs.forEach((cc, i) => { x.fillStyle = cc; x.fillRect(i * 256 / 7, 0, 256 / 7 + 1, 192); }); x.strokeStyle = '#111'; x.lineWidth = 3; x.beginPath(); x.arc(128, 96, 70, 0, 7); x.stroke(); x.fillStyle = '#111'; x.fillRect(60, 84, 136, 24); x.fillStyle = '#eee'; x.font = 'bold 16px monospace'; x.textAlign = 'center'; x.fillText(o.txt || '', 128, 102); for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * .3})`; x.fillRect(Math.random() * 256, Math.random() * 192, 2, 1); } }
        else {
          const gr = x.createLinearGradient(0, 0, 256, 192); gr.addColorStop(0, '#0a2a6a'); gr.addColorStop(1, '#1a5aa0'); x.fillStyle = gr; x.fillRect(0, 0, 256, 192);
          x.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 6; i++) x.fillRect(150 + i * 14, 20, 6, 90);
          x.fillStyle = '#1a1a22'; x.beginPath(); x.ellipse(96, 66, 22, 27, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(96, 140, 58, 44, 0, 0, 7); x.fill(); x.fillStyle = '#c89a7a'; x.beginPath(); x.ellipse(96, 70, 17, 22, 0, 0, 7); x.fill();
          x.fillStyle = '#c01818'; x.fillRect(0, 124, 256, 28); x.fillStyle = '#fff'; x.font = 'bold 15px Arial'; x.textAlign = 'left'; x.fillText(o.txt || '', 8, 143);
          x.fillStyle = '#f0f0f0'; x.fillRect(0, 152, 256, 22); x.fillStyle = '#111'; x.font = 'bold 13px Arial'; x.fillText(o.txt2 || '', pos, 168);
          x.fillStyle = '#fff'; x.font = 'bold 12px Arial'; x.textAlign = 'right'; x.fillText(o.canal || 'AO VIVO', 248, 18); if (o.hora) x.fillText(o.hora, 248, 34);
          for (let i = 0; i < 192; i += 3) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, i, 256, 1); }
        }
        t.needsUpdate = true;
      };
      pinta(0); anim.push((dt, tt) => { if (modo === 'mira') return; if (tt - ult < (modo === 'estatica' ? .07 : .08)) return; ult = tt; pos -= 3; if (pos < -x.measureText(o.txt2 || '').width - 20) pos = 256; pinta(tt); tm.emissiveIntensity = 1.1 + (Math.random() < .03 ? -.5 : 0); });
      if (o.luz !== false) luz(g, modo === 'jornal' ? '#9ab8ff' : '#d0d8ff', o.i ?? .55, 3.5, -.06, y + .3, .7, true);
      return g;
    };
  });
})();
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  NS.extensoes = NS.extensoes || [];
  NS.extensoes.push(F => {
    const { P, m, bx, cy, sf, pl, luz, G, metal, tela, texCanvas, T, rng, anim, textoTex, guardar, ALT } = F;
    const canvasMat = (w, h, desenha, o = {}) => { const [c, x] = tela(w, h); desenha(x, c.width, c.height); const t = texCanvas(c); const mt = m('#ffffff', { unico: true, mapa: t, r: o.r ?? .8, me: o.me ?? 0 }); if (o.brilho) { mt.emissive = new T.Color('#ffffff'); mt.emissiveMap = t; mt.emissiveIntensity = o.brilho; } if (o.transp) mt.transparent = true; if (o.lado) mt.side = T.DoubleSide; if (o.alfa) mt.alphaTest = o.alfa; return mt; };
    function juntar(geos, mat) {
      let nv = 0; const gs = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; nv += n.attributes.position.count; return n; });
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2); let k = 0;
      gs.forEach(g => { pos.set(g.attributes.position.array, k * 3); nor.set(g.attributes.normal.array, k * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, k * 2); k += g.attributes.position.count; g.dispose(); });
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
      return new T.Mesh(guardar(geo), mat);
    }
    const rot = (g, rx, ry, rz) => { if (rx || ry || rz) g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0))); return g; };
    const ret = (w, h, d, x, y, z, rx, ry, rz) => { const g = rot(new T.BoxGeometry(w, h, d), rx, ry, rz); g.translate(x, y + h / 2, z); return g; };
    const cil = (r1, r2, h, x, y, z, seg = 10, rx, ry, rz) => { const g = rot(new T.CylinderGeometry(r1, r2, h, seg), rx, ry, rz); g.translate(x, y + h / 2, z); return g; };
    const esf = (r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 10) => { const g = new T.SphereGeometry(r, seg, Math.max(6, seg * .7)); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
    const add = (g, geos, mat) => { if (geos.length) g.add(juntar(geos, mat)); };
    const vidro = () => m('#cfe4ee', { op: .16, r: .05, me: .2 });

    /* ---------- cristaleira / estante de sala (armário embaixo, vitrine em cima) ---------- */
    P.a4_cristaleira = o => {
      const g = G(), w = o.w || 1.8, h = o.h || 2.0, d = o.d || .45, r = rng(o.sem || 421), mad = m(o.c || '#4a2e1c', { tex: 'madeira_velha', r: .6 }), hb = .82;
      add(g, [ret(w, hb, d, 0, 0, 0), ret(w + .04, .04, d + .04, 0, hb, 0), ret(.04, h - hb, d, -w / 2 + .02, hb, 0), ret(.04, h - hb, d, w / 2 - .02, hb, 0), ret(w, h - hb, .02, 0, hb, -d / 2 + .01), ret(w + .08, .07, d + .06, 0, h, 0), ret(w, .025, d - .04, 0, hb + .4, 0)], mad);
      const nP = Math.max(2, Math.round(w / .5)), portas = [], puxa = [];
      for (let i = 0; i < nP; i++) { const x0 = -w / 2 + w / nP * (i + .5); portas.push(ret(w / nP - .03, hb - .1, .015, x0, .05, d / 2 + .005)); puxa.push(cil(.012, .012, .02, x0 + (i % 2 ? -1 : 1) * (w / nP / 2 - .07), hb * .55, d / 2 + .02, 8, Math.PI / 2)); }
      add(g, portas, m(o.c2 || '#5a3824', { tex: 'madeira_velha', r: .55 })); add(g, puxa, metal('#b89a50'));
      bx(g, w - .06, h - hb - .06, .012, vidro(), 0, hb + .03, d / 2 - .01);
      const lou = [], esc = [], liv = [];
      [hb + .03, hb + .43].forEach((yy, k) => {
        if (o.livros && k === 1) { let px = -w / 2 + .08; while (px < w / 2 - .1) { const ww = .03 + r() * .03, hh = .22 + r() * .1; liv.push(ret(ww, hh, .2, px, yy, -.05, 0, 0, (r() - .5) * .08)); px += ww + .005; } return; }
        for (let px = -w / 2 + .14; px < w / 2 - .1; px += .2 + r() * .1) { const t = r(); if (t < .45) lou.push(cil(.09, .09, .012, px, yy + .1, -.12, 18, 1.3)); else if (t < .75) { lou.push(cil(.035, .03, .08, px, yy, .02, 10)); } else esc.push(cil(.04, .06, .16 + r() * .1, px, yy, 0, 10)); }
      });
      add(g, lou, m('#ece8de', { r: .25 })); add(g, esc, m(o.c3 || '#2a6a5a', { r: .2, me: .2 }));
      if (liv.length) add(g, liv, m('#6a2a1e', { r: .8 }));
      return g;
    };

    /* ---------- aparador (gavetas e portas, enfeites em cima) ---------- */
    P.a4_aparador = o => {
      const g = G(), w = o.w || 1.6, h = o.h || .85, d = o.d || .45, r = rng(o.sem || 423), mad = m(o.c || '#3a2416', { tex: 'madeira_velha', r: .55 });
      add(g, [ret(w, h - .1, d, 0, .1, 0), ret(w + .06, .04, d + .05, 0, h, 0)].concat([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => cil(.03, .022, .1, a * (w / 2 - .06), 0, b * (d / 2 - .06), 8))), mad);
      const fr = [], pux = [];
      for (let i = 0; i < 3; i++) { const x0 = -w / 2 + w / 3 * (i + .5); fr.push(ret(w / 3 - .04, .16, .012, x0, h - .22, d / 2 + .006)); fr.push(ret(w / 3 - .04, h - .42, .012, x0, .16, d / 2 + .006)); pux.push(cil(.014, .014, .02, x0, h - .14, d / 2 + .02, 8, Math.PI / 2)); pux.push(cil(.012, .012, .02, x0 + .12, .4, d / 2 + .02, 8, Math.PI / 2)); }
      add(g, fr, m(o.c2 || '#4a2e1c', { tex: 'madeira_velha', r: .5 })); add(g, pux, metal('#b89a50'));
      const it = o.tralha ?? 4, cer = [], vid = [];
      for (let i = 0; i < it; i++) { const px = (i - (it - 1) / 2) * (w / it), k = r(); if (k < .35) { vid.push(cil(.06, .08, .2 + r() * .15, px, h + .04, 0, 12)); } else if (k < .7) { cer.push(ret(.18, .22, .02, px, h + .04, -.08, -.15)); cer.push(ret(.03, .1, .06, px, h + .04, -.04)); } else { cer.push(cil(.05, .06, .03, px, h + .04, 0, 10)); cer.push(cil(.012, .012, .25, px, h + .07, 0, 6)); } }
      add(g, cer, m('#8a6a3a', { me: .5, r: .4 })); add(g, vid, m(o.c3 || '#5a7a8a', { r: .25 }));
      if (o.toalha) bx(g, w * .6, .006, d + .1, m(o.toalha, { r: .9 }), 0, h + .04, 0);
      return g;
    };

    /* ---------- contador Geiger (ponteiro tremendo, luz piscando) ---------- */
    P.a4_contador_geiger = o => {
      const g = G(), cx = m(o.c || '#c8b24a', { r: .5, me: .2 }), preto = m('#1a1a1a', { r: .5 });
      add(g, [ret(.24, .12, .14, 0, 0, 0)], cx); add(g, [ret(.25, .02, .02, 0, .12, -.02), ret(.02, .06, .02, -.11, .12, -.02), ret(.02, .06, .02, .11, .12, -.02)], preto);
      const mostr = pl(g, .1, .065, m('#f2ecd8', { r: .6 }), -.05, .07, .072);
      const pont = G(); pont.position.set(-.05, .045, .074); g.add(pont); bx(pont, .003, .05, .002, m('#c01010'), 0, 0, 0);
      const lamp = sf(g, .012, m('#ffffff', { unico: true, e: '#ff3010', ei: 1 }), .06, .08, .072, 8);
      const sonda = cy(g, .02, .02, .22, metal('#8a8e92'), .22, .01, .05, 10); sonda.rotation.z = Math.PI / 2; sonda.position.set(.25, .02, .06);
      const cab = new T.Mesh(guardar(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(.1, .05, .06), new T.Vector3(.16, .01, .12), new T.Vector3(.14, .02, .06)]), 10, .006, 5)), preto); g.add(cab);
      anim.push((dt, t) => { pont.rotation.z = -.6 + Math.random() * .5 + Math.sin(t * 3) * .2; lamp.material.emissiveIntensity = Math.random() < .35 ? 2.2 : .2; });
      return g;
    };

    /* ---------- transmissor de rádio em gabinete (mostradores, ponteiros, válvulas) ---------- */
    P.a4_transmissor = o => {
      const g = G(), w = o.w || 1.0, h = o.h || 1.9, d = o.d || .55, r = rng(o.sem || 425), cas = m(o.c || '#5a6a58', { tex: 'metal_sujo', me: .35, r: .55 });
      add(g, [ret(w, h, d, 0, 0, 0), ret(w + .04, .05, d + .04, 0, h, 0), ret(w + .04, .08, d + .04, 0, 0, 0)], cas);
      const [c, x] = tela(256, 512), t = texCanvas(c), mt = m('#ffffff', { unico: true, mapa: t, r: .6, e: '#ffffff', ei: .35 }); mt.emissiveMap = t;
      const desenha = tt => {
        x.fillStyle = o.f || '#4a5a48'; x.fillRect(0, 0, 256, 512); for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(0,0,0,${r() * .08})`; x.fillRect(r() * 256, r() * 512, 2, 2); }
        x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 3; [[8, 8, 240, 150], [8, 166, 240, 150], [8, 324, 240, 180]].forEach(([a, b, cc, dd]) => x.strokeRect(a, b, cc, dd));
        x.fillStyle = '#f0e6c8'; x.fillRect(24, 22, 208, 60); x.strokeStyle = '#2a2a2a'; x.lineWidth = 1; for (let i = 0; i <= 40; i++) { x.beginPath(); x.moveTo(28 + i * 5, 26); x.lineTo(28 + i * 5, i % 5 ? 36 : 44); x.stroke(); }
        x.fillStyle = '#2a2a2a'; x.font = 'bold 10px monospace'; for (let i = 0; i <= 8; i++) x.fillText(String(2 + i * 2), 24 + i * 25, 58);
        const fx = 40 + (Math.sin(tt * .2) * .5 + .5) * 170; x.fillStyle = '#c01010'; x.fillRect(fx, 22, 2, 60);
        [[70, 120], [186, 120]].forEach(([a, b], k) => { x.fillStyle = '#efe6cc'; x.beginPath(); x.arc(a, b, 28, Math.PI, 0); x.fill(); x.strokeStyle = '#222'; x.beginPath(); x.arc(a, b, 28, Math.PI, 0); x.stroke(); const ang = Math.PI + .3 + (Math.abs(Math.sin(tt * (2 + k) + k)) * .8 + Math.random() * .15) * 2.2; x.strokeStyle = '#111'; x.lineWidth = 2; x.beginPath(); x.moveTo(a, b); x.lineTo(a + Math.cos(ang) * 25, b + Math.sin(ang) * 25); x.stroke(); x.lineWidth = 1; });
        for (let i = 0; i < 4; i++) { x.fillStyle = '#1a1a1a'; x.beginPath(); x.arc(40 + i * 58, 220, 20, 0, 7); x.fill(); x.fillStyle = '#ddd'; x.fillRect(38 + i * 58, 202, 4, 14); }
        for (let i = 0; i < 8; i++) { x.fillStyle = '#222'; x.fillRect(24 + i * 27, 266, 10, 22); x.fillStyle = '#ccc'; x.fillRect(26 + i * 27, (i * 7 + Math.floor(tt)) % 3 ? 266 : 276, 6, 10); x.fillStyle = (Math.sin(tt * 3 + i) > 0) ? '#ff5020' : '#401008'; x.beginPath(); x.arc(29 + i * 27, 300, 4, 0, 7); x.fill(); }
        for (let i = 0; i < 5; i++) { const gr = x.createRadialGradient(40 + i * 44, 400, 2, 40 + i * 44, 400, 22); gr.addColorStop(0, '#ffd080'); gr.addColorStop(.5, '#ff7020'); gr.addColorStop(1, '#201008'); x.fillStyle = gr; x.fillRect(22 + i * 44, 360, 36, 80); }
        x.fillStyle = '#e8e0c8'; x.fillRect(40, 456, 176, 30); x.fillStyle = '#1a1a1a'; x.font = 'bold 16px Arial'; x.textAlign = 'center'; x.fillText(o.txt || '', 128, 477); x.textAlign = 'left';
        t.needsUpdate = true;
      };
      desenha(0); let ult = 0; anim.push((dt, tt) => { if (tt - ult < .15) return; ult = tt; desenha(tt); });
      pl(g, w - .08, h - .2, mt, 0, h / 2 + .02, d / 2 + .005);
      for (let i = 0; i < 4; i++) { const k = cy(g, .035, .035, .04, m('#1a1a1a', { r: .4 }), -w / 2 + .16 + i * (w - .3) / 3, h * .555, d / 2 + .02, 14); k.rotation.x = Math.PI / 2; }
      return g;
    };

    /* ---------- cama de parto (estribos, correias, lençol manchado) ---------- */
    P.a4_cama_parto = o => {
      const g = G(), aco = metal('#9aa0a6'), r = rng(o.sem || 427), L = 1.9, w = .8;
      add(g, [ret(w, .06, L, 0, .72, 0), ret(.08, .05, L - .1, -w / 2 + .05, .3, 0), ret(.08, .05, L - .1, w / 2 - .05, .3, 0)].concat([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => cil(.03, .03, .72, a * (w / 2 - .06), 0, b * (L / 2 - .08), 8))), aco);
      const lenc = canvasMat(256, 256, (x, W, H) => { x.fillStyle = o.lencol || '#d8cfc0'; x.fillRect(0, 0, W, H); for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(${100 + r() * 50},${r() * 12},${r() * 12},${.3 + r() * .5})`; x.beginPath(); x.ellipse(W * .5 + (r() - .5) * 120, H * .7 + (r() - .5) * 90, 6 + r() * 34, 4 + r() * 22, r() * 3, 0, 7); x.fill(); } x.fillStyle = 'rgba(60,40,20,.15)'; x.fillRect(0, 0, W, H); }, { r: .85 });
      add(g, [ret(w - .04, .14, L * .55, 0, .78, L * .2)], lenc);
      const enc = G(); enc.position.set(0, .8, -L * .08); enc.rotation.x = -.6; g.add(enc); bx(enc, w - .04, .12, L * .42, lenc, 0, 0, -L * .21);
      [-1, 1].forEach(s => { const est = G(); est.position.set(s * .28, .85, L / 2 + .05); g.add(est); const h = cy(est, .015, .015, .55, aco, 0, 0, 0, 6); h.rotation.x = .7; bx(est, .12, .03, .22, m('#2a2a2a', { r: .5 }), 0, .45, .35).rotation.x = -.6; });
      const tira = m('#3a2414', { r: .6 }); [[0, .92, -.25], [0, .92, .55]].forEach(([a, b, c]) => bx(g, w + .06, .02, .07, tira, a, b, c));
      [-1, 1].forEach(s => { bx(g, .05, .1, .22, tira, s * (w / 2 + .04), .82, -.1); });
      for (let i = 0; i < 5; i++) cy(g, .006, .003, .3 + r() * .3, m('#4a0404', { r: .2 }), (r() - .5) * w, .35 + r() * .2, L * .3 + (r() - .5) * .5, 4);
      return g;
    };

    /* ---------- berço de vidro com manta de retalhos (vazio e morno) ---------- */
    P.a4_berco = o => {
      const g = G(), n = o.n || 1, esp = o.esp || .78, r = rng(o.sem || 429), aco = metal('#b8bcc0'), est = [], vid = [], mant = [];
      const manta = canvasMat(256, 256, (x, W, H) => { const tons = ['#c99a80', '#b88068', '#d8b098', '#a87060', '#e0c0a8', '#9a6050']; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.fillStyle = tons[Math.floor(r() * tons.length)]; x.fillRect(i * 64 + (r() - .5) * 8, j * 64 + (r() - .5) * 8, 70, 70); } x.strokeStyle = '#2a1008'; x.lineWidth = 2; for (let k = 0; k <= 4; k++) for (let s = 0; s < 256; s += 9) { x.beginPath(); x.moveTo(k * 64 - 4, s); x.lineTo(k * 64 + 4, s + 5); x.stroke(); x.beginPath(); x.moveTo(s, k * 64 - 4); x.lineTo(s + 5, k * 64 + 4); x.stroke(); } for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(80,30,20,.25)'; x.beginPath(); x.arc(r() * W, r() * H, 1 + r() * 3, 0, 7); x.fill(); } }, { r: .9 });
      manta.emissive = new T.Color('#ff7a40'); manta.emissiveIntensity = .12;
      for (let i = 0; i < n; i++) {
        const x0 = (i - (n - 1) / 2) * esp;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { est.push(cil(.014, .014, .6, x0 + a * .28, .05, b * .18, 6)); est.push(esf(.035, x0 + a * .28, .035, b * .18, 1, 1, 1, 6)); });
        est.push(ret(.62, .03, .42, x0, .62, 0), ret(.56, .02, .02, x0, .25, .18), ret(.56, .02, .02, x0, .25, -.18));
        vid.push(ret(.6, .32, .01, x0, .65, .2), ret(.6, .32, .01, x0, .65, -.2), ret(.01, .32, .4, x0 - .3, .65, 0), ret(.01, .32, .4, x0 + .3, .65, 0));
        mant.push(ret(.56, .06, .38, x0, .65, 0)); const dobra = new T.CylinderGeometry(.05, .05, .5, 8); dobra.rotateZ(Math.PI / 2); dobra.translate(x0 + (r() - .5) * .05, .73, -.08 + r() * .1); mant.push(dobra);
      }
      add(g, est, aco); add(g, vid, m('#d8eef6', { op: .2, r: .05 })); add(g, mant, manta);
      return g;
    };

    /* ---------- sofá com capa de tecido estampado ---------- */
    P.a4_sofa_capa = o => {
      const g = G(), w = o.w || 2.1, r = rng(o.sem || 431);
      const capa = canvasMat(256, 256, (x, W, H) => { x.fillStyle = o.c || '#6a5a3a'; x.fillRect(0, 0, W, H); if (o.estampa === 'xadrez') { x.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < W; i += 32) { x.fillRect(i, 0, 12, H); x.fillRect(0, i, W, 12); } } else { for (let i = 0; i < 22; i++) { const cx = r() * W, cy = r() * H; x.fillStyle = o.c2 || '#a8604a'; for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(cx + Math.cos(k * 1.26) * 9, cy + Math.sin(k * 1.26) * 9, 7, 4, k * 1.26, 0, 7); x.fill(); } x.fillStyle = '#d8c070'; x.beginPath(); x.arc(cx, cy, 4, 0, 7); x.fill(); x.fillStyle = 'rgba(40,70,30,.6)'; x.beginPath(); x.ellipse(cx + 14, cy + 10, 8, 3, .6, 0, 7); x.fill(); } } for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(0,0,0,${r() * .07})`; x.fillRect(r() * W, r() * H, 2, 2); } }, { r: 1, lado: true });
      add(g, [ret(w, .42, .85, 0, 0, 0), ret(w, .52, .22, 0, .4, -.32, -.08), ret(.2, .26, .85, -w / 2 + .1, .4, 0), ret(.2, .26, .85, w / 2 - .1, .4, 0)].concat([0, 1, 2].map(i => ret(w / 3 - .08, .13, .62, (i - 1) * (w / 3), .42, .07, (r() - .5) * .05, 0, (r() - .5) * .04))), capa);
      const saia = [ret(w + .04, .3, .01, 0, .02, .43), ret(.01, .3, .86, -w / 2 - .01, .02, 0), ret(.01, .3, .86, w / 2 + .01, .02, 0)]; add(g, saia, capa);
      add(g, [esf(.18, -w / 2 + .38, .72, -.12, 1, .9, .45), esf(.17, w / 2 - .4, .7, -.1, 1, .9, .45)], m(o.c3 || '#8a3a2a', { r: .95 }));
      return g;
    };

    /* ---------- mesinha de centro com tralha ---------- */
    P.a4_mesa_centro = o => {
      const g = G(), w = o.w || 1.1, d = o.d || .6, r = rng(o.sem || 433), mad = m(o.c || '#4a2e1c', { tex: 'madeira_velha', r: .55 });
      add(g, [ret(w, .04, d, 0, .4, 0), ret(w - .1, .02, d - .1, 0, .12, 0)].concat([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => ret(.04, .4, .04, a * (w / 2 - .04), 0, b * (d / 2 - .04)))), mad);
      add(g, [ret(.16, .02, .05, -.25, .44, .05, 0, .4), ret(.3, .01, .22, .2, .44, -.05, 0, -.2), ret(.28, .01, .2, .22, .45, -.02, 0, .3)], m('#c8c0b0', { r: .7 }));
      add(g, [cil(.035, .03, .1, -.05, .44, -.12, 10)], m('#d8e8f0', { op: .4, r: .05 }));
      if (o.cinzeiro !== false && P.cinzeiro) { const c = P.cinzeiro({}); c.position.set(-.38, .44, -.15); g.add(c); }
      add(g, [ret(.4, .02, .3, (r() - .5) * .2, .14, 0, 0, .3)], m('#6a2a2a', { r: .8 }));
      return g;
    };

    /* ---------- árvore de Natal pequena com pisca-pisca ---------- */
    P.a4_arvore_natal = o => {
      const g = G(), h = o.h || 1.5, r = rng(o.sem || 435);
      add(g, [cil(.18, .14, .25, 0, 0, 0, 12)], m('#7a1a1a', { r: .6 })); add(g, [cil(.03, .03, .2, 0, .25, 0, 6)], m('#3a2a1a'));
      add(g, [0, 1, 2, 3].map(i => { const c = new T.ConeGeometry(.55 - i * .12, h * .35, 9); c.translate(0, .45 + i * h * .17 + h * .175, 0); return c; }), m('#1e4a2a', { r: .9 }));
      const cores = ['#ff3030', '#30ff60', '#ffd030', '#3080ff'], bolas = [];
      for (let i = 0; i < 26; i++) { const yy = .5 + r() * h * .62, rr = (.55 - (yy - .45) / (h * .8) * .5) * .85, a = r() * 6.28; const b = sf(g, .022, m('#ffffff', { unico: true, e: cores[i % 4], ei: 1.5 }), Math.cos(a) * rr, yy, Math.sin(a) * rr, 6); bolas.push([b, i % 4]); }
      const est = sf(g, .06, m('#ffffff', { unico: true, e: '#ffd040', ei: 1.8 }), 0, .45 + h * .75 + .05, 0, 6); est.scale.set(1, 1.3, .5);
      anim.push((dt, t) => { const f = Math.floor(t * 1.6) % 4; bolas.forEach(([b, k]) => { b.material.emissiveIntensity = (k === f || k === (f + 2) % 4) ? 2 : .15; }); });
      return g;
    };

    /* ---------- vaso com planta (viva ou seca) ---------- */
    P.a4_vaso_planta = o => {
      const g = G(), r = rng(o.sem || 437), seca = !!o.seca;
      add(g, [cil(.2, .15, .38, 0, 0, 0, 14), cil(.21, .21, .04, 0, .36, 0, 14)], m(o.c || '#8a4a2a', { r: .8 }));
      add(g, [cil(.18, .18, .02, 0, .37, 0, 12)], m('#2a1e14', { r: 1 }));
      const fol = []; for (let i = 0; i < 14; i++) { const a = r() * 6.28, L = .4 + r() * .5; const c = new T.ConeGeometry(.05, L, 4); c.translate(0, L / 2, 0); c.rotateZ(seca ? (.6 + r() * .9) : (.2 + r() * .5)); c.rotateY(a); c.translate(0, .38, 0); fol.push(c); }
      add(g, fol, m(seca ? '#5a4a2a' : '#2f5a2a', { r: .9 }));
      return g;
    };
  });
})();
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  NS.extensoes = NS.extensoes || [];
  NS.extensoes.push(F => {
    const { P, m, bx, cy, sf, pl, luz, G, metal, tela, texCanvas, T, rng, anim, textoTex, guardar, ALT, figura } = F;
    const canvasMat = (w, h, desenha, o = {}) => { const [c, x] = tela(w, h); desenha(x, c.width, c.height); const t = texCanvas(c); const mt = m('#ffffff', { unico: true, mapa: t, r: o.r ?? .8, me: o.me ?? 0 }); if (o.brilho) { mt.emissive = new T.Color('#ffffff'); mt.emissiveMap = t; mt.emissiveIntensity = o.brilho; } if (o.transp) mt.transparent = true; if (o.lado) mt.side = T.DoubleSide; if (o.alfa) mt.alphaTest = o.alfa; return mt; };
    function juntar(geos, mat) {
      let nv = 0; const gs = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; nv += n.attributes.position.count; return n; });
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2); let k = 0;
      gs.forEach(g => { pos.set(g.attributes.position.array, k * 3); nor.set(g.attributes.normal.array, k * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, k * 2); k += g.attributes.position.count; g.dispose(); });
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
      return new T.Mesh(guardar(geo), mat);
    }
    const rot = (g, rx, ry, rz) => { if (rx || ry || rz) g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0))); return g; };
    const ret = (w, h, d, x, y, z, rx, ry, rz) => { const g = rot(new T.BoxGeometry(w, h, d), rx, ry, rz); g.translate(x, y + h / 2, z); return g; };
    const cil = (r1, r2, h, x, y, z, seg = 10, rx, ry, rz) => { const g = rot(new T.CylinderGeometry(r1, r2, h, seg), rx, ry, rz); g.translate(x, y + h / 2, z); return g; };
    const esf = (r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 10) => { const g = new T.SphereGeometry(r, seg, Math.max(6, seg * .7)); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
    const tuboG = (pts, r, seg = 16, rs = 6) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), seg, r, rs);
    const barra = (a, b, r, seg = 6) => { const p1 = new T.Vector3(...a), p2 = new T.Vector3(...b), d = p2.clone().sub(p1), L = d.length(); const g = new T.CylinderGeometry(r, r, L, seg); g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()))); g.translate(p1.x + d.x / 2, p1.y + d.y / 2, p1.z + d.z / 2); return g; };
    const add = (g, geos, mat) => { if (geos.length) { const me = juntar(geos, mat); g.add(me); return me; } };
    const chama = (g, x, y, z, s = 1) => { const c = new T.Mesh(guardar(new T.ConeGeometry(.018 * s, .06 * s, 8)), m('#ffb000', { e: '#ffcc55', ei: 2.5 })); c.position.set(x, y + .03 * s, z); g.add(c); return c; };
    const carneTex = (sem) => canvasMat(128, 256, (x, W, H) => { const r = rng(sem); x.fillStyle = '#8a1e1e'; x.fillRect(0, 0, W, H); for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(${230 + r() * 25},${210 + r() * 30},${190 + r() * 30},${.35 + r() * .4})`; x.beginPath(); x.ellipse(r() * W, r() * H, 3 + r() * 16, 2 + r() * 6, r() * 3, 0, 7); x.fill(); } for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(60,0,4,${r() * .4})`; x.fillRect(r() * W, r() * H, 6, 3); } }, { r: .35 });

    /* ---------- trilho no teto com peças de carne e etiquetas escritas à mão ---------- */
    P.a4_ganchos_carne = o => {
      const g = G(), n = o.n || 4, esp = o.esp || .8, r = rng(o.sem || 441), et = o.etiquetas || [], ferro = metal('#7a7a78');
      add(g, [ret(n * esp + .4, .06, .08, 0, ALT - .2, 0)].concat([-1, 1].map(s => cil(.015, .015, .2, s * (n * esp / 2), ALT - .14, 0, 6))), ferro);
      const carne = carneTex(o.sem || 9), osso = m('#e8dcc0', { r: .6 }), pecas = [];
      for (let i = 0; i < n; i++) {
        const x0 = (i - (n - 1) / 2) * esp, p = G(); p.position.set(x0, ALT - .2, 0); g.add(p); pecas.push([p, r() * 6]);
        add(p, [cil(.008, .008, .3, 0, -.3, 0, 5)], ferro); const gan = new T.Mesh(guardar(new T.TorusGeometry(.05, .008, 5, 10, Math.PI * 1.4)), ferro); gan.position.set(0, -.34, 0); p.add(gan);
        const L = .7 + r() * .45, larg = .16 + r() * .08, tipo = r();
        const corpo = sf(p, larg, carne, 0, -.42 - L / 2, 0, 12); corpo.scale.set(1, L / (larg * 2), tipo < .5 ? .55 : .8); corpo.rotation.z = (r() - .5) * .15;
        add(p, [cil(.025, .03, .16, 0, -.48, 0, 6), esf(.035, 0, -.33, 0)], osso);
        if (et.length) { const tx = et[i % et.length]; const mt = canvasMat(128, 64, (x, W, H) => { x.fillStyle = '#efe6c8'; x.fillRect(0, 0, W, H); x.fillStyle = '#1a1a3a'; x.font = 'italic bold 19px "Segoe Print", "Comic Sans MS", cursive'; x.textAlign = 'center'; const L2 = String(tx).split('\n'); L2.forEach((l, k) => x.fillText(l, W / 2, 26 + k * 22)); x.fillStyle = 'rgba(120,10,10,.5)'; x.beginPath(); x.arc(W * .8, H * .75, 6, 0, 7); x.fill(); }, { r: .9, lado: true }); const e = pl(p, .15, .075, mt, .06, -.55 - L * .25, larg * .62); e.rotation.z = (r() - .5) * .3; add(p, [cil(.002, .002, .12, .02, -.5 - L * .25, larg * .5, 4, 0, 0, .6)], m('#d8d0b0')); }
      }
      anim.push((dt, t) => pecas.forEach(([p, f]) => { p.rotation.z = Math.sin(t * .6 + f) * .025; p.rotation.y = Math.sin(t * .3 + f) * .08; }));
      return g;
    };

    /* ---------- cepo de açougueiro com cutelo cravado ---------- */
    P.a4_cepo = o => {
      const g = G(), r = rng(o.sem || 443), mad = m('#6a4a2e', { tex: 'madeira_velha', r: .8 });
      add(g, [ret(.7, .3, .6, 0, .55, 0)].concat([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => ret(.08, .55, .08, a * .28, 0, b * .23))).concat([ret(.6, .04, .5, 0, .15, 0)]), mad);
      const topo = canvasMat(256, 256, (x, W, H) => { x.fillStyle = '#8a6a48'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(40,20,10,.5)'; for (let i = 0; i < 70; i++) { x.lineWidth = .5 + r(); x.beginPath(); const a = r() * W, b = r() * H; x.moveTo(a, b); x.lineTo(a + (r() - .5) * 60, b + (r() - .5) * 20); x.stroke(); } for (let i = 0; i < 12; i++) { x.fillStyle = `rgba(${90 + r() * 40},0,0,${.3 + r() * .4})`; x.beginPath(); x.ellipse(r() * W, r() * H, 8 + r() * 30, 5 + r() * 18, r() * 3, 0, 7); x.fill(); } }, { r: .7 });
      const tp = pl(g, .7, .6, topo, 0, .852, 0); tp.rotation.x = -Math.PI / 2;
      const cut = G(); cut.position.set(.08, .85, .02); cut.rotation.set(0, .5, .1); g.add(cut);
      add(cut, [ret(.24, .14, .006, 0, -.04, 0)], metal('#b8bcc0')); add(cut, [ret(.16, .03, .03, -.19, .06, 0)], m('#2a1a10', { r: .6 }));
      const s = sf(g, .07, m('#8a1e1e', { r: .35 }), -.18, .87, -.12, 8); s.scale.set(1.4, .5, 1);
      if (P.sangue) { const sg = P.sangue({ chao: 1, estilo: 'poca', w: 1.0, sem: 7 }); g.add(sg); }
      return g;
    };

    /* ---------- macas de lona com soldados costurados uns aos outros, respirando juntos ---------- */
    P.a4_soldados_costurados = o => {
      const g = G(), n = o.n || 3, esp = o.esp || .78, r = rng(o.sem || 445), mad = m('#4a3a24', { tex: 'madeira_velha' }), lona = m(o.lona || '#5a5a3a', { r: 1 }), cl = [], cf = [], corpos = [];
      for (let i = 0; i < n; i++) {
        const x0 = (i - (n - 1) / 2) * esp;
        cf.push(ret(.04, .04, 1.95, x0 - .32, .38, 0), ret(.04, .04, 1.95, x0 + .32, .38, 0)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cf.push(barra([x0 + a * .32, .4, b * .9], [x0 - a * .28, 0, b * .9], .018)));
        cl.push(ret(.62, .02, 1.9, x0, .4, 0));
        const f = figura({ pose: 'deitado', base: .32, c: o.c || '#4a4a32', cab: 'normal', cabelo: '#2a1d14', sem: i * 3 + 1 }); f.position.x = x0; g.add(f); corpos.push(f);
      }
      add(g, cf, mad); add(g, cl, lona);
      const ban = [], fio = [], pele = m('#b08a72', { r: .6 });
      for (let i = 0; i < n; i++) { const x0 = (i - (n - 1) / 2) * esp; ban.push(ret(.27, .07, .2, x0, .46, -.72 + r() * .03), ret(.1, .07, .25, x0 + (r() < .5 ? .22 : -.22), .44, -.15)); }
      for (let i = 0; i < n - 1; i++) { const xa = (i - (n - 1) / 2) * esp + .2, xb = xa + esp - .4; [[-.5, .56], [.15, .5]].forEach(([z, y]) => { const pont = barra([xa, y, z], [xb, y, z], .045, 8); fio.push(pont); for (let k = 0; k < 5; k++) { const xx = xa + (xb - xa) * (k + .5) / 5; ban.push(ret(.008, .1, .008, xx, y - .05, z, 0, 0, .5)); } }); }
      add(g, [].concat(fio), pele); add(g, ban.filter((b, k) => k < n * 2), m('#e8e2d0', { r: .9 })); add(g, ban.filter((b, k) => k >= n * 2), m('#1a0606'));
      anim.push((dt, t) => { const k = 1 + Math.sin(t * 1.1) * .035; corpos.forEach(c => { c.scale.y = k; }); });
      return g;
    };

    /* ---------- baixela sobre a mesa: taças, travessas, garrafas e candelabros ---------- */
    P.a4_baixela = o => {
      const g = G(), n = o.n || 6, L = o.l || (n * .7 + .6), r = rng(o.sem || 447), tacas = [], prata = [], garr = [], comida = [], vel = [];
      for (let i = 0; i < n; i++) { const z = -L / 2 + .6 + i * .7; [-1, 1].forEach(s => { const x = s * .42; tacas.push(cil(.004, .025, .01, x, 0, z + .15, 8), cil(.004, .004, .1, x, .01, z + .15, 5), cil(.035, .015, .07, x, .11, z + .15, 8)); prata.push(ret(.015, .005, .18, s * .12 + s * .1, 0, z - .1), ret(.015, .005, .18, s * .48, 0, z)); }); }
      [-.3, .3].forEach((zz, k) => { const z = zz * L; prata.push(cil(.07, .09, .03, 0, 0, z, 10), cil(.012, .012, .3, 0, .03, z, 6)); [-1, 1].forEach(s => { prata.push(ret(.18, .012, .012, s * .09, .26, z), cil(.01, .01, .1, s * .18, .26, z, 6)); vel.push(cil(.016, .016, .14, s * .18, .36, z, 8)); }); vel.push(cil(.016, .016, .16, 0, .33, z, 8)); });
      prata.push(cil(.24, .2, .02, 0, 0, 0, 16)); comida.push(esf(.16, 0, .09, 0, 1.3, .6, .9, 12)); prata.push(cil(.15, .13, .02, 0, 0, .9 * (L / 4), 14), cil(.15, .13, .02, 0, 0, -.9 * (L / 4), 14));
      [-1, 1].forEach(s => { const c = new T.SphereGeometry(.14, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); c.translate(0, .02, s * .9 * (L / 4)); prata.push(c); prata.push(esf(.02, 0, .17, s * .9 * (L / 4))); });
      for (let i = 0; i < 4; i++) { const z = (r() - .5) * L * .8, x = (r() - .5) * .3; garr.push(cil(.035, .035, .22, x, 0, z, 10), cil(.012, .016, .1, x, .22, z, 8)); }
      for (let i = 0; i < 5; i++) comida.push(esf(.05 + r() * .03, (r() - .5) * .3, .04, (r() - .5) * L * .7, 1.3, .7, 1, 8));
      add(g, tacas, m('#d8e4ea', { op: .45, r: .05, me: .2 })); add(g, prata, metal('#b8b0a0')); add(g, garr, m('#1e3a24', { r: .15, me: .2 })); add(g, comida, m(o.comida || '#6a3a1e', { r: .6 })); add(g, vel, m('#efe6d0', { r: .6 }));
      const chamas = []; [-.3, .3].forEach(zz => { [-.18, 0, .18].forEach(xx => chamas.push(chama(g, xx, xx ? .5 : .49, zz * L))); });
      anim.push((dt, t) => chamas.forEach((c, i) => { c.scale.set(1, 1 + Math.sin(t * 11 + i) * .2, 1); }));
      if (o.luz !== false) luz(g, '#ffb347', o.i ?? 1.2, 5, 0, .7, 0, 'vela');
      return g;
    };

    /* ---------- lustre de velas pendurado ---------- */
    P.a4_lustre = o => {
      const g = G(), R = o.raio || .6, n = o.n || 8, y = o.y ?? (ALT - .95), ouro = metal(o.c || '#8a7040'), vel = [], gotas = [];
      const ferro = [cil(.012, .012, ALT - y - .2, 0, y + .2, 0, 6), cil(.05, .08, .2, 0, y, 0, 10), esf(.06, 0, y - .02, 0)];
      for (let i = 0; i < n; i++) { const a = i / n * 6.283, x = Math.cos(a) * R, z = Math.sin(a) * R; ferro.push(barra([0, y + .1, 0], [x, y + .04, z], .012), cil(.04, .03, .03, x, y + .04, z, 8)); vel.push(cil(.016, .016, .12, x, y + .07, z, 8)); gotas.push(esf(.025, x * .85, y - .04, z * .85, 1, 1.6, 1, 6)); }
      const anel = new T.TorusGeometry(R, .015, 6, 32); anel.rotateX(Math.PI / 2); anel.translate(0, y + .04, 0); ferro.push(anel);
      add(g, ferro, ouro); add(g, vel, m('#efe6d0', { r: .6 })); add(g, gotas, m('#e8f0f8', { op: .55, r: .05, me: .3 }));
      const ch = []; for (let i = 0; i < n; i++) { const a = i / n * 6.283; ch.push(chama(g, Math.cos(a) * R, y + .19, Math.sin(a) * R)); }
      if (o.apagado) ch.forEach(c => { c.visible = false; }); else anim.push((dt, t) => ch.forEach((c, i) => c.scale.set(1, 1 + Math.sin(t * 9 + i * 2) * .25, 1)));
      if (o.luz !== false && !o.apagado) luz(g, o.cor || '#ffc070', o.i ?? 1.4, o.d || 8, 0, y - .1, 0, 'vela');
      return g;
    };

    /* ---------- arandela de parede (cúpula acesa; luz opcional) ---------- */
    P.a4_arandela = o => {
      const g = G(), y = o.y ?? 1.85, lat = metal(o.c || '#8a7040');
      add(g, [ret(.1, .16, .02, 0, y - .08, .01), barra([0, y, .02], [0, y + .05, .16], .01)], lat);
      const cup = new T.Mesh(guardar(new T.CylinderGeometry(.06, .11, .14, 12, 1, true)), m('#ffffff', { unico: true, e: o.cor || '#ffcf8a', ei: o.apagada ? .05 : 1.3, lado: 2, op: .92 })); cup.position.set(0, y + .12, .16); g.add(cup);
      if (o.luz) luz(g, o.cor || '#ffcf8a', o.i ?? .7, o.d || 4, 0, y + .05, .4, o.pisca);
      return g;
    };

    /* ---------- lampião a querosene pendurado ---------- */
    P.a4_lampiao = o => {
      const g = G(), y = o.y ?? 2.1, ferro = metal('#3a3a36');
      add(g, [cil(.004, .004, ALT - y - .3, 0, y + .3, 0, 4), cil(.07, .08, .04, 0, y, 0, 10), cil(.05, .07, .06, 0, y + .22, 0, 10), new T.TorusGeometry(.04, .006, 5, 10).translate(0, y + .3, 0)].concat([0, 1, 2, 3].map(i => cil(.004, .004, .2, Math.cos(i * 1.57) * .06, y + .03, Math.sin(i * 1.57) * .06, 4))), ferro);
      const vid = sf(g, .055, m('#ffffff', { unico: true, e: o.cor || '#ffb050', ei: 1.8, op: .85 }), 0, y + .12, 0, 10); vid.scale.y = 1.5;
      if (o.luz !== false) luz(g, o.cor || '#ffb050', o.i ?? 1.1, o.d || 6, 0, y + .05, 0, 'vela');
      return g;
    };
  });
})();
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  NS.extensoes = NS.extensoes || [];
  NS.extensoes.push(F => {
    const { P, m, bx, cy, sf, pl, luz, G, metal, tela, texCanvas, T, rng, anim, textoTex, guardar, ALT } = F;
    const canvasMat = (w, h, desenha, o = {}) => { const [c, x] = tela(w, h); desenha(x, c.width, c.height); const t = texCanvas(c); const mt = m('#ffffff', { unico: true, mapa: t, r: o.r ?? .8, me: o.me ?? 0 }); if (o.brilho) { mt.emissive = new T.Color('#ffffff'); mt.emissiveMap = t; mt.emissiveIntensity = o.brilho; } if (o.transp) mt.transparent = true; if (o.lado) mt.side = T.DoubleSide; if (o.alfa) mt.alphaTest = o.alfa; return mt; };
    function juntar(geos, mat) {
      let nv = 0; const gs = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; nv += n.attributes.position.count; return n; });
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2); let k = 0;
      gs.forEach(g => { pos.set(g.attributes.position.array, k * 3); nor.set(g.attributes.normal.array, k * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, k * 2); k += g.attributes.position.count; g.dispose(); });
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
      return new T.Mesh(guardar(geo), mat);
    }
    const rot = (g, rx, ry, rz) => { if (rx || ry || rz) g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0))); return g; };
    const ret = (w, h, d, x, y, z, rx, ry, rz) => { const g = rot(new T.BoxGeometry(w, h, d), rx, ry, rz); g.translate(x, y + h / 2, z); return g; };
    const cil = (r1, r2, h, x, y, z, seg = 10, rx, ry, rz) => { const g = rot(new T.CylinderGeometry(r1, r2, h, seg), rx, ry, rz); g.translate(x, y + h / 2, z); return g; };
    const esf = (r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 10) => { const g = new T.SphereGeometry(r, seg, Math.max(6, seg * .7)); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
    const tuboG = (pts, r, seg = 16, rs = 6) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), seg, r, rs);
    const barra = (a, b, r, seg = 6) => { const p1 = new T.Vector3(...a), p2 = new T.Vector3(...b), d = p2.clone().sub(p1), L = d.length(); const g = new T.CylinderGeometry(r, r, L, seg); g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()))); g.translate(p1.x + d.x / 2, p1.y + d.y / 2, p1.z + d.z / 2); return g; };
    const add = (g, geos, mat) => { if (geos.length) { const me = juntar(geos, mat); g.add(me); return me; } };
    const ferroF = () => m('#1e1c1a', { me: .6, r: .55 });

    /* ---------- guarda-corpo circular em volta de um poço (com uma abertura) ---------- */
    P.a4_guarda_corpo = o => {
      const g = G(), R = o.raio || 1.8, h = o.h || 1.0, ab = (o.abertura ?? 50) * Math.PI / 180, a0 = (o.ang ?? 0) * Math.PI / 180, mt = m(o.c || '#3a3532', { tex: 'ferrugem', me: .6, r: .5 }), pos = [];
      const arco = Math.PI * 2 - ab, n = Math.round(arco * R / .35);
      for (let i = 0; i <= n; i++) { const a = a0 + ab / 2 + arco * i / n; pos.push(cil(.022, .022, h, Math.cos(a) * R, 0, Math.sin(a) * R, 6)); }
      add(g, pos, mt);
      [h, h * .5].forEach(yy => { const t = new T.TorusGeometry(R, yy === h ? .03 : .016, 6, 48, arco); t.rotateX(Math.PI / 2); t.rotateY(-(a0 + ab / 2)); t.translate(0, yy, 0); g.add(new T.Mesh(guardar(t), mt)); });
      const borda = new T.RingGeometry(R - .12, R + .12, 40); borda.rotateX(-Math.PI / 2); borda.translate(0, .01, 0); g.add(new T.Mesh(guardar(borda), m('#2a2622', { tex: 'grade_chao', me: .5 })));
      return g;
    };

    /* ---------- portão em arco (pilares fora do vão, letreiro de ferro no alto) ---------- */
    P.a4_portao_arco = o => {
      const g = G(), w = o.w || 3.5, alv = m(o.c || '#7a766c', { tex: 'concreto', r: .9 }), ferro = ferroF();
      [-1, 1].forEach(s => { const p = G(); g.add(p); add(p, [ret(.38, 2.6, .38, s * w / 2, 0, 0), ret(.46, .12, .46, s * w / 2, 2.6, 0), ret(.3, .2, .3, s * w / 2, 2.72, 0)], alv); });
      const arco = G(); g.add(arco);
      const ar = new T.TorusGeometry(w / 2 - .1, .035, 6, 30, Math.PI); ar.scale(1, .32, 1); ar.translate(0, 2.55, 0);
      add(arco, [ar, ret(w - .3, .04, .04, 0, 2.5, 0), ret(w - .3, .04, .04, 0, 2.3, 0)].concat(Array.from({ length: 13 }, (_, i) => ret(.015, .18, .015, -w / 2 + .3 + i * (w - .6) / 12, 2.32, 0))), ferro);
      if (o.txt) { const mt = canvasMat(1024, 128, (x, W, H) => { x.clearRect(0, 0, W, H); x.fillStyle = '#1a1816'; x.font = 'bold 76px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; let tam = 76; while (x.measureText(o.txt).width > W * .94 && tam > 20) { tam -= 4; x.font = `bold ${tam}px Georgia, serif`; } x.fillText(o.txt, W / 2, H / 2); }, { alfa: .5, lado: true, me: .5, r: .5 }); pl(arco, w - .5, (w - .5) / 8, mt, 0, 2.62 + (w - .5) / 16, .02); }
      // folhas do portão abertas, encostadas na parede
      const grade = canvasMat(128, 256, (x, W, H) => { x.clearRect(0, 0, W, H); x.fillStyle = '#1e1c1a'; for (let i = 6; i < W; i += 18) x.fillRect(i, 10, 5, H - 10); x.fillRect(0, 20, W, 7); x.fillRect(0, H / 2, W, 7); x.fillRect(0, H - 14, W, 8); for (let i = 6; i < W; i += 18) { x.beginPath(); x.moveTo(i - 3, 14); x.lineTo(i + 2.5, 0); x.lineTo(i + 8, 14); x.fill(); } }, { alfa: .5, lado: true, me: .6 });
      [-1, 1].forEach(s => { const f = pl(g, 1.3, 2.0, grade, s * (w / 2 + .85), 1.0, .06); g.add(f); });
      return g;
    };

    /* ---------- cerca baixa de ferro batido ---------- */
    P.a4_cerca_ferro = o => {
      const g = G(), w = o.w || 2, h = o.h || .9, ferro = ferroF(), geos = [];
      const n = Math.round(w / .13); for (let i = 0; i <= n; i++) { const x = -w / 2 + i * w / n; geos.push(cil(.009, .009, h, x, 0, 0, 5), (() => { const c = new T.ConeGeometry(.022, .07, 4); c.translate(x, h + .035, 0); return c; })()); }
      geos.push(ret(w, .025, .025, 0, .12, 0), ret(w, .025, .025, 0, h - .12, 0));
      [-1, 1].forEach(s => { geos.push(ret(.07, h + .12, .07, s * w / 2, 0, 0), esf(.05, s * w / 2, h + .16, 0)); });
      add(g, geos, ferro); return g;
    };

    /* ---------- árvore seca e retorcida (galhos só no alto, folhas opcionais) ---------- */
    P.a4_arvore_seca = o => {
      const g = G(), r = rng(o.sem || 451), casca = m(o.c || '#3a2e24', { r: .95 }), H = o.h || 2.0;
      const pts = []; let x = 0, z = 0; for (let i = 0; i <= 5; i++) { pts.push([x, i * H / 5, z]); x += (r() - .5) * .25; z += (r() - .5) * .25; }
      const tr = new T.Mesh(guardar(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), 16, o.grosso || .11, 7)), casca); g.add(tr);
      const topo = pts[5], gal = [], fol = [];
      for (let i = 0; i < (o.galhos || 6); i++) { const a = r() * 6.28, L = .6 + r() * .8; const p0 = [topo[0], H - .05, topo[2]], p1 = [topo[0] + Math.cos(a) * L * .5, H + .2 + r() * .3, topo[2] + Math.sin(a) * L * .5], p2 = [topo[0] + Math.cos(a + .3) * L, H + .1 + r() * .7, topo[2] + Math.sin(a + .3) * L]; gal.push(tuboG([p0, p1, p2], .04, 8, 5)); for (let k = 0; k < 2; k++) { const a2 = a + (r() - .5) * 1.5; gal.push(tuboG([p1, [p1[0] + Math.cos(a2) * .4, p1[1] + .2 + r() * .3, p1[2] + Math.sin(a2) * .4]], .018, 4, 4)); } if (o.folhas) for (let k = 0; k < 3; k++) fol.push(esf(.18 + r() * .14, p2[0] + (r() - .5) * .3, p2[1] + r() * .2, p2[2] + (r() - .5) * .3, 1, .5, 1, 7)); }
      const ga = new T.Group(); g.add(ga); add(ga, gal, casca); if (fol.length) add(ga, fol, m(o.folha || '#3a4a22', { r: .9 }));
      return g;
    };

    /* ---------- seteira de casamata com a vista de fora (céu, vulcão e algo enorme no céu) ---------- */
    P.a4_seteira_vista = o => {
      const g = G(), w = o.w || 1.6, h = o.h || .26, y = o.y ?? 1.4, conc = m(o.c || '#5a5a54', { tex: 'concreto', r: .95 }), r = rng(o.sem || 453);
      add(g, [ret(w + .5, .18, .5, 0, y - .18, .2, .25), ret(w + .5, .2, .4, 0, y + h, .15, -.25), ret(.2, h + .2, .45, -w / 2 - .15, y - .05, .18), ret(.2, h + .2, .45, w / 2 + .15, y - .05, .18)], conc);
      const [c, x] = tela(512, 96), t = texCanvas(c), mt = m('#ffffff', { unico: true, mapa: t, e: '#ffffff', ei: 1 }); mt.emissiveMap = t;
      const pinta = aceso => { const gr = x.createLinearGradient(0, 0, 0, 96); gr.addColorStop(0, o.ceu1 || '#8a8e90'); gr.addColorStop(1, o.ceu2 || '#c8c0a8'); x.fillStyle = gr; x.fillRect(0, 0, 512, 96);
        x.fillStyle = 'rgba(80,80,80,.35)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse(r() * 512, 20 + r() * 30, 40 + r() * 60, 8, 0, 0, 7); x.fill(); }
        if (o.vulcao !== false) { x.fillStyle = '#2a2622'; x.beginPath(); x.moveTo(o.vx ?? 300, 96); x.lineTo((o.vx ?? 300) + 60, 30); x.lineTo((o.vx ?? 300) + 110, 26); x.lineTo((o.vx ?? 300) + 220, 96); x.fill(); }
        x.fillStyle = '#1a1814'; x.fillRect(0, 84, 512, 12);
        if (o.objeto !== false) { const ox = (o.vx ?? 300) + 85, oy = 12; x.fillStyle = aceso ? '#e8eef4' : '#5a6068'; x.fillRect(ox - 44, oy, 88, 10); x.beginPath(); x.ellipse(ox - 44, oy + 5, 3, 5, 0, 0, 7); x.ellipse(ox + 44, oy + 5, 3, 5, 0, 0, 7); x.fill(); if (aceso) { x.shadowColor = '#ffffff'; x.shadowBlur = 16; x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(ox - 44, oy + 2, 88, 3); x.shadowBlur = 0; } }
        t.needsUpdate = true; };
      let est = -1; pinta(true);
      pl(g, w, h, mt, 0, y + h / 2, .02);
      if (o.objeto !== false) anim.push((dt, tt) => { const a = Math.sin(tt * 2.3) * Math.sin(tt * .7) > .1; if (a !== est) { est = a; pinta(a); } });
      if (o.luz !== false) luz(g, o.cor || '#d8dce0', o.i ?? .8, 6, 0, y + h / 2, .8);
      return g;
    };

    /* ---------- muro de sacos de areia ---------- */
    P.a4_sacos_areia = o => {
      const g = G(), w = o.w || 2, cam = o.n || 3, r = rng(o.sem || 455), geos = [];
      for (let k = 0; k < cam; k++) { const nn = Math.max(1, Math.round(w / .55) - (k % 2)); for (let i = 0; i < nn; i++) { const x = -w / 2 + .28 + (k % 2) * .27 + i * .55; if (x > w / 2 - .2) continue; geos.push(esf(.29, x + (r() - .5) * .04, .1 + k * .19, (r() - .5) * .05, 1, .36, .62, 10)); } }
      add(g, geos, m(o.c || '#8a7a58', { r: 1, tex: 'carpete' })); return g;
    };

    /* ---------- metralhadora em tripé ---------- */
    P.a4_metralhadora = o => {
      const g = G(), aco = m('#2a2a26', { me: .6, r: .45 }), y = o.y ?? .55;
      add(g, [barra([0, y, 0], [-.4, 0, -.3], .02), barra([0, y, 0], [.4, 0, -.3], .02), barra([0, y, 0], [0, 0, .45], .02), ret(.12, .12, .5, 0, y, -.05), cil(.03, .03, .7, 0, y + .06, .55, 8, Math.PI / 2), ret(.04, .14, .1, 0, y + .12, -.1), ret(.18, .02, .1, .12, y + .1, .05)], aco);
      add(g, [ret(.06, .1, .28, 0, y - .02, -.4)], m('#5a3a22', { tex: 'madeira_velha' }));
      return g;
    };

    /* ---------- barco de desembarque encalhado (rampa baixada) ---------- */
    P.a4_barco_desembarque = o => {
      const g = G(), L = o.l || 3.6, W = o.w || 1.9, H = o.h || 1.3, mt = m(o.c || '#4a5048', { tex: 'ferrugem', me: .45, r: .6 });
      const casco = G(); g.add(casco);
      add(casco, [ret(W, .1, L - .3, 0, 0, -.15)], mt);
      [-1, 1].forEach(s => { const lado = G(); g.add(lado); add(lado, [ret(.08, H, L - .3, s * W / 2, 0, -.15, 0, 0, s * .08)], mt); });
      const popa = G(); g.add(popa); add(popa, [ret(W, H + .2, .1, 0, 0, -L / 2), ret(.6, .5, .5, W * .2, H, -L / 2 + .3)], mt);
      const rampa = G(); rampa.position.set(0, .05, L / 2 - .3); rampa.rotation.x = 1.25; g.add(rampa);
      add(rampa, [ret(W - .1, H * .95, .08, 0, 0, 0)], mt);
      add(g, [ret(W - .2, .02, L - .6, 0, .1, -.2)], m('#1e1e1c', { r: .9 }));
      return g;
    };

    /* ---------- ouriço tcheco (obstáculo de praia de vigas cruzadas) ---------- */
    P.a4_ourico = o => {
      const g = G(), s = o.tam || 1.4, mt = m('#4a3428', { tex: 'ferrugem', me: .55, r: .55 }), geos = [];
      [[0, 0], [Math.PI / 2, 0], [0, Math.PI / 2]].forEach(([a, b]) => { const v = new T.BoxGeometry(.1, s * 1.25, .1); v.rotateZ(.62); v.rotateX(a); v.rotateY(b + .4); v.translate(0, s * .42, 0); geos.push(v); });
      add(g, geos, mt); return g;
    };

    /* ---------- cupinzeiro ---------- */
    P.a4_cupinzeiro = o => {
      const g = G(), h = o.h || 1.2, r = rng(o.sem || 457), geos = [];
      geos.push(cil(.12, .45, h * .55, 0, 0, 0, 9)); for (let i = 0; i < 5; i++) { const hh = h * (.4 + r() * .6), a = r() * 6.28, d = r() * .2; const c = new T.ConeGeometry(.12 + r() * .1, hh, 7); c.translate(Math.cos(a) * d, hh / 2, Math.sin(a) * d); geos.push(c); }
      add(g, geos, m(o.c || '#8a4a2a', { tex: 'terra', r: 1 })); return g;
    };

    /* ---------- cerca de arame farpado com mourões ---------- */
    P.a4_cerca_arame = o => {
      const g = G(), w = o.w || 4, r = rng(o.sem || 459), mad = m('#5a4a36', { tex: 'madeira_velha' }), mour = [], fios = [];
      const n = Math.max(1, Math.round(w / 1.8)); for (let i = 0; i <= n; i++) mour.push(cil(.06, .07, 1.3, -w / 2 + i * w / n, 0, 0, 7, (r() - .5) * .12, 0, (r() - .5) * .12));
      [.4, .75, 1.1].forEach(yy => { const pts = []; for (let k = 0; k <= 8; k++) pts.push([-w / 2 + k * w / 8, yy - Math.sin(k / 8 * Math.PI * n) * .04, .05]); fios.push(tuboG(pts, .005, 24, 3)); });
      add(g, mour, mad); add(g, fios, metal('#6a6a66')); return g;
    };
  });
})();
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  NS.extensoes = NS.extensoes || [];
  NS.extensoes.push(F => {
    const { P, m, bx, cy, sf, pl, luz, G, metal, tela, texCanvas, T, rng, anim, textoTex, guardar, ALT } = F;
    const canvasMat = (w, h, desenha, o = {}) => { const [c, x] = tela(w, h); desenha(x, c.width, c.height); const t = texCanvas(c); const mt = m('#ffffff', { unico: true, mapa: t, r: o.r ?? .8, me: o.me ?? 0 }); if (o.brilho) { mt.emissive = new T.Color('#ffffff'); mt.emissiveMap = t; mt.emissiveIntensity = o.brilho; } if (o.transp) mt.transparent = true; if (o.lado) mt.side = T.DoubleSide; if (o.alfa) mt.alphaTest = o.alfa; return mt; };
    function juntar(geos, mat) {
      let nv = 0; const gs = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; nv += n.attributes.position.count; return n; });
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2); let k = 0;
      gs.forEach(g => { pos.set(g.attributes.position.array, k * 3); nor.set(g.attributes.normal.array, k * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, k * 2); k += g.attributes.position.count; g.dispose(); });
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
      return new T.Mesh(guardar(geo), mat);
    }
    const rot = (g, rx, ry, rz) => { if (rx || ry || rz) g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0))); return g; };
    const ret = (w, h, d, x, y, z, rx, ry, rz) => { const g = rot(new T.BoxGeometry(w, h, d), rx, ry, rz); g.translate(x, y + h / 2, z); return g; };
    const cil = (r1, r2, h, x, y, z, seg = 10, rx, ry, rz) => { const g = rot(new T.CylinderGeometry(r1, r2, h, seg), rx, ry, rz); g.translate(x, y + h / 2, z); return g; };
    const esf = (r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 10) => { const g = new T.SphereGeometry(r, seg, Math.max(6, seg * .7)); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
    const add = (g, geos, mat) => { if (geos.length) { const me = juntar(geos, mat); g.add(me); return me; } };

    /* ---------- carro de passeio (opcionalmente queimado pela luz) ---------- */
    P.a4_carro = o => {
      const g = G(), q = !!o.queimado, cor = q ? '#d8d4c8' : (o.c || '#8a2a24'), lat = m(cor, { r: q ? .95 : .4, me: q ? 0 : .4 });
      const corpo = G(); g.add(corpo); add(corpo, [ret(1.62, .5, 3.7, 0, .28, 0), ret(1.5, .08, 1.0, 0, .78, 1.25, -.12), ret(1.5, .06, .5, 0, .74, -1.6, .2)], lat);
      const cab = G(); g.add(cab); add(cab, [ret(1.42, .05, 1.6, 0, 1.25, -.25), ret(.06, .45, .06, -.7, .78, .58, -.5), ret(.06, .45, .06, .7, .78, .58, -.5), ret(.06, .47, .06, -.7, .78, -1.0, .35), ret(.06, .47, .06, .7, .78, -1.0, .35)], lat);
      add(cab, [ret(1.4, .42, .02, 0, .82, .65, -.55), ret(1.4, .44, .02, 0, .8, -1.08, .4), ret(.02, .4, 1.5, -.7, .82, -.22), ret(.02, .4, 1.5, .7, .82, -.22)], m(q ? '#3a3632' : '#1a2228', { r: .1, me: .5, op: q ? 1 : .85 }));
      const rod = G(); g.add(rod); add(rod, [[-1, 1.15], [1, 1.15], [-1, -1.2], [1, -1.2]].map(([s, z]) => cil(.3, .3, .2, s * .74, .3 - .1, z, 14, 0, 0, Math.PI / 2).translate(0, 0, 0)).map((gg, i) => gg), m(q ? '#2a2826' : '#151515', { r: .8 }));
      add(g, [ret(1.66, .14, .12, 0, .26, 1.86), ret(1.66, .14, .12, 0, .26, -1.86)], m(q ? '#8a867a' : '#2a2a2a', { r: .6 }));
      add(g, [ret(.3, .1, .03, -.55, .58, 1.86), ret(.3, .1, .03, .55, .58, 1.86)], m('#f0f0e0', { r: .2 }));
      add(g, [ret(.25, .1, .03, -.6, .6, -1.86), ret(.25, .1, .03, .6, .6, -1.86)], m(q ? '#6a5a50' : '#8a1010', { r: .3 }));
      return g;
    };

    /* ---------- poste de rua com placa ---------- */
    P.a4_poste = o => {
      const g = G(), H = o.h || ALT - .05, mt = m(o.c || '#7a7a74', { tex: 'concreto', r: .8 });
      add(g, [cil(.07, .11, H, 0, 0, 0, 10), cil(.025, .025, 1.0, 0, H - .35, .45, 6, Math.PI / 2)], mt);
      add(g, [ret(.4, .08, .22, 0, H - .45, .9)], m('#3a3a38', { me: .4 }));
      const lp = pl(g, .34, .18, m('#ffffff', { unico: true, e: o.acesa ? '#ffe0a0' : '#8a8a80', ei: o.acesa ? 1.5 : .2, lado: 2 }), 0, H - .46, .9); lp.rotation.x = Math.PI / 2;
      if (o.txt) { const mt2 = canvasMat(512, 96, (x, W, H2) => { x.fillStyle = o.f || '#1a4a8a'; x.fillRect(0, 0, W, H2); x.strokeStyle = '#f0f0f0'; x.lineWidth = 5; x.strokeRect(6, 6, W - 12, H2 - 12); x.fillStyle = '#ffffff'; x.font = 'bold 44px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(o.txt, W / 2, H2 / 2 + 2); }, { r: .6, lado: true }); const p = pl(g, .9, .17, mt2, .45, 2.2, 0); p.rotation.y = Math.PI / 2; p.position.set(0, 2.2, .45); p.rotation.y = 0; }
      return g;
    };

    /* ---------- abrigo de ponto de ônibus ---------- */
    P.a4_ponto_onibus = o => {
      const g = G(), w = o.w || 2.4, ferro = metal('#5a5e62');
      add(g, [ret(.06, 2.4, .06, -w / 2, 0, -.4), ret(.06, 2.4, .06, w / 2, 0, -.4), ret(.06, 2.4, .06, -w / 2, 0, .4), ret(.06, 2.4, .06, w / 2, 0, .4), ret(w + .2, .06, 1.1, 0, 2.4, 0, -.06), ret(w - .1, .05, .35, 0, .45, -.25)].concat([-.8, 0, .8].map(x => ret(.04, .45, .04, x * w / 2.4, 0, -.25))), ferro);
      bx(g, w, 1.7, .02, m('#c8dce4', { op: .2, r: .05 }), 0, .6, -.45);
      if (o.txt) { const mt = canvasMat(256, 384, (x, W, H) => { x.fillStyle = o.f || '#e8e4d8'; x.fillRect(0, 0, W, H); x.fillStyle = o.cor || '#c02020'; x.font = 'bold 34px Arial'; x.textAlign = 'center'; String(o.txt).split('\n').forEach((l, i) => x.fillText(l, W / 2, 70 + i * 44)); x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 6; i++) x.fillRect(30, 200 + i * 24, 196 - i * 12, 8); }, { r: .7, brilho: .25 }); pl(g, .75, 1.1, mt, w / 2 - .45, 1.4, -.43); }
      return g;
    };

    /* ---------- fachada de loja numa parede (porta de enrolar, letreiro) ---------- */
    P.a4_fachada = o => {
      const g = G(), w = o.w || 3, h = o.h || 2.9, r = rng(o.sem || 461);
      const mt = canvasMat(512, Math.round(512 * h / w), (x, W, H) => {
        x.fillStyle = o.c || '#c8b8a0'; x.fillRect(0, 0, W, H); for (let i = 0; i < 2000; i++) { x.fillStyle = `rgba(0,0,0,${r() * .08})`; x.fillRect(r() * W, r() * H, 3, 3); }
        x.fillStyle = o.f || '#1a5a8a'; x.fillRect(W * .05, H * .06, W * .9, H * .14); x.fillStyle = '#ffffff'; x.font = `bold ${Math.round(H * .09)}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(o.txt || '', W / 2, H * .13);
        const py = H * .26; x.fillStyle = '#8a8a86'; x.fillRect(W * .1, py, W * .8, H - py - 4); x.fillStyle = 'rgba(0,0,0,.28)'; for (let yy = py; yy < H; yy += 7) x.fillRect(W * .1, yy, W * .8, 2);
        x.fillStyle = 'rgba(20,20,20,.5)'; x.fillRect(W * .1, H - 12, W * .8, 8);
      }, { r: .9 });
      pl(g, w, h, mt, 0, h / 2, .012); return g;
    };

    /* ---------- meio-fio / calçada (degrau baixo) ---------- */
    P.a4_calcada = o => { const g = G(), w = o.w || 3, d = o.d || 1.2; add(g, [ret(w, .14, d, 0, 0, 0)], m(o.c || '#9a968c', { tex: 'concreto', rep: [Math.round(w), 1], r: .95 })); add(g, [ret(w, .145, .1, 0, 0, d / 2 - .05)], m('#bab6aa', { r: .9 })); return g; };

    /* ---------- porta de madeira com plaqueta de nome e luz por baixo ---------- */
    P.a4_porta_nome = o => {
      const g = G(), w = o.w || .9, h = o.h || 2.1, mad = m(o.c || '#5a3a24', { tex: 'madeira_velha', r: .6 }), mold = m(o.c2 || '#d8d0c0', { r: .7 });
      add(g, [ret(w + .2, .1, .08, 0, h, .02), ret(.1, h, .08, -w / 2 - .05, 0, .02), ret(.1, h, .08, w / 2 + .05, 0, .02)], mold);
      add(g, [ret(w, h - .02, .05, 0, .02, .01)], mad);
      add(g, [ret(w * .32, h * .35, .01, -w * .2, h * .52, .04), ret(w * .32, h * .35, .01, w * .2, h * .52, .04), ret(w * .32, h * .3, .01, -w * .2, .12, .04), ret(w * .32, h * .3, .01, w * .2, .12, .04)], m(o.c3 || '#4a2e1c', { tex: 'madeira_velha' }));
      add(g, [esf(.035, w / 2 - .1, 1.0, .07), ret(.06, .14, .015, w / 2 - .1, .93, .045)], metal('#c8a050'));
      if (o.txt) { const mt = canvasMat(256, 80, (x, W, H) => { x.fillStyle = '#b8964a'; x.fillRect(0, 0, W, H); x.strokeStyle = '#5a4416'; x.lineWidth = 6; x.strokeRect(4, 4, W - 8, H - 8); x.fillStyle = '#1e1606'; x.font = 'bold 40px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; let t = 40; while (x.measureText(o.txt).width > W * .88 && t > 14) { t -= 2; x.font = `bold ${t}px Georgia, serif`; } x.fillText(o.txt, W / 2, H / 2 + 2); }, { me: .5, r: .35 }); pl(g, .36, .11, mt, 0, 1.6, .045); }
      const fresta = pl(g, w - .06, .025, m('#ffffff', { unico: true, e: o.cor || '#ffd8a0', ei: 1.6 }), 0, .02, .05);
      if (o.pisca) { const f = rng(o.sem || 3)() * 7; anim.push((dt, t) => { fresta.material.emissiveIntensity = 1.2 + Math.sin(t * 1.3 + f) * .6; }); }
      return g;
    };

    /* ---------- faixa zebrada no chão ---------- */
    P.a4_fita_chao = o => { const g = G(), w = o.w || 3, d = o.d || .12; const mt = canvasMat(256, 32, (x, W, H) => { x.fillStyle = o.c || '#e0b818'; x.fillRect(0, 0, W, H); x.fillStyle = '#141210'; for (let i = -32; i < W; i += 32) { x.beginPath(); x.moveTo(i, H); x.lineTo(i + 16, 0); x.lineTo(i + 32, 0); x.lineTo(i + 16, H); x.fill(); } x.fillStyle = 'rgba(40,30,20,.35)'; for (let i = 0; i < 300; i++) x.fillRect(Math.random() * W, Math.random() * H, 3, 2); }, { r: .8 }); mt.map.wrapS = T.RepeatWrapping; mt.map.repeat.set(Math.max(1, Math.round(w / 1)), 1); mt.polygonOffset = true; mt.polygonOffsetFactor = -1; const p = pl(g, w, d, mt, 0, .007, 0); p.rotation.x = -Math.PI / 2; return g; };

    /* ---------- refletor de obra em tripé ---------- */
    P.a4_refletor = o => {
      const g = G(), y = o.h || 1.7, aco = m('#2a2a28', { me: .5, r: .5 });
      add(g, [[0, .45], [2.1, .45], [4.2, .45]].map(([a, d]) => { const v = new T.CylinderGeometry(.015, .015, y + .05, 5); v.rotateZ(.22); v.rotateY(a); v.translate(Math.cos(a) * .2, y / 2, Math.sin(a) * .2); return v; }).concat([ret(.36, .28, .2, 0, y, 0, -.35)]), aco);
      const lente = pl(g, .3, .22, m('#ffffff', { unico: true, e: o.cor || '#f4f8ff', ei: o.apagado ? .05 : 2 }), 0, y + .17, .12); lente.rotation.x = -.35;
      if (!o.apagado && o.luz !== false) luz(g, o.cor || '#f4f8ff', o.i ?? 1.6, o.d || 9, 0, y + .1, .8, o.pisca);
      return g;
    };

    /* ---------- coluna clássica ---------- */
    P.a4_coluna = o => { const g = G(), H = o.h || ALT - .02, R = o.raio || .26, mt = m(o.c || '#e0dcd2', { tex: 'marmore', r: .4 }); const geos = [ret(R * 2.6, .2, R * 2.6, 0, 0, 0), cil(R * 1.15, R * 1.2, .14, 0, .2, 0, 18), cil(R * .92, R, H - .7, 0, .34, 0, 20), cil(R * 1.2, R * .95, .16, 0, H - .36, 0, 18), ret(R * 2.6, .2, R * 2.6, 0, H - .2, 0)]; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; geos.push(ret(.03, H - .74, .03, Math.cos(a) * R * .96, .36, Math.sin(a) * R * .96)); } g.add(juntar(geos, mt)); if (o.quebrada) { const c = sf(g, .08, m('#1a1614'), R * .9, 1.2, 0, 6); c.scale.set(.4, 3, 1); } return g; };
  });
})();
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  NS.extensoes = NS.extensoes || [];
  NS.extensoes.push(F => {
    const { P, m, bx, cy, sf, pl, luz, G, metal, tela, texCanvas, T, rng, anim, textoTex, guardar, ALT } = F;
    const canvasMat = (w, h, desenha, o = {}) => { const [c, x] = tela(w, h); desenha(x, c.width, c.height); const t = texCanvas(c); const mt = m('#ffffff', { unico: true, mapa: t, r: o.r ?? .8, me: o.me ?? 0 }); if (o.brilho) { mt.emissive = new T.Color('#ffffff'); mt.emissiveMap = t; mt.emissiveIntensity = o.brilho; } if (o.transp) mt.transparent = true; if (o.lado) mt.side = T.DoubleSide; if (o.alfa) mt.alphaTest = o.alfa; return mt; };
    function juntar(geos, mat) {
      let nv = 0; const gs = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; nv += n.attributes.position.count; return n; });
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2); let k = 0;
      gs.forEach(g => { pos.set(g.attributes.position.array, k * 3); nor.set(g.attributes.normal.array, k * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, k * 2); k += g.attributes.position.count; g.dispose(); });
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
      return new T.Mesh(guardar(geo), mat);
    }
    const rot = (g, rx, ry, rz) => { if (rx || ry || rz) g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0))); return g; };
    const ret = (w, h, d, x, y, z, rx, ry, rz) => { const g = rot(new T.BoxGeometry(w, h, d), rx, ry, rz); g.translate(x, y + h / 2, z); return g; };
    const cil = (r1, r2, h, x, y, z, seg = 10, rx, ry, rz) => { const g = rot(new T.CylinderGeometry(r1, r2, h, seg), rx, ry, rz); g.translate(x, y + h / 2, z); return g; };
    const esf = (r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 10) => { const g = new T.SphereGeometry(r, seg, Math.max(6, seg * .7)); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
    const barra = (a, b, r, seg = 6) => { const p1 = new T.Vector3(...a), p2 = new T.Vector3(...b), d = p2.clone().sub(p1), L = d.length(); const g = new T.CylinderGeometry(r, r, L, seg); g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()))); g.translate(p1.x + d.x / 2, p1.y + d.y / 2, p1.z + d.z / 2); return g; };
    const add = (g, geos, mat) => { if (geos.length) { const me = juntar(geos, mat); g.add(me); return me; } };

    /* ---------- cilindro metálico colossal, metade sólida e metade piscando, preso por correntes ---------- */
    P.a4_cilindro = o => {
      const g = G(), L = o.l || 7, R = o.raio || 1.35, yc = R + .25, r = rng(o.sem || 471);
      const pele = canvasMat(512, 256, (x, W, H) => { x.fillStyle = '#9aa2aa'; x.fillRect(0, 0, W, H); for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${r() * .06})`; x.fillRect(r() * W, r() * H, 2, 2); } x.strokeStyle = 'rgba(30,34,40,.6)'; x.lineWidth = 2; for (let i = 0; i < W; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j < H; j += 64) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); } x.fillStyle = 'rgba(20,20,24,.5)'; for (let i = 0; i < W; i += 16) for (let j = 4; j < H; j += 64) { x.beginPath(); x.arc(i + 4, j, 1.6, 0, 7); x.fill(); } x.fillStyle = 'rgba(40,30,20,.75)'; x.font = '22px serif'; for (let i = 0; i < 18; i++) x.fillText('ʘǂǁɮʭɸΣΩ◇'[Math.floor(r() * 9)], 10 + i * 28, H * .55); for (let i = 0; i < 8; i++) { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(90,50,20,0)'); gr.addColorStop(1, 'rgba(90,50,20,.3)'); x.fillStyle = gr; x.fillRect(r() * W, 0, 8 + r() * 20, H); } }, { r: .3, me: .8 });
      pele.map.wrapS = pele.map.wrapT = T.RepeatWrapping; pele.map.repeat.set(2, 1);
      const sol = G(); g.add(sol); const c1 = new T.CylinderGeometry(R, R, L / 2, 32, 1, true); c1.rotateZ(Math.PI / 2); c1.translate(-L / 4, yc, 0); add(sol, [c1], pele);
      const tampa = new T.CircleGeometry(R, 32); tampa.rotateY(-Math.PI / 2); tampa.translate(-L / 2, yc, 0); const aneis = []; for (let k = 1; k < 4; k++) { const t = new T.TorusGeometry(R * k / 4, .03, 6, 32); t.rotateY(Math.PI / 2); t.translate(-L / 2 - .02, yc, 0); aneis.push(t); }
      add(sol, [tampa], m('#7a8088', { me: .8, r: .35 })); add(sol, aneis, m('#5a6068', { me: .8, r: .3 }));
      const fan = G(); g.add(fan); const c2 = new T.CylinderGeometry(R, R, L / 2, 24, 4, true); c2.rotateZ(Math.PI / 2); c2.translate(L / 4, yc, 0);
      const mf = m('#ffffff', { unico: true, e: '#a8d0ff', ei: .9, op: .22, lado: 2, r: .2 }); mf.depthWrite = false; fan.add(new T.Mesh(guardar(c2), mf));
      const wf = new T.LineSegments(guardar(new T.EdgesGeometry(guardar(c2.clone()), 1)), new T.LineBasicMaterial({ color: '#cfe4ff', transparent: true, opacity: .55 })); guardar(wf.material); fan.add(wf);
      const borda = new T.TorusGeometry(R + .01, .03, 6, 40); borda.rotateY(Math.PI / 2); borda.translate(0, yc, 0); add(sol, [borda], m('#ffffff', { e: '#d0e8ff', ei: 1.4 }));
      const sela = []; [-L * .42, -L * .12].forEach(x0 => { sela.push(ret(.35, yc - R * .55, R * 1.6, x0, 0, 0), ret(.5, .1, R * 1.9, x0, 0, 0)); });
      add(g, sela, m('#3a3a36', { tex: 'ferrugem', me: .6 }));
      const elos = [], anc = []; const corr = (a, b, n) => { for (let i = 0; i < n; i++) { const t = new T.TorusGeometry(.06, .015, 5, 10); const p = new T.Vector3(...a).lerp(new T.Vector3(...b), (i + .5) / n); t.rotateY(i % 2 ? Math.PI / 2 : 0); const dir = new T.Vector3(...b).sub(new T.Vector3(...a)).normalize(); t.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir))); t.translate(p.x, p.y, p.z); elos.push(t); } };
      [[-L * .3, 1], [-L * .3, -1], [-L * .05, 1], [-L * .05, -1], [L * .2, 1], [L * .35, -1]].forEach(([x0, s], i) => { const pz = s * (R + .9); anc.push(ret(.3, .08, .3, x0, 0, pz), cil(.04, .04, .12, x0, .06, pz, 6)); if (x0 < 0) corr([x0, .15, pz], [x0, yc + R * .6, s * R * .75], 14); else { corr([x0, .15, pz], [x0 + .2, .9, s * (R + .35)], 7); corr([x0, ALT - .05, s * (R * .55)], [x0, ALT - .9, s * (R * .7)], 5); } });
      add(g, elos, metal('#5a5a58')); add(g, anc, m('#2a2a28', { me: .6 }));
      const f = r() * 9; anim.push((dt, t) => { const v = Math.sin(t * 3.7 + f) * Math.sin(t * 1.3) > -.25; fan.visible = v; fan.position.x = Math.random() < .05 ? (Math.random() - .5) * .15 : 0; mf.opacity = .14 + Math.abs(Math.sin(t * 5)) * .14; });
      return g;
    };

    /* ---------- painel-mapa do núcleo (centenas de luzinhas num círculo) ---------- */
    P.a4_mapa_nucleo = o => {
      const g = G(), w = o.w || 2.6, h = o.h || 1.8, y = o.y ?? .55, r = rng(o.sem || 473), N = o.n || 24;
      add(g, [ret(w + .12, h + .12, .16, 0, y - .06, 0)], m(o.c || '#b8bca8', { r: .6, me: .2 }));
      const [c, x] = tela(512, Math.round(512 * h / w)), t = texCanvas(c), mt = m('#ffffff', { unico: true, mapa: t, e: '#ffffff', ei: 1 }); mt.emissiveMap = t;
      const est = []; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const dx = i - N / 2 + .5, dy = j - N / 2 + .5; if (dx * dx + dy * dy <= (N / 2) * (N / 2)) est.push([i, j, r()]); }
      const pinta = tt => { x.fillStyle = '#2a2c28'; x.fillRect(0, 0, c.width, c.height); const tam = Math.min(c.width * .62, c.height * .92) / N, ox = c.width * .04 + 4, oy = (c.height - tam * N) / 2;
        est.forEach(([i, j, k]) => { const v = (k + Math.floor(tt * .7) * .13) % 1; x.fillStyle = k < .06 ? (Math.sin(tt * 4 + k * 50) > 0 ? '#ff3020' : '#3a0a08') : v < .5 ? '#f2f0d8' : v < .72 ? '#e8c838' : v < .85 ? '#30d060' : '#4a4a40'; x.beginPath(); x.arc(ox + (i + .5) * tam, oy + (j + .5) * tam, tam * .36, 0, 7); x.fill(); });
        const bx0 = c.width * .7; for (let k = 0; k < 6; k++) { x.fillStyle = '#e8e4d0'; x.fillRect(bx0, 20 + k * (c.height - 40) / 6, c.width * .26, (c.height - 40) / 6 - 8); x.fillStyle = '#2a2a2a'; x.fillRect(bx0 + 6, 30 + k * (c.height - 40) / 6, (c.width * .26 - 12) * (.3 + Math.abs(Math.sin(tt * .5 + k)) * .6), 8); }
        t.needsUpdate = true; };
      pinta(0); let ult = 0; anim.push((dt, tt) => { if (tt - ult < .5) return; ult = tt; pinta(tt); });
      pl(g, w, h, mt, 0, y + h / 2, .085);
      return g;
    };

    /* ---------- mesa de operador com chaves, botões e um botão grande protegido ---------- */
    P.a4_mesa_controle = o => {
      const g = G(), w = o.w || 2.4, r = rng(o.sem || 475), cas = m(o.c || '#c4c8b4', { r: .55, me: .2 });
      add(g, [ret(w, .7, .8, 0, 0, 0), ret(w, .06, .55, 0, .74, .02, -.32), ret(w, .45, .2, 0, .7, -.32)], cas);
      const pain = canvasMat(512, 128, (x, W, H) => { x.fillStyle = '#b8bca8'; x.fillRect(0, 0, W, H); for (let i = 0; i < 26; i++) { const px = 12 + i * 19, py = 20 + (i % 3) * 30; x.fillStyle = '#1a1a1a'; x.beginPath(); x.arc(px, py, 7, 0, 7); x.fill(); x.fillStyle = '#ddd'; x.fillRect(px - 1, py - 7, 2, 7); } for (let i = 0; i < 30; i++) { x.fillStyle = ['#d02020', '#20a040', '#e0c020', '#e8e8e8'][Math.floor(r() * 4)]; x.fillRect(10 + i * 16.5, 104, 10, 12); } }, { r: .7 });
      const tp = pl(g, w - .04, .5, pain, 0, .8, .06); tp.rotation.x = -Math.PI / 2 + .32;
      const tel = canvasMat(256, 64, (x, W, H) => { x.fillStyle = '#0a0806'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffb040'; x.font = 'bold 26px monospace'; x.fillText(o.txt || '0000', 14, 42); }, { brilho: 1 });
      [-w * .3, w * .3].forEach(xx => pl(g, .5, .14, tel, xx, 1.0, -.215));
      if (o.botao) { const b = G(); b.position.set(o.bx ?? 0, .86, .05); b.rotation.x = .32; g.add(b); cy(b, .12, .12, .05, m('#2a2a2a'), 0, 0, 0, 18); cy(b, .09, .09, .05, m('#ffffff', { unico: true, e: '#c02020', ei: .45, r: .5 }), 0, .04, 0, 18); const tampa = cy(b, .13, .13, .02, m('#d8e8f0', { op: .3 }), 0, .14, -.05, 18); tampa.rotation.x = -.5;
        const et = canvasMat(256, 64, (x, W, H) => { x.fillStyle = '#e8e4d0'; x.fillRect(0, 0, W, H); x.fillStyle = '#111'; x.font = 'bold 40px Arial'; x.textAlign = 'center'; x.fillText(o.botao, W / 2, 46); }); pl(b, .26, .065, et, 0, .03, .19).rotation.x = -Math.PI / 2;
        if (o.po !== false) { const pmat = canvasMat(128, 128, (x, W, H) => { x.clearRect(0, 0, W, H); for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(150,140,120,${Math.random() * .5})`; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); } }, { transp: true }); pmat.depthWrite = false; const p = pl(b, .4, .4, pmat, 0, .1, 0); p.rotation.x = -Math.PI / 2; } }
      return g;
    };

    /* ---------- plateia: fileiras de poltronas ocupadas (geometria unida, leve) ---------- */
    P.a4_plateia = o => {
      const g = G(), fil = o.filas || 3, n = o.n || 6, esp = o.esp || .62, fe = o.fe || .95, dg = o.degrau ?? .12, r = rng(o.sem || 477), cad = [], roupa = [], pele = [], cab = [];
      for (let f = 0; f < fil; f++) for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * esp, z = f * fe, y = f * dg;
        cad.push(ret(.55, .42 + y, .5, x, 0, z), ret(.55, .62, .12, x, .42 + y, z + .21), ret(.06, .2, .5, x - .29, .42 + y, z), ret(.06, .2, .5, x + .29, .42 + y, z));
        if (o.vazios && r() < o.vazios) continue;
        const yb = .44 + y, hd = (r() - .5) * .04;
        roupa.push(ret(.36, .5, .22, x, yb, z + .06, -.05), ret(.32, .14, .42, x, yb, z - .14), ret(.12, .44, .12, x - .09, yb - .44, z - .32), ret(.12, .44, .12, x + .09, yb - .44, z - .32), ret(.09, .4, .1, x - .22, yb + .08, z - .02, .5), ret(.09, .4, .1, x + .22, yb + .08, z - .02, .5));
        pele.push(cil(.05, .05, .1, x, yb + .5, z + .05, 6), esf(.115, x + hd, yb + .72, z + .04, .9, 1.1, 1, 10));
        cab.push(esf(.12, x + hd, yb + .75, z + .07, .95, .9, 1, 8));
      }
      add(g, cad, m(o.c || '#6b1220', { tex: 'veludo', r: 1 })); add(g, roupa, m(o.roupa || '#d9661f', { r: .85 })); add(g, pele, m(o.pele || '#c9a38a', { r: .7 })); add(g, cab, m(o.cabelo || '#2b1d14', { r: .9 }));
      return g;
    };

    /* ---------- boca de cena: pilastras, bambolina franzida e moldura dourada ---------- */
    P.a4_proscenio = o => {
      const g = G(), w = o.w || 8, H = ALT, ouro = m('#a8883a', { me: .7, r: .35 }), ver = m(o.c || '#6a0c18', { tex: 'veludo', r: 1, lado: 2 });
      [-1, 1].forEach(s => { const p = G(); g.add(p); add(p, [ret(.5, H, .4, s * (w / 2 + .25), 0, 0)], ver); add(p, [ret(.56, .1, .44, s * (w / 2 + .25), 0, 0), ret(.56, .1, .44, s * (w / 2 + .25), H - .5, 0), ret(.06, H - .6, .05, s * (w / 2), .1, .2)], ouro); });
      const top = G(); g.add(top);
      const geo = new T.PlaneGeometry(w + .2, .75, 60, 1), ps = geo.attributes.position; for (let i = 0; i < ps.count; i++) { const xx = ps.getX(i); ps.setZ(i, Math.sin(xx * 12) * .05); if (ps.getY(i) < 0) ps.setY(i, ps.getY(i) - Math.abs(Math.sin(xx * 1.6)) * .18); } geo.computeVertexNormals(); geo.translate(0, H - .45, .12);
      top.add(new T.Mesh(guardar(geo), ver)); add(top, [ret(w + 1, .1, .1, 0, H - .1, .14)], ouro);
      return g;
    };

    /* ---------- retrato a óleo (mesmo rosto em épocas diferentes) ---------- */
    P.a4_retrato = o => {
      const g = G(), w = o.w || .7, h = o.h || .9, y = o.y ?? 1.2, rr = rng(o.rosto || 1), r = rng((o.sem || 479) + 7), ep = o.epoca || 'xix';
      const pele = ['#e0b898', '#c89070', '#a87050', '#8a5a3a', '#f0c8a8'][Math.floor(rr() * 5)], cabelo = ['#1a1410', '#3a2414', '#6a4a2a', '#a07040', '#2a2a2a'][Math.floor(rr() * 5)], larg = .8 + rr() * .3, alt = .9 + rr() * .25, olhos = rr() * .2, nariz = .8 + rr() * .4, longo = rr() < .5;
      const mt = canvasMat(256, Math.round(256 * h / w), (x, W, H) => {
        const fd = x.createRadialGradient(W * .5, H * .4, 10, W * .5, H * .5, W); fd.addColorStop(0, o.fundo || '#4a3a28'); fd.addColorStop(1, '#120c06'); x.fillStyle = fd; x.fillRect(0, 0, W, H);
        const cx = W / 2, cyy = H * .38, fw = W * .17 * larg, fh = H * .15 * alt;
        const roupa = { xvi: '#1a1a1a', xvii: '#3a1a2a', xviii: '#2a3a5a', xix: '#1e1e22', xx: '#3a3a40', cobaia: '#d9661f' }[ep] || '#222';
        x.fillStyle = roupa; x.beginPath(); x.ellipse(cx, H * .95, W * .42, H * .3, 0, 0, 7); x.fill();
        if (ep === 'xvi' || ep === 'xvii') { x.fillStyle = '#efe8dc'; for (let i = 0; i < 14; i++) { x.beginPath(); x.ellipse(cx + Math.cos(i / 14 * 6.28) * fw * 1.1, cyy + fh * 1.2 + Math.sin(i / 14 * 6.28) * fh * .25, fw * .3, fh * .18, 0, 0, 7); x.fill(); } }
        if (ep === 'xix' || ep === 'xx') { x.fillStyle = '#ece6da'; x.beginPath(); x.moveTo(cx - fw * .7, cyy + fh * 1.05); x.lineTo(cx, cyy + fh * 1.9); x.lineTo(cx + fw * .7, cyy + fh * 1.05); x.fill(); x.fillStyle = ep === 'xx' ? '#7a1a1a' : '#111'; x.fillRect(cx - 5, cyy + fh * 1.2, 10, fh * .6); }
        if (ep === 'cobaia') { x.fillStyle = '#b84a10'; x.fillRect(cx - 3, cyy + fh * 1.2, 6, H); x.fillStyle = '#efe6d0'; x.fillRect(cx + fw * .5, H * .75, fw * .9, fh * .35); }
        x.fillStyle = pele; x.fillRect(cx - fw * .35, cyy + fh * .7, fw * .7, fh * .6);
        if (ep === 'xviii') { x.fillStyle = '#e8e4dc'; x.beginPath(); x.ellipse(cx, cyy - fh * .1, fw * 1.25, fh * 1.15, 0, 0, 7); x.fill(); }
        else { x.fillStyle = cabelo; x.beginPath(); x.ellipse(cx, cyy - fh * .25, fw * 1.08, fh * (longo ? 1.25 : .95), 0, 0, 7); x.fill(); if (longo) x.fillRect(cx - fw * 1.05, cyy - fh * .2, fw * 2.1, fh * 1.5); }
        x.fillStyle = pele; x.beginPath(); x.ellipse(cx, cyy, fw, fh, 0, 0, 7); x.fill();
        x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(cx + fw * .35, cyy + fh * .1, fw * .6, fh * .95, 0, 0, 7); x.fill();
        x.fillStyle = '#1a120c'; [-1, 1].forEach(s => { x.beginPath(); x.ellipse(cx + s * fw * (.4 + olhos), cyy - fh * .12, fw * .13, fh * .07, 0, 0, 7); x.fill(); });
        x.strokeStyle = 'rgba(60,30,20,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cyy - fh * .05); x.lineTo(cx - fw * .1 * nariz, cyy + fh * .3 * nariz); x.lineTo(cx + fw * .05, cyy + fh * .33); x.stroke();
        x.fillStyle = '#6a2a2a'; x.fillRect(cx - fw * .3, cyy + fh * .55, fw * .6, fh * .07);
        for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,230,180'},${r() * .06})`; x.fillRect(r() * W, r() * H, 3, 2); }
        x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = .6; for (let i = 0; i < 40; i++) { x.beginPath(); const a = r() * W, b = r() * H; x.moveTo(a, b); x.lineTo(a + (r() - .5) * 20, b + (r() - .5) * 20); x.stroke(); }
      }, { r: .6 });
      const ouro = m('#8a6a2a', { me: .75, r: .35 }), mol = .08;
      add(g, [ret(w + mol * 2, mol, .07, 0, y - mol, 0), ret(w + mol * 2, mol, .07, 0, y + h, 0), ret(mol, h, .07, -w / 2 - mol / 2, y, 0), ret(mol, h, .07, w / 2 + mol / 2, y, 0)], ouro);
      pl(g, w, h, mt, 0, y + h / 2, .02);
      if (o.txt) { const pm = canvasMat(256, 48, (x, W, H) => { x.fillStyle = '#c9a24b'; x.fillRect(0, 0, W, H); x.fillStyle = '#2b2b2b'; x.font = 'bold 24px Georgia, serif'; x.textAlign = 'center'; x.fillText(o.txt, W / 2, 33); }, { me: .5, r: .35 }); pl(g, .32, .06, pm, 0, y - mol - .09, .02); }
      return g;
    };

    /* ---------- placa de museu (bronze), ou o lugar de onde foi arrancada ---------- */
    P.a4_placa_museu = o => {
      const g = G(), y = o.y ?? 1.4, w = o.w || .62, h = o.h || .34;
      if (o.arrancada) { const mt = canvasMat(256, 140, (x, W, H) => { x.clearRect(0, 0, W, H); x.fillStyle = 'rgba(230,224,206,.55)'; x.fillRect(10, 10, W - 20, H - 20); x.strokeStyle = 'rgba(30,20,10,.5)'; x.lineWidth = 2; for (let i = 0; i < 12; i++) { x.beginPath(); const a = 10 + Math.random() * (W - 20), b = 10 + Math.random() * (H - 20); x.moveTo(a, b); x.lineTo(a + (Math.random() - .5) * 40, b + (Math.random() - .5) * 20); x.stroke(); } x.fillStyle = '#1a1410'; [[22, 22], [W - 22, 22], [22, H - 22], [W - 22, H - 22]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 5, 0, 7); x.fill(); }); }, { transp: true }); mt.depthWrite = false; pl(g, w, h, mt, 0, y + h / 2, .012); return g; }
      const mt = canvasMat(512, Math.round(512 * h / w), (x, W, H) => { const gr = x.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#c8a050'); gr.addColorStop(.5, '#8a6a2a'); gr.addColorStop(1, '#b08a40'); x.fillStyle = gr; x.fillRect(0, 0, W, H); x.strokeStyle = '#4a3410'; x.lineWidth = 8; x.strokeRect(10, 10, W - 20, H - 20); x.fillStyle = '#2a1d08'; x.textAlign = 'center'; const L = String(o.txt || '').split('\n'); L.forEach((l, i) => { let t = i ? 34 : 50; x.font = `bold ${t}px Georgia, serif`; while (x.measureText(l).width > W * .86 && t > 12) { t -= 2; x.font = `bold ${t}px Georgia, serif`; } x.fillText(l, W / 2, H / 2 - (L.length - 1) * 24 + i * 50 + 14); }); if (o.gasta) for (let i = 0; i < 600; i++) { x.fillStyle = `rgba(40,60,40,${Math.random() * .2})`; x.fillRect(Math.random() * W, Math.random() * H, 4, 4); } }, { me: .65, r: .35 });
      add(g, [ret(w + .04, h + .04, .025, 0, y - .02, 0)], m('#5a4416', { me: .7, r: .4 })); pl(g, w, h, mt, 0, y + h / 2, .014);
      return g;
    };

    /* ---------- pilha de pastas com etiqueta (sobre mesa ou chão) ---------- */
    P.a4_pasta = o => {
      const g = G(), n = o.n || 5, r = rng(o.sem || 481), cores = o.cores || ['#b89a5a', '#8a6a3a', '#6a7a5a'], geos = {};
      for (let i = 0; i < n; i++) { const c = cores[i % cores.length]; (geos[c] = geos[c] || []).push(ret(.26, .028, .34, (r() - .5) * .04, i * .03, (r() - .5) * .04, 0, (r() - .5) * .3)); }
      Object.entries(geos).forEach(([c, gs]) => add(g, gs, m(c, { r: .85 })));
      if (o.txt) { const mt = canvasMat(256, 64, (x, W, H) => { x.fillStyle = o.f || '#b81a1a'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; let t = 30; x.font = `bold ${t}px Arial`; while (x.measureText(o.txt).width > W * .9 && t > 10) { t -= 2; x.font = `bold ${t}px Arial`; } x.textAlign = 'center'; x.fillText(o.txt, W / 2, 42); }); const et = pl(g, .2, .05, mt, 0, n * .03 + .002, 0); et.rotation.x = -Math.PI / 2; et.rotation.z = (r() - .5) * .3; }
      return g;
    };

    /* ---------- prateleira de boticário com frascos de sangue etiquetados ---------- */
    P.a4_prateleira_frascos = o => {
      const g = G(), w = o.w || 2.0, h = o.h || 2.0, r = rng(o.sem || 483), mad = m(o.c || '#4a2e1c', { tex: 'madeira_velha' }), et = o.etiquetas || [], vaz = o.vazio ?? -1;
      const nP = 4; add(g, [ret(.05, h, .4, -w / 2, 0, 0), ret(.05, h, .4, w / 2, 0, 0), ret(w, h, .02, 0, 0, -.19)].concat(Array.from({ length: nP + 1 }, (_, k) => ret(w, .03, .4, 0, .1 + k * (h - .15) / nP, 0))), mad);
      const vid = [], liq = [], tam = []; let idx = 0;
      for (let k = 0; k < nP; k++) { const yy = .13 + k * (h - .15) / nP, nn = Math.floor(w / .3); for (let i = 0; i < nn; i++) { if (r() < .12) continue; const x = -w / 2 + .18 + i * (w - .3) / (nn - 1 || 1), hh = .2 + r() * .1; vid.push(cil(.08, .08, hh, x, yy, 0, 12)); tam.push(cil(.085, .085, .03, x, yy + hh, 0, 12)); const vazio = idx === vaz; if (!vazio) liq.push(cil(.07, .07, hh * (.55 + r() * .4), x, yy + .005, 0, 12)); if (et.length) { const tx = vazio ? (o.etiquetaVazio || '') : et[idx % et.length]; const mt = canvasMat(128, 64, (x2, W, H) => { x2.fillStyle = '#e8dcb8'; x2.fillRect(0, 0, W, H); x2.strokeStyle = '#3a2a10'; x2.lineWidth = 3; x2.strokeRect(3, 3, W - 6, H - 6); x2.fillStyle = '#2a1a08'; x2.font = 'italic bold 30px Georgia, serif'; x2.textAlign = 'center'; x2.fillText(tx, W / 2, 43); }); pl(g, .12, .06, mt, x, yy + hh * .45, .082); } idx++; } }
      add(g, vid, m('#d8e8e0', { op: .3, r: .05 })); add(g, liq, m('#4a0408', { r: .2, e: '#1a0000', ei: .3 })); add(g, tam, m('#6a4a2a', { r: .7 }));
      return g;
    };

    /* ---------- balaustrada de madeira (tribunal, galeria) ---------- */
    P.a4_balaustrada = o => {
      const g = G(), w = o.w || 3, h = o.h || .95, mad = m(o.c || '#4a2e14', { tex: 'madeira_velha', r: .6 }), geos = [ret(w, .07, .12, 0, h - .07, 0), ret(w, .06, .1, 0, 0, 0)];
      const n = Math.round(w / .16); for (let i = 0; i <= n; i++) { const x = -w / 2 + .06 + i * (w - .12) / n; geos.push(cil(.022, .03, h - .13, x, .06, 0, 6)); }
      [-1, 1].forEach(s => geos.push(ret(.12, h + .08, .14, s * w / 2, 0, 0)));
      add(g, geos, mad); return g;
    };
  });
})();
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  NS.extensoes = NS.extensoes || [];
  NS.extensoes.push(F => {
    const { P, m, sf, pl, G, tela, texCanvas, T, guardar } = F;
    /* ---------- capacete meio enterrado com uma frase riscada ---------- */
    P.a4_capacete_riscado = o => {
      const g = G(), c = new T.Mesh(guardar(new T.SphereGeometry(.19, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), m(o.c || '#4a4a32', { r: .7, me: .25 })); c.rotation.set(.35, 0, .2); c.position.y = -.04; g.add(c);
      const aba = new T.Mesh(guardar(new T.RingGeometry(.18, .23, 20)), m(o.c || '#4a4a32', { r: .7, me: .25, lado: 2 })); aba.rotation.x = -Math.PI / 2 + .35; aba.rotation.y = .2; aba.position.y = -.02; g.add(aba);
      if (o.txt) { const [cv, x] = tela(256, 96); x.clearRect(0, 0, 256, 96); x.strokeStyle = 'rgba(210,200,170,.95)'; x.fillStyle = 'rgba(215,205,175,.95)'; x.font = 'bold 26px "Courier New", monospace'; x.textAlign = 'center'; String(o.txt).split('\n').forEach((l, i, a) => x.fillText(l, 128, 48 - (a.length - 1) * 14 + i * 28)); const t = texCanvas(cv); const mt = m('#ffffff', { unico: true, mapa: t, r: .8 }); mt.transparent = true; mt.depthWrite = false; mt.polygonOffset = true; mt.polygonOffsetFactor = -3; const p = pl(g, .34, .13, mt, 0, .07, .16); p.rotation.x = -.55; }
      if (o.areia !== false) { const a = new T.Mesh(guardar(new T.CircleGeometry(.4, 18)), m(o.chao || '#1a1816', { r: 1, tex: 'areia' })); a.rotation.x = -Math.PI / 2; a.position.y = .004; a.scale.set(1, .7, 1); g.add(a); }
      return g;
    };
  });
})();
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  NS.extensoes = NS.extensoes || [];
  NS.extensoes.push(F => {
    const { P, G, luz } = F;
    /* ---------- luz sem fonte visível (céu aberto, sol, brilho de um lugar) ---------- */
    P.a4_luz = o => { const g = G(); luz(g, o.c || '#ffffff', o.i ?? 1, o.d || 10, 0, o.y ?? 2.9, 0, o.pisca); return g; };
  });
})();
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  NS.extensoes = NS.extensoes || [];
  NS.extensoes.push(F => {
    const { P, m, G, tela, texCanvas, T, guardar, cy, bx, pl, metal } = F;
    /* ---------- boca de poço com escada em caracol descendo para o escuro (profundidade pintada) ---------- */
    P.a4_poco_espiral = o => {
      const g = G(), R = o.raio || 1.5;
      const [c, x] = tela(512, 512); const C = 256;
      x.fillStyle = '#000'; x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 260; i++) { const k = i / 260, a = i * .33, rr = C * (1 - k) * .98, rin = rr * .32, cor = Math.round(120 * Math.pow(1 - k, 1.6));
        if (rr < 6) break; x.fillStyle = `rgb(${cor},${cor},${Math.round(cor * 1.05)})`; x.beginPath(); x.moveTo(C + Math.cos(a) * rin, C + Math.sin(a) * rin); x.lineTo(C + Math.cos(a) * rr, C + Math.sin(a) * rr); x.lineTo(C + Math.cos(a + .28) * rr, C + Math.sin(a + .28) * rr); x.lineTo(C + Math.cos(a + .28) * rin, C + Math.sin(a + .28) * rin); x.fill();
        x.strokeStyle = `rgba(0,0,0,.7)`; x.lineWidth = 1; x.stroke(); }
      for (let i = 0; i < 40; i++) { const k = i / 40, rr = C * (1 - k); x.strokeStyle = `rgba(${Math.round(60 * (1 - k))},${Math.round(56 * (1 - k))},${Math.round(52 * (1 - k))},.8)`; x.lineWidth = 2; x.beginPath(); x.arc(C, C, rr, 0, 7); x.stroke(); }
      const gr = x.createRadialGradient(C, C, 0, C, C, C); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.35, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
      const disco = new T.Mesh(guardar(new T.CircleGeometry(R, 48)), m('#ffffff', { unico: true, mapa: texCanvas(c), r: 1 })); disco.rotation.x = -Math.PI / 2; disco.position.y = .006; g.add(disco);
      const anel = new T.Mesh(guardar(new T.RingGeometry(R, R + .12, 48)), m('#2a2622', { me: .6, r: .5, lado: 2 })); anel.rotation.x = -Math.PI / 2; anel.position.y = .008; g.add(anel);
      cy(g, .09, .09, .04, metal('#3a3c3f'), 0, 0, 0, 12);
      const degrau = bx(g, R * .9, .03, .32, m('#3a3c3f', { me: .7, r: .45 }), R * .5, 0, 0);
      if (o.txt) { const [c2, x2] = tela(256, 52); x2.fillStyle = '#2a2a2a'; x2.fillRect(0, 0, 256, 52); x2.fillStyle = '#c8c8c8'; x2.font = 'bold 26px Georgia, serif'; x2.textAlign = 'center'; x2.fillText(o.txt, 128, 35); const p = pl(g, R * .8, .16, m('#ffffff', { unico: true, mapa: texCanvas(c2), me: .4 }), R * .5, .034, 0); p.rotation.x = -Math.PI / 2; }
      return g;
    };
  });
})();
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  NS.extensoes = NS.extensoes || [];
  NS.extensoes.push(F => {
    const { P, m, G, T, rng, anim, luz, guardar } = F;
    /* ---------- grupo de velas no chão (geometria unida; luz opcional, uma só) ---------- */
    P.a4_velas = o => {
      const g = G(), n = o.n || 6, R = o.raio || .4, r = rng(o.sem || 491), cera = [], ch = [];
      for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * R, x = Math.cos(a) * d, z = Math.sin(a) * d, h = .08 + r() * .25; const c = new T.CylinderGeometry(.03, .035, h, 8); c.translate(x, h / 2, z); cera.push(c); const f = new T.ConeGeometry(.014, .045, 6); f.translate(x, h + .03, z); ch.push(f); }
      const junta = (gs, mat) => { let nv = 0; const ns = gs.map(q => { const k = q.index ? q.toNonIndexed() : q; nv += k.attributes.position.count; return k; }); const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3); let k = 0; ns.forEach(q => { pos.set(q.attributes.position.array, k * 3); nor.set(q.attributes.normal.array, k * 3); k += q.attributes.position.count; q.dispose(); }); const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.computeBoundingSphere(); const me = new T.Mesh(guardar(geo), mat); g.add(me); return me; };
      junta(cera, m(o.c || '#e8dfc8', { r: .6 })); const fl = junta(ch, m('#ffb000', { unico: true, e: '#ffcc55', ei: 2.4 }));
      anim.push((dt, t) => { fl.material.emissiveIntensity = 2 + Math.sin(t * 11) * .4; });
      if (o.luz) luz(g, '#ffb347', o.i ?? .7, o.d || 4, 0, .4, 0, 'vela');
      return g;
    };
  });
})();

/* ===================== 5º andar ===================== */
/* props_a5.js · objetos orgânicos e de "ventre" para salas tomadas por carne, ossos e membranas.
   Tudo genérico: o que cada sala tem (textos, cores, quantidades) vem do arquivo de cenas.
   Geometria leve: peças simples juntadas numa malha só por material, no máximo uma luz por objeto. */
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  NS.extensoes = NS.extensoes || [];
  // textura de pele com estrelas tatuadas (tinta escura, contorno borrado)
  NS.texturas = NS.texturas || {};
  NS.texturas.a5_pele_estrelas = (x, S, r) => {
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(${150 + r() * 70},${60 + r() * 40},${60 + r() * 30},${.08 + r() * .1})`; x.beginPath(); x.ellipse(r() * S, r() * S, 10 + r() * 60, 8 + r() * 40, r() * 3, 0, 7); x.fill(); }
    for (let i = 0; i < 46; i++) { const px = r() * S, py = r() * S, s = 8 + r() * 18, a0 = r() * 6.28; x.beginPath(); for (let k = 0; k < 10; k++) { const an = a0 + k / 10 * Math.PI * 2, rr = k % 2 ? s * .42 : s; x.lineTo(px + Math.cos(an) * rr, py + Math.sin(an) * rr); } x.closePath(); x.fillStyle = `rgba(20,24,60,${.55 + r() * .3})`; x.shadowColor = 'rgba(20,30,80,.6)'; x.shadowBlur = 4; x.fill(); }
    x.shadowBlur = 0; for (let i = 0; i < 200; i++) { x.fillStyle = 'rgba(30,30,70,.5)'; x.fillRect(r() * S, r() * S, 2, 2); }
    x.strokeStyle = 'rgba(120,30,40,.25)'; for (let i = 0; i < 12; i++) { x.lineWidth = 1 + r() * 2; x.beginPath(); let px = r() * S, py = r() * S; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - .5) * 60; py += (r() - .5) * 60; x.lineTo(px, py); } x.stroke(); }
  };
  NS.extensoes.push(F => {
    const { P, m, bx, cy, sf, pl, luz, G, metal, tela, texCanvas, T, rng, anim, guardar, ALT } = F;
    const figura = F.figura;
    const V = (x, y, z) => new T.Vector3(x, y, z), UP = V(0, 1, 0);

    /* ---------- utilidades de geometria ---------- */
    function juntar(geos, mat) {
      let nv = 0; const gs = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; nv += n.attributes.position.count; return n; });
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2); let o = 0;
      gs.forEach(g => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); });
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
      return new T.Mesh(guardar(geo), mat);
    }
    const addJ = (pai, geos, mat) => { if (!geos.length) return null; const me = juntar(geos, mat); pai.add(me); return me; };
    // caixa com a base em y
    const caixa = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = new T.BoxGeometry(w, h, d); if (rx || ry || rz) g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(rx, ry, rz))); g.translate(x, y + h / 2, z); return g; };
    // bola (elipsoide) com o centro em (x,y,z)
    const bola = (r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 10) => { const g = new T.SphereGeometry(r, seg, Math.max(6, Math.round(seg * .7))); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
    // cilindro entre dois pontos
    const haste = (a, b, r1, r2 = r1, seg = 6) => { const p1 = V(...a), p2 = V(...b), d = p2.clone().sub(p1), L = d.length() || .001; const g = new T.CylinderGeometry(r2, r1, L, seg); g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(UP, d.clone().normalize()))); const c = p1.clone().add(d.multiplyScalar(.5)); g.translate(c.x, c.y, c.z); return g; };
    const tuboG = (pts, r, seg = 20, rs = 6) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => V(...p))), seg, r, rs, false);
    const amassar = (g, a, f) => { g.computeBoundingBox(); const c = g.boundingBox.getCenter(V(0, 0, 0)), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) - c.x, y = p.getY(i) - c.y, z = p.getZ(i) - c.z, k = 1 + a * Math.sin(x * 7 + f) * Math.sin(y * 5.3 + f * 2) * Math.sin(z * 6.1 + f * 3); p.setXYZ(i, c.x + x * k, c.y + y * k, c.z + z * k); } g.computeVertexNormals(); return g; };
    const carne = (c = '#8a3a3c', o = {}) => m(c, { tex: o.tex || 'carne', rep: o.rep || [1, 1], r: o.r ?? .38, me: .05, e: o.e || '#2a0507', ei: o.ei ?? .3, lado: 2, ...(o.unico ? { unico: true } : {}) });
    const canvasMat = (w, h, desenha, o = {}) => { const [c, x] = tela(w, h); desenha(x, c.width, c.height); const t = texCanvas(c); const mt = m('#ffffff', { unico: true, mapa: t, r: o.r ?? .8, me: o.me ?? 0 }); if (o.brilho) { mt.emissive = new T.Color('#ffffff'); mt.emissiveMap = t; mt.emissiveIntensity = o.brilho; } if (o.transp) { mt.transparent = true; mt.depthWrite = false; } if (o.lado) mt.side = T.DoubleSide; return mt; };

    // olho de carne (pálpebra, globo, íris, brilho) que pisca de vez em quando
    function olho(pai, x, y, z, s, r, lista) {
      const ol = G(); ol.position.set(x, y, z); ol.scale.setScalar(s); pai.add(ol);
      const pal = sf(ol, .2, m('#5a1e22', { r: .5 }), 0, 0, -.05, 9); pal.scale.set(1.35, .85, .55);
      const glob = sf(ol, .15, m('#120807', { r: .12, me: .2 }), 0, 0, 0, 10); glob.scale.set(1.3, .9, .9);
      const iris = sf(ol, .07, m('#3b2414', { r: .2 }), 0, 0, .1, 7); iris.scale.set(1.4, .8, .4);
      sf(ol, .02, m('#ffffff', { e: '#ffffff', ei: .6 }), .05, .04, .14, 4);
      lista.push([ol, r() * 9]);
    }
    const animOlhos = lista => { if (lista.length) anim.push((dt, t) => lista.forEach(([ol, f]) => { ol.rotation.y = Math.sin(t * .4 + f) * .35; ol.rotation.x = Math.sin(t * .3 + f * 2) * .15; ol.scale.y = ol.scale.x * ((Math.sin(t * .7 + f) > .985) ? .1 : 1); })); };
    // boca costurada (ou aberta, com dentes)
    function boca(pai, x, y, z, s, aberta, r) {
      const b = G(); b.position.set(x, y, z); b.scale.setScalar(s); pai.add(b);
      const lab = new T.Mesh(guardar(new T.TorusGeometry(.13, .05, 5, 12)), m('#6a2228', { r: .4 })); lab.scale.set(1.25, aberta ? .7 : .32, .6); b.add(lab);
      const fundo = sf(b, .12, m('#0a0202', { r: 1 }), 0, 0, -.02, 7); fundo.scale.set(1.2, aberta ? .6 : .2, .3);
      if (aberta) { const d = []; for (let i = 0; i < 7; i++) { const xx = -.12 + i * .04; d.push(caixa(.022, .035, .02, xx, .045 - .035, .03)); d.push(caixa(.022, .035, .02, xx + .01, -.045, .03)); } addJ(b, d, m('#d8cfb0', { r: .5 })); const f = r() * 6; anim.push((dt, t) => { b.scale.y = s * (1 + Math.sin(t * 1.6 + f) * .18); }); }
      else { const pts = []; for (let i = 0; i < 6; i++) { const xx = -.13 + i * .052; pts.push(caixa(.008, .13, .012, xx, -.065, .05, 0, 0, (i % 2 ? .35 : -.35))); } addJ(b, pts, m('#120606', { r: .7 })); }
      return b;
    }

    /* ---------- carne crescendo sobre a parede (com veias, olhos e bocas) ---------- */
    P.a5_carne_parede = o => {
      const g = G(), w = o.w || 2, h = o.h || 2, y0 = o.y ?? 0, pr = o.prof ?? .25, r = rng(o.sem || 501);
      const f1 = r() * 6, f2 = r() * 6, f3 = r() * 6;
      const R = a => o.cheio ? 9 : .78 + .14 * Math.sin(a * 3 + f1) + .08 * Math.sin(a * 7 + f2);
      const alt = (u, v) => { const rr = Math.hypot(u, v), a = Math.atan2(v, u), e = o.cheio ? Math.max(0, (1 - Math.abs(u) ** 6) * (1 - Math.abs(v) ** 6)) : Math.max(0, 1 - (rr / R(a)) ** 2); return pr * e * (.75 + .25 * Math.sin(u * 4 + f3) * Math.cos(v * 3.3 + f1)); };
      const sx = Math.max(6, Math.min(18, Math.round(w * 3.2))), sy = Math.max(6, Math.min(14, Math.round(h * 3.2)));
      const geo = guardar(new T.PlaneGeometry(w, h, sx, sy)), pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let u = pos.getX(i) / (w / 2), v = pos.getY(i) / (h / 2); const rr = Math.hypot(u, v), a = Math.atan2(v, u), lim = R(a);
        if (rr > lim) { u *= lim / rr; v *= lim / rr; }
        pos.setXYZ(i, u * w / 2, v * h / 2, alt(u, v));
      }
      geo.computeVertexNormals();
      const mat = carne(o.c || '#7a2a2e', { rep: [Math.max(1, Math.round(w / 1.5)), Math.max(1, Math.round(h / 1.5))], unico: true, tex: o.tex, e: o.e });
      const me = new T.Mesh(geo, mat); me.position.y = y0 + h / 2; g.add(me);
      // veias por cima
      if (o.veias !== false) {
        const vs = [];
        for (let k = 0; k < (o.nveias || 5); k++) { let u = (r() - .5) * .3, v = (r() - .5) * .3; const ang = r() * 6.28, pts = []; for (let s = 0; s < 6; s++) { pts.push([u * w / 2, y0 + h / 2 + v * h / 2, alt(u, v) + .012]); u += Math.cos(ang + (r() - .5)) * .16; v += Math.sin(ang + (r() - .5)) * .16; if (Math.hypot(u, v) > .85) break; } if (pts.length > 2) vs.push(tuboG(pts, .012 + r() * .018, 10, 4)); }
        addJ(g, vs, m(o.cv || '#3a0a16', { r: .35, e: '#1a0006', ei: .4 }));
      }
      const lista = [];
      for (let i = 0; i < (o.olhos || 0); i++) { const u = (r() - .5) * 1.1, v = (r() - .5) * 1.0; olho(g, u * w / 2 * .8, y0 + h / 2 + v * h / 2 * .8, alt(u * .8, v * .8) + .02, (o.tamOlho || .8) * (.7 + r() * .5), r, lista); }
      animOlhos(lista);
      if (o.fechados) { const pf = [], ps = []; for (let i = 0; i < o.fechados; i++) { const u = (r() - .5) * 1.2, v = (r() - .5) * 1.0, px = u * w / 2 * .8, py = y0 + h / 2 + v * h / 2 * .8, pz = alt(u * .8, v * .8), s = (o.tamOlho || .8) * (.7 + r() * .5); pf.push(bola(.2 * s, px, py, pz + .02, 1.4, .55, .45, 7)); ps.push(caixa(.42 * s, .012, .02, px, py - .006, pz + .02 + .08 * s)); for (let k = 0; k < 5; k++) ps.push(caixa(.006, .05 * s, .006, px - .14 * s + k * .07 * s, py - .05 * s, pz + .02 + .08 * s, 0, 0, (k - 2) * .2)); } addJ(g, pf, m(o.c || '#7a2a2e', { r: .45, tex: 'carne' })); addJ(g, ps, m('#140606', { r: .8 })); }
      for (let i = 0; i < (o.bocas || 0); i++) { const u = (r() - .5) * 1.1, v = (r() - .5) * .9; boca(g, u * w / 2 * .8, y0 + h / 2 + v * h / 2 * .8, alt(u * .8, v * .8) + .02, (o.tamBoca || 1) * (.8 + r() * .5), !!o.abertas, r); }
      if (o.pulsa !== false) { const f = r() * 6; anim.push((dt, t) => { me.scale.z = 1 + Math.sin(t * 1.1 + f) * .1; }); }
      return g;
    };

    /* ---------- monte de carne no chão (dá para se esconder atrás) ---------- */
    P.a5_massa = o => {
      const g = G(), w = o.w || 1.4, d = o.d || 1, h = o.h || .9, r = rng(o.sem || 503), n = o.n ?? 4;
      const mat = o.tex === 'nenhuma' ? m(o.c || '#8a3a3c', { r: .7, lado: 2 }) : carne(o.c || '#8a3a3c', { rep: [2, 2], tex: o.tex });
      const geos = [bola(.5, 0, 0, 0, w, h * 2, d, 14)];
      for (let i = 0; i < n; i++) { const a = r() * 6.28, s = .35 + r() * .3; geos.push(bola(.5, Math.cos(a) * w * .38, 0, Math.sin(a) * d * .38, w * s, h * 2 * s * (.8 + r() * .5), d * s, 9)); }
      geos.forEach((gg, i) => amassar(gg, .1, r() * 9 + i));
      const corpo = addJ(g, geos, mat);
      if (o.pustulas !== 0) { const ps = []; for (let i = 0; i < (o.pustulas || 7); i++) { const a = r() * 6.28, e = .25 + r() * .55; ps.push(bola(.03 + r() * .04, Math.cos(a) * w / 2 * Math.cos(e) * .95, h * Math.sin(e) * .95, Math.sin(a) * d / 2 * Math.cos(e) * .95, 1, 1, 1, 5)); } addJ(g, ps, m('#d8c27a', { r: .15, e: '#3a2a00', ei: .3 })); }
      if (o.veias !== false) { const vs = []; for (let i = 0; i < 5; i++) { const a = r() * 6.28, pts = []; for (let k = 0; k <= 5; k++) { const e = k / 5 * 1.35, aa = a + Math.sin(k + i) * .25; pts.push([Math.cos(aa) * w / 2 * Math.cos(e) * 1.02, h * Math.sin(e) * 1.02, Math.sin(aa) * d / 2 * Math.cos(e) * 1.02]); } vs.push(tuboG(pts, .015 + r() * .015, 10, 4)); } addJ(g, vs, m('#3a0a16', { r: .35, e: '#1a0006', ei: .4 })); }
      const lista = []; for (let i = 0; i < (o.olhos || 0); i++) { const a = (o.olhoDir ?? Math.PI / 2) + (r() - .5) * 1.4, e = .2 + r() * .5; const px = Math.cos(a) * w / 2 * Math.cos(e), py = h * Math.sin(e), pz = Math.sin(a) * d / 2 * Math.cos(e), piv = G(); piv.position.set(px, py, pz); g.add(piv); piv.lookAt(px * 4, py * 1.5 + .3, pz * 4); olho(piv, 0, 0, 0, .45 + r() * .3, r, lista); }
      animOlhos(lista);
      if (o.pulsa !== false) { const f = r() * 6, amp = o.pulsa > 0 && o.pulsa !== true ? o.pulsa : .035; anim.push((dt, t) => { const k = 1 + Math.max(0, Math.sin(t * 1.3 + f)) ** 3 * amp; corpo.scale.set(1 + (k - 1) * .5, k, 1 + (k - 1) * .5); }); }
      return g;
    };

    /* ---------- veias numa superfície (parede, chão ou teto) ---------- */
    P.a5_veias = o => {
      const g = G(), w = o.w || 3, h = o.h || 2, r = rng(o.sem || 505), pl0 = o.plano || 'parede', y0 = o.y ?? 0, geos = [];
      const pt = (u, v, e) => pl0 === 'parede' ? [u, y0 + v, .015 + e] : pl0 === 'teto' ? [u, ALT - .015 - e, v] : [u, .012 + e, v];
      const vmin = pl0 === 'parede' ? 0 : -h / 2, vmax = pl0 === 'parede' ? h : h / 2;
      for (let k = 0; k < (o.n || 7); k++) {
        let u = (r() - .5) * w, v = vmin + r() * (vmax - vmin), ang = r() * 6.28; const rad = (o.r || .03) * (.6 + r() * .7), pts = [];
        for (let s = 0; s < 8; s++) { pts.push(pt(u, v, rad)); ang += (r() - .5) * .9; u += Math.cos(ang) * .35; v += Math.sin(ang) * .35; if (u < -w / 2 || u > w / 2 || v < vmin || v > vmax) break; }
        if (pts.length > 2) geos.push(tuboG(pts, rad, 12, 4));
        for (let b = 1; b < pts.length - 1 && b < 4; b += 2) { const [a1, a2, a3] = pts[b]; const pts2 = [pts[b]]; let uu = pl0 === 'parede' ? a1 : a1, vv = pl0 === 'parede' ? a2 - y0 : a3, an = ang + (r() < .5 ? 1.2 : -1.2); for (let s = 0; s < 3; s++) { uu += Math.cos(an) * .22; vv += Math.sin(an) * .22; pts2.push(pt(uu, vv, rad * .5)); } geos.push(tuboG(pts2, rad * .5, 6, 3)); }
      }
      const mat = m(o.c || '#2a0610', { unico: true, r: .45, e: o.e || '#1a0006', ei: .3 });
      addJ(g, geos, mat);
      if (o.pulsa !== false) { const f = r() * 6; anim.push((dt, t) => { mat.emissiveIntensity = .2 + Math.max(0, Math.sin(t * 2.4 + f)) ** 6 * .4; }); }
      return g;
    };

    /* ---------- cordões e tentáculos pendurados no teto ---------- */
    P.a5_cordas_teto = o => {
      const g = G(), r = rng(o.sem || 507), n = o.n || 5, w = o.w || 2, d = o.d || 1.2, comp = o.comp || 1.0;
      const mc = carne(o.c || '#8a3a40', { rep: [1, 3] }), mk = m('#141414', { r: .6 }), mg = m('#7a0c10', { r: .15, e: '#3a0000', ei: .5 });
      const bal = G(); bal.position.y = ALT + .02; g.add(bal);
      const gc = [], gk = [], gotas = [];
      for (let i = 0; i < n; i++) {
        const x = (r() - .5) * w, z = (r() - .5) * d, L = comp * (.6 + r() * .4), cabo = r() < (o.cabos || 0), rad = cabo ? .025 + r() * .02 : .04 + r() * .05;
        const pts = []; for (let k = 0; k <= 4; k++) pts.push([x + Math.sin(k * 1.3 + i) * .12 * k / 4, -L * k / 4, z + Math.cos(k * 1.1 + i) * .1 * k / 4]);
        const pt = pts[4]; (cabo ? gk : gc).push(tuboG(pts, rad, 10, 5)); (cabo ? gk : gc).push(bola(rad * (cabo ? 1.4 : 1.7), pt[0], pt[1], pt[2], 1, 1, 1, 6));
        if (!cabo && gotas.length < 3 && r() < .6) { const y1 = pt[1] - rad * 1.6, gota = sf(bal, .018, mg, pt[0], y1, pt[2], 5); gota.scale.y = 1.6; gotas.push([gota, y1, r() * 5, ALT - L]); }
      }
      addJ(bal, gc, mc); addJ(bal, gk, mk);
      const f0 = r() * 6;
      anim.push((dt, t) => { bal.rotation.x = Math.sin(t * .5 + f0) * .012; bal.rotation.z = Math.sin(t * .4 + f0 * 2) * .012; gotas.forEach(([gt, y1, ff, qd]) => { const k = (t * .35 + ff) % 1; gt.position.y = y1 - (k < .7 ? 0 : (k - .7) / .3 * qd); gt.visible = k < .97; }); });
      return g;
    };

    /* ---------- bolsas/casulos pequenos grudados na parede ---------- */
    P.a5_sacos = o => {
      const g = G(), r = rng(o.sem || 509), n = o.n || 3, w = o.w || 1.6, y = o.y ?? .5, s0 = o.tam || .35;
      const pele = m(o.c || '#d8a090', { unico: true, op: .58, r: .25, e: '#4a0a08', ei: .5, lado: 2 }), mc = carne(o.cb || '#7a2a2e', { rep: [1, 1] }), msil = m('#1a0606', { r: .9 });
      const base = [], sil = [], sacos = [];
      for (let i = 0; i < n; i++) {
        const x = n > 1 ? -w / 2 + s0 + (w - 2 * s0) * i / (n - 1) : 0, yy = y + s0 * 1.3 + (r() - .5) * .3, s = s0 * (.75 + r() * .4);
        const sc = sf(g, s, pele, x, yy, s * .45, 14); sc.scale.set(1, 1.3, .85); sacos.push([sc, r() * 6]);
        const anel = new T.TorusGeometry(s * 1.02, s * .28, 6, 16); anel.scale(1, 1.3, .6); anel.translate(x, yy, s * .12); base.push(anel);
        base.push(bola(s * 1.25, x, yy, 0, 1.1, 1.4, .25, 10));
        sil.push(bola(s * .38, x, yy - s * .2, s * .45, 1, .8, .9, 8)); sil.push(bola(s * .25, x + s * .22, yy + s * .25, s * .45, 1, 1, 1, 8));
      }
      addJ(g, base, mc); const ms = addJ(g, sil, msil);
      anim.push((dt, t) => { sacos.forEach(([sc, f]) => { const k = 1 + Math.sin(t * 1.3 + f) * .05; sc.scale.set(k, 1.3 * k, .85 * k); }); pele.emissiveIntensity = .4 + Math.max(0, Math.sin(t * 1.3)) * .25; if (ms) ms.position.x = Math.sin(t * 7) * (Math.sin(t * .3) > .9 ? .015 : 0); });
      return g;
    };

    /* ---------- válvula de carne em volta do vão de uma porta ---------- */
    P.a5_valvula = o => {
      const g = G(), w = o.w || 2.4, hv = o.h || 2.2, r = rng(o.sem || 511), xl = w / 2 + .05, rad = o.raio || .085;
      const mc = carne(o.c || '#8a3236', { rep: [1, 4] }), geos = [];
      // lábios dos dois lados e o arco de cima
      [-1, 1].forEach(s => geos.push(tuboG([[s * xl, -.05, .06], [s * (xl + .03), hv * .35, .09], [s * (xl - .02), hv * .7, .08], [s * xl, hv + .02, .07]], rad, 10, 5)));
      geos.push(tuboG([[-xl, hv + .02, .07], [-xl * .5, hv + .12, .09], [0, hv + .07, .1], [xl * .5, hv + .13, .09], [xl, hv + .02, .07]], rad * 1.1, 12, 5));
      // dobras (rugas) saindo para a parede
      for (let i = 0; i < 9; i++) { const lado = i % 3 === 2 ? 0 : (i % 2 ? 1 : -1); let a, b; if (lado) { const yy = .2 + r() * (hv - .3); a = [lado * xl, yy, .05]; b = [lado * (xl + .25 + r() * .35), yy + (r() - .5) * .3, .02]; } else { const xx = (r() - .5) * w; a = [xx, hv + .1, .05]; b = [xx + (r() - .5) * .3, hv + .3 + r() * .5, .02]; } geos.push(tuboG([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + .03, .05], b], rad * .35, 4, 3)); }
      // carne por cima da placa da sala (cantos)
      if (o.placa) [-1, 1].forEach(s => { geos.push(bola(s < 0 ? .27 : .2, s < 0 ? -1.45 : 1.55, s < 0 ? 2.78 : 2.52, .07, 1, 1.25, .3, 9)); geos.push(bola(.16, s * 1.05, 2.3, .06, 1.3, .6, .3, 7)); });
      geos.forEach((gg, i) => { if (gg.type === 'SphereGeometry') amassar(gg, .12, i); });
      addJ(g, geos, mc);
      // baba pendurada no arco
      const bb = []; for (let i = 0; i < 5; i++) { const x = (r() - .5) * w * .9, L = .12 + r() * .3; bb.push(caixa(.012, L, .012, x, hv + .02 - L, .1)); bb.push(bola(.018, x, hv + .02 - L, .1, 1, 1.5, 1, 4)); }
      addJ(g, bb, m('#b88a8a', { r: .1, me: .2, e: '#2a0808', ei: .3 }));
      return g;
    };

    /* ---------- costelas gigantes saindo da parede ---------- */
    P.a5_costelas = o => {
      const g = G(), n = o.n || 4, w = o.w || 3, r = rng(o.sem || 513), sai = o.sai ?? .45;
      const mo = m(o.c || '#d8ccb0', { r: .6, tex: 'osso', rep: [1, 2] }), geos = [], xs = [];
      for (let i = 0; i < n; i++) {
        const x = n > 1 ? -w / 2 + w * i / (n - 1) : 0, rad = .06 + r() * .03; xs.push(x);
        geos.push(tuboG([[x, -.05, .1], [x + .05, .7, sai * .8], [x, 1.6, sai], [x - .05, 2.5, sai * .75], [x, ALT - .1, sai * 1.1], [x + .03, ALT - .02, sai * 1.3]], rad, 24, 7));
        geos.push(bola(rad * 1.6, x, .02, .1, 1, .8, 1, 8));
      }
      addJ(g, geos, mo);
      if (o.carne !== false && n > 1) {
        const mc = carne(o.cc || '#6a2428', { rep: [2, 2] }), ws = [];
        for (let i = 0; i < n - 1; i++) { const a = xs[i], b = xs[i + 1], pg = new T.PlaneGeometry(b - a, ALT - .3, 6, 8), p = pg.attributes.position; for (let k = 0; k < p.count; k++) { const u = (p.getX(k) + (b - a) / 2) / (b - a), yy = p.getY(k) + (ALT - .3) / 2; p.setZ(k, Math.sin(u * Math.PI) * (.08 + .06 * Math.sin(yy * 3 + i)) + sai * .35 * (yy < 2.6 ? Math.sin(yy / 2.6 * Math.PI / 2) : 1) * (1 - Math.sin(u * Math.PI) * .6)); } pg.computeVertexNormals(); pg.translate((a + b) / 2, (ALT - .3) / 2 + .1, 0); ws.push(pg); }
        const web = addJ(g, ws, mc); const f = r() * 6; if (web) anim.push((dt, t) => { web.scale.z = 1 + Math.sin(t * .9 + f) * .12; });
      }
      return g;
    };

    /* ---------- espelho que mostra a sala com atraso ---------- */
    P.a5_espelho_atraso = o => {
      const g = G(), w = o.w || 4, h = o.h || 2.8, y = o.y ?? .1, modo = o.modo || 'neutro', r = rng(o.sem || 515);
      bx(g, w + .16, h + .16, .08, metal('#2a2a2c'), 0, y - .08, -.02);
      const tinta = modo === 'futuro' ? [70, 58, 18] : modo === 'mole' ? [80, 22, 22] : [26, 32, 38];
      const fundo = canvasMat(512, Math.round(512 * Math.min(1, h / w * 1.4)), (x, W, H) => {
        const vx = W / 2, vy = H * .48, bw = W * .34, bh = H * .42;
        const cor = (k, a = 1) => `rgba(${tinta[0] * k | 0},${tinta[1] * k | 0},${tinta[2] * k | 0},${a})`;
        x.fillStyle = cor(1.2); x.fillRect(0, 0, W, H);
        x.fillStyle = cor(.9); x.beginPath(); x.moveTo(0, H); x.lineTo(vx - bw / 2, vy + bh / 2); x.lineTo(vx + bw / 2, vy + bh / 2); x.lineTo(W, H); x.fill();           // chão
        x.fillStyle = cor(1.6); x.beginPath(); x.moveTo(0, 0); x.lineTo(vx - bw / 2, vy - bh / 2); x.lineTo(vx + bw / 2, vy - bh / 2); x.lineTo(W, 0); x.fill();          // teto
        x.fillStyle = cor(1.3); x.fillRect(vx - bw / 2, vy - bh / 2, bw, bh);                                                                                          // parede do fundo
        x.fillStyle = cor(.35); x.fillRect(vx - bw * .12, vy - bh * .02, bw * .24, bh * .52);                                                                           // vão ao fundo
        [[0, .25], [W, .25]].forEach(([ex]) => { const s = ex ? -1 : 1; x.beginPath(); x.moveTo(ex + s * W * .08, H * .82); x.lineTo(ex + s * W * .22, H * .7); x.lineTo(ex + s * W * .22, H * .4); x.lineTo(ex + s * W * .08, H * .32); x.closePath(); x.fillStyle = cor(.3); x.fill(); });
        x.strokeStyle = cor(.5, .6); x.lineWidth = 1; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(vx - bw / 2 + bw * i / 8, vy + bh / 2); x.lineTo(W * i / 8, H); x.stroke(); }
        const gl = x.createRadialGradient(vx, H * .1, 4, vx, H * .1, W * .4); gl.addColorStop(0, 'rgba(255,240,210,.35)'); gl.addColorStop(1, 'rgba(255,240,210,0)'); x.fillStyle = gl; x.fillRect(0, 0, W, H);
        for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${r() * .06})`; x.fillRect(r() * W, r() * H, 2, 2); }
        const vg = x.createRadialGradient(vx, vy, H * .2, vx, vy, W * .62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.65)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
      }, { r: .15, brilho: .45 });
      const sx = modo === 'mole' ? 30 : 1, sy = modo === 'mole' ? 16 : 1;
      const vidro = new T.Mesh(guardar(new T.PlaneGeometry(w, h, sx, sy)), fundo); vidro.position.set(0, y + h / 2, .025); g.add(vidro);
      // silhuetas (a sala trinta segundos antes)
      const silTex = (() => { const [c, x] = tela(128, 256); x.clearRect(0, 0, 128, 256); x.fillStyle = 'rgba(6,6,8,.92)'; x.beginPath(); x.ellipse(64, 34, 20, 24, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(30, 66); x.quadraticCurveTo(64, 52, 98, 66); x.lineTo(104, 160); x.lineTo(90, 162); x.lineTo(86, 250); x.lineTo(68, 250); x.lineTo(64, 170); x.lineTo(60, 250); x.lineTo(42, 250); x.lineTo(38, 162); x.lineTo(24, 160); x.closePath(); x.fill(); return texCanvas(c); })();
      const silMat = m('#ffffff', { unico: true, mapa: silTex, r: 1 }); silMat.transparent = true; silMat.depthWrite = false;
      const figs = [];
      const fig = (px, alt, f, anda) => { const p = pl(g, alt * .45, alt, silMat, px, y + h * .2 + alt / 2, .03); figs.push([p, px, f, anda]); return p; };
      if (modo === 'futuro') { fig(-w * .2, h * .38, 0, 0); fig(w * .08, h * .3, 1, 0); fig(w * .3, h * .45, 2, 0); const caido = pl(g, h * .4, h * .12, silMat, -w * .02, y + h * .16, .031); caido.rotation.z = Math.PI / 2 - .1; }
      else if (modo === 'mole') { fig(-w * .06, h * .8, 0, 0); }
      else { fig(w * .25, h * .42, 0, 1); fig(-w * .3, h * .36, 2, 0); }
      // brilho do vidro e marcas de mão
      const brilho = canvasMat(256, 256, (x, W, H) => { x.clearRect(0, 0, W, H); for (let i = 0; i < 3; i++) { const gg = x.createLinearGradient(0, 0, W, H); const p0 = .2 + i * .25; gg.addColorStop(Math.max(0, p0 - .05), 'rgba(255,255,255,0)'); gg.addColorStop(p0, 'rgba(255,255,255,.18)'); gg.addColorStop(Math.min(1, p0 + .05), 'rgba(255,255,255,0)'); x.fillStyle = gg; x.fillRect(0, 0, W, H); } }, { transp: true, r: .05 });
      const zv = modo === 'mole' ? .3 : .04; pl(g, w, h, brilho, 0, y + h / 2, zv);
      if (modo === 'mole') { for (let i = 0; i < 4; i++) { const s = P.sangue({ estilo: 'mao', w: .7, h: .7, y: y + h * .3 + r() * h * .3, sem: 30 + i }); s.position.set((r() - .5) * w * .5, 0, zv - .01); g.add(s); } }
      const pos = vidro.geometry.attributes.position, base = pos.array.slice();
      anim.push((dt, t) => {
        figs.forEach(([p, px, f, anda]) => { if (anda) { const k = (t / 30 + f) % 1; p.position.x = px - k * w * .45; p.scale.setScalar(.85 + k * .4); } else if (modo !== 'futuro') p.position.x = px + Math.sin(t * .2 + f) * .05; });
        if (modo === 'mole') { const hx = Math.sin(t * .3) * w * .12, hy = h * .1, k = Math.max(0, Math.sin(t * .45)) ** 2 * .22; for (let i = 0; i < pos.count; i++) { const dx = base[i * 3] - hx, dy = base[i * 3 + 1] - hy, d2 = dx * dx + dy * dy; pos.setZ(i, k * Math.exp(-d2 * 6) + .03 * Math.sin(base[i * 3] * 2 + t) * Math.sin(base[i * 3 + 1] * 3 + t * .7)); } pos.needsUpdate = true; figs[0][0].position.z = .03 + k * .3; figs[0][0].scale.setScalar(1 + k * .5); }
      });
      return g;
    };

    /* ---------- membrana de pele esticada, com mão do outro lado e sombras passando ---------- */
    P.a5_membrana_viva = o => {
      const g = G(), w = o.w || 8, h = o.h || ALT - .05, r = rng(o.sem || 517), fundo = o.fundo || 'escuro';
      // o que fica atrás (plano de fundo, a uns 45 cm)
      if (fundo === 'amarelo') { const ma = canvasMat(512, 192, (x, W, H) => { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6a5a20'); gr.addColorStop(.45, '#c8a830'); gr.addColorStop(1, '#8a6a10'); x.fillStyle = gr; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(255,230,120,.5)'; for (let i = 0; i < 900; i++) { const px = r() * W, py = H * .5 + r() * H * .5; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - .5) * 4, py - 4 - r() * 10); x.stroke(); } }, { brilho: .9 }); pl(g, w, h, ma, 0, h / 2, -.44); }
      else if (fundo === 'carne') { const pg = new T.PlaneGeometry(w, h, 24, 10), p = pg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, .12 * Math.sin(p.getX(i) * 2.1) * Math.sin(p.getY(i) * 2.7)); pg.computeVertexNormals(); const mc = carne('#a03a3c', { rep: [6, 2], ei: .6, unico: true }); const me = new T.Mesh(guardar(pg), mc); me.position.set(0, h / 2, -.42); g.add(me); anim.push((dt, t) => { me.position.x = Math.sin(t * .15) * .4; me.scale.z = 1 + Math.sin(t * .8) * .5; }); }
      else pl(g, w, h, m('#050203', { r: 1 }), 0, h / 2, -.45);
      // sombras grandes passando devagar
      const somb = canvasMat(128, 256, (x, W, H) => { x.clearRect(0, 0, W, H); const gr = x.createRadialGradient(W / 2, H * .45, 4, W / 2, H * .5, W * .55); gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.beginPath(); x.ellipse(W / 2, H * .5, W * .5, H * .5, 0, 0, 7); x.fill(); }, { transp: true });
      const sombras = [0, 1].map(i => { const s = pl(g, 1.6 + i * .8, h * (.8 + i * .15), somb, 0, h * .45, -.3 + i * .05); return [s, r() * 6, .05 + i * .03]; });
      // a pele: veias, manchas, translúcida e iluminada por trás
      const pele = canvasMat(512, 256, (x, W, H) => { x.fillStyle = o.cor || '#e0a090'; x.fillRect(0, 0, W, H); for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(${150 + r() * 80},${40 + r() * 40},${40 + r() * 30},${.08 + r() * .12})`; x.beginPath(); x.ellipse(r() * W, r() * H, 6 + r() * 40, 4 + r() * 24, r() * 3, 0, 7); x.fill(); } x.strokeStyle = 'rgba(90,10,30,.55)'; for (let i = 0; i < 26; i++) { x.lineWidth = .8 + r() * 2.4; let px = r() * W, py = r() * H; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (r() - .5) * 60; py += (r() - .5) * 40; x.lineTo(px, py); } x.stroke(); } }, { r: .35, brilho: .4, lado: true });
      pele.transparent = true; pele.opacity = o.op ?? .72; pele.depthWrite = false;
      const sx = 36, sy = 14, geo = guardar(new T.PlaneGeometry(w, h, sx, sy)), pos = geo.attributes.position, base = pos.array.slice();
      const me = new T.Mesh(geo, pele); me.position.y = h / 2; g.add(me);
      // bordas presas na parede, chão e teto
      const bord = [tuboG([[-w / 2, .02, 0], [0, .05, .02], [w / 2, .02, 0]], .07, 24, 6), tuboG([[-w / 2, h - .02, 0], [0, h - .06, .02], [w / 2, h - .02, 0]], .07, 24, 6), tuboG([[-w / 2, 0, 0], [-w / 2 - .02, h / 2, .03], [-w / 2, h, 0]], .09, 12, 6), tuboG([[w / 2, 0, 0], [w / 2 + .02, h / 2, .03], [w / 2, h, 0]], .09, 12, 6)];
      addJ(g, bord, carne('#8a3236', { rep: [4, 1] }));
      const hx = (o.mao ?? .15) * w / 2, hy = 1.25 - h / 2;
      const dedos = [[-.09, .2], [-.03, .25], [.03, .26], [.09, .22], [.15, .05]];
      anim.push((dt, t) => {
        const ciclo = (t % 16) / 16, k = ciclo < .12 ? ciclo / .12 : ciclo < .7 ? 1 : ciclo < .8 ? 1 - (ciclo - .7) / .1 : 0, kk = o.mao === false ? 0 : k;
        for (let i = 0; i < pos.count; i++) {
          const x = base[i * 3], yy = base[i * 3 + 1]; let z = Math.sin(x * 1.3 + t * .8) * .035 + Math.sin(yy * 2 + t * .6) * .03;
          if (kk) { const dx = x - hx, dy = yy - hy; let e = Math.exp(-(dx * dx / .02 + dy * dy / .03)) * .14; dedos.forEach(([a, b]) => { const ex = x - hx - a, ey = yy - hy - b; e += Math.exp(-(ex * ex / .0015 + ey * ey / .012)) * .09; }); z += e * kk; }
          pos.setZ(i, z);
        }
        pos.needsUpdate = true;
        sombras.forEach(([s, f, v]) => { s.position.x = Math.sin(t * v + f) * w * .42; s.material.opacity = .7 + Math.sin(t * .3 + f) * .3; });
      });
      return g;
    };

    /* ---------- poço de ossos descendo para um calor escuro ---------- */
    P.a5_poco_ossos = o => {
      const g = G(), R = o.raio || 1.3, prof = o.prof || 7, aro = o.aro ?? .35, r = rng(o.sem || 519), mo = m(o.c || '#d8ccb0', { r: .7, tex: 'osso', rep: [1, 1] });
      // a boca do poço: o chão da sala é opaco, então a profundidade é pintada (anéis de osso sumindo num brilho vermelho)
      const boca = canvasMat(512, 512, (x, W) => {
        const c0 = W / 2; x.fillStyle = '#050202'; x.fillRect(0, 0, W, W);
        for (let k = 0; k < 16; k++) { const rr = c0 * .98 / (1 + k * .32), a = Math.max(0, .85 - k * .06); x.strokeStyle = `rgba(200,186,150,${a})`; x.lineWidth = Math.max(1.5, 26 / (1 + k * .5)); x.beginPath(); x.arc(c0, c0 + k * 1.5, rr, 0, 7); x.stroke();
          const nd = Math.max(6, 30 - k * 2); for (let i = 0; i < nd; i++) { const an = i / nd * 6.283 + k, px = c0 + Math.cos(an) * rr, py = c0 + k * 1.5 + Math.sin(an) * rr; x.fillStyle = `rgba(225,212,180,${a})`; x.beginPath(); x.arc(px, py, Math.max(1, 9 / (1 + k * .45)), 0, 7); x.fill(); x.fillStyle = `rgba(0,0,0,${a * .8})`; x.fillRect(px - 2, py - 1, 4 / (1 + k * .3), 2); } }
        for (let i = 0; i < 7; i++) { const an = r() * 6.283; x.strokeStyle = 'rgba(10,10,10,.85)'; x.lineWidth = 5; x.beginPath(); x.moveTo(c0 + Math.cos(an) * c0 * .97, c0 + Math.sin(an) * c0 * .97); x.quadraticCurveTo(c0 + Math.cos(an + .3) * c0 * .5, c0 + Math.sin(an + .3) * c0 * .5, c0 + Math.cos(an + .5) * c0 * .12, c0 + Math.sin(an + .5) * c0 * .12); x.stroke(); }
        const gl = x.createRadialGradient(c0, c0 + 20, 2, c0, c0 + 20, c0 * .45); gl.addColorStop(0, 'rgba(255,120,40,1)'); gl.addColorStop(.25, 'rgba(200,40,10,.85)'); gl.addColorStop(1, 'rgba(60,0,0,0)'); x.fillStyle = gl; x.fillRect(0, 0, W, W);
        const vg = x.createRadialGradient(c0, c0, c0 * .7, c0, c0, c0); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); x.fillStyle = vg; x.fillRect(0, 0, W, W);
      }, { brilho: 1.0, r: 1 });
      const fundo = new T.Mesh(guardar(new T.CircleGeometry(R, 40)), boca); fundo.rotation.x = -Math.PI / 2; fundo.position.y = .012; g.add(fundo);
      const borda = new T.Mesh(guardar(new T.CylinderGeometry(R, R, .3, 28, 1, true)), m(o.c || '#d8ccb0', { tex: 'osso', rep: [6, 1], r: .8, lado: 2 })); borda.position.y = -.14; g.add(borda);
      // a borda: ossos empilhados e crânios
      const os = [], cr = [], ol = [];
      for (let c = 0; c < 3; c++) for (let i = 0; i < 26; i++) { const a = (i + c * .5) / 26 * 6.283, a2 = a + .28, rr = R + .16 + (r() - .5) * .06, yy = .06 + c * (aro / 3); os.push(haste([Math.cos(a) * rr, yy, Math.sin(a) * rr], [Math.cos(a2) * rr, yy + (r() - .5) * .04, Math.sin(a2) * rr], .055, .045, 5)); }
      for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + r() * .2, rr = R + .17; cr.push(bola(.1, Math.cos(a) * rr, aro + .07, Math.sin(a) * rr, .9, 1, 1.1, 7)); const ox = Math.cos(a) * (rr - .085), oz = Math.sin(a) * (rr - .085); ol.push(bola(.025, ox + Math.sin(a) * .035, aro + .08, oz - Math.cos(a) * .035, 1, 1, 1, 5)); ol.push(bola(.025, ox - Math.sin(a) * .035, aro + .08, oz + Math.cos(a) * .035, 1, 1, 1, 5)); }
      addJ(g, os, mo); addJ(g, cr, m('#e0d4b8', { r: .6 })); addJ(g, ol, m('#0a0604', { r: 1 }));
      // cabos descendo pela parede do poço
      const cb = []; for (let i = 0; i < (o.cabos ?? 6); i++) { const a = r() * 6.283, rr = R - .08; cb.push(tuboG([[Math.cos(a) * (R + .35), .02, Math.sin(a) * (R + .35)], [Math.cos(a) * (R + .05), aro + .05, Math.sin(a) * (R + .05)], [Math.cos(a) * rr, .02, Math.sin(a) * rr], [Math.cos(a + .1) * rr * .7, .016, Math.sin(a + .1) * rr * .7]], .03 + r() * .02, 10, 4)); }
      addJ(g, cb, m('#151515', { r: .6 }));
      // calor e batida lenta vindos do fundo
      const L = luz(g, o.brasa || '#ff4a1a', o.i || 1.6, o.d || 7, 0, .5, 0);
      anim.push((dt, t) => { const ph = t % 2.6, k = Math.exp(-((ph - .2) ** 2) * 60) + .7 * Math.exp(-((ph - .55) ** 2) * 60); L.intensity = (o.i || 1.6) * (.55 + .6 * k); boca.emissiveIntensity = .8 + k * .7; });
      return g;
    };

    /* ---------- nicho de catacumba (crânios e ossos longos empilhados) ---------- */
    P.a5_nicho_ossos = o => {
      const g = G(), w = o.w || 2, h = o.h || 2.6, fil = o.filas || 5, d = .42, r = rng(o.sem || 521);
      const mo = m(o.c || '#d4c8a8', { r: .7 }), ml = m(o.c || '#c8bc98', { r: .75, tex: 'osso', rep: [Math.max(1, Math.round(w)), 2] });
      pl(g, w, h, ml, 0, h / 2, -d / 2 + .01);
      const ossos = [], cran = [], buracos = [], esp = h / fil;
      [-1, 1].forEach(s => ossos.push(caixa(.1, h, d, s * w / 2, 0, 0)));
      for (let f = 0; f < fil; f++) {
        const y0 = f * esp; for (let k = 0; k < 2; k++) ossos.push(haste([-w / 2, y0 + .04 + k * .07, d / 2 - .05 - k * .03], [w / 2, y0 + .04 + k * .07 + (r() - .5) * .02, d / 2 - .05 - k * .03], .04, .04, 5));
        if (esp > .3 && f % 2 === 0) { const nk = Math.floor((w - .1) / .23); for (let i = 0; i < nk; i++) { if (r() < .07) continue; const x = nk > 1 ? -w / 2 + .13 + i * (w - .26) / (nk - 1) : 0, yy = y0 + .2 + .12, z = d / 2 - .16; cran.push(bola(.1, x, yy, z, .9, 1, 1.05, 6)); cran.push(caixa(.11, .05, .08, x, yy - .14, z + .04)); [-1, 1].forEach(s => buracos.push(caixa(.04, .035, .02, x + s * .035, yy - .01, z + .085))); } }
        else if (esp > .3) ossos.push(caixa(w - .06, esp - .12, d - .08, 0, y0 + .1, .02));
      }
      addJ(g, ossos, m(o.c || '#c8bc98', { r: .8, tex: 'osso', rep: [Math.max(2, Math.round(w / .6)), .5] })); addJ(g, cran, mo); addJ(g, buracos, m('#080503', { r: 1 }));
      return g;
    };

    /* ---------- lustre de ossos com velas ---------- */
    P.a5_lustre_ossos = o => {
      const g = G(), R = o.raio || .8, y = o.y ?? ALT - .95, n = o.n || 8, r = rng(o.sem || 523), mo = m(o.c || '#d8ccb0', { r: .65 }), os = [], vel = [], fl = [];
      for (let k = 0; k < 6; k++) os.push(bola(.05, 0, ALT - .05 - k * (ALT - y) / 6, 0, 1.3, .7, 1.3, 7));
      os.push(haste([0, ALT, 0], [0, y, 0], .02, .02, 5));
      os.push(bola(.13, 0, y - .05, 0, .9, 1, 1.05, 10));
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.283, cx = Math.cos(a) * R, cz = Math.sin(a) * R;
        os.push(haste([Math.cos(a) * .12, y, Math.sin(a) * .12], [cx * .55, y + .1, cz * .55], .03, .025, 6)); os.push(haste([cx * .55, y + .1, cz * .55], [cx, y + .02, cz], .025, .03, 6));
        const hv = .14 + r() * .1; os.push(bola(.07, cx, y + .04, cz, 1.2, .5, 1.2, 8)); vel.push(caixa(.05, hv, .05, cx, y + .07, cz));
        fl.push(bola(.02, cx, y + .07 + hv + .04, cz, 1, 2, 1, 6));
        if (i % 2 === 0) os.push(bola(.075, cx * .5, y - .18, cz * .5, .9, 1, 1, 8));
      }
      addJ(g, os, mo); addJ(g, vel, m('#e8dcc0', { r: .6 })); const chama = addJ(g, fl, m('#ffffff', { unico: true, e: '#ffb347', ei: 2.6 }));
      const L = luz(g, o.cor || '#ffb860', o.i || 1.4, o.d || 7, 0, y - .1, 0, 'vela');
      if (chama) anim.push((dt, t) => { chama.scale.y = 1 + Math.sin(t * 13) * .05; });
      return g;
    };

    /* ---------- coro: fileiras de figuras de macacão (uma malha por fileira e material) ---------- */
    P.a5_coro = o => {
      const g = G(), fil = o.filas || 3, n = o.n || 8, esp = o.esp || .62, fesp = o.fesp || .9, r = rng(o.sem || 525);
      const mr = m(o.c || '#d9661f', { r: .85 }), mp = m(o.pele || '#b99a86', { r: .7 }), mcab = m('#2a1d14', { r: .9 }), mes = m('#242424', { r: .8 }), mf = carne('#7a1a1e', { ei: .5 }), mos = m('#d8ccb0', { r: .6 });
      for (let f = 0; f < fil; f++) {
        const R = [], Pp = [], C = [], E = [], A = [], O = [];
        for (let i = 0; i < n; i++) {
          const x = (i - (n - 1) / 2) * esp + (f % 2 ? esp / 2 : 0) + (r() - .5) * .06, z = (f - (fil - 1) / 2) * fesp + (r() - .5) * .08, k = .94 + r() * .12, ry = (r() - .5) * .2;
          const M = new T.Matrix4().compose(V(x, 0, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), V(k, k, k));
          const add = (arr, geo) => { geo.applyMatrix4(M); arr.push(geo); };
          [-1, 1].forEach(s => { add(R, caixa(.13, .86, .14, s * .1, .06, 0)); add(E, caixa(.11, .07, .25, s * .1, 0, .05)); add(R, caixa(.11, .6, .11, s * .25, .9, 0, 0, 0, s * .06)); add(Pp, bola(.05, s * .27, .86, .01, 1, 1, 1, 6)); });
          add(R, bola(.2, 0, 1.2, 0, 1, 1.55, .7, 10));
          add(Pp, caixa(.09, .12, .09, 0, 1.5, 0)); add(Pp, bola(.12, 0, 1.75, .01, .9, 1.1, 1, 10)); add(C, bola(.125, 0, 1.77, -.025, .95, .95, 1, 10));
          if (o.abertas) { add(A, bola(.16, 0, 1.22, -.12, .6, 1.5, .25, 8)); for (let k2 = 0; k2 < 4; k2++) add(O, caixa(.22, .025, .03, 0, 1.0 + k2 * .1, -.15)); }
        }
        addJ(g, R, mr); addJ(g, Pp, mp); addJ(g, C, mcab); addJ(g, E, mes); addJ(g, A, mf); addJ(g, O, mos);
      }
      return g;
    };

    /* ---------- molde em cera e carne num pedestal ---------- */
    P.a5_molde = o => {
      const g = G(), r = rng(o.sem || 527), cera = o.cera || '#d9c4a8', medo = o.modo === 'medo';
      const ped = [caixa(.66, .35, .66, 0, 0, 0)]; for (let i = 0; i < 7; i++) { const a = r() * 6.28; ped.push(caixa(.04, .05 + r() * .2, .02, Math.cos(a) * .33, .35 - .05 - r() * .2, Math.sin(a) * .33, 0, -a, 0)); }
      addJ(g, ped, m('#5a5248', { tex: 'concreto', r: .9 }));
      cy(g, .2, .22, .03, m(cera, { r: .35 }), (r() - .5) * .2, .35, (r() - .5) * .2, 12);
      const f = figura({ pose: 'em_pe', c: cera, pele: o.pele || '#e6d2b8', cab: 'cera', cabelo: false, h: o.alt || 1.72, bracos: medo ? 'frente' : (o.bracos || 'baixo'), sem: o.sem });
      f.position.y = .35; g.add(f);
      const k = (o.alt || 1.72) / 1.72;
      if (o.carne !== false) { const cs = []; for (let i = 0; i < 6; i++) { const a = r() * 6.28, yy = .35 + (.5 + r() * 1.15) * k, rr = (yy - .35 > 1.4 * k ? .1 : yy - .35 > .9 * k ? .17 : .09) * k; cs.push(bola(.07 + r() * .05, Math.cos(a) * rr * (i % 3 ? 1 : .6) + (i % 3 ? 0 : (i % 2 ? .1 : -.1)), yy, Math.sin(a) * rr * .8, 1, 1.3, .5, 6)); } addJ(g, cs, carne(o.cc || '#9a4a46', { rep: [1, 1] })); }
      if (medo) { const b = sf(g, .03, m('#140606', { r: 1 }), 0, .35 + 1.69 * k, .1 * k, 8); b.scale.set(1, 1.6, .5); }
      if (o.escorpiao && P.escorpiao) { const e = P.escorpiao({ s: 1.15, c: o.ce || '#6a4a24' }); e.position.set(0, .35 + 1.05 * k, -.32); e.rotation.y = Math.PI; g.add(e); const jj = P.a5_massa({ w: .55, d: .45, h: .35, n: 2, pustulas: 0, veias: false, pulsa: false, c: '#8a5a3a', sem: o.sem }); jj.position.set(0, .35 + 1.0 * k, -.2); g.add(jj); }
      return g;
    };

    /* ---------- costura grossa (pontos em X), com tira de carne opcional ---------- */
    P.a5_costura = o => {
      const g = G(), l = o.l || 1, y = o.y ?? 1, la = o.larg || .14, n = Math.max(2, Math.round(l / (o.passo || .1))), pts = [];
      const piv = G(); piv.position.y = y; piv.rotation.z = o.rz || 0; if (o.deitada) piv.rotation.x = -Math.PI / 2; g.add(piv);
      for (let i = 0; i < n; i++) { const x = -l / 2 + (i + .5) * l / n; [.7, -.7].forEach(a => pts.push(caixa(.012, la, .012, x, -la / 2, .03, 0, 0, a))); }
      pts.push(caixa(l, .01, .01, 0, -.005, .028));
      addJ(piv, pts, m(o.c || '#160808', { r: .7 }));
      if (o.ponte) { const tira = new T.Mesh(guardar(new T.BoxGeometry(l, la * .8, .05, 8, 2, 1)), carne('#9a4a48', { rep: [2, 1] })); piv.add(tira); }
      return g;
    };

    /* ---------- maca de necrotério com corpo coberto e etiqueta no dedo ---------- */
    P.a5_maca_corpo = o => {
      const g = G(), r = rng(o.sem || 529), aco = metal('#a8acb0'), L = 2, hm = .82;
      const est = [caixa(L, .05, .72, 0, hm - .05, 0)]; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => est.push(caixa(.04, hm - .1, .04, a * .92, .1, b * .32))); est.push(caixa(L - .1, .03, .03, 0, .25, .32)); est.push(caixa(L - .1, .03, .03, 0, .25, -.32));
      addJ(g, est, aco); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => sf(g, .05, m('#111'), a * .92, .05, b * .32, 8));
      // o lençol com o corpo embaixo
      const lenc = o.manchas ? canvasMat(256, 128, (x, W, H) => { x.fillStyle = o.lencol || '#d8d4cc'; x.fillRect(0, 0, W, H); for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(${100 + r() * 40},10,10,${.25 + r() * .4})`; x.beginPath(); x.ellipse(r() * W, H * (.35 + r() * .3), 6 + r() * 20, 4 + r() * 12, r() * 3, 0, 7); x.fill(); } for (let i = 0; i < 1200; i++) { x.fillStyle = `rgba(60,50,40,${r() * .08})`; x.fillRect(r() * W, r() * H, 2, 2); } }, { r: .9, lado: true }) : m(o.lencol || '#d8d4cc', { r: .9, lado: 2 });
      const pg = new T.PlaneGeometry(L - .1, 1.0, 26, 10), p = pg.attributes.position;
      const perfil = (x, z) => { const G2 = (cx, cz, sx, sz, a) => a * Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2)); return G2(-.78, 0, .13, .12, .2) + G2(-.35, 0, .3, .2, .22) + G2(.05, 0, .2, .17, .17) + G2(.4, -.09, .32, .07, .12) + G2(.4, .09, .32, .07, .12) + G2(.8, -.08, .05, .05, .16) + G2(.8, .08, .05, .05, .16); };
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = -p.getY(i), az = Math.abs(z); let yy = perfil(x, z) + .02; if (az > .34) yy -= (az - .34) * 1.6; p.setXYZ(i, x, yy, z); }
      pg.computeVertexNormals(); const lm = new T.Mesh(guardar(pg), lenc); lm.position.y = hm; g.add(lm);
      if (o.pes !== false) { const pe = [], mpe = m(o.pele || '#b8a89a', { r: .6 }); [-1, 1].forEach(s => { pe.push(bola(.05, .95, hm + .06, s * .08, 1.8, .8, 1, 8)); pe.push(bola(.04, 1.02, hm + .12, s * .08, .8, 1.6, 1, 8)); }); addJ(g, pe, mpe);
        if (o.txt) { const et = canvasMat(128, 176, (x, W, H) => { x.fillStyle = '#e8dcb0'; x.fillRect(0, 0, W, H); x.fillStyle = '#8a7a50'; x.beginPath(); x.arc(W / 2, 16, 7, 0, 7); x.fill(); x.fillStyle = '#1a1612'; x.font = 'bold 26px Courier New, monospace'; x.textAlign = 'center'; x.fillText(String(o.txt).slice(0, 9), W / 2, 76); x.font = '15px Courier New, monospace'; x.fillText(o.sub || '', W / 2, 112); x.strokeStyle = 'rgba(30,20,10,.5)'; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(14, 130 + i * 14); x.lineTo(W - 14, 130 + i * 14); x.stroke(); } }, { r: .9, lado: true });
          const piv = G(); piv.position.set(1.06, hm + .14, .08); g.add(piv); bx(piv, .004, .1, .004, m('#d8d0b0'), 0, -.1, 0); const e = pl(piv, .09, .124, et, 0, -.16, 0); e.rotation.y = Math.PI / 2; const f = r() * 6; anim.push((dt, t) => { piv.rotation.x = Math.sin(t * .8 + f) * .08; }); }
      }
      return g;
    };

    /* ---------- parede de gavetas frias de necrotério ---------- */
    P.a5_gavetas = o => {
      const g = G(), cols = o.cols || 4, fil = o.filas || 3, cw = .68, ch = .62, w = cols * cw + .12, h = fil * ch + .24, d = .7, ab = o.aberta ?? -1, r = rng(o.sem || 531);
      bx(g, w, h, d, m('#6a6e72', { tex: 'metal_sujo', r: .5, me: .5 }), 0, 0, 0);
      const frente = canvasMat(512, Math.round(512 * h / w), (x, W, H) => {
        x.fillStyle = '#9aa0a4'; x.fillRect(0, 0, W, H); const sx = W / w, sy = H / h;
        for (let c = 0; c < cols; c++) for (let f = 0; f < fil; f++) {
          const px = (.06 + c * cw + .03) * sx, py = (.12 + f * ch + .03) * sy, pw = (cw - .06) * sx, ph = (ch - .06) * sy, idx = f * cols + c;
          const gr = x.createLinearGradient(px, 0, px + pw, 0); gr.addColorStop(0, '#b8bcc0'); gr.addColorStop(.5, '#d0d4d6'); gr.addColorStop(1, '#a8acb0'); x.fillStyle = idx === ab ? '#050505' : gr; x.fillRect(px, py, pw, ph);
          x.strokeStyle = '#4a4e52'; x.lineWidth = 3; x.strokeRect(px, py, pw, ph);
          if (idx !== ab) { x.fillStyle = '#f2ecd8'; x.fillRect(px + pw * .3, py + ph * .14, pw * .4, ph * .16); x.fillStyle = '#1a1a1a'; x.font = `bold ${Math.round(ph * .1)}px Courier New, monospace`; x.textAlign = 'center'; x.fillText((o.txts && o.txts[idx]) || String(idx + 1).padStart(2, '0'), px + pw / 2, py + ph * .27); for (let k = 0; k < 6; k++) { x.fillStyle = `rgba(90,60,30,${r() * .3})`; x.fillRect(px + r() * pw, py + r() * ph * .4, 3, ph * (.2 + r() * .6)); } }
        }
        for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(40,30,20,${r() * .12})`; x.fillRect(r() * W, r() * H, 2, 2); }
      }, { r: .45, me: .3 });
      pl(g, w, h, frente, 0, h / 2, d / 2 + .005);
      const pux = []; for (let c = 0; c < cols; c++) for (let f = 0; f < fil; f++) { if (f * cols + c === ab) continue; pux.push(caixa(.3, .03, .04, -w / 2 + .06 + c * cw + cw / 2, (fil - 1 - f) * ch + .12 + ch * .35, d / 2 + .02)); }
      addJ(g, pux, metal('#c8ccd0'));
      if (ab >= 0) { const c = ab % cols, f = Math.floor(ab / cols), x = -w / 2 + .06 + c * cw + cw / 2, y = (fil - 1 - f) * ch + .12 + .04; const bandeja = [caixa(cw - .1, .03, 1.0, x, y, d / 2 + .45), caixa(cw - .1, .12, .03, x, y, d / 2 + .95)]; addJ(g, bandeja, metal('#b0b4b8')); const corpo = bola(.5, x, y + .05, d / 2 + .45, (cw - .16), .3, 1.85, 12); amassar(corpo, .06, 3); addJ(g, [corpo], m(o.lencol || '#d0ccc4', { r: .9 })); }
      return g;
    };

    /* ---------- brinquedos espalhados no chão ---------- */
    P.a5_brinquedos = o => {
      const g = G(), r = rng(o.sem || 533), w = o.w || 2, d = o.d || 1.5, n = o.n || 8, cores = ['#c0392b', '#2e86de', '#f1c40f', '#27ae60', '#e67e22', '#8e44ad'];
      for (let i = 0; i < n; i++) {
        const x = (r() - .5) * w, z = (r() - .5) * d, tipo = i % 5, it = G(); it.position.set(x, 0, z); it.rotation.y = r() * 6.28; g.add(it);
        if (tipo === 0) { const c = m(cores[i % 6], { r: .7 }); for (let k = 0; k < 3; k++) bx(it, .08, .08, .08, c, (r() - .5) * .25, k === 2 && r() < .5 ? .08 : 0, (r() - .5) * .25).rotation.y = r(); }
        else if (tipo === 1) sf(it, .1, m(cores[(i + 2) % 6], { r: .4 }), 0, .1, 0, 12);
        else if (tipo === 2) { const u = m(o.urso || '#8a5a32', { r: 1 }); sf(it, .12, u, 0, .12, 0, 10).scale.set(1, 1.1, .85); sf(it, .09, u, 0, .3, .01, 10); [-1, 1].forEach(s => { sf(it, .035, u, s * .07, .38, 0, 6); sf(it, .045, u, s * .12, .14, .06, 6); sf(it, .05, u, s * .07, .03, .1, 6); sf(it, .013, m('#111'), s * .03, .32, .085, 5); }); if (r() < .5) it.rotation.z = 1.3; }
        else if (tipo === 3) { const c = m(cores[(i + 4) % 6], { r: .5 }); bx(it, .3, .1, .12, c, 0, .04, 0); bx(it, .1, .1, .12, c, -.1, .14, 0); [-1, 1].forEach(s => [-1, 1].forEach(q => { const rd = cy(it, .035, .035, .02, m('#222'), s * .1, .04, q * .07, 8); rd.rotation.x = Math.PI / 2; rd.position.y = .04; })); }
        else { const vest = m(cores[(i + 1) % 6], { r: .9 }); cy(it, .02, .09, .2, vest, 0, 0, 0, 8); sf(it, .065, m('#e8d8c8', { r: .5 }), 0, .26, 0, 10); [-1, 1].forEach(s => sf(it, .012, m('#111'), s * .022, .27, .058, 5)); it.rotation.z = r() < .6 ? 1.5 : 0; it.position.y = it.rotation.z ? .07 : 0; }
      }
      return g;
    };

    /* ---------- projeção de abajur na parede (estrelas girando ou uma cena que se repete) ---------- */
    P.a5_projecao = o => {
      const g = G(), w = o.w || 3, h = o.h || 1.8, y = o.y ?? .8, modo = o.modo || 'estrelas', r = rng(o.sem || 535);
      const [c, x] = tela(512, Math.round(512 * h / w)), t = texCanvas(c), W = c.width, H = c.height;
      const mat = m('#ffffff', { unico: true, mapa: t, r: 1 }); mat.transparent = true; mat.depthWrite = false; mat.blending = T.AdditiveBlending; mat.emissive = new T.Color('#ffffff'); mat.emissiveMap = t; mat.emissiveIntensity = .6;
      const p = pl(g, w, h, mat, 0, y + h / 2, .02);
      const estrelas = Array.from({ length: 40 }, () => [r() * W * 2, r() * H, 3 + r() * 6]);
      const pinta = tt => {
        x.clearRect(0, 0, W, H); const cor = o.c || '255,214,140';
        if (modo === 'estrelas') { const off = (tt * 18) % (W * 2); estrelas.forEach(([sx, sy, s]) => { let px = (sx + off) % (W * 2) - W * .5; if (px < -10 || px > W + 10) return; const a = .25 + .2 * Math.sin(tt + sx); x.fillStyle = `rgba(${cor},${a})`; x.beginPath(); for (let k = 0; k < 10; k++) { const an = k / 10 * 6.283, rr = k % 2 ? s * .4 : s; x.lineTo(px + Math.cos(an) * rr, sy + Math.sin(an) * rr); } x.fill(); }); }
        else {
          const k = (tt % 10) / 10, gr = x.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * .55); gr.addColorStop(0, `rgba(${cor},.35)`); gr.addColorStop(1, `rgba(${cor},0)`); x.fillStyle = gr; x.fillRect(0, 0, W, H);
          x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(W * .08, H * .62, W * .38, H * .1); x.fillRect(W * .08, H * .5, W * .05, H * .22);                                       // cama
          const ab = Math.min(1, k * 3); x.fillRect(W * .72, H * .18, W * .12 * ab, H * .62);                                                                            // porta abrindo
          const px = W * (.78 - Math.max(0, k - .3) * .7), alt = H * (.55 + Math.max(0, k - .3) * .25); x.beginPath(); x.ellipse(px, H * .82 - alt, alt * .09, alt * .11, 0, 0, 7); x.fill(); x.fillRect(px - alt * .1, H * .82 - alt * .9, alt * .2, alt * .9);   // figura se aproximando
          if (k > .92) { x.fillStyle = `rgba(${cor},${(k - .92) * 8})`; x.fillRect(0, 0, W, H); }
        }
        t.needsUpdate = true;
      };
      let ult = -1; pinta(0); anim.push((dt, tt) => { if (tt - ult < .08) return; ult = tt; pinta(tt); });
      return g;
    };

    /* ---------- escada de abrir de madeira ---------- */
    P.a5_escada = o => {
      const g = G(), h = o.h || 2, w = o.w || .5, ab = .28, mad = m(o.c || '#6a4a2a', { tex: 'madeira_velha', r: .8 }), gs = [];
      [-1, 1].forEach(s => { gs.push(haste([s * w / 2, 0, ab], [s * w / 2 * .85, h, .02], .025, .025, 4)); gs.push(haste([s * w / 2, 0, -ab], [s * w / 2 * .85, h, -.02], .022, .022, 4)); });
      const nd = Math.round(h / .3); for (let i = 1; i < nd; i++) { const k = i / nd; gs.push(caixa(w * (1 - k * .15), .03, .1, 0, k * h, ab * (1 - k) + .01)); }
      gs.push(caixa(w * .9, .04, .2, 0, h, 0));
      addJ(g, gs, mad); return g;
    };

    /* ---------- parede de nomes escritos à mão, em várias línguas ---------- */
    P.a5_parede_nomes = o => {
      const g = G(), w = o.w || 3, h = o.h || 2.6, y = o.y ?? .05, r = rng(o.sem || 537);
      const sil = [['ma', 'ri', 'lu', 'an', 'to', 'el', 'sa', 'vi', 'co', 'de', 'ra', 'na', 'jo', 'ão', 'be', 'tri', 'fer', 'go', 'li', 'ca', 'mi', 'la', 'ro', 'sé'], ['ла', 'ми', 'на', 'ко', 'ва', 'ре', 'ан', 'ол', 'ег', 'да', 'ша'], ['νι', 'κο', 'λα', 'ος', 'ια', 'μα', 'ρι', 'ελ', 'ση'], ['さ', 'く', 'ら', 'ゆ', 'き', 'な', 'み', 'た', 'ろ', 'う', 'ひ', 'こ'], ['س', 'ل', 'م', 'ن', 'ر', 'ي', 'ك', 'ا', 'ه'], ['ש', 'ל', 'ו', 'מ', 'ר', 'ח', 'ל']];
      const nome = () => { const s = sil[r() < .55 ? 0 : 1 + Math.floor(r() * 5)]; let t = ''; const n = 2 + Math.floor(r() * 3); for (let i = 0; i < n; i++) t += s[Math.floor(r() * s.length)]; if (s === sil[0]) { t = t[0].toUpperCase() + t.slice(1); if (r() < .5) { let u = ''; for (let i = 0; i < 2 + Math.floor(r() * 2); i++) u += s[Math.floor(r() * s.length)]; t += ' ' + u[0].toUpperCase() + u.slice(1); } } return t; };
      const W = w >= h ? 512 : Math.round(512 * w / h), H = w >= h ? Math.round(512 * h / w) : 512;
      const mt = canvasMat(W, H, (x, Wc, Hc) => {
        x.clearRect(0, 0, Wc, Hc); if (o.f) { x.fillStyle = o.f; x.fillRect(0, 0, Wc, Hc); }
        const tintas = o.tintas || ['rgba(14,10,8,.95)', 'rgba(16,20,70,.9)', 'rgba(90,14,10,.9)', 'rgba(30,26,20,.85)', 'rgba(14,10,8,.95)'];
        for (let j = 7; j < Hc; j += 8 + r() * 6) { let px = -r() * 30; while (px < Wc) { const tam = 9 + r() * (r() < .08 ? 20 : 8); x.font = `${r() < .5 ? 'italic ' : ''}${tam}px "Segoe Script","Brush Script MT","Comic Sans MS",cursive`; x.fillStyle = tintas[Math.floor(r() * tintas.length)]; const t = nome(); x.save(); x.translate(px, j + (r() - .5) * 3); x.rotate((r() - .5) * .08); x.fillText(t, 0, 0); x.restore(); px += x.measureText(t).width + 5 + r() * 12; } }
      }, { r: .95, transp: true });
      pl(g, w, h, mt, 0, y + h / 2, .012);
      return g;
    };

    /* ---------- cadeira de madeira quebrada ---------- */
    P.a5_cadeira_quebrada = o => {
      const g = G(), r = rng(o.sem || 539), est = o.estado ?? 0, mad = m(o.c || '#6a4b2c', { tex: 'madeira_velha', r: .8 }), c = G(); g.add(c);
      const gs = [caixa(.44, .04, .42, 0, .43, 0)]; const pernas = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      pernas.forEach(([a, b], i) => { if (est === 1 && i === 2) return; gs.push(caixa(.035, .43, .035, a * .19, 0, b * .18)); });
      gs.push(caixa(.035, .55, .035, -.19, .47, -.19)); gs.push(caixa(.035, .55, .035, .19, .47, -.19)); for (let k = 0; k < 3; k++) gs.push(caixa(.38, .05, .02, 0, .6 + k * .14, -.19));
      if (est === 2) { addJ(c, gs.slice(0, 1), mad); const enc = G(); addJ(enc, gs.slice(-5), mad); enc.position.set(.3, -.45, .25); enc.rotation.set(-1.4, .4, 0); c.add(enc); c.rotation.set(.18, 0, -.1); c.position.y = -.25; const ps = []; for (let i = 0; i < 4; i++) ps.push(caixa(.035, .43, .035, (r() - .5) * .8, .02, (r() - .5) * .8, Math.PI / 2, r() * 3, 0)); addJ(g, ps, mad); }
      else { addJ(c, gs, mad); if (est === 0) { c.rotation.x = -Math.PI / 2; c.position.set(0, .19, .2); } else { c.rotation.z = .2; c.position.y = .02; addJ(g, [caixa(.035, .3, .035, .25, .02, .2, Math.PI / 2, .5, 0), caixa(.03, .12, .03, .2, .02, .32, Math.PI / 2, 1.2, 0)], mad); } }
      return g;
    };

    /* ---------- marca de queimado no chão ---------- */
    P.a5_queimado = o => {
      const g = G(), R = o.raio || 1.5, r = rng(o.sem || 541);
      const mt = canvasMat(256, 256, (x, W) => { x.clearRect(0, 0, W, W); const gr = x.createRadialGradient(W / 2, W / 2, 4, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(10,6,4,.95)'); gr.addColorStop(.55, 'rgba(20,12,6,.8)'); gr.addColorStop(.8, 'rgba(50,30,10,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, W); x.strokeStyle = 'rgba(0,0,0,.7)'; for (let i = 0; i < 26; i++) { x.lineWidth = 1 + r() * 2; let a = r() * 6.28, d = 20 + r() * 30; x.beginPath(); x.moveTo(W / 2 + Math.cos(a) * d, W / 2 + Math.sin(a) * d); for (let k = 0; k < 5; k++) { d += 10 + r() * 14; a += (r() - .5) * .4; x.lineTo(W / 2 + Math.cos(a) * d, W / 2 + Math.sin(a) * d); } x.stroke(); } for (let i = 0; i < 4; i++) { x.strokeStyle = `rgba(90,50,10,${.15 + r() * .2})`; x.lineWidth = 3; x.beginPath(); x.arc(W / 2, W / 2, W * (.25 + i * .06), 0, 7); x.stroke(); } }, { r: 1, transp: true });
      mt.polygonOffset = true; mt.polygonOffsetFactor = -2;
      const p = pl(g, R * 2, R * 2, mt, 0, .007, 0); p.rotation.x = -Math.PI / 2; return g;
    };

    /* ---------- cúpula: costelas de metal subindo das paredes até um furo no teto ---------- */
    P.a5_cupula = o => {
      const g = G(), R = o.raio || 4.6, n = o.n || 12, y0 = o.y ?? 2.05, furo = o.furo || .75, r = rng(o.sem || 543), gs = [];
      for (let i = 0; i < n; i++) { const a = i / n * 6.283; const pts = []; for (let k = 0; k <= 6; k++) { const s = k / 6, rr = R + (furo - R) * s, yy = y0 + (ALT - .03 - y0) * Math.sin(s * Math.PI / 2); pts.push([Math.cos(a) * rr, yy, Math.sin(a) * rr]); } gs.push(tuboG(pts, .05, 14, 5)); }
      [[R * .82, y0 + (ALT - y0) * .45], [R * .5, y0 + (ALT - y0) * .85]].forEach(([rr, yy]) => { const t = new T.TorusGeometry(rr, .035, 5, 48); t.rotateX(Math.PI / 2); t.translate(0, yy, 0); gs.push(t); });
      const col = new T.TorusGeometry(furo + .05, .09, 8, 28); col.rotateX(Math.PI / 2); col.translate(0, ALT - .08, 0); gs.push(col);
      addJ(g, gs, m(o.c || '#4a4e54', { r: .45, me: .65 }));
      const furoM = new T.Mesh(guardar(new T.CircleGeometry(furo, 28)), m('#000000', { r: 1 })); furoM.rotation.x = Math.PI / 2; furoM.position.y = ALT - .012; g.add(furoM);
      return g;
    };

    /* ---------- tela/visor com a superfície queimada lá fora ---------- */
    P.a5_vista = o => {
      const g = G(), w = o.w || 2.4, h = o.h || 1.3, y = o.y ?? 1.1, r = rng(o.sem || 545);
      bx(g, w + .16, h + .16, .1, m('#1c1c1e', { me: .5, r: .5 }), 0, y - .08, 0);
      const ceu = canvasMat(512, Math.round(512 * h / w), (x, W, H) => {
        const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a1c18'); gr.addColorStop(.45, '#7a4a2a'); gr.addColorStop(.62, '#a87848'); gr.addColorStop(.7, '#3a2a22'); gr.addColorStop(1, '#141010'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        const sol = x.createRadialGradient(W * .3, H * .3, 2, W * .3, H * .3, W * .12); sol.addColorStop(0, 'rgba(255,240,210,.9)'); sol.addColorStop(.3, 'rgba(255,190,120,.35)'); sol.addColorStop(1, 'rgba(255,160,90,0)'); x.fillStyle = sol; x.fillRect(0, 0, W, H);
        for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(60,40,30,${.1 + r() * .15})`; x.beginPath(); x.ellipse(r() * W, r() * H * .55, 30 + r() * 80, 4 + r() * 10, 0, 0, 7); x.fill(); }
        x.fillStyle = '#100c0a'; x.beginPath(); x.moveTo(0, H); for (let px = 0; px <= W; px += 8) { const alto = r() < .12 ? 20 + r() * 50 : r() * 12; x.lineTo(px, H * .68 - alto); x.lineTo(px + 6, H * .68 - alto); } x.lineTo(W, H); x.fill();
        const lx = W * (o.lx ?? .74), ly = H * .64; for (let i = 0; i < (o.luzes || 40); i++) { const a = r() * Math.PI, d = r() * W * .06; x.fillStyle = `rgba(255,${200 + r() * 55},${120 + r() * 80},${.5 + r() * .5})`; x.fillRect(lx + Math.cos(a) * d * 1.8, ly - Math.sin(a) * d, 2, 2); }
        const hl = x.createRadialGradient(lx, ly, 1, lx, ly, W * .12); hl.addColorStop(0, 'rgba(255,220,150,.3)'); hl.addColorStop(1, 'rgba(255,220,150,0)'); x.fillStyle = hl; x.fillRect(0, 0, W, H);
        x.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < H; i += 3) x.fillRect(0, i, W, 1);
        if (o.txt) { x.fillStyle = 'rgba(255,220,180,.8)'; x.font = 'bold 14px Courier New, monospace'; x.fillText(o.txt, 10, 20); }
      }, { brilho: 1.0 });
      pl(g, w, h, ceu, 0, y + h / 2, .052);
      const cinza = canvasMat(256, 256, (x, W) => { x.clearRect(0, 0, W, W); for (let i = 0; i < 220; i++) { x.fillStyle = `rgba(200,190,180,${.2 + r() * .5})`; x.fillRect(r() * W, r() * W, 1 + r() * 2, 1 + r() * 2); } }, { transp: true, brilho: .5 });
      cinza.map.wrapS = cinza.map.wrapT = T.RepeatWrapping; cinza.map.repeat.set(w / 1.2, h / 1.2);
      pl(g, w, h, cinza, 0, y + h / 2, .056);
      anim.push(dt => { cinza.map.offset.y += dt * .03; cinza.map.offset.x += dt * .006; });
      return g;
    };

    /* ---------- fenda com olhos que espiam (em cima de um casulo, por exemplo) ---------- */
    P.a5_olhos_fenda = o => {
      const g = G(), y = o.y ?? 1.4, R = o.raio || .55, piv = G(); piv.position.y = y; g.add(piv);
      const fenda = new T.Mesh(guardar(new T.PlaneGeometry(.16, .7, 1, 8)), m('#050203', { r: 1, lado: 2 })); const p = fenda.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - Math.abs(p.getY(i)) / .38)); fenda.position.z = R; piv.add(fenda);
      const mo = m('#ffffff', { unico: true, e: o.c || '#fff2b0', ei: 2.2 }), olhos = [-1, 1].map(s => { const e = sf(piv, .03, mo, s * .035, .06, R + .01, 8); e.scale.set(1, .6, .5); return e; });
      const lab = []; [-1, 1].forEach(s => lab.push(tuboG([[0, .36, R - .01], [s * .1, 0, R + .02], [0, -.36, R - .01]], .035, 12, 5))); addJ(piv, lab, carne('#a04a50', { rep: [1, 2] }));
      anim.push((dt, t) => { piv.rotation.y = Math.sin(t * .17) * .9; const pis = Math.sin(t * .9) > .97; olhos.forEach(e => { e.scale.y = pis ? .05 : .6; }); fenda.scale.x = 1 + Math.sin(t * .5) * .25; });
      return g;
    };

    /* ---------- gotas paradas no ar ---------- */
    P.a5_gotas_paradas = o => {
      const g = G(), r = rng(o.sem || 547), n = o.n || 9, w = o.w || 1.2, h = o.h || 1, y = o.y ?? 1, gs = [];
      for (let i = 0; i < n; i++) { const x = (r() - .5) * w, yy = y + r() * h, z = .05 + r() * .25, s = .025 + r() * .03; gs.push(bola(s, x, yy, z, 1, 1, 1, 5)); const c = new T.ConeGeometry(s * .95, s * 2.2, 5); c.translate(x, yy + s * 1.15, z); gs.push(c); }
      addJ(g, gs, m('#ffffff', { e: o.c || '#7a0c10', ei: .7, r: .1, me: .3 }));
      return g;
    };

    /* ---------- pertences perdidos (e partes do corpo) jogados no chão ---------- */
    P.a5_pertences = o => {
      const g = G(), r = rng(o.sem || 549), w = o.w || 2, d = o.d || 1.5, n = o.n || 8;
      const couro = m('#2a1a12', { r: .6 }), aco = metal('#b8b8b0'), ouro = m('#c9a227', { me: .8, r: .3 }), pele = m(o.pele || '#c8a08a', { r: .55 }), unha = m('#e8d0c0', { r: .3 }), sang = m('#4a0606', { r: .3 });
      const tipos = o.partes ? ['sapato', 'oculos', 'relogio', 'dedo', 'carteira', 'mao', 'chaves', 'dentes', 'foto', 'orelha', 'anel', 'dedo'] : ['sapato', 'oculos', 'relogio', 'carteira', 'chaves', 'foto', 'anel', 'sapato'];
      for (let i = 0; i < n; i++) {
        const it = G(); it.position.set((r() - .5) * w, 0, (r() - .5) * d); it.rotation.y = r() * 6.28; g.add(it); const t = tipos[i % tipos.length];
        if (t === 'sapato') { bx(it, .1, .06, .27, couro, 0, 0, 0); sf(it, .055, couro, 0, .05, .1, 8).scale.set(.9, .6, 1.2); bx(it, .1, .1, .1, couro, 0, .03, -.08); }
        else if (t === 'oculos') { [-1, 1].forEach(s => { const a = new T.Mesh(guardar(new T.TorusGeometry(.03, .005, 5, 14)), m('#111')); a.position.set(s * .036, .006, 0); a.rotation.x = Math.PI / 2; it.add(a); }); bx(it, .1, .005, .005, m('#111'), 0, .004, 0); }
        else if (t === 'relogio') { const a = new T.Mesh(guardar(new T.TorusGeometry(.035, .008, 5, 14)), couro); a.rotation.x = Math.PI / 2; a.position.y = .008; it.add(a); cy(it, .02, .02, .01, aco, .035, .005, 0, 10); }
        else if (t === 'carteira') bx(it, .11, .02, .09, couro, 0, 0, 0);
        else if (t === 'chaves') { const a = new T.Mesh(guardar(new T.TorusGeometry(.02, .004, 5, 12)), aco); a.rotation.x = Math.PI / 2; a.position.y = .004; it.add(a); for (let k = 0; k < 3; k++) bx(it, .012, .004, .06, aco, .02 + k * .012, 0, .03).rotation.y = k * .4; }
        else if (t === 'foto') { const f = pl(it, .1, .14, m('#ffffff', { unico: true, mapa: (() => { const [c, x] = tela(64, 90); x.fillStyle = '#c9b38a'; x.fillRect(0, 0, 64, 90); x.fillStyle = '#5a4a32'; [16, 34, 50].forEach(px => { x.beginPath(); x.ellipse(px, 36, 7, 9, 0, 0, 7); x.fill(); x.fillRect(px - 7, 46, 14, 34); }); x.strokeStyle = '#eee'; x.lineWidth = 4; x.strokeRect(0, 0, 64, 90); return texCanvas(c); })(), r: .8 }), 0, .003, 0); f.rotation.x = -Math.PI / 2; }
        else if (t === 'anel') { const a = new T.Mesh(guardar(new T.TorusGeometry(.012, .003, 5, 12)), ouro); a.rotation.x = Math.PI / 2; a.position.y = .003; it.add(a); }
        else if (t === 'dedo') { const c = cy(it, .009, .01, .07, pele, 0, .009, 0, 7); c.rotation.z = Math.PI / 2; c.position.y = .01; bx(it, .012, .004, .013, unha, .03, .016, 0); sf(it, .011, sang, -.036, .01, 0, 6); }
        else if (t === 'mao') { bx(it, .09, .03, .1, pele, 0, 0, 0); for (let k = 0; k < 4; k++) { const c = cy(it, .009, .01, .07 + (k % 3) * .01, pele, -.033 + k * .022, .012, .085, 6); c.rotation.x = Math.PI / 2; c.position.set(-.033 + k * .022, .014, .085); } const pol = cy(it, .01, .011, .06, pele, .055, .012, .02, 6); pol.rotation.set(Math.PI / 2, 0, .8); pol.position.set(.06, .014, .03); sf(it, .03, sang, 0, .01, -.06, 6).scale.set(1.5, .3, 1); }
        else if (t === 'dentes') { for (let k = 0; k < 5; k++) bx(it, .012, .018, .01, m('#e8e0c8', { r: .4 }), (r() - .5) * .08, 0, (r() - .5) * .08).rotation.set(r(), r(), r()); }
        else if (t === 'orelha') { const a = new T.Mesh(guardar(new T.TorusGeometry(.03, .012, 6, 12, Math.PI * 1.4)), pele); a.rotation.x = -Math.PI / 2; a.position.y = .012; it.add(a); }
      }
      return g;
    };

    /* ---------- feixe de cabos e tubos de carne correndo pelo chão ---------- */
    P.a5_feixe = o => {
      const g = G(), r = rng(o.sem || 551), n = o.n || 5, dx = o.dx ?? 3, dz = o.dz ?? 0, y0 = o.y0 ?? .04, y1 = o.y1 ?? .04, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
      const cab = [], car = [];
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * .09, rad = .025 + r() * .035, pts = [[nx * off, y0, nz * off]];
        if (y0 > .2) pts.push([nx * off + dx * .04, .06, nz * off + dz * .04]);
        for (let k = 1; k < 5; k++) { const s = k / 5, w = Math.sin(s * 6 + i) * .12; pts.push([dx * s + nx * (off + w), rad + .01, dz * s + nz * (off + w)]); }
        if (y1 > .2) pts.push([dx * .96 + nx * off, .06, dz * .96 + nz * off]);
        pts.push([dx + nx * off, y1, dz + nz * off]);
        (r() < (o.carne ?? .3) ? car : cab).push(tuboG(pts, rad, 30, 6));
      }
      addJ(g, cab, m(o.c || '#141414', { r: .65 })); const mc = addJ(g, car, carne('#8a3a40', { rep: [1, 4], unico: true }));
      if (mc) { const f = r() * 6; anim.push((dt, t) => { mc.material.emissiveIntensity = .3 + Math.max(0, Math.sin(t * 2.2 + f)) ** 8 * .9; }); }
      return g;
    };

    /* ---------- tanque de vidro com líquido nutriente, bolhas e um caroço de carne ---------- */
    P.a5_tanque_nutriente = o => {
      const g = G(), R = o.raio || .42, h = o.h || 1.8, r = rng(o.sem || 553), liq = o.liq || '#c87a20';
      cy(g, R + .08, R + .1, .22, metal('#4a4e52'), 0, 0, 0, 16); cy(g, R + .08, R + .08, .16, metal('#4a4e52'), 0, h + .22, 0, 16);
      const ml = m(liq, { unico: true, op: .62, r: .1, e: liq, ei: .45 }); cy(g, R - .03, R - .03, h * .85, ml, 0, .22, 0, 16);
      cy(g, R, R, h, m('#d6f0ff', { op: .16, r: .02 }), 0, .22, 0, 16);
      if (o.carne !== false) { const c = P.a5_massa({ w: R * 1.1, d: R * 1.1, h: h * .28, n: 3, pustulas: 0, veias: false, c: o.cc || '#b04a4a', sem: o.sem }); c.position.y = .22 + h * .35; c.scale.y = 1.4; g.add(c); }
      const bol = []; for (let i = 0; i < 6; i++) { const b = sf(g, .015 + r() * .015, m('#f0e8d0', { r: .1, e: '#605040', ei: .5 }), (r() - .5) * R, .3, (r() - .5) * R, 4); bol.push([b, r()]); }
      anim.push((dt, t) => { bol.forEach(([b, f]) => { const k = (t * .15 + f) % 1; b.position.y = .3 + k * h * .78; }); ml.emissiveIntensity = .4 + Math.sin(t * 1.2) * .1; });
      const tb = []; [-1, 1].forEach(s => tb.push(tuboG([[s * R * .5, h + .38, 0], [s * R * .6, h + .7, -.1], [s * R * .4, ALT - .05, -.35]], .035, 12, 6))); addJ(g, tb, m('#2a2a2a', { r: .6 }));
      if (o.txt) { const et = canvasMat(256, 64, (x, W, H) => { x.fillStyle = '#e8e4d0'; x.fillRect(0, 0, W, H); x.fillStyle = '#1a1a1a'; x.font = 'bold 30px Courier New, monospace'; x.textAlign = 'center'; x.fillText(o.txt, W / 2, 42); }, { r: .8 }); pl(g, .4, .1, et, 0, .1, R + .105); }
      return g;
    };

    /* ---------- retalhos de pele pendurados num varal de ganchos ---------- */
    P.a5_retalhos = o => {
      const g = G(), w = o.w || 2.4, n = o.n || 7, y = o.y ?? 2.05, r = rng(o.sem || 555);
      const atlas = canvasMat(512, 256, (x, W, H) => { x.clearRect(0, 0, W, H); for (let i = 0; i < 8; i++) { const cx = (i % 4 + .5) * W / 4, cy2 = (Math.floor(i / 4) + .5) * H / 2, rx = W / 8 * (.7 + r() * .25), ry = H / 4 * (.7 + r() * .25); x.fillStyle = ['#c89078', '#b87868', '#d8a890', '#a86858'][i % 4]; x.beginPath(); for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283, rr = .75 + r() * .25; x.lineTo(cx + Math.cos(a) * rx * rr, cy2 + Math.sin(a) * ry * rr); } x.closePath(); x.fill(); x.strokeStyle = 'rgba(90,30,20,.6)'; x.lineWidth = 2; x.stroke(); x.strokeStyle = '#1a0808'; x.lineWidth = 2; for (let k = 0; k < 7; k++) { const px = cx - rx * .6 + k * rx * .2; x.beginPath(); x.moveTo(px - 4, cy2 - 6); x.lineTo(px + 4, cy2 + 6); x.moveTo(px + 4, cy2 - 6); x.lineTo(px - 4, cy2 + 6); x.stroke(); } for (let k = 0; k < 30; k++) { x.fillStyle = `rgba(110,20,20,${r() * .35})`; x.fillRect(cx + (r() - .5) * rx * 1.4, cy2 + (r() - .5) * ry * 1.4, 2, 2); } } }, { r: .5, lado: true, transp: true });
      atlas.depthWrite = true; atlas.alphaTest = .3;
      bx(g, w, .04, .04, metal('#5a5a5a'), 0, y, .06);
      const pecas = [];
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + .2 + i * (w - .4) / Math.max(1, n - 1), s = .35 + r() * .25, idx = Math.floor(r() * 8), pg = new T.PlaneGeometry(s, s * 1.2), uv = pg.attributes.uv;
        const u0 = (idx % 4) / 4, v0 = 1 - (Math.floor(idx / 4) + 1) / 2; for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / 4, v0 + uv.getY(k) / 2);
        const piv = G(); piv.position.set(x, y, .08); g.add(piv); const me = new T.Mesh(guardar(pg), atlas); me.position.y = -s * .6 - .06; piv.add(me);
        bx(piv, .01, .08, .01, metal('#888'), 0, -.08, 0); pecas.push([piv, r() * 6]);
      }
      anim.push((dt, t) => pecas.forEach(([p, f]) => { p.rotation.x = Math.sin(t * .7 + f) * .08; p.rotation.z = Math.sin(t * .5 + f) * .05; }));
      return g;
    };

    /* ---------- agulhas grandes com linha grossa (no chão, numa base, ou penduradas no teto) ---------- */
    P.a5_agulhas = o => {
      const g = G(), r = rng(o.sem || 557), n = o.n || 4, H = o.h || 1.3, teto = o.modo === 'teto', ma = metal('#c8ccd0'), ml = m(o.linha || '#3a0c10', { r: .7 }), ag = [], li = [];
      if (!teto) bx(g, .5, .28, .5, carne('#7a3a3a', { rep: [1, 1] }), 0, 0, 0);
      for (let i = 0; i < n; i++) {
        const piv = G(); g.add(piv);
        if (teto) { const x = (r() - .5) * (o.w || 2), z = (r() - .5) * (o.d || 2), L = .7 + r() * .5, yb = ALT - L; piv.position.set(x, 0, z); li.push(haste([x, ALT, z], [x, yb + H * .4, z], .006, .006, 4)); const p = G(); p.position.set(x, yb, z); g.add(p); const a = [haste([0, 0, 0], [0, H * .4, 0], .012, .02, 6)]; const c = new T.ConeGeometry(.012, .06, 6); c.rotateX(Math.PI); c.translate(0, -.03, 0); a.push(c); addJ(p, a, ma); const f = r() * 6; anim.push((dt, t) => { p.rotation.z = Math.sin(t * .6 + f) * .05; }); }
        else { const a = (i / n) * 6.28 + r() * .4, inc = .1 + r() * .25; piv.position.set(Math.cos(a) * .12, .26, Math.sin(a) * .12); piv.rotation.set(Math.sin(a) * inc, 0, -Math.cos(a) * inc); const h = H * (.7 + r() * .4); ag.push([piv, h]); const gs = [haste([0, 0, 0], [0, h, 0], .022, .012, 6)]; const olhoA = new T.TorusGeometry(.03, .008, 5, 10); olhoA.scale(1, 1.8, 1); olhoA.translate(0, h - .05, 0); gs.push(olhoA); addJ(piv, gs, ma); const dir = r() * 6.28; li.push(tuboG([[Math.cos(a) * .12, .26 + h * .96, Math.sin(a) * .12], [Math.cos(dir) * .6, h * .8, Math.sin(dir) * .6], [Math.cos(dir) * 1.1, .4, Math.sin(dir) * 1.1], [Math.cos(dir) * 1.4, .02, Math.sin(dir) * 1.4]], .012, 16, 4)); }
      }
      addJ(g, li, ml);
      if (!teto) { const car = []; for (let i = 0; i < 3; i++) car.push(caixa(.12, .14, .12, (r() - .5) * .3, .28, (r() - .5) * .3)); addJ(g, car, m(o.linha || '#3a0c10', { r: .8 })); }
      return g;
    };

    /* ---------- facho de luz pálida descendo de um furo no teto (com cinzas caindo) ---------- */
    P.a5_facho = o => {
      const g = G(), r1 = o.raio || .7, r2 = o.base || 1.3, y0 = o.y ?? 0, h = ALT - y0, r = rng(o.sem || 559);
      const mt = canvasMat(64, 256, (x, W, H) => { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,.08)'); x.fillStyle = gr; x.fillRect(0, 0, W, H); }, { transp: true, lado: true });
      mt.color = new T.Color(o.c || '#d8d0c0'); mt.blending = T.AdditiveBlending; mt.opacity = o.op ?? .22; mt.emissive = new T.Color(o.c || '#d8d0c0'); mt.emissiveIntensity = .4;
      const cone = new T.Mesh(guardar(new T.CylinderGeometry(r1, r2, h, 24, 1, true)), mt); cone.position.y = y0 + h / 2; g.add(cone);
      const cin = m('#cfc8c0', { unico: true, op: .7, r: 1 }), parts = [];
      for (let i = 0; i < 18; i++) { const p = pl(g, .02, .02, cin, (r() - .5) * r2, y0 + r() * h, (r() - .5) * r2); p.material.side = T.DoubleSide; parts.push([p, r()]); }
      anim.push((dt, t) => { parts.forEach(([p, f]) => { const k = (t * .05 + f) % 1; p.position.y = ALT - .05 - k * h; p.rotation.set(t + f * 9, t * .7, 0); }); mt.opacity = (o.op ?? .22) * (.85 + Math.sin(t * .4) * .15); });
      return g;
    };

    /* ---------- píer de tábuas na margem ---------- */
    P.a5_pier = o => {
      const g = G(), w = o.w || 1.2, d = o.d || 2.4, h = o.h || .28, r = rng(o.sem || 561), mad = m(o.c || '#5a4630', { tex: 'madeira_velha', r: .85 }), gs = [];
      const nt = Math.floor(d / .2); for (let i = 0; i < nt; i++) { if (r() < .06) continue; gs.push(caixa(w + (r() - .5) * .08, .04, .17, (r() - .5) * .04, h, -d / 2 + .1 + i * .2, 0, (r() - .5) * .04, 0)); }
      [-1, 1].forEach(s => { gs.push(caixa(.06, .06, d, s * (w / 2 - .08), h - .06, 0)); for (let k = 0; k < 3; k++) gs.push(haste([s * (w / 2 - .08), -.2, -d / 2 + .2 + k * (d - .4) / 2], [s * (w / 2 - .08), h, -d / 2 + .2 + k * (d - .4) / 2], .05, .05, 6)); });
      gs.push(haste([w / 2 - .08, h, d / 2 - .15], [w / 2 - .08, h + .55, d / 2 - .15], .06, .06, 6));
      addJ(g, gs, mad);
      const corda = new T.TorusGeometry(.12, .025, 5, 14); corda.rotateX(Math.PI / 2); corda.translate(-w / 4, h + .05, d / 2 - .4); const c2 = new T.TorusGeometry(.09, .025, 5, 14); c2.rotateX(Math.PI / 2); c2.translate(-w / 4, h + .09, d / 2 - .4);
      addJ(g, [corda, c2], m('#8a7a5a', { r: 1 }));
      return g;
    };

    /* ---------- boca de túnel escura na parede (com borda de carne) ---------- */
    P.a5_tunel = o => {
      const g = G(), w = o.w || 2.4, h = o.h || 1.8, y = o.y ?? 0;
      const mt = canvasMat(256, Math.round(256 * h / w), (x, W, H) => { x.clearRect(0, 0, W, H); x.beginPath(); x.moveTo(0, H); x.lineTo(0, W / 2); x.arc(W / 2, W / 2, W / 2, Math.PI, 0); x.lineTo(W, H); x.closePath(); const gr = x.createRadialGradient(W / 2, H * .7, 4, W / 2, H * .7, W * .6); gr.addColorStop(0, '#000000'); gr.addColorStop(.7, '#070203'); gr.addColorStop(1, o.borda || '#2a0a0a'); x.fillStyle = gr; x.fill(); }, { transp: true, r: 1 });
      pl(g, w, h, mt, 0, y + h / 2, .015);
      const pts = []; for (let i = 0; i <= 10; i++) { const a = Math.PI - i / 10 * Math.PI; pts.push([Math.cos(a) * w / 2, y + h - w / 2 + Math.sin(a) * w / 2, .05]); } pts.unshift([-w / 2, y, .05]); pts.push([w / 2, y, .05]);
      addJ(g, [tuboG(pts, o.raio || .1, 30, 6)], carne(o.c || '#6a2428', { rep: [1, 4] }));
      return g;
    };

    /* ---------- cordão gigante: desce do teto, atravessa a sala e entra no chão ---------- */
    P.a5_cordao_grande = o => {
      const g = G(), de = o.de || [-2.8, 3], ate = o.ate || [2.8, -2.6], R = o.raio || .5, meio = o.meio ?? 2.45, r = rng(o.sem || 563);
      const L = (a, b, k) => a + (b - a) * k;
      const curva = new T.CatmullRomCurve3([V(de[0], ALT + .3, de[1]), V(L(de[0], ate[0], .15), ALT - .35, L(de[1], ate[1], .15)), V(L(de[0], ate[0], .38), meio + .15, L(de[1], ate[1], .38)), V(L(de[0], ate[0], .6), meio, L(de[1], ate[1], .6)), V(L(de[0], ate[0], .8), 1.3, L(de[1], ate[1], .8)), V(L(de[0], ate[0], .93), .35, L(de[1], ate[1], .93)), V(ate[0], -.4, ate[1])]);
      const mat = carne(o.c || '#9c4048', { rep: [1, 2], unico: true, ei: .4 }), mv = m('#3a0a16', { r: .35, e: '#2a0008', ei: .5 }), n = 9, fases = Array.from({ length: 5 }, () => r() * 6.28);
      // um grupo por trecho (tubo + as veias daquele trecho): a colisão fica só onde o cordão está baixo
      for (let i = 0; i < n; i++) {
        const seg = G(); g.add(seg); const t0 = i / n, t1 = Math.min(1, (i + 1.04) / n), pts = [];
        for (let k = 0; k <= 6; k++) pts.push(curva.getPointAt(t0 + (t1 - t0) * k / 6));
        seg.add(new T.Mesh(guardar(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 10, R * (1 + .08 * Math.sin(i * 1.7)), 12, false)), mat));
        const vs = fases.map(a => { const vp = []; for (let j = 0; j <= 4; j++) { const u = t0 + (t1 - t0) * j / 4, p = curva.getPointAt(u), tg = curva.getTangentAt(u), nn = (Math.abs(tg.y) > .95 ? V(1, 0, 0) : V(0, 1, 0)).cross(tg).normalize(), bb = tg.clone().cross(nn).normalize(), aa = a + u * 3; vp.push(p.clone().add(nn.multiplyScalar(Math.cos(aa) * R * 1.01)).add(bb.multiplyScalar(Math.sin(aa) * R * 1.01))); } return new T.TubeGeometry(new T.CatmullRomCurve3(vp), 8, .025, 5, false); });
        addJ(seg, vs, mv);
      }
      const aco = metal('#5a5e62'); (o.grampos || [.12, .3]).forEach(u => { const p = curva.getPointAt(u), tg = curva.getTangentAt(u), t2 = new T.Mesh(guardar(new T.TorusGeometry(R * 1.06, .06, 6, 20)), aco); t2.position.copy(p); t2.quaternion.setFromUnitVectors(V(0, 0, 1), tg); g.add(t2); });
      const ondas = []; for (let i = 0; i < 3; i++) { const t2 = new T.Mesh(guardar(new T.TorusGeometry(R * .95, R * .22, 8, 18)), mat); t2.position.copy(curva.getPointAt(.1 + i * .12)); t2.quaternion.setFromUnitVectors(V(0, 0, 1), curva.getTangentAt(.1 + i * .12)); g.add(t2); ondas.push([t2, i / 3]); }
      anim.push((dt, t) => { ondas.forEach(([t2, f]) => { const u = Math.min(.97, ((t * .07 + f) % 1)), p = curva.getPointAt(u); t2.position.copy(p); t2.quaternion.setFromUnitVectors(V(0, 0, 1), curva.getTangentAt(u)); }); mat.emissiveIntensity = .35 + Math.max(0, Math.sin(t * 2.2)) ** 6 * .6; });
      return g;
    };

    /* ---------- painel de cunhas de espuma (câmara sem eco) ---------- */
    P.a5_cunhas = o => {
      const g = G(), w = o.w || 3, h = o.h || 3, y = o.y ?? 0, t = o.tam || .3, pr = o.prof || .32, gs = [];
      gs.push(caixa(w, h, .05, 0, y, .025));
      const nx = Math.max(1, Math.floor(w / t)), ny = Math.max(1, Math.floor(h / t)), sx = w / nx, sy = h / ny;
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const c = new T.ConeGeometry(Math.min(sx, sy) * .7, pr, 4, 1); c.rotateY(Math.PI / 4); c.rotateX(Math.PI / 2); c.translate(-w / 2 + sx * (i + .5), y + sy * (j + .5), .05 + pr / 2); gs.push(c); }
      addJ(g, gs, m(o.c || '#2a2a2e', { r: 1, tex: 'espuma', rep: [2, 2] }));
      return g;
    };

    /* ---------- barco a remo de madeira (casco afinando na proa e na popa, bancos e remos) ---------- */
    P.a5_barco = o => {
      const g = G(), L = o.l || 3, B = o.larg || 1.1, H = o.alt || .45, mad = m(o.c || '#5a4630', { tex: 'madeira_velha', r: .85, lado: 2, rep: [3, 1] });
      const casco = new T.CylinderGeometry(1, 1, L, 14, 10, true, Math.PI / 2, Math.PI), p = casco.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = y / (L / 2), k = Math.max(.04, Math.sqrt(1 - Math.pow(Math.abs(t), 3))); p.setXYZ(i, x * B / 2 * k, z * H * (1 - .25 * Math.abs(t)) + H * (1 + .35 * t * t), y); }
      casco.computeVertexNormals(); g.add(new T.Mesh(guardar(casco), mad));
      const gs = [], N = 14;
      for (let s of [-1, 1]) for (let i = 0; i < N; i++) { const t0 = -1 + 2 * i / N, t1 = -1 + 2 * (i + 1) / N, f = t => [s * B / 2 * Math.max(.04, Math.sqrt(1 - Math.pow(Math.abs(t), 3))), H * (1 + .35 * t * t) + .02, t * L / 2]; gs.push(haste(f(t0), f(t1), .025, .025, 4)); }
      [-.45, .1, .6].forEach(z => gs.push(caixa(B * .82, .04, .22, 0, H * .78, z)));
      if (o.remos !== false) [-1, 1].forEach(s => { gs.push(haste([s * B * .35, H + .05, -.2], [s * B * .55, H * .35, 1.2], .022, .022, 5)); gs.push(caixa(.14, .02, .45, s * B * .58, H * .3, 1.35, .2, 0, 0)); });
      addJ(g, gs, mad);
      const fundo = new T.Mesh(guardar(new T.PlaneGeometry(B * .7, L * .8)), m('#3a0a08', { r: .2, e: '#1a0000', ei: .3 })); fundo.rotation.x = -Math.PI / 2; fundo.position.y = H * .32; g.add(fundo);
      const f = rng(o.sem || 565)() * 6; anim.push((dt, t) => { g.children.forEach(c => { c.position.y = Math.sin(t * .6 + f) * .015; }); });
      return g;
    };

    /* ---------- coroa dourada (põe em cima de uma cabeça com h0) ---------- */
    P.a5_coroa = o => {
      const g = G(), R = o.raio || .14, ouro = m(o.c || '#c9a227', { me: .85, r: .3, e: '#3a2a00', ei: .25 }), gs = [];
      const aro = new T.CylinderGeometry(R, R * .96, .07, 16, 1, true); aro.translate(0, .035, 0); gs.push(aro);
      for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283, c = new T.ConeGeometry(.025, .1, 4); c.translate(Math.cos(a) * R, .11, Math.sin(a) * R); gs.push(c); }
      const mc = juntar(gs, ouro); mc.material.side = T.DoubleSide; g.add(mc); return g;
    };
  });
})();

(() => { (window.ACF3D = window.ACF3D || {}).andaresProntos = true; })();
