/* skin-industrial.js · M1L! | RTJ
   Só marca no <body> a qualidade efetiva (leve, media, alta) para o CSS desligar animações decorativas
   em aparelho fraco. Reavalia a cada 3 s (barato) porque a qualidade automática pode mudar. */
(function () {
  'use strict';
  function marcar() {
    var q = 'leve';
    try { if (window.ACF_QUALIDADE) q = window.ACF_QUALIDADE.efetiva(); } catch (e) {}
    if (document.body && document.body.dataset.qualidade !== q) document.body.dataset.qualidade = q;
  }
  marcar();
  setInterval(function () { if (!document.hidden) marcar(); }, 3000);
})();

/* Console do Mestre: faixa fixa no alto do painel com o estado vivo da mesa (só leitura).
   Lê o DOM que já existe (nada de Firebase novo). Atualiza a cada 2 s só com o painel visível e o Mestre logado. */
(function () {
  'use strict';
  var painel = document.getElementById('painel');
  if (!painel) return;
  var cx = document.createElement('div');
  cx.id = 'pnConsole'; cx.className = 'pn-console'; cx.hidden = true;
  cx.setAttribute('role', 'status'); cx.setAttribute('aria-label', 'Estado da mesa');
  var ultimo = '';
  function t(sel) { var e = document.querySelector(sel); return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function n(sel) { return document.querySelectorAll(sel).length; }
  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function celula(rot, val, cls) { val = esc(val); return '<div class="c' + (cls ? ' ' + cls : '') + '"><span>' + rot + '</span><b>' + val + '</b></div>'; }
  function montar() {
    var abas = document.getElementById('abasMestre');
    var mestre = abas && !abas.hidden && document.body.classList.contains('hud-limpo');
    if (!mestre) { if (!cx.hidden) cx.hidden = true; return; }
    if (cx.hidden) cx.hidden = false;
    if (cx.parentNode !== painel || (abas.nextElementSibling !== cx)) abas.after(cx);
    var on = n('#listaConectados li.on'), tot = n('#listaConectados li');
    var quebras = parseInt(t('#qtdQuebras'), 10) || 0;
    var persg = document.getElementById('persgAtiva');
    var emPersg = persg && !persg.hidden;
    var apagao = /deslig/i.test(t('#btnApagao'));
    var rel = t('#relogioMestre') || '--:--';
    var html = celula('on-line', on + '/' + (tot || '?'), on ? 'ok' : '') +
      celula('quebras', quebras + '/3', quebras >= 3 ? 'al' : '') +
      celula('relógio', rel) +
      celula('perseguição', emPersg ? 'ativa' : 'parada', emPersg ? 'ok' : '') +
      celula('luz', apagao ? 'apagão' : 'normal', apagao ? 'al' : '');
    if (html !== ultimo) { cx.innerHTML = html; ultimo = html; }
  }
  setInterval(function () { if (!document.hidden) montar(); }, 2000);
  setTimeout(montar, 800);
})();
