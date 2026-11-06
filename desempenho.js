/* desempenho.js · medidor de desempenho de cada aparelho e o cartão "Desempenho" do painel do Mestre
   - Cada aparelho (jogador, auxiliar, Mestre) mede o próprio desempenho e grava um resumo a cada 10 s em
     desemp/<chave> (chave = usuário + perfil). Só grava com a aba visível; com a aba oculta não mede nem grava.
   - O resumo: perfil e nome, 2D ou 3D, quadros por segundo (média e o pior segundo) dos últimos 10 s, travadas
     acima de 100 ms (quantas e a pior), degrau da qualidade automática, Modo Desempenho, resolução e pixel ratio,
     placa de vídeo, núcleos, memória, celular sim/não e o carimbo de hora. Mais o pior caso desde que a página abriu.
   - Só a tela do Mestre escuta o ramo (os jogadores só gravam o próprio). Entradas sem atualização há mais de 2 min
     aparecem como "offline"; as paradas há mais de 15 min são apagadas pelo Mestre.
   - O cartão "Desempenho" (aba Registro) mostra a lista ao vivo, alerta quando o FPS cai abaixo de 30 ou quando há
     travadas seguidas, e o resumo da sessão (pior caso de cada pessoa). */
(() => {
  'use strict';
  const A = () => window.ACF;
  const IMR = () => window.ACF_IMERSAO;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ls = { get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const ss = { get(k, p) { try { const v = sessionStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const agora = () => performance.now();
  const RAMO = 'desemp';
  const JANELA = 10000, OFF = 120000, VELHO = 900000;

  /* ================= medição neste aparelho ================= */
  const Med = {
    ap: null,              // vista 3D aberta (sala3d.js passa as peças pela extensão)
    q: 0, t0: 0,           // quadros contados no segundo corrente e quando ele começou
    seg: [],               // quadros por segundo de cada segundo cheio da janela
    trav: [],              // travadas (> 100 ms) da janela, em ms
    carencia: 0,           // até quando não mede (aba voltou a aparecer, página carregando)
    ultRaf: 0, lt: false,
    sess: { fm: null, fx: null, tp: 0, tv: 0, dg: 0, n: 0 },
    zerar(ms) { this.q = 0; this.t0 = agora(); this.seg = []; this.trav = []; this.carencia = agora() + (ms || 0); },
    // um quadro desenhado: no 3D conta o quadro da vista (respeita o limite de quadros das Opções); no 2D, o do navegador
    quadro(de3d) {
      if (!!this.ap !== !!de3d) return;
      const t = agora();
      if (t < this.carencia) { this.q = 0; this.t0 = t; return; }
      if (!this.t0) this.t0 = t;
      this.q++;
      const dt = t - this.t0;
      if (dt >= 1000) {
        // segundo fechado (um quadro que demorou mais de um segundo vira um segundo com um quadro só)
        const fps = Math.round(this.q * 1000 / dt * 10) / 10;
        this.seg.push(fps);
        if (this.seg.length > 12) this.seg.shift();
        // o segundo do 3D alimenta a qualidade automática (abaixo)
        if (de3d) { try { Qd.segundo(fps); } catch (e) {} }
        this.q = 0; this.t0 = t;
      }
    },
    travada(ms) { if (document.hidden || agora() < this.carencia) return; this.trav.push(Math.round(ms)); if (this.trav.length > 200) this.trav.shift(); },
    // laço próprio: conta os quadros do 2D e, sem o observador de long tasks, acha as travadas pelos buracos entre quadros
    raf() {
      const t = agora();
      if (!document.hidden) {
        if (!this.lt && this.ultRaf && t - this.ultRaf > 100 && t > this.carencia) this.travada(t - this.ultRaf - 16);
        this.quadro(false);
      }
      this.ultRaf = t;
      requestAnimationFrame(() => this.raf());
    },
    ligar() {
      try {
        if (window.PerformanceObserver && (PerformanceObserver.supportedEntryTypes || []).includes('longtask')) {
          new PerformanceObserver(l => { l.getEntries().forEach(e => { if (e.duration > 100) this.travada(e.duration); }); }).observe({ type: 'longtask' });
          this.lt = true;
        }
      } catch (e) { this.lt = false; }
      // a página acabou de abrir: os primeiros segundos (scripts, login) não contam
      this.zerar(3000);
      document.addEventListener('visibilitychange', () => { this.zerar(document.hidden ? 0 : 1500); this.ultRaf = 0; });
      requestAnimationFrame(() => this.raf());
    },
    // fecha a janela de 10 s: devolve o resumo e começa outra
    fechar() {
      const s = this.seg.slice(-10);
      if (s.length < 5) return null;   // pouco tempo medido (aba acabou de voltar)
      const fm = Math.round(s.reduce((a, x) => a + x, 0) / s.length), fx = Math.round(Math.min(...s));
      const tv = this.trav.length, tp = tv ? Math.max(...this.trav) : 0;
      this.seg = []; this.trav = [];
      const S = this.sess; S.n++;
      S.fm = S.fm === null ? fm : Math.min(S.fm, fm); S.fx = S.fx === null ? fx : Math.min(S.fx, fx);
      S.tp = Math.max(S.tp, tp); S.tv += tv;
      return { fm, fx, tv, tp };
    },
  };
  // a vista 3D avisa quando abre, a cada quadro e quando fecha
  (window.ACF3D = window.ACF3D || {}).vista = window.ACF3D.vista || [];
  window.ACF3D.vista.push({
    iniciar(ap) { Med.ap = ap; Med.zerar(2500); },
    quadro() { Med.quadro(true); },
    fechar() { Med.ap = null; Med.zerar(1500); },
  });

  /* ================= seletor de qualidade (Opções › Gráficos › Qualidade) =================
     Automático (padrão), Leve (tudo V1, Modo Desempenho, pixel ratio 1), Média (mapa V2 + personagens V3, criaturas
     na V1, efeitos médios) ou Alta (tudo: mapa V2, criaturas V2 e personagens V3).
     Guardado neste aparelho (acf-s3d-qualidade: 'auto' | 'baixa' | 'media' | 'alta'; 'baixa' é a Leve, nome antigo).
     O Automático decide pelo aparelho (computador: Alta; celular forte: Média; o resto: Leve) e, com o 3D aberto, desce
     UM degrau (Alta → Média → Leve) se o quadro ficar lento por QD_QUEDA segundos seguidos (fora das carências).
     Histerese: depois de descer, só volta a tentar o degrau de cima depois de QD_VOLTA de folga firme (e a subida
     vale na próxima abertura do 3D, sem trocar modelo com o jogo rodando), e a decisão fica guardada por 3 dias. */
  const QK = 'acf-s3d-qualidade', QA = 'acf-qualidade-auto';
  const NIV = { auto: -1, baixa: 0, leve: 0, media: 1, alta: 2 }, NOME = { leve: 'Leve', baixa: 'Leve', media: 'Média', alta: 'Alta' };
  const QD_QUEDA = 6, QD_FPS_BAIXO = 24, QD_VOLTA = 120, QD_FPS_ALTO = 50, QD_DIAS = 3 * 86400000;
  const Qd = {
    seq: [], baixo: 0, alto: 0, ap: null, ultSeg: 0,
    escolha() { const v = ls.get(QK, 'auto'); return NIV[v] !== undefined ? v : 'auto'; },
    definir(v) { ls.set(QK, NIV[v] !== undefined ? v : 'auto'); this.baixo = this.alto = 0; },
    // o aparelho dá conta da Alta? (sem medir nada ainda)
    aparelho() {
      const mem = navigator.deviceMemory || 0, nc = navigator.hardwareConcurrency || 0, cel = celular();
      const curto = Math.min(screen.width || innerWidth, screen.height || innerHeight);
      let alta, motivo;
      let n;
      if (mem && mem < 4) { n = 'leve'; motivo = `${mem} GB de memória`; }
      else if (nc && nc < 4) { n = 'leve'; motivo = `${nc} núcleos`; }
      else if (cel && ((mem && mem < 6) || (nc && nc < 6) || curto < 360)) { n = 'leve'; motivo = 'celular modesto'; }
      else if (cel) { n = 'media'; motivo = 'celular forte'; }
      else { n = 'alta'; motivo = 'computador'; }
      alta = n !== 'leve';
      return { n, alta, motivo, mem, nc, cel };
    },
    // o que o Automático decidiu (com a queda medida guardada por alguns dias)
    // (s.n: o teto depois de uma queda medida; nunca acima do que o aparelho pede)
    teto() { const s = ls.get(QA, null); return s && NIV[s.n] !== undefined && s.n !== 'baixa' && Date.now() - (+s.ts || 0) < QD_DIAS ? s.n : null; },
    auto() { const ap = this.aparelho().n, t = this.teto(); return t && NIV[t] < NIV[ap] ? t : ap; },
    efetiva() { const e = this.escolha(); return e === 'baixa' ? 'leve' : e === 'auto' ? this.auto() : e; },
    // mapa V2 e personagens V3 (cobaias, NPCs e as criaturas V3): Média e Alta. Criaturas V2 (pesadas): só a Alta.
    v2() { return this.efetiva() !== 'leve'; },
    modelosV2() { return this.efetiva() === 'alta'; },
    leve() { return this.efetiva() === 'leve'; },
    // perfil do 3D para sala3d.js: efeitos altos (sombras e resolução até 1,5) só no computador ou com a Alta escolhida
    perfil(cel) {
      const ef = this.efetiva(), manual = this.escolha() === 'alta';
      if (ef === 'leve') return { v2: false, alta: false, prMax: 1, leve: true };
      if (ef === 'media') return { v2: true, alta: false, prMax: 1.25, leve: false };
      return { v2: true, alta: manual || !cel, prMax: cel && !manual ? 1.25 : 1.5, leve: false };
    },
    desc() {
      const e = this.escolha(), ef = this.efetiva(), ap = this.aparelho();
      if (e !== 'auto') return `${NOME[ef]} escolhida à mão`;
      const caiu = NIV[ef] < NIV[ap.n];
      return `Automático: ${NOME[ef]} (${caiu ? `o 3D ficou lento aqui; tenta a ${NOME[ap.n === 'alta' && ef === 'leve' ? 'media' : ap.n]} de novo depois de um tempo fluido` : ap.motivo})`;
    },
    // um segundo fechado do 3D (desempenho.js já conta os quadros da vista)
    segundo(fps) {
      if (this.escolha() !== 'auto' || !this.ap || document.hidden) { this.baixo = this.alto = 0; return; }
      const foco = typeof document.hasFocus !== 'function' || document.hasFocus();
      const ef = this.efetiva();
      if (ef !== 'leve') {
        // fps de 1 a 3: é o navegador segurando os quadros (janela coberta, tela bloqueada, aba sem foco real), não peso
        // do jogo; não conta para a queda
        const segurado = fps <= 3;
        this.baixo = foco && !segurado && fps < QD_FPS_BAIXO ? this.baixo + 1 : (segurado ? this.baixo : 0);
        if (this.baixo >= QD_QUEDA) {
          // desce UM degrau já: Alta → Média (as criaturas V2 voltam para a V1); Média → Leve (mapa V2 e personagens
          // V3 saem, o Modo Desempenho liga)
          const novo = ef === 'alta' ? 'media' : 'leve';
          this.baixo = 0; this.alto = 0; ls.set(QA, { n: novo, ts: Date.now() });
          try { if (window.ACF3D && ACF3D.v2) ACF3D.v2.aplicarQualidade(); } catch (e) {}
          if (novo === 'leve') {
            try { if (window.ACF3D && ACF3D.mapaV2 && ACF3D.mapaV2.aplicarQualidade) ACF3D.mapaV2.aplicarQualidade(false); } catch (e) {}
            try { if (window.ACF3D && ACF3D.moveisV2 && ACF3D.moveisV2.aplicarQualidade) ACF3D.moveisV2.aplicarQualidade(false); } catch (e) {}
            try { if (this.ap && typeof this.ap.aplicarDesempenho === 'function') this.ap.aplicarDesempenho(); } catch (e) {}
          }
          avisarQ(`⚙ O 3D estava pesado neste aparelho: qualidade ${NOME[novo]}. Para voltar, Opções › Gráficos › Qualidade.`);
          return;
        }
      }
      // abaixo do que o aparelho pede por causa de uma queda: folga firme por bastante tempo libera tentar UM degrau
      // acima na próxima abertura
      if (NIV[ef] >= NIV[this.aparelho().n]) return;
      this.alto = fps >= QD_FPS_ALTO ? this.alto + 1 : 0;
      if (this.alto >= QD_VOLTA) { this.alto = 0; ls.set(QA, ef === 'leve' && this.aparelho().n === 'alta' ? { n: 'media', ts: Date.now() } : null); }
    },
  };
  function avisarQ(txt) { try { const a = A(); if (a && typeof a.aviso === 'function') a.aviso(txt); } catch (e) {} }
  window.ACF3D.vista.push({
    iniciar(ap) { Qd.ap = ap; Qd.baixo = Qd.alto = 0; },
    fechar() { Qd.ap = null; },
    // Opções › Gráficos: a escolha fica na predefinição do sala3d.js; aqui, o que o Automático decidiu e por quê
    opcoes(aba) { return aba === 'graficos' ? `<section><h4>Qualidade dos modelos</h4><p class="mini">${esc(Qd.desc())}. Alta: tudo novo (mapa V2, criaturas V2 e personagens V3). Média: mapa V2 e personagens V3, criaturas simples e efeitos médios. Leve: tudo simples e Modo Desempenho.</p></section>` : ''; },
  });
  window.ACF_QUALIDADE = Qd;

  /* ---------- o aparelho (uma vez) ---------- */
  function placa() {
    const c = ls.get('acf-desemp-gpu', null);
    if (c && typeof c === 'string') return c;
    let nome = '';
    try {
      const ren = Med.ap && Med.ap.ren, gl = ren ? ren.getContext() : document.createElement('canvas').getContext('webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        nome = String((ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '');
        if (!ren) { const lo = gl.getExtension('WEBGL_lose_context'); if (lo) lo.loseContext(); }
      }
    } catch (e) { nome = ''; }
    // "ANGLE (NVIDIA, NVIDIA GeForce RTX 2070 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)" → o nome da placa
    const m = nome.match(/^ANGLE \(([^,]*),\s*([^,(]*?)(?:\s+Direct3D.*|\s+\(0x[0-9a-f]+\).*|\s+OpenGL.*|\s+Vulkan.*)?(?:,.*)?\)$/i);
    nome = (m ? m[2] || m[1] : nome).replace(/\s+/g, ' ').trim().slice(0, 60);
    if (nome) ls.set('acf-desemp-gpu', nome);
    return nome;
  }
  const celular = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') || (Math.min(innerWidth, innerHeight) < 700 && matchMedia('(pointer: coarse)').matches);

  /* ---------- quem é este aparelho ---------- */
  function perfil() {
    const a = A(); if (!a || a.tv) return null;
    if (a.mestre) return { id: 'mestre', pf: 'mestre', n: 'Mestre' };
    const S = a.SER || {};
    if (a.aux) { const s = S[a.aux] || {}; return { id: 'aux-' + a.aux, pf: 'aux', n: ('Auxiliar · ' + (s.nome || a.aux)).slice(0, 40) }; }
    if (a.meu) { const s = S[a.meu] || {}; return { id: a.meu, pf: 'jog', n: ((s.nome || a.meu) + (s.jogador ? ' · ' + s.jogador : '')).slice(0, 40) }; }
    return null;
  }
  function uid() {
    const a = A(), St = a && a._int && a._int.Store;
    if (!a || !a.firebase) return 'local';
    const u = St && St.auth && St.auth.currentUser;
    return u ? u.uid : '';
  }
  const limpa = s => String(s).replace(/[.#$/\[\]]/g, '_').slice(0, 60);
  let chaveAnt = '';

  function registro(r, pf) {
    const ap = Med.ap, Q = IMR() && IMR().Qual;
    const ren = ap && ap.ren;
    const pr = ren ? ren.getPixelRatio() : (window.devicePixelRatio || 1);
    const w = ren ? ren.domElement.width : Math.round(innerWidth * (window.devicePixelRatio || 1)), h = ren ? ren.domElement.height : Math.round(innerHeight * (window.devicePixelRatio || 1));
    const cfg = ls.get('acf-s3d-cfg', {}) || {};
    const md = ap && typeof ap.leve === 'function' ? !!ap.leve() : cfg.desempenho === true;
    const dg = ap && Q && Q.aplicado !== null && Q.aplicado !== undefined ? Q.aplicado : -1;
    if (dg > Med.sess.dg) Med.sess.dg = dg;
    const S = Med.sess;
    return {
      n: pf.n, pf: pf.pf, id: pf.id, v: ap ? '3d' : '2d',
      fm: r.fm, fx: r.fx, tv: r.tv, tp: r.tp, dg, md, mda: !md && cfg.desempenho !== false && cfg.desempenho !== true,
      res: w + 'x' + h, pr: Math.round(pr * 100) / 100, q: Qd.escolha(), qe: Qd.efetiva(),
      gpu: placa(), nc: navigator.hardwareConcurrency || 0, mem: navigator.deviceMemory || 0, cel: celular(),
      ts: Date.now(),
      s: { fm: S.fm, fx: S.fx, tp: S.tp, tv: S.tv, dg: S.dg },
    };
  }
  async function gravar() {
    if (document.hidden) { Med.zerar(0); return; }
    const pf = perfil(), r = Med.fechar();
    if (!pf || !r) return;
    const a = A(); if (!a || !a.Rede) return;
    try { await a.garantirLogin(); } catch (e) { return; }
    const u = uid(); if (!u) return;
    const k = limpa(u + '_' + pf.id);
    if (chaveAnt && chaveAnt !== k) a.Rede.set(RAMO + '/' + chaveAnt, null).catch(() => {});
    chaveAnt = k;
    a.Rede.set(RAMO + '/' + k, registro(r, pf)).catch(() => {});
  }

  /* ================= cartão "Desempenho" (só o Mestre) ================= */
  const Pn = {
    off: null, dados: {}, chegou: {}, res: ss.get('acf-desemp-res', {}), tm: 0, ultDesenho: 0, ultLimpa: 0,
    ligar() {
      const a = A(), quer = !!(a && a.mestre && $('#blocoDesemp'));
      if (quer && !this.off) this.off = a.Rede.on(RAMO, v => this.receber(v || {}), () => { this.off = null; });
      if (!quer && this.off) { this.off(); this.off = null; this.dados = {}; }
    },
    receber(v) {
      const t = Date.now();
      Object.entries(v).forEach(([k, r]) => {
        if (!r || typeof r !== 'object') return;
        const ant = this.dados[k];
        // a idade conta pelo relógio desta tela (o relógio de cada aparelho pode estar adiantado ou atrasado)
        if (!ant || ant.ts !== r.ts) this.chegou[k] = ant ? t : Math.min(t, r.ts || t);
        this.somar(k, r);
      });
      Object.keys(this.dados).forEach(k => { if (!v[k]) delete this.chegou[k]; });
      this.dados = v;
      this.agendar();
    },
    // pior caso da sessão por pessoa (fica nesta aba até "Zerar")
    somar(k, r) {
      const o = this.res[k] || (this.res[k] = { n: r.n, fm: null, fx: null, tp: 0, tv: 0, dg: -1, v3: false, t0: Date.now() });
      const s = r.s || {};
      const min = (a, b) => (a === null || a === undefined) ? b : (b === null || b === undefined) ? a : Math.min(a, b);
      o.n = r.n; o.fm = min(min(o.fm, r.fm), s.fm); o.fx = min(min(o.fx, r.fx), s.fx);
      o.tp = Math.max(o.tp || 0, r.tp || 0, s.tp || 0); o.tv = Math.max(o.tv || 0, s.tv || 0);
      o.dg = Math.max(o.dg ?? -1, r.dg ?? -1, s.dg ?? -1); if (r.v === '3d') o.v3 = true;
      o.ult = Date.now();
      ss.set('acf-desemp-res', this.res);
    },
    agendar() {
      if (this.tm) return;
      const falta = Math.max(0, 1500 - (Date.now() - this.ultDesenho));
      this.tm = setTimeout(() => { this.tm = 0; this.desenhar(); }, falta);
    },
    estado(r, idade) {
      if (idade > OFF) return 'off';
      if (r.fm < 30 || r.tv >= 3) return 'alerta';
      if (r.fx < 30 || r.tv >= 1) return 'leve';
      return 'ok';
    },
    desenhar() {
      this.ultDesenho = Date.now();
      const b = $('#blocoDesemp'); if (!b) return;
      const lista = $('#desempLista', b), resumo = $('#desempResumo', b); if (!lista || !resumo) return;
      const t = Date.now();
      const linhas = Object.entries(this.dados).map(([k, r]) => {
        const idade = t - (this.chegou[k] || r.ts || 0);
        return { k, r, idade, st: this.estado(r, idade) };
      });
      const peso = { alerta: 0, leve: 1, ok: 2, off: 3 };
      linhas.sort((x, y) => peso[x.st] - peso[y.st] || (x.r.fm || 0) - (y.r.fm || 0) || String(x.r.n).localeCompare(String(y.r.n)));
      const html = linhas.length ? linhas.map(({ k, r, idade, st }) => {
        const quando = idade < 60000 ? `há ${Math.max(0, Math.round(idade / 1000))} s` : `há ${Math.round(idade / 60000)} min`;
        const pf = r.pf === 'mestre' ? 'Mestre' : r.pf === 'aux' ? 'auxiliar' : 'jogador';
        const dg = r.v === '3d' && r.dg >= 0 ? `degrau ${r.dg}` : '';
        const md = r.md ? 'Modo Desempenho ligado' : r.mda ? 'Modo Desempenho automático' : 'Modo Desempenho desligado';
        const ql = r.qe ? `qualidade ${r.qe === 'alta' ? 'Alta' : 'Leve'}${r.q === 'auto' ? ' (automática)' : ''}` : '';
        const det = [`${r.res || '?'} · pixel ratio ${String(r.pr ?? '?').replace('.', ',')}`, r.gpu || 'placa desconhecida', r.nc ? r.nc + ' núcleos' : '', r.mem ? r.mem + ' GB' : '', r.cel ? 'celular' : 'computador', ql, md].filter(Boolean).join(' · ');
        return `<li class="dsp-li dsp-${st}" data-k="${esc(k)}">
          <div class="dsp-topo"><b class="dsp-nome">${esc(r.n || k)}</b><span class="dsp-tag">${r.v === '3d' ? '3D' : '2D'}</span><span class="dsp-pf">${pf}</span><span class="dsp-idade">${st === 'off' ? 'offline · ' : ''}${quando}</span></div>
          <div class="dsp-num"><span class="dsp-fps"><b>${r.fm ?? '?'}</b> FPS</span><span>mín ${r.fx ?? '?'}</span><span class="dsp-tv">${r.tv ? `${r.tv} travada${r.tv > 1 ? 's' : ''} · pior ${r.tp} ms` : 'sem travadas'}</span>${dg ? `<span>${dg}</span>` : ''}</div>
          <div class="dsp-det">${esc(det)}</div></li>`;
      }).join('') : '<li class="dsp-vazio">Nenhum aparelho mandou medição ainda. Cada tela aberta manda a sua a cada 10 s.</li>';
      if (lista.dataset.h !== html) { lista.innerHTML = html; lista.dataset.h = html; }
      // resumo da sessão: o pior caso de cada pessoa
      const rs = Object.entries(this.res).sort((x, y) => (x[1].fx ?? 999) - (y[1].fx ?? 999));
      const hr = rs.length ? rs.map(([k, o]) => {
        const ruim = (o.fx !== null && o.fx < 30) || o.tp > 250 || o.tv >= 10;
        return `<li class="${ruim ? 'dsp-r-alerta' : ''}"><b>${esc(o.n || k)}</b><span>pior segundo ${o.fx ?? '?'} FPS</span><span>pior média ${o.fm ?? '?'} FPS</span><span>${o.tv || 0} travada${o.tv === 1 ? '' : 's'}${o.tp ? `, a pior de ${o.tp} ms` : ''}</span>${o.v3 && o.dg >= 0 ? `<span>degrau máx. ${o.dg}</span>` : ''}</li>`;
      }).join('') : '<li class="dsp-vazio">Sem medições nesta sessão.</li>';
      if (resumo.dataset.h !== hr) { resumo.innerHTML = hr; resumo.dataset.h = hr; }
      // entradas paradas há muito tempo saem do banco (a cada minuto, no máximo)
      if (t - this.ultLimpa > 60000) {
        this.ultLimpa = t;
        linhas.forEach(({ k, r, idade }) => { if (idade > VELHO && t - (r.ts || 0) > VELHO) A().Rede.set(RAMO + '/' + k, null).catch(() => {}); });
      }
    },
    zerarResumo() { this.res = {}; ss.set('acf-desemp-res', {}); Object.entries(this.dados).forEach(([k, r]) => { if (Date.now() - (this.chegou[k] || 0) < OFF) this.somar(k, { ...r, s: {} }); }); this.desenhar(); },
  };
  document.addEventListener('click', e => { if (e.target.closest('[data-dsp="zerar"]')) Pn.zerarResumo(); });

  /* ================= arquivos guardados neste aparelho (sw.js): a 2ª sessão abre o 3D sem baixar de novo ================= */
  function versoesEmUso() {
    const urls = [...document.querySelectorAll('script[src], link[rel="stylesheet"][href]')].map(e => e.src || e.href)
      .filter(u => u && u.startsWith(location.origin) && /[?&]v=/.test(u));
    // andares3d.js e filhos3d.js baixam com a mesma versão do sala3d.js (só quando alguém abre o 3D)
    const s3 = urls.find(u => /\/sala3d\.js\?/.test(u));
    if (s3) ['andares3d.js', 'filhos3d.js'].forEach(f => urls.push(new URL(f + '?' + s3.split('?')[1], location.href).href));
    // modelos V2 (tokens3d.js): a versão atual de cada .glb; as velhas saem do cache do aparelho
    try { if (window.ACF3D && ACF3D.v2) urls.push(...ACF3D.v2.urls()); } catch (e) {}
    return urls;
  }
  function registrarSW() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
    navigator.serviceWorker.ready.then(r => { if (r.active) r.active.postMessage({ t: 'versoes', urls: versoesEmUso() }); }).catch(() => {});
  }


  /* ================= instalar o jogo (PWA) =================
     Botão discreto no topo (todas as telas: Mestre, auxiliar e jogador), no menu ☰ do 3D e em Opções › Gráficos.
     Chrome, Edge e Android: o pedido do próprio navegador (beforeinstallprompt). iPhone/iPad (Safari): a instrução
     "Compartilhar › Adicionar à Tela de Início". Já instalado (aberto como app) ou sem como instalar: o botão some. */
  const Inst = {
    pedido: null,
    instalado() { try { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true; } catch (e) { return false; } },
    ios() { const u = navigator.userAgent || ''; return /iPhone|iPad|iPod/i.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1); },
    pode() { return !this.instalado() && (!!this.pedido || this.ios()); },
    botao() {
      let b = $('#btnInstalar');
      if (!b) {
        const ref = $('#btnAjuda'); if (!ref || !ref.parentElement) return;
        b = document.createElement('button'); b.id = 'btnInstalar'; b.type = 'button'; b.className = 'btn-fantasma btn-icone';
        b.title = 'Instalar o jogo neste aparelho (abre como aplicativo, em tela cheia)'; b.setAttribute('aria-label', 'Instalar o jogo'); b.textContent = '⤓';
        b.addEventListener('click', () => this.instalar());
        ref.parentElement.insertBefore(b, ref);
      }
      b.hidden = !this.pode();
    },
    async instalar() {
      if (this.instalado()) return;
      if (this.pedido) {
        const p = this.pedido; this.pedido = null;
        try { p.prompt(); const r = await p.userChoice; if (r && r.outcome === 'accepted') avisarQ('Instalando o jogo… Ele aparece com os seus aplicativos.'); } catch (e) {}
        this.botao(); return;
      }
      if (this.ios()) this.instrucaoIos();
    },
    instrucaoIos() {
      let m = $('#instIos');
      if (!m) {
        m = document.createElement('div'); m.id = 'instIos'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Instalar no iPhone');
        m.style.cssText = 'position:fixed;inset:0;z-index:100000;display:grid;place-items:end center;background:rgba(0,0,0,.55);padding:16px;padding-bottom:max(16px,env(safe-area-inset-bottom))';
        m.innerHTML = `<div style="max-width:420px;width:100%;background:#14111c;color:#eee6f7;border:1px solid #3b2f55;border-radius:14px;padding:16px 16px 12px;font:15px/1.45 system-ui,sans-serif">
          <b style="display:block;font-size:16px;margin-bottom:6px">Instalar o jogo no iPhone</b>
          <ol style="margin:0 0 10px 18px;padding:0"><li>Toque em <b>Compartilhar</b> (o quadrado com a seta para cima, na barra do Safari).</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>. O jogo abre em tela cheia pelo ícone.</li></ol>
          <p style="margin:0 0 10px;font-size:13px;opacity:.75">Só funciona pelo Safari.</p>
          <button type="button" data-inst-x style="width:100%;min-height:44px;border-radius:10px;border:1px solid #5b4785;background:#2a2140;color:#fff;font-size:15px">Entendi</button></div>`;
        m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-inst-x]')) m.remove(); });
        document.body.appendChild(m);
      }
      const x = m.querySelector('[data-inst-x]'); if (x) x.focus();
    },
    ligar() {
      addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.pedido = e; this.botao(); });
      addEventListener('appinstalled', () => { this.pedido = null; this.botao(); });
      try { matchMedia('(display-mode: standalone)').addEventListener('change', () => this.botao()); } catch (e) {}
      this.botao();
    },
  };
  window.ACF3D.vista.push({
    menu(add) { if (Inst.pode()) add('⤓', 'Instalar o jogo', () => Inst.instalar(), 'abre como aplicativo'); },
    opcoes(aba) { return aba === 'graficos' && Inst.pode() ? '<section><h4>Aplicativo</h4><div class="s3d-op"><button type="button" data-inst="instalar">⤓ Instalar o jogo neste aparelho</button></div><p class="mini">Abre como aplicativo, em tela cheia, e guarda os arquivos para a próxima sessão abrir rápido.</p></section>' : ''; },
  });
  document.addEventListener('click', e => { if (e.target.closest('[data-inst="instalar"]')) Inst.instalar(); });
  // já ao carregar: o navegador pode oferecer a instalação antes de o site terminar de abrir
  Inst.ligar();

  /* ---------- partida ---------- */
  function iniciar() {
    if (!window.ACF || !window.ACF.Rede) { setTimeout(iniciar, 300); return; }
    Med.ligar();
    setInterval(() => { gravar().catch(() => {}); }, JANELA);
    // o cartão: liga com o perfil do Mestre; a idade ("há X s" e "offline") anda sozinha
    Pn.ligar();
    document.addEventListener('acf-perfil', () => setTimeout(() => { Pn.ligar(); Med.zerar(1500); }, 300));
    setInterval(() => { if (Pn.off && !document.hidden) Pn.desenhar(); }, 15000);
    Pn.desenhar();
  }
  iniciar();
  // o cache entra depois que a página terminou de abrir (não disputa a primeira pintura)
  if (document.readyState === 'complete') setTimeout(registrarSW, 1500); else addEventListener('load', () => setTimeout(registrarSW, 1500));
  window.ACF_DESEMP = { Med, Pn, gravar, perfil, versoesEmUso, Qd, Inst };
})();
