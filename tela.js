/* =========================================================
   MODO TELA (?tv=1): a TV da mesa, ligada no computador do Mestre (2º monitor).
   Uma janela só com o mapa (3D ou 2.5D), mostrando o que a mesa enxerga: salas reveladas, cobaias e o que os
   jogadores veem. Nada do privado chega aqui: a janela não usa a conta de quem a abriu (app.js).
   O Mestre comanda pelo bloco Mesa; as duas janelas conversam por BroadcastChannel (mesmo navegador, sem servidor).
   Câmera: segue os jogadores, mostra a sala ou o jogador que o Mestre escolher, ou copia a câmera 3D do Mestre
   (congela quando ele controla um Filho ou entra na visão da criatura).
   ========================================================= */
(() => {
  const TV = new URLSearchParams(location.search).has('tv');
  const A = () => window.ACF;
  const CANAL = 'acf-tela', CHAVE = 'acf-tela-cfg';
  const PAD = { vista: '3d', cam: 'seguir', alvo: '', res: '1080', som: false };
  const RES = { 720: 720, 1080: 1080, 2160: 2160 };
  const bc = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CANAL) : null;
  const ler = () => { try { return { ...PAD, ...(JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}) }; } catch (e) { return { ...PAD }; } };
  const pronto = f => { const a = A(); if (a && a.estado && document.readyState !== 'loading') f(); else setTimeout(() => pronto(f), 200); };
  const ehCobaia = tk => { const a = A(); return !!tk && !!a.SER[tk.s] && a.SER[tk.s].tipo === 'cobaia'; };
  const nome2 = n => String(n).padStart(2, '0');

  if (TV) pronto(tela); else pronto(mestre);

  /* ---------- janela do Mestre: o bloco Mesa comanda a Tela ---------- */
  function mestre() {
    const $ = s => document.querySelector(s);
    const ctl = $('#telaCtl'); if (!ctl || !bc) { if (ctl) ctl.hidden = true; return; }
    let cfg = ler(), viva = 0, info = null, ultCam = '', bloqEnviado = false;
    const ehM = () => !!A().mestre;   // só a janela do Mestre comanda (jogador ou auxiliar no mesmo navegador, não)
    const enviar = () => { if (ehM()) bc.postMessage({ t: 'cfg', cfg }); };
    const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(cfg)); } catch (e) {} enviar(); pintar(); };
    function opcoesAlvo() {
      const a = A(), sel = $('#telaAlvo'), tks = (a.estado || {}).tokens || {};
      let h = '<optgroup label="Jogadores">';
      Object.entries(tks).filter(([, tk]) => ehCobaia(tk)).forEach(([id, tk]) => { h += `<option value="t:${id}">${(a.SER[tk.s].nome || id)} · ${tk.a}º andar</option>`; });
      h += '</optgroup>';
      for (let n = 1; n <= 5; n++) {
        let g = '';
        for (let p = 1; p <= 25; p++) {
          const cn = 25 * (n - 1) + p; if (!a.salaRevelada(cn)) continue;
          const [nm] = a.infoSala(cn) || [];
          g += `<option value="p:${cn}">CN ${nome2(cn)}${nm ? ' · ' + nm : ''}</option>`;
        }
        if (g) h += `<optgroup label="${n}º andar (salas reveladas)">${g}</optgroup>`;
      }
      if (sel.innerHTML !== h) sel.innerHTML = h;
      if (cfg.alvo && [...sel.options].some(o => o.value === cfg.alvo)) sel.value = cfg.alvo;
      else if (sel.options.length) { cfg.alvo = sel.value; }
    }
    function pintar() {
      $('#telaVista').value = cfg.vista; $('#telaCam').value = cfg.cam; $('#telaRes').value = cfg.res; $('#telaSom').checked = !!cfg.som;
      $('#telaAlvoL').hidden = cfg.cam !== 'escolher';
      $('#telaResL').hidden = cfg.vista !== '3d';
      const on = Date.now() - viva < 6000, st = $('#telaSt');
      const tx = on ? `● Tela conectada${info && info.w ? ` · ${info.w}×${info.h}` : ''}${info && info.v ? ` · ${info.v}` : ''}` : '○ Tela fechada';
      if (st.textContent !== tx) st.textContent = tx;
      st.classList.toggle('on', on);
      const av = $('#telaAviso'), aviso = cfg.cam === 'copiar' && on && info && info.bloq ? 'Câmera congelada na Tela: você está no Controle de um Filho ou na visão da criatura.' : '';
      if (av.textContent !== aviso) av.textContent = aviso;
      av.hidden = !aviso;
    }
    $('#btnTV').addEventListener('click', () => {
      // janela própria (arraste para a TV); noopener: ela não herda a sessão nem o login desta aba
      window.open(location.pathname + '?tv=1', '_blank', 'noopener,popup,width=1280,height=720');
    });
    $('#telaVista').addEventListener('change', e => { cfg.vista = e.target.value; salvar(); });
    $('#telaCam').addEventListener('change', e => { cfg.cam = e.target.value; if (cfg.cam === 'escolher') opcoesAlvo(); ultCam = ''; salvar(); });
    $('#telaAlvo').addEventListener('change', e => { cfg.alvo = e.target.value; salvar(); });
    $('#telaAlvo').addEventListener('focus', opcoesAlvo);
    $('#telaRes').addEventListener('change', e => { cfg.res = e.target.value; salvar(); });
    $('#telaSom').addEventListener('change', e => { cfg.som = e.target.checked; salvar(); });
    bc.onmessage = e => {
      const m = e.data || {};
      if (!ehM()) return;
      if (m.t === 'oi' || m.t === 'vivo') { viva = Date.now(); info = m; if (m.t === 'oi') { ultCam = ''; enviar(); } pintar(); }
    };
    opcoesAlvo(); pintar(); enviar();
    setInterval(() => { if (!ehM()) return; pintar(); if (cfg.cam === 'escolher' && document.activeElement !== $('#telaAlvo')) opcoesAlvo(); }, 2000);
    // câmera do Mestre para a Tela (só no modo "copia" e com a Tela aberta): até 30 vezes por segundo, só o que mudou
    setInterval(() => {
      if (cfg.cam !== 'copiar' || Date.now() - viva > 6000 || !ehM()) return;
      const S = window.Sala3D;
      if (S && S.aberta) {
        const c = S.camMundo; if (!c) return;
        if (!c.ok) { if (!bloqEnviado) { bc.postMessage({ t: 'cam3', bloq: true }); bloqEnviado = true; ultCam = ''; } return; }
        bloqEnviado = false;
        const k = JSON.stringify(c); if (k === ultCam) return; ultCam = k;
        bc.postMessage({ t: 'cam3', ...c });
      } else {
        const a = A(), c = { a: a.andarAtual, c: a.camera2D }, k = JSON.stringify(c); if (k === ultCam) return; ultCam = k;
        bc.postMessage({ t: 'cam2', ...c });
      }
    }, 33);
  }

  /* ---------- a janela da TV ---------- */
  function tela() {
    let cfg = ler(), cam3 = null, cam2 = null, abrindo = 0, rAt = 0, ult2 = '';
    const S = () => window.Sala3D;
    window.ACF_TELA = {
      get som() { return !!cfg.som; },
      get cfg() { return { ...cfg }; },
      // resolução do 3D: altura pedida dividida pela altura da janela (Nativa: a da tela)
      dpr(h) {
        if (cfg.res === 'nativa') return Math.min(3, devicePixelRatio || 1);
        const r = RES[cfg.res]; return r && h ? Math.max(.35, Math.min(3, r / h)) : 0;
      },
      get estado() { return { vista: cfg.vista, cam: cfg.cam, alvo: alvo(), cam3: !!(S() && S().camTela) }; }
    };
    const avisar = () => bc && bc.postMessage({ t: 'vivo', ...medida(), bloq: !!(cam3 && cam3.bloq) });
    function medida() {
      const s = S(), ren = s && s.aberta && s._api && s._api.ren;
      const w = ren ? ren.domElement.width : Math.round(innerWidth * (devicePixelRatio || 1)), h = ren ? ren.domElement.height : Math.round(innerHeight * (devicePixelRatio || 1));
      return { w, h, v: s && s.aberta ? '3D' : '2.5D' };
    }
    if (bc) {
      bc.onmessage = e => {
        const m = e.data || {};
        if (m.t === 'cfg' && m.cfg) {
          const res0 = cfg.res, som0 = cfg.som; cfg = { ...PAD, ...m.cfg };
          if (cfg.res !== res0 && S() && S().aberta) S().redimensionar();
          if (cfg.som !== som0) somAplicar();
          if (cfg.cam !== 'copiar' && S()) S().camTela = null;
          passo();
        }
        if (m.t === 'cam3') {
          if (m.bloq) { if (cam3) cam3.bloq = true; else cam3 = { bloq: true }; return; }   // congela na última
          cam3 = m;
          const s = S(); if (cfg.vista === '3d' && cfg.cam === 'copiar' && s && s.aberta && s.estado.a === m.a && A().podeVer(m.a)) s.camTela = m;
        }
        if (m.t === 'cam2') { cam2 = m; if (cfg.vista === '2d' && cfg.cam === 'copiar') passo(); }
      };
      bc.postMessage({ t: 'oi', ...medida() });
      setInterval(avisar, 2000);
    }

    // o que mostrar: andar e pontos da planta (em quadradinhos)
    function alvo() {
      const a = A(), tks = (a.estado || {}).tokens || {};
      if (cfg.cam === 'escolher' && cfg.alvo) {
        const [k, v] = cfg.alvo.split(':');
        if (k === 't') { const tk = tks[v]; if (tk && a.visivelPara(tk) && a.podeVer(tk.a)) return { a: tk.a, pts: [[tk.x, tk.y]], um: true }; }
        if (k === 'p') {
          const cn = +v, n = Math.ceil(cn / 25), p = cn - 25 * (n - 1);
          if (n >= 1 && n <= 5 && a.podeVer(n) && a.salaRevelada(cn)) { const r = a._int.retSala(p); return { a: n, pts: [[r.x + r.w / 2, r.y + r.h / 2]], sala: cn }; }
        }
      }
      const cob = Object.values(tks).filter(tk => ehCobaia(tk) && a.visivelPara(tk) && a.podeVer(tk.a));
      if (!cob.length) return { a: a.andarAtual || 1, pts: [] };
      const cont = {}; cob.forEach(tk => { cont[tk.a] = (cont[tk.a] || 0) + 1; });
      const atual = s3dAndar() || a.andarAtual;
      let melhor = +Object.entries(cont).sort((x, y) => y[1] - x[1])[0][0];
      if (cont[atual] && cont[atual] === cont[melhor]) melhor = atual;   // empate: fica onde está
      return { a: melhor, pts: cob.filter(tk => tk.a === melhor).map(tk => [tk.x, tk.y]) };
    }
    const s3dAndar = () => { const s = S(); return s && s.aberta && s.estado ? s.estado.a : 0; };

    function passo() {
      const a = A(); if (!a || !a.estado) return;
      if (cfg.vista === '3d') return passo3D();
      // ---------- 2.5D ----------
      const s = S(); if (s && s.aberta) s.fechar();
      if (cfg.cam === 'copiar' && cam2 && a.podeVer(cam2.a)) {
        if (a.andarAtual !== cam2.a) a.irAndar(cam2.a);
        const k = JSON.stringify(cam2.c); if (k !== ult2) { ult2 = k; a.camera2D = cam2.c; }
        return;
      }
      const al = alvo();
      if (a.andarAtual !== al.a) { a.irAndar(al.a); ult2 = ''; }
      if (!al.pts.length) return;
      const [cx, cy, sp] = centro(al.pts), esc = a.escalaInteira, vp = document.querySelector('#viewport');
      const larg = vp ? vp.clientWidth * .92 / (esc * a._int.T) : 60;
      const zoom = Math.max(1, Math.min(3.2, larg / (sp * 2 + (al.sala ? 8 : 14))));
      const k = [cx.toFixed(1), cy.toFixed(1), (esc * zoom).toFixed(3)].join();
      if (k !== ult2) { ult2 = k; a.focarPonto(cx, cy, esc * zoom); }
    }
    function centro(pts) {
      const cx = pts.reduce((t, p) => t + p[0], 0) / pts.length, cy = pts.reduce((t, p) => t + p[1], 0) / pts.length;
      const sp = Math.max(0, ...pts.map(p => Math.hypot(p[0] - cx, p[1] - cy)));
      return [cx, cy, sp];
    }
    function passo3D() {
      const a = A(), s = S(); if (!s) return;
      const copia = cfg.cam === 'copiar' && cam3 && cam3.p && a.podeVer(cam3.a);
      const al = copia ? null : alvo();
      const andar = copia ? cam3.a : al.a;
      // abrir (ou trocar de andar): espera a abertura terminar antes de mandar de novo
      if (abrindo && performance.now() - abrindo < 90000 && !(s.aberta && s._fundo && s._fundo() && !s._fundo().aquecendo)) return;
      abrindo = 0;
      if (!s.aberta || s.estado.a !== andar) {
        let cn = 25 * (andar - 1) + 25;
        const pt = copia ? null : al.pts[0];
        if (pt) { const p = a._int.salaEm(andar, pt[0], pt[1]); if (p) cn = 25 * (andar - 1) + p; }
        abrindo = performance.now(); rAt = 0;
        s.abrir(cn, { a: andar, livre: true });
        return;
      }
      if (copia) { if (!cam3.bloq || !s.camTela) s.camTela = cam3; return; }
      s.camTela = null;
      if (s.estado.cam.modo !== 'fora') s.modo('fora');
      if (!al.pts.length) return;
      const P = al.pts.map(([x, y]) => s._mapa.planta3D(andar, x, y)), [cx, cz, sp] = centro(P);
      const r = al.sala ? 13 : Math.max(11, Math.min(34, sp * 2.2 + 9));
      rAt = rAt ? rAt + (r - rAt) * .25 : r;
      s._cam({ ax: cx, az: cz, r: rAt });
    }
    setInterval(passo, 200);

    // som: só com a opção do Mestre (a TV toca pelo HDMI; o som do Mestre já sai no computador)
    function somAplicar() { try { A().mudoTela = !cfg.som; } catch (e) {} }
    somAplicar();
    // capa: um clique põe em tela cheia e libera o som; some sozinha
    const capa = document.createElement('div');
    capa.id = 'telaCapa';
    capa.innerHTML = '<b>📺 Modo Tela</b><span>Arraste esta janela para a TV e clique aqui para a tela cheia.</span><small>O Mestre comanda pelo bloco Mesa (aba Sessão).</small>';
    document.body.appendChild(capa);
    const tirar = () => { capa.classList.add('fora'); setTimeout(() => capa.remove(), 600); };
    capa.addEventListener('click', () => {
      try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {}
      try { if (S() && S().Som && S().Som.preparar) S().Som.preparar(); } catch (e) {}
      somAplicar(); tirar();
    });
    setTimeout(() => capa.classList.add('canto'), 9000);
    // cursor some parado
    let tq = 0;
    addEventListener('pointermove', () => { document.body.classList.remove('tela-quieta'); clearTimeout(tq); tq = setTimeout(() => document.body.classList.add('tela-quieta'), 2500); });
    document.body.classList.add('tela-quieta');
    addEventListener('resize', () => { if (S() && S().aberta) S().redimensionar(); });
  }
})();
