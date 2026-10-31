/* Interações nas salas do 3D (A Caixa de Fósforos · Planta)
   Um item da cena com "int" vira algo que se usa com E (ou tocando no botão da tela):
     abrir   portão, armário, geladeira, gaveta (a peça anima a folha; folha fechada bloqueia o caminho)
     ligar   luminária, TV, monitor, rádio (sem resposta própria, o brilho e a luz da peça apagam)
     jogar   fliperama (a peça mostra a partida para todos na sala)
     tocar   piano, telefone, sino, gravador… (som para quem está perto)
     ler     aviso, etiqueta, bilhete (texto do campo intTxt da cena)
     vestir  trajes num cabide: vão para a ficha ativa, vestidos; o cabide perde um
     video   telão: o Mestre passa um vídeo do YouTube para todos que estão na sala
   Campos da cena: int, intN (nome do objeto), intItem (item do catálogo, para vestir), intQtd (quantos),
   intSom (piano, telefone, sino, radio, maquina, fliperama, gravador, campainha, metal, porta), intTxt, intIni (0/1).
   Estado comum: mapa/inter/<c{CN}_{i}> = { v, ts, q } (qualquer conta logada grava; regra do Firebase);
   trajes: mapa/estoque/v_c{CN}_{i}; telão: mapa/video/c{CN} = { id, t0 } (só o Mestre).
   A peça pode responder sozinha: g.userData.aoInter = (v, instantaneo, evento) => {}, e marcar com
   userData.folha as partes que abrem; g.userData.tela = o plano onde o vídeo aparece. */
(() => {
  const NS = window.ACF3D = window.ACF3D || {};
  const ACF = () => window.ACF;
  const est = () => (ACF() && ACF().estado) || {};
  const PADRAO = { abrir: 0, ligar: 1, jogar: 0, tocar: 0, ler: 0, vestir: 0, video: 0 };
  const NOME = { abrir: 'porta', ligar: 'aparelho', jogar: 'fliperama', tocar: 'tocar', ler: 'aviso', vestir: 'traje', video: 'telão' };
  const SOM_PADRAO = { abrir: 'porta', ligar: 'interruptor', jogar: 'fliperama', tocar: 'campainha' };
  const RAIO = .22;
  const I = { pos: [0, 0] };

  /* ---------- ao montar uma sala ---------- */
  function preparar(T, g, s, p, desc) {
    const lista = [], dinam = [];
    g.updateMatrixWorld(true);
    g.children.forEach(o => {
      const d = o.userData.int; if (!d || !d.m || PADRAO[d.m] === undefined) return;
      const k = `c${s.cn}_${o.userData.i}`;
      const b = new T.Box3().setFromObject(o);
      if (b.isEmpty()) return;
      if ((d.m === 'ligar' || d.m === 'jogar') && !o.userData.aoInter) {
        // brilho só desta peça (o material pode ser repartido com outras peças iguais)
        const mats = [];
        o.traverse(x => {
          if (!x.isMesh || !x.material || Array.isArray(x.material)) return;
          const mt = x.material;
          if (!mt.emissive || !(mt.emissiveIntensity > .05)) return;
          const c = mt.clone(); desc.push(c); x.material = c; mats.push({ m: c, base: c.emissiveIntensity });
        });
        o.userData._mats = mats;
      }
      // folhas: a parte que abre (portão numa cerca inteira): é ela que se usa, não a cerca toda
      const bf = new T.Box3();
      o.traverse(x => {
        if (x === o || !x.userData.folha) return;
        const bb = new T.Box3().setFromObject(x);
        if (!bb.isEmpty()) { dinam.push({ k, r: [bb.min.x - RAIO, bb.max.x + RAIO, bb.min.z - RAIO, bb.max.z + RAIO] }); bf.union(bb); }
        let u = x.parent; while (u && u !== g) { u.userData.temFolha = true; u = u.parent; }
      });
      const ref = bf.isEmpty() ? b : bf;
      const c = new T.Vector3(); ref.getCenter(c); c.y = Math.min(1.1, Math.max(.4, c.y));
      lista.push({ tipo: 'int', m: d.m, k, d, nome: d.nome || NOME[d.m], cn: s.cn, p, pos: c, r: [ref.min.x, ref.max.x, ref.min.z, ref.max.z], obj: o });
    });
    return { lista, dinam };
  }

  /* ---------- estado → peças ---------- */
  function valor(it) {
    if (it.m === 'vestir') { const e = est().estoque || {}, n = e['v_' + it.k]; return n === undefined ? (it.d.qtd ?? 1) : n; }
    const s = (est().inter || {})[it.k];
    return s && typeof s.v === 'number' ? s.v : (it.d.ini ?? PADRAO[it.m]);
  }
  function aplicar(c, inst) {
    if (!c || !c.inter) return;
    const S = est().inter || {};
    c.inter.lista.forEach(it => {
      const v = valor(it), ts = (S[it.k] && S[it.k].ts) || 0;
      const primeira = it.ult === undefined;
      const ev = !primeira && !inst && ts !== it.ultTs && ts > Date.now() - 20000;
      if (!primeira && v === it.ult && !ev) return;
      const mudou = v !== it.ult;
      it.ult = v; it.ultTs = ts;
      const o = it.obj;
      if (o.userData.aoInter) { try { o.userData.aoInter(v, inst || primeira, ev ? it.m : null); } catch (e) { console.warn('3D interação:', e); } }
      else if (it.m === 'ligar') ligarPadrao(o, v);
      else if (it.m === 'jogar' && ev) piscarPadrao(o);
      if (primeira || inst) return;
      // som para quem está perto (abriu, ligou, tocou, jogou)
      if ((mudou && (it.m === 'abrir' || it.m === 'ligar')) || ev) som(it.d.som || SOM_PADRAO[it.m] || 'campainha', it.pos, it.m === 'abrir' ? v : 1);
    });
  }
  function ligarPadrao(o, v) {
    (o.userData._mats || []).forEach(x => { x.m.userData.mult = v ? 1 : .03; x.m.emissiveIntensity = x.base * (v ? 1 : .03); });
    o.userData._lig = v ? 1 : 0;
  }
  function piscarPadrao(o) {
    const ms = o.userData._mats || []; let n = 0;
    const f = () => { n++; ms.forEach(x => { x.m.userData.mult = n % 2 ? 2.2 : 1; }); if (n < 16) setTimeout(f, 220); else ms.forEach(x => { x.m.userData.mult = 1; }); };
    f();
  }
  // folhas fechadas bloqueiam o caminho
  function livre(c, x, z) {
    if (!c.inter || !c.inter.dinam.length) return true;
    const S = est().inter || {};
    for (const d of c.inter.dinam) {
      const it = c.inter.lista.find(i => i.k === d.k);
      const aberto = S[d.k] ? S[d.k].v : (it && it.d.ini) || 0;
      if (!aberto && x >= d.r[0] && x <= d.r[1] && z >= d.r[2] && z <= d.r[3]) return false;
    }
    return true;
  }
  // distância até a borda da peça (um portão de 3 m se usa de qualquer ponto dele)
  const distancia = (it, x, z) => Math.hypot(Math.max(it.r[0] - x, 0, x - it.r[1]), Math.max(it.r[2] - z, 0, z - it.r[3]));

  /* ---------- texto do botão ---------- */
  function rotulo(it, ctx) {
    const pode = !!ctx.ctrl || ctx.quem === 'mestre', v = it.ult ?? valor(it), n = it.nome;
    switch (it.m) {
      case 'abrir': return pode ? (v ? `🚪 Fechar: ${n}` : `🚪 Abrir: ${n}`) : null;
      case 'ligar': return pode ? (v ? `💡 Desligar: ${n}` : `💡 Ligar: ${n}`) : null;
      case 'jogar': return pode ? `🕹 Jogar: ${n}` : null;
      case 'tocar': return pode ? `🎵 ${n}` : null;
      case 'ler': return `📄 Ler: ${n}`;
      case 'vestir': return ctx.ctrl && ctx.quem !== 'mestre' ? (v > 0 ? `🦺 Vestir: ${it.d.item || n} (${v})` : null) : (ctx.quem === 'mestre' ? `🦺 ${it.d.item || n}: ${v} no cabide` : null);
      case 'video': return ctx.quem === 'mestre' ? '🎬 Telão: passar um vídeo' : null;
    }
    return null;
  }

  /* ---------- usar (E) ---------- */
  function usar(it, ctx) {
    const A = ACF(); if (!A) return;
    preparerSom();
    const v = it.ult ?? valor(it);
    switch (it.m) {
      case 'abrir': case 'ligar': A.interagir(it.k, v ? 0 : 1); break;
      case 'jogar': case 'tocar': A.interagir(it.k, v ? 1 : 0); break;
      case 'ler': mostrarTexto(ctx.raiz, it.nome, it.d.txt || ''); break;
      case 'vestir': {
        if (ctx.quem === 'mestre') { ctx.toast('Os trajes vão para a ficha de quem veste: o jogador usa com E. No 🎛 você repõe o cabide.'); break; }
        const r = A.vestirTraje('v_' + it.k, it.d.item || it.nome);
        ctx.toast(r);
        break;
      }
      case 'video': if (ctx.abrirPainel) ctx.abrirPainel(); break;
    }
  }

  /* ---------- quadro de leitura (aviso, etiqueta) ---------- */
  function mostrarTexto(raiz, tit, txt) {
    if (document.pointerLockElement) document.exitPointerLock();
    const el = document.createElement('div'); el.className = 's3d-ler'; el.setAttribute('role', 'dialog');
    const esc = t => String(t || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    el.innerHTML = `<div class="s3d-ler-cx"><p class="s3d-ler-tit">${esc(tit)}</p><p class="s3d-ler-txt">${esc(txt).replace(/\n/g, '<br>')}</p><button type="button">Fechar</button></div>`;
    const fechar = () => { el.remove(); document.removeEventListener('keydown', tecla, true); };
    const tecla = e => { if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') { e.preventDefault(); e.stopPropagation(); fechar(); } };
    el.querySelector('button').onclick = fechar; el.onclick = e => { if (e.target === el) fechar(); };
    (raiz || document.body).appendChild(el);
    setTimeout(() => document.addEventListener('keydown', tecla, true), 50);
  }

  /* ---------- sons curtos, gerados na hora ---------- */
  let ac = null, saida = null;
  function preparerSom() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { if (!ac) { ac = new AC(); saida = ac.createGain(); saida.gain.value = .5; saida.connect(ac.destination); } if (ac.state === 'suspended') ac.resume().catch(() => {}); } catch (e) { ac = null; }
  }
  const mudo = () => { try { if (ACF() && ACF().mudo) return true; return JSON.parse(localStorage.getItem('acf-s3d-som') ?? 'true') === false; } catch (e) { return false; } };
  function nota(t, f, dur, v, tipo = 'sine', dest = saida) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = tipo; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05); return o;
  }
  function chiado(t, dur, v, f = 1800, q = 1, dest = saida) {
    const n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = b; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(bp); bp.connect(g); g.connect(dest); s.start(t);
  }
  const SONS = {
    piano(t, d) { const base = [220, 261.6, 311.1, 370, 415.3, 523.3]; for (let i = 0; i < 5; i++) { const f = base[Math.floor(Math.random() * base.length)]; nota(t + i * .32, f, 1.6, .16, 'triangle', d); nota(t + i * .32, f * 2.003, 1.0, .04, 'sine', d); } },
    telefone(t, d) { for (let r = 0; r < 2; r++) for (let i = 0; i < 18; i++) { nota(t + r * 1.4 + i * .05, 440, .05, .07, 'square', d); nota(t + r * 1.4 + i * .05, 480, .05, .05, 'square', d); } },
    sino(t, d) { [1, 2.76, 5.4, 8.93].forEach((k, i) => nota(t, 330 * k, 3 - i * .5, .12 / (i + 1), 'sine', d)); },
    radio(t, d) { chiado(t, 1.6, .25, 1400, .6, d); nota(t + .5, 600, .5, .03, 'sawtooth', d); },
    maquina(t, d) { chiado(t, .25, .4, 300, 1, d); for (let i = 0; i < 6; i++) nota(t + .2 + i * .09, 120, .12, .09, 'square', d); chiado(t + .7, .3, .2, 500, 1, d); },
    fliperama(t, d) { const m = [523, 659, 784, 1047, 784, 659, 880, 1175]; m.forEach((f, i) => nota(t + i * .11, f, .1, .06, 'square', d)); nota(t + 1, 196, .5, .05, 'square', d); },
    gravador(t, d) { chiado(t, 1.2, .08, 3000, .4, d); nota(t, 90, 1.2, .05, 'sawtooth', d); },
    campainha(t, d) { nota(t, 880, .4, .12, 'triangle', d); nota(t + .15, 660, .6, .1, 'triangle', d); },
    interruptor(t, d) { chiado(t, .04, .5, 3500, 2, d); },
    porta(t, d, v) { const o = ac.createOscillator(), bp = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(v ? 70 : 110, t); o.frequency.linearRampToValueAtTime(v ? 110 : 60, t + .7); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 6; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.1, t + .1); g.gain.exponentialRampToValueAtTime(.0001, t + .8); o.connect(bp); bp.connect(g); g.connect(d); o.start(t); o.stop(t + .9); if (!v) chiado(t + .7, .12, .5, 400, 1, d); },
    metal(t, d) { for (let i = 0; i < 7; i++) chiado(t + i * .05 + Math.random() * .03, .09, .25, 2500 + Math.random() * 1500, 4, d); chiado(t + .45, .2, .35, 700, 2, d); },
    gaveta(t, d) { chiado(t, .35, .2, 900, 1.5, d); chiado(t + .33, .06, .4, 500, 2, d); },
  };
  function som(nome, pos, v) {
    if (!ac || mudo()) return;
    const f = SONS[nome] || SONS.campainha;
    const d = pos ? Math.hypot(pos.x - I.pos[0], pos.z - I.pos[1]) : 0, k = Math.max(0, 1 - d / 14);
    if (k <= 0) return;
    const g = ac.createGain(); g.gain.value = k; g.connect(saida);
    try { f(ac.currentTime + .02, g, v); } catch (e) {}
  }

  /* ---------- traje vestido sobre a miniatura ---------- */
  const CORES_TRAJE = { hazmat: ['#d8c22a', '#1d2a33'], eletrico: ['#c86a1e', '#1d1d1d'], mergulho: ['#1c2a36', '#6aa7c4'], espacial: ['#e8e8e4', '#d8a43a'], aproximacao: ['#a9a59a', '#c8b06a'], vestimenta: ['#5a5a66', '#222'] };
  function traje(F, alt, tipo) {
    const { G, m, bx, cy, sf } = F, g = G(), [c1, c2] = CORES_TRAJE[tipo] || CORES_TRAJE.hazmat, k = (alt || 1.7) / 1.7;
    if (tipo === 'vestimenta') return g;
    const pano = m(c1, { r: .72 }), pano2 = m(c1, { r: .85 }), viseira = m(c2, { r: .06, me: .5 }), borracha = m('#151515', { r: .9 }), fita = m(tipo === 'hazmat' ? '#2a2a2a' : '#3a3a3a', { r: .8 });
    // pernas largas (o traje sobra), botas e fita nos tornozelos
    [-.105, .105].forEach(x => { cy(g, .1, .085, .5, pano, x, .3, 0, 12); cy(g, .085, .08, .3, pano2, x, .06, 0, 12); bx(g, .13, .1, .24, borracha, x, 0, .03); cy(g, .092, .092, .05, fita, x, .1, 0, 12); });
    // tronco com folga, zíper, cinto e bolso
    const tr = cy(g, .2, .17, .64, pano, 0, .78, 0, 16); tr.scale.z = .78;
    bx(g, .02, .58, .02, borracha, 0, .8, .158);
    cy(g, .19, .19, .05, fita, 0, .86, 0, 16).scale.z = .8;
    bx(g, .1, .1, .03, pano2, .09, 1.08, .145);
    bx(g, .46, .07, .3, pano, 0, 1.36, 0);   // ombros
    // braços caídos, luvas e fita nos punhos
    [-1, 1].forEach(sx => {
      const b = cy(g, .07, .065, .6, pano, sx * .25, .82, 0, 12); b.rotation.z = sx * .1;
      cy(g, .068, .068, .04, fita, sx * .282, .84, 0, 12);
      const lv = sf(g, .062, borracha, sx * .285, .78, 0, 10); lv.scale.set(1, 1.3, .9);
    });
    if (tipo === 'mergulho') { cy(g, .085, .085, .52, m('#c8c8c8', { me: .7, r: .3 }), 0, .9, -.2, 14); sf(g, .16, pano, 0, 1.56, 0, 18); const v2 = sf(g, .12, viseira, 0, 1.57, .08, 18); v2.scale.z = .55; cy(g, .015, .015, .5, borracha, .09, 1.15, -.12, 6).rotation.x = .9; }
    else if (tipo === 'espacial') { sf(g, .2, pano, 0, 1.58, 0, 20); const v2 = sf(g, .155, viseira, 0, 1.59, .08, 20); v2.scale.z = .6; bx(g, .36, .42, .16, pano2, 0, .92, -.21); }
    else {
      // capuz alto com viseira larga; filtros dos dois lados (hazmat)
      const cap = sf(g, .175, pano, 0, 1.56, 0, 18); cap.scale.set(1, 1.12, 1);
      const v2 = sf(g, .14, viseira, 0, 1.57, .07, 18); v2.scale.set(1.05, .78, .55);
      if (tipo === 'hazmat') [-1, 1].forEach(sx => { const f = cy(g, .045, .05, .07, borracha, sx * .08, 1.42, .12, 12); f.rotation.x = Math.PI / 2; f.rotation.z = sx * .5; });
      else cy(g, .05, .05, .05, borracha, 0, 1.43, .14, 12).rotation.x = Math.PI / 2;
    }
    g.scale.setScalar(k);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  const tipoTraje = nome => {
    const n = String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (/hazmat/.test(n)) return 'hazmat'; if (/isolamento|eletric/.test(n)) return 'eletrico'; if (/mergulho/.test(n)) return 'mergulho';
    if (/espacial/.test(n)) return 'espacial'; if (/aproximacao/.test(n)) return 'aproximacao'; if (/^traje|^vestimenta/.test(n)) return 'hazmat';
    return '';
  };

  /* ---------- telão: vídeo do YouTube por cima do plano da tela ---------- */
  const idYoutube = u => {
    const s = String(u || '').trim();
    const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/) || s.match(/^([\w-]{11})$/);
    return m ? m[1] : null;
  };
  // homografia: leva o retângulo (0,0)-(w,h) para os quatro cantos q (px) → matrix3d do CSS
  function homografia(w, h, q) {
    const src = [[0, 0], [w, 0], [w, h], [0, h]], A2 = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = q[i];
      A2.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A2.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    // eliminação de Gauss
    for (let c = 0; c < 8; c++) {
      let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A2[r][c]) > Math.abs(A2[p][c])) p = r;
      [A2[c], A2[p]] = [A2[p], A2[c]]; [b[c], b[p]] = [b[p], b[c]];
      const d = A2[c][c]; if (Math.abs(d) < 1e-9) return null;
      for (let r = 0; r < 8; r++) if (r !== c) { const f = A2[r][c] / d; for (let k = c; k < 8; k++) A2[r][k] -= f * A2[c][k]; b[r] -= f * b[c]; }
    }
    const H = b.map((x, i) => x / A2[i][i]);
    const [a, b1, c, d, e, f, g, hh] = H;
    return `matrix3d(${a},${d},0,${g},${b1},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
  }
  const Video = { el: null, ifr: null, id: null, t0: 0, vol: -1, pronto: false };
  function videoTirar() { if (Video.el) Video.el.remove(); Video.el = Video.ifr = null; Video.id = null; Video.vol = -1; }
  function videoCmd(func, args = []) { try { Video.ifr && Video.ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); } catch (e) {} }
  // a cada quadro: cam (câmera), canvas (o do 3D), lista de interativos, salaAqui (p da câmera), perto (x,z)
  function videoQuadro(T, cam, canvas, interativos, salaAqui, x, z) {
    const V = est().video || {};
    const tel = interativos.find(it => it.tipo === 'int' && it.m === 'video' && it.p === salaAqui && V['c' + it.cn] && V['c' + it.cn].id);
    if (!tel) { if (Video.el) videoTirar(); return; }
    const st = V['c' + tel.cn];
    if (!tel.plano) { let best = null, ba = 0; tel.obj.traverse(x => { const gp = x.isMesh && x.geometry && x.geometry.type === 'PlaneGeometry' && x.geometry.parameters; if (gp && gp.width * gp.height > ba) { ba = gp.width * gp.height; best = x; } }); tel.plano = tel.obj.userData.tela || best || tel.obj; }
    const plano = tel.plano;
    if (!Video.el || Video.id !== st.id || Video.t0 !== st.t0) {
      videoTirar();
      const el = document.createElement('div'); el.className = 's3d-video';
      const seg = Math.max(0, Math.floor((Date.now() - (st.t0 || Date.now())) / 1000));
      el.innerHTML = `<iframe width="640" height="360" src="https://www.youtube-nocookie.com/embed/${st.id}?autoplay=1&mute=1&controls=0&disablekb=1&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&enablejsapi=1&start=${seg}" title="Telão" allow="autoplay; encrypted-media" frameborder="0"></iframe>`;
      canvas.parentNode.insertBefore(el, canvas.nextSibling);
      Video.el = el; Video.ifr = el.querySelector('iframe'); Video.id = st.id; Video.t0 = st.t0; Video.vol = -1;
      Video.ifr.addEventListener('load', () => { setTimeout(() => { videoCmd('unMute'); Video.vol = -1; }, 800); });
    }
    // cantos do plano da tela no mundo
    const gp = plano.geometry && plano.geometry.parameters;
    const w = gp && gp.width ? gp.width : 2, h = gp && gp.height ? gp.height : 1;
    plano.updateMatrixWorld(true);
    const cs = [[-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2]].map(([a, b]) => new T.Vector3(a, b, .002).applyMatrix4(plano.matrixWorld));
    const R = canvas.getBoundingClientRect(), PR = canvas.parentNode.getBoundingClientRect();
    const q = []; let atras = false;
    cs.forEach(v => {
      const vc = v.clone().applyMatrix4(cam.matrixWorldInverse); if (vc.z > -.05) atras = true;
      const n = v.clone().project(cam); q.push([(n.x + 1) / 2 * R.width + (R.left - PR.left), (1 - n.y) / 2 * R.height + (R.top - PR.top)]);
    });
    const M = !atras && homografia(640, 360, q);
    Video.el.style.display = M ? '' : 'none';
    if (M) Video.el.style.transform = M;
    // volume pela distância até a tela
    const d = Math.hypot(tel.pos.x - x, tel.pos.z - z), vol = mudo() ? 0 : Math.round(Math.max(10, Math.min(100, 110 - d * 6)));
    if (Math.abs(vol - Video.vol) >= 5) { Video.vol = vol; if (vol === 0) videoCmd('mute'); else { videoCmd('unMute'); videoCmd('setVolume', [vol]); } }
  }

  NS.inter = { preparar, aplicar, livre, distancia, rotulo, usar, som, preparerSom, traje, tipoTraje, idYoutube, videoQuadro, videoTirar, pos: I.pos, set ouvinte(p) { I.pos[0] = p[0]; I.pos[1] = p[1]; } };
})();
