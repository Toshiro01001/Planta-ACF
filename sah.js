/* =========================================================
   sah.js · Regras do "Sobrevivendo ao Horror" que viram ferramenta na mesa
   - Cena de perseguição (teste estendido: sucessos antes de falhas)
   - Cena de furtividade (visibilidade de cada um e do grupo)
   - Medo em jogo (visões de medo com teste de Vontade)
   - Sorteios do Mestre: eventos de investigação, ferimentos debilitantes
     e desastres paranormais (tabelas em window.ACF_SAH_TABELAS)
   Regras resumidas com palavras próprias; a regra completa está no livro.
   As regras da casa (Escudo › Cenas fora de combate) prevalecem.
   ========================================================= */
(() => {
'use strict';
const A = window.ACF;
if (!A) return;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = A.esc;
const num = (v, p = 0) => { const n = parseFloat(v); return isFinite(n) ? n : p; };
const int = v => Math.round(num(v));
const est = () => A.estado || {};
const FX = () => window.ACF_FICHAS;
const cobaias = () => (A.SERES || []).filter(x => x.tipo === 'cobaia');
const nomeDe = id => (A.SER[id] || {}).nome || id || '';
const d20 = () => 1 + Math.floor(Math.random() * 20);
const dN = n => 1 + Math.floor(Math.random() * n);
const chave = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const T = () => window.ACF_SAH_TABELAS || {};
const ls = { get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const fmtO = n => (n > 0 ? '+' : n < 0 ? '−' : '') + (n ? Math.abs(n) + 'O' : '');

/* ---------- janela própria (mesmo visual das janelas da Mesa) ---------- */
let jan = null;
function janela(id, html, classe = '') {
  let m = $('#sahJanela');
  if (!m) { m = document.createElement('div'); m.id = 'sahJanela'; document.body.appendChild(m); m.addEventListener('click', e => { const b = e.target.closest('[data-sj]'); if (b && jan && jan.on) jan.on(b.dataset.sj, b); if (b && b.dataset.sj === 'fechar') fechar(); }); }
  m.className = 'mesa-janela sah-janela ' + classe; m.dataset.id = id;
  m.onchange = null; m.innerHTML = `<div class="mesa-caixa">${html}</div>`; m.hidden = false;
  return m;
}
function fechar() { const m = $('#sahJanela'); if (m) { m.hidden = true; m.dataset.id = ''; } jan = null; }
const aberta = id => { const m = $('#sahJanela'); return !!m && !m.hidden && m.dataset.id === id; };
function responder(id, dados) { if (!A.meu) return Promise.resolve(); return A.Rede.set(`mesaResp/${id}/${A.meu}`, { ...dados, ts: Date.now() }).catch(() => A.aviso('O servidor recusou a resposta.')); }
const ativa = () => (FX() && FX().ativa()) || null;
// testes de atributo puro que aparecem nas tabelas (ex.: "Força DT 15")
const ATR_TESTE = { forca: ['for', 'Força'], agilidade: ['agi', 'Agilidade'], vigor: ['vig', 'Vigor'], intelecto: ['int', 'Intelecto'], presenca: ['pre', 'Presença'] };
function rolar(per, dados = 0, extra = 0) {
  const at = ativa(); if (!at) return null;
  if (ATR_TESTE[per]) { const t = rolarAtributo(at.d, ATR_TESTE[per][0], dados); t.total += extra; return t; }
  return FX().testarPericia(at.d, per, extra, '', dados);
}
const facesHtml = t => `<div class="dados-faces">${t.dados.map(v => `<span class="face${v === t.esc ? ' usada' : ''}${v === 20 ? ' crit' : ''}${v === 1 ? ' falha' : ''}">${v}</span>`).join('')}</div>`;
const nomePer = id => (ATR_TESTE[id] ? ATR_TESTE[id][1] : ((FX() && FX().PER && FX().PER[id]) || [id, id])[1]);
function opcoesPericia(sel) { const P = (FX() && FX().PER) || {}; return Object.values(P).map(p => `<option value="${p[0]}"${p[0] === sel ? ' selected' : ''}>${esc(p[1])}</option>`).join(''); }
// tira PV da ficha ativa (esforço extra, eventos)
function perderPV(n) {
  const at = ativa(); if (!at || !n) return;
  const cur = FX().atualDe(at.d, 'pv', at.r.pvMax);
  FX().aplicarNaAtiva([['pv.a', Math.max(-999, cur - n)]]);
}

/* =========================================================
   1. PERSEGUIÇÃO (SaH p. 90 e 91)
   estado.persSaH = { on, id, rod, dt, meta, maxF, pericia, eventos, ev, part{}, dtMenos, log[] }
   part[pid] = { nome, lado: 'presa'|'cacador', npc, s, f, fim, esforco, usadas{}, pen{rod: n} }
   ========================================================= */
const ACOES_P = {
  correr: { n: 'Correr', d: 'Teste normal da perícia da perseguição.' },
  cortar: { n: 'Cortar caminho', d: '−2O no teste; se passar, conta 2 sucessos. O Mestre pode dizer que não há atalho.' },
  esforco: { n: 'Esforço extra', d: '+O no teste, mas perde 1d4 PV por vez que já usou na cena (1d4, depois 2d4…).' },
  obstaculo: { n: 'Criar obstáculo', d: 'Só presa, 1 por rodada. −O no teste e Força DT 15 (ou atributo coerente): passou, a DT da rodada cai 5 para todos (você incluído). O Mestre pode vetar.', presa: true },
  despistar: { n: 'Despistar', d: 'Só presa com 1 sucesso ou mais. Troca o teste por Furtividade: passou, 2 sucessos; falhou, 2 falhas.', presa: true },
  sacrificio: { n: 'Sacrifício', d: 'Falha automática nesta rodada, mas dá +O no teste dos seus aliados nesta rodada.' },
  atrapalhar: { n: 'Atrapalhar', d: 'Só presa contra outra presa com os mesmos sucessos. −O no teste e Luta oposta (o Mestre decide): vencendo, a vítima sofre −2O. Só funciona se os caçadores se contentarem com uma vítima.', presa: true },
  outra: { n: 'Outra perícia', d: 'Justificada para o Mestre (Acrobacia, Enganação, Tática…). Cada perícia diferente de Atletismo só uma vez por perseguição.' },
};
const DT_PERS = [[15, 'Pessoas comuns'], [20, 'Pessoas velozes, animais ou criaturas comuns'], [25, 'Animais ou criaturas velozes'], [30, 'Muito velozes']];
const TAM_PERS = [[2, 2, 'Curta (2 sucessos antes de 2 falhas)'], [3, 3, 'Padrão (3 antes de 3)'], [5, 3, 'Longa (5 antes de 3)'], [7, 3, 'Caçada de vários dias (7 antes de 3)']];
// Tabela 2.3 (d20): faixa, tipo, descrição, perícia, DT
const EV_PERS = [
  [1, 8, '', 'Nada acontece nesta rodada.', '', 0],
  [9, 10, 'obstaculo', 'Entulho bloqueia o caminho.', 'forca', 15],
  [11, 12, 'obstaculo', 'Piso escorregadio.', 'acrobacia', 20],
  [13, 14, 'obstaculo', 'Um entulho rola pelo caminho!', 'reflexos', 20],
  [15, 15, 'obstaculo', 'Uma multidão impede a passagem.', 'intimidacao', 20],
  [16, 17, 'atalho', 'Um caminho mais curto, bloqueado por algo pesado.', 'forca', 15],
  [18, 18, 'atalho', 'Vias labirínticas: dá para cortar caminho ou se perder.', 'percepcao', 20],
  [19, 19, 'atalho', 'Uma porta leva a um atalho… mas está trancada!', 'crime', 25],
  [20, 20, 'atalho', 'Um caminho escondido pela vegetação.', 'sobrevivencia', 20],
];
const pers = () => est().persSaH || {};
const meuPart = () => { const p = pers(); return p.on && A.meu ? (p.part || {})[A.meu] : null; };
const respId = (p, rod) => `pers-${p.id}-${rod || p.rod}`;
const pips = (n, max, cls) => Array.from({ length: max }, (_, i) => `<i class="${i < n ? cls : ''}"></i>`).join('');
function estadoPart(x, p) { if (x.fim) return x.fim; if (int(x.s) >= int(p.meta)) return x.lado === 'presa' ? 'escapou' : 'alcançou'; if (int(x.f) >= int(p.maxF)) return x.lado === 'presa' ? 'foi alcançada' : 'ficou para trás'; return ''; }
function dtRodada(p) { return Math.max(0, int(p.dt) - (int(p.dtMenosRod) === int(p.rod) ? 5 : 0)); }

// faixa para todos (sobre o mapa)
function faixas() {
  const area = $('.palco-area'); if (!area) return;
  let box = $('#sahFaixas');
  if (!box) { box = document.createElement('div'); box.id = 'sahFaixas'; box.className = 'sah-faixas'; area.appendChild(box); box.addEventListener('click', aoClicarFaixa); }
  const p = pers(), f = furt();
  const partes = [];
  if (p.on) {
    const ps = Object.entries(p.part || {});
    const ev = p.ev && int(p.ev.rod) === int(p.rod) ? p.ev : null;
    const meu = meuPart();
    partes.push(`<div class="sah-faixa sah-pers" data-sf="pers"><div class="inv-linha"><span class="inv-k">🏃 Perseguição</span><b>Rodada ${int(p.rod)}</b><span class="inv-urg">${esc(nomePer(p.pericia || 'atletismo'))} DT ${dtRodada(p)}${int(p.dtMenosRod) === int(p.rod) ? ' (obstáculo: −5)' : ''} · ${int(p.meta)} sucessos antes de ${int(p.maxF)} falhas</span>${meu && !estadoPart(meu, p) && !A.mestre ? '<button class="sah-btn" data-sf="agir">Agir nesta rodada</button>' : ''}</div>
      ${ev && ev.tipo ? `<p class="sah-ev">${ev.tipo === 'obstaculo' ? '⚠ Obstáculo' : '↪ Atalho'}: ${esc(ev.txt)} <b>${esc(nomePer(ev.per))} DT ${int(ev.dt)}</b> ${ev.tipo === 'obstaculo' ? '(falhou: −2O no teste da rodada)' : '(opcional; passou: +2O, falhou: −2O)'}</p>` : ev ? `<p class="sah-ev">${esc(ev.txt)}</p>` : ''}
      <ul class="sah-lista">${ps.map(([id, x]) => `<li class="${id === A.meu ? 'eu' : ''}"><span>${x.lado === 'presa' ? '🐇' : '🐺'} ${esc(x.nome)}</span><span class="sah-pips"><span class="ok">${pips(int(x.s), int(p.meta), 'on')}</span><span class="ruim">${pips(int(x.f), int(p.maxF), 'on')}</span></span><small>${esc(estadoPart(x, p))}</small></li>`).join('')}</ul></div>`);
  }
  if (f.on) {
    const ps = Object.entries(f.part || {});
    const soma = ps.reduce((s, [, x]) => s + int(x.vis), 0);
    const ev = f.ev && int(f.ev.rod) === int(f.rod) ? f.ev : null;
    const meu = A.meu && (f.part || {})[A.meu];
    partes.push(`<div class="sah-faixa sah-furt" data-sf="furt"><div class="inv-linha"><span class="inv-k">🤫 Furtividade</span><b>Rodada ${int(f.rod)}</b><span class="inv-urg">${f.algoz ? 'Algoz: ' + esc(f.algoz) + ' · ' : ''}visto com ${int(f.lim) || 3}${f.grupo ? ` · grupo ${soma}/${int(f.limG) || 5}` : ''}</span>${meu && !meu.visto && !A.mestre ? '<button class="sah-btn" data-sf="furt-agir">Agir nesta rodada</button>' : ''}</div>
      ${ev ? `<p class="sah-ev">${esc(ev.txt)}${ev.alvo ? ' <b>(' + esc(nomeDe(ev.alvo) || ev.alvo) + ')</b>' : ''}</p>` : ''}
      <ul class="sah-lista">${ps.map(([id, x]) => `<li class="${id === A.meu ? 'eu' : ''}${x.visto ? ' visto' : ''}"><span>${esc(x.nome)}</span><span class="sah-olhos">${'👁'.repeat(Math.min(6, int(x.vis))) || '·'}</span><small>${x.visto ? 'VISTO' : 'visibilidade ' + int(x.vis)}</small></li>`).join('')}</ul></div>`);
  }
  const html = partes.join('');
  if (box.dataset.html !== html) { box.innerHTML = html; box.dataset.html = html; }
  box.hidden = !html;
  document.body.classList.toggle('sah-em-cena', !!html);
}
function aoClicarFaixa(e) {
  const b = e.target.closest('[data-sf]'); if (!b) return;
  if (b.dataset.sf === 'agir') { e.stopPropagation(); abrirAcaoPers(); return; }
  if (b.dataset.sf === 'furt-agir') { e.stopPropagation(); abrirAcaoFurt(); return; }
  const fx = e.target.closest('.sah-faixa'); if (fx && !e.target.closest('button')) fx.classList.toggle('aberta');
}

// jogador: escolhe a ação e rola
function abrirAcaoPers() {
  const p = pers(), eu = meuPart(); if (!p.on || !eu) return;
  const rid = respId(p);
  if (ls.get('acf-resp-' + rid, false)) { A.aviso('Você já agiu nesta rodada. Espere o Mestre abrir a próxima.'); return; }
  const at = ativa();
  if (!at) { janela(rid, `<p class="mesa-k">PERSEGUIÇÃO</p><h3>Sem ficha ativa</h3><p class="mesa-aviso">Você precisa de uma ficha ativa (📋 Fichas › usar no mapa) para rolar por aqui. Ou role no 🎲 Dados e avise o Mestre.</p><div class="mesa-botoes"><button data-sj="fechar" class="pri">Entendi</button></div>`); return; }
  const ev = p.ev && int(p.ev.rod) === int(p.rod) && p.ev.tipo ? p.ev : null;
  const ops = Object.entries(ACOES_P).filter(([k, a]) => (!a.presa || eu.lado === 'presa') && !(k === 'despistar' && int(eu.s) < 1) && !(k === 'obstaculo' && int(p.obstRod) === int(p.rod)));
  const usadas = Object.keys(eu.usadas || {});
  const sacrif = Object.values(p.part || {}).filter(x => x !== eu && x.lado === eu.lado && int(x.sacRod) === int(p.rod)).length;
  const penAt = int((eu.pen || {})[p.rod]);
  janela(rid, `<p class="mesa-k">PERSEGUIÇÃO · RODADA ${int(p.rod)}</p><h3>${eu.lado === 'presa' ? 'Fugindo' : 'Perseguindo'}</h3>
    <p>${esc(nomePer(p.pericia || 'atletismo'))} contra <b>DT ${dtRodada(p)}</b>. Você tem <b>${int(eu.s)}</b> sucesso${int(eu.s) === 1 ? '' : 's'} e <b>${int(eu.f)}</b> falha${int(eu.f) === 1 ? '' : 's'} (meta: ${int(p.meta)} antes de ${int(p.maxF)}).${sacrif ? ` Aliados se sacrificaram: <b>+${sacrif}O</b>.` : ''}${penAt ? ` Você foi atrapalhado: <b>−${penAt}O</b>.` : ''}</p>
    ${ev ? `<label class="chave sah-ev-op"><input type="checkbox" id="sahEvOk" ${ev.tipo === 'obstaculo' ? 'checked disabled' : ''}><span>${ev.tipo === 'obstaculo' ? 'Obstáculo (obrigatório)' : 'Tentar o atalho'}: ${esc(ev.txt)} <b>${esc(nomePer(ev.per))} DT ${int(ev.dt)}</b></span></label>` : ''}
    <div class="mesa-acoes">${ops.map(([k, a], i) => `<label class="mesa-acao"><input type="radio" name="sahAcao" value="${k}" ${i === 0 ? 'checked' : ''}><b>${esc(a.n)}</b><small>${esc(a.d)}</small></label>`).join('')}</div>
    <label class="mesa-prato" id="sahOutraPer" hidden>Perícia <select id="sahPer">${opcoesPericia('acrobacia')}</select></label>
    <label class="mesa-prato" id="sahAlvo" hidden>Quem atrapalhar <select id="sahAlvoSel">${Object.entries(p.part || {}).filter(([id, x]) => id !== A.meu && x.lado === 'presa' && int(x.s) === int(eu.s) && !estadoPart(x, p)).map(([id, x]) => `<option value="${esc(id)}">${esc(x.nome)}</option>`).join('') || '<option value="">ninguém com os mesmos sucessos</option>'}</select></label>
    ${usadas.length ? `<p class="mini">Perícias já usadas nesta perseguição: ${usadas.map(x => esc(nomePer(x))).join(', ')}.</p>` : ''}
    <div class="mesa-botoes"><button data-sj="rolar" class="pri">🎲 Rolar</button><button data-sj="fechar">Depois</button></div><div id="sahRes"></div>`, 'sah-pers-j');
  const m = $('#sahJanela');
  const sync = () => { const v = ($('input[name="sahAcao"]:checked', m) || {}).value; $('#sahOutraPer', m).hidden = v !== 'outra'; $('#sahAlvo', m).hidden = v !== 'atrapalhar'; };
  m.onchange = sync; sync();
  jan = { on: a => { if (a === 'rolar' && !jan.feito) rolarPers(p, eu, ev, sacrif, penAt); } };
}
function rolarPers(p, eu, ev, sacrif, penAt) {
  const m = $('#sahJanela');
  const acao = ($('input[name="sahAcao"]:checked', m) || {}).value || 'correr';
  let per = p.pericia || 'atletismo';
  if (acao === 'despistar') per = 'furtividade';
  if (acao === 'outra') { per = $('#sahPer', m).value; if ((eu.usadas || {})[per] && per !== 'atletismo') { A.aviso('Você já usou essa perícia nesta perseguição.'); return; } }
  const alvo = acao === 'atrapalhar' ? $('#sahAlvoSel', m).value : '';
  if (acao === 'atrapalhar' && !alvo) { A.aviso('Não há presa com os mesmos sucessos para atrapalhar.'); return; }
  jan.feito = true;
  const linhas = []; let mod = sacrif - penAt;
  // evento da rodada
  let evRes = null;
  if (ev && (ev.tipo === 'obstaculo' || ($('#sahEvOk', m) || {}).checked)) {
    const te = rolar(ev.per);
    const ok = te.total >= int(ev.dt);
    evRes = { per: ev.per, total: te.total, ok };
    mod += ok ? (ev.tipo === 'atalho' ? 2 : 0) : -2;
    linhas.push(`${facesHtml(te)}<p>${esc(nomePer(ev.per))} <b class="mesa-total">${te.total}</b> vs DT ${int(ev.dt)}: <b>${ok ? 'passou' : 'falhou'}</b>${ev.tipo === 'atalho' ? (ok ? ' (+2O no teste)' : ' (−2O no teste)') : ok ? '' : ' (−2O no teste)'}</p>`);
  }
  const res = { acao, per, evRes };
  if (acao === 'sacrificio') {
    res.passou = false; res.s = 0; res.f = 1;
    linhas.push('<p>Você se sacrifica: <b>falha automática</b> nesta rodada e seus aliados ganham +O.</p>');
  } else {
    if (acao === 'cortar') mod -= 2;
    if (acao === 'esforco') mod += 1;
    if (acao === 'obstaculo' || acao === 'atrapalhar') mod -= 1;
    const t = rolar(per, mod);
    const passou = t.total >= dtRodada(p);
    res.total = t.total; res.passou = passou;
    if (acao === 'despistar') { res.s = passou ? 2 : 0; res.f = passou ? 0 : 2; }
    else if (acao === 'cortar') { res.s = passou ? 2 : 0; res.f = passou ? 0 : 1; }
    else { res.s = passou ? 1 : 0; res.f = passou ? 0 : 1; }
    linhas.push(`${facesHtml(t)}<p>${esc(nomePer(per))} ${mod ? `(${fmtO(mod)}) ` : ''}<b class="mesa-total">${t.total}</b> vs DT ${dtRodada(p)}: <b>${passou ? 'passou' : 'falhou'}</b> → ${res.s ? '+' + res.s + ' sucesso' + (res.s > 1 ? 's' : '') : '+' + res.f + ' falha' + (res.f > 1 ? 's' : '')}</p>`);
    if (acao === 'esforco') {
      const vezes = int(eu.esforco) + 1, dano = FX().rolarExpr(vezes + 'd4');
      perderPV(dano.total); res.pv = dano.total;
      linhas.push(`<p>Esforço extra (${vezes}ª vez): perde <b>${dano.total} PV</b> <small>${esc(dano.det)}</small>.</p>`);
    }
    if (acao === 'obstaculo') {
      // teste de Força puro (atributo, sem perícia)
      const fo = rolar('forca');
      const ok = !!fo && fo.total >= 15; res.obst = { total: fo ? fo.total : 0, ok };
      linhas.push(`<p>Força para o obstáculo <b class="mesa-total">${fo ? fo.total : '?'}</b> vs DT 15: <b>${ok ? 'obstáculo criado, DT −5 para todos nesta rodada' : 'não deu certo'}</b></p>`);
    }
    if (acao === 'atrapalhar') {
      const tl = rolar('luta');
      res.luta = tl.total; res.alvo = alvo;
      linhas.push(`<p>Luta para atrapalhar <b>${esc((p.part[alvo] || {}).nome || '')}</b>: <b class="mesa-total">${tl.total}</b>. O Mestre compara com a Luta ou Reflexos da vítima.</p>`);
    }
  }
  $('#sahRes', m).innerHTML = linhas.join('') + '<div class="mesa-botoes"><button data-sj="enviar" class="pri">Enviar ao Mestre</button></div>';
  $('[data-sj="rolar"]', m).disabled = true;
  jan.on = a => {
    if (a !== 'enviar') return;
    responder(respId(p), res).then(() => { ls.set('acf-resp-' + respId(p), true); fechar(); });
    A.rolagemDaFicha(`🏃 ${eu.nome} · ${ACOES_P[acao].n}: ${res.total !== undefined ? `${nomePer(per)} ${res.total} vs DT ${dtRodada(p)}, ` : ''}${res.s ? '+' + res.s + ' sucesso(s)' : '+' + res.f + ' falha(s)'}`);
  };
}
// teste de atributo puro (Força DT 15 do obstáculo): d20 por ponto, fica com o maior, sem bônus
function rolarAtributo(d, atr, extra = 0) { const q = int((d.atr || {})[atr]) + extra; const n = q < 1 ? 2 - q : q; const dados = Array.from({ length: Math.min(n, 12) }, d20); const e = q < 1 ? Math.min(...dados) : Math.max(...dados); return { dados, esc: e, total: e }; }

// Mestre: aplica as respostas na contagem (uma vez por rodada e por personagem)
let persOff = null, persRid = '';
function ouvirPers() {
  const p = pers();
  const rid = p.on ? respId(p) : '';
  if (!A.mestre || rid === persRid) return;
  if (persOff) { persOff(); persOff = null; }
  persRid = rid; if (!rid) return;
  persOff = A.Rede.on('mesaResp/' + rid, v => {
    const p2 = pers(); if (!p2.on || respId(p2) !== rid) return;
    Object.entries(v || {}).forEach(([q, r]) => {
      const x = (p2.part || {})[q]; if (!x || !r || int(x.aplic) === int(p2.rod)) return;
      const n = { ...x, s: int(x.s) + int(r.s), f: int(x.f) + int(r.f), aplic: int(p2.rod), ult: r };
      if (r.acao === 'esforco') n.esforco = int(x.esforco) + 1;
      if (r.acao === 'sacrificio') n.sacRod = int(p2.rod);
      if (r.per && r.per !== (p2.pericia || 'atletismo')) n.usadas = { ...(x.usadas || {}), [r.per]: true };
      A.definir(['persSaH', 'part', q], n);
      if (r.acao === 'obstaculo' && r.obst && r.obst.ok) { A.definir(['persSaH', 'dtMenosRod'], int(p2.rod)); A.definir(['persSaH', 'obstRod'], int(p2.rod)); }
      const fim = estadoPart(n, p2);
      A.diario && A.diario('pers', `Perseguição r${int(p2.rod)}: ${x.nome} · ${(ACOES_P[r.acao] || {}).n || r.acao} → ${int(r.s) ? '+' + int(r.s) + 'S' : '+' + int(r.f) + 'F'}${fim ? ' · ' + fim : ''}`);
      if (fim) A.alertaMestre(`Perseguição: ${x.nome} ${fim}.`);
      if (r.acao === 'atrapalhar' && r.alvo) A.alertaMestre(`Perseguição: ${x.nome} quer atrapalhar ${((p2.part || {})[r.alvo] || {}).nome || ''} (Luta ${int(r.luta)}). Resolva no bloco Perseguição.`);
    });
    desenharMestre();
  }, () => {});
}
function blocoPers() {
  const c = $('#sahPers'); if (!c || !semFoco(c)) return;
  const p = pers();
  if (!p.on) {
    c.innerHTML = `<p class="mini">Teste estendido de Atletismo (SaH p. 90): quem junta os sucessos antes das falhas vence. Presas que vencem escapam; caçadores que vencem alcançam. Cada jogador escolhe a ação e rola na própria tela; o site conta os sucessos. NPCs e ameaças você marca à mão.</p>
      <div class="sah-grade">
      <label class="mesa-campo">DT pela velocidade de quem está do outro lado <select id="sahPdt">${DT_PERS.map(([v, t]) => `<option value="${v}"${v === 20 ? ' selected' : ''}>${v} · ${esc(t)}</option>`).join('')}</select></label>
      <label class="mesa-campo">Tamanho <select id="sahPtam">${TAM_PERS.map(([a, b, t], i) => `<option value="${i}"${i === 1 ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label class="mesa-campo">Perícia <select id="sahPper"><option value="atletismo">Atletismo (a pé)</option><option value="pilotagem">Pilotagem (veículo)</option><option value="adestramento">Adestramento (montaria)</option></select></label></div>
      <p class="mesa-k">PARTICIPANTES</p>
      <div class="sah-part">${cobaias().map(x => `<label class="sah-part-l"><input type="checkbox" data-pp="${x.id}" checked> ${esc(x.nome)} <select data-pl="${x.id}"><option value="presa">presa</option><option value="cacador">caçador</option></select></label>`).join('')}</div>
      <label class="mesa-campo">NPCs e ameaças (um por linha; termine com " caçador" ou " presa")<textarea id="sahPnpc" rows="2" placeholder="Melancolia caçador"></textarea></label>
      <label class="chave"><input type="checkbox" id="sahPev" checked><span>Eventos a cada rodada (Tabela 2.3, d20)</span></label>
      <button data-sp="ini" class="btn-protocolo">Começar perseguição</button>`;
    return;
  }
  const rod = int(p.rod);
  const ps = Object.entries(p.part || {});
  c.innerHTML = `<p class="mini">Rodada <b>${rod}</b> · ${esc(nomePer(p.pericia || 'atletismo'))} DT <b>${dtRodada(p)}</b> · ${int(p.meta)} sucessos antes de ${int(p.maxF)} falhas</p>
    ${p.ev && int(p.ev.rod) === rod ? `<p class="sah-ev">${p.ev.tipo ? (p.ev.tipo === 'obstaculo' ? '⚠ ' : '↪ ') : ''}${esc(p.ev.txt)}${p.ev.per ? ` · ${esc(nomePer(p.ev.per))} DT ${int(p.ev.dt)}` : ''} <small>(d20: ${int(p.ev.r)})</small></p>` : ''}
    <div class="sah-tab">${ps.map(([id, x]) => `<div class="sah-tab-l"><span>${x.lado === 'presa' ? '🐇' : '🐺'} <b>${esc(x.nome)}</b>${x.npc ? ' <small>NPC</small>' : ''}<br><small>${esc(estadoPart(x, p) || (int(x.aplic) === rod ? 'agiu: ' + ((ACOES_P[(x.ult || {}).acao] || {}).n || '') : x.npc ? '' : 'aguardando'))}</small></span>
      <span class="sah-pips"><span class="ok">${pips(int(x.s), int(p.meta), 'on')}</span><span class="ruim">${pips(int(x.f), int(p.maxF), 'on')}</span></span>
      <span class="sah-ctl"><button data-sp="s" data-id="${esc(id)}" title="+1 sucesso">+S</button><button data-sp="f" data-id="${esc(id)}" title="+1 falha">+F</button><button data-sp="desf" data-id="${esc(id)}" title="Desfazer o último">↶</button>${x.npc ? `<button data-sp="npc" data-id="${esc(id)}" title="Rolar pelo NPC">🎲</button>` : ''}${(x.ult || {}).acao === 'atrapalhar' && int(x.aplic) === rod && (x.ult || {}).alvo ? `<button data-sp="atr-ok" data-id="${esc(id)}">Atrapalhou ✓</button>` : ''}</span></div>`).join('')}</div>
    <div class="mesa-linha"><input id="sahPnpcBon" type="text" placeholder="NPC: dados e bônus, ex.: 3 10" style="width:150px"><button data-sp="rod" class="pri">Próxima rodada</button><button data-sp="ev">Rolar evento</button><button data-sp="semev">Sem evento</button><button data-sp="fim" class="perigo">Encerrar</button></div>
    <label class="mesa-campo">DT da rodada seguinte <input id="sahPdt2" type="number" value="${int(p.dt)}" style="width:70px"></label>`;
}
async function aoClicarPers(b) {
  const a = b.dataset.sp, p = pers();
  if (a === 'ini') {
    const tam = TAM_PERS[int($('#sahPtam').value)] || TAM_PERS[1];
    const part = {};
    $$('#sahPers [data-pp]').forEach(i => { if (i.checked) { const id = i.dataset.pp; part[id] = { nome: nomeDe(id), lado: $(`#sahPers [data-pl="${id}"]`).value, s: 0, f: 0 }; } });
    $('#sahPnpc').value.split('\n').map(x => x.trim()).filter(Boolean).forEach(l => { const m = /^(.*?)(?:\s+(ca[cç]ador|presa))?$/i.exec(l); part['npc' + chave()] = { nome: m[1], lado: /ca[cç]ador/i.test(m[2] || '') ? 'cacador' : 'presa', npc: true, s: 0, f: 0 }; });
    if (!Object.keys(part).length) { A.aviso('Marque pelo menos um participante.'); return; }
    const novo = { on: true, id: chave(), rod: 1, dt: int($('#sahPdt').value), meta: tam[0], maxF: tam[1], pericia: $('#sahPper').value, eventos: $('#sahPev').checked, part, ts: Date.now() };
    if (novo.eventos) novo.ev = sortearEvPers(1);
    A.definir(['persSaH'], novo);
    A.diario && A.diario('pers', `Perseguição começou (DT ${novo.dt}, ${novo.meta}/${novo.maxF})`);
    return;
  }
  if (!p.on) return;
  const id = b.dataset.id, x = id && (p.part || {})[id];
  if (a === 's' && x) A.definir(['persSaH', 'part', id], { ...x, s: int(x.s) + 1, hist: [...(x.hist || []), 's'] });
  if (a === 'f' && x) A.definir(['persSaH', 'part', id], { ...x, f: int(x.f) + 1, hist: [...(x.hist || []), 'f'] });
  if (a === 'desf' && x) { const h = [...(x.hist || [])]; const u = h.pop(); if (!u) { A.aviso('Nada para desfazer (as respostas dos jogadores se corrigem com +S/+F).'); return; } A.definir(['persSaH', 'part', id], { ...x, [u]: Math.max(0, int(x[u]) - 1), hist: h }); }
  if (a === 'npc' && x) {
    const [q, bon] = String($('#sahPnpcBon').value || '').split(/[\s,;]+/).map(v => int(v));
    const qq = q || 1, dados = Array.from({ length: Math.min(qq, 12) }, d20), tot = Math.max(...dados) + (bon || 0);
    const ok = tot >= dtRodada(p);
    A.definir(['persSaH', 'part', id], { ...x, s: int(x.s) + (ok ? 1 : 0), f: int(x.f) + (ok ? 0 : 1), hist: [...(x.hist || []), ok ? 's' : 'f'] });
    A.aviso(`${x.nome}: ${qq}d20 [${dados.join(', ')}]${bon ? '+' + bon : ''} = ${tot} vs DT ${dtRodada(p)} → ${ok ? 'sucesso' : 'falha'}`);
  }
  if (a === 'atr-ok' && x) { const alvo = x.ult.alvo, y = (p.part || {})[alvo]; if (y) { A.definir(['persSaH', 'part', alvo, 'pen'], { ...(y.pen || {}), [int(p.rod) + 1]: 2 }); A.aviso(`${y.nome} sofre −2O no teste da próxima rodada.`); } }
  if (a === 'rod') {
    const rod = int(p.rod) + 1;
    A.definir(['persSaH', 'rod'], rod);
    A.definir(['persSaH', 'dt'], int($('#sahPdt2').value) || int(p.dt));
    if (p.eventos) A.definir(['persSaH', 'ev'], sortearEvPers(rod));
    // NPCs ficam "aguardando" de novo
  }
  if (a === 'ev') A.definir(['persSaH', 'ev'], sortearEvPers(int(p.rod)));
  if (a === 'semev') A.definir(['persSaH', 'ev'], { rod: int(p.rod), r: 0, txt: 'Sem evento nesta rodada.' });
  if (a === 'fim' && confirm('Encerrar a perseguição? A faixa some para todos.')) {
    const res = Object.values(p.part || {}).map(x => `${x.nome}: ${estadoPart(x, p) || int(x.s) + 'S/' + int(x.f) + 'F'}`).join(' · ');
    A.diario && A.diario('pers', 'Perseguição encerrada: ' + res);
    A.definir(['persSaH'], { on: false, id: p.id, fim: Date.now(), res });
  }
}
function sortearEvPers(rod) { const r = d20(); const e = EV_PERS.find(x => r >= x[0] && r <= x[1]); return { rod, r, tipo: e[2], txt: e[3], per: e[4], dt: e[5] }; }

/* =========================================================
   2. FURTIVIDADE (SaH p. 92 e 93)
   estado.furtSaH = { on, id, rod, algoz, grupo, lim, limG, pres, part{pid:{nome, vis, visto, npc}}, ev, distrair{n, rod} }
   ========================================================= */
const ACOES_F = {
  comum: { n: 'Ação comum', v: 1, d: 'Conversar normalmente, caminhar, investigar sem cuidado: +1 de visibilidade.' },
  discreta: { n: 'Ação discreta', v: 0, d: 'A mesma ação com cuidado (metade do deslocamento, −O em testes): +0.' },
  chamativa: { n: 'Ação chamativa', v: 2, d: 'Correr, gritar, atacar, conjurar: +2.' },
  esconder: { n: 'Esconder-se', d: 'Furtividade DT 15 (boa ideia: +O). Passou: −1 de visibilidade. Falhou: nada muda.' },
  distrair: { n: 'Distrair', d: 'Enganação DT 15 (+5 a cada uso na cena; 1 por rodada para o grupo). Passou: −1 em você ou num aliado. Falhou: +1 em você.' },
  atencao: { n: 'Chamar atenção', d: 'Você +2, um aliado próximo −1.' },
};
// Tabela 2.4 (d20)
const EV_FURT = [
  [1, 2, 'perto', 'O algoz chega muito perto de alguém. Para não ser descoberto, precisa ficar imóvel e em silêncio e sofre 1d6 de dano mental (ou metade da Presença Perturbadora do algoz, o que for maior).'],
  [3, 5, 'todos2', 'O algoz procura sem descanso: visibilidade de todos +2.'],
  [6, 8, 'um2', 'O algoz salta na direção de alguém: visibilidade dessa pessoa +2.'],
  [9, 15, 'todos1', 'O algoz procura: visibilidade de todos +1.'],
  [16, 17, 'um1', 'O algoz avança na direção de alguém: visibilidade dessa pessoa +1.'],
  [18, 19, 'nada', 'O algoz para por um momento. Nenhum efeito.'],
  [20, 20, 'menos1', 'O algoz se distrai e olha para outro lado: visibilidade de alguém −1.'],
];
const furt = () => est().furtSaH || {};
const respF = f => `furt-${f.id}-${f.rod}`;
function abrirAcaoFurt() {
  const f = furt(), eu = A.meu && (f.part || {})[A.meu]; if (!f.on || !eu) return;
  const rid = respF(f);
  if (ls.get('acf-resp-' + rid, false)) { A.aviso('Você já agiu nesta rodada.'); return; }
  const usoDist = int((f.distrair || {}).n), distRod = int((f.distrair || {}).rod) === int(f.rod);
  const aliados = Object.entries(f.part || {}).filter(([id, x]) => id !== A.meu && !x.visto);
  janela(rid, `<p class="mesa-k">FURTIVIDADE · RODADA ${int(f.rod)}</p><h3>O que você faz?</h3>
    <p>Sua visibilidade: <b>${int(eu.vis)}</b> (com ${int(f.lim) || 3} ou mais no fim da rodada, você é visto${f.algoz ? ' por ' + esc(f.algoz) : ''}).</p>
    <div class="mesa-acoes">${Object.entries(ACOES_F).filter(([k]) => !(k === 'distrair' && distRod)).map(([k, a], i) => `<label class="mesa-acao"><input type="radio" name="sahFa" value="${k}" ${i === 1 ? 'checked' : ''}><b>${esc(a.n)}</b><small>${esc(a.d)}${k === 'distrair' ? ` Agora: DT ${15 + 5 * usoDist}.` : ''}</small></label>`).join('')}</div>
    <label class="mesa-prato" id="sahFal" hidden>Aliado <select id="sahFalSel"><option value="">${'você mesmo'}</option>${aliados.map(([id, x]) => `<option value="${esc(id)}">${esc(x.nome)}</option>`).join('')}</select></label>
    <label class="chave" id="sahFideia" hidden><input type="checkbox" id="sahFbon"><span>O Mestre aprovou uma ideia boa (+O)</span></label>
    <div class="mesa-botoes"><button data-sj="ok" class="pri">Confirmar</button><button data-sj="fechar">Depois</button></div><div id="sahRes"></div>`, 'sah-furt-j');
  const m = $('#sahJanela');
  const sync = () => { const v = ($('input[name="sahFa"]:checked', m) || {}).value; $('#sahFal', m).hidden = !['distrair', 'atencao'].includes(v); $('#sahFideia', m).hidden = v !== 'esconder'; };
  m.onchange = sync; sync();
  jan = { on: a => {
    if (a !== 'ok' || jan.feito) return;
    jan.feito = true;
    const acao = ($('input[name="sahFa"]:checked', m) || {}).value || 'discreta';
    const alvo = $('#sahFalSel', m).value || '';
    const r = { acao, alvo };
    let txt = '';
    if (ACOES_F[acao].v !== undefined) { r.dv = ACOES_F[acao].v; txt = `${ACOES_F[acao].n}: visibilidade +${r.dv}.`; }
    if (acao === 'esconder') { const t = rolar('furtividade', $('#sahFbon', m).checked ? 1 : 0); const dt = 15 + int(f.dtMais); r.total = t ? t.total : 0; r.dv = t && t.total >= dt ? -1 : 0; txt = t ? `${facesHtml(t)}Furtividade <b class="mesa-total">${t.total}</b> vs DT ${dt}: ${r.dv ? 'visibilidade −1' : 'nada muda'}.` : 'Sem ficha ativa: role no 🎲 Dados e avise o Mestre.'; }
    if (acao === 'distrair') { const t = rolar('enganacao'); const dt = 15 + 5 * usoDist + int(f.dtMais); r.total = t ? t.total : 0; r.passou = !!t && t.total >= dt; if (r.passou) { r.dAlvo = -1; if (!alvo) r.dv = -1; } else r.dv = 1; txt = t ? `${facesHtml(t)}Enganação <b class="mesa-total">${t.total}</b> vs DT ${dt}: ${r.passou ? `−1 em ${alvo ? esc((f.part[alvo] || {}).nome) : 'você'}` : 'falhou, você +1'}.` : 'Sem ficha ativa.'; }
    if (acao === 'atencao') { r.dv = 2; if (alvo) r.dAlvo = -1; txt = `Você +2${alvo ? `, ${esc((f.part[alvo] || {}).nome)} −1` : ''}.`; }
    if (acao === 'discreta') txt += ' Testes nesta rodada sofrem −O.';
    $('#sahRes', m).innerHTML = `<p>${txt}</p><div class="mesa-botoes"><button data-sj="enviar" class="pri">Enviar ao Mestre</button></div>`;
    $('[data-sj="ok"]', m).disabled = true;
    jan.on = b => { if (b === 'enviar') responder(rid, r).then(() => { ls.set('acf-resp-' + rid, true); fechar(); }); };
  } };
}
let furtOff = null, furtRid = '';
function ouvirFurt() {
  const f = furt(); const rid = f.on ? respF(f) : '';
  if (!A.mestre || rid === furtRid) return;
  if (furtOff) { furtOff(); furtOff = null; }
  furtRid = rid; if (!rid) return;
  furtOff = A.Rede.on('mesaResp/' + rid, v => {
    const f2 = furt(); if (!f2.on || respF(f2) !== rid) return;
    Object.entries(v || {}).forEach(([q, r]) => {
      const x = (f2.part || {})[q]; if (!x || !r || int(x.aplic) === int(f2.rod)) return;
      A.definir(['furtSaH', 'part', q], { ...x, vis: Math.max(0, int(x.vis) + int(r.dv)), aplic: int(f2.rod), ult: r });
      if (r.dAlvo && r.alvo && (f2.part || {})[r.alvo]) { const y = f2.part[r.alvo]; A.definir(['furtSaH', 'part', r.alvo, 'vis'], Math.max(0, int(y.vis) + int(r.dAlvo))); }
      if (r.acao === 'distrair') A.definir(['furtSaH', 'distrair'], { n: int((f2.distrair || {}).n) + 1, rod: int(f2.rod) });
      A.diario && A.diario('furt', `Furtividade r${int(f2.rod)}: ${x.nome} · ${(ACOES_F[r.acao] || {}).n || r.acao}${r.total ? ' (' + r.total + ')' : ''} → ${int(r.dv) >= 0 ? '+' : ''}${int(r.dv)}`);
    });
  }, () => {});
}
function blocoFurt() {
  const c = $('#sahFurt'); if (!c || !semFoco(c)) return;
  const f = furt();
  if (!f.on) {
    c.innerHTML = `<p class="mini">Regra de visibilidade (SaH p. 92): todos começam em 0. Cada ação soma ou tira; quem fechar a rodada com 3 ou mais é visto. Com a visibilidade do grupo, se a soma de todos chegar a 5, todo mundo com 1 ou mais é visto. Cada jogador escolhe a ação na própria tela.</p>
      <label class="mesa-campo">Algoz (de quem estão se escondendo) <input id="sahFalgoz" placeholder="Ex.: Uivar"></label>
      <label class="mesa-campo">Presença Perturbadora do algoz (para o evento 1 e 2) <input id="sahFpres" placeholder="Ex.: 3d6" style="width:90px"></label>
      <label class="mesa-campo">DT extra para esconder-se e distrair (algoz atento) <select id="sahFdt"><option value="0">+0</option><option value="5">+5</option><option value="10">+10</option></select></label>
      <div class="sah-part">${cobaias().map(x => `<label class="sah-part-l"><input type="checkbox" data-fp="${x.id}" checked> ${esc(x.nome)}</label>`).join('')}</div>
      <label class="chave"><input type="checkbox" id="sahFgrupo"><span>Usar a visibilidade do grupo (5)</span></label>
      <button data-sf2="ini" class="btn-protocolo">Começar cena de furtividade</button>`;
    return;
  }
  const ps = Object.entries(f.part || {}), soma = ps.reduce((s, [, x]) => s + int(x.vis), 0);
  c.innerHTML = `<p class="mini">Rodada <b>${int(f.rod)}</b>${f.grupo ? ` · grupo <b>${soma}</b>/${int(f.limG) || 5}` : ''}${f.algoz ? ' · algoz ' + esc(f.algoz) : ''} · distrair usado ${int((f.distrair || {}).n)}×</p>
    ${f.ev && int(f.ev.rod) === int(f.rod) ? `<p class="sah-ev">${esc(f.ev.txt)}${f.ev.alvo ? ' → <b>' + esc(nomeDe(f.ev.alvo) || (f.part[f.ev.alvo] || {}).nome || '') + '</b>' : ''} <small>(d20: ${int(f.ev.r)})</small></p>` : ''}
    <div class="sah-tab">${ps.map(([id, x]) => `<div class="sah-tab-l${x.visto ? ' visto' : ''}"><span><b>${esc(x.nome)}</b><br><small>${x.visto ? 'VISTO' : int(x.aplic) === int(f.rod) ? 'agiu: ' + ((ACOES_F[(x.ult || {}).acao] || {}).n || '') : 'aguardando'}</small></span><span class="sah-olhos">${'👁'.repeat(Math.min(6, int(x.vis))) || '·'} ${int(x.vis)}</span>
      <span class="sah-ctl"><button data-sf2="mais" data-id="${esc(id)}">+1</button><button data-sf2="menos" data-id="${esc(id)}">−1</button>${x.visto ? `<button data-sf2="desver" data-id="${esc(id)}">esconder de novo</button>` : ''}</span></div>`).join('')}</div>
    <div class="mesa-linha"><button data-sf2="ev" class="pri">Rolar evento (d20)</button><button data-sf2="fecha">Fechar rodada</button><button data-sf2="fim" class="perigo">Encerrar</button></div>
    <p class="mini">Ordem sugerida: rolar o evento no começo da rodada, esperar as ações e "Fechar rodada" (marca quem foi visto e abre a próxima).</p>`;
}
function aoClicarFurt(b) {
  const a = b.dataset.sf2, f = furt();
  if (a === 'ini') {
    const part = {};
    $$('#sahFurt [data-fp]').forEach(i => { if (i.checked) part[i.dataset.fp] = { nome: nomeDe(i.dataset.fp), vis: 0 }; });
    if (!Object.keys(part).length) { A.aviso('Marque pelo menos uma cobaia.'); return; }
    A.definir(['furtSaH'], { on: true, id: chave(), rod: 1, algoz: $('#sahFalgoz').value.trim(), pres: $('#sahFpres').value.trim(), dtMais: int($('#sahFdt').value), grupo: $('#sahFgrupo').checked, lim: 3, limG: 5, part, ts: Date.now() });
    A.diario && A.diario('furt', 'Cena de furtividade começou');
    return;
  }
  if (!f.on) return;
  const id = b.dataset.id, x = id && (f.part || {})[id];
  if (a === 'mais' && x) A.definir(['furtSaH', 'part', id, 'vis'], int(x.vis) + 1);
  if (a === 'menos' && x) A.definir(['furtSaH', 'part', id, 'vis'], Math.max(0, int(x.vis) - 1));
  if (a === 'desver' && x) A.definir(['furtSaH', 'part', id], { ...x, visto: false, vis: Math.min(int(x.vis), 2) });
  if (a === 'ev') {
    const r = d20(), e = EV_FURT.find(z => r >= z[0] && r <= z[1]);
    const vivos = Object.entries(f.part || {}).filter(([, z]) => !z.visto);
    const sorteado = vivos.length ? vivos[Math.floor(Math.random() * vivos.length)][0] : '';
    const ev = { rod: int(f.rod), r, tipo: e[2], txt: e[3] };
    if (['perto', 'um2', 'um1', 'menos1'].includes(e[2])) ev.alvo = sorteado;
    A.definir(['furtSaH', 'ev'], ev);
    vivos.forEach(([pid, z]) => {
      let dv = 0;
      if (e[2] === 'todos2') dv = 2; if (e[2] === 'todos1') dv = 1;
      if (pid === ev.alvo) { if (e[2] === 'um2') dv = 2; if (e[2] === 'um1') dv = 1; if (e[2] === 'menos1') dv = -1; }
      if (dv) A.definir(['furtSaH', 'part', pid, 'vis'], Math.max(0, int(z.vis) + dv));
    });
    if (e[2] === 'perto' && ev.alvo) A.alertaMestre(`Furtividade: o algoz chega perto de ${(f.part[ev.alvo] || {}).nome}. Se ficar imóvel, sofre 1d6 mental${f.pres ? ` (ou metade de ${f.pres})` : ''}.`);
  }
  if (a === 'fecha') {
    const ps = Object.entries(f.part || {});
    const soma = ps.reduce((s, [, z]) => s + int(z.vis), 0);
    const vistos = [];
    ps.forEach(([pid, z]) => { if (z.visto) return; const vis = int(z.vis) >= (int(f.lim) || 3) || (f.grupo && soma >= (int(f.limG) || 5) && int(z.vis) >= 1); if (vis) { vistos.push(z.nome); A.definir(['furtSaH', 'part', pid, 'visto'], true); } });
    if (vistos.length) { A.alertaMestre(`Furtividade: ${vistos.join(', ')} ${vistos.length > 1 ? 'foram vistos' : 'foi visto(a)'}${f.algoz ? ' por ' + f.algoz : ''}.`); A.diario && A.diario('furt', 'Vistos: ' + vistos.join(', ')); }
    A.definir(['furtSaH', 'rod'], int(f.rod) + 1);
  }
  if (a === 'fim' && confirm('Encerrar a cena de furtividade?')) { A.definir(['furtSaH'], { on: false, id: f.id, fim: Date.now() }); A.diario && A.diario('furt', 'Cena de furtividade encerrada'); }
}

/* =========================================================
   3. MEDO EM JOGO (SaH p. 87 e 88, opcional)
   estado.medoSaH = { id, nivel, alvos{}, txt, ts }
   ========================================================= */
const MEDO = [
  ['inquietante', 'Inquietante', '1d4', 15, 'anula'],
  ['perturbadora', 'Perturbadora', '1d6', 20, 'metade'],
  ['assustadora', 'Assustadora', '2d6', 25, 'metade'],
  ['sinistra', 'Sinistra', '4d4', 30, 'metade'],
  ['macabra', 'Macabra', '4d8', 35, 'metade'],
  ['aterrorizante', 'Aterrorizante', '4d12', 40, 'metade'],
];
// Determinação: em visões de medo cada dado só desce um passo (a quantidade não cai)
const umPasso = expr => String(expr).replace(/(\d*)d(\d+)/gi, (m, q, f) => { const p = [4, 6, 8, 10, 12, 20], i = p.indexOf(int(f)); return `${q || 1}d${i > 0 ? p[i - 1] : Math.max(2, int(f) - 2)}`; });
function verMedo() {
  const m = est().medoSaH;
  if (!m || A.mestre || !A.meu || !(m.alvos || {})[A.meu]) return;
  const rid = 'medo-' + m.id;
  if (ls.get('acf-resp-' + rid, false) || aberta(rid) || Date.now() - num(m.ts) > 3 * 3600e3) return;
  const sj = $('#sahJanela'); if (sj && !sj.hidden) return;
  const n = MEDO.find(x => x[0] === m.nivel) || MEDO[0];
  const at = ativa(); const v = at ? FX().vitaisDe(at.d) : null; const det = !!(v && v.det);
  const expr = det ? umPasso(n[2]) : n[2];
  janela(rid, `<p class="mesa-k">MEDO</p><h3>Visão ${esc(n[1].toLowerCase())}</h3>${m.txt ? `<p><i>${esc(m.txt)}</i></p>` : ''}
    <p>Teste de <b>Vontade DT ${n[3]}</b>. Falhou: <b>${esc(expr)}</b> de dano mental${det ? ' (ajustado para Determinação)' : ''}. Passou: ${n[4] === 'anula' ? 'nada acontece' : 'metade do dano'}. Dano de medo causa no mínimo 1.</p>
    <div class="mesa-botoes">${at ? '<button data-sj="rolar" class="pri">🎲 Rolar Vontade</button>' : '<button data-sj="fechar" class="pri">Vou rolar no 🎲 Dados</button>'}</div><div id="sahRes"></div>`, 'sah-medo-j');
  jan = { on: a => {
    if (a === 'rolar' && !jan.feito) {
      jan.feito = true;
      const t = rolar('vontade'), passou = t.total >= n[3];
      const dr = FX().rolarExpr(expr);
      let dano = passou ? (n[4] === 'anula' ? 0 : Math.floor(dr.total / 2)) : dr.total;
      if (!(passou && n[4] === 'anula')) dano = Math.max(1, dano);
      jan.res = { total: t.total, passou, dano, det };
      $('#sahRes').innerHTML = `${facesHtml(t)}<p>Vontade <b class="mesa-total">${t.total}</b> vs DT ${n[3]}: <b>${passou ? 'passou' : 'falhou'}</b>. Dano mental: <b>${dano}</b> <small>${esc(dr.det)}</small></p><div class="mesa-botoes"><button data-sj="aplicar" class="pri">${dano ? `Aplicar −${dano} ${det ? 'PD' : 'SAN'}` : 'Ok'}</button></div>`;
      $('[data-sj="rolar"]').disabled = true; return;
    }
    if (a === 'aplicar' && jan.res) {
      const r = jan.res, at2 = ativa();
      if (r.dano && at2) { const k = r.det ? 'pd' : 'san', mx = r.det ? at2.r.pdMax : at2.r.sanMax; const cur = FX().atualDe(at2.d, k, mx); FX().aplicarNaAtiva([[`${k}.a`, Math.max(0, cur - r.dano)]]); if (cur - r.dano <= 0) { r.zerou = true; A.aviso(`${r.det ? 'PD' : 'Sanidade'} a zero por dano de medo: o Mestre rola na tabela de efeitos de medo.`); } }
      responder(rid, r); ls.set('acf-resp-' + rid, true);
      A.rolagemDaFicha(`😨 ${(at2 && at2.d.nome) || ''} · visão ${n[1].toLowerCase()}: Vontade ${r.total} vs DT ${n[3]}, ${r.passou ? 'passou' : 'falhou'}, −${r.dano} ${r.det ? 'PD' : 'SAN'}`);
      fechar();
    }
  } };
}
let medoOff = null, medoId = '', medoUlt = null;
function blocoMedo() {
  const c = $('#sahMedo'); if (!c || !semFoco(c)) return;
  const m = est().medoSaH || {};
  c.innerHTML = `<p class="mini">Regra opcional (SaH p. 87): visões de medo pedem Vontade. Inquietante anula com sucesso; as outras reduzem à metade. Dano de medo causa no mínimo 1. Ambiente horripilante: 1 de dano mental por rodada (2 ou 5 em lugares piores), sem teste.</p>
    <label class="mesa-campo">Intensidade <select id="sahMn">${MEDO.map(x => `<option value="${x[0]}">${x[1]} · ${x[2]} · DT ${x[3]}</option>`).join('')}</select></label>
    <label class="mesa-campo">O que eles veem (opcional, aparece na tela) <input id="sahMtxt" placeholder="Ex.: a boneca virou a cabeça sozinha"></label>
    <div class="sah-part">${cobaias().map(x => `<label class="sah-part-l"><input type="checkbox" data-mp="${x.id}" checked> ${esc(x.nome)}</label>`).join('')}</div>
    <button data-sm="ok" class="btn-protocolo">Mandar a visão</button>
    ${m.id ? `<p class="mesa-k">RESPOSTAS · ${esc((MEDO.find(x => x[0] === m.nivel) || [])[1] || '')}</p><div id="sahMresp" class="mesa-resp"></div>` : ''}
    <div id="sahMsort"></div>
    <details><summary>Tabela de efeitos de medo (SAN 0)</summary><div id="sahMtab">${tabelaHtml('medo')}</div></details>`;
  const pinta = () => { const el = $('#sahMresp'); if (el) el.innerHTML = Object.entries(medoUlt || {}).map(([q, r]) => `<p>${esc(nomeDe(q))}: Vontade ${int(r.total)} · ${r.passou ? 'passou' : 'falhou'} · −${int(r.dano)} ${r.det ? 'PD' : 'SAN'}${r.zerou ? ` · <b>chegou a 0</b> <button data-ss="medo" data-quem="${esc(q)}">🎲 Efeito de medo</button>` : ''}</p>`).join('') || '<p class="mini">Aguardando…</p>'; };
  if (m.id && m.id !== medoId) { if (medoOff) medoOff(); medoId = m.id; medoUlt = null; medoOff = A.Rede.on('mesaResp/medo-' + m.id, v => { medoUlt = v; pinta(); }, () => {}); }
  pinta();
}

/* =========================================================
   4. SORTEIOS DO MESTRE (tabelas)
   ========================================================= */
function tabelaHtml(k) {
  const t = T()[k]; if (!t || !t.linhas) return '<p class="mini">Tabela indisponível.</p>';
  return `<table class="sah-tabela"><thead><tr>${t.cab.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.linhas.map(l => `<tr>${l.map(v => `<td>${esc(String(v))}</td>`).join('')}</tr>`).join('')}</tbody></table>${t.nota ? `<p class="mini">${esc(t.nota)}</p>` : ''}`;
}
const naFaixa = (x, r) => { const [a, b] = String(x[0]).split(/\s*[-–a]\s*/).map(v => int(v)); return r >= a && r <= (b || a); };
function sortear(k, extra = 0) {
  const t = T()[k]; if (!t) return null;
  const rol = FX().rolarExpr(t.dado), r = rol.total + extra;
  const l = t.linhas.find(x => naFaixa(x, r)) || (r > 0 ? t.linhas[t.linhas.length - 1] : t.linhas[0]);
  return { r, l, det: rol.det, extra };
}
function blocoSorteios() {
  const c = $('#sahSort'); if (!c || !semFoco(c)) return;
  const tabs = Object.entries(T()).filter(([k, t]) => t && t.sorteio);
  c.innerHTML = `<p class="mini">Tabelas do Sobrevivendo ao Horror para sortear na hora. O resultado fica só na sua tela; mande para todos se quiser.</p>
    <div class="sah-sort-bts">${tabs.map(([k, t]) => `<span class="sah-sort-b"><button data-ss="${k}">🎲 ${esc(t.titulo)} (${esc(t.dado)}${t.bonus ? ' + N' : ''})</button>${t.bonus ? `<label class="sah-bonus" title="${esc(t.bonus)}">+ <input type="number" min="0" max="20" value="0" id="sahSb-${k}" aria-label="${esc(t.bonus)}"><small>${esc(t.bonus)}</small></label>` : ''}</span>`).join('')}</div>
    <div id="sahSortRes"></div>
    ${Object.entries(T()).filter(([, t]) => t && t.linhas).map(([k, t]) => `<details><summary>${esc(t.titulo)}${t.fonte ? ' · ' + esc(t.fonte) : ''}</summary>${tabelaHtml(k)}</details>`).join('')}`;
}
let ultimoSort = null;
function textoSort(t, s) { return s.l.slice(1).filter(v => String(v).trim()).join(' · '); }
function aoClicarSort(b) {
  if (b.dataset.ss === 'aviso' && ultimoSort) { A.definir(['avisoSaH'], { txt: ultimoSort, ts: Date.now() }); A.aviso('Mandado para todos.'); return; }
  const k = b.dataset.ss, t = T()[k]; if (!t) return;
  const campo = $('#sahSb-' + k); const extra = b.dataset.extra !== undefined ? int(b.dataset.extra) : campo ? Math.max(0, int(campo.value)) : 0;
  const s = sortear(k, extra); if (!s) return;
  let txt = textoSort(t, s), repetido = false;
  // investigação: cada evento uma vez por cena (fica marcado na cena aberta)
  const inv = est().inv || {};
  if (t.unico && inv.on) {
    const fx = String(s.l[0]);
    if ((inv.evSaH || {})[fx.replace(/\W/g, '_')]) { repetido = true; txt = 'Repetido nesta cena: conta como sem evento.'; }
    else if (!/sem evento/i.test(txt)) A.definir(['inv', 'evSaH', fx.replace(/\W/g, '_')], true);
  }
  const alvo = b.dataset.quem ? nomeDe(b.dataset.quem) + ': ' : '';
  const sorteado = !repetido && /sorteado/i.test(String(s.l[2] || '')) ? (() => { const cs = cobaias(); return cs.length ? cs[Math.floor(Math.random() * cs.length)].nome : ''; })() : '';
  let sub = '';
  const sk = !repetido && t.subs && Object.keys(t.subs).find(f => naFaixa([f], s.r));
  if (sk) { const t2 = T()[t.subs[sk]], s2 = sortear(t.subs[sk]); if (s2) sub = ` → ${t2.titulo} (${t2.dado} = ${s2.r}): ${textoSort(t2, s2)}`; }
  ultimoSort = `${alvo}${t.titulo}: ${txt}${sorteado ? ' (' + sorteado + ')' : ''}${sub}`;
  $('#sahSortRes') && ($('#sahSortRes').innerHTML = '');
  const destino = b.closest('#sahMedo') ? $('#sahMsort') : $('#sahSortRes') || $('#sahMsort');
  const html = `<p class="sah-ev"><b>${esc(alvo + t.titulo)}</b> (${esc(t.dado)}${s.extra ? ' + ' + s.extra : ''} = ${s.r}): ${esc(txt)}${sorteado ? ` <b>Alvo sorteado: ${esc(sorteado)}</b>` : ''}${esc(sub)}</p><button data-ss="aviso">Mostrar para todos</button>`;
  if (destino) destino.innerHTML = html; else A.aviso(ultimoSort);
  if (b.closest('#mesaInv')) A.aviso(ultimoSort);
  A.diario && A.diario('sah', ultimoSort);
}
// eventos de investigação: botão dentro do bloco "Cena de investigação"
function botaoEvInv() {
  const c = $('#mesaInv'); if (!c || !(est().inv || {}).on || $('#sahEvInv')) return;
  const d = document.createElement('div'); d.id = 'sahEvInv'; d.className = 'mesa-linha';
  d.innerHTML = '<button data-ss="investigacao">🎲 Evento de investigação (2d6)</button>';
  c.appendChild(d);
}
// aviso curto para todos (resultado de sorteio mandado pelo Mestre)
let avisoVisto = 0;
function verAviso() { const a = est().avisoSaH; if (!a || num(a.ts) <= avisoVisto || Date.now() - num(a.ts) > 120000) return; avisoVisto = num(a.ts); if (!A.mestre) A.aviso('📜 ' + a.txt); }

/* =========================================================
   LIGAÇÕES
   ========================================================= */
function semFoco(c) { const a = document.activeElement; return !(a && c.contains(a) && a.matches('input:not([type=checkbox]):not([type=radio]), select, textarea')); }
function desenharMestre() { if (!A.mestre) return; blocoPers(); blocoFurt(); blocoMedo(); blocoSorteios(); botaoEvInv(); }
let ag = null;
function agendar() { clearTimeout(ag); ag = setTimeout(() => { faixas(); ouvirPers(); ouvirFurt(); desenharMestre(); verMedo(); verAviso(); }, 60); }
A.aoMudar(agendar);
document.addEventListener('acf-perfil', () => setTimeout(agendar, 60));
document.addEventListener('acf-ativa', agendar);
document.addEventListener('click', e => {
  const b = e.target.closest('#painel [data-sp], #painel [data-sf2], #painel [data-sm], #painel [data-ss]'); if (!b) return;
  if (b.dataset.sp) aoClicarPers(b);
  else if (b.dataset.sf2) aoClicarFurt(b);
  else if (b.dataset.ss) aoClicarSort(b);
  else if (b.dataset.sm === 'ok') {
    const alvos = {}; $$('#sahMedo [data-mp]').forEach(i => { if (i.checked) alvos[i.dataset.mp] = true; });
    if (!Object.keys(alvos).length) { A.aviso('Marque quem vê.'); return; }
    A.definir(['medoSaH'], { id: chave(), nivel: $('#sahMn').value, txt: $('#sahMtxt').value.trim(), alvos, ts: Date.now() });
    A.diario && A.diario('medo', `Visão ${$('#sahMn').value}`);
  }
});
setTimeout(agendar, 400);
window.ACF_SAH = { sortear, tabelaHtml };
})();
