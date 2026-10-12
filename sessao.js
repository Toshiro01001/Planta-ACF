/* =========================================================
   sessao.js · Abertura e encerramento da sessão, dilema com votação,
   medidor de tensão e holofote. Tudo comandado pelo Mestre (bloco "Sessão" na aba Mesa).
   Estado público em mapa/abertura, mapa/encerramento, mapa/dilema, mapa/tensao e mapa/holofote.
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
const nomeDe = id => (A.SER[id] || {}).nome || id || '';
const ss = { get(k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
const ls = { get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const MESA = () => window.ACF_MESA || {};
const somOk = () => !A.mudo;
const sem = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ---------- Sigilo do Eco, redesenhado a partir da capa da sessão ---------- */
const P_ESPIRAL = 'M206 63 c3 -1 4 -5 1 -7 c-5 -3 -11 1 -11 7 c0 8 9 13 17 10 c10 -4 12 -17 4 -25 c-9 -9 -26 -7 -32 5 c-7 13 0 30 14 35 c4 1 7 2 7 2';
const P_HASTE = 'M206 90 C 204 180 208 300 205 470';
const P_RISCOS = ['M152 222 L 262 190', 'M150 268 L 262 236', 'M152 314 L 262 282'];
const P_ARCO = 'M182 178 C 112 236 104 368 182 414 C 262 460 352 394 340 286 C 332 208 292 150 238 118';
const GOTAS = [[176, 215, 26], [214, 205, 40], [246, 196, 22], [168, 262, 34], [232, 250, 46], [180, 308, 30], [244, 296, 38], [205, 470, 30], [128, 340, 26], [338, 330, 34], [300, 420, 24], [222, 432, 30]];
function htmlSigilo(cls = '') {
  const caminhos = [P_ESPIRAL, P_HASTE, ...P_RISCOS, P_ARCO];
  const traco = (larg, extra = '') => caminhos.map((d, i) => `<path d="${d}" pathLength="1" style="--i:${[0, 1, 2, 2.4, 2.8, 3.4][i]}" stroke-width="${i === 5 ? larg * 1.15 : larg}" ${extra}/>`).join('');
  return `<svg class="eco-sig ${cls}" viewBox="60 20 300 500" xmlns="http://www.w3.org/2000/svg" aria-label="Sigilo do Eco">
    <defs>
      <radialGradient id="ecoLua"><stop offset="0" stop-color="#9b9640" stop-opacity=".55"/><stop offset=".72" stop-color="#55531f" stop-opacity=".45"/><stop offset="1" stop-color="#2a2910" stop-opacity="0"/></radialGradient>
      <filter id="ecoTinta" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter>
      <filter id="ecoBrilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
    </defs>
    <circle class="eco-lua" cx="206" cy="255" r="80" fill="url(#ecoLua)"/>
    <g class="eco-roxo" filter="url(#ecoBrilho)" stroke="#8a2fc4" fill="none" stroke-linecap="round">${traco(24)}</g>
    <g class="eco-traco" filter="url(#ecoTinta)" stroke="#ece64a" fill="none" stroke-linecap="round" stroke-linejoin="round">${traco(10)}</g>
    <g class="eco-gotas" fill="#ece64a" filter="url(#ecoTinta)">${GOTAS.map(([x, y, h], i) => `<g style="--g:${i}"><rect x="${x - 2.5}" y="${y}" width="5" height="${h}" rx="2.5"/><circle cx="${x}" cy="${y + h}" r="4"/></g>`).join('')}</g>
  </svg>`;
}

/* ---------- Créditos ---------- */
const AUX_PADRAO = [['Matheus Arizawa', 'Modelo 5013550738', 'b00bies'], ['Raphael Szczypior', 'Modelo M3RL1N', 'm3rl1n'], ['Alice Pinheiro', 'Modelo C2P0', 'c2p0']];
const MESTRE_PADRAO = 'Rodrigo Junior';
const ANIMS = ['fosforo', 'glitch', 'estatica', 'pulso'];
function creditos(ab) {
  const jog = cobaias().map((x, i) => ({ t: 'jog', id: x.id, nome: x.nome, cod: x.codigo || '', por: x.jogador || '', img: x.img || '', cor: x.cor || '#ece64a', anim: ANIMS[i % ANIMS.length] }));
  const linhasAux = String(ab.aux || '').split('\n').map(l => l.split('|').map(s => s.trim())).filter(l => l[0]);
  const aux = (linhasAux.length ? linhasAux : AUX_PADRAO).map(([por, modelo, robo]) => { const s = A.SER[robo] || {}; return { t: 'aux', id: robo || '', nome: modelo || s.nome || '', por, img: s.img || '', cor: s.cor || '#9fb3c8' }; });
  return [...jog, ...aux, { t: 'mestre', nome: 'Mestre', por: ab.mestre || MESTRE_PADRAO }];
}
function htmlCartao(c) {
  if (c.t === 'mestre') return `<div class="ab-cartao ab-mestre">${htmlSigilo('mini')}<div class="ab-txt"><small>O MESTRE</small><b>${esc(c.por)}</b></div></div>`;
  if (c.t === 'aux') return `<div class="ab-cartao ab-aux" style="--cor:${c.cor}"><div class="ab-foto boot"${c.img ? ` style="background-image:url('${c.img}')"` : ''}><i class="ab-scan"></i></div>
    <div class="ab-txt"><small class="ab-term">S.T.A.F.F. · ${esc(c.nome)} · ONLINE<span class="ab-cur">_</span></small><b>${esc(c.nome)}</b><span>mestre auxiliar · ${esc(c.por)}</span></div></div>`;
  return `<div class="ab-cartao ab-${c.anim}" style="--cor:${c.cor}"><div class="ab-foto"${c.img ? ` style="background-image:url('${c.img}')"` : ''}>${c.anim === 'fosforo' ? '<i class="ab-chama"></i>' : ''}${c.anim === 'estatica' ? '<i class="ab-ruido"></i>' : ''}</div>
    <div class="ab-txt"><small>${esc(c.cod)}</small><b>${esc(c.nome)}</b><span>interpretado por ${esc(c.por)}</span></div></div>`;
}

/* ---------- Música (site, som próprio ou YouTube) ---------- */
const ytId = u => { const m = /(?:v=|youtu\.be\/|embed\/)([\w-]{11})/.exec(String(u || '')); return m ? m[1] : (/^[\w-]{11}$/.test(String(u || '')) ? u : ''); };
const MUS = { au: null, yt: null, t: null };
function pararMusica(suave = true) {
  clearInterval(MUS.t);
  const au = MUS.au; MUS.au = null;
  if (au) { if (!suave) { au.pause(); } else { const t = setInterval(() => { au.volume = Math.max(0, au.volume - 0.06); if (au.volume <= 0.01) { clearInterval(t); au.pause(); } }, 120); } }
  if (MUS.yt) { MUS.yt.remove(); MUS.yt = null; }
}
async function tocarMusica(som, ini, botao) {
  pararMusica(false);
  if (!som || !somOk()) return;
  if (som.startsWith('yt:')) {
    const id = ytId(som.slice(3)); if (!id) return;
    const f = document.createElement('iframe'); f.className = 'ab-yt'; f.allow = 'autoplay';
    f.src = `https://www.youtube.com/embed/${id}?autoplay=1&controls=0&start=${Math.max(0, int(ini))}&playsinline=1`;
    document.body.appendChild(f); MUS.yt = f; return;
  }
  const src = MESA().urlDoSom ? await MESA().urlDoSom(som) : '';
  if (!src) return;
  const au = new Audio(src); au.volume = 0; MUS.au = au;
  const comecar = () => { try { au.currentTime = Math.max(0, num(ini)); } catch (e) {} au.play().then(() => { if (botao) botao.hidden = true; MUS.t = setInterval(() => { au.volume = Math.min(0.9, au.volume + 0.05); if (au.volume >= 0.9) clearInterval(MUS.t); }, 120); }, () => { if (botao) { botao.hidden = false; botao.onclick = () => { botao.hidden = true; comecar(); }; } }); };
  if (au.readyState >= 1) comecar(); else au.addEventListener('loadedmetadata', comecar, { once: true });
}

/* ---------- Tela cheia: abertura e encerramento ---------- */
const TELA = { id: null, timers: [] };
function fecharTela() { TELA.timers.forEach(clearTimeout); TELA.timers = []; TELA.id = null; pararMusica(true); const o = $('#abTela'); if (o) { o.classList.add('saindo'); setTimeout(() => { o.hidden = true; o.classList.remove('saindo'); o.innerHTML = ''; }, 900); } }
function cena(o, html, cls) { $$('.ab-cena.fora', o).forEach(x => { if (!x._tira) x._tira = setTimeout(() => x.remove(), 1200); }); const d = document.createElement('div'); d.className = 'ab-cena ' + (cls || ''); d.innerHTML = html; o.appendChild(d); requestAnimationFrame(() => d.classList.add('on')); return d; }
// quem entra atrasado vê o símbolo já no ponto certo do desenho
function adiantar(el, seg) { if (!el || !(seg > 0) || !el.getAnimations) return; requestAnimationFrame(() => el.getAnimations({ subtree: true }).forEach(a => { try { a.currentTime = (a.currentTime || 0) + seg * 1000; } catch (e) {} })); }
function agendar(ms, fn) { TELA.timers.push(setTimeout(fn, Math.max(0, ms))); }
function telaBase(id) {
  let o = $('#abTela');
  if (!o) { o = document.createElement('div'); o.id = 'abTela'; o.className = 'ab-tela'; document.body.appendChild(o); }
  TELA.timers.forEach(clearTimeout); TELA.timers = []; TELA.id = id;
  const publico = A.mestre && ['abertura', 'encerramento'].some(k => { const x = est()[k]; return x && x.on && (k === 'abertura' ? 'ab' : 'en') + x.id === id; });
  o.innerHTML = '<button class="ab-som" hidden>▶ Toque para ouvir a música</button><button class="ab-x" aria-label="Fechar" title="Fechar só na sua tela">×</button>' + (publico ? '<button class="ab-parar">■ Parar para todos</button>' : '');
  o.hidden = false;
  $('.ab-x', o).onclick = () => fecharTela();
  if (publico) $('.ab-parar', o).onclick = () => pararParaTodos();
  return o;
}
// sequência de créditos a partir de "t" segundos; devolve quando termina
function agendarCreditos(o, cs, t, por, desde) {
  const fase = (titulo, lista) => { if (!lista.length) return; if (titulo) { const ini = t; agendar((ini - desde) * 1000, () => { $$('.ab-cena', o).forEach(x => x.classList.add('fora')); cena(o, `<p class="ab-k">${titulo}</p>`, 'ab-cab'); }); t += 1.6; }
    lista.forEach(c => { const tc = t; agendar((tc - desde) * 1000, () => { $$('.ab-cena', o).forEach(x => x.classList.add('fora')); cena(o, `<p class="ab-k">${titulo}</p>${htmlCartao(c)}`, 'ab-cred'); }); t += por; }); };
  fase('AS COBAIAS', cs.filter(c => c.t === 'jog'));
  fase('MESTRES AUXILIARES', cs.filter(c => c.t === 'aux'));
  fase('', cs.filter(c => c.t === 'mestre'));
  return t;
}
// duração real de cada tela (o tempo pedido é esticado se os créditos não couberem)
function planoAbertura(ab) {
  const dur = Math.max(25, Math.min(300, num(ab.dur) || 70));
  const cs = ab.creditos === false ? [] : creditos(ab);
  const T = { sig: 7, tit: 8, ant: ab.ant ? Math.min(14, 5 + String(ab.ant).length / 40) : 0, fim: 3 };
  const fixo = T.sig + T.tit + T.ant + T.fim + (cs.length ? 1.6 * 2 : 0);
  const por = cs.length ? Math.max(2.2, Math.min(5, (dur - fixo) / cs.length)) : 0;
  return { dur, cs, T, por, total: fixo + por * cs.length };
}
function planoEncerramento(en) {
  const dur = Math.max(25, Math.min(300, num(en.dur) || 60));
  const cs = en.creditos ? creditos(en) : [];
  const dest = (en.dest || []).filter(d => d && d.q), cards = (en.cards || []).filter(c => c && c.linhas && c.linhas.length);
  const resto = dur - 7 - 4 - (cs.length ? cs.length * 2.4 + 3.2 : 0);
  const porD = dest.length ? Math.max(2.4, Math.min(4.5, resto * 0.45 / dest.length)) : 0;
  const tCards = cards.length ? Math.max(6, resto * 0.55) : 0;
  return { dur, cs, dest, cards, porD, tCards, total: 7 + porD * dest.length + tCards + (cs.length ? cs.length * 2.4 + 3.2 : 0) + 5 };
}
function mostrarAbertura(ab, desde = 0) {
  const o = telaBase('ab' + ab.id);
  const { cs, T, por } = planoAbertura(ab);
  tocarMusica(ab.som, num(ab.ini) + desde, $('.ab-som', o));
  // 1. sigilo e título (como na capa)
  agendar(0 - desde * 1000, () => {
    if (desde < T.sig + T.tit) adiantar(cena(o, `<div class="ab-capa">${htmlSigilo('anima')}
      <div class="ab-titulos"><h1>${esc(ab.tit || 'A Caixa de Fósforos')}</h1><i class="ab-linha"></i><p class="ab-sessao">${ab.num ? `SESSÃO ${esc(ab.num)}` : ''}${ab.num && ab.nome ? ' · ' : ''}${esc(String(ab.nome || '').toUpperCase())}</p>${ab.frase ? `<p class="ab-frase">${esc(ab.frase)}</p>` : ''}</div></div>`, 'ab-cena-capa'), desde);
  });
  let t = T.sig + T.tit;
  // 2. anteriormente
  if (T.ant) { const ta = t; agendar((ta - desde) * 1000, () => { $$('.ab-cena', o).forEach(x => x.classList.add('fora')); const c = cena(o, `<div class="ab-ant"><p class="ab-k">ANTERIORMENTE…</p><p class="ab-ant-txt"></p></div>`, 'ab-cena-ant'); digitar($('.ab-ant-txt', c), String(ab.ant), (T.ant - 2) * 1000); }); t += T.ant; }
  // 3. créditos
  t = agendarCreditos(o, cs, t, por, desde);
  // 4. fim
  agendar((t - desde) * 1000, () => { $$('.ab-cena', o).forEach(x => x.classList.add('fora')); cena(o, `<div class="ab-fim">${htmlSigilo('mini')}<p class="ab-sessao">${ab.num ? `SESSÃO ${esc(ab.num)}` : ''}</p></div>`, 'ab-cena-fim'); pararMusica(true); });
  agendar((t + T.fim - desde) * 1000, fecharTela);
}
function digitar(el, txt, ms) { if (!el) return; const passo = Math.max(12, ms / Math.max(1, txt.length)); let i = 0; const f = () => { el.textContent = txt.slice(0, ++i); if (i < txt.length) TELA.timers.push(setTimeout(f, passo)); }; f(); }
function mostrarEncerramento(en, desde = 0) {
  const o = telaBase('en' + en.id);
  const { cs, dest, cards, porD, tCards } = planoEncerramento(en);
  tocarMusica(en.som, num(en.ini) + desde, $('.ab-som', o));
  agendar(-desde * 1000, () => adiantar(cena(o, `<div class="ab-capa">${htmlSigilo('anima')}<div class="ab-titulos"><p class="ab-k">FIM DA SESSÃO</p><h1>${esc(en.tit || 'A Caixa de Fósforos')}</h1><i class="ab-linha"></i><p class="ab-sessao">${en.num ? `SESSÃO ${esc(en.num)}` : ''}${en.num && en.nome ? ' · ' : ''}${esc(String(en.nome || '').toUpperCase())}</p></div></div>`, 'ab-cena-capa'), desde));
  let t = 7;
  dest.forEach(d => { const td = t; const s = A.SER[d.q] || {}; agendar((td - desde) * 1000, () => { $$('.ab-cena', o).forEach(x => x.classList.add('fora')); cena(o, `<p class="ab-k">DESTAQUES</p><div class="ab-cartao ab-pulso" style="--cor:${s.cor || '#ece64a'}"><div class="ab-foto"${s.img ? ` style="background-image:url('${s.img}')"` : ''}></div><div class="ab-txt"><small>${esc(d.t)}</small><b>${esc(s.nome || d.q)}</b><span>${esc(d.v)}</span></div></div>`, 'ab-cred'); }); t += porD; });
  if (cards.length) { const tc = t; agendar((tc - desde) * 1000, () => { $$('.ab-cena', o).forEach(x => x.classList.add('fora')); cena(o, `<p class="ab-k">RELATÓRIO DAS COBAIAS</p><div class="ab-grade">${cards.map(c => { const s = A.SER[c.q] || {}; return `<div class="ab-mini" style="--cor:${s.cor || '#ece64a'}"><i${s.img ? ` style="background-image:url('${s.img}')"` : ''}></i><b>${esc(s.nome || c.q)}</b>${c.linhas.map(l => `<span>${esc(l)}</span>`).join('')}</div>`; }).join('')}</div>`, 'ab-cena-grade'); }); t += tCards; }
  t = agendarCreditos(o, cs, t, 2.4, desde);
  agendar((t - desde) * 1000, () => { $$('.ab-cena', o).forEach(x => x.classList.add('fora')); cena(o, `<div class="ab-fim">${htmlSigilo('mini')}<p class="ab-frase">${esc(en.frase || 'Continua…')}</p></div>`, 'ab-cena-fim'); });
  agendar((t + 4 - desde) * 1000, () => pararMusica(true));
  agendar((t + 5 - desde) * 1000, fecharTela);
}
// todos: abre quando o Mestre manda (quem chega atrasado entra no ponto certo)
function verTelas() {
  const ver = (k, fn) => {
    const x = est()[k];
    if (!x || !x.id) return;
    const chave = (k === 'abertura' ? 'ab' : 'en') + x.id;
    if (!x.on) { if (TELA.id === chave) fecharTela(); return; }
    if (TELA.id === chave) return;
    const desde = (Date.now() - num(x.ts)) / 1000, dur = (k === 'abertura' ? planoAbertura(x) : planoEncerramento(x)).total;
    if (desde > dur - 2 || ss.get('acf-tela-vista') === chave) return;
    ss.set('acf-tela-vista', chave);
    fn(x, Math.max(0, desde));
  };
  ver('abertura', mostrarAbertura); ver('encerramento', mostrarEncerramento);
}

/* ---------- Dilema com votação ---------- */
const DIL = { off: null, de: '', v: {}, mostrado: '' };
function ouvirVotos(id) {
  if (DIL.de === id) return;
  if (DIL.off) DIL.off();
  DIL.de = id; DIL.v = {};
  DIL.off = A.Rede.on('mesaResp/' + id, v => { DIL.v = v || {}; desenharBloco(true); pintarDilemaJog(); }, () => {});
}
function verDilema() {
  const d = est().dilema;
  if (!d || !d.id) { const o = $('#dilTela'); if (o) o.hidden = true; return; }
  if (A.mestre || A.aux || A.meu) ouvirVotos(d.id);
  // resultado: aparece para todos por alguns segundos
  if (d.res && DIL.mostrado !== d.id + ':res' && Date.now() - num(d.resTs) < 15000) {
    DIL.mostrado = d.id + ':res';
    const tot = d.res.reduce((s, n) => s + int(n), 0) || 1, max = Math.max(...d.res.map(int));
    const o = telaDilema();
    o.innerHTML = `<div class="dil-caixa"><p class="ab-k">O GRUPO DECIDIU</p><h3>${esc(d.q)}</h3>${d.ops.map((op, i) => `<div class="dil-res${int(d.res[i]) === max && max ? ' venceu' : ''}"><span>${esc(op)}</span><i style="width:${Math.round(int(d.res[i]) / tot * 100)}%"></i><b>${int(d.res[i])}</b></div>`).join('')}<div class="dil-botoes"><button data-dil="fechar">Fechar</button></div></div>`;
    o.hidden = false; o.dataset.k = '';
    setTimeout(() => { if (DIL.mostrado === d.id + ':res') o.hidden = true; }, 12000);
    return;
  }
  if (!d.on || A.mestre || A.aux || !A.meu) return;
  const o = telaDilema();
  if (o.dataset.id !== d.id) { o.dataset.id = d.id; o.hidden = false; pintarDilemaJog(); }
}
function telaDilema() {
  let o = $('#dilTela');
  if (!o) {
    o = document.createElement('div'); o.id = 'dilTela'; o.className = 'dil-tela'; document.body.appendChild(o);
    o.addEventListener('click', e => {
      const b = e.target.closest('[data-dil]'); if (!b) return;
      if (b.dataset.dil === 'fechar') { o.hidden = true; return; }
      const d = est().dilema; if (!d || !d.on || Date.now() > num(d.fim)) return;
      A.Rede.set(`mesaResp/${d.id}/${A.meu}`, { v: int(b.dataset.dil), ts: Date.now() }).catch(() => {});
      ls.set('acf-dil-' + d.id + '-' + A.meu, int(b.dataset.dil)); pintarDilemaJog();
    });
  }
  return o;
}
function pintarDilemaJog() {
  const o = $('#dilTela'), d = est().dilema;
  if (!o || o.hidden || !d || !d.on || A.mestre || A.aux) return;
  const meu = ls.get('acf-dil-' + d.id + '-' + A.meu, null), resta = Math.max(0, Math.ceil((num(d.fim) - Date.now()) / 1000));
  // a cada segundo só o relógio muda (redesenhar tudo faria o clique escapar)
  const k = JSON.stringify([d.id, meu, !resta]);
  if (o.dataset.k === k) { const tp = $('.dil-tempo', o); if (tp) tp.textContent = resta ? `${resta}s` : 'tempo esgotado'; return; }
  o.dataset.k = k;
  o.innerHTML = `<div class="dil-caixa"><p class="ab-k">DILEMA · <span class="dil-tempo">${resta ? `${resta}s` : 'tempo esgotado'}</span></p><h3>${esc(d.q)}</h3>
    <div class="dil-ops">${d.ops.map((op, i) => `<button data-dil="${i}" class="${meu === i ? 'on' : ''}" ${resta ? '' : 'disabled'}>${esc(op)}</button>`).join('')}</div>
    <p class="mini">${d.sec ? 'Voto secreto: ninguém vê o seu.' : ''} Você pode mudar o voto até o tempo acabar.</p><div class="dil-botoes"><button data-dil="fechar">Minimizar</button></div></div>`;
}
setInterval(() => { const d = est().dilema; if (d && d.on) { pintarDilemaJog(); if (A.mestre) { desenharBloco(true); if (Date.now() > num(d.fim) + 1500 && !d.res) revelarDilema(); } } }, 1000);
function revelarDilema() {
  const d = est().dilema; if (!d || !A.mestre) return;
  const res = d.ops.map((_, i) => Object.values(DIL.v || {}).filter(x => x && int(x.v) === i).length);
  A.definir(['dilema'], { ...d, on: false, res, resTs: Date.now() });
}

/* ---------- Tensão ---------- */
const TEN = { chamado: undefined };
const tensao = () => Math.max(0, Math.min(100, int(est().tensao)));
function mudarTensao(n) { if (!A.mestre) return; A.definir(['tensao'], Math.max(0, Math.min(100, tensao() + n))); }
function pintarTensao() {
  let v = $('#tensaoVeu');
  if (!v) { v = document.createElement('div'); v.id = 'tensaoVeu'; v.className = 'tensao-veu'; document.body.appendChild(v); }
  const t = tensao();
  v.style.setProperty('--t', (t / 100).toFixed(2));
  v.style.setProperty('--pulso', (t >= 80 ? 0.8 : t >= 60 ? 1.4 : t >= 30 ? 2.6 : 4) + 's');
  v.hidden = t <= 0;
  // automático: Presença Perturbadora chamada sobe a tensão
  if (A.mestre) { const ch = est().chamado; const id = ch && ch.t === 'presenca' ? ch.id : null; if (TEN.chamado === undefined) TEN.chamado = id; else if (id && id !== TEN.chamado) { TEN.chamado = id; mudarTensao(10); } }
}

/* ---------- Holofote ---------- */
const HOL = { ts: undefined };
function verHolofote() {
  const h = est().holofote;
  if (!h || !h.ts) return;
  if (HOL.ts === undefined) { HOL.ts = h.ts; if (Date.now() - num(h.ts) > 20000) return; }
  else if (HOL.ts === h.ts) return;
  HOL.ts = h.ts;
  if (Date.now() - num(h.ts) > 20000) return;
  const foi = h.q ? A.focarToken && A.focarToken(h.q) : h.cn ? A.focarSala && A.focarSala(int(h.cn)) : false;
  let b = $('#holBanner');
  if (!b) { b = document.createElement('div'); b.id = 'holBanner'; b.className = 'hol-banner'; document.body.appendChild(b); }
  b.innerHTML = `<span>🔦</span><b>${esc(h.txt || (h.q ? nomeDe(h.q) : h.cn ? (A.nomeSala ? A.nomeSala(int(h.cn)) : 'CN ' + h.cn) : ''))}</b>${foi ? '' : ''}`;
  b.hidden = false; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  clearTimeout(HOL.t); HOL.t = setTimeout(() => { b.hidden = true; }, 6500);
}
function holofote(alvo, txt) { if (!A.mestre) return; A.definir(['holofote'], { ...alvo, txt: String(txt || '').slice(0, 120), ts: Date.now() }); }

function pararParaTodos() { if (!A.mestre) return; ['abertura', 'encerramento'].forEach(k => { const x = est()[k]; if (x && x.on) A.definir([k], { ...x, on: false }); }); fecharTela(); }
/* ---------- Bloco do Mestre (aba Mesa → Sessão) ---------- */
const CFG_PADRAO = { tit: 'A Caixa de Fósforos', num: '3', nome: 'Katábasis', frase: 'Não olhe para trás.', som: '@deadwaltz', yt: '', ini: 0, dur: 75, ant: '', aux: AUX_PADRAO.map(l => l.join(' | ')).join('\n'), mestre: MESTRE_PADRAO, creditos: true };
const cfg = () => ({ ...CFG_PADRAO, ...ls.get('acf-sessao-cfg', {}) });
function opcoesSom(atual) {
  const L = MESA().sonsLista ? MESA().sonsLista() : { fixos: {}, proprios: {} };
  const ops = Object.entries(L.fixos).map(([k, s]) => [k, '🎻 ' + s.n]).concat(Object.entries(L.proprios || {}).filter(([, s]) => s).map(([k, s]) => [k, '🎵 ' + s.n])).concat([['yt', '▶ YouTube (link abaixo)'], ['', 'Sem música']]);
  return ops.map(([v, n]) => `<option value="${esc(v)}" ${atual === v ? 'selected' : ''}>${esc(n)}</option>`).join('');
}
function desenharBloco(leve) {
  const c = $('#mesaSessao'); if (!c || !A.mestre) return;
  if (MESA().ligarSons) MESA().ligarSons();
  const a = document.activeElement; if (a && c.contains(a) && a.matches('input:not([type=checkbox]):not([type=range]), select, textarea')) { if (!leve) return; }
  const d = est().dilema || {}, t = tensao();
  const votos = d.id ? Object.values(DIL.v || {}).filter(Boolean) : [];
  const dilHtml = d.on ? `<p class="mini">“${esc(d.q)}” · ${Math.max(0, Math.ceil((num(d.fim) - Date.now()) / 1000))}s · ${votos.length} voto${votos.length === 1 ? '' : 's'}</p>
      <ul class="dil-lista">${d.ops.map((op, i) => `<li>${esc(op)} <b>${votos.filter(x => int(x.v) === i).length}</b>${d.sec ? '' : ` <small>${Object.entries(DIL.v || {}).filter(([, x]) => x && int(x.v) === i).map(([q]) => esc(nomeDe(q))).join(', ')}</small>`}</li>`).join('')}</ul>
      <button data-ses="dil-fim">Revelar agora</button>`
    : `<label class="mesa-campo">Pergunta <input id="sesDilQ" maxlength="140" placeholder="Ex.: Abrir a porta vermelha?"></label>
      <label class="mesa-campo">Opções (uma por linha, de 2 a 4) <textarea id="sesDilOps" rows="3" placeholder="Abrir&#10;Deixar fechada"></textarea></label>
      <div class="mesa-linha"><label class="mesa-campo-in">Tempo <input id="sesDilT" type="number" min="10" max="300" value="45"> s</label><label class="chave"><input type="checkbox" id="sesDilSec" checked><span>Voto secreto</span></label><button data-ses="dil-ini" class="btn-protocolo">Lançar dilema</button></div>`;
  const chave = JSON.stringify([d.on, d.id, votos.length, t, !!(est().abertura && est().abertura.on), !!(est().encerramento && est().encerramento.on), Object.keys((MESA().sonsLista ? MESA().sonsLista().proprios : {}) || {}).length]);
  if (leve && c.dataset.k === chave) return;
  if (leve && c.dataset.k && a && c.contains(a) && a.matches('input, select, textarea')) { const dl = $('#sesDil', c); if (dl) dl.innerHTML = dilHtml; c.dataset.k = chave; return; }
  c.dataset.k = chave;
  c.innerHTML = `<div class="mesa-linha"><button data-ses="abertura" class="btn-protocolo">🎬 Abertura</button><button data-ses="encerramento">🎬 Encerramento</button>${est().abertura && est().abertura.on || est().encerramento && est().encerramento.on ? '<button data-ses="parar" class="perigo">■ Parar a tela</button>' : ''}</div>
    <p class="mesa-k">TENSÃO DO GRUPO · ${t}%</p>
    <div class="mesa-linha"><button data-ses="ten" data-v="-10">−10</button><input type="range" id="sesTen" min="0" max="100" step="5" value="${t}"><button data-ses="ten" data-v="10">+10</button><button data-ses="ten" data-v="-100">Zerar</button></div>
    <p class="mini">Escurece as bordas da tela de todos e pulsa mais rápido conforme sobe. Sobe sozinha +10 a cada Presença Perturbadora e +2 a cada falha numa Sala de Exposição.</p>
    <p class="mesa-k">HOLOFOTE</p>
    <div class="mesa-linha"><select id="sesHolAlvo">${cobaias().map(x => `<option value="q:${x.id}">${esc(x.nome)}</option>`).join('')}${Array.from({ length: 25 }, (_, i) => (A.andarAtual - 1) * 25 + i + 1).map(cn => `<option value="cn:${cn}">${esc(A.nomeSala ? A.nomeSala(cn) : 'CN ' + cn)}</option>`).join('')}</select></div>
    <div class="mesa-linha"><input id="sesHolTxt" maxlength="120" placeholder="Legenda (opcional)"><button data-ses="hol">🔦 Levar todos até lá</button></div>
    <p class="mesa-k">DILEMA</p><div id="sesDil">${dilHtml}</div>`;
  const r = $('#sesTen', c); if (r) r.onchange = () => A.definir(['tensao'], int(r.value));
}
function abrirForm(tipo) {
  const k = cfg();
  let o = $('#sesModal');
  if (!o) { o = document.createElement('div'); o.id = 'sesModal'; o.className = 'rr-modal ses-modal'; document.body.appendChild(o); o.addEventListener('click', e => { if (e.target === o || e.target.closest('[data-sm="cancelar"]')) o.hidden = true; }); }
  const ab = tipo === 'abertura';
  o.innerHTML = `<div class="rr-modal-caixa"><h3>${ab ? 'Abertura da sessão' : 'Encerramento da sessão'}</h3>
    <div class="ses-grade"><label>Título <input data-c="tit" value="${esc(k.tit)}"></label><label>Nº da sessão <input data-c="num" value="${esc(k.num)}"></label>
    <label>Nome da sessão <input data-c="nome" value="${esc(k.nome)}"></label><label>${ab ? 'Frase' : 'Frase final'} <input data-c="${ab ? 'frase' : 'fraseFim'}" value="${esc(ab ? k.frase : (k.fraseFim || 'Continua…'))}"></label>
    <label>Música <select data-c="som">${opcoesSom(k.som)}</select></label><label>Link do YouTube <input data-c="yt" value="${esc(k.yt)}" placeholder="só se escolher YouTube"></label>
    <label>Começar a música no segundo <input data-c="ini" type="number" min="0" value="${int(k.ini)}"></label><label>Tempo na tela (s) <input data-c="dur" type="number" min="25" max="300" value="${int(k.dur) || 75}"></label></div>
    <p class="rr-mini">${ab ? `Com os créditos (${creditos(k).length} nomes), a abertura dura no mínimo uns ${Math.ceil(planoAbertura({ ...k, dur: 25 }).total)} s; se o tempo pedido for menor, ela se estica.` : 'O tempo se estica se houver muitos destaques e créditos.'}</p>
    ${ab ? `<label>Anteriormente… <small>(vazio = pula)</small> <textarea data-c="ant" rows="4">${esc(k.ant)}</textarea></label><button data-sm="puxar" type="button">↻ Puxar do Relatório</button>` : '<p class="rr-mini">Os destaques e o relatório de cada cobaia vêm do Relatório da missão.</p>'}
    <label class="chave"><input type="checkbox" data-c="creditos" ${k.creditos ? 'checked' : ''}><span>Mostrar os créditos</span></label>
    <details><summary>Créditos dos auxiliares e do Mestre</summary><label>Auxiliares (Nome | Modelo | robô) <textarea data-c="aux" rows="3">${esc(k.aux)}</textarea></label><label>Mestre <input data-c="mestre" value="${esc(k.mestre)}"></label></details>
    <div class="rr-botoes"><button data-sm="cancelar">Cancelar</button><button data-sm="previa">👁 Prévia só para mim</button><button data-sm="todos" class="pri">▶ Exibir para todos</button></div></div>`;
  o.hidden = false;
  const ler = () => { const v = {}; $$('[data-c]', o).forEach(i => { v[i.dataset.c] = i.type === 'checkbox' ? i.checked : i.value; }); ls.set('acf-sessao-cfg', { ...cfg(), ...v }); return { ...cfg(), ...v }; };
  o.onclick = async e => {
    const b = e.target.closest('[data-sm]'); if (!b) return;
    if (b.dataset.sm === 'puxar') { const r = MESA().agregarRelatorio ? await MESA().agregarRelatorio() : null; if (!r) return; const p = []; if (r.pistas.length) p.push('As cobaias encontraram: ' + r.pistas.slice(-4).join('; ') + '.'); if (r.pres.length) p.push('Encararam ' + [...new Set(r.pres)].slice(0, 3).join(', ') + '.'); Object.entries(r.por).forEach(([q, x]) => { if (x.fim) p.push(`${nomeDe(q)}: ${x.fim}.`); }); $('[data-c="ant"]', o).value = p.join(' ') || 'Nada registrado no Relatório.'; return; }
    if (!['previa', 'todos'].includes(b.dataset.sm)) return;
    const v = ler();
    const som = v.som === 'yt' ? 'yt:' + v.yt : v.som;
    const base = { id: A.Rede.chave(), tit: v.tit, num: v.num, nome: v.nome, som, ini: int(v.ini), dur: int(v.dur) || 75, creditos: !!v.creditos, aux: v.aux, mestre: v.mestre, ts: Date.now(), on: true };
    let x;
    if (ab) x = { ...base, frase: v.frase, ant: String(v.ant || '').trim().slice(0, 600) };
    else x = { ...base, frase: v.fraseFim || 'Continua…', ...(await statsEncerramento()) };
    o.hidden = true;
    if (b.dataset.sm === 'previa') { ab ? mostrarAbertura(x) : mostrarEncerramento(x); return; }
    A.definir([ab ? 'abertura' : 'encerramento'], x);
  };
}
async function statsEncerramento() {
  const r = MESA().agregarRelatorio ? await MESA().agregarRelatorio() : null;
  if (!r) return { cards: [], dest: [] };
  const ps = Object.entries(r.por);
  const cards = ps.map(([q, p]) => ({ q, linhas: [p.dano ? `−${p.dano} PV` : '', p.cura ? `+${p.cura} PV curados` : '', p.san ? `−${p.san} SAN` : '', p.pe ? `${p.pe} PE gastos` : '', p.rit ? `${p.rit} ritua${p.rit > 1 ? 'is' : 'l'}` : '', p.m20 ? `${p.m20}× 20 natural` : '', p.m1 ? `${p.m1}× 1 natural` : '', p.caiu ? `caiu ${p.caiu}×` : '', p.fim ? p.fim.toUpperCase() : ''].filter(Boolean) })).filter(c => c.linhas.length);
  const top = (campo, t, fmt) => { const m = ps.filter(([, p]) => p[campo] > 0).sort((a, b) => b[1][campo] - a[1][campo])[0]; return m ? { t, q: m[0], v: fmt(m[1][campo]) } : null; };
  const dest = [top('dano', 'MAIS FERIDO', v => `${v} de dano sofrido`), top('san', 'MENTE MAIS ABALADA', v => `${v} de Sanidade perdida`), top('m20', 'MAIS SORTUDO', v => `${v}× 20 natural`), top('m1', 'MAIS AZARADO', v => `${v}× 1 natural`), top('rit', 'MAIS RITUAIS', v => `${v} ritua${v > 1 ? 'is' : 'l'} conjurados`), top('cura', 'MAIS CURADO', v => `${v} PV recuperados`)].filter(Boolean);
  return { cards, dest };
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ses]'); if (!b || !A.mestre) return;
  const a = b.dataset.ses;
  if (a === 'abertura' || a === 'encerramento') abrirForm(a);
  else if (a === 'parar') pararParaTodos();
  else if (a === 'ten') mudarTensao(int(b.dataset.v));
  else if (a === 'hol') { const v = ($('#sesHolAlvo') || {}).value || ''; const txt = ($('#sesHolTxt') || {}).value || ''; holofote(v.startsWith('q:') ? { q: v.slice(2) } : { cn: int(v.slice(3)) }, txt); }
  else if (a === 'dil-ini') {
    const q = ($('#sesDilQ').value || '').trim(), ops = ($('#sesDilOps').value || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 4);
    if (!q || ops.length < 2) { A.aviso('Escreva a pergunta e pelo menos duas opções.'); return; }
    const t = Math.max(10, Math.min(300, int($('#sesDilT').value) || 45));
    A.definir(['dilema'], { id: A.Rede.chave(), q: q.slice(0, 140), ops: ops.map(s => s.slice(0, 60)), sec: $('#sesDilSec').checked, fim: Date.now() + t * 1000, on: true, ts: Date.now() });
  }
  else if (a === 'dil-fim') revelarDilema();
});
// cartão da sala: holofote direto
A.ganchoSala({
  mestre: cn => `<div class="mesa-linha"><button data-hol-cn="${cn}">🔦 Holofote nesta sala</button></div>`,
  ligar(c, cn) { if (!A.mestre) return; $$('[data-hol-cn]', c).forEach(b => b.onclick = () => holofote({ cn }, '')); },
});

/* ---------- Ligações ---------- */
let ag = false;
function tudo() { if (ag) return; ag = true; requestAnimationFrame(() => { ag = false; try { verTelas(); verDilema(); pintarTensao(); verHolofote(); desenharBloco(true); } catch (e) { console.warn('sessao:', e); } }); }
A.aoMudar(tudo);
document.addEventListener('acf-perfil', () => setTimeout(tudo, 60));
setTimeout(tudo, 400);
window.ACF_SESSAO = { mostrarAbertura, mostrarEncerramento, tensao: mudarTensao, holofote, htmlSigilo };
})();
