/* =========================================================
   arquivo.js · Arquivo da O.R.F.E.U.
   - Cifras de sigilos: alfabeto de 36 símbolos próprios (gerados aqui, sem copiar os oficiais).
     A chave (qual letra vira qual símbolo) fica só nos segredos do Mestre.
     Os jogadores tentam decifrar juntos: cada palpite aparece para todos; o Mestre revela letras.
   - Documentos tarjados: o Mestre marca trechos com [[assim]] e vai destarjando durante a sessão.
   - Visões: imagem ou frase que pisca na tela de um jogador só.
   Caminhos: mapa/cifras, mapa/cifraRev, mapa/docs (públicos, só o Mestre grava),
   cifraPalpite (qualquer jogador), visoes/<cobaia> (só o Mestre grava),
   segredos/_sigilos, _cifras e _docs (só o Mestre).
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
const cobaias = () => (A.SERES || []).filter(x => x.tipo === 'cobaia');
const ls = { get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const somOk = () => !A.mudo && A.Som && A.Som.tom;
const sg = () => A.segredos || {};

/* =========================================================
   1. ALFABETO DE SIGILOS
   Grade 3×3 de pontos levemente tortos. Cada símbolo é um caminho de 3 a 5 traços
   entre pontos vizinhos, às vezes com um ponto ou um círculo. Semente fixa: todos veem os mesmos.
   ========================================================= */
function semente(txt) { let h = 2166136261; for (const c of String(txt)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
const PONTOS = [[18, 16], [50, 9], [82, 18], [13, 50], [50, 50], [87, 48], [20, 84], [51, 91], [80, 83]];
const vizinhos = i => { const r = Math.floor(i / 3), c = i % 3, out = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const nr = r + dr, nc = c + dc; if ((dr || dc) && nr >= 0 && nr < 3 && nc >= 0 && nc < 3) out.push(nr * 3 + nc); } return out; };
const GLIFOS = (() => {
  const r = semente('orfeu-cifra-v1'), vistos = new Set(), out = [];
  let tent = 0;
  while (out.length < 36 && tent++ < 5000) {
    const passos = 3 + Math.floor(r() * 3);
    let p = Math.floor(r() * 9);
    const arestas = new Set();
    for (let i = 0; i < passos; i++) {
      const vz = vizinhos(p), q = vz[Math.floor(r() * vz.length)];
      arestas.add(Math.min(p, q) + '-' + Math.max(p, q));
      p = r() < 0.75 ? q : Math.floor(r() * 9);
    }
    if (arestas.size < 3) continue;
    const x = r(), extra = x < 0.22 ? 'c' : x < 0.5 ? 'o' + Math.floor(r() * 9) : '';
    const assin = [...arestas].sort().join(',') + extra;
    if (vistos.has(assin)) continue;
    vistos.add(assin);
    out.push({ t: [...arestas].map(a => a.split('-').map(Number)), extra });
  }
  return out;
})();
function glifoSVG(i) {
  const g = GLIFOS[i]; if (!g) return '';
  const d = g.t.map(([a, b]) => `M${PONTOS[a][0]} ${PONTOS[a][1]}L${PONTOS[b][0]} ${PONTOS[b][1]}`).join('');
  let ex = '';
  if (g.extra === 'c') ex = '<circle cx="50" cy="50" r="12"/>';
  else if (g.extra[0] === 'o') { const p = PONTOS[+g.extra.slice(1)]; ex = `<circle cx="${p[0]}" cy="${p[1]}" r="6" class="gl-ponto"/>`; }
  return `<svg class="glifo" viewBox="0 0 100 100" aria-hidden="true"><path d="${d}"/>${ex}</svg>`;
}
const ALF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const normal = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
// chave secreta do Mestre: permutação das 36 posições
function chave() {
  const c = String(sg()._sigilos || '');
  const arr = c.split(',').map(Number);
  if (arr.length === 36 && new Set(arr).size === 36) return arr;
  if (!A.segredosProntos) return null;   // segredos ainda carregando: nunca cria outra chave por cima
  const nova = [...Array(36).keys()];
  for (let i = nova.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nova[i], nova[j]] = [nova[j], nova[i]]; }
  A.gravarSegredo(['_sigilos'], nova.join(','));
  return nova;
}
const letraDoGlifo = g => { const k = chave(); const i = k ? k.indexOf(g) : -1; return i >= 0 ? ALF[i] : '?'; };
// texto → lista: número = símbolo, ' ' = espaço, '\n' = linha, outro texto = pontuação
function cifrar(txt) {
  const k = chave(), out = [];
  if (!k) return out;
  for (const ch of normal(txt).slice(0, 400)) {
    const i = ALF.indexOf(ch);
    if (i >= 0) out.push(k[i]);
    else if (ch === '\n') out.push('\n');
    else if (/\s/.test(ch)) out.push(' ');
    else if (/[.,;:!?'"()\-\/]/.test(ch)) out.push(ch);
  }
  return out;
}

/* ---------- palpites compartilhados ---------- */
let palpites = {}, palOff = null;
function ligarPalpites() {
  if (palOff || !A.pronto || !(A.mestre || A.meu || A.aux)) return;
  palOff = true;
  A.garantirLogin().then(() => { palOff = A.Rede.on('cifraPalpite', v => { palpites = v || {}; redesenhar(); }, () => {}); }, () => { palOff = null; });
}
const revDe = g => (est().cifraRev || {})['g' + g] || '';

// desenha uma cifra; modo: 'cheia' (Arquivo), 'mini' (chat e sala)
function htmlCifra(id, c, modo = 'cheia') {
  if (!c) return '<span class="cf-sumiu">cifra apagada</span>';
  const s = Array.isArray(c.s) ? c.s : Object.values(c.s || {});
  const palavras = [];
  let atual = [];
  s.forEach(t => { if (t === ' ' || t === '\n') { if (atual.length) palavras.push(atual); atual = []; if (t === '\n') palavras.push('br'); } else atual.push(t); });
  if (atual.length) palavras.push(atual);
  const corpo = palavras.map(p => p === 'br' ? '<span class="cf-br"></span>' : `<span class="cf-palavra">${p.map(htmlCel).join('')}</span>`).join('');
  return `<div class="cifra cf-${modo}" data-cifra="${esc(id)}">${modo === 'mini' && c.tit ? `<span class="cf-tit">◈ ${esc(c.tit)}</span>` : ''}<div class="cf-texto">${corpo}</div></div>`;
}
function htmlCel(t) {
    if (typeof t !== 'number') return `<span class="cf-pont">${esc(t)}</span>`;
    const rv = revDe(t), pl = palpites['g' + t];
    const certo = A.mestre ? letraDoGlifo(t) : '';
    return `<button class="cf-cel${rv ? ' rev' : pl ? ' pal' : ''}${A.mestre && pl && !rv ? (pl.l === certo ? ' pal-ok' : ' pal-erro') : ''}" data-g="${t}" title="${rv ? 'Revelada pelo Mestre' : pl ? `Palpite de ${esc((A.SER[pl.por] || {}).nome || 'alguém')}` : A.mestre ? 'Toque para revelar esta letra' : 'Toque para dar um palpite'}">
      <span class="cf-letra">${esc(rv || (pl ? pl.l : ''))}</span>${glifoSVG(t)}${A.mestre ? `<small class="cf-certo">${certo}</small>` : ''}</button>`;
}
const cifrasPub = () => est().cifras || {};
const docsPub = () => est().docs || {};
const ondeVisivel = o => { const m = /^sala:(\d+)$/.exec(o || ''); return !m || A.mestre || A.salaVisivel(+m[1]); };

/* ---------- popover de palpite (jogador) ---------- */
function abrirPalpite(g, botao) {
  let p = $('#cfPalpite');
  if (!p) {
    p = document.createElement('div'); p.id = 'cfPalpite'; p.className = 'cf-palpite'; document.body.appendChild(p);
    p.addEventListener('click', e => { const b = e.target.closest('[data-pp]'); if (!b) return; if (b.dataset.pp === 'apagar') salvarPalpite(+p.dataset.g, ''); if (b.dataset.pp === 'ok') salvarPalpite(+p.dataset.g, $('input', p).value); fecharPalpite(); });
    p.addEventListener('keydown', e => { if (e.key === 'Enter') { salvarPalpite(+p.dataset.g, $('input', p).value); fecharPalpite(); } if (e.key === 'Escape') { e.stopPropagation(); fecharPalpite(); } });
  }
  const pl = palpites['g' + g];
  p.dataset.g = g;
  p.innerHTML = `<div class="cf-pp-gl">${glifoSVG(g)}</div><label>Que letra é esta?<input maxlength="1" autocomplete="off" value="${esc(pl ? pl.l : '')}"></label>
    <div class="cf-pp-btns"><button data-pp="ok" class="pri">Marcar</button><button data-pp="apagar">Apagar</button></div><p class="mini">Todos veem o palpite em todas as cifras com este símbolo.</p>`;
  const rc = botao.getBoundingClientRect();
  p.hidden = false;
  const w = p.offsetWidth, h = p.offsetHeight;
  p.style.left = Math.max(8, Math.min(innerWidth - w - 8, rc.left + rc.width / 2 - w / 2)) + 'px';
  p.style.top = (rc.bottom + h + 12 > innerHeight ? Math.max(8, rc.top - h - 8) : rc.bottom + 8) + 'px';
  setTimeout(() => { const i = $('input', p); i.focus(); i.select(); }, 20);
}
function fecharPalpite() { const p = $('#cfPalpite'); if (p) p.hidden = true; }
function salvarPalpite(g, l) {
  l = normal(l).replace(/[^A-Z0-9]/g, '').slice(0, 1);
  A.Rede.set('cifraPalpite/g' + g, l ? { l, por: A.meu || A.aux || '', ts: Date.now() } : null).catch(() => A.aviso('Não consegui gravar o palpite.'));
}
document.addEventListener('click', e => {
  const b = e.target.closest('.cf-cel'); if (!b) { if (!e.target.closest('#cfPalpite')) fecharPalpite(); return; }
  e.preventDefault(); e.stopPropagation();
  const g = +b.dataset.g;
  if (A.mestre) { A.definir(['cifraRev', 'g' + g], revDe(g) ? null : letraDoGlifo(g)); return; }
  if (revDe(g)) return;
  abrirPalpite(g, b);
}, true);

// chat: ⟦cifra:ID⟧ vira a cifra desenhada
A.ganchoChat(h => h.replace(/⟦cifra:([\w-]{4,40})⟧/g, (m, id) => htmlCifra(id, cifrasPub()[id], 'mini')));

/* =========================================================
   2. DOCUMENTOS TARJADOS
   ========================================================= */
// "texto [[segredo]] texto" → partes; a tarja i guarda o tamanho para o jogador não ver o conteúdo
function partesDoc(txt, rev) {
  const out = [];
  let i = 0;
  String(txt || '').split(/\[\[([\s\S]*?)\]\]/).forEach((t, k) => {
    if (k % 2 === 0) { if (t) out.push({ t }); return; }
    out.push(rev && rev[i] ? { x: i, t } : { x: i, n: Math.max(2, t.length) });
    i++;
  });
  return out;
}
const preenche = n => Array.from({ length: Math.ceil(n / 7) }, (_, k) => 'x'.repeat(Math.min(7, n - k * 7))).join(' ');
const docVistos = {};
function htmlDoc(id, d, mestreVe) {
  const partes = mestreVe ? null : (Array.isArray(d.partes) ? d.partes : Object.values(d.partes || {}));
  const vistos = docVistos[id] || (docVistos[id] = new Map());
  let corpo;
  if (mestreVe) {
    let i = 0;
    corpo = String(d.txt || '').split(/\[\[([\s\S]*?)\]\]/).map((t, k) => {
      if (k % 2 === 0) return esc(t);
      const x = i++;
      return `<button class="tj-m${(d.rev || {})[x] ? ' aberta' : ''}" data-tj="${x}" title="${(d.rev || {})[x] ? 'Revelada. Toque para tarjar de novo' : 'Tarjada. Toque para revelar aos jogadores'}">${esc(t)}</button>`;
    }).join('');
  } else {
    corpo = partes.map(p => {
      if (p.x === undefined) return esc(p.t);
      if (p.t !== undefined) { if (!vistos.has(p.x)) vistos.set(p.x, docVistos[id].pronto ? Date.now() : 0); return `<span class="tj-rev${Date.now() - vistos.get(p.x) < 2500 ? ' anima' : ''}">${esc(p.t)}</span>`; }
      vistos.delete(p.x);
      return `<span class="tj" aria-label="trecho tarjado">${preenche(int(p.n))}</span>`;
    }).join('');
    docVistos[id].pronto = true;
  }
  return `<article class="doc-folha"><header><span class="doc-cab">${esc(d.cab || 'O.R.F.E.U. · DOCUMENTO INTERNO')}</span><h3>${esc(d.tit || 'Documento')}</h3></header><div class="doc-corpo">${corpo}</div>
    <footer><span>${esc(d.data !== undefined && d.data !== null ? d.data : new Date(num(d.ts) || Date.now()).toLocaleDateString('pt-BR'))}</span><i class="doc-carimbo">CONFIDENCIAL</i></footer></article>`;
}
function publicarDoc(id) {
  const d = (sg()._docs || {})[id]; if (!d) return;
  if (!d.pub) { A.definir(['docs', id], null); return; }
  A.definir(['docs', id], { tit: d.tit || '', cab: d.cab || '', data: d.data === undefined ? null : String(d.data), onde: d.onde || '', partes: partesDoc(d.txt, d.rev), ts: num(d.ts) || Date.now() });
}
function publicarCifra(id) {
  const c = (sg()._cifras || {})[id]; if (!c) return;
  if (!c.pub) { A.definir(['cifras', id], null); return; }
  A.definir(['cifras', id], { tit: c.tit || '', onde: c.onde || '', s: cifrar(c.txt), ts: num(c.ts) || Date.now() });
}

/* =========================================================
   3. VISÕES
   ========================================================= */
const EF_VISAO = [['clarao', 'Clarão'], ['estatica', 'Estática'], ['sangue', 'Sangue'], ['sussurro', 'Sussurro (só texto)']];
let visaoOff = null, visaoDe = null;
const chaveVisoes = () => 'acf-visoes-' + (A.meu || '');
function ligarVisoes() {
  if (A.mestre || !A.meu || !A.pronto) { if (visaoOff && visaoDe !== A.meu) { visaoOff(); visaoOff = null; } return; }
  if (visaoOff && visaoDe === A.meu) return;
  if (visaoOff) visaoOff();
  visaoDe = A.meu; visaoOff = () => {};
  const meu = A.meu;
  A.garantirLogin().then(() => { if (visaoDe !== meu) return; visaoOff = A.Rede.on('visoes/' + meu, v => receberVisao(v), () => {}); });
}
function receberVisao(v) {
  if (!v || !v.id) return;
  if (v.del) {   // o Mestre apagou uma visão: some do Arquivo do jogador
    const h0 = ls.get(chaveVisoes(), []);
    if (h0.some(h => h.id === v.del)) { ls.set(chaveVisoes(), h0.filter(h => h.id !== v.del)); const o = $('#visaoTela'); if (o && !o.hidden && o.dataset.id === v.del) o.hidden = true; atualizarBadge(); desenharLista(); }
    return;
  }
  const hist = ls.get(chaveVisoes(), []);
  if (hist.some(h => h.id === v.id)) return;
  hist.unshift({ id: v.id, txt: v.txt || '', img: v.img || '', ts: num(v.ts) });
  // imagens só nas 6 mais recentes (o navegador tem pouco espaço)
  ls.set(chaveVisoes(), hist.slice(0, 20).map((h, i) => (i < 6 ? h : { ...h, img: '' })));
  if (Date.now() - num(v.ts) < 30 * 60e3) mostrarVisao(v);
  atualizarBadge();
}
function mostrarVisao(v) {
  let o = $('#visaoTela');
  if (!o) { o = document.createElement('div'); o.id = 'visaoTela'; o.className = 'visao-tela'; document.body.appendChild(o); o.addEventListener('click', () => { if (o.classList.contains('fim')) { o.hidden = true; o.className = 'visao-tela'; } }); }
  const dur = Math.max(2, Math.min(15, int(v.dur) || 5));
  o.className = 'visao-tela ef-' + (v.ef || 'clarao');
  o.dataset.id = v.id || '';
  o.style.setProperty('--dur', dur + 's');
  o.innerHTML = `${v.img ? `<div class="vs-img" style="background-image:url('${v.img}')"></div>` : ''}<p class="vs-txt">${esc(v.txt || '')}</p><span class="vs-fechar">toque para fechar · a visão fica no seu Arquivo</span>`;
  o.hidden = false;
  void o.offsetWidth; o.classList.add('ativa');
  clearTimeout(mostrarVisao.t); mostrarVisao.t = setTimeout(() => o.classList.add('fim'), dur * 1000);
  if (somOk()) {
    const S = A.Som;
    if (v.ef === 'sangue') { S.tom(62, 0, 0.25, 'sine', 0.2); S.tom(54, 0.3, 0.3, 'sine', 0.16); S.tom(62, 1.1, 0.25, 'sine', 0.2); S.tom(54, 1.4, 0.3, 'sine', 0.16); }
    else if (v.ef === 'estatica') { for (let i = 0; i < 10; i++) S.tom(200 + Math.random() * 3000, i * 0.07, 0.06, 'square', 0.03); }
    else if (v.ef === 'sussurro') { S.tom(330, 0, 2.5, 'sine', 0.025, 311); S.tom(415, 0.2, 2.2, 'sine', 0.02, 392); }
    else { S.tom(1200, 0, 0.5, 'sine', 0.06, 300); S.tom(48, 0, 2.5, 'sine', 0.18, 30); }
  }
}
async function enviarVisao() {
  const alvo = $('#vsAlvo').value, txt = ($('#vsTxt').value || '').trim().slice(0, 300), arq = $('#vsImg').files[0];
  if (!alvo) { A.aviso('Escolha a cobaia.'); return; }
  if (!txt && !arq) { A.aviso('Escreva algo ou escolha uma imagem.'); return; }
  let img = '';
  if (arq) { try { img = await A.imagemReduzida(arq, 900); } catch (e) { A.aviso('Não consegui ler a imagem.'); return; } }
  const v = { id: A.Rede.chave(), txt, ef: $('#vsEf').value, dur: int($('#vsDur').value) || 5, ts: Date.now() };
  if (img) v.img = img;
  await A.Rede.set('visoes/' + alvo, v).catch(() => { A.aviso('O servidor recusou a visão.'); throw 0; });
  const nome = (A.SER[alvo] || {}).nome || alvo;
  if ($('#vsChat').checked) A.enviarChat(`👁 ${nome} teve uma visão.`, 'geral');
  const log = ls.get('acf-visoes-enviadas', []);
  log.unshift({ id: v.id, alvo, txt, img: !!img, ts: v.ts });
  ls.set('acf-visoes-enviadas', log.slice(0, 15));
  $('#vsTxt').value = ''; $('#vsImg').value = '';
  A.aviso(`Visão enviada para ${nome}.`);
  desenharLista();
}

/* =========================================================
   4. JANELA DO ARQUIVO (jogadores e Mestre)
   ========================================================= */
const Arq = { aba: 'cifras', aberto: false, edit: null };
function abrir(aba) {
  let o = $('#arquivoTela');
  if (!o) {
    o = document.createElement('div'); o.id = 'arquivoTela'; o.className = 'arquivo-tela';
    o.innerHTML = `<div class="arq-caixa"><header class="arq-cab"><div><span>O.R.F.E.U. · ACERVO INTERNO</span><h2>Arquivo da O.R.F.E.U.</h2></div><button data-arq="fechar" aria-label="Fechar">×</button></header>
      <nav class="arq-abas"></nav><div class="arq-corpo"><div id="arqForm"></div><div id="arqLista"></div></div></div>`;
    document.body.appendChild(o);
    o.addEventListener('click', aoClicar);
    o.addEventListener('change', e => { if (e.target.id === 'cfOnde' || e.target.id === 'dcOnde') { const n = $('#' + e.target.id + 'Cn'); if (n) n.hidden = e.target.value !== 'sala'; } });
  }
  if (aba) Arq.aba = aba;
  if (!A.mestre && Arq.aba === 'visoes-m') Arq.aba = 'cifras';
  Arq.aberto = true; Arq.edit = null;
  o.hidden = false;
  document.body.classList.add('arq-aberto');
  if (!A.mestre) { ls.set('acf-arq-visto-' + (A.meu || A.aux || ''), Date.now()); atualizarBadge(); }
  desenharTudo();
}
function fechar() { const o = $('#arquivoTela'); if (o) o.hidden = true; Arq.aberto = false; document.body.classList.remove('arq-aberto'); fecharPalpite(); }
function desenharTudo() {
  const abas = A.mestre ? [['cifras', 'Cifras'], ['docs', 'Documentos'], ['chave', 'Chave'], ['visoes-m', 'Visões']] : [['cifras', 'Cifras'], ['docs', 'Documentos'], ['chave', 'Decifrar'], ['visoes', 'Visões']];
  if (!abas.some(a => a[0] === Arq.aba)) Arq.aba = 'cifras';
  $('#arquivoTela .arq-abas').innerHTML = abas.map(([k, n]) => `<button data-arq="aba" data-v="${k}" class="${Arq.aba === k ? 'on' : ''}">${n}</button>`).join('');
  desenharForm(); desenharLista();
}
const opcoesOnde = (id, onde) => { const m = /^sala:(\d+)$/.exec(onde || ''); return `<label class="arq-campo">Onde aparece <select id="${id}"><option value="">Só no Arquivo</option><option value="sala" ${m ? 'selected' : ''}>Na parede de uma sala</option></select></label><label class="arq-campo" id="${id}Cn" ${m ? '' : 'hidden'}>CN da sala <input type="number" id="${id}N" min="1" max="125" value="${m ? m[1] : ''}"></label>`; };
const lerOnde = id => { if ($('#' + id).value !== 'sala') return ''; const n = int($('#' + id + 'N').value); return n >= 1 && n <= 125 ? 'sala:' + n : ''; };
function desenharForm() {
  const f = $('#arqForm'); if (!f) return;
  if (!A.mestre) {
    f.innerHTML = Arq.aba === 'chave' ? '<p class="arq-dica">Cada símbolo é sempre a mesma letra em todas as cifras. Toque num símbolo para marcar seu palpite; todos da mesa veem. As letras carimbadas foram confirmadas pelo Mestre.</p>'
      : Arq.aba === 'cifras' ? '<p class="arq-dica">Mensagens em sigilos encontradas pela equipe. Toque num símbolo para dar um palpite.</p>'
      : Arq.aba === 'docs' ? '<p class="arq-dica">Documentos recuperados. Os trechos tarjados podem ser liberados pelo Mestre durante a investigação.</p>'
      : '<p class="arq-dica">Só você vê as suas visões. Elas ficam guardadas neste aparelho.</p>';
    return;
  }
  if (Arq.aba === 'cifras') {
    const c = Arq.edit ? (sg()._cifras || {})[Arq.edit] || {} : {};
    f.innerHTML = `<div class="arq-form"><h3>${Arq.edit ? 'Editar cifra' : 'Nova cifra'}</h3>
      <label class="arq-campo">Título (os jogadores veem) <input id="cfTit" maxlength="80" value="${esc(c.tit || '')}" placeholder="Ex.: Inscrição na porta da CN 14"></label>
      <label class="arq-campo">Mensagem (letras e números viram símbolos; acentos somem) <textarea id="cfTxt" rows="3" maxlength="400" placeholder="O QUE ESTÁ ESCRITO">${esc(c.txt || '')}</textarea></label>
      ${opcoesOnde('cfOnde', c.onde)}
      <div class="arq-linha"><button data-arq="cf-salvar" class="pri">${Arq.edit ? 'Salvar' : 'Criar (oculta)'}</button>${Arq.edit ? '<button data-arq="cancelar">Cancelar</button>' : ''}<span class="arq-prev" id="cfPrev"></span></div></div>`;
    const prev = () => { const t = $('#cfTxt').value; $('#cfPrev').innerHTML = t ? htmlCifra('prev', { s: cifrar(t.slice(0, 40)) }, 'mini') : ''; };
    $('#cfTxt').oninput = prev; prev();
  } else if (Arq.aba === 'docs') {
    const d = Arq.edit ? (sg()._docs || {})[Arq.edit] || {} : {};
    f.innerHTML = `<div class="arq-form"><h3>${Arq.edit ? 'Editar documento' : 'Novo documento'}</h3>
      <label class="arq-campo">Título <input id="dcTit" maxlength="100" value="${esc(d.tit || '')}" placeholder="Ex.: Relatório do Experimento 7"></label>
      <div class="arq-linha"><label class="arq-campo">Cabeçalho <input id="dcCab" maxlength="100" value="${esc(d.cab || '')}" placeholder="O.R.F.E.U. · DOCUMENTO INTERNO"></label>
        <label class="arq-campo">Data no documento <input id="dcData" maxlength="40" value="${esc(d.data !== undefined ? d.data : new Date().toLocaleDateString('pt-BR'))}" placeholder="vazio: sem data"></label></div>
      <p class="mini">A data aparece no pé do documento como você escrever: 21/12/2012, "março de 1998", "??/??/19??"... Deixe vazio para não mostrar data.</p>
      <label class="arq-campo">Texto. Coloque entre [[colchetes duplos]] o que fica tarjado. <textarea id="dcTxt" rows="7" maxlength="6000" placeholder="O paciente [[nome]] foi transferido para a ala [[C-12]] em...">${esc(d.txt || '')}</textarea></label>
      ${opcoesOnde('dcOnde', d.onde)}
      <div class="arq-linha"><button data-arq="dc-salvar" class="pri">${Arq.edit ? 'Salvar' : 'Criar (oculto)'}</button>${Arq.edit ? '<button data-arq="cancelar">Cancelar</button>' : ''}</div></div>`;
  } else if (Arq.aba === 'visoes-m') {
    f.innerHTML = `<div class="arq-form"><h3>Mandar uma visão</h3><p class="mini">Aparece só na tela da cobaia escolhida, com som. Os outros veem apenas "Fulano teve uma visão" no chat, se você deixar marcado.</p>
      <label class="arq-campo">Para <select id="vsAlvo"><option value="">Escolha…</option>${cobaias().map(x => `<option value="${x.id}">${esc(x.nome)}${x.jogador ? ' · ' + esc(x.jogador) : ''}</option>`).join('')}</select></label>
      <label class="arq-campo">Frase <textarea id="vsTxt" rows="2" maxlength="300" placeholder="Ela ainda está na sala de baixo."></textarea></label>
      <label class="arq-campo">Imagem (opcional) <input type="file" id="vsImg" accept="image/*"></label>
      <div class="arq-linha"><label class="arq-campo">Efeito <select id="vsEf">${EF_VISAO.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <label class="arq-campo">Duração <select id="vsDur">${[3, 5, 8, 12].map(s => `<option value="${s}" ${s === 5 ? 'selected' : ''}>${s} s</option>`).join('')}</select></label></div>
      <label class="chave"><input type="checkbox" id="vsChat" checked><span>Avisar no chat geral</span></label>
      <div class="arq-linha"><button data-arq="vs-enviar" class="pri">👁 Enviar visão</button></div></div>`;
  } else f.innerHTML = '<p class="arq-dica">Todos os símbolos já usados nas cifras publicadas. Toque para revelar ou esconder a letra em todas as cifras de uma vez. Palpites dos jogadores: verde certo, vermelho errado.</p>';
}
// só a lista é redesenhada quando algo muda (o formulário fica intacto enquanto o Mestre digita)
function desenharLista() {
  const l = $('#arqLista'); if (!l || !Arq.aberto) return;
  let html = '';
  if (Arq.aba === 'cifras') {
    if (A.mestre) {
      const lst = Object.entries(sg()._cifras || {}).sort((a, b) => num(b[1].ts) - num(a[1].ts));
      html = lst.map(([id, c]) => `<div class="arq-item${c.pub ? ' pub' : ''}"><div class="arq-item-cab"><b>${esc(c.tit || 'Sem título')}</b><small>${c.pub ? 'publicada' : 'oculta'}${c.onde ? ' · ' + esc(A.nomeSala(+c.onde.slice(5))) : ''}</small></div>
        <p class="arq-plano">${esc(c.txt || '')}</p>${c.pub ? htmlCifra(id, cifrasPub()[id], 'cheia') : ''}
        <div class="arq-linha"><button data-arq="cf-pub" data-id="${id}">${c.pub ? 'Esconder' : 'Publicar'}</button>${c.pub ? `<button data-arq="cf-chat" data-id="${id}">Mandar no chat</button><button data-arq="cf-revtudo" data-id="${id}">Revelar todas as letras</button><button data-arq="cf-esctudo" data-id="${id}">Esconder letras</button>` : ''}<button data-arq="cf-editar" data-id="${id}">Editar</button><button data-arq="cf-apagar" data-id="${id}" class="perigo">Apagar</button></div></div>`).join('') || '<p class="arq-vazio">Nenhuma cifra criada.</p>';
    } else {
      const lst = Object.entries(cifrasPub()).filter(([, c]) => ondeVisivel(c.onde)).sort((a, b) => num(b[1].ts) - num(a[1].ts));
      html = lst.map(([id, c]) => `<div class="arq-item pub"><div class="arq-item-cab"><b>${esc(c.tit || 'Inscrição')}</b><small>${c.onde ? esc(A.nomeSala(+c.onde.slice(5))) : ''}</small></div>${htmlCifra(id, c, 'cheia')}</div>`).join('') || '<p class="arq-vazio">Nenhuma cifra encontrada ainda.</p>';
    }
  } else if (Arq.aba === 'docs') {
    if (A.mestre) {
      const lst = Object.entries(sg()._docs || {}).sort((a, b) => num(b[1].ts) - num(a[1].ts));
      html = lst.map(([id, d]) => { const n = (String(d.txt || '').match(/\[\[[\s\S]*?\]\]/g) || []).length, r = Object.keys(d.rev || {}).length;
        return `<div class="arq-item${d.pub ? ' pub' : ''}"><div class="arq-item-cab"><b>${esc(d.tit || 'Sem título')}</b><small>${d.pub ? 'publicado' : 'oculto'} · ${r}/${n} tarjas abertas${d.onde ? ' · ' + esc(A.nomeSala(+d.onde.slice(5))) : ''}</small></div>
        <div class="doc-mestre" data-doc="${id}">${htmlDoc(id, d, true)}</div><p class="mini">Toque num trecho tarjado para revelar aos jogadores.</p>
        <div class="arq-linha"><button data-arq="dc-pub" data-id="${id}">${d.pub ? 'Esconder' : 'Publicar'}</button><button data-arq="dc-abrir" data-id="${id}">Revelar todas</button><button data-arq="dc-fechar" data-id="${id}">Tarjar todas</button><button data-arq="dc-editar" data-id="${id}">Editar</button><button data-arq="dc-apagar" data-id="${id}" class="perigo">Apagar</button></div></div>`; }).join('') || '<p class="arq-vazio">Nenhum documento criado.</p>';
    } else {
      const lst = Object.entries(docsPub()).filter(([, d]) => ondeVisivel(d.onde)).sort((a, b) => num(b[1].ts) - num(a[1].ts));
      html = lst.map(([id, d]) => `<div class="arq-item pub">${htmlDoc(id, d, false)}</div>`).join('') || '<p class="arq-vazio">Nenhum documento encontrado ainda.</p>';
    }
  } else if (Arq.aba === 'chave') {
    const usados = new Set();
    Object.values(cifrasPub()).filter(c => ondeVisivel(c.onde)).forEach(c => (Array.isArray(c.s) ? c.s : Object.values(c.s || {})).forEach(t => { if (typeof t === 'number') usados.add(t); }));
    const lst = [...usados].sort((a, b) => a - b);
    html = lst.length ? `<div class="cifra cf-chave"><div class="cf-texto">${lst.map(g => `<span class="cf-palavra">${htmlCel(g)}</span>`).join('')}</div></div>
      <p class="mini">${lst.filter(g => revDe(g)).length} de ${lst.length} símbolos confirmados · ${lst.filter(g => !revDe(g) && palpites['g' + g]).length} com palpite.</p>${A.mestre ? '<div class="arq-linha"><button data-arq="pal-limpar" class="perigo">Apagar todos os palpites</button></div>' : ''}`
      : '<p class="arq-vazio">Nenhum símbolo encontrado ainda.</p>';
  } else if (Arq.aba === 'visoes') {
    const hist = ls.get(chaveVisoes(), []);
    html = hist.length ? hist.map(h => `<div class="arq-item vs-item">${h.img ? `<img src="${h.img}" alt="">` : ''}<p>${esc(h.txt || '(só imagem)')}</p><div class="arq-linha"><small>${new Date(num(h.ts)).toLocaleString('pt-BR')}</small><button data-arq="vs-apagar" data-id="${esc(h.id)}" class="perigo">Apagar</button></div></div>`).join('')
      + '<div class="arq-linha"><button data-arq="vs-apagar-tudo" class="perigo">Apagar todas as visões</button></div>' : '<p class="arq-vazio">Nenhuma visão… ainda.</p>';
  } else if (Arq.aba === 'visoes-m') {
    const log = ls.get('acf-visoes-enviadas', []);
    html = log.length ? `<h3 class="arq-sub">Enviadas deste aparelho</h3>${log.map((h, i) => `<div class="arq-item"><div class="arq-linha"><b>${esc((A.SER[h.alvo] || {}).nome || h.alvo)}</b><small>${new Date(num(h.ts)).toLocaleString('pt-BR')}${h.img ? ' · com imagem' : ''}</small><button data-arq="vsm-apagar" data-i="${i}" class="perigo" title="${h.id ? 'Apaga também do Arquivo do jogador' : 'Apaga só desta lista'}">Apagar</button></div><p>${esc(h.txt || '')}</p></div>`).join('')}
      <p class="mini">Apagar tira a visão daqui e também do Arquivo do jogador (na próxima vez que ele estiver com o site aberto).</p>` : '';
  }
  if (l.dataset.html !== html) { l.innerHTML = html; l.dataset.html = html; }
}
function aoClicar(e) {
  const t = e.target;
  if (t === $('#arquivoTela')) { fechar(); return; }
  const tj = t.closest('[data-tj]');
  if (tj && A.mestre) {
    const id = tj.closest('[data-doc]').dataset.doc, x = +tj.dataset.tj;
    const d = (sg()._docs || {})[id]; if (!d) return;
    A.gravarSegredo(['_docs', id, 'rev', String(x)], (d.rev || {})[x] ? null : true);
    publicarDoc(id); desenharLista();
    return;
  }
  const b = t.closest('[data-arq]'); if (!b) return;
  const a = b.dataset.arq, id = b.dataset.id;
  if (a === 'fechar') { fechar(); return; }
  if (a === 'aba') { Arq.aba = b.dataset.v; Arq.edit = null; desenharTudo(); return; }
  if (a === 'cancelar') { Arq.edit = null; desenharForm(); return; }
  if (a === 'vs-apagar' || a === 'vs-apagar-tudo') {
    if (a === 'vs-apagar-tudo' && !confirm('Apagar todas as suas visões deste aparelho?')) return;
    ls.set(chaveVisoes(), a === 'vs-apagar-tudo' ? [] : ls.get(chaveVisoes(), []).filter(h => h.id !== id));
    atualizarBadge(); desenharLista(); return;
  }
  if (!A.mestre) return;
  if (a === 'vsm-apagar') {
    const log = ls.get('acf-visoes-enviadas', []), h = log[+b.dataset.i]; if (!h) return;
    if (!confirm(`Apagar esta visão${h.id ? ` também do Arquivo de ${(A.SER[h.alvo] || {}).nome || h.alvo}` : ''}?`)) return;
    log.splice(+b.dataset.i, 1); ls.set('acf-visoes-enviadas', log);
    if (h.id) A.Rede.set('visoes/' + h.alvo, { id: 'del-' + A.Rede.chave(), del: h.id, ts: Date.now() }).catch(() => A.aviso('O servidor recusou.'));
    desenharLista(); return;
  }
  if (a === 'cf-salvar') {
    const txt = ($('#cfTxt').value || '').trim();
    if (!normal(txt).replace(/[^A-Z0-9]/g, '')) { A.aviso('Escreva a mensagem com letras ou números.'); return; }
    const k = Arq.edit || A.Rede.chave(), velho = (sg()._cifras || {})[k] || {};
    A.gravarSegredo(['_cifras', k], { tit: ($('#cfTit').value || '').trim().slice(0, 80), txt: txt.slice(0, 400), onde: lerOnde('cfOnde'), pub: !!velho.pub, ts: velho.ts || Date.now() });
    if (velho.pub) publicarCifra(k);
    Arq.edit = null; desenharForm(); desenharLista(); A.redesenharCartao();
  } else if (a === 'cf-pub') { const c = sg()._cifras[id]; A.gravarSegredo(['_cifras', id, 'pub'], !c.pub); publicarCifra(id); desenharLista(); A.redesenharCartao(); }
  else if (a === 'cf-chat') { A.enviarChat(`⟦cifra:${id}⟧`, 'geral'); A.aviso('Cifra mandada no chat geral.'); }
  else if (a === 'cf-revtudo' || a === 'cf-esctudo') { const c = cifrasPub()[id]; if (!c) return; new Set((Array.isArray(c.s) ? c.s : Object.values(c.s || {})).filter(x => typeof x === 'number')).forEach(g => A.definir(['cifraRev', 'g' + g], a === 'cf-revtudo' ? letraDoGlifo(g) : null)); }
  else if (a === 'cf-editar') { Arq.edit = id; desenharForm(); $('#arqForm').scrollIntoView({ block: 'start' }); }
  else if (a === 'cf-apagar') { if (!confirm('Apagar esta cifra?')) return; A.gravarSegredo(['_cifras', id], null); A.definir(['cifras', id], null); desenharLista(); A.redesenharCartao(); }
  else if (a === 'dc-salvar') {
    const txt = ($('#dcTxt').value || '').trim();
    if (!txt) { A.aviso('Escreva o texto do documento.'); return; }
    const k = Arq.edit || A.Rede.chave(), velho = (sg()._docs || {})[k] || {};
    A.gravarSegredo(['_docs', k], { tit: ($('#dcTit').value || '').trim().slice(0, 100), cab: ($('#dcCab').value || '').trim().slice(0, 100), data: ($('#dcData').value || '').trim().slice(0, 40), txt: txt.slice(0, 6000), onde: lerOnde('dcOnde'), pub: !!velho.pub, rev: txt === velho.txt ? velho.rev || null : null, ts: velho.ts || Date.now() });
    if (velho.pub) publicarDoc(k);
    Arq.edit = null; desenharForm(); desenharLista(); A.redesenharCartao();
  } else if (a === 'dc-pub') { const d = sg()._docs[id]; A.gravarSegredo(['_docs', id, 'pub'], !d.pub); publicarDoc(id); desenharLista(); A.redesenharCartao(); }
  else if (a === 'dc-abrir' || a === 'dc-fechar') {
    const d = sg()._docs[id]; if (!d) return;
    const n = (String(d.txt || '').match(/\[\[[\s\S]*?\]\]/g) || []).length, rev = {};
    if (a === 'dc-abrir') for (let i = 0; i < n; i++) rev[i] = true;
    A.gravarSegredo(['_docs', id, 'rev'], a === 'dc-abrir' && n ? rev : null); publicarDoc(id); desenharLista();
  }
  else if (a === 'dc-editar') { Arq.edit = id; desenharForm(); $('#arqForm').scrollIntoView({ block: 'start' }); }
  else if (a === 'dc-apagar') { if (!confirm('Apagar este documento?')) return; A.gravarSegredo(['_docs', id], null); A.definir(['docs', id], null); desenharLista(); A.redesenharCartao(); }
  else if (a === 'vs-enviar') { b.disabled = true; enviarVisao().catch(() => {}).finally(() => { b.disabled = false; }); }
  else if (a === 'pal-limpar') { if (confirm('Apagar todos os palpites dos jogadores?')) A.Rede.set('cifraPalpite', null).catch(() => {}); }
}

/* =========================================================
   5. NA SALA: cifras na parede e documentos encontrados ali
   ========================================================= */
const daSala = (obj, cn) => Object.entries(obj).filter(([, x]) => x && x.onde === 'sala:' + cn);
A.ganchoSala({
  mestre(cn) {
    const cs = daSala(sg()._cifras || {}, cn), ds = daSala(sg()._docs || {}, cn);
    if (!cs.length && !ds.length) return '';
    return `<div class="arq-sala"><p class="mesa-k">ARQUIVO NESTA SALA</p>${cs.map(([id, c]) => `<p>◈ ${esc(c.tit || 'Cifra')} <small>${c.pub ? 'publicada' : 'oculta'}</small></p>`).join('')}${ds.map(([id, d]) => `<p>▤ ${esc(d.tit || 'Documento')} <small>${d.pub ? 'publicado' : 'oculto'}</small></p>`).join('')}<button data-arq-sala="abrir">Abrir no Arquivo</button></div>`;
  },
  publico(cn) {
    const cs = daSala(cifrasPub(), cn), ds = daSala(docsPub(), cn);
    if (!cs.length && !ds.length) return '';
    return `<div class="arq-sala"><p class="mesa-k">NA PAREDE</p>${cs.map(([id, c]) => htmlCifra(id, c, 'mini')).join('')}${ds.length ? `<div class="acoes">${ds.map(([id, d]) => `<button data-arq-sala="doc" data-id="${id}">▤ ${esc(d.tit || 'Documento')}</button>`).join('')}</div>` : ''}</div>`;
  },
  ligar(c) { $$('[data-arq-sala]', c).forEach(b => b.onclick = () => abrir(b.dataset.arqSala === 'doc' ? 'docs' : 'cifras')); },
});
// marca no mapa as salas com cifra ou documento
function marcarSalas() {
  const com = new Set();
  const marca = o => Object.values(o).forEach(x => { const m = /^sala:(\d+)$/.exec((x && x.onde) || ''); if (m) com.add(+m[1]); });
  if (A.mestre) { marca(sg()._cifras || {}); marca(sg()._docs || {}); } else { marca(cifrasPub()); marca(docsPub()); }
  $$('.sala[data-cn]').forEach(s => { const sim = com.has(+s.dataset.cn) && !s.classList.contains('desconhecida'); if (s.classList.contains('tem-arq') !== sim) s.classList.toggle('tem-arq', sim); });
}

/* =========================================================
   6. BOTÕES, AVISOS E LIGAÇÕES
   ========================================================= */
function atualizarBadge() {
  const b = $('#btnArquivo'); if (!b) return;
  b.hidden = A.mestre || !(A.meu || A.aux);
  if (A.mestre) return;
  const visto = num(ls.get('acf-arq-visto-' + (A.meu || A.aux || ''), 0));
  const novos = [...Object.values(cifrasPub()), ...Object.values(docsPub())].filter(x => x && ondeVisivel(x.onde) && num(x.ts) > visto).length
    + ls.get(chaveVisoes(), []).filter(h => num(h.ts) > visto).length;
  const n = $('.n', b); n.hidden = !novos; n.textContent = novos;
}
function desenharMesaArq() {
  const c = $('#mesaArq'); if (!c || !A.mestre) return;
  const nc = Object.keys(sg()._cifras || {}).length, nd = Object.keys(sg()._docs || {}).length;
  const html = `<p class="mini">Cifras em sigilos, documentos tarjados e visões para um jogador só. ${nc} cifra${nc === 1 ? '' : 's'} e ${nd} documento${nd === 1 ? '' : 's'} criados.</p>
    <div class="mesa-linha"><button data-arqm="cifras" class="btn-protocolo">📜 Abrir o Arquivo</button><button data-arqm="visoes-m">👁 Mandar visão</button></div>`;
  if (c.dataset.html !== html) { c.innerHTML = html; c.dataset.html = html; $$('[data-arqm]', c).forEach(b => b.onclick = () => abrir(b.dataset.arqm)); }
}
let agendado = false, ultimoRev = '', ultimoPal = '';
function redesenhar() {
  if (agendado) return; agendado = true;
  requestAnimationFrame(() => {
    agendado = false;
    try {
      ligarPalpites(); ligarVisoes();
      atualizarBadge(); desenharMesaArq(); marcarSalas();
      if (Arq.aberto) { if (!A.mestre && Arq.aba.startsWith('visoes-')) Arq.aba = 'cifras'; desenharLista(); }
      // cifras no chat e no cartão da sala acompanham revelações e palpites
      const r = JSON.stringify(est().cifraRev || {}) + JSON.stringify(est().cifras || {}) + JSON.stringify(est().docs || {}), p = JSON.stringify(palpites);
      if (r !== ultimoRev || p !== ultimoPal) { ultimoRev = r; ultimoPal = p; A.redesenharChat(); if (!A.mestre) A.redesenharCartao(); }
    } catch (e) { console.warn('arquivo:', e); }
  });
}
A.aoMudar(redesenhar);
document.addEventListener('acf-perfil', () => { setTimeout(redesenhar, 60); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && Arq.aberto && !($('#cfPalpite') && !$('#cfPalpite').hidden)) fechar(); });
const btn = $('#btnArquivo'); if (btn) btn.addEventListener('click', () => abrir());
setInterval(marcarSalas, 1500);
setTimeout(redesenhar, 800);
window.ACF_ARQUIVO = { abrir, fechar, glifoSVG, GLIFOS, mostrarVisao };
})();
