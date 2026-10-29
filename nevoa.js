/* nevoa.js · Névoa de guerra (estilo Owlbear) e molduras dos tokens (estilo Token Stamp)

   NÉVOA DE GUERRA
   - O Mestre liga ou desliga por andar, no cartão de qualquer sala daquele andar.
   - Com a névoa ligada, o JOGADOR vê claras só as salas por onde a cobaia DELE já passou
     (e a sala onde ela está agora). As outras ficam escuras, sem nome, e as fichas que
     estiverem dentro delas somem da tela dele.
   - A tela do Mestre anota as visitas em mapa/visitas/<ficha>/cNN (hora da visita).
     O aparelho do jogador também guarda as próprias visitas (vale mesmo se o Mestre cair).
   - "Limpar névoa" faz todos esquecerem as visitas daquele andar (mapa/nevoa/aN.desde).
   - Mestre e auxiliares veem tudo. A tela da mesa (?tv) e quem não tem cobaia veem a soma
     das visitas de todas as cobaias.
   - Limite honesto: é um véu na TELA. As posições continuam no mapa público do Firebase.

   MOLDURAS
   - Moldura redonda na cor da ficha, com aro dourado e brilho. Liga/desliga em ⚙ Aparência
     (vale só para este aparelho). Os Filhos continuam com a borda tracejada de sempre. */
(() => {
  'use strict';
  const A = () => window.ACF;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ls = {
    get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ================= molduras ================= */
  const molduraLigada = () => ls.get('acf-moldura', true);
  const aplicarMoldura = () => document.body.classList.toggle('tokens-moldura', !!molduraLigada());
  aplicarMoldura();
  let tentativas = 0;
  (function menuMoldura() {
    const m = $('.pb-menu');
    if (!m) { if (++tentativas < 30) setTimeout(menuMoldura, 500); return; }
    if ($('[data-moldura]', m)) return;
    const l = document.createElement('label');
    l.className = 'chave';
    l.innerHTML = '<input type="checkbox" data-moldura><span>Molduras nos tokens (aro na cor de cada token)</span>';
    const linha = $('.pb-linha', m);
    linha ? m.insertBefore(l, linha) : m.appendChild(l);
    const i = $('input', l);
    i.checked = !!molduraLigada();
    i.addEventListener('change', () => { ls.set('acf-moldura', i.checked); aplicarMoldura(); });
  })();

  /* ================= névoa ================= */
  const andarDe = cn => Math.ceil(cn / 25);
  const cfg = a => (((A().estado || {}).nevoa) || {})['a' + a] || null;     // { on, desde }
  const ligada = a => !!(cfg(a) && cfg(a).on);
  const desde = a => (cfg(a) && cfg(a).desde) || 0;
  const visitas = () => (A().estado || {}).visitas || {};
  const ehCobaia = tk => !!(tk && A().SER[tk.s] && A().SER[tk.s].tipo === 'cobaia');
  const fichas = () => (A().estado || {}).tokens || {};
  const nomeDe = id => { const tk = fichas()[id], s = tk && A().SER[tk.s]; return s ? s.nome : id; };

  // quem "enxerga" por esta tela: a própria cobaia, ou (mesa / sem cobaia) todas as cobaias
  const contam = () => { const a = A(); return a.meu ? [a.meu] : Object.keys(fichas()).filter(id => ehCobaia(fichas()[id])); };
  const chaveLocal = id => 'acf-visitas-' + id;

  // salas já vistas no andar (respeitando o último "Limpar névoa")
  function vistas(andar) {
    const d = desde(andar), out = new Set(), a = A();
    contam().forEach(id => {
      Object.entries(visitas()[id] || {}).forEach(([k, ts]) => { if (ts >= d) out.add(k); });
      const cn = a.salaDe(id); if (cn) out.add('c' + cn);
    });
    if (a.meu) Object.entries(ls.get(chaveLocal(a.meu), {})).forEach(([k, marca]) => { if (marca >= d) out.add(k); });
    return out;
  }
  const veTudo = () => { const a = A(); return !a || a.mestre || !!a.aux; };
  // para o cartão da sala: a sala está escura para quem olha?
  function escondida(cn) {
    if (veTudo()) return false;
    const a = andarDe(cn);
    return ligada(a) && !vistas(a).has('c' + cn);
  }

  // o Mestre anota as visitas das cobaias (uma escrita por sala nova)
  function anotarMestre() {
    const a = A(); if (!a.mestre) return;
    const vis = visitas();
    Object.entries(fichas()).forEach(([id, tk]) => {
      if (!ehCobaia(tk)) return;
      const cn = a.salaDe(id); if (!cn) return;
      const v = (vis[id] || {})['c' + cn];
      if (v && v >= desde(andarDe(cn))) return;
      a.definir(['visitas', id, 'c' + cn], Date.now());
    });
  }
  // o aparelho do jogador guarda as próprias visitas (marca = o "desde" em vigor, sem depender do relógio)
  function anotarLocal() {
    const a = A(); if (!a.meu || a.mestre) return;
    const cn = a.salaDe(a.meu); if (!cn) return;
    const m = ls.get(chaveLocal(a.meu), {}), d = desde(andarDe(cn));
    if (m['c' + cn] !== undefined && m['c' + cn] >= d) return;
    m['c' + cn] = d; ls.set(chaveLocal(a.meu), m);
  }

  function aplicar() {
    const a = A(); if (!a) return;
    const andar = a.andarAtual;
    const ativo = !veTudo() && ligada(andar);
    document.body.classList.toggle('com-nevoa', ativo);
    const salas = $$('#stage .sala[data-cn]');
    if (!ativo) {
      salas.forEach(s => s.classList.remove('nevoa'));
      $$('#stage .ficha.na-nevoa').forEach(f => f.classList.remove('na-nevoa'));
      return;
    }
    const vis = vistas(andar);
    salas.forEach(s => s.classList.toggle('nevoa', !vis.has('c' + s.dataset.cn)));
    $$('#stage .ficha[data-id]').forEach(f => {
      const id = f.dataset.id;
      if (id === a.meu) { f.classList.remove('na-nevoa'); return; }
      const cn = a.salaDe(id);
      f.classList.toggle('na-nevoa', !!cn && !vis.has('c' + cn));
    });
  }

  let pedido = 0;
  const agendar = () => { if (pedido) return; pedido = requestAnimationFrame(() => { pedido = 0; try { anotarLocal(); aplicar(); } catch (e) { console.warn('névoa:', e); } }); };
  let tMestre = null;
  const agendarMestre = () => { clearTimeout(tMestre); tMestre = setTimeout(() => { try { anotarMestre(); } catch (e) { console.warn('névoa:', e); } }, 400); };

  /* ---------- cartão da sala ---------- */
  function blocoMestre(cn) {
    const a = andarDe(cn), on = ligada(a);
    const quem = Object.entries(visitas()).filter(([, v]) => v && v['c' + cn] >= desde(a)).map(([id]) => nomeDe(id));
    return `<div class="nv-bloco">
      <span class="nv-tit">🌫 Névoa de guerra · ${a}º andar: <strong>${on ? 'ligada' : 'desligada'}</strong></span>
      <button type="button" data-nv="alternar">${on ? 'Desligar a névoa' : 'Ligar a névoa'}</button>
      <button type="button" class="btn-fantasma" data-nv="limpar">Limpar névoa</button>
      <span class="mini">${on ? 'Cada jogador só vê as salas por onde a cobaia dele já passou.' : 'Desligada: os jogadores veem o andar como sempre.'}
        Já passaram por aqui: ${quem.length ? quem.map(esc).join(', ') : 'ninguém'}.</span>
    </div>`;
  }
  function blocoPublico(cn) {
    return escondida(cn) ? '<div class="nv-bloco"><span class="mini">🌫 Sala na névoa: sua cobaia ainda não passou por aqui.</span></div>' : '';
  }
  function ligar(c, cn) {
    const a = andarDe(cn);
    const bt = c.querySelector('[data-nv="alternar"]');
    if (bt) bt.onclick = () => {
      const on = !ligada(a);
      A().definir(['nevoa', 'a' + a], { on, desde: desde(a) });
      A().diario('sessao', `Névoa de guerra ${on ? 'ligada' : 'desligada'} no ${a}º andar`);
      A().aviso(`Névoa ${on ? 'ligada' : 'desligada'} no ${a}º andar.`);
      setTimeout(() => A().redesenharCartao(), 50);
    };
    const bl = c.querySelector('[data-nv="limpar"]');
    if (bl) bl.onclick = () => {
      if (!confirm(`Limpar a névoa do ${a}º andar? Todas as cobaias "esquecem" as salas por onde passaram neste andar (continua valendo a sala onde cada uma está agora).`)) return;
      A().definir(['nevoa', 'a' + a], { on: ligada(a), desde: Date.now() });
      A().diario('sessao', `Névoa do ${a}º andar limpa`);
      setTimeout(() => { anotarMestre(); A().redesenharCartao(); }, 50);
    };
  }

  (function registrar() {
    const a = A();
    if (!a || !a.ganchoSala || !a.aoMudar) return setTimeout(registrar, 200);
    a.ganchoSala({ mestre: blocoMestre, publico: blocoPublico, ligar });
    a.aoMudar(() => { agendar(); agendarMestre(); });
    const st = $('#stage');
    if (st) new MutationObserver(agendar).observe(st, { childList: true });
    document.addEventListener('acf-perfil', agendar);
    agendar(); agendarMestre();
  })();

  window.Nevoa = { escondida, vistas, aplicar };
})();
