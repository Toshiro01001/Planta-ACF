/* =========================================================
   arquivo.js · Arquivo da O.R.F.E.U.
   - Cifras de sigilos: alfabeto de 36 símbolos próprios (gerados aqui, sem copiar os oficiais).
     A chave (qual letra vira qual símbolo) fica só nos segredos do Mestre.
     Os jogadores tentam decifrar juntos: cada palpite aparece para todos; o Mestre revela letras.
   - Documentos tarjados: o Mestre marca trechos com [[assim]] e vai destarjando durante a sessão.
   - Visões: imagem ou frase que pisca na tela de um jogador só.
   - Terminal O.R.F.E.U.: aba com cara de terminal antigo (ls, open, acesso). Mostra os documentos
     publicados que o Mestre colocou num "diretório do terminal".
   - Cofre: documento com código de acesso. O conteúdo vai para cofre/<hash do código>, um endereço
     que só existe para quem sabe o código. Em mapa/docs fica só uma marca "▓▓▓" sem título nem texto.
   Caminhos: mapa/cifras, mapa/cifraRev, mapa/docs (públicos, só o Mestre grava),
   cifraPalpite (qualquer jogador), visoes/<cobaia> (só o Mestre grava), cofre/<hash> (só o Mestre grava;
   lê quem sabe o hash), senhas/cofres (Mestre e auxiliares), segredos/_sigilos, _cifras e _docs (só o Mestre).
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
// documentos públicos + os que este aparelho destrancou no cofre (as marcas ▓▓▓ somem quando abertas)
const KEY_COFRES = 'acf-cofres';
const cofreDocs = {}, cofreOff = {};
const cofresAbertos = () => ls.get(KEY_COFRES, {});
function docsPub() {
  const base = est().docs || {}, ab = cofresAbertos(), out = {};
  const hs = new Set(Object.values(ab));
  Object.entries(base).forEach(([id, d]) => { if (d && d.tranca && ab[d.tranca]) return; out[id] = d; });
  Object.entries(cofreDocs).forEach(([h, docs]) => { if (hs.has(h)) Object.entries(docs || {}).forEach(([id, d]) => { if (d) out[id] = { ...d, cofre: true }; }); });
  return out;
}
function ligarCofres() {
  Object.values(cofresAbertos()).forEach(h => {
    if (cofreOff[h]) return;
    cofreOff[h] = true;
    A.garantirLogin().then(() => { cofreOff[h] = A.Rede.on('cofre/' + h, v => { cofreDocs[h] = v || {}; redesenhar(); }, () => {}); }, () => { cofreOff[h] = null; });
  });
}
const codigoNormal = c => String(c || '').trim().toUpperCase().replace(/\s+/g, '');
const hashCofre = async cod => { const h = await A.hash('cofre:' + codigoNormal(cod)); return { h, t: (await A.hash('tranca:' + h)).slice(0, 12) }; };
// tenta destrancar com um código; devolve a tranca aberta ou null
async function tentarCodigo(cod) {
  if (!codigoNormal(cod)) return null;
  const { h, t } = await hashCofre(cod);
  if (!Object.values(est().docs || {}).some(d => d && d.tranca === t)) return null;
  await A.garantirLogin().catch(() => {});
  const v = await A.Rede.once('cofre/' + h).catch(() => null);
  if (!v) return null;
  const ab = cofresAbertos(); ab[t] = h; ls.set(KEY_COFRES, ab);
  cofreDocs[h] = v; ligarCofres();
  // o Mestre fica sabendo quem abriu (alerta e Relatório)
  if (!A.mestre) A.Rede.set('avisos/' + A.Rede.chave(), { t: 'cofre', s: A.meu || (A.aux ? 'aux' : '?'), x: Object.values(v).map(d => (d && d.tit) || 'Documento').join(' · ').slice(0, 120), ts: Date.now() }).catch(() => {});
  if (somOk()) { A.Som.tom(220, 0, 0.12, 'square', 0.06); A.Som.tom(440, 0.12, 0.12, 'square', 0.06); A.Som.tom(880, 0.24, 0.3, 'square', 0.06); }
  return { t, h, docs: v };
}
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
// **assim** vira negrito (no Arquivo e no Terminal)
const marcaTxt = t => esc(t).replace(/\*\*([^*\n][\s\S]*?)\*\*/g, '<b>$1</b>');
const preenche = n => Array.from({ length: Math.ceil(n / 7) }, (_, k) => 'x'.repeat(Math.min(7, n - k * 7))).join(' ');
const docVistos = {};
function htmlDoc(id, d, mestreVe) {
  const partes = mestreVe ? null : (Array.isArray(d.partes) ? d.partes : Object.values(d.partes || {}));
  const vistos = docVistos[id] || (docVistos[id] = new Map());
  let corpo;
  if (mestreVe) {
    let i = 0;
    corpo = String(d.txt || '').split(/\[\[([\s\S]*?)\]\]/).map((t, k) => {
      if (k % 2 === 0) return marcaTxt(t);
      const x = i++;
      return `<button class="tj-m${(d.rev || {})[x] ? ' aberta' : ''}" data-tj="${x}" title="${(d.rev || {})[x] ? 'Revelada. Toque para tarjar de novo' : 'Tarjada. Toque para revelar aos jogadores'}">${esc(t)}</button>`;
    }).join('');
  } else {
    corpo = partes.map(p => {
      if (p.x === undefined) return marcaTxt(p.t);
      if (p.t !== undefined) { if (!vistos.has(p.x)) vistos.set(p.x, docVistos[id].pronto ? Date.now() : 0); return `<span class="tj-rev${Date.now() - vistos.get(p.x) < 2500 ? ' anima' : ''}">${marcaTxt(p.t)}</span>`; }
      vistos.delete(p.x);
      return `<span class="tj" aria-label="trecho tarjado">${preenche(int(p.n))}</span>`;
    }).join('');
    docVistos[id].pronto = true;
  }
  return `<article class="doc-folha"><header><span class="doc-cab">${esc(d.cab || 'O.R.F.E.U. · DOCUMENTO INTERNO')}</span><h3>${esc(d.tit || 'Documento')}</h3></header><div class="doc-corpo">${corpo}</div>
    <footer><span>${esc(d.data !== undefined && d.data !== null ? d.data : new Date(num(d.ts) || Date.now()).toLocaleDateString('pt-BR'))}</span><i class="doc-carimbo">CONFIDENCIAL</i></footer></article>`;
}
async function publicarDoc(id) {
  const d = (sg()._docs || {})[id]; if (!d) return;
  const velhoH = d.hPub || null;
  const corpo = { tit: d.tit || '', pasta: d.pasta || '', cab: d.cab || '', data: d.data === undefined ? null : String(d.data), onde: d.onde || '', term: d.term || '', partes: partesDoc(d.txt, d.rev), ts: num(d.ts) || Date.now() };
  if (d.pub && d.cod) {
    // cofre: o texto vai para cofre/<hash do código>; o público recebe só a marca
    const { h, t } = await hashCofre(d.cod);
    if (velhoH && velhoH !== h) A.Rede.set('cofre/' + velhoH + '/' + id, null).catch(() => {});
    await A.Rede.set('cofre/' + h + '/' + id, corpo).catch(() => A.aviso('O servidor recusou o cofre.'));
    A.definir(['docs', id], { tranca: t, pasta: d.pasta || '', term: d.term || '', onde: '', ts: corpo.ts });
    if (velhoH !== h) A.gravarSegredo(['_docs', id, 'hPub'], h);
    return;
  }
  if (velhoH) { A.Rede.set('cofre/' + velhoH + '/' + id, null).catch(() => {}); A.gravarSegredo(['_docs', id, 'hPub'], null); }
  A.definir(['docs', id], d.pub ? corpo : null);
}
// lista de códigos dos cofres para o painel Senhas (Mestre e auxiliares)
async function sincCofres() {
  if (!A.mestre) return;
  const out = {};
  for (const [id, d] of Object.entries(sg()._docs || {})) {
    if (!d || !d.cod) continue;
    const { t } = await hashCofre(d.cod);
    out[t] = out[t] || { cod: codigoNormal(d.cod), docs: {} };
    out[t].docs[id] = (d.tit || 'Documento').slice(0, 100);
  }
  A.Rede.set('senhas/cofres', Object.keys(out).length ? out : null).catch(() => {});
}
function publicarCifra(id) {
  const c = (sg()._cifras || {})[id]; if (!c) return;
  if (!c.pub) { A.definir(['cifras', id], null); return; }
  A.definir(['cifras', id], { tit: c.tit || '', pasta: c.pasta || '', onde: c.onde || '', s: cifrar(c.txt), ts: num(c.ts) || Date.now() });
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
  A.aviso(`Visão enviada para ${nome}.`);
  fecharForm(); desenharFerramentas(); selecionar(v.id);
}

/* =========================================================
   4. JANELA DO ARQUIVO (jogadores e Mestre)
   ========================================================= */
const Arq = { aba: 'docs', aberto: false, edit: null, sel: {}, busca: {}, filtro: {}, sala: {}, ordem: {}, mob: 'lista' };
const quemSou = () => A.meu || A.aux || 'mestre';
const KEY_FIX = () => 'acf-arq-fixos-' + quemSou();
const KEY_LIDOS = () => 'acf-arq-lidos-' + quemSou();
const KEY_FECHADAS = 'acf-arq-pastas-fechadas';
const estreito = () => matchMedia('(max-width: 700px)').matches;
const ABAS = () => A.mestre ? [['docs', 'Documentos'], ['cifras', 'Cifras'], ['chave', 'Chave'], ['visoes-m', 'Visões'], ['terminal', 'Terminal']] : [['docs', 'Documentos'], ['cifras', 'Cifras'], ['chave', 'Decifrar'], ['visoes', 'Visões'], ['terminal', 'Terminal']];
const nTarjas = d => (String(d.txt || '').match(/\[\[[\s\S]*?\]\]/g) || []).length;
const revDoc = d => (Array.isArray(d.partes) ? d.partes : Object.values(d.partes || {})).filter(p => p.x !== undefined && p.t !== undefined).length;
const glifosDe = c => [...new Set((Array.isArray(c.s) ? c.s : Object.values(c.s || {})).filter(x => typeof x === 'number'))];
const revCifra = c => glifosDe(c).filter(g => revDe(g)).length;
const salaDe = o => { const m = /^sala:(\d+)$/.exec(o || ''); return m ? +m[1] : 0; };
// data escrita no documento ("21/12/2012") vira número para ordenar; sem data, usa a criação
function dataOrd(txt, ts) { const m = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(txt || ''); if (m) { let y = +m[3]; if (y < 100) y += 1900; return Date.UTC(y, +m[2] - 1, +m[1]); } const a = /\b(1[89]\d\d|20\d\d)\b/.exec(txt || ''); return a ? Date.UTC(+a[1], 0, 1) : num(ts); }
const fixos = () => ls.get(KEY_FIX(), {});
const ehFixo = (aba, id) => !!(fixos()[aba] || {})[id];
function lido(aba) { return (ls.get(KEY_LIDOS(), {})[aba]) || {}; }
function marcarLido(aba, id, n) {
  if (estreito() && Arq.mob !== 'leitor') return;   // no celular, só conta como lido quando abre
  const t = ls.get(KEY_LIDOS(), {}); t[aba] = t[aba] || {}; if (t[aba][id] === n) return;
  t[aba][id] = n; ls.set(KEY_LIDOS(), t); atualizarBadge();
  setTimeout(() => { desenharEstante(); atualizarAbas(); }, 0);
}
function marcaDe(aba, id, n) { if (A.mestre) return ''; const l = lido(aba); if (!(id in l)) return 'novo'; return n > l[id] ? 'liberado' : ''; }

// cada aba vira uma lista de entradas do mesmo formato: a estante só sabe desenhar isso
function entradas(aba) {
  if (aba === 'docs') {
    if (A.mestre) return Object.entries(sg()._docs || {}).map(([id, d]) => { const n = nTarjas(d), r = Object.keys(d.rev || {}).length;
      return { id, tit: d.tit || 'Sem título', pasta: d.pasta || '', sala: salaDe(d.onde), pub: !!d.pub, ts: num(d.ts), dataTxt: d.data !== undefined ? d.data : '', ord: dataOrd(d.data, d.ts), extra: [n ? `${r}/${n} tarjas` : '', d.term ? '⌨ ' + d.term : '', d.cod ? '🔒 ' + d.cod : ''].filter(Boolean).join(' · '), busca: `${d.tit} ${d.txt} ${d.pasta || ''} ${d.data || ''} ${d.term || ''} ${d.cod || ''}` }; });
    const pubs = Object.entries(docsPub()).filter(([, d]) => d && ondeVisivel(d.onde));
    // documentos trancados: uma entrada "▓▓▓" por código, sem título nem texto
    const trancas = new Map();
    pubs.filter(([, d]) => d.tranca).forEach(([, d]) => { const x = trancas.get(d.tranca); if (!x) trancas.set(d.tranca, { pasta: d.pasta || '', ts: num(d.ts) }); else x.ts = Math.max(x.ts, num(d.ts)); });
    return pubs.filter(([, d]) => !d.tranca).map(([id, d]) => { const n = revDoc(d);
      return { id, tit: d.tit || 'Documento', pasta: d.pasta || '', sala: salaDe(d.onde), ts: num(d.ts), dataTxt: d.data || '', ord: dataOrd(d.data, d.ts), marca: marcaDe('docs', id, n), n, extra: d.cofre ? '🔓 acesso liberado' : '', busca: `${d.tit} ${(Array.isArray(d.partes) ? d.partes : Object.values(d.partes || {})).map(p => p.t || '').join(' ')} ${d.pasta || ''}` }; })
      .concat([...trancas].map(([t, x]) => ({ id: 'tr:' + t, tit: '▓▓▓▓▓▓▓▓▓▓▓▓', pasta: x.pasta, ts: x.ts, ord: x.ts, extra: '🔒 acesso restrito', busca: 'acesso restrito cofre senha codigo' })));
  }
  if (aba === 'cifras') {
    if (A.mestre) return Object.entries(sg()._cifras || {}).map(([id, c]) => ({ id, tit: c.tit || 'Sem título', pasta: c.pasta || '', sala: salaDe(c.onde), pub: !!c.pub, ts: num(c.ts), ord: num(c.ts), busca: `${c.tit} ${c.txt} ${c.pasta || ''}` }));
    return Object.entries(cifrasPub()).filter(([, c]) => ondeVisivel(c.onde)).map(([id, c]) => { const n = revCifra(c);
      return { id, tit: c.tit || 'Inscrição', pasta: c.pasta || '', sala: salaDe(c.onde), ts: num(c.ts), ord: num(c.ts), marca: marcaDe('cifras', id, n), n, extra: `${n}/${glifosDe(c).length} letras`, busca: `${c.tit} ${c.pasta || ''}` }; });
  }
  if (aba === 'chave') {
    const usados = new Set();
    Object.values(cifrasPub()).filter(c => ondeVisivel(c.onde)).forEach(c => glifosDe(c).forEach(g => usados.add(g)));
    if (A.mestre) Object.values(sg()._cifras || {}).forEach(c => cifrar(c.txt).forEach(t => { if (typeof t === 'number') usados.add(t); }));
    const lista = [...usados].map(g => { const rv = revDe(g), pl = palpites['g' + g];
      return { id: 'g' + g, g, tit: rv || (pl ? pl.l : '?'), pasta: rv ? 'Confirmadas' : pl ? 'Com palpite' : 'Sem palpite', estado: rv ? 'conf' : pl ? 'pal' : 'sem', ord: g, letra: rv || (pl ? pl.l : '~'), extra: A.mestre ? `é ${letraDoGlifo(g)}` : '', busca: `${rv} ${pl ? pl.l : ''} ${A.mestre ? letraDoGlifo(g) : ''}` }; });
    if (lista.length) lista.unshift({ id: 'todos', tit: 'Quadro completo', pasta: '', fixo: true, ord: -1, busca: 'quadro todos' });
    return lista;
  }
  if (aba === 'visoes') return ls.get(chaveVisoes(), []).map(h => ({ id: h.id, tit: h.txt ? (h.txt.length > 46 ? h.txt.slice(0, 44) + '…' : h.txt) : '(só imagem)', pasta: '', ts: num(h.ts), ord: num(h.ts), marca: marcaDe('visoes', h.id, 1), img: !!h.img, busca: h.txt || '' }));
  if (aba === 'visoes-m') return ls.get('acf-visoes-enviadas', []).map(h => ({ id: h.id || 't' + h.ts, tit: h.txt ? (h.txt.length > 46 ? h.txt.slice(0, 44) + '…' : h.txt) : '(só imagem)', pasta: (A.SER[h.alvo] || {}).nome || h.alvo, alvo: h.alvo, ts: num(h.ts), ord: num(h.ts), img: !!h.img, busca: `${h.txt || ''} ${(A.SER[h.alvo] || {}).nome || ''}` }));
  return [];
}
const PASTA_PADRAO = { terminal: '', docs: 'Sem pasta', cifras: 'Sem pasta', visoes: 'Suas visões', 'visoes-m': 'Sem destino', chave: 'Símbolos' };
const ORDENS = { terminal: [['rec', '']], docs: [['rec', 'Mais recentes'], ['data', 'Data no documento'], ['tit', 'Título'], ['sala', 'Sala']], cifras: [['rec', 'Mais recentes'], ['tit', 'Título'], ['sala', 'Sala']], chave: [['sim', 'Símbolo'], ['letra', 'Letra']], visoes: [['rec', 'Mais recentes'], ['ant', 'Mais antigas']], 'visoes-m': [['rec', 'Mais recentes'], ['ant', 'Mais antigas']] };
function filtros(aba) {
  if (aba === 'chave') return [['todos', 'Todas'], ['conf', 'Confirmadas'], ['pal', 'Com palpite'], ['sem', 'Sem palpite']];
  if (A.mestre && (aba === 'docs' || aba === 'cifras')) return [['todos', 'Todos'], ['pub', 'Publicados'], ['ocu', 'Ocultos']];
  if (A.mestre) return [['todos', 'Todas']];
  return [['todos', 'Todos'], ['novos', 'Novos']];
}
function filtrar(aba, lista) {
  const f = Arq.filtro[aba] || 'todos', q = normal(Arq.busca[aba] || '').trim(), s = Arq.sala[aba] || '';
  return lista.filter(e => {
    if (e.id === 'todos') return !q;
    if (f === 'pub' && !e.pub) return false; if (f === 'ocu' && e.pub) return false;
    if (f === 'novos' && !e.marca) return false;
    if (['conf', 'pal', 'sem'].includes(f) && e.estado !== f) return false;
    if (s && (aba === 'visoes-m' ? e.alvo !== s : String(e.sala) !== s)) return false;
    return !q || normal(e.busca + ' ' + e.tit).includes(q);
  });
}
function ordenar(aba, lista) {
  const o = Arq.ordem[aba] || ORDENS[aba][0][0];
  const cmp = { rec: (a, b) => b.ts - a.ts, ant: (a, b) => a.ts - b.ts, data: (a, b) => b.ord - a.ord, tit: (a, b) => a.tit.localeCompare(b.tit, 'pt'), sala: (a, b) => (a.sala || 999) - (b.sala || 999) || b.ts - a.ts, sim: (a, b) => a.ord - b.ord, letra: (a, b) => String(a.letra).localeCompare(String(b.letra)) || a.ord - b.ord }[o] || ((a, b) => b.ts - a.ts);
  return lista.sort(cmp);
}

/* ---------- janela ---------- */
function abrir(aba, novo) {
  let o = $('#arquivoTela');
  if (!o) {
    o = document.createElement('div'); o.id = 'arquivoTela'; o.className = 'arquivo-tela';
    o.innerHTML = `<div class="arq-caixa"><header class="arq-cab"><div><span>O.R.F.E.U. · ACERVO INTERNO</span><h2>Arquivo</h2></div><nav class="arq-abas"></nav><button data-arq="fechar" class="arq-x" aria-label="Fechar">×</button></header>
      <div class="arq-corpo"><aside class="arq-estante"><div class="arq-ferr" id="arqFerr"></div><div class="arq-lista" id="arqLista"></div><div class="arq-estante-pe" id="arqPe"></div></aside>
      <section class="arq-leitor" id="arqLeitor"></section></div>
      <div class="arq-modal" id="arqModal" hidden><div class="arq-modal-caixa"><header><b id="arqModalTit"></b><button data-arq="cancelar" class="arq-x" aria-label="Fechar">×</button></header><div id="arqForm"></div></div></div></div>`;
    document.body.appendChild(o);
    o.addEventListener('click', aoClicar);
    o.addEventListener('change', e => {
      if (e.target.id === 'cfOnde' || e.target.id === 'dcOnde') { const n = $('#' + e.target.id + 'Cn'); if (n) n.hidden = e.target.value !== 'sala'; }
      if (e.target.dataset.arqF) { Arq[e.target.dataset.arqF][Arq.aba] = e.target.value; desenharEstante(); }
    });
    o.addEventListener('input', e => { if (e.target.id === 'arqBusca') { Arq.busca[Arq.aba] = e.target.value; desenharEstante(); } });
    o.addEventListener('keydown', e => {
      if (e.target.id === 'arqCod' && e.key === 'Enter') { e.preventDefault(); abrirCofre(); }
      if (e.target.id === 'termIn') {
        if (e.key === 'Enter') { e.preventDefault(); const v = e.target.value; e.target.value = ''; termRodar(v); }
        else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !TERM.espera && TERM.hist.length) { e.preventDefault(); TERM.hi = Math.max(0, Math.min(TERM.hist.length, TERM.hi + (e.key === 'ArrowUp' ? -1 : 1))); e.target.value = TERM.hist[TERM.hi] || ''; }
      }
    });
    // tocar em qualquer ponto da tela do terminal volta o cursor para a linha de comando
    o.addEventListener('click', e => { if (Arq.aba === 'terminal' && e.target.closest('.term-crt') && !e.target.closest('button') && !window.getSelection().toString()) { const i = $('#termIn'); if (i) i.focus(); } });
  }
  if (aba) Arq.aba = aba;
  if (!ABAS().some(a => a[0] === Arq.aba)) Arq.aba = 'docs';
  Arq.aberto = true; Arq.mob = 'lista';
  o.hidden = false;
  document.body.classList.add('arq-aberto');
  desenharTudo();
  if (novo) abrirForm(null);
}
function fechar() { const o = $('#arquivoTela'); if (o) o.hidden = true; Arq.aberto = false; fecharForm(); document.body.classList.remove('arq-aberto'); fecharPalpite(); }
function desenharTudo() {
  const o = $('#arquivoTela'); if (!o) return;
  $('.arq-abas', o).innerHTML = ABAS().map(([k, n]) => { const novos = A.mestre ? 0 : entradas(k).filter(e => e.marca).length;
    return `<button data-arq="aba" data-v="${k}" class="${Arq.aba === k ? 'on' : ''}">${n}${novos ? `<i class="arq-ponto">${novos}</i>` : ''}</button>`; }).join('');
  desenharFerramentas(); desenharEstante(); desenharLeitor(true);
}
function desenharFerramentas() {
  const aba = Arq.aba, f = $('#arqFerr');
  $('#arquivoTela .arq-corpo').dataset.term = aba === 'terminal' ? '1' : '';
  if (aba === 'terminal') { f.innerHTML = ''; $('#arqPe').hidden = true; return; }
  const salas = aba === 'visoes-m' ? cobaias().map(x => [x.id, x.nome]) : aba === 'chave' ? [] : [...new Set(entradas(aba).map(e => e.sala).filter(Boolean))].sort((a, b) => a - b).map(cn => [String(cn), `CN ${String(cn).padStart(2, '0')}`]);
  f.innerHTML = `<input id="arqBusca" type="search" placeholder="Buscar ${aba === 'chave' ? 'letra' : aba.startsWith('visoes') ? 'visão' : aba === 'cifras' ? 'cifra' : 'documento'}…" value="${esc(Arq.busca[aba] || '')}" autocomplete="off">
    <div class="arq-chips">${filtros(aba).map(([k, n]) => `<button data-arq="filtro" data-v="${k}" class="${(Arq.filtro[aba] || 'todos') === k ? 'on' : ''}">${n}</button>`).join('')}</div>
    <div class="arq-selects">${salas.length ? `<select data-arq-f="sala" aria-label="${aba === 'visoes-m' ? 'Cobaia' : 'Sala'}"><option value="">${aba === 'visoes-m' ? 'Todas as cobaias' : 'Todas as salas'}</option>${salas.map(([v, n]) => `<option value="${v}" ${Arq.sala[aba] === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>` : ''}
      <select data-arq-f="ordem" aria-label="Ordem">${ORDENS[aba].map(([k, n]) => `<option value="${k}" ${(Arq.ordem[aba] || ORDENS[aba][0][0]) === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
  const pe = $('#arqPe');
  const novo = A.mestre ? { docs: '+ Novo documento', cifras: '+ Nova cifra', 'visoes-m': '+ Nova visão' }[aba] : '';
  const ie = A.mestre && aba === 'docs' ? '<div class="arq-ie"><button data-arq="dc-importar" title="Importar documentos de um arquivo .json">⬆ Importar</button><button data-arq="dc-exportar" title="Baixar todos os documentos em .json">⬇ Exportar</button><input type="file" id="arqImpDocs" accept=".json,application/json" hidden></div>' : '';
  pe.innerHTML = novo ? `<button data-arq="novo" class="pri">${novo}</button>${ie}` : aba === 'chave' && A.mestre ? '<button data-arq="pal-limpar" class="perigo">Apagar todos os palpites</button>' : aba === 'visoes' && entradas('visoes').length ? '<button data-arq="vs-apagar-tudo" class="perigo">Apagar todas</button>' : '';
  pe.hidden = !pe.innerHTML;
}
function desenharEstante() {
  const l = $('#arqLista'); if (!l || !Arq.aberto) return;
  if (Arq.aba === 'terminal') { if (l.dataset.html) { l.innerHTML = ''; l.dataset.html = ''; } return; }
  const aba = Arq.aba, todas = entradas(aba);
  const lista = ordenar(aba, filtrar(aba, todas));
  const fx = fixos()[aba] || {}, fechadas = ls.get(KEY_FECHADAS, {});
  const grupos = new Map();
  const fixadas = lista.filter(e => fx[e.id] || e.fixo);
  if (fixadas.length) grupos.set('📌 Fixados', fixadas);
  lista.filter(e => !fx[e.id] && !e.fixo).forEach(e => { const p = e.pasta || PASTA_PADRAO[aba]; if (!grupos.has(p)) grupos.set(p, []); grupos.get(p).push(e); });
  // a pasta padrão vai para o fim; as outras em ordem alfabética
  const nomes = [...grupos.keys()].sort((a, b) => (a === '📌 Fixados' ? -1 : b === '📌 Fixados' ? 1 : a === PASTA_PADRAO[aba] ? 1 : b === PASTA_PADRAO[aba] ? -1 : a.localeCompare(b, 'pt')));
  const sel = Arq.sel[aba];
  const linha = e => `<button class="arq-row${sel === e.id ? ' on' : ''}${e.pub === false ? ' ocu' : ''}" data-arq="sel" data-id="${esc(e.id)}">
      ${aba === 'chave' && e.g !== undefined ? `<span class="arq-gl">${glifoSVG(e.g)}</span>` : ''}
      <span class="arq-row-txt"><b>${aba === 'chave' && e.g !== undefined ? `<span class="arq-letra ${e.estado}">${esc(e.tit)}</span>` : esc(e.tit)}</b>
      <small>${[e.dataTxt, e.sala ? 'CN ' + String(e.sala).padStart(2, '0') : '', aba === 'visoes-m' || aba === 'visoes' ? new Date(e.ts).toLocaleDateString('pt-BR') : '', e.img ? 'com imagem' : '', e.extra].filter(Boolean).map(esc).join(' · ')}</small></span>
      ${e.marca ? `<i class="arq-marca ${e.marca}">${e.marca === 'novo' ? 'NOVO' : 'LIBERADO'}</i>` : ''}${e.pub !== undefined ? `<i class="arq-estado ${e.pub ? 'pub' : ''}" title="${e.pub ? 'Publicado' : 'Oculto dos jogadores'}"></i>` : ''}</button>`;
  const html = lista.length ? nomes.map(p => { const k = aba + ':' + p, fechada = !!fechadas[k] && !Arq.busca[aba];
    return `<div class="arq-pasta${fechada ? ' fechada' : ''}"><button class="arq-pasta-cab" data-arq="pasta" data-v="${esc(k)}"><span>${esc(p)}</span><i>${grupos.get(p).length}</i></button>${fechada ? '' : `<div class="arq-pasta-itens">${grupos.get(p).map(linha).join('')}</div>`}</div>`; }).join('')
    : `<p class="arq-vazio">${todas.length ? 'Nada com esses filtros.' : vazioDe(aba)}</p>`;
  if (l.dataset.html !== html) { l.innerHTML = html; l.dataset.html = html; }
  // nada selecionado: abre o mais recente (no celular, a lista vem primeiro)
  if (!sel || !todas.some(e => e.id === sel)) {
    const prim = lista.find(e => e.marca) || ordenar(aba, todas.filter(e => e.id !== 'todos').slice())[0] || lista[0];
    if (aba === 'chave') Arq.sel[aba] = todas.length ? 'todos' : undefined;
    else Arq.sel[aba] = prim ? prim.id : undefined;
    if (Arq.sel[aba] !== sel) { desenharEstante(); desenharLeitor(); }
  }
}
const vazioDe = aba => ({ docs: A.mestre ? 'Nenhum documento criado.' : 'Nenhum documento encontrado ainda.', cifras: A.mestre ? 'Nenhuma cifra criada.' : 'Nenhuma cifra encontrada ainda.', chave: 'Nenhum símbolo encontrado ainda.', visoes: 'Nenhuma visão… ainda.', 'visoes-m': 'Nenhuma visão enviada deste aparelho.' }[aba]);

/* ---------- leitor ---------- */
const btnFixar = (aba, id) => `<button data-arq="fixar" data-id="${esc(id)}" class="${ehFixo(aba, id) ? 'on' : ''}" title="Fixar no topo da estante">📌 ${ehFixo(aba, id) ? 'Fixado' : 'Fixar'}</button>`;
const voltar = '<button data-arq="voltar" class="arq-voltar">‹ Voltar</button>';
function desenharLeitor(forcar) {
  const el = $('#arqLeitor'); if (!el || !Arq.aberto) return;
  const corpo = $('#arquivoTela .arq-corpo'); corpo.dataset.mob = Arq.mob;
  if (Arq.aba === 'terminal') { corpo.dataset.mob = 'leitor'; desenharTerminal(forcar); return; }
  const aba = Arq.aba, id = Arq.sel[aba];
  let barra = '', html = '';
  if (aba === 'docs' && id && id.startsWith('tr:') && !A.mestre) {
    html = `<div class="arq-cofre"><p class="arq-cofre-k">ACESSO RESTRITO</p><p class="arq-cofre-sub">AUTORIZAÇÃO NECESSÁRIA</p>
      <div class="arq-cofre-linha"><input id="arqCod" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="código de acesso" aria-label="Código de acesso"><button data-arq="cofre" class="pri">Acessar</button></div>
      <p class="arq-cofre-erro" id="arqCodErro" hidden>ACESSO NEGADO.</p></div>`;
  } else if (!id) html = `<div class="arq-leitor-vazio"><span>◈</span><p>${A.mestre && aba !== 'chave' ? 'Escolha um item na estante ou crie um novo.' : 'Escolha um item na estante.'}</p></div>`;
  else if (aba === 'docs') {
    if (A.mestre) { const d = (sg()._docs || {})[id]; if (d) { const n = nTarjas(d), r = Object.keys(d.rev || {}).length;
      barra = `<button data-arq="dc-pub" data-id="${id}" class="${d.pub ? '' : 'pri'}">${d.pub ? '◌ Esconder' : '● Publicar'}</button>${n ? `<button data-arq="dc-abrir" data-id="${id}">Revelar todas</button><button data-arq="dc-fechar" data-id="${id}">Tarjar todas</button>` : ''}<button data-arq="dc-editar" data-id="${id}">✎ Editar</button>${btnFixar(aba, id)}<button data-arq="dc-apagar" data-id="${id}" class="perigo arq-dir">Apagar</button>`;
      html = `<p class="arq-meta">${[d.pub ? 'Publicado' : 'Oculto dos jogadores', d.pasta, d.onde ? A.nomeSala(salaDe(d.onde)) : 'Só no Arquivo', d.term ? 'Terminal: ' + d.term.toUpperCase() : '', d.cod ? 'Cofre: código ' + d.cod + ' (os jogadores só leem depois de digitar)' : '', n ? `${r} de ${n} tarjas abertas · toque numa tarja para abrir ou fechar` : ''].filter(Boolean).map(esc).join(' · ')}</p><div class="doc-mestre" data-doc="${id}">${htmlDoc(id, d, true)}</div>`; } }
    else { const d = docsPub()[id]; if (d && !d.tranca) { barra = btnFixar(aba, id); html = `<p class="arq-meta">${[d.pasta, d.onde ? A.nomeSala(salaDe(d.onde)) : '', d.cofre ? '🔓 acesso liberado' : ''].filter(Boolean).map(esc).join(' · ')}</p>${htmlDoc(id, d, false)}`; marcarLido('docs', id, revDoc(d)); } }
  } else if (aba === 'cifras') {
    if (A.mestre) { const c = (sg()._cifras || {})[id]; if (c) {
      barra = `<button data-arq="cf-pub" data-id="${id}" class="${c.pub ? '' : 'pri'}">${c.pub ? '◌ Esconder' : '● Publicar'}</button>${c.pub ? `<button data-arq="cf-chat" data-id="${id}">Mandar no chat</button><button data-arq="cf-revtudo" data-id="${id}">Revelar letras</button><button data-arq="cf-esctudo" data-id="${id}">Esconder letras</button>` : ''}<button data-arq="cf-editar" data-id="${id}">✎ Editar</button>${btnFixar(aba, id)}<button data-arq="cf-apagar" data-id="${id}" class="perigo arq-dir">Apagar</button>`;
      html = `<p class="arq-meta">${[c.pub ? 'Publicada' : 'Oculta dos jogadores', c.pasta, c.onde ? A.nomeSala(salaDe(c.onde)) : 'Só no Arquivo'].filter(Boolean).map(esc).join(' · ')}</p>
        <article class="cf-folha"><header><span class="doc-cab">O.R.F.E.U. · INSCRIÇÃO</span><h3>${esc(c.tit || 'Sem título')}</h3></header><p class="arq-plano">${esc(c.txt || '')}</p>${htmlCifra(id, c.pub ? cifrasPub()[id] : { s: cifrar(c.txt) }, 'cheia')}</article>
        <p class="mini">Toque num símbolo para revelar ou esconder a letra em todas as cifras. Palpites: verde certo, vermelho errado.</p>`; } }
    else { const c = cifrasPub()[id]; if (c) { barra = btnFixar(aba, id); html = `<p class="arq-meta">${[c.pasta, c.onde ? A.nomeSala(salaDe(c.onde)) : '', `${revCifra(c)} de ${glifosDe(c).length} letras confirmadas`].filter(Boolean).map(esc).join(' · ')}</p>
      <article class="cf-folha"><header><span class="doc-cab">INSCRIÇÃO ENCONTRADA</span><h3>${esc(c.tit || 'Inscrição')}</h3></header>${htmlCifra(id, c, 'cheia')}</article><p class="mini">Toque num símbolo para dar um palpite. Todos da mesa veem.</p>`; marcarLido('cifras', id, revCifra(c)); } }
  } else if (aba === 'chave') {
    if (id === 'todos') { const es = entradas('chave').filter(e => e.g !== undefined).sort((a, b) => a.g - b.g);
      html = `<article class="cf-folha"><header><span class="doc-cab">CHAVE DOS SIGILOS</span><h3>Quadro completo</h3></header><div class="cifra cf-chave"><div class="cf-texto">${es.map(e => `<span class="cf-palavra">${htmlCel(e.g)}</span>`).join('')}</div></div></article>
        <p class="arq-meta">${es.filter(e => e.estado === 'conf').length} de ${es.length} confirmadas · ${es.filter(e => e.estado === 'pal').length} com palpite · cada símbolo é sempre a mesma letra em todas as cifras</p>`; }
    else { const g = +id.slice(1), rv = revDe(g), pl = palpites['g' + g];
      const onde = Object.entries(A.mestre ? sg()._cifras || {} : cifrasPub()).filter(([, c]) => (A.mestre ? cifrar(c.txt) : glifosDe(c)).includes(g)).map(([cid, c]) => `<button data-arq="ir-cifra" data-id="${cid}">◈ ${esc(c.tit || 'Cifra')}</button>`).join('');
      barra = A.mestre ? `<button data-arq="gl-rev" data-id="${g}" class="${rv ? '' : 'pri'}">${rv ? 'Esconder a letra' : `Revelar como ${letraDoGlifo(g)}`}</button>` : rv ? '' : `<button data-arq="gl-pal" data-id="${g}" class="pri">${pl ? 'Mudar palpite' : 'Dar palpite'}</button>`;
      html = `<div class="gl-ficha"><div class="gl-grande">${glifoSVG(g)}</div><div><p class="gl-letra ${rv ? 'conf' : pl ? 'pal' : 'sem'}">${esc(rv || (pl ? pl.l : '?'))}</p>
        <p class="arq-meta">${rv ? 'Confirmada pelo Mestre' : pl ? `Palpite de ${esc((A.SER[pl.por] || {}).nome || 'alguém')}` : 'Ninguém arriscou ainda'}${A.mestre ? ` · na chave: ${letraDoGlifo(g)}` : ''}</p></div></div>
        ${onde ? `<p class="arq-sub">Aparece em</p><div class="arq-linha">${onde}</div>` : ''}`; }
  } else if (aba === 'visoes') { const h = ls.get(chaveVisoes(), []).find(x => x.id === id); if (h) {
      barra = `<button data-arq="vs-rever" data-id="${esc(id)}" class="pri">▶ Rever</button>${btnFixar(aba, id)}<button data-arq="vs-apagar" data-id="${esc(id)}" class="perigo arq-dir">Apagar</button>`;
      html = `<article class="vs-folha">${h.img ? `<img src="${h.img}" alt="">` : ''}<p>${esc(h.txt || '')}</p><small>${new Date(num(h.ts)).toLocaleString('pt-BR')}</small></article>`; marcarLido('visoes', id, 1); } }
  else if (aba === 'visoes-m') { const log = ls.get('acf-visoes-enviadas', []); const i = log.findIndex(h => (h.id || 't' + h.ts) === id), h = log[i]; if (h) {
      barra = `${btnFixar(aba, id)}<button data-arq="vsm-apagar" data-i="${i}" class="perigo arq-dir" title="${h.id ? 'Apaga também do Arquivo do jogador' : 'Apaga só desta lista'}">Apagar</button>`;
      html = `<p class="arq-meta">Para ${esc((A.SER[h.alvo] || {}).nome || h.alvo)} · ${new Date(num(h.ts)).toLocaleString('pt-BR')}${h.img ? ' · com imagem (a imagem fica só com o jogador)' : ''}</p><article class="vs-folha"><p>${esc(h.txt || '(só imagem)')}</p></article>
        <p class="mini">Apagar tira a visão daqui e também do Arquivo do jogador, na próxima vez que ele estiver com o site aberto.</p>`; } }
  if (id && !html) html = `<div class="arq-leitor-vazio"><span>◈</span><p>Este item não existe mais.</p></div>`;
  const tudo = `<div class="arq-barra">${voltar}${barra}</div><div class="arq-papel">${html}</div>`;
  if (forcar || el.dataset.html !== tudo) { const rol = el.scrollTop, mesmo = el.dataset.item === aba + id; el.innerHTML = tudo; el.dataset.html = tudo; el.dataset.item = aba + id; el.scrollTop = mesmo ? rol : 0; }
}
function desenharLista() { desenharEstante(); desenharLeitor(); }
// contadores de novidades nas abas, sem redesenhar o resto
function atualizarAbas() {
  if (A.mestre) return;
  $$('#arquivoTela .arq-abas button').forEach(b => { const n = entradas(b.dataset.v).filter(e => e.marca).length; let i = $('.arq-ponto', b);
    if (n && !i) { i = document.createElement('i'); i.className = 'arq-ponto'; b.appendChild(i); } if (i) { if (n) i.textContent = n; else i.remove(); } });
}

/* ---------- formulários (janela por cima) ---------- */
const opcoesOnde = (id, onde) => { const m = /^sala:(\d+)$/.exec(onde || ''); return `<div class="arq-linha"><label class="arq-campo">Onde aparece <select id="${id}"><option value="">Só no Arquivo</option><option value="sala" ${m ? 'selected' : ''}>Na parede de uma sala</option></select></label><label class="arq-campo" id="${id}Cn" ${m ? '' : 'hidden'}>CN da sala <input type="number" id="${id}N" min="1" max="125" value="${m ? m[1] : ''}"></label></div>`; };
const lerOnde = id => { if ($('#' + id).value !== 'sala') return ''; const n = int($('#' + id + 'N').value); return n >= 1 && n <= 125 ? 'sala:' + n : ''; };
const campoPasta = (id, v, aba) => `<label class="arq-campo">Pasta <input id="${id}" maxlength="40" list="${id}L" value="${esc(v || '')}" placeholder="Ex.: Relatórios, Relatos orais, Ordens"><datalist id="${id}L">${[...new Set(entradas(aba).map(e => e.pasta).filter(Boolean))].map(p => `<option value="${esc(p)}">`).join('')}</datalist></label>`;
function abrirForm(id) {
  if (!A.mestre) return;
  Arq.edit = id || null;
  const f = $('#arqForm'), aba = Arq.aba;
  if (aba === 'cifras') {
    const c = id ? (sg()._cifras || {})[id] || {} : {};
    $('#arqModalTit').textContent = id ? 'Editar cifra' : 'Nova cifra';
    f.innerHTML = `<div class="arq-linha"><label class="arq-campo">Título (os jogadores veem) <input id="cfTit" maxlength="80" value="${esc(c.tit || '')}" placeholder="Ex.: Inscrição na porta da CN 14"></label>${campoPasta('cfPasta', c.pasta, 'cifras')}</div>
      <label class="arq-campo">Mensagem (letras e números viram símbolos; acentos somem) <textarea id="cfTxt" rows="3" maxlength="400" placeholder="O QUE ESTÁ ESCRITO">${esc(c.txt || '')}</textarea></label>
      <div class="arq-prev" id="cfPrev"></div>${opcoesOnde('cfOnde', c.onde)}
      <div class="arq-linha arq-form-pe"><button data-arq="cancelar">Cancelar</button><button data-arq="cf-salvar" class="pri">${id ? 'Salvar' : 'Criar (oculta)'}</button></div>`;
    const prev = () => { const t = $('#cfTxt').value; $('#cfPrev').innerHTML = t ? htmlCifra('prev', { s: cifrar(t.slice(0, 60)) }, 'mini') : ''; };
    $('#cfTxt').oninput = prev; prev();
  } else if (aba === 'docs') {
    const d = id ? (sg()._docs || {})[id] || {} : {};
    $('#arqModalTit').textContent = id ? 'Editar documento' : 'Novo documento';
    f.innerHTML = `<div class="arq-linha"><label class="arq-campo arq-largo">Título <input id="dcTit" maxlength="100" value="${esc(d.tit || '')}" placeholder="Ex.: Relatório do Experimento 7"></label>${campoPasta('dcPasta', d.pasta, 'docs')}</div>
      <div class="arq-linha"><label class="arq-campo arq-largo">Cabeçalho <input id="dcCab" maxlength="100" value="${esc(d.cab || '')}" placeholder="O.R.F.E.U. · DOCUMENTO INTERNO"></label>
        <label class="arq-campo">Data no documento <input id="dcData" maxlength="40" value="${esc(d.data !== undefined ? d.data : new Date().toLocaleDateString('pt-BR'))}" placeholder="vazio: sem data"></label></div>
      <label class="arq-campo">Texto · entre [[colchetes duplos]] fica tarjado · entre **asteriscos duplos** fica em negrito <textarea id="dcTxt" rows="10" maxlength="12000" placeholder="O paciente [[nome]] foi transferido para a ala [[C-12]] em...">${esc(d.txt || '')}</textarea></label>
      ${opcoesOnde('dcOnde', d.onde)}
      <div class="arq-linha"><label class="arq-campo">Diretório no Terminal <input id="dcTerm" maxlength="24" list="dcTermL" value="${esc(d.term || '')}" placeholder="vazio: não aparece no Terminal"><datalist id="dcTermL">${[...new Set(['arquivos', 'experimentos', 'cobaias'].concat(Object.values(sg()._docs || {}).map(x => x.term).filter(Boolean)))].map(p => `<option value="${esc(p)}">`).join('')}</datalist></label>
        <label class="arq-campo">Código de acesso (cofre) <input id="dcCod" maxlength="30" value="${esc(d.cod || '')}" autocomplete="off" spellcheck="false" placeholder="vazio: sem código"></label></div>
      <p class="mini">A data sai no pé do documento como você escrever (21/12/2012, "março de 1998", "??/??/19??"); vazio esconde. Com código de acesso, os jogadores veem só "▓▓▓" até digitarem o código no Arquivo ou no Terminal (acesso CÓDIGO). Documentos com o mesmo código abrem juntos. O código aparece na pasta Senhas.</p>
      <div class="arq-linha arq-form-pe"><button data-arq="cancelar">Cancelar</button><button data-arq="dc-salvar" class="pri">${id ? 'Salvar' : 'Criar (oculto)'}</button></div>`;
  } else if (aba === 'visoes-m') {
    $('#arqModalTit').textContent = 'Nova visão';
    f.innerHTML = `<p class="mini">Aparece só na tela da cobaia escolhida, com som. Os outros veem apenas "Fulano teve uma visão" no chat, se ficar marcado.</p>
      <label class="arq-campo">Para <select id="vsAlvo"><option value="">Escolha…</option>${cobaias().map(x => `<option value="${x.id}">${esc(x.nome)}${x.jogador ? ' · ' + esc(x.jogador) : ''}</option>`).join('')}</select></label>
      <label class="arq-campo">Frase <textarea id="vsTxt" rows="3" maxlength="300" placeholder="Ela ainda está na sala de baixo."></textarea></label>
      <label class="arq-campo">Imagem (opcional) <input type="file" id="vsImg" accept="image/*"></label>
      <div class="arq-linha"><label class="arq-campo">Efeito <select id="vsEf">${EF_VISAO.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <label class="arq-campo">Duração <select id="vsDur">${[3, 5, 8, 12].map(s => `<option value="${s}" ${s === 5 ? 'selected' : ''}>${s} s</option>`).join('')}</select></label></div>
      <label class="chave"><input type="checkbox" id="vsChat" checked><span>Avisar no chat geral</span></label>
      <div class="arq-linha arq-form-pe"><button data-arq="cancelar">Cancelar</button><button data-arq="vs-enviar" class="pri">👁 Enviar visão</button></div>`;
  } else return;
  $('#arqModal').hidden = false;
  setTimeout(() => { if ($('#arqForm').contains(document.activeElement)) return; const i = $('#arqForm input, #arqForm select'); if (i) i.focus(); }, 30);
}
function fecharForm() { const m = $('#arqModal'); if (m) m.hidden = true; Arq.edit = null; }
function selecionar(id) { Arq.sel[Arq.aba] = id; Arq.mob = 'leitor'; desenharEstante(); desenharLeitor(true); }

function aoClicar(e) {
  const t = e.target;
  if (t === $('#arquivoTela')) { fechar(); return; }
  if (t === $('#arqModal')) { fecharForm(); return; }
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
  if (a === 'aba') { Arq.aba = b.dataset.v; Arq.mob = 'lista'; fecharForm(); desenharTudo(); return; }
  if (a === 'cancelar') { fecharForm(); return; }
  if (a === 'sel') { selecionar(id); return; }
  if (a === 'voltar') { Arq.mob = 'lista'; desenharLeitor(); return; }
  if (a === 'filtro') { Arq.filtro[Arq.aba] = b.dataset.v; desenharFerramentas(); desenharEstante(); return; }
  if (a === 'pasta') { const f = ls.get(KEY_FECHADAS, {}); if (f[b.dataset.v]) delete f[b.dataset.v]; else f[b.dataset.v] = true; ls.set(KEY_FECHADAS, f); desenharEstante(); return; }
  if (a === 'fixar') { const f = fixos(); f[Arq.aba] = f[Arq.aba] || {}; if (f[Arq.aba][id]) delete f[Arq.aba][id]; else f[Arq.aba][id] = 1; ls.set(KEY_FIX(), f); desenharLista(); return; }
  if (a === 'ir-cifra') { Arq.aba = 'cifras'; Arq.sel.cifras = id; Arq.mob = 'leitor'; desenharTudo(); return; }
  if (a === 'gl-pal') { const cel = $('#arqLeitor .gl-grande'); abrirPalpite(+id, cel || b); return; }
  if (a === 'vs-rever') { const h = ls.get(chaveVisoes(), []).find(x => x.id === id); if (h) mostrarVisao({ ...h, ts: Date.now() }); return; }
  if (a === 'vs-apagar' || a === 'vs-apagar-tudo') {
    if (!confirm(a === 'vs-apagar-tudo' ? 'Apagar todas as suas visões deste aparelho?' : 'Apagar esta visão?')) return;
    ls.set(chaveVisoes(), a === 'vs-apagar-tudo' ? [] : ls.get(chaveVisoes(), []).filter(h => h.id !== id));
    Arq.sel.visoes = undefined; Arq.mob = 'lista'; atualizarBadge(); desenharFerramentas(); desenharLista(); return;
  }
  if (a === 'cofre') { abrirCofre(); return; }
  if (a === 'term-cmd') { termRodar(b.dataset.v); return; }
  if (a === 'term-tranca') { termPedirCodigo(); return; }
  if (!A.mestre) return;
  if (a === 'novo') { abrirForm(null); return; }
  if (a === 'gl-rev') { const g = +id; A.definir(['cifraRev', 'g' + g], revDe(g) ? null : letraDoGlifo(g)); return; }
  if (a === 'vsm-apagar') {
    const log = ls.get('acf-visoes-enviadas', []), h = log[+b.dataset.i]; if (!h) return;
    if (!confirm(`Apagar esta visão${h.id ? ` também do Arquivo de ${(A.SER[h.alvo] || {}).nome || h.alvo}` : ''}?`)) return;
    log.splice(+b.dataset.i, 1); ls.set('acf-visoes-enviadas', log);
    if (h.id) A.Rede.set('visoes/' + h.alvo, { id: 'del-' + A.Rede.chave(), del: h.id, ts: Date.now() }).catch(() => A.aviso('O servidor recusou.'));
    Arq.sel['visoes-m'] = undefined; Arq.mob = 'lista'; desenharLista(); return;
  }
  if (a === 'cf-salvar') {
    const txt = ($('#cfTxt').value || '').trim();
    if (!normal(txt).replace(/[^A-Z0-9]/g, '')) { A.aviso('Escreva a mensagem com letras ou números.'); return; }
    const k = Arq.edit || A.Rede.chave(), velho = (sg()._cifras || {})[k] || {};
    A.gravarSegredo(['_cifras', k], { tit: ($('#cfTit').value || '').trim().slice(0, 80), pasta: ($('#cfPasta').value || '').trim().slice(0, 40), txt: txt.slice(0, 400), onde: lerOnde('cfOnde'), pub: !!velho.pub, ts: velho.ts || Date.now() });
    if (velho.pub) publicarCifra(k);
    fecharForm(); desenharFerramentas(); selecionar(k); A.redesenharCartao();
  } else if (a === 'cf-pub') { const c = sg()._cifras[id]; A.gravarSegredo(['_cifras', id, 'pub'], !c.pub); publicarCifra(id); desenharLista(); A.redesenharCartao(); }
  else if (a === 'cf-chat') { A.enviarChat(`⟦cifra:${id}⟧`, 'geral'); A.aviso('Cifra mandada no chat geral.'); }
  else if (a === 'cf-revtudo' || a === 'cf-esctudo') { const c = cifrasPub()[id]; if (!c) return; glifosDe(c).forEach(g => A.definir(['cifraRev', 'g' + g], a === 'cf-revtudo' ? letraDoGlifo(g) : null)); }
  else if (a === 'cf-editar' || a === 'dc-editar') abrirForm(id);
  else if (a === 'cf-apagar') { if (!confirm('Apagar esta cifra?')) return; A.gravarSegredo(['_cifras', id], null); A.definir(['cifras', id], null); Arq.sel.cifras = undefined; Arq.mob = 'lista'; desenharFerramentas(); desenharLista(); A.redesenharCartao(); }
  else if (a === 'dc-salvar') {
    const txt = ($('#dcTxt').value || '').trim();
    if (!txt) { A.aviso('Escreva o texto do documento.'); return; }
    const k = Arq.edit || A.Rede.chave(), velho = (sg()._docs || {})[k] || {};
    const cod = codigoNormal($('#dcCod').value).slice(0, 30);
    A.gravarSegredo(['_docs', k], { tit: ($('#dcTit').value || '').trim().slice(0, 100), pasta: ($('#dcPasta').value || '').trim().slice(0, 40), cab: ($('#dcCab').value || '').trim().slice(0, 100), data: ($('#dcData').value || '').trim().slice(0, 40), txt: txt.slice(0, 12000), onde: cod ? '' : lerOnde('dcOnde'), term: ($('#dcTerm').value || '').trim().toLowerCase().replace(/\s+/g, '-').slice(0, 24) || null, cod: cod || null, hPub: velho.hPub || null, pub: !!velho.pub, rev: txt === velho.txt ? velho.rev || null : null, ts: velho.ts || Date.now() });
    if (velho.pub || velho.hPub) publicarDoc(k);
    if (cod || velho.cod) sincCofres();
    fecharForm(); desenharFerramentas(); selecionar(k); A.redesenharCartao();
  } else if (a === 'dc-pub') { const d = sg()._docs[id]; A.gravarSegredo(['_docs', id, 'pub'], !d.pub); publicarDoc(id); desenharLista(); A.redesenharCartao(); }
  else if (a === 'dc-abrir' || a === 'dc-fechar') {
    const d = sg()._docs[id]; if (!d) return;
    const n = nTarjas(d), rev = {};
    if (a === 'dc-abrir') for (let i = 0; i < n; i++) rev[i] = true;
    A.gravarSegredo(['_docs', id, 'rev'], a === 'dc-abrir' && n ? rev : null); publicarDoc(id); desenharLista();
  }
  else if (a === 'dc-apagar') { if (!confirm('Apagar este documento?')) return; const dv = sg()._docs[id] || {}; if (dv.hPub) A.Rede.set('cofre/' + dv.hPub + '/' + id, null).catch(() => {}); A.gravarSegredo(['_docs', id], null); if (dv.cod) sincCofres(); A.definir(['docs', id], null); Arq.sel.docs = undefined; Arq.mob = 'lista'; desenharFerramentas(); desenharLista(); A.redesenharCartao(); }
  else if (a === 'vs-enviar') { b.disabled = true; enviarVisao().catch(() => {}).finally(() => { b.disabled = false; }); }
  else if (a === 'dc-exportar') exportarDocs();
  else if (a === 'dc-importar') { const i = $('#arqImpDocs'); i.value = ''; i.onchange = () => { if (i.files[0]) importarDocs(i.files[0]); }; i.click(); }
  else if (a === 'pal-limpar') { if (confirm('Apagar todos os palpites dos jogadores?')) A.Rede.set('cifraPalpite', null).catch(() => {}); }
}

/* ---------- cofre (jogador) ---------- */
async function abrirCofre() {
  const i = $('#arqCod'), e = $('#arqCodErro'); if (!i) return;
  const b = $('#arqLeitor [data-arq="cofre"]'); if (b) b.disabled = true;
  const r = await tentarCodigo(i.value).catch(() => null);
  if (b) b.disabled = false;
  if (!r) { if (e) { e.hidden = false; e.classList.remove('treme'); void e.offsetWidth; e.classList.add('treme'); } i.select(); if (somOk()) A.Som.tom(110, 0, 0.35, 'sawtooth', 0.07); return; }
  // abre o primeiro documento liberado
  const prim = Object.entries(r.docs).sort((a, b) => num(a[1].ts) - num(b[1].ts))[0];
  Arq.sel.docs = prim ? prim[0] : undefined;
  A.aviso('Acesso liberado.');
  desenharEstante(); desenharLeitor(true);
}

/* ---------- importar e exportar documentos (Mestre) ---------- */
function baixar(nome, obj) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function exportarDocs() {
  const docs = Object.values(sg()._docs || {}).sort((a, b) => num(a.ts) - num(b.ts)).map(d => ({ tit: d.tit || '', pasta: d.pasta || '', cab: d.cab || '', data: d.data === undefined ? '' : d.data, txt: d.txt || '', onde: d.onde || '', term: d.term || '', cod: d.cod || '', pub: !!d.pub }));
  baixar(`arquivo-orfeu-documentos-${new Date().toISOString().slice(0, 10)}.json`, { tipo: 'planta-acf-docs', versao: 1, salvoEm: Date.now(), docs });
  A.aviso(`${docs.length} documento${docs.length === 1 ? '' : 's'} exportado${docs.length === 1 ? '' : 's'}. O arquivo tem os códigos dos cofres: não envie ao GitHub.`);
}
function importarDocs(f) {
  const r = new FileReader();
  r.onload = async () => {
    let lista;
    try { const o = JSON.parse(r.result); lista = Array.isArray(o) ? o : o && Array.isArray(o.docs) ? o.docs : null; } catch (e) { lista = null; }
    lista = (lista || []).filter(d => d && typeof d.txt === 'string' && d.txt.trim());
    if (!lista.length) { A.aviso('Arquivo sem documentos válidos.'); return; }
    const existentes = new Set(Object.values(sg()._docs || {}).map(d => (d.tit || '') + '\u0000' + (d.txt || '')));
    const novos = lista.filter(d => !existentes.has((d.tit || '') + '\u0000' + d.txt.trim()));
    if (!novos.length) { A.aviso('Esses documentos já estão no Arquivo.'); return; }
    const pubs = novos.filter(d => d.pub).length;
    if (!confirm(`Importar ${novos.length} documento${novos.length === 1 ? '' : 's'}${lista.length > novos.length ? ` (${lista.length - novos.length} já existiam e ficam de fora)` : ''}?${pubs ? `\n${pubs} já entra${pubs === 1 ? '' : 'm'} publicado${pubs === 1 ? '' : 's'}, como no arquivo.` : ''}`)) return;
    let t = Date.now();
    const ks = [];
    for (const d of novos) {
      const k = A.Rede.chave(), cod = codigoNormal(d.cod).slice(0, 30);
      A.gravarSegredo(['_docs', k], { tit: String(d.tit || '').slice(0, 100), pasta: String(d.pasta || '').slice(0, 40), cab: String(d.cab || '').slice(0, 100), data: String(d.data === undefined || d.data === null ? '' : d.data).slice(0, 40), txt: d.txt.trim().slice(0, 12000), onde: cod ? '' : (/^sala:\d+$/.test(d.onde || '') ? d.onde : ''), term: String(d.term || '').trim().toLowerCase().replace(/\s+/g, '-').slice(0, 24) || null, cod: cod || null, pub: !!d.pub, ts: t++ });
      ks.push(k);
    }
    for (const k of ks) if (sg()._docs[k].pub) await publicarDoc(k);
    await sincCofres();
    Arq.aba = 'docs'; desenharTudo();
    A.aviso(`${ks.length} documento${ks.length === 1 ? '' : 's'} importado${ks.length === 1 ? '' : 's'}.`);
  };
  r.readAsText(f);
}

/* =========================================================
   4b. TERMINAL O.R.F.E.U.
   Mostra, em letra de terminal, os documentos publicados que têm um "diretório do terminal".
   Comandos: help, ls, open <diretório>, acesso <código>, clear. A saída fica na sessão da aba.
   ========================================================= */
const KEY_TERM = 'acf-term-saida';
const TERM = { linhas: null, espera: false, hist: [], hi: 0 };
const BARRA = '-'.repeat(60);
const barraT = () => '-'.repeat(estreito() ? 30 : 60);
const termCarregar = () => { if (TERM.linhas) return; try { TERM.linhas = JSON.parse(sessionStorage.getItem(KEY_TERM) || 'null'); } catch (e) { TERM.linhas = null; } if (!Array.isArray(TERM.linhas)) TERM.linhas = [{ k: 'banner' }]; };
const termSalvar = () => { try { sessionStorage.setItem(KEY_TERM, JSON.stringify(TERM.linhas.slice(-300))); } catch (e) {} };
const termOut = (...ls2) => { termCarregar(); ls2.forEach(l => TERM.linhas.push(typeof l === 'string' ? { k: 't', t: l } : l)); termSalvar(); desenharTerminal(); };
function termDirs() {
  const m = new Map();
  Object.values(docsPub()).forEach(d => { if (d && d.term && ondeVisivel(d.onde)) m.set(String(d.term).toLowerCase(), String(d.term).toLowerCase()); });
  return [...m.keys()].sort((a, b) => a.localeCompare(b, 'pt'));
}
const termDocsDe = dir => Object.entries(docsPub()).filter(([, d]) => d && String(d.term || '').toLowerCase() === dir && ondeVisivel(d.onde));
function termTextoDoc(id, d) {
  const partes = Array.isArray(d.partes) ? d.partes : Object.values(d.partes || {});
  const corpo = partes.map(p => p.x === undefined ? marcaTxt(p.t) : p.t !== undefined ? `<span class="term-rev">${marcaTxt(p.t)}</span>` : `<span class="term-tj">${'█'.repeat(Math.min(40, Math.max(3, int(p.n))))}</span>`).join('');
  return `${d.cab ? `<span class="term-dim">${esc(d.cab)}</span>\n` : ''}<b class="term-tit">${marcaTxt(d.tit || 'DOCUMENTO')}</b>\n${d.data ? `<span class="term-dim">Data: ${esc(d.data)}</span>\n` : ''}${corpo}`;
}
function termHtmlLinha(l) {
  if (l.k === 'banner') {
    const dirs = termDirs();
    return `<span class="term-forte">ORFEU - DEPARTAMENTO DE ORGANIZAÇÃO, REAJUSTE E FORÇA EXPERIMENTAL UNIFICADA</span>\nSTATUS: OPERACIONAL\n${barraT()}\nCOMANDOS DISPONÍVEIS:\nls                  - listar diretórios\n${dirs.map(d => `${('open ' + d).padEnd(20)}- acessar ${d.toUpperCase()}`).join('\n')}${dirs.length ? '\n' : ''}acesso CÓDIGO       - autorização para arquivos restritos\nclear               - limpar terminal\n\nDIRETÓRIOS DISPONÍVEIS:\n${dirs.length ? dirs.map(d => `<button class="term-link" data-arq="term-cmd" data-v="open ${esc(d)}">[ ${esc(d.toUpperCase())} ]</button>`).join('\n') : '<span class="term-dim">(nenhum diretório liberado)</span>'}\n${barraT()}`;
  }
  if (l.k === 'cmd') return `<span class="term-cmd">${esc(l.p || 'ORFEU>')} ${esc(l.t)}</span>`;
  if (l.k === 'dir') {
    const docs = termDocsDe(l.d), ab = cofresAbertos();
    if (!docs.length) return '<span class="term-erro">DIRETÓRIO VAZIO OU INDISPONÍVEL.</span>';
    const abertos = docs.filter(([, d]) => !d.tranca).sort((a, b) => dataOrd(a[1].data, a[1].ts) - dataOrd(b[1].data, b[1].ts) || num(a[1].ts) - num(b[1].ts));
    const trancas = [...new Set(docs.filter(([, d]) => d.tranca && !ab[d.tranca]).map(([, d]) => d.tranca))];
    abertos.forEach(([id, d]) => marcarLido('docs', id, revDoc(d)));
    return `<span class="term-forte">ORFEU :: ${esc(l.d.toUpperCase())}</span>\nACESSO RESTRITO\nDOCUMENTOS CLASSIFICADOS\n${barraT()}\n${abertos.map(([id, d]) => termTextoDoc(id, d)).join(`\n${barraT()}\n`)}${abertos.length ? `\n${barraT()}` : ''}${trancas.map(() => `\n<button class="term-link term-tranca" data-arq="term-tranca" title="Autorização necessária">▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓</button>`).join('')}`;
  }
  if (l.k === 'erro') return `<span class="term-erro">${esc(l.t)}</span>`;
  if (l.k === 'ok') return `<span class="term-ok">${esc(l.t)}</span>`;
  return esc(l.t || '');
}
function desenharTerminal(forcar) {
  const el = $('#arqLeitor'); if (!el || !Arq.aberto || Arq.aba !== 'terminal') return;
  termCarregar();
  if (el.dataset.item !== 'terminal' || forcar) {
    if (el.dataset.item !== 'terminal') {
      el.innerHTML = `<div class="term-crt"><div class="term-tela" id="termTela"><pre class="term-saida" id="termSaida"></pre>
        <label class="term-linha"><span id="termPrompt">ORFEU&gt;</span><input id="termIn" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Comando do terminal"></label></div></div>`;
      el.dataset.item = 'terminal'; el.dataset.html = '';
    }
  }
  const html = TERM.linhas.map(termHtmlLinha).join('\n');
  const saida = $('#termSaida');
  if (saida && saida.dataset.html !== html) { saida.innerHTML = html; saida.dataset.html = html; const t = $('#termTela'); if (t) t.scrollTop = t.scrollHeight; }
  const i = $('#termIn'), p = $('#termPrompt');
  if (i) { i.type = TERM.espera ? 'password' : 'text'; p.textContent = TERM.espera ? 'AUTORIZAÇÃO NECESSÁRIA:' : 'ORFEU>'; }
  if (forcar && i && !estreito()) setTimeout(() => i.focus(), 30);
}
function termPedirCodigo() { TERM.espera = true; termOut({ k: 't', t: 'AUTORIZAÇÃO NECESSÁRIA.' }); const i = $('#termIn'); if (i) { i.value = ''; i.focus(); } }
async function termCodigo(cod) {
  const r = await tentarCodigo(cod).catch(() => null);
  if (!r) { termOut({ k: 'erro', t: 'ACESSO NEGADO.' }); if (somOk()) A.Som.tom(110, 0, 0.35, 'sawtooth', 0.07); return; }
  const dirs = [...new Set(Object.values(r.docs).map(d => String(d.term || '').toLowerCase()).filter(Boolean))];
  termOut({ k: 'ok', t: 'CLASSIFICAÇÃO: ULTRA-RESTRITA' }, { k: 'ok', t: 'AUTORIZAÇÃO: CONFIRMADA' });
  if (dirs.length) dirs.forEach(d => termOut({ k: 'dir', d }));
  else termOut({ k: 't', t: 'Arquivos liberados no Arquivo (aba Documentos).' });
}
function termRodar(bruto) {
  termCarregar();
  const txt = String(bruto || '');
  if (TERM.espera) {
    TERM.espera = false;
    TERM.linhas.push({ k: 'cmd', p: 'AUTORIZAÇÃO NECESSÁRIA:', t: '*'.repeat(Math.min(12, txt.length)) });
    termSalvar(); desenharTerminal();
    termCodigo(txt); return;
  }
  const cmd = txt.toLowerCase().replace(/"/g, '').replace(/\s+/g, ' ').trim();
  TERM.linhas.push({ k: 'cmd', t: txt });
  if (txt.trim()) { TERM.hist.push(txt); TERM.hi = TERM.hist.length; }
  if (!cmd) { termSalvar(); desenharTerminal(); return; }
  if (cmd === 'help' || cmd === 'ajuda') { termOut({ k: 'banner' }); return; }
  if (cmd === 'clear' || cmd === 'limpar' || cmd === 'cls') { TERM.linhas = [{ k: 'banner' }]; termSalvar(); desenharTerminal(); return; }
  if (cmd === 'ls' || cmd === 'dir') { const d = termDirs(); termOut(...(d.length ? d.map(x => x.toUpperCase() + '/') : ['(nenhum diretório liberado)'])); return; }
  const m = /^(open|abrir|cd|cat)\s+(.+)$/.exec(cmd);
  if (m) { const alvo = normal(m[2]).toLowerCase().replace(/\/$/, '').replace(/\s+/g, '-'); const d = termDirs().find(x => normal(x).toLowerCase() === alvo);
    if (d) termOut({ k: 'dir', d }); else termOut({ k: 'erro', t: 'DESTINO NÃO ENCONTRADO.' }); return; }
  const c = /^(acesso|senha|autorizar|login)(?:\s+(.+))?$/.exec(cmd);
  if (c) { if (c[2]) { TERM.linhas[TERM.linhas.length - 1] = { k: 'cmd', t: txt.split(/\s+/)[0] + ' ' + '*'.repeat(Math.min(12, c[2].length)) }; termSalvar(); desenharTerminal(); termCodigo(txt.trim().split(/\s+/).slice(1).join(' ')); } else termPedirCodigo(); return; }
  termOut({ k: 'erro', t: "COMANDO NÃO RECONHECIDO. DIGITE 'help'." });
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
  ligar(c) { $$('[data-arq-sala]', c).forEach(b => b.onclick = () => { if (b.dataset.id) { Arq.sel.docs = b.dataset.id; } abrir(b.dataset.arqSala === 'doc' ? 'docs' : 'cifras'); if (b.dataset.id) { Arq.mob = 'leitor'; desenharLeitor(true); } }); },
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
  const novos = ['docs', 'cifras', 'visoes'].reduce((t, k) => t + entradas(k).filter(e => e.marca).length, 0);
  const n = $('.n', b); n.hidden = !novos; n.textContent = novos;
}
function desenharMesaArq() {
  const c = $('#mesaArq'); if (!c || !A.mestre) return;
  const nc = Object.keys(sg()._cifras || {}).length, nd = Object.keys(sg()._docs || {}).length;
  const html = `<p class="mini">Cifras em sigilos, documentos tarjados e visões para um jogador só. ${nc} cifra${nc === 1 ? '' : 's'} e ${nd} documento${nd === 1 ? '' : 's'} criados.</p>
    <div class="mesa-linha"><button data-arqm="docs" class="btn-protocolo">📜 Abrir o Arquivo</button><button data-arqm="visoes-m" data-novo="1">👁 Mandar visão</button></div>`;
  if (c.dataset.html !== html) { c.innerHTML = html; c.dataset.html = html; $$('[data-arqm]', c).forEach(b => b.onclick = () => abrir(b.dataset.arqm, !!b.dataset.novo)); }
}
let agendado = false, ultimoRev = '', ultimoPal = '';
function redesenhar() {
  if (agendado) return; agendado = true;
  requestAnimationFrame(() => {
    agendado = false;
    try {
      ligarPalpites(); ligarVisoes(); ligarCofres();
      atualizarBadge(); desenharMesaArq(); marcarSalas();
      if (Arq.aberto) { if (!ABAS().some(x => x[0] === Arq.aba)) { Arq.aba = 'docs'; desenharTudo(); } else { atualizarAbas(); desenharLista(); } }
      // cifras no chat e no cartão da sala acompanham revelações e palpites
      const r = JSON.stringify(est().cifraRev || {}) + JSON.stringify(est().cifras || {}) + JSON.stringify(est().docs || {}), p = JSON.stringify(palpites);
      if (r !== ultimoRev || p !== ultimoPal) { ultimoRev = r; ultimoPal = p; A.redesenharChat(); if (!A.mestre) A.redesenharCartao(); }
    } catch (e) { console.warn('arquivo:', e); }
  });
}
A.aoMudar(redesenhar);
document.addEventListener('acf-tudo', redesenhar);
document.addEventListener('acf-perfil', () => { setTimeout(redesenhar, 60); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !Arq.aberto || ($('#cfPalpite') && !$('#cfPalpite').hidden)) return;
  if ($('#arqModal') && !$('#arqModal').hidden) fecharForm(); else fechar();
});
const btn = $('#btnArquivo'); if (btn) btn.addEventListener('click', () => abrir());
setInterval(marcarSalas, 1500);
setTimeout(redesenhar, 800);
window.ACF_ARQUIVO = { abrir, fechar, glifoSVG, GLIFOS, mostrarVisao, tentarCodigo, sincCofres };
})();
