/* comando.js · ferramentas de comando do Mestre e dos auxiliares
   1. ORDENS: o Mestre (e os auxiliares entre si) manda uma ordem curta a um auxiliar ou a todos, com atalho de
      token e de sala. Ramo "ordens" (só Mestre e auxiliares leem e gravam; o auxiliar só muda o estado de uma
      ordem já mandada; o Mestre apaga as que passaram de 2 h). Ouve só as 30 últimas (limitToLast).
   2. PILOTO AUTOMÁTICO por Filho: seguir a cobaia mais próxima que o Filho percebe, patrulhar entre duas salas ou
      ficar parado vigiando. Roda SÓ no aparelho de quem ligou (o dono fica em privado/piloto/<Filho>, para outra
      tela não rodar junto; se o dono sai, o servidor apaga o registro e o piloto para). Anda pelas MESMAS regras
      do arraste e do 3D (moverToken3D do site: paredes, portas, vez e metros da perseguição, características dos
      Filhos). Não ataca: chega perto e avisa quem ligou.
   Desempenho: um timer só para todos os pilotos (4 por segundo para andar, 2 por segundo para decidir), nada no
   laço de quadro do 3D, parado com a aba oculta; a grade de caminhos de cada andar é calculada uma vez e só muda
   quando muda uma porta ou uma barricada; a posição só vai ao servidor quando muda de verdade (no máximo 4 vezes
   por segundo, pela própria regra do moverToken3D). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = () => window.ACF;
  const Q = () => window.ACF_QOL;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad2 = n => String(n).padStart(2, '0');
  const agora = () => Date.now();
  const hora = ts => { const d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
  const perfil = () => { const a = A(); if (!a) return ''; return a.mestre ? 'mestre' : a.aux ? 'aux' : a.meu ? 'jog' : ''; };
  const ehGM = () => perfil() === 'mestre' || perfil() === 'aux';
  const eu = () => { const a = A(); return a.mestre ? 'mestre' : a.aux || ''; };
  const tokens = () => ((A() || {}).estado || {}).tokens || {};
  const SER = id => ((A() || {}).SER || {})[id] || null;
  const rot = tk => { try { return A().rotulo(tk); } catch (e) { return (SER(tk && tk.s) || {}).nome || '?'; } };
  const nomeDe = id => id === 'mestre' ? 'Mestre' : id === 'todos' ? 'todos os auxiliares' : (SER(id) || {}).nome || id;
  const aviso = t => { try { if (Q() && Q().aviso) Q().aviso(t); else A().aviso(t); } catch (e) {} };
  const s3dAberto = () => !!(window.Sala3D && Sala3D.aberta);
  const ls = { get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  /* =========================================================
     1. ORDENS
     ========================================================= */
  const DUAS_H = 2 * 3600e3;
  const ROBOS = () => Object.values((A() || {}).SER || {}).filter(s => s.tipo === 'robo').map(s => s.id);
  const Ordens = {
    v: {}, off: null, tErro: 0, limpou: 0, vistas: new Set(ls.get('acf-cmd-vistas', [])), aberta: false,
    ligar() {
      if (!ehGM()) return this.parar();
      if (this.off) return;
      const a = A();
      const erro = () => { this.off = null; clearTimeout(this.tErro); this.tErro = setTimeout(() => this.ligar(), 5000); };
      if (a.firebase) {
        const S = a._int.Store; if (!S.db || !S.auth || !S.auth.currentUser) { clearTimeout(this.tErro); this.tErro = setTimeout(() => this.ligar(), 1500); return; }
        const q = S.db.ref('ordens').limitToLast(30), h = s => this.chegou(s.val() || {});
        q.on('value', h, erro);
        this.off = () => { try { q.off('value', h); } catch (e) {} };
      } else {
        this.off = a.Rede.on('ordens', v => { const o = v || {}, r = {}; Object.keys(o).sort().slice(-30).forEach(k => { r[k] = o[k]; }); this.chegou(r); }, erro);
      }
    },
    parar() { if (this.off) { this.off(); this.off = null; } this.v = {}; this.pintarAviso(); },
    lista() { return Object.entries(this.v || {}).filter(([, o]) => o && o.t).sort((x, y) => (y[1].ts || 0) - (x[1].ts || 0)); },
    paraMim(o) { const me = eu(); return !!me && perfil() === 'aux' && o.de !== me && (o.para === me || o.para === 'todos'); },
    pendentes() { return this.lista().filter(([k, o]) => o.st === 'pend' && this.paraMim(o) && agora() - (o.ts || 0) < DUAS_H); },
    chegou(v) {
      const antes = this.v || {}; this.v = v || {};
      const me = eu();
      // quem mandou fica sabendo da resposta (uma vez, discreto)
      Object.entries(this.v).forEach(([k, o]) => { const a0 = antes[k]; if (o && a0 && a0.st === 'pend' && o.st !== 'pend' && o.de === me) aviso(`📨 ${nomeDe(o.por || o.para)} ${o.st === 'feito' ? 'cumpriu' : 'recusou'}: ${String(o.t).slice(0, 60)}`); });
      // Mestre: limpa as ordens com mais de 2 h (no máximo uma vez a cada 10 min)
      if (perfil() === 'mestre' && agora() - this.limpou > 600e3) this.limpar();
      this.pintarAviso(); this.pintarLista();
    },
    async limpar() {
      this.limpou = agora();
      try {
        const tudo = (await A().Rede.once('ordens')) || {}, upd = {};
        Object.entries(tudo).forEach(([k, o]) => { if (!o || !o.ts || agora() - o.ts > DUAS_H) upd[k] = null; });
        if (Object.keys(upd).length) await A().Rede.update('ordens', upd);
      } catch (e) { console.warn('ordens: limpeza', e && e.message); }
    },
    mandar(para, t, tk, cn) {
      t = String(t || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!ehGM() || !t) { aviso('Escreva a ordem.'); return false; }
      const o = { de: eu() || 'mestre', para: para || 'todos', t, ts: agora(), st: 'pend' };
      if (tk && tokens()[tk]) o.tk = String(tk).slice(0, 24);
      const n = parseInt(cn, 10); if (n >= 1 && n <= 125) o.cn = n;
      A().Rede.push('ordens', o).pronto.then(() => aviso(`📨 Ordem para ${nomeDe(o.para)}.`)).catch(e => { console.warn('ordens:', e && e.message); aviso('O servidor recusou a ordem.'); });
      return true;
    },
    responder(k, st) {
      const o = this.v[k]; if (!o || o.st !== 'pend') return;
      o.st = st; this.pintarAviso();
      A().Rede.update('ordens/' + k, { st, por: eu() || 'mestre', rts: agora() }).catch(e => { console.warn('ordens:', e && e.message); aviso('O servidor recusou a resposta.'); });
    },
    // texto curto da ordem com os atalhos
    txt(o, comAtalho) {
      const tk = o.tk && tokens()[o.tk];
      const at = [tk ? '🎯 ' + rot(tk) : (o.tk ? '🎯 (fora do mapa)' : ''), o.cn ? '🚪 CN ' + pad2(o.cn) : ''].filter(Boolean);
      return esc(o.t) + (comAtalho && at.length ? ` <small class="cmd-at">${esc(at.join(' · '))}</small>` : '');
    },
    ir(o) {
      const a = A();
      try {
        if (o.tk && tokens()[o.tk]) { if (s3dAberto()) { const cn = a.salaDe(o.tk); if (cn && !Sala3D.estado.ctrl) Sala3D.abrir(cn, { a: tokens()[o.tk].a, livre: true }); } else { a.focarToken(o.tk); a.selecionar(o.tk); } }
        else if (o.cn) { if (s3dAberto()) { if (!Sala3D.estado.ctrl) Sala3D.abrir(o.cn, { a: Math.ceil(o.cn / 25), livre: true }); } else a.focarSala(o.cn); }
      } catch (e) {}
    },
    // cartão discreto do auxiliar: a ordem pendente mais nova, com Feito / Recusar (depois de 15 s vira só um botão
    // com a contagem; um toque abre de novo)
    el: null,
    pintarAviso() {
      const pend = ehGM() ? this.pendentes() : [];
      if (!pend.length) { if (this.el) this.el.hidden = true; return; }
      if (!this.el) {
        this.el = document.createElement('div'); this.el.id = 'cmdAviso'; this.el.className = 'cmd-aviso'; this.el.setAttribute('role', 'status'); this.el.setAttribute('aria-live', 'polite');
        this.el.addEventListener('click', e => {
          const b = e.target.closest('[data-ca]'); if (!b) return;
          const k = b.dataset.k, o = this.v[k];
          if (b.dataset.ca === 'feito') this.responder(k, 'feito');
          if (b.dataset.ca === 'recusar') this.responder(k, 'recusada');
          if (b.dataset.ca === 'ir' && o) this.ir(o);
          if (b.dataset.ca === 'min') { this.min = !this.min; this.pintarAviso(); }
        });
      }
      const alvo = s3dAberto() && $('#s3d') ? $('#s3d') : document.body; if (this.el.parentElement !== alvo) alvo.appendChild(this.el);
      const [k, o] = pend[0];
      // ordem nova: vibra de leve uma vez (sem som)
      if (!this.vistas.has(k)) { this.vistas.add(k); ls.set('acf-cmd-vistas', [...this.vistas].slice(-60)); this.min = false; try { navigator.vibrate && navigator.vibrate(40); } catch (e) {} clearTimeout(this.tMin); this.tMin = setTimeout(() => { if (!this.min && this.el && !this.el.hidden && !this.el.matches(':hover')) { this.min = true; this.pintarAviso(); } }, 15000); }
      const h = this.min
        ? `<button type="button" class="cmd-min" data-ca="min" aria-label="Mostrar a ordem">📨 ${pend.length} ordem${pend.length > 1 ? 's' : ''}</button>`
        : `<div class="cmd-av-cab"><b>📨 ${esc(nomeDe(o.de))}${o.para === 'todos' ? ' · para todos' : ''}</b><small>${hora(o.ts)}${pend.length > 1 ? ` · +${pend.length - 1}` : ''}</small><button type="button" class="qol-x" data-ca="min" aria-label="Recolher">▾</button></div>
          <p class="cmd-av-t">${this.txt(o, true)}</p>
          <div class="cmd-av-bt">${(o.tk && tokens()[o.tk]) || o.cn ? `<button type="button" data-ca="ir" data-k="${esc(k)}">📍 Ver</button>` : ''}<button type="button" class="ok" data-ca="feito" data-k="${esc(k)}">✓ Feito</button><button type="button" data-ca="recusar" data-k="${esc(k)}">✕ Recusar</button></div>`;
      if (this.el.dataset.h !== h) { this.el.innerHTML = h; this.el.dataset.h = h; }
      this.el.classList.toggle('cmd-av-min', !!this.min);
      this.el.hidden = false;
    },
    // lista do cartão do painel (Mestre vê o estado de cada ordem)
    pintarLista() {
      const c = $('#blocoCmdOrdens .cmd-lista'); if (!c || !c.offsetParent) return;
      const l = this.lista().slice(0, 12), me = eu();
      const st = o => o.st === 'pend' ? '<span class="qol-chip">⏳ pendente</span>' : o.st === 'feito' ? `<span class="qol-chip vivo">✓ ${esc(nomeDe(o.por))}</span>` : `<span class="qol-chip alerta">✕ ${esc(nomeDe(o.por))}</span>`;
      const h = l.length ? `<ul class="qol-lista cmd-ul">${l.map(([k, o]) => `<li><span class="qol-li-tx"><b>${esc(nomeDe(o.de))} → ${esc(nomeDe(o.para))}</b><span>${this.txt(o, true)}</span><small>${hora(o.ts)}</small></span>${st(o)}${o.st === 'pend' && this.paraMim(o) ? `<button type="button" class="qol-ic" data-cl="feito" data-k="${esc(k)}" aria-label="Feito">✓</button><button type="button" class="qol-ic" data-cl="recusar" data-k="${esc(k)}" aria-label="Recusar">✕</button>` : ''}</li>`).join('')}</ul>` : '<p class="qol-vazio">Nenhuma ordem nas últimas 2 h.</p>';
      if (c.dataset.h !== h) { c.innerHTML = h; c.dataset.h = h; }
      void me;
    },
    formHtml() {
      const robos = ROBOS().filter(id => id !== eu());
      return `<form class="cmd-nova" autocomplete="off">
          <label class="cmd-campo">Para <select data-co="para"><option value="todos">Todos os auxiliares</option>${robos.map(id => `<option value="${esc(id)}">${esc(nomeDe(id))}</option>`).join('')}</select></label>
          <label class="cmd-campo cmd-largo">Ordem <input data-co="t" maxlength="200" placeholder="Ex.: vai para a sala e espera" enterkeyhint="send"></label>
          <div class="cmd-atalhos"><label class="cmd-campo">Token <select data-co="tk"><option value="">nenhum</option></select></label><label class="cmd-campo cmd-cn">CN <input data-co="cn" type="number" inputmode="numeric" min="1" max="125" placeholder="14"></label></div>
          <div class="qol-chips cmd-rapidas" aria-label="Começos rápidos">${['vai para', 'segue', 'ataca', 'espera', 'recua'].map(f => `<button type="button" data-cq="${esc(f)}">${esc(f)}</button>`).join('')}</div>
          <div class="qol-linha"><button type="submit" class="qol-bt qol-prim">📨 Mandar</button></div>
        </form>
        <h3 class="qol-h">Últimas ordens</h3><div class="cmd-lista"></div>
        <h3 class="qol-h">Pilotos ligados</h3><div class="cmd-pils"></div>`;
    },
    opcoesToken(sel) {
      const atual = sel.value, a = A();
      const l = Object.entries(tokens()).filter(([, tk]) => { const s = SER(tk.s); return s && tk.a && ['filho', 'robo', 'cobaia', 'npc'].includes(s.tipo); })
        .sort((x, y) => rot(x[1]).localeCompare(rot(y[1])));
      const h = '<option value="">nenhum</option>' + l.map(([id, tk]) => `<option value="${esc(id)}">${esc(rot(tk))}${a.salaDe(id) ? ' · CN ' + pad2(a.salaDe(id)) : ''}</option>`).join('');
      if (sel.dataset.h !== h) { sel.innerHTML = h; sel.dataset.h = h; sel.value = atual; }
    },
    ligarCartao(c) {
      const f = $('form', c); if (!f) return;
      const tk = $('[data-co="tk"]', f); tk.addEventListener('focus', () => this.opcoesToken(tk)); tk.addEventListener('pointerdown', () => this.opcoesToken(tk)); this.opcoesToken(tk);
      f.onsubmit = e => { e.preventDefault(); if (this.mandar($('[data-co="para"]', f).value, $('[data-co="t"]', f).value, tk.value, $('[data-co="cn"]', f).value)) { $('[data-co="t"]', f).value = ''; $('[data-co="cn"]', f).value = ''; tk.value = ''; } };
      c.addEventListener('click', e => {
        const q = e.target.closest('[data-cq]'); if (q) { const i = $('[data-co="t"]', f); i.value = (q.dataset.cq + ' ' + i.value.replace(/^(vai para|segue|ataca|espera|recua)\s*/i, '')).trim() + ' '; i.focus(); return; }
        const b = e.target.closest('[data-cl]'); if (b) this.responder(b.dataset.k, b.dataset.cl === 'feito' ? 'feito' : 'recusada');
        const p = e.target.closest('[data-cp-parar]'); if (p) Piloto.desligar(p.dataset.cpParar, true);
      });
      this.pintarLista(); Piloto.pintarLista();
    }
  };

  /* =========================================================
     2. PILOTO AUTOMÁTICO
     ========================================================= */
  const DEV = (() => { try { let d = sessionStorage.getItem('acf-cmd-dev'); if (!d) { d = 'd' + agora().toString(36) + Math.random().toString(36).slice(2, 7); sessionStorage.setItem('acf-cmd-dev', d); } return d; } catch (e) { return 'd' + agora().toString(36); } })();
  const MODOS = { seguir: 'Seguir a cobaia mais próxima que ele percebe', patrulha: 'Patrulhar entre duas salas', vigiar: 'Ficar parado vigiando' };
  const MODO_CURTO = { seguir: 'seguindo', patrulha: 'patrulhando', vigiar: 'vigiando' };
  const CEL = 0.5;            // grade dos caminhos (unidades da planta)
  const VEL = 1.4;            // unidades por segundo (andar normal)
  const PERTO = 1.2;          // para a esta distância da cobaia (cerca de 1,7 m) e avisa
  const VELHO = 180e3;        // registro de dono sem sinal há 3 min: outra tela pode assumir
  const Piloto = {
    meus: new Map(), timer: 0, n: 0, grades: new Map(), escolha: {}, abertos: new Set(),
    st: { decisoes: 0, passos: 0, escritas: 0, msDecidir: 0, msMover: 0, msGrade: 0, grades: 0, t0: 0 },
    regs() { return (((A() || {})._int || {}).Priv || {}).dados ? (A()._int.Priv.dados.piloto || {}) : {}; },
    reg(id) { return this.regs()[id] || null; },
    livre(r) { return !r || r.d === DEV || agora() - (r.ts || 0) > VELHO; },
    quemNome() { const a = A(); return a.mestre ? 'Mestre' : (SER(a.aux) || {}).nome || 'Auxiliar'; },
    ligar(id, cfg) {
      cfg = cfg || {};
      const a = A(), tk = tokens()[id], s = tk && SER(tk.s);
      if (!ehGM()) return 'Só o Mestre e os auxiliares ligam o piloto.';
      if (!tk || !s || s.tipo !== 'filho') return 'O piloto automático é só para Filhos no mapa.';
      try { if (!a.podeMover(tk)) return 'Você não pode mover esse Filho.'; } catch (e) { return 'Você não pode mover esse Filho.'; }
      const r = this.reg(id);
      if (!this.livre(r) && !cfg.assumir) return `Já está no piloto de ${r.n || 'outra tela'}.`;
      const m = MODOS[cfg.m] ? cfg.m : 'seguir';
      const p = { id, m, a: tk.a, avisou: new Set(), vistos: new Set(), rota: null, st: 'começando', falhas: 0, andou: false, n: 0 };
      if (m === 'patrulha') {
        const x = parseInt(cfg.x, 10), y = parseInt(cfg.y, 10);
        if (!(x >= 1 && x <= 125 && y >= 1 && y <= 125) || x === y) return 'Escolha duas salas diferentes (CN).';
        if (Math.ceil(x / 25) !== tk.a || Math.ceil(y / 25) !== tk.a) return `As duas salas precisam ser do ${tk.a}º andar, onde o Filho está.`;
        p.x = x; p.y = y; p.vai = x;
      }
      const reg = { d: DEV, m, ts: agora(), n: this.quemNome() };
      if (p.x) { reg.x = p.x; reg.y = p.y; }
      this.meus.set(id, p);
      a._int.Priv.gravar(['piloto', id], reg);
      // o dono saiu (aba fechada, rede caiu): o servidor apaga o registro sozinho
      try { if (a.firebase) a._int.Store.db.ref('privado/piloto/' + id).onDisconnect().remove(); } catch (e) {}
      if (!this.st.t0) this.st.t0 = performance.now();
      this.agendar(0);
      this.batida();
      aviso(`🧭 Piloto ligado: ${rot(tk)} ${MODO_CURTO[m]}.`);
      this.redesenhar();
      return '';
    },
    // tira o piloto; "remoto": desliga também o de outra tela (Mestre e auxiliares)
    desligar(id, remoto, motivo) {
      const p = this.meus.get(id), a = A();
      if (p) {
        this.meus.delete(id);
        // a última posição vai ao servidor e a caminhada vira um passo só do ↶ do site
        try { const tk = tokens()[id]; if (tk && p.andou) a.moverToken3D(id, tk.x, tk.y, true); } catch (e) {}
        try { if (a.firebase) a._int.Store.db.ref('privado/piloto/' + id).onDisconnect().cancel(); } catch (e) {}
      }
      const r = this.reg(id);
      if (r && (r.d === DEV || remoto)) a._int.Priv.gravar(['piloto', id], null);
      if (p && motivo) aviso(`🧭 Piloto de ${rot(tokens()[id] || { s: id })} parou: ${motivo}.`);
      if (!this.meus.size) { clearTimeout(this.timer); this.timer = 0; }
      this.redesenhar();
    },
    pararTodos(motivo) { [...this.meus.keys()].forEach(id => this.desligar(id, false, motivo)); },
    // sinal de vida do dono, a cada minuto (para outra tela saber que ele ainda está aqui)
    tBatida: 0,
    batida() {
      if (this.tBatida) return;
      this.tBatida = setInterval(() => {
        if (!this.meus.size) { clearInterval(this.tBatida); this.tBatida = 0; return; }
        const upd = {}; this.meus.forEach((p, id) => { if (this.reg(id) && this.reg(id).d === DEV) upd[id + '/ts'] = agora(); });
        if (Object.keys(upd).length) A().Rede.update('privado/piloto', upd).catch(() => {});
      }, 60e3);
    },
    agendar(ms) {
      if (this.timer || !this.meus.size || document.hidden) return;
      this.timer = setTimeout(() => { this.timer = 0; this.tick(); }, ms == null ? 250 : ms);
    },
    tick() {
      if (!this.meus.size || document.hidden) return;
      const t0 = performance.now(), a = A(), S = a._int.Store;
      const decide = (this.n++ % 2) === 0;
      this.meus.forEach((p, id) => {
        const tk = tokens()[id];
        if (!tk) return this.desligar(id, false, 'saiu do mapa');
        try { if (!a.podeMover(tk)) return this.desligar(id, false, 'você não pode mais movê-lo'); } catch (e) { return; }
        // outra tela assumiu ou desligou
        const r = this.reg(id); if (a._int.Priv.pronto && (!r || r.d !== DEV)) { this.meus.delete(id); aviso(`🧭 Piloto de ${rot(tk)} desligado por outra tela.`); this.redesenhar(); return; }
        if (tk.a !== p.a) { p.a = tk.a; p.rota = null; if (p.m === 'patrulha') return this.desligar(id, false, 'mudou de andar'); }
        if (s3dAberto() && (Sala3D.estado || {}).ctrl === id) { p.st = 'pausado: você controla no 3D'; return; }
        const srv0 = this.srv(S, id);
        if (decide) { const d0 = performance.now(); this.decidir(p, id, tk); this.st.decisoes++; this.st.msDecidir += performance.now() - d0; }
        const m0 = performance.now(); this.mover(p, id, tk); this.st.msMover += performance.now() - m0;
        if (this.srv(S, id) !== srv0) this.st.escritas++;
      });
      if (this.meus.size) this.agendar();
      void t0;
    },
    srv(S, id) { const t = (S.privTok || {})[id] || ((S.pub || {}).tokens || {})[id]; return t ? t.x + ',' + t.y : ''; },
    // perseguição: só anda na vez do Filho; fora dela (ou com a vez gasta) fica parado
    naVez(p, id, tk) {
      const a = A(), P = (a.estado || {}).persg || {};
      if (!P.on || !a.participa(id)) return true;
      if (a.vez !== id) { p.st = 'esperando a vez (perseguição)'; return false; }
      const lim = a.limiteDe(id); if (lim && (tk.m || 0) >= lim - 0.001) { p.st = `deslocamento da vez gasto (${lim} m)`; return false; }
      return true;
    },
    // cobaias que este Filho percebe no andar (as mesmas regras de visão dos Filhos do site)
    percebidas(id, tk) {
      const a = A(), out = [];
      Object.entries(tokens()).forEach(([cid, c]) => {
        const s = SER(c.s); if (!s || s.tipo !== 'cobaia' || c.a !== tk.a || c.h || !c.a) return;
        let ve = true; try { ve = a.visivelAoFilho(c, id); } catch (e) { ve = false; }
        if (ve) out.push({ id: cid, tk: c, d: Math.hypot(c.x - tk.x, c.y - tk.y) });
      });
      return out.sort((x, y) => x.d - y.d);
    },
    avisar(p, txt) { aviso(txt); try { navigator.vibrate && navigator.vibrate(50); } catch (e) {} p.ultAviso = txt; },
    decidir(p, id, tk) {
      const a = A();
      if (p.m === 'vigiar') {
        p.dest = null; p.rota = null;
        const cnF = a.salaDe(id), l = this.percebidas(id, tk).filter(c => (cnF && a.salaDe(c.id) === cnF) || c.d <= 4);
        const agoraV = new Set(l.map(c => c.id));
        l.forEach(c => { if (!p.vistos.has(c.id)) this.avisar(p, `👁 ${rot(tk)} vê ${rot(c.tk)}${a.salaDe(c.id) ? ' (CN ' + pad2(a.salaDe(c.id)) + ')' : ''}.`); });
        p.vistos = agoraV;
        p.st = l.length ? 'vê ' + l.map(c => rot(c.tk)).join(', ') : 'vigiando, ninguém à vista';
        return;
      }
      if (!this.naVez(p, id, tk)) { p.dest = null; return; }
      if (p.m === 'seguir') {
        const l = this.percebidas(id, tk), c = l[0];
        if (!c) { p.dest = null; p.rota = null; p.alvo = null; p.st = 'nenhuma cobaia à vista'; return; }
        p.alvo = c.id;
        l.forEach(o => { if (o.d > PERTO * 2.5) p.avisou.delete(o.id); });
        if (c.d <= PERTO + 0.05) {
          p.dest = null; p.rota = null;
          p.st = `perto de ${rot(c.tk)}: a ação é sua`;
          if (!p.avisou.has(c.id)) { p.avisou.add(c.id); this.avisar(p, `🩸 ${rot(tk)} chegou perto de ${rot(c.tk)}. O piloto não ataca: a ação é sua.`); }
          return;
        }
        p.dest = { x: c.tk.x, y: c.tk.y }; p.st = `seguindo ${rot(c.tk)}`;
      } else if (p.m === 'patrulha') {
        const r = a.geo.retSala(p.vai - 25 * (tk.a - 1)), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        if (Math.hypot(cx - tk.x, cy - tk.y) < 0.6) { p.vai = p.vai === p.x ? p.y : p.x; p.rota = null; return this.decidir(p, id, tk); }
        p.dest = { x: cx, y: cy }; p.st = `patrulhando: indo para CN ${pad2(p.vai)}`;
      }
      // caminho: recalcula só quando o destino muda de célula, a grade muda ou o passo bateu na parede
      const g = this.grade(tk.a), meta = this.cel(p.dest.x, p.dest.y);
      if (!p.rota || p.meta !== meta || p.gsig !== g.sig || p.refazer) {
        p.rota = this.caminho(g, tk, p.dest); p.meta = meta; p.gsig = g.sig; p.refazer = false;
        p.bloq = !!(p.rota && p.rota.bloq);
        if (!p.rota) { p.st = 'porta fechada no caminho: esperando'; p.dest = null; }
      }
      if (p.bloq) p.st += ' (porta fechada no caminho: vai até perto dela)';
    },
    mover(p, id, tk) {
      const a = A();
      if (!p.rota || !p.rota.length || !p.dest) { this.firmar(p, id); return; }
      if (p.m === 'seguir' && p.alvo) { const c = tokens()[p.alvo]; if (c && Math.hypot(c.x - tk.x, c.y - tk.y) <= PERTO) { p.rota = null; this.firmar(p, id); return; } }
      if (!this.naVez(p, id, tk)) { this.firmar(p, id); return; }
      let passo = VEL * 0.25, x = tk.x, y = tk.y;
      // segue os pontos da rota, gastando o passo
      while (passo > 0 && p.rota.length) {
        const w = p.rota[0], d = Math.hypot(w.x - x, w.y - y);
        if (d <= passo) { x = w.x; y = w.y; passo -= d; p.rota.shift(); }
        else { x += (w.x - x) * passo / d; y += (w.y - y) * passo / d; passo = 0; }
      }
      // no modo seguir, não encosta: para a PERTO da cobaia
      if (p.m === 'seguir' && p.alvo && tokens()[p.alvo]) { const c = tokens()[p.alvo], d = Math.hypot(c.x - x, c.y - y); if (d < PERTO) { const k = (PERTO - d) / Math.max(0.001, Math.hypot(x - tk.x, y - tk.y)); x -= (x - tk.x) * Math.min(1, k); y -= (y - tk.y) * Math.min(1, k); } }
      if (Math.hypot(x - tk.x, y - tk.y) < 0.01) return;
      let r; try { r = a.moverToken3D(id, x, y, false); } catch (e) { r = { ok: false, motivo: String(e) }; }
      if (r && r.ok) { p.andou = true; p.sujo = true; p.falhas = 0; this.st.passos++; if (r.esgotou) { p.st = `deslocamento da vez gasto (${r.lim} m)`; this.firmar(p, id); } return; }
      p.falhas++;
      if (r && r.parede) p.refazer = true;
      else if (r && r.motivo) p.st = r.motivo;
      if (p.falhas > 8) { p.st = 'preso: não acha passagem'; p.rota = null; p.dest = null; }
    },
    // parou de andar: a última posição (que o moverToken3D guardou só na tela) vai ao servidor, se mudou
    firmar(p, id) {
      if (!p.sujo) return; p.sujo = false;
      try { const tk = tokens()[id]; if (tk) A()._int.Store.definir(['tokens', id], tk, ['x', 'y', 'm']); } catch (e) {}
    },
    /* ---------- grade e caminho (por andar; muda só com portas e barricadas) ---------- */
    cel(x, y) { return Math.floor(y / CEL) * 1000 + Math.floor(x / CEL); },
    // base de cada andar (salas, corredores e a saída, desenhadas uma vez); a cada mudança de porta ou barricada,
    // só as células dos corredores são conferidas de novo pela regra do site (andavel: portas, barricadas)
    bases: new Map(),
    base(an) {
      let b = this.bases.get(an); if (b) return b;
      const a = A(), G = a.geo, nx = Math.ceil(G.W / CEL), ny = Math.ceil(G.H / CEL), ok = new Uint8Array(nx * ny), corr = [];
      const pinta = (r, lista) => {
        if (!r) return;
        const i0 = Math.max(0, Math.ceil(r.x / CEL - 0.5)), i1 = Math.min(nx - 1, Math.floor((r.x + r.w) / CEL - 0.5));
        const j0 = Math.max(0, Math.ceil(r.y / CEL - 0.5)), j1 = Math.min(ny - 1, Math.floor((r.y + r.h) / CEL - 0.5));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const c = j * nx + i; if (lista && !ok[c]) lista.push(c); ok[c] = 1; }
      };
      for (let p = 1; p <= 25; p++) pinta(G.retSala(p));
      try { pinta(G.retSaida(an)); } catch (e) {}
      const salas = new Uint8Array(ok);
      (G.CORREDORES || []).forEach(c => pinta(c, corr));
      b = { nx, ny, ok, corr: corr.filter(c => !salas[c]) };
      this.bases.set(an, b);
      return b;
    },
    grade(an) {
      const a = A(), e = a.estado || {}, pre = 'a' + an + 'c';
      const portas = Object.entries(e.portas || {}).filter(([k]) => k.startsWith(pre)).sort().join(';');
      const barr = Object.entries(e.barricadas || {}).filter(([, v]) => v && v.a === an).map(([k]) => k).sort().join(';');
      const sig = portas + '|' + barr;
      const g0 = this.grades.get(an); if (g0 && g0.sig === sig) return g0;
      const t0 = performance.now(), b = this.base(an), ok = new Uint8Array(b.ok);
      for (const c of b.corr) { const i = c % b.nx, j = (c - i) / b.nx; try { ok[c] = a.andavel(an, (i + 0.5) * CEL, (j + 0.5) * CEL) ? 1 : 0; } catch (er) { ok[c] = 0; } }
      const g = { sig, nx: b.nx, ny: b.ny, ok };
      this.grades.set(an, g); this.st.grades++; this.st.msGrade += performance.now() - t0;
      return g;
    },
    perto(g, i, j) {
      // célula andável mais próxima (até 3 células em volta)
      if (i >= 0 && j >= 0 && i < g.nx && j < g.ny && g.ok[j * g.nx + i]) return j * g.nx + i;
      for (let r = 1; r <= 3; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        const x = i + di, y = j + dj; if (x < 0 || y < 0 || x >= g.nx || y >= g.ny) continue; if (g.ok[y * g.nx + x]) return y * g.nx + x;
      }
      return -1;
    },
    caminho(g, tk, dest) {
      const a = A(), nx = g.nx;
      const s = this.perto(g, Math.floor(tk.x / CEL), Math.floor(tk.y / CEL)), t = this.perto(g, Math.floor(dest.x / CEL), Math.floor(dest.y / CEL));
      if (s < 0 || t < 0) return null;
      const veio = new Int32Array(g.ok.length).fill(-1); veio[s] = s;
      const fila = new Int32Array(g.ok.length); let ini = 0, fim = 0; fila[fim++] = s;
      while (ini < fim) {
        const c = fila[ini++]; if (c === t) break;
        const ci = c % nx, cj = (c - ci) / nx;
        if (ci > 0 && g.ok[c - 1] && veio[c - 1] < 0) { veio[c - 1] = c; fila[fim++] = c - 1; }
        if (ci < nx - 1 && g.ok[c + 1] && veio[c + 1] < 0) { veio[c + 1] = c; fila[fim++] = c + 1; }
        if (cj > 0 && g.ok[c - nx] && veio[c - nx] < 0) { veio[c - nx] = c; fila[fim++] = c - nx; }
        if (cj < g.ny - 1 && g.ok[c + nx] && veio[c + nx] < 0) { veio[c + nx] = c; fila[fim++] = c + nx; }
      }
      // não dá para chegar (porta fechada no caminho): vai até o ponto alcançável mais perto do destino e espera ali
      let fimC = t;
      if (veio[t] < 0) {
        let melhor = -1, md = Infinity;
        for (let q = 0; q < fim; q++) { const c = fila[q], d = Math.hypot((c % nx + 0.5) * CEL - dest.x, (Math.floor(c / nx) + 0.5) * CEL - dest.y); if (d < md) { md = d; melhor = c; } }
        if (melhor < 0 || melhor === s) return null;
        fimC = melhor; dest = { x: (melhor % nx + 0.5) * CEL, y: (Math.floor(melhor / nx) + 0.5) * CEL, bloq: true };
      }
      const pts = []; for (let c = fimC; c !== s; c = veio[c]) pts.push({ x: (c % nx + 0.5) * CEL, y: (Math.floor(c / nx) + 0.5) * CEL });
      pts.reverse();
      if (Math.hypot(dest.x - (pts.length ? pts[pts.length - 1].x : tk.x), dest.y - (pts.length ? pts[pts.length - 1].y : tk.y)) < CEL) pts.push({ x: dest.x, y: dest.y });
      // atalhos em linha reta onde a planta deixa (mesma conferência das paredes do site; poucas por rota)
      const out = []; let de = { x: tk.x, y: tk.y }, i = 0;
      while (i < pts.length) {
        let k = Math.min(pts.length - 1, i + 14);
        while (k > i) { let livre = false; try { livre = a.andavel(tk.a, pts[k].x, pts[k].y) && this.reta(tk.a, de, pts[k]); } catch (e) {} if (livre) break; k--; }
        out.push(pts[k]); de = pts[k]; i = k + 1;
      }
      out.bloq = !!dest.bloq;
      return out;
    },
    reta(an, p, q) {
      const a = A(), n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 0.2));
      for (let i = 1; i <= n; i++) if (!a.andavel(an, p.x + (q.x - p.x) * i / n, p.y + (q.y - p.y) * i / n)) return false;
      return true;
    },
    stats() { const s = this.st, dt = (performance.now() - (s.t0 || performance.now())) / 1000; return { ...s, seg: +dt.toFixed(1), escritasPorSeg: dt ? +(s.escritas / dt).toFixed(2) : 0, decisoesPorSeg: dt ? +(s.decisoes / dt).toFixed(2) : 0, msPorSeg: dt ? +((s.msDecidir + s.msMover) / dt).toFixed(2) : 0, pilotos: this.meus.size }; },
    /* ---------- interface: cartão do Filho e lista no cartão Ordens ---------- */
    estadoTxt(id) {
      const p = this.meus.get(id); if (p) return `${MODO_CURTO[p.m]} · ${p.st}`;
      const r = this.reg(id); if (r && !this.livre(r)) return `${MODO_CURTO[r.m] || r.m} · em outra tela (${r.n || '?'})`;
      return '';
    },
    cartaoHtml(id, tk) {
      if (!ehGM()) return '';
      const s = SER(tk.s); if (!s || s.tipo !== 'filho') return '';
      try { if (!A().podeMover(tk)) return ''; } catch (e) { return ''; }
      const p = this.meus.get(id), r = this.reg(id), outro = !p && r && !this.livre(r);
      if (p || outro) return `<div class="cmd-pil cartao-sec"><p><strong>🧭 Piloto automático</strong> <small>${esc(this.estadoTxt(id))}</small></p><div class="acoes"><button type="button" data-cp="parar">■ Desligar o piloto</button></div></div>`;
      const e = this.escolha[id] || { m: 'seguir' };
      const cn = A().salaDe(id) || '';
      return `<details class="cmd-pil cartao-sec"${this.abertos.has(id) ? ' open' : ''}><summary>🧭 Piloto automático</summary>
        <p class="mini">Anda sozinho pelas mesmas regras do arraste (paredes, portas e a vez da perseguição) e só neste aparelho. Não ataca: chega perto e avisa você.</p>
        <label class="campo-linha">Modo <select data-cp="m">${Object.entries(MODOS).map(([k, n]) => `<option value="${k}" ${e.m === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        ${e.m === 'patrulha' ? `<div class="cmd-pat"><label>De CN <input data-cp="x" type="number" inputmode="numeric" min="1" max="125" value="${esc(e.x || cn)}"></label><label>até CN <input data-cp="y" type="number" inputmode="numeric" min="1" max="125" value="${esc(e.y || '')}"></label></div>` : ''}
        <div class="acoes"><button type="button" data-cp="ligar">▶ Ligar o piloto</button></div></details>`;
    },
    ligarCartao(c, id) {
      const raiz = $('.cmd-pil', c); if (!raiz) return;
      if (raiz.tagName === 'DETAILS') raiz.ontoggle = () => { if (raiz.open) this.abertos.add(id); else this.abertos.delete(id); };
      const e = this.escolha[id] = this.escolha[id] || { m: 'seguir' };
      const sm = $('[data-cp="m"]', raiz); if (sm) sm.onchange = () => { e.m = sm.value; Piloto.abertos.add(id); A().redesenharCartao(); };
      ['x', 'y'].forEach(k => { const i = $(`[data-cp="${k}"]`, raiz); if (i) i.oninput = () => { e[k] = i.value; }; });
      raiz.querySelectorAll('[data-cp="ligar"],[data-cp="parar"]').forEach(b => b.onclick = () => {
        if (b.dataset.cp === 'parar') { this.desligar(id, true); return; }
        const x = $('[data-cp="x"]', raiz), y = $('[data-cp="y"]', raiz);
        const m = this.ligar(id, { m: e.m, x: x ? x.value : e.x, y: y ? y.value : e.y, assumir: true });
        if (m) aviso(m);
      });
    },
    pintarLista() {
      const c = $('#blocoCmdOrdens .cmd-pils'); if (!c || !c.offsetParent) return;
      const ids = new Set([...Object.keys(this.regs()), ...this.meus.keys()]);
      const l = [...ids].filter(id => tokens()[id] && (this.meus.has(id) || !this.livre(this.reg(id))));
      const h = l.length ? `<ul class="qol-lista">${l.map(id => `<li><span class="qol-li-tx"><b>${esc(rot(tokens()[id]))}</b><small>${esc(this.estadoTxt(id))}${this.meus.has(id) ? ' · nesta tela' : ''}</small></span><button type="button" class="qol-bt" data-cp-parar="${esc(id)}">■ Desligar</button></li>`).join('')}</ul>` : '<p class="qol-vazio">Nenhum. Ligue pelo cartão de um Filho (toque nele no mapa).</p>';
      if (c.dataset.h !== h) { c.innerHTML = h; c.dataset.h = h; }
    },
    tRed: 0,
    redesenhar() { if (this.tRed) return; this.tRed = setTimeout(() => { this.tRed = 0; try { A().redesenharCartao(); } catch (e) {} this.pintarLista(); }, 120); }
  };

  /* =========================================================
     LIGA TUDO
     ========================================================= */
  function aoPerfil() {
    if (!ehGM()) { Piloto.pararTodos(); Ordens.parar(); return; }
    Ordens.ligar();
    // registros antigos desta mesma aba (recarregou): não há piloto rodando aqui, então saem
    setTimeout(() => { const regs = Piloto.regs(); Object.entries(regs).forEach(([id, r]) => { if (r && r.d === DEV && !Piloto.meus.has(id)) A()._int.Priv.gravar(['piloto', id], null); }); }, 2500);
  }
  function iniciar() {
    if (!window.ACF || !ACF._int || !window.ACF_QOL || !ACF_QOL.BLOCOS) return setTimeout(iniciar, 150);
    const Q2 = ACF_QOL;
    Q2.BLOCOS.blocoCmdOrdens = { t: 'Ordens e pilotos', cls: 'mestre-aux', aba: 'sessao', html: () => Ordens.formHtml(), ligar: c => Ordens.ligarCartao(c),
      resumo: () => { const l = Ordens.lista(), p = l.filter(([, o]) => o.st === 'pend').length, n = Piloto.meus.size + Object.keys(Piloto.regs()).filter(id => !Piloto.meus.has(id) && !Piloto.livre(Piloto.reg(id))).length; return [['📨', p ? p + ' pendente' + (p > 1 ? 's' : '') : 'nada pendente', p ? 'alerta' : ''], ['🧭', n ? n + ' piloto' + (n > 1 ? 's' : '') : 'sem piloto', n ? 'vivo' : '']]; } };
    if (Q2.criarBlocos) Q2.criarBlocos();
    A().ganchoToken({ html: (id, tk) => Piloto.cartaoHtml(id, tk), ligar: (c, id) => Piloto.ligarCartao(c, id) });
    document.addEventListener('acf-perfil', () => setTimeout(aoPerfil, 60));
    // mudanças do estado (com folga): o cartão discreto acompanha o 3D, e a lista acompanha os pilotos
    let tEst = 0;
    A().aoMudar(() => { if (tEst || !ehGM()) return; tEst = setTimeout(() => { tEst = 0; if (!ehGM()) return; Ordens.pintarAviso(); Ordens.pintarLista(); Piloto.pintarLista(); }, 400); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { Piloto.agendar(); Ordens.pintarAviso(); } });
    addEventListener('pagehide', () => { Piloto.meus.forEach((p, id) => { try { A()._int.Priv.gravar(['piloto', id], null); } catch (e) {} }); });
    // a vista 3D: o cartão da ordem entra e sai dela junto
    (window.ACF3D = window.ACF3D || {}).vista = window.ACF3D.vista || [];
    window.ACF3D.vista.push({ iniciar() { Ordens.pintarAviso(); }, fechar() { setTimeout(() => Ordens.pintarAviso(), 50); } });
    aoPerfil();
  }
  if (document.readyState === 'complete') setTimeout(iniciar, 250); else addEventListener('load', () => setTimeout(iniciar, 250));

  window.ACF_CMD = { Ordens, Piloto, DEV };
})();
