/* qol.js · qualidade de vida para jogadores, mestres auxiliares e Mestre
   Só interface e dados guardados NESTE aparelho (localStorage / IndexedDB). Nenhum caminho novo no servidor:
   o que grava usa as mesmas funções que o site já usa para o mesmo fim (rolagem da ficha, chat, restaurar backup).
   Desempenho: nenhum laço por quadro; um único "keydown" delegado (e a mesma função dentro do 3D, pela extensão
   da vista); um único ouvinte do estado (o evento "acf-tudo", que o site já dispara), com folga de 300 ms e só
   quando alguma peça está à vista; o conteúdo de cada cartão é montado só quando ele é aberto.
   Jogadores: ficha rápida, ações por perto (3D), lembrete de vez, rolagem com um toque, mapa mental, modo só mapa,
              retomar a tela ao recarregar.
   Auxiliares: troca rápida do controlado (1 a 9), recargas das características, frases rápidas, painel do
              controlado (estado, alvo, distância), Agora, busca, macros, desfazer ações e retrato da sessão
              (o que a conta dos auxiliares grava: estado da cena e do jogo; segredos e configuração ficam de fora).
   Mestre:    Agora, macros, desfazer ações, busca universal (Ctrl+K) e retrato da sessão. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ls = {
    get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const semAc = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const pad2 = n => String(n).padStart(2, '0');
  const agora = () => Date.now();
  const hora = ts => { const d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
  const dataC = ts => { const d = new Date(ts); return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1); };
  const A = () => window.ACF;
  const body = document.body;
  const toque = () => matchMedia('(pointer: coarse)').matches;
  const perfil = () => { const a = A(); if (!a) return ''; return a.mestre ? 'mestre' : a.aux ? 'aux' : a.meu ? 'jog' : ''; };
  const ehJog = () => perfil() === 'jog', ehAux = () => perfil() === 'aux', ehMestre = () => perfil() === 'mestre', ehGM = () => ehMestre() || ehAux();
  const s3dAberto = () => !!(window.Sala3D && Sala3D.aberta);
  const tokens = () => ((A() || {}).estado || {}).tokens || {};
  const SER = id => ((A() || {}).SER || {})[id] || null;
  const aviso = t => { try { if (s3dAberto() && Sala3D._api && Sala3D._api.toast) Sala3D._api.toast(t); else A().aviso(t); } catch (e) {} };
  const rot = tk => { try { return A().rotulo(tk); } catch (e) { return (SER(tk && tk.s) || {}).nome || '?'; } };
  const emCampo = el => !!(el && el.matches && el.matches('input, textarea, select, [contenteditable="true"]'));

  /* =========================================================
     INFRA: um ouvinte do estado, com folga; peças que querem ser avisadas
     ========================================================= */
  const pecas = [];   // { ativo(): bool, atualizar() }
  let tEstado = 0;
  const aoEstado = () => {
    if (tEstado) return;
    tEstado = setTimeout(() => {
      tEstado = 0;
      if (document.hidden) return;
      for (const p of pecas) { try { if (p.ativo()) p.atualizar(); } catch (e) { console.warn('qol:', e); } }
    }, 300);
  };
  document.addEventListener('acf-tudo', aoEstado);
  document.addEventListener('acf-ativa', aoEstado);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) aoEstado(); });

  // uma janelinha flutuante (sob demanda; reaproveitada)
  function janela(id, cls) {
    let j = document.getElementById(id);
    if (!j) {
      j = document.createElement('div'); j.id = id; j.className = 'qol-jan ' + (cls || ''); j.hidden = true;
      j.setAttribute('role', 'dialog');
      (s3dAberto() && $('#s3d') ? $('#s3d') : body).appendChild(j);
    }
    // dentro do 3D a janela mora no #s3d (fica por cima e o teclado do jogo continua valendo)
    const alvo = s3dAberto() && $('#s3d') ? $('#s3d') : body;
    if (j.parentElement !== alvo) alvo.appendChild(j);
    return j;
  }

  /* =========================================================
     1 + 4. FICHA RÁPIDA (jogador): PV, SAN, PE, condições e rolagem com um toque
     ========================================================= */
  const ATRS = [['agi', 'AGI', 'Agilidade'], ['for', 'FOR', 'Força'], ['int', 'INT', 'Intelecto'], ['pre', 'PRE', 'Presença'], ['vig', 'VIG', 'Vigor']];
  const FIXAS = ['iniciativa', 'percepcao', 'fortitude', 'reflexos', 'vontade'];
  const Ficha = {
    aberta: false, ultima: null,
    dados() {
      const FX = window.ACF_FICHAS; const at = FX && FX.ativa ? FX.ativa() : null;
      if (!at || !at.d) return null;
      const d = at.d, r = at.r, v = FX.vitaisDe ? FX.vitaisDe(d) : {};
      return { d, r, v };
    },
    pilulaHtml() {
      const x = this.dados(); if (!x) return '<span class="qol-pil-v">📋 Ficha</span>';
      const v = x.v; const p = (a, m) => Math.max(0, Math.min(100, m ? a / m * 100 : 0)).toFixed(0);
      const conds = this.conds();
      return `<span class="qol-pil-v qol-pv" style="--p:${p(v.pv, v.pvM)}%"><i aria-hidden="true">❤</i>${v.pv}</span>` +
        (v.det ? `<span class="qol-pil-v qol-pe" style="--p:${p(v.pd, v.pdM)}%"><i aria-hidden="true">✦</i>${v.pd}</span>` :
          `<span class="qol-pil-v qol-san" style="--p:${p(v.san, v.sanM)}%"><i aria-hidden="true">🧠</i>${v.san}</span><span class="qol-pil-v qol-pe" style="--p:${p(v.pe, v.peM)}%"><i aria-hidden="true">✦</i>${v.pe}</span>`) +
        (conds.length ? `<span class="qol-pil-c" title="${esc(conds.map(c => c.n).join(', '))}">${conds.slice(0, 3).map(c => c.i).join('')}${conds.length > 3 ? '+' : ''}</span>` : '');
    },
    conds() {
      const a = A(); if (!a || !a.meu || !a.condicoesVisiveis) return [];
      try { return a.condicoesVisiveis(a.meu).map(k => ({ k, i: (a.COND[k] || {}).i || '•', n: (a.COND[k] || {}).n || k })); } catch (e) { return []; }
    },
    html() {
      const x = this.dados();
      if (!x) return `<header class="qol-jan-cab"><b>📋 Ficha rápida</b><button type="button" class="qol-x" data-qf="x" aria-label="Fechar">✕</button></header>
        <p class="qol-vazio">Nenhuma ficha ativa neste aparelho. Abra as Fichas (F) e escolha a sua.</p>
        <div class="qol-linha"><button type="button" class="qol-bt" data-qf="abrir">📋 Abrir as fichas</button></div>`;
      const { d, r, v } = x, FX = window.ACF_FICHAS;
      const barra = (k, n, a, m) => `<div class="qol-vit qol-${k}"><b>${n}</b><span class="qol-barra"><i style="width:${Math.max(0, Math.min(100, m ? a / m * 100 : 0)).toFixed(0)}%"></i></span><output>${a}<small>/${m}</small></output></div>`;
      const vits = barra('pv', 'PV', v.pv, v.pvM) + (v.det ? barra('pe', 'PD', v.pd, v.pdM) : barra('san', 'SAN', v.san, v.sanM) + barra('pe', 'PE', v.pe, v.peM));
      const conds = this.conds();
      const PER = FX.PER || {};
      const pers = [...new Set(FIXAS.concat(Object.keys(PER).filter(id => (parseInt(((d.per || {})[id] || {}).t, 10) || 0) > 0)))].filter(id => PER[id]);
      const bon = id => { try { return r.bonus(id); } catch (e) { return 0; } };
      const sinal = n => (n >= 0 ? '+' : '−') + Math.abs(n);
      const ult = this.ultima;
      return `<header class="qol-jan-cab"><b>📋 ${esc(d.nome || 'Ficha')}</b><small>NEX ${esc(v.nex != null ? v.nex + '%' : '?')} · Def ${esc(r.defesa != null ? r.defesa : '?')}</small><button type="button" class="qol-x" data-qf="x" aria-label="Fechar">✕</button></header>
        <div class="qol-vits">${vits}</div>
        <div class="qol-conds">${conds.length ? conds.map(c => `<span class="qol-chip"><i aria-hidden="true">${c.i}</i>${esc(c.n)}</span>`).join('') : '<span class="qol-chip qol-ok">sem condições</span>'}</div>
        <p class="qol-sub">Toque para rolar · vai para o chat como na ficha</p>
        <div class="qol-rol qol-atr">${ATRS.map(([k, s, n]) => `<button type="button" data-qr-atr="${k}" title="Rolar ${n}"><b>${s}</b><small>${parseInt((d.atr || {})[k], 10) || 0}</small></button>`).join('')}</div>
        <div class="qol-rol qol-per">${pers.map(id => `<button type="button" data-qr-per="${id}"><span>${esc(PER[id][1])}</span><b>${sinal(bon(id))}</b></button>`).join('')}</div>
        <div class="qol-res" aria-live="polite">${ult ? `<b>${esc(ult.nome)}</b> <span class="qol-total">${ult.total}</span> <small>${esc(ult.det)}</small>` : ''}</div>
        <div class="qol-linha"><button type="button" class="qol-bt" data-qf="abrir">📋 Ficha completa</button>${s3dAberto() && A().abrirMochila ? '<button type="button" class="qol-bt" data-qf="mochila">🎒 Mochila</button>' : ''}</div>`;
    },
    abrir() {
      if (!ehJog()) return;
      const j = janela('qolFicha', 'qol-ficha');
      this.aberta = true; this.desenhar(true); j.hidden = false;
      if (document.pointerLockElement) document.exitPointerLock();
      if (!j.dataset.lig) {
        j.dataset.lig = '1';
        j.addEventListener('click', e => {
          const b = e.target.closest('button'); if (!b) return;
          if (b.dataset.qf === 'x') return this.fechar();
          if (b.dataset.qf === 'abrir') { this.fechar(); if (s3dAberto() && document.pointerLockElement) document.exitPointerLock(); window.ACF_FICHAS && ACF_FICHAS.abrirAtiva(); return; }
          if (b.dataset.qf === 'mochila') { this.fechar(); A().abrirMochila(); return; }
          if (b.dataset.qrAtr) return this.rolar('atr', b.dataset.qrAtr);
          if (b.dataset.qrPer) return this.rolar('per', b.dataset.qrPer);
        });
      }
    },
    fechar() { this.aberta = false; const j = $('#qolFicha'); if (j) j.hidden = true; },
    alternar() { if (this.aberta) this.fechar(); else this.abrir(); },
    desenhar(forcar) {
      const j = $('#qolFicha'); if (!j || (!this.aberta && !forcar)) return;
      const h = this.html(); if (j.dataset.h !== h) { j.innerHTML = h; j.dataset.h = h; }
    },
    // mesma conta e o mesmo texto do botão da ficha ("Em jogo"): teste com a ficha ativa, posta no chat
    rolar(tipo, id) {
      const FX = window.ACF_FICHAS, a = A(); const x = this.dados(); if (!x || !FX) return;
      let t, nome;
      if (tipo === 'per') { t = FX.testarAtiva(id); nome = (FX.PER[id] || [])[1] || id; }
      else {
        const n = parseInt((x.d.atr || {})[id], 10) || 0; t = FX.rolarTeste(n, 0); t.pen = [];
        nome = (ATRS.find(z => z[0] === id) || [])[2] || id;
      }
      if (!t) return;
      const pen = t.pen && t.pen.length ? '; ' + t.pen.map(p => `${p.n}d20 ${p.fonte}`).join(', ') : '';
      const det = `${t.dados.length}d20: ${t.dados.join(', ')}${t.desv ? ', menor' : ''}; ${t.bonus >= 0 ? '+' : '−'}${Math.abs(t.bonus)}${pen}${t.treino ? '; +' + t.treino + ' (1d6)' : ''}`;
      try { a.rolagemDaFicha(`${nome}: ${t.total} (${det})`, id === 'iniciativa' ? t.total : undefined, t.dados, t.bonus); } catch (e) {}
      this.ultima = { nome, total: t.total, det };
      this.desenhar();
      try { navigator.vibrate && navigator.vibrate(25); } catch (e) {}
    }
  };
  pecas.push({ ativo: () => Ficha.aberta, atualizar: () => { const sg = sigFicha(); if (Ficha.sg === sg) return; Ficha.sg = sg; Ficha.desenhar(); } });

  /* =========================================================
     3. LEMBRETE DE VEZ (perseguição / encontro, que já usam a mesma ordem)
     ========================================================= */
  const Vez = {
    el: null, sig: '', desde: 0, mov: null, pulsou: false,
    atualizar() {
      const a = A(); if (!a) return;
      const P = (a.estado || {}).persg || {};
      const ordem = P.on && P.ordem ? Object.values(P.ordem) : [];
      const meu = ehJog() || ehAux();
      if (!meu || !ordem.length) return this.mostrar('');
      const i = P.vez || 0, vez = (ordem[i] || {}).id, prox = (ordem[(i + 1) % ordem.length] || {}).id;
      const tks = tokens(), pode = id => { const tk = tks[id]; try { return !!(tk && a.podeMover(tk)); } catch (e) { return false; } };
      let txt = '', cls = '';
      if (vez && pode(vez)) {
        // a faixa da perseguição e o aviso do site já dizem "Sua vez": aqui só o lembrete de quem ficou parado
        const tk = tks[vez], lim = a.limiteDe ? a.limiteDe(vez) : null, m = (tk && tk.m) || 0;
        const sig = `${P.rod}:${i}:${vez}`;
        if (sig !== this.sig) { this.sig = sig; this.desde = agora(); this.mov = m; this.pulsou = false; this.ate = 0; }
        else if (m !== this.mov) { this.mov = m; this.desde = agora(); this.ate = 0; }
        const parado = agora() - this.desde;
        // 40 s na vez sem andar: um lembrete calmo por 8 s (sem som; vibra de leve)
        if (!this.pulsou && parado > 40000) { this.pulsou = true; this.ate = agora() + 8000; try { navigator.vibrate && navigator.vibrate(60); } catch (e) {} clearTimeout(this.tm); this.tm = setTimeout(aoEstado, 8100); }
        else if (parado <= 40000) { clearTimeout(this.tm); this.tm = setTimeout(aoEstado, 40500 - parado); }
        if (this.ate > agora()) { txt = `⏳ ${vez === a.meu ? 'Ainda é a sua vez' : 'Ainda é a vez de ' + esc(rot(tk))} · rodada ${P.rod || 1}${lim ? ` · ${esc(a.fmtM ? a.fmtM(m) : m.toFixed(1))} de ${lim} m` : ''}`; cls = 'qol-vez-minha qol-pulsa'; }
      } else if (prox && pode(prox)) {
        txt = `⏭ ${prox === a.meu ? 'Você é o próximo' : esc(rot(tks[prox])) + ' é o próximo'} · agora: ${vez ? esc(a.visivelPara(tks[vez]) ? rot(tks[vez]) : '???') : '?'}`;
        cls = 'qol-vez-prox'; this.sig = '';
      } else this.sig = '';
      this.mostrar(txt, cls);
    },
    mostrar(txt, cls) {
      if (!txt) { if (this.el) this.el.hidden = true; return; }
      if (!this.el) { this.el = document.createElement('div'); this.el.id = 'qolVez'; this.el.className = 'qol-vez'; this.el.setAttribute('role', 'status'); this.el.setAttribute('aria-live', 'polite'); }
      const alvo = s3dAberto() && $('#s3d') ? $('#s3d') : body; if (this.el.parentElement !== alvo) alvo.appendChild(this.el);
      if (this.el.dataset.h !== txt) { this.el.innerHTML = txt; this.el.dataset.h = txt; }
      this.el.className = 'qol-vez ' + (cls || ''); this.el.hidden = false;
    }
  };
  pecas.push({ ativo: () => ehJog() || ehAux() || (Vez.el && !Vez.el.hidden), atualizar: () => Vez.atualizar() });

  /* =========================================================
     5. MAPA MENTAL: anotações pessoais em salas já visitadas (só neste aparelho, só o jogador vê)
     ========================================================= */
  const Mapa = {
    chave: () => 'acf-qol-mapa-' + (A() && A().meu || ''),
    todas() { return ls.get(this.chave(), {}) || {}; },
    visitadas() { try { return new Set(JSON.parse(localStorage.getItem('acf-visitadas-' + A().meu) || '[]')); } catch (e) { return new Set(); } },
    gravar(cn, txt) { const t = this.todas(); txt = String(txt || '').trim().slice(0, 400); if (txt) t['c' + cn] = { t: txt, ts: agora() }; else delete t['c' + cn]; ls.set(this.chave(), t); this.marcar(true); desenharBloco('blocoQolMapa'); try { A().redesenharCartao(); } catch (e) {} },
    marcas: '',
    marcar(forcar) {
      const st = $('#stage'); if (!st) return;
      if (!ehJog()) { if (this.marcas) { $$('.sala.qol-nota', st).forEach(e => e.classList.remove('qol-nota')); this.marcas = ''; } return; }
      const t = this.todas(), sig = Object.keys(t).join(',') + '|' + (st.firstChild ? st.childElementCount : 0) + '|' + (A().andarAtual || 0);
      if (!forcar && sig === this.marcas) return;
      this.marcas = sig;
      $$('.sala.qol-nota', st).forEach(e => { if (!t['c' + e.dataset.cn]) e.classList.remove('qol-nota'); });
      Object.keys(t).forEach(k => { const e = st.querySelector(`.sala[data-cn="${+k.slice(1)}"]`); if (e) { e.classList.add('qol-nota'); e.dataset.qolNota = t[k].t.slice(0, 60); } });
    },
    editar(cn) {
      const j = janela('qolMapaEd', 'qol-mini');
      const n = this.todas()['c' + cn];
      j.innerHTML = `<header class="qol-jan-cab"><b>🧠 Sua anotação · CN ${pad2(cn)}</b><button type="button" class="qol-x" data-qm="x" aria-label="Fechar">✕</button></header>
        <p class="qol-sub">Só você vê, só neste aparelho.</p>
        <textarea maxlength="400" rows="4" aria-label="Anotação da sala" placeholder="Ex.: porta trancada, cheiro de ferrugem, voltar com a lanterna">${esc(n ? n.t : '')}</textarea>
        <div class="qol-linha"><button type="button" class="qol-bt qol-prim" data-qm="ok">Guardar</button>${n ? '<button type="button" class="qol-bt" data-qm="apagar">Apagar</button>' : ''}</div>`;
      j.hidden = false;
      const ta = $('textarea', j); setTimeout(() => { try { ta.focus(); } catch (e) {} }, 30);
      j.onclick = e => { const b = e.target.closest('[data-qm]'); if (!b) return; if (b.dataset.qm === 'ok') this.gravar(cn, ta.value); if (b.dataset.qm === 'apagar') this.gravar(cn, ''); j.hidden = true; };
      j.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); j.hidden = true; } if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { this.gravar(cn, ta.value); j.hidden = true; } };
    },
    blocoHtml() {
      const t = this.todas(), vis = this.visitadas();
      const l = Object.entries(t).sort((x, y) => y[1].ts - x[1].ts);
      return `<p class="qol-sub">Toque numa sala já visitada e use “✎ Anotar”. ${vis.size} sala${vis.size === 1 ? '' : 's'} visitada${vis.size === 1 ? '' : 's'}.</p>` +
        (l.length ? `<ul class="qol-lista">${l.map(([k, v]) => `<li><button type="button" class="qol-li-bt" data-qm-ir="${+k.slice(1)}"><b>CN ${pad2(+k.slice(1))}</b><span>${esc(v.t)}</span></button><button type="button" class="qol-ic" data-qm-ed="${+k.slice(1)}" aria-label="Editar">✎</button></li>`).join('')}</ul>` : '<p class="qol-vazio">Nenhuma anotação ainda.</p>');
    }
  };
  // cartão da sala (gancho público do site): mostra a anotação e o botão
  function ligarGanchoSala() {
    if (!A() || !A().ganchoSala) return setTimeout(ligarGanchoSala, 200);
    A().ganchoSala({
      publico(cn) {
        if (!ehJog()) return '';
        const n = Mapa.todas()['c' + cn], vis = Mapa.visitadas().has(cn);
        if (!vis && !n) return '';
        return `<div class="qol-nota-sala"><p><strong>🧠 Sua anotação</strong> <small>só você vê</small></p>${n ? `<p class="qol-nota-t">${esc(n.t)}</p>` : ''}<div class="acoes"><button type="button" data-qol-anotar="${cn}">✎ ${n ? 'Editar' : 'Anotar'}</button></div></div>`;
      },
      ligar(c, cn) { const b = c.querySelector('[data-qol-anotar]'); if (b) b.onclick = () => Mapa.editar(cn); }
    });
  }
  pecas.push({ ativo: () => ehJog() || !!Mapa.marcas, atualizar: () => Mapa.marcar() });

  /* =========================================================
     6. MODO "SÓ MAPA" (celulares fracos): esconde painéis e efeitos caros de CSS
     ========================================================= */
  const SoMapa = {
    on: false,
    aplicar(v) {
      this.on = !!v; body.classList.toggle('qol-so-mapa', this.on); ls.set('acf-qol-somapa', this.on);
      const b = $('#qolSoMapa'); if (b) { b.classList.toggle('ativo', this.on); b.setAttribute('aria-pressed', String(this.on)); b.title = this.on ? 'Mostrar os painéis de novo' : 'Só o mapa: esconde os painéis (bom para celular fraco)'; }
    },
    alternar() { this.aplicar(!this.on); aviso(this.on ? 'Só o mapa: painéis escondidos. Toque em 🗺 de novo para voltar.' : 'Painéis de volta.'); },
    botao() {
      const cam = $('.camera'); if (!cam || $('#qolSoMapa')) return;
      const b = document.createElement('button'); b.type = 'button'; b.id = 'qolSoMapa'; b.className = 'qol-cam-bt'; b.textContent = '🗺';
      b.setAttribute('aria-label', 'Modo só mapa'); b.addEventListener('click', () => this.alternar());
      cam.prepend(b); this.aplicar(ls.get('acf-qol-somapa', false));
    }
  };

  /* =========================================================
     7. RETOMAR: aba, andar, vista 3D e zoom voltam ao recarregar (localStorage, por perfil)
     ========================================================= */
  const Retomar = {
    chave: () => 'acf-qol-retomar-' + perfil() + '-' + ((A() && (A().meu || A().aux)) || 'm'),
    feito: false,
    salvar() {
      const a = A(); if (!a || !perfil()) return;
      const s = { ts: agora(), andar: a.andarAtual };
      const ab = $('#abasMestre button.ativo'); if (ab && ehMestre()) s.aba = ab.dataset.aba;
      if (s3dAberto()) { const e = Sala3D.estado || {}; s.s3d = { a: e.a, modo: (e.cam || {}).modo, px: (e.cam || {}).px, pz: (e.cam || {}).pz, yaw: (e.cam || {}).yaw, largo: (e.cam || {}).largo, ctrl: e.ctrl || null }; }
      // zoom e posição do mapa 2D: só com o gancho ACF.camera2D (ver relatório); sem ele, fica de fora
      try { if (a.camera2D) s.cam = { ...a.camera2D }; } catch (e) {}
      ls.set(this.chave(), s);
    },
    aplicar() {
      if (this.feito) return; const a = A(); if (!a || !perfil() || !a.pronto) return;
      if (!Object.keys(tokens()).length && a.firebase) return;   // espera o primeiro estado do servidor
      this.feito = true;
      const s = ls.get(this.chave(), null); if (!s || agora() - (s.ts || 0) > 12 * 3600e3) return;
      try {
        if (s.aba && ehMestre()) { const b = $(`#abasMestre [data-aba="${s.aba}"]`); if (b && !b.classList.contains('ativo')) b.click(); }
        if (s.andar && s.andar !== a.andarAtual && a.podeVer(s.andar)) a.irAndar(s.andar);
        if (s.cam && a.camera2D) try { a.camera2D = s.cam; } catch (e) {}
        if (s.s3d && window.Sala3D && !s3dAberto()) setTimeout(() => this.abrir3D(s.s3d), 600);
      } catch (e) { console.warn('qol retomar:', e); }
    },
    abrir3D(v) {
      const a = A(); if (!a || s3dAberto()) return;
      if (ehJog()) { const b = $('#btnTresD'); if (b && !b.hidden && !b.disabled) b.click(); else return; }
      else if (v.ctrl && tokens()[v.ctrl] && a.podeMover(tokens()[v.ctrl])) Sala3D.controlar(v.ctrl);
      else { const sala = v.a ? 25 * (v.a - 1) + 13 : 13; Sala3D.abrir(sala, { a: v.a || 1, livre: true }); }
      // a câmera volta quando a vista termina de abrir (sem laço: tenta poucas vezes)
      let n = 0; const vez = () => { if (!s3dAberto() || !Sala3D._api) { if (++n < 20) setTimeout(vez, 500); return; } try { if (v.modo) Sala3D.modo(v.modo); if (!ehJog() && v.px != null && Sala3D._cam && !v.ctrl) Sala3D._cam({ px: v.px, pz: v.pz, yaw: v.yaw }); } catch (e) {} };
      setTimeout(vez, 800);
      aviso('A tela voltou como estava.');
    }
  };
  addEventListener('pagehide', () => Retomar.salvar());
  document.addEventListener('visibilitychange', () => { if (document.hidden) Retomar.salvar(); });
  pecas.push({ ativo: () => !Retomar.feito, atualizar: () => Retomar.aplicar() });

  /* =========================================================
     2. AÇÕES POR PERTO (3D): além do botão principal do site, outras coisas ao alcance viram botões
     ========================================================= */
  const Perto = {
    api: null, el: null, mo: null, tm: 0, sig: '',
    iniciar(api) {
      this.api = api;
      const d = $('#s3d'); if (!d) return;
      if (!this.el) { this.el = document.createElement('div'); this.el.id = 'qolPerto'; this.el.className = 'qol-perto'; this.el.hidden = true; this.el.setAttribute('aria-label', 'Outras ações por perto'); this.el.addEventListener('click', e => this.clique(e)); }
      if (this.el.parentElement !== d) d.appendChild(this.el);
      const pr = $('#s3dPrompt', d);
      if (pr && !this.mo) { this.mo = new MutationObserver(() => this.agendar()); this.mo.observe(pr, { attributes: true, attributeFilter: ['hidden'], childList: true, characterData: true, subtree: true }); }
    },
    fechar() { if (this.el) this.el.hidden = true; clearTimeout(this.tm); this.tm = 0; this.lista = []; },
    agendar() { if (this.tm) return; this.tm = setTimeout(() => { this.tm = 0; this.calcular(); }, 120); },
    lista: [],
    calcular() {
      const api = this.api, V = api && api.V, pr = $('#s3dPrompt');
      if (!V || !pr || pr.hidden || !s3dAberto()) return this.mostrar([]);
      const a = A(), est = api.est, quem = V.quem, prim = V.pertoDe ? V.pertoDe() : null;
      const igual = it => prim && it && ((prim.ci != null && prim.ci === it.ci && prim.tipo === it.tipo) || (prim.k != null && prim.k === it.k) || (prim.pos && it.pos && prim.pos.x === it.pos.x && prim.pos.z === it.pos.z && prim.tipo === it.tipo));
      const out = [];
      (api.mundo.interativos || []).forEach(it => {
        if (out.length >= 3 || igual(it)) return;
        if (it.p && (api.mundo.carregadas.get(it.p) || {}).extra) return;
        if (!it.pos || it.tipo === 'int' || it.tipo === 'elevador' || it.tipo === 'uso') return;
        const d = Math.hypot(it.pos.x - est.px, it.pos.z - est.pz) - (it.sala ? 1.4 : 0);
        if (d > 2.6) return;
        let txt = '', fn = null;
        if (it.tipo === 'item') { if (!(it.obj && it.obj.visible) || !(V.ctrl || quem === 'mestre')) return; txt = `🎒 Pegar: ${it.nome}`; fn = () => { const r = a.pegarItemChao(it.k, it.nome); aviso(r || `🎒 ${it.nome} foi para a sua ficha.`); }; }
        else if (it.tipo === 'esconderijo') { if (!V.ctrl || !V.usarEsconderijo) return; txt = `✋ Esconder-se (${it.nome})`; fn = () => V.usarEsconderijo(it); }
        else if (it.tipo === 'doc') { const AR = window.ACF_ARQUIVO; if (!AR || !AR.abrirNaSala) return; txt = it.arq === 'cifras' ? `◈ Inscrição: ${it.tit}` : `📄 Ler: ${it.tit}`; fn = () => { if (document.pointerLockElement) document.exitPointerLock(); AR.abrirNaSala(it.arq, it.id); }; }
        else if (it.tipo === 'porta' && it.ci != null && V.usarPorta) {
          const e = api.mundo.estadoPorta ? api.mundo.estadoPorta(it.ci) : '';
          txt = quem === 'mestre' ? (e === 'a' ? '🚪 Fechar a outra porta' : '🚪 Abrir a outra porta') : e === 'tk' ? '🔢 Código da outra porta' : e === 'f' ? '🔴 Botão da outra porta' : '';
          if (!txt) return; fn = () => V.usarPorta(it.ci);
        } else return;
        out.push({ txt, fn, d });
      });
      out.sort((x, y) => x.d - y.d);
      this.mostrar(out);
    },
    mostrar(l) {
      this.lista = l;
      if (!this.el) return;
      const sig = l.map(x => x.txt).join('|');
      if (sig !== this.sig) { this.sig = sig; this.el.innerHTML = l.map((x, i) => `<button type="button" data-qp="${i}">${esc(x.txt)}</button>`).join(''); }
      this.el.hidden = !l.length;
      // enquanto há algo além do principal, confere de novo a cada 0,7 s (sai sozinho quando some)
      clearTimeout(this.tv); if (l.length) this.tv = setTimeout(() => this.agendar(), 700);
    },
    clique(e) { const b = e.target.closest('[data-qp]'); if (!b) return; const x = this.lista[+b.dataset.qp]; if (x) { try { x.fn(); } catch (er) { console.warn(er); } setTimeout(() => this.agendar(), 200); } }
  };

  /* =========================================================
     8-11. AUXILIARES: troca rápida, recargas, frases rápidas e painel do controlado
     ========================================================= */
  const Aux = {
    sel: ls.get('acf-qol-aux-sel', null), listaAberta: false,
    // tokens que este auxiliar já pode mover (as mesmas regras do site), Filhos e robôs
    controlaveis() {
      const a = A(); if (!a || !ehGM()) return [];
      return Object.entries(tokens()).filter(([id, tk]) => { const s = SER(tk.s); if (!s || !(s.tipo === 'filho' || s.tipo === 'robo')) return false; try { return a.podeMover(tk); } catch (e) { return false; } })
        .sort((x, y) => (x[0] === a.aux ? -1 : y[0] === a.aux ? 1 : 0) || (SER(x[1].s).tipo === 'robo' ? -1 : 1) - (SER(y[1].s).tipo === 'robo' ? -1 : 1) || rot(x[1]).localeCompare(rot(y[1]))).slice(0, 9);
    },
    atual() {
      const a = A(); if (!a) return null;
      if (s3dAberto()) { const c = (Sala3D.estado || {}).ctrl; if (c && tokens()[c]) return c; }
      if (this.sel && tokens()[this.sel]) return this.sel;
      if (a.selecionado && tokens()[a.selecionado]) { const s = SER(tokens()[a.selecionado].s); if (s && (s.tipo === 'filho' || s.tipo === 'robo')) return a.selecionado; }
      return a.aux && tokens()[a.aux] ? a.aux : null;
    },
    escolher(id) {
      const a = A(), tk = tokens()[id]; if (!tk) return;
      this.sel = id; ls.set('acf-qol-aux-sel', id);
      if (s3dAberto()) Sala3D.controlar(id);
      else { try { a.selecionar(id); a.focarToken(id); } catch (e) {} }
      aviso(`Controlando: ${rot(tk)}`);
      this.fecharLista(); this.desenhar();
    },
    // 9. recargas: só leitura do que o site já guarda (filhosEstado.u) e das regras de limite de cada característica
    recargas(id) {
      const a = A(), F = window.ACF_FILHOS, tk = tokens()[id]; if (!F || !tk || !F.cfgTk) return [];
      const c = F.cfgTk(tk); if (!c || !c.hab) return [];
      const ef = ((a._int && a._int.Priv && a._int.Priv.dados) || {}).filhosEstado || {};
      const u = (ef.u || {})[id] || {}, P = (a.estado || {}).persg || {}, rod = P.on ? P.rod || 1 : 0, cena = ((a.estado || {}).cena || {}).id || '0';
      return Object.keys(F.HABS || {}).filter(k => c.hab[k]).map(k => {
        const l = (c.lim && c.lim[k] !== undefined) ? c.lim[k] : (F.HABS[k] || {}).lim || '', x = u[k];
        let st = 'pronta', cls = 'ok';
        if (l === 'cena' && x && x.c === cena) { st = 'usada nesta cena'; cls = 'off'; }
        else if (l === 'rodadas3') {
          if (!P.on) { st = 'só na perseguição'; cls = 'esp'; }
          else if (x && x.r && rod - x.r < 3 && x.c === cena) { const f = x.r + 3 - rod; st = `volta na rodada ${x.r + 3} (falta${f > 1 ? 'm' : ''} ${f})`; cls = 'off'; }
        }
        return { k, n: (F.HABS[k] || {}).n || k, i: (F.HABS[k] || {}).i || '✦', lim: l === 'cena' ? '1/cena' : l === 'rodadas3' ? '3 rod.' : '', st, cls };
      });
    },
    alvo(id) {
      const a = A(), tk = tokens()[id]; if (!tk || !tk.a) return null;
      let best = null;
      Object.entries(tokens()).forEach(([oid, o]) => {
        const s = SER(o.s); if (oid === id || !s || s.tipo !== 'cobaia' || o.a !== tk.a) return;
        try { if (!a.visivelPara(o)) return; } catch (e) { return; }
        const d = Math.hypot(o.x - tk.x, o.y - tk.y); if (!best || d < best.d) best = { id: oid, tk: o, d };
      });
      if (!best) return null;
      let m = null; try { m = a.custoMetros({ x: tk.x, y: tk.y }, { x: best.tk.x, y: best.tk.y }); } catch (e) { m = best.d * ((a.geo || {}).M_POR_UNID || 1.414); }
      return { nome: rot(best.tk), m, onde: a.salaDe(best.id) };
    },
    hudHtml() {
      const a = A(), id = this.atual(); if (!id) return '';
      const tk = tokens()[id], s = SER(tk.s) || {}, cn = a.salaDe(id), al = this.alvo(id);
      const lim = a.limiteDe ? a.limiteDe(id) : null, fm = v => (a.fmtM ? a.fmtM(v) : (+v).toFixed(1)) + ' m';
      const st = [];
      if (tk.h) st.push('oculto');
      if (tk.oc) st.push('oculto dos jogadores');
      if (tk.esq) st.push('escondido');
      if (tk.fo) st.push(tk.fo === 'invisível' ? 'invisível' : 'forma de objeto');
      if (lim) st.push(`${fm(tk.m || 0)} de ${lim} m`);
      if (tk.vit && tk.vit.pv != null) st.push(`PV ${tk.vit.pv}/${tk.vit.pvM}`);
      const rc0 = s.tipo === 'filho' ? this.recargas(id) : [], rc = s3dAberto() ? rc0.filter(r => r.cls !== 'ok') : rc0;
      const lista = this.controlaveis();
      return `<div class="qol-hud-l1"><span class="qol-hud-cor" style="--c:${esc(s.cor || '#8b5cf6')}"></span><b>${s.tipo === 'robo' ? '🤖' : '🩸'} ${esc(rot(tk))}</b>
          <small>${cn ? 'CN ' + pad2(cn) : tk.a ? tk.a + 'º andar · corredor' : 'fora do mapa'}</small>
          ${lista.length > 1 ? `<button type="button" class="qol-hud-bt" data-qa="lista" aria-label="Trocar o controlado" title="Trocar (J, depois 1 a 9)">⇄</button>` : ''}
          <button type="button" class="qol-hud-bt" data-qa="frases" aria-label="Frases rápidas" title="Frases rápidas (U)">💬</button>
          <button type="button" class="qol-hud-bt" data-qa="min" aria-label="Recolher">${this.min ? '▴' : '▾'}</button></div>` +
        (this.min ? '' : `<div class="qol-hud-l2"><span>${st.length ? esc(st.join(' · ')) : 'livre'}</span>${al ? `<span class="qol-hud-alvo">🎯 ${esc(al.nome)} · <b>${esc(fm(al.m))}</b>${al.onde ? ' · CN ' + pad2(al.onde) : ''}</span>` : '<span class="qol-hud-alvo">🎯 nenhuma cobaia à vista</span>'}</div>` +
          (rc.length ? `<div class="qol-hud-rc">${rc.map(r => `<span class="qol-rc ${r.cls}" title="${esc(r.n + (r.lim ? ' · ' + r.lim : ''))}"><i aria-hidden="true">${r.i}</i>${esc(r.n)}<small>${esc(r.st)}</small></span>`).join('')}</div>` : ''));
    },
    min: ls.get('acf-qol-aux-min', false),
    el: null,
    desenhar() {
      if (!ehAux()) { if (this.el) this.el.hidden = true; return; }
      if (!this.el) { this.el = document.createElement('div'); this.el.id = 'qolHud'; this.el.className = 'qol-hud'; this.el.setAttribute('aria-label', 'Personagem controlado'); this.el.addEventListener('click', e => this.clique(e)); }
      // no 3D ele entra logo embaixo do nome da sala (acompanha a altura do título, que muda com a largura)
      const d3 = s3dAberto() && $('#s3d'), alvo = d3 ? ($('.s3d-tit', d3) || d3) : body; if (this.el.parentElement !== alvo) alvo.appendChild(this.el);
      const h = this.hudHtml();
      if (this.el.dataset.h !== h) { this.el.innerHTML = h; this.el.dataset.h = h; }
      this.el.hidden = !h || body.classList.contains('qol-so-mapa') && !s3dAberto();
      // no 3D, o que fica embaixo do painel (dica, visão da criatura) desce o quanto ele ocupa (medido só quando muda)
      if (d3 && !this.el.hidden && this.el.dataset.hm !== h) { this.el.dataset.hm = h; const r = this.el.getBoundingClientRect(), r0 = d3.getBoundingClientRect(); d3.style.setProperty('--qol-hud-fim', Math.round(r.bottom - r0.top) + 'px'); }
      if (this.listaAberta) this.desenharLista();
      desenharBloco('blocoQolAux');
    },
    clique(e) {
      const b = e.target.closest('[data-qa]'); if (!b) return;
      if (b.dataset.qa === 'lista') this.listaAberta ? this.fecharLista() : this.abrirLista();
      if (b.dataset.qa === 'frases') Frases.alternar();
      if (b.dataset.qa === 'min') { this.min = !this.min; ls.set('acf-qol-aux-min', this.min); this.desenhar(); }
    },
    abrirLista() { this.listaAberta = true; this.desenharLista(); },
    fecharLista() { this.listaAberta = false; const j = $('#qolTroca'); if (j) j.hidden = true; },
    desenharLista() {
      const j = janela('qolTroca', 'qol-mini qol-troca'), cur = this.atual(), a = A();
      const l = this.controlaveis();
      const h = `<header class="qol-jan-cab"><b>⇄ Trocar o controlado</b><button type="button" class="qol-x" data-qt="x" aria-label="Fechar">✕</button></header>
        ${l.length ? `<ol class="qol-troca-l">${l.map(([id, tk], i) => { const s = SER(tk.s) || {}; return `<li><button type="button" data-qt-id="${esc(id)}" class="${id === cur ? 'on' : ''}"><kbd>${i + 1}</kbd><span class="qol-hud-cor" style="--c:${esc(s.cor || '#8b5cf6')}"></span><b>${esc(rot(tk))}</b><small>${s.tipo === 'robo' ? 'robô' : 'Filho'} · ${a.salaDe(id) ? 'CN ' + pad2(a.salaDe(id)) : tk.a + 'º andar'}</small></button></li>`; }).join('')}</ol>` : '<p class="qol-vazio">Nenhum Filho ou robô que você possa mover está no mapa.</p>'}
        <p class="qol-sub">${toque() ? 'Toque para controlar.' : 'Teclas 1 a 9 com esta lista aberta (no mapa 2D, direto).'}</p>`;
      if (j.dataset.h !== h) { j.innerHTML = h; j.dataset.h = h; }
      j.hidden = false;
      j.onclick = e => { const b = e.target.closest('[data-qt-id]'); if (b) this.escolher(b.dataset.qtId); if (e.target.closest('[data-qt="x"]')) this.fecharLista(); };
    },
    porNumero(n) { const l = this.controlaveis(); if (l[n - 1]) { this.escolher(l[n - 1][0]); return true; } return false; }
  };
  pecas.push({ ativo: () => ehAux() || (Aux.el && !Aux.el.hidden), atualizar: () => Aux.desenhar() });

  // 10. frases rápidas: editáveis, salvas no aparelho; vão pelo chat do site (o 3D já fala as mensagens com a voz)
  // frases neutras de mesa; cada auxiliar troca pelas suas (✎)
  const FRASES_PADRAO = ['Um momento.', 'Sim.', 'Não.', 'Pode repetir?', 'Já volto.', '…'];
  const Frases = {
    lista() { const l = ls.get('acf-qol-frases', null); return Array.isArray(l) ? l : FRASES_PADRAO.slice(); },
    salvar(l) { ls.set('acf-qol-frases', l.map(x => String(x).slice(0, 200)).filter(Boolean).slice(0, 12)); },
    editando: false,
    alternar() { const j = $('#qolFrases'); if (j && !j.hidden) j.hidden = true; else this.abrir(); },
    abrir() {
      const j = janela('qolFrases', 'qol-mini qol-frases');
      const l = this.lista(), canal = ls.get('acf-qol-frases-canal', 'geral');
      const canais = [['geral', 'Geral'], ['filhos', 'Filhos'], ['sus', 'Sussurro']].filter(([k]) => $(`#chatAbas [data-canal="${k}"]`) || k === 'geral');
      j.innerHTML = `<header class="qol-jan-cab"><b>💬 Frases rápidas</b><button type="button" class="qol-ic" data-qfr="ed" aria-pressed="${this.editando}" title="Editar">✎</button><button type="button" class="qol-x" data-qfr="x" aria-label="Fechar">✕</button></header>
        <div class="qol-chips" role="radiogroup" aria-label="Canal">${canais.map(([k, n]) => `<button type="button" role="radio" data-qfr-c="${k}" class="${canal === k ? 'on' : ''}" aria-checked="${canal === k}">${n}</button>`).join('')}</div>
        ${this.editando ? `<textarea rows="7" aria-label="Uma frase por linha">${esc(l.join('\n'))}</textarea><div class="qol-linha"><button type="button" class="qol-bt qol-prim" data-qfr="ok">Guardar</button><button type="button" class="qol-bt" data-qfr="padrao">Padrão</button></div>`
          : `<ol class="qol-frases-l">${l.map((f, i) => `<li><button type="button" data-qfr-i="${i}">${i < 9 && !toque() ? `<kbd>${i + 1}</kbd>` : ''}${esc(f)}</button></li>`).join('')}</ol><p class="qol-sub">Vai pelo chat, como se você digitasse. Só neste aparelho.</p>`}`;
      j.hidden = false;
      j.onclick = e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.qfr === 'x') { j.hidden = true; return; }
        if (b.dataset.qfr === 'ed') { this.editando = !this.editando; this.abrir(); return; }
        if (b.dataset.qfr === 'ok') { this.salvar($('textarea', j).value.split('\n').map(x => x.trim())); this.editando = false; this.abrir(); return; }
        if (b.dataset.qfr === 'padrao') { ls.del('acf-qol-frases'); this.editando = false; this.abrir(); return; }
        if (b.dataset.qfrC) { ls.set('acf-qol-frases-canal', b.dataset.qfrC); this.abrir(); return; }
        if (b.dataset.qfrI != null) this.enviar(this.lista()[+b.dataset.qfrI]);
      };
    },
    // usa o formulário do chat do site: mesmo canal, mesmo autor e as mesmas regras de quem digita
    enviar(txt) {
      if (!txt) return;
      const f = $('#chatForm'), inp = $('#chatTexto'); if (!f || !inp) return aviso('Chat indisponível.');
      const canal = ls.get('acf-qol-frases-canal', 'geral'), ab = $(`#chatAbas [data-canal="${canal}"]`);
      if (ab && !ab.classList.contains('ativo') && !ab.classList.contains('on')) ab.click();
      const antes = inp.value; inp.value = txt;
      try { f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })); } catch (e) {}
      if (inp.value === txt) inp.value = antes;
      aviso('💬 ' + txt);
      const j = $('#qolFrases'); if (j) j.hidden = true;
    }
  };

  /* =========================================================
     14. AGORA (Mestre; auxiliar vê o que já vê): online, onde está cada token, efeitos ativos e alertas
     ========================================================= */
  const Agora = {
    dados() {
      const a = A(), e = a.estado || {}, P = e.persg || {}, tks = tokens(), mestre = ehMestre();
      // on-line: a lista do cartão "Conectados agora" (Mestre); com o gancho ACF.online(id), também para o auxiliar
      const online = typeof a.online === 'function' ? Object.values(a.SER || {}).filter(s => (s.tipo === 'cobaia' || s.tipo === 'robo') && a.online(s.id)).map(s => s.nome)
        : mestre ? $$('#listaConectados li.on').map(li => li.textContent.trim()) : null;
      const porAndar = {};
      Object.entries(tks).forEach(([id, tk]) => {
        const s = SER(tk.s); if (!s || !tk.a) return;
        try { if (!a.visivelPara(tk)) return; } catch (er) { return; }
        const cn = a.salaDe(id);
        (porAndar[tk.a] = porAndar[tk.a] || []).push({ id, tk, s, cn, nome: rot(tk) });
      });
      const efe = [];
      if (P.on) { const o = P.ordem ? Object.values(P.ordem) : [], v = (o[P.vez || 0] || {}).id; efe.push(['🏃', `Perseguição · rodada ${P.rod || 1} · vez de ${v && tks[v] ? rot(tks[v]) : '?'}`, 'vivo']); }
      try { if (a.apagao) efe.push(['🌑', 'Apagão ligado', 'alerta']); } catch (er) {}
      try { if (a.protocolo) efe.push(['⚠', 'Protocolo ativo', 'alerta']); } catch (er) {}
      if (e.amb && e.amb.el) efe.push(['🔊', 'Ambiente: ' + e.amb.el, 'vivo']);
      if (e.encontro && (e.encontro.on || e.encontro.id)) efe.push(['🎥', 'Encontro em andamento', 'vivo']);
      if ((e.ruido || {}).d) efe.push(['📅', 'Dia ' + e.ruido.d, '']);
      const cond = Object.entries(e.cond || {}).map(([id, c]) => [id, Object.keys(c || {}).filter(k => k[0] !== '_' && c[k])]).filter(x => x[1].length && tks[x[0]]);
      const al = [];
      Object.entries(tks).forEach(([id, tk]) => {
        const v = tk.vit, s = SER(tk.s); if (!v || !s || s.tipo !== 'cobaia') return;
        if (v.pv != null && v.pv <= 0) al.push(['💀', `${rot(tk)} com PV ${v.pv}`, 'alerta']);
        else if (v.pvM && v.pv / v.pvM <= .25) al.push(['❤', `${rot(tk)} com pouco PV (${v.pv}/${v.pvM})`, 'alerta']);
        if (v.sanM && v.san != null && v.san / v.sanM <= .25) al.push(['🧠', `${rot(tk)} com pouca SAN (${v.san}/${v.sanM})`, 'alerta']);
      });
      if (mestre) {
        const ped = $$('#listaPedidos li:not(.vazio)').length; if (ped) al.push(['📨', `${ped} pedido${ped > 1 ? 's' : ''} esperando`, 'alerta']);
        const est = $$('#listaRuido li.estouro').length; if (est) al.push(['🚨', `${est} grupo${est > 1 ? 's' : ''} acima do limite de ruído`, 'alerta']);
        const dsp = $$('#desempLista .dsp-alerta').length; if (dsp) al.push(['📈', `${dsp} aparelho${dsp > 1 ? 's' : ''} com desempenho ruim`, 'alerta']);
      }
      return { online, porAndar, efe, cond, al };
    },
    html() {
      const x = this.dados(), a = A();
      const chip = ([i, t, c]) => `<span class="qol-chip ${c || ''}"><i aria-hidden="true">${i}</i>${esc(t)}</span>`;
      let h = '';
      if (x.al.length) h += `<h3 class="qol-h">Alertas</h3><div class="qol-chips-l">${x.al.map(chip).join('')}</div>`;
      if (x.online) h += `<h3 class="qol-h">On-line <small>${x.online.length}</small></h3><div class="qol-chips-l">${x.online.length ? x.online.map(n => chip(['🟢', n])).join('') : '<span class="qol-vazio">ninguém</span>'}</div>`;
      h += `<h3 class="qol-h">Em andamento</h3><div class="qol-chips-l">${x.efe.length ? x.efe.map(chip).join('') : '<span class="qol-vazio">nada ativo</span>'}</div>`;
      if (x.cond.length) h += `<h3 class="qol-h">Condições</h3><ul class="qol-lista qol-cond">${x.cond.map(([id, ks]) => `<li><b>${esc(rot(tokens()[id]))}</b><span>${ks.map(k => ((a.COND || {})[k] || {}).i || '').join(' ')} ${esc(ks.map(k => ((a.COND || {})[k] || {}).n || k).join(', '))}</span></li>`).join('')}</ul>`;
      const andares = Object.keys(x.porAndar).sort();
      h += `<h3 class="qol-h">Onde está cada um</h3>` + (andares.length ? andares.map(an => `<p class="qol-sub">${an}º andar</p><ul class="qol-lista qol-onde">${x.porAndar[an].sort((p, q) => (p.cn || 999) - (q.cn || 999)).map(t => `<li><button type="button" class="qol-li-bt" data-qag="${esc(t.id)}"><span class="qol-hud-cor" style="--c:${esc(t.s.cor || '#888')}"></span><b>${esc(t.nome)}</b><span>${t.cn ? 'CN ' + pad2(t.cn) : 'corredor'}${t.tk.h ? ' · oculto' : ''}${t.tk.vit && t.tk.vit.pv != null ? ` · PV ${t.tk.vit.pv}/${t.tk.vit.pvM}` : ''}</span></button></li>`).join('')}</ul>`).join('') : '<p class="qol-vazio">Nenhum token no mapa.</p>');
      return h;
    },
    resumo() {
      const x = this.dados(); const r = [];
      if (x.online) r.push(['🟢', x.online.length + ' on-line']);
      const n = Object.values(x.porAndar).reduce((s, l) => s + l.length, 0); r.push(['📍', n + ' no mapa']);
      if (x.efe.length) r.push(['▶', x.efe.length + ' ativo' + (x.efe.length > 1 ? 's' : ''), 'vivo']);
      if (x.al.length) r.push(['⚠', x.al.length + ' alerta' + (x.al.length > 1 ? 's' : ''), 'alerta']);
      return r;
    },
    ligar(c) { c.onclick = e => { const b = e.target.closest('[data-qag]'); if (!b) return; const a = A(); if (s3dAberto() && ehMestre()) { const tk = tokens()[b.dataset.qag]; const cn = a.salaDe(b.dataset.qag); if (tk && cn) Sala3D.abrir(cn, { a: tk.a, livre: true }); return; } a.focarToken(b.dataset.qag); a.selecionar(b.dataset.qag); }; }
  };

  /* =========================================================
     15. MACROS: sequências gravadas a partir dos próprios cliques (só neste aparelho)
     ========================================================= */
  const Macros = {
    chave: () => 'acf-qol-macros-' + perfil(),
    todas() { const l = ls.get(this.chave(), []); return Array.isArray(l) ? l : []; },
    salvar(l) { if (!ls.set(this.chave(), l)) aviso('Sem espaço no navegador para guardar a macro.'); },
    grav: null,
    // seletor estável: id; ou o ancestral com id + atributos data-* do elemento; o texto desempata
    seletor(el) {
      const q = v => String(v).replace(/["\\]/g, '\\$&');
      if (el.id && !/^qol/.test(el.id) && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) return '#' + CSS.escape(el.id);
      const ds = [...el.attributes].filter(x => /^data-/.test(x.name) && !/^data-(h|pn|qol|lig)/.test(x.name) && x.value.length < 80).map(x => `[${x.name}="${q(x.value)}"]`).join('');
      let s = el.tagName.toLowerCase() + ds + (el.name ? `[name="${q(el.name)}"]` : '') + (el.type && el.tagName === 'INPUT' ? `[type="${q(el.type)}"]` : '');
      const anc = el.parentElement && el.parentElement.closest('[id]:not([id^="qol"])');
      return (anc && anc !== body ? '#' + CSS.escape(anc.id) + ' ' : '') + s;
    },
    rotulo(el) { return (el.getAttribute('aria-label') || el.title || el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 50); },
    ouvirClique: null, ouvirMuda: null,
    gravar() {
      if (this.grav) return;
      this.grav = { passos: [], t0: agora(), ult: agora() };
      const ignora = el => !el || el.closest('#qolMacroBar, .qol-jan, #blocoQolMacros, .painel-barra, .pn-cab, .pn-lanc, #abasMestre, #abaPainel, .pn-tabs');
      this.ouvirClique = e => {
        if (!e.isTrusted || !this.grav) return;
        const el = e.target.closest('button, [role="button"], summary, a[href^="#"], .pn-chipbt'); if (!el || ignora(el)) return;
        if (el.closest('label') && el.closest('label').querySelector('input')) return;
        this.passo({ t: 'clique', sel: this.seletor(el), rot: this.rotulo(el) });
      };
      this.ouvirMuda = e => {
        if (!e.isTrusted || !this.grav) return;
        const el = e.target; if (!el || ignora(el) || !el.matches('input, select, textarea') || el.type === 'file' || el.type === 'password') return;
        const v = el.type === 'checkbox' || el.type === 'radio' ? !!el.checked : el.value;
        const lab = el.closest('label'); const r = (lab ? lab.textContent : el.getAttribute('aria-label') || el.name || el.id || '').replace(/\s+/g, ' ').trim().slice(0, 50);
        this.passo({ t: 'valor', sel: this.seletor(el), v, rot: r });
      };
      // atalhos de teclado do site (ex.: A liga o apagão) também entram, como tecla
      this.ouvirTecla = e => {
        if (!e.isTrusted || !this.grav || e.ctrlKey || e.metaKey || e.altKey || emCampo(e.target) || s3dAberto()) return;
        if (!/^[a-z0-9?]$/i.test(e.key || '')) return;
        this.passo({ t: 'tecla', k: e.key, rot: 'tecla ' + e.key.toUpperCase() });
      };
      document.addEventListener('click', this.ouvirClique, true);
      document.addEventListener('change', this.ouvirMuda, true);
      document.addEventListener('keydown', this.ouvirTecla, true);
      this.barra();
    },
    passo(p) {
      const g = this.grav, dt = agora() - g.ult; g.ult = agora();
      if (g.passos.length && dt > 1500) g.passos.push({ t: 'espera', ms: Math.min(3000, Math.round(dt / 500) * 500) });
      const ant = g.passos[g.passos.length - 1];
      if (p.t === 'valor' && ant && ant.t === 'valor' && ant.sel === p.sel) g.passos[g.passos.length - 1] = p; else g.passos.push(p);
      this.barra();
    },
    parar(salvarSim) {
      if (!this.grav) return;
      document.removeEventListener('click', this.ouvirClique, true); document.removeEventListener('change', this.ouvirMuda, true); document.removeEventListener('keydown', this.ouvirTecla, true);
      const g = this.grav; this.grav = null; this.barra();
      if (!salvarSim || !g.passos.length) { desenharBloco('blocoQolMacros'); return; }
      const nome = (prompt('Nome da macro:', 'Macro ' + (this.todas().length + 1)) || '').trim().slice(0, 40);
      if (!nome) { desenharBloco('blocoQolMacros'); return; }
      const l = this.todas(); l.push({ id: 'm' + agora().toString(36), nome, passos: g.passos.slice(0, 40) }); this.salvar(l);
      aviso(`Macro “${nome}” guardada (${g.passos.length} passos).`);
      desenharBloco('blocoQolMacros');
    },
    barra() {
      let b = $('#qolMacroBar');
      if (!this.grav) { if (b) b.hidden = true; return; }
      if (!b) { b = document.createElement('div'); b.id = 'qolMacroBar'; b.className = 'qol-macro-bar'; b.setAttribute('role', 'status'); body.appendChild(b); b.addEventListener('click', e => { const x = e.target.closest('[data-qmb]'); if (!x) return; if (x.dataset.qmb === 'ok') this.parar(true); if (x.dataset.qmb === 'x') this.parar(false); if (x.dataset.qmb === 'esp') this.grav && this.grav.passos.push({ t: 'espera', ms: 2000 }) && this.barra(); }); }
      b.innerHTML = `<span class="qol-rec" aria-hidden="true"></span><b>Gravando · ${this.grav.passos.length}</b><small>passo${this.grav.passos.length === 1 ? '' : 's'} · faça as ações como sempre</small><button type="button" data-qmb="esp">+ 2 s</button><button type="button" data-qmb="ok" class="qol-prim">Concluir</button><button type="button" data-qmb="x">Cancelar</button>`;
      b.hidden = false;
    },
    rodando: false,
    async rodar(id) {
      const m = this.todas().find(x => x.id === id); if (!m || this.rodando) return;
      this.rodando = true; aviso(`▶ ${m.nome}`);
      const dorme = ms => new Promise(r => setTimeout(r, ms));
      let i = 0;
      try {
        for (const p of m.passos) {
          i++;
          if (p.t === 'espera') { await dorme(Math.min(10000, p.ms || 1000)); continue; }
          if (p.t === 'chat') { Frases.enviar(p.txt); await dorme(250); continue; }
          if (p.t === 'tecla') { (document.activeElement && !emCampo(document.activeElement) ? document.activeElement : body).dispatchEvent(new KeyboardEvent('keydown', { key: p.k, bubbles: true, cancelable: true })); await dorme(220); continue; }
          let cands = []; try { cands = $$(p.sel); } catch (e) {}
          let el = cands.length > 1 ? (cands.find(c => this.rotulo(c) === p.rot) || cands.find(c => c.offsetParent) || cands[0]) : cands[0];
          if (!el && p.rot) { const raiz = p.sel.startsWith('#') ? $(p.sel.split(' ')[0]) : null; if (raiz) el = $$('button, [role="button"]', raiz).find(c => this.rotulo(c) === p.rot); }
          if (!el) { aviso(`Macro “${m.nome}” parou no passo ${i}: não achei “${p.rot || p.sel}”. Abra o cartão de onde ele vem e tente de novo.`); break; }
          if (p.t === 'clique') { if (el.disabled) { aviso(`Passo ${i} (“${p.rot}”) está desativado agora.`); break; } el.click(); }
          else if (p.t === 'valor') {
            if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked !== !!p.v) el.click(); }
            else { el.value = p.v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
          }
          await dorme(220);
        }
      } finally { this.rodando = false; }
    },
    html() {
      const l = this.todas();
      const desc = p => p.t === 'espera' ? `⏱ ${(p.ms / 1000).toFixed(1)} s` : p.t === 'chat' ? `💬 ${p.txt}` : p.t === 'tecla' ? `⌨ ${String(p.k).toUpperCase()}` : p.t === 'valor' ? `✎ ${p.rot || p.sel} = ${p.v === true ? 'ligado' : p.v === false ? 'desligado' : p.v}` : `👆 ${p.rot || p.sel}`;
      return `<p class="qol-sub">Grave uma vez as ações que você já faz à mão (ex.: apagar as luzes e tocar um som); depois um toque repete tudo. Fica só neste aparelho.</p>
        <div class="qol-linha">${this.grav ? '<button type="button" class="qol-bt" data-qma="parar">■ Concluir a gravação</button>' : '<button type="button" class="qol-bt qol-prim" data-qma="gravar">● Gravar nova macro</button>'}</div>
        ${l.length ? `<ul class="qol-lista qol-macros">${l.map(m => `<li><button type="button" class="qol-li-bt" data-qma-run="${m.id}"><b>▶ ${esc(m.nome)}</b><span>${esc(m.passos.map(desc).join(' → ').slice(0, 160))}</span></button><button type="button" class="qol-ic" data-qma-ren="${m.id}" aria-label="Renomear">✎</button><button type="button" class="qol-ic" data-qma-del="${m.id}" aria-label="Apagar">🗑</button></li>`).join('')}</ul>` : '<p class="qol-vazio">Nenhuma macro ainda.</p>'}`;
    },
    ligar(c) {
      c.onclick = e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.qma === 'gravar') { this.gravar(); aviso('Gravando: faça as ações e toque em Concluir.'); desenharBloco('blocoQolMacros'); }
        if (b.dataset.qma === 'parar') this.parar(true);
        if (b.dataset.qmaRun) this.rodar(b.dataset.qmaRun);
        if (b.dataset.qmaDel && confirm('Apagar esta macro?')) { this.salvar(this.todas().filter(m => m.id !== b.dataset.qmaDel)); desenharBloco('blocoQolMacros'); }
        if (b.dataset.qmaRen) { const l = this.todas(), m = l.find(x => x.id === b.dataset.qmaRen); const n = m && (prompt('Novo nome:', m.nome) || '').trim().slice(0, 40); if (n) { m.nome = n; this.salvar(l); desenharBloco('blocoQolMacros'); } }
      };
    },
    resumo() { const n = this.todas().length; return this.grav ? [['●', 'gravando', 'alerta']] : [['⚡', n ? n + ' macro' + (n > 1 ? 's' : '') : 'nenhuma']]; }
  };

  /* =========================================================
     16. DESFAZER AÇÕES (Mestre): o "Desfazer" do site cobre os movimentos; este cobre as outras gravações
     comuns feitas logo depois de um toque/tecla (sala revelada, apagão, portas, ambiente, relógio, condições...)
     ========================================================= */
  const ROT_K = { salas: 'Sala revelada/escondida', ap: 'Apagão', portas: 'Porta', ruido: 'Ruído e Protocolo', relogio: 'Relógio', amb: 'Ambiente', cego: 'Cegueira', loja: 'Loja', cond: 'Condição', persg: 'Perseguição', nomes: 'Nome', rev: 'Elementos revelados', itens3d: 'Item no 3D', luz: 'Luz', nevoa: 'Névoa', trilha: 'Trilha por andar' };
  const Desf = {
    pilha: [], gesto: 0, orig: null, ignorando: false, movs: [], calma: 0, ignTok: 0,
    ligar() {
      const a = A(); const S = a && a._int && a._int.Store; if (!S || this.orig) return;
      this.orig = S.definir;
      const self = this;
      S.definir = function (c, v, campos) {
        // movimento feito à mão (vai para o ↶ do site, que só o anota quando a ficha para): marca a hora já
        // (um arrasto ou uma caminhada contínua vira uma entrada só, como no Diário do site)
        try { if (ehGM() && Array.isArray(c) && c[0] === 'tokens' && agora() - self.gesto < 1500 && !self.ignorando && agora() > self.ignTok) { const m = self.movs, u = m[m.length - 1]; if (u && agora() - u < 2000) m[m.length - 1] = agora(); else { m.push(agora()); if (m.length > 40) m.shift(); } } } catch (e) {}
        // Mestre e auxiliares: guarda o antes e só anota se a gravação valeu (o site recusa na hora o que o servidor recusaria)
        let quer = false, antes;
        try { quer = !self.ignorando && ehGM() && Array.isArray(c) && !!ROT_K[c[0]] && !(c[0] === 'loja' && c[1] === 'itens') && agora() - self.gesto < 1500 && agora() > self.calma; if (quer) { antes = self.ler(S, c); if (antes !== undefined) antes = JSON.parse(JSON.stringify(antes)); } } catch (e) { quer = false; }
        const r = self.orig.apply(this, arguments);
        try { if (quer) self.anotar(S, c, antes); } catch (e) {}
        return r;
      };
      const g = e => { if (e.isTrusted) this.gesto = agora(); };
      addEventListener('pointerdown', g, { capture: true, passive: true }); addEventListener('keydown', g, { capture: true, passive: true });
      const bd = $('#btnDesfazer');
      // pilha do ↶ do site vazia: esquece as horas dos movimentos; o botão ↶ desfaz o mais recente deles
      if (bd) {
        new MutationObserver(() => { if (bd.hidden) this.movs.length = 0; }).observe(bd, { attributes: true, attributeFilter: ['hidden'] });
        bd.addEventListener('click', () => { this.movs.pop(); this.ignTok = agora() + 600; }, true);
      }
    },
    ler(S, c) { let o = S.state; for (const k of c) { if (o == null) return undefined; o = o[k]; } return o; },
    anotar(S, c, antes) {
      const v = this.ler(S, c), cl = x => x === undefined ? null : JSON.parse(JSON.stringify(x));
      if (JSON.stringify(antes === undefined ? null : antes) === JSON.stringify(v === undefined ? null : v)) return;
      const ult = this.pilha[this.pilha.length - 1];
      const mud = { c: c.slice(), antes: cl(antes), depois: cl(v) };
      // várias gravações do mesmo toque viram um passo só
      if (ult && ult.g === this.gesto) { if (!ult.muds.some(m => m.c.join('/') === mud.c.join('/'))) ult.muds.push(mud); else ult.muds.find(m => m.c.join('/') === mud.c.join('/')).depois = mud.depois; }
      else { this.pilha.push({ g: this.gesto, ts: agora(), muds: [mud] }); if (this.pilha.length > 25) this.pilha.shift(); }
      clearTimeout(this.tb); this.tb = setTimeout(() => desenharBloco('blocoQolDesf'), 200);
    },
    rotulo(it) {
      const m = it.muds[0], k = m.c[0];
      if (k === 'salas' && /^c\d+$/.test(m.c[1] || '')) return `CN ${pad2(+m.c[1].slice(1))} ${m.depois ? 'revelada' : 'escondida'}`;
      if (k === 'ap') return `Apagão ${m.depois && m.depois.on ? 'ligado' : 'desligado'}`;
      if (k === 'amb') return `Ambiente: ${(m.depois && m.depois.el) || 'silêncio'}`;
      if (k === 'cond' && m.c[1]) return `Condição em ${rot(tokens()[m.c[1]] || { s: m.c[1] })}`;
      return (ROT_K[k] || k) + (it.muds.length > 1 ? ` (+${it.muds.length - 1})` : '');
    },
    desfazer(i) {
      const a = A(), S = a._int.Store; if (i == null) i = this.pilha.length - 1;
      const it = this.pilha[i]; if (!it) { aviso('Nada para desfazer.'); return false; }
      const mudou = it.muds.some(m => JSON.stringify(this.ler(S, m.c) ?? null) !== JSON.stringify(m.depois ?? null));
      if (mudou && !confirm(`“${this.rotulo(it)}” mudou depois disso. Desfazer mesmo assim?`)) return false;
      this.ignorando = true;
      try { it.muds.slice().reverse().forEach(m => this.orig.call(S, m.c, m.antes === undefined ? null : m.antes)); } finally { this.ignorando = false; }
      this.pilha.splice(i, 1);
      aviso(`↶ Desfeito: ${this.rotulo(it)}`);
      try { a._int.atualizarTudo(); } catch (e) {}
      desenharBloco('blocoQolDesf');
      return true;
    },
    // Ctrl+Z: o mais recente vence (movimento do site ou ação daqui)
    teclaZ(e) {
      if (!ehGM()) return false;
      const bd = $('#btnDesfazer'), temMov = bd && !bd.hidden;
      const ult = this.pilha[this.pilha.length - 1];
      if (!ult) { if (temMov) { this.movs.pop(); this.ignTok = agora() + 600; } return false; }
      if (temMov &&(this.movs[this.movs.length - 1] || 0) > ult.ts) { this.movs.pop(); this.ignTok = agora() + 600; return false; }
      e.preventDefault(); e.stopImmediatePropagation();
      this.desfazer();
      return true;
    },
    html() {
      return `<p class="qol-sub">Ctrl+Z desfaz o mais recente: movimento (o ↶ do mapa) ou uma destas ações. Só nesta tela, até recarregar.</p>` +
        (this.pilha.length ? `<ul class="qol-lista">${this.pilha.map((it, i) => [it, i]).reverse().map(([it, i]) => `<li><span class="qol-li-tx"><b>${esc(this.rotulo(it))}</b><small>${hora(it.ts)}</small></span><button type="button" class="qol-bt" data-qd="${i}">↶ Desfazer</button></li>`).join('')}</ul>` : '<p class="qol-vazio">Nada para desfazer ainda.</p>');
    },
    ligarC(c) { c.onclick = e => { const b = e.target.closest('[data-qd]'); if (b) this.desfazer(+b.dataset.qd); }; },
    resumo() { const n = this.pilha.length; return [['↶', n ? n + ' ação' + (n > 1 ? 'ões' : '') : 'nada']]; }
  };

  /* =========================================================
     18. RETRATO DA SESSÃO (Mestre): o mesmo pacote do backup do site, guardado neste aparelho (IndexedDB)
     ========================================================= */
  const Retrato = {
    db: null, lista: null,
    abrirDb() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((ok, erro) => {
        try {
          const r = indexedDB.open('acf-qol', 1);
          r.onupgradeneeded = () => { r.result.createObjectStore('retratos', { keyPath: 'id' }); };
          r.onsuccess = () => { this.db = r.result; ok(this.db); };
          r.onerror = () => erro(r.error);
        } catch (e) { erro(e); }
      });
    },
    async op(modo, fn) { const db = await this.abrirDb(); return new Promise((ok, erro) => { const tx = db.transaction('retratos', modo); const st = tx.objectStore('retratos'); const r = fn(st); tx.oncomplete = () => ok(r && r.result); tx.onerror = () => erro(tx.error); }); },
    async carregar() {
      try { const l = await this.op('readonly', st => st.getAll()); this.lista = (l || []).map(x => ({ id: x.id, nome: x.nome, ts: x.ts, n: x.n, dia: x.dia, kb: x.kb, pf: x.pf || 'mestre' })).sort((x, y) => y.ts - x.ts); }
      catch (e) { this.lista = []; this.erro = 'O navegador não deixou guardar dados aqui (janela anônima ou armazenamento bloqueado).'; }
      desenharBloco('blocoQolRetrato');
    },
    async salvar(nome) {
      const a = A(); if (!ehGM() || !a.pacoteBackup) return;
      try {
        const p = await a.pacoteBackup(); const txt = JSON.stringify(p);
        const it = { id: 'r' + agora().toString(36), nome: nome || `Antes da sessão ${dataC(agora())} ${hora(agora())}`, ts: agora(), n: Object.keys((p.mapa || {}).tokens || {}).length, dia: ((p.mapa || {}).ruido || {}).d || 1, kb: Math.round(txt.length / 1024), pf: ehMestre() ? 'mestre' : 'aux', p };
        await this.op('readwrite', st => st.put(it));
        // guarda os 8 mais novos
        const l = (await this.op('readonly', st => st.getAllKeys())) || [];
        if (l.length > 8) { const todos = await this.op('readonly', st => st.getAll()); todos.sort((x, y) => x.ts - y.ts).slice(0, todos.length - 8).forEach(x => this.op('readwrite', st => st.delete(x.id))); }
        aviso(`📸 Retrato guardado: ${it.nome}`);
      } catch (e) { aviso('Não deu para guardar o retrato neste aparelho.'); console.warn(e); }
      this.carregar();
    },
    async restaurar(id) {
      const a = A(); if (!ehGM()) return;
      try {
        const it = await this.op('readonly', st => st.get(id)); if (!it || !it.p) return aviso('Retrato não encontrado.');
        const txt = ehMestre()
          ? `${it.n} tokens, salas, ruído, dia, perseguição${it.pf === 'aux' ? '' : ', funções e anotações'} voltam a esse ponto, como no “Restaurar” do Backup.${it.pf === 'aux' ? ' Este retrato foi feito pela conta dos auxiliares: os seus segredos e os nomes secretos das salas ficam como estão.' : ''} Todos verão o mapa mudar. O diário atual é mantido.`
          : `${it.n} tokens, salas, portas, ruído, dia, perseguição, condições e ambiente voltam a esse ponto. Segredos, senhas e a configuração do Mestre não mudam. Todos verão o mapa mudar.`;
        if (!confirm(`Restaurar “${it.nome}” (${dataC(it.ts)} ${hora(it.ts)})?\n\n${txt}`)) return;
        a.restaurarPacote(it.p, 'do retrato local');
      } catch (e) { aviso('Não deu para ler o retrato.'); }
    },
    async baixar(id) {
      try { const it = await this.op('readonly', st => st.get(id)); if (!it) return; const u = URL.createObjectURL(new Blob([JSON.stringify(it.p, null, 1)], { type: 'application/json' })); const l = document.createElement('a'); l.href = u; l.download = `retrato-caixa-${dataC(it.ts).replace('/', '-')}-${hora(it.ts).replace(':', 'h')}.json`; l.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); } catch (e) {}
    },
    async apagar(id) { if (!confirm('Apagar este retrato deste aparelho?')) return; try { await this.op('readwrite', st => st.delete(id)); } catch (e) {} this.carregar(); },
    html() {
      if (this.lista === null) { this.carregar(); return '<p class="qol-vazio">Carregando…</p>'; }
      return `<p class="qol-sub">${ehMestre() ? 'Antes de começar, guarde um retrato do estado (o mesmo conteúdo do Backup). Se algo sair do rumo, um toque volta tudo.' : 'Antes de começar, guarde um retrato do estado do jogo. Se algo sair do rumo, um toque volta tokens, salas, portas, ruído, perseguição, condições e ambiente (segredos e configuração do Mestre não mudam).'} Fica só neste aparelho.</p>
        ${this.erro ? `<p class="qol-vazio">${esc(this.erro)}</p>` : ''}
        <div class="qol-linha"><button type="button" class="qol-bt qol-prim" data-qrt="novo">📸 Preparar sessão (guardar agora)</button><button type="button" class="qol-bt" data-qrt="nomeado">✎ Com nome…</button></div>
        ${this.lista.length ? `<ul class="qol-lista">${this.lista.map(r => `<li><span class="qol-li-tx"><b>${esc(r.nome)}</b><small>${dataC(r.ts)} ${hora(r.ts)} · ${r.n} tokens · dia ${r.dia} · ${r.kb} KB${r.pf === 'aux' ? ' · auxiliar' : ''}</small></span><button type="button" class="qol-bt" data-qrt-res="${r.id}">↺ Restaurar</button><button type="button" class="qol-ic" data-qrt-bx="${r.id}" aria-label="Baixar">⬇</button><button type="button" class="qol-ic" data-qrt-del="${r.id}" aria-label="Apagar">🗑</button></li>`).join('')}</ul>` : '<p class="qol-vazio">Nenhum retrato guardado neste aparelho.</p>'}`;
    },
    ligar(c) {
      c.onclick = e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.qrt === 'novo') this.salvar();
        if (b.dataset.qrt === 'nomeado') { const n = (prompt('Nome do retrato:', 'Antes da sessão') || '').trim().slice(0, 50); if (n) this.salvar(n); }
        if (b.dataset.qrtRes) this.restaurar(b.dataset.qrtRes);
        if (b.dataset.qrtBx) this.baixar(b.dataset.qrtBx);
        if (b.dataset.qrtDel) this.apagar(b.dataset.qrtDel);
      };
    },
    resumo() { const l = this.lista; return l && l.length ? [['📸', l.length + ' retrato' + (l.length > 1 ? 's' : '')], ['🕒', dataC(l[0].ts) + ' ' + hora(l[0].ts)]] : [['📸', 'nenhum retrato']]; }
  };

  /* =========================================================
     17. BUSCA UNIVERSAL (Ctrl+K): salas, tokens, fichas, sons, objetos, ferramentas e macros
     ========================================================= */
  const Busca = {
    itens: [], sel: 0,
    fontes() {
      const a = A(), out = [], mestre = ehMestre(), gm = ehGM();
      for (let cn = 1; cn <= 125; cn++) {
        let vis = false; try { vis = mestre || a.salaVisivel(cn); } catch (e) {}
        if (!vis) continue;
        const nome = a.nomeSala(cn);
        out.push({ ic: '🚪', t: nome, d: `${Math.ceil(cn / 25)}º andar`, k: 'sala', fn: () => { if (s3dAberto() && gm) Sala3D.abrir(cn, { a: Math.ceil(cn / 25), livre: true }); else { if (s3dAberto()) Sala3D.fechar(); a.focarSala(cn); } } });
      }
      Object.entries(tokens()).forEach(([id, tk]) => {
        const s = SER(tk.s); if (!s) return; try { if (!a.visivelPara(tk)) return; } catch (e) { return; }
        const cn = a.salaDe(id);
        out.push({ ic: s.tipo === 'cobaia' ? '🧍' : s.tipo === 'filho' ? '🩸' : s.tipo === 'robo' ? '🤖' : '👤', t: rot(tk), d: (cn ? 'CN ' + pad2(cn) : tk.a ? tk.a + 'º andar' : 'fora do mapa') + ' · ' + (s.tipo || ''), k: 'token',
          fn: () => { if (s3dAberto()) { if (gm && cn) Sala3D.abrir(cn, { a: tk.a, livre: true }); return; } a.focarToken(id); a.selecionar(id); } });
      });
      const FX = window.ACF_FICHAS;
      if (FX) {
        if (mestre) out.push({ ic: '📋', t: 'Fichas dos jogadores', d: 'fichas', k: 'ficha', fn: () => FX.abrir('jogadores') });
        if (gm) out.push({ ic: '☠', t: 'Ameaças e Filhos', d: 'fichas', k: 'ficha', fn: () => FX.abrir('aux') });
        if (mestre) Object.values(a.SER || {}).filter(s => s.tipo === 'cobaia').forEach(s => out.push({ ic: '📋', t: 'Ficha: ' + s.nome, d: 'fichas dos jogadores' + (s.jogador ? ' · ' + s.jogador : ''), k: 'ficha', fn: () => FX.abrir('jogadores') }));
        let idx = []; try { idx = JSON.parse(localStorage.getItem('acf-fichas-minhas') || '[]') || []; } catch (e) {}
        idx.filter(r => r && r.nome).forEach(r => out.push({ ic: '📋', t: 'Ficha: ' + r.nome, d: 'minhas fichas', k: 'ficha', fn: () => FX.abrir('minhas') }));
      }
      if (gm) {
        const amb = $$('#mesaAmb [data-mi="amb"], #mesaAmb [data-mi="amb-som"], #mesaAmb [data-mi="amb-fx"]');
        if (amb.length) amb.forEach(b => { const n = (b.textContent || '').trim(); const lin = b.closest('li'); const nome = b.dataset.mi === 'amb' ? 'Ambiente: ' + (n || 'silêncio') : (lin ? (lin.querySelector('span') || lin).textContent.trim().slice(0, 40) : '') + ' · ' + n; out.push({ ic: '🔊', t: nome, d: 'som', k: 'som', fn: () => b.click() }); });
        else out.push({ ic: '🔊', t: 'Sons e ambiente', d: 'abre o cartão Ambiente', k: 'som', fn: () => abrirCartao('blocoMesaAmb', 'mesa') });
      }
      Object.entries(((a.estado || {}).itens3d) || {}).forEach(([k, it]) => { if (!it || !it.n || !(mestre || gm)) return; out.push({ ic: '🎒', t: it.n, d: `objeto · CN ${pad2(it.cn)}`, k: 'objeto', fn: () => { if (s3dAberto()) Sala3D.abrir(it.cn, { a: it.a, livre: true }); else a.focarSala(it.cn); } }); });
      $$('#painel > .bloco').forEach(b => { if (!b.id || b.hidden && !b.classList.contains('fora-da-aba')) return; if (b.hidden) return; const h = $('h2', b); const t = (h ? h.textContent : '').replace(/[☆★?]/g, '').trim(); if (!t) return; out.push({ ic: '🧰', t, d: 'ferramenta do painel', k: 'ferr', fn: () => abrirCartao(b.id, b.dataset.aba) }); });
      Macros.todas().forEach(m => out.push({ ic: '⚡', t: m.nome, d: 'macro', k: 'macro', fn: () => Macros.rodar(m.id) }));
      return out;
    },
    abrir() {
      if (!perfil()) return;
      const j = janela('qolBusca', 'qol-busca');
      if (document.pointerLockElement) document.exitPointerLock();
      this.base = this.fontes();
      j.innerHTML = `<div class="qol-busca-caixa"><span aria-hidden="true">🔎</span><input type="search" placeholder="Salas, tokens, fichas, sons, objetos, ferramentas…" aria-label="Buscar em tudo" autocomplete="off" spellcheck="false">${toque() ? '<button type="button" class="qol-x" data-qbx aria-label="Fechar a busca">✕</button>' : '<kbd>Esc</kbd>'}</div><ul class="qol-busca-l" role="listbox"></ul>${toque() ? '' : '<p class="qol-sub">↑ ↓ escolhe · Enter abre · Ctrl+K abre de qualquer lugar</p>'}`;
      j.hidden = false;
      const inp = $('input', j);
      inp.oninput = () => { this.sel = 0; this.filtrar(inp.value); };
      inp.onkeydown = e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); this.sel = Math.min(this.itens.length - 1, this.sel + 1); this.pintar(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); this.sel = Math.max(0, this.sel - 1); this.pintar(); }
        else if (e.key === 'Enter') { e.preventDefault(); this.escolher(this.sel); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.fechar(); }
      };
      $('.qol-busca-l', j).onclick = e => { const li = e.target.closest('[data-qb]'); if (li) this.escolher(+li.dataset.qb); };
      j.onclick = e => { if (e.target === j || e.target.closest('[data-qbx]')) this.fechar(); };
      this.filtrar(''); setTimeout(() => { try { inp.focus(); } catch (e) {} }, 20);
    },
    fechar() { const j = $('#qolBusca'); if (j) j.hidden = true; },
    filtrar(q) {
      const termos = semAc(q).split(/\s+/).filter(Boolean);
      const pont = it => { const s = semAc(it.t + ' ' + it.d); if (!termos.every(t => s.includes(t))) return -1; const t0 = semAc(it.t); return termos.reduce((p, t) => p + (t0.startsWith(t) ? 3 : t0.includes(t) ? 2 : 1), 0); };
      const ordemK = { token: 0, sala: 1, ficha: 2, som: 3, objeto: 4, macro: 5, ferr: 6 };
      this.itens = (termos.length ? this.base.map(it => [it, pont(it)]).filter(x => x[1] >= 0).sort((x, y) => y[1] - x[1] || ordemK[x[0].k] - ordemK[y[0].k]).map(x => x[0]) : this.base.filter(it => it.k === 'token' || it.k === 'macro').concat(this.base.filter(it => it.k === 'ferr').slice(0, 6))).slice(0, 40);
      this.pintar();
    },
    pintar() {
      const ul = $('#qolBusca .qol-busca-l'); if (!ul) return;
      ul.innerHTML = this.itens.length ? this.itens.map((it, i) => `<li role="option" data-qb="${i}" class="${i === this.sel ? 'on' : ''}" aria-selected="${i === this.sel}"><i aria-hidden="true">${it.ic}</i><b>${esc(it.t)}</b><small>${esc(it.d)}</small></li>`).join('') : '<li class="qol-vazio">Nada encontrado.</li>';
      const on = $('li.on', ul); if (on) on.scrollIntoView({ block: 'nearest' });
    },
    escolher(i) { const it = this.itens[i]; if (!it) return; this.fechar(); try { it.fn(); } catch (e) { console.warn(e); } }
  };
  function abrirCartao(id, aba) {
    if (s3dAberto()) { try { Sala3D.fechar(); } catch (e) {} }
    if (aba && ehMestre()) { const b = $(`#abasMestre [data-aba="${aba}"]`); if (b && !b.classList.contains('ativo')) b.click(); }
    const p = $('#painel'); if (p && innerWidth <= 860) p.classList.add('aberto');
    setTimeout(() => { if (window.ACF_PN) ACF_PN.abrir(id); const b = document.getElementById(id); if (b && b.classList.contains('fechado')) { const h = $('h2', b); if (h) h.click(); } if (b) b.scrollIntoView({ block: 'nearest' }); }, 60);
  }

  /* =========================================================
     CARTÕES NOVOS DO PAINEL (montados só quando abertos)
     ========================================================= */
  const BLOCOS = {
    blocoQolAgora: { t: 'Agora', cls: 'mestre-aux', aba: 'registro', depois: 'blocoDesemp', html: () => Agora.html(), ligar: c => Agora.ligar(c), resumo: () => Agora.resumo(), vivo: true },
    blocoQolMacros: { t: 'Macros', cls: 'mestre-aux', aba: 'sessao', html: () => Macros.html(), ligar: c => Macros.ligar(c), resumo: () => Macros.resumo() },
    blocoQolDesf: { t: 'Desfazer ações', cls: 'mestre-aux', aba: 'sessao', html: () => Desf.html(), ligar: c => Desf.ligarC(c), resumo: () => Desf.resumo() },
    blocoQolRetrato: { t: 'Retrato da sessão', cls: 'mestre-aux', aba: 'segredos', depois: 'blocoBackup', html: () => Retrato.html(), ligar: c => Retrato.ligar(c), resumo: () => Retrato.resumo() },
    blocoQolAux: { t: 'Controle rápido', cls: 'qol-so-aux', html: () => auxBlocoHtml(), ligar: c => auxBlocoLigar(c), resumo: () => { const id = Aux.atual(); return [['🎮', id ? rot(tokens()[id]) : 'nenhum'], ['⇄', Aux.controlaveis().length + ' disponíveis']]; }, vivo: true },
    blocoQolMapa: { t: 'Mapa mental', cls: 'qol-so-jog', html: () => Mapa.blocoHtml(), ligar: c => { c.onclick = e => { const b = e.target.closest('[data-qm-ir],[data-qm-ed]'); if (!b) return; if (b.dataset.qmEd) return Mapa.editar(+b.dataset.qmEd); A().focarSala(+b.dataset.qmIr); }; }, resumo: () => { const n = Object.keys(Mapa.todas()).length; return [['🧠', n ? n + ' anotaç' + (n > 1 ? 'ões' : 'ão') : 'nenhuma anotação']]; } }
  };
  function auxBlocoHtml() {
    const cur = Aux.atual(), l = Aux.controlaveis();
    const rc = cur && (SER(tokens()[cur].s) || {}).tipo === 'filho' ? Aux.recargas(cur) : [];
    return `<p class="qol-sub">${toque() ? 'Toque para controlar.' : 'Teclas 1 a 9 no mapa; no 3D, J e depois o número.'} O painel flutuante mostra estado, alvo e distância.</p>
      ${l.length ? `<ol class="qol-troca-l">${l.map(([id, tk], i) => { const s = SER(tk.s) || {}; return `<li><button type="button" data-qt-id="${esc(id)}" class="${id === cur ? 'on' : ''}"><kbd>${i + 1}</kbd><span class="qol-hud-cor" style="--c:${esc(s.cor || '#8b5cf6')}"></span><b>${esc(rot(tk))}</b><small>${s.tipo === 'robo' ? 'robô' : 'Filho'}</small></button></li>`; }).join('')}</ol>` : '<p class="qol-vazio">Nenhum Filho ou robô seu no mapa.</p>'}
      ${rc.length ? `<h3 class="qol-h">Recargas</h3><div class="qol-hud-rc">${rc.map(r => `<span class="qol-rc ${r.cls}"><i aria-hidden="true">${r.i}</i>${esc(r.n)}<small>${esc(r.st)}</small></span>`).join('')}</div>` : ''}
      <div class="qol-linha"><button type="button" class="qol-bt" data-qa-fr>💬 Frases rápidas</button><button type="button" class="qol-bt" data-qa-busca>🔎 Buscar (Ctrl+K)</button></div>`;
  }
  function auxBlocoLigar(c) { c.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.qtId) Aux.escolher(b.dataset.qtId); if (b.hasAttribute('data-qa-fr')) Frases.abrir(); if (b.hasAttribute('data-qa-busca')) Busca.abrir(); }; }

  let fechQol = ls.get('acf-qol-fech', {});
  function criarBlocos() {
    const painel = $('#painel'); if (!painel) return;
    Object.entries(BLOCOS).forEach(([id, cfg]) => {
      if (document.getElementById(id)) return;
      const s = document.createElement('section');
      s.className = 'bloco qol-bloco ' + cfg.cls; s.id = id; s.hidden = true;
      if (cfg.aba) s.dataset.aba = cfg.aba;
      s.innerHTML = `<h2 class="dobra" tabindex="0">${esc(cfg.t)}</h2><div class="qol-corpo"></div>`;
      if (fechQol[id] !== false) s.classList.add('fechado');
      const h = $('h2', s);
      const alt = e => { if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; if (e.target.closest('.bloco-fav, .pn-q2')) return; e.preventDefault(); s.classList.toggle('fechado'); fechQol[id] = s.classList.contains('fechado'); ls.set('acf-qol-fech', fechQol); desenharBloco(id); };
      h.addEventListener('click', alt); h.addEventListener('keydown', alt);
      const ref = cfg.depois && document.getElementById(cfg.depois);
      if (ref && ref.parentElement === painel) ref.after(s); else painel.appendChild(s);
      new MutationObserver(() => desenharBloco(id)).observe(s, { attributes: true, attributeFilter: ['class', 'hidden'] });
    });
    visBlocos();
  }
  // quem vê cada cartão (o site esconde .mestre-only e .mestre-aux; os de jogador e de auxiliar são daqui)
  function visBlocos() {
    const p = perfil();
    Object.entries(BLOCOS).forEach(([id, cfg]) => {
      const s = document.getElementById(id); if (!s) return;
      const quer = cfg.cls === 'mestre-only' ? p === 'mestre' : cfg.cls === 'mestre-aux' ? (p === 'mestre' || p === 'aux') : cfg.cls === 'qol-so-aux' ? p === 'aux' : cfg.cls === 'qol-so-jog' ? p === 'jog' : false;
      if (s.hidden === quer) s.hidden = !quer;
      if (s.dataset.aba) { const ab = $('#abasMestre button.ativo'); s.classList.toggle('fora-da-aba', p === 'mestre' && !!ab && ab.dataset.aba !== s.dataset.aba); }
    });
  }
  const visivelBloco = s => s && !s.hidden && (s.classList.contains('pn-aberto') || (!(window.ACF_PN && ACF_PN.ligado) && !s.classList.contains('fechado') && !s.classList.contains('fora-da-aba')));
  function desenharBloco(id) {
    const s = document.getElementById(id), cfg = BLOCOS[id]; if (!s || !cfg) return;
    const c = $('.qol-corpo', s);
    if (!visivelBloco(s)) { if (c.firstChild && !s.classList.contains('pn-aberto')) { c.innerHTML = ''; c.dataset.h = ''; } return; }
    const h = cfg.html();
    if (c.dataset.h !== h) { c.innerHTML = h; c.dataset.h = h; cfg.ligar(c); }
  }
  pecas.push({ ativo: () => true, atualizar: () => { Object.keys(BLOCOS).forEach(id => { if (BLOCOS[id].vivo || id === 'blocoQolMapa') desenharBloco(id); }); } });
  // resumo para os chips do cartão (paineis.js chama a cada redesenho; guardado por 1 s)
  const cacheRes = {};
  function resumo(id) {
    const cfg = BLOCOS[id]; if (!cfg) return [];
    const c = cacheRes[id]; if (c && agora() - c.ts < 1000) return c.r;
    let r = []; try { r = cfg.resumo() || []; } catch (e) {}
    cacheRes[id] = { ts: agora(), r }; return r;
  }

  /* =========================================================
     TECLADO: um ouvinte só (fora do 3D) e a mesma função dentro do 3D (extensão da vista)
     P ficha rápida · Ctrl+K busca · J troca (aux) · 1-9 escolhe · U frases (aux) · Ctrl+Z desfaz (Mestre)
     ========================================================= */
  function tecla(e, no3D) {
    const k = (e.key || '').toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && !e.shiftKey && !e.altKey && k === 'k') { e.preventDefault(); e.stopImmediatePropagation(); const j = $('#qolBusca'); if (j && !j.hidden) Busca.fechar(); else Busca.abrir(); return true; }
    if (ctrl && !e.shiftKey && !e.altKey && k === 'z' && !no3D && !emCampo(e.target) && !body.classList.contains('qd-aberto') && !body.classList.contains('fx-aberta')) return Desf.teclaZ(e);
    if (ctrl || e.altKey || e.repeat) return false;
    if (emCampo(e.target)) return false;
    if (k === 'escape') {
      for (const id of ['qolBusca', 'qolMapaEd', 'qolFrases', 'qolTroca', 'qolFicha']) { const j = document.getElementById(id); if (j && !j.hidden) { j.hidden = true; if (id === 'qolFicha') Ficha.aberta = false; if (id === 'qolTroca') Aux.listaAberta = false; e.preventDefault(); e.stopImmediatePropagation(); return true; } }
      return false;
    }
    if (!no3D && (body.classList.contains('fx-aberta') || body.classList.contains('qd-aberto') || $('dialog[open]'))) return false;
    if (k === 'p' && ehJog()) { e.preventDefault(); Ficha.alternar(); return true; }
    if (ehAux()) {
      if (/^[1-9]$/.test(k)) {
        const lista = $('#qolTroca');
        if (lista && !lista.hidden) { e.preventDefault(); e.stopImmediatePropagation(); return Aux.porNumero(+k); }
        const fr = $('#qolFrases'); if (fr && !fr.hidden) { const t = Frases.lista()[+k - 1]; if (t) { e.preventDefault(); e.stopImmediatePropagation(); Frases.enviar(t); return true; } }
        if (!no3D) { e.preventDefault(); return Aux.porNumero(+k); }
        return false;   // no 3D os números são as habilidades do controlado
      }
      if (k === 'j') { e.preventDefault(); Aux.listaAberta ? Aux.fecharLista() : Aux.abrirLista(); return true; }
      if (k === 'u') { e.preventDefault(); Frases.alternar(); return true; }
    }
    return false;
  }
  addEventListener('keydown', e => { if (s3dAberto() && $('#s3d') && !$('#s3d').hidden && !(e.ctrlKey || e.metaKey)) return; tecla(e, false); }, true);

  /* =========================================================
     EXTENSÃO DA VISTA 3D: pílula da ficha, ações por perto, painel do auxiliar, teclas e menu
     ========================================================= */
  const Ext3D = {
    iniciar(api) {
      try {
        const d = $('#s3d'); if (!d) return;
        let pil = $('#qolPil', d);
        if (!pil) { pil = document.createElement('button'); pil.type = 'button'; pil.id = 'qolPil'; pil.className = 'qol-pil'; pil.setAttribute('aria-label', 'Ficha rápida (P)'); pil.title = 'Ficha rápida (P)'; pil.addEventListener('click', () => Ficha.alternar()); }
        // a pílula entra logo embaixo do nome da sala
        const tit = $('.s3d-tit', d) || d; if (pil.parentElement !== tit) tit.appendChild(pil);
        pil.hidden = !ehJog(); if (ehJog()) { pil.innerHTML = Ficha.pilulaHtml(); pil.dataset.sg = sigFicha(); }
        Perto.iniciar(api);
        ['qolFicha', 'qolVez', 'qolHud', 'qolBusca', 'qolFrases', 'qolTroca', 'qolMapaEd'].forEach(id => { const j = document.getElementById(id); if (j) d.appendChild(j); });
        aoEstado();
      } catch (e) { console.warn('qol 3D:', e); }
    },
    fechar() {
      Perto.fechar();
      ['qolFicha', 'qolVez', 'qolHud', 'qolBusca', 'qolFrases', 'qolTroca', 'qolMapaEd'].forEach(id => { const j = document.getElementById(id); if (j) body.appendChild(j); });
      setTimeout(aoEstado, 50);
    },
    tecla(k, id, e) { return tecla(e, true); },
    menu(add, q) {
      if (q === 'jog') add('📋', 'Ficha rápida', () => Ficha.abrir(), 'P');
      if (q === 'aux') { add('⇄', 'Trocar o controlado', () => Aux.abrirLista(), 'J'); add('💬', 'Frases rápidas', () => Frases.abrir(), 'U'); }
      if (q === 'mestre' || q === 'aux') add('🔎', 'Buscar em tudo', () => Busca.abrir(), 'Ctrl+K');
    }
  };
  (window.ACF3D = window.ACF3D || {}).vista = window.ACF3D.vista || [];
  window.ACF3D.vista.push(Ext3D);
  // pílula da ficha no 3D acompanha a ficha ativa
  // só recalcula quando a ficha ativa muda (evento do site) ou quando mudam as condições da cobaia
  let verAtiva = 0; document.addEventListener('acf-ativa', () => { verAtiva++; });
  const sigFicha = () => verAtiva + '|' + JSON.stringify((((A() || {}).estado || {}).cond || {})[(A() || {}).meu] || null);
  pecas.push({ ativo: () => ehJog() && s3dAberto(), atualizar: () => { const p = $('#qolPil'); if (!p) return; const sg = sigFicha(); if (p.dataset.sg === sg) return; p.dataset.sg = sg; p.innerHTML = Ficha.pilulaHtml(); p.hidden = false; } });

  /* =========================================================
     LIGA TUDO
     ========================================================= */
  function botaoBusca() {
    const barra = $('#painel .painel-barra'); if (!barra || $('#qolBtBusca')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'qolBtBusca'; b.className = 'pb-btn qol-pb-busca'; b.textContent = '🔎';
    b.title = 'Buscar em tudo: salas, tokens, fichas, sons, objetos (Ctrl+K)'; b.setAttribute('aria-label', 'Buscar em tudo');
    b.addEventListener('click', () => Busca.abrir());
    const ref = $('[data-pb="recolher"]', barra); if (ref) ref.before(b); else barra.appendChild(b);
  }
  function aoPerfil() {
    visBlocos();
    body.classList.toggle('qol-jog', ehJog()); body.classList.toggle('qol-aux', ehAux()); body.classList.toggle('qol-mestre', ehMestre());
    if (!ehJog()) Ficha.fechar();
    if (!ehAux()) { Aux.fecharLista(); const f = $('#qolFrases'); if (f) f.hidden = true; }
    const bb = $('#qolBtBusca'); if (bb) bb.hidden = !ehGM();
    Retomar.feito = false;
    Desf.calma = agora() + 2500;   // o que o site grava sozinho ao entrar (loja semeada, ajustes) não entra no Desfazer
    Mapa.marcas = ''; aoEstado();
  }
  function iniciar() {
    if (!window.ACF || !ACF._int) return setTimeout(iniciar, 150);
    criarBlocos();
    ligarGanchoSala();
    Desf.ligar();
    SoMapa.botao();
    botaoBusca();
    document.addEventListener('acf-perfil', () => setTimeout(aoPerfil, 40));
    const abas = $('#abasMestre'); if (abas) abas.addEventListener('click', e => { if (e.target.closest('[data-aba]')) setTimeout(visBlocos, 0); });
    aoPerfil();
  }
  criarBlocos();   // os cartões entram no painel antes do "load" (estrelas e lançador já os encontram)
  if (document.readyState === 'complete') setTimeout(iniciar, 200); else addEventListener('load', () => setTimeout(iniciar, 200));

  window.ACF_QOL = { Ficha, Vez, Mapa, SoMapa, Retomar, Perto, Aux, Frases, Agora, Macros, Desf, Retrato, Busca, resumo, abrirCartao, desenharBloco, BLOCOS, criarBlocos, janela, aviso, ehGM, perfil };
})();
