/* =========================================================
   jogo.js · Hall da Caixa, conquistas (só o Mestre) e Baú de achados.
   - Hall: hall/sessoes/<sid> { ep, por, fim, mvp } e hall/salas/<id> (o Mestre grava; todos leem).
   - Conquistas: segredos/_conq/defs/<id> (a lista) e segredos/_conq/dadas/<cobaia>/<id>.
     Ficam só nos segredos do Mestre: os jogadores não veem nada.
   - Baú: o Mestre manda o item por entregas/<hash da ficha>; o aparelho do jogador abre o baú
     e põe o item na ficha ativa (o Mestre continua sem editar fichas).
   ========================================================= */
(() => {
const A = window.ACF;
if (!A) return;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = A.esc;
const num = (v, p = 0) => { const n = parseFloat(v); return isFinite(n) ? n : p; };
const int = v => Math.round(num(v));
const est = () => A.estado || {};
const sg = () => A.segredos || {};
const cobaias = () => (A.SERES || []).filter(x => x.tipo === 'cobaia');
const nomeDe = id => (A.SER[id] || {}).nome || id || '';
const S = () => window.ACF_SESSAO || {};
const MESA = () => window.ACF_MESA || {};
const ELEM = { Sangue: '#c2272f', Morte: '#8c8c8c', Conhecimento: '#d9a514', Energia: '#8a3fd1', Medo: '#e9e4f2', Varia: '#5fa8a0' };
const dataBR = ts => (ts ? new Date(num(ts)).toLocaleDateString('pt-BR') : '');

/* =========================================================
   HALL DA CAIXA
   ========================================================= */
const HALL = { v: null, off: null };
async function lerHall() { await A.garantirLogin(); HALL.v = (await A.Rede.once('hall').catch(() => null)) || {}; return HALL.v; }
const hallVisivel = () => !(est().cfg || {}).hallOff;
// soma das sessões (e da sessão em andamento, que ainda não foi fechada)
function totais(h) {
  const t = {};
  cobaias().forEach(x => { t[x.id] = { ses: 0, dano: 0, cura: 0, san: 0, rit: 0, m20: 0, m1: 0, caiu: 0, voltou: 0, des: 0, mvp: 0, salas: 0 }; });
  Object.values(h.sessoes || {}).forEach(se => {
    if (!se) return;
    Object.entries(se.por || {}).forEach(([q, p]) => { const o = t[q]; if (!o) return; o.ses++; Object.entries(p || {}).forEach(([k, v]) => { if (o[k] !== undefined) o[k] += int(v); }); });
    (se.mvp || []).forEach(q => { if (t[q]) t[q].mvp++; });
  });
  Object.values(h.salas || {}).forEach(sa => { if (sa && sa.ok) Object.keys(sa.part || {}).forEach(q => { if (t[q]) t[q].salas++; }); });
  return t;
}
const UIH = { aba: 'ep' };
async function abrirHall() {
  let o = $('#hallTela');
  if (!o) {
    o = document.createElement('div'); o.id = 'hallTela'; o.className = 'hall-tela'; document.body.appendChild(o);
    o.addEventListener('click', async e => {
      if (e.target === o || e.target.closest('[data-hl="fechar"]')) { o.hidden = true; return; }
      const ab = e.target.closest('[data-hl-aba]'); if (ab) { UIH.aba = ab.dataset.hlAba; pintarHall(); return; }
      const del = e.target.closest('[data-hl-del]');
      if (del && A.mestre && confirm('Tirar este registro do Hall?')) { await A.Rede.set('hall/' + del.dataset.hlDel, null).catch(() => {}); await lerHall(); pintarHall(); avaliarLogo(); }
    });
  }
  o.innerHTML = '<div class="hall-caixa"><p class="mini">Abrindo o Hall…</p></div>'; o.hidden = false;
  await lerHall(); pintarHall();
}
function pintarHall() {
  const o = $('#hallTela'); if (!o || o.hidden) return;
  const h = HALL.v || {}, t = totais(h);
  const eps = Object.entries(h.sessoes || {}).filter(([, se]) => se && se.ep).sort((a, b) => num(a[1].ep.ini) - num(b[1].ep.ini));
  const salas = Object.entries(h.salas || {}).filter(([, x]) => x).sort((a, b) => num(a[1].ts) - num(b[1].ts));
  const abas = [['ep', `Episódios (${eps.length})`], ['cob', 'Cobaias'], ['sal', `Salas (${salas.filter(([, x]) => x.ok).length}/${salas.length})`]].concat(A.mestre ? [['conq', '🏅 Conquistas (só você)']] : []);
  const sig = window.ACF_SESSAO && window.ACF_SESSAO.htmlSigilo ? window.ACF_SESSAO.htmlSigilo('mini') : '';
  let corpo = '';
  if (UIH.aba === 'ep') {
    corpo = eps.length ? `<div class="hall-eps">${eps.map(([sid, se]) => { const ep = se.ep; const m = (se.mvp || [])[0], ms = A.SER[m] || {};
      return `<article class="hall-ep estilo-${esc(ep.estilo || 'eco')}">${sig}<div><p class="ab-k">${ep.num ? `SESSÃO ${esc(ep.num)}` : 'SESSÃO'}</p><h3>${esc(ep.nome || ep.tit || '')}</h3>${ep.frase ? `<p class="hall-frase">${esc(ep.frase)}</p>` : ''}<p class="mini">${dataBR(ep.ini)}${se.fim ? '' : ' · em andamento'}</p>
        ${m ? `<p class="hall-mvp" style="--cor:${ms.cor || '#ece64a'}"><i${ms.img ? ` style="background-image:url('${ms.img}')"` : ''}></i>🏆 ${esc((se.mvp || []).map(nomeDe).join(' e '))}</p>` : ''}</div>${A.mestre ? `<button data-hl-del="sessoes/${esc(sid)}" class="hall-x" aria-label="Tirar">×</button>` : ''}</article>`; }).join('')}</div>`
      : '<p class="mini">Nenhum episódio ainda. Cada abertura exibida para todos vira um episódio; o encerramento guarda as estatísticas.</p>';
  } else if (UIH.aba === 'cob') {
    const linhas = [['ses', 'sessões'], ['m20', '20 naturais'], ['m1', '1 naturais'], ['dano', 'dano sofrido'], ['cura', 'PV curados'], ['san', 'SAN perdida'], ['rit', 'rituais'], ['caiu', 'quedas'], ['voltou', 'voltou do Morrendo'], ['salas', 'salas superadas'], ['mvp', 'Cobaia da Sessão']];
    corpo = `<div class="hall-cobs">${cobaias().map(x => { const v = t[x.id] || {}; return `<article class="hall-cob" style="--cor:${x.cor || '#ece64a'}"><i${x.img ? ` style="background-image:url('${x.img}')"` : ''}></i><h3>${esc(x.nome)}</h3><small>${esc(x.codigo || '')}</small><dl>${linhas.map(([k, n]) => `<div class="${int(v[k]) ? '' : 'zero'}"><dt>${n}</dt><dd>${int(v[k])}</dd></div>`).join('')}</dl></article>`; }).join('')}</div>`;
  } else if (UIH.aba === 'sal') {
    corpo = salas.length ? `<ul class="hall-salas">${salas.map(([id, x]) => `<li style="--el:${ELEM[x.el] || '#8a3fd1'}"><b>${x.ok ? '✓' : '✗'}</b><span>${esc(x.nome)} <small>${esc(x.el || '')} · ${dataBR(x.ts)} · ${Object.keys(x.part || {}).map(nomeDe).map(esc).join(', ')}</small></span>${A.mestre ? `<button data-hl-del="salas/${esc(id)}" class="hall-x" aria-label="Tirar">×</button>` : ''}</li>`).join('')}</ul>` : '<p class="mini">Nenhuma Sala de Exposição encerrada ainda.</p>';
  } else if (UIH.aba === 'conq' && A.mestre) {
    const defs = (sg()._conq || {}).defs || {}, dadas = (sg()._conq || {}).dadas || {};
    corpo = `<div class="hall-cobs">${cobaias().map(x => { const d = Object.entries(dadas[x.id] || {}).filter(([id]) => defs[id]); return `<article class="hall-cob" style="--cor:${x.cor || '#ece64a'}"><i${x.img ? ` style="background-image:url('${x.img}')"` : ''}></i><h3>${esc(x.nome)}</h3><small>${d.length} de ${Object.keys(defs).length}</small><ul class="conq-lista">${d.map(([id, g]) => `<li title="${esc(defs[id].d || '')}"><span>${esc(defs[id].ic || '🏅')}</span>${esc(defs[id].n)}<small>${g.por === 'mestre' ? 'dada por você' : 'automática'} · ${dataBR(g.ts)}</small></li>`).join('') || '<li class="zero">Nenhuma.</li>'}</ul></article>`; }).join('')}</div>`;
  }
  o.innerHTML = `<div class="hall-caixa"><header><div><p class="ab-k">A CAIXA DE FÓSFOROS</p><h2>Hall da Caixa</h2></div><button data-hl="fechar" class="hall-fechar" aria-label="Fechar">×</button></header>
    <nav class="hall-abas">${abas.map(([k, n]) => `<button data-hl-aba="${k}" class="${UIH.aba === k ? 'on' : ''}">${n}</button>`).join('')}</nav>${corpo}</div>`;
}
const bH = $('#btnHall'); if (bH) bH.addEventListener('click', abrirHall);
function botaoHall() { const b = $('#btnHall'); if (!b) return; const ver = !A.mestre && (!!A.meu || !!A.aux) && hallVisivel(); if (b.hidden === ver) b.hidden = !ver; }
// sessão em andamento: o Mestre grava as estatísticas parciais no Hall
async function atualizarSessaoNoHall() {
  const sid = S().sidAtual ? S().sidAtual() : '';
  if (!sid) { A.aviso('Exiba uma abertura para todos primeiro: ela abre o episódio.'); return; }
  const r = MESA().agregarRelatorio ? await MESA().agregarRelatorio(S().iniSessao()) : null; if (!r) return;
  const por = {};
  Object.entries(r.por).forEach(([q, p]) => { const o = {}; ['dano', 'cura', 'san', 'rit', 'm20', 'm1', 'caiu', 'voltou', 'des'].forEach(k => { if (int(p[k])) o[k] = int(p[k]); }); if (Object.keys(o).length) por[q] = o; });
  await A.Rede.set(`hall/sessoes/${sid}/por`, por).catch(() => A.aviso('O servidor recusou.'));
  A.aviso('Hall atualizado com a sessão em andamento.'); avaliarLogo();
}
function desenharBlocoHall() {
  const c = $('#mesaHall'); if (!c || !A.mestre) return;
  const k = String(hallVisivel()); if (c.dataset.k === k) return; c.dataset.k = k;
  c.innerHTML = `<p class="mini">Episódios (um por abertura exibida), estatísticas de cada cobaia somando as sessões, e as Salas de Exposição superadas. O encerramento grava as estatísticas da sessão.</p>
    <div class="mesa-linha"><button data-hm="abrir" class="btn-protocolo">🏛 Abrir o Hall</button><button data-hm="atual">↻ Gravar a sessão em andamento</button></div>
    <label class="chave"><input type="checkbox" id="hallPub" ${hallVisivel() ? 'checked' : ''}><span>Jogadores e auxiliares veem o Hall (botão no painel)</span></label>`;
  $('#hallPub', c).onchange = e => A.definir(['cfg', 'hallOff'], e.target.checked ? null : true);
}

/* =========================================================
   CONQUISTAS (só o Mestre)
   ========================================================= */
const TIPOS = [['manual', 'Só manual (você dá)'], ['m20', '20 naturais'], ['m1', '1 naturais'], ['rit', 'rituais conjurados'], ['dano', 'dano sofrido'], ['cura', 'PV curados'], ['san', 'SAN perdida'], ['caiu', 'quedas a 0 PV'], ['voltou', 'voltou do Morrendo'], ['des', 'desejos na Parede'], ['salas', 'Salas de Exposição superadas'], ['mvp', 'vezes Cobaia da Sessão']];
const nomeTipo = t => (TIPOS.find(x => x[0] === t) || [, t])[1];
const conq = () => sg()._conq || {};
const defs = () => Object.fromEntries(Object.entries(conq().defs || {}).filter(([, d]) => d && d.n));
const dadas = () => conq().dadas || {};
const CQ = { t: null, rodando: false };
function avaliarLogo() { clearTimeout(CQ.t); CQ.t = setTimeout(avaliar, 2500); }
// números por cobaia: maior valor numa sessão e soma da campanha
async function numeros() {
  const h = await lerHall();
  const sid = S().sidAtual ? S().sidAtual() : '', sessoes = Object.entries(h.sessoes || {}).filter(([, x]) => x);
  const aberta = !sessoes.length || (sid && !(h.sessoes[sid] || {}).fim);
  const lista = sessoes.filter(([k]) => !(aberta && k === sid)).map(([k, x]) => ({ sid: k, por: x.por || {}, mvp: x.mvp || [] }));
  if (aberta && MESA().agregarRelatorio) {
    const r = await MESA().agregarRelatorio(sid ? S().iniSessao() : 0);
    const m = est().mvp, mvpAtual = m && m.venc && num(m.resTs) >= (S().iniSessao ? S().iniSessao() : 0) ? m.venc : [];
    lista.push({ sid: sid || 'atual', por: r ? r.por : {}, mvp: mvpAtual });
  }
  const salas = Object.values(h.salas || {}).filter(x => x && x.ok);
  const out = {};
  cobaias().forEach(c => {
    const o = { ses: {}, camp: {} };
    TIPOS.forEach(([t]) => { o.ses[t] = 0; o.camp[t] = 0; });
    lista.forEach(se => {
      const p = se.por[c.id] || {};
      ['m20', 'm1', 'rit', 'dano', 'cura', 'san', 'caiu', 'voltou', 'des'].forEach(t => { o.camp[t] += int(p[t]); o.ses[t] = Math.max(o.ses[t], int(p[t])); });
      const mv = se.mvp.includes(c.id) ? 1 : 0; o.camp.mvp += mv; o.ses.mvp = Math.max(o.ses.mvp, mv);
    });
    o.salasDe = (el, ses) => { const ss = salas.filter(x => (x.part || {})[c.id] && (!el || x.el === el)); if (!ses) return ss.length; const g = {}; ss.forEach(x => { g[x.sid || ''] = (g[x.sid || ''] || 0) + 1; }); return Math.max(0, ...Object.values(g)); };
    out[c.id] = o;
  });
  return out;
}
async function avaliar() {
  if (!A.mestre || !A.segredosProntos || CQ.rodando) return;
  const D = defs(); if (!Object.values(D).some(d => d.regra && d.regra.t && d.regra.t !== 'manual')) return;
  CQ.rodando = true;
  try {
    const N = await numeros(), G = dadas(), novas = [];
    Object.entries(N).forEach(([q, o]) => Object.entries(D).forEach(([id, d]) => {
      const r = d.regra || {}; if (!r.t || r.t === 'manual' || (G[q] || {})[id]) return;
      const ses = r.esc === 'sessao';
      const v = r.t === 'salas' ? o.salasDe(r.el || '', ses) : (ses ? o.ses : o.camp)[r.t];
      if (int(v) >= Math.max(1, int(r.min) || 1)) novas.push([q, id]);
    }));
    novas.forEach(([q, id]) => A.gravarSegredo(['_conq', 'dadas', q, id], { ts: Date.now(), por: 'auto', sid: S().sidAtual ? S().sidAtual() : '' }));
    if (novas.length && A.alertaMestre) A.alertaMestre('🏅 Conquista' + (novas.length > 1 ? 's' : '') + ': ' + novas.map(([q, id]) => `${nomeDe(q)} · ${D[id].ic || ''} ${D[id].n}`).join('; '));
    if (novas.length) setTimeout(() => desenharBlocoConq(true), 400);
  } finally { CQ.rodando = false; }
}
const UIC = { ed: null };
function desenharBlocoConq(forcar) {
  const c = $('#mesaConq'); if (!c || !A.mestre || !A.segredosProntos) return;
  const a = document.activeElement; if (!forcar && a && c.contains(a) && a.matches('input, select, textarea')) return;
  const D = defs(), G = dadas();
  const k = JSON.stringify([D, G]); if (!forcar && c.dataset.k === k) return; c.dataset.k = k;
  const qtd = Object.keys(D).length;
  c.innerHTML = `<p class="mini">Só você vê. As automáticas saem do Relatório, do Hall e das Salas de Exposição; as manuais você dá. Os jogadores não recebem aviso nem veem a lista.</p>
    <div class="mesa-linha"><select id="cqQ">${cobaias().map(x => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select><select id="cqD">${Object.entries(D).sort((x, y) => x[1].n.localeCompare(y[1].n, 'pt')).map(([id, d]) => `<option value="${esc(id)}">${esc(d.ic || '🏅')} ${esc(d.n)}</option>`).join('')}</select><button data-cq="dar" ${qtd ? '' : 'disabled'}>🏅 Dar</button></div>
    <div class="cq-grade">${cobaias().map(x => { const lst = Object.entries(G[x.id] || {}).filter(([id]) => D[id]); return `<div class="cq-cob" style="--cor:${x.cor || '#ece64a'}"><b>${esc(x.nome)}</b> <small>${lst.length}</small><div>${lst.map(([id, g]) => `<span class="cq-chip${g.por === 'mestre' ? ' man' : ''}" title="${esc(D[id].d || '')}${g.por === 'mestre' ? ' (dada por você)' : ''}">${esc(D[id].ic || '🏅')} ${esc(D[id].n)}<button data-cq="tirar" data-q="${x.id}" data-id="${esc(id)}" aria-label="Tirar">×</button></span>`).join('') || '<small class="mini">nenhuma</small>'}</div></div>`; }).join('')}</div>
    <div class="mesa-linha"><button data-cq="reav">↻ Verificar agora</button><button data-cq="nova">+ Nova conquista</button><label class="amb-arq">⬆ Importar<input type="file" id="cqImp" accept=".json,application/json" hidden></label><button data-cq="exp" ${qtd ? '' : 'disabled'}>⬇ Exportar</button></div>
    <details><summary>Lista de conquistas (${qtd})</summary>${qtd ? `<ul class="cq-defs">${Object.entries(D).map(([id, d]) => `<li><span>${esc(d.ic || '🏅')} <b>${esc(d.n)}</b> <small>${esc(d.d || '')} · ${d.regra && d.regra.t && d.regra.t !== 'manual' ? `${int(d.regra.min) || 1}+ ${esc(nomeTipo(d.regra.t))}${d.regra.el ? ` de ${esc(d.regra.el)}` : ''} ${d.regra.esc === 'sessao' ? 'numa sessão' : 'na campanha'}` : 'manual'}</small></span><button data-cq="editar" data-id="${esc(id)}">✎</button><button data-cq="apagar" data-id="${esc(id)}" aria-label="Apagar">×</button></li>`).join('')}</ul>` : '<p class="mini">Nenhuma. Importe o arquivo conquistas.json (guardado fora do GitHub) ou crie em "+ Nova conquista".</p>'}</details>`;
  const imp = $('#cqImp', c); if (imp) imp.onchange = e => { importarConq(e.target.files[0]); e.target.value = ''; };
}
const limparId = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'conquista';
function limparDef(d) {
  const r = d.regra || {};
  return { n: String(d.n || '').slice(0, 60), ic: String(d.ic || '🏅').slice(0, 4), d: String(d.d || '').slice(0, 200), regra: { t: TIPOS.some(x => x[0] === r.t) ? r.t : 'manual', min: Math.max(1, int(r.min) || 1), esc: r.esc === 'sessao' ? 'sessao' : 'campanha', ...(r.el ? { el: String(r.el) } : {}) } };
}
function importarConq(arq) {
  if (!arq) return;
  arq.text().then(t => {
    let o; try { o = JSON.parse(t); } catch (e) { A.aviso('Arquivo inválido.'); return; }
    const L = o && o.tipo === 'planta-acf-conquistas' && Array.isArray(o.conquistas) ? o.conquistas.filter(d => d && d.n) : [];
    if (!L.length) { A.aviso('Esse arquivo não tem conquistas.'); return; }
    L.forEach(d => A.gravarSegredo(['_conq', 'defs', limparId(d.id || d.n)], limparDef(d)));
    A.aviso(`${L.length} conquista${L.length === 1 ? '' : 's'} importada${L.length === 1 ? '' : 's'}.`);
    setTimeout(() => { desenharBlocoConq(true); avaliarLogo(); }, 200);
  });
}
function exportarConq() {
  const blob = new Blob([JSON.stringify({ tipo: 'planta-acf-conquistas', versao: 1, conquistas: Object.entries(defs()).map(([id, d]) => ({ id, ...d })) }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'conquistas.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  A.aviso('Exportado. Guarde fora do GitHub.');
}
function editarConq(id) {
  const d = id ? defs()[id] || {} : { n: '', ic: '🏅', d: '', regra: { t: 'manual', min: 1, esc: 'campanha' } }, r = d.regra || {};
  let o = $('#cqModal');
  if (!o) { o = document.createElement('div'); o.id = 'cqModal'; o.className = 'rr-modal'; document.body.appendChild(o); }
  o.innerHTML = `<div class="rr-modal-caixa"><h3>${id ? 'Editar conquista' : 'Nova conquista'}</h3>
    <div class="ses-grade"><label>Nome <input data-cd="n" value="${esc(d.n || '')}" maxlength="60"></label><label>Ícone <input data-cd="ic" value="${esc(d.ic || '🏅')}" maxlength="4"></label></div>
    <label>Descrição (só você lê) <input data-cd="d" value="${esc(d.d || '')}" maxlength="200"></label>
    <div class="ses-grade"><label>Como ganha <select data-cd="t">${TIPOS.map(([k, n]) => `<option value="${k}" ${r.t === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label>Quantidade mínima <input data-cd="min" type="number" min="1" value="${int(r.min) || 1}"></label>
    <label>Contando <select data-cd="esc"><option value="campanha" ${r.esc !== 'sessao' ? 'selected' : ''}>na campanha toda</option><option value="sessao" ${r.esc === 'sessao' ? 'selected' : ''}>numa única sessão</option></select></label>
    <label>Elemento (só salas) <select data-cd="el"><option value="">qualquer</option>${Object.keys(ELEM).map(e => `<option ${r.el === e ? 'selected' : ''}>${e}</option>`).join('')}</select></label></div>
    <div class="rr-botoes"><button data-cb="cancelar">Cancelar</button><button data-cb="salvar" class="pri">Salvar</button></div></div>`;
  o.hidden = false;
  o.onclick = e => {
    if (e.target === o || e.target.closest('[data-cb="cancelar"]')) { o.hidden = true; return; }
    if (!e.target.closest('[data-cb="salvar"]')) return;
    const v = k => ($(`[data-cd="${k}"]`, o) || {}).value || '';
    if (!v('n').trim()) { A.aviso('Dê um nome.'); return; }
    const nd = limparDef({ n: v('n').trim(), ic: v('ic').trim(), d: v('d').trim(), regra: { t: v('t'), min: v('min'), esc: v('esc'), el: v('el') } });
    A.gravarSegredo(['_conq', 'defs', id || limparId(nd.n)], nd);
    o.hidden = true; setTimeout(() => { desenharBlocoConq(true); avaliarLogo(); }, 150);
  };
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cq]'); if (!b || !A.mestre) return;
  const a = b.dataset.cq;
  if (a === 'dar') { const q = $('#cqQ').value, id = $('#cqD').value; if (!q || !id) return; if ((dadas()[q] || {})[id]) { A.aviso(`${nomeDe(q)} já tem essa.`); return; } A.gravarSegredo(['_conq', 'dadas', q, id], { ts: Date.now(), por: 'mestre', sid: S().sidAtual ? S().sidAtual() : '' }); setTimeout(() => desenharBlocoConq(true), 150); }
  else if (a === 'tirar') { if (confirm(`Tirar "${(defs()[b.dataset.id] || {}).n}" de ${nomeDe(b.dataset.q)}?`)) { A.gravarSegredo(['_conq', 'dadas', b.dataset.q, b.dataset.id], null); setTimeout(() => desenharBlocoConq(true), 150); } }
  else if (a === 'reav') { avaliar().then(() => A.aviso('Conquistas verificadas.')); }
  else if (a === 'nova') editarConq(null);
  else if (a === 'editar') editarConq(b.dataset.id);
  else if (a === 'apagar') { const d = defs()[b.dataset.id]; if (d && confirm(`Apagar a conquista "${d.n}"? Quem já tem perde.`)) { A.gravarSegredo(['_conq', 'defs', b.dataset.id], null); Object.keys(dadas()).forEach(q => { if ((dadas()[q] || {})[b.dataset.id]) A.gravarSegredo(['_conq', 'dadas', q, b.dataset.id], null); }); setTimeout(() => desenharBlocoConq(true), 150); } }
  else if (a === 'exp') exportarConq();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-hm]'); if (!b || !A.mestre) return;
  if (b.dataset.hm === 'abrir') abrirHall(); else if (b.dataset.hm === 'atual') atualizarSessaoNoHall();
});
document.addEventListener('acf-hall', () => { if (A.mestre) avaliarLogo(); });

/* =========================================================
   BAÚ DE ACHADOS
   ========================================================= */
const ITENS = () => ((typeof CATALOGO_OP !== 'undefined' && CATALOGO_OP.itens) || []);
const TIPOS_ITEM = { geral: 'Geral', arma: 'Arma', municao: 'Munição', protecao: 'Proteção', amaldicoado: 'Item Amaldiçoado' };
function itemDoCatalogo(x, qtd) {
  const v = { n: x.n, t: x.t || 'geral', cat: int(x.cat), esp: num(x.esp, 1), qtd: Math.max(1, int(qtd) || 1), d: String(x.d || '').slice(0, 1500) };
  if (x.el) v.el = x.el; if (x.a) v.a = { ...x.a }; if (x.def) v.def = x.def; if (x.t === 'protecao') v.vest = false;
  return v;
}
function desenharBlocoBau() {
  const c = $('#mesaBau'); if (!c || !A.mestre || c.dataset.ok) return;
  c.dataset.ok = '1';
  c.innerHTML = `<p class="mini">O item chega como um baú que se abre na tela da cobaia e entra na ficha ativa dela pelo próprio aparelho (você continua sem editar fichas). Se o jogador não estiver com o site aberto, o baú espera.</p>
    <div class="mesa-linha"><select id="bauQ">${cobaias().map(x => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></div>
    <label class="mesa-campo">Item do catálogo <input id="bauCat" list="bauLista" placeholder="Digite para buscar (ex.: Lanterna)"></label><datalist id="bauLista">${ITENS().map(x => `<option value="${esc(x.n)}">`).join('')}</datalist>
    <details><summary>Ou um item que não está no catálogo</summary>
      <label class="mesa-campo">Nome <input id="bauNome" maxlength="80"></label><label class="mesa-campo">Descrição <textarea id="bauDesc" rows="3" maxlength="1500"></textarea></label>
      <div class="mesa-linha"><select id="bauTipo">${Object.entries(TIPOS_ITEM).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select><label class="mesa-campo-in">Categoria <input id="bauCatN" type="number" min="0" max="4" value="0"></label><label class="mesa-campo-in">Espaços <input id="bauEsp" type="number" min="0" max="10" step="0.5" value="1"></label></div></details>
    <div class="mesa-linha"><label class="mesa-campo-in">Quantidade <input id="bauQtd" type="number" min="1" max="99" value="1"></label></div>
    <label class="mesa-campo">Onde encontrou (aparece no baú, opcional) <input id="bauMsg" maxlength="140" placeholder="Ex.: no fundo do armário de remédios"></label>
    <button data-bau="enviar" class="btn-protocolo">🎁 Enviar o baú</button><div id="bauLog"></div>`;
  pintarLogBau();
}
function pintarLogBau() {
  const l = $('#bauLog'); if (!l) return;
  const lst = Object.values(sg()._bau || {}).filter(Boolean).sort((a, b) => num(b.ts) - num(a.ts)).slice(0, 12);
  l.innerHTML = lst.length ? `<p class="mesa-k">ENVIADOS</p><ul class="bau-log">${lst.map(x => `<li>${esc(nomeDe(x.q))}: ${esc(x.n)}${int(x.qtd) > 1 ? ` ×${int(x.qtd)}` : ''} <small>${new Date(num(x.ts)).toLocaleString('pt-BR')}</small></li>`).join('')}</ul>` : '';
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-bau="enviar"]'); if (!b || !A.mestre) return;
  const q = $('#bauQ').value, nomeCat = ($('#bauCat').value || '').trim(), nomeLivre = ($('#bauNome').value || '').trim(), qtd = int($('#bauQtd').value) || 1;
  let item = null;
  if (nomeCat) {
    const alvo = nomeCat.toLowerCase(), parecidos = ITENS().filter(i => i.n.toLowerCase().includes(alvo));
    const x = ITENS().find(i => i.n.toLowerCase() === alvo) || (parecidos.length === 1 ? parecidos[0] : null);
    if (!x) { A.aviso(parecidos.length ? `Escolha um: ${parecidos.slice(0, 4).map(i => i.n).join(', ')}${parecidos.length > 4 ? '…' : ''}.` : 'Esse item não está no catálogo. Use "Ou um item que não está no catálogo".'); return; }
    item = itemDoCatalogo(x, qtd);
  }
  else if (nomeLivre) item = { n: nomeLivre.slice(0, 80), t: $('#bauTipo').value, cat: Math.max(0, int($('#bauCatN').value)), esp: Math.max(0, num($('#bauEsp').value, 1)), qtd, d: ($('#bauDesc').value || '').trim().slice(0, 1500) };
  if (!item) { A.aviso('Escolha um item.'); return; }
  const R = window.ACF_REGRAS; if (!R || !R.entregar) return;
  b.disabled = true;
  const n = await R.entregar(q, { item, msg: ($('#bauMsg').value || '').trim().slice(0, 140) });
  b.disabled = false;
  if (!n) { A.aviso(`${nomeDe(q)} ainda não tem ficha no servidor: o baú não tem para onde ir.`); return; }
  A.gravarSegredo(['_bau', A.Rede.chave()], { q, n: item.n, qtd: item.qtd, ts: Date.now() });
  A.aviso(`🎁 Baú enviado para ${nomeDe(q)}.`);
  ['#bauCat', '#bauNome', '#bauDesc', '#bauMsg'].forEach(s => { const i = $(s); if (i) i.value = ''; });
  setTimeout(pintarLogBau, 200);
});
// jogador: o baú aparece e, ao abrir, o item entra na ficha ativa
const BAU = { fila: [], aberto: false };
function abrirBau(e, guardar) {
  BAU.fila.push([e, guardar]);
  if (!BAU.aberto) proxBau();
}
function proxBau() {
  const nx = BAU.fila.shift(); if (!nx) { BAU.aberto = false; return; }
  BAU.aberto = true;
  const [e, guardar] = nx, it = e.item || {};
  let o = $('#bauTela');
  if (!o) { o = document.createElement('div'); o.id = 'bauTela'; o.className = 'bau-tela'; document.body.appendChild(o); }
  o.className = 'bau-tela';
  o.innerHTML = `<div class="bau-caixa"><p class="ab-k">VOCÊ ENCONTROU ALGO</p>${e.msg ? `<p class="bau-msg">${esc(e.msg)}</p>` : ''}
    <div class="bau-arte"><i class="bau-luz"></i><svg viewBox="0 0 120 100" class="bau-svg"><g class="bau-tampa"><path d="M14 44 Q14 18 60 18 Q106 18 106 44 Z" /><rect x="54" y="36" width="12" height="12" rx="2" class="bau-fecho"/></g><rect x="14" y="44" width="92" height="46" rx="4" class="bau-corpo"/><rect x="14" y="58" width="92" height="6" class="bau-faixa"/><rect x="54" y="44" width="12" height="16" rx="2" class="bau-fecho"/></svg></div>
    <div class="bau-item"><b>${esc(it.n || 'Item')}</b><small>${esc(TIPOS_ITEM[it.t] || '')}${it.cat !== undefined ? ` · Categoria ${int(it.cat)}` : ''}${it.esp !== undefined ? ` · ${num(it.esp)} espaço${num(it.esp) === 1 ? '' : 's'}` : ''}${int(it.qtd) > 1 ? ` · ×${int(it.qtd)}` : ''}${it.el ? ` · ${esc(it.el)}` : ''}</small>${it.d ? `<p>${esc(String(it.d).slice(0, 400))}</p>` : ''}</div>
    <div class="bau-botoes"><button data-bt="abrir" class="pri">🗝 Abrir o baú</button></div></div>`;
  o.hidden = false;
  const som = (f, t, d, tp, ff) => { if (A.Som && !A.mudo) A.Som.tom(f, t, d, tp, 0.07, ff); };
  $('[data-bt="abrir"]', o).onclick = async ev => {
    ev.target.disabled = true;
    o.classList.add('abrindo'); som(180, 0, 0.5, 'sawtooth', 120); [784, 988, 1175, 1568].forEach((f, i) => som(f, 0.45 + i * 0.1, 0.3, 'triangle'));
    const ok = await guardar();
    setTimeout(() => {
      o.classList.add('aberto');
      $('.bau-botoes', o).innerHTML = ok ? '<p class="mini">Guardado na sua ficha ativa.</p><button data-bt="ok" class="pri">Fechar</button>' : '<p class="mini">Não deu para guardar agora (ative sua ficha). O baú volta depois.</p><button data-bt="ok">Fechar</button>';
      $('[data-bt="ok"]', o).onclick = () => { o.hidden = true; setTimeout(proxBau, 300); };
    }, 900);
  };
}

/* ---------- ligações ---------- */
let ag = false;
function tudo() {
  if (ag) return; ag = true;
  requestAnimationFrame(() => { ag = false; try { botaoHall(); desenharBlocoHall(); desenharBlocoBau(); desenharBlocoConq(); } catch (err) { console.warn('jogo:', err); } });
}
A.aoMudar(tudo);
document.addEventListener('acf-segredos', () => setTimeout(() => { desenharBlocoConq(); pintarLogBau(); }, 50));
document.addEventListener('acf-perfil', () => setTimeout(tudo, 60));
setTimeout(tudo, 600);
setInterval(() => { if (A.mestre) avaliar(); }, 90000);
setTimeout(() => { if (A.mestre) avaliar(); }, 8000);
window.ACF_JOGO = { abrirHall, abrirBau, avaliar };
})();
